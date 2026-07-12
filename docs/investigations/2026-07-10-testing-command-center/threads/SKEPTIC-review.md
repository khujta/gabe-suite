# Adversarial (skeptic) review of the draft recommendation — receipt

> Produced 2026-07-10 by the house-skeptic agent (Fable), with live verification against the gustify tree
> and the four thread receipts. The final recommendation in `../output/01-options-report.md` incorporates
> all 8 required modifications below.

## Verdict: UPHOLD-WITH-MODS

The architecture survives — Family A board, static composition over OSS leaf reports, name-derived IDs,
hub-on-top — because every alternative fails a LOCKED constraint (B/C trackers fork the truth; Allure-as-core
cannot see the KDBP layer and cannot beat live-probe screenshot freshness; ReportPortal/SaaS disqualified
outright). But the draft as worded oversold its evidence and under-priced its risks.

## New facts the skeptic verified (beyond the four threads)

- The "proven" generator family is **16 days old** (first `build_e2e_docs.py` commit 2026-06-24, `8b56bcb4`),
  ~20 commits, and already exhibits **two integrity defects**: the journey-groups.json silent-drift duplicate
  grouping, and `docs/site/e2e.html:581` loading mermaid from a CDN ES module against the vendored-classic
  file:// convention. Empirical rot rate ≈ two defects per fortnight per page family.
- The full generator estate is **6,179 lines across four divergent generators** (the T3 "~3,400" figure covered
  only the e2e+journey half); the e2e editorial curation module `_docs_e2e_data.py` is 395 hand-authored lines
  covering 31 Playwright specs.
- The invisible estate the center must cover: **283 pytest files + 45 vitest files** (verified by `find`).
- `run-status-reporter.ts` merge-updates: untouched specs keep entries from older code versions → hub totals
  built on it silently mix runs unless per-source `ranAt` is surfaced.
- Coverage the "normal way" edits `apps/api/pyproject.toml` + `apps/web/vitest.config.ts`/`package.json` —
  inside the read-only app dirs. Spike-able without app-file edits via `uv run --with pytest-cov` and
  `npm i --no-save @vitest/coverage-v8`, but productionizing requires an operator waiver.
- `--junitxml` is built into pytest AND vitest ships a junit reporter — the cheap-reporters claim survives
  with zero new dependencies.

## The 8 required modifications (all accepted into the final recommendation)

1. **Delete "proven."** Adopt the *pattern* (static regen, live-probe artifacts, placeholder fallback), not the
   claim; make "docs grouping reads journey-groups.json" (killing the curated duplicate) a spike acceptance criterion.
2. **Anti-curation guardrail as a binding spike rule:** new pages render only machine-derived data (JUnit XML,
   PLAN.json, journey-groups.json, coverage JSON); zero new hand-curated editorial tables; editorial layers only
   as optional overlay files.
3. **Coverage waiver = explicit operator decision point**; hub tile degrades gracefully when absent.
4. **Downscope the deep-link promise** to the testing half this phase; KDBP schema enrichment (structured proof
   links, per-cell timestamps, phase↔PENDING back-links) is a named Wave-2 suite dependency.
5. **Board-UX trade presented honestly:** Family A now, with a pre-priced escape hatch — GH Projects v2 one-way
   mirror (verified scriptable) if the operator misses drag-drop for PENDING triage after real use.
6. **History-JSONL custody decided up front** (committed + budget-gate exemption, or gitignored + per-machine
   caveat) — same fragility accounting applied to Allure applies here.
7. **Namespace the center** in its own subtree/prefix inside docs/site; flag run-status-derived totals as
   mixed-run until per-source ranAt is shown.
8. **Price the spike as throwaway** (promotion to a suite skill ≈ rewrite, per T3's "generalizing the curation
   layer is unsolved").

## Named failure conditions (carried into the report)

1. Operator actually wants to MANIPULATE items from the board (two weeks in, still hand-editing PENDING.md
   to reprioritize → Family A failed the human; GH Projects v2 or Kanboard takes the ticket half).
2. Nobody enforces the anti-curation guardrail (estate → 8–10k lines rotting at the demonstrated rate).
3. Operator declines the coverage waiver (hub centerpiece permanently absent — present it as a decision, not a fait accompli).
4. KDBP schema never grows structured proof/back-links ("everything deep-linked" permanently false at the
   motivating layer; the board is a prettier PLAN.json cat).
5. gastify (n=2) arrives inside Wave-2's horizon (generic-first placement would beat writing gustify-only code twice).

## Point-by-point survival table

| Draft element | Verdict |
|---|---|
| Family A board (KDBP-native static render) | SURVIVES (direction only; mods 4–5 apply) |
| Link OUT to OSS leaf reports | SURVIVES (best-evidenced part) |
| IDs derived from names | SURVIVES |
| L0 hub page | SURVIVES with caveat (mixed-run flag; coverage tile degrades) |
| pytest+vitest via cheap reporters | BENDS (only under the anti-curation guardrail; junitxml = zero new deps) |
| Coverage via pytest-cov/coverage-v8 | BENDS HARD (waiver decision point) |
| Carried-forward history JSONL | BENDS (custody decision; symmetric fragility accounting) |
| "Grow the PROVEN generator" framing | BREAKS (16 days, 2 defects — adopt the pattern, not the claim) |
| "Everything deep-linked" incl. KDBP this phase | BREAKS as scoped (downscope; Wave-2 dependency) |
| Allure single-file as runner-up leaf viewer | SURVIVES (steelman as core ultimately failed: can't see KDBP, can't beat live-probe freshness) |
| GH Projects v2 runner-up | SURVIVES — promoted to a named live option for PENDING triage |
| Host inside gustify docs/site | BENDS (own namespaced subtree; sibling-vs-inside stays an operator call) |
| Spike per-project, promote Wave-2 | BENDS (right sequencing, throwaway pricing required) |

Key files verified: `scripts/_docs_e2e_data.py`, `apps/api/pyproject.toml`, `tests/web-e2e/journey-groups.json`,
`docs/site/e2e.html:581`, `.kdbp/PLAN.json`, plus the four thread receipts.
