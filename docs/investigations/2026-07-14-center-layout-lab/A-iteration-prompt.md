# Handoff prompt — iterate the Command-Center layout on **Direction A**

*Paste this into the session that holds the simplified mental model. Fill the one slot marked ⟨…⟩ before running.*

---

## What's decided (preserve in every variant)

The operator chose **Direction A ("Catalog")** as the layout base. Non-negotiables:

1. **A persistent left sidebar that renders ONE consolidated mental model of the whole command center.** The sidebar *is* the primary navigation — not a page strip.
2. **You open/expand sections in the sidebar and navigate there first; the right pane shows the content** for the current selection. Classic master–detail: drive from the left, read on the right. Section headers expand/collapse in place.
3. **Keep Direction A's visual language** (light, airy, dark sidebar, indigo accent, Inter). This pass iterates **layout + navigation mechanics**, not skin.

Base to fork: `docs/investigations/2026-07-14-center-layout-lab/directions/A-catalog/` — `index.html`, `tests.html`, `feature.html`, `catalog.css`.

## The mental model to render in the sidebar

Render **the simplified mental model this session has converged on** as the sidebar tree: top nodes = the model's facets; expanding a node reveals its children; selecting a leaf shows content on the right. **Replace** A's current sidebar tree with this model — do not carry the old one over verbatim.

⟨ PASTE THE SIMPLIFIED MENTAL MODEL HERE — the sidebar's top-level nodes, their children, and which node owns each content surface (overview / features / tests / risk / board / docs). ⟩

## Produce 3 layout variants

Same skin, same mental model — **different navigation mechanics**. Each is a **3-page vertical slice** (Overview + Tests + Feature) so they compare cleanly. Build each self-contained under `directions/A1-…/`, `A2-…/`, `A3-…/`.

Suggested spread (adjust to what the model needs):

- **A1 · Two-pane, accordion sidebar** — tree expands/collapses with **one section open at a time** (calm, low-scroll); collapsible to a ~56px icon-only rail. Content is a single scroll on the right.
- **A2 · Three-pane (Miller columns / IDE)** — `sidebar tree | middle index list of the selected node's peers | content`. For dense nodes (Features → 24 rows → one feature) you scan peers before opening one.
- **A3 · Tree + tabbed entity content** — the sidebar selects the subject; the right pane is a **self-similar tabbed page** (Overview · Tests · Evidence · Risk). Backstage entity-page style; the ~77 drill pages become tabs, not free pages.

## Data

Populate with **real gustify data** — read the live center:
`/home/khujta/projects/apps/gustify/docs/site/center/` (`index.html`, `tests.html`, `features/*.html`, `center.config.json`). Use the cook-state feature (65 checks) as the worked feature example; 1,525 checks / 89 journeys / the risk grid for the overview.

## Mechanics + constraints

- **file:// safe, fully self-contained**: no CDN, no external fonts/images; inline SVG icons; expand/collapse via `<details>/<summary>` or a tiny inline `<script>` (no framework). The active-state and the left→right drive must work by double-/single-click with no server.
- **Generator-friendly (anti-curation)**: the layout must be expressible by `build_center_docs.py` over machine-derived data — the sidebar tree and every content surface are **projections of the data + the one `center.config.json` overlay**. No hand-authored per-page prose, nothing a regen couldn't reproduce. (This is why the layout matters: it has to survive being generated.)
- Preserve "every rendered fact is a door," honest empty states, and the freshness/regen stamp.

## Deliverables

1. Three variants × (3 pages + a forked CSS).
2. A one-paragraph rationale per variant: what its navigation mechanic buys, and when it wins.
3. **Sync to claude.ai/design** → project **"Gabe Center — Layout Directions"** (id `2b199699-0070-47a7-b2c4-e2a43c17aee0`), one card group per variant. (`DesignSync` → `finalize_plan` with that `projectId` + `localDir` = the lab folder → `write_files` → `register_assets`.)
4. Update the lab launcher `docs/investigations/2026-07-14-center-layout-lab/index.html` to list the A-variants.
5. End with a recommendation: which navigation mechanic best fits the simplified mental model, and why.
