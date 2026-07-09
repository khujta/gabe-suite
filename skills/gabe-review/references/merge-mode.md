# Merge mode — Blind-first cross-agent triangulation

Read this file when: an existing `.kdbp/REVIEW.md` from a DIFFERENT CLI is detected (see SKILL.md "Live Review Document" → "Reconcile").

### Blind-first cross-agent triangulation (merge mode)

When the existing `.kdbp/REVIEW.md` has a different `cli` than the current run (e.g. Codex-produced file, Claude is running), this is a deliberate two-pass cross-agent review. The skill has already completed its blind analysis (Step 2) and compares its findings against the existing REVIEW.md.

**Match classification.**

For every pair (existing finding, current finding), classify:

- **Strict match** — same `File` path AND same line number AND same `Severity`. Auto-merge. Both sources are credited in the consolidated row.
- **Fuzzy candidate** — same `File` AND at least one of:
  - line numbers within ±5 of each other, OR
  - description token-overlap ratio > 0.6 (Jaccard over stopword-filtered tokens: lowercase, strip `a|an|the|of|in|on|to|is|are|and|or|but|this|that`).
  Fuzzy candidates are surfaced to the user for explicit yes/no merge — never auto-merged.
- **Unique** — no strict match, no fuzzy candidate. Kept as its own finding, attributed to its source.

**Gap analysis presentation.**

```
Cross-agent review detected — consolidating.

  Existing (source: codex / gpt-5, <timestamp>): <N1> findings
  Current  (source: claude / claude-opus-4-7):  <N2> findings

  Strict overlap (both agents flagged same file+line+severity): <O> findings
  Fuzzy candidates (same file, close line or similar wording):   <F> pairs
  Only in existing:  <E> findings
  Only in current:   <C> findings

  Fuzzy candidates — please confirm (y/n per row):
    [1] <existing row> ↔ <current row>    — <y/n>
    [2] <existing row> ↔ <current row>    — <y/n>
    ...

  Consolidation strategy?
    (u) Union — keep all unique findings (after fuzzy resolution). <TOTAL_U> items. Safest default.
    (i) Intersection — keep only strict overlap + y-confirmed fuzzy matches. <TOTAL_I> items. Highest-confidence signal.
    (m) Manual — walk each non-matching finding; keep/drop/merge per item.
    (a) Archive prior as stale — discard existing, use only current pass. (Escape hatch; breaks triangulation.)
    (c) Cancel — abort this pass; leave existing REVIEW.md untouched.
```

**Consolidated file output.** On (u)/(i)/(m), write the consolidated `.kdbp/REVIEW.md` with schema 1.1 — the `sources` array grows by one entry for the current run, a `consolidated_at` timestamp and `consolidation` strategy are recorded, and the findings table gains a `Sources` column listing attribution for each row (`codex`, `claude`, or `codex, claude` for strict/fuzzy-confirmed overlaps). Triage then proceeds in the active CLI against the consolidated findings; the triage user sees the attribution and can use it as confidence signal ("both agents flagged this — probably real").

**Format of `.kdbp/REVIEW.md` (schema 1.1).**

```markdown
<!-- gabe-review-live:1.1 -->
---
sources:
  - cli: codex            # producing CLI (codex | claude)
    model: gpt-5          # model ID (best-effort inference); 'unknown' if unavailable
    timestamp: 2026-04-24T15:00:00Z
    findings: 7           # count from this pass
  - cli: claude
    model: claude-opus-4-7
    timestamp: 2026-04-24T17:30:00Z
    findings: 9
consolidated_at: 2026-04-24T17:30:00Z   # omit for single-source reviews
consolidation: union                    # union | intersection | manual | replaced | null (single-source)
project_root: <abs path>
target: <what was reviewed — e.g. "git diff HEAD", a file path, a folder>
maturity: mvp|enterprise|scale
status: active           # active | resolved | stale | superseded | cancelled
---

# Gabe Review — Live Document

**Verdict:** APPROVE | WARNING | BLOCK
**Confidence:** NN/100
**Coverage:** HIGH | MEDIUM | LOW
**Findings:** <total> (CRITICAL: n, HIGH: n, MEDIUM: n, LOW: n) | **Sources:** codex+claude (or just codex / claude for single-pass)
**Resolution:** <fixed>/<deferred>/<dismissed> of <total> (pending: <remaining>)

## Findings
| # | Status | Severity | Finding | File | Churn | Fix Cost | Defer Risk | Maturity Gate | Escalation | Sources |
|---|--------|----------|---------|------|-------|----------|------------|---------------|------------|---------|
| 1 | pending | HIGH | ... | x.ts:12 | ... | ... | ... | ... | - | codex, claude |
| 2 | pending | MEDIUM | ... | y.ts:5 | ... | ... | ... | ... | - | codex |
| 3 | pending | HIGH | ... | z.ts:9 | ... | ... | ... | ... | - | claude |

Status values: `pending` (untriaged), `fixed` (applied), `deferred` (logged to PENDING.md), `dismissed` (session-only). Triage loop mutates this column in place.
Sources values: comma-separated CLIs that surfaced the finding. Multiple sources = independently corroborated (higher confidence).

## Plan Alignment (5a)
<ALIGNED | DRIFTED | MISALIGNED + brief rationale — union of all passes' alignments; conflicts noted>

## Stale Verified Topics (5c)
<list of {topic, file, last_verified_commit} or "none" — union across passes>

## Architectural Decisions (5b)
<proposed DECISIONS.md entries (not yet written) or "none" — union across passes>

## Tier Drift (5d)
<TIER_DRIFT findings with {section, dim, pattern, floor, effective} or "none" — union across passes>

## Deferred Backlog Status
<for each open PENDING.md item: whether this diff addresses it, kept in backlog, or became a fresh finding>

## Suggested Triage
<per-finding recommendation: (f)ix / (d)efer / (x)ismiss with one-line rationale — advisory; actor-CLI decides>

---
_Active review. Triage with `/gabe-review` (resumes) or `/gabe-review close` (finalize)._
```

**Backwards compatibility.** Schema 1.0 (single-source `source: ...` flat field) is readable — on first merge, it's upgraded in place to schema 1.1 by converting the flat source into a single-element `sources:` array. No migration tool needed; the upgrade is automatic the first time a cross-agent pass triggers merge mode.

**Two-pass workflow (user discipline).** To trigger merge mode intentionally:

1. **Pass 1** (any CLI) — invoke with `inbox` to produce REVIEW.md without triage:
   - In Codex: `$gabe-review inbox`.
   - In Claude: `/gabe-review inbox`.
2. **Pass 2** (the OTHER CLI) — invoke normally (`/gabe-review` or `$gabe-review`). The skill runs blind analysis, detects the prior pass, triggers merge mode, consolidates, and proceeds to triage in the active CLI.

Same-CLI re-runs (Codex→Codex or Claude→Claude) don't go into merge mode — they hit the collision prompt. Cross-CLI is the trigger.

**Archive directory.** `.kdbp/reviews-archive/` — gitignored. Archive filenames: `REVIEW_<YYYY-MM-DD-HHMMSS>_<status>.md` where `<status>` ∈ {`resolved`, `stale`, `superseded`, `cancelled`}. On first archive in a project, gabe-review appends `.kdbp/reviews-archive/` to the project `.gitignore` (idempotent grep-before-append); `/gabe-init` seeds this entry at scaffold time for fresh projects.
