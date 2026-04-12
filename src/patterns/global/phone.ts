import type { PatternRule } from '../types.js'

export const globalPhoneRule: PatternRule = {
  id: 'global.phone',
  entityType: 'PHONE',
  // Generic international format: +CC followed by digits/spaces/dashes
  // e.g. +1-800-555-1234, +44 20 7946 0958, +33 1 23 45 67 89
  pattern: /\+\d{1,3}[\s.\-]?\(?\d{1,4}\)?(?:[\s.\-]?\d{1,4}){2,4}\b/g,
  locales: null,
  engines: ['strict', 'paranoid'],
  description: 'Generic international phone number with country code prefix',
}
