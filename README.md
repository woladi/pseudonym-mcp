# pseudonym-mcp

Local privacy proxy for LLMs — pseudonymizes sensitive data before it reaches the cloud, then restores it on the way back.

[![npm version](https://img.shields.io/npm/v/pseudonym-mcp?style=flat-square&logo=npm&logoColor=white)](https://www.npmjs.com/package/pseudonym-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-ffd60a?style=flat-square)](LICENSE)
[![Node 18+](https://img.shields.io/badge/node-18%2B-339933?logo=node.js&logoColor=white&style=flat-square)](#)
[![GDPR Ready](https://img.shields.io/badge/GDPR-ready-0070f3?style=flat-square)](#gdpr--ai-compliance)
[![Zero Cloud](https://img.shields.io/badge/zero%20cloud-detection-brightgreen?style=flat-square)](#)
[![Offline NER](https://img.shields.io/badge/NER-local%20%2F%20offline-blue?style=flat-square)](#)

Sits between your application and any cloud LLM (Claude, GPT-4, Gemini…). Replaces PII with opaque tokens locally before the prompt ever leaves your machine, then seamlessly restores original values in the response — so users never see the tags.

## What you get

- **Multi-language PII detection**: Built-in support for English (SSN, credit cards, US phone) and Polish (PESEL, IBAN, Polish phone). New **heuristic language detection** (`detectLanguage()`) infers the language from text content — `--lang` remains the authoritative override but is no longer the only input.
- **Hybrid NER engine**: Regex for structured PII (SSN, credit cards, IBAN, email, phone) + local Ollama LLM for unstructured entities (names, organizations).
- **Zero-trust architecture**: All detection and substitution happens on your machine. No PII reaches a third-party API.
- **Session-keyed mapping store**: Tokens like `[PERSON:1]` map back to originals in an isolated, per-request session. Multiple round-trips preserve token coherence.
- **Auto-unmask**: Optional mode that automatically restores tokens in the LLM's response before returning it to the user.
- **Flexible engines**: Run `regex` only (no Ollama required), `llm` only, or `hybrid` (default).
- **Strict validation**: SSN area-number validation, credit card Luhn checksum, PESEL checksum — all configurable.
- **Graceful degradation**: If Ollama is unavailable, the regex phase still runs and no exception is thrown.
- **MCP-native**: Works with Claude Code, Claude Desktop, Cursor — any MCP-compatible client.

## ❌ Without / ✅ With

❌ **Without pseudonym-mcp:**

- Prompt: `"John Smith, SSN 123-45-6789, card 4111 1111 1111 1111"` → sent verbatim to OpenAI / Anthropic servers
- Every name, ID number, and credit card in your prompt is processed and potentially logged by the LLM provider
- A data breach at the provider's end exposes your users' real PII
- Sending personal data to a US-based LLM provider without explicit safeguards may violate GDPR Article 44 (international data transfers)

✅ **With pseudonym-mcp:**

- The same prompt becomes `"[PERSON:1], SSN [SSN:1], card [CREDIT_CARD:1]"` before it leaves your machine
- The LLM reasons about the structure and content without ever seeing the real values
- The response is automatically de-tokenized locally before reaching the user
- Your GDPR DPA can truthfully state: _personal data never left the local environment_

## GDPR & AI Compliance

pseudonym-mcp directly addresses the regulatory challenges of using cloud AI in data-sensitive contexts.

### Why this matters

The EU **General Data Protection Regulation (GDPR)** classifies names, national ID numbers (like SSN or PESEL), bank account numbers (IBAN), email addresses, credit card numbers, and phone numbers as **personal data** under Article 4(1). Sending this data to a cloud LLM provider constitutes **processing** under Article 4(2) and triggers a range of obligations:

| GDPR Article | Obligation                                                           | How pseudonym-mcp helps                                                         |
| ------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Art. 5(1)(c) | **Data minimisation** — only necessary data should be processed      | Strips PII before transmission; the LLM receives only what it needs to reason   |
| Art. 25      | **Privacy by design and by default**                                 | Pseudonymization layer is built into the MCP transport, not bolted on           |
| Art. 32      | **Security of processing** — appropriate technical measures          | Local token substitution is a recognized technical measure under Recital 83     |
| Art. 44      | **Transfers to third countries** — requires safeguards               | If no personal data is transferred, Art. 44 restrictions do not apply           |
| Art. 4(5)    | **Pseudonymisation** — explicitly recognized as a protective measure | Tokens are opaque; re-identification requires access to the local mapping store |

> **Note:** Pseudonymisation under GDPR (Art. 4(5)) does not equal anonymisation — the data is still personal data in your system. However, it substantially reduces risk and demonstrates compliance with the accountability principle (Art. 5(2)).

### AI Act alignment

The EU **AI Act** (in force from 2024) places additional requirements on high-risk AI systems that process personal data. Using pseudonym-mcp as an intermediary layer:

- Reduces the risk classification of downstream LLM usage by ensuring the model never processes identifiable natural persons' data directly.
- Supports documentation requirements for AI system transparency and human oversight.
- Aligns with the principle of **technical robustness and safety** (Art. 15) by limiting PII exposure surface.

### US & international applicability

While GDPR originates in the EU, pseudonym-mcp is equally relevant for:

- **CCPA / CPRA** (California) — consumers have the right to know what personal information is collected; minimising data sent to third-party LLMs reduces disclosure surface.
- **HIPAA** (US healthcare) — PHI (Protected Health Information) must not be sent to non-BAA cloud providers; local pseudonymization allows LLM use without a BAA.
- **PCI DSS** (payment industry) — credit card numbers (PAN) must never be stored or transmitted in the clear; masking before LLM transit satisfies requirement 3.4.
- **SOC 2** — data handling controls are strengthened by demonstrating that PII is replaced before leaving the trust boundary.
- **PIPEDA** (Canada), **LGPD** (Brazil), **POPIA** (South Africa) — all require appropriate safeguards for cross-border personal data transfers.

### Sector-specific applicability

| Sector             | Relevant regulation                      | PII types commonly handled            |
| ------------------ | ---------------------------------------- | ------------------------------------- |
| Healthcare         | GDPR + HIPAA + national health data laws | Patient names, SSN, diagnoses         |
| Banking & Finance  | GDPR + PCI DSS + PSD2 + DORA             | Credit cards, IBAN, SSN, PESEL        |
| HR & Recruitment   | GDPR Art. 9 (special categories)         | Names, national IDs, contact details  |
| Legal              | GDPR + attorney-client privilege         | Names, case numbers, personal details |
| Insurance          | GDPR + Solvency II                       | Personal identifiers, health data     |
| Public Sector (US) | CCPA + state privacy laws                | SSN, driver's license numbers         |
| Public Sector (PL) | GDPR + UODO + KRI                        | PESEL, NIP, REGON                     |

## How it works

```
Your App / Claude Desktop
        │
        │  prompt with PII
        ▼
┌─────────────────────────┐
│      pseudonym-mcp      │
│                         │
│  Phase 1: Regex NER     │  ← SSN, CREDIT_CARD, EMAIL, PHONE (en)
│                         │  ← PESEL, IBAN, EMAIL, PHONE (pl)
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
English (--lang en, default):
[PERSON:1]       John Smith
[SSN:1]          123-45-6789
[CREDIT_CARD:1]  4111 1111 1111 1111
[ORG:1]          Acme Corp
[EMAIL:1]        john@acme.com
[PHONE:1]        (555) 123-4567

Polish (--lang pl):
[PERSON:1]       Jan Kowalski
[PESEL:1]        90010112318
[ORG:1]          Auto-Lux
[IBAN:1]         PL27114020040000300201355387
[EMAIL:1]        jan@example.pl
[PHONE:1]        +48 123 456 789
```

The mapping is stored in a session-scoped in-memory store. Each `mask_text` call returns a `session_id`; pass it back to `unmask_text` to restore originals.

## Real-world example

### Meeting note in Claude Code / Obsidian

You have a note:

```
Meeting with Jan Kowalski (PESEL: 90010112318) from Acme sp. z o.o.
We discussed a contract for 45 000 zł. Contact: jan.kowalski@acme.pl
```

In Claude Code you type:

```
Use mask_text on this note, then summarize the key points of the meeting.
```

**pseudonym-mcp replaces PII locally before sending to Claude:**

```
Meeting with [PERSON:1] ([PESEL:1]) from [ORG:1].
We discussed a contract for 45 000 zł. Contact: [EMAIL:1]
```

**Claude responds (sees tokens only):**

```
Meeting with [PERSON:1] from [ORG:1] covered a contract
for 45 000 zł. Follow up via [EMAIL:1].
```

**pseudonym-mcp restores originals locally:**

```
Meeting with Jan Kowalski from Acme sp. z o.o. covered
a contract for 45 000 zł. Follow up via jan.kowalski@acme.pl
```

Anthropic / OpenAI never saw any real data. The entire swap happens on your machine.

### Obsidian vault with `session_id`

```
# mask the entire vault once — save the session_id
Use mask_text on my notes — remember the session_id

# ask Claude anything across multiple prompts
Summarize all meetings from Q1

# Claude replies with tokens; restore originals
Use unmask_text with session_id abc123 on the response
```

The `session_id` keeps the token map alive for the entire session — the same `[PERSON:1]` always refers to the same person, no matter how many times they appear across different notes.

## MCP Prompt Templates

pseudonym-mcp ships two built-in prompt templates that chain masking, an LLM task, and unmasking into a single workflow — no glue code needed.

### `pseudonymize_task` — inline text

```
/pseudonymize_task text="Meeting with Jan Kowalski (PESEL: 90010112318). Contract: 45 000 zł." task="Extract action items"
```

What happens:

1. pseudonym-mcp masks PII locally → `[PERSON:1]`, `[PESEL:1]`
2. Claude processes the anonymized text
3. pseudonym-mcp restores originals in the response

Optional `lang` argument: `en` (default) or `pl`.

### `privacy_scan_file` — file / PDF (macOS only)

> **Requires [macos-vision-mcp](https://github.com/woladi/macos-vision-mcp)** — a separate MCP server that uses Apple's Vision framework to extract text from PDFs and images. macOS only.

```
/privacy_scan_file filePath="/Users/me/contracts/nda.pdf" task="Summarize obligations and deadlines"
```

What happens:

1. macos-vision-mcp extracts text from the file
2. pseudonym-mcp masks all PII locally
3. Claude processes the anonymized content
4. pseudonym-mcp restores originals before the response is shown

Optional arguments: `task` (default: _summarize the key points_), `lang` (`en` or `pl`).

## Quick Start

**Step 1** — Add to your MCP client (example for Claude Code — no install needed):

```sh
claude mcp add pseudonym-mcp -- npx -y pseudonym-mcp --engines hybrid
```

**Step 2** — (Optional) Pull an Ollama model for full hybrid NER:

```sh
ollama pull llama3
```

Skip this step if you only need regex-based masking (`--engines regex`).

> **Global install** — if you prefer `npm install -g pseudonym-mcp`, replace `npx -y pseudonym-mcp` with `pseudonym-mcp` in all snippets below.

Restart your client. The `mask_text` and `unmask_text` tools appear automatically.

## Available Tools

| Tool          | What it does                                                                           | Example prompt                                                  |
| ------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `mask_text`   | Pseudonymize PII in text. Returns `masked_text` + `session_id`.                        | _"Use mask_text on this customer letter before summarizing it"_ |
| `unmask_text` | Restore original values from a session. Pass the `session_id` returned by `mask_text`. | _"Use unmask_text with session_id X to restore the response"_   |

### `mask_text` input

```json
{
  "text": "John Smith (SSN: 123-45-6789) works at Acme Corp.",
  "session_id": "optional — omit to create a new session"
}
```

### `mask_text` output

```json
{
  "session_id": "3f2a1b...",
  "masked_text": "[PERSON:1] (SSN: [SSN:1]) works at [ORG:1].",
  "auto_unmask": false
}
```

### `unmask_text` input

```json
{
  "text": "The case concerns [PERSON:1] at [ORG:1].",
  "session_id": "3f2a1b..."
}
```

## Configuration

### `mcp-config.json` (project root)

```json
{
  "lang": "en",
  "engines": "hybrid",
  "ollamaModel": "llama3",
  "ollamaBaseUrl": "http://localhost:11434",
  "autoUnmask": false,
  "strictValidation": true
}
```

| Key                | Values                       | Default                  | Description                                                                          |
| ------------------ | ---------------------------- | ------------------------ | ------------------------------------------------------------------------------------ |
| `lang`             | `en`, `pl`                   | `en`                     | Language pack for regex rules                                                        |
| `engines`          | `regex` \| `llm` \| `hybrid` | `hybrid`                 | Which NER engines to run                                                             |
| `ollamaModel`      | any Ollama model name        | `llama3`                 | Local LLM for entity detection                                                       |
| `ollamaBaseUrl`    | URL                          | `http://localhost:11434` | Ollama API endpoint                                                                  |
| `autoUnmask`       | `true` \| `false`            | `false`                  | Auto-restore tokens in LLM responses                                                 |
| `strictValidation` | `true` \| `false`            | `true`                   | Enable checksum / format validation (SSN area check, Luhn for cards, PESEL checksum) |

### CLI flags

All config keys can be overridden at startup (highest priority):

```sh
pseudonym-mcp --lang en --engines regex --ollama-model llama3 --auto-unmask
```

| Flag                | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `--lang`            | Language for regex rules: `en` or `pl` (default: `en`) |
| `--engines`         | `regex`, `llm`, or `hybrid` (default: `hybrid`)        |
| `--ollama-model`    | Ollama model to use for NER                            |
| `--ollama-base-url` | Ollama base URL                                        |
| `--config`          | Path to a custom JSON config file                      |
| `--auto-unmask`     | Enable automatic response de-tokenization              |

### Claude Code

```sh
claude mcp add pseudonym-mcp -- npx -y pseudonym-mcp --engines hybrid
```

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pseudonym-mcp": {
      "command": "npx",
      "args": ["-y", "pseudonym-mcp", "--engines", "hybrid"]
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
      "command": "npx",
      "args": ["-y", "pseudonym-mcp", "--engines", "regex"]
    }
  }
}
```

## Supported PII types

### Global (all languages)

| Tag     | Pattern                              | Validation   |
| ------- | ------------------------------------ | ------------ |
| `EMAIL` | RFC 5321-compatible                  | Format match |
| `IBAN`  | Generic IBAN (`CC` + 2 check + BBAN) | Format match |
| `IP`    | IPv4 (all octets 0–255)              | Format match |
| `URL`   | `http://` / `https://` URLs          | Format match |
| `PHONE` | International `+CC` prefix format    | Format match |

### English (`--lang en`, default)

| Tag           | Pattern                                             | Validation                                 |
| ------------- | --------------------------------------------------- | ------------------------------------------ |
| `SSN`         | `XXX-XX-XXXX` (US Social Security Number)           | Area number check (rejects 000, 666, 900+) |
| `CREDIT_CARD` | 13–19 digits (Visa, Mastercard, Amex, Discover)     | Luhn checksum                              |
| `EMAIL`       | RFC 5321-compatible                                 | Format match                               |
| `PHONE`       | `+1 (XXX) XXX-XXXX`, `XXX-XXX-XXXX`, `XXX.XXX.XXXX` | Format match                               |
| `ZIP_CODE`    | `XXXXX` or `XXXXX-XXXX` (paranoid mode only)        | Format match                               |
| `PERSON`      | Full names                                          | Ollama NER (hybrid / llm engines)          |
| `ORG`         | Company / organization names                        | Ollama NER (hybrid / llm engines)          |

### Polish (`--lang pl`)

| Tag           | Pattern                                                          | Validation                                      |
| ------------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| `PESEL`       | 11-digit national ID                                             | Full checksum (weights `[1,3,7,9,1,3,7,9,1,3]`) |
| `IBAN`        | `PL` + 26 digits, compact or spaced                              | Format match                                    |
| `EMAIL`       | RFC 5321-compatible                                              | Format match                                    |
| `PHONE`       | `+48` / `0048` prefix, 9-digit mobile, landline `(XX) XXX-XX-XX` | Format match                                    |
| `NIP`         | 10-digit tax ID (strict / paranoid modes)                        | Checksum (weights `[6,5,7,2,3,4,5,6,7]`)        |
| `POSTAL_CODE` | `XX-XXX` (paranoid mode only)                                    | Format match                                    |
| `PERSON`      | Full names                                                       | Ollama NER (hybrid / llm engines)               |
| `ORG`         | Company / organization names                                     | Ollama NER (hybrid / llm engines)               |

## Language Detection

pseudonym-mcp includes a lightweight heuristic language detector based on [`franc`](https://github.com/wooorm/franc).
It infers the language from text content and returns a structured result:

```typescript
detectLanguage('Umowa zostaje zawarta na czas nieokreślony')
// → { detected: 'pl', source: 'text', raw: 'pol', confidence: 0.94 }

detectLanguage('Hello')
// → { detected: 'unknown', source: 'fallback', raw: null, confidence: null }
```

| Field        | Description                                                                            |
| ------------ | -------------------------------------------------------------------------------------- |
| `detected`   | `'pl'`, `'en'`, or `'unknown'`                                                         |
| `source`     | `'text'` — franc ran and mapped successfully; `'fallback'` — too short or undetermined |
| `raw`        | Raw ISO 639-3 code from franc (e.g. `'pol'`), or `null`                                |
| `confidence` | Score 0–1 from franc, or `null` when franc was not called                              |

Texts shorter than 20 characters or with low confidence return `detected: 'unknown'`.
The detector does not affect the current pseudonymization pipeline — `--lang` config remains authoritative.
It is a building block for future multi-language and auto-select modes.

## Engine modes

| Mode               | Requires Ollama         | Detects structured PII | Detects names / orgs |
| ------------------ | ----------------------- | ---------------------- | -------------------- |
| `regex`            | No                      | Yes                    | No                   |
| `llm`              | Yes                     | No                     | Yes                  |
| `hybrid` (default) | Yes (graceful fallback) | Yes                    | Yes                  |

In `hybrid` mode, Ollama runs after the regex pass so the LLM never sees already-tokenized values. If Ollama is unreachable, the server logs a warning to stderr and returns the regex-only masked text — no crash, no hang.

## Privacy & Security notes

- **No telemetry.** pseudonym-mcp makes no network requests except to your local Ollama instance and (optionally) the MCP stdio transport.
- **In-memory only.** The mapping store is never written to disk. Sessions are scoped to the server process lifetime.
- **Idempotent tokens.** The same original value always maps to the same token within a session (`[PERSON:1]` will not become `[PERSON:2]` for the same name on a second occurrence), preserving semantic coherence in LLM reasoning.
- **No model training.** The local Ollama model operates entirely offline. Your data is not used to train any model.
- **Strict validation by default.** Invalid SSNs (area 000/666/900+), failed-Luhn credit card numbers, and invalid-checksum PESELs are not masked, preventing false positives from OCR errors or random digit sequences.

## Development

```sh
git clone https://github.com/woladi/pseudonym-mcp
cd pseudonym-mcp
npm install
npm run build    # tsc compile
npm test         # vitest (134 tests, no Ollama required)
```

The test suite runs fully offline — Ollama calls are injected via constructor and mocked in all tests. No live LLM required.

### Adding a new language pack

1. Add locale-specific patterns in `src/patterns/locale/<lang>/` — each file exports a `PatternRule` with `id`, `entityType`, `pattern`, `locales`, `engines`, and optional `validate`
2. Register them in `src/patterns/index.ts` (add to `allPatterns` array)
3. Create a thin adapter `src/languages/<lang>/rules.ts` that composes from the new patterns using `toPatternDef`
4. Register the adapter in `LANGUAGE_MAP` in `src/core/engine.ts`
5. Add the ISO 639-3 → short code mapping in `src/language/language-map.ts`

See `src/patterns/locale/pl/` and `src/languages/pl/rules.ts` for a complete example.

## Contributing

Contributions are welcome. Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages — this project uses `release-it` with `@release-it/conventional-changelog` to automate releases.

Language pack contributions are especially welcome — German (Personalausweis, Steuer-ID), French (NIR, SIRET), Spanish (DNI/NIE) and others would significantly expand the tool's usefulness.

## Keyword index

> For discoverability: **AI privacy**, **LLM data privacy**, **PII masking**, **PII redaction**, **PII detection**, **data pseudonymization**, **GDPR LLM compliance**, **GDPR AI**, **EU AI Act**, **CCPA compliance**, **HIPAA AI**, **PCI DSS tokenization**, **SOC 2 data handling**, **personal data protection**, **sensitive data scrubbing**, **NER anonymization**, **named entity recognition privacy**, **Claude privacy layer**, **MCP privacy proxy**, **local AI processing**, **on-premise AI**, **zero-trust AI**, **data minimisation**, **privacy by design**, **SSN masking**, **credit card masking**, **Luhn validation**, **PESEL masking**, **Polish PII**, **RODO**, **UODO compliance**, **healthcare AI privacy**, **financial data redaction**, **PSD2 privacy**, **tokenization NLP**, **prompt sanitization**, **context window privacy**, **offline NER**, **Ollama privacy**, **local LLM privacy**, **cross-border data transfer**, **data protection by design**, **PIPEDA**, **LGPD**, **POPIA**.

## License

MIT — Adrian Wolczuk
