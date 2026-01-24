
---

# Matching Information Question Type - Implementation Documentation

## Overview

The **Matching Information Question Type** (`matching_information`) is a question format where users match questions/statements with answer options from a predefined list. Unlike other matching types, **one answer option can be used by multiple questions**, but each question can only have one answer.

This document provides complete technical details for implementing the matching information question type on the user-facing website.

---

## Data Structure

### Question Group Structure

```javascript
{
  id: "uuid",                    // Group ID from question table
  type: "matching_information",  // Question type identifier
  instruction: "Match each...",  // Instructions for users (stored as JSON with answer_options)
  answer_options: [              // Array of answer option texts (not letters)
    "Nilson",
    "McKeachie",
    "Levy",
    "Smith"
  ],
  questions: [                   // Array of questions/statements
    {
      id: "uuid",                // Question ID from questions table
      question_number: 16,       // Sequential question number
      question_text: "Who wrote...", // Question/statement text
      correct_answer: "McKeachie", // Correct answer as TEXT (not letter)
      explanation: null,         // Optional explanation
      is_correct: true           // Whether question has correct answer
    },
    // ... more questions
  ]
}
```

**Key Points:**
- `answer_options` is an array of **text strings** (e.g., "Nilson", "McKeachie"), not letters
- `correct_answer` stores the **full text** of the answer (e.g., "McKeachie"), not the letter (e.g., "B")
- Multiple questions can use the same answer option
- Each question can only have one answer

---

## Database Schema

### Question Table (Group Row)

The matching_information type creates a **group row** in the `question` table:

```sql
question {
  id: UUID (primary key)
  test_id: UUID (foreign key → test.id)
  part_id: UUID (foreign key → part.id)
  type: "matching_information"
  question_range: INTEGER (number of questions in this group)
  instruction: TEXT (JSON string containing original instruction + answer_options)
  question_text: NULL (not used for matching_information type)
  image_url: NULL (not used for matching_information type)
}
```

**Instruction Field Format:**
The `instruction` field contains a JSON string:
```json
{
  "original": "Match each statement with the correct person.",
  "answer_options": ["Nilson", "McKeachie", "Levy", "Smith"]
}
```

### Questions Table (Individual Questions)

Each question (statement) is stored in the `questions` table:

```sql
questions {
  id: UUID (primary key)
  test_id: UUID
  question_id: UUID (foreign key → question.id, links to group)
  part_id: UUID
  question_number: INTEGER (sequential: 16, 17, 18, ...)
  question_text: TEXT (e.g., "Who wrote the book on teaching?")
  correct_answer: TEXT (answer text: "McKeachie", NOT letter "B")
  explanation: TEXT (optional)
  is_correct: BOOLEAN (true if answer exists)
}
```

**Important:** `correct_answer` stores the **full text** of the answer option, not the letter.

### Options Table (Answer Options)

All answer options for each question are stored in the `options` table:

```sql
options {
  id: UUID (primary key)
  test_id: UUID
  question_id: UUID (foreign key → question.id, links to GROUP, not individual question)
  part_id: UUID
  question_number: INTEGER (links to questions.question_number)
  option_text: TEXT (formatted as "A Nilson", "B McKeachie", etc.)
  is_correct: BOOLEAN (true if this is the correct answer for that question)
}
```

**Important Notes:**
- `options.question_id` references the **group row** in `question` table, NOT the individual question
- `options.question_number` is used to identify which question the option belongs to
- `option_text` format: `"A Nilson"`, `"B McKeachie"`, etc. (letter + space + text)
- Each question has options for ALL answer options (A, B, C, D, etc.)
- Only one option per question should have `is_correct: true` (the correct answer)
- The same answer option text can appear multiple times (for different questions) with different `is_correct` values

---

## API/Data Fetching

### Fetching Matching Information Question Data

When loading a test, the matching_information question group should be fetched with:

```javascript
// Example query structure
{
  id: groupId,
  type: "matching_information",
  instruction: "Match each...",
  answer_options: ["Nilson", "McKeachie", "Levy", "Smith"],
  questions: [
    {
      id: questionId,
      question_number: 16,
      question_text: "Who wrote the book on teaching?",
      correct_answer: "McKeachie"  // Text, not letter
    }
  ],
  options: [
    {
      question_id: groupId,
      question_number: 16,
      option_text: "A Nilson",
      is_correct: false
    },
    {
      question_id: groupId,
      question_number: 16,
      option_text: "B McKeachie",
      is_correct: true  // Correct answer
    },
    // ... more options for question 16
  ]
}
```

### Data Processing

1. **Parse answer_options from instruction JSON** or extract from options table
2. **Group options by question_number** to build the options array for each question
3. **Sort questions by question_number** to maintain order
4. **Extract answer option texts** from options (remove letter prefix: "A Nilson" → "Nilson")
5. **Match correct_answer** (text) with answer_options to determine which letter is correct

---

## User Interface Implementation

### Layout Structure

