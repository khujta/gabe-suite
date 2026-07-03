"""Example gabe-docsite config — copy this file into your project, rename it
(e.g. ``docsite.config.py``), and edit every value. This is the ONLY place
project-specific facts belong; build_docsite.py, _shell.py, and _markdown.py
are pure generic code that never mention a project's name, paths, or domain
vocabulary.

Run the generator against this file with:

    python3 build_docsite.py --config docsite.config.example.py

All paths below (src_dir, out_dir, hub_intro_md) are resolved RELATIVE TO
THIS CONFIG FILE'S DIRECTORY, not the caller's cwd.
"""

# --------------------------------------------------------------------------- #
# SITE — site-wide identity. Every key here is required unless noted.
# --------------------------------------------------------------------------- #

SITE = {
    # Hub <h1> and the "<site title> — <page title>" browser tab pattern.
    "title": "The Example suite",

    # Hub masthead kicker line (small text above the H1).
    "kicker": "Example Documentation · Your Org",

    # Topbar brand — rendered as "<brand><span class=dot>.</span>docs <sub>".
    # Convention: one emoji + one short uppercase word, e.g. "🔧 GABE".
    "brand": "📦 EXAMPLE",

    # Topbar brand subtitle, shown in a smaller <span class="sub">.
    "brand_sub": "the example project docs",

    # <html lang="...">. Optional — defaults to "en".
    "lang": "en",

    # Footer lines — each rendered on its own line inside <footer class="stamp">.
    # Basic inline HTML (e.g. <b>) is allowed; content here is NOT re-escaped,
    # so keep it to trusted, hand-written strings.
    "footer": [
        "<b>EXAMPLE</b> · Your Org · documentation",
        "Source of truth: <b>docs/src/*.md</b> · Generated publish target — do not edit HTML by hand",
        "Visual system: Cifra · Chile editorial palette",
    ],

    # Markdown source directory, relative to this config file.
    "src_dir": "docs/src",

    # Generated HTML output directory, relative to this config file.
    "out_dir": "docs/site",

    # OPTIONAL: a markdown file (relative to this config file) whose content
    # becomes the hub's intro — typically a lede paragraph plus one ```mermaid
    # fenced system diagram. Its own leading H1 (if any) is stripped, since
    # the hub masthead already carries SITE["title"] as the H1. Omit this key
    # (or set to None) for a hub with no intro beyond the section cards.
    "hub_intro_md": "docs/src/_hub.md",
}


# --------------------------------------------------------------------------- #
# SECTIONS — progressive-disclosure tiers. Order = reading order (basic to
# advanced) AND sidebar/hub order. Each section is a dict:
#
#   key         unique machine key (not currently rendered, but useful for
#               scripts/tests that want to address a section programmatically)
#   label       sidebar group heading + hub <h3> text
#   difficulty  "basic" | "core" | "advanced" | None
#               Renders a <span class="chip <difficulty>"> next to the label
#               on both the sidebar group header and the hub <h3>. None (or
#               omit the key) renders no chip.
#   docs        ordered list of doc dicts (see below); order = nav + hub order
#               within this section.
#
# Each doc dict:
#   slug        output filename stem -> <out_dir>/<slug>.html AND the sidebar
#               / hub-card / breadcrumb href. Must be unique across ALL
#               sections in this config.
#   source_md   filename under SITE["src_dir"] (not a path — just the name;
#               subdirectories are fine, e.g. "adr/2026-04-stack.md").
#   title       <h1> in the masthead AND the sidebar link's fallback label
#               AND the hub card's <h3>.
#   nav_label   OPTIONAL short label for the sidebar link + breadcrumb tail.
#               Defaults to `title` when omitted (useful when `title` is long).
#   kicker      masthead kicker line for this page AND the hub card's <span
#               class="tag"> — typically "Tier N · <Category>".
#   summary     one-line description: the masthead lede AND the hub card's
#               <p>. Keep it to a single sentence.
#   swatch      hex color for the sidebar's small color dot (e.g. "#3a6b3a").
#               Purely a visual aid for scanning a long sidebar; pick any
#               color, no palette enforcement.
# --------------------------------------------------------------------------- #

SECTIONS = [
    {
        "key": "foundations",
        "label": "Tier 1 · Foundations",
        "difficulty": "basic",
        "docs": [
            {
                "slug": "overview",
                "source_md": "overview.md",
                "title": "What this project is",
                "nav_label": "Overview",
                "kicker": "Tier 1 · Concept",
                "summary": "The one-paragraph pitch: what problem this solves and for whom.",
                "swatch": "#3a6b3a",
            },
            {
                "slug": "getting-started",
                "source_md": "getting-started.md",
                "title": "Getting started",
                "nav_label": "Getting started",
                "kicker": "Tier 1 · Workflow",
                "summary": "The shortest path from a clean checkout to a working local setup.",
                "swatch": "#3a6b7a",
            },
        ],
    },
    {
        "key": "reference",
        "label": "Tier 2 · Reference",
        "difficulty": "core",
        "docs": [
            {
                "slug": "architecture",
                "source_md": "architecture.md",
                "title": "Architecture overview",
                "nav_label": "Architecture",
                "kicker": "Tier 2 · Reference",
                "summary": "The major components and how data flows between them.",
                "swatch": "#b65a2b",
            },
        ],
    },
    {
        "key": "advanced",
        "label": "Tier 3 · Advanced",
        "difficulty": "advanced",
        "docs": [
            {
                "slug": "decisions",
                "source_md": "decisions.md",
                "title": "Architecture decisions",
                "nav_label": "Decisions",
                "kicker": "Tier 3 · ADR",
                "summary": "Why the project is shaped the way it is, one decision at a time.",
                "swatch": "#a04030",
            },
        ],
    },
]
