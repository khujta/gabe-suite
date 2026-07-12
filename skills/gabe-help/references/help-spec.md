# Gabe Help — full spec

> This file is the binding spec; the SKILL.md core is a summary.
> E1–E7: see `../../gabe-docs/references/execution-contract.md`.

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
3. /gabe-scope               — Turn the idea into SCOPE.md (premise + `## Phases` plan)
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


---

## Full Suite Catalog (on request)

Rendered by Behavior Rule 6 when the user asks "what tools are available?" or similar.

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
| gabe-feature | /gabe-feature [phase\|--range] \| status \| backfill \| curate | Command-center feature coverage — card/diagrams/narration; only in projects with docs/site/center/ |
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
| gabe-scope | /gabe-scope | Scope authoring into SCOPE.md (premise + `## Phases` plan) |
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
