import { describe, it, expect, beforeEach } from 'vitest'
import { ConfigManager } from '../src/config/manager.js'
import { MappingStore } from '../src/core/mapping-store.js'
import { Engine } from '../src/core/engine.js'
import type { OllamaClient } from '../src/core/ollama-client.js'

beforeEach(() => {
  ConfigManager.reset()
})

describe('English compliance — full round-trip', () => {
  it('masks SSN, PERSON and ORG then restores original text', async () => {
    ConfigManager.init({ lang: 'en', engines: 'hybrid', strictValidation: true })

    const input =
      'John Smith (SSN: 123-45-6789) works at Acme Corp and can be reached at john@acme.com.'

    const mockOllamaClient = {
      extractEntities: async () => [
        { type: 'PERSON' as const, value: 'John Smith' },
        { type: 'ORG' as const, value: 'Acme Corp' },
      ],
    } as unknown as OllamaClient

    const store = new MappingStore()
    const engine = new Engine(store, mockOllamaClient)

    const masked = await engine.process(input)

    expect(masked).not.toContain('123-45-6789')
    expect(masked).toContain('[SSN:1]')
    expect(masked).not.toContain('John Smith')
    expect(masked).toContain('[PERSON:1]')
    expect(masked).not.toContain('Acme Corp')
    expect(masked).toContain('[ORG:1]')
    expect(masked).not.toContain('john@acme.com')
    expect(masked).toContain('[EMAIL:1]')

    const restored = engine.revert(masked)
    expect(restored).toBe(input)
  })

  it('does not mask an SSN with invalid area number (000)', async () => {
    ConfigManager.init({ lang: 'en', engines: 'regex', strictValidation: true })
    const engine = new Engine(new MappingStore(), null)
    const result = await engine.process('SSN: 000-12-3456')
    expect(result).toContain('000-12-3456')
    expect(result).not.toContain('[SSN:')
  })

  it('does not mask an SSN with area 666', async () => {
    ConfigManager.init({ lang: 'en', engines: 'regex', strictValidation: true })
    const engine = new Engine(new MappingStore(), null)
    const result = await engine.process('SSN: 666-12-3456')
    expect(result).toContain('666-12-3456')
  })

  it('masks an SSN with area 900+ when strictValidation=false', async () => {
    ConfigManager.init({ lang: 'en', engines: 'regex', strictValidation: false })
    const engine = new Engine(new MappingStore(), null)
    const result = await engine.process('SSN: 900-12-3456')
    expect(result).toContain('[SSN:1]')
  })

  it('masks a Visa credit card number (Luhn-valid)', async () => {
    ConfigManager.init({ lang: 'en', engines: 'regex', strictValidation: true })
    const engine = new Engine(new MappingStore(), null)
    // 4111 1111 1111 1111 is the standard Visa test number (passes Luhn)
    const result = await engine.process('Card: 4111 1111 1111 1111')
    expect(result).toContain('[CREDIT_CARD:1]')
    expect(result).not.toContain('4111')
  })

  it('masks a Mastercard number (Luhn-valid)', async () => {
    ConfigManager.init({ lang: 'en', engines: 'regex', strictValidation: true })
    const engine = new Engine(new MappingStore(), null)
    // 5500 0000 0000 0004 — standard Mastercard test
    const result = await engine.process('Pay with 5500 0000 0000 0004')
    expect(result).toContain('[CREDIT_CARD:1]')
  })

  it('does not mask a random 16-digit number that fails Luhn', async () => {
    ConfigManager.init({ lang: 'en', engines: 'regex', strictValidation: true })
    const engine = new Engine(new MappingStore(), null)
    const result = await engine.process('Ref: 1234 5678 9012 3456')
    // 1234567890123456 does not pass Luhn
    expect(result).not.toContain('[CREDIT_CARD:')
  })

  it('masks US phone number in (XXX) XXX-XXXX format', async () => {
    ConfigManager.init({ lang: 'en', engines: 'regex' })
    const engine = new Engine(new MappingStore(), null)
    const result = await engine.process('Call: (555) 123-4567')
    expect(result).toContain('[PHONE:1]')
    expect(result).not.toContain('(555) 123-4567')
  })

  it('masks US phone in XXX-XXX-XXXX format', async () => {
    ConfigManager.init({ lang: 'en', engines: 'regex' })
    const engine = new Engine(new MappingStore(), null)
    const result = await engine.process('Phone: 555-123-4567')
    expect(result).toContain('[PHONE:1]')
  })

  it('masks US phone with +1 prefix', async () => {
    ConfigManager.init({ lang: 'en', engines: 'regex' })
    const engine = new Engine(new MappingStore(), null)
    const result = await engine.process('Dial +1-555-123-4567')
    expect(result).toContain('[PHONE:1]')
  })

  it('masks email addresses', async () => {
    ConfigManager.init({ lang: 'en', engines: 'regex' })
    const engine = new Engine(new MappingStore(), null)
    const result = await engine.process('Email: jane.doe@company.com')
    expect(result).toContain('[EMAIL:1]')
    expect(result).not.toContain('jane.doe@company.com')
  })

  it('gracefully degrades when Ollama throws', async () => {
    ConfigManager.init({ lang: 'en', engines: 'hybrid', strictValidation: true })

    const mockOllamaClient = {
      extractEntities: async (): Promise<never> => {
        throw new Error('Connection refused')
      },
    } as unknown as OllamaClient

    const engine = new Engine(new MappingStore(), mockOllamaClient)
    const result = await engine.process('SSN: 123-45-6789, email: a@b.com')
    expect(result).toContain('[SSN:1]')
    expect(result).toContain('[EMAIL:1]')
  })

  it('same person masked twice produces the same token', async () => {
    ConfigManager.init({ lang: 'en', engines: 'hybrid' })

    const mockOllamaClient = {
      extractEntities: async () => [{ type: 'PERSON' as const, value: 'Jane Doe' }],
    } as unknown as OllamaClient

    const engine = new Engine(new MappingStore(), mockOllamaClient)
    const result = await engine.process('Jane Doe said that Jane Doe would return.')
    expect(result.split('[PERSON:1]').length - 1).toBe(2)
    expect(result).not.toContain('[PERSON:2]')
  })
})
