/**
 * Mock shadowing parts: each part has steps with youtube_url, phrase, durationSec.
 */

import { v4 as uuidv4 } from "uuid";

/** @typedef {{ id: string, youtube_url: string, phrase: string, durationSec?: number }} ShadowingStep */
/** @typedef {{ id: string, title: string, steps: ShadowingStep[] }} ShadowingPart */

const makeStep = (youtube_url, phrase, durationSec = 45) => ({
  id: uuidv4(),
  youtube_url,
  phrase,
  durationSec,
});

export const MOCK_SHADOWING_PARTS = [
  {
    id: uuidv4(),
    title: "Part 1",
    steps: [
      makeStep("https://www.youtube.com/embed/jNQXAC9IVRw", "Hello, how are you today?", 25),
      makeStep("https://www.youtube.com/embed/dQw4w9WgXcQ", "I would like to introduce myself.", 45),
      makeStep("https://www.youtube.com/embed/9bZkp7q19f0", "The weather is nice this morning.", 25),
    ],
  },
  {
    id: uuidv4(),
    title: "Part 2",
    steps: [
      makeStep("https://www.youtube.com/embed/kJQP7kiw5Fk", "Describe your favorite place.", 45),
      makeStep("https://www.youtube.com/embed/RgKAFK5djSk", "What do you like to do there?", 25),
    ],
  },
];

/**
 * Get mock shadowing parts for a test.
 * @param {string} testId
 * @returns {Promise<ShadowingPart[]>}
 */
export async function getShadowingPartsForTest(_testId) {
  return Promise.resolve(MOCK_SHADOWING_PARTS.map((p) => ({ ...p, steps: [...p.steps] })));
}

export default MOCK_SHADOWING_PARTS;
