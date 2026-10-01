import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

// Seeded PRNG (Mulberry32) for reproducible Monte Carlo simulation
function mulberry32(seed) {
  let s = seed | 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rng = mulberry32(20261015)

// Standard Normal via Box-Muller transform
function randomNormal(mean = 0, stdDev = 1) {
  let u1 = rng()
  let u2 = rng()
  while (u1 <= 1e-7) u1 = rng()
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
  return mean + z0 * stdDev
}

// Clamp helper
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

// 1. Define 25 Questions: 20 MCQs (Q01-Q20, 60 marks) + 5 Coding (Q21-Q25, 75 marks) = 135 marks
const QUESTIONS = [
  // 5 questions x 2 marks = 10 marks
  { id: 'Q01', type: 'MCQ', difficulty: 'beginner', dimension: 'Recall', topic: 'Data Structures', marks: 2, expectedSolveRate: 85, discrimination: 1.25, threshold: -1.55 },
  { id: 'Q02', type: 'MCQ', difficulty: 'beginner', dimension: 'Recall', topic: 'Computer Networks', marks: 2, expectedSolveRate: 85, discrimination: 1.20, threshold: -1.50 },
  { id: 'Q03', type: 'MCQ', difficulty: 'beginner', dimension: 'Comprehend', topic: 'Operating Systems', marks: 2, expectedSolveRate: 80, discrimination: 1.30, threshold: -1.45 },
  { id: 'Q04', type: 'MCQ', difficulty: 'easy', dimension: 'Recall', topic: 'Databases', marks: 2, expectedSolveRate: 75, discrimination: 1.35, threshold: -0.75 },
  { id: 'Q05', type: 'MCQ', difficulty: 'easy', dimension: 'Comprehend', topic: 'Algorithms', marks: 2, expectedSolveRate: 75, discrimination: 1.40, threshold: -0.70 },

  // 10 questions x 3 marks = 30 marks
  { id: 'Q06', type: 'MCQ', difficulty: 'easy', dimension: 'Comprehend', topic: 'Data Structures', marks: 3, expectedSolveRate: 70, discrimination: 1.45, threshold: -0.65 },
  { id: 'Q07', type: 'MCQ', difficulty: 'easy', dimension: 'Recall, Comprehend', topic: 'Operating Systems', marks: 3, expectedSolveRate: 70, discrimination: 1.30, threshold: -0.60 },
  { id: 'Q08', type: 'MCQ', difficulty: 'medium', dimension: 'Comprehend', topic: 'Databases', marks: 3, expectedSolveRate: 60, discrimination: 1.50, threshold: -0.10 },
  { id: 'Q09', type: 'MCQ', difficulty: 'medium', dimension: 'Solve', topic: 'Algorithms', marks: 3, expectedSolveRate: 55, discrimination: 1.55, threshold: 0.00 },
  { id: 'Q10', type: 'MCQ', difficulty: 'medium', dimension: 'Solve', topic: 'Data Structures', marks: 3, expectedSolveRate: 55, discrimination: 1.60, threshold: 0.05 },
  { id: 'Q11', type: 'MCQ', difficulty: 'medium', dimension: 'Comprehend, Solve', topic: 'Computer Networks', marks: 3, expectedSolveRate: 55, discrimination: 1.40, threshold: 0.00 },
  { id: 'Q12', type: 'MCQ', difficulty: 'medium', dimension: 'Evaluate', topic: 'Operating Systems', marks: 3, expectedSolveRate: 50, discrimination: 1.45, threshold: 0.10 },
  { id: 'Q13', type: 'MCQ', difficulty: 'hard', dimension: 'Solve', topic: 'Algorithms', marks: 3, expectedSolveRate: 35, discrimination: 1.65, threshold: 0.75 },
  { id: 'Q14', type: 'MCQ', difficulty: 'hard', dimension: 'Solve, Evaluate', topic: 'Databases', marks: 3, expectedSolveRate: 35, discrimination: 1.50, threshold: 0.80 },
  { id: 'Q15', type: 'MCQ', difficulty: 'hard', dimension: 'Evaluate', topic: 'Computer Networks', marks: 3, expectedSolveRate: 30, discrimination: 1.55, threshold: 0.85 },

  // 5 questions x 4 marks = 20 marks
  { id: 'Q16', type: 'MCQ', difficulty: 'medium', dimension: 'Recall, Comprehend', topic: 'Computer Networks', marks: 4, expectedSolveRate: 55, discrimination: 1.35, threshold: -0.05 },
  { id: 'Q17', type: 'MCQ', difficulty: 'hard', dimension: 'Solve', topic: 'Data Structures', marks: 4, expectedSolveRate: 35, discrimination: 1.70, threshold: 0.80 },
  { id: 'Q18', type: 'MCQ', difficulty: 'hard', dimension: 'Solve, Evaluate', topic: 'Algorithms', marks: 4, expectedSolveRate: 30, discrimination: 1.60, threshold: 0.85 },
  { id: 'Q19', type: 'MCQ', difficulty: 'challenge', dimension: 'Evaluate', topic: 'Operating Systems', marks: 4, expectedSolveRate: 20, discrimination: 1.75, threshold: 1.55 },
  { id: 'Q20', type: 'MCQ', difficulty: 'challenge', dimension: 'Comprehend, Evaluate', topic: 'Databases', marks: 4, expectedSolveRate: 20, discrimination: 1.65, threshold: 1.60 },

  // 5 Coding Questions (Q21-Q25, 75 marks)
  { id: 'Q21', type: 'Coding', difficulty: 'medium', dimension: 'Solve, Build', topic: 'Tree Structures', marks: 10, expectedSolveRate: 50, discrimination: 1.50, threshold: -0.05 },
  { id: 'Q22', type: 'Coding', difficulty: 'medium', dimension: 'Build', topic: 'Concurrency', marks: 12, expectedSolveRate: 45, discrimination: 1.45, threshold: 0.05 },
  { id: 'Q23', type: 'Coding', difficulty: 'hard', dimension: 'Build, Solve', topic: 'Graph Algorithms', marks: 15, expectedSolveRate: 30, discrimination: 1.60, threshold: 0.75 },
  { id: 'Q24', type: 'Coding', difficulty: 'hard', dimension: 'Build, Solve, Evaluate', topic: 'Dynamic Programming', marks: 18, expectedSolveRate: 25, discrimination: 1.70, threshold: 0.85 },
  { id: 'Q25', type: 'Coding', difficulty: 'challenge', dimension: 'Build, Evaluate', topic: 'System Architecture', marks: 20, expectedSolveRate: 15, discrimination: 1.80, threshold: 1.60 },
]

// 2. Realistic 300 Diverse Student Names
const FIRST_NAMES = [
  'Aarav', 'Ada', 'Aisha', 'Alan', 'Alex', 'Amara', 'Ananya', 'Andre', 'Anya', 'Beatriz',
  'Carlos', 'Chen', 'Chloe', 'Claude', 'Dante', 'David', 'Dev', 'Diana', 'Diego', 'Elena',
  'Elias', 'Fatima', 'Felix', 'Fiona', 'Gabriel', 'Grace', 'Hana', 'Hannah', 'Hiroshi', 'Ian',
  'Ibrahim', 'Imani', 'Isaac', 'Jasmine', 'Johan', 'Julia', 'Kai', 'Katherine', 'Kenji', 'Kevin',
  'Kiran', 'Kwame', 'Laura', 'Layla', 'Leo', 'Liam', 'Lin', 'Lucas', 'Lucia', 'Malik',
  'Margaret', 'Maria', 'Mateo', 'Maya', 'Mei', 'Mina', 'Nathan', 'Nikolai', 'Nina', 'Omar',
  'Pooja', 'Priya', 'Rafael', 'Ravi', 'Rohan', 'Samira', 'Sanjay', 'Sara', 'Siddharth', 'Sofia',
  'Soren', 'Tariq', 'Tenzin', 'Tomas', 'Valerie', 'Vikram', 'Wei', 'Yara', 'Yuki', 'Zoe'
]

const LAST_NAMES = [
  'Abadi', 'Abe', 'Acharya', 'Adeyemi', 'Agarwal', 'Al-Mansoor', 'Alvarez', 'Andersson', 'Bacon', 'Banerjee',
  'Becker', 'Bhardwaj', 'Castillo', 'Chen', 'Chowdhury', 'Costa', 'Cruz', 'Das', 'Diallo', 'Dubois',
  'Espinoza', 'Fernandez', 'Fischer', 'Fujimoto', 'Garcia', 'Gomez', 'Gupta', 'Hansen', 'Hassan', 'Hernandez',
  'Hopper', 'Ivanov', 'Jansen', 'Johnson', 'Kamau', 'Kaur', 'Khan', 'Kim', 'Kowalski', 'Kruger',
  'Kumar', 'Larsen', 'Lee', 'Li', 'Lin', 'Lindqvist', 'Lovelace', 'Mahmood', 'Malik', 'Martinez',
  'Matsumoto', 'Mensah', 'Mehta', 'Miller', 'Morales', 'Muller', 'Nair', 'Nakamura', 'Navarro', 'Nguyen',
  'Novak', 'O\'Connor', 'Okafor', 'Ortiz', 'Park', 'Patel', 'Pereira', 'Popov', 'Qureshi', 'Rahman',
  'Rao', 'Reyes', 'Ribeiro', 'Rodriguez', 'Rossi', 'Santos', 'Sato', 'Schneider', 'Sen', 'Sharma',
  'Silva', 'Singh', 'Smith', 'Sorensen', 'Suzuki', 'Tanaka', 'Turing', 'Valdez', 'Vargas', 'Verma',
  'Volkov', 'Wang', 'Watanabe', 'Weber', 'Williams', 'Wright', 'Wu', 'Yamamoto', 'Yang', 'Zhang'
]

function generateStudents(count = 300) {
  const students = []
  const usedNames = new Set()

  for (let i = 1; i <= count; i++) {
    const id = `STU${String(i).padStart(3, '0')}`
    let name
    let attempts = 0
    do {
      const f = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]
      const l = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)]
      name = `${f} ${l}`
      attempts++
    } while (usedNames.has(name) && attempts < 100)

    if (usedNames.has(name)) {
      name = `${name} ${i}`
    }
    usedNames.add(name)

    const emailUser = name.toLowerCase().replace(/[^a-z0-9]+/g, '.')
    const email = `${emailUser}@university.edu`

    students.push({ id, name, email })
  }

  return students
}

