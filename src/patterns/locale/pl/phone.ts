import type { PatternRule } from '../../types.js'

export const plPhoneRule: PatternRule = {
  id: 'pl.phone',
  entityType: 'PHONE',
  // Three alternatives:
  // 1. International prefix: +48 or 0048, then 9 digits (with optional spaces/dashes)
  // 2. 9-digit mobile starting with 4–8 (Polish numbering plan)
  // 3. Landline with area code in parens: (XX) XXX-XX-XX
  pattern:
    /(?:\+48|0048)[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{3}|\b[4-8]\d{2}[\s\-]?\d{3}[\s\-]?\d{3}\b|\(\d{2}\)[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g,
  locales: ['pl'],
  engines: ['balanced', 'strict', 'paranoid'],
  description: 'Polish phone number (+48 / 0048 prefix, 9-digit mobile, landline)',
}
