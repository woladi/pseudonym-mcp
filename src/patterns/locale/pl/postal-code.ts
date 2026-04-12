import type { PatternRule } from '../../types.js'

export const plPostalCodeRule: PatternRule = {
  id: 'pl.postal-code',
  entityType: 'POSTAL_CODE',
  // Polish postal code: XX-XXX (e.g. 00-001, 80-952)
  pattern: /\b\d{2}-\d{3}\b/g,
  locales: ['pl'],
  engines: ['paranoid'],
  description: 'Polish postal code (XX-XXX format)',
}
