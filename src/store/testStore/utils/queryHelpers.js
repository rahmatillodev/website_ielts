/**
 * Database query utilities for test data fetching
 * Handles Supabase queries with timeout and error handling
 */

import supabase from "@/lib/supabase";

// Default timeout: 15 seconds (reduced from 30s for faster feedback)
const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Create a timeout promise
 */
const createTimeoutPromise = (timeoutMs = DEFAULT_TIMEOUT_MS) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
  });
};

/**
 * Execute a query with timeout and error handling
 */
const executeQueryWithTimeout = async (queryPromise, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  // Verify queryPromise is actually a promise
  if (!queryPromise || typeof queryPromise.then !== 'function') {
    console.error('[executeQueryWithTimeout] Invalid queryPromise:', queryPromise);
    throw new Error('Invalid query promise. Query was not properly initialized.');
  }
  
  // Verify Supabase client is initialized
  if (!supabase) {
    console.error('[executeQueryWithTimeout] Supabase client is not initialized');
    throw new Error('Supabase client is not initialized. Check environment variables.');
  }
  
  console.log('[executeQueryWithTimeout] Starting query with timeout:', timeoutMs, 'ms');
  
  try {
    const result = await Promise.race([queryPromise, createTimeoutPromise(timeoutMs)]);
    console.log('[executeQueryWithTimeout] Query completed successfully');
    return result;
  } catch (error) {
    // Check if this is a timeout error
    if (error.message?.includes('timeout')) {
      console.error('[executeQueryWithTimeout] Request timeout after', timeoutMs, 'ms');
      // Check if queryPromise was actually executed
      console.error('[executeQueryWithTimeout] This may indicate the query never started. Check Supabase client initialization and query parameters.');
    }
    throw error;
  }
};

/**
 * Check if error is RLS policy denial
 */
const isRLSError = (error) => {
  return error?.code === 'PGRST116' || 
         error?.message?.includes('permission') || 
         error?.message?.includes('policy');
};

/**
 * Format RLS error message
 */
const formatRLSError = (table, error) => {
  return `RLS Policy Denial: Check Row Level Security policies for '${table}' table. Error: ${error.message}`;
};

/**
 * Fetch test data by ID
 * Only fetches active tests (is_active = true) as per USER_WEBSITE_TEST_FETCHING.md
 */
export const fetchTestData = async (testId, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  console.log('[fetchTestData] Fetching started...', { testId, timeoutMs });
  
  // Verify Supabase client is initialized
  if (!supabase) {
    console.error('[fetchTestData] Supabase client is not initialized');
    throw new Error('Supabase client is not initialized. Check environment variables.');
  }
  
  const queryPromise = supabase
    .from("test")
    .select("id, title, type, difficulty, duration, question_quantity, is_premium, is_active, created_at")
    .eq("id", testId)
    .eq("is_active", true) // Only fetch active tests
    .maybeSingle();

  console.log('[fetchTestData] Query promise created, executing with timeout...');
  const { data, error } = await executeQueryWithTimeout(queryPromise, timeoutMs);
  console.log('[fetchTestData] Data received:', data ? { id: data.id, title: data.title } : null, 'Error:', error?.message || null);

  if (error) {
    console.error('[fetchTestData] Supabase Error (test table):', {
      table: 'test',
      testId,
      error: error.message,
      code: error.code,
    });
    
    if (isRLSError(error)) {
      throw new Error(formatRLSError('test', error));
    }
    throw error;
  }

  if (!data) {
    throw new Error(`Test with ID ${testId} not found in 'test' table. Verify the ID exists and RLS policies allow access.`);
  }

  return data;
};

/**
 * Fetch parts data for a test
 */
