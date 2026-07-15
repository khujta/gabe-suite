# Gabe Plan — full spec

> This file is the binding spec; the SKILL.md core is a summary. E1–E7 contract:
> see `../../gabe-docs/references/execution-contract.md`.

KDBP-aware planner. Same planning logic as `/plan`, but persists to `.kdbp/PLAN.md` with lifecycle management + per-phase tier decision (MVP / Enterprise / Scale) with trade-off matrix. For complex plans, it also creates a self-contained HTML review artifact as the human-facing entrypoint while keeping KDBP Markdown canonical.

> **Rendering note.** Output templates in this spec wrapped in bare triple-backtick fences are spec-meta delimiters — render their contents as plain markdown at runtime. Tagged fences (```yaml, ```json, ```bash) stay fenced. See `gabe-docs/SKILL.md` § "Runtime output rendering convention".

## Gabe-Lens Output Rule

`**Gabe-Lens block**` is an output-only command-time explanation. It is never written to `.kdbp/PLAN.md`, `.kdbp/REVIEW.md`, `.kdbp/LEDGER.md`, `.kdbp/PENDING.md`, commits, or docs unless another command already owns that write. These blocks help the user understand the current command result; the command-time briefs are the surviving explanation surface (`/gabe-teach` is archived — `skills/_archive/`).

**Flags:**

| Flag | Meaning |
|------|---------|
| `--full-catalog` | Skip Layer 2 LLM dimension filter. Render ALL dimensions of matched sections. Default: filtered. |
| `--preset=mockup-project` | Emit the canonical 13-phase mockup template (tokens → atoms → molecules → flows+INDEX → screens by section → handoff). Writes `<!-- project_type: mockup -->` to PLAN.md frontmatter. Invoked by `/gabe-mockup` when no active plan exists. |
| `--platforms=<list>` | Comma-separated platforms (`web,mobile-web,native-mobile`). Used by `--preset=mockup-project`. Default: `web,mobile-web`. |
| `--themes=<N>` | Number of theme candidates for M1 stress matrix. Used by `--preset=mockup-project`. Default: 3. |
| `--html-artifact` | Force creation or refresh of the HTML review artifact for this plan. |
| `--no-html-artifact` | Disable HTML artifact creation for this plan, even when complexity heuristics match. |
| `--html-path=<path>` | Write the HTML artifact to an explicit project-local path. Default: `docs/gabe/plans/YYYY-MM-DD-<slug>/index.html`. |

## Procedure

### Step 0: Subcommand dispatch

Parse `$ARGUMENTS` first token:

| Token | Route |
|-------|-------|
| `check` | Step CHK — structural compliance check + retrofit offer against current spec |
| `update` | Step UPD — modify an active plan in-place (existing behavior, Step 6 path) |
| `complete` / `defer` / `cancel` / `replace` | Step 1 case branches (existing behavior) |
| anything else (treated as goal) | Step 0 → continue to normal flow |

Only `check` is a new subcommand. All others fall through to existing behavior.

### Step 0: Validate KDBP

1. Check `.kdbp/` exists. If not: "No KDBP found. Run `/gabe-init` first or use `/plan` for a stateless plan." — stop.
2. If `.kdbp/archive/` doesn't exist, create it.
3. If `.kdbp/PLAN.md` doesn't exist, create it from template.

### Step 0.5: Preset dispatch (before free-form planning)

Parse flags. Record these values for later steps:

- `html_mode`: `force` when `--html-artifact`, `disabled` when `--no-html-artifact`, otherwise `auto`.
- `html_path`: value from `--html-path=<path>`, otherwise blank until Step 3.75 computes the default.
- Reject any `--html-path` under `docs/mockups/` with:
  `⛔ Gabe Plan HTML artifacts must not be written under docs/mockups/**/*.html. Use docs/gabe/plans/... or a project-specific docs path.`

If `--preset=mockup-project` present:

1. Skip Step 3 free-form planning flow.
2. Emit the canonical 13-phase mockup template (see Step 3.PRESET below). Parameters:
   - `--platforms=<list>` (default: `web,mobile-web`) drives platform column/note in screen-phase scope.
   - `--themes=<N>` (default: 3) drives M1 candidate count.
   - `--full-catalog` still applies to tier-matrix rendering.
3. Proceed to Step 3.5 (tier decision per phase) as normal — each preset phase still picks a tier.
4. Write PLAN.md frontmatter with `<!-- project_type: mockup -->` after `<!-- status: active -->`.

If no preset flag → continue Step 1 as before. When non-preset plan is written, add `<!-- project_type: code -->` to frontmatter (explicit default).

### Step 3.PRESET: Mockup-project 13-phase template

Emitted by `--preset=mockup-project`. Phases + canonical types + scope hints:

| # | Phase | Types | Complexity | Scope hint |
|---|-------|-------|------------|------------|
| 1 | Design language + tokens | `design-system` | high | Theme matrix + stress-test render across `--platforms` + token lock → `tokens.css` |
| 2 | Atomic components | `design-system, ui-kit` | low | Button / input / pill / badge / avatar / chip / skeleton / progress / spinner |
| 3 | Molecular components | `design-system, ui-kit` | med | Cards / modals / toast / banner / nav / FAB / filters / sheets / drawers / forms / state-tabs |
| 4 | Flow map + INDEX + CRUD×entity | `mockup-flows, mockup-index` | med | Enumerate flows, seed `docs/mockups/INDEX.md` (4 tables), populate CRUD from the entity list in `SCOPE.md` (or the project's data model) |
| 5 | Auth + onboarding + consent | `user-facing, auth` | med | Login / register / forgot / verify / welcome / jurisdiction consent / PWA install / push |
| 6 | Core capture/primary loop | `user-facing` | high | Dashboard + primary interaction + 5-state variants (idle / processing / reviewing / saving / error) |
| 7 | Batch / bulk flows | `user-facing` | high | Batch capture + review + reconciliation |
| 8 | History + items + insights | `user-facing, data-view` | med | List views + aggregations + analytics drill-downs |
| 9 | Trends + reports | `user-facing, analytics, charts` | high | Chart types + drill-down + PDF export |
| 10 | Shared / multi-tenant surfaces | `user-facing, multi-tenant` | high | Group / workspace / team switcher + admin + invite flows |
| 11 | Settings + profile | `user-facing, settings` | med | Subviews (theme / lang / currency / data / account / subscription) |
| 12 | Alerts + errors + offline | `user-facing, edge-cases` | med | Alerts list + toasts + scan errors + offline banner + 404 + push examples |
| 13 | Handoff + index + audit | `mockup-docs, mockup-validation` | low | `HANDOFF.json` + `SCREEN-SPECS.md` + INDEX.md §6 Coverage gaps + a11y AA pass |

Source-of-truth: `templates/gabe/mockup-project-preset.md` (maintained alongside gastify's `.kdbp/PLAN.md` as reference implementation).

Preset writes `## Current Phase` pointing to Phase 1. User reviews + can `/gabe-plan update` to add/drop phases before executing.

### Step 1: Check for active plan

Read `.kdbp/PLAN.md`. If it contains `status: active`:

1. Show the active plan summary:
   ```
   ACTIVE PLAN DETECTED:
     Goal: [goal from plan]
     Phase: [current phase]
     Created: [date]
     Last Updated: [date]
   ```

2. Ask: "What do you want to do with the current plan?"
   - `[complete]` — Archive as completed
   - `[defer]` — Archive as deferred + add to PENDING.md
   - `[cancel]` — Archive as cancelled
   - `[continue]` — Keep working on current plan (stop gabe-plan, don't create new)
   - `[replace]` — Archive as cancelled + create new plan

3. Execute the chosen action (see Step 6 for archive mechanics).

4. If `continue`: stop here. If anything else: proceed to Step 2.

### Step 2: Gather context

1. Read `.kdbp/BEHAVIOR.md` for `maturity`, `domain`, `tech`.
2. If no goal in $ARGUMENTS, ask: "What are you planning to build or change?"
3. Read `.kdbp/PENDING.md` — surface any open items related to the goal (show max 5).

### Step 3: Plan

Execute the standard planning process:

1. **Restate requirements** — Clarify what needs to be built, in context of the project domain and maturity.
2. **Break into phases** — Specific, actionable steps. Each phase has:
   - Name
   - Description (one sentence)
   - Key files likely affected
   - Estimated complexity: low / medium / high
   - **Types** — phase type tags (drives Step 3.5 section assembly). Examples: `[ai-agent, integration]`, `[data-migration, multi-tenant]`, `[user-facing, client-state]`. Tags MUST come from the canonical closed list (mirrors `tier-section-index.md` so it survives a missing index): `{data-migration, persistence, multi-tenant, org-scoped, ai-agent, llm, user-facing, external-api, perf-sensitive, client-state, spa, pwa, auth, session, async-worker, queue, realtime, streaming, sse, migration, rollout, upload, storage, cdn, email, push, sms, design-system, ui-kit, mockup-flows, mockup-index, mockup-docs, mockup-validation}`. Freeform tags (`frontend`, `ui-screens`) silently disable `/gabe-next` hybrid dispatch and `/gabe-execute` evidence classification — reject them and re-ask. See `~/.claude/templates/gabe/tier-sections/tier-section-index.md` for the full section mapping.
   - **Runtime journey evidence** — for phases tagged `{user-facing, native-mobile, mobile-web, web, upload, realtime, streaming, file-media, auth, session, notifications}`, include a concrete verification checkpoint that exercises the changed path on the target runtime and captures artifacts. Unit/static checks are not enough for these phase types.
3. **Identify dependencies** between phases.
4. **Assess risks** — Flag anything that could block progress.
5. **Present the plan** and WAIT for user confirmation.

If user says "modify": adjust and re-present. If "no" or "cancel": stop without writing.

### Step 3.5: Tier decision per phase — MVP / Enterprise / Scale

After the user confirms the phase list (Step 3), run the tier-decision flow **per phase in order**. This is the premature-optimization gate — every phase picks a tier, sees the trade-offs explicitly, and logs what is being traded away.

**Rationale:** Code at the wrong tier rots fast. Over-engineered MVPs become unmaintainable; under-engineered Scale phases leak data. The tier decision makes the choice active and logged, not implicit and forgotten. Aligns with user value U2 (Plan Light, Build Real).

#### 3.5.1 — Assemble the matrix per phase

For each phase:

1. **Read phase `types: [...]` tag list.**
2. **Load section files:**
   - Always: `~/.claude/templates/gabe/tier-sections/core.md`
   - For each matched tag, load the corresponding section file per `tier-section-index.md` mapping.
   - If `tier-section-index.md` or any matched section file cannot be read: STOP with `⛔ tier-sections templates missing at <searched paths> — reinstall the suite.` Never render a tier matrix from memory; a fabricated matrix makes the tier decision theater.
3. **Layer 2 — Dimension filter (skip if `--full-catalog` flag set):**
   - LLM (Haiku, cheap per U6) reads phase Description + types + typical code signals → picks relevant dimensions per non-Core section.
   - **Core always renders all 4 dimensions unfiltered.** Layer 3 rule.
   - Suppressed dimensions logged to DECISIONS.md (see 3.5.4) with one-line reason each.
4. **Per-dim tier override (Layer hybrid):**
   - LLM may re-score any Δ cell per phase context. Default Δ stays unless LLM has specific reason (phase is bigger-than-typical, unusual risk, etc.).
   - **Cross-tier override** (promoting a specific dim one or more tiers above the phase's base tier — e.g., whole phase at `ent` but Observability needs `scale` because of compliance / REQ-level mandate / load-bearing dependency) produces a **per-dim tier override** record, not a generic Δ edit. Structure:
     ```yaml
     dim_overrides:
       - section: Core
         dim: Observability
         tier: scale             # target tier for this dim
         reason: "REQ-21 + U8 mandate OTel exporter at P1 exit"
     ```
   - Structured overrides flow into (a) the rendered prompt's "Tier overrides (this phase)" footer, (b) `DECISIONS.md` `### Per-dim tier overrides` subsection, (c) `PLAN.md` phase row compact notation + Phase Details YAML block. All three are populated from the same structured list to keep them synchronized.
   - **Semantics.** `phase_tier` remains the **single base tier** for the phase and drives effort estimate + typical tier-cap filter. `dim_overrides` explicitly permits named dimensions to operate at a **higher** tier than the base without promoting the whole phase. Consumers that enforce tier caps (`/gabe-execute` Step 2 prune, `/gabe-review` TIER_DRIFT) MUST consult overrides and allow tasks / patterns at the per-dim tier, not just the base.
   - **Downgrades not allowed via override.** Never use `dim_overrides` to permit a dim at a *lower* tier than the phase's base — that's a tier-mismatch signal that either the phase is over-tiered or the dim genuinely belongs in a separate phase. Reject such proposals at Step 3.5.2 render time with: `⛔ Dim override cannot be below phase tier. If <dim> is lower-tier than phase, reduce phase_tier or split the phase.`
   - Each override logged to `DECISIONS.md` with reason (see 3.5.4).
5. **Prototype-tag detection:** Ask user `Is this phase a throwaway prototype? [y/N]`. Default: no. If `y`, apply Δ shift per `tier-delta-scale.md` (XL→L, L→M, M→S, S→S floor).

#### 3.5.2 — Render the decision prompt

Render combined matrix. Each section gets its own 6-col table (Dimension | MVP | Δ(M→E) | Enterprise | Δ(E→S) | Scale). Row width enforced at 110 chars (20/20/6/20/6/19 content budget). Section files already obey this; renderer must not widen.

**Rendering invariants (runtime behaviour, U4 mechanical enforcement):**

1. **Core section ALWAYS renders as the full 4-dimension 6-column markdown table — never as prose, never collapsed, never abbreviated.** The invariant holds even when Core is the ONLY section rendered (phases tagged `core-only`, `[core-only]`, or with no additional type tags). A `core-only` phase is not a reason to compress the matrix — it is the signal that Core IS the whole decision surface for that phase and must be shown explicitly so the tier trade-off is visible.
2. **Every non-Core section that passes Step 3.5.1 loading renders as its own 6-col table.** Even when the Layer 2 filter keeps only one dimension, render the single-row table. Do not substitute bullet lists or prose.
3. **Prose commentary is additive, never substitutive.** Tier-pressure callouts, red-line flags, "Proposed tier" recommendations, and rationale paragraphs appear **after** the table, not in place of it. The operator must be able to read each phase's rendered matrix identically in shape — same columns, same row count for Core, same section order.
4. **One phase, one section group, same rendering.** A `[core-only]` phase and a `[ai-agent, integration]` phase differ only in how many section tables appear — not in whether the tables appear. No phase should display "(all 4 — this phase IS observability)" without the underlying table.

This is a U4-level enforcement point: do not rely on prompt instructions to hold the line at runtime. When emitting Step 3.5.2 output, the renderer emits the section table header first, then the full row body, then prose commentary after. Any deviation is a bug.

**Per-dim tier override rendering (runs when `dim_overrides` is non-empty):**

After all section tables for the phase, emit a **Tier overrides (this phase)** subsection listing each override with the target tier + reason. This is the operator's chance to see exactly which dims escalate above the base tier before picking. Format:

```markdown
**Tier overrides (this phase):**

| Section.Dim | Base tier | Override tier | Reason |
|-------------|-----------|---------------|--------|
| Core.Observability | ent | scale | REQ-21 + U8 mandate OTel exporter at P1 exit |
| Data.Backup | mvp | ent | Financial data — backup before first user write |
```

The override table is always rendered as a markdown table, never prose. Skipped entirely when `dim_overrides` is empty (most phases).

Inside the section's main table (Core / Data / …), the dim row whose cell is overridden gets its chosen-tier cell marked with a trailing ★:

```markdown
| Observability        | print/log            | M      | structured log       | L      | + metrics + traces ★ |
```

The ★ marks the **target tier** the operator is committing to for that dim — visual cursor for the Tier overrides footer. Non-overridden dims remain unmarked.

Render format:

```
PHASE N — [phase name]
TYPES: [tag list]
PROTOTYPE: [yes|no]

SECTION: Core
| Dimension            | MVP                  | Δ(M→E) | Enterprise           | Δ(E→S) | Scale               |
|----------------------|----------------------|--------|----------------------|--------|---------------------|
| Testing              | happy path           | L      | + edges              | M      | + fuzz + load eval  |
| ...

SECTION: [section name]
| ... dimensions filtered per 3.5.1 step 3 ...

[more sections ...]

────────────────────────────────────────────────────────────────────────────────────────────────────
Effort (rough)      | 2h                   |        | 1d                   |        | 3d+                 |
Net Δ deferred      | 0                    |        | [L × n, XL × n]      |        | [L × n, M × n]      |

Pick tier: [mvp | enterprise | scale]
Default: mvp (cheap, honest baseline — escalation requires reason).

Reason (optional):
```

**Effort footer guideline:**
- MVP: 1-4h typical
- Enterprise: 1-3d typical
- Scale: 3d+ typical

Numbers are reference, not oracle. LLM tailors per phase complexity.

**Δ deferred rollup:** Sum all Δ(M→E) cells for MVP column, all Δ(E→S) for Enterprise column. Shows what's being traded for the faster tier. "MVP: L × 4, XL × 2 deferred" means picking MVP accepts 4 Large and 2 Critical risks.

#### 3.5.3 — User picks tier

Wait for user input:
- `mvp` / `enterprise` / `scale` — tier selected
- `--full-catalog` typed inline — re-render without Layer 2 suppression, user picks again
- `show-all` — alias for `--full-catalog`
- `edit-types` — user revises phase types, restart from 3.5.1
- `abort` — exit /gabe-plan without writing PLAN.md

**Default recommendation:**
- If user types nothing or `default`: recommend **mvp**. Cheap, honest, escape hatch always available via escalation at execute time.

**Escalation reason required for Enterprise + Scale:**
- If user picks `enterprise` or `scale`, prompt: "Why this tier over mvp? (one sentence)"
- Reason goes to DECISIONS.md for audit. Blocks silent over-engineering.

**De-escalation free:**
- `mvp` pick needs no justification. "Plan light, build real" default.

#### 3.5.4 — Log to DECISIONS.md

Append one entry per phase:

```markdown
## D[next_id] — Phase [N] tier: [chosen] (YYYY-MM-DD)

**Phase:** [phase name]
**Types:** [tag list]
**Tier chosen:** [mvp | enterprise | scale]
**Prototype:** [yes | no]
**Reason:** [user reason, or "default MVP pick per U2" if mvp with no reason]

### Sections rendered
- Core (always)
- [section X]: [N dims, M suppressed] → see "Dimensions suppressed" below

### Dimensions suppressed (Layer 2 filter)
- [section.dim] — reason: [LLM reason]
- [section.dim] — reason: [LLM reason]

### Per-dim tier overrides (if any)

Structured list. Each entry records section, dim, target tier, and reason. Consumers (`/gabe-execute` tier-cap, `/gabe-review` TIER_DRIFT) parse this block to permit per-dim escalation above `phase_tier`.

```yaml
dim_overrides:
  - section: Core
    dim: Observability
    tier: scale
    reason: REQ-21 + U8 mandate OTel exporter at P1 exit
  - section: Data
    dim: Backup
    tier: ent
    reason: Financial data requires backup before first user write
```

### Δ cell overrides (if any — intra-tier LLM re-scoring, distinct from per-dim tier overrides above)

- [section.dim].Δ(M→E): default [X] → override [Y]. Reason: [LLM reason]

### Δ deferred by tier choice
- L × [count], XL × [count], M × [count], S × [count]
- Load-bearing items skipped (Δ = XL or L on M→E if mvp chosen):
  - [section.dim]: [consequence phrase from Scale column]

### Review trigger (when to escalate this phase)
- [suggested condition — e.g., "when prod traffic > 100 req/day", "when 2nd incident hits", "when we add 3rd integration partner"]

### Status
- accepted
```

`D[next_id]`: read DECISIONS.md, compute max existing ID + 1. If file missing, start at `D1`.

#### 3.5.5 — Store tier + per-dim overrides in PLAN.md

**PLAN.md Phases table `Tier` column format:**

- No overrides → base tier only: `ent`
- With overrides → compact notation: `ent (Obs→scale)` or `ent (Obs→scale, Backup→ent)` for multiple — preserves at-a-glance readability in the Phases table while full structure lives in Phase Details
- Dim short-names use the first word of the dim (e.g., `Observability` → `Obs`, `Error handling` → `Err`) to keep the cell compact. Full dim name stays in Phase Details.

**PLAN.md `## Phase Details` block per phase contains a YAML fenced block with structured data that `/gabe-execute` and `/gabe-review` parse directly** (per U4 — downstream consumers read structure, not prose):

```yaml
phase: N
types: [tag1, tag2]
phase_tier: ent
prototype: false
dim_overrides:
  - section: Core
    dim: Observability
    tier: scale
    reason: REQ-21 + U8 mandate OTel exporter at P1 exit
  - section: Data
    dim: Backup
    tier: ent
    reason: Financial data requires backup before first user write
sections_considered: [Core, Data, Integration]
suppressed_dims_count: 3
decisions_entry: D5
```

When `dim_overrides` is empty, the list is written as `dim_overrides: []` (not omitted) so downstream parsers have a stable schema.

Prose summary below the YAML block stays for human reading:

```markdown
### Phase N Details

```yaml
phase: N
phase_tier: ent
dim_overrides: [...]
...
```

- **Tier chosen:** `ent` with Observability override → `scale`
- **Prototype:** no
- **Sections considered:** Core, Data, Integration
- **Suppressed dims:** 3 (see D5 for full list)
- **See `DECISIONS.md` D5 for accepted trade-offs.**
```

### Step 3.75: Decide HTML review artifact

After tier decisions are complete and before writing `PLAN.md`, decide whether the plan gets a human-facing HTML artifact.

**Canonical source rule:** `.kdbp/PLAN.md`, `.kdbp/DECISIONS.md`, and `.kdbp/LEDGER.md` remain the automation source of truth. HTML is a review artifact for humans, not the authoritative plan state.

Create or refresh the HTML artifact when any of these are true:

- `--html-artifact` was passed.
- The user explicitly asks for an HTML, visual, graphical, dashboard, artifact, or human-readable planning document.
- The plan has 4+ phases.
- Any phase type includes `data`, `architecture`, `integration`, `multi-tenant`, `ai-agent`, `mockup-flows`, `mockup-docs`, `analytics`, `notifications`, or `user-facing` with multiple connected workflows.
- The plan is a product/domain modeling, workflow trace, schema planning, migration planning, or phase-readiness effort.

Do not create the HTML artifact when `--no-html-artifact` was passed or when the plan is a small routine change with no complex decision surface.

**Path selection:**

- If `--html-path=<path>` is present, use that path.
- Otherwise compute: `docs/gabe/plans/YYYY-MM-DD-<slug>/index.html`.
- Reject paths under `docs/mockups/` for Gabe Plan artifacts. `docs/mockups/**/*.html` is owned by mockup workflows and archive/reference policy, not planning.

**HTML artifact contract:**

- Single self-contained `.html` file with inline CSS and inline SVG/HTML diagrams; no external network dependencies.
- Uniform visual scale: consistent cards, diagrams, spacing, side navigation, tables, section widths, and typography rhythm.
- Top banner text must include exactly: `HTML review artifact; .kdbp/PLAN.md and .kdbp/DECISIONS.md remain canonical.`
- Include provenance: generated date, command (`/gabe-plan`), source plan path, decision entry range, ledger entry title, and links/paths to canonical Markdown.
- Include a visible `Detail paths`, `More detail`, or equivalent section that maps every major HTML section to the Markdown/README files that hold deeper details. Use relative links when the target is in the repo; use clear path text when the target may not render in a browser. HTML should summarize and orient, not trap critical detail inside cards.
- Recommended sections: summary, phase map, ownership/data-flow diagram where relevant, tier decision digest, risks/bottlenecks, verification checklist, and Phase 3/open questions.
- Prefer inline SVG for domain maps and state/data-flow diagrams when Mermaid would require a runtime dependency. Mermaid fences may appear only as static source examples, not as required rendering dependencies.

The HTML should be reviewable in a browser by opening the file directly. It must not require a dev server.

### Step 4: Write plan to `.kdbp/PLAN.md`

Only after user confirms. Write with this structure:

```markdown
# Active Plan

<!-- status: active -->

## Goal

[One sentence goal]

## Context

- **Maturity:** [from BEHAVIOR.md]
- **Domain:** [from BEHAVIOR.md]
- **Created:** [YYYY-MM-DD]
- **Last Updated:** [YYYY-MM-DD]

## Phases

| # | Phase | Description | Types | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|-------|------|------------|------|--------|--------|------|
| 1 | [name] | [description] | [user-facing, web] | mvp | low/med/high | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | [name] | [description] | [ai-agent, integration] | ent | low/med/high | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | [name] | [description] | [data-migration, multi-tenant] | scale | low/med/high | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->
<!-- Review/Commit/Push auto-ticked by /gabe-review, /gabe-commit, /gabe-push -->
<!-- A phase is complete when all status columns are ✅ -->
<!-- /gabe-next routes to the next command based on column state (Exec → Review → Commit → Push → advance phase) -->
<!-- Center column (OPTIONAL, command-center projects only): add `| Center |` after Push; auto-ticked ✅ by /gabe-feature when it covers the shipped phase. Absent → /gabe-next skips it (treated as ✅). -->
<!-- Tier column values: mvp | ent | scale. Read by /gabe-execute (tier-cap) and /gabe-review (TIER_DRIFT finding). -->
<!-- User-facing/runtime phase types require journey evidence artifacts before Exec can be ✅. -->
<!-- Manual override is fine — edit cells by hand any time (then /gabe-plan update regenerates the PLAN.json mirror) -->
<!-- Legacy plans with a single Status column still work; auto-tick is a silent no-op -->
<!-- Legacy plans without Tier column: /gabe-execute reads tier=mvp default; /gabe-review skips TIER_DRIFT silently -->

## Phase Details

### Phase 1 — [name]
- **Types:** [tag list, e.g. `ai-agent, integration`]
- **Tier:** [mvp | ent | scale]
- **Prototype:** [yes | no]
- **Scope:** <files/globs this phase may touch — e.g. web/src/routes/items.tsx, api/routers/items.py>
- **References:** <existing modules/patterns/docs to reuse — e.g. src/components/ListView, docs/api-conventions.md>
- **Acceptance:** <observable signal — e.g. "GET /api/items renders seeded rows in the browser">
- **Checkpoint:** <verification command(s) — e.g. npm run build && npx playwright test items>
- **Sections considered:** Core, [matched sections]
- **Suppressed dimensions:** [count, or "none" if --full-catalog was used]
- **Trade-offs accepted:** See DECISIONS.md [D-id]

<!-- #### Phase N Tasks block is written by /gabe-execute Step 3 and ticked per task at Step 4.5 — do not author it here -->
<!-- - **Cases:** line is written by /gabe-red (NEW/BUMP/GUARD C-ids + red@sha, or an enumerated skip code) — do not author it here -->

### Phase 2 — [name]
...


## Current Phase

Phase 1: [name]

## Dependencies

- [phase X depends on phase Y because...]

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| [risk] | high/medium/low | [mitigation] |

## Notes

[Any additional context from the planning conversation]

## Review Artifacts

- HTML review artifact: [path, or "none — simple plan / disabled by --no-html-artifact"]
- Canonical source: `.kdbp/PLAN.md`, `.kdbp/DECISIONS.md`, `.kdbp/LEDGER.md`

## Runtime Evidence Checkpoints

- For each user-facing/runtime phase, name the required journey command(s), target device/browser, and artifact directory before `/gabe-execute` starts.
```

### Step 4b: Write the PLAN.json machine mirror

Whenever this skill writes `.kdbp/PLAN.md` (Step 4, Step UPD, Step 6 archive mechanics), write the sibling `.kdbp/PLAN.json` in the same turn (E5). PLAN.md stays canonical for humans; PLAN.json is the machine mirror — read by session hooks and deterministic tooling (the planned `next.mjs`), written only by this skill and the shared auto-tick helper. It is never hand-edited; if it drifts or goes missing, regenerate from the Phases table.

Schema (v1):

```json
{
  "version": 1,
  "status": "active",
  "project_type": "code",
  "goal": "<one-line goal>",
  "maturity": "<from Context>",
  "created": "YYYY-MM-DD",
  "last_updated": "YYYY-MM-DD",
  "current_phase": "<phase id as string>",
  "phases": [
    {
      "id": "<first table column, as string — supports H6, U1, 2.1>",
      "name": "<Phase cell>",
      "tier": "mvp",
      "complexity": "med",
      "types": ["<from the Types cell or the Phase Details YAML>"],
      "cells": { "exec": "todo", "review": "todo", "commit": "todo", "push": "todo" },
      "proof": null,
      "proof_type": null,
      "cases": null
      // command-center projects only: cells also carries "center": "todo" (5th lifecycle cell)
      // TDD-adopting projects: cells also carries "red": "todo" (routed to /gabe-red BEFORE Exec)
      // and "cases" mirrors the Phase Details Cases: record (written by /gabe-red, E5) —
      // the plan-proof-guard hook reads it: Red ✅ without a cases record is BLOCKED (D7)
    }
  ]
}
```

Rules:

- `status` mirrors the `<!-- status: ... -->` comment: `active | none | completed | defer | cancelled`. `project_type` mirrors the `<!-- project_type: ... -->` comment (`code | mockup | hybrid`); readers default a missing field to `code`.
- Cell tokens mirror the table glyphs 1:1: ⬜ `todo` · 🔄 `in_progress` · ✅ `done` · ⏸ `deferred` · ⚰️ `obsolete`.
- **`proof_type` (optional).** Declared at plan time alongside `proof`, typing what evidence the phase owes: `test | visual | journey` (or `null`). `test` is the TDD form — the evidence doctrine's "failing-then-passing test (fails on base, passes on fix)" — consumed by `/gabe-red`; `visual`/`journey` keep today's runtime-artifact meaning. Readers default a missing field to the runtime shape.
- **`red` cell (optional, TDD-adopting projects only).** A phase row MAY carry a `Red` cell BEFORE `Exec`: ✅ once `/gabe-red` committed the phase's red checkpoint (or recorded a guard-only / enumerated skip). `/gabe-next` routes `red ⬜ → /gabe-red` ahead of Exec; a missing column is treated as always-✅ (same degradation as `Center`). Seed it (⬜) only when the project has adopted the red beat.
- **`center` cell (optional, command-center projects only).** Projects with a `docs/site/center/` Testing Command Center carry a fifth cell/`Center` column: ✅ once `/gabe-feature` has covered the shipped phase (it writes the cell when it stamps the feature card reviewed, E5). Absent in every other project — `/gabe-next` treats a missing `center` as always-✅, so non-center plans keep the classic four-cell lifecycle. Seed it (⬜) only when the project has a command center.
- `proof` is the per-phase runtime-evidence field (Evidence Doctrine): at plan time, the required journey command / spec path / artifact dir from `## Runtime Evidence Checkpoints` (or `null` for phases with no runtime requirement); `/gabe-execute` overwrites it with the actual evidence line (command → runtime → artifact paths) when the evidence lands.
- On archive (Step 6b), after resetting PLAN.md to the empty template, write `{"version": 1, "status": "none", "phases": []}`. The archived `.md` copy is the durable record; the mirror is regenerable, so it is not archived.
- Legacy plans: if PLAN.md exists without PLAN.json, regenerate the mirror from the Phases table on the next write that touches plan state.

### Step 5: Log to LEDGER.md

Append one row to `.kdbp/LEDGER.md` per the thin session index (house format below):

```
| [YYYY-MM-DD] | PLAN | created: [goal, ≤8 words] — [N] phases (mvp×a ent×b scale×c) | — | D[first]–D[last] · html: [path or none] |
```

Tier distribution gives a quick read on "how much we're trying to do." A plan of 6 phases with 5 scale + 1 ent is a warning sign — over-scoping detectable at plan creation, before code hits.

### Step 6: Archive mechanics

When archiving a plan (from Step 1 or when completing later):

**6a. Build archive filename:**
```
.kdbp/archive/{prefix}_PLAN_{YYYY-MM-DD}_{slug}.md
```
- `prefix`: `completed`, `defer`, or `cancelled`
- `slug`: 2-4 word slug from the plan goal (lowercase, hyphens)
- Example: `.kdbp/archive/completed_PLAN_2026-04-15_add-auth-pipeline.md`

**6b. Move the plan:**
- Copy `.kdbp/PLAN.md` content to the archive file
- Change `<!-- status: active -->` to `<!-- status: {prefix} -->`
- Add `## Archived` section at the bottom:
  ```
  ## Archived
  - **Resolution:** completed | deferred | cancelled
  - **Date:** [YYYY-MM-DD]
  - **Reason:** [user's reason if given, or "Goal achieved" for completed]
  ```
- Reset `.kdbp/PLAN.md` to the empty template:
  ```markdown
  # Active Plan

  <!-- status: none -->
  <!-- When no plan is active, this file stays as-is. gabe-plan writes here. -->
  <!-- Archived plans go to .kdbp/archive/ with prefix: completed_, defer_, cancelled_ -->

  No active plan. Run `/gabe-plan [goal]` to create one.
  ```
- Reset `.kdbp/PLAN.json` to `{"version": 1, "status": "none", "phases": []}` (Step 4b).

**6c. For `defer` only — add to PENDING.md:**

Add a row to `.kdbp/PENDING.md`:

| # | Date | Source | Finding | File | Scale | Priority | Impact | Times Deferred | Status |
|---|------|--------|---------|------|-------|----------|--------|----------------|--------|
| P[N] | [date] | gabe-plan | Plan deferred: "[goal]" | .kdbp/archive/defer_PLAN_...md | [maturity] | [ask user: high/medium/low, default medium] | [ask user: high/moderate/low, default moderate] | 1 | open |

**6d. Log to LEDGER.md** — one thin-index row:

```
| [YYYY-MM-DD] | PLAN | {completed|deferred|cancelled}: [goal, ≤8 words] — [N of M] phases done | — | archive: .kdbp/archive/{filename} |
```

### Step 7: Show result

```
GABE PLAN: [goal]

STATUS: ✅ Plan written to .kdbp/PLAN.md (+ PLAN.json mirror)
PHASES: [N] phases | Current: Phase 1 — [name] (tier: [mvp/ent/scale])
TRACKERS: Exec ⬜ | Review ⬜ | Commit ⬜ | Push ⬜ (auto-ticked as phases advance)
TIERS: mvp × [n], ent × [n], scale × [n] | PROTOTYPES: [n]
DECISIONS: D[first] → D[last] logged (per-phase tier trade-offs)
HTML_ARTIFACT: [path, or none]
LEDGER: ✅ logged

Next steps:
  1. Start Phase 1 — [brief description] — tier [mvp/ent/scale]
  2. Run /gabe-execute to implement. Tasks capped to chosen tier.
  3. Escalate mid-phase via /gabe-execute if tier underscoped (logged to DECISIONS.md).
  4. Run /gabe-plan when done to archive as completed.
```

After the normal result block above, print one full Gabe Block:

- Header line: `**Gabe-Lens block**`
- Use the active `gabe-lens` cognitive suit and the full Gabe Block format: THE PROBLEM or WHAT IT ENABLES, THE ANALOGY, HOW IT MAPS, THE MAP, CONSTRAINT BOX, EASY TO CONFUSE WITH when helpful, ONE-LINE HANDLE, ANALOGY LIMITS, SIGNAL.
- Explain what the plan is going to build, why the phase structure matters, and what the user should mentally track as execution proceeds.
- Base the block only on the goal, phase list, tier choices, dependencies, risks, and next step already produced in this run.
- Keep the block output-only per the Gabe-Lens Output Rule. Do not append it to PLAN, LEDGER, PENDING, REVIEW, commits, or docs.

### Step CHK — Structural compliance check + retrofit (`/gabe-plan check`)

Analyses the active `.kdbp/PLAN.md` + `.kdbp/DECISIONS.md` against the **current spec shape** and offers per-gap retrofit. Use when an existing plan predates a gabe-plan spec change (new columns, new fields, new Phase Details YAML block) and you want to upgrade without archive-and-replan.

**Zero-LLM analysis. LLM only fires when retrofit is accepted AND the retrofit requires content generation** (e.g., parsing prose override rationale into structured `dim_overrides` YAML).

#### CHK.1 — Preconditions

1. `.kdbp/` exists — else exit `⛔ No KDBP. Run /gabe-init first.`
2. `.kdbp/PLAN.md` contains `<!-- status: active -->` — else exit `ℹ No active plan to check. Run /gabe-plan [goal] to create one.`
3. Current spec version is identified from this file. Each compliance rule below is tagged with the spec version that introduced it so legacy plans get accurate reporting.

#### CHK.2 — Run compliance checks

For each phase row in the Phases table, evaluate:

| # | Rule | Spec ver | Failure signal |
|---|------|----------|----------------|
| C1 | Phases table has `Exec`, `Review`, `Commit`, `Push` columns | v2.9 | Header missing any of the four |
| C2 | Phases table has `Tier` column | v2.10 | Header missing `Tier` |
| C3 | Phases table has `Types` column | v2.10 | Header missing `Types` |
| C4 | Each phase has a `## Phase Details → Phase N` block | v2.10 | No matching heading for phase N |
| C5 | Phase Details block contains a YAML fenced code block with `phase_tier` field | v7.1 | Missing YAML or YAML lacks `phase_tier` key |
| C6 | Phase Details YAML contains `dim_overrides:` key (even if empty list `[]`) | v7.1 | Key absent |
| C7 | Phase Tier cell format matches either bare tier or compact override notation `<tier> (<dim>→<tier>[, ...])` | v7.1 | Cell uses legacy format `tier-deferred` or prose |
| C8 | If phase prose mentions a dim override (e.g., "Observability at scale") but YAML `dim_overrides:` is `[]` → flagged as **prose-only override** (common on plans that predate v7.1) | v7.1 | Heuristic: prose-match |
| C9 | DECISIONS.md has a `D[N]` entry for each phase with `Phase: [N]` frontmatter OR a `## D[N] — Phase [N] tier:` heading | v2.10 | Phase row has no matching DECISION |
| C10 | `## Review Artifacts` exists and any listed HTML artifact path exists | v7.2 | Section missing, path missing, or path under `docs/mockups/` |
| C11 | Listed HTML artifact contains `HTML review artifact; .kdbp/PLAN.md and .kdbp/DECISIONS.md remain canonical.` | v7.2 | Missing canonical-source banner |
| C12 | Listed HTML artifact has a visible detail-link section pointing to canonical Markdown/README sources | v7.3 | Missing `Detail paths` / `More detail` equivalent or no links/paths to deeper docs |

Collect results per phase. Aggregate into a single compliance matrix.

#### CHK.3 — Render compliance report

Render as a markdown table (plain markdown, per `gabe-docs/SKILL.md` rendering convention — no bare triple-backtick wrap):

**PLAN compliance report — `<N>` phases checked**

| Phase | # | Name | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 | C11 | C12 | Verdict |
|-------|---|------|----|----|----|----|----|----|----|----|----|-----|-----|-----|---------|
| 1 | Scaffold + DB | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ⚠ prose-only | — | ✅ | ❌ | ❌ | ❌ | **RETROFIT** |
| 2 | Money + FX + i18n | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | — | — | ✅ | ✅ | ✅ | ✅ | **RETROFIT** |
| 5 | Observability | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ⚠ prose-only | YAML absent | ✅ | ✅ | ✅ | ✅ | **RETROFIT** |

Legend:

- ✅ compliant · ❌ missing · ⚠ partial / prose-only · — not applicable
- Verdict: **COMPLIANT** (all ✅) · **RETROFIT** (≥1 gap, fixable) · **BLOCK** (structural damage requiring manual edit)

Aggregate summary below table:

- Compliant phases: **N / M**
- Prose-only overrides detected: **K** phases (needs LLM to structure)
- YAML blocks to generate: **N** phases
- Column additions needed: **[Types, Tier, Exec, …]** — project-wide, not per-phase

#### CHK.4 — Retrofit prompt

When ≥1 phase has a non-compliant verdict, offer a retrofit menu. Bulk options first, per-phase fallback second:

**Retrofit actions**

- `[all]` — apply every retrofit below in one pass (LLM fires once for YAML + prose-override parsing)
- `[cols]` — add missing project-wide columns (`Types`, `Tier`) to the Phases table only; leaves per-phase YAML alone
- `[yaml]` — generate `## Phase Details` YAML block for all phases missing one, seeded from existing prose
- `[overrides]` — for each phase with prose-only override signals (C8), run LLM to extract `dim_overrides` list into YAML with reason; confirm per-phase before writing
- `[decisions]` — backfill missing `DECISIONS.md D[N]` entries (skip silently if already present)
- `[html]` — create or refresh the HTML review artifact per Step 3.75, including the detail-link section, then add/update `## Review Artifacts` and the `LEDGER.md` `HTML_ARTIFACT` line
- `[N]` — pick a single phase number to retrofit (runs all applicable gaps for that phase)
- `[report-only]` — keep report, write nothing, exit
- `[abort]` — exit without writing

Defaults: if user picks `[all]`, confirm twice with a diff preview (LLM output for override parsing + generated YAML blocks + column additions). If `[overrides]` alone, preview per phase before accepting.

#### CHK.5 — Apply retrofit (only on accept)

For each accepted gap:

1. **Columns (C1–C3).** Edit Phases table header + every row; insert empty/default cell for new columns. Defaults:
   - `Types`: `[]` placeholder prompting user to fill on next update
   - `Tier`: inherit from phase's DECISION.md entry if present, else `mvp` (honest default)
   - `Exec`/`Review`/`Commit`/`Push`: `⬜` (never backfill to ✅ — those state values must come from actual command runs)
2. **Phase Details YAML (C4–C6).** Generate the block per current spec (`phase: N`, `types:`, `phase_tier:`, `prototype:`, `dim_overrides: []`, `sections_considered:`, `suppressed_dims_count: 0`, `decisions_entry: D[N]` if found). Preserve any existing prose after the YAML block.
3. **Tier cell format (C7).** Normalize to bare tier or compact override notation based on YAML `dim_overrides`.
4. **Prose-only overrides (C8).** Invoke Haiku LLM per phase with the prose Phase Details + section tier-cap files → extract structured `dim_overrides` list with reasons → ADD to YAML block. Never infer overrides from silence — only from explicit prose mentions. Present each extraction for per-phase approval before writing.
5. **DECISIONS backfill (C9).** Append a minimal `D[N]` row per missing phase with a note: `Backfilled via /gabe-plan check on <date>. Tier chosen: <from PLAN tier cell>. Reason: auto-backfill (no original decision recorded; review at next update).` Status stays `accepted` but flagged for review.
6. **HTML artifact (C10-C12).** Generate or refresh the artifact using the current `PLAN.md` and `DECISIONS.md`. Add `## Review Artifacts` if absent. Reject `docs/mockups/**/*.html`, require the canonical-source banner, and include a detail-link section pointing readers to the deeper Markdown/README sources.

Each write is path-scoped. No `git add -A`. On completion, stage the touched files and print a single `[commit]` prompt: `Retrofit complete. Stage and /gabe-commit "chore(kdbp): retrofit PLAN to spec v<ver>"? [y/N]`.

#### CHK.6 — Report

After write (or report-only), show:

- Files changed: `[list]`
- Phases retrofitted: `[list with per-phase gap count resolved]`
- LLM calls made: `[count]` (zero on report-only or cols-only paths)
- Residual gaps: any **BLOCK**-verdict phases remain untouched and listed with the reason

#### CHK.7 — Non-goals

- Does NOT re-run Step 3.5 tier decisions. User's existing tier choices are authoritative; backfill only generates the structure around them.
- Does NOT add phases, remove phases, or change REQ coverage. Structural fix only.
- Does NOT touch SCOPE.md. Scope (including its §Phases arc) has its own change commands.
- Does NOT call LLM unless `[overrides]` or `[all]` is picked AND the phase has prose-only override signals.

### Updating an active plan mid-work

If the user runs `/gabe-plan update` or `/gabe-plan status`:

- **`update`**: Scope fence (check before ANY edit):
  ```
  1. NEVER edit Red/Exec/Review/Commit/Push/Center cells — those belong to their commands (Red → /gabe-red, Center → /gabe-feature). `update` MAY add the `Red` or `Center` column itself (⬜ for every phase) when a project adopts the red beat / a command center — that is a schema edit, not a cell tick.
  2. NEVER renumber existing phases — append, or use decimal IDs (N.5); renumbering orphans the Current Phase pointer and DECISIONS D-links.
  3. NEVER delete DECISIONS.md references.
  Allowed edits menu: [add-phase] [edit-description] [edit-scope/acceptance] [re-tier via 3.5] [move-pointer] [edit-risks].
  ```
  Read `.kdbp/PLAN.md`, ask what changed, update the plan in-place, bump `Last Updated` date, rewrite the `.kdbp/PLAN.json` mirror (Step 4b), and log one thin-index row to LEDGER:
  ```
  | [YYYY-MM-DD] | PLAN | updated: [what changed, ≤10 words] | — | html: [refreshed path, existing path, or none] |
  ```
  If `## Review Artifacts` lists an HTML artifact, refresh it from the updated plan. If no artifact exists but the updated plan now matches Step 3.75 complexity heuristics, offer to create one unless `--no-html-artifact` is present.

- **`status`**: Read `.kdbp/PLAN.md`, show current state:
  ```
  PLAN STATUS: [goal]
  Phase: [current] of [total]
  Completed: [list]
  Remaining: [list]
  Last Updated: [date] ([N days ago])
  HTML Artifact: [path, missing, or none]
  ```
  If last updated >14 days ago, add: "⚠ Plan may be stale. Run `/gabe-plan update` to refresh."

---

## Shared: auto-tick phase column (used by /gabe-execute, /gabe-review, /gabe-commit, /gabe-push)

This logic is invoked by the four trigger commands to update the Phases table in `.kdbp/PLAN.md` when a phase gate passes. Idempotent; never silent on mismatch (see step 6).

### Procedure

1. **Preconditions (all must hold; on failure, print the step 6 skip code and exit — no tick):**
   - `.kdbp/PLAN.md` exists
   - File contains `<!-- status: active -->`
   - File contains a `## Current Phase` section
   - The Phases table header includes the target column name (`Exec`, `Review`, `Commit`, or `Push`) — **detection is by column name, not position**. If the plan uses the legacy `Status` column, this logic no-ops so old plans keep working. If the `Exec` column is missing on a pre-v2.9 plan, `/gabe-execute` auto-tick is a silent no-op.

2. **Find the target row:**
   - Parse `## Current Phase` — extract the leading phase-ID token N (integer, decimal, or alphanumeric — `3`, `2.1`, `H6`) from a line like `Phase 3: [name]` or a bolded `**H6 — [name]**` opener
   - In the Phases table, locate the row where the first data column equals N

3. **Tick the cell:**
   - Target column is determined by caller: `Exec` / `Review` / `Commit` / `Push`
   - For `Review` / `Commit` / `Push`: binary ⬜ → ✅. If already `✅`, exit silently (idempotent).
   - For `Exec`: tri-state ⬜ → 🔄 → ✅. Caller passes the target state (`start` writes 🔄, `complete` writes ✅). If already at or past the target state, exit silently.

4. **Bump Last Updated:**
   - In the Context section, replace the `- **Last Updated:** ...` line with today's date (`YYYY-MM-DD`)

4b. **Mirror the tick into `.kdbp/PLAN.json`** (Step 4b schema): set `phases[id==N].cells.<col>` to the matching token (⬜ `todo` · 🔄 `in_progress` · ✅ `done`) and `last_updated` to today. Use a small `python3 -c`/`node -e` one-liner — never sed on JSON. If PLAN.json is missing or unparseable, print `ℹ PLAN.json: mirror skipped (missing|invalid) — run /gabe-plan update to regenerate` and continue (the .md tick still lands; never block on the mirror).

5. **Cross-check the phase footer.** If the triggering commit message carries a `Phase: M` footer and M ≠ N (Current Phase): do NOT tick. Print `⚠ Phase footer M ≠ Current Phase N — fix the pointer or the footer before ticking.` (one deterministic string compare; /gabe-execute Step 5 already generates the footer).

6. **Skip codes.** On any precondition failure or footer mismatch, print exactly one line: `ℹ PLAN: <col> tick skipped (no-plan | not-active | phase-not-found | column-missing | legacy-format | footer-mismatch)`. Callers surface this line verbatim in their output.

7. **Exit. Do NOT:**
   - Advance the Current Phase (manual via `/gabe-plan update` or automatic via `/gabe-next`)
   - Log to LEDGER.md from this helper (callers already log their primary action)
   - Modify any other column or row

### Implementation note

Keep this logic local to each command (short awk/sed block ~15 lines for the .md cell, plus the step-4b one-liner for the mirror). Duplication is clearer than indirection here. A shared shell script would need to be installed alongside the commands, which adds install complexity for a small benefit.

---

## Shared: LEDGER.md thin session index (house format)

`.kdbp/LEDGER.md` is a **thin session index** — one table row per command checkpoint, appended directly under the header (newest first). Git commits (rich messages via /gabe-commit) and transcripts hold the detail; PLAN.json holds per-phase proof. Never append multi-line entries, per-tool-call logs, or file lists.

File shape:

```markdown
# Session Ledger — thin index

<!-- One row per command checkpoint, newest first. Detail lives in git commit messages; per-phase proof lives in PLAN.json. -->

| Date | Entry | Theme / scope | Commits | Gates / results |
|---|---|---|---|---|
```

- `Entry` is the writing command's tag: `PLAN` · `EXEC` · `COMMIT` · `REVIEW` · `PUSH` · `HANDOFF` (satellite commands that log use their own tag, e.g. `SCOPE`, `ALIGN`, `MOCKUP`).
- `Commits` carries the short sha(s) the row is about (`—` when none). This column is how scope is later resolved — `git show --name-only <sha>` replaces the old in-ledger file lists.
- Each writing command's own spec defines its row content; every writer appends exactly ONE row per checkpoint.
- If LEDGER.md is missing, create it with the header above. Legacy multi-entry ledgers are rotated to `archive/` per the KDBP-lite migration — never converted in place.

---

### Staleness detection

When reading PLAN.md at Step 1, also check `Last Updated`:
- >14 days: show `⚠ Plan last updated [N] days ago`
- >30 days: show `⚠ STALE PLAN — last updated [N] days ago. Consider: [complete] [defer] [cancel] [update]`
- Row-state consistency: any row < Current Phase N with a non-✅ cell → `⚠ INCOMPLETE PRIOR PHASES: [<phase>: <columns>]` (always print, never block).

### Scope integration (if SCOPE.md exists)

When `.kdbp/SCOPE.md` exists (project scoped via `/gabe-scope`):

1. **Read SCOPE.md `## Phases` first.** Find target phase by ID (integer or decimal). Extract `Goal`, `Why (business intent)`, `Depends-on`, `Parallel-with`, `Covers REQs`. (Pre-A2 projects that still carry a separate `.kdbp/ROADMAP.md` — or its archived copy under `.kdbp/archive/retired/` — read the same fields there.)
2. **Read SCOPE.md REQ blocks.** For each REQ-NN in Covers REQs, read `Description` + `Acceptance signal` at anchor `{#req-NN}`.
3. **Use as plan context.** Each REQ's Acceptance signal becomes a mandatory verification item in the Current Phase's plan. Goal-backward: plan must produce evidence satisfying every Covers REQ's acceptance.
4. **Constraint check.** Read SCOPE.md §9 Constraints + §10 Architecture Posture. Plan must align with declared tech stack, budget, topology.
5. **Dependency gate.** If phase is `pending` but any Depends-on phase is not `complete`, warn and ask whether to proceed anyway.

**Refusal cases:**
- SCOPE.md `status: pivoted` — confirm which version to target before planning.
- SCOPE.md §Phases references a REQ ID absent from §Requirements — stale arc, suggest `/gabe-scope-change`.

**Never write** to SCOPE.md. PLAN.md (+ its PLAN.json mirror) is the only write target.

$ARGUMENTS
