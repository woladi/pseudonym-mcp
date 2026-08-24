import type { PatternRule } from '../../types.js'

export const plPostalCodeRule: PatternRule = {
  id: 'pl.postal-code',
  entityType: 'POSTAL_CODE',
  // Polish postal code: XX-XXX (e.g. 00-001, 80-952)
  patterns: [{ name: 'Postal code (PL)', regex: /\b\d{2}-\d{3}\b/g, score: 0.1 }],
  locales: ['pl'],
  description: 'Polish postal code (XX-XXX format)',
}
