import type { LanguageRules } from '../types.js'
import { toPatternDef } from '../../patterns/types.js'
import { peselRule } from '../../patterns/locale/pl/pesel.js'
import { plIbanRule } from '../../patterns/locale/pl/iban.js'
import { plPhoneRule } from '../../patterns/locale/pl/phone.js'
import { emailRule } from '../../patterns/global/email.js'

export const PolishRules: LanguageRules = {
  patterns: [peselRule, plIbanRule, emailRule, plPhoneRule].map(toPatternDef),
}
