#!/usr/bin/env node
import { Command } from 'commander'
import { ConfigManager, type EngineMode } from './config/manager.js'
import type { EngineLevel } from './patterns/types.js'
import { printOllamaStatus } from './setup/check-ollama.js'
import { startServer } from './mcp/server.js'
import { APP_VERSION } from './version.js'

const VALID_ENGINES: EngineMode[] = ['regex', 'llm', 'hybrid']
const VALID_SENSITIVITY: EngineLevel[] = ['balanced', 'strict', 'paranoid']

const program = new Command()

program
  .name('pseudonym-mcp')
  .description('MCP server that pseudonymizes sensitive data locally before cloud LLM work')
  .version(APP_VERSION)
  .option('--lang <lang>', 'Language for regex rules: en | pl', 'en')
  .option('--engines <mode>', 'Processing engines: regex | llm | hybrid', 'hybrid')
  .option('--ollama-model <model>', 'Ollama model for LLM NER', 'llama3')
  .option('--ollama-base-url <url>', 'Ollama base URL', 'http://localhost:11434')
  .option(
    '--sensitivity <level>',
    'How much confidence a match needs: balanced | strict | paranoid',
    'balanced',
  )
  .option('--config <path>', 'Path to a JSON config file (default: ./mcp-config.json)')
  .option(
    '--auto-unmask',
    'Report auto_unmask=true in tool output for clients that honor it',
    false,
  )
  .option('--custom-literals <items>', 'Comma-separated strings to always redact')
  .action(
    async (opts: {
      lang: string
      engines: string
      ollamaModel: string
      ollamaBaseUrl: string
      sensitivity: string
      config?: string
      autoUnmask: boolean
      customLiterals?: string
    }) => {
      const engines: EngineMode = VALID_ENGINES.includes(opts.engines as EngineMode)
        ? (opts.engines as EngineMode)
        : 'hybrid'

      const sensitivity: EngineLevel = VALID_SENSITIVITY.includes(opts.sensitivity as EngineLevel)
        ? (opts.sensitivity as EngineLevel)
        : 'balanced'

      ConfigManager.init({
        lang: opts.lang,
        engines,
        ollamaModel: opts.ollamaModel,
        ollamaBaseUrl: opts.ollamaBaseUrl,
        sensitivity,
        config: opts.config,
        autoUnmask: opts.autoUnmask,
        customLiterals: opts.customLiterals
          ? opts.customLiterals
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      })

      const cfg = ConfigManager.getInstance().get()

      if (cfg.engines === 'hybrid' || cfg.engines === 'llm') {
        await printOllamaStatus(cfg.ollamaBaseUrl, cfg.ollamaModel)
      }

      await startServer()
    },
  )

program.parseAsync(process.argv).catch((err: unknown) => {
  process.stderr.write(`Fatal: ${String(err)}\n`)
  process.exit(1)
})
