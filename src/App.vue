<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-top">
        <div>
          <h1 class="app-title">Dimension Analysis</h1>
          <p class="app-subtitle">Recall · Comprehend · Solve · Build · Evaluate</p>
        </div>
        <div v-if="exam" class="active-exam-pill">{{ exam.courseName }} — {{ exam.examTitle }} ({{ exam.examDate }})</div>
      </div>
    </header>

    <div class="group-nav" role="tablist" aria-label="Sections">
      <button
        v-for="g in TAB_GROUPS"
        :key="g.id"
        type="button"
        class="group-btn"
        :class="{ active: activeGroup.id === g.id }"
        @click="chooseGroup(g)"
      >
        {{ g.label }}
      </button>
    </div>
    <nav class="tab-nav" aria-label="Pages">
      <button
        v-for="t in activeGroup.tabs"
        :key="t.id"
        type="button"
        class="tab-btn"
        :class="{ active: tab === t.id }"
        :disabled="t.needsExam && !exam"
        @click="tab = t.id"
      >
        {{ t.label }}
      </button>
    </nav>

    <div v-if="notice" class="notice" :class="`notice-${notice.kind}`" role="status">
      <span>{{ notice.text }}</span>
      <button type="button" class="btn-sm btn-secondary" @click="notice = null">Dismiss</button>
    </div>

    <!-- UPLOAD -->
    <section v-if="tab === 'upload'" class="view-panel">
      <div class="view-header">
        <div>
          <h2 class="view-title">Upload exam data</h2>
          <p class="view-desc">
            Files must follow the format in <code>templates/README.md</code>. Files that do not are rejected with the
            rows that need fixing. Examples to upload are in <code>samples/</code>.
          </p>
        </div>
      </div>

      <form @submit.prevent="analyze">
        <fieldset>
          <legend>Exam</legend>
          <div class="form-grid">
            <div class="form-group">
              <label for="courseName">Course name</label>
              <input id="courseName" v-model="meta.courseName" type="text" required />
            </div>
            <div class="form-group">
              <label for="examTitle">Exam title</label>
              <input id="examTitle" v-model="meta.examTitle" type="text" required />
            </div>
            <div class="form-group">
              <label for="examDate">Exam date</label>
              <input id="examDate" v-model="meta.examDate" type="date" required />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>CSV files</legend>
          <div class="form-grid">
            <div class="form-group">
              <label for="configFile">Exam config *</label>
              <input id="configFile" type="file" accept=".csv" @change="onFile('config', $event)" />
              <small class="hint">question_id, question_type, question_difficulty, question_dimension, question_topics, marks[, expected_solve_rate][, question_subtype][, correct_option]</small>
            </div>
            <div class="form-group">
              <label for="scoresFile">Student scores *</label>
              <input id="scoresFile" type="file" accept=".csv" @change="onFile('scores', $event)" />
              <small class="hint">student_id, then one column per question_id: marks, or for mcq questions the option chosen. Blank = unattempted.</small>
            </div>
            <div class="form-group">
              <label for="studentsFile">Student details (optional)</label>
              <input id="studentsFile" type="file" accept=".csv" @change="onFile('students', $event)" />
              <small class="hint">student_id, student_name[, section]</small>
            </div>

          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary" :disabled="analyzing">
              {{ analyzing ? 'Analyzing…' : 'Analyze and save' }}
            </button>
          </div>
        </fieldset>
      </form>

      <div v-if="inputIssues.errors.length" class="notice notice-error">
        <div>
          <strong>Upload rejected: {{ inputIssues.errors.length }} problem{{ inputIssues.errors.length === 1 ? '' : 's' }}</strong>
          <ul>
            <li v-for="(e, i) in inputIssues.errors.slice(0, 50)" :key="i">{{ e }}</li>
          </ul>
          <p v-if="inputIssues.errors.length > 50">…and {{ inputIssues.errors.length - 50 }} more.</p>
        </div>
      </div>
      <div v-if="inputIssues.warnings.length" class="notice notice-info">
        <div>
          <strong>Notes</strong>
          <ul>
            <li v-for="(w, i) in inputIssues.warnings" :key="i">{{ w }}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- COHORT -->
    <section v-if="tab === 'cohort' && exam" class="view-panel">
      <div class="view-header">
        <div>
          <h2 class="view-title">Cohort overview</h2>
          <p class="view-desc">{{ exam.courseName }} · {{ exam.examTitle }} · {{ exam.examDate }}</p>
        </div>
      </div>

      <div class="stat-cards-grid">
        <div class="stat-card">
          <span class="stat-label">Students</span>
          <span class="stat-value">{{ profiles.cohort.studentCount }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Average score</span>
          <span class="stat-value">{{ num(profiles.cohort.earned) }} / {{ num(profiles.totalMarks) }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Mastery</span>
          <span class="stat-value">{{ pct(profiles.cohort.masteryPct) }}</span>
          <span class="stat-desc">
            marks earned ÷ all exam marks
            <span class="inline-tag"><VerdictTag :verdict="V.difficultyVerdict(profiles.cohort.masteryPct, settings)" /></span>
          </span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Accuracy</span>
          <span class="stat-value">{{ pct(profiles.cohort.accuracyPct) }}</span>
          <span class="stat-desc">marks earned ÷ marks of attempted questions</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">At or above pass mark</span>
          <span class="stat-value">{{ attainment.pass.count }} / {{ attainment.studentCount }}</span>
          <span class="stat-desc">{{ pct(attainment.pass.ratePct) }} (pass mark {{ settings.attainment.passMark }}%)</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">At or above distinction mark</span>
          <span class="stat-value">{{ attainment.distinction.count }} / {{ attainment.studentCount }}</span>
          <span class="stat-desc">{{ pct(attainment.distinction.ratePct) }} (distinction mark {{ settings.attainment.distinctionMark }}%)</span>
        </div>
      </div>

      <div class="side-by-side-container">
        <div class="card-box">
          <h3>Cohort mastery by dimension</h3>
          <RadarChart :values="cohortRadar" label="Cohort mastery %" />
        </div>
        <div class="card-box">
          <h3>Dimensions</h3>
          <DataTable :columns="cohortDimensionColumns" :rows="cohortDimensionRows" row-key="dimension" :searchable="false" export-name="cohort-dimensions">
            <template #cell-dimension="{ value }"><span class="badge" :class="dimClass(value)">{{ value }}</span></template>
            <template #cell-bar="{ row }"><Bar :value="row.masteryPct" :color="dimensionColor(row.dimension)" /></template>
          </DataTable>
        </div>
      </div>

      <div class="card-box">
        <h3>Students needing attention</h3>
        <p class="hint">
          Below the pass mark, within {{ settings.attention.nearPassMarginPp }} points above it, or weak in
          {{ settings.attention.weakDimensionCount }} or more dimensions. Thresholds are set in Settings.
        </p>
        <DataTable :columns="attentionColumns" :rows="attentionRows" row-key="id" clickable export-name="students-needing-attention" empty-text="No students match the attention rules." @row-click="openStudent($event.id)">
          <template #cell-reasons="{ row }">
            <span v-for="r in row.reasons" :key="r.id" class="tag" :class="settings.showVerdicts ? `tag-${r.tone}` : 'tag-neutral'">{{ r.label }}</span>
          </template>
        </DataTable>
      </div>

      <div class="card-box">
        <h3>Students</h3>
        <p class="hint">Select a row to open the student profile. Rank 1 is the highest mastery; percentile is the share of students scoring lower (ties count half).</p>
        <DataTable
          :columns="studentColumns"
          :rows="profiles.students"
          row-key="id"
          clickable
          export-name="students"
          :default-sort="{ key: 'id', dir: 'asc' }"
          @row-click="openStudent($event.id)"
        />
      </div>
    </section>

    <!-- PAPER -->
    <section v-if="tab === 'paper' && exam" class="view-panel">
      <div class="view-header">
        <div>
          <h2 class="view-title">Paper analysis</h2>
          <p class="view-desc">
            {{ dataset.questions.length }} questions · {{ num(profiles.totalMarks) }} marks · {{ profiles.students.length }} students
          </p>
        </div>
        <button type="button" class="btn-secondary no-print" @click="printPage">Print</button>
      </div>

      <div class="stat-cards-grid">
        <div class="stat-card">
          <span class="stat-label">Lowest mean mastery, by dimension</span>
          <span class="stat-value">{{ paper.summary.lowestDimension?.name ?? '—' }}</span>
          <span class="stat-desc">{{ pct(paper.summary.lowestDimension?.meanPct) }} <VerdictTag :verdict="V.masteryVerdict(paper.summary.lowestDimension?.meanPct, settings)" /></span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Highest mean mastery, by dimension</span>
          <span class="stat-value">{{ paper.summary.highestDimension?.name ?? '—' }}</span>
          <span class="stat-desc">{{ pct(paper.summary.highestDimension?.meanPct) }} <VerdictTag :verdict="V.masteryVerdict(paper.summary.highestDimension?.meanPct, settings)" /></span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Spread between those dimensions</span>
          <span class="stat-value">{{ num(paper.summary.dimensionSpreadPp) }} pp</span>
          <span class="stat-desc"><VerdictTag :verdict="V.spreadVerdict(paper.summary.dimensionSpreadPp, settings)" /></span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Lowest mean mastery, by difficulty tier</span>
          <span class="stat-value tier-name">{{ paper.summary.lowestDifficulty?.name ?? '—' }}</span>
          <span class="stat-desc">
            {{ pct(paper.summary.lowestDifficulty?.meanPct) }} ·
            {{ num(paper.summary.lowestDifficulty?.availableMarks) }} marks ·
            {{ paper.summary.lowestDifficulty?.questionCount ?? 0 }} questions
            <VerdictTag :verdict="V.masteryVerdict(paper.summary.lowestDifficulty?.meanPct, settings)" />
          </span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Paper difficulty (cohort mean)</span>
          <span class="stat-value">{{ pct(paper.overall.pct.mean) }}</span>
          <span class="stat-desc"><VerdictTag :verdict="V.difficultyVerdict(paper.overall.pct.mean, settings)" /></span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Reliability (Cronbach's alpha)</span>
          <span class="stat-value">{{ num(paper.reliability.alpha, 2) }}</span>
          <span class="stat-desc">
            standard error of measurement {{ num(paper.reliability.sem, 2) }} marks
            <VerdictTag :verdict="V.reliabilityVerdict(paper.reliability.alpha, settings)" />
          </span>
        </div>
      </div>

      <!-- Overall distribution -->
      <div class="card-box">
        <div class="view-header">
          <h3>Overall score distribution</h3>
          <BinModeToggle v-model="overallBinMode" name="overall-bins" />
        </div>
        <div class="stat-cards-grid compact">
          <div class="stat-card"><span class="stat-label">Total marks</span><span class="stat-value">{{ num(paper.overall.totalMarks) }}</span></div>
          <div class="stat-card"><span class="stat-label">Mean</span><span class="stat-value">{{ pct(paper.overall.pct.mean) }}</span><span class="stat-desc">{{ num(paper.overall.earned.mean) }} marks</span></div>
          <div class="stat-card"><span class="stat-label">Median</span><span class="stat-value">{{ pct(paper.overall.pct.median) }}</span><span class="stat-desc">{{ num(paper.overall.earned.median) }} marks</span></div>
          <div class="stat-card"><span class="stat-label">Min</span><span class="stat-value">{{ pct(paper.overall.pct.min) }}</span></div>
          <div class="stat-card"><span class="stat-label">Max</span><span class="stat-value">{{ pct(paper.overall.pct.max) }}</span></div>
          <div class="stat-card"><span class="stat-label">Std deviation</span><span class="stat-value">{{ num(paper.overall.pct.stdDev) }} pp</span></div>
        </div>
        <DataTable :columns="binColumns(overallBinMode)" :rows="binRows(paper.overall, overallBinMode, overallStudentValue)" row-key="label" :searchable="false" export-name="overall-distribution">
          <template #cell-bar="{ row }"><Bar :value="row.percentage" /></template>
          <template #cell-students="{ row }"><StudentChips :students="row.students" @select="openStudent" /></template>
        </DataTable>
      </div>

      <!-- Dimension distributions -->
      <div class="card-box">
        <div class="view-header">
          <h3>Score distribution by dimension</h3>
          <div class="controls">
            <BinModeToggle v-model="dimBinMode" name="dimension-bins" />
            <label>
              Dimension
              <select v-model="distDimension">
                <option value="all">All</option>
                <option v-for="d in profiles.dimensions" :key="d" :value="d">{{ d }}</option>
              </select>
            </label>
          </div>
        </div>
        <div v-for="dist in visibleDimensionDistributions" :key="dist.dimension" class="sub-card">
          <h4>
            <span class="badge" :class="dimClass(dist.dimension)">{{ dist.dimension }}</span>
            <VerdictTag :verdict="V.masteryVerdict(dist.pct.mean, settings)" />
          </h4>
          <p class="stats-line">
            {{ num(dist.availableMarks) }} marks · {{ dist.questionCount }} questions · mean {{ pct(dist.pct.mean) }} ·
            median {{ pct(dist.pct.median) }} · min {{ pct(dist.pct.min) }} · max {{ pct(dist.pct.max) }} ·
            std dev {{ num(dist.pct.stdDev) }} pp
          </p>
          <DataTable
            :columns="binColumns(dimBinMode)"
            :rows="binRows(dist, dimBinMode, (s) => dimensionStudentValue(s, dist.dimension))"
            row-key="label"
            :searchable="false"
            :export-name="`distribution-${dist.dimension.toLowerCase()}`"
          >
            <template #cell-bar="{ row }"><Bar :value="row.percentage" :color="dimensionColor(dist.dimension)" /></template>
            <template #cell-students="{ row }"><StudentChips :students="row.students" @select="openStudent" /></template>
          </DataTable>
        </div>
      </div>

      <!-- Difficulty tiers -->
      <div class="card-box">
        <h3>Difficulty tiers</h3>
        <DataTable :columns="tierColumns" :rows="tierRows" row-key="difficulty" :searchable="false" export-name="difficulty-tiers">
          <template #cell-difficulty="{ value }"><span class="badge badge-tier">{{ value }}</span></template>
          <template #cell-bar="{ row }"><Bar :value="row.meanPct" /></template>
        </DataTable>
        <h4>Tier order</h4>
        <p class="hint">Each tier compared with the next easier tier that has questions. Change = harder tier mean minus easier tier mean.</p>
        <DataTable :columns="progressionColumns" :rows="progressionRows" row-key="harder" :searchable="false" export-name="tier-order">
          <template #cell-easier="{ value }"><span class="badge badge-tier">{{ value }}</span></template>
          <template #cell-harder="{ value }"><span class="badge badge-tier">{{ value }}</span></template>
        </DataTable>
      </div>

      <!-- Matrix -->
      <div class="card-box">
        <div class="view-header">
          <h3>Dimension × difficulty</h3>
          <span class="legend">Cell shading: 0% <span class="legend-gradient"></span> 100% mean mastery</span>
        </div>
        <div class="table-responsive">
          <table class="matrix">
            <thead>
              <tr>
                <th>Dimension</th>
                <th v-for="t in paper.matrix.difficulties" :key="t" class="num-cell">{{ t }}</th>
                <th class="num-cell">All tiers</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in paper.matrix.dimensions" :key="d">
                <td><span class="badge" :class="dimClass(d)">{{ d }}</span></td>
                <td v-for="t in paper.matrix.difficulties" :key="t" class="matrix-cell" :style="heat(paper.matrix.cells[d][t].masteryPct)" :title="cellTitle(paper.matrix.cells[d][t])">
                  <template v-if="paper.matrix.cells[d][t].availableMarks > 0">
                    <div class="matrix-pct">{{ pct(paper.matrix.cells[d][t].masteryPct) }}</div>
                    <div class="matrix-sub">{{ num(paper.matrix.cells[d][t].availableMarks) }} marks · {{ paper.matrix.cells[d][t].questionCount }} Q</div>
                  </template>
                  <span v-else class="muted">—</span>
                </td>
                <td class="matrix-cell total" :style="heat(paper.matrix.rowTotals[d].masteryPct)" :title="cellTitle(paper.matrix.rowTotals[d])">
                  <div class="matrix-pct">{{ pct(paper.matrix.rowTotals[d].masteryPct) }}</div>
                  <div class="matrix-sub">{{ num(paper.matrix.rowTotals[d].availableMarks) }} marks · {{ paper.matrix.rowTotals[d].questionCount }} Q</div>
                </td>
              </tr>
              <tr class="total-row">
                <td>All dimensions</td>
                <td v-for="t in paper.matrix.difficulties" :key="t" class="matrix-cell total" :style="heat(paper.matrix.colTotals[t].masteryPct)" :title="cellTitle(paper.matrix.colTotals[t])">
                  <div class="matrix-pct">{{ pct(paper.matrix.colTotals[t].masteryPct) }}</div>
                  <div class="matrix-sub">{{ num(paper.matrix.colTotals[t].availableMarks) }} marks · {{ paper.matrix.colTotals[t].questionCount }} Q</div>
                </td>
                <td class="matrix-cell total" :style="heat(paper.matrix.grandTotal.masteryPct)">
                  <div class="matrix-pct">{{ pct(paper.matrix.grandTotal.masteryPct) }}</div>
                  <div class="matrix-sub">{{ num(paper.matrix.grandTotal.availableMarks) }} marks · {{ paper.matrix.grandTotal.questionCount }} Q</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="hint">Marks of a multi-dimension question are split equally across its dimensions.</p>
      </div>

      <!-- Topics -->
      <div class="card-box">
        <h3>Topics</h3>
        <DataTable :columns="topicColumns" :rows="paper.topics" row-key="topic" :default-sort="{ key: 'topic', dir: 'asc' }" export-name="topics">
          <template #cell-bar="{ row }"><Bar :value="row.masteryPct" /></template>
        </DataTable>
        <p class="hint">Marks of a multi-topic question are split equally across its topics.</p>
      </div>

      <!-- Blueprint -->
      <div class="card-box">
        <h3>Share of marks by dimension and tier</h3>
        <p class="hint">
          Each row's share of the exam's marks.
          <template v-if="hasBlueprintTargets">Targets and tolerance are set in Settings.</template>
          <template v-else>Set target shares in Settings (Paper blueprint) to compare them with the actual shares.</template>
        </p>
        <DataTable :columns="blueprintColumns" :rows="blueprintRows" row-key="key" :searchable="false" export-name="marks-share">
          <template #cell-name="{ row }">
            <span v-if="row.kind === 'Dimension'" class="badge" :class="dimClass(row.name)">{{ row.name }}</span>
            <span v-else class="badge badge-tier">{{ row.name }}</span>
          </template>
        </DataTable>
      </div>

      <!-- Quartiles -->
      <div v-if="paper.quartiles" class="card-box">
        <h3>Top and bottom quarter of students</h3>
        <p class="hint">
          Mean mastery of the {{ paper.quartiles.groupSize }} highest and {{ paper.quartiles.groupSize }} lowest scoring
          students overall. A large separation means that dimension or tier sets the strong students apart.
        </p>
        <DataTable :columns="quartileColumns('Dimension')" :rows="paper.quartiles.dimensions" row-key="dimension" :searchable="false" export-name="quartiles-dimensions">
          <template #cell-dimension="{ value }"><span class="badge" :class="dimClass(value)">{{ value }}</span></template>
          <template #cell-bars="{ row }"><PairBar :first="row.bottomMeanPct" :second="row.topMeanPct" first-label="Bottom" second-label="Top" :color="dimensionColor(row.dimension)" /></template>
        </DataTable>
        <DataTable :columns="quartileColumns('Tier')" :rows="paper.quartiles.difficulties" row-key="difficulty" :searchable="false" export-name="quartiles-tiers">
          <template #cell-difficulty="{ value }"><span class="badge badge-tier">{{ value }}</span></template>
          <template #cell-bars="{ row }"><PairBar :first="row.bottomMeanPct" :second="row.topMeanPct" first-label="Bottom" second-label="Top" /></template>
        </DataTable>
      </div>

      <!-- Question solve rates -->
      <div class="card-box">
        <h3>Questions: expected and actual solve rate</h3>
        <p class="hint">
          Solve rate = students who earned full marks ÷ all students. Deviation = actual − expected, in percentage points.
          Expected rates come from <code>expected_solve_rate</code>; where it is blank the tier default is used (marked "difficulty-default"):
          {{ defaultRateText }}.
        </p>
        <div class="stat-cards-grid compact">
          <div class="stat-card"><span class="stat-label">Mean absolute deviation</span><span class="stat-value">{{ num(paper.questions.summary.meanAbsDeviationPct) }} pp</span></div>
          <div class="stat-card">
            <span class="stat-label">Questions by deviation level</span>
            <span class="stat-desc">
              <span v-for="l in deviationCounts" :key="l.label"><VerdictTag :verdict="l" /> {{ l.count }}&nbsp;&nbsp;</span>
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Largest negative deviation</span>
            <span class="stat-value">{{ paper.questions.summary.largestNegative?.id ?? '—' }}</span>
            <span class="stat-desc">{{ signed(paper.questions.summary.largestNegative?.deviationPct, ' pp') }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Largest positive deviation</span>
            <span class="stat-value">{{ paper.questions.summary.largestPositive?.id ?? '—' }}</span>
            <span class="stat-desc">{{ signed(paper.questions.summary.largestPositive?.deviationPct, ' pp') }}</span>
          </div>
        </div>
        <DataTable :columns="questionColumns" :rows="paper.questions.rows" row-key="id" export-name="questions">
          <template #cell-dimensions="{ row }">
            <span v-for="d in row.dimensions" :key="d" class="badge" :class="dimClass(d)">{{ d }}</span>
          </template>
          <template #cell-difficulty="{ value }"><span class="badge badge-tier">{{ value }}</span></template>
          <template #cell-deviationPct="{ value }">{{ signed(value, ' pp') }}</template>
          <template #cell-bars="{ row }">
            <PairBar :first="row.expectedSolveRatePct" :second="row.solveRatePct" first-label="Expected" second-label="Actual" />
          </template>
        </DataTable>
      </div>
    </section>

    <!-- SIMULATION -->
    <section v-if="tab === 'simulation' && exam" class="view-panel">
      <div class="view-header">
        <div>
          <h2 class="view-title">Expected vs actual (simulation)</h2>
          <p class="view-desc">
            Simulates a synthetic cohort whose per-question success matches the expected solve rates, and compares it with
            the actual cohort of {{ profiles.students.length }} students. Change the parameters and run again.
          </p>
        </div>
      </div>

      <fieldset>
        <legend>Parameters</legend>
        <div class="form-grid sim-grid">
          <div v-for="f in simFields" :key="f.key" class="form-group">
            <label :for="`sim-${f.key}`">{{ f.label }}</label>
            <input :id="`sim-${f.key}`" v-model.number="simForm[f.key]" type="number" :step="f.step" />
            <small class="hint">{{ f.hint }}</small>
          </div>
          <div class="form-group">
            <label for="sim-partialCredit">Partial-credit questions</label>
            <select id="sim-partialCredit" v-model="simForm.partialCredit">
              <option value="auto">Detect from the actual scores</option>
              <option value="all">All questions</option>
              <option value="none">None</option>
            </select>
            <small class="hint">
              Partial-credit questions are scored by test cases passed instead of all-or-nothing. Detection looks for
              students whose actual score is between 0 and full marks. The guessing floor applies to mcq questions
              ({{ mcqCount }} here).
            </small>
          </div>
        </div>
        <div v-if="simErrors.length" class="notice notice-error">
          <ul><li v-for="(e, i) in simErrors" :key="i">{{ e }}</li></ul>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-primary" @click="runSimulation(false)">Run simulation</button>
          <button type="button" class="btn-secondary" @click="runSimulation(true)">Run with a new random seed</button>
          <button type="button" class="btn-secondary" @click="resetSimulationForm">Reset to defaults</button>
          <span v-if="simDirty" class="hint">Parameters changed since the last run.</span>
        </div>
        <details class="model-note">
          <summary>How the simulation works</summary>
          <p>
            Each synthetic student has an ability drawn from a normal distribution (mean and spread above). For
            question types that are not partial-credit, the chance of full marks follows a logistic curve in ability
            with the given discrimination, plus the guessing floor for the guessing types. The curve is positioned so
            that a student of mean ability succeeds with probability equal to the question's expected solve rate
            (clamped to the min/max rates above).
          </p>
          <p>
            For partial-credit types the student earns full marks with probability expected rate + effect × (ability −
            mean). Otherwise each test case passes with probability √(that probability) and marks are proportional to
            test cases passed.
          </p>
          <p>Expected rates: the CSV value, or the tier default where blank (see Paper analysis).</p>
        </details>
      </fieldset>

      <template v-if="simResult && comparison">
        <p class="stats-line">
          Last run: {{ simResult.studentCount }} synthetic students · seed {{ simResult.params.seed }} · ability
          N({{ simResult.params.abilityMean }}, {{ simResult.params.abilitySd }}) · discrimination
          {{ simResult.params.discrimination }} · {{ simResult.modes.partialCredit }} partial-credit question(s)
          ({{ simResult.params.testCases }} test cases) · guessing floor {{ simResult.params.guessing }} on
          {{ simResult.modes.guessing }} question(s) · range from {{ simResult.bands.runs }} run(s)
        </p>

        <div class="stat-cards-grid">
          <div v-for="s in comparisonStats" :key="s.label" class="stat-card">
            <span class="stat-label">{{ s.label }}</span>
            <span class="stat-value">{{ pct(s.expectedPct) }} <span class="vs">expected</span></span>
            <span class="stat-desc">
              actual {{ pct(s.actualPct) }} · gap {{ signed(s.gapPp, ' pp') }}
              <VerdictTag v-if="s.tagged" :verdict="V.gapVerdict(s.gapPp, settings)" />
            </span>
            <span v-if="s.lowPct != null && simResult.bands.runs > 1" class="stat-desc">
              90% range of expected {{ pct(s.lowPct) }} – {{ pct(s.highPct) }}
              <span class="tag" :class="s.withinRange ? 'tag-good' : 'tag-warn'">{{ s.withinRange ? 'Actual within range' : 'Actual outside range' }}</span>
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Distribution distance</span>
            <span class="stat-value">{{ pct(comparison.distributionDistancePct) }}</span>
            <span class="stat-desc">total variation distance between the decile distributions</span>
          </div>
        </div>

        <div class="card-box">
          <div class="view-header">
            <h3>Score distribution</h3>
            <BinModeToggle v-model="simBinMode" name="sim-bins" />
          </div>
          <DataTable :columns="comparisonBinColumns" :rows="highestFirst(simBinMode === 'percentage' ? comparison.decileBins : comparison.markBins)" row-key="label" :searchable="false" export-name="simulation-distribution">
            <template #cell-deltaPp="{ value }">{{ signed(value, ' pp') }}</template>
            <template #cell-bars="{ row }">
              <PairBar :first="row.expectedPct" :second="row.actualPct" first-label="Expected" second-label="Actual" />
            </template>
          </DataTable>
        </div>

        <div class="card-box">
          <h3>Dimensions</h3>
          <DataTable :columns="gapColumns('dimension', 'Dimension')" :rows="comparison.dimensions" row-key="dimension" :searchable="false" export-name="simulation-dimensions">
            <template #cell-dimension="{ value }"><span class="badge" :class="dimClass(value)">{{ value }}</span></template>
            <template #cell-gapPp="{ value }">{{ signed(value, ' pp') }}</template>
            <template #cell-bars="{ row }">
              <PairBar :first="row.expectedMasteryPct" :second="row.actualMasteryPct" first-label="Expected" second-label="Actual" :color="dimensionColor(row.dimension)" />
            </template>
          </DataTable>
        </div>

        <div class="card-box">
          <h3>Topics</h3>
          <DataTable :columns="gapColumns('topic', 'Topic')" :rows="comparison.topics" row-key="topic" export-name="simulation-topics">
            <template #cell-gapPp="{ value }">{{ signed(value, ' pp') }}</template>
            <template #cell-bars="{ row }">
              <PairBar :first="row.expectedMasteryPct" :second="row.actualMasteryPct" first-label="Expected" second-label="Actual" />
            </template>
          </DataTable>
        </div>
      </template>
    </section>

    <!-- STUDENT -->
    <section v-if="tab === 'student' && exam" class="with-sidebar">
      <StudentSidebar v-model="selectedStudentId" :items="studentItems" />
      <div class="view-panel">
      <div class="view-header">
        <div>
          <h2 class="view-title">Student profile</h2>
        </div>
      </div>

      <template v-if="student">
        <fieldset>
          <legend>Radar metric</legend>
          <div class="radio-group">
            <label><input v-model="studentMetric" type="radio" value="mastery" /> Mastery (earned ÷ all marks)</label>
            <label><input v-model="studentMetric" type="radio" value="accuracy" /> Accuracy (earned ÷ attempted marks)</label>
          </div>
        </fieldset>

        <div class="side-by-side-container">
          <div class="card-box">
            <h3>{{ student.name }} vs cohort</h3>
            <RadarChart :values="studentRadar" :label="student.name" :reference-values="cohortMetricRadar" reference-label="Cohort average" />
          </div>
          <div class="card-box">
            <h3>{{ student.name }} ({{ student.id }})</h3>
            <div class="highlights-grid">
              <div class="highlight-item"><div class="highlight-label">Marks earned</div><div class="highlight-value">{{ num(student.earned) }} / {{ num(student.totalMarks) }}</div></div>
              <div class="highlight-item"><div class="highlight-label">Attempted marks</div><div class="highlight-value">{{ num(student.attemptedMarks) }}</div></div>
              <div class="highlight-item"><div class="highlight-label">Mastery</div><div class="highlight-value">{{ pct(student.masteryPct) }}</div></div>
              <div class="highlight-item"><div class="highlight-label">Accuracy</div><div class="highlight-value">{{ pct(student.accuracyPct) }}</div></div>
              <div class="highlight-item"><div class="highlight-label">Rank</div><div class="highlight-value">{{ student.rank }} of {{ profiles.students.length }}</div></div>
              <div class="highlight-item"><div class="highlight-label">Percentile / z-score</div><div class="highlight-value">{{ num(student.percentile) }} <span class="muted">/ {{ num(student.zScore, 2) }}</span></div></div>
              <div class="highlight-item">
                <div class="highlight-label">Highest-mastery dimension</div>
                <div class="highlight-value">
                  <span v-if="student.strongestDimension" class="badge" :class="dimClass(student.strongestDimension)">{{ student.strongestDimension }}</span>
                  <span class="muted">{{ pct(student.dimensions[student.strongestDimension]?.masteryPct) }}</span>
                  <VerdictTag :verdict="dimensionLevel(student, student.strongestDimension)" />
                </div>
              </div>
              <div class="highlight-item">
                <div class="highlight-label">Lowest-mastery dimension</div>
                <div class="highlight-value">
                  <span v-if="student.weakestDimension" class="badge" :class="dimClass(student.weakestDimension)">{{ student.weakestDimension }}</span>
                  <span class="muted">{{ pct(student.dimensions[student.weakestDimension]?.masteryPct) }}</span>
                  <VerdictTag :verdict="dimensionLevel(student, student.weakestDimension)" />
                </div>
              </div>
              <div class="highlight-item">
                <div class="highlight-label">Needs attention</div>
                <div class="highlight-value">
                  <VerdictTag v-for="r in studentAttention" :key="r.id" :verdict="r" />
                  <span v-if="!studentAttention.length" class="muted">No</span>
                </div>
              </div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-secondary" @click="openHistory(student.id)">Longitudinal history</button>
            </div>
          </div>
        </div>

        <div class="card-box">
          <h3>Dimensions</h3>
          <DataTable :columns="breakdownColumns('Dimension')" :rows="studentBreakdown('dimensions')" row-key="name" :searchable="false" export-name="student-dimensions">
            <template #cell-name="{ value }"><span class="badge" :class="dimClass(value)">{{ value }}</span></template>
            <template #cell-vsCohort="{ value }">{{ signed(value, ' pp') }}</template>
          </DataTable>
        </div>
        <div class="card-box">
          <h3>Difficulty tiers</h3>
          <DataTable :columns="breakdownColumns('Tier')" :rows="studentBreakdown('difficulties')" row-key="name" :searchable="false" export-name="student-tiers">
            <template #cell-name="{ value }"><span class="badge badge-tier">{{ value }}</span></template>
            <template #cell-vsCohort="{ value }">{{ signed(value, ' pp') }}</template>
          </DataTable>
        </div>
        <div class="card-box">
          <h3>Topics</h3>
          <DataTable :columns="breakdownColumns('Topic')" :rows="studentBreakdown('topics')" row-key="name" export-name="student-topics">
            <template #cell-vsCohort="{ value }">{{ signed(value, ' pp') }}</template>
          </DataTable>
        </div>
      </template>
      </div>
    </section>

    <!-- HISTORY -->
    <section v-if="tab === 'history'" class="with-sidebar">
      <StudentSidebar v-model="historyStudentId" :items="historyItems" />
      <div class="view-panel">
        <div class="view-header">
          <div>
            <h2 class="view-title">Longitudinal history</h2>
            <p class="view-desc">A student's results across all saved exams. Students are matched by student_id.</p>
          </div>
        </div>
        <div v-if="history" class="card-box">
          <h3>{{ history.name }} ({{ history.id }})</h3>
          <LineChart v-if="historyRows.length > 1" :labels="historyRows.map((r) => `${r.examTitle} (${r.examDate})`)" :series="historySeries" y-label="mastery %" />
          <DataTable :columns="historyColumns" :rows="historyRows" row-key="examId" :default-sort="{ key: 'examDate', dir: 'asc' }" export-name="student-history" />
        </div>
        <div v-else class="empty-state">
          <p>{{ historyStudents.length ? 'Select a student.' : 'No saved exams yet. Upload an exam to start a history.' }}</p>
        </div>
      </div>
    </section>

    <!-- COMPARE -->
    <section v-if="tab === 'compare'" class="view-panel">
      <div class="view-header">
        <div>
          <h2 class="view-title">Compare exams</h2>
          <p class="view-desc">
            Compare two saved exams: cohort, dimensions, and students matched by student_id. Changes are later minus earlier,
            in percentage points.
          </p>
        </div>
      </div>
      <fieldset>
        <legend>Exams</legend>
        <div class="form-grid">
          <div class="form-group">
            <label for="compareBase">Earlier exam</label>
            <select id="compareBase" v-model="compareBaseId">
              <option value="" disabled>Select an exam</option>
              <option v-for="e in savedExams" :key="e.id" :value="e.id">{{ e.courseName }} — {{ e.examTitle }} ({{ e.examDate }})</option>
            </select>
          </div>
          <div class="form-group">
            <label for="compareLater">Later exam</label>
            <select id="compareLater" v-model="compareLaterId">
              <option value="" disabled>Select an exam</option>
              <option v-for="e in savedExams" :key="e.id" :value="e.id">{{ e.courseName }} — {{ e.examTitle }} ({{ e.examDate }})</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-primary" :disabled="!compareBaseId || !compareLaterId" @click="runCompare">Compare</button>
        </div>
      </fieldset>

      <template v-if="comparison2">
        <div class="stat-cards-grid">
          <div class="stat-card">
            <span class="stat-label">Cohort mastery</span>
            <span class="stat-value">{{ pct(comparison2.cohort.basePct) }} → {{ pct(comparison2.cohort.laterPct) }}</span>
            <span class="stat-desc">
              {{ signed(comparison2.cohort.deltaPp, ' pp') }}
              <VerdictTag :verdict="V.trendVerdict(comparison2.cohort.deltaPp, settings)" />
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Students</span>
            <span class="stat-value">{{ comparison2.cohort.baseStudents }} → {{ comparison2.cohort.laterStudents }}</span>
            <span class="stat-desc">{{ comparison2.students.length }} matched by student_id</span>
          </div>
        </div>
        <p v-if="comparison2.unmatched.onlyInBase.length || comparison2.unmatched.onlyInLater.length" class="hint">
          Only in the earlier exam: {{ comparison2.unmatched.onlyInBase.length }} student(s). Only in the later exam:
          {{ comparison2.unmatched.onlyInLater.length }} student(s). They are left out of the student table.
        </p>
        <div class="card-box">
          <h3>Dimensions</h3>
          <DataTable :columns="compareDimensionColumns" :rows="comparison2.dimensions" row-key="dimension" :searchable="false" export-name="compare-dimensions">
            <template #cell-dimension="{ value }"><span class="badge" :class="dimClass(value)">{{ value }}</span></template>
            <template #cell-bars="{ row }"><PairBar :first="row.basePct" :second="row.laterPct" first-label="Earlier" second-label="Later" :color="dimensionColor(row.dimension)" /></template>
          </DataTable>
        </div>
        <div class="card-box">
          <h3>Students</h3>
          <DataTable :columns="compareStudentColumns" :rows="comparison2.students" row-key="id" export-name="compare-students" />
        </div>
      </template>
    </section>

    <!-- SAVED -->
    <section v-if="tab === 'saved'" class="view-panel">
      <div class="view-header">
        <div>
          <h2 class="view-title">Saved exams</h2>
        </div>
        <button type="button" class="btn-secondary" @click="refreshSaved">Refresh</button>
      </div>
      <div v-if="savedExams.length" class="card-box">
        <DataTable :columns="savedColumns" :rows="savedExams" row-key="id" :default-sort="{ key: 'createdAt', dir: 'desc' }">
          <template #cell-actions="{ row }">
            <button type="button" class="btn-sm btn-primary" @click="loadSaved(row)">Open</button>
            <button type="button" class="btn-sm btn-danger" @click="removeSaved(row)">Delete</button>
          </template>
        </DataTable>
      </div>
      <div v-else class="empty-state"><p>No saved exams.</p></div>
    </section>

    <!-- TOOLS -->
    <component :is="activeTool.component" v-if="activeTool && exam" :key="`${exam.id ?? 'new'}-${activeTool.id}`" @open-student="openStudent" />

    <!-- SETTINGS -->
    <section v-if="tab === 'settings'" class="view-panel">
      <div class="view-header">
        <div>
          <h2 class="view-title">Settings</h2>
          <p class="view-desc">
            The thresholds behind every colored tag, verdict and flag. Each section says what its rules affect. Changes
            apply once saved, and are stored with your data.
          </p>
        </div>
      </div>

      <div v-for="group in SETTINGS_SCHEMA" :key="group.title" class="card-box settings-group">
        <div>
          <h3>{{ group.title }}</h3>
          <p class="hint">{{ group.description }}</p>
        </div>
        <div v-for="f in group.fields" :key="f.path" class="settings-field" :class="{ 'bands-field': f.type === 'bands' }">
          <label :for="`set-${f.path}`">{{ f.label }}</label>
          <div v-if="f.type === 'bands'" class="bands-editor">
            <div v-for="(b, i) in draftValue(f.path)" :key="i" class="band-row">
              <input type="text" :value="b.label" aria-label="Band label" @input="setBand(f, i, 'label', $event.target.value)" />
              <span class="unit">from</span>
              <input type="number" min="0" max="100" step="1" :value="b.from" aria-label="Band lower limit" @input="setBand(f, i, 'from', $event.target.value)" />
              <span class="unit">%</span>
              <button type="button" class="btn-sm btn-secondary" :disabled="draftValue(f.path).length <= 2" @click="removeBand(f, i)">Remove</button>
            </div>
            <button type="button" class="btn-sm btn-secondary" @click="addBand(f)">Add band</button>
          </div>
          <div v-else>
            <input
              v-if="f.type === 'boolean'"
              :id="`set-${f.path}`"
              type="checkbox"
              :checked="draftValue(f.path)"
              @change="setDraft(f, $event.target.checked)"
            />
            <template v-else>
              <input
                :id="`set-${f.path}`"
                type="number"
                :min="f.min"
                :max="f.max"
                :step="f.step"
                :value="draftValue(f.path)"
                :placeholder="f.type === 'target' ? 'none' : ''"
                @input="setDraft(f, $event.target.value)"
              />
              <span v-if="f.unit" class="unit">{{ f.unit }}</span>
            </template>
          </div>
          <p class="hint">{{ f.description }}</p>
        </div>
      </div>

      <div class="card-box">
        <h3>Backup</h3>
        <p class="hint">
          One file with your settings and every saved exam (with its scores). Restoring merges it into the saved data:
          exams with the same id are replaced and other exams are kept.
        </p>
        <div class="form-actions">
          <button type="button" class="btn-secondary" @click="downloadBackup">Download backup</button>
          <label class="btn-secondary file-button">
            Restore from backup…
            <input type="file" accept=".json,application/json" hidden @change="restoreFromFile" />
          </label>
        </div>
      </div>

      <div v-if="settingsErrors.length" class="notice notice-error">
        <ul><li v-for="(e, i) in settingsErrors" :key="i">{{ e }}</li></ul>
      </div>
      <div class="sticky-actions">
        <button type="button" class="btn-primary" :disabled="settingsErrors.length > 0 || !settingsDirty" @click="saveSettingsNow">
          Save settings
        </button>
        <button type="button" class="btn-secondary" @click="resetSettingsDraft">Reset to defaults</button>
        <button v-if="settingsDirty" type="button" class="btn-secondary" @click="discardSettingsDraft">Discard changes</button>
        <span v-if="settingsDirty" class="hint">Unsaved changes.</span>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, provide, reactive, ref, shallowRef, watch } from 'vue'
import RadarChart from './components/RadarChart.vue'
import DataTable from './components/DataTable.vue'
import VerdictTag from './components/VerdictTag.vue'
import Bar from './components/Bar.vue'
import PairBar from './components/PairBar.vue'
import BinModeToggle from './components/BinModeToggle.vue'
import StudentChips from './components/StudentChips.vue'
import StudentSidebar from './components/StudentSidebar.vue'
import { TOOLS } from './tools/index.js'
import { questionSummaries } from './lib/reuse.js'
import { checkDataQuality } from './lib/quality.js'
import { highestFirst } from './lib/stats.js'
import { downloadText } from './lib/download.js'
import LineChart from './components/LineChart.vue'
import { parseCsv } from './lib/csv.js'
import { readDataset } from './lib/input.js'
import { analyzeDataset } from './lib/analysis.js'
import { DIMENSIONS, DEFAULT_EXPECTED_SOLVE_RATES } from './lib/constants.js'
import { DEFAULT_SIM_PARAMS, validateSimParams, simulateMany, compareToActual } from './lib/simulation.js'
import { formatNumber as num, formatPct as pct, formatSigned as signed, clampPct } from './lib/format.js'
import { DEFAULT_SETTINGS, SETTINGS_SCHEMA, mergeSettings, validateSettings, getPath, setPath, cloneSettings } from './lib/settings.js'
import * as V from './lib/verdicts.js'
import { compareExams, historyDeltas } from './lib/compare.js'
import { dimensionColor, dimensionClass } from './lib/colors.js'
import * as api from './api.js'

const dimClass = dimensionClass

// ---- state ------------------------------------------------------------------------


const tab = ref('upload')
const notice = ref(null)

// Thresholds behind every tag; provided to VerdictTag. Defaults until loaded.
const settings = ref(mergeSettings())
provide('settings', settings)
const draft = ref(cloneSettings(settings.value))
const analyzing = ref(false)

const meta = reactive({ courseName: '', examTitle: '', examDate: new Date().toISOString().slice(0, 10) })
const files = reactive({ config: null, scores: null, students: null })
const inputIssues = reactive({ errors: [], warnings: [] })

// { id, courseName, examTitle, examDate, dataset, profiles, paper }
const exam = shallowRef(null)
const dataset = computed(() => exam.value?.dataset)
const profiles = computed(() => exam.value?.profiles)
const paper = computed(() => exam.value?.paper)

const savedExams = ref([])
provide('exam', exam)
provide('savedExams', savedExams)

const TAB_GROUPS = [
  {
    id: 'analysis',
    label: 'Analysis',
    tabs: [
      { id: 'cohort', label: 'Cohort', needsExam: true },
      { id: 'paper', label: 'Paper analysis', needsExam: true },
      { id: 'simulation', label: 'Simulation', needsExam: true },
      { id: 'student', label: 'Student profile', needsExam: true },
    ],
  },
  { id: 'tools', label: 'Tools', tabs: TOOLS.map((t) => ({ id: t.id, label: t.label, needsExam: true })) },
  {
    id: 'library',
    label: 'Library',
    tabs: [
      { id: 'upload', label: 'Upload', needsExam: false },
      { id: 'history', label: 'History', needsExam: false },
      { id: 'compare', label: 'Compare exams', needsExam: false },
      { id: 'saved', label: 'Saved exams', needsExam: false },
      { id: 'settings', label: 'Settings', needsExam: false },
    ],
  },
].filter((g) => g.tabs.length)

const activeGroup = computed(() => TAB_GROUPS.find((g) => g.tabs.some((t) => t.id === tab.value)) ?? TAB_GROUPS[0])
const lastTabOfGroup = {}
const activeTool = computed(() => TOOLS.find((t) => t.id === tab.value) ?? null)

function chooseGroup(group) {
  const usable = (t) => !(t.needsExam && !exam.value)
  tab.value = lastTabOfGroup[group.id] ?? group.tabs.find(usable)?.id ?? group.tabs[0].id
}
watch(() => tab.value, (id) => {
  const group = TAB_GROUPS.find((g) => g.tabs.some((t) => t.id === id))
  if (group) lastTabOfGroup[group.id] = id
})
const historyStudents = ref([])
const historyStudentId = ref('')
const history = ref(null)

const selectedStudentId = ref('')
const studentMetric = ref('mastery')

const overallBinMode = ref('percentage')
const dimBinMode = ref('percentage')
const distDimension = ref('all')
const simBinMode = ref('percentage')

const fail = (err) => {
  notice.value = { kind: 'error', text: err.message ?? String(err) }
}

// ---- upload and open --------------------------------------------------------------

function onFile(kind, event) {
  files[kind] = event.target.files[0] ?? null
  inputIssues.errors = []
  inputIssues.warnings = []
}

function openExam({ id = null, courseName, examTitle, examDate, dataset: data }) {
  const { profiles: p, paper: pa } = analyzeDataset(data)
  exam.value = { id, courseName, examTitle, examDate, dataset: data, profiles: p, paper: pa }
  selectedStudentId.value = p.students[0]?.id ?? ''
  distDimension.value = 'all'
  runSimulation(false)
}

async function analyze() {
  inputIssues.errors = []
  inputIssues.warnings = []
  notice.value = null
  if (!files.config || !files.scores) {
    inputIssues.errors = ['Select an exam config file and a student scores file.']
    return
  }
  analyzing.value = true
  try {
    const result = readDataset({
      config: await parseCsv(files.config),
      scores: await parseCsv(files.scores),
      students: files.students ? await parseCsv(files.students) : null,
    })
    inputIssues.warnings = result.warnings
    if (result.errors.length) {
      inputIssues.errors = result.errors
      return
    }
    inputIssues.warnings = [...result.warnings, ...checkDataQuality(result.dataset, settings.value)]
    openExam({ ...meta, dataset: result.dataset })
    try {
      const { id } = await api.saveExam({
        ...meta,
        dataset: result.dataset,
        analysis: exam.value.profiles,
        questionSummaries: questionSummaries(exam.value.paper),
      })
      exam.value = { ...exam.value, id }
      notice.value = { kind: 'info', text: 'Exam analyzed and saved.' }
    } catch (err) {
      notice.value = { kind: 'error', text: `Analyzed, but not saved: ${err.message}` }
    }
    await Promise.all([refreshSaved(), refreshHistoryStudents()])
    tab.value = 'cohort'
  } catch (err) {
    inputIssues.errors = [err.message ?? String(err)]
  } finally {
    analyzing.value = false
  }
}

async function refreshSaved() {
  try {
    savedExams.value = await api.listExams()
  } catch (err) {
    fail(err)
  }
}

async function loadSaved(entry) {
  try {
    const saved = await api.getExam(entry.id)
    if (!saved.dataset?.questions || !saved.dataset?.students) {
      throw new Error('This exam was saved in an older, incompatible format. Upload its CSV files again.')
    }
    openExam(saved)
    tab.value = 'cohort'
  } catch (err) {
    fail(err)
  }
}

async function removeSaved(entry) {
  if (!confirm(`Delete "${entry.examTitle}"? This also removes it from student histories.`)) return
  try {
    await api.deleteExam(entry.id)
    await Promise.all([refreshSaved(), refreshHistoryStudents()])
    if (history.value) await loadHistory()
  } catch (err) {
    fail(err)
  }
}

// ---- history ----------------------------------------------------------------------

async function refreshHistoryStudents() {
  try {
    historyStudents.value = await api.listStudents()
  } catch (err) {
    fail(err)
  }
}

async function loadHistory() {
  history.value = null
  if (!historyStudentId.value) return
  try {
    history.value = await api.getStudentHistory(historyStudentId.value)
  } catch (err) {
    fail(err)
  }
}

async function openHistory(studentId) {
  await refreshHistoryStudents()
  historyStudentId.value = studentId
  tab.value = 'history'
}

watch(historyStudentId, loadHistory)

// ---- settings ---------------------------------------------------------------------

const settingsErrors = computed(() => validateSettings(draft.value))
const settingsDirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(settings.value))
const draftValue = (path) => getPath(draft.value, path)

function setDraft(field, raw) {
  let value
  if (field.type === 'boolean' || field.type === 'bands') value = raw
  else if (raw === '') value = field.type === 'target' ? null : NaN
  else value = Number(raw)
  draft.value = setPath(draft.value, field.path, value)
}

function setBand(field, index, key, raw) {
  const bands = cloneSettings(draftValue(field.path))
  bands[index][key] = key === 'from' ? (raw === '' ? NaN : Number(raw)) : raw
  setDraft(field, bands)
}
function removeBand(field, index) {
  setDraft(field, draftValue(field.path).filter((_, i) => i !== index))
}
function addBand(field) {
  const bands = cloneSettings(draftValue(field.path))
  const used = new Set(bands.map((b) => b.from))
  const from = [...Array(99).keys()].map((i) => i + 1).find((v) => !used.has(v)) ?? 1
  setDraft(field, [...bands, { label: `Band ${bands.length + 1}`, from }])
}

async function loadSettings() {
  try {
    settings.value = mergeSettings(await api.getSettings())
    draft.value = cloneSettings(settings.value)
  } catch (err) {
    fail(err)
  }
}

async function saveSettingsNow() {
  try {
    await api.saveSettings(draft.value)
    settings.value = cloneSettings(draft.value)
    notice.value = { kind: 'info', text: 'Settings saved.' }
  } catch (err) {
    fail(err)
  }
}

async function downloadBackup() {
  try {
    const backup = await api.getBackup()
    downloadText(`dimension-analysis-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup), 'application/json')
  } catch (err) {
    fail(err)
  }
}

async function restoreFromFile(event) {
  const file = event.target.files[0]
  event.target.value = ''
  if (!file) return
  try {
    const backup = JSON.parse(await file.text())
    const count = Array.isArray(backup.exams) ? backup.exams.length : 0
    if (!confirm(`Restore ${count} exam(s) and the settings from this backup? Exams with the same id will be replaced.`)) return
    const { exams } = await api.restoreBackup(backup)
    await Promise.all([loadSettings(), refreshSaved(), refreshHistoryStudents()])
    notice.value = { kind: 'info', text: `Restored ${exams} exam(s) and the settings.` }
  } catch (err) {
    fail(err instanceof SyntaxError ? new Error('That file is not valid JSON.') : err)
  }
}

const resetSettingsDraft = () => {
  draft.value = cloneSettings(DEFAULT_SETTINGS)
}
const discardSettingsDraft = () => {
  draft.value = cloneSettings(settings.value)
}

onMounted(() => {
  loadSettings()
  refreshSaved()
  refreshHistoryStudents()
})

// ---- formatting helpers for templates ---------------------------------------------

const defaultRateText = Object.entries(DEFAULT_EXPECTED_SOLVE_RATES).map(([t, r]) => `${t} ${r}%`).join(', ')

const heat = (masteryPct) =>
  masteryPct == null ? {} : { backgroundColor: `rgba(37, 99, 235, ${(0.08 + 0.5 * (clampPct(masteryPct) / 100)).toFixed(3)})` }

const cellTitle = (c) =>
  c.availableMarks > 0 ? `${num(c.meanEarned, 2)} of ${num(c.availableMarks, 2)} marks on average across ${c.questionCount} question(s)` : 'No questions'

// ---- cohort tab -------------------------------------------------------------------

const cohortRadar = computed(() =>
  Object.fromEntries(profiles.value.dimensions.map((d) => [d, profiles.value.cohort.dimensions[d].masteryPct]))
)

const cohortDimensionRows = computed(() =>
  profiles.value.dimensions.map((d) => ({ dimension: d, ...profiles.value.cohort.dimensions[d] }))
)
const masteryLevel = (row) => V.masteryVerdict(row.masteryPct, settings.value)
const cohortDimensionColumns = [
  { key: 'dimension', label: 'Dimension', type: 'text' },
  { key: 'availableExam', label: 'Marks available', type: 'number', format: (v) => num(v) },
  { key: 'earned', label: 'Avg earned', type: 'number', format: (v) => num(v) },
  { key: 'masteryPct', label: 'Mastery', type: 'number', format: (v) => pct(v) },
  { key: 'level', label: 'Level', type: 'text', verdict: masteryLevel },
  { key: 'accuracyPct', label: 'Accuracy', type: 'number', format: (v) => pct(v) },
  { key: 'bar', label: '', type: 'number', value: (r) => r.masteryPct, filterable: false, sortable: false, exportable: false },
]

const attainment = computed(() => V.attainmentRates(profiles.value.students.map((s) => s.masteryPct ?? 0), settings.value))

// A student's level in a dimension, comparing with the cohort when that setting is on.
const dimensionLevel = (student, dimension) =>
  V.studentLevel(student.dimensions[dimension]?.masteryPct, profiles.value.cohort.dimensions[dimension]?.masteryPct, settings.value)

const attentionRows = computed(() =>
  profiles.value.students
    .map((s) => ({
      id: s.id,
      name: s.name,
      masteryPct: s.masteryPct,
      reasons: V.attentionReasons(s, profiles.value.cohort, settings.value),
      weakDimensions: profiles.value.dimensions.filter((d) => dimensionLevel(s, d)?.level === 'weak'),
    }))
    .filter((r) => r.reasons.length)
)
const attentionColumns = [
  { key: 'id', label: 'ID', type: 'text' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'masteryPct', label: 'Mastery', type: 'number', format: (v) => pct(v) },
  { key: 'reasons', label: 'Why', type: 'text', value: (r) => r.reasons.map((x) => x.label) },
  { key: 'weakDimensions', label: 'Weak dimensions', type: 'text' },
]

const studentColumns = computed(() => [
  { key: 'id', label: 'ID', type: 'text' },
  { key: 'name', label: 'Name', type: 'text' },
  ...(profiles.value.students.some((s) => s.section != null) ? [{ key: 'section', label: 'Section', type: 'text' }] : []),
  { key: 'earned', label: 'Score', type: 'number', format: (v, r) => `${num(v)} / ${num(r.totalMarks)}` },
  { key: 'masteryPct', label: 'Mastery', type: 'number', format: (v) => pct(v) },
  { key: 'level', label: 'Level', type: 'text', verdict: masteryLevel },
  { key: 'accuracyPct', label: 'Accuracy', type: 'number', format: (v) => pct(v) },
  { key: 'rank', label: 'Rank', type: 'number' },
  { key: 'percentile', label: 'Percentile', type: 'number', format: (v) => num(v) },
  { key: 'zScore', label: 'z-score', type: 'number', format: (v) => num(v, 2) },
  ...profiles.value.dimensions.map((d) => ({
    key: `dim-${d}`,
    label: d,
    type: 'number',
    value: (r) => r.dimensions[d].masteryPct,
    format: (v) => pct(v),
    dot: (r) => dimensionLevel(r, d),
  })),
  { key: 'weakestDimension', label: 'Lowest dimension', type: 'text' },
  { key: 'strongestDimension', label: 'Highest dimension', type: 'text' },
])

function openStudent(id) {
  selectedStudentId.value = id
  tab.value = 'student'
}

// ---- paper tab --------------------------------------------------------------------

const studentById = computed(() => new Map(profiles.value.students.map((s) => [s.id, s])))

const overallStudentValue = (s, mode = overallBinMode.value) => (mode === 'percentage' ? pct(s.masteryPct) : `${num(s.earned)} marks`)
const dimensionStudentValue = (s, dimension) => {
  const b = s.dimensions[dimension]
  return dimBinMode.value === 'percentage' ? pct(b.masteryPct) : `${num(b.earned)} marks`
}

const binColumns = (mode) => [
  { key: 'label', label: mode === 'percentage' ? 'Range (%)' : 'Range (marks)', type: 'text' },
  { key: 'count', label: 'Students', type: 'number' },
  { key: 'percentage', label: '% of cohort', type: 'number', format: (v) => pct(v) },
  { key: 'bar', label: 'Distribution', type: 'number', value: (r) => r.percentage, filterable: false, sortable: false },
  { key: 'students', label: 'Who', type: 'text', value: (r) => r.students.map((s) => s.label).join(', ') },
]

// dist has decileBins and markBins; valueOf renders the per-student number shown in the chip.
function binRows(dist, mode, valueOf) {
  const bins = highestFirst(mode === 'percentage' ? dist.decileBins : dist.markBins)
  return bins.map((b) => ({
    label: b.label,
    count: b.count,
    percentage: b.percentage,
    students: b.studentIds.map((id) => {
      const s = studentById.value.get(id)
      return { id, label: `${s.name} (${valueOf(s)})` }
    }),
  }))
}

const visibleDimensionDistributions = computed(() =>
  paper.value.dimensions.filter((d) => distDimension.value === 'all' || d.dimension === distDimension.value)
)

const tierRows = computed(() =>
  paper.value.difficulties.map((t) => ({
    difficulty: t.difficulty,
    questionCount: t.questionCount,
    availableMarks: t.availableMarks,
    shareOfExamPct: t.shareOfExamPct,
    meanPct: t.pct.mean,
    medianPct: t.pct.median,
    minPct: t.pct.min,
    maxPct: t.pct.max,
    stdDevPct: t.pct.stdDev,
  }))
)
const printPage = () => window.print()

const tierColumns = [
  { key: 'difficulty', label: 'Tier', type: 'text' },
  { key: 'questionCount', label: 'Questions', type: 'number' },
  { key: 'availableMarks', label: 'Marks', type: 'number', format: (v) => num(v) },
  { key: 'shareOfExamPct', label: '% of exam', type: 'number', format: (v) => pct(v) },
  { key: 'meanPct', label: 'Mean mastery', type: 'number', format: (v) => pct(v) },
  { key: 'level', label: 'Level', type: 'text', verdict: (r) => V.masteryVerdict(r.meanPct, settings.value) },
  { key: 'medianPct', label: 'Median', type: 'number', format: (v) => pct(v) },
  { key: 'minPct', label: 'Min', type: 'number', format: (v) => pct(v) },
  { key: 'maxPct', label: 'Max', type: 'number', format: (v) => pct(v) },
  { key: 'stdDevPct', label: 'Std dev (pp)', type: 'number', format: (v) => num(v) },
  { key: 'bar', label: 'Mean mastery', type: 'number', value: (r) => r.meanPct, filterable: false, sortable: false },
]

const topicColumns = [
  { key: 'topic', label: 'Topic', type: 'text' },
  { key: 'questionCount', label: 'Questions', type: 'number' },
  { key: 'availableMarks', label: 'Marks', type: 'number', format: (v) => num(v) },
  { key: 'meanEarned', label: 'Avg earned', type: 'number', format: (v) => num(v) },
  { key: 'masteryPct', label: 'Mastery', type: 'number', format: (v) => pct(v) },
  { key: 'level', label: 'Level', type: 'text', verdict: masteryLevel },
  { key: 'bar', label: '', type: 'number', value: (r) => r.masteryPct, filterable: false, sortable: false, exportable: false },
]

// Tier order: each tier against the next easier tier that has questions.
const progressionRows = computed(() => V.tierProgression(paper.value.difficulties, settings.value))
const progressionColumns = [
  { key: 'easier', label: 'Easier tier', type: 'text' },
  { key: 'harder', label: 'Harder tier', type: 'text' },
  { key: 'easierMeanPct', label: 'Easier mean', type: 'number', format: (v) => pct(v) },
  { key: 'harderMeanPct', label: 'Harder mean', type: 'number', format: (v) => pct(v) },
  { key: 'changePp', label: 'Change', type: 'number', format: (v) => signed(v, ' pp') },
  {
    key: 'status',
    label: 'Order',
    type: 'text',
    verdict: (r) => (r.inverted ? { label: 'Out of order', tone: 'warn' } : { label: 'In order', tone: 'good' }),
  },
]

// Share of marks by dimension and tier, against optional targets from Settings.
const blueprintRows = computed(() => {
  const target = (group, name) => settings.value.blueprint[group][name] ?? null
  const row = (kind, group, name, actualPct) => ({
    key: `${kind}-${name}`,
    kind,
    name,
    actualPct,
    targetPct: target(group, name),
    diffPp: target(group, name) == null || actualPct == null ? null : Math.round((actualPct - target(group, name)) * 100) / 100,
  })
  return [
    ...paper.value.dimensions.map((d) => row('Dimension', 'dimensions', d.dimension, d.shareOfExamPct)),
    ...paper.value.difficulties.map((d) => row('Tier', 'difficulties', d.difficulty, d.shareOfExamPct)),
  ]
})
const hasBlueprintTargets = computed(() => blueprintRows.value.some((r) => r.targetPct != null))
const blueprintColumns = [
  { key: 'kind', label: 'Kind', type: 'text' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'actualPct', label: 'Actual share', type: 'number', format: (v) => pct(v) },
  { key: 'targetPct', label: 'Target', type: 'number', format: (v) => pct(v) },
  { key: 'diffPp', label: 'Actual − target', type: 'number', format: (v) => signed(v, ' pp') },
  { key: 'status', label: 'Status', type: 'text', verdict: (r) => V.blueprintVerdict(r.actualPct, r.targetPct, settings.value) },
]

const quartileColumns = (label) => [
  { key: label === 'Dimension' ? 'dimension' : 'difficulty', label, type: 'text' },
  { key: 'topMeanPct', label: 'Top quarter mean', type: 'number', format: (v) => pct(v) },
  { key: 'bottomMeanPct', label: 'Bottom quarter mean', type: 'number', format: (v) => pct(v) },
  { key: 'separationPp', label: 'Separation', type: 'number', format: (v) => signed(v, ' pp') },
  { key: 'bars', label: 'Bottom / top', type: 'number', value: (r) => r.topMeanPct, filterable: false, sortable: false, exportable: false },
]

const questionColumns = [
  { key: 'id', label: 'Question', type: 'text' },
  { key: 'type', label: 'Type', type: 'text' },
  { key: 'dimensions', label: 'Dimensions', type: 'text' },
  { key: 'difficulty', label: 'Tier', type: 'text' },
  { key: 'topics', label: 'Topics', type: 'text' },
  { key: 'marks', label: 'Marks', type: 'number', format: (v) => num(v) },
  { key: 'expectedSolveRatePct', label: 'Expected', type: 'number', format: (v) => pct(v) },
  { key: 'expectedSource', label: 'Expected source', type: 'text' },
  { key: 'solveRatePct', label: 'Actual', type: 'number', format: (v) => pct(v) },
  { key: 'solvedCount', label: 'Solved', type: 'number', format: (v, r) => `${v} / ${r.studentCount}` },
  { key: 'attemptedSolveRatePct', label: 'Of attempted', type: 'number', format: (v) => pct(v) },
  { key: 'attemptRatePct', label: 'Attempted by', type: 'number', format: (v) => pct(v) },
  { key: 'meanScorePct', label: 'Mean score', type: 'number', format: (v) => pct(v) },
  { key: 'deviationPct', label: 'Deviation', type: 'number' },
  { key: 'deviationLevel', label: 'Deviation level', type: 'text', verdict: (r) => V.deviationVerdict(r.deviationPct, settings.value) },
  { key: 'discriminationIndex', label: 'Discrimination', type: 'number', format: (v) => num(v, 2) },
  { key: 'discriminationLevel', label: 'Discrimination level', type: 'text', verdict: (r) => V.discriminationVerdict(r.discriminationIndex, settings.value) },
  { key: 'itemRestCorrelation', label: 'Item-rest r', type: 'number', format: (v) => num(v, 2) },
  { key: 'alphaIfRemoved', label: 'Alpha if removed', type: 'number', format: (v) => num(v, 2) },
  { key: 'flags', label: 'Flags', type: 'text', verdict: (r) => V.questionFlags(r, settings.value) },
  { key: 'bars', label: 'Expected / actual', type: 'number', value: (r) => r.solveRatePct, filterable: false, sortable: false, exportable: false },
]

const DEVIATION_LEVELS = [
  { level: 'low', label: 'Low', tone: 'good' },
  { level: 'medium', label: 'Medium', tone: 'warn' },
  { level: 'high', label: 'High', tone: 'bad' },
]
const deviationCounts = computed(() =>
  DEVIATION_LEVELS.map((l) => ({
    ...l,
    count: paper.value.questions.rows.filter((r) => V.deviationVerdict(r.deviationPct, settings.value)?.level === l.level).length,
  }))
)

// ---- simulation tab ---------------------------------------------------------------

const simFields = [
  { key: 'cohortSize', label: 'Synthetic cohort size', step: 1, hint: 'Simulated students (1–100000). Larger values reduce sampling noise.' },
  { key: 'seed', label: 'Random seed', step: 1, hint: 'The same seed and parameters reproduce the same result.' },
  { key: 'runs', label: 'Runs for the range', step: 1, hint: 'Simulations (seed, seed+1, ...) used for the 90% range of expected results. 1 disables the range.' },
  { key: 'abilityMean', label: 'Ability mean', step: 0.1, hint: 'A student at this ability succeeds at exactly the expected solve rate.' },
  { key: 'abilitySd', label: 'Ability standard deviation', step: 0.05, hint: 'Spread of ability. 0 makes every synthetic student identical.' },
  { key: 'discrimination', label: 'Discrimination', step: 0.1, hint: 'How sharply the chance of success rises with ability.' },
  { key: 'guessing', label: 'Guessing floor', step: 0.05, hint: 'Minimum probability of full marks for guessing types (0 to <1).' },
  { key: 'testCases', label: 'Test cases per partial-credit question', step: 1, hint: 'Marks are proportional to test cases passed.' },
  { key: 'partialAbilityEffect', label: 'Partial-credit ability effect', step: 0.01, hint: 'Change in full-credit probability per unit of ability above the mean.' },
  { key: 'minExpectedRatePct', label: 'Minimum expected rate (%)', step: 1, hint: 'Lower expected rates are raised to this before simulating.' },
  { key: 'maxExpectedRatePct', label: 'Maximum expected rate (%)', step: 1, hint: 'Higher expected rates are lowered to this before simulating.' },
]

const defaultsForForm = () => ({ ...DEFAULT_SIM_PARAMS })

const simForm = reactive(defaultsForForm())
const simResult = shallowRef(null)
const comparison = shallowRef(null)
const simErrors = ref([])
const simDirty = ref(false)

const mcqCount = computed(() => dataset.value.questions.filter((q) => q.subtype === 'mcq').length)

function runSimulation(newSeed) {
  if (!exam.value) return
  if (newSeed) simForm.seed = Math.floor(Math.random() * 2 ** 31)
  const { params, errors } = validateSimParams({ ...simForm })
  simErrors.value = errors
  if (errors.length) return
  simResult.value = simulateMany(dataset.value, params)
  comparison.value = compareToActual(simResult.value, profiles.value, paper.value)
  simDirty.value = false
}

function resetSimulationForm() {
  Object.assign(simForm, defaultsForForm())
  runSimulation(false)
}

// flush: 'sync' so programmatic changes made before a run cannot re-flag it afterwards.
watch(simForm, () => {
  simDirty.value = true
}, { flush: 'sync' })

const comparisonStats = computed(() => [
  { label: 'Mean', tagged: true, ...comparison.value.mean },
  { label: 'Median', tagged: true, ...comparison.value.median },
  { label: 'Standard deviation (pp)', tagged: false, ...comparison.value.stdDev },
])

// Present only when the simulation ran more than once.
const rangeColumns = [
  { key: 'range', label: 'Expected 90% range', type: 'text', value: (r) => (r.lowPct == null ? null : `${r.lowPct}% – ${r.highPct}%`) },
  {
    key: 'inRange',
    label: 'Actual vs range',
    type: 'text',
    verdict: (r) => (r.withinRange == null ? null : { label: r.withinRange ? 'Within' : 'Outside', tone: r.withinRange ? 'good' : 'warn' }),
  },
]

const comparisonBinColumns = [
  { key: 'label', label: 'Range', type: 'text' },
  { key: 'expectedCount', label: 'Expected students', type: 'number' },
  { key: 'expectedPct', label: 'Expected %', type: 'number', format: (v) => pct(v) },
  { key: 'actualCount', label: 'Actual students', type: 'number' },
  { key: 'actualPct', label: 'Actual %', type: 'number', format: (v) => pct(v) },
  { key: 'deltaPp', label: 'Actual − expected', type: 'number' },
  { key: 'gapLevel', label: 'Level', type: 'text', verdict: (r) => V.gapVerdict(r.deltaPp, settings.value) },
  ...rangeColumns,
  { key: 'bars', label: 'Expected / actual', type: 'number', value: (r) => r.actualPct, filterable: false, sortable: false, exportable: false },
]

const gapColumns = (key, label) => [
  { key, label, type: 'text' },
  { key: 'availableMarks', label: 'Marks', type: 'number', format: (v) => num(v) },
  { key: 'expectedMasteryPct', label: 'Expected mastery', type: 'number', format: (v) => pct(v) },
  { key: 'actualMasteryPct', label: 'Actual mastery', type: 'number', format: (v) => pct(v) },
  { key: 'gapPp', label: 'Actual − expected', type: 'number' },
  { key: 'gapLevel', label: 'Level', type: 'text', verdict: (r) => V.gapVerdict(r.gapPp, settings.value) },
  ...rangeColumns,
  { key: 'bars', label: 'Expected / actual', type: 'number', value: (r) => r.actualMasteryPct, filterable: false, sortable: false, exportable: false },
]

// ---- student tab ------------------------------------------------------------------

const student = computed(() => studentById.value.get(selectedStudentId.value) ?? null)

const studentItems = computed(() =>
  profiles.value.students.map((s) => ({
    id: s.id,
    name: s.name,
    section: s.section,
    detail: pct(s.masteryPct),
    tone: V.masteryVerdict(s.masteryPct, settings.value)?.tone ?? null,
  }))
)
const historyItems = computed(() =>
  historyStudents.value.map((s) => ({ id: s.id, name: s.name, detail: `${s.examCount} exam${s.examCount === 1 ? '' : 's'}` }))
)

const metricKey = computed(() => (studentMetric.value === 'accuracy' ? 'accuracyPct' : 'masteryPct'))
const radarOf = (breakdowns) =>
  Object.fromEntries(profiles.value.dimensions.map((d) => [d, breakdowns[d][metricKey.value]]))
const studentRadar = computed(() => radarOf(student.value.dimensions))
const cohortMetricRadar = computed(() => radarOf(profiles.value.cohort.dimensions))

const studentBreakdown = (group) =>
  profiles.value[group].map((name) => {
    const own = student.value[group][name]
    const ref = profiles.value.cohort[group][name]
    return {
      name,
      earned: own.earned,
      availableExam: own.availableExam,
      availableAttempted: own.availableAttempted,
      masteryPct: own.masteryPct,
      accuracyPct: own.accuracyPct,
      cohortPct: ref.masteryPct,
      vsCohort: own.masteryPct == null || ref.masteryPct == null ? null : Math.round((own.masteryPct - ref.masteryPct) * 100) / 100,
    }
  })

const studentAttention = computed(() => V.attentionReasons(student.value, profiles.value.cohort, settings.value))

const breakdownColumns = (label) => [
  { key: 'name', label, type: 'text' },
  { key: 'earned', label: 'Earned', type: 'number', format: (v) => num(v) },
  { key: 'availableExam', label: 'Exam marks', type: 'number', format: (v) => num(v) },
  { key: 'availableAttempted', label: 'Attempted marks', type: 'number', format: (v) => num(v) },
  { key: 'masteryPct', label: 'Mastery', type: 'number', format: (v) => pct(v) },
  { key: 'level', label: 'Level', type: 'text', verdict: (r) => V.studentLevel(r.masteryPct, r.cohortPct, settings.value) },
  { key: 'accuracyPct', label: 'Accuracy', type: 'number', format: (v) => pct(v) },
  { key: 'cohortPct', label: 'Cohort mastery', type: 'number', format: (v) => pct(v) },
  { key: 'vsCohort', label: 'vs cohort', type: 'number' },
]

// ---- compare tab ------------------------------------------------------------------

const compareBaseId = ref('')
const compareLaterId = ref('')
const comparison2 = shallowRef(null)

async function runCompare() {
  comparison2.value = null
  if (compareBaseId.value === compareLaterId.value) {
    notice.value = { kind: 'error', text: 'Choose two different exams to compare.' }
    return
  }
  try {
    const [a, b] = await Promise.all([api.getExam(compareBaseId.value), api.getExam(compareLaterId.value)])
    for (const saved of [a, b]) {
      if (!saved.dataset?.questions || !saved.dataset?.students) {
        throw new Error(`"${saved.examTitle}" was saved in an older, incompatible format. Upload its CSV files again.`)
      }
    }
    comparison2.value = compareExams(analyzeDataset(a.dataset).profiles, analyzeDataset(b.dataset).profiles)
  } catch (err) {
    fail(err)
  }
}

const trendColumn = (key = 'deltaPp') => ({
  key: 'trend',
  label: 'Trend',
  type: 'text',
  verdict: (r) => V.trendVerdict(r[key], settings.value),
})
const compareDimensionColumns = [
  { key: 'dimension', label: 'Dimension', type: 'text' },
  { key: 'basePct', label: 'Earlier', type: 'number', format: (v) => pct(v) },
  { key: 'laterPct', label: 'Later', type: 'number', format: (v) => pct(v) },
  { key: 'deltaPp', label: 'Change', type: 'number', format: (v) => signed(v, ' pp') },
  trendColumn(),
  { key: 'bars', label: 'Earlier / later', type: 'number', value: (r) => r.laterPct, filterable: false, sortable: false, exportable: false },
]
const compareStudentColumns = computed(() => [
  { key: 'id', label: 'ID', type: 'text' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'baseMasteryPct', label: 'Earlier mastery', type: 'number', format: (v) => pct(v) },
  { key: 'laterMasteryPct', label: 'Later mastery', type: 'number', format: (v) => pct(v) },
  { key: 'deltaPp', label: 'Change', type: 'number', format: (v) => signed(v, ' pp') },
  trendColumn(),
  ...(comparison2.value?.dimensions ?? []).map((d) => ({
    key: `delta-${d.dimension}`,
    label: `${d.dimension} change`,
    type: 'number',
    value: (r) => r.dimensions[d.dimension]?.deltaPp ?? null,
    format: (v) => signed(v, ' pp'),
  })),
])

// ---- history and saved tabs -------------------------------------------------------

const historyRows = computed(() =>
  historyDeltas(history.value?.exams ?? []).map((e) => ({
    ...e,
    ...Object.fromEntries(DIMENSIONS.map((d) => [`dim-${d}`, e.dimensions?.[d]?.masteryPct ?? null])),
  }))
)
const historySeries = computed(() => [
  { label: 'Overall mastery', data: historyRows.value.map((r) => r.masteryPct), color: '#111827' },
  ...DIMENSIONS.map((d) => ({ label: d, data: historyRows.value.map((r) => r[`dim-${d}`]), color: dimensionColor(d) })),
])

const historyColumns = [
  { key: 'examDate', label: 'Date', type: 'text' },
  { key: 'courseName', label: 'Course', type: 'text' },
  { key: 'examTitle', label: 'Exam', type: 'text' },
  { key: 'earned', label: 'Score', type: 'number', format: (v, r) => `${num(v)} / ${num(r.totalMarks)}` },
  { key: 'masteryPct', label: 'Mastery', type: 'number', format: (v) => pct(v) },
  { key: 'deltaMasteryPct', label: 'Change from previous', type: 'number', format: (v) => signed(v, ' pp') },
  { key: 'trend', label: 'Trend', type: 'text', verdict: (r) => V.trendVerdict(r.deltaMasteryPct, settings.value) },
  { key: 'accuracyPct', label: 'Accuracy', type: 'number', format: (v) => pct(v) },
  ...DIMENSIONS.map((d) => ({
    key: `dim-${d}`,
    label: d,
    type: 'number',
    format: (v) => pct(v),
    dot: (r) => V.masteryVerdict(r[`dim-${d}`], settings.value),
  })),
]

const savedColumns = [
  { key: 'courseName', label: 'Course', type: 'text' },
  { key: 'examTitle', label: 'Exam', type: 'text' },
  { key: 'examDate', label: 'Date', type: 'text' },
  { key: 'questionCount', label: 'Questions', type: 'number' },
  { key: 'studentCount', label: 'Students', type: 'number' },
  { key: 'avgMasteryPct', label: 'Mean mastery', type: 'number', format: (v) => pct(v) },
  { key: 'createdAt', label: 'Saved at', type: 'text' },
  { key: 'actions', label: '', type: 'text', filterable: false, sortable: false },
]
</script>
