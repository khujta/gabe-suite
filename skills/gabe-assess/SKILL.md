---
name: gabe-assess
description: "Rapid decision-context assessment for changes that feel obvious but carry hidden weight. Surfaces blast radius, maturity-appropriate scope, and prerequisites before committing. Usage: /gabe-assess [change description or 'this']"
when_to_use: "Before committing to an 'obvious' change — what's the blast radius of changing X, is this bigger than it looks, what must exist first; rapid impact assessment, cheaper than a full plan."
metadata:
  version: 1.1.0
---

# Gabe Assess — Change Impact Assessment Skill

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## What this does

Pause before an "obvious yes" and take a photograph of what a proposed change actually means — blast radius, maturity-appropriate scope, prerequisites, and alternatives — before agreeing to it. This is NOT a code review (use gabe-roast) and NOT alignment checking (use gabe-align); it's the moment between "should we do X?" and "yes," the triage instinct that asks what you're actually signing up for. Use when about to reflexively say yes to a suggested fix, detour, or scope addition; skip for trivially-scoped changes (rename, typo) or when you've already assessed and are now implementing.

## Usage / modes

`/gabe-assess [change description or 'this']`

Required input: the proposed change (inline description, a reference to earlier discussion, or "this") plus its context (mid-task / planning / post-review / blocker) — auto-detected or stated.

Every full-mode assessment covers five dimensions: **D1** Blast Radius (Contained/Local/Cross-cutting/External), **D2** Maturity-Appropriate Scope (MVP/Enterprise/Scale, vs. the project's actual maturity), **D3** Prerequisites, **D4** Alternatives (do nothing / minimal / proper / workaround), **D5** Structural Fit (only when `.kdbp/STRUCTURE.md` exists — flags files proposed in undeclared locations).

| Mode | Alias | Output | Use when |
|------|-------|--------|----------|
| **full** | (default) | All 5 dimensions + alternatives + recommendation | Change isn't trivial and you need to decide |
| **brief** | `bf` | One line per dimension + Rec + Handle | Quick gut-check, triaging multiple changes in sequence |
| **inline** | `il` | Single sentence, no formatting | The assessment should feel like a colleague's aside |

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS` (the proposed change, or "this").
2. Read `references/assess-spec.md` IN FULL before executing — the binding spec. If missing, E6 applies — STOP.
3. Identify the proposed change and its context; if either is vague, ask rather than guess.
4. Read enough to understand what the change touches — files, configs, environments — before classifying D1.
5. Assess D1-D4 concretely and specifically (never inflate or deflate); run D5 only when `.kdbp/STRUCTURE.md` exists, extracting anticipated file paths from the change description and matching them against Allowed Patterns.
6. Produce the mode-appropriate output. The recommendation is a suggestion, not a gate — the user decides.
7. When multiple changes are proposed together, assess each separately in brief mode, then produce a combined batch recommendation (independent/coupled/sequenced + order).

## Output contract (summary)

Full mode: GABE ASSESS header + D1-D5 breakdown + RECOMMENDATION + a Gabe-Lens-format ONE-LINER (5-12 words, concrete, survives fatigue). Brief mode: one line per dimension + Rec + Handle. Inline mode: a single sentence. Batch mode adds a combined table (Change/Blast/Maturity/Rec) + Order + Handle. The full output contract in the spec is binding.
