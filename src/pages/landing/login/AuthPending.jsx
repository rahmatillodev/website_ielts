import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formGroup, formItem } from "./motionVariants";

/**
 * The waiting state, for the moment /reset-password spends checking whether the
 * recovery link produced a session.
 *
 * It sits in the same column, at the same width, with the same entrance as the
 * form it will be replaced by, so the panel does not jump when the answer
 * arrives. The old page rendered a bare centred "Loading..." on a white page
 * with no showcase beside it, which read as a different screen entirely.
 */
function AuthPending({ label = "Just a moment…", className }) {
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
      <motion.div variants={formItem} className="flex items-center gap-3">
        <motion.span
          className="flex"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="size-5 text-brand-600" />
        </motion.span>
        <span className="text-[15px] text-gray-600">{label}</span>
      </motion.div>
    </motion.div>
  );
}

export default AuthPending;
