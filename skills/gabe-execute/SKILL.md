---
name: gabe-execute
description: "Command wrapper for /gabe-execute. Use when the user invokes Gabe Execute, /gabe-execute, or asks to execute the current KDBP phase."
---

# Gabe Execute - Command Wrapper

## Purpose

Expose `/gabe-execute` as a selectable skill in agents that use skills instead
of native slash-command routing. The command markdown remains the source of
truth; this wrapper only tells the host how to find and execute it.

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS`.
2. Load the first existing command spec:
   - `.claude/commands/gabe-execute.md` from the current project, if present
   - `.agents/commands/gabe-execute.md` from the current project, if present
   - `~/.claude/commands/gabe-execute.md`
   - `~/.agents/commands/gabe-execute.md`
   - `~/projects/gabe_lens/commands/gabe-execute.md`
3. Follow that command spec exactly, including task decomposition, tier caps,
   verification gates, runtime evidence gates, PLAN/LEDGER writes, and Gabe-Lens
   output rules.
4. If the command dispatches another Gabe command and the host cannot invoke it as a
   native slash command, load that command's spec from the same search order and
   follow its output contract exactly.
5. Preserve visible command-time output requirements such as `Gabe-Lens block`,
   PLAN ticks, LEDGER writes, and teach nudges.
6. Do not replace the command with a hand-rolled equivalent.

When both Claude and Codex installed assets exist, prefer the path for the active
host. Claude Code should use `~/.claude`; Codex should use `~/.agents`;
repo-local `.claude`/`.agents` mirrors outrank home installs when present.
