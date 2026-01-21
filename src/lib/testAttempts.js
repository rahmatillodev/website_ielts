/**
 * Database helper functions for managing user test attempts
 * Handles user_attempts and user_answers tables
 */

import supabase from './supabase';

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

export const submitTestAttempt = async (testId, answers, currentTest, timeTaken = null) => {
  try {
    // Get user id from localStorage
    const authenticatedUserId = getUserIdFromLocalStorage();
    if (!authenticatedUserId) {
      throw new Error('User not authenticated');
    }

    // Calculate score and correctness
    const { correctCount, totalQuestions, answerResults } = calculateTestScore(answers, currentTest);

    // Calculate band score (IELTS 0-9 scale based on percentage)
    const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
    const bandScore = calculateBandScore(percentage);

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
      .select('*')
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
      .select('*')
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
        
        // For drag and drop, only process questions with question_number (exclude word bank entries)
        const validQuestions = isDragAndDrop 
          ? groupQuestions.filter(q => q.question_number != null)
          : groupQuestions;
        
        validQuestions.forEach((question) => {
          // Use question_number as primary key (consistent with DragAndDrop component)
          const questionKey = question.question_number;
          if (!questionKey) return;

          totalQuestions++;
          const userAnswer = answers[questionKey]?.toString().trim() || '';
          const correctAnswer = getCorrectAnswer(question, questionGroup);

          // Normalize answers for comparison
          const normalizedUserAnswer = normalizeAnswer(userAnswer);
          const normalizedCorrectAnswer = normalizeAnswer(correctAnswer);

          const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer && normalizedUserAnswer !== '';

          if (isCorrect) {
            correctCount++;
          }

          answerResults.push({
            questionId: questionKey,
            userAnswer,
            correctAnswer,
            isCorrect,
          });
        });
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
  const isMultipleChoice = groupType.includes('multiple') || groupType.includes('choice');
  const isTableType = groupType.includes('table');

  // For multiple_choice and table types: use options table with is_correct
  if (isMultipleChoice || isTableType) {
    // For multiple_choice: find correct option in question's options
    if (isMultipleChoice && question.options && question.options.length > 0) {
      const correctOption = question.options.find((opt) => opt.is_correct === true);
      if (correctOption) {
        // Use option_text as the answer value (not letter)
        return correctOption.option_text || '';
      }
    }

    // For table: try to get from question.correct_answer first (stored in testStore)
    if (isTableType && question.correct_answer) {
      return question.correct_answer;
    }

    // For table: find correct option in group options matching question_number
    if (isTableType && questionGroup.options && questionGroup.options.length > 0) {
      const correctOption = questionGroup.options.find(
        (opt) => opt.is_correct === true && opt.question_number === question.question_number
      );
      if (correctOption) {
        // Use option_text as the answer value (not letter)
        return correctOption.option_text || '';
      }
    }

    // Fallback: check question's options for table (in case options are stored per question)
    if (isTableType && question.options && question.options.length > 0) {
      const correctOption = question.options.find((opt) => opt.is_correct === true);
      if (correctOption) {
        return correctOption.option_text || '';
      }
    }
  }

  // For other question types: try to get correct answer from question's correct_answer field
  if (question.correct_answer) {
    return question.correct_answer.toString().trim();
  }

  // For other types with options: find correct option
  if (question.options && question.options.length > 0) {
    const correctOption = question.options.find((opt) => opt.is_correct);
    if (correctOption) {
      // For other types, prefer option_text but fallback to letter
      return correctOption.option_text || correctOption.letter || '';
    }
  }

  // For group-level options (e.g., drag-drop, matching headings)
  if (questionGroup.options && questionGroup.options.length > 0) {
    const correctOption = questionGroup.options.find(
      (opt) => opt.is_correct && opt.question_number === question.question_number
    );
    if (correctOption) {
      return correctOption.option_text || correctOption.letter || '';
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


const calculateBandScore = (percentage) => {
  // IELTS Reading/Listening scoring table (approximate)
  if (percentage >= 95) return 9.0;
  if (percentage >= 88) return 8.5;
  if (percentage >= 82) return 8.0;
  if (percentage >= 75) return 7.5;
  if (percentage >= 68) return 7.0;
  if (percentage >= 60) return 6.5;
  if (percentage >= 52) return 6.0;
  if (percentage >= 43) return 5.5;
  if (percentage >= 35) return 5.0;
  if (percentage >= 26) return 4.5;
  if (percentage >= 18) return 4.0;
  if (percentage >= 12) return 3.5;
  if (percentage >= 7) return 3.0;
  if (percentage >= 3) return 2.5;
  if (percentage >= 1) return 2.0;
  return 1.5;
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

