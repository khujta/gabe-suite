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
  tests/hooks/run.sh          # hook/router fixture harness — run after ANY enforcement-layer edit
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
- The Archetype Map (Prototyper/Builder/Sweeper/Grower/Maintainer) lives in `templates/archetype-map.md` — advisory context for `/gabe-roast` (canonical perspectives) and `/gabe-assess` (maturity posture-mix); a reading of the existing maturity axis, not a new level system.
- Suite changes land in the REPO first; installs regenerate via `./install.sh`; `scripts/suite-doctor.sh` makes drift visible (incl. the suite invariants: hook harness green, version/count parity, portability lint, docsite staleness). Never patch `~/.claude` in place.
- A deterministic script that will run against real project data ships only after a dry-run against a COPY of that data — record the run's numbers in the commit message (meta-review P1: template-derived fixtures validate the template, not reality).
- Every hook/checker ships fixture cases in `tests/` proving it can both FIRE and stay silent; behavior edits update the battery in the same commit (`tests/hooks/run.sh` — meta-review P2/P4: a checker that cannot fail is non-evidence, and fixtures that live in session transcripts protect nothing).
- **This repo never carries `.kdbp/`** (operator ruling 2026-07-22, R8 in the [design record §5 addendum](docs/design/verification-first/README.md)): the suite is built with the advisory arm only — suite-doctor (runs every `tests/*/run.sh` battery) + /gabe-roast + adversarial verify + dry-run-on-a-COPY numbers in commit messages. Do not propose dogfooding the KDBP lifecycle here.
- Size budget: 800 lines is a CODE budget, report-never-gate — state the numbers in any commit that grows a file past it; `references/` deep specs sit outside the cap (ruling R9, same addendum, with the deferral record for the two over-budget generators).

## Capabilities (29 skills)

| Skill | Version | Purpose |
|---|---|---|
| **gabe-adopt** | 1.2.2 | Brownfield command-center adoption — archive-never-delete init, machine-ranked shortlist, one section per run at human speed, walk-recorded approval; tracker lives outside PLAN.md (human-initiated only) |
| **gabe-align** | 1.1.1 | Alignment guardian — shallow/standard/deep values and AP advisory checks |
| **gabe-assess** | 1.1.1 | Rapid change impact assessment: blast radius, maturity scope, prerequisites |
| **gabe-commit** | 2.4.0 | Commit quality gate — deterministic checks incl. size-budget, triage, simplify tier, docs-audit; optional results_out digest, path or list (reports every tier, gates none) |
| **gabe-debt** | 1.1.1 | Architecture decision-debt scanner with AP evidence citations (fork/read-only) |
| **gabe-docs** | 1.2.0 | Documentation standards + diagrams library + the suite execution contract (background) |
| **gabe-docsite** | 1.0.2 | Publish docs onto the generated HTML docs site |
| **gabe-entity** | 1.0.1 | Entity-context reader — assembles one entity's slice (code map + registry + bindings) into a context pack from the center's committed data (archmap/adoption/config), joined on slug; a DATA lens not a per-entity skill (D7); brief or `--json`, plus `list` mode |
| **gabe-execute** | 2.2.1 | Phase execution with tier cap, escalation gate, checkpoint commits; TASK CONTRACT carries the phase's `CASES:` (C-ids from /gabe-red) + case-scoped verify; narration legs authored hot |
| **gabe-feature** | 1.6.0 | Command-center feature coverage — card/diagrams/narration over machine facts; verdicts RENDERED from review triage (authored fallback); closes the PLAN `Center` cell on review; status, backfill, curate, release; bootstrap pointer → /gabe-adopt |
| **gabe-handoff** | 2.1.0 | Session handoff — paste-able resume prompt + KDBP state sync |
| **gabe-health** | 1.1.1 | Codebase health — god files, churn hotspots, coupling (fork/read-only) |
| **gabe-help** | 1.2.1 | Context-aware guide + the P14 cross-project tool registry; Full Suite Catalog is GENERATED from skill frontmatter (scripts/gen-help-catalog.py, run by install.sh) |
| **gabe-init** | 2.3.0 | Project setup — `.kdbp/`, hooks, project type, maturity (human-initiated only) |
| **gabe-lens** | 2.4.0 | Cognitive translation — analogies, maps, constraint boxes, handles |
| **gabe-meme** | 1.1.0 | Oblique-meme generation — per-project tone setup + template-persona-matched visual metaphors via memegen.link; verified PNGs, punch-up (ported from chiless meme-hilo) |
| **gabe-mockup** | 2.1.0 | The lift SOP (L0–L4) over a per-project mockup manifest; Storybook + legacy HTML modes |
| **gabe-myopic** | 1.2.0 | Short-sighted-user walkthrough — foresight traps, overwhelm, recall, no-undo (fork); findings labeled M[N], never C[N] |
| **gabe-next** | 2.4.1 | Zero-logic lifecycle router over PLAN.md state — optional `Red` (routes /gabe-red BEFORE Exec) → Exec→Review→Commit→Push + optional `Center` (routes /gabe-feature) |
| **gabe-plan** | 2.5.2 | KDBP planning + per-phase tier decision (MVP/enterprise/scale); `proof_type` (test|visual|journey) declared at plan time; optional `Red`/`Center` columns (Red retrofits seed ⬜ only where Exec is ⬜) |
| **gabe-push** | 2.2.0 | Push, PR, CI watch, promotion — env-aware shipping via `.kdbp/PUSH.md`; terminal-env ship prints the /gabe-feature release pointer |
| **gabe-quip** | 1.1.0 | Sarcastic wit for human-facing HTML surfaces — titles/hooks/callouts surfacing pain points; one engagement lever, proposes not rewrites, dosed (sibling of gabe-meme) |
| **gabe-red** | 1.3.1 | TDD's first half as a beat — inspect the corpus, declare cases (C-ids in test names, corpus = registry), prove RED by assertion, commit the red checkpoint; GUARDs for refactors, enumerated skips |
| **gabe-review** | 1.8.0 | Code review — risk pricing, confidence scoring, plan alignment, triage; case-estate subjects (NEW CASE/BUMP/DRIFT, reserved C-ids) + absent-angle GROWTH triage (cap 7) on the same pricing |
| **gabe-roast** | 1.1.0 | Adversarial gap review from a required perspective (fork/read-only) |
| **gabe-scope** | 2.1.1 | Scope authoring — SCOPE.md (stable premise + §Phases arc) for a new project |
| **gabe-scope-change** | 2.2.0 | Scope evolution, one entry point — classifies pivot vs addition; additions execute inline (absorbed gabe-scope-addition), pivots route to the safety-flagged gabe-scope-pivot |
| **gabe-scope-pivot** | 2.1.0 | Direction-change scope rewrite (human/router-initiated only) |
| **gabe-walk** | 1.1.0 | Human-eye verification — BRIEFS the walker first (why · what · flow itinerary · verdict meanings), then records who·when·result·evidence to walks.jsonl; records never judges; NEVER-walked renders red until walked |

