# Gabe Init — full spec (re-homed)

> Re-homed verbatim from `commands/gabe-init.md` (B2 skills-only migration, 2026-07-09).
> This file is the binding spec; the SKILL.md core is a summary. E1–E7 contract:
> see `../../gabe-docs/references/execution-contract.md`.

One-command project setup. Wraps three operations into a single flow.

## Procedure

### Step 1: Create .kdbp/ directory

Run the equivalent of `/gabe-align init [project-name]`:

1. If `.kdbp/` already exists, show status and ask: "Reset, update, or skip init?"
   - **reset** — wipe `.kdbp/` and start fresh (destructive, loses LEDGER history and any active plan)
   - **update** — keep existing files, add missing KDBP files/directories from the current template set, verify and install missing hooks. Non-destructive. No existing files modified.
   - **skip** — do nothing (exit init)

   **Mode routing (execute EXACTLY this sequence — step bodies below appear out of order):**
   | Mode | Sequence |
   |------|----------|
   | reset | 1 (full) → 1.7 → 1.8 → 2 → 3 → 4 |
   | update | 1.5 → 1.6 → 1.7 → 1.8 → 2 → Update Report (SKIP 3–4) |
   | skip | exit — run nothing |
   | fresh project (no .kdbp/) | same as reset |

2. If no project name in $ARGUMENTS, ask: "Project name?"
3. Ask: "What does this project do?" (one sentence for BEHAVIOR.md `domain`)
4. Ask: "Maturity level?" → `mvp` (default) | `enterprise` | `scale`
4.5. Ask: "Project type?" → `code` (default) | `mockup` | `hybrid`
   - `code` — standard software project. `/gabe-execute` owns Exec. No mockup-specific artifacts.
   - `mockup` — design / UX project. `/gabe-mockup` owns Exec. Creates `.kdbp/ENTITIES.md` + enables `/gabe-plan --preset=mockup-project`.
   - `hybrid` — both. PLAN phases dispatch per-type tags (`/gabe-mockup` for design-system/ui-kit/mockup-* phases, `/gabe-execute` otherwise).
   - If `mockup` or `hybrid`: prompt `Install ui-ux-pro-max catalog (67 styles / 162 palettes / 74 font pairings)? [Y/n]`. Default Y. If yes, run in background:
     ```bash
     npx --yes uipro-cli init --ai claude 2>/dev/null || echo "⚠ uipro install skipped (npm unavailable or install failed — skill still works without it)"
     ```
   - Persist to BEHAVIOR.md frontmatter as `project_type: <answer>`.
   - If `mockup` or `hybrid`: create `.kdbp/ENTITIES.md` from `~/.claude/templates/gabe/ENTITIES.md` (copied during install.sh).
5. Ask: "Tech stack?" (comma-separated, e.g., "python, fastapi, react")
6. Create `.kdbp/` with these files **and `CLAUDE.md` at the project root** (see Step 1.7 for CLAUDE.md generation):

```
.kdbp/
├── BEHAVIOR.md      # From answers above
├── VALUES.md        # Project values (empty template — user adds during first session)
├── DECISIONS.md     # Append-only architecture decision table
├── RULES.md         # Scar-tissue constraints (R-rules) maintained by /gabe-debt
├── PENDING.md       # Deferred items (empty)
├── LEDGER.md        # Checkpoint history (empty)
├── MAINTENANCE.md   # Quarterly human checklist
├── DOCS.md          # Doc drift mappings (from project type, used by CHECK 7)
├── PLAN.md          # Active plan (empty template — populated by /gabe-plan)
├── KNOWLEDGE.md     # Human knowledge map (topics tracked by /gabe-teach)
├── STRUCTURE.md     # Per-project folder conventions (checked by gabe-commit CHECK 9)
└── archive/         # Archived plans (completed_, defer_, cancelled_)
```

