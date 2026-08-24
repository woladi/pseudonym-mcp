import { allPatterns } from '../index.js'
import { rulesForLevel, type PatternRule } from '../types.js'

/** Rules active in strict mode — balanced rules plus weaker, context-dependent ones. */
export const strictPatterns: PatternRule[] = rulesForLevel(allPatterns, 'strict')
