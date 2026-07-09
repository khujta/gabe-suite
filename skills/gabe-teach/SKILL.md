---
name: gabe-teach
description: "Consolidate the human's architect-level understanding of recent changes — renders lessons from commits under gravity wells (architectural sections), with analogies, Socratic verification, and .kdbp/KNOWLEDGE.md tracking. Usage: /gabe-teach [brief|topics|status|wells|init-wells|history|story|arch|retro|tour|free]"
when_to_use: "Teach me, explain what changed, consolidate my understanding of recent work — renders a lesson from commits. Rarely needed (2 observed uses in the corpus); invoke on explicit human request to learn, never proactively."
metadata:
  version: 2.0.0
---

# Gabe Teach — human knowledge consolidation

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## What this does

Countermeasure for "the human can't keep up with AI-paced changes." Teach-first, config-last: every bare-ish invocation renders a lesson or narrative immediately (never a dashboard); dashboards, catalog browsing, wells editing, and history browsing live behind explicit subcommands. Topics anchor to **gravity wells** (architectural sections of the app) so the human builds a map before individual details. Every lesson ends with the same four-verb menu: `[explain]` / `[next]` / `[test]` / `[skip]`.

**Modes** (from the spec's own Step 0 table):

| Mode | Kind | Purpose |
|------|------|---------|
| `brief` | orient | Newcomer-onboarding snapshot: app purpose + wells overview + recent activity |
| `topics` | teach | Session-aware teach loop over recent project changes (main flow) |
| `status` | admin | KNOWLEDGE.md summary per well + history timeline dashboard |
| `wells` | admin | List/edit gravity wells (rename, merge, archive, view topics per well) |
| `init-wells` | admin | Wizard to define gravity wells |
| `history` | admin | Full timeline — plans, phases, commits, sessions, topics |
| `story` | teach | Show cached Storyline, or generate if missing (narrative analogy of the whole project) |
| `arch` | teach | Alias for `arch next` — picks and teaches the next architecture concept immediately |
| `retro` | teach | Retrospective teach: skipped topics + superseded decisions + what-went-wrong lessons |
| `tour` | teach | Newcomer tour: walks wells → paths → files → key decisions |
| `free [concept]` | teach | Raw analogy generation (invokes the `gabe-lens` skill) |

**Inputs:** git history (`git log`, commit ranges scoped by well paths), `.kdbp/KNOWLEDGE.md` (Gravity Wells + Topics tables), architecture concepts from the `gabe-arch` skill, and the `gabe-docs` diagrams library (per-well diagram-type recommendations).

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS`.
2. Read `references/teach-engine.md` IN FULL before executing — it is the binding spec. If missing, E6 applies — STOP.
3. Parse `$ARGUMENTS` against the mode table above (Step 0 of the spec). Empty input renders the bare-invocation mode menu with a smart-pick default. If `.kdbp/` doesn't exist, fall back to `free` mode with a note to run `/gabe-init`.
4. Before `topics`, `status`, `history`, or `story` modes run, pass the Foundation Gate: verify `.kdbp/KNOWLEDGE.md` has a populated Gravity Wells section. If wells are missing, offer init / skip-to-G0 / abort — this gate fires once per project's lifetime.
5. Run the selected mode's engine steps exactly as the spec defines them (Status, Init-wells wizard, Wells, Topics main flow, History, Story, Free, Brief, Arch curriculum, Retro, Tour, Learning).
6. Every teach-mode lesson ends with the Universal Action Menu (`[explain]`/`[next]`/`[test]`/`[skip]`). On `[next]` or `[test]`, grade against the lesson's hidden EXPECTED-ANSWER key (never round a classification up), then write back immediately to KNOWLEDGE.md / STATE.md / HISTORY.md / the Sessions log before advancing — no state held only in memory across lessons.
7. Compute staleness on any KNOWLEDGE.md read in `topics`/`status` (topics unverified >90 days flagged `stale`).

## Output contract (summary)

`teach` modes render a lesson body ending in the Universal Action Menu. `orient` modes render a snapshot prompting `[teach]`. `admin` modes render a dashboard or editor with no lesson menu. Every write-back to `.kdbp/KNOWLEDGE.md` (well/topic status, verified/pending, ArchConcepts tags) is evidence-gated per the grading rule — never inflate a classification. `/gabe-teach` is suggested (never blocking) after `/gabe-commit` when new topics are detected and after `/gabe-push` when pending topics accumulate; it does not run during `/gabe-plan`. The full output contract in the spec is binding.
