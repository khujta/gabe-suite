# Gabe Mockup — react-story
> Split from skills/gabe-mockup/SKILL.md (B2 migration, 2026-07-09). Binding for this mode.

### React + Storybook discipline

Projects can opt into a React-first mockup surface when they are building the real web frontend rather than standalone HTML artifacts. The workflow marker is `docs/rebuild/ux/REACT-STORYBOOK-WORKFLOW.md`. If that file exists and `apps/web/package.json` is present, `/gabe-mockup` MUST use React + Storybook mode for new UI work unless the user explicitly requests the legacy HTML recipe.

Rules for React + Storybook projects:

1. **No new static HTML mockups.** Existing `docs/mockups/**` files are visual references only. Do not create new `docs/mockups/**/*.html` in this mode.
2. **Real frontend first.** Implement production UI in the app's real React tree. When `docs/rebuild/ux/STORYBOOK-STRUCTURE.md` exists, read it and follow its physical taxonomy before creating files. The current preferred shape is `apps/web/src/design-system/{atoms,molecules,organisms}` for shared UI and `apps/web/src/features/<area>/{components,screens,model,spikes}` for feature UI.
3. **Design reference guard.** If `docs/rebuild/ux/DESIGN.md` exists, read it before React visual/layout work and treat it as the local design grammar for taste, token semantics, layout, feature screen conventions, and agent do/don't rules. Before building filters, settings selectors, history filters, or other dense configuration UI, look for reusable local Storybook organism components and reuse the project's settled filter/configuration flow before creating feature-local geometry (print the REUSE LEDGER — see react-story R1). When the user asks for a popup, sheet, or edit flow to cover the whole screen, reuse the project's full-surface sheet organism/helper instead of mounting a small modal inside padded content; mobile/tablet sheets should cover the full app frame, desktop sheets should cover the right content pane, and the top-right `X` should remain the close/cancel affordance. If `DESIGN.md` is missing, warn with `Run /gabe-mockup design-ref to generate docs/rebuild/ux/DESIGN.md` and continue only if the user still wants to proceed; do not auto-generate it during `react-story`.
4. **Stories are the inspection and correspondence surface.** Every new screen/component batch gets colocated `*.stories.tsx` coverage for mobile, tablet, desktop, and relevant states (default, loading, error, empty, first-time, disabled when applicable). Component stories expose the parts; composed screen stories show the assembled product surface. A single responsive screen implementation with curated platform/state story snapshots is preferred over separate mobile/tablet/desktop screen components.
5. **Tokens flow through Tailwind.** Styling uses Tailwind classes backed by `shared/design-tokens.ts`; do not introduce ad hoc hex colors in React components. Do not invent `pg-*` token numbers: if a class is not backed by the project token map and emitted into compiled CSS, it is a layout bug. Use an existing token key, or an explicit arbitrary pixel utility only for documented frame constants such as phone notch offsets.
6. **Visual grouping rule.** Do not add an outer bordered grouping container around controls unless it is a real product card. Layout-only wrappers are fine; visible borders/backgrounds/shadows must belong to meaningful product surfaces.
7. **Reference contract — MUST-MATCH / MAY-DIFFER.** For any screen with a reference: MUST MATCH — section inventory, layout grammar, component composition, state set, copy semantics. MAY DIFFER — DOM/class names, data flow, a11y idioms, file structure. "Idiomatic React" never licenses keeping the OLD screen's structure: delivering a restyle where the task says port/rebuild is a deliverable-class downgrade that requires an explicit user decision line. RF4 reuses this table verbatim.
8. **Storybook taxonomy.** Story titles should mirror the physical taxonomy: `Design System/{Atoms,Molecules,Organisms}`, `Features/<Area>/Components`, `Features/<Area>/Screens`, and `Features/<Area>/Spikes` for active playgrounds. Use `Flows/` only after a real multi-screen journey story exists. Prefer direct aliases such as `@app/*`, `@design-system/*`, `@features/*`, `@lib/*`, and `@shared/*` when the project defines them.
9. **Option exploration stays in stories first.** When the user asks to compare, decide, or see alternatives, create story-only variants or spike stories first. Keep production screen defaults unchanged until the user chooses or explicitly asks to apply the preferred option.
10. **Component-first spikes are allowed inside a screen batch.** For uncertain areas, build isolated component stories, add a composed spike story that assembles them, browser-check it, then wire the approved/recommended version into the real screen only when requested.
11. **Verification gate.** A batch is not complete until these commands pass from `apps/web`: `npm run typecheck`, `npm run build`, `npm run build-storybook`, and `npm run test-storybook`. If the project provides a token-class coverage check, run it after `build-storybook`; if it provides a Storybook navigation/browser smoke script, run it too. Browser checks for visual work must include frame gutters, fixed footers, full-surface sheets, and right/bottom clipping, not only click behavior. Run the deterministic Storybook correspondence report from this skill, report any findings, and offer operator options instead of treating findings as a hard failure by default. Confirm `git diff -- docs/mockups` does not contain new static HTML mockups.
12. **Animation is verified by sampling, not by eye or end-state.** For any transition / morph / expand-collapse / reveal, "it renders" is not proof. Drive the *running* Storybook with a headless browser (Playwright against `iframe.html?id=<story-id>`) and SAMPLE the rendered animation through time: read `getComputedStyle(el).transform` (or `getBoundingClientRect`) at several timestamps across the transition window to prove it **interpolates** (travels / grows / fades continuously) rather than snapping, and sample the **first frame(s) right after the trigger** to catch reflow flashes, re-stacks, and right/bottom clipping that a settled screenshot hides. Report the sampled trajectory back to the user as evidence (e.g. `scaleX 0.61→0.96→1, translate 341px→0`; `sibling height at 16/33ms = 0 → no flash`). Note `el.style.transform` returns the *set* value, so sample `getComputedStyle` for the interpolated matrix. For a layout morph without an animation library, use **FLIP** (measure First rect → invert the element to its old rect with `transition:none` → force reflow → play to identity with a transition); collapse the OTHER items' layout **instantly** (jump `max-height`/display, ease only opacity) so the first paint never flashes a re-stacked grid and the FLIP measures the true final slot. This sampling loop is what turns "looks about right?" into a verifiable, iterate-until-beautiful result.

