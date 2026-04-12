export type SupportedLang = 'pl' | 'en'
export type DetectedLang = SupportedLang | 'unknown'
export type DetectionSource = 'text' | 'fallback'

export interface DetectedLanguageResult {
  /** Detected language mapped to a supported code, or 'unknown' */
  detected: DetectedLang
  /** 'text' = franc ran and returned a mappable language; 'fallback' = text too short or und */
  source: DetectionSource
  /** Raw ISO 639-3 code from franc (e.g. 'pol'), or null when franc was not called */
  raw: string | null
  /** Confidence score 0–1 from franc, or null when franc was not called */
  confidence: number | null
}
