# Gabe Review — full spec

> This file is the binding spec; the SKILL.md core is a summary.
> E1–E7: see `../../gabe-docs/references/execution-contract.md`.

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

## Repeat reviews — the realism ladder

A review angle exhausts in ONE pass: re-reviewing the same artifact from the same altitude
finds noise, not defects. When an artifact earns another round (high stakes, prior rounds kept
finding things), ESCALATE REALISM instead of repeating:

1. **Static read** — the artifact against its own spec.
2. **Cross-reference sweep** — every other doc/spec that states the same facts (drift class).
3. **Adversarial POV panel** — hostile inputs, literal-minded executor, fresh-machine user,
   3am operator; each persona attacks what the authors assumed.
4. **Rehearsal on a synthetic copy** — actually EXECUTE the plan/tool against a fixture that
   replicates the target's known pathologies.
5. **Dry-run on a copy of the REAL target** — the only rung that catches what the synthetic
   fixture didn't think to model (empirical: rung 5 found the largest defects of a five-round
   arc AFTER rungs 1–4 had all reported diminishing returns).

Rungs 4–5 also apply to fixes: a fix verified only by the finder's own fixture is one rung too
low — three consecutive rounds of that produced three regressions. Codify the fixtures
(`tests/`), then climb.

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
| **Inbox** | No target — produces the live `.kdbp/REVIEW.md` and stops (no triage). Used for handoff to a later session (the Resume prompt picks it up). Subject to the singleton collision prompt if a review is already active. |

If no target is provided, resolve via **Step 0.3: Target Resolution** (KDBP-first, git-diff fallback) below.

### 2. Maturity — What standard to apply

| Maturity | What it means | Default severity threshold |
|---|---|---|
| **MVP** | Prototype/early product — fix security and data loss, accept rough edges | Only CRITICAL blocks merge |
| **Enterprise** | Production with users — fix performance, error handling, monitoring | CRITICAL + HIGH block merge |
| **Scale** | Large-scale operations — fix optimization, edge cases, polish | CRITICAL + HIGH + MEDIUM block merge |

**How maturity is determined (in order):**
1. Explicit argument: `/gabe-review --maturity enterprise`
2. `mcp__gabe-kdbp__phase_context` → `behavior.maturity` (the parsed `.kdbp/BEHAVIOR.md` field). Read `.kdbp/BEHAVIOR.md` directly where the server is not registered, or where there is no active phase — phase_context returns early with only a warning when PLAN.json has no `current_phase` and PLAN.md has no phase table, and the `behavior` block is not built on that path.
3. Ask the user
4. Default: MVP (conservative — strictness goes up, not down)

Never auto-detect from test count or CI presence. Maturity is a human decision.

---

## Review Process

### Step 0.3: Target Resolution (no-arg only)

This step only fires when `/gabe-review` is invoked with no arguments — no explicit path, no folder, no mode keyword. Skip entirely if `$ARGUMENTS` resolves to any of: a file path, a folder path, `brief`, `fix`, `deferred`, `post-review`, `inbox`, `resume`, `close`, `discard`.

**Why this step exists.** The authoritative "what's pending review" signal in a Gabe project lives in `.kdbp/PLAN.md` (phase row with `Exec=✅ Review=⬜`) plus `.kdbp/LEDGER.md` (checkpoint rows whose Commits column resolves scope via git). A raw `git diff HEAD` misses the target when code is already committed (HEAD clean), includes unrelated WIP, or ignores the plan-declared scope. Step 0.3 consults the plan first, falls back to git-diff only when no KDBP context resolves.

**Procedure — ask `mcp__gabe-kdbp__review_target` first** (zero-LLM, deterministic; it IS this PLAN+LEDGER parse, header-resolved and closure-aware, so the parse is never re-authored here). It returns the pending row (`target.phase`, `target.name`, `target.cells`), the LEDGER `commits` it resolved, their union as `changed_files` (+ `changed_more` when the 40-file cap bit), a `base` ref, and the `source`/`banner` lines the print below quotes; `present: false` (no `.kdbp/`) routes to the Fallback (step 1). `target: null` means no row has Review ⬜ with Exec ∈ {✅, 🔄} — the tool filters an Exec ⬜ row out and returns one generic reason, so on `target: null` scan the Phases table once by hand for a Review ⬜ / Exec ⬜ row (step 3, second bullet) before printing the all-reviewed line; either no-match print exits 0, and the `fallback` / `changed_files` / `base: HEAD` the tool attaches to a null target are NOT taken — the Fallback runs only when step 1 fails. Step 1's `<!-- status: active -->` precondition stays a file check — the tool does not read plan status, so a completed or pivoted plan must still fall through to Fallback. Steps 2, 4 and 5 read the tool's answer; run them by hand where the server is not registered:

1. **Check KDBP presence.** If `.kdbp/PLAN.md` is missing, or lacks `<!-- status: active -->` → jump to "Fallback" below.
2. **Parse PLAN.md.** Find the `## Phases` table. Scan rows top-to-bottom for the first row where `Review` column = `⬜` AND `Exec` column ∈ {`✅`, `🔄`}. Record phase number N, phase name, Exec state, and phase `Types` cell when available.
3. **Handle no-match cases:**
   - No row satisfies the Review=⬜ condition (all reviewed) → print `ℹ No phase pending review. Pass an explicit target to review something else.` and exit 0.
   - Target row has `Exec=⬜` (Review pending but work not started) → print `⚠ Phase N Exec not complete — run /gabe-next to finish Exec before reviewing.` and exit 0.
   - Target row has `Exec=🔄` and phase types include any runtime-gated type (`mcp__gabe-kdbp__phase_context` → `plan_json.types`; the BEHAVIOR staging-proof rule is not in its `behavior` facts, so read `.kdbp/BEHAVIOR.md` for that half) (`user-facing`, `native-mobile`, `web`, `upload`, `realtime`, `streaming`, `file-media`, `auth`, `session`, `notifications`, `DB`) OR `.kdbp/BEHAVIOR.md` contains a runtime staging proof rule → print `⚠ Phase N staging proof still pending — run /gabe-next to finish /gabe-execute before reviewing.` and exit 0.
4. **Take the scope from `review_target`.** `commits` are the LEDGER shas it resolved for phase N (rows whose `Entry` or `Theme / scope` names Phase N), `changed_files` their union with deleted paths already dropped, `base` the earliest resolved commit's parent — the ref Step 3.4's drift subjects and Sub-check 5c measure against. The tool matches ONLY rows that name the phase: `COMMIT` rows dated since the phase's Exec start (their theme is the commit subject — gate-spec Step 6 — which rarely says `Phase N`) are still unioned in by hand, as before, whether or not the tool resolved rows. Prune anything no longer present under that path at HEAD; when `changed_more > 0` the answer hit the 40-file cap, so rebuild the full set from the `commits` list with the `git show --name-only <sha>` union below (`commits` is capped at 40 as well — past that, the shas come from the LEDGER rows) — never from `git diff --name-only <base>`, which is base-to-worktree and drags in unrelated later commits and WIP. When `source` reports that no LEDGER rows resolved for the phase, the dated `COMMIT` scan is the last source before the git-diff fallback.

   For each collected sha, run `git show --name-only <sha>` and union the resulting file lists across all shas, minus any file that was deleted or renamed away (no longer present under that path at HEAD).
5. **Resolve scope:**
   - If ≥1 file remains → target = that set. Print banner:
     `ℹ Reviewing Phase N ([name]) per PLAN.md — scope: <count> files from LEDGER`.
     Proceed with that scope as the review target.
   - If 0 files remain (no matching rows, matching rows carry no Commits shas, or every resolved file was deleted/renamed away) → print banner:
     `ℹ Phase N Review pending; no LEDGER scope resolved — falling back to git diff HEAD.`
     Target = `git diff HEAD`.

