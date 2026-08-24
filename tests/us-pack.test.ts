import { describe, it, expect, afterEach } from 'vitest'
import { ConfigManager } from '../src/config/manager.js'
import { Engine } from '../src/core/engine.js'
import { abaChecksum } from '../src/patterns/locale/en/tax-ids.js'

function usEngine(): Engine {
  ConfigManager.reset()
  ConfigManager.init({ lang: 'en', engines: 'regex' })
  return new Engine(undefined, null)
}

afterEach(() => ConfigManager.reset())

describe('ABA routing checksum', () => {
  it('accepts a valid routing number', () => {
    expect(abaChecksum('021000021')).toBe(true)
    expect(abaChecksum('011401533')).toBe(true)
  })

  it('rejects an altered digit', () => {
    expect(abaChecksum('021000022')).toBe(false)
  })
})

describe('US identifiers', () => {
  it('masks an ITIN', async () => {
    const out = await usEngine().process('ITIN 912-75-1234 on file')
    expect(out).toContain('[ITIN:1]')
  })

  it('masks an EIN', async () => {
    const out = await usEngine().process('EIN 12-3456789')
    expect(out).toContain('[EIN:1]')
  })

  it('masks a routing number whose checksum validates', async () => {
    const out = await usEngine().process('Routing 021000021')
    expect(out).toContain('[ABA_ROUTING:1]')
  })

  it('masks a passport number only when the label is there', async () => {
    const labelled = await usEngine().process('Passport no 123456789')
    expect(labelled).toContain('[PASSPORT:1]')

    const bare = await usEngine().process('Order 123456789 shipped')
    expect(bare).toContain('123456789')
  })

  it('masks a driver license number when the label is there', async () => {
    const out = await usEngine().process('Driver license D1234567 expires soon')
    expect(out).toContain('[DRIVER_LICENSE:1]')
  })

  it('masks a dashed SSN without needing a label', async () => {
    const out = await usEngine().process('123-45-6789')
    expect(out).toContain('[SSN:1]')
  })

  it('masks a spaced SSN when labelled and leaves it alone otherwise', async () => {
    const labelled = await usEngine().process('Social security 123 45 6789')
    expect(labelled).toContain('[SSN:1]')

    const bare = await usEngine().process('Ref 123 45 6789')
    expect(bare).toContain('123 45 6789')
  })

  it('round-trips a mixed US record', async () => {
    const e = usEngine()
    const original = 'SSN 123-45-6789, EIN 12-3456789, routing 021000021'
    const masked = await e.process(original)
    expect(e.revert(masked)).toBe(original)
  })
})
