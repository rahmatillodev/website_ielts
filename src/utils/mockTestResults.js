/**
 * Formats IELTS band scores from DB (often numeric strings).
 */
export function formatBandScore(score) {
  if (score === null || score === undefined || score === '') {
    return 'N/A';
  }
  const n = Number(score);
  return Number.isFinite(n) ? n.toFixed(1) : 'N/A';
}

/**
 * Maps user_attempts rows to section results for one mock test.
 * Section type is resolved before test_id matching so speaking rows are not dropped.
 */
export function organizeMockTestSectionResults(attempts, mockTest, testTypeMap = {}) {
  const results = {
    listening: null,
    reading: null,
    writing: null,
    speaking: null,
  };

  if (!attempts?.length || !mockTest) {
    return results;
  }

  const resolveType = (attempt) =>
    attempt.type || (attempt.test_id ? testTypeMap[attempt.test_id] : null);

  for (const attempt of attempts) {
    const attemptType = resolveType(attempt);

    if (attemptType === 'speaking' && !results.speaking) {
      results.speaking = attempt;
      continue;
    }

    if (attemptType === 'writing' && !results.writing) {
      results.writing = attempt;
      continue;
    }

    if (
      attempt.writing_id &&
      mockTest.writing_id &&
      String(attempt.writing_id) === String(mockTest.writing_id) &&
      !results.writing
    ) {
      results.writing = attempt;
      continue;
    }

    if (attempt.writing_id && !attempt.test_id && !results.writing) {
      results.writing = attempt;
      continue;
    }

    if (!attempt.test_id) {
      continue;
    }

    const testId = String(attempt.test_id);

    if (
      mockTest.listening_id &&
      testId === String(mockTest.listening_id) &&
      !results.listening
    ) {
      results.listening = attempt;
    } else if (
      mockTest.reading_id &&
      testId === String(mockTest.reading_id) &&
      !results.reading
    ) {
      results.reading = attempt;
    } else if (attemptType === 'listening' && !results.listening) {
      results.listening = attempt;
    } else if (attemptType === 'reading' && !results.reading) {
      results.reading = attempt;
    } else if (attemptType === 'speaking' && !results.speaking) {
      results.speaking = attempt;
    }
  }

  return results;
}
