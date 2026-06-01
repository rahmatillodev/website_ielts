import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import QuestionHeader from "@/components/questions/QuestionHeader";
import { AppearanceProvider, useAppearance } from "@/contexts/AppearanceContext";
import { AnnotationProvider } from "@/contexts/AnnotationContext";
import { useWritingStore } from "@/store/testStore/writingStore";
import { getWritingTaskTypeDisplayName } from "@/store/testStore/utils/writingTaskTypeUtils";
import { useSmallScreen } from "@/hooks/useSmallScreen";

const stripHtml = (html) =>
  (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const splitWords = (text) => text.split(/\s+/).filter(Boolean);

const sortTasks = (tasks) =>
  [...(tasks || [])].sort((a, b) => {
    const nameA = (a?.task_name || "").toLowerCase();
    const nameB = (b?.task_name || "").toLowerCase();
    if (nameA.includes("task 1") && nameB.includes("task 2")) return -1;
    if (nameA.includes("task 2") && nameB.includes("task 1")) return 1;
    return nameA.localeCompare(nameB);
  });

const isTask1 = (t) =>
  (t?.task_name || "").toLowerCase().includes("task 1");
const isTask2 = (t) =>
  (t?.task_name || "").toLowerCase().includes("task 2");

const formatMmSs = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const parseScope = (raw) => {
  if (raw === "task1" || raw === "task2" || raw === "both") return raw;
  const n = parseInt(raw, 10);
  if (n === 30 || n === 50 || n === 100) return n;
  return null;
};

const buildWordsFromWriting = (writing, selectedMode) => {
  const sorted = sortTasks(writing?.writing_tasks);
  let words = [];
  let sessionTasks = [];
  let t1Count = 0;

  if (selectedMode === "task1") {
    const task = sorted.find(isTask1) || sorted[0];
    sessionTasks = task ? [task] : [];
    words = splitWords(stripHtml(task?.sample));
    t1Count = words.length;
  } else if (selectedMode === "task2") {
    const task = sorted.find(isTask2) || sorted[sorted.length - 1];
    sessionTasks = task ? [task] : [];
    words = splitWords(stripHtml(task?.sample));
    t1Count = 0;
  } else if (selectedMode === "both") {
    const t1 = sorted.find(isTask1);
    const t2 = sorted.find(isTask2);
    sessionTasks = [t1, t2].filter(Boolean);
    const w1 = splitWords(stripHtml(t1?.sample));
    const w2 = splitWords(stripHtml(t2?.sample));
    t1Count = w1.length;
    words = [...w1, ...w2];
  } else if (typeof selectedMode === "number") {
    const task = sorted[Math.floor(Math.random() * sorted.length)] || sorted[0];
    sessionTasks = task ? [task] : [];
    words = splitWords(stripHtml(task?.sample)).slice(0, selectedMode);
    t1Count = words.length;
  }

  return { words, sessionTasks, t1Count, };
};

const TypingPracticePageContent = () => {
  const { id: idFromParams } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { themeColors, theme } = useAppearance();
  const isSmallScreen = useSmallScreen();

  const {
    writings,
    currentWriting,
    fetchWritingById,
    fetchWritings,
    loadingWritings,
    loadingCurrentWriting,
    errorCurrentWriting,
  } = useWritingStore();

  const writingId = useMemo(() => {
    if (idFromParams && idFromParams !== "select") return idFromParams;
    const match = window.location.pathname.match(
      /\/typing-practice\/([^/?]+)/
    );
    return match?.[1] && match[1] !== "select" ? match[1] : null;
  }, [idFromParams]);

  const isLauncher = !writingId;

  const scopeFromUrl = parseScope(searchParams.get("scope"));

  const [phase, setPhase] = useState(() =>
    scopeFromUrl && writingId ? "session" : "config"
  );
  const [mode, setMode] = useState(scopeFromUrl);
  const [tasks, setTasks] = useState([]);
  const [wordList, setWordList] = useState([]);
  const [task1WordCount, setTask1WordCount] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState("");
  const [wordStates, setWordStates] = useState([]);
  const [typedWords, setTypedWords] = useState([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [correctWords, setCorrectWords] = useState(0);
  const [errorWords, setErrorWords] = useState(0);
  const [wpmHistory, setWpmHistory] = useState([]);
  const [mistakeMap, setMistakeMap] = useState(() => new Map());
  const [launcherLoading, setLauncherLoading] = useState(false);
  const [emptyContent, setEmptyContent] = useState(false);
  const [shakeWord, setShakeWord] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef(null);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const wordRefs = useRef([]);
  const timerRef = useRef(null);
  const sessionRef = useRef({
    currentWordIndex: 0,
    currentInput: "",
    wordList: [],
    started: false,
    correctWords: 0,
  });

  const accent = "#e2b714";
  const errorColor = "#ca4754";
  const pendingColor = themeColors.text ? `${themeColors.text}55` : "#d1d0c5";
  const caretColor = accent;

  const fontSizeClass = isSmallScreen ? "text-2xl" : "text-[2rem] md:text-4xl";

  useEffect(() => {
    sessionRef.current = {
      currentWordIndex,
      currentInput,
      wordList,
      started,
      correctWords,
    };
  }, [currentWordIndex, currentInput, wordList, started, correctWords]);

  useEffect(() => {
    if (!isLauncher && writingId) {
      fetchWritingById(writingId);
    }
  }, [isLauncher, writingId, fetchWritingById]);

  useEffect(() => {
    if (isLauncher) {
      fetchWritings();
    }
  }, [isLauncher, fetchWritings]);

  const writing = isLauncher ? null : currentWriting;

  const progressPercent =
    wordList.length > 0
      ? Math.round((currentWordIndex / wordList.length) * 100)
      : 0;

  const liveWpm =
    started && elapsedSeconds > 0
      ? Math.round((correctWords / elapsedSeconds) * 60)
      : 0;

  const totalSubmitted = correctWords + errorWords;

  const displayAccuracy =
    totalSubmitted === 0
      ? 100
      : Math.round((correctWords / totalSubmitted) * 1000) / 10;

  const displayTime = formatMmSs(started ? elapsedSeconds : 0);

  const applySessionWords = useCallback(
    (picked, selectedMode) => {
      const { words, sessionTasks, t1Count, } = buildWordsFromWriting(
        picked,
        selectedMode
      );
      if (!words.length) {
        setEmptyContent(true);
        return false;
      }
      setTasks(sessionTasks);
      setWordList(words);
      setWordStates(words.map(() => "pending"));
      setTypedWords(words.map(() => ""));
      setTask1WordCount(t1Count);
      setCurrentWordIndex(0);
      setCurrentInput("");
      setElapsedSeconds(0);
      setStarted(false);
      setCorrectWords(0);
      setErrorWords(0);
      setWpmHistory([]);
      setMistakeMap(new Map());
      setEmptyContent(false);
      wordRefs.current = [];
      return true;
    },
    []
  );

  const resetSessionStats = useCallback(() => {
    setCurrentWordIndex(0);
    setCurrentInput("");
    setWordStates(wordList.map(() => "pending"));
    setTypedWords(wordList.map(() => ""));
    setElapsedSeconds(0);
    setStarted(false);
    setCorrectWords(0);
    setErrorWords(0);
    setWpmHistory([]);
    setMistakeMap(new Map());
  }, [wordList]);

  const finishSession = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const cw = sessionRef.current.correctWords ?? 0;
    const elapsed = elapsedSeconds || 1;
    setWpmHistory((h) => {
      if (h.length === 0) {
        return [{ time: elapsed, wpm: Math.round((cw / elapsed) * 60) }];
      }
      return h;
    });
    setPhase("results");
  }, [elapsedSeconds]);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next > 0 && next % 10 === 0) {
          const cw = sessionRef.current.correctWords ?? 0;
          const wpm = Math.round((cw / next) * 60);
          setWpmHistory((h) => {
            if (h.some((p) => p.time === next)) return h;
            return [...h, { time: next, wpm }];
          });
        }
        return next;
      });
    }, 1000);
  }, []);

  const pickRandomWriting = useCallback(
    (selectedMode) => {
      // Library list only has taskLabel (no task sample) — filter by label, then
      // fetchWritingById on /typing-practice/:id loads full text for the session.
      const pool = (writings || []).filter((w) => {
        if (w.is_premium) return false;
        const label = w.taskLabel;
        if (selectedMode === "task1") {
          return label === "Task 1" || label === "Both";
        }
        if (selectedMode === "task2") {
          return label === "Task 2" || label === "Both";
        }
        if (selectedMode === "both") {
          return label === "Both";
        }
        if (typeof selectedMode === "number") {
          return Boolean(label);
        }
        return false;
      });
      if (pool.length === 0) return null;
      return pool[Math.floor(Math.random() * pool.length)];
    },
    [writings]
  );

  const beginSession = useCallback(
    (selectedMode) => {
      if (selectedMode == null) return false;

      if (isLauncher) {
        const picked = pickRandomWriting(selectedMode);
        if (!picked) {
          setEmptyContent(true);
          return false;
        }
        const next = new URLSearchParams(searchParams);
        next.set("scope", String(selectedMode));
        navigate(`/typing-practice/${picked.id}?${next.toString()}`, {
          replace: true,
        });
        return true;
      }

      if (!writing) return false;
      if (writing.is_premium) {
        setEmptyContent(true);
        return false;
      }
      const ok = applySessionWords(writing, selectedMode);
      if (ok) {
        setMode(selectedMode);
        setPhase("session");
        const next = new URLSearchParams(searchParams);
        next.set("scope", String(selectedMode));
        setSearchParams(next, { replace: true });
      }
      return ok;
    },
    [
      isLauncher,
      pickRandomWriting,
      searchParams,
      navigate,
      writing,
      applySessionWords,
      setSearchParams,
    ]
  );

  // After launcher navigates to /typing-practice/:id?scope=…, load words from full writing fetch.
  useEffect(() => {
    if (isLauncher || !writingId || !scopeFromUrl) return;
    if (loadingCurrentWriting || !writing) return;
    if (wordList.length > 0) return;

    if (writing.is_premium) {
      setEmptyContent(true);
      return;
    }

    const ok = applySessionWords(writing, scopeFromUrl);
    if (ok) {
      setMode(scopeFromUrl);
      setPhase("session");
      setEmptyContent(false);
    } else {
      setEmptyContent(true);
    }
  }, [
    isLauncher,
    writingId,
    scopeFromUrl,
    writing,
    loadingCurrentWriting,
    wordList.length,
    applySessionWords,
  ]);

  const handleStart = () => {
    if (mode == null) return;
    if (isLauncher && (!writings || writings.length === 0)) {
      setEmptyContent(true);
      return;
    }
    setEmptyContent(false);
    if (isLauncher) {
      setLauncherLoading(true);
      beginSession(mode);
      setLauncherLoading(false);
      return;
    }
    beginSession(mode);
  };

  const submitWord = useCallback(() => {
    const { currentInput: typed, currentWordIndex: idx, wordList: list } =
      sessionRef.current;
    const trimmed = typed.trimEnd();
    if (!trimmed || idx >= list.length) return;

    const expected = list[idx];
    const isCorrect = trimmed === expected;

    setTypedWords((prev) => {
      const next = [...prev];
      next[idx] = trimmed;
      return next;
    });

    setWordStates((prev) => {
      const next = [...prev];
      next[idx] = isCorrect ? "correct" : "incorrect";
      return next;
    });

    if (isCorrect) {
      setCorrectWords((c) => c + 1);
    } else {
      setErrorWords((e) => e + 1);
      setMistakeMap((prev) => {
        const next = new Map(prev);
        const existing = next.get(expected);
        next.set(expected, {
          typed: trimmed,
          count: existing ? existing.count + 1 : 1,
        });
        return next;
      });
      setShakeWord(true);
      setTimeout(() => setShakeWord(false), 300);
    }

    const nextIndex = idx + 1;
    setCurrentInput("");
    setCurrentWordIndex(nextIndex);

    if (nextIndex >= list.length) {
      finishSession();
    }
  }, [finishSession]);

  const handleKeystroke = useCallback(
    (key) => {
      const snap = sessionRef.current;
      if (snap.currentWordIndex >= snap.wordList.length) return;

      if (!snap.started) {
        setStarted(true);
        startTimer();
      }

      const expected = snap.wordList[snap.currentWordIndex];

      if (key === "Backspace") {
        setCurrentInput((prev) => prev.slice(0, -1));
        return;
      }

      if (key === " ") {
        if (!snap.currentInput.length) return;
        submitWord();
        return;
      }

      if (key.length === 1 && !key.match(/[\x00-\x1F]/)) {
        setCurrentInput((prev) => prev + key);
      }
    },
    [startTimer, submitWord]
  );

  const onInputKeyDown = useCallback(
    (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "Escape") {
        e.preventDefault();

        navigate("/writing");

        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        return;
      }

      if (e.key === "Backspace" || e.key === " " || e.key.length === 1) {
        e.preventDefault();
        handleKeystroke(e.key);
      }
    },
    [handleKeystroke, navigate]
  );

  const handleBack = useCallback(() => {
    if (phase === "session" && started) {

      return;

    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    navigate("/writing");
  }, [phase, started, navigate]);

  useEffect(() => {
    if (phase === "session") {
      const t = setTimeout(() => focusInput(), 100);
      return () => clearTimeout(t);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, focusInput]);

  useEffect(() => {
    if (phase !== "session") return;
    const el = wordRefs.current[currentWordIndex];
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [phase, currentWordIndex, currentInput]);

  const renderCaret = (key) => (
    <span
      key={key}
      className="typing-caret inline-block w-[3px] rounded-sm align-middle mx-px"
      style={{
        height: "1.15em",
        backgroundColor: caretColor,
        verticalAlign: "baseline",
      }}
      aria-hidden
    />
  );

  const renderWord = (wordIndex) => {
    const word = wordList[wordIndex];
    if (!word) return null;

    const isActive = wordIndex === currentWordIndex;
    const state = wordStates[wordIndex];
    const input = isActive ? currentInput : "";

    const wordClass = [
      "inline-block rounded px-1.5 py-0.5 transition-colors duration-150",
      isActive && shakeWord ? "shake" : "",
      isActive ? "ring-2 ring-[#e2b714]/40" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const wordStyle = {
      backgroundColor: isActive
        ? theme === "dark"
          ? "rgba(226, 183, 20, 0.12)"
          : "#ffedd5"
        : "transparent",
    };

    const chars = [];
    const displayLen = isActive
      ? Math.max(word.length, input.length)
      : word.length;

    if (isActive) {
      for (let c = 0; c <= displayLen; c++) {
        if (c === input.length) {
          chars.push(renderCaret(`caret-${c}`));
        }
        if (c < displayLen) {
          if (c < input.length) {
            const typedChar = input[c];
            const matches =
              c < word.length && typedChar === word[c];
            chars.push(
              <span
                key={c}
                style={{
                  color: matches ? themeColors.text : errorColor,
                  textDecoration: matches ? "none" : "underline",
                  textDecorationColor: `${errorColor}99`,
                }}
              >
                {typedChar}
              </span>
            );
          } else if (c < word.length) {
            chars.push(
              <span key={c} style={{ color: pendingColor }}>
                {word[c]}
              </span>
            );
          }
        }
      }
    } else if (state === "correct") {
      for (let c = 0; c < word.length; c++) {
        chars.push(
          <span key={c} style={{ color: themeColors.text }}>
            {word[c]}
          </span>
        );
      }
    } else if (state === "incorrect") {
      const typed = typedWords[wordIndex] || word;
      for (let c = 0; c < typed.length; c++) {
        chars.push(
          <span
            key={c}
            style={{ color: errorColor }}
            className="underline decoration-[#ca4754]/60"
          >
            {typed[c]}
          </span>
        );
      }
    } else {
      for (let c = 0; c < word.length; c++) {
        chars.push(
          <span key={c} style={{ color: pendingColor }}>
            {word[c]}
          </span>
        );
      }
    }

    return (
      <span
        key={wordIndex}
        ref={(el) => {
          wordRefs.current[wordIndex] = el;
        }}
        className={wordClass}
        style={wordStyle}
      >
        {chars}
      </span>
    );
  };

  const modeLabel = useMemo(() => {
    if (mode === "task1") return "Task 1";
    if (mode === "task2") return "Task 2";
    if (mode === "both") return "Both tasks";
    if (mode === 30 || mode === 50 || mode === 100) return `${mode} words`;
    return "";
  }, [mode]);

  const taskBadgeLabel = useMemo(() => {
    if (mode === "both") return "Task 1 + Task 2";
    if (tasks.length === 1) {
      const t = tasks[0];
      const typeLabel = t?.task_type
        ? getWritingTaskTypeDisplayName(t.task_type)
        : null;
      return typeLabel ? `${t.task_name} — ${typeLabel}` : t?.task_name || "";
    }
    return "";
  }, [tasks, mode]);

  const topMistakes = useMemo(
    () =>
      [...mistakeMap.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5),
    [mistakeMap]
  );

  const finalWpm =
    elapsedSeconds > 0 ? Math.round((correctWords / elapsedSeconds) * 60) : 0;
  const finalAccuracy = displayAccuracy;

  const chartData =
    wpmHistory.length > 0
      ? wpmHistory.map((p) => ({ time: p.time, wpm: p.wpm }))
      : [{ time: 0, wpm: finalWpm }];

  const selectTaskMode = (m) => setMode(m);
  const selectWordMode = (n) => setMode(n);

  const toggleClass = (active) =>
    active
      ? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400";

  const headerTest = useMemo(
    () => ({
      id: writing?.id,
      title: writing?.title || "Typing practice",
    }),
    [writing]
  );

  if (
    !isLauncher &&
    writingId &&
    loadingCurrentWriting &&
    !writing &&
    phase !== "config"
  ) {
    return (
      <div
        className="flex h-screen flex-col items-center justify-center"
        style={{
          backgroundColor: themeColors.background,
          color: themeColors.text,
        }}
      >
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        <p className="mt-4 text-sm opacity-70">Loading practice text…</p>
      </div>
    );
  }

  if (!isLauncher && errorCurrentWriting && !writing) {
    return (
      <div
        className="flex h-screen flex-col"
        style={{
          backgroundColor: themeColors.background,
          color: themeColors.text,
        }}
      >
        <QuestionHeader
          currentTest={{ title: "Typing practice" }}
          id={writingId}
          timeRemaining={null}
          isStarted={false}
          hasInteracted={false}
          isPaused={false}
          handleStart={() => { }}
          handlePause={() => { }}
          onBack={handleBack}
          status="reviewing"
          type="Typing"
          isPracticeMode={false}
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <p className="text-center text-red-500">{errorCurrentWriting}</p>
          <button
            type="button"
            onClick={() => navigate("/writing")}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            Back to Writing
          </button>
        </div>
      </div>
    );
  }

  /* CONFIG */
  if (phase === "config") {
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{
          backgroundColor: themeColors.background,
          color: themeColors.text,
        }}
      >
        <QuestionHeader
          currentTest={headerTest}
          id={writingId || "typing"}
          timeRemaining={null}
          isStarted={false}
          hasInteracted={false}
          isPaused={false}
          handleStart={() => { }}
          handlePause={() => { }}
          onBack={handleBack}
          status="reviewing"
          type="Typing"
          isPracticeMode={false}
        />
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-10">
          <p className="mb-2 text-center text-sm font-medium uppercase tracking-[0.2em] opacity-60">
            {writing?.title || "Typing practice"}
          </p>
          <h1 className="mb-10 text-center text-4xl font-bold tracking-tight">
            Typing practice
          </h1>

          <p className="mb-3 w-full text-sm font-semibold opacity-70">Task</p>
          <div className="mb-6 flex w-full gap-2">
            {[
              { id: "task1", label: "Task 1" },
              { id: "task2", label: "Task 2" },
              { id: "both", label: "Both" },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => selectTaskMode(id)}
                className={`flex-1 rounded-md border py-3 text-sm font-medium transition-colors ${toggleClass(mode === id)}`}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="mb-4 w-full text-center text-xs font-medium uppercase tracking-widest opacity-40">
            or
          </p>

          <p className="mb-3 w-full text-sm font-semibold opacity-70">Words</p>
          <div className="mb-6 flex w-full gap-2">
            {[30, 50, 100].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => selectWordMode(n)}
                className={`flex-1 rounded-md border py-3 text-sm font-medium transition-colors ${toggleClass(mode === n)}`}
              >
                {n}
              </button>
            ))}
          </div>

          {emptyContent && (
            <p className="mb-6 w-full rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              No practice texts available for this selection.
            </p>
          )}

          <button
            type="button"
            disabled={mode == null || launcherLoading || (isLauncher && loadingWritings)}
            onClick={handleStart}
            className="w-full rounded-md bg-gray-900 py-3.5 text-base font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900"
          >
            {(isLauncher && loadingWritings)
              ? "Loading texts…"
              : launcherLoading
                ? "Loading…"
                : "Start"}
          </button>

          <p className="mt-8 text-center text-xs opacity-60">
            Type each word — use{" "}
            <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-gray-800">
              Backspace
            </kbd>{" "}
            to fix mistakes, then{" "}
            <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-gray-800">
              space
            </kbd>{" "}
            to continue
          </p>
        </div>
      </div>
    );
  }

  /* RESULTS */
  if (phase === "results") {
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{
          backgroundColor: themeColors.background,
          color: themeColors.text,
        }}
      >
        <QuestionHeader
          currentTest={headerTest}
          id={writingId}
          timeRemaining={null}
          isStarted={false}
          hasInteracted
          isPaused={false}
          handleStart={() => { }}
          handlePause={() => { }}
          onBack={handleBack}
          status="reviewing"
          type="Typing"
          isPracticeMode={false}
        />
        <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-4 py-10 md:px-8">
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{writing?.title}</h1>
            {taskBadgeLabel && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {taskBadgeLabel}
              </span>
            )}
            {modeLabel && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                {modeLabel}
              </span>
            )}
          </div>

          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "WPM", value: finalWpm },
              { label: "Accuracy", value: `${finalAccuracy}%` },
              { label: "Word errors", value: errorWords },
              { label: "Time", value: formatMmSs(elapsedSeconds) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg border p-4 text-center"
                style={{ borderColor: themeColors.border }}
              >
                <p className="text-xs font-medium uppercase tracking-wide opacity-60">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>

          <p
            className="mb-8 text-sm leading-relaxed opacity-70"
            style={{ color: themeColors.text }}
          >
            <span className="font-medium opacity-100">WPM</span> means{" "}
            <span className="font-medium opacity-100">words per minute</span> — how
            many words you typed correctly in one minute. It is a standard measure of
            typing speed; a higher WPM means you are typing faster.
          </p>

          <div
            className="mb-8 rounded-lg border p-6"
            style={{ borderColor: themeColors.border }}
          >
            <h2 className="mb-4 text-lg font-semibold">WPM over time</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeColors.border} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12, fill: themeColors.text, opacity: 0.6 }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: themeColors.text, opacity: 0.6 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: themeColors.background,
                    border: `1px solid ${themeColors.border}`,
                    color: themeColors.text,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="wpm"
                  stroke={accent}
                  strokeWidth={2}
                  dot={{ r: 3, fill: accent }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {topMistakes.length > 0 && (
            <div
              className="mb-8 rounded-lg border p-6"
              style={{ borderColor: themeColors.border }}
            >
              <h2 className="mb-4 text-lg font-semibold">Top mistakes</h2>
              <ul className="space-y-3">
                {topMistakes.map(([expected, { typed, count }]) => (
                  <li
                    key={expected}
                    className="flex flex-wrap items-center gap-2 font-mono text-sm"
                  >
                    <span className="rounded bg-red-50 px-2 py-1 text-red-700 dark:bg-red-950 dark:text-red-300">
                      {typed}
                    </span>
                    <span className="opacity-40">→</span>
                    <span className="rounded bg-green-50 px-2 py-1 text-green-800 dark:bg-green-950 dark:text-green-300">
                      {expected}
                    </span>
                    <span className="opacity-60">{count}×</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                resetSessionStats();
                setPhase("session");
              }}
              className="flex-1 rounded-md border py-3 font-semibold hover:bg-gray-50 dark:hover:bg-gray-900"
              style={{ borderColor: themeColors.border }}
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => {
                setPhase("config");
                setMode(null);
                setEmptyContent(false);
                const next = new URLSearchParams(searchParams);
                next.delete("scope");
                setSearchParams(next, { replace: true });
              }}
              className="flex-1 rounded-md border py-3 font-semibold hover:bg-gray-50 dark:hover:bg-gray-900"
              style={{ borderColor: themeColors.border }}
            >
              New mode
            </button>
            <button
              type="button"
              onClick={() => navigate("/writing")}
              className="flex-1 rounded-md bg-gray-900 py-3 font-semibold text-white dark:bg-gray-100 dark:text-gray-900"
            >
              Back to Writing
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* SESSION */
  if (wordList.length === 0) {
    return (
      <div
        className="flex h-screen flex-col"
        style={{
          backgroundColor: themeColors.background,
          color: themeColors.text,
        }}
      >
        <QuestionHeader
          currentTest={headerTest}
          id={writingId}
          timeRemaining={null}
          isStarted={false}
          hasInteracted={false}
          isPaused={false}
          handleStart={() => { }}
          handlePause={() => { }}
          onBack={handleBack}
          status="reviewing"
          type="Typing"
          isPracticeMode
        />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-screen flex-col overflow-hidden"
      style={{
        backgroundColor: themeColors.background,
        color: themeColors.text,
      }}
    >
      <QuestionHeader
        currentTest={headerTest}
        id={writingId}
        timeRemaining={null}
        isStarted={started}
        hasInteracted={started}
        isPaused={false}
        handleStart={() => { }}
        handlePause={() => { }}
        onBack={handleBack}
        status="reviewing"
        type="Typing"
        isPracticeMode
      />

      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Typing capture"
        className="pointer-events-none fixed inset-0 z-40 opacity-0"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={onInputKeyDown}
        defaultValue=""
        autoFocus
      />

      {!isFocused && (
        <button
          type="button"
          className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center justify-center gap-2 cursor-pointer"
          style={{ top: "73px", backgroundColor: `${themeColors.background}cc` }}
          onClick={focusInput}
          onKeyDown={(e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            e.preventDefault();
            focusInput();
            if (e.key === "Backspace" || e.key === " " || e.key.length === 1) {
              handleKeystroke(e.key);
            }
          }}
        >
          <p
            className="font-mono text-lg font-medium"
            style={{ color: themeColors.text, opacity: 0.7 }}
          >
            {started ? "Paused — click to continue" : "Click here to start typing"}
          </p>
          <p
            className="font-mono text-sm"
            style={{ color: themeColors.text, opacity: 0.45 }}
          >
            or press any key
          </p>
        </button>
      )}

      <div
        className="absolute left-0 top-[73px] z-30 h-1 w-full"
        style={{ backgroundColor: themeColors.border }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${progressPercent}%`, backgroundColor: accent }}
        />
      </div>

      <header
        className="relative z-20 flex shrink-0 flex-wrap items-center justify-center gap-8 px-4 py-4 font-mono text-sm md:gap-12 md:text-base"
        onClick={focusInput}
      >
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold md:text-3xl">{displayTime}</span>
          <span className="text-xs uppercase tracking-wider opacity-60">time</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold md:text-3xl">{liveWpm}</span>
          <span className="text-xs uppercase tracking-wider opacity-60">wpm</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold md:text-3xl">
            {displayAccuracy}
          </span>
          <span className="text-xs uppercase tracking-wider opacity-60">
            acc
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold md:text-3xl">
            {currentWordIndex}
            <span className="opacity-40">/{wordList.length}</span>
          </span>
          <span className="text-xs uppercase tracking-wider opacity-60">
            words
          </span>
        </div>
      </header>

      {taskBadgeLabel && (
        <div className="relative z-20 flex shrink-0 justify-center px-4 pb-2">
          <span
            className="max-w-full truncate rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            title={taskBadgeLabel}
          >
            {taskBadgeLabel}
          </span>
        </div>
      )}

      <div
        className="relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 md:px-12"
        role="presentation"
        onClick={focusInput}
      >
        <div className="mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center">
          <div
            className={`font-mono leading-[1.9] ${fontSizeClass} flex w-full flex-wrap justify-center gap-x-3 gap-y-3 md:gap-x-4 md:gap-y-4`}
          >
            {wordList.map((_, wordIndex) => {
              const parts = [];
              if (
                wordIndex === task1WordCount &&
                mode === "both" &&
                task1WordCount > 0 &&
                wordIndex < wordList.length
              ) {
                parts.push(
                  <span
                    key={`sep-${wordIndex}`}
                    className="my-4 w-full basis-full text-center text-md font-medium tracking-[0.25em] opacity-40"
                  >
                    ── Task 2 ──
                  </span>
                );
              }
              parts.push(renderWord(wordIndex));
              return parts;
            })}
          </div>
        </div>
      </div>

      <footer className="relative z-20 shrink-0 px-4 py-3 text-center font-mono text-xs opacity-60">
        <span className="hidden sm:inline">
          Backspace to fix mistakes, then{" "}
          <kbd className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
            space
          </kbd>
          {" · "}
        </span>
        <kbd className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
          esc
        </kbd>{" "}
        to exit
      </footer>
    </div>
  );
};

const TypingPracticePage = () => (
  <AppearanceProvider>
    <AnnotationProvider>
      <TypingPracticePageContent />
    </AnnotationProvider>
  </AppearanceProvider>
);

export default TypingPracticePage;
