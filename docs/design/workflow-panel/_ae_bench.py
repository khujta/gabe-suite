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

HERE = UNI.HERE
LAB_HTML, LAB_PANELS, LAB_CSS = HERE / "endpoint-lab.html", HERE / "_lab-ep-panels.js", HERE / "_lab-ep.css"
PROBE_EPLAB = HERE / "probe-eplab.mjs"
BENCH_JS, BENCH_CSS = HERE / "_ae-bench.js", HERE / "_ae-bench.css"
KINDS = ("end", "table", "schema", "fn", "test")          # his order (L-23), the columns left to right
LAB_KINDS = {"table": "DATACFG", "schema": "SCHCFG", "fn": "FNCFG"}
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
CSS_MUST = (".blk", ".bkhd", ".sqs", ".sq", ".bkln", ".bkcol.r", ".sq.e-symbol svg", '#panel[class*="rail-"] .blk', "#panel.rail-left .blk",
            "#panel .bkhd .bkrw .jdrw", "#panel.rwbox-pill .bkhd .bkrw .jdrw", "#panel.cntbox-pill .bkhd .bkn.badge", ".form-block .bkhd")


def _css() -> str:
    """The lab's block rules, scoped: `#panel` (the lab's look carrier) becomes a column's `.exw`, every other rule sits under #sec-ex."""
    out, seen = [], set()
    for sel, body in UNI._css_rules(LAB_CSS.read_text(encoding="utf-8")):
        parts = [s.strip() for s in sel.split(",")]
        if not any(BLOCK_CLASSES.search(s) for s in parts) or any(LAB_REGIONS.search(s.replace("#port .rctab", "")) for s in parts):
            continue
        seen.update(parts)
        scoped = []
        for s in parts:
            s = s.replace("#port .rctab", "#sec-ex .exw .nothing")
            scoped.append(s.replace("#panel", "#sec-ex .exw") if "#panel" in s else ("#sec-ex .exw" + s) if s.startswith(".form-block") else ("#sec-ex .exw " + s))
        out.append(", ".join(scoped) + "{ " + " ".join(body.split()) + " }")
    lost = [s for s in CSS_MUST if s not in seen]
    if lost:
        die(f"the lab's stylesheet no longer has the block rules {lost}")
    return "\n".join(out)


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
    sq = {k: D[k] for k in ("sqSize", "sqGap", "sqShape", "sqEnc", "sqPal", "sqOpt", "sqUqMark", "sqUqAt", "sqUqFlip", "sqUqLen", "sqUqW", "sqUqTip")}
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
def _short(at) -> str:
    """apps/api/services/cooking.py:140 → services/cooking.py:140 (the last two parts of the path)"""
    return "/".join(str(at).split("/")[-2:]) if at else ""


def _fname(q: str) -> str:
    return str(q).split("::")[-1].split("#")[-1]


def _case_name(n: str, cid: str) -> str:
    s = re.sub(r"^test_", "", str(n or ""))
    s = re.sub(r"_?" + re.escape(str(cid)) + r"$", "", s)
    return s.replace("_", " ").strip() or str(cid)


def _paths(F: dict, fj: dict, handler: str, inf: list, write_ops: set, I) -> dict:
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
        for c in p.get("chain") or []:
            t, lb, sub, at = c.get("kind"), c.get("label"), c.get("sub"), _short(c.get("at")) or None
            if t == "step":
                ch.append(["step", I(lb), None, None, I(at), None])
            elif t == "switch":
                ch.append(["switch", I(lb), None, I("switch:" + str(c.get("ref"))), I(at), I(sub)])
            elif t == "gate":
                ch.append(["gate", I(lb), 1 if c.get("hit") else 0, I(c.get("ref")), I(at), I(sub)])
            elif t in ("call", "collapsed"):
                ch.append(["call", I(lb), None, I("fn:" + c["fn"]) if c.get("fn") else None, I(at), None]); fn_(c.get("fn"))
            elif t == "branch":
                ch.append(["branch", I(lb), 1 if c.get("hit") else 0, I("fork:" + str(c.get("ref"))), I(at), None])
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


