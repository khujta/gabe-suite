# SKEPTIC — depth-pass attack (06/07/08)

- **Date:** 2026-07-11 · **Role:** adversarial skeptic (house pattern) · **Mode:** READ-ONLY on gustify
- **Targets:** `output/06-depth-gap-analysis.md` · `output/07-site-architecture.md` · `output/08-spike-plan-v3.md`
- **Method:** every attack checked against the real repo (`/home/khujta/projects/apps/gustify`) — paths/line numbers/commands cited per attack. Verdict scale: REFUTES (claim false / plan piece dies) · WOUNDS (survives only with a mod) · STANDS.

---

## Attack 1 — Cardinality bloat: the ~130 suite-file pages

**Checked:**
- `tests/results/` is **gitignored** (`.gitignore:97: tests/results/` — verified with `git check-ignore -v`). junit XMLs, coverage JSONs, pw-report exist only after a local run.
- Parsed the real junit via the real data layer (`scripts/_center_data.py:269 load_junit`): **api = 85 files / 1,110 testcases, web = 44 files / 415 testcases** → ~129 suite pages, ≈13 test rows per page average. Per file junit carries: test name, time, failure/skip child. That's it — a suite page is a ~13-row table.
- The two walked operator tasks ("was H8 tested + demo material", "which web parts uncovered") touch suite pages **zero times** in the proposed IA (phase page and coverage.html carry both).

