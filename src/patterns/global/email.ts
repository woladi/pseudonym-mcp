import type { PatternRule } from '../types.js'

export const emailRule: PatternRule = {
  id: 'global.email',
  entityType: 'EMAIL',
  patterns: [
    {
      name: 'Email',
      regex: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
      score: 0.5,
    },
  ],
  locales: null,
  description: 'Standard email address (RFC 5321-compatible)',
}
