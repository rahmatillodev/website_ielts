import { motion } from "framer-motion";
import { EASE, INTERIOR_START, staggerGroup } from "../motionVariants";
import { SlideCard, SlideItem, SlideLabel } from "./SlidePrimitives";

// Height as a fraction of the plot area. The first bar is deliberately short:
// this deck is aimed at someone who has not started, so the story is the climb,
// not the current altitude.
const BARS = [0.28, 0.4, 0.46, 0.6, 0.66, 0.8, 1];
const LABELS = ["1st", "", "", "", "", "", "Now"];

/**
 * Sign-up slide 4 — growth over time, as bars.
 *
 * Bars, not the line chart the login deck ends on. Both say "you improved", but
 * a column climbing from a visibly low first attempt reads as a beginning, and
 * the two decks have to be distinguishable at a glance from across a room.
 */
function GrowthSlide() {
  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: INTERIOR_START, ease: EASE }}
      >
        <SlideCard>
          <div className="flex items-end justify-between gap-3">
            <div>
              <SlideLabel>From first attempt</SlideLabel>
              <motion.span
                className="mt-2 block text-[1.75rem] font-semibold leading-none tracking-tight text-gray-900"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: INTERIOR_START + 0.25, ease: EASE }}
              >
                +1.5
              </motion.span>
            </div>
            <motion.span
              className="shrink-0 text-[11px] text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: INTERIOR_START + 1.15, ease: EASE }}
            >
              bands gained
            </motion.span>
          </div>

          <motion.div
            variants={staggerGroup(0.08, INTERIOR_START + 0.4)}
            initial="hidden"
            animate="visible"
            className="mt-5 flex h-20 items-end justify-between gap-1.5"
          >
            {BARS.map((height, index) => (
              <SlideItem key={index} className="flex h-full flex-1 items-end">
                <motion.span
                  className={
                    index === BARS.length - 1
                      ? "w-full origin-bottom rounded-t-md bg-brand-600"
                      : "w-full origin-bottom rounded-t-md bg-brand-200"
                  }
                  style={{ height: `${height * 100}%` }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{
                    duration: 0.55,
                    delay: INTERIOR_START + 0.45 + index * 0.08,
                    ease: EASE,
                  }}
                />
              </SlideItem>
            ))}
          </motion.div>

          <div className="mt-2 flex justify-between text-[10px] text-gray-400">
            {LABELS.map((label, index) => (
              <span key={index} className="flex-1 text-center">
                {label}
              </span>
            ))}
          </div>
        </SlideCard>
      </motion.div>
    </div>
  );
}

export default GrowthSlide;
