---
name: gabe-walk
description: "Human-eye verification of something built: BRIEF the walker first (why this walk · what changed · the flow itinerary · what pass means), then record the walk — four questions, one append to .kdbp/walks.jsonl (who · when · result · evidence · note). Records, never judges. Usage: /gabe-walk <feature|procedure> [pass|fail|partial]"
when_to_use: "A human is about to walk (or just walked) a feature, a manual station, or an operational procedure (deploy/rollback/incident drill) — brief them on what to check, then put the result on the record: pass, fail, or partial. Also: a station is stale and needs a fresh walk."
metadata:
  version: 1.1.0
---

# Gabe Walk — the witness

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## The intention

*Nothing in git, junit, or coverage knows whether a person opened the app and looked. This skill records that one fact and nothing else. It records — it never judges: a half-walk is a `partial`, a bad walk is a `fail`, and a subject with zero records renders NEVER-walked (red) until someone actually walks it. A synthesized witness is worse than an honest gap.*

*But a witness who was never told what they are witnessing produces a worthless record. So the walk has two halves: BRIEF first, record second. The briefing translates what is already on the record into "here is what you are looking at, and why your eyes are needed" — derived from committed data, never invented. Judging stays out of both halves.*

## Procedure

1. **Subject** — the feature slug or procedure name being walked (e.g. `transaction`, `deploy-rollback`). If the argument is missing, ask. For an entity walk the subject is the BARE adoption.json slug; `/gabe-adopt` approvals record `adopt:<slug>` — the center credits both to the entity's manual angle. This skill never invents a subject and never records "walked" on an agent's behalf — the walker is the human (E6: no subject, no record).
2. **Brief the walker** — a walk request must never be a mystery. Before any question, assemble and show (all from committed data — E1; each item that has no source is named absent, never padded):
   - **Why this walk**: what triggered it, in one sentence — the adoption section awaiting approval, the phase that just shipped, the stale station, the drill.
   - **What this thing is**: the card's HANDLE + WHAT & WHY (`<center>/cards/<slug>.md`). No card → say "no card — freeform walk" and continue.
   - **The itinerary**: the card's `# FLOWS` list — each key + description, `★` first. Join `archmap.json` `coverage`: a flow with machine proof says "compare against its proof set"; an UNPROVEN flow says **"your eyes are the only verification this flow has"** — that is where the walk earns its keep. For a procedure: point at its runbook/Foundations doc if one exists.
   - **What the verdict means here**: `pass` = you walked it and it held · `partial` = you walked part (the note says which part) · `fail` = something broke (the note says what). The note is the witness statement, in the walker's own words.
   A walker who stops after the briefing leaves NO record.
3. **Four questions** (any already answered by `$ARGUMENTS` are skipped): result (`pass | fail | partial`) · evidence path if any (shots/notes dir — optional, recorded verbatim) · a one-line note in the walker's words · confirm the walker identity (default: `git config user.name`).
4. **Append one line to `.kdbp/walks.jsonl`** (create the file on first walk — append-only, never edited, never reconciled):
   ```json
   {"subject":"cook-state","who":"<name>","when":"<ISO-8601 UTC>","result":"pass|fail|partial","evidence":"<path or null>","note":"<one line>"}
   ```
5. **Report** (E7): the appended line verbatim + the subject's new staleness clock (last-walk date). A `fail` result also prints: `fail recorded — this renders red on the center until a passing walk lands` (no auto-fixing, no judgment).

## Non-goals

- Does NOT author procedures (those are Foundations prose, written by humans).
- Does NOT verify the evidence path's contents — it records what the walker states (the record is the witness's, not the model's).
- Does NOT compute staleness thresholds — rendering and staleness are the center generator's read of `walks.jsonl`.
- One project-wide file by design (D-ruling: n=1 operator; per-feature files are a cheap later trade if walkers multiply).

$ARGUMENTS
