import { motion } from "framer-motion";
import { Check, Target } from "lucide-react";
import Container from "./Container";
import MockExamPreview from "./MockExamPreview";
import { inView, revealUp } from "./motion";

/**
 * "Experience the test before test day" — from the prototype.
 *
 * The page's one filled panel: `--tint` ground, a 10%-accent hairline, 22px
 * radius, 56px of padding, and a 300px/1fr split. It is the only section that
 * sits inside a card rather than on the page, which is what makes it read as
 * the centrepiece.
 */

const CHECKLIST = [
  "Full test timing",
  "Section-by-section progress",
  "Clear results after completion",
];

function MockTestSection() {
  return (
    <section id="mock" className="scroll-mt-16 bg-white">
      <Container className="pb-20 sm:pb-24 lg:pb-[110px]">
        <div className="grid grid-cols-1 items-center gap-10 rounded-[22px] border border-primary/10 bg-brand-50 p-7 sm:p-10 lg:grid-cols-[300px_1fr] lg:gap-12 lg:p-14">
          <motion.div variants={revealUp} initial="hidden" whileInView="visible" viewport={inView}>
            <span className="mb-[22px] flex size-10 items-center justify-center rounded-full border-[1.8px] border-primary">
              <Target className="size-3.5 text-primary" strokeWidth={2} aria-hidden="true" />
            </span>

            <p className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.14em] text-primary">
              Mock test experience
            </p>

            <h2 className="text-balance text-[24px] font-extrabold leading-[1.2] tracking-[-0.02em] text-gray-900 sm:text-[30px]">
              Experience the test before test day.
            </h2>

            <ul className="mt-6 flex flex-col gap-3 text-[14px] font-semibold text-gray-600">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <Check
                    className="size-3.5 shrink-0 text-primary"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div variants={revealUp} initial="hidden" whileInView="visible" viewport={inView}>
            <MockExamPreview />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

export default MockTestSection;
