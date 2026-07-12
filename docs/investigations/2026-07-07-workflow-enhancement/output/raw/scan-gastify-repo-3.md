# Gastify Repo Scan Report

Scope: `/home/khujta/projects/apps/gastify` (read-only). Section 6 draws lightly on a read-only peek at the sibling repo `/home/khujta/projects/apps/gustify` for comparison — neither repo was modified.

---

## 1. `design-lab/` — React + Storybook mockup workspace

**What it is:** a self-contained React 19 + Vite + Storybook 10 + Tailwind 4 workspace (`design-lab/package.json`, name `gastify-design-lab`). It is **not** part of the shipping app — it's the design system's source of truth, built under the parallel plan `.kdbp/PLAN-MOCKUPS.md` (separate from `.kdbp/PLAN.md`, the real-app plan).

**Structure** (`design-lab/src/`):
- `design-system/atoms/` (42 files), `molecules/` (78), `organisms/` (14) — the component library, each with colocated `*.stories.tsx`.
- `design-system/_design/TokenShowcase.tsx` + `Tokens.stories.tsx` — the design-tokens showcase.
- `features/{auth,groups,history,home,notifications,purchases,scan,settings,spending}/` — screen-level compositions (108 files total across 9 feature folders).
- `lib/`, `styles/`, `.storybook/main.ts` (port **6008**), `scripts/` (token-CSS generator, story-baseline check, screenshot capture, PixelLab icon generation).

