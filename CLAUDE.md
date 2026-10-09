# Gabe Suite — Project Context

A suite for Claude Code: skills, templates, hooks and docs, installed to `~/.claude/`. One skill inside it is called `/gabe-lens`; do not confuse the suite (Gabe Suite) with that skill (Gabe Lens). Claude Code only.

- Repos: https://github.com/Brownbull/gabe-suite · https://github.com/khujta/gabe-suite
- Local folder: `gabe_lens/` (legacy name; safe to rename to `gabe-suite/` later).

## Where things live

```text
skills/gabe-<name>/   SKILL.md (lean core, ≤200 lines) · references/ (the binding deep spec) · scripts/
skills/_archive/      decommissioned skills, outside install and doctor; README says how to reinstate
skills/dev-conventions/  the operator's cross-project conventions (not a suite capability)
templates/            .kdbp/ init files, center shell + generators, tier sections, mockup, debt patterns
scripts/              suite-doctor.sh · hooks/kdbp/*.sh (installed to ~/.claude/scripts/hooks/kdbp/)
tests/<name>/run.sh   one battery per checker, hook or generator
docs/                 user docs (start at docs/WORKFLOW.md) · docs/design/ (design records)
install.sh            installs the suite to ~/.claude/
```

Each skill IS its command: `skills/gabe-plan/` gives `/gabe-plan`. There is no `commands/` directory.

## How to work here

- **Repo first.** Suite changes land in this repo, then `./install.sh` regenerates the install. Never patch `~/.claude` in place; `scripts/suite-doctor.sh` shows the drift.
- **This repo never carries `.kdbp/`.** Do not propose dogfooding the KDBP lifecycle here. The suite is checked by the doctor, `/gabe-roast`, adversarial verify, and dry runs on copies.
- **Run the narrow check per change, the full doctor before a push of suite code.** A change runs its own skill's batteries plus the parity-only doctor. Costs:
  - `tests/<one>/run.sh`: seconds. `tests/hooks` ≈ 3 s, `tests/register` < 1 s.
  - `install.sh` ≈ 5 s.
  - `GABE_DOCTOR_NO_BATTERIES=1 scripts/suite-doctor.sh`: seconds (versions, the skill count, install drift; not a full CLEAN).
  - `scripts/suite-doctor.sh` ≈ 5–20 min, depending on machine load. It runs every battery; twelve launch a headless browser, and without chrome two of them SKIP and ten go RED (recipe in `tests/gabe-universe/run.sh`).
  - `docs/center/generators/write_facts.py` ≈ 5½ min (`--only <name>` re-records one battery in seconds); a full center regen takes minutes, so regen one page when one page changed.
- **A checker ships with fixtures that FIRE and stay SILENT.** A hook, checker or generator edit updates its battery in the same commit; a check that cannot fail is not evidence.
- **Real data only after a copy.** A deterministic script that will run on real project data ships only after a dry run on a COPY of that data; put the run's numbers in the commit message.
- **Provenance lives in git.** No dates, migration notes or "moved from X" headers inside skills or this file.
- **Size budget.** 800 lines per code file, report-never-gate: state the numbers in any commit that grows a file past it. `references/` specs are outside the cap.
- **Two-file law.** The Gabe Universe station has two copies. Edit the template (`templates/center/shell/gabe-universe.html`), regenerate the example copy under `templates/center/shell/example/codebase-graph-station/` with `docs/design/codebase-graph-consolidation/universe-build/fill-example.py`, and commit both together.
- **Shared branch.** Other sessions commit on the same branch: stage named files only, never `git add -A`.

## Skill conventions

- One skill per capability: `skills/<name>/SKILL.md` plus `references/` plus optional `scripts/`.
- Frontmatter: `description` + `when_to_use` (combined ≤ 1,536 characters, the doctor counts them). Flags where they apply: `context: fork`, `agent: Explore`, `disable-model-invocation: true`, `user-invocable: false`, `paths:`.
- The execution contract E1–E7 and the tool floor (how a skill uses the `gabe-map` / `gabe-kdbp` tools) are stated ONCE, in `skills/gabe-docs/references/execution-contract.md`. Every SKILL.md carries a one-line pointer to it, never a copy; a clause added there changes every skill.
- Advisory context, read on demand: `templates/architecture-principles.md` (AP1–AP13) and `templates/archetype-map.md`.

## Adding a skill

1. Create `skills/<name>/SKILL.md` (name, description, `when_to_use`, `metadata.version`, the contract pointer) and its `references/`.
2. **Handshake walk:** read the neighbouring beats' specs for seam contradictions: what this skill emits, do its neighbours accept, and the reverse. The same walk applies to any spec change that alters a beat's inputs or outputs, not only to a new skill.
3. Add a row to the table below and to README.md, and update the `(N skills)` count.
4. `./install.sh`, then `scripts/suite-doctor.sh` until CLEAN. The doctor checks each row's version against SKILL.md and the count against `skills/gabe-*/`.

## The Gabe register

