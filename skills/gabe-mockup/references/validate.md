# Gabe Mockup — validate
> Split from skills/gabe-mockup/SKILL.md (B2 migration, 2026-07-09). Binding for this mode.

### Deterministic Storybook correspondence report

After `npm run build-storybook`, run the bundled report script from the active host install when available:

```bash
# Claude Code
node ~/.claude/skills/gabe-mockup/scripts/check-storybook-correspondence.mjs --web-dir apps/web

# Codex
node ~/.agents/skills/gabe-mockup/scripts/check-storybook-correspondence.mjs --web-dir apps/web
```

The report compares `apps/web/src/**/*.stories.*` with `apps/web/storybook-static/index.json` and checks that story titles match the physical taxonomy (`Design System/*`, `Features/*/Components`, `Features/*/Screens`, `Features/*/Spikes`).

The script exits 0 by default, even when it prints `status: REVIEW`. This is intentional: use the report to surface deterministic findings and offer the operator options:

1. Fix source/story taxonomy titles or move stories to the matching folder.
2. Re-run `npm run build-storybook`, then re-run the correspondence report.
3. Accept the finding for this batch and document why in the handoff or PR.
4. Re-run with `--strict` only when the project explicitly wants findings to fail automation.

### Validation gates — screen-level

Frame rules (see `references/legacy-html-phases.md` → Per-platform frame rules) are honored either by **discipline** (author writes within the rule) or by **automation** (the validator catches violations). The `validate` mode below provides the automation. Conventions:

- **Four check categories,** each with stable-IDs that survive renames/re-runs:
  - **C1 Overflow** (severity: `block`) — `body-overflow`, `container-overflow`, `image-overflow`. Catches content escaping the frame at any of phone/tablet/desktop viewports.
  - **C2 Narrow columns** (severity: `warn`) — `min-column-width` (default <60px), `column-text-overflow` (cell content clipped). Catches "Tipo" columns at 32px holding "Combustible".
  - **C3 Empty content** (severity: `warn`) — `list-emptiness` (table with `<thead>` but 0 `<tbody><tr>`), `placeholder-only` (skeleton density >50% of viewport). Catches transaction screens shipping with zero rows.
  - **C4 KDBP rules** (severity: `varies`) — reads `.kdbp/RULES.md`, applies rules tagged `applies-to: mockup-screens` (or `mockup:<phase>` / `mockup:<screen>`) with optional `detect: dom-selector <css>` evaluator. Tagged-but-no-detector rules emit info-only findings.
- **Severity ladder:** `block` (frame violation, must triage), `warn` (likely violation, review), `info` (informational, no action required by default).
- **Stable-ID hashing:** `sha1(screen + viewport + ruleId + selector)` truncated to 10 chars. Used by `runner.mjs` to dedup findings across runs and preserve user-set Status values (`pending` / `fixed-in-place` / `deferred` / `dismissed`).
- **When the gate fires:**
  1. **On-demand:** `/gabe-mockup validate` (full sweep or filtered subset).
  2. **Inline at phase exit:** every M5–M12 phase ends by running validate over the screens it emitted, unless the next `/gabe-mockup` invocation passes `--skip-validation`. Gate is *review-or-defer*, not *must-fix-to-proceed* — friction-aware, not blocking.
- **Architecture awareness:** validator detects `dynamic` (single file + tweaks.js viewport switcher, e.g., gastify) vs `per-device` (`*-mobile.html` / `*-tablet.html` / `*-desktop.html`, e.g., gustify) and dispatches accordingly. Override via `.kdbp/BEHAVIOR.md` field `mockup_architecture: dynamic|per-device` for mid-migration projects.

### Mode: `validate`

**Purpose.** Run layout sanity checks across every emitted screen × phone/tablet/desktop viewport, catching C1 overflow / C2 narrow-columns / C3 empty-content / C4 KDBP-rule violations. The "sub-agent per screen" semantics are delivered via Playwright spec parallelism — each (screen × viewport) pair runs in an isolated browser context concurrently.

**Invocation:**
```
/gabe-mockup validate                    # interactive: pick a screen from INDEX.md §3
/gabe-mockup validate <screen>           # single screen
/gabe-mockup validate --all              # full sweep
/gabe-mockup validate --phase=M7         # all screens emitted by a specific phase

# flags
--viewports=phone,tablet,desktop         # subset (default: all three)
--severity=block,warn,info               # filter (default: all)
--skip-kdbp                              # disable C4 category
--skip-validation                        # bypass inline gate at next /gabe-mockup phase
```

**Pre-conditions.**
- `.kdbp/` exists (project initialized via `/gabe-init`).
- `docs/mockups/screens/` populated (M5+ underway).
- `playwright.config.ts` exists at project root (validator emits a minimal one from `templates/mockup/playwright.config.ts` if missing).
- Architecture detected as `dynamic` (single-file + tweaks.js viewport switching) OR `per-device` (`*-mobile.html` / `*-tablet.html` / `*-desktop.html`). Override via `.kdbp/BEHAVIOR.md` `mockup_architecture:` field.

**Outputs (idempotent — re-running preserves user-set Status values):**
- Validator harness (only if missing): `tests/mockups/validate/{runner.mjs, screen-validator.spec.ts, rules.json}`.
- Live findings document: `.kdbp/MOCKUP-VALIDATION.md` (rewritten per run; preserves Status of matching stable-IDs).
- Recipe doc (only if missing — augmented thereafter): `docs/mockups/VALIDATE-MODE-RECIPE.md`.
- Bookkeeping: append `Spike P15.<N>` row to `.kdbp/PLAN.md`; append a dated entry to `.kdbp/LEDGER.md`; append `tests/mockups/validate/.cache/` to `.gitignore` (idempotent grep-then-append).