export const fetchPartsData = async (testId, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  console.log('[fetchPartsData] Fetching started...', { testId, timeoutMs });
  
  const queryPromise = supabase
    .from("part")
    .select("id, test_id, part_number, title, content, image_url, listening_url")
    .eq("test_id", testId)
    .order("part_number", { ascending: true });

  const { data, error } = await executeQueryWithTimeout(queryPromise, timeoutMs);
  console.log('[fetchPartsData] Data received:', data ? `${data.length} parts` : null, 'Error:', error?.message || null);

  if (error) {
    console.error('[fetchPartsData] Supabase Error (part table):', error);
    if (isRLSError(error)) {
      throw new Error(formatRLSError('part', error));
    }
    throw error;
  }

  return data || [];
};

/**
 * Fetch options data for a test
 */
export const fetchOptionsData = async (testId, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  console.log('[fetchOptionsData] Fetching started...', { testId, timeoutMs });
  
  const queryPromise = supabase
    .from("options")
    .select("id, test_id, question_id, question_number, option_text, option_key, is_correct")
    .eq("test_id", testId);

  const { data, error } = await executeQueryWithTimeout(queryPromise, timeoutMs);
  console.log('[fetchOptionsData] Data received:', data ? `${data.length} options` : null, 'Error:', error?.message || null);

  if (error) {
    console.error('[fetchOptionsData] Supabase Error (options table):', error);
    if (isRLSError(error)) {
      throw new Error(formatRLSError('options', error));
    }
    throw error;
  }

  return data || [];
};

/**
 * Fetch question groups (question table) for parts
 */
export const fetchQuestionGroupsData = async (partIds, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  if (!partIds || partIds.length === 0) {
    console.log('[fetchQuestionGroupsData] No partIds provided, returning empty array');
    return [];
  }

  console.log('[fetchQuestionGroupsData] Fetching started...', { partIds: partIds.length, timeoutMs });
  
  const queryPromise = supabase
    .from("question")
    .select("id, part_id, type, instruction, question_text, question_range, image_url")
    .in("part_id", partIds);

  const { data, error } = await executeQueryWithTimeout(queryPromise, timeoutMs);
  console.log('[fetchQuestionGroupsData] Data received:', data ? `${data.length} question groups` : null, 'Error:', error?.message || null);

  if (error) {
    console.error('[fetchQuestionGroupsData] Supabase Error (question table):', error);
    if (isRLSError(error)) {
      throw new Error(formatRLSError('question', error));
    }
    throw error;
  }

  return data || [];
};

/**
 * Fetch individual questions for question groups
 * @param {Array} questionGroupIds - Array of question group IDs
 * @param {boolean} includeCorrectAnswers - Whether to include correct_answer and explanation fields (for review mode)
 * @param {number} timeoutMs - Query timeout in milliseconds
 * @returns {Promise<Array>} Array of question objects
 */
export const fetchQuestionsData = async (questionGroupIds, includeCorrectAnswers = false, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  if (!questionGroupIds || questionGroupIds.length === 0) {
    console.log('[fetchQuestionsData] No questionGroupIds provided, returning empty array');
    return [];
  }

  console.log('[fetchQuestionsData] Fetching started...', { questionGroupIds: questionGroupIds.length, includeCorrectAnswers, timeoutMs });
  
  // Build select query based on includeCorrectAnswers parameter
  // For test-taking: exclude correct_answer and explanation
  // For review mode: include correct_answer and explanation
  let selectFields = "id, question_id, part_id, question_number, question_text, is_correct";
  if (includeCorrectAnswers) {
    selectFields = "id, question_id, part_id, question_number, question_text, correct_answer, explanation, is_correct";
  }
  
  const queryPromise = supabase
    .from("questions")
    .select(selectFields)
    .in("question_id", questionGroupIds)
    .order("question_number", { ascending: true });

  const { data, error } = await executeQueryWithTimeout(queryPromise, timeoutMs);
  console.log('[fetchQuestionsData] Data received:', data ? `${data.length} questions` : null, 'Error:', error?.message || null);

  if (error) {
    console.error('[fetchQuestionsData] Supabase Error (questions table):', error);
    if (isRLSError(error)) {
      throw new Error(formatRLSError('questions', error));
    }
    throw error;
  }

  return data || [];
};

