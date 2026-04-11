import { describe, it, expect } from 'vitest'
import { MappingStore } from '../src/core/mapping-store.js'

describe('MappingStore', () => {
  it('assigns sequential tokens per tag', () => {
    const store = new MappingStore()
    expect(store.add('PERSON', 'Alice')).toBe('[PERSON:1]')
    expect(store.add('PERSON', 'Bob')).toBe('[PERSON:2]')
    expect(store.add('ORG', 'Acme')).toBe('[ORG:1]')
  })

  it('is idempotent for the same original+tag', () => {
    const store = new MappingStore()
    const t1 = store.add('EMAIL', 'foo@bar.com')
    const t2 = store.add('EMAIL', 'foo@bar.com')
    expect(t1).toBe('[EMAIL:1]')
    expect(t1).toBe(t2)
  })

  it('retrieves the original value by token', () => {
    const store = new MappingStore()
    store.add('PESEL', '12345678901')
    expect(store.get('[PESEL:1]')).toBe('12345678901')
  })

  it('returns undefined for an unknown token', () => {
    const store = new MappingStore()
    expect(store.get('[PESEL:99]')).toBeUndefined()
  })

  it('clears all mappings and resets counters', () => {
    const store = new MappingStore()
    store.add('PERSON', 'Alice')
    store.clear()
    expect(store.get('[PERSON:1]')).toBeUndefined()
    // Counter should reset after clear
    expect(store.add('PERSON', 'Bob')).toBe('[PERSON:1]')
  })

  it('exposes all entries via getAll()', () => {
    const store = new MappingStore()
    store.add('PERSON', 'Alice')
    store.add('ORG', 'Acme')
    const all = store.getAll()
    expect(all.size).toBe(2)
    expect(all.get('[PERSON:1]')).toBe('Alice')
    expect(all.get('[ORG:1]')).toBe('Acme')
  })

  it('returns a stable session ID', () => {
    const store = new MappingStore('test-session')
    expect(store.getSessionId()).toBe('test-session')
  })

  it('generates a unique session ID when none is provided', () => {
    const a = new MappingStore()
    const b = new MappingStore()
    expect(a.getSessionId()).not.toBe(b.getSessionId())
  })
})
