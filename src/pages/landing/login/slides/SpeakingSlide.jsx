import { motion, useReducedMotion } from "framer-motion";
import { Mic } from "lucide-react";
import {
  EASE,
  INTERIOR_START,
  SPRING_SOFT,
  softFloat,
  staggerGroup,
} from "../motionVariants";
import { SlideCard, SlideItem, SlideLabel, SlideMeter } from "./SlidePrimitives";

/**
 * 24 bars, each with its own height, opacity, duration and delay.
 *
 * All four are derived from the bar's index rather than randomised. A fixed
 * envelope keeps the waveform tallest and most opaque through the middle so it
 * reads as one voice, and deriving the timing means the shape is stable across
 * remounts instead of reshuffling every time the slide comes round.
 *
 * Opacity is the only thing that varies — every bar is the same brand red.
 */
const BAR_COUNT = 24;

const BARS = Array.from({ length: BAR_COUNT }, (_, index) => {
  const envelope = Math.sin((index / (BAR_COUNT - 1)) * Math.PI);
  const jitter = 0.6 + 0.4 * Math.abs(Math.sin(index * 2.3));
  return {
    height: Math.max(0.26, envelope * jitter),
    opacity: 0.3 + envelope * 0.55,
    duration: 0.7 + Math.abs(Math.sin(index * 1.7)) * 0.6,
    delay: (index % 6) * 0.09,
  };
});

const SCORES = [
  { label: "Fluency", value: 78 },
  { label: "Pronunciation", value: 88 },
];

/**
 * Slide 3 — microphone, live waveform, score panel.
 *
 * This is the slide carrying continuous motion: two rings breathing out of the
 * microphone on a 2.2s cycle, and 24 bars looping on `scaleY` with
 * `repeatType: "reverse"`, so each bar eases back through its own keyframes
 * rather than snapping to the start. All transforms, so the whole thing
 * composites.
 *
 * It all stops under reduced motion — the bars hold at their resting heights and
 * the rings are not rendered at all.
 */
function SpeakingSlide() {
  const prefersReducedMotion = useReducedMotion();
  const float = softFloat(4, 7);

  return (
    // A plain root, not a stagger group: nesting one group inside another
    // compounds `delayChildren`, so the score rows below own their timing.
    <div className="w-full">
      <SlideCard className="flex flex-col items-center">
        {/* microphone + pulse rings */}
        <motion.div
          className="relative flex size-14 items-center justify-center"
          initial={{ opacity: 0, scale: 0.75 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...SPRING_SOFT, delay: INTERIOR_START }}
        >
          {!prefersReducedMotion &&
            [0, 1].map((ring) => (
              <motion.span
                key={ring}
                className="absolute inset-0 rounded-full bg-brand-600"
                initial={{ scale: 1, opacity: 0 }}
                animate={{ scale: [1, 1.18], opacity: [0.25, 0] }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: INTERIOR_START + ring * 1.1,
                }}
              />
            ))}

          <span className="relative flex size-14 items-center justify-center rounded-full bg-brand-50 ring-1 ring-brand-100">
            <Mic className="size-5 text-brand-600" />
          </span>
        </motion.div>

        {/* waveform */}
        <motion.div
          className="mt-5 flex h-9 w-full items-center justify-center gap-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: INTERIOR_START + 0.35, ease: EASE }}
        >
          {BARS.map((bar, index) => (
            <motion.span
              key={index}
              className="w-[3px] flex-none rounded-full bg-brand-600"
              style={{ height: `${26 + bar.height * 74}%`, opacity: bar.opacity }}
              initial={{ scaleY: 0.35 }}
              animate={
                prefersReducedMotion ? undefined : { scaleY: [0.35, 1, 0.5, 0.85, 0.35] }
              }
              transition={
                prefersReducedMotion
                  ? undefined
                  : {
                      duration: bar.duration,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: "easeInOut",
                      delay: INTERIOR_START + 0.35 + bar.delay,
                    }
              }
            />
          ))}
        </motion.div>

        {/* score panel — arrives after the waveform, then drifts */}
        <motion.div
          className="mt-5 w-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: INTERIOR_START + 0.65, ease: EASE }}
        >
          <motion.div
            animate={prefersReducedMotion ? undefined : float.animate}
            transition={
              prefersReducedMotion ? undefined : { ...float.transition, delay: 1.5 }
            }
          >
            <div className="flex items-baseline justify-between">
              <SlideLabel>Speaking band</SlideLabel>
              <span className="text-[1.25rem] font-semibold leading-none tracking-tight text-gray-900">
                7.5
              </span>
            </div>

            <motion.div
              variants={staggerGroup(0.09, INTERIOR_START + 0.9)}
              initial="hidden"
              animate="visible"
              className="mt-3 space-y-2"
            >
              {SCORES.map((score, index) => (
                <SlideItem key={score.label}>
                  <div className="flex items-center gap-3">
                    <span className="w-[74px] shrink-0 truncate text-[10.5px] text-gray-500">
                      {score.label}
                    </span>
                    <SlideMeter
                      value={score.value}
                      delay={INTERIOR_START + 1 + index * 0.12}
                      duration={0.9}
                    />
                  </div>
                </SlideItem>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </SlideCard>
    </div>
  );
}

export default SpeakingSlide;
