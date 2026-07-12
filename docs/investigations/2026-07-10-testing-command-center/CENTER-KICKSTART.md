# Command-center BUILD kickstart — paste this into a FRESH session in GUSTIFY

> Generated 2026-07-10 at the close of the suite-side research phase (7 operator rounds, all decisions locked).
> Launch in `/home/khujta/projects/apps/gustify`. The suite investigation folder is read-only reference:
> add it if needed via `claude --add-dir /home/khujta/projects/gabe_lens`.

---

Build the **Testing Command Center spike** for gustify — a static, light-only, "Station Card"-skinned
site subtree at `docs/site/center/` rendering the whole testing estate + the KDBP layer, per the
fully-decided plan. **You are PORTING approved designs and executing a consolidated plan — do not
redesign, do not re-open decisions.**

READ FIRST (in order):
1. `.gabe-dogfood/COMMS.md` (here) + the suite side
   `gabe_lens/docs/investigations/2026-07-10-testing-command-center/COMMS.md` — the baton and its
   round-6 amendment (LIGHT-ONLY supersedes the toggle mention in the older baton entry).
2. `gabe_lens/docs/investigations/2026-07-10-testing-command-center/output/02-spike-plan.md` —
   **plan v2, self-contained** (addenda already folded in; steps A0–A9, acceptance, stop-loss).
3. `output/05-skin-spec.md` — **FINAL skin = J "Station Card"** (tokens + 13 rules: two-voice type,
   state left-rails, tab-chip headers; LIGHT-ONLY — no toggle, no media query).
4. The layout references (port these, pixel-for-spirit): the FOUR multi mockups **viewed in skin J** —
   `output/mockups/center-hub-multi.html` (hub incl. the three lenses: risk/levels/recency) ·
   `center-board-multi.html` · `center-tests-multi.html` · `center-drill-multi.html`. Skin source =
   `center-skins.css` base + `[data-skin="j"]` block (collapse to defaults; the skin-switcher is
   mockup-only tooling, do not port it).
5. `.kdbp/HANDOFF.md` (current gustify state — DL1 is the queued product phase).
6. Copy the icons: `gabe_lens/.../output/assets/icons/kind-*.png` → the center's assets
   (6 PixelLab icons; keep `image-rendering: pixelated`).

FIRST ACTIONS (lifecycle before code):
1. **Ask the operator the one open sequencing question:** CC1 (this spike) before DL1, or DL1 first?
   (Suite recommendation on record: CC1 first — 2–3 sessions, decisions hot, DL1 benefits from the center.)
2. `/gabe-plan`: open phase **CC1 — "testing command center spike"**, tier `mvp`,
   `types: ["tooling","docs"]`,
   `proof: "center: file://docs/site/center/index.html renders hub→board→tests→leaf; journey-group totals match run-status.json"`.
   Without this, /gabe-next routes to DL1 and the evidence gate checks the wrong phase.

TASK: execute **A0 → A9** from spike plan v2, in order, each step independently verified, checkpoint
commits per the house lifecycle (/gabe-commit gate runs; accept-and-log any WARN, never bypass).
Summary of the steps (the plan is binding, this is just the map): A0 pre-flight (resolve the
README-vs-LEDGER api-loop-500 conflict; docs-budget sanity check) · A1 generator + hub · A2 board ·
A3 journey-groups becomes the single grouping source (delete/derive the FAMILIES duplicate) ·
A4 junitxml for pytest+vitest (tests/results/ gitignored) · A5 history JSONL (committed, capped 50) ·
A6 coverage as normal dev-deps · A7 Playwright JSON reporter · A8 regen wiring + provenance stamp ·
A9 local runner for the orphan suites (storybook/pip-audit/npm audit) + last-run dates on the pages.

HARD RULES (all locked by the operator — violations are plan failures):
- gustify **application code untouched**. Writable: `tests/`, `docs/site/`, `scripts/` (doc-generator
  layer), and test configs/deps anywhere (`pyproject.toml` dev extras, `vitest.config.ts`,
  `playwright.config.ts`) per broadened D1.
- **ZERO new GitHub-Actions steps** — the CI pipeline must not grow (private repo, minutes constraint).
  Everything runs locally.
- **Anti-curation guardrail:** pages render only machine-derived data (PLAN.json, PENDING.md, LEDGER.md,
  journey-groups.json, run-status, junit XML, coverage JSON). The ONLY editorial artifact allowed is one
  `center.config.json` (area→criticality-tier map, ~20 lines).
- **Skin:** Station Card (J) LIGHT-ONLY per 05-skin-spec.md. IDs derive from names, never run data.
  Section style: title + italic analogy subtitle + one worked example (the allergy-thread pattern).
- OSS leaf reports (coverage HTML, Playwright report) are LINKED, never reskinned or rebuilt.
- gastify untouched; the suite (`skills/`, `install.sh`, `~/.claude`) untouched — Wave-2 owns promotion.

STOP-LOSS: if A0–A3 exceed one session, HALT, write findings to `.gabe-dogfood/COMMS.md`, and stop —
the suite session reassesses against the pre-priced fallback (Allure single-file, plan §Spike B).

RUNBOOK: model routing (operator standard) — Fable for planning/judgment/synthesis; Sonnet 5 for
mechanical subagent work. Evidence style E2 (commands + what they showed). Report progress and
completion (per-step one-liners + final acceptance checklist result) to `.gabe-dogfood/COMMS.md`,
newest first — the suite session reads it. Durable state stays in `.kdbp/` (PLAN/LEDGER/HANDOFF).

ACCEPTANCE (from plan v2 — the spike passes when all 7 hold): file:// renders all 4 altitudes in the
locked skin · zero new editorial tables · journey-groups.json is the only grouping source · live-probe
screenshot refresh preserved · anchors stable across regens · gabe gates pass (WARNs accepted-and-logged)
· CC1's proof holds and its cells advance through the normal lifecycle.
