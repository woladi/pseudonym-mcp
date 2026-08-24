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
  // The dashed form is unmistakable. The others — dotted, spaced, or nine bare
  // digits — are common enough shapes that they need the label nearby before
  // anything is masked.
  patterns: [
    { name: 'SSN (dashed)', regex: /\b\d{3}-\d{2}-\d{4}\b/g, score: 0.5 },
    { name: 'SSN (separated)', regex: /\b\d{3}[ .]\d{2}[ .]\d{4}\b/g, score: 0.3 },
    { name: 'SSN (compact)', regex: /\b\d{9}\b/g, score: 0.05 },
  ],
  locales: ['en'],
  context: ['ssn', 'social security', 'social security number', 'ss#', 'ssid'],
  description: 'US Social Security Number (XXX-XX-XXXX) with area-number validation',
  validate: ssnValidate,
  // Area/group/serial ranges rule out impossible numbers; they do not make a
  // possible one an SSN, so this gates without promoting.
  checksumMode: 'gate',
}
