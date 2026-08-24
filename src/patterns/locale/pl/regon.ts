import type { PatternRule } from '../../types.js'

const WEIGHTS_9 = [8, 9, 2, 3, 4, 5, 6, 7]
const WEIGHTS_14 = [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8]

function modulo11(digits: number[], weights: number[]): number {
  const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0)
  const rest = sum % 11
  return rest === 10 ? 0 : rest
}

/**
 * REGON — the statistical business register number issued by GUS.
 * Nine digits for the entity, fourteen for a local unit; both end in a
 * modulo-11 check digit, with a remainder of 10 folded to 0.
 */
export function regonChecksum(raw: string): boolean {
  const digits = raw.replace(/\D/g, '').split('').map(Number)
  if (digits.length === 9) return modulo11(digits, WEIGHTS_9) === digits[8]
  if (digits.length === 14) return modulo11(digits, WEIGHTS_14) === digits[13]
  return false
}

export const regonRule: PatternRule = {
  id: 'pl.regon',
  entityType: 'REGON',
  // Nine digits collide with Polish mobile numbers and fourteen with plenty of
  // other long identifiers, so both variants start low and lean on the
  // checksum and on the word "REGON" standing next to them.
  patterns: [
    { name: 'REGON (14 digits)', regex: /\b\d{14}\b/g, score: 0.25 },
    { name: 'REGON (9 digits)', regex: /\b\d{9}\b/g, score: 0.15 },
  ],
  locales: ['pl'],
  context: ['regon', 'nr regon', 'numer regon', 'gus'],
  description: 'Polish business register number (REGON) — 9 or 14 digits with Mod-11 checksum',
  validate: regonChecksum,
}
