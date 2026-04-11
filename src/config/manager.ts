import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export type EngineMode = 'regex' | 'llm' | 'hybrid'

export interface Config {
  lang: string
  engines: EngineMode
  ollamaModel: string
  ollamaBaseUrl: string
  autoUnmask: boolean
  peselStrictChecksum: boolean
}

export interface CliArgs {
  lang?: string
  engines?: EngineMode
  ollamaModel?: string
  ollamaBaseUrl?: string
  config?: string
  autoUnmask?: boolean
  peselStrictChecksum?: boolean
}

const DEFAULTS: Config = {
  lang: 'pl',
  engines: 'hybrid',
  ollamaModel: 'llama3',
  ollamaBaseUrl: 'http://localhost:11434',
  autoUnmask: false,
  peselStrictChecksum: true,
}

/**
 * Singleton configuration manager.
 *
 * Priority (highest to lowest): CLI args > mcp-config.json > built-in defaults
 *
 * Usage:
 *   ConfigManager.init(cliArgs)     // once, in cli.ts
 *   ConfigManager.getInstance()    // everywhere else
 *   ConfigManager.reset()          // in tests, to reset between cases
 */
export class ConfigManager {
  private static instance: ConfigManager | null = null
  private readonly config: Config

  private constructor(cliArgs: CliArgs = {}) {
    // Layer 1: defaults
    let cfg: Config = { ...DEFAULTS }

    // Layer 2: JSON config file
    const configPath = cliArgs.config
      ? resolve(cliArgs.config)
      : resolve(process.cwd(), 'mcp-config.json')

    if (existsSync(configPath)) {
      try {
        const raw = readFileSync(configPath, 'utf-8')
        const file = JSON.parse(raw) as Partial<Config>
        cfg = { ...cfg, ...file }
      } catch {
        // Malformed config — silently fall back to defaults
      }
    }

    // Layer 3: CLI args override everything
    if (cliArgs.lang !== undefined) cfg.lang = cliArgs.lang
    if (cliArgs.engines !== undefined) cfg.engines = cliArgs.engines
    if (cliArgs.ollamaModel !== undefined) cfg.ollamaModel = cliArgs.ollamaModel
    if (cliArgs.ollamaBaseUrl !== undefined) cfg.ollamaBaseUrl = cliArgs.ollamaBaseUrl
    if (cliArgs.autoUnmask !== undefined) cfg.autoUnmask = cliArgs.autoUnmask
    if (cliArgs.peselStrictChecksum !== undefined)
      cfg.peselStrictChecksum = cliArgs.peselStrictChecksum

    this.config = cfg
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
}
