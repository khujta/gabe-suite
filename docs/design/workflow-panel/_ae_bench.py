"""_ae_bench.py — THE EXAMPLES BENCH (D-071, his L-23 · L-08 · L-13 · L-11): one example of every kind of element the page draws,
each as a BLOCK in the endpoint lab's anatomy (title lines → a strip of marks → a click-open list → ONE hover), one column per kind
across the page, with its controls below it.

    import _ae_bench as BENCH
    EX, css, js, line = BENCH.bench(facts, rows, fj, W, X, phase_stage, write_ops)   # after BY MOMENT, before the rows are trimmed

WHAT IS LIFTED, NEVER RETYPED. The table's look is HIS DATA line (ruled, D-027): the lab's own DATACFG, cut out of
endpoint-lab.html and run under node, and the build stops when its block segment no longer equals the line pinned word for word in
probe-eplab.mjs. The schema's and the function's looks are the lab's SCHCFG and FNCFG (their edge, chips and marks are Data's, as the
lab shares them). The parts registries (BKPART · SCHPART · FNPART) and the field kinds (TYPEC, with the lab's own typeOf/isOpt run over
every column type) come out of _lab-ep-panels.js the same way; the block CSS is cut out of _lab-ep.css and scoped to the section. The
other five kinds' parts and default looks are MY picks (dashed on the page).

D-091 — THE LAB'S TYPE AND FIELD MARKS. The block draws in the lab's own `--font-mono` (read from the station's variables, never retyped); its lines keep the glyph's
column (`_ae-bench.js` xAlign); the lab's opacity bar (`sqBase`/`sqOptA`) and its unique corners are lifted with the block rules — a rule the lab writes beside the portrait's
twin selector (`#port … .rctab`) is kept for the block (PORT_TWIN), which is how the corners and the optional stop were lost before. Item 4: YN names the yes/no facts a kind's
marks carry in the feed (a function's write that a commit saves, a test's request that proves an ending, a fork the way takes) — an OPTION of the column, off by default.

WHAT IS COUNTED. Every element list is read from the lab's facts and the feed; the build stops when a list and the feed disagree
(the endings against the endpoint's exits, every path an ending or a test names, every case a path names, the gate roles against the
feed's own groups, a table's columns against the forms models). No wallclock: the same inputs give the same bytes.
"""
from __future__ import annotations

import collections
import json
import re
import subprocess
from pathlib import Path

import _ae_universe as UNI
import _ae_truth as TRUTH  # noqa: E402  (merge of the round-1b lanes: the race line said as BY MOMENT says it)

HERE = UNI.HERE
LAB_HTML, LAB_PANELS, LAB_CSS = HERE / "endpoint-lab.html", HERE / "_lab-ep-panels.js", HERE / "_lab-ep.css"
PROBE_EPLAB = HERE / "probe-eplab.mjs"
BENCH_JS, BENCH_CSS = HERE / "_ae-bench.js", HERE / "_ae-bench.css"
KINDS = ("end", "table", "schema", "fn", "test", "gate", "hook", "inf")          # his order (L-23), the columns left to right
WIDTHS = ["dynamic", "shorter", "compact", "tight"]                     # L-36 → D-087: the default and his three narrower ones, in his order — "full" is gone (the page draws them in _ae-bench.css by data-w, on the element only)
LAB_KINDS = {"table": "DATACFG", "schema": "SCHCFG", "fn": "FNCFG"}
# D-089 — HOVER REGIONS, by data. Each PART of a kind's block (and the strip of marks, `marks`, which is no draggable part) carries the region its
# hover belongs to: `head` — one short card about the parts of that region together (the ending's glyph and status) · `title` — the block's own
# card (D-088), which is also what a part not named here gives · `items` — one card for each item of the part (the where line, each mark of the strip).
# The page tags a part's node with its region wherever he drags the part (_ae-bench.js xRegions), so the region follows the part; a kind with no entry
# here keeps the one card. The card a region draws is _ae-card.js CDREG — a kind adopts regions by an entry here and a provider there.
# D-090 (his: "apply this not only to the endings, but to all the other elements that have a similar structure"): every kind has its entry, ONE RULE —
# `head` = the glyph and the coloured pill that classifies the element (a table's channel, a schema's direction, a function's role, a test's result, a gate's kind,
# a hook's role, an in-flight value's lifetime) · `items` = every LOCATION part (a file, a where, a via, a class, a set-by) and each mark of the strip · `title` =
# the name and every other part. His to correct by one entry here; the build stops on a part the table leaves out, so a part never falls to `title` unnoticed.
REGION_IDS = ("head", "title", "items")
REGIONS = {
    "end": {"icon": "head", "status": "head", "name": "title", "stage": "title", "count": "title", "via": "items", "how": "items", "marks": "items"},
    "table": {"icon": "head", "rw": "head", "name": "title", "ent": "title", "count": "title", "model": "items", "marks": "items"},
    "schema": {"icon": "head", "dir": "head", "name": "title", "ent": "title", "count": "title", "via": "items", "marks": "items"},
    "fn": {"icon": "head", "role": "head", "name": "title", "commit": "title", "file": "items", "count": "title", "via": "items", "marks": "items"},
    "test": {"icon": "head", "state": "head", "cid": "title", "proves": "title", "role": "title", "name": "title", "file": "items", "sends": "title", "asserts": "title", "marks": "items"},
    "gate": {"icon": "head", "role": "head", "cond": "title", "fn": "items", "level": "items", "effect": "title", "via": "items", "count": "title", "marks": "items"},
    "hook": {"icon": "head", "role": "head", "name": "title", "fkind": "title", "sends": "items", "file": "items", "count": "title", "marks": "items"},
    "inf": {"icon": "head", "life": "head", "name": "title", "ikind": "title", "set": "items", "count": "title", "marks": "items"},
}
# D-091 item 4 — a yes/no FACT a kind's marks can carry, each the feed's own (never invented), drawn only as an OPTION of the kind's column (`look.fact`, "off" by default; my pick, dashed, is YN_PICK):
#   fn   — a table's write mark: a commit on a way saves it (the lab's `committed` bucket of the step that writes it)          → o.ops[i][2] · 1 · 0 · null (a read has no such fact)
#   test — a request mark: the request PROVES an ending (its `refs` name an exit the code produces, not an ambiguous one)    → call[8] · 1 · 0, on an `act` request only
#   end  — a fork mark on the way: the way takes the branch (the chain's own `hit`)                                              → the chain's q[2]
# Not built, found: a gate's own check proved by a test (o.tests — one mark, the count badge says it already) · a schema field that carries a rule (f[5] — a schema is not in item 4's list) ·
# a hook's ending answered in a branch of its own and an in-flight value's read in middleware or a function (both already drawn: paler, and by glyph).
YN = {"fn": "saved", "test": "proves", "end": "taken"}
YN_VARIANTS = ("off", "corners", "grey")
YN_PICK = "corners"
GATE_ROLES = ("limiter", "scheme", "login", "rule", "own", "down", "branch", "catch", "switch")   # EX-4: the feed's own groups
TEST_ROLES = ("act", "check", "arrange", "service", "helper")
SCH_ROLES = ("in", "out", "in-nested", "out-nested")


def die(msg: str) -> None:
    raise SystemExit("gen-all-endpoints: the examples bench: " + msg)


# ── 1 · THE LAB'S LOOKS, lifted ─────────────────────────────────────────────────────────────────────────────────────────────
def _array(src: str, marker: str) -> str:
    """The balanced `[…]` a marker ending in `[` opens (string- and comment-aware, like UNI._literal for `{…}`)."""
    if src.count(marker) != 1 or not marker.endswith("["):
        die(f"the lab holds {src.count(marker)} of {marker!r}, not one")
    j = src.index(marker) + len(marker) - 1
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
        depth += {"[": 1, "{": 1, "]": -1, "}": -1}.get(c, 0)
        k += 1
        if not depth:
            return src[j:k]
    die(f"{marker!r} never closes")


LIFT_JS = r"""
const vm=require('vm'),fs=require('fs'),path=require('path');const H=process.argv[1],C=JSON.parse(fs.readFileSync(0,'utf8'));
const win={};win.window=win;const ctx=vm.createContext(win);
for(const f of ['_station.js','_lab-ep.js','_lab-ep-panels.js']) vm.runInContext(fs.readFileSync(path.join(H,f),'utf8'),ctx,{filename:f});
const S=win.STATION,cfg={};for(const k of Object.keys(C.cfg)) cfg[k]=vm.runInContext('('+C.cfg[k]+')',ctx);
vm.runInContext('var TYPEC='+C.typec+';\n'+C.typeOf+'\n'+C.isOpt,ctx);
const part=(a)=>a.map((x)=>({key:x.key,word:x.word,ico:x.ico,note:x.note}));
const sqOf={};for(const t of C.types) sqOf[t]=[win.typeOf(t).key,win.isOpt(t)?1:0];
process.stdout.write(JSON.stringify({cfg,parts:{table:part(win.BKPART),schema:part(win.SCHPART),fn:part(win.FNPART)},
  icol:Object.fromEntries(Object.entries(win.BKICOL).map(([k,v])=>[k,{word:v.word,plain:v.plain}])),
  sq:win.TYPEC.map((x)=>({key:x.key,word:x.word,col:x.col(S),ch:x.ch,sym:x.sym,shape:x.shape,plain:x.plain})),sqOf,
  col:{kind:S.KINDCOL,opc:S.OPC,rw:S.RW,role:S.BADGE_COL.role||{},hrole:S.BADGE_COL.hrole||{}}}));"""

# the block's rules in the lab's stylesheet: a selector naming one of these classes, and no lab region but #panel (re-scoped)
BLOCK_CLASSES = re.compile(r"\.(blk|bkhd|bkti|bkln|bkcol|bki|bke|bkm|bkn|bkrw|sqs|sq|bkfl|jdrw)\b")
LAB_REGIONS = re.compile(r"#(?!panel\b)[A-Za-z]")
PORT_TWIN = re.compile(r"#port(?:\.[\w-]+)* \.rctab")
CSS_MUST = (".blk", ".bkhd", ".sqs", ".sq", ".bkln", ".bkcol.r", ".sq.e-symbol svg", '#panel[class*="rail-"] .blk', "#panel.rail-left .blk",
            "#panel .bkhd .bkrw .jdrw", "#panel.rwbox-pill .bkhd .bkrw .jdrw", "#panel.cntbox-pill .bkhd .bkn.badge", ".form-block .bkhd")


