import type { PatternRule } from '../../types.js'

/**
 * Validates a Polish NIP (Numer Identyfikacji Podatkowej — Tax ID).
 * 10 digits, weights: [6, 5, 7, 2, 3, 4, 5, 6, 7]
 * Check digit = weighted_sum % 11; valid if result equals last digit (and != 10)
 */
function nipChecksum(raw: string): boolean {
  const digits = raw.replace(/[\s\-]/g, '')
  if (!/^\d{10}$/.test(digits)) return false
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
  const d = digits.split('').map(Number)
  const sum = weights.reduce((acc, w, i) => acc + w * d[i], 0)
  const check = sum % 11
  return check !== 10 && check === d[9]
}

export const nipRule: PatternRule = {
  id: 'pl.nip',
  entityType: 'NIP',
  // 10 digits, optionally separated by spaces or dashes in groups: XXX-XXX-XX-XX or XXX-XX-XX-XXX
  pattern: /\b\d{3}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}\b/g,
  locales: ['pl'],
  engines: ['strict', 'paranoid'],
  description: 'Polish tax identification number (NIP) — 10 digits with checksum',
  validate: nipChecksum,
}
