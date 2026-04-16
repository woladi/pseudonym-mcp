import { describe, it, expect, beforeEach } from 'vitest'
import { ConfigManager } from '../src/config/manager.js'
import { MappingStore } from '../src/core/mapping-store.js'
import { Engine } from '../src/core/engine.js'

beforeEach(() => {
  ConfigManager.reset()
})

describe('Regex regression test — all patterns must work', () => {
  it('masks IBAN when engines=regex (no Ollama)', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'regex' })
    const engine = new Engine(new MappingStore(), null)

    const input = 'IBAN: PL61109010140000071219812874'
    const result = await engine.process(input)

    expect(result).not.toContain('PL61109010140000071219812874')
    expect(result).toContain('[IBAN:1]')
  })

  it('masks +48 mobile phone when engines=regex', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'regex' })
    const engine = new Engine(new MappingStore(), null)

    const input = 'Tel: +48 601 234 567'
    const result = await engine.process(input)

    expect(result).not.toContain('+48 601 234 567')
    expect(result).toContain('[PHONE:1]')
  })

  it('masks +48 landline phone when engines=regex', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'regex' })
    const engine = new Engine(new MappingStore(), null)

    const input = 'Tel: +48 22 555 44 33'
    const result = await engine.process(input)

    expect(result).not.toContain('+48 22 555 44 33')
    expect(result).toContain('[PHONE:1]')
  })

  it('masks email when engines=regex', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'regex' })
    const engine = new Engine(new MappingStore(), null)

    const input = 'Email: test@test.pl'
    const result = await engine.process(input)

    expect(result).not.toContain('test@test.pl')
    expect(result).toContain('[EMAIL:1]')
  })

  it('masks all patterns together: IBAN, phones, email', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'regex' })
    const engine = new Engine(new MappingStore(), null)

    const input =
      'IBAN: PL61109010140000071219812874, tel: +48 601 234 567, tel2: +48 22 555 44 33, email: test@test.pl'
    const result = await engine.process(input)

    expect(result).not.toContain('PL61109010140000071219812874')
    expect(result).not.toContain('+48 601 234 567')
    expect(result).not.toContain('+48 22 555 44 33')
    expect(result).not.toContain('test@test.pl')
    expect(result).toContain('[IBAN:1]')
    expect(result).toContain('[PHONE:1]')
    expect(result).toContain('[PHONE:2]')
    expect(result).toContain('[EMAIL:1]')
  })

  it('masks regex patterns with engines=hybrid and Ollama mock', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'hybrid' })

    const mockOllamaClient = {
      extractEntities: async () => [],
    }

    const engine = new Engine(new MappingStore(), mockOllamaClient as any)
    const input = 'IBAN: PL61109010140000071219812874, tel: +48 601 234 567'
    const result = await engine.process(input)

    expect(result).not.toContain('PL61109010140000071219812874')
    expect(result).not.toContain('+48 601 234 567')
    expect(result).toContain('[IBAN:1]')
    expect(result).toContain('[PHONE:1]')
  })

  it('processWithStatus returns masked text + nerStatus', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'regex' })
    const engine = new Engine(new MappingStore(), null)

    const input = 'IBAN: PL61109010140000071219812874, email: test@test.pl'
    const { maskedText, nerStatus } = await engine.processWithStatus(input)

    expect(maskedText).not.toContain('PL61109010140000071219812874')
    expect(maskedText).not.toContain('test@test.pl')
    expect(maskedText).toContain('[IBAN:1]')
    expect(maskedText).toContain('[EMAIL:1]')
    expect(nerStatus).toBe('disabled') // engines=regex, no Ollama
  })
})
