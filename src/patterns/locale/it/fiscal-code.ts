import type { PatternRule } from '../../types.js'

const ODD: Record<string, number> = {
  '0': 1,
  '1': 0,
  '2': 5,
  '3': 7,
  '4': 9,
  '5': 13,
  '6': 15,
  '7': 17,
  '8': 19,
  '9': 21,
  A: 1,
  B: 0,
  C: 5,
  D: 7,
  E: 9,
  F: 13,
  G: 15,
  H: 17,
  I: 19,
  J: 21,
  K: 2,
  L: 4,
  M: 18,
  N: 20,
  O: 11,
  P: 3,
  Q: 6,
  R: 8,
  S: 12,
  T: 14,
  U: 16,
  V: 10,
  W: 22,
  X: 25,
  Y: 24,
  Z: 23,
}

function evenValue(c: string): number {
  return /\d/.test(c) ? Number(c) : c.charCodeAt(0) - 65
}

/**
 * Italian codice fiscale: sixteen characters whose last one is a check letter.
 * Odd positions (1-based) use a substitution table, even positions their plain
 * alphabet value; the sum modulo 26 gives the final letter.
 */
export function codiceFiscaleChecksum(raw: string): boolean {
  const value = raw.replace(/[\s-]/g, '').toUpperCase()
  if (!/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(value)) return false

  let sum = 0
  for (let i = 0; i < 15; i++) {
    const c = value[i]
    sum += (i + 1) % 2 === 1 ? ODD[c] : evenValue(c)
  }

  return String.fromCharCode(65 + (sum % 26)) === value[15]
}

export const codiceFiscaleRule: PatternRule = {
  id: 'it.fiscal-code',
  entityType: 'IT_FISCAL_CODE',
  // Six letters, then the date block, then the town code and check letter —
  // a shape that essentially nothing else shares.
  patterns: [
    {
      name: 'Codice fiscale',
      regex: /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/gi,
      score: 0.6,
    },
  ],
  locales: ['it'],
  context: ['codice fiscale', 'cf', 'partita iva', 'contribuente'],
  description: 'Italian fiscal code (codice fiscale) with check letter',
  validate: codiceFiscaleChecksum,
  checksumMode: 'boost',
}
