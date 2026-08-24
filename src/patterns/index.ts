import { emailRule } from './global/email.js'
import { globalPhoneRule } from './global/phone.js'
import { globalIbanRule } from './global/iban.js'
import { ipv4Rule, ipv6Rule } from './global/ip.js'
import { urlRule } from './global/url.js'
import { euVatRule } from './global/eu-vat.js'
import { peselRule } from './locale/pl/pesel.js'
import { plIbanRule } from './locale/pl/iban.js'
import { plPhoneRule } from './locale/pl/phone.js'
import { nipRule } from './locale/pl/nip.js'
import { plPostalCodeRule } from './locale/pl/postal-code.js'
import { regonRule } from './locale/pl/regon.js'
import { idCardRule } from './locale/pl/id-card.js'
import { plPassportRule } from './locale/pl/passport.js'
import { krsRule } from './locale/pl/krs.js'
import { landRegisterRule } from './locale/pl/land-register.js'
import { ssnRule } from './locale/en/ssn.js'
import { creditCardRule } from './locale/en/credit-card.js'
import { usPhoneRule } from './locale/en/phone.js'
import { usZipCodeRule } from './locale/en/zip-code.js'
import { deTaxIdRule, dePostalCodeRule } from './locale/de/tax-id.js'
import { codiceFiscaleRule } from './locale/it/fiscal-code.js'
import { esNifRule, esNieRule } from './locale/es/nif.js'
import { frNirRule } from './locale/fr/nir.js'
import { nlBsnRule } from './locale/nl/bsn.js'
import { rodneCisloRule } from './locale/cz/rodne-cislo.js'
import { personnummerRule } from './locale/se/personnummer.js'
import { hetuRule } from './locale/fi/hetu.js'
import { nhsRule, ninoRule, ukPostcodeRule } from './locale/uk/identifiers.js'
import type { PatternRule } from './types.js'

export * from './types.js'

export * from './global/email.js'
export * from './global/phone.js'
export * from './global/iban.js'
export * from './global/ip.js'
export * from './global/url.js'
export * from './global/eu-vat.js'
export * from './locale/pl/pesel.js'
export * from './locale/pl/iban.js'
export * from './locale/pl/phone.js'
export * from './locale/pl/nip.js'
export * from './locale/pl/postal-code.js'
export * from './locale/pl/regon.js'
export * from './locale/pl/id-card.js'
export * from './locale/pl/passport.js'
export * from './locale/pl/krs.js'
export * from './locale/pl/land-register.js'
export * from './locale/en/ssn.js'
export * from './locale/en/credit-card.js'
export * from './locale/en/phone.js'
export * from './locale/en/zip-code.js'
export * from './locale/de/tax-id.js'
export * from './locale/it/fiscal-code.js'
export * from './locale/es/nif.js'
export * from './locale/fr/nir.js'
export * from './locale/nl/bsn.js'
export * from './locale/cz/rodne-cislo.js'
export * from './locale/se/personnummer.js'
export * from './locale/fi/hetu.js'
export * from './locale/uk/identifiers.js'

export const allPatterns: PatternRule[] = [
  // Global
  emailRule,
  globalPhoneRule,
  globalIbanRule,
  ipv4Rule,
  ipv6Rule,
  urlRule,
  euVatRule,
  // Polish locale
  peselRule,
  plIbanRule,
  plPhoneRule,
  nipRule,
  plPostalCodeRule,
  regonRule,
  idCardRule,
  plPassportRule,
  krsRule,
  landRegisterRule,
  // English locale
  ssnRule,
  creditCardRule,
  usPhoneRule,
  usZipCodeRule,
  // Other EU locales
  deTaxIdRule,
  dePostalCodeRule,
  codiceFiscaleRule,
  esNifRule,
  esNieRule,
  frNirRule,
  nlBsnRule,
  rodneCisloRule,
  personnummerRule,
  hetuRule,
  nhsRule,
  ninoRule,
  ukPostcodeRule,
]
