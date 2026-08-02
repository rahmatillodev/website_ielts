import { Clock } from "lucide-react";

/**
 * The two-card exam mock from the prototype: the question on the left, the
 * question-number palette on the right, in a `1fr 220px` grid.
 *
 * All state is the prototype's own `renderVals()`: questions 11–40, answered
 * {11,12,13,17,21,22}, current 14, progress 36%, option B selected. Reproduced
 * exactly rather than re-invented, including the 5-column palette that runs to
 * 40 and stops.
 *
 * Marked decorative — it is a picture of an interface, not one. The section's
 * heading and checklist carry the meaning for assistive tech.
 */

const OPTIONS = [
  { letter: "A", text: "To discuss a new marketing strategy" },
  { letter: "B", text: "To explain a research project", selected: true },
  { letter: "C", text: "To solve a technical problem" },
  { letter: "D", text: "To describe a company policy" },
];

const ANSWERED = new Set([11, 12, 13, 17, 21, 22]);
const CURRENT = 14;
const FIRST = 11;
const LAST = 40;

/** Rows of five, 11→40 — the prototype's `gridNums`. */
const ROWS = Array.from({ length: 6 }, (_, row) =>
  Array.from({ length: 5 }, (_, col) => FIRST + row * 5 + col).filter((n) => n <= LAST)
).filter((row) => row.length > 0);

function MockExamPreview() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_200px]" aria-hidden="true">
      {/* Question card */}
      <div className="rounded-[14px] border border-border bg-white px-5 py-5 shadow-[0_14px_36px_rgba(19,23,34,.06)] sm:px-[26px] sm:py-6">
        <div className="flex items-center justify-between gap-3 text-[12.5px] font-bold text-gray-600">
          <span>Listening · Section 2</span>
          <span className="flex items-center gap-1.5 tabular-nums">
            <Clock className="size-2.5" strokeWidth={2.5} />
            28:45
          </span>
        </div>

        <div className="mt-3.5 flex items-center gap-3">
          <span className="whitespace-nowrap text-[11.5px] font-semibold text-gray-400">
            Questions 11–20
          </span>
          <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[#F0E4E3]">
            <div className="h-full w-[36%] rounded-full bg-primary" />
          </div>
          <span className="whitespace-nowrap text-[11.5px] font-bold tabular-nums text-gray-600">
            14 / 40
          </span>
        </div>

        <div className="mt-5 flex items-baseline gap-3">
          <span className="text-[13px] font-extrabold text-primary">14</span>
          <span className="text-[14px] font-bold text-gray-900">
            What is the main purpose of the talk?
          </span>
        </div>

        <ul className="mt-3.5 flex flex-col gap-2 text-[13px] text-gray-600">
          {OPTIONS.map(({ letter, text, selected }) => (
            <li
              key={letter}
              className={[
                "flex gap-2.5 rounded-lg px-3 py-2.5",
                selected
                  ? "border-[1.5px] border-primary bg-[#FFF9F8] font-semibold text-gray-900"
                  : "",
              ].join(" ")}
            >
              <span
                className={
                  selected ? "font-extrabold text-primary" : "font-bold text-gray-400"
                }
              >
                {letter}
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      {/* Question palette */}
      <div className="flex flex-col rounded-[14px] border border-border bg-white p-5 shadow-[0_14px_36px_rgba(19,23,34,.06)]">
        <div className="flex flex-col gap-1.5">
          {ROWS.map((row) => (
            <div key={row[0]} className="grid grid-cols-5 gap-1.5">
              {row.map((n) => {
                const isCurrent = n === CURRENT;
                const isAnswered = ANSWERED.has(n);
                return (
                  <span
                    key={n}
                    className={[
                      "flex h-[26px] items-center justify-center rounded-md border text-[11px] font-bold tabular-nums",
                      isCurrent
                        ? "border-primary bg-primary text-primary-foreground"
                        : isAnswered
                          ? "border-gray-900/15 bg-gray-100 text-gray-900"
                          : "border-gray-900/10 bg-white text-gray-600",
                    ].join(" ")}
                  >
                    {n}
                  </span>
                );
              })}
            </div>
          ))}
        </div>

        <span className="mt-5 block rounded-lg bg-primary py-2.5 text-center text-[12.5px] font-extrabold text-primary-foreground sm:mt-auto">
          Next →
        </span>
      </div>
    </div>
  );
}

export default MockExamPreview;
