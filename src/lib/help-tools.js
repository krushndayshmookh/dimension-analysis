// Learn more topics for the tools (see help.js).
const entry = (term, text) => ({ term, text })

export const TOOLS = {
  'page.review': {
    title: 'Question review',
    about: 'Which questions deserve a second look, whether they were used in earlier exams, and how students attempted them. Thresholds are set in Settings.',
    parts: [
      { heading: 'Cards at the top (whole exam)', entries: [
        entry('Questions to review', 'How many questions have at least one reason in the queue, out of all questions.'),
        entry('Reused from earlier exams', 'Questions that also appeared in an earlier saved exam (same type and id), and the share of the paper.'),
        entry('Average attempt rate (students)', 'The average share of the questions a student attempted. Absent students are left out.'),
        entry('Marks left unattempted', 'The marks of blank questions as a share of all marks across the students who were present.'),
        entry('Reliability (Cronbach’s alpha)', 'How consistently the questions rank the students; the tag follows Settings → Question quality.'),
      ] },
      { heading: 'Assignment and assessment', entries: [
        entry('Both / Assignment / Assessment', 'Each section can be limited to one question type with the toggle in its header. It appears when the exam has both types. The cards above always describe the whole exam.'),
      ] },
    ],
  },
  'review.queue': {
    title: 'Review queue',
    about: 'Questions with at least one reason to look again, most severe first. It points at where to look; what to do about a question is for you to decide.',
    parts: [
      { heading: 'Reasons and their weight', entries: [
        entry('Negative discrimination (3)', 'Weaker students did better on the question than stronger ones.'),
        entry('High deviation (3) / Medium deviation (1)', 'The actual solve rate differs from the expected one by at least the High (Medium) limit in Settings → Solve-rate deviation.'),
        entry('Poor discrimination (2)', 'Discrimination below the Poor limit in Settings → Question quality.'),
        entry('Many skipped (2)', 'Attempted by fewer students than the limit in Settings → Question flags.'),
        entry('Lowers reliability (2)', 'The paper’s alpha would rise by at least the set amount if the question were left out (Settings → Question review).'),
        entry('Reused (2)', 'The question appeared in earlier saved exams; this reason can be switched off in Settings → Question review.'),
        entry('Too easy (1) / Too hard (1)', 'Solved by more / fewer students than the limits in Settings → Question flags.'),
      ] },
      { heading: 'Table columns', entries: [
        entry('#', 'The question’s position in the paper.'),
        entry('Severity', 'The weights of all its reasons added together; the queue is sorted by it.'),
        entry('Reasons', 'The reasons that apply.'),
        entry('Solved by / Deviation / Discrimination / Attempted by', 'The question’s solve rate, its deviation from the expected rate in percentage points, its discrimination index and its attempt rate; see the Questions table in Paper analysis for their definitions.'),
      ] },
    ],
  },
  'review.reuse': {
    title: 'Reuse across exams',
    about: 'Shows questions that were also in an earlier saved exam, because reusing a question lets students pass it on.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Matching', 'A question is the same when its type and its id both match, ignoring letter case. Keep ids stable between exams.'),
      entry('Earlier exam, Course, Date, Students then', 'Where it appeared before and how many students took it.'),
      entry('Solved by then / now', 'The share of students who solved it in the earlier exam and in this one.'),
      entry('Change', 'Now minus then, in percentage points.'),
      entry('Discrimination then / now', 'The discrimination index in each exam.'),
    ] }],
  },
  'review.attempts': {
    title: 'Attempt behaviour',
    about: 'Which questions were attempted or left blank. A question is unattempted when its score cell is blank; a score of 0 is an attempt. Absent students are left out.',
    parts: [
      { heading: 'Graph', entries: [
        entry('Grouped bars', 'Two bars for each question id: the share of students who attempted it and the share who solved it (earned full marks). A big gap between them means many attempted it without solving it.'),
      ] },
      { heading: 'Question table', entries: [
        entry('Attempted / Blank / Attempted by', 'How many students attempted and left it blank, and the attempt rate.'),
        entry('Scored 0 / Partial marks / Full marks', 'How the attempts split by result.'),
        entry('Zero among attempts', 'Students who scored 0 divided by students who attempted it.'),
        entry('Skippers’ / Attempters’ mastery', 'The average overall mastery of students who left it blank and of those who attempted it.'),
        entry('Attempters − skippers', 'The difference between those two averages in percentage points.'),
      ] },
      { heading: 'Students who left questions blank', entries: [
        entry('Questions blank / Not attempted', 'How many questions the student left blank and which ones.'),
        entry('Attempt rate / Marks left / % of exam marks', 'The share attempted, and the marks of the blank questions in marks and as a share of the exam.'),
        entry('Assignment / Assessment toggle', 'Limits the whole section to one question type; rates and marks are then over those questions.'),
      ] },
    ],
  },
  'review.charts': {
    title: 'Review charts',
    about: 'Two scatter charts with one point per question; hover a point for the question id.',
    parts: [{ heading: 'Charts', entries: [
      entry('Expected vs actual solve rate', 'A point on the dashed line behaved as expected; above it the question was solved more often than expected. The colour follows the deviation level.'),
      entry('Solve rate vs discrimination', 'Discrimination below zero means weaker students did better than stronger ones. The colour follows the discrimination level.'),
    ] }],
  },

  'page.sections': {
    title: 'Sections',
    about: 'Compares sections (batches) on every measure. Sections come from the optional section column of the student file; the page is empty without it.',
    parts: [{ heading: 'Cards', entries: [
      entry('Sections', 'The number of sections and students.'),
      entry('Highest / Lowest section mean, Spread', 'The sections with the highest and lowest mean mastery and the gap between them.'),
      entry('Do sections differ? (ANOVA)', 'A one-way analysis of variance on the students’ mastery. The p-value is the chance of seeing differences this large if the sections truly had the same mean; a small p-value (below the limit in Settings → Sections) is tagged Significant. F is the ratio of between-section to within-section variation, with its degrees of freedom. With few students per section treat it as indicative.'),
    ] }],
  },
  'sections.overall': {
    title: 'Overall by section',
    about: 'One row per section.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Students / Size', 'The number of students. A section smaller than the limit in Settings → Sections is tagged Small section.'),
      entry('Mean mastery / Level', 'The section’s average mastery and its Weak, Average or Strong level.'),
      entry('Median, Min, Max, Std dev', 'The spread of mastery within the section.'),
      entry('Difference from cohort', 'The section mean minus the cohort mean, in percentage points.'),
      entry('Effect size (d)', 'Cohen’s d: the difference between the section and all other students in units of their pooled standard deviation. About 0.2 is small, 0.5 medium and 0.8 large.'),
      entry('At or above pass / distinction mark', 'The share of the section’s students reaching each mark in Settings → Pass and distinction.'),
    ] }],
  },
  'sections.radar': {
    title: 'Dimension balance by section',
    about: 'A radar chart with one line per section and a dashed line for the cohort.',
    parts: [{ heading: 'Reading the chart', entries: [
      entry('Each spoke', 'One dimension; further out means higher mean mastery.'),
      entry('Lines', 'A section whose line lies outside the dashed cohort line is above the cohort in that dimension. The number in brackets is the section’s size.'),
    ] }],
  },
  'sections.distribution': {
    title: 'Score distribution by section',
    about: 'A line per section showing what share of its students falls in each 10% range of mastery.',
    parts: [{ heading: 'Reading the chart', entries: [
      entry('Horizontal axis', 'The ranges of overall mastery, from 0–10% to 90–100%.'),
      entry('Vertical axis', 'The share of that section’s students in the range. Using shares makes sections of different sizes comparable.'),
    ] }],
  },
  'sections.dimensions': {
    title: 'Mean mastery by dimension',
    about: 'Each section’s mean mastery in each dimension.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Section columns', 'The section’s mean mastery in the dimension; the dot is its level.'),
      entry('Spread (pp)', 'Highest minus lowest section mean in the dimension.'),
      entry('p-value / Sections differ?', 'A one-way analysis of variance for the dimension, as in the card at the top of the page.'),
    ] }],
  },
  'sections.tiers': {
    title: 'Mean mastery by difficulty tier',
    about: 'The same table for the difficulty tiers, without the significance test.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Columns', 'Each section’s mean mastery in the tier, with a level dot, and the spread between sections.'),
    ] }],
  },
  'sections.students': {
    title: 'Students by section',
    about: 'Every student with their section.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Section', 'The student’s section; students without one are Unassigned.'),
      entry('Mastery / Level / Rank', 'The student’s overall mastery, its level and rank in the whole cohort.'),
    ] }],
  },

  'page.correlations': {
    title: 'Correlations',
    about: 'How students’ mastery in one dimension (or tier, or topic) relates to their mastery in another.',
    parts: [{ heading: 'On the page', entries: [
      entry('Compare', 'Switches between dimensions, difficulty tiers and topics (when the exam has topics).'),
      entry('Few students', 'Below the number set in Settings → Correlations a note warns that the values change a lot when a few students change.'),
      entry('Reading r', 'A correlation coefficient (r) runs from −1 to +1. Positive: students who do well in one tend to do well in the other. Negative: the opposite. Near zero: no linear relationship. It does not show that one causes the other.'),
    ] }],
  },
  'correlations.matrix': {
    title: 'Correlation matrix',
    about: 'The Pearson correlation of mastery for every pair.',
    parts: [{ heading: 'Reading the matrix', entries: [
      entry('Cell', 'The coefficient for the row and column. Hover for the number of students behind it; click to see the scatter below.'),
      entry('Colour', 'Positive values run from pale yellow through green and teal to navy; negative values run from orange to red. Darker or deeper means a stronger correlation, and the key under the matrix shows the scale from −1 to +1.'),
      entry('Diagonal', 'A group against itself is always 1.'),
      entry('Shared marks', 'A question with several dimensions (or tiers or topics) shares its marks, so related groups can correlate partly because they draw on the same questions.'),
      entry('A dash', 'Not enough students with values for both, or no variation.'),
    ] }],
  },
  'correlations.pairs': {
    title: 'Pairs, strongest first',
    about: 'Every pair in one list, sorted by the size of the correlation.',
    parts: [{ heading: 'Table columns', entries: [
      entry('First / Second', 'The two groups compared.'),
      entry('Correlation (r)', 'The coefficient.'),
      entry('Strength', 'Strong, Moderate or Weak by its absolute value (Settings → Correlations). The direction is kept as positive or negative.'),
      entry('Students', 'How many students had a value for both.'),
    ] }],
  },
  'correlations.scatter': {
    title: 'Scatter of a pair',
    about: 'One point per student for the selected pair.',
    parts: [{ heading: 'Reading the chart', entries: [
      entry('Axes', 'Each student’s mastery in the two groups, in percent.'),
      entry('Points', 'Hover a point for the student. A band of points rising from left to right means a positive correlation.'),
    ] }],
  },

  'page.feedback': {
    title: 'Feedback sheets',
    about: 'One page per student with their marks, dimensions, lowest topics and optionally marks per question, ready to print or send.',
    parts: [{ heading: 'How to use it', entries: [
      entry('Sidebar', 'Choose the students; all are selected at first.'),
      entry('Preview', 'Step through the sheets with Previous and Next, and write a comment for the student shown.'),
      entry('Print / save as PDF', 'Opens the print dialog with one sheet per page; choose Save as PDF there.'),
      entry('Download', 'Saves the shown sheet, or all selected sheets, as HTML.'),
      entry('Absent students', 'A sheet states the student’s marks like any other; leave absent students out of the selection if they should not get one.'),
    ] }],
  },
  'feedback.contents': {
    title: 'Feedback contents',
    about: 'What each sheet shows. The defaults come from Settings → Feedback sheets; changes here affect only this page.',
    parts: [{ heading: 'Options', entries: [
      entry('Marks per question', 'Adds a table of every question with the marks earned (blank when unattempted).'),
      entry('Cohort average', 'Draws the cohort’s dimension mastery as a reference on the radar chart.'),
      entry('Rank / Percentile', 'The student’s position in the cohort.'),
      entry('Level tags', 'Weak, Average or Strong next to each dimension.'),
      entry('Lowest topics to list', 'How many of the student’s lowest-mastery topics to list; 0 hides the list. Only topics of questions that have topics appear.'),
      entry('Notes', 'The note for every sheet appears under Comments on every sheet; a student’s own comment is added to theirs.'),
    ] }],
  },

  'page.whatif': {
    title: 'What-if adjustments',
    about: 'Try rescoring questions and see what would change. Nothing here is saved and the exam itself never changes.',
    parts: [{ heading: 'Cards after adjusting (before → after)', entries: [
      entry('Mean / Median mastery', 'The cohort’s average and middle mastery, with the change in percentage points.'),
      entry('At or above pass / distinction mark', 'The number of students reaching each mark, and the shares before and after.'),
      entry('Reliability (alpha)', 'The paper’s consistency with the adjustment applied, and its change.'),
      entry('Total marks', 'The marks of the paper; dropping a question lowers it.'),
      entry('Crossing the pass mark', 'How many students gain and how many lose a pass.'),
    ] }],
  },
  'whatif.adjust': {
    title: 'Adjust questions',
    about: 'Pick an adjustment for any question. The table also shows the review reasons for context.',
    parts: [{ heading: 'Adjustments', entries: [
      entry('No change', 'The question stays as it is.'),
      entry('Drop the question', 'Removes it from the paper, so total marks fall and every student is scored out of the rest.'),
      entry('Full marks to everyone', 'Every student gets the question’s marks, including those who left it blank.'),
      entry('Full marks to those who attempted', 'Students who attempted it get full marks; blank stays blank.'),
      entry('Reset all', 'Clears every adjustment.'),
    ] }, { heading: 'Table columns', entries: [
      entry('Solved by / Deviation / Discrimination', 'The question’s current results, as in Paper analysis.'),
      entry('Review reasons', 'The reasons it has in the Question review queue.'),
    ] }],
  },
  'whatif.distribution': {
    title: 'Score distribution, before and after',
    about: 'Two lines: the share of students in each 10% range of mastery before the adjustment and after it.',
    parts: [{ heading: 'Reading the chart', entries: [
      entry('Before / After', 'Grey is the original paper and blue is the adjusted one. Where the blue line is higher the adjustment moved more students into that range.'),
    ] }],
  },
  'whatif.students': {
    title: 'Students after the adjustment',
    about: 'Each student’s result before and after.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Before / After / Change', 'Mastery before and after, and the change in percentage points.'),
      entry('Rank before / after / change', 'Rank in the cohort. The change is positive when the student moves up.'),
      entry('Pass mark / Distinction mark', 'Tags for students who gain or lose each mark. The marks come from Settings → Pass and distinction.'),
    ] }],
  },

  'page.bands': {
    title: 'Grade bands',
    about: 'Counts students per band, shows how many pass at any cutoff and finds students just below a cutoff. Changes here are for exploring; the defaults are in Settings → Grade bands.',
    parts: [{ heading: 'Sections', entries: [
      entry('Bands', 'Edit the bands for this page.'),
      entry('Students per band', 'How many students fall in each band.'),
      entry('Cutoff explorer', 'How many students are at or above any cutoff.'),
      entry('Just below the cutoff', 'Students who narrowly miss it.'),
    ] }],
  },
  'bands.bands': {
    title: 'Bands',
    about: 'A band is a label and the lowest mastery that reaches it.',
    parts: [{ heading: 'How bands work', entries: [
      entry('Label and From (%)', 'A student is in the highest band whose From limit their mastery reaches, so a band covers from its limit up to the next band’s limit.'),
      entry('Add, remove, reorder', 'Edit the list freely. The same checks as in Settings apply, such as unique limits, and problems are shown in red.'),
      entry('Reset to settings', 'Returns to the bands saved in Settings.'),
    ] }],
  },
  'bands.perband': {
    title: 'Students per band',
    about: 'The distribution of students over the bands, highest first.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Band / Mastery range', 'The band and the range of mastery it covers.'),
      entry('Students / % of students', 'The number of students in the band and their share of the cohort; the bar shows the share out of 100%.'),
      entry('Section columns', 'When the exam has sections, how many of each section are in the band.'),
      entry('Who', 'The students in the band with their mastery; click a name to open the profile.'),
    ] }],
  },
  'bands.cutoff': {
    title: 'Cutoff explorer',
    about: 'Move the cutoff to see how many students are at or above it.',
    parts: [{ heading: 'Controls and chart', entries: [
      entry('Slider and number', 'The cutoff in whole percent of mastery. The buttons jump to the pass mark and the distinction mark from Settings.'),
      entry('Cards', 'The number and share of students at or above the cutoff and below it.'),
      entry('Line chart', 'For every whole cutoff from 0 to 100, the share of students at or above it. Moving the slider does not change the curve; it only moves the point of interest.'),
    ] }],
  },
  'bands.borderline': {
    title: 'Students just below the cutoff',
    about: 'Students under the cutoff by no more than the number of points you set, closest first.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Within', 'The number of percentage points below the cutoff to look at.'),
      entry('Below cutoff by', 'The cutoff minus the student’s mastery, in percentage points.'),
      entry('Marks short', 'The marks the student would need to reach the cutoff.'),
    ] }],
  },
  'bands.students': {
    title: 'Students and their bands',
    about: 'Every student with the band they are in.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Mastery / Band', 'The student’s overall mastery and the band it falls in with the bands on this page.'),
    ] }],
  },

  'page.distractors': {
    title: 'Distractors',
    about: 'For multiple-choice questions: how often each option was chosen, overall and by the top and bottom 27% of students by total score. It needs questions with the mcq subtype and a correct option, where the scores file holds the chosen option.',
    parts: [{ heading: 'Cards', entries: [
      entry('Multiple-choice questions', 'The number of mcq questions.'),
      entry('With a flag', 'Questions with at least one option flag.'),
      entry('Group size', 'The number of students in each of the top and bottom groups.'),
    ] }],
  },
  'distractors.questions': {
    title: 'Distractor questions',
    about: 'One row per multiple-choice question; click a row to see its options.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Key', 'The correct option.'),
      entry('Answered / Blank', 'Students who chose an option and students who left it blank.'),
      entry('Chose the key', 'The share of those who answered who chose the correct option.'),
      entry('Flags', 'Rarely chosen options (below the limit in Settings → Distractors), a wrong option chosen more often than the key by the top group, and a wrong option chosen more often than the key overall.'),
    ] }],
  },
  'distractors.options': {
    title: 'Options of a question',
    about: 'How each option was chosen. Percentages are of the students who answered.',
    parts: [{ heading: 'Table columns', entries: [
      entry('Option', 'The option label; the key is tagged.'),
      entry('Students / All answered', 'How many students chose it and their share of those who answered; the bar shows the same share.'),
      entry('Top group / Bottom group', 'The share of the top and of the bottom 27% (by total score) who chose it.'),
      entry('Bottom / top (bars)', 'Both groups’ shares side by side. A good key is chosen more by the top group; a wrong option chosen more by the top group deserves a look.'),
    ] }],
  },

  'page.converter': {
    title: 'Sheet converter',
    about: 'Turns the analytics team’s sheets into the three files the Upload page takes. It only formats and downloads; nothing is imported here.',
    parts: [{ heading: 'How it works', entries: [
      entry('Sheets', 'Drop any of the question listing, coding scores, quiz scores and enrolled students. Each is recognised by its columns.'),
      entry('One exam per sheet or combined', 'Each score sheet becomes its own exam; with both loaded you can combine them into one.'),
      entry('Check and edit', 'The result can be edited before downloading. The same checks as the Upload page run live and downloads stay disabled while they find a problem.'),
      entry('Command line', 'node scripts/convert.js does the same from the terminal.'),
    ] }],
  },
  'converter.sheets': {
    title: 'Sheets',
    about: 'The files to convert.',
    parts: [{ heading: 'The four sheets', entries: [
      entry('Question listing', 'Supplies difficulty, dimensions, topics and expected solve rate. Rows are matched by question id; the listing may hold several sets, and the one matching the score sheets is used.'),
      entry('Coding scores', 'One row per student per question. A score is the share of test cases passed times the question’s marks; blank means unattempted.'),
      entry('Quiz scores', 'One row per student per question. Correct earns the full marks, a wrong answer (including negative marking) scores 0, and unattempted stays blank.'),
      entry('Enrolled students', 'Student names. Enrolled students who appear in no score sheet can be added as absent.'),
    ] }],
  },
  'converter.marks': {
    title: 'Marks',
    about: 'The total marks of each type, divided equally over its questions.',
    parts: [{ heading: 'Fields', entries: [
      entry('Total marks of coding / quiz questions', 'For example 60 coding marks over 4 questions gives 15 each; 40 quiz marks over 20 gives 2 each. Marks can be edited per question afterwards.'),
      entry('Combine coding and quiz', 'Produces one exam with both types.'),
      entry('Add enrolled students as absent', 'Adds students from the enrolled list who are in no score sheet, marked absent.'),
    ] }],
  },
  'converter.preview': {
    title: 'Converted exam',
    about: 'The result, ready to edit and download.',
    parts: [{ heading: 'Parts', entries: [
      entry('Notes from the conversion', 'Things the converter could not decide on its own, such as questions missing from the listing.'),
      entry('Questions', 'Edit difficulty, dimensions, topics (optional), marks and expected rate, or remove a question. Rows that fail the checks are shaded red.'),
      entry('Listing rows not in the exam', 'Rows of the listing that are not in the score sheets, with the reason; Add includes one as a question with blank scores.'),
      entry('Students', 'Edit names and sections, mark a student absent (their scores are then left blank) or remove them.'),
      entry('Downloads', 'exam_config.csv, student_scores.csv and students.csv, individually or all three.'),
    ] }],
  },
}
