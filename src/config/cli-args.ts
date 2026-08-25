import type { CliArgs, EngineMode } from './manager.js'
import type { EngineLevel } from '../patterns/types.js'

/**
 * Raw commander output. Every field is optional on purpose: commander fills in
 * a `default` before the action runs, so a flag with one is indistinguishable
 * from a flag the user typed — and would silently outrank mcp-config.json.
 * Defaults live in ConfigManager, and only there.
 */
export interface CliOptions {
  lang?: string
  engines?: string
  ollamaModel?: string
  ollamaBaseUrl?: string
  sensitivity?: string
  config?: string
  autoUnmask?: boolean
  extraLocales?: string
  customLiterals?: string
}

const splitList = (value: string, transform: (s: string) => string): string[] =>
  value
    .split(',')
    .map((s) => transform(s.trim()))
    .filter(Boolean)

/**
 * Map commander's options onto CliArgs, leaving anything the user did not pass
 * `undefined` so the config file and built-in defaults can still be seen.
 * Values are not validated here — ConfigManager checks the file and the CLI
 * against the same rules.
 */
export function toCliArgs(opts: CliOptions): CliArgs {
  const args: CliArgs = {}

  if (opts.lang !== undefined) args.lang = opts.lang
  if (opts.engines !== undefined) args.engines = opts.engines as EngineMode
  if (opts.ollamaModel !== undefined) args.ollamaModel = opts.ollamaModel
  if (opts.ollamaBaseUrl !== undefined) args.ollamaBaseUrl = opts.ollamaBaseUrl
  if (opts.sensitivity !== undefined) args.sensitivity = opts.sensitivity as EngineLevel
  if (opts.config !== undefined) args.config = opts.config
  if (opts.autoUnmask !== undefined) args.autoUnmask = opts.autoUnmask
  if (opts.extraLocales !== undefined) {
    args.extraLocales = splitList(opts.extraLocales, (s) => s.toLowerCase())
  }
  if (opts.customLiterals !== undefined) {
    args.customLiterals = splitList(opts.customLiterals, (s) => s)
  }

  return args
}
