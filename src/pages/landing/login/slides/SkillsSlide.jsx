import { motion } from "framer-motion";
import { BookOpen, Headphones, Mic, PenLine } from "lucide-react";
import { EASE, INTERIOR_START, staggerGroup } from "../motionVariants";
import { SlideCard, SlideItem, SlideLabel } from "./SlidePrimitives";

const SKILLS = [
  { label: "Listening", icon: Headphones, detail: "40 questions" },
  { label: "Reading", icon: BookOpen, detail: "3 passages" },
  { label: "Writing", icon: PenLine, detail: "2 tasks" },
  { label: "Speaking", icon: Mic, detail: "3 parts" },
];

/**
 * Sign-up slide 2 — the four skills, as a grid of tiles.
 *
 * Deliberately a *set* rather than a score: this is the only slide in either
 * deck that answers "what do I actually get", and a new visitor reads coverage
 * before they read numbers. The tiles arrive one by one so the grid assembles
 * itself instead of appearing whole.
 */
function SkillsSlide() {
  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: INTERIOR_START, ease: EASE }}
      >
        <SlideCard>
          <SlideLabel>Full test coverage</SlideLabel>

          <motion.div
            variants={staggerGroup(0.09, INTERIOR_START + 0.35)}
            initial="hidden"
            animate="visible"
            className="mt-4 grid grid-cols-2 gap-2.5"
          >
            {SKILLS.map((skill) => (
              <SlideItem key={skill.label}>
                <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                    <skill.icon className="size-4 text-brand-600" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium text-gray-900">
                      {skill.label}
                    </span>
                    <span className="block truncate text-[10.5px] text-gray-500">
                      {skill.detail}
                    </span>
                  </span>
                </div>
              </SlideItem>
            ))}
          </motion.div>

          <motion.p
            className="mt-4 text-[11.5px] text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: INTERIOR_START + 0.9, ease: EASE }}
          >
            One account, all four skills
          </motion.p>
        </SlideCard>
      </motion.div>
    </div>
  );
}

export default SkillsSlide;
