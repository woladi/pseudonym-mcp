---
'pseudonym-mcp': minor
---

IBAN is now validated with the ISO 7064 mod-97 checksum and the per-country
length table instead of a shape-only regex, and bare 26-digit Polish NRB
account numbers are checked by restoring the missing `PL` prefix. Adds an EU
VAT recognizer covering all 27 member-state formats plus the `XI` prefix, with
national check digits for PL, IT, NL, SI and LU.
