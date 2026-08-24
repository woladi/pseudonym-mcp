import type { PatternRule } from '../../types.js'

// Official character table for the land register check digit.
const CHAR_VALUES: Record<string, number> = {
  X: 10,
  A: 11,
  B: 12,
  C: 13,
  D: 14,
  E: 15,
  F: 16,
  G: 17,
  H: 18,
  I: 19,
  J: 20,
  K: 21,
  L: 22,
  M: 23,
  N: 24,
  O: 25,
  P: 26,
  R: 27,
  S: 28,
  T: 29,
  U: 30,
  W: 31,
  Y: 32,
  Z: 33,
}

function charValue(c: string): number | null {
  if (/\d/.test(c)) return Number(c)
  return CHAR_VALUES[c.toUpperCase()] ?? null
}

/**
 * Land and mortgage register number (numer księgi wieczystej):
 * a four-character court code, an eight-digit number and a check digit,
 * written KRAKOW/00012345/6 in full or WA1M/00012345/6 in the code form.
 * Weights cycle 1,3,7 over the twelve leading characters, sum modulo 10.
 */
export function landRegisterChecksum(raw: string): boolean {
  const value = raw.replace(/\s/g, '').toUpperCase()
  const match = /^([0-9A-Z]{4})\/(\d{8})\/(\d)$/.exec(value)
  if (!match) return false

  const body = `${match[1]}${match[2]}`
  const weights = [1, 3, 7]
  let sum = 0
  for (let i = 0; i < body.length; i++) {
    const v = charValue(body[i])
    if (v === null) return false
    sum += v * weights[i % 3]
  }

  return sum % 10 === Number(match[3])
}

export const landRegisterRule: PatternRule = {
  id: 'pl.land-register',
  entityType: 'KW',
  // The shape (court code / eight digits / digit) is distinctive on its own —
  // little else in a legal document looks like it.
  patterns: [
    { name: 'Księga wieczysta', regex: /\b[0-9A-Z]{4}\/\d{8}\/\d\b/g, score: 0.55 },
    { name: 'Księga wieczysta (lowercase)', regex: /\b[0-9a-z]{4}\/\d{8}\/\d\b/g, score: 0.3 },
  ],
  locales: ['pl'],
  context: ['księga wieczysta', 'kw', 'nr kw', 'numer księgi', 'sąd rejonowy', 'hipoteka'],
  description: 'Polish land and mortgage register number (księga wieczysta) with check digit',
  validate: landRegisterChecksum,
}
