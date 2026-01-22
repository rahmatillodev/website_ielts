import React from "react";
import { Input } from "@/components/ui/input";
import { FaRegBookmark, FaBookmark } from "react-icons/fa";

const FillInTheBlank = ({ question, answer, onAnswerChange, bookmarks = new Set(), toggleBookmark = () => {} }) => {
  const questionNumber = question.question_number || question.id;
  const isBookmarked = bookmarks.has(questionNumber);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 group">
        <Input
          type="text"
          value={answer || ""}
          onChange={(e) => onAnswerChange(questionNumber, e.target.value)}
          placeholder="Enter your answer..."
          className="w-full"
        />
        {/* Bookmark Icon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleBookmark(questionNumber);
          }}
          className={`transition-all ${
            isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
        >
          {isBookmarked ? (
            <FaBookmark className="w-4 h-4 text-red-500" />
          ) : (
            <FaRegBookmark className="w-4 h-4 text-gray-400 hover:text-red-500" />
          )}
        </button>
      </div>
      {question.instruction && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {question.instruction}
        </p>
      )}
    </div>
  );
};

export default FillInTheBlank;

