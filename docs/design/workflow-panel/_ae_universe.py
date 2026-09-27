"""_ae_universe.py — the all-endpoints page's ONE-ENDPOINT section (D-036): what the Gabe Universe card shows, the block
marks, and the gaps between the universe card and the code map. Imported by gen-all-endpoints.py; nothing here writes.

THE UNIVERSE COLUMN. The station's endpoint card is `C.endpoint` in templates/center/shell/gabe-universe.html plus the
two sections every card gets (the risk flags and Above), under the panel head. Each section is READ from the station's
source here — its icon and its title are regex-lifted, never typed — and its VALUE is computed from the lab's facts the
way the station computes it (gen-endpoint-facts.py already re-does the station's derivations on the same example feed).
Three values the lab's facts do not carry are read from the station's own feeds beside them: the entity-model row under
the settled model (c4 `models`), the cluster Above names (levels.json use-cases, the station's boot core) and the
entity's label (c4 `models.naming`). A section the station would not draw for this endpoint is not a row here: it is
named in `silent`, so the column says what the station leaves out without drawing it.

THE MARKS. A block paired to a lab PART wears that part's icon and colour, read from the lab's own registry
(`window.PANELS` in _lab-ep-panels.js, run under node with the station's tokens) — never typed. The command panel, the
running header and the blocks with no page yet have no registry row: their marks are the agent's pick, in the words file,
and the page marks them so.

THE LOOK (D-040). The column draws each row the way the station's card draws it: the card's CSS rules, its colour tokens
per theme, its icon table and the small tables and words it draws with are lifted from the station's source (station_look,
look_eval, ulook) and the page builds the card's own DOM from them. A rule, token, icon or pattern that is gone stops the build.

THE GAPS, both ways. (a) An inventory attribute the code map holds something for on this endpoint (a value that is not absent,
unknown, zero or empty) and that no station row drawn for it shows. (b) What a drawn station row shows that the code map does
not hold: a row that maps to no attribute, an attribute of the row the code map holds nothing for here, a name the row draws
that the code-map column never names (reverse_gaps). Which attributes a station row shows is an AUTHORED proposal
(all-endpoints.words.json `universe.rows[*].attrs`), every id checked against the ruled tree and inventory-endpoint.md.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path

HERE = Path(os.environ.get("ALLEP_WP") or Path(__file__).resolve().parent)   # a mutant copy elsewhere still reads the real bench
REPO = HERE.parents[2]
STATION_HTML = REPO / "templates" / "center" / "shell" / "gabe-universe.html"
EX = REPO / "templates" / "center" / "shell" / "example" / "codebase-graph-station"
INVENTORY = REPO / "docs" / "design" / "design-context" / "inventory-endpoint.md"

# the station's card, in the order it draws: the head, `C.endpoint`'s fifteen sections, then the flags and Above that every
# card gets. Each row names the source pattern its icon and title are lifted from (group 1 = icon, group 2 = title).
ROWS = [
    ("HEAD", None),
    ("USAGE", r'sechd\("(\w+)","(Usage)"'),
    ("GUARDS", r'sechd\("(\w+)","(Guards)"'),
    ("DELIVERY", r'sechd\("(\w+)","(Delivery)"\)'),
    ("EVIDENCE", r'kv\("(\w+)","(evidence)"'),
    ("MODEL ROW", r'kv\("(\w+)","(model)", v\+": claim'),
    ("ACCESSES", r'sechd\("(\w+)","(Accesses)"'),
    ("PAYLOAD", r'sechd\("(\w+)","(Payload)", p\.n'),
    ("CONNECTIONS", r'conns\("(\w+)","(Connections)"'),
    ("CODE BEHIND", r'function behindTree[\s\S]*?sechd\("(\w+)","(Code behind)"'),
    ("TESTS", r'tabbed\("(\w+)","(Tests)"'),
    ("JOURNEYS", r'sechd\("(\w+)","(Journeys)"'),
    ("IDENTITY", r'sechd\("(\w+)","(Identity)"'),
    ("SIGNATURE", r'sechd\("(\w+)","(Signature)"'),
    ("DOCSTRING", r'function docSec[\s\S]*?sechd\("(\w+)",label\|\|"(Docstring)"'),
    ("SOURCE", r'function fileRowSec[\s\S]*?sechd\("(\w+)","(Source)"'),
    ("RISK", None),
    ("ABOVE", r'function aboveSec[\s\S]*?sechd\("(\w+)","(Above)"'),
]
# the flag rows of the station's flagsSec: (key, row class, icon, label) — lifted by these patterns
FLAGS = [("god", r'flagrow (god)"\}, icoEl\("(\w+)"\), E\("span",\{class:"flbl"\},"([^"]+)"'),
         ("untested", r'flagrow (warn)"\}, icoEl\("(\w+)"\), E\("span",\{class:"flbl"\},"(unguarded[^"]*)"'),
         ("conflict", r'flagrow (warn)"\}, icoEl\("(\w+)"\), E\("span",\{class:"flbl"\},"(conflict · )"')]


def die(msg: str) -> None:
    raise SystemExit("gen-all-endpoints (universe): " + msg)


def station_spec() -> dict:
    """{row: {icon, title}} lifted from the station's own source; a pattern that no longer matches stops the build."""
    src = STATION_HTML.read_text(encoding="utf-8")
    body = src[src.index("var C={"):]
    ep = body[:body.index('"function":function(n)')]
    for sec in ("usage(", "guardsSec(n)", "streamSec(n)", "homeEvRow(n), modelRow(n)", "accessSec(n)", "payloadSec(det)", "liveConns(n)",
                "behindTree(n)", "testsSec(det)", "journeysSection(", "identSec(n)", "sigSec(det)", "docSec(det)", "fileRowSec(n)"):
        if sec not in ep:
            die(f"the station's endpoint card no longer calls {sec} — re-read C.endpoint in {STATION_HTML.name}")
    if "flagsSec(n); if(_fl) out.push(_fl); out.push(aboveSec(n))" not in src:
        die("the station no longer appends the flags and Above to every card")
    out = {}
    for row, rx in ROWS:
        if rx is None:
            continue
        m = re.search(rx, src)
        if not m:
            die(f"row {row}: the station's source no longer matches {rx}")
        out[row] = {"icon": m.group(1), "title": m.group(2)}
    flags = {}
    for key, rx in FLAGS:
        m = re.search(rx, src)
        if not m:
            die(f"flag {key}: the station's source no longer matches {rx}")
        flags[key] = {"cls": m.group(1), "icon": m.group(2), "label": m.group(3)}
    out["RISK"] = {"icon": flags["untested"]["icon"], "title": None, "flags": flags}
    # the connection groups' words and trust, as liveConns + relLabel write them
    m = re.search(r'function relLabel\(rel, dir\)\{ var O=\{([^}]*)\},[^\n]*\n\s*I=\{([^}]*)\};', src)
    t = re.search(r'g\.rel==="(\w+)"\|\|g\.rel==="(\w+)"\?"structural":"inferred"', src)
    if not m or not t:
        die("the station's relation words (relLabel) or its connection trust (liveConns) no longer match")
    pairs = lambda x: dict(re.findall(r'(\w+):"([^"]*)"', x))
    out["_rel"] = {"out": pairs(m.group(1)), "in": pairs(m.group(2)), "structural": [t.group(1), t.group(2)]}
    # the station builds every map node with `god:false` and never raises it for an endpoint (only a function's hub does), so
    # the god-object flag cannot show on an endpoint card — the lab's `risk.god` (a handler of 50 lines or more) is not the station's
    out["_godOff"] = bool(re.search(r'god:false, method:\(kind==="endpoint"\)', src)) and not re.search(r'\bm\.god\s*=', src)
    out["HEAD"] = {"icon": "endpoint", "title": None}          # the panel head draws the node's kind glyph (_dispGlyph → the kind)
    # what the card draws INSIDE its rows, lifted the same way: how many chips a list shows before its "+N more" (and that
    # word), the Delivery row's own note, the word after a journey's component count, the state every case must hold for the
    # Tests count to turn green, and the frontend kinds the station renames
    lift = {"behindCap": r'function behindTree[\s\S]*?expander\(rows, \{cap:(\d+), maxDepth:\d+\}\)',
            "connCap": r'expander\(_connRows\(items, kind\), \{cap:(\d+), maxDepth:\d+\}\)',
            "more": r'"\+"\+\(rows\.length-shown\)\+" (\w+)"',
            "streamNote": r'function streamSec[\s\S]*?"streams to the client ", E\("span",\{[^}]*\}, "([^"]+)"\)',
            "comp": r'\(j\.comp\|\|0\)\+" (\w+)"',
            "okState": r'var okAll=cases\.length>0 && cases\.every\(function\(c\)\{return c\.state==="(\w+)";\}\)',
            "feKind": r'var FE_KIND=(\{[^}]*\})',
            "bootTier": r'if\(window\.__uniSetTier\)\{ try\{ __uniSetTier\((\d+)\); \}catch\(e\)\{\} \} if\(window\.__uniScaleGuard\)',
            "showFns": r'var CFG=\{[^\n]*?showFns:"(\w+)"'}
    card = {}
    for k, rx in lift.items():
        m = re.search(rx, src)
        if not m:
            die(f"card detail {k}: the station's source no longer matches {rx}")
        card[k] = m.group(1)
    for k in ("behindCap", "connCap", "bootTier"):
        card[k] = int(card[k])
    card["feKind"] = json.loads(card["feKind"])
    # the tier the station boots on (its presets, in order): the card this page reproduces is the one drawn there
    tiers = re.findall(r'\{ name:"(\w+)",\s*koff:\[([^\]]*)\]', src)
    if len(tiers) <= card["bootTier"]:
        die("the station's tier presets no longer match")
    card["tiers"] = [{"name": n, "fnOff": '"function"' in k} for n, k in tiers]
    card["tier"] = card["tiers"][card["bootTier"]]["name"]
    if card["tiers"][card["bootTier"]]["fnOff"] != (card["showFns"] == "off"):
        die("the station's boot tier and its Functions default disagree — re-read the boot sequence")
    out["_card"] = card
    out["_look"] = station_look(src)
    return out


# ── THE STATION'S LOOK (D-040): the universe column draws each row the way the station's card draws it, so the card's CSS
# rules, its colour tokens, its kind icons and the small tables and words its card draws with are LIFTED from the station's
# source here — never retyped. Every rule, token, icon and table named below must still be in the station, or the build
# stops: that is the drift guard. The rules are scoped under `.ust` (the column's card) so they reach nothing else on the page.
LOOK_CLASSES = {"pbody", "sec", "sechd", "ubar", "ufill", "sublbl", "kv", "pchip", "doc", "connbox", "more", "tabbar", "tab", "ttag",
                "jsec", "jmeta", "jcid", "corp", "ncomp", "jfaces", "face", "flagssec", "flagrow", "xpl", "xrow", "xhead", "xtw",
                "xtwsp", "xmeta", "xdeep", "xmore", "phead", "ptitle", "pname", "ptype", "pnav"}
LOOK_MUST = (".pbody", ".sec", ".sechd", ".sechd svg", ".sechd .cnt", ".sechd .cnt.ok", ".ubar", ".ufill", ".sublbl", ".kv", ".kv .k",
             ".kv .kico", ".pchip", ".pchip svg", ".pchip.model", ".pchip.schema", ".pchip.hook", ".pchip.fn", ".pchip.st-pass",
             ".pchip.filecov", ".doc", ".connbox .cinf .pchip", ".more", ".ttag", ".ttag.structural", ".ttag.inferred", ".tabbar",
             ".tab", ".tab.on", ".tab .tabn", ".jsec", ".jmeta", ".jcid", ".jcid.noc", ".corp", ".ncomp", ".jfaces", ".face",
             ".face.fhome", ".flagssec", ".flagrow", ".flagrow .flbl", ".flagrow.warn", ".flagrow.god", ".xpl", ".xrow", ".xhead",
             ".xtw", ".xtwsp", ".xtw::before", ".xmore", ".phead", ".ptitle", ".pname", ".ptype", ".pnav", ".pnav .pdot",
             ".pnav .pnl", ".pnav .pdir", ".pnav .pcore")
