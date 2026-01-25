import React from "react";
import TrueFalseNotGiven from "./TrueFalseNotGiven";
import YesNoNotGiven from "./YesNoNotGiven";
import MultipleChoice from "./MultipleChoice";
import FillInTheBlank from "./FillInTheBlank";
import MatchingHeadings from "./MatchingHeadings";
import MatchingInformation from "./MatchingInformation";
import CompletionGapFill from "./CompletionGapFill";
import DragAndDrop from "./DragAndDrop";
import Table from "./Table";
import TableCompletion from "./TableCompletion";

import TypeMap from "./TypeMap";

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
  showCorrectAnswers = true,
  bookmarks = new Set(),
  toggleBookmark = () => {}
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
        bookmarks={bookmarks}
        toggleBookmark={toggleBookmark}
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
        bookmarks={bookmarks}
        toggleBookmark={toggleBookmark}
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
        bookmarks={bookmarks}
        toggleBookmark={toggleBookmark}
      />
    );
  }

  // Yes/No/Not Given
  if (
    normalizedType.includes('yes_no_not_given')
  ) {
    return (
      <YesNoNotGiven
        question={question}
        answer={answer}
        onAnswerChange={onAnswerChange}
        mode={mode}
        reviewData={reviewData}
        showCorrectAnswers={showCorrectAnswers}
        bookmarks={bookmarks}
        toggleBookmark={toggleBookmark}
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
        bookmarks={bookmarks}
        toggleBookmark={toggleBookmark}
      />
    );
  }

  // Matching Information - must be checked before generic matching
  if (normalizedType.includes('matching_information')) {
    return (
      <MatchingInformation
        question={question}
        groupQuestions={groupQuestions}
        answers={answers}
        onAnswerChange={onAnswerChange}
        options={question.options || []}
        mode={mode}
        reviewData={reviewData}
        showCorrectAnswers={showCorrectAnswers}
        bookmarks={bookmarks}
        toggleBookmark={toggleBookmark}
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
        bookmarks={bookmarks}
        toggleBookmark={toggleBookmark}
      />
    );
  }

  // Map - with image_url, instruction, and table matching interface
  if (normalizedType.includes('map')) {
    return (
      <TypeMap
        question={question}
        groupQuestions={groupQuestions}
        answers={answers}
        onAnswerChange={onAnswerChange}
        options={question.options || []}
        mode={mode}
        reviewData={reviewData}
        showCorrectAnswers={showCorrectAnswers}
        bookmarks={bookmarks}
        toggleBookmark={toggleBookmark}
      />
    );
  }

  // Table Completion - HTML table with ___ placeholders (gap-fill in table format)
  if (normalizedType.includes('table_completion')) {
    return (
      <TableCompletion
        question={question}
        groupQuestions={groupQuestions}
        answers={answers}
        onAnswerChange={onAnswerChange}
        onInteraction={onInteraction}
        mode={mode}
        reviewData={reviewData}
        showCorrectAnswers={showCorrectAnswers}
        bookmarks={bookmarks}
        toggleBookmark={toggleBookmark}
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
        bookmarks={bookmarks}
        toggleBookmark={toggleBookmark}
      />
    );
  }

  // FillInTheBlank fallback
  return (
    <FillInTheBlank
      question={question}
      answer={answer}
      onAnswerChange={onAnswerChange}
      mode={mode}
      reviewData={reviewData}
      showCorrectAnswers={showCorrectAnswers}
      bookmarks={bookmarks}
      toggleBookmark={toggleBookmark}
    />
  );
};

export default QuestionRenderer;

