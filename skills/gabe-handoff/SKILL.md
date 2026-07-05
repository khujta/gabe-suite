---
name: gabe-handoff
description: "Command wrapper for /gabe-handoff. Use when the user invokes Gabe Handoff, /gabe-handoff, or asks to hand off / wrap up the session, prepare a next-session prompt, or produce a resume prompt before context runs out."
---

# Gabe Handoff - Command Wrapper

## Purpose

Expose `/gabe-handoff` as a selectable skill in agents that use skills instead
of native slash-command routing. The command markdown remains the source of
truth; this wrapper only tells the host how to find and execute it.

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS` (e.g. `--dry-run`,
   `--no-sync`, or a free-text focus note).
2. Load the first existing command spec:
   - `.claude/commands/gabe-handoff.md` from the current project, if present
   - `.agents/commands/gabe-handoff.md` from the current project, if present
   - `~/.claude/commands/gabe-handoff.md`
   - `~/.agents/commands/gabe-handoff.md`
   - `~/projects/gabe_lens/commands/gabe-handoff.md`
3. Follow that command spec exactly, including evidence-gated PLAN cell sync,
   LEDGER/PENDING writes, the singleton `.kdbp/HANDOFF.md`, the visible KDBP
   SYNC report, and the paste-able resume prompt.
4. If the command dispatches another Gabe command and the host cannot invoke it
   as a native slash command, load that command's spec from the same search
   order and follow its output contract exactly.
5. Do not fabricate PLAN ✅ without a cited evidence line, and do not run the
   commit/push gates — handoff reflects committed/pushed reality, it does not
   create it. The command's visible output contract (KDBP SYNC report + resume
   prompt + absolute HANDOFF.md path) is part of the command.
6. Do not replace the command with a hand-rolled equivalent.

When both Claude and Codex installed assets exist, prefer the path for the active
host. Claude Code should use `~/.claude`; Codex should use `~/.agents`;
repo-local `.claude`/`.agents` mirrors outrank home installs when present.
