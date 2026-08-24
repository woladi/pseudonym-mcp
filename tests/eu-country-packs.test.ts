import { describe, it, expect, afterEach } from 'vitest'
import { ConfigManager } from '../src/config/manager.js'
import { Engine } from '../src/core/engine.js'
import { deTaxIdChecksum } from '../src/patterns/locale/de/tax-id.js'
import { codiceFiscaleChecksum } from '../src/patterns/locale/it/fiscal-code.js'
import { nifChecksum, nieChecksum } from '../src/patterns/locale/es/nif.js'
import { nirChecksum } from '../src/patterns/locale/fr/nir.js'
import { bsnChecksum } from '../src/patterns/locale/nl/bsn.js'
import { rodneCisloChecksum } from '../src/patterns/locale/cz/rodne-cislo.js'
import { personnummerChecksum } from '../src/patterns/locale/se/personnummer.js'
import { hetuChecksum } from '../src/patterns/locale/fi/hetu.js'
import { nhsChecksum } from '../src/patterns/locale/uk/identifiers.js'

// Published specimen values, none of them a real person's identifier.
const DE_TAX_ID = '86095742719'
const CODICE_FISCALE = 'RSSMRA85T10A562S'
const ES_NIF = '12345678Z'
const ES_NIE = 'X1234567L'
const FR_NIR = '180126955222380'
const NL_BSN = '111222333'
const CZ_RC = '7401130319'
const SE_PNR = '811218-9876'
const FI_HETU = '131052-308T'
const UK_NHS = '9434765919'
const UK_NINO = 'AB123456C'

function engine(lang: string, extraLocales: string[] = []): Engine {
  ConfigManager.reset()
  ConfigManager.init({ lang, engines: 'regex', extraLocales })
  return new Engine(undefined, null)
}

afterEach(() => ConfigManager.reset())

describe('national checksums', () => {
  it('accepts valid specimens', () => {
    expect(deTaxIdChecksum(DE_TAX_ID)).toBe(true)
    expect(codiceFiscaleChecksum(CODICE_FISCALE)).toBe(true)
    expect(nifChecksum(ES_NIF)).toBe(true)
    expect(nieChecksum(ES_NIE)).toBe(true)
    expect(nirChecksum(FR_NIR)).toBe(true)
    expect(bsnChecksum(NL_BSN)).toBe(true)
    expect(rodneCisloChecksum(CZ_RC)).toBe(true)
    expect(personnummerChecksum(SE_PNR)).toBe(true)
    expect(hetuChecksum(FI_HETU)).toBe(true)
    expect(nhsChecksum(UK_NHS)).toBe(true)
  })

  it('rejects a single altered character', () => {
    expect(deTaxIdChecksum('86095742718')).toBe(false)
    expect(codiceFiscaleChecksum('RSSMRA85T10A562A')).toBe(false)
    expect(nifChecksum('12345678A')).toBe(false)
    expect(bsnChecksum('111222334')).toBe(false)
    expect(personnummerChecksum('811218-9875')).toBe(false)
    expect(hetuChecksum('131052-308A')).toBe(false)
    expect(nhsChecksum('9434765918')).toBe(false)
  })

  it('rejects a German tax id repeating a digit more than three times', () => {
    expect(deTaxIdChecksum('11111111111')).toBe(false)
  })
})

describe('masking per locale', () => {
  it('masks a German tax id in German text', async () => {
    const out = await engine('de').process(`Steuer-ID ${DE_TAX_ID}`)
    expect(out).toContain('[DE_TAX_ID:1]')
  })

  it('masks an Italian fiscal code', async () => {
    const out = await engine('it').process(`Codice fiscale: ${CODICE_FISCALE}`)
    expect(out).toContain('[IT_FISCAL_CODE:1]')
  })

  it('masks Spanish NIF and NIE', async () => {
    const out = await engine('es').process(`DNI ${ES_NIF} y NIE ${ES_NIE}`)
    expect(out).toContain('[ES_NIF:1]')
    expect(out).toContain('[ES_NIE:1]')
  })

  it('masks a French NIR', async () => {
    const out = await engine('fr').process(`Numéro de sécurité sociale ${FR_NIR}`)
    expect(out).toContain('[FR_NIR:1]')
  })

  it('masks a Dutch BSN when labelled', async () => {
    const out = await engine('nl').process(`BSN: ${NL_BSN}`)
    expect(out).toContain('[NL_BSN:1]')
  })

  it('masks a Czech birth number in its slashed form', async () => {
    const out = await engine('cz').process('Rodné číslo 740113/0319')
    expect(out).toContain('[CZ_SK_BIRTH_NUMBER:1]')
  })

  it('masks a Swedish personnummer', async () => {
    const out = await engine('se').process(`Personnummer ${SE_PNR}`)
    expect(out).toContain('[SE_PERSONNUMMER:1]')
  })

  it('masks a Finnish hetu', async () => {
    const out = await engine('fi').process(`Henkilötunnus ${FI_HETU}`)
    expect(out).toContain('[FI_HETU:1]')
  })

  it('masks a UK NHS number and NINO', async () => {
    const out = await engine('uk').process(`NHS number ${UK_NHS}, NI number ${UK_NINO}`)
    expect(out).toContain('[UK_NHS:1]')
    expect(out).toContain('[UK_NINO:1]')
  })
})

describe('extra locales', () => {
  it('leaves foreign identifiers alone when only Polish is enabled', async () => {
    const out = await engine('pl').process(`Codice fiscale ${CODICE_FISCALE}`)
    expect(out).toContain(CODICE_FISCALE)
  })

  it('recognizes them once the locale is added alongside Polish', async () => {
    const out = await engine('pl', ['it']).process(`Codice fiscale ${CODICE_FISCALE}`)
    expect(out).toContain('[IT_FISCAL_CODE:1]')
  })

  it('keeps the Polish rules working with extra locales enabled', async () => {
    const e = engine('pl', ['de', 'it'])
    const original = `PESEL 44051401359 oraz Steuer-ID ${DE_TAX_ID}`
    const masked = await e.process(original)
    expect(masked).toContain('[PESEL:1]')
    expect(masked).toContain('[DE_TAX_ID:1]')
    expect(e.revert(masked)).toBe(original)
  })
})
