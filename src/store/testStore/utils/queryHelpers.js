/**
 * Database query utilities for test data fetching
 * Handles Supabase queries with timeout, error handling, and abort support
 */

import supabase from "@/lib/supabase";

// Default timeout: 15 seconds (reduced from 30s for faster feedback)
const DEFAULT_TIMEOUT_MS = 15000;

// Development mode flag for conditional logging
const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * Log a message only in development mode
 * @param {string} prefix - Log prefix identifier
 * @param {...any} args - Arguments to log
 */
const devLog = (...args) => {
  if (IS_DEV) {
    console.log(...args);
  }
};

/**
 * Log an error (always logged, even in production)
 * @param {string} prefix - Log prefix identifier
 * @param {...any} args - Arguments to log
 */
const devError = (...args) => {
  console.error(...args);
};

/**
 * Validate and normalize testId to ensure it's a valid string or number
 * @param {any} testId - The test ID to validate
 * @returns {string|number|null} - Normalized test ID or null if invalid
 */
const validateTestId = (testId) => {
  if (testId === null || testId === undefined) {
    return null;
  }
  
  // Convert to string for UUIDs, or keep as number for numeric IDs
  if (typeof testId === 'string' && testId.trim().length > 0) {
    return testId.trim();
  }
  
  if (typeof testId === 'number' && !isNaN(testId) && isFinite(testId)) {
    return testId;
  }
  
  // Try to convert string numbers to numbers
  if (typeof testId === 'string') {
    const num = Number(testId);
    if (!isNaN(num) && isFinite(num)) {
      return num;
    }
  }
  
  return null;
};

/**
 * Create a timeout promise that rejects after specified milliseconds
 * @param {number} timeoutMs - Timeout duration in milliseconds
 * @param {AbortSignal} [signal] - Optional abort signal to cancel timeout
 * @returns {Promise<never>} - Promise that rejects with timeout error
 */
const createTimeoutPromise = (timeoutMs = DEFAULT_TIMEOUT_MS, signal = null) => {
  return new Promise((_, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    
    // Cancel timeout if abort signal is triggered
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Request aborted'));
      });
    }
  });
};

/**
 * Execute a query with timeout, error handling, and abort support
 * @param {Promise} queryPromise - The Supabase query promise to execute
 * @param {number} [timeoutMs=DEFAULT_TIMEOUT_MS] - Query timeout in milliseconds
 * @param {AbortSignal} [signal] - Optional abort signal to cancel the query
 * @returns {Promise<any>} - Query result
 * @throws {Error} - If query fails, times out, or is aborted
 */
const executeQueryWithTimeout = async (queryPromise, timeoutMs = DEFAULT_TIMEOUT_MS, signal = null) => {
  // Verify queryPromise is actually a promise
  if (!queryPromise || typeof queryPromise.then !== 'function') {
    const error = new Error('Invalid query promise. Query was not properly initialized.');
    devError('[executeQueryWithTimeout] Invalid queryPromise:', queryPromise);
    throw error;
  }
  
  // Verify Supabase client is initialized
  if (!supabase) {
    const error = new Error('Supabase client is not initialized. Check environment variables.');
    devError('[executeQueryWithTimeout] Supabase client is not initialized');
    throw error;
  }
  
  // Check if already aborted
  if (signal?.aborted) {
    throw new Error('Request aborted');
  }
  
  devLog('[executeQueryWithTimeout] Starting query with timeout:', timeoutMs, 'ms');
  
  try {
    // Race between query and timeout
    const result = await Promise.race([
      queryPromise,
      createTimeoutPromise(timeoutMs, signal)
    ]);
    
    devLog('[executeQueryWithTimeout] Query completed successfully');
    return result;
  } catch (error) {
    // Check if this is an abort error
    if (signal?.aborted || error.message?.includes('aborted')) {
      devLog('[executeQueryWithTimeout] Request aborted');
      throw new Error('Request aborted');
    }
    
    // Check if this is a timeout error
    if (error.message?.includes('timeout')) {
      devError('[executeQueryWithTimeout] Request timeout after', timeoutMs, 'ms');
      devError('[executeQueryWithTimeout] This may indicate the query never started. Check Supabase client initialization and query parameters.');
    }
    
    throw error;
  }
};

/**
 * Check if error is RLS (Row Level Security) policy denial
 * @param {Error} error - The error to check
 * @returns {boolean} - True if error is RLS-related
 */
const isRLSError = (error) => {
  return error?.code === 'PGRST116' || 
         error?.message?.includes('permission') || 
         error?.message?.includes('policy') ||
         error?.message?.includes('RLS');
};

