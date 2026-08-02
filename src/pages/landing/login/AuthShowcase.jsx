import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import GradientBackground from "./GradientBackground";
import AuthCarousel from "./AuthCarousel";
import { EASE } from "./motionVariants";

/**
 * The left half of an auth screen: background plus the auto-advancing carousel.
 *
 * The slides are a prop, not an import. Sign-in and sign-up run the same
 * machinery over different content — one speaks to someone resuming, the other
 * to someone starting — and passing the deck in is what keeps that difference in
 * the page rather than smuggled into the carousel.
 *
 * Hidden below `md` by the parent: nothing here is load-bearing for signing in,
 * and on a phone the form deserves the whole viewport.
 */
function AuthShowcase({ slides, className }) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <GradientBackground variant="panel" />

      {/* A fade, with no movement: the first slide would otherwise pop in at
          full opacity while the form beside it is still staggering up. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        // `pt-20` rather than `py-10`: the back button floats over this panel's
        // top-left corner, and on a short window the centred content would
        // otherwise rise underneath it. With `justify-center` the extra padding
        // only takes effect once the content is tall enough to need it.
        className="relative z-10 flex h-full w-full flex-col justify-center px-10 pb-10 pt-20 lg:px-14 xl:px-20"
      >
        <AuthCarousel slides={slides} />
      </motion.div>
    </div>
  );
}

export default AuthShowcase;
