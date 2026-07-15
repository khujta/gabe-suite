# Center Layout Lab — IA / Navigation / Density Landscape

Focused web survey (2026-07-14) of how comparable products handle information architecture,
navigation, and information density — distilled for a redesign of the **Testing Command Center**
(self-contained static `file://` site: what shipped, how it was verified, the risk grid, plan/board
state, and evidence).

**Problem we're designing against:** Hub overloaded · flat 4-item top nav over ~81 pages ·
uniformly-high density · features listed in 3 places.

---

## Family 1 — Test / CI result dashboards
*Allure · Playwright HTML report · ReportPortal · Cypress Cloud · Testmo · Datadog CI Visibility*

**Dominant layout pattern.** An **overview dashboard** (charts/trend widgets, pass-fail donut) as the
landing, then a **collapsible tree** of results as the main working surface. Playwright's self-contained
HTML report is a **single filter-driven list**; Allure adds **multiple tree hierarchies exposed as tabs**.

**How they simplify nav at scale.**
- **Same facts, multiple lenses as tabs.** Allure shows the *same* test set three ways — **Behaviors**
  (epic→feature→story), **Suites** (suite structure), **Packages** (code structure) — so each role
  navigates by its preferred mental model. No duplicate data; different trees over one dataset.
- **Filter-first, not page-first.** Playwright's primary nav is **status filter chips**
  (passed / failed / flaky / skipped, by browser) over a flat list + expand/collapse — you *filter down*
  instead of *clicking through pages*.
- **Cluster at scale.** ReportPortal/Datadog add AI **failure clustering** and long-term trend
  dashboards so 10k results collapse into a handful of groups.

**Density distribution.** Landing = aggregate charts + trend widgets (calm, glanceable).
Detail-on-demand = per-test stack trace, screenshots, video, step timeline (dense, one click away).

**Steal this for the center:**
1. **One fact set, multiple tree lenses as tabs** — for us: *by Feature · by Area · by Risk* over the
   same feature list (kills "listed in 3 places" — it becomes "one list, 3 lenses").
2. **Filter chips as the primary navigation** (area · criticality · gate-status · verified/unverified)
   instead of a page strip.
3. **Overview = trend/gate widgets; evidence is details-on-demand**, never on the landing.

---

## Family 2 — Developer portals / software catalogs / scorecards
*Backstage (Spotify) · Harness IDP · Port · Cortex · OpsLevel*

**Dominant layout pattern.** A **searchable catalog** (list/table of *entities*, grouped by kind) +
a **per-entity page** whose landing is an **Overview tab** (About card · Scorecard · Relations graph ·
Links) with everything else pushed into **secondary tabs** (CI/CD, API, Docs, Dependencies). Cards laid
out on a **12-column grid**; persistent **left sidebar** for top-level nav.

**How they simplify nav at scale.**
- **Search-first catalog.** You don't browse a tree of hundreds of services — you **search/filter the
  catalog** and land directly on an entity.
- **Every entity is self-similar.** One entity = one page = same tab shape. Predictable IA regardless of
  catalog size.
- **Scorecard as the compression device.** A scorecard shows **total score + which rules pass/fail + why
  + a to-do pointer** — an entire quality story in one card.
- **Scoped/maturity-aware scorecards** (OpsLevel): standards vary by **maturity, criticality, team** —
  the same shape the center already has (tier + criticality×area).

**Density distribution.** Catalog landing = calm one-line-per-entity rows with a score badge. Density
lives *inside* each entity's tabs.

**Steal this for the center:**
1. **Treat features as catalog entities** — a searchable grid/table, one canonical list, each row a
   feature with a coverage/gate scorecard badge. (This is the clean fix for the 3-places problem.)
2. **The Scorecard component** maps almost 1:1 onto "how was this verified": score + rule breakdown
   (unit/integration/e2e/coverage/gates) + why + next action.
3. **Self-similar entity page with tabs** (Coverage · Tests · Evidence · Risk) — the ~77 drill pages
   become tabs on a predictable feature page, not free-floating pages.

---

## Family 3 — Mission-control / status / observability
*Grafana · Datadog dashboards · Statuspage · Better Stack*

**Dominant layout pattern.** A **single long scrollable surface**. Grafana: a **top KPI/overview row**,
then **detail rows grouped by area** (RED method, one row per service, row order = data flow). Status
pages: **component rows grouped into user-facing categories** + **90-day uptime bars** + a **flat
reverse-chron incident timeline**.

