import type { PatternRule } from '../../types.js'

export const peselRule: PatternRule = {
  id: 'pl.pesel',
  entityType: 'PESEL',
  // Matches exactly 11 consecutive digits (word-bounded).
  // Negative lookbehind for '+' prevents matching the digit portion of a
  // compact international phone like "+48601234567" (which is 11 digits after '+').
  // The label "PESEL" / "nr PESEL:" stays in the text — only the digits are replaced.
  pattern: /(?<!\+)\b\d{11}\b/g,
  locales: ['pl'],
  engines: ['balanced', 'strict', 'paranoid'],
  description: 'Polish national identification number (PESEL) — exactly 11 consecutive digits',
}
