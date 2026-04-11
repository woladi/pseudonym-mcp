# pseudonym-mcp

Local privacy proxy for LLMs — pseudonymizes sensitive data before it reaches the cloud, restores it on the way back.

[![npm version](https://img.shields.io/npm/v/pseudonym-mcp?style=flat-square&logo=npm&logoColor=white)](https://www.npmjs.com/package/pseudonym-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-ffd60a?style=flat-square)](LICENSE)
[![Node 18+](https://img.shields.io/badge/node-18%2B-339933?logo=node.js&logoColor=white&style=flat-square)](#)
[![GDPR Ready](https://img.shields.io/badge/GDPR-ready-0070f3?style=flat-square)](#gdpr--ai-compliance)
[![Zero Cloud](https://img.shields.io/badge/zero%20cloud-detection-brightgreen?style=flat-square)](#)
[![Offline NER](https://img.shields.io/badge/NER-local%20%2F%20offline-blue?style=flat-square)](#)

Sits between your application and any cloud LLM (Claude, GPT-4, Gemini…). Replaces PII with opaque tokens locally before the prompt ever leaves your machine, then seamlessly restores original values in the response — so users never see the tags.

## What you get

- **Hybrid NER engine**: Regex for structured PII (PESEL, IBAN, email, phone) + local Ollama LLM for unstructured entities (names, organizations).
- **Zero-trust architecture**: All detection and substitution happens on your machine. No PII reaches a third-party API.
- **Session-keyed mapping store**: Tokens like `[PERSON:1]` map back to originals in an isolated, per-request session. Multiple round-trips preserve token coherence.
- **Auto-unmask**: Optional mode that automatically restores tokens in the LLM's response before returning it to the user.
- **Flexible engines**: Run `regex` only (no Ollama required), `llm` only, or `hybrid` (default).
- **Polish compliance built-in**: PESEL with full checksum validation, Polish IBAN, mobile/landline phone formats.
- **Graceful degradation**: If Ollama is unavailable, the regex phase still runs and no exception is thrown.
- **MCP-native**: Works with Claude Code, Claude Desktop, Cursor — any MCP-compatible client.

## ❌ Without / ✅ With

❌ **Without pseudonym-mcp:**

- Prompt contains `"Jan Kowalski, PESEL 90010112318, konto PL27114020040000300201355387"` → sent verbatim to OpenAI/Anthropic servers
- Every name, ID number, and bank account in your prompt is processed and potentially logged by the LLM provider
- A data breach at the provider's end exposes your users' real PII
- Sending personal data to a US-based LLM provider without explicit safeguards may violate GDPR Article 44 (international data transfers)

✅ **With pseudonym-mcp:**

- The same prompt becomes `"[PERSON:1], PESEL [PESEL:1], konto [IBAN:1]"` before it leaves your machine
- The LLM reasons about the structure and content without ever seeing the real values
- The response is automatically de-tokenized locally before reaching the user
- Your GDPR DPA can truthfully state: *personal data never left the local environment*

## GDPR & AI Compliance

pseudonym-mcp directly addresses the regulatory challenges of using cloud AI in data-sensitive contexts.

### Why this matters

The EU **General Data Protection Regulation (GDPR)** classifies names, national ID numbers (like PESEL), bank account numbers (IBAN), email addresses, and phone numbers as **personal data** under Article 4(1). Sending this data to a cloud LLM provider constitutes **processing** under Article 4(2) and triggers a range of obligations:

| GDPR Article | Obligation | How pseudonym-mcp helps |
|---|---|---|
| Art. 5(1)(c) | **Data minimisation** — only necessary data should be processed | Strips PII before transmission; the LLM receives only what it needs to reason |
| Art. 25 | **Privacy by design and by default** | Pseudonymization layer is built into the MCP transport, not bolted on |
| Art. 32 | **Security of processing** — appropriate technical measures | Local token substitution is a recognized technical measure under Recital 83 |
| Art. 44 | **Transfers to third countries** — requires safeguards | If no personal data is transferred, Art. 44 restrictions do not apply |
| Art. 4(5) | **Pseudonymisation** — explicitly recognized as a protective measure | Tokens are opaque; re-identification requires access to the local mapping store |

> **Note:** Pseudonymisation under GDPR (Art. 4(5)) does not equal anonymisation — the data is still personal data in your system. However, it substantially reduces risk and demonstrates compliance with the accountability principle (Art. 5(2)).

### AI Act alignment

The EU **AI Act** (in force from 2024) places additional requirements on high-risk AI systems that process personal data. Using pseudonym-mcp as an intermediary layer:

- Reduces the risk classification of downstream LLM usage by ensuring the model never processes identifiable natural persons' data directly.
- Supports documentation requirements for AI system transparency and human oversight.
- Aligns with the principle of **technical robustness and safety** (Art. 15) by limiting PII exposure surface.

### Sector-specific applicability

| Sector | Relevant regulation | PII types commonly handled |
|---|---|---|
| Healthcare | GDPR + national health data laws | Patient names, ID numbers, diagnoses |
| Banking & Finance | GDPR + PSD2 + DORA | IBAN, account numbers, NIP, PESEL |
| HR & Recruitment | GDPR Art. 9 (special categories) | Names, national IDs, contact details |
| Legal | GDPR + attorney-client privilege | Names, case numbers, personal details |
| Insurance | GDPR + Solvency II | Personal identifiers, health data |
| Public Sector (PL) | GDPR + UODO + KRI | PESEL, NIP, REGON |

## How it works

```
Your App / Claude Desktop
        │
        │  prompt with PII
        ▼
┌─────────────────────────┐
│      pseudonym-mcp      │
│                         │
│  Phase 1: Regex NER     │  ← PESEL, IBAN, EMAIL, PHONE
│  Phase 2: Ollama NER    │  ← PERSON, ORG  (local LLM)
│  MappingStore (session) │  ← [TAG:N] ↔ original value
└────────────┬────────────┘
             │  sanitized prompt (no PII)
             ▼
      Cloud LLM API
      (Claude / GPT-4 / Gemini)
             │
             │  response with [TAG:N] tokens
             ▼
┌─────────────────────────┐
│      pseudonym-mcp      │
│   unmask_text / revert  │  ← tokens → originals
└────────────┬────────────┘
             │  restored response
             ▼
        Your App / User
```

### Token format

```
[PERSON:1]   Jan Kowalski
[PESEL:1]    90010112318
[ORG:1]      Auto-Lux
[IBAN:1]     PL27114020040000300201355387
[EMAIL:1]    jan@example.pl
[PHONE:1]    +48 123 456 789
```

The mapping is stored in a session-scoped in-memory store. Each `mask_text` call returns a `session_id`; pass it back to `unmask_text` to restore originals.

## Quick Start

**Step 1** — Install the package:

```sh
npm install -g pseudonym-mcp
```

**Step 2** — (Optional) Pull an Ollama model for full hybrid NER:

```sh
ollama pull llama3
```

Skip this step if you only need regex-based masking (`--engines regex`).

**Step 3** — Add to your MCP client (example for Claude Code):

```sh
claude mcp add pseudonym-mcp -- pseudonym-mcp --engines hybrid
```

Restart your client. The `mask_text` and `unmask_text` tools appear automatically.

## Available Tools

| Tool | What it does | Example prompt |
|---|---|---|
| `mask_text` | Pseudonymize PII in text. Returns `masked_text` + `session_id`. | *"Use mask_text on this customer letter before summarizing it"* |
| `unmask_text` | Restore original values from a session. Pass the `session_id` returned by `mask_text`. | *"Use unmask_text with session_id X to restore the response"* |

### `mask_text` input

```json
{
  "text": "Jan Kowalski (PESEL: 90010112318) kupił auto od firmy Auto-Lux.",
  "session_id": "optional — omit to create a new session"
}
```

### `mask_text` output

```json
{
  "session_id": "3f2a1b...",
  "masked_text": "[PERSON:1] (PESEL: [PESEL:1]) kupił auto od firmy [ORG:1].",
  "auto_unmask": false
}
```

### `unmask_text` input

```json
{
  "text": "Sprawa dotyczy [PERSON:1] i firmy [ORG:1].",
  "session_id": "3f2a1b..."
}
```

## Configuration

### `mcp-config.json` (project root)

```json
{
  "lang": "pl",
  "engines": "hybrid",
  "ollamaModel": "llama3",
  "ollamaBaseUrl": "http://localhost:11434",
  "autoUnmask": false,
  "peselStrictChecksum": true
}
```

| Key | Values | Default | Description |
|---|---|---|---|
| `lang` | `pl` | `pl` | Language pack for regex rules |
| `engines` | `regex` \| `llm` \| `hybrid` | `hybrid` | Which NER engines to run |
| `ollamaModel` | any Ollama model name | `llama3` | Local LLM for entity detection |
| `ollamaBaseUrl` | URL | `http://localhost:11434` | Ollama API endpoint |
| `autoUnmask` | `true` \| `false` | `false` | Auto-restore tokens in LLM responses |
| `peselStrictChecksum` | `true` \| `false` | `true` | Reject PESELs with invalid checksum |

### CLI flags

All config keys can be overridden at startup (highest priority):

```sh
pseudonym-mcp --lang pl --engines regex --ollama-model llama3 --auto-unmask
```

| Flag | Description |
|---|---|
| `--lang` | Language for regex rules (default: `pl`) |
| `--engines` | `regex`, `llm`, or `hybrid` (default: `hybrid`) |
| `--ollama-model` | Ollama model to use for NER |
| `--ollama-base-url` | Ollama base URL |
| `--config` | Path to a custom JSON config file |
| `--auto-unmask` | Enable automatic response de-tokenization |

### Claude Code

```sh
claude mcp add pseudonym-mcp -- pseudonym-mcp --engines hybrid
```

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pseudonym-mcp": {
      "command": "pseudonym-mcp",
      "args": ["--engines", "hybrid"]
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "pseudonym-mcp": {
      "command": "pseudonym-mcp",
      "args": ["--engines", "regex"]
    }
  }
}
```

## Supported PII types (Polish language pack)

| Tag | Pattern | Validation |
|---|---|---|
| `PESEL` | 11-digit national ID | Full checksum (weights `[1,3,7,9,1,3,7,9,1,3]`) |
| `IBAN` | `PL` + 26 digits, compact or spaced | Format match |
| `EMAIL` | RFC 5321-compatible | Format match |
| `PHONE` | `+48` / `0048` prefix, 9-digit mobile, landline `(XX) XXX-XX-XX` | Format match |
| `PERSON` | Full names | Ollama NER (hybrid / llm engines) |
| `ORG` | Company / organization names | Ollama NER (hybrid / llm engines) |

## Engine modes

| Mode | Requires Ollama | Detects structured PII | Detects names / orgs |
|---|---|---|---|
| `regex` | No | Yes | No |
| `llm` | Yes | No | Yes |
| `hybrid` (default) | Yes (graceful fallback) | Yes | Yes |

In `hybrid` mode, Ollama runs after the regex pass so the LLM never sees already-tokenized values. If Ollama is unreachable, the server logs a warning to stderr and returns the regex-only masked text — no crash, no hang.

## Privacy & Security notes

- **No telemetry.** pseudonym-mcp makes no network requests except to your local Ollama instance and (optionally) the MCP stdio transport.
- **In-memory only.** The mapping store is never written to disk. Sessions are scoped to the server process lifetime.
- **Idempotent tokens.** The same original value always maps to the same token within a session (`[PERSON:1]` will not become `[PERSON:2]` for the same name on a second occurrence), preserving semantic coherence in LLM reasoning.
- **No model training.** The local Ollama model operates entirely offline. Your data is not used to train any model.
- **PESEL checksum validation.** Invalid PESELs (e.g., from OCR errors) are not masked by default, preventing false positives.

## Development

```sh
git clone https://github.com/woladi/pseudonym-mcp
cd pseudonym-mcp
npm install
npm run build    # tsc compile
npm test         # vitest (42 tests, no Ollama required)
```

The test suite runs fully offline — Ollama calls are injected via constructor and mocked in all tests. No live LLM required.

### Adding a new language pack

1. Create `src/languages/<lang>/rules.ts`
2. Export an object that implements `LanguageRules` from `src/languages/types.ts`
3. Register it in the `LANGUAGE_MAP` in `src/core/engine.ts`
4. Pass `--lang <lang>` at startup

## Contributing

Contributions are welcome. Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages — this project uses `release-it` with `@release-it/conventional-changelog` to automate releases.

## Keyword index

> For discoverability: **AI privacy**, **LLM data privacy**, **PII masking**, **PII redaction**, **data pseudonymization**, **GDPR LLM compliance**, **GDPR AI**, **EU AI Act**, **personal data protection**, **sensitive data scrubbing**, **NER anonymization**, **named entity recognition privacy**, **Claude privacy layer**, **MCP privacy proxy**, **local AI processing**, **on-premise AI**, **zero-trust AI**, **data minimisation**, **privacy by design**, **PESEL masking**, **Polish PII**, **RODO**, **UODO compliance**, **healthcare AI privacy**, **HIPAA-adjacent**, **financial data redaction**, **PSD2 privacy**, **tokenization NLP**, **prompt injection prevention**, **context window privacy**, **offline NER**, **Ollama privacy**, **local LLM privacy**.

## License

MIT — Adrian Wolczuk
