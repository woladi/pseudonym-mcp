import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ConfigManager } from '../src/config/manager.js'
import { Engine } from '../src/core/engine.js'
import { regonChecksum } from '../src/patterns/locale/pl/regon.js'
import { idCardChecksum } from '../src/patterns/locale/pl/id-card.js'
import { passportChecksum } from '../src/patterns/locale/pl/passport.js'
import { landRegisterChecksum } from '../src/patterns/locale/pl/land-register.js'
import { peselChecksum } from '../src/patterns/locale/pl/pesel.js'

// Fictitious but checksum-valid samples.
const REGON9 = '123456785'
const REGON14 = '12345678512347'
const ID_CARD = 'ABC412345'
const PASSPORT = 'AB4123456'
const LAND_REGISTER = 'WA1M/00012345/1'
const PESEL = '44051401359'

function plEngine(): Engine {
  ConfigManager.reset()
  ConfigManager.init({ lang: 'pl', engines: 'regex' })
  return new Engine(undefined, null)
}

afterEach(() => ConfigManager.reset())
beforeEach(() => ConfigManager.reset())

describe('checksums', () => {
  it('REGON accepts 9- and 14-digit numbers and rejects a wrong check digit', () => {
    expect(regonChecksum(REGON9)).toBe(true)
    expect(regonChecksum(REGON14)).toBe(true)
    expect(regonChecksum('123456780')).toBe(false)
    expect(regonChecksum('12345')).toBe(false)
  })

  it('ID card accepts a valid series and rejects a wrong check digit', () => {
    expect(idCardChecksum(ID_CARD)).toBe(true)
    expect(idCardChecksum('ABC012345')).toBe(false)
    expect(idCardChecksum('AB1234567')).toBe(false)
  })

  it('passport accepts a valid number and rejects a wrong check digit', () => {
    expect(passportChecksum(PASSPORT)).toBe(true)
    expect(passportChecksum('AB0123456')).toBe(false)
  })

  it('land register accepts a valid number and rejects a wrong check digit', () => {
    expect(landRegisterChecksum(LAND_REGISTER)).toBe(true)
    expect(landRegisterChecksum('WA1M/00012345/9')).toBe(false)
    expect(landRegisterChecksum('WA1M/0001234/1')).toBe(false)
  })

  it('PESEL accepts a valid number and rejects a wrong check digit', () => {
    expect(peselChecksum(PESEL)).toBe(true)
    expect(peselChecksum('44051401358')).toBe(false)
  })
})

describe('masking — Polish identifiers', () => {
  it('masks a REGON introduced by its label', async () => {
    const out = await plEngine().process(`REGON: ${REGON9}`)
    expect(out).toContain('[REGON:1]')
    expect(out).not.toContain(REGON9)
  })

  it('masks a 14-digit REGON', async () => {
    const out = await plEngine().process(`REGON ${REGON14}`)
    expect(out).toContain('[REGON:1]')
  })

  it('masks an ID card number', async () => {
    const out = await plEngine().process(`Dowód osobisty ${ID_CARD}`)
    expect(out).toContain('[ID_CARD:1]')
  })

  it('masks a passport number', async () => {
    const out = await plEngine().process(`Paszport nr ${PASSPORT}`)
    expect(out).toContain('[PASSPORT:1]')
  })

  it('masks a land register number', async () => {
    const out = await plEngine().process(`Księga wieczysta ${LAND_REGISTER}`)
    expect(out).toContain('[KW:1]')
  })

  it('masks a KRS number when the label is present', async () => {
    const out = await plEngine().process('Spółka wpisana do KRS 0000123456')
    expect(out).toContain('[KRS:1]')
  })

  it('leaves a bare 10-digit number alone without the KRS label', async () => {
    const out = await plEngine().process('Zamówienie 0000123456 zostało przyjęte')
    expect(out).toContain('0000123456')
  })

  it('round-trips every identifier back to the original text', async () => {
    const engine = plEngine()
    const original = `PESEL ${PESEL}, REGON ${REGON9}, dowód ${ID_CARD}, paszport ${PASSPORT}, KW ${LAND_REGISTER}`
    const masked = await engine.process(original)
    expect(engine.revert(masked)).toBe(original)
  })
})

describe('a realistic contract', () => {
  const CONTRACT = [
    'Umowa z dnia 2026-03-14.',
    'Kupujący: Jan Kowalski, PESEL 44051401359, dowód osobisty ABC412345,',
    'data urodzenia 1944-05-14, zam. 00-950 Warszawa, tel. +48 601 234 567.',
    'Sprzedający: Auto-Lux sp. z o.o., NIP 5260000005, REGON 123456785,',
    'KRS 0000123456, rachunek PL61 1090 1014 0000 0712 1981 2874.',
    'Kontrahent niemiecki: Steuer-ID 86095742719, VAT DE123456789.',
    'Termin płatności: 2026-04-30. Faktura nr 0000123457.',
  ].join('\n')

  function contractEngine(): Engine {
    ConfigManager.reset()
    ConfigManager.init({ lang: 'pl', engines: 'regex', extraLocales: ['de'] })
    return new Engine(undefined, null)
  }

  it('masks every identifier in the document', async () => {
    const masked = await contractEngine().process(CONTRACT)
    for (const tag of [
      'PESEL',
      'ID_CARD',
      'DATE',
      'PHONE',
      'NIP',
      'REGON',
      'KRS',
      'IBAN',
      'DE_TAX_ID',
      'VAT_ID',
      'POSTAL_CODE',
    ]) {
      expect(masked).toContain(`[${tag}:`)
    }
  })

  it('leaves the dates and numbers that are not personal data', async () => {
    const masked = await contractEngine().process(CONTRACT)
    // The contract date and the payment deadline are not dates of birth, and
    // an invoice number is not a court register entry.
    expect(masked).toContain('Umowa z dnia 2026-03-14')
    expect(masked).toContain('Termin płatności: 2026-04-30')
    expect(masked).toContain('Faktura nr 0000123457')
  })

  it('round-trips the whole document', async () => {
    const e = contractEngine()
    const masked = await e.process(CONTRACT)
    expect(e.revert(masked)).toBe(CONTRACT)
  })
})
