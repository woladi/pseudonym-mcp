import type { PatternRule } from '../../types.js'
import { ibanChecksum } from '../../global/iban.js'

/**
 * Polish accounts are written both as a full IBAN and as a bare 26-digit NRB.
 * The NRB is an IBAN missing its country prefix, so restore it before checking.
 */
export function plAccountChecksum(raw: string): boolean {
  const value = raw.replace(/[\s-]/g, '').toUpperCase()
  return ibanChecksum(/^\d{26}$/.test(value) ? `PL${value}` : value)
}

export const plIbanRule: PatternRule = {
  id: 'pl.iban',
  entityType: 'IBAN',
  // Three alternatives (longest/most specific first):
  // 1. PL prefix: PL + 26 digits, compact or spaced every 4 (e.g. PL27... or PL 27 1140 ...)
  // 2. Spaced without PL: 2 check digits + 6 × (space + 4 digits) — "61 1090 1014 ..."
  // 3. Compact without PL: exactly 26 consecutive digits
  patterns: [
    {
      name: 'IBAN (PL)',
      regex: /\bPL\s*\d{2}\s*(?:\d{4}\s*){6}\b|\b\d{2}(?:\s\d{4}){6}\b|\b\d{26}\b/gi,
      score: 0.5,
    },
  ],
  locales: ['pl'],
  description: 'Polish IBAN or bare 26-digit NRB, validated by mod-97 after restoring the prefix',
  validate: plAccountChecksum,
  checksumMode: 'boost',
}
