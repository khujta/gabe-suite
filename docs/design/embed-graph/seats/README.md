# The seats — mini panes on the twin's real pages

**The ask (operator, 2026-09-09):** *"Let's start … the approach about pages. Once you change the
example pages, give me the link."* These are those pages: gustify's own generated command-center
pages (the twin, `c4_head d0904f57`) with a mini pane injected at each seat the survey recommended.

| seat | page · where | pane | open it |
|---|---|---|---|
| 1 | `feature-pantry.html` · Overview tab | **entity** `pantry`, full width — all 81 pieces at T1 | [feature-pantry.html](feature-pantry.html) |
| 2 | `feature-pantry.html` · Evidence tab | **journey** ×3 — every curated workflow that names a pantry endpoint | [feature-pantry.html#tab-evidence](feature-pantry.html#tab-evidence) |
| 3 | `ledger.html` · under the KPIs | **commit** — the latest change | [ledger.html](ledger.html) |
| 4 | `tests.html` · under the KPIs | **test** ×3 — the cases covering the most pieces | [tests.html](tests.html) |
| 1+2 | every other `feature-<slug>.html` · Overview + Evidence tabs | the same two seats, for recipe · cooking · allergen · auth · progression · legal-consent | [feature-recipe.html](feature-recipe.html) · [feature-cooking.html](feature-cooking.html) · [feature-allergen.html](feature-allergen.html) · [feature-auth.html](feature-auth.html) · [feature-progression.html](feature-progression.html) · [feature-legal-consent.html](feature-legal-consent.html) |
| 5 | `entity-index.html` · top of the list | **entity** ×9 as cards, largest first — the shelf | [entity-index.html](entity-index.html) |
| 6+7 | `index.html` · Overview | **commit** — the latest change · **journey** ×6, orientation first | [index.html](index.html) |
| 8 | `architecture.html` · top | **journey** ×12 — every curated walk the cap allows | [architecture.html](architecture.html) |
| 9 | `releases.html` · top | **commit** ×3 — the newest changes | [releases.html](releases.html) |
| 11 | `board.html` · above seat 10 | **the spine** — Red · Execute · Review · Commit · Push, each a picker over the commits that beat recorded in `LEDGER.md` (newest first, the latest preselected); a drawable pick draws in seat 10, an undrawable one keeps the ledger's date · theme · gates and says the feed stops | [board.html](board.html) |
| 10 | `board.html` · under the heading | **commit** picker over all 30 in `commits.js`; every **Done card** wears the sha its resolved PENDING row recorded — live (10) it selects that commit in the seat, dim (54) it says the feed stops at `fed71a2b` | [board.html](board.html) |

*(2026-09-10: the seats grew from four to the whole centre except the station pages and the docs pages,
which carry no subject. The `arch-*` and `test-*` sub-pages are not seated — say if one should be.)*

*(Seats 10 + 11 have since landed on the generated board — see "The real wiring" below. The rows above,
and the two paragraphs after this note, keep the mock's wording; the shipped board differs in three
places: an undrawable pick says **not in the feed** (never "the feed stops"), a switch tears the pane
down through `GabePane.destroy`, which also loses its WebGL context (never `_destructor`), and the two
strips are labelled by plain name — **the spine** · **the changes** — never `SEAT N`.)*

**The picker (operator, 2026-09-10).** A section with many graphs shows **one**, full width like the entity
seat, and a **dropdown in the seat head — outside the graph — chooses which**. Every multi-subject seat
(walks · entities · tests · commits · a feature's journeys) works this way now, so the caps that kept a page
under twelve panes are gone: the architecture seat offers all 16 walks, releases the newest 12 commits, tests
the 12 most-covering cases. Switching tears the previous pane down (3d-force-graph's `_destructor` + the
wrapper) so a seat holds **one WebGL context** however often it is switched — the browser caps contexts at
about sixteen, and a leak would end the page after a dozen picks. `seats-probe.mjs` switches every picker
and asserts one canvas before and after.

Each seat is the dashed strip labelled `SEAT N`, in the **console skin** (the default since 2026-09-09). Everything outside the strip is the twin's page as
generated; the sidebar links go back to the twin, so the demo navigates like the real centre.

## What this is, and is not

**Throwaway by design.** `build-seats.py` reads the twin's pages, injects the strips, rehomes every
asset, feed and link to the twin by RELATIVE path (an absolute `file:///home/…` URL resolves to nothing
from Windows Chrome via `wsl.localhost`), and writes the result here. The twin's own
files are never touched. It is the *look*, for a yes/no on the seats.

**The real wiring is a generator change** — and for the board it has landed (D-043 · D-046):
`render_board` fills `{{BOARD_SEATS}}` from `_a3_seats.py` (markup only), `assets/seats.js` boots the
spine strip and the commit picker, `_a3_commits.refresh_feeds` writes `commits.js` + `spine.js`, and
the pane runtime ships from `templates/center/shell/assets/` (generated by `../promote.py`, D2). The
done-card sha chips belong to `_a3_board` (its card markup). The other pages' seats (1–9) are not
wired; this folder stays the look for them.

## Why the twin, not this repo's example pages

This repo's example feature pages (`example/feature-transaction.html` …) are **gastify's**; the pane feed
in `example/codebase-graph-station/` is **gustify's**. An entity pane for `transaction` against a
gustify map resolves honest-empty. The twin has both halves at one head.

## Findings from the first render

- **The pane must own its ink.** On the centre's light page the pane head inherited dark body text
  onto its dark ground and every title vanished. `.pn` now sets `color` and `font` itself — a pane
  can never depend on the host's text colour. Fixed in `_pane.css`.
- **The pane's CSS must be scoped.** `_pane.css` styles `body` for the spike pages; loaded wholesale
  on a centre page it would repaint the skin. The builder takes only the `.pn*` zone and prefixes it
  under `.seat`, with the pane's tokens redefined on `.seat` instead of `:root`.
- **The twin's `commits.js` is staler than its ledger.** The ledger's latest change is `d0904f57`;
  `commits.js` stops at `fed71a2b`. Seat 3 degrades to the newest commit it has and says so on the
  strip. `commits.js` is landed at regen time, the ledger is not — a freshness gap the seat exposed.

## The round trip, all four scopes (2026-09-10)

Copy a view from any pane and paste it into the station's paste box. A **journey** starts its walk; an
**entity** frames and focuses its cluster; a **commit** starts the station's own commit walk (`commit:<sha>`
from `commits.js` — every touched piece still on the map, entity by entity); a **test** case starts its
journey by C-id. Before this, a commit view fell through to the pane's one selected piece and arrived as a
single-node trail. `paste-probe.mjs` round-trips all four (44 asserts).

## Rebuild

```bash
python3 docs/design/embed-graph/seats/build-seats.py      # ~1 s, no browser, no twin build
GABE_TWIN_CENTER=/path/to/another/center python3 build-seats.py
```
