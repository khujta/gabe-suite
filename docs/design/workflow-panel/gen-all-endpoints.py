#!/usr/bin/env python3
"""gen-all-endpoints.py — EVERY endpoint of one app on one page, one small row each → all-endpoints.html.

The operator (2026-09-22): "all of one type of element on the same page at the same time … so I can spot patterns and
see things across all of one kind of element." The lab draws ONE endpoint; this page draws all of them, a row each,
under the card's eleven ruled blocks, so a column read top to bottom is the pattern.

    cd docs/design/workflow-panel
    python3 gen-all-endpoints.py --forms ~/.cache/gabe-map-baselines/lab-input/forms.json          # writes all-endpoints.html
    python3 gen-all-endpoints.py --forms <same> --check                                            # exit 1 when the page is stale
        --archmap <file>    default: archmap.json beside --forms
        --out <file>        write the page somewhere else (a probe fixture, a mutant)
        --only "M /path"    build a page for these endpoints alone (repeatable) — a fixture, never the committed page
        --cache <dir>       reuse the per-endpoint facts, keyed by the sha1 of every input (a speed-up; --check ignores it)

HOW A ROW IS MADE. The facts are the LAB'S facts: gen-endpoint-facts.py runs once per endpoint with --out into a
temporary directory (never over _lab-ep.js — its sha1 is taken before and after, and a change stops the build), and
each result is distilled here to a small row record. Nothing the lab derives is derived again; the distillation only
COUNTS what the facts already carry. One cross-check guards the single set restated (the write ops), below.
    Four readings come from the FEED beside the lab's facts, because the lab's record does not carry them: the JSON body an
endpoint reads (its body-parse endings + the validation ending's schemas, body_schema), the reply's fields (the contract
arm's success responses first, reply_fields), the writes a streamed path runs after the answer (after_writes), and the
schemas' own field lists. The lab's schema guess is never used for the body: it names whatever schema a GET touches.
    A count of shared THINGS (tables, functions, process values, guards, rules …) carries its members by identity (`u`), and
the build stops when a row's members and its drawn count differ — the group row counts a thing several endpoints share once.

WORDS. Every authored string lives in all-endpoints.words.json. A number typed in a sentence stops the build — it must be
a {token} the generator or the page fills (the sweep is gen-brainmap.js §6c's, ported, with its exemptions). The
agent's own strings never say "door" or "lock" (D-018); that is swept too.

No wallclock: the same inputs give the same bytes.
"""
from __future__ import annotations

import collections
import hashlib
import heapq
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(os.environ.get("ALLEP_WP") or Path(__file__).resolve().parent)   # ALLEP_WP: a mutant copy elsewhere still reads the real bench
REPO = HERE.parents[2]
FACTS = HERE / "gen-endpoint-facts.py"
LAB = HERE / "_lab-ep.js"
DC = REPO / "docs" / "design" / "design-context"
BM_WORDS = DC / "brainmap.words.json"
PRISMS = DC / "prisms-endpoint.json"                                          # the clustering options the ruled tree was built with
KIT_JS = DC / "kit-blocks.js"
EPSLUG_JS = HERE / "_ep-slug.js"                                               # the ONE slug rule (D-035), inlined so the page stays standalone
DEF_FORMS = Path("~/.cache/gabe-map-baselines/lab-input/forms.json")
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _ae_universe as UNI  # noqa: E402  (D-036 — the one-endpoint section: the universe card, the block marks, the gaps)


def die(msg: str) -> None:
    raise SystemExit("gen-all-endpoints: " + msg)


def arg(argv: list, name: str, default=None, many=False):
    out = []
    while name in argv:
        i = argv.index(name)
        if i + 1 >= len(argv):
            die(f"{name} needs a value")
        out.append(argv[i + 1]); del argv[i:i + 2]
    if many:
        return out
    return out[-1] if out else default


def sha(p: Path) -> str:
    return hashlib.sha1(p.read_bytes()).hexdigest()


def tilde(p: Path) -> str:
    s = str(p)
    home = str(Path.home())
    return "~" + s[len(home):] if s.startswith(home) else s


# ── 1 · the words, swept ──────────────────────────────────────────────────────────────────────────────────────────
# gen-brainmap.js §6c, ported: E1 a {token} · E2 an id that carries a number (D-021 · Q3 · M1 · loop 1) and an HTTP status
# (a LABEL) · E4 a number inside “curly quotes” only when the same line also carries a {token} · E5 "one" is English.
NUMWORD = re.compile(r"\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|dozen)\b", re.I)
QUOTED = re.compile(r"“[^”]*”")
TOKEN = re.compile(r"\{[a-z]\w*\}", re.I)
BANNED = re.compile(r"\b(door|doors|lock|locks)\b", re.I)                   # D-018 — the agent's own strings
SWEEP_SKIP = {"cmd", "fields"}          # a shell command, quoted as the machine needs it · code-map field ids (a column id may hold a number)


def scrub(s: str) -> str:
    t = QUOTED.sub(" ", s)
    t = TOKEN.sub(" ", t)
    t = re.sub(r"\bD-\d{3}\b", " ", t)
    t = re.sub(r"\bQ\d{1,2}\b", " ", t)
    t = re.sub(r"\bM\d\b", " ", t)
    t = re.sub(r"\bloop \d+\b", " ", t, flags=re.I)
    t = re.sub(r"\b[1-5]\d\d\b", " ", t)
    return t


def sweep(o, at: str = "") -> None:
    if isinstance(o, str):
        if BANNED.search(o):
            die(f"a word D-018 took out of every string the pages draw · {at}: “{o[:90]}”")
        quoted = QUOTED.findall(o)
        if any(re.search(r"\d", q) or NUMWORD.search(q) for q in quoted) and not TOKEN.search(o):
            die(f"a number inside a quote must be answered by a measured {{token}} in the same line · {at}: “{o[:90]}”")
        s = scrub(o)
        m = re.search(r"\d", s) or NUMWORD.search(s)
        if m:
            die(f"a typed number in an authored line — make it a {{token}} the generator fills · {at}: “{o[:90]}” (found “{m.group(0)}”)")
        return
    if isinstance(o, list):
        for i, v in enumerate(o):
            sweep(v, f"{at}[{i}]")
        return
    if isinstance(o, dict):
        for k, v in o.items():
            if k.startswith("_") or k in SWEEP_SKIP:
                continue
            sweep(v, f"{at}.{k}")


# ── 2 · the columns ───────────────────────────────────────────────────────────────────────────────────────────────
# A column is an attribute of the ruled inventory (its id is the sectionmap's), drawn with one renderer. Its BLOCK is not
# typed here: an attribute homed in a block sits under it, and a shared one (homed nowhere) sits in the shared group or
# under the first block that needs it — a rail option on the page. Its RATING is read from the same tree.
# `arm` = (arm, part) the value needs; an arm the feed lacks makes the cell read "absent", never 0. None = the map itself.
COLS = [
    # id           attr                                   kind     arm                     agg
    ("all",        "the-endings",                         "num",   None,                   "sum"),
    ("stage",      "the-stage-an-ending-leaves-from",     "spine", ("paths", "returns"),   None),
    ("tables",     "tables-touched",                      "num",   None,                   "union"),
    ("guards",     "own-guards",                          "num",   None,                   "union"),
    ("auth",       "auth-scheme-gate",                    "cat",   ("contract", None),     "count"),
    ("response",   "response-shape-per-ending",           "num",   None,                   None),
    ("e_success",  "kinds-of-ending",                     "slot",  ("paths", "returns"),   "sum"),
    ("e_refusal",  "kinds-of-ending",                     "slot",  None,                   "sum"),
    ("e_framework", "kinds-of-ending",                    "slot",  ("paths", "framework"), "sum"),
    ("e_validation", "kinds-of-ending",                   "slot",  None,                   "sum"),
    ("e_uncaught", "kinds-of-ending",                     "slot",  None,                   "sum"),
    ("acts",       "case-role-on-this-endpoint",          "num",   ("tests", None),        "sum"),
    ("asserted",   "what-the-case-asserts-on-this-condition", "num", ("tests", None),      "sum"),
    ("branches",   "deciding-branches",                   "num",   ("paths", "paths"),     "union"),
    ("catches",    "catches",                             "num",   ("effects", None),      "union"),
    ("rate",       "rate-tier",                           "cat",   ("contract", None),     "count"),
    ("written",    "operation-per-table",                 "num",   None,                   "union"),
    ("fate",       "fate-of-the-writes-per-ending",       "stack", ("effects", None),      "sum"),
    ("deciders",   "decision-point-functions",            "num",   ("kinds", "functions"), "union"),
    ("datafns",    "data-touching-functions",             "num",   ("effects", None),      "union"),
    ("request",    "request-shape",                       "num",   ("paths", "framework"), None),
    ("fetched",    "who-fetches-it",                      "num",   None,                   "count"),
    ("reasons",    "what-the-screen-does-on-this-ending", "num",   ("frontend", "reason"), "union"),
    ("chain",      "the-ordered-chain-per-ending",        "num",   ("paths", "paths"),     None),
    ("cases422",   "validation-cases",                    "num",   ("short", "schema"),    "union"),
    ("inf_answer", "in-flight-values",                    "num",   ("kinds", "inflight"),  "union"),
    ("inf_server", "in-flight-values",                    "num",   ("kinds", "inflight"),  "union"),
    ("proof",      "coverage-per-condition",              "ratio", ("tests", None),        "ratio"),
    ("alarms",     "findings",                            "dots",  None,                   "sum"),
    ("behind",     "functions-behind-walk-levels",        "num",   None,                   None),
    ("switches",   "switches",                            "num",   ("switches", None),     "union"),
    ("pieces",     "how-common-this-piece-is",            "stack", None,                   "sum"),
    ("lacks",      "how-common-this-piece-is",            "num",   None,                   "sum"),
]
KINDS5 = ("success", "refusal", "framework", "validation", "uncaught")        # D-012's five slots, in its order
# the stage an ending LEAVES from, as gen-robot.js lays the phases on the spine (endpoint-stages.md "endings that leave here"):
# a success leaves at the ANSWER; every other ending at the stage its phase belongs to; the uncaught at the bay.
PHASE_STAGE = {"middleware": "EDGE", "security": "GATE", "dependency": "GATE", "body-parse": "INPUT", "validation": "INPUT",
               "handler": "HANDLER", "uncaught": "UNCAUGHT"}
# the op set gen-endpoint-facts.eff_rec counts as a write — restated ONCE, and proven equal to its `writes` on every path below
WRITE_OPS = {"add", "update", "delete", "insert", "upsert", "merge", "bulk_insert", "execute", "write"}
FATES = ("saved", "maybe", "rolled", "unsaved", "after", "none")
PIECE_WORDS = ("the norm", "common", "rare", "only here")
LAYOUTS = {"rows": 1, "two": 2, "three": 3}                                      # the page's layouts: endpoints per row
CAP = 14                                                                         # rows a side-panel list shows before "+n more"


# ── 2b · D-053: THE ENDINGS IN THE ORDER THEY HAPPEN ───────────────────────────────────────────────────────────────────
# One endings table, its rows in TIME order, derived from the paths' chains and never typed. Within a chain every ending it checks
# (a gate) or ends at (its exit) comes before the ones it checks later; an ending one chain checks twice sits at the first (the
# stream's 422 is checked before its login dependency and after it). Kahn's order over those edges, a tie broken by the phase the
# chains show first · the handler line that reaches the ending (one raised inside a call sits at the call's line) · its own line ·
# its id; the uncaught ending last (it can happen at any moment). A check the feed ties to no ending (`exit: null`) joins the ending its
# sibling raise of the same class, in the same function reached from the same handler call, is caught into — the class decides which
# `except` takes a raise, so the two raises share it; a check that cannot be joined stands on a row of its own, among the endings a
# catch makes of the same call by where each is raised inside it, else at its call site in the handler. INPUT and HANDLER rows carry their MOMENT: the body read or the field check; the handler's own checks, or what
# follows a call that raised, one group per catch. A failure group NAMES a call only when the feed shows it raising into that catch:
# the ending's own check inside the call, the call's raise translated into the ending, or a raise of the class the catch takes (any
# class, for a catch of every error) in a function the feed reaches from that call — a call that merely runs before the catch is not
# named. Proven below: the order is a linear extension of every chain, every ending sits on one row, every check on one row.
VIA_CALL = re.compile(r"^call (.+) @ (.+):(\d+)$")
PRE_HANDLER = {"middleware", "body-parse", "security", "dependency", "validation"}   # the phases before the handler's own code
NOLINE = 10 ** 9                                                                     # an ending with no line sorts after the lined ones
BROAD = {"Exception", "BaseException"}                                               # a catch that takes every error


def _line(at) -> int | None:
    m = re.search(r":(\d+)(?:-\d+)?$", str(at or ""))
    return int(m.group(1)) if m else None


def _file(at) -> str:
    return re.sub(r":\d+(?:-\d+)?$", "", str(at or ""))


def _short(at) -> str:
    """apps/api/api/recipe_creation.py:258 → recipe_creation.py:258"""
    return str(at or "").rsplit("/", 1)[-1]


def time_order(F: dict, fep: dict, fj: dict, ident: dict, EW: dict) -> dict:
    """{rows: [{x | pre, checks: [precondition index], mom, who}], moms: [[at, class, calls]], paths: [path, in time order],
    runs: {moment: runs}, notes: [the INPUT facts the info text says]} for one endpoint — see the section head."""
    lab = ident["label"]
    E = "endpoint:" + lab
    X = {x["id"]: x for x in F["exits"]}
    P = {p["id"]: p for p in F["paths"]}
    pre = F.get("preconditions") or []
    frec = {x["id"]: x for x in (fep.get("produced") or []) + (fep.get("framework_exits") or [])}
    fns = fj.get("functions") or {}
    # the raises the feed reaches from each handler call site of this endpoint (the kinds arm's functions, joined by root_site)
    reach = collections.defaultdict(list)
    for f in fns.values():
        for rb in f.get("reached_by") or []:
            if rb.get("root") == E and rb.get("root_site"):
                reach[rb["root_site"]] += f.get("raises") or []
    # the phases in the order the chains show them: every step's phase as the chains meet it, then the path's own; a phase no
    # chain shows falls in after them, in the facts' own phase list
    seen = []
    for p in F["paths"]:
        for ph in [s.get("phase") for s in p["chain"]] + [p.get("phase")]:
            if ph and ph not in seen:
                seen.append(ph)
    seen += [ph for ph in F.get("phases") or [] if ph not in seen]
    rank = lambda ph: seen.index(ph) if ph in seen else len(seen)
    for i, g in enumerate(pre):
        if g.get("exit") is not None and g["exit"] not in X:
            die(f"{lab}: check {g['id']} names ending {g['exit']}, which is not one of the endpoint's endings")
    # a check with no ending: joined to the ending its sibling raise is caught into (see the section head), else a row of its own
    joined = {}
    for i, g in enumerate(pre):
        m = VIA_CALL.match(str(g.get("via") or ""))
        if g.get("exit") is not None or not m:
            continue
        site = m.group(2) + ":" + m.group(3)
        for f in fns.values():
            r = next((q for q in f.get("raises") or [] if q.get("at") == g.get("at")), None)
            if r is None or r.get("through") or not any(rb.get("root") == E and rb.get("root_site") == site for rb in f.get("reached_by") or []):
                continue
            xs = {t["exit"] for q in f["raises"] if q is not r and q.get("cls") == r.get("cls") for t in q.get("translated_by") or [] if t.get("endpoint") == E}
            if len(xs) == 1 and next(iter(xs)) in X and X[next(iter(xs))].get("status") == g.get("status"):
                joined[i] = next(iter(xs))
    odd = [i for i, g in enumerate(pre) if g.get("exit") is None and i not in joined]
    for i in odd:
        m = VIA_CALL.match(str(pre[i].get("via") or ""))
        if not ((m and m.group(2) == ident.get("file")) or (not pre[i].get("via") and _file(pre[i].get("at")) == ident.get("file"))):
            die(f"{lab}: check {pre[i]['id']} names no ending and no call site in the handler's file — its moment cannot be read")

    # the moments: INPUT by what FastAPI does · HANDLER by the catch the ending's own path passes after the handler starts (after
    # the chain's last step of a phase before it), the last one before the ending; a catch a dependency owns never counts
    deps = set(fj.get("dependencies") or {})

    def catch_of(x):
        """(the catch, the calls the feed shows raising into it) for one handler ending — see the section head"""
        got, named = set(), {}
        for pid in x.get("paths") or []:
            ch = P[pid]["chain"]
            lb = max([i for i, s in enumerate(ch) if s.get("phase") in PRE_HANDLER], default=-1)
            cs = [i for i, s in enumerate(ch) if s["kind"] == "catch" and i > lb]
            if any(ch[i].get("fn") in deps for i in cs):
                die(f"{lab} {pid}: a catch after the handler starts belongs to a dependency — the handler's boundary is misread")
            if not cs:
                got.add(None)
                continue
            ci = cs[-1]
            c = ch[ci]
            got.add((c.get("at"), c.get("label")))
            cf, cl = _file(c.get("at")), _line(c.get("at")) or 0
            cls = {t.strip() for t in re.split(r"[|,]", str(c.get("label") or "")) if t.strip()}
            # the calls between the last point the HANDLER decided another ending before the catch (a gate in the catch's file: a gate
            # inside a callee is part of the call that raised) and the catch, in its file, on a line above it — each named only when
            # the feed shows it raising into the catch
            pg = max([i for i in range(ci) if ch[i]["kind"] == "gate" and ch[i].get("ref") in X and ch[i]["ref"] != x["id"]
                      and _file(ch[i].get("at")) == cf], default=-1)
            for j in range(pg + 1, ci):
                s = ch[j]
                if s["kind"] not in ("call", "collapsed") or _file(s.get("at")) != cf or (_line(s.get("at")) or NOLINE) >= cl:
                    continue
                nxt = next((k for k in range(j + 1, ci) if ch[k].get("at") and _file(ch[k].get("at")) == cf), ci)
                rs = reach.get(s.get("at")) or []
                if (any(ch[k]["kind"] == "gate" and ch[k].get("ref") == x["id"] for k in range(j + 1, nxt))
                        or any(t.get("endpoint") == E and t.get("exit") == x["id"] for q in rs for t in q.get("translated_by") or [])
                        or any(cls & BROAD or q.get("cls") in cls for q in rs)):
                    named[s.get("label")] = _line(s.get("at"))
        if len(got) > 1:
            die(f"{lab} {x['id']}: its paths reach it through different catches {sorted(got, key=str)}")
        return (next(iter(got)) if got else None), named

    cat = {n: catch_of(x) for n, x in X.items() if x["kind"] != "success" and x.get("phase") == "handler"}

    def key(n):
        if n in X:
            x = X[n]
            ph, via, at = x.get("phase"), x.get("via"), x.get("at")
        else:
            g = pre[int(n[1:])]
            ph, via, at = "handler", g.get("via"), g.get("at")
        m = VIA_CALL.match(str(via or ""))
        own = _line(at)
        site = int(m.group(3)) if m else own
        if n not in X and m:
            # a check on a row of its own, raised inside a call: it stands among the endings a catch makes of the SAME call by
            # where each is raised inside it — just before the first one raised after it, else just after the last one before it
            sib = sorted((_line((frec.get(y) or {}).get("raised_at")), y) for y, c in cat.items() if c[0] and int(m.group(3)) in c[1].values()
                         and _file((frec.get(y) or {}).get("raised_at")) == _file(at) and _line((frec.get(y) or {}).get("raised_at")))
            nxt = [y for ln, y in sib if ln > (own or 0)]
            if nxt:
                return key(nxt[0])[:3] + (n,)                       # "#…" sorts before the ending's own id
            if sib:
                return key(sib[-1][1])[:3] + ("~" + n,)            # "~…" sorts after it
        return (rank(ph), NOLINE if site is None else site, NOLINE if own is None else own, n)

    # precedence: every chain's endings in the order it meets them (first meeting), each before the next
    chains, succ = [], collections.defaultdict(set)
    for p in F["paths"]:
        refs = list(dict.fromkeys(s["ref"] for s in p["chain"] if s["kind"] in ("gate", "exit") and s.get("ref") in X))
        chains.append((p["id"], refs))
        for a, b in zip(refs, refs[1:]):
            succ[a].add(b)
    nodes = list(X) + ["#" + str(i) for i in odd]
    unc = sorted((n for n in X if X[n]["kind"] == "uncaught"), key=key)
    indeg = collections.Counter(b for a in succ for b in succ[a])
    heap = [(key(n), n) for n in nodes if not indeg[n] and n not in unc]
    heapq.heapify(heap)
    order = []
    while heap:
        _k, n = heapq.heappop(heap)
        order.append(n)
        for b in sorted(succ.get(n) or ()):
            indeg[b] -= 1
            if not indeg[b] and b not in unc:
                heapq.heappush(heap, (key(b), b))
    order += unc
    # PROOF: every ending once, every check-only row once, and every chain's order kept
    if sorted(order) != sorted(nodes) or len(set(order)) != len(order):
        die(f"{lab}: the time order does not hold every ending once — the chains order the endings in a circle: {sorted(set(nodes) - set(order))}")
    pos = {n: i for i, n in enumerate(order)}
    for pid, refs in chains:
        if any(pos[a] >= pos[b] for a, b in zip(refs, refs[1:])):
            die(f"{lab} {pid}: the time order breaks the chain's own order of its endings")

    moms, mom_of = [], {}
    rows = []
    at_of = {}
    for i, g in enumerate(pre):
        if g.get("exit") is not None or i in joined:
            at_of.setdefault(g.get("exit") or joined[i], []).append(i)
    ckey = lambda i: ((lambda m: int(m.group(3)) if m else (_line(pre[i].get("at")) or NOLINE))(VIA_CALL.match(str(pre[i].get("via") or ""))),
                      _line(pre[i].get("at")) or NOLINE, i)      # the checks on one row, in the order they run
    for n in order:
        if n not in X:
            gi = int(n[1:])
            m = VIA_CALL.match(str(pre[gi].get("via") or ""))
            rows.append({"x": None, "pre": pre[gi], "checks": [gi], "mom": "unplaced", "who": None, "id": pre[gi]["id"],
                         "call": m.group(1) if m else None})
            continue
        x = X[n]
        st = "ANSWER" if x["kind"] == "success" else PHASE_STAGE[x["phase"]]
        mom = None
        if st == "INPUT":
            mom = {"body-parse": "body", "validation": "fields"}[x["phase"]]
        elif st == "HANDLER":
            c, named = cat[n]
            if c is None:
                mom = "checks"
            else:
                if c not in mom_of:
                    mom_of[c] = len(moms)
                    moms.append([_short(c[0]), c[1], {}])
                mom = mom_of[c]
                moms[mom][2].update(named)
        checks = sorted(at_of.get(n, []), key=ckey)
        # who decides an ending shared code makes — a check a dependency carries is the dependency's, not the endpoint's own
        who = None
        if x["kind"] not in ("success", "uncaught") and x.get("phase") in PRE_HANDLER:
            fr = frec.get(n) or {}
            ph = x["phase"]
            dep = fr.get("dep") or next((pre[i].get("dep") for i in checks if pre[i].get("dep")), None)
            if dep:
                who = [dep.split("::")[-1], "fn:" + dep, None]
            elif ph in ("body-parse", "validation"):
                fw = (fj.get("framework") or {}).get("name")
                if fw not in (EW.get("frameworks") or {}):
                    die(f"{lab} {n}: FastAPI decides this ending, and the words file names no framework {fw!r}")
                who = [EW["frameworks"][fw], None, fr.get("source")]
            else:
                w = fr.get("via") or (_short(_file(fr.get("at"))) if fr.get("at") else None)
                who = [w, None, None] if w else None
            if not who:
                die(f"{lab} {n}: an ending shared code decides, and the feed names no one who decides it")
        rows.append({"x": x, "pre": None, "checks": checks, "mom": mom, "who": who, "id": n})
    for g in moms:                                                  # the calls a group names, in the order the handler makes them
        g[2] = [c for c, _ln in sorted(g[2].items(), key=lambda kv: (kv[1] or NOLINE, kv[0]))]
    # PROOF: every check sits on exactly one row
    placed = collections.Counter(i for r in rows for i in r["checks"])
    if sorted(placed) != list(range(len(pre))) or any(v != 1 for v in placed.values()):
        die(f"{lab}: {len(pre)} checks, placed {dict(placed)} — every check must sit on exactly one row")
    # the runs: a moment's rows are contiguous in time or they are drawn as several runs, never reordered
    runs, prev = collections.Counter(), object()
    for r in rows:
        if r["mom"] is not None and r["mom"] != prev:
            runs[r["mom"]] += 1
        prev = r["mom"]
    # what the info text says about INPUT, from these rows: the stage reads INPUT in two runs (FastAPI reads the body before the
    # login check and checks the fields after it) · a field check stands above a GATE row, which only a dependency's own
    # parameters explain (FastAPI checks them before it runs the dependency) — proven from the chains, else the build stops
    stg = [("ANSWER" if r["x"]["kind"] == "success" else PHASE_STAGE[r["x"]["phase"]]) if r["x"] else None for r in rows]
    in_runs = sum(1 for i, s2 in enumerate(stg) if s2 == "INPUT" and (i == 0 or stg[i - 1] != "INPUT"))
    fld = [i for i, r in enumerate(rows) if r["mom"] == "fields"]
    gat = [i for i, s2 in enumerate(stg) if s2 == "GATE"]
    first = bool(fld and gat and min(fld) < max(gat))
    if first and not any(s.get("split") == "dependency-params" for p in fep.get("paths") or [] for s in p.get("chain") or []
                         if s.get("kind") == "gate" and s.get("phase") == "validation"):
        die(f"{lab}: a field check stands above the login check, and no chain checks a dependency's own parameters — the info text would not hold")
    notes = [k for k, on in (("twice", in_runs >= 2), ("first", first), ("unplaced", bool(odd))) if on]
    # each path's fate follows its ending's place in time (paths to one ending keep the facts' order)
    paths = sorted(F["paths"], key=lambda p: (pos.get((p.get("exit") or {}).get("id"), len(pos)), F["paths"].index(p)))
    gat = [c[0] for c in sorted(mom_of, key=mom_of.get)]              # each failure group's catch, its full place (BY MOMENT reads it)
    return {"rows": rows, "moms": moms, "paths": paths, "runs": dict(runs), "notes": notes, "joined": len(joined), "gat": gat}


