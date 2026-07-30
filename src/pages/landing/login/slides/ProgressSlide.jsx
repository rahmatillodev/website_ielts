import { motion, useReducedMotion } from "framer-motion";
import { Flame, TrendingUp } from "lucide-react";
import { EASE, INTERIOR_START, softFloat, staggerGroup } from "../motionVariants";
import { SlideCard, SlideChip, SlideItem, SlideLabel, SlideMeter } from "./SlidePrimitives";

const SKILLS = [
  { label: "Listening", score: "9.0" },
  { label: "Reading", score: "7.5" },
  { label: "Writing", score: "6.5" },
  { label: "Speaking", score: "7.0" },
];

const RING_SIZE = 104;
const RING_STROKE = 7;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const VALUE = 0.83;

/**
 * Slide 1 — score ring, four skill rows, progress line, two floating chips.
 *
 * The interior is choreographed rather than simultaneous: the ring scales up and
 * draws (0.9s), the four skills come in one at a time behind it, and only then
 * does the summary line grow. Watching it in order is what makes the card feel
 * assembled instead of pasted in. Every delay is measured from `INTERIOR_START`
 * so none of it plays out behind a still-transparent slide.
 *
 * The chips sit inside the card's horizontal bounds on purpose. The visual area
 * clips, and a chip hanging off the side would be cut in half at 768px where the
 * card is only ~185px wide. Vertically there is room to spare, so they overlap
 * the top and bottom edges instead.
 */
function ProgressSlide() {
  const prefersReducedMotion = useReducedMotion();
  const float = softFloat(5, 6);

  return (
    // A plain root, not a stagger group. Nesting one group inside another
    // compounds `delayChildren` — the skills would inherit the root's offset on
    // top of their own and land *after* the summary line that is supposed to
    // follow them. Each group below owns its timing outright.
    <div className="relative w-full">
      <SlideCard className="flex flex-col items-center">
        {/* score ring */}
        <motion.div
          className="relative"
          style={{ width: RING_SIZE, height: RING_SIZE }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: INTERIOR_START, ease: EASE }}
        >
          <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              // The app defines no --gray-* variables; this is Tailwind gray-100,
              // the value `bg-gray-100` resolves to on the meters.
              stroke="#f3f4f6"
              strokeWidth={RING_STROKE}
            />
            <motion.circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--brand-600)"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - VALUE) }}
              transition={{ duration: 0.9, delay: INTERIOR_START + 0.1, ease: EASE }}
            />
          </svg>

          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: INTERIOR_START + 0.45, ease: EASE }}
          >
            <span className="text-[1.75rem] font-semibold leading-none tracking-tight text-gray-900">
              7.5
            </span>
            <SlideLabel className="mt-1.5 text-[9px]">Band</SlideLabel>
          </motion.div>
        </motion.div>

        {/* skills, one after another */}
        <motion.div
          variants={staggerGroup(0.08, INTERIOR_START + 0.75)}
          initial="hidden"
          animate="visible"
          className="mt-5 grid w-full grid-cols-4 gap-2"
        >
          {SKILLS.map((skill) => (
            <SlideItem key={skill.label} className="min-w-0 text-center">
              <span className="block text-[12px] font-semibold text-gray-900">
                {skill.score}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-gray-500">
                {skill.label}
              </span>
            </SlideItem>
          ))}
        </motion.div>

        {/* summary line, last */}
        <SlideMeter
          value={VALUE * 100}
          delay={INTERIOR_START + 1.05}
          duration={0.8}
          className="mt-4"
        />
      </SlideCard>

      {/* floating chips */}
      <motion.div
        className="absolute -top-3 right-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: INTERIOR_START + 0.85, ease: EASE }}
      >
        <motion.div
          animate={prefersReducedMotion ? undefined : float.animate}
          transition={prefersReducedMotion ? undefined : float.transition}
        >
          <SlideChip icon={TrendingUp} className="shadow-[0_6px_16px_-8px_rgba(227,6,19,0.25)]">
            +0.5
          </SlideChip>
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute -bottom-3 left-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: INTERIOR_START + 1, ease: EASE }}
      >
        <motion.div
          animate={prefersReducedMotion ? undefined : float.animate}
          transition={
            prefersReducedMotion ? undefined : { ...float.transition, delay: 1.4 }
          }
        >
          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-gray-600 shadow-[0_6px_16px_-8px_rgba(16,24,40,0.25)]">
            <Flame className="size-3 text-brand-600" />
            12-day streak
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default ProgressSlide;
