---
name: gabe-review
description: "Code review with risk pricing, confidence scoring, interactive triage, and deferred item tracking. Also checks plan alignment (is this diff on-scope?), detects stale verified topics, and proposes DECISIONS.md entries for architectural changes. Surfaces the cost of NOT fixing each finding. Usage: /gabe-review [target] or /gabe-review deferred"
metadata:
  version: 1.4.0
---

# Gabe Review — Code Review with Risk Pricing

## Codex Command Bridge

When Codex invokes this skill as the `Gabe Review` command surface, first read
the active command wrapper from `.agents/commands/gabe-review.md`,
`~/.agents/commands/gabe-review.md`, or
`~/projects/gabe_lens/commands/gabe-review.md`, then preserve that command's
argument routing and visible output contract. This `SKILL.md` is the review
engine referenced by the command file; if there is any conflict, the command
file controls command-time behavior such as `Gabe-Lens block` rendering,
singleton `REVIEW.md` reconciliation, and mode-specific skips.

## Purpose

Review code changes and price every finding — what it costs to fix now, what it costs to ignore, and what you're betting by deferring. Track deferred items across reviews and escalate when the same gap gets kicked down the road.

This is NOT a generic checklist review. Every finding gets a **Defer Risk** (consequence + probability) and a **Maturity Gate** (MVP/Enterprise/Scale). The output is a risk matrix with a **Review Confidence Score** that lets humans make informed ship/defer decisions — and an interactive **Triage** loop to resolve findings on the spot.

> **Rendering note.** Output templates in this spec wrapped in bare triple-backtick fences (no language tag) are spec-meta delimiters — render contents as plain markdown at runtime so findings tables display as tables, not monospace code. Tagged fences (```bash, ```diff, etc.) stay fenced at runtime. See `gabe-docs/SKILL.md` § "Runtime output rendering convention".

---

## When to Use

**Use when:**
- You're about to open a PR and want to understand what you're shipping
- A code review (CE:review, BMad, manual) approved with deferred items and you want to price the risk
- You want to see all accumulated deferred items and their escalation status
- You need to decide between "fix now" and "defer" with real risk information
- You want to fix findings interactively without leaving the review context (`/gabe-review fix`)

**Don't use when:**
- You need deep multi-persona review (use CE:review or BMad code-review first, then /gabe-review post-review)
- You're assessing a proposed change before implementing (use /gabe-assess)
- You're looking for structural gaps in design (use /gabe-roast)

---

## Required Inputs

### 1. Target — What to review

| Input Type | Example |
|---|---|
| **Diff** | `git diff`, `git diff --staged`, PR diff — used when explicit target supplied, or as fallback when no KDBP context resolves |
| **File(s)** | `/src/services/rateLimiter.ts` |
| **Folder** | `/functions/src/` |
| **Post-review** | Output from CE:review, BMad code-review, or ECC code-reviewer (parses findings and adds risk pricing into `.kdbp/REVIEW.md`) |
| **Deferred** | No target — shows only the deferred items dashboard |
| **Inbox** | No target — produces the live `.kdbp/REVIEW.md` and stops (no triage). Used for cross-CLI handoff (e.g., Codex produces, Claude Code picks up via the Resume prompt). Subject to the singleton collision prompt if a review is already active. |

If no target is provided, resolve via **Step 0.3: Target Resolution** (KDBP-first, git-diff fallback) below.

### 2. Maturity — What standard to apply

| Maturity | What it means | Default severity threshold |
|---|---|---|
| **MVP** | Prototype/early product — fix security and data loss, accept rough edges | Only CRITICAL blocks merge |
| **Enterprise** | Production with users — fix performance, error handling, monitoring | CRITICAL + HIGH block merge |
| **Scale** | Large-scale operations — fix optimization, edge cases, polish | CRITICAL + HIGH + MEDIUM block merge |

**How maturity is determined (in order):**
1. Explicit argument: `/gabe-review --maturity enterprise`
2. Read from `.kdbp/BEHAVIOR.md` maturity field (if project has `.kdbp/`)
3. Ask the user
4. Default: MVP (conservative — strictness goes up, not down)

Never auto-detect from test count or CI presence. Maturity is a human decision.

---

## Review Process

### Step 0.3: Target Resolution (no-arg only)

This step only fires when `/gabe-review` is invoked with no arguments — no explicit path, no folder, no mode keyword. Skip entirely if `$ARGUMENTS` resolves to any of: a file path, a folder path, `brief`, `fix`, `deferred`, `post-review`, `inbox`, `resume`, `close`, `discard`.

**Why this step exists.** The authoritative "what's pending review" signal in a Gabe project lives in `.kdbp/PLAN.md` (phase row with `Exec=✅ Review=⬜`) plus `.kdbp/LEDGER.md` (artifact lists written by exec/commit hooks). A raw `git diff HEAD` misses the target when code is already committed (HEAD clean), includes unrelated WIP, or ignores the plan-declared scope. Step 0.3 consults the plan first, falls back to git-diff only when no KDBP context resolves.