/**
 * Format RLS error message for better user feedback
 * @param {string} table - Table name where RLS error occurred
 * @param {Error} error - The RLS error object
 * @returns {string} - Formatted error message
 */
const formatRLSError = (table, error) => {
  return `RLS Policy Denial: Check Row Level Security policies for '${table}' table. Error: ${error.message}`;
};

/**
 * Fetch test data by ID
 * Only fetches active tests (is_active = true) as per USER_WEBSITE_TEST_FETCHING.md
 * @param {string|number} testId - Test ID to fetch
 * @param {number} [timeoutMs=DEFAULT_TIMEOUT_MS] - Query timeout in milliseconds
 * @param {AbortSignal} [signal] - Optional abort signal to cancel the query
 * @returns {Promise<Object>} - Test data object
 * @throws {Error} - If test not found, query fails, or test is inactive
 */
export const fetchTestData = async (testId, timeoutMs = DEFAULT_TIMEOUT_MS, signal = null) => {
  const normalizedId = validateTestId(testId);
  if (!normalizedId) {
    const error = new Error(`Invalid testId: ${testId}. Expected a valid string or number.`);
    devError('[fetchTestData] Invalid testId:', testId);
    throw error;
  }
  
  devLog('[fetchTestData] Fetching started...', { testId: normalizedId, timeoutMs });
  
  // Verify Supabase client is initialized
  if (!supabase) {
    const error = new Error('Supabase client is not initialized. Check environment variables.');
    devError('[fetchTestData] Supabase client is not initialized');
    throw error;
  }
  
  const queryPromise = supabase
    .from("test")
    .select("id, title, type, difficulty, duration, question_quantity, is_premium, is_active, created_at")
    .eq("id", normalizedId)
    .eq("is_active", true) // Only fetch active tests
    .maybeSingle();

  devLog('[fetchTestData] Query promise created, executing with timeout...');
  const { data, error } = await executeQueryWithTimeout(queryPromise, timeoutMs, signal);
  devLog('[fetchTestData] Data received:', data ? { id: data.id, title: data.title } : null, 'Error:', error?.message || null);

  if (error) {
    devError('[fetchTestData] Supabase Error (test table):', {
      table: 'test',
      testId: normalizedId,
      error: error.message,
      code: error.code,
    });
    
    if (isRLSError(error)) {
      throw new Error(formatRLSError('test', error));
    }
    throw error;
  }

  if (!data) {
    throw new Error(`Test with ID ${normalizedId} not found in 'test' table. Verify the ID exists and RLS policies allow access.`);
  }

  return data;
};

/**
 * Fetch parts data for a test
 * @param {string|number} testId - Test ID
 * @param {number} [timeoutMs=DEFAULT_TIMEOUT_MS] - Query timeout in milliseconds
 * @param {AbortSignal} [signal] - Optional abort signal to cancel the query
 * @returns {Promise<Array>} - Array of part objects, sorted by part_number
 */
export const fetchPartsData = async (testId, timeoutMs = DEFAULT_TIMEOUT_MS, signal = null) => {
  const normalizedId = validateTestId(testId);
  if (!normalizedId) {
    const error = new Error(`Invalid testId: ${testId}. Expected a valid string or number.`);
    devError('[fetchPartsData] Invalid testId:', testId);
    throw error;
  }
  
  devLog('[fetchPartsData] Fetching started...', { testId: normalizedId, timeoutMs });
  
  const queryPromise = supabase
    .from("part")
    .select("id, test_id, part_number, title, content, image_url, listening_url")
    .eq("test_id", normalizedId)
    .order("part_number", { ascending: true });

  const { data, error } = await executeQueryWithTimeout(queryPromise, timeoutMs, signal);
  devLog('[fetchPartsData] Data received:', data ? `${data.length} parts` : null, 'Error:', error?.message || null);

  if (error) {
    devError('[fetchPartsData] Supabase Error (part table):', error);
    if (isRLSError(error)) {
      throw new Error(formatRLSError('part', error));
    }
    throw error;
  }

  // Ensure parts are sorted by part_number
  const sortedParts = (data || []).sort((a, b) => {
    const aNum = a.part_number ?? 0;
    const bNum = b.part_number ?? 0;
    return aNum - bNum;
  });

  return sortedParts;
};

/**
 * Fetch options data for a test
 * @param {string|number} testId - Test ID
 * @param {number} [timeoutMs=DEFAULT_TIMEOUT_MS] - Query timeout in milliseconds
 * @param {AbortSignal} [signal] - Optional abort signal to cancel the query
 * @returns {Promise<Array>} - Array of option objects
 */
