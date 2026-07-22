---
name: gabe-feature
description: "Feature coverage for a project's Testing Command Center — translate shipped work into its entity's lens card, diagrams, and evidence narration over machine-derived facts, and keep the center regenerating green. Usage: /gabe-feature [<phase>|--range A..B] | status | backfill | curate <artifact-subdir> <shot-nums…> | release [--since <row>]"
when_to_use: "Cover a shipped feature in the command center, center status, backfill the center entity-by-entity, curate proof + narration after a green run — ONLY in projects that have docs/site/center/center.config.json (elsewhere: STOP → /gabe-adopt bootstraps the center)."
metadata:
  version: 1.6.0
---

# Gabe Feature — the command center's per-feature ritual

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings. Full text: `../gabe-docs/references/execution-contract.md` (if missing, E6 — STOP).

## The intention (why this skill exists)

*A shipped feature becomes explainable to anyone — its story, its diagrams, its tests, its proof, one click apart — and the center regenerates green afterward. The machine already knows the facts (PLAN, junit, run-history, coverage, adoption.json, archmap, git); this skill writes ONLY the translation. Every claim it cannot derive, it must refuse to invent.*

The scripts do everything deterministic. The judgment that remains, and is ALL this skill adds: prose worth reading, which diagram nodes light up, which shots become proof, whether a claimed regex or glob is honest, and whether a gap gets a reason or a task. The center's axis is the ENTITY (adoption.json is the registry — D123): a shipped phase lands as growth on the entity pages it touched, never as a page of its own.

## Scope gate (run FIRST, every invocation)

`docs/site/center/center.config.json` must exist in the project. If it does not: **STOP** — this project has no command center. Point the human at `/gabe-adopt` (brownfield center adoption — its `init` mode archives existing docs and bootstraps the center; `rank`/`section` ingest the back-catalog) and end.

## Bindings (the project provides; verify before each mode)

All machinery ships in the suite (`templates/center/` — generators, gate, helpers, harness) and reaches a project bootstrap-by-copy at `/gabe-adopt` init; the project's copies live under `scripts/`.

| Binding | Path |
|---|---|
| Generator | `scripts/build_center_a3.py` — invoked via `scripts/refresh_center.sh [junit\|coverage\|e2e\|all\|regen]` (`regen` = re-render only; the other modes first run the shell lines declared in config `commands`) |
| Gate | `scripts/check_center_links.py` — chained by `refresh_center.sh` after EVERY mode; dead links / an empty crawl fail (exit 1), registry drift WARNs |
| Proof curation | `scripts/curate_proof.py <artifact-subdir> <shot-nums…>` |
| Backfill queue | `scripts/next_feature.py` |
| Shell-JS harness | `scripts/verify_center_chrome.mjs <page.html…\|center-dir>` |
| The one editorial overlay | `docs/site/center/center.config.json` (`paths` · `corpora` · `commands` · `entities.<slug>` blocks) |
| Entity registry | `docs/site/center/adoption.json` (owned by `/gabe-adopt` — slugs, statuses, display names) |
| Cards | `docs/site/center/cards/<slug>.md` |

Any binding in this table missing → E6 STOP, name it, done. Project-local extras (a scaffold script, extra reporters) are optional conveniences — never E6-mandatory. Format authority: the generators themselves (`scripts/_center_data.py` fails loud on card structure; `build_center_a3.py` aborts on an `entities` key adoption.json does not register) — `references/feature-spec.md` states intention and POINTS there; never duplicate the schema.

## Modes

### `/gabe-feature <phase>` or `--range A..B` (default — cover one shipped feature)

