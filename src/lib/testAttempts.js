/**
 * Database helper functions for managing user test attempts
 * Handles user_attempts and user_answers tables
 */

import supabase from './supabase';
import { useTestDetailStore } from '@/store/testStore/testDetailStore';
import { useAuthStore } from '@/store/authStore';

// Helper to get user from localStorage (persisted by Zustand in 'auth-storage')
const getUserIdFromLocalStorage = () => {
  try {
    const authStore = localStorage.getItem('auth-storage');
    if (authStore) {

      const parsed = JSON.parse(authStore);
      return parsed?.state?.authUser?.id || null;
    }
    return null;
  } catch (err) {
    return null;
  }
};

export const submitTestAttempt = async (testId, answers, currentTest, timeTaken = null, type) => {
  try {
    // Get user id from localStorage
    const authenticatedUserId = getUserIdFromLocalStorage();
    if (!authenticatedUserId) {
      throw new Error('User not authenticated');
    }

    // Fetch test with correct answers to ensure we have correct_answer data for scoring
    // This is necessary because currentTest might not have correct_answer fields
    let testWithCorrectAnswers = currentTest;
    try {
      // Get user subscription status from auth store
      const authStore = useAuthStore.getState();
      const userSubscriptionStatus = authStore.userProfile?.subscription_status || 'free';
      
      const testDetailStore = useTestDetailStore.getState();
      const fetchedTest = await testDetailStore.fetchTestById(testId, false, true, userSubscriptionStatus); // Include correct answers
      if (fetchedTest) {
        testWithCorrectAnswers = fetchedTest;
      }
    } catch (error) {
      console.warn('Failed to fetch test with correct answers, using provided currentTest:', error);
      // Continue with currentTest if fetch fails
    }

    // Calculate score and correctness using test with correct answers
    const { correctCount, totalQuestions, answerResults } = calculateTestScore(answers, testWithCorrectAnswers);

    // Calculate band score (IELTS 0-9 scale based on percentage)
    const bandScore = calculateBandScore(correctCount, totalQuestions, type);

    // Calculate time_taken if not provided (fallback to 0)
    const timeTakenSeconds = timeTaken !== null && timeTaken !== undefined
      ? Math.max(0, Math.floor(timeTaken))
      : 0;

    // 1. Create user_attempt record
    const { data: attemptData, error: attemptError } = await supabase
      .from('user_attempts')
      .insert({
        user_id: authenticatedUserId,
        test_id: testId,
        score: bandScore,
        total_questions: totalQuestions,
        correct_answers: correctCount,
        time_taken: timeTakenSeconds,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (attemptError) throw attemptError;

    const attemptId = attemptData.id;

    // 2. Create user_answers records
    const answersToInsert = answerResults.map((result) => ({
      attempt_id: attemptId,
      question_id: result.questionId,
      user_answer: result.userAnswer || '',
      is_correct: result.isCorrect,
      correct_answer: result.correctAnswer || '',
      question_type: result.questionType || 'multiple_choice', // Include question type
    }));

    if (answersToInsert.length > 0) {
      const { error: answersError } = await supabase
        .from('user_answers')
        .insert(answersToInsert);

      if (answersError) throw answersError;
    }

    return {
      success: true,
      attemptId,
      score: bandScore,
      correctCount,
      totalQuestions,
    };
  } catch (error) {
    console.error('Error submitting test attempt:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Fetch user answers for a specific attempt
 * @param {number} attemptId - The attempt ID
 * @returns {Promise<{success: boolean, answers?: object, error?: string}>}
 */
export const fetchAttemptAnswers = async (attemptId) => {
  try {
    const { data, error } = await supabase
      .from('user_answers')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('question_id', { ascending: true });

    if (error) throw error;

    // Convert to object format: { [questionId]: { userAnswer, isCorrect, correctAnswer } }
    const answersObject = {};
    data.forEach((item) => {
      answersObject[item.question_id] = {
        userAnswer: item.user_answer,
        isCorrect: item.is_correct,
        correctAnswer: item.correct_answer,
      };
    });

    return {
      success: true,
      answers: answersObject,
    };
  } catch (error) {
    console.error('Error fetching attempt answers:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};


export const fetchLatestAttempt = async (userId, testId) => {
  try {
    // Get user id from localStorage
    const authenticatedUserId = getUserIdFromLocalStorage();
    if (!authenticatedUserId) {
      throw new Error('User not authenticated');
    }

    // Fetch latest attempt
    const { data: attemptData, error: attemptError } = await supabase
      .from('user_attempts')
      .select('id, user_id, test_id, score, total_questions, correct_answers, time_taken, completed_at, created_at')
      .eq('user_id', authenticatedUserId)
      .eq('test_id', testId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (attemptError) {
      // No attempts found - this is okay
      if (attemptError.code === 'PGRST116') {
        return {
          success: true,
          attempt: null,
          answers: {},
        };
      }
      throw attemptError;
    }

    // Fetch answers for this attempt
    const answersResult = await fetchAttemptAnswers(attemptData.id);

    return {
      success: true,
      attempt: attemptData,
      answers: answersResult.answers || {},
    };
  } catch (error) {
    console.error('Error fetching latest attempt:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Check if a test has been completed by the user
 * @param {string|number} testId - The test ID
 * @returns {Promise<{success: boolean, isCompleted?: boolean, attempt?: object, error?: string}>}
 */
export const checkTestCompleted = async (testId) => {
  try {
    const authenticatedUserId = getUserIdFromLocalStorage();
    if (!authenticatedUserId) {
      return {
        success: true,
        isCompleted: false,
      };
    }

    const { data, error } = await supabase
      .from('user_attempts')
      .select('id, test_id, score, completed_at, correct_answers, total_questions')
      .eq('user_id', authenticatedUserId)
      .eq('test_id', testId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return {
      success: true,
      isCompleted: !!data,
      attempt: data || null,
    };
  } catch (error) {
    console.error('Error checking test completion:', error);
    return {
      success: false,
      isCompleted: false,
      error: error.message,
    };
  }
};

/**
 * Map question group type to standardized question type enum
 * Valid enum values: multiple_choice, fill_in_blanks, matching_information, 
 * true_false_not_given, table, drag_drop, yes_no_not_given, map, table_completion
 * @param {string} groupType - Question group type
 * @returns {string} Standardized question type enum value
 */
const mapQuestionType = (groupType) => {
  const normalizedType = (groupType || '').toLowerCase();
  
  // Map to exact enum values from Supabase
  if (normalizedType.includes('multiple_choice')) {
    return 'multiple_choice';
  }
  if (normalizedType === 'fill_in_blanks' || normalizedType.includes('fill_in_blank')) {
    return 'fill_in_blanks';
  }
  if (normalizedType === 'table_completion') {
    return 'table_completion';
  }
  if (normalizedType.includes('drag') || normalizedType.includes('drop') || normalizedType.includes('summary_completion')) {
    return 'drag_drop';
  }
  if (normalizedType.includes('matching_information')) {
    return 'matching_information';
  }
  if (normalizedType.includes('matching_headings') || (normalizedType.includes('table') && !normalizedType.includes('completion'))) {
    return 'table'; // matching_headings maps to 'table' enum value
  }
  if (normalizedType.includes('map')) {
    return 'map';
  }
  if (normalizedType.includes('true_false_not_given')) {
    return 'true_false_not_given';
  }
  if (normalizedType.includes('yes_no_not_given')) {
    return 'yes_no_not_given';
  }
  if (normalizedType.includes('multiple_answers')) {
    return 'multiple_answers';
  }

  // Default fallback
  return 'multiple_choice';
};

/**
 * Calculate test score by comparing user answers with correct answers
 * @param {object} answers - User answers { [questionId]: answer }
 * @param {object} currentTest - Test data with parts and questions
 * @returns {object} { correctCount, totalQuestions, answerResults }
 */
const calculateTestScore = (answers, currentTest) => {
  if (!currentTest || !currentTest.parts) {
    return { correctCount: 0, totalQuestions: 0, answerResults: [] };
  }

  const answerResults = [];
  let correctCount = 0;
  let totalQuestions = 0;
  

  // Iterate through all parts and questions
  currentTest.parts.forEach((part) => {
    if (part.questionGroups) {
      part.questionGroups.forEach((questionGroup) => {
        const groupQuestions = questionGroup.questions || [];
        const groupType = (questionGroup.type || '').toLowerCase();
        const isDragAndDrop = groupType.includes('drag') || groupType.includes('drop') || groupType.includes('summary_completion');
        const isMultipleAnswers = groupType === 'multiple_answers';
        
        // Map question group type to standardized question type
        const questionType = mapQuestionType(questionGroup.type);

        // For drag and drop, only process questions with question_number (exclude word bank entries)
        const validQuestions = isDragAndDrop
          ? groupQuestions.filter(q => q.question_number != null)
          : groupQuestions;


        // For multiple_answers: parse group-level answer and check each question
        if (isMultipleAnswers) {
          // Get group-level answer (comma-separated option_keys like "A,B")
          const groupAnswer = answers[questionGroup.id] || '';
          const selectedOptionKeys = groupAnswer
            .split(',')
            .map(key => key.trim().toUpperCase())
            .filter(Boolean);

          // Process each question in the group
          validQuestions.forEach((question) => {
            const questionId = question.id;
            const questionNumber = question.question_number;
            
            if (!questionId && !questionNumber) return;
            
            totalQuestions++;
            
            // Get correct answer option_key for this question
            const correctAnswerKey = question.correct_answer?.toString().trim().toUpperCase() || '';
            const correctAnswer = getCorrectAnswer(question, questionGroup);
            
            // Check if the correct answer option_key is in the selected options
            const isCorrect = correctAnswerKey && selectedOptionKeys.includes(correctAnswerKey);
            
            // Format user answer for display (show selected options)
            const userAnswer = groupAnswer || '';

            if (isCorrect) {
              correctCount++;
            }

            answerResults.push({
              questionId: questionId || questionNumber,
              userAnswer,
              correctAnswer,
              isCorrect,
              questionType,
            });
          });
        } else {
          // For other question types: process normally
          validQuestions.forEach((question) => {
            // Use questions.id as primary key (from nested structure), fallback to question_number for backward compatibility
            const questionId = question.id; // This is questions.id from the nested structure
            const questionNumber = question.question_number;
            
            // Try to get answer using questions.id first, then fallback to question_number
            const userAnswer = (questionId && answers[questionId]?.toString().trim()) || 
                              (questionNumber && answers[questionNumber]?.toString().trim()) || 
                              '';
            
            // Skip if no answer found and no question ID/number
            if (!questionId && !questionNumber) return;
            
            totalQuestions++;
            const correctAnswer = getCorrectAnswer(question, questionGroup);

            // Normalize answers for comparison
            const normalizedUserAnswer = normalizeAnswer(userAnswer);
            const normalizedCorrectAnswer = normalizeAnswer(correctAnswer);

            const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer && normalizedUserAnswer !== '';

            if (isCorrect) {
              correctCount++;
            }

            // Use questions.id as questionId for database storage, fallback to question_number
            answerResults.push({
              questionId: questionId || questionNumber, // Use questions.id if available, otherwise question_number
              userAnswer,
              correctAnswer,
              isCorrect,
              questionType, // Include question type for analytics
            });
          });
        }
      });
    }
  });

  return { correctCount, totalQuestions, answerResults };
};

/**
 * Get correct answer from question or question group
 * @param {object} question - Individual question
 * @param {object} questionGroup - Question group
 * @returns {string} Correct answer
 */
const getCorrectAnswer = (question, questionGroup) => {
  const groupType = (questionGroup.type || '').toLowerCase();
  const isMultipleChoice = groupType.includes('multiple_choice');
  const isMultipleAnswers = groupType === 'multiple_answers';
  const isTableType = groupType.includes('table');
  const isMatchingInformation = groupType.includes('matching_information') || groupType.includes('matching');
  const isMatchingHeadings = groupType.includes('matching_headings');
  

  // For multiple_choice: use options table with is_correct
  if (isMultipleChoice) {
    // First try to get from question.correct_answer (might be letter like "A")
    if (question.correct_answer) {
      const correctAnswerKey = question.correct_answer.toString().trim();
      // Try to find option_text that matches this letter
      if (question.options && question.options.length > 0) {
        const correctOption = question.options.find(
          (opt) => (opt.letter || opt.option_key || '').toLowerCase() === correctAnswerKey.toLowerCase() ||
                   opt.is_correct === true
        );
        if (correctOption) {
          return correctOption.option_text || correctAnswerKey;
        }
      }
      // Fallback to the letter if no option found
      return correctAnswerKey;
    }
    // Fallback: find correct option in question's options
    if (question.options && question.options.length > 0) {
      const correctOption = question.options.find((opt) => opt.is_correct === true);
      if (correctOption) {
        // Use option_text as the answer value (not letter)
        return correctOption.option_text || '';
      }
    }
  }

  // For multiple_answers: correct_answer is stored as option_key (e.g., "A"), convert to option_text
  if (isMultipleAnswers) {
    if (question.correct_answer) {
      const correctAnswerKey = question.correct_answer.toString().trim().toUpperCase();
      // Try to find option_text from group-level options that matches this option_key
      if (questionGroup.options && questionGroup.options.length > 0) {
        const correctOption = questionGroup.options.find(
          (opt) => (opt.option_key || opt.letter || '').toString().trim().toUpperCase() === correctAnswerKey
        );
        if (correctOption) {
          // Return option_text for display
          return correctOption.option_text || correctAnswerKey;
        }
      }
      // Fallback: return the key if no matching option found
      return correctAnswerKey;
    }
  }

  // For matching_information: correct_answer is stored as option_key (e.g., "A"), but we need option_text
  if (isMatchingInformation) {
    if (question.correct_answer) {
      const correctAnswerKey = question.correct_answer.toString().trim();
      // Try to find option_text from group-level options that matches this option_key
      if (questionGroup.options && questionGroup.options.length > 0) {
        const correctOption = questionGroup.options.find(
          (opt) => (opt.option_key || opt.letter || '').toLowerCase() === correctAnswerKey.toLowerCase()
        );
        if (correctOption) {
          // Return option_text for matching
          return correctOption.option_text || correctAnswerKey;
        }
      }
      // Fallback: return the key if no matching option found
      return correctAnswerKey;
    }
  }

  // For matching_headings: similar to matching_information
  if (isMatchingHeadings) {
    if (question.correct_answer) {
      const correctAnswerKey = question.correct_answer.toString().trim();
      // Try to find option_text from group-level options
      if (questionGroup.options && questionGroup.options.length > 0) {
        const correctOption = questionGroup.options.find(
          (opt) => (opt.option_key || opt.letter || '').toLowerCase() === correctAnswerKey.toLowerCase() ||
                   opt.is_correct === true && opt.question_number === question.question_number
        );
        if (correctOption) {
          return correctOption.option_text || correctAnswerKey;
        }
      }
      return correctAnswerKey;
    }
  }

  // For table type: correct_answer is stored directly on the question
  // Options are group-level (question_number is null) and shared by all questions
  if (isTableType) {
    // Get correct answer directly from question.correct_answer (e.g., "A", "B", "C")
    if (question.correct_answer) {
      // The correct_answer is stored as a letter (e.g., "A"), but we need to match it
      // to the option_text from group-level options
      const correctAnswerLetter = question.correct_answer.toString().trim();
      
      // Try to find the option_text that matches this letter from group-level options
      if (questionGroup.options && questionGroup.options.length > 0) {
        const correctOption = questionGroup.options.find(
          (opt) => (opt.letter || opt.option_key || '').toLowerCase() === correctAnswerLetter.toLowerCase() ||
                   (opt.option_text || '').toLowerCase() === correctAnswerLetter.toLowerCase()
        );
        if (correctOption) {
          // Return option_text if available, otherwise return the letter
          return correctOption.option_text || correctAnswerLetter;
        }
      }
      
      // Fallback: return the letter directly if no matching option found
      return correctAnswerLetter;
    }
  }

  // For other question types: try to get correct answer from question's correct_answer field first
  if (question.correct_answer) {
    const correctAnswer = question.correct_answer.toString().trim();
    // For types that might have option_key stored, try to convert to option_text
    if (questionGroup.options && questionGroup.options.length > 0) {
      const matchingOption = questionGroup.options.find(
        (opt) => (opt.option_key || opt.letter || '').toLowerCase() === correctAnswer.toLowerCase()
      );
      if (matchingOption) {
        return matchingOption.option_text || correctAnswer;
      }
    }
    return correctAnswer;
  }

  // For other types with options: find correct option
  if (question.options && question.options.length > 0) {
    const correctOption = question.options.find((opt) => opt.is_correct);
    if (correctOption) {
      // For other types, prefer option_text but fallback to letter
      return correctOption.option_text || correctOption.letter || correctOption.option_key || '';
    }
  }

  // For group-level options (e.g., drag-drop, matching headings)
  if (questionGroup.options && questionGroup.options.length > 0) {
    const correctOption = questionGroup.options.find(
      (opt) => opt.is_correct && opt.question_number === question.question_number
    );
    if (correctOption) {
      return correctOption.option_text || correctOption.letter || correctOption.option_key || '';
    }
  }

  // If no correct answer found, return empty string
  // This will be marked as incorrect during scoring
  return '';
};

/**
 * Normalize answer for comparison (case-insensitive, trim whitespace)
 * @param {string} answer - Answer to normalize
 * @returns {string} Normalized answer
 */
const normalizeAnswer = (answer) => {
  if (!answer) return '';
  return answer.toString().trim().toLowerCase();
};

const readingBands = [
  { min: 39, band: 9 },
  { min: 37, band: 8.5 },
  { min: 35, band: 8 },
  { min: 33, band: 7.5 },
  { min: 30, band: 7 },
  { min: 27, band: 6.5 },
  { min: 23, band: 6 },
  { min: 19, band: 5.5 },
  { min: 15, band: 5 },
  { min: 13, band: 4.5 },
  { min: 10, band: 4 },
  { min: 9, band: 3.5 },
  { min: 7, band: 3 },
  { min: 5, band: 2.5 },
  { min: 3, band: 2 },
  { min: 2, band: 1.5 },
  { min: 1, band: 1 },
  { min: 0, band: 0 },
];

const listeningBands = [
  { min: 39, band: 9 },
  { min: 37, band: 8.5 },
  { min: 35, band: 8 },
  { min: 33, band: 7.5 },
  { min: 30, band: 7 },
  { min: 26, band: 6.5 },
  { min: 23, band: 6 },
  { min: 18, band: 5.5 },
  { min: 16, band: 5 },
  { min: 13, band: 4.5 },
  { min: 10, band: 4 },
  { min: 9, band: 3.5 },
  { min: 7, band: 3 },
  { min: 5, band: 2.5 },
  { min: 3, band: 2 },
  { min: 2, band: 1.5 },
  { min: 1, band: 1 },
  { min: 0, band: 0 },
];
const calculateBandScore = (correctCount, totalQuestions, type) => {
  if (totalQuestions === 0) return 0.0;

  const normalizedScore = Math.round((correctCount / totalQuestions) * 40);

  if (type === 'reading') {
    return readingBands.find(band => normalizedScore >= band.min)?.band || 0.0;
  } else if (type === 'listening') {
    return listeningBands.find(band => normalizedScore >= band.min)?.band || 0.0;
  }

  throw new Error('Invalid test type');
};

/**
 * Delete all attempts for a specific test by a user
 * @param {string|number} testId - The test ID
 * @returns {Promise<{success: boolean, deletedCount?: number, error?: string}>}
 */
export const deleteTestAttempts = async (testId) => {
  try {
    const authenticatedUserId = getUserIdFromLocalStorage();
    if (!authenticatedUserId) {
      throw new Error('User not authenticated');
    }

    // First, get all attempt IDs for this test
    const { data: attempts, error: fetchError } = await supabase
      .from('user_attempts')
      .select('id')
      .eq('user_id', authenticatedUserId)
      .eq('test_id', testId);

    if (fetchError) throw fetchError;

    if (!attempts || attempts.length === 0) {
      return {
        success: true,
        deletedCount: 0,
      };
    }

    const attemptIds = attempts.map(a => a.id);

    // Delete all user_answers for these attempts
    const { error: answersError } = await supabase
      .from('user_answers')
      .delete()
      .in('attempt_id', attemptIds);

    if (answersError) throw answersError;

    // Delete all user_attempts
    const { error: attemptsError } = await supabase
      .from('user_attempts')
      .delete()
      .eq('user_id', authenticatedUserId)
      .eq('test_id', testId);

    if (attemptsError) throw attemptsError;

    return {
      success: true,
      deletedCount: attempts.length,
    };
  } catch (error) {
    console.error('Error deleting test attempts:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

