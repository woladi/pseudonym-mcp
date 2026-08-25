import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { ALL_LOCALES, type EngineLevel } from '../patterns/types.js'

export type EngineMode = 'regex' | 'llm' | 'hybrid'

export interface Config {
  /**
   * Locale pack to run, or 'all' (the default) for every pack at once.
   * See ALL_LOCALES for why the default is not a single language.
   */
  lang: string
  engines: EngineMode
  ollamaModel: string
  ollamaBaseUrl: string
  autoUnmask: boolean
  strictValidation: boolean
  customLiterals: string[]
  /**
   * How much confidence a match needs before it is masked:
   * balanced (default) masks only high-confidence matches, strict adds
   * weaker context-dependent ones, paranoid masks everything a rule sees.
   */
  sensitivity: EngineLevel
  /**
   * Extra locales to recognize alongside `lang`. A Polish invoice carries
   * German and Italian identifiers too, and those packs would otherwise stay
   * dormant because the document language is Polish. Redundant while `lang`
   * is 'all'; the point of it is narrowing `lang` without losing a neighbour.
   */
  extraLocales: string[]
}

export interface CliArgs {
  lang?: string
  engines?: EngineMode
  ollamaModel?: string
  ollamaBaseUrl?: string
  config?: string
  autoUnmask?: boolean
  strictValidation?: boolean
  customLiterals?: string[]
  sensitivity?: EngineLevel
  extraLocales?: string[]
}

const DEFAULTS: Config = {
  // Fail closed: recognize every locale until told to narrow. A default of
  // 'en' let Polish, German and every other national identifier through
  // untouched while the server still reported success.
  lang: ALL_LOCALES,
  engines: 'hybrid',
  ollamaModel: 'llama3',
  ollamaBaseUrl: 'http://localhost:11434',
  autoUnmask: false,
  strictValidation: true,
  customLiterals: [],
  sensitivity: 'balanced',
  extraLocales: [],
}

const VALID_ENGINES: EngineMode[] = ['regex', 'llm', 'hybrid']
const VALID_SENSITIVITY: EngineLevel[] = ['balanced', 'strict', 'paranoid']

const normalizeLocale = (value: string): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()

const toStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.map((v) => String(v)).filter(Boolean) : undefined

/**
 * Singleton configuration manager.
 *
 * Priority (highest to lowest): CLI args > mcp-config.json > built-in defaults
 *
 * That ordering only holds because every CLI flag is genuinely optional: a
 * flag carrying a commander default would arrive here indistinguishable from
 * one the user typed, and would silently outrank the config file.
 *
 * Usage:
 *   ConfigManager.init(cliArgs)     // once, in cli.ts
 *   ConfigManager.getInstance()    // everywhere else
 *   ConfigManager.reset()          // in tests, to reset between cases
 */
export class ConfigManager {
  private static instance: ConfigManager | null = null
  private readonly config: Config
  private readonly warnings: string[] = []

