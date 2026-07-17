/**
 * Server-authoritative answer persistence for mock tests.
 *
 * Ilgari javoblar butun bo'lim davomida faqat localStorage'da turardi va Supabase'ga bir marta,
 * eng oxirida yozilardi. Shuning uchun sessiya uzilishi draftlarni o'chirib yuborardi, quota
 * xatosi jimgina saqlashni to'xtatardi, umumiy brauzerda esa boshqa foydalanuvchining drafti
 * tiklanardi.
 *
 * Yangi model:
 *   1. Bo'lim boshlanganda `user_attempts` qatori yaratiladi (completed_at = null).
 *   2. Har bir javob berilganda Supabase'ga upsert qilinadi (debounced).
 *   3. Reload'dan keyin javoblar SUPABASE'dan tiklanadi - diskdan emas.
 *   4. Bo'lim oxirida ball hisoblanib, attempt yakunlanadi.
 *
 * Diskdagi bufer (`PENDING_KEY`) faqat MUVAFFAQIYATSIZ yozuvlarni qayta urinish uchun navbat
 * sifatida ishlatiladi. U hech qachon javob manbai sifatida o'qilmaydi: server tasdiqlagach
 * darhol tozalanadi. Ya'ni localStorage endi ma'lumot ombori emas, faqat retry navbati.
 */

import supabase from '@/lib/supabase';

const PENDING_KEY = 'answer_sync_pending_v1';
const DEBOUNCE_MS = 1200;
const MAX_RETRY_DELAY_MS = 15000;

/* ------------------------------------------------------------------ */
/* retry queue (disk) — never read back as answers, only replayed      */
/* ------------------------------------------------------------------ */

const readPending = () => {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writePending = (rows) => {
  try {
    if (!rows.length) localStorage.removeItem(PENDING_KEY);
    else localStorage.setItem(PENDING_KEY, JSON.stringify(rows));
  } catch {
    // Quota yoki private mode - navbatni diskda saqlay olmadik. Yozuv baribir
    // xotiradagi navbatda qoladi va flush() da qayta urinamiz.
  }
};

const queueKey = (row) => `${row.attempt_id}::${row.question_id}`;

/** Bir xil savol uchun faqat eng oxirgi javob qoladi. */
const mergeIntoPending = (rows) => {
  const byKey = new Map();
  for (const row of [...readPending(), ...rows]) byKey.set(queueKey(row), row);
  const merged = [...byKey.values()];
  writePending(merged);
  return merged;
};

const removeFromPending = (rows) => {
  const done = new Set(rows.map(queueKey));
  writePending(readPending().filter((r) => !done.has(queueKey(r))));
};

/* ------------------------------------------------------------------ */
/* status listeners (UI banner)                                        */
/* ------------------------------------------------------------------ */

const listeners = new Set();
let status = { state: 'idle', pending: 0, lastError: null };

const setStatus = (next) => {
  status = { ...status, ...next, pending: readPending().length };
  listeners.forEach((fn) => {
    try {
      fn(status);
    } catch {
      // listener xatosi sinxronizatsiyani to'xtatmasligi kerak
    }
  });
};

export const getSyncStatus = () => status;

export const subscribeSyncStatus = (fn) => {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
};

/* ------------------------------------------------------------------ */
/* attempt lifecycle                                                   */
/* ------------------------------------------------------------------ */

/**
 * Bo'lim boshlanishida ochiq attempt topadi yoki yaratadi.
 * Ochiq attempt = completed_at IS NULL. Reload'da o'sha attempt qayta ishlatiladi,
 * shuning uchun dublikat urinish yaratilmaydi.
 */
export const startAttempt = async ({ userId, testId, type, mockTestId = null }) => {
  if (!userId) throw new Error('User not authenticated');
  if (!testId) throw new Error('Test ID is required');

  let query = supabase
    .from('user_attempts')
    .select('id')
    .eq('user_id', userId)
    .eq('test_id', testId)
    .is('completed_at', null)
    .order('created_at', { ascending: false })
    .limit(1);

  query = mockTestId ? query.eq('mock_id', mockTestId) : query.is('mock_id', null);

  const { data: open, error: findError } = await query;
  if (findError) throw findError;
  if (open && open.length > 0) return open[0].id;

  const payload = {
    user_id: userId,
    test_id: testId,
    type,
    total_questions: 0,
    correct_answers: '0',
    time_taken: 1,
    // MUHIM: `completed_at` ustunida DEFAULT now() bor. Agar uni aniq null qilib
    // yozmasak, urinish yaratilgan zahoti "tugagan" bo'lib qoladi va reload'da
    // ochiq urinish sifatida topilmaydi (ya'ni har reload yangi urinish yaratardi).
    completed_at: null,
  };
  if (mockTestId) payload.mock_id = mockTestId;

  const { data, error } = await supabase
    .from('user_attempts')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
};

/** Reload'dan keyin javoblarni SUPABASE'dan tiklaydi (disk emas). */
export const loadAnswers = async (attemptId) => {
  if (!attemptId) return {};
  const { data, error } = await supabase
    .from('user_answers')
    .select('question_id, user_answer')
    .eq('attempt_id', attemptId);

  if (error) throw error;

  const answers = {};
  for (const row of data || []) answers[row.question_id] = row.user_answer ?? '';
  return answers;
};

/* ------------------------------------------------------------------ */
/* answer writes                                                       */
/* ------------------------------------------------------------------ */

const flushRows = async (rows) => {
  if (!rows.length) return true;
  const { error } = await supabase
    .from('user_answers')
    .upsert(rows, { onConflict: 'attempt_id,question_id' });

  if (error) throw error;
  removeFromPending(rows);
  return true;
};

let flushTimer = null;
let flushing = false;
let retryDelay = 1000;

/** Navbatdagi hamma yozuvni serverga yuborishga urinadi. */
export const flush = async () => {
  if (flushing) return false;
  const rows = readPending();
  if (!rows.length) {
    setStatus({ state: 'idle', lastError: null });
    return true;
  }

  flushing = true;
  setStatus({ state: 'saving' });
  try {
    await flushRows(rows);
    retryDelay = 1000;
    setStatus({ state: 'idle', lastError: null });
    return true;
  } catch (err) {
    // Yozuv serverga yetmadi - navbatda qoladi va qayta urinamiz.
    setStatus({ state: 'error', lastError: err.message || 'Failed to save answers' });
    retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushing = false;
      flush();
    }, retryDelay);
    return false;
  } finally {
    if (!flushTimer) flushing = false;
    else flushing = false;
  }
};

