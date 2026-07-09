---
name: gabe-plan
description: "Command wrapper for /gabe-plan. Use when the user invokes Gabe Plan, /gabe-plan, or asks to create, update, check, complete, defer, cancel, or replace a KDBP plan."
---

# Gabe Plan - Command Wrapper

## Gabe execution contract (E1–E7)

These are floors, not ceilings — a skill's own gate may be stricter, never looser.

- **E1 EVIDENCE** — every claim about code/state cites file:line or a command run THIS session; no citation → mark it `(assumed)` and verify before building on it. Absence claims ("no X exists") require a recorded search → 0 hits.
- **E2 RUN-BEFORE-✅** — ✅ only after the command executed here (paste cmd + exit/count). Skipped = `⤫ skipped(<reason>)`, never ✅. Every printed number is copied from this run's output — never estimated.
- **E3 NO SILENT DOWNGRADE** — quote the task text verbatim before implementing; if your plan delivers a cheaper class (restyle≠rebuild, stub≠implement, recreate≠reuse), STOP and ask. Substitution requires an explicit user decision line.
- **E4 REUSE FIRST** — before creating anything, print: `REUSE <path> | EXTEND <path> | NEW (searched <where> — none fit)`. Recreating an existing artifact is a defect.
- **E5 STATE SYNC** — actions that change reality (commit/merge/defer/pivot) write their state row in the SAME turn; a skipped write prints an enumerated skip code, never silence.
- **E6 MISSING ANCHOR = STOP** — referenced template/spec/catalog absent → print ⛔ and stop; never reconstruct it from memory.
- **E7 REPORT WHERE** — end user-visible work with: exact URL/screen · env (local :port vs deployed) · what to look at · absolute artifact paths.

## Purpose

Expose `/gabe-plan` as a selectable skill in agents that use skills instead of
native slash-command routing. The command markdown remains the source of truth;
this wrapper only tells the host how to find and execute it.

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS`.
2. Load the first existing command spec:
   - `.claude/commands/gabe-plan.md` from the current project, if present
   - `.agents/commands/gabe-plan.md` from the current project, if present
   - `~/.claude/commands/gabe-plan.md`
   - `~/.agents/commands/gabe-plan.md`
   - `~/projects/gabe_lens/commands/gabe-plan.md`
3. Follow that command spec exactly, including lifecycle, tier, PLAN, DECISIONS,
   LEDGER, optional HTML review artifacts, and Gabe-Lens output rules.
4. If the command dispatches another Gabe command and the host cannot invoke it as a
   native slash command, load that command's spec from the same search order and
   follow its output contract exactly.
5. Preserve visible command-time output requirements such as `Gabe-Lens block`,
   PLAN writes, LEDGER writes, HTML artifact status, and follow-up routing notes.
6. Do not replace the command with a hand-rolled equivalent.

When both Claude and Codex installed assets exist, prefer the path for the active
host. Claude Code should use `~/.claude`; Codex should use `~/.agents`;
repo-local `.claude`/`.agents` mirrors outrank home installs when present.