export const fetchOptionsData = async (testId, timeoutMs = DEFAULT_TIMEOUT_MS, signal = null) => {
  const normalizedId = validateTestId(testId);
  if (!normalizedId) {
    const error = new Error(`Invalid testId: ${testId}. Expected a valid string or number.`);
    devError('[fetchOptionsData] Invalid testId:', testId);
    throw error;
  }
  
  devLog('[fetchOptionsData] Fetching started...', { testId: normalizedId, timeoutMs });
  
  const queryPromise = supabase
    .from("options")
    .select("id, test_id, question_id, question_number, option_text, option_key, is_correct")
    .eq("test_id", normalizedId);

  const { data, error } = await executeQueryWithTimeout(queryPromise, timeoutMs, signal);
  devLog('[fetchOptionsData] Data received:', data ? `${data.length} options` : null, 'Error:', error?.message || null);

  if (error) {
    devError('[fetchOptionsData] Supabase Error (options table):', error);
    if (isRLSError(error)) {
      throw new Error(formatRLSError('options', error));
    }
    throw error;
  }

  return data || [];
};

/**
 * Fetch question groups (question table) for parts
 * @param {Array<string|number>} partIds - Array of part IDs
 * @param {number} [timeoutMs=DEFAULT_TIMEOUT_MS] - Query timeout in milliseconds
 * @param {AbortSignal} [signal] - Optional abort signal to cancel the query
 * @returns {Promise<Array>} - Array of question group objects
 */
export const fetchQuestionGroupsData = async (partIds, timeoutMs = DEFAULT_TIMEOUT_MS, signal = null) => {
  if (!partIds || partIds.length === 0) {
    devLog('[fetchQuestionGroupsData] No partIds provided, returning empty array');
    return [];
  }

  // Validate all part IDs
  const validPartIds = partIds.filter(id => validateTestId(id) !== null);
  if (validPartIds.length === 0) {
    devError('[fetchQuestionGroupsData] No valid partIds provided');
    return [];
  }

  devLog('[fetchQuestionGroupsData] Fetching started...', { partIds: validPartIds.length, timeoutMs });
  
  const queryPromise = supabase
    .from("question")
    .select("id, part_id, type, instruction, question_text, question_range, image_url")
    .in("part_id", validPartIds);

  const { data, error } = await executeQueryWithTimeout(queryPromise, timeoutMs, signal);
  devLog('[fetchQuestionGroupsData] Data received:', data ? `${data.length} question groups` : null, 'Error:', error?.message || null);

  if (error) {
    devError('[fetchQuestionGroupsData] Supabase Error (question table):', error);
    if (isRLSError(error)) {
      throw new Error(formatRLSError('question', error));
    }
    throw error;
  }

  return data || [];
};

/**
 * Fetch individual questions for question groups
 * @param {Array<string|number>} questionGroupIds - Array of question group IDs
 * @param {boolean} [includeCorrectAnswers=false] - Whether to include correct_answer and explanation fields (for review mode)
 * @param {number} [timeoutMs=DEFAULT_TIMEOUT_MS] - Query timeout in milliseconds
 * @param {AbortSignal} [signal] - Optional abort signal to cancel the query
 * @returns {Promise<Array>} - Array of question objects, sorted by question_number
 */
export const fetchQuestionsData = async (questionGroupIds, includeCorrectAnswers = false, timeoutMs = DEFAULT_TIMEOUT_MS, signal = null) => {
  if (!questionGroupIds || questionGroupIds.length === 0) {
    devLog('[fetchQuestionsData] No questionGroupIds provided, returning empty array');
    return [];
  }

  // Validate all question group IDs
  const validQuestionGroupIds = questionGroupIds.filter(id => validateTestId(id) !== null);
  if (validQuestionGroupIds.length === 0) {
    devError('[fetchQuestionsData] No valid questionGroupIds provided');
    return [];
  }

  devLog('[fetchQuestionsData] Fetching started...', { questionGroupIds: validQuestionGroupIds.length, includeCorrectAnswers, timeoutMs });
  
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
    .in("question_id", validQuestionGroupIds)
    .order("question_number", { ascending: true });

  const { data, error } = await executeQueryWithTimeout(queryPromise, timeoutMs, signal);
  devLog('[fetchQuestionsData] Data received:', data ? `${data.length} questions` : null, 'Error:', error?.message || null);

  if (error) {
    devError('[fetchQuestionsData] Supabase Error (questions table):', error);
    if (isRLSError(error)) {
      throw new Error(formatRLSError('questions', error));
    }
    throw error;
  }

  // Ensure questions are sorted by question_number
  const sortedQuestions = (data || []).sort((a, b) => {
    const aNum = a.question_number ?? 0;
    const bNum = b.question_number ?? 0;
    return aNum - bNum;
  });

  return sortedQuestions;
};

