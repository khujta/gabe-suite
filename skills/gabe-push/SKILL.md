---
name: gabe-push
description: "Command wrapper for /gabe-push. Use when the user invokes Gabe Push, /gabe-push, or asks to push, create PRs, watch CI, promote, or run the Gabe shipping workflow."
---

# Gabe Push - Command Wrapper

## Purpose

Expose `/gabe-push` as a selectable skill in agents that use skills instead of
native slash-command routing. The command markdown remains the source of truth;
this wrapper only tells the host how to find and execute it.

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS`.
2. Load the first existing command spec:
   - `.claude/commands/gabe-push.md` from the current project, if present
   - `.agents/commands/gabe-push.md` from the current project, if present
   - `~/.claude/commands/gabe-push.md`
   - `~/.agents/commands/gabe-push.md`
   - `~/projects/gabe_lens/commands/gabe-push.md`
3. Follow that command spec exactly, including PUSH.md setup, remote drift
   handling, push/PR/CI/promotion behavior, deployment logging, PLAN auto-tick,
   and any visible output requirements.
4. If the command dispatches another Gabe command and the host cannot invoke it as a
   native slash command, load that command's spec from the same search order and
   follow its output contract exactly.
5. Preserve branch-cleanup prompts and safe git/GitHub behavior from the command
   spec.
6. Do not replace the command with a hand-rolled equivalent.

When both Claude and Codex installed assets exist, prefer the path for the active
host. Claude Code should use `~/.claude`; Codex should use `~/.agents`;
repo-local `.claude`/`.agents` mirrors outrank home installs when present.