/**
 * Bitta javobni saqlaydi. Debounce qilinadi, lekin navbatga DARHOL qo'yiladi -
 * ya'ni debounce oynasida sahifa yopilsa ham yozuv yo'qolmaydi.
 */
export const saveAnswer = ({ attemptId, questionId, answer, questionType, questionNumber }) => {
  if (!attemptId || !questionId) return;

  mergeIntoPending([
    {
      attempt_id: attemptId,
      question_id: String(questionId),
      user_answer: answer == null ? '' : String(answer),
      question_type: questionType || 'multiple_choice',
      question_number: questionNumber ?? null,
    },
  ]);
  setStatus({ state: 'saving' });

  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, DEBOUNCE_MS);
};

/** Bo'limni yakunlashdan oldin: hamma navbatdagi javob serverda ekaniga ishonch hosil qilamiz. */
export const flushNow = async () => {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  flushing = false;
  const rows = readPending();
  if (!rows.length) return true;
  try {
    await flushRows(rows);
    setStatus({ state: 'idle', lastError: null });
    return true;
  } catch (err) {
    setStatus({ state: 'error', lastError: err.message || 'Failed to save answers' });
    return false;
  }
};

export const hasPendingWrites = () => readPending().length > 0;

/* ------------------------------------------------------------------ */
/* finalize                                                            */
/* ------------------------------------------------------------------ */

/**
 * Bo'lim oxirida attemptni yakunlaydi. Avval hamma javob serverga yuboriladi;
 * yuborilmasa - yakunlamaymiz va xatoni qaytaramiz (jim muvaffaqiyat bo'lmasin).
 */
export const finalizeAttempt = async (attemptId, { score, correctCount, totalQuestions, timeTaken }) => {
  const flushed = await flushNow();
  if (!flushed) {
    return { success: false, error: 'Some answers could not be saved. Check your connection.' };
  }

  const { error } = await supabase
    .from('user_attempts')
    .update({
      score,
      correct_answers: String(correctCount),
      total_questions: totalQuestions,
      time_taken: Math.max(1, Math.floor(timeTaken || 1)),
      completed_at: new Date().toISOString(),
    })
    .eq('id', attemptId);

  if (error) return { success: false, error: error.message };
  return { success: true };
};

/** Tarmoq qaytganda navbatni avtomatik yuboramiz. */
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flush();
  });
}
