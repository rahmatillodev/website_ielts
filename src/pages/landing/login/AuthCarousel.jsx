import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import CarouselIndicators from "./CarouselIndicators";
import ShowcaseSlide from "./ShowcaseSlide";
import { slideVariants, slideVariantsReduced } from "./motionVariants";

const SLIDE_DURATION = 5000;

/**
 * The auto-advancing player.
 *
 * `mode="wait"` — the outgoing slide finishes its exit before the incoming one
 * begins, so the two are never composited on top of each other and there is no
 * moment of doubled text. The trade is a short beat with the stage empty, which
 * is why the container height is fixed: nothing collapses during the handover.
 *
 * The interval is keyed on `index`, so it is torn down and restarted whenever
 * the slide changes — which is what makes clicking an indicator reset the full
 * five seconds instead of cutting away a moment later.
 *
 * Under reduced motion the carousel keeps advancing (the content is the point)
 * but crosses over with a plain fade.
 */
function AuthCarousel({ slides, className }) {
  const [index, setIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const id = setInterval(
      () => setIndex((current) => (current + 1) % slides.length),
      SLIDE_DURATION
    );
    return () => clearInterval(id);
  }, [index, slides.length]);

  const handleSelect = useCallback((next) => setIndex(next), []);

  const slide = slides[index];
  const { Visual } = slide;
  const variants = prefersReducedMotion ? slideVariantsReduced : slideVariants;

  return (
    <div className={cn("w-full max-w-[26rem]", className)}>
      {/* Fixed-size stage, but deliberately *not* clipped: the exit blur would
          be sliced at the edge, and the clip that matters — the one keeping
          visuals out of the copy — belongs to the visual area inside
          `ShowcaseSlide`. The panel's own `overflow-hidden` still contains the
          28px exit travel, so nothing can reach the page edge. */}
      <div className="relative h-[28.5rem] lg:h-[27rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slide.id}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0"
          >
            <ShowcaseSlide title={slide.title} subtitle={slide.subtitle}>
              <Visual />
            </ShowcaseSlide>
          </motion.div>
        </AnimatePresence>
      </div>

      <CarouselIndicators
        slides={slides}
        activeIndex={index}
        onSelect={handleSelect}
        className="mt-10"
      />
    </div>
  );
}

export default AuthCarousel;
