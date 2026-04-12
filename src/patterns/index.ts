import { emailRule } from './global/email.js'
import { globalPhoneRule } from './global/phone.js'
import { globalIbanRule } from './global/iban.js'
import { ipv4Rule, ipv6Rule } from './global/ip.js'
import { urlRule } from './global/url.js'
import { peselRule } from './locale/pl/pesel.js'
import { plIbanRule } from './locale/pl/iban.js'
import { plPhoneRule } from './locale/pl/phone.js'
import { nipRule } from './locale/pl/nip.js'
import { plPostalCodeRule } from './locale/pl/postal-code.js'
import { ssnRule } from './locale/en/ssn.js'
import { creditCardRule } from './locale/en/credit-card.js'
import { usPhoneRule } from './locale/en/phone.js'
import { usZipCodeRule } from './locale/en/zip-code.js'
import type { PatternRule } from './types.js'

export * from './types.js'

export * from './global/email.js'
export * from './global/phone.js'
export * from './global/iban.js'
export * from './global/ip.js'
export * from './global/url.js'
export * from './locale/pl/pesel.js'
export * from './locale/pl/iban.js'
export * from './locale/pl/phone.js'
export * from './locale/pl/nip.js'
export * from './locale/pl/postal-code.js'
export * from './locale/en/ssn.js'
export * from './locale/en/credit-card.js'
export * from './locale/en/phone.js'
export * from './locale/en/zip-code.js'

export const allPatterns: PatternRule[] = [
  // Global
  emailRule,
  globalPhoneRule,
  globalIbanRule,
  ipv4Rule,
  ipv6Rule,
  urlRule,
  // Polish locale
  peselRule,
  plIbanRule,
  plPhoneRule,
  nipRule,
  plPostalCodeRule,
  // English locale
  ssnRule,
  creditCardRule,
  usPhoneRule,
  usZipCodeRule,
]
