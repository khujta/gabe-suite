# Site architecture — the command center IA (the layer v2 never had)

- **Date:** 2026-07-11 · **Status:** PROPOSED, post-skeptic (UPHOLD-WITH-MODS applied — `../threads/SKEPTIC-depth-pass.md`; operator rules = D11/D12; execution = `08-spike-plan-v3.md`)
- **Scope:** the complete page inventory, what generates each page, and the navigation contract. The skin (J, `05-skin-spec.md`) is FINAL and unchanged — this document is about STRUCTURE, which the mockups never specified.
- **Principle (one line):** *every rendered fact is a door to its source, and every door is machine-made.* No page exists that a human hand-writes; cardinality comes from the data, not from a list someone maintains.

---

## 1. The three wings (the operator's stated shape)

```
                    ┌─ DASHBOARD ── docs/site/center/            (light J "Station Card" console)
one navigable place ┼─ DOCUMENTATION ── docs/site/*.html          (dark Cifra library, ~30 pages, exists)
                    └─ TESTS ── docs/site/center/tests… + L2/L3  (the doubled-down wing)
```

The wings keep their shells (console vs library — different jobs, different reading postures) but become ONE place via the navigation contract (§4): each shell's topbar carries the other wing, breadcrumbs are continuous, and no task requires knowing a URL.

## 2. Page inventory (the sitemap, with cardinality and sources)

Legend: ▣ exists (CC1) · ✚ new (CC2) · cardinality in [brackets] · every page lists its DATA SOURCES — nothing else may appear on it (anti-curation).

