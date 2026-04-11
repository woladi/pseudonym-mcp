export interface PatternDef {
  /** Tag name used in replacement tokens, e.g. "PESEL", "PHONE" */
  tag: string
  /** Regex to match raw candidates — must have the 'g' flag */
  regex: RegExp
  /** Optional post-match validator (e.g. PESEL checksum). Receives the match with whitespace stripped. */
  validate?: (match: string) => boolean
}

export interface LanguageRules {
  patterns: PatternDef[]
}
