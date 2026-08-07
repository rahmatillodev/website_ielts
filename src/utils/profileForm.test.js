import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_TARGET_BAND,
  buildProfileUpdate,
  formatUzPhone,
  isProfileUnchanged,
  isSavableTargetBand,
  isSavableUzPhone,
} from "./profileForm.js";

test("formatUzPhone: forces the number into +998XXXXXXXXX as it is typed", () => {
  assert.equal(formatUzPhone("901234567"), "+998901234567");
  assert.equal(formatUzPhone("998901234567"), "+998901234567");
  assert.equal(formatUzPhone("+998901234567"), "+998901234567");
  // Punctuation a user may paste in is dropped rather than rejected.
  assert.equal(formatUzPhone("+998 90 123 45 67"), "+998901234567");
  assert.equal(formatUzPhone("(90) 123-45-67"), "+998901234567");
  // Cannot grow past a valid number.
  assert.equal(formatUzPhone("9012345678901234"), "+998901234567");
  assert.equal(formatUzPhone(""), "+998");
});

test("isSavableUzPhone: complete or empty, never half-typed", () => {
  assert.equal(isSavableUzPhone("+998901234567"), true);
  assert.equal(isSavableUzPhone(""), true);
  // The bare country code the field inserts on its own counts as empty.
  assert.equal(isSavableUzPhone("+998"), true);
  assert.equal(isSavableUzPhone("+99890"), false);
  assert.equal(isSavableUzPhone("+99890123"), false);
});

test("isSavableTargetBand: the IELTS range, or blank", () => {
  for (const value of ["", null, undefined, 0, 4.5, 7.5, 9]) {
    assert.equal(isSavableTargetBand(value), true, `expected ${String(value)} to be savable`);
  }
  for (const value of [-1, 9.5, 12, "abc"]) {
    assert.equal(isSavableTargetBand(value), false, `expected ${String(value)} to be rejected`);
  }
});

test("buildProfileUpdate: writes what the edit dialog used to write", () => {
  assert.deepEqual(
    buildProfileUpdate({
      full_name: "  Aziza Karimova  ",
      telegram_username: " @aziza ",
      phone_number: "+998901234567",
      target_band_score: "7",
    }),
    {
      full_name: "Aziza Karimova",
      telegram_username: "@aziza",
      phone_number: "+998901234567",
      target_band_score: 7,
    }
  );
});

test("buildProfileUpdate: blanks become null, not empty strings", () => {
  assert.deepEqual(buildProfileUpdate({}), {
    full_name: null,
    telegram_username: null,
    phone_number: null,
    target_band_score: DEFAULT_TARGET_BAND,
  });

  // A field holding nothing but the auto-inserted country code is not a number.
  assert.equal(buildProfileUpdate({ phone_number: "+998" }).phone_number, null);
  assert.equal(buildProfileUpdate({ full_name: "   " }).full_name, null);
});

test("isProfileUnchanged: the Save button stays quiet until something differs", () => {
  const profile = {
    full_name: "Aziza Karimova",
    telegram_username: "@aziza",
    phone_number: "+998901234567",
    target_band_score: 7,
  };
  const form = {
    full_name: "Aziza Karimova",
    telegram_username: "@aziza",
    phone_number: "+998901234567",
    target_band_score: 7,
  };

  assert.equal(isProfileUnchanged(form, profile), true);
  // Whitespace alone is not a change, because it is trimmed before saving.
  assert.equal(isProfileUnchanged({ ...form, full_name: "Aziza Karimova  " }, profile), true);
  // A number typed as a string still equals the stored number.
  assert.equal(isProfileUnchanged({ ...form, target_band_score: "7" }, profile), true);

  assert.equal(isProfileUnchanged({ ...form, full_name: "Aziza K" }, profile), false);
  assert.equal(isProfileUnchanged({ ...form, target_band_score: 8 }, profile), false);
  assert.equal(isProfileUnchanged({ ...form, phone_number: "" }, profile), false);
});

test("isProfileUnchanged: an empty profile matches an untouched form", () => {
  const empty = { full_name: "", telegram_username: "", phone_number: "", target_band_score: DEFAULT_TARGET_BAND };
  assert.equal(isProfileUnchanged(empty, null), true);
  assert.equal(isProfileUnchanged({ ...empty, full_name: "New" }, null), false);
});
