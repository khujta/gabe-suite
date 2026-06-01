---
name: gabe-commit
description: "Command wrapper for /gabe-commit. Use when the user invokes Gabe Commit, /gabe-commit, or asks to run the Gabe commit quality gate."
---

# Gabe Commit - Command Wrapper

## Purpose

Expose `/gabe-commit` as a selectable skill in agents that use skills instead
of native slash-command routing. The command markdown remains the source of
truth; this wrapper only tells the host how to find and execute it.

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS`.
2. Load the first existing command spec:
   - `.claude/commands/gabe-commit.md` from the current project, if present
   - `.agents/commands/gabe-commit.md` from the current project, if present
   - `~/.claude/commands/gabe-commit.md`
   - `~/.agents/commands/gabe-commit.md`
   - `~/projects/gabe_lens/commands/gabe-commit.md`
3. Follow that command spec exactly, including deterministic checks, commit
   message rules, PLAN auto-tick, LEDGER behavior, and the visible
   `Gabe-Lens brief`.
4. If the command dispatches another Gabe command and the host cannot invoke it as a
   native slash command, load that command's spec from the same search order and
   follow its output contract exactly.
5. Do not stop after raw `git commit`; the command's visible output contract is
   part of the command.
6. Do not replace the command with a hand-rolled equivalent.

When both Claude and Codex installed assets exist, prefer the path for the active
host. Claude Code should use `~/.claude`; Codex should use `~/.agents`;
repo-local `.claude`/`.agents` mirrors outrank home installs when present.
