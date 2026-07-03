## Read this first if you're new to the catalog

Every mechanism below exists because of the same story, repeated with different details: a capable model did something careful and correct — cited the exact line it read, ran a command before checking a box, asked before quietly shipping a cheaper version of a task — and a less capable (or just faster, more literal) model, given the same instructions, did not. Nothing in the skill's text had actually *required* the careful behavior; it was a bonus the strong model supplied on its own. When a weaker model ran the same skill, the bonus vanished and nobody noticed until a human caught the gap — a wrong-app screenshot, a decision quietly reversed with no record, a checklist showing all-green next to code that had never actually been run.

The catalog's job is to close that gap by turning each unwritten habit into a short, literal rule that any model can follow mechanically — a specific checklist line, a fixed report format, a forced STOP — rather than a judgment call the model has to reinvent every time.

:::note Cross-cutting contracts
Several mechanisms don't live once — they live as an exact block of text, reused **byte-identical** across every skill that carries them. The E1–E7 contract itself is the flagship example: the same seven lines, pasted verbatim into every `gabe-*` skill and command, rather than seven similar-but-slightly-different paraphrases. This matters because a weak model is good at following an exact recipe and bad at reconstructing one from a vague memory of "we did something like this before." Where a mechanism below says its cost is "shared" or points at a shared preamble, that is this pattern: write the block once, copy it verbatim everywhere it applies, and never let two skills drift into two different wordings of the same rule.
:::

The 24 mechanisms group into five families by what kind of drift they stop. Jump to whichever family matches the problem you're chasing, or read straight through — they build on each other.

| Family | Stops drift in… | Mechanisms |
|---|---|---|
| **Evidence** | Claims that were never actually checked this session | 4 |
| **Verification** | Findings that sound plausible but were never re-tested | 3 |
| **Reuse & anti-downgrade** | Cheaper substitutes shipped silently in place of what was asked | 4 |
| **State integrity** | Plan/decision files drifting away from what actually happened | 9 |
| **Anti-fabrication** | Numbers, scores, and proofs that were invented rather than produced | 4 |

