import type { PatternRule } from '../../types.js'

export const plPhoneRule: PatternRule = {
  id: 'pl.phone',
  entityType: 'PHONE',
  // Four alternatives:
  // 1. International prefix: +48 or 0048, then exactly 9 digits in any grouping
  // 2. 9-digit mobile starting with 4–8 (Polish numbering plan)
  // 3. Landline with area code in parens: (XX) XXX-XX-XX
  // 4. Landline without prefix: 2-digit area code + 7 digits (XX XXX XX XX or XX XXXXXXX)
  pattern:
    /(?:\+48|0048)[\s\-]?(?:\d[\s\-]?){8}\d(?!\d)|\b[4-8]\d{2}[\s\-]?\d{3}[\s\-]?\d{3}\b|\(\d{2}\)[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}|\b[1-9]\d[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}\b/g,
  locales: ['pl'],
  engines: ['balanced', 'strict', 'paranoid'],
  description: 'Polish phone number (+48 / 0048 prefix, 9-digit mobile, landline)',
}