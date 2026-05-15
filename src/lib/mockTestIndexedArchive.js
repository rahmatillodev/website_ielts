/**
 * IndexedDB archive for mock test sessions (office browser).
 * Parallel to Supabase; failures here must not break submit flows.
 */

const DB_NAME = 'mock_test_archive';
const DB_VERSION = 1;
const STORE_RUNS = 'runs';

/** Keys never stored in the local archive (staff sees user answers only, not official keys). */
const FORBIDDEN_ANSWER_KEYS = new Set([
  'correct_answer',
  'correctAnswer',
  'correct_answers',
  'correctAnswers',
  'correct_asnwer',
  'correctAsnwer',
  'is_correct',
  'isCorrect',
  'explanation',
  'sample_answer',
  'sampleAnswer',
  'answer_key',
  'answerKey',
  'solution',
  'solutions',
  'marking_scheme',
  'official_answer',
]);

/** @param {string} k */
function isForbiddenAnswerKey(k) {
  if (typeof k !== 'string') return false;
  if (FORBIDDEN_ANSWER_KEYS.has(k)) return true;
  const kl = k.toLowerCase();
  const compact = kl.replace(/_/g, '');
  if (compact === 'correctanswer' || compact === 'correctanswers' || compact === 'correctasnwer') return true;
  if (kl.startsWith('correct_')) return true;
  return false;
}

function stripHtmlInstruction(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Recursively strip correct-key / solution fields from answer blobs (IndexedDB write + display).
 * @param {unknown} input
 * @returns {unknown}
 */
export function sanitizeAnswersForArchive(input) {
  if (input == null) return input;
  const t = typeof input;
  if (t !== 'object') return input;
  if (Array.isArray(input)) return input.map(sanitizeAnswersForArchive);
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    if (isForbiddenAnswerKey(k)) continue;
    const kl = k.toLowerCase();
    if (kl.endsWith('_correct')) continue;
    out[k] = sanitizeAnswersForArchive(v);
  }
  return out;
}

/**
 * Only non-scoring submit metadata (no correct counts or scores in archive).
 * @param {object|null|undefined} meta
 * @returns {object|null}
 */
export function sanitizeSubmitMetaForArchive(meta) {
  if (!meta || typeof meta !== 'object') return null;
  const safe = {};
  if (meta.attemptId != null) safe.attemptId = meta.attemptId;
  if (meta.success !== undefined) safe.success = meta.success;
  if (typeof meta.error === 'string' && meta.error.trim()) safe.error = meta.error.trim();
  return Object.keys(safe).length ? safe : null;
}

/**
 * @param {object} row
 */
export function sanitizeQuestionsIndexRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (isForbiddenAnswerKey(k)) continue;
    const kl = k.toLowerCase();
    if (kl.startsWith('correct_')) continue;
    const compact = kl.replace(/_/g, '');
    if (compact === 'correctanswer' || compact === 'correctanswers' || compact === 'correctasnwer') continue;
    if (kl === 'is_correct' || kl === 'iscorrect') continue;
    if (kl === 'explanation' || kl === 'sample_answer' || kl === 'sampleanswer') continue;
    out[k] = v;
  }
  return out;
}

/**
 * Duplicate each answer under every known key (UUID, question number, group question_id) so archive rows always resolve.
 * Reading stores answers under mixed keys (TFNG uses numbers, gap-fill uses UUIDs, etc.).
 * @param {Record<string, unknown>} answers
 * @param {Array<object>} questionsIndex
 */
export function normalizeReadingAnswersForArchive(answers, questionsIndex) {
  if (!answers || typeof answers !== 'object') return sanitizeAnswersForArchive({});
  const out = { ...answers };
  const rows = Array.isArray(questionsIndex) ? questionsIndex : [];
  for (const row of rows) {
    const candidates = [];
    if (row.questionId != null && row.questionId !== '') candidates.push(String(row.questionId));
    if (row.groupQuestionId != null && row.groupQuestionId !== '') candidates.push(String(row.groupQuestionId));
    if (row.questionNumber != null) {
      candidates.push(row.questionNumber, String(row.questionNumber));
    }
    const uniq = [...new Set(candidates)];
    let found = undefined;
    for (const k of uniq) {
      const v = out[k];
      if (v != null && String(v).trim() !== '') {
        found = v;
        break;
      }
    }
    if (found === undefined) continue;
    for (const k of uniq) {
      out[k] = found;
    }
  }
  return sanitizeAnswersForArchive(out);
}