**Procedure (zero-LLM, deterministic — mirrors `/gabe-next`'s PLAN-parse approach):**

1. **Check KDBP presence.** If `.kdbp/PLAN.md` is missing, or lacks `<!-- status: active -->` → jump to "Fallback" below.
2. **Parse PLAN.md.** Find the `## Phases` table. Scan rows top-to-bottom for the first row where `Review` column = `⬜` AND `Exec` column ∈ {`✅`, `🔄`}. Record phase number N, phase name, Exec state, and phase `Types` cell when available.
3. **Handle no-match cases:**
   - No row satisfies the Review=⬜ condition (all reviewed) → print `ℹ No phase pending review. Pass an explicit target to review something else.` and exit 0.
   - Target row has `Exec=⬜` (Review pending but work not started) → print `⚠ Phase N Exec not complete — run /gabe-next to finish Exec before reviewing.` and exit 0.
   - Target row has `Exec=🔄` and phase types include any runtime-gated type (`user-facing`, `native-mobile`, `web`, `upload`, `realtime`, `streaming`, `file-media`, `auth`, `session`, `notifications`, `DB`) OR `.kdbp/BEHAVIOR.md` contains a runtime staging proof rule → print `⚠ Phase N staging proof still pending — run /gabe-next to finish /gabe-execute before reviewing.` and exit 0.
4. **Collect scope from LEDGER.md.** Read `.kdbp/LEDGER.md`. Find entries that reference phase N. Accept any of these patterns (case-insensitive):
   - `phase-N-exec`, `phase N exec`, `Phase N —`, `phase: N`, `Phase N:`.

   Extract file paths from those entries (typically listed as bullet items, code-fenced file lists, or paths after `files:` / `artifacts:` keys).
5. **Resolve scope:**
   - Filter extracted paths to those that still exist on disk.
   - If ≥1 file remains → target = that set. Print banner:
     `ℹ Reviewing Phase N ([name]) per PLAN.md — scope: <count> files from LEDGER`.
     Proceed with that scope as the review target.
   - If 0 files remain (LEDGER empty, all renamed/deleted, or parser couldn't extract paths) → print banner:
     `ℹ Phase N Review pending; no LEDGER scope resolved — falling back to git diff HEAD.`
     Target = `git diff HEAD`.

**Fallback.** No `.kdbp/` directory, or no active plan. Target = `git diff HEAD`. No banner — silent legacy default.

Once target is resolved, continue with Step 0.5 (LEDGER prior-CONCERN scan) and Step 1 (Deferred Backlog) using the resolved scope. REVIEW.md creation happens only after scope is known — the no-match exits above are prints + exit, not partial writes.

### Step 0.5: Load KDBP Context (if available)

If `.kdbp/LEDGER.md` exists, read the last 5 checkpoint entries. For each:
- If a value was CONCERN on a file that's in the current diff → note it as prior signal
- If a scenario was ❌ on a file that's in the current diff → pre-seed as expected finding

This means gabe-review knows what the automatic checkpoints already flagged. Prior signals add a `FLAGGED (Nx)` annotation to the finding (where N = number of checkpoint flags). If flagged 3+ times, bump severity by one tier (LOW→MEDIUM, MEDIUM→HIGH, HIGH→CRITICAL). Do not bump findings already at CRITICAL.

If no `.kdbp/LEDGER.md` exists, skip this step silently.

### Step 1: Load Deferred Backlog

Before reviewing new code, check for existing deferred items:

1. Look for `.kdbp/PENDING.md` (preferred), `.kdbp/deferred-cr.md`, or `.planning/deferred-cr.md`
2. If found, load all entries with `Status != Resolved`
3. For each deferred item, check if the current diff addresses it:
   - **Match by file path** (exact match)
   - If file matches, compare Finding text with >50% word overlap
   - If file was renamed (detected via `git diff --find-renames`), match on Finding text alone with >70% overlap
4. If addressed: mark as `Resolved` in the file (use Edit tool to update the table row)
5. If NOT addressed and the diff touches the same function or within 20 lines of the finding's original location: increment `Times Deferred` and apply escalation rules. Changes elsewhere in the same file do NOT trigger escalation.

### Step 2: Review the Diff

For each changed file, check these dimensions:

| Dimension | What to find | Default severity |
|---|---|---|
| **Security** | Injection, auth bypass, secrets, OWASP Top 10 | CRITICAL |
| **Data integrity** | Data loss, corruption, race conditions, missing validation | CRITICAL |
| **Error handling** | Unhandled exceptions, fail-open without test, swallowed errors | HIGH |
| **Test coverage** | New branches without corresponding test changes | HIGH |
| **Runtime evidence** | User-facing/runtime phase marked complete without device/browser journey artifacts | HIGH |
| **Logic** | Off-by-one, null handling, wrong condition, unreachable code | HIGH |
| **Tier drift** | Code patterns above phase's declared Tier (MVP/Enterprise/Scale) | HIGH |
| **Performance** | N+1 queries, unbounded loops, missing indexes, memory leaks | MEDIUM |
| **Style** | Naming, formatting, dead code, console.log in production | LOW |

**Confidence gate:** Only report findings with >80% confidence. If uncertain, investigate further before reporting.

**Tier drift detection:** When `.kdbp/PLAN.md` declares a phase Tier and the diff contains patterns above that tier, emit a `TIER_DRIFT` finding. See Step 4.75 Sub-check 5d for procedure and resolution options (downgrade vs amend-phase-tier).

**Rule-violation escalation (via `/gabe-debt`):** If `.kdbp/RULES.md` exists (or `docs/rebuild/LESSONS.md` with R-rules is present), load the rule index before dimension scoring. For every finding, check if the affected file/line/pattern matches any rule's `Detection` signature. If yes, auto-elevate the finding's severity by one level (HIGH → CRITICAL, MEDIUM → HIGH) AND append a citation to the finding: `(violates R<n> from RULES.md — "<rule handle>")`. Load-bearing rules (tagged as such in the rule's `Status` field or explicit in source LESSONS) elevate straight to CRITICAL. Do not escalate if the user has already dismissed the match via `.kdbp/debt-ignore.md`.

**Architecture principle citations (advisory):** Load the AP catalog from the first available path: project-local `templates/architecture-principles.md`, `~/.claude/templates/gabe/architecture-principles.md`, then `~/.agents/templates/gabe/architecture-principles.md`. For each review finding, attach AP IDs only when the finding's existing file/line/diff evidence directly touches a principle. AP citations explain the design force, but they do not create findings, change severity, or override the >80% confidence gate. Output format: `Architecture principles: AP8 explicit state, AP11 testability`.

### Step 3: Branch-Test Gap Detection

For each modified source file:

1. Check if it introduces new error handling (`try/catch`, `if (error)`, fallback logic, `.catch(`)
2. Check if a corresponding test was also modified in the diff. Look for:
   - `[filename].test.[ext]` or `[filename].spec.[ext]` (direct match)
   - Test files in `e2e/`, `__tests__/`, `tests/` that import or reference the modified source module
   - Any test file in the diff that exercises the new branch (check import statements)
3. If new branches exist without test coverage:

```
⚠️ TEST GAP: [file] adds [branch type] at L[line] — no test exercises this path.
        Defer Risk: UNTESTED PRODUCTION PATH — P(high), Impact(high)
```

### Step 3.2: Runtime Journey Evidence Gap Detection

When reviewing a KDBP phase, inspect `.kdbp/PLAN.md` and `.kdbp/LEDGER.md` before pricing findings:

1. Parse the target phase `types`.
2. If types include any of `{user-facing, native-mobile, mobile-web, web, upload, realtime, streaming, file-media, auth, session, notifications}`, require LEDGER evidence for the changed journey.
3. Evidence must include:
   - Exact command(s) run.
   - Target runtime: physical device/emulator/simulator or browser.
   - Build id/version when native mobile or installed app behavior changed.
   - Artifact path(s): screenshots, report, video, logs, or trace.
   - At least one relevant edge-case artifact when the phase added error/recovery behavior.
4. If the phase has `Exec=✅` or is being reviewed with `Exec=🔄` and only static/unit/API checks are logged, emit a HIGH finding:

```
⚠️ RUNTIME EVIDENCE GAP: Phase N changes [type list] but LEDGER lacks target-runtime journey artifacts.
   Defer Risk: BUILT BUT NOT PROVEN ON USER RUNTIME — P(high), Impact(high)
```

Do not accept "tests pass" as a substitute for this check. Unit tests can satisfy branch coverage; they cannot satisfy runtime journey evidence.

### Step 3.5: Churn Annotation

For each file in the diff, check its recent churn:

```bash
git log --oneline --since=30.days --follow -- [file] | wc -l
```

| Churn (30d) | Label | Meaning |
|---|---|---|
| 8+ commits | 🔴 HOT | Fragile — changes constantly, defer risk amplified |
| 4-7 commits | ⚠️ WARM | Active area — watch for coupling |
| 0-3 commits | ✅ STABLE | Low risk of cascading issues |

The churn label appears in the findings table. A finding on a HOT file has higher effective risk than the same finding on a STABLE file — "untested path on a file that breaks every sprint" is worse than "untested path on a file nobody touches."

### Step 4: Price Each Finding

Every finding gets these fields:

| Field | Description |
|---|---|
| **#** | Sequential number |
| **Severity** | CRITICAL / HIGH / MEDIUM / LOW |
| **Finding** | One-line description |
| **File** | `file:line` |
| **Churn** | 🔴 HOT / ⚠️ WARM / ✅ STABLE (from Step 3.5) |
| **Fix Cost** | T-shirt estimate: S (<30m), M (1-3h), L (3-8h), XL (>1d) |
| **Defer Risk** | `[CONSEQUENCE] — P([probability]), Impact([severity])` |
| **Maturity Gate** | MVP / Enterprise / Scale — when this finding becomes relevant |
| **Escalation** | Empty for new findings, `⚠️ RECURRING (Nth time)` for deferred items |

### Defer Risk Scales

**Probability** (how likely the bad outcome is):

| Level | Meaning |
|---|---|
| certain | Will happen in normal usage |
| high | Likely under common conditions |
| medium | Possible under specific conditions |
| low | Unlikely but plausible |
| negligible | Theoretical only |

**Impact** (how bad when it happens):

| Level | Meaning |
|---|---|
| catastrophic | Data loss, security breach, complete failure |
| high | Major feature broken, user trust eroded |
| moderate | Degraded experience, workaround exists |
| low | Minor friction, cosmetic |
| negligible | Barely noticeable |

**Risk score for sorting:** Rank by probability first, then impact within same probability. In the Risk Dashboard, highest risk items appear first.

### Step 4.5: Review Confidence Score

After pricing all findings, compute a **Review Confidence Score** (0–100). This tells the user: "how confident should you feel shipping this code as-is?"

#### Scoring Formula

Start at **100**. Deduct per finding:

| Severity | Base deduction | HOT churn | ESCALATED (2+) |
|----------|---------------|-----------|-----------------|
| CRITICAL | −20 | ×1.5 | ×1.5 |
| HIGH | −12 | ×1.3 | ×1.3 |
| MEDIUM | −5 | ×1.2 | — |
| LOW | −2 | — | — |

Multipliers stack: a CRITICAL finding on a HOT file that's ESCALATED = −20 × 1.5 × 1.5 = −45.

**Coverage confidence modifier** (from existing coverage assessment):

| Coverage | Modifier |
|----------|----------|
| HIGH | 0 |
| MEDIUM | −5 |
| LOW | −10 |
| VERY LOW | −15 |

**Floor: 0. Ceiling: 100.**

#### Confidence Projections

After the score, show what happens if the user fixes findings at each tier. Each projection removes the deductions from findings that match the criteria:

| Projection | Which findings are removed from the score |
|---|---|
| **Fix CRITICAL + HIGH** | All findings with severity CRITICAL or HIGH |
| **Fix all MVP gate** | All findings with Maturity Gate = MVP |
| **Fix all Enterprise gate** | All findings with Maturity Gate = MVP or Enterprise |
| **Fix all (including Scale)** | All findings (score → 100 minus coverage modifier) |

**Multiplier handling:** Projections remove the full multiplied deduction of each matching finding (including churn and escalation multipliers), not just the base severity deduction.

#### Output Format

```
### Review Confidence

Score: 62 / 100

| If you fix... | Findings resolved | Projected | Δ |
|---------------|-------------------|-----------|---|
| All CRITICAL + HIGH | 4 of 9 | 78 / 100 | +16 |
| All MVP gate | 5 of 9 | 85 / 100 | +23 |
| All Enterprise gate | 7 of 9 | 95 / 100 | +33 |
| All (incl. Scale) | 9 of 9 | 100 / 100* | +38 |

*Assumes HIGH coverage (modifier = 0). Actual ceiling: 100 minus coverage modifier.
```

**Interpretation guide:**

| Score range | Signal | Recommendation |
|-------------|--------|----------------|
| 90–100 | Ship with confidence | Minor items can be deferred safely |
| 70–89 | Ship with awareness | Review the projections — a small fix effort may buy a lot of confidence |
| 50–69 | Caution | Significant risk exposure. Check which tier gives the best ROI |
| 0–49 | Do not ship | Critical gaps. Fix at minimum the CRITICAL + HIGH tier before proceeding |

The confidence score appears BEFORE the verdict — it informs the verdict but doesn't replace it.

### Step 4.75: Plan Alignment (NEW — Phase 2/6 of doc-lifecycle work)

Before triage, run plan-compliance + stale-topic checks. Both are deterministic (zero LLM). The block only renders in **full mode** — skipped in `brief`, `deferred`, `fix`, `post-review` modes to keep those paths tight.

**Skip conditions (silent exit):**

- `.kdbp/` doesn't exist
- `.kdbp/PLAN.md` doesn't exist OR doesn't contain `status: active`
- Current diff is empty (nothing to align against)

#### Sub-check 5a — Phase Compliance

Purpose: "Does this diff accomplish what the current plan phase says it should?"

Procedure (deterministic):

1. Read `.kdbp/PLAN.md`. Extract `## Current Phase` section → phase number N + phase name.
2. Extract phase row N from `## Phases` table → `Description` column.
3. Extract `## Scope` section if present → explicit file list.
4. Build **expected change set** from:
   - Files named in Scope (exact paths)
   - Files matching globs mentioned in Description (keyword extraction — folder names, file suffixes, component names)
5. Compare against `git diff --name-only HEAD`:
   - On-scope files changed: count + list
   - Off-scope files changed: count + list (cap at 5)
   - Scope files NOT touched: count + list (cap at 5)
6. Classify alignment:

| Alignment | Condition |
|-----------|-----------|
| `ALIGNED` | All changed files are on-scope, no off-scope changes |
| `DRIFTED` | ≥70% of changed files on-scope, some off-scope |
| `MISALIGNED` | <70% of changed files on-scope (majority drift) |
| `SKIP` | Diff empty or Scope section missing (no basis for comparison) |

7. Render output block:

```
### Plan Alignment

Goal:         [Plan Goal from PLAN.md]
Phase [N/M]:  [name] — [description, truncated 120 chars]

Alignment: DRIFTED
  On-scope files changed:    3 / 7
  Off-scope files changed:   2 (frontend/src/lib/api.ts, docs/wells/3-api.md)
  Scope files not touched:   4 (tests/test_guardrails.py, app/db/models.py, ...)

Suggestion: this diff mixes plan scope with unrelated changes.
Consider `git reset` + split the commit, or update PLAN.md scope via /gabe-plan.
```

Informational only — no auto-action. Does NOT write to PLAN.md.

#### Sub-check 5c — Stale Verified Topic Detection

Purpose: "Are verified KNOWLEDGE.md topics now stale because the code they reference changed?"

Skip silently if `.kdbp/KNOWLEDGE.md` doesn't exist OR has no verified topics.

Procedure (deterministic, no LLM):

1. Read `.kdbp/KNOWLEDGE.md`. Parse Gravity Wells table → `{well_id: paths_globs}`. Parse Topics table → collect rows with `Status: verified`.
2. For each verified topic:
   - Extract `Well` column → look up well's Paths globs.
   - Extract `Source` column → if it contains a commit hash (7-40 hex chars), keep it; else skip.
   - For each changed file in `git diff --name-only HEAD`:
     - Does the file match any of the well's Paths globs? (fnmatch with `**` recursive support)
     - If yes: run `git log --follow -1 --format=%H -- <file>` → get most recent commit on this file.
     - If that commit is LATER than the topic's `Source` commit (via `git merge-base --is-ancestor topic_source file_latest`) → mark topic as **stale candidate**.
3. If stale candidates found, render output block:

```
### Stale Topic Candidates

Topics whose verified material may no longer match the code:

  T1 — Why guardrails run before the LLM (well G1, verified 2026-04-15)
       Changed since verification: app/agent/guardrails.py
  T5 — Why 202 Accepted + BackgroundTask (well G3, verified 2026-04-10)
       Changed since verification: app/api/main.py, app/api/tasks.py

  [mark-stale]  Flag these topics `stale` in KNOWLEDGE.md (re-surface in /gabe-teach)
  [skip]        Ignore this session
```

On `mark-stale`:

- Use Edit tool on `.kdbp/KNOWLEDGE.md` Topics table.
- For each stale candidate row: find the row by `# T[N]` prefix, replace `verified` in the Status column with `stale`. Preserve all other columns (Tags, ArchConcepts, Last Touched, Verified Date, Score, Source) exactly.
- Idempotent: re-running on already-`stale` rows is a no-op.
- This is the ONE place review writes KNOWLEDGE.md. Surface narrow (status column only). No row creation, no deletion, no topic text change.

On `skip`: no write. Stale candidates re-surface next `/gabe-review` until addressed.

#### Sub-check 5b — Architectural Decision Detection (Phase 3/6)

Purpose: "Did significant architectural decisions happen in this diff that should be captured in DECISIONS.md?"

**Pre-step — Re-surface deferred classifier candidates (runs BEFORE trigger layer):**

Read `.kdbp/PENDING.md`. For every row where `Source` column = `classifier` AND `Status` column = `open`:

1. Render each as an original proposal block using the same format as the Output block below. Use the `Finding` column as `title`. Rationale/alternatives/review_trigger are not re-stored in PENDING.md — if present from the original defer, pull from a `Notes` suffix; otherwise render the row as a minimal candidate (title only + "originally deferred YYYY-MM-DD") and skip alternatives.
2. User picks `[accept]` / `[edit]` / `[defer]` / `[drop]` per row. Action handlers behave identically to current-run handlers. `accept`/`drop` set the PENDING row's `Status` to `resolved` with today's date. `defer` (explicit or drop-through) keeps `Status = open` and increments `Times Deferred`.
3. After all re-surfaced rows are resolved or dropped-through, continue to current-run trigger layer.

**Auto-resolve on current-run duplicate:** when the current-run classifier produces a `title` case-insensitively matching any re-surfaced open PENDING row, auto-resolve the PENDING row (`Status = resolved`, today's date, note `auto-resolved: superseded by current run`) and suppress the re-render. This prevents the same proposal from appearing twice in one run.

**Trigger layer** (zero-cost, always runs; fires when ≥1 hits):

A diff is flagged as "potentially architectural" when ANY of these conditions hold:

| Trigger | Signal |
|---------|--------|
| New top-level folder | `git diff --name-only HEAD` shows a new path whose first segment didn't exist in HEAD~1 |
| Dependency churn | ≥2 of: `pyproject.toml dependencies section`, `package.json dependencies/devDependencies`, `Gemfile`, `go.mod require block` show non-whitespace changes |
| Config/routes/schemas | Changes a file matching `**/config*.{py,ts,yaml}`, `**/{routes,models,schemas,entities}/**`, `**/__init__.py` at a package root, `docker-compose*.yml`, `alembic/env.py` |
| Well-concentrated large change | Modifies files matching exactly one well's `Paths` globs AND diff is >50 lines total |
| Architectural commit prefix | Commit subject starts with `feat:`, `refactor:`, or `breaking:` AND touches ≥1 file mapped at `critical` or `high` in `.kdbp/DOCS.md` |
| Explicit ADR marker | Diff introduces a new `# Decision:` or `# ADR:` comment in any source file (grep signal) |

**Classifier layer** (LLM, cheap model, fires only when trigger hits):

Precondition: trigger hit AND no row in `.kdbp/DOCS.md` references any file in the diff by exact path (dedup — avoid re-proposing the same decision).

- **Model:** Haiku-tier (cheap; per user value U6 — route by task)
- **Context:** commit subject + body, top 10 changed files with line deltas, the trigger reason(s) from the trigger layer, the last 5 rows of DECISIONS.md (dedup awareness)
- **Max tokens:** 200
- **Structured output** (PydanticAI `output_type` or equivalent — user value U4):
  ```
  ArchitecturalDecisionCandidate:
    is_architectural: bool       # false → drop, no proposal
    title: str                   # one-line, <80 chars
    rationale: str               # 2-3 sentences
    alternatives: list[str]      # 0-2 alternatives considered
    review_trigger: str          # when to revisit (e.g., "when we add 3rd integration")
  ```
- If `is_architectural == false`: drop silently, no proposal rendered.

**Dedup + caps:**

- Max ONE candidate per review run. If multiple triggers hit, the classifier picks the strongest.
- Session-scoped dedup: if user picks `drop` on a candidate this session, do not re-propose the same title.
- If the classifier's proposed `title` case-insensitively matches any existing DECISIONS.md row: drop silently.

**Output block** (renders inside the Plan Alignment section, below 5c if both fired):

```
### Architectural Decision Candidate

  Detected: [trigger reason]
  Proposed DECISIONS.md entry:

    Date:           2026-04-17
    Decision:       [title]
    Rationale:      [rationale]
    Alternatives:   [alt 1]
                    [alt 2]
    Status:         active
    Review Trigger: [review_trigger]

  [accept]  Append to .kdbp/DECISIONS.md as D[next_id]
  [edit]    Revise fields before writing
  [defer]   Add reminder to PENDING.md (source=classifier)
  [drop]    Don't write (one-time dismissal this session)
```

**Action handlers:**

| Action | Behavior |
|--------|----------|
| `accept` | Read DECISIONS.md → compute next `D[N]` (max existing + 1) → append row with today's date, title, rationale, alternatives joined by `<br>`, `active` status, review_trigger. Use Edit tool to append before the closing fence if DECISIONS uses a frontmatter fence, else append at EOF. Mark any open PENDING.md classifier row with matching title as `resolved` (today's date). |
| `edit` | Show each field inline-editable (prompt per field, default = proposed value). On confirm, proceed to `accept`. |
| `defer` | Append to PENDING.md: `\| P[N] \| today \| classifier \| [title] \| - \| small \| medium \| low \| 0 \| open \|`. Source column = `classifier`. Title stored verbatim in Finding for dedup on re-surface. If an open classifier row already exists with matching title (case-insensitive), increment `Times Deferred` on that row instead of creating a duplicate. |
| `drop` | No write. Session-scoped dedup set to this title (same title won't re-propose this run). Mark any open PENDING.md classifier row with matching title as `resolved` (today's date) to prevent re-surface loop. |

**Default-on-drop-through:** If the command completes without the user picking an action (common in non-interactive flow — agent continues before user can choose), treat as `defer`. The unresolved candidate is persisted to PENDING.md so it re-surfaces instead of vanishing. Session-scoped dedup still applies per-title to prevent double-persist within a single run.

**Race handling:** DECISIONS.md may be appended by `/gabe-push` too (starting in Phase 5). Dedup is by title case-insensitive match. If two writers race on `D[N]` computation, Edit tool's match-and-replace will fail on one of them — the losing writer retries with fresh read.

#### Sub-check 5d — Tier drift detection

Purpose: "Did this diff introduce code patterns above the phase's declared Tier?"

Skip silently if any of:
- `.kdbp/PLAN.md` doesn't exist OR doesn't contain `status: active`
- Current phase row lacks a `Tier` cell (legacy plan, pre-v2.10)
- Phase Tier = `scale` (ceiling — no patterns above Scale to flag)
- `.kdbp/SCOPE.md` marked `status: pivoted`

**Procedure (deterministic + pattern scan):**

1. Read `.kdbp/PLAN.md`:
   - Current Phase N → Tier cell: parse `phase_tier` = leading token (strip `(overrides...)` compact notation)
   - `## Phase Details → Phase N` YAML block → `dim_overrides` list (each entry `{section, dim, tier, reason}`); empty/missing = no overrides
   - `## Phase Details → Phase N → Types:` list
2. Load section files (resolve path: try `~/.claude/templates/gabe/tier-sections/` first, fall back to `~/.agents/templates/gabe/tier-sections/` when running under Codex CLI):
   - `tier-sections/core.md` (always)
   - For each matched type, load corresponding `tier-sections/*.md`
3. For each loaded section, extract `## Known drift signals` table. Each row has `Pattern`, `Tier floor`, `Finding severity`, **`Dim`** (which dimension within the section the pattern belongs to — added for override-awareness; fall back to section-wide match when the column is absent on legacy section files).
4. Scan diff for each pattern. Detection is substring/regex match on added lines (`git diff` context, skip removed). Patterns are either:
   - Import/symbol literal (e.g. `@retry`, `tenacity.retry`, `launchdarkly-server-sdk`, `BroadcastChannel`)
   - File-path glob (e.g. `evals/*.json`, `migrations/alembic/env.py`)
   - AST-ish (e.g. decorator name at function scope — close approximation via regex on `^@decorator_name` at start-of-line after indent)
5. For each matched pattern, resolve the **effective tier** for its section + dim:
   - Look up `dim_overrides` for `{section, dim}` where section matches the loaded section file and dim matches the pattern's `Dim` column
   - Match found → effective tier = override tier
   - No match → effective tier = `phase_tier`
6. For each matched pattern where `Tier floor > effective tier`:
   - Emit a TIER_DRIFT finding in the Step 4 findings table.
   - Severity inherits from the `Finding severity` column (TIER_DRIFT-HIGH / MED / LOW) but use HIGH as default if ambiguous.
   - Description: `[Section.Dim] pattern detected — tier floor [Ent|Scale], effective tier [current]` — if the effective tier came from an override, append `(override: <reason>)` so operator sees why escalation was permitted up to override but still crossed.
   - File/line = first match location.
   - **Dim override allow-path:** when `Tier floor ≤ effective tier`, the pattern is within the permitted ceiling for that dim — no TIER_DRIFT. Do not emit an informational finding for legitimate override-permitted work; operator approved this at plan time.

**Prototype shift:** If phase is tagged `prototype: true`, shift every TIER_DRIFT severity down one notch (HIGH→MED, MED→LOW, LOW→suppressed). Matches the Δ-grade shift in `tier-delta-scale.md`.

**Dedup:** If multiple patterns in the same section×dimension hit, emit ONE finding (not one per occurrence). Concatenate matched pattern list in the finding description.

**Output — TIER_DRIFT block:**

Rendered alongside other 4.75 sub-checks when any TIER_DRIFT finding fires:

```
### Tier Drift Detection

Phase N ([name]) — declared Tier: [mvp|ent] (prototype: [yes|no])

Patterns detected above tier:

  [HIGH] Core.Abstractions — Scale-tier pattern found
    Match: `container.resolve(...)` — DI container usage
    File: app/agent/factory.py:12
    Reason: `abstractions: + DI` lives at Scale per core.md

  [HIGH] AI/Agent.Structured output — Scale-tier pattern found
    Match: fallback chain (regex → rule → default)
    File: app/agent/triage_fallback.py:33-48
    Reason: `+ fallback chain` lives at Scale per ai-agent.md

Resolution per finding:

  [downgrade]     Rip out the pattern, stay at tier [mvp|ent]
  [amend-tier]    Promote phase tier → log reason to DECISIONS.md
  [accept-drift]  Keep code, accept drift as known risk (one-time)
  [defer]         Revisit next review (logs to PENDING.md)
```

**Action handlers:**

| Action | Behavior |
|--------|----------|
| `downgrade` | Informational. No auto-rip. User expected to remove code in follow-up commit. Finding stays open, re-surfaces next `/gabe-review` until code is gone. |
| `amend-tier` | Prompt: "Why promote Phase N from [current] to [new]? (one sentence)". Update PLAN.md Tier cell. Append `### Tier escalation` block to the phase's DECISIONS.md D-entry. Log LEDGER: `TIER ESCALATION: Phase N from [old] to [new] — via review`. Finding resolved (removed from current run). |
| `accept-drift` | Adds a `drift-accepted` note to the phase's DECISIONS.md D-entry with date + pattern. Finding resolved for this run. Re-surfaces next run if the pattern pops up elsewhere (prevents silent permanent drift). |
| `defer` | Append to PENDING.md: `\| P[N] \| today \| gabe-review \| TIER_DRIFT: [section.dim] at [file] \| [file] \| [tier] \| medium \| moderate \| 0 \| open \|`. Source = `gabe-review`. |

**Session-scoped dedup:** If same pattern + file fires in multiple consecutive reviews, apply escalation (2nd → tag `⚠ RECURRING`, 3rd → promote to BLOCK). Same escalation pattern as general deferred items.

**Default-on-drop-through:** Treat as `defer`. Unresolved drift goes to PENDING.md — surfaces next review instead of vanishing.

#### Plan Alignment summary block

If 5a produced output OR 5c produced output OR 5b produced a candidate OR 5d produced a TIER_DRIFT finding, wrap in a single "Plan Alignment" block under Step 4.75's heading. Order: 5a, 5c, 5b, 5d. If all four are empty, skip the block entirely (don't render an empty heading).

### Step 4.9: Gabe-Lens Block (output-only)

For normal result-producing modes — default/no-arg review, `brief`, `inbox`, `post-review`, and explicit file/folder targets — print one full Gabe Block after findings, verdict, and confidence are known. Skip this step for `deferred`, `resume`, `close`, `discard`, and `fix`.

Render:

```
**Gabe-Lens block**

[one full Gabe Block generated with the active gabe-lens cognitive suit]
```

Block focus:

- Explain what the review discovered or validated.
- Map the top findings to concrete system risk: data loss, security exposure, broken flow, drift, maintainability load, or confidence gap.
- If there are no findings, map the validated coverage to reduced risk instead of inventing concerns.
- Tie the signal to the verdict/confidence: why APPROVE, WARNING, or BLOCK follows from the evidence.

Persistence rule: this block is output-only. Do not write it to `.kdbp/REVIEW.md`, `.kdbp/PLAN.md`, `.kdbp/LEDGER.md`, `.kdbp/PENDING.md`, commits, or docs. It is a command-time understanding aid; `/gabe-teach` remains the durable knowledge consolidation path.

### Step 5: Triage

After the verdict and session estimate, present the triage prompt for normal triage-producing modes (default/no-arg, explicit targets, `post-review`, and `resume`). This closes the gap between "here's what's wrong" and "let's fix it." Skip this menu for `brief`, `inbox`, `deferred`, `close`, and `discard`; `fix` bypasses the menu and applies the "Everything" route.

**REVIEW.md is the triage workspace.** Before the first bulk/per-finding prompt, reconcile with `.kdbp/REVIEW.md` — see "Live Review Document" for the full blind-first flow (no-file / same-source collision / cross-agent merge). After reconcile, either a fresh or consolidated REVIEW.md exists on disk. As each finding is acted on during triage, mutate its `Status` column in place (`pending` → `fixed | deferred | dismissed`) so an interrupted triage is safely resumable by the next `/gabe-review` call.

#### Entry Point — Shared Next-Action Menu

Replaces the old binary "Enter triage? [Y/n]" with a severity x maturity matrix plus a shared menu used by both Claude Code and Codex. Every option is explicit about **both** the fix set and the remainder behavior, so the user is never surprised by what happened to findings they didn't explicitly address.

For Codex, this is a visible output contract: if the runtime cannot render an interactive picker, print the menu as plain text at the end of the review and wait for the user's selection. Do not end a normal Codex `/gabe-review` with only findings and a summary.

**Matrix display:**

```
### Triage — [N] findings across [M] files

Severity × Maturity Gate:

| Severity     | MVP | Enterprise | Scale | Total |
|--------------|-----|------------|-------|-------|
| CRITICAL     | [n] | [n]        | [n]   | [n]   |
| HIGH         | [n] | [n]        | [n]   | [n]   |
| MEDIUM       | [n] | [n]        | [n]   | [n]   |
| LOW          | [n] | [n]        | [n]   | [n]   |

Project maturity: [MVP|Enterprise|Scale] (from .kdbp/BEHAVIOR.md)
```

Counts come deterministically from the Findings table already produced in Step 4. No recomputation.

**Shared options, each with explicit fix set AND remainder behavior:**

```
What do you want to fix next?

  [1] Fix only
      Fix:          minimum blocking set for the active maturity gate
                    (MVP: CRITICAL; Enterprise: CRITICAL + HIGH;
                    Scale: CRITICAL + HIGH + MEDIUM)
      Defer:        everything else -> PENDING.md
      Use when:     you want the review unblocked without adjacent cleanup

  [2] MVP
      Fix:          [n_mvp] findings (MVP gate, any severity)
      Defer:        [n_ent+n_scale] findings (Enterprise + Scale) -> PENDING.md
      Confidence:   [current] → [projected] (+[delta])

  [3] Fix also Enterprise
      Fix:          [n_mvp+n_ent] findings (MVP + Enterprise gates)
      Defer:        [n_scale] findings (Scale gate) -> PENDING.md
      Confidence:   [current] → [projected] (+[delta])

  [4] Scale
      Fix:          [n_mvp+n_ent+n_scale] current review findings
      Defer:        unrelated/open backlog not directly raised by this review
      Confidence:   [current] → [projected] (+[delta])

  [5] High + Critical
      Fix:          [n_crit+n_high] findings (CRITICAL + HIGH, any gate)
      Defer:        [n_med+n_low] findings (MEDIUM + LOW) -> PENDING.md
      Confidence:   [current] → [projected] (+[delta])

  [6] Everything
      Fix:          every current review finding and directly related open
                    deferred item surfaced by this review
      Defer:        none from the current review

  [7] Defer
      Defer:        all non-CRITICAL findings -> PENDING.md
      Fix:          none

  [8] Something else
      Enter:        custom expression or plain-language instruction
      Examples:     "fix 1-3, defer 4-6", "one-by-one", "fix auth only"

★ Recommended for [project maturity]: [default option]

Pick [1-8], type the label, or type `custom` for a mixed expression:
```

**Starred default (by project maturity, not by project name):**

| Project maturity | Recommended option |
|------------------|--------------------|
| MVP | [2] MVP |
| Enterprise | [3] Fix also Enterprise |
| Scale | [4] Scale |

If no `.kdbp/BEHAVIOR.md` exists or maturity is unset, star [1] as the conservative default.

Accept case-insensitive text labels and common aliases:

| User input | Route |
|------------|-------|
| `fix only`, `minimum`, `blocking` | [1] Fix only |
| `mvp`, `mbp` | [2] MVP |
| `enterprise`, `fix also enterprise` | [3] Fix also Enterprise |
| `scale` | [4] Scale |
| `high critical`, `critical high`, `high + critical` | [5] High + Critical |
| `everything`, `all` | [6] Everything |
| `defer`, `skip` | [7] Defer |
| `something else`, `custom`, any unmatched prose | [8] Something else |

#### Bulk Option Guardrails

Before executing any bulk option, apply these guardrails:

**1. CRITICAL findings are always in the fix set for options [1]-[6].**

If the chosen option would leave a CRITICAL unresolved (e.g., user picks [1] but a CRITICAL has Enterprise gate), show this warning and adjust:

```
⚠ Option [1] would defer [N] CRITICAL finding(s). CRITICALs cannot be silently deferred.
  Adjusted fix set:  [N+n_mvp] findings ([n_mvp] MVP + [N] CRITICAL forced)
  Adjusted defer:    [rest]
  Proceed? [Y/n]
```

If the user confirms, execute with the adjusted sets. If they decline, return to the menu.

**2. Option [7] Defer cannot silently defer CRITICAL findings.**

If the user picks [7] while CRITICAL findings exist:

```
⚠ Defer would leave [N] CRITICAL finding(s) unresolved.
  CRITICAL findings require either a fix or an explicit dismiss/force-defer
  justification.
  Choose: [1] Fix only, [8] Something else, or type "force-defer critical: <reason>".
```

`force-defer critical` writes the item to PENDING.md with the justification and keeps the Final Verdict at BLOCK.

**3. Dismiss is never a bulk action.**

All remainders from bulk options go to **defer** (PENDING.md, re-surfaces on next review). Dismiss is session-only and requires per-finding justification — only available through [8] Something else / custom or the one-by-one loop.

#### Custom Expression

User picks [8] or types a mixed expression:

```
fix 1-3, defer 4-6, dismiss 7
fix 1,3,5 defer 2,4
fix all-critical, defer all-scale, one-by-one rest
one-by-one
```

Parse rules:
- `fix N` / `fix N-M` / `fix N,M,P` — add to fix set
- `defer N` / `defer N-M` — add to defer set (PENDING.md)
- `dismiss N` — requires asking for justification per item
- `skip N` — leave un-triaged (prompted at end)
- `one-by-one N` or `one-by-one rest` — route specific items (or everything else) to the per-finding loop
- Shortcuts: `all-critical`, `all-high`, `all-mvp`, `all-enterprise`, `all-scale`, `blocking`, `rest`
- Unresolved items at the end of the expression → auto-defer with a confirmation prompt

Apply the same guardrails (CRITICAL handling, force-defer justification, dismiss-needs-justification).

#### One-by-one Loop ([8] Something else with `one-by-one`)

Present findings **grouped by file** (not by severity), because fixes in the same file batch naturally. Within each file group, order by severity (CRITICAL first).

For each finding, show a compact card:

```
[1/5] HIGH — Missing fail-open test | rateLimiter.ts:88 | Fix: S (<30m)
      Defer Risk: SILENT FAILURE — P(medium), I(high)

  (f) Fix now    (d) Defer    (x) Dismiss    (s) Skip    (a) Fix all remaining    (e) Explain
```

#### Actions

| Action | What happens |
|--------|-------------|
| **f — Fix now** | The active CLI (Claude Code or Codex) applies the fix immediately. For code changes: edit the file, show the diff. For test gaps: write the test. For doc issues: update the doc. After fix, re-validate and mark resolved. |
| **d — Defer** | Ask for optional justification. Write to `.kdbp/PENDING.md` (or `deferred-cr.md` if PENDING.md doesn't exist) with current date, finding details, source=`gabe-review`, and Times Deferred = 1 (or increment if recurring). Move to next finding. |
| **x — Dismiss** | Ask for one-line reason. Record dismissal in the review output (not in deferred backlog). Move to next finding. Dismissals don't persist across reviews — they're session-only decisions. |
| **s — Skip** | Leave in the findings table without deciding. At end of triage, un-skipped items get a final "defer or dismiss?" prompt. |
| **a — Fix all** | Apply fixes for all remaining findings in sequence without per-finding prompts. Show a summary diff at the end. Useful when the user trusts the fixes and wants to batch them. |
| **e — Explain** | If the `gabe-lens` skill is available, invoke it to generate an analogy for the finding + expose trade-offs. Otherwise emit the 4-section analogy inline. Returns to this same prompt after explaining — doesn't advance. See "Explain behavior" below. |

#### Explain Behavior (`e`)

When the user picks `e`:

1. **Delegate to `gabe-lens` when available.** If the `gabe-lens` skill is installed and invokable (Claude Code: Skill tool; Codex CLI: `$gabe-lens` or `/skills gabe-lens`), pass the finding details (severity, file:line, description, defer risk, maturity gate) as context and let it produce the analogy. If `gabe-lens` is not available, generate the same 4 sections inline using the finding context — output is indistinguishable either way.
2. **Produces 4 sections** — short, concrete, no filler:
   - **ANALOGY:** physical or spatial metaphor for what's broken and why it matters (2-4 lines)
   - **WHY IT MATTERS:** bullets on what the finding actually buys the project (2-3 bullets)
   - **IF YOU FIX:** concrete outcome + confidence delta
   - **IF YOU DEFER:** concrete failure mode + when it bites
3. **Re-prompts the same action menu** — user can then pick f / d / x / s / a. Does NOT advance to the next finding on its own.

Example:

```
[2/9] HIGH — Missing fail-open test | rateLimiter.ts:88 | Fix: S (<30m)
      Defer Risk: SILENT FAILURE — P(medium), I(high)

> e

ANALOGY: Like a circuit breaker with no test that it actually trips. The code says
"if upstream fails, fail open (allow requests)". That's a reasonable policy — but
nothing exercises it. Six months later someone refactors, the fail-open silently
becomes fail-closed, and production drops 10% of traffic during partial outages
until someone notices in a dashboard.

WHY IT MATTERS:
  - Without the test, you can't know if the behavior is intentional
  - The fix is <30m (one test)
  - Deferring means the next refactor could silently flip the behavior

IF YOU FIX:  Confidence +12. Permanent guardrail on rate-limiter behavior.
IF YOU DEFER: Finding escalates on next review if rate-limiter is touched again.

  (f) Fix   (d) Defer   (x) Dismiss   (s) Skip   (a) Fix all

>
```

Keep analogies concrete. Avoid "this is like a house" handwaving — use the specific domain of the finding (timing, locking, data flow, UI state) so the analogy teaches something transferable.

#### Fix Behavior

When the user picks **Fix now**, the active CLI should:

1. **Read the file** at the finding's location (if not already in context)
2. **Apply the minimal fix** — same constraints as normal editing (no scope creep, no bonus refactoring)
3. **Show the diff** — so the user can see what changed
4. **Re-validate** — check if the fix actually resolves the finding (e.g., does the test now exist? is the validation present?)
5. **Report result**: `Fixed: [finding summary] — [file:line]` or `Partial fix: [what remains]`

For findings that can't be auto-fixed (e.g., "needs architectural decision", "requires external input"):
```
This finding needs manual resolution: [reason].
Suggested approach: [one-liner]
(d) Defer    (x) Dismiss
```

#### Fix All Behavior

When the user picks **(a) Fix all remaining**, the active CLI:

1. Groups remaining findings by file (reduces file re-reads)
2. Applies fixes in severity order within each file (CRITICAL first)
3. After all fixes, shows a single batched summary:
   ```
   Applied 4 fixes across 3 files:
   - rateLimiter.ts: #2 fail-open test, #3 error handling
   - vault-protocol.md: #1 schema count, #5 working type rules
   ```
4. Any finding that couldn't be auto-fixed is collected at the end:
   ```
   1 finding requires manual resolution:
   - #4 concurrency model — needs architectural decision
   (d) Defer    (x) Dismiss
   ```

#### Triage Summary and Score Update

After all findings are processed, show a compact summary **with updated confidence score**:

```
### Triage Complete

| Action | Count | Findings |
|--------|-------|----------|
| Fixed | 3 | #1 schema drift, #2 working type lifecycle, #5 quick capture fields |
| Deferred | 1 | #3 signal log granularity → PENDING.md |
| Dismissed | 1 | #4 concurrency model — "single-agent MVP, revisit at Scale" |

Review Confidence: 62 → 87 / 100 (+25)

### Final Verdict

[APPROVE|WARNING|BLOCK] — [reason, incorporating triage outcomes]

Deferred items written to .kdbp/PENDING.md
```

The post-triage score recalculates: **fixed** findings are fully removed from the deduction, **dismissed** findings count at **50%** of their original multiplied deduction (acknowledged but unresolved risk), and **deferred** findings count at full deduction. The Final Verdict replaces the Provisional Verdict using the updated score and remaining finding state.

#### CRITICAL Finding Constraint

CRITICAL findings during one-by-one triage **cannot be silently deferred**. The `(d)` option is disabled unless the user explicitly uses `force-defer critical: <reason>` from the shared action menu or custom expression:

```
[2/5] CRITICAL — SQL injection via unsanitized input | api.ts:44 | Fix: S (<30m)
      Defer Risk: DATA BREACH — P(high), I(catastrophic)

  (f) Fix now    (x) Dismiss (requires justification)    (s) Skip for now    (a) Fix all remaining
```

#### Edge Cases

| Situation | Behavior |
|-----------|----------|
| All findings are LOW and below maturity gate | Still offer triage, but default prompt is "All findings below MVP gate. Defer all? [Y/n]" |
| User exits mid-triage (Ctrl+C, context limit) | Persist any already-deferred items. Un-triaged findings are NOT auto-deferred — they remain in the session output only. |
| Fix introduces a new issue | Don't re-review during triage. The fix-then-review loop is for the next `/gabe-review` run. |
| Finding references a file not in the workspace | Can't auto-fix. Offer defer/dismiss only. |
| Skipped CRITICAL at end of triage | CRITICALs cannot be silently deferred. At the final sweep, present only **(f) Fix now**, **(x) Dismiss (requires justification)**, or `force-defer critical: <reason>`. If the user skips again, auto-classify as Dismissed with note: "No resolution chosen — treated as acknowledged risk." |

### Step 6: Archive REVIEW.md + auto-tick PLAN.md + LEDGER trace

After triage completes (Final Verdict produced), archive the live review document, tick the Review column of the current phase if the review passed, and **always** append a LEDGER entry so every run leaves an audit trail — regardless of verdict or tick outcome.

**Archive the live REVIEW.md (auto, no prompt).** If `.kdbp/REVIEW.md` exists and every finding has a non-pending `Status`:
1. Flip frontmatter `status: active` → `status: resolved`.
2. Move the file to `.kdbp/reviews-archive/REVIEW_<YYYY-MM-DD-HHMMSS>_resolved.md` (the `<timestamp>` is the REVIEW.md frontmatter timestamp for traceability; if missing, use now).
3. Ensure `.kdbp/reviews-archive/` is in the project `.gitignore` — grep-before-append pattern; a new line `.kdbp/reviews-archive/` is added once and only once.
4. On `discard` (user explicit cancel) or `stale` / `superseded` (from the collision prompt), same move happens with the appropriate `<status>` suffix in the filename. `discard` SKIPS the subsequent PLAN tick and LEDGER trace; `stale` / `superseded` proceed to LEDGER with a `DISPOSITION: stale` or `superseded` line.

**Pass condition for Review column:**
- Final Verdict is APPROVE or WARNING (not BLOCK)
- No unresolved CRITICAL findings (deferred = OK; deferred CRITICAL cannot exist per guardrail)
- No unresolved HIGH findings ABOVE the maturity gate (deferred = OK)
- **Step 4.75 Sub-check 5a did NOT return `MISALIGNED`** (added Phase 2/6 of doc-lifecycle work — a MISALIGNED diff shouldn't auto-advance the phase just because code review passed). `ALIGNED`, `DRIFTED`, and `SKIP` all satisfy this condition. If MISALIGNED, silently skip the tick and log `ℹ PLAN: phase tick skipped (diff MISALIGNED with current phase scope)` to the output.

Follow the shared procedure documented in `/gabe-plan` under "Shared: auto-tick phase column":
- Target column: `Review`
- Preconditions: `.kdbp/PLAN.md` exists, contains `status: active`, has `## Current Phase`, and Phases table includes a `Review` column
- On mismatch or legacy Status-column format: exit silently
- On success, display: `✅ PLAN: Phase [N] review ticked` (one line at the end of output)

If the pass condition is not met (BLOCK verdict or unresolved issues above gate), do NOT tick — but do not emit a warning either. The user knows they blocked.

**LEDGER trace — always append** (runs whether tick fires or skips; runs whether PLAN.md exists or not):

1. Preconditions: `.kdbp/LEDGER.md` exists. If missing, skip silently (non-KDBP repo or pre-init state).
2. Compute `tick_outcome`:
   - `✅` if Review column was ticked by the block above
   - `skip(BLOCK)` if Final Verdict is BLOCK
   - `skip(unresolved-HIGH)` if HIGH finding above maturity gate remains un-deferred
   - `skip(MISALIGNED)` if Sub-check 5a returned MISALIGNED
   - `skip(no-plan)` if `.kdbp/PLAN.md` missing or legacy
   - `skip(phase-not-found)` if Current Phase row not found
3. Append to `.kdbp/LEDGER.md`:
   ```
   ## YYYY-MM-DD HH:MM — PHASE N REVIEW: [phase name, or "ad-hoc" if no plan]
   VERDICT: [APPROVE | WARNING | BLOCK]
   FINDINGS: N total (C critical, H high, M medium, L low)
   COVERAGE: [HIGH | MEDIUM | LOW | VERY LOW] — [one-line reason if not HIGH]
   CONFIDENCE: [score]/100
   DEFERRED: [list of IDs added to PENDING.md, or "none"]
   ALIGNMENT: [ALIGNED | DRIFTED | MISALIGNED | SKIP]
   TIER: [mvp | ent | scale | unset] | DRIFT: [none | N findings (escalated X, accepted Y, deferred Z)]
   TICK: [tick_outcome from step 2]
   ```
4. This LEDGER entry is the single audit artifact for `/gabe-review` runs. Do NOT duplicate into another file (KNOWLEDGE.md, session files, etc.). `/gabe-next` and humans read LEDGER to answer "did review run? what did it say? why didn't it tick?".

Rationale: the silent-no-op-on-tick-failure behavior leaves no record when a review runs but doesn't advance phase state (e.g., MISALIGNED skip or BLOCK verdict). Without the LEDGER trace, `/gabe-next` cannot distinguish "review never ran" from "review ran and blocked" — both present as Review=⬜. The trace makes the state machine auditable.

---

## Output Format

### Full Mode (default)

```markdown
## Gabe Review — Review Summary

**Maturity:** [MVP|Enterprise|Scale] | **Files:** N changed | **Deferred backlog:** N items

### Findings

| # | Severity | Finding | File | Churn | Fix Cost | Defer Risk | Gate | Escalation |
|---|----------|---------|------|-------|----------|------------|------|------------|
| 1 | CRITICAL | [description] | file:line | 🔴 HOT | S | [consequence] — P(x), I(y) | MVP | |
| 2 | HIGH | [description] | file:line | ✅ | M | [consequence] — P(x), I(y) | MVP | ⚠️ RECURRING (2nd) |
| ... | | | | | | | |

### Risk Dashboard (All Pending)

Items from this review + unresolved deferred backlog, ordered by risk:

| # | Source | Age | Finding | File | Defer Risk | Escalation |
|---|--------|-----|---------|------|------------|------------|
| D1 | [review name] | N days | [description] | file | [risk] | [status] |
| ... | | | | | | |

### Coverage Confidence

Before producing the verdict, assess coverage confidence:

| Condition | Coverage | Effect |
|---|---|---|
| All changed source files have corresponding test changes | HIGH | No cap |
| Some test gaps exist but none on error handling paths | MEDIUM | No cap |
| Test gaps exist on error handling / fail-open / fallback paths | LOW | Verdict capped at WARNING |
| Multiple untested branches on HOT files | VERY LOW | Verdict capped at BLOCK |

Format in output:
```
Coverage: LOW (2 untested error-handling branches) — verdict capped at WARNING
```

### Review Confidence

Score: [0-100] / 100

| If you fix... | Findings resolved | Projected | Δ |
|---------------|-------------------|-----------|---|
| All CRITICAL + HIGH | X of N | XX / 100 | +XX |
| All MVP gate | X of N | XX / 100 | +XX |
| All Enterprise gate | X of N | XX / 100 | +XX |
| All (incl. Scale) | N of N | XX / 100 | +XX |

### Verdict (Provisional)

[APPROVE|WARNING|BLOCK] — [reason]
*This verdict is based on findings as-is. Triage decisions below may change it.*

- APPROVE: No CRITICAL, no ESCALATED deferrals above maturity gate, coverage confidence ≥ MEDIUM, review confidence ≥ 70
- WARNING: HIGH findings within maturity tolerance, OR coverage confidence LOW (caps verdict), OR review confidence 50–69
- BLOCK: CRITICAL present, OR ESCALATED deferrals (2+ times), OR coverage VERY LOW, OR maturity gate exceeded, OR review confidence < 50

**Coverage vs confidence precedence:** The coverage verdict cap and confidence score are independent signals. When they conflict, the stricter result wins (e.g., coverage caps at WARNING but score < 50 → BLOCK).

### Session Estimate
Fixing [CRITICAL+HIGH]: ~Nh | Fixing all: ~Nh | Deferring [count]: risk exposure ≈ [summary]

### Triage

N findings to resolve. Enter triage? [Y/n]
```

After the verdict/confidence material above and before triage, render Step 4.9's output-only Gabe-Lens block for modes where that step applies.

**Verdict finalization:** The verdict shown before triage is PROVISIONAL. After triage completes, restate the **Final Verdict** incorporating triage outcomes (fixed items removed, dismissed at 50% weight, deferred at full weight). If the user declines triage, auto-defer findings above the maturity gate and restate the final verdict. If the user declines to track deferred items, the verdict cannot be APPROVE — downgrade to WARNING with note: "Deferred items not tracked — risk of invisible debt."

### Brief Mode (`/gabe-review brief`)

Only the findings table + headline confidence score + verdict, followed by the output-only Gabe-Lens block from Step 4.9. No projection table, no interpretation guide, no dashboard, no session estimate, no triage. Format: `Score: 62 / 100 | Verdict: WARNING — [reason]`. In brief mode the verdict is **final** (not provisional) since triage is not offered.

### Fix Mode (`/gabe-review fix`)

Runs the full review (Steps 0.5–4.5) then shows a compact pre-triage summary before auto-fixing:

```
Score: 48 / 100 (BLOCK) — 7 findings. Applying fixes...
```

Then enters triage with "(a) Fix all" pre-selected. Shows full triage summary with updated confidence score and Final Verdict at the end. For users who trust the review and just want everything patched.

### Deferred-Only Mode (`/gabe-review deferred`)

Shows the Risk Dashboard table with current confidence impact of deferred items. Offers triage:

```
### Deferred Backlog — N items

| # | Age | Finding | File | Defer Risk | Times Deferred | Confidence cost |
|---|-----|---------|------|------------|----------------|-----------------|
| D1 | 26d | Missing IP skip test | suggestRecipes.ts:31 | P(high), I(high) | 2 ⚠️ | −18 pts |
| D2 | 26d | Missing fail-open test | rateLimiter.ts:88 | P(medium), I(high) | 1 | −12 pts |
| ...

Total deferred confidence drag: −XX pts

Tackle deferred items? [Y/n]
```

If yes, enter the same triage loop with (f)/(d)/(x)/(s) options.

### Live Review Document (`.kdbp/REVIEW.md`)

**Singleton discipline.** Gabe Suite follows "one thing at a time" — one active PLAN, one active SCOPE, one active REVIEW. The review document is `.kdbp/REVIEW.md`. It is ephemeral working memory during triage, and it is archived to `.kdbp/reviews-archive/` (gitignored) once resolved. A single REVIEW.md can carry findings from **multiple independent review passes** (e.g. Codex pass 1 + Claude pass 2), attributed per-finding to their source — see "Blind-first cross-agent triangulation" below.

**Lifecycle.**

1. **Analyze.** Every gabe-review run performs its full analysis first (Steps 0.5–4.75) without reading any existing `.kdbp/REVIEW.md`. The analysis is **blind to prior passes** by design — independence of perspective is the point.
2. **Reconcile.** After analysis completes, the skill checks for an existing `.kdbp/REVIEW.md`:
   - **None exists** → write fresh REVIEW.md (single-source), proceed.
   - **Exists, SAME source** (same CLI as this run) → collision prompt (resume/stale/replace/cancel).
   - **Exists, DIFFERENT source** (different CLI, e.g. existing from Codex while this run is Claude, or vice versa) → **merge mode**: gap analysis + consolidation.
3. **Live.** The active CLI's triage loop reads the consolidated (or fresh) file, mutates per-finding `Status` as the user picks `(f)ix`, `(d)efer`, `(x)ismiss`, or `(s)kip`. The file is the single source of truth during the session; if the CLI is interrupted, it's safely resumable.
4. **Resolve.** When every finding has a non-pending status AND the triage loop exits cleanly, flip `status: active` → `status: resolved` and move the file to `.kdbp/reviews-archive/REVIEW_<YYYY-MM-DD-HHMMSS>_resolved.md`. Then run Step 6 (auto-tick + LEDGER write).
5. **Discard / stale / supersede.** User can explicitly `discard` (no LEDGER write), or the collision prompt may archive as `stale` or `superseded` — filename suffix reflects the reason.

**Collision handling (same source).** When the existing `.kdbp/REVIEW.md` has `sources[0].cli` equal to the current runtime's CLI:

```
Existing active review from the same agent (source: <codex|claude>, <N> findings, created <timestamp>).

  (r) Resume triage on existing review
  (a) Archive as stale, start fresh review
  (x) Replace (archive current as superseded, start fresh)
  (c) Cancel
```

Matches PLAN.md's pattern. No silent overwrites. No file locks.

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

### Post-Review Mode (`/gabe-review post-review`)

Parse an external code review (CE:review, BMad, ECC, manual) and ingest its findings into `.kdbp/REVIEW.md`. Detect the source format and map severities:

| Source | Severity mapping |
|---|---|
| **CE:review** | P0→CRITICAL, P1→HIGH, P2→MEDIUM, P3→LOW |
| **BMad code-review** | decision_needed→HIGH, patch→by-dimension, defer→load into deferred backlog |
| **ECC code-reviewer** | CRITICAL→CRITICAL, HIGH→HIGH, MEDIUM→MEDIUM, LOW→LOW (same scale) |
| **Manual/unknown** | Infer from keywords (security→CRITICAL, performance→MEDIUM, style→LOW) |

Add Defer Risk + Maturity Gate + Confidence Score columns to each parsed finding, then write the standard `.kdbp/REVIEW.md` live document (subject to the collision prompt above). After the file is written, follow the full mode flow (confidence score with projections, provisional verdict, session estimate, triage, archive-on-resolve).

**Resume semantics.** If `post-review` is invoked without an explicit external source and an active `.kdbp/REVIEW.md` already exists, this is equivalent to `/gabe-review` with the (r) Resume option — the active CLI picks up whatever is in REVIEW.md (including artifacts produced earlier by the other CLI) and runs triage.

---

## Deferred Item Persistence

Written to `.kdbp/PENDING.md` (preferred), `.kdbp/deferred-cr.md`, or `.planning/deferred-cr.md` (first found, or create `.kdbp/PENDING.md`).

File format:
```markdown
<!-- gabe-review:1.3 -->
# Deferred Code Review Items

| # | First Seen | Review | Finding | File | Defer Risk | Times Deferred | Status | Resolved |
|---|-----------|--------|---------|------|------------|----------------|--------|----------|
| D1 | 2026-03-10 | TD-2-9 | Missing IP skip test | suggestRecipes.ts:31 | UNTESTED PATH — P(high), I(high) | 2 | ⚠️ ESCALATED | |
| D2 | 2026-03-10 | TD-2-9 | Missing fail-open test | rateLimiter.ts:88 | SILENT FAILURE — P(medium), I(high) | 1 | Resolved | 2026-04-06 |
```

**Persistence protocol:** Use the Edit tool to update individual rows. Read the file → find the row by `#` → update Status, Times Deferred, and Resolved date → write back. If file doesn't exist, create it with the Write tool including the `<!-- gabe-review:1.3 -->` version header.

### Triage Persistence

When a finding is **fixed** during triage:
- If it existed in deferred backlog: mark `Status: Resolved` with today's date in the `Resolved` column
- Log which review resolved it

When a finding is **deferred** during triage:
- If new: add row with `Times Deferred: 1`, `Status: Deferred`
- If recurring: increment `Times Deferred`, apply escalation rules (existing logic)

When a finding is **dismissed** during triage:
- NOT written to deferred backlog (dismissals are session-only)
- Noted in the triage summary output but not persisted

### Escalation Rules

| Times Deferred | Status | Effect |
|---------------|--------|--------|
| 1 | Deferred | Shown in Risk Dashboard, no additional escalation multiplier on score |
| 2 | ⚠️ ESCALATED | Promoted to HIGH if was MEDIUM/LOW. Highlighted in findings. Confidence deduction uses ESCALATED multiplier. |
| 3+ | 🔴 BLOCKING | Treated as CRITICAL. Cannot approve until resolved or re-justified. |

**Re-justification:** When user explicitly provides NEW reasoning for why a deferral is acceptable (not just "defer again"), reset counter to 1 and append justification as a comment below the table row.

---

## Integration with Gabe Suite

| Situation | This tool suggests |
|-----------|-------------------|
| Finding has CRITICAL severity | Fix immediately, no deferral allowed |
| Finding has unclear blast radius | Run `/gabe-assess` on the finding before deciding |
| Multiple findings in same area | Run `/gabe-roast [perspective]` on that area |
| Alignment concern (wrong direction) | Run `/gabe-align shallow` to check values |
| Deferred item reaches 3+ deferrals | BLOCK. Suggest `/gabe-roast qa` for test coverage roast |
| KDBP checkpoint showed untested scenarios | Those scenarios become findings in gabe-review with severity HIGH |
| Review confidence < 50 | Suggest fixing CRITICAL+HIGH before proceeding. Show projection table. |
| Confidence jump ≥ 20 pts for a single tier | Highlight that tier as "best ROI" in the session estimate |
