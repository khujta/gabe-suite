---
name: gabe-mockup
description: "UI/mockup work over a per-project manifest — the lift SOP (L0 resolve → L1 inventory → L2 spike → L3 lift → L4 wire+verify), Storybook discipline, legacy-HTML recipes."
when_to_use: "ANY spike / mockup / screen / UI-component / Storybook / design-ref request in a project with a mockup manifest — not only explicit invocations. Never rebuild an existing component: resolve and reuse."
paths:
  - "**/*.stories.tsx"
  - "**/design-system/**"
  - "**/spikes/**"
  - "**/design-lab/**"
  - "docs/mockups/**"
metadata:
  version: 2.2.0
---

# Gabe Mockup — the lift SOP

**Usage:** `/gabe-mockup [goal|react-story <screen-or-batch>|design-ref|refine <screen>] [--reconfigure] [--dry-run] [--platforms=web,mobile-web,native-mobile] [--themes=N]`

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## Dispatch

Fires on ad-hoc UI phrasing ("make a spike", "build the X screen", "port from design-lab", "tweak this component") and on the `paths` auto-trigger above — not only explicit `/gabe-mockup` invocations. **The medium = receiving platform rule:** a React-first project (`apps/web/package.json` + `docs/rebuild/ux/REACT-STORYBOOK-WORKFLOW.md` present) renders new UI as production React + Storybook — never new static HTML (`references/react-story.md` rule 1: "No new static HTML mockups"). No React-first marker, or `.kdbp/PLAN.md` points at `docs/mockups/**` → the legacy static-HTML mockup-project flow (`references/legacy-html-phases.md`). Neither marker present → ask which workflow should be active before generating files. Never rebuild or recreate an existing component — resolve and reuse via the lift SOP below.

## The manifest

Read the `mockup:` block from `.kdbp/BEHAVIOR.md` (fallback: `.kdbp/MOCKUP.md`). Keys, one line each:

- `mockup_tool` — `storybook` | `html`; the medium = receiving platform choice.
- `storybook_root` — where Storybook lives (e.g. `apps/web`, or a separate `design-lab`).
- `storybook_port` — dev server port.
- `lift_kind` — `in-tree` (spike promotes within one package) | `cross-package` (design-lab → app port).
- `app_root` — the real production app the lift targets.
- `screen_map` — canonical screen → reference doc (e.g. `WEB-SCREEN-MAP.md`, `WEB-MIGRATION.md`).
- `design_ref` — the project's `DESIGN.md` design-grammar doc.
- `layout_policy` — the `refine`-mode P1–P7 layout oracle doc.
- `reuse_roots` — directories searched before any NEW verdict.
- `spikes_root` — where exploratory spike stories live.
- `verify_commands` — the L4 gate command list (typecheck, build, build-storybook, test-storybook, token-class check, …).
- `capture` — screenshot/video tool + breakpoints for render-gate evidence.
- `proof_root` — committed runtime-evidence folder (the un-ignored carve-out, e.g. `tests/web-e2e/proof`).
- `journey_specs` — where journey specs live (one spec per feature, augmented in place).
- `critical_paths` — glob list; ad-hoc work touching these inherits `proof: test`.
- `reference_projects` — sibling projects this one inherits patterns from.
- `legacy_reference` — a prior codebase to read before building equivalents.

No manifest → legacy mockup-project flow (`references/legacy-html-phases.md`) or a short interview to create the block. Procedures stay in this skill; only bindings live in the manifest.

## The lift SOP (L0–L4)

Where the project carries a committed command center, the map answers the resolve/inventory questions ahead of the hand search, never instead of it: `mcp__gabe-map__map_status` first (is there a map, how fresh), then `find` / `owner_of` / `who_calls` / `outline`. The map is a FLOOR, never a scope — a NEW verdict still requires the `reuse_roots` search (E1); no center → the tools say so and L0–L4 run exactly as written.

