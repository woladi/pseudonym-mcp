import { describe, it, expect, beforeEach } from 'vitest'
import { ConfigManager } from '../src/config/manager.js'
import { MappingStore } from '../src/core/mapping-store.js'
import { Engine } from '../src/core/engine.js'
import type { OllamaClient } from '../src/core/ollama-client.js'

beforeEach(() => {
  ConfigManager.reset()
})

describe('processWithStatus — NER status reporting', () => {
  it('returns nerStatus="ready" when Ollama responds successfully', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'hybrid' })

    const mockOllamaClient = {
      extractEntities: async () => [{ type: 'PERSON' as const, value: 'Jan Kowalski' }],
    } as unknown as OllamaClient

    const engine = new Engine(new MappingStore(), mockOllamaClient)
    const { maskedText, nerStatus } = await engine.processWithStatus('Sprawa dotyczy Jan Kowalski.')

    expect(nerStatus).toBe('ready')
    expect(maskedText).not.toContain('Jan Kowalski')
    expect(maskedText).toContain('[PERSON:1]')
  })

  it('returns nerStatus="ready" when Ollama returns empty list (no entities found)', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'hybrid' })

    const mockOllamaClient = {
      extractEntities: async () => [],
    } as unknown as OllamaClient

    const engine = new Engine(new MappingStore(), mockOllamaClient)
    const { nerStatus } = await engine.processWithStatus('Brak encji w tekście.')

    expect(nerStatus).toBe('ready')
  })

  it('returns nerStatus="warming_up" when Ollama throws AbortError (timeout)', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'hybrid' })

    const abortError = new DOMException('The operation was aborted.', 'AbortError')
    const mockOllamaClient = {
      extractEntities: async (): Promise<never> => {
        throw abortError
      },
    } as unknown as OllamaClient

    const engine = new Engine(new MappingStore(), mockOllamaClient)
    const { maskedText, nerStatus } = await engine.processWithStatus('Jan Kowalski złożył pozew.')

    expect(nerStatus).toBe('warming_up')
    // Text returned unchanged (no entities extracted)
    expect(maskedText).toContain('Jan Kowalski')
  })

  it('returns nerStatus="disabled" when Ollama throws connection error', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'hybrid' })

    const mockOllamaClient = {
      extractEntities: async (): Promise<never> => {
        throw new TypeError('fetch failed')
      },
    } as unknown as OllamaClient

    const engine = new Engine(new MappingStore(), mockOllamaClient)
    const { nerStatus } = await engine.processWithStatus('Jan Kowalski złożył pozew.')

    expect(nerStatus).toBe('disabled')
  })

  it('returns nerStatus="disabled" when engines=regex (NER not attempted)', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'regex' })

    // null ollamaClient = NER disabled
    const engine = new Engine(new MappingStore(), null)
    const { nerStatus } = await engine.processWithStatus('Jan Kowalski złożył pozew.')

    expect(nerStatus).toBe('disabled')
  })

  it('returns nerStatus="ready" when partial chunks succeed (timeout + success)', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'hybrid' })

    // Build text long enough to split into 2+ chunks (800-char boundary).
    // With filler=53 chars, 20 × 53 = 1060; first split occurs after 14 fillers (769 chars).
    const filler = 'To jest dodatkowe zdanie wypełniające tekst testowy. '
    const text = 'Jan Kowalski złożył pozew. ' + filler.repeat(20) + 'Anna Nowak potwierdziła.'

    let callCount = 0
    const mockOllamaClient = {
      extractEntities: async (_text: string) => {
        callCount++
        if (callCount === 1) {
          // First chunk: throw AbortError (timeout)
          throw new DOMException('The operation was aborted.', 'AbortError')
        }
        // Subsequent chunks: succeed
        return [{ type: 'PERSON' as const, value: 'Anna Nowak' }]
      },
    } as unknown as OllamaClient

    const engine = new Engine(new MappingStore(), mockOllamaClient)
    const { nerStatus, maskedText } = await engine.processWithStatus(text)

    // Partial success → 'ready'
    expect(nerStatus).toBe('ready')
    expect(maskedText).not.toContain('Anna Nowak')
    expect(maskedText).toContain('[PERSON:1]')
  })

  it('maskedText and nerStatus from processWithStatus match what process() returns', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'hybrid' })

    const mockOllamaClient = {
      extractEntities: async () => [{ type: 'PERSON' as const, value: 'Jan Kowalski' }],
    } as unknown as OllamaClient

    // Two separate engines with the same mock
    const engine1 = new Engine(new MappingStore(), mockOllamaClient)
    const engine2 = new Engine(new MappingStore(), {
      extractEntities: async () => [{ type: 'PERSON' as const, value: 'Jan Kowalski' }],
    } as unknown as OllamaClient)

    const input = 'Jan Kowalski złożył pozew.'
    const fromProcess = await engine1.process(input)
    const { maskedText } = await engine2.processWithStatus(input)

    expect(maskedText).toBe(fromProcess)
  })
})

describe('OllamaClient.isModelReady + warmUp', () => {
  it('isModelReady returns false when fetch fails', async () => {
    // Import OllamaClient directly to test its methods
    const { OllamaClient } = await import('../src/core/ollama-client.js')
    const client = new OllamaClient({
      baseUrl: 'http://127.0.0.1:1', // port that is guaranteed to refuse connections
      model: 'llama3',
    })
    const result = await client.isModelReady(500)
    expect(result).toBe(false)
  })

  it('warmUp does not throw when Ollama is unavailable', async () => {
    const { OllamaClient } = await import('../src/core/ollama-client.js')
    const client = new OllamaClient({
      baseUrl: 'http://127.0.0.1:1',
      model: 'llama3',
    })
    // Should not throw
    expect(() => client.warmUp()).not.toThrow()
  })
})
