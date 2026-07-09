# Gabe Mockup — legacy-html-phases
> Split from skills/gabe-mockup/SKILL.md (B2 migration, 2026-07-09). Binding for this mode.

Per-phase recipes for `/gabe-mockup` execute step. Covers the canonical 13-phase `mockup-project` preset. Each recipe assumes PLAN.md is already written; this skill only governs HOW each Exec step runs.

**Attribution.** `HANDOFF.schema.json` format is a derivative of pbakaus/impeccable `DESIGN.json` v2 (Apache License 2.0). Per §4(c): the derivative schema carries a `NOTICE` line in its file header. Gabe Suite does not bundle impeccable code — only the schema shape for interop.

## Shared conventions (legacy HTML mockup phases)

### Tokens CSS discipline

- **Canonical install path (greenfield):** `docs/mockups/assets/css/tokens.css`. Lives under `assets/` alongside fonts/, icons/, tokens/ (taxonomy data).
- **Legacy port:** projects may already have a locked canonical shell (e.g., gastify has `docs/mockups/assets/css/desktop-shell.css` as P1 exit artifact). Keep it; don't rename. tweaks.js detects themes from any loaded stylesheet containing `[data-theme="X"]` selectors — no filename coupling.
- Runtime selectors: `[data-theme="<name>"][data-mode="light|dark"]` for theme + mode, `[data-font="<family>"]` for font swap, `[data-density="compact|regular|comfy"]` for spacing scale, `[data-radius="tight|medium|loose"]` for radii. Set by tweaks.js on `<body>`.
- **Every screen, atom, molecule, wireframe** imports the canonical CSS via `<link rel="stylesheet" href="../assets/css/<name>.css">` (path depth relative from `screens/<x>.html` etc. — all canonical content dirs are 1 level deep, so `../assets/css/...` works uniformly).
- **Forbidden patterns:** hex/RGB literals in screen HTML, per-screen `:root { --bg: ... }` blocks, theme-specific CSS files scattered outside `assets/css/`.

### Tweaks panel

- Fixed right-edge panel (280px expanded, 48px collapsed). Mirrors the Claude.ai Artifacts Tweaks widget. Controls: Theme / Mode / Primary override / Font family / Text scale / Density / Corner radius / Collapse sidebar.
- **Single-script include** — tweaks.js injects its own `<style>` block + `<div id="tweaks-panel">` at boot. Every mockup adds ONE line:
  ```html
  <script src="../assets/js/tweaks.js" defer></script>
  ```
  No separate panel HTML file, no `<link>`, no `<div>` required from the screen author.
- tweaks.js is self-contained — no dependency on any specific CSS filename. It walks `document.styleSheets` to discover `[data-theme="X"]` and `[data-font="X"]` values for the dropdowns. Consumer loads whatever tokens CSS they have; the panel adapts.
- **Every mockup includes the Tweaks panel.** No opt-out. Variants (light/dark side-by-side) are DEPRECATED — users switch modes via Tweaks.

### Hub + sub-hub navigation

- **Principal hub:** `docs/mockups/index.html` — section-card grid (Design System · Atoms · Molecules · Flows · Screens · Handoff). Each card has `data-status="placeholder|live"`; placeholder = "not yet built", live = "N items, click to enter". Section recipes flip the status when their phase emits.
- **Section sub-hubs:** every section that produces many files (atoms, molecules, flows, screens) gets its own `<section>/index.html` — same card-grid layout. Card per item with: name, 1-line description, variants list, inline preview HTML (real DOM, NOT iframe).
- **Section-aware breadcrumb:** `tweaks.js` reads `location.pathname` at boot. On `/<section>/<name>.html` → injects "← <Section> index" link to `./index.html`. On `/<section>/index.html` → injects "← Mockups home" link to `../index.html`. On top-level `/<name>.html` (e.g. `/design-system.html`) → injects "← Mockups home" link to `./index.html`. Top hub (`/index.html`) injects nothing (it IS home).
- **Token discipline reminder:** principal hub + section sub-hubs use the canonical CSS via `<link rel="stylesheet" href="<canonical-path>">`. Never inline `:root` blocks; never per-page font/color overrides. Theme + font picker on the Tweaks panel must work uniformly across hub + sections.
- **Templates:** `templates/mockup/index.html` (principal) + `templates/mockup/section-index.html` (sub-hub). Recipes copy + substitute project-specific markers at scaffold time.