/**
 * Full run document safe for UI (legacy IndexedDB rows included).
 * @param {object|null} run
 */
export function sanitizeRunForDisplay(run) {
  if (!run || typeof run !== 'object') return run;
  const keys = ['listening', 'reading', 'writing'];
  const sections = { ...run.sections };
  keys.forEach((k) => {
    const sec = run.sections?.[k];
    if (!sec) return;
    sections[k] = {
      ...sec,
      answers: sanitizeAnswersForArchive(sec.answers || {}),
      questionsIndex: Array.isArray(sec.questionsIndex)
        ? sec.questionsIndex.map(sanitizeQuestionsIndexRow)
        : [],
      submitMeta: sec.submitMeta != null ? sanitizeSubmitMetaForArchive(sec.submitMeta) : null,
    };
  });
  return { ...run, sections };
}

/** @typedef {'listening'|'reading'|'writing'} MockSection */

let dbPromise = null;

const openDb = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error || new Error('indexedDB open failed'));
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains(STORE_RUNS)) {
        db.createObjectStore(STORE_RUNS, { keyPath: 'runId' });
      }
    };
    req.onsuccess = () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
          navigator.storage.persist().catch(() => {});
        }
      } catch (_) {
        /* ignore */
      }
      resolve(req.result);
    };
  });
  return dbPromise;
};

/**
 * Flatten questions from currentTest for "Show" UI (snapshot text at save time).
 * @param {object|null} currentTest
 * @param {'listening'|'reading'} testType
 * @returns {Array<{ questionId: string|null, questionNumber: number|null, questionText: string, partNumber: number|null, groupType: string|null, groupId: string|null }>}
 */
export const buildQuestionsIndexFromTest = (currentTest, testType) => {
  if (!currentTest?.parts || !Array.isArray(currentTest.parts)) return [];
  const out = [];
  currentTest.parts.forEach((part) => {
    const partNumber = part.part_number ?? part.id ?? null;
    const groups = part.questionGroups || [];
    groups.forEach((qg) => {
      const groupType = (qg.type || '').toString();
      const gtLower = groupType.toLowerCase();
      const groupId = qg.id || null;
      const instructionPlain = stripHtmlInstruction((qg.instruction || '').toString()).slice(0, 700);
      const questions = qg.questions || [];
      questions.forEach((q) => {
        const baseText = (q.question_text || q.text || '').toString().trim();
        if (!q.question_number && !q.id) return;

        let questionText = baseText.slice(0, 2000);
        const needsContext =
          instructionPlain &&
          (gtLower.includes('fill') ||
            gtLower.includes('table') ||
            gtLower.includes('matching') ||
            gtLower.includes('multiple_answer') ||
            baseText.length < 140);
        if (needsContext) {
          questionText =
            baseText.length > 0
              ? `${instructionPlain}\n\n(${baseText})`.slice(0, 2000)
              : instructionPlain.slice(0, 2000);
        }

        const groupQId = q.question_id != null ? String(q.question_id) : null;

        out.push({
          questionId: q.id != null ? String(q.id) : null,
          questionNumber: q.question_number != null ? q.question_number : null,
          groupQuestionId: groupQId,
          questionText,
          partNumber,
          groupType,
          groupId: groupId != null ? String(groupId) : null,
        });
      });
    });
  });
  return out.map(sanitizeQuestionsIndexRow);
};

/**
 * Writing tasks snapshot (no parts/questionGroups on writing entity).
 * @param {object|null} currentWriting
 * @param {Record<string, string>} answers
 */
export const buildWritingQuestionsIndex = (currentWriting, answers) => {
  if (!currentWriting) return [];
  const tasks = currentWriting.tasks || currentWriting.writing_tasks || [];
  const rows = [];
  tasks.forEach((t) => {
    const name = t.task_name || t.name || 'task';
    const label = t.title || t.instruction || name;
    rows.push({
      questionId: null,
      questionNumber: null,
      questionText: `${name}: ${(label || '').toString().slice(0, 500)}`,
      partNumber: null,
      groupType: 'writing_task',
      groupId: null,
      taskName: name,
      userAnswerPreview: (answers?.[name] || '').toString().slice(0, 500),
    });
  });
  return rows.map(sanitizeQuestionsIndexRow);
};

