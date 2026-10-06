import { DEFAULT_EXPECTED_SOLVE_RATES } from './constants.js'

// Explanations shown by the "Learn more" button of each analysis section.
// A topic is { title, about, parts: [{ heading, entries: [{ term, text }] }] }.
// Thresholds are named after the groups on the Settings page.

const tierDefaults = Object.entries(DEFAULT_EXPECTED_SOLVE_RATES).map(([tier, rate]) => `${tier} ${rate}%`).join(', ')

const MASTERY =
  'Mastery is the marks a student earned divided by the marks available. A question left blank counts as zero. Absent students stay in the cohort with zero.'

export const HELP = {
  summary: {
    title: 'Summary',
    about: 'Six headline numbers for the paper. Every level tag uses the thresholds on the Settings page.',
    parts: [
      {
        heading: 'Cards',
        entries: [
          { term: 'Lowest / highest mean mastery, by dimension', text: `The dimension with the lowest (highest) cohort mean. ${MASTERY} A question with several dimensions shares its marks equally between them. The tag follows Settings → Mastery levels.` },
          { term: 'Spread between those dimensions', text: 'Highest dimension mean minus lowest dimension mean, in percentage points (pp). The tag follows Settings → Dimension balance.' },
          { term: 'Lowest mean mastery, by difficulty tier', text: 'The same, for the difficulty tiers (beginner to challenge), with the marks and number of questions in that tier.' },
          { term: 'Paper difficulty (cohort mean)', text: 'The average of every student’s overall mastery. The tag follows Settings → Overall difficulty.' },
          { term: 'Reliability (Cronbach’s alpha)', text: 'How consistently the questions rank the students: 0 to 1, higher meaning the questions agree more. It is lower when there are few questions or when they test different things. The tag follows Settings → Question quality.' },
          { term: 'Standard error of measurement', text: 'The typical error in a student’s total, in marks: the standard deviation of totals × √(1 − alpha). A smaller value means totals are steadier.' },
        ],
      },
    ],
  },

  overall: {
    title: 'Overall score distribution',
    about: 'How the cohort’s total scores are spread. Each student falls into exactly one range.',
    parts: [
      {
        heading: 'Cards',
        entries: [
          { term: 'Total marks', text: 'The sum of the marks of all questions.' },
          { term: 'Mean / Median', text: 'Average and middle score, as a percentage of the total marks (marks underneath).' },
          { term: 'Min / Max', text: 'The lowest and highest score.' },
          { term: 'Std deviation', text: 'How far scores typically lie from the mean, in percentage points (population standard deviation).' },
        ],
      },
      {
        heading: 'Table and graph',
        entries: [
          { term: 'Percentage / Marks toggle', text: 'Percentage uses ten ranges of 10%. Marks uses equal ranges in marks (a round width giving about ten ranges), so two exams with the same total marks can be compared range by range.' },
          { term: 'Range', text: 'The lower end is included and the upper end is not, except the last range, which includes its top. The highest range is listed first.' },
          { term: 'Students / % of cohort', text: 'The number of students in the range and their share of the whole cohort.' },
          { term: 'Distribution (bar)', text: 'The bar is the share of the cohort out of 100%, so a full bar means everyone is in that range.' },
          { term: 'Who', text: 'The students in the range with their score. Click a name to open the student profile.' },
        ],
      },
    ],
  },

  dimensions: {
    title: 'Score distribution by dimension',
    about: 'The same distribution as the overall one, but for each student’s mastery within one dimension (Recall, Comprehend, Solve, Build, Evaluate).',
    parts: [
      {
        heading: 'Reading a dimension',
        entries: [
          { term: 'Marks and questions', text: 'The marks available in the dimension and the number of questions that count towards it. A question with several dimensions counts in each, with its marks shared equally.' },
          { term: 'Mean, median, min, max, std dev', text: 'Statistics of the students’ mastery in that dimension, in percent (the standard deviation in percentage points).' },
          { term: 'Level tag', text: 'Weak, Average or Strong for the cohort mean, from Settings → Mastery levels.' },
          { term: 'Percentage / Marks toggle and the table', text: 'Work as in the overall distribution, using the marks of this dimension only.' },
          { term: 'Dimension selector', text: 'Shows one dimension or all of them.' },
        ],
      },
    ],
  },

  tiers: {
    title: 'Difficulty tiers',
    about: 'How the cohort did on the questions of each difficulty tier. The tier is the question_difficulty given for each question.',
    parts: [
      {
        heading: 'Tier table',
        entries: [
          { term: 'Questions / Marks / % of exam', text: 'The number of questions, their marks, and the share of the exam’s total marks.' },
          { term: 'Mean mastery', text: 'The average over students of marks earned ÷ marks available in the tier. The bar shows the same value out of 100%.' },
          { term: 'Level', text: 'Weak, Average or Strong for the mean, from Settings → Mastery levels.' },
          { term: 'Median, Min, Max, Std dev (pp)', text: 'The spread of the students’ mastery in that tier.' },
        ],
      },
      {
        heading: 'Tier order',
        entries: [
          { term: 'Easier tier / Harder tier', text: 'Each tier is compared with the next easier tier that has questions.' },
          { term: 'Change', text: 'Harder tier mean minus easier tier mean, in percentage points. Normally negative.' },
          { term: 'Order', text: 'Out of order means the harder tier scored higher than the easier one by more than the tolerance in Settings → Difficulty tier order. Otherwise In order.' },
        ],
      },
    ],
  },

  matrix: {
    title: 'Dimension × difficulty',
    about: 'Mean mastery for every combination of dimension and difficulty tier, to see where in the paper marks were won or lost.',
    parts: [
      {
        heading: 'Reading the grid',
        entries: [
          { term: 'Cell value', text: 'The cohort’s mean mastery for that dimension in that tier: marks earned ÷ marks available, averaged over students.' },
          { term: 'Under the value', text: 'The marks available in the cell and the number of questions (Q) behind it. Hover a cell for the average marks earned.' },
          { term: 'A dash', text: 'No question has that combination.' },
          { term: 'All tiers / All dimensions', text: 'Totals for a row, a column and the whole paper.' },
          { term: 'Shading', text: 'A darker blue means a higher mean mastery, from 0% to 100% (see the key at the top).' },
          { term: 'Shared marks', text: 'A question with several dimensions shares its marks equally between them, so it appears in more than one row.' },
        ],
      },
    ],
  },

  topics: {
    title: 'Topics',
    about: 'Mastery per topic. Topics are optional, so only questions with a topic count here, and this section is hidden when no question has one.',
    parts: [
      {
        heading: 'Table columns',
        entries: [
          { term: 'Topic', text: 'A topic named in question_topics.' },
          { term: 'Questions', text: 'The number of questions that list the topic.' },
          { term: 'Marks', text: 'The marks available for the topic. A question with several topics shares its marks equally between them.' },
          { term: 'Avg earned', text: 'The average marks students earned in the topic.' },
          { term: 'Mastery / Level / bar', text: 'Average earned ÷ marks available, its Weak/Average/Strong level (Settings → Mastery levels) and the same value as a bar out of 100%.' },
        ],
      },
    ],
  },

  blueprint: {
    title: 'Share of marks by dimension and tier',
    about: 'Compares how the paper’s marks are divided with the shares you intended. It describes the paper, not the students.',
    parts: [
      {
        heading: 'Table columns',
        entries: [
          { term: 'Kind / Name', text: 'A dimension or a difficulty tier.' },
          { term: 'Actual share', text: 'The marks in that dimension or tier as a percentage of the exam’s marks. Shared marks of multi-dimension questions are split equally.' },
          { term: 'Target', text: 'The target you set in Settings → Paper blueprint. Empty when none is set.' },
          { term: 'Actual − target', text: 'The difference in percentage points.' },
          { term: 'Status', text: 'On target when the difference is within the tolerance in Settings, otherwise Over or Under.' },
        ],
      },
    ],
  },

  quartiles: {
    title: 'Top and bottom quarter of students',
    about: 'Compares the highest and lowest scoring students to show which dimensions and tiers set them apart.',
    parts: [
      {
        heading: 'How the groups are formed',
        entries: [
          { term: 'Groups', text: 'Students are ranked by overall mastery. The top group and the bottom group each hold a quarter of the students (rounded, at least one student). Ties are kept in the order of the upload.' },
        ],
      },
      {
        heading: 'Table and graph',
        entries: [
          { term: 'Top / Bottom quarter mean', text: 'The mean mastery of each group in the dimension or tier.' },
          { term: 'Separation', text: 'Top mean minus bottom mean, in percentage points. A larger value means that dimension or tier differs more between strong and weak students.' },
          { term: 'Bottom / top (bars)', text: 'The two means side by side, each out of 100%.' },
        ],
      },
    ],
  },

  questions: {
    title: 'Questions: expected and actual solve rate',
    about: 'One row per question. A question is solved when a student earns its full marks. Percentage-point differences are written as pp.',
    parts: [
      {
        heading: 'Cards',
        entries: [
          { term: 'Mean absolute deviation', text: 'The average size of the difference between actual and expected solve rate over all questions, ignoring the sign.' },
          { term: 'Questions by deviation level', text: 'How many questions fall in the Low, Medium and High deviation level, from Settings → Solve-rate deviation.' },
          { term: 'Largest negative / positive deviation', text: 'The questions that were solved least / most often compared with what was expected.' },
        ],
      },
      {
        heading: 'Table columns',
        entries: [
          { term: 'Question', text: 'The question id.' },
          { term: 'Type', text: 'assignment or assessment.' },
          { term: 'Dimensions', text: 'The dimensions the question belongs to.' },
          { term: 'Tier', text: 'The difficulty tier of the question.' },
          { term: 'Topics', text: 'The topics of the question, if any were given.' },
          { term: 'Marks', text: 'The marks of the question.' },
          { term: 'Expected', text: `The solve rate expected beforehand: expected_solve_rate from the file, or the tier default (${tierDefaults}) when blank.` },
          { term: 'Expected source', text: 'Where the expected rate came from: the file, or the difficulty default.' },
          { term: 'Actual', text: 'Students who earned full marks ÷ all students in the cohort. Absent students count in the cohort with zero.' },
          { term: 'Solved', text: 'The number of students who solved it, out of the cohort size.' },
          { term: 'Of attempted', text: 'Students who solved it ÷ students who attempted it (a blank score is not an attempt).' },
          { term: 'Attempted by', text: 'Students who attempted it ÷ students who were present. Absent students are left out.' },
          { term: 'Mean score', text: 'The average marks earned on the question as a percentage of its marks (blank counts as zero).' },
          { term: 'Deviation', text: 'Actual minus expected, in percentage points. Positive means the question was solved more often than expected; negative, less often.' },
          { term: 'Deviation level', text: 'Low, Medium or High by the size of the deviation, from Settings → Solve-rate deviation.' },
          { term: 'Discrimination', text: 'Mean share of marks earned by the top 27% of students (by total score) minus that of the bottom 27%. From −1 to 1: positive means stronger students did better on the question; negative means weaker students did better.' },
          { term: 'Discrimination level', text: 'Negative, Poor, Fair or Good, from Settings → Question quality.' },
          { term: 'Item-rest r', text: 'The correlation between the scores on this question and the total of all the other questions. Higher means the question moves with the rest of the paper.' },
          { term: 'Alpha if removed', text: 'The paper’s reliability alpha if this question were left out. A value above the overall alpha means the question lowers consistency.' },
          { term: 'Flags', text: 'Too easy, Too hard, Many skipped or Negative discrimination, using Settings → Question flags.' },
          { term: 'Expected / actual', text: 'The expected and actual solve rate as two bars, each out of 100%.' },
        ],
      },
    ],
  },
}

export const helpTopics = () => HELP
