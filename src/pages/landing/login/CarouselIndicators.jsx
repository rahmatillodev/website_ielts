import { motion } from "framer-motion";
import { EASE } from "./motionVariants";

/**
 * Four dots; the active one stretches into a bar.
 *
 * Width is animated here, which the rest of the page avoids — but these are
 * 6-to-20px elements with nothing laid out after them on the cross axis, so the
 * reflow is confined to the strip itself and costs nothing. Doing it with
 * `scaleX` instead would squash the rounded caps.
 */
function CarouselIndicators({ slides, activeIndex, onSelect, className }) {
  return (
    <div role="group" aria-label="Product highlights" className={className}>
      <div className="flex items-center gap-2">
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => onSelect(index)}
              aria-label={slide.title}
              aria-current={isActive}
              className="group flex h-5 cursor-pointer items-center outline-none"
            >
              <motion.span
                className={
                  isActive
                    ? "block h-1.5 rounded-full bg-brand-600 group-focus-visible:ring-[3px] group-focus-visible:ring-ring/40"
                    : "block h-1.5 rounded-full bg-gray-200 transition-colors duration-200 group-hover:bg-gray-300 group-focus-visible:ring-[3px] group-focus-visible:ring-ring/40"
                }
                initial={false}
                animate={{ width: isActive ? 20 : 6 }}
                transition={{ duration: 0.35, ease: EASE }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CarouselIndicators;
