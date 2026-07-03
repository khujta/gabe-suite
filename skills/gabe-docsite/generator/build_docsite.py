#!/usr/bin/env python3
"""gabe-docsite — generic static-docs-site generator (stdlib only, no deps).

Reads a per-project CONFIG module (see docsite.config.example.py for the
schema), renders every SECTIONS doc's markdown into ``<out_dir>/<slug>.html``
wrapped in the shared shell (topbar + sidebar + masthead), emits
``<out_dir>/index.html`` as a hub of cards, and copies
``skills/gabe-docsite/assets/{site.css,site.js,mermaid.min.js}`` into
``<out_dir>/assets/``.

Contract
--------
* The markdown under the config's ``src_dir`` is the SOURCE OF TRUTH.
* The HTML under ``out_dir`` is a GENERATED publish target — never hand-edit.
* Re-running regenerates every page idempotently.
* Nothing project-specific lives in this file — every string, path, and
  section comes from the config the caller points at.

Run::

    python3 build_docsite.py --config path/to/docsite.config.py

No third-party dependencies.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import importlib.util
import shutil
import sys
from pathlib import Path
from typing import Any

GENERATOR_DIR = Path(__file__).resolve().parent
ASSETS_SRC_DIR = GENERATOR_DIR.parent / "assets"
ASSET_FILES = ("site.css", "site.js", "mermaid.min.js")

sys.path.insert(0, str(GENERATOR_DIR))

from _markdown import markdown_to_html, strip_leading_h1, render_inline, split_lede  # noqa: E402
from _shell import document, masthead, render_hub_sections  # noqa: E402


# --------------------------------------------------------------------------- #
# Config loading
# --------------------------------------------------------------------------- #


def load_config(config_path: Path) -> dict[str, Any]:
    """Import the config module at ``config_path`` and return a dict with
    SITE, SECTIONS, and the resolved absolute src_dir/out_dir/hub_intro_md."""
    spec = importlib.util.spec_from_file_location("docsite_config", config_path)
    if spec is None or spec.loader is None:
        raise SystemExit("ERROR: could not load config at %s" % config_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    site = getattr(module, "SITE", None)
    sections = getattr(module, "SECTIONS", None)
    if site is None or sections is None:
        raise SystemExit("ERROR: config must define SITE and SECTIONS")
    if "src_dir" not in site or "out_dir" not in site:
        raise SystemExit("ERROR: SITE must define 'src_dir' and 'out_dir'")

    config_dir = config_path.resolve().parent
    src_dir = (config_dir / site["src_dir"]).resolve()
    out_dir = (config_dir / site["out_dir"]).resolve()
    hub_intro_md = site.get("hub_intro_md")
    hub_intro_path = (config_dir / hub_intro_md).resolve() if hub_intro_md else None

    return {
        "SITE": site,
        "SECTIONS": sections,
        "_src_dir": src_dir,
        "_out_dir": out_dir,
        "_hub_intro_path": hub_intro_path,
    }


def validate_config(config: dict[str, Any]) -> list[str]:
    """Fail-fast validation. Returns a list of error strings (empty = valid)."""
    errors: list[str] = []
    site = config["SITE"]
    for key in ("title", "brand", "src_dir", "out_dir"):
        if not site.get(key):
            errors.append("SITE.%s is required" % key)

    seen_slugs: set[str] = set()
    for si, section in enumerate(config["SECTIONS"]):
        if "key" not in section or "label" not in section:
            errors.append("SECTIONS[%d] missing 'key' or 'label'" % si)
        for di, doc in enumerate(section.get("docs", [])):
            for field in ("slug", "source_md", "title"):
                if not doc.get(field):
                    errors.append(
                        "SECTIONS[%d].docs[%d] missing required field '%s'" % (si, di, field)
                    )
            slug = doc.get("slug")
            if slug:
                if slug in seen_slugs:
                    errors.append("duplicate slug %r across SECTIONS" % slug)
                seen_slugs.add(slug)
            src = doc.get("source_md")
            if src and not (config["_src_dir"] / src).exists():
                errors.append(
                    "SECTIONS[%d].docs[%d]: source_md %r not found under %s"
                    % (si, di, src, config["_src_dir"])
                )
    return errors


# --------------------------------------------------------------------------- #
# Per-page render
# --------------------------------------------------------------------------- #


def render_doc(config: dict[str, Any], doc: dict[str, Any]) -> str:
    src = config["_src_dir"] / doc["source_md"]
    md = src.read_text(encoding="utf-8")
    body_md = strip_leading_h1(md)
    body_html = markdown_to_html(body_md)
    head = masthead(
        doc.get("kicker", ""),
        render_inline(doc["title"]),
        render_inline(doc.get("summary", "")),
    )
    site_title = config["SITE"]["title"]
    return document(
        config,
        active_slug=doc["slug"],
        title="%s — %s" % (site_title, doc["title"]),
        body_html=head + "\n" + body_html,
        has_diagram="```mermaid" in md,
    )


def render_hub(config: dict[str, Any]) -> str:
    site = config["SITE"]
    lede_text = ""
    rest_html = ""
    has_diagram = False
    if config["_hub_intro_path"] and config["_hub_intro_path"].exists():
        intro_md = config["_hub_intro_path"].read_text(encoding="utf-8")
        intro_md = strip_leading_h1(intro_md)
        lede_text, rest_md = split_lede(intro_md)
        rest_html = markdown_to_html(rest_md)
        has_diagram = "```mermaid" in intro_md

    head = masthead(site.get("kicker", ""), render_inline(site["title"]), render_inline(lede_text))
    # The hub's lede is the FIRST paragraph of hub_intro_md, if present; the
    # rest of hub_intro_md (system diagram, notes) follows, then section cards.
    body_parts = [head]
    if rest_html:
        body_parts.append(rest_html)
    body_parts.append(render_hub_sections(config))

    return document(
        config,
        active_slug="index",
        title="%s — Hub" % site["title"],
        body_html="\n".join(body_parts),
        has_diagram=has_diagram,
    )


# --------------------------------------------------------------------------- #
# Assets
# --------------------------------------------------------------------------- #


def copy_assets(out_dir: Path) -> list[str]:
    assets_out = out_dir / "assets"
    assets_out.mkdir(parents=True, exist_ok=True)
    copied = []
    missing = []
    for name in ASSET_FILES:
        src = ASSETS_SRC_DIR / name
        if not src.exists():
            missing.append(name)
            continue
        shutil.copyfile(src, assets_out / name)
        copied.append(name)
    if missing:
        raise SystemExit(
            "ERROR: missing vendored asset(s) under %s: %s"
            % (ASSETS_SRC_DIR, ", ".join(missing))
        )
    return copied


# --------------------------------------------------------------------------- #
# Build
# --------------------------------------------------------------------------- #


def build(config: dict[str, Any]) -> int:
    errors = validate_config(config)
    if errors:
        print("ERROR: invalid config:")
        for e in errors:
            print("  - %s" % e)
        return 1

    out_dir: Path = config["_out_dir"]
    out_dir.mkdir(parents=True, exist_ok=True)

    built: list[str] = []
    for section in config["SECTIONS"]:
        for doc in section.get("docs", []):
            html_out = render_doc(config, doc)
            (out_dir / ("%s.html" % doc["slug"])).write_text(html_out, encoding="utf-8")
            built.append("%s.html  <-  %s" % (doc["slug"], doc["source_md"]))

    (out_dir / "index.html").write_text(render_hub(config), encoding="utf-8")
    built.insert(0, "index.html  (hub)")

    assets_copied = copy_assets(out_dir)

    print("Built %d page(s) into %s:" % (len(built), out_dir))
    for line in built:
        print("  " + line)
    print("Copied assets: %s" % ", ".join(assets_copied))
    return 0


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="build_docsite.py",
        description=(
            "Generic static-docs-site generator (gabe-docsite). Renders a "
            "project's markdown docs (per a --config module) into a themed, "
            "self-contained HTML site under the config's out_dir."
        ),
    )
    parser.add_argument(
        "--config",
        required=True,
        type=Path,
        help="Path to the project's docsite.config.py (see docsite.config.example.py)",
    )
    args = parser.parse_args(argv)

    config_path = args.config.resolve()
    if not config_path.exists():
        print("ERROR: config not found at %s" % config_path)
        return 1

    config = load_config(config_path)
    return build(config)


if __name__ == "__main__":
    raise SystemExit(main())
