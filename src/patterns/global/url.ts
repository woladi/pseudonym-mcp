import type { PatternRule } from '../types.js'

export const urlRule: PatternRule = {
  id: 'global.url',
  entityType: 'URL',
  // http/https URLs — stops at whitespace and common delimiter characters
  pattern: /https?:\/\/[^\s<>"{}\\|^[\]]+/g,
  locales: null,
  engines: ['paranoid'],
  description: 'HTTP/HTTPS URL',
}
