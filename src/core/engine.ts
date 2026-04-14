import { MappingStore } from './mapping-store.js'
import { OllamaClient, type OllamaEntity } from './ollama-client.js'
import { ConfigManager } from '../config/manager.js'
import type { LanguageRules } from '../languages/types.js'
import { EnglishRules } from '../languages/en/rules.js'
import { PolishRules } from '../languages/pl/rules.js'

const LANGUAGE_MAP: Record<string, LanguageRules> = {
  en: EnglishRules,
  pl: PolishRules,
}

/**
 * Main orchestrator. Coordinates regex-based masking and optional Ollama LLM NER.
 *
 * @param store       - Optional pre-constructed MappingStore (useful for session reuse)
 * @param ollamaClientOverride - Pass an OllamaClient (or null) to override auto-creation.
 *                               Used in tests to inject mocks without vi.mock hoisting.
 */
export class Engine {
  private readonly store: MappingStore
  private readonly ollamaClient: OllamaClient | null

  constructor(store?: MappingStore, ollamaClientOverride?: OllamaClient | null) {
    this.store = store ?? new MappingStore()

    if (ollamaClientOverride !== undefined) {
      // Explicit injection (tests pass mock or null here)
      this.ollamaClient = ollamaClientOverride
    } else {
      const cfg = ConfigManager.getInstance().get()
      const needsLlm = cfg.engines === 'hybrid' || cfg.engines === 'llm'
      this.ollamaClient = needsLlm
        ? new OllamaClient({ baseUrl: cfg.ollamaBaseUrl, model: cfg.ollamaModel })
        : null
    }
  }

  getStore(): MappingStore {
    return this.store
  }

  /**
   * Pseudonymize sensitive data in the given text.
   *
   * Phase 1 (regex | hybrid): Apply pattern-based masking for structured data
   *   (PESEL, IBAN, email, phone).
   * Phase 2 (llm | hybrid): Call Ollama NER to detect PERSON / ORG names.
   *   If Ollama is unavailable, this phase is silently skipped.
   */
  async process(text: string, extraLiterals?: string[]): Promise<string> {
    const cfg = ConfigManager.getInstance().get()
    const rules = LANGUAGE_MAP[cfg.lang] ?? EnglishRules

    let result = text

    if (cfg.engines === 'regex' || cfg.engines === 'hybrid') {
      result = this.applyRegexRules(result, rules, cfg.strictValidation)
    }

    const allLiterals = [...(cfg.customLiterals ?? []), ...(extraLiterals ?? [])]
    if (allLiterals.length > 0) {
      result = this.applyCustomLiterals(result, allLiterals)
    }

    if ((cfg.engines === 'llm' || cfg.engines === 'hybrid') && this.ollamaClient !== null) {
      result = await this.applyLlmNer(result)
    }

    return result
  }

  private applyCustomLiterals(text: string, literals: string[]): string {
    let result = text
    const sorted = [...literals].filter(Boolean).sort((a, b) => b.length - a.length)
    for (const literal of sorted) {
      const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(escaped, 'gi')
      result = result.replace(re, (match) => this.store.add('CUSTOM', match))
    }
    return result
  }

  private applyRegexRules(text: string, rules: LanguageRules, strictValidation: boolean): string {
    let result = text

    for (const patternDef of rules.patterns) {
      // Clone the regex to reset lastIndex — /g regexes are stateful
      const regex = new RegExp(patternDef.regex.source, patternDef.regex.flags)

      result = result.replace(regex, (match) => {
        if (patternDef.validate && strictValidation) {
          const clean = match.replace(/\s/g, '')
          if (!patternDef.validate(clean)) return match
        }
        return this.store.add(patternDef.tag, match)
      })
    }

    return result
  }

  /**
   * Split text into sentence-boundary chunks with 1-sentence overlap.
   * Visible for testing.
   */
  static splitIntoChunks(text: string, maxLen: number = 800): string[] {
    // Split into sentences at . ! ? followed by whitespace
    const sentences: string[] = []
    let lastIdx = 0
    const re = /[.!?][\s]+/g
    let match: RegExpExecArray | null

    while ((match = re.exec(text)) !== null) {
      const end = match.index + match[0].length
      sentences.push(text.slice(lastIdx, end))
      lastIdx = end
    }
    if (lastIdx < text.length) {
      sentences.push(text.slice(lastIdx))
    }
    if (sentences.length === 0) return [text]

    // Build chunks with 1-sentence overlap
    const chunks: string[] = []
    let current = ''
    let lastSentence = ''

    for (const sentence of sentences) {
      if (current.length + sentence.length > maxLen && current.length > 0) {
        chunks.push(current)
        current = lastSentence // overlap: start with last sentence of previous chunk
      }
      current += sentence
      lastSentence = sentence
    }
    if (current) chunks.push(current)

    return chunks
  }

  private async applyLlmNer(text: string): Promise<string> {
    const chunks = Engine.splitIntoChunks(text)

    // Collect all entities across chunks, passing known entities as context
    const allEntities: OllamaEntity[] = []

    for (let i = 0; i < chunks.length; i++) {
      let chunkEntities: OllamaEntity[]
      try {
        chunkEntities = await this.ollamaClient!.extractEntities(
          chunks[i],
          allEntities.length > 0 ? allEntities : undefined,
        )
      } catch (err) {
        process.stderr.write(
          `[pseudonym-mcp] Ollama NER failed on chunk ${i + 1}/${chunks.length} (skipping): ${String(err)}\n`,
        )
        continue
      }

      // Deduplicate: add only entities not already known
      for (const entity of chunkEntities) {
        const val = entity.value.trim()
        if (!val) continue
        if (!allEntities.some((e) => e.value === val && e.type === entity.type)) {
          allEntities.push(entity)
        }
      }
    }

    if (allEntities.length === 0) return text

    let result = text

    // Sort longest-first to prevent partial matches
    // e.g. "Auto-Lux International" must be replaced before "Auto-Lux"
    const sorted = [...allEntities].sort((a, b) => b.value.length - a.value.length)

    for (const entity of sorted) {
      const val = entity.value.trim()
      if (!val) continue
      // Escape regex special characters in the entity value
      const escaped = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(escaped, 'g')
      result = result.replace(re, () => this.store.add(entity.type, val))
    }

    return result
  }

  /**
   * Restore all [TAG:N] tokens in text to their original values.
   * Tokens not found in the store are left unchanged.
   */
  revert(text: string): string {
    return text.replace(/\[[A-Z]+:\d+\]/g, (token) => {
      return this.store.get(token) ?? token
    })
  }
}