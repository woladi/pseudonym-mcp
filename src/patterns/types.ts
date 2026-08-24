/**
 * Pattern model.
 *
 * A rule describes one entity type (PESEL, IBAN, …) through one or more
 * scored variants. Confidence, not a hand-curated on/off list, decides whether
 * a match is masked: each variant carries a base score, a passing checksum
 * raises it, and a nearby context word ("PESEL:", "NIP") raises it further.
 *
 * This is what lets a loose pattern coexist with a strict one — bare eleven
 * digits stay low-confidence until the checksum or the surrounding words say
 * otherwise, instead of forcing a choice between recall and precision.
 */

/** Sensitivity level: how much confidence a match needs before it is masked. */
export type EngineLevel = 'balanced' | 'strict' | 'paranoid'

export type SupportedLocale =
  | 'pl'
  | 'en'
  | 'de'
  | 'it'
  | 'es'
  | 'fr'
  | 'nl'
  | 'cz'
  | 'sk'
  | 'se'
  | 'fi'
  | 'uk'

/** Minimum score a candidate needs at each sensitivity level. */
export const ENGINE_THRESHOLDS: Record<EngineLevel, number> = {
  balanced: 0.5,
  strict: 0.35,
  paranoid: 0.1,
}

/** How much a nearby context word adds to a candidate's score. */
export const CONTEXT_BOOST = 0.35
/**
 * Floor applied once a context word was found, however weak the base score.
 * Set at the balanced threshold on purpose: if the document itself says
 * "Passport no" right before a number, that is enough to mask it by default.
 */
export const MIN_SCORE_WITH_CONTEXT = 0.5
/** Floor applied when a checksum validates — a verified identifier is not a guess. */
export const CHECKSUM_VALID_SCORE = 0.85
/** How far around a match to look for context words, in characters. */
export const CONTEXT_WINDOW_CHARS = 120

export const MAX_SCORE = 1.0

export interface PatternVariant {
  /** Human-readable variant name, e.g. 'PESEL (checksum)' — used in diagnostics. */
  name: string
  /** Regex with the 'g' flag. */
  regex: RegExp
  /** Base confidence in [0, 1] before checksum and context adjustments. */
  score: number
}

export interface PatternRule {
  /** Unique identifier, e.g. 'global.email' or 'pl.pesel' */
  id: string
  /** Token tag used in replacement, e.g. 'EMAIL', 'PESEL' */
  entityType: string
  /** One or more scored variants, strongest first by convention. */
  patterns: PatternVariant[]
  /** null = applies to all locales (global); otherwise locale-specific */
  locales: SupportedLocale[] | null
  /**
   * Words that, found near a match, raise its confidence. Matched
   * case-insensitively on word boundaries, so "PESEL" hits "nr PESEL:".
   */
  context?: string[]
  description: string
  /**
   * Optional checksum. Receives the match with whitespace stripped.
   * Passing always raises the score to at least CHECKSUM_VALID_SCORE.
   */
  validate?: (match: string) => boolean
  /**
   * What a *failing* checksum means:
   *
   * - 'filter' (default) — not this entity at all, so drop the candidate when
   *   strict validation is on. Right for formats where the checksum is part of
   *   the shape: a card number failing Luhn is not a card number.
   * - 'boost' — the checksum only adds confidence, never removes a candidate.
   *   Right where a false negative leaks data: a mistyped or fictitious PESEL
   *   is still eleven digits that must not reach the cloud.
   * - 'gate' — drop on failure but do not promote on success. Right for
   *   plausibility rules rather than checksums: US SSN area numbers rule out
   *   impossible values without making a possible one any more likely.
   */
  checksumMode?: 'filter' | 'boost' | 'gate'
}

/** Highest base score a rule can produce, i.e. its strongest variant. */
export function maxScore(rule: PatternRule): number {
  return rule.patterns.reduce((acc, p) => Math.max(acc, p.score), 0)
}

/**
 * Rules that apply to a locale: that locale's own first, then the global ones.
 * Order does not affect matching (every candidate is scored), but keeping the
 * specific rules first makes diagnostics and lookups predictable.
 */
export function rulesForLocale(
  rules: PatternRule[],
  locale: string,
  extraLocales: string[] = [],
): PatternRule[] {
  const wanted = new Set([locale, ...extraLocales])
  const applies = (r: PatternRule) => r.locales !== null && r.locales.some((l) => wanted.has(l))
  return [...rules.filter(applies), ...rules.filter((r) => r.locales === null)]
}

/** Rules strong enough to fire at the given sensitivity level. */
export function rulesForLevel(rules: PatternRule[], level: EngineLevel): PatternRule[] {
  const threshold = ENGINE_THRESHOLDS[level]
  return rules.filter((r) => maxScore(r) >= threshold)
}
