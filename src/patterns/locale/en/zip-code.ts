import type { PatternRule } from '../../types.js'

export const usZipCodeRule: PatternRule = {
  id: 'en.zip-code',
  entityType: 'ZIP_CODE',
  // US ZIP code: 5 digits, or ZIP+4 (XXXXX-XXXX)
  pattern: /\b\d{5}(?:-\d{4})?\b/g,
  locales: ['en'],
  engines: ['paranoid'],
  description: 'US ZIP code (XXXXX or XXXXX-XXXX)',
}
