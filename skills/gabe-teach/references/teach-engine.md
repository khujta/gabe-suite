# Gabe Teach — engine (re-homed)

> Re-homed verbatim from `commands/gabe-teach.md` (B2 skills-only migration, 2026-07-09).
> This file is the binding spec; the SKILL.md core is a thin summary. E1–E7 contract:
> see `../../gabe-docs/references/execution-contract.md`.

Countermeasure for "the human can't keep up with AI-paced changes." Keeps the human at architect-level understanding: WHY decisions were made, WHEN patterns apply, WHERE files belong. Topics are anchored to **gravity wells** (architectural sections of the app) so the human builds a map before individual details.

**Design principle — teach-first, config-last.** Every bare-ish invocation renders a lesson or narrative, never a dashboard. Dashboards, catalog browsing, wells editing, and history browsing all live behind explicit subcommands (`status`, `arch browse`, `wells`, `history`, `arch dashboard`). When the user invokes `/gabe-teach` with no clear configuration intent, pick the most relevant teaching surface and render it immediately. Ask the same four verbs everywhere so nothing has to be memorized: `[explain]` / `[next]` / `[test]` / `[skip]` — see the **Universal Action Menu** section below.

> **Rendering note.** Output templates in this spec wrapped in bare triple-backtick fences are spec-meta delimiters — render contents as plain markdown at runtime. Lesson bodies, well dashboards, topic tables, and prompts render as markdown, not monospace code. Tagged fences (```python, ```mermaid, etc.) stay fenced. See `gabe-docs/SKILL.md` § "Runtime output rendering convention".

## Procedure

### Step 0: Detect mode

Parse `$ARGUMENTS`:

| Mode | Kind | Purpose |
|------|------|---------|
| _(empty)_ | teach | **Default.** Renders the top-level mode menu (Step 0.3) with a smart-pick default on press-Enter. Users who prefer pure auto-route (v2.1 behavior) can set `teach_default_mode: auto` in `.kdbp/BEHAVIOR.md` or `~/.claude/gabe-lens-profile.md` frontmatter. |
| `topics` | teach | Session-aware teach loop over recent project changes |
| `arch` | teach | Alias for `arch next` — picks and teaches the next concept immediately (NOT the dashboard) |
| `arch next` | teach | Pick the next concept via progressive-pressure rule (project → adjacency → foundation-gap) and teach it directly |
| `arch show <id>` | teach | Teach one architecture concept via the 6-part lesson template |
| `retro` | teach | Retrospective teach: skipped topics + superseded decisions + what-went-wrong lessons |
| `tour` | teach | Newcomer tour: walks wells → paths → files → key decisions. Answers "how does this app work?" |
| `story` | teach | Show cached Storyline, or generate if missing (narrative analogy of the whole project) |
| `story refresh` | teach | Force regeneration of Storyline |
| `free [concept]` | teach | Raw analogy generation (invokes `gabe-lens` skill) |
| `brief` | orient | Newcomer-onboarding snapshot: app purpose + wells overview + recent activity |
| `status` | admin | Show KNOWLEDGE.md summary per well + history timeline (dashboard) |
| `arch browse [tier\|spec]` | admin | List concepts from the `gabe-arch` skill, filterable (catalog view) |
| `arch dashboard` | admin | Tier × specialization map of verified/pending concepts (the legacy `arch` rendering) |
| `arch verify <id>` | admin | Mark a concept as already-known (test-or-skip shortcut) |
| `wells` | admin | List/edit wells (rename, merge, archive, view topics per well) |
| `init-wells` | admin | Run the wizard to define gravity wells |
| `learning` | admin | View and adjust `~/.claude/gabe-lens-learning.md` — current patterns, active tailorings, review cadence. Supports `learning reset` (clear all tailoring), `learning pattern <id>` (inspect a specific pattern) |
| `history` | admin | Full timeline — plans, phases, commits, sessions, topics |
| `history full` | admin | Unbounded history (default shows last 10 sessions + last 5 plans) |
| `scope` | teach | Teach WHY sections of your own SCOPE.md + per-phase Why paragraphs from ROADMAP.md. Only available when both files exist. Renders premise + primary user JTBD + current phase Why as a lesson. Requires foundation: SCOPE.md § anchors (`{#sc-NN}`, `{#req-NN}`, `{#phase-N}`). |
| `scope <anchor>` | teach | Teach one specific anchor, e.g. `scope sc-01`, `scope req-02`, `scope phase-3`. Deep-link lesson. |

**Routing rules:**

- **`teach` modes** render a lesson body and end with the Universal Action Menu. No dashboards, no config prompts mid-flow (except the foundation gate on first-ever run).
- **`orient` modes** render a snapshot; prompt with `[teach]` to drop into teach-first auto-routing.
- **`admin` modes** render a dashboard or editor; no lesson, no 4-verb menu.
- When ambiguous, prefer teach over admin. A user who wanted a dashboard can say so; a user who typed `/gabe-teach` and got a dashboard has been served the wrong thing.

If `.kdbp/` doesn't exist: fall back to `free` with a note: "No KDBP detected. Running in free mode. Run `/gabe-init` to enable knowledge tracking."

### Step 0.5: Foundation Gate

Before `topics`, `status`, `history`, or `story` modes run, verify foundation pieces are in place. Silently pass if all OK; stop and prompt if something's missing.

**Check:**
1. `.kdbp/KNOWLEDGE.md` exists
2. KNOWLEDGE.md has a `## Gravity Wells` section with at least one well row (not just the "Status: uninitialized" placeholder)

**If wells are missing:**

```
FOUNDATION CHECK:
  .kdbp/BEHAVIOR.md          ✅
  .kdbp/KNOWLEDGE.md         ✅
  Gravity Wells defined      ❌ (status: uninitialized)

⚠ /gabe-teach cannot organize topics without gravity wells.
  Topics would land as orphans.

  [init] Run /gabe-teach init-wells now (recommended)
  [skip] Proceed anyway, topics assigned to "G0 Uncategorized"
  [abort] Cancel this /gabe-teach run

Choice:
```

- **init** → run Step 2 (the wizard) inline, then continue with the original mode
- **skip** → create a `G0 Uncategorized` well row automatically, show: `ℹ Topics will land in G0. Run /gabe-teach init-wells when ready to organize.`, continue
- **abort** → stop cleanly

This gate only fires once per project's lifetime — once wells exist, the gate passes silently.

### Step 0.7: Universal Action Menu

Every teach-mode lesson (project topic, arch concept, retro lesson, tour stop) ends with the same four-verb menu. No mode-specific variants. Humans learn the controls once.

