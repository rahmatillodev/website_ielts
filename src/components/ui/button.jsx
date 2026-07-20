import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // `disabled:opacity-50` stays as the fallback for variants that don't name an
  // explicit disabled fill; `disabled:cursor-not-allowed` replaces the inherited
  // pointer so a dead control stops advertising itself as clickable.
  "cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-ring-destructive/30 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Interaction states step along the ramp (600 -> 700 -> 800) rather than
        // fading the fill with /90. An opacity fade lets the page behind bleed
        // through, so the same button looked different on white vs. a tinted
        // card; stepping the ramp keeps hover identical everywhere and keeps the
        // white label above 4.5:1 at every step.
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active disabled:bg-primary-disabled disabled:text-white",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive-hover active:bg-destructive-active focus-visible:border-ring-destructive focus-visible:ring-ring-destructive/50",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground active:bg-primary-subtle-hover hover:border-primary-border dark:bg-input/30 dark:border-input",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:bg-primary-subtle-hover",
        link: "text-primary-text underline-offset-4 hover:underline active:text-primary-active",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Button, buttonVariants }
