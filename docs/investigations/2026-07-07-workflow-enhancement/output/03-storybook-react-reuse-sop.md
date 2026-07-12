# Deliverable 3 — Storybook → React Reuse SOP (Thread 4)

- **Produced:** 2026-07-08, Fable 5 analysis run. Design only — no suite files modified.
- **Goal:** make "spike in Storybook → validate → lift into the real app → wire data" a first-class, repeatable operation that never regenerates from scratch.

## 1. The failure, reconstructed from transcripts (three arcs)

**Arc 1 — "the showcase is not the app" (gustify `c0caef68`, 2026-06-06/07).**
Phase 37–39 shipped `/login` and `/setup` rendering the raw Storybook showcase (state-tab chrome, meta panels). Operator: *"I don't want to implement the storybook as a frontend itself."* The AI then swung to the opposite failure — rebuilding the screens as **simpler original markup**: *"we are not there yet. It's super different. Why did we hallucinate it."* The fix that stuck became **D86 "wire, don't rebuild"**: the live screen renders the actual showcase component with additive, default-off props (`live`/`chromeless`), byte-identical stories. Follow-on defects in the same arc each produced a durable artifact: device-frame chrome leaking to production (chromeless pattern), the archived Home screen guessed as landing route → **`docs/rebuild/WEB-SCREEN-MAP.md`** (D89), ad-hoc spot-checks missing deployed layout breakage → **`WEB-LAYOUT-POLICY.md` + recorded 3-viewport layout e2e**, and finally the operator asking to persist the whole loop → **gabe-mockup `refine` mode (RF1–RF6)**. Then — the tell — the operator *still* had to say: *"Consider using… the Gabe mockup refine for every screen that we implement"* (the skill doesn't self-trigger).

**Arc 2 — the spike recreate loop (gustify `96070dd4` + `519cc314`, 2026-06-27→30).**
Five rounds of card-design spikes (v1–v5, some via delegated workflows) hand-built stand-in shells (`FullCardShell`, `TimeEffortDimensionSpike`…) instead of rendering the real `ExploreSuggestionCard`. Operator: *"Why are we trying to recreate everything in the storybook? We already have the layout in the storybook somewhere."* Fixes: an **R0 hard-fail reuse gate** added to gabe-mockup the same night, plus **`apps/web/CLAUDE.md`** (learned 2026-06-30 via `/claude-md learn`): *"a `FooCardShell` mimicking `FooCard` is a DEFECT"*, naming five real components to reuse.

**Arc 3 — recurrence in the twin *after* hardening (gastify `54614bed` + `44afa232`, 2026-07-01→08).**
DF2 `/items` was rebuilt against the **wrong design-lab reference** (spending vs history) as a simplified recreation — *"That's why we created the Skills… do not recreate the screens."* CA4 `/reports` was declared a "STRUCTURAL MATCH" without ever rendering the comparison — *"I need you to look for yourself."* A consolidation spike was built as an **HTML artifact** instead of Storybook. Each was corrected and re-encoded (ADOPT-don't-recreate principle, D100 side-by-side evidence), i.e. the same lessons were **paid for twice, once per twin**.

## 2. Root-cause analysis (why the round-trip breaks)

| # | Root cause | Evidence |
|---|-----------|----------|
| RC1 | **The skill doesn't fire.** Rules live in gabe-mockup, but ad-hoc asks ("make a spike", "build the reports screen") bypass it — 7 skill loads against ~50 UI episodes; operator had to yell *"Use the Gabe mockup skill. We ready-tuned that skill a lot"* (gast `88332774`) | usage tally; incidents #52, #168, #191 |
| RC2 | **Reference resolution is project knowledge with no reliable home.** Which story/design-lab file is canonical for screen X lives in gustify's WEB-SCREEN-MAP (post-D89) and gastify's WEB-MIGRATION.md — different files, different shapes; the AI guessed (archived Home; spending-vs-history) whenever the map was missing/unconsulted | incidents #188, #18 |
| RC3 | **Global skill carries one project's grammar.** P7 sheet insets (`pt-[44px]`), D86/D92 citations, "pantry add-ingredient sheet" are gustify facts inside the suite-global SKILL.md — unusable (and misleading) in gastify's design-lab layout | skills/gabe-mockup/SKILL.md:240–264 |
| RC4 | **Fidelity claims are not render-gated.** "Structural match" asserted from code reading; side-by-side comparison happened only on demand, three times in one session | incidents #7, #9, #51; P1 cluster |
| RC5 | **The two twins have structurally different lifts.** gustify lifts *within* one package (spike → `features/<area>/model` promotion, e.g. flavor-octagon commit `5ab983f1`); gastify lifts *across* packages (design-lab → `web/`, a port with its own token-generation step). One SOP must parameterize this | repo scans §1/§3 both |

## 3. The SOP — one operation, five steps

**Name:** the *lift* operation. Trigger: any request to create/modify UI in a React-first project (see §5 dispatch). Shape is suite-global; every `<angle-bracket>` value comes from the per-project manifest (§4).

```
L0 — RESOLVE (mechanical, hard gate)
   Read <screen_map>. Resolve target → canonical reference (story file/id + status).
   Unmapped or archived → STOP: "not mapped to a canonical reference — map it or
   confirm NEW." Print the E4 line: REUSE <path> | EXTEND <path> | NEW (searched
   <reuse_roots> — none fit). A NEW verdict requires the search evidence.

L1 — INVENTORY (mechanical)
   Open the reference. List its real component imports (not pixels): design-system
   atoms/molecules/organisms + feature components + model modules. Output a
   REUSE LEDGER: component → keep / extend(prop) / genuinely-new.

L2 — SPIKE (only if exploring)
   New/uncertain design → spike story under <spikes_root>, composing the L1
   inventory components. A stand-in shell that mimics an existing component is a
   DEFECT (apps/web/CLAUDE.md rule, promoted suite-wide). Options stay story-only
   until the operator picks (existing R8/R9 discipline).

L3 — LIFT (the D86 move, parameterized by <lift_kind>)
   in-tree (gustify): production screen RENDERS the showcase component; additive
     default-off props (live/chromeless); stories stay byte-identical; pure logic
     graduates spike → features/<area>/model/ (flavor-octagon precedent).
   cross-package (gastify): port = faithful adoption of the design-lab component +
     its token/asset maps (categoryTokens, PixelIcon catalog) into <app_root>;
     "adopt, don't re-author" — same file structure, real data wired behind the
     same props. Then archive the spike (R4) and update <screen_map>.

L4 — WIRE + VERIFY (render-gated, from the manifest)
   Wire real data behind the lifted component. Run <verify_commands> (typecheck,
   build, build-storybook, test-storybook, token-class check where defined). Then
   the render gate: capture the LIVE screen (not the showcase story) at the
   manifest's breakpoints and produce the side-by-side (reference vs live) —
   this is the Evidence Doctrine's frontend proof form (Deliverable 4). A defect
   found here re-enters at L3, never by re-authoring.
```

Steps L0/L1 are the anti-recreate gates (kills Arc 2/3). L3 is the anti-rebuild move (kills Arc 1). L4 is the anti-"structural match" gate (kills RC4). The loop for already-shipped screens (`refine` RF1–RF6) is the same machine entered at L4 with the fix recipes — it stays, re-expressed over manifest values instead of gustify constants.

## 4. The manifest — what a project must declare

One block (proposed: `.kdbp/MOCKUP.md`, or a `mockup:` section in BEHAVIOR.md — operator's call; keep it ONE page):

```yaml
mockup_tool: storybook            # the "medium = receiving platform" rule, per project
storybook_root: apps/web          # gastify: design-lab
storybook_port: 6006              # gastify: 6008
lift_kind: in-tree                # gastify: cross-package (design-lab -> web/)
app_root: apps/web                # gastify: web/
screen_map: docs/rebuild/WEB-SCREEN-MAP.md        # gastify: docs/mockups/WEB-MIGRATION.md
design_ref: docs/rebuild/ux/DESIGN.md             # gastify: (to create)
layout_policy: docs/rebuild/WEB-LAYOUT-POLICY.md  # gastify: (to create)
reuse_roots: [apps/web/src/design-system, apps/web/src/features/*/components, apps/web/src/features/*/model]
spikes_root: apps/web/src/features/<area>/spikes   # gastify: design-lab/src/design-system/_spikes
verify_commands: [npm run typecheck, npm run build, npm run build-storybook, npm run test-storybook, npm run check:token-classes]
capture: {tool: playwright-video+ffmpeg | pagecast, breakpoints: [mobile, tablet, desktop]}
reference_projects: []            # gastify: [{path: ~/projects/apps/gustify, inherit: [icon-params, chrome-grammar]}]
legacy_reference: null            # gastify: {path: <BoletApp root>, rule: read-before-building-equivalents}
```

Everything above is a **fact that differed between the twins in the evidence**. Nothing above is a procedure — procedures stay in the skill. This is the §3 "global skill + per-project manifest" pattern, instantiated.

**What leaves the global skill:** the P7 sheet-inset recipe, named gustify components, D86/D92 provenance → gustify's `.kdbp/RULES.md` / `DESIGN.md` (where R6 and the Full-Surface Sheet grammar already live — today the same rule exists in 4 places; after the split it exists in 1 per layer).

## 5. What kills from-scratch regeneration (the dispatch fix — RC1)

Content changes alone won't fix a skill that isn't loaded. Three cheap, layered triggers (design; operator picks any/all):

1. **Description-level dispatch.** gabe-mockup's installed description explicitly claims ad-hoc phrasing: "use for ANY spike/mockup/screen/UI-component request in a project with a mockup manifest, not only /gabe-mockup invocations."
2. **Project CLAUDE.md hard rule** (the layer that *demonstrably* fired in gustify after 2026-06-30): one line — "UI work MUST run the gabe-mockup lift SOP; a stand-in shell is a defect" — added by gabe-init to both twins' CLAUDE.md/`apps-web` nested memory. gastify lacks this today; gustify's post-rule incident rate for P4 dropped (arc-2 style incidents do not recur in gustify sessions after 2026-06-30; the July recurrences are all gastify).
3. **Hook backstop (optional, Evidence-Doctrine-scoped):** PostToolUse on Write/Edit of `*.stories.tsx`/new component files when no manifest/screen-map read is on record this session → inject a one-line reminder. This is the ponytail rung-2 pattern as a boundary check, not a blocker.

**Adversarial-verification note.** The skeptic attack on this SOP ("the hardened skill already had REUSE LEDGER + STRUCTURAL INVENTORY and gastify incidents still happened — content doesn't fix invocation") is *correct* and is why §5 exists and ships **first** in the sequenced plan; §3's content consolidation is second. The STOP-gate friction concern (anti-goal B) is bounded: L0 stops only on *unmapped-or-archived* references — a genuinely new screen answers one question ("confirm NEW") and proceeds.
