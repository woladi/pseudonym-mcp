import { allPatterns } from '../index.js'
import type { PatternRule } from '../types.js'

/** Patterns active in strict mode — balanced rules plus checksum-validated identifiers */
export const strictPatterns: PatternRule[] = allPatterns.filter((p) => p.engines.includes('strict'))
