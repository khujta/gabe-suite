# Gabe Push — full spec

> This file is the binding spec; the SKILL.md core is a summary. E1–E7 contract:
> see `../../gabe-docs/references/execution-contract.md`.

Env-aware shipping. One command pushes local work to the configured target env, or promotes what's already on a pre-prod env (e.g., `staging`) up to the next env (e.g., `main` / `production`). Config lives in `.kdbp/PUSH.md`. First run interviews for envs; subsequent runs honor the config until `/gabe-push --reconfigure`.

> **Rendering note.** Output templates in this spec wrapped in bare triple-backtick fences are spec-meta delimiters — render their contents as plain markdown at runtime. Tagged fences (```bash, ```json, ```diff) stay fenced. See `gabe-docs/SKILL.md` § "Runtime output rendering convention".

## Procedure

### Step 1: Validate prerequisites

1. Verify `gh` CLI: `gh --version 2>/dev/null`. If missing: "Install GitHub CLI: https://cli.github.com/" — stop.
2. Verify auth: `gh auth status 2>/dev/null`. If not authenticated: "Run `gh auth login` first" — stop.
3. Verify git repo with remote: `git remote -v`. If no remote: "No remote configured. Run `git remote add origin <url>` first" — stop.
4. Read `.kdbp/PUSH.md`. If it exists, skip to Step 2.5. If not, continue to Step 2.

### Non-interactive defaults

If no human answer is available for a prompt, take the table default and print `(defaulted: <choice>)`:

| Prompt | Safe default |
|--------|--------------|
| Step 2.7 remote-drift actions | ignore-once |
| Step 3.2 promote vs push-local | promote (ship what was tested) |
| Step 3.3 direct-push-to-target warning | abort |
| Step 3.4 uncommitted changes | abort |
| Step 6.5 CI failure actions | stop with status report — NEVER ignore |
| Step 7.5b candidate action | defer (already specified) |
| Step 10.5 branch cleanup | keep |

Safety rows never default to proceed.

### Step 2: First-run setup (creates `.kdbp/PUSH.md`)

Interactive. Does not rely on heuristic auto-suggestion. Asks the user explicitly.

1. Detect remote: `git remote -v`. Default to `origin`. If multiple remotes, ask user to pick.
2. Detect default branch: `gh repo view --json defaultBranchRef -q '.defaultBranchRef.name' 2>/dev/null`. Fallback to `main`.
3. Detect CI provider:
   - `.github/workflows/` exists → `github-actions`
   - None found → `none`
4. Detect PR template: check `.github/pull_request_template.md` or `.github/PULL_REQUEST_TEMPLATE/`.
5. **Ask deploy pattern.** Show this explicit menu — never auto-pick:

   ```
   How should pushes flow?
     [1] production-only      /gabe-push → main (no staging)
     [2] staging-then-prod    /gabe-push staging → staging, /gabe-push → main (promote from staging)
     [3] custom               define N environments by hand
   ```

6. Based on choice, scaffold environments:
   - `[1]`: one env `production` → target=`<default-branch>` (e.g., `main`), `promote_from` unset
   - `[2]`: two envs — `staging` → target=`staging`, `production` → target=`<default-branch>`, `promote_from`=`staging`. If `origin/staging` does not exist, offer: `[create]` branch from default / `[skip]` and create on first staging push
   - `[3]`: loop — ask env name + target branch + `promote_from` (or none) per env, until user says done
7. For each env, ask: `branch_cleanup: always | never | ask` (default: `ask`)
8. Known-branches inventory: `git branch -r --format='%(refname:short)'` → record the current remote-branch set in PUSH.md `known_branches` so Step 2.7 can detect drift.
9. Write `.kdbp/PUSH.md` using the template format (see `templates/PUSH.md`).
10. Show: "Push config saved to `.kdbp/PUSH.md`. Edit anytime to adjust or rerun `/gabe-push --reconfigure`."
11. Ask: "Push now? [Y/n]" — if yes, continue to Step 2.5.

**Reconfigure path.** `/gabe-push --reconfigure` clears `.kdbp/PUSH.md` after user confirmation and re-enters Step 2 from scratch. Existing `DEPLOYMENTS.md` history is preserved.

### Step 2.5: Env resolution from argument

Determines which env this invocation targets.

1. Parse `$ARGUMENTS`:
   - No positional arg → `env = default_env` from PUSH.md (fallback: `production`)
   - One positional arg → `env = <arg>` (e.g., `/gabe-push staging`)
   - `--reconfigure` flag → jump to Step 2 with confirmation
2. Look up env block in PUSH.md:
   - Found → bind `target_branch`, `promote_from`, `ci`, `branch_cleanup` from env config
   - Not found → prompt: "No config for env `<name>`. Add it now? [Y/n]"
     - `Y` → run abbreviated Step 2 flow for just this env (target branch, promote_from, branch_cleanup), append to PUSH.md, continue
     - `n` → abort
3. Print resolved env summary:
   ```
   ENV:         <name>
   TARGET:      origin/<target_branch>
   PROMOTE FROM: <promote_from>  (or "none")
   CI:          <ci>
   ```

### Step 2.7: Remote branch drift detection

Runs every invocation. Detects branches on the remote that were not present when PUSH.md was last written (or not mentioned in any env `target_branch` / `promote_from`).

1. `git fetch --prune origin`
2. Current remote set: `git branch -r --format='%(refname:short)' | grep -v HEAD`
3. Known set: union of
   - `known_branches` from PUSH.md
   - every env's `target_branch`
   - every env's `promote_from` (if set)
4. Extras = current - known. If empty: continue to Step 3.
5. For each extra branch, look up the `Decisions log` in PUSH.md (entries keyed by branch name):
   - If a prior decision exists → apply silently (e.g., `ignore`, `delete-local`, `register as env=<name>`)
   - Else → prompt:
     ```
     Remote branch detected not in config: origin/<name>
     Actions: [ignore-once] [ignore-always] [register-as-env] [delete-remote] [abort]
     ```
   - Persist the chosen action (except `ignore-once` / `abort`) to PUSH.md `Decisions log` table keyed by branch name. `register-as-env` runs abbreviated Step 2 env-add flow for this branch.
6. Apply decided actions. `ignore-once` moves on; `ignore-always` adds branch to `known_branches` so it never re-prompts; `delete-remote` runs `git push origin --delete <name>` after `[y/N]` confirm.

### Step 3: Determine push source + pre-flight

1. Get current branch: `current_branch = git branch --show-current`.
2. **Decide push source** — the ref that will land on `env.target_branch`:
   - If `env.promote_from` is set:
     - Fetch `origin/<promote_from>` state.
     - If `origin/<promote_from>` exists AND is ahead of `origin/<env.target_branch>`:
       - Offer explicit choice:
         ```
         Promotion available: origin/<promote_from> is ahead of origin/<env.target_branch>.
         [promote]     push origin/<promote_from> -> <env.target_branch>  (ship what was tested)
         [push-local]  push current HEAD (<current_branch>) -> <env.target_branch>  (override staging)
         [abort]
         ```
       - `[promote]`    → `push_source = origin/<promote_from>`, `source_label = <promote_from>`
       - `[push-local]` → `push_source = HEAD`, `source_label = <current_branch>`
     - Else (no `<promote_from>` on remote or not ahead) → `push_source = HEAD`
   - Else → `push_source = HEAD`
3. Guard: if `push_source = HEAD` AND `current_branch = env.target_branch` (direct push to the env branch):
   - Warn: "You are on [<target_branch>]. Push directly? This skips PR workflow. [y/N]"
4. Check uncommitted changes (applies only when `push_source = HEAD`): `git status --porcelain`.
   - If changes exist, show count and ask:
     - `[commit]` — run `/gabe-commit` first, then continue
     - `[push-only]` — push only what's already committed
     - `[abort]` — stop
   - If user picks `commit` and gabe-commit blocks (CRITICAL findings), stop the push.
5. Check unpushed commits (applies only when `push_source = HEAD`): `git rev-list @{u}..HEAD --count 2>/dev/null`.
   - If 0 and not a new local branch: "Nothing to push. All commits already on remote." — stop.
   - `push_source = origin/<promote_from>` skips this check (it's already on the remote by definition).

### Step 4: Push

1. Push logic depends on `push_source`:
   - `push_source = HEAD` AND `current_branch = env.target_branch` → `git push -u [remote] <env.target_branch>`
   - `push_source = HEAD` AND `current_branch ≠ env.target_branch` → `git push -u [remote] <current_branch>:<env.target_branch>`
   - `push_source = origin/<promote_from>` → promotion push: `git push [remote] origin/<promote_from>:<env.target_branch>` (fast-forward-only; remote-to-remote). If non-FF: stop with clear message and offer `[force-with-lease] [abort]`.
2. If push fails (rejected, auth error, non-FF): show error and stop.
3. Show: "Pushed <source_label> -> <env.target_branch> on [remote]."

### Step 5: Create or update PR

Skipped when `push_source = HEAD` AND `current_branch = env.target_branch` (direct push to env branch — no PR needed). Skipped when `push_source = origin/<promote_from>` if `env.target_branch` is the promotion target and direct remote-to-remote push was taken (PR was already the staging→testing cycle; promotion is the merge). In both skip cases, jump to Step 6.

1. Check for existing PR: `gh pr view <source_label> --json number,state,url 2>/dev/null`.
   - If PR exists and `OPEN`: show "PR already exists: [url]". Skip to Step 6.
2. Generate PR title: most recent commit subject, or branch name as title if multiple commits.
3. Generate PR body:
   - Commit summary: `git log origin/<env.target_branch>..HEAD --pretty=format:'- %s' --reverse` (cap at 50).
   - If PR template exists, read it and prepend the commit summary.
   - If no template:
     ```
     ## Changes
     
     [commit list]
     
     ## Context
     
     Branch: <source_label> -> <env.target_branch>  (env: <env_name>)
     Commits: [N]
     ```
4. Create PR: `gh pr create --base <env.target_branch> --head <source_label> --title "[title]" --body "[body]"`.
5. Show: "PR created: [url]"

### Step 6: CI Watch (non-blocking, 75s max)

1. If CI provider in PUSH.md is `none`: "No CI configured. Done." — skip to Step 7.5.
2. Poll `gh pr checks [branch]` up to 5 times, 15-second intervals.
3. Each poll, show status:
   ```
   CI: ⏳ build (running)  ✅ lint (pass)  ⏳ test (running)
   ```
4. All checks pass: before any pass/fail claim, paste the final raw `gh pr checks` output verbatim. `⏳` is not ✅ — on timeout report `CI: ⏳ still running` and Step 10 MUST NOT tick. Then "CI: All checks passed." — continue to Step 7.5.
5. Any check fails:
   ```
   CI: ✅ lint (pass)  ❌ test (fail)  ✅ build (pass)
   Failed: test
   ```
   Offer actions:
   - `[details]` — show `gh pr checks --fail-only` output
   - `[logs]` — show `gh run view [run-id] --log-failed` output
   - `[auto-fix]` — if failure name matches lint/format/type patterns: attempt local fix, commit, re-push
   - `[assess]` — suggest `/gabe-assess [failure context]` for complex failures
   - `[ignore]` — continue without fixing
6. Timeout (75s): "CI still running. Check later: `gh pr checks`."

**Long CI runs** can be babysat with `/loop` (e.g. `/loop 4m check CI on <branch> and report`) — use watch-and-report only; auto-fix loops are appropriate only where the phase has runtime-journey proof in place (PLAN.json `proof`).

### Step 6.7: Deploy verify

Runs when the target env deploys an artifact — deploy provider configured in PUSH.md, or the env is `production`. Otherwise skip.

1. Deploy status = SUCCESS at the NEW commit — paste the provider status line.
2. SMOKE: fetch the app root / health endpoint; assert non-blank, no fatal error. Record `DEPLOY-VERIFY: <url> → <observed title/first line>`.
3. Jobs with 0 tests or `continue-on-error` are NON-EVIDENCE. CI green + container healthy is never the final evidence — the live-target probe is.
4. If the pushed range adds a build-time env var: confirm it is declared in the build file (Dockerfile ARG / build config), not only the service dashboard.

### Step 7: Final summary

```
GABE PUSH COMPLETE
ENV:    <env_name>
SOURCE: <source_label>
TARGET: <env.target_branch>
PR:     [url or "—" if direct push]
CI:     [status or "—"]
```

Promotion to a further env happens only when the user runs `/gabe-push <next_env>` (or bare `/gabe-push` if a promotion is available per env config). This command never recurses across envs in one invocation.

### Step 7.5: Capture deployment event → `DEPLOYMENTS.md` (Phase 4/6 of doc-lifecycle work)

Only runs when Step 4 (push) completed successfully. Otherwise skip silently — nothing to record about a failed push.

**Preconditions:**

- `.kdbp/` exists (required for all of push anyway).
- If `.kdbp/DEPLOYMENTS.md` doesn't exist: copy it from `~/.claude/templates/gabe/DEPLOYMENTS.md` before appending. Never overwrite existing.
- **Terminal-env pointer (non-blocking, one line):** when this row's env is the TERMINAL env (no `promote_from` chain continues past it) AND the project has a command center (`docs/site/center/center.config.json`), print: `release: terminal-env ship → /gabe-feature release --since <previous terminal row>`. No center → print nothing. Never a gate, never a question.

**Assemble the row** (pure deterministic aggregation of data push already collected — zero LLM):

| Column | Source |
|--------|--------|
| `#` | Next `P[N]` — read DEPLOYMENTS.md, find max existing `P` ID, add 1 |
| `Date` | Current timestamp `YYYY-MM-DD HH:MM` (local time) |
| `Branch → Target` | Current branch (from Step 1) → PR base branch (from Step 5) |
| `PR` | PR number from Step 5 (format `#N`) or `—` if no PR (e.g., direct push to branch without PR) |
| `CI Result` | Code from Step 6 outcome (see table below) |
| `Notes` | Event summary (see table below) |
| `Decisions` | `—` (Phase 5 will populate this via Step 7.5b operational note action) |

**CI Result codes** (pick one, in order of precedence):

| Code | Condition |
|------|-----------|
| `✅ N/N (Ms)` | All checks passed in M seconds |
| `⚠ N/M (Ms)` | M-N warnings or soft-failing checks, no hard failures |
| `❌ X/M (Ms) — failed: <name>` | X hard failures; name from the first failing check |
| `⏳ timeout` | CI still running when 75s cap hit |
| `—` | CI provider is `none` in PUSH.md (no CI configured) |

**Notes codes** (concat with `; ` when multiple apply):

| Code | When to include |
|------|-----------------|
| `promoted [from] → [to]` | Step 7 promotion succeeded, include target chain |
| `promotion skipped` | Step 7 prompt returned `n` or no next target |
| `auto-fix applied: [lint\|format\|type]` | Step 6 auto-fix path fired; list fix categories |
| `CI re-run after fix` | Auto-fix path triggered a second push |
| `PR merged before push` | Pre-existing merged PR detected (rare) |
| `—` | None of the above |

**Append the row** using the Edit tool:

1. Read `.kdbp/DEPLOYMENTS.md`.
2. Find the last `| P[N] |` row (or the header's separator line if table is empty).
3. Append the new row on a new line directly after it.

If the Edit fails due to a concurrent writer (shouldn't happen — push is the sole writer — but defensive), re-read and retry once.

**Example rendering:**

```markdown
| P7 | 2026-04-17 14:22 | feature/add-auth → main | #42 | ✅ 3/3 (47s) | promoted main → prod | — |
| P8 | 2026-04-17 15:08 | fix/ci-typo → main | #43 | ❌ 1/3 (12s) — failed: lint | auto-fix applied: lint; CI re-run after fix | — |
```

**Sub-check 7.5b — Operational Decision Detection (Phase 5/6 of doc-lifecycle work):**

Only runs when Step 7.5a appended a row AND the BEHAVIOR.md frontmatter doesn't set `push_operational_classifier: never`. Otherwise skip silently.

**Pre-step — Re-surface deferred classifier candidates (runs BEFORE trigger layer):**

Read `.kdbp/PENDING.md`. For every row where `Source` column = `classifier` AND `Status` column = `open`:

1. Render each as an original proposal block using the same format as the Interactive triage output below. Use the `Finding` column as `title`. Rationale/alternatives/review_trigger are not re-stored in PENDING.md — if present from the original defer, pull from a `Notes` suffix; otherwise render the row as a minimal candidate (title only + "originally deferred YYYY-MM-DD") and skip alternatives.
2. User picks `[accept]` / `[note]` / `[defer]` / `[drop]` per row. Action handlers behave identically to current-run handlers. `accept`/`note`/`drop` set the PENDING row's `Status` to `resolved` with today's date. `defer` (explicit or drop-through) keeps `Status = open` and increments `Times Deferred`.
3. After all re-surfaced rows are resolved or dropped-through, continue to current-run trigger layer.

**Auto-resolve on current-run duplicate:** when the current-run classifier produces a `title` case-insensitively matching any re-surfaced open PENDING row, auto-resolve the PENDING row (`Status = resolved`, today's date, note `auto-resolved: superseded by current run`) and suppress the re-render. This prevents the same proposal from appearing twice in one run.

**Trigger layer** (zero-cost, all fire-independently; ≥1 hit → proceed to classifier):

| Trigger | Signal |
|---------|--------|
| CI-config modified | Diff for this push (use `git diff HEAD~N..HEAD` where N = commits being pushed) modifies any file under `.github/workflows/**`, `.gitlab-ci.yml`, `.circleci/**`, `azure-pipelines.yml` |
| Infra-as-code change | Diff modifies any file under `infra/**`, `terraform/**`, `pulumi/**`, `k8s/**`, `helm/**` |
| Deployment config | Diff modifies `docker-compose*.yml`, `Dockerfile*`, `fly.toml`, `railway.toml`, `render.yaml`, `vercel.json`, `netlify.toml` |
| Auto-fix config change | Step 6 auto-fix path fired AND it modified a config file (lint config, type config, CI workflow) |
| Rollback/revert | Any commit in the pushed range has a subject starting with `revert:` or `rollback:` |
| Trunk-first push | Push target is the repo's default branch AND PUSH.md promotion chain has `trunk-based: true` AND no prior PUSH row in the LEDGER.md thin index targets the default branch (rare — captures the "why direct to main" moment) |
| Promotion skipped when chain existed | Step 7 prompted to promote and user chose `n` (deliberate non-advance — worth capturing why) |

**Classifier layer** (LLM, cheap model, fires only when trigger hits AND no `operational`-tagged DECISIONS.md row covers this event):

- **Model:** Haiku-tier
- **Context:** trigger reason(s), commit subject(s) in pushed range, top 5 changed files in the triggered category, last 3 operational DECISIONS.md rows (dedup awareness)
- **Max tokens:** 200
- **Structured output** (`output_type` enforced — user value U4):
  ```
  OperationalDecisionCandidate:
    is_operational_decision: bool   # false → drop, no proposal
    title: str                      # one-line, <80 chars
    rationale: str                  # 2-3 sentences
    alternatives: list[str]         # 0-2 alternatives considered
    review_trigger: str             # when to revisit
  ```
- If `is_operational_decision == false`: drop silently.

**Interactive triage** (rendered as markdown, not code):

### Operational Decision Candidate

**Detected:** [trigger reason]

**Proposed DECISIONS.md entry** (tagged `operational`):

| Field | Value |
|-------|-------|
| Date | 2026-04-17 |
| Decision | [title] |
| Rationale | [rationale] |
| Alternatives | [alt 1] · [alt 2] |
| Status | active,operational |
| Review Trigger | [review_trigger] |

Actions:
- `[accept]` — append to `.kdbp/DECISIONS.md` as `D[next_id]` with `operational` tag
- `[note]` — write one-liner to today's `DEPLOYMENTS.md` Decisions column instead (lighter weight)
- `[defer]` — write to `.kdbp/PENDING.md` with `source=classifier` — re-surface next run
- `[drop]` — don't record (session-scoped dedup on title)

**Action handlers:**

| Action | Behavior |
|--------|----------|
| `accept` | Append to DECISIONS.md using same mechanism as review 5b. `Status` column = `active,operational`. Dedup: existing DECISIONS.md row with matching title case-insensitively → drop instead of append. Mark any open PENDING.md classifier row with matching title as `resolved` (today's date). |
| `note` | Find today's DEPLOYMENTS.md row (the one Step 7.5a just wrote, by `Date` and `PR` match). Update its `Decisions` column from `—` to a one-liner of `title`. Never appends a new row; updates the one already written. Mark any open PENDING.md classifier row with matching title as `resolved` (today's date). |
| `defer` | Append to PENDING.md: `\| P[N] \| today \| classifier \| [title] \| - \| [maturity] \| medium \| low \| 0 \| open \|`. Source column = `classifier`. Title stored verbatim in Finding for dedup on re-surface. If an open classifier row already exists with matching title (case-insensitive), increment `Times Deferred` on that row instead of creating a duplicate. |
| `drop` | No write. Session-scoped dedup on title. Also mark any open PENDING.md classifier row with matching title as `resolved` (today's date) to prevent re-surface loop. |

**Default-on-drop-through:** If the command completes without the user picking an action (common in non-interactive flow — agent continues before user can choose), treat as `defer`. The unresolved candidate is persisted to PENDING.md so it re-surfaces instead of vanishing. Session-scoped dedup still applies per-title to prevent double-persist within a single run.

**BEHAVIOR.md opt-out flag:**

Humans can disable the classifier entirely by adding `push_operational_classifier: never` to `.kdbp/BEHAVIOR.md` frontmatter. When present:

- Trigger layer still runs but no LLM call is made.
- No output rendered for 7.5b.
- Step 7.5a (DEPLOYMENTS.md capture) still runs normally — the opt-out is only for the classifier.

**Race handling with `/gabe-review` 5b:** both commands append to DECISIONS.md. Dedup is by case-insensitive title match. Edit-tool collisions retry with fresh read. `operational` tag in Status column lets downstream readers (notably `/gabe-teach` Loop L6) filter cleanly.

**Explicit non-goal:** this step NEVER touches `docs/architecture.md`, `docs/AGENTS_USE.md`, `docs/SCALING.md`, `docs/api.md`, `README.md`, `docs/wells/*.md`, or `STRUCTURE.md`. Push is operational-only. If deployment issues trigger code fixes, those flow through a separate `/gabe-commit` invocation that runs CHECK 7 normally.

### Step 8: Record to ledger

Append one row to `.kdbp/LEDGER.md` per the thin-index house format (`gabe-plan/references/plan-spec.md` § "Shared: LEDGER.md thin session index"):

```
| [YYYY-MM-DD] | PUSH | [env] ← [branch] @ [short sha] | [short sha] | push ✓ · CI [result/none] · promotion [state] |
```

- `[env]` — the resolved env name (e.g., `production`).
- `[branch]` — `source_label` from Step 3 (the branch or `promote_from` ref that was pushed).
- `[short sha]` — the sha now on `env.target_branch` after push (used in both the Theme/scope cell and the Commits column).
- `CI [result/none]` — `all passed` / `N failed` / `skipped` / `no CI`, from Step 6's outcome.
- `promotion [state]` — `promoted to X` / `skipped` / `N/A`.

The DEPLOYMENTS.md row (P[N], Step 7.5) carries the richer detail — PR, CI codes, notes, decisions; this LEDGER row is the thin pointer into it.

### Step 8.5: Auto-commit post-push bookkeeping (**zero user ceremony**)

Steps 2, 7.5, 7.5b, and 8 leave dirty files in the working tree — `.kdbp/PUSH.md` (if just created), `.kdbp/DEPLOYMENTS.md`, `.kdbp/LEDGER.md`, and possibly `.kdbp/DECISIONS.md` (on `accept` in 7.5b) or `.kdbp/PENDING.md` (on `defer`). Leaving them dirty forces the user to run another `/gabe-commit` cycle for audit writes the push itself produced. That is the wrong boundary — bookkeeping is owned by the command that wrote it.

This step commits those writes automatically and returns the working tree to a clean state. Does NOT push the bookkeeping commit — it stays local and is carried by the next real `/gabe-push` invocation (or the user's next push if they run one manually).

**Preconditions:** Step 4 (push) completed successfully. If push failed or was aborted, skip this step — the bookkeeping writes stay dirty and surface on the next run alongside a retry.

**Procedure:**

1. **Compute the bookkeeping file set.** Start empty, add only these paths if modified this run:
   - `.kdbp/PUSH.md` (when Step 2 created it)
   - `.kdbp/DEPLOYMENTS.md` (always, since Step 7.5 appended)
   - `.kdbp/LEDGER.md` (always, since Step 8 appended)
   - `.kdbp/DECISIONS.md` (only when Step 7.5b action was `accept`)
   - `.kdbp/PENDING.md` (only when Step 7.5b action was `defer` OR when re-surfaced PENDING rows were resolved)
   - `.kdbp/PLAN.md` + `.kdbp/PLAN.json` (when dirty from this cycle's auto-ticks — the tick helpers have no commit point of their own; leaving them out contradicts this step's clean-tree goal)

2. **Stage explicitly — path-scoped, never `git add -A`:**

   ```bash
   git add <each path in the set>
   ```

3. **Detect no-op.** Run `git diff --cached --quiet`. Exit code 0 → nothing to commit, skip to substep 8.5.6 (Report). Otherwise continue.

4. **Commit through the normal git hook chain** with a canonical message. No hook bypass — the user's policy disallows it, and the bookkeeping file set is path-scoped audit writes that every CHECK in the pre-commit suite will pass through cleanly:

   - CHECK 1-3 (lint / types / tests): target source files; `.md` bookkeeping paths are skipped.
   - CHECK 4-5 (coverage / shape): code-file-scoped per the earlier patch.
   - CHECK 6 (deferred): reads `PENDING.md` — bookkeeping writes to PENDING don't self-flag because the column match is on `File`, not the PENDING file itself.
   - CHECK 7 (doc drift): Layer 1 triggers only on `.env.example`, `pyproject.toml`, `docker-compose.yml`, or new route decorators — none match bookkeeping paths.
   - CHECK 8-9 (structure): only fires on new source files; bookkeeping files are known paths.

   So a normal `git commit` goes through cleanly without ceremony:

   ```bash
   git commit -m "chore(kdbp): record push bookkeeping for P[N]"
   ```

   Where `P[N]` is the deployment ID appended by Step 7.5. Commit body summarizes which files were written:

   ```
   chore(kdbp): record push bookkeeping for P7

   - DEPLOYMENTS.md: appended P7 row (main → main, direct)
   - lanes/<active>/LEDGER.md: PUSH row for [date]
   - PUSH.md: first-run config (trunk-based, github-actions)     # only if created
   - DECISIONS.md: D2 operational (trunk-based flow)              # only if 7.5b accept
   ```

   If any pre-commit hook blocks (rare; would indicate a real finding the user should know about), surface the hook output, leave the files staged, and report `Bookkeeping: ⚠ hook blocked — resolve and rerun /gabe-push` in the final dashboard. Do NOT retry with a hook bypass.

5. **Do NOT push the bookkeeping commit.** The user ran `/gabe-push` once; running a second push for audit rows is wasteful. The bookkeeping commit is local, arrives on origin during the next real push, and never blocks downstream work.

6. **Report.** Include a row in the final GABE PUSH COMPLETE output:

   - `Bookkeeping: ✅ committed locally (3 files, not pushed)` — when commit happened
   - `Bookkeeping: — no changes` — when substep 8.5.3 (detect-no-op) fired
   - `Bookkeeping: ⚠ skipped (cwd on lane branch; shared files deferred to main)` — when main-only rule dropped DECISIONS.md

**What this replaces:** the previous behavior left these files dirty and the user had to remember to run `/gabe-commit` again for audit bookkeeping. This step removes that requirement entirely. `/gabe-push` finishes with a clean working tree.

### Step 9: RETIRED — was: suggest /gabe-teach (skill archived 2026-07-15; permanent no-op)

(legacy — KNOWLEDGE.md is retired from the default KDBP inventory; this check no-ops when the file is absent)

If `.kdbp/KNOWLEDGE.md` exists, count rows with status `pending`:
- If pending count >= 2: show `ℹ [N] pending topics in KNOWLEDGE.md. Run /gabe-teach topics to review.`
- Otherwise: skip.

Non-blocking suggestion only. Push is already complete.

### Step 10: Auto-tick Push column in PLAN.md

Before ticking or skipping, print the decision record: `push ✓|✗ · CI ✓(n/n)|✗ · env=<name> ✓|✗ · promotion-final ✓|✗ → TICK | skip(<first failing row>)`. Ticking without this record is a defect. Only runs when ALL of the following are true:

1. Push succeeded (Step 4 reached without failure)
2. CI passed green (Step 6 ended with "All checks passed" — or CI provider is `none` and user confirmed)
3. The resolved env is the configured default/final environment (normally `production`). Non-default envs such as `staging` are integration gates and must not tick final `Push`.
4. Branch promotion reached the final link per PUSH.md, OR the PR was merged before running push

If any of those is false, skip this step. The Push column should only tick when the work is actually live on the target branch.

Follow the shared procedure documented in `/gabe-plan` under "Shared: auto-tick phase column":
- Target column: `Push`
- Preconditions: `.kdbp/PLAN.md` exists, contains `status: active`, has `## Current Phase`, and Phases table includes a `Push` column
- On mismatch or legacy Status-column format: exit silently
- On success, display: `✅ PLAN: Phase [N] push ticked` (one line)

If ticking Push completes all three columns (Review + Commit + Push = ✅) for the current phase, additionally display:

🎯 **Phase [N] complete** (all three gates passed). Run `/gabe-plan update` to advance to the next phase.

### Step 10.5: Branch cleanup prompt

Final human step. Offers to delete the source branch after a successful push.

Skip silently when:
- `push_source = origin/<promote_from>` (promotion push — nothing local to clean)
- `current_branch = env.target_branch` (direct push on the env branch; deleting it would brick the working tree)

Otherwise:

1. Read `env.branch_cleanup` from PUSH.md for the resolved env:
   - `never` → skip silently
   - `always` → delete without prompting (after confirming PR is merged or has no PR)
   - `ask` → prompt:
     ```
     Source branch <current_branch> is no longer needed on this env.
     [delete]      remove local + remote branch
     [keep]        leave it (continue working)
     [always]      remember "always delete" for env <env_name>
     [never]       remember "always keep" for env <env_name>
     ```
2. On `[always]` / `[never]`: update `env.branch_cleanup` in PUSH.md, then act per the new setting.
3. Deletion logic:
   - If there is an associated PR, check state: `gh pr view <current_branch> --json state,mergedAt -q '.state'`.
     - `OPEN` → warn: "PR still open. Delete anyway? [y/N]"
     - `MERGED` or `CLOSED` or no PR → proceed without warning
   - Switch off the branch first: `git checkout <env.target_branch>` (fallback to `default_branch` if the env's target branch isn't checked out locally)
   - `git branch -d <current_branch>` (safe delete) → on failure (`not fully merged`), offer `[force]` (`git branch -D`) or `[abort]`
   - `git push origin --delete <current_branch>` (remote)
   - Log one row to `.kdbp/LEDGER.md` using the same PUSH row template as Step 8 (Entry `PUSH`, Gates/results carrying the CI outcome) — appended; will sweep into the next bookkeeping commit on the next push.

### Output examples

All three render as plain markdown at runtime — the bare fences here are spec-meta delimiters only (see `gabe-docs/SKILL.md` § "Runtime output rendering convention").

**All succeeds (most common):**

**GABE PUSH:** `feature/add-auth` → `main`

| Step | Result |
|------|--------|
| Pre-flight | ✅ clean · ✅ ahead by 3 commits |
| Push | ✅ `origin/feature/add-auth` |
| PR | ✅ https://github.com/user/repo/pull/42 |
| CI | ✅ lint · ✅ test · ✅ build (47s) |
| Bookkeeping | ✅ committed locally (3 files, not pushed) |

**GABE PUSH COMPLETE**

**Uncommitted changes:**

**GABE PUSH:** `feature/add-auth` → `main`

- Pre-flight: ⚠ 2 uncommitted files
- Actions: `[commit]` run `/gabe-commit` first · `[push-only]` push what's committed · `[abort]` stop

**CI failure:**

**GABE PUSH:** `feature/add-auth` → `main`

| Step | Result |
|------|--------|
| Pre-flight | ✅ clean · ✅ ahead by 1 commit |
| Push | ✅ `origin/feature/add-auth` |
| PR | ✅ https://github.com/user/repo/pull/43 |
| CI | ✅ lint · ❌ test · ✅ build |

- Failed: test
- Actions: `[details]` · `[logs]` · `[auto-fix]` · `[assess]` · `[ignore]`

### Scope traceability (if SCOPE.md exists)

When writing a DEPLOYMENTS.md row for this push, enrich with scope linkage:

1. Read PLAN.md `## Current Phase` → extract phase ID N.
2. Read SCOPE.md `## Phases` phase N row → extract `Covers REQs`. (Pre-A2 projects that still carry a separate `.kdbp/ROADMAP.md` — or its archived copy under `.kdbp/archive/retired/` — read the same field there.)
3. DEPLOYMENTS.md row gets extra columns: `Phase: {N}` and `REQs: {REQ-01, REQ-02, ...}`.
4. If CI passes AND the current phase's Exit criteria were satisfied in this push, propose flipping Phase {N}'s status to `complete` in SCOPE.md `## Phases` — but route the write through `/gabe-scope-change` (never write SCOPE.md directly from gabe-push).

Prompt at end:

Phase `{N}` Covers REQs appear satisfied by this deployment. Mark phase complete?

- `[y]` Run `/gabe-scope-change "mark phase {N} complete"`
- `[n]` Leave the phase status alone (will surface again next push)

$ARGUMENTS
