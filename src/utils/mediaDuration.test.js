import test from "node:test";
import assert from "node:assert/strict";

import {
  DURATION_UNKNOWN,
  formatDuration,
  isDirectMediaUrl,
  isProbableMediaUrl,
  parseIsoDuration,
  storedDurationSeconds,
  youtubeVideoId,
} from "./mediaDuration.js";

test("formatDuration: the badge is whole minutes, never seconds", () => {
  // The three worked examples the badge was specified against.
  assert.equal(formatDuration(5 * 60 + 40), "6 min"); // 5m40s
  assert.equal(formatDuration(42 * 60 + 17), "42 min"); // 42m17s
  assert.equal(formatDuration(3600 + 21 * 60), "81 min"); // 1h21m

  // No clock punctuation and no seconds anywhere in the output.
  for (const seconds of [9, 515, 2538, 3599, 4360, 36000]) {
    assert.match(formatDuration(seconds), /^\d+ min$/, `unexpected shape for ${seconds}s`);
  }
});

test("formatDuration: rounds to the nearest minute rather than truncating", () => {
  assert.equal(formatDuration(29), "1 min"); // floor of a real video would be "0 min"
  assert.equal(formatDuration(30), "1 min");
  assert.equal(formatDuration(89), "1 min");
  assert.equal(formatDuration(90), "2 min");
  assert.equal(formatDuration(119.6), "2 min");
  assert.equal(formatDuration(2400), "40 min");
});

test("formatDuration: hours fold into the minute total", () => {
  assert.equal(formatDuration(3600), "60 min");
  assert.equal(formatDuration(4360), "73 min"); // 1h12m40s
  assert.equal(formatDuration(7200), "120 min");
  assert.equal(formatDuration(36000), "600 min");
});

test("formatDuration: unknown values fall back rather than inventing a number", () => {
  for (const value of [null, undefined, "", 0, -5, NaN, Infinity, "abc"]) {
    assert.equal(formatDuration(value), DURATION_UNKNOWN, `expected fallback for ${String(value)}`);
  }
  // The badge must never be blank, and it reads in the same unit as a real one.
  assert.equal(DURATION_UNKNOWN, "-- min");
});

test("storedDurationSeconds: accepts a real stored length, rejects the rest", () => {
  assert.equal(storedDurationSeconds(515), 515);
  assert.equal(storedDurationSeconds("515"), 515); // PostgREST can hand back a string
  assert.equal(storedDurationSeconds(0.5), 0.5);

  for (const value of [null, undefined, "", 0, -1, NaN, "abc", {}]) {
    assert.equal(storedDurationSeconds(value), null, `expected null for ${String(value)}`);
  }
});

test("youtubeVideoId: recognises the link shapes the player accepts", () => {
  assert.equal(youtubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(youtubeVideoId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(youtubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(youtubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(youtubeVideoId("dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(youtubeVideoId("https://cdn.example.com/lesson.mp4"), "");
  assert.equal(youtubeVideoId(""), "");
  assert.equal(youtubeVideoId(null), "");
});

test("isDirectMediaUrl: only files a media element can read", () => {
  assert.equal(isDirectMediaUrl("https://project.supabase.co/storage/v1/a.mp4"), true);
  assert.equal(isDirectMediaUrl("https://cdn.example.com/talk.m4a?token=abc"), true);
  assert.equal(isDirectMediaUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), false);
  assert.equal(isDirectMediaUrl("https://example.com/page"), false);
  assert.equal(isDirectMediaUrl(""), false);
});

test("isProbableMediaUrl: worth a probe even without a file extension", () => {
  // The confident cases stay in.
  assert.equal(isProbableMediaUrl("https://project.supabase.co/storage/v1/a.mp4"), true);

  // A storage object saved without a suffix, or a signed link that keeps the
  // name in the query string. These used to be written off and captioned
  // "-- min" forever.
  assert.equal(isProbableMediaUrl("https://project.supabase.co/storage/v1/object/public/vid/abc"), true);
  assert.equal(isProbableMediaUrl("https://cdn.example.com/stream?file=lesson&token=x"), true);

  // YouTube is measured by the player, not a media element, so it is not
  // "direct" — routing it here would waste a failed fetch per card.
  assert.equal(isProbableMediaUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), false);
  assert.equal(isProbableMediaUrl("dQw4w9WgXcQ"), false);

  // Not a link at all: nothing to fetch.
  assert.equal(isProbableMediaUrl("not a url"), false);
  assert.equal(isProbableMediaUrl(""), false);
  assert.equal(isProbableMediaUrl(null), false);
});

test("parseIsoDuration: YouTube contentDetails values", () => {
  assert.equal(parseIsoDuration("PT40M"), 2400);
  assert.equal(parseIsoDuration("PT1H21M"), 4860);
  assert.equal(parseIsoDuration("PT1H21M30S"), 4890);
  assert.equal(parseIsoDuration("PT45S"), 45);
  assert.equal(parseIsoDuration("P0D"), null);
  assert.equal(parseIsoDuration("nonsense"), null);
  assert.equal(parseIsoDuration(null), null);
});
