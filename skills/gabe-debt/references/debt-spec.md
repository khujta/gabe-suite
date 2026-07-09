# Gabe Debt — full spec

> This file is the binding spec; the SKILL.md core is a summary.
> E1–E7: see `../../gabe-docs/references/execution-contract.md`.

> **Rendering note.** Output templates wrapped in bare triple-backtick fences are spec-meta delimiters — render contents as plain markdown at runtime so findings tables display as tables. Tagged fences (```bash, ```diff, etc.) stay fenced at runtime. See `gabe-docs/SKILL.md` § "Runtime output rendering convention".

## Vocabulary note — "gravity wells"

`gabe-teach` uses "gravity wells" to mean **architectural sections / learning anchors** stored in `.kdbp/KNOWLEDGE.md` (soft cap 7, Miller's number). Those are *where* the architecture lives.

`gabe-debt` detects **decision debt** — unmade or contradictory decisions that turn a gravity well into a complexity trap. The two coexist: gabe-teach's wells are the **domains**; gabe-debt finds the **debt accumulating in each**. Keep the vocabularies distinct in output.

---

## When to Use

**Use when:**
- Before closing a SCOPE change (/gabe-scope-addition / pivot) — verify new scope doesn't introduce CRITICAL decision gaps
- After /gabe-plan drafts a phase — verify phase doesn't violate existing RULES.md
- Before merging a feature PR touching cross-cutting concerns (state, sync, RBAC, real-time, cost-metered resources)
- Periodically (monthly or per milestone) — scan for drift in well-trodden areas
- When a retrospective lands — `extract-rules` mines it into R-NN entries

**Don't use when:**
- You need a code-level review of the current diff (use `/gabe-review`)
- You need structural-gap analysis from a perspective (use `/gabe-roast [perspective]`)
- You need impact assessment before a change (use `/gabe-assess`)
- You need the values-alignment checkpoint (use `/gabe-align`)

---

## Required Inputs

### 1. Target — What to scope

Default target: the whole project's `.kdbp/` + code + commit history since the last SCOPE.md Change Log anchor.

| Input form | Effect |
|---|---|
| No target | Full scan (all patterns, all inputs) |
| `pattern=P<n>` | Single-pattern scan (e.g. `pattern=P3` for async-listener races) |
| `since=<git-ref>` | Limit commit-history pass to commits since the ref (default: last SCOPE §15 Change Log entry) |
| `[file or folder]` | Restrict code + commit sweep to this path; docs pass still runs globally |

### 2. Mode

| Mode | Behavior |
|---|---|
| (default) | Full scan + interactive triage + writes |
| `brief` | Findings table + severity + counts; no writes, no triage |
| `dry-run` | Full scan + show proposed DECISIONS / SCOPE §14 / RULES / PENDING diffs; no writes |
| `audit-rules` | Read-only: check current code/scope against existing RULES.md + LESSONS.md; report violations only |
| `extract-rules` | Read-only: mine retrospective files and propose new R-NN candidates; interactive y/n per candidate |
| `strict` | Non-zero exit if any CRITICAL unresolved finding (pre-commit hook form) |

Modes compose: `brief pattern=P3`, `dry-run since=HEAD~20`, etc.

### 3. Maturity — tier gate (from `.kdbp/BEHAVIOR.md`)

| Maturity | Surfaces |
|---|---|
| **MVP** | CRITICAL only |
| **Enterprise** | CRITICAL + HIGH |
| **Scale** | CRITICAL + HIGH + MEDIUM |

`--full` flag overrides tier gate (surfaces all findings regardless of maturity).

---

## Pattern Catalog

Patterns are data files at:
1. `.kdbp/debt-patterns/P<n>-<handle>.md` (project-local, highest priority; overrides global)
2. `~/.claude/templates/gabe/debt-patterns/P<n>-<handle>.md` (global, shipped with this skill)
3. `~/.agents/templates/gabe/debt-patterns/` (Codex home equivalent)

See `~/.claude/templates/gabe/debt-patterns/README.md` for the pattern file format. v1 ships 11 patterns:

| ID | Handle | Source evidence |
|---|---|---|
| P1 | dual-state-machines | Gastify LESSONS §1.1 / R1 |
| P2 | cross-feature-direct-mutation | Gastify LESSONS §1.2 / R2 |
| P3 | async-listener-race | Gastify LESSONS §2 Seam A / R5 |
| P4 | schema-drift-across-boundaries | Gastify LESSONS §2 Seam C / R4, R6 |
| P5 | god-class-growth | Gastify LESSONS §1.3 / R3 |
| P6 | deletion-detection-in-sync | BoletApp epic-14c-retro §1 |
| P7 | multi-op-state-staleness | BoletApp epic-14c-retro §2 |
| P8 | silent-fallback-changes-bigO | BoletApp epic-14c-retro §3 |
| P9 | cross-product-infra-coupling | BoletApp CLAUDE.md INC-001 |
| P10 | cost-model-absent-before-deploy | BoletApp epic-14c-retro §3 |
| P11 | multi-op-test-gap | BoletApp epic-14c-retro §2 |

Parsing a pattern file: sections are fixed headings (`## Evidence source`, `## Red-line questions`, `## Detection — doc pass`, `## Detection — code pass`, `## Detection — commit pass`, `## Tier impact`, `## Severity default`, `## ADR stub template`, `## Open Question template`, `## Rule template`). Missing section → use defaults. Unknown heading → pass-through (project may add custom sections).

## Architecture Principle Catalog

The AP catalog is loaded from the first available path:

1. `templates/architecture-principles.md` (project-local Gabe Suite source)
2. `~/.claude/templates/gabe/architecture-principles.md`
3. `~/.agents/templates/gabe/architecture-principles.md`

AP principles are explanatory citations, not independent debt patterns. Do not
emit a debt finding because "AP6 coupling might apply" in the abstract. First
find concrete debt through a pattern, rule, doc contradiction, code hit, or
commit hit; then attach AP IDs whose advisory tests are evidenced by that same
finding.

---

## Process Steps

### Step 0 — Preflight

1. **Detect `.kdbp/`.** If missing, instruct: "Run `/gabe-init` first. `/gabe-debt` requires a scoped project." Exit.
2. **Load BEHAVIOR.md.** Read the `maturity:` frontmatter field. If absent, prompt the user for tier; default to MVP if unanswered.
3. **Load output targets** (existing state, for idempotent updates later):
   - `.kdbp/DECISIONS.md` — parse row IDs (D1, D2, …) + stable-ID map (if present)
   - `.kdbp/SCOPE.md` — parse §14 OQ-NN IDs; §15 Change Log tail; §10 Architecture Posture; REQ-NN list
   - `.kdbp/RULES.md` — parse R-NN entries if file exists; fall back to `docs/rebuild/LESSONS.md` or `docs/**/RULES*.md` if present
   - `.kdbp/PENDING.md` — parse existing deferred entries to avoid re-raising
   - `.kdbp/debt-ignore.md` — parse dismissal list (created on first `(s)` during triage; see Step 5)
4. **Resolve active phase.** Parse `.kdbp/PLAN.md` `<!-- status: active -->` frontmatter. Record phase number, `types: []` list (binds to tier-sections).
5. **Load pattern catalog.** Read project-local `.kdbp/debt-patterns/*.md` first, then layer global `~/.claude/templates/gabe/debt-patterns/*.md`. Project-local overrides by ID. If ZERO pattern files load: print `⛔ Pattern catalog missing (searched .kdbp/debt-patterns/, ~/.claude/templates/gabe/debt-patterns/, ~/.agents/templates/gabe/debt-patterns/) — running Step 1 + Step 2.4 rule cross-check only.` Run only those steps, note the missing catalog in the summary, and NEVER synthesize pattern IDs or detection heuristics from memory.
6. **Load architecture principles.** Read the AP catalog from the first available architecture-principles path. If missing, continue without AP citations and note the missing catalog in the summary.
7. **If mode=`extract-rules`:** skip to Step 8. If mode=`audit-rules`: skip the catalog-scan parts of Step 2, only check existing rules.

### Step 1 — Load project-local rules

Index all rule sources into a single `rules_index`:

1. `.kdbp/RULES.md` — R-NN entries (canonical)
2. `docs/rebuild/LESSONS.md` — Gastify-shape; R-NN entries (imported as rules)
3. `docs/**/*retro*.md` — BoletApp-shape retros; extract §Root cause rules as lower-confidence rules
4. Any file matching `POSTMORTEM*`, `DEBRIEF*`, `LESSONS*`, `RETRO*`, `PAIN*` at repo root or `docs/`

Each rule entry records: `id`, `description`, `source-path`, `applies-to`, `detection-signature`, `severity`, `confidence`. Same-ID collisions: canonical RULES.md wins.

### Step 2 — Run pattern scan

For each pattern in the catalog:

#### 2.1 Doc pass (structured inputs)

Walk `.kdbp/SCOPE.md`, `.kdbp/DECISIONS.md`, `.kdbp/PLAN.md`, `.kdbp/ROADMAP.md`, `.kdbp/KNOWLEDGE.md`, `.kdbp/ENTITIES.md`, `.kdbp/PENDING.md`, `templates/tier-sections/` index (if any bound via active phase's `types: []`). Apply the pattern's `## Detection — doc pass` heuristics. Classify each red-line question:

- **decided (with ref)** — ADR ID or section reference points to an explicit answer
- **implicit** — prose / commit-message / mockup annotation implies an answer but no ADR
- **missing** — no signal found
- **contradictory** — multiple sources give different answers

Missing + contradictory → finding candidate. Implicit without commit/code evidence → finding candidate at weak-signal confidence.

#### 2.2 Code pass (grep / AST heuristics)

Apply the pattern's `## Detection — code pass`. Scope:
- If target is a path, restrict to it.
- Else, consult `.kdbp/STRUCTURE.md` for declared entry-point dirs and scan those; otherwise scan `src/ apps/ packages/ app/ functions/ services/` (exclude `node_modules/ dist/ build/ .next/`).

Attach every hit as evidence: `file:line — <matched line>`. Cap at 20 hits per pattern (summarize the rest).

#### 2.3 Commit pass

Range: `since=<ref>` (default: latest `| <date> | init | …` or `| <date> | addition | …` or `| <date> | pivot | …` entry in SCOPE.md §15; if none, last 90 days).

For each commit in range:
- Apply pattern's `## Detection — commit pass` markers.
- Attach: `<short-sha> <date> — <subject>` as evidence.
- Flag `revert` commits — these often seed rule candidates even if no pattern-specific marker hits (route through `extract-rules` on user request).

#### 2.4 Rule-violation cross-check

For each rule in `rules_index`:
- If the rule's `detection-signature` matches anything scanned in 2.1–2.3, emit a finding with status=`violating-existing-rule` and severity at least HIGH (auto-elevated to CRITICAL if the rule is tagged "load-bearing" in its source).

### Step 3 — Score findings

Each finding gets four scores:

**Severity** (from pattern's `## Severity default`, adjusted by tier):
- Pattern's declared default
- Elevate by 1 level if the finding violates an existing RULES.md / LESSONS.md rule
- Elevate to CRITICAL if the source rule is tagged load-bearing

**Confidence** (three-bucket):
- **confident** — ≥1 structured-doc hit + ≥1 code-or-commit hit (triangulated)
- **uncertain-depends** — multiple doc hits OR rule-violation with unclear code path
- **weak-signal** — single-source hit (doc-only / code-only / commit-only)

Weak-signal findings are included in output but demoted one severity level and labelled explicitly.

**Blast radius** (scalar):
- Count of phases touched (from `.kdbp/PLAN.md` types matching pattern's applies-to)
- Count of REQ-NNs touched (from SCOPE.md §12)
- Count of files touched (from code pass)
- Sum = blast radius score; used for ordering within severity bucket.

**Status** (exclusive):
- `missing` — no decision signal found
- `implicit` — decision inferable but not formalized
- `contradictory` — multiple conflicting signals
- `violating-existing-rule` — code/scope violates a known R-rule

**Evidence floor:** every finding carries ≥1 evidence line. For status=`missing`, evidence = the sources searched + the red-line question (e.g. `searched SCOPE §10, DECISIONS D1–D14, PLAN phase 5 — no signal for RLQ-2`). Zero evidence lines → the finding is DROPPED before output, not demoted.

**Architecture principle citations** (advisory, optional):
- Match AP IDs from the catalog against the finding's existing evidence only.
- Attach at most three AP citations to avoid noise, ordered by evidence strength.
- AP citations do not change severity, confidence, status, or tier filtering.
- Output format: `Architecture principles: AP6 coupling, AP12 documented decisions`.

### Step 4 — Tier filter

Drop findings below the tier threshold (see table under Required Inputs §3). Always keep `violating-existing-rule` findings regardless of tier.

Within-tier ordering: CRITICAL first, then HIGH, then MEDIUM. Within each severity, order by confidence (confident first) then by blast radius (desc).

### Step 5 — Interactive triage (skipped for `brief`, `dry-run`, `audit-rules`, `extract-rules`, `strict`)

Present each finding one at a time:

```
[#<N>] <SEVERITY> · <confidence> · <pattern-id> · <status>
  Pattern: <pattern handle>  (applies to: <phases / REQs>)
  Blast: <radius score>  |  Tier: <mvp|enterprise|scale>

  Evidence:
    - <source>: <content>
    - <source>: <content>

  Architecture principles:
    - <APn handle> — <why the cited evidence touches it>

  Consequence: <pattern's what-we-lose statement, customized to this project>

  Action:
    (d) Promote → DECISIONS.md ADR (stub seeded from pattern template)
    (o) Open question → SCOPE.md §14 OQ-NN (stub seeded)
    (r) Codify rule → RULES.md R-NN (stub seeded from pattern's rule template)
    (p) Defer → PENDING.md
    (s) Skip (recorded to .kdbp/debt-ignore.md — won't re-raise)
    (m) Multi — pick two or more targets (e.g., r+d for rule + ADR crossref)
    (e) Edit the stub before promoting
    (q) Quit triage (writes nothing so far this session if --transaction mode)
```

Key behaviors:
- `(e)` opens an editable preview of the stub. User can revise description, alternatives, detection, then pick d/o/r/p.
- `(m)` chains promotions: e.g., `m` then `r+d` creates an R-NN in RULES.md AND a D-N in DECISIONS.md that cross-references the R-NN.
- `(s)` appends `<pattern-id>:<stable-id>:<YYYY-MM-DD>:<reason>` to `.kdbp/debt-ignore.md`. Re-running the scan reads this file and suppresses matching findings.
- `(q)` discards the session's triage decisions. Writes that already landed in this session via `(d)/(o)/(r)/(p)` stay — quit is for remaining findings only.

### Step 6 — Writes (approved targets only)

Writes happen only after at least one `(d)/(o)/(r)/(p)/(m)` action has been confirmed AND a final summary prompt confirms:

```
Proposed writes:
  DECISIONS.md:   +<N> ADR stub(s) [D<N>..D<M>]
  SCOPE.md §14:   +<N> OQ-NN(s) [OQ-<n>..OQ-<m>]
  RULES.md:       +<N> R-NN(s) [R<n>..R<m>]
  PENDING.md:     +<N> entry/entries

  SCOPE.md §15:   +1 Change Log entry (type: debt-scan)

Proceed? (y) apply  (n) cancel  (p) print diff first
```

On `(p)`: print a unified diff for each target (including the SCOPE §15 entry). Re-prompt.

**Idempotency** (crucial):
- Every ADR / OQ / R-NN gets a stable ID = `sha1(pattern-id + project-name + active-phase-number + red-line-question-hash)[:8]`. Record as an HTML comment: `<!-- gabe-debt-stable-id: <8-char-hash> -->` on the entry.
- On re-run, if a stable-ID is already present: UPDATE the entry in place (refresh evidence, revise status) rather than append. Target's own numeric ID (D5, OQ-02, R3) stays stable.
- Stable-IDs are hash-based, not per-session, so running twice on the same state produces no duplicates.

**Where writes land:**

| Target | Insert location | Change Log line |
|---|---|---|
| DECISIONS.md | append new row to the ADR table | — |
| SCOPE.md §14 | append new `### OQ-NN` block | SCOPE §15 debt-scan entry lists OQ-NN created |
| RULES.md | append new `### R-NN` block under §1; extend §2 Phase cross-reference matrix | RULES §4 Change Log entry |
| PENDING.md | append row to deferred-items table | — |

**SCOPE.md §15 Change Log entry format:**
```markdown
| <YYYY-MM-DD> | debt-scan | Added <N> OQ-NN(s) + <M> R-NN(s) + <K> ADR stub(s) via /gabe-debt. Patterns: P<x>, P<y>. |
```

**Never commit.** Writes land as dirty working-tree changes. User reviews via `git diff .kdbp/` and commits via `/gabe-commit`.

### Step 7 — Summary report

Print:
- Total findings scanned / triaged / written
- Breakdown by target (DECISIONS / OQ / R / PENDING)
- Confidence distribution
- Suggested follow-ups:
  - Files touched in code pass → "Consider `/gabe-review <those files>`"
  - New R-NNs written → "Update team docs / PR template"
  - Contradictory findings → "May need /gabe-roast [perspective] on the conflict"

### Step 8 — `extract-rules` mode (retrospective mining)

Activated by `extract-rules` mode. Does not scan code/docs for patterns; instead mines retrospective files for rule candidates.

1. **Enumerate retro sources:**
   - `docs/rebuild/LESSONS.md`
   - `docs/sprint-artifacts/**/*retro*.md`
   - `docs/sprint-artifacts/**/POSTMORTEM*.md`
   - `docs/**/DEBRIEF*.md` / `docs/**/PAIN*.md`
   - Project root: `LESSONS.md`, `POSTMORTEM.md`, `RETRO.md`

2. **For each retro file, extract rule candidates:**
   - Look for "Root cause:" sections → one candidate per section.
   - Look for "Attempted Fixes:" / "What we tried:" lists → convert failed fixes into anti-pattern warnings.
   - Look for numbered rules (R1, R2, …; §4 …) if Gastify-shape — import verbatim.
   - Look for "Why it failed" / "Mistake" sections → one candidate per.

3. **De-duplicate against existing RULES.md** — by stable-ID; skip candidates whose hash matches an existing R-NN.

4. **Interactive promotion:**
   ```
   Candidate rule #<N>:
     Source: docs/sprint-artifacts/epic-14c-retro-2026-01-20.md §1 "Deletion Detection"
     Proposed R-NN entry:
       **Evidence:** epic-14c-retro §1 (multi-user sync lost untag events)
       **Rule:** Every syncable entity has a `deleted_at` tombstone field; delta sync carries tombstones.
       **Detection:** entity schema audit + CI integration test per synced entity.
       **Applies to:** <phases that bind multi-user sync>
       **Status:** active
       **Sources:** gabe-debt extract-rules <date>

     Action: (y) accept  (n) reject  (e) edit before accepting  (q) quit
   ```

5. **Write accepted candidates** to RULES.md with stable IDs. Update SCOPE.md §15 Change Log with entry `type: debt-scan, summary: "Extracted N rule(s) from <retro file>"`.

---

## Output Format — `brief` mode

```
GABE DEBT — <project name>
Tier: <mvp|enterprise|scale>
Scanned: <doc-paths, code-paths, commits-since-ref>

Findings: <N total> · <X CRITICAL / Y HIGH / Z MEDIUM> · <confident A | uncertain B | weak C>

┌─────┬────────────┬──────────────────────────────────┬───────────────┬──────────┬──────────────────────────┐
│  #  │  Severity  │           Pattern                │    Status     │Confidence│  Primary evidence        │
├─────┼────────────┼──────────────────────────────────┼───────────────┼──────────┼──────────────────────────┤
│  1  │  CRITICAL  │  P3 async-listener-race          │ missing       │ confident│ src/hooks/useTxn.ts:84   │
│  2  │  HIGH      │  P6 deletion-detection-in-sync   │ implicit      │ weak     │ entities.ts, no tombstone│
│  …  │  …         │  …                               │ …             │ …        │ …                        │
└─────┴────────────┴──────────────────────────────────┴───────────────┴──────────┴──────────────────────────┘

Rule-violation findings: <N>
  → <rule> R<m> (LESSONS.md): <what's violating>

Suggested next steps:
  → /gabe-debt  (full triage)
  → /gabe-debt dry-run  (preview writes)
  → /gabe-debt pattern=P3  (drill into one pattern)
```

---

## Output Format — `audit-rules` mode

```
GABE DEBT — Rule audit — <project name>

Rules loaded:
  RULES.md         : R1..R<N> (<date of last update>)
  LESSONS.md (ref) : R1..R<M> (<project-local, imported>)

Violations:
  R3 (file-size limit, LESSONS.md §4 R3)
    src/App.tsx: 845 LOC (> 800 hard block)
    → /gabe-review src/App.tsx for split guidance

  R5 (SSE + pull fallback, LESSONS.md §4 R5)
    src/hooks/useTxnStream.ts:84 — no pull fallback
    → Open ADR or check R5 detection guidance

Compliance:
  R1, R2, R4, R6..R<N> — no violations detected in scanned paths.

No new rules extracted (use `extract-rules` mode).
```

---

## Output Format — `dry-run` mode

Shows proposed writes as unified diffs without applying them. Example excerpt:

```diff
--- .kdbp/DECISIONS.md
+++ .kdbp/DECISIONS.md (proposed)
@@ -12,3 +12,4 @@
 | D3 | 2026-04-20 | … | … | … | active | … |
+| D4 | 2026-04-24 | Async result delivery uses dual paths (SSE + pull fallback) | Gastify LESSONS R5: push-only delivery fails under listener races | Push-only with reconnect (rejected); pull-only with interval (rejected) | proposed | Revisit when we have >10k connected users |
 <!-- gabe-debt-stable-id: a3f9b1c7 -->

--- .kdbp/RULES.md
+++ .kdbp/RULES.md (proposed)
@@ -14,1 +14,20 @@

+### R2 — async-listener-race-dual-delivery {#r2}
+**Evidence:** Gastify LESSONS §4 R5; src/hooks/useTxnStream.ts:84 (opens listener after server-write await)
+**Rule:** Every server-pushed async result has a pull-fallback endpoint. UI triggers pull on: initial subscription, reconnect, tab visibility regain.
+**Detection:** integration test that disables push and asserts UI still sees result via pull.
+**Applies to:** B4, I3
+**Status:** active
+**Sources:** gabe-debt extract-rules 2026-04-24
+<!-- gabe-debt-stable-id: a3f9b1c7 -->

--- .kdbp/SCOPE.md
+++ .kdbp/SCOPE.md (proposed)
@@ -167,2 +167,4 @@
 | <YYYY-MM-DD> | init | Initial scope authored via `/gabe-scope`. |
+| 2026-04-24 | debt-scan | Added 1 OQ-NN + 2 R-NN + 1 ADR stub via /gabe-debt. Patterns: P3, P8. |

No changes written. Re-run without `dry-run` to apply.
```

---

## Integration with other Gabe skills

- **`/gabe-review`** — loads `.kdbp/RULES.md` as severity-escalation input. A review finding on a file/line that violates an R-rule auto-escalates to CRITICAL with citation ("violates R3 from RULES.md"). Cross-reference added to `gabe-review/SKILL.md` Step 2 (finding severity rubric).
- **`/gabe-align`** — alignment checkpoint reads RULES.md. An `audit-rules` pass runs as part of the alignment check: unresolved CRITICAL rule-violations block a pre-commit alignment (in strict mode) or emit CONCERN in standard mode.
- **`/gabe-plan`** — after planning a phase, suggest `/gabe-debt audit-rules` to verify the phase doesn't violate existing rules.
- **`/gabe-scope`** — after scope additions/pivots, suggest `/gabe-debt` to surface new CRITICAL gaps introduced by the change.
- **`/gabe-roast`** — roast perspectives can cite R-rules in findings (e.g., security perspective cites R9 cross-product infra coupling).
- **`/gabe-arch`** — ADRs generated by `/gabe-debt (d)` action can cross-link to gabe-arch concept IDs in the Alternatives field.
- **`/gabe-teach`** — a teach session for a gravity well (KNOWLEDGE.md entry) can surface R-rules that apply to that well as "already-paid lessons."

---

## Maturity Gating

Reads `maturity:` from `.kdbp/BEHAVIOR.md`:

| Maturity | Scan depth | Severity floor |
|---|---|---|
| **MVP** | Surfaces CRITICAL only. Load-bearing patterns (P3, P6, P9) always run. | CRITICAL |
| **Enterprise** | CRITICAL + HIGH. All patterns run. Triangulation required for non-rule-violation findings. | HIGH |
| **Scale** | CRITICAL + HIGH + MEDIUM. All patterns run. Weak-signal findings included. | MEDIUM |

Load-bearing rules (from RULES.md / LESSONS.md) always surface regardless of tier. Rule-violation status overrides tier filtering.

Override: `--full` flag surfaces all findings regardless of tier. Useful for quarterly audits or milestone retrospectives.

---

## Known limitations (v1)

- **Pattern heuristics are grep-level, not AST-level.** Code-pass detection has false positives; weak-signal findings are marked but may still require human dismissal via `(s)`.
- **Stable-ID collisions** can occur if two findings hash identically but represent different decisions. If detected (checksum clash), append a disambiguating suffix and warn in the summary.
- **Retrospective parsing** assumes Gastify-shape or BoletApp-shape retros (§Root cause, §Attempted Fixes). Other retro formats may miss rule candidates — propose manually adding to RULES.md.
- **No AST-level concurrency detection.** P7 (multi-op state staleness) has the noisiest false-positive rate; prefer `audit-rules` mode for this pattern once a rule is codified.
- **Cross-project comparison** not supported (would require `gabe-debt compare <project>`; out of v1 scope).

---

## Cross-references

- Plan that designed this skill: `~/.claude/plans/peppy-drifting-flame.md`
- Gastify LESSONS (reference for RULES.md format): `/home/khujta/projects/apps/gastify/docs/rebuild/LESSONS.md`
- BoletApp Epic 14c retro (P6/P7/P8/P10/P11 source): `/home/khujta/projects/bmad/boletapp/docs/sprint-artifacts/epic-14c-retro-2026-01-20.md`
- Pattern catalog root: `~/.claude/templates/gabe/debt-patterns/`
- Skill: `~/.claude/skills/gabe-debt/SKILL.md` (+ `references/debt-spec.md`)