# ── 2c · BY MOMENT (his ask 2026-09-26: "are these moments universal … can we apply the same thing to all the other sections?") ──
# D-053's moments, extended into ONE spine per endpoint, and every timed block's elements placed on it. The spine: the fixed moments
# before the handler (before any request · the screen sends it · the edge · the body read · the dependencies · the field check);
# then the handler's own time, derived per endpoint BY LINE from its anchors — its own checks (D-053's rows), each failure group's
# catch, its own commit — as RUNS in line order, never reordered (D-053's rule): the checks (with what it does among them), the work
# (calls after a check and before the next anchor that is not one), one run per catch, saving; a fixed handler moment the endpoint
# lacks is drawn as an open slot where it would stand; then the answer, after the answer, and the uncaught last (it can escape at
# any moment). An element is placed ONLY by a recorded fact — a phase, a line in the handler's file, a recorded call site (the
# chains, functions{}.reached_by), the station's call edges, the recorded order of a path's steps — and is otherwise left in the
# "no moment" band with its reason. A data step is placed PER PATH and per occurrence (a dependency's occurrence is the dependencies'
# work, the handler's own occurrence stands at the call THIS path makes), so one step can stand at two moments.
#     Proven per endpoint, against what each path passes read from the FEED alone (its chain, its exit, its own steps on the
# handler's lines, the reached_by records naming it — never an element's placement): every chain's steps fall in spine order (a call
# a chain lists inside a catch the path never passes is left off that path, counted); every placed element sits at a moment each of
# its paths passes (a step placed by the calls the endpoint's OTHER paths make — this path's chain names none — only never after the
# path has left, counted apart); a path's placed steps keep the order the path records them in; and each block's records, placed
# or not, are exactly the records the code map counts for it (its members, read from the lab's facts).
MO_PRE = ("start", "send", "edge", "body", "gate", "fields")
MO_POST = ("answer", "after", "uncaught")
MO_RANK = {"checks": 0, "work": 1, "fail": 2, "save": 3}
# which element family fills which block: an attribute HOMED in the block names it (the ruled tree's home is read, never a block id)
MO_FAM = (("end", "kinds-of-ending"), ("gate", "deciding-branches"), ("data", "operation-per-table"), ("fn", "decision-point-functions"),
          ("shape", "request-shape"), ("client", "what-the-screen-does-on-this-ending"), ("inf", "in-flight-values"),
          ("proof", "case-role-on-this-endpoint"), ("stage", "the-ordered-chain-per-ending"), ("std", "switches"), ("over", "findings"))
MO_WHY = ("nolink", "twomom", "notable", "firstcall", "spans", "member", "noend", "timeless", "nosite", "pathsonly", "fnnone", "swmoves", "nopath")
MO_SRC = ("own", "chain", "reached", "edges", "wide", "order", "gate", "after", "none")
CALL_REL = {"calls", "binds"}                                    # the station's call edges a function is reached through


def fn_adj(lv: dict) -> dict:
    adj = collections.defaultdict(set)
    for e in lv.get("fn_edges") or []:
        if e.get("rel") in CALL_REL and e.get("s") and e.get("t"):
            adj[e["s"].replace("#", "::")].add(e["t"].replace("#", "::"))
    return adj


def reach_of(adj: dict, f: str, memo: dict) -> set:
    if f not in memo:
        seen, st = set(), [f]
        while st:
            for y in adj.get(st.pop(), ()):
                if y not in seen:
                    seen.add(y); st.append(y)
        memo[f] = seen
    return memo[f]


def says(x: dict) -> str:
    """an ending's own words, whole (the code map's column cuts them; a hover never does)"""
    return str(x.get("detail") or x.get("code") or x.get("via") or x.get("reason") or "")


