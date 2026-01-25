import React from "react";
import { MdEmojiEvents, MdTrendingUp, MdCheckCircle, MdInfo, MdSchool } from "react-icons/md";

const ResultBanner = ({ score, testType = "Reading" }) => {
  // Parse score to number
  const bandScore = parseFloat(score) || 0;

  // Determine performance level and message
  const getPerformanceData = () => {
    if (bandScore >= 8.5) {
      return {
        level: "excellent",
        title: "Outstanding Performance!",
        message: `Congratulations! You've achieved an exceptional ${bandScore} band score. Your ${testType.toLowerCase()} skills are at an expert level.`,
        icon: MdEmojiEvents,
        bgColor: "bg-gradient-to-r from-yellow-50 to-amber-50",
        borderColor: "border-yellow-300",
        iconColor: "text-yellow-600",
        titleColor: "text-yellow-800",
        messageColor: "text-yellow-700",
      };
    } else if (bandScore >= 7.5) {
      return {
        level: "very-good",
        title: "Excellent Work!",
        message: `Great job! You scored ${bandScore}, demonstrating strong ${testType.toLowerCase()} proficiency. You're well on your way to achieving your IELTS goals.`,
        icon: MdTrendingUp,
        bgColor: "bg-gradient-to-r from-green-50 to-emerald-50",
        borderColor: "border-green-300",
        iconColor: "text-green-600",
        titleColor: "text-green-800",
        messageColor: "text-green-700",
      };
    } else if (bandScore >= 6.5) {
      return {
        level: "good",
        title: "Good Performance!",
        message: `You've achieved a solid ${bandScore} band score. Keep practicing to improve your ${testType.toLowerCase()} skills and aim for higher scores.`,
        icon: MdCheckCircle,
        bgColor: "bg-gradient-to-r from-blue-50 to-cyan-50",
        borderColor: "border-blue-300",
        iconColor: "text-blue-600",
        titleColor: "text-blue-800",
        messageColor: "text-blue-700",
      };
    } else if (bandScore >= 5.5) {
      return {
        level: "average",
        title: "Keep Practicing!",
        message: `You scored ${bandScore}. With consistent practice and focused study, you can improve your ${testType.toLowerCase()} skills and achieve higher band scores.`,
        icon: MdSchool,
        bgColor: "bg-gradient-to-r from-purple-50 to-indigo-50",
        borderColor: "border-purple-300",
        iconColor: "text-purple-600",
        titleColor: "text-purple-800",
        messageColor: "text-purple-700",
      };
    } else {
      return {
        level: "needs-improvement",
        title: "Room for Improvement",
        message: `You scored ${bandScore}. Don't be discouraged! Focus on regular practice, review your mistakes, and work on building your ${testType.toLowerCase()} skills step by step.`,
        icon: MdInfo,
        bgColor: "bg-gradient-to-r from-orange-50 to-amber-50",
        borderColor: "border-orange-300",
        iconColor: "text-orange-600",
        titleColor: "text-orange-800",
        messageColor: "text-orange-700",
      };
    }
  };

  const performance = getPerformanceData();
  const Icon = performance.icon;

  return (
    <div
      className={`${performance.bgColor} ${performance.borderColor} border-2 rounded-2xl p-4 sm:p-5 mb-6 shadow-lg`}
    >
      <div className="flex items-start gap-3">
        <div className={`${performance.iconColor} shrink-0`}>
          <Icon className="text-3xl sm:text-4xl" />
        </div>
        <div className="flex-1">
          <h2 className={`${performance.titleColor} text-xl sm:text-2xl font-black mb-1.5`}>
            {performance.title}
          </h2>
          <p className={`${performance.messageColor} text-sm sm:text-base font-semibold leading-relaxed`}>
            {performance.message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResultBanner;