**BEHAVIOR.md** — generate from answers:
```yaml
---
name: [project-name]
domain: [from answer]
maturity: [mvp|enterprise|scale]
tech: [from answer]
created: [today's date]
---

# Project Behavior Rules

## B1 — Inventory before proposing (architecture / exploratory questions)

**Trigger phrases:** "can we work on", "should we", "I'm wondering", "explore the possibility", "what do you think about", "how can we approach", "is it possible to". Treat as diagnose-prompts, not build-prompts.

**Mandatory inventory before any proposal:**
1. Read existing project state: `.kdbp/PLAN.md`, `.kdbp/SCOPE.md`, `.kdbp/STRUCTURE.md`, `.kdbp/ROADMAP.md`, `.kdbp/AUDIT.md` (if present)
2. Read suite command(s) being extended: `~/.claude/commands/gabe-*.md`
3. Read relevant catalog: `~/.claude/templates/gabe/tier-sections/*.md`
4. If proposing external dep: clone repo, verify license + actual surface (not just README)
5. List what already exists for this question before proposing what's missing

**Proactive suggestions on detection:**
- Suggest user run `/plan` (your `feedback_plan_overrides_auto` rule then enforces wait-for-confirm)
- Offer `/gabe-roast [perspective]` or `/gabe-assess` for adversarial first-pass before plan-text
- If auto-mode active, override it for exploratory Qs — surface inventory + recommendation, wait for user direction

**Self-check before delivery:** "Did I read existing state? Did the user already do this analysis? Am I proposing what already exists under a new name? Did I challenge my first framing?"

**Caveman/terse modes compress output prose only. Reasoning depth is invariant.**

**Why this rule exists:** Past incident (2026-04-24, gastify mockup workflow Q) where shallow first-pass restated work the user had already done in `.kdbp/PLAN.md` + `AUDIT.md` + `STRESS-TEST-SPEC.md`. User flagged as workflow-sustainability concern.
```

**VALUES.md** — start with:
```markdown
# Project Values

<!-- Add 3-7 project-specific values. Format: -->
<!-- - **V1 — [Name]:** [One sentence] `[session|story|epic]` -->
```

**DECISIONS.md** — use template from `~/.claude/templates/gabe/DECISIONS.md`

**RULES.md** — use template from `~/.claude/templates/gabe/RULES.md`. Scaffolds empty with R-rule block template + phase cross-ref matrix. `/gabe-debt` populates it. `/gabe-review` reads it for severity escalation when a file/line violates an R-rule.

**PENDING.md** — start with:
```markdown
# Deferred Items

| # | Date | Source | Finding | File | Scale | Priority | Impact | Times Deferred | Status |
|---|------|--------|---------|------|-------|----------|--------|----------------|--------|
```

**LEDGER.md** — start empty:
```markdown
# Session Ledger
```

**MAINTENANCE.md** — use template from `~/.claude/templates/gabe/MAINTENANCE.md`

**PLAN.md** — use template from `~/.claude/templates/gabe/PLAN.md`

**KNOWLEDGE.md** — use template from `~/.claude/templates/gabe/KNOWLEDGE.md`

**STRUCTURE.md** — use template from `~/.claude/templates/gabe/STRUCTURE.md`:
- The base template has MVP patterns + disallowed patterns active
- Based on the project type selected in Step 3, uncomment the matching stack-specific block (`Agent App`, `Web App`, `CLI`, `Library`)
- Leave other blocks commented out as reference

**archive/** — create empty directory: `mkdir -p .kdbp/archive`

**DOCS.md** — use template from `~/.claude/templates/gabe/DOCS.md`:
- Select the section matching the project type chosen in Step 3
- Agent app → use the Agent App section
- Web app → use the Web App section
- CLI → use the CLI section
- Library → use the Library section
- Remove commented-out sections for other project types

### Step 1.7: Create or refresh `CLAUDE.md` (project root)

`CLAUDE.md` at the project root is how Claude Code discovers the KDBP contract on every session. Unlike the files under `.kdbp/`, this one lives at the repo root so the built-in session-start loader reads it without extra configuration.

**Template source:** `~/.claude/templates/gabe/CLAUDE.md`

**Placeholders to substitute** (all derived from Step 1 answers — no extra prompts):

| Placeholder | Value |
|-------------|-------|
| `{PROJECT_NAME}` | Step 1 answer |
| `{DOMAIN}` | Step 1.3 answer (one sentence) |
| `{MATURITY}` | `mvp` / `enterprise` / `scale` |
| `{TECH}` | Step 1.5 comma-separated list |

**Marker:** the template includes `<!-- KDBP-MARKER: gabe-init v1 -->` on line 5. This marker is how `update` mode detects a Gabe-managed CLAUDE.md versus a user-authored one.

**Idempotency rules** (apply on every run, `reset` and `update` alike):

| Existing state at root | Action |
|------------------------|--------|
| No `CLAUDE.md` | Create from template with substitutions. Report: `✅ CLAUDE.md created`. |
| `CLAUDE.md` exists **with** `KDBP-MARKER: gabe-init v1` | Already ours. `reset` mode: regenerate above the trailing `<!-- Add project-specific instructions… -->` comment, preserving whatever the user appended below it. `update` mode: leave untouched (already compliant). |
| `CLAUDE.md` exists **without** the marker | Stop and ask: `Existing CLAUDE.md has no KDBP marker. Options: (m)erge — append KDBP section below existing content, (b)ackup-and-replace — move current to CLAUDE.pre-kdbp.md and install template, (s)kip — leave as-is. [m/b/s]`. Default `m`. |
| User picks `m` (merge) | Append `\n\n---\n\n` then the full rendered template. Preserve pre-existing content above verbatim. |
| User picks `b` (backup-and-replace) | `mv CLAUDE.md CLAUDE.pre-kdbp.md`, install rendered template. |
| User picks `s` (skip) | Record `⚠️ CLAUDE.md not managed — KDBP discovery may be unreliable` in Step 4 readiness report. |

**Preservation contract for `reset` on a marker-present file:** read the existing CLAUDE.md, find the line `<!-- Add project-specific instructions for Claude Code below. -->`. Everything after that line is user content — preserve it verbatim. Rewrite only the content above that line from the template + substitutions.

### Step 1.8: Seed `.gitignore` entries (gabe-review archive)

The project's `.gitignore` gets the line `.kdbp/reviews-archive/` appended so resolved gabe-review documents archive locally without bloating git history. (`.kdbp/archive/` — used by PLAN/SCOPE archives — stays tracked as before.)

**Idempotency:** grep-before-append. If `.gitignore` doesn't exist, create it with just that single line. If it exists and already contains the entry (exact-match line), do nothing. Otherwise, append with a leading newline if the file doesn't end in one.

| Existing `.gitignore` state | Action |
|---|---|
| Missing | Create with `.kdbp/reviews-archive/` |
| Present, entry missing | Append `.kdbp/reviews-archive/` |
| Present, entry present | No-op |

Display a single line at the end: `✅ .gitignore: reviews-archive entry [added | already present]`. `reset` mode re-runs this check (idempotent). `update` mode includes it as part of the readiness scan.

### Step 1.5: Update Mode (only when user picked `update`)

Non-destructive top-up of an existing `.kdbp/` directory. Never overwrites, never deletes.

1. **Scan what's missing.** Compare the existing `.kdbp/` contents against the current template set:
   - Expected files: `BEHAVIOR.md`, `VALUES.md`, `DECISIONS.md`, `RULES.md`, `PENDING.md`, `LEDGER.md`, `MAINTENANCE.md`, `DOCS.md`, `PLAN.md`, `KNOWLEDGE.md`, `STRUCTURE.md`
   - Expected directory: `archive/`
   - Expected at **project root** (not `.kdbp/`): `CLAUDE.md` — scanned separately; rules in Step 1.7
   - Note: project-specific files like `PUSH.md` or historical `PLAN-PHASE-N.md` are NOT in the expected set — leave them untouched.

2. **Report findings before acting:**
   ```
   UPDATE MODE — [project name]

   Present (9):    BEHAVIOR, VALUES, DECISIONS, PENDING, LEDGER, MAINTENANCE, DOCS, PUSH, PLAN-PHASE-1
   Missing (3):    PLAN.md, KNOWLEDGE.md, archive/
   Root-level:     CLAUDE.md [missing | managed | unmanaged]
   Unrecognized:   PLAN-PHASE-1.md (not in template set — will keep as-is)

   Proceed with top-up? (y/n)
   ```

   Root-level status meanings:
   - **missing** — no `CLAUDE.md` at project root; will be created per Step 1.7.
   - **managed** — `CLAUDE.md` present with `KDBP-MARKER: gabe-init v1`; left untouched.
   - **unmanaged** — `CLAUDE.md` present without the marker; Step 1.7 will prompt (merge / backup-and-replace / skip).

3. **If confirmed, create only missing items:**
   - For each missing template file: copy from `~/.claude/templates/gabe/[FILE]`
   - For `archive/`: run `mkdir -p .kdbp/archive`
   - For `DOCS.md` specifically: if missing, do NOT auto-select a project type — ask: "Project type? (agent-app | web-app | cli | library)" and use that section
   - For root `CLAUDE.md`: run Step 1.7 — if the scan flagged `missing` or `unmanaged`, that step handles creation / merge prompt; if `managed`, Step 1.7 is a no-op
   - Skip any file that already exists (never overwrite)

4. **Do NOT touch:**
   - `BEHAVIOR.md` — already has maturity, domain, tech (preserves user customization)
   - `VALUES.md` — user-authored content
   - Any file with existing content
   - Files outside the expected template set

5. **After file top-up, run Step 1.6 (schema migration) before Step 2.**

6. **Per the mode routing table** (Step 1, item 1), show a condensed Update Report instead of Steps 3-4:
   ```
   UPDATE COMPLETE
     Files added:      [list]
     Directories:      [list]
     Schema migrations:[list or "none"]
     CLAUDE.md:        [created | merged | backed-up-and-replaced | preserved | skipped]
     Hooks installed:  [N] / [total]
     Preserved:        [count of files left untouched]
   ```

### Step 1.6: Schema migration (non-destructive, only when `update` picked)

Template files can evolve with new columns. Existing `.kdbp/` files predating those changes need column-level top-up (not file replacement — that would destroy user data).

**Current migrations:**

| Target | Old shape | New shape | Detection |
|--------|-----------|-----------|-----------|
| `.kdbp/KNOWLEDGE.md` Gravity Wells table | 4-6 columns (any subset of new cols missing) | 7 columns: `# \| Name \| Description \| Analogy \| Paths \| Docs \| Topics` | Header row missing any of `Analogy`, `Paths`, or `Docs` between `Description` and `Topics` |
| `.kdbp/KNOWLEDGE.md` Topics table | 10 columns (no ArchConcepts) | 11 columns: `# \| Well \| Class \| Topic \| Status \| Tags \| ArchConcepts \| Last Touched \| Verified Date \| Score \| Source` | Header row missing `ArchConcepts` between `Tags` and `Last Touched` |
| `~/.claude/gabe-arch/STATE.md` | Missing | Present | File doesn't exist at `~/.claude/gabe-arch/STATE.md` |
| `~/.claude/gabe-arch/HISTORY.md` | Missing | Present | File doesn't exist at `~/.claude/gabe-arch/HISTORY.md` |

**Procedure for KNOWLEDGE.md wells migration:**

1. **Backup first:** copy file to `.kdbp/archive/KNOWLEDGE.md.pre-migrate-YYYYMMDD-HHMM.md`
2. **Preview the change:**
   ```
   SCHEMA MIGRATION — .kdbp/KNOWLEDGE.md
     Wells table: [current] cols → 7 cols (adds [list of missing: Analogy, Paths, Docs])
     Rows affected: [N]
     Backup: .kdbp/archive/KNOWLEDGE.md.pre-migrate-20260417-1805.md
   
     Proceed? (y/n)
   ```
3. **On confirm:** rewrite the wells table header AND each row with empty cells inserted for whichever columns are missing (Analogy, Paths, Docs). Preserve the `#`, `Name`, `Description`, `Topics` cells exactly.
4. **On skip/decline:** leave file as-is; warn that `/gabe-teach brief` may show "paths not set" / "no doc" and will backfill Analogy on first run.
5. **Follow-up hint** after successful migration: `ℹ Run /gabe-teach brief to backfill Analogy (via gabe-lens) and Paths (heuristic) for existing wells. Then /gabe-teach wells → [docs N] to assign doc paths, or /gabe-teach init-wells to rerun the full wizard including doc-stub scaffolding.`

**Procedure for KNOWLEDGE.md Topics table migration (ArchConcepts):**

1. Backup (same archive path as the wells migration — single backup per `update` run is fine).
2. **Preview:**
   ```
   SCHEMA MIGRATION — .kdbp/KNOWLEDGE.md
     Topics table: 10 cols → 11 cols (adds ArchConcepts between Tags and Last Touched)
     Topic rows affected: [N]
     Proceed? (y/n)
   ```
3. **On confirm:** rewrite the Topics header AND each existing topic row with an empty `ArchConcepts` cell inserted between `Tags` and `Last Touched`. Preserve all other cells exactly.
4. **On skip/decline:** leave file as-is; `/gabe-teach topics` will still function, just without architecture tagging for this project until the column is added.
5. Follow-up hint: `ℹ Existing topics were not retroactively tagged with arch concepts — only new topics surfaced after migration get tags. Run /gabe-teach topics to start building the architecture knowledge graph.`

**Procedure for ~/.claude/gabe-arch/ global state:**

1. If `~/.claude/gabe-arch/` does not exist, create it: `mkdir -p ~/.claude/gabe-arch`
2. If `~/.claude/gabe-arch/STATE.md` is missing, copy the template: `cp ~/.claude/templates/gabe/gabe-arch-STATE.md ~/.claude/gabe-arch/STATE.md`
3. If `~/.claude/gabe-arch/HISTORY.md` is missing, copy the template: `cp ~/.claude/templates/gabe/gabe-arch-HISTORY.md ~/.claude/gabe-arch/HISTORY.md`
4. These files are user-global (all projects share them), created lazily — never overwritten if already present.
5. During `reset` mode, do NOT touch `~/.claude/gabe-arch/` — the user's cross-project learning state is never lost by a per-project reset.

**No LLM calls during migration** — purely structural rewrite. Backfill happens later, on first brief run.

### Step 2: Check hooks

Check `~/.claude/settings.json` for these hooks:
- SessionStart hook (contains `KDBP Active`)
- SessionStart plan awareness (contains `ACTIVE PLAN` or `gabe-plan`)
- SessionStart knowledge awareness (contains `KNOWLEDGE:` or `gabe-teach`)
- PreToolUse checkpoint hook (contains `KDBP CHECKPOINT`)
- PostToolUse ledger writer (contains `LEDGER.md`)
- PostToolUse structure warning (contains `STRUCTURE:` — new-file placement)
- Stop session-end reminder (contains `SESSION-END REMINDER`)

For each missing hook:
- Read the hook object VERBATIM from `~/.claude/templates/gabe/hooks.json` (one object per hook, keyed by the marker string above — e.g. `"KDBP CHECKPOINT"`).
- If that file is missing or a key is absent: STOP hook installation and print `⛔ hook template missing at ~/.claude/templates/gabe/hooks.json — reinstall the suite. Not composing hook JSON from memory.` Continue init WITHOUT touching settings.json (degraded mode: report `Hooks installed: skipped (template missing)` in Step 4).
- Otherwise show the exact JSON, ask `Install? [Y/n]`, and on yes append it to the appropriate array (never overwrite existing entries).

If all hooks present: "All 7 KDBP hooks installed."

### Step 3: Project type

Ask: "Project type?"

For ALL project types, create doc stubs if they don't already exist. **Every stub gets a standards-reference marker as the first non-heading line**, pointing to the `gabe-docs` skill so downstream edits (by humans or by `/gabe-teach` auto-append) follow the house style:

```markdown
<!-- Standards: see ~/.claude/skills/gabe-docs/SKILL.md (CommonMark + Mermaid + analogy-first) -->
```

- **Agent app**:
  - `docs/architecture.md` with headings: `# Architecture`, `## Data Model`, `## API Contracts`, `## API Endpoints`, `## Integrations`
  - `docs/AGENTS_USE.md` with headings: `# Agent Documentation`, `## Agent Design`, `## Tools`, `## Prompts`, `## Safety`, `## Context Engineering`
  - `docs/SCALING.md` with headings: `# Scaling`, `## Observability`
  - `docs/architecture-patterns.md` — copy from `~/.claude/templates/gabe/architecture-patterns.md`. This is the project's "patterns we use and why" ledger; `/gabe-teach arch` auto-appends to it on concept verify (Step 9c.2).
  - Add U4-U8 to project VALUES.md + show agent blueprint checklist (see below)

- **Web app**:
  - `docs/architecture.md` with headings: `# Architecture`, `## Data Model`, `## API Contracts`, `## API Endpoints`
  - `docs/architecture-patterns.md` — copy from `~/.claude/templates/gabe/architecture-patterns.md`. See "Agent app" above for purpose.

- **CLI**:
  - Ensure README.md has sections: `## Usage`, `## Installation`, `## Commands`

- **Library**:
  - `docs/api.md` with heading: `# API Reference`
  - Ensure README.md has sections: `## Installation`, `## Skills`, `## Commands`

For each stub, place the standards marker as an HTML comment on the second line (directly below the `# Heading` line). Skip the marker for README.md since those already exist and may have upstream conventions.

If **agent app** selected, also:
1. Add to `.kdbp/VALUES.md`:
```markdown
- **V1 — Enforce Output Structure:** Use PydanticAI output_type or equivalent. Never prompt-only. `story`
- **V2 — Stream Progress:** Any AI processing >5s must show real-time progress via SSE. `story`
- **V3 — Route by Cost:** Cheap model for classification, premium for reasoning. `story`
- **V4 — Measure Every Run:** Track cost, latency, token usage per pipeline run. `story`
```

2. Show the agent blueprint checklist:
```
Agent Application Checklist:
  □ 1. INTAKE      — Validate input, assign ID, return 202 Accepted
  □ 2. GUARDRAILS  — Regex patterns for prompt injection, boundary markers
  □ 3. CLASSIFY    — Cheap model (Gemini Flash) for severity/category
  □ 4. AGENT       — Premium model (Claude Sonnet) with tools + output_type
  □ 5. OUTPUT      — Schema-enforced response, fallback chain
  □ 6. DISPATCH    — Real integration (Linear/Slack/email)
  □ 7. STREAM      — SSE progress events
  □ 8. STATE       — PostgreSQL + Redis
  □ 9. OBSERVE     — Langfuse traces + Prometheus metrics

Each stage maps to a folder in STRUCTURE.md (api/guardrails/, api/agents/,
api/services/, api/observability/). Stages 1-5 are MVP; 6-9 are Enterprise.
```

### Step 4: Show readiness report

```
✅ .kdbp/ initialized (10 files + archive/)
✅ CLAUDE.md: [created | merged | preserved | backed-up-and-replaced | ⚠ skipped]
✅ Hooks installed (7/7)
✅ Project type: [type]
✅ Maturity: [mvp|enterprise|scale]
✅ DOCS.md: [N] mappings loaded for [project-type]
✅ Doc stubs: [list of created doc files]

Next steps:
  1. Add project-specific values to .kdbp/VALUES.md
  2. Run /gabe-plan to create your first plan
  3. Start building — hooks will checkpoint automatically at commit
  4. Before your first /gabe-teach session, run /gabe-teach init-wells to define
     the architectural sections (gravity wells) topics will anchor to. The teach
     command also prompts for this automatically the first time it runs.
  5. After commits/pushes, run /gabe-teach to stay architect-level current with changes
  6. Run /gabe-health anytime for codebase health check
  7. Customize .kdbp/DOCS.md if your project structure differs from the standard
```

$ARGUMENTS