(24th mechanism, Progressive Disclosure Budget, is the odd one out — it doesn't stop a drift, it *funds* every gate above by cutting the dead weight elsewhere in the skill files. It closes the page.)

## Family: Evidence

*family · claims must trace to something actually read or run*

These four mechanisms share one root rule: nothing gets stated as fact, marked ✅, or printed as a number unless it traces to a file the model opened or a command it ran *this session*. That single constraint is what E1 and E2 of the core contract compress down from.

- **Evidence-Line Contract** — Every finding ends with a citation to something read this session, in a fixed format per source type.
- **Executed-Evidence Gate** — ✅ only after its command ran via the tool this session; skips get a named reason, never a hidden pass.
- **Absence-Claim Search Proof** — "No X exists" requires a pasted search command that returned zero hits.
- **Proof Validity Contract** — A screenshot or log only counts as proof if it passes identity, layer, entry, and matrix checks.

### Evidence-Line Contract

**Behavior:** every finding or claim carries a citation to something the model actually read this session; a finding with no evidence line is deleted before it's shown, not softened.

```
Every finding/claim MUST end with an Evidence line, formatted by source type:
  code     → `path:line` — "quoted snippet (≤2 lines)"
  doc/spec → §section — "quoted sentence"
  command  → `<command>` → pasted output line
  UI       → screen/story id + quoted visible text
Rules: (1) cite only files/hunks opened via Read or diff THIS session;
(2) a finding with an empty Evidence line is DELETED before output.
```

carried by: gabe-review, gabe-myopic, gabe-roast, gabe-assess, gabe-debt, gabe-health

### Executed-Evidence Gate

**Behavior:** a check may show ✅ only if its command ran via the tool this session; every printed number is copied from real output, and a skip is a distinct third glyph, never disguised as a pass.

```
A check may be marked ✅ ONLY if its command executed via the Bash tool this
session. Before any summary line, print one evidence row per check:
  CHECK <name>: `<exact command>` → exit <code>, "<count line copied from output>"
Glyphs are 3-state: ✅ pass · ❌ fail · ⤫ skipped(<named reason>). Rendering a
skip as ✅ is a defect. Every number in a report is copy-pasted from output
produced this run; if the command didn't run, print `<analysis> skipped` —
never an estimate.
```

carried by: gabe-commit, gabe-review, gabe-align, gabe-health, gabe-push, gabe-execute

### Absence-Claim Search Proof

**Behavior:** a claim that something does not exist requires a recorded search command with its empty result; a plan or decision that's premised on an absence must paste that proof before anything else builds on it.

```
An absence claim ("no X exists", "nothing handles Y") requires a search proof
in its Evidence line:
  `grep -rn <exact pattern> <scope>` → 0 hits
No recorded search → the claim may not be made. A plan/decision premised on
an absence must paste the probing command's output before any phase builds
on it.
```

carried by: gabe-roast, gabe-myopic, gabe-review, gabe-plan, gabe-assess, gabe-debt

### Proof Validity Contract (identity · layer · entry · matrix)

**Behavior:** a proof artifact only counts if it shows the right app, at the right layer of the system, entered through the actual changed path, across every platform the change claims to support.

```
A proof artifact counts only if it passes FOUR checks:
  IDENTITY — target app visible in the artifact (branding/title/URL) and
    checked; evidence servers use a pinned dedicated port, never reuse-existing.
  LAYER — lookup, not judgment: visual/layout → browser assertion on the LIVE
    route · data/API → network write fired + persisted · deploy → deployed
    artifact boots + health endpoint.
  ENTRY — the proof enters the CHANGED path from its real entry state (fresh
    user for onboarding), not a fixture that skips the branch.
  MATRIX — one artifact per declared platform/viewport:
    `PROOF: mobile-390 <abs path> | desktop-1280 <abs path>` — missing
    cell = not done.
```

carried by: gabe-execute, gabe-review, gabe-mockup

## Family: Verification

*family · plausible is not the same as tested*

Drafting a finding is easy; a model can produce a plausible-sounding bug report about almost anything. This family forces a second, adversarial pass over each draft *before* it's allowed to reach the human — the same skepticism a careful senior reviewer applies to their own first draft.

- **Adversarial Verify/Kill Pass** — Every drafted finding is re-tested against three kill questions before it's allowed to render.
- **Falsifiable-Checker Rule** — A verification command is trusted only after it's been seen to actually fail at least once.
- **Deterministic Verdicts & Visible Arithmetic** — Verdicts are computed by a fixed rule from citations and counts, never eyeballed.

### Adversarial Verify/Kill Pass

**Behavior:** after drafting all findings, a separate mandatory pass re-tests each one against its evidence and against existing guards; anything merely plausible gets killed, and the kill accounting is printed so the drop isn't silent.

```
## Verify pass (mandatory — after drafting ALL findings, before output)
For EACH draft answer three kill questions:
  K1 Does the cited evidence actually say this? (re-open the file/quote)
  K2 Is the failure concrete? (name the triggering input/state)
  K3 Does a precision guard, existing test, or existing guard already cover it?
Stamp: CONFIRMED | DOWNGRADED(<reason>) | KILLED(<K#>).
'Plausible but unverified' = KILLED. UNVERIFIED can never be CRITICAL/HIGH.
Header MUST print: raw N → killed X → downgraded Y → survived Z.
```

carried by: gabe-review, gabe-myopic, gabe-roast, gabe-debt, gabe-health

### Falsifiable-Checker Rule (VERIFY table)

**Behavior:** verification commands come from one recorded, CI-bound table rather than being improvised per run; a brand-new command only earns a place in that table after it has demonstrably caught a planted failure — a check that can never fail (an exit-0 no-op, a zero-test job) counts as no evidence at all.

```
Verification commands come from the project's recorded VERIFY table (state
file), populated once from CI job definitions / package scripts — never
improvised. A NEW command enters the table only after it has been SEEN TO
FAIL (plant a trivial error, or match it 1:1 to a CI job). A checker that
cannot fail (exit-0 no-op, 0-test job, continue-on-error) is NON-EVIDENCE.
Test stubs must be behavior-preserving for the property verified (an i18n
stub returns a sentinel, never the key as displayable text).
```

carried by: gabe-commit, gabe-execute, gabe-init (creates the table)

### Deterministic Verdicts & Visible Arithmetic

**Behavior:** a verdict requires a citation to exist at all, the mapping from findings to a final verdict is a fixed lookup rather than a feeling, and any score built from multiple weighted terms is computed in a visible worksheet — never combined silently in prose where a rounding choice can quietly move the outcome.

```
No vibes verdicts:
1. COVERED must cite `test-file::test-name`; PASS must name what was
   inspected (`PASS — checked <file:line>`). No citation → the negative
   verdict applies by definition.
2. Verdict map is deterministic: any FAIL → DO-NOT-PROCEED; any CONCERN →
   PROCEED-WITH-CONCERNS; else PROCEED.
3. Any score with multipliers is computed in a worksheet table (one row per
   term, visible sums) — never in prose.
4. Severity icons follow a printed threshold legend; when grading is
   uncertain, score the LOWER band, never up.
```

carried by: gabe-align, gabe-review (confidence worksheet), gabe-teach (answer-key grading), gabe-health (threshold legend)

## Family: Reuse & anti-downgrade

*family · resolving ambiguity in the cheap direction is a defect, not a style choice*

Every mechanism in this family targets the same underlying temptation: when a task is even slightly ambiguous, the cheap interpretation is easier to produce than the expensive one, and a model under time pressure will drift toward "close enough" without ever flagging that a substitution happened. This is the family with the best track record — the one place it was already written down (the mockup reuse gate) demonstrably held.

- **Task Contract Gate** — Restate the task and its deliverable class before writing code; a cheaper class requires an explicit user decision.
- **Reference-Fidelity Acceptance** — A named reference is resolved from a map file and rebuilt to a structural checklist, not eyeballed.
- **Reuse Ledger** — Search before creating anything; print the verdict — reuse, extend, or new — before writing new code.
- **Task-contract quote-verbatim** — The task/phase description is quoted verbatim, not paraphrased, so a paraphrase can't quietly soften it.

### Task Contract Gate

**Behavior:** before any code is written, the task is restated verbatim from the plan, its acceptance signals are named, and the deliverable is classed explicitly — rebuild, restyle, implement, stub, or fix. If the intended work is cheaper than the quoted text implies, that's a STOP, not a judgment call.

```
## TASK CONTRACT (print before writing any code)
1. QUOTE the task/phase Description VERBATIM from the plan file.
2. ACCEPTANCE: restate 1–3 verifiable signals ("done when <observable check>").
3. DELIVERABLE CLASS: name it — rebuild-to-reference | restyle | implement |
   stub | fix. If intended work is a CHEAPER class than the quoted text
   implies, STOP and ask; substitution requires an explicit user decision line.
Implementation may not start until this block is printed.
```

carried by: gabe-execute, gabe-mockup

### Reference-Fidelity Acceptance

**Behavior:** when a task names an external reference (a mockup, a story, a legacy screen), the reference is looked up from a canonical map — never guessed or reconstructed from memory — and "done" means a structural checklist ticked plus one same-viewport side-by-side, not a vibe match.

```
When a task names a reference (mockup/story/spec/legacy screen):
1. RESOLVE it from the project's route→canonical-reference map file; if no
   map exists, creating it IS task 1. archive/ or superseded-marked = never
   a source.
2. MUST-MATCH: section inventory, layout grammar, component composition,
   state set, copy semantics. MAY-DIFFER: DOM/class names, data flow,
   a11y idioms, file structure.
3. At start, emit the reference's structural inventory as a checklist; at
   done, tick each row Y/N/waived and capture ONE same-viewport
   side-by-side (reference | built; state the px). Any unwaived N →
   not done.
4. Epic-scale: build ONE pilot both ways (rebuild vs restyle); user picks
   before phase 1.
```

carried by: gabe-mockup, gabe-execute, gabe-review (faithfulness assertion)

### Reuse Ledger

**Behavior:** before any new component, util, or config is created, a mandatory search runs and its verdict is printed — reuse beats extend beats copy, and re-authoring something that already exists is treated as a named defect, not a style preference.

```
Before creating ANY new component/util/config that resembles something
existing, print:
  REUSE LEDGER
  Searched: <globs/greps run; stories/tests checked>
  Verdict: REUSE <path> | EXTEND <path> via additive optional prop
           (byte-identical when absent) | NEW — none fits because <1 line>
Preference: import > extend > copy; copy requires a written blocker.
Re-authoring a lookalike of an existing artifact is a DEFECT, not a
style choice.
```

carried by: gabe-execute, gabe-mockup (already partial), gabe-commit (scans new files vs existing near-names)

### Task-contract quote-verbatim (E3 of the core contract)

**Behavior:** this is the compressed, always-loaded form of the Task Contract Gate — every skill's preamble carries the one-line version so the discipline doesn't depend on whether the longer gate happened to be triggered.

:::note Where the short form lives
This is E3 in the shared preamble (see [the E1–E7 contract](contract.html)): "quote the task text verbatim before implementing; if your plan delivers a cheaper class (restyle≠rebuild, stub≠implement, recreate≠reuse), STOP and ask." The longer Task Contract Gate and Reference-Fidelity Acceptance mechanisms above are the expanded versions that fire in the skills doing the heaviest implementation work.
:::

## Family: State integrity

*family · plan and decision files must always be re-read, never trusted from memory*

This is the largest family because state drift has the most different failure shapes — a stale pointer, a merged PR nobody recorded, a schema two commands quietly disagree about, a deferred item deferred forever. The unifying principle across all nine: **recognition over recall**. The model always re-reads the state file and reconciles it against reality; it never trusts what it remembers from earlier in the session.

- **Same-Turn State Write** — Actions that change plan reality write their row in the same turn, or print an enumerated skip code.
- **State Freshness Sweep** — Before routing from state, sweep prior rows, quote the Status column, and reconcile against git/PR truth.
- **Canonical Schema Anchor** — Cross-command state tables have exactly one schema, in one file, that every writer targets.
- **Persistent Task Checklist** — Per-task progress lives in the plan file, ticked with a commit hash, never in session memory.
- **Verified/Assumed Claim Markers** — Every state claim in a plan or decision is tagged verified-with-proof or assumed.
- **Deferral Escalation Triggers** — A hard times-deferred threshold forces a decision; repeated same-class deferrals raise a drift alarm.
- **Non-Interactive Defaults Table** — Every prompt has a declared safe default; safety-critical ones never default to proceed.
- **Decision-Drift Scan** — A diff touching a recorded decision's area is classified consistent, amends, or contradicts — the latter two block.
- **Scope Fence + Typed Deviation Row** — Changed files are diffed against declared scope at every checkpoint; out-of-scope forces a typed row.

### Same-Turn State Write (with enumerated skip codes)

**Behavior:** any action that changes plan reality — a commit, a merge, a PR state change, a deploy, a pivot, a deferral — writes its state row in the same turn it happens, as a checklist item of the action itself. A skipped write is never silent; it prints a named code.

```
Any action that changes plan reality (commit, merge, PR state change, deploy,
pivot, defer) updates its state row IN THE SAME turn — a checklist item of
the action itself, not a follow-up. Skipped writes print an enumerated
code, never silence:
  `ℹ <file>: <column> tick skipped (no-plan | phase-not-found |
   pointer-mismatch | column-missing)`
If the commit's Phase footer M ≠ Current Phase N: do NOT tick; print
`⚠ Phase footer M ≠ Current Phase N — fix pointer or footer first.`
```

carried by: gabe-commit, gabe-push, gabe-execute, gabe-plan (shared auto-tick helper)

### State Freshness Sweep

**Behavior:** before routing or planning off a state file, sweep every prior row for incomplete cells, quote the actual Status column of anything cited rather than paraphrasing it, and reconcile the current row against cheap ground truth like git log or PR state.

```
Before routing or planning from state files:
1. PRIOR-ROW SWEEP: scan phases 1..N-1; any non-✅ cell → print
   `⚠ INCOMPLETE PRIOR PHASES: [<phase>: <columns>]` (always print,
   never block).
2. QUOTE WHAT YOU READ: when citing a tracked item, quote its
   Status/resolution column verbatim next to its title.
3. GROUND TRUTH: confirm the current row against cheap reality (git log -1,
   PR state); on mismatch, fix the record BEFORE building on it.
```

carried by: gabe-next, gabe-plan, gabe-help, gabe-assess

### Canonical Schema Anchor

**Behavior:** a cross-command state table (pending items, plan rows) has exactly one schema, defined once in a shared template file; every command that writes to it references that anchor instead of inlining its own copy, and never rewrites an existing header or renumbers rows.

```
Cross-command state tables (pending/deferred items, plan rows) have ONE
canonical schema in a single shared template file (header row + one example
row). Commands say "append per <anchor>" instead of inlining copies.
Writing rules: (1) match the existing file's header if it differs — never
rewrite headers; (2) never renumber existing rows/phases — append, or use
decimal IDs; (3) all writers target the SAME file (first-found rule, legacy
name only as fallback).
```

carried by: gabe-review, gabe-commit, gabe-push, gabe-align, gabe-plan (update scope-fence)

### Persistent Task Checklist

**Behavior:** per-task progress inside a phase lives in the plan file itself — written at phase start, ticked with the commit hash after each task — so resuming a session means reading that block instead of trusting a remembered summary.

```
Task state lives in the plan file, never in session memory:
- Phase start: write `### Phase N Tasks` into Phase Details:
  `- [ ] T1 — <desc>` (one line per task).
- After each task's commit: `- [x] T1 (commit <hash>)`.
- Resume/interrupt: read THIS block to reconstruct progress. Claiming a
  task complete with no ticked row is a defect.
```

carried by: gabe-execute (writes/ticks/reads), gabe-plan (template hosts the block)

### Verified/Assumed Claim Markers

**Behavior:** every current-state assertion written into a plan or decision entry carries an explicit marker — verified with its proof, or assumed — and an assumed claim must be verified before anything else is built on top of it.

```
Every current-state claim written into a plan or decision entry carries a
marker:
  (verified: <file:line | command → output>)   or   (assumed)
An (assumed) claim must be verified before any phase builds on it. Claims
of absence additionally follow the absence-search rule (paste the probe
output).
```

carried by: gabe-plan, gabe-assess, gabe-debt, gabe-scope

### Deferral Escalation Triggers

**Behavior:** deferral is bounded mechanically rather than by judgment — a hard times-deferred threshold forces an explicit user decision, two or more open items sharing a class raise a systemic-drift alarm, and the deferred scan always prints a line, even when it found nothing.

```
Deferral is bounded:
- Times-Deferred ≥ 3 → no further silent deferral; force a user decision:
  fix-now | accept-close (with rationale) | drop.
- Every deferred item carries a short class tag. ≥2 OPEN items sharing a
  class → print: `⚠ repeated class <tag>: N items — possible systemic
  drift from intent; confirm direction before deferring again.`
- The scan prints even when empty:
  `DEFERRED SCAN: N checked, M matched, K at ≥3 (escalated)` — absent
  line = didn't run.
```

carried by: gabe-review (triage + deferred mode), gabe-commit (CHECK 6)

### Non-Interactive Defaults Table

**Behavior:** every interactive prompt in a skill has a declared safe default listed in a table; if no human answer is available, the model takes the table default and says so out loud — and safety-critical prompts are never allowed to default toward "proceed."

```
Non-interactive defaults (one table per skill, one row per prompt):
  <prompt> → <safe default>
Rule: if no human answer is available, take the table default and print
`(defaulted: <choice>)`. Safety rows never default to proceed:
CI failure → stop with report · direct-to-main → abort · uncommitted
changes → abort · skipped CRITICAL → force-defer at BLOCKING, verdict
stays BLOCK · un-triaged findings on exit → auto-defer to the pending
file (never dropped).
```

carried by: gabe-push, gabe-review, gabe-commit, gabe-scope

### Decision-Drift Scan

**Behavior:** at review or commit time, the diff is checked against every recorded decision whose area overlaps it; a diff that amends or contradicts a decision blocks until an amendment entry is written or the user explicitly waives it. Implementation code is never allowed to silently outvote a recorded decision.

```
At review/commit time: list recorded decision entries whose area overlaps
the diff (match by paths/routes/keywords in the entry). Classify each:
  consistent | amends | contradicts
`amends/contradicts` BLOCKS until an amendment entry is written or the user
explicitly waives (`waived by user: <quoted line>`). Additionally:
artifacts that passed a promotion/validation gate are edit-locked — direct
edits are a gate violation to surface, not fix silently.
```

carried by: gabe-review (plan-alignment step), gabe-commit (new CHECK), gabe-execute (re-read decisions touching in-scope files)

### Scope Fence + Typed Deviation Row

**Behavior:** at every checkpoint, changed files are mechanically diffed against the phase's declared scope; anything outside that scope forces an immediate, typed classification instead of a silent shrug, and staging is always an explicit list — never a blanket add-all that can sweep in someone else's in-flight work.

```
At each checkpoint: run `git diff --name-only` and compare against the
phase's declared Scope list. Any file outside → forced classification:
  structural (halt menu) | minor → write ONE typed deviation row NOW:
  `<date> | <type: scope-correction | signature-change | extra-file | …> |
   <file> | <1-line note>`
No Scope list → print `Scope unfenced — deviation check skipped` (visible
omission). Staging: explicit stage list + `excluded (foreign/other-track):
<files>` when status shows out-of-scope files; never `git add -A` in
that state.
```

carried by: gabe-execute (checkpoint), gabe-commit (staging check)

## Family: Anti-fabrication

*family · numbers and recipes must be produced, not invented*

The last family closes off the places where a model, asked for a number or a code example it doesn't have, will confidently supply a plausible-looking one instead of admitting it wasn't computed — plus the two mechanisms that keep templates from being reconstructed from memory when the real one is missing.

- **Runnable Recipes, Not Placeholders** — Worked examples in reference docs must be commands that actually run, not `[compute this]` stand-ins.
- **Answer-Key Grading** — Grading a human's answer requires a fixed rubric printed before the answer is seen — never a sycophantic eyeball score.
- **Observable-Only Accounting** — Every count in a report (raw/killed/survived, lines saved) is arithmetic on numbers the model actually produced.
- **Missing-Anchor STOP** — A referenced template, catalog, or spec that can't be read stops the skill loudly — never reconstructed from memory.

### Runnable Recipes, Not Placeholders

**Behavior:** worked examples inside reference and analysis docs are concrete, runnable commands with real output shape — not a bracketed placeholder like `[compute co-change frequency]` sitting next to invented-looking percentages that imply the computation already happened.

:::note Where this shows up
This is the corrective half of the [Executed-Evidence Gate](#run-before) above, applied to documentation rather than live runs: `gabe-health`'s worked examples had a literal `[compute co-change frequency]` placeholder sitting next to concrete example percentages, which reads as "this was measured" when it wasn't. The fix is the same rule as E2 applied to docs — a recipe in a skill file must be copy-pasteable and actually produce the shape of output it claims, or it's marked explicitly as illustrative, never left ambiguous.
:::

carried by: gabe-health, gabe-debt (pattern catalog worked examples)

### Answer-Key Grading

**Behavior:** grading a human's answer to a comprehension check requires a rubric printed before the grading happens, so the model can't drift toward inflating a score to be encouraging. This is one arm of the Deterministic Verdicts mechanism above, specialized to the one place a model grades a person instead of code.

:::note Where this shows up
`gabe-teach` grades human answers to its Socratic questions with no rubric, which produces sycophantic inflation (a vague or partially-wrong answer scored full marks) that then poisons the durable knowledge record with false "verified" topics. See [Deterministic Verdicts & Visible Arithmetic](#deterministic-verdicts) — rule 4 (score the lower band when uncertain) is exactly the guard this needs.
:::

carried by: gabe-teach

### Observable-Only Accounting

**Behavior:** every count that appears in a report — findings raw/killed/downgraded/survived, lines of context saved by a refactor, items checked in a scan — is arithmetic performed on numbers the model actually produced this run, never a rounded-sounding estimate offered because the real count wasn't computed.

:::note Where this shows up
This is the accounting half of the [Verify/Kill Pass](#verify-kill) ("Header MUST print: raw N → killed X → downgraded Y → survived Z") generalized to every other place the suite prints a count: the Deferred Scan's `N checked, M matched, K at ≥3` line, and the Progressive Disclosure Budget's line-count savings (see §07) which must be a real diff of before/after line counts, not a guessed round number.
:::

carried by: gabe-review, gabe-myopic, gabe-roast, gabe-debt, gabe-health

### Missing-Anchor STOP

**Behavior:** when a skill references a template, catalog, schema, or command spec it needs and that file can't be read, the correct move is to stop loudly and say so — never to reconstruct plausible-looking contents from memory and proceed as if nothing was missing. This is E6 of the core contract in its full form.

```
If a referenced template/catalog/schema/spec file cannot be read:
STOP and print `⛔ <name> missing at <searched paths> — reinstall the
suite or create it first. Not improvising from memory.`
Never reconstruct hook JSON, tier matrices, pattern catalogs, classifier
rules, or command specs from what they "probably" contain. Where a
degraded partial mode is safe, name it explicitly (e.g. `running Step 1
only — catalog missing`).
```

carried by: all gabe-* wrappers, gabe-init, gabe-plan, gabe-debt, gabe-scope-change

## The mechanism that pays for all the others

*advanced · budget discipline*

Every gate above adds lines to a skill file. Added up across 23 mechanisms, that's a real context cost — and a weak model degrades measurably as its instructions bloat, which is precisely the failure mode this whole catalog exists to fix. The 24th mechanism is the one that keeps the ledger from going negative.

:::note Progressive Disclosure Budget
**Behavior:** the always-loaded part of a skill file carries only the core loop — dispatch table, invariants, gates, output templates — targeted at roughly 500 lines. Rare modes, worked examples, and legacy tables move out to `references/<mode>.md` files loaded only when an explicit trigger line fires. Bulk file reading is delegated to subagents; the main thread keeps synthesis and templates.
:::

```
Skill budget rule: the always-loaded file contains ONLY the core loop —
dispatch table, invariants, gates, output templates (target ≤500 lines).
Rarely-fired modes, worked examples, and legacy/migration tables move to
`references/<mode>.md`, loaded on an explicit trigger line:
  `<trigger condition> → read references/<mode>.md`
Delegate bulk file reading to subagents; keep synthesis and templates in
the main thread. New gates are paid for by relocating prose, not by
growing the file.
```

Applied to two of the suite's largest skills, this refactor freed roughly 800 lines from the code-review skill and over 2,000 from the teaching skill — far more context than all the other mechanisms in this catalog add back in, combined. That's the trade this catalog is built on: every gate above earns its keep because this mechanism clears room for it first.

carried by: gabe-review, gabe-teach, gabe-mockup, gabe-scope (structural refactor) — rule stated once in the suite authoring guide

## Where this connects

This catalog is the detail layer underneath two other pages: [the E1–E7 contract](contract.html) is the compressed, always-loaded summary that seven of these mechanisms distill down into, and [why weak models drift](drift.html) explains the underlying failure pattern that makes all 24 mechanisms necessary in the first place. The [per-skill hardening reference](reference.html) flips the lens the other way — instead of "mechanism → which skills carry it," it answers "this skill → which mechanisms does it carry."
</content>
</invoke>
