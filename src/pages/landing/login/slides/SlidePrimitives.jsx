import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE, riseItem } from "../motionVariants";

/**
 * The parts the four slide visuals are assembled from.
 *
 * Shared so the slides read as four views of one product rather than four
 * mockups. The surface recipe is the dashboard's own — `rounded-2xl
 * border-border bg-card` over the same 1px ambient shadow — with one extra
 * diffuse red-tinted lift so a card floats above the panel instead of looking
 * pasted onto it. That red is 10%, matching the hover shadows on dashboard
 * cards.
 */

export function SlideCard({ children, className }) {
  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-border bg-card p-5",
        "shadow-[0_1px_2px_rgba(16,24,40,0.04),0_24px_56px_-32px_rgba(227,6,19,0.10)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SlideLabel({ children, className }) {
  return (
    <span
      className={cn(
        "text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500",
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Brand-tinted pill. `shrink-0 whitespace-nowrap` is load-bearing: at 768px the
 * card is only ~185px wide inside its padding, and without it the flex row
 * squeezes the pill until its label wraps and it stops reading as a pill.
 */
export function SlideChip({ icon: Icon, children, className }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700",
        className
      )}
    >
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  );
}

/**
 * Neutral track, brand fill, grows once on entry.
 *
 * Animates `scaleX`, not `width`. Width is a layout property — animating it
 * reflows on every frame. The scale composites instead, and the origin is
 * pinned left so it still reads as filling left-to-right.
 */
export function SlideMeter({ value, delay = 0.35, duration = 0.8, className }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-gray-100", className)}>
      <motion.div
        className="h-full w-full origin-left rounded-full bg-brand-600"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: value / 100 }}
        transition={{ duration, delay, ease: EASE }}
      />
    </div>
  );
}

/** A staggered child inside a slide visual. Fades up once; never loops. */
export function SlideItem({ children, className, variants = riseItem }) {
  return (
    <motion.div variants={variants} className={className}>
      {children}
    </motion.div>
  );
}
