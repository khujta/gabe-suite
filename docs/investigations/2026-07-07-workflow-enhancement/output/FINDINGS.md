# FINDINGS — Gabe Suite Workflow-Enhancement Investigation

- **Run:** 2026-07-08, Fable 5 (`claude-fable-5`), per `KICKSTART.md` / `BRIEF.md` in this folder.
- **Scope honored:** analyze + plan only (§2A.6). No suite, project, or `~/.claude` file was modified; all writes are in this `output/` folder.
- **Evidence base:** all 36 usable sessions mined in full (gustify 21 after removing one byte-identical fork `17c4c351`≡`ef595a24`; gastify 14; gabe-lens 1 prep session; this run's own session excluded). 2.5 GB of transcripts digested → 52 chunks → one Sonnet reader each (56 agents total incl. 4 repo/suite scanners, 0 failures) → **248 re-instruction incidents**, 279 Thread-4 episodes, 339 proof-practice observations → Fable clustering/classification → **8 hostile Fable skeptics** adversarially verified the top recommendations (7 survived with modifications, 1 died). Repos, installed state (`~/.claude`, `~/.agents`), and `anthropics/cwc-long-running-agents` read directly.

---

## The answer to the mandate (§1)

> *For each recurring friction, decide the right home — skill, command, hook, manifest, or deliberately-left-as-judgment — such that the operator stops re-instructing without over-generalizing.*

The evidence forces one reframe before the per-pattern homes make sense: **the suite does not have a knowledge problem — it has an enforcement problem, an invocation problem, and a surface problem.** The two biggest incident clusters were *already encoded* when they kept happening:

1. **Enforcement gap.** "Verify before claiming done" exists as E1/E2 prose in all 38 installed files (hardening pass, 2026-07-02/03) — and every Arc-3 incident post-dates it. Prose contracts don't enforce; deterministic checks and gates do. → The Evidence Doctrine's arm is a *staged hook/script* (Deliverable 4), not more instruction text.
2. **Invocation gap.** The rules live in gabe-mockup, which loaded **7 times against ~50 UI episodes**; the router gabe-next loaded **once** against 27 manual-routing incidents. Skills that don't fire on ad-hoc phrasing protect nothing. → Dispatch is a first-class deliverable (Deliverable 3 §5, plan step 1.2).
3. **Surface problem (the "patching" feeling, mechanized).** The operator's improvements are real and frequent — but they landed on the wrong surface: the hardening pass patched `~/.claude` **in place** and never reached the repo (which *documents* the pass its own source lacks) or `~/.agents` (frozen 2026-07-01). **Three divergent suites run under one name**, and a naive `install.sh` re-run would destroy the best one. Lessons also landed asymmetrically: gustify accreted RULES.md / DESIGN.md / screen-map / nested CLAUDE.md; gastify got none of them and re-paid gustify's lessons in July (Arc 3). → Reconcile first (plan step 0.1), then complete the manifest layer on both twins (0.2, 1.1).

With those three fixed, the per-pattern homes are as catalogued in Deliverable 1: **hook/script** for verification claims (P1–P3); **global-skill-shape + per-project-manifest-bindings** for the mockup/reuse pipeline (P4–P6, the §3 heuristic's flagship case — confirmed, with the skeptic's "split by kind, not topic" correction); **manifest rules with detection commands** for project grammar (P11, P13, P5); **skill checklists** for doc conventions (P12); **output contracts + one Stop hook** for routing (P7); **existing gabe-handoff + session-start echo** for continuity (P8); and a **deliberate judgment zone** (P16, ~40 taste corrections) with a detectability-first graduation rule so it shrinks itself over time.

**Both operator suspects resolved:** `gabe-handoff` is correctly suite-global — it is the *only* artifact consistent across repo/`~/.claude`/`~/.agents`. `gabe-teach` (topics) is generalizable in principle but is the suite's heaviest file (2,504 lines) for 2 observed uses and a knowledge map untouched since April — an altitude/investment decision for the operator, not a re-instruction fix.

---

## Headline findings (each with its receipt)

| # | Finding | Receipt |
|---|---------|---------|
| F1 | **Prose doesn't enforce.** The largest cluster (~32 unverified-completion incidents) continued after the E1–E7 rollout | gast `44afa232` (post-hardening: "look for yourself" ×3); catalog P1 |
| F2 | **Skills don't fire on ad-hoc asks.** 7 gabe-mockup loads vs ~50 UI episodes; operator: *"Use the Gabe mockup skill. We ready-tuned that skill a lot"* | gast `88332774`; usage tally in Deliverable 2 |
| F3 | **Three divergent suites.** Hardening pass (47 proposals + E1–E7, ledger at `~/.claude/gabe-hardening/APPLY-STATUS.md`) never committed; `~/.agents` frozen; repo docs narrate diffs the repo source lacks; `gabe-docsite` in `install.sh` but installed nowhere | installed-state scan; suite-inventory scan §4 |
| F4 | **The suite's real backbone is 3 commands** — commit (60), push (43), plan (15) ≈ 80 % of observed use; ~10 commands at zero | skill-load tally, all digests |
| F5 | **The manifest layer already exists on one twin** and measurably works: gustify's post-2026-06-30 CLAUDE.md reuse rule ends its P4 recurrences; gastify, lacking the layer, re-pays the same lessons in July | gust `96070dd4`/`c0caef68` vs gast `54614bed`/`44afa232`; Deliverable 3 §1 |
| F6 | **The twins' opposite legacy rules prove manifest altitude.** gustify: *never* import legacy (CI-enforced); gastify: *read legacy first* (8 incidents from skipping it). Same slot, opposite values — unencodable at suite level by construction | twin report T8 |
| F7 | **The Evidence Doctrine is 60 % built.** gabe-execute already classifies runtime-journey evidence; gustify has the recorded 3-viewport layout harness; gastify already commits feature-named proof. What's missing: the plan-time importance field, the freshness check, the living-set convention, capture tooling | Deliverable 4 |
| F8 | **Meta-work leaks into project sessions** (Thread-1 confirmation): a suite-change spec lives in gustify (`docs/rebuild/ux/GABE-MOCKUP-COMMAND-UPDATE.md`); suite lessons were paid for inside app sessions and hand-carried out | gustify repo scan; gust `c0caef68` #190 |
| F9 | **Always-loaded surface is measurable and lopsided:** 5,075 chars of skill descriptions, 21 % in gabe-myopic alone | suite-inventory scan §5 |
| F10 | **Anthropic-convention gap check** (vs `anthropics/skills` spec, cwc, the four talks): the suite over-invests in *instruction* surface and under-invests in *enforcement* surface. Specifics: descriptions describe *what*, not *when* (dispatch misses); E1–E7 duplicated into 38 files where the convention states a shared contract once; ~38 live hooks are awareness/log — zero hard evidence gates (the one blocking hook is `block-no-verify`); `/gabe-next`'s "zero-LLM state machine" is executed *by* an LLM reading prose; monolithic SKILL.md files vs progressive disclosure (the hardened install invented `gabe-review/references/` — the right move, never committed). Orchestration: strong for verification, measurably counter-productive for taste generation (incidents #43, #138, #151, #156) → plan step 0.5c. Where the suite is **ahead** of convention: the `.kdbp/` durable-state layer (richer than cwc's PROGRESS.md), gabe-handoff, risk-priced review | hooks.json + `~/.claude/settings.json` inspection; incidents #43/#138/#151/#156; external-skills-scan |
| F11 | **Doc sprawl measured; code never audited** (operator review round, 2026-07-08): 247 md docs under `docs/` across the twins + 144 `.kdbp` md files; **80 new md files in 30 days** vs a human reading budget of "a couple." Code supply-side seed metrics: first-party god files at 3–7× the projects' own 800-line cap (gustify `ProfileScreens.tsx` 3,805; gastify `report.py` 3,214); feature-commit locality median 7 files (2–4 = `.kdbp` bookkeeping), p90 16–18. → plan 0.5a (code audit; decides the **deferred** `/gabe-simplify`) + 0.5b (documentation diet: md = agent record, HTML = human layer, hub ledger, new-file-only-for-new-topic) | `find`/`git log` measurements 2026-07-08; gustify CLAUDE.md file-size rule |

