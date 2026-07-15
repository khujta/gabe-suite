# Gabe Lens Learning

<!-- Standards: see ~/.claude/skills/gabe-docs/SKILL.md (CommonMark + Mermaid + analogy-first) -->
<!-- -->
<!-- Cross-project learning log for /gabe-teach. Lives at ~/.claude/gabe-lens-learning.md -->
<!-- (user-level, same directory as gabe-lens-profile.md). -->
<!-- -->
<!-- Written by /gabe-teach Step 9c.4 (drift analyzer) and Step 9c.5 (tailoring review). -->
<!-- Readable by humans; the command re-reads this file on every teach lesson. -->
<!-- -->
<!-- Relationship to gabe-lens-profile.md: -->
<!--   profile.md    — WHICH cognitive suit the user wants (Spatial-Analogical, etc.). Static. -->
<!--   learning.md   — WHAT weaknesses + tailorings have emerged from actual lessons. Dynamic. -->
<!-- -->
<!-- Multi-machine note: sync this file the same way you sync gabe-lens-profile.md and -->
<!--   gabe-arch/ (git dotfiles or equivalent) — otherwise patterns diverge. -->

## Miss Log

<!-- Append-only. One row per Q1/Q2 answer scored "partial" or "wrong". -->
<!-- Populated by Step 9c.4 — rule-based for wrong, LLM-enriched for partial. -->

| # | Date | Project | Lesson | Question | Section missed | User's attempt (paraphrased) | Correct answer (paraphrased) | Severity |
|---|------|---------|--------|----------|----------------|------------------------------|------------------------------|----------|

<!-- Example rows:
| M1 | 2026-04-17 | ai-app | T1 Q2 | Q2 | When NOT | "dict and list are the same" | "list preserves multi-match; dict collapses duplicates" | partial |
| M2 | 2026-04-20 | ai-app | arch async-background-processing Q2 | Q2 | Primary force + When NOT (conflation) | "ticket ID is persistence" | "ticket ID is the claim check; persistence is a separate DB row; they're orthogonal" | partial |
-->

## Detected Patterns

<!-- Each pattern has an ID (P1, P2, ...), a named signal, a confidence tier, and a list of observations. -->
<!-- Status lifecycle: suggested | active | resolved | abandoned -->
<!--   suggested  — 2 observations; not yet activated. User hasn't opted in. -->
<!--   active     — 3+ observations; user opted in; tailoring applied on render. -->
<!--   resolved   — pattern no longer fires after N consecutive correct answers -->
<!--   abandoned  — user explicitly disabled via /gabe-teach learning -->

<!-- Example pattern:
### P1 — Distinction conflation (observations: 2, confidence: medium, status: suggested)

**Signal:** User scores 1/2 on questions requiring distinction between related-but-distinct concepts. Q1 (direct understanding) lands; Q2 (inversion / boundary) catches.

**Observations:**
- 2026-04-17 — ai-app — T1 Q2 — dict vs list conflation
- 2026-04-20 — ai-app — arch:async-background-processing Q2 — persistence vs delivery channel conflation

**Suggested adaptations (D4 = A + B + D):**
- Emphasis (A): bold/call-out weak sections when this pattern is active
- Content augmentation (B): add "and this is NOT" lines in `How it maps` for likely confusions; extra distinction-against-related-concept bullet in `When NOT to reach for it`
- Q2 generation constraints (D): instruct question-gen to force distinction between the specific concepts flagged in observations

**First observed:** 2026-04-17
**Last observed:** 2026-04-20
**Threshold for activation:** 3 observations OR same pattern in ≥2 projects
-->

## Active Tailoring

<!-- Tailorings currently applied at render time. Each entry references a pattern ID. -->
<!-- On every lesson, Step 9c reads this section and applies the listed adaptations. -->

_None active._

<!-- Example:
### Active since 2026-04-21

- **P1 "Distinction conflation"** — adaptations A+B+D
  - Emphasis: bold the section where the last miss occurred
  - Content: auto-inject "and this is NOT" lines (max 2 per lesson)
  - Q2 constraint: "avoid conflation between <analogy piece> and <analogy piece> unless directly asked"
-->

## Tailoring History

<!-- Append-only log of tailoring-on, tailoring-off, tailoring-adjust events. -->
<!-- Useful for retrospective ("did we get better after activating P1?") and for the -->
<!-- Step 9c.5 review prompt to know what was tried before. -->

<!-- Example:
### 2026-04-21 — TAILORING-ON
- Pattern: P1 (observations: 3)
- User choice: "yes, apply emphasis + Q2 constraints; skip content augmentation for now"
- Next review: after 3 more verified lessons

### 2026-05-02 — TAILORING-ADJUST
- Pattern: P1
- Reason: 2 consecutive correct Q2s — user wants to test if they've internalized
- Change: keep emphasis, drop Q2 constraint
-->

## Review Cadence

**Next review:** after 3 more verified lessons, OR on 3rd observation of any new pattern (whichever comes first).

**On-demand review:** `/gabe-teach learning` at any time to see the current state and adjust.

## Reset / Opt-out

- Reset all tailoring for a clean slate: `/gabe-teach learning reset`
- Disable the drift analyzer entirely (no more LLM calls, no more pattern tracking): set `teach_drift_analyzer: never` in `~/.claude/gabe-lens-profile.md` frontmatter (or per-project BEHAVIOR.md for project-scoped opt-out).