# the small tables and words the card draws with: name → pattern (its groups are the lifted values)
LOOK_LIFT = {
    "pico": r"""function pico\(n,cls,col\)\{ return '(<svg class="ico )'\+\(cls\|\|""\)\+'(" viewBox="[^"]+" width="\d+" height="\d+" fill="none" stroke=")'\+\(col\|\|"currentColor"\)\+'("[^>]*>)'\+\(P\[n\]\|\|GLYPH\[n\]\|\|""\)\+'</svg>'""",
    "inline": r"""function svgInline\(kind, col, w\)\{ return '(<svg viewBox="0 0 24 24" width=")'\+\(w\|\|14\)\+'" height="'\+\(w\|\|14\)\+'(" fill="none" stroke=")'\+\(col\|\|'currentColor'\)\+'("[^>]*>)'\+GLYPH\[kind\]""",
    "headW": r'svgInline\(_dispGlyph\(n\),K\.col,(\d+)\)',
    "headEnt": r"""\(n\.ent\?"<span style='([^']+)'> · "\+n\.ent""",
    "connico": r'var CONNICO=\{([^}]*)\}',
    "chipcls": r'function chipCls\(k\)\{ return \((\{[^}]*\})\)\[k\]\|\|"(\w+)"; \}',
    "state": r'var STATE_ICO=\{([^}]*)\}, STATE_LBL=\{([^}]*)\}',
    "usage": r'E\("div",\{class:"ufill",style:"width:"\+Math\.min\((\d+),n\*(\d+)\)\+"%"\}\)\), E\("div",\{class:"sublbl"\}, icoEl\("(\w+)"\), breakdown\)',
    "guards": r'icoEl\(m\.gate\?"(\w+)":"(\w+)"\),\s*m\.name\+" ", E\("span",\{style:"([^"]+)"\}, "· "\+m\.via\+\(m\.gate\?"( · \w+)":""\)\)',
    "delivery": r'sechd\("\w+","Delivery"\), E\("div",\{class:"sublbl"\}, icoEl\("(\w+)"\), "([^"]+)", E\("span",\{style:"([^"]+)"\}',
    "access": r'icoEl\(w\?"(\w+)":"(\w+)"\),\s*\(w\?"([^"]+)":"([^"]+)"\)\+o\.model\+" ", E\("span",\{style:"([^"]+)"\}, "· "\+o\.table\)',
    "payload": r'E\("div",\{class:"sublbl"\}, icoEl\("(\w+)"\), p\.n\+" field"',
    "conn": r'box\.append\(E\("div",\{class:"sublbl"\}, icoEl\(g\.icon\), g\.label\+" "\+g\.count, trustTag\(tr\)\),\s*E\("div",\{class:tr==="(\w+)"\?"(\w+)":""\}',
    "ttag": r'E\("span",\{class:"ttag (\w+)",title:"([^"]+)"\},"(\w+)"\)\s*: E\("span",\{class:"ttag (\w+)",title:"([^"]+)"\},"(\w+)"\)',
    "behind": r'E\("div",\{class:"sublbl"\}, icoEl\("(\w+)"\), "reach "\+b\.depth\+" · "\+b\.fns\+" behind"\+\(loaded\?"([^"]+)":"([^"]+)"\)\)',
    "behindChip": r'return \{ label:nm, cls:"(\w+)", glyph:"(\w+)", node:node',
    "testLabel": r'function testCredit\(c\)\{ var st=c\.state\|\|"unknown", label=/([^/]+)/\.test\(c\.cid\|\|""\)',
    "testGroup": r'return G\(k,"(\w+)", cs\.length\|\|fs\.length',
    "dcap": r'var w=E\("div"\), DCAP=(\d+);',
    "seeLess": r'lb=E\("span",\{class:"more",style:"cursor:pointer;display:none"\},"([^"]+)"\)',
    "casesMore": r'"\+"\+moreN\+" ([^"]+)"\)\);',
    "fileCov": r'icoEl\("(\w+)"\), "([^"]+) · "\+fs\.length\+" \(([^)]*)\)"',
    "fileChip": r'E\("span",\{class:"pchip (\w+)", title:"([^"]+)"\}, icoEl\("(\w+)"\), f\.name\)',
    "jReal": r'var real=/([^/]+)/\.test\(j\.cid\|\|""\)',
    "face": r'style:"color:hsl\("\+hue\+" ([\d.]+%) ([\d.]+%)\)"\}, icoEl\("(\w+)"\)\)',
    "identity": r'kv\("(\w+)","(entity)", n\.ent\), kv\("(\w+)","(layer)", n\.layer\|\|n\.K\.layer\),[^\n]*\n\s*kv\("(\w+)","(fan-in)", fi\+" caller"',
    "sig": r'det\.gsig\?E\("div",\{class:"doc",style:"([^"]+)"\}, det\.gsig\):null,\s*\(s\.lines!=null\)\?kv\("(\w+)","(\w+)"',
    "source": r'kv\("(\w+)","(file)", det\.file\+\(det\.flines\?\(":"\+det\.flines\):""\)\),\s*det\.status\?kv\("(\w+)","(status)", det\.status\)',
    "aboveCore": r'navRow\("__core","([^"]+)"\+n\.sub',
    "aboveEnt": r'navRow\(null,"([^"]+)"\+\(window\.__uniEntLabel',
    "aboveAll": r'navRow\("(\w+)","(everything)", null, null, function\(\)\{ panelAll\(\); \}, "up"\)\);\s*return w;',
    "dirUp": r'function dirIco\(dir\)\{ return dir\?E\("span",\{class:"pdir "\+dir\},icoEl\(dir==="down"\?"drill":"(\w+)"\)\):null; \}',
    "coreLead": r'E\("span",\{class:"pki pcore",html:\(window\.__uniCoreIco\?__uniCoreIco\(c\|\|"(\w+)",\d+\)',
    "entFallback": r'ENT\[e\]=\(_C4\.colors&&_C4\.colors\[e\]\)\|\|"(#[0-9a-fA-F]{3,6})"',
    "entHue": r'(function entHue\(s\)\{[^\n]*?return h%360; \})',
}
LOOK_EMPTY_OK = {"burst"}      # the conflict flag names a pill icon the card's icon table lacks, so the station draws it empty


def _css_rules(css: str) -> list:
    """(selector list, body) for every rule, brace-balanced; the rules inside an @media/@supports wrapper are skipped (the card
    sets none), comments dropped."""
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find("{", i)
        if j < 0:
            break
        sel = re.sub(r"/\*.*?\*/", "", css[i:j], flags=re.S).split("/*")[0].strip()
        depth, k = 1, j + 1
        while k < n and depth:
            depth += {"{": 1, "}": -1}.get(css[k], 0)
            k += 1
        if sel and not sel.startswith("@"):
            out.append((sel, css[j + 1:k - 1]))
        i = k
    return out


def _literal(src: str, marker: str) -> str:
    """The balanced `{…}` a marker opens or is followed by (string- and comment-aware)."""
    if src.count(marker) != 1:
        die(f"the station holds {src.count(marker)} of {marker!r}, not one")
    i = src.index(marker)
    j = src.index("{", i + (marker.rfind("{") if "{" in marker else len(marker)))
    depth, q, k = 0, None, j
    while k < len(src):
        c = src[k]
        if q:
            k += 2 if c == "\\" else 1
            q = None if c == q else q
            continue
        if src.startswith("//", k) or src.startswith("/*", k):
            k = src.index("\n" if src[k + 1] == "/" else "*/", k) + (1 if src[k + 1] == "/" else 2)
            continue
        if c in "'\"":
            q = c
        depth += {"{": 1, "}": -1}.get(c, 0)
        k += 1
        if not depth:
            return src[j:k]
    die(f"unbalanced literal after {marker!r}")


def station_look(src: str) -> dict:
    css = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", src, re.S))
    rules, have, allr = [], set(), _css_rules(css)
    for sel, body in allr:
        keep = [s.strip() for s in sel.split(",") if (m := re.match(r"\.([\w-]+)", s.strip())) and m.group(1) in LOOK_CLASSES]
        if not keep:
            continue
        have |= set(keep)
        scoped = [".ust " + re.sub(r"\.sec(?![\w-])", ".usec", s) for s in keep]      # the kit's own section class is .sec
        rules.append(", ".join(scoped) + "{ " + " ".join(body.split()) + " }")
    miss = [s for s in LOOK_MUST if s not in have]
    if miss:
        die(f"the station's card no longer has these CSS rules: {miss} — re-read its <style>")
    # the colour tokens the rules read: the station's :root (its dark default) and :root[data-theme="light"]
    tok = {"dark": {}, "light": {}}
    for sel, body in allr:
        key = {":root": "dark", ':root[data-theme="light"]': "light"}.get(sel)
        if key:
            tok[key].update((a, " ".join(b.split())) for a, b in re.findall(r"(--[\w-]+)\s*:\s*([^;]+)", body))
    base = re.search(r"html,body\{[^}]*?font:([^;]+);", css)
    ground = re.search(r"\.panel\{[^}]*?background:(var\(--[\w-]+\))", css)
    if not base or not ground:
        die("the station's body font or its panel ground no longer match")
    text = "\n".join(rules) + ground.group(1)
    names = sorted(set(re.findall(r"var\((--[\w-]+)\)", text)) | set(re.findall(r"var\((--[\w-]+),", text)))
    fallback = set(re.findall(r"var\((--[\w-]+),", text)) - set(re.findall(r"var\((--[\w-]+)\)", text))
    lost = [v for v in names if v not in tok["dark"] and v not in fallback]
    if lost:
        die(f"CSS tokens the card's rules read that the station's :root no longer defines: {lost}")
    dark = {v: tok["dark"][v] for v in names if v in tok["dark"]}
    light = {v: tok["light"].get(v, tok["dark"][v]) for v in names if v in tok["dark"]}
    lift = {}
    for k, rx in LOOK_LIFT.items():
        m = re.search(rx, src)
        if not m:
            die(f"card look {k}: the station's source no longer matches {rx[:90]}")
        lift[k] = m.groups()
    pairs = lambda x: dict(re.findall(r'"?(\w+)"?:"([^"]*)"', x))
    js = {"glyph": _literal(src, "var GLYPH={"), "p": _literal(src, "var P={ link:"), "kindcol": _literal(src, "var KINDCOL={"),
          "core": _literal(src, "var PATHS="),
          "ink": "function inkCol(hex)" + _literal(src, "function inkCol(hex)"), "hue": lift["entHue"][0],
          # every later GLYPH.<name>='…' (a guarded `if(!GLYPH.x)` one keeps a name already set) and the P.<name>='…' additions
          "gx": [[g, lit, bool(guard)] for guard, g, lit in re.findall(r"(if\(!GLYPH\.\w+\)\s*)?(?<![\w.])GLYPH\.(\w+)\s*=\s*('(?:[^'\\]|\\.)*')", src)],
          "galias": re.findall(r"GLYPH\.(\w+)=GLYPH\.(\w+);", src),
          "px": re.findall(r"^\s*P\.(\w+)=('(?:[^'\\]|\\.)*');", src, re.M)}
    if not js["px"]:
        die("the station's card icon table no longer gains its P.up / P.drill markers")
    return {"css": rules, "dark": dark, "light": light, "font": base.group(1).strip(), "ground": ground.group(1), "lift": lift, "js": js,
            "connico": pairs(lift["connico"][0]), "chipcls": [pairs(lift["chipcls"][0]), lift["chipcls"][1]],
            "stateIco": pairs(lift["state"][0]), "stateLbl": pairs(lift["state"][1])}


def look_eval(look: dict, need: set, kinds: set, ents: set) -> dict:
    """Run the lifted station code under node: the card's icons (pico: P[n] || GLYPH[n]), the endpoint's kind colour and its
    light-theme ink (inkCol), the core glyph, and each entity's face hue (entHue). A name the card cannot draw stops the build;
    a connection's other-end KIND the glyph table lacks draws the station's generic glyph, as the station draws it."""
    J = look["js"]
    code = r"""
const I=JSON.parse(process.argv[1]); const window={}; const out={ico:{},missing:[],hue:{}};
const GLYPH=eval('('+I.glyph+')'); for(const [n,lit,g] of I.gx){ if(g && GLYPH[n]) continue; GLYPH[n]=eval(lit); }
for(const [a,b] of I.galias){ if(!GLYPH[a]) GLYPH[a]=GLYPH[b]; }
const P=eval('('+I.p+')'); for(const [n,lit] of I.px) P[n]=eval(lit);
const PATHS=eval('('+I.core+')'); const KINDCOL=eval('('+I.kindcol+')');
const inkCol=eval('('+I.ink+')'); const entHue=eval('('+I.hue+')');
for(const n of I.need){ const s=P[n]||GLYPH[n]||''; if(!s && I.emptyOk.indexOf(n)<0) out.missing.push(n); out.ico[n]=s; }
for(const n of I.kinds){ out.ico[n]=P[n]||GLYPH[n]||GLYPH.__generic||''; if(!out.ico[n]) out.missing.push(n); }
out.core=PATHS[I.core_mode]||'';
out.kind={dark:KINDCOL.endpoint}; window.__uniTheme='light'; out.kind.light=inkCol(KINDCOL.endpoint);
for(const e of I.ents) out.hue[e]=entHue(e);
process.stdout.write(JSON.stringify(out));"""
    arg = dict(J, need=sorted(need), kinds=sorted(kinds), emptyOk=sorted(LOOK_EMPTY_OK), ents=sorted(ents), core_mode=look["lift"]["coreLead"][0])
    r = subprocess.run(["node", "-e", code, json.dumps(arg)], capture_output=True, text=True)
    if r.returncode != 0:
        die("the station's lifted card code could not run under node: " + r.stderr.strip()[-400:])
    out = json.loads(r.stdout)
    if out["missing"]:
        die(f"icons the station's card no longer draws: {out['missing']}")
    if not out["core"] or not out["kind"]["dark"]:
        die("the station's core glyph or its endpoint colour could not be read")
    return out


