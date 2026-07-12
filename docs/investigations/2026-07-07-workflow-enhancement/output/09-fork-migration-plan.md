# Deliverable 9 — Fork Migration Plan (A2 + B2 + C, as decided)

- **Decided:** 2026-07-09 by the operator — Fork A → **A2 KDBP-lite**, Fork B → **B2 skills-only**, Fork C → **recommendation** (fork-context satellites, /loop for mechanical babysitting, 0.5c restraint).
- **Status:** implementation-ready plan. **Nothing here has been executed** — this investigation remains analyze+plan (§2A.6); the implementation pass runs on the operator's go.
- **Master sequence:** `0.1 reconcile` → `B2` (suite shape) → `A2` (per-project state) → remaining Wave 1 lands on the new structure. Wave 0 steps 0.2–0.5 proceed in parallel where independent.

---

## Phase B2 — Skills-only migration (suite repo, then install)

**Precondition:** 0.1 complete (hardened `~/.claude` content committed to the repo; three surfaces reconciled). Migrating before reconciliation would migrate the stale copies.

### B2.1 — Target shape per capability

One skill per capability: `skills/<name>/SKILL.md` (lean core, ≤200 lines) + `references/` (the deep spec, loaded on demand) + optional `scripts/`. Slash invocation survives automatically (skill name ⇒ `/name`). The `commands/` directory and the 6 wrapper-shim skills retire.

