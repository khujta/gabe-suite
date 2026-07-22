# Verification-First Redesign — the suite's design record

> **Read this before restructuring the suite.** It is the settled context from the
> 2026-07-14/15 design arc: how the suite, its files, and the command center relate;
> why each decision fell the way it did; and the traps already found and priced.
> Human-facing visuals (same content, navigable): [`map-site-files-suite.html`](map-site-files-suite.html)
> (**v3, 2026-07-22** — now four columns: the far-left column is the ACTUAL sidebar as
> gastify renders it TODAY, extracted from the generated pages, gaps included; then the
> center's sections, the files execution generates, and the commands that write them.
> Pin/hover any node to trace the full chain. Below the map: the ruled Nav⟷structure
> gap table — RULED 2026-07-21, merged into the templates @ `0c8a307`. Covers `/gabe-adopt`
> + its `adoption.json` registry, `/gabe-walk`, the guard+warn hook pair) ·
> [`example-testing-page.html`](example-testing-page.html)
> (**how the Testing page will look after slice 5** — illustrative preview over the real
> dry-run numbers: the C-id matrix, ever-red, walks, verification changelog) ·
> [`consolidated-trees.html`](consolidated-trees.html) (the three leveled trees) ·
> [`gabe-red-design.html`](gabe-red-design.html) (the TDD beat's design brief).

**Status:** decisions locked 2026-07-15 (D1–D7 below). Suite-side slices 1–4 LANDED 2026-07-15 (commits `fcb471f` red spine · `4dfbb8f` enforcement arm · `5d49c0e` small set). Pre-rollout gap review rulings R1–R7 landed 2026-07-15 (§5 addendum) — including `/gabe-adopt` (brownfield center adoption, suite 27 → 28). Slice 5 (app repos: gastify first, then gustify) awaits the operator's session-stop signal.

---

## 1 · The one picture

The command center (`docs/site/center/`) is **not a thing anyone builds or maintains — it is a
derived view of the software lifecycle's execution**. Read one object along three cuts:

- **Lifecycle = the producer.** The suite's domain function is DEVELOPING SOFTWARE. Every command
  is justified by its value to the developer building the thing — never by the docs it emits.
  The doc points fall out of the beats as byproducts.
- **Structure = the shape.** One subject spine (Now · Board · Entities · Docs · Testing · Ledger ·
  Releases · Leaf), read along two axes: **entity** (which subject, horizontal) × **altitude**
  (docs high / tests low, vertical — C4's zoom ≈ ISTQB's test levels). Docs and tests are two
  lenses at the same altitude, meeting at the feature card. Time (past/present/future) is an
  **overlay**, never a fourth wing.
- **Growth = the motion.** Ship a feature and it walks the spine by itself: ticket closes, commit
  lands, every view recounts from the same machine sources. Two clocks: the **present is replaced**
  each refresh (can't drift); the **past accrues in git** (never hand-kept).

**The laws that hold it together** (violating any of these has already been tried and reverted):

1. **Anti-curation** — machine sources ASSERT every count/verdict/pass-fail (git, junit, coverage,
   PLAN, PENDING); authored artifacts only TRANSLATE; gaps are NAMED, never faked.
2. **Anti-bloat** — never store what you can derive; no view that needs refresh-discipline;
   no auto-synthesized prose (deriving narrative from git is fabrication, not projection).
3. **The Standing Correction** — never evaluate a command by whether it emits a doc artifact.
   (A prior pass deleted `/gabe-execute` for "authoring no doc" — that is the canonical error.)
4. **Block lies, warn debts** (D7) — harness hooks block dishonest state (a ✅ whose proof doesn't
   exist); everything else (thin coverage, un-walked stations, absent angles) is reported, never
   blocking.

## 2 · Why test-first never landed before (the load-bearing diagnosis)

The operator asked for TDD repeatedly; it never landed. Three structural reasons — keep these,
they explain most of the design:

- **A beat asserts ONE terminal state; TDD has TWO contradictory terminal states of the same
  measurement.** One command cannot end with "the tests fail" and "the tests pass." Inside a
  merged execute, red is swallowed by the act that produced it — the only boundary observable is
  green, i.e. self-graded evidence. Merged execute yields theatre **by construction**. Hence a
  dedicated beat (`/gabe-red`) whose deliverable IS the failing state.
- **The derived-reader loop.** Every test signal in the suite reads files that already exist
  (commit counts, review's file-adjacency, feature's path globs). A *promised* test had no reader;
  a promise with no reader is never written; no reader is ever justified. Broken by giving the
  promise a schema slot (`proof.type: test`, the `Cases:` line) and a reader (execute + the guard).
- **Nothing owned test identity.** Tests were the only durable artifact born with no command
  present (inside "3. Implement", a step with no registry write). DECISIONS get D[N], PENDING gets
  P[N], phases get ids — tests got nothing. `/gabe-red` is the birth moment.
- Bonus orphan: `evidence-doctrine.md:21` already specified "failing-then-passing test (fails on
  base, passes on fix)" and a `proof: test` type — with no schema slot and no reader. The red-green
  contract predates this redesign; it just never grew the branch.

## 3 · The mutated lifecycle (right side)

| # | Beat | Command | Software job | Doc byproduct | Change |
|---|------|---------|--------------|---------------|--------|
| 1 | Scope | `/gabe-scope` (+change/addition/pivot) | premise + phase arc | foundations/architecture (§9–10) · the backlog (§Phases) | unchanged |
| 2 | Plan | `/gabe-plan` | phases, tier call, **proof declared before code** | board rail (PLAN.json) · risk axes · D-refs | **extended:** `proof` gains a TYPE — `test \| visual \| journey` |
| 3 | **Red** | **`/gabe-red [phase]`** | TDD's first half: inspect corpus → REUSE(id, maybe v-bump) vs NEW(id) → write cases → run → **commit the failure** | red cell · `Cases:` line · the corpus's C-ids | **new** |
| 4 | Execute | `/gabe-execute` | build; turn the red set green under the tier cap | checkpoint commits (lens brief) · proof artifacts · narration legs (authored hot) | **extended:** TASK CONTRACT gains a `CASES:` line |
| 5 | Review | `/gabe-review` | price findings (fix cost × defer risk × maturity gate) | PENDING (review-debt lane) | **extended:** NEW CASE / BUMP subjects · owns CASE DRIFT · growth triage (cap 7) on the SAME pricing |
| 6 | Commit | `/gabe-commit` | the chokepoint gate | LEDGER row · results digest | **extended:** C-id check on new tests · `results_out` digest (report at all tiers) |
| 7 | Push | `/gabe-push` | ship: PR, CI, deploy-verify, promote | DEPLOYMENTS row · deployed angle · leaf links | **extended:** terminal-env write = the release trigger (derived) |
| 8 | Walk | **`/gabe-walk`** | record a human walking the build — the witness | walks.jsonl → manual angles + staleness | **new** (~40 lines; records, never judges) |
| 9 | Center | `/gabe-feature <phase>` | the per-feature translation + test-strategy audit | card · curated proof · REVIEWED stamp → Center ✅ | **extended-shrunk:** verdicts RENDERED from review triage; identity from C-ids (path globs retire) |
| 10 | Release | `/gabe-feature release` | — none (that's the finding: it's a MODE, not a beat) | stakeholder showcase (shots + diagrams; video = named gap, D3) | **new mode**; trigger = terminal-env promotion, derived |
| 11 | Router | `/gabe-next` | zero-logic dispatch over PLAN cells | — | **extended:** red-before-execute as a machine predicate; optional `red` cell like `center` |
| — | Advisors | align · assess · debt · health · myopic · roast (+lens/meme/quip/mockup/init/adopt/handoff) | quality judgment / design / birth / adoption / resume | — | unchanged (outside the beat loop) |

**`/gabe-red` essentials** (full brief: [`gabe-red-design.html`](gabe-red-design.html)):
- Deliverable = **a commit whose declared cases fail by assertion** (`RED:` trailer). Red isn't
  perishable, it's *unaddressable* — the commit gives it an address; anyone can re-derive the
  failure later (`git worktree add … <red-sha> && pytest -k C147`).
- **Three outcomes:** fails by assertion → RED · fails by import/collection → NOT RED
  (non-evidence) · passes on unchanged code → TAUTOLOGY, halt.
- **The stub RETURNS, never raises** — a raising stub makes every case look red and kills the
  tautology guard; a returning stub lets `assert True` get caught.
- **Refactors are not "not TDD-able":** their contract is `GUARD: C091, C147 …` (existing cases
  must stay green) — no fake red, machine-checkable. Genuinely un-testable changes self-skip with
  an enumerated code recorded on the phase.
- **Verification level = the existing tier.** min_cases: 1 @MVP · 3–6 @ent · +fuzz/load @scale.
  No parallel level system.
- Honest cost: net **+10–15% phase time @MVP, +20–30% @ent** (most test-writing time *moves*
  earlier rather than being added). The dominant new spend is the corpus search — which is
  precisely the reuse work the operator wanted forced into the open.

**Test identity:** the id is a token **inside the test's own text/name** —
`def test_clamps_negative_quantity_C147v2()` / `it('C147v2 · clamps …')`. Project-global,
monotonic `C[N]`; a revision suffix (`v2`) bumps when the *claim* changes (a re-run never bumps).
The **corpus IS the registry** (grep allocates; `git log -S "C147"` recovers history; the id rides
junit reports with zero plumbing). Never path-keyed (renames), never phase-scoped (phases archive),
never a registry file (drift). Known cost: a bump renames the test → junit history shows a
discontinuity; the matrix stitches by the shared stem.

## 4 · The center (left side) and the files (middle)

Condensed; the full leveled trees live in [`consolidated-trees.html`](consolidated-trees.html),
the connection map in [`map-site-files-suite.html`](map-site-files-suite.html).

**Site** (`docs/site/center/`): `now` (present: feed · needs-you · freshness) · `board`
(rail **red**→exec→review→commit→push — glyphs, Red/Review collide on "R"; lanes: backlog ·
non-phase · review-debt) · `entities` · `docs/<entity>/<feature>` **accumulator** (handle ·
Gabe-Lens analogy lead · what&why · for-whom · flows · is/is-not · decided · diagrams · derived
changelog) + `docs/foundations/` (decisions · rules · architecture · procedures) · `testing/`
ONE section: `matrix` (index; per test: id · **ever-red?** · status · source · last-run; buckets:
unclaimed · untyped · id-less) + `<entity>/<feature>` **accumulator** (automated angles ·
**manual angles fed by walks** · verdicts rendered from triage · verification changelog · demo
shelf) · `ledger/<change-id>` **ephemeral, 100% derived** · `releases/<id>` (shots + diagrams;
video deferred) · `leaf/` (OSS reports, linked never rebuilt).

**Files:** git (commits + `RED:`/`Cases:` trailers + lens briefs) and the C-id'd corpus are the
machine spine; `.kdbp/` is the authored state (SCOPE · PLAN.md/json · PENDING · **BEHAVIOR.md**
(new template: verify commands · `results_out` · critical_paths) · **walks.jsonl** (new,
append-only) · LEDGER · DEPLOYMENTS · DECISIONS · RULES · PUSH · HANDOFF); center inputs are the
only prose (center.config.json · cards/ · proof manifests+shots). **Never stored, always derived:**
ledger pages, changelogs, regression relationships, ever-red, scope joins, the non-phase lane.

**Naming (locked earlier):** Docs · Foundations · Ledger · Testing (matrix inside; automated +
manual as angle groups on ONE feature page) · the accumulator/ephemeral split; A3 "tabbed subject"
is the BINDING layout (lab: `docs/investigations/2026-07-14-center-layout-lab/`; contract:
adopt-spec §init step 4; skeletons: `templates/center/shell/`). A filled, interlinked render of
every station lives at [`shell-preview/`](shell-preview/index.html) — open it to SEE the shape;
the raw templates show `{{SLOT}}` tokens by design.

## 5 · The decisions (2026-07-15, all locked)

| # | Decision | Ruling + why |
|---|----------|--------------|
| D1 | MVP verification posture | **Report, never gate.** Red at all tiers (min_cases=1 @MVP) + digest/coverage REPORTED everywhere; no new gate can block an MVP ship. Verification visible on every development without slowing delivery. |
| D2 | Manual-walk witness | **`/gabe-walk` added** (~40 lines, append to walks.jsonl: who·when·result·evidence). Justified as a verification act — the one input with no machine source. NEVER-walked still renders red until the first walk. |
| D3 | Release-page media | **Shots + diagrams only in v1; video custody deferred** to the first real release. (D146 — video machine-local, never committed — stays intact.) |
| D4 | BEHAVIOR.md | **Template ships.** Load-bearing ×3 (verify commands · critical_paths hotfix arm · `results_out`). Greenfield gets `results_out` default-on at init; brownfield opt-in. |
| D5 | C-id adoption in existing corpora | **Backfill sweep** (operator's call over the lazy rec): mechanical-only, one commit per repo, `.git-blame-ignore-revs` registered, **no fake reds** — backfilled tests get an id but their ever-red stays honestly empty. |
| D6 | Remaining TDD recs | **Ratified:** red-as-commit (`RED:` trailer) · case-drift lives in review (judgment-shaped checks in judgment-shaped beats; commit keeps only deterministic greps) · growth findings cap 7 · `/gabe-feature` survives shrunk-in-place (revisit at n=3). |
| D7 | Hook enforcement | **Block lies, warn debts.** `plan-proof-guard` (PostToolUse on PLAN writes) blocks a ✅ tick whose proof doesn't exist on disk/git — every tier. `pre-checkpoint` (already fires on `git commit`) gains the deterministic C-id/case checks as warnings @MVP. Enforcement prose then DELETED from specs (leaner skills — the July-7 research's "hooks are the enforcement layer," finally implemented; PLAN.json is the tasks-JSON from that pattern). |

Standing red flags (deliberate, do not "fix" silently): the **human-witness gap is NOT closed** by
red/C-ids/release pages (a fresh-context evaluator is an agent; only `/gabe-walk` records a human);
architecture/procedures are a **content gap** (render honest absence, never seed prose from
machine state); the generator concentrates logic (D7-promotion to the suite was accepted as ripe
at n=2 — it must return to suite-doctor's radar).

**Tripwire:** if `/gabe-red` ever prints a summary a developer reads instead of a failure a
developer must fix, it has become ceremony — delete it.

### Addendum — pre-rollout rulings (2026-07-15, R1–R7)

The pre-slice-5 gap review (fixture-verified against `next.mjs`, the plan-proof-guard, and both
twins' live state) produced seven rulings, all landed suite-side the same day. A subsequent
four-POV panel hardened the enforcement scripts, and a full REHEARSAL on a synthetic twin
replicating gastify's pathologies validated chunks 0–3 end-to-end (guard/router/R1-R2-R6 held
under negative controls) — its two prototyped tools ship in the suite
(`gabe-plan/scripts/regen-mirror.py`, `gabe-red/scripts/backfill-sweep.py`):

| # | Ruling |
|---|--------|
| R1 | **Red-column retrofits seed honestly.** Adding `Red` to an existing plan seeds ⬜ only where Exec is ⬜; ✅ **and 🔄** rows render `—` and the mirror OMITS the `red` key. Verified: an omitted key settles in `next.mjs`; ⬜ on a shipped row re-opens it and demands a fake red; ✅ is guard-blocked. *(Amended by the round-3 literal-executor review: an in-progress phase has already passed red's before-first-source-write moment — seeding it ⬜ only defers the fake-red demand to the debt sweep one phase later.)* |
| R2 | **The guard tolerates evidence shorthand.** A proof token passes by literal path, brace-expanded glob, or non-empty parent dir; empty/missing dirs still block. Two honesty rules bound the leniency (round-3/5 hardening): a pure-wildcard token (no concrete path component — bare `*`, `../../**`) is never evidence, and the parent-dir probe is per-candidate (a mid-path brace whose alternatives don't exist cannot pass off an unrelated ancestor). Both twins' first PLAN writes would otherwise have been false-positive-blocked (`01..06-*.png` / `{…}.png` tokens). The two live shorthand strings still get normalized in slice-5 chunk 0 (hygiene). |
| R3 | **`C` belongs to cases; scenario labels take `M`.** Sweeps use the anchored token pattern (bare `C[0-9]+` over-matches — `RFC1234` → C1235) and rename colliding label families in the same commit: gustify's myopic C1–C11 → M1–M11 + its PLAN "C4" reference. gabe-myopic labels findings `M[N]` from now on. |
| R4 | **`results_out` is a path or a LIST** (one report per corpus); digest per entry; a report the run didn't refresh is named `stale`, never digested as current; a gitignored reports dir gets a `!*.digest.json` negation (gustify) rather than un-ignoring junit. |
| R5 | **Ever-red ships with the rebuilt center, not as a patch.** Slice-5 chunk 3's promise reduces to junit names + `Cases:` record + `RED:` trailer; ever-red rendering lands in `/gabe-adopt`'s suite-owned generator templates — the n=2→3 generator-promotion moment §5 already flagged as ripe. |
| R6 | **Mechanical honesty fixes:** mirror regeneration reads Phase Details, not just the table (a table-only regen drops `cases` and turns the next write into a guard-blocked lie); the PLAN template documents the Red column; pre-checkpoint's C-id warns can actually fire (`.kdbp` excluded from the corpus grep — the PLAN that declares an id no longer satisfies its own check; tokens bounded). |
| R7 | **`/gabe-adopt` approved** — brownfield command-center adoption as its own skill (`init` archives existing docs — never deletes — and bootstraps the center from suite templates · `rank` machine-derives the critical/high shortlist for operator approval · `section <entity>` ingests one entity at a time, checklist-gated, human approval recorded as a walk · `status` shows the board). The adoption tracker lives OUTSIDE PLAN.md: the main plan keeps shipping features through the normal lifecycle; the two tracks meet in the same center. |

**Meta-review (2026-07-16).** After five review rounds, the rounds themselves were audited for
recurring miss-classes. Seven patterns; the integrations landed suite-side: `suite-doctor` now
enforces the SUITE INVARIANTS (hook harness green · SKILL↔CLAUDE version parity · skill-count
claims · portability lint · docsite staleness) — the suite's own laws, applied to itself;
CLAUDE.md conventions gained dry-run-on-copy (P1 — template-derived fixtures validate the
template, not reality) and the fixture-battery rule (P2/P4 — `tests/hooks/run.sh` is the
enforcement layer's executable contract); the skill procedure gained the handshake walk (P5 —
seams break where each spec is written from its own seat); docs-spec gained the
failure-messages-carry-the-move rule (P7); review-spec documents the REALISM LADDER (the
meta-lesson: a review angle exhausts in one pass — escalate static → cross-ref → adversarial
POV → synthetic rehearsal → real-data dry-run; the fifth rung found the largest defects after
the first four reported diminishing returns).

## 6 · The landing plan

Suite-first (this repo), install regenerates `~/.claude`, doctor must be CLEAN per slice.

1. **Slice 1 — the red spine:** `skills/gabe-red/` (SKILL.md + references/red-spec.md) ·
   plan-spec `proof.type` · execute-spec `CASES:` line + narration pointer · `next.mjs` optional
   `red` cell + red-before-execute routing (+fixtures) · version bumps · install · doctor.
2. **Slice 2 — the enforcement arm (D7):** `plan-proof-guard` script · extend `pre-checkpoint.sh` ·
   wire both in `templates/gabe/hooks.json` · delete the superseded enforcement prose.
3. **Slice 3 — the small set:** `skills/gabe-walk/` · `templates/BEHAVIOR.md` · review's NEW
   CASE/BUMP + growth triage · commit digest emission · feature rendered-verdicts · release mode.
4. **Slice 4 — cascade:** CLAUDE.md/README/help rows · COMMS · final doctor.
5. **Slice 5 — app repos, ON OPERATOR SIGNAL (sessions stopped):** **gastify FIRST, in chunks,
   verified progressively**, THEN propagate to gustify.
   - chunk 0: repair gastify's PLAN.md (malformed separator row, split table, the 24.1 md↔json
     drift — regenerate via `gabe-plan/scripts/regen-mirror.py`, whose drift print is the
     detector) · normalize the two shorthand proof strings to the rehearsed normal form
     (concrete dir + strippable annotation: `proof/<dir> (N shots, …)`) · retrofit BEHAVIOR.md
     to the D4 template shape (`## Verify Commands` + `results_out` list; legacy B-rules kept as
     a trailing section, legacy frontmatter dropped; gustify's pass adds the `!*.digest.json`
     negation). THREE OPERATOR INPUTS here: author the real Verify Commands (gates never
     guess) · resolve gastify's `project_type: mockup` (BEHAVIOR) vs `code` (PLAN) contradiction ·
     reconcile gastify's five over-ticked table rows (12, 13, 25, 30, 31 — table says ✅ where
     the mirror + column-debt prose say todo) BEFORE regenerating, or the debt signal is erased ·
     THEN wire the 6th hook marker via `/gabe-init update` — the guard goes live globally only
     after the state is honest.
   - chunk 1: C-id backfill sweep — the tested tool ships at `gabe-red/scripts/backfill-sweep.py`
     (rehearsed end-to-end; idempotent; runbook in its header). Explicit roots (gastify excludes
     `frontend/`+`mobile/`; pre-scan for it.each/template-literal titles first), enumerated
     `--myopic-labels` (gustify C1–C11), SWEEP commit staged by explicit file list + an
     immediately following chore commit registering the sha in `.git-blame-ignore-revs` +
     `git config blame.ignoreRevsFile`.
   - chunk 2: add the Red column (R1 seeding as amended: ⬜ only where Exec is ⬜; 🔄/✅ rows
     get `—` and no mirror key) + PLAN.json mirror · verify `next.mjs` routing.
   - chunk 3: `/gabe-red` for real on the next Red-⬜ phase (the pointer advances via normal
     mechanics — the current phase may still be 🔄) → execute turns it green — verified via
     junit names + `Cases:` record + `RED:` trailer (ever-red waits for the adopt rebuild, R5).
     The Red ✅ tick rides its own chore commit (the red@sha exists only after the red commit).
   Then `/gabe-adopt init` on gastify: archive the hand-built center, rebuild section-by-section
   at human speed. Afterward the align/assess re-measure marker fires (trim-ledger #5).

## 7 · Provenance

Designed 2026-07-14/15 across research workflows recorded in this session's artifacts; grounded in
line-verified reads of the binding specs (plan-spec, execute-spec, review-spec, gate-spec,
evidence-doctrine, feature-spec) and the 2026-07-07 workflow-enhancement research
(`docs/investigations/2026-07-07-workflow-enhancement/` — hooks as the enforcement layer).
The center's structure decisions trace to the 2026-07-10 testing-command-center investigation and
the 2026-07-14 layout lab.
