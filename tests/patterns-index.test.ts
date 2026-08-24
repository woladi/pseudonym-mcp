import { describe, it, expect } from 'vitest'
import { allPatterns } from '../src/patterns/index.js'
import { balancedPatterns } from '../src/patterns/engines/balanced.js'
import { strictPatterns } from '../src/patterns/engines/strict.js'
import { paranoidPatterns } from '../src/patterns/engines/paranoid.js'
import { emailRule } from '../src/patterns/global/email.js'
import { peselRule } from '../src/patterns/locale/pl/pesel.js'
import { plPhoneRule } from '../src/patterns/locale/pl/phone.js'
import { ssnRule } from '../src/patterns/locale/en/ssn.js'
import { ENGINE_THRESHOLDS, maxScore, type PatternRule } from '../src/patterns/types.js'

// Helper: run every variant of a rule against a string and return all matches
function findMatches(rule: PatternRule, text: string): string[] {
  // Several variants of one rule can cover the same span — count it once.
  return [
    ...new Set(
      rule.patterns.flatMap((variant) => {
        const re = new RegExp(variant.regex.source, variant.regex.flags)
        return [...text.matchAll(re)].map((m) => m[0])
      }),
    ),
  ]
}

describe('allPatterns', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(allPatterns)).toBe(true)
    expect(allPatterns.length).toBeGreaterThanOrEqual(14)
  })

  it('every pattern has required fields', () => {
    for (const p of allPatterns) {
      expect(typeof p.id).toBe('string')
      expect(p.id.length).toBeGreaterThan(0)
      expect(typeof p.entityType).toBe('string')
      expect(p.entityType.length).toBeGreaterThan(0)
      expect(Array.isArray(p.patterns)).toBe(true)
      expect(p.patterns.length).toBeGreaterThan(0)
      expect(typeof p.description).toBe('string')
      // locales is null (global) or an array
      expect(p.locales === null || Array.isArray(p.locales)).toBe(true)
    }
  })

  it('all pattern ids are unique', () => {
    const ids = allPatterns.map((p) => p.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('all pattern variants have the g flag', () => {
    for (const p of allPatterns) {
      for (const variant of p.patterns) {
        expect(variant.regex.flags).toContain('g')
      }
    }
  })

  it('all variant scores are within [0, 1] and named', () => {
    for (const p of allPatterns) {
      for (const variant of p.patterns) {
        expect(variant.score).toBeGreaterThan(0)
        expect(variant.score).toBeLessThanOrEqual(1)
        expect(variant.name.length).toBeGreaterThan(0)
      }
    }
  })

  it('context words, where present, are non-empty strings', () => {
    for (const p of allPatterns) {
      for (const word of p.context ?? []) {
        expect(typeof word).toBe('string')
        expect(word.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('can find global.email by id', () => {
    const found = allPatterns.find((p) => p.id === 'global.email')
    expect(found).toBeDefined()
    expect(found!.entityType).toBe('EMAIL')
  })

  it('can find pl.pesel by id', () => {
    const found = allPatterns.find((p) => p.id === 'pl.pesel')
    expect(found).toBeDefined()
    expect(found!.locales).toContain('pl')
  })

  it('can find en.ssn by id', () => {
    const found = allPatterns.find((p) => p.id === 'en.ssn')
    expect(found).toBeDefined()
    expect(found!.locales).toContain('en')
  })
})

describe('engine presets', () => {
  it('balancedPatterns is a subset of allPatterns', () => {
    const allIds = new Set(allPatterns.map((p) => p.id))
    for (const p of balancedPatterns) {
      expect(allIds.has(p.id)).toBe(true)
    }
  })

  it('strictPatterns is a subset of allPatterns', () => {
    const allIds = new Set(allPatterns.map((p) => p.id))
    for (const p of strictPatterns) {
      expect(allIds.has(p.id)).toBe(true)
    }
  })

  it('paranoidPatterns contains all patterns (its threshold is the lowest)', () => {
    expect(paranoidPatterns.length).toBe(allPatterns.length)
  })

  it('presets follow from scores rather than a hand-kept list', () => {
    for (const p of balancedPatterns) {
      expect(maxScore(p)).toBeGreaterThanOrEqual(ENGINE_THRESHOLDS.balanced)
    }
    for (const p of strictPatterns) {
      expect(maxScore(p)).toBeGreaterThanOrEqual(ENGINE_THRESHOLDS.strict)
    }
  })

  it('balancedPatterns includes email and pesel', () => {
    const ids = balancedPatterns.map((p) => p.id)
    expect(ids).toContain('global.email')
    expect(ids).toContain('pl.pesel')
  })

  it('strictPatterns is a superset of balancedPatterns', () => {
    const strictIds = new Set(strictPatterns.map((p) => p.id))
    for (const p of balancedPatterns) {
      expect(strictIds.has(p.id)).toBe(true)
    }
  })
})

describe('emailRule', () => {
  it('matches a standard email', () => {
    expect(findMatches(emailRule, 'user@example.com')).toEqual(['user@example.com'])
  })

  it('matches an email with plus-addressing', () => {
    expect(findMatches(emailRule, 'user+tag@domain.org')).toEqual(['user+tag@domain.org'])
  })

  it('matches an email embedded in text', () => {
    const matches = findMatches(emailRule, 'Contact me at hello@world.pl for details.')
    expect(matches).toEqual(['hello@world.pl'])
  })

  it('does not match a string without @', () => {
    expect(findMatches(emailRule, 'notanemail.com')).toEqual([])
  })
})

describe('peselRule', () => {
  it('matches a valid PESEL', () => {
    const matches = findMatches(peselRule, '90010112318')
    expect(matches).toEqual(['90010112318'])
  })

  it('does not match a 10-digit number', () => {
    expect(findMatches(peselRule, '1234567890')).toEqual([])
  })

  it('does not match a 12-digit number', () => {
    expect(findMatches(peselRule, '123456789012')).toEqual([])
  })

  it('still matches an 11-digit number with an invalid checksum', () => {
    // The loose variant keeps recall; scoring decides whether it is masked.
    expect(findMatches(peselRule, '85042312345').length).toBeGreaterThan(0)
  })
})

describe('plPhoneRule', () => {
  it('matches +48 with spaces', () => {
    const matches = findMatches(plPhoneRule, '+48 123 456 789')
    expect(matches.length).toBeGreaterThan(0)
  })

  it('matches +48 without spaces', () => {
    const matches = findMatches(plPhoneRule, '+48123456789')
    expect(matches.length).toBeGreaterThan(0)
  })

  it('matches 9-digit mobile number starting with 5', () => {
    const matches = findMatches(plPhoneRule, '512345678')
    expect(matches.length).toBeGreaterThan(0)
  })
})

describe('ssnRule', () => {
  it('matches a valid SSN', () => {
    expect(findMatches(ssnRule, '123-45-6789')).toEqual(['123-45-6789'])
  })

  it('matches SSN embedded in text', () => {
    const matches = findMatches(ssnRule, 'SSN: 123-45-6789.')
    expect(matches).toEqual(['123-45-6789'])
  })

  it('validate() rejects area 000', () => {
    expect(ssnRule.validate!('000-45-6789')).toBe(false)
  })

  it('validate() rejects area 666', () => {
    expect(ssnRule.validate!('666-45-6789')).toBe(false)
  })

  it('validate() accepts a valid SSN', () => {
    expect(ssnRule.validate!('123-45-6789')).toBe(true)
  })
})
