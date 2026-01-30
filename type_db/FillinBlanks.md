

## 4. Fill in Blanks

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
          "type": "fill_in_blanks",
          "instruction": "Write NO MORE THAN TWO WORDS",
          "question_text": "The research was conducted by Dr. Smith who discovered that ___ can be used to treat ___ diseases. The study showed that ___ patients improved significantly.",
          "question_range": 3,
          "image_url": null,
          "questions": [
            {
              "id": "question-uuid-101",
              "test_id": "test-uuid-123",
              "question_id": "group-uuid-789",
              "part_id": "part-uuid-456",
              "question_number": 1,
              "question_text": "antibiotics",
              "correct_answer": "antibiotics",
              "explanation": null,
              "is_correct": true
            },
            {
              "id": "question-uuid-102",
              "test_id": "test-uuid-123",
              "question_id": "group-uuid-789",
              "part_id": "part-uuid-456",
              "question_number": 2,
              "question_text": "chronic",
              "correct_answer": "chronic",
              "explanation": null,
              "is_correct": true
            },
            {
              "id": "question-uuid-103",
              "test_id": "test-uuid-123",
              "question_id": "group-uuid-789",
              "part_id": "part-uuid-456",
              "question_number": 3,
              "question_text": "eighty percent",
              "correct_answer": "eighty percent",
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