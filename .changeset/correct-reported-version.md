---
'pseudonym-mcp': patch
---

Report the real package version over MCP and on `--version`. Every release from
0.3.0 onwards shipped with the runtime version constant frozen at `0.2.5`,
because the old pipeline published without ever committing the bump back to the
repository.
