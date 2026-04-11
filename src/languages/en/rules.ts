import type { LanguageRules } from '../types.js'

/**
 * Luhn algorithm for credit card number validation.
 * Strips spaces and dashes, verifies the checksum digit.
 */
function luhnCheck(number: string): boolean {
  const digits = number.replace(/[\s-]/g, '')
  if (!/^\d{13,19}$/.test(digits)) return false

  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i])
    if (double) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    double = !double
  }
  return sum % 10 === 0
}

/**
 * Basic SSN area-number validation.
 * Rejects known invalid patterns: area 000, 666, 900-999.
 */
function ssnValidate(ssn: string): boolean {
  const clean = ssn.replace(/[\s-]/g, '')
  if (!/^\d{9}$/.test(clean)) return false
  const area = parseInt(clean.substring(0, 3), 10)
  const group = parseInt(clean.substring(3, 5), 10)
  const serial = parseInt(clean.substring(5, 9), 10)
  if (area === 0 || area === 666 || area >= 900) return false
  if (group === 0) return false
  if (serial === 0) return false
  return true
}

export const EnglishRules: LanguageRules = {
  patterns: [
    {
      tag: 'SSN',
      // US Social Security Number: XXX-XX-XXXX (with required dashes to avoid false positives)
      regex: /\b\d{3}-\d{2}-\d{4}\b/g,
      validate: ssnValidate,
    },
    {
      tag: 'CREDIT_CARD',
      // 13–19 digits, optionally separated by spaces or dashes in groups of 4
      // Covers Visa (4xxx), Mastercard (5[1-5]xx, 2[2-7]xx), Amex (3[47]x), Discover (6xxx)
      regex: /\b(?:\d[ -]*?){13,19}\b/g,
      validate: luhnCheck,
    },
    {
      tag: 'EMAIL',
      regex: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
    },
    {
      tag: 'PHONE',
      // US/international phone formats:
      // +1 (XXX) XXX-XXXX, +1-XXX-XXX-XXXX, (XXX) XXX-XXXX, XXX-XXX-XXXX, XXX.XXX.XXXX
      regex: /(?:\+1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g,
    },
  ],
}
