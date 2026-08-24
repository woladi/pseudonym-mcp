import { describe, it, expect } from 'vitest'
import { PolishRules } from '../src/languages/pl/rules.js'
import type { PatternRule } from '../src/patterns/types.js'

function findMatches(rule: PatternRule, text: string): string[] {
  // Variants can match the same span; report each distinct match once.
  const matches = new Set<string>()
  // Only a 'boost' checksum never rejects; 'filter' and 'gate' both do.
  const gates = rule.validate !== undefined && (rule.checksumMode ?? 'filter') !== 'boost'
  for (const variant of rule.patterns) {
    const regex = new RegExp(variant.regex.source, variant.regex.flags)
    let m: RegExpExecArray | null
    while ((m = regex.exec(text)) !== null) {
      const raw = m[0]
      const clean = raw.replace(/\s/g, '')
      if (!gates || rule.validate!(clean)) {
        matches.add(raw)
      }
    }
  }
  return [...matches]
}

// Look rules up by id: several rules can share an entity type now (a generic
// IBAN rule and the locale-specific one both emit IBAN).
function getRule(id: string): PatternRule {
  const def = PolishRules.patterns.find((p) => p.id === id)
  if (!def) throw new Error(`Rule "${id}" not found`)
  return def
}

describe('PESEL', () => {
  const def = getRule('pl.pesel')

  it('matches any 11-digit number', () => {
    expect(findMatches(def, '90010112318')).toHaveLength(1)
  })

  it('matches an 11-digit number with invalid checksum', () => {
    // No checksum validation — any 11 digits are a PESEL candidate
    expect(findMatches(def, '85042312345')).toHaveLength(1)
  })

  it('does not match a 10-digit number', () => {
    expect(findMatches(def, '1234567890')).toHaveLength(0)
  })

  it('does not match a 12-digit number', () => {
    expect(findMatches(def, '123456789012')).toHaveLength(0)
  })

  it('matches only the digits in "PESEL XXXXXXXXXXX" (label stays)', () => {
    const matches = findMatches(def, 'PESEL 90010112318')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toBe('90010112318')
  })

  it('matches only the digits in "PESEL: XXXXXXXXXXX" (label stays)', () => {
    const matches = findMatches(def, 'PESEL: 90010112318, reszta')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toBe('90010112318')
  })

  it('matches only the digits in "nr PESEL: XXXXXXXXXXX" (label stays)', () => {
    const matches = findMatches(def, 'nr PESEL: 90010112318')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toBe('90010112318')
  })

  it('matches only the digits in "(PESEL XXXXXXXXXXX)" (label stays)', () => {
    const matches = findMatches(def, '(PESEL 90010112318)')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toBe('90010112318')
  })

  it('does not match 11 digits that are part of a 26-digit IBAN', () => {
    // Word boundary prevents matching inside a longer number sequence
    expect(findMatches(def, '61109010140000071219812874')).toHaveLength(0)
  })
})

describe('IBAN', () => {
  const def = getRule('pl.iban')

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

  it('matches 26 compact digits (no PL prefix)', () => {
    const matches = findMatches(def, '61109010140000071219812874')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toBe('61109010140000071219812874')
  })

  it('matches spaced 26 digits (no PL prefix): "61 1090 1014 ..."', () => {
    const matches = findMatches(def, '61 1090 1014 0000 0712 1981 2874')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toBe('61 1090 1014 0000 0712 1981 2874')
  })

  it('matches spaced 26 digits embedded in sentence', () => {
    const matches = findMatches(def, 'konto: 61 1090 1014 0000 0712 1981 2874, przelew')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toBe('61 1090 1014 0000 0712 1981 2874')
  })

  it('does not match 25-digit number', () => {
    expect(findMatches(def, '1234567890123456789012345')).toHaveLength(0)
  })

  it('does not match 27-digit number', () => {
    expect(findMatches(def, '123456789012345678901234567')).toHaveLength(0)
  })
})

describe('EMAIL', () => {
  const def = getRule('global.email')

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
  const def = getRule('pl.phone')

  it('matches +48 with spaces', () => {
    expect(findMatches(def, '+48 123 456 789')).toHaveLength(1)
  })

  it('matches +48 without spaces', () => {
    expect(findMatches(def, '+48123456789')).toHaveLength(1)
  })

  it('matches 0048 prefix', () => {
    expect(findMatches(def, '0048123456789')).toHaveLength(1)
  })

  it('matches 9-digit mobile number starting with 6 (no spaces)', () => {
    expect(findMatches(def, '600100200')).toHaveLength(1)
  })

  it('matches 9-digit mobile number starting with 5 (no spaces)', () => {
    expect(findMatches(def, '512345678')).toHaveLength(1)
  })

  it('matches mobile without +48: "601 234 567"', () => {
    const matches = findMatches(def, '601 234 567')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toBe('601 234 567')
  })

  it('matches mobile without +48: "601234567" (no spaces)', () => {
    const matches = findMatches(def, '601234567')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toBe('601234567')
  })

  it('matches landline without prefix: "22 555 44 33"', () => {
    expect(findMatches(def, '22 555 44 33')).toHaveLength(1)
  })

  it('matches landline without prefix: "22 4443322"', () => {
    expect(findMatches(def, '22 4443322')).toHaveLength(1)
  })

  it('matches landline with +48 prefix: "+48 22 555 44 33"', () => {
    expect(findMatches(def, '+48 22 555 44 33')).toHaveLength(1)
  })
})

describe('NIP', () => {
  const def = getRule('pl.nip')

  it('matches NIP in XXX-XXX-XX-XX format', () => {
    expect(findMatches(def, '526-000-00-05')).toHaveLength(1)
  })

  it('matches NIP with "NIP" label', () => {
    expect(findMatches(def, 'NIP 526-000-00-05')).toHaveLength(1)
  })

  it('captures "NIP" label as part of the match', () => {
    const matches = findMatches(def, 'NIP 526-000-00-05')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toBe('NIP 526-000-00-05')
  })

  it('captures "NIP:" label with colon as part of the match', () => {
    const matches = findMatches(def, 'NIP: 526-000-00-05')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toBe('NIP: 526-000-00-05')
  })

  it('matches a bare 10-digit NIP whose checksum validates', () => {
    expect(findMatches(def, '5260000005')).toContain('5260000005')
  })

  it('does not match a bare 10-digit number that fails the checksum', () => {
    expect(findMatches(def, '5260000000')).toHaveLength(0)
  })

  it('does not match NIP with spaces instead of hyphens', () => {
    expect(findMatches(def, '526 000 00 00')).toHaveLength(0)
  })
})

describe('PHONE — landline with +48 prefix', () => {
  const def = getRule('pl.phone')

  it('captures full "+48 22 555 44 33" including prefix', () => {
    const matches = findMatches(def, '+48 22 555 44 33')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toBe('+48 22 555 44 33')
  })

  it('matches "+48 22 300 40 50" (landline 2+3+2+2 grouping)', () => {
    const matches = findMatches(def, '+48 22 300 40 50')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toBe('+48 22 300 40 50')
  })

  it('does not match +48 followed by 10 digits', () => {
    expect(findMatches(def, '+48 22 300 400 500')).toHaveLength(0)
  })
})
