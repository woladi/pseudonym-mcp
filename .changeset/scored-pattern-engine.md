---
'pseudonym-mcp': minor
---

Score-based recognition: every pattern now carries a confidence, a nearby
context word ("PESEL:", "NIP") raises it, and a passing checksum raises it
further. Matches from all rules are collected and overlaps resolved by
confidence instead of applying rules one after another, so the best rule wins a
span rather than whichever ran first. A new `--sensitivity` flag
(`balanced` | `strict` | `paranoid`) sets how much confidence a match needs.

Two behaviour changes follow: a bare ten-digit NIP whose checksum validates is
now masked (the form printed on invoices, previously missed), and a PESEL whose
checksum fails is still masked, because a mistyped identifier reaching the
cloud is worse than a false positive.
