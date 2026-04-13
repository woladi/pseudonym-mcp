import type { PatternRule } from '../../types.js'

/**
 * Validates a Polish PESEL number using the official checksum algorithm.
 * Weights: [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]
 * Check digit = (10 - (weighted_sum % 10)) % 10
 */
function peselChecksum(input: string): boolean {
  const digits = input.replace(/\D/g, '')
  if (digits.length !== 11) return false
  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]
  const d = digits.split('').map(Number)
  const sum = weights.reduce((acc, w, i) => acc + w * d[i], 0)
  const check = (10 - (sum % 10)) % 10
  return check === d[10]
}

export const peselRule: PatternRule = {
  id: 'pl.pesel',
  entityType: 'PESEL',
  // Matches "PESEL XXXXXXXXXXX" (whole phrase) or standalone 11 digits
  pattern: /(?:PESEL\s+)?(?<!\d)\d{11}(?!\d)/g,
  locales: ['pl'],
  engines: ['balanced', 'strict', 'paranoid'],
  description: 'Polish national identification number (PESEL) — 11 digits with checksum',
  validate: peselChecksum,
}
