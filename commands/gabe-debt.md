Load and follow the skill at `skills/gabe-debt/SKILL.md` (project-local) or `~/.claude/skills/gabe-debt/SKILL.md` (global).

Architectural decision-debt scanner. Finds decisions that were never made explicitly or that silently contradict other decisions — the gravity wells of complexity that crush applications later (Gastify legacy, BoletApp Epic 14c).

Load the advisory architecture-principles catalog from `templates/architecture-principles.md`, `~/.claude/templates/gabe/architecture-principles.md`, or `~/.agents/templates/gabe/architecture-principles.md`. Debt findings may cite AP IDs when their existing evidence directly touches a principle, but AP principles do not create findings or hard gates by themselves.

Arguments:
- No args: full scan (all 11 patterns) + interactive triage → writes to 4 KDBP targets.
- `brief`: findings table + severity + counts; no writes, no triage.
- `dry-run`: full scan + show proposed DECISIONS / SCOPE §14 / RULES / PENDING diffs; no writes.
- `audit-rules`: read-only check against existing `.kdbp/RULES.md` + any `docs/rebuild/LESSONS.md` or retrospective rules. Report violations only.
- `extract-rules`: read-only retrospective mining. Scans `docs/**/*retro*.md`, `docs/rebuild/LESSONS.md`, `POSTMORTEM*`, `RETRO*`. Proposes R-NN candidates interactively.
- `pattern=P<n>`: scan a single pattern (e.g. `pattern=P3` for async-listener races). Composes with other modes.
- `since=<git-ref>`: limit commit-history sweep to commits since ref. Default: last SCOPE.md §15 Change Log anchor.
- `strict`: non-zero exit when any unresolved CRITICAL finding exists (pre-commit hook form).
- `[file or folder]`: restrict code + commit sweep to path. Docs pass still runs globally.

Modes compose: `brief pattern=P3`, `dry-run since=HEAD~20 pattern=P6`, etc.

**Output targets (full mode):**
- `.kdbp/DECISIONS.md` — new ADR stubs (crisp architectural choices)
- `.kdbp/SCOPE.md §14` — new Open Questions (not-yet-decidable)
- `.kdbp/RULES.md` — new R-NN rules (scar-tissue constraints from past failures; PR-checklist form)
- `.kdbp/PENDING.md` — deferred items

Every write is tagged with a stable hash-based ID so re-running the scan updates in place instead of duplicating. Every session that writes appends a `debt-scan` entry to `SCOPE.md §15` Change Log.

**Architecture principle citations:** findings can include `Architecture principles: AP6 coupling, AP12 documented decisions` when backed by the finding's evidence. These citations are advisory and do not alter severity or tier filtering.

**Pattern catalog (v1, evidence-anchored to Gastify + BoletApp):**
| ID | Pattern | Source |
|---|---|---|
| P1 | dual-state-machines | Gastify LESSONS R1 |
| P2 | cross-feature-direct-mutation | Gastify LESSONS R2 |
| P3 | async-listener-race | Gastify LESSONS R5 |
| P4 | schema-drift-across-boundaries | Gastify LESSONS R4/R6 |
| P5 | god-class-growth | Gastify LESSONS R3 |
| P6 | deletion-detection-in-sync | BoletApp Epic 14c retro §1 |
| P7 | multi-op-state-staleness | BoletApp Epic 14c retro §2 |
| P8 | silent-fallback-changes-bigO | BoletApp Epic 14c retro §3 |
| P9 | cross-product-infra-coupling | BoletApp CLAUDE.md INC-001 |
| P10 | cost-model-absent-before-deploy | BoletApp Epic 14c retro §3 |
| P11 | multi-op-test-gap | BoletApp Epic 14c retro §2 |

Custom project patterns: drop `P<n>-<handle>.md` into `.kdbp/debt-patterns/` to override or extend.

**Relation to other gabe-* commands:**
- `gabe-review` reads RULES.md for severity escalation (rule-violating code auto-escalates to CRITICAL with citation).
- `gabe-align` reads RULES.md at alignment checkpoints.
- `gabe-align` also reads `architecture-principles.md` in standard/deep modes for advisory AP checks.
- `gabe-roast` can cite R-rules when adopting a perspective.
- `gabe-teach`'s gravity wells (KNOWLEDGE.md, Miller's-7 architectural sections) are the *domains*; gabe-debt finds the *debt accumulating in each*. Different vocabularies, complementary scopes.

$ARGUMENTS