```
┌─────────────────────────────────────────┐
│  Instructions: "Match each statement..." │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Answer Options:                          │
│  A. Nilson                               │
│  B. McKeachie                            │
│  C. Levy                                 │
│  D. Smith                                │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Question 16: Who wrote the book...       │
│  [Select an answer... ▼]                │
│      ↓                                   │
│  A. Nilson                               │
│  B. McKeachie  ← (user selects)         │
│  C. Levy                                 │
│  D. Smith                                │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Question 17: Who developed the theory...│
│  [Select an answer... ▼]                │
└─────────────────────────────────────────┘
... (more questions)
```

### Display Components

#### 1. Answer Options Display

```jsx
<div className="answer-options">
  <h3>Answer Options:</h3>
  {group.answer_options.map((optionText, idx) => {
    const letter = String.fromCharCode(65 + idx); // A, B, C, D...
    return (
      <div key={idx} className="option-item">
        <span className="option-letter">{letter}.</span>
        <span className="option-text">{optionText}</span>
      </div>
    );
  })}
</div>
```

**Requirements:**
- Display all answer options with letters (A, B, C, D, etc.)
- Show usage count if an option is used by multiple questions (optional, for admin view)
- Options are displayed as reference for users

#### 2. Question Dropdowns

For each question in `group.questions`:

```jsx
<div className="question-row">
  <div className="question-label">
    Question {question.question_number}: {question.question_text}
  </div>
  <select
    value={userAnswers[question.id] || ""}
    onChange={(e) => handleSelect(question.id, e.target.value)}
    className="answer-select"
  >
    <option value="">Select an answer...</option>
    {group.answer_options.map((optionText, idx) => {
      const letter = String.fromCharCode(65 + idx);
      return (
        <option key={idx} value={optionText}>
          {letter}. {optionText}
        </option>
      );
    })}
  </select>
</div>
```

**Key Points:**
- Dropdown shows letter + text (e.g., "A. Nilson")
- Store selected value as the **text** (e.g., "Nilson"), not the letter
- All options are available for all questions (no restrictions)
- Multiple questions can select the same answer option

---

## User Interaction

### Selection Behavior

1. **Single Selection Per Question**: Each question allows selecting only ONE answer option
2. **Answer Reuse Allowed**: Multiple questions can use the same answer option
3. **Visual Feedback**: Selected option should be visually distinct
4. **Change Selection**: User can change their selection by choosing a different option
5. **Clear Selection**: Optionally allow clearing selection (selecting empty option)

### State Management

```javascript
// User's answers (stored as question ID → answer text)
const userAnswers = {
  [questionId]: "McKeachie",  // Question ID → Selected answer text
  // ...
};

// Handle selection
const handleSelect = (questionId, answerText) => {
  setUserAnswers(prev => ({
    ...prev,
    [questionId]: answerText  // Store the text, not letter
  }));
};
```

---

## Answer Submission

### Answer Format

When submitting answers, format as:

```javascript
{
  question_id: "uuid",        // Individual question ID from questions table
  question_number: 16,        // Question number
  answer: "McKeachie",        // Selected answer TEXT (not letter)
  type: "matching_information"
}
```

**Important:** Submit the **answer text** (e.g., "McKeachie"), not the letter (e.g., "B").

### Validation

**Client-side validation:**
- Ensure all questions have an answer selected (if required)
- Validate that selected answer text exists in `answer_options` array

**Server-side validation:**
- Verify question_id exists and belongs to the test
- Verify selected answer text matches one of the answer options
- Check against `options` table: find option where `option_text` contains the answer text and `is_correct === true` for that question

---

## Answer Checking/Grading

### Correctness Check

```javascript
function checkAnswer(question, userAnswer) {
  // correct_answer is stored as text (e.g., "McKeachie")
  const correctAnswerText = question.correct_answer;
  
  if (!correctAnswerText) {
    return { correct: false, error: "No correct answer defined" };
  }
  
  // Compare text directly (case-sensitive or case-insensitive based on requirements)
  const isCorrect = userAnswer.trim() === correctAnswerText.trim();
  
  return {
    correct: isCorrect,
    correctAnswer: correctAnswerText,
    userAnswer: userAnswer
  };
}
```

### Scoring

- **Correct Answer**: User's selected answer text matches `question.correct_answer` (text comparison)
- **Incorrect Answer**: User's selected answer text does not match
- **No Answer**: User did not select any option (if required)

---

## Special Considerations

### 1. Question Numbering

- Questions are numbered **globally** across all parts and groups
- Example: Part 1 has Q1-Q10, Part 2 Group 1 (matching_information) has Q11-Q15, Part 2 Group 2 has Q16-Q20
- Always display `question.question_number` to users

### 2. Answer Option Letters

- Letters are assigned automatically based on order: A, B, C, D, E, F, etc.
- Maximum 26 answer options (A-Z)
- Letters are for display/reference only; answers are stored and compared as **text**

### 3. Answer Reuse

- **One answer can be used by multiple questions** (this is allowed and expected)
- Example: "McKeachie" can be the correct answer for both Question 16 and Question 18
- Each question still has only one correct answer

### 4. Data Loading

- Answer options are stored in `instruction` field as JSON
- Fallback: Extract from `options` table by parsing `option_text` format ("A Nilson" → "Nilson")
- If neither source available, initialize with empty array

