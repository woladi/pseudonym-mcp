import type { PatternDef } from '../languages/types.js'

export type EngineLevel = 'balanced' | 'strict' | 'paranoid'
export type SupportedLocale = 'pl' | 'en'

export interface PatternRule {
  /** Unique identifier, e.g. 'global.email' or 'pl.pesel' */
  id: string
  /** Token tag used in replacement, e.g. 'EMAIL', 'PESEL' */
  entityType: string
  /** Regex with 'g' flag */
  pattern: RegExp
  /** null = applies to all locales (global); otherwise locale-specific */
  locales: SupportedLocale[] | null
  /** Which engine levels activate this rule */
  engines: EngineLevel[]
  description: string
  /** Optional post-match validator. Receives the match with whitespace stripped. */
  validate?: (match: string) => boolean
}

/** Adapter: converts a PatternRule to the PatternDef format used by Engine */
export function toPatternDef(rule: PatternRule): PatternDef {
  return {
    tag: rule.entityType,
    regex: rule.pattern,
    validate: rule.validate,
  }
}
