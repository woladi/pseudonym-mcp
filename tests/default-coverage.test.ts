import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ConfigManager } from '../src/config/manager.js'
import { Engine } from '../src/core/engine.js'
import { MappingStore } from '../src/core/mapping-store.js'
import { SUPPORTED_LOCALES, resolveLocales } from '../src/patterns/types.js'
import { allPatterns } from '../src/patterns/index.js'

/**
 * The bug this file exists for: with no --lang, the server recognized the
 * English pack only. A Polish document went through with its PESEL, NIP and
 * phone number intact, and mask_text still reported success.
 *
 * Every case below runs under the *default* configuration — no lang, no
 * extraLocales — from a working directory with no mcp-config.json, which is
 * what an MCP client spawning `npx pseudonym-mcp` actually produces. The rest
 * of the suite pins a locale explicitly and so could never have caught this.
 */

let previousCwd: string
let sandbox: string

beforeAll(() => {
  previousCwd = process.cwd()
  sandbox = mkdtempSync(join(tmpdir(), 'pseudonym-mcp-default-'))
  process.chdir(sandbox)
})

afterAll(() => {
  process.chdir(previousCwd)
  rmSync(sandbox, { recursive: true, force: true })
})

beforeEach(() => ConfigManager.reset())
afterEach(() => ConfigManager.reset())

/** An engine configured exactly as a freshly spawned server would be. */
function defaultEngine(): Engine {
  ConfigManager.init({ engines: 'regex' })
  return new Engine(new MappingStore(), null)
}

/**
 * One identifier per locale pack, each a published specimen rather than a real
 * person's. Labelled the way a document labels them, because that is the input
 * the tool is for.
 */
const PACK_SPECIMENS: Array<{
  locale: string
  label: string
  text: string
  secret: string
  token: string
}> = [
  {
    locale: 'pl',
    label: 'PESEL',
    text: 'PESEL 90010112318 w aktach sprawy.',
    secret: '90010112318',
    token: '[PESEL:',
  },
  {
    locale: 'pl',
    label: 'NIP',
    text: 'Sprzedawca NIP 526-000-00-05 wystawił fakturę.',
    secret: '526-000-00-05',
    token: '[NIP:',
  },
  {
    locale: 'en',
    label: 'SSN',
    text: 'Employee SSN 123-45-6789 on file.',
    secret: '123-45-6789',
    token: '[SSN:',
  },
  {
    locale: 'de',
    label: 'Steuer-ID',
    text: 'Steuer-ID 86095742719 laut Bescheid.',
    secret: '86095742719',
    token: '[DE_TAX_ID:',
  },
  {
    locale: 'it',
    label: 'codice fiscale',
    text: 'Codice fiscale: RSSMRA85T10A562S.',
    secret: 'RSSMRA85T10A562S',
    token: '[IT_FISCAL_CODE:',
  },
  {
    locale: 'es',
    label: 'NIF',
    text: 'DNI 12345678Z en el expediente.',
    secret: '12345678Z',
    token: '[ES_NIF:',
  },
  {
    locale: 'es',
    label: 'NIE',
    text: 'NIE X1234567L del solicitante.',
    secret: 'X1234567L',
    token: '[ES_NIE:',
  },
  {
    locale: 'fr',
    label: 'NIR',
    text: 'Numéro de sécurité sociale 180126955222380.',
    secret: '180126955222380',
    token: '[FR_NIR:',
  },
  {
    locale: 'nl',
    label: 'BSN',
    text: 'Burgerservicenummer 111222333 op het formulier.',
    secret: '111222333',
    token: '[NL_BSN:',
  },
  {
    locale: 'cz',
    label: 'rodné číslo',
    text: 'Rodné číslo 740113/0319 ve smlouvě.',
    secret: '740113/0319',
    token: '[CZ_SK_BIRTH_NUMBER:',
  },
  {
    locale: 'se',
    label: 'personnummer',
    text: 'Personnummer 811218-9876 i registret.',
    secret: '811218-9876',
    token: '[SE_PERSONNUMMER:',
  },
  {
    locale: 'fi',
    label: 'hetu',
    text: 'Henkilötunnus 131052-308T rekisterissä.',
    secret: '131052-308T',
    token: '[FI_HETU:',
  },
  {
    locale: 'uk',
    label: 'NHS number',
    text: 'NHS number 943 476 5919 on the record.',
    secret: '943 476 5919',
    token: '[UK_NHS:',
  },
  {
    locale: 'uk',
    label: 'NINO',
    text: 'National Insurance number AB123456C.',
    secret: 'AB123456C',
    token: '[UK_NINO:',
  },
]