**Fallback.** No `.kdbp/` directory, or no active plan. Target = `git diff HEAD`. No banner — silent legacy default.

Once target is resolved, continue with Step 0.5 (LEDGER prior-CONCERN scan) and Step 1 (Deferred Backlog) using the resolved scope. REVIEW.md creation happens only after scope is known — the no-match exits above are prints + exit, not partial writes.

### Step 0.5: Load KDBP Context (if available)

`mcp__gabe-kdbp__kdbp_snapshot` returns the last 5 thin-index rows already parsed (`ledger.last`, header-resolved) beside the branch/dirty state and the open PENDING count, and says `no LEDGER.md` when there is none. For each of those rows whose `Commits` column resolves (via `git show --name-only <sha>`) to a file in the current diff:
- If the `Gates / results` column contains `CONCERN` → note it as prior signal
- If the `Gates / results` column contains a ❌ marker → pre-seed as expected finding

This means gabe-review knows what a recent checkpoint already flagged. Prior signals add a `FLAGGED (Nx)` annotation to the finding (where N = number of rows carrying that signal). If flagged 3+ times, bump severity by one tier (LOW→MEDIUM, MEDIUM→HIGH, HIGH→CRITICAL). Do not bump findings already at CRITICAL.

If no `.kdbp/LEDGER.md` exists, skip this step silently.

### Step 1: Load Deferred Backlog

Before reviewing new code, check for existing deferred items:

1. Ask `mcp__gabe-kdbp__kdbp_snapshot` first — its `pending` block names the file's own `columns`, the open/closed counts and the top 10 open rows, and its closure test is the house one (a Status verdict token OR a `<!-- P<n> resolved -->` comment on the line below the row), so a row closed by comment is never re-surfaced as open. Then read the backlog itself for the full set: `.kdbp/PENDING.md` (preferred), `.kdbp/deferred-cr.md`, or `.planning/deferred-cr.md`
2. If found, load every row the snapshot's closure test calls open — a Status that starts with none of `CLOSED / RESOLVED / WONT-DO / SUPERSEDED / DONE / FIXED` and no `<!-- P<n> … resolved -->` comment on the line below it (not merely `Status != Resolved`)
3. For each deferred item, check if the current diff addresses it:
   - **Match by file path** (exact match)
   - If file matches, compare Finding text with >50% word overlap
   - If file was renamed (detected via `git diff --find-renames`), match on Finding text alone with >70% overlap
4. If addressed: mark as `Resolved` in the file (use Edit tool to update the table row)
5. If NOT addressed and the diff touches the same function or within 20 lines of the finding's original location: increment `Times Deferred` and apply escalation rules. Changes elsewhere in the same file do NOT trigger escalation.

### Step 2: Review the Diff