/**
 * Fetch test data using nested Supabase query
 * This is the new approach that fetches all data in a single nested query
 * Structure: test -> part -> question -> questions -> options
 * @param {string|number} testId - Test ID
 * @param {boolean} [includeCorrectAnswers=false] - Whether to include correct_answer and explanation fields (for review mode)
 * @param {number} [timeoutMs=DEFAULT_TIMEOUT_MS] - Query timeout in milliseconds
 * @param {AbortSignal} [signal] - Optional abort signal to cancel the query
 * @returns {Promise<Object>} - Complete test object with nested structure
 * @throws {Error} - If test not found, query fails, or test is inactive
 */
export const fetchTestDataNested = async (testId, includeCorrectAnswers = false, timeoutMs = DEFAULT_TIMEOUT_MS, signal = null) => {
  const normalizedId = validateTestId(testId);
  if (!normalizedId) {
    const error = new Error(`Invalid testId: ${testId}. Expected a valid string or number.`);
    devError('[fetchTestDataNested] Invalid testId:', testId);
    throw error;
  }
  
  devLog('[fetchTestDataNested] Fetching started...', { testId: normalizedId, includeCorrectAnswers, timeoutMs });
  
  // Verify Supabase client is initialized
  if (!supabase) {
    const error = new Error('Supabase client is not initialized. Check environment variables.');
    devError('[fetchTestDataNested] Supabase client is not initialized');
    throw error;
  }

  // Build options select fields
  // Options are linked to question (group) via question_id, and matched to questions via question_number
  const optionsSelect = "id, test_id, question_id, part_id, question_number, option_text, option_key, is_correct";

  // Build questions select fields (without nested options - we'll match them manually)
  const questionsSelect = includeCorrectAnswers
    ? `id, test_id, question_id, part_id, question_number, question_text, correct_answer, explanation, is_correct`
    : `id, test_id, question_id, part_id, question_number, question_text, is_correct`;

  // Build question (group) select fields with nested questions and options
  // Options are nested under question (group), not directly under questions
  const questionSelect = `id, test_id, part_id, type, instruction, question_text, question_range, image_url, questions(${questionsSelect}), options(${optionsSelect})`;

  // Build part select fields with nested question groups
  // Include both content (for reading) and listening_url (for listening)
  const partSelect = `id, test_id, part_number, title, content, image_url, listening_url, question(${questionSelect})`;

  // Build test select fields with nested parts
  const testSelect = `id, title, type, difficulty, duration, question_quantity, is_premium, is_active, created_at, part(${partSelect})`;

  const queryPromise = supabase
    .from("test")
    .select(testSelect)
    .eq("id", normalizedId)
    .eq("is_active", true)
    .maybeSingle();

  devLog('[fetchTestDataNested] Query promise created, executing with timeout...');
  const { data, error } = await executeQueryWithTimeout(queryPromise, timeoutMs, signal);
  devLog('[fetchTestDataNested] Data received:', data ? { id: data.id, title: data.title, partsCount: data.part?.length || 0 } : null, 'Error:', error?.message || null);

  if (error) {
    devError('[fetchTestDataNested] Supabase Error:', {
      table: 'test',
      testId: normalizedId,
      error: error.message,
      code: error.code,
    });
    
    if (isRLSError(error)) {
      throw new Error(formatRLSError('test', error));
    }
    throw error;
  }

  if (!data) {
    throw new Error(`Test with ID ${normalizedId} not found in 'test' table. Verify the ID exists and RLS policies allow access.`);
  }

  // Ensure parts are sorted by part_number
  if (data.part && Array.isArray(data.part)) {
    data.part = data.part.sort((a, b) => {
      const aNum = a.part_number ?? 0;
      const bNum = b.part_number ?? 0;
      return aNum - bNum;
    });

    // Ensure question groups within each part are sorted
    data.part.forEach(part => {
      if (part.question && Array.isArray(part.question)) {
        part.question = part.question.sort((a, b) => {
          // Sort by first question's question_number in each group
          const aFirst = a.questions?.[0]?.question_number ?? 0;
          const bFirst = b.questions?.[0]?.question_number ?? 0;
          return aFirst - bFirst;
        });

        // Ensure questions within each group are sorted
        part.question.forEach(questionGroup => {
          if (questionGroup.questions && Array.isArray(questionGroup.questions)) {
            questionGroup.questions = questionGroup.questions.sort((a, b) => {
              const aNum = a.question_number ?? 0;
              const bNum = b.question_number ?? 0;
              return aNum - bNum;
            });
          }
        });
      }
    });
  }

  return data;
};
