import { describe, it, expect } from 'vitest'
import { LANGUAGE_CODE_MAP } from '../src/language/language-map.js'
import type { SupportedLang } from '../src/language/types.js'

describe('LANGUAGE_CODE_MAP', () => {
  it('maps pol to pl', () => {
    expect(LANGUAGE_CODE_MAP['pol']).toBe('pl')
  })

  it('maps eng to en', () => {
    expect(LANGUAGE_CODE_MAP['eng']).toBe('en')
  })

  it('returns undefined for unsupported ISO 639-3 codes', () => {
    expect(LANGUAGE_CODE_MAP['fra']).toBeUndefined()
    expect(LANGUAGE_CODE_MAP['deu']).toBeUndefined()
    expect(LANGUAGE_CODE_MAP['spa']).toBeUndefined()
  })

  it('returns undefined for made-up codes', () => {
    expect(LANGUAGE_CODE_MAP['xyz']).toBeUndefined()
  })

  it('every mapped value is a valid SupportedLang', () => {
    const validLangs: SupportedLang[] = ['pl', 'en']
    for (const value of Object.values(LANGUAGE_CODE_MAP)) {
      expect(validLangs).toContain(value)
    }
  })

  it('has at least pl and en entries', () => {
    const values = Object.values(LANGUAGE_CODE_MAP)
    expect(values).toContain('pl')
    expect(values).toContain('en')
  })
})
