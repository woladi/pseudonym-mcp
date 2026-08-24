# pseudonym-mcp

Local pseudonymisation tools for LLM workflows — replace detected PII with opaque tokens before you hand text to a cloud LLM, then restore those tokens afterward.

[![npm version](https://img.shields.io/npm/v/pseudonym-mcp?style=flat-square&logo=npm&logoColor=white)](https://www.npmjs.com/package/pseudonym-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-ffd60a?style=flat-square)](LICENSE)
[![Node 18+](https://img.shields.io/badge/node-18%2B-339933?logo=node.js&logoColor=white&style=flat-square)](#)
[![GDPR-aligned](https://img.shields.io/badge/GDPR-aligned-0070f3?style=flat-square)](#gdpr--ai-compliance)
[![Local detection](https://img.shields.io/badge/detection-local-brightgreen?style=flat-square)](#)
[![Offline NER](https://img.shields.io/badge/NER-local%20%2F%20offline-blue?style=flat-square)](#)

Expose MCP tools (`mask_text` and `unmask_text`) that your client or agent can call as an explicit privacy step. The server detects PII locally, replaces it with opaque tokens, and keeps the token mapping in memory for later restoration.

It is a **defense-in-depth measure**, not a compliance silver bullet. Read the [Limitations](#limitations) and [GDPR & AI Compliance](#gdpr--ai-compliance) sections before assuming this stack does more than it does.

## What you get

- **Multi-language PII detection**: Built-in support for English (SSN, credit cards, US phone) and Polish (PESEL, IBAN, Polish phone). New **heuristic language detection** (`detectLanguage()`) infers the language from text content — `--lang` remains the authoritative override but is no longer the only input.
- **Hybrid NER engine**: Regex for structured PII (SSN, credit cards, IBAN, email, phone) + local Ollama LLM for unstructured entities (names, organisations).
- **Local-detection architecture**: Detection and substitution happen on your machine when the MCP tool is called. The cloud LLM call still happens (that's the point) — but it can see tokens instead of detected PII when your workflow uses the masked output.
- **Session-keyed mapping store**: Tokens like `[PERSON:1]` map back to originals in an isolated, per-request session. Multiple round-trips preserve token coherence.
- **Unmask workflow support**: `mask_text` returns `auto_unmask` for clients that want to honor that preference, but this server does not intercept arbitrary LLM responses automatically.
- **Flexible engines**: Run `regex` only (no Ollama required), `llm` only, or `hybrid` (default).
- **Strict validation**: SSN area-number validation, credit card Luhn checksum, PESEL checksum — all configurable.
- **Graceful degradation**: If Ollama is unavailable, the regex phase still runs and no exception is thrown.
- **MCP-native**: Works with Claude Code, Claude Desktop, Cursor — any MCP-compatible client.

## ❌ Without / ✅ With

❌ **Without pseudonym-mcp:**

- Prompt: `"John Smith, SSN 123-45-6789, card 4111 1111 1111 1111"` → sent verbatim to the LLM provider
- Every name, ID number, and credit card in your prompt is processed and potentially logged by the provider
- A breach at the provider's end exposes those values in cleartext
- Sending personal data to a non-EU LLM provider without further safeguards raises GDPR Article 44 questions you'll need to answer

✅ **With pseudonym-mcp used before the cloud call:**

- The same prompt can become `"[PERSON:1], SSN [SSN:1], card [CREDIT_CARD:1]"` when you call `mask_text` first
- The LLM reasons about structure and content without seeing those detected values in cleartext
- The response can be locally de-tokenised with `unmask_text` before reaching the user
- Detected direct identifiers are no longer shipped upstream — though structure, dates, indirect references, and any missed PII still are

This is a meaningful reduction in cleartext PII exposure. It is **not** "no personal data leaves your machine" — see [Limitations](#limitations).

## GDPR & AI Compliance

pseudonym-mcp is relevant to compliance work, but it is a **technical control**, not a compliance product. Whether you are compliant with any specific regulation depends on your full stack, your role (controller/processor), your contracts, your DPIA, and your jurisdiction.

### Why this matters

The EU **General Data Protection Regulation (GDPR)** classifies names, national ID numbers (like SSN or PESEL), bank account numbers (IBAN), email addresses, credit card numbers, and phone numbers as **personal data** under Article 4(1). Sending this data to a cloud LLM provider constitutes **processing** under Article 4(2). Pseudonymisation is explicitly recognised under Art. 4(5) as a risk-reduction measure — but, critically, **pseudonymised data is still personal data** (Recital 26).

| GDPR Article | Obligation                           | Where pseudonym-mcp helps                                                                  | Where it doesn't                                                                |
| ------------ | ------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Art. 5(1)(c) | **Data minimisation**                | Strips detected direct identifiers before transmission                                     | Doesn't minimise context, structure, or undetected PII                          |
| Art. 25      | **Privacy by design and by default** | Provides a technical layer that fits into a privacy-by-design architecture                 | Architecture and policy decisions are still your responsibility                 |
| Art. 32      | **Security of processing**           | Recognised technical measure under Recital 83 (pseudonymisation)                           | One control among many; doesn't replace access control, logging, encryption     |
| Art. 44      | **Transfers to third countries**     | Reduces the cleartext PII you transfer                                                     | Pseudonymised personal data is still personal data — transfer rules still apply |
| Art. 4(5)    | **Pseudonymisation** definition      | The mapping store is opaque to the cloud LLM; re-identification requires the local session | Re-identification is possible from context for anyone with side knowledge       |

> **The honest bottom line:** pseudonymisation under GDPR Art. 4(5) is **not** anonymisation. The data remains personal data in your system, and Art. 44 transfer obligations are not switched off just because you tokenised the name field.

### AI Act alignment

The EU **AI Act** places additional requirements on high-risk AI systems that process personal data. Using pseudonym-mcp as an intermediary layer can:

- Support data minimisation in your AI system's data flows.
- Help document a technical control for transparency and human-oversight requirements.
- Align with the principle of **technical robustness and safety** (Art. 15) by limiting cleartext PII exposure.

It does not change your AI Act risk classification on its own — classification is a function of use-case and deployment context, not of the masking step in front of the model.

### US & international applicability

The tool is also relevant outside the EU, with the same caveats:

- **CCPA / CPRA** (California) — reduces personal information sent to third-party processors; doesn't change controller/business obligations or consumer rights.
- **HIPAA** (US healthcare) — pseudonymised PHI is still PHI under HIPAA. Using this tool does **not** eliminate the need for a BAA with your cloud LLM provider if you're a covered entity or business associate. It can be part of a defensible safeguard posture; it cannot substitute for one.
- **PCI DSS** (payment industry) — Luhn-validated detection reduces the chance card numbers ride in cleartext to an LLM. It is one control; PCI scope, segmentation, and storage rules are separate concerns.
- **SOC 2** — useful evidence of a technical control limiting PII exposure. Auditors will look at the full picture, not just this layer.
- **PIPEDA** (Canada), **LGPD** (Brazil), **POPIA** (South Africa) — all require appropriate safeguards for cross-border personal data transfers. This tool is a relevant safeguard, not a substitute for the legal basis of the transfer.

### Sector-specific applicability

| Sector             | Relevant regulation                      | PII types commonly handled            |
| ------------------ | ---------------------------------------- | ------------------------------------- |
| Healthcare         | GDPR + HIPAA + national health data laws | Patient names, SSN, diagnoses         |
| Banking & Finance  | GDPR + PCI DSS + PSD2 + DORA             | Credit cards, IBAN, SSN, PESEL        |
| HR & Recruitment   | GDPR Art. 9 (special categories)         | Names, national IDs, contact details  |
| Legal              | GDPR + attorney–client privilege         | Names, case numbers, personal details |
| Insurance          | GDPR + Solvency II                       | Personal identifiers, health data     |
| Public Sector (US) | CCPA + state privacy laws                | SSN, driver's license numbers         |
| Public Sector (PL) | GDPR + UODO + KRI                        | PESEL, NIP, REGON                     |

In every row of this table, pseudonym-mcp is a useful **building block**. None of those regimes can be satisfied by a masking tool alone.

## How it works

```
Your App / Claude Desktop
        │
        │  explicit mask_text tool call with PII
        ▼
┌─────────────────────────┐
│      pseudonym-mcp      │
│                         │
│  Phase 1: Regex NER     │  ← SSN, CREDIT_CARD, EMAIL, PHONE (en)
│                         │  ← PESEL, IBAN, EMAIL, PHONE, NIP (pl)
│  Phase 2: Ollama NER    │  ← PERSON, ORG  (local LLM)
│  MappingStore (session) │  ← [TAG:N] ↔ original value
└────────────┬────────────┘
             │  masked text returned to the client/agent
             ▼
      Your workflow sends the masked text
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
Use mask_text on this note, then summarise the key points of the meeting.
```

**First, call `mask_text`; pseudonym-mcp replaces detected PII locally:**

```
Meeting with [PERSON:1] ([PESEL:1]) from [ORG:1].
We discussed a contract for 45 000 zł. Contact: [EMAIL:1]
```

**Then ask Claude to work from the masked text. Claude responds with tokens:**

```
Meeting with [PERSON:1] from [ORG:1] covered a contract
for 45 000 zł. Follow up via [EMAIL:1].
```

**pseudonym-mcp restores originals locally:**

```
Meeting with Jan Kowalski from Acme sp. z o.o. covered
a contract for 45 000 zł. Follow up via jan.kowalski@acme.pl
```

If the masked text is what you send upstream, the cloud provider sees the structure of the meeting and the amount — but not the detected name, PESEL, organisation, or email in cleartext. The swap happens on your machine.

### Obsidian vault with `session_id`

```
# mask the entire vault once — save the session_id
Use mask_text on my notes — remember the session_id

# ask Claude anything across multiple prompts
Summarise all meetings from Q1

# Claude replies with tokens; restore originals
Use unmask_text with session_id abc123 on the response
```

The `session_id` keeps the token map alive for the session — the same `[PERSON:1]` always refers to the same person across notes. That consistency is what makes cross-note reasoning possible; it is also what makes a masked corpus potentially re-identifiable to anyone with side knowledge of your work. Use long-lived sessions deliberately.

## MCP Prompt Templates

pseudonym-mcp ships two built-in prompt templates that describe a mask → task → unmask workflow.

**Important:** MCP prompt templates are convenience helpers, not a privacy boundary. Inline prompt arguments may be visible to the host client or model before tool masking happens. For strongest privacy, call `mask_text` directly first, then use the returned `masked_text` in your LLM prompt.

### `pseudonymize_task` — inline text

```
/pseudonymize_task text="Meeting with Jan Kowalski (PESEL: 90010112318). Contract: 45 000 zł." task="Extract action items"
```

Intended workflow:

1. pseudonym-mcp masks detected PII locally → `[PERSON:1]`, `[PESEL:1]`
2. Claude processes the masked text
3. pseudonym-mcp restores originals in the response

Optional `lang` argument: `en` (default) or `pl`.

### `privacy_scan_file` — file / PDF (macOS only)

> **Requires [macos-vision-mcp](https://github.com/woladi/macos-vision-mcp)** — a separate MCP server that uses Apple's Vision framework to extract text from PDFs and images on-device. macOS only.

```
/privacy_scan_file filePath="/Users/me/contracts/nda.pdf" task="Summarise obligations and deadlines"
```

Intended workflow:

1. macos-vision-mcp extracts text from the file on-device
2. pseudonym-mcp masks detected PII locally
3. Claude processes the masked content
4. pseudonym-mcp restores originals before the response is shown

Optional arguments: `task` (default: _summarise the key points_), `lang` (`en` or `pl`).

## Quick Start

**Step 1** — Add to your MCP client (example for Claude Code — no install needed):

```sh
claude mcp add pseudonym-mcp -- npx -y pseudonym-mcp --engines hybrid
```

**Step 2** — (Optional) Pull an Ollama model for full hybrid NER:

```sh
ollama pull llama3
```

Skip this step if you only need regex-based masking (`--engines regex`). Without Ollama, you'll catch structured identifiers (SSN, IBAN, cards, email, phone, PESEL) but not free-form names and organisations.

> **Global install** — if you prefer `npm install -g pseudonym-mcp`, replace `npx -y pseudonym-mcp` with `pseudonym-mcp` in all snippets below.

Restart your client. The `mask_text` and `unmask_text` tools appear automatically.

## Available Tools

| Tool          | What it does                                                                           | Example prompt                                                  |
| ------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `mask_text`   | Pseudonymise detected PII in text. Returns `masked_text` + `session_id`.               | _"Use mask_text on this customer letter before summarising it"_ |
| `unmask_text` | Restore original values from a session. Pass the `session_id` returned by `mask_text`. | _"Use unmask_text with session_id X to restore the response"_   |

### `mask_text` input

```json
{
  "text": "John Smith (SSN: 123-45-6789) works at Acme Corp.",
  "session_id": "optional — omit to create a new session",
  "custom_literals": ["John Smith", "Acme Corp"]
}
```

### `mask_text` output

```json
{
  "session_id": "3f2a1b...",
  "masked_text": "[PERSON:1] (SSN: [SSN:1]) works at [ORG:1].",
  "auto_unmask": false,
  "ner_status": "ready"
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
  "strictValidation": true,
  "sensitivity": "balanced",
  "extraLocales": [],
  "customLiterals": ["Jan Kowalski", "78091512345", "+48 123 456 789"]
}
```

| Key                | Values                                                                 | Default                  | Description                                                                               |
| ------------------ | ---------------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| `lang`             | `en`, `pl`, `de`, `it`, `es`, `fr`, `nl`, `cz`, `sk`, `se`, `fi`, `uk` | `en`                     | Language pack for regex rules                                                             |
| `engines`          | `regex` \| `llm` \| `hybrid`                                           | `hybrid`                 | Which NER engines to run                                                                  |
| `ollamaModel`      | any Ollama model name                                                  | `llama3`                 | Local LLM for entity detection                                                            |
| `ollamaBaseUrl`    | URL                                                                    | `http://localhost:11434` | Ollama API endpoint                                                                       |
| `autoUnmask`       | `true` \| `false`                                                      | `false`                  | Report the preferred unmask behavior to clients; this server does not intercept responses |
| `strictValidation` | `true` \| `false`                                                      | `true`                   | Enable checksum / format validation (SSN area check, Luhn for cards, PESEL checksum)      |
| `sensitivity`      | `balanced` \| `strict` \| `paranoid`                                   | `balanced`               | How much confidence a match needs before it is masked                                     |
| `extraLocales`     | `string[]`                                                             | `[]`                     | Further locale packs to run alongside `lang`, e.g. `["de", "it"]`                         |
| `customLiterals`   | `string[]`                                                             | `[]`                     | Specific strings always redacted regardless of engine (names, IDs, phone numbers)         |

### CLI flags

All config keys can be overridden at startup (highest priority):

```sh
pseudonym-mcp --lang pl --extra-locales de,it --sensitivity strict --engines regex
```

| Flag                | Description                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `--lang`            | Language for regex rules: `en`, `pl`, `de`, `it`, `es`, `fr`, `nl`, `cz`, `sk`, `se`, `fi`, `uk` (default: `en`) |
| `--engines`         | `regex`, `llm`, or `hybrid` (default: `hybrid`)                                                                  |
| `--ollama-model`    | Ollama model to use for NER                                                                                      |
| `--ollama-base-url` | Ollama base URL                                                                                                  |
| `--sensitivity`     | `balanced`, `strict`, or `paranoid` (default: `balanced`)                                                        |
| `--extra-locales`   | Comma-separated locales to recognize alongside `--lang`, e.g. `de,it`                                            |
| `--config`          | Path to a custom JSON config file                                                                                |
| `--auto-unmask`     | Set `auto_unmask: true` in `mask_text` output for clients that honor it                                          |
| `--custom-literals` | Comma-separated strings to always redact, e.g. `"Jan Kowalski,78091512345"`                                      |

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

Detection is best-effort. The patterns below are what the tool **looks for** — not a guarantee of what it will always catch. See [Limitations](#limitations) for known gaps.

### Custom literals

| Tag      | Detection                                                                                      | Match        |
| -------- | ---------------------------------------------------------------------------------------------- | ------------ |
| `CUSTOM` | Exact match (case-insensitive) against `customLiterals` config or `custom_literals` tool param | Exact string |

Custom literals are applied after the regex phase and before LLM NER, regardless of engine mode. Longest literals are matched first to prevent partial substitution.

### How a match is decided

Every pattern carries a confidence score. A checksum that validates raises it,
and a context word near the match — "PESEL:", "NIP", "Steuer-ID", "date of
birth" — raises it too, enough on its own to reach the default threshold. What
gets masked is whatever clears the sensitivity bar:

| `--sensitivity` | Threshold | Effect                                                                  |
| --------------- | --------- | ----------------------------------------------------------------------- |
| `balanced`      | 0.50      | Default. Distinctive shapes, verified checksums, and anything labelled. |
| `strict`        | 0.35      | Adds weaker shapes: bare IBAN-like strings, dates, generic identifiers. |
| `paranoid`      | 0.10      | Everything a rule can see, false positives included.                    |

Where a failing checksum means "not this entity at all" (a card number failing
Luhn), the candidate is dropped. Where it means a typo (a PESEL), the candidate
survives at lower confidence — a mistyped identifier reaching the cloud is
worse than a number masked for nothing.

Rules marked ✓ below verify a real check digit.

### Global — active in every language

| Tag             | Detection                                               | Checksum             |
| --------------- | ------------------------------------------------------- | -------------------- |
| `EMAIL`         | RFC 5321-compatible address                             |                      |
| `PHONE`         | International formats                                   |                      |
| `IBAN`          | 76 countries, ISO 13616 lengths                         | ✓ mod-97             |
| `VAT_ID`        | All 27 EU member states plus `XI`                       | ✓ PL, IT, NL, SI, LU |
| `CRYPTO_WALLET` | Bitcoin (Base58Check, bech32), Ethereum                 | ✓ BTC                |
| `IMEI`          | Mobile device identifier                                | ✓ Luhn               |
| `VIN`           | Vehicle identification number                           | ✓ ISO 3779           |
| `MAC`           | Hardware address                                        |                      |
| `UUID`          | UUID / GUID                                             |                      |
| `IP`            | IPv4 and IPv6                                           |                      |
| `URL`           | Web address                                             |                      |
| `DATE`          | Calendar date — masked when it reads as a date of birth |                      |

### Polish (`--lang pl`)

| Tag           | Detection                                        | Checksum |
| ------------- | ------------------------------------------------ | -------- |
| `PESEL`       | National ID, 11 digits                           | ✓ Mod-10 |
| `NIP`         | Tax ID — hyphenated, spaced, or bare on invoices | ✓ Mod-11 |
| `REGON`       | Business register, 9 or 14 digits                | ✓ Mod-11 |
| `ID_CARD`     | Dowód osobisty, `ABC123456`                      | ✓        |
| `PASSPORT`    | Two letters plus seven digits                    | ✓        |
| `KW`          | Księga wieczysta (land register)                 | ✓        |
| `KRS`         | Court register number — needs its label          |          |
| `IBAN`        | `PL` prefix or bare 26-digit NRB                 | ✓ mod-97 |
| `PHONE`       | `+48` / `0048`, mobile, landline                 |          |
| `POSTAL_CODE` | `XX-XXX`                                         |          |

### United States (`--lang en`)

| Tag              | Detection                                                 | Checksum          |
| ---------------- | --------------------------------------------------------- | ----------------- |
| `SSN`            | Dashed form; dotted, spaced and bare forms need the label | area/group ranges |
| `CREDIT_CARD`    | 13–19 digits                                              | ✓ Luhn            |
| `ITIN`           | Taxpayer identification number                            |                   |
| `EIN`            | Employer identification number                            |                   |
| `ABA_ROUTING`    | Bank routing number                                       | ✓ 3-7-1           |
| `PASSPORT`       | Nine digits — needs its label                             |                   |
| `DRIVER_LICENSE` | State formats — needs its label                           |                   |
| `ZIP_CODE`       | `XXXXX` / `XXXXX-XXXX`                                    |                   |

### Other European locales

Enable them with `--lang`, or alongside another language with
`--extra-locales de,it` — a Polish invoice carries German and Italian
identifiers too.

| Locale    | Tag                  | Detection                   | Checksum   |
| --------- | -------------------- | --------------------------- | ---------- |
| `de`      | `DE_TAX_ID`          | Steueridentifikationsnummer | ✓ ISO 7064 |
| `de`      | `POSTAL_CODE`        | PLZ                         |            |
| `it`      | `IT_FISCAL_CODE`     | Codice fiscale              | ✓          |
| `es`      | `ES_NIF` / `ES_NIE`  | DNI/NIF and foreigner ID    | ✓ mod-23   |
| `fr`      | `FR_NIR`             | Numéro de sécurité sociale  | ✓ mod-97   |
| `nl`      | `NL_BSN`             | Burgerservicenummer         | ✓ elfproef |
| `cz` `sk` | `CZ_SK_BIRTH_NUMBER` | Rodné číslo                 | ✓ mod-11   |
| `se`      | `SE_PERSONNUMMER`    | Personnummer                | ✓ Luhn     |
| `fi`      | `FI_HETU`            | Henkilötunnus               | ✓ mod-31   |
| `uk`      | `UK_NHS`             | NHS number                  | ✓ mod-11   |
| `uk`      | `UK_NINO`            | National Insurance number   |            |

### Detected by the LLM, not by pattern

| Tag      | Detection                    | Requires                          |
| -------- | ---------------------------- | --------------------------------- |
| `PERSON` | Full names                   | Ollama NER (hybrid / llm engines) |
| `ORG`    | Company / organisation names | Ollama NER (hybrid / llm engines) |

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
The detector does not affect the current pseudonymisation pipeline — `--lang` config remains authoritative.
It is a building block for future multi-language and auto-select modes.

## Engine modes

| Mode               | Requires Ollama         | Detects structured PII | Detects names / orgs |
| ------------------ | ----------------------- | ---------------------- | -------------------- |
| `regex`            | No                      | Yes                    | No                   |
| `llm`              | Yes                     | No                     | Yes                  |
| `hybrid` (default) | Yes (graceful fallback) | Yes                    | Yes                  |

In `hybrid` mode, Ollama runs after the regex pass, so the local NER model receives already-tokenised structured identifiers. If Ollama is unreachable, the server logs a warning to stderr and returns the regex-only masked text — no crash, no hang.

## Privacy & Security notes

Calibrated claims:

- **No telemetry from the tool itself.** pseudonym-mcp makes no network requests except to your local Ollama instance and (optionally) the MCP stdio transport.
- **In-memory mapping by default.** The mapping store is not written to disk. Sessions are scoped to the server process lifetime.
- **Idempotent tokens within a session.** The same original value always maps to the same token (`[PERSON:1]` will not become `[PERSON:2]` for the same name on a second occurrence), preserving semantic coherence in LLM reasoning.
- **No model training.** The local Ollama model operates offline. Your data is not used to train any model by this tool.
- **Strict validation by default.** Invalid SSNs (area 000/666/900+), failed-Luhn credit card numbers, and invalid-checksum PESELs are not masked, preventing false positives from OCR errors or random digit sequences.

What this does **not** guarantee:

- That all PII in your input is detected.
- That tokenised text is unlinkable to real people — re-identification from context is possible.
- That the cloud provider can't learn sensitive things from structure, timing, or content.
- Compliance with any specific regulation — that's a system-level property, not a tool-level one.

## Limitations

pseudonym-mcp is a technical privacy control, not a legal guarantee of compliance.

- **Detection is best-effort.** False negatives and false positives are both possible. Indirect references (e.g. _"the tall guy from accounting"_, _"my landlord"_, _"the place near the bridge"_) are not detected. Nicknames, initials, and partial names are typically missed.
- **Structure still travels.** Dates, amounts, relationships between tokens, narrative content, and any PII the detector missed all reach the cloud LLM. Tokenisation hides _who_, not _what kind of situation_.
- **Pre-mask logging is your problem.** If your application logs plaintext before passing it to `mask_text`, this tool cannot help you.
- **Process-local mapping.** Restarting the server ends the session and discards mappings. This is intentional.
- **Re-identification is possible** for anyone with access to the local mapping store, and may be possible from context alone for anyone with side knowledge. This is pseudonymisation under GDPR Art. 4(5), not anonymisation.
- **No legal advice.** Nothing in this README constitutes legal advice. Compliance is a system-level property — talk to your DPO, your compliance team, and your lawyers about your specific deployment.

> Under GDPR Art. 4(5) and Recital 26, pseudonymised data is still personal data. pseudonym-mcp substantially reduces cleartext PII exposure but does not eliminate your legal obligations.

## Development

```sh
git clone https://github.com/woladi/pseudonym-mcp
cd pseudonym-mcp
npm install
npm run build    # tsc compile
npm test         # vitest (no Ollama required)
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

Contributions are welcome. Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

Releases run on [changesets](https://github.com/changesets/changesets). If your change is user-visible, add a changeset to the PR:

```sh
npm run changeset   # pick patch / minor / major, describe the change
```

Merging to `master` then opens a "version packages" PR that bumps the version, `server.json`, `src/version.ts` and the changelog; merging _that_ PR publishes to npm (Trusted Publishing, with provenance), tags the release, and refreshes the MCP registry entry. A merge with no pending changesets publishes nothing.

Language pack contributions are especially welcome — German (Personalausweis, Steuer-ID), French (NIR, SIRET), Spanish (DNI/NIE) and others would significantly expand the tool's usefulness.

## License

MIT — Adrian Wolczuk
