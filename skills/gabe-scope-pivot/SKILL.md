---
name: gabe-scope-pivot
description: "Scope pivot — direction change. Archives SCOPE.md v{N} and ROADMAP.md v{N} to archive/, re-derives v{N+1} from the new premise, records pivot rationale in Change Log. Triggered by the 9 pivot rules. Usage (direct): /gabe-scope-pivot <description>"
when_to_use: "Direction-changing scope rewrite (archive + re-derive SCOPE.md) — destructive; only via /gabe-scope-change routing or an explicit human request."
disable-model-invocation: true
metadata:
  version: 2.0.0
---

# Gabe Scope Pivot — direction-change rewrite

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

Handles direction-shifting scope changes. Unlike addition, a pivot restructures the premise — downstream SCs, REQs, phases, and refs all need re-evaluation. The old SCOPE is archived (never deleted); a new v{N+1} is derived.

**Invariants:**
- Old SCOPE.md v{N} + ROADMAP.md v{N} + scope-references.yaml v{N} archived to `.kdbp/archive/vN/`
- New SCOPE.md `version:` bumps to {N+1}; `last_scope_event:` updates
- New ROADMAP.md `roadmap_version:` resets to 1 (new scope = new roadmap history)
- Pivot rationale recorded in Change Log with reference to archived v{N}
- Research directory re-archived if regenerating (optional prompt)

> **Rendering note.** Output templates in this spec wrapped in bare triple-backtick fences are spec-meta delimiters — render their contents as plain markdown at runtime. Tagged fences (```yaml, ```diff) stay fenced. See `gabe-docs/SKILL.md` § "Runtime output rendering convention".

## Procedure

### Step 1: Pre-flight

Same as `/gabe-scope-change` — SCOPE.md must exist, no active session.

Announce the pivot intent:

```
PIVOT WARNING

This will archive SCOPE.md v{N} (created {date}) and ROADMAP.md v{N} to
.kdbp/archive/v{N}/. A new v{N+1} will be derived from the changed premise.

Pivot reason: {description}
Trigger rule: {from classifier}

This is a disruptive change. Downstream SCs, REQs, and phases will
be re-evaluated. Open questions from v{N} transfer to v{N+1}.

Type `pivot to v{N+1}` to confirm:
```

Typed confirm (exact match, case-insensitive). Any other response → abort.

### Step 2: Archive v{N}

```bash
mkdir -p .kdbp/archive/v{N}/
cp .kdbp/SCOPE.md .kdbp/archive/v{N}/SCOPE.md
cp .kdbp/ROADMAP.md .kdbp/archive/v{N}/ROADMAP.md
cp .kdbp/scope-references.yaml .kdbp/archive/v{N}/scope-references.yaml
# Research: archive the live tree; new pivot session will regenerate
if [ -d .kdbp/research ]; then
  mv .kdbp/research .kdbp/archive/v{N}/research
fi
```

Never delete. Archives are permanent audit trail.

### Step 3: Re-derive v{N+1}

Pivots require re-reasoning, not just mechanical transformation. Invoke the same step sequence as `/gabe-scope` but with prior state loaded:

**(a) Seed session.** Create fresh `scope-session.json` with:
- `current_step: step-1-intake`
- Context carried forward from v{N}: intake_summary + research_summary (as starting prior, not gospel)
- Pivot rationale + description stashed in session for use at Step 3 (Problem + Vision)

**(b) Run interview.** Step 1 re-runs but pre-answers are seeded from v{N} intake. Opus intake-quality-evaluator re-checks each against the pivot description — answers inconsistent with the new direction get re-asked.

**(c) Research.** Step 2 research can be skipped (user prompt: "Re-run research or reuse v{N} research?"). If reuse, the archived research tree is un-archived for the new session.

**(d) Drafts and finalize.** Steps 3–8 run as normal. Opus is explicitly told via the reasoning context: "This is a pivot of v{N}; the new primary direction is {description}. Inconsistencies with v{N} are expected and intended."

### Step 4: Pivot-specific Change Log entry

The `init` Change Log row in v{N+1} SCOPE.md is replaced with a `pivot` row:

```markdown
## 15. Change Log

| Date | Type | Summary |
|---|---|---|
| 2026-04-22 | pivot | Pivoted from v1 (archived at .kdbp/archive/v1/). Reason: {description}. Trigger: {trigger_rule}. Prior version's Open Questions migrated. |
```

### Step 5: CHANGES.jsonl entry

```jsonl
{"ts":"2026-04-22T10:00:00Z","event":"scope_pivot","from_version":1,"to_version":2,"trigger_rule":"primary_user","archive_path":".kdbp/archive/v1/","rationale":"{description}"}
```

### Step 6: Migrate Open Questions

Open Questions from v{N} that weren't resolved carry to v{N+1} §14 Open Questions with a `[migrated from v{N}]` tag. User prompted per-OQ: `keep` / `resolve-now` / `drop-as-obsolete`.

### Step 7: Finalize

Same as `/gabe-scope` Step 8 — write files, archive research (of the new session), tombstone session.json, git-commit prompt.

## Flags

- `--skip-research-prompt` — don't ask about research reuse; always re-run.
- `--reuse-intake` — skip Step 2(b) interview re-check; accept all v{N} intake answers as-is.

## Edge cases

**Pivot without confirmation.** Never proceed without typed confirm. No `--yes` flag.

**Pivoting an already-pivoted scope.** v{N} = 3 → archive to `.kdbp/archive/v3/`, new version 4. No cap on pivot depth.

**Archive directory already exists.** Abort with: "Archive .kdbp/archive/v{N}/ already exists. Prior pivot not completed cleanly?" Manual cleanup required before proceeding.

**Pivot description empty.** Prompt; exit on second empty attempt.

**User aborts during re-interview.** Session.json persists in the in-progress state. On next invocation: "Pivot in progress at Step {N}. Resume or abort?" If abort, the archive is preserved (v{N} files stay in archive); active SCOPE.md gets restored from archive; no partial v{N+1} emitted.

## Integration

Called by `/gabe-scope-change` (routed) or directly (not recommended without classifier rationale).

`/gabe-plan` warned on next invocation if ROADMAP.md version changed: "Roadmap regenerated. Re-read phase context?"

## Command version

`v1.0`.
