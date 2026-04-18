import { describe, it, expect } from 'vitest'
import { allPatterns } from '../src/patterns/index.js'
import { balancedPatterns } from '../src/patterns/engines/balanced.js'
import { strictPatterns } from '../src/patterns/engines/strict.js'
import { paranoidPatterns } from '../src/patterns/engines/paranoid.js'
import { emailRule } from '../src/patterns/global/email.js'
import { peselRule } from '../src/patterns/locale/pl/pesel.js'
import { plPhoneRule } from '../src/patterns/locale/pl/phone.js'
import { ssnRule } from '../src/patterns/locale/en/ssn.js'
import type { EngineLevel } from '../src/patterns/types.js'

const VALID_ENGINE_LEVELS: EngineLevel[] = ['balanced', 'strict', 'paranoid']

// Helper: test a pattern against a string and return all matches
function findMatches(pattern: RegExp, text: string): string[] {
  const re = new RegExp(pattern.source, pattern.flags)
  return [...text.matchAll(re)].map((m) => m[0])
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
      expect(p.pattern).toBeInstanceOf(RegExp)
      expect(typeof p.description).toBe('string')
      expect(Array.isArray(p.engines)).toBe(true)
      expect(p.engines.length).toBeGreaterThan(0)
      // locales is null (global) or an array
      expect(p.locales === null || Array.isArray(p.locales)).toBe(true)
    }
  })

  it('all pattern ids are unique', () => {
    const ids = allPatterns.map((p) => p.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('all patterns have the g flag', () => {
    for (const p of allPatterns) {
      expect(p.pattern.flags).toContain('g')
    }
  })

  it('all engine values are valid EngineLevel', () => {
    for (const p of allPatterns) {
      for (const level of p.engines) {
        expect(VALID_ENGINE_LEVELS).toContain(level)
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

  it('paranoidPatterns contains all patterns (every pattern has paranoid)', () => {
    expect(paranoidPatterns.length).toBe(allPatterns.length)
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
    expect(findMatches(emailRule.pattern, 'user@example.com')).toEqual(['user@example.com'])
  })

  it('matches an email with plus-addressing', () => {
    expect(findMatches(emailRule.pattern, 'user+tag@domain.org')).toEqual(['user+tag@domain.org'])
  })

  it('matches an email embedded in text', () => {
    const matches = findMatches(emailRule.pattern, 'Contact me at hello@world.pl for details.')
    expect(matches).toEqual(['hello@world.pl'])
  })

  it('does not match a string without @', () => {
    expect(findMatches(emailRule.pattern, 'notanemail.com')).toEqual([])
  })
})

describe('peselRule', () => {
  it('matches a valid PESEL', () => {
    const matches = findMatches(peselRule.pattern, '90010112318')
    expect(matches).toEqual(['90010112318'])
  })

  it('does not match a 10-digit number', () => {
    expect(findMatches(peselRule.pattern, '1234567890')).toEqual([])
  })

  it('does not match a 12-digit number', () => {
    expect(findMatches(peselRule.pattern, '123456789012')).toEqual([])
  })

  it('has no validate function (checksum not required)', () => {
    expect(peselRule.validate).toBeUndefined()
  })

  it('matches an 11-digit number with invalid checksum', () => {
    expect(findMatches(peselRule.pattern, '85042312345')).toHaveLength(1)
  })
})

describe('plPhoneRule', () => {
  it('matches +48 with spaces', () => {
    const matches = findMatches(plPhoneRule.pattern, '+48 123 456 789')
    expect(matches.length).toBeGreaterThan(0)
  })

  it('matches +48 without spaces', () => {
    const matches = findMatches(plPhoneRule.pattern, '+48123456789')
    expect(matches.length).toBeGreaterThan(0)
  })

  it('matches 9-digit mobile number starting with 5', () => {
    const matches = findMatches(plPhoneRule.pattern, '512345678')
    expect(matches.length).toBeGreaterThan(0)
  })
})

describe('ssnRule', () => {
  it('matches a valid SSN', () => {
    expect(findMatches(ssnRule.pattern, '123-45-6789')).toEqual(['123-45-6789'])
  })

  it('matches SSN embedded in text', () => {
    const matches = findMatches(ssnRule.pattern, 'SSN: 123-45-6789.')
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
