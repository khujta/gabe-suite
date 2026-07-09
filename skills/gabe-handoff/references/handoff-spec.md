# Gabe Handoff — full spec

> This file is the binding spec; the SKILL.md core is a summary. E1–E7 contract:
> see `../../gabe-docs/references/execution-contract.md`.

> **Rendering note.** Output templates in this spec wrapped in bare triple-backtick fences (no language tag) are spec-meta delimiters — render their contents as plain markdown at runtime (the sync report and the prompt display as prose/tables, not monospace code). Tagged fences (```bash, etc.) stay fenced. See `gabe-docs/SKILL.md` § "Runtime output rendering convention".

## Purpose

Answer one question: **"How do I stop here and resume this exact work in a fresh session with zero fidelity loss?"**

Two deliverables:

1. **A paste-able next-session prompt** — self-contained, evidence-grounded, printed inline AND saved to the singleton `.kdbp/HANDOFF.md`. A fresh session (new terminal, next day, cold context) can paste it and resume mid-task.
2. **Durable KDBP state sync** — the PLAN cells, LEDGER, and PENDING are brought into line with what actually happened this session, so the next session recovers the state even *without* the prompt.

This is the deliberate, high-fidelity counterpart to the automatic `session-end.js` transcript scrape (the `ECC:SUMMARY` block). That summary is mechanical — truncated user messages, tool names, file paths, no intent, no decisions, no reasoned next step. `/gabe-handoff` captures what the scrape can't: *why* the work matters, *what was decided*, and the *exact next move with its constraint*.

## When to use

- Context is filling up (you're near the auto-compact threshold) and you want a clean cut, not a lossy summarization.
- You're ending a work session and the task is mid-flight.
- You're switching machines and need the state to travel.
- You finished a chunk and want the next session to start from an accurate PLAN + a crisp prompt.

Don't use when the session accomplished nothing to carry (nothing to hand off), or when you're about to `/gabe-commit` + `/gabe-push` and stop cleanly — those already write durable state. Handoff is for *mid-flight* continuity and for capturing intent the commit trail doesn't hold.

## Arguments

| Arg | Effect |
|-----|--------|
| _(none)_ | Full handoff: KDBP sync + `.kdbp/HANDOFF.md` + inline prompt. |
| `--dry-run` | Preview the sync diff + the prompt; write NOTHING. For inspecting before committing to disk. |
| `--no-sync` | Emit the prompt + write `.kdbp/HANDOFF.md`, but leave LEDGER/PLAN/PENDING untouched (read-only on the rest). |
| `<focus note>` | Free text steering what the prompt should emphasize (e.g. `focus on the PeriodControl port`). Folded into the prompt's Task section. |

## Procedure

### Step 0: Preconditions

1. Determine repo root (git repo). If not a git repo → still emit the prompt from conversation context; write `.kdbp/HANDOFF.md` if `.kdbp/` exists else print the prompt inline only; note `(no git — state section is best-effort)`.
2. `.kdbp/` present? If **yes** → full flow. If **no** → `--no-sync` behavior is forced; the prompt still gets produced from git + conversation; print `ℹ No KDBP — emitting prompt only (no state sync). Run /gabe-init to enable durable handoff.`
3. Parse `$ARGUMENTS` for `--dry-run` / `--no-sync` flags; the remainder is the focus note.

### Step 1: Gather evidence (read-only)

Collect the raw material. Every item feeds a cited claim — no evidence, no claim (E1).

**Git state:**
```bash
git branch --show-current
git log --oneline -n 20
git status --porcelain
git rev-list --count @{u}..HEAD 2>/dev/null   # commits ahead of upstream (0 = pushed)
git rev-list --count HEAD..@{u} 2>/dev/null   # commits behind (drift)
```
Record: branch, HEAD sha + subject, uncommitted/untracked files, unpushed commit count, upstream drift.

**KDBP state (read):**
- `.kdbp/PLAN.md` — `## Current Phase` pointer + the `## Phases` table (columns `# | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push`; symbols ⬜ not started · 🔄 in progress · ✅ complete). Identify the active phase row(s) touched this session.
- `.kdbp/PENDING.md` — open deferred items (table; `Status != resolved/closed`).
- `.kdbp/LEDGER.md` — the most recent entry (for continuity + to avoid duplicating).
- `.kdbp/ROADMAP.md` (if present) — the larger arc the session sits inside.

**This session's work (from the conversation, cited):**
- What landed — features/files changed, each tied to a commit sha or a file:line.
- Verification actually run this session — build/typecheck/test/lint commands + their exit codes/counts (E2). If none ran, say so.
- Decisions made this session (approach chosen, scope confirmed, forks resolved) — these belong in the prompt AND may warrant a `DECISIONS.md`/`LEDGER` note.
- In-flight work — the exact task underway, how far it got, which files are partially done.
- Agreed-but-not-started next steps — quoted from the user or from PLAN/ROADMAP (E3: quote verbatim, don't paraphrase into a cheaper task).

### Step 2: Classify each work item → state

For every unit of work this session, tag it:

| Tag | Meaning | Drives |
|-----|---------|--------|
| **LANDED** | Done + verified + committed (sha exists) | PLAN Exec/Review/Commit ticks (evidence-gated) |
| **IN-FLIGHT** | Started, not finished (uncommitted or partial) | Prompt Task section + PLAN 🔄 + PENDING |
| **DECIDED-NEXT** | Agreed, not started | Prompt "Next" + PENDING if it's a defer |
| **DEFERRED** | Consciously postponed | PENDING row |

### Step 3: Full KDBP state sync (skip entirely on `--no-sync` / `--dry-run` writes-off)

**Principle: sync to _observed reality_, never fabricate completion.** Every ✅ this step writes MUST carry an evidence citation. Missing evidence → leave the cell and note it in the sync report. This step reflects what already happened; it does NOT run the commit/push gates (those stay owned by `/gabe-commit` + `/gabe-push`).

**3a — PLAN.md phase cells.** For each active phase row, set each column to reality:

| Column | Set ✅ only if… | Evidence required |
|--------|----------------|-------------------|
| **Exec** | phase tasks done AND a verification command ran green THIS session | cmd + exit/count (E2). Partial → `🔄`. Untouched → leave `⬜`. |
| **Review** | a review actually ran this session (`/gabe-review` or a reviewer agent with a recorded verdict) | verdict line / archive path. Else leave as-is. |
| **Commit** | `git log` shows commit(s) covering this phase's work | commit sha(s). Uncommitted → leave `⬜` + flag "run /gabe-commit". |
| **Push** | those commits are on the upstream (`git rev-list @{u}..HEAD` excludes them) | `git branch -r --contains <sha>` / ahead-count 0. |

Never bump a cell past reality. If the work is genuinely done + verified but not yet committed, Exec/Review may be ✅ while Commit/Push stay ⬜ — that's the correct, honest state, and `/gabe-commit`'s idempotent auto-tick will agree later.

Also refresh: `## Current Phase` pointer (if the session advanced/retreated the active phase) and `Last Updated` in `## Context` → today's date.

**3b — LEDGER.md.** Append ONE reverse-chronological entry at the top of the entry list, matching the house format:

```
## <YYYY-MM-DD> — HANDOFF: <session theme>
DONE: <landed work, each with a sha or file:line>.
IN-FLIGHT: <the exact task underway + how far + which files>.
GATES: <verification run this session — cmd + exit/count, or "none run">.
PLAN SYNC: <cells changed this run, e.g. "Phase 19 Exec ⬜→🔄 (ScanResult.tsx trust fix shipped, 5f804d0)">.
DEFERRED: <new PENDING rows, or "none">.
NEXT: <the single next command/task the resume prompt points at>.
HANDOFF: .kdbp/HANDOFF.md refreshed.
```

**3c — PENDING.md.** For each IN-FLIGHT-that-could-be-dropped or DEFERRED item not already tracked, add a row (respect the existing table columns; don't duplicate an open row — match by file + finding overlap, as `/gabe-review` does).

**3d — Print the sync report** (E5, visible — every state write is shown):

```
KDBP SYNC
PLAN:    Phase N [name] — Exec ⬜→🔄 · Commit ⬜ (uncommitted: 3 files)   [evidence: npm run build exit 0; git status]
         Current Phase → N (unchanged) · Last Updated → <date>
LEDGER:  + HANDOFF entry appended
PENDING: + P<n> <one-line>   (or "no change")
```

On `--dry-run`: print this report prefixed `DRY-RUN — nothing written` and stop after Step 4's prompt preview.

### Step 4: Compose the next-session prompt

Self-contained and evidence-grounded — a cold session must be able to resume from it alone. Use this skeleton (fill every section; drop a section only if genuinely empty):

```
Continue <epic/lane name> on branch `<branch>` (HEAD `<sha>` — <subject>). Active phase: <N · name> per .kdbp/PLAN.md.

READ FIRST: .kdbp/HANDOFF.md, then .kdbp/PLAN.md (Phase <N>)<, + key docs>.

STATE
- Landed this session: <bullets, each cited — sha / file:line>.
- Verified: <build/test/lint cmd + exit/count>, or <what's unverified>.
- In-flight: <the exact task + how far it got + the partially-touched files with paths>.

TASK (do this next)
<The single next step, quoted verbatim from the user/PLAN/ROADMAP — no silent downgrade (E3). Include the APPROACH CONSTRAINT (e.g. "adopt the real design-lab component, don't reconstruct"). Fold in the <focus note> arg if given.>

RUNBOOK
- Start: <server/dev commands with flags + ports>.
- Verify: <the real typecheck/test/e2e commands for this repo>.
- Gotchas: <traps from LEDGER/KNOWLEDGE/memory that would bite a fresh session>.

AFTER THAT
<the queued follow-ups, in order, one line each>.
```

Rules for the prompt:
- **Absolute + repo-relative paths** for anything the next session must open (E7). No vague "the trends file."
- **Quote the task**, don't summarize it into something easier (E3).
- **Cite state** — "Trends re-skin complete (5f804d0)" not "trends looks done".
- **Carry the constraint** — if the work has a governing rule (a design principle, a tier cap, an ADOPT-don't-recreate directive), it goes in TASK. The next session won't have the conversation that established it.
- **No open questions to the user inside the prompt** — a handoff prompt is an instruction to the next session, not a question to the human. If a decision is genuinely unresolved, put it under TASK as "DECIDE FIRST: <fork>" so the next session surfaces it.

### Step 5: Write `.kdbp/HANDOFF.md` (singleton — overwritten each run)

```
# Handoff — <session theme>

> Generated <YYYY-MM-DD> · branch `<branch>` · HEAD `<sha>` · Phase <N · name>
> Singleton — each /gabe-handoff overwrites this. Durable state lives in PLAN/LEDGER/PENDING.

## Resume prompt

<the Step 4 prompt verbatim — this is the paste-able artifact>

## State snapshot

- Landed: <bullets, cited>
- In-flight: <task + files>
- Verified: <cmd + exit/count>
- KDBP sync this run: <one-line summary of Step 3d>
```

On `--no-sync`, the "KDBP sync this run" line reads `none (--no-sync)`.

### Step 6: Visible output

Print, in order:
1. The **KDBP SYNC** report from Step 3d (or the dry-run/no-sync note).
2. The **resume prompt** (Step 4), rendered as a copy-paste block.
3. A one-line pointer: `Saved → /abs/path/.kdbp/HANDOFF.md · paste the prompt above into your next session.` (E7 — absolute path).

## Non-goals

- Does NOT run the commit or push gates — it reflects committed/pushed reality, it doesn't create it. Uncommitted work is flagged, not committed. Run `/gabe-commit` + `/gabe-push` separately if you want to ship before handing off.
- Does NOT run lints/tests/builds to *manufacture* a green tick — it only records verification that already ran this session (E2).
- Does NOT fabricate PLAN ✅ without evidence. A cell with no supporting citation is left untouched and noted.
- Does NOT write a per-session `docs/*-HANDOFF.md`. The durable record is PLAN/LEDGER/PENDING; the ephemeral resume vehicle is the singleton `.kdbp/HANDOFF.md` + the printed prompt.
- Does NOT replace the automatic `ECC:SUMMARY` (session-end hook). It supersedes it in fidelity; both can coexist.
- Does NOT modify KNOWLEDGE.md, VALUES.md, DECISIONS.md, or hooks. (Recording a *decision* is `/gabe-teach` / a DECISIONS edit; handoff only points at in-flight work.)

## Integration

| From | Trigger | What handoff adds |
|------|---------|-------------------|
| Heavy context / near compaction | User runs `/gabe-handoff` | Clean cut with a fidelity-preserving prompt instead of lossy auto-summarization |
| End of a mid-flight session | User wraps up | Durable PLAN/LEDGER/PENDING sync + resume prompt |
| Machine switch | Continuity | `.kdbp/HANDOFF.md` travels with the repo; the prompt is host-agnostic |
| Next session start | Fresh session | Reads `.kdbp/HANDOFF.md` (surfaced by CLAUDE.md's KDBP table) + the pasted prompt |

**Optional wiring (not done by this command; documented for the suite maintainer):**
- Add a `.kdbp/HANDOFF.md` row to the CLAUDE.md "What to read when" table via the `gabe-init` template, so new projects surface it at session start.
- Teach `session-start.js` to echo `.kdbp/HANDOFF.md`'s Resume-prompt section when present (higher-fidelity than the ECC scrape).

$ARGUMENTS
