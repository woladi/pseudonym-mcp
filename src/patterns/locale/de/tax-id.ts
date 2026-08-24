import type { PatternRule } from '../../types.js'

/**
 * German Steueridentifikationsnummer: eleven digits, never starting with zero,
 * no digit repeated more than three times in the first ten (BZSt rule since
 * 2016), and an ISO 7064 Mod 11,10 check digit.
 */
export function deTaxIdChecksum(raw: string): boolean {
  const digits = raw.replace(/\D/g, '')
  if (!/^[1-9]\d{10}$/.test(digits)) return false

  const counts = new Map<string, number>()
  for (const d of digits.slice(0, 10)) counts.set(d, (counts.get(d) ?? 0) + 1)
  if (Math.max(...counts.values()) > 3) return false

  let product = 10
  for (let i = 0; i < 10; i++) {
    const total = (Number(digits[i]) + product) % 10 || 10
    product = (total * 2) % 11
  }
  const check = 11 - product

  return (check === 10 ? 0 : check) === Number(digits[10])
}

export const deTaxIdRule: PatternRule = {
  id: 'de.tax-id',
  entityType: 'DE_TAX_ID',
  patterns: [{ name: 'Steuer-ID', regex: /\b[1-9]\d{10}\b/g, score: 0.3 }],
  locales: ['de'],
  context: [
    'steueridentifikationsnummer',
    'steuer-id',
    'steuerid',
    'steuerliche identifikationsnummer',
    'idnr',
    'steuer-idnr',
    'bzst',
  ],
  description: 'German tax identification number (Steuer-IdNr.) — ISO 7064 Mod 11,10',
  validate: deTaxIdChecksum,
  checksumMode: 'boost',
}

export const dePostalCodeRule: PatternRule = {
  id: 'de.postal-code',
  entityType: 'POSTAL_CODE',
  patterns: [{ name: 'PLZ', regex: /\b\d{5}\b/g, score: 0.1 }],
  locales: ['de'],
  context: ['plz', 'postleitzahl', 'anschrift', 'wohnhaft'],
  description: 'German postal code (PLZ) — five digits, context-driven',
}
