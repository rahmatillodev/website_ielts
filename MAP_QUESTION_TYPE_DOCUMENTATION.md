# Map Question Type - Implementation Documentation

## Overview

The **Map Question Type** is a specialized question format that combines an image (map) with a table matching interface. Users view a map image and match locations/items on the map with corresponding labels in a table format.

This document provides complete technical details for implementing the map question type on the user-facing website.

---

## Data Structure

### Question Group Structure

```javascript
{
  id: "uuid",                    // Group ID from question table
  type: "map",                   // Question type identifier
  instruction: "Label the map...", // Instructions for users
  options: ["A", "B", "C", "D"], // Column labels (letters)
  question_text: "A\nB\nC\nD",   // Column options joined by newlines (for persistence)
  image_url: "https://...",      // URL of the map image
  questions: [                    // Array of questions (rows)
    {
      id: "uuid",                 // Question ID from questions table
      question_number: 16,       // Sequential question number
      question_text: "Farm shop", // Question description/label
      options: [                   // Array of column options
        {
          letter: "A",
          question_text: "A",     // Column letter
          is_correct: false,      // Whether this is the correct answer
          id: "uuid"              // Option ID (if exists)
        },
        {
          letter: "B",
          question_text: "B",
          is_correct: true,       // This is the correct answer
          id: "uuid"
        },
        // ... more columns
      ],
      correct_answer: "B",        // Single correct answer letter
      explanation: null,          // Optional explanation
      is_correct: true            // Whether question has correct answer
    },
    // ... more questions
  ],
  // Image metadata (for admin only, not needed on user side)
  image_url_original: "https://...",
  image_file: null,
  image_url_to_delete: null
}
```

---

## Database Schema

### Question Table (Group Row)

The map type creates a **group row** in the `question` table:

```sql
question {
  id: UUID (primary key)
  test_id: UUID (foreign key → test.id)
  part_id: UUID (foreign key → part.id)
  type: "map"
  question_range: INTEGER (number of questions in this group)
  instruction: TEXT (instructions for users)
  question_text: NULL (not used for map type)
  image_url: TEXT (URL of the map image) ← KEY FIELD
}
```

### Questions Table (Individual Questions)

Each question (row) is stored in the `questions` table:

```sql
questions {
  id: UUID (primary key)
  test_id: UUID
  question_id: UUID (foreign key → question.id, links to group)
  part_id: UUID
  question_number: INTEGER (sequential: 16, 17, 18, ...)
  question_text: TEXT (e.g., "Farm shop")
  correct_answer: TEXT (single letter: "A", "B", "C", etc.)
  explanation: TEXT (optional)
  is_correct: BOOLEAN (true if answer exists)
}
```

### Options Table (Column Selections)

All column options for each question are stored in the `options` table:

```sql
options {
  id: UUID (primary key)
  test_id: UUID
  question_id: UUID (foreign key → question.id, links to GROUP, not individual question)
  part_id: UUID
  question_number: INTEGER (links to questions.question_number)
  option_text: TEXT (column letter: "A", "B", "C", "D")
  is_correct: BOOLEAN (true if this is the correct answer for that question)
}
```

**Important Notes:**
- `options.question_id` references the **group row** in `question` table, NOT the individual question
- `options.question_number` is used to identify which question the option belongs to
- Each question has options for ALL columns (A, B, C, D, etc.)
- Only one option per question should have `is_correct: true` (the correct answer)

---

## API/Data Fetching

### Fetching Map Question Data

When loading a test, the map question group should be fetched with:

```javascript
// Example query structure
{
  id: groupId,
  type: "map",
  instruction: "...",
  image_url: "https://...",
  questions: [
    {
      id: questionId,
      question_number: 16,
      question_text: "Farm shop",
      correct_answer: "B"
    }
  ],
  options: [
    {
      question_id: groupId,
      question_number: 16,
      option_text: "A",
      is_correct: false
    },
    {
      question_id: groupId,
      question_number: 16,
      option_text: "B",
      is_correct: true  // Correct answer
    },
    // ... more options
  ]
}
```

### Data Processing

1. **Group the options by question_number** to build the options array for each question
2. **Sort questions by question_number** to maintain order
3. **Extract unique column letters** from options to determine available columns (A, B, C, D, etc.)

---

## User Interface Implementation

### Layout Structure

```
┌─────────────────────────────────────────┐
│  Instructions: "Label the map below..." │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│                                         │
│         [MAP IMAGE]                     │
│                                         │
│    A  B  C  D  E  F  G  H              │
│    (locations marked on map)           │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Question 16: Farm shop                  │
│  [A] [B] [C] [D] [E] [F] [G] [H]       │
│      ↑ (user selects B)                 │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Question 17: Disabled entry             │
│  [A] [B] [C] [D] [E] [F] [G] [H]       │
└─────────────────────────────────────────┘
... (more questions)
```

### Display Components

#### 1. Map Image Display

```jsx
<img 
  src={group.image_url} 
  alt="Map for labeling"
  className="map-image"
/>
```

**Requirements:**
- Display the image from `group.image_url`
- Ensure image is responsive and maintains aspect ratio
- Show all labeled locations (A, B, C, D, etc.) clearly visible

#### 2. Question Table

For each question in `group.questions`:

```jsx
<div className="question-row">
  <div className="question-label">
    Question {question.question_number}: {question.question_text}
  </div>
  <div className="column-options">
    {columns.map(letter => (
      <button
        key={letter}
        onClick={() => handleSelect(question.id, letter)}
        className={isSelected(question.id, letter) ? 'selected' : ''}
      >
        {letter}
      </button>
    ))}
  </div>
</div>
```

