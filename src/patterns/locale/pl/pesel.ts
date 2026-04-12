import type { PatternRule } from '../../types.js'

/**
 * Validates a Polish PESEL number using the official checksum algorithm.
 * Weights: [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]
 * Check digit = (10 - (weighted_sum % 10)) % 10
 */
function peselChecksum(pesel: string): boolean {
  if (!/^\d{11}$/.test(pesel)) return false
  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]
  const digits = pesel.split('').map(Number)
  const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0)
  const check = (10 - (sum % 10)) % 10
  return check === digits[10]
}

export const peselRule: PatternRule = {
  id: 'pl.pesel',
  entityType: 'PESEL',
  // Exactly 11 consecutive digits NOT adjacent to another digit
  pattern: /(?<!\d)\d{11}(?!\d)/g,
  locales: ['pl'],
  engines: ['balanced', 'strict', 'paranoid'],
  description: 'Polish national identification number (PESEL) — 11 digits with checksum',
  validate: peselChecksum,
}
