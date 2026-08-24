import type { PatternRule } from '../../types.js'

/**
 * Dutch citizen service number (BSN), checked with the elfproef: weights
 * 9 down to 2 over the first eight digits, minus the ninth, divisible by 11.
 */
export function bsnChecksum(raw: string): boolean {
  const digits = raw.replace(/\D/g, '')
  if (!/^\d{9}$/.test(digits)) return false

  const d = digits.split('').map(Number)
  const sum = [9, 8, 7, 6, 5, 4, 3, 2].reduce((acc, w, i) => acc + w * d[i], 0) - d[8]

  return sum % 11 === 0
}

export const nlBsnRule: PatternRule = {
  id: 'nl.bsn',
  entityType: 'NL_BSN',
  patterns: [{ name: 'BSN', regex: /\b\d{9}\b/g, score: 0.2 }],
  locales: ['nl'],
  context: ['bsn', 'burgerservicenummer', 'sofinummer', 'burgerservice'],
  description: 'Dutch citizen service number (BSN) validated with the elfproef',
  validate: bsnChecksum,
  checksumMode: 'boost',
}