### 5. Responsive Design

- Dropdowns should be full-width on mobile
- Answer options list should wrap or scroll on small screens
- Ensure touch targets are large enough on mobile devices

### 6. Accessibility

- Use proper ARIA labels for dropdowns
- Ensure keyboard navigation works (Tab to focus, Arrow keys to navigate options, Enter to select)
- Screen reader should announce: "Question 16: Who wrote the book. Select answer: A Nilson, B McKeachie, C Levy, D Smith"

---

## Example Implementation Flow

### 1. Load Test Data

```javascript
const testData = await fetchTest(testId);
const matchingGroups = testData.parts
  .flatMap(part => part.question_groups)
  .filter(group => group.type === "matching_information");
```

### 2. Process Matching Information Group

```javascript
const matchingGroup = matchingGroups[0];

// Parse answer_options from instruction JSON
let answerOptions = [];
try {
  const instructionData = JSON.parse(matchingGroup.instruction);
  answerOptions = instructionData.answer_options || [];
} catch (e) {
  // Fallback: extract from options table
  const optionsMap = new Map();
  matchingGroup.options.forEach(opt => {
    const match = opt.option_text?.match(/^([A-Z])[.\s]\s*(.+)$/);
    if (match) {
      const letter = match[1];
      const text = match[2].trim();
      if (!optionsMap.has(letter)) {
        optionsMap.set(letter, text);
      }
    }
  });
  answerOptions = Array.from(optionsMap.values());
}

// Process questions
const questions = matchingGroup.questions.map(q => ({
  ...q,
  correct_answer: q.correct_answer  // Already stored as text
}));
```

### 3. Render UI

```jsx
<div className="matching-information-question">
  <div className="instructions">{matchingGroup.instruction}</div>
  
  <div className="answer-options-list">
    <h3>Answer Options:</h3>
    {answerOptions.map((text, idx) => {
      const letter = String.fromCharCode(65 + idx);
      return (
        <div key={idx}>
          {letter}. {text}
        </div>
      );
    })}
  </div>
  
  <div className="questions">
    {questions.map(q => (
      <QuestionRow
        key={q.id}
        question={q}
        answerOptions={answerOptions}
        onSelect={(answerText) => handleAnswer(q.id, answerText)}
        selectedAnswer={userAnswers[q.id]}
      />
    ))}
  </div>
</div>
```

### 4. Submit Answers

```javascript
const answers = questions.map(q => ({
  question_id: q.id,
  question_number: q.question_number,
  answer: userAnswers[q.id],  // Answer text, not letter
  type: "matching_information"
}));

await submitAnswers(testId, answers);
```

---

## Testing Checklist

- [ ] Answer options display correctly with letters (A, B, C, D)
- [ ] All questions display with correct numbers
- [ ] Dropdown shows all answer options for each question
- [ ] User can select one option per question
- [ ] Multiple questions can select the same answer option
- [ ] Selection is visually clear
- [ ] User can change selection
- [ ] Answers submit as text (not letters)
- [ ] Correct answers are validated properly (text comparison)
- [ ] Works on mobile devices
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Handles missing answer_options gracefully
- [ ] Handles answer_options loaded from instruction JSON
- [ ] Handles answer_options extracted from options table

---

## Database Query Examples

### Fetch Matching Information Group with All Data

```sql
SELECT 
  q.id,
  q.type,
  q.instruction,
  q.question_range,
  json_agg(
    json_build_object(
      'id', qs.id,
      'question_number', qs.question_number,
      'question_text', qs.question_text,
      'correct_answer', qs.correct_answer
    ) ORDER BY qs.question_number
  ) as questions,
  json_agg(
    json_build_object(
      'question_number', o.question_number,
      'option_text', o.option_text,
      'is_correct', o.is_correct
    )
  ) as options
FROM question q
LEFT JOIN questions qs ON qs.question_id = q.id
LEFT JOIN options o ON o.question_id = q.id
WHERE q.id = :groupId AND q.type = 'matching_information'
GROUP BY q.id;
```

### Extract Answer Options from Options Table

```sql
-- Get unique answer options for a matching_information group
SELECT DISTINCT
  SUBSTRING(option_text FROM '^[A-Z][.\s]\s*(.+)$') as answer_text
FROM options
WHERE question_id = :groupId
ORDER BY MIN(SUBSTRING(option_text FROM '^([A-Z])'));
```

---

## Summary

The matching_information question type requires:
1. **Display**: List of answer options (A, B, C, D...) + dropdown for each question
2. **Interaction**: User selects one answer option per question from dropdown
3. **Storage**: Answers stored as question_id → answer text (not letter)
4. **Validation**: Check if selected answer text matches `correct_answer` (text comparison)
5. **Database**: Group row in `question` table (with answer_options in instruction JSON), individual questions in `questions` table, options in `options` table
6. **Key Feature**: One answer option can be used by multiple questions (answer reuse allowed)

The key differences from other matching types:
- **Answer reuse**: One answer can match multiple questions
- **Text-based answers**: Answers stored and compared as text, not letters
- **Answer options stored in instruction**: Answer options array stored as JSON in `instruction` field