Backward-compatible dispatch:

1. If `docs/rebuild/ux/REACT-STORYBOOK-WORKFLOW.md` exists and `apps/web/package.json` exists, default new `/gabe-mockup` screen work to `react-story`.
2. Else if `.kdbp/PLAN.md` or existing phase state points to `docs/mockups/**`, use the legacy static HTML phase recipes.
3. Else ask which workflow should be active before generating files.

### React + Storybook structure and traceability

The React Storybook surface is both a mockup viewer and an implementation map. If the project has `docs/rebuild/ux/STORYBOOK-STRUCTURE.md`, that file is the local taxonomy contract and should be read before adding, moving, or naming React UI files.

Use this physical structure when the project has adopted it:

```text
src/
  app/
  design-system/
    atoms/
    molecules/
    organisms/
  features/
    <area>/
      components/
      screens/
      model/
      spikes/
```

Use this Storybook hierarchy:

```text
Design System/
  Atoms/
  Molecules/
  Organisms/

Features/
  <Area>/
    Components/
    Screens/
    Spikes/

Flows/
  <Area>/
```

Conventions:

- Put shared primitives, app shell, navigation, header/profile controls, full-surface sheets, and reusable state widgets under `src/design-system/**` with matching `Design System/` stories.
- Put product-specific cards, headers, filters, rows, summary panels, sheets, and feature-owned helpers under `src/features/<area>/components/**` with matching `Features/<Area>/Components` stories.
- Put composed screen containers and view assemblies under `src/features/<area>/screens/**` with matching `Features/<Area>/Screens` stories.
- Put feature-owned catalogs, mock state, and helper logic under `src/features/<area>/model/**`.
- Put active option playgrounds and comparison stories under `src/features/<area>/spikes/**` with `Features/<Area>/Spikes` titles. Do not leave obsolete spike-only stories in the main component tree.
- Use direct aliases when available (`@app/*`, `@design-system/*`, `@features/*`, `@lib/*`, `@shared/*`). Avoid broad barrel files unless the project already established them.
- Keep one responsive screen implementation where practical; expose mobile, tablet, desktop, and state coverage as curated story exports and controls.
- Add `Flows/` only when a story actually walks across multiple screens. Do not create empty flow groups.
- When extracting shared chrome, expose the shared contract with component stories first; do not rewrite every screen until the boundary is clear and the user has accepted it.
- Story descriptions should reference the source screen/spec/reference path when useful and should name any option/spike status so reviewers know whether a story is exploratory or applied.

