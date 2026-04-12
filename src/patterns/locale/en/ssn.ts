import type { PatternRule } from '../../types.js'

/**
 * Basic SSN area-number validation.
 * Rejects known invalid patterns: area 000, 666, 900-999.
 */
function ssnValidate(ssn: string): boolean {
  const clean = ssn.replace(/[\s\-]/g, '')
  if (!/^\d{9}$/.test(clean)) return false
  const area = parseInt(clean.substring(0, 3), 10)
  const group = parseInt(clean.substring(3, 5), 10)
  const serial = parseInt(clean.substring(5, 9), 10)
  if (area === 0 || area === 666 || area >= 900) return false
  if (group === 0) return false
  if (serial === 0) return false
  return true
}

export const ssnRule: PatternRule = {
  id: 'en.ssn',
  entityType: 'SSN',
  // US Social Security Number: XXX-XX-XXXX (required dashes to avoid false positives)
  pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
  locales: ['en'],
  engines: ['balanced', 'strict', 'paranoid'],
  description: 'US Social Security Number (XXX-XX-XXXX) with area-number validation',
  validate: ssnValidate,
}
