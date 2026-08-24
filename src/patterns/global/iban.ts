import type { PatternRule } from '../types.js'

/**
 * IBAN length per country (ISO 13616). The length alone rules out most
 * look-alikes; the mod-97 check then rules out the rest.
 */
export const IBAN_LENGTHS: Record<string, number> = {
  AD: 24,
  AE: 23,
  AL: 28,
  AT: 20,
  AZ: 28,
  BA: 20,
  BE: 16,
  BG: 22,
  BH: 22,
  BR: 29,
  BY: 28,
  CH: 21,
  CR: 22,
  CY: 28,
  CZ: 24,
  DE: 22,
  DK: 18,
  DO: 28,
  EE: 20,
  EG: 29,
  ES: 24,
  FI: 18,
  FO: 18,
  FR: 27,
  GB: 22,
  GE: 22,
  GI: 23,
  GL: 18,
  GR: 27,
  GT: 28,
  HR: 21,
  HU: 28,
  IE: 22,
  IL: 23,
  IQ: 23,
  IS: 26,
  IT: 27,
  JO: 30,
  KW: 30,
  KZ: 20,
  LB: 28,
  LC: 32,
  LI: 21,
  LT: 20,
  LU: 20,
  LV: 21,
  LY: 25,
  MC: 27,
  MD: 24,
  ME: 22,
  MK: 19,
  MR: 27,
  MT: 31,
  MU: 30,
  NL: 18,
  NO: 15,
  PK: 24,
  PL: 28,
  PS: 29,
  PT: 25,
  QA: 29,
  RO: 24,
  RS: 22,
  SA: 24,
  SC: 31,
  SE: 24,
  SI: 19,
  SK: 24,
  SM: 27,
  ST: 25,
  SV: 28,
  TL: 23,
  TN: 24,
  TR: 26,
  UA: 29,
  VA: 22,
  VG: 24,
  XK: 20,
}

/**
 * ISO 7064 mod-97-10: move the first four characters to the end, replace
 * letters with two-digit numbers (A = 10 … Z = 35), and require a remainder
 * of 1. Computed piecewise so the number never exceeds safe integer range.
 */
export function ibanChecksum(raw: string): boolean {
  const value = raw.replace(/[\s-]/g, '').toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(value)) return false

  const expected = IBAN_LENGTHS[value.slice(0, 2)]
  if (expected !== undefined && value.length !== expected) return false

  const rearranged = value.slice(4) + value.slice(0, 4)
  let remainder = 0
  for (const char of rearranged) {
    const chunk = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55)
    remainder = Number(`${remainder}${chunk}`) % 97
  }

  return remainder === 1
}

export const globalIbanRule: PatternRule = {
  id: 'global.iban',
  entityType: 'IBAN',
  // Compact and group-of-four forms. The shape alone is weak — plenty of
  // reference numbers look like it — so the mod-97 check is what promotes a
  // match, and a failed check means it was never an IBAN.
  patterns: [
    { name: 'IBAN (compact)', regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g, score: 0.35 },
    {
      name: 'IBAN (grouped)',
      regex: /\b[A-Z]{2}\d{2}(?:[ ][A-Z0-9]{4}){2,7}(?:[ ][A-Z0-9]{1,4})?\b/g,
      score: 0.35,
    },
  ],
  locales: null,
  context: ['iban', 'account', 'konto', 'rachunek', 'bank', 'przelew', 'swift', 'bic'],
  description: 'IBAN for any ISO 13616 country, validated by length and mod-97 checksum',
  validate: ibanChecksum,
  // A mistyped account number is still an account number. The checksum
  // promotes a match to near-certainty; failing it leaves the candidate for
  // the stricter levels or for a nearby "IBAN" / "rachunek" to rescue.
  checksumMode: 'boost',
}
