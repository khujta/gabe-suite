# Investigation brief — the Testing Command Center (+ ticket board)

- **Opened:** 2026-07-10, operator direction after an Anthropic conference (2026-07-09 evening): "coding is not the bottleneck anymore — they are doubling down on testing." More talk-derived points will follow from the operator; this brief covers the first and largest one.
- **Mode:** ANALYZE + OPTIONS first. The deliverable is an options report the operator decides from — pros/cons faced against HIS usage and experience. No build until the operator picks; frontend look-and-feel feedback comes at decision time, not before.
- **Prior art pattern:** this folder follows the 2026-07-07 workflow-enhancement investigation shape (BRIEF → threads → external scan → options report with receipts).

## The problem (operator's words, condensed)

Testing exists (suites, coverage, journeys, proof artifacts) but the HUMAN operating it has no
command center: a per-project, graphic HTML site showing what testing exists and how it went —
**different levels** (unit / integration / e2e / journey), **different dimensions** (feature areas,
platforms, coverage), pass/fail state, with **progressive disclosure**: double-click down from the
big picture to an individual test for granular inspection, and navigate across sections. "As a
human, I have a super limited context window to read my files — translate the testing suites,
coverage, and progress into something graphic."

Plus a second missing abstraction: **a board with tickets** (operator has used Jira and Trello;
open to better). Progress and work items as a board, not as files to read.

## Locked constraints (operator answers, 2026-07-10)

1. **Data scope: EVERYTHING, deep-linked.** Tests + coverage + the KDBP layer (phases, per-phase
   `proof`, review verdicts, PENDING) — every claim deep-links to its artifact (screenshot, run
   log, spec file). Progressive disclosure is the core UX requirement.
2. **Board families: research all three EQUALLY** (no leaning yet):
   (a) KDBP-native — the board as a rendered VIEW over PLAN.json/PENDING/review debt (no double
   bookkeeping; no drag-drop unless write-back is built);
   (b) self-hosted OSS trackers (candidates to evaluate: Plane, Taiga, Focalboard, Vikunja,
   WeKan, Kanboard, Gitea/Forgejo issues+projects) synced from KDBP;
   (c) SaaS (Jira, Trello, Linear) synced.
   For (b)/(c): weigh sync-drift honestly — the suite's own history shows double bookkeeping
   regrows files (the reason KDBP-lite exists).
3. **Freshness: static, regenerated** at checkpoints (test runs / commits / CI) — the docsite
   pattern; renders from disk; zero standing infrastructure.
4. **Audience: local now, deployable later** — self-contained output so publishing beside the
   staging apps later is trivial. One site per project (ideal); a separate application is
   acceptable if clearly better.
5. **Prefer existing/OSS over building** — "maybe someone else has been in these same crowds and
   has developed some solutions." Build only the glue that doesn't exist.
6. **Guinea pig: gustify.** HARD RULES: do NOT modify the application code. MAY: create and
   execute tests, and modify the gustify docs website (`docs/site/`, the Cifra-shell system) —
   the command center can integrate there or be a new sibling site.
   *(Round-1 broadening, 2026-07-10: the ENTIRE testing surface is writable — test configs,
   test dependencies, test infrastructure, up to a full testing-suite overhaul. Only the
   application itself stays untouched.)*
7. **Do NOT grow the GitHub Actions pipeline** (round 2, 2026-07-10): the repo is private and
   the CI minutes quota has been exhausted before. New test wiring (storybook project, audits)
   and the center's regeneration run LOCALLY; CI additions only with explicit operator sign-off.
8. **No user-level Gemini generation** (round 2, 2026-07-10): Gemini recipe generation is being
   deprecated; remaining pieces in the app will be removed. All recipes are generated IN-HOUSE
   (cloud session / project skill). Validation for that in-house pipeline: TBD, not decided.

## What already exists (build on, don't reinvent)

- **Machine-readable sources, all landed 2026-07-09/10:** `PLAN.json` (phases/cells/tier/proof),
  thin `LEDGER.md` (one row per checkpoint incl. review verdicts + gate results),
  `PENDING.md` rows, `.kdbp/archive/evidence-bypass.log`, `tests/web-e2e/proof/<feature>/manifest.json`
  (committed living proof set), `tests/web-e2e/artifacts/**` incl. the runner's own
  `run-status.json` + numbered screenshots, capture-mode MP4s, `journey-groups.json`
  (groups → specs, shared local/CI), coverage outputs (pytest-cov / vitest / istanbul HTML),
  Playwright's JSON/HTML reporters.
- **The docsite convention C1–C9** (claims-with-receipts, `data-verify-*` DOM, page manifests,
  provenance stamps) — the command center is plausibly "C9 at project level" + the 0.5b
  per-project doc-hub idea, finally built.
- **gabe-docsite** (the suite's site generator skill) and gustify's existing `docs/site/` shell.
- The Evidence Doctrine (`gabe-docs/references/evidence-doctrine.md`) — §6 already declares
  evidence doubles as docs; the command center is the reading surface for that.

## Threads

- **T1 — Existing test-dashboard OSS scan:** Allure Report (multi-framework, history, categories),
  ReportPortal (heavy, service-based), Playwright's HTML reporter, vitest UI, coverage HTML
  renderers, xunit-viewer, test-observability SaaS (Currents, Argos CI) — for each: how close to
  "everything deep-linked + progressive disclosure + static regeneration", composability into one
  per-project site, cost of adoption, what it CANNOT show (the KDBP layer).
- **T2 — Board options** per constraint 2, all three families, with a working-model sketch each
  (where tickets live, what syncs, what drifts, what the operator's daily flow looks like).
- **T3 — The aggregation schema:** what single manifest unifies pytest/vitest/playwright/coverage
  runs + KDBP state for a static renderer; how much of it `run-status.json` + proof manifests +
  PLAN.json already are; where the generator lives (extend gabe-docsite? a new suite skill? a
  per-project script like gustify's journey docs regen?).
- **T4 — Progressive-disclosure UX patterns** (catalog only — the operator gives frontend
  direction at decision time): suite → group → spec → test → artifacts drill; how Allure/others
  solve it; what the Cifra shell can host.

## Deliverables

1. `output/01-options-report.md` (+ an HTML rendering per house style if useful): the options,
   each priced against the constraints and the operator's usage; a fit matrix; ONE recommendation
   with receipts; the decision points the operator must rule on.
2. `output/02-spike-plan.md`: for the recommended option (and the runner-up), the smallest
   gustify spike that proves it — respecting the hard rules (no app-code changes; tests +
   docs-site only).
3. Anything encoded later (skills/scripts) follows the house rules: suite repo first, install.sh,
   doctor CLEAN, evidence logged.

## Anti-goals

- No standing services as a REQUIREMENT (static-first; a service is only acceptable inside option
  families that need it, priced as a con).
- No double bookkeeping without naming the sync-drift cost.
- No frontend bikeshedding in the options phase — patterns catalogued, decisions deferred.
- No app-code modifications in gustify, period.

## Two-session working model (operator, 2026-07-10)

Two parallel sessions: THIS suite session line (research + suite work) and a refreshable gustify
session (project work). Cross-session communication is file-based:
- Suite side: `docs/investigations/2026-07-10-testing-command-center/COMMS.md` (this folder).
- Gustify side: `.gabe-dogfood/COMMS.md` (gitignored) for ephemeral cross-talk; `.kdbp/HANDOFF.md`
  stays the durable resume channel.
- Convention: check the other repo's COMMS file at session start and before big moves; entries
  are dated, newest first, tagged `FROM/TO`.
