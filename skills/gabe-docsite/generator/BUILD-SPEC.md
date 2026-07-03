# gabe-docsite generator — build spec (implementation contract)

A **generic, project-agnostic** markdown→HTML static-docs-site generator. Adapted from
gustify's `scripts/build_docs_site.py` + `_docs_shell.py` (the mature original), but:
(a) genericized — NO project-specific sections, paths, or vocabulary baked in; everything
comes from a per-project **config**; (b) diagrams fixed to the **vendored classic mermaid**
convention (works over `file://`, no CDN, no ESM, no build-time browser); (c) de-bloated so
every `.py` stays **< 800 lines** (split if needed).

## Files to produce (all under `skills/gabe-docsite/generator/`)

- `build_docsite.py` — the CLI + orchestrator + no-dependency markdown→HTML converter.
- `_shell.py` — `document(...)`, `render_nav(config)`, `breadcrumb(...)`, hub/card rendering. Pure functions of the config.
- `docsite.config.example.py` — a fully-commented example config a project copies + edits.

## The config (the ONLY place project specifics live)

A plain Python module exposing:

```python
SITE = {
  "title": "The Gabe suite",          # hub H1
  "kicker": "The KDBP Development Suite · Khujta AI",
  "brand": "🔧 GABE",                  # topbar brand (emoji + word)
  "brand_sub": "the KDBP development suite",
  "lang": "en",
  "footer": ["<b>GABE</b> · …", "Source of truth: …", "Visual system: Cifra · Chile editorial palette"],
  "src_dir": "docs/src",              # markdown sources (relative to config file)
  "out_dir": "docs/site",             # generated output
  "hub_intro_md": "docs/src/_hub.md", # optional: markdown for the hub's lede + system diagram
}

# SECTIONS carry the progressive-disclosure TIERS. Order = reading order (basic → advanced).
SECTIONS = [
  {
    "key": "foundations",
    "label": "Tier 1 · Foundations",
    "difficulty": "basic",            # basic | core | advanced | None → renders a .chip on hub + sidebar group
    "docs": [
      {"slug": "kdbp", "source_md": "kdbp.md", "title": "What KDBP is",
       "nav_label": "What KDBP is", "kicker": "Tier 1 · Concept",
       "summary": "one-line hub card blurb", "swatch": "#3a6b3a"},
      # …
    ],
  },
  # …
]
```

`build_docsite.py --config <path/to/docsite.config.py>` reads it, renders every doc, writes the hub, copies assets.

## Rendering rules

1. **Shell** — every page wears the identical chrome (topbar brand + breadcrumb + bionic toggle; collapsible sidebar built from SECTIONS with swatch dots + difficulty chips on the group label; masthead with kicker+difficulty-chip+H1+lede; footer). Reuse the exact markup our `_TEMPLATE.html` / existing pages use so `assets/site.css` + `assets/site.js` style it unchanged. The active sidebar link = the current page.
2. **Markdown subset** (no-dep converter; keep gustify's): ATX headings, `-`/`*` + ordered lists, `- [ ]`/`- [x]`, tables (wrap each `<table>` in `<div class="table-wrap">`), `[text](url)`, `---`, inline + fenced code, bold/italic, blockquotes. Headings `## ` render with a `<span class="num">NN</span>` auto-number per page (matching the existing pages).
3. **Callout directive** (converter extension, for styled notes): a fenced block
   `:::note Optional Label` … `:::` → `<div class="note"><span class="lbl">Optional Label</span> …inner markdown… </div>`. If no label, omit the `<span class="lbl">`. This is the only container directive; keep it simple.
4. **Diagrams — the fixed convention:** a ```` ```mermaid ```` fence → `<pre class="mermaid">SOURCE</pre>` wrapped in `<figure class="mermaid-fig">`. Any page containing ≥1 diagram gets, before `</body>`:
   `<script src="assets/mermaid.min.js"></script>` then a **classic** (NOT module) init script:
   `<script>mermaid.initialize({startOnLoad:true, theme:"base", themeVariables:{ …Cifra palette… }, flowchart:{curve:"basis", htmlLabels:true, useMaxWidth:true}});</script>`.
   Cifra theme vars: background #ece6d8, primaryColor #f5f0e2, primaryBorderColor #b65a2b, primaryTextColor #1b1a17, secondaryColor #e6dec8, tertiaryColor #ece6d8, lineColor #6e6757, fontFamily "Space Grotesk, system-ui, sans-serif", fontSize 13px. NEVER emit a CDN URL or `type="module"`.
4. **Hub (`index.html`)** — masthead (SITE.title/kicker/lede from `hub_intro_md`), an optional system diagram (a ```mermaid fence in `hub_intro_md`), then one `<h3>` per SECTION (with its difficulty chip) followed by a `<div class="cards">` of `<a class="card">` built from each doc's `kicker`/`title`/`summary`. Order = SECTIONS order.
5. **Assets** — copy `skills/gabe-docsite/assets/{site.css,site.js,mermaid.min.js}` into `<out_dir>/assets/` on every build.
6. **Never hand-edit generated HTML.** Source of truth = the markdown under `src_dir` + the config.

## Available CSS classes (from assets/site.css — do not invent others)
masthead · kicker · lede · num · note (+ `<span class="lbl">`) · tag · chip (+ `.basic/.core/.advanced` tints) · pill · k · card · cards · table-wrap · mermaid-fig · topbar/top-brand/crumbs/crumb-sep · sidebar/side-collapse/sidenav/side-link/side-group/side-panel/side-chevron/sw/side-label · nav-overlay · wrap · stamp · masthead.

## Diagram-compliance gate (ships with the skill)
`tools/diagram-compliance.mjs` — loads every generated page over `file://` and asserts each diagram is a rendered, sized `<svg>` showing no raw mermaid source text; exit 0/1. Adapt the existing one at `docs/site/tools/diagram-compliance.mjs` (keep `_playwright.mjs` resolver). This is the gate that catches "diagram renders as raw text over file://".

## LOC discipline
Every `.py` < 800 lines. If the converter + shell + orchestrator don't fit, split the converter into `_markdown.py`. gustify's original is the reference for the converter + shell logic — reuse it, don't reinvent.
