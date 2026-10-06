# Input format

Three CSV files, comma-separated, with a header row. Files that do not follow
this format are rejected on upload with the rows that need fixing. Valid
examples to upload are in `../samples/`.

Column names are case-insensitive; surrounding spaces are ignored.

## `exam_config.csv` (required)

One row per question.

| column | required | rule |
| --- | --- | --- |
| `question_id` | yes | Unique (ignoring case). Becomes a column name in the scores file. |
| `question_type` | yes | Free text, e.g. `MCQ`, `Coding`. The simulation can treat types differently. |
| `question_difficulty` | yes | One of `beginner`, `easy`, `medium`, `hard`, `challenge`. |
| `question_dimension` | yes | One or more of `Recall`, `Comprehend`, `Solve`, `Build`, `Evaluate`, separated by `;`. Full names only. |
| `question_topics` | yes | One or more topics, separated by `;`. |
| `marks` | yes | Number greater than 0. |
| `expected_solve_rate` | no | Percentage from 0 to 100 (`80` means 80%, never `0.8`). Leave blank to use the default for the difficulty tier: beginner 85, easy 75, medium 55, hard 35, challenge 20. |

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

Without this file, student ids are used as names. Extra columns are ignored.