### Mode: `design-ref`

**Purpose.** Generate or refresh a React-first project's repo-owned design reference at `docs/rebuild/ux/DESIGN.md`. This mode encodes the project's design grammar in the Refero-style file shape: taste thesis, source map, token semantics, layout grammar, component grammar, feature screen conventions, Storybook encoding, and agent do/don't rules. It is a documentation/standards mode, not a UI implementation mode.

**Invocation:**
```
/gabe-mockup design-ref
/gabe-mockup design-ref --refresh
/gabe-mockup design-ref --force
```

**Pre-conditions.**
- `docs/rebuild/ux/REACT-STORYBOOK-WORKFLOW.md` exists.
- `apps/web/package.json` exists.
- `shared/design-tokens.ts` exists.
- `apps/web/tailwind.config.ts` exists.
- If `docs/rebuild/ux/STORYBOOK-STRUCTURE.md` exists, it has been read and treated as the Storybook taxonomy contract.
- Existing `docs/mockups/**` files are reference-only; this mode must not create static HTML mockups.

**Inputs to inspect.**
- `shared/design-tokens.ts` for palette, semantic colors, typography, spacing, radius, borders, shadows, and motion.
- `apps/web/tailwind.config.ts` for the executable Tailwind token mapping.
- `docs/rebuild/ux/REACT-STORYBOOK-WORKFLOW.md` and `docs/rebuild/ux/STORYBOOK-STRUCTURE.md` for workflow and taxonomy rules.
- Active handoff/status/KDBP docs when present, especially current screen state and verification guidance.
- `apps/web/src/design-system/**` for shared primitives, molecules, organisms, app shell, and asset catalogs.
- `apps/web/src/features/**` for feature-owned components, screens, state models, and spikes.
- `apps/web/src/flows/**` for real multi-screen journey stories.
- Optional external/user-provided style references. Refero-style sources are used only for document structure; never copy another product's visual identity.

**Outputs.**
- `docs/rebuild/ux/DESIGN.md`
- Link from `docs/rebuild/ux/REACT-STORYBOOK-WORKFLOW.md` to `DESIGN.md` when missing.
- Link from `docs/rebuild/ux/STORYBOOK-STRUCTURE.md` to `DESIGN.md` when missing.
- Optional short handoff/status/KDBP note when the repo already tracks active UX resume docs.
- No production component changes.
- No new `docs/mockups/**/*.html` files.

**Standard `DESIGN.md` sections.**
1. `Purpose`
2. `Refero Pattern Extracted` or `Style File Pattern`
3. `Style Thesis`
4. `Source Map`
5. `Tokens`
6. `Layout Grammar`
7. `Component Grammar`
8. `Feature Screen Grammar`
9. `Storybook Encoding`
10. `Agent Rules`
11. `Maintenance`

**Recipe steps.**

1. **D1 — Detect React-first workflow.** Confirm the pre-conditions above. If any required React-first marker is missing, follow Error recovery below.
2. **D2 — Read current project grammar.** Inspect tokens, Tailwind mapping, Storybook taxonomy, current screen/component trees, and active handoff/status docs. Extract what exists; do not invent a new visual identity.
3. **D3 — Extract style-file shape.** Use Refero-style structure as the documentation model: short thesis, semantic token tables/rules, layout grammar, component recipes, feature conventions, and do/don't rules. Cite any external references briefly if they were used.
4. **D4 — Generate or update `DESIGN.md`.**
   - If missing, create the full standard file.
   - If present and no flag is passed, leave the file in place unless required links are missing; print that `--refresh` or `--force` is needed to change content.
   - With `--refresh`, replace the standard sections listed above and preserve any top-level project-specific sections not in the standard list.
   - With `--force`, rewrite the entire file from the current project grammar.