def harvest(needed_icons: set, colour_refs: set, bench: Path = HERE) -> dict:
    """Run the lab's registry under node with the station's tokens: the six parts' icon · word · colour, every station icon
    the page draws (as the station draws it), and the token colours the marks name (e.g. KINDCOL.type)."""
    js = r"""
const vm=require('vm'),fs=require('fs'),path=require('path');const H=process.argv[1];
const win={};win.window=win;const ctx=vm.createContext(win);
for(const f of ['_station.js','_lab-ep.js','_lab-ep-panels.js']) vm.runInContext(fs.readFileSync(path.join(H,f),'utf8'),ctx,{filename:f});
const S=win.STATION,P=win.PANELS,need=JSON.parse(process.argv[2]),cols=JSON.parse(process.argv[3]);
const parts={};Object.keys(P).forEach(k=>{parts[k]={icon:P[k].icon,word:P[k].word,col:P[k].col};if(need.indexOf(P[k].icon)<0)need.push(P[k].icon);});
const icons={},missing=[];need.forEach(n=>{const s=S.icon(n,16,'currentColor');if(!/<(path|rect|circle|ellipse|polygon|polyline|line)\b/.test(s))missing.push(n);icons[n]=s;});
const col={};cols.forEach(r=>{const [a,b]=r.split('.');col[r]=(S[a]||{})[b]||null;});
const pico=Object.keys(S.P).concat(Object.keys(S.GLYPH));
process.stdout.write(JSON.stringify({parts,icons,missing,col,pico}));"""
    need = sorted(needed_icons)
    r = subprocess.run(["node", "-e", js, str(bench), json.dumps(need), json.dumps(sorted(colour_refs))], capture_output=True, text=True)
    if r.returncode != 0:
        die("the lab's registry could not be read under node: " + r.stderr.strip()[-400:])
    out = json.loads(r.stdout)
    if out["missing"]:
        die(f"icons the station does not draw: {out['missing']}")
    bad = [k for k, v in out["col"].items() if not v]
    if bad:
        die(f"mark colours that name no station token: {bad}")
    return out


