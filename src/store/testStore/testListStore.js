/**
 * Test list store - handles fetching and managing test lists
 */

import { create } from "zustand";
import supabase from "@/lib/supabase";
import { requestTimeoutSignal, isAbortLikeError } from "@/lib/requestTimeout";
import { useQuestionTypeStore } from "./questionTypeStore";

const REQUEST_TIMEOUT_MS = 20000;
const MIN_PART_NUMBER = 1;
const MAX_PART_NUMBER = 5;

/**
 * The single in-flight fetch, shared by every caller.
 *
 * Reading and Listening both mount LibraryPage, and App fires its own fetch
 * once the session initialises, so three callers routinely ask for this list at
 * the same moment. Without this they each issued the same query and each
 * re-rendered the list when it landed.
 */
let inflightFetch = null;

/** Max parts that count as "full" per test type: reading = 3, listening = 4. */
const FULL_PART_COUNT_BY_TYPE = {
  reading: 3,
  listening: 4,
  speaking: 4,
};

/**
 * Sorted unique part numbers from a test's part relation (Supabase: part(part_number)).
 * @param {Array|object|null} rawPart - part relation (array or single object)
 * @returns {number[]}
 */
export function getPartNumbersFromPartRelation(rawPart) {
  const parts = Array.isArray(rawPart) ? rawPart : rawPart != null ? [rawPart] : [];
  const partNumbers = parts
    .map((p) => p?.part_number)
    .filter((n) => typeof n === "number" && n >= MIN_PART_NUMBER && n <= MAX_PART_NUMBER)
    .sort((a, b) => a - b);
  return [...new Set(partNumbers)];
}

/**
 * Derives a display label from a test's part relation (from Supabase select "*, part(part_number)").
 * Full is type-dependent: reading = 3 parts, listening = 4 parts.
 * Multi-part (non-full) tests use a middle dot between labels — not "Parts 1, 2".
 * @param {Array|object|null} rawPart - part relation (array or single object)
 * @param {string} [testType] - "reading" | "listening" | "speaking"
 * @returns {string|null} "Part 1", "Part 1 · Part 2", "Full reading", "Full listening", etc., or null
 */
export function getPartLabelFromPartRelation(rawPart, testType = "reading") {
  const partNumbers = getPartNumbersFromPartRelation(rawPart);
  const count = partNumbers.length;
  if (count === 0) return null;
  if (count === 1) return `Part ${partNumbers[0]}`;
  const maxForFull = FULL_PART_COUNT_BY_TYPE[testType] ?? 4;
  if (count === maxForFull) {
    const fullLabels = { reading: "Full reading", listening: "Full listening", speaking: "Full speaking" };
    return fullLabels[testType] ?? "Full Test";
  }
  return partNumbers.map((n) => `Part ${n}`).join(" · ");
}

