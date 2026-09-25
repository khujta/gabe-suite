#!/usr/bin/env python3
"""promote.py — ship the pane runtime into templates/center/shell/assets/, generated, never hand-copied (D-047).

    python3 docs/design/embed-graph/promote.py                  # write every output
    python3 docs/design/embed-graph/promote.py --check          # 0 in sync · 1 DRIFT · 2 a band marker is gone
    python3 docs/design/embed-graph/promote.py --station PATH   # extract from another copy of the station

This folder stays the AUTHORING LAB for the pane (index.html, the probes, seats/ all read the files here).
The shell gets GENERATED copies, so every center ships the same runtime on a normal regen and nobody edits
a copy by hand:

  _uni-grammar.js    ASSEMBLED from gabe-universe.html. Each band is found by its START MARKER and ends at
                     the balanced close of its END MARKER's block (string- and comment-aware), then runs to
                     the end of that line. Never by line number: a station edit outside the bands moves
                     nothing here. The same bytes land in this folder, so the lab draws what ships.
  _pane.css          the `/* ── the pane` zone of _pane.css, every selector of every rule (each item of a
                     comma list) under `.seat `, the lab's :root tokens re-homed on `.seat .pn, .seat .pnc`
                     (the page's own tokens stay the page's). The lab-only rules (`*`, body, a global `a`,
                     .lab*, .metrics) do not ship; a zone rule that is not a `.pn` rule is refused.
  _grammar.js · _slice.js · _pane.js · _pane-console.js · _pane-console.css
                     copies of the lab files, byte for byte under a GENERATED header.

The station itself is NOT edited (D-047): it keeps its private copies. `--check` is the drift guard —
tests/gabe-universe (11c) runs it, and it fires the moment a band of the station or a lab file moves
without a re-run. Every header here says GENERATED and carries no line number and no sha, so the only
thing that can trip the check is a real change in what ships.

Exit codes (--check): 0 every output in sync · 1 DRIFT (names the file and its first differing line) ·
2 a marker is missing or ambiguous, a block or comment never closes, a rename found nothing to rename,
the pane zone holds a rule it cannot scope (names the band), or a source cannot be read (names the file)
— never a silent pass, never a traceback. The write mode exits 2 on the same conditions and writes nothing.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
STATION_REL = "templates/center/shell/gabe-universe.html"
ASSETS = REPO / "templates" / "center" / "shell" / "assets"
TOOL_REL = "docs/design/embed-graph/promote.py"
LAB_REL = "docs/design/embed-graph"

# ── the bands ────────────────────────────────────────────────────────────────────────────────────
# (name, start marker, end marker). The band runs from the start marker to the end of the line that
# closes the block opened at the END marker (None = the start marker's own block). Listed in the order
# they are placed in the factory: a literal that reads another at evaluation time comes after it
# (GLYPH before the kind extensions, KINDS before BADGE_COL's count colour).
TIERS = ("tiers", "var _KTIER=[", "var _TIER_PRESETS=[")
BANDS = [
    ("OPMAP", "var OPMAP={", None),
    ("dimCol · inkCol", "function dimCol(hex,t){", "function inkCol("),
    ("GLYPH", "var GLYPH={", None),
    ("KINDS · order · colours · kind extensions", "var KINDS={", "function _genericKind("),
    ("meshes", "function primitiveMesh(k, col){", "function billboardMesh("),
    ("bubble · labelSprite", "/* the BUBBLE — a small NEUTRAL", "function labelSprite("),
    ("BADGE_COL", "window.__BADGE_COL={", None),
    ("badgeGlyph", "window.__badgeGlyph=function(c, kind, key){", None),
    ("iconCol · massR · badges", "function _iconColRaw(n){", "function feclassBadge("),
    ("buildNode", "function buildNode(n){", "function rebuildNodes("),
]
# the ONLY non-verbatim edits: the station's two badge globals become factory locals, so a pane page
# never needs (or clobbers) the station's window.__BADGE_COL / window.__badgeGlyph
RENAMES = [
    ("window.__BADGE_COL={", "var BADGE_COL={"),
    ("window.__BADGE_COL[", "BADGE_COL["),
    ("window.__badgeGlyph=function", "var badgeGlyph=function"),
    ("if(window.__badgeGlyph) window.__badgeGlyph(", "if(badgeGlyph) badgeGlyph("),
]
COPIES = ["_grammar.js", "_slice.js", "_pane.js", "_pane-console.js", "_pane-console.css"]
PANE_ZONE = "/* ── the pane"


class Missing(Exception):
    """A marker is gone or ambiguous — the extract cannot be trusted (exit 2)."""


def close_of(src: str, at: int, what: str) -> int:
    """Index of the bracket that closes the first `{` or `[` at/after `at` — string- and comment-aware
    (the matcher of workflow-panel/gen-station-tokens.py `literal_after`, copied, not imported)."""
    j = min([x for x in (src.find("{", at), src.find("[", at)) if x >= 0], default=-1)
    if j < 0:
        raise Missing(f"band {what}: no block opens after its marker")
    depth, q, k = 0, None, j
    while k < len(src):
        c = src[k]
        if q:
            if c == "\\":
                k += 2
                continue
            if c == q:
                q = None
        elif src.startswith("//", k):            # a line comment — an apostrophe in prose is not a string
            k = src.find("\n", k)
            if k < 0:
                raise Missing(f"band {what}: its block never closes (a line comment runs to the end of the file)")
            continue
        elif src.startswith("/*", k):            # a block comment, same law
            e = src.find("*/", k + 2)
            if e < 0:
                raise Missing(f"band {what}: a block comment inside it never closes")
            k = e + 2
            continue
        elif c in "'\"`":
            q = c
        elif c in "{[":
            depth += 1
        elif c in "}]":
            depth -= 1
            if depth == 0:
                return k
        k += 1
    raise Missing(f"band {what}: its block never closes")


def band(src: str, name: str, start: str, end: str | None) -> str:
    n = src.count(start)
    if n != 1:
        raise Missing(f"band {name}: start marker {start!r} " + ("not found" if n == 0 else f"found {n} times"))
    i = src.index(start)
    j = i
    if end is not None:
        j = src.find(end, i)
        if j < 0:
            raise Missing(f"band {name}: end marker {end!r} not found after {start!r}")
    k = close_of(src, j, name)
    eol = src.find("\n", k)
    return src[i:eol if eol >= 0 else len(src)]


def gen_header(comment: str) -> str:
    return f"/* GENERATED by {TOOL_REL} — never hand-edit: edit the source, re-run the tool, commit both.\n * {comment} */\n"


def uni_grammar(src: str) -> str:
    tiers = band(src, *TIERS)
    texts = [band(src, name, start, end) for name, start, end in BANDS]
    for old, new in RENAMES:                     # the band text only — the band comments keep the station's names
        if not any(old in t for t in texts):
            raise Missing(f"rename {old!r} → {new!r} found nothing to rename (the station changed its badge wiring)")
        texts = [t.replace(old, new) for t in texts]
    parts = []
    for (name, start, end), text in zip(BANDS, texts):
        how = f"from `{start}`" + (f" through the close of `{end}`" if end else " through its close")
        parts.append(f"/* ══ band {name} — {how} ══ */\n{text}\n")
    body = "\n".join(parts)
    band_list = "\n".join(f" *     {name:<44} `{start}`" + (f" … `{end}`" if end else "")
                          for name, start, end in [TIERS] + BANDS)
    rename_list = "\n".join(f" *     {old}  →  {new}" for old, new in RENAMES)
    return (UNI_HEAD.format(tool=TOOL_REL, station=STATION_REL, bands=band_list, renames=rename_list)
            + "window.GabeUniTiers = (function () {\n" + tiers
            + "\n  return { KTIER: _KTIER, PRESETS: _TIER_PRESETS };\n})();\n\n"
            + "window.GabeUniGrammar = function (T, ucfg) {\n" + PRELUDE
            + "\n  /* ---- EXTRACTED from the station — the band text is verbatim apart from the renames above ---- */\n\n"
            + body + SURFACE)


def scope(zone: str) -> str:
    """`.seat ` before EVERY selector of every rule in the pane zone — each item of a comma list, not only
    the line's first (a `(…)` or a string never splits one). A selector that is not a `.pn` rule, an
    at-rule included, would ship page-wide or hide rules this walk cannot see: refused, never written."""
    out, k, depth, paren, at_sel = [], 0, 0, 0, True
    while k < len(zone):
        if zone.startswith("/*", k):
            e = zone.find("*/", k + 2)
            if e < 0:
                raise Missing("band pane.css zone: a comment never closes")
            out.append(zone[k:e + 2])
            k = e + 2
            continue
        c = zone[k]
        if c in "'\"":
            e = k + 1
            while e < len(zone) and zone[e] != c:
                e += 2 if zone[e] == "\\" else 1
            if e >= len(zone):
                raise Missing("band pane.css zone: a string never closes")
            out.append(zone[k:e + 1])
            k = e + 1
            continue
        if at_sel and depth == 0 and not c.isspace():
            if not zone.startswith(".pn", k):
                sel = zone[k:k + 60].split("{")[0].split(",")[0].strip()
                raise Missing(f"band pane.css zone: `{sel}` is not a .pn rule — the zone ships only .pn rules, "
                              "each under .seat, so this one cannot be written")
            out.append(".seat ")
            at_sel = False
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            at_sel = depth == 0
        elif depth == 0 and c == "(":
            paren += 1
        elif depth == 0 and c == ")":
            paren -= 1
        elif depth == 0 and paren == 0 and c == ",":
            at_sel = True
        out.append(c)
        k += 1
    return "".join(out)


def pane_css(css: str) -> str:
    r = css.find(":root {")
    z = css.find(PANE_ZONE)
    if r < 0:
        raise Missing("band pane.css tokens: `:root {` not found in _pane.css")
    if z < 0:
        raise Missing(f"band pane.css zone: {PANE_ZONE!r} not found in _pane.css")
    e = css.find("}", r)
    if e < 0:
        raise Missing("band pane.css tokens: `:root {` never closes in _pane.css")
    tokens = css[css.index("{", r) + 1:e]
    zone = scope(css[z:])
    return (gen_header(f"The pane zone of {LAB_REL}/_pane.css, scoped: every rule sits under `.seat `, and the\n"
                       " * lab's tokens are re-homed on the pane itself, so the page keeps its own.")
            + ".seat .pn, .seat .pnc {" + tokens + "}\n\n" + zone)


def source(p: Path, what: str) -> str:
    """A source the outputs are made from; one that is not there is exit 2, never a traceback."""
    try:
        return p.read_text(encoding="utf-8")
    except OSError as e:
        raise Missing(f"{what} {rel(p)} cannot be read ({e.strerror or e})") from None


def outputs(station: Path) -> dict[Path, str]:
    src = source(station, "the station")
    try:
        uni = uni_grammar(src)
    except Missing as e:
        raise Missing(f"{e} in {rel(station)}") from None
    out = {ASSETS / "_uni-grammar.js": uni, HERE / "_uni-grammar.js": uni,
           ASSETS / "_pane.css": pane_css(source(HERE / "_pane.css", "the lab copy"))}
    for name in COPIES:
        out[ASSETS / name] = gen_header(f"A copy of {LAB_REL}/{name}, the authoring lab.") \
            + source(HERE / name, "the lab copy")
    return out


def rel(p: Path) -> str:
    try:
        return str(p.resolve().relative_to(REPO))
    except ValueError:
        return str(p)


def first_diff(a: str, b: str) -> int:
    la, lb = a.split("\n"), b.split("\n")
    for i, (x, y) in enumerate(zip(la, lb)):
        if x != y:
            return i + 1
    return min(len(la), len(lb)) + 1


def main() -> int:
    ap = argparse.ArgumentParser(description="promote the pane runtime into the shell assets (D-047)")
    ap.add_argument("--check", action="store_true", help="compare, write nothing")
    ap.add_argument("--station", default=str(REPO / STATION_REL), help="the station page to extract from")
    a = ap.parse_args()
    station = Path(a.station)
    try:
        out = outputs(station)
    except Missing as e:
        print(f"promote: MISSING — {e}", file=sys.stderr)
        return 2
    if a.check:
        drift = 0
        for p, text in out.items():
            have = p.read_text(encoding="utf-8") if p.exists() else None
            if have == text:
                continue
            drift += 1
            print(f"promote: DRIFT {rel(p)} — " + ("missing" if have is None else
                  f"first differs at line {first_diff(have, text)}"), file=sys.stderr)
        if drift:
            print(f"promote: {drift} output(s) out of date (station: {rel(station)}) — run python3 {TOOL_REL} "
                  "and commit", file=sys.stderr)
            return 1
        print(f"promote --check: {len(out)} outputs in sync with {rel(station)}")
        return 0
    for p, text in out.items():
        p.write_text(text, encoding="utf-8")
        print(f"promote: wrote {rel(p)} ({text.count(chr(10))} lines)")
    return 0


# ── template text: the header, the environment the extracted code expects, the factory surface ──────
UNI_HEAD = """/* _uni-grammar.js — the Gabe Universe's IDENTITY BUILDERS, extracted so a mini pane draws exactly
 * what the station draws.
 *
 * GENERATED by {tool}
 *   from {station} — never hand-edit. Re-run the tool;
 *   tests/gabe-universe (11c) fails the moment a band below drifts from the station.
 *
 * WHY THIS FILE EXISTS
 *   A pane is a small NAVIGABLE 3D view of one entity / commit / test that behaves like the station.
 *   A pane that invents its own spheres is a different instrument wearing the same data; the point is
 *   the SAME instrument, boxed. So the glyphs, the planet bubble, the badges and the colour rosters come
 *   from the station's own code.
 *
 * HOW IT STAYS THE STATION'S
 *   The extracted code expects station globals (ENC, CFG, fieldOf, PULSE ...). Rather than rewrite it,
 *   the factory PROVIDES those names as locals, with the station's own defaults and the encoding layer
 *   switched off. The bands, each found by its markers, never by a line number:
{bands}
 *   The only non-verbatim edits (the station's badge globals become factory locals):
{renames}
 *
 * WHAT IS DELIBERATELY LEFT BEHIND (station-only — a pane must not pretend otherwise)
 *   fleets + war zones (they need chip-assets.js, 2.7 MB of ship GLBs — a pane never loads it),
 *   the encoding channels (glow · satellite rings · radar verts · pulse), heat colouring, hulls,
 *   journeys, the config panel. ENC/CFG below hold them OFF, so the extracted guards skip them.
 *   No page but the station sets window.__uniTheme, so dimCol and inkCol take their dark-ground path.
 *
 *   GabeUniTiers                -> {{ KTIER, PRESETS }}   top-level: the resolver filters by tier without THREE
 *   GabeUniGrammar(THREE, cfg)  -> {{ preload(cb), buildNode(n), KINDS, KINDCOL, METHOD, RELCOL, ... }}
 */