**Column Options:**
- Extract unique letters from `group.options` or use `group.options` array directly
- Display all available columns (A, B, C, D, etc.)
- Allow user to select ONE column per question (radio button behavior)

---

## User Interaction

### Selection Behavior

1. **Single Selection Per Question**: Each question allows selecting only ONE column (A, B, C, D, etc.)
2. **Visual Feedback**: Selected option should be visually distinct (highlighted, checked, etc.)
3. **Change Selection**: User can change their selection by clicking a different option
4. **Clear Selection**: Optionally allow clearing selection (clicking selected option again)

### State Management

```javascript
// User's answers
const userAnswers = {
  [questionId]: "B",  // Question ID → Selected letter
  // ...
};

// Handle selection
const handleSelect = (questionId, letter) => {
  setUserAnswers(prev => ({
    ...prev,
    [questionId]: letter
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
  answer: "B",                // Selected letter (A, B, C, D, etc.)
  type: "map"                  // Question type
}
```

### Validation

**Client-side validation:**
- Ensure all questions have an answer selected (if required)
- Validate that selected letter exists in available columns

**Server-side validation:**
- Verify question_id exists and belongs to the test
- Verify selected letter is a valid option for that question
- Check against `options` table: `option_text === answer` and `is_correct === true`

---

## Answer Checking/Grading

### Correctness Check

```javascript
function checkAnswer(question, userAnswer) {
  // Find the correct option for this question
  const correctOption = question.options.find(opt => opt.is_correct === true);
  
  if (!correctOption) {
    return { correct: false, error: "No correct answer defined" };
  }
  
  const correctLetter = correctOption.letter;
  const isCorrect = userAnswer === correctLetter;
  
  return {
    correct: isCorrect,
    correctAnswer: correctLetter,
    userAnswer: userAnswer
  };
}
```

### Scoring

- **Correct Answer**: User's selected letter matches the option with `is_correct: true`
- **Incorrect Answer**: User's selected letter does not match
- **No Answer**: User did not select any option (if required)

---

## Special Considerations

### 1. Question Numbering

- Questions are numbered **globally** across all parts and groups
- Example: Part 1 has Q1-Q10, Part 2 Group 1 (map) has Q11-Q15, Part 2 Group 2 has Q16-Q20
- Always display `question.question_number` to users

### 2. Column Labels

- Columns are typically letters: A, B, C, D, E, F, G, H
- The number of columns can vary (not always 4)
- Extract columns from `group.options` array or from options table data

### 3. Image Loading

- Images are stored in Supabase storage
- `image_url` is a public URL, load directly
- Handle image loading errors gracefully
- Consider lazy loading for performance

### 4. Responsive Design

- Map image should be responsive (max-width: 100%, height: auto)
- Table should scroll horizontally on mobile if many columns
- Ensure touch targets are large enough on mobile devices

### 5. Accessibility

- Provide alt text for map image
- Use proper ARIA labels for interactive elements
- Ensure keyboard navigation works (Tab, Enter/Space to select)
- Screen reader should announce: "Question 16: Farm shop. Select column: A, B, C, D..."

---

## Example Implementation Flow

### 1. Load Test Data

```javascript
const testData = await fetchTest(testId);
const mapGroups = testData.parts
  .flatMap(part => part.question_groups)
  .filter(group => group.type === "map");
```

### 2. Process Map Group

```javascript
const mapGroup = mapGroups[0];

// Extract columns
const columns = mapGroup.options || ["A", "B", "C", "D"];

// Process questions with options
const questions = mapGroup.questions.map(q => {
  // Find options for this question
  const questionOptions = mapGroup.options.filter(
    opt => opt.question_number === q.question_number
  );
  
  return {
    ...q,
    options: questionOptions.map(opt => ({
      letter: opt.option_text,
      is_correct: opt.is_correct
    }))
  };
});
```

### 3. Render UI

```jsx
<div className="map-question">
  <div className="instructions">{mapGroup.instruction}</div>
  
  <img src={mapGroup.image_url} alt="Map" />
  
  <div className="questions">
    {questions.map(q => (
      <QuestionRow
        key={q.id}
        question={q}
        columns={columns}
        onSelect={(letter) => handleAnswer(q.id, letter)}
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
  answer: userAnswers[q.id],
  type: "map"
}));

await submitAnswers(testId, answers);
```

---

## Testing Checklist

- [ ] Map image loads correctly
- [ ] All questions display with correct numbers
- [ ] Column options (A, B, C, D) display correctly
- [ ] User can select one option per question
- [ ] Selection is visually clear
- [ ] User can change selection
- [ ] Answers submit in correct format
- [ ] Correct answers are validated properly
- [ ] Works on mobile devices
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Handles missing image gracefully
- [ ] Handles missing options gracefully

---

## Database Query Examples

### Fetch Map Group with All Data

```sql
SELECT 
  q.id,
  q.type,
  q.instruction,
  q.image_url,
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
WHERE q.id = :groupId AND q.type = 'map'
GROUP BY q.id;
```

---

## Summary

The map question type requires:
1. **Display**: Map image + table of questions with column options
2. **Interaction**: User selects one column letter per question
3. **Storage**: Answers stored as question_id → selected letter
4. **Validation**: Check if selected letter matches `is_correct: true` in options table
5. **Database**: Group row in `question` table, individual questions in `questions` table, options in `options` table

The key difference from table type is the **image_url** field in the group row, which displays the map that users need to label.

