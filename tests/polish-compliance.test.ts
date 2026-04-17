import { describe, it, expect, beforeEach } from 'vitest'
import { ConfigManager } from '../src/config/manager.js'
import { MappingStore } from '../src/core/mapping-store.js'
import { Engine } from '../src/core/engine.js'
import type { OllamaClient } from '../src/core/ollama-client.js'

// Valid PESEL: born 1990-01-01, male
// Checksum: weights [1,3,7,9,1,3,7,9,1,3] × digits [9,0,0,1,0,1,1,2,3,1]
// = 9+0+0+9+0+3+7+18+3+3 = 52 → check = (10 - 52%10) % 10 = 8 ✓
const VALID_PESEL = '90010112318'

beforeEach(() => {
  ConfigManager.reset()
})

describe('Polish compliance — full round-trip', () => {
  it('masks PESEL, PERSON and ORG then restores original text', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'hybrid', strictValidation: true })

    const input = `Jan Kowalski (PESEL: ${VALID_PESEL}) kupił auto od firmy Auto-Lux.`

    const mockOllamaClient = {
      extractEntities: async () => [
        { type: 'PERSON' as const, value: 'Jan Kowalski' },
        { type: 'ORG' as const, value: 'Auto-Lux' },
      ],
    } as unknown as OllamaClient

    const store = new MappingStore()
    const engine = new Engine(store, mockOllamaClient)

    const masked = await engine.process(input)

    // All sensitive data must be replaced
    expect(masked).not.toContain(VALID_PESEL)
    expect(masked).toContain('[PESEL:1]')
    expect(masked).not.toContain('Jan Kowalski')
    expect(masked).toContain('[PERSON:1]')
    expect(masked).not.toContain('Auto-Lux')
    expect(masked).toContain('[ORG:1]')

    // Full round-trip: revert must restore the original exactly
    const restored = engine.revert(masked)
    expect(restored).toBe(input)
  })

  it('masks any 11-digit number as PESEL (no checksum validation)', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'regex' })

    const engine = new Engine(new MappingStore(), null)
    // 85042312345 — fails PESEL checksum but must still be masked
    const result = await engine.process('PESEL: 85042312345')

    expect(result).toContain('[PESEL:1]')
    expect(result).not.toContain('85042312345')
    // Label "PESEL:" stays in the output
    expect(result).toContain('PESEL:')
  })

  it('masks Polish phone in +48 format', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'regex' })
    const engine = new Engine(new MappingStore(), null)

    const result = await engine.process('Zadzwoń: +48 123 456 789')
    expect(result).not.toContain('+48 123 456 789')
    expect(result).toContain('[PHONE:1]')
  })

  it('masks Polish phone in 0048 format', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'regex' })
    const engine = new Engine(new MappingStore(), null)

    const result = await engine.process('Tel: 0048123456789')
    expect(result).not.toContain('0048123456789')
    expect(result).toContain('[PHONE:1]')
  })

  it('masks 9-digit Polish mobile number', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'regex' })
    const engine = new Engine(new MappingStore(), null)

    const result = await engine.process('Numer: 600100200')
    expect(result).toContain('[PHONE:1]')
  })

  it('masks a Polish IBAN', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'regex' })
    const engine = new Engine(new MappingStore(), null)

    const iban = 'PL27114020040000300201355387'
    const result = await engine.process(`Konto: ${iban}`)
    expect(result).toContain('[IBAN:1]')
    expect(result).not.toContain(iban)
  })

  it('masks an email address', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'regex' })
    const engine = new Engine(new MappingStore(), null)

    const result = await engine.process('E-mail: jan.kowalski@example.pl')
    expect(result).toContain('[EMAIL:1]')
    expect(result).not.toContain('jan.kowalski@example.pl')
  })

  it('revert is a no-op on text with no tokens', () => {
    ConfigManager.init({ lang: 'pl', engines: 'regex' })
    const engine = new Engine()
    const plain = 'Brak danych wrażliwych.'
    expect(engine.revert(plain)).toBe(plain)
  })

  it('gracefully degrades when Ollama throws', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'hybrid', strictValidation: true })

    const mockOllamaClient = {
      extractEntities: async (): Promise<never> => {
        throw new Error('Connection refused')
      },
    } as unknown as OllamaClient

    const engine = new Engine(new MappingStore(), mockOllamaClient)
    // Should not throw; regex phase still runs
    const result = await engine.process(`Email: test@test.com`)
    expect(result).toContain('[EMAIL:1]')
  })

  it('same entity masked twice produces the same token (idempotency)', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'hybrid', strictValidation: true })

    const mockOllamaClient = {
      extractEntities: async () => [{ type: 'PERSON' as const, value: 'Anna Nowak' }],
    } as unknown as OllamaClient

    const engine = new Engine(new MappingStore(), mockOllamaClient)
    const result = await engine.process('Anna Nowak powiedziała, że Anna Nowak wróci.')

    // Both occurrences must become [PERSON:1], not [PERSON:1] and [PERSON:2]
    expect(result.split('[PERSON:1]').length - 1).toBe(2)
    expect(result).not.toContain('[PERSON:2]')
  })

  it('masks custom literal regardless of engine mode', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'regex', customLiterals: ['Jan Kowalski'] })
    const engine = new Engine(new MappingStore(), null)
    const result = await engine.process('Umowa zawarta z Jan Kowalski dnia dzisiejszego.')
    expect(result).not.toContain('Jan Kowalski')
    expect(result).toContain('[CUSTOM:1]')
  })

  it('masks custom literal case-insensitively', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'regex', customLiterals: ['jan kowalski'] })
    const engine = new Engine(new MappingStore(), null)
    const result = await engine.process('JAN KOWALSKI podpisał umowę.')
    expect(result).not.toContain('JAN KOWALSKI')
    expect(result).toContain('[CUSTOM:1]')
  })

  it('restores custom literal on revert', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'regex', customLiterals: ['Jan Kowalski'] })
    const engine = new Engine(new MappingStore(), null)
    const masked = await engine.process('Podpisano: Jan Kowalski')
    const reverted = engine.revert(masked)
    expect(reverted).toBe('Podpisano: Jan Kowalski')
  })
})
