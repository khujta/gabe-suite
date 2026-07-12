# Deliverable 4 — Evidence Doctrine, Operationalized (Thread 3)

- **Produced:** 2026-07-08, Fable 5 analysis run. Design only.
- **Locked intent (§2A):** proof scoped by importance; proof form per change type; ONE living set per feature (never dated throwaways); evidence doubles as docs/demos.
- **Prior art built on:** `anthropics/cwc-long-running-agents` (track-read → verify-gate Default-FAIL chain, fresh-context evaluator, commit-on-stop) — adopted as *shape*, with the skeptic-identified fixes below.
- **What already exists (don't rebuild):** `gabe-execute` Step 1.6 already classifies `runtime_journey_required` / `staging_proof_required` and mandates an evidence task with LEDGER artifact paths; gustify has the 3-viewport recorded layout suite + `WEB-LAYOUT-POLICY.md`; gastify commits `tests/web-e2e/proof/` (248 screenshots, feature-named) and logs verification per deploy in `DEPLOYMENTS.md` (105 rows). The Doctrine is 60 % built; this spec completes and unifies it.

## 1. The importance filter (what earns proof)

Skeptic-verified principle: **importance is declared once, at plan time, by the human — never judged at gate time by the executing AI** (a gate-time classifier is incentivized to classify down).

- `/gabe-plan` already runs a per-phase tier decision; add one machine-readable field per phase row/YAML: `proof: none | test | visual | journey` (default derived from the existing `types` list — user-facing/runtime types ⇒ `visual`/`journey` — human confirms at plan time, same moment as the tier call).
- Ad-hoc work without a plan phase inherits `proof: test` when it touches code the manifest marks critical (backend data paths, auth), else `none`. One manifest line, not a taxonomy.
- Everything else is explicitly **not** proof-gated. This is the operator's answer to tension #5: enforcement scales with importance.

## 2. Change-type → proof-form map

| Change type | Proof artifact | Produced by (project manifest names the tool) |
|---|---|---|
| Backend behavior | failing-then-passing test (V3's tests-required gate: fails on base, passes on fix) + the run output line | pytest / project runner |
| Frontend visual | **side-by-side**: canonical reference (story/design-lab) vs live render, per manifest breakpoints | Playwright screenshot pair; the lift SOP's L4 gate (Deliverable 3) |
| End-to-end feature | recorded flow — screenshots numbered per step, ideally GIF/MP4 — plus the journey test that exercised it | Playwright video → ffmpeg (zero-dep baseline); **pagecast** as the polished candidate (headless, WSL-safe, GIF/MP4 with cursor/zoom) — a per-project `capture:` manifest field, NOT a suite dependency |
| Schema/migration | migration up+down run output + row-count/shape check | alembic + psql, per manifest |
| Deploy/promotion | deployed-bundle-hash-changed check + smoke journey on the deployed URL (both already prose in gabe-execute/refine — make them the recorded convention) | gh + curl + Playwright |

## 3. The living test set (accumulation convention)

Adopt the **gastify shape, reduced per the skeptic** — one evidence home per feature, curated, committed:

```
tests/web-e2e/
  <feature>.spec.ts              # ONE spec per feature, augmented in place (already gustify's convention)
  proof/<feature>/               # ONE evidence folder per feature (no dates in names)
    manifest.json                # ALWAYS committed: run status, artifact index, hashes, timestamps
    01-<step>.png … NN-<step>.png  # the CURATED proof subset — the handful the docs embed,
                                   # replaced in place when the feature changes
```

- **Text manifests are always committed** — this alone would have prevented the real gustify loss (a background cleanup deleted the gitignored run-status manifest and every doc page reverted to "not run"; session `6490478c`).
- **Screenshots: curated, importance-scoped subset committed; full run output stays gitignored and pruned.** No `git add -f`: add an explicit `.gitignore` un-ignore carve-out (`!tests/web-e2e/proof/**`) so the intent is visible in the repo. gastify *reduces* toward the curated form (248 → the set docs actually reference); gustify *adopts* it (today: everything gitignored).
- **Dated folders are terminated** as a convention. Existing dated dirs (`tests/mobile/results/archive/2026052*`, `proof/2026-07-05-docsite/`) are grandfathered as archives, not templates.
- Superseded-artifact history lives in git history (the file was replaced in place) — reviewers diff manifests, not PNGs.

## 4. Enforcement (the hook arm) — staged, skeptic-corrected

The cwc Default-FAIL chain is adopted with three corrections: **(a)** the invariant is *freshness*, not access — evidence artifact `mtime` must be newer than the newest staged source change, not merely "opened this session"; **(b)** classification comes from the plan-time `proof:` field (§1), read deterministically; **(c)** artifact path globs come from the per-project manifest, not hardcoded.

Rollout in two stages:

1. **WARN-and-LOG (2–4 weeks).** A `gabe-commit`-time deterministic check (script, not model): phase/commit claims `proof: visual|journey` → verify a fresh artifact exists under the manifest's proof glob; if not, print a visible warning and append to a bypass log. Also: PLAN-cell-flip warning (a ✅ written to an Exec/Review cell for a proof-carrying phase without fresh evidence → warn). No blocking yet — this measures the real bypass rate instead of pretending PreToolUse is airtight (Bash writes bypass it; cwc documents this).
2. **Promote to Default-FAIL blocking** only where the log shows warnings being ignored — and only on the **gabe-commit chokepoint** (60× measured, the one gate the operator actually runs), not on the rarely-exercised PLAN-flip path.

**Non-negotiable meta-rule (from the drift finding):** the hook scripts + settings land in the **suite repo + install.sh in the same change** — never as another in-place `~/.claude` patch. Note explicitly that Codex/`~/.agents` gets no hook enforcement (Claude Code hooks only); the deterministic gabe-commit *script* check works in both hosts and is therefore the primary layer.

## 5. Fresh-context evaluation (the second cwc primitive)

For `proof: visual|journey` phases, the verifier of the evidence should not be its author: a read-only evaluator agent (no Write/Edit) receives the acceptance criteria + the proof folder and returns PASS/NEEDS_WORK — "plausibility is not correctness; a reasonable diff plus a broken screenshot is NEEDS_WORK." This directly targets the top incident cluster (P1, ~32 incidents: self-graded fidelity). Cheap to pilot: it is one agent definition + a paragraph in gabe-review/gabe-commit; the operator already runs adversarial review workflows by hand (97 gustify workflow scripts include `*-adversarial-verify-*`).

## 6. Evidence → docs/demos (dual purpose)

- The proof folder **is** the docs asset source: doc pages and the docsite embed `proof/<feature>/NN-*.png` and the flow GIF directly (gustify's journey doc pages already read `run-status.json` — keep that wiring, feed it from the committed manifest).
- A feature's demo GIF = the journey capture, re-rendered by the manifest's capture tool. No separate "make a demo" workflow; demos regenerate whenever the living set is refreshed. This satisfies the Doctrine's dual-purpose clause with zero extra pipeline — the living-docs principle from the documentation scan (docs generated/verified from evidence + code, not hand-maintained).

## 7. Manifest fields this deliverable adds (merged with Deliverable 3's block)

```yaml
proof_root: tests/web-e2e/proof        # gastify: same; the un-ignored carve-out path
journey_specs: tests/web-e2e           # one spec per feature, augment in place
capture: {tool: playwright+ffmpeg, alt: pagecast, breakpoints: [mobile, tablet, desktop]}
critical_paths: [apps/api/**, alembic/**]   # ad-hoc work touching these inherits proof: test
staging: {branch: staging, url: <deployed>}  # already in PUSH.md — referenced, not duplicated
```
