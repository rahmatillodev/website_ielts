import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MdHeadset, MdLock } from "react-icons/md";
import { FaPencilAlt } from "react-icons/fa";
import { IoBookOutline } from "react-icons/io5";
import { LuCheck } from "react-icons/lu";
import { useDashboardStore } from "@/store/dashboardStore";
import { clearReadingPracticeData } from "@/store/LocalStorage/readingStorage";
import { clearListeningPracticeData } from "@/store/LocalStorage/listeningStorage";
import UpgradeModal from "../modal/UpgradeModal";
import { formatDateToDayMonth } from "@/utils/formatDate";
import { toScore, formatScore } from "@/utils/score";

/**
 * A single entry in the library.
 *
 * Grid only — the library dropped its list/grid toggle, so the row variant that
 * used to live here went with it.
 *
 * Replaces the CardOpen/CardLocked pair for the redesigned library. Those two
 * are still used by the older TestsLibraryPage and by ComingSoonPage, so they
 * are deliberately left alone.
 *
 * The visual rules that make this read as premium rather than as a dashboard
 * widget, all of which the old cards broke:
 *   - the card does not move. Hover changes border colour and adds a soft brand
 *     halo, nothing else — no lift, no scale, no reflow. The old cards sat at
 *     shadow-lg and jumped to shadow-2xl, so everything shouted.
 *   - status is carried by a hairline chip and an icon, never by a 4px coloured
 *     border around the whole card.
 *   - "Free" gets no badge. It is the default state, and badging the default is
 *     what made the old grid feel like a sticker album.
 *   - brand red appears once per card, on the action, at small size.
 *
 * Surface and border come from the `card` / `border` tokens rather than literal
 * white and gray-200, so the card is white in light mode and picks up the
 * existing dark surface automatically once `.dark` is wired up globally (see the
 * note in index.css — the dark block is defined but currently dormant).
 */

const DIFFICULTY_LEVEL = { easy: 1, medium: 2, hard: 3 };

const DifficultyBars = ({ level = 1 }) => (
  <span className="inline-flex items-end gap-px" aria-hidden="true">
    {[3, 5, 7].map((h, i) => (
      <span
        key={h}
        className={`w-[3px] rounded-full ${i < level ? "bg-gray-400" : "bg-gray-200"}`}
        style={{ height: h + 1 }}
      />
    ))}
  </span>
);

const Dot = () => <span className="text-gray-300">·</span>;

const TypeIcon = ({ testType, className }) => {
  if (testType === "listening") return <MdHeadset className={className} />;
  if (testType === "writing") return <FaPencilAlt className={className} />;
  return <IoBookOutline className={className} />;
};

