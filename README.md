# Dimension Analysis

Exam analytics for a single instructor, running offline. Upload an exam's questions and scores and see how
students and the cohort perform across the cognitive dimensions **Recall, Comprehend, Solve, Build, Evaluate**.

```bash
npm install
npm run dev        # storage server (port 3001) + Vite (port 5173)
npm test           # unit tests
```

Data is stored as JSON files in `data/` (git-ignored). `npm run build` followed by `npm run server` serves the built
app from the storage server alone.

## Input files

Strict CSV formats, documented in [templates/README.md](templates/README.md) with header-plus-example files in
`templates/` and valid sample uploads in `samples/` (`small` and `large`; the large one has multiple-choice questions).

| file | required | notes |
| --- | --- | --- |
| `exam_config.csv` | yes | question type (`assignment` / `assessment`), difficulty, dimensions, topics, marks; optional `expected_solve_rate`, `question_subtype` (`mcq`) with its `correct_option` |
| `student_scores.csv` | yes | one column per question: marks, or the chosen option for `mcq` questions; blank = unattempted |
| `students.csv` | no | names; optional `section` |

Files that do not follow the format are rejected with the rows that need fixing.

## Pages

- **Analysis:** Cohort, Paper analysis, Simulation (expected vs actual, with tunable parameters and a 90% range over
  repeated runs), Student profile.
- **Tools:** Question review (review queue, reuse across exams, attempt behaviour), Sections, Correlations, Feedback
  sheets (print or download per student), What-if (rescoring), Grade bands, Distractors.
- **Library:** Upload, History, Compare exams, Saved exams, Settings (every threshold behind a tag, with a description of
  what it affects, plus backup and restore).

Colored verdict tags (Weak / Strong, Low / Medium / High deviation, ...) come from the thresholds in Settings and can
be switched off. Every table has search, per-column filters, sorting and CSV export.

## Code layout

The UI is Vue 3 with [shadcn-vue](https://www.shadcn-vue.com/) (Tailwind CSS v4, reka-ui) and Pinia.

- `src/lib/` pure analysis code, all unit tested: input validation, profiles, paper analysis, items, simulation,
  verdicts, settings, and one module per tool.
- `src/stores/` Pinia stores: `session` (open exam, saved exams, current page), `settings`, `notice`, `simulation`.
- `src/pages/` one component per page (`CohortPage`, `PaperPage`, `SimulationPage`, ...), with sub-components in
  `pages/paper/`, `pages/simulation/` and `pages/settings/`; `pages/index.js` is the page registry used by the navigation.
- `src/tools/` one component per tool page, registered in `tools/index.js`.
- `src/components/`
  - `ui/` shadcn-vue components as generated (default styles);
  - `common/` page header, section and stat cards, field, alert, select, confirm dialog, badges;
  - `display/` data table, verdict tag, bars, student sidebar, band editor;
  - `charts/` Chart.js and SVG charts; `feedback/` the printable feedback sheet; `layout/` header and navigation.
- Colors for verdict tones and the five dimensions are theme tokens in `src/style.css`; everything else uses the
  default shadcn theme.
- `server/` file storage (exams, student histories, settings, backup).
- `tests/` node:test specs; `scripts/generate_large_sample.js` regenerates `samples/large`.
