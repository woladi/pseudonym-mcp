import type { PatternRule } from '../../types.js'

export const krsRule: PatternRule = {
  id: 'pl.krs',
  entityType: 'KRS',
  // A KRS number is a zero-padded sequence with no check digit, so ten digits
  // on their own say nothing. Only the label makes this identifiable, which is
  // exactly how it is written in company filings ("KRS 0000123456").
  patterns: [{ name: 'KRS', regex: /\b0{2}\d{8}\b/g, score: 0.2 }],
  locales: ['pl'],
  context: ['krs', 'nr krs', 'numer krs', 'rejestr sądowy', 'krajowy rejestr sądowy'],
  description: 'Polish court register number (KRS) — 10 digits, no checksum, context-driven',
}
