import { motion } from "framer-motion";
import { FileText, Sparkles, TrendingUp } from "lucide-react";
import Container from "./Container";
import { inView, revealUp } from "./motion";

/**
 * "Why serious learners improve faster" — from the prototype.
 *
 * Spec: a 300px/1fr split with a 64px gutter, 110px of vertical padding, and
 * the heading column closed with a 44×3 accent rule. The three points sit in an
 * equal grid divided by hairline left-borders, each opening with a 40px
 * rounded-10px tinted tile.
 *
 * The prototype draws its tile glyphs as bare CSS boxes; Lucide icons stand in
 * so the marks read as intentional at every size and inherit the project's icon
 * conventions.
 */

const PILLARS = [
  {
    title: "Full Mock Tests",
    Icon: FileText,
    body: "Experience the real test with timed sections and realistic questions.",
  },
  {
    title: "AI Feedback",
    Icon: Sparkles,
    body: "Get instant, honest feedback with clear explanations and band estimates.",
  },
  {
    title: "Score Prediction",
    Icon: TrendingUp,
    body: "Track your progress and predict your score as you continue to improve.",
  },
];

function WhyEduSection() {
  return (
    <section id="why" className="scroll-mt-16 bg-white">
      <Container className="grid grid-cols-1 items-start gap-12 py-20 sm:py-24 lg:grid-cols-[300px_1fr] lg:gap-16 lg:py-[110px]">
        <motion.div variants={revealUp} initial="hidden" whileInView="visible" viewport={inView}>
          <p className="mb-3.5 text-[12px] font-extrabold uppercase tracking-[0.14em] text-primary">
            Why EDU?
          </p>
          <h2 className="text-balance text-[26px] font-extrabold leading-[1.2] tracking-[-0.02em] text-gray-900 sm:text-[32px]">
            Why serious learners improve faster.
          </h2>
          <div className="mt-5 h-[3px] w-11 rounded-sm bg-primary" />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3">
          {PILLARS.map(({ title, body, Icon }, index) => (
            <motion.article
              key={title}
              variants={revealUp}
              initial="hidden"
              whileInView="visible"
              viewport={inView}
              className={[
                // The prototype divides these with left-borders and asymmetric
                // padding — no border on the first, no outer padding on the
                // edges. Below `sm` the columns stack, so the rule moves to the
                // top edge where it still separates them.
                "py-6 sm:py-2",
                index === 0
                  ? "sm:pr-8"
                  : "border-t border-border sm:border-l sm:border-t-0 sm:px-8",
                index === PILLARS.length - 1 ? "sm:pr-0" : "",
              ].join(" ")}
            >
              <span className="mb-[18px] flex size-10 items-center justify-center rounded-[10px] bg-brand-50">
                <Icon className="size-[18px] text-primary" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h3 className="text-base font-extrabold text-gray-900">{title}</h3>
              <p className="mt-2.5 text-pretty text-[14px] leading-[1.65] text-gray-600">
                {body}
              </p>
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  );
}

export default WhyEduSection;