describe('default configuration — every locale pack is live', () => {
  it('starts from no working-directory config, so these are the built-in defaults', () => {
    defaultEngine()
    const cfg = ConfigManager.getInstance().get()
    expect(cfg.lang).toBe('all')
    expect(cfg.extraLocales).toEqual([])
  })

  it('covers every locale in SUPPORTED_LOCALES with at least one specimen', () => {
    const covered = new Set(PACK_SPECIMENS.map((s) => s.locale))
    // 'sk' shares the Czech rule; a specimen for it would be the same number.
    const expected = SUPPORTED_LOCALES.filter((l) => l !== 'sk')
    expect([...expected].filter((l) => !covered.has(l))).toEqual([])
  })

  for (const specimen of PACK_SPECIMENS) {
    it(`masks a ${specimen.locale} ${specimen.label} with no --lang given`, async () => {
      const out = await defaultEngine().process(specimen.text)
      expect(out).not.toContain(specimen.secret)
      expect(out).toContain(specimen.token)
    })
  }
})

describe('default configuration — the reported repro', () => {
  const REPRO =
    'PESEL 92050812346, IBAN PL61109010140000071219812874, tel +48 601 234 567, ' +
    'mail biuro@nordvale.example, NIP 7582176403.'

  it('masks every identifier in a Polish sentence without --lang pl', async () => {
    const out = await defaultEngine().process(REPRO)

    for (const secret of [
      '92050812346',
      'PL61109010140000071219812874',
      '+48 601 234 567',
      'biuro@nordvale.example',
      '7582176403',
    ]) {
      expect(out).not.toContain(secret)
    }

    for (const token of ['[PESEL:', '[IBAN:', '[PHONE:', '[EMAIL:', '[NIP:']) {
      expect(out).toContain(token)
    }
  })

  it('still lets --lang narrow coverage when that is what was asked for', async () => {
    ConfigManager.reset()
    ConfigManager.init({ lang: 'en', engines: 'regex' })
    const out = await new Engine(new MappingStore(), null).process(REPRO)

    // Narrowing is a deliberate act and keeps working — it just has to be one.
    expect(out).toContain('92050812346')
    expect(out).toContain('[EMAIL:1]')
  })
})

describe('locale selection', () => {
  it('turns every pack on for the default lang', () => {
    const selection = resolveLocales('all')
    expect(selection.all).toBe(true)
    expect(selection.active).toEqual(SUPPORTED_LOCALES)
    expect(selection.disabled).toEqual([])
  })

  it('fails closed on an unknown locale instead of falling back to English', () => {
    const selection = resolveLocales('pll')
    expect(selection.all).toBe(true)
    expect(selection.unknown).toEqual(['pll'])
    expect(selection.active).toEqual(SUPPORTED_LOCALES)
  })

  it('reports what a narrowed selection leaves off', () => {
    const selection = resolveLocales('pl', ['de'])
    expect(selection.active).toEqual(['pl', 'de'])
    expect(selection.disabled).toContain('en')
    expect(selection.disabled).toContain('uk')
    expect(selection.disabled).not.toContain('pl')
  })

  it('ignores an unknown extra locale but keeps the known ones', () => {
    const selection = resolveLocales('pl', ['de', 'zz'])
    expect(selection.active).toEqual(['pl', 'de'])
    expect(selection.unknown).toEqual(['zz'])
    expect(selection.all).toBe(false)
  })

  it('lists exactly the locales that some rule declares', () => {
    // A new pack that never reaches SUPPORTED_LOCALES would never be loaded by
    // the default selection — which is the failure mode this file is about.
    const declared = new Set(allPatterns.flatMap((rule) => rule.locales ?? []))
    expect([...declared].sort()).toEqual([...SUPPORTED_LOCALES].sort())
  })
})

describe('an explicitly narrowed default is still reachable from a config file', () => {
  it('reads lang from mcp-config.json in the working directory', async () => {
    writeFileSync(join(sandbox, 'mcp-config.json'), JSON.stringify({ lang: 'en' }), 'utf-8')
    try {
      ConfigManager.reset()
      ConfigManager.init({ engines: 'regex' })
      expect(ConfigManager.getInstance().get().lang).toBe('en')
    } finally {
      rmSync(join(sandbox, 'mcp-config.json'), { force: true })
    }
  })
})