**Four problems the docs don't surface:**
1. **Committed pages from gitignored, per-run data.** `docs/site/` is committed (468 tracked files under it). 130 pages carrying per-test durations regenerate different on every local test run → permanent noisy diffs, or regens get avoided and the pages go stale — the exact drift class CC1's header says the tool exists to kill (`build_center_docs.py:15-16`).
2. **Absence behavior undefined.** On a machine where only api tests ran, web junit is None → 45 pages vanish (or linger stale — `build_center_docs.py` writes files, never prunes; no output-manifest/pruning step appears anywhere in 07/08). "Crawl gate green on a fresh regen" (08 acceptance #1) is therefore machine-state-dependent and underspecified.
3. **Searchability inversion.** Static + `file://` + no search index (07 §6) means Ctrl-F is the only search. The myopic 1.5-step failure was "scan TESTS for 'photo'". One full-list station page with 1,110 rows is Ctrl-F-able and would have *found* `test_cooking_photos` (17 photo cases confirmed in api-junit.xml). 130 fragment pages are not Ctrl-F-able. The cardinality actively *hurts* the walk that motivated the whole pass.
4. **The stop-loss seam is honest but mis-targeted.** Cutting suite pages is mechanically real (one template loop removed), but that loop is the *cheapest* work in B3 — the schedule risk lives in B2 (doors retrofit across 4 existing pages) and B4 (gallery/lightbox/video). The seam cuts cardinality, not effort.

**Verdict: REFUTES the ×130 default (WOUNDS the plan, not the IA).** Per-suite anchor sections on api/web full-list pages serve every stated task at ~1/10 the cost, fix searchability, and eliminate the churn/pruning/absence problems. Invert the seam: anchors are the default; per-file pages are the escalation *if a need appears*.

## Attack 2 — Guardrail integrity: "the overlay may MAP, never assert"

**Checked:**
- The 07 §3 example glob itself: `"junit_glob": "*cook*|*photo*"`. Against the real api junit: `*cook*` matches **5 files / 91 testcases** (`tests.test_cooking`, `test_cooking_timer`, `test_cooking_loop_route`, `test_cooking_concurrent_cap`, `test_cooking_photos`) — but only `test_cooking_photos` (17 cases) is H8. The plan's own worked example over-claims H8's "tested-by" panel by ~5×. A MAP entry *is* an editorial assertion of relevance; a generous glob smuggles "this feature is well-tested" with no run producing it. Referential validation (`_center_data.py:390-412`) can check a glob matches ≥1 file — it cannot check semantic truth.
- The line is also *already behind current practice*: `center.config.json` `drills[]` carries editorial **prose** — `"title"`, `"promise": "a restricted user never sees a recipe that could hurt them"` — rendered verbatim on the drill page (`build_center_docs.py:657-658`). So "may MAP, never assert" describes a config that already asserts. Adding 7 more drill entries (B2) means authoring 7 more editorial promises.
- **The false-'untested' signal is real and large:** PLAN.json has 32 phases (verified); B1 bootstraps ~4 registry entries. So **28 of 32 phase pages will render "no mapped tests"** — words a 1.5-step user reads as "untested", i.e., the exact myopic CRIT #2 failure, now rendered in confident text instead of silence. 07 §2 never distinguishes "registry has no entry" from "entry exists, matches nothing".
- Bonus slope: B7 adds "an allowlist file for terminal strings" — a **second** hand-maintained editorial file, in tension with "ONE overlay file" (08 locked constraints).

**Verdict: WOUNDS.** The line is drawable but not as stated. Mods: field whitelist per entry type (map fields only; prose limited to the already-conceded title/promise; validator rejects result-words); phase pages must say "not yet mapped — registry covers N of 32 phases" + how to add; glob hits must render their matched file list (over-breadth becomes visible); fold the crawl-gate allowlist into `center.config.json` or the checker source.

## Attack 3 — file:// reality

**Checked:**
- CC1's live-probe convention works and is the precedent: `build_center_docs.py:599-604` — `<img src="../../../tests/web-e2e/artifacts/web-journey/…" onerror="this.setAttribute('data-absent',1)">`. Relative `../` escapes of `docs/site/` are plain filesystem paths over `file://`; no CORS/CSP applies to `<img>`/`<video>` (no meta-CSP in center pages; center is CDN-free by design — the *docs estate* pulls Google Fonts (`_docs_shell.py:24-29`), which degrade gracefully offline). Inline lightbox JS runs fine over `file://`. 25 missing images on a spec page = 25 fast local ENOENTs into `onerror` → no thrash.
- **The video embed breaks as specced.** Capture filenames are Playwright-generated hashes: `tests/web-e2e/artifacts/capture/cook-state/page@c502f599713cc45edc86b42f4e53ead2.{webm,mp4}` (verified on disk). `helpers/capture.ts` passes only `recordVideo: { dir }` — Playwright picks the name; `run-journeys.sh:112-131` renders every `*.webm` in place. A live-probe `<video src>` needs a **stable path known at build time**; the next `--capture` run mints a *new* hash and the dir accumulates old ones. D14's "resolve at view time, NO rebuild" is unimplementable under the current naming. Neither 07 §5 nor 08 B4/B6 mentions a rename step.
- Secondary: pages should ship `<source>` webm+mp4 — h264 mp4 is unplayable on codec-less Chromium builds (the reason Playwright records webm natively).
- **"ALL 185 on-disk shots become reachable" (07 §2 spec pages) is false under the doctrine.** `spec_shots()` derives shot lists from spec *source* (`_center_data.py:467-478`). Summed across all specs: **134 derivable shots**, not 185. **43 shots sit in 9 orphan dirs** no spec declares (combined-cook 11, usability 7, mixnav 7, mixing-edges 7, stepsave/serverstep/cookloop 3 each, uxfix 1, fixsmoke 1); per-spec mismatches both ways (facets: 8 derived vs 11 on disk; core: 23 derived vs 21 on disk). Reaching 185 requires globbing gitignored disk at build time — which contradicts `build_center_docs.py:15-16` ("IDs/anchors derive from NAMES … never from run data") and makes page content machine-state-dependent.

**Verdict: WOUNDS.** Images/lightbox/print stand on CC1 precedent; the video pipeline and the "ALL 185" claim do not survive as written.

## Attack 4 — The docs-side bridge

**Checked:**
- The docs estate nav is `NAV_GROUPS` in `scripts/_docs_shell.py:157-203` — **shared by four generators**: `build_docs_site.py`, `build_e2e_docs.py`, `build_journey_docs.py`, `build_screen_docs.py` (all import `doc_nav`). The *edit* is one block; the *propagation* is re-running all four so all ~31 committed estate pages pick it up.
- All four bake `GENERATED_ON = date.today()` into every page (`build_docs_site.py:52`, `build_e2e_docs.py:90`, `build_screen_docs.py:59`, plus DO-NOT-EDIT banners) → regenerating on a later date churns a date line on every page. Cosmetic but estate-wide.
- Mermaid: `build_docs_site.py:49-89` renders via node+Playwright but is **cache-first** (`docs/site/assets/mermaid/<hash>.svg`, committed — verified populated), so a nav-only regen won't degrade diagrams. Failure mode is a `<pre>` fallback, printed loudly.
- Writable surface: 08 §Executor explicitly includes `docs/site/` — the estate pages are in-surface. Nothing structural breaks.

**Verdict: WOUNDS (the "one line" claim), STANDS (feasibility).** Call it what it is in B0: one `NAV_GROUPS` edit + four generator runs + an estate-wide date-line diff, environment healthy. Budget an hour, not a line.

## Attack 5 — Crawl gate feasibility

**Checked against the proposed IA:**
- Dead hrefs (file exists + `#anchor` id exists), BFS reachability, and truncation-with-door are all mechanically checkable with stdlib `html.parser`. STANDS.
- **"0 unlinked data entities" is not checkable from HTML alone.** A checker cannot semantically distinguish "data entity" from prose. The only workable design is generator cooperation (every entity-rendering function emits `data-entity`; the checker asserts each carries/contains an `<a>`) — which makes the check **self-grading**: the generator marks what the gate inspects, so a renderer that forgets the attribute passes silently. Honest, but only as a regression tripwire, not as proof. 07 §4.1/B7 never says this; the allowlist-of-terminal-strings framing implies text-level heuristics, which will drown in false positives (dates, counts, tier labels).
- **≤3 clicks arithmetic holds** on the proposed sitemap, including the deep sets: suite file = hub → tests (1) → station full-list (2) → suite page (3); leaf per-file = hub → coverage.html (1) → leaf index (2) → file page (3); phase = hub → board (1) → phase (2). No self-contradiction found — *provided* tests.html's full-list doors exist and coverage.html links leaf indexes directly (both specced).
- Caveat from attack 1: gate results depend on which gitignored inputs exist; "green on a fresh regen" must pin required inputs (run the suites first, or the gate must explicitly report which page sets were skipped-absent).

**Verdict: WOUNDS.** Three of four checks are real; the flagship "0 unlinked entities" needs the `data-entity` convention named in the plan and an honest statement of its self-referential limit, plus input-state pinning for acceptance #1.

## Attack 6 — Task acceptance honesty (click counts)

**Walked on the proposed IA:**
- "Was H8 tested + grab demo material": hub → BOARD (1) → H8 phase card → `phase/H8.html` (2). Tested-by, gallery, video, demo strip are all on that page. **2 clicks ≤ 4. HOLDS** — with slack, not generosity.
- "Which web parts uncovered": hub 41.5% tile → `coverage.html` (1 — worst-covered list answers on-page) → leaf detail (2). **1–2 clicks ≤ 2. HOLDS.**
- Honesty caveat: these measure the *correct* path. The 1.5-step user's instinct last time was TESTS, not BOARD; nothing on tests.html points feature-ward. B8 (myopic re-walk) is correctly positioned to catch it, but expect it to demand a features cross-link on tests.html — cheaper to add in B2 than to loop through B8 twice.

**Verdict: STANDS** (both numbers honest), with the tests→feature cross-link flagged as a likely B8 finding to preempt.

## Attack 7 — Effort estimate (+700–1,000 lines, 1–2 sessions)

**Base rates:** CC1 = 1,255 lines (verified: 777 + 478) for 4 pages + data layer in one session. CC2 adds: 6 new page *types* (phase/group/spec/suite/coverage/full-lists), gallery+lightbox+video+print CSS (center.css growth is unbudgeted entirely), registry + validation, two coverage-JSON dialects **plus the htmlcov per-file link problem** (leaf pages are hash-named `z_<hash>_<file>.html`; mapping needs parsing coverage.py's internal `status.json` — 225 entries, format explicitly versioned/internal), doors retrofit across all 4 existing pages, the crawl gate, capture-naming plumbing (attack 3), pruning/manifest logic (attack 1), B0, docs-estate regen, close-out.

**Most likely underestimated:** (a) B2 doors retrofit — touches nearly every render function in `build_center_docs.py`; (b) evidence layer CSS/JS; (c) coverage→leaf anchor mapping; (d) crawl-gate entity conventions; (e) the un-specced fixes this report adds. Realistic: **+1,200–1,800 lines, 2–3 sessions** — or hold 1–2 sessions by taking attack 1's mod (anchors, not ×130 pages) up front, which also deletes the pruning problem.

**Verdict: WOUNDS.** Not fatal — but the stop-loss as designed would fire *after* the cheap work is done and cut the wrong thing.

## Attack 8 — What the IA still misses vs operator intent

1. **The percentage. REFUTES acceptance-completeness.** Operator verbatim (quoted in 06 line 7): "per new feature, see the tests, **the percentage**, the screenshots." **No page in 07 shows any per-feature percentage** — phase pages spec story/tested-by/gallery/video/demo strip only; coverage.html is per-package/per-file, never per-feature. Honest derivations exist: (a) mapped-test **pass rate** (passed/total of registry-matched cases — cheap, honest, already in junit); (b) mapped-source **coverage %** if `features[]` gains optional source globs (coverage JSONs are per-file, so it's arithmetically honest). The plan must render (a) at minimum or descope "the percentage" with explicit operator sign-off. This is the single biggest intent gap: the docs quote the sentence and then don't build its middle word.
2. **"Every NEW feature going forward" has no enforcement.** The registry bootstraps ~4 entries; nothing gates a future done-phase into having one. A new feature lands → phase page says "no mapped tests" → the false-'untested' signal recurs forever. Cheap fix: crawl/regen gate rule — any phase with `cells.exec=done` newer than CC2 must have a `features[]` entry or an explicit `"unmapped": true`.
3. Demo material (D16 demo strip) — covered. GIFs→mp4 translation — reasonable, *if* attack 3's naming mod lands. "One navigable place" via bridges — genuinely an operator ruling (D12), correctly surfaced as such.

## Attack 9 — Factual errors and verified claims

**Errors found:**
- 07 §2: "ALL 185 on-disk shots become reachable" — false as specced (134 derivable; 43 orphan-dir shots; see attack 3).
- 07 §2 suite pages: "→ coverage leaf anchor **for that file**" — incoherent. junit files are *test* files (`tests/test_*.py`, `*.test.tsx`); coverage leafs contain only *source* files (verified: `tests/results/web-coverage/` holds `auth/AuthProvider.tsx.html` etc., no `.test.` pages; htmlcov covers `apps/api` sources). No 1:1 mapping exists; many-to-many at best.
- 07 §2 cardinality: 32+8+21+130+8+4+1 = **204**, stated "~195–200" (junit-actual is 129, so ~203). Minor.
- 07 §2: sources named "run-status.js" — the build parses `artifacts/run-status.json` (`_center_data.py:130`); `run-status.js` is a separate `window.__GUSTIFY_RUN_STATUS__` wrapper. Naming slip, worth fixing before someone codes to it.
- 08 B0: docs bridge "one line in its generator/shell" — one NAV_GROUPS edit, but four generators re-run + estate-wide date churn (attack 4).
- 07 §5 / 08 B4: capture `<video>` live-probe — unimplementable without the stable-name step (attack 3).

**Verified correct (no exaggeration found in the verdict-measuring layer):** generator = 1,255 lines (777+478) ✓ · 185 journey PNGs in 27 dirs ✓ · 13 committed captioned proof shots + manifest ✓ · capture mp4+webm exist, 11MB dir ✓ · duplicated `id="ticket-77"` ×2 on board.html ✓ · `tests.html#deployed` dead (no such id) ✓ · web-coverage leaf zero inbound (code-confirmed: `drill_leaves` links only `COVERAGE["api"]`, `build_center_docs.py:626-631`) ✓ · 32 phases, 8 groups, 21 specs, 85 api + 44 web junit files, web 41.5% ✓ · all cited commits real (`a98df2eb`, `eed31557`, `26ccf134`, `0b6153bd`, `3a425c52`, `118dbb03`, `1a1f943e`) ✓ · `drills[]` loop + 1-of-8 config entry ✓. The 06 depth-gap analysis is the strongest of the three documents; its numbers all held.

---

## FINAL VERDICT: **UPHOLD-WITH-MODS**

The diagnosis (06) survived every factual check. The IA layer (07) and plan (08) are structurally right — B0, phase pages, doors, coverage.html, bridges, and the gate all survive attack. But six mods are **mandatory** before execution:

1. **Render the percentage** (operator's verbatim middle requirement): phase-page tested-by header shows mapped-test pass % at minimum; optional honest coverage % via `features[]` source globs; or explicit operator descope.
2. **Stable capture naming**: rename step in `run-journeys.sh` capture loop (e.g., `<subdir>/capture.mp4`, prune stale `page@*`), `<source>` webm+mp4 fallback — else D14's video embeds break on the next `--capture` run.
3. **Invert the suite-file seam**: per-suite anchor sections on api/web station full-list pages as the DEFAULT (~2 pages, Ctrl-F-able, churn-free); per-file ×130 only on demonstrated need. If pages are kept anyway: junit content policy (no raw per-test durations), output pruning/manifest, and defined junit-absent behavior are required.
4. **Honest registry absence + going-forward gate**: "not yet mapped — registry covers N of 32 phases" wording (never bare "no mapped tests"), and the gate fails any post-CC2 done-phase lacking a `features[]` entry or explicit `unmapped: true`.
5. **Glob hygiene**: registry globs validated (≥1 match, warn on breadth), matched file lists rendered on the phase page — the plan's own `*cook*|*photo*` example over-claims H8 by ~5× (91 vs 17 relevant cases).
6. **Gate honesty**: name the `data-entity` generator convention for "0 unlinked entities" (and its self-grading limit); allowlist lives in `center.config.json` or checker source (no second editorial file); acceptance #1 pins required run-state inputs. Fix the 07 factual slips (185-claim, coverage-leaf-per-test-file, run-status.js) before they get coded.

Advisory (not blocking): re-budget at +1,200–1,800 lines / 2–3 sessions, or take mod 3 up front and keep 1–2; preempt B8 by adding a tests→features cross-link in B2; state in B0 that the docs bridge = NAV_GROUPS edit + four generator runs + date-churn diff.