5. **D5 — Cross-link docs.** Ensure workflow and Storybook structure docs point to `docs/rebuild/ux/DESIGN.md`. Keep the links short; do not duplicate the design reference content in those docs.
6. **D6 — Bookkeeping.** If the repo has active handoff/status/KDBP docs, add a short dated note that `DESIGN.md` is now the design-reference surface and name the verification performed. When the project settles a reusable visual pattern during design-ref or React Storybook work, record it in `DESIGN.md`, add or update the relevant KDBP decision/rule, and expose a component story for future reuse.
7. **D7 — Verify.** Run the design-reference verification gate below. If this mode only touches docs, do not run the full app build unless Storybook taxonomy, story files, or app code changed.

**Verification gate.**
- `git diff --check` passes.
- `find docs/mockups -type f -name '*.html' -newer docs/rebuild/ux/DESIGN.md` prints no output when `DESIGN.md` was created or refreshed.
- `rg -n "docs/rebuild/ux/DESIGN.md" docs/rebuild/ux/REACT-STORYBOOK-WORKFLOW.md docs/rebuild/ux/STORYBOOK-STRUCTURE.md` finds links when those files exist.
- If Storybook taxonomy or story references changed, run `npm run build-storybook` from `apps/web`, then run `check-storybook-correspondence.mjs --web-dir apps/web`.

**Idempotency rules.**
- Default run is create-if-missing plus link repair only.
- `--refresh` updates standard sections and preserves extra top-level sections.
- `--force` rewrites `DESIGN.md` from current repo sources.
- Never create or modify `docs/mockups/**/*.html`.
- Never change production React components from this mode.

**Error recovery.**
- **React marker missing** -> exit with `⚠ design-ref requires docs/rebuild/ux/REACT-STORYBOOK-WORKFLOW.md. Use legacy handoff docs or adopt React Storybook workflow first.`
- **`apps/web/package.json` missing** -> exit with `⚠ design-ref requires apps/web/package.json.`
- **`shared/design-tokens.ts` missing** -> exit with `⚠ design-ref requires shared/design-tokens.ts. Run token extraction first.`
- **`apps/web/tailwind.config.ts` missing** -> exit with `⚠ design-ref requires apps/web/tailwind.config.ts.`
- **Existing `DESIGN.md` has unclear custom structure and `--refresh` cannot merge safely** -> stop, summarize the ambiguity, and ask whether to use `--force` or preserve the file.

### Mode: `react-story`

**Purpose.** Implement a screen or screen batch as production React + Tailwind code in `apps/web`, with Storybook 9/10 stories as the mockup viewer. The project's installed Storybook major version is authoritative. This mode replaces new static HTML mockup authoring for projects that carry the React Storybook workflow marker.

**Invocation:**
```
/gabe-mockup react-story <screen-or-batch>
/gabe-mockup react-story <screen-or-batch> --from=<reference-html-or-spec>
/gabe-mockup react-story <screen-or-batch> --force
```

**Auto-dispatch.** If the user runs plain `/gabe-mockup` in a repo with both `docs/rebuild/ux/REACT-STORYBOOK-WORKFLOW.md` and `apps/web/package.json`, route new screen work to this mode unless the user explicitly asks for legacy HTML.

**Pre-conditions.**
- `apps/web/package.json` exists.
- `shared/design-tokens.ts` exists and is importable by `apps/web/tailwind.config.ts`.
- Storybook exists at `apps/web/.storybook/` OR this mode is allowed to scaffold it.
- If `docs/rebuild/ux/STORYBOOK-STRUCTURE.md` exists, it has been read and treated as the taxonomy contract.
- If `docs/rebuild/ux/DESIGN.md` exists, it has been read and treated as the local design grammar; if missing, warn `Run /gabe-mockup design-ref to generate docs/rebuild/ux/DESIGN.md` but do not auto-generate it.
- Existing visual references live in `docs/mockups/**` or the user supplies a spec path.

**Outputs.**
- Shared implementation under `apps/web/src/design-system/{atoms,molecules,organisms}/**` when a primitive/pattern is reusable across features.
- Feature implementation under `apps/web/src/features/<area>/{components,screens,model,spikes}/**` when UI or mock state is product-specific.
- Storybook stories beside the implementation: `*.stories.tsx`, with title paths following `Design System/`, `Features/<Area>/Components`, `Features/<Area>/Screens`, and `Flows/` only for real journeys.
- Active option playgrounds under `Features/<Area>/Spikes`, not in the main component story tree.
- Story docs descriptions that cite the reference HTML/spec path when one exists.
- Story-only option variants and composed spike stories when the user is comparing layouts or interaction approaches.
- Browser-check screenshots for visual or option-based screen changes.
- Optional workflow docs/bookkeeping updates when KDBP is present.
- **No new `docs/mockups/**/*.html` files.**