**How they simplify nav at scale.**
- **Most-critical top-left; group into rows.** High-level KPIs at the top, detail rows below, grouped by
  service/area. One panel answers **one question** (≤4–5 series); **color carries meaning** (blue/green
  good, red bad).
- **Drill via linked context, not a nav tree.** Grafana drill-down = **dashboard→dashboard links passing
  params**. You navigate by clicking the thing you care about, which carries its own filter context.
- **Compact history that reads in one eye movement.** The 90-day uptime bar packs a quarter of state into
  one row (one segment/day, color-coded) — huge information density, zero interaction.

**Density distribution.** The overview is **deliberately dense but flat and scannable** (F-pattern);
detail pages are calmer/focused. Status-page research explicitly warns that **accordions / progressive
disclosure add friction when users scan under stress** — *"show more, not less"* on the operational
surface; keep timelines flat and scrollable.

**Steal this for the center:**
1. **A single scrollable "mission-control" overview**: top gate/KPI strip → rows grouped by area, each
   row a compact per-feature status. Collapses the 4 flat pages into one scannable read.
2. **90-day-bar-style compact history** per feature — test-run pass history or coverage sparkline as a
   dense one-row visual (a lot of state, no clicks).
3. **Drill by clicking the object** (feature/cell) and carry its context into the detail view — instead
   of a separate top-level nav item.

---

## Family 4 — Design principles for this problem
*Shneiderman's mantra · progressive disclosure · Tufte data-ink · card/table/split-pane · nav patterns*

**Shneiderman's Visual Information-Seeking Mantra.** *"Overview first, zoom & filter, details on demand."*
The **overview is the crown jewel** — spend the most design effort there; it summarizes the whole story
and **routes** users to everything else. Everything downstream is zoom/filter/detail.

**Progressive disclosure (NN/g).**
- **Two tiers maximum.** Primary = frequent/important; secondary = rare/advanced. 3+ levels → users get
  lost. Make the progression obvious with strong **information scent** (clear "what's behind this" labels).
- **When *not* to use it:** exploratory/comparison tasks (show everything at once) and interdependent
  toggling. → The **risk grid** and **feature-comparison** views should stay fully visible, not hidden.
- **Working memory is 4–7 chunks**; 3–7 KPI cards read in ~2 seconds.

**Density: cards vs tables vs split-pane (Tufte data-ink).**
- **Cards** — 3–7 KPIs, glanceable in seconds (overview strip).
- **Tables with row-expansion** — the *Notion model*: summary in the row, full record on click (feature
  index → feature detail).
- **Split-pane / master-detail** — list left, detail right; one click from any item to its breakdown,
  no page reload (great for a static site).

**Navigation simplification.**
- **Collapsible sidebar tree** categorizes logically and lets users self-pace — scales far better than a
  flat top strip.
