import type { PatternRule } from '../../types.js'

/**
 * Czech and Slovak birth number (rodné číslo). Since 1954 it is ten digits
 * divisible by eleven; before that, nine digits with no check at all.
 *
 * The pre-1954 form therefore verifies nothing, and reporting it as verified
 * scored every bare nine-digit number — order numbers, ticket ids — as a
 * confirmed identifier. It stays a candidate (checksumMode is 'boost', so a
 * failed check never drops anything); it just has to earn its score from the
 * words around it, like any other shape with no check digit.
 */
export function rodneCisloChecksum(raw: string): boolean {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 10) return false

  const month = (Number(digits.slice(2, 4)) % 50) % 20
  if (month < 1 || month > 12) return false

  return Number(digits) % 11 === 0
}

export const rodneCisloRule: PatternRule = {
  id: 'cz.rodne-cislo',
  entityType: 'CZ_SK_BIRTH_NUMBER',
  patterns: [
    { name: 'Rodné číslo (formatted)', regex: /\b\d{6}\/\d{3,4}\b/g, score: 0.55 },
    { name: 'Rodné číslo (compact)', regex: /\b\d{9,10}\b/g, score: 0.15 },
  ],
  locales: ['cz', 'sk'],
  context: ['rodné číslo', 'rodne cislo', 'rč', 'birth number'],
  description: 'Czech/Slovak birth number (rodné číslo) — divisible by 11 since 1954',
  validate: rodneCisloChecksum,
  checksumMode: 'boost',
}
