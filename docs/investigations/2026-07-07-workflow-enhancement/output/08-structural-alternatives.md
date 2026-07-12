# Deliverable 8 — Structural Alternatives: the Suite vs. Anthropic's Way of Working

- **Produced:** 2026-07-08 (operator review round).
- **DECIDED 2026-07-09 by the operator: Fork A → A2 (KDBP-lite) · Fork B → B2 (skills-only) · Fork C → recommendation.** The implementation-ready migration map is [09-fork-migration-plan.md](09-fork-migration-plan.md). Implementation itself remains a separate operator-triggered pass (§2A.6).
- **Question asked:** "I don't want to perpetuate a wrong way of doing things… their way might be more effective than mine. Contrast each other and see possibilities."
- **Sources:** current official docs (memory.md, skills.md, hooks-guide, subagents.md at code.claude.com — fetched 2026-07-08 via the docs guide), the *Effective harnesses for long-running agents* engineering post, the four conference talk summaries in `refs/` (Daisy V1, Sid V2, Boris×Jarred V3, Ara V4), `anthropics/cwc-long-running-agents`, and this investigation's own measurements.

The honest headline: **your system and Anthropic's guidance agree on the principles and disagree on the *weight*.** Durable state, verification loops, self-improving artifacts, evidence — all shared. Where you diverge is quantity: more files, more prose, more surface than the guidance carries. Three forks follow, each with options and a recommendation. None is locked; each names what you'd lose.

---

## Fork A — State persistence: KDBP vs. the minimal-state pattern

### What Anthropic's material actually says

- Official long-running pattern (*Effective harnesses*, Nov 2025; implemented in cwc): **a feature list in JSON** ("resists agent modification" — agents edit prose too freely), **one progress file**, **git history as the memory** (descriptive commits = the ledger), fresh-context e2e verification before new work. That's the whole durable surface.
- Memory docs: CLAUDE.md **target under 200 lines**; facts in CLAUDE.md, procedures in skills, enforcement in hooks, discovered learnings in auto-memory.
- Ara (V4): markdown files beyond ~200 lines are **ergonomically bad for agents too**, not just humans — long md is exactly what the talk says to move away from.

### What KDBP actually weighs (this investigation's measurements)

| KDBP file (gustify / gastify) | State | Evidence |
|---|---|---|
| `LEDGER.md` — 1.3 MB / 10,457 lines · 996 KB | **Hot but obese.** Append-per-action; tail is a raw per-tool-call log duplicating what git + session transcripts already record. Nobody (human or agent) reads it linearly; it's 50× past Ara's ergonomic line | gustify scan §2 |
| `PLAN.md` — 64 KB, 402 lines | **Hot, mixed.** The phase state table (Exec/Review/Commit/Push cells) is the suite's routing backbone and earns its keep; but most of the bytes are narrative shipped-work prose that belongs in commit messages / HANDOFF | gustify scan §2 |
| `PENDING.md` — 132 KB, 98 rows (63 open) / 111 KB, 55 open | **Hot, earning.** Risk-priced deferred items, actively consumed by review/commit — something the minimal pattern simply doesn't have | both scans |
| `DECISIONS.md` — 232 KB, 1,103 lines / 256 KB, ~107 entries | **Warm, earning but bloated.** Real ADR value (RULES.md rows cite D-ids); fine-grained to a fault | both scans |
| `RULES.md` (gustify only), `HANDOFF.md`, `PUSH.md`, `DEPLOYMENTS.md` | **Hot, earning.** RULES measurably works; HANDOFF ≈ the official progress-file pattern, already the suite's cleanest artifact; PUSH/DEPLOYMENTS feed the 43×-used push gate | scans; Deliverable 5 |
| `ROADMAP.md` | **Rotten.** gustify's says `phases_complete: 0` while PLAN shipped 16 phases + a UX workstream — never reconciled | gustify scan §2 |
| `KNOWLEDGE.md` | **Rotten.** Gravity-well scaffold untouched since 2026-04-27 across 2.5 months of shipped work | gustify scan §2 |
| `ENTITIES.md` | **Rotten.** "Last updated 2026-04-24" — the code is the real entity truth | gastify scan §2 |
| `MAINTENANCE.md`, `MOCKUP-VALIDATION.md`, `DEVIATIONS.md`, `DOCS.md` (empty in gastify), one-shots (`W7-BLUEPRINT`, `AUDIT-…`) | **Cold/one-shot.** Never re-run, single-day, or empty | both scans |

Two systemic costs on top: **2–4 of the ~7 files in a median feature commit are `.kdbp` bookkeeping** (measured, F11), and the E5 same-turn sync duty generated its own incident class when skipped — *the heavy state is partly the cause of its own incidents*.

### Options

