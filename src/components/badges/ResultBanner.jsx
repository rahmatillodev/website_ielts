import React from "react";
import { MdEmojiEvents, MdTrendingUp, MdCheckCircle, MdInfo, MdSchool, MdClose } from "react-icons/md";

const CEFR_MESSAGES = {
  C2: { title: "Outstanding Performance!", message: (s, t) => `Excellent work! You reached CEFR level ${s}, showing very strong ${t} skills.` },
  C1: { title: "Excellent Work!", message: (s, t) => `Great job! Your ${t} result is CEFR ${s} — advanced proficiency.` },
  B2: { title: "Good Performance!", message: (s, t) => `You achieved CEFR ${s}. Keep practicing to move toward C1.` },
  B1: { title: "Keep Practicing!", message: (s, t) => `You scored CEFR ${s}. Regular practice will help you reach B2.` },
  A2: { title: "Room for Improvement", message: (s, t) => `You scored CEFR ${s}. Review your mistakes and build core ${t} skills step by step.` },
  A1: { title: "Keep Going!", message: (s, t) => `You scored CEFR ${s}. Stay consistent — every practice session helps.` },
};

const ResultBanner = ({ score, testType = "Reading", isCefr = false }) => {
  const testLabel = testType.toLowerCase();

  const getPerformanceData = () => {
    if (isCefr) {
      const level = String(score || "A1").trim().toUpperCase();
      const preset = CEFR_MESSAGES[level] || CEFR_MESSAGES.A1;
      return {
        level: level.toLowerCase(),
        title: preset.title,
        message: preset.message(level, testLabel),
        icon: level === "C2" || level === "C1" ? MdEmojiEvents : level === "B2" ? MdTrendingUp : MdSchool,
      };
    }

    const bandScore = parseFloat(score) || 0;

    if (bandScore >= 8.5) {
      return {
        level: "excellent",
        title: "Outstanding Performance!",
        message: `Congratulations! You've achieved an exceptional ${bandScore} band score. Your ${testLabel} skills are at an expert level.`,
        icon: MdEmojiEvents,
      };
    } else if (bandScore >= 7.5) {
      return {
        level: "very-good",
        title: "Excellent Work!",
        message: `Great job! You scored ${bandScore}, demonstrating strong ${testLabel} proficiency. You're well on your way to achieving your IELTS goals.`,
        icon: MdTrendingUp,
      };
    } else if (bandScore >= 6.5) {
      return {
        level: "good",
        title: "Good Performance!",
        message: `You've achieved a solid ${bandScore} band score. Keep practicing to improve your ${testLabel} skills and aim for higher scores.`,
        icon: MdCheckCircle,
      };
    } else if (bandScore >= 5.5) {
      return {
        level: "average",
        title: "Keep Practicing!",
        message: `You scored ${bandScore}. With consistent practice and focused study, you can improve your ${testLabel} skills and achieve higher band scores.`,
        icon: MdSchool,
      };
    } else if (bandScore >= 4.5) {
      return {
        level: "below-average",
        title: "Room for Improvement",
        message: `You scored ${bandScore}. Don't be discouraged! Focus on regular practice, review your mistakes, and work on building your ${testLabel} skills step by step.`,
        icon: MdInfo,
      };
    } else {
      return {
        level: "needs-improvement",
        title: "Poor Performance",
        message: `You scored ${bandScore}. Don't be discouraged! Focus on regular practice, review your mistakes, and work on building your ${testLabel} skills step by step.`,
        icon: MdClose,
      };
    }
  };

  const performance = getPerformanceData();
  const Icon = performance.icon;

  return (
    <div className="bg-blue-50 rounded-2xl p-2 sm:p-4 mb-6 shadow-sm">
      <div className="flex flex-col items-center text-center">
        <div className="text-4xl sm:text-5xl mb-1">
          <Icon className="text-blue-600" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
          {performance.title}
        </h2>
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed max-w-2xl">
          {performance.message}
        </p>
      </div>
    </div>
  );
};

export default ResultBanner;

