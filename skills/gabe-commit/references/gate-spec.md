# Gabe Commit — full spec

> This file is the binding spec; the SKILL.md core is a summary. E1–E7 contract:
> see `../../gabe-docs/references/execution-contract.md`.

Deterministic commit quality gate. Runs checks, shows findings, lets you act on each one. Most actions cost zero tokens — LLM involvement is explicit and opt-in.

> **Rendering note.** Output templates in this spec wrapped in bare triple-backtick fences (without a language tag) are **spec-meta delimiters**, not runtime code blocks. Render their contents as plain markdown at runtime — markdown tables render as tables, not as monospace code. Tagged fences (```bash, ```json, etc.) and ```mermaid fences ARE runtime code blocks, keep them fenced. See `gabe-docs/SKILL.md` § "Runtime output rendering convention" for the decision rule.

## Gabe-Lens Output Rule

The normal commit flow prints `**Gabe-Lens brief**`, the commit-shaped member of the shared output-only Gabe-Lens explanation family. It is never written to `.kdbp/PLAN.md`, `.kdbp/REVIEW.md`, `.kdbp/LEDGER.md`, `.kdbp/PENDING.md`, or docs, and it is only included in a commit body when the commit-message generator already owns that body. This is a command-time understanding aid; `/gabe-teach` remains the durable knowledge consolidation path.

## Procedure

### Step 0: Subcommand dispatch

Parse `$ARGUMENTS`:

- If `$ARGUMENTS` starts with `docs-audit` → jump to **Step A: Docs-Audit Mode** (at end of this file). Skip Steps 1-6.
- Otherwise → treat `$ARGUMENTS` as commit message, proceed to Step 1 (normal commit flow).

The `docs-audit` subcommand is explicit only — NOT automatically chained. It's for retroactive catch-up on accumulated drift that per-diff CHECK 7 missed. Read-only git operations; any file changes it proposes remain unstaged for the human to `/gabe-commit` normally.

### Step 1: Validate context

1. Check that there are staged changes or unstaged changes to commit
2. If no commit message in `$ARGUMENTS`, generate one following the **Commit message body structure** section below
3. Read `.kdbp/BEHAVIOR.md` for `maturity` field (defaults to `mvp` if missing)

### Step 1b: Surface active plan (context only, no check)

If `.kdbp/PLAN.md` exists and contains `status: active`:
- Read the `## Current Phase` section
- Display as info line in Step 4 output: `ℹ PLAN: [goal] — Phase [N]: [name]`
- This is informational context, not a blocking check. Zero cost.

### Step 2: Run deterministic checks

Run these scripts. No LLM. No token cost. Target: 2-10 seconds total.

Alongside CHECK 1-9, run the three skill-local scripts (each exit 2 = WARN finding, never a block): `scripts/size-budget.sh` (>800-line budget), `scripts/evidence-freshness.sh` (Evidence Doctrine §4 — a proof-carrying phase must have proof_root artifacts at least as new as the staged source; WARNs append to `.kdbp/archive/evidence-bypass.log`), and `scripts/docs-budget.sh` (documentation diet — new md outside allowed homes / dated-name md). Convention text: `../../gabe-docs/references/evidence-doctrine.md`.

A check may be marked ✅ ONLY if its command executed via the Bash tool this session. Before the CHECKS summary line, print one evidence row per check:

<check>: `<cmd>` → exit <code>, "<copied count>"

Every printed number is copy-pasted from this run's output — never composed. Status glyphs are 3-state: ✅ / ❌ / ⤫ skipped(<reason>) — rendering a skip as ✅ is a defect.

**Step 2.0 — Resolve commands (never guess).** Bind lint/types/tests in order:

- (a) `## Verify Commands` section of `.kdbp/BEHAVIOR.md`
- (b) package.json scripts / pyproject / Makefile / CI job definitions
- (c) the per-language fallbacks below, only if (a)-(b) yield nothing

A checker that cannot fail (exit-0 no-op, 0 tests collected, continue-on-error) is NON-EVIDENCE → report `⤫ skipped(non-evidence: <reason>)`. When resolved via (b), offer to write the binding into BEHAVIOR.md `## Verify Commands` so it is never re-derived.

**CHECK 1 — Lint · CHECK 2 — Types · CHECK 3 — Tests** — fallback commands, used only via Step 2.0 (c):

| Check | Python fallback | TypeScript fallback | Skip when |
|-------|-----------------|---------------------|-----------|
| 1 Lint | `ruff check app/ --output-format=json` | `bunx biome check src/ --reporter=json` | tool not found |
| 2 Types | `mypy app/ --no-error-summary` | `tsc --noEmit` or `bunx tsc --noEmit` | tool not found |
| 3 Tests | `pytest tests/ -x --tb=line -q` | `bun test` | no test directory found |

**CHECK 4 — Coverage** (enterprise + scale maturity only)
- On changed source files only, threshold 80%
- Skip at mvp maturity

**CHECK 5 — Shape** (active only when >30 source files AND >2000 lines total)
- **Code files only.** Extensions: `.py .ts .tsx .js .jsx .mjs .cjs .go .rs .java .kt .kts .rb .cpp .cc .cxx .c .h .hpp .swift .php .cs .scala .dart .lua .pl .pm .ex .exs .clj .sh .bash .zsh .fish .sql`. Skip docs/config/data: `.md .mdx .txt .rst .adoc .json .yaml .yml .toml .ini .xml .html .css .scss .csv .tsv .lock`.
- File sizes: >400 (low), >600 (medium), >800 (high)
- New files <20 lines (low)
- Skip below activation threshold

**CHECK 6 — Deferred**
- Read `.kdbp/PENDING.md` (fallback: `.kdbp/deferred-cr.md`)
- Match: take each open row's File cell → strip backticks → split on `,` → glob each token against `git diff --staged --name-only`. Non-path prose cells match nothing.
- ALWAYS print, even when empty: `DEFERRED SCAN: <N> open checked, <M> matched, <K> at Times Deferred ≥3` — an absent line means the check didn't run.

**CHECK 7 — Doc Drift** (requires `.kdbp/` directory)

Three layers, all deterministic:

**Layer 1 — Universal safe cards** (always active when `.kdbp/` exists, no config needed):
- `.env.example` OR `config.py` changed AND `README.md` NOT in diff → flag README.md (`low`)
- `pyproject.toml` OR `package.json` dependency section changed AND `README.md` NOT in diff → flag README.md (`low`)
- `docker-compose.yml` changed AND `README.md` NOT in diff → flag README.md (`low`)
- New `@app.get` / `@app.post` / `@router` decorator added AND no file in `docs/` in diff → flag docs/ (`medium`)

