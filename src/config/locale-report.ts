import { SUPPORTED_LOCALES, type LocaleSelection } from '../patterns/types.js'

/**
 * What each locale pack would stop catching if it were left off. Used to make
 * "de is disabled" mean something to whoever reads the warning.
 */
const PACK_SUMMARY: Record<string, string> = {
  pl: 'PESEL, NIP, REGON, dowód, paszport, księga wieczysta, PL IBAN/phone',
  en: 'SSN, ITIN, EIN, ABA routing, credit card, US phone, ZIP',
  de: 'Steuer-IdNr, PLZ',
  it: 'codice fiscale',
  es: 'NIF/DNI, NIE',
  fr: 'NIR',
  nl: 'BSN',
  cz: 'rodné číslo',
  sk: 'rodné číslo',
  se: 'personnummer',
  fi: 'henkilötunnus',
  uk: 'NHS number, NINO, postcode',
}

/** One line naming the packs that are off and what they would have caught. */
export function localeWarning(selection: LocaleSelection): string | null {
  if (selection.disabled.length === 0) return null

  const missed = selection.disabled
    .map((locale) => `${locale} (${PACK_SUMMARY[locale] ?? 'national identifiers'})`)
    .join('; ')

  return (
    `Locale packs disabled: ${missed}. ` +
    `Identifiers from those countries are NOT detected and will pass through unmasked. ` +
    `Start the server without --lang, or with --lang all, to load every pack.`
  )
}

/** Stderr banner printed once at startup, so a narrowed server says so out loud. */
export function localeBanner(selection: LocaleSelection): string {
  const lines: string[] = []

  if (selection.unknown.length > 0) {
    lines.push(
      `[pseudonym-mcp] WARNING: unknown locale(s) ${selection.unknown.join(', ')} ignored. ` +
        `Known: ${SUPPORTED_LOCALES.join(', ')}, all.`,
    )
  }

  if (selection.all) {
    lines.push(
      `[pseudonym-mcp] Locale packs active: all ${selection.active.length} (${selection.active.join(', ')}).`,
    )
    return lines.join('\n') + '\n'
  }

  lines.push(`[pseudonym-mcp] Locale packs active: ${selection.active.join(', ')}.`)
  lines.push(`[pseudonym-mcp] WARNING: ${localeWarning(selection)}`)
  return lines.join('\n') + '\n'
}
