# Testing Command Center — spike plan v3 (CC2, the depth pass)

- **Date:** 2026-07-11 · **Status:** PROPOSED, post-skeptic (UPHOLD-WITH-MODS, all 6 mandatory mods applied — `../threads/SKEPTIC-depth-pass.md`) — awaits operator approval of D11–D16 (see `06-depth-gap-analysis.md` §4) and of this plan.
- **Builds on:** CC1 (done, reviewed-APPROVE at `1a1f943e`) + `07-site-architecture.md` (the IA this plan implements). Skin J unchanged. v2 (`02-spike-plan.md`) remains the record of what CC1 was.
- **Executor (CHANGED, operator ruling 2026-07-11):** the SUITE session may now write gustify directly to reach an acceptable state — same writable surface as CC1 (`docs/site/`, `scripts/`, `tests/`, test configs, `.kdbp` bookkeeping), **app code still untouched**. The two-session COMMS convention stays for anything the gustify session should know.
- **Locked constraints (unchanged):** static, regenerated, `file://` · NO new GitHub-Actions steps · anti-curation guardrail with the D13 amendment (the ONE overlay file may MAP sources→features/cells, never assert results) · IDs derive from names · skin J final · leaf reports linked, never rebuilt.
- **Lifecycle:** open phase **CC2** via `/gabe-plan` in gustify (tier `mvp`, types `["tooling","docs"]`), proof: `"center: crawl gate green (0 dead hrefs, 0 unlinked entities, hub reaches all pages ≤3 clicks); task 'was H8 tested + demo material' completes in ≤4 clicks headless"`.

## Steps (order matters; each independently verifiable)

| # | Step | Writes | Proves |
|---|---|---|---|
| B0 | **Cheap CRITICAL fixes + bridges** (ship value before the big lift): link `leaf/web-coverage/` from the hub coverage tile; fix 2 dead anchors + the duplicated `id="ticket-77"`; add DOCS↔CENTER bridge nav (one item each way; docs-side = one line in its generator/shell); reword the hub's "DRILL in the nav" signpost. | `scripts/`, `docs/site/` | The two myopic CRITICALs die same-day; the islands are bridged |
| B1 | **Feature registry (D13):** `features[]` block in `center.config.json`, bootstrapped with the newest features — H7, H8, the prod-readiness edge batch (resolve its phase/LEDGER row from the repo during execution), CC1. Generator validates referentially, fails LOUD (CC1 review convention); each phase page RENDERS its resolved match list (over-claiming globs visible on-page, e.g. a naive `*cook*` would catch ~91 unrelated tests); unmapped phases render "not yet mapped — registry covers N of 32", never 'untested'-sounding words. | `docs/site/center/center.config.json`, `scripts/` | "Was feature X tested?" gets a machine-readable, self-auditing answer |
| B2 | **Doors everywhere (D15):** all 7 missing drill entries in `drills[]` (every populated grid cell a door); stat tiles → pages; pyramid/recency/history rows → their sections/pages; board phase cards → phase pages; ticket anchors; tests.html group cards → group pages stamped "serves: H7 H8 …" (the phase↔station key, both directions); spec lines → spec pages; "…N more" truncations → the suite full-list pages. | `scripts/`, config | "Almost nothing else is clickable" inverts |
| B3 | **The L2 page sets:** `phase/<id>.html` ×32 (story, cells, tested-by + match list + mapped-test pass rate — THE per-feature percentage, honestly labeled; per-feature code coverage explicitly not claimed) · `group/<g>.html` ×8 · `spec/<s>.html` ×21 (steps + live-probe shots) · `suite-api.html` + `suite-web.html` ×2 (full listings, one anchored section per test file — per-file PAGES deliberately not built; skeptic: junit is a gitignored local input, 130 committed pages would churn per run and fragment Ctrl-F). New module `scripts/_center_pages.py` (size-budget: every file ≤800 lines). | `scripts/`, `docs/site/center/` | The "series of pages" exists, generated, not listed |
| B4 | **Evidence layer (D14):** gallery component w/ lightbox + manifest-leg captions; proof/cook-state's 13 shots rendered on H7/H8; **stable capture names first** — `run-journeys.sh --capture` gains a copy-to-`capture/<group>/latest.mp4`(+`.webm`) step (tests surface, writable; hash-named files would break every embed on re-capture) — then live-probe `<video>` embeds (spec/phase/drill); evidence-coverage footer line ("galleries for N of M cells; capture for K specs"); orphan artifact dirs (~9 dirs/~43 shots) surfaced as "unregistered evidence". | `scripts/`, `tests/`, `docs/site/center/` | "Evidence tables are super basic" inverts; the mp4 pilot becomes visible and survives re-capture |
| B5 | **coverage.html:** api+web tiles → leaf reports; per-package table from both coverage JSONs; worst-covered list; SOURCE-file rows → leaf per-file pages/anchors (test files don't appear in coverage reports — no such link claimed). Hub tile becomes a door to it. | `scripts/`, `docs/site/center/` | Task B ("which parts are uncovered?") = 2 clicks |
| B6 | **Tests-as-demos (D16):** the demo strip on phase pages (ordered legs, claim lines, shots, video, print stylesheet). Verified demo-ready on H7 + H8 first — the operator's "latest features first". Fresh `--capture` run for cook-state (also exercises B4's stable-name step). | `scripts/`, (capture rerun writes gitignored artifacts) | Test results double as demo material, on the newest work |
| B7 | **Crawl gate `scripts/check_center_links.py`** (stdlib `html.parser`): 0 dead hrefs · 0 `data-entity` elements without an href (generator stamps entities; allowlist for terminal strings lives INSIDE `center.config.json` — no second editorial file; self-grading caveat accepted, B8 is the independent check) · reachability ≤3 clicks from hub · no truncation without a door · WARN listing phases absent from the registry. Wired into the regen command + documented; NOT into CI. | `scripts/` | "Navigable" is a gate, not a hope |
| B8 | **Myopic re-walk (suite-side, fork, read-only):** the same two tasks on the rebuilt center; the 1.5-step horizon must complete both. Fix what it catches or log accepted residuals. | (analysis only) | The verdict's own instrument certifies the fix |
| B9 | **Close-out:** regen ×2 anchor-churn check; `docs/site/README.md` §center update; LEDGER/PLAN cells; COMMS report both ways; PENDING rows for anything deferred. | `.kdbp/`, docs | Lifecycle honest, both sessions synced |

