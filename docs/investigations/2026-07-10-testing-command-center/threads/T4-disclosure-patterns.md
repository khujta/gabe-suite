# T4 — Progressive-disclosure UX pattern catalog (raw thread report)

> Produced 2026-07-10 by the T4 research agent (Sonnet 5). Catalog only — design decisions deferred to the operator.
> Synthesis lives in `../output/01-options-report.md`; this file is the receipt.

## PART 1 — How existing tools structure drill-down

### Allure Report
- **Altitude ladder:** Overview tab (status pie, environment, executors, categories widgets) → three switchable tree tabs (Suites / Behaviors / Packages) → suite node → test-case page → Attachments. Timeline + Graphs tabs. **~3–4 clicks** top → failing test's screenshot.
- **Idioms:** tree sidebar with three alternate hierarchy lenses over the same result set; tabs; donut/bar charts; block-timeline with duration slider; per-test sub-tabs (steps, attachments, retries).
- **Deep links (static):** static output but a SPA loading JSON via fetch — cannot open over bare `file://` (CORS); stable per-test UID route (`testcases/{uid}`, allure2 #68); stable across regenerations only while test identity (suite+name) holds.
- **History:** trend charts via `history.jsonl` that CI must carry forward and merge — pure file-based, works statically, manual wiring is a documented pain (discussion #2703).
- **Steal:** three-lenses-on-same-data. **Pain:** fragile history continuity; link annotations resolving into the report (#530, #653).
- Sources: allurereport.org/docs (visual-analytics, how-it-works, v3/navigation), allure2 issues #68/#530/#653, discussion #2703.

### Playwright HTML reporter
- **Ladder:** file-grouped results list (status tabs + search) → test detail (steps, retries) → screenshots/traces inline → Trace Viewer (timeline → per-action before/after DOM snapshots, network, console). **~2 clicks** to failing screenshot.
- **Idioms:** status filter tabs; title search; expandable step rows; trace icon → Trace Viewer.
- **Deep links (static):** genuinely self-contained; hash routing `index.html#?testId=<hash>` (#14310) resolves client-side — works from any static host; stable while test-identity hash holds.
- **History:** none (known gap #19010).
- **Steal:** Trace Viewer time-travel from one portable trace.zip. **Pain:** load/parse perf on large reports (#36892).
- Sources: playwright.dev/docs/test-reporters, /docs/trace-viewer-intro, issues #14310/#19010/#36892.

### ReportPortal
- **Ladder:** widget dashboards → Launches table → Suite → Test → Step → Log → attachment preview. **~4–5 clicks.** Component Health widgets drill 10 levels.
- **Idioms:** widget grid; count cells as pre-filtered drill-downs; nested suite tree; Log view tabs; attachments-only filter.
- **Deep links:** server routes over DB ids — only while backend is up. No static mode exists.
- **History:** launch-over-launch trends, flaky tracking, ML auto-analysis, Unique Error clustering — live from Postgres/OpenSearch; inherently non-static.
- **Steal:** Unique Error clustering (triage one root cause, not N symptoms). **Pain:** operational weight (multi-service; perf/sizing complaints #1283/#2311/#2517/#2061).

### Vitest UI
- **Ladder:** dashboard/explorer (sidebar file list) → file → suite tree → test detail; Module Graph tab → "Import Breakdown" ranked list. **~2 clicks.**
- **Deep links:** normally a live Vite server; `reporters: ['html']` gives a static report "identical to the UI" — routing/link stability undocumented (open question).
- **History:** none.
- **Steal:** graph → ranked-table handoff. **Pain:** can only re-run whole files (#6638).

### istanbul / coverage.py HTML
- **Ladder:** istanbul: root index → per-directory pages → color-annotated source (2–3 clicks). coverage.py: flat sortable table → file page (1 click). Leaf = colored line reached by scroll.
- **Idioms:** color-coded lines (green/red/yellow/gray); coverage.py sortable headers + stat-buttons that display AND toggle highlight categories; keyboard shortcuts.
- **Deep links:** pure static. coverage.py wraps every line in `id="t{line}"` → `file.py.html#t123` is a genuine stable line-level deep link. istanbul per-line anchors not confirmed.
- **History:** none native; diff-cover/Codecov ecosystem exists to answer "better than last time?".
- **Steal:** dual-purpose stat-buttons. **Pain:** no diff-aware coverage or history natively.

### GitHub Checks / Actions summaries
- **Ladder:** PR → Checks tab → check run → annotations / step logs; line annotations inline in Files-changed. ~2–4 clicks.
- **Deep links:** server routes only. Interesting artifact: the Checks annotation shape (path, start_line, end_line, level, message, details_url).
- **Steal:** severity-leveled annotations at the point of change. **Pain:** no native structured test rendering (discussion #163123); 50-annotation API cap.

### Currents.dev
- **Ladder:** dashboard → runs → run → spec files (sortable by failed/duration/flakiness) → test row (retry tabs) → attempt detail (video/screenshot/trace). ~4–5 clicks. Parallel cross-run Explorers.
- **Idioms:** history timeline histogram (bar per execution: color=outcome, height=duration) with brush/zoom; sparklines on explorer rows; current-vs-previous-period dual-line overlays with delta %; filter chips with presets; CSV/JSON export.
- **Deep links:** SaaS routes (`app.currents.dev/run/[id]`). Lesson for a static clone: pre-bake the ID scheme at generation time (`runs/<timestamp>/<spec>.html#<test>`).
- **History (core value):** failure/flakiness rates, trend deltas, auto flaky tagging + quarantine — all DB-backed; a static build can only bake bounded last-N-runs.
- **Steal:** period-over-period overlay with delta % (cheap: two snapshots + diff). **Pain:** information overload; filters don't persist across views.

## Generic pattern catalog (when it earns its place at dozens-of-specs scale)

- **master-detail** — almost always; the single best fit for dozens of specs; cheap.
- **tree-table** — only if grouping carries real meaning (6–10 feature groups); flat sortable table does the job with one less layer.
- **sunburst/treemap** — essentially never at this scale; solves unscannable volume that doesn't exist here.
- **sparkline trends** — always; scales down perfectly; needs a carried-forward history file.
- **status-grid / heatmap (specs × runs)** — genuinely appropriate if bounded (30 specs × 20–50 runs); answers "which spec started failing when" better than any list.
- **breadcrumb drill** — always; value tracks depth (4–5 levels), nearly free.
- **expandable rows** — very well suited; lazy inline detail, avoids app-shell weight; the lighter static-first alternative to master-detail.
- **evidence lightbox** — always; solves "view artifacts well" not volume; the most static-friendly pattern; gustify e2e page already ships a sibling.

## PART 2 — Cifra shell capability audit

### What exists today
- **Gustify docsite** (~30 pages): topbar (brand, breadcrumb, bionic toggle), left sidebar of native `<details>` accordions w/ color swatches + localStorage persistence, collapse-to-rail wide / drawer narrow. Hub = masthead + card grid. `assets/site.css` (406 lines) + `site.js` (active-nav, scroll-spy). **No search. No hash routing. No lightbox/tabs/filtering in the shared layer.** Status chips exist: `.doc-tag--live/pending/planned/deprecated` + severity variants; `.ok`/`.warn` callouts.
- **The load-bearing precedent — `e2e.html`** (828 lines, generated by build_e2e_docs.py): grouped Tests table w/ entity chips + CRUD glyphs + capture badges + run-status spans (`data-status-spec`); coverage-map **view toggle** ("By feature"/"By entity") + tab pills in ~50 lines vanilla JS; per-spec screenshot **carousels** lazy-probing `data-src` images from gitignored artifacts with placeholder fallback (prev/next, dots, keyboard); hash **anchors** (`#tests`, `#cap-<spec-id>`) stable across regenerations (IDs derive from spec names); master-detail via separate journey-*.html pages. One divergence: loads mermaid from CDN as ES module (against the suite's vendored-classic convention).
- **Suite docsite:** same shell family via gabe-docsite generator; single-level sidebar; tier chips; vendored classic mermaid.min.js (3.5 MB, works over file://); no page-local styles.
- **gabe-docsite skill:** site.css (501 lines) full primitive inventory (masthead, auto-numbered h2 w/ stable slug ids, notes, cards, tables, chips/pills/tags, doc-tag chips, mermaid-fig, sidebar, breadcrumb, footer stamp); site.js (drawer, collapse, bionic, active-nav) — nothing else. Generator: markdown subset; **`render_inline` HTML-escapes body text → raw HTML widgets impossible through the markdown path.** Playwright diagram-compliance gate asserts rendered SVGs over file://.

### What a command center needs that the shell lacks
| Need | Shell status |
|---|---|
| Status badges/chips | Present (authored, not data-driven) |
| Cards, tables, callouts, mermaid | Present |
| Stable hash anchors | Present at heading level; arbitrary IDs shown in e2e.html |
| Collapsible groups | Present (sidebar `<details>`) |
| Client-side tree filter / search | **Absent everywhere** |
| Filter chips / view toggles / tabs | Absent from shared layer; one-off in e2e.html page-local JS |
| Status coloring from run JSON | Absent from gabe-docsite; demonstrated by build_e2e_docs.py + run-status.js |
| Lightbox / gallery | Absent; nearest = e2e.html carousel (page-local) |
| Hash routing (view switching) | Absent; only plain anchors |
| >2-level nav / breadcrumb | Absent (generator hardcodes Hub › Page) |

### Capability verdict (facts)
The command center **can physically live inside this shell** — e2e.html is the existence proof. It does **not** fit through the gabe-docsite markdown path (HTML-escaped body; no filtering/lightbox/routing in shared JS; no dashboard CSS classes). Everything beyond static prose was achieved in e2e.html via a bespoke per-page builder emitting raw HTML + ~130 lines page-local CSS + ~250 lines page-local JS. Drill-down here is multi-page + intra-page anchors; there is no SPA layer.

## Pattern menu

| Pattern | What it shows | Static feasibility | Complexity | Demonstrated by |
|---|---|---|---|---|
| Overview stat widgets | run-level totals at a glance | Full — baked | Low | Allure Overview; RP dashboards |
| Master-detail (separate pages) | spec list → detail page | Full — links | Low | gustify e2e→journey-*; Allure |
| Master-detail (same-page panel) | list + detail pane | Full — client JS | Medium | Vitest UI; Playwright |
| Tree-table / grouped rows | suite → spec hierarchy | Full — details/grouped tr | Low–Med | Allure Suites; gustify grouprow |
| Expandable rows | inline failure detail | Full — client JS | Low | Playwright step rows |
| Status filter tabs/chips | narrow to Failed/Flaky | Full — data attrs | Low–Med | Playwright tabs; gustify cov-pill |
| Three-lenses regrouping | same results, 3 groupings | Full — pre-render + toggle | Medium | Allure Suites/Behaviors/Packages |
| Status-grid heatmap (specs × runs) | which spec broke when | Full if last-N baked | Medium | Currents timeline (1-D cousin); no static tool ships 2-D |
| Sparkline trends | per-spec recent history | Partial — carried-forward history file | Medium | Currents; Allure history.jsonl |
| Period-over-period overlay | window vs window + delta | Partial — two snapshots | Medium | Currents |
| Breadcrumb drill | position in hierarchy | Full — generated | Low | RP; Cifra shell (needs >2 levels) |
| Evidence lightbox/carousel | screenshot gallery + fallback | Full — pure client JS | Low–Med | gustify speccard; Allure attachments |
| Attempt/trace detail | retry tabs, step timeline | Full for shots/logs; trace.zip → PW static viewer | High (link out, don't rebuild) | Playwright Trace Viewer |
| Line-level coverage links | file.html#t123 | Full — stable anchors | Free | coverage.py htmlcov |
| Stable-ID deep links | links survive rebuilds | Full if IDs from names not run data | Low (discipline) | PW #?testId; coverage.py; e2e.html #cap-* |
| Treemap/sunburst | proportional coverage | Full technically | High — overkill at this scale | istanbul viewers |
| Failure clustering | N failures → few causes | Not static (service/ML) | Very high | ReportPortal |

**Cross-cutting findings:** (1) every history/trend feature reduces to ONE static-compatible mechanism: a machine-readable history file carried forward between runs and baked into the next build (Allure history.jsonl proves it). (2) Link stability across regenerations is a NAMING DISCIPLINE — IDs derived from spec/test names survive rebuilds; IDs derived from run data don't. (3) gustify's live-artifact probing (stable filenames, gitignored, placeholder fallback) is a fourth freshness mode none of the commercial tools have: evidence refreshes without regenerating the page.