- **L0 RESOLVE** — read `<screen_map>`; resolve target → canonical reference. Unmapped or archived → STOP: "not mapped — map it or confirm NEW." Print the E4 line: `REUSE <path> | EXTEND <path> | NEW (searched <reuse_roots> — none fit)`; a NEW verdict requires the search evidence — ask `mcp__gabe-map__find <target>` first (it indexes screens and FE pieces), then search `<reuse_roots>` anyway: an empty tool answer is not a NEW verdict.
- **L1 INVENTORY** — open the reference; list its real component imports (where the reference is a source file, `mcp__gabe-map__outline <path>` gives its definitions, spans and owner without a full read — it indexes definitions, not imports, so the file is still read). Ask `mcp__gabe-map__who_calls <component>` per candidate before the verdict: a component with other live consumers is EXTEND, never edit-in-place — and an EMPTY answer is a floor, not a licence (L2): edit-in-place only when the ledger cites the tool's grep arm → 0 code hits as the recorded search AND the component is not reached through a string-keyed registry that grep cannot see; when in doubt, EXTEND. Output a REUSE LEDGER: component → keep / extend(prop) / genuinely-new.
- **L2 SPIKE** — only if exploring. Spike story under `<spikes_root>` composing the L1 inventory. A stand-in shell mimicking an existing component is a DEFECT (`references/spike.md`). An element that will be drawn many at once (a table, a board) gets a BENCH first — one element per column, its parts and controls — before the dense view (spike.md S5a). Options stay story-only until the operator picks.
- **L3 LIFT** — `in-tree`: the production screen RENDERS the showcase component via additive default-off props (`live`/`chromeless`); stories stay byte-identical; pure logic graduates spike → `features/<area>/model/`. `cross-package`: faithful adoption of the design-lab component + its token/asset maps into `<app_root>` — adopt, don't re-author. Either way: archive the spike, update `<screen_map>`.
- **L4 WIRE + VERIFY** — wire real data (ask `mcp__gabe-map__entity_context <entity>` first for the endpoints + models this screen consumes; no center → it says so and the API tree is read as before); run `<verify_commands>`; render gate: capture the LIVE screen (not the showcase story) at the manifest's breakpoints, side-by-side vs the reference. A defect found here re-enters at L3, never by re-authoring. `refine` mode is the same machine entered directly at L4, with fix recipes for already-shipped screens.

## Modes

| Mode | Invocation | Reference |
|---|---|---|
| (default) goal | `/gabe-mockup` | Runs the lift SOP above; no manifest → `references/legacy-html-phases.md` |
| `react-story` | `/gabe-mockup react-story <screen-or-batch>` | `references/react-story.md` |
| `design-ref` | `/gabe-mockup design-ref [--refresh\|--force]` | `references/react-story.md` |
| `refine` | `/gabe-mockup refine <screen>` | `references/refine.md` |
| `spike` | `/gabe-mockup spike <component>` | `references/spike.md` |
| `validate` | `/gabe-mockup validate [<screen>\|--all]` | `references/validate.md` |
| legacy phase ladder (M0–M13) | advances per `.kdbp/PLAN.md` (`mcp__gabe-kdbp__kdbp_snapshot` for the phase table) | `references/legacy-html-phases.md` |

Before executing any mode, read its reference file IN FULL — E6 applies if missing. If `$ARGUMENTS`' first positional arg is not a known mode, do NOT silently advance the phase ladder: print this table and ask `Unknown mode <arg> — advance the phase ladder, or did you mean <closest mode>?`

## Output contract (summary)

Every mode ends with: the artifact(s) it produced (screen/story/doc paths), the `<verify_commands>` run + their result, and — for visual work — side-by-side/screenshot evidence at the manifest's breakpoints (E7: exact URL/screen, env, what to look at, absolute paths). Mode-specific bookkeeping (PLAN.md rows, LEDGER.md entries, INDEX.md updates, HANDOFF.json, KDBP decisions) is documented per mode in its reference file. A deferral's PENDING row is drafted with `mcp__gabe-kdbp__pending_row_preview` — then correct the two cells the preview FIXES rather than derives (kdbp-spec §4.6): `Status: open` (it leaves Status blank, and every re-surface filter reads the literal `open`) and `Times Deferred: 0` (it stamps `1`; the ladder counts from 0) — and then WRITTEN by the harness — the preview writes nothing, and the KDBP hooks only see a real Write/Edit; the LEDGER row template stays each mode's own (the preview tool's entry vocabulary does not carry `MOCKUP`). The full contracts in the reference files are binding.
