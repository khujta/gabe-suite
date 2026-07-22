# Gabe Suite — Workflow Gaps & Options

**Purpose:** honest list of things the workflow does not cover yet, with concrete options to close each gap.
**Audience:** suite maintainers + users who hit a wall the workflow doesn't address.
**Sibling doc:** [WORKFLOW.md](WORKFLOW.md) — primary state machine. This file catalogs where that machine has holes.

Gaps are numbered `W1..Wn`. Numbering stable across revisions — new gaps append; retired gaps are marked `(retired)` in place.

---

## W1 — No scope-drift auto-detection

**What's missing.** `SCOPE.md` can evolve mid-plan via `/gabe-scope-change` (Addition path). Downstream commands (`/gabe-plan`, `/gabe-execute`, `/gabe-review`) read SCOPE at start of their run, but none detect that SCOPE changed AFTER the active plan was authored.

**Why it matters.** Plan phases silently map to REQ numbers that may have been renumbered or removed. Users discover at `/gabe-review` via `TIER_DRIFT` findings — late, noisy.

**Current workaround.** Run `/gabe-plan check` manually after any scope change. No automation.

### Options

| Option | Approach | Cost | Risk |
|--------|----------|------|------|
| **A** — SCOPE checksum in PLAN frontmatter | `/gabe-plan` writes `scope_hash: <sha>` to PLAN frontmatter. Every other command compares, flags mismatch. | low (one field + compare) | low |
| **B** — `/gabe-next` preflight | Router compares SCOPE hash before dispatch. Abort + prompt on mismatch. | medium (extends router beyond zero-LLM contract) | medium — breaks `/gabe-next` simplicity |
| **C** — PostToolUse hook on SCOPE.md | Hook fires on SCOPE edit → writes drift row to `PENDING.md` → surfaces on next commit | medium (hook + PENDING schema extension) | low |
| **D** — No automation | Users run `/gabe-plan check` when they remember | zero | high (drift invisible) |

**Recommend.** A + C combined. Checksum gives deterministic detection; hook ensures PENDING surfaces the drift in existing review loops.

---

## W2 — (retired) `gabe-teach` cadence enforcement

**Status.** Retired. `gabe-teach` was archived 2026-07-15 (trim-matrix audit, ruling in [design/trim-ledger.md](design/trim-ledger.md) — 2,740 combined lines with `gabe-arch` serving ~2 observed uses). A cadence-enforcement gap for a command that no longer runs is moot; the options below (hook, 5th state column, cadence flag) no longer have a target skill to dispatch. `.kdbp/KNOWLEDGE.md` stays legacy-only — honored if a project already has one, never created fresh by anything live.

**Revisit trigger.** If knowledge-consolidation duties are reinstated (a new skill, or `gabe-teach` un-archived from `skills/_archive/`), re-open this gap and re-evaluate the same option set (hook / state column / cadence flag) against the reinstated command.

---

## W3 — No phase rollback command

**What's missing.** If `/gabe-execute` or `/gabe-commit` goes wrong mid-phase and partial state columns have ticked (e.g., Exec=✅, Review=✅, Commit=⬜ but code was reverted), there's no command to reset columns. User must manually edit `PLAN.md`.

**Why it matters.** Invariant 2 says "PLAN before code" — but when reality diverges from PLAN state, the invariant is already broken.

**Current workaround.** Manual markdown edit.

### Options

| Option | Approach | Cost | Risk |
|--------|----------|------|------|
| **A** — New `/gabe-reset [phase]` command | Standalone command: resets Exec/Review/Commit/Push to ⬜, writes LEDGER entry | medium (new command + spec) | low |
| **B** — `/gabe-plan reset` subcommand | Attach to existing plan command surface | low (one subcommand) | low |
| **C** — `/gabe-next --reset=[phase\|step]` flag | Route through existing router | medium (router grows side-effect) | medium — router was read-only |
| **D** — Document manual edit as supported | Status quo + explicit doc | zero | medium — error-prone |

**Recommend.** B — `/gabe-plan reset [phase]`. Lives under the command that owns plan lifecycle; keeps `/gabe-next` pure. Resets columns + writes audit trail to `LEDGER.md`.

---

## W4 — No hotfix path outside phase flow

**What's missing.** Emergency fixes (production down, CI broken, etc.) have no natural path. Options today: raw `git commit` (breaks invariant 1), or force a fake phase through full flow (ceremony overhead).

