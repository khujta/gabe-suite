---
name: gabe-help
description: "Context-aware guide for the Gabe Suite. Detects project state, shows what's configured, and suggests the right workflow. Usage: /gabe-help"
metadata:
  version: 1.0.0
---

# Gabe Help — Suite Entry Point

## Purpose

Answer one question: **"What should I do next with the Gabe Suite?"**

Scan the current project environment, detect what's configured, what's missing, and where the user is in their workflow. Then recommend specific commands with reasoning.

> **Rendering note.** Output templates in this spec wrapped in bare triple-backtick fences are spec-meta delimiters — render their contents as plain markdown at runtime. Dashboards, workflow recommendations, and tables display as markdown, not monospace code. See `gabe-docs/SKILL.md` § "Runtime output rendering convention".

This is NOT a man page. It reads the actual state and gives contextual advice.

---

## Procedure

### Step 1: Environment Scan

Check each probe silently. Do NOT run commands that modify anything.

| Probe | How | Result |
|-------|-----|--------|
| **Git repo** | Check if `.git/` exists | yes / no |
| **Uncommitted changes** | `git status --porcelain` (if git repo) | count of changed files, or clean |
| **Alignment initialized** | Check if `.kdbp/` or `.kdbp/VALUES.md` exists | yes (with maturity from BEHAVIOR.md) / no |
| **User values** | Check if `~/.kdbp/VALUES.md` exists | yes (count of values) / no |
| **Cognitive profile** | Check if `~/.claude/gabe-lens-profile.md` exists | yes (suit name) / no |
| **Checkpoint ledger** | Check if `.kdbp/LEDGER.md` exists | yes (count of entries) / no |
| **Deferred items** | Check `.kdbp/deferred-cr.md` or `.planning/deferred-cr.md` | count of unresolved items / none |
| **GSD planning** | Check if `.planning/PROJECT.md` exists | yes / no |
| **Active phase** | Look for `.planning/phases/*/PLAN.md` without `VERIFICATION.md` | phase number or none |

### Step 2: Classify Situation

Based on the scan, classify into one of these situations:

| Situation | Conditions | Primary recommendation |
|-----------|------------|----------------------|
| **New machine** | No `~/.kdbp/VALUES.md`, no `~/.claude/gabe-lens-profile.md` | Set up user-level tools first |
| **Greenfield project** | Git repo exists, no `.kdbp/`, idea/new app context | Run deep alignment, then initialize KDBP |
| **Brownfield project** | Git repo exists, no `.kdbp/`, existing code/docs/tests | Inventory first, then cautious KDBP adoption |
| **Configured, idle** | `.kdbp/` exists, no uncommitted changes, no active phase | Start work or run health check |
| **Mid-work** | Uncommitted changes exist | Review before committing |
| **Pre-PR** | Changes staged or branch ahead of main | Review + prepare to ship |
| **Deferred debt** | Deferred items exist (any count) | Surface and triage deferred items |
| **Post-milestone** | GSD planning exists, no active phase | Retro + health check |

Multiple situations can be true simultaneously (e.g., "mid-work" + "deferred debt"). List all that apply, ordered by priority.

### Step 3: Output

```
GABE HELP — [project name from BEHAVIOR.md or directory name]

┌─ Environment ───────────────────────────────────────┐
│ Git repo:        ✅ [branch name]                    │
│ Changes:         [N files modified | clean]          │
│ Alignment:       ✅ Initialized (maturity: MVP)      │
│                  or ❌ Not initialized                │
│ User values:     ✅ N values | ❌ Not set up          │
│ Cognitive suit:  ✅ Spatial-Analogical | ❌ Default    │
│ Checkpoints:     ✅ N entries | ❌ No ledger           │
│ Deferred items:  ⚠️ N pending | ✅ None               │
│ GSD planning:    ✅ Phase N active | ❌ Not found      │
└─────────────────────────────────────────────────────┘

Situation: [classified situation(s)]

Suggested next:

  1. /command — [why this, based on current state]
  2. /command — [why this]
  3. /command — [why this]
```

---

## Recommendation Logic

### New Machine (first-time setup)

```
1. /gabe-lens calibrate     — Find your cognitive suit (one-time, ~3 min)
2. /gabe-align init-user    — Set your universal values (one-time, ~5 min)
3. /gabe-align init [name]  — Initialize this project (if in a project)
```

### Greenfield Project (new app, no .kdbp/)

```
1. /gabe-align deep "<idea>" — Stress the idea against values, scenarios, and AP1-AP13
2. /gabe-init [name]         — Create .kdbp/, hooks, behavior, values, and maturity baseline
3. /gabe-scope               — Turn the idea into SCOPE.md + ROADMAP.md
4. /gabe-plan "first slice"  — Write the first phase plan with explicit decisions
5. /gabe-next                — Start the phase loop
```

Reference: `docs/workflows/greenfield.md`.

### Brownfield Project (existing codebase, no .kdbp/)

```
1. Read-only inventory       — Inspect layout, tests, CI, docs, git history, and risks before writing
2. /gabe-health              — Map structural hotspots and coupling before planning changes
3. /gabe-debt brief          — Capture evidence-backed decision debt and AP concerns
4. /gabe-init [name]         — Create a cautious KDBP baseline only after inventory
5. /gabe-scope               — Document current reality before proposing change phases
```

If `.kdbp/` already exists in the brownfield repo, prefer `/gabe-init update`, `/gabe-plan check`, and `/gabe-next` instead of starting from scratch.

Reference: `docs/workflows/brownfield.md`.

### Configured, Idle

