import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Container from "./Container";
import { EASE, inView, revealUp } from "./motion";
import { STORIES } from "./stories";

/**
 * "Real students. Real progress." — the prototype's section, rebuilt as a
 * looping carousel.
 *
 * The card design is unchanged: `#FAFAFB` ground, hairline border, 16px radius,
 * quote first, attribution pinned to the bottom, band delta as a badge. Only the
 * container around them is new.
 *
 * How the infinite loop works, and why it is built this way:
 *
 *   The track renders the full list plus a clone of the first `perView` cards.
 *   The index runs 0 → N, so the step from N-1 to N slides onto the clones,
 *   which are pixel-identical to the real first cards. `onAnimationComplete`
 *   then snaps the index back to 0 with the transition switched off, so the
 *   reset is invisible. The alternative — wrapping the index modulo N — makes
 *   the track run backwards through every card whenever it passes the end.
 *
 * On layout stability: every card is in the DOM at all times and the track is a
 * flex row, so the row's height is the tallest card in the *whole* set, not the
 * tallest currently visible. Advancing the carousel therefore cannot change the
 * section's height, no matter how uneven the quotes are.
 */

/** Autoplay dwell. Long enough to read a card at a glance without hurrying. */
const AUTOPLAY_MS = 5200;

function useCardsPerView() {
  const read = () => {
    if (typeof window === "undefined") return 3;
    if (window.matchMedia("(min-width: 1024px)").matches) return 3;
    if (window.matchMedia("(min-width: 640px)").matches) return 2;
    return 1;
  };

  const [perView, setPerView] = useState(read);

  useEffect(() => {
    const queries = [
      window.matchMedia("(min-width: 1024px)"),
      window.matchMedia("(min-width: 640px)"),
    ];
    const update = () => setPerView(read());
    queries.forEach((q) => q.addEventListener("change", update));
    return () => queries.forEach((q) => q.removeEventListener("change", update));
  }, []);

  return perView;
}

