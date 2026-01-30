
## 1. Multiple Answers

### Data Structure Saved to Database

#### `question` Table (Group Level)
One row is created per `multiple_answers` group with:
- `id`: UUID (primary key)
- `test_id`: UUID (foreign key to test)
- `part_id`: UUID (foreign key to part)
- `type`: "multiple_answers"
- `instruction`: TEXT (nullable) - Instructions like "Choose TWO correct answers."
- `question_text`: TEXT (required) - The main question text (e.g., "Which TWO decisions do the students reach about the subject matter of their assignment?")
- `question_range`: INTEGER - Number of correct answers (equals number of questions created)
- `image_url`: NULL (not used for this type)

#### `questions` Table (Individual Questions)
One row per correct answer option:
- `id`: UUID (primary key)
- `test_id`: UUID
- `question_id`: UUID (foreign key to question.id - the group)
- `part_id`: UUID
- `question_number`: INTEGER - Sequential question number across entire test
- `question_text`: TEXT - The option text (e.g., "They will keep the assessment criteria in mind.")
- `correct_answer`: TEXT - The option_key (e.g., "A", "B", "C")
- `explanation`: TEXT (nullable)
- `is_correct`: BOOLEAN - Always `true` for multiple_answers questions

#### `options` Table (All Options)
One row per option at the group level:
- `id`: UUID (primary key)
- `test_id`: UUID
- `question_id`: UUID (foreign key to question.id - the group)
- `part_id`: UUID
- `question_number`: NULL (options are global to the group)
- `option_key`: TEXT - The option identifier (e.g., "A", "B", "C", "D")
- `option_text`: TEXT - The option text (e.g., "They will keep the assessment criteria in mind.")
- `is_correct`: BOOLEAN - `true` if this option is marked as correct, `false` otherwise

### Example JSON Structure

```json
{
  "id": "test-uuid-123",
  "title": "IELTS Reading Practice Test",
  "type": "reading",
  "duration": 60,
  "difficulty": "MEDIUM",
  "is_premium": false,
  "is_active": true,
  "question_quantity": 2,
  "part": [
    {
      "id": "part-uuid-456",
      "test_id": "test-uuid-123",
      "part_number": 1,
      "title": "Part 1",
      "content": "Reading passage text here...",
      "image_url": null,
      "listening_url": null,
      "question": [
        {
          "id": "group-uuid-789",
          "test_id": "test-uuid-123",
          "part_id": "part-uuid-456",
          "type": "multiple_answers",
          "instruction": "Choose TWO correct answers.",
          "question_text": "Which TWO decisions do the students reach about the subject matter of their assignment?",
          "question_range": 2,
          "image_url": null,
          "options": [
            {
              "id": "opt-201",
              "question_id": "group-uuid-789",
              "option_key": "A",
              "option_text": "They will keep the assessment criteria in mind.",
              "is_correct": true
            },
            {
              "id": "opt-202",
              "question_id": "group-uuid-789",
              "option_key": "B",
              "option_text": "They will limit the scale of their investigation.",
              "is_correct": true
            },
            {
              "id": "opt-203",
              "question_id": "group-uuid-789",
              "option_key": "C",
              "option_text": "They will select countries from all over the world.",
              "is_correct": false
            },
            {
              "id": "opt-204",
              "question_id": "group-uuid-789",
              "option_key": "D",
              "option_text": "They will collect data about two groups of countries.",
              "is_correct": false
            },
            {
              "id": "opt-205",
              "question_id": "group-uuid-789",
              "option_key": "E",
              "option_text": "They will find figures for wind and nuclear power.",
              "is_correct": false
            }
          ],
          "questions": [
            {
              "id": "question-uuid-101",
              "test_id": "test-uuid-123",
              "question_id": "group-uuid-789",
              "part_id": "part-uuid-456",
              "question_number": 1,
              "question_text": "They will keep the assessment criteria in mind.",
              "correct_answer": "A",
              "explanation": null,
              "is_correct": true
            },
            {
              "id": "question-uuid-102",
              "test_id": "test-uuid-123",
              "question_id": "group-uuid-789",
              "part_id": "part-uuid-456",
              "question_number": 2,
              "question_text": "They will limit the scale of their investigation.",
              "correct_answer": "B",
              "explanation": null,
              "is_correct": true
            }
          ]
        }
      ]
    }
  ]
}
```

### Key Points

1. **Group Level (`question` table)**: Stores the main question text, instruction, and question_range
2. **Questions (`questions` table)**: One question entry per correct answer option, with `correct_answer` storing the option_key
3. **Options (`options` table)**: All options (both correct and incorrect) stored at group level with `question_number: null`
4. **Question Range**: Automatically calculated as the number of correct answers
5. **Duplicate Prevention**: Question text must be unique within the test
6. **Question Numbering**: Sequential numbering across all parts and groups in the test
