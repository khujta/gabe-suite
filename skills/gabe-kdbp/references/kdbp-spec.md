# gabe-kdbp — the binding tool contract

> Deep spec for `skills/gabe-kdbp/scripts/{server.py, kdbp_tools.py}`. Wire laws are gabe-map's (`mcpwire.py`, map-spec §2):
> one text channel, routing by shape, `-32601` with the id echoed pre-initialize, roots, lazy load. This file binds the
> KDBP-state tools. Design record: `docs/design/gabe-map/README.md` §15.

## 1 · What it is, and is not

Read-only tools over a project's `.kdbp/` plus git. **Not a writer**: `pending_row_preview` and `ledger_row_preview` return
the exact row text and write nothing — the D7 lie-block hooks (`plan-proof-guard`, `pre-checkpoint`, `red-entry-guard`)
watch the harness's `Write|Edit|MultiEdit` and `Bash`, not `mcp__*`; a `.kdbp` writer inside a tool would be the bypass
`pre-checkpoint.sh` already warns about (D14, open ruling). **Not a rail**: beats still run on hooks and gates; these tools
replace the *reading* a beat did by hand (handoff's ~60k-token gather, execute's Step 0–1, review's Step 0.3, the gate's
Step 2.0 binding) with one call each.

## 2 · Root and honest-empty

Root per call: `root` argument → `CLAUDE_PROJECT_DIR` → `roots[0]` → cwd, then the git toplevel (gabe-map's
`mapquery.resolve_root`). `.kdbp/` must be a directory under that root; otherwise every tool answers
`{present:false, reason: "no .kdbp/ under <root> — not a KDBP project (run /gabe-init …)"}` with `isError:false`. A missing
file inside `.kdbp/` is a `reason` on that section, never a crash. Bad input → `{stop}` with `isError:true`.

## 3 · Parsers — header-resolved, closure-aware

- **Tables** are found by a header keyword (`Exec` for the PLAN table, `Finding` for PENDING, `Entry` for LEDGER) and columns
  resolved BY NAME (`_col(hdr, "Phase", "ID", "#")`…), never positionally — twins' schemas diverge (`| # | Gate | Finding |`
  vs the 11-column canon; PLAN tables with/without Red/Center).
- **Cell states**: `✅|done|complete` → `done` · `🔄|wip|in progress` → `active` · `skip*|⏸|n/a` → `skipped` · else `todo`.
- **PENDING closure**: a Status cell starting with `CLOSED|RESOLVED|WONT-DO|SUPERSEDED|DONE|FIXED`, OR a `<!-- P<n> … resolved` /
  `<!-- #<n> … resolved` comment on the line after the row. An empty Status is OPEN, never "unknown". Archive rows
  (`.kdbp/archive/PENDING-resolved*.md`) are read only for the next-id mint.
- **Phase records** in the `### Phase <id>` section of PLAN.md: `- **Cases:**`, `- **Reach:**`, `- **Class:**`, `- **Proof:**`,
  `- **Searched:**`.
- **Verify Commands** (`## Verify Commands` in BEHAVIOR.md): bullets `- lint|types|typecheck|tests|results_out: …`, commands as
  backticked spans; `results_out` split on `·`/`,`.

## 4 · Tools

Common: `root?`. Lists capped at 40 with the cap named.

### 4.1 `kdbp_snapshot()`
`git{branch, ahead, behind | upstream:none, dirty{modified, untracked, total}, recent_commits[≤8]}` · `plan{present, status,
current_phase, goal ≤200, phases[{id, name ≤60, cells{col: state}}] ≤40, mirror}` · `pending{open, closed, columns, top[≤10 by
priority then Times Deferred desc: id, finding ≤120, file, priority, times_deferred], note}` · `ledger{last[≤5]}` ·
`decisions{rows}` · `files[]`. Target ≤ 1k tokens (gustify: ~3 KB).

**`plan` reads two sources, and they can disagree.** `status`, `current_phase` and `goal` come from **PLAN.json only**; `phases` comes from **PLAN.md**'s table. On a project whose mirror is stale or absent, `status` and `current_phase` are `null` and `goal` is `""` while `phases` populates normally — that is the honest state of the files, not an empty plan. Read `mirror` before treating a `null` `current_phase` as "no active phase"; the phase table is the fallback the other tools already use.

