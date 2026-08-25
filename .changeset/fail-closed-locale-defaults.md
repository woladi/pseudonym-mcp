---
'pseudonym-mcp': minor
---

Recognize every locale pack by default, and make `mcp-config.json` reachable.

A server started without `--lang` recognized the English pack only. A Polish
document went through with its PESEL, NIP and phone number intact and
`mask_text` still reported success — the failure mode was silent at both ends.

Two causes, both fixed:

- `lang` defaulted to `'en'`. It now defaults to `'all'`: every locale pack
  runs unless a real locale is named. An unknown or empty `lang` also resolves
  to every pack rather than quietly falling back to English.
- Every CLI flag carried a commander `default`, so `--lang` reached
  ConfigManager set to `'en'` even when nobody typed it, and outranked
  `mcp-config.json` on the way past. The documented precedence — CLI >
  config file > defaults — held only for the two flags that happened to have
  no default. Flags now default in ConfigManager alone.

Narrowing with `--lang` still works and is now reported out loud: a startup
banner on stderr names the disabled packs and what they would have caught, and
every `mask_text` response carries `active_locales`, plus `disabled_locales`
and `locale_warning` when the selection is narrowed.

Also:

- Config problems are surfaced instead of swallowed — an unparseable
  `mcp-config.json`, a missing `--config` path, or an out-of-enum `engines` /
  `sensitivity` value now warns on stderr rather than silently reverting.
- The Czech `rodné číslo` checksum reported the pre-1954 nine-digit form as
  verified, though that form has no check digit at all. It scored every bare
  nine-digit number as a confirmed identifier once the pack was on by default.
  The form remains a candidate; it now has to earn its score from context.

Running twelve packs at once trades precision for coverage: a bare nine-digit
number reads as a Polish phone number, `AB123456C` as a UK NINO. Narrow the
server on purpose if that is the wrong trade for your documents.