def by_moment(L: dict, fj: dict, fep: dict, r: dict, X: dict, adj: dict, memo: dict, tally: collections.Counter) -> dict:
    """{sp: the spine [[moment, group, first line, last line]], el: placed [[family, spine index, keys, text, chip, endings | None, hint]],
    un: no moment [[family, keys, text, why]], ex: the endings in time order [[id, status, kind, spine index, on a path (1|0), face]],
    pass: per ending the spine indices its paths pass, n: {family: [records placed, records with none]}} — see the section head."""
    TO, F, ident = r["_to"], L["forms"], L["identity"]
    lab = ident["label"]; E = "endpoint:" + lab
    hf, H = ident.get("file") or "", fep.get("handler") or ""
    steps, fns = fj.get("steps") or {}, fj.get("functions") or {}
    deps = set(fj.get("dependencies") or {})
    depn = {k.split("::")[-1] for k in deps}
    pre, rows, paths = F.get("preconditions") or [], TO["rows"], fep.get("paths") or []
    XS = {x["id"]: x for x in F["exits"]}
    # the handler's own lines: from its decorator to its def line + its length, stretched over every record the feed says is its own
    # (a helper in the same file is NOT the handler — its lines are the call's)
    hd = L["functions"].get("handler") or {}
    h0 = _line(hd.get("at")) or ident.get("line") or fep.get("line") or 0
    own_ls = [_line(x.get("at")) for x in (fep.get("returns") or []) + ((fep.get("failure") or {}).get("catches") or []) + list(steps.values())
              if x.get("fn") == H and _file(x.get("at")) == hf]
    hlo, hhi = ident.get("line") or fep.get("line") or h0, max([h0 + (hd.get("lines") or 1) - 1] + [q for q in own_ls if q])
    inh = lambda at: bool(at) and _file(at) == hf and hlo <= (_line(at) or 0) <= hhi
    fk = lambda q: ("fn:" + q.replace("#", "::")) if q else None
    tk = lambda n: (("table:" + X["m2t"][n]) if n in X["m2t"] and n not in X["schemas"] else ("schema:" + n)) if n else None
    stat = lambda s: None if s in (None, "") else "status:" + str(s)
    nm = lambda q: str(q or "").split("::")[-1]
    PIDS = [p["id"] for p in paths]
    EXIT = {p["id"]: p["exit"]["id"] for p in paths}
    chains = {p["id"]: p.get("chain") or [] for p in paths}

    # ── 1 · the handler's anchors: its own checks (D-053's rows), each failure group's catch, its own commit; its returns ──
    def own_line(g):                                             # a check or an ending: the handler line it stands at
        m = VIA_CALL.match(str(g.get("via") or ""))
        if m:
            return int(m.group(3)) if inh(m.group(2) + ":" + m.group(3)) else None
        return _line(g.get("at")) if inh(g.get("at")) else None
    anchors, row_line = [], {}
    for i, t in enumerate(rows):
        if t["mom"] in ("checks", "unplaced"):
            ls = [own_line(pre[c]) for c in t["checks"]] or ([own_line(t["x"])] if t["x"] is not None else [])
            ls = [q for q in ls if q]
            row_line[i] = min(ls) if ls else None
            anchors += [(q, "checks") for q in ls]
    cat_rec = {c.get("at"): c for c in ((fep.get("failure") or {}).get("catches") or [])}
    span, gat = {}, {at: g for g, at in enumerate(TO["gat"])}
    for g, at in enumerate(TO["gat"]):
        vias = sorted({q for t in rows if t["mom"] == g for c in t["checks"] for q in [own_line(pre[c])] if q})
        if inh(at):
            a = _line(at)
            acts = [x.get("at") for x in (cat_rec.get(at) or {}).get("actions") or [] if isinstance(x.get("at"), int)]
            span[g] = (a, max([a] + acts + [q for q in vias if q > a]))
        elif vias:                                               # a catch inside a callee: it stands just after the handler call reaching it
            span[g] = (vias[0] + 0.5, vias[0] + 0.5)
        else:
            die(f"{lab}: failure group {g} ({at}) — its catch is not in the handler's file and no check of it names a handler call")
        anchors.append((span[g][0], f"fail:{g}"))
    sids = []
    for p in paths:
        ef = p.get("effects") or {}
        for e in (ef.get("steps") or []) + (ef.get("after_response") or []):
            if e.get("step") not in sids:
                sids.append(e["step"])
    in_steps = {e.get("step") for p in paths for e in ((p.get("effects") or {}).get("steps") or [])}
    anchors += [(_line(steps[s]["at"]), "save") for s in sids if s in in_steps and steps.get(s, {}).get("fn") == H
                and inh(steps[s].get("at")) and steps[s].get("op") in ("commit", "rollback")]
    anchors.sort(key=lambda a: (a[0], MO_RANK[a[1].split(":")[0]]))
    ret = {_line(x.get("at")) for x in fep.get("returns") or [] if inh(x.get("at"))}

    def hclass(q):
        """the class of a handler line: inside a catch's except body → that group · an anchor's line → its class · a return line →
        the answer · among the checks (before the first, or between two) → checks · else the work"""
        for g, (a, b) in span.items():
            if a < q <= b:
                return f"fail:{g}"
        same = [c for x, c in anchors if x == q]
        if same:
            return same[0]                                       # a call that carries a check stands with the checks, even on a return line
        if q in ret:
            return "answer"
        cp = next((c for x, c in reversed(anchors) if x < q), None)
        cn = next((c for x, c in anchors if x > q), None)
        return "checks" if cn == "checks" and cp in (None, "checks") else "work"

    # the handler calls each path's chain makes (line → the functions called there); a call a chain lists inside a catch its path
    # never passes is not on that path
    cats_of = {pid: {s.get("at") for s in ch if s.get("kind") == "catch"} for pid, ch in chains.items()}

    def off_for(q, pid):
        c = hclass(q)
        return c.startswith("fail:") and TO["gat"][int(c[5:])] not in cats_of[pid]
    pcall, site_paths = {}, collections.defaultdict(set)
    for pid, ch in chains.items():
        d = collections.defaultdict(set)
        for s in ch:
            if s.get("kind") in ("call", "collapsed") and s.get("fn") and inh(s.get("at")) and not off_for(_line(s["at"]), pid):
                d[_line(s["at"])].add(s["fn"]); site_paths[_line(s["at"])].add(pid)
        pcall[pid] = d
    # functions{}.reached_by, per function: handler line → the paths the record names (None: it names none)
    rb_idx = collections.defaultdict(dict)
    for f, rec in fns.items():
        for b in rec.get("reached_by") or []:
            if b.get("root") == E and inh(b.get("root_site")):
                q, bp = _line(b["root_site"]), b.get("paths")
                cur = rb_idx[f].get(q, set())
                rb_idx[f][q] = None if (bp is None or cur is None) else cur | {x for x in bp if x in EXIT}

    # ── 2 · every element, with WHEN it acts: ("fix", moment) · ("h", line[, class]) · ("fail", group) · ("hc",) · ("un", why) ──
    els = []                                                     # dicts: f, w, keys, text, chip, paths (None = every path passing it), hint, id

    def add(f, w, keys, text, chip=None, pths=None, hint=None, idn=None, rec=None):
        o = w[1] if w[0] == "h" and w[1] else min(w[1]) if w[0] == "hs" and w[1] else 0      # a cell reads in handler-line order
        els.append({"f": f, "w": w, "keys": [k for k in keys if k], "text": text, "chip": chip, "paths": pths, "hint": hint, "id": idn,
                    "rec": rec or [idn], "o": o, "pw": set()})

    on_ref = collections.defaultdict(set)                        # an ending's id → the paths whose chain checks or ends at it
    for p in paths:
        for s in chains[p["id"]]:
            if s.get("kind") in ("gate", "exit") and s.get("ref"):
                on_ref[s["ref"]].add(p["id"])
    ends_at = lambda ids: {p for p in PIDS if EXIT[p] in ids}
    via_q = lambda g: (lambda m: int(m.group(3)) if m and inh(m.group(2) + ":" + m.group(3)) else None)(VIA_CALL.match(str(g.get("via") or "")))

    def row_when(i):
        t = rows[i]; x = t["x"]
        st = ("ANSWER" if x["kind"] == "success" else PHASE_STAGE[x["phase"]]) if x else "HANDLER"
        if st in ("EDGE", "GATE", "ANSWER", "UNCAUGHT"):
            return ("fix", {"EDGE": "edge", "GATE": "gate", "ANSWER": "answer", "UNCAUGHT": "uncaught"}[st])
        if st == "INPUT":
            return ("fix", "body" if t["mom"] == "body" else "fields")
        if isinstance(t["mom"], int):
            return ("fail", t["mom"])
        return ("h", row_line[i], "checks") if row_line.get(i) else ("hc",)
    # ENDINGS — D-053's rows, each at its row's moment, on the paths that check it, pass a call its check sits inside, or end at it
    x_row = {}
    for i, t in enumerate(rows):
        if t["x"] is not None:
            x = t["x"]; x_row[x["id"]] = i
            inside = set().union(*[site_paths.get(via_q(pre[c]), set()) for c in t["checks"]]) if t["checks"] else set()
            add("end", row_when(i), [stat(x.get("status"))], "", ["end", x["kind"], x.get("status")], on_ref[x["id"]] | inside | ends_at({x["id"]}),
                says(x), x["id"])
    # GATES AND DECISIONS — the own checks on their ending's row; the dependencies; the rate limiters; the deciding forks; the catches
    # a check acts where it is evaluated — the handler line it stands at (its own, or the call it sits inside, on every path making
    # that call); its ending may leave later (a check inside a call whose raise a catch translates is evaluated in the work, and its
    # ending leaves after the catch). A check the feed ties only to a catch (`via` except …) stands where that catch raises its ending.
    rk = r["dk"]["guards"]
    for i, t in enumerate(rows):
        for c in t["checks"]:
            g, q = pre[c], own_line(pre[c])
            w = (("h", q, "checks") if t["mom"] in ("checks", "unplaced") else ("h", q)) if q else row_when(i)
            pp = (on_ref[t["x"]["id"]] if t["x"] is not None else set()) | site_paths.get(via_q(g), set())
            add("gate", w, [rk[c][0]] + rk[c][1], g.get("pred") or "", ["status", g.get("status")] + (["raise"] if str(g.get("via") or "").startswith("except ") else []),
                pp or (None if t["x"] is None else set()), (r["d"]["guards"]["items"][c][2] or ""), "g:" + g["id"])
    au = F.get("auth") or {}
    gate_paths = {p for p in PIDS if any(s.get("phase") in ("security", "dependency") for s in chains[p])}
    for g in au.get("gates") or []:
        sch = " · ".join(str(s.get("scheme")) for s in au.get("schemes") or [])
        add("gate", ("fix", "gate"), [fk(g.get("fn"))], g.get("name") or nm(g.get("fn")), None, gate_paths, sch or None, "a:" + str(g.get("fn")))
    for l0 in (F.get("rate") or {}).get("limits") or []:
        i = x_row.get(l0.get("exit"))
        nmx = str(l0.get("limiter") or l0.get("class") or "?").lstrip("_")
        add("gate", row_when(i) if i is not None else ("un", "nolink"), ["limiter:" + nmx], nmx, None, on_ref[l0.get("exit")],
            _short(l0.get("at")), "l:" + nmx)
    br_site = {}
    for b in F.get("branches") or []:
        q = _line(b.get("site")) if inh(b.get("site")) else None
        br_site[b["id"]] = q
        add("gate", ("h", q) if q else ("un", "nosite"), ["fork:" + b["id"]], b.get("pred") or b.get("call") or "", None,
            {p for p in PIDS if any(s.get("kind") == "branch" and s.get("ref") == b["id"] for s in chains[p])}, _short(b.get("site")), "b:" + b["id"])

    # a function → the handler lines that reach it, endpoint-wide: the chains' own call sites · functions{}.reached_by · the station's
    # call edges from the chains' calls
    direct = collections.defaultdict(set)                        # function → the handler lines the chains call it at
    for p in paths:
        for s in chains[p["id"]]:
            if s.get("kind") in ("call", "collapsed") and s.get("fn") and inh(s.get("at")):
                direct[s["fn"]].add(_line(s["at"]))

    def sites(f):
        if direct.get(f):
            return sorted(direct[f]), "chain"
        if rb_idx.get(f):
            return sorted(rb_idx[f]), "reached"
        ed = sorted({q for d, qs in direct.items() for q in qs if f in reach_of(adj, d, memo)})
        return (ed, "edges") if ed else ([], None)

    def path_sites(f, pid):
        """the handler calls THIS path makes that reach f: its chain's calls · the reached_by records naming the path (or naming none,
        at a call the path makes) · the station's call edges from its calls"""
        d = pcall[pid]
        t = sorted(q for q, fs in d.items() if f in fs)
        if t:
            return t, "chain"
        t = sorted(q for q, ps in (rb_idx.get(f) or {}).items() if (pid in ps if ps is not None else q in d) and not off_for(q, pid))
        if t:
            return t, "reached"
        t = sorted(q for q, fs in d.items() if any(f in reach_of(adj, g, memo) for g in fs))
        return (t, "edges") if t else ([], None)
    for c in (fep.get("failure") or {}).get("catches") or []:
        at, cf = c.get("at"), c.get("fn")
        if cf in deps:
            w = ("fix", "gate")
        elif at in gat:
            w = ("fail", gat[at])
        elif inh(at):
            w = ("h", _line(at))
        else:
            # a catch inside a callee: the handler calls that reach its function — its own records, else the records of the
            # functions it calls (their `via` names it, their root_site the handler call)
            qs, _src = sites(cf)
            qs = qs or sorted({_line(b["root_site"]) for f2 in fns.values() for b in f2.get("reached_by") or []
                               if b.get("root") == E and b.get("via") == cf and inh(b.get("root_site"))})
            w = ("hs", qs) if qs else ("un", "pathsonly")
        # the paths whose chain passes the catch (it acts there); a catch no chain shows: the paths the feed lists it on
        pp = {p for p in PIDS if any(s.get("kind") == "catch" and s.get("at") == at for s in chains[p])} or set(c.get("paths") or [])
        add("gate", w, ["catch:" + c["id"]], _short(at) + " · " + str(c.get("outcome") or ""), None, pp & set(PIDS), " · ".join(c.get("types") or []), "c:" + c["id"])
    # DATA EFFECTS — per path and per occurrence (a step a path lists twice acts twice): a dependency's occurrence is the dependencies'
    # work · after the answer · the handler's own line · else a handler call THIS path makes that reaches it · else, when this path's
    # chain names no such call, the calls the endpoint's other paths make to its function ("wide") — resolved once the spine stands
    occ = {}
    for p in paths:
        ef, lst = p.get("effects") or {}, []
        for e, aft in [(e, False) for e in ef.get("steps") or []] + [(e, True) for e in ef.get("after_response") or []]:
            s = e["step"]; rec = steps.get(s) or {}
            if aft:
                lst.append([s, "fix", "after", "after"])
            elif e.get("dependency"):
                lst.append([s, "fix", "gate", "gate"])
            elif rec.get("fn") == H and inh(rec.get("at")):
                lst.append([s, "own", [_line(rec["at"])], "own"])
            else:
                qs, src = path_sites(rec.get("fn"), p["id"])
                if not qs:
                    qs, src = sites(rec.get("fn")); src = "wide" if qs else None
                lst.append([s, "lines", qs, src])
        occ[p["id"]] = lst
    # STRUCTURES — the body FastAPI reads, every field it checks, the reply the handler builds
    reads_body, req_name, req_fields = body_schema(fep, fj.get("schemas") or {})
    shape_body = bool(reads_body and req_name and any(x.get("phase") == "body-parse" for x in fep.get("framework_exits") or []))
    if shape_body:
        body_p = {p for p in PIDS if any(s.get("phase") == "body-parse" for s in chains[p])}
        fld_p = {p for p in PIDS if any(s.get("phase") == "validation" for s in chains[p])}
        add("shape", ("fix", "body"), [tk(req_name)], req_name, ["dir", "in"], body_p, None, "q:body")
        for fl in req_fields or []:
            add("shape", ("fix", "fields"), [tk(req_name)], fl, None, fld_p, None, "q:" + fl)
    rsp = r["d"].get("response")
    if rsp:
        add("shape", ("fix", "answer"), [tk(rsp[0])], f"{rsp[0]} · {rsp[1]}", ["dir", "out"], ends_at({x["id"] for x in F["exits"] if x["kind"] == "success"}), None, "r:reply")
    # CLIENT — who sends it and the screens above them (before the request); what the screen does with the answer (after it)
    fe = fj.get("frontend") or {}
    senders = set()
    for pid, pc in sorted((fe.get("pieces") or {}).items()):
        for c in pc.get("calls") or []:
            if c.get("endpoint") != E:
                continue
            senders.add(pid)
            add("client", ("fix", "send"), [pid], pid.split("#")[-1], ["kind2", c.get("kind")], None, _short(c.get("at")), "h:" + pid + str(c.get("at")))
            for wd, lst in (("seed", c.get("seeds") or []), ("refresh", c.get("invalidates") or [])):
                for o in lst:
                    wn = o.get("when")
                    pp = ends_at({x["id"] for x in F["exits"] if x["kind"] == "success"}) if wn == "onSuccess" else \
                        ends_at({x["id"] for x in F["exits"] if x["kind"] != "success"}) if wn == "onError" else None
                    add("client", ("fix", "after"), [pid], wd + " " + json.dumps(o.get("key"), ensure_ascii=False), ["cache", wd], pp,
                        f"{wn} · {_short(o.get('at'))}", "o:" + pid + str(o.get("at")) + wd + json.dumps(o.get("key")))
    for fb in L["widening"].get("fetched_by") or []:
        if fb.get("id") not in senders:
            add("client", ("fix", "send"), [fb.get("id")], fb.get("name") or str(fb.get("id")).split("#")[-1], None, None, None, "h:" + str(fb.get("id")))
    for sc in L["widening"].get("screens") or []:
        add("client", ("fix", "send"), [sc.get("id")], sc.get("name") or str(sc.get("id")).split("#")[-1], None, None, None, "v:" + str(sc.get("id")))
    routed = collections.defaultdict(set)
    for rd in ((fe.get("reasons") or {}).get("readers") or {}).get(E) or []:
        for ro in rd.get("routes") or []:
            routed[ro.get("site")].add(ro.get("exit"))
    for s2 in F["frontend"].get("reason_sites") or []:
        add("client", ("fix", "after"), ["reason:" + s2["id"]], f"{_short(s2.get('at'))}", ["does", s2.get("does_state")], ends_at(routed.get(s2["id"]) or set()) or None,
            s2.get("branch"), "s:" + s2["id"])
    # IN-FLIGHT STATE — each value where it is SET: at server start, by a middleware, by a dependency, on a handler line
    ikey = lambda x: x.get("ref") or "|".join(str(x.get(q)) for q in ("kind", "name", "set_at"))
    for x in (F.get("inflight") or {}).get("rows") or []:
        si_ = x.get("set_in")
        w = (("fix", "start") if si_ == "init" else ("fix", "edge") if si_ == "middleware" else ("fix", "gate") if si_ == "dependency"
             else ("h", _line(x.get("set_at"))) if si_ == "handler" and inh(x.get("set_at")) else ("un", "firstcall"))
        add("inf", w, ["inflight:" + ikey(x)], x.get("name") or "", ["ifk", x.get("kind")], "moment", x.get("dies"), "i:" + ikey(x))
    # PROOF — a test call rides the ending it proves ("proves", never "runs at"); one that fits endings at several moments has none.
    # Its chip: the status its endings share, else each of theirs; its hover names the endings
    def proves(xs):
        sts = sorted({XS[x].get("status") for x in xs}, key=str)
        return (["status", sts[0]] if len(sts) == 1 else ["statuses", sts]) if xs else None
    ptxt = lambda ln, xs: f"{ln}" + ("".join(" · " + (says(XS[x]) or str(XS[x].get("status"))) for x in sorted(xs)) if len(xs) > 1 else "")
    for cid, tc in sorted((fj.get("test_cases") or {}).items()):
        for c in tc.get("calls") or []:
            if c.get("endpoint") == E and c.get("role") == "act":
                xs = {q.get("exit") for q in c.get("refs") or [] if q.get("exit") in XS}
                add("proof", ("xs", sorted(xs)), ["case:" + cid], cid, proves(xs), ends_at(xs), ptxt(c.get("line"), xs), "p:" + cid + ":" + str(c.get("line")))
    sr = collections.defaultdict(set)
    for x in F["exits"]:
        for t in x.get("tests") or []:
            if t.get("role") == "service-raises":
                sr[(t.get("case"), t.get("line"))].add(x["id"])
    for (cid, ln), xs in sorted(sr.items(), key=lambda kv: (str(kv[0][0]), kv[0][1] or 0)):
        add("proof", ("xs", sorted(xs)), ["case:" + str(cid)], str(cid), proves(xs), ends_at(xs), ptxt(ln, xs), "p:" + str(cid) + ":" + str(ln) + ":raises")
    # STAGES AND ORDER — the app's middleware in the order the chains pass it; each 422 rule where FastAPI checks it
    mw = []
    for p in paths:
        for s in chains[p["id"]]:
            if s.get("kind") == "step" and s.get("phase") == "middleware" and (s.get("label") or s.get("call")) not in mw:
                mw.append(s.get("label") or s.get("call"))
    for m in mw:
        add("stage", ("fix", "edge"), [], str(m), None, {p for p in PIDS if any(s.get("kind") == "step" and (s.get("label") or s.get("call")) == m for s in chains[p])}, None, "m:" + str(m))
    for x in F["exits"]:
        for c in x.get("cases") or []:
            if isinstance(c, dict):                              # a dependency's own parameter is checked while that dependency is solved
                dep = "." in str(c.get("param") or "") and str(c["param"]).split(".", 1)[0] in depn
                vp = {p for p in PIDS if any(s.get("kind") == "gate" and s.get("phase") == "validation" and s.get("ref") == x["id"]
                                             and (s.get("split") == "dependency-params") == dep for s in chains[p])}
                add("stage", ("fix", "gate" if dep else "fields"), ["rule:" + c["id"]], str(c.get("loc") or c.get("param") or ""), ["rule", c.get("type")], vp, c.get("rule"), "k:" + c["id"])
    # STANDARD OR SPECIALIST — a switch where its chain has it; a rare piece where the thing it names acts; an identity has no moment.
    # A norm the endpoint LACKS is an absence, not a piece: it has no moment and is not drawn here (the code map says it)
    fsw = {w.get("id"): w for w in fep.get("switches") or []}
    for w in F.get("switches") or []:
        ph = next((s.get("phase") for p in paths for s in chains[p["id"]] if s.get("kind") == "switch" and s.get("ref") == w["id"]), None)
        fw = fsw.get(w["id"]) or {}
        anc = fw.get("anchor") if w.get("kind") == "value" else fw.get("at")
        wn = (("fix", "edge") if ph == "middleware" else ("fix", "gate") if ph == "dependency"
              else ("h", _line(anc)) if inh(anc) else ("next", w["id"]))
        add("std", wn, ["switch:" + w["id"]], w.get("port") or ", ".join(sorted(w.get("settings") or [])) or str(w.get("expr") or fw.get("pred") or ""),
            ["switch", w.get("kind")], {p for p in PIDS if any(s.get("kind") == "switch" and s.get("ref") == w["id"] for s in chains[p])}, None, "w:" + w["id"])
    pc = L["feedwide"]["pieces"]
    resp = fep.get("responses") or {}
    for pr in pc["rows"]:
        if pr["word"] not in ("rare", "only here"):
            continue
        fam_, val = pr["key"].split(":", 1)
        if fam_ == "status":
            w = ("xs", sorted(x["id"] for x in F["exits"] if str(x.get("status")) == val))
        elif fam_ == "media":
            w = ("xs", sorted(x["id"] for x in F["exits"] if (resp.get(x["id"]) or {}).get("media") == val))
        elif fam_ == "catch":
            w = ("cs", sorted(c["id"] for c in (fep.get("failure") or {}).get("catches") or [] if c.get("outcome") == val))
        elif pr["key"] == "repeat:key":
            ra = ((fep.get("repeat") or {}).get("key") or {}).get("read_at")
            w = ("h", _line(ra)) if inh(ra) else ("un", "nosite")
        elif fam_ == "repeat":
            qs = sorted({q for cl in (fep.get("repeat") or {}).get("claims") or [] if val.split(":")[-1] in (cl.get("idioms") or [])
                         for q in (sites(cl.get("fn"))[0] if cl.get("fn") != H else [_line(cl.get("at"))] if inh(cl.get("at")) else [])})
            w = ("hs", qs) if qs else ("un", "nolink")
        else:
            w = ("un", "timeless")
        add("std", w, ["piece:" + pr["key"]], pr["words"], None, None, None, "x:" + pr["key"])

    # ── 3 · the handler's runs, from every handler line an element or a step occurrence acts at; then the spine ──
    items = {(q, c) for q, c in anchors}
    lines_at = [(q, w[2] if (w[0] == "h" and len(w) > 2) else None) for e in els for w in [e["w"]]
                for q in ([w[1]] if w[0] == "h" else (w[1] if w[0] == "hs" else []))]
    lines_at += [(q, None) for lst in occ.values() for o in lst if o[1] in ("own", "lines") for q in o[2]]
    lines_at += [(q, None) for f, d in rb_idx.items() for q in d] + [(q, None) for d in pcall.values() for q in d]
    lines_at += [(_line(s["at"]), None) for ch in chains.values() for s in ch if s.get("kind") == "gate" and inh(s.get("at"))]
    for q, c in lines_at:
        if q:
            c = c or hclass(q)
            if c != "answer":
                items.add((q, c))
    runs = []
    for q, c in sorted(items, key=lambda a: (a[0], MO_RANK[a[1].split(":")[0]])):
        if runs and runs[-1][0] == c:
            runs[-1][2] = q
        else:
            runs.append([c, q, q])
    for g in range(len(TO["gat"])):
        if sum(1 for x in runs if x[0] == f"fail:{g}") != 1:
            die(f"{lab}: failure group {g} does not stand as ONE run of the handler's lines: {runs}")
    seg = [list(x) for x in runs]
    kinds = {x[0].split(":")[0] for x in seg}
    if "checks" not in kinds:
        seg.insert(0, ["checks", None, None])
    if "work" not in kinds:
        seg.insert(max((i for i, x in enumerate(seg) if x[0] == "checks"), default=-1) + 1, ["work", None, None])
    if "save" not in kinds:
        seg.append(["save", None, None])
    sp = [[m, None, None, None] for m in MO_PRE]
    sp += [[c.split(":")[0], int(c.split(":")[1]) if c.startswith("fail:") else None, lo, hi] for c, lo, hi in seg]
    sp += [[m, None, None, None] for m in MO_POST]
    SI = {m: i for i, x in enumerate(sp) for m in [x[0]] if m in MO_PRE + MO_POST}
    H0 = len(MO_PRE)

    def hsi(q, c=None):
        c = c or hclass(q)
        if c == "answer":
            return SI["answer"]
        hit = [i for i, x in enumerate(seg) if x[0] == c and x[1] is not None and x[1] <= q <= x[2]]
        if len(hit) != 1:
            die(f"{lab}: handler line {q} ({c}) falls in {len(hit)} runs")
        return H0 + hit[0]
    fail_si = {g: H0 + next(i for i, x in enumerate(seg) if x[0] == f"fail:{g}") for g in range(len(TO["gat"]))}
    first_checks = H0 + next(i for i, x in enumerate(seg) if x[0] == "checks")
    # D-055: a handler moment's own words — the functions its run calls (the chains' own call sites on its lines, in line order) and,
    # in a saving run, what the handler's own step there does (commit, rollback). The head shows the first; the hover all of them
    for i, x in enumerate(seg):
        if x[1] is None:
            sp[H0 + i].append([[], []])
            continue
        cl = sorted({(q, nm(f)) for d in pcall.values() for q, fs in d.items() if x[1] <= q <= x[2] and hsi(q) == H0 + i for f in fs})
        ops = [steps[s]["op"] for s in sids if s in in_steps and steps.get(s, {}).get("fn") == H and inh(steps[s].get("at"))
               and steps[s].get("op") in ("commit", "rollback") and hsi(_line(steps[s]["at"])) == H0 + i]
        sp[H0 + i].append([list(dict.fromkeys(n for _q, n in cl)), list(dict.fromkeys(ops))])
    x_si = {}

    def si_of(e):
        w = e["w"]
        if w[0] == "fix":
            return SI[w[1]]
        if w[0] == "h":
            return hsi(w[1], w[2] if len(w) > 2 else None) if w[1] else None
        if w[0] == "hc":
            return first_checks
        if w[0] == "hfirst":
            return H0
        if w[0] == "fail":
            return fail_si[w[1]]
        if w[0] == "hs":
            s2 = {hsi(q) for q in w[1]}
            return next(iter(s2)) if len(s2) == 1 else ("un", "twomom")
        if w[0] in ("xs", "cs"):                                 # the endings (or catches) it stands for: one moment, else why not
            s2 = [x_si.get(x) for x in w[1]] if w[0] == "xs" else [c["si"] for c in cat_el if c["id"][2:] in w[1]]
            if not w[1]:
                return ("un", "noend")
            if any(not isinstance(v, int) for v in s2):
                return ("un", "member")
            return s2[0] if len(set(s2)) == 1 else ("un", "spans")
        return None
    for e in els:                                                # the endings first: the proofs and the pieces ride them
        if e["f"] == "end":
            e["si"] = si_of(e); x_si[e["id"]] = e["si"]
    cat_el = [e for e in els if e["f"] == "gate" and e["id"].startswith("c:")]
    for e in cat_el:
        e["si"] = si_of(e)
    for e in els:
        if "si" not in e and e["w"][0] not in ("un", "next"):
            e["si"] = si_of(e)

    # ── 4 · what each path passes, from the FEED alone: its chain's steps in spine order (PROOF), its exit, its own steps on the
    # handler's lines and in the dependencies, the reached_by records naming it; the handler's first moment when it gets there ──
    sw_next = collections.defaultdict(set)
    passed = {p: {SI["start"], SI["send"], SI["after"]} for p in PIDS}
    unc = lambda pid: XS.get(EXIT[pid], {}).get("kind") == "uncaught"
    xe_of = lambda pid: x_si.get(EXIT[pid]) if isinstance(x_si.get(EXIT[pid]), int) else None

    def step_si(s, cats, last_h):
        k, ph = s.get("kind"), s.get("phase")
        if k == "exit":
            return x_si.get(s.get("ref"))
        if ph == "middleware":
            return SI["edge"]
        if ph == "body-parse":
            return SI["body"]
        if ph in ("security", "dependency"):
            return SI["gate"]
        if ph == "validation":
            return SI["gate"] if s.get("split") == "dependency-params" else SI["fields"]
        if k == "gate":                                          # read from its own line — or the handler call it sits inside
            if inh(s.get("at")):
                return hsi(_line(s["at"]))
            return last_h if last_h is not None else x_si.get(s.get("ref"))
        if k == "catch":
            if s.get("fn") in deps:
                return SI["gate"]
            if s.get("at") in gat:
                return fail_si[gat[s["at"]]]
            return hsi(_line(s["at"])) if inh(s.get("at")) else last_h
        if k == "branch":
            q = br_site.get(s.get("ref"))
            return hsi(q) if q else last_h
        if k in ("call", "collapsed", "step"):
            if not inh(s.get("at")):
                return last_h
            c = hclass(_line(s["at"]))
            if c.startswith("fail:") and TO["gat"][int(c[5:])] not in cats:
                return "off"                                     # inside a catch this path never passes: not on this path
            return hsi(_line(s["at"]), c)
        return None
    for p in paths:
        pid, ch = p["id"], chains[p["id"]]
        cats = cats_of[pid]
        seq, last_h = [], None
        for s in ch:
            if s.get("kind") == "switch":
                continue
            si = step_si(s, cats, last_h)
            if si == "off":
                tally["off"] += 1
                continue
            if si is None:
                continue
            if s.get("kind") in ("call", "collapsed") and inh(s.get("at")):
                last_h = si
            seq.append((si, s))
        for (a, sa), (b, sb) in zip(seq, seq[1:]):
            if b < a:
                die(f"{lab} {pid}: the chain runs {sa.get('kind')} {sa.get('at') or sa.get('ref')} ({sp[a][0]}) before "
                    f"{sb.get('kind')} {sb.get('at') or sb.get('ref')} ({sp[b][0]}) — the spine's order breaks the chain's")
        passed[pid] |= {a for a, _s in seq}
        for j, s in enumerate(ch):                               # a switch with no line of its own: where the chain's next step stands
            if s.get("kind") == "switch":
                nxt = next((step_si(t, cats, last_h) for t in ch[j + 1:] if t.get("kind") != "switch"), None)
                if isinstance(nxt, int):
                    sw_next[s.get("ref")].add(nxt)
        if xe_of(pid) is not None:
            passed[pid].add(xe_of(pid))
        for s, kd, v, _src in occ[pid]:                          # its own steps: the dependencies', after the answer, on a handler line
            if kd == "fix":
                passed[pid].add(SI[v])
            elif kd == "own" and not off_for(v[0], pid):
                passed[pid].add(hsi(v[0]))
        for f, d in rb_idx.items():                              # a reached_by record naming this path: it passes that handler call
            for q, ps in d.items():
                if ps is not None and pid in ps and not off_for(q, pid):
                    passed[pid].add(hsi(q))
        if not unc(pid) and (any(H0 <= a < SI["answer"] for a in passed[pid]) or (xe_of(pid) or 0) >= H0):
            passed[pid].add(H0)                                  # the handler starts at its first moment on every path that reaches it
    for e in els:
        if e["w"][0] == "next":
            s2 = sw_next.get(e["w"][1]) or set()
            e["si"] = next(iter(s2)) if len(s2) == 1 else ("un", "swmoves")

    # ── 5 · each data occurrence on its path's spine: one moment, else the one between its recorded neighbours, else none; then
    # the data elements (one chip per read or write per moment — a step recorded twice, once conditional, is one chip) and the
    # functions the calls reach ──
    place, miss = {}, {}
    for pid, lst in occ.items():
        xe = xe_of(pid)
        for j, (s, kd, v, src) in enumerate(lst):
            if kd == "fix":
                place[(pid, j)] = (SI[v], None, src, False); continue
            cand = {}
            for q in v:
                if off_for(q, pid):
                    continue
                s2 = hsi(q)
                if xe is not None and s2 > xe and not unc(pid):
                    continue                                     # after the path has left: not where this path met it
                cand[s2] = min(q, cand.get(s2, q))
            if len(cand) == 1:
                place[(pid, j)] = (next(iter(cand)), next(iter(cand.values())), src, src == "wide")
            else:
                miss[(pid, j)] = cand
        for j in [j for j in range(len(lst)) if (pid, j) in miss]:
            prev = next((place[(pid, k)] for k in reversed(range(j)) if (pid, k) in place and lst[k][2] != "after"), None)
            nxt = next((place[(pid, k)] for k in range(j + 1, len(lst)) if (pid, k) in place and lst[k][2] != "after"), None)
            cand = miss[(pid, j)]
            if cand:
                lo, hi = (prev[0] if prev else -1), (nxt[0] if nxt else NOLINE)
                inr = {a: q for a, q in cand.items() if lo <= a <= hi}
                if len(inr) == 1:
                    place[(pid, j)] = (next(iter(inr)), next(iter(inr.values())), "order", lst[j][3] == "wide"); del miss[(pid, j)]
            elif prev and nxt and prev[1] is not None and prev[1] == nxt[1]:
                place[(pid, j)] = (prev[0], prev[1], "order", prev[3] or nxt[3]); del miss[(pid, j)]
        seen_si = [place[(pid, j)][0] for j in range(len(lst)) if (pid, j) in place and lst[j][2] != "after"]
        if any(b < a for a, b in zip(seen_si, seen_si[1:])):                # PROOF: the recorded order is the spine's
            die(f"{lab} {pid}: its steps, placed, run against the order the path records them in: {seen_si}")
    first = {s: i for i, s in enumerate(sids)}
    dgrp, placed_st = {}, set()
    n_occ = 0
    for (pid, j), (si, q, src, wd) in sorted(place.items(), key=lambda kv: (kv[1][0], first[occ[kv[0][0]][kv[0][1]][0]], kv[0])):
        s = occ[pid][j][0]; rec = steps.get(s) or {}
        mk = (rec.get("fn"), rec.get("at"), rec.get("op"), rec.get("table"))
        e = dgrp.get((mk, si))
        if e is None:
            tb, op = rec.get("table"), rec.get("op")
            e = dgrp[(mk, si)] = {"f": "data", "w": ("si", si), "si": si, "keys": [k for k in (["table:" + tb] if tb else []) + [fk(rec.get("fn"))] if k],
                                  "text": tb or nm(rec.get("fn")), "chip": ["op", "w" if op in WRITE_OPS else "r"] if tb else ["opw", op],
                                  "paths": set(), "pw": set(), "hint": _short(rec.get("at")), "id": "s:" + s, "rec": [], "o": (q or 0, first[s])}
            els.append(e)
        if "s:" + s not in e["rec"]:
            e["rec"].append("s:" + s)
        e["paths"].add(pid)
        if wd:
            e["pw"].add(pid)
        tally["src:" + src] += 1; n_occ += 1
        placed_st.add(s)
    dun = {}
    for (pid, j), cand in miss.items():
        s = occ[pid][j][0]; tally["src:none"] += 1; n_occ += 1
        if s in placed_st:
            tally["offocc"] += 1                                 # placed on another path; left off this one
            continue
        rec = steps.get(s) or {}
        mk = (rec.get("fn"), rec.get("at"), rec.get("op"), rec.get("table"))
        if mk not in dun:
            tb, op = rec.get("table"), rec.get("op")
            dun[mk] = {"f": "data", "w": ("un", "twomom" if cand else "nolink"), "keys": [k for k in (["table:" + tb] if tb else []) + [fk(rec.get("fn"))] if k],
                       "text": tb or nm(rec.get("fn")), "chip": None, "paths": None, "hint": None, "id": "s:" + s, "rec": [], "o": 0, "pw": set()}
            els.append(dun[mk])
        if "s:" + s not in dun[mk]["rec"]:
            dun[mk]["rec"].append("s:" + s)
    stepped = {(steps.get(s) or {}).get("table") for s in sids}
    for t in L["data"]["tables"]:
        if t["table"] not in stepped:
            add("data", ("un", "notable"), ["table:" + t["table"]], t["table"], ["op", t["rw"]], None, None, "t:" + t["table"])
    # FUNCTIONS — the handler (it starts at its first moment), each call a path's chain makes (at its line, on the paths making it),
    # what those calls reach (the reached_by records, on the paths they name; the path's own steps, at the call that placed them)
    add("fn", ("hfirst",), [fk(H)], nm(H), None, "handler", f"{_short(fep.get('file') or hf)}:{fep.get('line')}", "f:" + H)
    fq = {}
    for pid, d in pcall.items():
        for q, fs in d.items():
            for f in fs:
                fq.setdefault((f, q), [set(), set(), True])[0].add(pid)
    for f, d in rb_idx.items():
        for q, ps in d.items():
            if (f, q) not in fq or not fq[(f, q)][2]:
                x = fq.setdefault((f, q), [set(), set(), False])
                x[0] |= (ps if ps is not None else site_paths.get(q, set()))
    for (pid, j), (si, q, src, wd) in place.items():
        f = (steps.get(occ[pid][j][0]) or {}).get("fn")
        if q is None or not f or f == H or src == "own":
            continue
        x = fq.setdefault((f, q), [set(), set(), False])
        if not x[2]:
            x[0].add(pid)
            if wd:
                x[1].add(pid)
    for (f, q), (ps, pw, dr) in sorted(fq.items(), key=lambda kv: (kv[0][1], kv[0][0])):
        add("fn", ("h", q), [fk(f)], nm(f), None, ps, f"@ {q}" if dr else None, "f:" + f)
        els[-1]["pw"] = pw
    fn_ids = {H} | {f for f, _q in fq}
    named = set(r["u"].get("datafns") or []) | {f.get("fn") for f in (F.get("inside") or {}).get("functions") or []
                                                if f.get("fn") and (f.get("refusals") or any(q.get("here") for q in f.get("raises") or []))}
    for f in sorted(named - fn_ids - deps):
        add("fn", ("un", "fnnone"), [fk(f)], nm(f), None, None, None, "f:" + f)
    for e in els:
        if "si" not in e and e["w"][0] not in ("un", "next"):
            e["si"] = si_of(e)

    # ── 6 · each element's paths → the endings it is on; PROOF: every path it is on passes its moment (a "wide" step: never after the
    # path left); an element on no path goes to the band; each block's records, placed or not, are the code map's own ──
    ex = [[t["x"]["id"], t["x"].get("status"), t["x"]["kind"], x_si[t["x"]["id"]]] for t in rows if t["x"] is not None]
    EI = {x[0]: i for i, x in enumerate(ex)}
    if len(ex) > 30:
        die(f"{lab}: {len(ex)} endings — the page keeps an element's endings as bits of one number, and holds thirty")
    live = {EI[EXIT[p]] for p in PIDS if EXIT[p] in EI}          # the endings a path ends at: the picker offers only these
    seen = {p: set(passed[p]) for p in PIDS}
    el, un = [], []
    rp, ru = collections.defaultdict(set), collections.defaultdict(set)
    for e in els:
        si = e.get("si")
        if isinstance(si, tuple) or e["w"][0] == "un" or si is None:
            why = si[1] if isinstance(si, tuple) else e["w"][1] if e["w"][0] == "un" else "nolink"
            un.append([e["f"], e["keys"], e["text"], why]); ru[e["f"]].update(e["rec"])
            continue
        pp = e["paths"]
        if pp == "handler":
            pp = {p for p in PIDS if H0 in passed[p]}
        elif pp == "moment":
            pp = {p for p in PIDS if si in passed[p]}
        elif pp is None:
            pp = {p for p in PIDS if si in passed[p]} if si not in (SI["start"], SI["send"], SI["after"]) else set(PIDS)
        if e["f"] == "end":                                      # an ending: the paths that end at it, and those that pass its check AND its moment
            pp = {p for p in pp if si in passed[p]} | {p for p in PIDS if EXIT[p] == e["id"]}
        if not pp:
            un.append([e["f"], e["keys"], e["text"], "nopath"]); ru[e["f"]].update(e["rec"])
            continue
        bad = sorted(p for p in pp - e["pw"] if si not in passed[p])
        if bad:
            die(f"{lab}: {e['f']} {e['id']} stands at {sp[si][0]}, which its path {bad[0]} does not pass")
        bad = sorted(p for p in e["pw"] if xe_of(p) is not None and si > xe_of(p) and not unc(p))
        if bad:
            die(f"{lab}: {e['f']} {e['id']} stands at {sp[si][0]}, after its path {bad[0]} has left")
        for p in e["pw"]:
            seen[p].add(si)
        ends = sorted({EI[EXIT[p]] for p in pp if EXIT[p] in EI})
        mask = None if set(ends) == live else sum(1 << i for i in ends)   # the endings it is on, one bit each (the page tests a bit)
        if mask == 0:
            die(f"{lab}: {e['f']} {e['id']} is placed on no ending")
        el.append([e["f"], si, e["keys"], e["text"], e["chip"], mask, e["hint"], e["o"]]); rp[e["f"]].update(e["rec"])
    # the records each block holds, read from the code map's own members and the lab's facts — never from the elements above
    U = r["u"]
    ms = lambda cid, fb: set(U[cid]) if cid in U else set(fb)
    stepped_lab = {st["step"] for p in F["paths"] for st in (p.get("effects") or {}).get("steps") or []}
    after_ids = {e["step"] for p in paths for e in (p.get("effects") or {}).get("after_response") or []}
    rtabs = {(steps.get(s) or {}).get("table") for s in stepped_lab | after_ids}
    want = {"end": {x["id"] for x in F["exits"]},
            "gate": {"g:" + g for g in ms("guards", [g["id"] for g in pre])} | {"b:" + b for b in ms("branches", [])} | {"c:" + c for c in ms("catches", [])}
                    | {"a:" + str(g.get("fn")) for g in au.get("gates") or []}
                    | {"l:" + str(l0.get("limiter") or l0.get("class") or "?").lstrip("_") for l0 in (F.get("rate") or {}).get("limits") or []},
            "data": {"s:" + s for s in stepped_lab | after_ids} | {"t:" + t for t in ms("tables", []) if t not in rtabs},
            "shape": ({"q:body"} if shape_body else set()) | {"q:" + f for f in (req_fields or []) if shape_body} | ({"r:reply"} if rsp else set()),
            "inf": {"i:" + ikey(x) for x in (F.get("inflight") or {}).get("rows") or []},
            "stage": {"m:" + str(m) for m in mw} | {"k:" + c for c in ms("cases422", [])},
            "std": {"w:" + w for w in ms("switches", [])} | {"x:" + pr["key"] for pr in pc["rows"] if pr["word"] in ("rare", "only here")}}
    if shape_body and isinstance(r["k"].get("request"), int) and r["k"]["request"] != len(req_fields or []):
        die(f"{lab}: the code map counts {r['k']['request']} request fields, BY MOMENT draws {len(req_fields or [])}")
    if len(want["std"]) - len(ms("switches", [])) != (r["k"].get("pieces") or 0):
        die(f"{lab}: the code map counts {r['k'].get('pieces')} rare pieces, BY MOMENT draws {len(want['std']) - len(ms('switches', []))}")
    sub = {"inf": {"i:" + k for k in ms("inf_answer", []) | ms("inf_server", [])},
           "fn": {"f:" + f for f in ms("datafns", []) | (ms("deciders", []) - deps)},
           "client": {"s:" + s for s in ms("reasons", [])}}
    for f, _a in MO_FAM:
        got = rp[f] | ru[f]
        if rp[f] & ru[f]:
            die(f"{lab}: {f}: {sorted(rp[f] & ru[f])[:3]} both placed and with no moment")
        if f in want and got != want[f]:
            die(f"{lab}: {f}: the records BY MOMENT holds differ from the code map's: only here {sorted(got - want[f])[:3]}, only there {sorted(want[f] - got)[:3]}")
        if f in sub and not sub[f] <= got:
            die(f"{lab}: {f}: the code map counts {sorted(sub[f] - got)[:3]}, which BY MOMENT does not hold")
    n_act = len({x for x in rp["proof"] | ru["proof"] if not x.endswith(":raises")})
    if n_act != ((F.get("tests") or {}).get("act") or 0):
        die(f"{lab}: the code map counts {(F.get('tests') or {}).get('act')} test calls acting on it, BY MOMENT holds {n_act}")
    if n_occ != sum(len(v) for v in occ.values()):
        die(f"{lab}: {n_occ} step occurrences placed or counted, the paths list {sum(len(v) for v in occ.values())}")
    tally["occ"] += n_occ
    el.sort(key=lambda x: (x[1], MO_ORDER.index(x[0]), x[7]))           # stable: within one family, the order the records were read
    for x in el:
        x.pop()
    # the path picker: each ending in time order, under the moment it leaves at; two of one status at one moment are told apart by
    # the first of these that differs between them — their own words, the limiter, their checks, the ending's condition, its line
    frec = {x["id"]: x for x in (fep.get("produced") or []) + (fep.get("framework_exits") or [])}
    lim = {l0.get("exit"): str(l0.get("limiter") or l0.get("class") or "").lstrip("_") for l0 in (F.get("rate") or {}).get("limits") or []}
    chk = {t["x"]["id"]: " · ".join(pre[c].get("pred") or "" for c in t["checks"]) for t in rows if t["x"] is not None}
    tell = (lambda x: says(XS[x]), lim.get, chk.get, lambda x: (frec.get(x) or {}).get("pred"),
            lambda x: _short((frec.get(x) or {}).get("site") or (frec.get(x) or {}).get("at")))
    grp = collections.defaultdict(list)
    for i, x in enumerate(ex):
        x.append(1 if i in live else 0); x.append(None)
        if i in live:
            grp[(x[3], x[1])].append(i)
    for ids in grp.values():
        if len(ids) > 1:
            fc = next(([t(ex[i][0]) for i in ids] for t in tell if all(t(ex[i][0]) for i in ids) and len({t(ex[i][0]) for i in ids}) == len(ids)), None)
            tally["faces"] += fc is None
            for i, f2 in zip(ids, fc or [None] * len(ids)):
                ex[i][5] = f2
    for x in ex:                                                  # D-055: what a path code's hover says — the ending's own words, its limiter
        x.append(says(XS[x[0]]) or None); x.append(lim.get(x[0]) or None)
    pas = [sorted(set().union(*[seen[p] for p in PIDS if EXIT[p] == x[0]])) if x[4] else [] for x in ex]
    # D-055: the code-map members BY MOMENT places, read through the RECORDS the build check above joins (each placed element's
    # records, turned into the member the code map names: an ending, a guard, a table a step touches, a function …); the members of
    # the records that check counts as the code map's own (want · sub); and the keys every placed element is drawn with
    def mem(f, rec, k0):
        p, _c, v = rec.partition(":")
        if f == "end":
            return [("end", rec)]
        if f == "gate":
            return [({"g": "guard", "b": "fork", "c": "catch", "a": "gate", "l": "limiter"}[p], v)]
        if f == "data":
            t = (steps.get(v) or {}).get("table") if p == "s" else v
            return [("table", t)] if t else []
        if f == "fn":
            return [("fn", v)]
        if f == "shape":
            return [("body",)] if rec == "q:body" else [("reply",)] if rec == "r:reply" else [("field", v)]
        if f == "client":                                         # a cache write ("o:") is BY MOMENT's own reading: no field names it
            return [("sender", k0)] if p == "h" else [("screen", v)] if p == "v" else [("reason", v)] if p == "s" else []
        if f == "inf":
            return [("inflight", v)]
        if f == "proof":
            cid = (rec[:-len(":raises")] if rec.endswith(":raises") else rec)[2:].rsplit(":", 1)[0]
            return [("case", cid)] + ([] if rec.endswith(":raises") else [("act", rec)])
        if f == "stage":                                          # the middleware ("m:") is the chain's own step: no field names it
            return [("rule", v)] if p == "k" else []
        if f == "std":
            return [("switch", v)] if p == "w" else [("piece", v)]
        return []
    PM, KM, byrec = set(), set(), {}
    for x in el:                                                  # the placed elements, as drawn (keys, text) — their records are rp
        KM.update(x[2])
    for f in rp:
        for rec in rp[f]:
            k0 = next((e["keys"][0] for e in els if rec in e["rec"] and e["f"] == f and e["keys"]), None) if f == "client" else None
            byrec[(f, rec)] = mem(f, rec, k0)
            PM.update(byrec[(f, rec)])
    PW = {m for f in rp for rec in rp[f] if rec in (want.get(f, set()) | sub.get(f, set())) for m in byrec[(f, rec)]}
    return {"sp": sp, "el": el, "un": un, "ex": ex, "pass": pas, "n": {f: [len(rp[f]), len(ru[f])] for f, _a in MO_FAM if rp[f] or ru[f]},
            "_P": PM, "_Pw": PW, "_K": KM}