## Archived skills

Decommissioned-not-deleted skills live in `skills/_archive/` (outside the install/doctor glob) with a
README covering why + how to reinstate; rulings in [docs/design/trim-ledger.md](docs/design/trim-ledger.md). Currently: **gabe-teach** + **gabe-arch** + **gabe-scope-addition** (archived 2026-07-15 —
2,740 lines serving ~2 observed uses; trim-matrix audit). `~/.claude/gabe-arch/` user state is never
touched by decommission.

## Workflow Docs

- **[docs/design/verification-first/README.md](docs/design/verification-first/README.md) — the suite's design record (read BEFORE restructuring the suite):** the one-picture model (lifecycle produces · structure shapes · growth accrues), the mutated lifecycle incl. `/gabe-red` + `/gabe-walk`, the C-id test-identity scheme, decisions D1–D7 (block-lies/warn-debts hooks, report-never-gate MVP), and the landing plan.
- [docs/workflows/README.md](docs/workflows/README.md) — quick chooser.
- [docs/workflows/greenfield.md](docs/workflows/greenfield.md) — new app from idea to first phase.
- [docs/workflows/brownfield.md](docs/workflows/brownfield.md) — existing codebase adoption.
- [docs/suite-state-audit.md](docs/suite-state-audit.md) — runtime inventory audit (see its Updated line for currency).

Workflow docs are installed locally under `~/.claude/docs/gabe-suite/`.

## Adding a New Skill

1. Create `skills/<skill-name>/SKILL.md` with frontmatter (name, description, `when_to_use`, metadata.version) — lean core ≤200 lines with the E1–E7 pointer; deep spec goes in `skills/<skill-name>/references/`.
2. **Handshake walk:** read the ADJACENT beats' specs for seam contradictions — what this skill emits, do its neighbors accept, and vice versa? (Meta-review P5: the gate once blocked the very commit /gabe-red must produce; two specs disagreed on where `proof` lives. Seams break where each spec is written from its own seat.) Same walk applies to any spec change that alters a beat's inputs/outputs.
3. Add it to README.md and CLAUDE.md (the gabe-help catalog is generated at install).
4. Run `./install.sh` then `scripts/suite-doctor.sh` (must be CLEAN — the doctor also checks version/count parity, so a missed CLAUDE.md row fails here).
5. Update install/validation tests if the inventory count changes. (`install.sh` auto-discovers `skills/gabe-*/` — no list maintenance.)
