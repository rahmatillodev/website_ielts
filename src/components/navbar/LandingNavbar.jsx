import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { EASE } from "@/components/landing/motion";

/**
 * The landing navbar, from the Claude Design prototype.
 *
 * Prototype spec: fixed, 64px tall, `rgba(255,255,255,.85)` over a 14px
 * backdrop blur, one hairline beneath, and a three-column grid — brand left,
 * links centred, actions right — inside the shared 1180px container.
 *
 * Rendered only on `/` (LandingLayout hides it on every auth route), so it is
 * free to be a landing component rather than an app shell.
 *
 * Two departures, both because the prototype is authored desktop-only:
 * the links collapse into a sheet below `lg`, and the anchors scroll smoothly
 * (the prototype sets `html{scroll-behavior:smooth}` globally, which would also
 * apply to the dashboard and the timed practice screens in this app).
 */

const LINKS = [
  { label: "Why EDU", href: "#why" },
  { label: "How it works", href: "#how" },
  { label: "Practice", href: "#skills" },
  { label: "Results", href: "#mock" },
  { label: "Stories", href: "#stories" },
];

function LandingNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  // A fixed sheet over a scrollable page: without this the page behind the open
  // menu still scrolls under the user's finger.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const close = () => setMenuOpen(false);

  const handleAnchorClick = (event, href) => {
    const target = document.querySelector(href);
    if (!target) return;
    event.preventDefault();
    close();
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-white/85 backdrop-blur-[14px]">
      <div className="mx-auto grid h-16 w-full max-w-[1180px] grid-cols-[auto_1fr] items-center gap-6 px-6 sm:px-8 lg:grid-cols-[1fr_auto_1fr]">
        {/* Brand. The prototype sets the wordmark as type, not as the logo
            asset — 22px/800 in the accent, with a Beta pill beside it. */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/"
            onClick={close}
            className="text-[22px] font-extrabold tracking-[-0.02em] text-primary"
          >
            EDU
          </Link>
          <span className="rounded-full bg-primary px-[9px] py-[3px] text-[10.5px] font-bold tracking-[0.04em] text-primary-foreground">
            Beta
          </span>
        </div>

        <nav className="hidden justify-center gap-[34px] lg:flex">
          {LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              onClick={(event) => handleAnchorClick(event, href)}
              className="rounded-sm text-[13.5px] font-semibold text-gray-600 outline-none transition-colors duration-200 hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center justify-end gap-2.5 lg:flex">
          <Link
            to="/login"
            className="rounded-sm px-3.5 py-2 text-[13.5px] font-semibold text-gray-900 outline-none transition-colors duration-200 hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-primary px-[18px] py-2.5 text-[13.5px] font-bold text-primary-foreground outline-none transition-[filter,transform] duration-200 hover:-translate-y-px hover:brightness-[.92] focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="ml-auto flex size-10 items-center justify-center rounded-lg text-gray-700 outline-none transition-colors hover:bg-gray-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 lg:hidden"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="border-t border-border bg-white lg:hidden"
          >
            <div className="mx-auto max-h-[calc(100dvh-4rem)] w-full max-w-[1180px] overflow-y-auto px-6 py-6 sm:px-8">
              <ul className="space-y-1">
                {LINKS.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      onClick={(event) => handleAnchorClick(event, href)}
                      className="block rounded-lg px-3 py-3 text-[15px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>

              <div className="mt-5 space-y-2.5 border-t border-border pt-5">
                <Link
                  to="/login"
                  onClick={close}
                  className="block rounded-lg border border-gray-900/15 py-3 text-center text-[14.5px] font-bold text-gray-900 transition-colors hover:border-primary"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  onClick={close}
                  className="block rounded-lg bg-primary py-3 text-center text-[14.5px] font-bold text-primary-foreground transition-[filter] duration-200 hover:brightness-[.92]"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default LandingNavbar;
