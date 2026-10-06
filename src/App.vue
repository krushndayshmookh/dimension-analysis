<template>
  <div class="app-container">
    <!-- Main Application Header -->
    <header class="app-header">
      <div class="header-top">
        <div>
          <h1 class="app-title">Dimension Analysis Tool</h1>
          <p class="app-subtitle">RCSBE Model: Recall &middot; Comprehend &middot; Solve &middot; Build &middot; Evaluate</p>
        </div>
        <div v-if="activeExamInfo" class="active-exam-pill">
          <span>&#128203; Active: {{ activeExamInfo.courseName }} - {{ activeExamInfo.examTitle }}</span>
        </div>
      </div>
    </header>

    <!-- Semantic Tab Navigation -->
    <nav class="tab-nav" aria-label="Main Navigation">
      <button
        type="button"
        class="tab-btn"
        :class="{ active: currentTab === 'upload' }"
        @click="currentTab = 'upload'"
      >
        1. Upload &amp; Analyze
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: currentTab === 'cohort' }"
        :disabled="!profileData"
        @click="currentTab = 'cohort'"
      >
        2. Cohort Overview
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: currentTab === 'paper' }"
        :disabled="!profileData"
        @click="currentTab = 'paper'"
      >
        3. Paper Analysis
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: currentTab === 'simulation' }"
        :disabled="!profileData"
        @click="currentTab = 'simulation'"
      >
        4. Expectations Simulation
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: currentTab === 'student' }"
        :disabled="!profileData || !selectedStudent"
        @click="currentTab = 'student'"
      >
        5. Student Profile Deep Dive
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: currentTab === 'history' }"
        @click="currentTab = 'history'"
      >
        6. Longitudinal History
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: currentTab === 'saved' }"
        @click="currentTab = 'saved'"
      >
        7. Saved Exams
      </button>
    </nav>

    <!-- VIEW 1: UPLOAD & ANALYZE -->
    <section v-if="currentTab === 'upload'" class="view-panel">
      <div class="view-header">
        <div>
          <h2 class="view-title">Upload &amp; Analyze Exam</h2>
          <p class="view-desc">Configure exam metadata, attach CSV input files, and run dimension-based cognitive analysis.</p>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" class="btn-secondary" @click="handleLoadSampleData">
            &#128640; Load Sample Data
          </button>
          <button type="button" class="btn-secondary" @click="handleLoadContestData">
            🎯 Load 300-Student Contest (25 Qs)
          </button>
        </div>
      </div>

      <form @submit.prevent="handleAnalyzeAndSave">
        <fieldset>
          <legend>Exam Metadata</legend>
          <div class="form-grid">
            <div class="form-group">
              <label for="courseName">Course Name</label>
              <input
                id="courseName"
                v-model="form.courseName"
                type="text"
                placeholder="e.g. CS101 - Algorithms & Data Structures"
                required
              />
            </div>
            <div class="form-group">
              <label for="examTitle">Exam Title</label>
              <input
                id="examTitle"
                v-model="form.examTitle"
                type="text"
                placeholder="e.g. Midterm Exam 2026"
                required
              />
            </div>
            <div class="form-group">
              <label for="examDate">Exam Date</label>
              <input
                id="examDate"
                v-model="form.examDate"
                type="date"
                required
              />
            </div>
          </div>
        </fieldset>

        <fieldset style="margin-top: 16px;">
          <legend>Exam CSV Datasets</legend>
          <div class="form-grid">
            <div class="form-group">
              <label for="questionsFile">1. Exam Configuration CSV *</label>
              <input
                id="questionsFile"
                type="file"
                accept=".csv"
                @change="handleFileUpload($event, 'questions')"
              />
              <small class="stat-desc">question_id, question_dimension, question_difficulty, marks, question_topics</small>
            </div>
            <div class="form-group">
              <label for="scoresFile">2. Student Scores CSV *</label>
              <input
                id="scoresFile"
                type="file"
                accept=".csv"
                @change="handleFileUpload($event, 'scores')"
              />
              <small class="stat-desc">Wide: student_id, Q1, Q2... or Long: student_id, question_id, marks_gained</small>
            </div>
            <div class="form-group">
              <label for="detailsFile">3. Student Details CSV (Optional)</label>
              <input
                id="detailsFile"
                type="file"
                accept=".csv"
                @change="handleFileUpload($event, 'details')"
              />
              <small class="stat-desc">student_id, student_name (maps IDs to friendly names)</small>
            </div>
          </div>

          <div class="form-actions">
            <button
              type="submit"
              class="btn-primary"
              :disabled="isAnalyzing || (!rawQuestions.length && !sampleLoaded)"
            >
              <span v-if="isAnalyzing">Analyzing...</span>
              <span v-else>&#128202; Analyze &amp; Save Exam</span>
            </button>
          </div>
        </fieldset>
      </form>

      <!-- Summary & Validation Box -->
      <fieldset v-if="validationSummary" style="margin-top: 8px;">
        <legend>Summary &amp; Validation</legend>
        <div class="stat-cards-grid">
          <div class="stat-card">
            <span class="stat-label">Questions Parsed</span>
            <span class="stat-value">{{ validationSummary.questionsCount }}</span>
            <span class="stat-desc">{{ validationSummary.totalMarks }} total marks</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Dimensions Found</span>
            <span class="stat-value">{{ validationSummary.dimensionsCount }}</span>
            <span class="stat-desc">{{ validationSummary.dimensionsList && validationSummary.dimensionsList.length ? validationSummary.dimensionsList.join(', ') : 'No dimensions specified' }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Students Parsed</span>
            <span class="stat-value">{{ validationSummary.studentsCount }}</span>
            <span class="stat-desc">{{ validationSummary.studentsCount === 1 ? '1 graded candidate' : `${validationSummary.studentsCount} graded candidates` }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Validation Status</span>
            <span class="stat-value" :style="{ color: validationSummary.warnings.length ? '#b45309' : '#15803d' }">
              {{ validationSummary.warnings.length ? 'Warnings' : 'Valid' }}
            </span>
            <span class="stat-desc">{{ validationSummary.warnings.length === 0 ? 'Clean configuration & scores' : `${validationSummary.warnings.length} warning${validationSummary.warnings.length === 1 ? '' : 's'} flagged` }}</span>
          </div>
        </div>

        <details v-if="validationSummary.warnings.length" style="margin-top: 14px;">
          <summary>Validation Warnings ({{ validationSummary.warnings.length }})</summary>
          <div class="summary-content">
            <ul class="warning-list">
              <li v-for="(warn, idx) in validationSummary.warnings" :key="idx">{{ warn }}</li>
            </ul>
          </div>
        </details>
      </fieldset>
    </section>

    <!-- VIEW 2: COHORT OVERVIEW -->
    <section v-if="currentTab === 'cohort' && profileData" class="view-panel">
      <div class="view-header">
        <div>
          <h2 class="view-title">Cohort Overview: {{ activeExamInfo?.examTitle }}</h2>
          <p class="view-desc">{{ activeExamInfo?.courseName }} &middot; Exam Date: {{ activeExamInfo?.examDate }}</p>
        </div>
        <div>
          <button type="button" class="btn-primary" @click="currentTab = 'paper'">
            &#128196; View Paper Analysis &rarr;
          </button>
        </div>
      </div>

      <!-- Class Summary Statistics -->
      <div class="stat-cards-grid">
        <div class="stat-card">
          <span class="stat-label">Total Students</span>
          <span class="stat-value">{{ profileData.students.length }}</span>
          <span class="stat-desc">Active cohort enrollment</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Class Average Score</span>
          <span class="stat-value">{{ formatNumber(cohortAvgScore) }} / {{ profileData.cohort.totalExam || profileData.cohort.total }}</span>
          <span class="stat-desc">Overall points earned</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Class Mastery %</span>
          <span class="stat-value">{{ profileData.cohort.masteryPct ?? profileData.cohort.pct ?? 0 }}%</span>
          <span class="stat-desc">Marks earned / Exam total</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Class Accuracy %</span>
          <span class="stat-value">{{ profileData.cohort.accuracyPct ?? profileData.cohort.accuracy ?? 0 }}%</span>
          <span class="stat-desc">Marks earned / Attempted total</span>
        </div>
      </div>

      <!-- Cohort Spider Chart & Dimension Averages Table -->
      <div class="side-by-side-container">
        <div class="card-box">
          <h3>Class Dimension Balance (Radar)</h3>
          <p class="stat-desc" style="margin-bottom: 8px;">Mastery percentage distribution across all {{ profileData.dimensions.length }} cognitive dimensions.</p>
          <RadarChart
            :student-data="cohortDimensionScores"
            student-label="Cohort Average"
            metric-name="Class Mastery %"
          />
        </div>

        <div class="card-box" style="display: flex; flex-direction: column;">
          <h3>Class Dimension Averages</h3>
          <p class="stat-desc" style="margin-bottom: 12px;">Aggregated breakdown across all questions per dimension.</p>
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Dimension</th>
                  <th class="num-cell">Marks Available</th>
                  <th class="num-cell">Avg Earned</th>
                  <th class="num-cell">Mastery %</th>
                  <th class="num-cell">Accuracy %</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="dim in profileData.dimensions" :key="dim">
                  <td>
                    <span :class="['badge', getDimensionBadgeClass(dim)]">{{ dim }}</span>
                  </td>
                  <td class="num-cell">{{ profileData.cohort.dimension[dim]?.availableExam ?? profileData.cohort.dimension[dim]?.available ?? 0 }}</td>
                  <td class="num-cell">{{ formatNumber(profileData.cohort.dimension[dim]?.earned ?? 0) }}</td>
                  <td class="num-cell"><strong>{{ profileData.cohort.dimension[dim]?.masteryPct ?? profileData.cohort.dimension[dim]?.pct ?? 0 }}%</strong></td>
                  <td class="num-cell">{{ profileData.cohort.dimension[dim]?.accuracyPct ?? profileData.cohort.dimension[dim]?.accuracy ?? 0 }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Full Student Ranking Table -->
      <div class="card-box">
        <div class="view-header" style="margin-bottom: 12px;">
          <div>
            <h3>Full Student Ranking</h3>
            <p class="stat-desc">Click any student row to inspect their Student Profile Deep Dive.</p>
          </div>
          <div class="filter-bar" style="margin-bottom: 0;">
            <input
              v-model="cohortSearchQuery"
              type="search"
              placeholder="Search by student name or ID..."
            />
          </div>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th class="sortable-th" @click="setCohortSort('id')">
                  Student ID <span class="sort-icon">{{ cohortSortIcon('id') }}</span>
                </th>
                <th class="sortable-th" @click="setCohortSort('name')">
                  Name <span class="sort-icon">{{ cohortSortIcon('name') }}</span>
                </th>
                <th class="num-cell sortable-th" @click="setCohortSort('score')">
                  Total Score <span class="sort-icon">{{ cohortSortIcon('score') }}</span>
                </th>
                <th class="num-cell sortable-th" @click="setCohortSort('mastery')">
                  Mastery % <span class="sort-icon">{{ cohortSortIcon('mastery') }}</span>
                </th>
                <th class="num-cell sortable-th" @click="setCohortSort('accuracy')">
                  Accuracy % <span class="sort-icon">{{ cohortSortIcon('accuracy') }}</span>
                </th>
                <th class="num-cell sortable-th" @click="setCohortSort('Recall')">
                  Recall % <span class="sort-icon">{{ cohortSortIcon('Recall') }}</span>
                </th>
                <th class="num-cell sortable-th" @click="setCohortSort('Comprehend')">
                  Comprehend % <span class="sort-icon">{{ cohortSortIcon('Comprehend') }}</span>
                </th>
                <th class="num-cell sortable-th" @click="setCohortSort('Solve')">
                  Solve % <span class="sort-icon">{{ cohortSortIcon('Solve') }}</span>
                </th>
                <th class="num-cell sortable-th" @click="setCohortSort('Build')">
                  Build % <span class="sort-icon">{{ cohortSortIcon('Build') }}</span>
                </th>
                <th class="num-cell sortable-th" @click="setCohortSort('Evaluate')">
                  Evaluate % <span class="sort-icon">{{ cohortSortIcon('Evaluate') }}</span>
                </th>
                <th class="sortable-th" @click="setCohortSort('weakest')">
                  Weakest Dimension <span class="sort-icon">{{ cohortSortIcon('weakest') }}</span>
                </th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="st in filteredStudents"
                :key="st.id"
                class="clickable-row"
                @click="selectStudentAndDeepDive(st.id)"
              >
                <td><strong>{{ st.id }}</strong></td>
                <td>{{ st.name }}</td>
                <td class="num-cell">{{ st.earned }} / {{ st.totalExam || st.total }}</td>
                <td class="num-cell"><strong>{{ st.masteryPct ?? st.pct ?? 0 }}%</strong></td>
                <td class="num-cell">{{ st.accuracyPct ?? st.accuracy ?? 0 }}%</td>
                <td class="num-cell">{{ st.dimension['Recall']?.masteryPct ?? st.dimension['Recall']?.pct ?? 0 }}%</td>
                <td class="num-cell">{{ st.dimension['Comprehend']?.masteryPct ?? st.dimension['Comprehend']?.pct ?? 0 }}%</td>
                <td class="num-cell">{{ st.dimension['Solve']?.masteryPct ?? st.dimension['Solve']?.pct ?? 0 }}%</td>
                <td class="num-cell">{{ st.dimension['Build']?.masteryPct ?? st.dimension['Build']?.pct ?? 0 }}%</td>
                <td class="num-cell">{{ st.dimension['Evaluate']?.masteryPct ?? st.dimension['Evaluate']?.pct ?? 0 }}%</td>
                <td>
                  <span class="badge badge-weak">{{ st.weakestDimension || st.weakest }}</span>
                </td>
                <td>
                  <button
                    type="button"
                    class="btn-sm btn-secondary"
                    @click.stop="selectStudentAndDeepDive(st.id)"
                  >
                    View Deep Dive
                  </button>
                </td>
              </tr>
              <tr v-if="!filteredStudents.length">
                <td colspan="12" style="text-align: center; color: #64748b; padding: 20px;">
                  No students found matching "{{ cohortSearchQuery }}".
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- VIEW 3: PAPER ANALYSIS -->
    <section v-if="currentTab === 'paper' && profileData" class="view-panel paper-analysis-panel">
      <!-- Header -->
      <header class="view-header">
        <div>
          <h2 class="view-title">Paper Analysis: {{ activeExamInfo?.examTitle }}</h2>
          <p class="view-desc">
            {{ activeExamInfo?.courseName }} &middot;
            Exam Date: {{ activeExamInfo?.examDate }} &middot;
            Total Questions: <strong>{{ currentQuestions.length }}</strong> &middot;
            Total Marks: <strong>{{ profileData.cohort.totalExam || profileData.cohort.total }}</strong> &middot;
            Cohort Enrollment: <strong>{{ profileData.students.length }} students</strong>
          </p>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" class="btn-primary" @click="currentTab = 'simulation'">
            🎲 Run Expectations vs. Reality Simulation &rarr;
          </button>
          <button type="button" class="btn-secondary" @click="currentTab = 'cohort'">
            &larr; Cohort Overview
          </button>
          <button
            v-if="selectedStudent"
            type="button"
            class="btn-secondary"
            @click="currentTab = 'student'"
          >
            Student Deep Dive &rarr;
          </button>
        </div>
      </header>

      <!-- Paper Diagnostics Summary Cards -->
      <div class="stat-cards-grid">
        <div class="stat-card">
          <span class="stat-label">Paper Difficulty Verdict</span>
          <span class="stat-value">
            <span :class="['badge-verdict', paperOverallVerdict.badgeClass]">
              {{ paperOverallVerdict.text }}
            </span>
          </span>
          <span class="stat-desc">Cohort Avg Mastery: {{ profileData.cohort.masteryPct ?? 0 }}%</span>
        </div>

        <div class="stat-card">
          <span class="stat-label">Hardest Dimension</span>
          <span class="stat-value" style="font-size: 1.35rem; color: #dc2626;">
            {{ paperHardestDimension.name }} ({{ paperHardestDimension.pct }}%)
          </span>
          <span class="stat-desc">Lowest cohort dimension mastery</span>
        </div>

        <div class="stat-card">
          <span class="stat-label">Easiest Dimension</span>
          <span class="stat-value" style="font-size: 1.35rem; color: #16a34a;">
            {{ paperEasiestDimension.name }} ({{ paperEasiestDimension.pct }}%)
          </span>
          <span class="stat-desc">Highest cohort dimension mastery</span>
        </div>

        <div class="stat-card">
          <span class="stat-label">Hardest Difficulty Tier</span>
          <span class="stat-value" style="font-size: 1.35rem; text-transform: capitalize; color: #b45309;">
            {{ paperHardestTier.tier }} ({{ paperHardestTier.pct }}%)
          </span>
          <span class="stat-desc">{{ paperHardestTier.marks }} pts across {{ paperHardestTier.qCount }} Qs</span>
        </div>

        <div class="stat-card">
          <span class="stat-label">Dimension Skew Insight</span>
          <span class="stat-value" style="font-size: 1.25rem;">
            {{ paperDimensionSkew.spread }}% Spread
          </span>
          <span class="stat-desc">{{ paperDimensionSkew.label }}</span>
        </div>
      </div>

      <!-- Pedagogical Insights Alert Banner -->
      <div class="paper-insights-banner">
        <div class="banner-title">&#128161; Paper Diagnostic Insights &amp; Findings</div>
        <ul class="banner-list">
          <li v-for="(insight, idx) in paperDiagnosticInsights" :key="idx">
            <span v-html="insight"></span>
          </li>
        </ul>
      </div>

      <!-- Contest Overall Score Distribution (Irrespective of Dimension) -->
      <div v-if="overallContestDistribution" class="card-box overall-dist-box">
        <div class="view-header" style="margin-bottom: 16px;">
          <div>
            <h3>Contest Overall Score Distribution (Irrespective of Dimension)</h3>
            <p class="stat-desc">Comprehensive score frequency histogram and cohort performance across the entire contest, irrespective of dimension.</p>
          </div>

          <!-- Controls: Binning toggle -->
          <div class="distribution-controls">
            <fieldset class="compact-fieldset">
              <legend>Binning Mode</legend>
              <div class="radio-group">
                <label>
                  <input
                    v-model="overallDistributionBinMode"
                    type="radio"
                    name="overallDistBinMode"
                    value="percentage"
                  />
                  Percentage Decile Bins (0–10%...90–100%)
                </label>
                <label>
                  <input
                    v-model="overallDistributionBinMode"
                    type="radio"
                    name="overallDistBinMode"
                    value="raw"
                  />
                  Raw Marks Bins
                </label>
              </div>
            </fieldset>
          </div>
        </div>

        <!-- Contest Summary Metrics bar / card -->
        <div class="contest-summary-metrics-bar">
          <div class="summary-metric-card">
            <span class="metric-label">Total Exam Marks</span>
            <span class="metric-value">{{ overallContestDistribution.totalExamMarks }} pts</span>
          </div>
          <div class="summary-metric-card">
            <span class="metric-label">Cohort Mean</span>
            <span class="metric-value">
              {{ overallContestDistribution.meanPct }}%
              <span class="metric-sub">({{ overallContestDistribution.meanEarned }} pts)</span>
            </span>
          </div>
          <div class="summary-metric-card">
            <span class="metric-label">Cohort Median</span>
            <span class="metric-value">{{ overallContestDistribution.medianPct }}%</span>
          </div>
          <div class="summary-metric-card">
            <span class="metric-label">Min Score</span>
            <span class="metric-value">{{ overallContestDistribution.minPct }}%</span>
          </div>
          <div class="summary-metric-card">
            <span class="metric-label">Max Score</span>
            <span class="metric-value">{{ overallContestDistribution.maxPct }}%</span>
          </div>
          <div class="summary-metric-card">
            <span class="metric-label">Std Deviation</span>
            <span class="metric-value">&plusmn;{{ overallContestDistribution.stdDevPct }}%</span>
          </div>
          <div class="summary-metric-card">
            <span class="metric-label">Contest Difficulty</span>
            <span class="metric-value">
              <span :class="['badge-verdict', getVerdictBadgeClass(overallContestDistribution.verdict)]">
                {{ overallContestDistribution.verdict }}
              </span>
            </span>
          </div>
        </div>

        <!-- Table displaying distribution bins -->
        <div class="table-responsive">
          <table class="distribution-table">
            <thead>
              <tr>
                <th style="width: 170px;">Range ({{ overallDistributionBinMode === 'percentage' ? '%' : 'Marks' }})</th>
                <th class="num-cell" style="width: 110px;">Student Count</th>
                <th class="num-cell" style="width: 110px;">% of Cohort</th>
                <th style="min-width: 200px;">Visual Distribution Bar</th>
                <th style="min-width: 220px;">Students in Range</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="bin in overallContestDistribution.bins" :key="bin.label">
                <td><strong>{{ bin.label }}</strong></td>
                <td class="num-cell">{{ bin.count }}</td>
                <td class="num-cell">{{ bin.cohortPct }}%</td>
                <td>
                  <div class="freq-bar-track">
                    <div
                      class="freq-bar-fill dist-bar-overall"
                      :style="{ width: bin.cohortPct + '%' }"
                    ></div>
                    <span class="freq-bar-pct-text" v-if="bin.count > 0">{{ bin.count }} st ({{ bin.cohortPct }}%)</span>
                  </div>
                </td>
                <td>
                  <details v-if="bin.students.length" class="student-list-expander">
                    <summary>{{ bin.students.length }} student{{ bin.students.length === 1 ? '' : 's' }}</summary>
                    <div class="student-chips-container">
                      <span
                        v-for="st in bin.students"
                        :key="st.id"
                        class="student-chip"
                        @click="selectStudentAndDeepDive(st.id)"
                        title="Click to view deep dive"
                      >
                        {{ st.name }} ({{ overallDistributionBinMode === 'percentage' ? st.pct + '%' : st.earned + ' pts' }})
                      </span>
                    </div>
                  </details>
                  <span v-else class="text-muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Distribution summary stat footer bar -->
        <div class="dist-summary-footer">
          <div class="dist-summary-stat">
            <span class="label">Total Exam Marks:</span>
            <span class="val">{{ overallContestDistribution.totalExamMarks }} pts</span>
          </div>
          <div class="dist-summary-stat">
            <span class="label">Cohort Mean:</span>
            <span class="val">{{ overallContestDistribution.meanPct }}% ({{ overallContestDistribution.meanEarned }} pts)</span>
          </div>
          <div class="dist-summary-stat">
            <span class="label">Cohort Median:</span>
            <span class="val">{{ overallContestDistribution.medianPct }}%</span>
          </div>
          <div class="dist-summary-stat">
            <span class="label">Min:</span>
            <span class="val">{{ overallContestDistribution.minPct }}%</span>
          </div>
          <div class="dist-summary-stat">
            <span class="label">Max:</span>
            <span class="val">{{ overallContestDistribution.maxPct }}%</span>
          </div>
          <div class="dist-summary-stat">
            <span class="label">Std Deviation:</span>
            <span class="val">&plusmn;{{ overallContestDistribution.stdDevPct }}%</span>
          </div>
          <div class="dist-summary-stat">
            <span class="label">Verdict:</span>
            <span :class="['badge-verdict-sm', getVerdictBadgeClass(overallContestDistribution.verdict)]">
              {{ overallContestDistribution.verdict }}
            </span>
          </div>
        </div>
      </div>

      <!-- SECTION 1: Dimension Score Frequency Distributions -->
      <div class="card-box">
        <div class="view-header" style="margin-bottom: 16px;">
          <div>
            <h3>1. Dimension Score Frequency Distributions</h3>
            <p class="stat-desc">Histogram distribution of cohort student performance across each cognitive dimension.</p>
          </div>

          <!-- Controls: Binning toggle & Dimension filter -->
          <div class="distribution-controls">
            <fieldset class="compact-fieldset">
              <legend>Binning Mode</legend>
              <div class="radio-group">
                <label>
                  <input
                    v-model="distributionBinMode"
                    type="radio"
                    name="distBinMode"
                    value="percentage"
                  />
                  Percentage Decile Bins (0–10%...90–100%)
                </label>
                <label>
                  <input
                    v-model="distributionBinMode"
                    type="radio"
                    name="distBinMode"
                    value="raw"
                  />
                  Raw Marks Bins
                </label>
              </div>
            </fieldset>

            <div class="dimension-filter-group">
              <label for="dimFilterSelect">Filter Dimension:</label>
              <select id="dimFilterSelect" v-model="selectedDistributionDimension">
                <option value="all">All Dimensions (5)</option>
                <option v-for="d in profileData.dimensions" :key="d" :value="d">
                  {{ d }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Render distribution tables for filtered dimensions -->
        <div class="distributions-wrapper">
          <div
            v-for="dist in filteredDimensionDistributions"
            :key="dist.dimension"
            class="dimension-dist-card"
          >
            <div class="dimension-dist-header">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span :class="['badge', getDimensionBadgeClass(dist.dimension)]">{{ dist.dimension }}</span>
                <strong>{{ dist.dimension }} Frequency Distribution</strong>
              </div>
              <div class="dim-header-stats">
                <span>Available: <strong>{{ dist.availableMarks }} pts</strong></span> &middot;
                <span>Cohort Mean: <strong>{{ dist.meanPct }}%</strong></span> &middot;
                <span>Median: <strong>{{ dist.medianPct }}%</strong></span> &middot;
                <span>Std Dev: <strong>&plusmn;{{ dist.stdDevPct }}%</strong></span> &middot;
                <span :class="['badge-verdict-sm', dist.verdict.badgeClass]">{{ dist.verdict.text }}</span>
              </div>
            </div>

            <div class="table-responsive">
              <table class="distribution-table">
                <thead>
                  <tr>
                    <th style="width: 170px;">Range ({{ distributionBinMode === 'percentage' ? '%' : 'Marks' }})</th>
                    <th class="num-cell" style="width: 110px;">Student Count</th>
                    <th class="num-cell" style="width: 110px;">% of Cohort</th>
                    <th style="min-width: 200px;">Visual Distribution Bar</th>
                    <th style="min-width: 220px;">Students in Range</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="bin in dist.bins" :key="bin.label">
                    <td><strong>{{ bin.label }}</strong></td>
                    <td class="num-cell">{{ bin.count }}</td>
                    <td class="num-cell">{{ bin.cohortPct }}%</td>
                    <td>
                      <div class="freq-bar-track">
                        <div
                          class="freq-bar-fill"
                          :class="getDistributionBarClass(dist.dimension)"
                          :style="{ width: bin.cohortPct + '%' }"
                        ></div>
                        <span class="freq-bar-pct-text" v-if="bin.count > 0">{{ bin.count }} st ({{ bin.cohortPct }}%)</span>
                      </div>
                    </td>
                    <td>
                      <details v-if="bin.students.length" class="student-list-expander">
                        <summary>{{ bin.students.length }} student{{ bin.students.length === 1 ? '' : 's' }}</summary>
                        <div class="student-chips-container">
                          <span
                            v-for="st in bin.students"
                            :key="st.id"
                            class="student-chip"
                            @click="selectStudentAndDeepDive(st.id)"
                            title="Click to view deep dive"
                          >
                            {{ st.name }} ({{ distributionBinMode === 'percentage' ? st.pct + '%' : st.earned + ' pts' }})
                          </span>
                        </div>
                      </details>
                      <span v-else class="text-muted">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Distribution summary stat footer bar -->
            <div class="dist-summary-footer">
              <div class="dist-summary-stat">
                <span class="label">Available Marks:</span>
                <span class="val">{{ dist.availableMarks }} pts</span>
              </div>
              <div class="dist-summary-stat">
                <span class="label">Cohort Mean:</span>
                <span class="val">{{ dist.meanPct }}%</span>
              </div>
              <div class="dist-summary-stat">
                <span class="label">Cohort Median:</span>
                <span class="val">{{ dist.medianPct }}%</span>
              </div>
              <div class="dist-summary-stat">
                <span class="label">Std Deviation:</span>
                <span class="val">&plusmn;{{ dist.stdDevPct }}%</span>
              </div>
              <div class="dist-summary-stat">
                <span class="label">Verdict:</span>
                <span :class="['badge-verdict-sm', dist.verdict.badgeClass]">{{ dist.verdict.text }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 2: Difficulty Level Spread Evaluation -->
      <div class="card-box">
        <div class="view-header" style="margin-bottom: 14px;">
          <div>
            <h3>2. Difficulty Level Spread Evaluation</h3>
            <p class="stat-desc">Cognitive load progression across Beginner, Easy, Medium, Hard, and Challenge tiers.</p>
          </div>
        </div>

        <!-- Anomaly alert note if any difficulty inversion occurred -->
        <div v-if="difficultyAnomalies.length" class="alert-box alert-warning" style="margin-bottom: 16px;">
          <div style="font-weight: 700; margin-bottom: 4px;">⚠️ Difficulty Progression Anomalies Detected</div>
          <ul style="margin: 0; padding-left: 20px;">
            <li v-for="(anomaly, aIdx) in difficultyAnomalies" :key="aIdx">
              {{ anomaly }}
            </li>
          </ul>
        </div>
        <div v-else class="alert-box alert-success" style="margin-bottom: 16px;">
          <strong>&#10004; Expected Difficulty Progression:</strong> Cohort mastery smoothly scaled downward as question difficulty increased across tiers.
        </div>

        <div class="table-responsive">
          <table class="difficulty-eval-table">
            <thead>
              <tr>
                <th>Difficulty Tier</th>
                <th class="num-cell">Question Count</th>
                <th class="num-cell">Marks Available</th>
                <th class="num-cell">% of Exam</th>
                <th class="num-cell">Cohort Avg Mastery %</th>
                <th class="num-cell">Min %</th>
                <th class="num-cell">Max %</th>
                <th style="min-width: 180px;">Mastery Progression</th>
                <th>Progression Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tier in difficultySpreadList" :key="tier.difficulty" :title="tier.description">
                <td>
                  <span class="badge badge-tier" style="font-weight: 700;">{{ tier.label }}</span>
                </td>
                <td class="num-cell">{{ tier.qCount }}</td>
                <td class="num-cell">{{ tier.availableMarks }} pts</td>
                <td class="num-cell">{{ tier.examPct }}%</td>
                <td class="num-cell">
                  <strong v-if="tier.availableMarks > 0">{{ tier.masteryPct }}%</strong>
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="num-cell">
                  <span v-if="tier.availableMarks > 0">{{ tier.minPct }}%</span>
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="num-cell">
                  <span v-if="tier.availableMarks > 0">{{ tier.maxPct }}%</span>
                  <span v-else class="text-muted">—</span>
                </td>
                <td>
                  <div class="progress-meter-track" v-if="tier.availableMarks > 0">
                    <div
                      class="progress-meter-fill"
                      :class="getMasteryBarColorClass(tier.masteryPct)"
                      :style="{ width: Math.min(100, tier.masteryPct) + '%' }"
                    ></div>
                    <span class="progress-meter-text">{{ tier.masteryPct }}%</span>
                  </div>
                  <span v-else class="text-muted">No Questions</span>
                </td>
                <td>
                  <span :class="['badge-status', tier.statusClass]" :title="tier.description">{{ tier.statusText }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SECTION 3: Dimension x Difficulty Cross Matrix -->
      <div class="card-box">
        <div class="view-header" style="margin-bottom: 14px;">
          <div>
            <h3>3. Dimension &times; Difficulty Cross Matrix</h3>
            <p class="stat-desc">
              Bivariate matrix mapping available points, question volume, and cohort mastery percentage across all dimension and difficulty intersections.
            </p>
          </div>
          <!-- Legend -->
          <div class="matrix-legend">
            <span class="legend-item"><span class="legend-swatch cell-tint-high"></span> &ge; 85% (High Mastery)</span>
            <span class="legend-item"><span class="legend-swatch cell-tint-good"></span> 70–84% (Good)</span>
            <span class="legend-item"><span class="legend-swatch cell-tint-mid"></span> 50–69% (Moderate)</span>
            <span class="legend-item"><span class="legend-swatch cell-tint-low"></span> &lt; 50% (Low Mastery)</span>
            <span class="legend-item"><span class="legend-swatch matrix-cell-empty"></span> 0 pts (Unassigned)</span>
          </div>
        </div>

        <div class="table-responsive">
          <table class="cross-matrix-table">
            <thead>
              <tr>
                <th style="min-width: 140px;">Dimension \ Tier</th>
                <th v-for="diff in crossMatrixHeaders" :key="diff.key" class="matrix-header-cell">
                  {{ diff.label }}
                </th>
                <th class="matrix-header-cell matrix-total-header">Total Dimension</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in crossMatrixRows" :key="row.dimension">
                <td>
                  <span :class="['badge', getDimensionBadgeClass(row.dimension)]">{{ row.dimension }}</span>
                </td>
                <td
                  v-for="cell in row.cells"
                  :key="cell.difficulty"
                  class="matrix-cell"
                  :class="cell.tintClass"
                  :title="cell.tooltip"
                >
                  <div v-if="cell.availMarks > 0" class="matrix-cell-content">
                    <div class="cell-marks">{{ cell.availMarks }} pts ({{ cell.qCount }} Q{{ cell.qCount === 1 ? '' : 's' }})</div>
                    <div class="cell-mastery">{{ cell.masteryPct }}%</div>
                  </div>
                  <div v-else class="matrix-cell-empty-text">—</div>
                </td>
                <!-- Row Total Cell -->
                <td class="matrix-cell matrix-row-total-cell" :title="row.tooltip">
                  <div class="matrix-cell-content">
                    <div class="cell-marks"><strong>{{ row.totalMarks }} pts</strong> ({{ row.totalQs }} Q{{ row.totalQs === 1 ? '' : 's' }})</div>
                    <div class="cell-mastery"><strong>{{ row.masteryPct }}%</strong></div>
                  </div>
                </td>
              </tr>
              <!-- Column Total Row -->
              <tr class="matrix-total-row">
                <td><strong>Total Difficulty</strong></td>
                <td
                  v-for="colTotal in crossMatrixColTotals"
                  :key="colTotal.difficulty"
                  class="matrix-cell matrix-col-total-cell"
                  :title="colTotal.tooltip"
                >
                  <div v-if="colTotal.availMarks > 0" class="matrix-cell-content">
                    <div class="cell-marks"><strong>{{ colTotal.availMarks }} pts</strong> ({{ colTotal.qCount }} Q{{ colTotal.qCount === 1 ? '' : 's' }})</div>
                    <div class="cell-mastery"><strong>{{ colTotal.masteryPct }}%</strong></div>
                  </div>
                  <div v-else class="matrix-cell-empty-text">—</div>
                </td>
                <!-- Grand Total Cell -->
                <td class="matrix-cell matrix-grand-total-cell" :title="crossMatrixGrandTotal.tooltip">
                  <div class="matrix-cell-content">
                    <div class="cell-marks"><strong>{{ crossMatrixGrandTotal.totalMarks }} pts</strong> ({{ crossMatrixGrandTotal.totalQs }} Qs)</div>
                    <div class="cell-mastery-grand">{{ crossMatrixGrandTotal.masteryPct }}%</div>
                    <div class="cell-sub-label">Exam Mastery</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SECTION 4: Question-Wise Solve Rate & Instructor Expectations Validation -->
      <div v-if="questionSolveRateData" class="card-box solve-rate-box">
        <div class="view-header" style="margin-bottom: 16px;">
          <div>
            <h3>Question-Wise Solve Rate &amp; Instructor Expectations Validation</h3>
            <p class="stat-desc">
              Validate instructor difficulty expectations against actual cohort solve rates. Significant deviation signals a mismatch between pedagogical expectations and cohort readiness.
            </p>
          </div>

          <!-- Interactive Controls: Filter & Sort -->
          <div class="solve-rate-controls">
            <div class="solve-control-group">
              <label for="solveRateFilterSelect">Alignment Filter:</label>
              <select id="solveRateFilterSelect" v-model="solveRateFilter">
                <option value="all">All Questions ({{ questionSolveRateData.totalQuestions }})</option>
                <option value="underperformed">⚠️ Much Harder (Underperformed &gt;15%)</option>
                <option value="aligned">✅ On Target (Within &plusmn;15%)</option>
                <option value="overperformed">ℹ️ Much Easier (Overperformed &gt;15%)</option>
                <option value="high_deviation">🚨 High Deviation (&ge;20%)</option>
              </select>
            </div>

            <div class="solve-control-group">
              <label for="solveRateSortSelect">Sort By:</label>
              <select id="solveRateSortSelect" v-model="solveRateSort">
                <option value="order">Question Order</option>
                <option value="abs_mismatch">Largest Mismatch (|Deviation|)</option>
                <option value="hardest">Hardest Surprise (Lowest Deviation)</option>
                <option value="easiest">Easiest Surprise (Highest Deviation)</option>
                <option value="lowest_actual">Lowest Actual Solve Rate</option>
                <option value="highest_actual">Highest Actual Solve Rate</option>
              </select>
            </div>

            <div class="solve-control-group" v-if="availableSolveRateQuestionTypes.length > 1">
              <label for="solveRateTypeSelect">Question Type:</label>
              <select id="solveRateTypeSelect" v-model="solveRateTypeFilter">
                <option value="all">All Types ({{ availableSolveRateQuestionTypes.length }})</option>
                <option v-for="t in availableSolveRateQuestionTypes" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>

            <div class="solve-control-group" v-if="profileData?.dimensions?.length">
              <label for="solveRateDimSelect">Dimension:</label>
              <select id="solveRateDimSelect" v-model="solveRateDimensionFilter">
                <option value="all">All Dimensions</option>
                <option v-for="d in profileData.dimensions" :key="d" :value="d">{{ d }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Instructor Alignment Diagnostic Summary Cards -->
        <div class="stat-cards-grid" style="margin-bottom: 18px;">
          <!-- 1. Alignment Rate % -->
          <div class="stat-card">
            <span class="stat-label">Alignment Rate %</span>
            <span class="stat-value" :style="{ color: questionSolveRateData.alignmentRate >= 75 ? '#16a34a' : '#d97706' }">
              {{ questionSolveRateData.alignmentRate }}%
            </span>
            <span class="stat-desc">
              {{ questionSolveRateData.alignedCount }} of {{ questionSolveRateData.totalQuestions }} Qs within &plusmn;15% tolerance
            </span>
          </div>

          <!-- 2. Hardest Surprise (Underperformed) -->
          <div class="stat-card">
            <span class="stat-label">Hardest Surprise (Underperformed)</span>
            <span class="stat-value" style="font-size: 1.15rem; color: #dc2626;">
              <template v-if="questionSolveRateData.maxHarderSurprise && questionSolveRateData.maxHarderSurprise.deviation < 0">
                {{ questionSolveRateData.maxHarderSurprise.id }}: Expected {{ questionSolveRateData.maxHarderSurprise.expectedSolveRate }}%, Actual {{ questionSolveRateData.maxHarderSurprise.actualSolveRate }}%
              </template>
              <template v-else>None</template>
            </span>
            <span class="stat-desc">
              <template v-if="questionSolveRateData.maxHarderSurprise && questionSolveRateData.maxHarderSurprise.deviation < 0">
                {{ questionSolveRateData.maxHarderSurprise.deviation }}% dev (misjudged high difficulty)
              </template>
              <template v-else>No questions underperformed expectations</template>
            </span>
          </div>

          <!-- 3. Easiest Surprise (Overperformed) -->
          <div class="stat-card">
            <span class="stat-label">Easiest Surprise (Overperformed)</span>
            <span class="stat-value" style="font-size: 1.15rem; color: #0284c7;">
              <template v-if="questionSolveRateData.maxEasierSurprise && questionSolveRateData.maxEasierSurprise.deviation > 0">
                {{ questionSolveRateData.maxEasierSurprise.id }}: Expected {{ questionSolveRateData.maxEasierSurprise.expectedSolveRate }}%, Actual {{ questionSolveRateData.maxEasierSurprise.actualSolveRate }}%
              </template>
              <template v-else>None</template>
            </span>
            <span class="stat-desc">
              <template v-if="questionSolveRateData.maxEasierSurprise && questionSolveRateData.maxEasierSurprise.deviation > 0">
                +{{ questionSolveRateData.maxEasierSurprise.deviation }}% dev (easier than anticipated)
              </template>
              <template v-else>No questions overperformed expectations</template>
            </span>
          </div>

          <!-- 4. High Deviation Alerts Count -->
          <div class="stat-card">
            <span class="stat-label">High Deviation Alerts</span>
            <span class="stat-value" :style="{ color: (questionSolveRateData.highDeviationAlerts?.length || 0) > 0 ? '#b91c1c' : '#16a34a' }">
              {{ questionSolveRateData.highDeviationAlerts?.length || 0 }} Question{{ (questionSolveRateData.highDeviationAlerts?.length || 0) === 1 ? '' : 's' }}
            </span>
            <span class="stat-desc">
              |Deviation| &ge; 20% significant mismatches
            </span>
          </div>
        </div>

        <!-- High Deviation Alert Banner -->
        <div
          v-if="questionSolveRateData.highDeviationAlerts && questionSolveRateData.highDeviationAlerts.length > 0"
          class="alert-box alert-warning"
          style="margin-bottom: 18px;"
        >
          <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
            <span>⚠️</span>
            <span>
              Significant Difficulty Mismatches: {{ questionSolveRateData.highDeviationAlerts.length }} question{{ questionSolveRateData.highDeviationAlerts.length === 1 ? '' : 's' }}
              had solve rates deviating by &gt;20% from expectations, indicating misjudged cohort readiness.
            </span>
          </div>
          <p style="margin: 0 0 10px 0; font-size: 0.85rem; color: #78350f;">
            Substantial gaps between anticipated difficulty and cohort reality highlight pedagogical blindspots, unexpected prerequisite gaps, or ambiguity in question framing.
          </p>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <span
              v-for="hd in questionSolveRateData.highDeviationAlerts"
              :key="hd.id"
              class="student-chip"
              style="cursor: default;"
            >
              <strong>{{ hd.id }}</strong> ({{ hd.type }} &middot; <span style="text-transform: capitalize;">{{ hd.difficulty }}</span>):
              Exp {{ hd.expectedSolveRate }}% vs Act {{ hd.actualSolveRate }}%
              <span :class="hd.deviation > 0 ? 'text-success' : 'text-danger'" style="font-weight: 700; margin-left: 4px;">
                ({{ hd.deviation > 0 ? '+' : '' }}{{ hd.deviation }}% dev)
              </span>
            </span>
          </div>
        </div>
        <div v-else class="alert-box alert-success" style="margin-bottom: 18px;">
          <strong>&#10004; Strong Instructor Calibration:</strong> All questions had solve rates within the &plusmn;20% deviation threshold, confirming well-calibrated difficulty expectations for this cohort.
        </div>

        <!-- Semantic HTML Table -->
        <div class="table-responsive">
          <table class="distribution-table">
            <thead>
              <tr>
                <th style="width: 110px;">Question ID</th>
                <th style="min-width: 170px;">Dimension(s) &amp; Difficulty</th>
                <th style="min-width: 130px;">Topic</th>
                <th class="num-cell" style="width: 75px;">Marks</th>
                <th class="num-cell" style="width: 120px;">Expected Solve Rate</th>
                <th class="num-cell" style="width: 130px;">Actual Solve Rate</th>
                <th class="num-cell" style="width: 115px;">Average Score %</th>
                <th class="num-cell" style="width: 125px;">Deviation (Act - Exp)</th>
                <th style="width: 140px;">Alignment Status</th>
                <th style="min-width: 220px;">Visual Comparison Bar</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="q in filteredSortedSolveRateQuestions" :key="q.id">
                <td>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <strong>{{ q.id }}</strong>
                    <span class="badge" :class="q.type?.toLowerCase() === 'coding' ? 'badge-type-coding' : 'badge-type-mcq'">{{ q.type }}</span>
                  </div>
                </td>
                <td>
                  <div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">
                    <span v-for="dim in q.dimensions" :key="dim" :class="['badge', getDimensionBadgeClass(dim)]">
                      {{ dim }}
                    </span>
                    <span class="badge badge-tier" style="text-transform: capitalize;">{{ q.difficulty }}</span>
                  </div>
                </td>
                <td>{{ q.topic }}</td>
                <td class="num-cell"><strong>{{ q.marks }}</strong> pts</td>
                <td class="num-cell">
                  <strong>{{ q.expectedSolveRate }}%</strong>
                  <div v-if="!q.hasExplicitExpectedRate" class="baseline-note">Tier Baseline</div>
                </td>
                <td class="num-cell">
                  <strong>{{ q.actualSolveRate }}%</strong>
                  <div class="sub-cell-info">{{ q.solvedCount }} / {{ q.totalStudents }} ({{ q.actualSolveRate }}%)</div>
                </td>
                <td class="num-cell">
                  <strong>{{ q.meanScorePct }}%</strong>
                  <div class="sub-cell-info">{{ q.meanEarned }} / {{ q.marks }} pts</div>
                </td>
                <td class="num-cell">
                  <span :class="['badge-dev', getDeviationBadgeClass(q.deviation)]">
                    {{ q.deviation > 0 ? '+' : '' }}{{ q.deviation }}%
                  </span>
                </td>
                <td>
                  <span
                    :class="[
                      'badge-status',
                      q.alignment === 'on-target'
                        ? 'badge-aligned'
                        : q.alignment === 'much-harder'
                        ? 'badge-mismatch-hard'
                        : 'badge-mismatch-easy'
                    ]"
                  >
                    <template v-if="q.alignment === 'on-target'">✅ On Target</template>
                    <template v-else-if="q.alignment === 'much-harder'">⚠️ Much Harder</template>
                    <template v-else>ℹ️ Much Easier</template>
                  </span>
                </td>
                <td>
                  <div class="solve-rate-meter">
                    <div class="meter-row">
                      <span class="meter-tag">Exp:</span>
                      <div class="meter-bar-track">
                        <div
                          class="meter-bar-fill exp-bar"
                          :style="{ width: Math.min(100, Math.max(0, q.expectedSolveRate)) + '%' }"
                        ></div>
                      </div>
                      <span class="meter-val">{{ q.expectedSolveRate }}%</span>
                    </div>
                    <div class="meter-row">
                      <span class="meter-tag">Act:</span>
                      <div class="meter-bar-track">
                        <div
                          class="meter-bar-fill act-bar"
                          :class="getActualBarColorClass(q.deviation)"
                          :style="{ width: Math.min(100, Math.max(0, q.actualSolveRate)) + '%' }"
                        ></div>
                      </div>
                      <span class="meter-val">{{ q.actualSolveRate }}%</span>
                    </div>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredSortedSolveRateQuestions.length === 0">
                <td colspan="10" style="text-align: center; padding: 28px; color: #64748b;">
                  No questions match the selected filter criteria.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Table Summary Stat Footer -->
        <div class="dist-summary-footer">
          <div class="dist-summary-stat">
            <span class="label">Total Questions:</span>
            <span class="val">{{ questionSolveRateData.totalQuestions }}</span>
          </div>
          <div class="dist-summary-stat">
            <span class="label">Showing:</span>
            <span class="val">{{ filteredSortedSolveRateQuestions.length }} Qs</span>
          </div>
          <div class="dist-summary-stat">
            <span class="label">Cohort Alignment Rate:</span>
            <span class="val" :style="{ color: questionSolveRateData.alignmentRate >= 75 ? '#16a34a' : '#d97706' }">
              {{ questionSolveRateData.alignmentRate }}%
            </span>
          </div>
          <div class="dist-summary-stat">
            <span class="label">On Target (&plusmn;15%):</span>
            <span class="val">{{ questionSolveRateData.alignedCount }} Qs</span>
          </div>
          <div class="dist-summary-stat">
            <span class="label">Much Harder (&gt;15%):</span>
            <span class="val" style="color: #dc2626;">{{ questionSolveRateData.muchHarderCount }} Qs</span>
          </div>
          <div class="dist-summary-stat">
            <span class="label">Much Easier (&gt;15%):</span>
            <span class="val" style="color: #0284c7;">{{ questionSolveRateData.muchEasierCount }} Qs</span>
          </div>
          <div class="dist-summary-stat">
            <span class="label">High Deviation Alerts (&ge;20%):</span>
            <span class="val" :style="{ color: (questionSolveRateData.highDeviationAlerts?.length || 0) > 0 ? '#b91c1c' : '#16a34a' }">
              {{ questionSolveRateData.highDeviationAlerts?.length || 0 }} Qs
            </span>
          </div>
        </div>

        <!-- Expectations Simulation Quick Callout -->
        <div style="margin-top: 16px; padding: 14px 18px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-weight: 700; color: #1e40af; font-size: 0.95rem;">🎲 Monte Carlo Cohort Simulation Lab</div>
            <div style="color: #1e3a8a; font-size: 0.85rem; margin-top: 2px;">Simulate synthetic cohort outcomes using IRT 3PL &amp; Partial Credit modeling and compare against actual exam results.</div>
          </div>
          <button type="button" class="btn-primary" @click="currentTab = 'simulation'">
            🎲 Run Expectations vs. Reality Simulation &rarr;
          </button>
        </div>
      </div>
    </section>

    <!-- VIEW 4: EXPECTATIONS SIMULATION -->
    <section v-if="currentTab === 'simulation' && profileData" class="view-panel">
      <!-- Section Header -->
      <header class="view-header">
        <div>
          <h2 class="view-title">🎲 Expectations vs. Reality: Monte Carlo Calibration Lab</h2>
          <p class="view-desc">
            Item Response Theory (3PL &amp; Partial Credit) Monte Carlo simulation benchmarked against actual cohort performance across {{ activeExamInfo?.examTitle || 'Exam' }}.
          </p>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" class="btn-secondary" @click="currentTab = 'paper'">
            &larr; Paper Analysis
          </button>
          <button type="button" class="btn-secondary" @click="currentTab = 'cohort'">
            Cohort Overview
          </button>
        </div>
      </header>

      <!-- Interactive Simulation Controls Bar -->
      <div class="simulation-controls-bar">
        <div class="sim-control-group">
          <label for="simulationBinModeSelect" style="font-weight: 600;">Binning Mode:</label>
          <select id="simulationBinModeSelect" v-model="simulationBinMode">
            <option value="percentage">Decile % Bins (90-100% &hellip; 0-10%)</option>
            <option value="raw">Raw Mark Bins</option>
          </select>
        </div>

        <div class="sim-control-group">
          <button type="button" class="btn-secondary" @click="rerunSimulation">
            🎲 Re-run Monte Carlo Simulation
          </button>
          <span class="sim-meta">Seed: {{ simulationSeed }}</span>
        </div>

        <div class="sim-meta" style="margin-left: auto;">
          <span>Cohort Size: <strong>{{ profileData.students?.length || 0 }} students</strong></span>
          &middot;
          <span>Questions: <strong>{{ currentQuestions.length }}</strong></span>
          &middot;
          <span>Total Exam Marks: <strong>{{ profileData.cohort.totalExam || profileData.cohort.total }} pts</strong></span>
        </div>
      </div>

      <!-- 4 Diagnostic Metric Cards in a grid -->
      <div class="stat-cards-grid">
        <div class="stat-card">
          <span class="stat-label">Expected vs. Actual Median</span>
          <span class="stat-value">
            {{ simulationData?.expectedCohort?.medianPct ?? 0 }}% <span style="font-weight: normal; font-size: 1rem; color: #64748b;">vs</span> {{ profileData.cohort.medianPct ?? 0 }}%
          </span>
          <span class="stat-desc" style="margin-top: 6px;">
            <span :class="getGapBadgeClass(simulationData?.overallGap?.medianGap)">
              Gap: {{ simulationData?.overallGap?.medianGap != null ? (simulationData.overallGap.medianGap > 0 ? '+' : '') + simulationData.overallGap.medianGap + ' pp' : 'N/A' }}
            </span>
          </span>
        </div>

        <div class="stat-card">
          <span class="stat-label">Expected vs. Actual Mean</span>
          <span class="stat-value">
            {{ simulationData?.expectedCohort?.meanPct ?? 0 }}% <span style="font-weight: normal; font-size: 1rem; color: #64748b;">vs</span> {{ profileData.cohort.meanPct ?? profileData.cohort.masteryPct ?? 0 }}%
          </span>
          <span class="stat-desc" style="margin-top: 6px;">
            <span :class="getGapBadgeClass(simulationData?.overallGap?.meanGap)">
              Gap: {{ simulationData?.overallGap?.meanGap != null ? (simulationData.overallGap.meanGap > 0 ? '+' : '') + simulationData.overallGap.meanGap + ' pp' : 'N/A' }}
            </span>
          </span>
        </div>

        <div class="stat-card">
          <span class="stat-label">Curriculum Calibration Score</span>
          <span class="stat-value" style="color: #2563eb;">
            {{ calibrationScore }}%
          </span>
          <span class="stat-desc">
            Divergence score: {{ simulationData?.overallGap?.divergenceScore ?? 0 }} pp
          </span>
        </div>

        <div class="stat-card">
          <span class="stat-label">Primary Course Deficit</span>
          <span class="stat-value" :style="{ color: (primaryDeficitDimension?.gap ?? 0) < -5 ? '#dc2626' : '#16a34a' }">
            {{ primaryDeficitDimension ? primaryDeficitDimension.dimension : 'None' }}
            <span v-if="primaryDeficitDimension" style="font-size: 0.95rem; font-weight: normal;">
              ({{ primaryDeficitDimension.gap > 0 ? '+' : '' }}{{ primaryDeficitDimension.gap }} pp)
            </span>
          </span>
          <span class="stat-desc" style="margin-top: 6px;">
            <span v-if="primaryDeficitDimension" :class="getGapBadgeClass(primaryDeficitDimension.gap)">
              {{ primaryDeficitDimension.statusLabel }}
            </span>
            <span v-else class="badge-gap-aligned">On Target</span>
          </span>
        </div>
      </div>

      <!-- Pedagogical Diagnosis Alert Banner -->
      <div v-if="simulationData?.insights?.length" class="paper-insights-banner" style="margin-bottom: 24px;">
        <div class="banner-title">&#128161; Pedagogical Diagnosis &amp; Calibration Insights</div>
        <ul class="banner-list">
          <li v-for="(insight, idx) in simulationData.insights" :key="idx">
            {{ insight }}
          </li>
        </ul>
      </div>

      <!-- Section 1: Score Distribution: Expected vs. Actual -->
      <div class="card-box" style="margin-bottom: 24px;">
        <div class="view-header" style="margin-bottom: 12px;">
          <div>
            <h3>1. Score Distribution: Expected vs. Actual</h3>
            <p class="stat-desc">
              Comparison of Monte Carlo synthetic population distribution against actual observed cohort frequencies (ordered High &darr; Low).
            </p>
          </div>
          <div style="font-size: 0.8rem; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            <span style="display: inline-flex; align-items: center; gap: 4px;">
              <span style="display: inline-block; width: 12px; height: 8px; background: #3b82f6; border-radius: 2px;"></span> Expected
            </span>
            <span style="display: inline-flex; align-items: center; gap: 4px;">
              <span style="display: inline-block; width: 12px; height: 8px; background: #10b981; border-radius: 2px;"></span> Actual (Aligned/Surplus)
            </span>
            <span style="display: inline-flex; align-items: center; gap: 4px;">
              <span style="display: inline-block; width: 12px; height: 8px; background: #ef4444; border-radius: 2px;"></span> Actual (Deficit)
            </span>
          </div>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Score Range (Bin)</th>
                <th class="num-cell">Expected Students</th>
                <th class="num-cell">Expected %</th>
                <th class="num-cell">Actual Students</th>
                <th class="num-cell">Actual %</th>
                <th class="num-cell">Delta (pp)</th>
                <th style="min-width: 140px;">Distribution Comparison</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="bin in simulationComparisonBins" :key="bin.label">
                <td><strong>{{ bin.label }}</strong></td>
                <td class="num-cell">{{ bin.expectedCount }}</td>
                <td class="num-cell">{{ bin.expectedPct }}%</td>
                <td class="num-cell">{{ bin.actualCount }}</td>
                <td class="num-cell"><strong>{{ bin.actualPct }}%</strong></td>
                <td class="num-cell">
                  <span :class="getGapBadgeClass(bin.deltaPct)">
                    {{ bin.deltaPct > 0 ? '+' : '' }}{{ bin.deltaPct }} pp
                  </span>
                </td>
                <td>
                  <div class="dual-bar-track" :title="'Expected: ' + bin.expectedPct + '% | Actual: ' + bin.actualPct + '%'">
                    <div
                      class="dual-bar-expected"
                      :style="{ width: Math.min(100, Math.max(3, bin.expectedPct * 2.5)) + '%' }"
                    ></div>
                    <div
                      class="dual-bar-actual"
                      :class="bin.deltaPct < -5 ? 'dual-bar-deficit' : 'dual-bar-ok'"
                      :style="{ width: Math.min(100, Math.max(3, bin.actualPct * 2.5)) + '%' }"
                    ></div>
                  </div>
                </td>
              </tr>
              <tr v-if="!simulationComparisonBins.length">
                <td colspan="7" style="text-align: center; color: #64748b; padding: 16px;">
                  No distribution bins available.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 2: Cognitive Dimension Gap Analysis (RCSBE table) -->
      <div class="card-box" style="margin-bottom: 24px;">
        <div class="view-header" style="margin-bottom: 12px;">
          <div>
            <h3>2. Cognitive Dimension Gap Analysis (RCSBE)</h3>
            <p class="stat-desc">
              Pedagogical alignment across Recall, Comprehend, Solve, Build, and Evaluate dimensions. Negative gaps highlight critical course blindspots.
            </p>
          </div>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Dimension</th>
                <th class="num-cell">Available Marks</th>
                <th class="num-cell">Expected Mastery %</th>
                <th class="num-cell">Actual Mastery %</th>
                <th class="num-cell">Gap (pp)</th>
                <th>Status</th>
                <th style="min-width: 140px;">Comparison Meter</th>
                <th style="min-width: 240px;">Actionable Recommendation</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="dim in simulationDimensionGaps" :key="dim.dimension">
                <td>
                  <span :class="['badge', getDimensionBadgeClass(dim.dimension)]">
                    {{ dim.dimension }}
                  </span>
                </td>
                <td class="num-cell">{{ dim.availableMarks }}</td>
                <td class="num-cell">{{ dim.expectedMasteryPct }}%</td>
                <td class="num-cell"><strong>{{ dim.actualMasteryPct != null ? dim.actualMasteryPct + '%' : '—' }}</strong></td>
                <td class="num-cell">
                  <span :class="getGapBadgeClass(dim.gap)">
                    {{ dim.gap != null ? (dim.gap > 0 ? '+' : '') + dim.gap + ' pp' : '—' }}
                  </span>
                </td>
                <td>
                  <span :class="getGapBadgeClass(dim.gap)">
                    {{ dim.statusLabel }}
                  </span>
                </td>
                <td>
                  <div class="dual-bar-track" :title="'Expected: ' + dim.expectedMasteryPct + '% | Actual: ' + (dim.actualMasteryPct ?? 0) + '%'">
                    <div
                      class="dual-bar-expected"
                      :style="{ width: Math.min(100, Math.max(3, dim.expectedMasteryPct)) + '%' }"
                    ></div>
                    <div
                      class="dual-bar-actual"
                      :class="(dim.gap ?? 0) < -5 ? 'dual-bar-deficit' : 'dual-bar-ok'"
                      :style="{ width: Math.min(100, Math.max(3, dim.actualMasteryPct ?? 0)) + '%' }"
                    ></div>
                  </div>
                </td>
                <td class="recommendation-cell">
                  {{ dim.recommendation }}
                </td>
              </tr>
              <tr v-if="!simulationDimensionGaps.length">
                <td colspan="8" style="text-align: center; color: #64748b; padding: 16px;">
                  No dimension gaps available.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 3: Topic-Level Course Understanding Breakdown -->
      <div class="card-box" style="margin-bottom: 24px;">
        <div class="view-header" style="margin-bottom: 12px;">
          <div>
            <h3>3. Topic-Level Course Understanding Breakdown</h3>
            <p class="stat-desc">
              Granular topic diagnostic benchmarking expected topic solve rates against actual cohort performance.
            </p>
          </div>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Topic</th>
                <th class="num-cell">Available Marks</th>
                <th class="num-cell">Expected Mastery %</th>
                <th class="num-cell">Actual Mastery %</th>
                <th class="num-cell">Gap (pp)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="topic in simulationTopicGaps" :key="topic.topic">
                <td><strong>{{ topic.topic }}</strong></td>
                <td class="num-cell">{{ topic.availableMarks }}</td>
                <td class="num-cell">{{ topic.expectedMasteryPct }}%</td>
                <td class="num-cell"><strong>{{ topic.actualMasteryPct != null ? topic.actualMasteryPct + '%' : '—' }}</strong></td>
                <td class="num-cell">
                  <span :class="getGapBadgeClass(topic.gap)">
                    {{ topic.gap != null ? (topic.gap > 0 ? '+' : '') + topic.gap + ' pp' : '—' }}
                  </span>
                </td>
                <td>
                  <span :class="getGapBadgeClass(topic.gap)">
                    {{ topic.statusLabel }}
                  </span>
                </td>
              </tr>
              <tr v-if="!simulationTopicGaps.length">
                <td colspan="6" style="text-align: center; color: #64748b; padding: 16px;">
                  No topic-level metadata available.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- VIEW 5: STUDENT PROFILE DEEP DIVE -->
    <section v-if="currentTab === 'student' && profileData" class="view-panel">
      <div class="view-header">
        <div>
          <h2 class="view-title">Student Profile Deep Dive</h2>
          <p class="view-desc">Detailed multi-dimensional cognitive breakdown for individual student analysis.</p>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <label for="studentSelect" style="font-weight: 600;">Select Student:</label>
          <select id="studentSelect" v-model="selectedStudentId" style="min-width: 220px;">
            <option v-for="st in profileData.students" :key="st.id" :value="st.id">
              {{ st.id }} - {{ st.name }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="selectedStudent">
        <!-- Metric Toggle Fieldset -->
        <fieldset style="margin-bottom: 20px;">
          <legend>Visualization Metric Toggle</legend>
          <div class="radio-group">
            <label>
              <input
                v-model="selectedMetric"
                type="radio"
                name="studentMetricToggle"
                value="mastery"
              />
              <strong>Overall Exam Mastery %</strong> (Marks Earned / Total Available Marks)
            </label>
            <label>
              <input
                v-model="selectedMetric"
                type="radio"
                name="studentMetricToggle"
                value="accuracy"
              />
              <strong>Attempted Accuracy %</strong> (Marks Earned / Attempted Marks)
            </label>
          </div>
        </fieldset>

        <!-- Side-by-Side: Left Spider Chart vs Right Key Highlights -->
        <div class="side-by-side-container">
          <div class="card-box">
            <h3>Student vs Cohort Average (Radar)</h3>
            <p class="stat-desc" style="margin-bottom: 8px;">
              Blue: {{ selectedStudent.name }} &middot; Red (Dashed): Cohort Average
            </p>
            <RadarChart
              :student-data="studentDimensionScores"
              :cohort-data="cohortDimensionScores"
              :metric-name="selectedMetric === 'mastery' ? 'Overall Mastery %' : 'Attempted Accuracy %'"
              :student-label="selectedStudent.name"
            />
          </div>

          <div class="card-box">
            <h3>Key Performance Highlights</h3>
            <p class="stat-desc" style="margin-bottom: 14px;">Summary indicators for {{ selectedStudent.name }} ({{ selectedStudent.id }}).</p>
            <div class="highlights-grid">
              <div class="highlight-item">
                <div class="highlight-label">Total Marks Earned</div>
                <div class="highlight-value">{{ selectedStudent.earned }}</div>
              </div>
              <div class="highlight-item">
                <div class="highlight-label">Total Exam Available</div>
                <div class="highlight-value">{{ selectedStudent.totalExam || selectedStudent.total }}</div>
              </div>
              <div class="highlight-item">
                <div class="highlight-label">Overall Mastery %</div>
                <div class="highlight-value" style="color: #2563eb;">{{ selectedStudent.masteryPct ?? selectedStudent.pct ?? 0 }}%</div>
              </div>
              <div class="highlight-item">
                <div class="highlight-label">Attempted Accuracy %</div>
                <div class="highlight-value" style="color: #059669;">{{ selectedStudent.accuracyPct ?? selectedStudent.accuracy ?? 0 }}%</div>
              </div>
              <div class="highlight-item" style="grid-column: span 2;">
                <div class="highlight-label">Strong Dimensions</div>
                <div class="highlight-value" style="font-size: 0.95rem; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                  <template v-if="selectedStudent.strongDimensions && selectedStudent.strongDimensions.length">
                    <span
                      v-for="sDim in selectedStudent.strongDimensions"
                      :key="sDim"
                      class="badge badge-strong"
                      style="font-size: 0.85rem; padding: 4px 10px;"
                      :title="getStudentDimensionHighlightTooltip(sDim, 'strong')"
                    >
                      {{ sDim }} ({{ getStudentDimensionMastery(sDim) }}%)
                    </span>
                  </template>
                  <span v-else class="badge badge-none" style="font-size: 0.82rem; font-weight: normal; color: #64748b;" title="No dimensions met criteria: ≥80% mastery and >15% above cohort benchmark">
                    None (within &plusmn;15% of class avg or &lt;80%)
                  </span>
                </div>
              </div>
              <div class="highlight-item" style="grid-column: span 2;">
                <div class="highlight-label">Weak Dimensions</div>
                <div class="highlight-value" style="font-size: 0.95rem; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                  <template v-if="selectedStudent.weakDimensions && selectedStudent.weakDimensions.length">
                    <span
                      v-for="wDim in selectedStudent.weakDimensions"
                      :key="wDim"
                      class="badge badge-weak"
                      style="font-size: 0.85rem; padding: 4px 10px;"
                      :title="getStudentDimensionHighlightTooltip(wDim, 'weak')"
                    >
                      {{ wDim }} ({{ getStudentDimensionMastery(wDim) }}%)
                    </span>
                  </template>
                  <span v-else class="badge badge-none" style="font-size: 0.82rem; font-weight: normal; color: #64748b;" title="No dimensions met criteria: <50% mastery and >15% below cohort benchmark">
                    None (no dimension &lt;50% &amp; &gt;15% below avg)
                  </span>
                </div>
              </div>
              <div class="highlight-item" style="grid-column: span 2;">
                <div class="highlight-label">Average / Neutral Dimensions</div>
                <div class="highlight-value" style="font-size: 0.95rem; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                  <template v-if="selectedStudent.averageDimensions && selectedStudent.averageDimensions.length">
                    <span
                      v-for="aDim in selectedStudent.averageDimensions"
                      :key="aDim"
                      class="badge badge-neutral"
                      style="font-size: 0.85rem; padding: 4px 10px;"
                      :title="getStudentDimensionHighlightTooltip(aDim, 'average')"
                    >
                      {{ aDim }} ({{ getStudentDimensionMastery(aDim) }}%)
                    </span>
                  </template>
                  <span v-else class="badge badge-none" style="font-size: 0.82rem; font-weight: normal; color: #64748b;" title="All assessed dimensions are distinctly strong or weak">
                    None
                  </span>
                </div>
              </div>
              <div class="highlight-item">
                <div class="highlight-label">Strongest Dimension</div>
                <div class="highlight-value">
                  <span
                    v-if="selectedStudent.strongestDimension || selectedStudent.strongest"
                    class="badge badge-strong"
                    :title="getStudentDimensionHighlightTooltip(selectedStudent.strongestDimension || selectedStudent.strongest, 'strongest')"
                  >
                    {{ selectedStudent.strongestDimension || selectedStudent.strongest }} ({{ getStudentDimensionMastery(selectedStudent.strongestDimension || selectedStudent.strongest) }}%)
                  </span>
                  <span v-else class="badge badge-none" title="No dimension reached ≥80% strong threshold">None (&lt;80%)</span>
                </div>
              </div>
              <div class="highlight-item">
                <div class="highlight-label">Weakest Dimension</div>
                <div class="highlight-value">
                  <span
                    v-if="selectedStudent.weakestDimension || selectedStudent.weakest"
                    class="badge badge-weak"
                    :title="getStudentDimensionHighlightTooltip(selectedStudent.weakestDimension || selectedStudent.weakest, 'weakest')"
                  >
                    {{ selectedStudent.weakestDimension || selectedStudent.weakest }} ({{ getStudentDimensionMastery(selectedStudent.weakestDimension || selectedStudent.weakest) }}%)
                  </span>
                  <span v-else class="badge badge-none" style="font-size: 0.82rem; font-weight: normal; color: #64748b;" title="No dimension scored below 50% weak threshold">
                    None (&ge;50%)
                  </span>
                </div>
              </div>
            </div>

            <div style="margin-top: 16px;">
              <button
                type="button"
                class="btn-secondary"
                style="width: 100%;"
                @click="openStudentLongitudinalHistory(selectedStudent.id)"
              >
                &#128337; View Longitudinal History for {{ selectedStudent.name }}
              </button>
            </div>
          </div>
        </div>

        <!-- Detailed Dimension Breakdown Table -->
        <div class="card-box" style="margin-top: 20px;">
          <h3>Detailed Dimension Breakdown</h3>
          <p class="stat-desc" style="margin-bottom: 12px;">Detailed breakdown for {{ selectedStudent.name }} across all {{ profileData.dimensions.length }} cognitive dimensions.</p>
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Dimension</th>
                  <th>Classification Status</th>
                  <th>Cohort Comparison</th>
                  <th class="num-cell">Marks Earned</th>
                  <th class="num-cell">Total Exam Marks</th>
                  <th class="num-cell">Attempted Marks</th>
                  <th class="num-cell">Mastery %</th>
                  <th class="num-cell">Accuracy %</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="dim in profileData.dimensions" :key="dim">
                  <td>
                    <span :class="['badge', getDimensionBadgeClass(dim)]">{{ dim }}</span>
                  </td>
                  <td>
                    <span
                      v-if="getStudentDimensionStatus(dim) === 'strong'"
                      class="badge badge-strong"
                      :title="getStudentDimensionHighlightTooltip(dim, 'strong')"
                    >
                      Strong
                    </span>
                    <span
                      v-else-if="getStudentDimensionStatus(dim) === 'weak'"
                      class="badge badge-weak"
                      :title="getStudentDimensionHighlightTooltip(dim, 'weak')"
                    >
                      Weak
                    </span>
                    <span
                      v-else
                      class="badge badge-neutral"
                      :title="getStudentDimensionHighlightTooltip(dim, 'average')"
                    >
                      Average
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <span>Cohort Avg: <strong>{{ getStudentCohortComparison(dim).cohortPct }}%</strong></span>
                      <span
                        :class="['badge', getStudentCohortComparison(dim).delta > 0 ? 'badge-strong' : getStudentCohortComparison(dim).delta < 0 ? 'badge-weak' : 'badge-neutral']"
                        style="font-size: 0.8rem;"
                      >
                        {{ getStudentCohortComparison(dim).deltaText }}
                      </span>
                    </div>
                  </td>
                  <td class="num-cell">{{ selectedStudent.dimension[dim]?.earned ?? 0 }}</td>
                  <td class="num-cell">{{ selectedStudent.dimension[dim]?.availableExam ?? selectedStudent.dimension[dim]?.available ?? 0 }}</td>
                  <td class="num-cell">{{ selectedStudent.dimension[dim]?.availableAttempted ?? selectedStudent.dimension[dim]?.attempted ?? 0 }}</td>
                  <td class="num-cell"><strong>{{ selectedStudent.dimension[dim]?.masteryPct ?? selectedStudent.dimension[dim]?.pct ?? 0 }}%</strong></td>
                  <td class="num-cell">{{ selectedStudent.dimension[dim]?.accuracyPct ?? selectedStudent.dimension[dim]?.accuracy ?? 0 }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Difficulty Breakdown Table -->
        <div class="card-box" style="margin-top: 20px;">
          <h3>Difficulty Breakdown</h3>
          <p class="stat-desc" style="margin-bottom: 12px;">Performance segmented by question difficulty levels.</p>
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Difficulty Level</th>
                  <th class="num-cell">Marks Earned</th>
                  <th class="num-cell">Total Available</th>
                  <th class="num-cell">Attempted Marks</th>
                  <th class="num-cell">Mastery %</th>
                  <th class="num-cell">Accuracy %</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="diff in profileData.difficulties" :key="diff">
                  <td>
                    <span class="badge badge-tier">{{ diff }}</span>
                  </td>
                  <td class="num-cell">{{ selectedStudent.difficulty[diff]?.earned ?? 0 }}</td>
                  <td class="num-cell">{{ selectedStudent.difficulty[diff]?.availableExam ?? selectedStudent.difficulty[diff]?.available ?? 0 }}</td>
                  <td class="num-cell">{{ selectedStudent.difficulty[diff]?.availableAttempted ?? selectedStudent.difficulty[diff]?.attempted ?? 0 }}</td>
                  <td class="num-cell"><strong>{{ selectedStudent.difficulty[diff]?.masteryPct ?? selectedStudent.difficulty[diff]?.pct ?? 0 }}%</strong></td>
                  <td class="num-cell">{{ selectedStudent.difficulty[diff]?.accuracyPct ?? selectedStudent.difficulty[diff]?.accuracy ?? 0 }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Topic Breakdown Table -->
        <div class="card-box" style="margin-top: 20px;">
          <h3>Topic Breakdown</h3>
          <p class="stat-desc" style="margin-bottom: 12px;">Subject-matter topic competencies.</p>
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Topic</th>
                  <th class="num-cell">Marks Earned</th>
                  <th class="num-cell">Total Available</th>
                  <th class="num-cell">Attempted Marks</th>
                  <th class="num-cell">Mastery %</th>
                  <th class="num-cell">Accuracy %</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="top in profileData.topics" :key="top">
                  <td><strong>{{ top }}</strong></td>
                  <td class="num-cell">{{ selectedStudent.topic[top]?.earned ?? 0 }}</td>
                  <td class="num-cell">{{ selectedStudent.topic[top]?.availableExam ?? selectedStudent.topic[top]?.available ?? 0 }}</td>
                  <td class="num-cell">{{ selectedStudent.topic[top]?.availableAttempted ?? selectedStudent.topic[top]?.attempted ?? 0 }}</td>
                  <td class="num-cell"><strong>{{ selectedStudent.topic[top]?.masteryPct ?? selectedStudent.topic[top]?.pct ?? 0 }}%</strong></td>
                  <td class="num-cell">{{ selectedStudent.topic[top]?.accuracyPct ?? selectedStudent.topic[top]?.accuracy ?? 0 }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- VIEW 6: LONGITUDINAL HISTORY -->
    <section v-if="currentTab === 'history'" class="view-panel">
      <div class="view-header">
        <div>
          <h2 class="view-title">Longitudinal Student History</h2>
          <p class="view-desc">Track a student's cognitive dimension mastery and progression across multiple exams over time.</p>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <label for="historyStudentSelect" style="font-weight: 600;">Student:</label>
          <select
            id="historyStudentSelect"
            v-model="historyStudentId"
            style="min-width: 220px;"
            :disabled="!historyStudentOptions.length"
            @change="fetchStudentHistory(historyStudentId)"
          >
            <option v-if="!historyStudentOptions.length" value="" disabled>No students loaded</option>
            <option v-for="sOpt in historyStudentOptions" :key="sOpt.id" :value="sOpt.id">
              {{ sOpt.id }} - {{ sOpt.name }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="studentHistoryRecords.length" class="card-box">
        <h3>Exam History &amp; Dimension Progression</h3>
        <p class="stat-desc" style="margin-bottom: 12px;">Chronological progression records for {{ currentHistoryStudentName }}.</p>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Course</th>
                <th>Exam Title</th>
                <th class="num-cell">Score</th>
                <th class="num-cell">Mastery %</th>
                <th class="num-cell">Recall %</th>
                <th class="num-cell">Comprehend %</th>
                <th class="num-cell">Solve %</th>
                <th class="num-cell">Build %</th>
                <th class="num-cell">Evaluate %</th>
                <th>Weakest Dimension</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rec in studentHistoryRecords" :key="rec.exam_id || rec.exam_title">
                <td>{{ rec.date }}</td>
                <td>{{ rec.course_name }}</td>
                <td><strong>{{ rec.exam_title }}</strong></td>
                <td class="num-cell">{{ rec.earned }} / {{ rec.total }}</td>
                <td class="num-cell"><strong>{{ rec.mastery_pct }}%</strong></td>
                <td class="num-cell">{{ rec.recall_pct }}%</td>
                <td class="num-cell">{{ rec.comprehend_pct }}%</td>
                <td class="num-cell">{{ rec.solve_pct }}%</td>
                <td class="num-cell">{{ rec.build_pct }}%</td>
                <td class="num-cell">{{ rec.evaluate_pct }}%</td>
                <td>
                  <span class="badge badge-weak">{{ rec.weakest_dimension }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else class="empty-state">
        <p v-if="historyStudentId">No historical exams recorded for {{ currentHistoryStudentName }} yet.</p>
        <p v-else>No student selected. Load or upload exam data to inspect longitudinal progression.</p>
        <button type="button" class="btn-secondary" @click="currentTab = 'upload'">
          Upload New Exam Data
        </button>
      </div>
    </section>

    <!-- VIEW 7: SAVED EXAMS -->
    <section v-if="currentTab === 'saved'" class="view-panel">
      <div class="view-header">
        <div>
          <h2 class="view-title">Saved Exams</h2>
          <p class="view-desc">Inspect, reload, and manage historical exam datasets.</p>
        </div>
        <button type="button" class="btn-secondary" @click="fetchSavedExams">
          &#128260; Refresh Saved Exams
        </button>
      </div>

      <div v-if="savedExamsList.length" class="card-box">
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Course Name</th>
                <th>Exam Title</th>
                <th>Date</th>
                <th class="num-cell">Questions</th>
                <th class="num-cell">Students</th>
                <th class="num-cell">Avg Mastery %</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="exam in savedExamsList" :key="exam.id">
                <td>{{ exam.courseName }}</td>
                <td><strong>{{ exam.examTitle }}</strong></td>
                <td>{{ exam.examDate }}</td>
                <td class="num-cell">{{ exam.questionCount ?? exam.questionsCount ?? (exam.questions ? exam.questions.length : '-') }}</td>
                <td class="num-cell">{{ exam.studentCount ?? exam.studentsCount ?? (exam.scores ? Object.keys(exam.scores).length : '-') }}</td>
                <td class="num-cell">
                  <strong>{{ exam.analysis?.cohort?.masteryPct ?? exam.profileResult?.cohort?.pct ?? exam.avgMastery ?? '-' }}%</strong>
                </td>
                <td>
                  <div style="display: flex; gap: 8px;">
                    <button
                      type="button"
                      class="btn-sm btn-primary"
                      @click="loadSavedExam(exam)"
                    >
                      Load Exam
                    </button>
                    <button
                      type="button"
                      class="btn-sm btn-danger"
                      @click="deleteSavedExam(exam.id)"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>No saved exams found.</p>
        <button type="button" class="btn-primary" @click="currentTab = 'upload'">
          Create or Upload an Exam
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import RadarChart from './components/RadarChart.vue'
import {
  parseCsv,
  readQuestions,
  readScores,
  readStudentDetails,
  buildProfiles,
  TIER_ORDER,
  computeDecileBins,
  computeRawMarkBins,
  computeDistributionStats,
  computeQuestionSolveRates,
  simulateExpectedCohort
} from './profile.js'
import {
  SAMPLE_QUESTIONS_CSV,
  SAMPLE_STUDENTS_CSV,
  SAMPLE_SCORES_CSV,
  SAMPLE_LONGITUDINAL_HISTORY,
  CONTEST_QUESTIONS_CSV,
  CONTEST_STUDENTS_CSV,
  CONTEST_SCORES_CSV
} from './samples.js'

// Navigation state
const currentTab = ref('upload')
const isAnalyzing = ref(false)
const sampleLoaded = ref(false)

// Exam metadata form
const form = ref({
  courseName: 'CS101 - Algorithms & Data Structures',
  examTitle: 'Midterm Exam 2026',
  examDate: new Date().toISOString().split('T')[0]
})

// Raw uploaded datasets
const rawQuestions = ref([])
const rawScores = ref([])
const rawScoreFields = ref([])
const rawDetails = ref([])

// Current active parsed dataset
const activeExamInfo = ref(null)
const currentQuestions = ref([])
const currentScores = ref({})
const currentAttempts = ref({})
const currentStudentDetails = ref({})
const currentWarnings = ref([])

// Calculation profile results
const profileData = ref(null)

// Student Deep Dive state
const selectedStudentId = ref('')
const selectedMetric = ref('mastery') // 'mastery' or 'accuracy'

// Cohort view state
const cohortSearchQuery = ref('')
const cohortSortColumn = ref('id')
const cohortSortDirection = ref('asc')

function setCohortSort(col) {
  if (cohortSortColumn.value === col) {
    cohortSortDirection.value = cohortSortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    cohortSortColumn.value = col
    cohortSortDirection.value = (col === 'id' || col === 'name' || col === 'weakest') ? 'asc' : 'desc'
  }
}

function cohortSortIcon(col) {
  if (cohortSortColumn.value !== col) return '↕'
  return cohortSortDirection.value === 'asc' ? '▲' : '▼'
}

// Longitudinal history state
const historyStudentId = ref('')
const studentHistoryRecords = ref([])

// Saved exams state
const savedExamsList = ref([])

// Formatting helpers
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0'
  return Number(num).toFixed(1)
}

function getDimensionBadgeClass(dim) {
  const d = String(dim).toLowerCase()
  if (d.includes('recall')) return 'badge-dim-recall'
  if (d.includes('comprehend')) return 'badge-dim-comprehend'
  if (d.includes('solve')) return 'badge-dim-solve'
  if (d.includes('build')) return 'badge-dim-build'
  if (d.includes('evaluate')) return 'badge-dim-evaluate'
  return ''
}

// Summary and validation computed object
const validationSummary = computed(() => {
  if (!currentQuestions.value.length && !profileData.value) return null
  const questionsCount = currentQuestions.value.length
  const totalMarks = Number(currentQuestions.value.reduce((acc, q) => acc + (q.marks || 0), 0).toFixed(1))
  const studentsCount = profileData.value ? profileData.value.students.length : Object.keys(currentScores.value).length
  const dimensionsList = profileData.value
    ? profileData.value.dimensions
    : [...new Set(currentQuestions.value.flatMap((q) => q.dimensions || []))].filter(Boolean)
  const dimensionsCount = dimensionsList.length
  return {
    questionsCount,
    totalMarks,
    studentsCount,
    dimensionsCount,
    dimensionsList,
    warnings: currentWarnings.value
  }
})

// Cohort computed properties
const cohortAvgScore = computed(() => {
  if (!profileData.value || !profileData.value.cohort) return 0
  return profileData.value.cohort.earned ?? 0
})

const cohortDimensionScores = computed(() => {
  if (!profileData.value || !profileData.value.cohort) return {}
  const scores = {}
  for (const dim of profileData.value.dimensions) {
    const dObj = profileData.value.cohort.dimension[dim]
    scores[dim] = selectedMetric.value === 'accuracy'
      ? (dObj?.accuracyPct ?? dObj?.accuracy ?? dObj?.masteryPct ?? dObj?.pct ?? 0)
      : (dObj?.masteryPct ?? dObj?.pct ?? 0)
  }
  return scores
})

const filteredStudents = computed(() => {
  if (!profileData.value || !profileData.value.students) return []
  const q = cohortSearchQuery.value.trim().toLowerCase()
  let list = profileData.value.students
  if (q) {
    list = list.filter(
      (s) => (s.name || '').toLowerCase().includes(q) || (s.id || '').toLowerCase().includes(q)
    )
  }

  const col = cohortSortColumn.value
  const dir = cohortSortDirection.value === 'asc' ? 1 : -1

  return [...list].sort((a, b) => {
    switch (col) {
      case 'id':
        return dir * (a.id || '').localeCompare(b.id || '', undefined, { numeric: true, sensitivity: 'base' })
      case 'name':
        return dir * (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
      case 'score':
      case 'earned':
      case 'total': {
        const valA = a.earned ?? 0
        const valB = b.earned ?? 0
        return dir * (valA - valB)
      }
      case 'mastery':
      case 'masteryPct': {
        const valA = a.masteryPct ?? a.pct ?? 0
        const valB = b.masteryPct ?? b.pct ?? 0
        return dir * (valA - valB)
      }
      case 'accuracy':
      case 'accuracyPct': {
        const valA = a.accuracyPct ?? a.accuracy ?? 0
        const valB = b.accuracyPct ?? b.accuracy ?? 0
        return dir * (valA - valB)
      }
      case 'Recall':
      case 'Comprehend':
      case 'Solve':
      case 'Build':
      case 'Evaluate': {
        const valA = a.dimension?.[col]?.masteryPct ?? a.dimension?.[col]?.pct ?? 0
        const valB = b.dimension?.[col]?.masteryPct ?? b.dimension?.[col]?.pct ?? 0
        return dir * (valA - valB)
      }
      case 'weakest':
      case 'weakestDimension': {
        const valA = a.weakestDimension || a.weakest || ''
        const valB = b.weakestDimension || b.weakest || ''
        return dir * valA.localeCompare(valB)
      }
      default:
        return 0
    }
  })
})

// --- Paper Analysis Reactive State & Computed Properties ---
const overallDistributionBinMode = ref('percentage') // 'percentage' or 'raw'
const distributionBinMode = ref('percentage') // 'percentage' or 'raw'
const selectedDistributionDimension = ref('all') // 'all' or dimension name

// Question-Wise Solve Rate Analysis State
const solveRateFilter = ref('all')
const solveRateSort = ref('order')
const solveRateTypeFilter = ref('all')
const solveRateDimensionFilter = ref('all')

function getVerdictBadgeClass(verdictOrTone) {
  const v = String(verdictOrTone || '').toLowerCase()
  if (v.includes('very hard') || v.includes('very difficult') || v === 'danger') return 'badge-diff-veryhard'
  if (v.includes('hard') || v.includes('difficult') || v === 'warning') return 'badge-diff-hard'
  if (v.includes('balanced') || v === 'neutral') return 'badge-diff-balanced'
  if (v.includes('very easy') || v === 'info') return 'badge-diff-veryeasy'
  if (v.includes('easy') || v === 'success') return 'badge-diff-easy'
  return 'badge-diff-na'
}

const overallContestDistribution = computed(() => {
  if (!profileData.value || !profileData.value.cohort) return null
  let od = profileData.value.paperAnalysis?.overallDistribution

  if (!od && profileData.value.students?.length) {
    const totalExam = profileData.value.cohort.totalExam || profileData.value.cohort.total || 0
    const overallStudentPcts = profileData.value.students.map((s) => ({
      id: s.id,
      pct: s.masteryPct ?? s.pct ?? 0,
      earned: s.earned ?? 0,
    }))
    const stats = computeDistributionStats(overallStudentPcts.map((s) => s.pct))
    const rawStats = computeDistributionStats(overallStudentPcts.map((s) => s.earned))
    const verdictInfo = getDifficultyVerdict(stats.mean)
    od = {
      totalExamMarks: totalExam,
      totalStudents: profileData.value.students.length,
      meanPct: stats.mean,
      meanEarned: rawStats.mean,
      medianPct: stats.median,
      minPct: stats.min,
      maxPct: stats.max,
      stdDevPct: stats.stdDev,
      verdict: verdictInfo.text || verdictInfo.verdict,
      verdictTone: verdictInfo.badgeClass || verdictInfo.verdictTone,
      decileBins: computeDecileBins(overallStudentPcts, totalExam),
      rawMarkBins: computeRawMarkBins(overallStudentPcts, totalExam, { bins: 10 }),
    }
  }

  if (!od) return null

  const isPct = overallDistributionBinMode.value === 'percentage'
  const sourceBins = isPct ? od.decileBins : od.rawMarkBins
  const studentMap = new Map((profileData.value.students || []).map((s) => [String(s.id), s]))

  const bins = (sourceBins || []).map((b) => {
    const studentsInBin = (b.studentIds || []).map((id) => {
      const s = studentMap.get(String(id))
      return {
        id: String(id),
        name: s?.name || String(id),
        pct: s ? (s.masteryPct ?? s.pct ?? 0) : 0,
        earned: s ? (s.earned ?? 0) : 0
      }
    })

    return {
      binIndex: b.binIndex,
      label: b.label,
      minMarks: b.minMarks,
      maxMarks: b.maxMarks,
      minPct: b.minPct,
      maxPct: b.maxPct,
      count: b.count,
      cohortPct: b.percentage,
      students: studentsInBin
    }
  })

  return {
    totalExamMarks: od.totalExamMarks,
    totalStudents: od.totalStudents,
    meanPct: od.meanPct,
    meanEarned: od.meanEarned,
    medianPct: od.medianPct,
    minPct: od.minPct,
    maxPct: od.maxPct,
    stdDevPct: od.stdDevPct,
    verdict: od.verdict,
    verdictTone: od.verdictTone || od.tone,
    bins
  }
})

function getDifficultyVerdict(pct) {
  if (pct === null || pct === undefined || isNaN(pct)) {
    return { text: 'N/A', badgeClass: 'badge-diff-na' }
  }
  const val = Number(pct)
  if (val < 45) return { text: 'Very Difficult', badgeClass: 'badge-diff-veryhard' }
  if (val < 60) return { text: 'Difficult', badgeClass: 'badge-diff-hard' }
  if (val < 75) return { text: 'Balanced', badgeClass: 'badge-diff-balanced' }
  if (val < 88) return { text: 'Easy', badgeClass: 'badge-diff-easy' }
  return { text: 'Very Easy', badgeClass: 'badge-diff-veryeasy' }
}

function getMasteryBarColorClass(pct) {
  if (pct === null || pct === undefined || isNaN(pct)) return 'bar-tint-low'
  const val = Number(pct)
  if (val < 50) return 'bar-tint-low'
  if (val < 70) return 'bar-tint-mid'
  if (val < 85) return 'bar-tint-good'
  return 'bar-tint-high'
}

function getDistributionBarClass(dim) {
  const d = String(dim).toLowerCase()
  if (d.includes('recall')) return 'dist-bar-recall'
  if (d.includes('comprehend')) return 'dist-bar-comprehend'
  if (d.includes('solve')) return 'dist-bar-solve'
  if (d.includes('build')) return 'dist-bar-build'
  if (d.includes('evaluate')) return 'dist-bar-evaluate'
  return 'dist-bar-solve'
}

const paperOverallVerdict = computed(() => {
  if (!profileData.value || !profileData.value.cohort) {
    return { text: 'N/A', badgeClass: 'badge-diff-na' }
  }
  const pct = profileData.value.cohort.masteryPct ?? profileData.value.cohort.pct ?? 0
  return getDifficultyVerdict(pct)
})

const paperHardestDimension = computed(() => {
  if (!profileData.value || !profileData.value.dimensions?.length) {
    return { name: 'N/A', pct: 0 }
  }
  let minDim = profileData.value.dimensions[0]
  let minPct = profileData.value.cohort.dimension[minDim]?.masteryPct ?? 100
  for (const d of profileData.value.dimensions) {
    const p = profileData.value.cohort.dimension[d]?.masteryPct ?? 0
    if (p < minPct) {
      minPct = p
      minDim = d
    }
  }
  return { name: minDim, pct: Number(minPct.toFixed(1)) }
})

const paperEasiestDimension = computed(() => {
  if (!profileData.value || !profileData.value.dimensions?.length) {
    return { name: 'N/A', pct: 0 }
  }
  let maxDim = profileData.value.dimensions[0]
  let maxPct = profileData.value.cohort.dimension[maxDim]?.masteryPct ?? 0
  for (const d of profileData.value.dimensions) {
    const p = profileData.value.cohort.dimension[d]?.masteryPct ?? 0
    if (p > maxPct) {
      maxPct = p
      maxDim = d
    }
  }
  return { name: maxDim, pct: Number(maxPct.toFixed(1)) }
})

const paperHardestTier = computed(() => {
  if (!profileData.value) {
    return { tier: 'N/A', pct: 0, marks: 0, qCount: 0 }
  }
  const activeTiers = TIER_ORDER.filter(
    (t) => (profileData.value.cohort.difficulty[t]?.availableExam ?? 0) > 0
  )
  if (!activeTiers.length) {
    return { tier: 'N/A', pct: 0, marks: 0, qCount: 0 }
  }
  let hardest = activeTiers[0]
  let minPct = profileData.value.cohort.difficulty[hardest]?.masteryPct ?? 100
  for (const t of activeTiers) {
    const p = profileData.value.cohort.difficulty[t]?.masteryPct ?? 0
    if (p < minPct) {
      minPct = p
      hardest = t
    }
  }
  const diffObj = profileData.value.cohort.difficulty[hardest]
  const qs = currentQuestions.value.filter((q) => q.difficulty === hardest)
  return {
    tier: hardest,
    pct: Number(minPct.toFixed(1)),
    marks: diffObj?.availableExam ?? diffObj?.available ?? 0,
    qCount: qs.length
  }
})

const paperDimensionSkew = computed(() => {
  const maxP = paperEasiestDimension.value.pct
  const minP = paperHardestDimension.value.pct
  const spread = Number(Math.max(0, maxP - minP).toFixed(1))
  let label = 'Balanced (Even cognitive load)'
  if (spread >= 30) {
    label = 'High Skew (Significant gap between easy & hard dimensions)'
  } else if (spread >= 15) {
    label = 'Moderate Skew (Normal variation across skills)'
  }
  return { spread, label }
})

const difficultySpreadList = computed(() => {
  if (!profileData.value || !profileData.value.cohort) return []
  const N = profileData.value.students.length
  const totalExam = profileData.value.cohort.totalExam || profileData.value.cohort.total || 0

  let previousActiveTier = null

  return TIER_ORDER.map((diff) => {
    const label = diff.charAt(0).toUpperCase() + diff.slice(1)
    const qs = currentQuestions.value.filter((q) => q.difficulty === diff)
    const qCount = qs.length
    const availableMarks = qs.reduce((sum, q) => sum + (q.marks || 0), 0)
    const examPct = totalExam > 0 ? Number(((availableMarks / totalExam) * 100).toFixed(1)) : 0

    if (availableMarks === 0 || N === 0) {
      return {
        difficulty: diff,
        label,
        qCount: 0,
        availableMarks: 0,
        examPct: 0,
        masteryPct: 0,
        minPct: 0,
        maxPct: 0,
        statusText: 'No Questions',
        statusClass: 'status-neutral',
        description: `No questions assessed in the ${label} tier for this examination.`
      }
    }

    const studentPcts = profileData.value.students.map((s) => {
      return s.difficulties?.[diff]?.masteryPct ?? s.difficulty?.[diff]?.masteryPct ?? 0
    })

    const cohortEarned = profileData.value.cohort.difficulty[diff]?.earned ?? 0
    const masteryPct = Number(((cohortEarned / availableMarks) * 100).toFixed(1))
    const minPct = studentPcts.length ? Number(Math.min(...studentPcts).toFixed(1)) : 0
    const maxPct = studentPcts.length ? Number(Math.max(...studentPcts).toFixed(1)) : 0

    let statusText = 'Aligned'
    let statusClass = 'status-success'
    let description = previousActiveTier !== null
      ? `Normal cognitive progression: cohort scored ${masteryPct}% mastery across ${qCount} questions (stepped down from ${previousActiveTier.label} tier's ${previousActiveTier.masteryPct}%).`
      : `Baseline cognitive tier: cohort achieved ${masteryPct}% mastery across ${qCount} questions (range: ${minPct}%–${maxPct}%).`

    // Check for inversion against previous tier
    if (previousActiveTier !== null && masteryPct > previousActiveTier.masteryPct + 2) {
      statusText = 'Inversion Anomaly'
      statusClass = 'status-warning'
      description = `Inversion anomaly: ${label} mastery (${masteryPct}%) exceeds easier ${previousActiveTier.label} tier (${previousActiveTier.masteryPct}%), indicating potential rubric miscalibration, ambiguous phrasing, or non-discriminating distractors.`
    }

    previousActiveTier = { label, masteryPct }

    return {
      difficulty: diff,
      label,
      qCount,
      availableMarks,
      examPct,
      masteryPct,
      minPct,
      maxPct,
      statusText,
      statusClass,
      description
    }
  })
})

const difficultyAnomalies = computed(() => {
  const anomalies = []
  const activeTiers = difficultySpreadList.value.filter((t) => t.availableMarks > 0)
  for (let i = 0; i < activeTiers.length - 1; i++) {
    const current = activeTiers[i]
    const next = activeTiers[i + 1]
    if (current.masteryPct < next.masteryPct) {
      anomalies.push(
        `${current.label} (${current.masteryPct}% mastery) performed worse than the harder ${next.label} tier (${next.masteryPct}% mastery). Review ${current.label} questions for ambiguity or misclassification.`
      )
    }
  }
  return anomalies
})

const paperDiagnosticInsights = computed(() => {
  if (!profileData.value || !profileData.value.cohort) return []
  const insights = []
  const cohort = profileData.value.cohort
  const cohortPct = cohort.masteryPct ?? 0
  const students = profileData.value.students || []
  const studentsCount = students.length

  if (studentsCount === 0) return []

  // 1. Actual Cohort Performance, Pass and Distinction Rates
  const passStudents = students.filter((s) => (s.masteryPct ?? s.pct ?? 0) >= 50)
  const passRate = ((passStudents.length / studentsCount) * 100).toFixed(1)
  const distinctionStudents = students.filter((s) => (s.masteryPct ?? s.pct ?? 0) >= 75)
  const distinctionRate = ((distinctionStudents.length / studentsCount) * 100).toFixed(1)

  const allMasteryScores = students.map((s) => s.masteryPct ?? s.pct ?? 0).sort((a, b) => a - b)
  const medianScore = allMasteryScores.length % 2 === 0
    ? ((allMasteryScores[allMasteryScores.length / 2 - 1] + allMasteryScores[allMasteryScores.length / 2]) / 2).toFixed(1)
    : allMasteryScores[Math.floor(allMasteryScores.length / 2)].toFixed(1)

  insights.push(
    `<strong>Cohort Performance &amp; Caliber:</strong> Paper difficulty is rated as <strong>${paperOverallVerdict.value.text}</strong> with a cohort mean mastery of <strong>${cohortPct}%</strong> (median <strong>${medianScore}%</strong>) across ${studentsCount} candidates. <strong>${passRate}%</strong> (${passStudents.length}/${studentsCount}) met the passing threshold (&ge;50%), with <strong>${distinctionRate}%</strong> (${distinctionStudents.length}/${studentsCount}) achieving distinction (&ge;75%).`
  )

  // 2. Cognitive Dimension Bottlenecks (<50% scores and count of struggling students)
  const dimensionStruggles = []
  for (const d of profileData.value.dimensions) {
    const strugglingStudents = students.filter((s) => {
      const p = s.dimension?.[d]?.masteryPct ?? s.dimensions?.[d]?.masteryPct ?? s.dimension?.[d]?.pct ?? 0
      return p < 50
    })
    const lowCount = strugglingStudents.length
    const dimMastery = cohort.dimension?.[d]?.masteryPct ?? cohort.dimensions?.[d]?.masteryPct ?? cohort.dimension?.[d]?.pct ?? 0
    if (lowCount > 0) {
      const lowPct = ((lowCount / studentsCount) * 100).toFixed(1)
      dimensionStruggles.push({ dim: d, count: lowCount, pct: lowPct, dimMastery })
    }
  }

  if (dimensionStruggles.length) {
    dimensionStruggles.sort((a, b) => b.count - a.count)
    const topStruggle = dimensionStruggles[0]
    let struggleDetail = `<strong>Cognitive Dimension Bottleneck:</strong> <strong>${topStruggle.dim}</strong> represents the primary cognitive barrier, with <strong>${topStruggle.count} of ${studentsCount} students (${topStruggle.pct}%)</strong> scoring under 50% mastery (dimension cohort average: ${topStruggle.dimMastery}%).`
    if (dimensionStruggles.length > 1) {
      const secondaryStruggles = dimensionStruggles.slice(1).map((s) => `${s.dim} (${s.count} students, ${s.pct}%)`).join(', ')
      struggleDetail += ` Secondary bottlenecks observed in ${secondaryStruggles}.`
    }
    insights.push(struggleDetail)
  } else {
    insights.push(
      `<strong>Cognitive Dimension Resilience:</strong> Zero students scored below 50% in any individual dimension; the lowest cohort dimension was <strong>${paperHardestDimension.value.name}</strong> at a resilient <strong>${paperHardestDimension.value.pct}%</strong> mastery.`
    )
  }

  // 3. Progression Staircases / Anomalies
  if (difficultyAnomalies.value.length) {
    insights.push(
      `<strong>⚠️ Progression Inversion Anomaly:</strong> ${difficultyAnomalies.value.join(' ')} This points to potential rubric ambiguity or non-discriminating distractors in the supposedly easier tier questions.`
    )
  } else {
    const activeTiers = difficultySpreadList.value.filter((t) => t.availableMarks > 0)
    if (activeTiers.length > 1) {
      const staircase = activeTiers.map((t) => `<strong>${t.label}</strong> (${t.masteryPct}%)`).join(' &rarr; ')
      insights.push(
        `<strong>Difficulty Progression Staircase:</strong> Cohort mastery descends smoothly across cognitive difficulty tiers (${staircase}), with <strong>${paperHardestTier.value.tier.toUpperCase()}</strong> tier demanding the highest effort (${paperHardestTier.value.pct}% mastery across ${paperHardestTier.value.qCount} questions).`
      )
    } else if (paperHardestTier.value.tier !== 'N/A') {
      insights.push(
        `<strong>Difficulty Tier Assessment:</strong> Questions were concentrated in <strong>${paperHardestTier.value.tier.toUpperCase()}</strong> tier with ${paperHardestTier.value.pct}% cohort mastery across ${paperHardestTier.value.qCount} questions.`
      )
    }
  }

  // 4. Cognitive Spread Between Dimensions
  insights.push(
    `<strong>Cognitive Dispersion:</strong> <strong>${paperEasiestDimension.value.name}</strong> yielded highest proficiency (${paperEasiestDimension.value.pct}%) versus <strong>${paperHardestDimension.value.name}</strong> (${paperHardestDimension.value.pct}%), generating a <strong>${paperDimensionSkew.value.spread}%</strong> cognitive spread (<strong>${paperDimensionSkew.value.label}</strong>).`
  )

  // 5. Question Solve Rate Surprises (|deviation| >= 20%)
  if (questionSolveRateData.value) {
    const qData = questionSolveRateData.value
    const alerts = qData.highDeviationAlerts || []
    if (alerts.length > 0) {
      const topMismatches = [...alerts]
        .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
        .slice(0, 3)
        .map((q) => `<strong>${q.id}</strong> (${q.deviation > 0 ? '+' : ''}${q.deviation}% dev, act ${q.actualSolveRate}% vs exp ${q.expectedSolveRate}%)`)
        .join(', ')

      insights.push(
        `<strong>Solve Rate Surprise Alerts (|dev| &ge; 20%):</strong> <strong>${alerts.length} question${alerts.length > 1 ? 's' : ''}</strong> significantly diverged from instructor expectations. Key surprises: ${topMismatches}. Targeted review of distractor effectiveness and prerequisite clarity recommended.`
      )
    } else {
      insights.push(
        `<strong>Instructor Expectation Calibration:</strong> Exceptional calibration with 0 questions exceeding the &plusmn;20% deviation threshold (overall cohort alignment rate: <strong>${qData.alignmentRate}%</strong> with ${qData.avgAbsDeviation}% average absolute deviation).`
      )
    }
  }

  // 6. Topic Disparities
  if (profileData.value.topics && profileData.value.topics.length > 1) {
    const topicStats = profileData.value.topics.map((t) => {
      const tObj = cohort.topics?.[t] || cohort.topic?.[t]
      return {
        topic: t,
        masteryPct: tObj?.masteryPct ?? 0,
        earned: tObj?.earned ?? 0,
        available: tObj?.availableExam ?? 0
      }
    }).sort((a, b) => b.masteryPct - a.masteryPct)

    const topTopic = topicStats[0]
    const bottomTopic = topicStats[topicStats.length - 1]
    const topicSpread = Number((topTopic.masteryPct - bottomTopic.masteryPct).toFixed(1))

    if (topicSpread > 0) {
      insights.push(
        `<strong>Curricular Topic Disparities:</strong> Cohort showed highest mastery in <strong>${topTopic.topic}</strong> (<strong>${topTopic.masteryPct}%</strong>) and lowest in <strong>${bottomTopic.topic}</strong> (<strong>${bottomTopic.masteryPct}%</strong>), revealing a <strong>${topicSpread}%</strong> curricular gap across subject domains.`
      )
    } else {
      insights.push(
        `<strong>Uniform Topic Performance:</strong> Uniform mastery of <strong>${topTopic.masteryPct}%</strong> observed across all assessed topics (${profileData.value.topics.join(', ')}).`
      )
    }
  } else if (profileData.value.topics && profileData.value.topics.length === 1) {
    const singleTopic = profileData.value.topics[0]
    const tObj = cohort.topics?.[singleTopic] || cohort.topic?.[singleTopic]
    const topPct = tObj?.masteryPct ?? cohortPct
    insights.push(
      `<strong>Curricular Topic Scope:</strong> Assessment evaluated topic <strong>${singleTopic}</strong> with a cohort mastery level of <strong>${topPct}%</strong>.`
    )
  }

  return insights
})

const allDimensionDistributions = computed(() => {
  if (!profileData.value || !profileData.value.cohort) return []
  const N = profileData.value.students.length
  if (N === 0) return []

  const isPct = distributionBinMode.value === 'percentage'

  return profileData.value.dimensions.map((dim) => {
    const dimObj = profileData.value.cohort.dimension[dim]
    const availMarks = dimObj?.availableExam ?? dimObj?.available ?? 0

    // Extract student scores for this dimension
    const studentScores = profileData.value.students.map((s) => {
      const earned = s.dimension[dim]?.earned ?? 0
      const pct = s.dimension[dim]?.masteryPct ?? 0
      return { id: s.id, name: s.name, earned, pct }
    })

    const pcts = studentScores.map((s) => s.pct)
    const meanPct = Number((pcts.reduce((a, b) => a + b, 0) / N).toFixed(1))

    // Median
    const sortedPcts = [...pcts].sort((a, b) => a - b)
    const mid = Math.floor(N / 2)
    const medianPct = N % 2 !== 0
      ? Number(sortedPcts[mid].toFixed(1))
      : Number(((sortedPcts[mid - 1] + sortedPcts[mid]) / 2).toFixed(1))

    // Standard deviation
    const variance = pcts.reduce((acc, p) => acc + Math.pow(p - meanPct, 2), 0) / N
    const stdDevPct = Number(Math.sqrt(variance).toFixed(1))

    // Verdict for this dimension
    const verdict = getDifficultyVerdict(meanPct)

    // Build 10 bins
    const bins = []
    if (isPct) {
      for (let i = 0; i < 10; i++) {
        const start = i * 10
        const end = (i + 1) * 10
        const label = `${start}% – ${end}%`
        const inBin = studentScores.filter((st) => {
          if (i === 9) {
            return st.pct >= start && st.pct <= end
          }
          return st.pct >= start && st.pct < end
        })
        bins.push({
          label,
          students: inBin,
          count: inBin.length,
          cohortPct: Number(((inBin.length / N) * 100).toFixed(1))
        })
      }
    } else {
      // Raw Marks Bins (10 intervals of available marks)
      const step = availMarks > 0 ? availMarks / 10 : 1
      for (let i = 0; i < 10; i++) {
        const start = Number((i * step).toFixed(1))
        const end = i === 9 ? availMarks : Number(((i + 1) * step).toFixed(1))
        const label = `${start} – ${end} pts`
        const inBin = studentScores.filter((st) => {
          if (i === 9) {
            return st.earned >= start && st.earned <= (end + 0.0001)
          }
          return st.earned >= start && st.earned < end
        })
        bins.push({
          label,
          students: inBin,
          count: inBin.length,
          cohortPct: Number(((inBin.length / N) * 100).toFixed(1))
        })
      }
    }

    return {
      dimension: dim,
      availableMarks: availMarks,
      meanPct,
      medianPct,
      stdDevPct,
      verdict,
      bins
    }
  })
})

const filteredDimensionDistributions = computed(() => {
  if (selectedDistributionDimension.value === 'all') {
    return allDimensionDistributions.value
  }
  return allDimensionDistributions.value.filter(
    (d) => d.dimension === selectedDistributionDimension.value
  )
})

const crossMatrixHeaders = computed(() => {
  return TIER_ORDER.map((t) => ({
    key: t,
    label: t.charAt(0).toUpperCase() + t.slice(1)
  }))
})

const crossMatrixRows = computed(() => {
  if (!profileData.value || !profileData.value.cohort) return []
  const N = profileData.value.students.length

  return profileData.value.dimensions.map((dim) => {
    let dimAvailSum = 0
    let dimEarnedSum = 0
    const dimQuestionsSet = new Set()

    const cells = TIER_ORDER.map((diff) => {
      const matchingQs = currentQuestions.value.filter(
        (q) => q.difficulty === diff && q.dimensions.includes(dim)
      )
      const qCount = matchingQs.length
      matchingQs.forEach((q) => dimQuestionsSet.add(q.id))

      let cellAvail = 0
      let cellEarnedTotal = 0

      for (const q of matchingQs) {
        const K = q.dimensions.length || 1
        const dAvail = q.dimensionMarks?.[dim] ?? (q.marks / K)
        cellAvail += dAvail

        for (const st of profileData.value.students) {
          const sc = currentScores.value[st.id]?.[q.id] ?? 0
          cellEarnedTotal += sc * (1 / K)
        }
      }

      cellAvail = Number(cellAvail.toFixed(1))
      dimAvailSum += cellAvail

      const cohortCellEarned = N > 0 ? cellEarnedTotal / N : 0
      dimEarnedSum += cohortCellEarned

      const masteryPct = cellAvail > 0
        ? Number(((cohortCellEarned / cellAvail) * 100).toFixed(1))
        : null

      let tintClass = 'matrix-cell-empty'
      if (cellAvail > 0) {
        if (masteryPct < 50) tintClass = 'cell-tint-low'
        else if (masteryPct < 70) tintClass = 'cell-tint-mid'
        else if (masteryPct < 85) tintClass = 'cell-tint-good'
        else tintClass = 'cell-tint-high'
      }

      const diffLabel = diff.charAt(0).toUpperCase() + diff.slice(1)
      const tooltip = cellAvail > 0
        ? `${dim} × ${diffLabel}: avg ${cohortCellEarned.toFixed(1)} / ${cellAvail} pts (${masteryPct}% mastery) across ${qCount} question${qCount === 1 ? '' : 's'}`
        : `No questions assessed for ${dim} at ${diffLabel} tier`

      return {
        difficulty: diff,
        qCount,
        availMarks: cellAvail,
        cohortEarned: Number(cohortCellEarned.toFixed(1)),
        masteryPct,
        tintClass,
        tooltip
      }
    })

    const dimMastery = dimAvailSum > 0
      ? Number(((dimEarnedSum / dimAvailSum) * 100).toFixed(1))
      : 0

    const rowTooltip = `${dim} Total: avg ${dimEarnedSum.toFixed(1)} / ${dimAvailSum.toFixed(1)} pts (${dimMastery}% mastery) across ${dimQuestionsSet.size} question${dimQuestionsSet.size === 1 ? '' : 's'}`

    return {
      dimension: dim,
      cells,
      totalMarks: Number(dimAvailSum.toFixed(1)),
      totalQs: dimQuestionsSet.size,
      cohortEarned: Number(dimEarnedSum.toFixed(1)),
      masteryPct: dimMastery,
      tooltip: rowTooltip
    }
  })
})

const crossMatrixColTotals = computed(() => {
  if (!profileData.value || !profileData.value.cohort) return []
  return TIER_ORDER.map((diff) => {
    const qs = currentQuestions.value.filter((q) => q.difficulty === diff)
    const qCount = qs.length
    const availMarks = qs.reduce((sum, q) => sum + (q.marks || 0), 0)
    const cohortEarned = profileData.value.cohort.difficulty[diff]?.earned ?? 0
    const masteryPct = availMarks > 0
      ? Number(((cohortEarned / availMarks) * 100).toFixed(1))
      : null

    const diffLabel = diff.charAt(0).toUpperCase() + diff.slice(1)
    const tooltip = availMarks > 0
      ? `${diffLabel} Tier Total: avg ${Number(cohortEarned.toFixed(1))} / ${Number(availMarks.toFixed(1))} pts (${masteryPct}% mastery) across ${qCount} question${qCount === 1 ? '' : 's'}`
      : `No questions assessed in the ${diffLabel} tier`

    return {
      difficulty: diff,
      qCount,
      availMarks: Number(availMarks.toFixed(1)),
      cohortEarned: Number(cohortEarned.toFixed(1)),
      masteryPct,
      tooltip
    }
  })
})

const crossMatrixGrandTotal = computed(() => {
  if (!profileData.value || !profileData.value.cohort) {
    return { totalMarks: 0, totalQs: 0, cohortEarned: 0, masteryPct: 0, tooltip: 'No examination loaded' }
  }
  const totalMarks = profileData.value.cohort.totalExam || profileData.value.cohort.total || 0
  const totalQs = currentQuestions.value.length
  const cohortEarned = Number((profileData.value.cohort.earned ?? 0).toFixed(1))
  const masteryPct = profileData.value.cohort.masteryPct ?? 0
  const tooltip = `Exam Grand Total: avg ${cohortEarned} / ${Number(totalMarks.toFixed(1))} pts (${masteryPct}% mastery) across ${totalQs} questions`

  return {
    totalMarks: Number(totalMarks.toFixed(1)),
    totalQs,
    cohortEarned,
    masteryPct,
    tooltip
  }
})

// Question-Wise Solve Rate & Instructor Expectations Validation
const questionSolveRateData = computed(() => {
  if (profileData.value?.paperAnalysis?.questionSolveRates) {
    return profileData.value.paperAnalysis.questionSolveRates
  }
  if (currentQuestions.value.length && (profileData.value?.students?.length || Object.keys(currentScores.value).length)) {
    return computeQuestionSolveRates(
      currentQuestions.value,
      currentScores.value,
      profileData.value?.students || []
    )
  }
  return null
})

const availableSolveRateQuestionTypes = computed(() => {
  if (!currentQuestions.value.length) return []
  const types = new Set(currentQuestions.value.map((q) => q.type || 'MCQ'))
  return Array.from(types).sort()
})

const filteredSortedSolveRateQuestions = computed(() => {
  if (!questionSolveRateData.value?.questions) return []
  let list = [...questionSolveRateData.value.questions]

  // Filter dropdown
  if (solveRateFilter.value === 'underperformed') {
    list = list.filter((q) => q.alignment === 'much-harder')
  } else if (solveRateFilter.value === 'aligned') {
    list = list.filter((q) => q.alignment === 'on-target')
  } else if (solveRateFilter.value === 'overperformed') {
    list = list.filter((q) => q.alignment === 'much-easier')
  } else if (solveRateFilter.value === 'high_deviation') {
    list = list.filter((q) => q.isHighDeviation)
  }

  // Type filter
  if (solveRateTypeFilter.value !== 'all') {
    list = list.filter((q) => (q.type || '').toLowerCase() === solveRateTypeFilter.value.toLowerCase())
  }

  // Dimension filter
  if (solveRateDimensionFilter.value !== 'all') {
    list = list.filter((q) => (q.dimensions || []).includes(solveRateDimensionFilter.value))
  }

  // Sort dropdown
  if (solveRateSort.value === 'abs_mismatch') {
    list.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
  } else if (solveRateSort.value === 'hardest') {
    list.sort((a, b) => a.deviation - b.deviation)
  } else if (solveRateSort.value === 'easiest') {
    list.sort((a, b) => b.deviation - a.deviation)
  } else if (solveRateSort.value === 'lowest_actual') {
    list.sort((a, b) => a.actualSolveRate - b.actualSolveRate)
  } else if (solveRateSort.value === 'highest_actual') {
    list.sort((a, b) => b.actualSolveRate - a.actualSolveRate)
  }

  return list
})

function getDeviationBadgeClass(dev) {
  if (dev >= 5) return 'badge-dev-pos'
  if (dev <= -5) return 'badge-dev-neg'
  return 'badge-dev-zero'
}

function getActualBarColorClass(dev) {
  if (dev < -15) return 'act-bar-hard'
  if (dev > 15) return 'act-bar-easy'
  return 'act-bar-aligned'
}

// ============================================================
// Expectations vs. Reality Simulation State & Computed Properties
// ============================================================
const simulationBinMode = ref('percentage') // 'percentage' or 'raw'
const simulationSeed = ref(20261015)

function rerunSimulation() {
  simulationSeed.value += 1
}

function getGapBadgeClass(gap) {
  if (gap === null || gap === undefined) return 'badge-gap-aligned'
  if (gap < -15) return 'badge-deficit-severe'
  if (gap < -5) return 'badge-deficit-moderate'
  if (gap > 5) return 'badge-surplus'
  return 'badge-gap-aligned'
}

const simulationData = computed(() => {
  if (!profileData.value) return null
  const questions = currentQuestions.value || []
  const scores = currentScores.value || {}
  const students = profileData.value.students || []
  const cohort = profileData.value.cohort
  const paperAnalysis = profileData.value.paperAnalysis

  if (simulationSeed.value === 20261015 && paperAnalysis?.expectedSimulation) {
    return paperAnalysis.expectedSimulation
  }

  const cohortInfo = cohort
    ? {
        meanPct: cohort.meanPct ?? cohort.masteryPct ?? 0,
        medianPct: cohort.medianPct ?? 0,
        dimensions: paperAnalysis?.dimensions || cohort.dimensions || cohort.dimension || {},
        decileBins: paperAnalysis?.decileBins || [],
      }
    : null

  return simulateExpectedCohort(questions, scores, students, cohortInfo, {
    seed: simulationSeed.value,
    cohortSize: students.length || 300,
  })
})

const simulationComparisonBins = computed(() => {
  if (!simulationData.value) return []
  if (simulationBinMode.value === 'percentage') {
    return simulationData.value.comparisonBins || []
  }

  // Raw mark bins comparison
  const expRaw = simulationData.value.expectedRawMarkBins || []
  const actRaw = profileData.value?.paperAnalysis?.rawMarkBins || overallContestDistribution.value?.rawMarkBins || []
  return expRaw.map((eb) => {
    const ab = actRaw.find((b) => b.label === eb.label)
    const actualCount = ab?.count ?? 0
    const actualPct = ab?.cohortPct ?? ab?.percentage ?? 0
    const deltaPct = Math.round((actualPct - eb.percentage) * 100) / 100
    return {
      label: eb.label,
      minMark: eb.minMark,
      maxMark: eb.maxMark,
      expectedCount: eb.count,
      expectedPct: eb.percentage,
      actualCount,
      actualPct,
      deltaPct,
    }
  })
})

const RCSBE_ORDER = ['Recall', 'Comprehend', 'Solve', 'Build', 'Evaluate']
const simulationDimensionGaps = computed(() => {
  if (!simulationData.value?.dimensionGaps) return []
  const gaps = simulationData.value.dimensionGaps
  return RCSBE_ORDER.filter((d) => gaps[d]).map((d) => gaps[d])
})

const simulationTopicGaps = computed(() => {
  if (!simulationData.value?.topicGaps) return []
  return Object.values(simulationData.value.topicGaps).sort((a, b) => {
    const gapA = a.gap ?? 0
    const gapB = b.gap ?? 0
    return gapA - gapB
  })
})

const primaryDeficitDimension = computed(() => {
  const gaps = simulationDimensionGaps.value
  if (!gaps.length) return null
  const sorted = [...gaps].sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0))
  return sorted[0]
})

const calibrationScore = computed(() => {
  if (!simulationData.value?.overallGap) return 0
  const divergence = simulationData.value.overallGap.divergenceScore ?? 0
  return Math.max(0, Math.round((100 - divergence) * 10) / 10)
})

// Student Deep Dive computed properties
const selectedStudent = computed(() => {
  if (!profileData.value || !selectedStudentId.value) return null
  return profileData.value.students.find((s) => s.id === selectedStudentId.value) || profileData.value.students[0]
})

const studentDimensionScores = computed(() => {
  if (!selectedStudent.value) return {}
  const scores = {}
  for (const dim of profileData.value.dimensions) {
    const dObj = selectedStudent.value.dimension[dim]
    scores[dim] = selectedMetric.value === 'accuracy'
      ? (dObj?.accuracyPct ?? dObj?.accuracy ?? dObj?.masteryPct ?? dObj?.pct ?? 0)
      : (dObj?.masteryPct ?? dObj?.pct ?? 0)
  }
  return scores
})

function getStudentDimensionStatus(dim) {
  if (!selectedStudent.value) return 'average'
  return selectedStudent.value.dimension?.[dim]?.status || selectedStudent.value.dimensions?.[dim]?.status || 'average'
}

function getStudentCohortComparison(dim) {
  if (!selectedStudent.value || !profileData.value?.cohort) {
    return { cohortPct: 0, delta: 0, deltaText: '0.0% vs Cohort' }
  }
  const cohortMastery = profileData.value.cohort.dimension?.[dim]?.masteryPct ?? profileData.value.cohort.dimensions?.[dim]?.masteryPct ?? profileData.value.cohort.dimension?.[dim]?.pct ?? 0
  const studentMastery = selectedStudent.value.dimension?.[dim]?.masteryPct ?? selectedStudent.value.dimensions?.[dim]?.masteryPct ?? selectedStudent.value.dimension?.[dim]?.pct ?? 0
  const delta = Number((studentMastery - cohortMastery).toFixed(1))
  const sign = delta > 0 ? '+' : ''
  return {
    cohortPct: cohortMastery,
    delta,
    deltaText: `${sign}${delta}% vs Cohort`
  }
}

function getStudentDimensionMastery(dim) {
  if (!selectedStudent.value) return 0
  return selectedStudent.value.dimension?.[dim]?.masteryPct ?? selectedStudent.value.dimensions?.[dim]?.masteryPct ?? selectedStudent.value.dimension?.[dim]?.pct ?? 0
}

function getStudentDimensionHighlightTooltip(dim, type) {
  if (!selectedStudent.value || !profileData.value?.cohort) return ''
  const sPct = getStudentDimensionMastery(dim)
  const cPct = profileData.value.cohort.dimension?.[dim]?.masteryPct ?? profileData.value.cohort.dimensions?.[dim]?.masteryPct ?? profileData.value.cohort.dimension?.[dim]?.pct ?? 0
  const delta = Number((sPct - cPct).toFixed(1))
  const sign = delta > 0 ? '+' : ''
  if (type === 'strong') {
    return `${dim}: ${sPct}% mastery meets strong criteria (≥80% mastery threshold and ${sign}${delta} pp above cohort benchmark of ${cPct}%)`
  }
  if (type === 'weak') {
    return `${dim}: ${sPct}% mastery meets weak criteria (<50% mastery threshold and ${delta} pp below cohort benchmark of ${cPct}%)`
  }
  if (type === 'average') {
    return `${dim}: ${sPct}% mastery is classified as average (within ±15% of cohort benchmark ${cPct}%: ${sign}${delta} pp)`
  }
  if (type === 'strongest') {
    return `Strongest dimension: ${dim} (${sPct}% mastery, cohort benchmark: ${cPct}%)`
  }
  if (type === 'weakest') {
    return `Weakest dimension: ${dim} (${sPct}% mastery, cohort benchmark: ${cPct}%)`
  }
  return `${dim}: ${sPct}% mastery vs cohort ${cPct}%`
}

const historyStudentOptions = computed(() => {
  if (profileData.value && profileData.value.students.length) {
    return profileData.value.students.map((s) => ({ id: s.id, name: s.name }))
  }
  return []
})

const currentHistoryStudentName = computed(() => {
  if (!historyStudentId.value) return 'Student'
  const found = historyStudentOptions.value.find((s) => s.id === historyStudentId.value)
  return found ? `${found.name} (${found.id})` : historyStudentId.value
})

// File upload handler
async function handleFileUpload(event, type) {
  const file = event.target.files[0]
  if (!file) return

  try {
    const result = await parseCsv(file)
    if (type === 'questions') {
      rawQuestions.value = result.data
    } else if (type === 'scores') {
      rawScores.value = result.data
      rawScoreFields.value = result.meta.fields || []
    } else if (type === 'details') {
      rawDetails.value = result.data
    }
  } catch (err) {
    console.error(`Error parsing ${type} CSV:`, err)
    alert(`Failed to parse CSV file: ${err.message || err}`)
  }
}

// Load Sample Data
async function handleLoadSampleData() {
  let questionsCsv = SAMPLE_QUESTIONS_CSV
  let studentsCsv = SAMPLE_STUDENTS_CSV
  let scoresCsv = SAMPLE_SCORES_CSV

  // Attempt to fetch from backend /api/samples first
  try {
    const res = await fetch('/api/samples')
    if (res.ok) {
      const data = await res.json()
      if (data.examConfig || data.exam_config || data.questionsCsv) {
        questionsCsv = data.examConfig || data.exam_config || data.questionsCsv
      }
      if (data.students || data.students_sample || data.studentsCsv) {
        studentsCsv = data.students || data.students_sample || data.studentsCsv
      }
      if (data.studentScores || data.student_scores || data.scoresCsv) {
        scoresCsv = data.studentScores || data.student_scores || data.scoresCsv
      }
    }
  } catch {
    console.log('Backend /api/samples offline, using local sample strings')
  }

  // Parse questions
  const qParsed = await parseCsv(questionsCsv)
  const { questions, warnings: qWarnings } = readQuestions(qParsed.data)

  // Parse students details
  const dParsed = await parseCsv(studentsCsv)
  const studentDetailsRes = readStudentDetails(dParsed.data)
  const studentDetails = studentDetailsRes.students || studentDetailsRes

  // Parse scores
  const sParsed = await parseCsv(scoresCsv)
  const { scores, attempts, warnings: sWarnings } = readScores(
    sParsed.data,
    sParsed.meta.fields || [],
    questions
  )

  // Store in reactive state
  currentQuestions.value = questions
  currentScores.value = scores
  currentAttempts.value = attempts || {}
  currentStudentDetails.value = studentDetails
  currentWarnings.value = [...(qWarnings || []), ...(sWarnings || [])]

  form.value.courseName = 'CS101 - Algorithms & Data Structures'
  form.value.examTitle = 'Midterm Exam 2026'
  form.value.examDate = '2026-09-30'

  // Build profile
  const result = buildProfiles(questions, scores, studentDetails)
  profileData.value = result
  sampleLoaded.value = true

  activeExamInfo.value = {
    courseName: form.value.courseName,
    examTitle: form.value.examTitle,
    examDate: form.value.examDate
  }

  if (result.students.length) {
    selectedStudentId.value = result.students[0].id
    historyStudentId.value = result.students[0].id
    fetchStudentHistory(result.students[0].id)
  }
}

// Load 300-Student Contest Data (Monte Carlo generated)
async function handleLoadContestData() {
  let questionsCsv = CONTEST_QUESTIONS_CSV
  let studentsCsv = CONTEST_STUDENTS_CSV
  let scoresCsv = CONTEST_SCORES_CSV

  // Attempt to fetch from backend /api/samples first if available
  try {
    const res = await fetch('/api/samples')
    if (res.ok) {
      const data = await res.json()
      if (data.contestExamConfig || data.contest_exam_config) {
        questionsCsv = data.contestExamConfig || data.contest_exam_config
      }
      if (data.contestStudents || data.contest_students) {
        studentsCsv = data.contestStudents || data.contest_students
      }
      if (data.contestStudentScores || data.contest_student_scores) {
        scoresCsv = data.contestStudentScores || data.contest_student_scores
      }
    }
  } catch {
    console.log('Backend /api/samples offline, using local contest CSV strings')
  }

  // Parse questions
  const qParsed = await parseCsv(questionsCsv)
  const { questions, warnings: qWarnings } = readQuestions(qParsed.data)

  // Parse students details
  const dParsed = await parseCsv(studentsCsv)
  const studentDetailsRes = readStudentDetails(dParsed.data)
  const studentDetails = studentDetailsRes.students || studentDetailsRes

  // Parse scores
  const sParsed = await parseCsv(scoresCsv)
  const { scores, attempts, warnings: sWarnings } = readScores(
    sParsed.data,
    sParsed.meta.fields || [],
    questions
  )

  // Store in reactive state
  currentQuestions.value = questions
  currentScores.value = scores
  currentAttempts.value = attempts || {}
  currentStudentDetails.value = studentDetails
  currentWarnings.value = [...(qWarnings || []), ...(sWarnings || [])]

  form.value.courseName = 'CS201 - Advanced Data Structures & Algorithms'
  form.value.examTitle = 'Grand Semester Coding Contest 2026'
  form.value.examDate = '2026-10-15'

  // Build profile
  const result = buildProfiles(questions, scores, studentDetails)
  profileData.value = result
  sampleLoaded.value = true

  activeExamInfo.value = {
    courseName: form.value.courseName,
    examTitle: form.value.examTitle,
    examDate: form.value.examDate
  }

  if (result.students.length) {
    selectedStudentId.value = result.students[0].id
    historyStudentId.value = result.students[0].id
    fetchStudentHistory(result.students[0].id)
  }
}


// Analyze & Save Exam
async function handleAnalyzeAndSave() {
  isAnalyzing.value = true
  try {
    let questions = currentQuestions.value
    let scores = currentScores.value
    let attempts = currentAttempts.value
    let studentDetails = currentStudentDetails.value
    let allWarnings = [...currentWarnings.value]

    // If custom files were uploaded, process them
    if (rawQuestions.value.length) {
      const qRes = readQuestions(rawQuestions.value)
      questions = qRes.questions
      allWarnings.push(...(qRes.warnings || []))
    }

    if (rawDetails.value.length) {
      const dRes = readStudentDetails(rawDetails.value)
      studentDetails = dRes.students || dRes
    }

    if (rawScores.value.length) {
      const sRes = readScores(rawScores.value, rawScoreFields.value, questions)
      scores = sRes.scores
      attempts = sRes.attempts || {}
      allWarnings.push(...(sRes.warnings || []))
    }

    if (!questions.length || !Object.keys(scores).length) {
      alert('Please provide both exam configuration and student scores (or load sample data).')
      isAnalyzing.value = false
      return
    }

    currentQuestions.value = questions
    currentScores.value = scores
    currentAttempts.value = attempts
    currentStudentDetails.value = studentDetails
    currentWarnings.value = allWarnings

    // Compute profile
    const result = buildProfiles(questions, scores, studentDetails)
    profileData.value = result

    activeExamInfo.value = {
      courseName: form.value.courseName,
      examTitle: form.value.examTitle,
      examDate: form.value.examDate
    }

    if (result.students.length) {
      selectedStudentId.value = result.students[0].id
      historyStudentId.value = result.students[0].id
      fetchStudentHistory(result.students[0].id)
    }

    // Save payload to backend and local storage
    const examPayload = {
      id: `exam-${Date.now()}`,
      courseName: form.value.courseName,
      examTitle: form.value.examTitle,
      examDate: form.value.examDate,
      questionsCount: questions.length,
      studentsCount: result.students.length,
      avgMastery: result.cohort.masteryPct ?? result.cohort.pct ?? 0,
      questions,
      scores,
      attempts,
      studentInfo: studentDetails,
      studentDetails,
      analysis: result,
      profileResult: result
    }

    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examPayload)
      })
      if (res.ok) {
        const savedData = await res.json()
        if (savedData && savedData.id) examPayload.id = savedData.id
      }
    } catch {
      console.log('Backend /api/exams offline, saved exam locally')
    }

    // Update local saved list
    saveExamToLocal(examPayload)

    // Switch view to Cohort Overview
    currentTab.value = 'cohort'
  } catch (err) {
    console.error('Analysis failed:', err)
    alert(`Analysis error: ${err.message || err}`)
  } finally {
    isAnalyzing.value = false
  }
}

function selectStudentAndDeepDive(studentId) {
  selectedStudentId.value = studentId
  currentTab.value = 'student'
}

function openStudentLongitudinalHistory(studentId) {
  historyStudentId.value = studentId
  fetchStudentHistory(studentId)
  currentTab.value = 'history'
}

// Fetch Longitudinal History for a student
async function fetchStudentHistory(studentId) {
  try {
    const res = await fetch(`/api/students/${studentId}/history`)
    if (res.ok) {
      const raw = await res.json()
      const list = Array.isArray(raw) ? raw : (raw.exams || [])
      if (list.length) {
        studentHistoryRecords.value = list.map((e) => ({
          exam_id: e.examId || e.exam_id || e.id,
          exam_title: e.examTitle || e.exam_title || 'Exam',
          course_name: e.courseName || e.course_name || 'Course',
          date: e.examDate || e.date || '',
          earned: e.earned,
          total: e.totalExam || e.total,
          mastery_pct: e.masteryPct ?? e.mastery_pct ?? 0,
          recall_pct: e.dimensions?.Recall?.masteryPct ?? e.dimensions?.Recall?.pct ?? e.recall_pct ?? 0,
          comprehend_pct: e.dimensions?.Comprehend?.masteryPct ?? e.dimensions?.Comprehend?.pct ?? e.comprehend_pct ?? 0,
          solve_pct: e.dimensions?.Solve?.masteryPct ?? e.dimensions?.Solve?.pct ?? e.solve_pct ?? 0,
          build_pct: e.dimensions?.Build?.masteryPct ?? e.dimensions?.Build?.pct ?? e.build_pct ?? 0,
          evaluate_pct: e.dimensions?.Evaluate?.masteryPct ?? e.dimensions?.Evaluate?.pct ?? e.evaluate_pct ?? 0,
          weakest_dimension: e.weakestDimension || e.weakest_dimension || 'N/A'
        }))
        return
      }
    }
  } catch {
    // API is offline, fall back below
  }

  // Fallback to sample history or current exam record
  if (SAMPLE_LONGITUDINAL_HISTORY[studentId]) {
    studentHistoryRecords.value = SAMPLE_LONGITUDINAL_HISTORY[studentId]
    return
  }

  // If student is in current active exam, make a record
  if (profileData.value) {
    const st = profileData.value.students.find((s) => s.id === studentId)
    if (st && activeExamInfo.value) {
      studentHistoryRecords.value = [
        {
          exam_id: 'exam-current',
          exam_title: activeExamInfo.value.examTitle,
          course_name: activeExamInfo.value.courseName,
          date: activeExamInfo.value.examDate,
          earned: st.earned,
          total: st.totalExam || st.total,
          mastery_pct: st.masteryPct ?? st.pct ?? 0,
          recall_pct: st.dimension['Recall']?.masteryPct ?? st.dimension['Recall']?.pct ?? 0,
          comprehend_pct: st.dimension['Comprehend']?.masteryPct ?? st.dimension['Comprehend']?.pct ?? 0,
          solve_pct: st.dimension['Solve']?.masteryPct ?? st.dimension['Solve']?.pct ?? 0,
          build_pct: st.dimension['Build']?.masteryPct ?? st.dimension['Build']?.pct ?? 0,
          evaluate_pct: st.dimension['Evaluate']?.masteryPct ?? st.dimension['Evaluate']?.pct ?? 0,
          weakest_dimension: st.weakestDimension || st.weakest
        }
      ]
      return
    }
  }

  studentHistoryRecords.value = []
}

// Fetch saved exams from backend and localStorage
async function fetchSavedExams() {
  try {
    const res = await fetch('/api/exams')
    if (res.ok) {
      const list = await res.json()
      if (Array.isArray(list)) {
        savedExamsList.value = list
        return
      }
    }
  } catch {
    // API is offline
  }

  // Load from localStorage
  try {
    const stored = localStorage.getItem('rcsbe_saved_exams')
    if (stored) {
      savedExamsList.value = JSON.parse(stored)
      return
    }
  } catch {
    // localStorage unavailable
  }

  if (!savedExamsList.value.length && activeExamInfo.value) {
    savedExamsList.value = [
      {
        id: 'exam-001',
        courseName: activeExamInfo.value.courseName,
        examTitle: activeExamInfo.value.examTitle,
        examDate: activeExamInfo.value.examDate,
        questionCount: currentQuestions.value.length,
        studentCount: profileData.value ? profileData.value.students.length : 0,
        avgMastery: profileData.value?.cohort?.masteryPct ?? 0,
        questions: currentQuestions.value,
        scores: currentScores.value,
        attempts: currentAttempts.value,
        studentInfo: currentStudentDetails.value,
        analysis: profileData.value
      }
    ]
  }
}

function saveExamToLocal(exam) {
  const existingIdx = savedExamsList.value.findIndex((e) => e.id === exam.id)
  if (existingIdx >= 0) {
    savedExamsList.value[existingIdx] = exam
  } else {
    savedExamsList.value.unshift(exam)
  }
  try {
    localStorage.setItem('rcsbe_saved_exams', JSON.stringify(savedExamsList.value))
  } catch {
    // Ignore storage quota
  }
}

async function loadSavedExam(exam) {
  let fullExam = exam
  if (!exam.questions || !exam.analysis) {
    try {
      const res = await fetch(`/api/exams/${exam.id}`)
      if (res.ok) {
        fullExam = await res.json()
      }
    } catch {
      // Offline fallback
    }
  }

  form.value.courseName = fullExam.courseName
  form.value.examTitle = fullExam.examTitle
  form.value.examDate = fullExam.examDate

  activeExamInfo.value = {
    courseName: fullExam.courseName,
    examTitle: fullExam.examTitle,
    examDate: fullExam.examDate
  }

  currentQuestions.value = fullExam.questions || []
  currentScores.value = fullExam.scores || {}
  currentAttempts.value = fullExam.attempts || {}
  currentStudentDetails.value = fullExam.studentInfo || fullExam.studentDetails || {}
  currentWarnings.value = []

  if (fullExam.analysis) {
    profileData.value = fullExam.analysis
  } else if (fullExam.profileResult) {
    profileData.value = fullExam.profileResult
  } else if (fullExam.questions && fullExam.scores) {
    profileData.value = buildProfiles(
      fullExam.questions,
      fullExam.scores,
      currentStudentDetails.value
    )
  }

  if (profileData.value && profileData.value.students.length) {
    selectedStudentId.value = profileData.value.students[0].id
    historyStudentId.value = profileData.value.students[0].id
    fetchStudentHistory(profileData.value.students[0].id)
  }

  currentTab.value = 'cohort'
}

async function deleteSavedExam(examId) {
  if (!confirm('Are you sure you want to delete this saved exam?')) return

  try {
    await fetch(`/api/exams/${examId}`, { method: 'DELETE' })
  } catch {
    // API is offline
  }

  savedExamsList.value = savedExamsList.value.filter((e) => e.id !== examId)
  try {
    localStorage.setItem('rcsbe_saved_exams', JSON.stringify(savedExamsList.value))
  } catch {
    // Ignore
  }
}

onMounted(() => {
  // Pre-load sample data on startup so user immediately sees rich, functional data
  handleLoadSampleData()
  fetchSavedExams()
})
</script>
