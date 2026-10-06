import { buildProfiles } from './profiles.js'
import { analyzePaper } from './paper.js'

// Everything derived from a dataset. Recomputed whenever an exam is opened, so
// stored exams always show results from the current code.
export function analyzeDataset(dataset) {
  const profiles = buildProfiles(dataset)
  return { profiles, paper: analyzePaper(dataset, profiles) }
}
