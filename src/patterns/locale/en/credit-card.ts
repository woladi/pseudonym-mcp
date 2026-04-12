import type { PatternRule } from '../../types.js'

/**
 * Luhn algorithm for credit card number validation.
 * Strips spaces and dashes, verifies the checksum digit.
 */
function luhnCheck(number: string): boolean {
  const digits = number.replace(/[\s\-]/g, '')
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

export const creditCardRule: PatternRule = {
  id: 'en.credit-card',
  entityType: 'CREDIT_CARD',
  // 13–19 digits, optionally separated by spaces or dashes in groups of 4
  // Covers Visa (4xxx), Mastercard (5[1-5]xx / 2[2-7]xx), Amex (3[47]x), Discover (6xxx)
  pattern: /\b(?:\d[ \-]*?){13,19}\b/g,
  locales: ['en'],
  engines: ['balanced', 'strict', 'paranoid'],
  description:
    'Credit card number (13–19 digits, Luhn checksum) — Visa, Mastercard, Amex, Discover',
  validate: luhnCheck,
}
