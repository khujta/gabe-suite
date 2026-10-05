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
| Artifact chrome kit | `skills/gabe-artifact/assets/artifact-chrome.html` | publishing an Artifact — house chrome (centred column, cog panel with font · size · spacing, font roster); never hand-roll page chrome |
| Artifact pattern libraries | `skills/gabe-artifact/assets/{motion,static}-patterns.html` | 25 motion + 31 static visual elements, gated and self-contained — read before inventing a chart/diagram/UI form |
| Artifact chrome gate | `skills/gabe-artifact/tools/verify-artifact-chrome.mjs` | pre-publish render check for artifacts (cog, panel, roster, persistence, layout) |
| Artifact motion gate | `skills/gabe-artifact/tools/verify-motion.mjs` | proves each animation actually moves (computed-style sampling) + reduced-motion end states |
| Storybook correspondence | `skills/gabe-mockup/scripts/check-storybook-correspondence.mjs` | story ↔ component traceability check |
| Size-budget check | `skills/gabe-commit/scripts/size-budget.sh` | >800-first-party-line WARN at commit time |
| gabe-kdbp MCP server | `skills/gabe-kdbp/scripts/server.py` (installed: `~/.claude/skills/gabe-kdbp/scripts/`) | the .kdbp lifecycle state as tools (`mcp__gabe-kdbp__*`): snapshot · phase preflight · review target · next beat · verify-commands binding · PENDING/LEDGER row PREVIEWS — never re-author a PLAN/PENDING/LEDGER parser (they are header-resolved + closure-aware here) |
| gabe-map MCP server | `skills/gabe-map/scripts/server.py` (installed: `~/.claude/skills/gabe-map/scripts/`) | the codebase map as tools (`mcp__gabe-map__*`); `mapquery.two_arm` is THE two-arm reach core (reach-emit.py uses it) — never re-author a map reader or a callers query |
| KDBP templates | `templates/` (installed: `~/.claude/templates/gabe/`) | every `.kdbp/` file, tier sections, mockup templates, debt patterns |
| Scope prompt library | `prompts/` (installed: `~/.claude/prompts/gabe-scope/`) | /gabe-scope reasoning prompts |
| Scope schemas | `schemas/` (installed: `~/.claude/schemas/gabe-scope/`) | validating scope-session.json / scope-references.yaml |
| Suite conventions | `skills/gabe-docs/references/execution-contract.md` | the E1–E7 contract + orchestration restraint, stated once |

## Where project tooling is declared

Each KDBP project declares its notable tooling in its own `.kdbp/STRUCTURE.md` (rules about
it in `.kdbp/RULES.md`). Known cross-project asset classes — check the sibling project
before building:

- **Testing Command Center** (per-project generated site: features + matrix + docs wings) → the shipped generator lives in this repo's `templates/center/` (generalized behind `docs/site/center/center.config.json`, gastify-derived; installed to `~/.claude/templates/gabe/center/`): `generators/build_center_a3.py` (builder — orchestrator that fills the shell + writes `archmap.json`), `generators/refresh_center.sh` (the one driver entry point — `regen`/`junit`/`all`), `generators/check_center_links.py` (the crawl gate — build fails on a dangling href), `generators/verify_center_chrome.mjs` (render/chrome verification harness), `generators/curate_proof.py` + `generators/next_feature.py` (per-feature helpers); driven by `/gabe-cc-update`. NEW projects bootstrap via `/gabe-cc-init init` (owns the shell copy from `templates/center/`, per `skills/gabe-cc-update/references/feature-spec.md` §Bootstrap) — promotion from the gustify reference implementation LANDED (was D7 at n=2; now shipped, not pending).
- **Prompt experiments / LLM proof harnesses** → an existing `prompt_lab/` tree (never an ad-hoc harness beside it).
- **Pixel-art icon pipelines** → the pixellab-icons skill + the project's icon catalog.
- **Session handoffs** → `/gabe-handoff` (never a bespoke handoff doc).
- **Design/mockup references** → the project's mockup manifest (screen map, design refs) via the /gabe-mockup lift SOP step L0.

If a tool for X plausibly exists and is not listed here or in the project's `.kdbp/`, search
the sibling projects and `gh search` BEFORE writing it, and record the outcome as an E4 line:
`REUSE <path> | EXTEND <path> | NEW (searched <where> — none fit)`.
