# Gabe Health — full spec

> This file is the binding spec; the SKILL.md core is a summary.
> E1–E7: see `../../gabe-docs/references/execution-contract.md`.

## When to Use

**Use when:**
- Starting a new epic or milestone — know where the minefields are before walking in
- During retrospectives — "why did this sprint feel fragile?"
- After a production incident — "was this a one-off or is this area inherently unstable?"
- Before major refactoring — "which files should I split/stabilize first?"
- When things just feel fragile but you can't articulate why

**Don't use when:**
- Reviewing a specific diff (use /gabe-review)
- Looking for bugs in code (use /gabe-roast qa)
- Checking alignment with values (use /gabe-assess brief)

---

## The 6 Analyses

### Filters every git analysis carries (§1–§4)

Three kinds of commit data would drown the signal, so the detection blocks below filter them — each block
is self-contained (shell state does not survive between tool calls), so the filters are inlined, never set once:

- **`.kdbp/**` is excluded** — pathspec `-- . ':(exclude).kdbp'` on every `git log` / `git show`. LEDGER,
  PLAN and PLAN.json ride every lifecycle beat's commit (archie: LEDGER.md in 36 of 47 commits over 60 days),
  so unfiltered they are always the top god file and every top coupling pair. Analysis 6 covers `.kdbp/`.
  The pathspec also shrinks the denominator: a commit that touched only `.kdbp/` is not a code commit.
- **Mass commits are dropped** (§1–§3) — a commit touching more than 200 files (a vendor drop, a formatter
  pass, a rename sweep) adds one to every file and swamps churn (archie: one 1,084-file commit was 96.8% of
  60-day churn). The header names each one: `Outlier commits excluded: <sha> — <N> files, <L> lines`
  (or `Outlier commits excluded: none`), from the block below.
- **Only paths live at HEAD rank** (§1–§3) — a file deleted or renamed away is history, not a hotspot to fix
  (archie: 18 of the top-20 churn files no longer existed). Filter: membership in `git ls-files`.

```bash
# the mass commits §1–§3 drop — printed in the report header
git log --since=N.days --format=%h --shortstat -- . ':(exclude).kdbp' \
  | awk '/^[0-9a-f]+$/ {s=$1} /changed/ {if ($1 > 200) print s " — " $1 " files, " $4+$6 " lines"}'
```

### 1. God Files

Files touched in >25% of PRs/commits in the lookback window. These are coupling magnets — every feature has to edit them.

**Detection:**
```bash
# commits per LIVE file over code commits (.kdbp/ excluded, mass commits dropped from count AND denominator)
git log --since=N.days --name-only --format=tformat:--- -- . ':(exclude).kdbp' | python3 -c '
import sys, subprocess, collections
live = set(subprocess.run(["git", "ls-files"], capture_output=True, text=True).stdout.splitlines())
cs = [c for c in ([f for f in c.split("\n") if f] for c in sys.stdin.read().split("---")) if c]
kept = [c for c in cs if len(c) <= 200]
n = collections.Counter(f for c in kept for f in c if f in live)
print(f"denominator: {len(kept)} code commits ({len(cs) - len(kept)} mass commits dropped)")
for f, k in n.most_common(20): print(f"{k}/{len(kept)} ({100 * k // max(len(kept), 1)}%)  {f}")'
```

**Output:**
```
God Files (touched in >25% of commits, last 60 days):
  🔴 <path> — <X>/<Y> commits (<Z>%)
     Suggest: Extract responsibilities. Consider /gabe-roast architect on this file.
  ⚠️ <path> — <X>/<Y> commits (<Z>%)
     Borderline. Monitor.
```

Examples are FORMAT ONLY — never reuse their names or numbers.

### 2. Churn Hotspots

Files with the most modifications in the lookback window, regardless of PR count. High churn often means the design isn't stable — it keeps needing adjustment.

