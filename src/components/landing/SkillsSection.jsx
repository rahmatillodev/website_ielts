import { motion } from "framer-motion";
import { Headphones, BookOpen, PenLine, Mic } from "lucide-react";
import Container from "./Container";
import { inView, revealUp } from "./motion";

/**
 * "Everything you need in one place" — from the prototype.
 *
 * Spec: a 280px/1fr split with a 64px gutter, and four equal columns divided by
 * hairline left-borders. Each column is an icon, a heading, a line of copy, and
 * an accent link — and unlike the "Why EDU" tiles above, these icons are drawn
 * in the ink colour with no tinted backing, which is what keeps two
 * four-across sections from reading as the same block twice.
 */

const SKILLS = [
  {
    name: "Listening",
    Icon: Headphones,
    body: "Timed audio practice with question review and transcripts.",
  },
  {
    name: "Reading",
    Icon: BookOpen,
    body: "Focused passages with real test style questions.",
  },
  {
    name: "Writing",
    Icon: PenLine,
    body: "Structured tasks with sample answers and feedback.",
  },
  {
    name: "Speaking",
    Icon: Mic,
    body: "Guided speaking practice with AI evaluation.",
  },
];

function SkillsSection() {
  return (
    <section id="skills" className="scroll-mt-16 bg-white">
      <Container className="grid grid-cols-1 items-start gap-12 py-20 sm:py-24 lg:grid-cols-[280px_1fr] lg:gap-16 lg:py-[110px]">
        <motion.div variants={revealUp} initial="hidden" whileInView="visible" viewport={inView}>
          <p className="mb-3.5 text-[12px] font-extrabold uppercase tracking-[0.14em] text-primary">
            Practice every IELTS skill
          </p>
          <h2 className="text-balance text-[26px] font-extrabold leading-[1.2] tracking-[-0.02em] text-gray-900 sm:text-[32px]">
            Everything you need in one place.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {SKILLS.map(({ name, body, Icon }) => (
            <motion.article
              key={name}
              variants={revealUp}
              initial="hidden"
              whileInView="visible"
              viewport={inView}
              /*
                The hairline follows whichever column count is active, expressed
                as breakpoint rules rather than per-index branches — the earlier
                version hard-coded which of the four got which border and broke
                the moment the grid changed shape.

                  stacked  a rule above every item but the first
                  2-up     the first row loses its top rule; the right-hand
                           column takes a left rule instead
                  4-up     one row, so no top rules at all and a left rule on
                           every item but the first
              */
              className={[
                "flex flex-col border-border py-6",
                "border-t first:border-t-0",
                "sm:[&:nth-child(-n+2)]:border-t-0 sm:[&:nth-child(even)]:border-l sm:[&:nth-child(even)]:pl-8",
                "lg:border-t-0 lg:px-[26px] lg:py-2 lg:[&:not(:first-child)]:border-l lg:first:pl-0 lg:last:pr-0",
              ].join(" ")}
            >
              <Icon
                className="mb-4 size-[22px] text-gray-900"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <h3 className="text-base font-extrabold text-gray-900">{name}</h3>
              <p className="mt-2.5 text-pretty text-[13.5px] leading-[1.6] text-gray-600">
                {body}
              </p>
              {/*
                `mt-auto` pins the link to the bottom of the column instead of
                letting it sit directly under the paragraph. The four bodies run
                to different lengths — Writing wraps to four lines where
                Listening takes two — so following the text put the four links on
                four different baselines, which is the kind of ragged detail that
                reads as unfinished at a glance.
              */}
              <a
                href="#mock"
                className="group/link mt-auto inline-flex items-center gap-1.5 self-start rounded-sm pt-4 text-[12.5px] font-extrabold text-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                Explore {name}
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover/link:translate-x-0.5"
                >
                  →
                </span>
              </a>
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  );
}

export default SkillsSection;