// 3. Monte Carlo Simulation Engine
function simulateContestScores(students, questions) {
  const DIMENSIONS_LIST = ['Recall', 'Comprehend', 'Solve', 'Build', 'Evaluate']
  const scoresByStudent = {} // student_id -> { qid: score }

  for (const stu of students) {
    // Latent general ability theta ~ N(0, 1)
    const thetaGeneral = randomNormal(0, 1.0)

    // Dimension affinities delta_d ~ N(0, 0.4)
    const dimAbilities = {}
    for (const d of DIMENSIONS_LIST) {
      dimAbilities[d] = thetaGeneral + randomNormal(0, 0.38)
    }

    scoresByStudent[stu.id] = {}

    for (const q of questions) {
      // Dimensions of the question
      const dims = q.dimension.split(',').map((s) => s.trim())
      // Average student dimension proficiency for this question
      const thetaQD = dims.reduce((acc, d) => acc + (dimAbilities[d] ?? thetaGeneral), 0) / dims.length

      // IRT 2PL/3PL calculation
      const a = q.discrimination
      const b = q.threshold
      const c = q.type === 'MCQ' ? 0.20 : 0.0

      const pCorrect = c + (1.0 - c) / (1.0 + Math.exp(-a * (thetaQD - b)))

      if (q.type === 'MCQ') {
        // All students attempt MCQs
        const u = rng()
        const isCorrect = u < pCorrect
        scoresByStudent[stu.id][q.id] = isCorrect ? q.marks : 0
      } else {
        // Coding question: simulate unattempted rate based on difficulty & proficiency
        let unattemptedProb = 0
        if (q.difficulty === 'medium') {
          if (thetaQD < -1.4) unattemptedProb = 0.25
          else if (thetaQD < -1.0) unattemptedProb = 0.08
        } else if (q.difficulty === 'hard') {
          if (thetaQD < -1.2) unattemptedProb = 0.65
          else if (thetaQD < -0.5) unattemptedProb = 0.35
          else if (thetaQD < 0.1) unattemptedProb = 0.15
          else unattemptedProb = 0.03
        } else if (q.difficulty === 'challenge') {
          if (thetaQD < -1.0) unattemptedProb = 0.85
          else if (thetaQD < -0.3) unattemptedProb = 0.60
          else if (thetaQD < 0.4) unattemptedProb = 0.35
          else if (thetaQD < 1.0) unattemptedProb = 0.15
          else unattemptedProb = 0.05
        }

        if (rng() < unattemptedProb) {
          // Unattempted: null / empty
          scoresByStudent[stu.id][q.id] = ''
          continue
        }

        // Attempted: simulate test cases (10 test cases)
        const totalTestCases = 10
        let passedCases = 0

        for (let tc = 0; tc < totalTestCases; tc++) {
          // Test case difficulty threshold spans from basic sample to extreme edge cases
          const tcThreshold = b - 0.85 + (1.70 * tc) / (totalTestCases - 1)
          const pTc = 1.0 / (1.0 + Math.exp(-1.6 * (thetaQD - tcThreshold)))
          if (rng() < pTc) {
            passedCases++
          }
        }

        // Calculate marks with 0.5 granularity
        const rawScore = (passedCases / totalTestCases) * q.marks
        const roundedScore = Math.round(rawScore * 2) / 2
        scoresByStudent[stu.id][q.id] = clamp(roundedScore, 0, q.marks)
      }
    }
  }

  return scoresByStudent
}

