import type { LanguageRules } from '../types.js'
import { allPatterns } from '../../patterns/index.js'
import { rulesForLocale } from '../../patterns/types.js'

/** English rule set — US-specific rules plus the global ones. */
export const EnglishRules: LanguageRules = {
  patterns: rulesForLocale(allPatterns, 'en'),
}
