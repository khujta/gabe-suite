---
name: gabe-align
description: "Alignment guardian — manual pre-flight checks (shallow/standard/deep) plus automatic values + scenario checks at commit/PR boundaries. Usage: /gabe-align [mode] [target] or /gabe-align init [project]"
when_to_use: "Are we still aligned, pre-flight check before a risky or irreversible change, values + AP advisory check at commit/PR boundaries — shallow for quick sanity, standard for phase boundaries, deep for direction changes."
metadata:
  version: 1.1.0
---

# Gabe Align — Alignment Guardian

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## What this does

Two responsibilities: (1) **Manual alignment checks** — test proposed work against curated values BEFORE building, in shallow / standard / deep modes; (2) **Automatic checkpoint** — at commit/PR boundaries, evaluate values + test scenario coverage via hooks, no manual invocation needed. Values load from three stacking sources: structural (`VALUES.md`, A1-A7), user-level (`~/.kdbp/VALUES.md`), and project-level (`.kdbp/VALUES.md`), plus advisory Architecture Principles in standard/deep modes.

## Usage / modes

`/gabe-align [mode] [target]` or `/gabe-align init [project]`

### Manual checks

| Mode | Alias | Values Checked | Output | Use Case |
|------|-------|---------------|--------|----------|
| **shallow** | `sf`, `bf` | Core only (A1-A3) + project values | 3-5 lines inline | Quick sanity check, auto-trigger in gabe-roast |
| **standard** | (default) | All Standard (A1-A7+) + project values + advisory AP checks | Full alignment document | Before design, implementation, or non-trivial tasks |
| **deep** | `dp` | All values + advisory AP checks + brief | Alignment document + alignment brief | Greenfield projects, new architectures, major decisions |

### Automatic checkpoint

Fires at `git commit` / `gh pr create` via hook: values evaluation (session+story altitude only) + scenario check (3 realistic scenarios per changed file) + inline summary before the commit proceeds.

### Subcommands

| Command | What it does |
|---------|-------------|
| `/gabe-align init [name]` | Create `.kdbp/` with BEHAVIOR.md + VALUES.md (interactive), then run readiness check |
| `/gabe-align init-user` | Create `~/.kdbp/VALUES.md` (interactive) |
| `/gabe-align install-hooks` | Check `~/.claude/settings.json` for KDBP hooks and install missing ones (with confirmation) |
| `/gabe-align status` | Show current values (user + project) |
| `/gabe-align migrate` | Convert old `_kdbp/` to new `.kdbp/` format |
| `/gabe-align evolve` | Review value PASS/CONCERN frequency, suggest changes |

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS`.
2. Read `references/align-spec.md` IN FULL before executing — the binding spec. If missing, E6 applies — STOP.
3. Load values: structural `VALUES.md` (A1-A7), `~/.kdbp/VALUES.md` (user), `.kdbp/VALUES.md` (project); for standard/deep also load the architecture-principles catalog.
4. Identify mode (shallow/standard/deep) and target; for artifact targets, locate and read all referenced files.
5. For each applicable value: state handle, apply the test question, produce PASS/CONCERN/FAIL with cited evidence; in standard/deep run advisory AP checks separately.
6. If `.kdbp/RULES.md` exists, run an implicit rule-violation cross-check against the target.
7. Produce the mode's output format; list action items for CONCERN/FAIL; propose new values for uncovered gaps; deep mode also produces the alignment brief.
8. Automatic checkpoint (commit/PR hook): evaluate Hot-tier values + scenario coverage, append a summary line to `.kdbp/LEDGER.md`, and route untested ❌ scenarios to `.kdbp/PENDING.md`.

## Output contract (summary)

Shallow: inline 3-5 line verdict. Standard/deep: full alignment document with PASS/CONCERN/FAIL counts, an advisory AP section, action items, and a deterministic verdict (any FAIL → DO NOT PROCEED; else any CONCERN → PROCEED WITH CONCERNS; else PROCEED). Deep mode appends an alignment brief. Automatic checkpoint always appends one line to `.kdbp/LEDGER.md` and, on user-proceeded ❌ scenarios, writes deferred rows to `.kdbp/PENDING.md`. The full output contract in the spec is binding.