MO_ORDER = [f for f, _a in MO_FAM]


# ── 2d · D-055: WHAT BY MOMENT CARRIES OF THE CODE MAP ─────────────────────────────────────────────────────────────────
# His ask 2026-09-26: a switch that dims or hides every field of the code map BY MOMENT already carries, to see what is left. Every
# field the code map draws (its head pairs, its column pairs, its detail pairs and the own checks inside the endings) is read here as
# its MEMBERS — the code map's own identities (the row record's `u`, its detail items, D-053's rows), never the page's words — and a
# member is carried when BY MOMENT places it at a moment on any path (by_moment's _P, read through the records its build check joins).
# An item field (a list, a table's rows) carries each drawn item apart; a count carries all its members or part of them. A field no
# member of which BY MOMENT places (its fates, its alarms, the file, a count of chain steps) stays bright.
#     PROVEN per endpoint: (A) every member BY MOMENT places is drawn there under the key the code map draws it with; (B) a member not
# placed is never drawn there under a key of its own; (C) every record BY MOMENT places that its build check counts as the code map's
# own (want · sub) is a member a code-map field names — so the switch can hide nothing BY MOMENT does not hold, and miss nothing it does.
# The one exception is the data block's: its records are the effects' steps, and a step on a table the code map does not list is
# BY MOMENT holding MORE than the code map, not less — a gap in the code map, said on the page: the tables fields keep their names in
# every look and say how many tables only BY MOMENT holds (state x), and the header counts them.
# Per field: [state, the drawn items' flags, carried, of, the tables only BY MOMENT holds (state x, or p with some)]; states c · p · b,
# e = the field holds nothing on this endpoint (nothing to carry, nothing left out — counted apart, never "left"), x = every element it
# lists is carried AND BY MOMENT holds more of its kind. Three fields hold nothing BY MOMENT could place by construction (a path's
# fate, the chain's length, the proof rank): they are never e, they are what BY MOMENT leaves out.
CV_KINDLESS = ("c:fate", "c:chain", "d:proof")
CV_TABLES = ("c:tables", "d:tables")


