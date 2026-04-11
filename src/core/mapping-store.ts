import { randomUUID } from 'node:crypto'

/**
 * Session-isolated store that maps [TAG:N] tokens to their original values.
 *
 * The `add()` method is idempotent: if the same original value is added
 * under the same tag more than once, the existing token is returned,
 * preserving reference coherence in the masked text.
 */
export class MappingStore {
  private readonly sessionId: string
  private readonly store = new Map<string, string>()
  private readonly counters = new Map<string, number>()

  constructor(sessionId?: string) {
    this.sessionId = sessionId ?? randomUUID()
  }

  getSessionId(): string {
    return this.sessionId
  }

  /**
   * Register an original value and return its token `[TAG:N]`.
   * If the same original+tag combination was already registered,
   * the existing token is returned (idempotent).
   */
  add(tag: string, original: string): string {
    for (const [token, value] of this.store) {
      if (value === original && token.startsWith(`[${tag}:`)) {
        return token
      }
    }
    const n = (this.counters.get(tag) ?? 0) + 1
    this.counters.set(tag, n)
    const token = `[${tag}:${n}]`
    this.store.set(token, original)
    return token
  }

  get(token: string): string | undefined {
    return this.store.get(token)
  }

  getAll(): ReadonlyMap<string, string> {
    return this.store
  }

  clear(): void {
    this.store.clear()
    this.counters.clear()
  }
}
