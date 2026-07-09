# Post-Review Mode

Read this file when: `/gabe-review` is invoked with the `post-review` argument.

### Post-Review Mode (`/gabe-review post-review`)

Parse an external code review (CE:review, BMad, ECC, manual) and ingest its findings into `.kdbp/REVIEW.md`. Detect the source format and map severities:

| Source | Severity mapping |
|---|---|
| **CE:review** | P0→CRITICAL, P1→HIGH, P2→MEDIUM, P3→LOW |
| **BMad code-review** | decision_needed→HIGH, patch→by-dimension, defer→load into deferred backlog |
| **ECC code-reviewer** | CRITICAL→CRITICAL, HIGH→HIGH, MEDIUM→MEDIUM, LOW→LOW (same scale) |
| **Manual/unknown** | Infer from keywords (security→CRITICAL, performance→MEDIUM, style→LOW) |

Add Defer Risk + Maturity Gate + Confidence Score columns to each parsed finding, then write the standard `.kdbp/REVIEW.md` live document (subject to the collision prompt in SKILL.md's "Live Review Document" section). After the file is written, follow the full mode flow (confidence score with projections, provisional verdict, session estimate, triage, archive-on-resolve).

**Resume semantics.** If `post-review` is invoked without an explicit external source and an active `.kdbp/REVIEW.md` already exists, this is equivalent to `/gabe-review` with the (r) Resume option — the active CLI picks up whatever is in REVIEW.md (including artifacts produced earlier by the other CLI) and runs triage.
