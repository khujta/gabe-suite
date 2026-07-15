---
name: gabe-init
description: "Initialize a project with the KDBP stack — creates .kdbp/, installs hooks, configures by project type and maturity. Usage: /gabe-init [project-name]"
when_to_use: "Set up KDBP in a project, initialize the Gabe stack, scaffold .kdbp/ — human-initiated only; never auto-invoke."
disable-model-invocation: true
metadata:
  version: 2.2.0
---

# Gabe Init — KDBP project scaffolder

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## What this does

One-command project setup wrapping three operations: (1) creates `.kdbp/` — BEHAVIOR.md, VALUES.md, DECISIONS.md, RULES.md, PENDING.md, LEDGER.md (thin session index), DOCS.md, PLAN.md, STRUCTURE.md, `archive/` — plus a root `CLAUDE.md`, all rendered from templates under `~/.claude/templates/gabe/` (E6 STOP if a referenced template is missing — never reconstruct one from memory); PLAN.json (the machine mirror) is written later by `/gabe-plan`, not by init. (2) wires the 5 KDBP hooks into `~/.claude/settings.json` by reading each hook object verbatim from `~/.claude/templates/gabe/hooks.json`; (3) configures the project by project type (code / mockup / hybrid) and maturity (mvp / enterprise / scale), scaffolding doc stubs and, for agent apps, VALUES entries + a build checklist. Supports `reset` (destructive, fresh `.kdbp/`), `update` (non-destructive top-up + schema migration of an existing `.kdbp/`), and `skip`.

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS` (optional project name).
2. Read `references/init-spec.md` IN FULL before executing — it is the binding spec. If missing, E6 applies — STOP.
3. If `.kdbp/` already exists, ask reset / update / skip and follow the mode routing table (each mode runs a fixed step sequence — reset: full create → CLAUDE.md → .gitignore seed → hooks → project type → readiness report; update: scan-missing → schema migration → hooks → condensed Update Report, skipping the full create/project-type steps).
4. On create/reset: interview for project name, one-sentence domain, maturity, project type, tech stack; render `.kdbp/` files and root `CLAUDE.md` from the templates, substituting the interview answers; never overwrite existing user content.
5. On update: diff the existing `.kdbp/` against the expected file/dir set, report present/missing/unrecognized, and on confirm create ONLY the missing items — never touch `BEHAVIOR.md`, `VALUES.md`, or any file with existing content. (The `~/.claude/gabe-arch/` lazy bootstrap is retired — gabe-arch is archived; existing user state is left untouched.)
6. Seed `.gitignore` with `.kdbp/reviews-archive/` (idempotent, grep-before-append).
7. Check the 5 KDBP hooks in `~/.claude/settings.json`; install any missing ones from `~/.claude/templates/gabe/hooks.json` verbatim after a Y/n prompt — never compose hook JSON from memory.
8. Create project-type-appropriate doc stubs (architecture.md, AGENTS_USE.md, SCALING.md, architecture-patterns.md, api.md, or README.md sections depending on agent-app / web-app / CLI / library), each carrying the `gabe-docs` standards-reference marker.
9. Print the readiness report (reset/create) or Update Report (update mode).

## Output contract (summary)

Reset/create ends with a readiness report: `.kdbp/` file count, CLAUDE.md status (created/merged/preserved/backed-up/skipped), hooks installed (N/5), project type, maturity, DOCS.md mapping count, doc stubs created, and a numbered next-steps list (add VALUES.md entries, run `/gabe-plan`, etc.). Update mode ends with a condensed report: files added, directories created, schema migrations applied, CLAUDE.md action, hooks installed count, preserved-file count. Every ✅ reflects a file/action actually created or verified this run (E2) — nothing is claimed done without evidence. The full output contract in the spec is binding.