const defaultRunShape = (runId) => ({
  runId,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  status: 'in_progress',
  user: { id: null, email: null, username: null },
  mockTest: { id: null, title: null },
  sections: {
    listening: { testId: null, title: null, type: 'listening', answers: {}, questionsIndex: [], submitMeta: null },
    reading: { testId: null, title: null, type: 'reading', answers: {}, questionsIndex: [], submitMeta: null },
    writing: { testId: null, title: null, type: 'writing', answers: {}, questionsIndex: [], submitMeta: null },
  },
});

const mergeSectionsDeep = (baseSections, patchSections) => {
  const keys = ['listening', 'reading', 'writing'];
  const out = {};
  keys.forEach((k) => {
    const b = baseSections?.[k] || {};
    const p = patchSections?.[k] || {};
    const mergedAnswers = sanitizeAnswersForArchive({
      ...(b.answers || {}),
      ...(p.answers || {}),
    });
    const qi = Array.isArray(p.questionsIndex)
      ? p.questionsIndex.map(sanitizeQuestionsIndexRow)
      : Array.isArray(b.questionsIndex)
        ? b.questionsIndex.map(sanitizeQuestionsIndexRow)
        : [];
    out[k] = {
      ...b,
      ...p,
      answers: mergedAnswers,
      questionsIndex: qi,
    };
  });
  return out;
};

/**
 * Ensure a run document exists, then merge top-level fields.
 * @param {string} runId
 * @param {object} patch partial run fields (user, mockTest, status, etc.)
 */
export async function putRunPartial(runId, patch) {
  if (!runId) return;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_RUNS, 'readwrite');
    const store = tx.objectStore(STORE_RUNS);
    const existing = await new Promise((res, rej) => {
      const g = store.get(runId);
      g.onsuccess = () => res(g.result);
      g.onerror = () => rej(g.error);
    });
    const base = existing && typeof existing === 'object' ? existing : defaultRunShape(runId);
    const mergedSections = mergeSectionsDeep(base.sections, patch.sections);
    const merged = {
      ...base,
      ...patch,
      runId,
      updatedAt: Date.now(),
      sections: mergedSections,
    };
    await new Promise((res, rej) => {
      const p = store.put(merged);
      p.onsuccess = () => res();
      p.onerror = () => rej(p.error);
    });
  } catch (e) {
    console.error('[mockTestIndexedArchive] putRunPartial failed:', e);
  }
}

/**
 * Merge one section (answers, questionsIndex, test meta).
 * @param {string} runId
 * @param {MockSection} section
 * @param {object} data
 * @param {Record<string, unknown>} [data.answers]
 * @param {Array} [data.questionsIndex]
 * @param {string|null} [data.testId]
 * @param {string|null} [data.title]
 * @param {object|null} [data.submitMeta] attemptId, score, etc.
 */
export async function mergeSection(runId, section, data) {
  if (!runId || !section || !['listening', 'reading', 'writing'].includes(section)) return;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_RUNS, 'readwrite');
    const store = tx.objectStore(STORE_RUNS);
    const existing = await new Promise((res, rej) => {
      const g = store.get(runId);
      g.onsuccess = () => res(g.result);
      g.onerror = () => rej(g.error);
    });
    const base = existing && typeof existing === 'object' ? existing : defaultRunShape(runId);
    const prevSec = base.sections?.[section] || defaultRunShape(runId).sections[section];
    const rawAnswers = {
      ...prevSec.answers,
      ...(data.answers != null ? data.answers : {}),
    };
    const mergedAnswers =
      section === 'reading' &&
      data.questionsIndex != null &&
      Array.isArray(data.questionsIndex) &&
      data.questionsIndex.length > 0
        ? normalizeReadingAnswersForArchive(rawAnswers, data.questionsIndex)
        : sanitizeAnswersForArchive(rawAnswers);
    const nextSec = {
      ...prevSec,
      ...(data.testId != null ? { testId: data.testId } : {}),
      ...(data.title != null ? { title: data.title } : {}),
      answers: mergedAnswers,
      ...(data.questionsIndex != null && Array.isArray(data.questionsIndex)
        ? { questionsIndex: data.questionsIndex.map(sanitizeQuestionsIndexRow) }
        : {}),
      ...(data.submitMeta != null
        ? { submitMeta: sanitizeSubmitMetaForArchive(data.submitMeta) }
        : {}),
    };
    const merged = {
      ...base,
      runId,
      updatedAt: Date.now(),
      sections: {
        ...base.sections,
        [section]: nextSec,
      },
    };
    await new Promise((res, rej) => {
      const p = store.put(merged);
      p.onsuccess = () => res();
      p.onerror = () => rej(p.error);
    });
  } catch (e) {
    console.error('[mockTestIndexedArchive] mergeSection failed:', e);
  }
}