## Acceptance (CC2 passes when…)

1. **Crawl gate green** (B7's five checks) on a PINNED run-state: one full local refresh first (junit both suites + coverage + cook-state journey with `--capture`), then regen, then the gate — acceptance is not judged against stale or absent local inputs.
2. **Task-based, headless-verified with screenshots:** "was H8 tested + grab demo material" ≤4 clicks from hub (walked IA says 2: hub → board → phase/H8); "which web parts are uncovered" ≤2 clicks.
3. **Latest features demo-ready:** H7 + H8 phase pages show tested-by with resolved match list, the mapped-test pass rate (the per-feature percentage), captioned gallery, video (or its honest placeholder + refresh command); print view sane.
4. **Every populated grid cell opens a drill; zero "…N more" dead rows; docs↔center bridges live both ways.**
5. **Anti-curation intact:** `git diff` inspected — the only editorial artifact is `center.config.json` (now incl. `features[]`/`drills[]` maps; mapping only, no asserted results).
6. **Regen ×2 → zero anchor churn; gabe-commit gates pass** (WARNs accepted-and-logged).
7. **Myopic re-walk:** both tasks complete at the 1.5-step horizon; no surviving CRITICAL.

## Size, sessions, stop-loss

- Generator today: 1,255 lines (777 + 478). Estimate (skeptic-corrected): **+900–1,400 lines** across `_center_pages.py` (new), `_center_data.py` (registry + coverage parse + htmlcov hash-name mapping via its internal `status.json`), `build_center_docs.py` (doors retrofit + wiring), CSS additions, the stable-capture step, and the crawl gate (~150) — every file ≤800 (size-budget gate).
- **~2 sessions realistic** (skeptic priced 2–3 before the suite-page cut; the cut buys most of a session back). B0 is a same-day slice; B2+B3 are the bulk.
- **Stop-loss:** if B2+B3 exceed one session → halt, report to COMMS, and cut at the pre-agreed seam: `spec/<s>.html` ×21 collapse into sections on their `group/<g>.html` pages (galleries move up one level; everything else stands). The suite-file-page cut is already taken (B3) — this is the next seam, not the same one.

## Out of scope (unchanged from v2 + new)

- Wave-2: KDBP schema enrichment (D6 — absorbs the feature registry) · generator promotion (D7) · regen/orphan enforcement · leaf+capture custody (D146 + 23MB leaf flag) · shell unification beyond bridges.
- Per-test-file PAGES (anchors on the two suite pages serve the walked tasks; escalate later only on operator ask).
- Per-feature CODE-coverage numbers (not honestly derivable; the per-feature percentage is mapped-test pass rate, labeled as such).
- No committed video/GIF; GIF export on demand only.
- gustify PENDING #104/#105 (storybook flake, npm audit) ride their own lifecycle — not CC2.
