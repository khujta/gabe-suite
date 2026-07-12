# Implementation log — Wave-1 remainder (suite-only, post-A2)

- **Executed:** 2026-07-09, same session as A2, on the operator's "continue the work here" (with the standing directive: gustify + gastify HANDS-OFF until the end-of-development freeze windows — everything below is suite-repo + fixture work, zero twin-project writes).
- **Spec:** deliverable 6 Wave-1 items not absorbed by the forks — 1.3(b–e) Evidence Doctrine (deliverable 4), plus the unexecuted suite-side Wave-0 bits 0.3 (NEXT-pointer contract) and 0.5b (documentation-diet check), plus gabe-next's flagged post-A2 `next.mjs` hardening.
- Branch: `feat/a2-kdbp-lite` (stacked on the A2 commits). Commits `338fc91` · `fabf6db` · `35af9ac`.

## What landed

1. **Evidence Doctrine convention stated once** — `skills/gabe-docs/references/evidence-doctrine.md`: importance filter (proof declared at plan time in PLAN.json, never judged at gate time), change-type → proof-form map, the living proof set (one spec + one proof folder per feature, committed manifests, un-ignore carve-out, no dated throwaways), staged freshness enforcement, fresh-context evaluation, evidence→docs dual purpose, capture contract (Playwright+ffmpeg baseline; pagecast evaluated per-project at its freeze window, never a suite dependency).
2. **1.3c freshness check (WARN-and-LOG stage 1)** — `gabe-commit/scripts/evidence-freshness.sh`: current phase carries non-null `proof` (PLAN.json) → newest artifact under the manifest's `proof_root` must be ≥ newest staged source change; stale/missing → visible WARN + one line to `.kdbp/archive/evidence-bypass.log`; exit 2, never blocks. Promotion to Default-FAIL is a Wave-2 decision read from that log. Wired into gate-spec Step 2 + the COMMIT LEDGER row gained `evidence`/`docs-budget` cells.
3. **0.5b docs-budget check** — `gabe-commit/scripts/docs-budget.sh`: WARNs on staged NEW `.md` outside allowed homes (`.kdbp/**`, files registered in DOCS.md) and on any new dated-name md (dated-throwaway smell; `.kdbp/archive/` exempt). Exit 2, never blocks.
4. **1.3d fresh-context evaluator** — review-spec runtime-evidence section: visual/journey proof is graded by ONE read-only Explore agent (acceptance criteria + proof folder in, PASS/NEEDS_WORK out; NEEDS_WORK converts to a HIGH finding). The executing session never grades its own screenshots.
5. **gabe-next `scripts/next.mjs`** — the planned post-A2 hardening: zero-token node router over PLAN.json (decision table, project_type-aware Exec dispatch, prior-row debt sweep, settled-row advance chain; read-only — the caller performs the printed advance in PLAN.md + mirror). Prose PLAN.md routing kept as the exit-2 fallback. plan-spec schema gained optional `project_type` (readers default `code` — no rewrite of existing mirrors needed).
6. **0.3 NEXT-pointer routing contract** — (a) each lifecycle core ends with ONE deterministic `NEXT:` line (no free-floating suggestions, honoring the operator's no-proactive-offers rule); (b) `stop-session-reminder.sh` rewritten to the 0.3b contract: fires only on tracked-dirty AND no-commit-this-session (transcript grep; 30-minute HEAD-age fallback when no transcript), prints `next: /gabe-commit` once — the old unconditional multi-line reminder is gone.
7. **target.html** — A2 row: gustify ✅ DONE (evidence link) · gastify DEFERRED (operator directive); page manifest status updated. (Stays uncommitted with the investigations folder, as before.)

## Verification (all run this session, fixture at scratchpad/w1-fixture)

| Check | Result |
|---|---|
| next.mjs matrix | 6 cases green: advance-over-settled → resume 🔄; all-settled → `/gabe-plan complete`; prior-debt warning; hybrid mockup dispatch; missing PLAN.json → exit 2 fallback; **found+fixed during testing:** a ⏸/⚰️ Exec now parks the whole phase (never routes review of never-executed work) and parked rows owe no sweep debt |
| next.mjs realistic | read-only run on gustify's real 29-phase PLAN.json → resume H6 Exec + honest debt sweep (13 in-progress, U-rows' pending reviews) — matches ground truth |
| evidence-freshness | 5 cases green: stale → WARN exit 2 + bypass-log line; fresh → ✓ exit 0; proof null → silent 0; no proof_root → info skip; bookkeeping-only staged → 0 |
| docs-budget | 5 cases green: outside-homes WARN; dated-name WARN; DOCS.md-registered pass; `.kdbp/` pass; no-new-md 0 |
| Stop hook | 4 cases green: clean → silent; dirty+old-HEAD → prints once; dirty+transcript-with-commit → silent; dirty+transcript-without → prints |
| Frontmatter/line caps | 25/25 PROBLEMS: NONE |
| Install + drift | `./install.sh` 25/25; `suite-doctor` **CLEAN** |

## Wave-1 status after this pass

- 1.1 manifest ✅ (A2) · 1.2 lift SOP + dispatch ✅ (B2) · 1.4 de-dup ✅ (B2) · **1.3 ✅ suite-side complete** — (a) proof field (A2), (b) living-set convention stated (per-project adoption rides each freeze window), (c) freshness WARN-and-LOG shipped, (d) evaluator shipped, (e) capture contract stated (pagecast evaluation deferred to project windows).
- Wave-0 closeout: 0.1 ✅ · 0.3 ✅ (this pass) · 0.5a ✅ · 0.5b ✅ suite-side (per-project doc hubs ride the freeze windows) · 0.5c ✅ (B2/A2). Remaining Wave-0: **0.2 (gastify layer) + 0.4 twin-project hygiene — both deferred to the freeze windows by the operator directive.**
- What remains before Wave 2: only per-project application (the freeze-window protocol in the A2 log) + Wave-2 re-measure after ~6 weeks of the new structure running.