def carried(r: dict, L: dict, fj: dict, fep: dict, W: dict) -> None:
    mo, F, U, d, dk, v = r["mo"], L["forms"], r["u"], r["d"], r["dk"], r["v"]
    P, PW, K = mo.pop("_P"), mo.pop("_Pw"), mo.pop("_K")
    XS = {x["id"]: x for x in F["exits"]}
    pre, TO = F.get("preconditions") or [], r["_to"]
    un = lambda k0, pfx: k0[len(pfx):] if isinstance(k0, str) and k0.startswith(pfx) else None
    ends = [("end", i) for i in XS]
    live = lambda cid: v.get(cid) != "absent"
    uu = lambda cid, kind: [(kind, m) for m in U.get(cid) or []] if live(cid) else []
    _rb, _rn, req_fields = body_schema(fep, fj.get("schemas") or {})
    E = "endpoint:" + r["id"]
    acts = [("act", "p:" + cid + ":" + str(c.get("line"))) for cid, tc in sorted((fj.get("test_cases") or {}).items())
            for c in tc.get("calls") or [] if c.get("endpoint") == E and c.get("role") == "act"]
    cases = lambda plus: [("case", t["case"]) for x in F["exits"] for t in x.get("tests") or [] if t.get("case") and (not plus or "+" in str(t.get("conf") or ""))]
    gates = [("gate", str(g.get("fn"))) for g in (F.get("auth") or {}).get("gates") or []]
    lims = [("limiter", str(l0.get("limiter") or l0.get("class") or "?").lstrip("_")) for l0 in (F.get("rate") or {}).get("limits") or []]
    pieces = [("piece", p["key"]) for p in L["feedwide"]["pieces"]["rows"] if p["word"] in ("rare", "only here")]
    fields = [("field", f) for f in req_fields or []] if d.get("request") else []
    # ── every field, as (key, "n" count over members | "i" one entry per drawn item, members) ──
    spec = [("h:method", "n", [("endpoint", r["id"])]),
            ("h:handler", "i", [[("fn", fep.get("handler") or "")], [("file", r.get("file"))]]),
            ("h:entity", "n", [("entity", r["ent"])] if r.get("ent") else []),
            ("h:segment", "n", [("segment", r["seg"])]),
            ("h:declared", "n", [("declared", r["declared"])] if r.get("declared") not in (None, "") else [])]
    COLM = {"all": ends, "stage": ends if live("stage") else [], "tables": uu("tables", "table"), "written": uu("written", "table"), "guards": uu("guards", "guard"),
            "auth": gates if live("auth") else [], "response": [("reply",)] if d.get("response") else [], "acts": acts if live("acts") else [],
            "asserted": cases(True) if live("asserted") else [], "proof": cases(False) if live("proof") else [],
            "branches": uu("branches", "fork"), "catches": uu("catches", "catch"), "rate": lims if live("rate") else [], "fate": [],
            "deciders": uu("deciders", "fn"), "datafns": uu("datafns", "fn"), "request": fields,
            "fetched": [("sender", fb.get("id")) for fb in L["widening"]["fetched_by"]] if live("fetched") else [],
            "reasons": uu("reasons", "reason"), "chain": [], "cases422": uu("cases422", "rule"),
            "inf_answer": uu("inf_answer", "inflight"), "inf_server": uu("inf_server", "inflight"),
            "alarms": [("finding", a) for a in (v["alarms"] if isinstance(v["alarms"], list) else [])],
            "behind": [("fn", un(k0, "fn:")) for k0 in dk.get("behind") or []], "switches": uu("switches", "switch"),
            "pieces": pieces if live("pieces") else [], "lacks": [("lack", x[0]) for x in d["lacks"]]}
    slots = [c[0] for c in COLS if c[2] == "slot"]
    for cid, _a, kind, _arm, _g in COLS:
        if kind == "slot" and cid != slots[0]:
            continue
        if cid not in COLM and kind != "slot":
            die(f"D-055: column {cid} names no members — the switch would not know what it carries")
        spec.append(("c:" + ",".join(slots) if kind == "slot" else "c:" + cid, "n", ends if kind == "slot" else COLM[cid]))
    one = lambda m: [m] if m[-1] else []
    DET = {"exits": [[("end", t["x"]["id"])] if t["x"] is not None else [("guard", t["pre"]["id"])] for t in TO["rows"]],
           "guards": [[("guard", g["id"])] for g in pre],
           "tables": [[("table", t[0])] for t in d["tables"]["items"]], "gateWrites": [[("table", t)] for t in d["gateWrites"]],
           "fates": [[] for _x in d["fates"]["items"]], "gates": [one(m) for m in gates], "limits": [[m] for m in lims],
           "request": ([("body",)] + fields) if d.get("request") else [], "response": [("reply",)] if d.get("response") else [],
           "cases": uu("cases422", "rule"), "deciders": [one(("fn", un(k0, "fn:"))) for k0 in dk["deciders"]],
           "switches": [[("switch", un(x[0], "switch:"))] for x in dk["switches"]], "behind": COLM["behind"], "proof": [],
           "inflight": [[("inflight", un(k0, "inflight:"))] for k0 in dk["inflight"]], "hook": one(("sender", dk.get("hook"))),
           "screens": [("screen", s.get("id")) for s in L["widening"].get("screens") or []],
           "reasons": [[("reason", un(x[0], "reason:"))] for x in dk["reasons"]], "alarms": [[("finding", a[0])] for a in d["alarms"]],
           "pieces": [[("piece", un(k0, "piece:"))] for k0 in dk["pieces"]], "lacks": [[("lack", x[0])] for x in d["lacks"]]}
    ITEMS = {"exits", "guards", "tables", "gateWrites", "fates", "gates", "limits", "deciders", "switches", "inflight", "reasons", "alarms", "pieces", "lacks"}
    if sorted(DET) != sorted(W["codemap"]["details"]):
        die(f"D-055: the code map's pairs and the fields the switch reads differ: {sorted(set(DET) ^ set(W['codemap']['details']))}")
    if [k0 for k0, _t, _m in spec[:5]] != ["h:" + k0 for k0 in W["codemap"]["head"]]:
        die("D-055: the code map's head pairs and the fields the switch reads differ")
    spec += [("d:" + k0, "i" if k0 in ITEMS else "n", DET[k0]) for k0 in W["codemap"]["details"]]
    # ── the key a member is drawn with (D-041), for the proofs ──
    def key(m):
        k0, i = m[0], (m[1] if len(m) > 1 else None)
        if k0 == "end":
            s = XS[i].get("status")
            return None if s in (None, "") else "status:" + str(s)
        if k0 in ("gate", "fn"):
            return "fn:" + i.replace("#", "::") if i else None
        if k0 in ("body", "field"):
            return dk.get("request")
        if k0 == "reply":
            return dk.get("response")
        if k0 in ("sender", "screen"):
            return i
        if k0 == "act":
            return "case:" + i[2:].rsplit(":", 1)[0]
        pfx = {"table": "table", "guard": "guard", "fork": "fork", "catch": "catch", "limiter": "limiter", "reason": "reason",
               "inflight": "inflight", "case": "case", "rule": "rule", "switch": "switch", "piece": "piece"}.get(k0)
        return pfx + ":" + str(i) if pfx and i is not None else None
    allm = {m for _k, t, ms in spec for m in ([x for it in ms for x in it] if t == "i" else ms)}
    # PROOF (A) · (B) · (C) — see the section head
    for m in sorted(P & allm, key=str):
        if key(m) and key(m) not in K:
            die(f"{r['id']}: D-055 — BY MOMENT places {m} by its records, but draws no element under its key {key(m)}")
    pk = {key(m) for m in P if key(m)}
    for m in sorted(allm - P, key=str):
        if key(m) in K and key(m) not in pk:
            die(f"{r['id']}: D-055 — BY MOMENT draws {key(m)} at a moment, but its records place no member of the code map under it ({m})")
    lost = sorted((m for m in PW - allm if m[0] != "table"), key=str)
    extra = sorted({m[1] for m in PW - allm if m[0] == "table"})           # tables BY MOMENT's steps touch that the code map does not list
    if lost:
        die(f"{r['id']}: D-055 — BY MOMENT places members its build check counts as the code map's, which no code-map field names: {lost[:4]}")
    for t in extra:                                                        # said on the page as BY MOMENT's: it must draw each one
        if "table:" + t not in K:
            die(f"{r['id']}: D-055 — the code map lacks table {t}, which BY MOMENT's steps touch, yet BY MOMENT draws it under no key")
    if [k0 for k0 in CV_KINDLESS + CV_TABLES if k0 not in {s0[0] for s0 in spec}]:
        die("D-055: a field the switch names apart is not a field the code map draws")
    cv, nc, ne = {}, 0, 0
    for k0, t, ms in spec:
        if t == "i":
            fl = [1 if it and all(m in P for m in it) else 0 for it in ms]
            a, n = sum(fl), len(fl)
        else:
            ms = list(dict.fromkeys(ms)); fl = None
            a, n = sum(1 for m in ms if m in P), len(ms)
        st = "c" if n and a == n else "p" if a else "b"
        if k0 in CV_KINDLESS:
            if n:
                die(f"{r['id']}: D-055 — {k0} was read as holding nothing BY MOMENT could place, yet names {n} members")
        elif not n:
            st = "e"
        cv[k0] = [st, fl, a, n]
        if extra and k0 in CV_TABLES:
            cv[k0][0] = "x" if st in ("c", "e") else st
            cv[k0].append(extra)
        nc += cv[k0][0] == "c"
        ne += cv[k0][0] == "e"
    r["cv"], r["cvn"] = cv, [nc, len(spec), ne, len(extra)]


def mo_block(rows: list, W: dict, A: dict, blocks: list, tally: collections.Counter) -> dict:
    """The page's BY MOMENT record: each element family's block (read from the ruled tree's homes), the families that are columns,
    the feed-wide counts the info text says; the words file's claims checked against them. Each row's keys become indices into ONE
    list of keys (the same key recurs on many endpoints)."""
    MW, fam = W["mo"], {}
    for f, a in MO_FAM:
        at = A.get(a) or die(f"BY MOMENT: attribute {a} is not in the ruled tree")
        if at.get("shared") or not at.get("home"):
            die(f"BY MOMENT: attribute {a} is homed in no block of its own")
        fam[f] = at["home"]
    if sorted(fam.values()) != sorted(b["key"] for b in blocks):
        die(f"BY MOMENT: every block needs exactly one element family — {sorted(fam.values())}")
    cov, whys = {f: [0, 0] for f, _a in MO_FAM}, collections.Counter()
    for r in rows:
        for f, (a, b) in r["mo"]["n"].items():
            cov[f][0] += a; cov[f][1] += b
        whys.update(u[3] for u in r["mo"]["un"])
    untimed = [f for f, _a in MO_FAM if not sum(cov[f])]
    if sorted(untimed) != sorted(MW["band"]["untimed"]):
        die(f"BY MOMENT: the words say {sorted(MW['band']['untimed'])} happen in no time, the feed places nothing for {untimed}")
    if sorted(MW["why"]) != sorted(MO_WHY) or set(whys) - set(MO_WHY):
        die(f"BY MOMENT: the reasons the words name and the build gives differ: {sorted(set(MW['why']) ^ set(MO_WHY))} {sorted(set(whys) - set(MO_WHY))}")
    if sorted(MW["moms"]) != sorted(MO_PRE + MO_POST + tuple(MO_RANK)):
        die(f"BY MOMENT: the moments the words name are not the spine's: {sorted(MW['moms'])}")
    for g, O in MW["opt"].items():
        if O.get("pick") not in (O.get("opts") or {}):
            die(f"mo.opt.{g}: its default {O.get('pick')!r} is not one of its options")
        if "ruled" in O and not re.fullmatch(r"D-\d{3}", str(O["ruled"])):           # his default names the ruling (D-055), like a rail's
            die(f"mo.opt.{g}: `ruled` must name the ruling (D-nnn), not {O['ruled']!r}")
    KT = {}
    for r in rows:
        for x in r["mo"]["el"]:
            x[2] = [KT.setdefault(k, len(KT)) for k in x[2]]
        for x in r["mo"]["un"]:
            x[1] = [KT.setdefault(k, len(KT)) for k in x[1]]
    # how each step occurrence (a step on one path) was placed — once per path it is on, so the sum is the occurrences, not the steps
    src = {k: tally.get("src:" + k, 0) for k in MO_SRC}
    if sum(src.values()) != tally["occ"]:
        die(f"BY MOMENT: the data-effects sources add up to {sum(src.values())}, the paths list {tally['occ']} step occurrences")
    if sorted(TOKEN.findall(MW["src"])) != sorted(["{occ}"] + ["{" + k + "}" for k in MO_SRC]):
        die(f"BY MOMENT: the words' source line says {sorted(TOKEN.findall(MW['src']))}, the build counts {list(MO_SRC)}")
    return {"fam": fam, "timed": [f for f, _a in MO_FAM if f not in untimed], "untimed": untimed, "cov": cov, "why": dict(whys),
            "src": src, "occ": tally["occ"], "off": tally["off"], "offocc": tally["offocc"], "faces": tally["faces"], "keys": list(KT)}


def run_facts(target: str, forms: Path, archmap: Path, tmp: Path, cache: Path | None, key: str) -> dict:
    name = hashlib.sha1((key + "|" + target).encode()).hexdigest()[:16] + ".js"
    if cache:
        hit = cache / name
        if hit.is_file():
            return parse_labep(hit)
    out = tmp / name
    r = subprocess.run([sys.executable, str(FACTS), target, "--forms", str(forms), "--archmap", str(archmap), "--out", str(out)],
                       capture_output=True, text=True, cwd=str(HERE))
    if r.returncode != 0 or not out.is_file():
        die(f"gen-endpoint-facts.py failed for {target}: {(r.stderr or r.stdout).strip()[-400:]}")
    if cache:
        cache.mkdir(parents=True, exist_ok=True)
        (cache / name).write_bytes(out.read_bytes())
    return parse_labep(out)


def parse_labep(p: Path) -> dict:
    s = p.read_text(encoding="utf-8")
    i = s.index("window.LABEP = ") + len("window.LABEP = ")
    return json.JSONDecoder().raw_decode(s, i)[0]


def arm_state(fj: dict, arm) -> tuple[bool, str | None]:
    if arm is None:
        return True, None
    name, part = arm
    a = (fj.get("arms") or {}).get(name) or {}
    if not a.get("present"):
        return False, a.get("reason") or name
    if part:
        pt = (a.get("parts") or {}).get(part) or {}
        if not pt.get("present"):
            return False, pt.get("reason") or f"{name}.{part}"
    return True, None


def after_writes(fp: dict | None, steps: dict) -> list:
    """The write steps a path runs AFTER the answer has started (a streamed reply's own code). The lab's path record keeps
    only the steps before the answer, so these are read from the feed's path, by id."""
    out = []
    for a in ((fp or {}).get("effects") or {}).get("after_response") or []:
        st = steps.get(a.get("step")) or {}
        if st.get("op") in WRITE_OPS and not a.get("dependency"):
            out.append({"step": a.get("step"), "table": st.get("table"), "op": st.get("op"), "fn": st.get("fn")})
    return out


def fate_of(p: dict, after: list) -> str:
    """One path's fate: what became of the endpoint's OWN writes on it (the login check's writes are the gate's, left out).
    A path whose own writes all run after the answer has started is `after`: they are the stream's, not the answer's."""
    b = {s.get("bucket") for s in p["effects"]["steps"] if not s.get("dependency") and s.get("op") in WRITE_OPS}
    return ("saved" if "committed" in b else "maybe" if "maybe_committed" in b else "rolled" if "rolled_back" in b
            else "unsaved" if "uncommitted" in b else "after" if after else "none")


def body_schema(fep: dict, schemas: dict) -> tuple:
    """The JSON body an endpoint reads, from the feed alone: FastAPI adds its body-parse endings on every endpoint whose
    handler reads a body (paths.framework), and the validation ending names the body's schemas (short.schema). The TOP one
    is the listed schema no other listed schema's field names in its annotation. → (reads_body, name | None, fields | None)."""
    reads = any(x.get("phase") == "body-parse" for x in (fep.get("framework_exits") or []))
    if not reads:
        return False, None, None
    listed = sorted({s for x in (fep.get("produced") or []) if x.get("phase") == "validation" for s in (x.get("schemas") or [])})
    known = [s for s in listed if s in schemas]
    nested = {t for s in known for f in (schemas[s].get("fields") or []) for t in known
              if t != s and re.search(r"\b" + re.escape(schemas[t].get("cls") or t.split(":", 1)[-1]) + r"\b", str(f.get("annotation") or ""))}
    top = [s for s in known if s not in nested]
    if len(top) != 1 or schemas[top[0]].get("variants"):
        return True, None, None
    return True, schemas[top[0]].get("cls"), [f.get("name") for f in (schemas[top[0]].get("fields") or [])]


def reply_fields(F: dict, lab_resp: dict) -> tuple:
    """The fields of the body a success answers with: the contract arm's reading of each success response first (every
    `r:` row that names its fields), the lab's reading of the declared reply model second.
    → ("fields", [names]) · ("none", None) no reply model is named · ("unknown", name) a model is named, its fields unread."""
    rs = [r for k2, r in sorted((F.get("responses") or {}).items()) if k2.startswith("r:")]
    named = [r for r in rs if r.get("fields") is not None]
    if named:
        return "fields", sorted({f for r in named for f in r["fields"]})
    if lab_resp.get("present"):
        return "fields", [c[0] for c in (lab_resp.get("cols") or [])] + ["+"] * (lab_resp.get("cols_more") or 0)
    name = lab_resp.get("name") or next((r.get("model") for r in rs if r.get("model")), None)
    return ("unknown", name) if name else ("none", None)