// 4. Generate CSV Strings
function generateExamConfigCsv(questions) {
  const header = 'question_id,question_type,question_difficulty,question_dimension,question_topics,marks,expected_solve_rate'
  const rows = questions.map((q) => {
    const dimStr = q.dimension.includes(',') ? `"${q.dimension}"` : q.dimension
    return `${q.id},${q.type},${q.difficulty},${dimStr},${q.topic},${q.marks},${q.expectedSolveRate ?? 50}`
  })
  return [header, ...rows].join('\n')
}

function generateStudentsCsv(students) {
  const header = 'student_id,student_name,email'
  const rows = students.map((s) => `${s.id},${s.name},${s.email}`)
  return [header, ...rows].join('\n')
}

function generateScoresCsvWide(students, questions, scoresByStudent) {
  const qHeaders = questions.map((q) => q.id)
  const header = ['student_id', ...qHeaders].join(',')
  const rows = students.map((s) => {
    const stuScores = scoresByStudent[s.id] || {}
    const colVals = qHeaders.map((qid) => {
      const val = stuScores[qid]
      return val === undefined || val === null ? '' : String(val)
    })
    return [s.id, ...colVals].join(',')
  })
  return [header, ...rows].join('\n')
}

// Run the generation
export function generateContestDataset() {
  const students = generateStudents(300)
  const scoresByStudent = simulateContestScores(students, QUESTIONS)

  const examConfigCsv = generateExamConfigCsv(QUESTIONS)
  const studentsCsv = generateStudentsCsv(students)
  const scoresCsv = generateScoresCsvWide(students, QUESTIONS, scoresByStudent)

  return {
    questions: QUESTIONS,
    students,
    scoresByStudent,
    examConfigCsv,
    studentsCsv,
    scoresCsv,
  }
}

