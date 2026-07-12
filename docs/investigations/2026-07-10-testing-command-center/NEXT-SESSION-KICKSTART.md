# Depth-pass kickstart — paste this into a FRESH session in gabe_lens

> Generated 2026-07-11 by /gabe-handoff (suite repo has no .kdbp — this file is the house
> investigation-pattern equivalent of .kdbp/HANDOFF.md; same folder as the prior kickstarts).
> Launch in `/home/khujta/projects/gabe_lens` with gustify readable:
> `claude --add-dir /home/khujta/projects/apps/gustify`.

---

Continue the **Testing Command Center investigation** on branch `main` (HEAD `19d5c58` — docs(evidence): capture-mode contract). No active suite phase (suite repo carries no .kdbp); the work lives in `docs/investigations/2026-07-10-testing-command-center/` (currently **untracked/uncommitted** along with 4 pre-existing modified files — see State).

READ FIRST: this file, then `docs/investigations/2026-07-10-testing-command-center/COMMS.md` (suite side) + `/home/khujta/projects/apps/gustify/.gabe-dogfood/COMMS.md` (the CC1 completion report, newest row), then `output/02-spike-plan.md` (v2, what was actually specified) + `output/05-skin-spec.md` (J Station Card, FINAL). Auto-memory carries rounds 1–12.

STATE
- Investigation complete through 11 operator rounds this session line: research (threads T1–T5 + skeptic receipts) → all decisions D1–D10 → skin evolution (7+ candidates, 10 mockup files, `mockups/center-skins.css` multi-skin system) → **FINAL skin J "Station Card"** (`output/05-skin-spec.md`) → spike plan v2 (A0–A9) → `CENTER-KICKSTART.md` → baton passed. All artifacts render-verified by headless-chromium screenshots this session.
- **CC1 EXECUTED in gustify (its session, 2026-07-10): A0–A9 complete, acceptance 7/7, one session, stop-loss never fired.** Commits `8b2596f1`(A0) `2f5e1918`(A1–A3) `80cce76b`(A4–A9) `8a0d7281`(coverage-leaf custody fix) `61a714f6`(close-out). PLAN CC1 cells: Exec ✅ · Review ⬜ · Commit ✅ · Push ⬜. Built site: `gustify/docs/site/center/` = `index.html` (3 lenses) · `board.html` · `tests.html` · **`drill-safety-recipes.html` (the ONE drill page)** · `leaf/` (23MB/372 coverage files, committed — Wave-2 custody flag) · `run-history.jsonl` · `local-checks.jsonl` · `center.config.json`. Numbers: pytest 1110 / vitest 415 / coverage api 93.8% · web 41.5% / api-loop actually GREEN 7/7 (stale README corrected in A0). **A9's first-ever audit runs found real product defects: npm audit 15 vulns (5 high/4 critical) → gustify PENDING #105; storybook flaky 6/562 under load → PENDING #104.**
- Suite repo uncommitted state (verified `git status`, 5 paths): `docs/investigations/` (this whole investigation, untracked) + 4 modified files from the PREVIOUS session (`docs/site/assets/site.css`, `skills/gabe-docsite/{assets/site.css, generator/_markdown.py, generator/build_docsite.py}`). Nothing pushed this session; branch is 0 ahead/0 behind.

TASK (do this next)
Analyze the built center against the operator's verdict and produce the DEPTH PASS plan. The operator's critique, verbatim (governing intent — do not soften it):
> "this center is super shallow at the moment. I cannot really go through the sections. The drill works only in one section, and is not really a drill. It's a pre-configured screen. Almost nothing else is clickable. Evidence tables are super basic. We don't have GIFs. We don't have tests that we can use later as test results that we can use later for demos. It seems like we just follow the layout, that's it, but the different sections and the way to navigate the page, we are not there yet, not at all."
Honest framing to carry: CC1 passed the acceptance it was given — plan v2's criteria never required navigability-everywhere (the mockups demoed ONE drill; acceptance said "hub→board→tests→drill→leaf renders"). The shallowness is a SPEC gap. The depth pass must specify what v2 didn't:
(a) **every cell/row/tile is a door** — generated per-cell pages (criticality×area), per-group and per-spec pages, per-phase and per-ticket anchors: N real pages from the same machine data, not one hand-picked example;
(b) **evidence depth** — galleries wired to the real artifact tree + committed proof sets everywhere they exist, lightbox-grade viewing, per-step captions from Evidence manifests;
(c) **GIF/MP4 integration** — surface capture-mode output on drill pages (`run-journeys.sh <group> --capture` exists, cook-state pilot proven; extending capture coverage is a gustify-side decision to propose);
(d) **tests-as-demos** — the Evidence Doctrine §6 dual-purpose promise made real: journey runs whose artifacts are demo-ready (curated shots + captions + capture video per feature), so test results double as demo material;
(e) navigation completeness criteria that make "can I go through the sections?" a testable acceptance gate (e.g., crawl: every rendered number/name that references an entity resolves to a page or anchor; zero dead ends).
Deliverables: `output/06-depth-gap-analysis.md` (+ visual HTML per house style — screenshots of the REAL built center vs the expectation, using the local playwright pattern from the scratchpad scripts) and spike plan v3 (CC2 "depth pass", same constraint set: app code untouched, no CI growth, anti-curation guardrail, skin J spec unchanged) → operator approves → baton to gustify via COMMS. ANALYZE + PLAN first; no gustify writes from the suite session.
DECIDE FIRST (surface to the operator early): (1) commit the suite repo's investigation folder + the 4 pre-existing modified files? (house rule: repo-first, but commits are operator-gated); (2) CC1 Review cell is ⬜ — recommend /gabe-review in gustify before or with CC2.

RUNBOOK
- Screenshots of the real center: reuse the pattern in `/tmp/.../scratchpad/shoot-*.mjs` from this session — `node` + `import { chromium } from '/home/khujta/projects/apps/gustify/node_modules/playwright/index.mjs'` against `file:///home/khujta/projects/apps/gustify/docs/site/center/index.html` (read-only; write screenshots to the investigation folder or scratchpad).
- Model routing (operator standard): Fable = analysis/judgment/synthesis; Sonnet 5 = mechanical scanning. Adversarial skeptic pass on the depth-pass plan before presenting (house pattern).
- Visual-first deliverables for the human (memory: visual-output-rules) — HTML page over long md; memes ONLY via the chiless meme-hilo pipeline; PixelLab icons ready in `output/assets/icons/`.
- Gotchas: gustify app code READ-ONLY (writable there: tests/, docs/site/, scripts/, test configs — but NOT from the suite session; propose, don't write) · GitHub CI must not grow (BRIEF constraint 7) · no user-level Gemini (constraint 8) · leaf-custody Wave-2 flag (23MB committed coverage may flip to gitignored+local) · two-session COMMS convention: check both COMMS files at start and before big moves.

AFTER THAT
- Operator reviews depth-gap analysis + approves spike plan v3 → update CENTER-KICKSTART (or a CC2 addendum) → gustify session executes CC2.
- gustify housekeeping riding the next push: PENDING #104/#105 (real defects found by A9), CC1 Review cell, U/H review debt.
- Wave-2 flags unchanged: D6 KDBP schema enrichment · D7 generator promotion at gastify n=2 · leaf custody · regen enforcement.
