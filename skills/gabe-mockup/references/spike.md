# Gabe Mockup — spike
> Split from skills/gabe-mockup/SKILL.md (B2 migration, 2026-07-09). Binding for this mode.

### React port (shared convention for `spike` mode)

When `/gabe-mockup spike <component>` translates a static mockup into a working React component, three rules are non-negotiable:

1. **Single source of truth for tokens.** `frontend/src/styles/tokens.css` re-exports the canonical mockup CSS via `@import "@mockups/assets/css/<canonical>.css"` (resolved through a Vite alias to `docs/mockups/`). React-side stylesheets MUST consume `var(--*)` tokens — never hex literals, never per-component `:root` blocks. If a token isn't defined yet, add it to the canonical CSS, not to a React file.
2. **DOM mirrors the HTML mockup verbatim.** Same class names (`.<component>`, `.<component>-icon`, etc.), same variant convention (`is-success` className, NOT `data-variant`), same ARIA roles. The molecule's existing CSS rules apply unchanged because selectors are identical. Class-name divergence between mockup and React is a refactor, not a port.
3. **JSDoc `@see` backref every component file.** `@see <relative-path-to-mockup-html>` followed by `@see <relative-path-to-COMPONENT-LIBRARY.md>`. Mockup HTML is the spec; React is the implementation; backrefs survive renames and make lineage findable.

**Animation handling:** CSS transitions on mount work cleanly. For unmount, the component sets an `is-leaving` class that triggers an exit transition, then a 200ms `setTimeout` calls back via `onDismiss(id)`. No animation library required at spike scale; if a future component needs richer choreography, introduce `<TransitionGroup>` or Framer Motion at THAT time.

**Leaf vs. system-layer rule of thumb:** a component needs the `--system` flag (Provider + Container + hook) when **multiple instances appear concurrently** at runtime — toast queue, modal stack, drawer stack. Singleton-per-screen molecules (cards, banners, forms) are leaf-only.

### Mode: `spike`

**Purpose.** Take ONE live mockup (atom or molecule) and produce a shipping React component + minimal Vite/React/TS harness if the project doesn't have one. Keeps tokens as the single source of truth via `@import` from the canonical mockup CSS.

**Invocation:**
```
/gabe-mockup spike <component>            # leaf component only
/gabe-mockup spike <component> --system   # leaf + Provider + Container + hook (queue patterns)
/gabe-mockup spike <component> --framework=react   # only react is implemented
```

**Pre-conditions.**
- `.kdbp/` exists (project initialized via `/gabe-init`).
- `docs/mockups/<section>/<component>.html` exists and is "live" on the principal hub (not placeholder). Section auto-detected by file search across `atoms/`, `molecules/`, `flows/`, `screens/`.
- A canonical tokens CSS file exists under `docs/mockups/assets/css/` exposing `[data-theme="X"]` selectors.

**Outputs (idempotent — re-running skips files that already exist):**
- Scaffold (only if `frontend/package.json` missing): `frontend/{package.json, vite.config.ts, tsconfig.json, index.html, README.md}` + `frontend/src/{main.tsx, App.tsx, styles/tokens.css}`.
- Component leaf: `frontend/src/components/<Component>/{<Component>.tsx, <Component>.css, <Component>.types.ts}`. **Plain `.css` not `.module.css`** — Vite would scope class names with the latter, breaking the DOM-mirroring rule.
- System layer (only with `--system`): `frontend/src/components/<Component>/{<Component>Provider.tsx, <Component>Container.tsx, use<Component>.ts}`.
- Demo: `frontend/src/demo/<Component>Demo.tsx`.
- Recipe doc (only if missing — augmented thereafter): `docs/mockups/REACT-PORT-RECIPE.md`.
- Bookkeeping: append `Spike P14.<N>` row to `.kdbp/PLAN.md`; append a dated entry to `.kdbp/LEDGER.md`; append `frontend/node_modules/`, `frontend/dist/` to `.gitignore` (idempotent grep-then-append).

**Recipe steps.**

1. **S1 — Read source.** Open `docs/mockups/<section>/<component>.html`, the canonical tokens CSS, and the relevant `assets/css/<atoms|molecules>.css` for existing component CSS rules. If the component composes atoms (button, badge, etc.), open those too. Note the exact DOM structure, className convention, ARIA roles, default durations / states from the "Composition" section.
2. **S2 — Detect or scaffold harness.** If `frontend/package.json` exists, skip. Else copy from `templates/mockup/react/` with substitutions:
   - `{{PROJECT_NAME}}` ← `name:` from `.kdbp/BEHAVIOR.md`
   - `{{PROJECT_SLUG}}` ← slugified project name
   - `{{TOKENS_FILENAME}}` ← canonical CSS filename (greenfield: `tokens.css`; legacy port: e.g. `desktop-shell.css`)
   - `{{MOCKUPS_REL_PATH}}` ← path from `frontend/` up to `docs/mockups/` (typically `../docs/mockups`)
   - `{{DEFAULT_THEME}}` / `{{DEFAULT_MODE}}` ← first theme + `light` from canonical CSS (grep `[data-theme="X"]` selectors).
