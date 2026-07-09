---
name: gabe-scope-change
description: "Scope-change meta-router. User describes intended change; Opus classifier decides pivot vs addition per 9 pivot-trigger rules, then routes to /gabe-scope-addition or /gabe-scope-pivot with rationale. User can override with --force-addition or --force-pivot. Usage: /gabe-scope-change [--force-addition | --force-pivot] <description>"
---

# Gabe Scope Change

## Gabe execution contract (E1–E7)

These are floors, not ceilings — a skill's own gate may be stricter, never looser.

- **E1 EVIDENCE** — every claim about code/state cites file:line or a command run THIS session; no citation → mark it `(assumed)` and verify before building on it. Absence claims ("no X exists") require a recorded search → 0 hits.
- **E2 RUN-BEFORE-✅** — ✅ only after the command executed here (paste cmd + exit/count). Skipped = `⤫ skipped(<reason>)`, never ✅. Every printed number is copied from this run's output — never estimated.
- **E3 NO SILENT DOWNGRADE** — quote the task text verbatim before implementing; if your plan delivers a cheaper class (restyle≠rebuild, stub≠implement, recreate≠reuse), STOP and ask. Substitution requires an explicit user decision line.
- **E4 REUSE FIRST** — before creating anything, print: `REUSE <path> | EXTEND <path> | NEW (searched <where> — none fit)`. Recreating an existing artifact is a defect.
- **E5 STATE SYNC** — actions that change reality (commit/merge/defer/pivot) write their state row in the SAME turn; a skipped write prints an enumerated skip code, never silence.
- **E6 MISSING ANCHOR = STOP** — referenced template/spec/catalog absent → print ⛔ and stop; never reconstruct it from memory.
- **E7 REPORT WHERE** — end user-visible work with: exact URL/screen · env (local :port vs deployed) · what to look at · absolute artifact paths.

Single entry point for modifying a finalized SCOPE.md or ROADMAP.md. Classifies the requested change and routes to the right machinery. Never writes directly — routes to `/gabe-scope-addition` (additive) or `/gabe-scope-pivot` (direction shift).

**Why a router and not two commands the user picks from?** Because misclassifying a pivot as an addition corrupts version history. The classifier uses the declared 9 rules + Opus reasoning + rationale, so the user sees *why* it routed each way. User can override with a flag, but the default is classifier-driven to prevent silent scope corruption.

> **Rendering note.** Output templates in this spec wrapped in bare triple-backtick fences are spec-meta delimiters — render their contents as plain markdown at runtime. Tagged fences (```jsonl) stay fenced. See `gabe-docs/SKILL.md` § "Runtime output rendering convention".

## Procedure

### Step 1: Pre-flight

- If `.kdbp/SCOPE.md` does not exist: exit with "No finalized SCOPE.md. Run `/gabe-scope` first."
- If `.kdbp/scope-session.json` exists (in-progress scope): exit with "Active scope session in progress. Finish or abort `/gabe-scope` first."
- Parse `$ARGUMENTS`: extract `--force-addition`, `--force-pivot`, and description text.
- If no description provided: prompt "What do you want to change? (one paragraph describing the desired change)"

### Step 2: Classify

If `--force-addition` or `--force-pivot` set → skip classification, route directly.

Otherwise invoke `prompts/scope-change-classifier.md` (Opus) with `{current_scope, proposed_change, user_intent}`.

The 9 pivot triggers (any ONE = pivot; otherwise addition) — copied verbatim from `~/.claude/prompts/gabe-scope/scope-change-classifier.md` §System role, keep in sync:

| # | trigger_rule | Fires when |
|---|---|---|
| 1 | primary_user | Primary User changes (role/persona/segment) |
| 2 | non_user_flip | a Non-User becomes a Primary/Secondary User, or vice versa |
| 3 | sc_change | a Success Criterion is removed, inverted, or truth-flipped |
| 4 | goal_flip | a Non-Goal becomes a Goal, or a Goal becomes a Non-Goal |
| 5 | posture_shift | Architecture Posture macro-shift (sync↔async, local↔cloud-first…) |
| 6 | ref_conflict | authoritative ref replaced/downgraded/overridden, or a new conflicting authoritative ref added |
| 7 | business_model | funding/business-model shift that retargets the product |
| 8 | constraint_infeasibility | a constraint change makes an existing SC/REQ infeasible as written |
| 9 | timeline_compression | timeline forces REMOVING/skipping phases, not just accelerating |

Fallback gate: if the classifier prompt file cannot be read, do NOT classify from memory — present this table to the user and ask them to pick, recording `classifier: unavailable — user-picked rule <N>` in CHANGES.jsonl.

**current_scope** is built by reading SCOPE.md frontmatter + extracting primary_user, success_criteria, non_goals, architecture_posture, reference_frame.

**Output:** `{classification, trigger_rule, rationale, confidence, user_intent_matches_classification, suggested_next_command}`.

### Step 3: Route

Render classification result:

**Classification:** pivot (trigger: `primary_user`, confidence: high)

**Rationale:** Primary User shifts from solo knowledge workers to enterprise teams. Downstream collaboration, access controls, and compliance reqs will cascade.

**Suggested:** `/gabe-scope-pivot`

Options:
- `[p]` Proceed with `/gabe-scope-pivot`
- `[a]` Override → `/gabe-scope-addition` (records override rationale)
- `[c]` Cancel

On `proceed`: exec suggested command with the description as its argument.
On `override`: prompt for rationale ("why is this not a pivot?"), append rationale + override flag to Change Log, exec the opposite command.
On `cancel`: exit, no writes.

Low-confidence classifications (`confidence: low`) add a warning: "Classifier confidence low — human review recommended before proceeding."

### Step 4: Hand-off

After routing, control passes to the chosen command. `/gabe-scope-change` exits. The routing decision is recorded in the CHANGES.jsonl audit log regardless of outcome:

```jsonl
{"ts":"2026-04-21T15:00:00Z","event":"scope_change_classified","classification":"pivot","trigger_rule":"primary_user","confidence":"high","override":false,"routed_to":"/gabe-scope-pivot"}
```

## Flags

- `--force-addition` — skip classifier, route to addition. Records `override: true` in CHANGES.jsonl.
- `--force-pivot` — skip classifier, route to pivot. Records `override: true`.

Override without rationale is blocked — classifier skip still requires a one-line reason appended to the Change Log.

## Edge cases

**Classifier returns borderline call (confidence: low).** Warn + proceed with suggested route unless user cancels. Log the low-confidence case for human review.

**User invokes with empty description.** Prompt for description; exit if empty on second attempt.

**Both `--force-addition` and `--force-pivot` set.** Reject: "Pick one override flag."

**Description touches both pivot AND addition scope** (e.g., adding a REQ AND changing primary user). Classifier picks the more disruptive (pivot). Rationale surfaces both changes. User can split via two separate invocations.

## Integration

Called by user directly. Does not chain from `/gabe-scope`. Writes only to CHANGES.jsonl (audit). All artifact writes happen in the routed command.

## Command version

`v1.0`. Classifier prompt version `v2` with 9 rules + backward-compat trigger_rule enum.
