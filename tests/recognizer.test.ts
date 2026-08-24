import { describe, it, expect } from 'vitest'
import { findCandidates } from '../src/core/recognizer.js'
import { peselRule } from '../src/patterns/locale/pl/pesel.js'
import { nipRule } from '../src/patterns/locale/pl/nip.js'
import { emailRule } from '../src/patterns/global/email.js'
import { plPostalCodeRule } from '../src/patterns/locale/pl/postal-code.js'
import type { PatternRule } from '../src/patterns/types.js'

const VALID_PESEL = '44051401359'
const INVALID_PESEL = '85042312345'
const VALID_NIP = '5260000005'

describe('findCandidates — thresholds', () => {
  it('keeps a high-confidence match at every level', () => {
    for (const level of ['balanced', 'strict', 'paranoid'] as const) {
      const found = findCandidates('kontakt: jan@example.pl', [emailRule], { level })
      expect(found.map((c) => c.text)).toEqual(['jan@example.pl'])
    }
  })

  it('hides a weak match at balanced and reveals it at paranoid', () => {
    // No label near it — "adres" would now count as context for this rule.
    const text = 'Warszawa 00-950'
    expect(findCandidates(text, [plPostalCodeRule], { level: 'balanced' })).toHaveLength(0)
    expect(findCandidates(text, [plPostalCodeRule], { level: 'paranoid' })).toHaveLength(1)
  })
})

describe('findCandidates — checksums', () => {
  it('raises the score of a PESEL that validates', () => {
    const [valid] = findCandidates(VALID_PESEL, [peselRule])
    const [invalid] = findCandidates(INVALID_PESEL, [peselRule])
    expect(valid.checksum).toBe(true)
    expect(invalid.checksum).toBe(false)
    expect(valid.score).toBeGreaterThan(invalid.score)
  })

  it('still reports a PESEL whose checksum fails — a leak is worse than a false positive', () => {
    const found = findCandidates(INVALID_PESEL, [peselRule], { strictValidation: true })
    expect(found).toHaveLength(1)
  })

  it('drops a bare NIP whose checksum fails, because there the checksum gates', () => {
    expect(findCandidates('5260000000', [nipRule], { strictValidation: true })).toHaveLength(0)
    expect(findCandidates(VALID_NIP, [nipRule], { strictValidation: true })).toHaveLength(1)
  })

  it('keeps a failing checksum when strict validation is off', () => {
    const found = findCandidates('5260000000', [nipRule], {
      strictValidation: false,
      level: 'paranoid',
    })
    expect(found.length).toBeGreaterThan(0)
  })
})

describe('findCandidates — context words', () => {
  // A rule that on its own is far too weak to fire.
  const weakRule: PatternRule = {
    id: 'test.weak',
    entityType: 'WEAK',
    patterns: [{ name: 'four digits', regex: /\b\d{4}\b/g, score: 0.15 }],
    locales: null,
    context: ['numer klienta'],
    description: 'test rule',
  }

  it('lifts a weak match over the bar when a context word is near', () => {
    const withContext = findCandidates('numer klienta: 4821', [weakRule], { level: 'strict' })
    expect(withContext).toHaveLength(1)
    expect(withContext[0].contextHit).toBe(true)
  })

  it('leaves the same match below the bar without the context word', () => {
    expect(findCandidates('zamówienie 4821', [weakRule], { level: 'strict' })).toHaveLength(0)
  })

  it('matches context words across Polish inflection boundaries', () => {
    const found = findCandidates('W polu "numer klienta" wpisano 4821.', [weakRule], {
      level: 'strict',
    })
    expect(found).toHaveLength(1)
  })
})

describe('findCandidates — overlap resolution', () => {
  it('keeps the higher-scoring rule when two rules cover the same span', () => {
    // A valid PESEL is also eleven digits; only one candidate may survive.
    const found = findCandidates(`PESEL ${VALID_PESEL}`, [peselRule])
    expect(found).toHaveLength(1)
    expect(found[0].entityType).toBe('PESEL')
  })

  it('returns candidates in document order', () => {
    const found = findCandidates(`a@b.pl oraz PESEL ${VALID_PESEL}`, [emailRule, peselRule])
    expect(found.map((c) => c.entityType)).toEqual(['EMAIL', 'PESEL'])
    expect(found[0].start).toBeLessThan(found[1].start)
  })
})
