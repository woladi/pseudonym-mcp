import type { PatternRule } from '../types.js'

export const globalIbanRule: PatternRule = {
  id: 'global.iban',
  entityType: 'IBAN',
  // Generic IBAN: 2-letter country code + 2 check digits + up to 30 alphanumeric chars
  // Covers all IBAN countries (max length 34 chars)
  pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/g,
  locales: null,
  engines: ['strict', 'paranoid'],
  description: 'Generic IBAN (any country, compact format)',
}
