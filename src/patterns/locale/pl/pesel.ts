import type { PatternRule } from '../../types.js'

/**
 * PESEL check digit: weights 1,3,7,9 repeating over the first ten digits,
 * check = (10 - sum % 10) % 10.
 * https://en.wikipedia.org/wiki/PESEL#Check_digit
 */
export function peselChecksum(raw: string): boolean {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 11) return false
  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]
  const d = digits.split('').map(Number)
  const sum = weights.reduce((acc, w, i) => acc + w * d[i], 0)
  return (10 - (sum % 10)) % 10 === d[10]
}

export const peselRule: PatternRule = {
  id: 'pl.pesel',
  entityType: 'PESEL',
  // Two variants, deliberately overlapping. The first encodes the date part
  // (month carries the century: 01-12, 21-32, 41-52, 61-72, 81-92), so it is
  // already unlikely to be a coincidence. The second is any eleven digits and
  // leans on the checksum and on the word "PESEL" nearby to earn its score —
  // that keeps recall on real documents without masking every long number.
  // Negative lookbehind for '+' avoids the digits of "+48601234567".
  patterns: [
    {
      name: 'PESEL (date-shaped)',
      regex: /(?<!\+)\b\d{2}(?:[02468][1-9]|[13579][012])(?:0[1-9]|[12]\d|3[01])\d{5}\b/g,
      score: 0.5,
    },
    { name: 'PESEL (11 digits)', regex: /(?<!\+)\b\d{11}\b/g, score: 0.5 },
  ],
  locales: ['pl'],
  context: ['pesel', 'nr pesel', 'numer pesel', 'evidence number', 'national id'],
  description: 'Polish national identification number (PESEL) — 11 digits with Mod-10 checksum',
  validate: peselChecksum,
  // A PESEL that fails its checksum is still someone's identifier as far as a
  // leak is concerned — the checksum earns confidence, it does not gate.
  checksumMode: 'boost',
}
