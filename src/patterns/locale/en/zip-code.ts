import type { PatternRule } from '../../types.js'

export const usZipCodeRule: PatternRule = {
  id: 'en.zip-code',
  entityType: 'ZIP_CODE',
  // US ZIP code: 5 digits, or ZIP+4 (XXXXX-XXXX)
  patterns: [{ name: 'ZIP code', regex: /\b\d{5}(?:-\d{4})?\b/g, score: 0.1 }],
  locales: ['en'],
  description: 'US ZIP code (XXXXX or XXXXX-XXXX)',
}
