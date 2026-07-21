// Gemini transcription call + rate-limit pacing.

import { requireEnv, sleep } from './lib.mjs';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Prompt for a single clip. Long audio sent whole comes back with silently
 * dropped stretches, so the pipeline always sends short clips and stitches.
 */
export const buildPrompt = ({ clipLabel, isWholeFile }) => `You are transcribing ${
  isWholeFile ? 'the audio of an IELTS Listening test' : `ONE CLIP taken from a longer IELTS Listening test recording. This clip is ${clipLabel} long`
}. Produce a complete, verbatim transcript.
${
  isWholeFile
    ? ''
    : `
TIMESTAMPS ARE CLIP-RELATIVE: the clip begins at [00:00] regardless of where it sits in the
full recording. Never offset your timestamps to the position of the clip in the original file.

COMPLETENESS IS CRITICAL: transcribe every spoken word from the first second to the last second
of this clip. Do not stop early. Your final timestamp must be close to ${clipLabel}. Do not
abbreviate, compress, or skip any passage, however repetitive or long.
`
}
Requirements:

1. PART BOUNDARIES. The recording contains four parts, each announced aloud by the narrator. The
   announcement may say either "Part" or "Section" ("Part 1", "Now turn to Section 2", etc.) - treat
   Section N and Part N as the same thing. Immediately before the first spoken word of each part, emit
   one of these markers:
   ### PART 1
   ### PART 2
   ### PART 3
   ### PART 4
   CRITICAL: the marker must sit ALONE on its own line, with nothing else on that line - no timestamp,
   no speaker label, no punctuation before or after it. Put the timestamp on the following line instead.
   Place the marker before the narrator's announcement itself.
   ONLY emit a marker when you actually HEAR the narrator announce the start of that part in this
   audio ("Section 3", "Now turn to Part 2"). If no such announcement occurs here, emit NO marker at
   all. Never infer or guess a boundary from context.

2. TIMESTAMPS. Begin each speaker turn with an [mm:ss] timestamp. Inside long monologues, insert an
   additional [mm:ss] at least every 30 seconds. Timestamps must be absolute from the start of the file.

3. SPEAKERS. Label every turn, e.g. NARRATOR:, MAN:, WOMAN:, TUTOR:, STUDENT:. Use the speaker's real
   name when the audio states it (e.g. SARAH:). Keep labels consistent throughout.

4. VERBATIM. Transcribe everything spoken, including the narrator's instructions and question-numbering
   announcements ("You will have 30 seconds to check your answers", "Now listen and answer questions 11
   to 15"). These anchor the part boundaries and must not be dropped. Include the example/practice
   section if present.

5. NO EDITORIALISING. Do not summarise, paraphrase, translate, skip, or add commentary of your own.
   Reproduce hesitations and false starts where audible. If a passage is genuinely unintelligible, write
   [inaudible]. For silent gaps, write [pause].

Output the transcript and nothing else - no preamble, no closing remark, no markdown code fences.`;

/**
 * Paces requests against a tokens-per-minute ceiling by tracking a rolling
 * 60-second window, so we throttle proactively instead of eating 429s.
 */
export class TokenBucket {
  constructor(tpmLimit, rpmLimit) {
    this.tpmLimit = tpmLimit;
    this.rpmLimit = rpmLimit;
    this.events = []; // { at, tokens }
  }

  #prune() {
    const cutoff = Date.now() - 60_000;
    this.events = this.events.filter((e) => e.at > cutoff);
  }

  /** Block until `tokens` more can be spent without breaching TPM or RPM. */
  async reserve(tokens, log = () => {}) {
    for (;;) {
      this.#prune();
      const used = this.events.reduce((n, e) => n + e.tokens, 0);
      const overTokens = used + tokens > this.tpmLimit;
      const overReqs = this.events.length + 1 > this.rpmLimit;
      if (!overTokens && !overReqs) return;

      const oldest = this.events[0]?.at ?? Date.now();
      const waitMs = Math.max(1000, oldest + 60_000 - Date.now() + 500);
      log(
        `   pacing: ${Math.round(used / 1000)}k tok + ${Math.round(tokens / 1000)}k in flight ` +
          `vs ${Math.round(this.tpmLimit / 1000)}k TPM - waiting ${Math.ceil(waitMs / 1000)}s`
      );
      await sleep(waitMs);
    }
  }

  record(tokens) {
    this.events.push({ at: Date.now(), tokens });
  }
}

export class RateLimitError extends Error {
  constructor(message, retryAfterSec) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterSec = retryAfterSec;
  }
}

/**
 * Send inline base64 audio, retrying transient server errors with backoff.
 * 429 is deliberately NOT retried here - the caller stops the run cleanly
 * rather than burning the day's quota against a wall.
 */
export async function transcribeAudio(opts) {
  const maxAttempts = 4;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await callGemini(opts);
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      const transient = /HTTP 5\d\d|UNAVAILABLE|fetch failed|ETIMEDOUT|ECONNRESET|socket hang up/i.test(
        String(err.message)
      );
      if (!transient || attempt === maxAttempts) throw err;
      lastErr = err;
      const backoff = 5000 * 2 ** (attempt - 1); // 5s, 10s, 20s
      opts.onRetry?.(`   transient ${String(err.message).slice(0, 60)}… retry ${attempt}/${maxAttempts - 1} in ${backoff / 1000}s`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

async function callGemini({ model, base64, mimeType, prompt, signal }) {
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 65536,
      // Transcription is not a reasoning task - spend the budget on output.
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': requireEnv('GEMINI_API_KEY') },
    body: JSON.stringify(body),
    signal,
  });

  if (res.status === 429) {
    const txt = await res.text();
    const m = txt.match(/"retryDelay"\s*:\s*"(\d+)s"/);
    throw new RateLimitError(`429 rate limited: ${txt.slice(0, 300)}`, m ? Number(m[1]) : null);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }

  const json = await res.json();
  const cand = json.candidates?.[0];
  const text = (cand?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
  const usage = json.usageMetadata ?? {};

  if (!text) {
    throw new Error(
      `empty transcript (finishReason=${cand?.finishReason}, block=${json.promptFeedback?.blockReason})`
    );
  }

  return {
    text,
    finishReason: cand?.finishReason,
    tokensIn: usage.promptTokenCount ?? 0,
    tokensOut: usage.candidatesTokenCount ?? 0,
  };
}
