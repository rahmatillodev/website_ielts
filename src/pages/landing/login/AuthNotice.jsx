import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formGroup, formItem } from "./motionVariants";

/**
 * A message panel that stands in for a form.
 *
 * Four of the auth screens end on a statement rather than a field — "check your
 * email" after sign-up, the same after requesting a reset link, and the
 * expired-link notice on /reset-password. They share one shape: a tinted icon
 * badge, a heading, a short explanation, one primary action, and a quiet line
 * underneath. Keeping that shape here is what stops the three from drifting
 * apart in spacing and weight as they get edited separately.
 *
 * It occupies the same column and the same entrance stagger as the forms, so
 * swapping a form out for a notice never moves the layout.
 */

/**
 * Both tones come from the existing palette: `brand` is the same pairing
 * `SignUpSuccess` already used, `warning` the semantic set defined in index.css.
 * No new colour is introduced by this component.
 */
const TONES = {
  brand: {
    badge: "bg-brand-50 ring-brand-100",
    icon: "text-brand-600",
  },
  warning: {
    badge: "bg-warning-subtle ring-warning-border",
    icon: "text-warning-text",
  },
};

function AuthNotice({
  icon: Icon,
  tone = "brand",
  title,
  children,
  action,
  footer,
  className,
}) {
  const palette = TONES[tone] ?? TONES.brand;

  return (
    <motion.div
      variants={formGroup}
      initial="hidden"
      animate="visible"
      className={cn(
        "relative z-10 w-full max-w-[23rem] md:max-w-[20rem] lg:max-w-[23rem]",
        className
      )}
    >
      <motion.div variants={formItem}>
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-full ring-1",
            palette.badge
          )}
        >
          <Icon className={cn("size-5", palette.icon)} />
        </span>
      </motion.div>

      <motion.h1
        variants={formItem}
        className="mt-7 text-2xl font-semibold tracking-tight text-gray-900 sm:text-[1.75rem]"
      >
        {title}
      </motion.h1>

      <motion.div
        variants={formItem}
        className="mt-3 text-[15px] leading-relaxed text-gray-600"
      >
        {children}
      </motion.div>

      {action && (
        <motion.div variants={formItem} className="mt-7">
          {action}
        </motion.div>
      )}

      {footer && (
        <motion.div
          variants={formItem}
          className="mt-6 text-center text-[13px] text-gray-500"
        >
          {footer}
        </motion.div>
      )}
    </motion.div>
  );
}

export default AuthNotice;
