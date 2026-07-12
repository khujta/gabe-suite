# Testing Command Center — options report

- **Date:** 2026-07-10 · **Mode:** ANALYZE + OPTIONS ONLY (no build until the operator decides)
- **Human-facing rendering:** `01-options-report.html` (same folder — open it in a browser; this md is the agent-facing record)
- **Receipts:** `../threads/T1-oss-test-dashboards.md` · `T2-board-options.md` · `T3-data-shapes.md` · `T4-disclosure-patterns.md` · `SKEPTIC-review.md`
- **Verification style:** E2 — every external claim was checked with `gh` CLI / live fetches on 2026-07-10, not marketing pages. The recommendation survived a dedicated adversarial pass (verdict: UPHOLD-WITH-MODS; all 8 mods incorporated below).

---

## TL;DR — the one recommendation

**Compose, don't adopt: one static per-project command-center subtree inside gustify's `docs/site/`, regenerated at checkpoints, rendering ONLY machine-derived data — a hub page (L0), a KDBP-native board page (Family A, zero sync-drift), and testing pages that link OUT to OSS static leaf reports (coverage HTML, Playwright/monocart, trace viewer) instead of rebuilding them.** No off-the-shelf tool can do this job — that's a verified finding, not a preference: no adopted OSS aggregates pytest+vitest+Playwright into one static drill-down site, nothing reads PLAN.json, and every tracker/SaaS board forks the file-layer truth. The one genuine adoption opportunity is at the *leaf* level, where OSS is excellent and free.

Four operator decisions gate the spike (D1–D4 below); the biggest is the **coverage waiver** — gustify produces zero coverage today and enabling it properly touches app-dir config files.

---

## 1. What the research established (findings with receipts)

