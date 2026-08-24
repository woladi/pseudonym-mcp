import type { PatternRule } from '../../types.js'

/**
 * French social security number (NIR / numéro de sécurité sociale): thirteen
 * digits plus a two-digit key equal to 97 minus the number modulo 97. Corsican
 * departments write 2A and 2B, which map to 19 and 18 before the arithmetic.
 */
export function nirChecksum(raw: string): boolean {
  const value = raw.replace(/[\s.-]/g, '').toUpperCase()
  if (!/^[12]\d{2}(?:0\d|1[0-2]|20)(?:\d{2}|2[AB])\d{6}$/.test(value.slice(0, 13))) return false
  if (!/^\d{2}$/.test(value.slice(13, 15)) || value.length !== 15) return false

  const body = value.slice(0, 13).replace('2A', '19').replace('2B', '18')
  const key = 97 - (Number(body) % 97)

  return key === Number(value.slice(13, 15))
}

export const frNirRule: PatternRule = {
  id: 'fr.nir',
  entityType: 'FR_NIR',
  patterns: [
    {
      name: 'NIR',
      regex:
        /\b[12][\s.]?\d{2}[\s.]?\d{2}[\s.]?(?:\d{2}|2[AB])[\s.]?\d{3}[\s.]?\d{3}[\s.]?\d{2}\b/gi,
      score: 0.5,
    },
  ],
  locales: ['fr'],
  context: ['sécurité sociale', 'numéro de sécurité sociale', 'nir', 'insee', 'carte vitale'],
  description: 'French social security number (NIR) with modulo-97 key',
  validate: nirChecksum,
  checksumMode: 'boost',
}
