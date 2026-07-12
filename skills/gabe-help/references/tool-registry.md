# Cross-project tool registry (P14)

> Read this BEFORE building any tooling, harness, generator, or pipeline. E4 REUSE FIRST
> applies **across projects**, not just within one repo — recorded incidents include a docsite
> generator rebuilt from scratch while the sibling repo had one, an ad-hoc proof harness built
> beside an existing prompt-lab, and a hand-written handoff doc beside /gabe-handoff.

## Suite-owned tooling (ships with the suite)

| Tool | Where | Use for |
|---|---|---|
| install.sh | repo root | install/uninstall the suite to `~/.claude`; `--dry-run` |
| suite-doctor | `scripts/suite-doctor.sh` | drift check (repo vs ~/.claude); run after every install |
| Docsite generator | `skills/gabe-docsite/generator/` | building/refreshing HTML doc sites — never rebuild one from scratch |
| Diagram compliance | `skills/gabe-docsite/tools/diagram-compliance.mjs` | validating Mermaid diagrams on generated pages |
| Icon factory | `skills/gabe-docsite/tools/icon_factory.py` | docsite icons/memes |
| Storybook correspondence | `skills/gabe-mockup/scripts/check-storybook-correspondence.mjs` | story ↔ component traceability check |
| Size-budget check | `skills/gabe-commit/scripts/size-budget.sh` | >800-first-party-line WARN at commit time |
| KDBP templates | `templates/` (installed: `~/.claude/templates/gabe/`) | every `.kdbp/` file, tier sections, mockup templates, debt patterns |
| Scope prompt library | `prompts/` (installed: `~/.claude/prompts/gabe-scope/`) | /gabe-scope reasoning prompts |
| Scope schemas | `schemas/` (installed: `~/.claude/schemas/gabe-scope/`) | validating scope-session.json / scope-references.yaml |
| Suite conventions | `skills/gabe-docs/references/execution-contract.md` | the E1–E7 contract + orchestration restraint, stated once |

## Where project tooling is declared

Each KDBP project declares its notable tooling in its own `.kdbp/STRUCTURE.md` (rules about
it in `.kdbp/RULES.md`). Known cross-project asset classes — check the sibling project
before building:

- **Testing Command Center** (per-project generated site: features + matrix + docs wings) → reference implementation lives in gustify (`scripts/build_center_docs.py` family + `scripts/{scaffold_feature,curate_proof,next_feature}.py` + `refresh_center.sh`; overlay `docs/site/center/center.config.json`); driven by `/gabe-feature`; NEW projects bootstrap by COPY per `skills/gabe-feature/references/feature-spec.md` §Bootstrap — promotion to a suite generator is D7, decided at n=2.
- **Prompt experiments / LLM proof harnesses** → an existing `prompt_lab/` tree (never an ad-hoc harness beside it).
- **Pixel-art icon pipelines** → the pixellab-icons skill + the project's icon catalog.
- **Session handoffs** → `/gabe-handoff` (never a bespoke handoff doc).
- **Design/mockup references** → the project's mockup manifest (screen map, design refs) via the /gabe-mockup lift SOP step L0.

If a tool for X plausibly exists and is not listed here or in the project's `.kdbp/`, search
the sibling projects and `gh search` BEFORE writing it, and record the outcome as an E4 line:
`REUSE <path> | EXTEND <path> | NEW (searched <where> — none fit)`.