export const useTestListStore = create((set, get) => ({
  test_reading: [],
  test_listening: [],
  test_speaking: [],
  loading: false,
  error: null,
  loaded: false,

  fetchTests: async (forceRefresh = false) => {
    const currentState = get();
    const snapshot = (state) => ({
      test_reading: state.test_reading || [],
      test_listening: state.test_listening || [],
      test_speaking: state.test_speaking || [],
      loaded: state.loaded,
    });

    // Allow refetch if data is empty even if loaded is true
    const hasData = (currentState.test_reading?.length > 0 || currentState.test_listening?.length > 0 || currentState.test_speaking?.length > 0);

    // Return early only if already loaded with data AND not forcing refresh
    if (currentState.loaded && hasData && !forceRefresh) {
      return snapshot(currentState);
    }

    // Join the request already on the wire rather than issuing a second one.
    if (inflightFetch) {
      return inflightFetch;
    }

    inflightFetch = (async () => {
      set({ loading: true, error: null });

      try {
        const { data, error } = await supabase
          .from("test")
          .select("id, title, type, difficulty, duration, is_active, is_mock, created_at, question_quantity, is_premium, part(part_number)")
          .eq("is_active", true)
          .or("is_mock.eq.false,is_mock.is.null")
          .order("created_at", { ascending: false })
          .abortSignal(requestTimeoutSignal(REQUEST_TIMEOUT_MS));

        // Explicit error check immediately after query
        if (error) {
          console.error('[fetchTests] Supabase Error (test table):', {
            table: 'test',
            filter: 'is_active = true',
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });

          // Check for RLS policy denial
          if (error.code === 'PGRST116' || error.message?.includes('permission') || error.message?.includes('policy')) {
            throw new Error(`RLS Policy Denial: Check Row Level Security policies for 'test' table. Error: ${error.message}`);
          }

          throw error;
        }

        // Ensure data is an array before filtering
        const rawTests = Array.isArray(data) ? data : [];

        // Handle case where query returns null/undefined (no data found)
        if (rawTests.length === 0) {
          console.warn('[fetchTests] No active tests found. This may be normal if no tests are marked as active, or check RLS policies.');
        }

        const tests = rawTests.map((test) => {
          const partNumbers = getPartNumbersFromPartRelation(test.part);
          const partLabel = getPartLabelFromPartRelation(test.part, test.type);
          const { part: _part, ...rest } = test;
          return { ...rest, partLabel, partNumbers, question_types: new Set() };
        });

        const byType = (type) => tests.filter((test) => test.type === type);

        // Publish the list before the question types are in. They only feed the
        // (initially empty) question-type filter, which short-circuits while
        // nothing is selected, so nothing on screen depends on them - and this
        // keeps a slow second query from holding the whole list back.
        //
        // Empty arrays are a valid state (e.g. no listening tests exist), so
        // `loaded` is set either way to prevent an infinite loading state.
        set({
          test_reading: byType("reading"),
          test_listening: byType("listening"),
          test_speaking: byType("speaking"),
          loaded: true,
          loading: false,
          error: null,
        });

        // Enrichment is best-effort: fetchQuestionTypesForTests resolves with
        // whatever it has rather than rejecting, and a failure here must never
        // take the list down with it.
        const questionTypesMap = await useQuestionTypeStore
          .getState()
          .fetchQuestionTypesForTests(tests.map((test) => test.id));

        const withTypes = (list) => list.map((test) => ({
          ...test,
          question_types: questionTypesMap[test.id] || test.question_types,
        }));

        const enriched = {
          test_reading: withTypes(get().test_reading),
          test_listening: withTypes(get().test_listening),
          test_speaking: withTypes(get().test_speaking),
        };
        set(enriched);

        return enriched;
      } catch (error) {
        const timedOut = isAbortLikeError(error);

        if (timedOut) {
          console.error('[fetchTests] Request timed out or was cancelled:', {
            error: error.message,
            timeoutMs: REQUEST_TIMEOUT_MS,
            suggestion: 'The request was aborted client-side. Check the network, and check that nothing is awaiting a Supabase call inside supabase.auth.onAuthStateChange (that deadlocks the auth lock and stalls every query).'
          });
        } else {
          console.error('[fetchTests] Error fetching tests:', {
            errorName: error.name,
            errorMessage: error.message,
            errorCode: error.code,
            suggestion: 'Check RLS policies for "test" table and ensure Supabase connection is active'
          });
        }

        // Fail soft. Whatever list we already had stays on screen, `loaded`
        // stays true so the UI does not fall back to a permanent spinner, and
        // the error is exposed for anything that wants to surface it. Nothing
        // is thrown: no caller catches, and an unhandled rejection here is what
        // used to make a timeout look like a crash.
        const latest = get();
        const stillHasData = (latest.test_reading?.length > 0 || latest.test_listening?.length > 0 || latest.test_speaking?.length > 0);

        set({
          error: error.message || 'Failed to fetch tests. Please check your connection and try again.',
          loading: false,
          loaded: stillHasData ? latest.loaded : false,
        });

        return snapshot(latest);
      } finally {
        // Belt and braces: no path may leave the UI spinning.
        if (get().loading) set({ loading: false });
      }
    })();

    try {
      return await inflightFetch;
    } finally {
      inflightFetch = null;
    }
  },
}));

