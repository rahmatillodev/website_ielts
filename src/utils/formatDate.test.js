import test from "node:test";
import assert from "node:assert/strict";

import { formatPublishedDate } from "./formatDate.js";

const HOUR = 60 * 60 * 1000;

test("formatPublishedDate: renders a past timestamp in the project's format", () => {
  assert.equal(formatPublishedDate("2026-08-06T09:30:00+00:00"), "Aug 6, 2026");
  assert.equal(formatPublishedDate("2024-01-02T00:00:00Z"), "Jan 2, 2024");
});

test("formatPublishedDate: an offset timestamp lands on the reader's own day", () => {
  // 2026-08-06T23:40+05:00 is 18:40 UTC — the same instant either way, and the
  // label must follow the reader's clock rather than the stored offset.
  const withOffset = formatPublishedDate("2026-08-06T23:40:00+05:00");
  const sameInstantUtc = formatPublishedDate("2026-08-06T18:40:00Z");
  assert.equal(withOffset, sameInstantUtc);
});

test("formatPublishedDate: empty for missing or unparseable values", () => {
  for (const value of [null, undefined, "", "not-a-date", {}]) {
    assert.equal(formatPublishedDate(value), "", `expected "" for ${String(value)}`);
  }
});

test("formatPublishedDate: empty for future timestamps", () => {
  assert.equal(formatPublishedDate(new Date(Date.now() + HOUR).toISOString()), "");
  assert.equal(formatPublishedDate("2999-01-01T00:00:00Z"), "");
});

test("formatPublishedDate: a moment ago still shows", () => {
  assert.notEqual(formatPublishedDate(new Date(Date.now() - 1000).toISOString()), "");
});