def _css() -> str:
    """The lab's block rules, scoped: `#panel` (the lab's look carrier) becomes a column's `.exw`, every other rule sits under #sec-ex."""
    out, seen = [], set()
    for sel, body in UNI._css_rules(LAB_CSS.read_text(encoding="utf-8")):
        # the portrait's twin of a block selector (`#port .rctab`, `#port.uqm-corners.uqc-both .rctab` …) is no part of the bench: it is
        # turned into a selector that matches nothing (§ is its placeholder until the rule is scoped), so the rule's block half stays (D-091 — the unique corners and the opacity bar are such rules)
        sel = PORT_TWIN.sub("§", sel)
        parts = [s.strip() for s in sel.split(",")]
        if not any(BLOCK_CLASSES.search(s) for s in parts) or any(LAB_REGIONS.search(s) for s in parts):
            continue
        seen.update(parts)
        scoped = []
        for s in parts:
            s = s.replace("§", "#sec-ex .exw .nothing")
            scoped.append(s.replace("#panel", "#sec-ex .exw") if "#panel" in s else ("#sec-ex .exw" + s) if s.startswith(".form-block") else ("#sec-ex .exw " + s))
        out.append(", ".join(scoped) + "{ " + " ".join(body.split()) + " }")
    lost = [s for s in CSS_MUST if s not in seen]
    if lost:
        die(f"the lab's stylesheet no longer has the block rules {lost}")
    return "\n".join(out)


STATION_JS = HERE / "_station.js"


def _lab_mono() -> str:
    """The lab's monospace stack — `--font-mono` of the station's own variables (the lab's :root), read, never retyped. The bench's blocks draw in it
    (D-091, his: "the font is different"), not in the page's font cog's stack, which the lab has no part in."""
    m = re.search(r"--font-mono:\s*([^;\"]+?)\s*;", STATION_JS.read_text(encoding="utf-8"))
    if not m or "monospace" not in m.group(1):
        die("the station's variables no longer carry a monospace --font-mono (the bench's blocks draw in the lab's font)")
    return m.group(1)


def _copy_block(kind: str, cfg: dict, parts: list) -> str:
    """The block segment of a look, in the lab's COPYTXT words (endpoint-lab.html COPYTXT.data): the probe compares the table's
    to his pinned DATA line, and the page writes the same words (the engine's copyLine)."""
    B = cfg
    lab = {"table": {"icon": "icon", "rw": "chip", "name": "name", "ent": "entity", "count": "count", "model": "model"}}[kind]
    st = []
    for p in [x["key"] for x in parts]:
        on = p in [k for r in B["rows"] for k in r["l"] + r["r"]]
        if p == "icon":
            st.append(f"icon {'on' if on and B.get('icon', 1) else 'off'} {B['iconCol']}")
        elif p in ("rw", "name"):
            st.append(f"{lab[p]} {'on' if on and B.get(p, 1) else 'off'}")
        else:
            st.append(f"{lab[p]} {B[p] if on else 'off'}")
    rows = " / ".join((" ".join(r["l"]) or "—") + " | " + (" ".join(r["r"]) or "—") for r in B["rows"])
    return (f"block {B['form']} ({', '.join(st)}) · edge {B['railSide']}" + ("" if B["railSide"] == "none" else f" {B['railStyle']} {B['railW']}px")
            + f" · chips count {B['cntBox']} {B['cntA']}%, channel {B['rwBox']} {B['rwA']}% · lines {rows}"
            + " · sizes " + " ".join(f"{k} {v}" for k, v in B["size"].items())
            + f" · squares {B['sqSize']}px gap {B['sqGap']} {B['sqShape']} as {B['sqEnc']} by {B['sqPal']}")


def lift(types: set) -> dict:
    """The three lab looks, their part registries, the field kinds (with every type given classified by the lab's own typeOf)."""
    html, pan = LAB_HTML.read_text(encoding="utf-8"), LAB_PANELS.read_text(encoding="utf-8")
    C = {"cfg": {k: UNI._literal(html, f"var {v} = window.{v} = {{") for k, v in LAB_KINDS.items()},
         "typec": _array(pan, "var TYPEC = ["), "typeOf": "function typeOf(t)" + UNI._literal(pan, "function typeOf(t)"),
         "isOpt": "function isOpt(t)" + UNI._literal(pan, "function isOpt(t)"), "types": sorted(types)}
    r = subprocess.run(["node", "-e", LIFT_JS, str(HERE)], input=json.dumps(C), capture_output=True, text=True)
    if r.returncode != 0:
        die("the lab's looks could not be read under node: " + r.stderr.strip()[-400:])
    X = json.loads(r.stdout)
    D, look = X["cfg"]["table"], {}
    shared = {k: D["bk"][k] for k in ("railSide", "railStyle", "railW", "cntBox", "cntA", "rwBox", "rwA", "iconCol")}
    sq = {k: D[k] for k in ("sqSize", "sqGap", "sqShape", "sqEnc", "sqPal", "sqOpt", "sqBase", "sqOptA", "sqUqMark", "sqUqAt", "sqUqFlip", "sqUqLen", "sqUqW", "sqUqTip")}
    for k in LAB_KINDS:
        B = dict(X["cfg"][k]["bk"])
        base = {**shared, **{x: B[x] for x in B if x in shared}} if k == "table" else dict(shared)   # schema · fn: Data's look, as the lab shares it
        L = {**base, **{x: v for x, v in B.items() if x not in shared}, **sq}
        keys = [p["key"] for p in X["parts"][k]]
        L["size"] = dict(B["size"])
        for p in keys:                                  # a part the lab sizes by Data's chip or count (--rw-fs · --cnt-fs) takes that size
            if p not in L["size"]:
                L["size"][p] = D["bk"]["size"]["count" if p == "count" else "rw"]
        stray = {p for r0 in L["rows"] for p in r0["l"] + r0["r"]} - set(keys)
        if stray:
            die(f"{k}: the lab's lines name parts its registry does not hold: {sorted(stray)}")
        L["off"] = [p for p in keys if p not in [q for r0 in L["rows"] for q in r0["l"] + r0["r"]]]
        look[k] = L
    # HIS DATA line, word for word (D-027): the table's look must still boot on it
    pin = PROBE_EPLAB.read_text(encoding="utf-8")
    m = re.search(r"'data · shown as .*?'\s*\n\s*\+ ' · (block block .*?)'\s*\n\s*\+ ' · (lines .*?)'\s*\n\s*\+ ' · (squares [^,']*)", pin, re.S)
    if not m:
        die("probe-eplab.mjs no longer pins his DATA line — the table's look has no ruled line to boot on")
    his = m.group(1) + " · " + m.group(2) + " · " + m.group(3).strip()
    mine = _copy_block("table", look["table"], X["parts"]["table"])
    if mine != his:
        die(f"the lab's DATACFG no longer boots on his DATA line:\n  his  {his}\n  lab  {mine}")
    return {"look": look, "parts": X["parts"], "icol": X["icol"], "sq": X["sq"], "sqOf": X["sqOf"], "col": X["col"], "his": his}


# ── 2 · THE ELEMENTS, per endpoint (r.ex) and feed-wide (D.ex.cat) ───────────────────────────────────────────────────────────
SHORT_PARTS = 2   # a file is named by its last parts: the folder and the file (the page's xShort keeps as many)


def _short(at) -> str:
    """apps/api/services/cooking.py:140 → services/cooking.py:140 (the last SHORT_PARTS parts of the path)"""
    return "/".join(str(at).split("/")[-SHORT_PARTS:]) if at else ""


def _fname(q: str) -> str:
    return str(q).split("::")[-1].split("#")[-1]


def fill(t: str, **d) -> str:
    """a words entry with its {tokens} filled (the page's fill, for the few names the build must compare: the twins check)"""
    for k, v in d.items():
        t = t.replace("{" + k + "}", ("%g" % v) if isinstance(v, float) else str(v))
    return t


def _case_name(n: str, cid: str) -> str:
    s = re.sub(r"^test_", "", str(n or ""))
    s = re.sub(r"_?" + re.escape(str(cid)) + r"$", "", s)
    return s.replace("_", " ").strip() or str(cid)


def _file_line(at) -> tuple:
    f, _s, n = str(at or "").rpartition(":")
    return (f, int(n)) if n.isdigit() else (str(at or ""), -1)


def _chk(c: dict, CX: dict, I) -> list:
    """what a gate on a path CHECKS, as the page words it (CR-08 · CR-28): its kind and the facts its plain line needs — a limiter's
    name and numbers, the header a login scheme reads, the check's host and its condition as written"""
    ref, ph = c.get("ref"), c.get("phase")
    if ref in CX["lim"]:
        n, lim, win = CX["lim"][ref]
        return ["lim", I(n), lim, win]
    if ph == "middleware":
        return ["mw", I(c.get("via") or c.get("sub"))]
    if ph == "body-parse":
        return ["parse", I((CX["xs"].get(ref) or {}).get("code") or "")]
    if ph == "security":
        return ["scheme", I(CX["hdr"].get(ref) or ""), I(c.get("via") or c.get("sub"))]
    if ph == "dependency":
        return ["login", I(CX["gname"]), I(c.get("via") or c.get("sub"))]
    if ph == "validation":
        return ["body", I(CX["body"])]
    g = CX["pre_x"].get(ref)
    if g:
        return ["guard", I(CX["host"](g)), I(g.get("pred"))]
    via = str(c.get("via") or "")
    if via.startswith("except "):
        return ["catch", I(via[len("except "):])]
    return ["x"]


def _passes(g: dict, P: dict, ch: list, CX: dict) -> bool:
    """N3-13: does this way through the code pass a check that sits INSIDE a call (a precondition of depth ≥ 1)? Only when the way
    makes that call, leaves by another ending, took no branch the check waits past, and did not leave inside the call before the
    check's line (the call's own checks, in the order the called function runs them)"""
    m = re.match(r"^call (.+?) @ (.+)$", str(g.get("via") or ""))
    if not m or not any(c.get("kind") in ("call", "collapsed") and c.get("at") == m.group(2) for c in ch):
        return False
    ex = (P.get("exit") or {}).get("id") if isinstance(P.get("exit"), dict) else P.get("exit")
    if g.get("exit") and g.get("exit") == ex:
        return False
    if any(c.get("kind") == "gate" and c.get("ref") and c.get("ref") == g.get("exit") for c in ch):
        return False                                                        # the way already names it
    taken = {str(c.get("label") or "") for c in ch if c.get("kind") == "branch" and c.get("hit")}
    g_end = CX["pre_x"].get(ex)
    stopped = {str(g_end.get("pred"))} if g_end else set()
    for a in g.get("after") or []:
        w = re.match(r"^not \((.*)\)$", str(a))
        if w and (w.group(1) in taken or w.group(1) in stopped):
            return False
    gf, gl = _file_line(g.get("at"))
    for c in ch:                                                            # a branch that returns before the check's line
        if c.get("kind") == "branch" and c.get("hit") and str(c.get("label") or "") != "fall-through":
            bf, bl = _file_line(c.get("at"))
            if bf == gf and 0 <= bl < gl:
                return False
    if g_end and g_end is not g:
        ef, el = _file_line(g_end.get("at"))
        if ef == gf and 0 <= el < gl:
            return False
    return True


