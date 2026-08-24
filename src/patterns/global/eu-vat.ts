import type { PatternRule } from '../types.js'
import { nipChecksum } from '../locale/pl/nip.js'

/**
 * VAT identification number formats for every EU member state (plus the
 * Northern Ireland XI prefix), as published in the VIES specification.
 */
export const EU_VAT_FORMATS: Record<string, RegExp> = {
  AT: /^U\d{8}$/,
  BE: /^0\d{9}$/,
  BG: /^\d{9,10}$/,
  CY: /^\d{8}[A-Z]$/,
  CZ: /^\d{8,10}$/,
  DE: /^\d{9}$/,
  DK: /^\d{8}$/,
  EE: /^\d{9}$/,
  EL: /^\d{9}$/,
  ES: /^[A-Z0-9]\d{7}[A-Z0-9]$/,
  FI: /^\d{8}$/,
  FR: /^[A-Z0-9]{2}\d{9}$/,
  HR: /^\d{11}$/,
  HU: /^\d{8}$/,
  IE: /^(?:\d{7}[A-W][A-I]?|\d[A-Z+*]\d{5}[A-W])$/,
  IT: /^\d{11}$/,
  LT: /^(?:\d{9}|\d{12})$/,
  LU: /^\d{8}$/,
  LV: /^\d{11}$/,
  MT: /^\d{8}$/,
  NL: /^\d{9}B\d{2}$/,
  PL: /^\d{10}$/,
  PT: /^\d{9}$/,
  RO: /^\d{2,10}$/,
  SE: /^\d{12}$/,
  SI: /^\d{8}$/,
  SK: /^\d{10}$/,
  XI: /^(?:\d{9}|\d{12}|(?:GD|HA)\d{3})$/,
}

/** Modulo-11 with descending weights, used by several member states. */
function mod11(digits: number[], weights: number[], modulus = 11): number {
  return digits.reduce((acc, d, i) => acc + d * weights[i], 0) % modulus
}

/**
 * Per-country check digits, for the member states worth verifying: the big
 * trading partners and the formats that would otherwise match almost anything.
 * Countries without an entry are accepted on format alone.
 */
const CHECKSUMS: Record<string, (body: string) => boolean> = {
  PL: (body) => nipChecksum(body),

  // Italy: Luhn over eleven digits.
  IT: (body) => {
    const d = body.split('').map(Number)
    let sum = 0
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) {
        sum += d[i]
      } else {
        const doubled = d[i] * 2
        sum += doubled > 9 ? doubled - 9 : doubled
      }
    }
    return (10 - (sum % 10)) % 10 === d[10]
  },

  // Netherlands: weights 9..2 over the first eight digits, modulo 11.
  NL: (body) => {
    const d = body.slice(0, 9).split('').map(Number)
    const sum = [9, 8, 7, 6, 5, 4, 3, 2].reduce((acc, w, i) => acc + w * d[i], 0)
    return sum % 11 === d[8]
  },

  // Slovenia: weights 8..2, remainder subtracted from 11, 10 folded to 0.
  SI: (body) => {
    const d = body.split('').map(Number)
    const rest = 11 - mod11(d.slice(0, 7), [8, 7, 6, 5, 4, 3, 2])
    const check = rest === 11 ? 0 : rest
    return check !== 10 && check === d[7]
  },

  // Luxembourg: the first six digits modulo 89.
  LU: (body) => Number(body.slice(0, 6)) % 89 === Number(body.slice(6, 8)),
}

/**
 * Validate an EU VAT number: country prefix, national format, and — where one
 * exists and is worth the certainty — the national check digit.
 */
export function euVatChecksum(raw: string): boolean {
  const value = raw.replace(/[\s.-]/g, '').toUpperCase()
  const country = value.slice(0, 2)
  const body = value.slice(2)

  const format = EU_VAT_FORMATS[country]
  if (!format || !format.test(body)) return false

  const checksum = CHECKSUMS[country]
  return checksum ? checksum(body) : true
}

export const euVatRule: PatternRule = {
  id: 'global.eu-vat',
  entityType: 'VAT_ID',
  // A two-letter prefix followed by an identifier body is a distinctive shape,
  // but it also describes plenty of order references — the national format and
  // check digit are what make it a VAT number.
  patterns: [
    {
      name: 'EU VAT',
      regex:
        /\b(?:AT|BE|BG|CY|CZ|DE|DK|EE|EL|ES|FI|FR|HR|HU|IE|IT|LT|LU|LV|MT|NL|PL|PT|RO|SE|SI|SK|XI)[\s.-]?[A-Z0-9][A-Z0-9\s.-]{5,13}[A-Z0-9]\b/g,
      score: 0.35,
    },
  ],
  locales: null,
  context: ['vat', 'vat id', 'vat no', 'nip', 'ust-idnr', 'partita iva', 'tva', 'btw', 'podatnik'],
  description: 'EU VAT identification number — per-country format plus national check digit',
  validate: euVatChecksum,
}
