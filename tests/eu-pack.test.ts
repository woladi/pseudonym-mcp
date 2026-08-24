import { describe, it, expect, afterEach } from 'vitest'
import { ConfigManager } from '../src/config/manager.js'
import { Engine } from '../src/core/engine.js'
import { ibanChecksum } from '../src/patterns/global/iban.js'
import { euVatChecksum } from '../src/patterns/global/eu-vat.js'

// Published specimen numbers, not anyone's actual account.
const PL_IBAN = 'PL61109010140000071219812874'
const DE_IBAN = 'DE89370400440532013000'
const GB_IBAN = 'GB82WEST12345698765432'

function engine(lang: string): Engine {
  ConfigManager.reset()
  ConfigManager.init({ lang, engines: 'regex' })
  return new Engine(undefined, null)
}

afterEach(() => ConfigManager.reset())

describe('IBAN — mod-97', () => {
  it('accepts valid IBANs across countries', () => {
    expect(ibanChecksum(PL_IBAN)).toBe(true)
    expect(ibanChecksum(DE_IBAN)).toBe(true)
    expect(ibanChecksum(GB_IBAN)).toBe(true)
    expect(ibanChecksum('FR1420041010050500013M02606')).toBe(true)
  })

  it('accepts the grouped spelling', () => {
    expect(ibanChecksum('PL61 1090 1014 0000 0712 1981 2874')).toBe(true)
  })

  it('rejects a single altered digit', () => {
    expect(ibanChecksum('PL61109010140000071219812875')).toBe(false)
  })

  it('rejects a country code with the wrong length', () => {
    expect(ibanChecksum('DE8937040044053201300012')).toBe(false)
  })

  it('masks a foreign IBAN in Polish text', async () => {
    const out = await engine('pl').process(`Przelew na ${DE_IBAN} do jutra.`)
    expect(out).toContain('[IBAN:1]')
    expect(out).not.toContain(DE_IBAN)
  })

  it('still masks an IBAN-shaped string that fails mod-97 when labelled', async () => {
    // A mistyped account number is the case where a miss actually costs something.
    const out = await engine('pl').process('IBAN: PL61109010140000071219812875')
    expect(out).toContain('[IBAN:1]')
  })
})

describe('EU VAT', () => {
  it('validates numbers from member states with a national checksum', () => {
    expect(euVatChecksum('PL5260000005')).toBe(true)
    expect(euVatChecksum('IT00743110157')).toBe(true)
    expect(euVatChecksum('NL123456782B12')).toBe(true)
    expect(euVatChecksum('LU10000356')).toBe(true)
    expect(euVatChecksum('SI50223054')).toBe(true)
  })

  it('accepts format-only countries and rejects unknown prefixes', () => {
    expect(euVatChecksum('DE123456789')).toBe(true)
    expect(euVatChecksum('ZZ123456789')).toBe(false)
    expect(euVatChecksum('DE12345')).toBe(false)
  })

  it('rejects a tampered check digit', () => {
    expect(euVatChecksum('PL5260000000')).toBe(false)
  })

  it('masks a German VAT id in an invoice line', async () => {
    const out = await engine('pl').process('Kontrahent DE123456789, faktura 12/2026')
    expect(out).toContain('[VAT_ID:1]')
  })

  it('round-trips VAT and IBAN together', async () => {
    const e = engine('pl')
    const original = `Faktura dla IT00743110157, płatność na ${PL_IBAN}.`
    const masked = await e.process(original)
    expect(masked).toContain('[VAT_ID:1]')
    expect(masked).toContain('[IBAN:1]')
    expect(e.revert(masked)).toBe(original)
  })
})