def per_endpoint(L: dict, fj: dict, r: dict, X: dict, phase_stage: dict, write_ops: set, cat: dict, lk: dict, tally: collections.Counter, I) -> dict:
    """r.ex: {kind: [[id, role here, what depends on this endpoint]], "paths": {…}} — and every element's feed-wide record into cat."""
    F, ep = L["forms"], r["id"]
    fep = fj["endpoints"]["endpoint:" + ep]
    handler = (F.get("endpoint") or {}).get("handler") or (L["functions"].get("handler") or {}).get("id", "").replace("#", "::")
    inf_rows = [x for x in ((F.get("inflight") or {}).get("rows") or [])] if (F.get("inflight") or {}).get("state") == "present" and not arm_off(fj, KIND_ARM["inf"]) else []
    PATHS = _paths(F, fj, handler, inf_rows, write_ops, I)
    exits = F.get("exits") or []
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
                  "fields": len(rs.get("fields") or []), "model": rs.get("model"), "tests": [q[0] for q in tests_of(x)], "paths": by_exit.get(x["id"], [])}
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
        ex["table"].append([i, t["rw"], {"ops": ops.get(t["table"], [])}])

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
    FJF = fj.get("functions") or {}
    # a raise is the function's (feed-wide); the ending it becomes is THIS endpoint's (the overlay)
    raises_of = lambda q: [[z.get("cls"), _short(z.get("at"))] for z in (FJF.get(q) or {}).get("raises") or []]
    raises_here = lambda q: [[t.get("status") for t in z.get("translated_by") or [] if t.get("endpoint") == "endpoint:" + ep] for z in (FJF.get(q) or {}).get("raises") or []]
    doesw = {d["fn"]: d.get("does") or [] for d in (L["functions"].get("does") or {}).get("rows") or []}
    h = L["functions"].get("handler") or {}
    walk = [(0, h, None)] + [(i + 1, f, f.get("via")) for i, lv in enumerate(L["functions"].get("walk") or []) for f in lv]
    for lv, f, via in walk:
        if not f.get("id"):
            continue
        q = f["id"].replace("#", "::")
        i = "fn:" + q
        if i not in cat:
            cat[i] = {"k": "fn", "n": f.get("name"), "key": i, "file": f.get("file"), "at": f.get("at"), "lines": f.get("lines"), "god": 1 if f.get("god") else 0,
                      "async": f.get("async"), "ret": f.get("returns"), "role": f.get("role"), "commits": 1 if f.get("commits") else 0,
                      "raises": raises_of(q), "doc": (f.get("insight") or {}).get("doc"), "ent": f.get("entity")}
        ex["fn"].append([i, f.get("role") or "none", {"lv": lv, "via": via, "h": 1 if lv == 0 else 0, "ops": [[o.get("rw"), o.get("table")] for o in f.get("ops") or []],
                                                     "calls": [I(g.get("name")) for l2, g, v2 in walk if v2 == f.get("name") and l2 == lv + 1], "does": [I(d) for d in doesw.get(q, [])], "rz": raises_here(q)}])

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
                                                          c.get("sends") or [], (c.get("asserts") or {}).get("status") or [], (c.get("asserts") or {}).get("attrs") or []]
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
        ex["test"].append([i, role, {"here": here, "ends": E2, "paths": paths}])
    for pid, p in PATHS.items():
        for tt in next((pp.get("tests") or [] for pp in F.get("paths") or [] if pp["id"] == pid), []):
            if tt.get("case") and tt["case"] not in TC:
                die(f"{ep} · path {pid}: its test {tt['case']} is not a case of the feed")

    ex["paths"] = PATHS
    for k in KINDS:
        tally["n:" + k] += len(ex[k])
    return ex


# ── 3 · THE BENCH, for the page ─────────────────────────────────────────────────────────────────────────────────────────────
MINE = {   # my picks (dashed on the page): each kind's parts in three lines of a left and a right side, their sizes
    "end": {"parts": ["icon", "status", "name", "stage", "count", "via"],
            "rows": [{"l": ["icon", "status"], "r": ["stage"]}, {"l": ["name"], "r": ["count"]}, {"l": ["via"], "r": []}],
            "size": {"icon": 13, "status": 11, "name": 13, "stage": 11, "count": 11, "via": 12}, "iconCol": "model"},
    "test": {"parts": ["icon", "cid", "state", "proves", "role", "name", "file", "sends", "asserts"],
             "rows": [{"l": ["icon", "cid", "proves"], "r": ["state"]}, {"l": ["name"], "r": []}, {"l": ["role", "sends"], "r": ["asserts"]}],
             "size": {"icon": 13, "cid": 13, "state": 11, "proves": 11, "role": 11, "name": 12, "file": 12, "sends": 11, "asserts": 12}, "iconCol": "model"},
}
MODES = {"ent": ["word", "icon", "both"], "count": ["words", "badge"], "model": ["word", "icon", "both"], "via": ["word", "icon", "both"],
         "file": ["word", "icon", "both"]}


