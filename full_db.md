# Test Data API Documentation

This document provides comprehensive information about how to fetch detailed test data from the database and how to write test data to the database. This is intended for use in other projects that need to interact with the test database.

---

## Table of Contents

1. [Database Schema Overview](#database-schema-overview)
2. [Fetching Test Data](#fetching-test-data)
3. [Writing Test Data](#writing-test-data)
4. [Question Type Structures](#question-type-structures)
5. [Important Notes](#important-notes)

---

## Database Schema Overview

The test system uses the following database tables with relationships:

```
test
  ├── part (one-to-many)
  │     ├── question (one-to-many) - Question groups
  │     │     ├── questions (one-to-many) - Individual questions within groups
  │     │     └── options (one-to-many) - Options for questions
  │     └── (part-level media: image_url, listening_url)
```

### Table Structures

#### `test` Table
```sql
{
  id: UUID (primary key)
  title: TEXT
  duration: INTEGER (minutes)
  difficulty: TEXT (EASY, MEDIUM, HARD)
  type: TEXT (reading, listening, writing)
  is_premium: BOOLEAN
  is_active: BOOLEAN
  question_quantity: INTEGER
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

#### `part` Table
```sql
{
  id: UUID (primary key)
  test_id: UUID (foreign key → test.id)
  part_number: INTEGER
  title: TEXT (nullable)
  content: TEXT (nullable) - Reading passage text
  image_url: TEXT (nullable) - Part-level image
  listening_url: TEXT (nullable) - Audio file URL (usually only Part 1)
}
```

#### `question` Table
This table serves dual purposes:
1. **Question Groups** - For types like `fill_in_blanks`, `drag_drop`, `table`, `map`, `matching_information`
2. **Individual Questions** - For `multiple_choice` type (each question is stored directly)

```sql
{
  id: UUID (primary key)
  test_id: UUID (foreign key → test.id)
  part_id: UUID (foreign key → part.id)
  type: TEXT - Question type identifier
  question_range: INTEGER (nullable) - Number of questions in group
  instruction: TEXT (nullable) - Instructions for users
  question_text: TEXT (nullable) - Content/passage for some types, null for others
  question_number: INTEGER (nullable) - Only for multiple_choice individual questions
  image_url: TEXT (nullable) - For map type
}
```

#### `questions` Table
Stores individual questions within question groups (NOT used for `multiple_choice`).

```sql
{
  id: UUID (primary key)
  test_id: UUID
  question_id: UUID (foreign key → question.id) - Links to group
  part_id: UUID
  question_number: INTEGER - Sequential question number across entire test
  question_text: TEXT (nullable) - Question text or answer text
  correct_answer: TEXT (nullable) - Correct answer (format varies by type)
  explanation: TEXT (nullable)
  is_correct: BOOLEAN - true for valid questions, false for distractors
}
```

#### `options` Table
Stores answer options. Structure varies by question type.

```sql
{
  id: UUID (primary key)
  test_id: UUID
  question_id: UUID (foreign key → question.id)
  part_id: UUID
  question_number: INTEGER (nullable) - null for group-level options
  option_text: TEXT - Option text or letter
  option_key: TEXT (nullable) - For matching_information type
  is_correct: BOOLEAN - Whether this option is correct
}
```

---

## Fetching Test Data

### Using Supabase Query

To fetch a complete test with all nested data, use the following Supabase query:

```javascript
import supabase from '@/lib/supabase'; // or your Supabase client

async function getTestById(testId) {
  const { data, error } = await supabase
    .from("test")
    .select(`
      *,
      part (
        *,
        question (
          *,
          questions (*),
          options (*)
        )
      )
    `)
    .eq("id", testId)
    .single();

  if (error) {
    console.error("Error fetching test:", error);
    return null;
  }

  return data;
}
```

### Response Structure

The response will have the following structure:

```javascript
{
  id: "test-uuid",
  title: "IELTS Reading Practice Test",
  type: "reading",
  duration: 60,
  difficulty: "MEDIUM",
  is_premium: false,
  is_active: true,
  question_quantity: 10,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  part: [
    {
      id: "part-uuid",
      test_id: "test-uuid",
      part_number: 1,
      title: "Part 1",
      content: "Reading passage text...",
      image_url: "https://...",
      listening_url: "https://...",
      question: [
        // Question groups or individual questions
        // Structure varies by type (see Question Type Structures section)
      ]
    }
  ]
}
```

### Processing the Data

The raw database structure needs to be processed differently based on question type:

1. **Multiple Choice**: Questions are stored directly in `question` table with `options` linked to each question
2. **Other Types**: Questions are grouped in `question` table, with individual questions in `questions` table

See the `ContentFormPage.jsx` file (lines 216-846) for detailed processing logic.

---

## Writing Test Data

### Function Signature

```javascript
async function saveFullTest(id, formData, parts) {
  // id: UUID or null (null for new test)
  // formData: Test-level metadata
  // parts: Array of part objects with question groups
}
```

### Form Data Structure

```javascript
const formData = {
  title: "Test Title",
  duration: 60, // minutes
  difficulty: "MEDIUM", // EASY, MEDIUM, HARD
  type: "reading", // reading, listening, writing
  is_premium: false,
  is_active: true
};
```

### Parts Structure

```javascript
const parts = [
  {
    part_number: 1,
    title: "Part 1", // optional
    content: "Reading passage text...", // optional
    image_url: "https://...", // optional, or null
    image_url_original: "https://...", // for tracking original URL
    image_file: File | null, // new file to upload
    image_url_to_delete: "https://...", // URL to delete
    listening_url: "https://...", // optional, usually only Part 1
    listening_url_original: "https://...",
    listening_file: File | null,
    listening_url_to_delete: "https://...",
    question_groups: [
      // Array of question groups (see Question Type Structures)
    ]
  }
];
```

### Save Process

The save process follows these steps:

1. **Calculate Question Quantity**: Count all questions across all parts
2. **Upload Media Files**: Upload new images/audio to Supabase Storage
3. **Save Test Record**: Create or update test in `test` table
4. **Delete Old Data** (if updating): Remove old parts, questions, and options
5. **Save Parts**: Insert parts into `part` table
6. **Save Question Groups**: Insert question groups into `question` table
7. **Save Individual Questions**: Insert questions into `questions` table (for non-multiple_choice types)
8. **Save Options**: Insert options into `options` table

### Important Save Rules

1. **Question Numbering**: Questions are numbered sequentially across all parts (1, 2, 3, ...)
2. **Multiple Choice**: Each question is stored directly in `question` table (not grouped)
3. **File Uploads**: Files are uploaded to Supabase Storage buckets:
   - Images: `test-assets` bucket, `images/` folder
   - Audio: `listening-test` bucket, `audios/` folder
4. **Validation**: 
   - Fill in blanks: Number of `___` placeholders must match answers count
   - Table completion: Number of `___` in cells must match answers count
   - All question types: Question text is required

---

## Question Type Structures

### 1. Multiple Choice (`multiple_choice`)

**Database Structure:**
- Each question is stored directly in `question` table
- Options are stored in `options` table, linked to `question.id`
- No group row needed

**Input Format:**
```javascript
{
  type: "multiple_choice",
  instruction: "Choose the correct answer", // Stored in first question only
  questions: [
    {
      question_number: 1,
      question_text: "What is the main topic?",
      options: [
        { letter: "A", question_text: "Climate change", is_correct: true },
        { letter: "B", question_text: "Economic growth", is_correct: false },
        { letter: "C", question_text: "Social media", is_correct: false },
        { letter: "D", question_text: "Technology", is_correct: false }
      ],
      explanation: null
    }
  ]
}
```

**Database Result:**
- `question` table: One row per question
- `options` table: Multiple rows per question (one per option)

---

### 2. Fill in Blanks (`fill_in_blanks`)

**Database Structure:**
- Group row in `question` table with passage text
- Individual answers in `questions` table
- No options table

**Input Format:**
```javascript
{
  type: "fill_in_blanks",
  instruction: "Write NO MORE THAN TWO WORDS",
  content: "The climate ___ is a serious ___ that affects everyone.",
  question_text: "The climate ___ is a serious ___ that affects everyone.",
  answers: ["change", "issue"]
}
```

**Database Result:**
- `question` table: One group row with `question_text` containing passage with `___`
- `questions` table: One row per answer, `question_text` and `correct_answer` both contain answer text

---

### 3. Table Completion (`table_completion`)

**Database Structure:**
- Group row in `question` table with HTML table
- Individual answers in `questions` table
- No options table

**Input Format:**
```javascript
{
  type: "table_completion",
  instruction: "Write NO MORE THAN TWO WORDS",
  column_headers: ["Year", "Some key events in US electrification"],
  rows: [
    { cells: ["1879", "___"] },
    { cells: ["1882", "___"] },
    { cells: ["1890", "___"] }
  ],
  answers: ["Edison's light bulb", "First power station", "AC system introduced"]
}
```

**Database Result:**
- `question` table: One group row with `question_text` containing HTML table
- `questions` table: One row per answer

---

### 4. Drag and Drop (`drag_drop`)

**Database Structure:**
- Group row in `question` table with passage text
- Individual items in `questions` table (both correct answers and distractors)
- Distractors have `question_number: null` and `is_correct: false`

**Input Format:**
```javascript
{
  type: "drag_drop",
  instruction: "Drag the words to complete the sentences",
  content: "The ___ is a serious problem.",
  question_text: "The ___ is a serious problem.",
  questions: [
    {
      question_number: 1,
      correct_answer: "climate",
      question_text: "climate",
      is_correct: true,
      explanation: null
    },
    {
      question_number: null,
      correct_answer: "weather",
      question_text: "weather",
      is_correct: false, // distractor
      explanation: null
    }
  ]
}
```

**Database Result:**
- `question` table: One group row with passage
- `questions` table: All items (correct answers have `question_number`, distractors have `null`)

---

### 5. Table / List of Headings (`table`)

**Database Structure:**
- Group row in `question` table with `question_text: null`
- Individual questions in `questions` table
- Options stored ONCE at group level in `options` table with `question_number: null`

**Input Format:**
```javascript
{
  type: "table",
  instruction: "Choose the correct heading",
  options: ["A", "B", "C", "D"], // Column options (shared across all questions)
  questions: [
    {
      question_number: 1,
      question_text: "Introduction to climate science",
      correct_answer: "A", // Letter of correct option
      options: [
        { letter: "A", question_text: "A", is_correct: true },
        { letter: "B", question_text: "B", is_correct: false },
        { letter: "C", question_text: "C", is_correct: false },
        { letter: "D", question_text: "D", is_correct: false }
      ],
      explanation: null
    }
  ]
}
```

**Database Result:**
- `question` table: One group row
- `questions` table: One row per question with `correct_answer` as letter (e.g., "A")
- `options` table: Options stored once at group level, `question_number: null`

---

### 6. Map Labeling (`map`)

**Database Structure:**
- Same as `table` type, but with `image_url` in group row
- Group row in `question` table with `image_url`
- Individual questions in `questions` table
- Options stored at group level

**Input Format:**
```javascript
{
  type: "map",
  instruction: "Label the map",
  image_url: "https://...", // or image_file: File
  image_url_original: "https://...",
  image_file: null,
  image_url_to_delete: null,
  options: ["A", "B", "C", "D"],
  questions: [
    {
      question_number: 1,
      question_text: "Farm shop",
      correct_answer: "A",
      options: [
        { letter: "A", question_text: "A", is_correct: true },
        { letter: "B", question_text: "B", is_correct: false },
        // ...
      ],
      explanation: null
    }
  ]
}
```

**Database Result:**
- `question` table: One group row with `image_url`
- `questions` table: One row per question
- `options` table: Options at group level

---

### 7. Matching Information (`matching_information`)

**Database Structure:**
- Group row in `question` table
- Individual questions in `questions` table
- Answer options stored ONCE at group level in `options` table with `option_key` and `option_text`

**Input Format:**
```javascript
{
  type: "matching_information",
  instruction: "Match each statement with the correct person.",
  option_key_type: "alphabetical", // alphabetical, numeric, roman
  answer_options: [
    { option_key: "A", text: "Dr. Nilson" },
    { option_key: "B", text: "Prof. McKeachie" },
    { option_key: "C", text: "Dr. Levy" },
    { option_key: "D", text: "Prof. Smith" }
  ],
  questions: [
    {
      question_number: 1,
      question_text: "Who wrote the book on teaching?",
      correct_answer: "B", // option_key, not text
      explanation: null
    }
  ]
}
```

**Database Result:**
- `question` table: One group row
- `questions` table: One row per question, `correct_answer` stores `option_key` (e.g., "B")
- `options` table: Answer options stored once at group level with `option_key` and `option_text`, `question_number: null`

---

### 8. True/False/Not Given (`true_false_not_given`)

**Database Structure:**
- Group row in `question` table
- Individual questions in `questions` table
- No options table

**Input Format:**
```javascript
{
  type: "true_false_not_given",
  instruction: "Do the following statements agree with the information?",
  questions: [
    {
      question_number: 1,
      question_text: "The climate is changing.",
      correct_answer: "TRUE", // or "FALSE" or "NOT GIVEN"
      explanation: null
    }
  ]
}
```

**Database Result:**
- `question` table: One group row
- `questions` table: One row per question

---

### 9. Yes/No/Not Given (`yes_no_not_given`)

**Database Structure:**
- Same as `true_false_not_given`

**Input Format:**
```javascript
{
  type: "yes_no_not_given",
  instruction: "Do the following statements agree with the writer's views?",
  questions: [
    {
      question_number: 1,
      question_text: "The author supports this view.",
      correct_answer: "YES", // or "NO" or "NOT GIVEN"
      explanation: null
    }
  ]
}
```

---

## Important Notes

### Question Numbering

- Questions are numbered **sequentially across all parts** (1, 2, 3, ...)
- For `drag_drop` type, only correct answers (with `is_correct: true`) get question numbers
- Distractors in `drag_drop` have `question_number: null`

### File Handling

- **Image Upload**: Upload to `test-assets` bucket, `images/` folder
- **Audio Upload**: Upload to `listening-test` bucket, `audios/` folder
- **File Deletion**: When updating, mark files for deletion using `image_url_to_delete` or `listening_url_to_delete`
- **Blob URLs**: Preview URLs starting with `blob:` are not saved (only actual file uploads)

### Data Validation

Before saving, ensure:
1. **Fill in Blanks**: Number of `___` placeholders matches `answers.length`
2. **Table Completion**: Number of `___` in table cells matches `answers.length`
3. **All Types**: `question_text` is not empty (except for group rows where it's intentionally null)
4. **Multiple Choice**: At least one option has `is_correct: true`
5. **Table/Map**: `correct_answer` is a valid option letter

### Update vs Create

- **Create** (`id` is null): Generate new UUID for test, create all records
- **Update** (`id` exists): 
  - Delete all existing parts, questions, and options first
  - Then insert new data (ensures clean state)

### Error Handling

The save function includes:
- **Rollback**: If save fails, uploaded files are automatically deleted
- **Validation Errors**: Thrown with descriptive messages
- **Database Errors**: Wrapped with context about which operation failed

### Example Usage

```javascript
// Fetch test
const testData = await getTestById("test-uuid-123");

// Save new test
const formData = {
  title: "New Test",
  duration: 60,
  difficulty: "MEDIUM",
  type: "reading",
  is_premium: false,
  is_active: true
};

const parts = [
  {
    part_number: 1,
    title: "Part 1",
    content: "Reading passage...",
    image_url: null,
    listening_url: null,
    question_groups: [
      {
        type: "multiple_choice",
        instruction: "Choose the correct answer",
        questions: [
          {
            question_number: 1,
            question_text: "What is the main topic?",
            options: [
              { letter: "A", question_text: "Option A", is_correct: true },
              { letter: "B", question_text: "Option B", is_correct: false }
            ]
          }
        ]
      }
    ]
  }
];

const success = await saveFullTest(null, formData, parts);
```

---

## Additional Resources

- See `src/stores/testStore.js` for the complete implementation
- See `src/pages/ContentFormPage.jsx` for data processing logic
- See individual type documentation files in `type_db/` folder for specific examples

