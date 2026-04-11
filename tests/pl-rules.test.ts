import { describe, it, expect } from 'vitest'
import { PolishRules } from '../src/languages/pl/rules.js'
import type { PatternDef } from '../src/languages/types.js'

function findMatches(patternDef: PatternDef, text: string): string[] {
  const regex = new RegExp(patternDef.regex.source, patternDef.regex.flags)
  const matches: string[] = []
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    const raw = m[0]
    const clean = raw.replace(/\s/g, '')
    if (!patternDef.validate || patternDef.validate(clean)) {
      matches.push(raw)
    }
  }
  return matches
}

function getPattern(tag: string): PatternDef {
  const def = PolishRules.patterns.find((p) => p.tag === tag)
  if (!def) throw new Error(`Pattern for tag "${tag}" not found`)
  return def
}

describe('PESEL', () => {
  const def = getPattern('PESEL')

  it('matches a valid PESEL', () => {
    expect(findMatches(def, '90010112318')).toHaveLength(1)
  })

  it('rejects an invalid checksum', () => {
    expect(findMatches(def, '90010112345')).toHaveLength(0)
  })

  it('does not match a 10-digit number', () => {
    expect(findMatches(def, '1234567890')).toHaveLength(0)
  })

  it('does not match a 12-digit number', () => {
    expect(findMatches(def, '123456789012')).toHaveLength(0)
  })

  it('matches PESEL embedded in text', () => {
    expect(findMatches(def, 'PESEL: 90010112318, reszta')).toHaveLength(1)
  })
})

describe('IBAN', () => {
  const def = getPattern('IBAN')

  it('matches a compact PL IBAN', () => {
    expect(findMatches(def, 'PL27114020040000300201355387')).toHaveLength(1)
  })

  it('matches a space-formatted PL IBAN', () => {
    expect(findMatches(def, 'PL 27 1140 2004 0000 3002 0135 5387')).toHaveLength(1)
  })

  it('does not match a non-PL IBAN', () => {
    expect(findMatches(def, 'DE89370400440532013000')).toHaveLength(0)
  })

  it('is case-insensitive for the PL prefix', () => {
    expect(findMatches(def, 'pl27114020040000300201355387')).toHaveLength(1)
  })
})

describe('EMAIL', () => {
  const def = getPattern('EMAIL')

  it('matches a standard email', () => {
    expect(findMatches(def, 'test@example.com')).toHaveLength(1)
  })

  it('matches an email with dots in the local part', () => {
    expect(findMatches(def, 'jan.kowalski@firma.pl')).toHaveLength(1)
  })

  it('matches an email with plus-addressing', () => {
    expect(findMatches(def, 'user+tag@example.org')).toHaveLength(1)
  })

  it('does not match a string without @', () => {
    expect(findMatches(def, 'notanemail.com')).toHaveLength(0)
  })
})

describe('PHONE', () => {
  const def = getPattern('PHONE')

  it('matches +48 with spaces', () => {
    expect(findMatches(def, '+48 123 456 789')).toHaveLength(1)
  })

  it('matches +48 without spaces', () => {
    expect(findMatches(def, '+48123456789')).toHaveLength(1)
  })

  it('matches 0048 prefix', () => {
    expect(findMatches(def, '0048123456789')).toHaveLength(1)
  })

  it('matches 9-digit mobile number starting with 6', () => {
    expect(findMatches(def, '600100200')).toHaveLength(1)
  })

  it('matches 9-digit mobile number starting with 5', () => {
    expect(findMatches(def, '512345678')).toHaveLength(1)
  })
})