### Test harness scaffold

- **Goal:** every mockup project ships with a working Playwright smoke suite that catches "JS works but CSS doesn't react" regressions.
- **Files:** `package.json` (devDeps `@playwright/test` + `http-server`), `playwright.config.ts` (webServer + chromium), `tests/mockups/{hub,tweaks}.spec.ts` (always present), `tests/mockups/<section>.spec.ts` (one per emitted section).
- **Templates:** `templates/mockup/package.json`, `templates/mockup/playwright.config.ts`, `templates/mockup/tests/mockups/{hub,tweaks}.spec.ts`, `templates/mockup/tests/mockups/section-smoke.spec.ts.tmpl`.
- **Static server:** Playwright config uses `http-server docs/mockups -p 4173`. Avoids `file://` protocol issues with `cssRules` introspection + `@import` resolution.
- **Run:** `npm install && npm test` (after `npx playwright install chromium` once).

> Project bindings — scheduled to move to the owning project's RULES.md/DESIGN.md in migration phase A2. The state-tabs origin note below names a specific prior project (gastify).

### State-tabs component (multi-state screens)

- Promoted from `gastify-single-scan-states.html` pattern to suite standard.
- Multi-state screens MUST use one shared phone frame (mobile) / one edge-to-edge surface (desktop) + a state-tabs row that toggles `.state-content.active` class via JS.
- **Forbidden pattern:** stacking multiple phone frames vertically, one per state/variant. Creates visual inconsistency (gastify `login.html` drift).
- State-tabs live at `docs/mockups/molecules/state-tabs.html` (produced in M3).
- DOM flexibility: tweaks.js state-tabs driver accepts both ARIA (`[role="tablist"] > [role="tab"]`) and legacy (`.state-tabs > .state-tab[data-state]`) shapes. Authors pick whichever reads cleaner.

### Per-platform frame rules

**Mobile screens:**

| Scenario | Behavior |
|---|---|
| Single-state | ONE phone frame, 390×844 min-height. Content > 844 → scroll inside frame (`overflow-y: auto`). Content < 844 → pad to 844 min so frame doesn't collapse |
| Multi-state | ONE shared phone frame + state-tabs row above frame. Frame height rules apply |
| Multi-variant | Use Tweaks panel to switch variants at runtime. No side-by-side variant frames |

**Tablet screens:**

