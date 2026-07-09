# Gabe Suite — Project Context

Development suite for Claude Code. A growing collection of skills, templates, hooks, and docs that transform how you understand, review, decide, and ship. One of the skills inside this suite is called `/gabe-lens` (cognitive translation) — do **not** confuse the suite name (Gabe Suite) with that skill name (Gabe Lens).

**Repos:**
- Brownbull: https://github.com/Brownbull/gabe-suite
- khujta: https://github.com/khujta/gabe-suite

**Local folder:** `gabe_lens/` (legacy name; rename deferred — safe to rename to `gabe-suite/` later).

**Harness:** Claude Code only. Codex support was dropped 2026-07-09 (operator decision); the suite installs to `~/.claude/` exclusively.

## Project Structure

```text
gabe-suite/                   # current local folder: gabe_lens/ (rename deferred)
  skills/                     # ONE SKILL PER CAPABILITY (B2 skills-only migration)
    gabe-<name>/
      SKILL.md                # lean core (≤200 lines): frontmatter + E1–E7 pointer +
                              # summary + output contract
      references/             # the binding deep spec, loaded on demand
      scripts/                # deterministic helpers (e.g. gabe-commit/scripts/size-budget.sh)
  templates/
    *.md, *.yaml, *.json      # .kdbp/ init files, including architecture-principles.md
    tier-sections/*.md        # tier trade-off section files + rubric + index
    mockup/                   # mockup and Storybook workflow templates
    debt-patterns/            # decision-debt pattern catalog
  prompts/*.md                # /gabe-scope prompt library
  schemas/*.json              # JSON Schemas for scope-session + scope-references
  scripts/suite-doctor.sh     # drift check: repo vs ~/.claude
  assets/                     # Images for README
  docs/                       # User docs (start at docs/WORKFLOW.md)
  README.md                   # Public-facing documentation
  CLAUDE.md                   # This file
  install.sh                  # Install suite to ~/.claude/
```

There is no `commands/` directory: it was retired in the B2 skills-only migration (2026-07-09) after the lifecycle dry-run passed via skills alone. Each skill IS its command — the skill name gives the slash invocation (`skills/gabe-plan/` ⇒ `/gabe-plan`).

## User Profile

`~/.claude/gabe-lens-profile.md` stores the user's chosen cognitive suit for the `/gabe-lens` skill. Created by `/gabe-lens calibrate`. Default suit (Spatial-Analogical) is used if absent. File name stays skill-level because it belongs to Gabe Lens, not the whole suite.

## Conventions

- One skill per capability: `skills/<name>/SKILL.md` (lean core, ≤200 lines) + `references/` (the binding deep spec) + optional `scripts/`.
- Frontmatter: `description` + `when_to_use` (trigger sentence; combined ≤1,536 chars), plus flags where they apply — `context: fork` (satellite analyses), `agent: Explore` (read-only runs), `disable-model-invocation: true` (human-initiated only), `user-invocable: false` (background knowledge), `paths:` (auto-trigger globs).
- The execution contract E1–E7 is stated ONCE in `skills/gabe-docs/references/execution-contract.md`; every SKILL.md carries a one-line pointer, never a pasted copy.
- Provenance lives in git, not in runtime files — no migration notes, dates, or "moved from X" headers in skills (see the ledger rationale in the migration log).
- Architecture Principles AP1–AP13 live in `templates/architecture-principles.md` and are advisory context for `/gabe-align`, `/gabe-debt`, and `/gabe-review`.
- Suite changes land in the REPO first; installs regenerate via `./install.sh`; `scripts/suite-doctor.sh` makes drift visible. Never patch `~/.claude` in place.

## Capabilities (25 skills)

