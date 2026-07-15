---
id: _schema-example
name: Schema Example (reference file, not a real concept)
tier: foundational
specialization: [agent]
tags: [reference, schema, example]
prerequisites: []
related: []
one_liner: "Reference concept file showing the full frontmatter + body template."
signal: deeper-5min   # quick-check | deeper-5min | rethink  (default: deeper-5min when absent)
---

# Purpose of this file

Not a real concept. This is the canonical example every new concept file should mirror structurally. `/gabe-teach arch show` parses sections by heading name — if you rename a heading, that section won't render. Delete nothing, rename nothing, reorder nothing.

## The problem

One short paragraph (1-2 sentences) naming the concrete pain this concept addresses. Written from the human's perspective, not the system's. Name the failure mode, the cost, or the impossible-to-answer question that motivates the concept.

Good: "Sync LLM calls hold a server thread for 10+ seconds. At real scale, that means huge thread pools (expensive) or timeouts (user-hostile)."
Bad: "This concept is about async." (Tells the reader what the concept does, not why it exists.)

## The idea

ONE sentence, ≤25 words, naming the solution in plain language BEFORE any analogy. This is the reader's anchor — if it's ambiguous, the rest of the lesson is trying to explain something the reader can't name.

Good: "Return a ticket immediately; do the work separately; deliver the result later via status endpoint or push channel."
Bad: "Use 202 Accepted for async workflows." (Jargon-first; doesn't say what you DO with 202.)

## Picture it

1-2 sentences. A physical, sensory, spatial image the reader can see. No code, no jargon. Don't explain the mapping here — just paint the picture.

Good: "A coat-check counter. Hand over your jacket, take a numbered ticket, walk away. The attendant hangs it at their own pace."
Bad: "Like an async queue in a distributed system." (Same abstraction layer as the concept; teaches nothing.)

## How it maps

Arrow-lines showing how each analogy piece corresponds to a code/system piece. 3-6 mappings. This is the load-bearing section — where gabe-lens earns its keep. Without this, the analogy is decoration.

**Direction: `<analogy piece>  →  <code/system piece>`** — familiar-first (left), technical (right). Matches the pedagogical flow: the reader already understands the analogy image, so start there and map into code.

Format: two spaces, arrow, two spaces.

Good:
```
the jacket                  →  your request (HTTP payload)
the claim check             →  ticket_id returned in 202 response
the attendant               →  worker pool / BackgroundTask handler
"got it, here's your ticket" →  HTTP 202 Accepted response
getting paged               →  SSE event or status endpoint polling
```

Bad: leaving the mapping implicit, or using `→` without making both sides concrete. Also wrong direction (code → analogy) — the reader's working model starts with the picture.

## Easy to confuse with

**Optional section.** Include when the concept has multiple orthogonal sub-parts that share surface similarity — the kind of adjacent-but-distinct roles that readers conflate. Skip when the concept is atomic (single sub-part, no internal distinctions to make).

Format: 1-3 bullets, each naming a distinction pair + one-line clarification.

Good:
```
- **ticket_id vs persisted job state** — the first is a handle you walk away with;
  the second is storage. You can have a ticket with no persistence (in-memory only)
  or persistence with no ticket (key-by-content-hash).
- **202 Accepted vs "work started"** — 202 means "I've accepted the request."
  The worker pool may still be cold; processing hasn't necessarily begun yet.
```

Bad:
```
- It's NOT synchronous.   (too abstract; belongs in When NOT or Primary force)
- Don't confuse with caching.  (no pair, no clarification)
```

This section addresses a narrow failure mode: users learning a concept with multiple related sub-parts sometimes see one role clearly and collapse the others into it. Named distinctions before the primary force prevent that collapse.

## Primary force

One paragraph, ≤4 sentences, naming the SINGLE strongest reason this pattern is worth the complexity. Singular. If three reasons feel equally important, the concept is too broad — split it.

Good: "A synchronous LLM call blocks a server thread for 10+ seconds. At any real scale, that means either huge thread pools (expensive) or timeouts (user-hostile). 202 Accepted + background processing decouples the client's wait from the server's work — the connection closes in milliseconds while the work proceeds at its natural pace."

## When to reach for it

3 bullets maximum. Each bullet is one concrete scenario where reaching for this pattern is the right call. Specific over abstract.

Good:
```
- Long-running LLM calls, OCR, batch ingest — any work with p99 > ~5s.
- Endpoints that must survive client disconnect.
- Work that benefits from independently scaling the worker pool.
```

Bad: "When you need async." (Circular.)

## When NOT to reach for it

4 bullets maximum. Boundary conditions, anti-patterns, and simpler alternatives. Absorbs what older concept files tracked in `Also` and `Common mistakes` — keep them together as the flip side of the primary force.

Good:
```
- Sub-200ms lookups — 202 + polling turns one round-trip into three. Use 200 OK.
- Fire-and-forget work with no completion signal needed — a plain queue is simpler.
- In-memory ticket state without durability — server restart loses jobs.
- No idempotency key on submit — retries double-process the same job.
```

## Evidence a topic touches this

Deterministic tagging signal for Step 4b.5 auto-tagging. Do NOT remove; the command looks for this literal heading to find tag hooks.

- Keywords: schema-example, reference file (this concept intentionally unmatchable in real projects)
- Files: n/a
- Commit verbs: n/a

## Deeper reading

Optional. Points to external docs that go deeper than the lesson can.

- `skills/gabe-arch/SKILL.md` — full schema definition and rules
- `skills/gabe-arch/TAXONOMY.md` — tiers × specializations map

---

## Legacy headings (backward-compat, do not use for new files)

Older concept files authored before 2026-04-19 use these heading names. The renderer falls back to them when new headings are absent:

| Old heading | New heading |
|-------------|-------------|
| `## Analogy` | `## Picture it` |
| `## When it applies` | `## When to reach for it` |
| `## When it doesn't` + `## Common mistakes` | `## When NOT to reach for it` |

For new concept files: write the new headings. Refactor old files opportunistically — no big-bang required.
