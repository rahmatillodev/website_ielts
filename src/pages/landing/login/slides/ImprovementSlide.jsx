import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { EASE, INTERIOR_START } from "../motionVariants";
import { SlideCard, SlideChip, SlideLabel } from "./SlidePrimitives";

const BANDS = [5.5, 5.9, 6.2, 6.5, 6.4, 6.9, 7.2, 7.5];
const CHART_W = 260;
const CHART_H = 68;

/** Cubic path through the points, control points pinned to the midpoints. */
function buildSmoothPath(points) {
  return points.reduce((path, point, index, all) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = all[index - 1];
    const midX = (previous.x + point.x) / 2;
    return `${path} C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

/**
 * Slide 4 — one line, eight points, one score, one badge.
 *
 * The line draws with `pathLength` over 1.1s and the points pop in behind it at
 * 0.08s intervals, paced so each lands roughly where the line has just reached.
 * The area fill and the badge both wait for the draw to finish, so the sequence
 * resolves rather than piling up. One series, one colour: the app's brand red.
 */
function ImprovementSlide() {
  const { linePath, areaPath, points } = useMemo(() => {
    const min = 5;
    const max = 8;
    const mapped = BANDS.map((band, index) => ({
      x: (index / (BANDS.length - 1)) * CHART_W,
      y: CHART_H - ((band - min) / (max - min)) * (CHART_H - 14) - 7,
    }));
    const line = buildSmoothPath(mapped);
    return {
      linePath: line,
      areaPath: `${line} L ${CHART_W} ${CHART_H} L 0 ${CHART_H} Z`,
      points: mapped,
    };
  }, []);

  return (
    // A plain root: every element in this slide sequences off its own explicit
    // delay, so there are no variant children for a stagger group to drive.
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: INTERIOR_START, ease: EASE }}
      >
        <SlideCard>
          <div className="flex items-end justify-between gap-3">
            <div>
              <SlideLabel>Current band</SlideLabel>
              <motion.span
                className="mt-2 block text-[1.75rem] font-semibold leading-none tracking-tight text-gray-900"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: INTERIOR_START + 0.25, ease: EASE }}
              >
                7.5
              </motion.span>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: INTERIOR_START + 1.5, ease: EASE }}
            >
              <SlideChip icon={TrendingUp}>+0.5</SlideChip>
            </motion.div>
          </div>

          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            className="mt-5 h-[68px] w-full overflow-visible"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="login-band-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand-600)" stopOpacity="0.12" />
                <stop offset="100%" stopColor="var(--brand-600)" stopOpacity="0" />
              </linearGradient>
            </defs>

            <motion.path
              d={areaPath}
              fill="url(#login-band-fill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: INTERIOR_START + 1.2, ease: EASE }}
            />

            <motion.path
              d={linePath}
              fill="none"
              stroke="var(--brand-600)"
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.1, delay: INTERIOR_START + 0.3, ease: EASE }}
            />

            {points.map((point, index) => (
              <motion.circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={index === points.length - 1 ? 3.5 : 2.5}
                fill="#ffffff"
                stroke="var(--brand-600)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                style={{ transformOrigin: `${point.x}px ${point.y}px` }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  duration: 0.35,
                  delay: INTERIOR_START + 0.45 + index * 0.08,
                  ease: EASE,
                }}
              />
            ))}
          </svg>

          <motion.p
            className="mt-3 text-[11px] text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: INTERIOR_START + 1.55, ease: EASE }}
          >
            +0.5 band over the last 8 weeks
          </motion.p>
        </SlideCard>
      </motion.div>
    </div>
  );
}

export default ImprovementSlide;
