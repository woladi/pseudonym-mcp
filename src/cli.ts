#!/usr/bin/env node
import { Command } from 'commander'
import { ConfigManager, type EngineMode } from './config/manager.js'
import { printOllamaStatus } from './setup/check-ollama.js'
import { startServer } from './mcp/server.js'

const VALID_ENGINES: EngineMode[] = ['regex', 'llm', 'hybrid']

const program = new Command()

program
  .name('pseudonym-mcp')
  .description(
    'MCP server that pseudonymizes sensitive data locally before it reaches a cloud LLM'
  )
  .version('0.1.0')
  .option('--lang <lang>', 'Language for regex rules: en | pl', 'en')
  .option(
    '--engines <mode>',
    'Processing engines: regex | llm | hybrid',
    'hybrid'
  )
  .option('--ollama-model <model>', 'Ollama model for LLM NER', 'llama3')
  .option(
    '--ollama-base-url <url>',
    'Ollama base URL',
    'http://localhost:11434'
  )
  .option('--config <path>', 'Path to a JSON config file (default: ./mcp-config.json)')
  .option('--auto-unmask', 'Automatically unmask tokens in LLM responses', false)
  .action(
    async (opts: {
      lang: string
      engines: string
      ollamaModel: string
      ollamaBaseUrl: string
      config?: string
      autoUnmask: boolean
    }) => {
      const engines: EngineMode = VALID_ENGINES.includes(opts.engines as EngineMode)
        ? (opts.engines as EngineMode)
        : 'hybrid'

      ConfigManager.init({
        lang: opts.lang,
        engines,
        ollamaModel: opts.ollamaModel,
        ollamaBaseUrl: opts.ollamaBaseUrl,
        config: opts.config,
        autoUnmask: opts.autoUnmask,
      })

      const cfg = ConfigManager.getInstance().get()

      if (cfg.engines === 'hybrid' || cfg.engines === 'llm') {
        await printOllamaStatus(cfg.ollamaBaseUrl, cfg.ollamaModel)
      }

      await startServer()
    }
  )

program.parseAsync(process.argv).catch((err: unknown) => {
  process.stderr.write(`Fatal: ${String(err)}\n`)
  process.exit(1)
})
