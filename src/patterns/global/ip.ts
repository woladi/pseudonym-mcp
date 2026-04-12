import type { PatternRule } from '../types.js'

export const ipv4Rule: PatternRule = {
  id: 'global.ipv4',
  entityType: 'IP',
  // IPv4: four octets 0–255 separated by dots, not adjacent to other digits/dots
  pattern:
    /\b(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\b/g,
  locales: null,
  engines: ['strict', 'paranoid'],
  description: 'IPv4 address (0.0.0.0 – 255.255.255.255)',
}

export const ipv6Rule: PatternRule = {
  id: 'global.ipv6',
  entityType: 'IP',
  // Full or compressed IPv6: groups of 1–4 hex digits separated by colons
  // Handles :: abbreviation and mixed IPv4-in-IPv6 forms at a basic level
  pattern: /\b(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}\b/g,
  locales: null,
  engines: ['paranoid'],
  description: 'IPv6 address (basic hex-colon format)',
}