1. Name the entity(ies) the phase's work touched — slugs from `adoption.json` (an unknown slug aborts the build; a genuinely NEW entity is `/gabe-adopt` registry business, never a config edit). Display names come from the registry rows, colors from the generator maps — the config names nothing.
2. Write or extend `entities.<slug>` in `center.config.json`: `test_rx` (required — claims the test files that VERIFY the entity, which may predate the phase; broad on purpose: an over-match shows as a visible row, an under-match silently hides coverage) and, once the section is adopted, `proofs[]` · `code{layer: [globs]}` · `models[]`. Draft patterns carry `TODO(verify-glob)`. Author or extend the card — the contract (required sections + EXACT headings, the FLOWS grammar, optional LENS/CODE/RISKS/ANGLES sections, diagram rules) lives ONCE in `references/feature-spec.md`: read it before writing; the gate flags deviations. Ground every line in commits/code you actually read.
3. Regenerate (`refresh_center.sh regen`). Read the built feature page's **resolved match lists** — trim any over-claiming `test_rx`/glob, then delete the `TODO(verify-glob)` marker. Gate must be green (WARNs for THIS entity cleared).
4. Evidence, when it exists or one run away: green e2e run → `curate` mode below. When it doesn't: the card's ANGLES intent plus the machine Action Ledger carry the absence honestly — never a fake proof.
5. Present the built pages (feature + docs) to the human for THE review. On approval, stamp the card `# REVIEWED` (date + who) **and close the lifecycle loop (E5):** if the phase has a PLAN row whose Phases table carries a `Center` column, set that phase's `Center` cell to ✅ in `.kdbp/PLAN.md` **and** mirror `cells.center = "done"` into `.kdbp/PLAN.json` (same turn) — this is the cell `/gabe-next` reads to stop routing coverage. If the PLAN has no `Center` column, print one line: `ℹ PLAN has no Center column — run /gabe-plan update to adopt routed command-center coverage` and continue (never mutate the schema here; that is /gabe-plan's job). One feature per invocation; report what remains.

### `/gabe-feature status`

Run `refresh_center.sh regen`; read the gate output verbatim. Report: dead links (should be none — they fail the build), adopted entities with no card yet, `TODO(verify-glob)` in the registry, `TODO(author)` sections, cards missing canonical DIAGRAM sections or a reviewed stamp, proof manifests missing narration (or carrying `TODO(narration)`), malformed FLOWS lines — each with its single next action. No judgment beyond ordering.

### `/gabe-feature backfill`

Run `next_feature.py` — the queue reads committed center data only: fully-served PLAN phases whose `Center` cell is still open, then adopted entities with no card on disk. For the next queued item, ask the human for the TIER — **full** (evidence + narration; recent work) · **card-only** (registry block + card; history whose evidence nobody can rerun) · **skip** (record the disposition where the queue reads it: a parked/obsolete phase marks its PLAN `Center` cell ⏸/⚰️, a dropped entity carries the reason on its registry row — dropped work never gets a fake page, and never silence). Then run the default mode at that tier. One item per invocation.

### `/gabe-feature release [--since <deployments-row>]`

The stakeholder showcase — a MODE, not a lifecycle beat (it owns no time window, observes nothing perishable, gates nothing). Triggered by `/gabe-push`'s terminal-env pointer; renders `releases/<id>.html` from the phases whose `Center` cell went ✅ since the last terminal-env DEPLOYMENTS row. Contents + the video-slots-as-named-gaps rule: `references/feature-spec.md` §Release (binding).

### `/gabe-feature curate <artifact-subdir> <shot-nums…>`

After a green e2e run: pick the shots that PROVE the claims (selection is the judgment — one leg per claim), run `curate_proof.py`, author the manifest's narration block (`story` · one sentence per leg — describes, never asserts) AND its classification (`role:` + `flows:` — feature-spec §Flow coverage), then register the set: append the artifact-subdir name to `entities.<slug>.proofs[]` in `center.config.json`. Regen. Video custody: recordings are machine-local, never committed; the pages say so.

## Output contract

Per feature, on completion: a validated `entities.<slug>` block with human-confirmed `test_rx`/globs · a card with zero TODO markers and a `# REVIEWED` stamp · 3 diagrams (or the card states why fewer) · narration + `role:`/`flows:` wherever a proof set exists · gate green with this entity contributing zero WARNs · the phase's PLAN `Center` cell flipped ✅ (PLAN.md + PLAN.json) where that column exists, else the one-line adopt-the-column pointer. The verification changelog needs nothing from you — the builder appends `run-history.jsonl` itself on every regen whose totals moved. Card-only tier: the same minus evidence (ANGLES carry the reasons). Skip: one registry-row reason. E7: report page paths + the gate's closing line.