Where the project has a command center, open with `mcp__gabe-map__blast_radius` on the resolved scope (pass it as `files` — the default is the worktree diff, which is not the review's target when the phase is already committed) — the entities, models, endpoints, tests and FE pieces those files reach, with a contained/local/cross-cutting reading. It is orientation and a FLOOR, never a scope: the diff is the scope, and absence in the answer is not proof of absence (E1). For each changed file, check these dimensions:

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

**Evidence contract:** every finding carries an `Evidence:` line with ≤2 exact quoted code lines from the cited `file:line`. A finding may only cite a file/hunk opened via Read or the diff THIS session. Empty Evidence line → the finding is DELETED before output. Absence claims ("no test covers X", "nothing handles Y") require a search proof in the Evidence line: `grep -rn <pattern> <scope>` → 0 hits.

**Tier drift detection:** When `.kdbp/PLAN.md` declares a phase Tier and the diff contains patterns above that tier, emit a `TIER_DRIFT` finding. See Step 4.75 Sub-check 5d for procedure and resolution options (downgrade vs amend-phase-tier).

**Rule-violation escalation (via `/gabe-health debt`):** If `.kdbp/RULES.md` exists (or `docs/rebuild/LESSONS.md` with R-rules is present), load the rule index before dimension scoring. For every finding, check if the affected file/line/pattern matches any rule's `Detection` signature. If yes, auto-elevate the finding's severity by one level (HIGH → CRITICAL, MEDIUM → HIGH) AND append a citation to the finding: `(violates R<n> from RULES.md — "<rule handle>")`. Load-bearing rules (tagged as such in the rule's `Status` field or explicit in source LESSONS) elevate straight to CRITICAL. Do not escalate if the user has already dismissed the match via `.kdbp/debt-ignore.md`.

**Architecture principle citations (advisory):** Load the AP catalog from the first available path: project-local `templates/architecture-principles.md`, `~/.claude/templates/gabe/architecture-principles.md`. For each review finding, attach AP IDs only when the finding's existing file/line/diff evidence directly touches a principle. AP citations explain the design force, but they do not create findings, change severity, or override the >80% confidence gate. Output format: `Architecture principles: AP8 explicit state, AP11 testability`.

### Step 3: Branch-Test Gap Detection

For each modified source file:

1. Check if it introduces new error handling (`try/catch`, `if (error)`, fallback logic, `.catch(`)
2. Ask `mcp__gabe-map__cases_for` first with the source file as `target` — `test_files_reaching` names the test files the committed map already has reaching it, and `census_note` states the floor (absence there is a missing census row, never proof of no test). Then check if a corresponding test was also modified in the diff. Look for:
   - `[filename].test.[ext]` or `[filename].spec.[ext]` (direct match)
   - Test files in `e2e/`, `__tests__/`, `tests/` that import or reference the modified source module
   - Any test file in the diff that exercises the new branch (check import statements)
3. If new branches exist without test coverage:

```
⚠️ TEST GAP: [file] adds [branch type] at L[line] — no test exercises this path.
        Defer Risk: UNTESTED PRODUCTION PATH — P(high), Impact(high)
```

Red-beat projects (PLAN phases carry `cases` records): emit the gap as a KNOWN subject with a
RESERVED id — `NEW CASE C[next] — <behavior> — no case asserts this` (allocate per gabe-red
`references/red-spec.md`: corpus `max(grep)+1` over the test roots — `mcp__gabe-map__cases_for`
hands back `corpus.next_cid_floor` from the same anchored pattern and prints the command it ran,
but that scan is `git grep` over TRACKED files only (no `--untracked`, unlike `who_calls`'s grep
arm), so a C-id sitting in a not-yet-committed test file is invisible to it; the floor is a FLOOR —
re-run the red-spec grep over the test roots (untracked included) before reserving, as the tool's
own `corpus.note` says. `max_cid_in_map` is the map's lagging copy and never mints an id. No
center, or an empty `corpus` block → the grep alone). A triage **fix** then lands as a real case under
the reserved id; a **defer** lands the id in PENDING so the promise has a reader.

### Step 3.2: Runtime Journey Evidence Gap Detection

When reviewing a KDBP phase, ask `mcp__gabe-kdbp__phase_context` (pass `phase` when the phase under review is not PLAN.json's `current_phase`) before pricing findings — its `plan_json` block carries the phase's `types`, `proof`, `proof_type` and `cells` from the mirror and `plan_md_row` the table states, which is steps 1–2 below in one read; inspect `.kdbp/PLAN.md` and `.kdbp/PLAN.json` by hand where the server is not registered. The pass criteria below still RUN: a `proof` string is a claim until `ls <path>` succeeds this session (E2):

1. Parse the target phase `types`.
2. If types include any of `{user-facing, native-mobile, mobile-web, web, upload, realtime, streaming, file-media, auth, session, notifications}`, require a non-null `.kdbp/PLAN.json` `phases[id==N].proof` entry naming the command and artifact path(s) for the changed journey (per `gabe-plan/references/plan-spec.md` Step 4b — the per-phase runtime-evidence field written by `/gabe-execute`).
3. Evidence must include:
   - Exact command(s) run.
   - Target runtime: physical device/emulator/simulator or browser.
   - Build id/version when native mobile or installed app behavior changed.
   - Artifact path(s): screenshots, report, video, logs, or trace.
   - At least one relevant edge-case artifact when the phase added error/recovery behavior.
4. If the phase has `Exec=✅` or is being reviewed with `Exec=🔄`, and `phases[id==N].proof` in PLAN.json is `null` or names only static/unit/API checks (no command + artifact path pair), emit a HIGH finding:

```
⚠️ RUNTIME EVIDENCE GAP: Phase N changes [type list] but PLAN.json lacks a proof entry for the phase.
   Defer Risk: BUILT BUT NOT PROVEN ON USER RUNTIME — P(high), Impact(high)
```

Do not accept "tests pass" as a substitute for this check. Unit tests can satisfy branch coverage; they cannot satisfy runtime journey evidence.

**Pass criteria (hard gate — ALL four or the HIGH finding stands):** (a) `proof` names an exact command; (b) `proof` names a target runtime (device/browser/viewport); (c) `proof` names a repo-relative artifact path; (d) `ls <path>` succeeds NOW — run it via Bash this session.
PASS: `proof: "npx playwright test scan.spec --project=mobile → chromium mobile-390 → e2e/proof/scan-mobile.png"` (ls → exists)
FAIL: `proof: ":<port> desktop+mobile proof"` — a claim with no artifact path.

**Fresh-context evaluation (visual/journey proof — the verifier is not the author).** When the proof entry is visual or journey-shaped (screenshots/video/side-by-side artifacts), do not grade the artifacts inline: dispatch ONE read-only evaluator agent (Explore — no Write/Edit) with exactly (a) the phase's acceptance criteria (Phase Details `Acceptance:` / Runtime Evidence Checkpoints line) and (b) the proof folder path. It returns `PASS` or `NEEDS_WORK: <artifact> — <what fails>`. Plausibility is not correctness — a reasonable diff plus a broken screenshot is NEEDS_WORK, and NEEDS_WORK converts to a HIGH finding priced like the evidence gap above. The executing session never grades its own screenshots. Convention: `../../gabe-docs/references/evidence-doctrine.md` §5.

### Step 3.4: Case-estate subjects & growth triage (red-beat / command-center projects)

Active only when PLAN phases carry `cases` records or the project has a command center with
absent-angle verdicts. **Zero new pricing machinery** — every subject below is priced with the
standard Fix Cost × Defer Risk × Maturity Gate fields and rides the normal Step 5 triage.

**One call opens the machine-derived subjects.** Ask `mcp__gabe-map__review_drift` with `base` = the
review's RESOLVED target from Step 0.3 (and `phase` when PLAN.json's `current_phase` is not the phase
under review) BEFORE working WORKFLOW DRIFT, REACH DRIFT, ENTITY DRIFT, ENTITY-SHAPE DRIFT,
WEB-BRIDGE DRIFT and FORM DRIFT: it runs all six in one read — each subject stamped, each carrying `ran: false` with
a `reason` when it could not run and `not_run` listing them, which is exactly the `<SUBJECT> NOT RUN`
line each shape below owes. It READS only: the map-delta emit stays this beat's own append, and every
price, cap and triage outcome stays judgment (D6). Each subject's procedure below remains binding — it
is what the shape MEANS, and it is the path on a project with no center, or where the server is not
registered.

**Deterministic opener — the red→green check.** When the phase under review carries a
red@-bearing `Cases:` record, run it before judging any subject:
`python3 ~/.claude/skills/gabe-red/scripts/case-thread.py --phase N --assert-green --run "<case-scoped cmd>"`
GREEN-PROVEN confirms the declared set turned green (the record should already carry execute's
`green@<sha>` stamp — if it doesn't, the stamp is owed and this run's output is the evidence to
demand it). NOT-GREEN is a **CRITICAL finding**: the phase's cases still fail after execution.
The structural backstop is `plan-proof-guard` — a Review ✅ on a red@-bearing record with no
reachable `green@<sha>` is BLOCKED at the PLAN write (D7), so this opener can be skipped only
into a hook block, never into silence.

- **NEW CASE C[next]** — Step 3's gap under a reserved id (above).
- **CASE BUMP C[n]→v[k+1]** — the diff changes what an existing case CLAIMS. Fix = bump the
  version in the test's name alongside the change (a re-run or mechanical edit never bumps).
- **CASE DRIFT** — a test edit that silently launders a claim (assertion weakened/removed while
  the id stays put). Judgment-shaped by design — this check lives HERE, deliberately not in a
  commit-gate grep (design record D6).
- **WORKFLOW DRIFT** — the diff moved the product away from what the entity's WORKFLOW CENSUS
  (`docs/site/center/workflows/<entity>.json`) says it is. Three machine-derived shapes
  (report-never-gate, D1). `mcp__gabe-map__review_drift`'s `workflow_census` subject runs the
  SUITE's own copy of `check_workflow_drift.py` against this project (never the repo's — WS-2)
  over every `docs/site/center/workflows/*.json` census (first 10) with `--center` and, where the
  project's `archmap.json` exists, `--archmap` — never `--junit`, so its answer carries
  **capture-debt**, **census-lag** and the spec-file half of **claim-drift**; the junit half (a
  step naming a C-id no report ran) is OFF there and the subject names it in its own `not_run`.
  Take that half from the hand form — `scripts/check_workflow_drift.py <census> --archmap
  docs/site/center/archmap.json --junit <each results_out glob>` (the globs are
  `mcp__gabe-kdbp__verify_commands`' `commands.results_out`, else BEHAVIOR.md's `## Verify
  Commands`) — or print `claim-drift(junit) NOT RUN — review_drift passes no --junit`. A
  tool-only answer is never a clean census. The three shapes:
  **census-lag** a writable field or surface this diff added that NO step covers · **claim-drift**
  a step naming a C-id that no junit report ran, or a spec file no longer in the repo ·
  **capture-debt** a step with no capture, or whose capture file left disk. Priced like any
  finding; the triage outcome is authoritative. **Detection lives HERE because only review sees
  the DIFF that caused the drift** — the session that added the field is the one that knows what
  it is for; a week later nobody does. What review can only DEFER (an owed capture needs a green
  e2e run plus curation) is carried afterwards by `/gabe-pulse`'s S8 evidence-debt angle, so a
  deferred capture keeps surfacing instead of ageing out. Fix routes to `/gabe-cc-update`
  (cover the step / re-point the spec) or `/gabe-red` (re-declare a case that stopped running);
  `capture-debt` legitimately defers — the run has to happen first. Skip silently when the entity
  has no census (nothing to drift from); NEVER report zero findings when a check could not run —
  the checker prints `census-lag NOT RUN` with its reason instead.
- **REACH DRIFT** — the diff and the phase's `Reach:` record (written by `/gabe-red`, cited by
  `/gabe-execute`) disagree. Two shapes (report-never-gate, D1): **unreached** a file this diff
  changed that no recorded reach named — either the graph missed an edge or the change grew past
  its cases · **unused reach** a recorded place the diff never touched — the reach was over-broad,
  or a case is owed there. `mcp__gabe-map__who_calls` recomputes a reach for any symbol on demand (a `grep-only@` stamp marks a reach taken
  without an index); `mcp__gabe-map__review_drift`'s `reach` subject computes the whole shape in one
  read — the record it parsed, its `graft_at` sha, `unreached` (changed source files no recorded reach
  named) and `unused_reach` — and returns `ran: false` with a reason when the phase carries no
  STAMPED record: `no Reach: record` when the block has no Reach line at all, `no graft index` when
  the line reads `no index` (red-spec § Recorded, never binding; `mcp__gabe-kdbp__phase_context`
  shows it as `records.reach = "no index"`). Either is the `REACH DRIFT NOT RUN` print below, with
  THAT reason — never the other. Compare against the record's
  `graft@<sha>` stamp: a diff that moved well past that sha explains drift by growth, not by a missing
  edge, and the finding says which.
  Priced like any finding; the triage outcome is authoritative. **Detection lives HERE for the
  same reason WORKFLOW DRIFT does** — only review sees the diff that caused it. Fix routes to
  `/gabe-red` (a case is owed at an unreached place) or to nothing at all (the graph is
  name-resolved and carries known collisions — one measured false edge linked a TypeScript
  `initAnalytics` to a Python `register`). Skip silently when the phase has no `Reach:` record or
  the project has no graft index; NEVER report zero findings when the check could not run — print
  `REACH DRIFT NOT RUN` with the reason. **`unreached` is the running measurement** of whether the
  graph's edges are complete, and it is the evidence the twin-propagation decision waits on.
  **Map-delta emit.** When `unreached` is attributed to a MISSING EDGE (the diff sits at/before the
  record's `graft@<sha>`, so growth cannot explain it), append the light delta cousin to the map↔grep
  loop — the priced finding above stays exactly as-is; the delta only accumulates for `/gabe-commit`'s
  generator sweep (non-blocking; nothing with no `.kdbp`):
  `python3 "${ECC_ROOT:-$HOME/.claude}/skills/gabe-commit/scripts/map-deltas.py" append --type add --gen _a3_graft.calls --cmd review --subject "reach(<phase>)" --found "<unreached file>" --pointer "<unreached file>"`.
  A WEB-BRIDGE DRIFT unmatched fetch emits the same way with `--gen _a3_web.bridge`, an ENTITY-SHAPE
  DRIFT orphan route with `--gen route_census` — one line each, the drift subject that fired names the arm.
- **ENTITY DRIFT** — the phase's declared `entities` (PLAN.json, written at plan time from the
  operator-confirmed Entities bullet — ruling 2026-08-07) and the entities the diff actually
  touched disagree. Ask `mcp__gabe-map__review_drift`'s `entity` subject first — one call returns the
  phase's declared list, its own `touched` (changed source files joined to the archmap's file owners)
  and both differences, or `ran: false` when PLAN.json declares no `entities`. It is a first look, not
  the arbiter. Touched = changed files matched against `center.config.json` `entities{}.code`
  globs by the SHARED resolver `skills/gabe-pulse/scripts/work_scope.py` (`touched_entities`) — the
  SAME one the board's in-flight view and the pulse S6 signal call, so this finding can never
  contradict what the board shows; path-derived or absent, never keyword-guessed, `*` does not
  cross `/`.
  Two shapes (report-never-gate, D1): **undeclared-touched** the diff changed entity X's code but
  the phase declared only Y — either the declaration was short or the work grew sideways ·
  **declared-untouched** a declared entity's code never appeared in the diff — the declaration
  was speculative, or its work is still owed. Priced like any finding; the triage outcome is
  authoritative, and the fix is a one-line edit to the phase's Entities bullet + mirror (E5),
  never a code change. Detection lives HERE for the same reason WORKFLOW/REACH DRIFT do — only
  review sees the diff. Skip silently when the phase has no `entities` key (never declared) or
  the project has no center config; a declared-`[]` phase (an explicit `none — <reason>`) IS
  checked — touching entity code under a none-declaration is exactly the drift worth naming.
  NEVER report zero findings when the check could not run — print `ENTITY DRIFT NOT RUN` with
  the reason. The board's in-flight view renders declared-vs-touched live (inflight.json); this
  subject is where the disagreement becomes a priced, triaged record.
