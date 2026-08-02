import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { backgroundDrift } from "./motionVariants";

/**
 * The page canvas — CSS only, no image assets.
 *
 *   1. base      a flat white (the panel a half-shade warmer than the form)
 *   2. radials   two very soft gradients, brand red held at 5-6%
 *   3. shape     one blurred circle, the only blur on the page
 *   4. texture   a hairline grid or a grain filter, at 2-3%
 *
 * Only the drift layer moves: 12px over 18 seconds, translation only. The
 * texture and the base stay put, so nothing crawls.
 *
 * Reds resolve through `color-mix` on the brand token, so this is literally the
 * same red as the dashboard, diluted, and it follows the token if it moves.
 */

const VARIANTS = {
  /** Left showcase panel. */
  panel: {
    base: "#fdfcfb",
    radials: [
      "radial-gradient(85% 55% at 18% 6%, color-mix(in oklab, var(--brand-500) 6%, transparent), transparent 66%)",
      "radial-gradient(65% 50% at 90% 94%, color-mix(in oklab, var(--brand-500) 4%, transparent), transparent 70%)",
    ],
    shape: {
      color: "color-mix(in oklab, var(--brand-400) 10%, transparent)",
      className: "-right-24 top-[18%] h-72 w-72 blur-[70px]",
    },
    grid: true,
    grain: 0,
  },

  /** Right form panel — white, with one whisper in the far corner. */
  form: {
    base: "#ffffff",
    radials: [
      "radial-gradient(55% 40% at 100% 0%, color-mix(in oklab, var(--brand-500) 3.5%, transparent), transparent 72%)",
      "radial-gradient(50% 40% at 0% 100%, rgba(120,113,108,0.04), transparent 74%)",
    ],
    shape: null,
    grid: false,
    grain: 0,
  },
};

function GradientBackground({ variant = "panel", className }) {
  const prefersReducedMotion = useReducedMotion();
  const grainId = useId().replace(/:/g, "");
  const config = VARIANTS[variant] ?? VARIANTS.panel;

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={{ backgroundColor: config.base }}
    >
      {/* The one moving layer. Transform only, so it composites and never
          triggers layout. */}
      <motion.div
        className="absolute -inset-8 will-change-transform"
        style={{ backgroundImage: config.radials.join(", ") }}
        animate={prefersReducedMotion ? undefined : backgroundDrift.animate}
        transition={prefersReducedMotion ? undefined : backgroundDrift.transition}
      >
        {config.shape && (
          <span
            className={cn("absolute rounded-full", config.shape.className)}
            style={{ backgroundColor: config.shape.color }}
          />
        )}
      </motion.div>

      {/* Hairline grid, masked to a soft ellipse so it has no visible edge. It
          reads as paper rather than as a grid — which is the point. */}
      {config.grid && (
        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(16,24,40,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,24,40,0.035) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(72% 60% at 50% 45%, #000 0%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(72% 60% at 50% 45%, #000 0%, transparent 100%)",
          }}
        />
      )}

      {config.grain > 0 && (
        <svg className="absolute inset-0 h-full w-full" style={{ opacity: config.grain }}>
          <filter id={grainId}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#${grainId})`} />
        </svg>
      )}
    </div>
  );
}

export default GradientBackground;