```
docs/site/
├─ ▣ index.html + ~30 doc pages [docs estate]        src: docs/rebuild/*.md (existing generator)
│     ✚ nav item "TESTING CENTER" → center/           (the bridge, docs → center)
│
└─ center/
   ├─ ▣ index.html — HUB [1]  L0                      src: PLAN.json · PENDING.md · LEDGER.md ·
   │     every number a door:                              run-status.json · run-history.jsonl ·
   │     · 5 stat tiles → tests/coverage/board pages       junit XMLs · coverage JSONs · config
   │     · risk grid: EVERY populated cell → its drill
   │     · pyramid rows → tests.html sections; recency rows → group pages
   │     · history rows → tests.html sections; board teaser → board.html
   │     ✚ nav gains COVERAGE + DOCS
   │
   ├─ ▣ board.html — BOARD [1]  L1                    src: PLAN.json · PENDING.md
   │     ✚ every phase card → phase/<id>.html  (32 doors)
   │     ✚ every ticket → stable #ticket-<n> anchor + source-line link (dup-id bug fixed)
   │
   ├─ ▣ tests.html — TESTS [1]  L1                    src: journey-groups.json · junit XMLs ·
   │     ✚ group cards → group/<g>.html, each stamped       run-status.json · local-checks.jsonl ·
   │       "serves: H7 H8 …" (the phase↔station key,        features[] map
   │       rendered both ways — myopic HIGH #4)
   │     ✚ spec lines → spec/<s>.html
   │     ✚ suite file rows → anchored sections on suite-api/suite-web full-list pages;
   │       "…N more" truncations REPLACED by those doors
   │     ✚ hand-run station rows → local-checks detail (dates + last output summary)
   │     ✚ orphan artifact dirs surfaced as "unregistered evidence" (~9 dirs, ~43 shots)
   │
   ├─ ✚ coverage.html — COVERAGE [1]  L1              src: coverage.py JSON · istanbul coverage-summary.json
   │     api + web tiles → leaf reports; per-package table; worst-covered list;
   │     every file row → the leaf report's per-file page/anchor
   │
   ├─ ✚ phase/<id>.html [32]  L2 — THE FEATURE PAGE   src: PLAN.json (cells, tier) · LEDGER.md rows ·
   │     the per-feature view the intent centers on:       PENDING.md refs · features[] map (config) ·
   │     · story strip: E·R·C·P cells, tier, LEDGER rows       junit XMLs · proof manifest · capture dir
   │     · tested-by: journey specs + suites serving it, with outcomes,
   │       AND the resolved match list rendered (an over-claiming glob is visible on-page)
   │     · THE PERCENTAGE (operator intent): mapped-test pass rate (passed/total of the
   │       feature's mapped tests) — the honest per-feature number. Per-feature CODE coverage
   │       is NOT derivable from coverage reports (they're per-file; features cross-cut) —
   │       stated on-page, with a door to coverage.html for the code-coverage view
   │     · unmapped phases render "not yet mapped — registry covers N of 32 phases"
   │       (never "no mapped tests": an incomplete map must not read as 'untested')
   │     · evidence gallery: proof-manifest legs w/ captions (lightbox)
   │     · capture video, live-probe <video> (placeholder until a run)
   │     · DEMO STRIP (D16): ordered shots + captions + claims — print-friendly
   │
   ├─ ✚ group/<g>.html [8]  L2                        src: journey-groups.json · run-status.js · junit
   │     specs in the group w/ per-spec status/durations → spec pages; group history
   │
   ├─ ✚ spec/<s>.html [21]  L2                        src: run-status.json · pw-report.json ·
   │     step list w/ screenshots (live-probe; the 134        artifacts/<spec>/ (live-probe) · capture/
   │     shots derivable from registered specs become reachable; the ~43 in orphan dirs
   │     surface via the tests.html orphan section), durations, retries,
   │     capture video if exists, link to spec source + its docs-estate journey page if one exists
   │
   ├─ ✚ suite-api.html · suite-web.html [2]  L2       src: junit XMLs
   │     FULL suite listings (kills "…N more"): one anchored section per test file,
   │     every test w/ outcome + duration. Per-file PAGES deliberately NOT built
   │     (skeptic: junit is a gitignored local input — 130 committed pages would churn
   │     per local run and fragment file:// Ctrl-F; anchors serve every walked task).
   │     Escalation to per-file pages = a later operator call if anchors prove thin.
   │
   ├─ ▣→✚ drill-<tier>-<area>.html [8 populated cells; grows with the map]  L2
   │     already parameterized; config gains the 7 missing entries — every populated cell a door
   │
   └─ ▣ leaf/ [L3 — linked, never rebuilt]            htmlcov (api) · web-coverage (istanbul) ·
         ✚ web-coverage LINKED (hub tile + coverage.html + drills)   pw-report · proof manifests
```

**Cardinality: ~77 generated pages** (32 phase + 8 group + 21 spec + 2 suite + 8 drill + coverage + hub/board/tests + bridges) from sources that all already exist. The count is a CONSEQUENCE of the data — adding a journey group or a phase grows the site with zero code changes. That is the "series of pages" the intent describes: pages exist because an express, navigable need exists (a phase, a group, a spec), not because someone listed them.

## 3. The feature registry (D13 — the missing key)

The one mapping no machine source carries today: **phase → the tests/evidence that serve it.** Proposal: `center.config.json` gains

```json
"features": [
  {"phase": "H8", "journey_specs": ["web-journey-cook-state"], "junit_glob": "*cook*|*photo*",
   "proof_dir": "cook-state", "capture_dir": "cook-state"}
]
```

- **Guardrail status:** AMENDED, not breached. Still ONE overlay file; the overlay may **map** (which sources belong to which phase/cell) but never **assert** (no counts, no verdicts, no prose that a run should produce). Two teeth keep the line real (skeptic mods): (1) globs are validated referentially AND each phase page **renders its resolved match list** — an over-claiming glob (e.g. `*cook*` catching 91 unrelated tests) is visible, not latent; (2) unmapped phases render **"not yet mapped — registry covers N of 32 phases"**, never words that read as 'untested' (an incomplete map must not manufacture the false signal the myopic walk flagged).
- **Going forward:** the crawl gate WARNs when a phase exists with no registry entry — every NEW feature is nudged into the map at its own checkpoint (enforcement stays Wave-2, visibility is now).
- **Trajectory:** this block is the bridge until D6 (Wave-2 KDBP schema enrichment) makes `proof` structured — then the registry collapses into PLAN.json and the config shrinks back.
- **Bootstrap:** entries for the newest features first (H7, H8, the edge batch, CC1) — exactly the operator's "cover the latest features first."

