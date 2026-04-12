import type { PatternRule } from '../types.js'

export const emailRule: PatternRule = {
  id: 'global.email',
  entityType: 'EMAIL',
  pattern: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
  locales: null,
  engines: ['balanced', 'strict', 'paranoid'],
  description: 'Standard email address (RFC 5321-compatible)',
}
