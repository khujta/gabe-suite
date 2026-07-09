# Gabe Suite — Docs

Start here.

## Primary reads

| Doc | For |
|-----|-----|
| [WORKFLOW.md](WORKFLOW.md) | the state machine + command flow — read this first |
| [workflows/README.md](workflows/README.md) | choosing greenfield or brownfield project-start flow |
| [suite-state-audit.md](suite-state-audit.md) | current suite inventory, AP integration state, and doc/install gaps |
| [GAPS.md](GAPS.md) | where the workflow has holes + options to close each |

## Project-start workflows

| Doc | For |
|-----|-----|
| [workflows/greenfield.md](workflows/greenfield.md) | starting a new app from an idea |
| [workflows/brownfield.md](workflows/brownfield.md) | adopting an existing codebase without treating it as greenfield |

## Deeper reference

| Doc | For |
|-----|-----|
| [architecture/requirements.md](architecture/requirements.md) | design invariants + non-goals |
| [architecture/diagram-standards.md](architecture/diagram-standards.md) | Mermaid conventions for suite docs |
| [architecture/scope-data-contracts.md](architecture/scope-data-contracts.md) | field-level contract for `/gabe-scope` outputs |
| [architecture/stack.md](architecture/stack.md) | recommended application stack for downstream projects |

## Archive

[archive/](archive/) — retired design + dogfood docs. See [archive/README.md](archive/README.md) for why each is archived.

## Runtime specs

Command and skill specs live outside `docs/` (they are runtime artifacts, not documentation):

- `skills/gabe-*/SKILL.md` — one skill per capability (binding specs under each skill's `references/`)
- `skills/gabe-*/SKILL.md` — one dir per skill
- `templates/` — files copied into `.kdbp/` at init
- `prompts/` — `/gabe-scope` prompt library
- `schemas/` — JSON schemas for scope artifacts

## Local install

`install.sh` mirrors this curated docs set to:

- `~/.claude/docs/gabe-suite/`

The archive folder is intentionally not installed.
