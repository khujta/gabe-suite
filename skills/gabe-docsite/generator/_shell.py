#!/usr/bin/env python3
"""Shared HTML shell for gabe-docsite — pure functions of the project CONFIG.

Every generated page wears identical chrome: a topbar (drawer toggle, brand,
breadcrumb, bionic toggle), a fixed sidebar built from ``SECTIONS`` (one
``<details class="side-group">`` per section, swatch dots per doc, a
difficulty chip on section headers), a masthead (kicker + optional chip +
H1 + lede), and a stamp footer. This module knows nothing about markdown —
callers hand it already-rendered HTML fragments for the body.

No project-specific vocabulary lives here: every string comes from the
config dict the caller passes in (see docsite.config.example.py for the
schema). This keeps the module reusable across any project that adopts the
gabe-docsite generator.
"""

from __future__ import annotations

import html as _html
from typing import Any

# --------------------------------------------------------------------------- #
# Small helpers
# --------------------------------------------------------------------------- #


def esc(text: str) -> str:
    """HTML-escape raw text (no quote escaping — matches attribute-safe usage
    throughout this module, which always wraps in double quotes explicitly)."""
    return _html.escape(text, quote=False)


def _all_docs(sections: list[dict[str, Any]]) -> list[tuple[dict[str, Any], dict[str, Any]]]:
    """Flatten SECTIONS into a list of (section, doc) pairs, section order preserved."""
    pairs: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for section in sections:
        for doc in section.get("docs", []):
            pairs.append((section, doc))
    return pairs


def find_doc(sections: list[dict[str, Any]], slug: str) -> dict[str, Any] | None:
    """Look up a doc entry by slug across all sections. Returns None if absent."""
    for _section, doc in _all_docs(sections):
        if doc["slug"] == slug:
            return doc
    return None


# --------------------------------------------------------------------------- #
# Breadcrumb
# --------------------------------------------------------------------------- #


def breadcrumb(config: dict[str, Any], active_slug: str) -> str:
    """A ``Hub › Page`` (or bare ``Hub``) trail derived from SECTIONS.

    The hub itself renders as bare "Hub" (no trailing segment). Any other
    known slug renders "Hub › {title}" with the tail as the current page
    (not a link). An unknown slug falls back to the slug itself, title-cased.
    """
    crumbs = ['<a href="index.html">Hub</a>']
    if active_slug in ("index", "hub", ""):
        return _join_crumbs(crumbs)

    doc = find_doc(config["SECTIONS"], active_slug)
    if doc is not None:
        label = doc.get("nav_label") or doc["title"]
    else:
        label = " ".join(w.capitalize() for w in active_slug.replace("_", "-").split("-") if w) or active_slug

    crumbs.append('<span class="crumb-here">%s</span>' % esc(label))
    return _join_crumbs(crumbs)


def _join_crumbs(crumbs: list[str]) -> str:
    sep = ' <span class="crumb-sep">›</span> '
    return '<nav class="crumbs" aria-label="Breadcrumb">%s</nav>' % sep.join(crumbs)


# --------------------------------------------------------------------------- #
# Sidebar + topbar (render_nav)
# --------------------------------------------------------------------------- #

# The hub swatch color when a section/doc doesn't specify one of its own.
_DEFAULT_SWATCH = "#6e6757"


def _chip_html(difficulty: str | None) -> str:
    if not difficulty:
        return ""
    return ' <span class="chip %s">%s</span>' % (esc(difficulty), esc(difficulty))


def render_nav(config: dict[str, Any], active_slug: str) -> str:
    """The shared topbar + sidebar chrome for every page.

    Returns the whole chrome (topbar, sidebar, nav-overlay) as one HTML
    string. The section owning ``active_slug`` renders ``open``; the active
    doc's ``<a>`` carries ``class="side-link active"``.
    """
    site = config["SITE"]
    sections = config["SECTIONS"]
    hub_active = " active" if active_slug in ("index", "hub", "") else ""

    side: list[str] = [
        '<aside class="sidebar" id="sidebar">',
        '  <button class="side-collapse" id="side-collapse" type="button" '
        'aria-pressed="false" aria-label="Collapse navigation" '
        'title="Collapse navigation"><span class="side-collapse-glyph">«</span></button>',
        '  <nav class="sidenav">',
        '    <a class="side-link side-hub%s" href="index.html">'
        '<span class="sw" style="background:%s"></span>'
        '<span class="side-label">Hub</span></a>' % (hub_active, _DEFAULT_SWATCH),
    ]

    for section in sections:
        docs = section.get("docs", [])
        section_active = any(d["slug"] == active_slug for d in docs)
        open_attr = " open" if section_active else ""
        side.append('    <details class="side-group"%s>' % open_attr)
        side.append(
            '      <summary><span class="side-chevron" aria-hidden="true"></span>'
            '<span class="side-label">%s%s</span></summary>'
            % (esc(section["label"]), _chip_html(section.get("difficulty")))
        )
        side.append('      <div class="side-panel">')
        for doc in docs:
            cls = " active" if doc["slug"] == active_slug else ""
            color = doc.get("swatch", _DEFAULT_SWATCH)
            label = doc.get("nav_label") or doc["title"]
            side.append(
                '        <a class="side-link%s" href="%s.html" title="%s">'
                '<span class="sw" style="background:%s"></span>'
                '<span class="side-label">%s</span></a>'
                % (cls, doc["slug"], esc(label), color, esc(label))
            )
        side.append("      </div>")
        side.append("    </details>")

    side.append("  </nav>")
    side.append("</aside>")

    top = [
        '<header class="topbar">',
        '  <button class="nav-toggle" id="nav-toggle" type="button" '
        'aria-label="Toggle navigation" aria-expanded="false">☰</button>',
        '  <a class="top-brand" href="index.html">%s<span class="dot">.</span>docs '
        '<span class="sub">%s</span></a>' % (site["brand"], esc(site.get("brand_sub", ""))),
        "  " + breadcrumb(config, active_slug),
        '  <button class="adhd-toggle" id="adhd-toggle" type="button" '
        'aria-pressed="false" aria-label="Toggle bionic reading" '
        'title="Bionic reading"><span class="adhd-dot"></span></button>',
        "</header>",
    ]
    overlay = '<div class="nav-overlay" id="nav-overlay"></div>'
    return "\n".join(top) + "\n" + "\n".join(side) + "\n" + overlay