// CLI Execution: write files to disk
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename
if (isDirectRun) {
  console.log('Generating 300-student Monte Carlo contest dataset...')
  const data = generateContestDataset()

  const samplesDir = path.join(ROOT_DIR, 'samples')
  fs.mkdirSync(samplesDir, { recursive: true })

  fs.writeFileSync(path.join(samplesDir, 'contest_exam_config.csv'), data.examConfigCsv, 'utf8')
  fs.writeFileSync(path.join(samplesDir, 'contest_students.csv'), data.studentsCsv, 'utf8')
  fs.writeFileSync(path.join(samplesDir, 'contest_student_scores.csv'), data.scoresCsv, 'utf8')

  console.log(`Saved contest_exam_config.csv (${data.questions.length} questions, total 135 marks)`)
  console.log(`Saved contest_students.csv (${data.students.length} students)`)
  console.log(`Saved contest_student_scores.csv (${data.students.length} rows)`)

  // Update src/samples.js
  const samplesJsPath = path.join(ROOT_DIR, 'src', 'samples.js')
  let samplesJsContent = fs.readFileSync(samplesJsPath, 'utf8')
  const marker = '// --- 300-Student Contest Dataset (Generated via Monte Carlo Simulation) ---'
  const markerIdx = samplesJsContent.indexOf(marker)
  if (markerIdx !== -1) {
    samplesJsContent = samplesJsContent.slice(0, markerIdx).trimEnd() + '\n\n'
  } else {
    samplesJsContent = samplesJsContent.trimEnd() + '\n\n'
  }

  const contestExportStr = `${marker}
export const CONTEST_QUESTIONS_CSV = \`${data.examConfigCsv}\`

export const CONTEST_STUDENTS_CSV = \`${data.studentsCsv}\`

export const CONTEST_SCORES_CSV = \`${data.scoresCsv}\`
`
  fs.writeFileSync(samplesJsPath, samplesJsContent + contestExportStr, 'utf8')
  console.log(`Updated src/samples.js with CONTEST_QUESTIONS_CSV, CONTEST_STUDENTS_CSV, CONTEST_SCORES_CSV`)
}

