import { Link } from "react-router-dom";
import { MotionConfig, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthShowcase from "./AuthShowcase";
import GradientBackground from "./GradientBackground";
import { backChevronMotion, formItem } from "./motionVariants";

/**
 * The shell both auth screens sit in: sign-in and sign-up are the same page with
 * a different form, so the split, the showcase and the back control live here
 * once rather than being kept in sync across two files.
 *
 * Split is 45/55 from `lg`, 40/60 from `md`; below `md` the showcase is not
 * rendered at all, because on a phone the only thing worth showing is the form.
 *
 * From `md` up the page is exactly one viewport tall and does not scroll: the
 * wrapper is `h-[100dvh] overflow-hidden` and the form column carries its own
 * `overflow-y-auto`, so a short window scrolls that column rather than the page.
 */
function AuthLayout({ children, slides, showBackButton = true }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex min-h-[100dvh] w-full overflow-x-hidden bg-white md:h-[100dvh] md:min-h-0 md:overflow-hidden">
        {/* Back to the landing page. Anchored to the top-left of the *page*, not
            of either panel, so it sits over the showcase on desktop and over the
            form on mobile. It is a sibling of both columns with a higher
            z-index, which is what lets one control serve both.

            `to="/"` rather than `navigate(-1)`: the landing page is the intended
            destination, and history-back lands wherever the user came from —
            which, after an auth redirect, is often this same page. */}
        {showBackButton && (
          <motion.div
            variants={formItem}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="absolute left-5 top-5 z-20 sm:left-6 sm:top-6"
          >
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 rounded-full border border-border bg-white/70 px-3.5 text-[13px] font-medium text-gray-600 backdrop-blur-sm hover:bg-brand-50 hover:text-brand-700"
            >
              <Link to="/" aria-label="Back to home">
                <motion.span variants={backChevronMotion} className="flex">
                  <ChevronLeft className="size-4" />
                </motion.span>
                Back
              </Link>
            </Button>
          </motion.div>
        )}

        {/* The form is first in the DOM and pulled right with `order`, so a
            keyboard lands on the first field rather than tabbing through the
            carousel indicators to reach it. */}
        <main className="relative flex w-full items-center justify-center px-6 py-16 sm:px-10 md:order-2 md:h-full md:w-[60%] md:overflow-y-auto md:py-12 lg:w-[55%] lg:px-16">
          <GradientBackground variant="form" />
          {children}
        </main>

        <AuthShowcase
          slides={slides}
          className="hidden shrink-0 border-r border-black/[0.05] md:order-1 md:flex md:h-full md:w-[40%] lg:w-[45%]"
        />
      </div>
    </MotionConfig>
  );
}

export default AuthLayout;
