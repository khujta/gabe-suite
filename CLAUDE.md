# Gabe Suite — Project Context

Development suite for Claude Code and Codex. A growing collection of skills, command wrappers, templates, hooks, and docs that transform how you understand, review, decide, and ship. One of the skills inside this suite is called `/gabe-lens` (cognitive translation) — do **not** confuse the suite name (Gabe Suite) with that skill name (Gabe Lens).

**Repos:**
- Brownbull: https://github.com/Brownbull/gabe-suite
- khujta: https://github.com/khujta/gabe-suite

**Local folder:** `gabe_lens/` (legacy name; rename deferred — safe to rename to `gabe-suite/` later).

## Project Structure

```text
gabe-suite/                   # current local folder: gabe_lens/ (rename deferred)
  skills/
    gabe-align/               # Alignment guardian + AP advisory checks
    gabe-arch/                # Architecture curriculum layer
    gabe-assess/              # Change impact assessment
    gabe-debt/                # Architecture decision-debt scanner
    gabe-docs/                # Documentation standards + diagrams library
    gabe-health/              # Codebase health analysis
    gabe-help/                # Context-aware guide
    gabe-lens/                # Cognitive translation skill (name stays)
    gabe-mockup/              # Mockup, React Storybook, and design-ref workflow
    gabe-review/              # Code review with risk pricing
    gabe-roast/               # Adversarial gap review
    gabe-{next,plan,execute,commit,push}/
                               # lifecycle command-wrapper skills that load commands/
  commands/
    gabe-align.md, gabe-assess.md, gabe-commit.md, gabe-debt.md
    gabe-execute.md, gabe-health.md, gabe-help.md, gabe-init.md
    gabe-lens.md, gabe-mockup.md, gabe-next.md, gabe-plan.md
    gabe-push.md, gabe-review.md, gabe-roast.md, gabe-scope.md
    gabe-scope-addition.md, gabe-scope-change.md, gabe-scope-pivot.md
    gabe-teach.md
  templates/
    *.md, *.yaml, *.json      # .kdbp/ init files, including architecture-principles.md
    tier-sections/*.md        # tier trade-off section files + rubric + index
    mockup/                   # mockup and Storybook workflow templates
    debt-patterns/            # decision-debt pattern catalog
  prompts/*.md                # /gabe-scope prompt library
  schemas/*.json              # JSON Schemas for scope-session + scope-references
  assets/                     # Images for README
  docs/                       # User docs (start at docs/WORKFLOW.md)
    README.md                 # Doc index
    WORKFLOW.md               # State machine + command flow
    GAPS.md                   # Remaining workflow gaps + options
    suite-state-audit.md      # Current inventory, install state, and doc gaps
    workflows/                # Greenfield and brownfield start guides
    architecture/             # Requirements, diagram standards, data contracts, stack ref
    archive/                  # Retired dogfood + historical design docs
  README.md                   # Public-facing documentation
  CLAUDE.md                   # This file
  install.sh                  # Install suite to ~/.claude/ and ~/.agents/
```

## User Profile

`~/.claude/gabe-lens-profile.md` stores the user's chosen cognitive suit for the `/gabe-lens` skill. Created by `/gabe-lens calibrate`. Default suit (Spatial-Analogical) is used if absent. File name stays skill-level because it belongs to Gabe Lens, not the whole suite.

## Conventions

- Each skill has its own directory under `skills/` with a `SKILL.md`.
- Each user-facing slash command has a matching command wrapper under `commands/`.
- Command files are lean — they reference the skill or workflow spec for rules instead of duplicating them.
- Architecture Principles AP1-AP13 live in `templates/architecture-principles.md` and are advisory context for `/gabe-align`, `/gabe-debt`, and `/gabe-review`.
- Workflow docs are installed locally under `~/.claude/docs/gabe-suite/` and `~/.agents/docs/gabe-suite/`.

## Current Skills (11)

