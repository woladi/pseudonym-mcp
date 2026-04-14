import { describe, it, expect, beforeEach } from 'vitest'
import { ConfigManager } from '../src/config/manager.js'
import { MappingStore } from '../src/core/mapping-store.js'
import { Engine } from '../src/core/engine.js'
import type { OllamaClient, OllamaEntity } from '../src/core/ollama-client.js'

beforeEach(() => {
  ConfigManager.reset()
})

describe('Engine.splitIntoChunks', () => {
  it('returns a single chunk for short text', () => {
    const text = 'Jan Kowalski works at Acme. He is a senior engineer.'
    const chunks = Engine.splitIntoChunks(text, 800)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toBe(text)
  })

  it('splits long text into multiple chunks at sentence boundaries', () => {
    // Build text > 800 chars: ~20 sentences of ~60 chars each = ~1200 chars
    const sentence = 'Tomasz Kowalski pracuje w firmie BNP Paribas od lat. '
    const text = sentence.repeat(20).trimEnd()
    const chunks = Engine.splitIntoChunks(text, 800)

    expect(chunks.length).toBeGreaterThanOrEqual(2)
    // Each chunk should end at a sentence boundary (ends with ". " or the last part)
    for (const chunk of chunks.slice(0, -1)) {
      expect(chunk.trimEnd()).toMatch(/[.!?]$/)
    }
  })

  it('produces chunks each ≤ maxLen (unless a single sentence exceeds it)', () => {
    const sentence = 'Ala ma kota a kot ma Ale. '
    const text = sentence.repeat(50).trimEnd()
    const chunks = Engine.splitIntoChunks(text, 800)

    for (const chunk of chunks) {
      // A chunk may exceed maxLen only if it contains a single sentence longer than maxLen
      // In this case each sentence is ~25 chars, so all chunks should be ≤ 800
      expect(chunk.length).toBeLessThanOrEqual(800)
    }
  })

  it('never splits in the middle of a sentence', () => {
    const sentences = [
      'Pierwsze zdanie jest krótkie. ',
      'Drugie zdanie jest trochę dłuższe niż pierwsze. ',
      'Trzecie zdanie kontynuuje myśl. ',
    ]
    const text = sentences.join('')
    const chunks = Engine.splitIntoChunks(text, 80)

    // With maxLen=80, first chunk fits S1+S2 (~78 chars), second chunk has S2+S3 (overlap)
    for (const chunk of chunks) {
      // Each chunk should contain only complete sentences — no sentence cut mid-word
      // Check that chunk starts at a sentence boundary
      const trimmed = chunk.trimEnd()
      expect(trimmed).toMatch(/[.!?]$/)
    }
  })

  it('includes 1-sentence overlap between consecutive chunks', () => {
    const s1 = 'Anna Nowak jest prawnikiem. '
    const s2 = 'Pracuje w kancelarii Kowalski i Wspólnicy. '
    const s3 = 'Specjalizuje się w prawie handlowym. '
    const s4 = 'Tomasz Kowalski jest jej wspólnikiem. '
    const text = s1 + s2 + s3 + s4

    // maxLen = 80 — forces chunking
    const chunks = Engine.splitIntoChunks(text, 80)

    expect(chunks.length).toBeGreaterThanOrEqual(2)

    // The last sentence of chunk N should appear at the start of chunk N+1
    for (let i = 0; i < chunks.length - 1; i++) {
      const currentChunk = chunks[i]
      const nextChunk = chunks[i + 1]
      // Extract last sentence of current chunk
      const lastSentenceMatch = currentChunk.match(/[^.!?]*[.!?]\s*$/)
      if (lastSentenceMatch) {
        expect(nextChunk).toContain(lastSentenceMatch[0].trim())
      }
    }
  })

  it('handles text without sentence-ending punctuation as a single chunk', () => {
    const text = 'No punctuation here just a long stream of words that goes on and on'
    const chunks = Engine.splitIntoChunks(text, 30)
    // Without sentence boundaries, the whole text is one chunk
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toBe(text)
  })

  it('handles text with ~2500 chars producing 3+ chunks', () => {
    const sentence = 'Zdanie testowe numer jeden dwa trzy cztery pięć. '
    // ~50 chars per sentence, 50 sentences = ~2500 chars
    const text = sentence.repeat(50).trimEnd()
    const chunks = Engine.splitIntoChunks(text, 800)

    expect(chunks.length).toBeGreaterThanOrEqual(3)
  })
})

