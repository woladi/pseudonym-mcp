import type { PatternRule } from '../../types.js'

export const plIbanRule: PatternRule = {
  id: 'pl.iban',
  entityType: 'IBAN',
  // Three alternatives (longest/most specific first):
  // 1. PL prefix: PL + 26 digits, compact or spaced every 4 (e.g. PL27... or PL 27 1140 ...)
  // 2. Spaced without PL: 2 check digits + 6 × (space + 4 digits) — "61 1090 1014 ..."
  // 3. Compact without PL: exactly 26 consecutive digits
  pattern: /\bPL\s*\d{2}\s*(?:\d{4}\s*){6}\b|\b\d{2}(?:\s\d{4}){6}\b|\b\d{26}\b/gi,
  locales: ['pl'],
  engines: ['balanced', 'strict', 'paranoid'],
  description: 'Polish IBAN — PL-prefixed or bare 26 digits (compact or spaced every 4)',
}
