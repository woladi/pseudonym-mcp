import { describe, it, expect, vi, afterEach } from 'vitest'
import { checkOllama } from '../src/setup/check-ollama.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('checkOllama', () => {
  it('returns running=false when fetch throws (Ollama not running)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
    const result = await checkOllama('http://localhost:11434', 'llama3', 500)
    expect(result.running).toBe(false)
    expect(result.modelAvailable).toBe(false)
    expect(result.error).toContain('ECONNREFUSED')
  })

  it('returns running=false when Ollama returns a non-ok status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }),
    )
    const result = await checkOllama('http://localhost:11434', 'llama3', 500)
    expect(result.running).toBe(false)
    expect(result.modelAvailable).toBe(false)
  })

  it('returns modelAvailable=true when the model name matches exactly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'llama3' }, { name: 'mistral:latest' }],
        }),
      }),
    )
    const result = await checkOllama('http://localhost:11434', 'llama3', 500)
    expect(result.running).toBe(true)
    expect(result.modelAvailable).toBe(true)
  })

  it('returns modelAvailable=true when the model name matches with a tag suffix', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'llama3:latest' }, { name: 'mistral:latest' }],
        }),
      }),
    )
    const result = await checkOllama('http://localhost:11434', 'llama3', 500)
    expect(result.running).toBe(true)
    expect(result.modelAvailable).toBe(true)
  })

  it('returns modelAvailable=false when the model is absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [{ name: 'mistral:latest' }] }),
      }),
    )
    const result = await checkOllama('http://localhost:11434', 'llama3', 500)
    expect(result.running).toBe(true)
    expect(result.modelAvailable).toBe(false)
  })
})
