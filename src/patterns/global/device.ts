import type { PatternRule } from '../types.js'

export const macRule: PatternRule = {
  id: 'global.mac',
  entityType: 'MAC',
  patterns: [
    {
      name: 'MAC (colon/hyphen)',
      regex: /\b[0-9A-Fa-f]{2}([:-])(?:[0-9A-Fa-f]{2}\1){4}[0-9A-Fa-f]{2}\b/g,
      score: 0.5,
    },
    {
      name: 'MAC (Cisco)',
      regex: /\b[0-9A-Fa-f]{4}\.[0-9A-Fa-f]{4}\.[0-9A-Fa-f]{4}\b/g,
      score: 0.45,
    },
  ],
  locales: null,
  context: ['mac', 'mac address', 'hardware address', 'adres mac', 'ethernet'],
  description: 'MAC hardware address',
}

export const uuidRule: PatternRule = {
  id: 'global.uuid',
  entityType: 'UUID',
  patterns: [
    {
      name: 'UUID',
      regex: /\b[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\b/g,
      score: 0.5,
    },
  ],
  locales: null,
  context: ['uuid', 'guid', 'identyfikator', 'unique identifier'],
  description: 'UUID / GUID',
}

/** IMEI: fifteen digits ending in a Luhn check digit. */
export function imeiChecksum(raw: string): boolean {
  const digits = raw.replace(/\D/g, '')
  if (!/^\d{15}$/.test(digits)) return false

  let sum = 0
  for (let i = 0; i < 15; i++) {
    let value = Number(digits[i])
    if (i % 2 === 1) {
      value *= 2
      if (value > 9) value -= 9
    }
    sum += value
  }

  return sum % 10 === 0
}

export const imeiRule: PatternRule = {
  id: 'global.imei',
  entityType: 'IMEI',
  patterns: [
    { name: 'IMEI (grouped)', regex: /\b\d{2}[- ]\d{6}[- ]\d{6}[- ]?\d?\b/g, score: 0.4 },
    { name: 'IMEI (compact)', regex: /\b\d{15}\b/g, score: 0.2 },
  ],
  locales: null,
  context: ['imei', 'telefon', 'phone', 'device', 'urządzenie'],
  description: 'Mobile device IMEI with Luhn check digit',
  validate: imeiChecksum,
  checksumMode: 'boost',
}

const VIN_VALUES: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9,
}
const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]

/** ISO 3779 vehicle identification number: the ninth character is a mod-11 check. */
export function vinChecksum(raw: string): boolean {
  const value = raw.toUpperCase()
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(value)) return false

  let sum = 0
  for (let i = 0; i < 17; i++) {
    const c = value[i]
    const v = /\d/.test(c) ? Number(c) : VIN_VALUES[c]
    if (v === undefined) return false
    sum += v * VIN_WEIGHTS[i]
  }

  const remainder = sum % 11
  const expected = remainder === 10 ? 'X' : String(remainder)

  return expected === value[8]
}

export const vinRule: PatternRule = {
  id: 'global.vin',
  entityType: 'VIN',
  patterns: [{ name: 'VIN', regex: /\b[A-HJ-NPR-Z0-9]{17}\b/gi, score: 0.35 }],
  locales: null,
  context: ['vin', 'nadwozie', 'numer nadwozia', 'vehicle', 'pojazd', 'chassis'],
  description: 'Vehicle identification number (VIN) with the ISO 3779 check digit',
  validate: vinChecksum,
  checksumMode: 'boost',
}
