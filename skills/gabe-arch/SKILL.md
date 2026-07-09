---
name: gabe-arch
description: "Architecture curriculum layer for the Gabe Suite. Holds concept files (one per idea: retry-with-backoff, idempotency-keys, circuit-breaker, …) organized by tier × specialization. Consulted by /gabe-teach for inline Architecture-link rendering in lessons, by /gabe-teach arch mode for dedicated architecture study, and by /gabe-teach for tagging topics with concepts they touch."
when_to_use: "Background curriculum consulted by /gabe-teach — architecture concept files by tier × specialization. Not a user-facing command."
user-invocable: false
metadata:
  version: 1.1.1
---

# Gabe Arch — Architecture Curriculum

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

A cross-project library of architecture concepts that accumulates as the human verifies them during project-driven `/gabe-teach` sessions. The goal is not to teach architecture in the abstract — it is to **reinforce universal architecture concepts while developing real apps**, so the human gradually becomes architect-minded (tradeoffs, scalability, reliability) without ever sitting through a disconnected lecture.

## How it fits the suite

- **Topics** (from `/gabe-teach topics`) live in per-project `.kdbp/KNOWLEDGE.md` (legacy — retired from the default KDBP inventory in A2; `/gabe-teach` runs stateless without it), driven by commits.
- **Concepts** (this skill) live in `skills/gabe-arch/concepts/`, driven by the catalog below.
- A single topic can be tagged with 0-N concepts (via the `ArchConcepts` column in `.kdbp/KNOWLEDGE.md`'s Topics table, when a legacy KNOWLEDGE.md is present).
- A verified topic increments the tagged concepts' status in `~/.claude/gabe-arch/STATE.md` — the global, cross-project source of truth.
- `/gabe-teach arch` enters dedicated architecture mode: browse, teach, verify, or let the system pick the next concept via progressive pressure.

## Taxonomy

See `TAXONOMY.md` for the full map. Summary:

- **3 tiers:** `foundational` · `intermediate` · `advanced`
- **7 specializations:** `agent` · `web` · `data` · `distributed-reliability` · `security` · `infra` · `cost`

A concept can belong to multiple specializations (e.g., `retry-with-backoff` is `[distributed-reliability]`, `retry-aware-cost-cap` is `[cost, distributed-reliability]`). Tier is singular.

## Concept file schema

Every file under `concepts/{specialization}/{slug}.md` follows this shape exactly. Schema validation is manual for v1 — no linter yet.

```markdown
---
id: kebab-case-unique-id
name: Human-readable Name
tier: foundational | intermediate | advanced
specialization: [spec-1, spec-2, ...]     # 1-N from the 7 specs
tags: [free-form, searchable, keywords]
prerequisites: [concept-id, concept-id]   # 0-N; may span specializations
related: [concept-id, concept-id]         # 0-N; non-blocking sibling concepts
one_liner: "5-15 word mental model used in /gabe-teach Architecture-link rendering."
---

## Analogy

2-3 sentences. A physical / spatial / mechanical picture that sticks. Same
voice as the `gabe-lens` skill's analogy mode.

## When it applies

- 2-5 bullets: conditions where this concept is the right move.

## When it doesn't

- 2-5 bullets: conditions where this concept is a trap or overkill.

## Primary force

1 paragraph (≤4 sentences). The single strongest reason the concept exists.
If you can't pick one force, the concept is too broad — split it.

## Common mistakes

- 2-4 bullets. Concrete failure modes junior engineers hit.

## Evidence a topic touches this

Rules used by `/gabe-teach` Step 4b.5 for deterministic tagging. Format:

- **Keywords:** comma-separated literal strings to match in commit messages
  and changed-file snippets.
- **Files:** glob patterns identifying code that embodies this concept.
- **Commit verbs:** verb phrases typical of commits introducing this concept.

Example:

- Keywords: retry, backoff, tenacity, exponential, jitter
- Files: `**/http_client.py`, `**/retry_policy.*`, `**/*.transport.*`
- Commit verbs: "add retry", "handle 429", "backoff on", "wrap in tenacity"

## Deeper reading

Links to authoritative sources. Prefer:

1. Internal references: `refrepos/docs/arch-ref-lib/...`, khujta-mem vault paths
2. First-party docs: cloud provider, framework maintainer
3. Third-party: only when no first-party exists

Each link one line, no annotation bloat.
```

## Rules

### Rule 1 — One concept, one file, one idea

Each file teaches exactly one idea. If a file grows beyond ~150 lines or introduces a second force, split it. The catalog's value comes from concepts being small enough to verify in one teach session.

### Rule 2 — Singular Primary force

A concept that can't pick a single Primary force is too broad. This is the same rule `/gabe-teach` enforces on lessons. If you find yourself writing "the four reasons for retries," that's four concepts.

### Rule 3 — Evidence rules are pragmatic, not exhaustive

The `## Evidence a topic touches this` section exists for machine tagging. Two to five solid rules beat fifteen fuzzy ones. False positives poison tagging quality more than false negatives — when in doubt, tighten the rule.

### Rule 4 — Prerequisites cross specializations

`retry-with-backoff` (distributed-reliability) lists `idempotency-keys` as a prerequisite even if idempotency lives in multiple specializations. Follow the truth of the dependency, not the organization chart.

### Rule 5 — No orphans

Every concept should either be reachable from another concept via `prerequisites` / `related`, or be a foundational root. Orphans signal the concept doesn't belong in the catalog or the taxonomy has a gap.

### Rule 6 — Reference, don't duplicate

If `refrepos/docs/arch-ref-lib/` or khujta-mem already explains something in depth, link it in `## Deeper reading`. Concept files are indexes into the broader library, not copies of it.

## Query patterns (used by `/gabe-teach arch` and Step 4b.5)

The commands treat the `concepts/` directory as a queryable dataset. Expected queries:

| Query | Mechanism |
|-------|-----------|
| All concepts in a tier | Glob `concepts/**/*.md`, filter frontmatter `tier` |
| All concepts in a specialization | Glob `concepts/{spec}/*.md` |
| Concepts matching a tag | Glob + filter frontmatter `tags` contains tag |
| Prerequisites of concept X | Read X's frontmatter `prerequisites` array |
| Concepts that depend on X | Glob all concepts, filter those whose `prerequisites` contain X |
| Concepts matching a commit/file (tagging) | Read each concept's `## Evidence` rules, match against the topic's commits + files |
| `next` for the human | Intersect unverified concepts with adjacency (see below) |

## Progressive-pressure rule (for `/gabe-teach arch next`)

Three-tier fallthrough, first match wins:

1. **Project-driven** — any unverified concept tagged on a `pending` or `skipped` topic in the current project's `.kdbp/KNOWLEDGE.md`, when a legacy KNOWLEDGE.md is present (no-op — falls through to tier 2 — on projects without one).
2. **Adjacency** — any unverified concept whose `prerequisites` are all `verified` in `~/.claude/gabe-arch/STATE.md`, preferring concepts in specializations where the human already has momentum (≥1 verified concept in that spec).
3. **Foundation gap** — any `intermediate`/`advanced` concept the human has verified without its foundational prerequisites. Surface the gap before proposing new ground.

## Tier derivation (for `/gabe-teach arch` dashboard)

Per specialization, computed live from `STATE.md`:

- `foundational` reached: ≥60% of published foundational concepts in the spec are `verified`
- `intermediate` reached: foundational reached AND ≥50% of intermediate concepts verified
- `advanced` reached: intermediate reached AND ≥40% of advanced concepts verified

Thresholds are deliberately loose for the first three months of real use; revisit once the catalog stabilizes at ~60 concepts.

## Concept-to-lesson rendering (for `/gabe-teach arch show <id>`)

The concept file maps into the existing 6-part lesson template:

| Lesson section | Concept file source |
|----------------|---------------------|
| What changed   | Not applicable for arch-mode — replaced by **Concept at a glance** (frontmatter name + tier + specialization) |
| Analogy        | `## Analogy` body (or frontmatter `one_liner` if brief mode) |
| Scenario       | Synthesized from `## When it applies` + `## When it doesn't` (one before/after pair) |
| Primary force  | `## Primary force` body |
| Also           | Top 1-2 bullets from `## Common mistakes` |
| Q1, Q2         | Generated fresh per session from `## Common mistakes` + `## When it doesn't` via one short LLM call |

Questions are generated — not stored in the file — so the same concept can be re-taught without repeating the same quiz.

## Adding a new concept

1. Pick the specialization directory. If none fits, propose a new specialization in `TAXONOMY.md` and surface the proposal to the user before creating the concept.
2. Copy `concepts/_schema-example.md` as the starting point.
3. Fill the frontmatter. IDs must be globally unique across all specializations.
4. Write the body following the six sections.
5. List prerequisites honestly — even if it means referencing concepts in other specs.
6. Leave `## Deeper reading` thin if you don't have authoritative sources yet; don't invent.

## Anti-patterns (concept files to reject)

- **The grab-bag**: "Good API design" — this is ten concepts stapled together.
- **The tautology**: "Use caching when caching would help" — no Evidence, no When-it-doesn't.
- **The vendor ad**: "Use Redis for X" — concepts are pattern-level, not vendor-level.
- **The stub that never grows**: a file with just frontmatter and a TODO — either fill it or delete it.
