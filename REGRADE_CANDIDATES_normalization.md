# Re-grade candidates — answer normalization (2026-08-04)

7 `user_answers` rows that the answer-normalization layer would now grade **correct**.
All seven are dates. **Nothing has been re-graded** — this file exists so the decision
stays executable later. Attempt scores in `user_attempts` are likewise untouched.

Measured across all 563 prod free-text answer rows: these 7 flip wrong->correct, and
0 rows flip correct->wrong.

| Test | Q | Student wrote | Stored key | `user_answers.id` | attempt |
|---|---|---|---|---|---|
| Full Listening Test 1 | 10 | `october 15` | `15th October` | `efe1f2e4-3241-424e-af3e-6f29a800fc6d` | `06c8dd08-b5da-4a38-bb14-9348124e5438` |
| Full Listening Test 1 | 10 | `15 th October` | `15th October` | `211fea93-a8c2-4896-a547-a1130e83a4f5` | `59c31096-cc9b-4ec9-bd6d-297da585f2a7` |
| Full Listening Test 2 | 2 | `11th july` | `11 July` | `ed80bb01-9ec2-40b6-bd12-d00d47921967` | `39e9e646-e02d-4c52-8588-d2ddbec82b9a` |
| Full Listening Test 3 | 1 | `30th march 1988` | `30 March 1988` | `881a5516-3377-46a2-bb42-41daa0d43769` | `10dad82c-37c2-4769-a89e-d38e6cb81e00` |
| Full Listening Test 3 | 1 | `30th march  1988` | `30 March 1988` | `787cefbd-4c46-45a7-8d8c-bdb79beb1de8` | `9ec1ff4c-fbd3-4e1e-b8c4-c3afa857c22c` |
| Full Listening Test 5 | 6 | `November 1st` | `November 1` | `b4ce4242-3fbb-4e41-ae4b-f772734baab6` | `753f5cf8-5221-415a-b1c2-654a41b3e462` |
| Full Listening Test 5 | 29 | `17th February` | `17 February` | `ea002cd7-d535-4235-9e3f-482c85bd4d45` | `753f5cf8-5221-415a-b1c2-654a41b3e462` |

## If you decide to re-grade

Each row needs `is_correct = true`, and the parent attempt's `correct_answers` and
`score` recomputed — the score is stored, not derived, so flipping the answer row alone
would leave the attempt inconsistent. Four distinct attempts are involved.

Note two pairs are the same question answered by different attempts
(Full Listening Test 1 q10, Full Listening Test 3 q1), so 6 distinct question rows.
