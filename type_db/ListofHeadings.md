

## 6. Table (List of Headings)

```json
{
  "id": "test-uuid-123",
  "title": "IELTS Reading Practice Test",
  "type": "reading",
  "duration": 60,
  "difficulty": "MEDIUM",
  "is_premium": false,
  "is_active": true,
  "question_quantity": 3,
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
          "type": "table",
          "instruction": "Choose the correct heading for each section.",
          "question_text": null,
          "question_range": 3,
          "image_url": null,
          "questions": [
            {
              "id": "question-uuid-101",
              "test_id": "test-uuid-123",
              "question_id": "group-uuid-789",
              "part_id": "part-uuid-456",
              "question_number": 1,
              "question_text": "Introduction to climate science",
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
              "question_text": "Impact on agriculture",
              "correct_answer": "C",
              "explanation": null,
              "is_correct": true
            },
            {
              "id": "question-uuid-103",
              "test_id": "test-uuid-123",
              "question_id": "group-uuid-789",
              "part_id": "part-uuid-456",
              "question_number": 3,
              "question_text": "Future predictions",
              "correct_answer": "B",
              "explanation": null,
              "is_correct": true
            }
          ],
          "options": [
            {
              "id": "option-uuid-201",
              "test_id": "test-uuid-123",
              "question_id": "group-uuid-789",
              "part_id": "part-uuid-456",
              "question_number": null,
              "option_text": "A",
              "is_correct": true
            },
            {
              "id": "option-uuid-202",
              "test_id": "test-uuid-123",
              "question_id": "group-uuid-789",
              "part_id": "part-uuid-456",
              "question_number": null,
              "option_text": "B",
              "is_correct": false
            },
            {
              "id": "option-uuid-203",
              "test_id": "test-uuid-123",
              "question_id": "group-uuid-789",
              "part_id": "part-uuid-456",
              "question_number": null,
              "option_text": "C",
              "is_correct": false
            },
          ]
        }
      ]
    }
  ]
}
```

---