**Scale:** 271 source files, **99 `.stories.tsx` files** (matches `.kdbp/HANDOFF.md`'s "99/99 stories" audit). Token source of truth is `shared/design-tokens.ts` (one level up, shared with `web/`).

**Relation to `frontend/`/`web/`:** design-lab is presentational-only (no data layer, no backend). Per `README.md` ("Spike Workflow") every component goes through A/B/C/D `_spikes/` iteration before folding into production — no live `_spikes/` dir currently (spikes get archived after landing). `.kdbp/docs/mockups/WEB-MIGRATION.md` documents design-lab as "Phases 1–10: 76 components · 40 screens · 4 flows · 222 storybook tests" that is now being **ported screen-by-screen into `web/`** (the "Playful Geometric" design system migration, PLAN.md phases W1–Wf then DF1–DF6). Git shows 73 commits touching `design-lab/`, most recent **2026-07-07** — actively maintained, one day stale relative to "today" (2026-07-08).

Notably, `design-lab/public/gustify-icons/` (4 PNGs) sits alongside `design-lab/public/pixel-icons/` (234 PNGs). This is **not** an accidental leak from the sister app — it backs a real feature: a "Vinculado con Gustify" (linked-with-Gustify) icon shown on history rows (`design-lab/src/design-system/molecules/HistoryItemRow.tsx:38`, `design-lab/src/design-system/assets/PixelIcon.tsx:16-19`), i.e. gastify's UI has a deliberate cross-app-link affordance to the sibling Gustify app.

---

## 2. `.kdbp/` — KDBP state directory

Root files (22 top-level + 3 subdirs), with mtimes relative to "today" (2026-07-08):

| File | Last modified | Staleness | Summary |
|---|---|---|---|
| `HANDOFF.md` | 2026-07-08 19:20 | fresh (today) | Singleton session-handoff. Resume prompt for Epic 5 (Storybook reconciliation), Phase 30 "SB1 design-lab cleanup". Records last-shipped work (trends fidelity P105), a 99-story audit scorecard, and exact next commands to run. |
| `LEDGER.md` | 2026-07-08 19:18 | fresh | 996 KB append-only tool-call + commit + push log. Every file write, review, checkpoint, and deploy event, going back to project start (2026-04-22). |
| `PLAN.md` | 2026-07-08 19:17 | fresh | 34-phase active plan. Currently mid-migration: porting the "Playful Geometric" design system from `design-lab/` into `web/`, phase-by-phase (W1–Wf done, DF1–DF6 in progress, plus an SL location-intelligence track and a CA0–CA10 IA-governance epic). |
| `DEPLOYMENTS.md` | 2026-07-08 19:05 | fresh | 77 KB append-only push/CI/deploy log, 105 rows (P1–P105). Every successful push to production with CI result + verification evidence. |
| `PENDING.md` | 2026-07-08 19:05 | fresh | 111 KB deferred-findings log. 55 rows currently `open` (P112–P119 most recent, from a 2026-07-01 gabe-myopic UX walk — quota honesty, statement action integrity, a consent-enforcement gap flagged TRIAGE URGENT, etc.). |
| `PUSH.md` | 2026-07-07 19:28 | fresh | `/gabe-push` config — remote `origin`, default env `production`, single environment (`production` → `main`). |
| `DECISIONS.md` | 2026-07-06 17:28 | fresh | 256 KB architecture decision log, ~107 entries (D1…D109). Extremely fine-grained — e.g. D106–D109 alone document a multi-day IA restructuring (Compras vs Historial tabs) with full context/decision/consequence per entry. |
| `ROADMAP.md` | 2026-07-03 16:38 | ~5 days | v1.7, 15 REQ-phases + 5 post-launch epics, derived from SCOPE.md. All P1–P16 foundation/feature-parity phases marked `completed`. |
| `KNOWLEDGE.md` | 2026-06-30 15:14 | ~1 week | Human-knowledge map with "Gravity Wells" (architectural sections) populated by `/gabe-teach`. |
| `STRUCTURE.md` | 2026-06-30 15:14 | ~1 week | 16 KB allowed-file-location patterns, one section per app surface (Backend, Frontend Web, Mobile App, Infrastructure, Receipt Prompt Lab, UX Mockups, Mockup Test Harness, legacy `Frontend`, Design Lab). This is the clearest single source for the frontend/web/design-lab relationship (see §3/§6).
| `W7-BLUEPRINT.md` | 2026-06-30 15:14 | ~1 week | Captured 2026-06-26; blueprint for the W7 analytics chart-engine swap (Recharts → hand-built donut/treemap + ECharts Sankey). Since executed (P93, P105). |
| `PLAN-MOCKUPS.md` | 2026-06-30 15:14 | ~1 week | 83 KB — the parallel mockup-lane plan driving `design-lab/` (DM-1…DM-34), explicitly kept separate from `PLAN.md`. |
| `MOCKUP-VALIDATION.md` | 2026-04-28 10:50 | ~2.5 months | Last automated mockup-validation run — 0 findings. Effectively superseded once `design-lab/` (React) replaced the legacy HTML mockup track. |
| `DEVIATIONS.md` | 2026-05-24 11:40 | ~1.5 months | Short table of implementation-variance notes vs PLAN (e.g. React 19 shipped instead of PLAN's "React 18"). |
| `BEHAVIOR.md` | 2026-05-24 11:02 | ~1.5 months | Project identity/frontmatter (domain, maturity=mvp, tech stack) + behavior rules (B1 "inventory before proposing", etc.). |
| `ENTITIES.md` | 2026-04-24 12:35 | ~2.5 months | Principal entities (Receipt, Transaction, Item, Statement) mapped to REQs; stated "last updated 2026-04-24" — genuinely stale, pre-dates most feature work. |
| `AUDIT-suite-anti-sprawl.md` | 2026-04-27 16:21 | ~2.5 months | One-off meta-audit of the Gabe/KDBP suite's own anti-sprawl enforcement layers (hooks / KDBP files / commands). Point-in-time, not meant to be refreshed. |
| `MOCKUP-VALIDATION.md`, `MAINTENANCE.md`, `DOCS.md`, `VALUES.md` | Apr 22–28 | ~2.5 months | Small static scaffolding files from `/gabe-init`; `VALUES.md` holds 4 project values (V1–V4, all AI-pipeline related); `DOCS.md`'s source→doc drift table is empty (no rows added since init). |
| `SCOPE.md` | 2026-04-23 13:56 | ~2.5 months | 63 KB, `status: finalized`, v1 — the immutable project premise, intentionally unchanged since authoring (by design; only `/gabe-scope-change` may edit it). |
| `scope-references.yaml` | 2026-04-22 17:37 | ~2.5 months | Reference-frame audit trail from scope authoring. |

Subdirectories: `archive/` (25 completed-plan snapshots + a tombstones dir), `reviews-archive/` (46 resolved/stale/superseded `/gabe-review` reports, 2026-04-24 → 2026-06-10), `research/archive/` (scope-authoring research).

**Overall staleness pattern:** the *durable* files (HANDOFF, LEDGER, PLAN, DEPLOYMENTS, PENDING, DECISIONS) are updated same-session and are current as of today. The *low-inertia-by-design* files (SCOPE, ENTITIES, scope-references, VALUES) are correctly untouched since project inception — that's their intended behavior, not neglect.

---

## 3. Frontend structure — `frontend/`, `web/`, `mobile/`

Gastify has **three** frontend-adjacent app surfaces plus the design-lab from §1, and `.kdbp/STRUCTURE.md` documents each as a distinct section (lines 66, 99, 191).

### `web/` — the live production app (current, active)
- `web/package.json` → name `"web"`, React 19 + Vite + **TanStack Router** (file-based routes) + TanStack Query + Zustand + Firebase auth, Tailwind 4.
- Routes at `web/src/routes/*.tsx` (32 route files: index/dashboard, transactions[.index/.new/.$id], items, trends, reports, scan[-batch], statements, groups, invite.$token, notifications, settings + 8 subviews, sign-in, category.$key).
- Components in `web/src/components/`, hooks in `web/src/hooks/`, API client generated from the backend's OpenAPI spec (`npm run generate:api` pulls from `../backend`).
- **No Storybook** in `web/` (`grep -i storybook web/package.json` → no match). It does share `check:token-classes` / `generate:tokens` scripts with design-lab.
- 194 source files. Last commit: **2026-07-08 18:53** (today) — this is the actively-shipped surface; `.kdbp/DEPLOYMENTS.md` records 105 production deploys against it.

### `frontend/` — legacy, effectively dead
- `frontend/package.json` → name `"gastify-frontend"`, version `0.1.0-mock.0`. React + Vite + Biome + Storybook (port **6007**) + a mocked Firebase SDK shim layer (`frontend/src/__firebase-mocks__/`).
- `.kdbp/STRUCTURE.md:191-214` labels it explicitly: **"Frontend (React + Vite + TS — port of BoletApp)"**, describing it as an "Operational React app... Mocked Firebase backend... Source-of-truth for the L-block extraction (mockups-legacy/)".
- 938 source files (larger than `web/`!) but it's the earlier, mock-backed rebuild attempt that both `web/` and `design-lab/` superseded.
- Last commit touching it: **2026-05-31** — over 5 weeks stale relative to today, no longer receiving work.
- `.kdbp/PENDING.md` rows P13/P14 reference `frontend/` build/README fixes from the "Ladle pivot" era (2026-04-28), itself since abandoned in favor of Storybook.

### `mobile/` — active native app
- `mobile/package.json` → name `"gastify-mobile"`, Expo + React Native + Firebase Auth (native modules, not Expo Go), EAS build profiles, Jest/RNTL, **Maestro** E2E on physical Android hardware (Samsung S23 via WSL `usbipd-win`).
- Structure: `mobile/src/{components,hooks,lib,navigation,providers,screens,stores,test,types}` — 137 files.
- Last commit: **2026-07-06** — actively maintained (2 days stale, in normal working range).
- Companion E2E harness lives outside the app at `tests/mobile/` (Maestro flows, fixtures, doctor scripts).

### No storybook/mockup tooling in `mobile/`
Storybook exists only in `frontend/` (6007, legacy) and `design-lab/` (6008, active). `web/` and `mobile/` consume finished components without a showcase tool of their own.

**Net relationship:** `design-lab/` is the design source of truth → being ported phase-by-phase into `web/` (the real shipping app) per `.kdbp/PLAN.md` + `docs/mockups/WEB-MIGRATION.md`. `frontend/` is a superseded, mock-backed rebuild dead-end kept around but not developed further. `mobile/` is a fully separate native codebase sharing only the backend contract (not UI components) with `web/`.

---

## 4. Test/proof infrastructure

### Playwright configs (two, at different scopes)
- **`playwright.config.ts`** (root) — drives the *legacy mockup* test trees: `tests/mockups/**` (served from `docs/mockups` on :4173), `tests/mockups-legacy/**` (from `docs/mockups-legacy` on :4176), and `tests/storybook/**` (against `frontend`'s Storybook on :6007). Three separate `http-server` static servers as `webServer` entries.
- **`tests/web-e2e/playwright.config.ts`** — drives real-browser E2E against the live `web/` app (`vite --mode staging-e2e --port 5173`, real EventSource/SSE). Notably its own comment flags a port-collision risk with a **sibling project**: *"Overridable port: other projects' dev servers (e.g. **gustify**) also default to 5173"* — direct in-repo evidence the two apps are developed side-by-side on the same machine.

### Report/results directories
- `playwright-report/` — root-level HTML report (single `index.html`, from the legacy-mockup config).
- `test-results/` — currently empty (transient, gitignored).
- `tests/web-e2e/proof/` — **248 committed screenshot files**, `.kdbp/STRUCTURE.md:24` explicitly force-adds these past `.gitignore` for visual-regression history. Mostly feature-named subfolders (`bars/`, `batch-ops/`, `batch-scan/`, `ca-ia-consolidation/`, `ca-report-consolidation/`, …) rather than date-named, except one dated exception: `tests/web-e2e/proof/2026-07-05-docsite/`.
- `tests/mobile/results/{latest,runs,archive}/{local,staging,staging-e2e}/` — mobile Maestro/Playwright evidence. `archive/` **is** date-stamped: `20260520T191623Z-legacy-pre-run-folder`, `20260521-phase3-ledger-edit-debug`, `20260521-phase3-scan-to-transaction-debug`, `20260521-phase4-signout-push-debug`.
- `.playwright-mcp/` — dozens of `console-<ISO-timestamp>.log` files (2026-04-27 onward) from interactive Playwright-MCP debugging sessions, not part of the automated suite.
- Mobile also has a dedicated `MOBILE.md`-referenced evidence dir `tests/mobile/artifacts/latest/...` for Maestro screenshots (gitignored, currently absent on disk — regenerated per run).

### Firebase/firepit logs (stale, gitignored, untracked)
- `firebase-debug.log` (43 KB, dated **2026-05-18**) and `firepit-log.txt` (7 KB, same date) sit at repo root. Both are one-off Firebase-CLI install/debug artifacts (`firebase projects:list` command trace; firepit package-list dump). Neither is git-tracked (`*.log` and an explicit `firepit-log.txt` rule in `.gitignore`) — dead local clutter, not live infra.

### CI (`.github/workflows/`)
- `ci.yml` — jobs: `web-typecheck`, `web-lint`, `web-test`, `web-build`, `mobile-typecheck`, `mobile-test`, `mobile-api-drift`, `mobile-audit`, `backend-test`, `backend-typecheck`, `security-gitleaks`, `security-sca`, `custom-gates` (DEPLOYMENTS.md rows describe these as "14/14" checks including secret-scanning/GitGuardian gates not fully enumerated by the grep above).
- `retention.yml` — scheduled/`workflow_dispatch` purge job (log/artifact retention).

---

## 5. `CLAUDE.md` + `MOBILE.md` content summary

**`CLAUDE.md`** (3.3 KB) — almost entirely the standard `/gabe-init` KDBP boilerplate: 1-line domain blurb ("Chilean smart expense tracker... Rebuild of BoletApp"), a "what to read when" table pointing at each `.kdbp/*.md` file, the active gabe-* command list, 5 invariants (no raw commits, PLAN-before-code, STRUCTURE-before-placement, VALUES-override-defaults, verified-topics-trump-re-derivation), and pointers to suite skills/commands under `~/.claude/`. There is **no custom project-specific section** below the `<!-- Content above this line is managed by /gabe-init -->` marker — everything is generic scaffolding.

**`MOBILE.md`** (9.9 KB) — a detailed hands-on runbook for the physical-device Android E2E lane (Samsung S23 over WSL `usbipd-win` + native ADB + Expo dev client + Maestro), covering setup, spin-up/shutdown checklists, staging E2E auth config, and the Firebase Auth Emulator fallback. Its "**Resume Next Session**" header is explicitly dated **2026-05-15** ("Phase 1 Android physical-device automation is green... Phase 1 still needs review/commit/push before advancing to Phase 2") — this is stale by roughly 8 weeks: `.kdbp/ROADMAP.md` shows the whole mobile MVP phase (P4) as `completed` long ago, and `mobile/`'s last commit is 2026-07-06. The step-by-step commands (doctor/attach/maestro scripts) are likely still mechanically valid, but the "current state" framing at the top has not been refreshed to match the mobile app's actual progress.

Also worth flagging: root `README.md` (98 lines) is even more stale than `MOBILE.md` — it states *"Current KDBP work is P5 Statement Reconciliation + Cards"*, lists "Component showcase: ladle" and "Frontend: React 18", none of which match current reality (KDBP is on Epic 5 / Phase 30+ of 34, Storybook replaced ladle, `web/`'s `package.json` shows React 19). This is a real doc-drift gap between the fast-moving `.kdbp/` state and the human-facing root docs.

---

## 6. Comparison to `gustify` (twin-divergence signals)

Both apps are explicitly sibling projects by the same author/org: gustify's `CLAUDE.md` states *"Sister app to **Gastify/Boletapp** (expense tracker) — reads user receipt items via the cross-app catalog-exchange API"* (`/home/khujta/projects/apps/gustify/CLAUDE.md:5`), and gastify's design-lab ships a "Vinculado con Gustify" cross-link icon feature (see §1). Both use the same Gabe/KDBP suite (`.kdbp/` with matching filenames), the same core stack shape (FastAPI+Postgres+SQLAlchemy+Alembic backend, React+Vite+TanStack+Zustand frontend, Expo+RN mobile), and the same CI/Playwright/DECISIONS.md-style conventions — this is clearly one operator's parallel-app pattern, not independent codebases.

**Monorepo layout — the biggest structural divergence:**
- **gustify** uses a true `apps/` monorepo: `apps/api/`, `apps/web/`, `apps/mobile/` (`/home/khujta/projects/apps/gustify/apps/*`), plus top-level `alembic/`, `alembic.ini`, `shared/`, `docker-compose.yml`, `Dockerfile`, `railway.json` at repo root (single API root, no `backend/` prefix).
- **gastify** is a flatter, un-namespaced layout: `backend/`, `frontend/`, `web/`, `mobile/`, `design-lab/`, `shared/` all sit directly at repo root — no `apps/` wrapper at all.
- Direct evidence gastify's `.gitignore` still carries **dead gustify-shaped entries**: `apps/web/dist/`, `apps/web/dist-ssr/`, `apps/web/storybook-static/` (`gastify/.gitignore:43-49`) — paths that only make sense under gustify's `apps/` layout and match nothing in gastify's actual tree. Strong evidence the `.gitignore` was copy-started from gustify (or a shared template) and never fully re-pathed.

**Frontend/design duplication — gastify has it, gustify doesn't:**
- gastify carries **three** frontend-ish surfaces (`frontend/` legacy, `web/` live, `design-lab/` mockup lab) plus a *fourth* legacy HTML mockup track (`docs/mockups/`, `docs/mockups-legacy/`) still served by the root Playwright config.
- gustify's `apps/web/` is the **single** frontend app, and it has Storybook **built directly into it** (`apps/web/package.json`: `"storybook": "storybook dev -p 6006"`) rather than split into a separate design-lab package. There is no `design-lab/`-equivalent directory anywhere in gustify.
- Port convention drift as a consequence: gustify Storybook = 6006 (in `apps/web/`); gastify Storybook exists twice, at 6007 (`frontend/`, legacy) and 6008 (`design-lab/`, active) — the numbering suggests gastify's ports were assigned later/around gustify's, consistent with them running concurrently on the same dev machine (also literally called out in `tests/web-e2e/playwright.config.ts`'s comment about port 5173 collisions with "gustify").

**Mobile maturity — inverted between the two:**
- gustify's `apps/mobile/` is an intentional **placeholder**: `apps/mobile/SCAFFOLD-TODO.md` states *"Status: B0 placeholder. Full Expo init deferred"* — it holds only a README + TODO, no real Expo scaffold yet.
- gastify's `mobile/` is fully built out (137 source files, real Expo/RN app, Maestro hardware E2E lane, last commit 2026-07-06) — gastify is materially further along on the mobile surface than its sibling.

**Backend location:** gustify's Alembic lives at repo root (`alembic/`, `alembic.ini` sibling to `apps/`), decoupled from `apps/api/`; gastify's Alembic lives nested inside `backend/alembic/` — another naming/nesting divergence consistent with gastify's flatter, non-`apps/`-wrapped convention.

**CLAUDE.md depth:** gustify's root `CLAUDE.md` is ~12 KB with a full custom preamble (What is Gustify, Repo Origin/legacy-provenance section, stack table, "Never import legacy" enforcement note) *before* the KDBP marker at line 113; gastify's root `CLAUDE.md` is ~3.3 KB and is almost entirely the generic `/gabe-init` KDBP scaffolding with no comparable custom preamble — gastify's project-specific narrative instead lives in `README.md` (itself stale, see §5) and `.kdbp/BEHAVIOR.md`'s frontmatter rather than in `CLAUDE.md` proper.

---

### Key file paths cited (for follow-up)
- `/home/khujta/projects/apps/gastify/design-lab/package.json`, `/home/khujta/projects/apps/gastify/design-lab/README.md`, `/home/khujta/projects/apps/gastify/design-lab/.storybook/main.ts`
- `/home/khujta/projects/apps/gastify/.kdbp/HANDOFF.md`, `/home/khujta/projects/apps/gastify/.kdbp/PLAN.md`, `/home/khujta/projects/apps/gastify/.kdbp/STRUCTURE.md`, `/home/khujta/projects/apps/gastify/.kdbp/DECISIONS.md`, `/home/khujta/projects/apps/gastify/.kdbp/DEPLOYMENTS.md`, `/home/khujta/projects/apps/gastify/.kdbp/PENDING.md`
- `/home/khujta/projects/apps/gastify/frontend/package.json`, `/home/khujta/projects/apps/gastify/web/package.json`, `/home/khujta/projects/apps/gastify/mobile/package.json`
- `/home/khujta/projects/apps/gastify/playwright.config.ts`, `/home/khujta/projects/apps/gastify/tests/web-e2e/playwright.config.ts`, `/home/khujta/projects/apps/gastify/tests/web-e2e/proof/`, `/home/khujta/projects/apps/gastify/tests/mobile/results/archive/`
- `/home/khujta/projects/apps/gastify/.github/workflows/ci.yml`
- `/home/khujta/projects/apps/gastify/CLAUDE.md`, `/home/khujta/projects/apps/gastify/MOBILE.md`, `/home/khujta/projects/apps/gastify/README.md`
- `/home/khujta/projects/apps/gastify/docs/mockups/WEB-MIGRATION.md`
- `/home/khujta/projects/apps/gastify/.gitignore` (lines 43-49, 164)
- Comparison: `/home/khujta/projects/apps/gustify/CLAUDE.md`, `/home/khujta/projects/apps/gustify/apps/{api,web,mobile}/`, `/home/khujta/projects/apps/gustify/apps/mobile/SCAFFOLD-TODO.md`
