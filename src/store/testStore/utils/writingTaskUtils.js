import { isCefrTest } from "@/lib/testScoring";

export const CEFR_TASK_NAMES = ["Task 1.1", "Task 1.2", "Task 2"];
export const IELTS_TASK_NAMES = ["Task 1", "Task 2"];

const CEFR_MIN_WORDS = {
  "Task 1.1": 50,
  "Task 1.2": 80,
  "Task 2": 180,
};

const IELTS_MIN_WORDS = {
  "Task 1": 150,
  "Task 2": 250,
};

/**
 * @param {Array<{ task_name?: string }>} tasks
 * @param {boolean} isCefr
 */
export function sortWritingTasks(tasks, isCefr) {
  if (!Array.isArray(tasks)) return [];
  const copy = [...tasks];
  if (isCefr) {
    return copy.sort((a, b) => {
      const idxA = CEFR_TASK_NAMES.indexOf(a?.task_name || "");
      const idxB = CEFR_TASK_NAMES.indexOf(b?.task_name || "");
      const orderA = idxA === -1 ? 999 : idxA;
      const orderB = idxB === -1 ? 999 : idxB;
      if (orderA !== orderB) return orderA - orderB;
      return (a?.task_name || "").localeCompare(b?.task_name || "");
    });
  }
  return copy.sort((a, b) => {
    const nameA = (a?.task_name || "").toLowerCase();
    const nameB = (b?.task_name || "").toLowerCase();
    if (nameA === "task 1" && nameB === "task 2") return -1;
    if (nameA === "task 2" && nameB === "task 1") return 1;
    return (a?.task_name || "").localeCompare(b?.task_name || "");
  });
}

/**
 * @param {Array<{ task_name?: string }>} tasks
 * @param {boolean} isCefr
 */
export function getDefaultTaskName(tasks, isCefr) {
  const sorted = sortWritingTasks(tasks, isCefr);
  return sorted[0]?.task_name ?? null;
}

/**
 * @param {string} taskName
 * @param {boolean} isCefr
 */
export function getMinWordCount(taskName, isCefr) {
  const map = isCefr ? CEFR_MIN_WORDS : IELTS_MIN_WORDS;
  if (map[taskName] != null) return map[taskName];
  return isCefr ? 50 : 150;
}

/**
 * @param {object|null|undefined} writing
 * @param {string[]} taskNames
 * @param {boolean} [isCefr]
 */
export function deriveWritingTaskLabel(writing, taskNames, isCefr = isCefrTest(writing)) {
  const names = (taskNames || []).filter(Boolean);
  if (names.length === 0) return null;

  if (isCefr) {
    const hasAll = CEFR_TASK_NAMES.every((n) => names.includes(n));
    if (hasAll) return "All";
    if (names.length === 1) return names[0];
    return names
      .slice()
      .sort((a, b) => CEFR_TASK_NAMES.indexOf(a) - CEFR_TASK_NAMES.indexOf(b))
      .join(" · ");
  }

  const hasTask1 = names.includes("Task 1");
  const hasTask2 = names.includes("Task 2");
  if (hasTask1 && hasTask2) return "Both";
  if (hasTask1) return "Task 1";
  if (hasTask2) return "Task 2";
  return names[0] ?? null;
}

export const CEFR_WRITING_TASK_LABELS = ["All", ...CEFR_TASK_NAMES];
export const IELTS_WRITING_TASK_LABELS = ["Task 1", "Task 2", "Both"];