| Scenario | Behavior |
|---|---|
| Single-state | Content max-width 720px centered, 16px edge padding. Max screen frame 768×1024 (portrait) or 1024×768 (landscape — author's choice per screen). Content > frame height → native vertical scroll |
| Multi-state | Same frame + state-tabs row. State-tabs sit above content (mobile parity) |
| Multi-variant | Tweaks panel for variants. No side-by-side variant frames |

**Desktop screens:**

| Scenario | Behavior |
|---|---|
| Single-state | No phone frame. Edge-to-edge inside page. Top bar (60px) per `DESKTOP-TEMPLATE.md`. Content scrolls natively |
| Multi-state | State-tabs secondary bar below top bar. JS toggle same as mobile |

## Modes (dispatch — full mode set)

`/gabe-mockup` runs the next phase recipe by default (M0 → M13 sequenced by `.kdbp/PLAN.md`). It also accepts **named modes** via positional argument that bypass the phase ladder for targeted vertical-slice work.

**Dispatch:** the skill reads `$ARGUMENTS`. If the first positional arg matches a known mode name, it runs the mode's recipe instead of advancing the phase ladder. If the first positional arg is not in the mode table: do NOT silently advance the phase ladder. Print the mode table and ask: `Unknown mode <arg> — advance the phase ladder, or did you mean <closest mode>?`

| Mode | Invocation | Purpose |
|---|---|---|
| (default) | `/gabe-mockup` | Advance the phase ladder per PLAN.md |
| `react-story` | `/gabe-mockup react-story <screen-or-batch>` | Generate production React + Storybook mockups for React-first projects |
| `design-ref` | `/gabe-mockup design-ref [--refresh\|--force]` | Generate or refresh `docs/rebuild/ux/DESIGN.md` for React-first Storybook projects |
| `spike` | `/gabe-mockup spike <component>` | Translate one live mockup into a working React component |
| `validate` | `/gabe-mockup validate [<screen>\|--all]` | Run layout sanity checks (C1-C4) over screens × phone/tablet/desktop viewports |
| `refine` | `/gabe-mockup refine <screen>` | Hone an ALREADY-WIRED live screen's layout/spacing/UX to spec vs its canonical mockup — the analyze → policy-test → verify → fix loop |

Per the B2 migration, the `react-story`/`design-ref`/`spike`/`validate`/`refine` mode recipes now live in their own reference files (`references/react-story.md`, `references/spike.md`, `references/validate.md`, `references/refine.md`) — this file retains only the dispatch table above plus the legacy phase-ladder recipes (M0–M13) below.

---

## Phase recipes

### M0 — Scaffold (auto, idempotent)

**Goal:** seed the principal hub + Test harness on `/gabe-mockup` init for a fresh project, and only on the first run. Idempotent: re-runs are no-ops.

**Triggered by:** `/gabe-mockup` Step 0 if `docs/mockups/index.html` does not exist.

**Steps:**

1. **Copy principal hub template.** `templates/mockup/index.html` → `docs/mockups/index.html`. Substitute:
   - `{{PROJECT_NAME}}` ← `name:` from `.kdbp/BEHAVIOR.md`
   - `{{PROJECT_LEDE}}` ← one-liner from `.kdbp/SCOPE.md` §1
   - `{{CANONICAL_CSS}}` ← path to canonical tokens CSS (greenfield: `assets/css/tokens.css`; legacy port: `assets/css/<project>-shell.css`)
   - `{{TWEAKS_JS_PATH}}` ← `assets/js/tweaks.js`
   - `{{THEME_COUNT}}` / `{{PROJECT_META_PILLS}}` ← scaffold-time placeholder; recipe overwrites as M1+ lands.
2. **Copy INDEX.md template.** `templates/mockup/INDEX.md` → `docs/mockups/INDEX.md`. Existing template, already in place.
3. **Copy package.json.** `templates/mockup/package.json` → project root. Substitute `PLACEHOLDER-PROJECT-SLUG` with slugified `name:` from BEHAVIOR.md, `PLACEHOLDER-PROJECT-DESCRIPTION` with SCOPE one-liner. Skip if `package.json` already exists at root (might be a non-mockup project — ask user before overwriting).
4. **Copy playwright.config.ts.** `templates/mockup/playwright.config.ts` → project root.
5. **Copy hub spec.** `templates/mockup/tests/mockups/hub.spec.ts` → `tests/mockups/hub.spec.ts`.
6. **Copy tweaks spec.** `templates/mockup/tests/mockups/tweaks.spec.ts` → `tests/mockups/tweaks.spec.ts`.
7. **Append to `.gitignore`** (idempotent grep-before-append): `node_modules/`, `playwright-report/`, `test-results/`.

**Exit criteria:** `docs/mockups/index.html` renders the section-card hub with 6 placeholder cards. `npm install && npm test` from project root passes (smoke level — no atoms yet, but hub + tweaks specs pass / skip gracefully because no live sections).

### M1 — Design language + tokens (`design-system`)

**Goal:** Produce the multi-theme token matrix + lock canonical tokens CSS.

**Steps:**

1. **Theme strategy decision.** Ask user: port existing themes (if legacy design exists) OR author new themes (if greenfield).
2. **uipro enrichment (optional).** If `~/.claude/skills/ui-ux-pro-max/` installed:
   ```bash
   python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<domain summary>" --domain style -n 5
   ```
   Append top 3-5 candidates to the theme list. If not installed → skip silently.
3. **Author `STRESS-TEST-SPEC.md`** at `docs/mockups/STRESS-TEST-SPEC.md`:
   - 4 canonical screens × N platforms (from PLAN `--platforms`) × 2 modes (light/dark) matrix
   - Minimum viable subset: Dashboard × N platforms × themes — confirms token discipline before full matrix
4. **Render stress matrix.** For each theme × screen × platform × mode, emit HTML at `docs/mockups/explorations/<theme>-<screen>-<platform>.html`. Use `frontend-design` skill OR project-specific design skill (e.g., `gastify-design`).
5. **User reviews candidates.** Pick subset to ship as runtime multi-theme set.
6. **Write tokens CSS:**
   - **Greenfield:** copy `~/.claude/templates/gabe/mockup/tokens.css` to `docs/mockups/assets/css/tokens.css`; extend with all picked themes' vars.
   - **Legacy port:** extend the existing shell (e.g., `docs/mockups/assets/css/<project>-shell.css`) with any new theme vars. DON'T duplicate into a second file. tweaks.js detects themes from whatever stylesheet is loaded — one canonical source per project.
7. **Copy `tweaks.js`** from `~/.claude/templates/gabe/mockup/tweaks.js` to `docs/mockups/assets/js/tweaks.js`. No panel.html file needed — tweaks.js is self-contained.
8. **Write `design-system.html`** at `docs/mockups/design-system.html`: demo page showing 4 stress screens × theme switcher. Include `<link rel="stylesheet" href="./assets/css/<name>.css">` + `<script src="./assets/js/tweaks.js" defer></script>` (note: at root depth, paths start with `./`).

**Exit criteria:** tokens CSS loaded by design-system.html. Tweaks panel switches all themes × modes × fonts × densities × radii live. `/gabe-plan` phase Exec → ✅.

### M2 — Atomic components (`design-system, ui-kit`)

**Goal:** Populate `docs/mockups/atoms/` with ~14 self-contained atom files.

**Steps:**

1. **List atoms** (from tier-section `ui-kit.md` dims): button (5 variants), input (5 variants), pill, badge, avatar, chip, skeleton, progress, spinner. Reference `legacy-reference/claude-design/ui_kits/` if exists.
2. **Per atom, emit file** at `docs/mockups/atoms/<name>.html`:
   - `<link rel="stylesheet" href="../assets/css/<canonical>.css">` (the project's tokens CSS — greenfield: `tokens.css`; legacy port: existing shell filename)
   - `<script src="../assets/js/tweaks.js" defer></script>` (single-script include — panel + state-tabs)
   - Render all state variants (default, hover, focus, disabled, loading, error per tier — MVP=2, Ent=6)
   - Document snippet include pattern at bottom (how screens consume it)
3. **Write `docs/mockups/atoms/INDEX.md`** listing all atoms + their file paths (consumed by wireframe dropdowns in M4+).
4. **Emit section sub-hub.** Copy `templates/mockup/section-index.html` → `docs/mockups/atoms/index.html`. Substitute `{{SECTION_NAME}}="Atoms"`, `{{SECTION_TIER}}` from PLAN.md Phase 2 row, `{{SECTION_DESCRIPTION}}` from atom catalog narrative. Build the card grid by iterating atoms emitted in step 2; for each, fill `{{ITEM_NAME}}`, `{{ITEM_DESCRIPTION}}`, `{{ITEM_VARIANTS}}`, `{{INLINE_PREVIEW_HTML}}` (real DOM example using project tokens). Footer back-link to `../index.html`.
5. **Emit section spec.** Copy `templates/mockup/tests/mockups/section-smoke.spec.ts.tmpl` → `tests/mockups/atoms.spec.ts` (drop the `.tmpl`). Fill `{{SECTION_NAME}}="Atoms"`, `{{SECTION_SLUG}}="atoms"`, `{{ITEMS_ARRAY}}` with the atoms emitted (one entry per atom: `{ name, file, primaryClass }`).
6. **Update principal hub.** Edit `docs/mockups/index.html`: locate `<a class="section-card" data-section="atoms" ...>`, flip `data-status="placeholder"` → `data-status="live"`, replace `href="#"` with `href="atoms/index.html"`, update card body with `<count> atoms · Phase 2 · <tier>`. Also update the principal hub's `{{PROJECT_META_PILLS}}` block to reflect live atoms count.
7. **Update hub.spec.ts.** Edit `tests/mockups/hub.spec.ts`: add `"atoms"` to the `LIVE_SECTIONS` array. The sub-hub specs auto-generate from this list.
8. **Run `npm test`.** Verify: principal hub spec live-cards check passes, atoms sub-hub spec passes, atoms smoke spec passes, no regressions.

**Exit criteria:** every atom self-contained, loads canonical tokens CSS + tweaks.js, renders all its states via Tweaks-driven state-tabs. `INDEX.md` atoms catalog exists. Atoms sub-hub at `docs/mockups/atoms/index.html` lists every atom with inline preview. Principal hub Atoms card flipped to live. `npm test` green.

### M3 — Molecular components (`design-system, ui-kit`)

**Goal:** Compose atoms into molecules + document state matrices.

**Steps:**

1. **List molecules:** cards (transaction, stat, empty, feature, celebration), modals (confirm, form, learning, error, credit), toast, banner, nav (bottom, top, sidebar), FAB, filters, sheets, drawers, forms, **state-tabs** (canonical).
2. **Per molecule, emit file** at `docs/mockups/molecules/<name>.html`:
   - Reference atoms via include OR snippet
   - Full state matrix (all states Ent+ per tier)
   - A11y roles documented inline (`role=`, `aria-*`)
   - Platform-variance notes (Scale tier)
3. **Write `docs/mockups/molecules/COMPONENT-LIBRARY.md`** cataloging molecules + their atoms + state matrix + platform variance.
4. **Emit section sub-hub.** Copy `templates/mockup/section-index.html` → `docs/mockups/molecules/index.html`. Substitute `{{SECTION_NAME}}="Molecules"`, `{{SECTION_TIER}}` from PLAN.md Phase 3 row (typically `Enterprise tier`), `{{SECTION_DESCRIPTION}}` from molecule narrative. One card per molecule with inline preview using real DOM.
5. **Emit section spec.** Copy `templates/mockup/tests/mockups/section-smoke.spec.ts.tmpl` → `tests/mockups/molecules.spec.ts`. Fill `{{SECTION_NAME}}="Molecules"`, `{{SECTION_SLUG}}="molecules"`, `{{ITEMS_ARRAY}}` with molecule entries.
6. **Update principal hub.** Edit `docs/mockups/index.html`: locate `<a class="section-card" data-section="molecules" ...>`, flip `data-status="placeholder"` → `data-status="live"`, replace `href="#"` with `href="molecules/index.html"`, update card body with `<count> molecules · Phase 3 · <tier>`.
7. **Update hub.spec.ts.** Add `"molecules"` to the `LIVE_SECTIONS` array.
8. **Run `npm test`.** Verify principal hub + molecules sub-hub + molecules smoke specs pass.

**Exit criteria:** `state-tabs.html` molecule exists + is the canonical pattern. COMPONENT-LIBRARY.md complete. Molecules sub-hub renders. Principal hub Molecules card flipped to live. `npm test` green.

### M4 — Flows + INDEX + CRUD×entity (`mockup-flows, mockup-index`)

**Goal:** Seed `docs/mockups/INDEX.md` (4 tables) + populate ENTITIES.md CRUD columns + enumerate flows.

**Steps:**

1. **Read `.kdbp/ENTITIES.md`** — entity list (created at `/gabe-init` for mockup/hybrid projects). If missing, create from template + seed from SCOPE.md REQs.
2. **Write `docs/mockups/INDEX.md`** from `templates/mockup/INDEX.md`:
   - §1 Decisions log — port from `.kdbp/DECISIONS.md` D-entries
   - §2 Workflows — list flows F1..Fn with REQ mappings
   - §3 Screens by section — seed with desktop+mobile columns (empty rows for P5-P12 to fill)
   - §4 CRUD × entity — for each entity in ENTITIES.md, 4 columns (Create / View / Update / Delete), cells filled with screen names as P5-P12 lands
   - §5 Component usage — seed (filled in P5-P12)
   - §6 Coverage gaps — initial baseline from AUDIT (if exists)
3. **Enumerate flows.** For each flow, emit `docs/mockups/flows/flow-<N>-<name>.html` walkthrough skeleton (happy path only at MVP tier).
4. **Cross-ref.** INDEX.md §2 links flows by number; flows reference screens; screens reference molecules; molecules reference atoms.
5. **Emit section sub-hub.** Copy `templates/mockup/section-index.html` → `docs/mockups/flows/index.html`. Substitute `{{SECTION_NAME}}="Flows"`, `{{SECTION_TIER}}` from PLAN.md Phase 4 row, `{{SECTION_DESCRIPTION}}="User-journey walkthroughs across multiple screens."`. One card per flow with inline preview = chain of step pills (e.g., `<span class="step">scan</span> → <span class="step">review</span>`). Live cards link to flow walkthrough HTML; planned flows are non-interactive `<div>` blocks.
6. **Emit section spec.** Copy `templates/mockup/tests/mockups/section-smoke.spec.ts.tmpl` → `tests/mockups/flows.spec.ts`. Fill `{{SECTION_NAME}}="Flows"`, `{{SECTION_SLUG}}="flows"`, `{{ITEMS_ARRAY}}` with one entry per LIVE flow (planned flows skipped — they have no walkthrough file yet).
7. **Update principal hub.** Edit `docs/mockups/index.html`: locate `<a class="section-card" data-section="flows" ...>`, flip `data-status="placeholder"` → `data-status="live"`, replace `href="#"` with `href="flows/index.html"`, update card body with `<live count> live flows · <planned count> planned · Phase 4`.
8. **Update hub.spec.ts.** Add `"flows"` to the `LIVE_SECTIONS` array.
9. **Run `npm test`.** Verify principal hub + flows sub-hub + flows smoke specs pass.

**Exit criteria:** INDEX.md renders with 4+ populated tables. Flow HTMLs exist for every REQ that maps to a journey. CRUD matrix initialized (even if cells blank — filled progressively). Flows sub-hub renders 13+ flow cards. Principal hub Flows card flipped to live. `npm test` green.

### M5-M12 — Screen phases (`user-facing, ...`)

**Goal:** Per-section screens (auth / capture / data-view / analytics / groups / settings / edge-states) with desktop + mobile variants each.

**Steps per phase:**

1. **Read phase's REQs covered** from PLAN.md Phase Details.
2. **For each screen in phase scope:**
   a. **Wireframe first.** Emit `docs/mockups/wireframes/<screen>.html` with `data-slot` dropdowns — users pick component options per slot (header: topbar-sidebar / topbar-only / hero-nav; list: compact / spacious; footer: nav-bottom / none). See `templates/mockup/wireframe-template.html`.
   b. **User reviews wireframe + picks components.** Dropdown selection locks the wireframe layout.
   c. **Hi-fi render.** Emit `docs/mockups/screens/<screen>-desktop.html` + `<screen>-mobile.html`. Include tokens.css + Tweaks panel + state-tabs if multi-state.
   d. **Update INDEX.md §3** row with both platform file paths.
   e. **Update INDEX.md §4 CRUD row(s)** for any entity this screen touches.
   f. **Update INDEX.md §5** component usage per screen.
3. **Mid-phase commit-gate.** After every 3-5 screens, `/gabe-commit` chain fires — CHECK 7 Layer 4 surfaces INDEX.md sync warning if missed.
4. **Phase-exit validation gate.** After the last screen lands, dispatcher auto-runs `node tests/mockups/validate/runner.mjs --screens=<phase-screens>` to populate `.kdbp/MOCKUP-VALIDATION.md` with C1–C4 findings. User triages inline (f/d/x/s/e/q action keys per finding) OR passes `--skip-validation` to the next `/gabe-mockup` invocation to defer. Gate is *review-or-defer*, not *must-fix-to-proceed*. See Shared conventions → Validation gates — screen-level (`references/validate.md`), and Modes → `validate` (`references/validate.md`).

**Frame rules:** See Shared conventions → Per-platform frame rules above. No stacked frames. State-tabs for multi-state.

**Exit criteria:** every screen in phase scope has desktop + mobile variants. INDEX.md rows populated. Coverage gaps reduced (visible in INDEX.md §6).

### M13 — Handoff + index hub + audit (`mockup-docs, mockup-validation`)

**Goal:** Emit `HANDOFF.json` against schema + complete audit + a11y pass.

**Steps:**

1. **Assemble HANDOFF.json** at `docs/mockups/HANDOFF.json`. Schema at `~/.claude/templates/gabe/mockup/HANDOFF.schema.json` (Apache-2.0 derivative of impeccable DESIGN.json v2). Fields:
   - `schemaVersion`, `generatedAt`, `title`
   - `colors{}` — every token with role, displayName, description, tonalRamp
   - `typography{}` — per role (display / headline / title / body / label / micro-label): fontFamily, fontSize, fontWeight, lineHeight, letterSpacing
   - `spacing{}`, `radii{}`, `motion{easing, durations}`
   - `components{}` — every atom + molecule with anchor path, states[], rules[]
   - `platformVariance[]` — notes per platform
2. **Validate** against schema (Ajv or jsonschema in Python). Emit validation report.
3. **Complete INDEX.md §6 Coverage gaps.** Cross-check REQ×screen (every REQ has ≥1 screen or explicit not-user-facing tag), cross-screen token parity, component library completeness.
4. **A11y pass.** WCAG AA contrast verification per token pairing (use `color.js` or similar). Focus-ring visible on every interactive. Screen-reader walkthrough recorded at Scale tier.
5. **Write `SCREEN-SPECS.md`** — per-screen: REQ coverage, components used, states documented, data shape stub.
6. **Update INDEX.md §1 Decisions log** with M13 audit entries + D-id link to DECISIONS.md.

**Exit criteria:** HANDOFF.json validates, INDEX.md §6 shows 0 gaps OR documented exceptions, SCREEN-SPECS.md complete, a11y table present. Phase Exec → ✅.

---

## Error recovery

- **Missing canonical tokens CSS** during M2+ phase → recipe aborts with `⚠ M1 not complete — no stylesheet in docs/mockups/assets/css/ defines [data-theme="X"] selectors. Run /gabe-mockup M1 first or --reconfigure.`
- **Atom referenced in molecule but not in atoms/** → recipe surfaces which atom missing + asks to back-port.
- **Screen references molecule not in molecules/** → same surfacing, back-port pattern.
- **ENTITIES.md absent at M4** → recipe creates from template, prompts user to review entity list before populating CRUD.
- **Tier-cap violation** (e.g., MVP-tier phase tries to land multi-theme runtime) → recipe flags + offers escalation prompt (same mechanic as `/gabe-execute` Step 4.1).

## Non-goals

- Does NOT validate a11y contrast automatically during M2-M12 — that's M13's job (explicit audit phase).
- Does NOT auto-generate screens from flows — flow → wireframe → hi-fi is user-gated at each step.
- Does NOT port pixel-perfect screens from Figma — screens are HTML-first reference, not Figma parity.
- **`design-ref` mode does NOT replace M13 handoff.** It writes React-first design grammar at `docs/rebuild/ux/DESIGN.md`; `HANDOFF.json`, `SCREEN-SPECS.md`, and audit closure remain M13 outputs.
- **Legacy phase recipes (M0-M13) do NOT couple to any specific framework** — output is vanilla HTML + CSS vars + minimal vanilla JS (tweaks.js only). React-first projects use the `react-story` mode instead, and one-off component ports can still use `spike`.
- Does NOT couple to any specific tokens filename — tweaks.js detects themes from whichever stylesheet exposes `[data-theme="X"]` selectors. Greenfield projects use `assets/css/tokens.css`; legacy ports may retain their existing shell filename.
- **`validate` mode does NOT block phase advancement** — the inline gate at M5–M12 exit is *review-or-defer*. Findings stay pending in `.kdbp/MOCKUP-VALIDATION.md` until triaged; passing `--skip-validation` to the next `/gabe-mockup` call advances the ladder regardless. Conscious choice: prevent gate friction from grinding iterative screen work to a halt.
- **`validate` mode does NOT do pixel-level visual diffing.** That's a separate `visual-diff` mode for a future pass. C1–C4 are layout-sanity heuristics (overflow, narrow columns, empty content, KDBP rule binding), not screenshot comparison.

---

## Appendix — Bench-test verification

After modifying any M0/M2/M3/M4 recipe or any template under `templates/mockup/`, run a clean bench-test to verify recipes still produce a working scaffold:

```bash
TMP=$(mktemp -d)
cd "$TMP"
git init -q && mkdir -p .kdbp docs

# Minimal BEHAVIOR.md
cat > .kdbp/BEHAVIOR.md <<EOF
---
name: bench-mockup
project_type: mockup
---
EOF

# Run /gabe-mockup (or manually invoke M0 recipe per SKILL.md above)
# Then verify M0 scaffold landed:
ls docs/mockups/index.html docs/mockups/INDEX.md package.json playwright.config.ts \
   tests/mockups/hub.spec.ts tests/mockups/tweaks.spec.ts

# Install + run smoke (no atoms yet, but hub + tweaks specs pass / skip gracefully)
npm install
npx playwright install chromium
npm test  # expect: hub spec live-section check skipped (zero live), tweaks specs pass
```

After the M0 scaffold passes, exercise M2 atoms recipe with mock data:

```bash
# Manually invoke M2 atoms recipe → expect new files:
ls docs/mockups/atoms/index.html docs/mockups/atoms/*.html tests/mockups/atoms.spec.ts
# Check principal hub flipped:
grep 'data-section="atoms" data-status="live"' docs/mockups/index.html
# Re-run npm test:
npm test  # expect: atoms sub-hub spec passes, atoms smoke spec passes
```

> Project bindings — scheduled to move to the owning project's RULES.md/DESIGN.md in migration phase A2. The regression guard below hardcodes a path into a sibling project (gastify) that is not part of this suite.

**Regression guard against gastify** (the Layer A reference implementation):

```bash
cd /home/khujta/projects/apps/gastify
npm test  # must still show all green; if not, the template extraction over-generalized
```

Failure modes to budget for:
- Sanitization regex misses a project-specific reference → bench scaffold inherits original branding. Fix: re-grep for the source project name after each template write.
- `D6` tweaks spec generalization breaks the visible-effect assertion → re-verify by running gastify's `tests/mockups/tweaks.spec.ts` after the template extraction.
- M0 idempotency bug — running `/gabe-mockup` twice clobbers user edits. Fix: every copy step does an `if exists, skip` check.
