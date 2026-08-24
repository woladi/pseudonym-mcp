import type { PatternRule } from '../../types.js'

export const itinRule: PatternRule = {
  id: 'en.itin',
  entityType: 'ITIN',
  // An ITIN always starts with 9 and its middle group falls in fixed ranges,
  // which is what separates it from an arbitrary nine-digit number.
  patterns: [
    {
      name: 'ITIN (grouped)',
      regex: /\b9\d{2}[- ](?:5\d|6[0-5]|7\d|8[0-8]|9[0-24-9])[- ]\d{4}\b/g,
      score: 0.6,
    },
    {
      name: 'ITIN (compact)',
      regex: /\b9\d{2}(?:5\d|6[0-5]|7\d|8[0-8]|9[0-24-9])\d{4}\b/g,
      score: 0.3,
    },
  ],
  locales: ['en'],
  context: ['itin', 'individual taxpayer', 'taxpayer identification', 'tax id', 'irs'],
  description: 'US Individual Taxpayer Identification Number (ITIN)',
}

export const einRule: PatternRule = {
  id: 'en.ein',
  entityType: 'EIN',
  // Two digits, a hyphen and seven more. No checksum exists, so the hyphenated
  // shape carries it and the label does the rest.
  patterns: [{ name: 'EIN', regex: /\b\d{2}-\d{7}\b/g, score: 0.35 }],
  locales: ['en'],
  context: ['ein', 'employer identification', 'federal tax id', 'fein', 'irs'],
  description: 'US Employer Identification Number (EIN)',
}

/**
 * ABA routing transit number: nine digits weighted 3,7,1 repeating,
 * valid when the sum is divisible by ten.
 */
export function abaChecksum(raw: string): boolean {
  const digits = raw.replace(/\D/g, '')
  if (!/^\d{9}$/.test(digits)) return false

  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1]
  const sum = digits.split('').reduce((acc, d, i) => acc + Number(d) * weights[i], 0)

  return sum % 10 === 0
}

export const abaRoutingRule: PatternRule = {
  id: 'en.aba-routing',
  entityType: 'ABA_ROUTING',
  // The leading digit of a routing number is restricted, and the checksum
  // settles the rest.
  patterns: [{ name: 'ABA routing number', regex: /\b[0-3678]\d{8}\b/g, score: 0.2 }],
  locales: ['en'],
  context: ['routing', 'aba', 'rtn', 'wire', 'ach', 'bank'],
  description: 'US ABA bank routing number with the 3-7-1 checksum',
  validate: abaChecksum,
  checksumMode: 'boost',
}

export const usPassportRule: PatternRule = {
  id: 'en.passport',
  entityType: 'PASSPORT',
  // Nine digits with nothing to distinguish them — only the label makes this
  // a passport number rather than any other reference.
  patterns: [
    { name: 'US passport', regex: /\b\d{9}\b/g, score: 0.15 },
    { name: 'US passport (next generation)', regex: /\b[A-Z]\d{8}\b/g, score: 0.15 },
  ],
  locales: ['en'],
  context: ['passport', 'passport no', 'passport number', 'travel document'],
  description: 'US passport number — context-driven, no checksum exists',
}

export const usDriverLicenseRule: PatternRule = {
  id: 'en.driver-license',
  entityType: 'DRIVER_LICENSE',
  // Formats differ per state and overlap with almost everything, so this one
  // only fires when the surrounding words say what it is.
  patterns: [
    { name: 'Driver license', regex: /\b[A-Z]\d{6,13}\b/g, score: 0.15 },
    { name: 'Driver license (numeric)', regex: /\b\d{7,9}\b/g, score: 0.05 },
  ],
  locales: ['en'],
  context: ['driver', 'license', 'licence', 'dl no', 'driving licence', 'dmv'],
  description: 'US driver license number — state formats vary, context-driven',
}
