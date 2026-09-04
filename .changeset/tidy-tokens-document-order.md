---
'pseudonym-mcp': patch
---

Number tokens in document order. Substitutions run right-to-left so offsets stay valid, which also allocated `[TAG:N]` counters back-to-front: the second IBAN in a text became `[IBAN:1]`. Tokens are now allocated in document order before the right-to-left rewrite, so `[IBAN:1]` is the first IBAN a reader (or the downstream LLM) meets.