Project-scoped: `.claude/output-styles/gabe.md` plus `.claude/register-core.md`, re-injected by `.claude/settings.json` hooks on every prompt and after compaction. Canary battery: `tests/register/run.sh`. Its kill condition is in the style file's header.

## Where the machinery is described

The map generators and their surfaces are documented in their design records, not here. Read the record before changing the machine.

| Machinery | Design record | Battery |
|---|---|---|
| Lifecycle, test ids, rulings D1–D7 | `docs/design/verification-first/README.md` | `tests/hooks` |
| Map↔grep delta loop | `docs/design/map-delta-loop/README.md` | `tests/map-deltas` |
| Center shell, evidence navigator | `templates/center/shell/README.md` | `tests/evidence-nav` |
| Frontend arm, Gabe Universe station | `docs/design/frontend-model/README.md` | `tests/frontend`, `tests/gabe-universe` |
| Foreign-repo passes, homing evidence | `docs/design/repo-study/README.md` | `tests/arch-graph` |
| Entity models, naming | `docs/design/entity-models/README.md` | `tests/entity-models`, `tests/naming` |
| Element forms | `docs/design/element-forms/plan.md`, `amendment-1.md` | `tests/element-forms`, `tests/forms-*` |
| Design context (current working set) | `docs/design/design-context/STATE.md` | — |
| Ideas considered, not built | `docs/design/suite-backlog.md` | — |
| Archived skills | `docs/design/trim-ledger.md` | — |

## Capabilities (30 skills)

| Skill | Version | Purpose |
|---|---|---|
| **gabe-artifact** | 1.8.0 | House chrome for published Artifacts: one centred column, one cog, font roster, skins, gates; plain by default, narrated only when asked |
| **gabe-assess** | 1.3.1 | The direction guard: impact, maturity scope and prerequisites before building |
| **gabe-cc-entity** | 1.0.2 | One entity's slice of the command center as a context pack |
| **gabe-cc-init** | 1.4.2 | Brownfield command-center adoption, one section per run (human-initiated) |
| **gabe-cc-update** | 1.9.0 | Command-center feature coverage, drafted journeys and entities, the in-flight projection |
| **gabe-commit** | 2.8.0 | Commit quality gate: deterministic checks, task-record trailer, map-delta sweep |
| **gabe-docs** | 1.5.0 | Documentation standards, diagrams, and the suite execution contract (background) |
| **gabe-docsite** | 1.1.1 | Publish docs onto the project's HTML site |
| **gabe-execute** | 2.6.4 | Phase execution with tier cap, escalation gate and checkpoint commits |
| **gabe-handoff** | 2.1.1 | Session handoff: a paste-able resume prompt and KDBP state sync |
| **gabe-health** | 1.3.0 | Codebase health, decision debt and the skill-estate sweep (read-only) |
| **gabe-help** | 1.2.2 | Context-aware guide; its catalog is generated from skill frontmatter |
| **gabe-imagine** | 1.4.1 | Understanding carried visually: instrument pages with gates |
| **gabe-init** | 2.3.10 | Project setup: `.kdbp/`, the KDBP hooks, project type, maturity (human-initiated) |
| **gabe-kdbp** | 1.0.3 | MCP server: a project's `.kdbp/` lifecycle state as read-only tools |
| **gabe-lens** | 2.6.0 | Cognitive translation: analogies, maps, constraint boxes, the plain line |
| **gabe-map** | 1.4.0 | MCP server: the project's committed codebase map as eighteen tools |
| **gabe-meme** | 1.2.0 | Persona-matched meme generation and surface wit |
| **gabe-mockup** | 2.2.0 | Mockup lift SOP over a per-project manifest |
| **gabe-myopic** | 1.2.1 | Short-sighted-user walkthrough (fork) |
| **gabe-next** | 2.4.2 | Lifecycle router over PLAN.md state |
| **gabe-plan** | 2.7.5 | KDBP planning and the per-phase tier decision |
| **gabe-pulse** | 1.9.1 | Read-only completeness sweep and the angle signals printed after each beat |
| **gabe-push** | 2.7.0 | Push, PR, CI watch and promotion, with production gates |
| **gabe-red** | 1.9.7 | TDD's first half as a beat: declare cases, prove RED, record the reach |
| **gabe-review** | 1.19.1 | Code review: risk pricing, confidence, triage, drift subjects |
| **gabe-roast** | 1.1.1 | Adversarial gap review from a required perspective (fork) |
| **gabe-scope** | 2.1.1 | Scope authoring for a new project |
| **gabe-scope-change** | 2.2.1 | Scope evolution: classifies pivot vs addition |
| **gabe-scope-pivot** | 2.1.1 | Direction-change scope rewrite (human or router initiated) |

Each skill's full purpose is its SKILL.md `description`. User docs: `docs/workflows/README.md` (chooser), `greenfield.md`, `brownfield.md`; installed under `~/.claude/docs/gabe-suite/`.

`~/.claude/gabe-lens-profile.md` holds the operator's cognitive suit for `/gabe-lens` (created by `/gabe-lens calibrate`).