def distill(L: dict, fj: dict, W: dict) -> dict:
    F = L["forms"]
    fep = (fj.get("endpoints") or {}).get("endpoint:" + L["identity"]["label"])
    if fep is None:
        die(f"{L['identity']['label']}: the feed holds no endpoint record under this label")
    fsteps = fj.get("steps") or {}
    fpaths = {p.get("id"): p for p in (fep.get("paths") or [])}
    if F.get("state") != "present" or F.get("endpoint") is None:
        die(f"{L['identity']['label']}: the facts carry no forms block ({F.get('state')}: {F.get('reason')})")
    ident = L["identity"]
    ep = F["endpoint"]
    v, k, why, u = {}, {}, {}, {}
    Z = W["cols"]

    def put(cid, value, key, zero_why=None, members=None):
        """zero_why is ALWAYS the words file's line for the column (a fact about the code, D-017) — never a reader's reason.
        members: the things a count counts, by identity, so a group row can count a thing several endpoints share once."""
        v[cid], k[cid] = value, key
        if zero_why and not key:
            why[cid] = zero_why
        if members is not None:
            u[cid] = sorted(set(members))
            if len(u[cid]) != key:
                die(f"{ident['label']} · {cid}: {key} drawn but {len(u[cid])} distinct things counted — the identity key is wrong")

    def unknown(cid, line):
        v[cid], k[cid], why[cid] = "unknown", None, line

    exits = F["exits"]
    for x in exits:
        if x.get("kind") != "success" and x.get("phase") not in PHASE_STAGE:
            die(f"{ident['label']}: an ending leaves from phase {x.get('phase')!r}, which no stage holds")
    stage_of = lambda x: "ANSWER" if x["kind"] == "success" else PHASE_STAGE[x["phase"]]
    by_kind = collections.Counter(x["kind"] for x in exits)
    for kd in KINDS5:
        put("e_" + kd, by_kind.get(kd, 0), by_kind.get(kd, 0), Z["e_" + kd]["zero"])
    if set(by_kind) - set(KINDS5):
        die(f"{ident['label']}: an ending kind outside D-012's five: {sorted(set(by_kind) - set(KINDS5))}")
    put("all", len(exits), len(exits), Z["all"]["zero"])
    st = collections.Counter(stage_of(x) for x in exits)
    put("stage", dict(st), sum(1 for n in st.values() if n), None)

    tables = L["data"]["tables"]
    put("tables", len(tables), len(tables), Z["tables"]["zero"], [t["table"] for t in tables])
    # WRITES: the tables the endpoint's OWN code writes. The map's written tables, with every table the effects arm sees
    # written ONLY by the login check (a dependency step) taken out — those are the gate's, named apart in the side panel —
    # and with the tables its own steps write, before the answer or after it, added.
    own_w, dep_w, after_all = set(), set(), {}
    for p in F["paths"]:
        for s2 in p["effects"]["steps"]:
            if s2.get("op") in WRITE_OPS and s2.get("table"):
                (dep_w if s2.get("dependency") else own_w).add(s2["table"])
        after_all[p["id"]] = after_writes(fpaths.get(p["id"]), fsteps)
        own_w |= {a["table"] for a in after_all[p["id"]] if a.get("table")}
    gate_only = dep_w - own_w
    map_w = {t["table"] for t in tables if t["rw"] in ("w", "rw")}
    wr = sorted((map_w - gate_only) | own_w)
    put("written", len(wr), len(wr), Z["written"]["zero"], wr)
    pre = F.get("preconditions") or []
    put("guards", len(pre), len(pre), Z["guards"]["zero"], [g["id"] for g in pre])
    au = F.get("auth") or {}
    schemes = sorted({str(s.get("scheme")) for s in (au.get("schemes") or [])})
    # a login check with no declared scheme (the token read by the check itself, e.g. from the query string) is a login,
    # not "none": the value says so in the words file's own label
    login = "+".join(schemes) or (W["authNoScheme"] if au.get("gates") else "none")
    put("auth", login, login)
    if login == W["authNoScheme"]:
        why["auth"] = W["authNoSchemePlain"]
    lims = sorted({str(l.get("limiter") or l.get("class") or "?").lstrip("_") for l in ((F.get("rate") or {}).get("limits") or [])})
    put("rate", "+".join(lims) or "none", "+".join(lims) or "none")

    # REQUEST: the JSON body it reads, from the feed (see body_schema); no body is a zero, a body whose top schema the
    # feed names no fields for is unknown — never a zero, and never the map's guess at a schema it happens to touch
    reads_body, req_name, req_fields = body_schema(fep, fj.get("schemas") or {})
    if not reads_body:
        put("request", 0, 0, Z["request"]["zero"])
    elif req_fields is None:
        unknown("request", Z["request"]["unknown"])
    else:
        put("request", len(req_fields), len(req_fields), Z["request"]["zero"])
    # REPLY: see reply_fields; a model named but unread is unknown, never a zero
    rstate, rval = reply_fields(F, L["data"]["schemas"]["response"])
    if rstate == "fields":
        put("response", len(rval), len(rval), Z["response"]["zero"])
    elif rstate == "none":
        put("response", 0, 0, Z["response"]["zero"])
    else:
        unknown("response", Z["response"]["unknown"].replace("{model}", rval))

    tst = F.get("tests") or {}
    acts = tst.get("act") or 0
    put("acts", acts, acts, Z["acts"]["zero"])
    past = sum(1 for x in exits for t in (x.get("tests") or []) if "+" in str(t.get("conf") or ""))
    put("asserted", past, past, Z["asserted"]["zero"])
    # PROVEN: an ending a test proves ON ITS OWN. A test whose status fits several endings ("ambiguous of N") proves none
    # of them: it is counted apart, as the third number, and drawn in the hover only
    sure = lambda t: not str(t.get("conf") or "").startswith("ambiguous")
    tested = sum(1 for x in exits if any(sure(t) for t in (x.get("tests") or [])))
    amb = sum(1 for x in exits if x.get("tests") and not any(sure(t) for t in x["tests"]))
    put("proof", [tested, len(exits), amb], round(tested / len(exits), 4) if exits else 0, Z["proof"]["zero"])

    br = F.get("branches") or []
    put("branches", len(br), len(br), Z["branches"]["zero"], [b["id"] for b in br])
    cat = (F.get("failure") or {}).get("catches") or []
    put("catches", len(cat), len(cat), Z["catches"]["zero"], [c["id"] for c in cat])

    fate = collections.Counter()
    fns = set()
    for p in F["paths"]:
        steps = p["effects"]["steps"]
        if sorted({s["table"] for s in steps if s.get("table") and s.get("op") in WRITE_OPS}) != p["effects"]["writes"]:
            die(f"{ident['label']} {p['id']}: the write ops restated here no longer match gen-endpoint-facts' writes — re-read eff_rec")
        fns |= {s["fn"] for s in steps if s.get("fn") and not s.get("dependency")}
        fate[fate_of(p, after_all[p["id"]])] += 1
    put("fate", {f: fate.get(f, 0) for f in FATES}, fate.get("saved", 0), Z["fate"]["zero"])
    put("datafns", len(fns), len(fns), Z["datafns"]["zero"], fns)
    inside = F.get("inside") or {}
    dec = [f for f in (inside.get("functions") or []) if f.get("refusals") or any(r.get("here") for r in (f.get("raises") or []))]
    put("deciders", len(dec), len(dec), Z["deciders"]["zero"], [f.get("fn") or f.get("name") for f in dec])
    sw = F.get("switches") or []
    put("switches", len(sw), len(sw), Z["switches"]["zero"], [w["id"] for w in sw])

    fb = L["widening"]["fetched_by"]
    put("fetched", len(fb), len(fb), Z["fetched"]["zero"])
    rs = F["frontend"].get("reason_sites") or []
    put("reasons", len(rs), len(rs), Z["reasons"]["zero"], [s2["id"] for s2 in rs])
    put("chain", F["counts"]["steps_max"], F["counts"]["steps_max"], Z["chain"]["zero"])
    cases = [c["id"] for x in exits for c in (x.get("cases") or []) if isinstance(c, dict)]
    if len(cases) != F["counts"]["cases"]:
        die(f"{ident['label']}: {F['counts']['cases']} validation cases counted, {len(cases)} carried on its endings")
    put("cases422", len(cases), len(cases), Z["cases422"]["zero"], cases)

    inf = F.get("inflight") or {}
    ikey = lambda r: r.get("ref") or "|".join(str(r.get(q)) for q in ("kind", "name", "set_at"))
    for d_, cid in (("with the answer", "inf_answer"), ("with the server process", "inf_server")):
        rows_ = [ikey(r) for r in (inf.get("rows") or []) if r.get("dies") == d_]
        put(cid, len(rows_), len(rows_), Z[cid]["zero"], rows_)

    al = [f["id"] for f in (F.get("findings") or [])]
    al += [f["id"] for fs in (F.get("arm_findings") or {}).values() for f in fs]
    al += [f.get("id") for f in (F["frontend"].get("findings") or []) if f.get("id")]
    al = sorted(set(al))
    put("alarms", al, len(al), Z["alarms"]["zero"])
    beh = L["functions"]["behind"].get("fns") or 0
    put("behind", beh, beh, Z["behind"]["zero"])
    pc = L["feedwide"]["pieces"]
    bw = {w: pc["by_word"].get(w, 0) for w in PIECE_WORDS}
    put("pieces", bw, bw["rare"] + bw["only here"], Z["pieces"]["zero"])
    put("lacks", len(pc["missing_norms"]), len(pc["missing_norms"]), Z["lacks"]["zero"])

    # an arm the feed lacks reads "absent", never 0 — decided by the feed's own arm record, before anything is drawn
    for cid, _a, _k, arm, _g in COLS:
        on, reason = arm_state(fj, arm)
        if not on:
            v[cid], k[cid] = "absent", None
            why[cid] = reason
            u.pop(cid, None)
    if (F.get("inflight") or {}).get("state") not in (None, "present") and v["inf_answer"] != "absent":
        for cid in ("inf_answer", "inf_server"):
            v[cid], k[cid], why[cid] = "absent", None, (F["inflight"].get("why") or F["inflight"].get("state"))
            u.pop(cid, None)
    if (inside.get("state") not in (None, "present")) and v["deciders"] != "absent":
        v["deciders"], k["deciders"], why["deciders"] = "absent", None, inside.get("why") or inside.get("state")
        u.pop("deciders", None)

    # ── the side panel's detail: small lists, words kept as the facts wrote them ──
    fsw = {w.get("id"): w for w in ((fep or {}).get("switches") or [])}
    def cap(xs):
        return {"items": xs[:CAP], "more": max(0, len(xs) - CAP)}
    TO = time_order(F, fep, fj, ident, W["endings"])                    # D-053: the endings in the order they happen
    says = lambda x: (x.get("detail") or x.get("code") or x.get("via") or x.get("reason") or "")[:70]
    def place(g):                                                       # where a check stands: the handler's call it sits in, else its own line
        m = VIA_CALL.match(str(g.get("via") or ""))
        return f"{m.group(1)} @ {_short(m.group(2))}:{m.group(3)}" if m else _short(g.get("at"))
    det = {
        # D-053: ONE endings table, every ending in time order and never capped (a cap would cut the end of the story), each own
        # check on its ending's row (xd.exits says which), a check the feed ties to no ending on a row of its own:
        # [kind, stage, status, what it says, tests, who decides it when shared code does] · moms: [catch at, class caught, calls]
        "exits": {"items": [[x["kind"], stage_of(x), x.get("status"), says(x), len(x.get("tests") or []), (t["who"] or [None])[0]] if x
                            else [None, None, t["pre"].get("status"), None, None, None] for t in TO["rows"] for x in [t["x"]]],
                  "more": 0, "moms": TO["moms"]},
        "tables": cap([[t["table"], t["rw"]] for t in tables]),
        # each path's fate, in the endings' time order and never capped either: the two lists end at the same place (D-053)
        "fates": {"items": [[p["names"]["drawn"], p.get("status"), fate_of(p, after_all[p["id"]])] for p in TO["paths"]], "more": 0},
        "gateWrites": sorted(gate_only),
        # every check, drawn on its ending's row (so never capped either): [status, its condition, where it stands]
        "guards": {"items": [[g.get("status"), (g.get("pred") or "")[:80], place(g)] for g in pre], "more": 0},
        "gates": [g.get("name") for g in ((F.get("auth") or {}).get("gates") or [])],
        "limits": [[str(l.get("limiter") or "").lstrip("_"), next((a.get("value") for a in (l.get("args") or []) if a.get("param") == "limit"), None),
                    next((a.get("value") for a in (l.get("args") or []) if a.get("param") == "window_seconds"), None)] for l in ((F.get("rate") or {}).get("limits") or [])],
        "request": [req_name, (req_fields or [])[:CAP]] if req_name else None,
        "response": [next((r.get("model") for k2, r in sorted((F.get("responses") or {}).items()) if k2.startswith("r:") and r.get("model")), None)
                     or L["data"]["schemas"]["response"].get("name"), k["response"]] if k["response"] else None,
        "cases": dict(sorted(F["counts"].get("cases_by_type", {}).items())),
        "deciders": cap([f.get("name") for f in dec]),
        # a switch is named by its port, else the settings it reads, else the condition it tests — a handler flag carries only
        # that, and only in the FEED's record (the lab's copy drops `pred`), so the feed's switch of the same id is read for it
        "switches": cap([[w.get("kind"), w.get("port") or ", ".join(sorted(w.get("settings") or [])) or (w.get("expr") or fsw.get(w.get("id"), {}).get("pred") or "")[:80]] for w in sw]),
        "behind": [L["functions"]["behind"].get("fns"), L["functions"]["behind"].get("depth")],
        "proof": {k2: L["feedwide"]["proof"].get(k2) for k2 in ("tested", "produced", "rank", "rank_to", "of")},
        "inflight": cap([[r.get("kind"), r.get("name"), r.get("dies")] for r in (inf.get("rows") or [])]),
        "hook": (F["frontend"].get("hook") or {}).get("piece", "").split("#")[-1] or None,
        "screens": len(L["widening"].get("screens") or []),
        "reasons": cap([[s.get("at"), s.get("branch"), s.get("does_state")] for s in rs]),
        # [id, status, its words, the statuses it names, the arm that found it] — the statuses and the arm ride apart so the code
        # map draws each as a chip (D-043); the words keep the same text, so what the column is read to hold does not move
        "alarms": [[f["id"], f.get("status"), ", ".join(str(d) for d in (f.get("details") or f.get("statuses") or []))[:80],
                    [s for s in (f.get("statuses") or []) if isinstance(s, int)], None] for f in (F.get("findings") or [])]
                  + [[f["id"], None, a, [], a] for a, fs in (F.get("arm_findings") or {}).items() for f in fs],
        "pieces": cap([[r["words"], r["n"], r["of"], r["word"]] for r in pc["rows"] if r["word"] in ("rare", "only here")]),
        "lacks": [[r["words"], r["n"], r["of"]] for r in pc["missing_norms"]],
    }
    method, path = ident["method"], ident["path"]
    return {"id": ident["label"], "m": method, "p": path, "ent": ep.get("entity") or ident.get("entity"),
            "seg": path.strip("/").split("/")[0] or "/", "file": ident.get("file"), "line": ep.get("line"),
            "fn": (ep.get("handler") or "").split("::")[-1], "full": ep.get("full_path"), "declared": ident.get("status"),
            "labels": sorted({f"{stage_of(x)}:{x.get('status')}" for x in exits}),
            "v": v, "k": k, "why": why, "u": u, "d": det,
            # D-043: what the code map's chips need beside the detail lists, parallel to their items — kept OUT of `d`, so the words
            # the gaps are read against (every string `d` holds) do not move: each path's kind of ending, and each piece's family and
            # value from its key (a status, a method or a switch kind in a piece's own sentence is drawn as its chip)
            # D-053: per endings row [its moment, the checks on it (indices into d.guards), the ending's id — or the check's, on a row
            # of its own —, the framework's own code for it (the hover), the call a check of its own row sits inside]; `en` the INPUT
            # facts the info text says for this endpoint; kept out of `d` like the rest of xd: the moment words are the words file's
            "_to": TO,
            "xd": {"exits": [[t["mom"], t["checks"], t["id"], (t["who"] or [None, None, None])[2], t.get("call")] for t in TO["rows"]],
                   "en": TO["notes"],
                   "fates": [p["kind"] for p in TO["paths"]],
                   "pieces": [[x.get("family"), (x.get("key") or "").split(":", 1)[-1]] for x in pc["rows"] if x["word"] in ("rare", "only here")][:CAP],
                   "lacks": [[x.get("family"), (x.get("key") or "").split(":", 1)[-1]] for x in pc["missing_norms"]]}}


# ── 3 · ONE IDENTITY KEY SPACE (D-041) ─────────────────────────────────────────────────────────────────────────────
# Every element the universe column and the code-map column draw carries a key `<kind>:<identity>`, the identity being the one
# the row record already holds its members by (`u`) — `table:households`, `guard:g:5d7ccde2a0`, `fn:apps/api/db.py::get_session`
# — or the feed's own id (`schema:X`, `flag:X`, `fe:…#name`, `endpoint:M /p`, `setting:x`, a piece's key). The aliases are READ
# from the feeds: a model class is its table (the c4 graph's model nodes, checked against the forms feed's models), a callee
# NAME is the one qualified function the feeds hold for it (else no key), a condition names the settings and flags it reads.
# A row holds a key when its universe card or its code map draws it; `ck` says which table columns count it ("id" = the
# identity cell). Nothing here is drawn as a number the page did not already draw.
IDN = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")
KEY_COLS = ("tables", "written", "guards", "branches", "catches", "datafns", "deciders", "switches", "reasons", "cases422",
            "inf_answer", "inf_server")
KEY_KIND = {"tables": "table", "written": "table", "guards": "guard", "branches": "fork", "catches": "catch", "datafns": "fn",
            "deciders": "fn", "switches": "switch", "reasons": "reason", "cases422": "rule", "inf_answer": "inflight", "inf_server": "inflight"}


def key_index(fj: dict, am: dict, feeds: dict) -> dict:
    """The feed-wide readings every key is resolved through, built once."""
    G, m2t, node_t, schemas, flags = feeds["graph"], {}, {}, set(), set()
    for e in (G.get("l2") or {}).values():
        for p in e.get("nodes") or []:
            if p.get("kind") == "model" and p.get("table"):
                m2t[p["label"]] = p["table"]; node_t[p["id"]] = p["table"]
            elif p.get("kind") == "schema":
                schemas.add(p["label"])
            elif p.get("kind") == "flag":
                flags.add(p["label"])
    n_c4 = len(m2t)
    for m in (fj.get("models") or {}).values():                      # the forms feed's own model → table, beside the c4 graph's
        c, t = m.get("cls"), m.get("table")
        if c and t and m2t.get(c, t) != t:
            die(f"model {c}: the c4 graph maps it to table {m2t[c]}, the forms feed to {t} — the alias would join two things")
        if c and t:
            m2t.setdefault(c, t)
    fq = set(am.get("function_insight") or {}) | set((am.get("guard_insight") or {}).get("functions") or {})
    fq |= {el["file"] + "::" + f for el in (am.get("element_census") or {}).get("elements") or [] for f in el.get("fns") or []}
    fq |= set(fj.get("functions") or {}) | set(fj.get("dependencies") or {}) | {s["fn"] for s in (fj.get("steps") or {}).values() if s.get("fn")}
    fq |= {i.replace("#", "::") for i in feeds["lvfns"]}
    short = collections.defaultdict(set)
    for q in fq:
        if "::" in q:
            short[q.split("::", 1)[1]].add(q)
    settings = {k.split(":", 1)[1] for k in (fj.get("settings") or {}) if k.startswith("setting:")}
    # the cases whose calls ACT on each endpoint (D-042): the tests column counts those calls, so it counts these cases
    acts, act_calls = collections.defaultdict(set), collections.Counter()
    for cid, t in (fj.get("test_cases") or {}).items():
        for c in t.get("calls") or []:
            if c.get("role") == "act" and c.get("endpoint"):
                acts[c["endpoint"]].add(cid); act_calls[c["endpoint"]] += 1
    return {"m2t": m2t, "node_t": node_t, "schemas": schemas, "short": short, "settings": settings, "nAlias": len(m2t), "nAliasC4": n_c4,
            "acts": acts, "actCalls": act_calls,
            "flags": (set(am.get("flags") or {}) | flags) - settings, "unkeyed": set(), "names": set()}


