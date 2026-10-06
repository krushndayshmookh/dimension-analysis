// Learn more topics for the analysis pages and the library pages (see help.js).
const MASTERY = 'Mastery is the marks earned divided by the marks available; a blank counts as zero and absent students count with zero.'
const entry = (term, text) => ({ term, text })

export const PAGES = {
  'page.paper': {
    title: 'Paper analysis',
    about: 'Looks at the paper itself: how its marks are divided and how each question behaved. Every section has its own Learn more button.',
    parts: [{ heading: 'Sections', entries: [
      entry('Summary and distributions', 'Headline numbers and how scores are spread, overall and per dimension.'),
      entry('Tiers, matrix, topics and blueprint', 'Mastery by difficulty tier and dimension, topics, and the share of marks against your targets.'),
      entry('Top and bottom quarter, Questions', 'What separates strong from weak students, and the expected against actual solve rate of every question.'),
      entry('Print', 'Prints the page, or saves it as a PDF from the print dialog.'),
    ] }],
  },

  'page.cohort': {
    title: 'Cohort overview',
    about: 'The whole class at a glance: scores, mastery per dimension, who may need attention, and every student with rank and level.',
    parts: [
      { heading: 'Cards at the top', entries: [
        entry('Students', 'The number of students in the exam. Absent students are included and counted separately underneath.'),
        entry('Average score', 'The mean marks earned out of the total marks.'),
        entry('Mastery', `${MASTERY} The cohort figure is the average over students. The tag follows Settings → Overall difficulty.`),
        entry('Accuracy', 'Marks earned divided by the marks of the questions the student attempted. It is higher than mastery when questions were left blank.'),
        entry('At or above pass mark / distinction mark', 'How many students reach each mark, which are set in Settings → Pass and distinction. The percentage is of all students.'),
      ] },
      { heading: 'Moving around', entries: [
        entry('Click a student', 'Any row opens that student’s profile.'),
        entry('Tables', 'Every table can be searched, sorted by any column, filtered per column and exported to CSV.'),
      ] },
    ],
  },
  'cohort.radar': {
    title: 'Cohort mastery by dimension',
    about: 'A radar chart of the cohort’s mastery in each dimension.',
    parts: [{ heading: 'Reading the chart', entries: [
      entry('Each spoke', 'One dimension (Recall, Comprehend, Solve, Build, Evaluate). The further from the centre, the higher the cohort’s mastery, from 0% to 100%.'),
      entry('Shape', 'A balanced shape means similar mastery in every dimension; a dent shows a dimension with lower mastery.'),
    ] }],
  },
  'cohort.dimensions': {
    title: 'Dimensions',
    about: 'The cohort’s numbers behind the radar chart.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Dimension', 'The dimension. A question with several dimensions shares its marks equally between them.'),
      entry('Marks available', 'The marks in the exam that count towards the dimension.'),
      entry('Avg earned', 'The average marks students earned in the dimension.'),
      entry('Mastery', 'Average earned divided by marks available.'),
      entry('Level', 'Weak, Average or Strong, from Settings → Mastery levels.'),
      entry('Accuracy', 'Average earned divided by the marks of the attempted questions in the dimension.'),
      entry('Bar', 'The mastery as a bar out of 100%.'),
    ] }],
  },
  'cohort.attention': {
    title: 'Students needing attention',
    about: 'Students who meet at least one of the attention rules. The list is a filter on the data, not a verdict.',
    parts: [{ heading: 'The rules (Settings → Students needing attention)', entries: [
      entry('Below pass mark', 'Overall mastery under the pass mark.'),
      entry('Near pass mark', 'Overall mastery within the set number of points above the pass mark.'),
      entry('Weak in several dimensions', 'Weak in at least the set number of dimensions. With the cohort margin switched on, a student is Weak only when also that many points below the cohort.'),
      entry('Table columns', 'ID, name, mastery, the reasons that apply, and the dimensions where the student is Weak.'),
    ] }],
  },
  'cohort.students': {
    title: 'Students',
    about: 'Every student with score, mastery and standing in the cohort.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Score', 'Marks earned out of the total marks.'),
      entry('Mastery / Level / Accuracy', 'As in the cards above, for the student.'),
      entry('Rank', '1 is the highest mastery. Students with equal mastery share a rank.'),
      entry('Percentile', 'The share of students who scored lower, with ties counting half.'),
      entry('z-score', 'How many standard deviations the student’s mastery is above (positive) or below (negative) the cohort mean.'),
      entry('Dimension columns', 'The student’s mastery in each dimension. The coloured dot is the level: Weak, Average or Strong (Settings → Mastery levels, and the cohort margin if switched on).'),
      entry('Lowest / Highest dimension', 'The dimensions where the student’s mastery is lowest and highest.'),
      entry('Section', 'Shown when the student file has a section column.'),
    ] }],
  },

  'page.student': {
    title: 'Student profile',
    about: 'One student against the cohort. Choose a student in the sidebar, which can be searched and filtered by section.',
    parts: [{ heading: 'On the page', entries: [
      entry('Sidebar', 'Lists the students with their mastery; absent students are marked. A coloured dot shows the level.'),
      entry('Sections', 'Radar against the cohort, highlights, and the dimension, tier and topic breakdowns.'),
    ] }],
  },
  'student.metric': {
    title: 'Radar metric',
    about: 'Chooses what the radar chart and its cohort reference show.',
    parts: [{ heading: 'Options', entries: [
      entry('Mastery', 'Marks earned divided by all marks available in the dimension. Blank questions count as zero.'),
      entry('Accuracy', 'Marks earned divided by the marks of attempted questions only, so unattempted questions do not pull the figure down.'),
    ] }],
  },
  'student.radar': {
    title: 'Student against the cohort',
    about: 'The student’s radar over the cohort average.',
    parts: [{ heading: 'Reading the chart', entries: [
      entry('Student', 'The student’s value in each dimension, by the chosen metric.'),
      entry('Cohort average', 'The cohort’s value in the same dimension, drawn as the reference. Where the student’s shape is outside it, the student is above the cohort.'),
    ] }],
  },
  'student.summary': {
    title: 'Student highlights',
    about: 'The student’s main numbers.',
    parts: [{ heading: 'Fields', entries: [
      entry('Marks earned', 'Marks earned out of the total marks.'),
      entry('Attempted marks', 'The marks of the questions the student attempted.'),
      entry('Mastery / Accuracy', 'Marks earned divided by all marks / by attempted marks.'),
      entry('Rank', 'Position in the cohort by mastery; ties share a rank.'),
      entry('Percentile / z-score', 'Share of students who scored lower (ties count half), and the distance from the cohort mean in standard deviations.'),
      entry('Highest / Lowest-mastery dimension', 'The student’s dimensions with the highest and lowest mastery, with the level tag.'),
      entry('Not attempted', 'The questions left blank. For an absent student this shows Absent instead.'),
      entry('Needs attention', 'The reasons from the attention rules in Settings, if any apply.'),
      entry('Longitudinal history', 'Opens the student’s results across all saved exams.'),
    ] }],
  },
  'student.dimensions': {
    title: 'Dimensions',
    about: 'The student’s result in each dimension compared with the cohort.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Earned / Exam marks / Attempted marks', 'Marks earned, marks available in the exam, and marks of the attempted questions.'),
      entry('Mastery / Accuracy', 'Earned divided by exam marks / by attempted marks.'),
      entry('Level', 'Weak, Average or Strong (Settings → Mastery levels). With the cohort margin on, Weak or Strong also needs a gap from the cohort.'),
      entry('Cohort mastery / vs cohort', 'The cohort’s mastery and the student’s minus the cohort’s, in percentage points.'),
    ] }],
  },
  'student.tiers': {
    title: 'Difficulty tiers',
    about: 'The same breakdown by difficulty tier. Marks are never shared between tiers: a question belongs to one tier.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Columns', 'As in the dimension table: earned, exam marks, attempted marks, mastery, level, accuracy, cohort mastery and the difference from the cohort.'),
    ] }],
  },
  'student.topics': {
    title: 'Topics',
    about: 'The same breakdown by topic. Marks of a multi-topic question are shared equally between its topics, and only questions that have topics count.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Columns', 'As in the dimension table: earned, exam marks, attempted marks, mastery, level, accuracy, cohort mastery and the difference from the cohort.'),
    ] }],
  },

  'page.simulation': {
    title: 'Expected vs actual (simulation)',
    about: 'Simulates a synthetic cohort whose chance of solving each question matches its expected solve rate, then compares it with the real cohort. It shows what the paper would look like if every question behaved as expected.',
    parts: [
      { heading: 'Cards', entries: [
        entry('Mean, Median, Standard deviation', 'Expected is from the simulation; actual is the real cohort. The gap is actual minus expected in percentage points and is tagged Aligned, Moderate or Large (Settings → Simulation gaps).'),
        entry('90% range', 'When the simulation runs several times, the range that covers 90% of the expected results, and whether the actual value is inside it. A value outside the range is unlikely to be chance alone.'),
        entry('Distribution distance', 'Half the sum of the differences between the expected and actual share of students in each 10% range: 0% means identical distributions, 100% means no overlap.'),
      ] },
      { heading: 'Last run line', entries: [
        entry('Summary', 'The parameters of the latest run: synthetic students, seed, ability, discrimination, partial-credit questions, guessing floor and the number of runs behind the range.'),
      ] },
    ],
  },
  'simulation.parameters': {
    title: 'Simulation parameters',
    about: 'Change the parameters and run again. The same seed and parameters always give the same result.',
    parts: [
      { heading: 'Parameters', entries: [
        entry('Synthetic cohort size', 'The number of simulated students. A larger number reduces random noise.'),
        entry('Random seed', 'Fixes the random numbers. “Run with a new random seed” picks another.'),
        entry('Runs for the range', 'How many simulations (seed, seed+1, …) form the 90% range. 1 turns the range off.'),
        entry('Ability mean and standard deviation', 'Each synthetic student has an ability drawn from a normal distribution. A student at the mean ability succeeds at exactly the expected solve rate.'),
        entry('Discrimination', 'How sharply the chance of success rises with ability.'),
        entry('Guessing floor', 'The least chance of full marks on a multiple-choice question.'),
        entry('Test cases per partial-credit question and ability effect', 'Partial-credit questions give marks in proportion to test cases passed; the effect sets how the chance of full credit changes with ability.'),
        entry('Minimum / maximum expected rate', 'Expected rates outside these limits are moved to them before simulating.'),
        entry('Partial-credit questions', 'Detect them from the actual scores, treat all questions as partial credit, or none.'),
      ] },
      { heading: 'Buttons', entries: [
        entry('Run, Run with a new seed, Reset', 'Run uses the parameters as they are; Reset returns to the defaults.'),
      ] },
    ],
  },
  'simulation.distribution': {
    title: 'Score distribution (expected vs actual)',
    about: 'The share of students in each score range, expected and actual.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Range', 'A percentage or mark range, highest first; the toggle switches between the two.'),
      entry('Expected / Actual students and %', 'The number and share of students in the range, in the simulation and in the real cohort.'),
      entry('Actual − expected / Level', 'The difference in percentage points and its tag from Settings → Simulation gaps.'),
      entry('Expected 90% range / Actual vs range', 'Shown when there were several runs: the range of the expected share, and whether the actual share is within it.'),
      entry('Expected / actual bars', 'Both shares as bars out of 100%.'),
    ] }],
  },
  'simulation.dimensions': {
    title: 'Dimensions (expected vs actual)',
    about: 'Expected and actual mastery for each dimension.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Marks', 'The marks available in the dimension.'),
      entry('Expected / Actual mastery', 'Mean mastery of the synthetic cohort and of the real cohort.'),
      entry('Actual − expected / Level', 'The gap in percentage points and its tag.'),
      entry('Range columns and bars', 'As in the distribution table.'),
    ] }],
  },
  'simulation.topics': {
    title: 'Topics (expected vs actual)',
    about: 'The same comparison for topics. Only questions with topics count, and a multi-topic question shares its marks equally.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Columns', 'As in the dimension table.'),
    ] }],
  },

  'page.upload': {
    title: 'Upload exam data',
    about: 'Imports an exam from three CSV files, checks them and saves the analysis. A file that does not follow the format is rejected with the rows to fix.',
    parts: [{ heading: 'Steps', entries: [
      entry('Convert first, if needed', 'The Sheet converter under Tools turns the analytics team’s sheets into these three files.'),
      entry('Exam details', 'Course name, exam title and date identify the exam in saved exams, history and comparisons.'),
      entry('Format', 'The columns of each file are described in templates/README.md; samples are in the samples folder.'),
      entry('Notes', 'After a successful upload, notes mention data that is valid but worth a second look, such as students who attempted nothing. They never block an upload (Settings → Upload checks).'),
    ] }],
  },
  'upload.exam': {
    title: 'Exam details',
    about: 'Who and when the exam is for.',
    parts: [{ heading: 'Fields', entries: [
      entry('Course name, Exam title, Exam date', 'All three are required. They label the saved exam and the exam’s place in each student’s history, and Compare exams uses them to list the exam.'),
    ] }],
  },
  'upload.files': {
    title: 'CSV files',
    about: 'The three files that describe an exam.',
    parts: [{ heading: 'Files', entries: [
      entry('Exam config (required)', 'One row per question: id, type (assignment or assessment), difficulty, dimensions, marks and optionally topics, expected solve rate, subtype and correct option.'),
      entry('Student scores (required)', 'One row per student with a column per question: marks, or the option chosen for multiple-choice questions. A blank cell means unattempted, and 0 means attempted with no marks.'),
      entry('Student details (optional)', 'student_id and student_name, with an optional section and attendance (present or absent). Absent students count in the cohort with zero and are left out of attempt statistics.'),
    ] }],
  },

  'page.history': {
    title: 'Longitudinal history',
    about: 'One student’s results across every saved exam. Students are matched by student_id, so keep ids the same between exams.',
    parts: [{ heading: 'On the page', entries: [
      entry('Sidebar', 'Lists the students found in saved exams with the number of exams each appears in.'),
      entry('Chart', 'The student’s overall mastery and mastery per dimension over the exams, in date order. It appears once there are two exams.'),
      entry('Table', 'One row per exam: date, course, exam, score, mastery, change from the previous exam in percentage points, trend (Gain, Steady or Drop from Settings → Trends), accuracy and each dimension’s mastery with its level dot.'),
    ] }],
  },
  'history.student': {
    title: 'A student’s history',
    about: 'The chart and table of one student’s exams.',
    parts: [{ heading: 'Reading it', entries: [
      entry('Lines', 'Black is overall mastery; each coloured line is a dimension. Gaps appear where an exam had no questions in a dimension.'),
      entry('Change from previous', 'This exam’s mastery minus the previous exam’s, in percentage points. The first exam has none.'),
    ] }],
  },

  'page.compare': {
    title: 'Compare exams',
    about: 'Compares two saved exams: the cohort, each dimension, and each student present in both. Every change is the later exam minus the earlier one, in percentage points.',
    parts: [{ heading: 'Steps', entries: [
      entry('Choose exams', 'Pick the earlier and the later exam, then press Compare. The two must be different.'),
      entry('Matching', 'Students are matched by student_id. Students in only one exam are counted and left out of the student table.'),
    ] }],
  },
  'compare.exams': {
    title: 'Choosing the exams',
    about: 'Which two saved exams to compare.',
    parts: [{ heading: 'Result cards', entries: [
      entry('Cohort mastery', 'The cohort’s mean mastery in the earlier and later exam, the change and a Gain, Steady or Drop tag (Settings → Trends).'),
      entry('Students', 'The number of students in each exam and how many were matched.'),
    ] }],
  },
  'compare.dimensions': {
    title: 'Dimensions compared',
    about: 'The cohort’s mastery in each dimension in both exams.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Earlier / Later', 'The cohort’s mean mastery in each exam.'),
      entry('Change / Trend', 'Later minus earlier, in percentage points, and its tag.'),
      entry('Bars', 'Both values as bars out of 100%.'),
    ] }],
  },
  'compare.students': {
    title: 'Students compared',
    about: 'Each student who took both exams.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Earlier / Later mastery', 'The student’s overall mastery in each exam.'),
      entry('Change / Trend', 'Later minus earlier, in percentage points, and its tag.'),
      entry('Dimension change', 'The change in each dimension’s mastery.'),
    ] }],
  },

  'page.saved': {
    title: 'Saved exams',
    about: 'Every exam stored on this computer. Saved exams feed the history, the comparison and the check for reused questions.',
    parts: [{ heading: 'Table columns and buttons', entries: [
      entry('Course, Exam, Date', 'As entered on upload.'),
      entry('Questions, Students', 'The size of the exam.'),
      entry('Mean mastery', 'The cohort’s average mastery.'),
      entry('Saved at', 'When the exam was saved.'),
      entry('Open', 'Makes the exam the current one for the analysis pages.'),
      entry('Delete', 'Removes the exam after confirmation, and removes it from student histories too.'),
    ] }],
  },
  'saved.list': {
    title: 'Saved exams table',
    about: 'The list of saved exams, newest first by default.',
    parts: [{ heading: 'Using it', entries: [
      entry('Sorting and filtering', 'Sort or filter by any column, or search all of them.'),
    ] }],
  },

  'page.settings': {
    title: 'Settings',
    about: 'The thresholds behind every coloured tag, verdict and flag. Each group says what its rules affect, and each field has its own description.',
    parts: [{ heading: 'Using it', entries: [
      entry('Save settings', 'Applies the changes everywhere and stores them with your data. A problem with a value is listed above the buttons and stops saving.'),
      entry('Reset to defaults / Discard changes', 'Reset returns every value to its default; Discard drops the unsaved edits.'),
      entry('Backup', 'Downloads one file with the settings and every saved exam, or merges such a file back in.'),
      entry('Display', 'Turns the coloured verdict tags on or off.'),
    ] }],
  },
}
