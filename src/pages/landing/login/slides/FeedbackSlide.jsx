import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { EASE, INTERIOR_START, SPRING_SOFT, slideInItem, staggerGroup } from "../motionVariants";
import { SlideCard, SlideItem, SlideLabel } from "./SlidePrimitives";

const NOTES = [
  { text: "Task response is well developed", positive: true },
  { text: "Watch article use before nouns", positive: false },
];

/**
 * Sign-up slide 3 — what feedback looks like.
 *
 * A marked-up answer rather than a chart. The login deck already shows numbers
 * going up; this one has to answer the question a beginner actually has, which
 * is "will it tell me *why*". So: a sentence with a correction underlined in
 * brand red, and two plain-language notes sliding in beneath it.
 */
function FeedbackSlide() {
  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: INTERIOR_START, ease: EASE }}
      >
        <SlideCard>
          <div className="flex items-center justify-between gap-3">
            <SlideLabel>Writing Task 2</SlideLabel>
            <motion.span
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: INTERIOR_START + 0.9, ease: EASE }}
            >
              <Sparkles className="size-3" />
              Reviewed
            </motion.span>
          </div>

          {/* the marked-up line */}
          <p className="mt-4 text-[13px] leading-relaxed text-gray-900">
            Governments should invest in{" "}
            <span className="relative inline-block">
              public transport
              <motion.span
                className="absolute -bottom-0.5 left-0 h-[2px] w-full origin-left rounded-full bg-brand-600"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, delay: INTERIOR_START + 0.35, ease: EASE }}
              />
            </span>{" "}
            rather than new roads.
          </p>

          <motion.div
            variants={staggerGroup(0.1, INTERIOR_START + 0.6)}
            initial="hidden"
            animate="visible"
            className="mt-4 space-y-2"
          >
            {NOTES.map((note) => (
              <SlideItem key={note.text} variants={slideInItem}>
                <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-2.5 py-2">
                  <motion.span
                    className={
                      note.positive
                        ? "mt-[3px] size-1.5 shrink-0 rounded-full bg-brand-600"
                        : "mt-[3px] size-1.5 shrink-0 rounded-full bg-gray-300"
                    }
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ ...SPRING_SOFT, delay: INTERIOR_START + 0.8 }}
                  />
                  <span className="text-[11.5px] leading-snug text-gray-600">
                    {note.text}
                  </span>
                </div>
              </SlideItem>
            ))}
          </motion.div>
        </SlideCard>
      </motion.div>
    </div>
  );
}

export default FeedbackSlide;
