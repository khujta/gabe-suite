# Gabe Entity — full spec

> This file is the binding spec; the SKILL.md core is a summary.
> E1–E7: see `../../gabe-docs/references/execution-contract.md`.

`/gabe-entity <slug>` assembles one application entity's slice into a **context pack**
from the command center's committed data. It is a deterministic reader
(`scripts/entity-context.py`) — a pure consumer of the `archmap.json` contract, never a
producer. This spec is the binding contract for what it reads and emits.

## Why a reader, not a per-entity skill (D7)

The obvious shape — "a skill dedicated to Transactions" — was considered and **rejected
under D7**: entities are scoped via DATA, not code. `adoption.json` is THE entity registry;
`center.config.json` holds per-entity bindings; `archmap.json` is the read-once code map.
This reader is a lens over that data. It adds no second entity mechanism, needs no
project-local skill, and stays correct as the data evolves. To change what an entity *is*,
edit the data (via `/gabe-adopt` / `/gabe-feature`), not this skill.

## Inputs — the three sources, joined on the slug

All three live under the center dir (default `docs/site/center/`, located up from CWD or via
`--center`). `center.config.json` is the anchor: if it is absent the project has no built
center → STOP → `/gabe-adopt` (E6).

| Source | Produced by | Contributes |
|---|---|---|
| `archmap.json` | `templates/center/generators/` (`collect_entity_map` + `build_center_a3`) | the code slice for `entities[slug]` |
| `adoption.json` | `/gabe-adopt` | the registry row where `sections[].entity == slug` |
| `center.config.json` | `/gabe-adopt` (filled per project) | bindings at `entities[slug]` (canonical shape only) |

**Contract of `archmap.json`** (suite-owned since commit 991d8aa): top-level
`{version, head, generated, entities}`; `entities` is a dict keyed by slug; each value is
`{endpoints[], models[], schemas[], files[], defines{}}` or `null` (registered, unmapped).
- endpoint: `{method, path, fn, file, doc, resp, status, touches[]}`
- model: `{cls, table, file, doc, cols[[name,type]], fks{col:"table.col"}, rels[{name,target,many,back,cascade}], uqs[]}`
- schema: `{cls, file, fields[[name,type]], doc}`
- files: `[[layer, repo_rel_path, measured_lines], ...]`
- defines: `{file: [symbol, ...]}`

**Contract of `adoption.json`**: `sections[]` rows keyed on `entity`, each with
`display_name, rank, status, checklist{7 bools}, signals, approved_walk, notes`.

**Contract of `center.config.json` (canonical)**: `entities{slug: {test_rx, proofs[], models[],
code{...}}}`. The **legacy** live shape (`entities` as a list of `{id,label,color}`) is
tolerated: `config_canonical` is reported `false` and bindings are omitted — the pack still
assembles from archmap + adoption.

## The join & derivations

- **code** := `archmap.entities[slug]` (or `null`).
- **registry** := the `adoption.sections` row with `entity == slug` (or `null`).
- **bindings** := `center.config.entities[slug]` when the config is canonical (else `null`).
- **relations** := for each FK `col: "table.col"` in this entity's models, resolve `table` →
  owning slug via a `{table: slug}` index built from **all mapped** entities' models. Targets
  in unmapped entities are reported as raw table names (honest, and self-heals as more
  entities map). Related entities exclude self.
- **counts** := endpoints/models/schemas/files + summed `files[*][2]` lines.
- If BOTH `code` and `registry` are absent for the slug → STOP, listing the known entities.

## Output — the context pack

**JSON (`--json`)** — for injecting entity context into an agent or a downstream beat:

```
{
  slug, display_name,
  source:   { archmap_head, archmap_generated, center },
  registry: { rank, status, checklist, checklist_done, checklist_total, signals, approved_walk, notes } | null,
  code:     { endpoints[], models[], schemas[], files[], defines{}, counts{endpoints,models,schemas,files,lines} } | null,
  relations:{ fk_out[{from_model,col,target_table,target_entity}], related_entities[], unresolved_tables[] },
  bindings: { test_rx, proofs[], models_allowlist[], code_globs{} } | null,
  availability: { archmap: bool, adoption: bool, config_canonical: bool }
}
```

**Brief (default)** — a scannable markdown pack: title `# Entity context — <name> (slug: <slug>)`,
an availability line, then `## Registry` (rank/status/checklist N/M/walk + signals),
`## Code` (counts, then endpoints, models `cls[table]` with col/fk counts, schema names, files
grouped by layer), `## Relations` (related entities + unresolved tables), `## Bindings`
(test_rx, proof-set + allowlist counts).

## Degradation (never crash on partial data)

| Condition | Behavior |
|---|---|
| entity mapped but not in adoption | `registry: null`, brief prints "_not registered_" |
| registered but `archmap.entities[slug]` is null/absent | `code: null`, brief prints "_not mapped_" |
| legacy-shape or absent config | `bindings: null`, `config_canonical: false` |
| no `center.config.json` | STOP → `/gabe-adopt` (E6) |
| neither archmap nor adoption present | STOP → build the center (`/gabe-adopt` / `/gabe-feature`) |
| unknown slug | STOP, print the registered-entity list (E7 report-where) |

## Handshake walk (adjacent beats)

- **Emits** a context pack that **no beat consumes yet** — execute/red/review are not
  entity-aware. First cut is standalone (a human or agent reads the brief / `--json`). The
  `--entity` beat-flag that would make execute/red/review entity-aware is a **deferred,
  coordinated** phase — it edits those specs and is out of scope here. No current seam breaks.
- **Reads** exactly what `/gabe-adopt` and the promoted `templates/center/generators/` write.
  The reader depends on their output contract, not their internals; if the files are absent it
  STOPs toward the producer rather than guessing. It never writes center data (E5: it records
  nothing; it reads).

## Verification

- In-repo smoke fixture: `tests/fixture-center/` — two linked entities (`widget` → `gadget`
  via FK). Exercises the join, FK relation resolution, `list`, `--json`, and the unknown-slug
  STOP. Run: `python3 scripts/entity-context.py widget --center skills/gabe-entity/tests/fixture-center`.
- Reality check (per the suite rule — a data script ships only after a dry-run against a COPY
  of real data): validated against a copy of gastify's live center. `transaction` → 14
  endpoints, 5 models, 16 schemas, 37 files (10,658 lines); registry critical /
  awaiting-approval / checklist 7/7; FK targets in 6 unmapped entities listed; gastify's config
  is legacy-shape, so `config_canonical: false` and bindings degrade cleanly. The fixture
  validates the join; the gastify copy validates against reality (meta-review P1).
