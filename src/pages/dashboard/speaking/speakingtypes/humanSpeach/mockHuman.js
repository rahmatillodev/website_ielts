/**
 * Mock human speaking parts. Same shape as textToSpeach/mockSpeakingQuestions.
 * No TTS; questions do not auto-advance (user/admin controls next).
 */

import { v4 as uuidv4 } from "uuid";

/** @typedef {{ id: string, question: string, durationSec?: number }} SpeakingQuestion */
/** @typedef {{ id: string, title: string, questions: SpeakingQuestion[] }} SpeakingPart */

const makeQuestion = (question, durationSec = 45) => ({
  id: uuidv4(),
  question,
  durationSec,
});

export const MOCK_HUMAN_PARTS = [
  {
    id: uuidv4(),
    title: "Part 1",
    questions: [
      makeQuestion("What is your favorite hobby?", 45),
      makeQuestion("Do you like traveling? Why or why not?", 60),
      makeQuestion("Describe your hometown.", 45),
      makeQuestion("What kind of music do you enjoy?", 45),
      makeQuestion("How do you usually spend your weekends?", 60),
    ],
  },
  {
    id: uuidv4(),
    title: "Part 2",
    questions: [
      makeQuestion("Describe a place you would like to visit.", 60),
      makeQuestion("What is your favorite season and why?", 45),
    ],
  },
];

/**
 * Get mock parts for human speaking test. In production, fetch from API by testId.
 * @param {string} testId
 * @returns {Promise<SpeakingPart[]>}
 */
export async function getHumanPartsForTest(testId) {
  return Promise.resolve(MOCK_HUMAN_PARTS.map((p) => ({ ...p, questions: [...p.questions] })));
}

export default MOCK_HUMAN_PARTS;
