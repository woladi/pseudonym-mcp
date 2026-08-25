import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ConfigManager } from '../src/config/manager.js'
import { toCliArgs } from '../src/config/cli-args.js'

/**
 * mcp-config.json was unreachable in practice: every CLI flag carried a
 * commander `default`, so `--lang` arrived at ConfigManager set to 'en' even
 * when nobody typed it, and outranked the file on the way past. The documented
 * order — CLI > file > defaults — held only for the two flags that happened to
 * have no default.
 *
 * These cases lock down both halves: commander's absent options must stay
 * undefined, and ConfigManager must layer them in the documented order.
 */

let sandbox: string

beforeEach(() => {
  ConfigManager.reset()
  sandbox = mkdtempSync(join(tmpdir(), 'pseudonym-mcp-config-'))
})

afterEach(() => {
  ConfigManager.reset()
  rmSync(sandbox, { recursive: true, force: true })
})

function writeConfig(contents: unknown): string {
  const path = join(sandbox, 'mcp-config.json')
  writeFileSync(path, typeof contents === 'string' ? contents : JSON.stringify(contents), 'utf-8')
  return path
}

describe('toCliArgs — absent flags stay absent', () => {
  it('produces an empty object when no flag was passed', () => {
    expect(toCliArgs({})).toEqual({})
  })

  it('never invents a lang', () => {
    expect(toCliArgs({ engines: 'regex' }).lang).toBeUndefined()
  })

  it('passes through the flags that were given', () => {
    expect(toCliArgs({ lang: 'pl', engines: 'regex', sensitivity: 'strict' })).toEqual({
      lang: 'pl',
      engines: 'regex',
      sensitivity: 'strict',
    })
  })

  it('splits comma-separated lists and lowercases locales', () => {
    const args = toCliArgs({ extraLocales: ' DE , it ,, ', customLiterals: 'Jan Kowalski, ACME ' })
    expect(args.extraLocales).toEqual(['de', 'it'])
    expect(args.customLiterals).toEqual(['Jan Kowalski', 'ACME'])
  })
})

describe('config precedence — CLI > mcp-config.json > defaults', () => {
  it('honours a config file lang when no --lang was passed', () => {
    const path = writeConfig({ lang: 'pl' })
    ConfigManager.init({ config: path })
    expect(ConfigManager.getInstance().get().lang).toBe('pl')
  })

  it('lets an explicit --lang override the config file', () => {
    const path = writeConfig({ lang: 'pl' })
    ConfigManager.init({ ...toCliArgs({ lang: 'de' }), config: path })
    expect(ConfigManager.getInstance().get().lang).toBe('de')
  })

  it('honours every config file key that has a CLI counterpart', () => {
    const path = writeConfig({
      lang: 'pl',
      engines: 'regex',
      ollamaModel: 'mistral',
      ollamaBaseUrl: 'http://elsewhere:1234',
      sensitivity: 'paranoid',
      autoUnmask: true,
      strictValidation: false,
      extraLocales: ['de'],
      customLiterals: ['Auto-Lux'],
    })
    // Exactly what the CLI hands over when the user typed only --config.
    ConfigManager.init({ ...toCliArgs({}), config: path })
    const cfg = ConfigManager.getInstance().get()

    expect(cfg).toMatchObject({
      lang: 'pl',
      engines: 'regex',
      ollamaModel: 'mistral',
      ollamaBaseUrl: 'http://elsewhere:1234',
      sensitivity: 'paranoid',
      autoUnmask: true,
      strictValidation: false,
      extraLocales: ['de'],
      customLiterals: ['Auto-Lux'],
    })
  })

  it('falls back to the fail-closed default when the file says nothing about lang', () => {
    const path = writeConfig({ engines: 'regex' })
    ConfigManager.init({ config: path })
    expect(ConfigManager.getInstance().get().lang).toBe('all')
  })

  it('normalizes a locale written with stray case or spacing', () => {
    const path = writeConfig({ lang: ' PL ', extraLocales: [' DE '] })
    ConfigManager.init({ config: path })
    const cfg = ConfigManager.getInstance().get()
    expect(cfg.lang).toBe('pl')
    expect(cfg.extraLocales).toEqual(['de'])
  })
})

describe('config problems are reported, not swallowed', () => {
  it('warns about a malformed config file and keeps the safe defaults', () => {
    const path = writeConfig('{ "lang": "pl", }')
    const manager = ConfigManager.init({ config: path })

    expect(manager.get().lang).toBe('all')
    expect(manager.getWarnings().join('\n')).toContain(path)
  })

  it('warns when an explicit --config path does not exist', () => {
    const manager = ConfigManager.init({ config: join(sandbox, 'absent.json') })
    expect(manager.getWarnings().join('\n')).toContain('does not exist')
  })

  it('rejects an out-of-enum engines value instead of adopting it', () => {
    const path = writeConfig({ engines: 'magic' })
    const manager = ConfigManager.init({ config: path })

    expect(manager.get().engines).toBe('hybrid')
    expect(manager.getWarnings().join('\n')).toContain('Invalid engines')
  })

  it('rejects an out-of-enum sensitivity value instead of adopting it', () => {
    const manager = ConfigManager.init({
      config: writeConfig({ sensitivity: 'extreme' }),
    })

    expect(manager.get().sensitivity).toBe('balanced')
    expect(manager.getWarnings().join('\n')).toContain('Invalid sensitivity')
  })

  it('says nothing when the config is clean', () => {
    const manager = ConfigManager.init({ config: writeConfig({ lang: 'pl' }) })
    expect(manager.getWarnings()).toEqual([])
  })
})
