# Center shell templates — A3 · Tabbed (the ruled layout, post-trial contract)

The command-center SHELL every adoption builds from. Field-tested end-to-end by the gastify
transaction trial (2026-07-20/21, absorbed at suite `55918c4`); nav contract merged per the
landed map v3. Distribution: this dir installs to `~/.claude/templates/gabe/center/shell/`;
projects VENDOR a copy (their `templates/center/shell/`) as the build input — reproducible per
commit — and improvements loop back HERE via export handoffs. The suite is the source of truth
and the distributor; a vendored copy is never edited ahead of a handoff.

**The shape:** a persistent left sidebar of stations + entity nouns picks a SUBJECT; feature
pages carry the invariant FIVE-tab bar (Overview · Code · Tests · Evidence · Risk); stations are
single-lens pages. Pure-CSS `:target` tabs (`:has(:target)` variant so in-page anchors and
subnav links do not collapse the pane).

## The exemplar — follow it, don't re-derive it

`example/feature-transaction.html` is a SNAPSHOT of the gastify trial's real generated page —
the field-tested output every ruling in this README was shaped on. Open it beside any section
you build: the five tabs, the hide/show behaviours (secinfo ⊕ legends, pmore truncation,
proofset/legset folds, expander rows + cascade), the color encodings (verbs, layers,
severities, type families — each with its legend), the meters, the cid chips, the subnavs, the
diagram picker, the viewer. It renders from the SHIPPED `../assets/` (proof the css here is the
css that built it); proof shots are labeled placeholders (real artifacts live in gastify);
sidebar links open the raw skeletons. **The rules live in the specs; the example of the rules
lives here.** When a rule and the exemplar disagree, that is a handoff finding, not a choice.

## The ownership rule (binding)

**The skeleton owns the TAB SET and the NAV GROUPS; the generator owns the sections inside a
pane.** Overview, Tests and Evidence panes ship BARE (`{{TAB_*}}` only) because their internal
sectioning (order, subnavs, expanders) is generator logic. Every generator-emitted section MUST
carry its identity: `sechead(…, sec_id=)` emits `data-sec="<id>"` on the wrapper — the same
section is identifiable on its station page and, entity-scoped, on feature pages. A section
page built from scratch instead of its template is a defect (adopt-spec).

## Files — the station set