```
1. /gabe-health             — Periodic check: has anything drifted?
2. /gabe-review deferred    — Any accumulated debt to address?
3. /gabe-align evolve       — Review value patterns from checkpoint history
```

### Mid-Work (uncommitted changes)

```
1. /gabe-review             — Risk-price your current changes before committing
2. /gabe-review brief       — Quick confidence score if you want speed
3. /gabe-align shallow      — Quick values check on what you're about to ship
```

### Pre-PR (branch ahead of main)

```
1. /gabe-review             — Full review with confidence score + triage
2. /gabe-push               — Push, create PR, watch CI, promote
3. /gabe-roast [perspective] [target] — Stress-test from a specific angle
4. /gabe-myopic [target]    — Walk a UI flow as a short-sighted user before it ships
```

### Post-Commit (committed, not pushed)

```
1. /gabe-push               — Push, create PR, watch CI
2. /gabe-review             — Double-check before shipping (if not done yet)
3. /gabe-assess bf [feature] — Quick impact check on what you're about to ship
```

### Deferred Debt (pending deferred items)

```
1. /gabe-review deferred    — See the backlog with confidence cost per item
2. /gabe-review fix         — Fix all deferred items in one pass
3. /gabe-health             — Check if deferred items cluster in fragile areas
```

### Post-Milestone

```
1. /gabe-health             — Full analysis: gods, churn, coupling, bugs, scope
2. /gabe-align evolve       — Review value patterns, graduate or tighten
3. /gabe-review deferred    — Clear any accumulated debt before next milestone
```

---

## Behavior Rules

1. **Read-only.** gabe-help never modifies files, creates directories, or writes output files. It only reads and recommends.
2. **Fast.** The scan should take < 5 seconds. Don't read file contents unless needed (e.g., maturity from BEHAVIOR.md frontmatter, suit from profile).
3. **No redundancy.** If the user just ran `/gabe-review`, don't suggest `/gabe-review` again. Check the conversation context.
4. **Honest gaps.** If something isn't set up, say so directly. Don't hedge with "you might want to consider." Say: "Not initialized. For greenfield, run `/gabe-align deep` then `/gabe-init`; for brownfield, follow `docs/workflows/brownfield.md` first."
5. **Max 5 suggestions.** More than 5 is noise. Pick the highest-value actions for the current state.
6. **Show the full suite on request.** If the user asks "what tools are available?" or similar, show the complete list:

```
The Gabe Suite — 22 command wrappers, 12 skills:

| Tool | Command | What it does |
|------|---------|-------------|
| gabe-help | /gabe-help | You are here. Context-aware guide. |
| gabe-align | /gabe-align [mode] | Alignment guardian — values check + auto-checkpoint |
| gabe-assess | /gabe-assess [change] | Change impact — blast radius, maturity scope, prerequisites |
| gabe-commit | /gabe-commit [msg] | Commit quality gate — deterministic checks, triage |
| gabe-debt | /gabe-debt [brief\|dry-run\|target] | Architecture decision-debt scan with AP evidence citations |
| gabe-execute | /gabe-execute | Execute the current PLAN.md phase |
| gabe-handoff | /gabe-handoff [--dry-run\|--no-sync\|note] | Session handoff — resume prompt + evidence-gated KDBP state sync |
| gabe-health | /gabe-health [focus] | Codebase structural health — gods, churn, coupling, bugs |
| gabe-init | /gabe-init [name] | Project setup — .kdbp/, hooks, project type, maturity |
| gabe-lens | /gabe-lens [concept] | Cognitive translation — analogies, maps, constraint boxes |
| gabe-mockup | /gabe-mockup [mode] | Mockup, React Storybook, and design-ref workflows |
| gabe-myopic | /gabe-myopic [mode] [target] | Short-sighted-user walkthrough — flags foresight traps, overwhelm, recall, no-undo |
| gabe-next | /gabe-next | Zero-logic router for the current phase state |
| gabe-plan | /gabe-plan [goal] | KDBP planning + per-phase tier decision |
| gabe-push | /gabe-push | Push, create PR, watch CI, branch promotion |
| gabe-review | /gabe-review [target] | Code review with risk pricing + confidence score + triage |
| gabe-roast | /gabe-roast [perspective] [target] | Adversarial gap review from a specific viewpoint |
| gabe-scope | /gabe-scope | Scope authoring into SCOPE.md + ROADMAP.md |
| gabe-scope-addition | /gabe-scope-addition | Additive scope evolution |
| gabe-scope-change | /gabe-scope-change | Route a scope change to addition or pivot |
| gabe-scope-pivot | /gabe-scope-pivot | Direction-changing scope rewrite |
| gabe-teach | /gabe-teach | Consolidate architect-level knowledge |
```

Installed workflow docs:

- `docs/workflows/README.md` — quick chooser.
- `docs/workflows/greenfield.md` — new app from idea to first phase.
- `docs/workflows/brownfield.md` — existing codebase adoption.
- `docs/suite-state-audit.md` — current inventory, install state, and known gaps.

Skills installed behind those commands: `gabe-align`, `gabe-arch`, `gabe-assess`, `gabe-debt`, `gabe-docs`, `gabe-health`, `gabe-help`, `gabe-lens`, `gabe-mockup`, `gabe-myopic`, `gabe-review`, `gabe-roast`.

---

## Integration

| From | Trigger | What gabe-help adds |
|------|---------|-------------------|
| User runs `/gabe-help` | Direct invocation | Full scan + recommendations |
| User seems lost | "What should I do?", "Where do I start?" | Suggest `/gabe-help` |
| Post-install | After `install.sh` runs | Suggest `/gabe-help` as first command |
