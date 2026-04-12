import type { SupportedLang } from './types.js'

/**
 * Maps ISO 639-3 codes (returned by franc) to supported short language codes.
 * Only languages with a corresponding pattern set in src/patterns/ are listed here.
 */
export const LANGUAGE_CODE_MAP: Record<string, SupportedLang> = {
  pol: 'pl',
  eng: 'en',
}