- **ENTITY-SHAPE DRIFT** — the diff ADDS a route whose URL domain no *domain* entity owns, so a
  future trace of that workflow lands nowhere (or inside a cross-cutting aspect). Distinct from
  ENTITY DRIFT above: that one is plan-declared-vs-touched entities; THIS is the route's URL
  surface vs the entity MODEL. Machine-derived (report-never-gate, D1) by
  `mcp__gabe-map__review_drift`'s `entity_shape` subject — the same `entity_shape.py` module called
  in-process, returning the diff's new routes, their classification and the STANDING one-line shape
  (`mcp__gabe-map__entity_shape` with `diff=<base>` runs this subject alone; the hand form
  `python3 ~/.claude/skills/gabe-pulse/scripts/entity_shape.py . --diff <base>` still works) — where `<base>` is
  the review's RESOLVED target from Step 0.3 (a committed range like the LEDGER sha's parent, or
  `HEAD` for an uncommitted tree — `git add -N` a brand-new route file first so its `+` lines enter
  the diff). It reads the committed `archmap.json` for the current model (which domains a domain
  entity owns, which entities are cross-cutting aspects) and greps the diff's ADDED route
  decorators; a new route in an unowned domain is named with its candidate entity (from the
  optional `url_domain_map`, verbatim fallback). Prints `ENTITY-SHAPE DRIFT NOT RUN` with a reason
  when there is no archmap to check against — never a false clean. **Detection lives HERE, on the diff, because the route is NEW — the archmap has not
  regenerated to include it yet, so only review sees it fresh**; the STANDING orphan/aspect it may
  create is carried afterwards by `/gabe-pulse`'s S9 entity-shape angle (the same review-detects /
  pulse-nags split S8/WORKFLOW DRIFT use). Priced like any finding; the fix routes to
  `/gabe-cc-init` (add or reclassify an entity — a config decision, never a code change) or to
  nothing (the surface genuinely belongs to an existing aspect — then the aspect is truth, not
  drift). Skip silently when the project has no center config or the diff adds no routes; NEVER
  report zero when the check could not run — the script prints nothing only when it genuinely ran
  clean.
- **WEB-BRIDGE DRIFT** — the diff ADDS a frontend `apiFetch(path, {method})` whose `(method, path)`
  resolves to NO declared endpoint, so the web calls an API surface no entity owns (a missing/
  undeclared endpoint, a typo'd path, or model drift). The frontend twin of ENTITY-SHAPE DRIFT:
  that one is a new *route* landing in an unowned URL domain; THIS is a new *fetch* hitting no
  endpoint at all. Machine-derived (report-never-gate, D1) by
  `mcp__gabe-map__review_drift`'s `web_bridge` subject — the same `fetch_bridge.py` module called
  in-process, returning the diff's new fetches, their classification against the endpoint key-space,
  and the STANDING `unmatched` count the pulse S10 angle reads (the hand form
  `python3 ~/.claude/skills/gabe-pulse/scripts/fetch_bridge.py . --diff <base>` still works) — where `<base>` is the
  review's RESOLVED target from Step 0.3 (`git add -N` a brand-new web file first so its `+` lines
  enter the diff). It reads the committed `archmap.json` for the endpoint key-space (normalized: the
  `/api/vN` prefix stripped, `{x}`/`${x}` params collapsed — the bridge's own match contract) and
  greps the diff's ADDED `apiFetch` calls; a new fetch that matches no endpoint is named. Prints
  `WEB-BRIDGE DRIFT NOT RUN` with a reason when there is no archmap to check against — never a false
  clean. **Detection lives HERE, on the diff, because the fetch is NEW — the center has not
  regenerated the bridge to include it yet, so only review sees it fresh**; the STANDING unmatched
  fetch it may create is carried afterwards by `/gabe-pulse`'s S10 web-bridge angle (which reads the
  committed `c4-graph.json` `stats.web.unmatched`, the same review-detects / pulse-nags split S9 uses).
  Priced like any finding; the fix routes to `/gabe-cc-init` (adopt/declare the endpoint's entity — a
  model decision) or to nothing (a genuinely dynamic path the bridge cannot resolve — then it is a
  named limitation, not drift). Skip silently when the project has no center config; NEVER report zero
  when the check could not run.