def _paths(F: dict, fj: dict, handler: str, inf: list, write_ops: set, I, CX: dict) -> dict:
    """{path id: the path as the bench draws it} — its ordered chain, the functions on it, the tables it reads and writes and whether
    each write is saved, its switches and the in-flight values read along it."""
    steps, out = fj.get("steps") or {}, {}
    for p in F.get("paths") or []:
        ch, fns = [], []
        def fn_(q):
            if q and q not in fns:
                fns.append(q)
        if p.get("phase") in ("handler",) and handler:
            fn_(handler)
        raw = list(p.get("chain") or [])
        # N3-13: the checks inside a call this way passes, each under the call it hangs from, in the order the called function runs them
        for g in CX["pre"]:
            if not g.get("depth") or not _passes(g, p, raw, CX):
                continue
            site = re.match(r"^call (.+?) @ (.+)$", str(g["via"])).group(2)
            j = next(k for k, c in enumerate(raw) if c.get("kind") in ("call", "collapsed") and c.get("at") == site) + 1
            gf, gl = _file_line(g.get("at"))
            while j < len(raw) and _file_line(raw[j].get("at"))[0] == gf and 0 <= _file_line(raw[j].get("at"))[1] < gl:
                j += 1
            x = CX["xs"].get(g.get("exit")) or {}
            raw.insert(j, {"kind": "gate", "hit": False, "at": g.get("at"), "ref": g.get("exit") or g.get("id"), "status": g.get("status"),
                           "label": f"{g.get('status')} {x.get('detail') or ''}".strip(), "sub": g.get("pred"), "phase": "handler", "_g": g})
            CX["tally"]["inCall"] += 1
        for c in raw:
            t, lb, sub, at = c.get("kind"), c.get("label"), c.get("sub"), _short(c.get("at")) or None
            if t == "step":
                ch.append(["step", I(lb), None, None, I(at), None])
            elif t == "switch":
                ch.append(["switch", I(lb), None, I("switch:" + str(c.get("ref"))), I(at), I(sub)])
            elif t == "gate":
                chk = ["guard", I(CX["host"](c["_g"])), I(c["_g"].get("pred"))] if c.get("_g") else _chk(c, CX, I)
                ch.append(["gate", I(lb), 1 if c.get("hit") else 0, I(c.get("ref")), I(at), I(sub), c.get("status"), chk])
            elif t in ("call", "collapsed"):
                ch.append(["call", I(lb), None, I("fn:" + c["fn"]) if c.get("fn") else None, I(at), None]); fn_(c.get("fn"))
            elif t == "branch":
                ch.append(["branch", I(CX["fall"] if lb == "fall-through" else lb), 1 if c.get("hit") else 0, I("fork:" + str(c.get("ref"))), I(at), None])
            elif t == "exit":
                ch.append(["exit", I(lb), None, I(c.get("ref")), None, I(sub)])
        E = p.get("effects") or {}
        tb = collections.OrderedDict()
        for s in E.get("steps") or []:
            st = {**(steps.get(s.get("step")) or {}), **{q: s[q] for q in ("table", "op", "at", "fn") if s.get(q)}}   # the lab's step, over the feed's
            fn_(s.get("via") or st.get("fn"))
            if not st.get("table"):
                continue
            w = st.get("op") in write_ops
            if st.get("op") not in write_ops and st.get("op") != "read":
                continue
            row = tb.setdefault(st["table"], [I(st["table"]), "", 0])
            row[1] = "".join(sorted(set(row[1]) | {"w" if w else "r"}, key="rw".index))
            if w and s.get("bucket") == "committed":                       # the lab's bucket: saved by a commit on this way
                row[2] = 1
        ifs = [i for i, x in enumerate(inf) if any(ra.get("in") == "middleware" or ra.get("fn") in fns for ra in x.get("read_at") or [])]
        out[p["id"]] = {"st": p.get("status"), "x": (p.get("exit") or {}).get("id"), "ch": ch, "fn": [I("fn:" + q) for q in fns],
                        "tb": list(tb.values()), "sw": [I("switch:" + (s if isinstance(s, str) else str(s.get("id")))) for s in p.get("switches") or []], "inf": ifs}
    return out


# the arm each kind's elements need, as the page's columns read it (gen-all-endpoints.arm_state): an arm the feed lacks makes the
# column say "absent" with the feed's reason, never draw a partial list
KIND_ARM = {"test": ("tests", None), "inf": ("kinds", "inflight")}


def arm_off(fj: dict, arm: tuple):
    """The reason an arm is off, or None."""
    name, part = arm
    a = (fj.get("arms") or {}).get(name) or {}
    if not a.get("present"):
        return a.get("reason") or name
    if part:
        pt = (a.get("parts") or {}).get(part) or {}
        if not pt.get("present"):
            return pt.get("reason") or f"{name}.{part}"
    return None


def _inf_key(x: dict) -> str:
    return "inflight:" + (x.get("ref") or "|".join(str(x.get(q)) for q in ("kind", "name", "set_at")))


