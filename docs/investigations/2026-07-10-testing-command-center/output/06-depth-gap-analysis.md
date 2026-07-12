# Depth-gap analysis — why CC1's center is shallow, and what the decisions missed

- **Date:** 2026-07-11 · **Mode:** ANALYZE (read-only on gustify; CC1 build inspected at HEAD `1a1f943e`)
- **Human-facing rendering:** `06-depth-gap-analysis.html` (same folder)
- **Receipts:** `raw/crawl-inventory.md` (full link-graph crawl) · the `/gabe-myopic` walk (findings embedded below) · screenshots `assets/shots-cc1/`
- **Governing intent (operator, verbatim):** "this center is super shallow at the moment. I cannot really go through the sections. The drill works only in one section, and is not really a drill. It's a pre-configured screen. Almost nothing else is clickable. Evidence tables are super basic. We don't have GIFs. We don't have tests that we can use later as test results that we can use later for demos. It seems like we just follow the layout, that's it."
- **Operator's added framing (2026-07-11):** the intended product was always a SERIES of pages — dashboard + project documentation + tests — doubled down on tests: per new feature, see the tests, the percentage, the screenshots → demo material. The mockups were theme/appearance evaluation only, never the site architecture.

---

## 1. The verdict, measured

The critique is not an impression — it's countable. Crawl of the real built center (4 pages + leaf):

| Measure | Value | Meaning |
|---|---|---|
| Dead-end data entities (styled like cards/cells, no href) | **≈200** (hub 36 · board 91 · tests 72 · drill ~0) | "Almost nothing else is clickable" — confirmed |
| Risk-grid cells that are doors | **1 of 8** data-bearing cells (the other 7 are visually identical `<span>`s) | "The drill works only in one section" — confirmed |
| Journey screenshots on disk vs rendered anywhere | **185 on disk, 6 rendered** (2 of 27 feature dirs) | "Evidence tables are super basic" — confirmed |
| Curated proof set (committed, captioned) rendered | **0 of 13 images** (only the manifest JSON is linked) | The best evidence in the repo is invisible |
| Capture video referenced from any center page | **0** (mp4+webm exist for cook-state) | "We don't have GIFs" — confirmed (the footage exists, unlinked) |
| Web coverage report | **baked to disk at `center/leaf/web-coverage/`, zero links to it** | The 41.5% tile is an answer with no question allowed |
| Truncation rows with no way through | "… 73 more files / 634" (pytest) · "… 32 more files / 191" (vitest) | The estate is majority-invisible on its own page |
| Site-wide dead hrefs | 2 (`tests.html#deployed`, pyramid anchor) + duplicated `id="ticket-77"` on board | Small, but the crawl gate CC2 adds would have caught them |
| docs estate (~30 pages) ↔ center cross-links | **0 in either direction** | Two islands; the "documentation" wing of the intent is unreachable |

**One honest positive:** the generator is NOT a hardcoded 4-page script. `build_center_docs.py` already loops `for drill in CONFIG["drills"]` — the single drill page exists because `center.config.json` has one entry, not because the machine can't make more. The depth pass is config + template extension over a sound base, not a rewrite.

## 2. The myopic walk (3 horizons, 2 real tasks)

Walked: (A) "I shipped H8 cook-photos — was it tested? find the proof, grab demo material." (B) "web coverage is 41.5% — which parts are uncovered?" Verify pass: raw 9 → killed 0 → survived 9.

| Horizon | Fatal step | What breaks them |
|---|---|---|
| 1-step | first click | Clicks the biggest matching green number ("81 · 6 SOURCES", the 41.5% tile) — silence. No feedback, no next action. |
| 1.5-step | TESTS scan | Finds the H8 card on BOARD, carries "H8 = photos" to TESTS — meets ~50 station rows with zero "photo" strings and zero links. Concludes **"not tested"** — a false conclusion carried into a demo. |
| 2-step | everywhere | Executes a correct plan and still ends where no door exists: no H8 evidence anywhere, no web-coverage link anywhere. **The payoff is unreachable at any planning depth.** |

Findings (severity order): **[CRIT]** web-coverage report has no door · **[CRIT]** "was feature X tested?" is unanswerable AND silently mis-answerable (phases and stations share no key; absence renders as nothing instead of "no mapped tests") · **[HIGH]** evidence hunt ends in placeholders or another feature's proof; no video anywhere · **[HIGH]** phase↔station mapping lives in no page (recall > recognition across pages) · **[HIGH]** docs↔center: two islands, zero bridges · **[MED]** one door dressed like eight (dead cells identical to the live one) · **[MED]** hub says "DRILL in the nav" but the hub nav has no DRILL · **[MED]** arrival overload (~40 targets, no task anchor) · **[LOW]** E·R·C·P chip vocabulary half-defined.

## 3. Root cause — where the intent got lost

The intent WAS captured, then lost in translation between altitudes:

