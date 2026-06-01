/**
 * Shared mock test attempt fields (history + results pages).
 */
export const MOCK_ATTEMPT_SELECT = `
  id,
  test_id,
  writing_id,
  score,
  feedback,
  correct_answers,
  total_questions,
  time_taken,
  completed_at,
  mock_id,
  type
`;

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

export function resolveAttemptType(attempt, testTypeMap = {}) {
  return attempt.type || (attempt.test_id ? testTypeMap[attempt.test_id] : null);
}

/**
 * Merges admin-style speaking row (by speaking_id) into mock_id-linked attempts.
 */
export function mergeAttemptsForClient(attempts, speakingAttempt) {
  const list = [...(attempts || [])];
  if (!speakingAttempt) {
    return list;
  }
  if (list.some((a) => a.id === speakingAttempt.id)) {
    return list;
  }
  return [...list, speakingAttempt];
}

/**
 * Latest speaking attempt per test_id (rows should be ordered completed_at desc).
 */
export function buildSpeakingAttemptsByTestId(rows) {
  const map = {};
  (rows || []).forEach((row) => {
    if (!row.test_id || map[row.test_id]) {
      return;
    }
    map[row.test_id] = row;
  });
  return map;
}

/**
 * Admin lookup #1: test_id = speaking_id, user_id, writing_id IS NULL.
 */
export async function fetchSpeakingAttemptsByTestIds(supabase, userId, speakingIds) {
  if (!userId || !speakingIds?.length) {
    return [];
  }

  const { data, error } = await supabase
    .from('user_attempts')
    .select(MOCK_ATTEMPT_SELECT)
    .eq('user_id', userId)
    .in('test_id', speakingIds)
    .is('writing_id', null)
    .order('completed_at', { ascending: false });

  if (error) {
    console.warn('Error fetching speaking attempts by test id:', error);
    return [];
  }

  return data || [];
}

/**
 * Admin lookup #2: latest speaking attempt for user + mock_test.id.
 */
export async function fetchSpeakingAttemptByMockId(supabase, userId, mockTestId) {
  if (!userId || !mockTestId) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_attempts')
    .select(MOCK_ATTEMPT_SELECT)
    .eq('user_id', userId)
    .eq('mock_id', mockTestId)
    .eq('type', 'speaking')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('Error fetching speaking attempt by mock_id:', error);
    return null;
  }

  return data;
}

/**
 * Resolves speaking attempt using the same order as admin getClientById.
 */
export async function resolveSpeakingAttemptForClient(
  supabase,
  userId,
  { speakingId, mockTestId },
  speakingByTestId = {},
  existingAttempts = [],
) {
  const fromMockAttempts = (existingAttempts || []).find(
    (a) => resolveAttemptType(a) === 'speaking',
  );
  if (fromMockAttempts) {
    return fromMockAttempts;
  }

  if (speakingId && speakingByTestId[speakingId]) {
    return speakingByTestId[speakingId];
  }

  if (speakingId) {
    const { data, error } = await supabase
      .from('user_attempts')
      .select(MOCK_ATTEMPT_SELECT)
      .eq('user_id', userId)
      .eq('test_id', speakingId)
      .is('writing_id', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  }

  return fetchSpeakingAttemptByMockId(supabase, userId, mockTestId);
}

export async function buildTestTypeMap(supabase, attempts) {
  const testIds = [
    ...new Set((attempts || []).filter((a) => a.test_id).map((a) => a.test_id)),
  ];
  const testTypeMap = {};

  if (testIds.length === 0) {
    return testTypeMap;
  }

  const { data: testsData, error } = await supabase
    .from('test')
    .select('id, type')
    .in('id', testIds);

  if (error) {
    console.warn('Error fetching test types for mock results:', error);
    return testTypeMap;
  }

  testsData?.forEach((t) => {
    testTypeMap[t.id] = t.type;
  });

  return testTypeMap;
}

/**
 * Loads and organizes all section results for one mock_test_clients row.
 */
export async function loadMockTestSectionResults(supabase, userId, client) {
  const empty = {
    listening: null,
    reading: null,
    writing: null,
    speaking: null,
  };

  if (!userId || !client?.mock_test_id) {
    return empty;
  }

  const { data: mockAttempts, error: attemptsError } = await supabase
    .from('user_attempts')
    .select(MOCK_ATTEMPT_SELECT)
    .eq('user_id', userId)
    .eq('mock_id', client.mock_test_id)
    .order('completed_at', { ascending: false });

  if (attemptsError) {
    throw attemptsError;
  }

  const speakingAttempt = await resolveSpeakingAttemptForClient(
    supabase,
    userId,
    {
      speakingId: client.speaking_id,
      mockTestId: client.mock_test_id,
    },
    {},
    mockAttempts,
  );

  const attempts = mergeAttemptsForClient(mockAttempts, speakingAttempt);
  const testTypeMap = await buildTestTypeMap(supabase, attempts);

  const { data: mockTest, error: mockTestError } = await supabase
    .from('mock_test')
    .select('id, listening_id, reading_id, writing_id')
    .eq('id', client.mock_test_id)
    .maybeSingle();

  if (mockTestError) {
    console.warn('Error fetching mock_test for section results:', mockTestError);
  }

  return organizeMockTestSectionResults(attempts, mockTest, testTypeMap);
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

  if (!attempts?.length) {
    return results;
  }

  if (!mockTest) {
    for (const attempt of attempts) {
      const attemptType = resolveAttemptType(attempt, testTypeMap);
      if (attemptType === 'listening' && !results.listening) {
        results.listening = attempt;
      } else if (attemptType === 'reading' && !results.reading) {
        results.reading = attempt;
      } else if (attemptType === 'writing' && !results.writing) {
        results.writing = attempt;
      } else if (attemptType === 'speaking' && !results.speaking) {
        results.speaking = attempt;
      }
    }
    return results;
  }

  for (const attempt of attempts) {
    const attemptType = resolveAttemptType(attempt, testTypeMap);

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