- **[explain]** — Re-teach from a different angle. Cheaper-model call, different analogy or deeper primary force. Does NOT change status. Use when the lesson didn't land.
- **[next]** — Answer Q1/Q2 now → classify (2/2 = verified, 1/2 = verified weak, 0/2 = pending) → **write-back immediately** (KNOWLEDGE.md, STATE.md, HISTORY.md, Sessions log as applicable per mode) → auto-advance to the next lesson (same mode's next pick) or announce done.
- **[test]** — Skip the lesson body; jump straight to Q1/Q2 only. For humans who claim prior knowledge — this is the "sanity-check shortcut." 2/2 → `already-known (sanity-checked)` or `verified (verify-quick)` depending on mode. Write-back happens on the same path as `[next]`.
- **[skip]** — Mark skipped (session-only for arch mode, persistent for project topics) with a one-line write-back, then pick the next lesson. After 3 skips in one session, fall through to `status`.

**Grading gate (every classify).** When generating Q1/Q2, also write a one-line EXPECTED-ANSWER KEY per question, anchored to a lesson section (not shown to the user). At classify, quote the key next to the human's answer and score against the KEY, not against plausibility: 2/2 requires the answer to state the key's load-bearing idea. Uncertain → score the LOWER band (1/2 not 2/2; 0/2 not 1/2) — never round up. Inflated `verified` rows poison KNOWLEDGE.md and global `~/.claude/gabe-arch/STATE.md` picks. Applies to Step 4d item 4 and every mode routed through the Universal Action Menu.

**Session-loop semantics (D1=C — multi-lesson loop with per-lesson write-back):**

A single `/gabe-teach` invocation may render multiple lessons in sequence. After every lesson's classify step, **write-back runs before the next lesson renders** so mid-session abort (Ctrl-C, context loss, tab close) leaves durable progress on disk. No state is held only in memory across lessons. Concretely:

1. Render lesson N.
2. User picks a verb (`[next]` or `[test]`).
3. Classify Q1/Q2 → compute status.
4. **Write-back now** — update KNOWLEDGE.md Topics row (Status + ArchConcepts), append HISTORY.md row for arch concepts, append Sessions log line. Use the Edit tool's match-replace on exact row content so a stale in-memory view causes a loud failure rather than a silent clobber.
5. Tick the session counter (topics session-cap = 3 across `[next]` + `[test]`; retro + tour share the same cap).
6. If cap reached → render "Session complete — N lessons covered." and exit.
7. Else → render lesson N+1, go to step 2.

If step 4 fails (Edit tool collision because another command modified the row), abort the loop with a clear message — do NOT retry silently. The human re-invokes `/gabe-teach`; the current lesson re-appears as pending.

**Mapping from legacy mode-specific verbs:**

| Legacy verb | Unified verb | Notes |
|-------------|--------------|-------|
| `verified` (correct on Q1/Q2) | `[next]` → scores 2/2 or 1/2 | Same write path to KNOWLEDGE.md / STATE.md |
| `pending` (wrong on Q1/Q2) | `[next]` → scores 0/2 | Same write |
| `skipped` | `[skip]` | Same write |
| `already-known` sanity-check | `[test]` | 2/2 classifies `already-known (sanity-checked)` |
| `quick-check` (Step 9d) | `[test]` | Q1 only, 1/1 → verified |
| `skip-check` (Step 9d) | `[next]` with no lesson rendered | Auto-scores `—/—`, writes `verified (verify-skip)` |
| `teach` / `cancel` | _n/a_ | Lesson renders by default; exit = no input |
| `view N`, `rename N`, `merge N M` | _Remain in `wells` admin only_ | Never in a teach lesson |

**Auto-advance on `[next]`:**

- From `topics` lesson: next pending candidate, else fall through to `arch next`.
- From `arch next` lesson: re-run Tier 1 → 2 → 3 rule; render new pick.
- From `arch show <id>` lesson: do NOT auto-advance. End with "Lesson complete. `/gabe-teach` for next."
- From `retro` lesson: next skipped/superseded, else "Retrospective clear."
- From `tour` stop: advance to next well, else "Tour complete."

**Shortcut keys:** `e` / `n` / `t` / `s` accepted as single-letter aliases. Case-insensitive.

### Step 0.3: Bare-invocation mode menu

Fires when `$ARGUMENTS` is empty AND `teach_default_mode` is not set to `auto` (default: `menu`). Restores the top-level mode chooser that v2.1 D1 had removed in favor of pure auto-route.

**Rationale for the v2.7 reversal:** auto-route is great when you trust the smart pick; but when you know what you want — "I want to learn architecture" vs "I have pending topics" vs "let me see what we walked away from" — the menu lets you skip the smart-pick logic and go directly to your chosen mode. Press-Enter still gives you the auto-route in one keystroke.

**Render format** (counts and "next pick" lines computed deterministically from KNOWLEDGE.md, gabe-arch STATE.md, DECISIONS.md, and gabe-lens-learning.md):

```
GABE TEACH — pick what you want to learn

  [1] TOPICS    — changes you just made
                  3 pending · G1 (2) + G3 (1) · since 2026-04-17
  [2] ARCH      — architecture curriculum
                  next pick: retry-with-exponential-backoff (intermediate · adjacency)
                  1 verified · 30 in catalog
  [3] RETRO     — what didn't work
                  1 skipped topic · 1 superseded decision (architectural)
  [4] TOUR      — how this app works
                  6 wells defined
  [5] STORY     — narrative analogy of the project
                  cached 2026-04-18 (3 verified topics, 1 plan)
  [6] BRIEF     — newcomer-onboarding snapshot
  [7] LEARNING  — your patterns + active tailoring (admin)
                  P1 distinction conflation: 2 obs · 1 active tailoring

  ↵ press Enter to accept the smart pick: [2] ARCH (next concept)
  Or type the number, or type the mode name:
```

**Smart-pick logic (preserves v2.1 auto-route as the press-Enter default):**

1. If pending project topics exist → smart pick = `[1] TOPICS`
2. Else if arch concepts have un-verified candidates → smart pick = `[2] ARCH`
3. Else if retro candidates exist → smart pick = `[3] RETRO`
4. Else → "you're current" one-liner; smart pick prompt becomes "no obvious next lesson — pick from menu or run `/gabe-teach status` to review."

**Counts construction (zero-LLM, deterministic):**

| Line | Source |
|------|--------|
| TOPICS pending count | `.kdbp/KNOWLEDGE.md` Topics table — `Status = pending` rows, grouped by Well |
| TOPICS "since" date | Earliest commit date among pending topics |
| ARCH next pick | Step 9f progressive-pressure rule (project-driven → adjacency → foundation-gap), name + tier + which rule fired |
| ARCH counts | `~/.claude/gabe-arch/STATE.md` row counts (verified) + concept catalog scan (total) |
| RETRO counts | KNOWLEDGE.md `Status = skipped` + DECISIONS.md `Status = superseded` (filtered to architectural per L6) |
| TOUR wells count | KNOWLEDGE.md Gravity Wells table row count |
| STORY cached date | mtime of the Storyline section in KNOWLEDGE.md |
| BRIEF | always available; no count |
| LEARNING | `~/.claude/gabe-lens-learning.md` — pattern count + active tailoring count |

If a count is zero, render the option but mute it visually with a `(none)` marker:

```
  [3] RETRO     — what didn't work  (none)
```

**Input handling:**

- Empty input / Enter → execute smart pick (proceed to that mode's Step)
- Number `1-7` → execute that mode
- Mode name (`topics`, `arch`, `retro`, `tour`, `story`, `brief`, `learning`) → execute that mode
- Unknown input → re-render menu with hint: `Didn't recognize "<input>". Press Enter for smart pick, or type a number 1-7.`

**BEHAVIOR.md / profile.md opt-out:** key `teach_default_mode: menu | auto` (default: `menu`).

- `menu` → Step 0.3 fires on bare invocation (this step)
- `auto` → Step 0.3 skipped; bare invocation auto-routes per v2.1 logic (TOPICS → ARCH next → RETRO → "you're current")

Reversible at any time by editing the BEHAVIOR.md frontmatter, or by running `/gabe-teach behavior` (admin command — out of scope here).

**Edge cases:**

- No `.kdbp/` present → menu renders only `[2] ARCH`, `[6] BRIEF`, `[7] LEARNING` (cross-project surfaces). Other options grayed out with `(no .kdbp/)`. Smart pick = `[2] ARCH`.
- All counts zero → render menu with all options grayed; smart pick prompt becomes "you're current — try `/gabe-teach arch` to learn something new, or `/gabe-teach status` for the dashboard."

### Step 1: Status mode

If mode is `status`:

1. Read `.kdbp/KNOWLEDGE.md`
2. Show per-well coverage dashboard:
   ```
   KNOWLEDGE MAP — [project name]

   Gravity Wells ([N] defined):

     G1 Guardrails     ▓▓▓▓▓▓░░░░  60%  (3/5)  app/agent/guardrails*        · 4 commits <14d
     G2 LLM Pipeline   ▓▓░░░░░░░░  20%  (1/5)  app/agent/pipeline*          · 0 commits <14d
     G3 API Layer      ░░░░░░░░░░   0%  (0/2)  app/api/**                   · 2 commits <14d
     G4 Frontend       ▓▓▓▓▓░░░░░  50%  (1/2)  (paths not set)              · — commits

   Total topics: [N]
     verified:      [N] (avg score X.X/2)
     pending:       [N]
     skipped:       [N]
     already-known: [N]
     stale:         [N]

   Weakest wells to address: [list up to 3]
   Staleness: [N stale topics]
   ```

Per-well row shows: well ID + name, understanding bar, percent understood, verified/total, first Paths glob (truncated to 30 chars, "(paths not set)" if empty), commits_14d count (— if Paths empty). Same pathspec-quoted git log as Step 8a #8.

3. **History timeline (deterministic, zero cost)** — embedded after the dashboard:
   ```
   Recent work:
     📦 Phase 1: Incident Submission + Guardrails (archived 2026-04-16)
        5 sub-phases, all shipped. Topics: T1, T2, T5

     📌 Active plan: Phase 1 Level 2a (Guardrails before LLM)
        Phase 3/5 — Review ⬜ Commit ⬜ Push ⬜

     📝 Recent teach sessions:
        - 2026-04-17: 2 verified, 1 skipped
        - 2026-04-15: 3 verified, 2 skipped, 1 already-known
   ```
   Default bounds: last 5 plans + last 10 sessions. For unbounded view: `/gabe-teach history full`.

4. If stale count > 0: suggest `/gabe-teach topics` to refresh stale items.

5. Stop.

### Step 2: Init-wells mode (the wizard)

Invoked by `/gabe-teach init-wells` OR selected during the foundation gate.

**Step 2a — Scan for signals.** In priority order:

| Priority | Source | What to extract |
|----------|--------|----------------|
| 1 | `docs/architecture.md` | All `## ` (H2) headings |
| 2 | `.kdbp/STRUCTURE.md` Allowed Patterns | Folder patterns already established for this project (bundled per-project artifact) |
| 3 | Top-level folders | `app/`, `frontend/`, `backend/`, `tests/`, `infra/`, etc. |
| 4 | `.kdbp/DECISIONS.md` | Architectural areas mentioned in decisions |
| 5 | `package.json` / `pyproject.toml` scripts | Reveals layers (build, test, lint, deploy) |

**Step 2b — Propose a starter set.** Aim for 4-7 wells. Each well gets a proposed one-line description, a one-liner analogy (via `gabe-lens` oneliner mode — 5-15 words), anchor path globs, and a Docs path.

```
Suggested gravity wells for [project] (from [sources used]):

  G1 — [Name 1]     — [one-line description]
         ↪ Analogy: "[5-15 word gabe-lens oneliner]"
         ↪ Paths:   app/agent/guardrails*, tests/agent/**
         ↪ Docs:    docs/wells/1-guardrails.md
  G2 — [Name 2]     — [one-line description]
         ↪ Analogy: "[oneliner]"
         ↪ Paths:   app/agent/pipeline*, app/agent/triage*
         ↪ Docs:    docs/wells/2-llm-pipeline.md
  ...

Options:
  [accept]   Use as-is
  [edit N]   Rename/redescribe well N
  [relens N] Regenerate analogy for well N
  [paths N]  Edit path globs for well N
  [docs N]   Edit docs path for well N (or clear to opt out)
  [drop N]   Remove well N
  [add]      Add a new well
  [done]     Finish — write wells to KNOWLEDGE.md
```

Path globs are proposed heuristically: (1) folders matching the well name, (2) STRUCTURE.md patterns whose description aligns with the well, (3) top 3 paths from recent commits if signals are sparse. Globs are deliberately loose — `app/api/**` beats `app/api/main.py` for durability.

Docs paths follow the convention `docs/wells/{n}-{slug}.md` where `n` is the well's numeric ID and `slug` is the lowercased, hyphenated Name (e.g., "LLM Pipeline" → `llm-pipeline`). User can edit or clear via `[docs N]` — clearing means "opt out, no docs tracked for this well".

The analogy is generated via one `gabe-lens` call per well in `oneliner` mode. If a well's description is trivial (e.g., "Tests"), the analogy may be the description itself — don't force poetry on what's already clear.

Interactive until user says `done`. Soft cap:

- **>7 wells:** warn but allow: `⚠ [N] wells exceeds Miller's number (7). Consider merging related wells. Proceed? [y/n]`
- **<3 wells:** warn: `⚠ Only [N] wells — unusual for a project with [N] folders. Are you sure? [y/n]`

**Step 2c — Retag existing topics (if any).**

If KNOWLEDGE.md already has topic rows (e.g., user ran `/gabe-teach` before defining wells and chose "skip"), walk them one at a time:

```
[1/N] Topic: "Why guardrails run before the LLM" (currently G0 Uncategorized)

  Proposed well: G1 Guardrails
  Other options: G2 LLM Pipeline, G3 API Layer, ...

  [accept] Use proposed    [N] Pick well by ID    [skip] Leave as G0
```

**Step 2d — Write to KNOWLEDGE.md.**

Replace the `Status: uninitialized.` placeholder with the populated Gravity Wells table, including the `Analogy`, `Paths`, and `Docs` columns. Update topic rows with their assigned wells. Log to LEDGER.md:
```
## [YYYY-MM-DD HH:MM] — /gabe-teach init-wells
WELLS: [N] defined | RETAGGED: [M] topics
```

**Step 2e — Scaffold doc stubs (always prompt).**

After writing KNOWLEDGE.md, offer to scaffold one markdown stub per well with a non-empty Docs path:

```
DOC STUB SCAFFOLDING

  Scaffold [N] doc stubs in docs/wells/? (wells opted-out with empty Docs: [M] skipped)

    docs/wells/1-guardrails.md      (will create)
    docs/wells/2-llm-pipeline.md    (will create)
    docs/wells/3-api.md             (will create)
    ...

  [y]    Scaffold all listed stubs
  [n]    Skip scaffolding (you can create docs manually or run /gabe-teach wells → [docs N] later)
  [pick] Selectively choose which stubs to create
```

**Stub content** (deterministic, zero LLM cost — diagram type picked by heuristic, see `~/.claude/skills/gabe-docs/SKILL.md` "Per-well diagram recommendations"):

```markdown
# [Well Name] — "[Analogy]"

> [Description]

**Paths:** [Paths globs]

<!-- Standards: see ~/.claude/skills/gabe-docs/SKILL.md (CommonMark + Mermaid + analogy-first) -->

---

## Purpose

<!-- 2-3 sentences: what this section of the application does and why it exists. -->
<!-- Populated manually by the human, or auto-appended from verified /gabe-teach topics. -->

## Key Decisions

<!-- Load-bearing choices for this well. Each entry: date + one-line title + 1-2 paragraph rationale. -->
<!-- Example:
### 2026-04-15 — Guardrails run before the LLM, not after
Reasoning: ...
-->

## Key Diagrams

<!-- Suggested diagram type for this well: [DIAGRAM_TYPE] (picked by gabe-docs per-well heuristic) -->
<!-- Replace placeholder with a real diagram once the flow stabilizes. Keep ≤15 nodes. -->

[DIAGRAM_PLACEHOLDER_FENCE]

## Topics (auto-appended)

<!-- /gabe-teach topics appends verified topic summaries here on first run. -->
<!-- Do not edit the structure below this line; edit individual entries freely. -->
```

**Diagram type heuristic** (deterministic, case-insensitive substring match on Well Name + Description; first match wins):

| If matches | `[DIAGRAM_TYPE]` | `[DIAGRAM_PLACEHOLDER_FENCE]` body |
|-----------|------------------|-----------------------------------|
| `api`, `http`, `endpoint`, `route` | `sequenceDiagram` | `sequenceDiagram\n    participant Client\n    participant Server\n    Client->>Server: TODO request\n    Server-->>Client: TODO response` |
| `data`, `schema`, `model`, `db`, `persist`, `migration` | `erDiagram` | `erDiagram\n    ENTITY_A ||--o{ ENTITY_B : TODO` |
| `state`, `lifecycle` | `stateDiagram-v2` | `stateDiagram-v2\n    [*] --> Pending\n    Pending --> Done\n    Done --> [*]` |
| `integration`, `adapter`, `webhook`, `outbound`, `client` | `sequenceDiagram` | (same as API row) |
| default (incl. `pipeline`, `frontend`, `guardrails`, `observability`) | `flowchart` | `flowchart TD\n    A[Start] --> B[TODO]\n    B --> C[End]` |

Wrap the body in a mermaid fence: ` ```mermaid\n<body>\n``` ` — that's the substitution for `[DIAGRAM_PLACEHOLDER_FENCE]`.

The `## Topics (auto-appended)` section is the landing zone for Phase B3 auto-append. The `## Purpose`, `## Key Decisions`, and `## Key Diagrams` sections are for human authoring — the placeholder diagram is intentionally crude so a human replaces it; do NOT over-invest in auto-generated diagrams.

**Skip scaffolding** for wells that already have a file at their Docs path — never overwrite. Report: `ℹ Skipped [N] stubs (file already exists)`.

### Step 3: Wells mode

If mode is `wells`:

```
GRAVITY WELLS — [project name]

  G1 Guardrails     — [description]        [3 verified / 5 total]
  G2 LLM Pipeline   — [description]        [1 verified / 5 total]
  ...

Actions:
  [view N]    Show topics in well N
  [rename N]  Rename well N (topics stay assigned)
  [redesc N]  Edit description
  [relens N]  Regenerate analogy via gabe-lens oneliner
  [paths N]   Edit path globs for well N (used by brief activity signals — see wizard below)
  [docs N]    Edit Docs path for well N (clear to opt out; empty = no docs tracked)
  [opendoc N] Print the Docs path + first heading of each section (quick lookup)
  [merge N M] Merge well N into M (topics reassigned to M)
  [archive N] Archive well N (topics move to G0 or user chooses new well)
  [done]      Exit
```

Non-destructive: rename/merge/archive all preserve topic history in the Sessions log.

**`[paths N]` wizard flow:**

```
G3 API Layer — edit Paths

  Current: app/api/**, tests/api/**
  
  Enter new comma-separated globs (or blank line to cancel):
  > app/api/**, app/routes/**, tests/api/**

  Validation:
    ✅ app/api/**        (valid glob)
    ✅ app/routes/**     (valid glob)
    ✅ tests/api/**      (valid glob)

  STRUCTURE check:
    ⚠ app/routes/** is not in .kdbp/STRUCTURE.md Allowed Patterns
      Add to STRUCTURE.md? (recommended — STRUCTURE is the source of truth) [y/n]

  Write changes to KNOWLEDGE.md + re-run activity signals? [y/n]
```

Validation rules (basic syntax check, no LLM):
- Each glob must be non-empty after trim
- Reject absolute paths (must be project-relative)
- Reject patterns containing `..` (no path traversal)
- Warn (non-blocking) if a glob has no matching files in the current repo

On confirm: rewrite the well's Paths cell in KNOWLEDGE.md, recompute `commits_14d` + `last_commit` for that well, display refreshed activity line.

**`[opendoc N]` quick lookup:**

```
G3 API Layer — Docs

  Path:   docs/wells/3-api.md
  Status: ✅ exists (last modified 2026-04-16, 42 lines)

  Sections:
    # API Layer — "Reception desk..."
    ## Purpose            (authored — 2 paragraphs)
    ## Key Decisions      (authored — 3 entries)
    ## Topics (auto-appended)  (2 verified topics)
```

Prints: file path, existence status, line count, last modified date, and the first-heading summary of each `##` section in the file. Deterministic read; no file modification. If the well's Docs column is empty: `ℹ G3 API Layer has no Docs path set. Run [docs N] to assign one.` If the path is set but the file is missing: `⚠ docs/wells/3-api.md not found. Run /gabe-teach init-wells to scaffold, or create manually.`

### Step 4: Topics mode (the main teach flow)

This is the existing flow, with three changes: wells-aware extraction, wells-grouped menu, enriched session logging.

**Step 4a — Foundation gate** (Step 0.5 above). Block or fall through to Step 4b.

**Step 4b — Extract candidate topics.** Deterministic signals: LEDGER commits, commit message prefixes, new files, DECISIONS changes. **Range (exact):** commits with author-date AFTER the newest Sessions-log timestamp in KNOWLEDGE.md; if no Sessions log exists, the last 10 commits. Echo the resolved range in the output header — `Commits covered: N since <date>` — mandatory in the fast path too, not just the menu. Each candidate carries a structured record used later by Step 4d.

**DECISIONS.md filter (Loop L6, Phase 3/6 of doc-lifecycle work):** when scanning `.kdbp/DECISIONS.md` changes as a topic source, skip rows whose `Status` column contains the `operational` tag (format: `active,operational` or `operational`). These operational decisions are written by `/gabe-push` Phase 5/6 of the doc-lifecycle work and describe infra/deploy choices (blue/green cutover, env var added, CI workflow change) that aren't load-bearing product understanding. The human can still force-surface them via interactive topic selection, but they're not auto-proposed. Rationale: teach is about "why the product works the way it works"; operational decisions are about "how it gets shipped", a different knowledge domain.



```
Candidate {
  title:          "Why 15 → 25 patterns + return matched names"
  class:          WHY | WHEN | WHERE
  well:           G1 (from Paths matching, see table below)
  commits:        [{sha: "a4c9e2f", subject: "feat(guardrails): …"}, …]   (1-N)
  changed_files:  [{path: "app/agent/guardrails.py", added: 40, removed: 12, commit_count: 1}, …]
}
```

Populate from deterministic git calls (no LLM):

- For a single-commit topic: `git show --numstat --format="%H%n%s" <sha>` → first line = sha, second = subject, remaining = `added  removed  path` per file.
- For a multi-commit topic: iterate `git show --numstat --format="%H %s" <sha>` per SHA, aggregate `added`/`removed` per path, and track `commit_count` per file.
- Drop files that are binary (numstat shows `- -`) or outside the repo.

**Assign each candidate a primary well** using the wells' `Paths` column from KNOWLEDGE.md:

| Signal | Well assignment rule |
|--------|---------------------|
| Changed file matches a well's `Paths` glob (most-specific match wins) | Primary well = that well |
| Multiple wells' Paths match (ties broken by glob specificity — longer pattern wins) | Primary well = most specific; add `cross` tag if tie is genuine |
| Commit message explicitly mentions a well's name and no Paths match | Primary well = that well |
| No Paths match AND no name mention | Primary well = G0 Uncategorized |
| Well has empty `Paths` column | Skip that well in path-matching; only name-mention rule applies |

Matching rule: parse comma-separated globs from the Paths column, trim, test each changed file against each glob using standard fnmatch-style globbing (`**` = recursive, `*` = single-segment). If a well has no Paths, it's a valid assignment target only via explicit commit-message mention.

Deduplicate against existing `verified` / `already-known` topics (same as before).

Use one short LLM call to **name** topics (unchanged). Wells are assigned deterministically from Paths — no LLM for that.

**Step 4b.5 — Tag each candidate with architecture concepts.**

Runs after well assignment, before the menu is presented. Attaches `arch_concepts: [concept-id, concept-id]` to each candidate for use in the lesson and final write.

**Layer 1: deterministic match** (always runs, zero LLM cost).

For each candidate, iterate every concept file in `~/.claude/skills/gabe-arch/concepts/**/*.md`. Read each concept's `## Evidence a topic touches this` section and test its three rule types:

| Rule type | Match condition |
|-----------|-----------------|
| Keywords  | Any keyword literal appears in any commit message OR in the topic title (case-insensitive substring) |
| Files     | Any changed file path matches any glob (fnmatch with `**` recursive support) |
| Commit verbs | Any verb phrase appears at the start of any commit subject (case-insensitive, whole-phrase) |

A concept matches if ≥1 rule type matches with ≥1 hit. Collect all matching concepts.

Deduplicate matches and cap at 3 per candidate (tagging more is noise; pick the 3 with the most rule hits, ties broken by tier order advanced > intermediate > foundational since higher-tier matches signal higher-signal topics).

**Layer 2: LLM fallback** (only when Layer 1 returned 0 matches AND the topic has at least one "architectural verb" in its title or commits).

Architectural verb list (deterministic, case-insensitive substring on topic title + commit subjects):

```
cache, retry, backoff, idempoten, queue, schema, migrat, valid, auth, route, guardrail,
stream, fallback, observ, metric, trace, scale, load-balanc, health, deploy, rollback,
circuit, timeout, rate-limit, session, state, context, prompt, tool, token, pagination
```

If ≥1 verb matches AND Layer 1 returned 0: run ONE short LLM call with:

- Model: Haiku-tier (user value U6 — route by task)
- Context: the topic title, 1-line summary from commits, and the catalog index (list of all concept IDs + frontmatter `one_liner` + `tags`)
- Output: structured (PydanticAI output_type or equivalent) — list of 0-3 concept IDs, ranked by relevance
- Max tokens: 200
- Cache: session-scoped catalog index cached for the session (user value — prompt caching)

If the LLM returns IDs that don't exist in the catalog, drop them (deterministic validation).

**Layer 3: human confirmation in Step 4d**. See below.

If both Layer 1 and Layer 2 return 0, the candidate carries `arch_concepts: []` — no tags, Architecture-link section is omitted from its lesson.

**Step 4c — Pick the next lesson (teach-first, no menu by default).**

**Fast path (default — applies to ≥90% of invocations):**

1. Sort pending candidates by recency (newest commit first), then by well with the fewest verified topics (fill in gaps), tiebreak alphabetical by well ID.
2. Take the top candidate and render its lesson via Step 4d. No menu, no selection prompt, no `[0]`/`[A]` bypass.
3. After classify + write-back (per Step 0.7), if more pending remain and the session cap (3) isn't reached, auto-advance to the next top candidate. Loop until cap or `[skip]×3`.

**Menu path (only when `/gabe-teach topics --menu` is invoked, OR when >5 pending candidates span ≥3 wells and the user explicitly prefers the menu):**

```
TEACH: [N] topics pending across [K] wells

Commits covered: [N] since [date]
Active plan: [plan name], Phase [N] of [M]

  [0] BRIEF — Newcomer-onboarding snapshot (app purpose + wells overview + recent activity)
  [A] ARCH  — Architecture curriculum dashboard (tier × spec map, next-concept suggestion)

Guardrails (G1) — [N] pending
  [1] WHY   — Why guardrails run before the LLM
  [2] WHEN  — When to return matched pattern names vs boolean

API Layer (G3) — [N] pending
  [3] WHY   — Why 202 Accepted + BackgroundTask
  [4] WHERE — Why uploads/ lives at project root, not under app/

Frontend (G4) — [N] pending
  [5] WHY   — Why we expanded guardrails 15 → 25 patterns + sanitization

Pick up to 3:
  - Brief orient:  "0" (shows brief, then re-prompts for topic picks)
  - Arch view:     "A" (shows arch dashboard, then re-prompts for topic picks)
  - Individual:    "1,3,5" or just "3"
  - Whole well:    "all G1" or "all G3"
  - All pending:   "all"
  - Skip session:  "skip"
  - Start now:     press Enter or type "next" to accept the top pick (#1)
```

`[0]` and `[A]` are **menu-path-only** orientation shortcuts — they do NOT exist in the fast path. Rationale (D2=B): the fast path is a single lesson stream; orientation hops would break its rhythm. The menu path already implies "I want to choose," so offering orientation there is coherent.

If user picks `0`: run the **short-brief** variant (Step 8 with `short` flag) inline, then re-show this menu. `0` is orientation, not a topic selection — it doesn't consume from the 3-pick cap.

If user picks `A` (case-insensitive, accepts `a` or `arch` too): run the **arch dashboard** (Step 9a) inline, then re-show this menu. Like `0`, `A` is orientation — it doesn't consume from the 3-pick cap. From the dashboard, the human can copy a concept ID and exit back to this menu, or run `/gabe-teach arch show <id>` in a separate invocation. We deliberately do NOT let `A` jump directly into a concept lesson — that would mix project-teach and arch-teach flows in one session, making the 3-pick cap accounting ambiguous.

**Short-brief:** wells block only (≈15 lines), no CONTEXT/OPEN & NEXT/RECENT sections, no COMMANDS footer. Keeps the topics menu flow tight. For the full brief, use `/gabe-teach brief` directly.

**Short-arch:** dashboard only (Step 9a's rendering, ≈20 lines) — tier progression bars + recent HISTORY.md events + one suggested-next concept. No interactive browse/show/verify from within the menu; those require exiting to `/gabe-teach arch <subcommand>`. Keeps the topics flow tight, same philosophy as short-brief.

**Gate bypass:** When `[0]` or `[A]` is invoked from inside the topics menu, Step 8's foundation gate (for brief) and Step 9's lazy-bootstrap (for arch) run silently. Step 0.5 already passed to reach this menu, so no re-prompting.

Cap: 3 topics per session, counted across `[next]` + `[test]` auto-advances in the fast path, or across numeric picks in the menu path. Same deterministic counting either way. On reaching the cap: `Session complete — 3 topics covered. /gabe-teach to continue tomorrow.`

**Step 4d — Teach each selected topic.** Flow per topic:

1. **Topic header** — two-line format that names the origin of the change:
   ```
   T[N] (G[M] <Well>, <CLASS>) — <title>
        ← Plan: "<plan goal>" · Phase <N>/<M>: <phase name> · Commit <sha-short>
   ```
   Lineage lookup (deterministic, no LLM): for each commit SHA in the candidate record, match commit-date against PLAN.md (active) first, then `.kdbp/archive/*.md` (completed plans) by date range. Pick the plan+phase that owns that commit. If no match, render `← Plan: (unmapped) · Commit <sha-short>`.
2. **📍 Code block** — where the work landed (deterministic, from the candidate record captured in Step 4b). See format below.
3. **Lesson body** — six-part structured template (see Step 4d-lesson below).
4. **Classify response** — Universal Action Menu (Step 0.7). `[next]` → Q1/Q2 → classify; `[explain]` → re-teach; `[test]` → skip to Q1/Q2; `[skip]` → mark and move on.

**Step 4d-lesson — Structured lesson template (enforced, not optional).**

_Unified teach template. Same section order for project topics (Step 4d) and arch concepts (Step 9c). Rationale: one lesson shape the reader learns once — the teach-first principle stands or falls on consistency._

The lesson has **two regions** separated by a horizontal rule:

- **Region 1 — Lesson body** (sections 1-7 below): the teaching. Reader absorbs.
- **Region 2 — `## Your turn`** (interaction block): project context, questions, menu. Reader acts.

The `---` separator and `## Your turn` heading are not optional — they mark the psychological shift from absorb to engage.

**Render order:**

```
The problem:
  [The pain that motivated this change/pattern — human-perspective, 1-2 sentences.
   Name the concrete failure mode or cost being paid.]

The idea:
  [One-sentence definition of the solution, BEFORE any analogy fires.
   Names what the thing IS so the reader doesn't assemble the concept from analogies.]

Handle:
  "[5-10 word memorable phrase that survives compaction / fatigue / 11pm]"
  [For arch concepts: sourced from frontmatter `one_liner` (tighten to ≤10 words
   at render time if needed). For project topics: sourced from the topic's
   one-line summary captured in Step 4b.]

Picture it:
  [gabe-lens analogy — 1-2 sentences, image-only. Don't explain the mapping yet;
   just paint the picture.]

How the picture maps to the code:
  [Explicit mapping from analogy pieces to code pieces. 3-6 arrow-lines:
   `<analogy piece>  →  <code/system piece>`. This is the load-bearing section —
   the analogy earns its keep here, or the whole lesson is decorative.]

Easy to confuse with:                      (optional — render only when concept file has this section, OR the drift analyzer has flagged conflation for this concept in gabe-lens-learning.md)
  - **<sub-part A> vs <sub-part B>** — one-line clarification of the distinction.
  - **<sub-part C> vs <sub-part D>** — one-line clarification (optional, max 3 bullets).

Primary force:
  [The single strongest reason this change/pattern is worth the complexity —
   1 paragraph, ≤4 sentences. Singular. If three forces feel equally weighty,
   the topic is too broad; split it.]

When to reach for it:
  - [Concrete scenario where this pattern fits — 1 line]
  - [Another scenario — 1 line]
  - [Optional third — 1 line, max 3 bullets]

When NOT to reach for it:
  - [Boundary / anti-pattern / simpler alternative — 1 line]
  - [Another — 1 line]
  - [Optional third / fourth — 1 line, max 4 bullets]

---

## Your turn

Where this lives in your project:                          (arch concepts: see Step 9c; project topics: Further reading replaces this line)
  [deterministic enumeration — see Step 9c Where-this-lives construction]

Further reading:                                           (project topics only — see Step 4d Further reading construction)
  → [well's Docs path]                     (well doc — [N] verified topics, last updated [date])
  → [additional doc path matched via DOCS.md if any]

Architecture link:                                         (project topics only, if arch_concepts non-empty)
  ↪ [concept-id] ([tier] · [primary-spec]) — "[one_liner]"

Signal: [Quick check ✓ | Deeper question ◆ (~5 min focus) | Deeper question ◆ (rethink your model)]
  [Cognitive-depth indicator borrowed from gabe-lens SIGNAL. Default: "Deeper question ◆ (~5 min focus)"
   for arch concepts (they're in the catalog because they have layers). Authors override via frontmatter `signal:`
   field. For project topics, compute at render: if the change is a small refactor, Quick check; if it touches
   architectural patterns, Deeper question 5 min; if it inverts an existing pattern, Rethink your model.]

Q1: [Socratic question referencing only lesson-body sections 1-7]
Q2: [Socratic question referencing only lesson-body sections 1-7]

[explain]  [next]  [test]  [skip]

---
Context: [tier] · [specializations] · prereqs: [list-or-none] · related: [list-or-none]    ← arch concepts only; omit for project topics
```

**Hard rules (enforce when generating the lesson):**

1. **No artifact in a question that wasn't taught above.** If Q references `{safe: bool, reason: str}`, that shape must appear in `The problem`, `The idea`, or `How the picture maps` lines. If Q references a `list[tuple[name, regex]]`, that shape must appear somewhere in sections 1-7. No "introduce new code in the question."
2. **Jargon gloss on first use.** Any domain term a new reader might not know gets a 3-5 word parenthetical on first mention: `prompt injection (attacker hijacks instructions)`, `SQL probe (malformed query testing injection)`. Applies to: jailbreak, prompt injection, SQL injection/probe, role impersonation, token marker, XML role tag, circuit breaker, idempotency key, etc. If in doubt, gloss it.
3. **Word cap: 180 words total for sections 1-7.** Questions don't count. **Neither `Architecture link` NOR `Further reading` counts against the cap** — both are pointers to external depth, not taught content. The teaching for arch concepts happens via `/gabe-teach arch show <id>`; the extra project context happens by opening the well doc. If over cap, cut "When NOT" bullets first, then "When to reach" bullets, then shorten Primary force. Overflow content belongs in the well doc (Step 4d.1 auto-append), not the live lesson. (Cap raised from 150 to 180 to accommodate the mapping section, which is load-bearing.)
4. **The idea is one sentence.** If you need two sentences, the concept isn't crisp enough — re-think. This is the reader's anchor before any analogy fires; it has to be unambiguous on first read.
5. **How the picture maps is mandatory when an analogy is used.** The analogy's value is the mapping. If you can't write 3-6 mapping arrows, either (a) the analogy is decorative and should be cut, or (b) the analogy is rich but under-explained and needs a clearer `Picture it` line. Never leave the mapping to the reader's imagination.
6. **Primary force is singular.** Pick ONE reason. If three forces feel equally important, the topic is too broad — split it into two topics. "Also" bullets that used to exist in the old template now live in `When NOT to reach for it` as anti-patterns — they're the flip side of the force.
7. **Questions test inversion or application, not recall.** Good: "If we'd kept [before], what operational question becomes impossible?" Bad: "Which three forces drove the change?"
8. **Architecture link and Further reading are zero-LLM.** Both sections are rendered deterministically — `Architecture link` from concept frontmatter, `Further reading` from well `Docs` path + DOCS.md doc-drift mappings. No model calls at teach time.
9. **Questions must be answerable from sections 1-7 alone.** The `Further reading` section is a pointer for humans who want more depth *after* answering, not a crutch that excuses under-explaining. If a question requires the reader to open an external doc to answer, the lesson is broken — fix the lesson, not the link.
10. **Footer context line (arch concepts only).** Tier, specializations, prerequisites, and related concepts render as a single line after the Universal Action Menu, separated from the lesson body by `---`. This keeps catalog metadata available without interrupting the reading flow. For project topics (Step 4d), the footer is omitted — the topic header's plan-lineage line already carries the analogous context.

**Section-naming migration from the legacy template** (for context when reading old teach sessions or updating concept files):

| Legacy section | New section | Note |
|---------------|-------------|------|
| `What changed: Before/After` | `The problem` + `The idea` | "Before" framing dissolves into "the pain"; "After" dissolves into "the idea." |
| `Analogy` | `Picture it` + `How the picture maps` | Analogy splits into image-first + explicit mapping. Mapping is new and mandatory when analogy present. |
| `Scenario: Before/After` | `When to reach for it` (positive cases) | Old "Before" was the pain scenario (now in `The problem`); old "After" was the success trajectory (now in `When to reach for it`). |
| `Primary force` | `Primary force` | Unchanged — kept per D3=C. Single-paragraph discipline preserved. |
| `Also` | `When NOT to reach for it` | Secondary forces were usually anti-patterns or boundary conditions. They belong with limits, not with forces. |
| _(new)_ | `When NOT to reach for it` | Absorbs old `Also` + anti-patterns previously scattered across the lesson. |

**Further reading construction** (zero-LLM, deterministic, **always rendered** for project topics):

Per user feedback: lessons should always surface relevant support docs so the reader knows where to look for more depth. The section is load-bearing — it must render on every project topic lesson, even if content is sparse, so the human can navigate the documentation surface and see where gaps live.

1. **Well doc (always first, always present):** Look up the topic's assigned well in `.kdbp/KNOWLEDGE.md`:
   - Docs column non-empty AND file exists → emit `→ {Docs}  (well doc — N verified topics, last updated YYYY-MM-DD)`. Read mtime for date; count `### T[N] —` headings under `## Topics (auto-appended)` for N.
   - Docs column non-empty but file missing → emit `→ {Docs}  (⚠ not found — run /gabe-teach init-wells to scaffold)`.
   - Docs column empty → emit `→ (⚠ G[M] has no Docs path set — run /gabe-teach wells → [docs N] to assign one)`.
2. **DOCS.md mappings (up to 2 extra lines):** If `.kdbp/DOCS.md` maps any of the topic's changed files to documentation paths: emit one line per mapped doc `→ {doc_path}#{section}  ({human-readable-label})`. Cap at 2 additional lines.
3. **Never omit the header.** The `Further reading:` section always renders for project topics (Step 4d). For arch-concept lessons (Step 9c), the section is optional — the concept file's own `related:` frontmatter already provides cross-references.

**Empty-section detection** (required, applies to both well docs and DOCS.md-mapped paths):

A pointer that leads to emptiness is worse than no pointer — it spends reader attention and teaches "docs don't have anything." Annotate each Further-reading line based on the target's content density:

For **well docs**, check the `## Purpose` and `## Topics (auto-appended)` sections:
- If both sections are placeholder-only (only HTML comments / whitespace, 0 verified topic entries): annotate ` (⚠ stub — run /gabe-teach to populate)`
- If `## Topics` has entries but `## Purpose` is still placeholder: annotate ` (N topics, Purpose empty)` — signals "run Step 4d.4 to draft Purpose"
- Otherwise: normal annotation as in rule 1

For **DOCS.md-mapped paths**, the mapping includes a `Section` column (e.g., `Safety`, `Data Model`). Inspect that section specifically:
- Extract the content between `## {Section}` and the next heading (or EOF).
- Count non-comment, non-whitespace characters.
- If <80 chars: annotate ` (⚠ section empty)` — render the line but warn the reader.
- If 80-500 chars: annotate ` (brief — {N} chars)`.
- If >500 chars: no annotation (healthy content).
- If the section heading doesn't exist in the target file: skip the line entirely (broken mapping; don't mislead).

Example Further reading block showing the range of outcomes:

```
Further reading:
  → docs/wells/1-guardrails.md  (well doc — 3 verified topics, last updated 2026-04-17)
  → docs/AGENTS_USE.md#Safety  (⚠ section empty — from DOCS.md high-priority mapping)
  → docs/architecture.md#Data Model  (brief — 180 chars)
```

The empty-section annotation gives the human useful signal two ways: (a) "don't click that yet, there's nothing there," and (b) "the team has work to do here." DOCS.md stays the source of truth for *which* docs should exist; Further reading adds the reality check of *how much is actually written*.

Sorting: well doc first (highest relevance), DOCS.md mappings after in the order they appear in DOCS.md.

**Worked example** (the T1 from the ai-app screenshot, rewritten to follow the unified template with v2.3 additions):

```
The problem:
  The guardrail was returning {safe: bool, reason: str} — a single English
  string. Ops could tell THAT a request was blocked but not WHICH attack
  surface was being probed. With 15 patterns collapsed into one string, trend
  analysis was impossible.

The idea:
  Return a named pattern list — {safe: bool, matched_patterns: list[str]} —
  so every denied request carries a machine-readable tag telling ops exactly
  which rule fired.

Handle:
  "A boolean counts; names let you trend."

Picture it:
  Like a security checkpoint that logs which weapons were confiscated, not
  just "we turned someone away."

How the picture maps to the code:
  the security checkpoint      →  the guardrail middleware
  a confiscated weapon         →  a regex pattern name (e.g., "instruction_override")
  the log entry                →  matched_patterns list in the response
  "turned someone away"        →  safe: false boolean (what we had before)
  weapon inventory over time   →  ops dashboard showing pattern frequencies

Easy to confuse with:
  - **list[str] vs dict[str, bool]** — a list preserves multi-match order and
    duplicates; a dict collapses them. If the same attack surface fires twice
    (e.g., two instruction-override patterns both match), the list shows 2 rows
    in ops dashboards; the dict shows 1.
  - **pattern name vs pattern ID** — names are human-readable and can change
    ("instruction_override" → "jailbreak_attempt"). IDs are immutable contracts
    that dashboards depend on. Treat names as display; IDs as API.

In your codebase:
  T1 "Expand guardrails + return names" — G1 Guardrails · verified 2026-04-17
    app/agent/guardrails.py       — 25 regex patterns + match function returning matched_patterns list
    tests/agent/test_guardrails.py — round-trip tests for each pattern name

Gaps vs. the mapping:
  ⚠ weapon inventory over time — no dashboard code in tagged topics yet. The
    matched_patterns list is returned by the API but nothing aggregates it for
    ops visibility. Trend analysis still impossible until a metric sink exists.

Primary force:
  Observability has teeth only with names. A boolean tells you THAT something
  happened; a named pattern tells you WHICH attack surface is under pressure,
  which is what every downstream decision depends on — trend dashboards,
  per-pattern policy, and user-facing error copy.

When to reach for it:
  - Any filter/validator where distinguishing failure modes matters operationally.
  - Security surfaces with multiple threat types to track independently.
  - Systems where error copy or retry logic needs to vary by failure cause.

When NOT to reach for it:
  - Binary gates with one real failure mode — a boolean is enough.
  - No idempotency key on the submit endpoint — retries double-process; fix
    that first before adding observability richness.
  - Names without stable IDs — renaming a pattern breaks dashboards; treat
    pattern names as public contract.
  - Single-caller denial flows where the caller already knows the reason.

---

## Your turn

Further reading:
  → docs/wells/1-guardrails.md  (well doc — 1 verified topic, Purpose empty)
  → docs/AGENTS_USE.md#Safety  (⚠ section empty — from DOCS.md high-priority mapping)

Architecture link:
  ↪ input-guardrails (foundational · agent) — "Filter adversarial input before it reaches the model — cheaper than filtering output."
  ↪ input-validation-at-boundary (foundational · security) — "Trust internal code, validate external input — never the reverse."

Signal: Deeper question ◆ (~5 min focus)

Q1: If you'd kept the old {safe: bool, reason: str} shape, what specific question
    from the `When to reach for it` list becomes impossible to answer cheaply?
Q2: The patterns are stored as list[tuple[name, regex]]. Given the mapping
    section, what does naming each regex buy you that a single OR-ed regex
    r"(ignore previous|you are now|...)" wouldn't?

[explain]  [next]  [test]  [skip]

Architecture link:
  ↪ input-guardrails (foundational · agent) — "Filter adversarial input before it reaches the model — cheaper than filtering output."
  ↪ input-validation-at-boundary (foundational · security) — "Trust internal code, validate external input — never the reverse."

Further reading:
  → docs/wells/1-guardrails.md  (well doc — 1 verified topic, Purpose empty)
  → docs/AGENTS_USE.md#Safety  (⚠ section empty — from DOCS.md high-priority mapping)

Q1: If you'd kept the old {safe: bool, reason: str} shape, what specific question
    from the Scenario's "After" block becomes impossible to answer cheaply?
Q2: The patterns are stored as list[tuple[name, regex]]. Given the Scenario,
    what does naming each regex buy you that a single OR-ed regex
    r"(ignore previous|you are now|...)" wouldn't?
```

Notice four things:

1. **Q1's artifact** (`{safe: bool, reason: str}`) appears in `The problem`. **Q2's artifact** (`list[tuple[name, regex]]`) needs to be introduced in sections 1-7 before the question — in this example it could go as a one-liner in `How the picture maps` or `Primary force`. If Q2 can't be made self-contained, replace it.
2. **Architecture link** shows concept IDs + one-liners; the reader can run `/gabe-teach arch show input-guardrails` if they want the deeper dive. Zero-LLM at render time.
3. **Further reading** tells the reader exactly what state the docs are in: the well doc exists but has only 1 verified topic and an empty Purpose (they'll find some material but should run another teach session or Step 4d.4 to enrich); the DOCS.md-mapped section is empty (pointer exists but content doesn't). The annotations prevent the reader from clicking into dead space.
4. **The mapping section is the load-bearing one.** Without `How the picture maps`, the analogy ("security checkpoint") is ornamental — a reader can't tell whether "confiscated weapon" refers to the regex, the pattern name, or the denied request. With the mapping, the analogy does the teaching and the reader leaves with a model they can recall.

**Why this template.** A new reader needs the problem framed before a solution is proposed, a named solution ("The idea") before an analogy is dropped on them, and an explicit mapping before the analogy is asked to do explanatory work. Then — and only then — do forces and boundaries refine the model. The seven-part shape enforces this pedagogical arc; the hard rules prevent shortcuts.

**📍 Code block format** (shown immediately after the topic header, before the analogy):

Single commit, ≤5 files:

```
📍 Code (commit a4c9e2f — feat(guardrails): expand patterns + return names):
   • app/agent/guardrails.py         (+40 -12)
   • tests/agent/test_guardrails.py  (+35 -5)
   • docs/wells/1-guardrails.md      (+8 -0)
```

Multiple commits (list up to 3 SHAs + subjects, aggregate stats per file, annotate `[N commits]` when a file was touched by >1):

```
📍 Code (2 commits):
   a4c9e2f — feat(guardrails): expand patterns + return names
   b1d8e3a — fix(guardrails): handle XML role tags
   Files:
     • app/agent/guardrails.py         (+52 -14)  [2 commits]
     • tests/agent/test_guardrails.py  (+35 -5)
```

**Rules:**

- Cap file list at **5 rows**. Overflow → append `… and N more files` on its own line.
- Sort files by total line delta (`added + removed`) descending so the dominant change is first.
- Commit subjects: truncate to 72 chars with `…` suffix if longer.
- If >3 commits: show first 2 + `… and N more commits` before the Files section.
- If the topic came from a non-commit source (e.g., a DECISIONS.md row with no commit reference), omit the block entirely — don't render an empty heading.
- Never call the LLM for this block. It's pure git → string formatting.

This lets the human anchor the analogy to concrete code: the gravity of the change (how many files, which area of the tree) and a jump-off point for `git show <sha>` if they want to read the diff themselves.

**Step 4d.1 — Auto-append verified topic to well's Docs (prompt-first).**

When a topic is classified `verified` in Step 4d:

1. Look up the topic's assigned well in KNOWLEDGE.md
2. If the well's `Docs` column is empty → skip silently (well opted out of doc tracking)
3. If the well's Docs file does NOT exist → skip with one-line warning: `⚠ Can't append: docs/wells/3-api.md not found. Run /gabe-teach wells → [docs N] to fix path, or scaffold via /gabe-teach init-wells.`
4. Otherwise, check the user's append preference (stored in `.kdbp/BEHAVIOR.md` frontmatter as `teach_append: prompt | always | never`, default `prompt`):
   - `always` → append silently, show `✅ Appended T[N] to docs/wells/3-api.md`
   - `never` → skip silently
   - `prompt` → ask:
     ```
     Topic T[N] "[title]" verified. Append to docs/wells/3-api.md?
       [y]      Append this once
       [n]      Skip this once
       [always] Append automatically for every verified topic going forward
       [never]  Never prompt again; don't append
     ```
     `always` and `never` write `teach_append: always` or `teach_append: never` to BEHAVIOR.md frontmatter, so the choice persists across sessions.

**Append format** — inserts a new section under `## Topics (auto-appended)` in the Docs file, preserving any existing content above that heading:

```markdown
### T[N] — [Topic title]

**Class:** [WHY|WHEN|WHERE]  **Verified:** YYYY-MM-DD  **Score:** [X]/2  **Commits:** [hash, hash]

**Files:**
- `app/agent/guardrails.py` (+40 -12)
- `tests/agent/test_guardrails.py` (+35 -5)

[One-paragraph summary from the teach session — the analogy + key framing delivered in Step 4d, trimmed to ≤120 words]

**Key points:**
- [Socratic answer bullet 1]
- [Socratic answer bullet 2]
```

**Files section rules** (same source as the Step 4d 📍 Code block):

- Up to 5 file rows, sorted by line delta descending.
- `[N commits]` suffix on files touched by >1 commit in the topic's commit set.
- If >5 files: append `- … and N more files` as the last row.
- If the topic has no commit source: omit the Files section entirely.
- Paths rendered as inline code (backticks) so they work as markdown links to the source tree.

Purely deterministic — uses data already captured in the teach session. No additional LLM call.

If the section `## Topics (auto-appended)` is missing from the file (user deleted it or wrote doc from scratch), create it at end of file before appending.

**Step 4d.2 — Confirm architecture-concept tags (only when the topic was verified/already-known).**

After the lesson's `classify response` step, if the topic has `arch_concepts` (tagged in Step 4b.5) AND the status is `verified` or `already-known`, ask the human to confirm the tags before writing:

```
Tag T7 with the following architecture concepts?
  ✓ retry-with-exponential-backoff (intermediate · distributed-reliability)
  ✓ idempotency-keys (foundational · distributed-reliability)

  [accept]  Tag with all listed concepts
  [edit]    Pick/deselect individually
  [drop]    No concept tags for this topic
  [none]    Same as drop, but also suppress future confirmations for this session
```

- `accept`: write all tags to KNOWLEDGE.md Topics row `ArchConcepts` column AND upsert into `~/.claude/gabe-arch/STATE.md`.
- `edit`: show each tag with `[y]`/`[n]` and commit the subset.
- `drop`: write empty `ArchConcepts` cell.
- `none`: same as drop, set an in-session flag that auto-accepts an empty tag list for the rest of this teach run (doesn't persist to BEHAVIOR.md — session-scoped only).

If the topic's status is `pending` or `skipped`, DO NOT write arch tags to STATE.md (the concept wasn't actually learned). The tags stay in KNOWLEDGE.md (per-project record) but don't propagate to the global architecture state yet — verification is what earns a STATE.md entry.

If `arch_concepts` is empty (Step 4b.5 found 0 matches), skip this step silently — no prompt, no write.

**Step 4d.3 — Write architecture-concept state (only after Step 4d.2 confirmed tags for a verified/already-known topic).**

For each confirmed concept ID:

1. **STATE.md upsert** by `Concept ID`:
   - If row exists and current status is `verified`: increment `Reinforcements` by 1 if `Verified Project` differs from current project; set `Last Reinforced` to today; leave `Verified Date` and `Score` unchanged.
   - If row exists and current status is `pending` / `skipped`: update to `verified`, set `Verified Date` to today, `Verified Project` to current project, `Score` from the topic's quiz, `Reinforcements` to 0, `Last Reinforced` to today.
   - If row doesn't exist: append new row with `Status: verified`, `Tier` and `Specialization` copied from the concept file's frontmatter, `Verified Date` today, `Verified Project` current project, `Score` from the topic quiz (or `—/—` if already-known-skip-check), `Reinforcements: 0`, `Last Reinforced` today.

2. **HISTORY.md append** — one grouped entry per teach session:
   ```
   ### 2026-04-17 — ai-app (via /gabe-teach topics)
   - TAG:     T7 → retry-with-exponential-backoff, idempotency-keys
   - VERIFY:  retry-with-exponential-backoff (2/2) via topic T7
   - VERIFY:  idempotency-keys (2/2) via topic T7
   ```

   If the concept was already `verified` in STATE.md and this is a different project, use `REINFORCE` instead of `VERIFY`.

Deterministic writes only; no LLM calls in 4d.2 or 4d.3.

**Step 4d.4 — Well-doc freshness check (after Step 4d.1 append, prompt-first, session-scoped).**

After a verified topic is auto-appended to `docs/wells/{n}-{slug}.md` via Step 4d.1, inspect the well doc to see whether the `## Purpose` or `## Key Decisions` sections are still placeholder-only (contain only HTML comments / whitespace, no prose).

Trigger rules (all must hold to prompt):

1. At least one section (`## Purpose` or `## Key Decisions`) is placeholder-only.
2. The well now has ≥3 verified topics (counted via `### T[N] —` headings under `## Topics (auto-appended)`). Three verified topics is the minimum signal that there's enough accumulated understanding to distill into Purpose/Decisions prose.
3. No `teach_docs_refresh: never` flag is set in `.kdbp/BEHAVIOR.md` frontmatter (human opted out previously).
4. Not already prompted for this specific well in this session (session-scoped dedupe).

When all trigger rules pass, prompt exactly once per session per well:

```
ℹ docs/wells/3-api.md has [N] verified topics but its Purpose section is empty.

  The human (you) know the why — the lesson we just finished summarized one of them.
  Want to draft Purpose + Key Decisions now based on what's been verified?

  [y]      Draft now — uses one gabe-lens call to distill the [N] verified topics
           into a Purpose paragraph and a first Key Decision. Reviewed before write.
  [n]      Not this time (will re-prompt next session when another topic is verified)
  [never]  Never prompt for doc refresh in this project
           (writes teach_docs_refresh: never to BEHAVIOR.md frontmatter)
```

**On `y`:**

1. Read all verified topic summaries under `## Topics (auto-appended)` in the well doc.
2. Run one LLM call (cheap model, Haiku-tier) with:
   - Context: well name + analogy + paths + the verified topic summaries
   - Output: `output_type`-enforced schema `{ purpose: str (2-3 sentences), first_decision: { title: str, rationale: str (1-2 paragraphs) } }`
   - Max tokens: 400
3. Show the draft inline:
   ```
   DRAFT — docs/wells/3-api.md

   ## Purpose
   [proposed 2-3 sentence Purpose paragraph]

   ## Key Decisions

   ### [today's date] — [first_decision.title]
   [proposed rationale]

   [accept] Write to file
   [edit]   Let me revise before writing
   [cancel] Drop the draft
   ```
4. On `accept`: replace the placeholder `## Purpose` comment-only block with the drafted prose; append the first decision under `## Key Decisions` (preserving existing decisions if any). Never overwrite human-authored prose — if the section already has real content, skip it and only fill what's still empty.
5. On `edit`: show the draft as editable text; write after user confirms.
6. On `cancel`: drop the draft; re-prompt next session per trigger rules.

**On `never`:**

Write `teach_docs_refresh: never` to the project's `.kdbp/BEHAVIOR.md` frontmatter. Future verified topics still auto-append to the well doc (Step 4d.1 unchanged), but the freshness prompt never fires again for this project. Human can revert by editing BEHAVIOR.md and removing the flag.

**Rationale.** The feedback that surfaced this step: `/gabe-teach` lessons are self-contained but well docs were staying empty because writing Purpose/Decisions by hand is friction nobody gets around to. After 3 verified topics, there's enough material to distill — and the human just spent a teach session with fresh context, so it's the right moment to ask. Skipped once → re-prompt next session; `never` → respected persistently.

**Step 4d.5 — Complexity-triggered diagram prompt (only when the topic was verified/already-known).**

After Step 4d.4 completes (Purpose/Decisions drafted or skipped), score the just-verified topic for **diagram-worthiness**. If the signal fires, offer to add a dedicated diagram to clarify the concept — either upgrading the well's stub `## Key Diagrams` or inserting an inline `#### Diagram` subsection under the topic's block. Defers to `gabe-docs/SKILL.md` per-doc-type matrix + inline triggers for placement rules.

**Deterministic complexity score (zero LLM cost).** Scan the user's Q1+Q2 verification answers + the topic title + the `## 📍 Code` file list for signals. Each signal worth 1 point:

| Signal | Trigger |
|---|---|
| Flow verbs | Answer/title contains any of: `flow`, `route`, `dispatch`, `forward`, `hand off`, `traverse`, `pipeline`, `handoff`, `enqueue`, `fan out` |
| Multi-actor | ≥3 distinct module/layer tokens among: `api`, `service`, `repository`, `repo`, `integration`, `ui`, `frontend`, `backend`, `db`, `pipeline`, `worker`, `queue`, `adapter`, `client`, `agent`, `llm`, `classifier`, `router` |
| State machine | Contains any of: `state`, `status`, `transition`, `lifecycle`, `phase`, `stage`, `pending`, `dispatched`, `resolved`, `failed → retry` |
| Async / concurrent | Contains any of: `async`, `await`, `concurrent`, `parallel`, `background`, `BackgroundTask`, `celery`, `queue`, `defer`, `schedule` |
| Long WHEN/WHERE answer | Topic class is `WHEN` or `WHERE` AND user's combined Q1+Q2 answer >150 words |

**Prompt trigger:** score ≥2 AND topic status is `verified` or `already-known`. Skip silently for `pending` / `skipped` / low-score topics. Also skip if `teach_diagram_prompt: never` is set in `.kdbp/BEHAVIOR.md` frontmatter.

**Placement decision (deterministic):**

Count `N_verified` = number of `### T[N] —` headings under `## Topics (auto-appended)` in the well doc **after** Step 4d.1 has appended the just-verified topic. So if this topic is the first the well has ever seen, `N_verified = 1`. Count before 4d.1 = `N_verified - 1`.

1. **Well-level upgrade** — fires when ALL:
   - `N_verified ≤ 2` (current topic is the 1st or 2nd ever appended to this well)
   - `## Key Diagrams` section exists in the well doc
   - Section contents match stub heuristic per `gabe-docs/SKILL.md` "Upgrading a placeholder diagram"
   
   Behavior: upgrade the well-level stub using this topic's verification content as the seed. Subsequent topics won't re-trigger this rule (rule 2 takes over at `N_verified ≥ 3`). `/gabe-commit docs-audit` Step A3 is the safety net if the user declined all prompts.

2. **Inline topic-level diagram** — fires when ANY:
   - `N_verified ≥ 3` (well already has enough context, preserve authored well-level diagram)
   - `N_verified ≤ 2` AND `## Key Diagrams` is real (not stub) — respect the authored content, add topic-scoped diagram inline instead
   
   Behavior: insert `#### Diagram` subsection under the `### T[N] —` block in `## Topics (auto-appended)`. Keeps the well-level diagram stable; topic-scoped diagrams live with their topic.

3. **Skip** — fires when `## Key Diagrams` section is entirely absent from the well doc. Print one-line warning `⚠ Well doc missing ## Key Diagrams section — skipping diagram prompt; run /gabe-commit docs-audit to scaffold.` and move on. No diagram written this session; user must scaffold the section first.

**Prompt:**

```
ℹ Topic T[N] "[title]" looks worth a diagram (complexity score: [S]/5 — signals: [flow, multi-actor, state]).

  Placement: [well-level upgrade | inline topic block]
  Proposed type: [flowchart | sequenceDiagram | stateDiagram-v2 | erDiagram]
  (type picked from gabe-docs/SKILL.md per-well recommendation)

  [y]      Draft now — one gabe-lens call distills the topic into a [type] (≤10 nodes)
  [edit]   Let me pick a different diagram type before drafting
  [n]      Not this time (will re-surface via /gabe-commit docs-audit when well has ≥2 topics)
  [never]  Don't prompt for diagrams in this project
           (writes teach_diagram_prompt: never to BEHAVIOR.md)
```

**On `y`:**

1. Gather context: topic title + user's Q1+Q2 verification answers + the well's analogy/paths + the topic's `## 📍 Code` file list. If upgrading the well-level stub, also read any existing verified-topic summaries in `## Topics (auto-appended)` for the same well.
2. One LLM call (Haiku-tier unless flow has ≥3 layers — then Sonnet, per U6 routing) with:
   - Context: above
   - Output: `output_type`-enforced schema `{ diagram_type: Literal[types], body: str (Mermaid body only, no fence), alt_text: str (≤80 chars describing what the diagram shows) }`
   - Constraints: respect diagram-type from placement decision; ≤10 nodes; intent-labeled; consistent with well analogy; consult `gabe-docs/diagrams-library.md` composition ideas ONLY when flow has ≥3 layers or needs subgraph grouping.
3. Show the draft inline with syntax-verify (try rendering; if parse fails, retry once with error appended per U4 fallback chain).
4. On user `accept`: write to placement target:
   - **Well-level upgrade** — replace stub fence body in `## Key Diagrams` section; preserve the comment header (`<!-- Pick diagram type… -->`) above the fence; bump a small marker `<!-- Seeded from T[N] on YYYY-MM-DD; extend as more topics verify. -->` just above the fence.
   - **Inline topic block** — insert `\n#### Diagram\n\n<alt text as HTML comment>\n\n```mermaid\n<body>\n```\n` immediately after the topic's summary paragraph under `### T[N] —` (before `**Key points:**`).
5. On `edit`: show as editable; write after confirm.
6. On `cancel`: drop draft; re-prompt next session if trigger fires again.

**On `n`:** skip. The `/gabe-commit docs-audit` Step A3 will re-surface as `Diagram placeholder despite N verified topics` once the well hits ≥2 verified topics, so the safety net catches it later.

**On `never`:** write `teach_diagram_prompt: never` to BEHAVIOR.md frontmatter. Step 4d.5 becomes a no-op for this project. Revert by deleting the flag.

**Rationale.** Some topics are pure rationale (WHY) and prose is enough; others describe flows / state machines / multi-layer journeys that read as word-soup without a picture. The deterministic score catches the latter without an LLM call. Prompting **after** verification (not before) means the user's own Q1+Q2 answers are the input — the diagram reflects what the human explained, not what the model guessed. Aligns with U2 (build real) and U4 (enforce structure — diagrams use mechanical `output_type` schema with syntax-verify fallback).

**Step 4e — Update KNOWLEDGE.md.** Writes rows with the `Well` column populated. `Tags` column populated with `cross` if flagged. `ArchConcepts` column populated with the confirmed concept IDs from Step 4d.2 (comma-separated, or empty if no tags).

**Step 4f — Log session** (enriched):
```
### [YYYY-MM-DD] — /gabe-teach topics (post-commit)
- Wells active: [list of well IDs + names]
- Commits covered: [list]
- Plan reference: [plan name + current phase from .kdbp/PLAN.md]
- Presented: T1, T2, T3
- Verified: T1 (2/2)
- Skipped: T2
- Docs appended: T1 → docs/wells/1-guardrails.md  (only when Step 4d.1 succeeded)
- Docs refreshed: docs/wells/3-api.md (Purpose + 1 Key Decision drafted)  (only when Step 4d.4 wrote prose)
- Diagrams added: T1 → docs/wells/1-guardrails.md (well-level upgrade, flowchart)  (only when Step 4d.5 wrote a diagram; omitted if skipped/never)
- Arch tags: T1 → retry-with-exponential-backoff, idempotency-keys  (only when Step 4d.2 confirmed non-empty tags)
- Arch state updates: 2 new verified, 1 reinforcement  (counts from Step 4d.3; omitted if zero)
```

**Step 4g — Log to LEDGER.md** (unchanged except includes wells count):
```
## [YYYY-MM-DD HH:MM] — /gabe-teach
TOPICS: presented N, verified M, skipped K, already-known J
WELLS: [N] | PENDING: [count after this session]
```

### Step 5: History mode

If mode is `history`:

Bounded view (default): last 5 plans + last 10 sessions. Full view: `/gabe-teach history full`.

Sources (deterministic, zero LLM cost):
- `.kdbp/archive/` — archived plans (completed/deferred/cancelled)
- `.kdbp/PLAN.md` — active plan + phase trackers
- `.kdbp/LEDGER.md` — session checkpoints + commits
- KNOWLEDGE.md Sessions section — past teach runs

Output format:
```
WORK HISTORY — [project name]

📦 Completed plans:
  ✅ [Plan name] (archived YYYY-MM-DD)
     [N] phases shipped. Topics spawned: [list or count]
  ⏸ [Plan name] (deferred YYYY-MM-DD → PENDING #D[N])
     [N of M] phases shipped before defer
  ❌ [Plan name] (cancelled YYYY-MM-DD)

📌 Active plan: [current plan goal]
  Phase [N]: [name]    Review [✅|⬜]  Commit [✅|⬜]  Push [✅|⬜]
  ...

📝 Recent teach sessions:
  - [date]: [verified] verified, [skipped] skipped, [already] already-known
  ...

Topic → plan mapping (last 20 topics):
  T1 (G1, verified)  ← [plan name], Phase 1, commit abc1234
  T2 (G3, pending)   ← [plan name], Phase 3, commit def5678
  ...
```

### Step 6: Story mode

If mode is `story`:

Check for an existing `## Storyline` section in KNOWLEDGE.md:
- If cached and <3 new archives since generation: show cached, add a note `(generated [date], [N] archives old)`
- If missing OR `refresh` subarg given OR ≥3 new archives: regenerate via one LLM call

**Generation (when fired):**
1. Read all completed plans from `.kdbp/archive/` (completed only, not deferred/cancelled)
2. Read the active plan's goal + phase progression from PLAN.md
3. Send to an LLM as context with this framing:
   - "Write a 150-250 word narrative analogy of what has been built in this project. Use concrete language. Thread the plans together — what was the throughline? What belief held each decision together? End with the single load-bearing thesis."
4. Write the result to KNOWLEDGE.md's `## Storyline` section with a generation date

Output format:
```
STORYLINE — [project name]
Generated: [date] (based on [N] archived plans + current active plan)

[the narrative]

Run /gabe-teach story refresh to regenerate.
```

Auto-refresh trigger: on any `/gabe-teach topics` run, check archive count. If ≥3 new archives since last Storyline generation, append a one-line suggestion to the teach output: `ℹ Storyline may be stale ([N] new archives since last generation). Run /gabe-teach story refresh when ready.`

### Step 7: Free mode (unchanged)

If mode is `free [concept]`: invoke `gabe-lens` skill directly. No KDBP interaction.

### Step 8: Brief mode

Invoked by `/gabe-teach brief` OR by picking `[0] Brief` in the Step 4c topics menu.

Read-only orientation snapshot. A newcomer (dev who knows the language/stack but not this project) should be able to get current after reading it. Always regenerated (cheap, deterministic except optional LLM call — see note).

**Foundation gate applies** (Step 0.5) — if wells aren't defined, the same prompt appears before brief runs. Without wells there's nothing meaningful to summarize.

**Step 8a — Gather inputs (all deterministic):**

1. `.kdbp/BEHAVIOR.md` frontmatter → `domain:` (one-liner), `maturity:`, `tech:`
2. `.kdbp/KNOWLEDGE.md` → Gravity Wells table (Name + Description + Analogy + Paths + Docs), Topics table (Well + Class + Topic + Status + Last Touched), Storyline section (if present)
3. `.kdbp/PLAN.md` → active plan goal + current phase (N of M) + Review/Commit/Push tick states, if `status: active`
4. `.kdbp/LEDGER.md` → last 5 entries (dated section headers + first line of each)
5. `.kdbp/PENDING.md` → open items with status=open, their priority, file, and finding summary
6. `.kdbp/DECISIONS.md` → last 3 decision entries (date + one-line title)
7. `git log --since="14 days ago" --oneline` → project-wide commit count
8. Per well with Paths populated: parse comma-separated globs, trim, pass each as a **separately quoted git pathspec** to avoid shell expansion:
   ```
   git log --since="14 days ago" --oneline -- "app/api/**" "tests/api/**"
   ```
   → well-scoped commit count + most recent commit (hash + date). **Never** interpolate unquoted globs (the shell would expand them locally against CWD).

**Step 8b — Per-well signals (deterministic):**

For each well row in KNOWLEDGE.md:
- `pending_count` = topics in this well with status `pending` or `skipped`
- `verified_count` = topics with status `verified`
- `pending_titles` = topic titles for pending rows (first 3, truncated to 50 chars each)
- `stale_count` = topics with status `stale` (verified >90 days ago)
- `commits_14d` = git commit count in the well's Paths (0 if Paths empty)
- `last_commit` = most recent commit in Paths (`YYYY-MM-DD hash`) or `—` if none
- `health` = derived: `🟢 active` if commits_14d > 0, `🟡 cold` if 0 commits_14d but verified/pending > 0, `🔴 stale` if stale_count > 0 (precedence: stale > cold > active)

No LLM call for this step. Wells with zero Paths show `commits_14d: —` but still render — absence is informative.

**Step 8b.5 — Backfill missing analogies (one-time per well):**

If a well row has an empty `Analogy` column, generate one on the fly via `gabe-lens` in `oneliner` mode (5-15 words). Write the result back to KNOWLEDGE.md so subsequent briefs are free. One LLM call per missing analogy, one-time cost per well.

**Failure fallback:** If the `gabe-lens` call fails (no network, no API key, rate limit, timeout > 10s), do NOT crash the brief. Instead:
1. Write the well's existing `Description` as the Analogy (stripped to ≤15 words)
2. Emit a one-line warning at the top of the brief output: `⚠ Analogy backfill skipped for G[N] (reason: [short cause]) — using description as placeholder`
3. Continue rendering

This keeps brief mode resilient on first post-schema-change runs in restricted environments.

**Step 8b.6 — Backfill missing Paths (heuristic, no LLM):**

If a well row has an empty `Paths` column, run the Step 2a heuristic deterministically:
1. Top-level folders whose name contains or is contained by the well's Name (case-insensitive, hyphen/underscore normalized)
2. STRUCTURE.md Allowed Patterns whose Description text overlaps the well's Description (keyword intersection ≥2 words)
3. Top 3 most-touched paths from `git log --since="30 days ago" --name-only` whose topics in KNOWLEDGE.md are assigned to this well

Take the union (deduplicated), keep the broadest glob per folder (`app/api/**` beats `app/api/main.py`). Write back to KNOWLEDGE.md as a comma-separated list. Emit: `ℹ Paths backfilled for G[N]: [glob list] — review with /gabe-teach wells → [paths N] if wrong`

If the heuristic produces zero hits, leave Paths empty and emit: `⚠ Could not infer Paths for G[N] — run /gabe-teach wells → [paths N]`

**Step 8c — Output format** (tight, ~50 lines including context blocks):

```
GABE TEACH BRIEF — [project name]

App:        [BEHAVIOR.md `domain` field]
Stack:      [BEHAVIOR.md `tech` field]
Maturity:   [mvp | enterprise | scale]
Active:     [PLAN.md goal] — Phase [N]/[M]  Review [✅/⬜] Commit [✅/⬜] Push [✅/⬜]
            (or "No active plan" if PLAN.md status != active)

GRAVITY WELLS ([N] defined)

  G1 [Name]: "[gabe-lens oneliner]"  [health icon+label]
     [description] · [paths or "paths not set"] · last: [YYYY-MM-DD hash] or "—"
     Docs: [Docs path]    (or "⚠ no doc" if Docs column empty, or "⚠ docs/wells/1-x.md missing" if path set but file doesn't exist)
     Pending: "[title 1]", "[title 2]", "[title 3]"        (or "none" if 0 pending)
     [⚠ [stale_count] stale  — only shown if stale_count > 0]

  G2 [Name]: "[oneliner]"  [health]
     [description] · [paths] · last: [date hash]
     Docs: [Docs path]
     Pending: ...
  ...

CONTEXT

  Story so far:
    [first 1-2 sentences of KNOWLEDGE.md ## Storyline — see placeholder rule below]
    (run /gabe-teach story for full narrative)
    — OR — "No storyline yet. Run /gabe-teach story to generate one."

  Placeholder detection: treat the Storyline section as EMPTY if its body (after the `## Storyline` heading, excluding HTML comments) either:
    - Is whitespace-only
    - Starts with the literal phrase "No storyline generated yet"
    - Contains fewer than 80 characters of non-comment content
  In any of those cases, show the fallback sentence, not the placeholder.

  Key decisions:
    [date] — [DECISIONS.md entry title 1]
    [date] — [title 2]
    [date] — [title 3]
    — OR — "No decisions recorded yet."

OPEN & NEXT

  Deferred items (PENDING.md):
    D[N] ([priority])  [short finding]  — [file]
    ... (up to 3 highest-priority open items)
    — OR — "No open deferred items."

  Suggested next actions:
    [tailored hint 1 based on signals below]
    [tailored hint 2]
    [tailored hint 3]

RECENT PROJECT ACTIVITY (last 14 days)

  [N] commits | [M] teach sessions | [K] plan phases shipped

  From LEDGER.md:
    - [date] [first line of entry]
    - ... (up to 5)

COMMANDS
  /gabe-teach topics    /gabe-teach wells    /gabe-teach story    /gabe-teach history
```

**Step 8c.1 — Suggested next actions logic** (deterministic, pick first 2-3 that apply):

| Signal | Hint |
|--------|------|
| Any well with pending_count ≥ 3 | `High-pending wells: [list] → /gabe-teach topics` |
| Any stale_count > 0 across wells | `Stale knowledge in [wells] → /gabe-teach topics (auto-refreshes)` |
| No active plan | `No active plan → /gabe-plan to set one` |
| PENDING.md has ≥ 3 open items | `[N] deferred items backing up → /gabe-review to triage` |
| No storyline AND ≥ 3 archived plans | `Enough history for a story → /gabe-teach story` |
| Wells exist but all have empty Paths | `Wells lack path globs (activity signals disabled) → /gabe-teach wells + [paths N]` |
| ≥ 1 well has empty Docs AND wasn't opted out explicitly | `Wells without docs: [list] → /gabe-teach wells → [docs N]` |
| PENDING.md has open Layer-3 doc-drift findings | `Doc drift on wells: [list] → /gabe-review` |
| Nothing above applies | `Looking healthy. Consider /gabe-health for deeper audit.` |

**Step 8d — Missing data graceful degradation:**

| Missing | Behavior |
|---------|----------|
| BEHAVIOR.md `domain:` field | `App: (not set — add \`domain:\` to BEHAVIOR.md frontmatter)` |
| PLAN.md absent OR status != active | `Active: No active plan` |
| LEDGER.md absent or empty | Skip the "From LEDGER.md" block; show scalar commit count |
| PENDING.md absent or all-closed | `Deferred items: none` |
| DECISIONS.md absent or empty | `Key decisions: none recorded` |
| Well has empty Paths | Show `paths not set` inline; `last: —`; health falls through to cold/stale using topic signals only |
| Well has empty Docs | Show `Docs: ⚠ no doc` inline; OPEN & NEXT rule flags "Wells without docs: [list]" |
| Well has non-empty Docs but file missing | Show `Docs: ⚠ docs/wells/1-x.md missing` inline; suggest `/gabe-teach init-wells` or manual create |
| No wells | Foundation gate blocks before Step 8a |

**Step 8e — No persistence (except backfills):**

Brief mode is read-only except for one-time Analogy backfill (Step 8b.5) and one-time Paths backfill (Step 8b.6). It does NOT write plans, decisions, topics, or activity. Safe to re-run anytime.

**Step 8f — Short-brief variant (for in-menu invocation):**

When brief is invoked with `short` flag (from `[0]` in topics menu):
- Render only the GRAVITY WELLS block
- Skip App/Stack/Maturity/Active header
- Skip CONTEXT, OPEN & NEXT, RECENT PROJECT ACTIVITY, COMMANDS sections
- Keep Analogy+Paths backfill logic (they're load-bearing for the wells block itself)
- Target output: ≤20 lines total

**Note on LLM usage:**

Brief is deterministic once analogies are cached. First run after adding the Analogy column fires one gabe-lens call per well missing an analogy; cached thereafter. For narrative depth, `/gabe-teach story` remains the LLM-backed companion.

**Principle — progressive-depth analogies everywhere:**

Whenever `/gabe-teach` surfaces a concept that a newcomer or fatigued operator might not grasp instantly, attach a `gabe-lens` oneliner by default. Escalate to `brief` mode if the oneliner can't carry the weight, and only use full analogy when the concept is genuinely load-bearing. This applies to wells (here), to topics in `topics` mode (optional add-on), and to any future surface where the suite presents architectural terms. Cheap cognitive insurance.

---

### Step 9: Arch mode (architecture curriculum)

Enters when `$ARGUMENTS` starts with `arch`. Subcommand routing (teach-first):

| Subcommand | Routes to | Kind |
|------------|-----------|------|
| `arch` (bare) | Step 9f — pick next concept via progressive-pressure rule and **teach it immediately** | teach |
| `arch next` | Same as bare `arch` — pick + teach | teach |
| `arch show <id>` | Step 9c — teach specified concept | teach |
| `arch verify <id>` | Step 9d — test-or-skip shortcut (uses Universal Action Menu `[test]` / `[next]`) | admin |
| `arch browse [tier\|spec]` | Step 9b — catalog view, no teaching | admin |
| `arch dashboard` | Step 9a — tier × spec map with bars, no teaching | admin |

**Breaking change vs legacy:** bare `arch` used to show the dashboard. It now teaches. The dashboard moved to `arch dashboard`. Rationale: teaching is the common case; the dashboard was a landing page the user had to get past.

**Data sources** (all read-only in this mode except for Step 9d's verify writes):

- Concept catalog: `~/.claude/skills/gabe-arch/concepts/**/*.md` — every concept file
- Global state: `~/.claude/gabe-arch/STATE.md` — cross-project verification status
- History log: `~/.claude/gabe-arch/HISTORY.md` — append-only event log
- Per-project tags: `.kdbp/KNOWLEDGE.md` Topics table `ArchConcepts` column (optional — arch mode works without a project)

**Lazy bootstrap:** if `~/.claude/gabe-arch/` doesn't exist, create it from templates before any read:

```sh
mkdir -p ~/.claude/gabe-arch
[ -f ~/.claude/gabe-arch/STATE.md ]   || cp ~/.claude/templates/gabe/gabe-arch-STATE.md   ~/.claude/gabe-arch/STATE.md
[ -f ~/.claude/gabe-arch/HISTORY.md ] || cp ~/.claude/templates/gabe/gabe-arch-HISTORY.md ~/.claude/gabe-arch/HISTORY.md
```

No prompt — silent creation on first use.

#### Step 9a — Dashboard (`arch dashboard`, admin mode)

_Admin surface, no teaching._ Used when the human explicitly wants the catalog status at a glance. Read all concept files' frontmatter (tier, specialization, id, one_liner) and STATE.md. Render:

```
ARCHITECTURE MAP — [global, cross-project]

  agent                    ▓▓▓▓▓▓▓░░░  intermediate   (7 foundational + 3 intermediate verified / 12 total)
  cost                     ▓▓░░░░░░░░  none           (1 foundational verified / 3 total)
  data                     ░░░░░░░░░░  none           (0 / 3)
  distributed-reliability  ▓▓▓▓░░░░░░  foundational   (2 verified / 3 total)
  infra                    ░░░░░░░░░░  none           (0 / 3)
  security                 ▓░░░░░░░░░  none           (1 foundational / 3 total)
  web                      ░░░░░░░░░░  none           (0 / 3)

Total concepts:   30   Verified:   11   Pending:   3   Available:  16

Recent (last 5 from HISTORY.md):
  2026-04-17  VERIFY    retry-with-exponential-backoff   via topic T7 in ai-app
  2026-04-17  VERIFY    idempotency-keys                 via topic T7 in ai-app
  ...

Suggested next (project-driven):
  → circuit-breaker (intermediate · distributed-reliability)
     Reason: topic T12 in ai-app tagged this but not yet taught.

Commands:
  /gabe-teach arch browse agent          List agent concepts
  /gabe-teach arch browse foundational   List foundational concepts across all specs
  /gabe-teach arch show retry-with-exponential-backoff   Teach this concept
  /gabe-teach arch verify idempotency-keys               Mark as already-known
  /gabe-teach arch next                  System picks the next concept (Phase 6)
```

**Tier derivation rule** (per spec, re-computed on read, no persisted field):

- `foundational` reached: ≥60% of published `foundational` concepts in that spec are `verified`
- `intermediate` reached: foundational reached AND ≥50% of `intermediate` concepts verified
- `advanced` reached: intermediate reached AND ≥40% of `advanced` concepts verified

Bar rendering: 10 cells, each cell = 10% of total concepts in the spec that are verified. Shows progress even before a tier is reached.

"Suggested next" in the dashboard is the Phase 6 `arch next` rule applied to give one suggestion without running the full mode. If no project is active or no tagged topics exist, show the first adjacency-rule match instead.

#### Step 9b — Browse (`arch browse [tier|spec]`)

Resolve the argument:

- If it matches a tier (`foundational` / `intermediate` / `advanced`): filter all concepts by tier.
- If it matches a specialization (`agent` / `cost` / `data` / `distributed-reliability` / `security` / `infra` / `web`): filter by specialization (primary or secondary — glob all `concepts/**/*.md`, filter by frontmatter `specialization` array contains the spec).
- If empty: list all concepts grouped by spec.

Render, with concept status from STATE.md:

```
BROWSE — specialization: agent  (12 concepts)

Foundational (6):
  ✅ pattern-single-agent-pipeline      "One agent + fixed deterministic stages around it — the boring pattern that wins."
  ✅ structured-output-enforcement      "Never trust prompt instructions to produce valid JSON — enforce at the framework layer."
  ⏳ input-guardrails                   "Filter adversarial input before it reaches the model — cheaper than filtering output."
  ○  async-background-processing        "Return a ticket immediately; process in the background; stream progress separately."
  ...

Intermediate (4):
  ✅ deterministic-fallback-chain       "When structured output fails, don't raise — degrade through a chain of cheaper guesses."
  ○  pattern-multi-model-pipeline       "Different models at different stages — cheap for sorting, expensive only for reasoning."
  ...

Advanced (2):
  ○  pattern-state-machine              "Nodes + edges + checkpoints — for agents that must survive restarts and pause for humans."
  ○  pattern-tool-use-loop              "Give the agent tools and a stopping condition — let it decide what to look at."

Status legend: ✅ verified · ⏳ pending · ○ available · ⊘ skipped · △ stale
```

No LLM calls. Pure frontmatter read + status lookup.

#### Step 9c — Show (`arch show <concept-id>`)

Read the concept file at `~/.claude/skills/gabe-arch/concepts/{specialization}/{id}.md`. If not found, fuzzy-match against all IDs and suggest up to 3 closest.

Render through the unified 7-section lesson template (same as Step 4d), with the following source mapping:

| Lesson section  | Source in concept file |
|-----------------|------------------------|
| Header          | `T-arch (<primary-spec>, <tier>) — <name>` |
| The problem     | `## The problem` body verbatim |
| The idea        | `## The idea` body verbatim (one sentence, frontmatter `one_liner` is a fallback when the body section is absent) |
| Handle          | Frontmatter `one_liner` rendered as `Handle: "<one_liner>"`. If longer than 10 words, tighten at render time (Haiku call) or render verbatim and emit a warning. |
| Picture it      | `## Picture it` body verbatim (brief mode uses just the first sentence) |
| How the picture maps | `## How it maps` body verbatim — renders as arrow-lines exactly as authored |
| Easy to confuse with | **New v2.7 section.** Optional. Renders when (a) the concept file has a `## Easy to confuse with` section, OR (b) gabe-lens-learning.md has an active `P1 Distinction conflation` pattern affecting this concept. Source: concept file body verbatim (cap at 3 bullets). When source (b) fires without source (a), a one-line Sonnet call generates 1-2 tailored distinctions on the fly (same shared Sonnet call as Step 9c.4 drift analysis — no extra LLM cost). |
| In your codebase | **New v2.4 section.** Only when `.kdbp/` present AND concept has tagged topics in KNOWLEDGE.md. Renders grouped file list per tagged topic with one-line purpose per file. See "In-your-codebase construction" below. |
| Gaps vs. the mapping | **New v2.4 section.** Only when In-your-codebase rendered AND gap-detection LLM call succeeds AND gaps ≥ 1. LLM output constrained via `output_type`. See "Gap-detection construction" below. |
| Primary force   | `## Primary force` body verbatim |
| When to reach for it | `## When to reach for it` bullets (top 3) |
| When NOT to reach for it | `## When NOT to reach for it` bullets (top 4) |
| **`---`** + **`## Your turn`** | Hard-coded separator and heading; mark the boundary between lesson body and interaction block. Always rendered for teach-mode lessons. |
| Where this lives in your project | **Always rendered** — deterministic read from `.kdbp/KNOWLEDGE.md` Topics table. See "Where-this-lives construction" below. Absorbs what used to be a separate `Further reading` section for arch (D2=C). |
| Architecture link | Omitted for arch concepts (redundant with the footer's `related:` list) |
| Signal          | Frontmatter `signal:` field if present (values: `quick-check` / `deeper-5min` / `rethink`). Rendered as `Signal: Quick check ✓`, `Signal: Deeper question ◆ (~5 min focus)`, or `Signal: Deeper question ◆ (rethink your model)`. Default when absent: `deeper-5min` (arch concepts are in the catalog because they have layers). |
| Q1, Q2          | Generated per session from `## When NOT to reach for it` + `## Primary force` via ONE short LLM call. Cached for the session only (not stored in the concept file — questions should rotate) |
| Footer (context) | Single line after Universal Action Menu: `Context: <tier> · <specializations joined with +> · prereqs: <list-or-"none"> · related: <list-or-"none">` |

**Authoring-section name migration** (for backward-compat with older concept files that haven't been refactored to the new headings):

| Old heading (pre-refactor) | New heading | Rendering fallback |
|---------------------------|-------------|--------------------|
| `## Analogy` | `## Picture it` | If `## Picture it` absent, read `## Analogy` into the Picture-it section |
| _(new — no old analog)_ | `## The problem` | Fallback: first sentence of `## Primary force` (as before) |
| _(new — no old analog)_ | `## The idea` | Fallback: `one_liner` frontmatter field |
| _(new — no old analog)_ | `## How it maps` | Fallback: **render-time LLM call** to synthesize 3-5 mapping arrows from the analogy + primary-force body. Haiku tier; see constraints below. |
| `## When it applies` | `## When to reach for it` | If new heading absent, read `## When it applies` |
| `## When it doesn't` + `## Common mistakes` | `## When NOT to reach for it` | If new heading absent, concatenate bullets from both old sections (cap at 4) |

**Mapping-section LLM fallback constraints** (only fires when `## How it maps` isn't authored):

- Cheap model (Haiku tier)
- Context: only the concept file body (not the full catalog)
- Output: `output_type` with a list of 3-5 mapping pairs, each `{analogy_piece: str, code_piece: str}` with ≤8 words per side
- Result is NOT cached in the concept file — authors should write the section properly; the fallback is a stopgap, not a shortcut
- If the call fails: render `How the picture maps:\n  (mapping not yet authored — see Analogy section above)` and log a warning to the session so the author sees a reminder to fill in the section

**Questions-generation LLM call constraints:**

- Cheap model (Haiku tier)
- Context: only the concept file body (not the full catalog)
- Output: `output_type` with two questions, each ≤2 sentences
- Each question must reference only artifacts taught in the rendered lesson (same hard rule as Step 4d-lesson rule 1)
- If the call fails: fall back to two canned questions pulled deterministically from the first two `## When NOT to reach for it` bullets (inverted: "If you applied this pattern to [anti-pattern case], what specific problem from [Primary force] re-emerges and why?")

After Q1/Q2, classify response exactly as Step 4d does: `verified` (score 2/2 or 1/2) / `pending` / `skipped` / `already-known` (sanity-check). The classification writes to STATE.md and HISTORY.md (see Step 9e). On `verified` or `already-known` (with a `.kdbp/` project present), Steps 9c.1, 9c.2, AND 9c.3 run in that order to persist the learning into project docs and (if gaps were detected) offer remediation actions.

**Step 9c.0 — Auto-suggest tagging (MOVED to Step 9c.0.5 — post-verify, see below)**

Previously ran pre-render; as of v2.6 this step runs AFTER Q1/Q2 classify. Rationale: only persist a tag once the user has demonstrated understanding. Failed lessons shouldn't propagate the tag graph. The chicken-and-egg for code anchoring is solved differently — the pre-render section now renders the empty-state with a note that tag-suggest will fire post-verify.

The algorithm and behavior are unchanged from the old 9c.0; only the position in the flow. See Step 9c.0.5 below.

**Heuristic match (deterministic, zero-LLM):**

Score each topic in KNOWLEDGE.md against the concept's `## Evidence a topic touches this` section (every concept file carries this section — it's the tagging hook authored specifically for this flow).

For each topic row, compute `match_score`:
- +2 for each Evidence `Keyword` that appears in the topic's Title or Source columns (case-insensitive substring)
- +2 for each Evidence `Files` glob that matches any file in the topic's candidate file list (from Step 4b record)
- +1 for each Evidence `Commit verb` that appears in the topic's commit subjects

**Strong match:** `match_score ≥ 3`. Typically fires when a topic has both keyword + file match (e.g., T2 "Why multipart + 202 + BackgroundTask" matches async-background-processing's keywords "202 Accepted, BackgroundTask" AND files `**/api/*.py`).

**If at least one strong match is found, prompt the user:**

```
No topics tagged with async-background-processing yet — but this project looks like a match:

  • T2 "Why multipart + 202 Accepted + BackgroundTask" (verified) — G3 API Layer
    Match: keywords "202 Accepted", "BackgroundTask" ✓ · files app/api/*.py ✓
  • T7 "Why uploads/ lives at project root" (pending) — G3 API Layer
    Match: files app/api/*.py ✓  (weaker)

Tag these so the lesson can anchor in your code?

  [y]       Tag T2 only (strongest match)
  [all]     Tag all proposed matches (T2, T7)
  [manual]  I'll edit KNOWLEDGE.md later — render without code anchoring
  [never]   Don't auto-suggest tags for this project
```

**Action handlers:**

- `[y]` → update T2's ArchConcepts column (append comma-separated if existing). One-line confirmation: `✅ Tagged T2 with async-background-processing. Proceeding with full lesson.`
- `[all]` → update all proposed matches' ArchConcepts columns. Same confirmation format.
- `[manual]` → proceed to render with empty ArchConcepts; user gets the Where-this-lives empty-state message as before.
- `[never]` → write BEHAVIOR.md key `teach_arch_auto_suggest_tag: never`; proceed like `[manual]`.

**BEHAVIOR.md key:** `teach_arch_auto_suggest_tag: prompt | accept | never` (default: `prompt`).

- `accept` = silently tag all strong matches; one-line summary only
- `prompt` = ask the user (default — preserves agency)
- `never` = skip Step 9c.0 entirely

**After tagging** (whether via `[y]`, `[all]`, or `accept`), re-read KNOWLEDGE.md so the downstream "In your codebase" + "Gaps vs. the mapping" sections use the just-written tags. No re-run of Step 9c.0 — one pass per lesson.

**Edge cases:**

- No strong matches found → skip the prompt entirely; render with empty ArchConcepts and the Where-this-lives hint.
- User has `teach_arch_auto_suggest_tag: never` → skip even when strong matches exist.
- Concept has already-tagged topics (score ≥ 1 topic matched) → skip Step 9c.0; the render will use existing tags.

**Rendering rules (apply to all sections above — lesson body + Your turn + Q1/Q2):**

1. **Acronym expansion on first use.** In the render output, the first mention of any acronym (LLM, SSE, OCR, API, HTTP, DB, etc.) in a given lesson must be followed by the expansion in parentheses: `LLM (Large Language Model)`. Subsequent mentions use the bare acronym. Applies across all rendered sections including Q1/Q2. Protocol names that are proper nouns (FastAPI, PostgreSQL, GitHub) are exempt — they're product names, not acronyms.

2. **T-code / G-code naming on first use.** The first mention of any project-specific code reference (T[N] for topic, G[N] for well, P[N] for pending, D[N] for decision) in a given lesson must include the target's Title field in quotes: `T2 "Why multipart + 202 + BackgroundTask"`. Subsequent mentions use the bare code. Applies to lesson body, Your turn section, Q1/Q2, and footer.

3. **File path references.** When code or doc references appear inline in lesson text (e.g., in Q1/Q2 or Where-this-lives), use backtick-quoted relative paths anchored at project root: `app/api/main.py`, `docs/wells/3-api-layer.md`. Full paths only for system-global references (e.g., `~/.claude/skills/gabe-arch/...`).

**Render `## Deeper reading` from concept file** — added to Your turn section, between Signal and Q1/Q2:

```
More depth (external docs):
  → <deeper-reading-entry-1>
  → <deeper-reading-entry-2>
```

Sourced verbatim from the concept file's `## Deeper reading` section. Render only if that section is non-empty AND at least one entry is a concrete doc path / URL (ignore bullets that are purely descriptive with no link target). Cap at 3 entries.

**In-your-codebase construction** (deterministic, renders in lesson body between "How it maps" and "Primary force"):

Connects the mapping to concrete files in the current project so the reader doesn't have to go hunting during Q&A.

1. **Guard conditions (skip this section entirely if any fail):**
   - `.kdbp/` exists at project root
   - At least one row in KNOWLEDGE.md Topics table has this concept ID in its `ArchConcepts` column
2. **Gather tagged topics:** filter rows where `ArchConcepts` contains the concept ID (comma-split, trim, case-insensitive). Order by `Status` (verified first, then already-known, then pending) then by topic ID.
3. **For each topic, pull file list:** from the Step 4b candidate record (stored in KNOWLEDGE.md's per-topic block, or regenerated by re-running the Step 4b signal extraction for that commit range).
4. **For each file, extract one-line purpose:** deterministic, first match wins (same rules as Step 11a tour extraction):
   - Python: first module docstring (`"""…"""` at top)
   - TypeScript/JavaScript: first `/** … */` jsdoc, else first `//` comment
   - If nothing extractable: purpose field renders as `(no header comment)` — don't synthesize via LLM
5. **Render format:**
   ```
   In your codebase:
     T2 "Why multipart + 202 + BackgroundTask" — G3 API Layer · verified 2026-04-18
       app/api/main.py           — multipart submit, ticket_id generation, 202 response
       app/workers/triage.py     — BackgroundTask handler (the "attendant")

     T7 "Why uploads/ lives at project root" — G3 API Layer · pending
       app/api/main.py           — same file as T2 (multipart path handling)
   ```
   Cap at 3 topics; overflow hint `… and N more topics`. Cap at 5 files per topic; overflow hint `… and N more files`.
6. **Cross-topic file dedup:** if the same file appears in ≥2 topics, annotate the subsequent occurrences with `— same file as T[N] (…)` instead of re-extracting the purpose. Keeps the section tight.

**Gap-detection construction** (LLM-backed, renders right after "In your codebase"):

Surfaces mapping lines that have no corresponding implementation in the tagged topics' files — these are the teaching-dense moments the user would otherwise discover only via Q1/Q2 archaeology.

1. **Guard conditions:**
   - "In your codebase" block rendered (i.e., guard conditions above passed)
   - Session hasn't previously fired gap-detection for this concept (in-session dedup)
2. **LLM call (Haiku tier, framework-enforced structured output per U4):**
   - **Model:** `claude-haiku-4-5`
   - **Context:** the concept's `## How it maps` body verbatim + the tagged topics' file headers (first 80 lines of each file). Do NOT stream full file contents — we're looking for presence, not deep analysis.
   - **Output type (PydanticAI / Claude tool_choice enforced):**
     ```python
     class MappingGapAnalysis(BaseModel):
         implemented: list[str]  # analogy-piece names with matching code
         gaps: list[GapEntry]    # analogy pieces with no matching code

     class GapEntry(BaseModel):
         analogy_piece: str        # e.g., "Persisted job state"
         mapping_line: str          # the full `<lhs>  →  <rhs>` as authored
         why_no_match: str          # 1 sentence: what specifically is missing
     ```
   - **Token cap:** 400 tokens (keeps cost negligible; one call ≈ $0.001)
   - **Cache:** session-scoped by concept ID; re-ticket if the same concept is re-taught in the same session.
3. **Render format (only if `gaps` list non-empty):**
   ```
   Gaps vs. the mapping:
     ⚠ Persisted job state — no matching code in tagged topics. Jobs live in
       FastAPI process memory only; server restart loses the ticket-check index.
     ⚠ SSE or status polling — no status endpoint found. If the client needs
       progress updates, this surface is still missing.
   ```
   Cap: 3 gaps rendered; overflow hint `… and N more gaps not shown`.
4. **Failure modes:**
   - LLM call fails (network, quota, model error) → skip the Gaps block silently; emit one-line session warning `⚠ Gap detection unavailable this session (LLM call failed). Continuing without gap analysis.`
   - LLM returns malformed output despite `output_type` (rare with framework enforcement) → same fallback as above.
   - All mapping lines implemented → render `No gaps detected — every mapping line has matching code in tagged topics.` (this is teaching-positive; the user sees completeness explicitly).
5. **Gap list is cached in session state** for Step 9c.3 (post-verify remediation prompt). Not persisted to disk unless 9c.3 converts it to PENDING/DECISIONS/architecture-patterns entries.

**BEHAVIOR.md opt-out:** key `teach_arch_gap_detect: always | never` (default: `always`). Set to `never` to skip the LLM call entirely (e.g., offline or cost-sensitive sessions).

**Where-this-lives construction** (zero-LLM, deterministic, always rendered for arch concepts):

Connects the abstract concept to the concrete project — the single most important link for making arch lessons land beyond "interesting reading."

1. **Project topics touching this concept:** Filter `.kdbp/KNOWLEDGE.md` Topics table for rows whose `ArchConcepts` column contains the current concept ID (comma-split, trim). Group by `Well`. Sort wells by ID (G1, G2, …). Within each well, sort topics by ID ascending.
2. **Render format (one line per well, up to 5 wells, topics capped at 5 per well with overflow hint):**
   ```
   Where this lives in your project:
     G3 API Layer       →  T2 (verified), T7 (pending) — docs/wells/3-api-layer.md
     G1 Guardrails      →  T4 (skipped) — docs/wells/1-guardrails.md
     G5 Workers         →  T12 (verified), T15, T19 — docs/wells/5-workers.md
   ```
   Well-doc path comes from the `Docs` column in KNOWLEDGE.md's Gravity Wells table. If empty, render `(no Docs path — run /gabe-teach wells → [docs N])` in place of the path.
3. **Project-level architecture doc:** If `docs/architecture-patterns.md` exists AND contains a `## <concept-id>` section, append a final line:
   ```
     docs/architecture-patterns.md#<concept-id>  →  project rationale + decisions around this pattern
   ```
4. **Empty state (concept not yet applied in this project):**
   ```
   Where this lives in your project:
     (no topics touch this concept yet — add ArchConcepts: <concept-id> to a topic
     row in KNOWLEDGE.md, or run /gabe-teach topics and tag during verify)
   ```
   The empty state is itself teaching: it signals "go find work that'll use this" instead of pretending the absence is OK.
5. **No `.kdbp/` present:** render `Where this lives in your project: (no KDBP — teach mode is cross-project).` Skip the well enumeration entirely.

The section replaces what used to be a separate `Further reading` block for arch concepts (D2=C). One unified section pointing to topics + doc paths at once.

#### Step 9c.1 — Auto-append verified concept to well docs (prompt-first)

Triggered when Step 9c or Step 9d classifies an arch concept as `verified` or `already-known` AND `.kdbp/` is present AND the concept has at least one matching row in KNOWLEDGE.md's `ArchConcepts` column.

**Scope:** For EACH well that has topics tagged with this concept, check the well's Docs file and offer to append a project-adoption record.

**Append format** — inserts/updates a section under `## Architecture patterns` in the well's Docs file (creating the heading if absent, always as the last top-level section before the existing `## Topics (auto-appended)` section):

```markdown
## Architecture patterns

### async-background-processing (foundational · agent, web)

**Verified:** 2026-04-19 via /gabe-teach arch (score 2/2)
**Used in this well's topics:** T2, T7
**Why we use it:** Decouple client wait from server work — return 202, stream progress via SSE.
```

- The `**Why we use it:**` line is sourced from the concept's `one_liner` frontmatter, rewritten in first-person-plural. For arch concepts without a tailored project rationale, fallback is the literal `one_liner`.
- If a section with the same concept-id heading already exists in the well doc, update the `**Verified:**` line (latest date wins), refresh the `**Used in this well's topics:**` list, and leave the `**Why we use it:**` line untouched (humans may have edited it; don't clobber).

**Prompt behavior** (respects BEHAVIOR.md frontmatter key `teach_arch_append_well: prompt | always | never`, default `prompt`):

- `always` → append/update silently across all affected wells, show one-line summary: `✅ Recorded in 2 well docs: docs/wells/3-api-layer.md, docs/wells/5-workers.md`
- `never` → skip silently
- `prompt`:
  ```
  Concept "async-background-processing" verified. Record in well docs?
    Affected: docs/wells/3-api-layer.md (G3 — 2 topics)
              docs/wells/5-workers.md    (G5 — 1 topic)

    [y]      Append to both this once
    [n]      Skip this once
    [pick]   Let me choose per-well
    [always] Always record; don't prompt again
    [never]  Never prompt again; don't record
  ```
  `always` and `never` write `teach_arch_append_well: always|never` to BEHAVIOR.md frontmatter.
  `pick` → interactive per-well `[y]/[n]` loop.

**Degraded cases:**

- Well's Docs column empty → skip that well silently (well opted out of doc tracking).
- Well's Docs file doesn't exist → skip with one-line warning: `⚠ Can't record in docs/wells/3-api.md (not found). Run /gabe-teach wells → [docs N] to fix path.`
- Gravity Well has `Docs` but no write permission → abort for that well with a warning; don't retry.

#### Step 9c.2 — Auto-append verified concept to docs/architecture-patterns.md (prompt-first)

Triggered alongside Step 9c.1, but targets the project-level architecture-patterns ledger instead of per-well docs. This gives new contributors a single "what patterns does this project use and why?" surface they can find without knowing KDBP exists.

**Target file:** `docs/architecture-patterns.md` (scaffolded by `/gabe-init` Step 3 for agent-app and web-app project types; humans can opt in for other project types by creating the file manually).

If `docs/architecture-patterns.md` doesn't exist, Step 9c.2 offers to scaffold it on first trigger (prompt: `docs/architecture-patterns.md not found. Create it now? [y/n]`). A `[n]` response falls through to "skip silently for this project" and writes `teach_arch_append_patterns: never` to BEHAVIOR.md.

**Append format** — inserts/updates a section keyed by concept id:

```markdown
## async-background-processing (foundational · agent, web)

**Verified:** 2026-04-19 via /gabe-teach arch (score 2/2)
**Applied in:** G3 API Layer (T2, T7), G5 Workers (T12)
**Why we use it:** Decouple client wait from server work — return 202, stream progress via SSE.

### Decisions around this pattern

<!-- Auto-populated from DECISIONS.md rows whose Title or Rationale cites this concept-id. -->
<!-- If no matching decision rows, this block reads: "(no DECISIONS rows cite this concept yet)" -->
```

- `**Applied in:**` aggregates across ALL wells (vs Step 9c.1 which shows only the current well).
- The `### Decisions around this pattern` block is auto-populated: scan `.kdbp/DECISIONS.md` for rows whose Title or Rationale mentions the concept ID (case-insensitive substring match), include up to 3 most-recent rows as bullets with the decision's Title + Date. Skip the `operational`-tagged rows (L6 filter, same as retro).
- If a section with the same concept-id heading already exists, update the `**Verified:**` line (latest date wins), refresh `**Applied in:**`, rebuild the decisions block, and leave `**Why we use it:**` alone.

**Prompt behavior** (respects BEHAVIOR.md key `teach_arch_append_patterns: prompt | always | never`, default `prompt`):

- `always` / `never` — as in 9c.1.
- `prompt`:
  ```
  Record "async-background-processing" in docs/architecture-patterns.md?

    This file is the project's human-readable "patterns we use" ledger.
    Appending here makes the adoption visible to anyone reading docs/.

    [y]      Append this once
    [n]      Skip this once
    [always] Always record; don't prompt again
    [never]  Never prompt again; don't record
  ```

**Relationship between 9c.1 and 9c.2:**

- Step 9c.1 writes project-specific "this well uses this pattern for these topics" — per-well scope.
- Step 9c.2 writes project-global "here are all the patterns we've adopted with full decision lineage" — project-wide scope, human-facing single file.

A user can opt into one without the other (e.g., `teach_arch_append_well: always, teach_arch_append_patterns: prompt`).

**Ordering:** 9c.1 runs first (per-well updates), then 9c.2 (project-level aggregate), then 9c.3 (gap remediation). All are idempotent — re-running gives the same result modulo verified-date updates.

#### Step 9c.3 — Gap remediation (prompt-first)

Triggered when Step 9c's gap-detection LLM call returned ≥1 gap AND the lesson classified as `verified` or `already-known`. The insight from gap detection is a learning artifact — losing it at session end wastes the LLM call.

**Flow:** for EACH gap in session state (from Step 9c gap-detection):

Render the gap header + action menu:

```
1 gap identified during this lesson:
  ⚠ Persisted job state — no matching code in tagged topics. Jobs live in
    FastAPI process memory only; server restart loses the ticket-check index.

What should we do with this?

  [p]       Add to .kdbp/PENDING.md as a work item
            → "Implement persisted job state (gap from async-background-processing)"
  [a]       Note in docs/architecture-patterns.md under this concept's section
            → Under "### Known limitations" subheading
  [d]       Record as a DECISIONS.md row (e.g., "intentionally in-memory for v1")
            → Opens a brief prompt for rationale + alternatives
  [skip]    Acknowledge and move on (no write-back)
  [always <action>]  Remember this choice — don't prompt on future gaps
  [never]   Stop asking about gaps going forward
```

**BEHAVIOR.md opt-out:** key `teach_arch_gap_action: prompt | pending | note | decision | never` (default: `prompt`).

- `pending` → silent auto-append to PENDING.md for every gap; one-line summary: `✅ 1 gap added to PENDING.md`
- `note` → silent auto-append to docs/architecture-patterns.md `### Known limitations` subsection
- `decision` → NOT available as a silent default (decisions require rationale which needs input); falls back to `prompt` if set
- `never` → skip Step 9c.3 entirely; no prompts, no writes

**Action handlers:**

**[p] — Add to PENDING.md:**

Appends a row to `.kdbp/PENDING.md` Pending Items table (create the table if missing):

```markdown
| # | Added | Title | Source | Trigger | Status |
|---|-------|-------|--------|---------|--------|
| P[N] | 2026-04-20 | Implement persisted job state | gap from async-background-processing teach | production-readiness | open |
```

Row ID `P[N]` is max(existing) + 1. The `Source` column explicitly names the teach session so future readers can trace provenance.

**[a] — Note in architecture-patterns.md:**

Updates the concept's section in `docs/architecture-patterns.md` (creates the `### Known limitations` subheading if absent):

```markdown
## async-background-processing (foundational · agent, web)

**Verified:** 2026-04-20 via /gabe-teach arch (score 2/2)
**Applied in:** G3 API Layer (T2, T7)
**Why we use it:** Decouple client wait from server work — return 202, stream progress via SSE.

### Known limitations

- **Persisted job state** — jobs live in FastAPI process memory only; server
  restart loses the ticket-check index. Identified during teach session
  2026-04-20. Track remediation in PENDING.md#PN if this becomes a blocker.
```

**[d] — Record as DECISIONS.md row:**

Opens a brief prompt to collect rationale, then appends to `.kdbp/DECISIONS.md`:

```
Recording as a DECISIONS.md row:

  Title: [pre-filled — "Keep async jobs in-memory for v1"]
  Rationale (1-2 sentences): _
  Alternatives considered (optional): _
  Revisit trigger (optional): _
```

Writes:
```markdown
| D[N] | 2026-04-20 | Keep async jobs in-memory for v1 | <rationale> | <alternatives> | active | gap from async-background-processing teach |
```

Decision rows written by Step 9c.3 carry a standard Source attribution so retro mode and docs-audit can trace their provenance.

**Cross-action behavior:**

- `[always pending]` writes `teach_arch_gap_action: pending` to BEHAVIOR.md.
- `[never]` writes `teach_arch_gap_action: never`. Reversible by editing BEHAVIOR.md or running `/gabe-teach behavior`.
- Multiple gaps in one lesson: prompt per-gap by default. If the user picks `[always <action>]` on the first gap, subsequent gaps in the same lesson use that action silently without re-prompting.

**Idempotency:** If the same gap is detected in a future lesson of the same concept (e.g., after fixing code but before re-tagging), Step 9c.3 checks whether a matching PENDING row / architecture-patterns limitation / DECISIONS row already exists. If so, skip silently and emit one-line note: `✓ Gap "Persisted job state" already tracked in PENDING.md#P4.` Prevents duplicate entries across re-teach sessions.

#### Step 9c.0.5 — Auto-suggest tagging (post-verify)

Moved from pre-render (old Step 9c.0). Runs after Q1/Q2 classification on `verified` (2/2 or 1/2) or `already-known`. Skipped on `pending` or `skipped` — a failed lesson shouldn't propagate the tag graph.

Algorithm unchanged from previous Step 9c.0:

**Heuristic match (deterministic, zero-LLM):**

For each topic in KNOWLEDGE.md, score `match_score` against the concept's `## Evidence a topic touches this` section:
- +2 per Evidence `Keyword` matching Title or Source columns
- +2 per Evidence `Files` glob matching the topic's candidate file list
- +1 per Evidence `Commit verb` matching commit subjects

**Strong match:** `match_score ≥ 3`.

**Prompt (only if ≥1 strong match AND concept has zero tagged topics):**

```
✓ Lesson verified (1/2). Based on your answers, async-background-processing looks
  applied in this project:

  • T2 "Why multipart + 202 Accepted + BackgroundTask" (verified) — G3 API Layer
    Match: keywords "202 Accepted", "BackgroundTask" ✓ · files app/api/*.py ✓

Tag these for future code-anchored lessons?

  [y]       Tag T2 (strongest match)
  [all]     Tag all proposed matches
  [manual]  Skip — I'll tag manually later
  [never]   Don't auto-suggest tags for this project
```

**BEHAVIOR.md opt-out key:** `teach_arch_auto_suggest_tag: prompt | accept | never` (default: `prompt`).

**Ordering:** runs AFTER 9c.1/9c.2/9c.3 (doc persistence + gap remediation) so the user sees a clean "lesson complete → persist what you learned → tag for next time" sequence.

#### Step 9c.4 — Drift analyzer (Sonnet-backed, post-verify)

Runs after every verify that scores less than 2/2 — that's where the signal lives. Skipped on clean 2/2, skipped on `skipped` / `pending` (no answer to analyze), skipped when `teach_drift_analyzer: never` is set in gabe-lens-profile.md frontmatter or project BEHAVIOR.md.

**Purpose:** detect which lesson sections the user missed, classify the miss pattern, and either append to the miss log or upgrade an existing pattern's observation count.

**LLM call (Sonnet, output_type enforced per U4):**

- **Model:** `claude-sonnet-4-6` (not Haiku — pattern detection requires nuance; this is the most reasoning-heavy call in teach)
- **Context:** lesson body verbatim + Q1/Q2 text + user's answer + correct answer key + current active patterns from `~/.claude/gabe-lens-learning.md` (so the LLM can decide "new pattern vs observation of existing one")
- **Output type:**
  ```python
  class DriftAnalysis(BaseModel):
      misses: list[Miss]              # one per partial/wrong answer
      pattern_match: PatternRef | None  # existing pattern this observation reinforces
      new_pattern_candidate: NewPattern | None  # if this looks novel
      content_augmentations: list[Augmentation]  # D4-B suggestions for future renders

  class Miss(BaseModel):
      question: Literal["Q1", "Q2"]
      section_missed: str      # e.g., "Primary force", "When NOT to reach for it"
      user_paraphrase: str      # ≤20 words
      correct_paraphrase: str    # ≤20 words
      severity: Literal["partial", "wrong"]

  class PatternRef(BaseModel):
      id: str                    # e.g., "P1"
      confidence_delta: Literal["strengthens", "weakens", "neutral"]

  class NewPattern(BaseModel):
      signal_name: str          # e.g., "Distinction conflation"
      signal_description: str    # 1-2 sentences

  class Augmentation(BaseModel):
      section: str              # which section to augment on next render
      suggestion: str            # e.g., "Add 'and this is NOT X' line to mapping for <analogy-piece>"
  ```
- **Token cap:** 1200 tokens (Sonnet is verbose; cap prevents runaway reasoning). Cost ~$0.01-0.02 per call; fires only on <2/2 lessons.
- **Cache:** session-scoped by `lesson_id + answer_hash` — same answers won't re-trigger analysis within a session.

**Write-back to `~/.claude/gabe-lens-learning.md`:**

1. For each Miss → append row to Miss Log with Project column set to current project name (or `—` if cross-project teach).
2. If `pattern_match` non-null → update matching pattern's observation count; move to `active` if threshold reached (3 observations OR 2 projects).
3. If `new_pattern_candidate` non-null AND no strong `pattern_match` → append to Detected Patterns as `suggested` (observations: 1). Patterns only promote to `active` via Step 9c.5 user confirmation.
4. Store `content_augmentations` in the lesson's session state for the pattern's Active Tailoring block (applied when the user confirms activation in 9c.5).

**Failure modes:**

- LLM call errors → skip silently; emit warning `⚠ Drift analysis unavailable this session — lesson result recorded, pattern analysis skipped.` The score still writes to STATE.md/HISTORY.md as usual.
- `output_type` validation fails (rare with framework enforcement) → same fallback.

**BEHAVIOR.md / profile.md opt-out:** `teach_drift_analyzer: always | only-partial | never` (default: `only-partial`).
- `always` = run even on 2/2 (useful for the first few lessons to establish a baseline)
- `only-partial` = run on <2/2 only (default; where the signal lives)
- `never` = skip entirely; don't track patterns

#### Step 9c.5 — Tailoring review (user-facing prompt)

Decides when to surface a review prompt to the user about active or suggested tailorings. Two triggers:

**Trigger 1 — Cadence (every 3 verified lessons post-activation):**

Maintain a counter in `~/.claude/gabe-lens-learning.md` front-section tracking lessons-since-last-review. When counter reaches 3 AND at least one pattern is `active`:

```
Tailoring review — you've completed 3 lessons since activating P1 "Distinction conflation."

Recent lessons:
  ✓ arch circuit-breaker     — Q2 (2/2) ← no miss on distinction
  ✓ topic T8                 — Q2 (2/2) ← no miss on distinction
  ⚠ arch idempotency-keys    — Q2 (1/2) ← partial miss on distinction

The tailoring appears to be helping. How do you want to proceed?

  [keep]    Continue with current tailoring (emphasis + Q2 constraints)
  [reduce]  Keep emphasis, drop Q2 constraints — test internalization
  [lift]    Lift tailoring entirely; see if the base style lands now
  [adjust]  Change which adaptations apply (opens sub-prompt)
  [skip]    Don't prompt; remind me in 3 more lessons
```

**Trigger 2 — Threshold (on 3rd observation of a suggested pattern):**

Fires immediately after Step 9c.4 writes the 3rd observation of a `suggested` pattern:

```
Pattern detected — P2 "Analogy over-reliance" (observations: 3, confidence: medium)

Signal: when Picture-it is vivid, you sometimes anchor the answer to the
analogy and miss the underlying force. 3 observations across 2 projects.

Try tailoring?

  [y]       Activate pattern P2. Adaptations: add "analogy-limit call-out"
            in Picture-it; add distinction bullet in When-NOT
  [defer]   Keep observing (won't prompt again for this pattern until 5th observation)
  [never]   Abandon this pattern; don't apply it
```

**Write-back based on user choice:**

- `[keep]`, `[reduce]`, `[lift]`, `[adjust]` → update Active Tailoring block; append to Tailoring History
- `[y]` on threshold prompt → add pattern to Active Tailoring; append TAILORING-ON event
- `[defer]`, `[never]` → update pattern status; append history event

**BEHAVIOR.md opt-out:** `teach_tailoring_review: prompt | silent | never` (default: `prompt`).

**Render augmentation (D4 = A + B + D):**

When any pattern is `active` in `~/.claude/gabe-lens-learning.md`, Step 9c render applies these levers BEFORE final output:

- **A — Emphasis:** sections named in the pattern's Active-Tailoring block are rendered with a `⚠ Focus here` marker at the start. Lightweight, no content changes.
- **B — Content augmentation:** inline additions per the pattern's `content_augmentations` cache. Capped at 2 augmentations per section to prevent bloat. Marked with `[tailored]` so the reader can see where augmentation applied.
- **D — Q1/Q2 generation constraints:** the question-generation LLM call (Step 9c) gets an extra system prompt line: `"Avoid conflation-prone phrasings: <list from pattern's content_augmentations>"`. Questions become more discriminating on exactly the weakness the user is working through.

**Active tailoring is visible in the Context footer:**

```
Context: foundational · agent+web · prereqs: none · related: sse-streaming-progress
Tailoring active: P1 (distinction conflation) — emphasis + Q2 constraints
```

This makes the adaptation transparent — the user always knows when the lesson has been tailored.

#### Step 9d — Verify (`arch verify <concept-id>`)

The shortcut for humans who already know a concept deeply. Renders a one-line header followed by the Universal Action Menu — no asymmetric verb set.

```
VERIFY — circuit-breaker (intermediate · distributed-reliability)

  "Stop calling a dead downstream — give it time to recover before the next attempt."

  [explain]  Teach me anyway — full Step 9c lesson
  [next]     Mark verified without a quiz (trust-me mode). Writes `verify-skip`, score —/—.
  [test]     One sanity question. 1/1 → verified (`verify-quick`); 0/1 → pending with suggestion to run `/gabe-teach arch show <id>`.
  [skip]     Do nothing; return to caller.
```

Writes the same STATE.md + HISTORY.md entries as before (see Step 9e) — only the verb labels change. Mapping: `[next]` = legacy `skip-check`; `[test]` = legacy `quick-check`; `[explain]` = legacy `teach`; `[skip]` = legacy `cancel`.

Rationale: a human who wants to verify has already decided they know it. `[next]` means "move on, I've got it." `[test]` means "prove it to yourself first." `skip-check` and `quick-check` were confusing asymmetric labels that required memorization.

#### Step 9e — State + history writes

After any arch-mode event that changes verification status (show → verified, verify → verified/pending, skip):

**STATE.md update** (upsert by `Concept ID`):

- If row exists and new status is `verified`: increment `Reinforcements` by 0 for first verify, by 1 for subsequent verifies in different projects; set `Last Reinforced` to today; keep `Verified Date` as first verify date.
- If row doesn't exist: append new row with `Status`, `Tier`, `Specialization` from the concept file; `Verified Date` = today; `Verified Project` = current project name (or `—` if no `.kdbp/`); `Score` from the quiz; `Reinforcements: 0`; `Last Reinforced` = today.

**HISTORY.md append** — one line per event, grouped by date. Events:

```
### 2026-04-17 — arch mode
- SHOW:     circuit-breaker → verified (2/2)
- VERIFY:   idempotency-keys → verified (quick-check, 1/1)
- VERIFY:   structured-output-enforcement → verified (skip-check, —/—)
- SKIP:     progressive-knowledge-disclosure
```

Deterministic writes — no LLM required.

#### Step 9f — Arch next (progressive pressure)

When invoked, select ONE concept to teach using the three-tier fallthrough rule. First match wins; render the concept's lesson through Step 9c's rendering logic (6-part template + LLM-generated Q1/Q2).

**Tier 1 — Project-driven** (highest priority, runs only when a project is active):

1. Read `.kdbp/KNOWLEDGE.md` Topics table.
2. Collect every `ArchConcepts` value from rows where `Status` is `pending` or `skipped`.
3. Cross-reference against STATE.md: keep only concepts whose STATE.md status is NOT `verified` / `already-known`.
4. If any remain: pick the one that appears in the most pending/skipped rows (tie-breaker: lowest tier first — foundational > intermediate > advanced — so prerequisites get built first).

Rationale: this concept is actively blocking project understanding. Teaching it unblocks real work.

**Tier 2 — Adjacency** (fallback when Tier 1 empty OR no active project):

1. Read STATE.md. Build the verified set (IDs with status `verified` or `already-known`).
2. Glob every concept file, collect those NOT in verified set.
3. Filter to concepts where every ID in `prerequisites` IS in the verified set (all prereqs satisfied).
4. Rank the candidates:
   - Primary sort: specialization where the human has the most `verified` entries (momentum).
   - Secondary sort: tier matching the human's modal verified tier in that specialization (e.g., if the human has verified 4 foundational + 1 intermediate in agent, propose another intermediate).
   - Tiebreak: alphabetical by ID for determinism.
5. Pick the top candidate.

Rationale: the human gets the next concept they're actually ready for, in a spec they're building momentum in.

**Tier 3 — Foundation gap** (fallback when Tier 2 empty):

1. Identify any `intermediate` or `advanced` concept that IS verified.
2. Check its `prerequisites` — if any are NOT verified, surface the gap.
3. Pick the unverified foundational prerequisite with the most downstream dependents.

If found, render with a gap warning at the top of the lesson:

```
⚠ FOUNDATION GAP DETECTED

You've verified [pattern-state-machine] (advanced) but haven't verified
its foundational prerequisite [structured-output-enforcement]. Filling
this gap strengthens the rest of what you already know.
```

Then continue to the concept's normal rendering.

**Fallthrough — nothing to teach:**

If all three tiers return empty (catalog fully verified relative to prerequisites), print:

```
You've verified every concept reachable from your current state.

Options:
  - /gabe-teach arch browse [spec]     Pick a new specialization to explore
  - /gabe-teach arch show <concept-id> Teach a specific concept
  - Wait for the next topic session — new concepts surface as real project
    work tags new areas.

Total verified: [N] concepts across [M] specializations.
```

**Rendering the pick (teach-first — no pick prompt):**

Print ONE header line, then **immediately** render the lesson via Step 9c. No `[teach]/[skip]/[cancel]` prompt — the Universal Action Menu (Step 0.7) at the end of the lesson handles everything.

```
ARCH NEXT — picked by [project-driven|adjacency|foundation-gap] rule
  → retry-with-exponential-backoff (intermediate · distributed-reliability)
     Reason: topic T12 "Why we added tenacity" in ai-app tagged this but not yet taught.
     Prerequisites verified: idempotency-keys ✓
```

Then the Step 9c lesson renders directly underneath. Skip accounting: `[skip]` at the menu counts against a session skip-budget of 3. After 3 skips without a `[next]`, the command exits to `arch dashboard` with the hint: `3 concepts skipped this session — heuristic may be off. Browse the catalog to pick manually: /gabe-teach arch browse [spec].`

**Empty-state collapse:** if STATE.md has zero verified entries AND no ArchConcepts tags in the current project's KNOWLEDGE.md (the degenerate case), Step 9f falls into Tier 2 with alphabetical-by-id-within-foundational ordering. Instead of explaining the degeneracy across multiple paragraphs, render ONE line and proceed:

```
ARCH NEXT — picked by adjacency (seed pick — STATE empty)
  → async-background-processing (foundational · agent)
     Reason: first foundational candidate with no prereqs. Verify a few concepts to unlock ranked picks.
```

Then the Step 9c lesson renders. No alternative-listing, no tier-rule explanation. The point is to start teaching; ranking quality improves naturally once STATE has a few rows.

**Enhanced dashboard (Step 9a refinement):**

The dashboard's "Suggested next" line now uses the same Step 9f logic (Tier 1 → 2 → 3), showing the rule that matched:

```
Suggested next (project-driven):
  → retry-with-exponential-backoff (intermediate · distributed-reliability)
     "Wait longer between each retry so the failing system can recover."
     Unlocks from topic T12 in ai-app.
```

If Tier 1 has multiple candidates, show the top 3 in the suggested-next block so the human sees their options without running `arch next`:

```
Suggested next (project-driven, 3 candidates):
  → retry-with-exponential-backoff         (from topic T12, tier intermediate)
  → idempotency-keys                       (from topic T12, tier foundational)
  → circuit-breaker                        (from topic T15, tier intermediate)
```

**Tier derivation display (Step 9a refinement):**

Dashboard progression bars now include a verified-count breakdown per tier within the spec:

```
agent                    ▓▓▓▓▓▓▓░░░  intermediate   (f:7/8  i:3/6  a:0/4)
                                                      └──────┬──────┘
                                          tiers: foundational, intermediate, advanced
```

Derivation rule (unchanged from Phase 4, now rendered explicitly):
- `foundational` reached: verified ≥60% of foundational concepts
- `intermediate` reached: foundational reached AND verified ≥50% of intermediate concepts
- `advanced` reached: intermediate reached AND verified ≥40% of advanced concepts

Computed live on every dashboard render — no persisted tier field, no drift risk.

---

### Step 10: Retro mode (`retro`) — what went wrong, what was reversed

**Teach mode.** Surfaces the retrospective lessons that are otherwise buried: skipped topics with their reason, decisions that were reversed (DECISIONS.md rows with `superseded` status), and "we built it, then removed it" moments (topics marked skipped with code-removal commits in their lineage).

**Why this matters.** Users said they wanted to learn "what went well, what went wrong, the reasons why we took some architectural decisions." Verified topics cover what went well. Retro mode covers everything else: the false starts, the over-engineering that got walked back, the speculative code that proved unnecessary. These are the highest-signal lessons in any codebase — the team paid for them in commits-and-reverts — but today they're scattered across the KNOWLEDGE.md Sessions log, DECISIONS.md Status column, and commit history.

**Step 10a — Gather retro candidates (deterministic):**

1. **Skipped topics** from `.kdbp/KNOWLEDGE.md` Topics table: rows where `Status` = `skipped`. Pull the Source column (which often contains the reason — e.g., T4's "Lesson was speculative for current single-caller codebase. Decision recorded as D1; trigger logged in PENDING.md. Pipeline-side check removed.").
2. **Superseded decisions** from `.kdbp/DECISIONS.md`: rows where `Status` = `superseded`. **L6 operational filter (D3=A):** skip rows whose `Status` column contains the `operational` tag (format: `superseded,operational` or `operational,superseded`). Operational rollbacks are push-owned and surfaced in `.kdbp/DEPLOYMENTS.md` — retro covers architectural supersessions only. Include the supersede reason (typically a new decision ID that replaced it).
3. **Reversal commits** (optional, heuristic, tightened per D6=B): run `git log --all --oneline -E --grep='^revert!?: ' --grep='^fix: rollback' --since="90 days ago"` and cross-reference against topic commits. Surface commits that removed code introduced by a verified topic. Cap at 5 to avoid noise. Free-text grep (`remove`, `simpler`) was dropped — too many false positives from routine refactors.

**Step 10b — Pick + render (same shape as Step 9f):**

Sort candidates by recency (most recent first). Pick the top one. Render ONE header line then the lesson via a 6-part template variant tuned for retrospectives:

```
RETRO — picked by [skipped-topic|superseded-decision|reversal-commit] rule
  → T4: Why guardrails also run inside the pipeline (skipped 2026-04-18)
     Origin: Plan "Phase 1 Level 2a", Phase 2 · Decision D1 · Files removed: app/agent/pipeline.py

What we built:
  Before: guardrails ran at both the API boundary AND inside run_triage_pipeline.
  After:  guardrails run only at the API boundary; pipeline trusts its caller.

Analogy: Like having a bouncer at the door and another at every table —
worth it only if multiple hallways feed the room. One hallway = one bouncer.

Scenario (the moment we noticed):
  Before: review question surfaced — "why is this check here twice?"
  After:  roadmap audit showed no upcoming phase adds a second caller of
          run_triage_pipeline. Deleted the duplicate. Coverage stayed green;
          latency dropped by the cost of one compiled regex pass.

Primary force: Defense-in-depth is load-bearing across *trust domains*
(firewall + OS + app auth), not within one Python process. Duplicating the
check in the same trust domain creates drift risk — two return shapes to
keep in sync, dead-code rot in the unreachable branch, cognitive load on
every future reader ("which check is authoritative?").

Also:
- Speculative defense-in-depth imports future requirements that may never ship.
- "Remove unless" beats "keep just in case" when the caller graph is auditable.

Revisit trigger: When a second caller of run_triage_pipeline is added
(retry worker, admin replay, cron reprocess, queue consumer), MOVE the
check into the pipeline — don't duplicate again. See PENDING D1-trigger.

Further reading:
  → .kdbp/DECISIONS.md#D1  (the decision record — rationale + alternatives)
  → .kdbp/PENDING.md       (the D1-trigger entry that'll fire re-surface)

Q1: If we'd kept both checks, what specific review question becomes
    uncomfortable to answer every time a new engineer joins?
Q2: The pipeline's internal boundary isn't a trust boundary. What would
    have to change in the architecture for the duplicate check to start
    earning its keep?
```

Then the Universal Action Menu (Step 0.7). `[next]` auto-advances to the next retro candidate. When retro candidates are exhausted: `Retrospective clear. /gabe-teach to continue with project topics.`

**Step 10c — Write-back.** Retro doesn't change topic status (skipped stays skipped); it just teaches the lesson and appends a note to the `Sessions` log:

```
### YYYY-MM-DD — /gabe-teach retro
- Retrospective: T4 (skipped, verified-as-retro 2/2)
- Decisions taught: D1 (superseded)
```

No STATE.md arch write (retro lessons are project-specific, not catalog concepts).

**Step 10d — Empty state:** if no skipped topics, no superseded decisions (after L6 filter), no reversal commits → `Nothing to retro yet. When you skip a topic or supersede a decision, it'll surface here.`

---

### Step 11: Tour mode (`tour`) — how this app works

**Teach mode.** Walks the project well-by-well, explaining file paths + what each file contains + key decisions per well. Answers the newcomer question "how does this app work?" in one continuous flow — the piece that was scattered across wells, `STRUCTURE.md`, `DOCS.md`, and well docs.

**Why this matters.** Users said: "if someone else asks how this application works, we should know how it works, like why we do what we do, the paths for the files, what the files contain, and so on." The existing `brief` mode summarizes; the existing `topics` mode teaches individual changes. Neither walks the tree top-to-bottom. Tour does.

**Step 11a — Scan inputs (deterministic):**

1. `.kdbp/KNOWLEDGE.md` Gravity Wells table — iterate in ID order (G1, G2, … G_N).
2. For each well: read Name, Description, Analogy, Paths, Docs.
3. For each Paths glob: run `git ls-files -- "<glob>"` and collect the file list. Dedupe across globs. Sort by depth then alphabetical.
4. For each file, extract a one-sentence "what it contains" signal (deterministic, no LLM, first match wins):
   - Python: first docstring (`"""…"""` at module top).
   - TypeScript/JavaScript: first `/** … */` jsdoc comment at module top, else first single-line `//` comment.
   - Markdown: first heading line (`# …`).
   - Otherwise: first non-blank non-shebang line (truncate to 80 chars).
   - If nothing extractable: `(no header comment)`.
5. For each well, read the well's Docs file (if present) and pull up to 3 entries from `## Key Decisions` section — just the `### <date> — <title>` lines, not full rationale.

**Step 11b — Render one well per "stop":**

```
TOUR — stop 3 of 6: G3 API Layer

Analogy: Reception desk: takes the package, hands a receipt, processes behind the counter.

Purpose: HTTP surface, multipart handling, background tasks.

Path: app/api/**

Files ([N] under this path):
  app/api/__init__.py           (no header comment)
  app/api/main.py               FastAPI app — multipart incident endpoint + background triage dispatch.
  app/api/dependencies.py       Dependency-injection wiring for DB session + settings.
  ... and 2 more files (use /gabe-teach wells → [opendoc 3] for the full list)

Key decisions for this well (from docs/wells/3-api-layer.md):
  2026-04-18 — Guardrails enforced at the API boundary only, not inside pipeline.
  2026-04-17 — 202 Accepted + BackgroundTask for async triage (avoid 30s HTTP hold).

Why it's here (from the well's Purpose section): [first paragraph of `## Purpose` from the Docs file, or if empty: "(Purpose not yet authored — run /gabe-teach to populate)"]
```

Then the Universal Action Menu:
- `[explain]` → re-render this stop with a different angle (different one-liner extraction).
- `[next]` → advance to the next well.
- `[test]` → ask two Socratic questions synthesized from this well's Key Decisions + file list. Example: "Which file in G3 owns the policy decision about when to return 400 vs 202?"
- `[skip]` → skip this well, advance to the next.

**Step 11c — Tour bounds:**

- File list capped at 5 rows per well. `… and N more` if more. User runs `wells → [opendoc N]` for the complete list.
- Wells with empty Paths are skipped silently (no anchor).
- Wells with empty Docs render the decision section as `(no well doc — run /gabe-teach wells → [docs N] to assign one)`.
- On reaching the last well: `Tour complete — walked [K] wells. You now have the map. /gabe-teach for the next lesson.`

**Step 11d — Persistence:**

Tour is read-only. Appends one line to the Sessions log on completion:

```
### YYYY-MM-DD — /gabe-teach tour
- Walked: G1, G2, G3, G4, G5, G6 (6/6)
- Quizzes taken: 2 (G1 pass, G3 pass)
```

**Step 11e — No active plan needed.** Tour runs on the project's static structure (wells + paths + decisions). A newcomer to the repo runs `/gabe-teach tour` as their first command and gets oriented.

---

### Step 12: Learning mode (`learning`) — pattern + tailoring admin

Admin surface for `~/.claude/gabe-lens-learning.md`. Read-mostly; write paths go through explicit subcommand syntax so users don't accidentally clobber accumulated pattern data.

**Step 12a — Bare `/gabe-teach learning`:**

Lazy-bootstrap the learning file if missing (copy `~/.claude/templates/gabe/gabe-lens-learning.md` to `~/.claude/gabe-lens-learning.md`). Then render:

```
GABE LENS LEARNING — cross-project teaching adaptation

Miss log:       [N] entries across [M] projects, [K] lessons
Last lesson:    2026-04-20 — ai-app — arch:async-background-processing (1/2)

Detected patterns:
  P1  Distinction conflation           active       3 obs · 1 project   since 2026-04-21
  P2  Analogy over-reliance (sugg.)    suggested    2 obs · 1 project   pending activation
  (No abandoned or resolved patterns.)

Active tailoring:
  P1 — emphasis + Q2 constraints  (next review: after 2 more verified lessons)

Next review: 2 more verified lessons, OR next suggested pattern hits 3 observations.

Subcommands:
  /gabe-teach learning pattern P1   Inspect a specific pattern (observations, adaptations, history)
  /gabe-teach learning review       Force the tailoring-review prompt now
  /gabe-teach learning reset        Clear all active tailoring (patterns + miss log retained for history)
  /gabe-teach learning wipe         Delete the learning file entirely (irreversible; prompts for confirmation)
```

**Step 12b — `/gabe-teach learning pattern <id>`:**

Renders the pattern's observations table, current adaptations, tailoring history, and a suggested action based on recent lesson performance:

```
P1 — Distinction conflation (active since 2026-04-21, confidence: medium)

Signal: User scores 1/2 on questions requiring distinction between related-but-
distinct concepts. Q1 lands; Q2 (inversion) catches.

Observations:
  2026-04-17  ai-app   T1 Q2                       dict vs list
  2026-04-20  ai-app   arch async-background-processing Q2  persistence vs delivery
  2026-04-24  ai-app   arch idempotency-keys Q2     key scope vs TTL

Adaptations currently applied:
  • Emphasis (A) — bold weak sections
  • Q2 generation constraints (D) — force distinction between flagged concepts
  • Content augmentation (B) — deferred (user said "skip for now")

Tailoring history:
  2026-04-21  TAILORING-ON   user chose A + D
  2026-05-02  (next-review)

Suggested action (based on recent lessons):
  Recent 3 lessons: 2/3 Q2 clean. Pattern may be resolving.
  → Consider `/gabe-teach learning pattern P1 reduce` to drop Q2 constraints
    and test internalization.
```

**Step 12c — `/gabe-teach learning review`:** triggers Step 9c.5's review prompt immediately (same UI, without waiting for the cadence counter).

**Step 12d — `/gabe-teach learning reset`:** prompts for confirmation, then:
1. Appends a `TAILORING-RESET` event to Tailoring History with timestamp + reason (prompted).
2. Moves all Active Tailoring entries to abandoned status in Detected Patterns.
3. Clears the Active Tailoring block.
4. Miss Log and Detected Patterns are preserved — this is a "stop tailoring", not a "forget everything".

**Step 12e — `/gabe-teach learning wipe`:** destructive. Two-prompt confirmation (first `[y/n]`, then type `wipe learning` to confirm). Deletes `~/.claude/gabe-lens-learning.md` entirely. Use when a fresh baseline is needed (e.g., major cognitive-suit change).

**Step 12f — Scaffolding:** if `~/.claude/gabe-lens-learning.md` doesn't exist when Step 9c.4 first fires, create it from template silently (no prompt — same pattern as gabe-arch STATE.md / HISTORY.md auto-create).

---

## Staleness handling (unchanged)

When reading KNOWLEDGE.md in `topics` or `status` modes, also compute staleness:
- Topics verified >90 days ago → mark `stale`, re-surface in next `topics` menu
- If >3 stale topics exist → show warning at top of menu: `⚠ [N] topics verified >90 days ago. Knowledge can drift.`

## Already-known sanity check (unchanged)

When the human claims `already-known`, DO NOT mark immediately. Ask ONE targeted question:
- If correct → `already-known` with note `sanity-checked`
- If wrong → `pending`, explain correctly, note `claimed known but missed X`

## Interaction with other gabe commands

- Called after `/gabe-commit` if N new topics detected (suggestion, not blocking)
- Called after `/gabe-push` if pending topics >= 2 (suggestion, not blocking)
- `/gabe-teach status` is zero-cost — run anytime
- Does NOT run during `/gabe-plan` — planning is forward-looking, teaching is retrospective

$ARGUMENTS