3. **S3 — Emit component leaf.** Copy `templates/mockup/react/src/components/Component.{tsx,css,types.ts}.tmpl` → `frontend/src/components/<Component>/<Component>.{tsx,css,types.ts}` with substitutions:
   - `{{COMPONENT_NAME}}` (PascalCase), `{{COMPONENT_SLUG}}` (kebab-case)
   - `{{COMPONENT_TYPES}}` ← variant union literal (e.g. `"success" | "info" | "warning" | "error"`)
   - `{{DEFAULT_DURATION}}` ← sensible default in ms (or 0 for sticky-by-default components)
   - `{{MOCKUP_HTML_REL_PATH}}` ← from `<Component>.tsx` to mockup HTML (typically `../../../../docs/mockups/<section>/<component>.html`)
   - `{{COMPONENT_LIBRARY_REL_PATH}}` ← same family, pointing to `<section>/COMPONENT-LIBRARY.md` if it exists
   - `{{COMPONENT_CSS_BODY}}` ← inline component CSS rules, copy-ported from the existing canonical CSS (move-or-reference, never duplicate token values).
4. **S4 — System layer (--system only).** Copy `ComponentProvider.tsx.tmpl`, `ComponentContainer.tsx.tmpl`, `useComponent.ts.tmpl` → `<Component>Provider.tsx`, `<Component>Container.tsx`, `use<Component>.ts` with substitutions: `{{PROVIDER_NAME}}` (e.g. `ToastProvider`), `{{CONTAINER_NAME}}` (e.g. `ToastContainer`), `{{HOOK_NAME}}` (e.g. `useToast`), `{{MAX_VISIBLE}}` (default 3 for toast/modal stacks).
5. **S5 — Demo page.** Copy `templates/mockup/react/src/demo/ComponentDemo.tsx.tmpl` → `frontend/src/demo/<Component>Demo.tsx`. Substitute `{{VARIANT_TUPLE}}` (e.g. `["success", "info", "warning", "error"]`), `{{THEME_OPTIONS}}` (rendered `<option>` tags from canonical CSS theme list), `{{HOOK_NAME_FILE}}` (e.g. `useToast`). For leaf-only spikes, the recipe strips `// SYSTEM:` lines and the entire `{/* SYSTEM-START */} ... {/* SYSTEM-END */}` block.
6. **S6 — Visual diff.** `cd frontend && npm install && npm run dev` (port 5173). In a second tab, `npx http-server docs/mockups -p 4173`. Compare each variant in light + dark mode. Acceptable drift: subpixel font rendering, animation timing. Unacceptable: any token-derived value (color, spacing, radius, shadow) — those mean the import chain is broken.
7. **S7 — Recipe doc.** If `docs/mockups/REACT-PORT-RECIPE.md` doesn't exist, copy from `templates/mockup/react/recipe/REACT-PORT-RECIPE.md.tmpl` with substitutions. Always append a row to the "Components ported" table (date, component name, --system flag, notes).
8. **S8 — Bookkeeping.** Append `Spike P14.<N>` row to `.kdbp/PLAN.md` (use the next available `P14.N` index). Append a `## YYYY-MM-DD — SPIKE P14.<N> EXECUTED` block to `.kdbp/LEDGER.md` documenting files emitted + verification result.

**Verification gate (all must pass before S8 marks complete):**
- `npm run dev` boots without errors at localhost:5173.
- Static showcase row in `<Component>Demo` visually matches the HTML mockup at localhost:4173 in both light + dark mode (no token-derived drift).
- For `--system`: dispatch buttons trigger live components that auto-dismiss + hover-pause + queue (max N visible).
- Browser console: zero errors, zero warnings during boot, dispatch, dismiss.
- Existing `npm test` (Playwright) at project root still passes — the React harness must not regress the mockup test suite.

**Idempotency rules.**
- Scaffold step (S2) checks-then-skips per file. Re-running on a project with an existing `frontend/` does not clobber anything.
- Component step (S3) overwrites the component file IF the user passes `--force`; default is to refuse and exit with a "component already ported" message.
- Demo + recipe doc steps: always append to the "Components ported" table; never overwrite previous rows.
- Bookkeeping always appends — never edits prior PLAN.md or LEDGER.md entries.

**Error recovery.**
- **Component HTML missing** → exit with `⚠ <component>.html not found in atoms/, molecules/, flows/, or screens/. Spike requires a live mockup as source.`
- **Component listed as placeholder on principal hub** → exit with `⚠ <component> is marked placeholder on docs/mockups/index.html. Build it first via the appropriate phase recipe.`
- **Token chain @import fails at boot** → likely a path-resolution issue with the Vite alias. Recipe falls back to a deeper relative path with no alias and re-runs S6.
- **`--framework=<other>` passed** → exit with `⚠ Only --framework=react is implemented in this pass. Skipping.` (Reserved API surface.)
