import { francAll } from 'franc'
import { LANGUAGE_CODE_MAP } from './language-map.js'
import type { DetectedLanguageResult } from './types.js'

const MIN_TEXT_LENGTH = 20
const MIN_CONFIDENCE = 0.5

const FALLBACK: DetectedLanguageResult = {
  detected: 'unknown',
  source: 'fallback',
  raw: null,
  confidence: null,
}

/**
 * Heuristically detect the language of the given text using franc.
 *
 * Returns 'unknown' when:
 *   - text is shorter than MIN_TEXT_LENGTH characters
 *   - franc returns 'und' (undetermined)
 *   - the detected language is not in LANGUAGE_CODE_MAP
 *   - confidence is below MIN_CONFIDENCE
 *
 * This is a helper heuristic — it does not affect the pseudonymization pipeline.
 * The --lang config flag remains the authoritative language selector.
 */
export function detectLanguage(text: string): DetectedLanguageResult {
  const trimmed = text.trim()

  if (trimmed.length < MIN_TEXT_LENGTH) {
    return FALLBACK
  }

  const scores = francAll(trimmed)

  if (!scores.length) {
    return FALLBACK
  }

  const [rawCode, score] = scores[0] as [string, number]

  if (rawCode === 'und') {
    return FALLBACK
  }

  const mapped = LANGUAGE_CODE_MAP[rawCode]

  if (!mapped) {
    return { detected: 'unknown', source: 'text', raw: rawCode, confidence: score }
  }

  if (score < MIN_CONFIDENCE) {
    return { detected: 'unknown', source: 'fallback', raw: rawCode, confidence: score }
  }

  return { detected: mapped, source: 'text', raw: rawCode, confidence: score }
}