**Why it matters.** Users reach for `git commit --no-verify` under pressure, bypassing CHECK 1–9 entirely.

**Current workaround.** Create throwaway "hotfix" phase, run full flow. Or raw commit + update LEDGER manually.

### Options

| Option | Approach | Cost | Risk |
|--------|----------|------|------|
| **A** — `/gabe-hotfix [msg]` command | Wrapper: runs CHECK 1–5 only (skip CHECK 6–9 doc/structure/scope), commits, logs hotfix event to LEDGER + CHANGES.jsonl | medium (new command + scoped CHECKs) | medium — easy to abuse |
| **B** — `/gabe-commit --hotfix` flag | Same behavior as A, lives on existing command | low (one flag + branch) | medium |
| **C** — Synthetic phase | Document the "add Phase HF" workaround as supported | zero | low but annoying |
| **D** — No hotfix path | Status quo | zero | high (users bypass) |

**Recommend.** B — `/gabe-commit --hotfix [msg]`. Minimal surface; keeps commit as single entry point. Must require a reason field logged to `LEDGER.md` + write a follow-up `PENDING.md` item for post-incident cleanup.

---

## W5 — (retired) No parallel work

**Status.** Dropped by design. Lanes feature retired post-rollback. Serial single-plan is the chosen model at MVP maturity.

**Revisit trigger.** If maturity graduates to enterprise+ AND team size grows beyond solo dev AND measured need for concurrent streams exceeds serial cost → re-open with a fresh design.

---

## W6 — `/gabe-health` has no cadence

**What's missing.** Structural health check runs only when user manually invokes. God files, churn hotspots, coupling clusters accumulate silently.

**Why it matters.** By the time you run `/gabe-health` the findings are backlog, not actionable signal.

**Current workaround.** Periodic manual runs.

### Options

| Option | Approach | Cost | Risk |
|--------|----------|------|------|
| **A** — BEHAVIOR cadence flag | `health_cadence: per-phase \| weekly \| manual` | low | low |
| **B** — `/gabe-next` dispatches after N phases | Similar to W2-B | medium (router grows) | medium |
| **C** — CI integration | GitHub Action runs `/gabe-health` on PR | high (CI config + output parsing) | medium (CI brittle) |
| **D** — Manual | Status quo | zero | high |

**Recommend.** A, default `per-phase`. Pair with W2 (teach cadence) — both run at same checkpoint. Reuse hooks.

---

## W7 — `/gabe-align` cadence partial

**What's missing.** `/gabe-align` auto-runs at commit boundary (via hook) but nowhere else. Value drift between commits (during a long `/gabe-execute` session) is invisible.

**Why it matters.** User codes against wrong values mid-session; `/gabe-review` catches late via value fence.

**Current workaround.** Manual `/gabe-align shallow` before risky work.

### Options

| Option | Approach | Cost | Risk |
|--------|----------|------|------|
| **A** — BEHAVIOR cadence flag | `align_trigger: commit \| phase-start \| daily \| manual` (multi-select) | low | low |
| **B** — Phase-start auto-check | `/gabe-execute` runs shallow align in Step 0 preflight | low (already reads VALUES) | low |
| **C** — Pre-tool hook | Auto-run shallow before Edit/Write on sensitive paths | high (hook tuning) | high (noise) |
| **D** — Status quo | commit-only auto-run | zero | medium (drift window) |

**Recommend.** A + B. Default triggers `[commit, phase-start]`. Single extra LLM call per phase start, cheap enough.

---

## W8 — `/gabe-plan complete` archive path under-documented

**What's missing.** When all phases ✅, `/gabe-next` dispatches `/gabe-plan complete` — but this subcommand isn't mentioned in the command catalog or `/gabe-help` dashboard. Users don't know it exists.

**Why it matters.** Users manually move PLAN.md to archive/, risking naming mismatches (command uses `completed_<slug>-<ts>.md` convention).

**Current workaround.** Let `/gabe-next` do it; hope the user notices the dispatch.

### Options

| Option | Approach | Cost | Risk |
|--------|----------|------|------|
| **A** — Doc only | Add to `/gabe-plan` spec + `/gabe-help` suggestions + this file | zero | zero |
| **B** — `/gabe-help` surface | `/gabe-help` detects all-phases-✅ and suggests `/gabe-plan complete` explicitly | low | zero |
| **C** — Rename to `/gabe-plan archive` | More discoverable verb | medium (rename + back-compat alias) | low |

