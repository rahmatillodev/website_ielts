import React from "react";
import TrueFalseNotGiven from "./TrueFalseNotGiven";
import MultipleChoice from "./MultipleChoice";
import FillInTheBlank from "./FillInTheBlank";
import MatchingHeadings from "./MatchingHeadings";
import CompletionGapFill from "./CompletionGapFill";
import DragAndDrop from "./DragAndDrop";
import Table from "./Table";

/**
 * Smart QuestionRenderer - Routes to appropriate component based on question type
 * Supports both single question and group rendering
 */
const QuestionRenderer = ({ 
  question, 
  groupQuestions, 
  answer, 
  answers = {},
  onAnswerChange, 
  onInteraction,
  mode = 'test',
  reviewData = {},
  showCorrectAnswers = true
}) => {
  const questionType = question.type;
  const normalizedType = questionType.toLowerCase().trim();

  // Fill-in-the-Blanks - inline inputs with ___ placeholders from question_text
  if (
    normalizedType.includes('fill_in_blank') 
  ) {
    return (
      <CompletionGapFill
        question={question}
        groupQuestions={groupQuestions}
        answers={answers}
        onAnswerChange={onAnswerChange}
        onInteraction={onInteraction}
        mode={mode}
        reviewData={reviewData}
        showCorrectAnswers={showCorrectAnswers}
      />
    );
  }

  // Drag and Drop - with word bank
  if (
    normalizedType.includes('drag') ||
    normalizedType.includes('drop') ||
    normalizedType.includes('summary_completion')
  ) {
    return (
      <DragAndDrop
        question={question}
        groupQuestions={groupQuestions}
        answers={answers}
        onAnswerChange={onAnswerChange}
        onInteraction={onInteraction}
        options={question.options || []}
        mode={mode}
        reviewData={reviewData}
        showCorrectAnswers={showCorrectAnswers}
      />
    );
  }

  // True/False/Not Given
  if (
    normalizedType.includes('true_false_not_given')
  ) {
    return (
      <TrueFalseNotGiven
        question={question}
        answer={answer}
        onAnswerChange={onAnswerChange}
        mode={mode}
        reviewData={reviewData}
        showCorrectAnswers={showCorrectAnswers}
      />
    );
  }

  // Multiple Choice
  if (
    normalizedType.includes('multiple') ||
    normalizedType.includes('choice')
  ) {
    return (
      <MultipleChoice
        question={question}
        answer={answer}
        onAnswerChange={onAnswerChange}
        options={question.options || []}
        mode={mode}
        reviewData={reviewData}
        showCorrectAnswers={showCorrectAnswers}
      />
    );
  }

  // Matching Headings
  if (
    normalizedType.includes('matching') ||
    normalizedType.includes('heading')
  ) {
    return (
      <MatchingHeadings
        question={question}
        answer={answer}
        onAnswerChange={onAnswerChange}
        options={question.options || []}
        mode={mode}
        reviewData={reviewData}
        showCorrectAnswers={showCorrectAnswers}
      />
    );
  }

  // Table - with options from options table and correct answers from questions table
  if (normalizedType.includes('table')) {
    return (
      <Table
        question={question}
        groupQuestions={groupQuestions}
        answers={answers}
        onAnswerChange={onAnswerChange}
        options={question.options || []}
        mode={mode}
        reviewData={reviewData}
        showCorrectAnswers={showCorrectAnswers}
      />
    );
  }

  return null;
};

export default QuestionRenderer;

