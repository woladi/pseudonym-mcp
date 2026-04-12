import type { PatternRule } from '../../types.js'

export const plIbanRule: PatternRule = {
  id: 'pl.iban',
  entityType: 'IBAN',
  // PL + 2 check digits + 24 BBAN digits, optionally space-separated every 4 chars
  // e.g. PL27114020040000300201355387 or PL 27 1140 2004 0000 3002 0135 5387
  pattern: /\bPL\s*\d{2}\s*(?:\d{4}\s*){6}\b/gi,
  locales: ['pl'],
  engines: ['balanced', 'strict', 'paranoid'],
  description: 'Polish IBAN (PL prefix + 26 digits, compact or spaced)',
}
