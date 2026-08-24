import type { PatternRule } from '../../types.js'

const CHECK_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'

/** Spanish DNI/NIF: eight digits and a letter taken from the number modulo 23. */
export function nifChecksum(raw: string): boolean {
  const value = raw.replace(/[\s-]/g, '').toUpperCase()
  if (!/^\d{8}[A-Z]$/.test(value)) return false
  return CHECK_LETTERS[Number(value.slice(0, 8)) % 23] === value[8]
}

/** Spanish NIE: the same rule after mapping the leading X/Y/Z to 0/1/2. */
export function nieChecksum(raw: string): boolean {
  const value = raw.replace(/[\s-]/g, '').toUpperCase()
  if (!/^[XYZ]\d{7}[A-Z]$/.test(value)) return false
  const prefix = 'XYZ'.indexOf(value[0])
  return CHECK_LETTERS[Number(`${prefix}${value.slice(1, 8)}`) % 23] === value[8]
}

export const esNifRule: PatternRule = {
  id: 'es.nif',
  entityType: 'ES_NIF',
  patterns: [{ name: 'DNI / NIF', regex: /\b\d{8}[\s-]?[A-Z]\b/g, score: 0.35 }],
  locales: ['es'],
  context: ['dni', 'nif', 'documento nacional de identidad', 'identificación'],
  description: 'Spanish national ID number (DNI/NIF) with modulo-23 check letter',
  validate: nifChecksum,
  checksumMode: 'boost',
}

export const esNieRule: PatternRule = {
  id: 'es.nie',
  entityType: 'ES_NIE',
  patterns: [{ name: 'NIE', regex: /\b[XYZ][\s-]?\d{7}[\s-]?[A-Z]\b/g, score: 0.45 }],
  locales: ['es'],
  context: ['nie', 'número de identificación de extranjero', 'extranjero'],
  description: 'Spanish foreigner ID number (NIE) with modulo-23 check letter',
  validate: nieChecksum,
  checksumMode: 'boost',
}
