---
name: gabe-red
description: "TDD's first half as a lifecycle beat — after /gabe-plan, before any source edit: inspect the test corpus, declare the cases that make the change necessary (REUSE an id vs mint a NEW one), write them against returning stubs, run them, and COMMIT the failure. Usage: /gabe-red [phase]"
when_to_use: "The phase is planned and about to be executed — put the failing test cases in place first: declare case ids, prove RED by assertion, commit the red checkpoint. Refactors declare GUARDs instead of a fake red; genuinely un-testable phases self-skip with an enumerated code."
metadata:
  version: 1.3.1
---

# Gabe Red — the failing state, given an address

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings. Full text: `../gabe-docs/references/execution-contract.md` (if missing, E6 — STOP).

## The intention (why this beat exists)

*A beat asserts one terminal state; TDD has two contradictory terminal states of the same measurement. No wording inside execute can end with "the tests fail" — so red gets its own beat, and its deliverable is a COMMIT whose declared cases fail by assertion. Red is not perishable; it is unaddressable — the commit gives it an address anyone can re-derive later. A test that has never been observed red is not known to test anything.*

This beat decides what the change must be TRUE OF while the answer can still shape the design. It authors no documentation — it writes test code and produces a commit. **Tripwire:** if this beat ever prints a summary a developer reads instead of a failure a developer must fix, it has become ceremony — delete it.

## Ordering gate

Runs after `/gabe-plan` (needs the phase row + its `proof_type`) and **before execute's first source Write** for the phase. `/gabe-next` routes here when the phase row carries a `Red` cell ⬜ (projects without the column are untouched — missing column = always-✅, the same degradation as `Center`).

## Procedure (deep spec: `references/red-spec.md` — binding)

1. **Read the phase** — description, tier, `proof_type`. No test-shaped proof possible → the skip/guard decision (spec §Skip codes) — **never a fake red**.
2. **Scan the corpus** (E4): grep existing C-ids + search tests related to the touched behavior. Print the `Searched:` line — an empty one invalidates the pass.
3. **Decide per case:** REUSE an existing case (cite `C<N>`; bump to `v<K+1>` ONLY if the claim itself must change — a re-run never bumps) vs NEW (allocate `max(grep C-ids)+1`).
4. **Write the cases** — id inside the test NAME (`test_..._C147v2` / `it('C147v2 · ...')`). Where the subject doesn't exist yet, add a **returning stub** (returns a wrong-but-typed value; NEVER raises — a raising stub blinds the tautology guard).
5. **Run them.** Classify each case: **RED** (fails by assertion — evidence) · **NOT-RED** (import/collection error — non-evidence, fix before proceeding) · **TAUTOLOGY** (passes on unchanged code — halt; the case asserts nothing).
6. **Commit the red checkpoint** through `/gabe-commit` with the `RED:` trailer + `Cases:` line (formats in the spec). Write the phase's `Cases:` record into PLAN.md Phase Details, tick the `Red` cell ✅, mirror PLAN.json (E5).
7. **Report** (E7): ids declared (new/reused/bumped/guards), the red run's output line, the red commit sha.

**min_cases by tier** (the tier IS the verification level — no parallel system): `mvp` 1 · `ent` 3–6 (+edges) · `scale` per plan's matrix (+fuzz/load). Refactors: `GUARD:` list, no new cases required.

## Output contract

Per phase, on completion: a committed red checkpoint (`RED:` trailer) OR a guard-only record OR an enumerated skip code — never silence; the `Cases:` line in PLAN Phase Details naming every id; the `Red` cell ✅ in PLAN.md + PLAN.json; the failure output quoted verbatim in the report. This skill states no count or verdict beyond what the run printed (anti-curation).
