import { describe, it, expect } from 'vitest'
import { localeBanner, localeWarning } from '../src/config/locale-report.js'
import { SUPPORTED_LOCALES, resolveLocales } from '../src/patterns/types.js'

/**
 * A narrowed server is indistinguishable from a complete one at the call site:
 * mask_text returns clean text and reports success either way. Both the
 * startup banner and the per-call warning exist so that the packs a process
 * cannot see are stated rather than inferred.
 */

describe('localeWarning', () => {
  it('says nothing when every pack is loaded', () => {
    expect(localeWarning(resolveLocales('all'))).toBeNull()
  })

  it('names each disabled pack and what it would have caught', () => {
    const warning = localeWarning(resolveLocales('en'))!
    expect(warning).toContain('pl (')
    expect(warning).toContain('PESEL')
    expect(warning).toContain('pass through unmasked')
    expect(warning).toContain('--lang all')
  })

  it('does not name a pack that is active', () => {
    const warning = localeWarning(resolveLocales('pl', ['de']))!
    expect(warning).not.toContain('pl (')
    expect(warning).not.toContain('de (')
    expect(warning).toContain('uk (')
  })

  it('describes every locale it can disable', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const others = SUPPORTED_LOCALES.filter((l) => l !== locale)
      const warning = localeWarning(resolveLocales(locale))!
      for (const other of others) {
        expect(warning).toContain(`${other} (`)
      }
      // No pack falls back to the placeholder wording.
      expect(warning).not.toContain('national identifiers')
    }
  })
})

describe('localeBanner', () => {
  it('reports the full set without a warning', () => {
    const banner = localeBanner(resolveLocales('all'))
    expect(banner).toContain(`all ${SUPPORTED_LOCALES.length}`)
    expect(banner).not.toContain('WARNING')
  })

  it('warns loudly when the selection is narrowed', () => {
    const banner = localeBanner(resolveLocales('pl'))
    expect(banner).toContain('Locale packs active: pl')
    expect(banner).toContain('WARNING')
    expect(banner).toContain('Locale packs disabled')
  })

  it('flags an unrecognized locale and still reports the fail-closed fallback', () => {
    const banner = localeBanner(resolveLocales('polish'))
    expect(banner).toContain('unknown locale(s) polish')
    expect(banner).toContain(`all ${SUPPORTED_LOCALES.length}`)
  })

  it('ends with a newline so it does not run into the next stderr line', () => {
    expect(localeBanner(resolveLocales('all')).endsWith('\n')).toBe(true)
    expect(localeBanner(resolveLocales('pl')).endsWith('\n')).toBe(true)
  })
})
