# Gabe Suite — Altitude Inventory

Scan of `/home/khujta/projects/gabe_lens` (read-only). All paths absolute-relative to that root unless marked `~/.claude/…`.

---

## 1. `commands/` — 22 files, 7,342 total lines

| # | File | Lines | References | Hardcoding flags |
|---|---|---:|---|---|
| 1 | `commands/gabe-align.md` | 83 | `skills/gabe-align/SKILL.md`, `VALUES.md`, `templates/architecture-principles.md` | none notable |
| 2 | `commands/gabe-assess.md` | 67 | `skills/gabe-assess/SKILL.md` | none |
| 3 | `commands/gabe-commit.md` | 757 | no dedicated skill (logic lives in the command file itself); `gabe-docs/SKILL.md` render-convention | tool names: `ruff`, `mypy`, `bunx biome`, `tsc`, `pytest`, `bun test` (Python/TS only — Go/Rust/Java projects get silently skip-checked); example commit bodies use `PydanticAI`, `app/agent/triage_agent.py` |
| 4 | `commands/gabe-debt.md` | 54 | `skills/gabe-debt/SKILL.md`, `templates/architecture-principles.md`, `templates/debt-patterns/*` | **Pattern catalog is evidence-anchored to two specific external apps**: "Gastify legacy, BoletApp Epic 14c" — 11 of 11 patterns (P1–P11) cite `Gastify LESSONS R1–R6` or `BoletApp Epic 14c retro §1–3` by name |
| 5 | `commands/gabe-execute.md` | 506 | `.kdbp/PLAN.md`, `~/.claude/templates/gabe/tier-sections/*.md`, delegates to `/gabe-commit` | Model routing table names `Haiku`/`Sonnet` by task (mirrors the user's global `performance.md` model-selection rule); worked examples use `PydanticAI` |
| 6 | `commands/gabe-handoff.md` | 225 | none (self-contained state-sync spec) | Defines the **E1–E7 "Gabe execution contract"** — the *only* place this block is committed in the repo (see §4 finding) |
| 7 | `commands/gabe-health.md` | 15 | `skills/gabe-health/SKILL.md` | none — thin pointer |
| 8 | `commands/gabe-help.md` | 9 | `skills/gabe-help/SKILL.md` | none — thin pointer |
| 9 | `commands/gabe-init.md` | 385 | `~/.claude/templates/gabe/*` (BEHAVIOR/VALUES/DECISIONS/RULES/etc.), hooks in `~/.claude/settings.json` | **B1 rule text baked verbatim into every new project's `BEHAVIOR.md`** cites "Past incident (2026-04-24, gastify mockup workflow Q)"; the "Agent Application Checklist" (INTAKE→GUARDRAILS→CLASSIFY→AGENT→DISPATCH→STREAM→STATE→OBSERVE) hardcodes `Gemini Flash`, `Claude Sonnet`, `PostgreSQL + Redis`, `Langfuse`, `Prometheus`, `Linear/Slack/email` as the canonical "agent app" shape; installs `npx --yes uipro-cli` |
| 10 | `commands/gabe-lens.md` | 90 | `skills/gabe-lens/SKILL.md`, `skills/gabe-lens/SUITS.md`, `~/.claude/gabe-lens-profile.md` | none |
| 11 | `commands/gabe-mockup.md` | 181 | `skills/gabe-mockup/SKILL.md`, `docs/rebuild/ux/*` | Hardcodes React path taxonomy `apps/web/src/{design-system,features}/**`, `shared/design-tokens.ts`, alias names `@app/*`/`@design-system/*`; runs `node ~/.claude/skills/gabe-mockup/scripts/check-storybook-correspondence.mjs --web-dir apps/web`; optional `ui-ux-pro-max` dependency |
| 12 | `commands/gabe-myopic.md` | 57 | `skills/gabe-myopic/SKILL.md`, `method.md`, `examples.md` | none |
| 13 | `commands/gabe-next.md` | 144 | `.kdbp/PLAN.md`, dispatches to `/gabe-execute`/`/gabe-mockup`/`/gabe-review`/`/gabe-commit`/`/gabe-push`/`/gabe-plan` | example output uses "PydanticAI triage agent" phase name (illustrative only) |
| 14 | `commands/gabe-plan.md` | 767 | delegates tier trade-offs to `templates/tier-sections/*.md`; `templates/gabe/mockup-project-preset.md` | Line 90: **"maintained alongside gastify's `.kdbp/PLAN.md` as reference implementation."** The built-in 13-phase `--preset=mockup-project` template (Phases 5–12: auth/onboarding, "primary capture loop" with idle/processing/reviewing/saving/error states, batch/bulk + reconciliation, trends+PDF export, multi-tenant workspace/group switcher, currency settings) is shaped like a specific receipt/expense-scanning app, not a generic project |
| 15 | `commands/gabe-push.md` | 526 | `.kdbp/PUSH.md`, `.kdbp/DEPLOYMENTS.md` | Hard-depends on **GitHub CLI (`gh`)** specifically — no GitLab/Bitbucket path; assumes `main` as default-branch fallback |
| 16 | `commands/gabe-review.md` | 59 | `skills/gabe-review/SKILL.md`, `templates/architecture-principles.md`, `.kdbp/RULES.md` | none |
| 17 | `commands/gabe-roast.md` | 69 | `skills/gabe-roast/SKILL.md`, `gabe-align` VALUES gate | none |
| 18 | `commands/gabe-scope-addition.md` | 100 | `prompts/*.md` (Sonnet drafting prompts), `.kdbp/SCOPE.md`/`ROADMAP.md` | none |
| 19 | `commands/gabe-scope-change.md` | 85 | `prompts/scope-change-classifier.md` (Opus) | none |
| 20 | `commands/gabe-scope-pivot.md` | 125 | `.kdbp/archive/v{N}/` | none |
| 21 | `commands/gabe-scope.md` | 534 | `docs/gabe-scope-design.md`, `schemas/scope-session.schema.json`, `prompts/*` | Step 0.5 reference-frame scan **hardcodes a personal folder convention**: `"# If ancestor path contains refrepos/, include refrepos/docs/"` — `refrepos/` is this user's own reference-repo directory name, not a general convention |
| 22 | `commands/gabe-teach.md` | 2,504 | `skills/gabe-arch/*`, `.kdbp/KNOWLEDGE.md`, `~/.claude/gabe-arch/{STATE,HISTORY}.md` | Longest file by far (34% of all command lines). Worked examples consistently use a FastAPI + PydanticAI "incident triage" app (`app/api/main.py`, async-background-processing pattern) — consistent illustrative fiction, lower severity than the gastify/BoletApp citations above since it isn't copied into user projects |

**Cross-cutting notes:**
- Every command references `.kdbp/*` state files and the `gabe-docs/SKILL.md` "runtime output rendering convention" — that convention is duplicated as prose in nearly every command file (`gabe-commit.md:9`, `gabe-execute.md:14`, `gabe-plan.md:10`, `gabe-scope.md:23`, `gabe-teach.md:12`, etc.) rather than referenced once.
- `PydanticAI` appears as a worked-example technology in 5 files (`gabe-commit`, `gabe-execute`, `gabe-init`, `gabe-next`, `gabe-teach`) — consistent fictional example, but it means the suite's own illustrative voice is Python/agent-app-flavored even though the suite claims to be stack-agnostic.
- Real, load-bearing hardcoding (not just examples) is concentrated in **4 places**: `gabe-debt.md` (Gastify/BoletApp pattern catalog), `gabe-init.md` (B1 incident text + Agent Checklist stack), `gabe-plan.md` (mockup preset shaped like a specific app + explicit "gastify" reference-implementation citation), `gabe-scope.md` (`refrepos/` path convention).

---

## 2. `skills/` — 19 skill directories

| Skill | metadata.version | SKILL.md lines | Aux files (count / size) | One-paragraph purpose |
|---|---|---:|---|---|
| `gabe-align` | 2.1.0 | 591 | `VALUES.md` (104 ln) | Alignment guardian: shallow/standard/deep pre-flight value checks (A1–A7 structural + U*/V* user/project values) plus advisory AP1–AP13 architecture-principle checks, run manually or automatically at commit/PR checkpoints. |
| `gabe-arch` | *(none)* | 178 | `TAXONOMY.md` (97 ln) + 30 concept files (~60–140 ln each, 4–8K) under `concepts/{agent,cost,data,distributed-reliability,infra,security,web}/` | Cross-project architecture-concept curriculum (3 tiers × 7 specializations) that `/gabe-teach arch` draws on to reinforce universal patterns (retry-with-backoff, circuit-breaker, idempotency-keys, etc.) while teaching real-project changes. |
| `gabe-assess` | 1.0.0 | 292 | none | Rapid four-dimension impact assessment (blast radius, maturity scope, prerequisites, alternatives) run before agreeing to an "obvious" change; explicitly distinct from `/gabe-roast` and `/gabe-align`. |
| `gabe-commit` | *(none — wrapper)* | 35 | none | Thin command-wrapper skill that loads and executes `commands/gabe-commit.md` verbatim for hosts that route via skills instead of native slash commands. |
| `gabe-debt` | 1.0.0 | 493 | none (patterns live in `templates/debt-patterns/`) | Architectural decision-debt scanner: 11 evidence-anchored patterns (P1–P11) plus project-local rule mining, writing findings to `DECISIONS.md`/`SCOPE.md §14`/`RULES.md`/`PENDING.md`. |
| `gabe-docs` | *(none)* | 372 | `diagrams-library.md` (608 ln, 20K) | House documentation style (CommonMark, Mermaid selection, analogy-first openers) consulted by `/gabe-teach`, `/gabe-init`, `/gabe-commit`; also defines the "runtime output rendering convention" every other command references. |
| `gabe-docsite` | 1.0.0 | 88 | assets/generator/tools — 11 files incl. `mermaid.min.js` (3,587 ln / 3.5M vendored) | Publishes markdown docs onto a self-contained, `file://`-viewable static HTML site (Cifra-styled shell) — placement/rendering only, not fact-checking. **Not installed at `~/.claude/skills/` currently** (see §4). |
| `gabe-execute` | *(none — wrapper)* | 35 | none | Command-wrapper for `/gabe-execute`. |
| `gabe-handoff` | *(none — wrapper)* | 38 | none | Command-wrapper for `/gabe-handoff`; also the one place a hardcoded fallback path (`~/projects/gabe_lens/commands/…`) is baked into all 6 wrapper skills as a last-resort spec source. |
| `gabe-health` | 1.0.0 | 268 | none | Codebase health X-ray: god files, churn hotspots, coupling clusters, bug concentration, plan-vs-actual drift. |
| `gabe-help` | 1.0.0 | 227 | none | Context-aware entry point — scans project state and recommends the next Gabe command; not a static man page. |
| `gabe-lens` | 2.3.0 | 490 | `SUITS.md` (107 ln) | Cognitive-translation engine: turns concepts into analogy/map/constraint-box/one-line-handle "Gabe Blocks," adapted to a user-calibrated cognitive suit. |
| `gabe-mockup` | *(none)* | 802 | `scripts/check-storybook-correspondence.mjs` (201 ln) | Largest non-teach skill. Per-phase execution playbook for mockup projects — legacy HTML token→atom→molecule→flow→screen→handoff recipes plus React/Storybook and design-ref recipes for React-first apps. |
| `gabe-myopic` | 1.0.0 | 201 | `examples.md`, `method.md`, `reference.md` (~90–110 ln each) | Simulates a panel of 3 bounded-planning-horizon users (@1/@1.5/@2) walking a flow to surface foresight traps, overwhelm, recall demands, and no-undo dead-ends — the inverse of an expert design review. |
| `gabe-next` | *(none — wrapper)* | 33 | none | Command-wrapper for `/gabe-next`. |
| `gabe-plan` | *(none — wrapper)* | 34 | none | Command-wrapper for `/gabe-plan`. |
| `gabe-push` | *(none — wrapper)* | 35 | none | Command-wrapper for `/gabe-push`. |
| `gabe-review` | 1.4.0 | 1,294 | none | Largest fully-authored skill. Code review with risk pricing, confidence scoring, maturity-gated severity (MVP/Enterprise/Scale), interactive triage, cross-CLI merge mode, and REQ-drift checks. |
| `gabe-roast` | 1.0.0 | 303 | none | Adversarial gap review from a required (target + perspective) pair, classified by maturity level × importance, gated by a shallow `/gabe-align` pre-check. |

**Duplication vs. `~/.claude/rules/common/*.md`:**
- **Testing / coverage (`common/testing.md` — "Minimum Test Coverage: 80%"):** `gabe-commit.md` CHECK 4 independently re-declares "threshold 80%" for enterprise+scale maturity (`commands/gabe-commit.md:60-61`), and `gabe-review/SKILL.md:152` independently declares *"Only report findings with >80% confidence"* — a different 80% (confidence, not coverage) that reads as the same number doing double duty. Neither cites or reuses the global rule; both reinvent the threshold locally.
- **Code-review severity levels (`common/code-review.md` — CRITICAL/HIGH/MEDIUM/LOW → BLOCK/WARN/INFO/NOTE):** `gabe-review/SKILL.md` defines its own, more elaborate maturity-gated version: *"MVP: Only CRITICAL blocks merge / Enterprise: CRITICAL+HIGH block merge / Scale: CRITICAL+HIGH+MEDIUM block merge"* (`skills/gabe-review/SKILL.md:66-68`). `gabe-debt/SKILL.md` reuses the same CRITICAL/HIGH/MEDIUM ordering language independently. Conceptually overlapping with the global rule's approval table but not verbatim — a user reading both systems has to reconcile two severity taxonomies.
- **Git commit format (`common/git-workflow.md` — `<type>: <description>`, types `feat, fix, refactor, docs, test, chore, perf, ci`):** `commands/gabe-commit.md:633-634` re-declares Conventional Commits with its own type set `{feat, fix, refactor, chore, docs, test, perf, ci, build}` (adds `build`, drops nothing) — same convention, independently authored, not delegated to the global rule.
- **Model selection strategy (`common/performance.md` — Haiku/Sonnet/Opus routing table):** `commands/gabe-execute.md` "Model + cost" section and `commands/gabe-commit.md` "Model routing" section both re-derive a task→model table ("Haiku: mechanical/classification," "Sonnet: main development / conceptual") under the suite's own value name **"U6 — Route by Task, Not by User"** — same idea as the global rule, independently named and justified rather than pointing at it.
- **Security checklist (`common/security.md` — SQL injection / XSS / CSRF / hardcoded secrets):** minimal direct overlap found; `gabe-review/SKILL.md:899` has one example finding text ("CRITICAL — SQL injection via unsanitized input") but does not carry a standing checklist — this is the one global-rule category the suite does **not** meaningfully duplicate.
- **Agent orchestration (`common/agents.md` — planner/architect/tdd-guide/code-reviewer table):** no overlap — the Gabe Suite's commands are a parallel, non-overlapping agent/skill roster; the two systems don't reference each other at all, which is itself a gap (a user with both rule sets installed has two independent "which specialist do I invoke" tables).

---

## 3. `templates/` — `.kdbp/` init templates + expected per-project state files

`gabe-init` copies these from `~/.claude/templates/gabe/*` (installed mirror of `templates/*`) into a new project's `.kdbp/`:

| Template | Lines | Written by / for |
|---|---:|---|
| `BEHAVIOR.md` | *(generated inline in `gabe-init.md`, not a standalone template file)* | Project maturity/domain/tech + the B1 rule (contains the gastify incident citation) |
| `VALUES.md` | *(generated inline, empty scaffold)* | Project-specific values (V1–V7), user-authored after init |
| `PLAN.md` | 14 | `/gabe-plan` — active-plan state machine (Exec/Review/Commit/Push per phase) |
| `SCOPE.md` / `SCOPE.example.md` | 169 / 6,900B | `/gabe-scope` — high-inertia premise (users, SCs, REQs, posture) |
| `ROADMAP.md` / `ROADMAP.example.md` | 108 / 4,912B | `/gabe-scope` — phase plan derived from SCOPE.md |
| `DECISIONS.md` | 8 | `/gabe-debt`, manual — append-only ADR table |
| `RULES.md` | 74 | `/gabe-debt` — scar-tissue R-NN rules, read by `/gabe-review` for severity escalation |
| `PENDING.md` | 11 | `/gabe-commit`, `/gabe-review`, `/gabe-health` — deferred-item table |
| `LEDGER.md` | *(starts empty)* | every command — session/checkpoint history |
| `MAINTENANCE.md` | 12 | quarterly human checklist (secrets rotation, access review) |
| `DOCS.md` | 78 | `/gabe-commit` CHECK 7 — source-file → doc-target drift mapping |
| `KNOWLEDGE.md` | 78 | `/gabe-teach` — Gravity Wells + Topics tables |
| `STRUCTURE.md` | 109 | `/gabe-commit` CHECK 8/9 — allowed/disallowed new-file location patterns |
| `ENTITIES.md` | 56 | `/gabe-init` (mockup/hybrid only) → `/gabe-mockup` M4 CRUD matrix |
| `PUSH.md` | 74 | `/gabe-push` — env definitions (production/staging/custom) |
| `DEPLOYMENTS.md` | 24 | `/gabe-push` Step 7.5 — append-only deploy log |
| `architecture-principles.md` | 6,673B | AP1–AP13 advisory catalog, read by `/gabe-align`, `/gabe-debt`, `/gabe-review` |
| `architecture-patterns.md` | 1,674B | "patterns we use and why" ledger for agent/web apps, auto-appended by `/gabe-teach arch` |
| `scope-references.yaml` | 2,782B | `/gabe-scope` reference frame (contains hardcoded `/home/khujta/projects/refrepos/...` paths as example content) |
| `scope-session.example.json` | 2,064B | example session-state shape, validated against `schemas/scope-session.schema.json` |
| `gabe-arch-STATE.md` / `-HISTORY.md` | 1,685B / 1,012B | copied to `~/.claude/gabe-arch/` (global, cross-project) by `gabe-init` Step 1.6 |
| `gabe-lens-learning.md` | 5,095B | copied to `~/.claude/gabe-lens-learning.md` (global tailoring state) |
| `CLAUDE.md` | 2,967B | copied to **project root** (not `.kdbp/`) with `<!-- KDBP-MARKER: gabe-init v1 -->` |
| `tier-sections/*.md` (22 files) | 2.7–5.4K each | `/gabe-plan` Step 3.5 tier-decision matrix (core/data/compute/ai-agent/auth-session/etc.) |
| `debt-patterns/P1–P11.md` + `README.md` | 12 files, 2.5–4.0K each | `/gabe-debt` pattern catalog (Gastify/BoletApp evidence, see §1/§2) |
| `mockup/**` | 33 files | `/gabe-mockup` — tokens.css, tweaks.js, React/Storybook + validation scaffolds |

Every `.kdbp/`-init project therefore inherits ~24 top-level state files + 3 sub-catalogs (tier-sections, debt-patterns, mockup) as its durable memory surface — a large per-project footprint that `/gabe-init` Step 1.5 explicitly supports incrementally topping-up ("Update Mode") without overwriting user edits.

---

## 4. `install.sh` — install targets and drift risk

**Targets:** `~/.claude/` (Claude Code) and `~/.agents/` (Codex), toggled by `--claude-only`/`--codex-only`. For each enabled home it `cp -r`s:
- 13 `CORE_SKILLS` (includes `gabe-docsite`) + 6 `COMMAND_WRAPPER_SKILLS` → `<home>/skills/<name>/`
- all 22 `commands/gabe-*.md` → `<home>/commands/`
- `templates/*.{md,yaml,json}` + `tier-sections/` + `mockup/` + `debt-patterns/` → `<home>/templates/gabe/`
- curated docs → `<home>/docs/gabe-suite/`
- `prompts/` and `schemas/` → **Claude-only** (`~/.claude/prompts/gabe-scope/`, `~/.claude/schemas/gabe-scope/`) — the `/gabe-scope` family is explicitly not yet ported to Codex, a documented one-directional gap.

**Drift risk — structural:** two full copies (`~/.claude`, `~/.agents`) plus the git-tracked source in this repo means **three** live surfaces per file. Nothing detects skew automatically; `gabe-init` Step 1.6 has schema-migration logic for `.kdbp/KNOWLEDGE.md` inside *projects*, but there is no equivalent reconciliation for the *suite's own* installed copies vs. its repo source.

**Drift risk — observed, not hypothetical:** I compared the repo's committed `skills/*/SKILL.md` and `commands/*.md` against what is actually installed at `~/home/khujta/.claude/`:
- `diff` on `gabe-align`, `gabe-review`, `gabe-mockup`, `gabe-myopic` SKILL.md shows they **differ** from the repo checkout.
- The installed copies contain a **"Gabe execution contract (E1–E7)"** block (EVIDENCE / RUN-BEFORE-✅ / NO SILENT DOWNGRADE / REUSE FIRST / STATE SYNC / MISSING ANCHOR / REPORT WHERE) that is present in **17 of 18** installed skills and **18 of 22** installed commands at `~/.claude/`.
- In the git history of this repo, that block exists in exactly **one** file: `commands/gabe-handoff.md` (added in commit `0e411ad`). `git log -p --all` shows it was **never committed** for `gabe-align`, `gabe-review`, etc.
- File mtimes at `~/.claude/skills/gabe-*/SKILL.md` cluster into a batch (`gabe-arch`, `gabe-commit`, `gabe-execute`, `gabe-next`, `gabe-plan`, `gabe-push` — all `2026-07-02 22:01:04`, consistent with one `install.sh` run) plus a second, staggered batch (`gabe-align` 01:16, `gabe-myopic` 01:17, `gabe-review` 01:18, `gabe-docs`/`gabe-roast`/`gabe-assess`/`gabe-lens`/`gabe-debt`/`gabe-health` 01:20–01:21 on `2026-07-03`) consistent with a **separate, direct, per-file edit pass against the installed copies**, bypassing the repo entirely.
- `gabe-docsite` is listed in `install.sh`'s `CORE_SKILLS` array but is **not present** at `~/.claude/skills/gabe-docsite/` at all — the last install predates that array entry, so the live environment is also stale in the other direction (missing a skill the current script would install).

Net effect: the currently-running Claude Code session's skills/commands are **not** what `git log`/`git diff` would lead you to believe. The repo is not the effective source of truth for the live environment right now — someone iterated directly on the installed tree. Whatever process produced the E1–E7 rollout should either be committed back to `commands/`/`skills/` (if it's meant to be suite-wide) or the installed drift should be reset with a fresh `./install.sh` run.