**Recommend.** A + B. Doc fix + `/gabe-help` surface are both cheap and visible. Rename can wait.

---

## W9 — Scope-pivot mid-plan contract unclear

**What's missing.** If `/gabe-scope-pivot` runs while `PLAN.md` is active (`status: active`), behavior is undefined. The plan may still reference pivoted-away REQs; silent breakage.

**Why it matters.** Pivots happen rarely but when they do, the project's plan integrity is at stake.

**Current workaround.** User must manually archive active plan before pivot, or the pivot runs and leaves the plan inconsistent.

### Options

| Option | Approach | Cost | Risk |
|--------|----------|------|------|
| **A** — Detect + prompt | `/gabe-scope-pivot` checks for active plan; prompts: `[archive-plan-as-cancelled] / [keep-plan] / [abort-pivot]` | medium (prompt + archive flow) | low |
| **B** — Block pivot while plan active | Hard stop; require `/gabe-plan complete` or explicit archive first | low | medium (forces friction even for valid cases) |
| **C** — Auto-archive | Pivot always archives active plan as `cancelled_` | low | medium (silent destruction) |
| **D** — No check | Status quo | zero | high |

**Recommend.** A. Detect + prompt matches suite pattern of explicit user choice at significant boundaries. Write `CHANGES.jsonl` event `plan_cancelled_by_pivot` regardless of choice.

---

## W10 — (retired) No single-source-of-truth workflow diagram

**Status.** Closed by this doc-reorg commit. [WORKFLOW.md](WORKFLOW.md) is now the SSOT with state-machine diagrams.

---

## W11 — Dogfood vs current docs confusion

**Status.** Closed by this doc-reorg commit. Archived `gabe-scope-design.md`, `gabe-scope-implementation-plan.md`, `gabe-scope-v1-dogfood.md`, `upstream-fixes-dangling-classifier-ledger-hook.md` to [archive/](archive/). Current docs in `docs/` root + `docs/architecture/` only describe live behavior.

**Revisit trigger.** Before shipping new major feature: write spec in `.planning/` or equivalent ephemeral location, never in `docs/`. Archive design doc upon feature ship.

---

## W13 — Env-aware push: config + drift detection shipped, execution logic partial

**What's shipped.** `/gabe-push` now reads `.kdbp/PUSH.md` env blocks, resolves env from arg (default: `production`), detects remote branch drift and persists decisions, offers promotion (`promote_from`) instead of local on bare `/gabe-push`, and prompts branch cleanup at the end. First run interviews explicitly for production-only / staging-then-prod / custom layouts.

**What's partial.** Multi-stage automation is still one invocation per env — e.g., to go local → staging → production, the user runs `/gabe-push staging`, validates, then `/gabe-push` (which offers the promotion). The command never recurses across envs.

### Remaining options (potential future work)

| Option | Approach | Cost | Risk |
|--------|----------|------|------|
| **A** — `/gabe-push all` chain run | Single invocation runs every env in `promote_from` chain order, pausing at each for user ack | medium (pause+resume, CI wait loops) | medium (long-running, error recovery) |
| **B** — Per-env deploy hooks | Add `deploy_hook:` to env block (shell command or URL). `/gabe-push` runs it after successful CI. | medium (hook runner + timeout + log) | medium (hooks can fail opaquely) |
| **C** — Per-env server configs | Expand env block to include server address / secrets ref for deploy targeting | high (secrets handling) | high (config becomes deploy tooling, not just branch strategy) |
| **D** — Keep current scope | One env per invocation; user orchestrates. Document pattern. | zero | low |

**Recommend.** D for now. A or B only if promotion cadence becomes daily ritual. C belongs in deploy tooling (Kamal, Railway, etc.), not in `/gabe-push`.

---

## W12 — (resolved-by-ruling) Diagram standards not enforced for own docs

**Status.** RESOLVED-BY-RULING (2026-07-22): the suite repo is built with the advisory arm only — `scripts/suite-doctor.sh` + `/gabe-roast` + adversarial verify + dry-run numbers — and never carries a `.kdbp/` of its own; Option A below (dogfood `.kdbp/` + `/gabe-commit docs-audit` on the suite itself) is closed.