**Recipe steps.**

1. **S1 — Detect architecture + scaffold harness.** Read `.kdbp/BEHAVIOR.md` for `mockup_architecture:` override; else heuristic: probe `docs/mockups/screens/` for per-device suffixes vs `tweaks.js` containing `data-viewport` setter. Record detection reason. If `tests/mockups/validate/` missing, copy from `templates/mockup/validate/` with substitutions:
   - `{{PROJECT_NAME}}` ← `name:` from `.kdbp/BEHAVIOR.md`
   - `{{PROJECT_SLUG}}` ← slugified project name
   - `{{GENERATED_AT}}` ← UTC ISO timestamp
   - `{{ARCHITECTURE_MODE}}` ← `dynamic` or `per-device`
   - `{{ARCHITECTURE_REASON}}` ← detection-reason string
   - `{{VIEWPORT_PHONE_WIDTH}}` ← canonical phone viewport width (e.g., 360 or 390 — derived from canonical CSS or default 390)
   - `{{VIEWPORT_TABLET_WIDTH}}` ← 768 (suite default)
   - `{{VIEWPORT_DESKTOP_WIDTH}}` ← 1440 (suite default)
   - `{{MIN_COLUMN_WIDTH_PX}}` ← 60 (suite default; tunable per project)
   - `{{SCREENS_INDEX_PATH}}` ← `docs/mockups/INDEX.md`
2. **S2 — Walk screens index.** Parse `docs/mockups/INDEX.md` §3 (Screens by section) to enumerate target screens. Apply `--screens` / `--phase` filters. Skip screens matching `rules.json` `skip_screens_pattern` (default: `-empty|-zero|-first-time|-loading|-error|deprecated`).
3. **S3 — Run validator.** `node tests/mockups/validate/runner.mjs` (with passed flags). Runner writes `.cache/screens.json` manifest, invokes `npx playwright test tests/mockups/validate/screen-validator.spec.ts` — Playwright runs each (screen × viewport) test in parallel, writing per-test findings JSON into `.cache/findings/`. Runner aggregates.
4. **S4 — Aggregate + dedupe.** Stamp stable-IDs (`sha1(screen+viewport+ruleId+selector)` truncated to 10 chars). Merge with existing `.kdbp/MOCKUP-VALIDATION.md`: preserve user-set Status values for matching IDs; new findings come in as `pending`.
5. **S5 — Write MOCKUP-VALIDATION.md.** Sections: header (architecture, run timestamp, severity totals), Findings (grouped by screen, status checkbox), Triage Backlog (deferred), Dismissed. Idempotent re-write — same input ⇒ same output (modulo timestamp).
6. **S6 — Triage loop (interactive).** Per pending finding, offer f / d / x / s / e / q action keys (full reference: `~/.claude/templates/gabe/mockup/validate/validate-checklist.md`). Mutate Status column in place. Resumable — file is the source of truth; pick up where you left off next session.

**Verification gate (all must pass before S6 marks complete):**
- Architecture detection emits a non-`unknown` mode with a concrete reason in MOCKUP-VALIDATION.md header.
- `runner.mjs` exits with code 0 (or code 1 if Playwright reports any spec issues — findings are data, not failures, so exit code 1 is acceptable here).
- MOCKUP-VALIDATION.md totals row reflects the actual finding count by severity.
- For at least one finding, the lifecycle works end-to-end: triage with `f` → fix screen → re-run → stable-ID drops off active list (if fix resolves the issue).
- Existing `npm test` (Playwright) at project root still passes — the validate spec must not regress non-validate specs.

**Idempotency rules.**
- Stable-ID hashing means re-runs over the same screens produce the same IDs unless screen content changes (selector match shifts).
- Status values (`fixed-in-place`, `deferred`, `dismissed`) survive re-runs for matching IDs.
- New findings always come in as `pending` so the user is never surprised by silent state changes.
- Old findings whose stable-IDs are no longer present (issue resolved) drop off the active list automatically — no orphan entries.

**Error recovery.**
- **Architecture detection returns `unknown`** → exit with `⚠ Cannot detect mockup architecture. Set 'mockup_architecture: dynamic|per-device' in .kdbp/BEHAVIOR.md.`
- **`docs/mockups/screens/` missing** → exit with `⚠ No screens directory. Run M5+ phase recipes first to emit screens.`
- **`playwright.config.ts` missing** → emit one from `templates/mockup/playwright.config.ts` (substituting project-specific port, mockup root) before continuing S3.
- **Playwright crash (worker error, browser launch failure)** → propagate runner exit code 2; don't write a partial MOCKUP-VALIDATION.md (last-good remains intact).
- **`--phase=M<N>` passed but PLAN.md doesn't enumerate screens by phase** → fall back to `--all` with a console warning.

**Inline gate at M5–M12 phase exit.**

After every M5–M12 phase emits its last screen (before the user's next `/gabe-mockup` invocation), the dispatcher auto-runs `runner.mjs` over the screens emitted in that phase (filtered via `--screens=<phase-screens>`). Findings populate `.kdbp/MOCKUP-VALIDATION.md` as new `pending` entries. The user can then:

- **Triage** any subset (f / d / x).
- **Defer the entire batch** by passing `--skip-validation` to the next `/gabe-mockup` invocation — phase ladder advances; findings stay pending.
- **Disable the gate entirely** for a project by setting `validate_inline_gate: off` in `.kdbp/BEHAVIOR.md`. (Discouraged — the gate is the whole point of having validate codified.)