**Detection:**
```bash
# lines added+removed per LIVE file (.kdbp/ excluded, mass commits dropped, binary rows skipped)
git log --since=N.days --numstat --format=tformat:--- -- . ':(exclude).kdbp' | python3 -c '
import sys, subprocess, collections
live = set(subprocess.run(["git", "ls-files"], capture_output=True, text=True).stdout.splitlines())
cs = [c for c in ([l.split("\t", 2) for l in c.split("\n") if l.count("\t") >= 2] for c in sys.stdin.read().split("---")) if c]
ch, hits = collections.Counter(), collections.Counter()
for c in (c for c in cs if len(c) <= 200):
    for a, d, f in c:
        if f in live and a != "-":
            ch[f] += int(a) + int(d); hits[f] += 1
for f, k in ch.most_common(20): print(f"{k} lines / {hits[f]} commits  {f}")'
```

**Output:**
```
Churn Hotspots (most modifications, last 60 days):
  🔴 <path> — <N> lines churned across <M> commits
  ⚠️ <path> — <N> lines churned across <M> commits
```

Examples are FORMAT ONLY — never reuse their names or numbers.

### 3. Coupling Clusters

Files that always change together. If A and B are co-modified in >60% of commits that touch either, they're coupled — changes to one likely require changes to the other.

**Detection:**
```bash
git log --since=N.days --name-only --format=tformat:--- -- . ':(exclude).kdbp' | python3 -c '
import sys, itertools, collections, subprocess
live=set(subprocess.run(["git","ls-files"],capture_output=True,text=True).stdout.splitlines())
commits=[set(filter(None,c.strip().split("\n"))) for c in sys.stdin.read().split("---") if c.strip()]
commits=[c & live for c in commits if len(c) <= 200]
pair=collections.Counter(); tot=collections.Counter()
for c in commits:
    for f in c: tot[f]+=1
    for a,b in itertools.combinations(sorted(c),2): pair[(a,b)]+=1
for (a,b),n in pair.most_common(20):
    d=min(tot[a],tot[b]); print(f"{n}/{d} ({100*n//d}%)  {a} <-> {b}")'
```

Report a pair ONLY with counts copied from this run's output. If the command did not execute this run, print `coupling analysis skipped` — never estimate or reuse the example percentages below. For a pair above threshold, and only where the project carries a command center, ask `mcp__gabe-map__blast_radius` ONCE PER FILE (`files: [<fileA>]`, then `files: [<fileB>]`) and intersect the two answers: a slug in both `touched_entities`, an endpoint id in both `endpoints_reached`, or a slug in one file's `touched_entities` that appears in the other file's `fk_neighbor_entities` (an FK from that entity's models into the other file's models — directional, so check both answers) upgrades the row from *co-changes* to *coupled*. One call with both files pools them and cannot answer the question: `touched_entities` counts owner rows across every file passed (a file under two layers of one entity counts twice), `endpoints_reached` carries no per-file key, and `fk_neighbor_entities` is computed MINUS the entities owning the passed files, so with the pair in one call it can only ever name a third party. Its silence proves nothing (the map is a floor) and the co-change count stands on its own.

**Output:**
```
Coupling Clusters (>60% co-change rate):
  <fileA> ↔ <fileB> — co-changed in <N>/<M> commits (<Z>%)
    Risk: Change one, must test both. Missing test in either = hidden breakage.

  <fileC> ↔ <fileD> — co-changed in <N>/<M> commits (<Z>%)
    Below threshold but close. Watch.
```

Examples are FORMAT ONLY — never reuse their names or numbers.

### 4. Bug-Fix Concentration

Where do `fix:` and `bug` commits cluster? If 60% of bug fixes touch the same directory, that module is structurally fragile.

**Detection:**
```bash
# Fix commits selected by the subject's TYPE — `git log --grep` also matches bodies, and a word
# match on the subject still counts "chore(kdbp): record the D48 fix" — so the subject must START
# with fix/hotfix/bugfix/bug (conventional `fix(scope):` or a plain "Fix login crash"); then the
# file distribution
git log --since=N.days --format='%H%x09%s' \
  | awk -F'\t' 'tolower($2) ~ /^(fix|hotfix|bugfix|bug)([(:!]|[[:space:]]|$)/ {print $1}' \
  | while read -r sha; do git show --name-only --format="" "$sha" -- . ':(exclude).kdbp'; done \
  | grep -v '^$' | sort | uniq -c | sort -rn
```

