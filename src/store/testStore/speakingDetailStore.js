/**
 * Speaking test detail store – fetches a single speaking test by ID
 * with nested part → question → questions structure.
 * Uses step-by-step queries to avoid 400 from Supabase embed (relation/column names vary by schema).
 */

import { create } from "zustand";
import supabase from "@/lib/supabase";

/** Embed string for single-query fetch. If your schema uses "parts" not "part", or different column names, the fallback will run. */
const SPEAKING_TEST_SELECT = `
  *,
  part (
    id,
    part_number,
    title,
    question (
      id,
      instruction,
      questions (
        id,
        question_number,
        question_text
      )
    )
  )
`;

/**
 * Fallback: fetch test, then parts, then question groups, then questions; assemble same shape as embed.
 * Table/FK assumptions: part.test_id, question.part_id, questions.question_id (or parent_question_id).
 * If your DB uses different names, adjust PART_TABLE, QUESTION_TABLE, QUESTIONS_TABLE and their FK columns below.
 */
const PART_TABLE = "part";
const QUESTION_TABLE = "question";
const QUESTIONS_TABLE = "questions";
const PART_FK = "test_id";
const QUESTION_FK = "part_id";
const QUESTIONS_FK = "question_id"; // or "parent_question_id"

async function fetchSpeakingTestBySteps(testId) {
  const { data: testRow, error: testError } = await supabase
    .from("test")
    .select("*")
    .eq("id", testId)
    .single();

  if (testError || !testRow) {
    return { data: null, error: testError?.message || "Test not found" };
  }

  const { data: parts, error: partsError } = await supabase
    .from(PART_TABLE)
    .select("*")
    .eq(PART_FK, testId)
    .order("part_number", { ascending: true });

  if (partsError) {
    return { data: null, error: partsError.message };
  }

  if (!Array.isArray(parts) || parts.length === 0) {
    return { data: { ...testRow, part: [] }, error: null };
  }

  const partIds = parts.map((p) => p.id);
  const { data: questionGroups, error: qError } = await supabase
    .from(QUESTION_TABLE)
    .select("*")
    .in(QUESTION_FK, partIds);

  if (qError) {
    return { data: null, error: qError.message };
  }

  const questionIds = (questionGroups || []).map((q) => q.id);
  if (questionIds.length === 0) {
    const partMap = new Map(parts.map((p) => [p.id, { ...p, question: [] }]));
    const part = parts.map((p) => partMap.get(p.id));
    return { data: { ...testRow, part }, error: null };
  }

  const { data: questionsRows, error: questionsError } = await supabase
    .from(QUESTIONS_TABLE)
    .select("*")
    .in(QUESTIONS_FK, questionIds);

  if (questionsError) {
    return { data: null, error: questionsError.message };
  }

  const byParentId = new Map();
  for (const q of questionsRows || []) {
    const pid = q[QUESTIONS_FK] ?? q.parent_question_id;
    if (!pid) continue;
    if (!byParentId.has(pid)) byParentId.set(pid, []);
    byParentId.get(pid).push(q);
  }

  const questionByPartId = new Map();
  for (const q of questionGroups || []) {
    const partId = q[QUESTION_FK] ?? q.part_id;
    if (!questionByPartId.has(partId)) questionByPartId.set(partId, []);
    const sub = (byParentId.get(q.id) || []).map((s) => ({
      id: s.id,
      question_number: s.question_number,
      question_text: s.question_text ?? "",
      explanation: s.explanation ?? null,
    }));
    questionByPartId.get(partId).push({
      id: q.id,
      instruction: q.instruction ?? null,
      questions: sub,
    });
  }

  const part = parts.map((p) => ({
    id: p.id,
    part_number: p.part_number,
    title: p.title,
    question: questionByPartId.get(p.id) || [],
  }));

  return { data: { ...testRow, part }, error: null };
}

export const useSpeakingDetailStore = create((set, get) => ({
  speakingTest: null,
  loading: false,
  error: null,

  /**
   * Fetches a single speaking test by ID.
   * Tries embed first; on 400/406 falls back to step-by-step queries.
   * @param {string} testId – test UUID
   * @returns {{ data: object | null, count: number | null, error: string | null }}
   */
  get: async (testId) => {
    set({ loading: true, error: null });

    try {
      if (!testId) {
        throw new Error("Test ID is required");
      }
      if (!supabase?.from) {
        throw new Error("Supabase client is not initialized");
      }

      const { data: embedData, error: embedError } = await supabase
        .from("test")
        .select(SPEAKING_TEST_SELECT)
        .eq("id", testId)
        .single();

      const useFallback = !!embedError;

      if (!useFallback) {
        if (embedError) {
          set({ error: embedError.message, loading: false, speakingTest: null });
          return { data: null, count: null, error: embedError.message };
        }
        set({ speakingTest: embedData, loading: false, error: null });
        return { data: embedData, count: null, error: null };
      }

      const { data: stepData, error: stepError } = await fetchSpeakingTestBySteps(testId);
      if (stepError) {
        set({ error: stepError, loading: false, speakingTest: null });
        return { data: null, count: null, error: stepError };
      }
      set({ speakingTest: stepData, loading: false, error: null });
      return { data: stepData, count: null, error: null };
    } catch (err) {
      const message = err?.message || "Failed to fetch speaking test";
      set({ error: message, loading: false, speakingTest: null });
      return { data: null, count: null, error: message };
    }
  },

  clearSpeakingTest: () =>
    set({ speakingTest: null, loading: false, error: null }),
}));
