// Shared helpers for the content-ingestion pipeline.
//
// Secrets: this module reads GEMINI_API_KEY / Supabase creds from the process
// environment only. Run scripts with `node --env-file=.env.ingest ...`.
// Never hardcode a key here and never print one.
//
// `.env.ingest` selects WHICH project is written to. There is no --prod flag by
// design, matching scripts/explain and scripts/transcribe: pointing at prod is an
// explicit act of editing that file. Verify SUPABASE_URL before every run - dev is
// miyoovimtupziuehtcxi, prod is oqzluzzctiirxxhxsboc.

import { createClient } from '@supabase/supabase-js';

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Run with: node --env-file=.env.ingest scripts/ingest/ingest.mjs <folder>`
    );
  }
  return value;
}

export function supabase() {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}

/** Which Supabase project the current env points at - printed before any write. */
export function projectRef() {
  const m = requireEnv('SUPABASE_URL').match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  const ref = m?.[1] ?? 'unknown';
  const KNOWN = { miyoovimtupziuehtcxi: 'DEV', oqzluzzctiirxxhxsboc: 'PROD' };
  return { ref, label: KNOWN[ref] ?? 'UNKNOWN' };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const slugify = (s) =>
  (s || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/**
 * Comparison form for the verbatim gate.
 *
 * Identical to scripts/explain/locate.mjs norm(): NFKD (which folds curly quotes
 * to straight), dashes unified, whitespace collapsed, lowercased. Two strings
 * that agree here differ only in punctuation style or spacing - never in words.
 */
const DASHES = [['—', '-'], ['–', '-'], ['‒', '-'], ['−', '-']];
export function norm(s) {
  let out = (s ?? '').normalize('NFKD');
  for (const [a, b] of DASHES) out = out.split(a).join(b);
  return out.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * The SOURCE's own characters for a candidate string, or null if the source does
 * not contain it.
 *
 * This is the verbatim gate. The model may restructure the material but may not
 * invent it: every passage, stem and option it emits has to be recoverable here,
 * and what gets stored is the source's rendering rather than the model's. Same
 * technique as scripts/explain/generate.mjs exactFromPassage(), for the same
 * reason - a string that is only "nearly" the source is not evidence of anything.
 */
export function exactFromSource(candidate, source) {
  const c = (candidate ?? '').trim();
  if (!c) return null;
  if (source.includes(c)) return c;

  const loose = c
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/["“”'‘’]/g, '["“”\'‘’]')
    .replace(/\s+/g, '\\s+');
  const m = source.match(new RegExp(loose, 'i'));
  return m ? m[0] : null;
}

/** Does the source contain this text at all, ignoring punctuation style? */
export function inSource(candidate, sourceNorm) {
  const n = norm(candidate);
  return n.length > 0 && sourceNorm.includes(n);
}

/** Strip HTML to text. Mirrors scripts/explain/lib.mjs htmlToText(). */
export function htmlToText(html) {
  if (!html) return '';
  return html
    .replace(/<\s*(br|\/p|\/div|\/tr|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<\s*(td|th)\s*[^>]*>/gi, ' | ')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Paragraph letter markers present in a passage, e.g. Set{'A','B','C'}. */
export function paragraphLetters(content) {
  const found = new Set();
  for (const line of (content ?? '').split('\n')) {
    const t = line.trim();
    // "A" alone on a line, "A." / "A)" starting a line, or "A Word..." - the three
    // styles observed across prod passages.
    const m = t.match(/^([A-Z])(?:[.)]|\s+(?=[A-Z(]|[a-z]{2,})|$)/);
    if (m) found.add(m[1]);
  }
  return found;
}
