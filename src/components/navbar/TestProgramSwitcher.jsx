import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TEST_PROGRAMS = [
  {
    id: "ielts",
    label: "IELTS",
    hint: "Band 0.0–9.0",
    activeClass: "text-[#4A90E2]",
    pillRing: "ring-[#4A90E2]/25",
    pillShadow: "shadow-[0_2px_10px_rgba(74,144,226,0.18)]",
  },
  {
    id: "cefr",
    label: "CEFR",
    hint: "A1–C2",
    activeClass: "text-emerald-600",
    pillRing: "ring-emerald-500/25",
    pillShadow: "shadow-[0_2px_10px_rgba(16,185,129,0.18)]",
  },
];

const TestProgramSwitcher = ({ value, onChange, loading }) => (
  <div
    role="tablist"
    aria-label="Test program"
    className={cn(
      "relative flex shrink-0 gap-0.5 rounded-xl border border-gray-200/90 p-0.5",
      "bg-linear-to-b from-[#F8FAFC] to-[#EEF2F7]",
      "shadow-[inset_0_1px_2px_rgba(15,23,42,0.05)]",
      loading && "pointer-events-none opacity-60"
    )}
  >
    {TEST_PROGRAMS.map((program) => {
      const isActive = value === program.id;
      return (
        <button
          key={program.id}
          type="button"
          role="tab"
          aria-selected={isActive}
          aria-label={`${program.label} tests`}
          onClick={() => onChange(program.id)}
          className={cn(
            "relative z-10 flex min-w-[72px] sm:min-w-[100px] flex-col items-center justify-center rounded-[10px] px-2.5 py-1.5 sm:px-3 sm:py-2 transition-colors duration-200 outline-none",
            "focus-visible:ring-2 focus-visible:ring-[#4A90E2]/40 focus-visible:ring-offset-1",
            isActive ? program.activeClass : "text-[#94A3B8] hover:text-[#475569]"
          )}
        >
          {isActive && (
            <motion.div
              layoutId="navbar-test-program-pill"
              className={cn(
                "absolute inset-0 rounded-[10px] bg-white ring-1",
                program.pillRing,
                program.pillShadow
              )}
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
            />
          )}
          <span className="relative z-10 flex flex-col items-center leading-tight gap-0.5">
            <span className="text-[11px] sm:text-xs font-bold tracking-wide">
              {program.label}
            </span>
            <span
              className={cn(
                "hidden sm:block text-[9px] font-semibold",
                isActive ? "opacity-80" : "text-[#CBD5E1]"
              )}
            >
              {program.hint}
            </span>
          </span>
        </button>
      );
    })}
  </div>
);

export default TestProgramSwitcher;
