# Gabe Suite State Audit

**Date:** 2026-05-12
**Purpose:** Snapshot the current Gabe Suite surface so workflow docs and local installs can be checked against reality.

## Current Runtime Surface

The source tree currently exposes:

| Surface | Count | Source |
|---------|-------|--------|
| Command wrappers | 20 | `commands/gabe-*.md` |
| Skills | 11 | `skills/gabe-*` |
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
- `~/.claude/skills/gabe-{next,plan,execute,commit,push}` as thin lifecycle command-wrapper skills
- `~/.claude/templates/gabe/**`
- `~/.claude/prompts/gabe-scope/*.md`
- `~/.claude/schemas/gabe-scope/**`
- `~/.claude/docs/gabe-suite/**`

Installed into Codex:

- `~/.agents/commands/gabe-*.md` as command-reference docs
- core Gabe skills under `~/.agents/skills/gabe-*`
- `~/.agents/skills/gabe-{next,plan,execute,commit,push}` as thin lifecycle command-wrapper skills
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

Primary docs described older command and skill counts. The source tree currently has `20` command wrappers and `11` skills. Drift here is dangerous because `/gabe-help` and README are the first surfaces a user sees.

### Local Docs Missing

The installer copied runtime specs and templates but not suite docs. That made installed Claude/Codex homes less useful for offline or local workflow lookup.

## Decisions for This Batch

- Add a docs-first greenfield guide.
- Add a docs-first brownfield adoption guide.
- Install the curated docs set into both local homes.
- Add validation so docs inventory and install behavior are checked deterministically.
- Do not add a new `/gabe-adopt` command in this batch.

## Verification Targets

The current documentation contract should be checked by:

- `python3 tests/architecture-principles/check.py`
- `python3 tests/suite-docs/check.py`
- `./install.sh --dry-run`
- `./install.sh`
- byte-for-byte comparisons between repo docs and installed docs in both local homes