- **FORM DRIFT** — the diff ADDS a `raise HTTPException(...)` whose refusal a client will handle badly: its detail is
  text only (no stable code to branch on), or its status is already carried by a DIFFERENT text-only refusal of an
  endpoint in the same file (the client must compare strings — the setup endpoint's two 409s), or the endpoint does not
  declare that status (the generated clients never learn it exists). Machine-derived (report-never-gate, D1) by
  `mcp__gabe-map__review_drift`'s `form` subject — `form_drift.py` called in-process against the committed `forms.json`
  (hand form: `python3 ~/.claude/skills/gabe-pulse/scripts/form_drift.py . --diff <base>`); a multi-line raise is joined
  until its parentheses close, and it compares (status, detail), never line numbers. Prints `FORM DRIFT NOT RUN` with
  the reason when the project has no `forms.json` (an older map, or `forms: false`) — never a false clean. **Detection
  lives HERE because the refusal is new**; the STANDING findings (shared status · lost reason · escape to 500 · swallowed)
  are carried afterwards by `/gabe-pulse`'s S20 element-forms angle, the same review-detects / pulse-nags split S9 and
  S10 use. Priced like any finding — a text-only refusal on a codebase that never codes one is a LOW convention finding,
  a second text-only refusal on an existing status is MEDIUM (a client is now guessing); the fix is a stable reason
  code, a declared response, or a translation that keeps the service's reason. No map-delta emit: a new refusal is not
  a map miss. Skip silently when the project has no center config; NEVER report zero when the check could not run.
- **GROWTH: <feature>/<angle>** — an absent-angle GROWTH OPPORTUNITY from the center enters
  triage priced like any finding: its "what adding tests would buy" IS Defer Risk; its "at what
  cost" IS Fix Cost. **Cap: at most 7 GROWTH findings per review** (highest Defer Risk first;
  print `growth: showing 7 of N` when capped). The TRIAGE OUTCOME is authoritative — the center
  RENDERS the angle's verdict from it (fix → the case lands under a reserved id · defer → the
  PENDING row the feature page cites · dismiss → SETTLED with the stated reason). `/gabe-cc-update`
  never re-authors this judgment; its hand-authored verdict remains only the fallback for angles
  no review has priced.

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
| **File** | a clickable workspace-relative link `[file:line](file#Lnn)` — findings contract, below |
| **Evidence** | ≤2 exact quoted code lines from the cited `file:line`, opened via Read or the diff this session; search proof (`grep -rn <pattern> <scope>` → 0 hits) for absence claims |
| **Churn** | 🔴 HOT / ⚠️ WARM / ✅ STABLE (from Step 3.5) |
| **Fix Cost** | T-shirt estimate: S (<30m), M (1-3h), L (3-8h), XL (>1d) |
| **Defer Risk** | `[CONSEQUENCE] — P([probability]), Impact([severity])` |
| **Maturity Gate** | MVP / Enterprise / Scale — when this finding becomes relevant |
| **Escalation** | Empty for new findings, `⚠️ RECURRING (Nth time)` for deferred items |

This table obeys the **findings contract** (`../../gabe-docs/references/execution-contract.md` §"The findings contract"): the **File** cell — and every path named in Plan Alignment, STALE ANCHOR, WORKFLOW/REACH DRIFT, and PENDING/case subjects — renders as a clickable workspace-relative link; the Fix-Cost / Defer-Risk / Triage columns already force the remediation step.

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

### Step 4.4: Verify pass (mandatory — after drafting ALL findings, before rendering)

For EACH draft answer three kill questions:
```
K1 Does the cited evidence actually say this? (re-open the file/quote)
K2 Is the failure concrete? (name the triggering input/state)
K3 Does an existing test/guard already cover it?
```
Stamp: CONFIRMED | DOWNGRADED(<reason>) → <CRITICAL|HIGH|MEDIUM|LOW> | KILLED(K#). "Plausible but unverified" = KILLED. UNVERIFIED can never be CRITICAL or HIGH.

A downgrade NAMES its target, and the target is one of the four scored severities, strictly lower than the draft's — there is no INFO, NOTE or NIT tier (the confidence score's deduction table has no row for one, so an unscored finding silently leaves the arithmetic). **A LOW cannot be downgraded: it is CONFIRMED or KILLED.** A verifier dispatched as a subagent returns `new_severity` from exactly that enum (`"enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"]` in its schema); any other value is a verifier defect — re-ask, never remap by hand.

The summary header MUST print: `raw N → killed X → downgraded Y → survived Z`.

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

**Deduction worksheet (mandatory — the score may only be computed from this table):**

| # | Sev | Base | ×churn | ×esc | Deduction |
|---|-----|------|--------|------|-----------|
| 1 | CRITICAL | −20 | 1.5 | 1.5 | −45 |
| Σ deductions | | | | | −NN |
| Coverage modifier | | | | | −N |
| **Score = 100 − Σ − modifier** | | | | | **NN** |

Projections remove worksheet row sums for matching findings — never re-derived in prose. The post-triage recalculation (Step 5 Triage Summary) reuses the same worksheet with fixed rows removed and dismissed rows at 50%.

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

1. Ask `mcp__gabe-kdbp__phase_context` first, passing `phase:` = the phase Step 0.3 resolved (`review_target.target.phase`, or the explicit target) — unset, the tool takes PLAN.json's `current_phase` or the FIRST table row, never PLAN.md's `## Current Phase`, so on a stale or absent mirror this sub-check would grade the diff against the wrong phase. `phase` + `plan_json.name` are the phase and its name, `plan_json.scope` the declared file list and `details_excerpt` the Phase Details section (first 2,000 chars — read the section itself when it runs longer), which is steps 1 and 3 in one read; the Phases table's `Description` cell is not in the mirror's projection, so step 2 stays a PLAN.md read. Where the server is not registered, read `.kdbp/PLAN.md`. Extract `## Current Phase` section → phase number N + phase name.
2. Extract phase row N from `## Phases` table → `Description` column.
3. Extract `## Scope` section if present → explicit file list.
4. Build **expected change set** from:
   - Files named in Scope (exact paths)
   - Files matching globs mentioned in Description (keyword extraction — folder names, file suffixes, component names)
5. Compare against `git diff --name-only HEAD`:
   - FIRST exclude `.kdbp/**` paths from the changed set — those are command-owned state
     writes (PLAN ticks, LEDGER/DEPLOYMENTS entries) that ride every properly-run phase
     checkpoint; counting them as drift would flag every correct checkpoint as MISALIGNED.
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

#### Sub-check 5c — Stale Verified Anchor Detection

Purpose: "Are open PENDING rows now stale because the files they cite changed after their `Verified` anchor?"

Skip silently if `.kdbp/PENDING.md` doesn't exist OR no open row carries a sha anchor in its `Verified` cell.

Subject: open rows of `.kdbp/PENDING.md` whose `Verified` cell carries a sha anchor — the canonical written form is `@<sha> <date>` (defined once at § Deferred Item Persistence), and the bare `<sha> <date>` form is accepted on READ (gustify has filed 86 such cells since P1; a check that refuses the established convention is inert on the only project carrying the column) — AND whose `File` cell names at least one path. Prose-only and empty cells are out of scope here: they are unverified by definition, and gabe-commit CHECK 6 owns that warn.

Procedure (deterministic, no LLM):

1. Read `.kdbp/PENDING.md`. Collect rows with `Status: open`.
2. For each open row:
   - Extract the `Verified` cell → if it contains a commit hash (7-40 hex chars, `@`-prefixed or bare), keep the sha; else skip the row.
   - Extract the `File` cell → strip backticks → split on `,` → keep path tokens, strip any `:line` suffix (same parse as gabe-commit CHECK 6; non-path prose matches nothing).
   - For each cited file:
     - Run `git log --follow -1 --format=%H -- <file>` → get most recent commit on this file.
     - If that commit is LATER than the row's anchor (via `git merge-base --is-ancestor anchor_sha file_latest`, and the two differ) → mark the row as **stale candidate**.
     - If `merge-base` exits 128, the anchor sha is unreachable from this history (a squashed branch, a rebase) → mark the row **anchor unresolvable** and list it in the same block with that label — an unresolvable anchor is itself a staleness signal, never a silent skip.