describe('Chunked NER — token consistency', () => {
  it('assigns same token to same entity across different chunks', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'hybrid', strictValidation: true })

    // Build text that requires 2+ chunks (> 800 chars)
    const part1 = 'Tomasz Kowalski podpisał umowę z BNP Paribas. '
    const filler = 'To jest dodatkowe zdanie wypełniające tekst testowy. '

    // ~800+ chars to force chunking
    const text =
      part1 + filler.repeat(14) + 'Tomasz Kowalski potwierdził warunki współpracy z BNP Paribas. '

    const mockOllamaClient = {
      extractEntities: async (_text: string) => {
        const entities: OllamaEntity[] = []
        if (_text.includes('Tomasz Kowalski')) {
          entities.push({ type: 'PERSON', value: 'Tomasz Kowalski' })
        }
        if (_text.includes('BNP Paribas')) {
          entities.push({ type: 'ORG', value: 'BNP Paribas' })
        }
        return entities
      },
    } as unknown as OllamaClient

    const store = new MappingStore()
    const engine = new Engine(store, mockOllamaClient)
    const masked = await engine.process(text)

    // Same entity should get same token everywhere
    expect(masked).not.toContain('Tomasz Kowalski')
    expect(masked).not.toContain('BNP Paribas')
    // Only [PERSON:1], not [PERSON:2]
    expect(masked.split('[PERSON:1]').length - 1).toBe(2)
    expect(masked).not.toContain('[PERSON:2]')
    // Only [ORG:1]
    expect(masked.split('[ORG:1]').length - 1).toBe(2)
    expect(masked).not.toContain('[ORG:2]')
  })

  it('passes known entities as context to subsequent chunks', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'hybrid' })

    const part1 = 'Anna Nowak pracuje w Google. '
    const filler = 'To jest dodatkowe zdanie wypełniające tekst testowy. '

    const text = part1 + filler.repeat(14) + 'Nowak potwierdziła warunki. '

    const callArgs: { text: string; known: OllamaEntity[] | undefined }[] = []

    const mockOllamaClient = {
      extractEntities: async (_text: string, knownEntities?: OllamaEntity[]) => {
        callArgs.push({ text: _text, known: knownEntities })
        const entities: OllamaEntity[] = []
        if (_text.includes('Anna Nowak')) {
          entities.push({ type: 'PERSON', value: 'Anna Nowak' })
        }
        if (_text.includes('Google')) {
          entities.push({ type: 'ORG', value: 'Google' })
        }
        return entities
      },
    } as unknown as OllamaClient

    const engine = new Engine(new MappingStore(), mockOllamaClient)
    await engine.process(text)

    // First chunk should have no known entities
    expect(callArgs[0].known).toBeUndefined()
    // Second chunk should receive entities from first chunk as context
    if (callArgs.length > 1) {
      expect(callArgs[1].known).toBeDefined()
      expect(callArgs[1].known!.length).toBeGreaterThan(0)
    }
  })
})

describe('Chunked NER — timeout resilience', () => {
  it('skips timed-out chunk and processes remaining chunks', async () => {
    ConfigManager.init({ lang: 'pl', engines: 'hybrid' })

    const part1 = 'Jan Kowalski podpisał umowę. '
    const filler = 'To jest dodatkowe zdanie wypełniające tekst testowy. '
    const part2 = 'Anna Nowak zatwierdziła dokument. '

    const text = part1 + filler.repeat(14) + part2

    let callCount = 0
    const mockOllamaClient = {
      extractEntities: async (_text: string) => {
        callCount++
        if (callCount === 1) {
          throw new Error('AbortError: timeout')
        }
        const entities: OllamaEntity[] = []
        if (_text.includes('Anna Nowak')) {
          entities.push({ type: 'PERSON', value: 'Anna Nowak' })
        }
        return entities
      },
    } as unknown as OllamaClient

    const engine = new Engine(new MappingStore(), mockOllamaClient)
    const masked = await engine.process(text)

    // First chunk timed out — its entities not detected
    // But second chunk succeeded — Anna Nowak should be masked
    expect(masked).not.toContain('Anna Nowak')
    expect(masked).toContain('[PERSON:1]')
    // Jan Kowalski was in the timed-out chunk — still in text
    expect(masked).toContain('Jan Kowalski')
  })
})
