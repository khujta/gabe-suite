---
name: gabe-docs
description: "Documentation standards for gabe-generated docs. CommonMark compliance, Mermaid diagram selection, analogy-first openers, per-well diagram recommendations. Consulted by /gabe-init (doc stubs) and /gabe-commit (drift check)."
when_to_use: "Background standards consulted by other gabe skills — doc structure standards, Mermaid diagram selection, and the suite execution contract (references/execution-contract.md). Not a user-facing command."
user-invocable: false
metadata:
  version: 1.1.1
---

# Gabe Docs — Documentation Standards

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## What this does

The house style for every markdown file the Gabe Suite creates or touches — distilled from BMAD tech-writer standards plus Gabe-Suite-specific conventions (analogy-first openers, per-well diagram recommendations).

This is a **background standards skill**, not a user-facing command. It is consulted by `/gabe-init` (doc stubs at project scaffold time) and `/gabe-commit docs-audit` (drift + diagram-staleness checks) — and by any gabe skill that renders spec-meta output templates at runtime.

## References this skill owns

- `references/execution-contract.md` — the suite execution contract (E1–E7) **plus orchestration restraint**, stated once here for the whole suite. Every other gabe skill points back to this one file instead of pasting its own copy.
- `diagrams-library.md` (skill root) — 14 advanced Mermaid patterns (subgraphs, styling, multi-layer composition, `alt`-branch sequences, mindmaps) for when `references/docs-spec.md`'s skeletons aren't enough.

## Usage / modes

Not directly invoked by a user. Consumers read this skill's standards at the points below:

| Consumer | When it reads this skill |
|---|---|
| `/gabe-init` | Doc stub creation at project scaffold time |
| `/gabe-commit docs-audit` | CommonMark/diagram drift checks against these standards |
| Any gabe skill producing user-facing tables/prompts | The runtime output rendering convention (bare-fence vs tagged-fence) |

## Procedure

1. Read `references/docs-spec.md` IN FULL before applying any standard to a doc — the binding spec for the runtime output rendering convention, CommonMark essentials, Mermaid diagram-type selection + syntax templates, per-doc-type diagram policy, the well-doc template, the placeholder-diagram upgrade heuristic, writing rules, and the quality checklist. If missing, E6 applies — STOP.
2. Apply the three load-bearing rules to any doc being created or edited: CommonMark strict, no time estimates, analogy-first opener.
3. For diagrams beyond the spec's minimal skeletons, read `diagrams-library.md` for composition patterns (not domain content — the library's examples are placeholder structure).
4. Before any Write/Edit of a gabe-generated doc, run the spec's quality checklist and emit one result line: `docs-check: clean` or `docs-check: failed <ids> — fixed`.

## Output contract (summary)

Every gabe-generated doc is CommonMark-strict, carries no time estimates, opens well docs with the analogy-first line, uses a correctly-typed Mermaid diagram capped at 15 nodes, and is written in active voice / present tense / second person with descriptive link text. Precedence when standards conflict: project-local `.kdbp/` standards (rare) → this skill → the CommonMark spec.

The full output contract in the spec is binding.
