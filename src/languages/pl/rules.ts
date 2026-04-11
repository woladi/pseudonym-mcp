import type { LanguageRules } from '../types.js'

/**
 * Validates a Polish PESEL number using the official checksum algorithm.
 * Weights: [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]
 * Check digit = (10 - (weighted_sum % 10)) % 10
 */
function peselChecksum(pesel: string): boolean {
  if (!/^\d{11}$/.test(pesel)) return false
  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]
  const digits = pesel.split('').map(Number)
  const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0)
  const check = (10 - (sum % 10)) % 10
  return check === digits[10]
}

export const PolishRules: LanguageRules = {
  patterns: [
    {
      tag: 'PESEL',
      // Matches exactly 11 consecutive digits NOT adjacent to another digit
      regex: /(?<!\d)\d{11}(?!\d)/g,
      validate: peselChecksum,
    },
    {
      tag: 'IBAN',
      // Matches PL + 26 digits (2 check + 24 BBAN), optionally space-separated every 4 chars
      // e.g. PL27114020040000300201355387 or PL 27 1140 2004 0000 3002 0135 5387
      // Structure: PL + \d{2} (check) + (\d{4}){6} (24 BBAN) = 26 total digits
      regex: /\bPL\s*\d{2}\s*(?:\d{4}\s*){6}\b/gi,
    },
    {
      tag: 'EMAIL',
      regex: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
    },
    {
      tag: 'PHONE',
      // Three alternatives:
      // 1. International prefix: +48 or 0048, then 9 digits (with optional spaces/dashes)
      // 2. 9-digit mobile starting with 4–8 (Polish numbering plan)
      // 3. Landline with area code in parens: (XX) XXX-XX-XX
      regex:
        /(?:\+48|0048)[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{3}|\b[4-8]\d{2}[\s\-]?\d{3}[\s\-]?\d{3}\b|\(\d{2}\)[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g,
    },
  ],
}
