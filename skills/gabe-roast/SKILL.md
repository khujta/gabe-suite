---
name: gabe-roast
description: "Adversarial gap review from a required perspective. Usage: /gabe-roast [perspective] [target]. Classifies gaps by maturity (MVP/Enterprise/Scale) and importance (Critical/High/Medium/Low) with one-liners."
when_to_use: "Roast this, find what's missing, adversarial gap review of a plan/spec/diff/implementation from a named perspective before shipping."
context: fork
agent: Explore
metadata:
  version: 1.1.0
---

# Gabe Roast — Adversarial Gap Review Skill

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## What this does

Stress-tests a target (file, folder, plan, architecture, or concept) from a required perspective to surface gaps, risks, and missing pieces — classified by maturity level (MVP/Enterprise/Scale) and importance (Critical/High/Medium/Low), with actionable output that drives decisions. Not a generic checklist: the skill fully adopts the named perspective, reads deeply, and attacks like someone whose job depends on finding what's wrong.

## Usage / modes

`/gabe-roast [perspective] [target]`

Two inputs are required — target (file, folder, inline plan/concept, or "this conversation") and perspective (never optional; examples: Architect, UX/UI Designer, Security Auditor, QA/Testing Lead, DevOps Engineer, Domain Expert, End User). If either is missing, ask before proceeding.

| Mode | Output |
|------|--------|
| **full** (default) | Per-gap fields (Gap, One-liner, Effort, Lose, Evidence, optional Fix), grouped by maturity level then importance |
| **brief** | Scannable table: ID / Maturity / Importance / Gap / One-liner / Effort |

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS` (perspective + target).
2. Read `references/roast-spec.md` IN FULL before executing — the binding spec. If missing, E6 applies — STOP.
3. Confirm both target and perspective are present; ask if either is missing.
4. **Pre-roast gate:** run `/gabe-align shallow` on the target (skip if no `.kdbp/VALUES.md` or `~/.kdbp/VALUES.md` exists). PASS → proceed; CONCERN → warn and proceed; FAIL → warn and confirm before continuing.
5. Read before attacking: list the folder tree, open every entry point + config, never cite a file not opened this session, print a read ledger (`Read: 14/38 files — skipped: ...`) directly under the perspective line.
6. Stay fully in character for the perspective; classify each gap by maturity level and importance, filling every required per-gap field with cited evidence (or a recorded 0-hit search for absence claims).
7. **Kill-gate (mandatory before printing):** re-verify every gap against its Evidence; a gap with an empty Evidence field is deleted, not demoted. Print `drafted N → killed X → reported Y` above the total line.
8. Render the requested mode's output; if zero gaps survive, say so explicitly rather than manufacturing findings.

## Output contract (summary)

Full mode: `GABE ROAST` header (target, perspective, read ledger) + gaps grouped by maturity (MVP/Enterprise/Scale) then importance (Critical/High/Medium/Low), each with Gap/One-liner/Effort/Lose/Evidence/Fix, ending in a mandatory `TOTAL: [X] gaps — ...` summary line plus the kill-gate stats. Brief mode: the same gaps as one table row each, sorted maturity-then-importance-then-impact, no Evidence/Lose/Fix columns. The full output contract in the spec is binding.
