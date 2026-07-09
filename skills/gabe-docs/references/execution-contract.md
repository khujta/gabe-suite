# Suite conventions — the Gabe execution contract

> **Stated once, here, for the whole suite** (investigation 2026-07-07, migration rule B2.2-1).
> Every gabe skill carries a one-line pointer to this file instead of a pasted copy — do not
> re-add the full block to individual skills or commands.
>
> Installed with the suite in both homes:
> `~/.claude/skills/gabe-docs/references/execution-contract.md` (Claude Code) and
> `~/.agents/skills/gabe-docs/references/execution-contract.md` (Codex). From a sibling
> skill directory the relative path is `../gabe-docs/references/execution-contract.md`.

## Gabe execution contract (E1–E7)

These are floors, not ceilings — a skill's own gate may be stricter, never looser.

- **E1 EVIDENCE** — every claim about code/state cites file:line or a command run THIS session; no citation → mark it `(assumed)` and verify before building on it. Absence claims ("no X exists") require a recorded search → 0 hits.
- **E2 RUN-BEFORE-✅** — ✅ only after the command executed here (paste cmd + exit/count). Skipped = `⤫ skipped(<reason>)`, never ✅. Every printed number is copied from this run's output — never estimated.
- **E3 NO SILENT DOWNGRADE** — quote the task text verbatim before implementing; if your plan delivers a cheaper class (restyle≠rebuild, stub≠implement, recreate≠reuse), STOP and ask. Substitution requires an explicit user decision line.
- **E4 REUSE FIRST** — before creating anything, print: `REUSE <path> | EXTEND <path> | NEW (searched <where> — none fit)`. Recreating an existing artifact is a defect.
- **E5 STATE SYNC** — actions that change reality (commit/merge/defer/pivot) write their state row in the SAME turn; a skipped write prints an enumerated skip code, never silence.
- **E6 MISSING ANCHOR = STOP** — referenced template/spec/catalog absent → print ⛔ and stop; never reconstruct it from memory.
- **E7 REPORT WHERE** — end user-visible work with: exact URL/screen · env (local :port vs deployed) · what to look at · absolute artifact paths.

## Orchestration restraint (0.5c)

Before any multi-agent design/mockup fan-out, run the premise past the human with ONE cheap
single-agent spike. **Orchestrate to verify, not to generate taste.**

Why: in the 2026-07 investigation corpus, multi-agent fan-out was measurably strong for
*verification* (adversarial passes caught real defects) and measurably weak for *taste
generation* (delegated design panels amplified wrong premises instead of challenging them).