**Recipe steps.**

1. **R1 — Detect workflow, design reference, taxonomy, and reusable patterns.** Confirm marker file `docs/rebuild/ux/REACT-STORYBOOK-WORKFLOW.md`, `apps/web/package.json`, and `shared/design-tokens.ts`. If `docs/rebuild/ux/DESIGN.md` exists, read it before visual/layout work and follow it as the local design grammar. Before building any filter, settings selector, history filter, or dense configuration menu, scan the local `Design System/Organisms` stories and `apps/web/src/design-system/organisms` for a reusable filter/configuration flow and reuse it unless the user requested a spike to replace that pattern. If `DESIGN.md` is missing, print `⚠ Design reference missing. Run /gabe-mockup design-ref to generate docs/rebuild/ux/DESIGN.md.` and continue only if the user still wants this batch without the reference. If `docs/rebuild/ux/STORYBOOK-STRUCTURE.md` exists, read it and follow it as the local taxonomy contract. If required workflow markers are missing, follow Error recovery below.

   Before creating ANY new component file, print a REUSE LEDGER:
   ```
   Searched: <story titles / globs / greps checked>
   Verdict: REUSE <path> | EXTEND <path> via additive default-off prop (byte-identical when absent) | NEW — none fits because <1 line>
   ```
   A missing ledger or empty Searched line = the scan was skipped; re-authoring a lookalike of an existing organism is a DEFECT, not a style choice.
2. **R2 — Ensure Storybook harness.** If `apps/web/.storybook/` is absent, install/configure Storybook with `@storybook/react-vite` and the Storybook Vitest addon, using the project's current package version constraints. Add scripts: `storybook`, `build-storybook`, `test-storybook`. Keep existing app scripts intact.
3. **R3 — Read reference.** Open the reference HTML/spec for the screen/batch. Extract visual intent, state names, platform variants, data assumptions, and safety-critical copy. Treat the HTML as a visual/state reference, not a DOM contract. Then emit the reference's STRUCTURAL INVENTORY as a checklist BEFORE writing code — one row per section/region + the state set + load-bearing copy: `INVENTORY <screen>: [ ] header (title rule) [ ] section switcher [ ] list rows [ ] empty state … states: default/loading/empty/error`.
4. **R4 — Classify user intent.** Decide whether the request is an implementation batch, an option-exploration batch, a component-first spike, or shared chrome/component extraction. If the user asked to compare or decide, keep production defaults unchanged and put alternatives in Storybook first.
5. **R5 — Plan component split.** Identify production primitives worth extracting and place them according to the local taxonomy: shared UI in `design-system`, feature-specific UI in `features/<area>/components`, composed screens in `features/<area>/screens`, mock catalogs/helpers in `features/<area>/model`, and active playgrounds in `features/<area>/spikes`. Do not add an abstraction for one-off markup.
6. **R6 — Implement React/Tailwind.** Write or update React components using Tailwind classes backed by `shared/design-tokens.ts`. Do not use ad hoc hex colors. Do not invent `pg-*` class names that are not backed by the project token map; use an existing token key, or an arbitrary pixel utility only for an intentional documented frame constant. Do not add decorative outer bordered wrappers around grouped controls unless the reference/product semantics make that surface a real card.
7. **R7 — Add traceable stories.** Add colocated stories covering mobile, tablet, desktop, and relevant states: default, loading, error, empty, first-time, disabled when applicable, and locale-sensitive variants where relevant. Use the Storybook taxonomy from "React + Storybook structure and traceability". Reusable pieces get their own component stories; composed screens assemble those pieces. Prefer one responsive screen implementation with curated platform/state snapshots over separate per-platform screen components.
8. **R8 — Handle option exploration.** For layout, chrome, navigation, card, filter, or interaction alternatives, add explicit option stories (for example `Layout Options`) and keep the current screen behavior as the default unless the user asks to apply a chosen option. Label exploratory stories as options/spikes in story parameters or descriptions.
9. **R9 — Handle component-first spikes.** For uncertain screen areas, create isolated component stories first, then a composed spike story that shows how the proposed parts work together inside the target screen. Browser-check the spike before wiring it into the real screen. Wire the approved/recommended version only when requested.
10. **R10 — Wire app preview only when useful.** It is acceptable to update `apps/web/src/App.tsx` to show the current pilot/demo screen, but stories remain the canonical mockup inspection surface.
11. **R11 — Update docs/bookkeeping.** If the repo has KDBP or rebuild docs, update the active phase/runbook with the created stories, applied decisions, remaining options, and verification results. Keep workflow docs short and link to Storybook stories rather than duplicating implementation details. When a reusable visual pattern is promoted, record the rule in `DESIGN.md`, a KDBP decision/rule where available, and a component story that future `/gabe-mockup react-story` runs can find.
12. **R12 — Verify.** From `apps/web`, run `npm run typecheck`, `npm run build`, `npm run build-storybook`, and `npm run test-storybook`. If the project exposes a token-class coverage check, run it after Storybook has compiled; if it exposes an additional Storybook navigation/browser smoke script, run it too. Run `check-storybook-correspondence.mjs` after the Storybook build and report its `PASS` or `REVIEW` output with operator options; do not make `REVIEW` findings a hard failure unless the project explicitly uses `--strict`. For screen-level visual work, also open Storybook in a browser and check mobile, tablet, and desktop stories for frame gutters, fixed footer insets, full-surface sheet coverage, and right/bottom clipping. Run the R3 inventory tick + side-by-side capture as part of this step. Save screenshot evidence for visual changes, option comparisons, and composed spikes. Do not mark the batch complete until all required gates pass.