def keyspace(r: dict, L: dict, fep: dict, X: dict, CL: dict, jreal: str) -> None:
    """Adds to one row: `ck` {table column or "id": [keys]}, `hk` the code map's head pairs' keys, `dk` the keys of every item
    of its detail pairs (parallel to the items), `uni.rows[*].keys` (parallel to what each station row draws) and the
    signature's parts; and to CL the label of every key whose identity is not readable (a guard's condition, a switch …)."""
    F, d, u, v = L["forms"], r["d"], r["u"], r["v"]
    tkey = lambda name: (("table:" + X["m2t"][name]) if name in X["m2t"] and name not in X["schemas"] else ("schema:" + name)) if name else None
    stat = lambda s: None if s is None or s == "" else "status:" + str(s)
    fkey = lambda q: ("fn:" + q.replace("#", "::")) if q else None
    def nkey(w):                                     # a name a condition reads: a setting of the forms feed, else a flag
        return "setting:" + w if w in X["settings"] else "flag:" + w if w in X["flags"] else None
    def reads(*texts):
        return sorted({k for t in texts for w in IDN.findall(str(t or "")) for k in [nkey(w)] if k})
    own = set(u.get("datafns") or []) | set(u.get("deciders") or []) | {fep.get("handler") or ""}
    own |= {p["id"].replace("#", "::") for lv in (L["functions"].get("walk") or []) for p in lv}
    own |= {g.get("fn") or (g.get("resolved") or {}).get("key") for g in L["security"].get("guards") or []}
    def callee(n):                                   # a callee NAME → the one qualified function the feeds hold for it
        X["names"].add(n)
        c = X["short"].get(n) or set()
        c = c if len(c) == 1 else c & own
        if len(c) != 1:
            X["unkeyed"].add(n)
            return None
        return fkey(next(iter(c)))
    def node(i):                                     # a station node id: a model is its table; every other id is its own key
        if i.startswith("model:"):
            t = X["node_t"].get(i) or X["m2t"].get(i[6:])
            return "table:" + t if t else i
        if i.startswith("flag:"):
            return nkey(i[5:]) or i
        return i
    # ck: every key a column holds; cd: the ones it COUNTS as members; cv: the ones it holds only THROUGH another element (a
    # member's condition reads it, a rule is on its schema) — D-042 tells "counted, not named" from "shown another way" by them
    ck, cd, cv = collections.defaultdict(set), collections.defaultdict(set), collections.defaultdict(set)
    def to(col, *ks, via=False):
        if v.get(col) != "absent":
            ks = [k for k in ks if k]
            ck[col].update(ks)
            (cv if via else cd)[col].update(ks)
    # the members the row record already holds by identity — the same ids, under their kind
    for c in KEY_COLS:
        for m in u.get(c) or []:
            to(c, fkey(m) if KEY_KIND[c] == "fn" and "::" in m else callee(m) if KEY_KIND[c] == "fn" else KEY_KIND[c] + ":" + m)
    pre, sws = F.get("preconditions") or [], F.get("switches") or []
    fsw = {w.get("id"): w for w in fep.get("switches") or []}
    gk = [reads(g.get("pred")) for g in pre]
    swk = [reads(" ".join(sorted(w.get("settings") or [])), w.get("expr"), w.get("pred"), fsw.get(w.get("id"), {}).get("pred"),
                 *[b.get("pred") for b in fsw.get(w.get("id"), {}).get("branches") or []]) for w in sws]
    for ks in gk:
        to("guards", *ks, via=True)                  # a member holds the names its condition reads
    for ks in swk:
        to("switches", *ks, via=True)
    inf = [x for x in ((F.get("inflight") or {}).get("rows") or [])]
    ikey = lambda x: x.get("ref") or "|".join(str(x.get(q)) for q in ("kind", "name", "set_at"))
    for x in inf:
        to("inf_answer" if x.get("dies") == "with the answer" else "inf_server", *reads(" ".join(x.get("fields") or [])), via=True)
    rs = F["frontend"].get("reason_sites") or []
    for s in rs:
        to("reasons", "file:" + str(s.get("at") or "").rsplit(":", 1)[0] if s.get("at") else None, via=True)
    for m in u.get("cases422") or []:
        sm = re.match(r"case:schema:([^/]+)/", m)
        to("cases422", tkey(sm.group(1)) if sm else None, via=True)
    # the tests column counts the calls that ACT on this endpoint (D-042): it holds the cases that make them, and its count is
    # proven to be theirs
    if v.get("acts") != "absent":
        if X["actCalls"].get("endpoint:" + r["id"], 0) != r["k"]["acts"]:
            die(f"{r['id']}: the tests column draws {r['k']['acts']} act calls, the feed's cases make {X['actCalls'].get('endpoint:' + r['id'], 0)}")
        to("acts", *["case:" + c for c in sorted(X["acts"].get("endpoint:" + r["id"]) or [])])
    exits = F["exits"]
    for x in exits:
        to("e_" + x["kind"], stat(x.get("status"))); to("all", stat(x.get("status")))
        for t in x.get("tests") or []:
            to("proof", "case:" + t["case"] if t.get("case") else None)
            if "+" in str(t.get("conf") or ""):
                to("asserted", "case:" + t["case"] if t.get("case") else None)
    au = F.get("auth") or {}
    to("auth", *[fkey(g.get("fn")) for g in au.get("gates") or []])
    lims = [str(l.get("limiter") or l.get("class") or "?").lstrip("_") for l in ((F.get("rate") or {}).get("limits") or [])]
    to("rate", *["limiter:" + n for n in lims])
    to("alarms", *["finding:" + a for a in (v["alarms"] if isinstance(v["alarms"], list) else [])])
    prow = [p for p in L["feedwide"]["pieces"]["rows"] if p["word"] in ("rare", "only here")]
    to("pieces", *["piece:" + p["key"] for p in prow])
    to("request", tkey((d.get("request") or [None])[0]))
    to("response", tkey((d.get("response") or [None])[0]))
    to("fetched", *[f.get("id") for f in L["widening"]["fetched_by"]])
    hk = {"method": "endpoint:" + r["id"], "handler": [fkey(fep.get("handler")), "file:" + r["file"] if r.get("file") else None],
          "entity": "entity:" + r["ent"] if r.get("ent") else None, "segment": None, "declared": stat(r.get("declared"))}
    ck["id"].update(k for k in (hk["method"], *hk["handler"], hk["entity"]) if k)
    r["hk"] = hk
    # the code map's detail items, one key list per item, in the order the items are drawn
    lab = lambda k, t: CL.__setitem__(k, str(t)[:90]) if k else None
    for g in pre:
        lab("guard:" + g["id"], f"{g.get('status')} · {g.get('pred') or ''}")
    for b in F.get("branches") or []:
        lab("fork:" + b["id"], b.get("pred") or b.get("call"))
    for c in (F.get("failure") or {}).get("catches") or []:
        lab("catch:" + c["id"], c.get("at"))
    for w in sws:
        lab("switch:" + w["id"], f"{w.get('kind')} · " + (w.get("port") or ", ".join(sorted(w.get("settings") or [])) or str(w.get("expr") or fsw.get(w.get("id"), {}).get("pred") or "")))
    for s in rs:
        lab("reason:" + s["id"], f"{s.get('at')} · {s.get('branch')}")
    for x in inf:
        lab("inflight:" + ikey(x), f"{x.get('kind')} · {x.get('name')}")
    for m in u.get("cases422") or []:
        lab("rule:" + m, m.split(":", 2)[-1])
    for p in prow:
        lab("piece:" + p["key"], p["words"])
    cap = lambda xs: xs[:CAP]
    TO = r["_to"]
    # D-053: the endings rows in time order, uncapped — [the status, the cases its tests are, who decides it when shared code does];
    # a check's own row keys its status as the check's list did
    dk = {"exits": [[stat(x.get("status")), sorted({"case:" + t["case"] for t in x.get("tests") or [] if t.get("case")}), (t0["who"] or [None, None])[1]] if x
                     else [stat(t0["pre"].get("status")), [], None] for t0 in TO["rows"] for x in [t0["x"]]],
          "tables": ["table:" + t["table"] for t in cap(L["data"]["tables"])],
          "gateWrites": ["table:" + t for t in d["gateWrites"]],
          "fates": [stat(p.get("status")) for p in TO["paths"]],
          "guards": [["guard:" + g["id"], ks, stat(g.get("status"))] for g, ks in zip(pre, gk)],
          "gates": [fkey(g.get("fn")) for g in au.get("gates") or []],
          "limits": ["limiter:" + n for n in lims],
          "request": tkey((d.get("request") or [None])[0]), "response": tkey((d.get("response") or [None])[0]),
          "deciders": [fkey(f.get("fn")) if f.get("fn") else callee(f.get("name")) for f in cap([f for f in (F.get("inside") or {}).get("functions") or []
                       if f.get("refusals") or any(q.get("here") for q in (f.get("raises") or []))])],
          "switches": [["switch:" + w["id"], ks] for w, ks in cap(list(zip(sws, swk)))],
          "inflight": ["inflight:" + ikey(x) for x in cap(inf)],
          "hook": (F["frontend"].get("hook") or {}).get("piece") or None,
          "reasons": [["reason:" + s["id"], "file:" + str(s.get("at")).rsplit(":", 1)[0] if s.get("at") else None] for s in cap(rs)],
          "alarms": ["finding:" + a[0] for a in d["alarms"]],
          "pieces": ["piece:" + p["key"] for p in cap(prow)]}
    for k2, n in (("exits", len(d["exits"]["items"])), ("tables", len(d["tables"]["items"])), ("fates", len(d["fates"]["items"])),
                  ("guards", len(d["guards"]["items"])), ("deciders", len(d["deciders"]["items"])), ("switches", len(d["switches"]["items"])),
                  ("inflight", len(d["inflight"]["items"])), ("reasons", len(d["reasons"]["items"])), ("alarms", len(d["alarms"])),
                  ("pieces", len(d["pieces"]["items"])), ("gates", len(d["gates"])), ("limits", len(d["limits"]))):
        if len(dk[k2]) != n:
            die(f"{r['id']} · {k2}: {n} items drawn but {len(dk[k2])} keyed — the keys must follow the items one for one")
    if dk["hook"] and (dk["hook"].split("#")[-1] != d["hook"]):
        die(f"{r['id']}: the hook's key {dk['hook']} is not the hook drawn ({d['hook']})")
    r["dk"] = dk
    # the universe card's rows, one key per thing drawn (the station's own node id where the card draws a node)
    ent = next((uu["items"][2] for uu in r["uni"]["rows"] if uu["row"] == "HEAD"), None)
    real = re.compile(jreal)                         # the station's own test for a journey that is one real case (its jReal)
    for uu in r["uni"]["rows"]:
        it, R = uu.get("items") or [], uu["row"]
        if R == "HEAD":
            uu["keys"] = ["endpoint:" + r["id"], None, "entity:" + it[2] if it[2] else None]
        elif R == "GUARDS":
            uu["keys"] = [fkey(q) for q in uu.pop("fns")]
        elif R == "ACCESSES":
            for o in it:
                if o[1] in X["m2t"] and X["m2t"][o[1]] != o[2]:
                    die(f"{r['id']}: the card's access pairs {o[1]} with table {o[2]}, the feeds with {X['m2t'][o[1]]}")
            uu["keys"] = ["table:" + o[2] for o in it]
        elif R == "PAYLOAD":
            m = re.search(r"→ (\S+)", uu["value"])
            uu["keys"] = [tkey(m.group(1)) if m else None]
        elif R == "CONNECTIONS":
            uu["keys"] = [[node(i) for i in ids] for ids in uu.pop("ids")]
        elif R == "CODE BEHIND":
            uu["keys"] = [callee(n) for n in it + (uu.get("rest") or [])]
        elif R == "TESTS":
            uu["keys"] = ["case:" + c[0] if c[0] else None for c in it]
        elif R == "JOURNEYS":
            uu["keys"] = [["case:" + j[0] if real.search(j[0] or "") else None, ["entity:" + e for e in dict.fromkeys(j[3]) if e]] for j in it]
        elif R == "IDENTITY":
            uu["keys"] = ["entity:" + ent if ent else None, None, None]
        elif R == "SOURCE":
            uu["keys"] = ["file:" + r["file"] if r.get("file") else None] + ([stat(uu["kvs"][1][2])] if len(uu["kvs"]) > 1 else [])
        elif R == "ABOVE":
            uu["keys"] = [None, "entity:" + ent if ent else None]
        elif R == "SIGNATURE" and it and it[0]:
            names = {r["fn"]: hk["handler"][0]}
            names.update({g[0]: k for uu2 in r["uni"]["rows"] if uu2["row"] == "GUARDS" for g, k in zip(uu2["items"], uu2["keys"])})
            parts, last = [], 0
            for m in IDN.finditer(it[0]):
                w = m.group(0)
                k = names.get(w) or (tkey(w) if w in X["m2t"] or w in X["schemas"] else None)
                if k:
                    parts += [[it[0][last:m.start()], None], [w, k]]; last = m.end()
            uu["parts"] = [p for p in parts + [[it[0][last:], None]] if p[0]]
            if "".join(p[0] for p in uu["parts"]) != it[0]:
                die(f"{r['id']}: the signature's parts do not spell the signature")
    # the functions-behind count (the column and its detail pair) counts the callees the card's Code behind names (D-042)
    bk = sorted({k for uu in r["uni"]["rows"] if uu["row"] == "CODE BEHIND" for k in uu["keys"] if k})
    to("behind", *bk)
    dk["behind"] = bk if v.get("behind") != "absent" else []
    r["ck"] = {c: sorted(ks) for c, ks in sorted(ck.items()) if ks}
    r["_cd"] = {c: sorted(ks) for c, ks in cd.items() if ks}          # the generator's own reading (D-042), popped before the page
    r["_cv"] = {c: sorted(ks - cd[c]) for c, ks in cv.items() if ks - cd[c]}


def all_keys(r: dict) -> set:
    """Every key one row holds: its code map (the columns, the head, the detail items) and its universe card."""
    out = set()
    def walk(x):
        if isinstance(x, str) and ":" in x:
            out.add(x)
        elif isinstance(x, (list, tuple)):
            for y in x:
                walk(y)
        elif isinstance(x, dict):
            for y in x.values():
                walk(y)
    walk(r["ck"]); walk(r["hk"]); walk(r["dk"])
    for uu in r["uni"]["rows"]:
        walk(uu.get("keys")); walk([p[1] for p in uu.get("parts") or []])
    return out


# ── 4 · D-043: THE VALUE CHIPS' LOOKS, read from where they live ─────────────────────────────────────────────────────────
# In ONE ENDPOINT's code-map column every action word and every value from a fixed set is a chip. A family the page already
# draws keeps the page's tokens (the template's). The rest are READ here: cut out of the endpoint lab's own source and run under
# node with the station's tokens (never retyped), the forms registries' own words for a finding and their own grouping of the
# 422 rule types, the lab's channel-chip rule from its stylesheet. A family nobody draws yet is my proposal, in the words file.
LAB_PANELS, LAB_CSS = HERE / "_lab-ep-panels.js", HERE / "_lab-ep.css"
GENS = REPO / "templates" / "center" / "generators"
ENC_CUT = (("CMDKIND", "var CMDKIND = {"), ("ALIVEW", "var ALIVEW = {"), ("ALIVEICO", "var ALIVEICO = {"), ("ALIVETONE", "var ALIVETONE = {"),
           ("SCHDIR", "var SCHDIR = {"), ("ROLECHIP", "var ROLECHIP = {"), ("DOESSTATE", "var DOESSTATE = {"),
           ("statusCol", "function statusCol(st, S)"))
ENC_JS = r"""
const vm=require('vm'),fs=require('fs'),path=require('path');const H=process.argv[1],C=JSON.parse(process.argv[2]);
const win={};win.window=win;const ctx=vm.createContext(win);
for(const f of ['_station.js','_lab-ep.js','_lab-ep-panels.js']) vm.runInContext(fs.readFileSync(path.join(H,f),'utf8'),ctx,{filename:f});
const S=win.STATION,K=win.EPKIT,X={};for(const k of Object.keys(C)) X[k]=vm.runInContext('('+C[k]+')',ctx);
const pick=(o,f)=>Object.fromEntries(Object.keys(o).map(k=>[k,f(o[k],k)]));
const out={op:pick(K.RWC,(col,k)=>({chip:(/>([^<]+)</.exec(K.rwChip(k))||[])[1],col})),
  kind:pick(X.CMDKIND,(v)=>({icon:v.ico,plain:v.plain})),
  status:Object.fromEntries(['1','2','3','4','5'].map(c=>[c,X.statusCol(c+'00',S)])),
  life:pick(X.ALIVETONE,(t)=>S.OPC[t]||null), ifk:pick(X.ALIVEICO,(ic,k)=>({icon:ic,plain:X.ALIVEW[k]||null})),
  dir:pick(X.SCHDIR,(v)=>({chip:v.chip,icon:v.icon,col:v.col(S),plain:v.plain,long:v.long})),
  role:pick(X.ROLECHIP,(chip,k)=>({chip,col:(S.BADGE_COL.role||{})[k]||null,plain:(S.BADGE_DESC.role||{})[k]||null})),
  hrole:pick(S.BADGE_COL.hrole||{},(col,k)=>({col,plain:(S.BADGE_DESC.hrole||{})[k]||null})),
  method:pick(S.BADGE_DESC.method||{},(plain)=>({plain})), does:X.DOESSTATE};
process.stdout.write(JSON.stringify(out));"""


def _registry(p: Path):
    """A forms registry module (data only), loaded from its own file."""
    import importlib.util
    spec = importlib.util.spec_from_file_location(p.stem, p)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def enc_lift(W: dict) -> tuple:
    """(D.enc, the lifted CSS, the icon names the chips draw)."""
    src = LAB_PANELS.read_text(encoding="utf-8")
    cut = {k: (m + UNI._literal(src, m)) if m.startswith("function") else UNI._literal(src, m) for k, m in ENC_CUT}
    r = subprocess.run(["node", "-e", ENC_JS, str(HERE), json.dumps(cut)], capture_output=True, text=True)
    if r.returncode != 0:
        die("the lab's encodings could not be read under node: " + r.stderr.strip()[-400:])
    E = json.loads(r.stdout)
    bad = [f"{f}.{k}" for f in ("op", "dir", "role", "hrole") for k, v in E[f].items() if not v.get("col")] + [c for c, v in E["status"].items() if not v]
    if bad or any(not v.get("chip") for v in E["op"].values()):
        die(f"lab encodings that name no colour or chip: {bad}")
    jd = [" ".join(b.split()) for sel, b in UNI._css_rules(LAB_CSS.read_text(encoding="utf-8")) if sel == ".jdrw"]
    if not jd:
        die("the lab's stylesheet no longer has its .jdrw rule — the channel chip's look")
    # the lab's chip reads --font-mono, a token the page's column does not set: it is the page's own monospace stack there
    css = "#ocol-cm{ --font-mono: var(--af-stack); }\n" + "\n".join("#ocol-cm .jdrw{ " + b + " }" for b in jd)
    # a finding's own words, and the 422 rule types grouped by the Field keyword or the model rule that makes each — the forms
    # registries' tables, read; which keyword belongs to which group is the words file's (my proposal), a keyword none names stops
    FR, SH = _registry(GENS / "_a3_forms.py"), _registry(GENS / "_a3_forms_short.py")
    E["says"] = {k: v.get("says") for k, v in FR.FINDINGS.items()}
    G = W["enc"]["fam"]["rule"]["groups"]
    kw = {k: g for g, x in G.items() for k in x.get("keywords") or []}
    lost = sorted(set(SH.PYDANTIC_ERRORS) - set(kw))
    if lost:
        die(f"422 rule keywords no group of enc.fam.rule names: {lost}")
    rule = {t: kw[k] for k, by in SH.PYDANTIC_ERRORS.items() for t in by.values()}
    rule[SH.DECIMAL_WHOLE_DIGITS] = kw["max_digits"]
    rule.update({t: next(g for g, x in G.items() if x.get("table") == "MODEL_ERRORS") for t in SH.MODEL_ERRORS.values()})
    rule.update({t: next(g for g, x in G.items() if x.get("table") == "RAISE_ERRORS") for t in SH.RAISE_ERRORS.values() if t})
    E["rule"] = dict(sorted(rule.items()))
    F = W["enc"]["fam"]
    icons = {v["icon"] for v in E["kind"].values()} | {v["icon"] for v in E["ifk"].values()} | {v["icon"] for v in E["dir"].values()}
    icons |= {x["icon"] for f in ("switch", "alarm", "arm", "branch", "does") for x in F[f]["vals"].values()} | {g["icon"] for g in G.values()} | {F["limit"]["icon"]}
    return E, css, icons


def mo_keys(r: dict) -> set:
    """every key BY MOMENT draws for one row (placed or not) — they wear the station's marks too (D-052)"""
    return {k for x in r["mo"]["el"] for k in x[2]} | {k for x in r["mo"]["un"] for k in x[1]}


def station_marks(W: dict, rows: list, feeds: dict) -> tuple:
    """D-052: (D.sk, its CSS). The station's glyph, kind colour and badge colours are lifted by _ae_universe.station_kinds; which
    station kind each page key kind is drawn as is the words file's ONE table (station.map, my proposal where not the same),
    checked here: every key kind has a row with its reason, every `to` is a kind the station's tables draw, and every badge family
    the station hangs on a kind is a family the words file names (its hover reads the family's name there)."""
    SK, SM = UNI.station_kinds(), W["station"]["map"]
    odd = sorted(set(W["el"]["kinds"]) ^ set(SM))
    if odd:
        die(f"station.map and el.kinds name different key kinds: {odd}")
    for k, x in SM.items():
        if not x.get("why") or (x.get("to") not in (None, "fe") and x["to"] not in SK["kinds"]):
            die(f"station.map.{k}: a reason, and `to` a kind the station's tables draw (or fe, or null) — not {x.get('to')!r}")
    fams = sorted({f for fs in SK["on"].values() for f in fs})
    lost = [f for f in fams if f not in W["enc"]["fam"]]
    if lost:
        die(f"badge families the station hangs on a kind that enc.fam does not name: {lost}")
    roles = {}
    for r in rows:
        for k, v in r["ro"].items():
            if roles.get(k, v) != v:
                die(f"{k}: two rows read two roles for it")
            roles[k] = v
    keys, tally = UNI.sk_keys({k for r in rows for k in all_keys(r) | mo_keys(r)}, SK, SM, feeds, roles)
    ents = {v[2] for v in keys.values() if len(v) > 2} | {r["ent"] for r in rows if r.get("ent")}   # the table's entity groups too
    # entities the station's map colours alike (its ENT = the c4 colours): said beside the entity glyphs, never re-coloured here
    same = collections.defaultdict(list)
    for e in sorted(ents):
        same[(SK["ent"].get(e) or SK["fb"])[0].lower()].append(e)
    return ({"kinds": {k: {"g": x["g"], "t": x["t"]} for k, x in SK["kinds"].items()}, "badge": {f: SK["badge"][f] for f in fams},
             "desc": {f: SK["desc"].get(f) or {} for f in fams}, "on": SK["on"], "keys": keys, "tally": tally, "bg": SK["bg"],
             "same": [g for g in same.values() if len(g) > 1]}, UNI.sk_css(SK, ents))


def roles_by_key(L: dict, r: dict) -> dict:
    """{key: role} for the functions and the hook the code map names — the station's function role and hook role, read from the
    lab's facts (the handler, the walk, the hook that fetches), joined on the same keys the page's items carry (D-041)."""
    ro = {}
    for f in [L["functions"].get("handler") or {}] + [p for lv in (L["functions"].get("walk") or []) for p in lv]:
        if f.get("id") and f.get("role"):
            ro["fn:" + f["id"].replace("#", "::")] = f["role"]
    for h in L["widening"].get("fetched_by") or []:
        if h.get("id") and h.get("hrole"):
            ro[h["id"]] = h["hrole"]
    want = [r["hk"]["handler"][0], r["dk"]["hook"]] + list(r["dk"]["deciders"]) + list(r["dk"]["gates"])
    return {k: ro[k] for k in want if k and k in ro}


def block_orders(sm: dict) -> dict:
    """card = the ruled tree's own order · stage = the brain map's stage order: a block by the first row of its authored
    stage list (EDGE first), a block with no stage last ("across the stages"), ties in the tree's order."""
    bm = json.loads(BM_WORDS.read_text(encoding="utf-8"))
    order = bm["stages"]["order"]
    by = bm["stages"]["byBlock"]
    card = [b["key"] for b in sm["blocks"]]
    def first(b):
        e = by.get(b["sig"])
        if e is None:
            die(f"brainmap.words.json carries no stage list for block {b['sig']}")
        return min((order.index(s) for s in e["stages"]), default=len(order))
    stage = [b["key"] for b in sorted(sm["blocks"], key=lambda b: (first(b), card.index(b["key"])))]
    return {"card": card, "stage": stage, "stageRows": order,
            "stageOfBlock": {b["key"]: by[b["sig"]]["stages"] for b in sm["blocks"]},
            "kinds": {s: bm["stages"]["names"][s]["kind"] for s in order}}


