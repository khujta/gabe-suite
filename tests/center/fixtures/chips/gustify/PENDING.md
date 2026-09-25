# Deferred Items

<!-- tests/center chips fixture, gustify-shaped: a gate index table above an 11-column table with Verified and
     bare numeric ids; resolved rows are MOVED to archive/PENDING-resolved_*.md (the archive holds #112). -->

| # | Gate | Finding |
|---|------|---------|
| #130 | founder | a founder-gated call |

## Rows

| # | Date | Source | Finding | File | Scale | Priority | Impact | Times Deferred | Status | Verified |
|---|------|--------|---------|------|-------|----------|--------|----------------|--------|---|
| 101 | 2026-07-18 | gabe-review (P2) | [dup] cx and slugify defined twice | `apps/web/src/lib/cx.ts` | mvp | low | low | 0 | RESOLVED @ 19f1e220 2026-07-23 — cx moved to design-system · prior: STILL-REAL @ e37dccc5 | e37dccc5 2026-07-21 |
| 130 | 2026-07-20 | gabe-review (P1) | [gap] a founder-gated call | `apps/api/api/auth.py` | mvp | medium | medium | 1 | STILL-REAL @ e37dccc5 — waits on the founder | e37dccc5 2026-07-21 |
| 140 | 2026-07-22 | gabe-commit | [size] one file past the budget | `apps/api/services/recipes.py` | mvp | low | low | 0 | RESOLVED @ 569cd07 2026-07-25 — split along its seams | 569cd070 2026-07-25 |
| 150 | 2026-07-24 | gabe-health | [churn] archmap keys reorder | `docs/site/center/archmap.json` | mvp | low | low | 0 | resolved @14543567 — stable key order | 2026-08-05 |
| 151 | 2026-07-24 | gabe-review | [render] the REVIEWED heading is lost | `scripts/_a3_feature.py` | mvp | low | low | 0 | CLOSED — gh run view 29794005974 (staging push, success) | 2026-07-21 |
| 160 | 2026-07-26 | gabe-review | [perf] the `a|b` lookup scans twice | `apps/api/services/lookup.py` | mvp | low | low | 1 | RESOLVED @ a1b2c3d4 2026-07-30 — one pass | 5e6f7a8b 2026-07-31 |
