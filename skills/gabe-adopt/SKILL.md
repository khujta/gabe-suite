---
name: gabe-adopt
description: "Brownfield command-center adoption — archive existing docs (never delete), bootstrap the center shell from suite templates, machine-rank the critical entities, then ingest the back-catalog ONE section per run at human speed, each section checklist-gated and closed by operator approval recorded as a walk. New features keep flowing through /gabe-feature; the two tracks meet in the same center. Usage: /gabe-adopt init | rank | section <entity> | status"
when_to_use: "An existing codebase needs a Testing Command Center — bootstrap it and ingest what already exists (features, tests, docs, proofs) section by section, in spare time, alongside normal feature development. Also: /gabe-feature stopped you with its bootstrap pointer. NOT for covering a freshly shipped phase (that is /gabe-feature) and NOT for publishing a doc page (that is /gabe-docsite)."
disable-model-invocation: true
metadata:
  version: 1.0.0
---

# Gabe Adopt — the back-catalog, at human speed

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## The intention

*A project that grew before the center existed has features, tests, and documentation nobody can see in one place. This skill adopts that back-catalog — but never by bulk import: legacy prose is raw material to re-verify, not truth to copy. It archives what exists (never deletes), bootstraps a clean-slate center, lets the machine rank what matters, and then ingests ONE section per run so the operator can check every diagram, doc, test angle, and proof at human speed before it counts. Meanwhile the main plan keeps shipping — new features enter the center through `/gabe-feature`, and the two tracks converge.*

## Modes

| Mode | What it does | Gate |
|------|--------------|------|
| **init** | Inventory existing docs + any hand-built center → operator picks what gets ARCHIVED (`docs/_archive/<date>-pre-adoption/`, moved never deleted) → bootstrap the center shell from suite `templates/center/` → write the adoption tracker | Archive list approved before any move |
| **rank** | Machine-derive the candidate entity list (SCOPE, PLAN incl. archives, routes/modules, test density, churn, walks) → propose critical/high/medium | Operator trims + approves the shortlist; nothing unranked gets built |
| **section \<entity\>** | ONE entity per run: testing inventory (angles present, gaps NAMED) → legacy mining (carry forward only what re-verifies; list what was dropped) → build card/diagrams/testing page/proofs → regen, gate green → checklist | Operator approval, recorded as a walk (`adopt:<entity>`) |
| **status** | Render the adoption board from the tracker + walks.jsonl: approved / building / awaiting / pending, convergence, suggested next entity | — |

## Procedure

1. Parse `$ARGUMENTS` (mode + optional entity). No mode → print `status` if a tracker exists, else the init pitch.
2. Read `references/adopt-spec.md` IN FULL before executing — the binding spec (tracker schema, archive rules, generator-promotion path, ranking signals, the section checklist, walk-recorded approval). If missing, E6 — STOP.
3. Run the mode. Every write is path-scoped; every checkpoint waits for the operator.

## Laws (inherited, applied to legacy content)

- **Anti-curation:** machine sources assert every count/verdict; authored prose only translates; gaps are named, never faked — and a legacy doc's claim enters the center ONLY after re-verifying against current code/tests. Bulk import of unverified prose is forbidden.
- **Anti-bloat:** the center stays derived; adoption state is one small tracker file; archived docs are referenced, never rebuilt.
- **One section per run, by design.** A request to batch sections is refused — human-speed review IS the feature.
- **The tracker never lives in PLAN.md.** `/gabe-next` and the active plan are untouched; adoption is the parallel back-catalog track.

## Output contract (E7)

Per mode: `init` → archive manifest + bootstrapped paths + tracker location; `rank` → the evidence-columned candidate table + approved shortlist; `section` → the built page paths, the checklist state, the dropped-claims list, and the walk line recorded on approval; `status` → the board. Every report ends with where state was written.

## Non-goals

- Does NOT cover freshly shipped phases (`/gabe-feature` owns the forward track and the PLAN `Center` cell).
- Does NOT place standalone doc pages (`/gabe-docsite`).
- Does NOT delete anything, ever — archive is `git mv` plus an explanatory README.
- Does NOT rank by opinion — every rank cites its machine signals; the operator overrides freely.

$ARGUMENTS