| Template | Role | Tabs |
|---|---|---|
| `index.html` | hub SUBJECT — Overview tab contains `now.recent-changes` + `now.needs-you` | 4 (no Code) |
| `feature.html` | entity SUBJECT — one per adopted entity, generated from registration data | **5** |
| `tests.html` | Testing SUBJECT — buckets/changelog · matrix · walks+shelf · gates | 4 |
| `board.html` `entity-index.html` `docs.html` `ledger.html` `releases.html` | single-lens STATIONS | 1 |
| *(spec'd, next loop)* `architecture.html` | app-wide Architecture STATION rendered from `archmap.json` | 1 |
| `assets/a3.css` | the skin + identity layer + trial vocabulary (evolve via the loop, never per-project) | — |
| `assets/slots.js` | raw-skeleton affordance: unfilled `{{TOKEN}}`s render as labeled chips + a notice bar; inert on generated pages | — |
| `assets/a3-settings.js` | viewer settings (cog in `.brand`): 10 content fonts, size S–XL, compact, rail, Light/Dark — localStorage | — |
| `assets/a3-lightbox.js` | proof viewer + expander cascade; delegated on `a[data-lb]`, progressive (anchors resolve with JS off) | — |

## The ruled nav (landed map v3 — merged 2026-07-21)

Static in the skeletons: the station items (Overview · Board · Entity index · Docs · Tests ·
Latest change · Releases), the colored group labels (`g-now/g-board/g-ent/g-docs/g-code/g-test/
g-ledger/g-rel/g-leaf`), and the Testing navsub (`matrix · evidence · gates` — deep links to the
tests page's own tabs; never authored, so it cannot drift). Generator-filled:

- `{{SIDEBAR_ENTITIES}}` — **adoption.json is THE registry and drives this list** (D123):
  adopted rows link their feature pages; pending rows render MUTED with their tracker state
  chip (pending/building/awaiting-approval), linking the entity index. Labels come from the
  registry row's `display_name` — one fact, one word, on every surface.
- `{{SIDEBAR_CODE}}` — the Architecture item: render it ONLY when `architecture.html` exists;
  else a muted "not built yet" line. The per-feature Code TAB deliberately has no nav item.
- `{{SIDEBAR_LEAF}}` — each known OSS report (htmlcov, playwright) WHEN its file exists on
  disk; else a muted "none wired yet" line. Never a dead link.
- `{{ENTITY_COUNT}}` `{{TESTS_COUNT}}` — live counts; every chrome number must be traceable to
  a section that leads with it (pills are links).

**Containment rule:** a nav item opens a PAGE; the page may hold several map sections
(Overview → recent-changes + needs-you; Board → rail + three lanes). One item per station —
sections are not nav entries.

## Placeholder contract

`{{PROJECT_NAME}}` `{{LANG}}` · sidebar: `{{SIDEBAR_ENTITIES}}` `{{SIDEBAR_CODE}}`
`{{SIDEBAR_LEAF}}` `{{ENTITY_COUNT}}` `{{TESTS_COUNT}}` · foot: `{{REGEN_STAMP}}`
`{{HEAD_SHA}}` `{{GENERATOR_NAME}}` · chrome: `{{STATUS_PILLS}}` `{{SYNC_AGE}}` (the pills
cluster rides IN the tabbar — `.tpills`; the topbar crumb scrolls away, the tabbar is sticky) ·
hub: `{{HUB_TITLE}}` `{{HUB_LEDE}}` `{{HUB_HEADLINE_STATS}}` `{{RECENT_CHANGES}}`
`{{NEEDS_YOU}}` `{{TAB_TESTS}}` `{{TAB_EVIDENCE}}` `{{TAB_RISK}}` · feature:
`{{SUBJECT_TITLE}}` `{{SUBJECT_LEDE}}` `{{SUBJECT_HEADLINE_STATS}}` `{{TAB_OVERVIEW}}`
`{{TAB_CODE}}` `{{TAB_TESTS}}` `{{TAB_EVIDENCE}}` `{{TAB_RISK}}` · station pages keep their
named slots (see each file's comments). A generator may add slots but must fill every listed
one or render an honest named gap — **a false gap is as dishonest as a false pass.**

## Section inventory per tab (feature pages — the five-tab contract)

| Tab | Sections (generator-owned) | Audience |
|---|---|---|
| Overview | card (lens block leads) · diagrams (picker) · growth · decisions changelog | everyone |
| Code | endpoints · code map · data model — ALL from `archmap.json`, the read-once code map | developers |
| Tests | kinds & coverage · matrix (rows expand to cases) | "is it tested?" |
| Evidence | proof sets (rows → legs → galleries; reference files HELD OUT, stated) · not proven here | business |
| Risk | register (4-field grammar, GAP rows link growth) · not carried forward | whoever prices it |

Every tab pairs an accumulator with an ephemeral half (adopt-spec §ephemeral/accumulator):
card / card `# CODE` / **testing claim card (spec'd)** / `manifest.json` per set / card `# RISKS`.

## CSS vocabulary (the trial's additions — legend where used, always)

`.tpills` tabbar cluster · `.subnav` sticky per-tab nav · `details.secinfo` (⊕ legend beside a
section title; tables never hide) · `details.pmore` (word-boundary truncation carrying its own
⊕ — every truncation must) · `details.proofset` + `details.legset` (proof rows → legs; NOT
`.leg`, which is the legend row) · `.tbl tr.exp` expander rows + open-highlight · `.dgm`
diagram picker · `.lens*` + `details.more` (card folds) · `.tag.m-*` HTTP verbs · `.l-*`
layers · `.s-*` severities · `.fm-*` font-only verb links · `.ty-*` type families (deeper =
wider type; uncolored = domain alias, say so) · `.meter` (bar + count in one cell) · `.cid`
case-id chip (`.cid.none` = `—`, never "un-run") · `.tag.e-*`/`.st-*` effort/stage pricing ·
dark theme via `[data-theme="dark"]` (mermaid SVGs get an honest light plate) · viewer vars
`--root-size`/`--font-content`/`--side-w`, `data-compact` (vertical density) ≠ `data-rail`
(icon collapse). Chrome uses damped `calc()`, not pure rem — it must hold one line at every
viewer setting; under width pressure scroll, never wrap, never truncate.

## Behaviour contract (the JS layer — guard required)

Viewer: click opens the artifact IN the page; ←/→ run the WHOLE set leg by leg; ↑/↓ change
SET (fold current, unfold next); no wrap at the ends (wrapping silently changes subject); top
line = leg + position, bottom = set. Expanders CASCADE to sub-sections — one toggle, one
decision (`toggle` doesn't bubble: capture phase, and tests must wait a tick). Tab navigation
itself stays script-free. **This layer ships only with its committed harness** (the 360-combo
chrome proof was rebuilt as tests after the trial deleted it — do not regress this).

## Rules

- The archived project's legacy shell/css is never a source of chrome.
- Content is generated from machine sources; authored prose only translates; a card must not
  restate a number the build can read.
- Raw skeletons render styled in place; `slots.js` labels unfilled slots — a template awaiting
  its generator, never a broken page.
- Generators copy `assets/` wholesale; the vendored copy is the build input (never `$HOME`).