3. If stale candidates found, render output block:

```
### Stale Anchor Candidates

Open deferred rows whose cited files changed after their Verified anchor:

  P135 — storybook nav counter drifts on batch close (verified c89d4ee7 2026-07-21)
         Changed since anchor: web/src/features/pantry/usePantryMutations.ts
  P140 — locale bundle misses the batch strings (verified 04ee3120 2026-07-23)
         Changed since anchor: web/src/locale/es.json

(Real pattern: executed against gustify @ 81f02608, the relaxed-form algorithm
flags five genuine candidates — #135 #136 #137 #140 #141. The brief's own
exemplars #170/#150 are prose-only AND resolved, so no anchor check can flag
them; anchored evidence prevents the NEXT #170, it cannot retroactively find
the last one.)

A stale candidate is not a verdict — the change may be unrelated. Re-derive the
claim before acting on the row; acting on a summary alone is the failure mode
this check exists to surface.
```

Report-never-gate: no write, no status flip, no verdict impact. Candidates re-surface every `/gabe-review` until the row is re-verified (fresh `@<sha> <date>` in `Verified`) or closed. What this check cannot catch: a WRONG citation filed fresh — current sha, wrong line — see the gap statement at § Deferred Item Persistence.

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
| `defer` | Compose the row with `mcp__gabe-kdbp__pending_row_preview` (`flag.source` = `classifier`, `flag.description` = the title verbatim so re-surface dedup still matches, `flag.file` = `-`, `flag.scale` = `small`, `flag.severity` = `medium` — the preview maps `severity` to the Priority cell — `flag.impact` = `low`) — it returns the row in the FILE's own column order with the next P-id — then set the three cells the preview fixes differently before pasting (kdbp-spec §4.6): `Status` → `open` (the preview leaves it blank, and the re-surface pre-step above and push 7.5b select on `Status = open`, so a blank row would vanish), `Times Deferred` → `0` (the preview stamps `1`; the classifier ladder starts at 0 and re-surface `defer` increments it), `Verified` → `-` (it stamps `@<sha> <date>`; a candidate title with no File cell has nothing to re-derive). The row still reads `\| P[N] \| today \| classifier \| [title] \| - \| small \| medium \| low \| 0 \| open \| - \|`. Paste it with Edit, never through a tool, so the D7 hooks see the write; where the server is not registered, compose that row by hand against the file's existing header (writing rule 1). Source column = `classifier`. Title stored verbatim in Finding for dedup on re-surface. If an open classifier row already exists with matching title (case-insensitive), increment `Times Deferred` on that row instead of creating a duplicate. |
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

1. Ask `mcp__gabe-kdbp__phase_context` with `phase:` = the phase under review (unset, it resolves PLAN.json's `current_phase` or the FIRST table row — never PLAN.md's `## Current Phase` — so a stale or absent mirror prices the diff against another phase's tier) for `plan_json.tier` (the Tier cell) and `plan_json.types` (the Types list), then read `.kdbp/PLAN.md` for what the mirror does not carry — the `dim_overrides` YAML block:
   - Current Phase N → Tier cell: parse `phase_tier` = leading token (strip `(overrides...)` compact notation)
   - `## Phase Details → Phase N` YAML block → `dim_overrides` list (each entry `{section, dim, tier, reason}`); empty/missing = no overrides
   - `## Phase Details → Phase N → Types:` list
2. Load section files (from `~/.claude/templates/gabe/tier-sections/`):
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
| `amend-tier` | Prompt: "Why promote Phase N from [current] to [new]? (one sentence)". Update PLAN.md Tier cell, and mirror the same tier into `.kdbp/PLAN.json` `phases[id==N].tier` (per the `gabe-plan` auto-tick mirror step). Append `### Tier escalation` block to the phase's DECISIONS.md D-entry. Log one LEDGER row: `\| [YYYY-MM-DD] \| REVIEW \| tier escalation Phase [N] [old]→[new] \| — \| via review \|`. Finding resolved (removed from current run). |
| `accept-drift` | Adds a `drift-accepted` note to the phase's DECISIONS.md D-entry with date + pattern. Finding resolved for this run. Re-surfaces next run if the pattern pops up elsewhere (prevents silent permanent drift). |
| `defer` | Compose the row with `mcp__gabe-kdbp__pending_row_preview` (`flag.source` = `gabe-review`, `flag.description` = `TIER_DRIFT: [section.dim] at [file]`, `flag.file` = the match location, `flag.scale` = the phase tier, `flag.severity` = `medium`, `flag.impact` = `moderate`) and paste it with Edit — the preview writes nothing, and it emits the row in the file's own column order rather than the canonical 11 assumed here; where the server is not registered, compose the row by hand against the file's existing header (writing rule 1). Source = `gabe-review`. |

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

Persistence rule: this block is output-only. Do not write it to `.kdbp/REVIEW.md`, `.kdbp/PLAN.md`, `.kdbp/LEDGER.md`, `.kdbp/PENDING.md`, commits, or docs. It is a command-time understanding aid; the command-time briefs are the surviving explanation surface (`/gabe-teach` is archived — `skills/_archive/`).

### Step 5: Triage

After the verdict and session estimate, present the triage prompt for normal triage-producing modes (default/no-arg, explicit targets, `post-review`, and `resume`). This closes the gap between "here's what's wrong" and "let's fix it." Skip this menu for `brief`, `inbox`, `deferred`, `close`, and `discard`; `fix` bypasses the menu and applies the "Everything" route.

**REVIEW.md is the triage workspace.** Before the first bulk/per-finding prompt, reconcile with `.kdbp/REVIEW.md` — see "Live Review Document" for the full flow (no existing file / collision with a prior run). After reconcile, either a fresh or consolidated REVIEW.md exists on disk. As each finding is acted on during triage, mutate its `Status` column in place (`pending` → `fixed | deferred | dismissed`) so an interrupted triage is safely resumable by the next `/gabe-review` call.

#### Entry Point — Shared Next-Action Menu

Replaces the old binary "Enter triage? [Y/n]" with a severity x maturity matrix plus a shared next-action menu. Every option is explicit about **both** the fix set and the remainder behavior, so the user is never surprised by what happened to findings they didn't explicitly address.

If the runtime cannot render an interactive picker, print the menu as plain text at the end of the review and wait for the user's selection. Do not end a normal `/gabe-review` with only findings and a summary.

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
| **f — Fix now** | Apply the fix immediately. For code changes: edit the file, show the diff. For test gaps: write the test. For doc issues: update the doc. After fix, re-validate and mark resolved. |
| **d — Defer** | Ask for optional justification. Compose the row with `mcp__gabe-kdbp__pending_row_preview` (`flag`: description, file, severity, `source` = `gabe-review`) — it returns the next P-id, the file's own column order and the `@<sha> <date>` Verified anchor, and its `recurring_candidates` answers "or increment if recurring" — then write it with Edit to `.kdbp/PENDING.md` (or `deferred-cr.md` if PENDING.md doesn't exist), never through a tool, so the D7 hooks see the write; where the server is not registered, compose the row by hand against the file's existing header. Move to next finding. |
| **x — Dismiss** | Ask for one-line reason. Record dismissal in the review output (not in deferred backlog). Move to next finding. Dismissals don't persist across reviews — they're session-only decisions. |
| **s — Skip** | Leave in the findings table without deciding. At end of triage, un-skipped items get a final "defer or dismiss?" prompt. |
| **a — Fix all** | Apply fixes for all remaining findings in sequence without per-finding prompts. Show a summary diff at the end. Useful when the user trusts the fixes and wants to batch them. |
| **e — Explain** | If the `gabe-lens` skill is available, invoke it to generate an analogy for the finding + expose trade-offs. Otherwise emit the 4-section analogy inline. Returns to this same prompt after explaining — doesn't advance. See "Explain behavior" below. |

