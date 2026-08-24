import {
  CHECKSUM_VALID_SCORE,
  CONTEXT_BOOST,
  CONTEXT_WORDS_AFTER,
  CONTEXT_WORDS_BEFORE,
  ENGINE_THRESHOLDS,
  MAX_SCORE,
  MIN_SCORE_WITH_CONTEXT,
  type EngineLevel,
  type PatternRule,
} from '../patterns/types.js'

export interface Candidate {
  /** Offset of the match in the source text. */
  start: number
  /** Offset one past the last character of the match. */
  end: number
  text: string
  entityType: string
  score: number
  ruleId: string
  /** Which variant of the rule produced this match. */
  variant: string
  /** Whether a context word was found nearby. */
  contextHit: boolean
  /** Checksum outcome: true/false when the rule has one, null when it does not. */
  checksum: boolean | null
}

export interface RecognizeOptions {
  level?: EngineLevel
  /** Drop matches whose checksum fails, instead of keeping them at base score. */
  strictValidation?: boolean
}

/**
 * Word-boundary test that understands Polish (and other Unicode) letters —
 * \b would split "PESEL-em" and, worse, treat "ó" as a boundary.
 */
function containsWord(haystack: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`, 'iu')
  return re.test(haystack)
}

/** The words around a match, where context words are looked for. */
function contextWindow(text: string, start: number, end: number): string {
  const before = text.slice(0, start).split(/\s+/).slice(-CONTEXT_WORDS_BEFORE).join(' ')
  const after = text.slice(end).trim().split(/\s+/).slice(0, CONTEXT_WORDS_AFTER).join(' ')
  return `${before} ${after}`
}

/**
 * Score one match: a passing checksum makes it a near-certainty, a nearby
 * context word lifts a weak pattern over the bar. Mirrors Presidio's
 * PatternRecognizer.validate_result + LemmaContextAwareEnhancer.
 */
function scoreMatch(
  rule: PatternRule,
  base: number,
  matchText: string,
  window: string,
): { score: number; contextHit: boolean; checksum: boolean | null } {
  let score = base
  let checksum: boolean | null = null

  if (rule.validate) {
    checksum = rule.validate(matchText.replace(/\s/g, ''))
    // 'gate' rules only rule things out — passing tells us nothing extra.
    if (checksum && rule.checksumMode !== 'gate') {
      score = Math.max(score, CHECKSUM_VALID_SCORE)
    }
  }

  const contextHit = (rule.context ?? []).some((word) => containsWord(window, word))
  if (contextHit) {
    score = Math.min(MAX_SCORE, score + CONTEXT_BOOST)
    score = Math.max(score, MIN_SCORE_WITH_CONTEXT)
  }

  return { score, contextHit, checksum }
}

/**
 * Keep the best candidate on every stretch of text. Two rules matching the
 * same digits (a PESEL and a phone number, say) is normal; masking one inside
 * the other is not. Highest score wins, then the longer match, then the
 * earlier one — so a checksum-verified NIP beats a bare digit run over it.
 */
function resolveOverlaps(candidates: Candidate[]): Candidate[] {
  const ranked = [...candidates].sort(
    (a, b) => b.score - a.score || b.end - b.start - (a.end - a.start) || a.start - b.start,
  )

  const kept: Candidate[] = []
  for (const candidate of ranked) {
    const overlaps = kept.some((k) => candidate.start < k.end && k.start < candidate.end)
    if (!overlaps) kept.push(candidate)
  }

  return kept.sort((a, b) => a.start - b.start)
}

/**
 * Find every entity in `text` that clears the sensitivity threshold,
 * with overlaps already resolved. Returned in document order.
 */
export function findCandidates(
  text: string,
  rules: PatternRule[],
  options: RecognizeOptions = {},
): Candidate[] {
  const level = options.level ?? 'balanced'
  const strictValidation = options.strictValidation ?? true
  const threshold = ENGINE_THRESHOLDS[level]

  const candidates: Candidate[] = []

  for (const rule of rules) {
    for (const variant of rule.patterns) {
      // Clone: /g regexes carry lastIndex between calls.
      const regex = new RegExp(variant.regex.source, variant.regex.flags)
      for (const match of text.matchAll(regex)) {
        const start = match.index
        const matchText = match[0]
        if (start === undefined || matchText.length === 0) continue

        const end = start + matchText.length
        const { score, contextHit, checksum } = scoreMatch(
          rule,
          variant.score,
          matchText,
          contextWindow(text, start, end),
        )

        const dropOnFailedChecksum = (rule.checksumMode ?? 'filter') !== 'boost'
        if (checksum === false && strictValidation && dropOnFailedChecksum) continue
        if (score < threshold) continue

        candidates.push({
          start,
          end,
          text: matchText,
          entityType: rule.entityType,
          score,
          ruleId: rule.id,
          variant: variant.name,
          contextHit,
          checksum,
        })
      }
    }
  }

  return resolveOverlaps(candidates)
}