| # | Finding | Receipt |
|---|---|---|
| F1 | **No well-adopted OSS aggregates pytest+vitest+Playwright into one static drill-down site.** Allure (single-file) is the only multi-framework renderer with official adapters; its single-file mode collapses deep links, history wiring is manual/fragile, and it needs a Java/Node CLI. CTRF is a schema with uneven adapters (Playwright official; vitest/pytest community-grade, ≤4★). | T1 §1, §7, §9 |
| F2 | **The static leaf building blocks are excellent:** Vitest `singleFile` HTML, monocart-reporter (single-file Playwright + merged coverage, 314★, 5 open issues), coverage.py `htmlcov/` with **stable per-line anchors** (`file.py.html#t123`), istanbul HTML with per-file URLs. ReportPortal (6 GB RAM multi-container) and all SaaS are disqualified by the static/no-infra constraint. | T1 §2–5, §8–9 |
| F3 | **gustify already runs a proto-command-center for E2E** — `build_e2e_docs.py` + `build_journey_docs.py` render grouped status tables, run-status chips flipped client-side, screenshot carousels that live-probe gitignored artifacts (placeholder fallback → evidence refreshes with **no rebuild**), Mermaid coverage maps, and a drift-WARN reconcile pass, all in the Cifra shell. **Caveat (skeptic):** the family is 16 days old with 2 integrity defects already — the docs grouping duplicates `journey-groups.json` by hand (live silent-drift case) and `e2e.html:581` violates the vendored-mermaid convention. Adopt the *pattern*, not a "proven" claim. | T3 §11, T4 Part 2, SKEPTIC §1a |
| F4 | **Coverage does not exist in gustify.** No pytest-cov, no `@vitest/coverage-v8`, no config, nothing. 283 pytest files + 45 vitest files currently report to *nowhere* durable (pytest/vitest results land in no file; only Playwright has the custom run-status reporter). | T3 §9, SKEPTIC §1b–1c |
| F5 | **The KDBP layer is machine-readable but link-poor.** PLAN.json `proof` is free prose (no file/test-id), no per-cell timestamps, no phase↔PENDING↔LEDGER back-links; PENDING `Status` and LEDGER `Gates` are free text. "Everything deep-linked" at the KDBP layer requires suite-side schema enrichment — Wave-2 work, out of scope this phase. | T3 gap table, SKEPTIC §1d |
| F6 | **Boards: only Family A has zero sync-drift.** Nothing off-the-shelf reads PLAN.json (pattern precedented 3× but unmaintained; Backlog.md proves the architecture at 6k★ but owns its format). Family B strongest: Kanboard (verified 1-container SQLite, MIT, board positions scriptable). Family C strongest: GitHub Projects v2 (free, `gh` CLI verified **live** incl. custom fields + JSON dump; needs one-time `gh auth refresh -s project,read:project`). Focalboard is unmaintained per its own README; Plane is a ~12-container AGPL open-core stack. | T2 all |
| F7 | **Every history/trend feature reduces to one static-compatible mechanism:** a carried-forward history file baked into the next build (Allure's `history.jsonl` proves it). Deep-link stability across regenerations is a naming discipline: IDs derived from names survive; IDs derived from run data don't. | T4 cross-cutting |
| F8 | **Two brief premises corrected:** (a) the "C1–C9 docsite convention" cited in the brief does not exist anywhere in the suite — it's a planned concept from the 2026-07-07 investigation, never landed; (b) `run-status.json` merge-updates across runs, so any rollup built on it silently mixes runs of different code versions unless per-source `ranAt` is displayed. | T3 §12, SKEPTIC §1e |

---

## 2. Options — the testing half

### O1 — Wrap-OSS hub (thin index over per-framework static reports)
Generate Vitest singleFile HTML + monocart/Playwright HTML + coverage HTML at checkpoints into fixed subfolders; hand-roll only an index page linking them.
- **For:** smallest owned surface; leaf tools maintained by others forever; genuinely static.
- **Against:** no unified altitude — four alien UIs, no cross-cutting rollup, no KDBP layer, no journey/proof/capture rendering (gustify's differentiators); the operator still has to context-switch to answer "how did testing go?"
- **Constraint fit:** static ✓ · deep-linked ~ (SPA leaf links weak) · KDBP layer ✗ · OSS-first ✓✓

### O2 — Allure-as-core (one aggregated report + custom KDBP add-on)
All three frameworks feed `allure-results/`; `allure generate --single-file` is the command center's testing surface; KDBP hub/board still custom.
- **For:** the only official multi-framework drill-down; history/trends included; three adapters actively maintained (all pushed 2026-07-10).
- **Against (skeptic-tested):** cannot see the KDBP layer, journey groups, proof manifests, or capture MP4s — the layers that motivated the project; single-file collapses deep links to one URL; history carry-forward is documented-fragile; replaces the working e2e pages with a worse-integrated viewer; still needs the custom hub+board anyway, so it *adds* a dependency without removing the custom work.
- **Constraint fit:** static ✓ (single-file) · deep-linked ✗ at leaf · KDBP layer ✗ · OSS-first ✓

### O3 — Composed static center (RECOMMENDED, as modified by the skeptic)
Adopt the *pattern* F3 proves (static regen at checkpoints, live-probe artifacts, placeholder fallback, Cifra shell) in a **namespaced subtree** of `docs/site/`, under a **binding anti-curation guardrail**: pages render only machine-derived data — `journey-groups.json` (becoming the single grouping source, which fixes the live drift bug), `PLAN.json`, `PENDING.md`, `LEDGER.md`, JUnit XML from pytest/vitest (`--junitxml` is built into both — zero new dependencies), coverage JSON if waived in, `run-status.json` + proof manifests. Leaf drill-down links OUT to OSS reports (F2) instead of rebuilding them. History via one carried-forward JSONL (custody = D3). IDs derived from names.
- **For:** the only option that renders all four altitudes (project → phase/board → suite/journey → test/artifact) under the locked constraints; reuses what exists; owns only the thin composition layer; leaf quality delegated to healthy OSS.
- **Against (priced honestly):** owned code for a solo operator — the existing generator estate is already 6,179 lines across four divergent generators, and the pattern demonstrated ~2 integrity defects per fortnight without a guardrail; the spike is **throwaway-priced** (promotion to a suite skill ≈ rewrite, because generalizing the curation layer is unsolved); KDBP deep links stay shallow until Wave-2 schema enrichment (F5).
- **Constraint fit:** static ✓✓ · deep-linked ✓ testing half / ~ KDBP half (Wave-2) · KDBP layer ✓ · OSS-first ✓ at leaf, build-the-glue elsewhere — which is what constraint 5's "build only the glue that doesn't exist" literally says.

**Fit matrix (testing half)**

| Constraint | O1 wrap-OSS | O2 Allure-core | O3 composed |
|---|---|---|---|
| 1 Everything deep-linked | 2/5 | 1/5 | 4/5 (testing) · 2/5 (KDBP until Wave-2) |
| 3 Static, regenerated | 5/5 | 4/5 | 5/5 |
| 4 Local now / deployable later | 5/5 | 4/5 | 5/5 |
| 5 Prefer OSS / build only glue | 5/5 | 4/5 | 4/5 |
| KDBP altitude (the motivating layer) | 0/5 | 0/5 | 4/5 |
| Progressive disclosure (L0→artifact) | 1/5 | 3/5 | 5/5 |
| Owned-code burden (5 = least) | 5/5 | 4/5 | 2/5 ← the price |

### 3. Options — the board half

| Option | Sync-drift | Standing infra | Drag-drop | Verdict |
|---|---|---|---|---|
| **A: KDBP-native static render** (RECOMMENDED) | **none — the board IS the files** | none | no (by design: gabe lifecycle commands are the write path for cells) | The only option honoring the source-of-truth constraint. Read-only is honest for phase cells; it is *thin* for PENDING triage/re-ordering — hence the escape hatch below. |
| **C: GitHub Projects v2 one-way mirror** (named escape hatch, not buried runner-up) | low-moderate: mirror is disposable/regenerable via `gh`; UI edits fork until re-push | none (SaaS, free, same vendor as the repos) | yes | Pre-priced fallback **if, after two weeks of real use, the operator finds himself still hand-editing PENDING.md to reprioritize** — that outcome would mean Family A failed the human. One-time `gh auth refresh -s project,read:project`. |
| B: Kanboard | high (DB forks truth) but cheapest-to-regenerate in family B | 1 container, SQLite | yes | Strongest self-hosted tracker (MIT, decade-stable, `moveTaskPosition` scriptable) — but any Family B pick adds a standing-ish service and a second truth for marginal gain over A+C. |
| B: Gitea/Forgejo, Plane, Taiga, WeKan, Focalboard | high | 1–12 containers | yes | Ruled out: Gitea boards have **no API** (open since 2021); Plane ~12 containers; Focalboard unmaintained; WeKan API incomplete; Taiga heavy/slow. |
| C: Jira / Trello / Linear | moderate | SaaS | yes | Jira: idle-site deactivation risk; Trello: worst export/lock-in (US-only, lossy); Linear: 250-issue hard cap. All add a vendor for less than GH Projects gives. |

---

## 4. The recommendation, in full (post-adversarial)

One static site subtree, e.g. `docs/site/center/` (final naming = operator's D4), regenerated by the checkpoint hooks that already exist (test runs / gabe-commit / CI):

```
L0  hub          — phase-board summary, test totals (per-source ranAt shown — mixed-run honesty),
                   coverage tile (graceful "not enabled" state until D1), latest LEDGER rows,
                   open-PENDING counts; every tile links down
L1  board        — PLAN.json phases × exec/review/commit/push cells as lanes; PENDING rows as
                   tickets grouped by priority/status; read-only; links to specs/proof where the
                   prose already names them
L1  testing      — journey groups (from journey-groups.json, THE single source), pytest/vitest
                   suites (from --junitxml), status grids, run history sparklines (from the
                   carried-forward JSONL)
L2  spec/feature — per-journey pages (exist today), proof galleries from manifest.json, capture MP4s
L3  leaf (OSS)   — coverage.py htmlcov #tNNN line anchors · istanbul per-file pages ·
                   Playwright report/trace viewer or monocart single-file — linked, never rebuilt
```

**Binding spike rules (from the adversarial pass):** (1) machine-derived data only — zero new hand-curated editorial tables; (2) `journey-groups.json` becomes the single grouping source (fixes the live drift bug as an acceptance criterion); (3) IDs derived from names; (4) vendored mermaid only (fixes the e2e.html:581 divergence when that page is next touched); (5) throwaway-priced — cap the investment, promotion to a suite skill is a Wave-2 rewrite decision at n=2 (gastify).

**Why not the alternatives, in one line each:** O1 never answers "how did testing go?" in one place; O2 adds a dependency without removing the custom work and is blind to every layer that motivated the project; B/C boards fork the truth the suite spent KDBP-lite un-forking.

---

## 5. Decision points for the operator

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | **Coverage waiver** — enabling pytest-cov + @vitest/coverage-v8 properly edits `apps/api/pyproject.toml` + `apps/web/vitest.config.ts` (read-only app dirs). Spike can dodge it (`uv run --with pytest-cov`, `npm i --no-save`) but production needs the waiver. | (a) waive for coverage config only; (b) spike-only hack now, waive later; (c) no coverage tile | (a) — narrow, named waiver |
| D2 | **Board interaction** — accept read-only Family A, with the GH Projects v2 escape hatch pre-priced? | (a) Family A only; (b) A + GH mirror from day one; (c) GH mirror as the board | (a), revisit after 2 weeks of real use |
| D3 | **History JSONL custody** — committed (grows at every checkpoint; needs a docs-budget-gate exemption) vs gitignored (per-machine, CI/local diverge). | committed / gitignored | committed, capped last-N runs |
| D4 | **Host** — namespaced subtree inside gustify `docs/site/` vs sibling site. Physically proven inside (e2e.html); subtree keeps regen blast radius separable either way. | inside / sibling | inside, own prefix |
| D5 | **Playwright JSON reporter** — add `['json']` alongside the custom reporter (test-config file = writable surface) to get durations/retries/attachment paths the custom reporter lacks. | yes / later | yes, in the spike |
| D6 | *(Wave-2, flag now)* KDBP schema enrichment for real deep links: structured `proof` (spec path + artifact dir), per-cell timestamps, phase↔PENDING↔LEDGER back-links. Suite-side change — the gabe commands write these files. | — | schedule in Wave-2 |
| D7 | *(Wave-2, flag now)* Promote the generator to a suite skill at n=2 (gastify) — priced as a rewrite, not a port. | — | decide at gastify window |
| D8 | **Intake for new conference-derived requirements** — this report's §2/§3 option framing and §5 table are the slots; new requirements land as new D-rows + a fit-matrix column, not a new report. | — | — |

## 6. Failure conditions (named, so they're checkable later)

1. Two weeks in, the operator still hand-edits PENDING.md to reprioritize → Family A failed; trigger D2(b/c).
2. Any new page grows a `FEATURES`-style hand-curated module → guardrail breached; stop and reassess against O2.
3. Coverage waiver declined → hub ships without its centerpiece metric; the "different dimensions" premise shrinks — acceptable but must be chosen, not defaulted.
4. KDBP schema never enriched (D6 never happens) → "everything deep-linked" stays false at the motivating layer; the board remains a prettier PLAN.json cat.
5. gastify's window opens before the spike finishes → build generic-first instead (placement 2), don't write gustify-only code twice.

## 7. Receipts

Raw thread reports with commands/URLs and what they showed: [T1 OSS dashboards](../threads/T1-oss-test-dashboards.md) · [T2 boards](../threads/T2-board-options.md) · [T3 data shapes](../threads/T3-data-shapes.md) · [T4 disclosure patterns](../threads/T4-disclosure-patterns.md) · [skeptic review](../threads/SKEPTIC-review.md). Spike details: [02-spike-plan.md](02-spike-plan.md).
