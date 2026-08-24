import type { PatternRule } from '../../types.js'

function charValue(c: string): number {
  return /\d/.test(c) ? Number(c) : c.toUpperCase().charCodeAt(0) - 55
}

/**
 * Polish passport: two series letters, a check digit, then six digits.
 * Weights 7,3,9,1,7,3,1,7,3 across all nine characters, valid when the
 * weighted sum is divisible by 10.
 */
export function passportChecksum(raw: string): boolean {
  const value = raw.replace(/[\s-]/g, '').toUpperCase()
  if (!/^[A-Z]{2}\d{7}$/.test(value)) return false

  const weights = [7, 3, 9, 1, 7, 3, 1, 7, 3]
  const sum = value.split('').reduce((acc, c, i) => acc + weights[i] * charValue(c), 0)

  return sum % 10 === 0
}

export const plPassportRule: PatternRule = {
  id: 'pl.passport',
  entityType: 'PASSPORT',
  patterns: [
    { name: 'Paszport PL', regex: /\b[A-Z]{2}[\s-]?\d{7}\b/g, score: 0.35 },
    { name: 'Paszport PL (lowercase)', regex: /\b[a-z]{2}\d{7}\b/g, score: 0.15 },
  ],
  locales: ['pl'],
  context: ['paszport', 'nr paszportu', 'numer paszportu', 'passport', 'dokument podróży'],
  description: 'Polish passport number — two letters plus seven digits with checksum',
  validate: passportChecksum,
}
