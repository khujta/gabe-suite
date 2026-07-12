# Deliverable 5 — Thread Ranking (evidence-weighted)

- **Produced:** 2026-07-08, Fable 5 analysis run. Threads were co-equal by mandate; this is the measured ordering.

## 1. Thread 3 — Evidence / proof per change type (**most pain**)

**Weight:** ~55 of 248 incidents (P1 unverified-claims ~32, P2 missing e2e ~10, P3 green-gates-lie ~7, P7 evidence-infra ~6) — the largest family, present in **both** projects, in **every** work type (UI, backend, docs, icons, deploys), across the **entire** 2.5-month window with no improvement trend. The operator's most emphatic in-session interventions are all here: *"I need you to look for yourself"* (gast `44afa232`, 3× one session), *"We are definitely stopping right now… configure end-to-end testing that actually records the screen"* (gust `c0caef68`), the E1–E7 proof demand (gast `44afa232`). The E1–E7 prose contract was installed suite-wide on 2026-07-02/03 **and the incidents continued** (all of Arc 3 post-dates it) — decisive evidence that the missing home is *enforcement/verification machinery*, not more instruction text.

## 2. Thread 4 — Storybook → React reuse gap (**most expensive per incident**)

**Weight:** ~35–40 incidents (P4 22 + reconstruction-adjacent parts of P5/P6/P14), but with the highest cost-per-incident in the corpus: the v1–v5 spike loop (five delegated rounds discarded), the login/setup rebuild-then-re-rebuild arc, an 11-phase migration whose completion criteria were rejected after the fact (gast `54614bed`), 1.5 hours hand-rebuilding a docsite generator that existed in the sibling repo. Distinct trend: gustify's P4 incidents **stop after 2026-06-30** (CLAUDE.md hard rule + R0 gate) — the fix works where it landed — while gastify re-pays the same lessons in July (no equivalent manifest layer). The gap is now (a) trigger/dispatch, (b) per-project reference resolution — both designed in Deliverable 3.

## 3. Thread 1 — Re-instruction / hand-holding audit (**the root mechanism**)

**Weight:** all 248 incidents are its subject matter, but its *unique* findings are structural: (1) the suite **is** self-improving — aggressively — but improvements land on the wrong surface: the 2026-07-02/03 hardening pass patched 38 installed files in `~/.claude` and never reached the repo or `~/.agents`, so three divergent suites now run under one name (the literal mechanism of the "endless patching" feeling); (2) skills demonstrably don't fire on ad-hoc asks (gabe-mockup 7 loads / ~50 UI episodes; gabe-next 1 load / 27 manual-routing incidents); (3) the suite was indeed built from inside project sessions (gustify carries `GABE-MOCKUP-COMMAND-UPDATE.md` — a suite-change spec authored in a project repo). Ranked below 3/4 only because its pain is mostly *borne through* them; fixing its two mechanisms (reconcile + dispatch) is nevertheless the first step of the change plan.

## 4. Thread 2 — Generalize vs specialize / altitude

**Weight:** ~25–30 incidents map here (P11 project-spec re-statement, P15, plus the shelf-ware/duplication findings). Real but chronic rather than acute: wrong-altitude content (gustify grammar inside the global gabe-mockup skill; Gastify/BoletApp citations inside the global debt catalog), 5,075 chars of always-loaded descriptions (21 % in one skill), ~10 commands with zero observed use, and the operator's named suspects confirmed in *opposite directions* — `gabe-handoff` is correctly global (and the suite's cleanest artifact), while `gabe-teach` is the heaviest file in the suite for 2 observed uses. The "over-standardization" worry (resolved Zustand flag) shows up as real but small: the mockup preset shaped like one app, the B1 incident text copied into every new project.

## 5. Thread 5 — Reference intake (**input, fully consumed**)

Not a pain thread; served its purpose. The four talks' converging leads all survived contact with the evidence: hooks-not-prose (V1) is the Thread-3 conclusion; self-improving artifacts (V2/V3) is confirmed-but-misrouted (Thread 1); always-loaded cost (V1) quantified at 5,075 chars; evidence clips + three-layer verification (V4) became Deliverable 4 §2/§5; the cwc repo supplied the enforcement shape (with skeptic corrections). The one place the external guidance was *rejected*: full babysitting-removal via autonomous routing — the operator's measured working style (50 % ad-hoc, mid-gate policy statements) contradicts it, and the routing fix is deliberately minimal (Deliverable 6 step 3).
