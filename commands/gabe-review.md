Load and follow the skill at `skills/gabe-review/SKILL.md` (project-local) or `~/.claude/skills/gabe-review/SKILL.md` (global).

Review code changes with risk pricing, confidence scoring, and interactive triage.

Load the advisory architecture-principles catalog from `templates/architecture-principles.md`, `~/.claude/templates/gabe/architecture-principles.md`, or `~/.agents/templates/gabe/architecture-principles.md`. Review findings may cite AP IDs when their existing diff/file evidence directly touches a principle. AP citations are explanatory only; they do not create findings or change severity.

Arguments:
- No args: infer target from `.kdbp/PLAN.md` (first row with `Review=⬜` AND `Exec` ∈ {`✅`, `🔄`}) + `.kdbp/LEDGER.md` (files referenced in that phase's exec entries). Falls back to `git diff HEAD` when no KDBP context. Writes/resumes the singleton `.kdbp/REVIEW.md` and enters triage.
- `brief`: findings table + confidence score + verdict only, no triage and no REVIEW.md write
- `fix`: skip to triage, auto-fix all findings (writes REVIEW.md en route)
- `deferred`: show deferred items dashboard with triage option (read-only of PENDING.md; does not touch REVIEW.md)
- `post-review`: parse an external code review (CE:review, BMad, ECC) and ingest its findings into `.kdbp/REVIEW.md`. If no external source and an active REVIEW.md already exists, behaves as Resume.
- `inbox`: produce the live `.kdbp/REVIEW.md` and stop — no triage, no writes to PENDING/LEDGER/PLAN. Intended for Codex CLI ("analysis only" policy). Claude picks up via the Resume prompt.
- `resume`: explicitly resume triage on the active `.kdbp/REVIEW.md` (same as the `(r)` option in the collision prompt).
- `close`: archive active REVIEW.md as resolved + write LEDGER/tick PLAN (for when triage was informal).
- `discard`: archive active REVIEW.md as cancelled, skip LEDGER write.
- `[file or folder]`: review specific target (writes REVIEW.md as usual).

All write-producing invocations (default, `fix`, `post-review`, `inbox`, `[file/folder]`) first run their analysis **blind** to any existing `.kdbp/REVIEW.md`. After analysis completes, the skill reconciles:

- **No existing REVIEW.md** → write fresh.
- **Existing REVIEW.md, SAME CLI** → singleton collision prompt: `(r) Resume | (a) Archive as stale | (x) Replace (superseded) | (c) Cancel`.
- **Existing REVIEW.md, DIFFERENT CLI** → **merge mode**: strict auto-match on file+line+severity, fuzzy candidates flagged for user y/n, then a consolidation strategy prompt — `(u)nion | (i)ntersection | (m)anual | (a)rchive prior as stale | (c)ancel`. Consolidated file uses schema 1.1 with per-finding `Sources` attribution.

**Two-pass cross-agent review workflow:**
1. Pass 1 (either CLI) — invoke with `inbox` to produce REVIEW.md and stop (Codex's default; explicit in Claude).
2. Pass 2 (the OTHER CLI) — invoke normally; analysis runs blind, then auto-enters merge mode because a different-CLI review already exists.

This triangulates two independent perspectives into a single consolidated REVIEW.md. Findings flagged by BOTH agents are higher-confidence signal.

Before reviewing, check for `.kdbp/deferred-cr.md` or `.planning/deferred-cr.md` to load the deferred backlog. If deferred items exist, check whether the current diff addresses them.

### Scope-aware review (if SCOPE.md + ROADMAP.md exist)

When project scoped via `/gabe-scope`, add REQ-drift to the findings dimensions:

1. **REQ coverage drift.** For each changed file, try to trace back to a REQ-NN via the current phase's `Covers REQs` column. If a file changes but no REQ in current phase claims it, add MEDIUM finding `req_coverage_gap` — either code is off-scope or the phase is wrong.
2. **REQ inflation.** If a single diff claims to satisfy >3 REQs, flag as HIGH finding `req_inflation` — likely scope creep that should split into multiple commits + phases.
3. **Direct SCOPE.md / ROADMAP.md edit.** If the diff touches SCOPE.md or ROADMAP.md directly (not via `/gabe-scope-change`), flag as CRITICAL finding `scope_bypass` — rerun via `/gabe-scope-change` to ensure classifier + Change Log + version bump.

All findings feed the Review Confidence Score via the existing rubric. No writes to SCOPE.md or ROADMAP.md.

$ARGUMENTS