**Output:**
```
Bug-Fix Concentration (where fixes cluster, last 60 days):
  🔴 <dir>/ — <N> of <M> fix commits (<Z>%)
     Top files: <path> (<n>), <path> (<n>)
     Pattern: [one-sentence summary of the fragile core]

  ⚠️ <dir>/ — <N> of <M> fix commits (<Z>%)
     Top files: <path> (<n>)
```

Examples are FORMAT ONLY — never reuse their names or numbers.

### 5. Scope Creep (Plan vs Actual)

Compare what was planned (from GSD phase plan or CE brainstorm) against what files were actually changed. Surfaces unplanned work and missed scope.

**Detection:**
- Read the plan, first match wins: `.kdbp/PLAN.md` (active phase block — extract file references from Scope/Description) → `.planning/phases/*/PLAN.md` → `docs/plans/*.md` → `docs/brainstorms/*-requirements.md`. For the `.kdbp/PLAN.md` branch, ask `mcp__gabe-kdbp__phase_context` with `phase:` = the id under `## Current Phase` (unset, the tool takes PLAN.json's `current_phase` or the FIRST table row — never the pointer — so a stale or absent mirror would diff the wrong phase's scope) instead of parsing the block by hand — it returns `plan_json.scope` (the phase's declared globs), the `records.reach` and `records.cases` lines, a `details_excerpt` of the phase section (capped at 2,000 chars — read PLAN.md itself when the section runs longer), and the `pending_in_scope` rows already owed there; honest-empty without `.kdbp/`, and a FLOOR — a file named in the phase prose but outside `scope` still counts as planned. Print the source used in the section header (`Scope Creep — Phase 3 (source: .kdbp/PLAN.md)`); if none found: `no plan found (searched 4 paths) — skipping scope analysis`.
- Extract file references from the plan
- Run `git diff --stat [base-branch]..HEAD` to get actual changed files
- Compare: planned vs touched, unplanned touches, planned but untouched

**Output:**
```
Scope Creep — Phase 3 (Recipe Detail View):
  Planned: 6 files | Touched: 9 files | Unplanned: 4 files | Missed: 1 file

  Planned and touched:
    ✅ src/pages/RecipeDetailPage.tsx
    ✅ src/components/RecipeCard.tsx
    ✅ src/services/recipes.ts
    ✅ src/stores/recipeStore.ts
    ✅ src/types/recipe.ts

  Unplanned (touched but not in plan):
    ⚠️ functions/src/rateLimiter.ts — why? Refactoring unrelated to recipe detail
    ⚠️ functions/src/suggestRecipes.ts — pulled in by rateLimiter coupling
    ⚠️ src/services/pantry.ts — 3 lines changed (minor, likely acceptable)
    ⚠️ firestore.staging.rules — shared infra, cross-app risk

  Planned but untouched:
    ❌ functions/src/recipeDetail.ts — was this dropped from scope?

  Suggest: Review unplanned touches. If rateLimiter refactor was necessary,
  it should have been a separate PR (V3 — Ship Small).
```

### 6. Deferred Items & Maintenance Staleness

Track the health of deferred technical decisions and, for legacy projects, maintenance obligations.

**Detection:**
- Ask `mcp__gabe-kdbp__kdbp_snapshot` first — `pending{open, closed, columns, top}` (top = 10 rows sorted priority then Times Deferred, closure-aware) answers the counts and the escalation candidates in one read — then read `.kdbp/PENDING.md` itself for the full priority tally, for row ages (the snapshot carries no dates), and for any Times Deferred ≥ 2 row that fell outside the top 10
- `.kdbp/MAINTENANCE.md` is retired from the default KDBP inventory (A2) — most projects won't have one. If a legacy copy exists (current `.kdbp/` or `.kdbp/archive/retired/`), read it and check "Last completed" date against today; otherwise skip this sub-check silently.
- Flag items approaching escalation (Times Deferred >= 2)

**Output:**
```
Deferred Items — .kdbp/PENDING.md:
  Open: 3 items (1 critical, 1 high, 1 medium)
  ⚠️ D2 approaching escalation (deferred 2x, next defer → priority bump)
  Oldest open: D1 (45 days) — coverage gap in classify.py

Maintenance — .kdbp/MAINTENANCE.md (legacy, only if present):
  Last completed: 2025-10-01 (198 days ago)
  ⚠️ Overdue — quarterly checklist not completed in 180+ days
  Suggest: Review MAINTENANCE.md checklist items
```

**Skip if:** `.kdbp/` directory doesn't exist. The Maintenance sub-block renders only when a legacy `.kdbp/MAINTENANCE.md` is present — omit it entirely otherwise, never report it as "missing".

---

## Output Format

### Severity legend + evidence gate

- `.kdbp/**` is lifecycle bookkeeping — §1–§4 exclude it and analysis 6 covers it; a `.kdbp/` path in a §1–§4 row means the filter was skipped, so the row is void. Mass commits (>200 files) and paths gone from HEAD are dropped from §1–§3 and named in the header.
- Churn: 🔴 >300 lines or top-10% · ⚠️ >100 · ✅ below. Fix concentration: 🔴 ≥50% of fix commits in one dir · ⚠️ ≥20%. God files: 🔴 >25% of commits · ⚠️ ≥20%. Coupling: 🔴 >60% co-change.
- Every number in the report is copy-pasted from command output produced THIS run. The header `Commits: [total]` from `git log --since=N.days --oneline | wc -l` is the checksum — if you cannot produce it, the analysis did not run; print `<analysis> skipped`, never an estimate.

### Full Mode (default)

```
📊 GABE HEALTH — [Project Name]
   Period: last [N] days | Commits: [total] | Files: [unique files touched]
   Outlier commits excluded: [<sha> — <N> files, <L> lines · … | none]

[1. God Files]
[2. Churn Hotspots]
[3. Coupling Clusters]
[4. Bug-Fix Concentration]
[5. Scope Creep (if plan exists)]
[6. Deferred Items & Maintenance (if .kdbp/ exists)]

Summary:
  🔴 Critical: [count] god files, [count] fragile modules
  ⚠️ Watch: [count] coupling clusters, [count] churn hotspots
  ✅ Stable: [list of stable areas]

  Top risk: [one-sentence summary of where the codebase is most fragile]
  Suggest: [one action — e.g., /gabe-roast architect functions/src/]
```

This report obeys the **findings contract** (`../../gabe-docs/references/execution-contract.md` §"The findings contract"): every `<path>` and every `<fileA> ↔ <fileB>` pair in analyses 1–6 renders as a clickable workspace-relative link — the detection commands already surface the paths, so it costs nothing. And **each finding carries its own `→ next` step**, taken from the Integration table below (a god file → `/gabe-roast architect [file]` · a coupling pair → `/gabe-assess` · a churn hotspot → `/gabe-review [file]`) — not just the one global `Suggest:` line. Churn Hotspots and Coupling Clusters, which render no per-finding step today, must each name theirs per row. Where the project carries a command center, run `mcp__gabe-map__owner_of` once over the flagged paths (and the fix-concentration directory — it takes a directory and returns per-entity file counts plus its `unclaimed_in_census` list) and name the owning entity beside each path; a path the map does not claim is itself the census gap the tool names. The entity is an ANNOTATION on the finding, never a replacement: the git numbers stay the finding, and the `→ next` step stays the one the Integration table gives.

### Single Analysis Mode

When invoked with a focus (e.g., `/gabe-health coupling`), only that analysis runs.

---

## Estate-sweep lens (`/gabe-health estate`)

Ask-first, never auto: every proposal is presented with its evidence and nothing is created or archived
without an explicit yes. Two directions — PROMOTE (a behavior recent work repeated that deserves a skill)
and ARCHIVE? (an installed skill with no use in the window). The rules below bind the ARCHIVE? side.

**Scope.** The suite repo's `skills/gabe-*/` plus `skills/dev-conventions/` — what `install.sh` installs.
A skill under `~/.claude/skills/` that the suite repo does not carry (a user-level skill such as
`pixellab-icons`) is listed on one `not suite-managed` line and NEVER proposed for ARCHIVE?: it is the
user's machine-wide estate, available to every project, and outside this sweep's authority.

**Evidence of use — one pass, run alone.** Invocations come from the transcripts, read ONCE for every
skill (the store runs to 100+ GB on a long-lived machine — minutes of reading, never one pass per skill,
never beside another heavy job):

```bash
grep -rhoE '"name":"Skill","input":\{"skill":"[^"]+"|<command-name>/?[A-Za-z0-9:_-]+</command-name>' \
  --include='*.jsonl' ~/.claude/projects | sed -E 's/.*"skill":"//; s/"$//; s/<\/?command-name>//g; s/^\///' \
  | sort | uniq -c | sort -rn
```

The WINDOW is the transcript retention, not a chosen lookback: its start is the oldest transcript's first
`timestamp`, and the header prints it — `Window: <oldest> → <today> (<D> days, transcript retention)`.
"0 invocations" is claimed over that window only, never as "unused".

**Inbound references.** Whole-name matches (`\b<name>\b`) across the suite repo — `skills/`, `templates/`,
`scripts/`, `docs/`, `CLAUDE.md`, `README.md` — EXCLUDING the skill's own directory; reported as
lines / files / skills. Two classes decide more than a count:

- **HARD** — a reference from code (`*.py *.mjs *.js *.sh`) or a routing/dispatch table (e.g.
  `gabe-next/scripts/next.mjs` routes to `/gabe-mockup`; `gabe-map/scripts/mapquery.py` loads
  `gabe-cc-entity`). Any HARD reference forces **KEEP** — archiving would break running code.
- **Loaded by description** — a skill the model loads when its description matches the task
  (`dev-conventions`, and any skill without `disable-model-invocation`) needs no pointer, so a zero
  reference count is its normal state. ARCHIVE? for it needs zero invocations in the window — a
  reference count never decides it.

**Gated skills.** A skill that only fires for one project shape (`gabe-mockup` for mockup/hybrid projects,
the `gabe-cc-*` family only where a command center exists) gets a caveat instead of ARCHIVE? when the window
saw no project of that shape.

**Output.** Per skill: `invocations (window)` · `refs lines/files/skills` · `HARD: <file:line> | —` ·
proposal `KEEP | ARCHIVE? | PROMOTE?` with its one-line reason. An accepted ARCHIVE? moves the skill to
`skills/_archive/` AND removes every pointer to it (help-spec, pulse-spec, tool-registry, CLAUDE.md, README)
in the SAME change — a pointer left behind names a skill that no longer installs.

---

## Integration with Gabe Suite

| Health finding | Suggested action |
|----------------|-----------------|
| God file detected | `/gabe-roast architect [file]` — structural review to plan decomposition |
| Coupling cluster | `/gabe-assess` — evaluate whether to decouple now or accept the coupling |
| Bug-fix concentration | `/gabe-review` on that area — price the risk of current state |
| Scope creep | `/gabe-assess brief` — values alignment check on unplanned work |
| High churn + hot file in next PR | `/gabe-review` will show 🔴 HOT churn flag — extra scrutiny on defer decisions |

---

## When to Run

| Moment | Why |
|--------|-----|
| Before starting a new epic/milestone | Know where the minefields are |
| During sprint retrospective | "Why did this sprint feel fragile?" — data-backed answer |
| After a production incident | "Is this area inherently unstable?" |
| Before major refactoring | "Which files should I split/stabilize first?" |
| Monthly cadence | Track health trends over time |

This is NOT a per-commit tool. Run it periodically for strategic insight.

---

## What This Does NOT Do

- Does NOT review code (use /gabe-review or /gabe-roast)
- Does NOT check values alignment (use /gabe-assess)
- Does NOT block commits or PRs (purely analytical)
- Does NOT require `.kdbp/` to exist (works on any git repo)
- Does NOT modify any files (read-only analysis)
