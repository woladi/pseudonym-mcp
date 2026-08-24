import { allPatterns } from '../index.js'
import { rulesForLevel, type PatternRule } from '../types.js'

/** Rules active in paranoid mode — everything, including patterns that over-match. */
export const paranoidPatterns: PatternRule[] = rulesForLevel(allPatterns, 'paranoid')