def inventory_ids() -> set:
    """Every attribute row of inventory-endpoint.md, as the id the ruled tree gives it (its gloss in brackets dropped, lowercase,
    every run of non-alphanumerics → '-')."""
    ids = set()
    for line in INVENTORY.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\|\s*([^|]+?)\s*\|", line)
        if not m or m.group(1) in ("attribute", "---") or set(m.group(1)) <= {"-"}:
            continue
        name = re.sub(r"\*|`|\([^)]*\)", "", m.group(1)).strip()      # the tree's id drops a row's (parenthesised gloss)
        ids.add(re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-"))
    return ids


def station_feeds() -> dict:
    """The three readings the lab's facts lack, from the station's own feeds."""
    s = (EX / "c4-graph.js").read_text(encoding="utf-8")
    G = json.JSONDecoder().raw_decode(s, s.index("{"))[0]
    LV = json.loads((EX / "levels.json").read_text(encoding="utf-8"))
    M, LM = G.get("models") or {}, LV.get("models") or {}
    # the levels map's function ids (file#name), one of the feeds a callee NAME is resolved to its qualified function through (D-041)
    fns = sorted({n["id"] for n in LV.get("fn_nodes") or []} | {e[k] for e in LV.get("fn_edges") or [] for k in ("s", "t") if e.get(k)})
    return {"models": M, "lmodels": LM, "pieces": LV.get("pieces") or {}, "naming": M.get("naming") or {}, "graph": G, "_links": None, "lvfns": fns}


def _station_links(feeds: dict, spec: dict) -> tuple:
    """The station's boot-time wires, built the way gabe-universe.html builds `nodes`/`links` (the l2 pieces deduped first
    home wins, then the frontend pieces; the l2 edges then the cross edges; a bridge re-targeted onto the export that fetched
    or the piece that absorbs its screen; only wires whose both ends are drawn). Built once, reused for every endpoint."""
    if feeds.get("_links"):
        return feeds["_links"]
    G, FK = feeds["graph"], spec["_card"]["feKind"]
    nid, order = {}, []
    for ent, g in (G.get("l2") or {}).items():
        for p in g.get("nodes") or []:
            if p["id"] not in nid:
                nid[p["id"]] = {"kind": p["kind"], "label": p.get("label") or p.get("slug") or p["id"]}
                order.append(p["id"])
    links = []
    for ent, g in (G.get("l2") or {}).items():
        for e in g.get("edges") or []:
            links.append([e.get("source"), e.get("target"), e.get("kind") or "calls", None])
    for e in G.get("cross_edges") or []:
        links.append([e.get("from"), e.get("to"), e.get("kind") or "fk", e.get("export")])
    fe = G.get("fe") if ((G.get("fe") or {}).get("pieces")) else None
    if fe:
        for p in fe["pieces"]:
            if p["id"] in nid:
                continue
            nid[p["id"]] = {"kind": FK.get(p["kind"], p["kind"]), "label": p.get("label") or p.get("name"), "screen": p.get("screen")}
            order.append(p["id"])
        ab = {}
        for i in order:                                          # the station walks `nodes` in order; a later piece wins a screen
            n = nid[i]
            if n.get("screen") and n["screen"] in nid and nid[n["screen"]]["kind"] == "web":
                ab[n["screen"]] = i
        for l in links:
            if l[3] and l[3] in nid:
                l[0] = l[3]
            elif l[0] in ab:
                l[0] = ab[l[0]]
            if l[1] in ab:
                l[1] = ab[l[1]]
        for w in ab:
            nid.pop(w, None)
    links = [l for l in links if l[0] in nid and l[1] in nid and l[0] != l[1]]
    feeds["_links"] = (nid, links)
    return feeds["_links"]


def station_conns(ID: str, feeds: dict, spec: dict, say: dict) -> list:
    """liveConns for one endpoint: its wires grouped by relation · direction · the other end's KIND, in the order the station
    meets them (outgoing groups first), each [label, count, trust, the members its list shows, how many more, rel, dir, every
    member, the other end's kind]."""
    nid, links = _station_links(feeds, spec)
    rel, cap = spec["_rel"], spec["_card"]["connCap"]
    out = []
    for d in ("out", "in"):
        by = {}
        for s_, t_, r_, _ in links:
            if (s_ if d == "out" else t_) != ID:
                continue
            o = nid[t_ if d == "out" else s_]
            g = by.setdefault(f"{r_}|{d}|{o['kind']}", {"rel": r_, "items": [], "kind": o["kind"], "ids": []})
            g["items"].append(o["label"])
            g["ids"].append(t_ if d == "out" else s_)                  # the member's node id: its identity key is read from it (D-041)
        for g in by.values():
            lab = (rel[d].get(g["rel"]) or (g["rel"] + ("" if d == "out" else " (in)")))
            tr = say["structural"] if g["rel"] in rel["structural"] else say["inferred"]
            it = g["items"]
            out.append([lab, len(it), tr, it[:cap], max(0, len(it) - cap), g["rel"], d, it, g["kind"], g["ids"]])
    return out


def pascal(run: str) -> str:
    """window.__uniCaseRun(run, "pascal") — split on space _ - / &, capitalise each word, join."""
    ws = [w for w in re.split(r"[\s_\-/&]+", str(run or "")) if w]
    return "".join(w[:1].upper() + w[1:] for w in ws) if ws else run


def ent_label(slug: str, feeds: dict) -> str:
    """window.__uniEntLabel for a backend entity under the station's defaults: the domain strategy names it by its key, and the
    frontend/backend convention's backend form renders it (case → PascalCase)."""
    fe = (feeds["naming"].get("fe") or {})
    form = ((fe.get("forms") or {}).get(fe.get("convention") or "case") or {}).get("be") or "{name}"
    name = "unclaimed" if slug == "__unclaimed__" else str(slug or "")
    return pascal(name) if form == "{name|pascal}" else form.replace("{name}", name)


def _top(m: dict):
    ks = sorted((m or {}).keys(), key=lambda k: -m[k])
    if not ks:
        return None
    tot = sum(m.values())
    hs = "unclaimed" if ks[0] == "__unclaimed__" else re.sub(r"^fe·", "", ks[0])
    return f"{hs} {round(100 * m[ks[0]] / tot)}% of {tot}"   # Math.round: a .5 share is rare here; the probe reads the station


def universe(L: dict, spec: dict, feeds: dict, U: dict) -> dict:
    """The station card's rows for one endpoint, in the station's order, each {row, icon, title, count, value, items}; and
    `silent`, the station's sections it does not draw for this endpoint. U = the words file's `universe` block."""
    I, sec, fx, tests = L["identity"], L["security"], L["functions"], L["tests"]
    say, rows, silent = U["say"], [], []
    ID = I["id"]
    view = "seeded"                                          # the station is SETTLED on seeded (CLAUDE.md, entity models 2026-09-07)
    H = dict((feeds["models"].get("homes") or {}).get(view) or {}); H.update((feeds["lmodels"].get("homes") or {}).get(view) or {})
    AB = set((feeds["models"].get("abstain") or {}).get(view) or []) | set((feeds["lmodels"].get("abstain") or {}).get(view) or [])
    HD = set((feeds["models"].get("held") or {}).get(view) or []) | set((feeds["lmodels"].get("held") or {}).get(view) or [])
    claim = I["entity"]
    ent = H.get(ID) or claim
    mark = "moved" if H.get(ID) else "abstain" if ID in AB else "held" if ID in HD else None

    def add(row, count=None, value="", items=None):
        rows.append({"row": row, "icon": spec[row]["icon"], "title": spec[row]["title"], "count": count, "value": value, "items": items or []})

    add("HEAD", None, f"{I['label']} · {I['type']} · {ent}", [I["label"], I["type"], ent])
    LK = spec["_look"]
    u = I.get("usage")
    n_use = ((u.get("api") or 0) + (u.get("internal") or 0)) if u else (I.get("fanin") or 0)
    add("USAGE", n_use, (f"{u.get('api') or 0} {say['api']} · {u.get('internal') or 0} {say['internal']}") if u
        else f"{I.get('fanin') or 0} {say['depend']}")
    g = sec.get("guards") or []
    if g:
        add("GUARDS", len(g), " · ".join(x["name"] + (f" ({say['gate']})" if x.get("gate") else "") for x in g),
            [[x["name"], x.get("via"), bool(x.get("gate"))] for x in g])
        rows[-1]["fns"] = [x.get("fn") or (x.get("resolved") or {}).get("key") for x in g]      # each guard's qualified function (D-041)
    else:
        silent.append("GUARDS")
    if sec.get("stream"):
        add("DELIVERY", None, say["stream"])
        rows[-1]["note"] = spec["_card"]["streamNote"]
    else:
        silent.append("DELIVERY")
    ev = I.get("home_ev") or {}
    if ev.get("verdict") and ev["verdict"] != "agree":
        by = say["by"].get(ev.get("by")) or ev.get("by") or say["by"]["file"]
        dest = ""
        if ev.get("to"):
            hs = "unclaimed" if ev["to"] == "__unclaimed__" else re.sub(r"^fe·", "", ev["to"])
            dest = say["feArea"].replace("{area}", hs) if ev.get("to_kind") == "fe-area" else hs
        more = (ev.get("others") or 0) - 1
        if ev["verdict"] == "move":
            word = say["move"] + " → " + dest + ((" · " + say["alsoUsedOne" if more == 1 else "alsoUsedMany"].replace("{n}", str(more))) if more > 0 else "")
        elif ev["verdict"] == "shared":
            word = say["shared"].replace("{n}", str(ev.get("others") or 0))
        else:
            word = say["stay"] + ((" " + say["over"] + " " + dest) if dest else "")
        us, ds = _top(ev.get("users")), _top(ev.get("data"))
        home = "unclaimed" if claim == "__unclaimed__" else claim
        add("EVIDENCE", None, f"{say['home']} {home} {say['byWord']} {by} · " + (f"{say['usersSay']} {us}" if us else say["usersAbstain"])
            + " · " + (f"{say['dataSays']} {ds}" if ds else (say["dataAbstains"] + (" — " + ev["data_note"] if ev.get("data_note") else "")))
            + " → " + word + " — " + say["evOnly"])
    else:
        silent.append("EVIDENCE")
    if mark and claim:
        add("MODEL ROW", None, f"{view}: " + (say["moved"].replace("{claim}", claim).replace("{home}", ent) if mark == "moved"
                                             else say["abstain"].replace("{claim}", claim) if mark == "abstain"
                                             else say["held"].replace("{claim}", claim)))
    else:
        silent.append("MODEL ROW")
    ops = (L["data"].get("ops") or [])
    if ops:
        nr = sum(1 for o in ops if o.get("rw") != "w")
        add("ACCESSES", len(ops), f"{nr} {say['reads']} · {len(ops) - nr} {say['writes']}", [[o.get("rw"), o.get("model"), o.get("table")] for o in ops])
    else:
        silent.append("ACCESSES")
    p = I.get("payload")
    if p:
        add("PAYLOAD", p["n"], f"{p['n']} {say['fieldOne' if p['n'] == 1 else 'fieldMany']} · → {p['schema']} {say['response']}")
    else:
        silent.append("PAYLOAD")
    card = spec["_card"]
    # the station's own grouping (liveConns keys a group by relation, direction AND the other end's kind — `touches` a model
    # and `touches` a schema are two groups), read off its own feed, never the lab's relation-only grouping
    cg = station_conns(ID, feeds, spec, say)
    tot = sum(x[1] for x in cg)
    # liveConns always shows its total, a 0 included (showCount)
    add("CONNECTIONS", tot, " · ".join(f"{g[0]} {g[1]}" for g in cg) or say["noEdges"],
        [g[:5] + [g[8], LK["connico"].get(g[5]) or "link", g[7][cap_c:]] for g in cg for cap_c in [card["connCap"]]])
    rows[-1]["ids"] = [g[9] for g in cg]                               # every member's node id, in the order the group lists it (D-041)
    drawn = {"members": sorted({m for g in cg for m in g[7]}), "walls": sorted({m for g in cg if g[5] == "walls" and g[6] == "in" for m in g[7]})}
    b = fx.get("behind") or {}
    if b.get("fns"):
        # behindTree lists the callee NAMES the feed carries, its first `cap` as chips and the rest behind "+N more"; the
        # count the feed holds past its names list (names_more) is drawn nowhere on the card, so it is not drawn here
        nm = list(b.get("names") or [])
        add("CODE BEHIND", b["fns"], f"{say['reach']} {b.get('depth')} · {b['fns']} {say['behind']}", nm[:card["behindCap"]])
        rows[-1]["more"] = max(0, len(nm) - card["behindCap"])
        rows[-1]["rest"] = nm[card["behindCap"]:]
    else:
        silent.append("CODE BEHIND")
    byc, fil = {}, {}
    for c in tests.get("cases") or []:
        byc.setdefault(c.get("corpus") or "api", []).append(c)
    for f in tests.get("case_files") or []:
        fil.setdefault(f.get("corpus") or "api", []).append(f)
    corp = list(dict.fromkeys(list(byc) + list(fil)))
    tg = [[k, len(byc.get(k) or []) or len(fil.get(k) or [])] for k in corp]
    tsum = sum(x[1] for x in tg)
    cs = tests.get("cases") or []
    add("TESTS", tsum if tg else None, " · ".join(f"{k} {n}" for k, n in tg) if tg else say["noCases"],
        [[c["cid"], c.get("state") or "unknown", c.get("corpus") or "api", c.get("name") or ""] for c in cs])
    rows[-1]["ok"] = bool(cs) and all(c.get("state") == card["okState"] for c in cs)   # the station's green count (okAll)
    rows[-1].update(tabs=tg, files=[[f.get("name"), f.get("corpus") or "api"] for f in tests.get("case_files") or []], casesMore=tests.get("cases_more") or 0)
    js_ = tests.get("journeys") or []
    if js_:
        mo = tests.get("journeys_more") or 0
        add("JOURNEYS", f"{len(js_)}+{mo}" if mo else len(js_), " · ".join(j["cid"] for j in js_[:3]) + (" …" if len(js_) > 3 else ""),
            [[j["cid"], j.get("corpus"), j.get("comp") or 0, list(j.get("entities") or [])] for j in js_])
        rows[-1]["home"] = ent
    else:
        silent.append("JOURNEYS")
    fi = I.get("fanin") or 0
    add("IDENTITY", None, f"{say['entity']} {ent} · {say['layer']} {I.get('layer')} · {say['fanin']} {fi} " + (say["caller"] if fi == 1 else say["callers"]) + " " + say["indegree"])
    ix = LK["lift"]["identity"]
    rows[-1]["kvs"] = [[ix[0], ix[1], ent], [ix[2], ix[3], I.get("layer")], [ix[4], ix[5], f"{fi} " + (say["caller"] if fi == 1 else say["callers"]) + " " + say["indegree"]]]
    sg = I.get("sig") or {}
    if I.get("gsig") or I.get("sig"):
        body = ((say["async"] + " · ") if sg.get("async") else "") + f"{sg.get('lines')} {say['lines']} · → {sg.get('returns') or '—'}" if sg.get("lines") is not None else ""
        add("SIGNATURE", None, body, [I.get("gsig") or ""])
    else:
        silent.append("SIGNATURE")
    if I.get("doc"):
        add("DOCSTRING", None, I["doc"])
    else:
        silent.append("DOCSTRING")
    if I.get("file"):
        add("SOURCE", None, f"{I['file']}" + (f":{I['flines']}" if I.get("flines") else "") + (f" · {say['status']} {I['status']}" if I.get("status") else ""))
        sx = LK["lift"]["source"]
        rows[-1]["kvs"] = [[sx[0], sx[1], f"{I['file']}" + (f":{I['flines']}" if I.get("flines") else "")]] + ([[sx[2], sx[3], str(I["status"])]] if I.get("status") else [])
    else:
        silent.append("SOURCE")
    rk, fl = I.get("risk") or {}, spec["RISK"]["flags"]
    flags = []
    if rk.get("god") and not spec["_godOff"]:
        flags.append(["god", fl["god"]["icon"], fl["god"]["label"], fl["god"]["cls"]])
    # the station's test floor (_testFloor): the cases drawn, the capped overflow, and the case counts file coverage names —
    # the lab's `risk.untested` counts named cases only, so a web file that covers the endpoint is read here the station's way
    floor = len(tests.get("cases") or []) + (tests.get("cases_more") or 0) + sum(
        int(m.group(1)) for f in (tests.get("case_files") or []) for m in [re.search(r"(\d+)\s*case", f.get("name") or "")] if m)
    if floor == 0:
        flags.append(["untested", fl["untested"]["icon"], fl["untested"]["label"], fl["untested"]["cls"]])
    if rk.get("conflict"):
        flags.append(["conflict", fl["conflict"]["icon"], fl["conflict"]["label"] + rk["conflict"], fl["conflict"]["cls"]])
    if flags:
        rows.append({"row": "RISK", "icon": flags[0][1], "title": None, "count": None, "value": " · ".join(f[2] for f in flags), "items": flags})
    else:
        silent.append("RISK")
    uc = ((feeds["pieces"].get(claim) or {}).get("usecases") or {})
    sub = next((gp for gp, v in uc.items() if I["label"] in ((v or {}).get("cls") or []) or I["label"] in ((v or {}).get("eps") or [])), "other")
    add("ABOVE", None, f"{say['cluster']} · {sub} · {say['entity']} · {ent_label(ent, feeds)} · {say['everything']}", [sub, ent_label(ent, feeds)])
    rows[-1]["dot"] = (feeds["graph"].get("colors") or {}).get(ent) or LK["lift"]["entFallback"][0]      # ENT[e], as the station fills it
    return {"rows": rows, "silent": silent, "_drawn": dict(drawn, sig=I.get("gsig") or "")}


LAB_MAP_JS = HERE / "_lab-ep-map.js"
LAB_HTML = HERE / "endpoint-lab.html"
LAB_NAV_WORDS = HERE / "map-nav.words.json"


def lab_marks() -> dict:
    """The marks the LAB's section map gives a block no part answers (_lab-ep-map.js blockMark, D-035) — read from the lab's
    source, never typed: per join kind the glyph (its markup from the table it is drawn from), the colour token and the
    lab's word for it. {act kind: {icon, svg, col, word}}; the key "*" is the mark every other block wears."""
    js, html = LAB_MAP_JS.read_text(encoding="utf-8"), LAB_HTML.read_text(encoding="utf-8")
    face = (json.loads(LAB_NAV_WORDS.read_text(encoding="utf-8")).get("face") or {})
    fn = re.search(r"function blockMark\(b\)\{([\s\S]*?)\n  \}", js) or re.search(r"function blockMark\(b\)\{([\s\S]*?\}); \}", js)
    if not fn:
        die("the lab's section map no longer has blockMark() — re-read _lab-ep-map.js")
    body = fn.group(1)
    one = r'return \{ kind: "(\w+)",(?: part: "\w+",)? col: "([^"]+)", svg: (?:LI \? LI\("(\w+)"|gly\("(\w+)")[^}]*?word: FW\("(\w+)", "([^"]*)"\) \}'
    tables = {"LI": (html, r"var LABICO = \{", r"function labIco\(n, size, col\)\{ return '<svg([^']*)'"),
              "gly": (js, r"var MAPICO = \{", r"function gly\(n, size, col\)\{ return '<svg([^']*)'")}

    def glyph(src_key: str, name: str) -> str:
        src, start, wrap = tables[src_key]
        a = re.search(start, src)
        m = a and re.search(r"(?:^|[\s,{])" + re.escape(name) + r"""\s*:\s*'([^']*)'""", src[a.end():])
        w = re.search(wrap, src)
        if not m or not w:
            die(f"the lab's glyph {name!r} could not be read from its table")
        sw = re.search(r'stroke-width="([\d.]+)"', src[w.end():w.end() + 200])
        return ('<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="' + (sw.group(1) if sw else "1.8")
                + '" stroke-linecap="round" stroke-linejoin="round">' + m.group(1) + "</svg>")
    out = {}
    for m in re.finditer(r'if \(a\.kind === "(\w+)"\) ' + one, body):
        act, _, col, li, gl, wk, wd = m.groups()
        out[act] = {"icon": "lab:" + (li or gl), "svg": glyph("LI" if li else "gly", li or gl), "col": col, "word": face.get(wk) or wd}
    last = re.search(one + r"\s*$", body.strip() + " ")
    if not last or last.group(1) != "none":
        die("the lab's blockMark() no longer ends on its no-page mark")
    _, col, li, gl, wk, wd = last.groups()
    out["*"] = {"icon": "lab:" + (li or gl), "svg": glyph("LI" if li else "gly", li or gl), "col": col, "word": face.get(wk) or wd}
    if not re.search(r'if \(a\.kind === "part" && PN\[a\.part\]\) return', body):
        die("the lab's blockMark() no longer marks a paired block with its part")
    return out


def marks(blocks: list, parts: dict, W: dict, lab: dict) -> dict:
    """Each block's mark: its part's icon and colour where the tree's join pairs it to a lab part; else THE LAB SECTION MAP'S
    mark for it (D-036: the table aligns with the lab) — the command panel's glyph for Endings, the running header's for a
    block read across every part, the one no-page mark for the rest. Those are my picks in the lab too, so they stay dashed
    here. The Shared group keeps its own hue (--sh, D-034) and takes an icon."""
    M = W["marks"]
    out = {}
    for b in blocks:
        sk = b["surface"]
        if sk in parts:
            out[b["key"]] = {"icon": parts[sk]["icon"], "col": parts[sk]["col"], "from": "part", "part": parts[sk]["word"], "surface": sk}
            continue
        m = lab.get(b["act"]) or lab["*"]
        out[b["key"]] = {"icon": m["icon"], "col": m["col"], "from": "lab", "part": m["word"], "surface": sk}
    out["_shared"] = {"icon": M["shared"]["icon"], "col": None, "from": "pick", "part": None, "surface": None}
    return out


def mark_refs(W: dict) -> tuple:
    return {W["marks"]["shared"]["icon"]}, set()


IDENT = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")


def read_here(row: dict, uni: dict) -> dict:
    """The attributes a station row shows on SOME endpoints only, read per endpoint from what the card draws for it:
    request-shape is shown when the card names the request schema (a Connections chip or the signature); a switch or an own
    guard is shown when a flag the card draws as `walled by` is a name its condition reads. {attr: [shown, of, names]}."""
    dr, d, out = uni["_drawn"], row["d"], {}
    if d.get("request"):
        nm = d["request"][0]
        hit = nm in dr["members"] or re.search(r"\b" + re.escape(nm) + r"\b", dr["sig"])
        out["request-shape"] = [1 if hit else 0, 1, [nm] if hit else []]
    walls = set(dr["walls"])
    for attr, key, text in (("switches", "switches", lambda x: " ".join(str(v) for v in x if v)),
                            ("own-guards", "guards", lambda x: str(x[1] or ""))):
        lst = d.get(key) or {"items": [], "more": 0}
        names = [n for x in lst["items"] for n in sorted(walls & set(IDENT.findall(text(x))))]
        hit = sum(1 for x in lst["items"] if walls & set(IDENT.findall(text(x))))
        out[attr] = [hit, len(lst["items"]) + (lst.get("more") or 0), sorted(set(names))]
    return out


def gaps(carried: set, uni: dict, U: dict, here: dict) -> tuple:
    """(gaps, partly): the attributes the code map holds something for here that no drawn station row shows, and those a row
    shows only part of on this endpoint ([attr, shown, of, names]) — both sorted by the tree's order later."""
    shown = {a for r in uni["rows"] for a in (U["rows"].get(r["row"]) or {}).get("attrs") or []}
    full, part = [], []
    for a in sorted(carried - shown):
        h = here.get(a)
        if h and h[1] and h[0] >= h[1]:
            continue                                                # all of it is on the card here
        if h and h[0]:
            part.append([a] + h)
            continue
        full.append(a)
    return full, part


def _strings(x) -> list:
    """Every string and number a value holds, flattened (a dict's values, never its keys)."""
    if isinstance(x, dict):
        return [s for v in x.values() for s in _strings(v)]
    if isinstance(x, (list, tuple)):
        return [s for v in x for s in _strings(v)]
    return [] if x is None or isinstance(x, bool) else [str(x)]


def names_drawn(u: dict) -> list:
    """The NAMES a universe row draws, as [what the row shows, the names that count as holding it, the element's key (the one
    the row's `keys` hold for it, else None), which of the row's things it is (its SELECTOR — a key's kind when it has one; else
    the station's own label for a key-value line, a flag's key, or a word for the row's one kind of thing)]: a guard, an access's
    table, a connection's member, a callee, a case, a journey, a key-value line's value, a flag, a sentence the row writes. Counts
    are not names; the head and Above name the entity and the cluster. The selector is what THE GAPS' hover reads a name by (D-044)."""
    r, it, ks = u["row"], u.get("items") or [], u.get("keys") or []
    at = lambda i: ks[i] if i < len(ks) and isinstance(ks[i], str) else None
    sel = lambda k, word: k.split(":", 1)[0] if k else word
    one = lambda s, k, word: [s, [s], k, sel(k, word)]
    if r == "HEAD":
        return [one(it[2], at(2), "entity")]
    if r == "GUARDS":
        return [one(g[0], at(i), "guard") for i, g in enumerate(it)]
    if r == "ACCESSES":
        return [[f"{o[1]} · {o[2]}", [o[2]], "table:" + o[2], "table"] for o in {(o[1], o[2]): o for o in it}.values()]
    if r == "CONNECTIONS":
        return [one(m, (ks[gi][mi] if gi < len(ks) and mi < len(ks[gi]) else None), "member") for gi, g in enumerate(it) for mi, m in enumerate(g[3] + g[7])]
    if r == "CODE BEHIND":
        return [one(n, at(i), "callee") for i, n in enumerate(it + (u.get("rest") or []))]
    if r == "TESTS":
        return [one(c[0], at(i), "case") for i, c in enumerate(it)] + [one(f[0], None, "file") for f in u.get("files") or []]
    if r == "JOURNEYS":
        return [one(j[0], (ks[i][0] if i < len(ks) and ks[i] else None), "journey") for i, j in enumerate(it)]
    if r in ("IDENTITY", "SOURCE"):
        return [one(str(kv[2]), at(i), kv[1]) for i, kv in enumerate(u["kvs"][:2]) if kv[2] not in (None, "")]
    if r == "SIGNATURE":
        return [one(it[0], None, "signature")] if it and it[0] else []
    if r == "RISK":
        return [one(f[2], None, f[0]) for f in it]
    if r == "ABOVE":
        return [one(x, at(i), ("cluster", "entity")[i]) for i, x in enumerate(it)]
    if r == "PAYLOAD":
        return [one(m.group(1), at(0), "schema") for m in [re.search(r"→ (\S+)", u["value"])] if m]
    if r in ("EVIDENCE", "MODEL ROW", "DOCSTRING", "DELIVERY"):
        return [one(u["value"], None, "value")]
    return []


def uni_elements(u: dict, T: list, NT: dict) -> list:
    """D-058 · the ITEMS a universe row draws, in the order the page draws them (the template's uRow gives each the same index),
    each [its members, its attributes, what it is named by]. A member is ("k", key) — the D-041 key it is drawn with — or ("n",
    name) for a function Code behind names without a key (BY MOMENT places those by name, D-057); a table an access or a
    connection reads or writes is ("r" | "w", key) — carried only by a BY MOMENT chip of that op (F1). An item whose members the
    card does not name (a count, a line, a flag, a file's cases, an aggregate journey) has None: it can never be read as carried.
    Its attributes come from the two why tables (a keyed item by its kind, a key-less one by its selector); None when neither lists
    it (it may hold any attribute of its row). What it is named by — ("k", its key) or ("n", a callee's name), None for an item
    with neither — is what THE GAPS' names join on (F2): a gap's name stands for the items of its row named the same."""
    r, it, ks = u["row"], u.get("items") or [], u.get("keys") or []
    at = lambda i: ks[i] if i < len(ks) and isinstance(ks[i], str) else None
    def attrs(k=None, sel=None):
        kind = k.split(":", 1)[0] if k else None
        a = sorted({x for e in T if kind and e["kind"] == kind and r in e["rows"] for x in e["attrs"]})
        e = NT.get((r, sel)) if sel and not kind else None
        return a or (list(e["attrs"]) if e else None)
    one = lambda k, sel=None, op=None: [[(op or "k", k)] if k else None, attrs(k, sel), ("k", k) if k else None]
    tab = lambda k, rw: rw if k and str(k).startswith("table:") and rw in ("r", "w") else None
    if r == "HEAD":
        return [one(at(0)), one(at(2))]
    if r in ("USAGE", "DELIVERY", "DOCSTRING"):
        return [[None, attrs(None, "value"), None]]
    if r in ("EVIDENCE", "MODEL ROW"):
        return [[None, attrs(None, "value"), None]]
    if r == "GUARDS":
        return [one(at(i)) for i in range(len(it))]
    if r == "ACCESSES":                                          # each access by its op: a read is not its write
        return [one(at(i), None, tab(at(i), str(it[i][0]))) for i in range(len(it))]
    if r == "PAYLOAD":
        m = re.search(r"→ (\S+)", u["value"])
        return [[None, None, None], one(at(0))] if m and at(0) else [[None, None, None]]
    if r == "CONNECTIONS":
        if not it:
            return [[None, None, None]]
        rel = {"reads_from": "r", "writes_to": "w"}
        return [one(k, None, tab(k, rel.get(g[0]))) for gi, g in enumerate(it) for mi, _m in enumerate(g[3] + g[7])
                for k in [ks[gi][mi] if gi < len(ks) and mi < len(ks[gi]) else None]]
    if r == "CODE BEHIND":
        names = it + (u.get("rest") or [])
        ch = [[[("k", at(i))] if at(i) else [("n", n)], attrs(at(i), "callee"), ("k", at(i)) if at(i) else ("n", n)] for i, n in enumerate(names)]
        # the count counts u["count"] functions; its members are named only when the card lists every one of them
        cnt = [m for c in ch for m in c[0]] if len(names) == u.get("count") else None
        return [[cnt, attrs("fn:x"), None]] + ch
    if r == "TESTS":
        if not u.get("tabs"):
            return [[None, None, None]]
        return ([one(at(i)) for i in range(len(it))] + [[None, attrs(None, "file"), None] for _f in u.get("files") or []]
                + ([[None, None, None]] if u.get("casesMore") else []))
    if r == "JOURNEYS":
        out = []
        for i, j in enumerate(it):
            jk = ks[i] if i < len(ks) and ks[i] else [None, []]
            faces = [e for n, e in enumerate(j[3]) if e and j[3].index(e) == n]
            fk = list(jk[1] or [])
            ms = [("k", jk[0])] + [("k", k) for k in fk] if jk[0] and len(fk) == len(faces) and all(fk) else None
            out.append([ms, attrs(jk[0], "journey"), ("k", jk[0]) if jk[0] else None])
        return out
    if r in ("IDENTITY", "SOURCE"):
        return [one(at(i), kv[1]) for i, kv in enumerate(u.get("kvs") or [])]
    if r == "SIGNATURE":
        return ([[None, None, None]] if it and it[0] else []) + ([[None, None, None]] if u.get("value") else [])
    if r == "RISK":
        return [[None, attrs(None, f[0]), None] for f in it]
    if r == "ABOVE":
        return [one(at(0), "cluster"), one(at(1)), [None, None, None]]
    return []


def reverse_gaps(row: dict, uni: dict, U: dict, carried_attrs: set) -> list:
    """THE GAPS, the other way (D-040): what the universe card shows for this endpoint that the code-map column does not hold.
    Per drawn row, in the card's order: [row, the row's attributes the code map holds nothing for here, whether the row maps to
    no attribute at all, the names it draws that the code-map column never names, and each name's [key, selector] (parallel,
    for its hover — D-044)]. The column's words are the values it draws (the head, every cell, every detail); a name is held
    when one of its names is a whole word there, any case. A connection's model counts as held by its table when the card's
    own Accesses pair them."""
    hay = " │ ".join(_strings([row[k] for k in ("m", "p", "fn", "file", "line", "ent", "seg", "declared")] + [row["v"], row["d"], (row.get("sig") or [None] * 4)[3]]))   # D-056 (11): the def text
    table_of = {}
    for o in next((u["items"] for u in uni["rows"] if u["row"] == "ACCESSES"), []):
        table_of.setdefault(o[1], []).append(o[2])
    held = lambda keys: any(re.search(r"(?<![\w])" + re.escape(k) + r"(?![\w])", hay, re.I) for k in keys if k)
    out = []
    for u in uni["rows"]:
        attrs = (U["rows"].get(u["row"]) or {}).get("attrs") or []
        miss = [a for a in attrs if a not in carried_attrs]
        facts = {}
        for n, keys, K, sl in names_drawn(u):
            if attrs and n not in facts and not held(keys + [t for k in keys for t in table_of.get(k, [])]):
                facts[n] = [K, sl]
        if miss or not attrs or facts:
            out.append([u["row"], miss, not attrs, list(facts), list(facts.values())])
    return out


def _has(x) -> bool:
    """A value the code map HOLDS something for: not absent or unknown, not zero, not an empty list, not none."""
    if x is None or x in ("absent", "unknown", "none", ""):
        return False
    if isinstance(x, bool):
        return x
    if isinstance(x, (int, float)):
        return x > 0
    if isinstance(x, dict):
        if "items" in x and "more" in x:
            return bool(x["items"])
        return any(_has(v) for v in x.values())
    if isinstance(x, (list, tuple)):
        return any(_has(v) for v in x)
    return True


def carried(row: dict, cols: list, CM: dict) -> dict:
    """{attr: [the right-column pairs that hold it]} for one row — the head pairs, every column, every detail pair."""
    out = {}
    def put(attrs, key):
        for a in attrs:
            out.setdefault(a, []).append(key)
    head = {"method": row["m"] + " " + row["p"], "handler": row.get("fn"), "entity": row.get("ent"), "segment": row.get("seg"), "declared": row.get("declared")}
    for k, spec in CM["head"].items():
        if _has(head.get(k)):
            put(spec["attrs"], "h:" + k)
    for c in cols:
        v, k = row["v"][c["id"]], row["k"][c["id"]]
        has = (_has(v) and _has(k)) if c["kind"] not in ("ratio", "spine", "stack", "dots", "cat") else (
            v[1] > 0 if c["kind"] == "ratio" else _has(v) if c["kind"] in ("spine", "dots", "cat") else
            any(n for f, n in v.items() if f != "none") if c["id"] == "fate" else _has(k)) if v not in ("absent", "unknown") else False
        if has:
            put([c["attr"]], "c:" + c["id"])
    for k, spec in CM["details"].items():
        x = row["d"].get(k)
        if k == "behind":
            x = (x or [None])[0]
        elif k == "proof":
            x = (x or {}).get("produced")
        elif k == "fates":                     # a path list whose every fate is "no own write" holds nothing about the writes
            x = [f for f in (x or {}).get("items") or [] if f[2] != "none"]
        if _has(x):
            put(spec["attrs"], "d:" + k)
            if k == "exits" and row.get("stream"):   # D-056 (12): the endings table marks a streamed answer with the station's badge
                put(["delivery"], "d:exits")
    return out


# ── D-042 · WHY THE CODE MAP LACKS A LIT ELEMENT. The code-map column NAMES an element when a node that IS it can be clicked there;
# a count pair that holds it, or an item that holds it through its own condition, lights with it (D-041) but does not name it.
# For every element a row holds that its code map does not name, the reasons are read from the row's own keys and ONE authored
# table (el.why.table, my proposal): which attributes an element of a kind, drawn by a universe row, belongs to, and which
# code-map fields it can sit in. Nothing is typed per element.
WHY_CODES = ("cnt", "alt", "low", "map", "gap")


def cm_fields(cols: list, CM: dict) -> dict:
    """{a field as the words table writes it (c:<column> · h:<head pair> · d:<detail pair>): (the pair's data-k on the page, its
    attributes)}. The five kinds-of-ending columns are one pair on the page, so each names that pair."""
    slots = [c["id"] for c in cols if c["kind"] == "slot"]
    out = {"c:" + c["id"]: ("c:" + (",".join(slots) if c["kind"] == "slot" else c["id"]), [c["attr"]]) for c in cols}
    out.update({"h:" + k: ("h:" + k, list(x["attrs"])) for k, x in CM["head"].items()})
    out.update({"d:" + k: ("d:" + k, list(x["attrs"])) for k, x in CM["details"].items()})
    return out


def cm_named(r: dict) -> dict:
    """{key: {pairs that NAME it}} — the nodes the page draws clickable as the key (kd with its first key), mirroring the
    template's headPair/detailPair; the probe proves the page draws exactly these."""
    hk, dk, d, out = r["hk"], r["dk"], r["d"], {}
    def put(k, f):
        if k:
            out.setdefault(k, set()).add(f)
    put(hk["method"], "h:method"); put(hk["handler"][0], "h:handler"); put(hk["handler"][1], "h:handler")
    if r.get("ent"):
        put(hk["entity"], "h:entity")
    if r.get("declared") not in (None, ""):
        put(hk["declared"], "h:declared")
    for x in dk["exits"]:
        put(x[0], "d:exits")
    for k in ("tables", "gateWrites", "fates", "gates", "limits", "deciders", "inflight", "alarms", "pieces"):
        for x in dk[k]:
            put(x, "d:" + k)
    for x in dk["guards"]:
        put(x[0], "d:guards"); put(x[2], "d:guards")
    for x in dk["switches"]:
        put(x[0], "d:switches")
    for x, it in zip(dk["reasons"], d["reasons"]["items"]):
        put(x[0], "d:reasons")
        if str(it[0] or "").rfind(":") > 0:
            put(x[1], "d:reasons")
    if d.get("request"):
        put(dk["request"], "d:request")
    if d.get("response"):
        put(dk["response"], "d:response")
    # D-056: the functions behind by name (1), every piece or file that sends it and every screen above (9), the cases it arranges
    # (2), the schemas inside the body and the reply (8) — each drawn as itself, so named
    for k, f in (("behind", "d:behind"), ("hook", "d:hook"), ("screens", "d:screens"), ("arranged", "d:arranged"), ("reqNest", "d:request"), ("repNest", "d:response")):
        for x in dk.get(k) or []:
            put(x, f)
    return out


def cm_holds(r: dict, F: dict) -> tuple:
    """({key: {pairs that COUNT it}}, {key: {pairs that hold it THROUGH another element}}) — a column's members and its
    through-keys (the generator's _cd/_cv), a test count in the endings, the functions-behind count, a guard's or a switch's
    condition that reads it."""
    cnt, via = {}, {}
    for col, ks in r["_cd"].items():
        for k in ks:
            cnt.setdefault(k, set()).add(F["c:" + col][0])
    for col, ks in r["_cv"].items():
        for k in ks:
            via.setdefault(k, set()).add(F["c:" + col][0])
    for x in r["dk"]["exits"]:
        for k in x[1]:
            cnt.setdefault(k, set()).add("d:exits")
    for k in r["dk"].get("behind") or []:
        cnt.setdefault(k, set()).add("d:behind")
    for f, ks in [("d:guards", x[1]) for x in r["dk"]["guards"]] + [("d:switches", x[1]) for x in r["dk"]["switches"]]:
        for k in ks:
            via.setdefault(k, set()).add(f)
    return cnt, via


def uni_rows_of(r: dict) -> dict:
    """{key: {the universe rows that draw it}} for one row."""
    out = {}
    def walk(x, row):
        if isinstance(x, str) and ":" in x:
            out.setdefault(x, set()).add(row)
        elif isinstance(x, (list, tuple)):
            for y in x:
                walk(y, row)
    for u in r["uni"]["rows"]:
        walk(u.get("keys"), u["row"]); walk([p[1] for p in u.get("parts") or []], u["row"])
    return out


def why_table(W: dict, A: dict, inv: set, F: dict, kinds: dict) -> list:
    """el.why.table, checked: every kind is a key kind the page has a word for, every row a station row, every attribute a row of
    the ruled tree AND of inventory-endpoint.md, every field a pair the code map draws, and no (row, kind) listed twice."""
    T, seen, rows = W["el"]["why"]["table"], set(), {x for x, _ in ROWS}
    for i, e in enumerate(T):
        at = f"el.why.table[{i}] ({e.get('kind')})"
        if e.get("kind") not in kinds:
            die(f"{at}: no key kind is called {e.get('kind')!r}")
        bad = [x for x in e.get("rows") or [] if x not in rows] or ([] if e.get("rows") else ["(none)"])
        if bad:
            die(f"{at}: rows the station's card does not have: {bad}")
        bad = [a for a in e.get("attrs") or [] if a not in A or a not in inv] or ([] if e.get("attrs") else ["(none)"])
        if bad:
            die(f"{at}: attribute ids that are not rows of the ruled tree and of inventory-endpoint.md: {bad}")
        bad = [f for f in e.get("fields") or [] if f not in F]
        if bad:
            die(f"{at}: fields the code-map column does not draw: {bad}")
        if e.get("about") not in (None, "map"):
            die(f"{at}: `about` is \"map\" or absent, not {e.get('about')!r}")
        for rw in e["rows"]:
            if (rw, e["kind"]) in seen:
                die(f"{at}: {e['kind']} drawn by {rw} is listed twice")
            seen.add((rw, e["kind"]))
    return T


def cm_reasons(rows: list, facts: list, T: list, A: dict, F: dict, partial: bool) -> None:
    """Adds `nr` to every row: {key: [[code, refs], …]} for each element the row holds (its universe card or its code map) that
    its code map does not NAME, and that can be lit somewhere on the page. cnt/alt refs are pairs (data-k), low/map refs are
    attributes, gap has none."""
    pair_attrs = {p: a for p, a in F.values()}
    r_low = min(a["r"] for a in A.values())
    per = [(r, L, cm_named(r), uni_rows_of(r)) for r, L in zip(rows, facts)]
    litable = {k for r, _L, nm, U in per for k in list(U) + list(nm)}
    drawn = {(rw, k.split(":", 1)[0]) for _r, _L, _n, U in per for k, rs in U.items() for rw in rs}
    dead = [f"{e['kind']} @ {rw}" for e in T for rw in e["rows"] if (rw, e["kind"]) not in drawn]
    if dead and not partial:
        die(f"el.why.table lists kinds no universe row draws on this page: {dead}")
    for r, L, named, U in per:
        cnt, via = cm_holds(r, F)
        inf = ((L["forms"].get("inflight") or {}).get("rows") or []) if (L["forms"].get("inflight") or {}).get("state") == "present" else []
        drawn_inf = len(r["dk"]["inflight"])
        nr = {}
        for K in sorted((set(U) | set(cnt) | set(via)) - set(named)):
            if K not in litable:
                continue
            kind, U_rows = K.split(":", 1)[0], U.get(K, set())
            ents = [e for e in T if e["kind"] == kind and U_rows & set(e["rows"])]
            if U_rows and not ents:
                die(f"{r['id']}: {K} is drawn by the universe row(s) {sorted(U_rows)} and el.why.table lists no {kind} there")
            pairs = {F[f][0] for e in ents for f in e["fields"]}
            c, a = set(cnt.get(K, ())), set(via.get(K, ()))
            if kind == "fn":                             # a function handed in as a value: the in-flight row that says so
                q = K[3:]
                for i, x in enumerate(inf):
                    if q in (x.get("dependency"), x.get("fn"), x.get("set_by")):
                        p = "d:inflight" if i < drawn_inf else F["c:inf_answer" if x.get("dies") == "with the answer" else "c:inf_server"][0]
                        if p in pairs:
                            a.add(p)
            a -= c
            if U_rows:
                off = sorted((c | a) - pairs)
                if off:
                    die(f"{r['id']}: {K} sits in {off}, which el.why.table does not list for a {kind} drawn by {sorted(U_rows)} — add the field")
            attrs = sorted({x for e in ents for x in e["attrs"]} | {x for p in c for x in pair_attrs[p]}, key=list(A).index)
            mp = bool(ents) and all(e.get("about") == "map" for e in ents)
            nr[K] = why_of(c, a, attrs, sorted({x for e in ents for x in e["attrs"]}, key=list(A).index) if mp else None, A, r_low)
        r["nr"] = nr


def why_of(c: set, a: set, attrs: list, map_attrs, A: dict, r_low: int) -> list:
    """D-042's rule, in the ONE place it lives — the code map's element line (cm_reasons) and every gap's hover (gap_whys, D-044)
    read their reasons here: counted, not named (the pairs `c` count it) · shown another way (the pairs `a` hold it another way)
    · low priority (every attribute it belongs to is rated at the bottom) · about the map (`map_attrs`, the attributes of a kind
    the table marks about the map; None when it is not) · not carried (nothing holds it and it is not about the map)."""
    why = []
    if c:
        why.append(["cnt", sorted(c)])
    if a:
        why.append(["alt", sorted(a)])
    if attrs and all(A[x]["r"] == r_low for x in attrs):
        why.append(["low", list(attrs)])
    if map_attrs is not None:
        why.append(["map", list(map_attrs)])
    if not c and not a and map_attrs is None:
        why.append(["gap", []])
    return why


# ── D-044 · A GAP'S HOVER: WHY IT EXISTS, AND HOW IT IS SOLVED. Every item of THE GAPS carries D-042's reasons (why_of — never a
# second rule) and a STATUS read from ONE authored table (one.gaps.status.table, my proposal): solved elsewhere · not solving ·
# open. An item's reasons: a name the code map lacks → the element's own D-042 reasons (r["nr"]); a name the code map NAMES under
# another form → shown another way, by the pairs that name it; a name with no key → el.why.names (my proposal: which attributes
# and fields a row's key-less thing belongs to); an attribute of a row → counted, not named when fields of the code map count
# the elements the row draws for it, else its own rating / map / not carried; a row that maps to no attribute → not carried.
# THE GAPS' first direction (the code map holds it, no universe row shows it) reads the attribute's own rating / map / "not drawn".
ST_WORDS = ("solved", "not", "open")


def names_table(W: dict, A: dict, inv: set, F: dict) -> dict:
    """el.why.names, checked: {(row, selector): entry} — every row a station row, every attribute a row of the ruled tree AND of
    inventory-endpoint.md, every field a pair the code map draws, `hold` cnt / alt / none, no (row, selector) twice."""
    out, rows = {}, {x for x, _ in ROWS}
    for i, e in enumerate(W["el"]["why"]["names"]):
        at = f"el.why.names[{i}] ({e.get('row')} · {e.get('sel')})"
        if e.get("row") not in rows or not e.get("sel"):
            die(f"{at}: a row the station's card does not have, or no selector")
        bad = [a for a in e.get("attrs") or [] if a not in A or a not in inv] or ([] if e.get("attrs") else ["(none)"])
        if bad:
            die(f"{at}: attribute ids that are not rows of the ruled tree and of inventory-endpoint.md: {bad}")
        bad = [f for f in e.get("fields") or [] if f not in F]
        if bad:
            die(f"{at}: fields the code-map column does not draw: {bad}")
        if e.get("hold") not in (None, "cnt", "alt") or bool(e.get("fields")) != bool(e.get("hold")):
            die(f"{at}: `hold` is cnt or alt exactly when fields are listed")
        if e.get("about") not in (None, "map"):
            die(f"{at}: `about` is \"map\" or absent")
        if (e["row"], e["sel"]) in out:
            die(f"{at}: listed twice")
        out[(e["row"], e["sel"])] = e
    return out


def _gap_q(K: str, fep: dict, fj: dict, row: dict) -> str | None:
    """A word the forms feed decides, splitting one status line where the plan differs (one.gaps.status.table `q`). A case the code
    map does not hold: it calls this endpoint only to set another test up (the endpoint's `tests.arranged_by`), a helper does
    (`helper_arranged`), the tests arm read no call of it (`test_cases.<id>.calls` empty), or it calls other endpoints only. A
    schema the code map does not name: nested in the reply model or the body's schema (`schemas{}` field types, followed down),
    or neither."""
    kind, ident = K.split(":", 1)
    if kind == "case":
        t, tc = (fep.get("tests") or {}), (fj.get("test_cases") or {})
        if ident in (t.get("arranged_by") or []):
            return "arranged"
        if ident in (t.get("helper_arranged") or []):
            return "helper"
        return "no calls" if not ((tc.get(ident) or {}).get("calls")) else "other"
    if kind == "schema":
        S, seen = fj.get("schemas") or {}, set()
        tops = [((fep.get("declared") or {}).get("response_model") or {}).get("name"), (row["d"].get("request") or [None])[0]]
        todo = [x for x in tops if x]
        while todo:
            n = todo.pop()
            if n in seen:
                continue
            seen.add(n)
            todo += [w for f in (S.get("schema:" + n) or {}).get("fields") or [] for w in IDENT.findall(str(f.get("annotation"))) if "schema:" + w in S]
        return "nested" if ident in seen - set(tops) else "other"
    return None


def gap_whys(rows: list, fj: dict, W: dict, T: list, NT: dict, A: dict, F: dict, partial: bool) -> dict:
    """Adds to every row `gwa` {attr: [why, st]} for THE GAPS' first direction and `gwb` (parallel to `rgaps`: [the unmapped row's
    item or None, [an item per attribute], [an item per name]]) for the second — `why` D-042's reasons, `st` the index of the status
    line in one.gaps.status.table (-1 on a fixture page where none is tabled). Returns the per-status counts, for the page."""
    S, r_low, order = W["one"]["gaps"]["status"]["table"], min(a["r"] for a in A.values()), list(A)
    rows_ok = {x for x, _ in ROWS}
    for i, e in enumerate(S):
        at = f"one.gaps.status.table[{i}] ({e.get('at')} · {e.get('why')})"
        if e.get("dir") not in ("a", "b") or e.get("why") not in WHY_CODES or e.get("status") not in ST_WORDS or not e.get("line"):
            die(f"{at}: dir a|b, why one of {WHY_CODES}, status one of {ST_WORDS}, and a line")
        head = str(e.get("at") or "")
        ok = head in A if e["dir"] == "a" else (head in rows_ok or (" @ " in head and head.rsplit(" @ ", 1)[1] in rows_ok))
        if not ok:
            die(f"{at}: `at` is an attribute id (a) or \"<kind|selector|attribute> @ <ROW>\" / \"<ROW>\" (b)")
        if e["status"] == "solved" and e["why"] not in ("cnt", "alt"):
            die(f"{at}: solved elsewhere needs a field that holds it — its reason must be counted, not named or shown another way")
        if e["status"] == "not" and not re.search(r"\bD-\d{3}\b", e["line"]):
            die(f"{at}: not solving must cite what keeps it off (a D-nnn ruling)")
        if e.get("q") not in (None, "arranged", "helper", "no calls", "other", "nested", "drawn", "none drawn"):
            die(f"{at}: `q` is a word _gap_q or an attribute item gives (where the feed holds it · drawn · none drawn), not {e.get('q')!r}")
    idx = {(e["dir"], e["at"], e["why"], e.get("q")): i for i, e in enumerate(S)}
    if len(idx) != len(S):
        die("one.gaps.status.table lists a (dir, at, why, q) twice")
    used, missing = set(), []
    about_map = lambda a: bool([e for e in T if a in e["attrs"]]) and all(e.get("about") == "map" for e in T if a in e["attrs"])
    own = lambda a: why_of(set(), set(), [a], [a] if about_map(a) else None, A, r_low)

    def status(d, at, why, q, where):
        i = idx.get((d, at, why[0][0], q), idx.get((d, at, why[0][0], None)))
        if i is None:
            missing.append(f"{where}: ({d}, {at}, {why[0][0]}{', ' + q if q else ''})")
            return -1
        used.add(i)
        return i

    for r in rows:
        fep = (fj.get("endpoints") or {}).get("endpoint:" + r["id"]) or {}
        named, held_f = cm_named(r), {f for fs in r["has"].values() for f in fs}
        r["gwa"] = {a: [own(a), 0] for a in r["gaps"] + [x[0] for x in r["partly"]]}
        for a, it in r["gwa"].items():
            it[1] = status("a", a, it[0], None, r["id"])
        U = {u["row"]: u for u in r["uni"]["rows"]}
        gwb = []
        for row, miss, unm, facts, fk in r["rgaps"]:
            u = U[row]
            flat = []
            def walk(x):
                if isinstance(x, str) and ":" in x:
                    flat.append(x)
                elif isinstance(x, (list, tuple)):
                    for y in x:
                        walk(y)
            walk(u.get("keys")); walk([p[1] for p in u.get("parts") or []])
            u_item = None
            if unm:
                w = why_of(set(), set(), [], None, A, r_low)
                u_item = [w, status("b", row, w, None, r["id"])]
            a_items = []
            for a in miss:
                lists = {e["kind"] for e in T if row in e["rows"] and a in e["attrs"]}
                els = [K for K in dict.fromkeys(flat) if (K.split(":", 1)[0] in lists) or not any(a in e["attrs"] for e in T if row in e["rows"])]
                c = {p for K in els for code, refs in (r["nr"].get(K) or []) if code == "cnt" for p in refs}
                w = why_of(c, set(), [a], [a] if about_map(a) else None, A, r_low)
                a_items.append([w, status("b", f"{a} @ {row}", w, "drawn" if els else "none drawn", r["id"])])
            f_items = []
            for name, (K, sl) in zip(facts, fk):
                q = None
                if K and K in r["nr"]:
                    w = r["nr"][K]
                elif K and K in named:
                    ents = [e for e in T if e["kind"] == K.split(":", 1)[0] and row in e["rows"]]
                    ats = sorted({x for e in ents for x in e["attrs"]}, key=order.index)
                    w = why_of(set(), set(named[K]), ats, ats if ents and all(e.get("about") == "map" for e in ents) else None, A, r_low)
                elif K:
                    die(f"{r['id']}: {K} drawn by {row} is neither reasoned (D-042) nor named by the code map")
                else:
                    e = NT.get((row, sl)) or die(f"{r['id']}: el.why.names has no line for the {sl} {row} draws ({name[:60]})")
                    hold = {F[f][0] for f in e.get("fields") or [] if f in held_f}
                    w = why_of(hold if e.get("hold") == "cnt" else set(), hold if e.get("hold") == "alt" else set(), e["attrs"],
                               e["attrs"] if e.get("about") == "map" else None, A, r_low)
                if K and w[0][0] == "gap":
                    q = _gap_q(K, fep, fj, r)
                f_items.append([w, status("b", f"{sl} @ {row}", w, q, r["id"])])
            gwb.append([u_item, a_items, f_items])
        r["gwb"] = gwb
    if missing and not partial:
        die("one.gaps.status.table has no line for: " + "; ".join(sorted(set(m.split(": ", 1)[1] for m in missing))[:12]))
    if not partial and len(used) != len(S):
        die(f"one.gaps.status.table lines no gap on the page uses: {[S[i]['at'] + ' · ' + S[i]['why'] for i in sorted(set(range(len(S))) - used)]}")
    if not partial and (set(NT) - {(row, sl) for r in rows for row, _m, _u, _f, fk in r["rgaps"] for K, sl in fk if not K}):
        die(f"el.why.names lines no key-less name on the page uses: {sorted(set(NT) - {(row, sl) for r in rows for row, _m, _u, _f, fk in r['rgaps'] for K, sl in fk if not K})}")
    n = {w: 0 for w in ST_WORDS}
    for r in rows:
        for it in list(r["gwa"].values()) + [x for g in r["gwb"] for x in ([g[0]] if g[0] else []) + g[1] + g[2]]:
            if it[1] >= 0:
                n[S[it[1]]["status"]] += 1
    return n


def ulook(spec: dict, unis: list) -> tuple:
    """The page's copy of the station's card look: (CSS — the tokens per theme, then the card's rules scoped to .ust; the
    tables the page draws the rows with). Every icon comes out of the station's own icon table, run by look_eval."""
    LK, lf = spec["_look"], spec["_look"]["lift"]
    need = {x["icon"] for k, x in spec.items() if not k.startswith("_") and isinstance(x, dict) and x.get("icon")}
    need |= {f["icon"] for f in spec["RISK"]["flags"].values()} | set(LK["connico"].values()) | set(LK["stateIco"].values())
    need |= {lf[k][i] for k, i in (("usage", 2), ("guards", 0), ("guards", 1), ("delivery", 0), ("access", 0), ("access", 1), ("payload", 0),
                                   ("behind", 0), ("behindChip", 1), ("testGroup", 0), ("fileCov", 0), ("fileChip", 2), ("face", 2), ("identity", 0), ("identity", 2),
                                   ("identity", 4), ("sig", 1), ("source", 0), ("source", 2), ("aboveAll", 0), ("dirUp", 0))}
    kinds = {g[5] for u in unis for r in u["rows"] if r["row"] == "CONNECTIONS" for g in r["items"]}
    ents = {e for u in unis for r in u["rows"] if r["row"] == "JOURNEYS" for j in r["items"] for e in j[3]}
    ev = look_eval(LK, need, kinds, ents)
    decl = lambda d, ink: " ".join(f"{k}:{v};" for k, v in d.items()) + f" --uk-endpoint:{ink};"
    css = ["/* THE GABE UNIVERSE'S CARD LOOK — lifted from templates/center/shell/gabe-universe.html by _ae_universe.py (D-040):",
           "   its colour tokens per theme, then its card rules, scoped to .ust. Never edit here; the generator stops when one is gone. */",
           ".ust{ " + decl(LK["light"], ev["kind"]["light"]) + f" font:{LK['font']}; color:var(--ink); background:{LK['ground']}; }}",
           '@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]) .ust{ ' + decl(LK["dark"], ev["kind"]["dark"]) + " } }",
           ':root[data-theme="dark"] .ust{ ' + decl(LK["dark"], ev["kind"]["dark"]) + " }"] + LK["css"]
    card = spec["_card"]
    return "\n".join(css), {
        "svg": list(lf["pico"]), "inline": list(lf["inline"]), "headW": int(lf["headW"][0]), "headEnt": lf["headEnt"][0],
        "ico": ev["ico"], "core": ev["core"], "kindCol": ev["kind"]["dark"],
        "hue": {e: f"hsl({h} {lf['face'][0]} {lf['face'][1]})" for e, h in ev["hue"].items()}, "faceIco": lf["face"][2],
        "chipCls": LK["chipcls"][0], "chipDef": LK["chipcls"][1], "stateIco": LK["stateIco"], "stateLbl": LK["stateLbl"],
        "usage": [int(lf["usage"][0]), int(lf["usage"][1]), lf["usage"][2]], "guards": lf["guards"], "delivery": lf["delivery"],
        "access": lf["access"], "payload": lf["payload"][0], "inferred": lf["conn"], "ttag": lf["ttag"], "behind": lf["behind"], "behindChip": lf["behindChip"],
        "testLabel": lf["testLabel"][0], "testGroup": lf["testGroup"][0], "dcap": int(lf["dcap"][0]), "seeLess": lf["seeLess"][0],
        "casesMore": lf["casesMore"][0], "fileCov": lf["fileCov"], "fileChip": lf["fileChip"], "jReal": lf["jReal"][0], "sig": lf["sig"],
        "above": [lf["aboveCore"][0], lf["aboveEnt"][0], lf["aboveAll"][0], lf["aboveAll"][1], lf["dirUp"][0]],
        "connCap": card["connCap"], "behindCap": card["behindCap"], "fnOff": card["tiers"][card["bootTier"]]["fnOff"]}


# ── D-052 · EVERY ELEMENT THE PAGE NAMES WEARS THE STATION'S GLYPH AND COLOUR, AND ITS SUBCATEGORY AS A LABEL AT THE END. The
# station draws a node with GLYPH[_dispGlyph(n)] in its kind colour (KINDS[kind].col = KINDCOL[kind]; a view component wears the
# screen glyph and VIEWCOL; the light theme darkens it through inkCol), and hangs one badge per kind on it (buildNode): an
# endpoint its method (and, streaming, its delivery), a function its role, a component its class, a module its class, a hook its
# role, a provider its class — each a disc in __BADGE_COL with a dark glyph. All of it is LIFTED here from the station's source and
# run under node; a table, a pattern or a badge line that is gone stops the build (the drift guard of D-040).
BADGE_ON = (("endpoint", "method", 'if(n.kind==="endpoint" && n.m && n.m.method){ try{ grp.add(methodBadge(n.m.method'),
            ("function", "role", 'else if(n.kind==="function" && n.role){ try{ grp.add(roleBadge(n.role))'),
            ("component", "feclass", 'else if(n.kind==="component" && (n.feClass==="'),
            ("module", "mclass", 'else if(n.kind==="module" && n.mclass){ try{ grp.add(feclassBadge(n.mclass,"mclass"))'),
            ("hook", "hrole", 'else if(n.kind==="hook" && n.hrole){ try{ grp.add(feclassBadge(n.hrole,"hrole"))'),
            ("provider", "pclass", 'if(n.kind==="provider" && n.pclass){ try{ grp.add(feclassBadge(n.pclass,"pclass"))'),
            ("endpoint", "delivery", 'if(n.kind==="endpoint" && n.stream){ try{ var _sb=feclassBadge("stream","delivery")'))
SK_LIFT = {
    "kcx": r'(?<![\w.])KINDCOL\.(\w+)\s*=\s*"(#[0-9a-fA-F]{3,8})"',
    "ktx": r'KINDS\.(\w+)=\{ col:"[^"]*", form:"\w+", label:"[^"]*", type:"([^"]*)"',
    "viewCol": r'var VIEWCOL="(#[0-9a-fA-F]{3,8})";',
    "viewGlyph": r'function _dispGlyph\(n\)\{ return _isView\(n\)\?"(\w+)":n\.kind; \}',
    "viewType": r'return Object\.assign\(\{\}, K, \{col:VIEWCOL, type:"([^"]+)"',
    "viewIs": r'function _isView\(n\)\{ return !!\(n && n\.kind==="(\w+)" && n\.feClass==="(\w+)"\); \}',
    "feclassOn": r'n\.kind==="component" && \(((?:n\.feClass==="\w+"\|\|)*n\.feClass==="\w+")\)',
    "badgeInk": r"window\.__badgeGlyph=function\(c, kind, key\)\{[\s\S]*?c\.strokeStyle='(#[0-9a-fA-F]{3,8})'",
    "methOf": r'function _methOf\(label\)\{ var m=/(.+?)/\.exec\(label\|\|""\); return m\?m\[1\]:null; \}',
    "stream": r'feclassBadge\("(\w+)","delivery"\)',
}


def station_kinds() -> dict:
    """The station's kind encoding, lifted: {kinds: {kind: {g, c, l, t}}, badge, desc, ink, on: {kind: [families]}, feclass,
    view, methOf, stream, feKind}. `g` the glyph's inner markup, `c` the kind colour, `l` its light-theme ink, `t` the station's
    own type word. The view is a kind of its own here ("view"), as the station draws it."""
    src = STATION_HTML.read_text(encoding="utf-8")
    for kind, fam, line in BADGE_ON:
        if line not in src:
            die(f"the station no longer hangs the {fam} badge on a {kind} (buildNode) — re-read gabe-universe.html")
    lf = {}
    for k, rx in SK_LIFT.items():
        m = re.findall(rx, src) if k in ("kcx", "ktx") else re.search(rx, src)
        if not m:
            die(f"kind encoding {k}: the station's source no longer matches {rx[:90]}")
        lf[k] = m if k in ("kcx", "ktx") else m.groups()
    look = station_look(src)
    J = look["js"]
    code = r"""
const I=JSON.parse(process.argv[1]); const window={}; const out={kinds:{},ent:{}};
const GLYPH=eval('('+I.glyph+')'); for(const [n,lit,g] of I.gx){ if(g && GLYPH[n]) continue; GLYPH[n]=eval(lit); }
for(const [a,b] of I.galias){ if(!GLYPH[a]) GLYPH[a]=GLYPH[b]; }
const KINDCOL=eval('('+I.kindcol+')'); for(const [k,c] of I.kcx) KINDCOL[k]=c;
const KINDS=eval('('+I.kinds+')'); for(const [k,t] of I.ktx){ KINDS[k]=KINDS[k]||{}; KINDS[k].type=t; }
const inkCol=eval('('+I.ink+')'); window.__uniTheme='light';
const B=eval('('+I.badge+')'), BD=eval('('+I.desc+')');
for(const k of Object.keys(KINDCOL)){ if(!GLYPH[k] || !KINDS[k]) continue; out.kinds[k]={g:GLYPH[k], c:KINDCOL[k], l:inkCol(KINDCOL[k]), t:KINDS[k].type}; }
out.kinds.view={g:GLYPH[I.viewGlyph], c:I.viewCol, l:inkCol(I.viewCol), t:I.viewType};
for(const [e,c] of Object.entries(I.ents)) out.ent[e]=[c, inkCol(c)]; out.fb=[I.fb, inkCol(I.fb)];
out.badge=B; out.desc=BD; process.stdout.write(JSON.stringify(out));"""
    ents = dict((station_feeds()["graph"].get("colors") or {}))
    arg = dict(J, kcx=lf["kcx"], ktx=lf["ktx"], kinds=_literal(src, "var KINDS={"), badge=_literal(src, "window.__BADGE_COL={"),
               desc=_literal(src, "window.__BADGE_DESC={"), viewGlyph=lf["viewGlyph"][0], viewCol=lf["viewCol"][0], viewType=lf["viewType"][0], ents=ents, fb=look["lift"]["entFallback"][0])
    r = subprocess.run(["node", "-e", code, json.dumps(arg)], capture_output=True, text=True)
    if r.returncode != 0:
        die("the station's kind encoding could not run under node: " + r.stderr.strip()[-400:])
    out = json.loads(r.stdout)
    on = {}
    for kind, fam, _ in BADGE_ON:
        if kind not in out["kinds"] or fam not in out["badge"]:
            die(f"the station hangs the {fam} badge on a {kind}, but its kind table or __BADGE_COL lacks it")
        on.setdefault(kind, []).append(fam)
    fc = re.findall(r'n\.feClass==="(\w+)"', lf["feclassOn"][0])
    if set(fc) - set(out["badge"]["feclass"]) or lf["stream"][0] not in out["badge"]["delivery"]:
        die("the component classes or the delivery the station badges are not all in __BADGE_COL")
    # the badge painter itself (the station's disc + its dark glyph, one canvas call), carried as its body — the page paints the
    # label's disc with it, never a retyped glyph (F4 of the D-052 review: a colour alone made POST, caller and fetcher one pill)
    bg = _literal(src, "window.__badgeGlyph=function(c, kind, key){")
    if "window.__BADGE_COL" not in bg or "c.stroke()" not in bg:
        die("the station's __badgeGlyph no longer reads __BADGE_COL and strokes its glyph — re-read gabe-universe.html")
    out.update(bg=bg, ink=lf["badgeInk"][0], on=on, feclass=fc, view=list(lf["viewIs"]), methOf=lf["methOf"][0], stream=lf["stream"][0])
    return out


def sk_keys(keys: set, SK: dict, M: dict, feeds: dict, roles: dict) -> tuple:
    """{key: [the station kind the page draws it as (a key of SK.kinds) or None, [[badge family, value], …], the entity it is when
    it is one]} for every key the station draws as a NODE, and {page kind: [how many keys, how many drawn]} for the key. The kind
    comes from the words file's mapping (station.map, my proposal where it is not one-to-one), and a key wears it only when the
    station's own feeds hold its node — the c4 graph's l2 nodes (endpoint · schema · flag · a model by its table · an unclaimed
    file), its frontend pieces, the levels map's functions; a mapping is never a promise the station keeps. A setting the station
    names as a flag's alias (the flag node's det.aliases) IS that flag. The subcategory is read from the same feeds; only a value
    __BADGE_COL colours is a label. A function the station holds no node for wears no glyph, but keeps its role as a label (None
    kind): D-043's role chip, read the station's way from the lab's facts (`roles`)."""
    G, LV = feeds["graph"], json.loads((EX / "levels.json").read_text(encoding="utf-8"))
    nodes = {p["id"]: p for e in (G.get("l2") or {}).values() for p in e.get("nodes") or []}
    t2m = {p["table"]: p for p in nodes.values() if p.get("kind") == "model" and p.get("table")}
    alias = {a: p["id"] for p in nodes.values() if p.get("kind") == "flag"
             for a in (((p.get("det") or {}) if isinstance(p.get("det"), dict) else {}).get("aliases") or [])}
    fe = {p["id"]: p for p in ((G.get("fe") or {}).get("pieces") or [])}
    fnr = {f["id"].replace("#", "::"): f.get("role") for f in LV.get("fn_nodes") or []}
    fk = {**{"fe-type": "type", "fe-unknown": "unknown"}, **(station_spec()["_card"]["feKind"])}
    meth = re.compile(SK["methOf"])
    B, out, tally = SK["badge"], {}, {}
    def sub(fam, v):
        return [[fam, v]] if v and v in (B.get(fam) or {}) else []
    for K in sorted(keys):
        kind, ident = K.split(":", 1)
        row = M.get(kind) or die(f"station.map has no row for the key kind {kind!r}")
        to, subs, ent = row.get("to"), [], None
        if to == "fe":
            p = fe.get(K)
            if not p:
                to = None
            else:
                to = fk.get(p["kind"], p["kind"])
                if to == SK["view"][0] and p.get("feClass") == SK["view"][1]:
                    to = "view"
                elif to == "component" and p.get("feClass") in SK["feclass"]:
                    subs = sub("feclass", p["feClass"])
                elif to == "hook":
                    subs = sub("hrole", p.get("hrole"))
                elif to == "module":
                    subs = sub("mclass", p.get("mclass"))
        elif to == "element":
            to = "element" if ("element:" + ident) in nodes else None
        elif to == "endpoint":
            n = nodes.get(K)
            if not n:
                to = None
            else:
                m = meth.match(n.get("label") or ident)
                subs = sub("method", m.group(1) if m else None) + (sub("delivery", SK["stream"]) if n.get("stream") else [])
        elif to == "function":
            if ident in fnr:
                subs = sub("role", fnr[ident])
            else:                                                        # no node: no glyph, the role label stays (D-043)
                to, subs = None, sub("role", roles.get(K))
        elif to == "model":
            to = "model" if kind != "table" or ident in t2m else None
        elif to in ("schema", "flag"):
            to = to if K in nodes else None
        elif to == "provider":
            to, subs = ("provider", sub("pclass", nodes[K].get("pclass"))) if K in nodes else (None, [])
        elif to == "entity":
            ent = ident
        elif to is None and kind == "setting" and ident in alias:        # the station's own reading: this setting IS the flag
            to = "flag"
        t = tally.setdefault(kind, [0, 0])
        t[0] += 1
        if to and to not in SK["kinds"]:
            die(f"station.map sends {kind} to {to!r}, a kind the station's tables do not draw")
        if to:
            t[1] += 1
        if to or subs:
            out[K] = [to, subs] + ([ent] if ent else [])
    return out, tally


def sk_css(SK: dict, ents: set) -> str:
    """The glyph colours per kind and per entity, per theme, the way the page's theme rules run (light first, then dark by the
    system or by the toggle) — the station's colours, never retyped."""
    rules = {"light": [], "dark": []}
    for k, x in SK["kinds"].items():
        rules["light"].append(f'.skg[data-sk="{k}"]{{ color:{x["l"]}; }}')
        rules["dark"].append(f'.skg[data-sk="{k}"]{{ color:{x["c"]}; }}')
    for e in sorted(ents):
        c = SK["ent"].get(e) or SK["fb"]                                  # ENT[e] = the c4 colour, else the station's fallback
        rules["light"].append(f'.skg[data-sk="entity"][data-ent="{e}"]{{ color:{c[1]}; }}')
        rules["dark"].append(f'.skg[data-sk="entity"][data-ent="{e}"]{{ color:{c[0]}; }}')
    dark = " ".join(rules["dark"])
    return "\n".join(["/* D-052 · THE STATION'S KIND COLOURS — lifted from gabe-universe.html by _ae_universe.station_kinds: KINDCOL (light: inkCol),",
                      "   VIEWCOL, the entity colours ENT (c4 colors). Never edit here. */", f":root{{ --skt:{SK['ink']}; }}"] + rules["light"]
                     + ['@media (prefers-color-scheme: dark){ ' + " ".join(':root:not([data-theme="light"]) ' + r for r in rules["dark"]) + " }",
                        " ".join(':root[data-theme="dark"] ' + r for r in rules["dark"])])