# --------------------------------------------------------------------------- #
# Masthead + footer
# --------------------------------------------------------------------------- #


def masthead(kicker: str, h1_html: str, lede_html: str, *, chip: str | None = None) -> str:
    """The page masthead. ``h1_html``/``lede_html`` are pre-rendered inline HTML
    (caller already ran markdown inline-rendering); ``kicker`` is escaped here."""
    chip_html = _chip_html(chip)
    return (
        '  <header class="masthead">\n'
        '    <div class="kicker">%s%s</div>\n'
        "    <h1>%s</h1>\n"
        '    <p class="lede">%s</p>\n'
        "  </header>"
    ) % (esc(kicker), chip_html, h1_html, lede_html)


def footer_html(config: dict[str, Any]) -> str:
    site = config["SITE"]
    lines = site.get("footer", [])
    body = "<br>\n  ".join(lines)
    return '<footer class="stamp">\n  %s\n</footer>' % body


# --------------------------------------------------------------------------- #
# Hub cards
# --------------------------------------------------------------------------- #


def render_hub_sections(config: dict[str, Any], num_start: int = 2) -> str:
    """Render one ``<h3>`` + ``<div class="cards">`` block per SECTION, in
    SECTIONS order, for the hub page. ``num_start`` is unused (cards use h3,
    not numbered h2) — kept for signature stability if numbering is added later."""
    out: list[str] = []
    for section in config["SECTIONS"]:
        chip_html = _chip_html(section.get("difficulty"))
        out.append("  <h3>%s%s</h3>" % (esc(section["label"]), chip_html))
        out.append('  <div class="cards">')
        for doc in section.get("docs", []):
            out.append(
                '    <a class="card" href="%s.html"><span class="tag">%s</span>'
                "<h3>%s</h3><p>%s</p></a>"
                % (
                    doc["slug"],
                    esc(doc.get("kicker", "")),
                    esc(doc["title"]),
                    esc(doc.get("summary", "")),
                )
            )
        out.append("  </div>")
    return "\n".join(out)


# --------------------------------------------------------------------------- #
# Document assembly
# --------------------------------------------------------------------------- #

FONTS_LINK = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700'
    '&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">'
)

# Cifra editorial palette — the ONE mermaid theme every gabe-docsite page uses.
# NEVER emit a CDN url and NEVER type="module": these pages must render over
# file:// with zero network access, so mermaid is the vendored classic build
# (assets/mermaid.min.js, a UMD bundle that sets globalThis.mermaid) plus a
# plain classic <script> calling mermaid.initialize(...).
MERMAID_THEME_VARS = {
    "background": "#ece6d8",
    "primaryColor": "#f5f0e2",
    "primaryBorderColor": "#b65a2b",
    "primaryTextColor": "#1b1a17",
    "secondaryColor": "#e6dec8",
    "tertiaryColor": "#ece6d8",
    "lineColor": "#6e6757",
    "fontFamily": "Space Grotesk, system-ui, sans-serif",
    "fontSize": "13px",
}


def _mermaid_scripts() -> str:
    """The classic (non-module) mermaid loader + init, emitted only on pages
    that contain at least one diagram. Vendored asset, no CDN, no ESM."""
    theme_vars_json = (
        "{"
        + ", ".join(
            '%s: "%s"' % (k, v) for k, v in MERMAID_THEME_VARS.items()
        )
        + "}"
    )
    init = (
        "{startOnLoad: true, theme: \"base\", themeVariables: %s, "
        "flowchart: {curve: \"basis\", htmlLabels: true, useMaxWidth: true}}"
    ) % theme_vars_json
    return (
        '<script src="assets/mermaid.min.js"></script>\n'
        "<script>mermaid.initialize(%s);</script>" % init
    )


def document(
    config: dict[str, Any],
    *,
    active_slug: str,
    title: str,
    body_html: str,
    has_diagram: bool = False,
) -> str:
    """Assemble a full HTML document around the shared chrome.

    ``body_html`` is the in-``<main>`` content (masthead + rendered sections,
    already joined). ``has_diagram`` controls whether the classic mermaid
    loader + init script is appended before ``</body>``.
    """
    site = config["SITE"]
    lang = site.get("lang", "en")
    nav_html = render_nav(config, active_slug)
    footer = footer_html(config)
    scripts = ['<script src="assets/site.js"></script>']
    if has_diagram:
        scripts.append(_mermaid_scripts())

    parts = [
        "<!doctype html>",
        '<html lang="%s">' % esc(lang),
        "<head>",
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        "<title>%s</title>" % esc(title),
        FONTS_LINK,
        '<link rel="stylesheet" href="assets/site.css">',
        "</head>",
        "<body>",
        "",
        nav_html,
        "",
        '<div class="wrap"><main>',
        body_html,
        "</main></div>",
        "",
        footer,
        "",
        "\n".join(scripts),
        "</body>",
        "</html>",
        "",
    ]
    return "\n".join(p for p in parts if p is not None)
