# Twin kickoffs — after the 2026-07-22/23 alignment-review propagation

Paste-able session openers for each twin, written at the close of the review →
plan → implement → propagate arc (suite `a77cb41..8b272f5`; gastify `8090514`;
gustify `9abb629d`). Each block is self-contained — paste it as the first
message of a fresh session in that project.

---

## Gustify (paste in `~/projects/apps/gustify`)

```
Resume gustify after the gabe-suite alignment-review propagation (2026-07-23).

State: branch `staging`, clean tree, commit 9abb629d on top of the earlier
unpushed staging set — NOTHING on staging is pushed yet. The propagation
landed: the config-driven refresh driver (the old one never ran the gates
after captures — that bug was live here), the center's first working shell-JS
harness (verify_center_chrome.mjs — 183/183), mermaid vendored at
docs/site/assets/ (center builds no longer need the network), and the
flow-coverage layer: allergen's card now carries 5 keyed flows (★ on
`exclude`) and all 12 proof manifests carry role:/flows:.

The honest numbers to know: allergen 1/5 flows proven (only `declare`,
explicit); the GOLDEN `exclude` flow — the always-on allergen SQL WHERE, the
entity's whole promise — has NO e2e proof set (integration fixtures only).
The center renders "GOLDEN PATH — no proof" for it, loudly.

Next moves, in order of value:
1. /gabe-next — route from PLAN state (the plan was COMPLETE pre-propagation;
   the /gabe-adopt clean-slate program is the ruled next arc: entity baseline
   + flows; Flow3 bought→cookable-notification is NOT BUILT and was ruled the
   first born-red candidate).
2. The `exclude ★` golden gap is the second born-red candidate: an e2e spec
   walking browse-with-allergens-declared end to end, then /gabe-feature
   curate to land its proof set (manifest gets role: principal,
   flows: [exclude]).
3. Push call on the staging set (yours): /gabe-push when ready.
4. A human walk of the regenerated center (/gabe-walk) would refresh the
   manual angle — the pages changed shape (architecture station, coverage
   toplines, Decisions column).
Verify-first: `bash scripts/refresh_center.sh regen` must stay exit 0 /
0 warnings; `node scripts/verify_center_chrome.mjs docs/site/center` 183/183.
```

---

## Gastify (paste in `~/projects/apps/gastify`)

```
Resume gastify after the gabe-suite alignment-review propagation (2026-07-23).

State: branch `center/loop2-post-trial-contract`, clean tree, commit 8090514 —
not merged, not pushed. The propagation landed: the suite's config-driven
refresh driver (your center.config.json `commands` block now actually drives
captures — the old script hardcoded them and silently died before the gates),
the rewritten chrome harness (207/207; the old rowtog one matched nothing),
scan-receipt's card FLOWS in the keyed grammar (8 flows, ★ on `scan`), all 15
proof manifests classified (role:/flows:), the batch-ops manifest authored,
and the 3 loose single-file proof sets declared to their true entities.

The honest numbers to know: transaction coverage moved 6/9 → 4/9 COVERED —
down on purpose: `direct` and `delete` were inference false-positives (one
matched the literal text "no delete"); 4/9 is 100% explicit. Golden 3/4 —
`open ★`'s only shots live inside tx1, a REFERENCE set, which never covers.
scan-receipt: 0/8 proven, its real denominator on record for the first time.

Next moves, in order of value:
1. Merge/push call on the center branch (yours): /gabe-push when ready.
2. scan-receipt's card lacks its `reviewed:` stamp — the one remaining gate
   warn. Review the card against its rendered page, stamp it (/gabe-feature
   closes the loop).
3. The `open ★` golden gap: capture a live open-transaction journey (tx1 is
   fidelity-only), /gabe-feature curate → manifest role: principal,
   flows: [open]. Same pattern next for direct/flag/lock/delete.
4. Older operator debts if still open: TX2b full-tier stamp, TX3
   parked-or-backfill call.
Verify-first: `bash scripts/refresh_center.sh regen` exit 0 (one expected
warn: the scan-receipt reviewed-stamp); chrome harness 207/207;
`python3 scripts/next_feature.py` for the backfill queue.
```
