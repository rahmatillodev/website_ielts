import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { subtitleMotion, titleMotion } from "./motionVariants";

/**
 * The shell every slide is poured into.
 *
 * Two fixed-height areas, stacked and never overlapping: the visual on top, the
 * copy underneath. Both heights are hard-set rather than content-driven, which
 * is what guarantees the four slides have identical dimensions — the cards
 * differ by ~60px and the titles wrap to different line counts, so anything
 * content-driven would shift the indicator strip on every change.
 *
 * Only the visual area clips, and that is deliberate: it is what lets a slide
 * animate freely inside its box — floating chips hanging off a card corner, a
 * chart drawing past its bounds — with a hard guarantee that nothing can reach
 * the heading below it.
 *
 * The heights carry the tallest case at each width: at 768px the panel is only
 * ~185px of usable card width, so the reading question wraps to three lines and
 * the subtitles to three — hence the extra 16px below `lg`.
 */
function ShowcaseSlide({ title, subtitle, children, className }) {
  return (
    <div className={cn("flex h-full w-full flex-col", className)}>
      <div className="relative flex h-[17rem] items-center justify-center overflow-hidden lg:h-64">
        {children}
      </div>

      <div className="mt-8 h-[9.5rem] lg:h-[9rem]">
        <motion.h2
          variants={titleMotion}
          initial="hidden"
          animate="visible"
          className="text-[1.5rem] font-semibold leading-[1.2] tracking-tight text-gray-900 lg:text-[1.75rem] xl:text-[1.875rem]"
        >
          {title}
        </motion.h2>
        <motion.p
          variants={subtitleMotion}
          initial="hidden"
          animate="visible"
          className="mt-3 max-w-[36ch] text-[14px] leading-relaxed text-gray-600 lg:text-[15px]"
        >
          {subtitle}
        </motion.p>
      </div>
    </div>
  );
}

export default ShowcaseSlide;
