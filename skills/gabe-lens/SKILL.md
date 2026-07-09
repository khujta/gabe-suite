---
name: gabe-lens
description: Cognitive translation skill that transforms technical concepts into analogies, spatial maps, constraint boxes, and one-line handles — adapts to your cognitive suit.
when_to_use: "Explain this concept my way, give me a handle / analogy / spatial map for X, annotate this file, calibrate my cognitive suit — cognitive translation of technical material."
metadata:
  version: 2.4.0
---

# Gabe Lens — Cognitive Translation Skill

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## What this does

Transform complex technical concepts into a format that matches how the user actually thinks. This skill teaches any agent HOW to explain things so the user absorbs and retains them. It does not change WHAT is communicated — only the format.

## Cognitive Suit — Loading the Profile

Before producing any Gabe Block, check for a profile at `~/.claude/gabe-lens-profile.md`.

- **If the file exists:** read the `suit` field from frontmatter. Load the matching suit from `SUITS.md` and adapt all output accordingly.
- **If the file does not exist:** use the default suit (Spatial-Analogical).
- **To calibrate:** run `/gabe-lens calibrate`. This presents the same concept in 4 suits and saves the user's choice.
- **To reset to default:** run `/gabe-lens calibrate reset`.

Available suits: Spatial-Analogical (default), Sequential-Procedural, Abstract-Structural, Narrative-Contextual. Full definitions in `SUITS.md`.

## Usage / modes

| Mode | Usage | Output |
|---|---|---|
| **Explain — Full** (default) | `/gabe-lens [concept or question]` | One complete Gabe Block (~200-350 tokens) |
| **Explain — Brief** | `/gabe-lens brief [concept]` (alias `bf`) | Constraint box + one-line handle only (~40-80 tokens) |
| **Explain — Oneliner** | `/gabe-lens oneliner [concept]` (alias `ol`) | The one-line handle alone (~5-15 tokens) |
| **Annotate** | `/gabe-lens annotate [file-path]` (alias `an`) | Companion file `{name}-gabe-lens.md` with full Gabe Blocks for the source's 3-5 most complex concepts |
| **Calibrate** | `/gabe-lens calibrate` (or `calibrate reset`) | Interactive: renders one concept in all 4 suits, saves the user's pick to the profile file |

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS`; the leading token selects the mode (default = Explain — Full).
2. Read `references/lens-spec.md` IN FULL before producing any block — the binding spec for the cognitive profile, the Gabe Block template, per-component rules, analogy hygiene, and when to (not) apply a block. If missing, E6 applies — STOP.
3. Load the cognitive suit per "Loading the Profile" above; for `calibrate`, read `SUITS.md` directly to render the 4-suit comparison.
4. Identify the target concept(s) from `$ARGUMENTS` (or, for `annotate`, from the target file's 3-5 most complex/critical concepts — not trivial facts).
5. Produce the block(s) at the mode's fidelity level, running the spec's pre-emit self-check before emitting.

## Output contract (summary)

A full Gabe Block has: THE PROBLEM (or WHAT IT ENABLES for tool/building-block concepts) → THE ANALOGY (a physical system) → HOW IT MAPS (load-bearing arrow-lines) → THE MAP (ASCII spatial diagram, ≤15 lines) → CONSTRAINT BOX (IS / IS NOT / DECIDES) → EASY TO CONFUSE WITH (optional) → ONE-LINE HANDLE (≤10 words) → ANALOGY LIMITS → SIGNAL (Quick check ✓ / Deeper question ◆). Brief and Oneliner modes are compressions of the same content, not different content.

Apply a Gabe Block for architecture decisions, trade-off resolutions, failure modes, new abstractions, and counter-intuitive findings. Skip it for trivial facts, step-by-step procedures, self-explanatory code, and concepts the user has already demonstrated understanding of.

The full output contract in the spec is binding.
