import { cn } from "@/lib/utils";

/**
 * The prototype's one container: `max-width:1180px; margin:0 auto; padding:0 32px`.
 *
 * Every section in the design repeats that exact declaration, so it lives here
 * once. The only change is the gutter below `sm` — the prototype is authored at
 * desktop width and hard-codes 32px, which is too tight against the edge on a
 * 375px screen.
 */
function Container({ className, children }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1180px] px-6 sm:px-8", className)}>
      {children}
    </div>
  );
}

export default Container;