| | Option | What changes | What you lose |
|---|---|---|---|
| A1 | Keep KDBP as-is | nothing | keeps paying the measured costs above |
| **A2** | **KDBP-lite (recommended)** | **Hot core survives** (~7 files): PLAN *as state table only* + PENDING + DECISIONS + RULES + HANDOFF + PUSH/DEPLOYMENTS. **LEDGER becomes a thin index over git** — gabe-commit already writes rich messages; drop the per-tool-call tail (transcripts hold it), rotate the remainder to `archive/`. PLAN sheds narrative to commits/HANDOFF. **Retire/fold the rot tail**: ROADMAP → a phases section of SCOPE (or PLAN header); KNOWLEDGE → retire (or fold into the global gabe-arch state); ENTITIES/MAINTENANCE/MOCKUP-VALIDATION/DEVIATIONS → retire; one-shots → the dated `docs/investigations/` pattern. Adopt one official idea outright: **the phase table gets a machine-readable mirror (JSON)** — "resists agent modification," and the evidence hooks (plan 1.3) can read `proof:` fields deterministically | ~30 min/project of migration; a few historical files move to archive |
| A3 | Full minimal (PROGRESS.md + git only, cwc-style) | one file + git | the state-table routing that auto-ticks gates, risk-priced PENDING, the ADR trail, RULES with detection commands — the parts this investigation *measured as working*. Not recommended at your current investment; named for honesty |

**Verdict:** the guidance vindicates the *principle* of KDBP (cwc itself keeps durable state and a handoff) but indicts the *inventory size*. A2 keeps every file that earned its keep in the evidence and drops every file that rotted. Roughly 24 files → ~7.

---

## Fork B — Commands vs. skills: the duality can simply end

### What the docs now say (this is the big one)

- **Commands and skills are the same mechanism now**: `.claude/commands/deploy.md` and `.claude/skills/deploy/SKILL.md` both create `/deploy` and behave identically. Skills are the forward path — commands aren't deprecated, but skills are the superset.
- Skill frontmatter does natively what the suite hand-rolls: `description` + `when_to_use` (≤1,536 chars) drives **automatic invocation** (the dispatch fix, native); `paths:` globs **auto-load the skill when matching files are touched** (gabe-mockup on `**/*.stories.tsx` — the Thread-4 trigger, native); `disable-model-invocation: true` (user-only gates like push); `user-invocable: false` (background knowledge); **`hooks:` scoped to the skill's lifecycle** (the evidence gate can ship *inside* gabe-commit's skill instead of global settings.json); `context: fork` + `agent` (satellites run isolated); progressive disclosure via `references/`.

### What the suite carries today

22 command files (7,342 lines) + 19 skills, six of which exist *only to load command files* (the Codex-parity bridge). The spec mass sits in commands; the wrapper-skills are pure indirection; descriptions don't carry `when_to_use` triggers (F10).

### Options

| | Option | What changes | What you lose |
|---|---|---|---|
| B1 | Keep the duality | nothing | keeps 6 shim skills, two homes per capability, hand-rolled dispatch |
| **B2** | **Skills-only (recommended)** | Each capability becomes ONE skill: `skills/gabe-commit/SKILL.md` (lean, ≤200-line core) + `references/` for the deep spec (progressive disclosure — the hardened install already invented this shape for gabe-review). Slash invocation survives automatically (`/gabe-commit` still works). Write every `when_to_use` as a **trigger sentence** (ad-hoc phrasing included); add `paths:` globs where file-context should auto-load the skill (mockup → stories/design-system globs; docs → docs globs). Gates that must stay human-initiated get `disable-model-invocation: true` (push; scope-pivot). Evidence hooks ride in the skill's own `hooks:` block — enforcement packaged *with* the capability, reconciled through the repo like everything else. The 6 wrapper-skills and 22 command files retire; `commands/` keeps only thin aliases if muscle memory wants them | one-time migration (mechanical — the content already exists); **Codex caveat**: `~/.agents` skills must keep bodies host-portable since Codex may ignore Claude-specific frontmatter — bodies stay plain, frontmatter degrades gracefully |
| B3 | Commands-as-specs declared (status quo formalized) | just documents the inversion (Deliverable 2's fallback) | leaves dispatch hand-rolled and the duality standing |

**Verdict:** B2 is the rare fork where the platform moved *toward* you — everything the suite bolted on (wrappers, dispatch prose, hook templates) now has a native slot. It also subsumes plan steps 1.2 (dispatch) and part of 1.3c (hook packaging).

---

## Fork C — Orchestration & in-process triggering

Current official guidance: **default is a single agent + skills**; subagents earn their cost when output is verbose, the work is self-contained, or tools must be restricted; `context: fork` gives isolation without leaving the skill model. The talks add: remove the human from the hot path for *mechanical* loops only (Sid: /loop, routines; Boris: auto-mode **only with test-based verification in place**).

This confirms rather than changes the plan: 0.5c (orchestrate to verify, not to generate taste) is exactly the docs' "isolation isn't worth it for quick tasks" plus the measured incidents. The one addition worth naming: the suite's analysis satellites (health, debt, roast, myopic) are natural **`context: fork` skills** — isolation and tool-restriction natively, no Task-tool ceremony. And the mechanical babysitting the operator already does by hand (CI watching after push) is the canonical /loop-or-routine case per V1/V2, consistent with locked decision #1 (mechanical-auto, design-visible).

---

## How this touches the existing plan

- **Wave 0 is unchanged** — reconcile-first (0.1) is a *precondition* for any of these forks (you can't migrate three divergent copies).
- Fork B, if taken, **absorbs** 1.2's dispatch work and repackages 1.3c's hooks; Fork A absorbs part of 1.1 (the manifest can live as the skill-read `references/` file or `.kdbp/` — either home works once the inventory shrinks).
- Proposed sequencing if the operator takes both: 0.1 → B2 migration (skills-only, repo-first) → A2 (KDBP-lite) → the rest of Wave 1 lands on the new structure.
- **Decision owner:** operator. These change the system's shape, not just its content — exactly the class locked decision #2 reserves for human approval.
