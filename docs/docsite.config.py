"""gabe-docsite config for the Gabe Suite's own documentation site.

Paths are relative to THIS file's directory (docs/). Regenerate with:

    python3 ../skills/gabe-docsite/generator/build_docsite.py --config docsite.config.py
    node    ../skills/gabe-docsite/tools/diagram-compliance.mjs site
"""

SITE = {
    "title": "The Gabe suite",
    "kicker": "The KDBP Development Suite · Khujta AI",
    "brand": "🔧 GABE",
    "brand_sub": "the KDBP development suite",
    "lang": "en",
    "footer": [
        "<b>GABE</b> · the KDBP development suite · documentation",
        "Source of truth: <b>docs/src/*.md</b> + <b>docs/docsite.config.py</b> · generated — do not edit the HTML by hand",
        "Visual system: Cifra · Chile editorial palette",
    ],
    "src_dir": "src",
    "out_dir": "site",
    "hub_intro_md": "src/hub.md",
}

SECTIONS = [
    {
        "key": "foundations",
        "label": "Tier 1 · Foundations",
        "difficulty": "basic",
        "docs": [
            {"slug": "kdbp", "source_md": "kdbp.md", "title": "What KDBP is",
             "nav_label": "What KDBP is", "kicker": "Tier 1 · Concept",
             "summary": "The core idea: a project's memory lives in .kdbp/ files that every session reads — and what each file is for.",
             "swatch": "#3a6b3a"},
            {"slug": "the-loop", "source_md": "the-loop.md", "title": "The development loop",
             "nav_label": "The development loop", "kicker": "Tier 1 · Workflow",
             "summary": "The cycle from idea to shipped commit: scope → plan → next → execute → review → commit → push, and what each step reads and writes.",
             "swatch": "#3a6b7a"},
        ],
    },
    {
        "key": "contract-commands",
        "label": "Tier 2 · Contract & Commands",
        "difficulty": "core",
        "docs": [
            {"slug": "contract", "source_md": "contract.md", "title": "The E1–E7 execution contract",
             "nav_label": "The E1–E7 contract", "kicker": "Tier 2 · The contract",
             "summary": "Seven floors under every command — each with the exact failure it prevents.",
             "swatch": "#b65a2b"},
            {"slug": "commands", "source_md": "commands.md", "title": "Command reference",
             "nav_label": "Command reference", "kicker": "Tier 2 · Reference",
             "summary": "Every gabe command — what it does, the gate it enforces, and where its state lands.",
             "swatch": "#1f3a6b"},
            {"slug": "satellites", "source_md": "satellites.md", "title": "Analysis satellites",
             "nav_label": "Analysis satellites", "kicker": "Tier 2 · Analysis",
             "summary": "The on-demand adversarial tools — myopic, roast, health, debt, assess, align — that feed findings back into the plan.",
             "swatch": "#7a5a8a"},
        ],
    },
    {
        "key": "hardening",
        "label": "Tier 3 · The Hardening",
        "difficulty": "advanced",
        "docs": [
            {"slug": "mechanisms", "source_md": "mechanisms.md", "title": "The mechanism catalog",
             "nav_label": "The mechanism catalog", "kicker": "Tier 3 · Catalog",
             "summary": "The generic mechanisms that encode strong-model judgment — and the skills that carry each.",
             "swatch": "#a04030"},
            {"slug": "drift", "source_md": "drift.md", "title": "Why weak models drift",
             "nav_label": "Why weak models drift", "kicker": "Tier 3 · Rationale",
             "summary": "The failure modes the hardening targets, grounded in real session incidents — and how each mechanism catches them.",
             "swatch": "#d97a3d"},
            {"slug": "reference", "source_md": "reference.md", "title": "Per-skill hardening reference",
             "nav_label": "Per-skill reference", "kicker": "Tier 3 · Change log",
             "summary": "What changed in each skill during the 2026-07 hardening: the 47 edits, the shared preamble, the rollback runbook.",
             "swatch": "#6e6757"},
        ],
    },
]