def per_endpoint(L: dict, fj: dict, r: dict, X: dict, phase_stage: dict, write_ops: set, cat: dict, lk: dict, tally: collections.Counter, I, W: dict) -> dict:
    """r.ex: {kind: [[id, role here, what depends on this endpoint]], "paths": {…}} — and every element's feed-wide record into cat."""
    F, ep = L["forms"], r["id"]
    fep = fj["endpoints"]["endpoint:" + ep]
    handler = (F.get("endpoint") or {}).get("handler") or (L["functions"].get("handler") or {}).get("id", "").replace("#", "::")
    inf_rows = [x for x in ((F.get("inflight") or {}).get("rows") or [])] if (F.get("inflight") or {}).get("state") == "present" and not arm_off(fj, KIND_ARM["inf"]) else []
    exits = F.get("exits") or []
    au = F.get("auth") or {}
    auth_fns = {g.get("fn") for g in au.get("gates") or [] if g.get("fn")}
    deps = set(fj.get("dependencies") or {})
    FJF = fj.get("functions") or {}
    at2fn = collections.defaultdict(set)                  # a check's host: the function whose raise or refusal sits at its line (as _ae_els)
    for f0, rec in FJF.items():
        for z in (rec.get("raises") or []) + (rec.get("refusals") or []):
            if z.get("at"):
                at2fn[z["at"]].add(f0)
    for f0 in (F.get("inside") or {}).get("functions") or []:
        for z in (f0.get("raises") or []) + (f0.get("refusals") or []):
            if z.get("at") and f0.get("fn"):
                at2fn[z["at"]].add(f0["fn"])

    def host_of(g):
        """the function a check sits in: the handler for its own checks; else the one function recording a raise or refusal at its
        line; else the function the handler calls to reach it"""
        if not g.get("depth"):
            return handler
        hs = at2fn.get(g.get("at")) or set()
        if len(hs) == 1:
            return next(iter(hs))
        m = re.match(r"^call (.+?) @", str(g.get("via") or ""))
        return m.group(1) if m else None
    lim_x = {}
    for l0 in (F.get("rate") or {}).get("limits") or []:
        args = {a.get("param"): a.get("value") for a in l0.get("args") or []}
        lim_x[l0.get("exit")] = [str(l0.get("limiter") or l0.get("class") or "?").lstrip("_"), args.get("limit"), args.get("window_seconds")]
    CX = {"lim": lim_x, "xs": {x["id"]: x for x in exits}, "pre": F.get("preconditions") or [], "tally": tally, "fall": W["mo"]["x"]["c1"]["fall"],
          "pre_x": {g["exit"]: g for g in F.get("preconditions") or [] if g.get("exit")},
          "hdr": {s0.get("exit"): s0.get("header") or s0.get("carrier") for s0 in au.get("schemes") or []},
          "gname": (au.get("gates") or [{}])[0].get("name") or _fname((au.get("gates") or [{}])[0].get("fn") or ""),
          "body": (r["d"].get("request") or [None])[0] or "", "host": lambda g: _fname(host_of(g) or "")}
    PATHS = _paths(F, fj, handler, inf_rows, write_ops, I, CX)
    decl = {x[2]: x[5] for x in r["xd"]["exits"]}
    tests_of = lambda x: [[t.get("case"), t.get("conf"), t.get("role")] for t in x.get("tests") or [] if t.get("case")]
    ex = {k: [] for k in KINDS}

    # ENDINGS — every exit the endpoint has, each with the paths that reach it
    by_exit = collections.defaultdict(list)
    for pid, p in PATHS.items():
        by_exit[p["x"]].append(pid)
    for x in exits:
        i = ep + "|" + x["id"]
        rs = x.get("response") or {}
        cat[i] = {"k": "end", "n": str(x.get("status")), "ep": ep, "st": x.get("status"), "kd": x["kind"], "sg": phase_stage.get(x.get("phase"), "HANDLER") if x["kind"] != "success" else "ANSWER",
                  "say": x.get("detail"), "code": x.get("code"), "at": x.get("at") or rs.get("source"), "via": x.get("via"), "pred": x.get("pred"), "form": x.get("form"),
                  "decl": decl.get(x["id"]), "hd": sorted((rs.get("headers") or {}).items()), "media": rs.get("media"),
                  "fields": len(rs.get("fields") or []), "model": rs.get("model"), "tests": [q[0] for q in tests_of(x)], "paths": by_exit.get(x["id"], []),
                  # CR-28 · F26: what its plain line needs — the phase it leaves at, a limiter's name and numbers, the check that stops it
                  # (its host and its condition as written), the header a login scheme reads, the schema a 422 checks
                  "ph": x.get("phase"), "lim": lim_x.get(x["id"]), "hdr": CX["hdr"].get(x["id"]),
                  "guard": [CX["host"](CX["pre_x"][x["id"]]), CX["pre_x"][x["id"]].get("pred")] if x["id"] in CX["pre_x"] else None,
                  "sch": next((str(c.get("schema") or "").replace("schema:", "") for c in x.get("cases") or [] if c.get("schema")), None) or CX["body"] or None}
        row = next((q for q in fep.get("produced") or [] if q.get("id") == x["id"]), {})
        if not cat[i]["paths"]:
            if row.get("applies") is not False:
                die(f"{ep} · ending {x['id']}: no path of the feed reaches it, and the feed does not say it skips this endpoint")
            cat[i]["skip"] = row.get("when") or ""
            tally["skipped"] += 1
        ex["end"].append([i, x["kind"], {}])
    if len(ex["end"]) != r["k"]["all"]:
        die(f"{ep}: {len(ex['end'])} endings on the bench, the table's column counts {r['k']['all']}")
    if sorted(p for x in exits for p in by_exit.get(x["id"], [])) != sorted(PATHS):
        die(f"{ep}: a path reaches no ending the endpoint has")

    # TABLES — the lab's, in its order, with the ops the endpoint's paths run on each and whether a write is saved
    models = {m.get("table"): m for m in (fj.get("models") or {}).values() if m.get("table")}
    ops, seen_op = collections.defaultdict(list), {}
    for p in F.get("paths") or []:
        for s in (p.get("effects") or {}).get("steps") or []:
            st = {**((fj.get("steps") or {}).get(s.get("step")) or {}), **{q: s[q] for q in ("table", "op", "at", "fn") if s.get(q)}}
            if not st.get("table") or st.get("op") not in write_ops | {"read"}:
                continue
            k0 = (st["table"], st.get("op"), st.get("at"))                 # one row per operation and line; saved when any way saves it
            if k0 not in seen_op:
                seen_op[k0] = [st.get("op"), _short(st.get("at")), _fname(st.get("fn") or ""), 0]
                ops[st["table"]].append(seen_op[k0])
            if s.get("bucket") == "committed":
                seen_op[k0][3] = 1
    for t in L["data"]["tables"]:
        i = "table:" + t["table"]
        if i not in cat:
            m = models.get(t["table"]) or {}
            mc = m.get("columns") or {}
            names = [c[0] for c in t["cols"]]
            # the lab names a column by its attribute, the model by its database name (locations: order · display_order): the
            # count must agree; a name that differs is counted, and only the columns the lab cut are listed from the model
            more = [[n, str(c.get("type") or "")] for n, c in mc.items() if n not in names] if mc and t.get("cols_more") else []
            if mc and len(names) + (t.get("cols_more") or 0) != len(mc):
                die(f"table {t['table']}: the lab draws {len(names)} + {t.get('cols_more') or 0} columns, the forms model holds {len(mc)}")
            if mc and (any(n not in mc for n in names) or (t.get("cols_more") and len(more) != t["cols_more"])):
                tally["tblMismatch"] += 1; tally["tbl:" + t["table"]] += 1
            cat[i] = {"k": "table", "n": t["table"], "key": i, "model": t.get("model"), "ent": t.get("entity"), "ec": t.get("entity_color"),
                      "cols": [[c[0], c[1]] + lk["sqOf"].get(c[1], ["other", 0]) for c in t["cols"]], "more": more, "nmore": t.get("cols_more") or 0,
                      "fks": [f for f in t.get("fks") or [] if isinstance(f, list)], "uqs": t.get("uqs") or [], "file": t.get("file"), "at": t.get("at"),
                      "uq": [[u.get("name"), u.get("cols")] for u in ((m.get("constraints") or {}).get("uniques") or [])],
                      "drift": [[d.get("column"), d.get("field")] for d in m.get("drift") or []],
                      "race": len(((m.get("m10") or {}).get("races")) or []), "writers": len(m.get("writers") or [])}
        # S4-21: a race THIS endpoint's get-or-create runs on the table's unique key, joined to the ending it escapes to — the facts
        # BY MOMENT's race sentence (mo.x.race: {cols} {cons} {at} {st}) is filled with — the line through _ae_truth.short, as BY MOMENT says it
        unc = next((x.get("status") for x in exits if x["kind"] == "uncaught"), None)
        rc = next(([cl.get("constraint"), cl.get("table"), list(cl.get("unique") or []), unc, TRUTH.short(cl.get("race_at"))] for cl in (F.get("repeat") or {}).get("claims") or []
                   if cl.get("race") == "uncaught" and cl.get("table") == t["table"]), None)
        if rc and unc is None:
            die(f"{ep}: the race on {t['table']} escapes, and the endpoint has no uncaught ending to join it to")
        ex["table"].append([i, t["rw"], {"ops": ops.get(t["table"], []), **({"rc": rc} if rc else {})}])

    # SCHEMAS — the request body, the answer, and the shapes nested in them
    S = fj.get("schemas") or {}
    def sch(name, role, parent, ent=(None, None)):
        i = "schema:" + name
        s = S.get(i) or {}
        if i in cat and ent[0] and not cat[i].get("ent"):
            cat[i]["ent"], cat[i]["ec"] = ent
        if i not in cat:
            fl = s.get("fields") or []
            cat[i] = {"k": "schema", "n": name, "key": i, "at": s.get("at"), "file": s.get("file"),
                      "cols": [[f["name"], f.get("annotation") or ""] + lk["sqOf"].get(f.get("annotation") or "", ["other", 0])
                               + [1 if f.get("required") else 0, " ".join(f"{k}={v}" for k, v in sorted((f.get("constraints") or {}).items()))] for f in fl],
                      "extra": s.get("extra"), "vals": len(s.get("validators") or []), "cons": s.get("consumers"), "known": bool(s), "ent": ent[0], "ec": ent[1]}
        ex["schema"].append([i, role, {"parent": parent}])
    rq, rp = r["d"].get("request"), r["d"].get("response")
    ds = L["data"]["schemas"]
    ent = lambda side: ((ds.get(side) or {}).get("entity"), (ds.get(side) or {}).get("entity_color"))
    for side, top, role in (("request", rq, "in"), ("response", rp, "out")):
        if top and top[0]:
            sch(top[0], role, None, ent(side))
            for n in top[2] or []:
                if "schema:" + n != "schema:" + top[0] and not any(e[0] == "schema:" + n for e in ex["schema"]):
                    sch(n, role + "-nested", top[0])
    cases422 = collections.Counter(c.get("schema") for x in exits if x["kind"] == "validation" for c in x.get("cases") or [])
    for e in ex["schema"]:
        e[2]["c422"] = cases422.get(e[0], 0)

    # FUNCTIONS — the handler and the functions behind it, level by level (the lab's walk)
    # a raise is the function's (feed-wide); the ending it becomes is THIS endpoint's (the overlay)
    raises_of = lambda q: [[z.get("cls"), _short(z.get("at"))] for z in (FJF.get(q) or {}).get("raises") or []]
    raises_here = lambda q: [[t.get("status") for t in z.get("translated_by") or [] if t.get("endpoint") == "endpoint:" + ep] for z in (FJF.get(q) or {}).get("raises") or []]
    h = L["functions"].get("handler") or {}
    walk = [(0, h, None)] + [(i + 1, f, f.get("via")) for i, lv in enumerate(L["functions"].get("walk") or []) for f in lv]
    COMMITS = {s0.get("fn") for s0 in (fj.get("steps") or {}).values() if s0.get("op") == "commit"}
    # N3-24: the members are BY MOMENT's own — the lab's walk (with its levels), then every other function BY MOMENT places or names:
    # a call the handler's chain makes, a function whose own steps run, a name no single function carries
    in_walk = {f["id"].replace("#", "::") for _lv, f, _v in walk if f.get("id")}
    mo_fns = [x for x in (r.get("mo") or {}).get("el", []) + (r.get("mo") or {}).get("un", []) if x and x[0] == "fn"]
    extra = list(dict.fromkeys((x[2][0][3:] if x[2] else None, None if x[2] else str(x[3])) for x in mo_fns))
    extra = [(q, n) for q, n in extra if (q and q not in in_walk) or (not q and n)]
    chain_at = {}                                             # a function the handler's chain calls: the line it calls it at
    for p in F.get("paths") or []:
        for c in p.get("chain") or []:
            if c.get("kind") in ("call", "collapsed") and c.get("fn"):
                chain_at.setdefault(c["fn"], c.get("at"))
    fn_ops = collections.defaultdict(lambda: collections.OrderedDict())   # a function the walk does not hold: the tables its own steps touch here
    for p in F.get("paths") or []:
        for s in (p.get("effects") or {}).get("steps") or []:
            st = {**((fj.get("steps") or {}).get(s.get("step")) or {}), **{q: s[q] for q in ("table", "op", "fn") if s.get(q)}}
            if st.get("table") and st.get("fn") and (st.get("op") in write_ops or st.get("op") == "read"):
                fn_ops[st["fn"]].setdefault(st["table"], set()).add("w" if st["op"] in write_ops else "r")
    saved_by = collections.defaultdict(set)                    # D-091: (function, table) → for each write there, whether a commit on a way saves it (the lab's bucket, as the table's `ops` say it)
    for p in F.get("paths") or []:
        for s in (p.get("effects") or {}).get("steps") or []:
            st = {**((fj.get("steps") or {}).get(s.get("step")) or {}), **{q: s[q] for q in ("table", "op", "fn") if s.get(q)}}
            if st.get("table") and st.get("fn") and st.get("op") in write_ops:
                saved_by[(st["fn"], st["table"])].add(s.get("bucket") == "committed")

    def saved_of(q, rw, table):
        v = saved_by.get((q, table)) if q and "w" in str(rw or "") else None
        return None if not v else 1 if True in v else 0
    own_checks = collections.defaultdict(list)                 # CR-29: the checks a function's own code makes, each with its refusal
    for g in F.get("preconditions") or []:
        q = host_of(g)
        if q:
            x = CX["xs"].get(g.get("exit")) or {}
            own_checks[q].append([g.get("status"), I(x.get("detail")), I(g.get("pred"))])
    for lv, f, via in walk + [(None, {"id": q, "name": _fname(q) if q else n, "_x": 1}, None) for q, n in extra]:
        q = f["id"].replace("#", "::") if f.get("id") else None
        i = "fn:" + q if q else "fnname:" + f["name"]
        if i not in cat:
            if q:
                cat[i] = {"k": "fn", "n": f.get("name"), "key": i, "file": f.get("file") or q.split("::")[0], "at": f.get("at") or (FJF.get(q) or {}).get("at"),
                          "lines": f.get("lines") if not f.get("_x") else X["fnlines"].get(q), "god": 1 if f.get("god") else 0,
                          "async": f.get("async"), "ret": f.get("returns"), "role": f.get("role"),
                          "commits": 1 if q in COMMITS else 0,               # N3-19: from the forms feed's steps (op commit), never the station's flag
                          "raises": raises_of(q), "doc": (f.get("insight") or {}).get("doc"), "ent": f.get("entity")}
            else:
                cat[i] = {"k": "fn", "n": f["name"], "key": None, "nokey": 1, "raises": [], "commits": 0}
        o = {"lv": lv, "via": via, "h": 1 if lv == 0 else 0, "ops": [[o0.get("rw"), o0.get("table"), saved_of(q, o0.get("rw"), o0.get("table"))] for o0 in f.get("ops") or []],
             "calls": [[I("fn:" + g["id"].replace("#", "::")), []] for l2, g, v2 in walk if lv is not None and v2 == f.get("name") and l2 == lv + 1 and g.get("id")],
             "rz": raises_here(q) if q else [], "chk": own_checks.get(q, []) if q else []}
        if f.get("_x") and q:                                  # not on the walk: who calls it, where the handler's chain says so
            o["ops"] = [["".join(sorted(v, key="rw".index)), t0, saved_of(q, "".join(v), t0)] for t0, v in fn_ops.get(q, {}).items()]
            if q in chain_at:
                o["by"] = [I(_fname(handler)), I(_short(chain_at[q]))]
            else:
                rb = next((b for b in (FJF.get(q) or {}).get("reached_by") or [] if b.get("root") == "endpoint:" + ep and b.get("via")), None)
                if rb:
                    o["by"] = [I(_fname(rb["via"])), I(_short(rb.get("site")))]
        if lv == 0:                                            # the handler: each call its chain makes, with the refusals it can lead to
            sts = collections.defaultdict(set)
            for g in F.get("preconditions") or []:
                m = re.match(r"^call (.+?) @ (.+)$", str(g.get("via") or ""))
                if m and g.get("status") is not None:
                    sts[m.group(2)].add(g["status"])
            o["calls"] = []
            for fq, at in chain_at.items():
                for z in (FJF.get(fq) or {}).get("raises") or []:
                    for t in z.get("translated_by") or []:
                        if t.get("endpoint") == "endpoint:" + ep and t.get("status") is not None:
                            sts[at].add(t["status"])
                o["calls"].append([I("fn:" + fq), sorted(sts.get(at, set()), key=str)])
        ex["fn"].append([i, f.get("role") or "none", o])

    # TESTS — every case the lab's roster names on this endpoint, linked to what its requests here pass and touch (L-08, EX-3)
    TC = fj.get("test_cases") or {}
    roster = (L["tests"].get("roster") or []) if not arm_off(fj, KIND_ARM["test"]) else []
    jy = {j["cid"]: j.get("entities") or [] for j in L["tests"].get("journeys") or []}
    status_ends = collections.defaultdict(list)
    for x in exits:
        status_ends[x.get("status")].append(x["id"])
    listed = {t["cid"] for t in roster}
    roster = roster + [{"cid": c, "role": "helper-arranged", **{q: (TC.get(c) or {}).get(q) for q in ("name", "file", "line", "state", "corpus")}}
                       for c in ((F.get("endpoint") or {}).get("tests") or {}).get("helper_arranged") or [] if c not in listed and c in TC and roster]
    for t in roster:
        cid, tc = t["cid"], TC.get(t["cid"]) or {}
        i = "case:" + cid
        if i not in cat:
            cat[i] = {"k": "test", "n": _case_name(t.get("name"), cid), "cid": cid, "key": i, "file": t.get("file"), "line": t.get("line"), "corpus": t.get("corpus"),
                      "state": t.get("state"), "calls": [[c.get("method"), (c.get("endpoint") or "").replace("endpoint:", "") or f"{c.get('method')} {c.get('path')}", c.get("role"), c.get("line"), c.get("helper"),
                                                          c.get("sends") or [], (c.get("asserts") or {}).get("status") or [], (c.get("asserts") or {}).get("attrs") or [],
                                                          1 if any(not str(z.get("conf") or "").startswith("ambiguous") for z in c.get("refs") or []) else 0]   # [8] D-091: it proves an ending
                                                         for c in tc.get("calls") or []],
                      "raises": [[z.get("call"), z.get("raises"), z.get("line")] for z in tc.get("raises") or []], "ents": jy.get(cid, [])}
        here = [k for k, c in enumerate(tc.get("calls") or []) if c.get("endpoint") == "endpoint:" + ep]
        roles = {(tc["calls"][k].get("role")) for k in here}
        role = "helper" if t.get("role") == "helper-arranged" else "act" if "act" in roles else "check" if "arrange-checked" in roles else "arrange" if "arrange" in roles else \
            {"service-raises": "service", "helper-arranged": "helper"}.get(t.get("role"), "arrange" if t.get("role") == "arranged" else "act")
        ends, how = [], []
        for k in here:
            c = tc["calls"][k]
            if c.get("refs"):
                for z in c["refs"]:
                    if z.get("exit") not in [e0["id"] for e0 in exits]:
                        die(f"{ep} · {cid}: proves {z.get('exit')}, which this endpoint does not have")
                    ends.append(z["exit"]); how.append("refs" if not str(z.get("conf") or "").startswith("ambiguous") else "amb")
            else:
                for s in (c.get("asserts") or {}).get("status") or []:
                    for xid in status_ends.get(s, []):
                        ends.append(xid); how.append("status")
        if not here:
            for z in t.get("proves") or []:
                ends.append(z.get("exit")); how.append("service")
        seen_e, E2 = set(), []
        for x0, h0 in zip(ends, how):
            if x0 not in seen_e:
                seen_e.add(x0); E2.append([x0, h0])
        paths = [pid for x0, _h in E2 for pid in by_exit.get(x0, [])]
        tally["testLinks"] += len(E2)
        ex["test"].append([i, role, {"here": here, "ends": E2, "paths": paths}])     # N3-14: only a `refs` ending is proved; `amb` fits, `status` is checked
    for pid, p in PATHS.items():
        for tt in next((pp.get("tests") or [] for pp in F.get("paths") or [] if pp["id"] == pid), []):
            if tt.get("case") and tt["case"] not in TC:
                die(f"{ep} · path {pid}: its test {tt['case']} is not a case of the feed")

    # GATES AND DECISIONS — the feed's own groups, each with the function it runs in and its effect (EX-4 · L-09 · L-10 · L-11)
    walk_by_name = {f.get("name"): "fn:" + f["id"].replace("#", "::") for _lv, f, _v in walk if f.get("id")}
    hk = "fn:" + handler if handler else None
    xs, gat = {x["id"]: x for x in exits}, {}
    def gate(i, role, cond, fnk, at, eff, after=None, extra=None, raw=None, key=None):
        # a gate is one place in THIS endpoint's way (a field rule's page key is shared by endpoints whose rules differ): scoped here,
        # its page key kept for the light
        key, i = (key or (i if not i.startswith(ep + "|") else None)), (i if i.startswith(ep + "|") else ep + "|" + i)
        if i in cat:
            die(f"{ep} · {i}: two gates of this endpoint share one place")
        cat[i] = {"k": "gate", "n": cond, "key": key, **({"raw": raw} if raw and raw != cond else {})}
        gat[i] = _short(at) if at else None
        x = xs.get(eff) if eff else None
        ex["gate"].append([i, role, {"fn": I(fnk), "at": I(at), "eff": eff, "st": x.get("status") if x else None,
                                     "after": [I(a) for a in after or []], "tests": [c[0] for c in tests_of(x)] if x else [], **(extra or {})}])
    EW = W["ex"]
    def lvl(host):                                        # S4-02: where it decides — BY MOMENT's R2 (_ae_els.Ctx.level), read the same way
        return "login" if host in auth_fns else "dep" if host in deps else "own" if host == handler else "call"
    fnk_of = lambda q: ("fn:" + q) if q and "::" in q else (walk_by_name.get(q) or walk_by_name.get(str(q).split(".")[-1]) if q else None)
    # a gate's face is a plain line (CR-28); its condition as the code writes it rides `raw`, said last in its hover
    for l in (F.get("rate") or {}).get("limits") or []:
        nm = str(l.get("limiter") or l.get("class") or "?").lstrip("_")
        args = {a.get("param"): a.get("value") for a in l.get("args") or []}
        gate("limiter:" + nm, "limiter", fill(EW["face"]["lim"], name=nm, n=args.get("limit"), w=args.get("window_seconds")) if args.get("limit") is not None else nm,
             None, l.get("at"), l.get("exit"), raw=(xs.get(l.get("exit")) or {}).get("pred"),
             extra={"lim": [args.get("limit"), args.get("window_seconds"), l.get("key")], "place": l.get("via"), "gk": "l", "gl": "app", "gv": "refuses"})
    for s0 in au.get("schemes") or []:
        gate(ep + "|gate:" + str(s0.get("exit")), "scheme", fill(EW["face"]["scheme"], header=s0.get("header") or s0.get("carrier")), None, s0.get("at"), s0.get("exit"),
             raw=f"{s0.get('scheme')} {s0.get('name')}", extra={"place": f"{s0.get('scheme')} {s0.get('name')}", "gk": "a", "gl": "login", "gv": "refuses"})
    # N3-07: the login check IS its dependency function (as BY MOMENT draws it), its refusals all the endings of that phase — never
    # one gate per ending, which named the catch inside it a second time
    dep_x = [x["id"] for x in exits if x.get("phase") == "dependency" and x["kind"] == "refusal"]
    for g0 in au.get("gates") or []:
        if not dep_x:
            continue
        gate(ep + "|login:" + str(g0.get("fn")), "login", g0.get("name") or _fname(g0.get("fn")), "fn:" + str(g0.get("fn")), (FJF.get(g0.get("fn")) or {}).get("at"),
             dep_x[0], key="fn:" + str(g0.get("fn")), extra={"effs": dep_x, "gk": "a", "gl": "login", "gv": "refuses"})
    for x in exits if not au.get("gates") else []:
        if x.get("phase") == "dependency":
            gate(ep + "|gate:" + x["id"], "login", str(x.get("via") or x.get("detail")), None, x.get("at"), x["id"], extra={"gk": "a", "gl": "dep", "gv": "refuses"})
    for x in exits:
        for c in x.get("cases") or [] if x["kind"] == "validation" else []:
            loc = str(c.get("loc") or "")
            fld = EW["face"]["theBody"] if loc == "body" else loc.split(".")[-1]
            val = str(c.get("rule") or "").partition("=")[2]
            gate("rule:" + c["id"], "rule", fill(EW["rule"].get(c.get("type")) or EW["rule"]["_other"], name=fld, v=val), None, c.get("at"), x["id"],
                 raw=f"{loc} · {c.get('type')}" + (f" {c['rule']}" if c.get("rule") else ""),
                 extra={"place": str(c.get("schema") or "").replace("schema:", "") or None, "rt": c.get("type")})
    for g in F.get("preconditions") or []:
        m = re.match(r"^call (.+?) @", str(g.get("via") or ""))
        host = host_of(g)
        gate("guard:" + g["id"], "own" if not g.get("depth") else "down", str(g.get("pred")), hk if not g.get("depth") else fnk_of(host), g.get("at"), g.get("exit"), g.get("after"),
             extra={"st0": g.get("status"), "call": m.group(1) if m else None, "gk": "g", "gl": lvl(host), "gv": "refuses"})
    for b in F.get("branches") or []:
        gate("fork:" + b["id"], "branch", str(b.get("pred") or (W["mo"]["x"]["c1"]["fall"] if b.get("token") == "fall-through" else b.get("token"))),
             "fn:" + b["fn"] if b.get("fn") else None, b.get("site"), None, b.get("after"),
             extra={"ret": b.get("return"), "call": b.get("call"), "gk": "b", "gl": lvl(b.get("fn")), "gv": "routes"})
    for c in (F.get("failure") or {}).get("catches") or []:
        ty = " · ".join(c.get("types") or [])
        eff = next((x["id"] for x in exits if str(x.get("via") or "") in ["except " + t for t in c.get("types") or []]), None)
        gate("catch:" + c["id"], "catch", fill(EW["face"]["catches"], v=ty), "fn:" + c["fn"] if c.get("fn") else None, c.get("at"), eff, raw="except " + ty,
             extra={"answers": c.get("answers") or [], "outcome": c.get("outcome"), "gk": "c", "gl": lvl(c.get("fn")), "types": ty,
                    "gv": {"translate": "translates", "pass-through": "passes", "swallow": "swallows"}.get(str(c.get("outcome") or ""), "translates")})
    for w in F.get("switches") or []:
        words = w.get("port") or w.get("expr") or w.get("kind")
        face = EW["face"]["sw"].get(w.get("kind"))
        gate("switch:" + w["id"], "switch", fill(face, v=words) if face else f"{w.get('kind')} · {words}", "fn:" + w["fn"] if w.get("fn") else None, w.get("anchor"), None,
             raw=str(words), extra={"impl": [b.get("impl") for b in w.get("branches") or [] if b.get("impl")], "refs": w.get("refs") or [], "place": w.get("via"),
                                    "gk": "w", "gl": {"middleware": "app", "dependency": "dep", "handler": "own"}.get(w.get("scope"), "call")})
    got = collections.Counter(e[1] for e in ex["gate"])
    want = {"own": sum(1 for g in F.get("preconditions") or [] if not g.get("depth")), "down": sum(1 for g in F.get("preconditions") or [] if g.get("depth")),
            "branch": len(F.get("branches") or []), "catch": len((F.get("failure") or {}).get("catches") or []), "switch": len(F.get("switches") or []),
            "limiter": len((F.get("rate") or {}).get("limits") or []), "scheme": len(au.get("schemes") or [])}
    bad = {k: (got[k], n) for k, n in want.items() if got[k] != n}
    if bad:
        die(f"{ep}: the gate roles and the feed's own groups differ {bad}")

    # CLIENT HOOKS — the pieces that fetch this endpoint, and what the screen does on each ending (L-15 · L-16)
    FE = (F.get("frontend") or {}) if not arm_off(fj, ("frontend", None)) else {}
    hook = FE.get("hook") or {} if FE.get("present") else {}
    rd = (FE.get("readers") or [{}])[0] if FE.get("present") and FE.get("readers") else {}
    for fb in L["widening"].get("fetched_by") or []:
        i = fb.get("id")
        if not i:
            continue
        hc = hook if hook.get("piece") == i else {}
        cl = (hc.get("calls") or [{}])[0]
        if i not in cat:
            cat[i] = {"k": "hook", "n": fb.get("name"), "key": i, "file": i.split("#")[0].replace("fe:", ""), "at": hc.get("at"), "hrole": fb.get("hrole"),
                      "fkind": cl.get("kind") or fb.get("kind")}
        ex["hook"].append([i, fb.get("hrole") or "none", {
            "send": [[f0.get("method"), f0.get("path"), _fname(f0.get("wrapper") or f0.get("callee") or "")] for f0 in cl.get("fetch") or []],
            "refresh": [[" ".join(map(str, v.get("key") or [])), v.get("when")] for v in cl.get("invalidates") or []],
            "screens": [s.get("name") for s in L["widening"].get("screens") or []],
            "react": [[z.get("exit"), z.get("status"), 1 if z.get("own_branch") else 0, X["dw"].get(z.get("site")) if z.get("site") and z.get("site") != "rest" else None,
                       _short(z.get("at")) if z.get("at") else None] for z in rd.get("routes") or []] if hc else [],
            "reader": rd.get("fn") if hc else None, "epk": "endpoint:" + ep}])            # S4-31: the endpoint it sends to, a station element

    # IN-FLIGHT VALUES — what is alive while the request runs (L-17)
    for x in inf_rows:
        i = _inf_key(x)
        if i not in cat:
            fr = x.get("from") or {}
            cat[i] = {"k": "inf", "n": x.get("name"), "key": i, "ik": x.get("kind"), "dies": x.get("dies") or "unknown", "set": _short(x.get("set_at")),
                      "by": str(x.get("set_by") or x.get("dependency") or "").split("::")[-1].replace("middleware:", ""), "in": x.get("set_in"),
                      "from": [fr.get("kind"), fr.get("name")] if fr else None, "carrier": x.get("carrier"), "expr": x.get("expr"),
                      # S4-31: who sets it, as station elements to try in order — the function, then the middleware whose method it is
                      "byk": [q for q in (("fn:" + str(x["set_by"])) if "::" in str(x.get("set_by") or "") else None,
                                          x["set_by"] if str(x.get("set_by") or "").startswith("middleware:") else None,
                                          ("middleware:" + str(x["set_by"]).split("::")[-1].split(".")[0]) if "::" in str(x.get("set_by") or "")
                                          and ("middleware:" + str(x["set_by"]).split("::")[-1].split(".")[0]) in (fj.get("middleware") or {}) else None) if q]}
        # where it is read is THIS endpoint's (a dependency value is read by each handler at its own lines)
        ex["inf"].append([i, x.get("kind") or "unknown", {"reads": [[I(_short(ra.get("at"))), I(_fname(ra.get("fn") or "")), ra.get("in")] for ra in x.get("read_at") or []]}])
    # CR-16 · F26: no two items of one column wear the same face — an ending carries its limit, a twin name its place; the build
    # stops on a pair still alike
    def face(k, e):
        c = cat[e[0]]
        if k == "end":
            return (c["st"], (c.get("lim") or [None])[0], c.get("say") or c.get("code") or c["kd"])
        return (c.get("cid") or c.get("n"),)
    place = {"end": lambda e: _short(cat[e[0]].get("at")) or cat[e[0]].get("ph"), "gate": lambda e: gat.get(e[0]),
             "fn": lambda e: _short(cat[e[0]].get("file")), "inf": lambda e: cat[e[0]].get("set") or cat[e[0]].get("by"),
             "hook": lambda e: _short(cat[e[0]].get("file"))}
    for k in KINDS:
        seen = collections.Counter(face(k, e) for e in ex[k])
        for e in ex[k]:
            if seen[face(k, e)] > 1:
                if k not in place or not place[k](e):
                    die(f"{ep}: two {k} items wear the face {face(k, e)} and nothing tells them apart")
                e[2]["tw"] = place[k](e)
                tally["twins"] += 1
        left = [f for f, n in collections.Counter(face(k, e) + (e[2].get("tw"),) for e in ex[k]).items() if n > 1]
        if left:
            die(f"{ep}: {k} items still alike after their places are added: {left[:2]}")
    ex["paths"] = PATHS
    for k in KINDS:
        tally["n:" + k] += len(ex[k])
    return ex


