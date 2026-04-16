export interface OllamaEntity {
  type: 'PERSON' | 'ORG'
  value: string
}

export interface OllamaClientOptions {
  baseUrl: string
  model: string
  timeoutMs?: number
}

const SYSTEM_PROMPT = `You are a Named Entity Recognition engine.
Extract all PERSON names and ORGANIZATION names from the user's text.
Return ONLY a JSON array of objects with this exact shape:
[{"type":"PERSON","value":"..."}, {"type":"ORG","value":"..."}]
Do not return any text outside the JSON array. If no entities are found, return [].`

/**
 * Thin wrapper around the Ollama /api/chat endpoint.
 * Designed to be injected into Engine so it can be mocked in tests.
 */
export class OllamaClient {
  private readonly baseUrl: string
  private readonly model: string
  private readonly timeoutMs: number

  constructor(opts: OllamaClientOptions) {
    this.baseUrl = opts.baseUrl
    this.model = opts.model
    this.timeoutMs = opts.timeoutMs ?? 15_000
  }

  /**
   * Check whether the model is loaded and ready to respond to inference.
   * Sends a minimal chat request; returns true if Ollama replies within timeoutMs.
   */
  async isModelReady(timeoutMs = 10_000): Promise<boolean> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          stream: false,
          messages: [
            { role: 'system', content: 'Reply with []' },
            { role: 'user', content: 'Ping.' },
          ],
        }),
      })
      return res.ok
    } catch {
      return false
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Fire-and-forget: trigger model loading without waiting for the result.
   * Call at server startup so the model is warm before the first real request.
   */
  warmUp(): void {
    void this.isModelReady().catch(() => undefined)
  }

  async extractEntities(
    text: string,
    knownEntities?: OllamaEntity[],
  ): Promise<OllamaEntity[]> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    let systemContent = SYSTEM_PROMPT
    if (knownEntities && knownEntities.length > 0) {
      const list = knownEntities.map((e) => `"${e.value}" = ${e.type}`).join('; ')
      systemContent += `\nPreviously identified entities (reuse these exact values if they appear again): ${list}`
    }

    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          stream: false,
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: text },
          ],
        }),
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!res.ok) {
      throw new Error(`Ollama returned HTTP ${res.status}`)
    }

    const data = (await res.json()) as { message?: { content?: string } }
    const content = data?.message?.content ?? '[]'

    // Robustly extract the JSON array even if the LLM wraps it in prose
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    let parsed: unknown[]
    try {
      parsed = JSON.parse(jsonMatch[0]) as unknown[]
    } catch {
      return []
    }

    return parsed.filter(
      (e): e is OllamaEntity =>
        typeof e === 'object' &&
        e !== null &&
        'type' in e &&
        'value' in e &&
        ((e as Record<string, unknown>).type === 'PERSON' ||
          (e as Record<string, unknown>).type === 'ORG') &&
        typeof (e as Record<string, unknown>).value === 'string' &&
        ((e as Record<string, unknown>).value as string).trim().length > 0,
    )
  }
}
