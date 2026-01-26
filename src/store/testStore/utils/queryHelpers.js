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
  return Promise.race([queryPromise, createTimeoutPromise(timeoutMs)]);
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
 */
export const fetchTestData = async (testId, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const queryPromise = supabase
    .from("test")
    .select("id, title, type, difficulty, duration, question_quantity, is_premium, is_active, created_at")
    .eq("id", testId)
    .maybeSingle();

  const { data, error } = await executeQueryWithTimeout(queryPromise, timeoutMs);

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
  const queryPromise = supabase
    .from("part")
    .select("id, test_id, part_number, title, content, image_url, listening_url")
    .eq("test_id", testId)
    .order("part_number", { ascending: true });

  const { data, error } = await executeQueryWithTimeout(queryPromise, timeoutMs);

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
  const queryPromise = supabase
    .from("options")
    .select("id, test_id, question_id, question_number, option_text, option_key, is_correct")
    .eq("test_id", testId);

  const { data, error } = await executeQueryWithTimeout(queryPromise, timeoutMs);

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
    return [];
  }

  const queryPromise = supabase
    .from("question")
    .select("id, part_id, type, instruction, question_text, question_range, image_url")
    .in("part_id", partIds);

  const { data, error } = await executeQueryWithTimeout(queryPromise, timeoutMs);

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
 */
export const fetchQuestionsData = async (questionGroupIds, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  if (!questionGroupIds || questionGroupIds.length === 0) {
    return [];
  }

  const queryPromise = supabase
    .from("questions")
    .select("id, question_id, question_number, question_text, correct_answer")
    .in("question_id", questionGroupIds)
    .order("question_number", { ascending: true });

  const { data, error } = await executeQueryWithTimeout(queryPromise, timeoutMs);

  if (error) {
    console.error('[fetchQuestionsData] Supabase Error (questions table):', error);
    if (isRLSError(error)) {
      throw new Error(formatRLSError('questions', error));
    }
    throw error;
  }

  return data || [];
};

