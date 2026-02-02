
## 2. True/False/Not Given

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
          "type": "true_false_not_given",
          "instruction": "Do the following statements agree with the information given in the passage?",
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
              "question_text": "The research was conducted over a period of five years.",
              "correct_answer": "TRUE",
              "explanation": null,
              "is_correct": true
            },
            {
              "id": "question-uuid-102",
              "test_id": "test-uuid-123",
              "question_id": "group-uuid-789",
              "part_id": "part-uuid-456",
              "question_number": 2,
              "question_text": "All participants completed the study.",
              "correct_answer": "FALSE",
              "explanation": null,
              "is_correct": true
            },
            {
              "id": "question-uuid-103",
              "test_id": "test-uuid-123",
              "question_id": "group-uuid-789",
              "part_id": "part-uuid-456",
              "question_number": 3,
              "question_text": "The results were published immediately.",
              "correct_answer": "NOT GIVEN",
              "explanation": null,
              "is_correct": true
            }
          ],
          "options": []
        }
      ]
    }
  ]
}
```

---
