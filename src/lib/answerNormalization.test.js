import test from "node:test";
import assert from "node:assert/strict";
import { answersMatch, canonicalizeAnswer } from "./answerNormalization.js";

/**
 * Negative tests come first and deliberately outnumber the positive ones.
 * The risk this layer carries is not "fails to accept a variant" — it is
 * "accepts a wrong answer". Every case below is a real distinction IELTS
 * marks, and several are taken verbatim from student answers in prod that
 * were correctly graded wrong.
 */

const mustReject = [
  // --- different dates. This is why the date rule parses instead of comparing loosely.
  ["2 July", "1 July", "a different day"],
  ["april 10", "12 April", "different day, from prod history"],
  ["1 August", "1 July", "different month"],
  ["30 March 1988", "30 March 1989", "different year"],
  ["30 March", "30 March 1988", "less specific must not match more specific"],
  ["1/7", "1 July", "numeric form is ambiguous UK/US and must never parse"],
  ["7/1", "1 July", "same, other convention"],

  // --- singular vs plural is a real IELTS distinction. Both are from prod.
  ["teachers", "teacher", "plural for singular"],
  ["teacher", "teachers", "singular for plural"],
  ["decoration", "decorations", "from prod history"],
  ["defences", "defence", "variant map must not also fold number"],

  // --- typos are not variants. All from prod history.
  ["sandwitches", "sandwiches", "typo"],
  ["advertisiments", "advertisements", "typo"],
  ["inxtructions", "instructions", "typo"],
  ["dieving", "diving", "typo"],
  ["elsanore", "Elsinore", "proper-noun typo"],
  ["jemison", "Jamieson", "proper-noun typo"],

  // --- words the spelling rules would have collided if applied as regexes
  ["for", "four", "or/our rule would have unified these"],
  ["prize", "prise", "ise/ize rule would have unified these"],
  ["dinner", "diner", "doubled-consonant rule would have unified these"],
  ["filing", "filling", "doubled-consonant rule"],
  ["advice", "advise", "ce/se rule — different words"],
  ["practice", "practise", "ce/se rule — differ by part of speech in UK English"],
  ["licence", "license", "explicitly excluded from the variant map"],
  ["desert", "dessert", "not a variant"],
  ["later", "latter", "not a variant"],
  ["quiet", "quite", "not a variant"],

  // --- cardinal and ordinal are different answers
  ["3", "third", "cardinal for ordinal"],
  ["third", "3", "ordinal for cardinal"],
  ["3rd", "3", "ordinal marker is significant"],
  ["twenty one", "twenty two", "different numbers"],

  // --- partial or padded answers. From prod history.
  ["354", "354 Forest", "partial answer"],
  ["STORE", "chain store", "partial answer"],
  ["first pneumatic tyre", "pneumatic tyre", "extra word"],

  // --- prose must never become space-insensitive
  ["chainstore", "chain store", "code rule must not claim prose"],
  ["3courses", "3 courses", "code rule must not claim a digit+word phrase"],

  // --- different codes / numbers
  ["9516743124", "077896245", "different phone numbers"],
  ["SH12 2LQ", "SH12 1LQ", "different postcode"],

  // --- word order carries meaning outside dates. From prod history.
  ["taxes", "government", "swapped answers"],
  ["reliable connection", "immediate surroundings", "swapped answers"],

  // --- blank never counts
  ["", "1 July", "blank answer"],
  ["   ", "teacher", "whitespace-only answer"],
];

for (const [student, key, why] of mustReject) {
  test(`REJECT ${JSON.stringify(student)} for ${JSON.stringify(key)} — ${why}`, () => {
    assert.equal(answersMatch(student, key), false);
  });
}

