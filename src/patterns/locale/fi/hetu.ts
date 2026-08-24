import type { PatternRule } from '../../types.js'

const CHECK_CHARS = '0123456789ABCDEFHJKLMNPRSTUVWXY'

/**
 * Finnish personal identity code (henkilötunnus): date, a century sign, a
 * three-digit individual number, and a check character indexed by the
 * nine-digit number modulo 31.
 */
export function hetuChecksum(raw: string): boolean {
  const value = raw.replace(/\s/g, '').toUpperCase()
  const match = /^(\d{6})([-+ABCDEFYXWVU])(\d{3})([0-9A-Y])$/.exec(value)
  if (!match) return false

  const number = Number(`${match[1]}${match[3]}`)

  return CHECK_CHARS[number % 31] === match[4]
}

export const hetuRule: PatternRule = {
  id: 'fi.hetu',
  entityType: 'FI_HETU',
  patterns: [
    {
      name: 'Henkilötunnus',
      regex: /\b\d{6}[-+ABCDEFYXWVU]\d{3}[0-9A-Y]\b/gi,
      score: 0.55,
    },
  ],
  locales: ['fi'],
  context: ['hetu', 'henkilötunnus', 'personbeteckning', 'personal identity code'],
  description: 'Finnish personal identity code (hetu) with modulo-31 check character',
  validate: hetuChecksum,
  checksumMode: 'boost',
}