| Skill | Version | Purpose |
|---|---|---|
| **gabe-align** | 1.1.0 | Alignment guardian — shallow/standard/deep values and AP advisory checks |
| **gabe-arch** | 1.1.0 | Architecture curriculum layer used by `/gabe-teach` (background; not user-invocable) |
| **gabe-assess** | 1.1.0 | Rapid change impact assessment: blast radius, maturity scope, prerequisites |
| **gabe-commit** | 2.0.0 | Commit quality gate — deterministic checks incl. size-budget, triage, simplify tier, docs-audit |
| **gabe-debt** | 1.1.0 | Architecture decision-debt scanner with AP evidence citations (fork/read-only) |
| **gabe-docs** | 1.1.0 | Documentation standards + diagrams library + the suite execution contract (background) |
| **gabe-docsite** | 1.0.0 | Publish docs onto the generated HTML docs site |
| **gabe-execute** | 2.0.0 | Phase execution with tier cap, escalation gate, checkpoint commits |
| **gabe-handoff** | 2.0.0 | Session handoff — paste-able resume prompt + KDBP state sync |
| **gabe-health** | 1.1.0 | Codebase health — god files, churn hotspots, coupling (fork/read-only) |
| **gabe-help** | 1.1.0 | Context-aware guide + the P14 cross-project tool registry |
| **gabe-init** | 2.0.0 | Project setup — `.kdbp/`, hooks, project type, maturity (human-initiated only) |
| **gabe-lens** | 2.4.0 | Cognitive translation — analogies, maps, constraint boxes, handles |
| **gabe-mockup** | 2.0.0 | The lift SOP (L0–L4) over a per-project mockup manifest; Storybook + legacy HTML modes |
| **gabe-myopic** | 1.1.0 | Short-sighted-user walkthrough — foresight traps, overwhelm, recall, no-undo (fork) |
| **gabe-next** | 2.0.0 | Zero-logic lifecycle router over PLAN.md state |
| **gabe-plan** | 2.0.0 | KDBP planning + per-phase tier decision (MVP/enterprise/scale) |
| **gabe-push** | 2.0.0 | Push, PR, CI watch, promotion — env-aware shipping via `.kdbp/PUSH.md` |
| **gabe-review** | 1.5.0 | Code review — risk pricing, confidence scoring, plan alignment, triage |
| **gabe-roast** | 1.1.0 | Adversarial gap review from a required perspective (fork/read-only) |
| **gabe-scope** | 2.0.0 | Scope authoring — SCOPE.md + ROADMAP.md for a new project |
| **gabe-scope-addition** | 2.0.0 | Additive scope evolution (routed from /gabe-scope-change) |
| **gabe-scope-change** | 2.0.0 | Scope-change router — pivot vs addition classifier |
| **gabe-scope-pivot** | 2.0.0 | Direction-change scope rewrite (human/router-initiated only) |
| **gabe-teach** | 2.0.0 | Human knowledge consolidation — lessons from commits under gravity wells |

## Workflow Docs

- [docs/workflows/README.md](docs/workflows/README.md) — quick chooser.
- [docs/workflows/greenfield.md](docs/workflows/greenfield.md) — new app from idea to first phase.
- [docs/workflows/brownfield.md](docs/workflows/brownfield.md) — existing codebase adoption.
- [docs/suite-state-audit.md](docs/suite-state-audit.md) — runtime inventory audit (see its Updated line for currency).

Workflow docs are installed locally under `~/.claude/docs/gabe-suite/`.

## Adding a New Skill

1. Create `skills/<skill-name>/SKILL.md` with frontmatter (name, description, `when_to_use`, metadata.version) — lean core ≤200 lines with the E1–E7 pointer; deep spec goes in `skills/<skill-name>/references/`.
2. Add it to README.md, CLAUDE.md, and `skills/gabe-help/SKILL.md`.
3. Run `./install.sh` then `scripts/suite-doctor.sh` (must be CLEAN).
4. Update install/validation tests if the inventory count changes. (`install.sh` auto-discovers `skills/gabe-*/` — no list maintenance.)