  private constructor(cliArgs: CliArgs = {}) {
    // Layer 1: defaults
    let cfg: Config = { ...DEFAULTS }

    // Layer 2: JSON config file
    const explicitPath = cliArgs.config !== undefined
    const configPath = explicitPath
      ? resolve(cliArgs.config!)
      : resolve(process.cwd(), 'mcp-config.json')

    if (existsSync(configPath)) {
      try {
        const raw = readFileSync(configPath, 'utf-8')
        const file = JSON.parse(raw) as Partial<Config>
        cfg = this.applyFile(cfg, file, configPath)
      } catch (err) {
        // A config that cannot be parsed used to be swallowed silently, which
        // meant a stray comma quietly reverted every setting.
        this.warnings.push(
          `Could not read ${configPath} (${String(err)}) — falling back to built-in defaults.`,
        )
      }
    } else if (explicitPath) {
      this.warnings.push(`Config file ${configPath} does not exist — using built-in defaults.`)
    }

    // Layer 3: CLI args override everything
    if (cliArgs.lang !== undefined) cfg.lang = normalizeLocale(cliArgs.lang)
    if (cliArgs.engines !== undefined) cfg.engines = this.validEngines(cliArgs.engines, cfg.engines)
    if (cliArgs.ollamaModel !== undefined) cfg.ollamaModel = cliArgs.ollamaModel
    if (cliArgs.ollamaBaseUrl !== undefined) cfg.ollamaBaseUrl = cliArgs.ollamaBaseUrl
    if (cliArgs.autoUnmask !== undefined) cfg.autoUnmask = cliArgs.autoUnmask
    if (cliArgs.strictValidation !== undefined) cfg.strictValidation = cliArgs.strictValidation
    if (cliArgs.customLiterals !== undefined) cfg.customLiterals = cliArgs.customLiterals
    if (cliArgs.sensitivity !== undefined) {
      cfg.sensitivity = this.validSensitivity(cliArgs.sensitivity, cfg.sensitivity)
    }
    if (cliArgs.extraLocales !== undefined) {
      cfg.extraLocales = cliArgs.extraLocales.map(normalizeLocale).filter(Boolean)
    }

    this.config = cfg
  }

  /**
   * Merge a parsed config file over the running config, ignoring keys it does
   * not set and refusing values outside the documented enums.
   */
  private applyFile(base: Config, file: Partial<Config>, path: string): Config {
    const cfg: Config = { ...base }

    if (file.lang !== undefined) cfg.lang = normalizeLocale(String(file.lang))
    if (file.engines !== undefined) cfg.engines = this.validEngines(file.engines, cfg.engines, path)
    if (file.ollamaModel !== undefined) cfg.ollamaModel = String(file.ollamaModel)
    if (file.ollamaBaseUrl !== undefined) cfg.ollamaBaseUrl = String(file.ollamaBaseUrl)
    if (file.autoUnmask !== undefined) cfg.autoUnmask = Boolean(file.autoUnmask)
    if (file.strictValidation !== undefined) cfg.strictValidation = Boolean(file.strictValidation)
    if (file.sensitivity !== undefined) {
      cfg.sensitivity = this.validSensitivity(file.sensitivity, cfg.sensitivity, path)
    }

    const literals = toStringArray(file.customLiterals)
    if (literals !== undefined) cfg.customLiterals = literals

    const extras = toStringArray(file.extraLocales)
    if (extras !== undefined) cfg.extraLocales = extras.map(normalizeLocale).filter(Boolean)

    return cfg
  }

  private validEngines(value: unknown, fallback: EngineMode, source?: string): EngineMode {
    if (VALID_ENGINES.includes(value as EngineMode)) return value as EngineMode
    this.warnings.push(
      `Invalid engines "${String(value)}"${source ? ` in ${source}` : ''} — keeping "${fallback}". Valid: ${VALID_ENGINES.join(', ')}.`,
    )
    return fallback
  }

  private validSensitivity(value: unknown, fallback: EngineLevel, source?: string): EngineLevel {
    if (VALID_SENSITIVITY.includes(value as EngineLevel)) return value as EngineLevel
    this.warnings.push(
      `Invalid sensitivity "${String(value)}"${source ? ` in ${source}` : ''} — keeping "${fallback}". Valid: ${VALID_SENSITIVITY.join(', ')}.`,
    )
    return fallback
  }

  static init(cliArgs?: CliArgs): ConfigManager {
    ConfigManager.instance = new ConfigManager(cliArgs)
    return ConfigManager.instance
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager()
    }
    return ConfigManager.instance
  }

  /** Reset the singleton — for use in tests only */
  static reset(): void {
    ConfigManager.instance = null
  }

  /** Returns a shallow copy of the current config to prevent mutation */
  get(): Config {
    return { ...this.config }
  }

  /**
   * Problems found while loading the configuration — an unreadable file, a
   * value outside its enum. Reported at startup rather than swallowed.
   */
  getWarnings(): string[] {
    return [...this.warnings]
  }
}
