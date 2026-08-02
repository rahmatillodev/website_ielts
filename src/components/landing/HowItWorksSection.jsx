import { motion } from "framer-motion";
import Container from "./Container";
import { inView, revealUp } from "./motion";

/**
 * "A clearer way to prepare" — from the prototype.
 *
 * Spec: a `#FAFAFB` band ruled top and bottom, a centred header, then a
 * `1fr 80px 1fr 80px 1fr` grid — three steps separated by two drawn arrows.
 * Each step is a 56px circle outlined in the tint with the number in the accent,
 * a two-line heading, and a measure-capped paragraph.
 *
 * The `<br>` in each heading is the prototype's, and it is load-bearing: it is
 * what keeps the three headings on two lines each so their paragraphs start on a
 * common baseline. It only applies from `md`, where the three sit side by side.
 */

const STEPS = [
  {
    number: "01",
    title: ["Choose a skill", "or mock test"],
    body: "Pick what you want to practice or take a full mock test.",
    measure: "max-w-[24ch]",
  },
  {
    number: "02",
    title: ["Complete focused", "practice"],
    body: "Answer questions, follow the flow, and do your best under test conditions.",
    measure: "max-w-[26ch]",
  },
  {
    number: "03",
    title: ["Review feedback", "and improve"],
    body: "Understand your mistakes, learn smarter, and improve step by step.",
    measure: "max-w-[26ch]",
  },
];

/** The prototype's connector: a rule with a chevron head, in the accent. */
function StepArrow() {
  return (
    <div className="hidden pt-7 md:block" aria-hidden="true">
      <svg viewBox="0 0 80 8" className="w-full" fill="none">
        <line x1="0" y1="4" x2="70" y2="4" stroke="var(--primary)" strokeWidth="1.5" />
        <path d="M 70 0 L 78 4 L 70 8" fill="none" stroke="var(--primary)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function HowItWorksSection() {
  return (
    <section id="how" className="scroll-mt-16 border-y border-border bg-[#FAFAFB]">
      <Container className="py-20 sm:py-24">
        <motion.div
          variants={revealUp}
          initial="hidden"
          whileInView="visible"
          viewport={inView}
          className="mb-12 text-center sm:mb-16"
        >
          <p className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.14em] text-primary">
            How it works
          </p>
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-gray-900 sm:text-[32px]">
            A clearer way to prepare
          </h2>
        </motion.div>

        <motion.div
          variants={revealUp}
          initial="hidden"
          whileInView="visible"
          viewport={inView}
          className="mx-auto grid max-w-[980px] grid-cols-1 items-start gap-10 md:grid-cols-[1fr_80px_1fr_80px_1fr] md:gap-0"
        >
          {STEPS.map(({ number, title, body, measure }, index) => (
            <div key={number} className="contents">
              <div className="text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full border-[1.5px] border-brand-200 bg-white text-[15px] font-extrabold text-primary">
                  {number}
                </div>
                <h3 className="mt-5 text-base font-extrabold leading-[1.35] text-gray-900">
                  {/* The `{" "}` is what keeps the two halves apart once the
                      <br> is display:none below `md`. */}
                  {title[0]}
                  <br className="hidden md:inline" />{" "}
                  {title[1]}
                </h3>
                <p
                  className={`mx-auto mt-2.5 text-pretty text-[13.5px] leading-[1.6] text-gray-600 ${measure}`}
                >
                  {body}
                </p>
              </div>
              {index < STEPS.length - 1 && <StepArrow />}
            </div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}

export default HowItWorksSection;
