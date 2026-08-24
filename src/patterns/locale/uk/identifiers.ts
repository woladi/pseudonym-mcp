import type { PatternRule } from '../../types.js'

/**
 * NHS number: ten digits where the last is a modulo-11 check.
 * Weights run 10 down to 2; a remainder giving 10 is invalid.
 */
export function nhsChecksum(raw: string): boolean {
  const digits = raw.replace(/\D/g, '')
  if (!/^\d{10}$/.test(digits)) return false

  const sum = digits
    .slice(0, 9)
    .split('')
    .reduce((acc, d, i) => acc + Number(d) * (10 - i), 0)
  const check = 11 - (sum % 11)
  const expected = check === 11 ? 0 : check

  return expected !== 10 && expected === Number(digits[9])
}

export const nhsRule: PatternRule = {
  id: 'uk.nhs',
  entityType: 'UK_NHS',
  patterns: [
    { name: 'NHS number (grouped)', regex: /\b\d{3}[\s-]\d{3}[\s-]\d{4}\b/g, score: 0.4 },
    { name: 'NHS number (compact)', regex: /\b\d{10}\b/g, score: 0.15 },
  ],
  locales: ['uk'],
  context: ['nhs', 'nhs number', 'patient', 'gp'],
  description: 'UK NHS number — ten digits with a modulo-11 check digit',
  validate: nhsChecksum,
  checksumMode: 'boost',
}

export const ninoRule: PatternRule = {
  id: 'uk.nino',
  entityType: 'UK_NINO',
  // No checksum exists; the prefix exclusions are the only structural check,
  // which is why the shape itself has to carry the score.
  patterns: [
    {
      name: 'National Insurance number',
      regex:
        /\b(?!BG|GB|NK|KN|NT|TN|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z][\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}[\s-]?[A-D]\b/gi,
      score: 0.55,
    },
  ],
  locales: ['uk'],
  context: ['national insurance', 'ni number', 'nino'],
  description: 'UK National Insurance number (NINO)',
}

export const ukPostcodeRule: PatternRule = {
  id: 'uk.postcode',
  entityType: 'POSTAL_CODE',
  patterns: [
    {
      name: 'UK postcode',
      regex: /\b[A-Z]{1,2}\d[A-Z\d]?[\s]?\d[A-Z]{2}\b/gi,
      score: 0.3,
    },
  ],
  locales: ['uk'],
  context: ['postcode', 'post code', 'address'],
  description: 'UK postcode',
}