### 4.2 `phase_context(phase?)`
`phase` (default PLAN.json `current_phase`, else the first table row) · `plan_json{id, name, tier, complexity, types, cells,
proof, proof_type, cases, scope, entities}` · `plan_md_row{cells (states), raw, line}` · `records{cases, reach, class, proof,
searched}` · `details_excerpt` (≤ 2,000 chars of the phase section) · `behavior{maturity?, mode?, verify_commands}` ·
`pending_in_scope[]` (open rows whose File matches the phase's `scope` globs) · `entities{slug: brief}` via gabe-map's
`entity_context` (or a `reason`) · `warnings[]` — "Red is unstarted…" (only where the table carries a `Red` column — a plan without one is not a TDD project, and a missing cell is never read as ⬜), "Exec already ✅", "no declared entities…".

**`behavior` is conditional, not guaranteed.** When no phase resolves — no `phase` argument, no PLAN.json `current_phase`, and no table rows — the tool returns early with `phase: ""` and a single entry in `warnings[]` (`no active plan — PLAN.json has no current_phase and PLAN.md has no phase table`) — there is no `reason` field — and the answer carries **no `behavior` block at all**. A KDBP project between plans is the normal way to hit this. A caller that needs the verify binding on its own asks `verify_commands()` directly rather than reaching into `behavior`.

### 4.3 `review_target(phase?)`
The first PLAN row with Review `todo` and Exec `done|active` (or the forced `phase`) → LEDGER rows whose Theme/Entry name
`Phase <id>`, **dated on or after the plan's Created date** (`floor`: PLAN.json `created`, else the PLAN.md `**Created:**`
line; phase ids repeat across plans, so without it every earlier plan's "Phase 1" joins the scope) **and whose Entry is RED,
EXEC or COMMIT** (a HANDOFF, PLAN, PUSH or CENTER row cites bookkeeping shas, not the phase's work) → shas in their Commits
cell → `git show --name-status` union (A/M/R/C only) → `changed_files` (≤40, `changed_more`), `commits`, `base` = parent of
the earliest resolved sha, `floor` + `floor_source`, `skipped_rows{before_floor, not_a_commit_entry}`, `source`, `banner`.
The floor is a DATE: an earlier plan's rows dated the same day as the new plan's creation still pass. No Created date →
`floor: null` and a `floor_source` that says every plan's rows match. No row → `target:null`, `reason`, and the spec's
fallback `git diff --name-only HEAD` with `base: HEAD`.

### 4.4 `next_beat()`
Spawns `node <skills>/gabe-next/scripts/next.mjs --json` in the root; `exit` (0 decision · 1 no decision · 2 mirror unusable ·
127 node missing) mapped to `meaning`; `decision` = the parsed payload `{next, reason, phase, name, state, now_line, next_line,
advance_to, warnings, project_type}`; `stderr` when non-empty. Never advances anything.

### 4.5 `verify_commands()`
`source: a` when BEHAVIOR's `## Verify Commands` binds (`commands{lint[], types[], tests[], results_out[]}`); else `source: b`
candidates from `package.json` scripts (root and `apps/web|apps/api|web|api`), `pyproject.toml` (pytest · ruff), `Makefile`
targets, with an `offer` to write the binding into BEHAVIOR; else `source: none`. **`probed: false` always** — the gate runs
commands, the tool never does, and a reporter flag is never invented.

### 4.6 `pending_row_preview(flag)` — PREVIEW
`flag{description (required), dimension, entity, severity|priority, fix|impact, source, file, scale}` → `row` in the file's own
column order (canonical 11 columns when the file is new), `next_id` minted over live + archive rows, in the prefix MOST of the file's rows carry (`#N` · `PN` · `DN` · a bare
`N`; `P` for an empty file — a preview never decides a project's id style), `Verified: @<sha> <date>`, `recurring_candidates` (open rows with the same File and ≥3 shared words),
`writer` (names `scripts/disposition.py --defer` when the project has it). `writes: nothing`.

**Two cells are fixed, not derived:** `Times Deferred` is always `1` (a preview composes a NEW row; a repeat finding is the `recurring_candidates` path, where the existing row's counter is bumped instead) and `Status` is always blank (a row is born open; closure is the disposition step's verdict token). A caller that wants either cell to say something else edits the composed row before the Write.

### 4.7 `ledger_row_preview(entry, theme, commits?, gates?)` — PREVIEW
`entry ∈ PLAN RED EXEC REVIEW COMMIT PUSH CENTER HANDOFF SCOPE ASSESS`; `row` in the LEDGER header's order (canonical 5 columns
when absent, `header_found:false` + reason); the Gates cell is copied verbatim, never composed. `writes: nothing`.

## 5 · Instructions block
`kdbp_tools.INSTRUCTIONS` — one routing line per question, the preview law, the no-`.kdbp` behaviour. Changed in the same
commit as any tool rename.

## 6 · Battery (tests/gabe-kdbp/run.sh)
Hermetic `.kdbp` fixture in a temp git repo (PLAN.md table with Red/Exec/Review/Commit/Push/Center · PLAN.json mirror ·
Phase Details with `Cases:`/`Reach:` · PENDING.md in the 11-column canon with one closed-by-token, one closed-by-comment and
two open rows · LEDGER.md with `Phase P2` rows carrying real fixture shas · BEHAVIOR.md with `## Verify Commands`), plus a
variant repo with a divergent 3-column PENDING and no BEHAVIOR binding but a package.json. Pins: honest-empty without
`.kdbp`; snapshot counts (open 2 · closed 2) and phase states; phase_context records + Red-unstarted warning + entities via
gabe-map (fixture center) or the honest reason; review_target via LEDGER shas (changed files, base = parent) and the
git-diff fallback; next_beat exit mapping (node present or 127); verify_commands a/b/none; previews never write (byte-identical
files after), next-id over archive, recurring flag, header-order row; wire law: pre-init `server/discover` → -32601 on THIS
server too. Mutation hooks: `SERVER_OVERRIDE` (same-dir copies) + `GABE_SKILLS_DIR`.