function StoriesSection() {
  const reduceMotion = useReducedMotion();
  const perView = useCardsPerView();
  const total = STORIES.length;

  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(true);
  const [paused, setPaused] = useState(false);

  // The clones that make the wrap seamless.
  const slides = [...STORIES, ...STORIES.slice(0, perView)];

  /**
   * Both wraps switch the transition off for the jump and leave it off. There
   * is nothing to re-enable it *for* until the next move, and every entry point
   * — the arrows, a swipe, the autoplay tick — turns it back on before it
   * changes the index. Re-arming it eagerly is what forced the earlier
   * setState-inside-an-effect that ESLint (rightly) rejected.
   */
  const next = useCallback(() => {
    setAnimating(true);
    setIndex((i) => i + 1);
  }, []);

  const prev = useCallback(() => {
    // Stepping back from the first card jumps to the end, untransitioned — for
    // the same reason the forward wrap is: sliding backwards through all ten
    // cards would be absurd.
    if (index === 0) {
      setAnimating(false);
      setIndex(total - 1);
      return;
    }
    setAnimating(true);
    setIndex(index - 1);
  }, [index, total]);

  /** Jump straight to a card from its dot. */
  const goTo = useCallback((target) => {
    setAnimating(true);
    setIndex(target);
  }, []);

  // Autoplay. Stops while hovered or focused, while the tab is hidden, and
  // entirely under reduced motion.
  useEffect(() => {
    if (reduceMotion || paused) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") next();
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [reduceMotion, paused, next]);

  // Landing on a clone: snap back to the real card, transition off. This runs
  // from Framer's animation callback, not an effect.
  const handleAnimationComplete = () => {
    if (index < total) return;
    setAnimating(false);
    setIndex(0);
  };

  const activeDot = index % total;

  return (
    <section id="stories" className="scroll-mt-16 bg-white">
      <Container className="pb-20 sm:pb-24 lg:pb-[110px]">
        <motion.div
          variants={revealUp}
          initial="hidden"
          whileInView="visible"
          viewport={inView}
          className="mb-10 text-center sm:mb-12"
        >
          <p className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.14em] text-primary">
            Success stories
          </p>
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-gray-900 sm:text-[32px]">
            Real students. Real progress.
          </h2>
        </motion.div>

        <motion.div
          variants={revealUp}
          initial="hidden"
          whileInView="visible"
          viewport={inView}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          {/* `-mx-2.5` cancels the per-slide padding that creates the gutter, so
              the first card still aligns to the container edge. */}
          <div className="-mx-2.5 overflow-hidden">
            <motion.div
              animate={{ x: `-${index * (100 / perView)}%` }}
              transition={
                animating && !reduceMotion
                  ? { duration: 0.62, ease: EASE }
                  : { duration: 0 }
              }
              onAnimationComplete={handleAnimationComplete}
            >
              {/*
                Paging and dragging live on two different elements on purpose.
                Sharing one `x` leaves the track parked wherever the finger let
                go whenever a drag falls short of the threshold: the index has
                not changed, so the `animate` target is identical to what it
                already was and there is nothing to animate back to.
              */}
              <motion.ul
                className="flex items-stretch"
                drag={reduceMotion ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.12}
                dragMomentum={false}
                dragSnapToOrigin
                onDragStart={() => setPaused(true)}
                onDragEnd={(_, info) => {
                  setPaused(false);
                  if (info.offset.x < -55 || info.velocity.x < -400) next();
                  else if (info.offset.x > 55 || info.velocity.x > 400) prev();
                }}
              >
                {slides.map((story, i) => (
                  <li
                    key={`${story.name}-${i}`}
                    className="w-full shrink-0 px-2.5 sm:w-1/2 lg:w-1/3"
                    // The clones duplicate content that is already in the list.
                    aria-hidden={i >= total ? "true" : undefined}
                  >
                    <StoryCard story={story} />
                  </li>
                ))}
              </motion.ul>
            </motion.div>
          </div>

          {/*
            Dots only — the arrows are gone.

            They are buttons rather than decoration, because removing the arrows
            would otherwise leave a pointer user with no manual control at all:
            swipe covers touch, and autoplay covers nobody who wants to go back
            to the card that just left. The dot itself is unchanged, so this
            costs nothing visually.

            The generous `px-1.5 py-3` is the hit area, not spacing — a 6px dot
            is far below any usable touch target, and the padding lifts each
            control to roughly 30px tall without moving the dots apart.
          */}
          <div
            className="mt-6 flex items-center justify-center"
            role="group"
            aria-label={`Story ${activeDot + 1} of ${total}`}
          >
            {STORIES.map((story, i) => (
              <button
                key={story.name}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to story ${i + 1}`}
                aria-current={i === activeDot ? "true" : undefined}
                className="group/dot cursor-pointer px-1.5 py-3 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <span
                  className={[
                    "block h-1 rounded-full transition-all duration-300",
                    i === activeDot
                      ? "w-5 bg-primary"
                      : "w-1.5 bg-gray-900/15 group-hover/dot:bg-gray-900/30",
                  ].join(" ")}
                />
              </button>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

function StoryCard({ story }) {
  return (
    <figure className="flex h-full flex-col gap-[18px] rounded-2xl border border-border bg-[#FAFAFB] p-6 transition-colors duration-300 hover:border-gray-900/15 sm:p-7">
      <blockquote className="text-pretty text-[14px] leading-[1.65] text-gray-900">
        “{story.quote}”
      </blockquote>

      <figcaption className="mt-auto flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-brand-50 text-[13px] font-extrabold text-primary">
            {story.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-extrabold text-gray-900">{story.name}</p>
            <p className="mt-0.5 truncate text-[12px] text-gray-400">{story.role}</p>
          </div>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-md bg-success-subtle px-2.5 py-1.5 text-[12px] font-extrabold tabular-nums text-success-text">
          {story.delta}
        </span>
      </figcaption>
    </figure>
  );
}

export default StoriesSection;