## 4. The navigation contract (D15 — what "navigable" means, testably)

1. **Doors:** every rendered entity name/number that references something with a page or source (phase id, group, spec, suite file, ticket, coverage %, artifact) is an `<a>`. Mechanically: the generator stamps such entities `data-entity`; the crawl gate fails any `data-entity` without an href. (Honest caveat: generator-stamped = self-grading — the independent check is the myopic re-walk, B8.) The allowlist for terminal strings lives INSIDE `center.config.json` — no second editorial file.
2. **No silent truncation:** any "…N more" is itself a door to the full list.
3. **Reachability:** every page ≤3 clicks from the hub; the two walked tasks complete in ≤4 clicks ("was X tested + grab demo material") and ≤2 clicks ("what's uncovered in web").
4. **Bridges:** center topbar carries DOCS; docs sidebar carries TESTING CENTER; breadcrumbs never dead-end. (Priced honestly: the docs nav is a shared `NAV_GROUPS` structure consumed by FOUR generators — the bridge is one structural edit + four regen runs with estate-wide date-stamp churn; feasible same-day, not "one line".)
5. **Honest absence:** empty states render words ("no mapped tests", "no capture yet — run `run-journeys.sh <g> --capture`"), never blank cells that look like unbuilt features.
6. **Enforced locally:** `scripts/check_center_links.py` (stdlib) runs with the generator — checks 1–4 mechanically. Zero CI growth.

## 5. Evidence layer (D14/D16 — galleries, video, demos)

- **Gallery component:** thumbnails → lightbox (no-JS fallback: plain link); captions from proof-manifest legs; live-probe doctrine preserved (images resolve at view time; placeholder + the exact refresh command when absent).
- **Coverage of evidence, stated:** hub/tests footer line "galleries exist for N of M cells; capture for K specs" — the disappointment surfaces at arrival, not at demo time (myopic HIGH #3).
- **Video:** `<video>` embeds of capture mp4 (live-probe, not committed — matches the proof-manifest convention and gustify's D146). **Prerequisite (skeptic):** capture output is hash-named (`page@<hash>.mp4`) and the hash changes per re-capture, which would break every embed — `run-journeys.sh --capture` gains a stable-name step (copy to `capture/<group>/latest.mp4` + `.webm` fallback source). GIF export stays an on-demand ffmpeg step for embedding OUTSIDE the site (README, chat) — pages prefer mp4 (smaller, scrubbing).
- **Demo strip (tests-as-demos):** on each phase page — the manifest's legs in order, one claim line per leg, shots inline, video at the end; print stylesheet so the page doubles as a handout. Evidence Doctrine §6 made real, with no second artifact to drift.
- **Orphans surfaced:** ~10 artifact dirs match no registered spec — rendered on tests.html as "unregistered evidence" (honesty beats curation; deleting is a gustify housekeeping call, not a rendering one).

## 6. Explicitly NOT in this architecture

- No write-back, no server, no search index (static + `file://` stands).
- No reskinning of leaf reports or the docs estate; no shell unification (revisit at Wave-2 only if bridges prove insufficient).
- No per-test-file pages (junit rows render as anchored sections on the two suite pages; coverage line detail is the leaf's job — note: test files themselves do not appear in coverage reports, so no test-file→coverage link is claimed).
- No per-feature CODE-coverage number (not derivable honestly; the per-feature percentage is mapped-test pass rate, stated as such).
- No committed video/GIF (custody = D146, gustify-side, unchanged).
- No hand-authored page content anywhere in `center/` — the config maps, the machine writes.
