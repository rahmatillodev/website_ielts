import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { arrowMotion, buttonMotion, formItem } from "./motionVariants";

/**
 * The primary action on both auth forms.
 *
 * Two nested wrappers, not one: the outer carries the staggered entrance, the
 * inner the hover lift. A single element can hold only one variant set, and the
 * hover states have to be *named* — that is what lets the arrow, several levels
 * down inside the Button, follow the same hover through variant propagation.
 *
 * The fill is the Button's own `bg-primary`, the same red as every primary
 * action in the dashboard. `hover:bg-primary` cancels the component's default
 * darkening to brand-700: here the hover feedback is the 1px lift and the
 * shadow, not a colour change.
 */
function AuthSubmitButton({ loading, label, pendingLabel }) {
  return (
    <motion.div variants={formItem} className="pt-1">
      <motion.div
        variants={buttonMotion}
        initial="rest"
        animate="rest"
        whileHover={loading ? undefined : "hover"}
        whileTap={loading ? undefined : "tap"}
      >
        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full text-[15px] font-medium shadow-[0_2px_8px_rgba(227,6,19,0.08)] duration-200 hover:bg-primary hover:shadow-[0_6px_16px_rgba(227,6,19,0.10)] active:bg-primary"
        >
          <span className="flex items-center justify-center gap-2">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={loading ? "pending" : "idle"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                {loading ? pendingLabel : label}
              </motion.span>
            </AnimatePresence>

            {loading ? (
              <motion.span
                className="flex"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="size-4" />
              </motion.span>
            ) : (
              <motion.span variants={arrowMotion} className="flex">
                <ArrowRight className="size-4" />
              </motion.span>
            )}
          </span>
        </Button>
      </motion.div>
    </motion.div>
  );
}

export default AuthSubmitButton;