- **Tabs** switch views on one entity without scrolling.
- **Search / command-palette first** (Backstage's catalog) beats browsing when the object count is high.

**Steal this for the center:**
1. **Make ONE overview the crown jewel**; every other surface is reachable *from* it (mantra).
2. **Cap disclosure at 2 tiers** and list features **exactly once** — the canonical fix for "3 places"
   and the "overloaded Hub."
3. **Match density to task:** monitoring → progressive/calm; comparing (risk grid, feature table) →
   show-all, dense-on-purpose. Don't hide load-bearing state behind a click.

---

## Synthesis — 4–5 distinct layout DIRECTIONS for the center

Each differs on **layout / nav / density** (not color or skin). Pick one, or hybridize.

### Direction A — Catalog + Scorecard
- **Concept:** Features are first-class **entities** in a searchable catalog; each opens its own
  self-similar scorecard page.
- **Nav:** persistent left **sidebar** (Catalog · Board · Risk · Docs) + **search-first** catalog;
  entity page uses **tabs** (Coverage · Tests · Evidence · Risk).
- **Density:** calm catalog grid on landing (one card/feature + score badge); all density inside the
  entity tabs.
- **Fixes:** the catalog *is* the one canonical feature list (kills 3-places); thin, un-overloaded home.
- **Echoes:** Backstage / Cortex / OpsLevel.

### Direction B — Single scrollable mission-control
- **Concept:** One long overview: **top gate/KPI strip → rows grouped by area**, each row a compact
  per-feature status + history bar. No Hub/Board/Tests split — it's all one scroll.
- **Nav:** sticky **section rail / anchor jumps** by area; drill by **clicking a feature** into a detail
  page (Grafana link-with-context model). Minimal top-level nav.
- **Density:** overview is **dense-but-flat and scannable** (F-pattern, critical top-left); detail pages
  calm. Inverts today's *scattered* high density into *purposeful* high density.
- **Fixes:** collapses 4 flat pages into one scannable surface; flat-beats-accordion.
- **Echoes:** Grafana / Statuspage / Better Stack.

### Direction C — Filter-first single index (master-detail)
- **Concept:** One **master index** of features with powerful **filter chips** (area · criticality ·
  gate · verified/unverified) + **lens tabs** (by Feature / by Area / by Risk) over the *same* data;
  detail shown in a **split-pane** (list left, detail right).
- **Nav:** navigation **is** filtering + lens tabs; command-palette/search to jump. No page tree.
- **Density:** **user-controlled** — calm when filtered to what matters, dense only by choice.
- **Fixes:** replaces the flat 4-item strip; the ~77 drill pages become detail-on-demand panels, not
  standalone pages.
- **Echoes:** Playwright HTML report / Allure (lens tabs).

### Direction D — Overview-first hub, two-tier disclosure
- **Concept:** Keep a Hub, but make it a **true overview** (crown jewel): a few KPI cards + risk-grid
  thumbnail + gate summary, each linking down **exactly one tier** to detail. Strict **2-tier max**.
- **Nav:** Hub → detail (2 levels only) with breadcrumb back; sidebar optional/collapsible.
- **Density:** very **calm hub** (respects 4–7-chunk working memory); dense detail pages one click down.
- **Fixes:** attacks "Hub overloaded" head-on; enforces the 2-tier ceiling so drill pages sit *at* tier-2
  rather than scattered.
- **Echoes:** Shneiderman mantra + NN/g progressive disclosure.

### Direction E — Risk-grid-as-home (spatial map)
- **Concept:** The **criticality × area risk grid IS the landing** — a 2D heatmap where each cell shows
  count + gate color; click a cell to drill into that slice's features, then a feature, then evidence.
- **Nav:** **click-through-the-map** (zoom/filter) + a thin top strip for global KPIs; spatial navigation
  instead of a list. (Fits the operator's spatial-analogical cognitive suit.)
- **Density:** calm color-coded map up top (whole system in one glance) → progressive density on drill.
- **Fixes:** gives the at-a-glance operational read the current Hub lacks; promotes the risk grid from a
  buried widget to the primary IA.
- **Echoes:** Datadog/Grafana heatmap + observability drill-down.

---

## Sources

**Test/CI dashboards**
- [Allure Report — Improving navigation](https://allurereport.org/docs/v3/navigation/)
- [Playwright — Test reporters (HTML report)](https://playwright.dev/docs/test-reporters)
- [ReportPortal — Playwright integration / analytics](https://reportportal.io/docs/log-data-in-reportportal/test-framework-integration/JavaScript/Playwright/)
- [Testmo — Cypress test management & reporting](https://www.testmo.com/tools/cypress-test-management/)

**Developer portals / catalogs / scorecards**
- [Harness IDP — Layout of Catalog Entity Pages](https://developer.harness.io/docs/internal-developer-portal/layout-and-appearance/catalog/)
- [Backstage — Catalog customization](https://backstage.io/docs/features/software-catalog/catalog-customization/)
- [Roadie — Backstage system scoring plugin](https://roadie.io/backstage/plugins/system-scoring/)
- [OpsLevel vs. Cortex — scoped/maturity scorecards](https://www.opslevel.com/resources/opslevel-vs-cortex-whats-the-best-internal-developer-portal)

**Mission-control / status / observability**
- [Grafana — Dashboard best practices](https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/best-practices/)
- [Pttrns — Status page design patterns](https://www.pttrns.com/status-page-design-patterns-how-the-best-saas-companies-communicate-downtime/)
- [Better Stack — Getting started with status pages](https://betterstack.com/docs/uptime/getting-started-with-status-pages/)

**Design principles**
- [InfoVis:Wiki — Visual Information-Seeking Mantra (Shneiderman)](https://infovis-wiki.net/wiki/Visual_Information-Seeking_Mantra)
- [NN/g — Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- [UXPin — Progressive disclosure in dashboards](https://www.uxpin.com/studio/blog/what-is-progressive-disclosure/)
