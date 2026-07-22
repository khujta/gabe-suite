# Gabe Suite State Audit

**Date:** 2026-05-12
**Updated:** 2026-07-09 — A2 "KDBP-lite" migration landed: per-project ROADMAP.md/KNOWLEDGE.md/ENTITIES.md/MAINTENANCE.md/MOCKUP-VALIDATION.md/DEVIATIONS.md retired (never scaffolded; legacy copies live under `.kdbp/archive/retired/`), the phase arc moved into SCOPE.md's `## Phases` section, `.kdbp/PLAN.json` added as a machine mirror of PLAN.md, `.kdbp/LEDGER.md` became a thin session index, and session hooks dropped from 6 to 5 (ledger-writer and knowledge-awareness hooks retired). Also same-day: B2 skills-only migration landed: `commands/` retired (specs re-homed into `skills/<name>/references/`), 25 skills, Codex support dropped (Claude Code only — `~/.agents` is no longer an install target). Counts and surfaces below predate both migrations and are historical. Prior: 2026-07-05 — added `gabe-handoff` (session handoff: resume prompt + evidence-gated KDBP state sync); counts now 22 command wrappers / 12 skills. (2026-07-01 — added `gabe-myopic`.)
**Purpose:** Snapshot the current Gabe Suite surface so workflow docs and local installs can be checked against reality.

## Current Runtime Surface

The source tree currently exposes:

| Surface | Count | Source |
|---------|-------|--------|
| Command wrappers | 22 | `commands/gabe-*.md` |
| Skills | 12 | `skills/gabe-*` |
| Root templates | 23 | `templates/*.{md,yaml,json}` |
| Tier-section templates | 22 | `templates/tier-sections/*.md` |
| Mockup template files | 34 | `templates/mockup/**` |
| Debt patterns | 12 | `templates/debt-patterns/*.md` |
| Scope prompts | 13 | `prompts/*.md` |
| Scope schemas | 2 | `schemas/*.json` |

## Installed Surface

`install.sh` is the source of truth for local installation.

Installed into Claude Code:

- `~/.claude/commands/gabe-*.md`
- core Gabe skills under `~/.claude/skills/gabe-*`
- `~/.claude/skills/gabe-{next,plan,execute,commit,push,handoff}` as thin lifecycle command-wrapper skills
- `~/.claude/templates/gabe/**`
- `~/.claude/prompts/gabe-scope/*.md`
- `~/.claude/schemas/gabe-scope/**`
- `~/.claude/docs/gabe-suite/**`

Installed into Codex:

- `~/.agents/commands/gabe-*.md` as command-reference docs
- core Gabe skills under `~/.agents/skills/gabe-*`
- `~/.agents/skills/gabe-{next,plan,execute,commit,push,handoff}` as thin lifecycle command-wrapper skills
- `~/.agents/templates/gabe/**`
- `~/.agents/docs/gabe-suite/**`

Codex-visible behavior still comes from installed skills under `~/.agents/skills`.
Claude Code can use native slash commands or the same skill-style lifecycle
wrappers. The command files under each local `commands/` directory are the
reference mirror used by the wrapper skills.

## Architecture Principles Status

`templates/architecture-principles.md` contains AP1-AP13 as advisory architecture checks. The current runtime integration is:

| Consumer | Current behavior |
|----------|------------------|
| `/gabe-align` | Standard and deep modes load AP1-AP13 as advisory checks. |
| `/gabe-debt` | Findings may cite AP IDs when existing evidence touches a principle. |
| `/gabe-review` | Review findings may cite AP IDs without changing severity. |

The AP catalog is not a hard gate. Commands must not create findings from AP principles alone.

## Workflow Gaps Found

### Greenfield Split

The underlying commands support a full new-project path, but the docs did not previously give one durable guide from idea to first execution phase. The missing guide needed to explain where AP checks, `/gabe-debt`, and React-first `/gabe-mockup design-ref` fit.

### Brownfield Split

Existing codebase adoption was the largest blind spot. `commands/gabe-init.md` already has a non-destructive update path for projects with `.kdbp/`, and `/gabe-plan check` can retrofit older plans, but the suite did not document how to approach a repository that already has code and no KDBP state.

### Public Doc Drift

Primary docs described older command and skill counts. The source tree currently has `22` command wrappers and `12` skills. Drift here is dangerous because `/gabe-help` and README are the first surfaces a user sees.

### Local Docs Missing

The installer copied runtime specs and templates but not suite docs. That made installed Claude/Codex homes less useful for offline or local workflow lookup.

## Decisions for This Batch

- Add a docs-first greenfield guide.
- Add a docs-first brownfield adoption guide.
- Install the curated docs set into both local homes.
- Add validation so docs inventory and install behavior are checked deterministically.
- Do not add a new `/gabe-adopt` command in this batch. *(Superseded 2026-07-15: `/gabe-adopt` landed via verification-first ruling R7 — see `docs/design/verification-first/README.md` §5 addendum.)*

## Verification Targets

The current documentation contract is checked by:

- `bash scripts/suite-doctor.sh` — the standing gate: repo⟷install drift, every
  zero-arg battery under `tests/*/run.sh` green, version/count parity, the
  dispatch-surface budget, portability lint, docsite staleness
- `./install.sh` then re-running the doctor (CLEAN required)

*(2026-07-22, M10: `tests/architecture-principles/check.py` and
`tests/suite-docs/check.py` moved to `tests/_archive/` — both asserted the
pre-migration suite shape and could never pass; see `tests/_archive/README.md`
for where their live residue went.)*
