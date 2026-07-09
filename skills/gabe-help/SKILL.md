---
name: gabe-help
description: "Context-aware guide for the Gabe Suite. Detects project state, shows what's configured, and suggests the right workflow. Usage: /gabe-help"
when_to_use: "What can the suite do, which gabe command fits, where do I start, does tooling for X already exist (check references/tool-registry.md before building anything)."
metadata:
  version: 1.1.0
---

# Gabe Help — Suite Entry Point

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## Purpose

Answer one question: **"What should I do next with the Gabe Suite?"**

Scan the current project environment, detect what's configured, what's missing, and where the user is in their workflow. Then recommend specific commands with reasoning.

> **Rendering note.** Output templates in this spec wrapped in bare triple-backtick fences are spec-meta delimiters — render their contents as plain markdown at runtime. Dashboards, workflow recommendations, and tables display as markdown, not monospace code. See `../gabe-docs/references/docs-spec.md` § "Runtime output rendering convention".

This is NOT a man page. It reads the actual state and gives contextual advice.

## Tool registry (P14)

Before building any tooling, harness, generator, or pipeline: read `references/tool-registry.md` — the cross-project "what exists where" registry. E4 REUSE FIRST applies across projects.

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

Multiple situations can be true simultaneously (e.g., "mid-work" + "deferred debt"). List all that apply, ordered by priority. Full per-situation command sequences (New Machine, Greenfield, Brownfield, Configured-Idle, Mid-Work, Pre-PR, Post-Commit, Deferred Debt, Post-Milestone): `references/help-spec.md` § "Recommendation Logic".

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

## Behavior Rules

1. **Read-only.** gabe-help never modifies files, creates directories, or writes output files. It only reads and recommends.
2. **Fast.** The scan should take < 5 seconds. Don't read file contents unless needed (e.g., maturity from BEHAVIOR.md frontmatter, suit from profile).
3. **No redundancy.** If the user just ran `/gabe-review`, don't suggest `/gabe-review` again. Check the conversation context.
4. **Honest gaps.** If something isn't set up, say so directly. Don't hedge with "you might want to consider." Say: "Not initialized. For greenfield, run `/gabe-align deep` then `/gabe-init`; for brownfield, follow `docs/workflows/brownfield.md` first."
5. **Max 5 suggestions.** More than 5 is noise. Pick the highest-value actions for the current state.
6. **Show the full suite on request.** If the user asks "what tools are available?" or similar, render the full 22-command / 12-skill catalog table — verbatim in `references/help-spec.md` § "Full Suite Catalog (on request)".

Installed workflow docs: `docs/workflows/README.md` (quick chooser), `docs/workflows/greenfield.md`, `docs/workflows/brownfield.md`, `docs/suite-state-audit.md` (current inventory, install state, known gaps).

## Integration

| From | Trigger | What gabe-help adds |
|------|---------|-------------------|
| User runs `/gabe-help` | Direct invocation | Full scan + recommendations |
| User seems lost | "What should I do?", "Where do I start?" | Suggest `/gabe-help` |
| Post-install | After `install.sh` runs | Suggest `/gabe-help` as first command |
