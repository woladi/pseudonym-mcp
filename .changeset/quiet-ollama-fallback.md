---
'pseudonym-mcp': patch
---

Log Ollama NER failures once per request instead of once per chunk. When Ollama is unavailable, a long text produced one stderr line per chunk, flooding the MCP client's log with the same "Connection refused". The fallback behaviour is unchanged — regex still runs and `ner_status` is still reported — only the log is now a single summary line with the chunk count and the first error.
