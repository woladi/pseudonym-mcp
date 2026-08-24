import type { PatternRule } from '../types.js'

export const urlRule: PatternRule = {
  id: 'global.url',
  entityType: 'URL',
  // http/https URLs — stops at whitespace and common delimiter characters
  patterns: [{ name: 'URL', regex: /https?:\/\/[^\s<>"{}\\|^[\]]+/g, score: 0.1 }],
  locales: null,
  description: 'HTTP/HTTPS URL',
}
