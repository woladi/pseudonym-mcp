import { describe, it, expect } from 'vitest'
import { EnglishRules } from '../src/languages/en/rules.js'
import type { PatternDef } from '../src/languages/types.js'

function findMatches(patternDef: PatternDef, text: string): string[] {
  const regex = new RegExp(patternDef.regex.source, patternDef.regex.flags)
  const matches: string[] = []
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    const raw = m[0]
    const clean = raw.replace(/[\s-]/g, '')
    if (!patternDef.validate || patternDef.validate(clean)) {
      matches.push(raw)
    }
  }
  return matches
}

function getPattern(tag: string): PatternDef {
  const def = EnglishRules.patterns.find((p) => p.tag === tag)
  if (!def) throw new Error(`Pattern for tag "${tag}" not found`)
  return def
}

describe('SSN', () => {
  const def = getPattern('SSN')

  it('matches a valid SSN', () => {
    expect(findMatches(def, '123-45-6789')).toHaveLength(1)
  })

  it('rejects area 000', () => {
    expect(findMatches(def, '000-12-3456')).toHaveLength(0)
  })

  it('rejects area 666', () => {
    expect(findMatches(def, '666-12-3456')).toHaveLength(0)
  })

  it('rejects area 900+', () => {
    expect(findMatches(def, '900-12-3456')).toHaveLength(0)
    expect(findMatches(def, '999-12-3456')).toHaveLength(0)
  })

  it('rejects group 00', () => {
    expect(findMatches(def, '123-00-6789')).toHaveLength(0)
  })

  it('rejects serial 0000', () => {
    expect(findMatches(def, '123-45-0000')).toHaveLength(0)
  })

  it('matches SSN embedded in text', () => {
    expect(findMatches(def, 'SSN is 123-45-6789, thanks')).toHaveLength(1)
  })
})

describe('CREDIT_CARD', () => {
  const def = getPattern('CREDIT_CARD')

  it('matches Visa test number (4111111111111111)', () => {
    expect(findMatches(def, '4111111111111111')).toHaveLength(1)
  })

  it('matches spaced Visa (4111 1111 1111 1111)', () => {
    expect(findMatches(def, '4111 1111 1111 1111')).toHaveLength(1)
  })

  it('matches dashed card number', () => {
    expect(findMatches(def, '4111-1111-1111-1111')).toHaveLength(1)
  })

  it('matches Mastercard test number', () => {
    expect(findMatches(def, '5500000000000004')).toHaveLength(1)
  })

  it('matches Amex test number (15 digits)', () => {
    // 378282246310005 is the standard Amex test number
    expect(findMatches(def, '378282246310005')).toHaveLength(1)
  })

  it('rejects a number that fails Luhn', () => {
    expect(findMatches(def, '1234567890123456')).toHaveLength(0)
  })

  it('does not match less than 13 digits', () => {
    expect(findMatches(def, '123456789012')).toHaveLength(0)
  })
})

describe('EMAIL', () => {
  const def = getPattern('EMAIL')

  it('matches standard email', () => {
    expect(findMatches(def, 'user@example.com')).toHaveLength(1)
  })

  it('matches email with subdomain', () => {
    expect(findMatches(def, 'user@mail.company.co.uk')).toHaveLength(1)
  })

  it('does not match without @', () => {
    expect(findMatches(def, 'notanemail.com')).toHaveLength(0)
  })
})

describe('PHONE', () => {
  const def = getPattern('PHONE')

  it('matches (XXX) XXX-XXXX', () => {
    expect(findMatches(def, '(555) 123-4567')).toHaveLength(1)
  })

  it('matches XXX-XXX-XXXX', () => {
    expect(findMatches(def, '555-123-4567')).toHaveLength(1)
  })

  it('matches +1-XXX-XXX-XXXX', () => {
    expect(findMatches(def, '+1-555-123-4567')).toHaveLength(1)
  })

  it('matches XXX.XXX.XXXX', () => {
    expect(findMatches(def, '555.123.4567')).toHaveLength(1)
  })

  it('matches +1 (XXX) XXX-XXXX', () => {
    expect(findMatches(def, '+1 (555) 123-4567')).toHaveLength(1)
  })
})