def build(argv: list) -> tuple:
    forms = Path(arg(argv, "--forms", str(DEF_FORMS))).expanduser()
    archmap = Path(arg(argv, "--archmap", str(forms.parent / "archmap.json"))).expanduser()
    only = arg(argv, "--only", many=True)
    cache = arg(argv, "--cache")
    tpl_p = Path(arg(argv, "--tpl", str(HERE / "all-endpoints.tpl.html")))
    words_p = Path(arg(argv, "--words", str(HERE / "all-endpoints.words.json")))
    out = Path(arg(argv, "--out", str(HERE / "all-endpoints.html")))
    check = "--check" in argv
    if check:
        argv.remove("--check"); cache = None
    if argv:
        die(f"unknown arguments: {argv}")
    for p in (forms, archmap, tpl_p, words_p, FACTS, BM_WORDS, KIT_JS, PRISMS, EPSLUG_JS):
        if not p.is_file():
            die(f"missing input: {p}")

    W = json.loads(words_p.read_text(encoding="utf-8"))
    sweep(W)
    ids = [c[0] for c in COLS]
    if sorted(W["cols"]) != sorted(ids):
        die(f"the words file's columns and the generator's differ: only in words {sorted(set(W['cols']) - set(ids))}, only here {sorted(set(ids) - set(W['cols']))}")

    fj = json.loads(forms.read_text(encoding="utf-8"))
    if not fj.get("present"):
        die(f"{forms} holds no forms ({fj.get('reason')})")
    keys = sorted(fj.get("endpoints") or {})
    targets = [k.split(":", 1)[1] for k in keys]
    if only:
        miss = [t for t in only if t not in targets]
        if miss:
            die(f"--only names endpoints the feed lacks: {miss}")
        targets = [t for t in targets if t in only]
    key = "|".join(sha(p) for p in (forms, archmap, FACTS, HERE / "_ep_pieces.py", HERE / "_ep_joins.py", HERE / "_ep_sectionmap.py"))
    lab_before = sha(LAB) if LAB.is_file() else None
    facts = []
    with tempfile.TemporaryDirectory(prefix="allep-") as td:
        for t in targets:
            facts.append(run_facts(t, forms, archmap, Path(td), Path(cache).expanduser() if cache else None, key))
    if (sha(LAB) if LAB.is_file() else None) != lab_before:
        die("_lab-ep.js changed while the facts were measured — the loop must never touch the lab's own file")

    head = fj.get("head")
    for L in facts:
        if L.get("head") != head or L["forms"].get("head") != head:
            die(f"{L['identity']['label']}: facts at {L.get('head')}, feed at {head}")
    sm = facts[0]["sectionmap"]
    if sm.get("state") != "present":
        die(f"the card's ruled tree was not read: {sm.get('reason')}")
    smj = json.dumps(sm, sort_keys=True)
    if any(json.dumps(L["sectionmap"], sort_keys=True) != smj for L in facts):
        die("the ruled tree differs between two endpoints' facts")
    rows = [distill(L, fj, W) for L in facts]
    # ── the one-endpoint section (D-036): the station's card per row, lifted from the station and computed from the facts ──
    spec, feeds = UNI.station_spec(), UNI.station_feeds()
    for L, r in zip(facts, rows):
        r["uni"] = UNI.universe(L, spec, feeds, W["universe"])
    # ── the identity key space (D-041): every element the two columns draw carries one key, the table's rows index them ──
    X, CL = key_index(fj, json.loads(archmap.read_text(encoding="utf-8")), feeds), {}
    for L, r in zip(facts, rows):
        keyspace(r, L, fj["endpoints"]["endpoint:" + r["id"]], X, CL, spec["_look"]["lift"]["jReal"][0])
        r["ro"] = roles_by_key(L, r)                                   # the roles the code map's chips wear (D-043)
    # ── BY MOMENT (his ask 2026-09-26): every timed block's elements on one spine per endpoint, placed only by recorded facts ──
    ADJ, MEMO, MOT = fn_adj(json.loads((UNI.EX / "levels.json").read_text(encoding="utf-8"))), {}, collections.Counter()
    for L, r in zip(facts, rows):
        r["mo"] = by_moment(L, fj, fj["endpoints"]["endpoint:" + r["id"]], r, X, ADJ, MEMO, MOT)
        carried(r, L, fj, fj["endpoints"]["endpoint:" + r["id"]], W)      # D-055: what BY MOMENT carries of the code map, proven
    # D-055: the switch's words, and per code-map field, across the feed, how many endpoints leave it bright (whole, or in part)
    CW = W["carry"]
    if CW.get("pick") not in (CW.get("opts") or {}) or "ruled" in CW:
        die(f"carry: its default {CW.get('pick')!r} must be one of its options, and it is my pick (no ruling names it)")
    cv_left, cv_beyond = {}, sum(r["cvn"][3] for r in rows)
    for r in rows:
        for k0, x in r["cv"].items():                                    # per field: endpoints where it is b · p · c · e · x
            cv_left.setdefault(k0, [0, 0, 0, 0, 0])["bpcex".index(x[0])] += 1
    kinds = {k.split(":", 1)[0] for r in rows for k in all_keys(r)}
    # every kind a key has wears a word; on the whole feed every word names a kind a key has (a fixture of a few endpoints holds fewer)
    if kinds - set(W["el"]["kinds"]) or (not only and set(W["el"]["kinds"]) - kinds):
        die(f"key kinds and the words file's kind words differ: no word for {sorted(kinds - set(W['el']['kinds']))}, a word for none {sorted(set(W['el']['kinds']) - kinds)}")
    # the link into the running station (D-038): the example station, by a path RELATIVE to the page (the operator opens pages
    # from Windows Chrome over wsl.localhost, where an absolute file:///home path 404s), on its ?node=<id> deep link. A row whose
    # node the station's feed does not hold is marked, so its link says so instead of opening a station that selects nothing
    uni_page = UNI.EX / "gabe-universe.html"
    if 'q.get("node")' not in uni_page.read_text(encoding="utf-8"):
        die(f"{uni_page} does not read ?node= — the page's universe link would open it on nothing")
    uni_ids = {p["id"] for e in (feeds["graph"].get("l2") or {}).values() for p in (e.get("nodes") or [])}
    for r in rows:
        if "endpoint:" + r["id"] not in uni_ids:
            r["nu"] = 1
    uni_href = os.path.relpath(uni_page, out.parent).replace(os.sep, "/")
    app = facts[0]["feedwide"]["pieces"].get("app")
    if not app:
        die("pieces-digest.json names no app at this head — the page must say which app it is")

    A = sm["attrs"]
    cols = []
    for cid, attr, kind, arm, agg in COLS:
        a = A.get(attr) or die(f"column {cid}: attribute {attr} is not in the ruled tree")
        on, reason = arm_state(fj, arm)
        cols.append({"id": cid, "attr": attr, "label": a["label"], "plain": a["plain"], "r": a["r"], "alarm": a.get("alarm"),
                     "home": a.get("home"), "shared": bool(a.get("shared")), "sharedIn": a.get("shared_blocks") or [],
                     "kind": kind, "agg": agg, "arm": ("·".join(x for x in arm if x) if arm else None), "armOn": on, "armWhy": reason,
                     **W["cols"][cid]})
    for c in cols:
        if not c["shared"] and not c["home"]:
            die(f"column {c['id']}: attribute {c['attr']} has no home and is not shared")
    # SHARED means "needed by this many blocks or more" — the ruled tree's own threshold (m1-cluster.js spineClusters, read
    # from the options gen-brainmap.js built the tree with, same default), proven against every shared attribute's block list
    n_share = int(((json.loads(PRISMS.read_text(encoding="utf-8")).get("clusterOpts") or {}).get("spineClusters")) or 3)
    for a_id, a in A.items():
        if a.get("shared") and len(a.get("shared_blocks") or []) < n_share:
            die(f"attribute {a_id} is shared but {len(a.get('shared_blocks') or [])} blocks need it, under the tree's {n_share}")
    # the rails: every default is one of its options; a rail the operator ruled names the ruling (D-034), the rest are the agent's picks
    for r_id, R in W["rail"].items():
        if R.get("pick") not in (R.get("opts") or {}):
            die(f"rail {r_id}: its default {R.get('pick')!r} is not one of its options")
        if "ruled" in R and not re.fullmatch(r"D-\d{3}", str(R["ruled"])):
            die(f"rail {r_id}: `ruled` must name the ruling (D-nnn), not {R['ruled']!r}")
    # D-053's two looks (D-025.2): each default one of its options; every moment a row can carry has its words; a field drawn inside
    # another pair names a pair the code map draws
    for o_id, O in W["endings"]["opt"].items():
        if O.get("pick") not in (O.get("opts") or {}):
            die(f"endings.opt.{o_id}: its default {O.get('pick')!r} is not one of its options")
    if sorted(W["endings"]["mom"]) != sorted(("body", "fields", "checks", "failed", "unplaced")):
        die(f"endings.mom names {sorted(W['endings']['mom'])}, not the moments a row can carry")
    for k, x in W["codemap"]["details"].items():
        if x.get("in") and (x["in"] not in W["codemap"]["details"] or W["codemap"]["details"][x["in"]].get("in")):
            die(f"codemap.details.{k}: it is drawn inside {x['in']!r}, which is not a pair the code map draws")
    blocks = [{"key": b["key"], "sig": b["sig"], "name": b["name"], "plain": b["plain"], "kind": b["join"]["kind"], "act": (b["join"].get("act") or {}).get("kind") or "none",
               "surface": b["join"].get("surface_key") or "none", "surfaceWords": b["join"].get("surface")} for b in sm["blocks"]]
    # every attribute id the words file ties to a universe row or a code-map pair is a row of the ruled tree AND of the inventory
    inv, CM, UW = UNI.inventory_ids(), W["codemap"], W["universe"]
    tied = {a for r in UW["rows"].values() for a in r["attrs"]} | {a for grp in ("head", "details") for x in CM[grp].values() for a in x["attrs"]}
    stray = sorted(a for a in tied if a not in A or a not in inv)
    if stray:
        die(f"attribute ids the words file names that are not rows of the ruled tree and of inventory-endpoint.md: {stray}")
    if sorted(UW["rows"]) != sorted(x for x, _ in UNI.ROWS):
        die("the words file's universe rows and the station rows read here differ")
    if sorted(CM["details"]) != sorted(k for k in rows[0]["d"]):
        die(f"the code map's pairs and the row record's details differ: {sorted(set(CM['details']) ^ set(rows[0]['d']))}")
    # D-042: why the code map lacks a lit element — read from each row's keys and ONE authored table (my proposal), checked here
    FLD = UNI.cm_fields(cols, CM)
    UNI.cm_reasons(rows, facts, UNI.why_table(W, A, inv, FLD, W["el"]["kinds"]), A, FLD, bool(only))
    # D-053's counts, said in the build line: endings placed · checks on their ending's row · checks on a row of their own · failure
    # groups (one per catch per endpoint) · endpoints whose moments come in several runs · the longest endings table
    d53 = collections.Counter()
    for r in rows:
        r.pop("_cd"); r.pop("_cv"); TO = r.pop("_to")
        d53["endings"] += sum(1 for t in TO["rows"] if t["x"]); d53["checks"] += sum(len(t["checks"]) for t in TO["rows"] if t["x"])
        d53["alone"] += sum(1 for t in TO["rows"] if not t["x"]); d53["groups"] += len(TO["moms"])
        d53["runs"] += any(n > 1 for n in TO["runs"].values()); d53["rows"] = max(d53["rows"], len(TO["rows"]))
        d53["joined"] += TO["joined"]; d53["named"] += sum(1 for g in TO["moms"] if g[2])
    order = list(A)
    for r in rows:
        r["has"] = UNI.carried(r, cols, CM)
        g_full, g_part = UNI.gaps(set(r["has"]), r["uni"], UW, UNI.read_here(r, r["uni"]))
        r["gaps"] = sorted(g_full, key=order.index)
        r["partly"] = sorted(g_part, key=lambda x: order.index(x[0]))
        r["rgaps"] = UNI.reverse_gaps(r, r["uni"], UW, set(r["has"]))        # the gaps the other way (D-040)
        r["uni"].pop("_drawn")                                          # the generator's own reading, never drawn
    # D-044: every gap's reasons (D-042's rule) and its status line (one.gaps.status.table, my proposal), checked here
    n_st = UNI.gap_whys(rows, fj, W, W["el"]["why"]["table"], UNI.names_table(W, A, inv, FLD), A, FLD, bool(only))
    for r in rows:                                                      # each name's selector served the hover's reading only; its KEY
        r["rgaps"] = [g[:4] + [[K for K, _sl in g[4]]] for g in r["rgaps"]]   # stays, so THE GAPS draws the name the station's way (D-052)
    icon_names, colour_refs = UNI.mark_refs(W)
    icon_names |= {x["icon"] for x in spec.values() if isinstance(x, dict) and x.get("icon")}
    icon_names |= {f["icon"] for f in spec["RISK"]["flags"].values()} | {c["icon"] for c in W["cols"].values()}
    icon_names |= {x["icon"] for grp in ("head", "details") for x in CM[grp].values()}
    enc, enc_css, enc_icons = enc_lift(W)                             # the code map's value chips (D-043)
    sk, sk_css = station_marks(W, rows, feeds)                         # the station's glyph, colour and subcategory per element (D-052)
    enc_css += "\n" + sk_css
    for r in rows:
        r.pop("ro")                                                     # the roles now ride the station's marks (D.sk.keys)
    icon_names |= enc_icons
    MO = mo_block(rows, W, A, blocks, MOT)                              # BY MOMENT: the blocks, the coverage, the keys once
    got = UNI.harvest(icon_names, colour_refs, HERE)                  # + every lab part's own icon
    lab = UNI.lab_marks()
    marks = UNI.marks(blocks, got["parts"], W, lab)
    got["icons"].update({m["icon"]: m["svg"] for m in lab.values()})
    uni_css, ulook = UNI.ulook(spec, [r["uni"] for r in rows])          # the station's card look, lifted (D-040)
    uspec = [{"row": x, "icon": (spec.get(x) or {}).get("icon"), "title": (spec.get(x) or {}).get("title"), "name": UW["rows"][x]["name"], "attrs": UW["rows"][x]["attrs"]} for x, _ in UNI.ROWS]
    attrs = {a_id: {"label": a["label"], "plain": a["plain"], "r": a["r"], "home": a.get("home"), "shared": bool(a.get("shared")),
                       "sharedIn": a.get("shared_blocks") or []} for a_id, a in A.items()}
    orders = block_orders(sm)
    # the alarm families, in fixed places, most frequent first — so a dot's column means the same finding on every row
    fam = collections.Counter(a for r in rows for a in (r["v"]["alarms"] if isinstance(r["v"]["alarms"], list) else []))
    families = [f for f, _ in sorted(fam.items(), key=lambda kv: (-kv[1], kv[0]))]
    arms_on = sorted(a for a, x in (fj.get("arms") or {}).items() if isinstance(x, dict) and x.get("present"))
    arms_off = sorted(a for a, x in (fj.get("arms") or {}).items() if isinstance(x, dict) and not x.get("present"))

    tok = {"app": app, "head": head, "uniHref": uni_href, "nFeed": len(keys), "nRows": len(rows), "nCols": len(cols), "nBlocks": len(blocks),
           "formsSha": sha(forms)[:8], "archmapSha": sha(archmap)[:8], "formsPath": tilde(forms), "archmapPath": tilde(archmap),
           "arms": " · ".join(arms_on) or "none", "armsOff": " · ".join(arms_off) or "none",
           "nShare": n_share, "rTop": max(a["r"] for a in A.values()), "rLow": min(a["r"] for a in A.values()), "nR3": sum(1 for c in cols if c["r"] == max(a["r"] for a in A.values())),
           # the tier the station opens on, and the deeper ones that draw functions (the universe column is the opening card)
           "nAlias": X["nAlias"], "nNames": len(X["names"]), "nUnkeyed": len(X["unkeyed"]), "nKeys": len({k for r in rows for k in all_keys(r)}),
           "nStSolved": n_st["solved"], "nStNot": n_st["not"], "nStOpen": n_st["open"],
           "uniTier": spec["_card"]["tier"], "uniDeeper": " · ".join(t["name"] for t in spec["_card"]["tiers"][spec["_card"]["bootTier"] + 1:] if not t["fnOff"])}
    if not spec["_card"]["tiers"][spec["_card"]["bootTier"]]["fnOff"]:
        die("the station now opens with functions drawn — one.uni.plain says they are hidden; reword it before building")
    if sorted(LAYOUTS) != sorted(W["rail"]["lay"]["opts"]):
        die("the words file's layouts and the page's differ")
    data = {"tok": tok, "partial": bool(only), "layouts": LAYOUTS, "rows": rows, "cols": cols, "blocks": blocks, "orders": orders, "families": families,
            "kinds5": list(KINDS5), "fates": list(FATES), "pieceWords": list(PIECE_WORDS), "words": W,
            "icons": got["icons"], "marks": marks, "uspec": uspec, "attrs": attrs, "attrOrder": order, "ulook": ulook,
            "ucard": {k: spec["_card"][k] for k in ("more", "comp", "okState")}, "elLabels": dict(sorted(CL.items())), "enc": enc, "sk": sk, "mo": MO,
            "cvLeft": cv_left}

    RUNTIME = set(W.get("_runtime") or [])
    left = set(TOKEN.findall(json.dumps({k2: v2 for k2, v2 in W.items() if not k2.startswith("_")}, ensure_ascii=False))) - {"{" + t + "}" for t in list(tok) + list(RUNTIME)}
    if left:
        die(f"tokens the words file uses that nobody fills: {sorted(left)}")

    # every authored top-level string is READ by the page or by this generator — a line nobody draws says more than the page
    # does (D-034 review: two hover lines outlived the mark that showed them). Top-level keys only: nested words are reached
    # through computed keys (a rail's option, a column's id), which a text search cannot follow.
    tpl_src, gen_src = tpl_p.read_text(encoding="utf-8"), Path(__file__).read_text(encoding="utf-8")
    unread = [k for k in W if not k.startswith("_") and not re.search(r"\bW\." + re.escape(k) + r"\b", tpl_src) and f'W["{k}"]' not in gen_src]
    if unread:
        die(f"words the page never reads — draw them or drop them: {unread}")

    kit = subprocess.run(["node", "-e", "const k=require(process.argv[1]);const K=k.withoutMotion(k.kitBlocks(process.argv[2]),'');process.stdout.write(JSON.stringify(K));",
                          str(KIT_JS), str(REPO)], capture_output=True, text=True)
    if kit.returncode != 0:
        die("the artifact kit could not be read: " + kit.stderr.strip()[-300:])
    K = json.loads(kit.stdout)
    html = tpl_p.read_text(encoding="utf-8")
    for mark, val in (("<!--__KIT1__-->", K["k1"]), ("<!--__KIT2__-->", K["k2"].strip()), ("<!--__KIT3__-->", K["k3"]),
                      ("<!--__EPSLUG__-->", "<script>\n" + EPSLUG_JS.read_text(encoding="utf-8").replace("</", "<\\/") + "</script>"),
                      ("<!--__UNILOOK__-->", '<style id="unilook">\n' + uni_css.replace("</", "<\\/") + "\n</style>"),
                      ("<!--__ENCLOOK__-->", '<style id="enclook">\n' + enc_css.replace("</", "<\\/") + "\n</style>"),
                      ("/*__DATA__*/null", json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c"))):
        if mark not in html:
            die("template marker missing: " + mark)
        html = html.replace(mark, val)
    summary = (f"{out.name} · {tok['app']} @ {head} · {len(rows)} of {len(keys)} endpoints · {len(cols)} columns ({tok['nR3']} rated {tok['rTop']}) "
               f"under {len(blocks)} blocks · alarm families {len(families)} · forms {tok['formsSha']} · {len(html)} bytes"
               f"\nD-053 · {d53['endings']} endings in time order · {d53['checks']} checks on their ending's row ({d53['joined']} joined by the class"
               f" their sibling raise is caught by), {d53['alone']} on a row of their own · {d53['named']} of the failure groups name what raised"
               f" · {d53['groups']} failure groups · {d53['runs']} endpoints whose moments come in several runs · longest table {d53['rows']} rows"
               f"\nBY MOMENT · " + " · ".join(f"{f} {MO['cov'][f][0]}/{sum(MO['cov'][f])}" for f in MO['timed']) + f" · untimed {', '.join(MO['untimed'])}"
               f" · longest spine {max(len(r['mo']['sp']) for r in rows)} moments · {MO['off']} calls left off a path they never enter"
               f" · {MO['occ']} step occurrences ({MO['src']['wide']} at other paths' calls, {MO['offocc']} left off a path, {MO['src']['none']} with none)"
               f" · {len(MO['keys'])} keys"
               f"\nD-055 · the code map's {rows[0]['cvn'][1]} fields: BY MOMENT carries {min(r['cvn'][0] for r in rows)}–{max(r['cvn'][0] for r in rows)} whole per endpoint"
               f" · {sum(1 for x in cv_left.values() if not x[2])} fields it carries whole on no endpoint · {sum(1 for x in cv_left.values() if x[2] == len(rows))} on every one"
               f" · {cv_beyond} tables its steps touch that the code map does not list (on {sum(1 for r in rows if r['cvn'][3])} of the endpoints)"
               f" · {sum(r['cvn'][2] for r in rows)} fields with nothing on their endpoint, counted apart from what is left")
    return html, summary, out, check


def main() -> int:
    html, summary, out, check = build(list(sys.argv[1:]))
    if check:
        same = out.is_file() and out.read_text(encoding="utf-8") == html
        print(f"{out.name} is current" if same else f"{out.name} is STALE — run gen-all-endpoints.py")
        return 0 if same else 1
    out.write_text(html, encoding="utf-8")
    print("wrote " + summary)
    return 0


if __name__ == "__main__":
    sys.exit(main())
