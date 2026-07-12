# Deliverable 6 — Sequenced Change Plan (smallest first)

- **Produced:** 2026-07-08, Fable 5 analysis run. **Nothing here has been executed** — this run was analyze+plan only (§2A.6). Every step is operator-approved-then-implemented in a later pass.
- All top recommendations below survived (or were killed by) an adversarial pass — one hostile Fable skeptic per proposal, arguing the opposite. Verdicts and the modifications they forced are folded in.

## Wave 0 — Immediate, small, high-leverage (each ≤ an hour of implementation)

**0.1 Reconcile the three suites — ✅ EXECUTED 2026-07-09** (commit `650d0eb` on branch `chore/reconcile-hardening-pass`, awaiting operator merge+push). Hardening captured verbatim into the repo (40 files, +1,072/−256, incl. gabe-review/references/ + templates/hooks.json); `scripts/suite-doctor.sh` added; both homes reinstalled ("41/41 components"); **suite-doctor: CLEAN** — repo, `~/.claude`, `~/.agents` three-way identical; gabe-docsite installed for the first time; Codex now runs the hardened suite. Evidence: [impl/0.1-reconcile-log.md](impl/0.1-reconcile-log.md). Original step spec below:

*(original)* **Reconcile the three suites (the drift fix). Do this before anything else.**
`~/.claude` (hardened 2026-07-02/03), `~/.agents` (frozen 2026-07-01), and the repo (stalest for behavior, newest for docs) are three different suites. A naive `install.sh` re-run would **destroy** the hardening.
- Commit the hardening pass home: diff `~/.claude/{skills,commands}/gabe-*` → repo (`~/.claude/gabe-hardening/APPLY-STATUS.md` is the authoritative ledger of the 47 proposals + E1–E7 rollout, including the 4 deliberately-reverted files); bring `gabe-review/references/{codex-bridge,merge-mode,post-review}.md` and `templates/gabe/hooks.json` into the repo; then re-run `./install.sh` to **both** homes (also fixes: `gabe-docsite` never installed, stale doc trees, stale README counts).
- Add a **drift check**: a ~20-line script (`suite-doctor`) hashing repo vs `~/.claude` vs `~/.agents` per file, runnable via `/gabe-help` or CI. The standing rule it enforces: *suite changes land in the repo first; installs are always regenerable.*
- Anti-goal note: this converts the "endless patching" feeling into a normal git workflow — the patches were fine; the surface was wrong.

