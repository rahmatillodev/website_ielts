// Detect a broken PDF text layer in a passage, before it is written.
//
// Why this exists: parse.mjs SLICES passages out of the source text and never
// lets the model re-emit them, so `part.content` is byte-identical to the
// material by construction. That guarantees we never invent text - and it
// guarantees that when the source's text layer is damaged, the damage is stored
// faithfully and rendered to students.
//
// It is not hypothetical. Replaying the 56 citations the explanation pipeline
// rejected on prod (2026-08-06) found 30 where the model's quote was right and
// the PASSAGE was the broken side: "highly com p etitive", "the property o f
// preserving", "the research teamat brigham& women's hospital". 28 of the 30
// were in bulk-imported tests. The model read the damage, silently repaired it,
// and was rejected for not being verbatim - so a content defect surfaced as a
// tooling failure.
//
// Every signature below was measured against all 480 live passages before being
// given a severity. See the severity notes on each.

/**
 * Unambiguous damage: these strings cannot occur in correctly extracted prose,
 * and each one changes what the student reads. Measured over all 480 live
 * passages: 84 hits across 21 reading tests, and 0 across the 79 listening
 * transcripts - those are machine-transcribed rather than PDF-extracted, so a
 * clean source really does score zero and strict enforcement costs nothing.
 *
 * Every hit was inspected. The four signatures below are the ones that survived;
 * two others were demoted to warnings after their live hits turned out to be
 * half false positives (see WARNINGS).
 */
const ERRORS = [
  {
    id: 'split-word',
    // A lone lowercase letter marooned between two word fragments. "a" is a real
    // word and is excluded; paragraph markers are uppercase and line-initial.
    re: /[a-z]{2,}[ \t]+[b-z][ \t]+[a-z]{2,}/g,
    say: 'a word is split by a space ("the property o f preserving")',
  },
  {
    id: 'broken-hyphen',
    re: /[a-z]{3,}-[ \t]+[a-z]{3,}/gi,
    say: 'a hyphenated word is broken after the hyphen ("red- cockaded")',
  },
  {
    id: 'glued-comma',
    re: /[a-z]{3,},[a-z]{3,}/gi,
    say: 'a comma has no space after it ("pitt,emeritus")',
  },
  {
    id: 'glued-ampersand',
    re: /[a-z]{3,}&[ \t]*[a-z]{3,}/gi,
    say: 'an ampersand has lost its spacing ("brigham& women")',
  },
];

/**
 * Real damage, but either cosmetic or with known false positives. Reported so a
 * human looks, never blocking.
 */
const WARNINGS = [
  {
    id: 'stray-asterisk',
    // Only 2 hits in 480 live passages, and they are structurally identical
    // while meaning opposite things: "an adobe * conservation project" is a
    // footnote marker stranded by the extractor, but "followed by * A Bug's
    // Life*" is emphasis markup with a stray space. Separating them needs
    // asterisk-pairing analysis that is not worth its complexity at this volume.
    re: /[a-z,][ \t]\*[ \t][a-z]/gi,
    say: 'a footnote marker may be floating in the text',
  },
  {
    id: 'orphan-quote',
    // A quote mark isolated by spaces: `...as he called himself, ” breathed`.
    // 14 of 14 sampled live hits were genuine, but it never changes meaning.
    re: /[ \t]['"‘’“”][ \t]/g,
    say: 'a quotation mark is detached from its word',
  },
  {
    id: 'mid-word-caps',
    // Catches "TheOhio State University" and "ofCambridge" - but also PowerPoint,
    // MasterCard and MacNaughton. Roughly half the live hits are legitimate, so
    // this can only ever be a warning.
    re: /[a-z]{2,}[A-Z][a-z]{2,}/g,
    say: 'a capital appears inside a word (may be a legitimate brand name)',
  },
];

// NOT IMPLEMENTED, deliberately: the DELETED-space class.
//
// "the research teamat", "theycan set their sights", "it means badnews" leave no
// signature a regex can find, and both dictionary approaches tried were worse
// than nothing:
//
//   /usr/share/dict/words (web2) lacks common inflected forms, so it reported
//   "countries", "copies" and "colour" as damage - 4,123 hits, almost all false.
//
//   A closed list of function words plus a two-way split test reported 3,512
//   tokens across 175 of 176 tests, because "there" splits as "the|re" and
//   "their" as "the|ir". Precision was near zero.
//
// Detecting this class needs a real spell-checker with morphology, or a second
// extraction of the same PDF to diff against. Until then it is an accepted gap,
// and it is why the ERRORS above are worth enforcing strictly: they are the part
// of the same underlying defect that CAN be caught for free.

/** Context around a hit, so the report tells the operator where to look. */
function context(text, index, len) {
  return text.slice(Math.max(0, index - 38), index + len + 38).replace(/\s+/g, ' ').trim();
}

function scan(text, sigs, where) {
  const out = [];
  for (const sig of sigs) {
    sig.re.lastIndex = 0;
    const hits = [...text.matchAll(sig.re)];
    if (!hits.length) continue;
    out.push({
      where,
      id: sig.id,
      count: hits.length,
      msg:
        `${hits.length} place(s) where ${sig.say}. The source's text layer is damaged - fix the ` +
        `extraction rather than storing it, because the passage is shown to students verbatim. ` +
        `First: "${context(text, hits[0].index, hits[0][0].length)}"`,
      samples: [...new Set(hits.map((h) => h[0].replace(/\s+/g, ' ')))].slice(0, 8),
    });
  }
  return out;
}

/**
 * @param {string} text    the passage as it would be stored
 * @param {string} where   label for the report, e.g. "part 2"
 * @returns {{errors: Array, warnings: Array}}
 */
export function checkTextIntegrity(text, where = 'passage') {
  if (!text) return { errors: [], warnings: [] };
  return { errors: scan(text, ERRORS, where), warnings: scan(text, WARNINGS, where) };
}