"""

PRELUDE = """  ucfg = ucfg || {};

  /* ---- the environment the extracted code expects -------------------------------------- */

  /* the station's ENC with every ENCODING CHANNEL off: a pane shows identity, not the station's
     configurable effect layer. iconSize and mass are the two a pane legitimately tunes. */
  var ENC = { color: "identity", method: ucfg.method || false,
              mass: ucfg.mass !== false, iconSize: ucfg.iconSize || 10,
              glow: false, ring1: false, ring2: false, ring3: false,
              verts: false, sat: false, pulse: false, speed: 0.1 };

  /* the station's CFG with fleets off and the badge geometry at its shipped defaults. The bubble
     default is "film" (OPMAP.bubble.film = 0.006): a hand-written 0.10 here once washed every planet
     out (operator, 2026-09-09: "everything looks kind of white"). Never hand-write a station constant. */
  var CFG = { warOn: false, bubble: ucfg.bubble || "film",
              mbOp: 0.95, mbSize: ucfg.badgeSize || 3.5, mbX: 2, mbY: -2.5 };

  /* the extracted band brings the station's OWN nodeVal/cap3/num, which read fieldOf + MAXES.
     Supply those two rather than shadow the band: an encoding key maps to itself (a pane has no
     MAP/DEFMAP setup switcher) and only `mass` carries a maximum. The one intentional deviation. */
  function fieldOf(key) { return key; }
  var MAXES = { mass: ucfg.maxMass || 1 };
  function truthy(v) { return v === true || (typeof v === "number" && v > 0) || (typeof v === "string" && v && v !== "\\u2014"); }
  function heatVal() { return 0; }
  function heatCol(t) { t = Math.max(0, Math.min(1, t)); var c = new T.Color(); c.setHSL((1 - t) * 0.62, 0.72, 0.55); return c.getStyle(); }

  var PULSE = [];                              /* collected, never animated in a pane */
  function satelliteRing() {}                  /* ENC.ring* are false — never reached */
  function glowSprite() { return new T.Group(); }
  function radarVerts() {}
  function fleetZones() {}                     /* CFG.warOn is false — never reached */

  function svgDoc(kind, col) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="' +
      col + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + GLYPH[kind] + '</svg>';
  }
"""

SURFACE = """
  /* ---- the factory surface -------------------------------------------------------------- */

  return {
    preload: preloadBillboards,        /* async — the lucide glyphs become canvas textures */
    buildNode: buildNode,
    GLYPH: GLYPH,                     /* the lucide paths, for a skin that draws kind icons in HTML */
    KINDS: KINDS, KINDCOL: KINDCOL, METHOD: METHOD, RELCOL: RELCOL,
    VIEWCOL: VIEWCOL, order: order, BADGE_COL: BADGE_COL,
    kindCol: function (k) { return KINDCOL[k] || "#868e96"; },
    dimCol: dimCol,                    /* the station's own blend toward its ground */
    relCol: function (r) { return RELCOL[r] || "#889"; },
    labelSprite: labelSprite, bubble: bubble, iconCol: iconCol, massR: massR,
    cfg: { ENC: ENC, CFG: CFG }
  };
};
"""

if __name__ == "__main__":
    sys.exit(main())
