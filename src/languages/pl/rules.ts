import type { LanguageRules } from '../types.js'
import { allPatterns } from '../../patterns/index.js'
import { rulesForLocale } from '../../patterns/types.js'

/**
 * Polish rule set — derived from the pattern registry rather than listed by
 * hand, so a new `locales: ['pl']` rule is picked up by adding the file alone.
 * Which of these actually fire is decided by the sensitivity threshold.
 */
export const PolishRules: LanguageRules = {
  patterns: rulesForLocale(allPatterns, 'pl'),
}
