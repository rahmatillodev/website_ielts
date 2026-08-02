import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Square, Circle, Diamond } from "lucide-react";
import Container from "./Container";
import JourneyVisual from "./JourneyVisual";
import { EASE } from "./motion";

/**
 * The hero, from the prototype.
 *
 * Spec: a `linear-gradient(180deg,#FFF6F5 0%,#FFFFFF 78%)` wash, a 1.02fr/0.98fr
 * split with a 56px gutter, and 150px/90px of vertical padding. The headline is
 * `clamp(40px,4.4vw,56px)` at weight 800 and `-0.025em`, with only the final
 * word in the accent.
 *
 * The three proof points below the buttons use bare geometric marks in the
 * prototype — a square, a circle and a rotated square — rather than icons with
 * meaning. Kept as texture; swapping in literal check marks would change the
 * composition's weight.
 *
 * The hero animates on load rather than on scroll (it is already in view), on
 * the same curve and distance as every `[data-reveal]` block further down.
 */

const PROOF = [
  { label: "4 IELTS skills", Icon: Square },
  { label: "Full mock tests", Icon: Circle },
  { label: "Actionable feedback", Icon: Diamond },
];

function HeroSection() {
  return (
    <header id="top" className="bg-[linear-gradient(180deg,#FFF6F5_0%,#FFFFFF_78%)]">
      <Container className="grid grid-cols-1 items-center gap-12 pb-16 pt-28 sm:pb-20 sm:pt-32 lg:grid-cols-[1.02fr_.98fr] lg:gap-14 lg:pb-[90px] lg:pt-[150px]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <p className="mb-5 text-[12px] font-extrabold uppercase tracking-[0.14em] text-primary">
            IELTS preparation, made clearer
          </p>

          {/*
            The prototype sets this `clamp(40px,4.4vw,56px)` in Manrope. This
            project's face is Poppins, which is materially wider at the same
            size: at 56px "Prepare with purpose." needs roughly 600px and the
            column is ~540px, so it broke into four lines instead of the
            designed two.

            The ceiling drops to 44px, which is the largest size that still sets
            the line the prototype intends. `text-balance` is also gone — with
            an explicit <br> already deciding where the break falls, balancing
            only fights it.

            Switching the landing page to Manrope would restore the full 56px,
            at the cost of a second font family and a face that no longer
            matches Login, Sign Up and the dashboard.
          */}
          <h1 className="text-[clamp(2rem,3.1vw,2.5rem)] font-extrabold leading-[1.08] tracking-[-0.025em] text-gray-900">
            Prepare with purpose.
            <br />
            Perform with <span className="text-primary">confidence.</span>
          </h1>

          <p className="mt-[22px] max-w-[42ch] text-pretty text-[16.5px] leading-[1.65] text-gray-600">
            Practice every IELTS skill, get focused feedback, and understand
            exactly what to improve.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-[14.5px] font-bold text-primary-foreground shadow-[0_8px_22px_rgba(227,6,19,.24)] outline-none transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(227,6,19,.3)] focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Start free practice
              <span aria-hidden="true">→</span>
            </Link>

            <a
              href="#how"
              className="inline-flex items-center justify-center rounded-lg border-[1.5px] border-gray-900/15 px-[22px] py-3.5 text-[14.5px] font-bold text-gray-900 outline-none transition-colors duration-200 hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Explore the platform
            </a>
          </div>

          {/*
            The prototype draws these three marks as hairline CSS boxes at the
            same grey as the label. Rendered as Lucide outlines at that weight
            they stopped reading as marks and started reading as empty
            checkboxes waiting to be ticked.

            The fix keeps the prototype's geometry — square, circle, diamond —
            but tints them with the accent and lifts the label to a legible
            grey, so the row reads as three proof points rather than an unfilled
            form.
          */}
          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-[13px] font-semibold text-gray-500">
            {PROOF.map(({ label, Icon }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon
                  className="size-[13px] shrink-0 text-primary"
                  strokeWidth={2.25}
                  aria-hidden="true"
                />
                {label}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12, ease: EASE }}
        >
          <JourneyVisual />
        </motion.div>
      </Container>
    </header>
  );
}

export default HeroSection;
