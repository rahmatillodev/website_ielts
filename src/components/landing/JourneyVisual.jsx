import { motion, useReducedMotion } from "framer-motion";
import { Square, Circle, Check } from "lucide-react";

/**
 * "Your journey to Band 9" — the hero card from the prototype.
 *
 * The prototype draws a hand-tuned bezier across a 480×96 viewBox, with three
 * numbered waypoints sitting on the curve and an oversized ringed node at the
 * end holding the target band. The path is drawn with a CSS keyframe on
 * `stroke-dashoffset` (dasharray 420, 2s, 0.4s delay); here the same draw runs
 * through Framer's `pathLength`, which is the identical effect expressed in the
 * library this project already uses.
 *
 * Coordinates, radii, stroke widths and the dashed tail are copied verbatim
 * from the prototype so the curve reads exactly as designed.
 *
 * One correction: the prototype labels its three waypoints 1, 2 and **4**. With
 * a fourth node ("9.0") ending the path and a four-item legend beneath, that is
 * a typo — the third waypoint is numbered 3 here.
 */

/**
 * The prototype's legend marks are bare CSS boxes: an outlined square, an
 * outlined circle, a rotated corner (a tick), and — for "Achieve" — a *filled*
 * dot. Lucide covers the first three; the fourth is drawn as a filled span,
 * because `Dot` renders a 2px point at this size and all but disappears, losing
 * the one mark the prototype deliberately fills to signal the end state.
 */
const STAGES = [
  { label: "Practice", detail: "Targeted exercises for every skill", Icon: Square },
  { label: "Feedback", detail: "AI evaluation & detailed insights", Icon: Circle },
  { label: "Improve", detail: "Focus on weak areas and track progress", Icon: Check },
  { label: "Achieve", detail: "Reach your target band", filled: true },
];

/** The prototype's waypoints: [cx, cy, label]. */
const WAYPOINTS = [
  [44, 62, "1"],
  [176, 52, "2"],
  [306, 54, "3"],
];

function JourneyVisual() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="rounded-[18px] border border-border bg-white px-[26px] pb-[30px] pt-8 shadow-[0_20px_50px_rgba(19,23,34,.07)] sm:px-[34px] sm:pt-9">
      <p className="text-center text-base font-extrabold tracking-[-0.01em] text-gray-900">
        Your journey to Band 9
      </p>

      <div className="relative mt-[26px]">
        <svg
          viewBox="0 0 480 96"
          className="h-auto w-full overflow-visible"
          fill="none"
          aria-hidden="true"
        >
          <motion.path
            d="M 44 62 C 100 20, 130 66, 176 52 C 230 36, 250 70, 306 54 C 340 44, 352 40, 380 44"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 2, delay: 0.4, ease: [0.5, 0, 0.3, 1] }
            }
          />

          {/* The dashed hop from the last waypoint to the target. */}
          <line
            x1="392"
            y1="46"
            x2="418"
            y2="48"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeDasharray="4 5"
          />

          {/* The numerals are a step larger than the prototype's; the circles,
              the curve and every coordinate are untouched, so the line reads
              exactly as designed and only its labels gained weight. 14 against
              an r=15 node still leaves the digit comfortably inside the ring. */}
          {WAYPOINTS.map(([cx, cy, label]) => (
            <g key={label}>
              <circle cx={cx} cy={cy} r="15" fill="#fff" stroke="var(--brand-200)" strokeWidth="1.5" />
              <text
                x={cx}
                y={cy + 5}
                textAnchor="middle"
                fontWeight="700"
                fontSize="14"
                fill="currentColor"
                className="fill-gray-900"
              >
                {label}
              </text>
            </g>
          ))}

          {/* Target node: solid ring plus a wider, fainter halo. */}
          <circle cx="440" cy="48" r="24" fill="#fff" stroke="var(--primary)" strokeWidth="2" />
          <circle
            cx="440"
            cy="48"
            r="31"
            fill="none"
            stroke="var(--primary)"
            strokeOpacity=".22"
            strokeWidth="1.5"
          />
          <text
            x="440"
            y="54"
            textAnchor="middle"
            fontWeight="800"
            fontSize="17"
            className="fill-primary"
          >
            9.0
          </text>
        </svg>
      </div>

      {/*
        The four-up legend. Two columns below `sm` — at 375px, four paragraphs
        side by side wrap to one word per line.

        The prototype's sizes here were set for a 1180px canvas and never grew:
        the card is the same 519×353 at 1280 as it is at 2545, because the page
        container caps at 1180. So on a 24" or 27" panel this block was a 13.5px
        title over an 11.5px description in 102px columns — legible in principle,
        genuinely hard to read in practice.

        Three things changed, in order of how much they help:

        1. Contrast. The descriptions were `gray-400`, about 2.8:1 on white —
           below AA for body text at any size. `gray-500` takes them to ~4.8:1.
           This is the single biggest readability gain and it costs no space.
        2. Size. Title 13.5 → 14.5, description 11.5 → 12.5, tile 34 → 36, glyph
           12 → 14, with one further step at 1800px for the large-desktop case
           the card cannot answer by getting wider. Leading tightens 1.55 → 1.5
           to give some of the height back.
        3. Air. The column gap opens up — except at `lg`, where it deliberately
           does not. The card is at its narrowest between 1024 and 1279 (443px,
           because the hero splits in two while the container is still only as
           wide as the window), so a wider gap there is taken straight out of
           the columns: 20px of gap cost 4.5px per column and bought an extra
           wrapped line. It steps back up at `xl` where the card is 519px.

        1800px, not `2xl`: Tailwind's `2xl` is 1536, which is a *laptop* width
        (1920×1080 at 125%). 1800 clears every laptop — including the 16"
        MacBook's 1728 — and still catches a 1080p 24" panel, which reports
        ~1905 once a scrollbar is showing.
      */}
      {/* The gap steps are all written as `min-[…]` rather than a mix of `sm:`
          and `min-[1800px]:`. Mixed forms do not sort against each other
          reliably — `xl:gap-x-5` was winning over `min-[1800px]:gap-x-6` and the
          large-desktop gap silently never applied. One form, sorted by width. */}
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4 min-[640px]:gap-x-5 min-[1024px]:gap-x-3.5 min-[1280px]:gap-x-5 min-[1800px]:gap-x-6">
        {STAGES.map(({ label, detail, Icon, filled }) => (
          <div key={label}>
            <span className="mb-3 flex size-9 items-center justify-center rounded-[9px] bg-brand-50 min-[1800px]:size-10">
              {filled ? (
                <span
                  className="size-3.5 rounded-full bg-primary min-[1800px]:size-4"
                  aria-hidden="true"
                />
              ) : (
                <Icon
                  className="size-3.5 text-primary min-[1800px]:size-4"
                  strokeWidth={2.4}
                  aria-hidden="true"
                />
              )}
            </span>
            <p className="text-[14.5px] font-extrabold text-gray-900 min-[1800px]:text-base">
              {label}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-[1.5] text-gray-500 min-[1800px]:text-[13.5px]">
              {detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default JourneyVisual;