| Capability | SKILL.md core (≤200 ln) | `references/` gets | Key frontmatter |
|---|---|---|---|
| gabe-commit | gate summary, check list, output contract, NEXT pointer | the 757-line gate spec (checks detail, docs-audit mode, commit-format) + the **simplify tier** (0.5a verdict, deliverable 10): quality-only parallel-agent pass, run when triggered | `when_to_use`: "commit, save, ship this work, checkpoint, quality gate before committing"; `hooks:`/`scripts:` evidence-freshness WARN check (plan 1.3c) + **size-budget check** — touched file >800 first-party lines (or newly crossing) → WARN with split seams; generated files exempt |
| gabe-push | env flow summary, promotion rules, NEXT pointer | 526-line spec (CI watch, promotion, drift) | `when_to_use`: "push, PR, deploy, promote, watch CI"; add /loop runbook line for CI babysitting (Fork C) |
| gabe-plan | lifecycle + tier-decision summary | 767-line spec + tier flow; **new:** writes the `PLAN.json` mirror (A2) incl. per-phase `proof:` field | `when_to_use`: "plan, phases, KDBP plan, tier decision, break down this goal" |
| gabe-execute | phase-exec contract, checkpoint cadence, evidence-task rule | 506-line spec (dispatch matrix, tier caps, runtime-journey evidence) | `when_to_use` covers "implement the phase / continue the plan" |
| gabe-mockup | **the lift SOP L0–L4** + medium=platform rule + manifest read | split the 802-line monolith: `react-story.md`, `refine.md`, `legacy-html-phases.md`, `validate.md`, `spike.md` | `when_to_use`: ad-hoc phrasing ("spike, mockup, screen, UI component, port from design-lab/storybook…"); **`paths:` `["**/*.stories.tsx", "**/design-system/**", "**/spikes/**", "**/design-lab/**", "docs/mockups/**"]`** — the Thread-4 auto-trigger, native |
| gabe-review | risk-pricing summary + triage contract | the 1,294-line spec + the hardened `references/{codex-bridge,merge-mode,post-review}.md` (already exist in the install — come home via 0.1) | `when_to_use`: "review this diff/PR/phase" |
| gabe-next | thin router note | — | **post-A2 hardening:** replace prose state-machine with `scripts/next.mjs` reading `PLAN.json` (deterministic, zero-token — honors the command's own "no LLM" intent); until then 1:1 |
| gabe-handoff | already the cleanest artifact | keep structure; core is fine | `when_to_use`: "hand off, wrap up, resume prompt, context is heavy" |
| gabe-init | scaffolder summary | template inventory + hooks wiring (ships `hooks.json` — comes home via 0.1); **update templates for A2 inventory** | `disable-model-invocation: true` (human-initiated only) |
| gabe-scope / -change / -addition / -pivot | 1:1 migration, specs → references/ | prompt library pointers | `disable-model-invocation: true` on **-pivot** (destructive archive+rewrite); drop the `refrepos/` personal path (altitude fix) |
| gabe-teach | thin core | the 2,504-line engine → `references/` (interim); Wave-2 decision on folding into gabe-arch stands | `when_to_use` honest about its 2-uses reality |
| gabe-align / -assess / -debt / -health / -roast / -myopic | 1:1 migration, lean cores | spec bodies | **Fork C:** `context: fork` (+ read-only `agent` for health/debt/roast analysis runs); still Wave-2 consolidation candidates |
| gabe-lens / -docs / -docsite / -arch / -help | 1:1 migration | docsite generator unchanged; gabe-help gains the P14 tool registry | gabe-docs/-arch: `user-invocable: false` candidates (background knowledge) |

### B2.2 — Cross-cutting migration rules

1. **E1–E7 stated once** (absorbs 1.4): one suite-owned `skills/gabe-conventions/` reference file (or `gabe-docs/references/execution-contract.md`); every SKILL.md carries a one-line pointer, not the 12-line paste. Kills the 38-file duplication at migration time instead of as a separate pass.
2. **Every `when_to_use` is a trigger sentence** (≤1,536 chars combined with description) — written from the incident evidence of what phrasing *actually* precedes the work (F10 dispatch fix, absorbed from 1.2).
3. **Codex parity:** bodies stay host-portable; Claude-specific frontmatter (`paths`, `hooks`, `context: fork`) must degrade gracefully — Codex reads the same SKILL.md body from `~/.agents/skills/`. Verify with one Codex smoke run before deleting `commands/`.
4. **install.sh:** ships `skills/` only (drop the commands/ + wrapper-skill copying); adds the `suite-doctor` drift check (0.1).
5. **Deletion is the last step:** `commands/*.md` and the 6 wrapper skills are removed only after a full lifecycle dry-run (plan → execute → review → commit → push on a test phase) passes via skills alone, in both harnesses.

**Estimated effort:** the content already exists; this is mechanical re-homing + frontmatter authoring. One focused session for the migration, one for the dual-harness dry-run.

---

## Phase A2 — KDBP-lite (per project: gustify, then gastify)

**Precondition:** B2 done (the skills that *write* these files must ship the new write-paths in the same change, or the files regrow).

### A2.1 — File disposition table

| File | Disposition | Action |
|---|---|---|
| `PLAN.md` | **KEEP, slimmed** | state table + phase details only; narrative prose stripped to commits/HANDOFF. **NEW sibling `PLAN.json`** — machine mirror (phases, cells, tier, `proof:` field), written by gabe-plan/auto-tick, read by hooks + the future `next.mjs`. JSON chosen per the official "resists agent modification" rationale |
| `PENDING.md` | **KEEP** | unchanged (earning) |
| `DECISIONS.md` | **KEEP** | rotate resolved/superseded entries ≥60 days to `archive/DECISIONS-2026H1.md`; live file stays under ~300 lines |
| `RULES.md` | **KEEP** | gustify unchanged; gastify **created** (0.2, seeded from its paid-for lessons) |
| `HANDOFF.md` | **KEEP** | unchanged — it already is the official progress-file pattern |
| `PUSH.md` + `DEPLOYMENTS.md` | **KEEP** | unchanged (feed the 43×-used gate) |
| `STRUCTURE.md` | **KEEP** | actively maintained, read by CHECK 9 + drift hook |
| `BEHAVIOR.md` | **KEEP, grows** | becomes the manifest host: the 1.1 `mockup:` bindings block + `critical_paths`/`proof_root` (Deliverables 3–4) live here instead of a new file |
| `SCOPE.md` + `scope-references.yaml` | **KEEP** | low-inertia by design; untouched |
| `VALUES.md` | **KEEP** | small, read by align/plan |
| `LEDGER.md` | **SHED** | current file → `archive/LEDGER-2026H1.md`. New format: **thin session index** — one line per session/checkpoint (date · theme · commit shas · gate results). The per-tool-call tail is dropped and its PostToolUse append-hook removed — git commits (rich messages via gabe-commit) + transcripts already hold that record |
| `DOCS.md` | **KEEP (gustify) / RETIRE (gastify)** | gustify's drift map feeds CHECK 7; fold into the 0.5b doc-registry when that lands. gastify's is empty since init — retire |
| `ROADMAP.md` | **RETIRE** | pending arc folds into a `## Phases` section of SCOPE.md (or PLAN header); file → `archive/retired/` |
| `KNOWLEDGE.md` | **RETIRE** | → `archive/retired/`; gabe-teach's Wave-2 decision governs any successor |
| `ENTITIES.md`, `MAINTENANCE.md`, `MOCKUP-VALIDATION.md`, `DEVIATIONS.md` | **RETIRE** | → `archive/retired/` (code/CI are the living truth for each) |
| One-shots (`W7-BLUEPRINT.md`, `AUDIT-…`, `PLAN-MOCKUPS.md` if complete) | **ARCHIVE** | → the dated `docs/investigations/`-style pattern or `archive/` |

Net: **~24 files → ~11 keepers** (7 hot + 4 low-inertia), one new JSON mirror. Suite-side writes updated in the same change: gabe-commit/plan/execute/handoff write-paths, session-start awareness hooks, `templates/` for gabe-init, and the retired files' references removed from all skill bodies.

### A2.2 — Order and verification

1. gustify first (richer state = harder case), gastify second (plus its 0.2 additions).
2. Verification per project: one full lifecycle cycle (plan → execute one small task → review → commit → push) runs green on the new inventory; `suite-doctor` passes; a fresh session resumes correctly from HANDOFF + PLAN.json alone.
3. Rollback: everything moves to `archive/`, nothing is deleted — reverting is `git mv` back.

---

## Phase C — already absorbed

- `context: fork` + read-only agents on the satellites → **rides inside B2** (frontmatter, zero extra work).
- CI-babysitting via `/loop` → one runbook line in each project's `PUSH.md` (A2 touches the file anyway). Boris's caveat preserved: auto-mode only where the 1.3 verification is in place.
- 0.5c restraint line → goes into the shared conventions reference (B2.2 rule 1) + gabe-init's CLAUDE.md template.

## Interaction with the remaining plan

| Existing step | Effect of the forks |
|---|---|
| 0.1 reconcile | unchanged, still first — now also the B2 precondition |
| 0.2 gastify layer | unchanged; RULES.md it creates is an A2 keeper |
| 0.3 NEXT contract | folds into B2 output contracts; the Stop hook ships as-is |
| 0.4 hygiene | description compression happens naturally during B2 `when_to_use` authoring |
| 0.5a/b/c | unchanged (0.5a still decides the deferred `/gabe-simplify`) |
| 1.1 manifest | **absorbed**: bindings live in BEHAVIOR.md (A2.1); global skill reads them (B2 gabe-mockup core) |
| 1.2 lift SOP + dispatch | **absorbed** into B2 (gabe-mockup core + `paths`/`when_to_use`) |
| 1.3 Evidence Doctrine | hooks ship skill-scoped (B2); `proof:` field lives in PLAN.json (A2); rest unchanged |
| 1.4 de-dup | **absorbed** into B2.2 rule 1 |
| Wave 2 | unchanged: re-measure after the new structure has run for ~6 weeks |
