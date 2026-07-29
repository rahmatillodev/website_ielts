import { motion, useReducedMotion } from "framer-motion";
import { Square, Circle, Check } from "lucide-react";

/**
 * "Your journey to Band 8" — the hero card from the prototype.
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
 * a fourth node ("8.0") ending the path and a four-item legend beneath, that is
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
        Your journey to Band 8
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

          {WAYPOINTS.map(([cx, cy, label]) => (
            <g key={label}>
              <circle cx={cx} cy={cy} r="15" fill="#fff" stroke="var(--brand-200)" strokeWidth="1.5" />
              <text
                x={cx}
                y={cy + 5}
                textAnchor="middle"
                fontWeight="700"
                fontSize="13"
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
            fontSize="15"
            className="fill-primary"
          >
            8.0
          </text>
        </svg>
      </div>

      {/* The four-up legend. Two columns below `sm` — at 375px, four 11.5px
          paragraphs side by side wrap to one word per line. */}
      <div className="mt-[22px] grid grid-cols-2 gap-x-3.5 gap-y-6 sm:grid-cols-4">
        {STAGES.map(({ label, detail, Icon, filled }) => (
          <div key={label}>
            <span className="mb-2.5 flex size-[34px] items-center justify-center rounded-[9px] bg-brand-50">
              {filled ? (
                <span className="size-3 rounded-full bg-primary" aria-hidden="true" />
              ) : (
                <Icon className="size-3 text-primary" strokeWidth={2.4} aria-hidden="true" />
              )}
            </span>
            <p className="text-[13.5px] font-extrabold text-gray-900">{label}</p>
            <p className="mt-[5px] text-[11.5px] leading-[1.55] text-gray-400">{detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default JourneyVisual;
