import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { fieldShadow, formItem } from "./motionVariants";

/**
 * One labelled field, shared by the sign-in and sign-up forms.
 *
 * Built on the app's own `Input` and `Label`, so height, radius, border and
 * disabled treatment match any settings form in the dashboard. Exactly two of
 * the Input's defaults are overridden: the focus ring is switched off and the
 * shadow removed, because the wrapper supplies both — one soft 8% halo instead
 * of a hard ring stacked on a second shadow.
 *
 * Focus is held in state rather than read from `focus-within`, so the halo, the
 * border and the icon tint all move off a single source of truth. Nothing here
 * resizes or moves on focus; only colour and shadow change.
 */
function AuthInput({ id, label, icon: Icon, error, hint, trailing, ...inputProps }) {
  const [focused, setFocused] = useState(false);
  const state = error ? "error" : focused ? "focus" : "rest";

  return (
    <motion.div variants={formItem} className="space-y-2">
      <Label htmlFor={id} className="text-[13px] text-gray-700">
        {label}
      </Label>

      <motion.div
        variants={fieldShadow}
        initial={false}
        animate={state}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative rounded-md"
      >
        <Icon
          className={cn(
            "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-200",
            error ? "text-destructive" : focused ? "text-brand-600" : "text-gray-400"
          )}
        />
        <Input
          id={id}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            // `transition-colors` replaces the component's own
            // `transition-[color,box-shadow]` so the *border* eases too, at the
            // same 200ms as the halo. The shadow moves to the wrapper, so
            // nothing is lost in the swap, and the invalid border still comes
            // from the Input's built-in `aria-invalid:` rule.
            "h-11 bg-white pl-10 text-[15px] shadow-none transition-colors duration-200 focus-visible:ring-0",
            trailing ? "pr-11" : "pr-3"
          )}
          {...inputProps}
        />
        {trailing}
      </motion.div>

      {/* The message sits directly under its own field — never as a toast, and
          never pooled with the other fields' problems. `height: auto` rather
          than a reserved slot: an empty 18px gap under every input on a
          six-field form reads as broken spacing. */}
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            id={`${id}-error`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden text-[12.5px] leading-snug text-destructive-text"
          >
            {error}
          </motion.p>
        ) : (
          hint && (
            <p className="text-[12px] leading-snug text-gray-500">{hint}</p>
          )
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default AuthInput;