# ── 3 · THE BENCH, for the page ─────────────────────────────────────────────────────────────────────────────────────────────
FLOOR = 12   # the page's legibility floor: every text part of a block at or above it, but the table's (his DATA line, D-027)
GLYPH_PARTS = {"icon", "commit"}   # parts that draw no text — a glyph, a dot — and may go below the floor
MINE = {   # my picks (dashed on the page): each kind's parts in three lines of a left and a right side, their sizes (S4-24: text at 12)
    "end": {"parts": ["icon", "status", "name", "stage", "count", "via", "how"],   # D-097: "how" — the code that makes it, not drawn by default
            "rows": [{"l": ["icon", "status"], "r": ["stage"]}, {"l": ["name"], "r": ["count"]}, {"l": ["via"], "r": []}],
            "size": {"icon": 13, "status": 12, "name": 13, "stage": 12, "count": 12, "via": 12, "how": 12}, "iconCol": "kind"},
    "test": {"parts": ["icon", "cid", "state", "proves", "role", "name", "file", "sends", "asserts"],
             "rows": [{"l": ["icon", "cid", "proves"], "r": ["state"]}, {"l": ["name"], "r": []}, {"l": ["role", "sends"], "r": ["asserts"]}],
             "size": {"icon": 13, "cid": 13, "state": 12, "proves": 12, "role": 12, "name": 12, "file": 12, "sends": 12, "asserts": 12}, "iconCol": "kind"},
    "gate": {"parts": ["icon", "role", "cond", "fn", "level", "effect", "via", "count"],
             "rows": [{"l": ["icon", "cond"], "r": ["role"]}, {"l": ["fn", "level"], "r": ["effect"]}, {"l": ["via"], "r": ["count"]}],
             "size": {"icon": 13, "role": 12, "cond": 13, "fn": 12, "level": 12, "effect": 12, "via": 12, "count": 12}, "iconCol": "kind"},
    "hook": {"parts": ["icon", "role", "name", "fkind", "sends", "file", "count"],
             "rows": [{"l": ["icon", "name"], "r": ["role"]}, {"l": ["sends"], "r": ["count"]}, {"l": ["file"], "r": ["fkind"]}],
             "size": {"icon": 13, "role": 12, "name": 13, "fkind": 12, "sends": 12, "file": 12, "count": 12}, "iconCol": "kind"},
    "inf": {"parts": ["icon", "life", "name", "ikind", "set", "count"],
            "rows": [{"l": ["icon", "name"], "r": ["life"]}, {"l": ["ikind"], "r": ["count"]}, {"l": ["set"], "r": []}],
            "size": {"icon": 13, "life": 12, "name": 13, "ikind": 12, "set": 12, "count": 12}, "iconCol": "kind"},
}
MODES = {"ent": ["word", "icon", "both"], "count": ["words", "badge"], "model": ["word", "icon", "both"], "via": ["word", "icon", "both"],
         "file": ["word", "icon", "both"]}