---

## 5. Always-loaded surface (as currently installed at `~/.claude/`)

**Skills installed:** 18 of the 19 in the repo (`gabe-docsite` missing — see §4). Description-frontmatter character lengths, summed:

| Skill | Description chars |
|---|---:|
| gabe-align | 199 |
| gabe-arch | 377 |
| gabe-assess | 227 |
| gabe-commit | 131 |
| gabe-debt | 508 |
| gabe-docs | 275 |
| gabe-execute | 132 |
| gabe-handoff | 215 |
| gabe-health | 206 |
| gabe-help | 138 |
| gabe-lens | 164 |
| gabe-mockup | 434 |
| gabe-myopic | **1,060** |
| gabe-next | 136 |
| gabe-plan | 163 |
| gabe-push | 163 |
| gabe-review | 343 |
| gabe-roast | 204 |
| **Total (18 skills)** | **5,075 chars** |

`gabe-myopic`'s description alone is 1,060 characters — roughly 21% of the entire suite's always-visible description surface in a single skill, and over 5x the median skill description length (~200 chars). This is the field the model sees for skill discovery/routing before ever loading a `SKILL.md` body, so it's a meaningful, disproportionate always-on cost.

**Commands installed at `~/.claude/commands/gabe-*.md`:** all 22 — `gabe-align, gabe-assess, gabe-commit, gabe-debt, gabe-execute, gabe-handoff, gabe-health, gabe-help, gabe-init, gabe-lens, gabe-mockup, gabe-myopic, gabe-next, gabe-plan, gabe-push, gabe-review, gabe-roast, gabe-scope, gabe-scope-addition, gabe-scope-change, gabe-scope-pivot, gabe-teach`. (These populate Claude Code's native slash-command list, not skill descriptions — a separate always-visible surface from the 5,075-char skill-description total above.)

---

## Key files referenced

- `commands/*.md` (22 files) — full list in §1 table.
- `skills/*/SKILL.md` (19 dirs) — full list in §2 table.
- `templates/*` — `templates/CLAUDE.md`, `templates/SCOPE.md`, `templates/ROADMAP.md`, `templates/RULES.md`, `templates/debt-patterns/*`, `templates/tier-sections/*`, `templates/mockup/*`.
- `install.sh` (274 lines).
- Drift evidence: `skills/gabe-align/SKILL.md` vs `/home/khujta/.claude/skills/gabe-align/SKILL.md`; `commands/gabe-handoff.md` (sole repo source of the E1–E7 block).
- Global rules compared against: `/home/khujta/.claude/rules/common/{testing,code-review,git-workflow,performance,security,agents}.md`.
