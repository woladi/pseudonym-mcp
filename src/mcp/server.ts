import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { Engine } from '../core/engine.js'
import { MappingStore } from '../core/mapping-store.js'
import { ConfigManager } from '../config/manager.js'

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
    version: '0.1.0',
  })

  server.tool(
    'mask_text',
    `Pseudonymize sensitive entities in text before sending to a cloud LLM.

Replaces PESEL numbers, phone numbers, IBANs, and email addresses via regex,
and person names and organization names via local Ollama NER — with opaque
tokens like [PESEL:1], [PERSON:2], [ORG:1].

Returns the masked text plus a session_id. Store the session_id to restore
the original values later using unmask_text.`,
    {
      text: z.string().describe('The text to pseudonymize'),
      session_id: z
        .string()
        .optional()
        .describe(
          'Optional: reuse an existing session to preserve token numbering across multiple calls'
        ),
    },
    async ({ text, session_id }) => {
      const sid = session_id ?? crypto.randomUUID()
      const engine = getOrCreateEngine(sid)

      let maskedText: string
      try {
        maskedText = await engine.process(text)
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Error during masking: ${String(err)}` }],
          isError: true,
        }
      }

      const cfg = ConfigManager.getInstance().get()

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                session_id: sid,
                masked_text: maskedText,
                auto_unmask: cfg.autoUnmask,
              },
              null,
              2
            ),
          },
        ],
      }
    }
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
    }
  )

  return server
}

export async function startServer(): Promise<void> {
  const server = createMcpServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