/** Positive cases: legitimate variants the real exam accepts. */
const mustAccept = [
  // --- dates, all forms in the brief plus the flips measured in prod
  ["1 July", "1 July", "identical"],
  ["1st July", "1 July", "ordinal suffix"],
  ["July 1", "1 July", "month first"],
  ["July 1st", "1 July", "month first with ordinal"],
  ["first July", "1 July", "ordinal word"],
  ["the first of July", "1 July", "article and preposition"],
  ["01 July", "1 July", "zero padded"],
  ["1 Jul", "1 July", "abbreviated month — approved"],
  ["1 Jul.", "1 July", "abbreviated month with period"],
  ["November 1st", "November 1", "measured in prod"],
  ["17th February", "17 February", "measured in prod"],
  ["30th march  1988", "30 March 1988", "measured in prod, double space"],
  ["october 15", "15th October", "measured in prod, order and ordinal"],
  ["11th july", "11 July", "measured in prod"],
  ["15 th October", "15th October", "measured in prod, split ordinal"],
  ["30 March 1988", "30 march 1988", "case only"],

  // --- spelling variants, the approved 17 pairs
  ["color", "colour", "our/or"],
  ["colour", "color", "reverse direction"],
  ["behaviour", "behavior", "our/or"],
  ["harbor", "harbour", "our/or"],
  ["theater", "theatre", "re/er"],
  ["defenses", "defences", "ce/se, specific approved pair"],
  ["civilization", "civilisation", "ise/ize"],
  ["fertilizer", "fertiliser", "ise/ize"],
  ["traveling", "travelling", "doubled consonant, specific approved pair"],
  ["dialog", "dialogue", "ogue/og"],
  ["gray", "grey", "approved pair"],
  ["archeological", "archaeological", "approved pair"],
  ["radio programme", "radio program", "approved pair inside a phrase"],

  // --- numbers
  ["three", "3", "word for digit"],
  ["3", "three", "digit for word"],
  ["three courses", "3 courses", "phrase with a number"],
  ["twenty two", "22", "compound tens"],
  ["1 hour", "one hour", "digit for word in a phrase"],
  ["third", "3rd", "ordinal word for ordinal digit"],

  // --- time
  ["9:30", "9.30", "separator only"],
  ["9.30", "9:30", "reverse direction"],
  ["11:30 pm", "11.30 pm", "separator with meridiem"],
  ["9:15 a.m.", "9.15 am", "meridiem punctuation"],

  // --- codes and phone numbers
  ["SH121LQ", "SH12 1LQ", "postcode spacing"],
  ["07749132760", "07749 132760", "phone spacing"],
  ["0774-913-2760", "07749132760", "phone dashes"],
  ["JYZ37", "jyz37", "case only"],

  // --- whitespace and punctuation hygiene
  ["  teacher  ", "teacher", "outer whitespace"],
  ["chain  store", "chain store", "internal double space"],
  ["11 July", "11 July...", "trailing dots on the stored key"],
];

for (const [student, key, why] of mustAccept) {
  test(`ACCEPT ${JSON.stringify(student)} for ${JSON.stringify(key)} — ${why}`, () => {
    assert.equal(answersMatch(student, key), true);
  });
}

test("a date only canonicalizes when the whole answer is a date", () => {
  assert.equal(canonicalizeAnswer("28th August"), "date:28-8");
  // trailing prose must stop the parse, or '354 Forest' would become a date
  assert.notEqual(canonicalizeAnswer("28th August trip"), "date:28-8");
  assert.equal(canonicalizeAnswer("354 Forest"), "354 forest");
});

test("canonicalization is idempotent", () => {
  for (const s of ["1st July", "three courses", "9:30", "SH12 1LQ", "colour"]) {
    const once = canonicalizeAnswer(s);
    assert.equal(canonicalizeAnswer(once), once, `not idempotent for ${s}`);
  }
});

test("null and undefined are handled without throwing", () => {
  assert.equal(canonicalizeAnswer(null), "");
  assert.equal(canonicalizeAnswer(undefined), "");
  assert.equal(answersMatch(null, null), false);
  assert.equal(answersMatch(undefined, "teacher"), false);
});
