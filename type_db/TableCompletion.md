

## 7. Table Completion

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
          "type": "table_completion",
          "instruction": "Write NO MORE THAN TWO WORDS",
          "question_text": "<table><thead><tr><th>Year</th><th>Some key events in US electrification</th></tr></thead><tbody><tr><td>1879</td><td>___</td></tr><tr><td>1882</td><td>___</td></tr><tr><td>1890</td><td>___</td></tr></tbody></table>",
          "question_range": 3,
          "image_url": null,
          "questions": [
            {
              "id": "question-uuid-101",
              "test_id": "test-uuid-123",
              "question_id": "group-uuid-789",
              "part_id": "part-uuid-456",
              "question_number": 1,
              "question_text": "Edison's light bulb",
              "correct_answer": "Edison's light bulb",
              "explanation": null,
              "is_correct": true
            },
            {
              "id": "question-uuid-102",
              "test_id": "test-uuid-123",
              "question_id": "group-uuid-789",
              "part_id": "part-uuid-456",
              "question_number": 2,
              "question_text": "First power station",
              "correct_answer": "First power station",
              "explanation": null,
              "is_correct": true
            },
            {
              "id": "question-uuid-103",
              "test_id": "test-uuid-123",
              "question_id": "group-uuid-789",
              "part_id": "part-uuid-456",
              "question_number": 3,
              "question_text": "AC system introduced",
              "correct_answer": "AC system introduced",
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