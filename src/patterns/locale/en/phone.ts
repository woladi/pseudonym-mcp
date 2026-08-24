import type { PatternRule } from '../../types.js'

export const usPhoneRule: PatternRule = {
  id: 'en.phone',
  entityType: 'PHONE',
  // US/North America phone formats:
  // +1 (XXX) XXX-XXXX, +1-XXX-XXX-XXXX, (XXX) XXX-XXXX, XXX-XXX-XXXX, XXX.XXX.XXXX
  patterns: [
    {
      name: 'Phone (US)',
      regex: /(?:\+1[\s.\-]?)?\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}\b/g,
      score: 0.5,
    },
  ],
  locales: ['en'],
  description: 'US/North America phone number in common formats',
}
