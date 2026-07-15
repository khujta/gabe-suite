# Center Layout Lab — 2026-07-14

Exploration sandbox for the Testing Command Center's **layout / navigation / information-density** —
the axis orthogonal to the earlier skin work (A–G → skin J). Five contrasting, fully-navigable slices
over **real Gustify data** (1,525 checks, 89 journeys, the risk grid, cook-state's 65-check
feature). Nothing here is wired into any build — it's a decision aid.

**Start here:** open [`index.html`](index.html) in a browser (the direction explorer).

> **Status (2026-07-14):** the exploration converged — **A3 · Tabbed** is the working layout we iterate on from here. The A–E archetypes documented below are the decision record; they now live on the claude.ai/design project *"Gabe Center — Layout Directions"* and have been removed from the local tree (only `directions/A3-tabbed/` remains locally). Everything below is kept as the history of how A3 was chosen. First A3 iteration: reconcile the sidebar nouns with the four-tab set, and give the hub its own shell (the tabs fit a *feature*, not the hub).

## Layout

```
index.html                      # launcher / side-by-side compare (the front door)
research/landscape.md           # IA/nav/density survey: Backstage, Grafana, Allure, Cortex, Shneiderman, NN/g
directions/
  A-catalog/                    # Direction A — "Catalog": Backstage/Cortex-echo, light portal skin
    catalog.css index.html tests.html feature.html
  B-cockpit/                    # Direction B — "Cockpit": Grafana/status-board-echo, dark mission-control skin
    cockpit.css index.html tests.html feature.html
  C-reconciled/                 # Direction C — "The Pass, reconciled": entity spine + Now feed + C4/ISTQB altitude ladder + test-type taxonomy
    reconciled.css index.html docs.html tests.html cookbook.html feature.html board.html
  D-readingroom/                # Direction D — "Reading Room": overview-first strict 2-tier hub, editorial serif/plum skin
    readingroom.css index.html tests.html feature.html
  E-situation/                  # Direction E — "Situation Map": risk-grid-as-home spatial nav, blueprint/steel skin
    situation.css index.html slice.html feature.html
assets/                         # forked skin-J css + icons (reference only; the directions are self-contained)
```

## The two directions

| | **A · Catalog** | **B · Cockpit** |
|---|---|---|
| Model | library — browse/search features | control room — read state at a glance |
| Nav | left sidebar tree + search | top command bar + click-to-drill |
| Landing density | calm (routes onward) | dense-but-flat (F-pattern) |
| Density lives in | the feature scorecard page | the overview itself |
| Skin | light · portal · indigo | dark · console · cyan/amber |

Not mutually exclusive: a plausible endgame is **A's IA** (catalog + scorecard + one re-lensed list)
wearing **B's cockpit** as the default home view.

## Direction C · "The Pass, reconciled" — the recommended synthesis

Built 2026-07-14 from a 13-agent research + audit + design pass (docs-IA / dev-portal / test-dashboard
research + Diátaxis + Backstage + Allure + **C4** + **ISTQB** test levels/types + a read-only gustify
audit grounding the operator's 9 navigation pains). It is not a fourth contrast — it reconciles A's
catalog IA and B's status read with the insight both missed:

**Entity is the horizontal axis (which subject) and ALTITUDE is the vertical (docs high / tests low).**
Docs and testing are not two sites to bounce between — they are two lenses at the same altitude on one
ladder (C4 System→Container→Component→Code ≈ ISTQB Acceptance→System→Integration→Unit→Static), meeting
at the feature card. What it demonstrates, page by page:

| Page | Demonstrates | Pain fixed |
|---|---|---|
| `index.html` | "Now" front door — machine-only recent events + needs-you + entity spine; absolute UTC + regen stamp | P1, freshness honesty |
| `docs.html` | entity catalog (docs lens); iconified **side-aware** chips → `docs.html#entity-<id>` anchors | P4, P7 |
| `tests.html` | tests by **type** (static→unit→integration→e2e) + named coverage gaps + `#type`/`#entity` anchors | P8, P2/P3 |
| `cookbook.html` | Story lens — analogy-led summary + one `<details>` (four quads collapsed); reciprocal link | P5 |
| `feature.html` | Testing lens — angles verdict-as-label + run-rows (status·time·evidence); reciprocal link | P2/P3 |
| `board.html` | the one status page, kept as-is; Now links into it, never restates it | P4 |

The lateral cure for P7/P9: the **same** `user` chip links to `docs.html#entity-user` on a story surface
and `tests.html#entity-user` on a testing surface — one subject, two lenses, pure anchors (no JS,
file://-safe, no hidden-tab Mermaid). Header collapsed to two rows (P6). Full analysis + open decisions
D1–D5 in the session artifacts. **Open `C-reconciled/index.html` in a browser.**

## Directions D and E — the remaining archetypes (built 2026-07-14)

- **D · "Reading Room"** (Shneiderman + NN/g) — overview-first, *strict 2-tier* disclosure. The hub is
  five large "room" bands (one metric + one sentence each), each routing exactly one click down; the
  detail pages carry the density. Editorial-calm skin: cream paper, serif display, plum accent. Answers
  "don't overwhelm me on arrival." Pages: `index.html` (rooms) · `tests.html` · `feature.html`.
- **E · "Situation Map"** (Datadog heatmap) — the criticality × area risk grid *is* the landing.
  Spatial navigation: cell → slice → feature → evidence, with the tier×area coordinate riding the
  breadcrumb. Blueprint skin: faint grid, steel-blue, tier-graded heat (red safety top → cool polish
  bottom). Fits the operator's spatial-analogical cognitive suit. Pages: `index.html` (map) ·
  `slice.html` (cell drill) · `feature.html`.

*(The old "C · filter-first master-detail" from the first research pass is absorbed into
C-reconciled's type-first tests page + per-entity anchors — nothing left on the shelf.)*

All five directions are synced to the **claude.ai/design** project "Gabe Center — Layout Directions".
