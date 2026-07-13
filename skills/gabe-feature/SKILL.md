---
name: gabe-feature
description: "Feature coverage for a project's Testing Command Center — translate a shipped feature into its lens card, diagrams, and evidence narration over machine-derived facts, and keep the center regenerating green. Usage: /gabe-feature [<phase>|--range A..B] | status | backfill | curate <artifact-subdir> <shot-nums…>"
when_to_use: "Cover a shipped feature in the command center, center status, backfill the center feature-by-feature, curate proof + narration after a green run — ONLY in projects that have docs/site/center/center.config.json (elsewhere: STOP with the bootstrap pointer)."
metadata:
  version: 1.0.1
---

# Gabe Feature — the command center's per-feature ritual

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings. Full text: `../gabe-docs/references/execution-contract.md` (if missing, E6 — STOP).

## The intention (why this skill exists)

*A shipped feature becomes explainable to anyone — its story, its diagrams, its tests, its proof, one click apart — and the center regenerates green afterward. The machine already knows the facts (git, junit, run-status, OpenAPI, PLAN); this skill writes ONLY the translation. Every claim it cannot derive, it must refuse to invent.*

The scripts do everything deterministic. The judgment that remains, and is ALL this skill adds: prose worth reading, which diagram nodes light up, which shots become proof, whether a derived glob is honest, and whether a gap gets a reason or a task.

## Scope gate (run FIRST, every invocation)

`docs/site/center/center.config.json` must exist in the project. If it does not: **STOP** — this project has no command center. Point the human at the bootstrap procedure in `references/feature-spec.md` §Bootstrap (copy the reference implementation from gustify) and end.

## Bindings (the project provides; verify before each mode)

| Binding | Path (reference implementation: gustify) |
|---|---|
| Generator + gate | `scripts/build_center_docs.py` (runs `check_center_links.py` itself) |
| Evidence refresh | `scripts/refresh_center.sh [junit\|coverage\|journeys\|checks\|all\|regen]` |
| Feature scaffold | `scripts/scaffold_feature.py <phase\|--range A..B>` |
| Proof curation | `scripts/curate_proof.py <artifact-subdir> <shot-nums…>` |
| Backfill queue | `scripts/next_feature.py` |
| The one editorial overlay | `docs/site/center/center.config.json` (`features[]`, entities, dispositions) |
| Cards | `docs/site/center/cards/<slug>.md` |

Any binding missing → E6 STOP, name it, done. Format authority: the project's own validator (`scripts/_center_data.py` fails loud) — `references/feature-spec.md` states intention and POINTS there; never duplicate the schema.

## Modes

### `/gabe-feature <phase>` or `--range A..B` (default — author one feature)

1. Run the scaffold script. It prints a DRAFT registry entry (globs marked `TODO(verify-glob)`) and writes a card skeleton (`TODO(author)` on every prose section).
2. Insert the entry into `features[]`; author the card: HANDLE → WHAT & WHY (+ one analogy line) → FOR WHOM → FLOWS → IS / IS NOT → DECIDED → ENTITIES (from config) → ANGLES (a reason line per absent angle — never words that read as 'untested') → the 3 DIAGRAM sections (types, shapes, highlights per `gabe-docs/references/docs-spec.md` §Mermaid). Ground every line in commits/code you actually read.
3. Regenerate (`refresh_center.sh regen`). Read the built feature page's **resolved match list** — trim any over-claiming glob, then delete the `TODO(verify-glob)` marker. Gate must be green (WARNs for THIS feature cleared).
4. Evidence, when it exists or one run away: journey run → `curate` mode below. When it doesn't: the ANGLES reasons carry the absence honestly.
5. Present the built pages (feature + docs) to the human for THE review. On approval, stamp the card `# REVIEWED` (date + who). One feature per invocation; report what remains.

### `/gabe-feature status`

Run `refresh_center.sh regen`; read the gate output verbatim. Report: dead links (should be none — the gate fails the build), unmapped phases, TODO markers, unreviewed cards, NO-RUN specs, undated stations — each with its single next action. No judgment beyond ordering.

### `/gabe-feature backfill`

Run `next_feature.py`. For the next pending phase, ask the human for the TIER — **full** (evidence + narration; recent work) · **card-only** (registry + card; history without runnable evidence) · **skip** (record the reason in `backfill_dispositions`; dropped work never gets a fake page). Then run the default mode at that tier. One phase per invocation.

### `/gabe-feature curate <artifact-subdir> <shot-nums…>`

After a green journey run: pick the shots that PROVE the claims (selection is the judgment — one leg per claim), run the curation script, author the manifest's narration block (story · capture_story · one sentence per leg — describes, never asserts), set the registry `proof_dir`/`capture`, regen. Capture custody: video is machine-local, never committed; the pages say so.

## Output contract

Per feature, on completion: a validated `features[]` entry with human-confirmed globs · a card with zero TODO markers and a `# REVIEWED` stamp · 3 diagrams (or the card states why fewer) · narration wherever a proof set exists · gate green with this feature contributing zero WARNs. Card-only tier: the same minus evidence (ANGLES carry the reasons). Skip: one disposition line with a reason. E7: report page paths + the gate's closing line.
