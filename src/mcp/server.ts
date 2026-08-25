import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { Engine, type NerStatus } from '../core/engine.js'
import { OllamaClient } from '../core/ollama-client.js'
import { MappingStore } from '../core/mapping-store.js'
import { ConfigManager } from '../config/manager.js'
import { localeBanner, localeWarning } from '../config/locale-report.js'
import { resolveLocales } from '../patterns/types.js'
import { pseudonymizeTaskMessage, privacyScanFileMessage } from './prompts.js'
import { APP_VERSION } from '../version.js'

const NER_WARNING: Record<NerStatus, string | null> = {
  ready: null,
  warming_up:
    'NER unavailable — Ollama is still loading the model. Retry in a few seconds for PERSON/ORG masking.',
  disabled: null,
}

// Session registry: session_id → Engine (each Engine holds its own MappingStore)
const sessions = new Map<string, Engine>()

function getOrCreateEngine(sessionId: string): Engine {
  let engine = sessions.get(sessionId)
  if (!engine) {
    engine = new Engine(new MappingStore(sessionId))
    sessions.set(sessionId, engine)
  }
  return engine
}

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'pseudonym-mcp',
    version: APP_VERSION,
  })

  server.tool(
    'mask_text',
    `Pseudonymize sensitive entities in text before sending to a cloud LLM.

Replaces national ID numbers, tax IDs, phone numbers, IBANs, cards and email
addresses via regex, and person names and organization names via local Ollama
NER — with opaque tokens like [PESEL:1], [PERSON:2], [ORG:1].

Every locale pack runs by default. The response reports active_locales, and
disabled_locales plus a locale_warning whenever the server was narrowed with
--lang and can therefore miss identifiers from other countries.

Returns the masked text plus a session_id. Store the session_id to restore
the original values later using unmask_text.`,
    {
      text: z.string().describe('The text to pseudonymize'),
      session_id: z
        .string()
        .optional()
        .describe(
          'Optional: reuse an existing session to preserve token numbering across multiple calls',
        ),
      custom_literals: z
        .array(z.string())
        .optional()
        .describe('Specific strings to always redact (names, IDs, phone numbers)'),
      wait_for_ner: z
        .boolean()
        .optional()
        .describe(
          'If true, wait up to 30 s for Ollama to finish loading the model before processing (default: false)',
        ),
    },
    async ({ text, session_id, custom_literals, wait_for_ner }) => {
      const cfg = ConfigManager.getInstance().get()
      const sid = session_id ?? crypto.randomUUID()
      const engine = getOrCreateEngine(sid)

      // Optional: block until Ollama is inference-ready (warm-up wait)
      if (wait_for_ner && (cfg.engines === 'llm' || cfg.engines === 'hybrid')) {
        const client = new OllamaClient({ baseUrl: cfg.ollamaBaseUrl, model: cfg.ollamaModel })
        const deadline = Date.now() + 30_000
        while (Date.now() < deadline) {
          if (await client.isModelReady()) break
          const remaining = deadline - Date.now()
          if (remaining > 5_000) {
            await new Promise<void>((r) => setTimeout(r, 5_000))
          } else {
            break
          }
        }
      }

      let maskedText: string
      let nerStatus: NerStatus
      try {
        ;({ maskedText, nerStatus } = await engine.processWithStatus(text, custom_literals))
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Error during masking: ${String(err)}` }],
          isError: true,
        }
      }

      const warning = NER_WARNING[nerStatus]
      const locales = resolveLocales(cfg.lang, cfg.extraLocales)
      const responseBody: Record<string, unknown> = {
        session_id: sid,
        masked_text: maskedText,
        auto_unmask: cfg.autoUnmask,
        ner_status: nerStatus,
        active_locales: locales.active,
      }
      if (warning) responseBody['ner_warning'] = warning
      // A narrowed server looks identical to a complete one from the caller's
      // side — every call says which packs are off and what they would catch.
      if (locales.disabled.length > 0) {
        responseBody['disabled_locales'] = locales.disabled
        responseBody['locale_warning'] = localeWarning(locales)
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(responseBody, null, 2),
          },
        ],
      }
    },
  )

  server.tool(
    'unmask_text',
    `Restore original sensitive values in text that was previously masked by mask_text.

Replaces tokens like [PESEL:1], [PERSON:2] with the original values stored
in the session identified by session_id.`,
    {
      text: z.string().describe('The text containing [TAG:N] tokens to restore'),
      session_id: z.string().describe('The session_id returned by mask_text'),
    },
    async ({ text, session_id }) => {
      const engine = sessions.get(session_id)
      if (!engine) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: session "${session_id}" not found. It may have expired or never existed.`,
            },
          ],
          isError: true,
        }
      }

      const restored = engine.revert(text)
      return {
        content: [{ type: 'text' as const, text: restored }],
      }
    },
  )

  server.registerPrompt(
    'pseudonymize_task',
    {
      description:
        'Convenience workflow for masking text, running a task, and restoring originals. Not a privacy boundary for prompt arguments.',
      argsSchema: {
        text: z.string().describe('Text containing sensitive data'),
        task: z.string().describe('What to do with the anonymized text'),
        lang: z
          .enum(['en', 'pl'])
          .optional()
          .describe('Language for PII detection (default: config lang)'),
      },
    },
    ({ text, task, lang }) => ({
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: pseudonymizeTaskMessage({ text, task, lang }) },
        },
      ],
    }),
  )

  server.registerPrompt(
    'privacy_scan_file',
    {
      description:
        'Convenience workflow for OCR, masking, task execution, and restore. Not a privacy boundary for extracted prompt content.',
      argsSchema: {
        filePath: z.string().describe('Path to the file to scan (PDF, image, etc.)'),
        task: z
          .string()
          .optional()
          .describe('What to do with the content (default: summarize the key points)'),
        lang: z
          .enum(['en', 'pl'])
          .optional()
          .describe('Language for PII detection (default: config lang)'),
      },
    },
    ({ filePath, task, lang }) => ({
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: privacyScanFileMessage({ filePath, task, lang }) },
        },
      ],
    }),
  )

  return server
}

export async function startServer(): Promise<void> {
  const server = createMcpServer()
  const transport = new StdioServerTransport()

  // Task 3: fire-and-forget warm-up — forces the Ollama model to load into RAM
  // so it is ready before the first real mask_text request arrives.
  const cfg = ConfigManager.getInstance().get()

  // Say out loud which national identifiers this process can and cannot see.
  process.stderr.write(localeBanner(resolveLocales(cfg.lang, cfg.extraLocales)))

  if (cfg.engines === 'hybrid' || cfg.engines === 'llm') {
    const warmUpClient = new OllamaClient({ baseUrl: cfg.ollamaBaseUrl, model: cfg.ollamaModel })
    warmUpClient.warmUp()
  }

  await server.connect(transport)
}
