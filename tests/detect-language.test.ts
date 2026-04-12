import { describe, it, expect } from 'vitest'
import { detectLanguage } from '../src/language/detect-language.js'

describe('detectLanguage', () => {
  describe('Polish text', () => {
    it('detects Polish from a typical sentence', () => {
      const result = detectLanguage('Moja mama jest bardzo dobra i lubi gotować obiady w domu')
      expect(result.detected).toBe('pl')
      expect(result.source).toBe('text')
      expect(result.raw).toBe('pol')
      expect(result.confidence).not.toBeNull()
      expect(result.confidence!).toBeGreaterThan(0.5)
    })

    it('detects Polish from a business sentence', () => {
      const result = detectLanguage(
        'Umowa zostaje zawarta na czas nieokreślony i wchodzi w życie z dniem podpisania',
      )
      expect(result.detected).toBe('pl')
      expect(result.source).toBe('text')
    })
  })

  describe('English text', () => {
    it('detects English from a typical sentence', () => {
      const result = detectLanguage(
        'Please review the attached document and provide your feedback by Friday',
      )
      expect(result.detected).toBe('en')
      expect(result.source).toBe('text')
      expect(result.raw).toBe('eng')
      expect(result.confidence).not.toBeNull()
      expect(result.confidence!).toBeGreaterThan(0.5)
    })

    it('detects English from a business sentence', () => {
      const result = detectLanguage(
        'The agreement shall be governed by the laws of the State of New York',
      )
      expect(result.detected).toBe('en')
      expect(result.source).toBe('text')
    })
  })

  describe('short / empty text', () => {
    it('returns unknown for empty string', () => {
      const result = detectLanguage('')
      expect(result.detected).toBe('unknown')
      expect(result.source).toBe('fallback')
      expect(result.raw).toBeNull()
      expect(result.confidence).toBeNull()
    })

    it('returns unknown for text below MIN_TEXT_LENGTH', () => {
      const result = detectLanguage('Hello')
      expect(result.detected).toBe('unknown')
      expect(result.source).toBe('fallback')
      expect(result.raw).toBeNull()
      expect(result.confidence).toBeNull()
    })

    it('returns unknown for whitespace-only string', () => {
      const result = detectLanguage('   ')
      expect(result.detected).toBe('unknown')
      expect(result.source).toBe('fallback')
    })
  })

  describe('unsupported / ambiguous language', () => {
    it('returns detected:unknown for German text (not in LANGUAGE_CODE_MAP)', () => {
      const result = detectLanguage(
        'Der schnelle braune Fuchs springt über den faulen Hund am Fluss entlang',
      )
      expect(result.detected).toBe('unknown')
      // raw should have the franc code, not null (franc was called)
      expect(result.raw).not.toBeNull()
    })

    it('result shape is always complete', () => {
      const result = detectLanguage('some random text that is long enough to process here')
      expect(result).toHaveProperty('detected')
      expect(result).toHaveProperty('source')
      expect(result).toHaveProperty('raw')
      expect(result).toHaveProperty('confidence')
    })
  })
})
