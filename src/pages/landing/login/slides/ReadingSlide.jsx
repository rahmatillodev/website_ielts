import { motion } from "framer-motion";
import { Check, Clock } from "lucide-react";
import {
  EASE,
  INTERIOR_START,
  SPRING_SOFT,
  slideInItem,
  staggerGroup,
} from "../motionVariants";
import { SlideCard, SlideItem, SlideLabel, SlideMeter } from "./SlidePrimitives";

const OPTIONS = [
  { key: "A", text: "Paragraph two", selected: false },
  { key: "B", text: "Paragraph four", selected: true },
];

// brand-50. Hard-coded because Framer cannot interpolate a `var()`, and this is
// the value the token resolves to — index.css documents it as the source of
// `--skill-reading-subtle: #fff5f3`.
const BRAND_50 = "255,245,243";

/**
 * Slide 2 — question panel, choices, one selected answer, progress, timer.
 *
 * The choices arrive from the right one at a time, then the correct one tints
 * and its check springs in. That beat between the row landing and the answer
 * resolving is the point of the slide: it shows the product responding, not a
 * static screenshot of a question.
 *
 * The timer is a fixed string that fades in once. A digit ticking every second
 * is the loudest thing on a calm page and pulls the eye off the form.
 */
function ReadingSlide() {
  return (
    // A plain root, not a stagger group: nesting one group inside another
    // compounds `delayChildren`, so the choices below own their timing outright.
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: INTERIOR_START, ease: EASE }}
      >
        <SlideCard>
          <div className="flex items-center justify-between gap-3">
            <SlideLabel>Passage 2</SlideLabel>
            <motion.span
              className="inline-flex shrink-0 items-center gap-1.5 text-[11.5px] font-medium tabular-nums text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: INTERIOR_START + 0.35, ease: EASE }}
            >
              <Clock className="size-3.5 text-gray-400" />
              19:42
            </motion.span>
          </div>

          <motion.p
            className="mt-4 text-[13.5px] leading-relaxed text-gray-900"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: INTERIOR_START + 0.2, ease: EASE }}
          >
            Which paragraph explains the change in method?
          </motion.p>

          <motion.div
            variants={staggerGroup(0.08, INTERIOR_START + 0.45)}
            initial="hidden"
            animate="visible"
            className="mt-4 space-y-2"
          >
            {OPTIONS.map((option) => (
              <SlideItem key={option.key} variants={slideInItem}>
                {/* Only the fill animates. The border stays on its token class —
                    Framer cannot interpolate a `var()`, and hand-writing a hex
                    for brand-200 would put a second, slightly-off red on the
                    page. */}
                <motion.div
                  className={
                    option.selected
                      ? "flex items-center gap-2.5 rounded-lg border border-brand-200 px-2.5 py-2"
                      : "flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-2"
                  }
                  initial={{ backgroundColor: `rgba(${BRAND_50},0)` }}
                  animate={{
                    backgroundColor: `rgba(${BRAND_50},${option.selected ? 1 : 0})`,
                  }}
                  transition={{ duration: 0.5, delay: INTERIOR_START + 0.85, ease: EASE }}
                >
                  <span
                    className={
                      option.selected
                        ? "flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[9px] font-semibold text-white"
                        : "flex size-4 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[9px] font-semibold text-gray-500"
                    }
                  >
                    {option.selected ? (
                      <motion.span
                        className="flex"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ ...SPRING_SOFT, delay: INTERIOR_START + 1 }}
                      >
                        <Check className="size-2.5" />
                      </motion.span>
                    ) : (
                      option.key
                    )}
                  </span>
                  <span
                    className={
                      option.selected
                        ? "truncate text-[12px] font-medium text-brand-700"
                        : "truncate text-[12px] text-gray-600"
                    }
                  >
                    {option.text}
                  </span>
                </motion.div>
              </SlideItem>
            ))}
          </motion.div>

          <div className="mt-4 flex items-center gap-3">
            <SlideMeter value={30} delay={INTERIOR_START + 0.95} duration={1} />
            <motion.span
              className="shrink-0 text-[10.5px] tabular-nums text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: INTERIOR_START + 1.1, ease: EASE }}
            >
              12 / 40
            </motion.span>
          </div>
        </SlideCard>
      </motion.div>
    </div>
  );
}

export default ReadingSlide;