# D-093 — a part's FORM: what it shows of its data (his: "the labeling, the content, just the number, just the icon"). Each part has ONE type, a type
# the forms its data can take; a part with no type (the glyph, the name, the case, the condition, the commit dot) is shown or not, nothing else. The
# form drawn by default is the look's own mode where it sets one, else the type's first — what the block drew before this ruling.
#   chip  — a classifying word: in its coloured box · the word in its colour · a coloured dot (the word on its hover)
#   count — a count: the number and its unit boxed · the number boxed · the number and its unit · the number alone
#   gtext — a value with a glyph: both · the value · the glyph · the part's name and the value
#   text  — a value: the value · the part's name and the value
FORM_TYPES = {"chip": ["chip", "word", "dot"], "count": ["badge", "number", "words", "bare"], "gtext": ["both", "word", "icon", "label"], "text": ["word", "label"]}
PART_TYPE = {
    "end": {"status": "chip", "stage": "text", "count": "count", "via": "gtext", "how": "gtext"},
    "table": {"rw": "chip", "ent": "gtext", "count": "count", "model": "gtext"},
    "schema": {"dir": "chip", "ent": "gtext", "count": "count", "via": "gtext"},
    "fn": {"role": "chip", "file": "gtext", "count": "count", "via": "gtext"},
    "test": {"state": "chip", "proves": "chip", "role": "chip", "file": "gtext", "sends": "text", "asserts": "text"},
    "gate": {"role": "chip", "fn": "gtext", "level": "text", "effect": "chip", "via": "gtext", "count": "count"},
    "hook": {"role": "chip", "fkind": "text", "sends": "gtext", "file": "gtext", "count": "count"},
    "inf": {"life": "chip", "ikind": "text", "set": "gtext", "count": "count"},
}
# D-093 — what no control changes any more (his: "the size of the glyph will not change … mark size … the gap between marks … glyph color won't change. It
# would be its kind's color in every case"): the look's own values, kept by every saved look and every reset. The table's "model" colour IS its kind's colour.
FIXED_KEYS = ("sqSize", "sqGap", "iconCol")
CARD_LAYS, CARD_PICK = ("cols", "rows", "wide", "both"), "rows"   # D-095: how a kind's hover card lays out its sections; my pick is his ask, the name above
HERE_LOOKS, HERE_PICK, HERE_W = ("ring", "tint", "box", "double", "pale", "none"), "ring", 2   # D-096: how a strip marks the item's own place (an ending's way out,
# a test's acting call, a gate's own check); my pick is today's ring, so the default line stays as it was
HERE_KINDS = ("end", "test", "gate")                           # D-096: the kinds whose strips carry that mark (`exhere` in _ae-bench.js xStrip)


