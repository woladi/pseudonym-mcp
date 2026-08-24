import type { PatternRule } from '../../types.js'

/** Letters carry their alphabet position offset by 10: A = 10 … Z = 35. */
function charValue(c: string): number {
  return /\d/.test(c) ? Number(c) : c.toUpperCase().charCodeAt(0) - 55
}

/**
 * Polish ID card (dowód osobisty): three series letters, a check digit, then
 * five digits. Weights 7,3,1 over the letters and the trailing digits; the
 * check digit itself is weighted 0 and must equal the sum modulo 10.
 */
export function idCardChecksum(raw: string): boolean {
  const value = raw.replace(/[\s-]/g, '').toUpperCase()
  if (!/^[A-Z]{3}\d{6}$/.test(value)) return false

  const weights = [7, 3, 1, 0, 7, 3, 1, 7, 3]
  const chars = value.split('')
  const sum = weights.reduce((acc, w, i) => (i === 3 ? acc : acc + w * charValue(chars[i])), 0)

  return sum % 10 === charValue(chars[3])
}

export const idCardRule: PatternRule = {
  id: 'pl.id-card',
  entityType: 'ID_CARD',
  // Three letters followed by six digits is a distinctive enough shape to
  // start mid-range; the checksum settles it either way.
  patterns: [
    { name: 'Dowód osobisty', regex: /\b[A-Z]{3}[\s-]?\d{6}\b/g, score: 0.4 },
    { name: 'Dowód osobisty (lowercase)', regex: /\b[a-z]{3}\d{6}\b/g, score: 0.15 },
  ],
  locales: ['pl'],
  context: [
    'dowód osobisty',
    'dowód',
    'dow. osobisty',
    'seria i numer',
    'nr dowodu',
    'legitymacja',
  ],
  description: 'Polish ID card number (dowód osobisty) — ABC123456 with checksum',
  validate: idCardChecksum,
}
