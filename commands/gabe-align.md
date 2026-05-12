---
name: gabe-align
description: "Alignment guardian — shallow/standard/deep checks plus automatic checkpoint at commit/PR. Usage: /gabe-align [mode] [target] or /gabe-align init [project]"
---

# Gabe Align

Alignment guardian. Manual pre-flight checks + automatic checkpoint at commit/PR boundaries.

## Before Anything Else

Read the full skill definition from the gabe-align skill (`SKILL.md`) and the values from `VALUES.md`. Both are required. Also read `~/.kdbp/VALUES.md` (user-level) and `.kdbp/VALUES.md` (project-level) if they exist. In standard/deep modes, also load the architecture-principles catalog from `templates/architecture-principles.md`, `~/.claude/templates/gabe/architecture-principles.md`, or `~/.agents/templates/gabe/architecture-principles.md`.

## Modes

### Mode 1: Standard (default)

**Usage:** `/gabe-align [target]`

Full alignment check against all loaded values (structural A1-A7 + user U* + project V*) plus advisory architecture-principle checks (AP1-AP13). AP concerns are evidence-backed context, not hard gates.

### Mode 2: Shallow (`shallow` | `sf` | `bf`)

**Usage:** `/gabe-align shallow [target]`

Core values + project values only. 3-5 line output. Quick sanity check.

### Mode 3: Deep (`deep` | `dp`)

**Usage:** `/gabe-align deep [target]`

Full check plus advisory architecture-principle checks and an alignment brief with intent, risks, recommended approach, and open questions.

## Subcommands

### Init Project

**Usage:** `/gabe-align init [project-name]`

Create `.kdbp/` directory with BEHAVIOR.md and VALUES.md. Interactive — asks about project domain, maturity, and core values.

### Init User

**Usage:** `/gabe-align init-user`

Create `~/.kdbp/VALUES.md` with universal values for all projects. Interactive.

### Install Hooks

**Usage:** `/gabe-align install-hooks`

Check `~/.claude/settings.json` for KDBP hooks (SessionStart + PreToolUse checkpoint) and install any that are missing. Required for automatic checkpoint system.

### Status

**Usage:** `/gabe-align status`

Show all loaded values (user + project) and whether `.kdbp/` exists.

### Migrate

**Usage:** `/gabe-align migrate`

Convert old `_kdbp/behaviors/` to new `.kdbp/` format.

### Evolve

**Usage:** `/gabe-align evolve`

Review value PASS/CONCERN frequency and suggest changes.

### Scope-drift checks (if SCOPE.md + ROADMAP.md exist)

When project scoped via `/gabe-scope`, align adds read-only drift checks alongside value checks:

1. **Uncovered-implementation check.** Files changed since last checkpoint without traceback to any REQ-NN → `scope_drift: uncovered_implementation`. Remediation hint: `/gabe-scope-change` to capture intent.
2. **Phase-goal-unmet check.** For current phase (per PLAN.md `## Current Phase`), verify Covers REQs acceptance signals match shipped code. If phase marked `complete` in ROADMAP.md but signals missing → `scope_drift: phase_goal_unmet`.
3. **Non-goal violation.** Scan changed files + recent commit subjects for keywords matching NG-NN statements in SCOPE.md §8. Flag `non_goal_violation` with specific NG-ID.
4. **Constraint drift.** Compare package.json / pyproject.toml / Cargo.toml etc. against SCOPE.md §9 Constraints.tech_stack. Flag additions violating declared stack.

Findings surface as CONCERN. Never writes to SCOPE.md or ROADMAP.md — remediation routes to `/gabe-scope-change`.

$ARGUMENTS