#### Explain Behavior (`e`)

When the user picks `e`:

1. **Delegate to `gabe-lens` when available.** If the `gabe-lens` skill is installed and invokable (Skill tool), pass the finding details (severity, file:line, description, defer risk, maturity gate) as context and let it produce the analogy. If `gabe-lens` is not available, generate the same 4 sections inline using the finding context — output is indistinguishable either way.
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
| User exits mid-triage (Ctrl+C, context limit) | Persist already-deferred items AND auto-defer every un-triaged finding to PENDING.md (same default-on-drop-through rule as 5b, 5d, and push 7.5b). Findings are never left in session output only. |
| Fix introduces a new issue | Don't re-review during triage. The fix-then-review loop is for the next `/gabe-review` run. |
| Finding references a file not in the workspace | Can't auto-fix. Offer defer/dismiss only. |
| Skipped CRITICAL at end of triage | Force-defer to PENDING.md at 🔴 BLOCKING status; Final Verdict stays BLOCK. Never auto-classify as Dismissed — a skipped CRITICAL cannot reduce its own score weight. |

### Step 6: Archive REVIEW.md + auto-tick PLAN.md + LEDGER trace

After triage completes (Final Verdict produced), archive the live review document, tick the Review column of the current phase if the review passed, and **always** append a LEDGER row so every run leaves an audit trail — regardless of verdict or tick outcome.

**Archive the live REVIEW.md (auto, no prompt).** If `.kdbp/REVIEW.md` exists and every finding has a non-pending `Status`:
1. Flip frontmatter `status: active` → `status: resolved`.
2. Move the file to `.kdbp/reviews-archive/REVIEW_<YYYY-MM-DD-HHMMSS>_resolved.md` (the `<timestamp>` is the REVIEW.md frontmatter timestamp for traceability; if missing, use now).
3. Ensure `.kdbp/reviews-archive/` is in the project `.gitignore` — grep-before-append pattern; a new line `.kdbp/reviews-archive/` is added once and only once.
4. On `discard` (user explicit cancel) or `stale` / `superseded` (from the collision prompt), same move happens with the appropriate `<status>` suffix in the filename. `discard` SKIPS the subsequent PLAN tick and LEDGER row entirely. `stale` / `superseded` proceed to the LEDGER row below with a `· disposition: stale` or `· disposition: superseded` suffix on the Gates/results cell.

