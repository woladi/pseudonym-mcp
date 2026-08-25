#!/usr/bin/env node
import { Command } from 'commander'
import { ConfigManager } from './config/manager.js'
import { toCliArgs, type CliOptions } from './config/cli-args.js'
import { SUPPORTED_LOCALES, ALL_LOCALES } from './patterns/types.js'
import { printOllamaStatus } from './setup/check-ollama.js'
import { startServer } from './mcp/server.js'
import { APP_VERSION } from './version.js'

const LOCALE_LIST = SUPPORTED_LOCALES.join(' | ')

const program = new Command()

// No option below declares a commander `default`. Defaults belong to
// ConfigManager, which layers them under mcp-config.json — a default here
// would arrive as an explicit value and quietly win over the file.
program
  .name('pseudonym-mcp')
  .description('MCP server that pseudonymizes sensitive data locally before cloud LLM work')
  .version(APP_VERSION)
  .option(
    '--lang <lang>',
    `Locale pack for regex rules: ${ALL_LOCALES} | ${LOCALE_LIST} (default: ${ALL_LOCALES} — every pack)`,
  )
  .option('--engines <mode>', 'Processing engines: regex | llm | hybrid (default: hybrid)')
  .option('--ollama-model <model>', 'Ollama model for LLM NER (default: llama3)')
  .option('--ollama-base-url <url>', 'Ollama base URL (default: http://localhost:11434)')
  .option(
    '--sensitivity <level>',
    'How much confidence a match needs: balanced | strict | paranoid (default: balanced)',
  )
  .option('--config <path>', 'Path to a JSON config file (default: ./mcp-config.json)')
  .option('--auto-unmask', 'Report auto_unmask=true in tool output for clients that honor it')
  .option(
    '--extra-locales <list>',
    'Comma-separated locales to recognize alongside --lang, e.g. de,it,uk',
  )
  .option('--custom-literals <items>', 'Comma-separated strings to always redact')
  .action(async (opts: CliOptions) => {
    const manager = ConfigManager.init(toCliArgs(opts))
    const cfg = manager.get()

    for (const warning of manager.getWarnings()) {
      process.stderr.write(`[pseudonym-mcp] WARNING: ${warning}\n`)
    }

    if (cfg.engines === 'hybrid' || cfg.engines === 'llm') {
      await printOllamaStatus(cfg.ollamaBaseUrl, cfg.ollamaModel)
    }

    await startServer()
  })

program.parseAsync(process.argv).catch((err: unknown) => {
  process.stderr.write(`Fatal: ${String(err)}\n`)
  process.exit(1)
})
