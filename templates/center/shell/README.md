# Center shell templates — A3 · Tabbed (the ruled layout)

The command-center SHELL every `/gabe-adopt init` bootstraps from — the layout-lab convergence
(2026-07-14; decision record: `docs/investigations/2026-07-14-center-layout-lab/README.md`,
archetypes on the claude.ai/design project "Gabe Center — Layout Directions").

**The shape, in one line:** a persistent left sidebar of section/entity nouns (`aside.side`)
picks a SUBJECT; every subject — the hub included — renders as the same self-similar page with
a four-tab bar (`nav.tabbar`: Overview · Tests · Evidence · Risk). Tabs re-lens one subject;
the sidebar changes subjects. The hub gets its own shell (`index.html`), features get
`feature.html`.

## Files — the full station set (the connection map's left column, as templates)

Every crucial section of the center has a skeleton here, pre-wired (in comments, per slot) to
the FILES that feed it — so generators fill structure, never invent it. Two page models:
**subjects** (hub · feature · tests) carry the invariant four-tab bar; **stations** (board ·
entities · docs · ledger · releases) are single-lens pages — a station shows one thing well.

| Template | Map section | Fed by (the map's middle column) |
|---|---|---|
| `assets/a3.css` | the shell itself + the identity layer | — (lab css + the landed-map palette; evolve HERE, never per-project) |
| `index.html` | Hub + **Now** (Overview tab = recent changes + needs-you) | LEDGER.md · git · DEPLOYMENTS.md · digests · PENDING.md · walks.jsonl · PLAN |
| `feature.html` | Feature/entity subject | cards/*.md · center.config.json · junit globs · proof/ · git |
| `tests.html` | **Testing** — matrix · ever-red · manual angles · demo shelf | corpus C-ids · junit+digests · git `RED:` trailers · walks.jsonl · proof/ |
| `board.html` | **Board** — rail · review-debt · non-phase · backlog | PLAN.md/PLAN.json cells · PENDING.md · git/LEDGER · SCOPE arc |
| `entity-index.html` | **Entities** | center.config.json entities[]/features[] · adoption.json |
| `docs.html` | **Docs** — feature-docs accumulator · foundations | cards/*.md · SCOPE · DECISIONS · RULES · BEHAVIOR |
| `ledger.html` | **Ledger** — one page per change, ephemeral | git (commit/PR, trailers) · PLAN cells flipped · LEDGER row |
| `releases.html` | **Releases** — stakeholder showcase | DEPLOYMENTS.md · Center-covered phases · curated proof |
| *(no template)* | **Leaf** — OSS reports | external links in `{{SIDEBAR_NAV}}` (htmlcov, playwright report) |

## The identity layer (ships IN the skeletons — never regenerated per project)

- **Sidebar**: the STATION SET is static in every skeleton — colored group labels
  (`.navlabel.g-now/.g-board/.g-ent/.g-docs/.g-test/.g-ledger/.g-rel/.g-leaf`, the landed-map
  palette) + one exclusive icon per station (home · trello · layers · book · check-circle ·
  archive · award). Generators fill only the project-specific parts (see contract below).
- **Tab bar**: the four tabs carry exclusive icons (eye · check-square · paperclip · shield),
  static in the skeletons.
- **Section banners**: every map section renders under a `<section data-sec="<id>"
  style="--gc:<group color>">` + `.sechead` banner (tinted, iconed) — SHIPPED in the skeletons,
  so sections are identifiable wherever they appear (the matrix banner is the same on tests.html
  and, entity-scoped, on feature.html). Exclusive section icons: clock · bell · list ·
  alert-triangle · git-branch · inbox · box · file-text · book-open · table · camera ·
  user-check · image · git-commit · tag. Aux slots (buckets/gates) reuse their parent
  section's banner identity — same `data-sec`, same icon.

## Placeholder contract (what a generator must fill)

`{{PROJECT_NAME}}` `{{LANG}}` · sidebar slots: `{{SIDEBAR_ENTITIES}}` (one `.navitem` per
APPROVED-baseline entity — box icon, link to its feature page, class `on` when current; never
from an archived nav) `{{ENTITY_COUNT}}` `{{TESTS_COUNT}}` `{{SIDEBAR_TESTS_SUB}}` (`.navsub`)
`{{SIDEBAR_LEAF}}` (external `.navitem` links: htmlcov, playwright report) ·
`{{REGEN_STAMP}}` `{{HEAD_SHA}}` `{{GENERATOR_NAME}}` (the foot is machine truth) ·
`{{STATUS_PILLS}}` `{{SYNC_AGE}}` · `{{HUB_TITLE}}` `{{HUB_LEDE}}` `{{HUB_HEADLINE_STATS}}` +
hub Overview subsections `{{RECENT_CHANGES}}` `{{NEEDS_YOU}}` (under their shipped banners) /
`{{SUBJECT_TITLE}}` `{{SUBJECT_LEDE}}` `{{SUBJECT_HEADLINE_STATS}}` ·
`{{TAB_OVERVIEW}}` `{{TAB_TESTS}}` `{{TAB_EVIDENCE}}` `{{TAB_RISK}}` (content only — the
banners above them are static). Tabs are pure-CSS `:target` (`.tabbar` anchors →
`.tabbody > .tabpane#tab-*`) — deep-linkable, no script; the Overview pane shows by default
when nothing is targeted. Raw skeletons render styled in place (`assets/a3.css` resolves in
this dir), and `assets/slots.js` renders any unfilled `{{TOKEN}}` as a labeled dashed chip
plus a "template skeleton" notice bar — so a raw open reads as a template awaiting its
generator, never as a broken page. On generated pages no tokens remain and the script is a
no-op (tab navigation stays pure CSS either way). Generators copy `assets/` wholesale.

## Rules

- **The archived project's legacy shell/css is never a source of chrome** (adopt-spec shell
  contract) — the archive is testimony to re-verify, not styling to restore.
- The four-tab set is invariant across subjects — self-similarity IS the navigation model.
- Content in every tab is generated from machine sources (junit, git, walks.jsonl, digests);
  authored prose only translates (anti-curation).
- Generators consume these skeletons by slot substitution; a project's generator may add
  slots but must fill every listed one or render an honest gap.
