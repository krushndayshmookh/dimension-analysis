# Input format

Three CSV files, comma-separated, with a header row. Files that do not follow
this format are rejected on upload with the rows that need fixing. Valid
examples to upload are in `../samples/`.

Column names are case-insensitive; surrounding spaces are ignored.

## `exam_config.csv` (required)

One row per question.

| column | required | rule |
| --- | --- | --- |
| `question_id` | yes | Unique (ignoring case). Becomes a column name in the scores file. Keep ids stable across exams: a question reused in a later exam is recognised by the same `question_type` and `question_id`. |
| `question_type` | yes | Exactly `assignment` or `assessment` (case-insensitive). |
| `question_difficulty` | yes | One of `beginner`, `easy`, `medium`, `hard`, `challenge`. |
| `question_dimension` | yes | One or more of `Recall`, `Comprehend`, `Solve`, `Build`, `Evaluate`, separated by `;`. Full names only. |
| `question_topics` | yes | One or more topics, separated by `;`. |
| `marks` | yes | Number greater than 0. |
| `expected_solve_rate` | no | Percentage from 0 to 100 (`80` means 80%, never `0.8`). Leave blank to use the default for the difficulty tier: beginner 85, easy 75, medium 55, hard 35, challenge 20. |
| `correct_option` | no | For multiple-choice questions, the correct option (for example `B`; compared ignoring case). Questions with an answer key are treated as multiple choice by the simulation, and it is needed for distractor analysis. Leave blank for other questions. |

Marks of a question with several dimensions (or topics) are split equally
across them.

## `student_scores.csv` (required)

One row per student, one column per question.

- The first column is `student_id` (unique, case-sensitive).
- Every other column is a `question_id` from the exam config, and every
  question in the exam config must have a column.
- A cell is a number from 0 up to the question's `marks` (decimals allowed for
  partial credit), or **blank for unattempted**. `0` means attempted and
  scored zero. No other placeholders (`NA`, `-`, ...) are accepted.

## `students.csv` (optional)

| column | rule |
| --- | --- |
| `student_id` | Unique. Must include every student in the scores file. |
| `student_name` | Required. |
| `section` | Optional. The student's section or batch, used to compare sections. Blank means no section. |

Without this file, student ids are used as names and there are no sections. Extra columns are ignored.

## `student_answers.csv` (optional)

Needed only for distractor analysis. One row per student, one column per
question that has a `correct_option` in the exam config.

- The first column is `student_id`; every student must be in the scores file.
- Every question with a `correct_option` must have a column, and no other
  question may.
- A cell is the option the student chose (a short label such as `A`; case is
  ignored), or blank for no answer.
- Answers that disagree with the scores (the correct option chosen without full
  marks, or another option with full marks) are reported as a warning.
