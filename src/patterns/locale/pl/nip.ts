import type { PatternRule } from '../../types.js'

/**
 * Validates a Polish NIP (Numer Identyfikacji Podatkowej — Tax ID).
 * 10 digits, weights: [6, 5, 7, 2, 3, 4, 5, 6, 7]
 * Check digit = weighted_sum % 11; valid if result equals last digit (and != 10)
 */
export function nipChecksum(raw: string): boolean {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 10) return false
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
  const d = digits.split('').map(Number)
  const sum = weights.reduce((acc, w, i) => acc + w * d[i], 0)
  const check = sum % 11
  return check !== 10 && check === d[9]
}

export const nipRule: PatternRule = {
  id: 'pl.nip',
  entityType: 'NIP',
  // Optional "NIP" label + 10 digits in XXX-XXX-XX-XX format (hyphens required)
  // The hyphenated form is distinctive enough on its own; the bare ten digits
  // and the PL-prefixed VAT form need the checksum or the word "NIP" nearby,
  // which is how they appear on invoices anyway.
  patterns: [
    { name: 'NIP (formatted)', regex: /(?:NIP[\s:]+)?\b\d{3}-\d{3}-\d{2}-\d{2}\b/g, score: 0.35 },
    { name: 'NIP (bare)', regex: /\b\d{10}\b/g, score: 0.2 },
    { name: 'NIP (spaced)', regex: /\b\d{3}[ ]\d{3}[ ]\d{2}[ ]\d{2}\b/g, score: 0.3 },
  ],
  locales: ['pl'],
  context: ['nip', 'vat', 'vat id', 'numer nip', 'podatnik', 'tax id', 'nip:'],
  description: 'Polish tax identification number (NIP) — 10 digits with checksum',
  validate: nipChecksum,
}
