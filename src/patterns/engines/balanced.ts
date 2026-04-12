import { allPatterns } from '../index.js'
import type { PatternRule } from '../types.js'

/** Patterns active in balanced mode — low false-positive rules with good coverage */
export const balancedPatterns: PatternRule[] = allPatterns.filter((p) =>
  p.engines.includes('balanced'),
)