def bench(facts: list, rows: list, fj: dict, W: dict, X: dict, phase_stage: dict, write_ops: set, sweep=None) -> tuple:
    """(D.ex, the bench's CSS, its JS, the build line). Adds r["ex"] to every row. `sweep` is the page's words sweep: the words
    lifted from the lab reach the page through it too (S4-22)."""
    types = {c[1] for L in facts for t in L["data"]["tables"] for c in t["cols"]}
    types |= {f.get("annotation") or "" for s in (fj.get("schemas") or {}).values() for f in s.get("fields") or []}
    lk = lift(types)
    # S4-22: a number the lab types into a part's note is the god-function threshold the facts carry — made a {god} token (the build
    # stops when the lab's number and the facts' threshold part), then every lifted word is swept like the words file
    gods = {(L.get("context") or {}).get("risk", {}).get("god_lines") for L in facts}
    if len(gods) != 1 or not isinstance(next(iter(gods)), int):
        die(f"the facts do not agree on one god-function threshold: {sorted(map(str, gods))}")
    god = next(iter(gods))
    for k in lk["parts"]:
        for p in lk["parts"][k]:
            if re.search(r"\d", p.get("note") or ""):
                if not re.search(rf"\b{god}\b", p["note"]):
                    die(f"the lab's {k} part {p['key']!r} types a number that is not the god-function threshold ({god}): {p['note']!r}")
                p["note"] = re.sub(rf"\b{god}\b", "{god}", p["note"])
            # the file part's "last two folders" is the number of path parts a file is named by (SHORT_PARTS, the page's xShort too)
            if p["key"] == "file" and re.search(r"\btwo\b", p.get("note") or "") and SHORT_PARTS == 2:
                p["note"] = re.sub(r"\btwo\b", "{dirs}", p["note"])
    if sweep:
        sweep({"parts": lk["parts"], "icol": lk["icol"], "sq": [{q: x[q] for q in ("word", "plain")} for x in lk["sq"]]}, "ex.lifted")
    cat, tally, SL, SI = {}, collections.Counter(), [], {}
    def I(x):                                   # one table of the strings the paths, the gates and the functions repeat (page size)
        if x is None:
            return None
        x = str(x)
        if x not in SI:
            SI[x] = len(SL); SL.append(x)
        return SI[x]
    for L, r in zip(facts, rows):
        r["ex"] = per_endpoint(L, fj, r, X, phase_stage, write_ops, cat, lk, tally, I, W)
    EW = W["ex"]
    if list(EW["kinds"]) != list(KINDS):
        die(f"ex.kinds names {list(EW['kinds'])}, the bench draws {list(KINDS)} in his order")
    for k in ("table", "schema", "fn"):
        if [p["key"] for p in lk["parts"][k]] != [p for p in EW["parts"][k]]:
            die(f"ex.parts.{k} names {list(EW['parts'][k])}, the lab's registry {[p['key'] for p in lk['parts'][k]]}")
    for k, m in MINE.items():
        if list(EW["parts"][k]) != m["parts"]:
            die(f"ex.parts.{k} names {list(EW['parts'][k])}, the bench draws {m['parts']}")
    for k, R in (("gate", GATE_ROLES), ("test", TEST_ROLES), ("schema", SCH_ROLES)):
        if k not in KINDS:
            continue
        if list(EW["roles"][k]) != list(R):
            die(f"ex.roles.{k} names {list(EW['roles'][k])}, the bench reads {list(R)}")
    # CR-27 · S4-17: an in-flight value's kind is named by BY MOMENT's own words (enc.fam.ifk); the bench names only a kind it has none for
    named = {k: set(EW["roles"][k]) | (set(W["enc"]["fam"]["ifk"]["vals"]) if k == "inf" else set()) for k in KINDS if k != "end"}
    if set(EW["roles"]["inf"]) & set(W["enc"]["fam"]["ifk"]["vals"]):
        die(f"ex.roles.inf names a kind BY MOMENT already names (enc.fam.ifk): {sorted(set(EW['roles']['inf']) & set(W['enc']['fam']['ifk']['vals']))}")
    for k in [k for k in KINDS if k != "end"]:
        stray = {e[1] for r in rows for e in r["ex"][k]} - named[k]
        if stray:
            die(f"{k}: roles the words do not name {sorted(stray)}")
    if sorted(EW["icol"]) != sorted(["kind" if q == "model" else q for q in lk["icol"]]):
        die(f"ex.icol names {sorted(EW['icol'])}, the lab's glyph colours {sorted(lk['icol'])} (its model colour called kind)")
    for g, O in EW["opt"].items():
        if O.get("pick") not in O["opts"]:
            die(f"ex.opt.{g}: its default {O.get('pick')!r} is not one of its options")
        if "ruled" in O and not re.fullmatch(r"D-\d{3}", str(O["ruled"])):                  # his default names the ruling, like a rail's
            die(f"ex.opt.{g}: `ruled` must name the ruling (D-nnn), not {O['ruled']!r}")
    WD = EW.get("width") or die("ex.width: the columns' width control has no words (L-36)")
    if list(WD["opts"]) != WIDTHS or WD.get("pick") not in WD["opts"] or "ruled" in WD:       # the default and his three narrower widths in his order; the default is my pick (no ruling names it)
        die(f"ex.width: the options must be {WIDTHS}, the default one of them and no ruling: {list(WD['opts'])} · {WD.get('pick')!r}")
    for key in ("scopeHere", "scopeAll", "width", "role", "roleAll", "prev", "next", "copy", "reset"):
        if not all(isinstance((EW.get("act") or {}).get(key, {}).get(q), str) for q in ("verb", "obj")):
            die(f"ex.act.{key}: a control's hover is a verb and its object (L-36)")
    if not re.fullmatch(r"D-\d{3}", str(EW["look"]["table"].get("ruled", ""))):
        die("ex.look.table must name the ruling that made the DATA line his (D-nnn)")
    # the looks: the lab's three lifted, my five from MINE, all on one shape
    base = {k: lk["look"]["table"][k] for k in ("railSide", "railStyle", "railW", "cntBox", "cntA", "rwBox", "rwA", "sqSize", "sqGap", "sqShape", "sqEnc", "sqPal", "sqOpt", "sqBase", "sqOptA",
                                                  "sqUqMark", "sqUqAt", "sqUqFlip", "sqUqLen", "sqUqW", "sqUqTip")}
    looks = {}
    for k in KINDS:
        if k in LAB_KINDS:
            L0 = lk["look"][k]
            looks[k] = {**base, **{x: L0[x] for x in L0 if x not in ("show",)}, "form": L0.get("form", "block"),
                        "mode": {p: L0[p] for p in MODES if p in L0}, "on": {p: L0.get(p, 1) for p in ("icon", "rw", "name", "dir", "role") if p in L0}}
            if k != "table":
                # S4-24: the lab's own sizes are no ruling — a text part below the floor is raised to it (the table keeps his line)
                looks[k]["size"] = {p: (max(v, FLOOR) if p not in GLYPH_PARTS else v) for p, v in looks[k]["size"].items()}
                # S4-25: "model" is the table's word for its own colour; every other kind calls it its kind's colour
                looks[k]["iconCol"] = "kind" if looks[k].get("iconCol") == "model" else looks[k].get("iconCol")
        else:
            M = MINE[k]
            looks[k] = {**base, "form": "block", "rows": M["rows"], "size": M["size"], "iconCol": M["iconCol"], "mode": {"count": "badge", "via": "both", "file": "word"},
                        "on": {}, "off": [p for p in M["parts"] if p not in [q for r0 in M["rows"] for q in r0["l"] + r0["r"]]]}
    # D-091 item 4: the fact option — off for every kind, three variants, my pick the one named here; the words say each kind's fact once (what a yes and a no are)
    CW_ = EW.get("cardLay") or die("ex.cardLay: the hover card's layout has no words (D-095)")
    if list(CW_.get("opts") or {}) != list(CARD_LAYS) or CW_.get("pick") != CARD_PICK:
        die(f"ex.cardLay must name the layouts {list(CARD_LAYS)} and my pick {CARD_PICK!r}")
    HW_ = EW.get("here") or die("ex.here: the item's own mark has no words (D-096)")
    if list(HW_.get("opts") or {}) != list(HERE_LOOKS) or HW_.get("pick") != HERE_PICK or sorted(HW_.get("kinds") or {}) != sorted(HERE_KINDS):
        die(f"ex.here must name the looks {list(HERE_LOOKS)}, my pick {HERE_PICK!r} and the kinds {list(HERE_KINDS)}")
    YW = EW.get("yn") or die("ex.yn: the extra marks' option has no words (D-091)")
    if list(YW["opts"]) != list(YN_VARIANTS) or YW.get("pick") != YN_PICK or list(YW["kinds"]) != list(YN):
        die(f"ex.yn must name the variants {list(YN_VARIANTS)}, my pick {YN_PICK!r} and the kinds {list(YN)}: {list(YW['opts'])} · {YW.get('pick')!r} · {list(YW['kinds'])}")
    for k, K in YW["kinds"].items():
        if sorted(set(("name", "noName", "yes", "no", "plain")) - set(K)):
            die(f"ex.yn.kinds.{k} lacks the words {sorted(set(('name', 'noName', 'yes', 'no', 'plain')) - set(K))}")
    for k in YN:
        looks[k]["fact"] = "off"
    # D-093: the forms each part can take (its default first in the look's mode), the fixed values, and each part's hover — its own card where its region
    # gives one (head · items, and the strip of marks), the block's card for every other part: the default is the bench as it was (his: "as we have configured today")
    forms, fixed = {}, {}
    for k in KINDS:
        drawn = set(MINE[k]["parts"]) if k in MINE else {p["key"] for p in lk["parts"][k]}
        stray = sorted(set(PART_TYPE[k]) - drawn)
        if stray:
            die(f"PART_TYPE.{k} names parts the block does not draw: {stray} (D-093)")
        forms[k] = {}
        for p, t in PART_TYPE[k].items():
            opts = FORM_TYPES[t]
            cur = looks[k]["mode"].get(p)
            if cur is not None and cur not in opts:
                die(f"the {k} look shows {p} as {cur!r}, which is none of its forms {opts} (D-093)")
            forms[k][p] = {"type": t, "opts": opts, "def": cur or opts[0]}
        looks[k]["iconCol"] = "model" if k == "table" else "kind"
        fixed[k] = {"icon": looks[k]["size"]["icon"], **{x: looks[k][x] for x in FIXED_KEYS}}
        looks[k]["hov"] = {p: 1 if r in ("head", "items") else 0 for p, r in REGIONS[k].items()}
        looks[k]["card"] = CARD_PICK
        looks[k]["here"], looks[k]["hereW"] = HERE_PICK, HERE_W
    FW = EW.get("form") or die("ex.form: the forms have no words (D-093)")
    lost = sorted({f for o in FORM_TYPES.values() for f in o} - set(FW))
    if lost or any(not (FW[f].get("name") and FW[f].get("plain")) for f in FW if not f.startswith("_")):
        die(f"ex.form must name and say every form {sorted({f for o in FORM_TYPES.values() for f in o})}: missing {lost} (D-093)")
    # D-089/D-090: every kind names each part it draws (and the strip) in one of the three regions; the card words name every status an ending gives
    if set(REGIONS) != set(KINDS):
        die(f"REGIONS names {sorted(REGIONS)}, the bench draws {sorted(KINDS)}: every kind has its hover regions (D-090)")
    for k, R in REGIONS.items():
        drawn = (set(MINE[k]["parts"]) if k in MINE else {p["key"] for p in lk["parts"][k]}) | {"marks"}
        stray, left = sorted(set(R) - drawn), sorted(drawn - set(R))
        if stray or left or not set(R.values()) <= set(REGION_IDS):
            die(f"REGIONS.{k} names parts the block does not draw {stray}, leaves out parts it does {left}, or names a region that is none of {REGION_IDS}: {sorted(set(R.values()) - set(REGION_IDS))}")
    RW = EW.get("region") or die("ex.region: the region cards have no words (D-089)")
    HW, IW = RW.get("head") or die("ex.region.head: the head cards have no words (D-090)"), RW.get("item") or die("ex.region.item: the item cards have no words (D-090)")
    for k, names in (("schema", EW["roles"]["schema"]), ("fn", EW["roles"]["fn"]), ("gate", EW["roles"]["gate"]), ("hook", EW["roles"]["hook"])):
        if sorted(set(names) - set(HW.get(k) or {})):
            die(f"ex.region.head.{k} says nothing of the roles {sorted(set(names) - set(HW.get(k) or {}))}: a head card says what its class means (D-090)")
    for k, keys in (("schema", ("c422",)), ("fn", ("calls", "refuses")), ("test", ("pass", "fail", "proves", "fits", "checks")), ("gate", ("gives",)), ("hook", ("sends",)), ("inf", ("set",))):
        if sorted(set(keys) - set(HW.get(k) or {})):
            die(f"ex.region.head.{k} lacks the words {sorted(set(keys) - set(HW.get(k) or {}))} (D-090)")
    if sorted({"field", "more", "fk", "uq", "uqYes", "uqNo", "uqWith", "after", "self", "own", "readMw", "readFn", "via"} - set(IW)):
        die(f"ex.region.item lacks the words {sorted({'field', 'more', 'fk', 'uq', 'uqYes', 'uqNo', 'uqWith', 'after', 'self', 'own', 'readMw', 'readFn', 'via'} - set(IW))} (D-090 · D-091)")
    CMK = W["mo"]["card"]["mark"]                                                                    # D-091: every count a field mark or a fact mark can make says its noun
    need_mk = ["field-opt", "field-uq", "field-opt-uq", "op-w-y", "op-w-n", "op-rw-y", "op-rw-n", "call-act-y", "call-act-n", "way-branch-y", "way-branch-n"]
    if sorted(set(need_mk) - set(CMK)):
        die(f"mo.card.mark lacks the words {sorted(set(need_mk) - set(CMK))} (D-091: a mark that counts says what it counts)")
    gdc = W["enc"]["fam"]["gdc"]["vals"]
    lost = sorted({str(c["st"]) for c in cat.values() if c["k"] == "end"} - set(RW["status"]))
    if lost:
        die(f"ex.region.status names no status {lost} that an ending of the feed gives — a status never reads as nothing (D-089)")
    nopl = sorted(s for s, v in RW["status"].items() if not v.get("name") or not (v.get("plain") or (gdc.get(s) or {}).get("plain")))
    if nopl:
        die(f"ex.region.status {nopl}: each status needs its HTTP name and a plain line, its own or the page's refusal table's (enc.fam.gdc)")
    marks = sorted({"way-" + ("pass" if q[2] == 0 else "stop") if q[0] == "gate" else "way-" + q[0] for r in rows for P in r["ex"]["paths"].values() for q in P["ch"] if q[0] != "step"})
    if sorted(set(RW["way"]) - set(marks)) or sorted(set(marks) - set(RW["way"])):
        die(f"ex.region.way names {sorted(RW['way'])}, the strip of marks draws {marks}")
    icons = {p["ico"] for k in LAB_KINDS for p in lk["parts"][k]} | {x["sym"] for x in lk["sq"]} | set(EW["icons"].values())
    D = {"kinds": list(KINDS), "look": looks, "parts": lk["parts"], "icol": lk["icol"], "sq": lk["sq"], "col": lk["col"], "his": lk["his"],
         "cat": dict(sorted(cat.items())), "modes": MODES, "forms": forms, "fixed": fixed, "cardLays": list(CARD_LAYS), "heres": list(HERE_LOOKS), "hereKinds": list(HERE_KINDS), "regions": REGIONS, "yn": {"kinds": list(YN)}, "str": SL, "god": god, "floor": FLOOR, "dirs": SHORT_PARTS,
         "absent": {k: arm_off(fj, a) for k, a in KIND_ARM.items() if k in KINDS and arm_off(fj, a)}}
    bench_css = BENCH_CSS.read_text(encoding="utf-8")
    if bench_css.count("__LAB_MONO__") != 1:
        die("_ae-bench.css must give the bench's --font-mono through the one __LAB_MONO__ token (the lab's stack)")
    css = _css() + "\n" + bench_css.replace("__LAB_MONO__", _lab_mono())
    for need in ("--uq-len", "--sq-opt-a", "uqm-corners.uqc-both", "uqc-flip"):          # D-091: the lab's unique corners and its opacity bar must have come over with the block rules
        if need not in css:
            die(f"the bench's stylesheet lost the lab's {need!r} rule (the field marks' corners and optional stop)")
    js = BENCH_JS.read_text(encoding="utf-8")
    line = ("L-23 · examples · " + " · ".join(f"{k} {tally['n:' + k]}" for k in KINDS) + f" (on {len(rows)} endpoints, {len(cat)} elements feed-wide)"
            + f" · endings the code skips here {tally['skipped']} · test links {tally['testLinks']} · tables whose column names the lab and the model spell differently {tally['tblMismatch']}"
            + (" (" + ", ".join(sorted(k[4:] for k in tally if k.startswith("tbl:"))) + ")" if tally["tblMismatch"] else "")
            + f" · checks inside calls placed on the ways that pass them {tally['inCall']} · items told apart by their place {tally['twins']}"
            + f" · his DATA line: the table boots on it")
    return D, css, js, line, icons
