import { allPatterns } from '../index.js'
import { rulesForLevel, type PatternRule } from '../types.js'

/** Rules confident enough for balanced mode — the default, tuned for low false positives. */
export const balancedPatterns: PatternRule[] = rulesForLevel(allPatterns, 'balanced')