**0.2 Give gastify its missing manifest layer (twin report T3/T4/T6).**
Create `.kdbp/RULES.md` seeded from its own paid-for lessons (icon scale = gustify family, read-legacy-first with BoletApp path, adopt-don't-recreate, runtime-separation mirror of gustify R11); a screen→canonical-reference map (WEB-MIGRATION.md is 80 % of it); a CLAUDE.md project preamble + the one-line UI-reuse hard rule that measurably worked in gustify (2026-06-30); fix README (React 18/ladle/P5 → reality).

**0.3 NEXT-pointer as output contract (routing, skeptic-modified R-F).**
No free-floating suggestions (the operator's own global rules ban proactive offers — the skeptic caught this). Instead: (a) each lifecycle command's terminal output **contract** ends with the single next command (`gabe-commit` → `/gabe-push`, `gabe-plan` → `/gabe-execute`, extending the pattern gabe-execute already has); (b) one **Stop hook** that fires only on "working tree dirty AND no commit this session", printing `next: /gabe-commit` once. Deterministic, zero model memory. Do **not** grow `/gabe-next`.

**0.4 Small hygiene batch.** Compress `gabe-myopic`'s 1,060-char description to ~200 (21 % of the suite's always-loaded surface); delete gastify's dead gustify-shaped `.gitignore` lines; run gustify's R4 spike-archive sweep (20 active spike stories vs the rule's zero-invariant); record the port table (T10) and de-collide gastify's vite port; refresh gastify `MOBILE.md`'s stale resume header.

**0.5a Measurement pass — ✅ EXECUTED 2026-07-09; verdict in [deliverable 10](10-code-audit-simplify-verdict.md).**
Outcome: gustify **material-accumulated-complexity** (4 true-monoliths incl. the 72-commits/90d filter panel; 3 verified duplications; ~9.9K dead archived lines), gastify **moderate-localized** (2 true-monoliths; rest generated/dead-tree/cohesive). **`/gabe-simplify` resolved: goes as a tiered gate inside gabe-commit** (deterministic size-budget WARN + evidence-triggered quality-only simplify pass; zero new always-loaded surface in the B2 end state); the standalone wrapper stays dead with a Wave-2 re-open trigger. One-time cleanup backlog (splits, duplicate extraction, dead-surface deletion) → PENDING.md at implementation time. Original step spec below for the record:

*(original)* **Measurement pass: code supply-side + doc sprawl (operator-requested 2026-07-08; decides `/gabe-simplify`).**
The skeptic killed `/gabe-simplify` on demand-side evidence (zero human asks). The operator wants one more information-gathering round before the call is final — and the right data is **supply-side: the actual state of the code**, which this investigation never audited. Concretely: dogfood the suite's own shelf-ware — run `/gabe-health` (god files, churn hotspots, coupling) and `/gabe-debt` on both twins, plus a simplification-focused sweep (dead code, duplication, files vs the projects' own 500-soft/800-hard line rule, feature-locality per Anthropic's "all the modifiable code for a feature in one place" guidance). Seed numbers already measured this run:
- **God files violating the projects' own declared discipline:** gustify `ProfileScreens.tsx` 3,805 lines, `RecipeFilterPanel.tsx` 2,881, `RecipeDetailScreen.tsx` 2,534, `CookingScreenModel.ts` 2,460 (rule: 800 hard cap, per gustify CLAUDE.md); gastify `prompt_lab/statement/report.py` 3,214, `fallback_calibration.py` 2,348. (Generated `api-types` files excluded.)
- **Change locality (files touched per `feat` commit, last 60 commits):** median 7, p90 16–18, max 28 — identical across twins; note 2–4 of those files are `.kdbp` bookkeeping (a per-commit suite overhead worth pricing).
- **Decision rule:** if the audit confirms material accumulated complexity, `/gabe-simplify` (or a simplify tier inside `gabe-commit`) is re-opened WITH evidence; if not, the kill stands. Either way the god files above go to `PENDING.md`/`RULES.md` as split candidates.

**0.5b Documentation diet (operator-requested 2026-07-08; design with 1.4, enforce via docs-audit).**
Measured sprawl: **247 md docs under `docs/` (gustify 132 + gastify 115) + 144 `.kdbp` md files, with 80 new md files created in the last 30 days** — versus a human reading budget of "a couple of documents." The operator's pivot to HTML is the right instinct and is now a convention:
- **Markdown = the agent-facing record.** Few, living, augmented in place. A new md file is allowed only for a genuinely NEW topic — never for a new change, iteration, or date (the Evidence Doctrine's no-dated-throwaways rule, extended to docs).
- **HTML = the human-facing layer.** Rendered with diagrams/memes/visuals per the docsite convention (C1–C9, see `site/convention.html`) — human reading context is the scarce resource; optimize for it.
- **A per-project doc hub/ledger** (C9 at project level) tracks the inventory: every human-facing doc registered with its source md; orphans flagged. The hub is the human's only required entry point.
- **Enforcement:** `gabe-commit docs-audit` gains a deterministic check — a new md file outside the allowed homes (KDBP, the topic registry) triggers a warn: "augment the existing topic doc instead." WARN-first, same staging as the evidence hooks.

**0.5c Orchestration restraint rule (one line, judgment-altitude).** From the Anthropic-convention gap check (FINDINGS §Anthropic gap): multi-agent fan-out is measurably strong for *verification* (adversarial passes caught real defects) and measurably weak for *taste generation* — delegated design panels amplified wrong premises instead of challenging them (incidents #138 five spike rounds via workflows, #151 over-built banner from a design panel, #156 workflow shipped its internal critique logs, #43 unjudgeable abstract spike). Encode one line in the suite conventions + project CLAUDE.md: *"Before any multi-agent design/mockup fan-out, run the premise past the human with ONE cheap single-agent spike. Orchestrate to verify, not to generate taste."* No machinery — a rule with a named smell.

## Wave 1 — Design-then-build (one spec pass each, operator-gated)

**1.1 Mockup manifest + skill split by KIND (Deliverables 3 §4 + skeptic mods).**
One-page per-project manifest (bindings only: tool, roots, ports, screen-map path, reuse roots, verify commands, lift kind, capture tool, reference projects, legacy posture). The global gabe-mockup keeps every *generalized* lesson — P7 rewritten project-neutrally (safe-area-formula, "add the live mode, don't restyle", default-off shared-chrome props, "verify live not showcase") — and sheds the gustify *bindings* (named sheets, D-ids, hardcoded `apps/web` commands) into gustify's RULES.md/DESIGN.md. Freeform file, **not** a validated schema (defer schema-hood until project n=3, per skeptic). Give the manifest a second consumer immediately (gabe-execute reads `verify_commands`; gabe-commit reads `proof_root`) so it's load-bearing, plus a trivial existence-check (paths named must exist) against staleness.

**1.2 Lift SOP + dispatch (Deliverable 3 §3/§5 + skeptic mods).**
Encode L0–L4 as the react-story/refine backbone. The skeptic's decisive point: *content alone won't fix a skill that isn't loaded* — so ship the dispatch layer with it: widened trigger description (ad-hoc UI phrasing), the project CLAUDE.md hard rule (the one layer with measured effect), and optionally the manifest-scoped PreToolUse warn-hook on component-glob writes without a reference Read. Soften R0 from STOP-and-ask to **declare-and-append** (unmapped screen → print `NEW (searched …)` + auto-append to the screen map, so the map self-updates instead of rotting).

**1.3 Evidence Doctrine rollout (Deliverable 4, skeptic-staged).**
(a) `proof:` field per phase at plan time (human-confirmed, machine-readable); (b) living-set convention — committed manifests, `.gitignore` un-ignore carve-out, curated screenshot subset (gastify reduces from 248, gustify adopts); (c) gabe-commit deterministic **WARN-and-LOG** freshness check (artifact mtime > newest staged change) for proof-carrying work, 2–4 weeks, then promote to Default-FAIL only where the log shows ignored warnings, only on the commit chokepoint; (d) fresh-context evaluator agent piloted on `proof: visual|journey` phases; (e) evaluate **pagecast** as the `capture:` manifest value (Playwright-video+ffmpeg is the zero-dep baseline that ships first). All hook artifacts land in repo+install.sh in the same change (rule 0.1).

**1.4 De-duplication via suite-owned conventions (skeptic-modified R-I).**
Never point suite files at the user's private `~/.claude/rules` (dangling on Codex/other machines). Instead: shared prose (rendering convention, commit-type list, coverage ladder rationale) moves to one suite-owned file shipped to both homes; each command keeps a one-line local statement + pointer. Rename gabe-review's "80 %" to *finding-confidence ≥ 80 %* to end the collision with the coverage-80 % rule. Leave the model-routing tables alone (task routing, not duplication).

## Structural fork decisions — **DECIDED 2026-07-09**

The operator took the recommended option on all three forks ([analysis: deliverable 8](08-structural-alternatives.md)): **A2 KDBP-lite** (~24 files → ~11 keepers; git becomes the ledger; PLAN gets a JSON mirror) · **B2 skills-only** (one skill per capability with `references/`; native `when_to_use`/`paths` dispatch; skill-scoped hooks; commands/ + wrapper-shims retire) · **C recommendation** (`context: fork` satellites, /loop for CI babysitting, 0.5c restraint). The implementation-ready migration map — per-capability skill table, per-file disposition table, verification gates, rollback — is **[deliverable 9](09-fork-migration-plan.md)**. **Revised master sequence: 0.1 reconcile → B2 → A2 → rest of Wave 1** (the forks absorb 1.1, 1.2, 1.4 and repackage 1.3's hooks — see deliverable 9's interaction table). Implementation starts on the operator's go.

## Wave 2 — Re-measure, then decide

- **Shelf-ware calls** (operator decisions, priced in Deliverable 2): gabe-align/assess/debt/health consolidation or retirement; gabe-teach's 2,504-line engine → gabe-arch skill with a lean wrapper; commands-as-specs convention made explicit either way.
- **Promote or retire the warn-hooks** based on the bypass log (1.3c).
- **Re-run this mining** (the extraction pipeline is reusable: digests + reader prompt + clustering) after ~6 weeks of the above; decision #3 says thresholds come from measurement — measure the deltas.

## Explicitly NOT doing (and why)

| Rejected | Why | Re-open trigger |
|---|---|---|
| **`/gabe-simplify` standalone wrapper** | **RESOLVED 2026-07-09 by the 0.5a audit ([deliverable 10](10-code-audit-simplify-verdict.md)):** the capability **goes** — as a **tiered gate inside gabe-commit** (deterministic >800-line size-budget WARN + evidence-triggered quality-only simplify pass), the operator's own alternative form. The *standalone always-loaded wrapper* stays dead: demand-side evidence is still zero and gastify is only moderate | Wave-2 re-measure: if the tier fires constantly, promote to its own lane — with usage numbers |
| **Full auto-routing / growing `/gabe-next`** | Router reads only PLAN cells; measured work is ~50 % ad-hoc; would be re-parameterized constantly (anti-goal B). The 0.3 contract line covers the real gap | NEXT-line adoption fails and manual-routing incidents persist |
| **Encoding taste corrections below the detectability line** (P16, ~40 incidents) | The variation is in per-instance reasoning. **Skeptic-refined graduation rule:** encode immediately at n=1 *iff* the correction can be stated as one RULES.md row with a runnable `Detection:` command and zero false positives (the R10/layout-oracle route); otherwise one-line taste-log; a second same-shape recurrence forces encode-or-tag-unencodable. Requires 0.2 (gastify RULES.md) so the path exists on both twins | — (the rule itself handles graduation) |
| **Parallel-session locking machinery** | n=6 incidents; worktrees already exist; encode only a "files-in-flight" line in HANDOFF.md | collision incidents grow |
| **Manifest as validated schema** | n=2 projects; schema-hood is over-generalizing (anti-goal B) | third project onboards (chiless/archie per §8) |
| **Unifying twin repo layouts (T1/T2)** | High cost, zero re-instruction payoff once manifests declare the difference | operator product decision |
| **Committing all evidence / force-adds** | Repo bloat; curated-subset + committed-manifests achieves the Doctrine (skeptic-reduced R-G) | — |