/**
 * @param {string} runId
 * @returns {Promise<object|null>}
 */
export async function getRun(runId) {
  if (!runId) return null;
  try {
    const db = await openDb();
    return await new Promise((res, rej) => {
      const tx = db.transaction(STORE_RUNS, 'readonly');
      const g = tx.objectStore(STORE_RUNS).get(runId);
      g.onsuccess = () => res(g.result || null);
      g.onerror = () => rej(g.error);
    });
  } catch (e) {
    console.error('[mockTestIndexedArchive] getRun failed:', e);
    return null;
  }
}

/**
 * All mock session runs on this browser (newest first).
 * @returns {Promise<object[]>}
 */
export async function listAllRuns() {
  try {
    const db = await openDb();
    const rows = await new Promise((res, rej) => {
      const tx = db.transaction(STORE_RUNS, 'readonly');
      const req = tx.objectStore(STORE_RUNS).getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
    return rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (e) {
    console.error('[mockTestIndexedArchive] listAllRuns failed:', e);
    return [];
  }
}

/**
 * Remove all mock session runs from IndexedDB on this browser.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function clearAllArchiveRuns() {
  try {
    const db = await openDb();
    await new Promise((res, rej) => {
      const tx = db.transaction(STORE_RUNS, 'readwrite');
      const req = tx.objectStore(STORE_RUNS).clear();
      req.onsuccess = () => res();
      req.onerror = () => rej(req.error);
    });
    return { success: true };
  } catch (e) {
    console.error('[mockTestIndexedArchive] clearAllArchiveRuns failed:', e);
    return { success: false, error: e?.message || 'Failed to clear archive' };
  }
}

export async function markRunCompleted(runId) {
  await putRunPartial(runId, { status: 'completed', updatedAt: Date.now() });
}

/**
 * Debounced IndexedDB merge with explicit flush (tab hide / unload / unmount).
 * @param {number} [delayMs]
 * @returns {{ schedule: (runId: string, section: MockSection, data: object) => void, flush: () => Promise<void> }}
 */
export function createDebouncedMerge(delayMs = 800) {
  const timers = new Map();
  /** @type {Map<string, { runId: string, section: MockSection, data: object }>} */
  const pending = new Map();

  const schedule = (runId, section, data) => {
    const key = `${runId}:${section}`;
    pending.set(key, { runId, section, data });
    const prev = timers.get(key);
    if (prev) clearTimeout(prev);
    const t = setTimeout(() => {
      timers.delete(key);
      const payload = pending.get(key);
      pending.delete(key);
      if (payload) {
        mergeSection(payload.runId, payload.section, payload.data).catch(() => {});
      }
    }, delayMs);
    timers.set(key, t);
  };

  const flush = async () => {
    const keys = [...new Set([...timers.keys(), ...pending.keys()])];
    for (const key of keys) {
      const prev = timers.get(key);
      if (prev) {
        clearTimeout(prev);
        timers.delete(key);
      }
    }
    const payloads = keys.map((k) => pending.get(k)).filter(Boolean);
    for (const key of keys) {
      pending.delete(key);
    }
    for (const payload of payloads) {
      await mergeSection(payload.runId, payload.section, payload.data).catch(() => {});
    }
  };

  return { schedule, flush };
}
