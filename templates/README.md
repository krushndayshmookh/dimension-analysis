# Input format

CSV files, comma-separated, with a header row. Files that do not follow this
format are rejected on upload with the rows that need fixing. Valid examples to
upload are in `../samples/`.

Students and exams are uploaded separately:

1. **Cohort:** on the Cohorts page, add the students of a group once with
   `students.csv`, under a name of your choice. Uploading to an existing cohort
   merges by `student_id` (new students are added, changed names or sections are
   updated, nobody is duplicated or removed). A student belongs to one cohort only.
2. **Exam:** on the Upload page, choose the cohort, then upload `exam_config.csv`
   and `student_scores.csv`, and optionally `attendance.csv`. The same exam may be
   uploaded again; each upload is a separate exam.

Column names are case-insensitive; surrounding spaces are ignored.

## `exam_config.csv` (required)

One row per question.

| column | required | rule |
| --- | --- | --- |
| `question_id` | yes | Unique (ignoring case). Becomes a column name in the scores file. Keep ids stable across exams: a question reused in a later exam is recognised by the same `question_type` and `question_id`. |
| `question_type` | yes | Exactly `assignment` or `assessment` (case-insensitive). |
| `question_difficulty` | yes | One of `beginner`, `easy`, `medium`, `hard`, `challenge`. |
| `question_dimension` | yes | One or more of `Recall`, `Comprehend`, `Solve`, `Build`, `Evaluate`, separated by `;`. Full names only. |
| `question_topics` | no | One or more topics, separated by `;`. Leave blank (or leave out the column) for a question with no topics; topic analysis then only covers the questions that have them. |
| `marks` | yes | Number greater than 0. |
| `expected_solve_rate` | no | Percentage from 0 to 100 (`80` means 80%, never `0.8`). Leave blank to use the default for the difficulty tier: beginner 85, easy 75, medium 55, hard 35, challenge 20. |
| `question_subtype` | no | `mcq` for a multiple-choice question, or blank. Only assessments can be `mcq`. Multiple-choice questions get distractor analysis, and the simulation applies its guessing floor to them. |
| `correct_option` | for `mcq` | The correct option, for example `B` (compared ignoring case). Required for an `mcq` question and not allowed for any other. |

Marks of a question with several dimensions (or topics) are split equally
across them.

## `student_scores.csv` (required)

One row per student, one column per question.

- The first column is `student_id` (unique, case-sensitive).
- Every other column is a `question_id` from the exam config, and every
  question in the exam config must have a column.
- For an `mcq` question the cell is the **option the student chose** (a short label such as `A`; case is ignored). The marks are worked out from the answer key: full marks for the correct option, 0 for any other. (Negative marking and partial marks for multiple choice are not supported.)
- For every other question a cell is a number from 0 up to the question's `marks` (decimals allowed for
  partial credit), or **blank for unattempted**. `0` means attempted and
  scored zero. No other placeholders (`NA`, `-`, ...) are accepted.

## `students.csv` (the cohort)

| column | rule |
| --- | --- |
| `student_id` | Unique within the file, and not in another cohort. |
| `student_name` | Required. |
| `section` | Optional. The student's section or batch, used to compare sections. Blank means no section. |

Extra columns are ignored.

## `attendance.csv` (optional, per exam)

| column | rule |
| --- | --- |
| `student_id` | Must be in the cohort. Unique. |
| `attendance` | `present` or `absent`; blank means present. |

Every student of the cohort is in the exam. A cohort student with **no row in
the scores file counts as absent**, so the attendance file is only needed to mark
absent a student who does have a row. Absent students stay in the cohort with zero
marks and are counted as absent; any scores recorded for them are ignored (with a
note on upload). They are left out of attempt rates and skipping statistics. An
explicit `present` for a student with no scores row keeps them present with every
question unattempted.

## Converting the analytics team's sheets

Data → **Sheet converter** (or `node scripts/convert.js`, see the comment at the top of the script) turns the question listing, the coding scores, the quiz scores and the enrolled students into the cohort file, `exam_config.csv`, `student_scores.csv` and `attendance.csv`. Each sheet is recognised by its columns. Total marks of the coding questions and of the quiz questions are given on the page and divided equally over the questions of that type; coding scores follow the share of test cases passed, negative quiz marks count as 0, and a blank stays unattempted. Enrolled students who appear in no score sheet stay in the cohort and count as absent. Listing rows that are not in the score sheets are listed so they can be added or left out, and every cell can be edited before downloading.