| Artifact | Carried the intent? | Evidence |
|---|---|---|
| BRIEF constraint 1 | **YES** — "EVERYTHING, deep-linked… progressive disclosure is the core UX requirement… navigate across sections" | BRIEF.md §Locked constraints |
| Options report §4 (O3) | **YES** — L0–L3 map: "every tile links down"; L2 = per-journey pages, proof galleries, capture MP4s | 01-options-report.md §4 |
| Spike plan v2 | **NO** — steps name only hub/board/tests + the mockups' one drill; acceptance #1 = "renders hub→board→tests→drill→leaf" — a RENDER criterion, not a NAVIGATE criterion. L2 per-feature pages fell out entirely. | 02-spike-plan.md A1–A9, Acceptance |
| The four mockups | **NO, by design** — they evaluated skin/layout; the set (hub/board/tests/one drill) got silently promoted to "the sitemap" | operator: "those mockups… would be the whole architecture" |
| CC1 execution | Faithful to v2 — passed 7/7 of what it was asked | gustify COMMS 2026-07-10 |

So: **CC1 is not the failure; v2's acceptance was.** "Progressive disclosure is the core UX requirement" appeared in the BRIEF and never became a testable criterion. The fix is structural (a sitemap + a navigation gate), not cosmetic.

## 4. Decision audit — what D1–D10 never decided

D1–D10 covered data custody, hosting, reporters, boards, CI, skin. **None of them decided the information architecture.** Missed decisions, now proposed as D11–D16 (operator rules on each; recommendations in `07-site-architecture.md` + `08-spike-plan-v3.md`):

| # | Missed decision | Why it's load-bearing | Recommendation |
|---|---|---|---|
| D11 | **Site IA & page cardinality** — what pages exist, generated from what, how many | Without it, "4 mockups" silently became "4 pages" | The sitemap in `07-site-architecture.md` (~200 generated pages from the same machine data) |
| D12 | **docs estate ↔ center unification** — D4 decided HOSTING (subtree), never NAVIGATION | The intent's three wings (dashboard/docs/tests) need one navigable place | Bridge nav both ways now (one item each); shells stay distinct (J console / Cifra library); full unification = Wave-2 option |
| D13 | **The feature↔evidence key** — nothing maps PLAN phases to specs/suites/proof | Makes "was H8 tested?" unanswerable (myopic CRIT #2) | `center.config.json` gains a `features[]` mapping block (phase → journey specs, junit globs, proof dir, capture dir). Guardrail AMENDED, not breached: the overlay may MAP, never assert results — with teeth: match lists rendered on-page, unmapped phases say "not yet mapped — N of 32" (never 'untested'-sounding words). Durable fix folds into D6 (Wave-2 KDBP schema) |
| D14 | **Capture/video policy** — capture exists (SU1), never surfaced | "We don't have GIFs" | Embed via live-probe `<video>` (NOT committed — matches proof-manifest convention + gustify D146); `--capture` run per new feature + cook-state now; GIF export = on-demand ffmpeg for external embedding, not a page dependency |
| D15 | **Navigation acceptance gate** — v2 had "renders", nothing said "navigates" | The whole verdict, compressed | Local crawl gate script in the regen path (zero CI growth): 0 dead hrefs · 0 unlinked data entities · every page ≤3 clicks from hub · no truncation without a "see all" door. Plus a myopic re-walk as CC2 acceptance |
| D16 | **Tests-as-demos surface** — Evidence Doctrine §6 promised it; no page owns it | "tests that we can use later for demos… the tests that we did, the percentage, and the screenshots" | The per-feature (phase) page IS the demo surface: tested-by + **the percentage** (mapped-test pass rate — the honest per-feature number; per-feature code coverage is not derivable and is not faked) + ordered proof shots w/ manifest-leg captions + capture video + claim lines; print-friendly. No separate demo doc to drift |

**Is the foundation broken?** No — this is the honest answer to "do we have to go back and establish more of a base?" The BRIEF and O3's L0–L3 recommendation already contain the operator's restated intent almost verbatim. What's missing is one layer that was never written: the IA spec between "recommendation" and "spike steps." `07-site-architecture.md` is that layer; v3 builds on it. No re-scope, no new options round.

## 5. What CC2 must verify on (the freshest features first)

Per the operator: cover the latest developed features first, as the worked examples that prove depth. From gustify's log:

| Feature | Commits | Evidence that already exists | CC2 must make visible |
|---|---|---|---|
| **H8 — cook photos persist** | `a98df2eb`, `eed31557`, `26ccf134` | proof/cook-state manifest leg "photos (H8, leg 05)" → shots 16, 18; cook-state journey leg; capture mp4/webm pilot | phase page H8: tested-by, gallery, video, demo strip |
| **H7 — cook-state persistence** | (same proof set) | 13 curated shots + 7 captioned legs, committed | phase page H7: full gallery from the manifest |
| **Prod-readiness edge batch** (account deletion, idempotency reclaim, honest titles, pre-cook photos, facet truth) | `0b6153bd`, `3a425c52` | pytest tests (idempotency TTL etc.); LEDGER row | registry entry resolved during execution (map to its phase/LEDGER row); page shows its tests + junit outcomes |
| **Capture mode itself** (SU1) | `118dbb03` | the cook-state mp4/webm | surfaced on H7/H8 + drill pages — the pilot becomes visible |

Acceptance is task-based on these: "was H8 tested + grab demo material" must complete from the hub in ≤4 clicks (currently: unreachable at any depth).
