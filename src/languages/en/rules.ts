import type { LanguageRules } from '../types.js'
import { toPatternDef } from '../../patterns/types.js'
import { ssnRule } from '../../patterns/locale/en/ssn.js'
import { creditCardRule } from '../../patterns/locale/en/credit-card.js'
import { emailRule } from '../../patterns/global/email.js'
import { usPhoneRule } from '../../patterns/locale/en/phone.js'

export const EnglishRules: LanguageRules = {
  patterns: [ssnRule, creditCardRule, emailRule, usPhoneRule].map(toPatternDef),
}