| Skill | Version | Purpose |
|---|---|---|
| **gabe-align** | 1.0.0 | Alignment guardian — shallow/standard/deep values and AP advisory checks |
| **gabe-arch** | 1.0.0 | Architecture curriculum layer used by `/gabe-teach` |
| **gabe-assess** | 1.0.0 | Rapid change impact assessment: blast radius, maturity scope, prerequisites |
| **gabe-debt** | 1.0.0 | Architecture decision-debt scanner with AP evidence citations |
| **gabe-docs** | 1.0.0 | Documentation standards + Mermaid diagrams library |
| **gabe-health** | 1.0.0 | Codebase health — god files, churn hotspots, coupling, deferred items |
| **gabe-help** | 1.0.0 | Context-aware guide — detects project state, suggests the right workflow |
| **gabe-lens** | 2.3.0 | Cognitive translation — analogies, maps, constraint boxes, handles |
| **gabe-mockup** | 1.0.0 | Legacy mockups plus React Storybook and design-ref workflows |
| **gabe-review** | 1.4.x | Code review — risk pricing, confidence scoring, plan/AP drift, triage |
| **gabe-roast** | 1.0.0 | Adversarial gap review from a required perspective |

Claude Code and Codex both install five thin lifecycle command-wrapper skills
(`gabe-next`, `gabe-plan`, `gabe-execute`, `gabe-commit`, `gabe-push`). Claude
Code also has native slash commands; the wrappers preserve skill-style handoff
parity and load the same lifecycle command specs from the active local home.

## Command Wrappers (20)

| Command | Skill/owner | Purpose |
|---|---|---|
| `/gabe-align` | gabe-align | Pre-flight alignment check (shallow, standard, deep) |
| `/gabe-assess` | gabe-assess | Change impact assessment |
| `/gabe-commit` | KDBP core | Commit quality gate |
| `/gabe-debt` | gabe-debt | Architecture decision-debt scan |
| `/gabe-execute` | KDBP core | Phase execution with tier cap + escalation gate |
| `/gabe-health` | gabe-health | Codebase health analysis |
| `/gabe-help` | gabe-help | Context-aware guide |
| `/gabe-init` | KDBP core | Project setup — `.kdbp/`, hooks, project type, maturity |
| `/gabe-lens` | gabe-lens | Explain concepts, annotate files, calibrate cognitive suit |
| `/gabe-mockup` | gabe-mockup | Mockup, React Storybook, and design-ref workflows |
| `/gabe-next` | KDBP core | Zero-logic router |
| `/gabe-plan` | KDBP core | KDBP planning + per-phase tier decision |
| `/gabe-push` | KDBP core | Push, create PR, watch CI, branch promotion |
| `/gabe-review` | gabe-review | Code review with risk pricing + tier drift |
| `/gabe-roast` | gabe-roast | Adversarial gap review |
| `/gabe-scope` | KDBP core | Scope authoring |
| `/gabe-scope-addition` | KDBP core | Additive scope evolution |
| `/gabe-scope-change` | KDBP core | Scope-change router |
| `/gabe-scope-pivot` | KDBP core | Direction-change scope rewrite |
| `/gabe-teach` | gabe-arch/docs | Human knowledge consolidation |

## Workflow Docs

- [docs/workflows/README.md](docs/workflows/README.md) — quick chooser.
- [docs/workflows/greenfield.md](docs/workflows/greenfield.md) — new app from idea to first phase.
- [docs/workflows/brownfield.md](docs/workflows/brownfield.md) — existing codebase adoption.
- [docs/suite-state-audit.md](docs/suite-state-audit.md) — current runtime inventory, install state, and known docs gaps.

## Adding a New Skill

1. Create `skills/<skill-name>/SKILL.md` with frontmatter (name, description, version).
2. Create `commands/<skill-name>.md` with frontmatter (name, description) when it needs a user-facing command.
3. Add it to README.md, CLAUDE.md, and `skills/gabe-help/SKILL.md`.
4. Update install and validation tests if the inventory count changes.
