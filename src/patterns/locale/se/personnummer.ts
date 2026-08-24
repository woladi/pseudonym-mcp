import type { PatternRule } from '../../types.js'

/** Luhn over the ten significant digits of a Swedish personnummer. */
export function personnummerChecksum(raw: string): boolean {
  let digits = raw.replace(/\D/g, '')
  if (digits.length === 12) digits = digits.slice(2)
  if (!/^\d{10}$/.test(digits)) return false

  let sum = 0
  for (let i = 0; i < 10; i++) {
    let value = Number(digits[i])
    if (i % 2 === 0) {
      value *= 2
      if (value > 9) value -= 9
    }
    sum += value
  }

  return sum % 10 === 0
}

export const personnummerRule: PatternRule = {
  id: 'se.personnummer',
  entityType: 'SE_PERSONNUMMER',
  patterns: [
    { name: 'Personnummer (dashed)', regex: /\b(?:\d{2})?\d{6}[-+]\d{4}\b/g, score: 0.5 },
    { name: 'Personnummer (compact)', regex: /\b(?:\d{10}|\d{12})\b/g, score: 0.15 },
  ],
  locales: ['se'],
  context: ['personnummer', 'samordningsnummer', 'personal identity number'],
  description: 'Swedish personal identity number (personnummer) validated with Luhn',
  validate: personnummerChecksum,
  checksumMode: 'boost',
}
