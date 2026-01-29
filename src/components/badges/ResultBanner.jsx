import React from "react";
import { MdEmojiEvents, MdTrendingUp, MdCheckCircle, MdInfo, MdSchool, MdClose } from "react-icons/md";

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
      };
    } else if (bandScore >= 7.5) {
      return {
        level: "very-good",
        title: "Excellent Work!",
        message: `Great job! You scored ${bandScore}, demonstrating strong ${testType.toLowerCase()} proficiency. You're well on your way to achieving your IELTS goals.`,
        icon: MdTrendingUp,
      };
    } else if (bandScore >= 6.5) {
      return {
        level: "good",
        title: "Good Performance!",
        message: `You've achieved a solid ${bandScore} band score. Keep practicing to improve your ${testType.toLowerCase()} skills and aim for higher scores.`,
        icon: MdCheckCircle,
      };
    } else if (bandScore >= 5.5) {
      return {
        level: "average",
        title: "Keep Practicing!",
        message: `You scored ${bandScore}. With consistent practice and focused study, you can improve your ${testType.toLowerCase()} skills and achieve higher band scores.`,
        icon: MdSchool,
      };
    } else if (bandScore >= 4.5) {
      return {
        level: "below-average",
        title: "Room for Improvement",
        message: `You scored ${bandScore}. Don't be discouraged! Focus on regular practice, review your mistakes, and work on building your ${testType.toLowerCase()} skills step by step.`,
        icon: MdInfo,
      };
    } else {
      return {
        level: "needs-improvement",
        title: "Poor Performance",
        message: `You scored ${bandScore}. Don't be discouraged! Focus on regular practice, review your mistakes, and work on building your ${testType.toLowerCase()} skills step by step.`,
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

