// Tailwind classes for the verdict tones and the five dimensions. They live in
// one place so tags, dots and badges always agree.
export const TONE_BADGE = {
  good: 'border-good/40 bg-good/15 text-good-foreground',
  warn: 'border-warn/50 bg-warn/20 text-warn-foreground',
  bad: 'border-bad/40 bg-bad/15 text-bad-foreground',
  info: 'border-info/40 bg-info/15 text-info-foreground',
  neutral: 'border-border bg-muted text-muted-foreground',
}

export const TONE_DOT = {
  good: 'bg-good',
  warn: 'bg-warn',
  bad: 'bg-bad',
  info: 'bg-info',
}

export const DIMENSION_BADGE = {
  Recall: 'bg-dim-recall text-white',
  Comprehend: 'bg-dim-comprehend text-white',
  Solve: 'bg-dim-solve text-white',
  Build: 'bg-dim-build text-white',
  Evaluate: 'bg-dim-evaluate text-white',
}
