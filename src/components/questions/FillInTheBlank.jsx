import React from "react";
import { Input } from "@/components/ui/input";

const FillInTheBlank = ({ question, answer, onAnswerChange }) => {
  const questionNumber = question.question_number || question.id;
  
  return (
    <div className="space-y-2">
      <Input
        type="text"
        value={answer || ""}
        onChange={(e) => onAnswerChange(questionNumber, e.target.value)}
        placeholder="Enter your answer..."
        className="w-full"
      />
      {question.instruction && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {question.instruction}
        </p>
      )}
    </div>
  );
};

export default FillInTheBlank;

