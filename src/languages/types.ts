import type { PatternRule } from '../patterns/types.js'

export interface LanguageRules {
  /** Rules that apply to this language: its own plus the global ones. */
  patterns: PatternRule[]
}
