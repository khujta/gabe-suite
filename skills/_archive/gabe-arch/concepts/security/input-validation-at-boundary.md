---
id: input-validation-at-boundary
name: Input Validation at the Boundary
tier: foundational
specialization: [security, web]
tags: [validation, boundary, owasp, fail-fast]
prerequisites: []
related: [input-guardrails, secrets-via-env-never-code]
one_liner: "Trust internal code, validate external input — never the reverse."
---

## The problem

Untrusted bytes slip past a thin endpoint check and thread through twenty internal functions, each defensively re-checking or — worse — assuming someone else did. One missed check becomes an injection bug; five redundant checks become drift-prone noise.

## The idea

Every value that enters the system is parsed into a typed, schema-validated object at the boundary — and internal code is allowed to trust it from then on.

## Picture it

Customs at a border. Rigorous inspection at the line — passports checked, bags opened, paperwork stamped. Once you're through, nobody inside the country stops you to re-check. The whole system relies on the border doing its job.

## How it maps

```
the border fence             →  the API handler / deserializer boundary
customs officer              →  schema validator (Pydantic, zod, JSON Schema)
passport + forms             →  request body, headers, query params
stamp of approval            →  typed DTO (Data Transfer Object) handed inward
contraband turned away       →  400 Bad Request returned on invalid input
no checks inside country     →  internal modules trust the DTO — no re-validation
```

## Primary force

Every value that enters from outside is untrusted until proven otherwise. Validating at the boundary lets every downstream module trust its inputs — the alternative is every function defensively re-checking, which is both noisy and incomplete. Fail fast at the door, trust everything inside. Schema libraries (Pydantic, zod, JSON Schema) exist because "validated type" is a cheaper invariant than "everyone remembered to check."

## When to reach for it

- Every HTTP (Hypertext Transfer Protocol) endpoint accepting client input.
- Any deserialization of external data — JSON, XML, YAML, file uploads, webhook payloads.
- Configuration loaded from files or env vars at startup (fail fast on bad config).

## When NOT to reach for it

- Internal calls between your own already-validated modules — re-checking creates drift.
- Data from your own DB that was validated at insert time — trust the stored invariant.
- Regex for structural validation — use a real schema; regex rots the moment shape changes.
- Hand-rolled validators when a battle-tested library covers 95% of the cases.

## Evidence a topic touches this

- Keywords: validation, Pydantic, zod, schema, input validation, sanitize, validator
- Files: `**/schemas/*`, `**/validators/*`, `**/api/*.py`, `**/models/*`
- Commit verbs: "add validation", "validate input", "reject invalid", "use schema"

## Deeper reading

- OWASP ASVS: Input Validation (V5)
- Pydantic v2 docs
- "Parse, don't validate" (Alexis King) — the functional framing