**Verification gate.**
- `npm run typecheck` passes from `apps/web`.
- `npm run build` passes from `apps/web`.
- `npm run build-storybook` passes from `apps/web` (normal Storybook chunk-size warnings are acceptable if the build exits 0).
- `npm run test-storybook` passes from `apps/web`.
- Project token-class coverage passes when available, proving source `pg-*` utilities are emitted by compiled Storybook CSS.
- Storybook browser check passes for screen-level visual work across mobile, tablet, and desktop stories, including gutters, sheets, fixed footers, and clipping.
- Any project-provided Storybook navigation/browser smoke script passes.
- The deterministic Storybook correspondence report is run against `storybook-static/index.json`; `PASS` means no action, and `REVIEW` findings are reported with operator options.
- **Reference fidelity:** every R3 INVENTORY row is ticked `Y | N | waived-by-user` against the BUILT screen, and one same-viewport side-by-side screenshot pair (reference | built — state the px width) is saved per screen. Any unwaived `N` → the batch is NOT complete, regardless of green builds.
- Screenshot evidence is saved or referenced for visual changes, option comparisons, and composed spikes.
- `git diff -- docs/mockups` shows no new static HTML mockup files for the batch.

**Idempotency rules.**
- If a target screen/story already exists, update it only when requested or when the change is an additive state/story in the same batch.
- If adding comparison options, preserve the current production default until the user chooses an option or explicitly asks to apply one.
- If adding shared chrome or shared primitives, expose them in component stories first and avoid broad screen rewrites unless the user has accepted the boundary.
- Do not overwrite user-edited components without first reading them and preserving their intent.
- Do not run broad formatters across `apps/web` unless the project already requires them and they are scoped to touched files.

**Error recovery.**
- **`apps/web/package.json` missing** → exit with `⚠ React Storybook mode requires apps/web/package.json. Use legacy HTML mode or scaffold the web app first.`
- **`shared/design-tokens.ts` missing** → exit with `⚠ React Storybook mode requires shared/design-tokens.ts. Run token extraction first.`
- **Storybook deps missing and install fails** → keep partial config out of the commit if possible, report the failing install command, and leave the repo in a readable state.
- **Reference path missing** → search `docs/mockups/**` for likely screen names; if multiple plausible matches remain, ask the user to choose.
- **Verification fails** → fix once if the failure is clearly caused by this batch. Otherwise report the exact failing command and do not mark the batch complete.
