import { describe, it, expect, afterEach } from 'vitest'
import { ConfigManager } from '../src/config/manager.js'
import { Engine } from '../src/core/engine.js'
import { cryptoAddressValid } from '../src/patterns/global/crypto.js'
import { imeiChecksum, vinChecksum } from '../src/patterns/global/device.js'

// Well-known public test vectors, not anyone's wallet.
const BTC_LEGACY = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
const BTC_BECH32 = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'
const ETH = '0x52908400098527886E0F7030069857D2E4169EE7'
const IMEI = '490154203237518'
const VIN = '1HGBH41JXMN109186'
const UUID = '123e4567-e89b-12d3-a456-426614174000'

function engine(lang = 'pl', sensitivity?: 'balanced' | 'strict' | 'paranoid'): Engine {
  ConfigManager.reset()
  ConfigManager.init({ lang, engines: 'regex', sensitivity })
  return new Engine(undefined, null)
}

afterEach(() => ConfigManager.reset())

describe('crypto addresses', () => {
  it('validates Base58Check and bech32 addresses', () => {
    expect(cryptoAddressValid(BTC_LEGACY)).toBe(true)
    expect(cryptoAddressValid(BTC_BECH32)).toBe(true)
  })

  it('rejects an address with one character changed', () => {
    expect(cryptoAddressValid('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNb')).toBe(false)
    expect(cryptoAddressValid('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5')).toBe(false)
  })

  it('masks Bitcoin and Ethereum addresses', async () => {
    const out = await engine().process(`Wpłata na ${BTC_LEGACY} lub ${ETH}`)
    expect(out).toContain('[CRYPTO_WALLET:1]')
    expect(out).toContain('[CRYPTO_WALLET:2]')
  })
})

describe('device identifiers', () => {
  it('validates IMEI and VIN check digits', () => {
    expect(imeiChecksum(IMEI)).toBe(true)
    expect(imeiChecksum('490154203237519')).toBe(false)
    expect(vinChecksum(VIN)).toBe(true)
    expect(vinChecksum('1HGBH41JXMN109187')).toBe(false)
  })

  it('masks IMEI, VIN, MAC and UUID', async () => {
    const out = await engine().process(
      `IMEI ${IMEI}, VIN ${VIN}, MAC 00:1B:44:11:3A:B7, id ${UUID}`,
    )
    expect(out).toContain('[IMEI:1]')
    expect(out).toContain('[VIN:1]')
    expect(out).toContain('[MAC:1]')
    expect(out).toContain('[UUID:1]')
  })
})

describe('dates', () => {
  it('masks a date introduced as a date of birth', async () => {
    const out = await engine().process('Data urodzenia: 1985-04-23')
    expect(out).toContain('[DATE:1]')
  })

  it('leaves an ordinary date alone at the default sensitivity', async () => {
    const out = await engine().process('Termin płatności: 2026-04-23')
    expect(out).toContain('2026-04-23')
  })

  it('masks any date at paranoid sensitivity', async () => {
    const out = await engine('pl', 'paranoid').process('Termin płatności: 2026-04-23')
    expect(out).toContain('[DATE:1]')
  })
})

describe('round trip', () => {
  it('restores every generic identifier', async () => {
    const e = engine()
    const original = `IMEI ${IMEI}, portfel ${BTC_BECH32}, id ${UUID}`
    const masked = await e.process(original)
    expect(e.revert(masked)).toBe(original)
  })
})