**Pass condition for Review column:**
- Final Verdict is APPROVE or WARNING (not BLOCK)
- No unresolved CRITICAL findings (deferred = OK; deferred CRITICAL cannot exist per guardrail)
- No unresolved HIGH findings ABOVE the maturity gate (deferred = OK)
- **Step 4.75 Sub-check 5a did NOT return `MISALIGNED`** (added Phase 2/6 of doc-lifecycle work — a MISALIGNED diff shouldn't auto-advance the phase just because code review passed). `ALIGNED`, `DRIFTED`, and `SKIP` all satisfy this condition. If MISALIGNED, silently skip the tick and log `ℹ PLAN: phase tick skipped (diff MISALIGNED with current phase scope)` to the output.

Follow the shared procedure documented in `/gabe-plan` under "Shared: auto-tick phase column" — including its step 4b, which mirrors the tick into `.kdbp/PLAN.json` (`phases[id==N].cells.review`) in the same turn:
- Target column: `Review`
- Preconditions: `.kdbp/PLAN.md` exists, contains `status: active`, has `## Current Phase`, and Phases table includes a `Review` column
- On mismatch or legacy Status-column format: exit silently
- On success, display: `✅ PLAN: Phase [N] review ticked` (one line at the end of output)

**The review record (evidence the tick leaves — design ruling 2026-08-04, option B).** In the
same turn as the tick, write the phase's review record into BOTH mirrors (E5):
- PLAN.md Phase Details: `- **Review:** <VERDICT>@<short-sha> findings:<n> triaged:<n>`
  (VERDICT = APPROVE | WARNING; sha = HEAD at review time; findings = total findings this run;
  triaged = findings that received a triage outcome — fix/defer/dismiss)
- PLAN.json `phases[id==N].review` = the same string (real parser, never sed; the mirror
  regeneration parses the exact `- **Review:**` bullet — anywhere else is invisible to it).
`plan-proof-guard` validates the record on every PLAN write: a Review ✅ whose record is
malformed, cites an unreachable sha, or shows `triaged < findings` BLOCKS (an existing-but-false
record is a lie); a Review ✅ with NO record WARNS (legacy debt — plans ticked before this
record existed). The record is the tick's evidence; the findings themselves stay judgment (D6)
and live in the archived REVIEW.md.

If the pass condition is not met (BLOCK verdict or unresolved issues above gate), do NOT tick — but do not emit a warning either. The user knows they blocked.

**LEDGER row — always append** (runs whether tick fires or skips; runs whether PLAN.md exists or not; SKIPPED on `discard`):

1. Preconditions: `.kdbp/LEDGER.md` exists. If missing, skip silently (non-KDBP repo or pre-init state).
2. Compute `tick_outcome`:
   - `✅` if Review column was ticked by the block above
   - `skipped(BLOCK)` if Final Verdict is BLOCK
   - `skipped(unresolved-HIGH)` if HIGH finding above maturity gate remains un-deferred
   - `skipped(MISALIGNED)` if Sub-check 5a returned MISALIGNED
   - `skipped(no-plan)` if `.kdbp/PLAN.md` missing or legacy
   - `skipped(phase-not-found)` if Current Phase row not found
3. Compose the row with `mcp__gabe-kdbp__ledger_row_preview` (`entry: REVIEW`, `theme: Phase [N] — [verdict]`, `commits: —`, `gates:` the cell below verbatim — it is copied, never composed) and append it to `.kdbp/LEDGER.md` with Write/Edit, never through a tool, so the D7 hooks see the write. The preview emits the row in the FILE's own header order and falls back to the thin-index house format (`gabe-plan/references/plan-spec.md` § "Shared: LEDGER.md thin session index") only when it finds no header:
   ```
   | [YYYY-MM-DD] | REVIEW | Phase [N] — [verdict] | — | raw [R]→survived [S] · confidence [C]/100 · tick [tick_outcome] |
   ```
   - `[N]` — phase number, or "ad-hoc" if no active plan.
   - `[verdict]` — `APPROVE` \| `WARNING` \| `BLOCK`.
   - `[R]` / `[S]` — the raw/survived counts from Step 4.4's `raw N → killed X → downgraded Y → survived Z` summary.
   - `[C]` — the Review Confidence Score.
   - `[tick_outcome]` — from step 2 above, rendered `✅` or `skipped(<code>)`.
   - On `stale` / `superseded` disposition (see archive step 4 above), append `· disposition: stale` or `· disposition: superseded` to the Gates/results cell.
4. This LEDGER row is the single audit artifact for `/gabe-review` runs. Do NOT duplicate into another file (session files, etc.). `/gabe-next` and humans read LEDGER to answer "did review run? what did it say? why didn't it tick?". Deeper detail (coverage, alignment, tier drift, deferred item IDs) lives in the review transcript and `.kdbp/PENDING.md`, not in the thin row.

Rationale: the silent-no-op-on-tick-failure behavior leaves no record when a review runs but doesn't advance phase state (e.g., MISALIGNED skip or BLOCK verdict). Without the LEDGER row, `/gabe-next` cannot distinguish "review never ran" from "review ran and blocked" — both present as Review=⬜. The row makes the state machine auditable.

---

## Output Format

### Full Mode (default)

```markdown
## Gabe Review — Review Summary

**Maturity:** [MVP|Enterprise|Scale] | **Files:** N changed | **Deferred backlog:** N items

### Findings

| # | Severity | Finding | File | Evidence | Churn | Fix Cost | Defer Risk | Gate | Escalation |
|---|----------|---------|------|----------|-------|----------|------------|------|------------|
| 1 | CRITICAL | [description] | file:line | `[≤2 quoted lines]` | 🔴 HOT | S | [consequence] — P(x), I(y) | MVP | |
| 2 | HIGH | [description] | file:line | `[≤2 quoted lines]` | ✅ | M | [consequence] — P(x), I(y) | MVP | ⚠️ RECURRING (2nd) |
| ... | | | | | | | | |

### Risk Dashboard (All Pending)

Items from this review + unresolved deferred backlog, ordered by risk:

| # | Source | Age | Finding | File | Defer Risk | Escalation |
|---|--------|-----|---------|------|------------|------------|
| D1 | [review name] | N days | [description] | file | [risk] | [status] |
| ... | | | | | | |

### Coverage Confidence

Before producing the verdict, assess coverage confidence. `mcp__gabe-map__cases_for` on each changed source file names the test files the map already has reaching it — the floor that separates "this area has no tests at all" from "tests exist and this diff didn't touch them"; absence there is a missing census row, never proof of no test, so `grep -rn` stays the absence proof (E1):

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

**Singleton discipline.** Gabe Suite follows "one thing at a time" — one active PLAN, one active SCOPE, one active REVIEW. The review document is `.kdbp/REVIEW.md`. It is ephemeral working memory during triage, and it is archived to `.kdbp/reviews-archive/` (gitignored) once resolved. It carries the findings of the active review pass.

**Lifecycle.**

1. **Analyze.** Every gabe-review run performs its full analysis first (Steps 0.5–4.75) without reading any existing `.kdbp/REVIEW.md`. The analysis is **blind to prior passes** by design — independence of perspective is the point.
2. **Reconcile.** After analysis completes, the skill checks for an existing `.kdbp/REVIEW.md`:
   - **None exists** → write fresh REVIEW.md (single-source), proceed.
   - **Exists** → collision prompt (resume/stale/replace/cancel).
3. **Live.** The active CLI's triage loop reads the consolidated (or fresh) file, mutates per-finding `Status` as the user picks `(f)ix`, `(d)efer`, `(x)ismiss`, or `(s)kip`. The file is the single source of truth during the session; if the CLI is interrupted, it's safely resumable.
4. **Resolve.** When every finding has a non-pending status AND the triage loop exits cleanly, flip `status: active` → `status: resolved` and move the file to `.kdbp/reviews-archive/REVIEW_<YYYY-MM-DD-HHMMSS>_resolved.md`. Then run Step 6 (auto-tick + LEDGER write).
5. **Discard / stale / supersede.** User can explicitly `discard` (no LEDGER write), or the collision prompt may archive as `stale` or `superseded` — filename suffix reflects the reason.

**Collision handling.** When an active `.kdbp/REVIEW.md` already exists:

```
Existing active review from the same agent (source: same CLI, <N> findings, created <timestamp>).

  (r) Resume triage on existing review
  (a) Archive as stale, start fresh review
  (x) Replace (archive current as superseded, start fresh)
  (c) Cancel
```

Matches PLAN.md's pattern. No silent overwrites. No file locks.

### Post-Review Mode (`/gabe-review post-review`)

`post-review` arg → read `post-review.md` now.

---

## Deferred Item Persistence

Written to `.kdbp/PENDING.md` (preferred), `.kdbp/deferred-cr.md`, or `.planning/deferred-cr.md` (first found, or create `.kdbp/PENDING.md`).

File format (canonical 11-column schema — shared with gabe-commit CHECK 6/Step 6.4, gabe-push 7.5b, and gabe-assess's checkpoint handoff (absorbed from gabe-align)):
```markdown
| # | Date | Source | Finding | File | Scale | Priority | Impact | Times Deferred | Status | Verified |
|---|------|--------|---------|------|-------|----------|--------|----------------|--------|----------|
| P26 | 2026-06-20 | gabe-review | Missing fail-open test | web/src/lib/rateLimiter.ts:88 | mvp | high | high | 1 | open | @81f0260 2026-06-20 |
```

**The `Verified` cell — two classes, defined here once.** `@<sha> <date>` is the ONLY re-derivable form: a machine can ask "has the cited file changed since that sha?" (Sub-check 5c asks exactly that). Anything else — prose ("yes — I checked"), a bare date — renders the row unverified; `-` is the honest form of unverified, claiming nothing. A missing anchor is a debt, not a lie: gabe-commit CHECK 6 warns on new prose-only rows and never blocks. Existing project files need no migration — extra columns already parse (rule 1), rows predating the column simply read as unverified, and new rows pick the convention up from CHECK 6's warn. What no staleness check catches: a WRONG citation filed fresh — right file opened, wrong line cited, sha current. The anchor proves the file hasn't moved, not that the author read it correctly; the only defence is re-deriving a row at the moment work is scoped from it, which is not built. The gap is named here so the anchor is not oversold.

Writing rules: (1) ALWAYS match the existing file's header if it differs — never rewrite headers, never renumber rows; (2) all writers target `.kdbp/PENDING.md` first-found; `deferred-cr.md` / `.planning/deferred-cr.md` are legacy read-fallbacks only; (3) this schema is canonical for gabe-review, gabe-commit CHECK 6/Step 6.4, gabe-push 7.5b, and gabe-assess's checkpoint handoff (absorbed from gabe-align) — an edit here is an edit for all four, and two more sites restate the header verbatim and move with it: gabe-init's PENDING.md scaffold and gabe-plan step 6c. Map legacy columns when reading old rows: First Seen→Date, Review→Source, Defer Risk→drop into Finding text.

**Persistence protocol:** A NEW row is composed by `mcp__gabe-kdbp__pending_row_preview` — the file's own column order, the next P-id, the `@<sha> <date>` anchor — and pasted with Edit; the preview writes nothing, and the write stays on the harness so the D7 hooks see it. To update an EXISTING row: use the Edit tool. Read the file → find the row by `#` → update Status and Times Deferred → write back. If file doesn't exist, create it with the Write tool using the canonical header above.

### Triage Persistence

When a finding is **fixed** during triage:
- If it existed in deferred backlog: mark `Status: Resolved` with today's date in the `Resolved` column
- Log which review resolved it

When a finding is **deferred** during triage:
- If new: take the row from `mcp__gabe-kdbp__pending_row_preview` — it stamps `Times Deferred: 1` and `Verified: @<HEAD sha> <today>` for exactly this reason: the finding was just derived against this tree, so a review-filed row is born re-derivable — and fill the `Status` cell `Deferred` yourself; the preview leaves it empty
- If recurring: increment `Times Deferred`, apply escalation rules (existing logic)
- Case-estate findings (Step 3.4) keep their reserved `C[n]` in the row — the id is the join the
  center's testing pages and the pre-checkpoint hook read

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
| Finding has unclear blast radius | Ask `mcp__gabe-map__blast_radius` with the finding's file as `files` (entities, functions, models, endpoints, tests, FE pieces reached — a FLOOR), then run `/gabe-assess` on what it names |
| Multiple findings in same area | Run `/gabe-roast [perspective]` on that area |
| Alignment concern (wrong direction) | Run `/gabe-assess brief` to check values |
| Deferred item reaches 3+ deferrals | BLOCK. Suggest `/gabe-roast qa` for test coverage roast |
| KDBP checkpoint showed untested scenarios | Those scenarios become findings in gabe-review with severity HIGH |
| Review confidence < 50 | Suggest fixing CRITICAL+HIGH before proceeding. Show projection table. |
| Confidence jump ≥ 20 pts for a single tier | Highlight that tier as "best ROI" in the session estimate |
