---
name: gabe-scope
description: "Backbone authoring command for the Gabe Suite. Produces SCOPE.md — stable premise plus a `## Phases` phase arc — for a new project. Multi-step, checkpoint-gated, Opus-reasoning + Sonnet-templating. Every major step requires explicit user approval before the next runs. Usage: /gabe-scope [--resume | --start-over]"
when_to_use: "Scope a NEW project — produce SCOPE.md (premise + phase arc) from an idea; checkpoint-gated authoring. For changing an existing scope use /gabe-scope-change instead."
metadata:
  version: 2.1.1
---

# Gabe Scope — project backbone authoring

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## What this does

The backbone authoring command. Produces ONE linked artifact for a new project:

**`.kdbp/SCOPE.md`** — high-inertia premise (problem, users, success criteria, requirements, constraints, posture) plus a `## Phases` section holding the medium-inertia phase arc derived from that premise. The premise changes only through `/gabe-scope-change` once finalized; the phase arc evolves within the same file as phases complete, split, or get inserted.

Delivers the full 8-step workflow (pre-flight Step 0, Reference Frame Step 0.5, Steps 1–8) with strict per-step checkpoint gating and days-later resumability via `.kdbp/scope-session.json`.

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS`.
2. Read `references/scope-spec.md` IN FULL before executing — the binding spec (checkpoint gates, prompt-library usage from `~/.claude/prompts/gabe-scope/`, schema validation). If missing, E6 applies — STOP.
3. Run the step sequence exactly as the spec defines it:
   - **Step 0 (pre-flight, only if SCOPE.md or session.json already exist):** resume vs. start-over vs. continue-to-planning menu; typed confirm before any archive.
   - **Step 0.5 (Reference Frame):** deterministic scan for existing docs/rules, user adds/weights/sets load-mode on refs, writes `.kdbp/scope-references.yaml`.
   - **Step 1 (Intent Capture):** Opus interview — 5 core questions + up to 10 signal-triggered follow-ups; a brainstorm sub-loop (hard 2-cycle cap) fires when an answer is idea-quality; ends at an intake-summary checkpoint.
   - **Step 2 (Research):** user picks width (quick/standard/deep), parallel research agents write to `.kdbp/research/`, Opus synthesizes `SUMMARY.md`; checkpoint reviews the summary only.
   - **Step 3 (Problem + Vision, SCOPE §1–3):** Opus draft, wrapped in an in-file `[PENDING APPROVAL — step-3]` marker, checkpoint.
   - **Step 4 (Users + Non-Users, §4–6):** Sonnet draft with Opus escalation if `non_users` comes back empty; checkpoint.
   - **Step 5 (Success Criteria + Non-Goals, §7–8):** Opus, two calls; the highest-friction checkpoint by design; conflict-surfacing against authoritative reference-frame entries.
   - **Step 6 (Constraints + Architecture Posture, §9–10):** Sonnet, one call; conflict check against authoritative refs before rendering; checkpoint.
   - **Step 7 (Requirements → Phase Split → Phases, sub-steps 7.1–7.4):** Opus REQ generation with a deterministic SC-coverage check; zero-LLM granularity choice; phase skeleton checkpoint; populate with dependency graph + REQ-coverage check; second checkpoint.
   - **Step 8 (Finalize):** assemble from the CURRENT on-disk SCOPE.md — never overwrite user edits made outside pending markers — validate coverage + anchors, write the file, archive research, tombstone the session, update `KNOWLEDGE.md`, offer (never auto-run) a git commit.
4. Every step writes `session.json` atomically after each sub-step; every generated block is bracketed by `[PENDING APPROVAL — step-N]` markers the user can edit in-file before approving.
5. On any LLM call failure, non-conformant output, invalid checkpoint response, or schema-validation failure, apply the spec's error-handling table — never silently downgrade or guess.

## Output contract (summary)

Produces `.kdbp/SCOPE.md` (frozen once finalized — only `/gabe-scope-change` may modify it thereafter, including its `## Phases` section). Finalize enforces: every Success Criterion covered by ≥1 Requirement, every Requirement mapped to exactly one phase, and all markdown anchors resolve — abort with specific remediation otherwise, or proceed with `--force` and a recorded gap. Archives research to `.kdbp/research/archive/{timestamp}/`, tombstones the session to `.kdbp/archive/tombstones/`, and offers (never auto-runs) a suggested git commit. The full output contract in the spec is binding.