**What's missing.** [skills/gabe-docs/SKILL.md](../skills/gabe-docs/SKILL.md) defines CommonMark + Mermaid standards. Gabe Suite's own docs aren't CI-checked for compliance.

**Why it matters.** Standards drift. New contributors introduce patterns that conflict with what the suite teaches downstream projects.

**Current workaround.** `scripts/suite-doctor.sh` + review-time catch (roast / adversarial verify) — not a full docs-audit.

### Options

| Option | Approach | Cost | Risk |
|--------|----------|------|------|
| **A** — Apply `/gabe-commit docs-audit` to suite itself | Suite is a project with its own `.kdbp/`; dogfood the standards | medium (scaffold suite's own `.kdbp/`) | low — **closed by the 2026-07-22 ruling above** |
| **B** — CI check (markdownlint + mermaid-lint) | Run CommonMark + Mermaid syntax checks on PR | medium (CI config) | low |
| **C** — Pre-commit hook | Local check before push | low (one hook) | medium (easy to bypass) |
| **D** — Trust review | Status quo | zero | medium |

**Recommend.** B or C, only if standards drift becomes evidenced. A is closed per the ruling above — advisory-arm-only stays the suite repo's model.

---

## W14 — Brownfield adoption is guide-only, not command-backed

**What's missing.** Existing-codebase adoption now has a documented workflow in [workflows/brownfield.md](workflows/brownfield.md), but there is no dedicated command that performs the inventory, staged KDBP adoption, plan retrofit checks, and decision-debt baseline as one guided flow.

**Why it matters.** Brownfield work is where surprise is highest: existing architecture, undocumented decisions, partial tests, implicit state, and stale plans can all hide behind a clean working tree. A guide helps, but a command-backed adoption path would reduce missed steps and make the first KDBP baseline more repeatable.

**Current workaround.** Follow [workflows/brownfield.md](workflows/brownfield.md): run read-only inventory first, use `/gabe-init update` when `.kdbp/` already exists, use cautious `/gabe-init` when it does not, then run `/gabe-health`, `/gabe-debt brief`, `/gabe-scope`, and `/gabe-plan check` as applicable.

### Options

| Option | Approach | Cost | Risk |
|--------|----------|------|------|
| **A** — New `/gabe-adopt` command | Guided brownfield flow: inventory, KDBP presence check, health/debt baseline, scope capture, plan retrofit prompt | medium | low if read-only by default |
| **B** — `/gabe-init --adopt` mode | Extend init with brownfield-specific prompts and baseline docs | medium | medium — init grows beyond setup |
| **C** — Smarter `/gabe-help` detection | Detect brownfield signals and recommend the exact guide/order before any writes | low | low — advisory only |
| **D** — Docs-only | Keep [workflows/brownfield.md](workflows/brownfield.md) as the adoption contract | zero | medium — easy to skip under pressure |

**Recommend.** C first, then A if repeated usage shows the same missed steps. Keep automatic migration out of scope until the read-only adoption path proves stable.

---

## Priority stack (recommended close-order)

| # | Gap | Size | Impact |
|---|-----|------|--------|
| 1 | W11 | — | done |
| 2 | W10 | — | done |
| 3 | W1 SCOPE drift | small | high (prevents silent plan rot) |
| 4 | W9 pivot mid-plan | small | high (rare but catastrophic) |
| 5 | W4 hotfix | medium | medium (stops invariant bypass under pressure) |
| 6 | W3 phase reset | small | medium (quality-of-life) |
| 7 | W8 plan complete docs | tiny | low (UX polish) |
| 8 | W14 brownfield adoption | small-to-medium | medium (reduces onboarding surprise) |
| 9 | W6, W7 cadence flags | medium (bundled) | medium (structural drift prevention) |
| 10 | W12 | — | done (resolved-by-ruling) |

Ship order: close small high-impact gaps first (W1, W9), strengthen brownfield detection (W14-C), then tackle cadence bundle (W6 + W7 share BEHAVIOR config surface).

---

## How to propose a new gap

Append `## W<next-number> — <name>` section with the same fields:

- **What's missing**
- **Why it matters**
- **Current workaround**
- **Options** — table with A/B/C/D
- **Recommend**

Keep gap numbers stable. Retire by marking `(retired)` + short status note. Do not renumber.
