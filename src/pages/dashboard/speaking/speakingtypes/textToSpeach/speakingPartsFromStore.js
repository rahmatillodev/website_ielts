/**
 * Fetches speaking test from speakingDetailStore and maps it to session parts.
 * - Timer: Part 1 = 30 sec per question, Part 2 = 60 sec (fixed).
 * - instruction from DB is shown under the question (nullable).
 * - Data from this store is always for textToSpeach (no testType).
 */

import { useSpeakingDetailStore } from "@/store/testStore/speakingDetailStore";

/**
 * Maps test from Supabase (part → question → questions) to session parts.
 * @param {object} test - Raw test from speakingDetailStore.get()
 * @returns {Array<{ id: string, title: string, questions: Array<{ id: string, question: string, instruction: string | null, durationSec: number }> }>}
 */
export function mapSpeakingTestToParts(test) {
  if (!test || !Array.isArray(test.part)) return [];
  const parts = [...test.part].sort((a, b) => (a.part_number ?? 0) - (b.part_number ?? 0));

  return parts.map((p) => {
    const durationSec = p.part_number === 1 ? 30 : 60;
    const questions = [];
    const parentQuestions = Array.isArray(p.question) ? p.question : [];
    for (const parentQ of parentQuestions) {
      const instruction = parentQ.instruction ?? null;
      const subQuestions = Array.isArray(parentQ.questions) ? parentQ.questions : [];
      for (const sub of subQuestions) {
        questions.push({
          id: sub.id,
          question: sub.question_text ?? "",
          instruction,
          durationSec,
        });
      }
    }
    return {
      id: p.id,
      title: p.title ?? `Part ${p.part_number ?? ""}`.trim(),
      questions,
    };
  });
}

/**
 * Fetches speaking test by id from store and returns parts for session.
 * @param {string} testId
 * @returns {Promise<Array>} parts in session format
 */
export async function getSpeakingPartsFromStore(testId) {
  const { data, error } = await useSpeakingDetailStore.getState().get(testId);
  if (error || !data) return [];
  return mapSpeakingTestToParts(data);
}
