import { allPatterns } from '../index.js'
import type { PatternRule } from '../types.js'

/** All patterns — maximum coverage, higher false-positive risk */
export const paranoidPatterns: PatternRule[] = allPatterns.filter((p) =>
  p.engines.includes('paranoid'),
)
