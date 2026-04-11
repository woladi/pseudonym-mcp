import { MappingStore } from './mapping-store.js'
import { OllamaClient, type OllamaEntity } from './ollama-client.js'
import { ConfigManager } from '../config/manager.js'
import type { LanguageRules } from '../languages/types.js'
import { PolishRules } from '../languages/pl/rules.js'

const LANGUAGE_MAP: Record<string, LanguageRules> = {
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

  constructor(
    store?: MappingStore,
    ollamaClientOverride?: OllamaClient | null
  ) {
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
  async process(text: string): Promise<string> {
    const cfg = ConfigManager.getInstance().get()
    const rules = LANGUAGE_MAP[cfg.lang] ?? PolishRules

    let result = text

    if (cfg.engines === 'regex' || cfg.engines === 'hybrid') {
      result = this.applyRegexRules(result, rules, cfg.peselStrictChecksum)
    }

    if (
      (cfg.engines === 'llm' || cfg.engines === 'hybrid') &&
      this.ollamaClient !== null
    ) {
      result = await this.applyLlmNer(result)
    }

    return result
  }

  private applyRegexRules(
    text: string,
    rules: LanguageRules,
    strictChecksum: boolean
  ): string {
    let result = text

    for (const patternDef of rules.patterns) {
      // Clone the regex to reset lastIndex — /g regexes are stateful
      const regex = new RegExp(patternDef.regex.source, patternDef.regex.flags)

      result = result.replace(regex, (match) => {
        if (patternDef.validate && strictChecksum) {
          const clean = match.replace(/\s/g, '')
          if (!patternDef.validate(clean)) return match
        }
        return this.store.add(patternDef.tag, match)
      })
    }

    return result
  }

  private async applyLlmNer(text: string): Promise<string> {
    let entities: OllamaEntity[]
    try {
      entities = await this.ollamaClient!.extractEntities(text)
    } catch (err) {
      process.stderr.write(
        `[pseudonym-mcp] Ollama NER failed (skipping LLM phase): ${String(err)}\n`
      )
      return text
    }

    if (entities.length === 0) return text

    let result = text

    // Sort longest-first to prevent partial matches
    // e.g. "Auto-Lux International" must be replaced before "Auto-Lux"
    const sorted = [...entities].sort((a, b) => b.value.length - a.value.length)

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