const LibraryCard = ({
  id,
  video_id,
  title,
  difficulty,
  duration,
  question_quantity,
  created_at,
  date,
  partLabel,
  testType = "reading",
  locked = false,
  // Locked cards receive completion data as props; open cards read it from the
  // dashboard store (no extra request).
  isCompleted: isCompletedProp,
  score: scoreProp,
  correct_answers,
  total_questions,
}) => {
  const navigate = useNavigate();
  const completion = useDashboardStore((state) => (locked ? null : state.getCompletion(id)));

  const attempt = useMemo(() => completion?.attempt ?? null, [completion]);
  const hasCompleted = locked
    ? Boolean(isCompletedProp)
    : testType !== "speaking" && Boolean(completion?.isCompleted);

  const score = toScore(locked ? scoreProp : attempt?.score);
  const correct = locked ? Number(correct_answers ?? 0) : attempt?.correct_answers ?? 0;
  const total = (locked ? total_questions : attempt?.total_questions) || question_quantity || 0;

  const completedOn = attempt?.completed_at ?? date;
  const metaDate = hasCompleted && completedOn
    ? `Completed ${formatDateToDayMonth(completedOn)}`
    : created_at
      ? `Added ${formatDateToDayMonth(created_at)}`
      : "";

  const practicePath = () => {
    switch (testType) {
      case "listening": return `/listening-practice/${id}`;
      case "reading": return `/reading-practice/${id}`;
      case "speaking":
      case "human": return `/equipment-check/${id}`;
      case "podcast": return `/podcast/player/${video_id}`;
      case "shadowing": return `/speaking-practice/shadowing-player/${video_id || id}`;
      default: return `/writing-practice/${id}`;
    }
  };

  const clearLocalDraft = () => {
    if (!id) return;
    if (testType === "listening") clearListeningPracticeData(id);
    else if (testType === "reading") clearReadingPracticeData(id);
  };

  const handleStart = () => {
    clearLocalDraft();
    navigate(practicePath());
  };

  const handleReview = () => {
    if (testType === "listening") navigate(`/listening-practice/${id}?mode=review`);
    else if (testType === "reading") navigate(`/reading-practice/${id}?mode=review`);
    else if (testType === "shadowing") navigate(`/speaking-practice/shadowing?mode=review`);
    else navigate(`/speaking-practice/${id}/session?mode=review`);
  };

  const startLabel =
    testType === "writing" ? "View sample" : testType === "shadowing" ? "Watch" : "Start";

  const level = DIFFICULTY_LEVEL[difficulty?.toLowerCase()] ?? 1;

  /* ---------- shared fragments ---------- */

  // Rendered inline in the list row and on its own line in the grid card, so it
  // is a fragment of spans rather than a wrapper element.
  const metaItems = (
    <>
      <span className="inline-flex items-center gap-1.5">
        <DifficultyBars level={level} />
        <span className="capitalize">{difficulty || "—"}</span>
      </span>
      {duration != null && (<><Dot /><span className="tabular-nums">{duration} min</span></>)}
      {hasCompleted
        ? (<><Dot /><span className="tabular-nums">{correct}/{total} correct</span></>)
        : question_quantity != null && (
          <><Dot /><span className="tabular-nums">{question_quantity} {question_quantity === 1 ? "question" : "questions"}</span></>
        )}
    </>
  );

  const premiumChip = locked && (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-200 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
      <MdLock className="text-[11px]" aria-hidden="true" />
      Premium
    </span>
  );

  const completedChip = hasCompleted && (
    <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-success-text">
      <LuCheck className="text-[13px]" aria-hidden="true" />
      Completed
    </span>
  );

  const scoreBlock = hasCompleted && (
    <div className="flex flex-col items-end leading-none">
      <span className="text-[11px] text-gray-400">Band</span>
      <span className="mt-1 text-[17px] font-semibold tabular-nums text-gray-900">
        {formatScore(score, "0.0")}
      </span>
    </div>
  );

  const primaryBtn = "inline-flex h-9 items-center justify-center rounded-lg bg-brand-600 px-4 text-[13px] font-medium text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";
  const ghostBtn = "inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-[13px] font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";

  const actions = locked ? (
    <UpgradeModal>
      <button type="button" className={ghostBtn} aria-label={`Unlock ${title}`}>
        <MdLock className="mr-1.5 text-[13px]" aria-hidden="true" />
        Unlock
      </button>
    </UpgradeModal>
  ) : hasCompleted ? (
    <div className="flex items-center gap-2">
      <button type="button" onClick={handleReview} className={ghostBtn}>Review</button>
      <button type="button" onClick={handleStart} className={primaryBtn}>Retake</button>
    </div>
  ) : (
    <button type="button" onClick={handleStart} className={primaryBtn}>{startLabel}</button>
  );

  return (
    <div className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-[border-color,box-shadow] duration-200 hover:border-brand-300 hover:shadow-[0_0_0_3px_var(--primary-subtle),0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
          <TypeIcon testType={testType} className="text-[17px]" />
        </span>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">{completedChip}{premiumChip}</div>
      </div>

      <h3 className="line-clamp-2 break-words text-[15px] font-medium leading-snug tracking-[-0.01em] text-gray-900">
        {title}
      </h3>

      <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] leading-none text-gray-400">
        {partLabel && <span className="truncate">{partLabel}</span>}
        {partLabel && metaDate && <Dot />}
        {metaDate && <span className="truncate">{metaDate}</span>}
      </div>

      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] leading-none text-gray-500">
        {metaItems}
      </div>

      {/* Grows so the action row pins to the card's bottom edge — buttons line up
          across a row of uneven cards — while mt-4 keeps a floor under the gap
          on the tallest card, where the growth collapses to zero. */}
      <div className="mt-4 flex-1" aria-hidden="true" />

      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-3 border-t border-gray-100 pt-4">
        {hasCompleted ? scoreBlock : <span />}
        <div className="ml-auto shrink-0">{actions}</div>
      </div>
    </div>
  );
};

export default LibraryCard;
