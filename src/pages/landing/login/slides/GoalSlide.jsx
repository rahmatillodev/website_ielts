import { motion } from "framer-motion";
import { Target } from "lucide-react";
import { EASE, INTERIOR_START, staggerGroup } from "../motionVariants";
import { SlideCard, SlideChip, SlideItem, SlideLabel } from "./SlidePrimitives";

const STEPS = [6.5, 7.0, 7.5, 8.0, 8.5, 9.0];
const CURRENT_INDEX = 0;

/**
 * Sign-up slide 1 — setting a target band.
 *
 * A ladder rather than a dial: the login deck opens on a filled score ring,
 * which is a statement about where you already are. Someone who has not started
 * has no score to show, so this one shows the distance instead — a row of rungs
 * with "you are here" low down and the target lit at the top.
 */
function GoalSlide() {
  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: INTERIOR_START, ease: EASE }}
      >
        <SlideCard>
          <div className="flex items-start justify-between gap-3">
            <div>
              <SlideLabel>Target band</SlideLabel>
              <motion.span
                className="mt-2 block text-[1.75rem] font-semibold leading-none tracking-tight text-gray-900"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: INTERIOR_START + 0.25, ease: EASE }}
              >
                9.0
              </motion.span>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: INTERIOR_START + 1.1, ease: EASE }}
            >
              <SlideChip icon={Target}>Goal set</SlideChip>
            </motion.div>
          </div>

          {/* the ladder */}
          <motion.div
            variants={staggerGroup(0.09, INTERIOR_START + 0.45)}
            initial="hidden"
            animate="visible"
            className="mt-6 flex items-end justify-between gap-2"
          >
            {STEPS.map((step, index) => {
              const isTarget = index === STEPS.length - 1;
              const isReached = index <= CURRENT_INDEX;
              return (
                <SlideItem key={step} className="flex-1">
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className={
                        isTarget
                          ? "text-[11px] font-semibold text-brand-700"
                          : "text-[11px] text-gray-400"
                      }
                    >
                      {step.toFixed(1)}
                    </span>
                    <span
                      className={
                        isTarget
                          ? "h-1.5 w-full rounded-full bg-brand-600"
                          : isReached
                            ? "h-1.5 w-full rounded-full bg-brand-200"
                            : "h-1.5 w-full rounded-full bg-gray-100"
                      }
                      style={{ height: 6 + index * 5 }}
                    />
                  </div>
                </SlideItem>
              );
            })}
          </motion.div>

          <motion.p
            className="mt-4 text-[11.5px] text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: INTERIOR_START + 1.15, ease: EASE }}
          >
            Currently at 6.5 · 2.5 bands to go
          </motion.p>
        </SlideCard>
      </motion.div>
    </div>
  );
}

export default GoalSlide;
