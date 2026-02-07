/**
 * Mock speaking parts for session. Replace with Supabase fetch by testId when backend is ready.
 */

import { v4 as uuidv4 } from "uuid";

/** @typedef {{ id: string, question: string, durationSec?: number }} SpeakingQuestion */
/** @typedef {{ id: string, title: string, questions: SpeakingQuestion[] }} SpeakingPart */

/** durationSec = time in seconds for this question (countdown + max recording length). */
const makeQuestion = (question, durationSec = 30) => ({
  id: uuidv4(),
  question,
  durationSec,
});

export const MOCK_SPEAKING_PARTS = [
  {
    id: uuidv4(),
    title: "Part 1",
    questions: [
      makeQuestion("What is your favorite hobby?", 30),
      makeQuestion("Do you like traveling? Why or why not?", 45),
      makeQuestion("Describe your hometown.", 18),
      makeQuestion("What kind of music do you enjoy?", 30),
      makeQuestion("How do you usually spend your weekends?", 45),
    ],
  },
  {
    id: uuidv4(),
    title: "Part 2",
    questions: [
      makeQuestion("Describe a place you would like to visit.", 45),
      makeQuestion("What is your favorite season and why?", 30),
    ],
  },
];

/**
 * Get mock parts for a test. In production, fetch from Supabase by testId.
 * @param {string} testId
 * @returns {Promise<SpeakingPart[]>}
 */
export async function getSpeakingPartsForTest(testId) {
  return Promise.resolve(MOCK_SPEAKING_PARTS.map((p) => ({ ...p, questions: [...p.questions] })));
}

/** Flatten parts to a single questions array (for backward compatibility / result page). */
export function flattenPartsToQuestions(parts) {
  if (!Array.isArray(parts)) return [];
  return parts.flatMap((p) => p.questions || []);
}

export default MOCK_SPEAKING_PARTS;
