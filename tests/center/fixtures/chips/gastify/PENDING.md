# Deferred Items

| # | Date | Source | Finding | File | Scale | Priority | Impact | Times Deferred | Status |
|---|------|--------|---------|------|-------|----------|--------|----------------|--------|
| P61 | 2026-06-04 | Phase 5 client review | Deferred client-review findings after the hardening pass | `web/src/hooks/useScope.ts` | mvp | low | low | 0 | resolved | 2026-06-04 (2c035f2 — scope-isolation tests landed) |
| P87 | 2026-06-12 | user decision D96 | **Implement the D96 tier/quota system**: users.tier (free|premium), monthly quota counters | `backend/app/services/billing.py` | mvp | medium | medium | 0 | open |
| P97 | 2026-06-26 | gabe-review W7 | **ECharts bundle tree-shake** — register only the used parts via `echarts/charts|renderers|components` | `web/src/components/charts/SankeyChart.tsx` | scale | low | low | 0 | resolved | 2026-07-10 the lazy chunk trimmed |
| P109 | 2026-06-30 | P108 v3 audit | **Discount/promo mis-assignment** across the fresh receipts | `backend/app/prompts/v3.py` | mvp | high | high | 2 | deferred | resolved 2026-09-23 · was: deferred |
<!-- P109 resolved 2026-09-23 (backlog sweep, fixed in 828938bb) -->
| P151 | 2026-07-14 | ci sweep | a flaky e2e spec | `web/e2e/scan.spec.ts` | mvp | low | low | 0 | resolved | run 33976594085 green |
| P160 | 2026-07-20 | gabe-review | **Split the `parse|render` step** of the receipt flow | `backend/app/services/receipts.py` | mvp | low | low |  | resolved |
| P175 | 2026-08-07 | gabe-commit (CS3 red checkpoint) | [size-budget] a test file crossed the 800-line cap | `backend/tests/test_transactions.py` | mvp | medium | low | 1 | open | @3f68fc57 2026-08-07 |
| P176 | 2026-08-07 | gabe-review (CS3 phase 46) | [invariant-gap] group-share copies are born card_alias_id NULL | `backend/app/services/transactions.py` | mvp | medium | low | 0 | resolved | @e1c5558f 2026-08-07 |
| P217 | 2026-09-22 | gabe-commit CHECK 6 | [data-integrity] a cell like `a \| b` keeps its pipe only escaped | `.kdbp/PENDING.md` | mvp | medium | medium | 0 | open |