**Layer 2 — DOCS.md pattern matching** (active only when `.kdbp/DOCS.md` exists):
- Read `.kdbp/DOCS.md` mapping table
- For each changed file in `git diff --staged --name-only`:
  - Match against Source Pattern column (glob match)
  - If pattern matches AND Doc Target is NOT `skip`:
    - Check if Doc Target file appears in the staged diff
    - If Doc Target NOT in diff → create finding at pattern's Priority
- Deduplicate: one finding per unique Doc Target (use highest priority among matches)

**Layer 3 — Gravity-well docs drift** (legacy — KNOWLEDGE.md is retired from the default KDBP inventory; these checks no-op when it is absent) (active only when `.kdbp/KNOWLEDGE.md` has a Gravity Wells table with at least one row whose Docs column is non-empty):
- Read wells table from `.kdbp/KNOWLEDGE.md`
- For each changed file in `git diff --staged --name-only`:
  - For each well row where `Paths` is non-empty AND `Docs` is non-empty:
    - Parse comma-separated Paths globs
    - If any glob matches the changed file:
      - Check if the well's Docs path appears in the staged diff
      - If Docs NOT in diff → create finding `low` with text: `Well [G_N] [Name] touched ([matched path]), [Docs path] not updated`
- Deduplicate: one finding per unique Docs target (keep highest-severity match, but Layer 3 is always `low`)
- Severity is deterministically `low` (decision 4b — won't block MVP commits; docs lag is the norm during active development)
- Skip this layer entirely when:
  - No wells have both Paths AND Docs populated (nothing to check against)
  - Diff is ONLY the Docs files themselves (don't flag a doc update as missing doc update)

**Layer 4 — Mockup INDEX freshness** (active only when `BEHAVIOR.md` `project_type` is `mockup` or `hybrid`):

- Read `project_type` from `.kdbp/BEHAVIOR.md` frontmatter. If absent or `code` → skip this layer entirely.
- Scope: any staged file matching `docs/mockups/**` or `docs/designs/**`.
- Check: is `docs/mockups/INDEX.md` in the staged diff?
- If mockup/design files changed AND `INDEX.md` NOT in diff → finding `low`, text: `docs/mockups/** edited but INDEX.md not touched. Update §3 Screens / §4 CRUD / §5 Component usage / §6 Coverage as appropriate.`
- Skip this layer when:
  - Staged diff is ONLY tokens.css / tweaks.js / tweaks-panel.html (shared infra edits — INDEX.md doesn't need bump)
  - Staged diff is ONLY within `docs/mockups/explorations/` or `docs/mockups/archive/` (scratch / archive space)
  - Staged diff IS `INDEX.md` itself (can't flag the same file)
- Severity deterministically `low` (non-blocking during exploration; Scale tier promotes to `medium`).

**CHECK 8 — Structure** (requires `.kdbp/STRUCTURE.md`)

Deterministic path-pattern check for new files. Zero LLM cost. Skipped if `.kdbp/STRUCTURE.md` missing.

1. Get new files only: `git diff --staged --name-only --diff-filter=A`
2. Read `.kdbp/STRUCTURE.md`, parse:
   - Allowed Patterns table — each row has a glob pattern + maturity tier
   - Disallowed Patterns table — each row has a glob pattern + reason
3. For each new file path:
   - If it matches a Disallowed pattern → finding `critical`, text `Disallowed location: [pattern] — [reason]`
   - If it matches an Allowed pattern at or below current maturity (from BEHAVIOR.md) → pass, no finding
   - If it matches NO pattern → finding `medium`, text `No structural pattern matches [path]. Intended location?`

Tier rules:
- maturity mvp → only MVP-tagged patterns are active (E and S count as "no match")
- maturity enterprise → MVP + E patterns active
- maturity scale → all patterns active

Action set for Structure findings:
- `move` — suggest 3 nearest-match allowed patterns by edit distance, user picks one, apply `git mv`, re-stage
- `update-structure` — add the path (or a generalized glob) as a new allowed pattern in STRUCTURE.md with a chosen tier; re-run CHECK 8 to confirm
- `accept` — commit with warning, append one row to STRUCTURE.md Exceptions Log
- `defer` — add to PENDING.md as source=`gabe-commit`, priority=medium

### Step 3: Assign severity

Deterministic thresholds, not LLM judgment:

| Check | Pass | Severity |
|-------|------|----------|
| Lint errors | 0 errors | `critical` (errors) / `low` (warnings only) |
| Type errors | 0 errors | `high` |
| Test failures | All pass | `critical` |
| Coverage <80% on changed file | >=80% | `medium` (50-79%) / `high` (<50%) |
| File >800 lines (code only) | <=800 | `high` |
| File >600 lines (code only) | <=600 | `medium` |
| File >400 lines (code only) | <=400 | `low` |
| New file <20 lines (code only) | >=20 | `low` |
| Open deferred on changed file | None | item's priority |
| Doc drift (universal safe card) | Doc target in diff | `low` (config/deps/docker) / `medium` (new routes) |
| Doc drift (DOCS.md critical) | Doc target in diff | `critical` |
| Doc drift (DOCS.md high) | Doc target in diff | `high` |
| Doc drift (DOCS.md medium) | Doc target in diff | `medium` |
| Doc drift (DOCS.md low) | Doc target in diff | `low` |
| Doc drift (Layer 3 wells Docs) | Well's Docs file in diff | `low` (always) |
| Structure (disallowed pattern) | N/A (always fail) | `critical` |
| Structure (no pattern match) | Match at/below current maturity | `medium` |

### Step 4: Present results

**Render these output shapes as plain markdown at runtime — do not wrap in a triple-backtick fence.** Markdown tables, status lines, and interactive prompts all render inline so the user can read severity columns and action tokens.

**If ALL PASS** (most common case):

> **GABE COMMIT: feat: update triage prompt**
>
> lint: `ruff check app/ --output-format=json` → exit 0, "0 errors"
> types: `mypy app/ --no-error-summary` → exit 0, "Success: no issues found"
> tests: `pytest tests/ -x --tb=line -q` → exit 0, "84 passed"
>
> CHECKS: ✅ lint  ✅ types  ✅ tests (84/84)  ⤫ coverage (mvp)  ⤫ shape (below threshold)  ✅ docs
>
> No findings. Committing...
>
> `[main abc1234] feat: update triage prompt`
>
> **Gabe-Lens brief**
>
> This commit tightens the triage prompt so the next review has clearer rails. Think of it like adding labels to a control panel: the switches were already there, but now the operator can see what each one does before acting.

Stage all changes, commit, print the Gabe-Lens brief, done.

**If findings exist but no CRITICAL:**

> **GABE COMMIT: feat: add classification pipeline stage**
>
> CHECKS: ✅ lint  ✅ types  ✅ tests (84/84)  ⚠ coverage  ⚠ shape  ⚠ docs

| # | Sev    | Finding                              | Actions                              |
|---|--------|--------------------------------------|--------------------------------------|
| 1 | medium | Coverage: classify.py at 62% (<80%)  | `[write-test]` `[accept]` `[defer]`  |
| 2 | low    | New file: route.py (23 lines)        | `[merge:classify.py]` `[keep]` `[defer]` |
| 3 | low    | D2 open on agent.py (you changed it) | `[resolve-now]` `[skip]` `[defer]`   |
| 4 | medium | Docs: README.md may need update (config.py changed) | `[update-docs]` `[accept]` `[defer]` |

Actions prompt (prose): `Actions? (e.g., "1:defer 2:keep 3:skip") or "all:commit" to defer all:`

**If CRITICAL findings:**

> **GABE COMMIT: ❌ BLOCKED — 1 critical finding**
>
> CHECKS: ✅ lint  ❌ tests  ✅ types  ✅ docs

| # | Sev      | Finding                              | Actions                         |
|---|----------|--------------------------------------|---------------------------------|
| 1 | critical | test_triage.py::test_classify FAILED | `[fix]` `[skip-to-pending]`     |

`Fix critical findings before committing.`

### Step 5: Execute actions

| Finding Type | Action | What Happens | LLM? | Cost |
|-------------|--------|-------------|-------|------|
| **Lint error** | `auto-fix` | Runs `ruff --fix` / `biome --fix` | No | 0 |
| | `accept` | Commit with warning | No | 0 |
| **Type error** | `fix` | Shows error, suggests fix | Yes | tokens |
| | `suppress` | Adds `# type: ignore` | No | 0 |
| | `defer` | Adds to PENDING.md as HIGH | No | 0 |
| **Test failure** | `fix` | Shows output, helps debug | Yes | tokens |
| | `skip-to-pending` | Adds to PENDING.md as CRITICAL | No | 0 |
| **Coverage gap** | `write-test` | Generates test for uncovered code | Yes | tokens |
| | `accept` | Won't re-flag this file at this level | No | 0 |
| | `defer` | Adds to PENDING.md at detected severity | No | 0 |
| **File too large** | `extract` | Identifies + extracts concerns | Yes | tokens |
| | `accept` | Won't flag until next threshold | No | 0 |
| | `defer` | Adds to PENDING.md | No | 0 |
| **Small new file** | `merge:file` | Merges into suggested file | Yes | tokens |
| | `keep` | File stays separate | No | 0 |
| | `defer` | Adds to PENDING.md | No | 0 |
| **Open deferred** | `resolve-now` | Shows item, helps fix | Yes | tokens |
| | `skip` | Leaves open, no re-prompt this commit | No | 0 |
| | `escalate` | Bumps priority +1 level | No | 0 |
| **Doc drift** | `update-docs` | Reads diff + target doc section, suggests minimal edit. **Consults `gabe-docs/SKILL.md` per-doc-type diagram policy:** if target matches a doc-type row (wells, AGENTS_USE.md, architecture.md, architecture-patterns.md) AND the doc's mapped section has no diagram yet AND the diff introduces a flow / state / multi-hop journey → proposes a diagram alongside the prose edit. Diagram type per matrix; skeleton per SKILL.md syntax templates; reach for `diagrams-library.md` only if ≥3 layers/actors. | Yes | tokens |
| | `accept` | Acknowledges drift, commits without doc update | No | 0 |
| | `defer` | Adds to PENDING.md at detected priority | No | 0 |
| **Structure** | `move` | Suggests nearest-match patterns, `git mv` to chosen, re-stage | No | 0 |
| | `update-structure` | Adds path/glob as allowed pattern in STRUCTURE.md | No | 0 |
| | `accept` | Appends to Exceptions Log, commits | No | 0 |
| | `defer` | Adds to PENDING.md | No | 0 |

**Blocked-commit rule:** `skip-to-pending` on a test failure records the item but the commit REMAINS BLOCKED unless the user types `force-commit: <one-line justification>`; the justification is appended to the LEDGER thin-index row's Gates column as `· FORCED: <reason>` (see Step 6). (Mirrors review's force-defer-critical.)

### Step 6: Commit + record

After all actions resolved:

1. Stage changes: `git add` the relevant files
2. Commit: `git commit -m "[message]"`
3. Log to `.kdbp/LEDGER.md` — one thin-index row:
```
| [YYYY-MM-DD] | COMMIT | [commit subject, ≤8 words] | [short hash] | findings [raw]→[survived] · deferred [n] · size-budget [ok/warn] · evidence [ok/warn/—] · docs-budget [ok/warn] |
```
If the commit went through `force-commit: <reason>` (Blocked-commit rule above), append `· FORCED: [reason]` to this row's Gates column.

4. If any items deferred, update `.kdbp/PENDING.md`:
   - Add new row with date, source=`gabe-commit`, finding, file, scale (from BEHAVIOR.md maturity), priority, impact, times_deferred=1, status=open
   - If item already exists in PENDING.md, increment `Times Deferred`
   - `Times Deferred` ≥ 3 → no further silent deferral: force a user decision `fix-now | accept-close (rationale recorded in the row) | drop`
   - Each deferred row carries a short class tag as a prefix inside its Finding cell (e.g. `[reference-fidelity] …`, `[test-gap] …`, `[doc-drift] …`) — never a new column. When ≥2 OPEN rows share a class, print `⚠ repeated class <tag>: N items — possible systemic drift from intent; confirm direction before deferring again.`

5. **Print the Gabe-Lens brief (output only).** Runs for every normal `/gabe-commit` after the commit and audit writes succeed; skipped for `docs-audit`.
   - Render as plain markdown:
     - `**Gabe-Lens brief**`
     - 1-2 concise sentences explaining what changed and why it matters.
   - If Step 1 generated the commit message body and produced a `gabe-lens brief`, reuse that brief text for this output.
   - If the user supplied the commit message, generate the visible brief from the final commit subject plus the committed diff/changed-file list. Do not amend the commit, rewrite the commit body, or ask for another message.
   - Every commit gets a brief. Use a light physical analogy only for conceptual changes (new pattern, abstraction, architecture, or workflow boundary). For mechanical changes, use direct plain-language mapping.
   - Do not write this brief to `.kdbp/LEDGER.md`, `.kdbp/PENDING.md`, docs, or any other persistence target. Only reuse it in the commit body when the generated commit-message path already produced that body.
   - This brief does not replace `/gabe-teach`; it is a command-time understanding aid, while `/gabe-teach` remains the durable knowledge consolidation path.

6. (legacy — KNOWLEDGE.md is retired from the default KDBP inventory; these checks no-op when it is absent) If `.kdbp/KNOWLEDGE.md` exists, suggest `/gabe-teach` when the commit likely introduces new topics. Heuristic (deterministic, zero cost):
   - Commit message starts with `feat:` or `refactor:` → suggest
   - Commit added new file(s) in a new folder → suggest
   - Commit modified `.kdbp/DECISIONS.md` → suggest
   - Otherwise: skip suggestion
   - Message: `ℹ New topics likely introduced. Run /gabe-teach topics to consolidate understanding.`

7. **Auto-tick Commit column in PLAN.md** (never silent: on mismatch print `ℹ PLAN: commit tick skipped (no-plan | phase-not-found | legacy-format | column-missing | footer-mismatch)` — one line, non-blocking). Only runs when the `git commit` in step 6.2 returned 0.
   - Follow the shared procedure documented in `/gabe-plan` under "Shared: auto-tick phase column" — including its precondition 5 (footer cross-check) and its step 4b, which also mirrors the tick into `.kdbp/PLAN.json`; this command does not restate that logic
   - Target column: `Commit`
   - Preconditions: `.kdbp/PLAN.md` exists, contains `status: active`, has a `## Current Phase` section, and Phases table includes a `Commit` column
   - On mismatch or legacy Status-column format: print the skip line above with the matching enum code
   - On success, display: `✅ PLAN: Phase [N] commit ticked` (one line, non-blocking)

### Maturity-Driven Check Selection

| Check | MVP | Enterprise | Scale |
|-------|-----|------------|-------|
| Lint | ✅ | ✅ | ✅ |
| Types | ✅ | ✅ | ✅ |
| Tests | ✅ | ✅ | ✅ |
| Coverage | skip | ✅ | ✅ |
| Shape | skip | ✅ (30 files) | ✅ (20 files) |
| Deferred | HIGH+ only | MEDIUM+ | All |
| Doc Drift | safe cards + wells Layer 3 | safe cards + DOCS.md + wells Layer 3 | safe cards + DOCS.md + wells Layer 3 |
| Structure | MVP patterns | MVP + E patterns | All patterns |

---

## Step A: Docs-Audit Mode (subcommand `docs-audit`)

Retroactive tree-wide audit against `.kdbp/DOCS.md` + wells' `Docs` paths. Runs only when invoked explicitly via `/gabe-commit docs-audit`. Skips Steps 1-6 entirely — no diff, no commit, no tests. Read-only git; any proposed file changes remain unstaged.

**Preconditions:**

- `.kdbp/` directory exists. If not → print `⚠ No .kdbp/ — run /gabe-init first.` and exit.
- At least ONE of: `.kdbp/DOCS.md` has non-skip mappings OR `.kdbp/KNOWLEDGE.md` Gravity Wells table has ≥1 well with a non-empty `Docs` column (legacy — KNOWLEDGE.md is retired from the default KDBP inventory; these checks no-op when it is absent). If neither → print `ℹ Nothing to audit against. Populate DOCS.md mappings or run /gabe-teach init-wells with Docs paths.` and exit.

### Step A1: Gather universe

1. Source files: `git ls-files` (respects .gitignore, excludes untracked)
2. Tracked doc files: files under `docs/**/*.md` and `README.md` at project root
3. DOCS.md mappings: parse `.kdbp/DOCS.md` mapping table, filter out rows where `Doc Target` is `skip`, collect `(Source Pattern, Doc Target, Section, Priority)` tuples
4. Well Docs paths: parse `.kdbp/KNOWLEDGE.md` Gravity Wells table, collect rows where `Paths` AND `Docs` are both non-empty

### Step A2: DOCS.md audit

For each mapping `(pattern, target, section, priority)`:

1. **Mapped source files exist?** Glob `pattern` against `git ls-files` output. If 0 matches → skip this mapping (nothing to document against).
2. **Target file exists?** If `target` doesn't exist on disk → finding `Doc target missing: {target} (mapped from {pattern}, {N} source files)`, severity = `priority`.
3. **Target section exists + non-empty?** If `section` is non-empty, extract content between `## {section}` and next heading (or EOF):
   - No `## {section}` heading found → finding `Doc section missing: {target}#{section} (mapped from {pattern})`, severity = `priority`.
   - Section found but <80 non-comment/non-whitespace chars → finding `Doc section empty: {target}#{section} ({N} source files mapped)`, severity = `priority`.
   - Otherwise → no finding for this step (diagram coverage still checked in step 4).
4. **Diagram coverage (per-doc-type matrix).** Only runs when step 3 passed (section populated ≥80 chars). Consult `gabe-docs/SKILL.md` "Per-doc-type diagram policy" matrix using `target` basename:
   - `docs/AGENTS_USE.md` — diagram required when `section` is `Agent Design` (flowchart) or when any module file matching `pattern` uses tool-call adapters (sequenceDiagram). Severity: `medium`.
   - `docs/architecture.md` — diagram required when `section` is `Data Model` (erDiagram), `API Endpoints` (sequenceDiagram), or the section contains >200 chars of prose describing a flow (flowchart). Severity: `medium`.
   - `docs/architecture-patterns.md` — diagram required per pattern entry when the entry describes a flow / state / structural split (not pure rationale). Severity: `low`.
   - All other `target` paths → no diagram check (out of scope for A2; wells covered by A3).

   Detection: parse the section content for a `` ```mermaid `` fence. If no fence AND the target+section row above requires a diagram per matrix → finding `Doc section populated but diagram missing: {target}#{section} (matrix requires [flowchart|sequenceDiagram|erDiagram])`, severity per row above. Actions: `[add-diagram] [skip] [defer]`.

   If a fence exists, stub-check via `gabe-docs/SKILL.md` stub-detection heuristic. If stub → finding `Doc section diagram is placeholder: {target}#{section}`, severity `low`. Actions: `[upgrade-diagram] [skip] [defer]`.

### Step A3: Well Docs audit

For each well with non-empty `Paths` AND non-empty `Docs`:

1. **Docs file exists?** If not → finding `Well doc missing: {Docs} (well {G_N} {name})`, severity = `low`.
2. **`## Topics (auto-appended)` section present?** If missing → finding `Missing ## Topics (auto-appended) section: {Docs} (teach Step 4d.1 can't append)`, severity = `medium`.
3. **Purpose still placeholder AND ≥3 verified topics?** Count `### T[N] —` headings under `## Topics (auto-appended)`. Count non-comment/non-whitespace chars in `## Purpose` section. If topics ≥3 AND Purpose <80 chars → finding `Well Purpose empty despite {N} verified topics: {Docs}`, severity = `low` (info: teach Step 4d.4 will offer to draft next time).
4. **Diagram still placeholder despite ≥2 verified topics?** Parse `## Key Diagrams` section. Apply stub detection per `gabe-docs/SKILL.md` "Upgrade detection heuristic" (signals a-d: `TODO` literal, `[Start]`/`[End]` scaffolder labels, ≤2 node count, <60 chars body). If stub detected AND verified-topic count ≥2 → finding `Well [G_N] {name} diagram still placeholder despite {M} verified topics: {Docs}`, severity = `low`. Actions: `[upgrade-diagram] [skip] [defer]`. Handler: see Step A7.

### Step A4: Orphaned doc detection

List all `.md` files under `docs/` (recursive). Subtract:

- Files mapped in DOCS.md (Doc Target column, dedup)
- Files in any well's Docs column
- Whitelist: `README.md` at docs root, `CHANGELOG.md`, `CONTRIBUTING.md`, `LICENSE.md`

Remaining files → finding `Orphaned doc: {path} (not in DOCS.md mappings, not tracked by any well)`, severity = `low`.

### Step A5: Source-coverage gap detection

For each tracked source file, check if it matches ANY DOCS.md Source Pattern (including `skip` rows — those are intentional excludes) OR ANY well's Paths glob.

Files matching NOTHING, excluding standard skip patterns (`tests/**`, `.kdbp/**`, `node_modules/**`, `__pycache__/**`, `.git/**`, `*.pyc`, `*.lock`, binary files) → finding `Uncovered by DOCS.md or wells: {path}`, severity = `low`.

Cap at 10 findings — if more exist, emit `… and {N} more uncovered files` as an info line at the end of this section. Prevents spam on brand-new projects with no mappings yet.

### Step A6: Render audit report + interactive triage

Render an **action glossary** before the findings table so the reader knows what each `[action]` token does. Show every token that appears in the Actions column at least once (dedupe). Keep rows to one line, describe intent + cost, not mechanics.

The glossary is deterministic — action tokens map to the descriptions in the table below. Do not paraphrase at runtime.

**Action token reference:**

| Token | What it does | LLM? | Writes |
|---|---|---|---|
| `add-diagram` | Generate a NEW Mermaid diagram in a populated doc section per the per-doc-type matrix. Picks diagram type from matrix, synthesizes from source files + current section prose. Human confirms draft. | yes | doc file |
| `upgrade-diagram` | Replace an existing **stub** Mermaid diagram with a real one. Respects the scaffold-time type (never re-decided). Synthesizes from verified topics + Key Decisions + Purpose. Human confirms draft. | yes | doc file |
| `update-docs` | LLM rewrites the prose of a populated-but-thin section, seeded from recent commits touching mapped source files. Human confirms each edit. Never silent. | yes | doc file |
| `create` | Scaffold a NEW doc file with H1 + section headings from all DOCS.md mappings pointing at this target. Bodies are HTML-comment placeholders (no LLM). | no | new doc file |
| `create-section` | Append a missing `## {section}` heading to an existing doc file with a TODO comment. No prose generated. | no | doc file |
| `insert-heading` | Append the `## Topics (auto-appended)` heading block to a well doc that lacks it, so future `/gabe-teach` runs can write there. | no | doc file |
| `archive` | Move an orphaned doc under `docs/archive/{today}-{basename}`. Unstaged `git mv`; no content change. | no | file rename |
| `map` | Interactive prompt for a source-pattern glob + priority, then append a new row to `.kdbp/DOCS.md` linking source files to a doc target. Used for orphans + uncovered source files. | no | `.kdbp/DOCS.md` |
| `update-mapping` | Edit an EXISTING `.kdbp/DOCS.md` row whose `Doc Target` now points at a moved/renamed file. Interactive confirmation of the new target path. | no | `.kdbp/DOCS.md` |
| `fix-DOCS.md` | Fix a stale `.kdbp/DOCS.md` mapping — same as `update-mapping` but offered when the original source file has also moved (both sides of the mapping refresh). | no | `.kdbp/DOCS.md` |
| `defer-to-teach` | No-op write; prints a one-line notice that `/gabe-teach topics` Step 4d.4 will handle this (typically for empty Purpose sections once ≥3 topics verified). | no | nothing |
| `skip` | Session-scoped one-time dismissal. Not persisted. Finding re-surfaces on next `docs-audit` run. | no | nothing |
| `defer` | Persistent dismissal — append a row to `.kdbp/PENDING.md` with `source=docs-audit`. Re-surfaces on next run as a tracked deferred item with increasing age. | no | `.kdbp/PENDING.md` |

**Output structure — render each of the following sections at runtime as plain markdown (not wrapped in a code fence). Headings use H4 or bold labels; tables render as markdown tables; interactive prompts render as prose with inline code.**

#### GABE COMMIT — docs-audit

Universe line (prose, one line): `Universe: [N source files] | [N doc files] | [N wells] | [N DOCS.md mappings]`

**Findings table** (markdown table, not fenced):

| # | Sev    | Finding                                                              | Actions                               |
|---|--------|----------------------------------------------------------------------|---------------------------------------|
| 1 | high   | Doc target missing: docs/architecture.md#Data Model (4 mapped)       | `[create]` `[skip]` `[defer]`         |
| 2 | medium | Doc section empty: docs/AGENTS_USE.md#Prompts (3 mapped, 42 chars)   | `[update-docs]` `[skip]` `[defer]`    |
| 3 | medium | Missing ## Topics section: docs/wells/2-llm-pipeline.md              | `[insert-heading]` `[skip]` `[defer]` |
| 4 | low    | Orphaned doc: docs/legacy/old-routing.md                             | `[archive]` `[map]` `[skip]`          |
| 5 | low    | Well Purpose empty despite 4 verified topics: docs/wells/3-api.md    | `[defer-to-teach]` `[skip]`           |
| 6 | low    | Well G2 LLM Pipeline diagram still placeholder (3 verified topics)   | `[upgrade-diagram]` `[skip]` `[defer]`|
| 7 | medium | Doc section populated but diagram missing: docs/AGENTS_USE.md#Agent Design (matrix requires flowchart) | `[add-diagram]` `[skip]` `[defer]` |

Info lines (prose, one per line, prefixed with `ℹ`):

- `ℹ … and 3 more uncovered files. Run with `full` flag to see all.`

**Bulk options** (rendered as a numbered list in plain markdown — each option is an H5 heading or bold label with indented bullet details):

- **[1] Fix all diagrams (add + upgrade)** — Apply: `[n_diagram]` findings (`add-diagram` + `upgrade-diagram` actions); Defer: `[rest]` → PENDING.md; LLM: yes (Haiku default, Sonnet on ≥3 layers)
- **[2] Fix all mappings + DOCS.md housekeeping** (`map` + `update-mapping` + `fix-DOCS.md` + `archive`) — Apply: `[n_mapping]` findings; Defer: `[rest]` → PENDING.md; LLM: no
- **[3] Fix all doc scaffolds** (`create` + `create-section` + `insert-heading`) — Apply: `[n_scaffold]` findings; Defer: `[rest]` → PENDING.md; LLM: no
- **[4] Fix all prose updates** (`update-docs`) — Apply: `[n_update]` findings; Defer: `[rest]` → PENDING.md; LLM: yes (one call per finding)
- **[5] Fix HIGH + CRITICAL only** (severity-based) — Apply: `[n_crit+n_high]` findings (default action per row); Defer: `[n_med+n_low]` → PENDING.md
- **[6] Fix MEDIUM + HIGH + CRITICAL** (severity-based) — Apply: `[n_crit+n_high+n_med]` findings; Defer: `[n_low]` → PENDING.md
- **[7] Fix everything** (all findings, default action per row) — Apply: `[total]` findings; Defer: none
- **[8] Defer LOW, triage MEDIUM+ one-by-one** — Defer now: `[n_low]` → PENDING.md; Then enter: one-by-one for remaining `[n_med+n_high+n_crit]`
- **[9] One-by-one (per-finding prompt)** — Enter per-finding loop for all `[total]`; each gets full action menu for its row
- **[10] Skip triage (defer everything)** — Defer: all `[total]` → PENDING.md; Apply: none

★ **Recommended for** `[project maturity]`**:** `[default]`

**Actions prompt** (prose line, not fenced):

`Pick [1-10] or type custom expression (e.g. "1-4:add-diagram 5:update-docs 10-19:defer") or "all:defer":`

---

**Critical rendering rule.** Everything above this line in Step A6 (glossary table, findings table, bulk options list, actions prompt) MUST render as plain markdown at runtime. Do **not** wrap any of those sections in a triple-backtick fence. Markdown tables display as tables in the user's terminal. A code-fenced rendering hides severity columns, clips long finding text, and breaks row-number-based action entry (`1:add-diagram`) because the user can't read the rows.

The only content in this step that should appear inside a tagged code fence at runtime is the literal warning example in the Bulk-option guardrails section below — that one is a verbatim output sample and stays fenced with ```text.

**Categorization rules (deterministic, compute before rendering the menu):**

Bucket each finding into at most one action-type cluster based on its default (first-listed) action token:

| Cluster | Action tokens |
|---|---|
| **Diagrams** | `add-diagram`, `upgrade-diagram` |
| **Mappings** | `map`, `update-mapping`, `fix-DOCS.md`, `fix-DOCS`, `archive` |
| **Scaffolds** | `create`, `create-section`, `insert-heading` |
| **Prose updates** | `update-docs` |
| **Teach handoffs** | `defer-to-teach` |
| **Non-actionable** | findings where only action is `skip` / `defer` |

Counts used in the menu (`n_diagram`, `n_mapping`, etc.) are the sizes of each cluster after categorization. Zero-count clusters still appear in the menu but show `Apply: 0 findings` so the shape is stable across runs.

**Starred default (by project maturity, not by project name):**

| Project maturity | Recommended | Reason |
|---|---|---|
| MVP | [5] Fix HIGH + CRITICAL only | Cheap wins; low-severity docs debt deferred to PENDING.md |
| Enterprise | [6] Fix MEDIUM + HIGH + CRITICAL | Drift closes at medium bar |
| Scale | [7] Fix everything | Full audit resolution |

If no `.kdbp/BEHAVIOR.md` exists, star [5] as the conservative default.

**Bulk-option guardrails:**

1. **CRITICAL findings are always in the apply set.** If the chosen option would leave a CRITICAL un-applied, warn and adjust. Example warning output (render as shown, inside a ```text fence for monospace alignment):

   ```text
   ⚠ Option [5] would defer [N] CRITICAL finding(s). CRITICALs cannot be deferred from docs-audit.
     Adjusted apply set:  [N+n_high] findings
     Adjusted defer:      [rest]
     Proceed? [Y/n]
   ```
2. **Cluster-bulk options respect the matrix-required budget.** Option [1] applies `add-diagram` / `upgrade-diagram` only where the per-doc-type matrix requires a diagram (non-required LOW diagram-missing findings still defer with [1]).
3. **`update-docs` (prose) always respects human confirmation per-finding.** Even under option [4] or [7], each `update-docs` LLM draft is shown before write — user can accept / edit / cancel each one. No silent rewrite.

**Custom expression syntax:**

```
1-4:add-diagram 5:update-docs 10-19:defer
fix 1,3,5 defer 2,4 one-by-one 6-7
all-diagrams all-medium:defer rest:skip
```

Parse rules:
- `N:action` / `N-M:action` — apply `action` to findings N through M
- `all-diagrams`, `all-mappings`, `all-scaffolds`, `all-updates` — cluster shortcuts (apply cluster's default action)
- `all-critical`, `all-high`, `all-medium`, `all-low` — severity shortcuts (apply default action per row)
- `fix N` alone — apply default action for findings N
- `defer N` / `skip N` — explicit
- `rest` — everything not yet assigned
- Unresolved items at end of expression → auto-defer with confirm prompt

### Step A7: Action handlers

Execute each user action in order:

| Finding Type | Action | Behavior | LLM? |
|---|---|---|---|
| Doc target missing | `create` | Write new file with `# {filename-derived}` H1 + required `## {Section}` subheadings from all DOCS.md mappings pointing at this target + the standards marker `<!-- Standards: see ~/.claude/skills/gabe-docs/SKILL.md -->`. Leave section bodies as HTML-comment placeholders identical to `/gabe-init` doc stubs. | No |
| | `skip` | One-time dismissal (session-scoped) | No |
| | `defer` | Append row to PENDING.md: `{today} \| docs-audit \| Create {target} \| {target} \| large \| {priority} \| high \| 0 \| open` | No |
| Doc section missing | `create-section` (new action) | Append `## {Section}\n\n<!-- TODO: populate from DOCS.md mapping {pattern} -->\n` to the target file | No |
| | `skip` / `defer` | as above | No |
| Doc section empty | `update-docs` | Invoke the existing per-diff `update-docs` triage action but scoped to (a) the specific section and (b) recent commits that touched source files mapped to this section. Seeds from `git log --oneline -10 -- {glob from mapping}` and the current file content of the section. LLM edits proposed, human confirms. | **Yes** |
| | `skip` / `defer` | as above | No |
| Missing ## Topics heading | `insert-heading` | Append `\n## Topics (auto-appended)\n\n<!-- /gabe-teach topics appends verified topic summaries here on first run. -->\n<!-- Do not edit the structure below this line; edit individual entries freely. -->\n` to end of well doc | No |
| | `skip` / `defer` | as above | No |
| Orphaned doc | `archive` | `mkdir -p docs/archive` then `git mv {path} docs/archive/{today}-{basename}` (unstaged) | No |
| | `map` | Interactive prompt: `Source Pattern for {path}? (e.g., app/legacy/**)` then `Priority? [critical/high/medium/low]` then append row to DOCS.md mapping table: `\| {pattern} \| {path} \| - \| {priority} \|` | No |
| | `skip` | One-time dismissal | No |
| Well Purpose empty | `defer-to-teach` | Print `ℹ docs/wells/{N}-{slug}.md: Purpose will be drafted on next /gabe-teach topics session (Step 4d.4 freshness prompt fires at ≥3 verified topics).` | No |
| | `skip` | One-time dismissal | No |
| Diagram placeholder (well-level, A3) | `upgrade-diagram` | Read well's verified topics from KNOWLEDGE.md Topics table + `## Purpose` + `## Key Decisions` from the well doc. Determine diagram type from per-well recommendation table in `gabe-docs/SKILL.md` (not re-decided — respect scaffold intent). Generate diagram body per gabe-docs upgrade rules (≤10 nodes, intent-labeled, analogy-consistent). Consult `gabe-docs/diagrams-library.md` if the well covers ≥3 layers or needs subgraph grouping. Replace stub fence content. LLM edits proposed, human confirms before write. | **Yes** |
| | `skip` / `defer` | as above | No |
| Diagram missing (non-well doc, A2 step 4) | `add-diagram` | Read `section` content + source files matching `pattern` (via `git log --oneline -10 -- {pattern-glob}` + file reads). Determine diagram type from per-doc-type matrix in `gabe-docs/SKILL.md` (matrix row dictates the type). Generate diagram body per SKILL.md skeletons (≤10 nodes, intent-labeled). Consult `diagrams-library.md` only if ≥3 layers/actors. Insert a new mermaid fence at end of `section`, before the next heading. LLM edits proposed, human confirms before write. | **Yes** |
| | `skip` / `defer` | as above | No |
| Diagram stub (non-well doc, A2 step 4) | `upgrade-diagram` | Same handler as well-level upgrade above, but seeds from mapped source files + section prose (no KNOWLEDGE.md topic lookup for non-well targets). Respects matrix-dictated type. | **Yes** |
| | `skip` / `defer` | as above | No |
| Uncovered source file | `map` | Same interactive prompt as orphaned-doc `map` but target defaults to a DOCS.md row with appropriate doc (prompt for doc + section too). Writes to DOCS.md. | No |
| | `skip` | One-time dismissal | No |

**Important constraints:**

- `create`, `create-section`, `insert-heading`, `archive`, `map` all leave changes UNSTAGED. The human runs `/gabe-commit` normally afterwards to stage + commit what they want.
- `update-docs` uses the existing per-diff triage action (see Step 5 triage table row "Doc drift"). In audit mode, the action accepts an explicit `section` scope parameter so the LLM only edits between `## {Section}` and the next heading.
- `defer` writes to PENDING.md; source column recorded as `docs-audit` so the human can filter later.
- No automatic chaining to Step 1. Audit is a dead-end: it reports, triages, and exits. Human decides when to commit the proposed changes.

### Step A8: Log to LEDGER.md

Always (even if no actions taken). Log one thin-index row:

```
| [YYYY-MM-DD] | COMMIT | docs-audit: [scope] | — | actions [n] · drift [n] |
```

`[scope]` is a short description of what was audited (e.g. `full tree` or the mapping/well subset checked). `actions [n]` is the count of actions applied; `drift [n]` is the total findings count. See Step A8.5 for the human-facing Notable/Minor digest (command-time output, not persisted to LEDGER).

### Step A8.5: Notable Updates digest

**Runs only when at least one action wrote to disk.** If the session was pure triage (all findings skipped / deferred, nothing modified), skip this step silently — per user intent: "if we don't update anything, that's it and that's okay."

Purpose: as a solo developer, you just sat through a triage run and approved N writes. You can't remember every one. The digest tells you which of the changes deserve a real review pass and which are routine housekeeping you can skim. Surfacing the boundary up front prevents both complacency (missing a semantic shift) and audit fatigue (re-reading every DOCS.md row change).

**Classification heuristic (deterministic, zero LLM cost):**

Bucket each applied action into **Notable** or **Minor** by inspecting the action + target doc's priority + post-write size:

| Write kind | Bucket | Why |
|---|---|---|
| `add-diagram` where per-doc-type matrix REQUIRED a diagram | **Notable** | New visual semantic content enters reader understanding |
| `upgrade-diagram` that replaced stub with ≥5-node real diagram | **Notable** | Diagram now actually tells a story — worth reading once |
| `update-docs` on mapping with priority `critical` or `high` | **Notable** | User-facing prose in load-bearing docs; LLM might have drifted |
| `create` (new doc file scaffolded) | **Notable** | New home for future content — name + H1 structure locked now |
| `add-diagram` / `update-docs` in `docs/wells/*.md` where well has ≥3 verified topics | **Notable** | High-gravity well — architectural narrative anchor |
| `insert-heading` (empty Topics heading added to well doc) | Minor | Mechanical — enables future teach appends, no content yet |
| `create-section` (empty heading stub) | Minor | Placeholder only; `update-docs` later will fill it |
| `map` / `update-mapping` / `fix-DOCS.md` | Minor | DOCS.md row edit; no doc content changed |
| `archive` | Minor | File relocation; history preserved |
| `update-docs` on mapping with priority `medium` or `low` | Minor | Auxiliary docs; glance at diff is enough |
| `add-diagram` / `upgrade-diagram` in ADR / README (optional per matrix) | Minor | Optional slot; reader doesn't expect diagram there |
| `add-diagram` / `upgrade-diagram` producing diagram with <5 nodes | Minor | Skeleton-level; not enough content to mislead |

For each Notable write, compute a **one-line "why it deserves revision"** — a terse sentence (≤15 words) grounded in the actual change (not a template):

- NEW diagram → what flow / entity / state it captures
- Upgraded diagram → what semantic concept it now represents (vs the TODO stub)
- Prose rewrite → which section was rewritten + whether it introduces new vocabulary
- New scaffold → H1 + top-level sections chosen

For Minor writes, no per-item reason — just a one-line bullet with target path.

**Render as plain markdown at runtime — do not wrap in a fence** (same rule as Steps A6 / 4; user needs to scan, not read monospace):

#### Notable updates (review recommended)

- **docs/AGENTS_USE.md#Agent Design** — NEW flowchart (12 nodes). Captures agent loop from API entry through guardrails → classifier → triage → ticket creation. Verify the nodes match your mental model.
- **docs/wells/2-llm-pipeline.md** — diagram upgraded from stub → 8-node state machine covering tier1→tier4 fallback chain. Check severity thresholds match actual runtime behavior.
- **docs/architecture.md#Data Model** — NEW erDiagram (6 entities, 4 relations). Pulled from `app/db/models.py` — verify cardinality on `User → Ticket` and `Ticket → Event`.

#### Minor updates (routine)

- **docs/AGENTS_USE.md#Prompts** — empty section scaffolded; TODO marker inserted.
- **.kdbp/DOCS.md** — 3 mappings updated to point at `docs/archive/` paths (v2-dogfood + v2-patch moved).
- **docs/legacy/old-routing.md** → **docs/archive/2026-04-21-old-routing.md** — archived.

If ONLY Notable writes happened → render only the Notable section. If ONLY Minor → only Minor. If both → both, Notable first (never reverse — user should see the important stuff before scanning housekeeping).

### Step A9: Closing summary

Render as plain markdown, not fenced:

> ✅ **docs-audit complete.**
>
> - `{N}` findings triaged.
> - `{M}` files modified (unstaged — run `/gabe-commit` to stage + commit).
> - `{K}` items deferred to PENDING.md.

If `{M} > 0`, append on a new line: `→ Next: run /gabe-commit "docs(audit): apply accumulated doc-drift fixes" to commit.`

If Step A8.5 ran and printed a Notable section: `→ Review the Notable Updates digest above before committing — the LLM-generated diagrams / prose rewrites are the main risk surface.`

---

## Commit message body structure

Commit messages generated by this command (or by `/gabe-execute` which delegates here) follow this body template:

```
<type>(<scope>): <subject>

<gabe-lens brief: 1-2 sentences — what changed + how it maps, plain language>

Before:
<3-6 line snippet or structured description of prior behavior>

After:
<3-6 line snippet or structured description of new behavior>

<optional footer — one of:>
Phase: N — [phase name]
Task: T[i]/[K] — [task description]
```

### Generation rules

**Subject**

- Conventional commit format: `type(scope): imperative`
- `type` ∈ {feat, fix, refactor, chore, docs, test, perf, ci, build}
- `scope` = topmost touched module or well (e.g., `triage`, `pipeline`, `docs`)
- Subject ≤72 chars, imperative mood, no trailing period

**Gabe-lens brief**

- 1-2 sentences, plain language, explains the *why* + *how it maps*
- Use analogy style from `gabe-lens` skill only when the change is **conceptual** (introduces a new pattern, abstraction, or architectural shift)
- Skip analogy for **mechanical** changes (renames, moves, typo fixes, dependency bumps, formatting)
- The normal commit flow also prints a visible `**Gabe-Lens brief**` after commit success. If this generated body already contains a brief, reuse it there; if the user supplied a message, generate only the visible brief from the final commit and do not rewrite the commit.

**Before / After**

- **Required** for all commits touching source code (`app/`, `src/`, `lib/`, etc.)
- **Skipped** for pure doc/config/dependency commits (those get subject + gabe-lens brief only)
- Format options:
  - Code snippet: 3-6 lines of actual or pseudo-code showing behavior delta
  - Structured description: one-line prose each, side-by-side meaning contrast
- Do not paste the whole diff — that's what `git show` is for. Distill the *behavior change*.

**Phase/Task footer**

- Appended automatically when `.kdbp/PLAN.md` has an active plan and Current Phase is set
- Source: the `ℹ PLAN: ...` context line from Step 1b (Current Phase number + name)
- If commit is made via `/gabe-execute`, the Task line is also appended
- If no active plan: omit the footer entirely

### Model routing

Per U6 (Route by Task, Not by User):

| Commit kind | Model | Reason |
|-------------|-------|--------|
| Rename/move/typo/format/dep-bump | Haiku | Mechanical — cheap summarization |
| Bug fix with clear diff | Haiku | Narrow scope, low-ambiguity before/after |
| New feature / refactor / new abstraction | Sonnet | Needs analogy + architectural framing |
| Docs changes | Haiku | Summarization |

Classify via heuristic first (file patterns, diff size, conventional type). Only invoke LLM for subject + body generation once type is known.

### Example — conceptual change (Sonnet)

```
feat(triage): wire PydanticAI agent with 4-tier fallback chain

Triage now enforces output shape mechanically via PydanticAI's output_type
rather than trusting the LLM to return valid JSON. A 4-tier fallback
(regex extract → rule-based → safe default) guarantees the pipeline
never crashes and never returns empty.

Before:
  result = triage_incident(title, desc)
  # rule-based keyword matching; returns None on mismatch

After:
  result = await run_triage(title, desc)
  # PydanticAI Agent(output_type=TriageResult, retries=2)
  # on exhaustion: regex-extract → rule-based → P3 safe default
  # tier fired logged via structlog tier=1|2|3|4

Phase: 2 — PydanticAI Agent
Task: T2/6 — New app/agent/triage_agent.py with Agent + fallback wrapper
```

### Example — mechanical change (Haiku)

```
refactor(triage): rename classify_incident → classify_severity

Clearer naming — function only sets severity, not full classification.

Before:
  def classify_incident(incident: Incident) -> Severity:

After:
  def classify_severity(incident: Incident) -> Severity:

Phase: 4 — Wire into pipeline
Task: T1/2 — Rename for clarity before pipeline integration
```

### Example — dep bump (Haiku, no before/after)

```
chore(deps): pin pydantic-ai to 0.0.14

Lock version to avoid breaking changes until tested.

Phase: 2 — PydanticAI Agent
Task: T3/6 — Add pydantic-ai to pyproject.toml
```

### Override

User can pass a pre-written message via `$ARGUMENTS`. In that case:

- Subject is used as-is
- Body enrichment is skipped (user owns the message)
- Phase/Task footer is still appended if plan is active (opt-out: `$ARGUMENTS` ending with `--no-footer`)

### Scope-edit audit (if SCOPE.md in diff)

When a commit modifies `.kdbp/SCOPE.md` directly (including its `## Phases` section):

1. **Bypass warning.** Surface before proceeding:
   ```
   ⚠ Direct SCOPE.md edit detected.

   This file should change only through /gabe-scope-change (which routes to
   /gabe-scope-addition or /gabe-scope-pivot with classifier + Change Log).

   Direct edits skip the classifier, Change Log entry, and version bump.

   Options:
     [c] Continue anyway (records commit with scope_bypass audit tag)
     [r] Revert changes + use /gabe-scope-change
     [a] Abort commit
   ```
2. **Exception:** If the commit author also changed `.kdbp/CHANGES.jsonl` in the same diff with a matching `scope_addition` or `scope_pivot` row, assume the edit was made via the proper command path and skip the warning.
3. **Audit footer.** If user continues, append `Scope-Bypass-Audit: true` line to commit footer for later grep.

No behavior change for non-scope files.

$ARGUMENTS
