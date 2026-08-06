import React from "react";
import { MdOutlineLightbulb } from "react-icons/md";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useExplain } from "./ExplainContext";

/**
 * Savol kartochkasi ostidagi REVIEW rejimi amallari qatori.
 *
 * Maketda har bir kartochkada uchta amal bor: Locate / Explain / Report.
 * Hozircha bu yerda faqat Explain bor - Locate keyin shu qatorga qo'shiladi
 * (pastdagi "Locate" izohli joyga yana bitta tugma sifatida), qayta qurish shart emas.
 * Report esa savol yonida suzuvchi ikonka bo'lib qoladi ([[QuestionActionIcons]]),
 * Locate kelganda uchalasi shu qatorga birlashtirilishi mumkin.
 *
 * Izoh yo'q savolda BUTUN qator chizilmaydi - bo'sh "Explain" tugmasi ham,
 * bo'sh yoyilgan panel ham ko'rinmaydi.
 *
 * @param {string|number} questionNumber - savol raqami (panel id va yorliq uchun)
 * @param {string} explanation - `questions.explanation` matni
 * @param {boolean} showQuestionNumber - guruh kartochkasida bir nechta savol bo'lganda,
 *   qaysi savolga tegishli ekanini ko'rsatish uchun "Q12" yorlig'ini chizadi
 */
const QuestionReviewActions = ({
  questionNumber,
  explanation,
  showQuestionNumber = false,
}) => {
  const { themeColors } = useAppearance();
  // Shared with the inline types, so only one explanation is open at a time
  // anywhere in the review. Null outside the provider - see [[ExplainContext]].
  const explain = useExplain();

  const text = (explanation || "").toString().trim();
  if (!explain || !text) return null;

  const isOpen = explain.isOpen(questionNumber);
  const panelId = `explain-panel-${questionNumber}`;

  return (
    <div
      className="mt-4 pt-3 border-t"
      style={{ borderColor: themeColors.border }}
      data-explain-row={questionNumber}
      /* 'single' = the card's own question. 'group-list' = the stacked list under
         a multi-question group card, which now survives only for the types with
         no per-question anchor to hang an inline icon on. */
      data-explain-card={showQuestionNumber ? 'group-list' : 'single'}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {showQuestionNumber && (
          <span
            className="text-xs font-semibold opacity-60"
            style={{ color: themeColors.text }}
          >
            Q{questionNumber}
          </span>
        )}

        {/* Locate tugmasi shu yerga, Explain yoniga qo'shiladi. */}

        <button
          type="button"
          onClick={() => explain.toggle(questionNumber)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          data-testid="explain-toggle"
          data-explain-toggle={questionNumber}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
          title="Why this is the answer"
        >
          <MdOutlineLightbulb size={15} />
          {isOpen ? "Hide explanation" : "Explain"}
        </button>
      </div>

      {isOpen && (
        <div
          id={panelId}
          data-testid="explain-panel"
          className="mt-3 rounded-xl border border-brand-100 bg-white p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <MdOutlineLightbulb className="text-brand-600" size={16} />
            <span className="text-[11px] font-black uppercase tracking-widest text-brand-700">
              Why this is the answer
            </span>
          </div>
          {/* whitespace-pre-line: izohlar "Where:/Quote:/Why:" uch qatorli formatda
              saqlanadi, qator uzilishlari saqlanib qolishi kerak. Qo'lda yozilgan
              eski bir qatorli izohlar ham xuddi shunday chiziladi. */}
          <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
            {text}
          </p>
        </div>
      )}
    </div>
  );
};

export default QuestionReviewActions;
