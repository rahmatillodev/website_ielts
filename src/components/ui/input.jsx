import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        // An invalid field must not wear the brand focus ring, or a validation
        // error and a merely-focused field look the same. Swap the whole ring to
        // the danger hue while invalid.
        "aria-invalid:border-destructive aria-invalid:ring-ring-destructive/30 aria-invalid:focus-visible:border-ring-destructive aria-invalid:focus-visible:ring-ring-destructive/50",
        className
      )}
      {...props} />
  );
}

export { Input }
