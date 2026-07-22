---
name: gabe-entity
description: "Entity-context reader — assembles ONE application entity's slice (code map + registry + bindings) into a context pack from the command center's committed data, without re-reading the codebase. Usage: /gabe-entity <slug> | list | <slug> --json"
when_to_use: "Everything about an entity (e.g. Transaction), an entity brief or context pack, what code/endpoints/models/schemas touch entity X, related entities via FK, an entity's coverage status — assembled from docs/site/center data (archmap.json + adoption.json + center.config.json). ONLY in projects with a built command center; elsewhere STOP → /gabe-adopt."
metadata:
  version: 1.0.0
---

# Gabe Entity — Entity-Context Reader Skill

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## What this does

Assembles everything the suite already knows about one application **entity** — its code map, its adoption-registry row, and its config bindings — into a single **context pack** (a markdown brief, or JSON for an agent). It is a pure DATA reader: it indexes the command center's committed, read-once `archmap.json` and never re-analyzes the source (E4 reuse-first). The three sources join on the entity **slug**.

This is the DATA answer to "a skill dedicated to Transactions": entities stay data (the D7 ruling — `adoption.json` is the registry, `center.config.json` holds bindings, `archmap.json` is the code map); this reader is a lens over that data, not a per-entity skill. It does not produce or refresh the center — to rebuild the underlying data, run `/gabe-adopt` or `/gabe-feature`.

## Usage / modes

`/gabe-entity <slug> [--center DIR] [--json]` · `/gabe-entity list`

| Mode | Output |
|------|--------|
| **brief** (default) | Markdown pack: Registry · Code (endpoints/models/schemas/files-by-layer) · Relations (FK-derived related entities) · Bindings, with an availability line |
| **json** (`--json`) | The machine context pack — for injecting entity context into an agent or another beat |
| **list** | Enumerate registered entities (slug · display_name · rank · status · mapped/unmapped) |

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS` — the entity slug, or the literal `list`.
2. Read `references/entity-spec.md` before executing — the binding spec (data contract, join, pack schema, degradation rules). If missing, E6 applies — STOP.
3. Locate the center: `docs/site/center/` found up from CWD, or `--center DIR`. If no `center.config.json` anchor exists, this project has no built center — **STOP and route to `/gabe-adopt`** (E6), never fabricate a pack.
4. Run `scripts/entity-context.py <slug> [--center DIR] [--json]` — the deterministic reader. Do NOT re-derive the slice by reading source; the reader indexes the committed `archmap.json`.
5. Present the reader's output verbatim. If it STOPs (unknown slug, no center, no data), surface its message and available-entity list — do not invent a slice.
6. Choose the mode by consumer: the **brief** for a human; **`--json`** when an agent or a downstream beat needs the pack as structured context.

## Output contract (summary)

Brief mode: a markdown pack headed `# Entity context — <name> (slug: <slug>)` with an availability line (`archmap ✓ · adoption ✓ · canonical config ✓/—`) then Registry / Code / Relations / Bindings sections. JSON mode: `{slug, display_name, source, registry, code (+counts), relations (fk_out/related_entities/unresolved_tables), bindings, availability}`. Degrades honestly and never crashes on partial data: an unmapped entity → `code: null`; a legacy-shape or absent config → `bindings: null` with `config_canonical: false`. The full output contract in the spec is binding.