def bench(facts: list, rows: list, fj: dict, W: dict, X: dict, phase_stage: dict, write_ops: set) -> tuple:
    """(D.ex, the bench's CSS, its JS, the build line). Adds r["ex"] to every row."""
    types = {c[1] for L in facts for t in L["data"]["tables"] for c in t["cols"]}
    types |= {f.get("annotation") or "" for s in (fj.get("schemas") or {}).values() for f in s.get("fields") or []}
    lk = lift(types)
    cat, tally, SL, SI = {}, collections.Counter(), [], {}
    def I(x):                                   # one table of the strings the paths, the gates and the functions repeat (page size)
        if x is None:
            return None
        x = str(x)
        if x not in SI:
            SI[x] = len(SL); SL.append(x)
        return SI[x]
    for L, r in zip(facts, rows):
        r["ex"] = per_endpoint(L, fj, r, X, phase_stage, write_ops, cat, lk, tally, I)
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
    for k in [k for k in KINDS if k != "end"]:
        stray = {e[1] for r in rows for e in r["ex"][k]} - set(EW["roles"][k])
        if stray:
            die(f"{k}: roles the words do not name {sorted(stray)}")
    for g, O in EW["opt"].items():
        if O.get("pick") not in O["opts"]:
            die(f"ex.opt.{g}: its default {O.get('pick')!r} is not one of its options")
    if not re.fullmatch(r"D-\d{3}", str(EW["look"]["table"].get("ruled", ""))):
        die("ex.look.table must name the ruling that made the DATA line his (D-nnn)")
    # the looks: the lab's three lifted, my five from MINE, all on one shape
    base = {k: lk["look"]["table"][k] for k in ("railSide", "railStyle", "railW", "cntBox", "cntA", "rwBox", "rwA", "sqSize", "sqGap", "sqShape", "sqEnc", "sqPal", "sqOpt",
                                                  "sqUqMark", "sqUqAt", "sqUqFlip", "sqUqLen", "sqUqW", "sqUqTip")}
    looks = {}
    for k in KINDS:
        if k in LAB_KINDS:
            L0 = lk["look"][k]
            looks[k] = {**base, **{x: L0[x] for x in L0 if x not in ("show",)}, "form": L0.get("form", "block"),
                        "mode": {p: L0[p] for p in MODES if p in L0}, "on": {p: L0.get(p, 1) for p in ("icon", "rw", "name", "dir", "role") if p in L0}}
        else:
            M = MINE[k]
            looks[k] = {**base, "form": "block", "rows": M["rows"], "size": M["size"], "iconCol": M["iconCol"], "mode": {"count": "badge", "via": "both", "file": "word"},
                        "on": {}, "off": [p for p in M["parts"] if p not in [q for r0 in M["rows"] for q in r0["l"] + r0["r"]]]}
    icons = {p["ico"] for k in LAB_KINDS for p in lk["parts"][k]} | {x["sym"] for x in lk["sq"]} | set(EW["icons"].values())
    D = {"kinds": list(KINDS), "look": looks, "parts": lk["parts"], "icol": lk["icol"], "sq": lk["sq"], "col": lk["col"], "his": lk["his"],
         "cat": dict(sorted(cat.items())), "modes": MODES, "str": SL,
         "absent": {k: arm_off(fj, a) for k, a in KIND_ARM.items() if k in KINDS and arm_off(fj, a)}}
    css = _css() + "\n" + BENCH_CSS.read_text(encoding="utf-8")
    js = BENCH_JS.read_text(encoding="utf-8")
    line = ("L-23 · examples · " + " · ".join(f"{k} {tally['n:' + k]}" for k in KINDS) + f" (on {len(rows)} endpoints, {len(cat)} elements feed-wide)"
            + f" · endings the code skips here {tally['skipped']} · test links {tally['testLinks']} · tables whose column names the lab and the model spell differently {tally['tblMismatch']}"
            + (" (" + ", ".join(sorted(k[4:] for k in tally if k.startswith("tbl:"))) + ")" if tally["tblMismatch"] else "")
            + f" · his DATA line: the table boots on it")
    return D, css, js, line, icons