## Thread ranking (full reasoning in Deliverable 5)

**3 (evidence/proof, ~55 incidents, no improvement trend) > 4 (Storybook→React, ~35–40 incidents, highest cost-per-incident, already self-correcting where the manifest layer landed) > 1 (the root mechanisms: drift + dispatch) > 2 (altitude/duplication, chronic not acute) > 5 (input thread, consumed).**

## Adversarial verification outcome

| Proposal | Verdict | Forced modification (kept) |
|---|---|---|
| Evidence hooks (R-B) | survives-mod | importance declared at plan time; freshness invariant (mtime > staged changes); WARN-and-LOG first; commit-chokepoint only; hooks land in repo+installer |
| Mockup manifest (R-C) | survives-mod | split by **kind** (bindings→manifest, generalized lessons stay global); freeform not schema; needs a second consumer + existence check |
| Routing (R-F) | survives-mod | NEXT line as command **output contract** + single-fire dirty-tree Stop hook; no free-floating suggestions (collides with operator's anti-proactive-offer rule) |
| Living evidence set (R-G) | survives-mod | manifests always committed; curated screenshot subset via `.gitignore` carve-out (no force-add); full runs stay ignored |
| Lift SOP (R-J) | survives-mod | ship dispatch with content (else it's the same rarely-loaded skill); R0 softened to declare-and-append |
| De-dup rules (R-I) | survives-mod | de-dup into **suite-owned** conventions file shipped to both homes — never reference the private `~/.claude/rules`; rename the confidence-80 % |
| Taste = judgment (R-K) | survives-mod | detectability-first graduation (encode at n=1 if statable as a Detection command; taste-log otherwise; 2nd recurrence forces the call) |
| **`/gabe-simplify` wrapper (R-D)** | **dies** | zero measured incidents; request ≠ measurement (locked decision #3). Residue: document built-in `/simplify`; re-open at ≥5 measured incidents |

## Deliverables index

1. [01-reinstruction-pattern-catalog.md](01-reinstruction-pattern-catalog.md) — 16 patterns, frequencies, homes, anti-goals
2. [02-command-altitude-table.md](02-command-altitude-table.md) — all 22 wrappers, usage-grounded verdicts
3. [03-storybook-react-reuse-sop.md](03-storybook-react-reuse-sop.md) — the lift operation (L0–L4), manifest fields, dispatch fix, three failure arcs reconstructed
4. [04-evidence-doctrine-operationalized.md](04-evidence-doctrine-operationalized.md) — importance filter, proof-form map, living set, staged enforcement, evaluator, evidence→docs
5. [05-thread-ranking.md](05-thread-ranking.md) — the ordering above, argued
6. [06-sequenced-change-plan.md](06-sequenced-change-plan.md) — Wave 0 (4 immediate small steps, reconcile-first), Wave 1 (4 design-gated builds), Wave 2 (re-measure), and the explicit not-do list
7. [07-twin-divergence-report.md](07-twin-divergence-report.md) — 12 divergences, each flagged unify/keep for the operator (5 unify, 5 keep, 2 cleanup)
8. [08-structural-alternatives.md](08-structural-alternatives.md) — (operator review round) the suite's *shape* vs Anthropic's current guidance: Fork A KDBP-lite (24 files → ~11 keepers; git as ledger; JSON phase-table mirror), Fork B skills-only (commands≡skills now; native `when_to_use`/`paths` dispatch; skill-scoped hooks), Fork C orchestration (confirms 0.5c; `context: fork` satellites). **DECIDED 2026-07-09: A2 + B2 + C-recommendation**
9. [09-fork-migration-plan.md](09-fork-migration-plan.md) — implementation-ready migration map for the decided forks: per-capability B2 skill table (frontmatter, references/ splits, deletion-last rule), per-file A2 disposition table (~24 → ~11 keepers + PLAN.json mirror), absorption map showing which Wave-1 steps the forks subsume (1.1, 1.2, 1.4, part of 1.3). Master sequence: 0.1 → B2 → A2 → rest of Wave 1
10. [10-code-audit-simplify-verdict.md](10-code-audit-simplify-verdict.md) — **step 0.5a executed 2026-07-09** (first plan step run): full >800-line census (32+31 files, classified by reading), churn intersection, verified duplication/dead code. Verdicts: gustify material, gastify moderate. **`/gabe-simplify` resolved — tiered gate inside gabe-commit** (size-budget WARN + triggered simplify pass); standalone wrapper stays dead; one-time cleanup backlog for PENDING.md

## Limitations / provenance notes

- Incident counts are reader-extracted (Sonnet) with verbatim-quote grounding required; Fable clustering merged near-duplicates, but ±10 % on cluster sizes is honest error. Two sessions were digested from a mid-flight state (working trees dirty); one junk row excluded.
- Session ids cited are 8-char prefixes under `~/.claude/projects/-home-khujta-projects-apps-{gustify,gastify}/`. Chunk digests + the full incident/episode JSON are preserved in this run's scratchpad (`agg/incidents.json`, `agg/thread4.json`, `agg/session_summaries.json`, 4 scan reports) — copy them into `output/raw/` before the scratchpad is garbage-collected if you want the raw layer kept.
- The four talk summaries are operator-supplied rubrics, not verbatim transcripts (per brief §Thread-5); they were used as leads only, and every lead cited in a deliverable was verified against transcript/repo evidence first.
