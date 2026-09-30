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
import _ae_io as IO  # noqa: E402  (D-067 — one hover per BY MOMENT item: its facts before · checks · gives, and the twins check)
import _ae_els as ELS  # noqa: E402  (D-069 — every BY MOMENT element says what it is: its host, its effect, its role, its object)
import _ae_rel as REL  # noqa: E402  (D-070 — the relations across the moments: data connectors, in-flight lifelines)
import _ae_bench as BENCH  # noqa: E402  (D-071 — the examples bench, his L-23)
import _ae_truth as TRUTH  # noqa: E402  (round-1 review F1a — readings corrected once, before any block reads the facts)


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
FATE_OF_BUCKET = {"committed": "saved", "maybe_committed": "maybe", "rolled_back": "rolled", "uncommitted": "unsaved"}   # the feed's buckets, in FATES' words
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


def _routes(rb: dict) -> list:
    """A reached_by record's routes (D-060): its `routes`, one per handler call that reaches the function, each with the paths
    passing THAT call — else the record itself, its one route. Never the record's own `paths` against a route's line: they are
    the union over the routes."""
    return rb.get("routes") or [rb]


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
    # the raises the feed reaches from each handler call site of this endpoint (the kinds arm's functions, joined by root_site —
    # every route's, D-060: a function the handler reaches through several of its calls is reached from each)
    reach = collections.defaultdict(list)
    for f in fns.values():
        for rb in f.get("reached_by") or []:
            for rt in _routes(rb) if rb.get("root") == E else ():
                if rt.get("root_site"):
                    reach[rt["root_site"]] += f.get("raises") or []
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
            if r is None or r.get("through") or not any(rb.get("root") == E and any(rt.get("root_site") == site for rt in _routes(rb))
                                                        for rb in f.get("reached_by") or []):
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
# D-068 (his L-05: "another header row for principal moments, like the core stages, and inside we can put branches of those stages"):
# the stage each moment stands in — D-001's stages over the spine, INPUT twice around GATE (D-053: FastAPI reads the body before the
# dependencies run and checks the fields after them), the handler's own save under EFFECTS (my pick; its option keeps it under
# HANDLER, MO_STAGE_ALT). The server starting, the screen and what follows the answer are outside the request: no stage (MO_OUT).
# PROVEN per endpoint (by_moment): every ending placed at a moment leaves from the stage that moment stands in, the stage the code
# map's column reads for it (save aside, where no ending leaves)
MO_STAGE = {"edge": "EDGE", "body": "INPUT", "gate": "GATE", "fields": "INPUT", "checks": "HANDLER", "work": "HANDLER", "fail": "HANDLER",
            "save": "EFFECTS", "answer": "ANSWER", "uncaught": "UNCAUGHT"}
MO_STAGE_ALT = {"save": "HANDLER"}
MO_OUT = ("start", "send", "after")
MO_WHY = ("nolink", "twomom", "notable", "firstcall", "spans", "member", "noend", "nosite", "pathsonly", "fnnone", "swmoves", "nopath", "noname", "in500")
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


def declared_set(fep: dict) -> set:
    """D-056 (3): the statuses the endpoint declares, by the endpoint pass's own rule (_a3_paths, the `undeclared` finding): its
    decorator's success status, the refusals it declares (`responses=`), and the 422 FastAPI adds to every endpoint it validates."""
    dc = fep.get("declared") or {}
    return {422, (dc.get("success") or {}).get("status")} | set(dc.get("refusals") or [])


def decl_of(x: dict, dset: set):
    """1 declared · 0 not declared · None for the uncaught error (no endpoint declares an error nobody catches) or no status"""
    if x.get("kind") == "uncaught" or x.get("status") in (None, ""):
        return None
    return 1 if x.get("status") in dset else 0


def by_moment(L: dict, fj: dict, fep: dict, r: dict, X: dict, adj: dict, memo: dict, tally: collections.Counter) -> dict:
    """{sp: the spine [[moment, group, first line, last line]], el: placed [[family, spine index, keys, text, chip, endings | None, hint]],
    un: no moment [[family, keys, text, why]], ex: the picker's codes, one per PATH (D-057), in the endings' time order [[ending id, status,
    kind, spine index, 1, face, its words, its limiter, path id, the forks that tell it from the other paths to its ending | None]],
    pass: per code the spine indices its path passes, n: {family: [records placed, records with none]}} — see the section head."""
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
    LABP = {p["id"]: p for p in TO["paths"]}                       # the lab's paths (their fates), the same ids as the feed's
    PATH = {p["id"]: p for p in paths}
    EFP = {p["id"]: p.get("effects") or {} for p in paths}
    if sorted(LABP) != sorted(PIDS):
        die(f"{lab}: the lab's paths and the feed's differ: {sorted(set(LABP) ^ set(PIDS))[:3]}")
    # D-069 (his L-09 … L-18): what each element IS — the function a gate runs in, what it does when it holds, the reads a refresh
    # fetches again, the function a client branch sits in — read by _ae_els from the feed's own fields
    ELC = ELS.Ctx(lab=lab, E=E, F=F, fj=fj, fep=fep, H=H, deps=deps, XS=XS, chains={p["id"]: p.get("chain") or [] for p in paths},
                  EXIT={p["id"]: p["exit"]["id"] for p in paths}, r=r, X=X, die=die,
                  stage_of=lambda x: "ANSWER" if x.get("kind") == "success" else "UNCAUGHT" if x.get("kind") == "uncaught" else PHASE_STAGE.get(x.get("phase"), "HANDLER"))
    # D-057 (a): the raises functions{} records, by the line they stand at — a check that IS one of them says what it raises
    rz_at = collections.defaultdict(set)
    for rec in fns.values():
        for q in rec.get("raises") or []:
            if q.get("at") and q.get("cls"):
                rz_at[q["at"]].add((q["cls"], q.get("msg")))
    # D-057 (e): an error nothing catches — its class and the line it is raised at (the endpoint pass's escape-500 findings)
    esc = sorted({(f0.get("cls"), f0.get("at")) for f0 in fep.get("findings") or [] if f0.get("id") == "escape-500" and f0.get("cls") and f0.get("at")})

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
    # functions{}.reached_by, per function: handler line → the paths the record names (None: it names none) — per ROUTE (D-060): a
    # record reached through several handler calls lists each call with the paths passing THAT call; its own `paths` is their union
    rb_idx = collections.defaultdict(dict)
    for f, rec in fns.items():
        for rb in rec.get("reached_by") or []:
            for b in _routes(rb) if rb.get("root") == E else ():
                if inh(b.get("root_site")):
                    q, bp = _line(b["root_site"]), b.get("paths")
                    cur = rb_idx[f].get(q, set())
                    rb_idx[f][q] = None if (bp is None or cur is None) else cur | {x for x in bp if x in EXIT}

    # ── 2 · every element, with WHEN it acts: ("fix", moment) · ("h", line[, class]) · ("fail", group) · ("hc",) · ("un", why) ──
    els = []                                                     # dicts: f, w, keys, text, chip, paths (None = every path passing it), hint, id

    def add(f, w, keys, text, chip=None, pths=None, hint=None, idn=None, rec=None, x=None):
        o = w[1] if w[0] == "h" and w[1] else min(w[1]) if w[0] == "hs" and w[1] else 0      # a cell reads in handler-line order
        els.append({"f": f, "w": w, "keys": [k for k in keys if k], "text": text, "chip": chip, "paths": pths, "hint": hint, "id": idn,
                    "rec": rec or [idn], "o": o, "pw": set(), "x": dict(x) if x else {}})
        return els[-1]

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
    dset = declared_set(fep)
    resp = fep.get("responses") or {}
    for i, t in enumerate(rows):
        if t["x"] is not None:
            x = t["x"]; x_row[x["id"]] = i
            inside = set().union(*[site_paths.get(via_q(pre[c]), set()) for c in t["checks"]]) if t["checks"] else set()
            # D-056: the ending's chip says whether the endpoint declares its status (3), the headers it sends (7), a stream's answer (12)
            hdr = (resp.get(x["id"]) or {}).get("headers") or {}
            xx = {"hd": [[h, hdr[h]] for h in sorted(hdr)]} if hdr else {}
            if x["kind"] == "success" and r.get("stream"):
                xx["st"] = 1
            if x["kind"] == "uncaught" and esc:                  # D-057 (e): what escapes to it — the class and the line it is raised at
                xx["cz"] = [[c, _short(a)] for c, a in esc]
            e = add("end", row_when(i), [stat(x.get("status"))], "", ["end", x["kind"], x.get("status"), decl_of(x, dset)],
                    on_ref[x["id"]] | inside | ends_at({x["id"]}), says(x), x["id"], x=xx)
            # D-057 · the facts this chip draws, as the members the switch reads (D-055): the success status the decorator declares, filled;
            # the causes of the uncaught 500
            e["m"] = ([("declared", str(x.get("status")))] if x["kind"] == "success" and decl_of(x, dset) == 1 else []) \
                + ([("cause", a) for _c, a in esc] if x["kind"] == "uncaught" else [])
    # GATES AND DECISIONS — the own checks on their ending's row; the dependencies; the rate limiters; the deciding forks; the catches
    # a check acts where it is evaluated — the handler line it stands at (its own, or the call it sits inside, on every path making
    # that call); its ending may leave later (a check inside a call whose raise a catch translates is evaluated in the work, and its
    # ending leaves after the catch). A check the feed ties only to a catch (`via` except …) stands where that catch raises its ending.
    rk = r["dk"]["guards"]
    # review F1 (D-057 c): a check evaluated inside a call rides the paths making that call, LESS the paths the feed shows leaving before
    # it — a path that takes a fork whose arm returns, or fires a check, whose condition the check's own `after` list negates ("not (P)")
    # never reaches it (the idempotent replay returns before the recipe and cap checks). A path left on it only because it makes the call
    # (its chain carries no step of the check) is an upper bound: the chip's hover says so. PROOF: no path whose chain carries the
    # check's own step is one the feed shows leaving before it
    fpre = {g0["id"]: g0 for g0 in fep.get("preconditions") or []}
    fbr = {b["id"]: b for b in fep.get("branches") or []}
    pre_at = {g0.get("at"): g0.get("pred") for g0 in fep.get("preconditions") or [] if g0.get("at")}
    taken = {pid: {"not (" + str(T) + ")" for T in ({(fbr.get(s.get("ref")) or {}).get("pred") for s in ch if s.get("kind") == "branch" and s.get("hit")
                                                     and ((fbr.get(s.get("ref")) or {}).get("return") or (fbr.get(s.get("ref")) or {}).get("exit"))}
                                                    | {pre_at.get(s.get("at")) for s in ch if s.get("kind") == "gate" and s.get("hit")}) if T}
             for pid, ch in chains.items()}
    left = lambda pid, aft: bool(taken[pid] & aft)               # THE rule (F1): the path met, and left at, a condition `aft` says must not hold
    # D-064 (1) (his ruling 2026-09-28): a FUNCTION behind the handler follows the same rule. The feed records no `after` list for a
    # call, so a function's is read from the same records the checks' lists are made of: the leaving points of the function that calls
    # it (its reached_by route's `via`), between that function's def and the call site — each check with a condition (a precondition)
    # at its line, each fork whose arm returns or leaves (a branch with a condition) at the line its chain step stands at — as the words
    # `taken` holds for a path that leaves there ("not (P)"), and, up to the handler, the caller's own. A path the rule says leaves before
    # it is dropped from its chip; one its own steps put there never is (PROOF, below). A route the handler makes itself adds nothing:
    # the chain says which paths make the handler's call
    LPT = [(_file(g0["at"]), _line(g0["at"]), "not (" + str(g0["pred"]) + ")") for g0 in fep.get("preconditions") or [] if g0.get("pred") and g0.get("at")]
    lvb = lambda s: s.get("kind") == "branch" and bool((fbr.get(s.get("ref")) or {}).get("pred")) and bool((fbr.get(s.get("ref")) or {}).get("return") or (fbr.get(s.get("ref")) or {}).get("exit"))
    LPT += sorted({(_file(s["at"]), _line(s["at"]), "not (" + str(fbr[s["ref"]]["pred"]) + ")") for ch in chains.values() for s in ch if lvb(s) and s.get("at")})
    # where each path LEFT, by position: the forks it took that return or leave, the checks it fired (the positions `taken`'s words come
    # from); and where a catch took it in (a raise caught there does not leave the function: the code after the except runs)
    hitpos = {pid: {(_file(s["at"]), _line(s["at"])) for s in ch if s.get("hit") and s.get("at") and (lvb(s) or (s.get("kind") == "gate" and s["at"] in pre_at))}
              for pid, ch in chains.items()}
    catpos = {pid: {(_file(s["at"]), _line(s["at"])) for s in ch if s.get("kind") == "catch" and s.get("at")} for pid, ch in chains.items()}
    # a call written inside an except body runs only on the paths that catch into it: the catch whose except holds the call's line
    exb = [(c0.get("fn"), _file(c0.get("at")), _line(c0.get("at")), max([_line(c0.get("at")) or 0] + [x0.get("at") for x0 in c0.get("actions") or [] if isinstance(x0.get("at"), int)]))
           for c0 in (fep.get("failure") or {}).get("catches") or [] if c0.get("at")]
    # review F2 (D-064 (1)): a raise the forms feed records in a function (functions{} raises) is a leaving point of the function that
    # calls it, at that call's site — read off the raising function's own reached_by routes (root this endpoint): its handler call, the
    # function it is called in (`via`) and the site there. Two sites in one function order two calls without its def line. A path left
    # there only where the map says so: its chain fires that raise, or its exit was read to it (effects read_to)
    RZ = [(z["at"], b["via"], _line(b["root_site"]), _file(b["site"]), _line(b["site"]), None if b.get("paths") is None else set(b["paths"]))
          for rec in fns.values() for z in rec.get("raises") or [] if z.get("at")
          for rb in rec.get("reached_by") or [] if rb.get("root") == E
          for b in _routes(rb) if inh(b.get("root_site")) and b.get("via") and b.get("site")]
    zpos = {pid: {s["at"] for s in ch if s.get("kind") == "gate" and s.get("hit") and s.get("at")} | ({EFP[pid]["read_to"]} if EFP[pid].get("read_to") else set())
            for pid, ch in chains.items()}

    def before(f, q, seen=frozenset()):
        """D-064 (1): where a path must leave for f NOT to run from handler call q — per route of f's reached_by records (root this
        endpoint, root site q): {t: the words (`taken`'s), r: the (file, first line, call line) ranges they stand in, p: the paths the
        route names (None: it names none), c: the catches (file, line) whose except body holds a call on the way, z: the raises called
        before it (review F2: (the raise's line, file, the site it is called at, the call's site))}; None when no record places f at
        that call. A call inside an except body counts the leaving points of that body alone. A caller's own route is joined on, up
        to the handler"""
        alts = []
        for rb in (fns.get(f) or {}).get("reached_by") or []:
            for b in _routes(rb) if rb.get("root") == E else ():
                if _line(b.get("root_site")) != q or not inh(b.get("root_site")):
                    continue
                g0, S = b.get("via"), b.get("site")
                bp = None if b.get("paths") is None else {x for x in b["paths"] if x in EXIT}
                d0 = _line((fns.get(g0) or {}).get("at"))
                if not g0 or g0 == H or not S or g0 in seen:
                    alts.append({"t": set(), "r": [], "p": bp, "c": [], "z": set()})
                    continue
                fl0, s0 = _file(S), _line(S) or 0
                ex = [(fl1, c1) for fn1, fl1, c1, e1 in exb if fn1 == g0 and fl1 == fl0 and c1 is not None and c1 < s0 <= e1]
                lo = max([d0] + [c1 for _f1, c1 in ex]) if d0 is not None else max([c1 for _f1, c1 in ex], default=None)
                rg = (fl0, lo, s0) if lo is not None else None
                here = {t0 for fl, ln, t0 in LPT if rg and fl == rg[0] and rg[1] <= ln < rg[2]}
                zs = {(za, fl0, sz, s0) for za, via, rq, sf, sz, _zp in RZ if rq == q and via == g0 and sf == fl0 and sz is not None and sz < s0 and (lo is None or lo <= sz)}
                for up in before(g0, q, seen | {f}) or [{"t": set(), "r": [], "p": None, "c": [], "z": set()}]:
                    alts.append({"t": up["t"] | here, "r": up["r"] + ([rg] if rg else []), "p": bp if up["p"] is None else up["p"] if bp is None else bp & up["p"],
                                 "c": up["c"] + ex[-1:], "z": up["z"] | zs})
        return alts or None

    def zleft(pid, a):
        """review F2: the path left at a raise called before f on this route — its chain fires it or its exit was read to it — and no
        catch in the function between took it in before f's call"""
        return any(za in zpos[pid] and not any(cf == fl and sz < cl <= s0 for cf, cl in catpos[pid]) for za, fl, sz, s0 in a["z"])

    def leaves(pid, alts, why=None):
        """on every route of f this path is on, it does not get to f: it enters no except body the call stands in (its chain carries no
        step of that catch), or it met a leaving point before the call — the check rule's own test on the words, CONFIRMED by its chain:
        it left at a line inside that route's ranges and no catch of that function took it in before the call; or (review F2) a raise
        called before it that the map shows the path leaving at. Words met with no such line are counted (`why`), never taken for a
        leaving"""
        on = [a for a in alts or () if a["p"] is None or pid in a["p"]]
        if not on:
            return False
        how = "catch"
        for a in on:
            if a["c"] and not set(a["c"]) <= catpos[pid]:
                continue                                             # it never enters the except body the call is written in
            if zleft(pid, a):
                how = "raise"
                continue
            if not left(pid, a["t"]):
                return False
            if not any(fl == f0 and lo <= ln < hi and not any(cf == f0 and ln < cl <= hi for cf, cl in catpos[pid])
                       for fl, ln in hitpos[pid] for f0, lo, hi in a["r"]):
                if why is not None:
                    why["d64:words"] += 1
                return False
            how = "left"
        return how
    for i, t in enumerate(rows):
        for c in t["checks"]:
            g, q = pre[c], own_line(pre[c])
            w = (("h", q, "checks") if t["mom"] in ("checks", "unplaced") else ("h", q)) if q else row_when(i)
            onr = on_ref[t["x"]["id"]] if t["x"] is not None else set()
            aft = set((fpre.get(g["id"]) or g).get("after") or [])
            cps = {pid for pid in site_paths.get(via_q(g), set()) if not left(pid, aft)}
            gx = (fpre.get(g["id"]) or g).get("exit")               # the check's OWN step on a chain: a gate at its line, or its own ending's
            own_c = {pid for pid, ch in chains.items() if any((s.get("kind") == "gate" and g.get("at") and s.get("at") == g.get("at"))
                                                              or (gx and s.get("kind") in ("gate", "exit") and s.get("ref") == gx) for s in ch)}
            if any(left(pid, aft) for pid in own_c):
                die(f"{lab}: the check {g['id']} is on a path's chain that the feed also shows leaving before it: {sorted(p0 for p0 in own_c if left(p0, aft))[:2]}")
            tally["f1:drop"] += len(site_paths.get(via_q(g), set()) - cps - onr)
            pp = onr | cps
            # D-057 (a): a check that is a raise functions{} records says what it raises, and its words where the code writes them out
            rz = sorted(rz_at.get(g.get("at")) or [], key=str)
            xg = {"rz": list(rz[0])} if len(rz) == 1 else {}
            if cps - own_c:                                      # the paths it rides only by the call: the hover says so on those alone
                xg["cq"] = [nm(VIA_CALL.match(str(g.get("via"))).group(1)), cps - own_c]; tally["f1:up"] += 1
            # review N3-25: a refusal raised inside an except refuses because the except took its error — that is its condition, not the if around it
            gtx = str(g.get("via")) if str(g.get("via") or "").startswith("except ") else (g.get("pred") or "")
            e = add("gate", w, [rk[c][0]] + rk[c][1], gtx, ["status", g.get("status")] + (["raise"] if str(g.get("via") or "").startswith("except ") else []),
                    pp if (pp or onr or site_paths.get(via_q(g))) else (None if t["x"] is None else set()), (r["d"]["guards"]["items"][c][2] or ""), "g:" + g["id"], x=xg or None)
            if len(rz) == 1:
                e["m"] = [("rw", g["id"])]
                tally["rz"] += 1; tally["rzMsg"] += bool(rz[0][1])
    au = F.get("auth") or {}
    gate_paths = {p for p in PIDS if any(s.get("phase") in ("security", "dependency") for s in chains[p])}
    # D-056 (10): the login check's hover names each scheme and what carries its credential; a limiter's, its cap, window and key
    fau = fep.get("auth") or {}
    au_x = [[str(s.get("scheme")), s.get("carrier"), s.get("header") or s.get("name")] for s in fau.get("schemes") or []]
    for g in au.get("gates") or []:
        sch = " · ".join(str(s.get("scheme")) for s in au.get("schemes") or [])
        add("gate", ("fix", "gate"), [fk(g.get("fn"))], g.get("name") or nm(g.get("fn")), None, gate_paths, sch or None, "a:" + str(g.get("fn")),
            x={"au": au_x} if au_x else None)
    flim = {l0.get("at"): l0 for l0 in (fep.get("rate") or {}).get("limits") or []}
    for l0 in (F.get("rate") or {}).get("limits") or []:
        i = x_row.get(l0.get("exit"))
        nmx = str(l0.get("limiter") or l0.get("class") or "?").lstrip("_")
        fl = flim.get(l0.get("at")) or l0
        arg_ = lambda q: next((a.get("value") for a in fl.get("args") or [] if a.get("param") == q), None)
        add("gate", row_when(i) if i is not None else ("un", "nolink"), ["limiter:" + nmx], nmx, None, on_ref[l0.get("exit")],
            _short(l0.get("at")), "l:" + nmx, x={"lm": [arg_("limit"), arg_("window_seconds"), fl.get("key")]})
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
            qs = qs or sorted({_line(b["root_site"]) for f2 in fns.values() for rb in f2.get("reached_by") or [] if rb.get("root") == E
                               for b in _routes(rb) if b.get("via") == cf and inh(b.get("root_site"))})
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
    # D-056 (4): each path's own verdict on each write it runs — the feed's four buckets, one per write (proven: never none, never two)
    bucket = {}
    for p in paths:
        ef = p.get("effects") or {}
        for b, w in FATE_OF_BUCKET.items():
            for s in ef.get(b) or []:
                if (p["id"], s) in bucket:
                    die(f"{lab} {p['id']}: the write {s} is in two of the path's buckets")
                bucket[(p["id"], s)] = w
        for e in ef.get("steps") or []:
            if (steps.get(e["step"]) or {}).get("op") in WRITE_OPS and (p["id"], e["step"]) not in bucket:
                die(f"{lab} {p['id']}: the write {e['step']} is in none of the path's four buckets — its fate cannot be read")
    # STRUCTURES — the body FastAPI reads, every field it checks, the reply the handler builds
    reads_body, req_name, req_fields = body_schema(fep, fj.get("schemas") or {})
    shape_body = bool(reads_body and req_name and any(x.get("phase") == "body-parse" for x in fep.get("framework_exits") or []))
    # D-056 (8): a schema inside the body or the reply, one chip under its top model, at the moment that model is read or built
    if shape_body:
        body_p = {p for p in PIDS if any(s.get("phase") == "body-parse" for s in chains[p])}
        fld_p = {p for p in PIDS if any(s.get("phase") == "validation" for s in chains[p])}
        add("shape", ("fix", "body"), [tk(req_name)], req_name, ["dir", "in"], body_p, None, "q:body")
        rq = r["d"].get("request") or [None, None, [], []]
        for n2, par in zip(rq[2], rq[3]):                         # its hover names the schema it sits in (the top, or a nested one)
            add("shape", ("fix", "body"), [tk(n2)], n2, None, body_p, None, "n:in:" + n2, x={"in": par})
        for fl in req_fields or []:
            add("shape", ("fix", "fields"), [tk(req_name)], fl, None, fld_p, None, "q:" + fl)
    rsp = r["d"].get("response")
    if rsp:
        ok_p = ends_at({x["id"] for x in F["exits"] if x["kind"] == "success"})
        add("shape", ("fix", "answer"), [tk(rsp[0])], f"{rsp[0]} · {rsp[1]}", ["dir", "out"], ok_p, None, "r:reply")
        for n2, par in zip(rsp[2], rsp[3]):
            add("shape", ("fix", "answer"), [tk(n2)], n2, None, ok_p, None, "n:out:" + n2, x={"in": par})
    # CLIENT — who sends it and the screens above them (before the request); what the screen does with the answer (after it)
    fe = fj.get("frontend") or {}
    senders = set()
    for pid, pc in sorted((fe.get("pieces") or {}).items()):
        for c in pc.get("calls") or []:
            if c.get("endpoint") != E:
                continue
            senders.add(pid)
            # D-069 (client P5): the send chain in tap order — the screen (0), the hooks on the way (1), the hook that sends it (2)
            sm = sorted({str(ft.get("method")) for ft in c.get("fetch") or [] if ft.get("method")})   # review F32: a hook that sends it says so, by its method
            add("client", ("fix", "send"), [pid], pid.split("#")[-1], ["kind2", c.get("kind")], None, _short(c.get("at")), "h:" + pid + str(c.get("at")),
                x={"sm": " · ".join(sm)} if sm and c.get("kind") == "mutation" else None)["o"] = 2
            for wd, lst in (("seed", c.get("seeds") or []), ("refresh", c.get("invalidates") or [])):
                for o in lst:
                    wn = o.get("when")
                    pp = ends_at({x["id"] for x in F["exits"] if x["kind"] == "success"}) if wn == "onSuccess" else \
                        ends_at({x["id"] for x in F["exits"] if x["kind"] != "success"}) if wn == "onError" else None
                    # D-069 (his L-15: "what is fetching and from where?"): a refresh names the hooks whose saved answers it throws away —
                    # each fetches again — and the GET each sends
                    rf = ELS.refetches(pid, o, ELC) if wd == "refresh" else []
                    add("client", ("fix", "after"), [pid], wd + " " + json.dumps(o.get("key"), ensure_ascii=False), ["cache", wd], pp,
                        f"{wn} · {_short(o.get('at'))}", "o:" + pid + str(o.get("at")) + wd + json.dumps(o.get("key")),
                        x={"rf": rf, "xk": [q[0] for q in rf] + [q[3] for q in rf if q[3]]} if rf else None)
                    tally["c1:refetch"] += len(rf)
    for fb in L["widening"].get("fetched_by") or []:
        if fb.get("id") not in senders:
            add("client", ("fix", "send"), [fb.get("id")], fb.get("name") or str(fb.get("id")).split("#")[-1], None, None, None, "h:" + str(fb.get("id")))["o"] = 2
    # D-056 (9): a FILE that fetches it (the station's bridge edge ends at the file, not at a hook or component inside it)
    for fid, fnm in r["_files"]:
        if fid not in senders:
            add("client", ("fix", "send"), [fid], fnm, None, None, None, "h:" + fid, x={"fl": 1})["o"] = 3
    for sc in L["widening"].get("screens") or []:
        add("client", ("fix", "send"), [sc.get("id")], sc.get("name") or str(sc.get("id")).split("#")[-1], None, None, None, "v:" + str(sc.get("id")))
    routed = collections.defaultdict(set)
    rdrs = ((fe.get("reasons") or {}).get("readers") or {}).get(E) or []
    for rd in rdrs:
        for ro in rd.get("routes") or []:
            routed[ro.get("site")].add(ro.get("exit"))
    # D-069 (his L-16: "Why do they trigger? In which context? Which function"): each branch names the function it sits in, and the
    # way the error travels to it — the feed's origins, each hop resolved to the frontend piece the c4 graph spans over its line
    fsites = {s0["id"]: s0 for s0 in (fe.get("reasons") or {}).get("sites") or []}
    coll = {f0.get("site") for f0 in (fj.get("arm_findings") or {}).get("frontend") or [] if f0.get("id") == "reason-collapsed" and f0.get("endpoint") == E}
    orch = {}                                                    # a hook on the way to the send: [its key, its name, send lines, error lines, screen]

    def pc_of(piece, site_ids):
        hops, err, scr = [], [], None
        for sid in site_ids:
            for og in (fsites.get(sid) or {}).get("origins") or []:
                if E not in (og.get("endpoints") or []):
                    continue
                via = og.get("via") or []
                sp_ = ELS.fe_piece_at(X, via[-1]) if len(via) > 1 else None
                scr = scr or (sp_ and sp_[3])
                for j0, at0 in enumerate(via[1:-1], 1):
                    pz = ELS.fe_piece_at(X, at0)
                    if not pz or pz[2] in senders or pz[2] == piece:
                        continue
                    o0 = orch.setdefault(pz[2], [pz[2], pz[3], set(), set(), None])
                    (o0[2] if j0 == len(via) - 2 else o0[3]).add(_line(at0))
                    o0[4] = o0[4] or (sp_ and sp_[3])
                    hops.append(pz[3]); err += [_line(at0)] if j0 < len(via) - 2 else []
        return {"via": list(dict.fromkeys(hops)), "err": sorted(set(q for q in err if q)), "scr": scr}
    by_piece = collections.defaultdict(list)
    for s2 in F["frontend"].get("reason_sites") or []:
        by_piece[str((fsites.get(s2["id"]) or {}).get("piece") or s2.get("piece") or "")].append(s2["id"])
    pcs = {pz: [pz, pz.split("#")[-1], _short(pz.split("#")[0][3:]), pc_of(pz, ids)] for pz, ids in by_piece.items() if pz}
    # D-057 (b): a reason chip says on its face what it compares (the status, or the code it reads) and in its hover what the branch
    # does — the lab's own words for the site's does[] rows (window.doesWords, lifted by the build) — in place of the map's word "read"
    for s2 in F["frontend"].get("reason_sites") or []:
        dw = (X.get("dw") or {}).get(s2["id"])
        if dw is None:
            die(f"{lab}: reason site {s2['id']} has no words for what it does — the lab's doesWords was not run on it")
        pz = str((fsites.get(s2["id"]) or {}).get("piece") or s2.get("piece") or "")
        lit = next((d0.get("literal") for d0 in (fsites.get(s2["id"]) or {}).get("does") or [] if d0.get("literal")), None)
        e = add("client", ("fix", "after"), ["reason:" + s2["id"]], f"{_short(s2.get('at'))}", ["rsn", s2.get("reads"), s2.get("op"), s2.get("value")],
                ends_at(routed.get(s2["id"]) or set()) or None, None, "s:" + s2["id"],
                x={"dw": dw, "br": s2.get("branch"), "rd": [s2.get("reads"), s2.get("op"), s2.get("value")], "lit": lit,
                   "rx": sorted(routed.get(s2["id"]) or [], key=str), "al": 1 if s2["id"] in coll else 0,
                   "rs": [(XS.get(x0) or {}).get("status") for x0 in sorted(routed.get(s2["id"]) or [], key=str)],
                   **({"pc": pcs[pz], "xk": [pz]} if pz in pcs else {})})
        e["m"] = [("rsite", s2["id"])] if s2.get("reads") == "status" and s2.get("value") is not None else []
    # D-069 (client P3 (a)): the endings no branch of a client function compares, one line under its branches — "any other status"
    for rd in rdrs:
        rest = sorted({ro.get("exit") for ro in rd.get("routes") or [] if ro.get("site") == "rest" and ro.get("exit") in XS}, key=str)
        pz = str(rd.get("piece") or "")
        # review N3-20: the body's parse endings reach the same function and no branch of it compares them either — the rest is whole
        fw0 = sorted({x0["id"] for x0 in F["exits"] if x0["kind"] == "framework"} - {ro.get("exit") for ro in rd.get("routes") or []}, key=str)
        if rest and ends_at(set(rest)):
            add("client", ("fix", "after"), [], "", ["rest"], ends_at(set(rest) | set(fw0)), None, "t:" + pz,
                x={"rx": rest, "rs": [XS[x0].get("status") for x0 in rest + fw0], **({"fw": fw0} if fw0 else {}), "pc": pcs.get(pz) or [pz, str(rd.get("fn") or pz.split("#")[-1]), _short(pz.split("#")[0][3:]), {"via": [], "err": [], "scr": None}],
                   "xk": [pz] if pz else []})
            tally["c1:rest"] += 1
    for o0 in orch.values():                                     # D-069 (client P5): a hook on the way from the screen to the send
        add("client", ("fix", "send"), [o0[0]], o0[1], None, None, None, "y:" + o0[0],
            x={"ox": {"send": sorted(q for q in o0[2] if q), "err": sorted(q for q in o0[3] if q), "scr": o0[4], "to": sorted(q.split("#")[-1] for q in senders)}})["o"] = 1
        tally["c1:orch"] += 1
    # IN-FLIGHT STATE — each value where it is SET: at server start, by a middleware, by a dependency, on a handler line
    ikey = lambda x: x.get("ref") or "|".join(str(x.get(q)) for q in ("kind", "name", "set_at"))
    for x in (F.get("inflight") or {}).get("rows") or []:
        si_ = x.get("set_in")
        w = (("fix", "start") if si_ == "init" else ("fix", "edge") if si_ == "middleware" else ("fix", "gate") if si_ == "dependency"
             else ("h", _line(x.get("set_at"))) if si_ == "handler" and inh(x.get("set_at")) else ("un", "firstcall"))
        # D-069 (his L-17): the value's type and its lifetime ride the chip — the lifetime is the pinned row's request · server
        add("inf", w, ["inflight:" + ikey(x)], x.get("name") or "", ["ifk", x.get("kind")], "moment", x.get("dies"), "i:" + ikey(x),
            x={"lt": ELS.LIFE.get(x.get("dies"), "unk"), **({"ty": x.get("type") or x.get("class")} if x.get("type") or x.get("class") else {})})
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
                a_ = c.get("asserts") or {}                      # D-056 (10): what the case asserts — the status, and the detail or code
                # round-1 review F03 · CR-03: a call whose status fits several endings FITS them (am = how many); it proves none
                am = max([int(m.group(1)) for q in c.get("refs") or [] for m in [re.match(r"ambiguous of (\d+)", str(q.get("conf") or ""))] if m] or [0])
                add("proof", ("xs", sorted(xs)), ["case:" + cid], cid, proves(xs), ends_at(xs), ptxt(c.get("line"), xs), "p:" + cid + ":" + str(c.get("line")),
                    x={"as": [a_.get("status") or [], a_.get("detail") or [], a_.get("code") or [], len(a_.get("attrs") or [])], **({"am": am} if am else {})})
    sr = collections.defaultdict(set)
    for x in F["exits"]:
        for t in x.get("tests") or []:
            if t.get("role") == "service-raises":
                sr[(t.get("case"), t.get("line"))].add(x["id"])
    for (cid, ln), xs in sorted(sr.items(), key=lambda kv: (str(kv[0][0]), kv[0][1] or 0)):
        # round-1 review N3-01: the function the test calls (only one this endpoint runs is joined here, _ae_truth.own_raise_tests)
        sv = next((str(z.get("call")) for z in (fj.get("test_cases") or {}).get(cid, {}).get("raises") or [] if z.get("line") == ln and z.get("call")), "?")
        add("proof", ("xs", sorted(xs)), ["case:" + str(cid)], str(cid), proves(xs), ends_at(xs), ptxt(ln, xs), "p:" + str(cid) + ":" + str(ln) + ":raises", x={"sv": sv})
    # JOURNEYS (D-065, his ruling 2026-09-28 "build A and B") — the station's own journey list for this endpoint (the card's Journeys
    # row, det.test_journeys, so the page and the card name the same ones). A journey the station names as one real case (its jReal)
    # whose recorded calls (forms.json test_cases, IN ORDER) reach this endpoint AND others is the outer time around this request.
    # EACH CALL HERE is a request of its own (review J1): it gets its own pair of chips — the journey's OTHER requests made before it at
    # "before any request", the ones made after it at "after the answer" — with its own path mask. A call to this endpoint never
    # stands among the outer steps: it is this endpoint's own step (the proof chip at its ending, or its arranging line). THE JOIN, per
    # call here, for a picked path: the endings its refs prove (the proof chip's own join); else, for an ARRANGING call only (review J6),
    # the one ending of the status it asserts, when exactly one ending has it; else no one path (drawn under all paths only). The join
    # is per ending and the filter per path: an ending several paths reach keeps the chip on each of them, and which one the call took
    # is not recorded (review J5 — said in the words, never guessed). A chip's hover is the walk on its side: its outer steps and the
    # calls here on that side, this one among them, by place in the walk, each once — PROVEN to be exactly the recorded calls there,
    # strictly increasing. PROVEN below: an acting call here IS a proof chip of this endpoint with those very endings; an arranging call
    # here IS on the code map's arranging list; a status-joined call joins one success ending; a reason given to a journey that cannot
    # be ordered is true of its record. The ones that cannot be ordered are named in Proof's no-moment cell (jnm)
    jre, TCS, jnm = re.compile(X["jreal"]), fj.get("test_cases") or {}, []
    pel = {e["id"]: e for e in els if e["f"] == "proof"}
    arr_ids = {c0 for c0, _h in r["d"].get("arranged") or []}
    t_corp = {tc0.get("corpus") for tc0 in TCS.values()}             # the corpora the tests arm reads (their cases are its records)
    FEP = fj.get("endpoints") or {}

    def jstep(c, i):                                             # [method, path, role, statuses asserted, endpoint key, here?, line, its place in the walk]
        k = c.get("endpoint") if c.get("endpoint") in FEP else None
        return [c.get("method"), k.split(" ", 1)[1] if k else c.get("path"), c.get("role"), sorted(set((c.get("asserts") or {}).get("status") or []), key=str),
                k, 1 if k == E else 0, c.get("line"), i + 1]

    def jjoin(cid, c):
        """(how, the endings it joins, the endings of the status it asserts): refs · status · none · miss · many · act"""
        xs = {q.get("exit") for q in c.get("refs") or [] if q.get("exit") in XS}
        st = set((c.get("asserts") or {}).get("status") or [])
        if c.get("role") == "act":
            pe = pel.get("p:" + cid + ":" + str(c.get("line")))
            if not pe or set(pe["w"][1]) != xs:
                die(f"{lab}: D-065 — {cid}'s call here at line {c.get('line')} acts, and no proof chip of this endpoint proves its endings {sorted(xs)}")
        elif cid not in arr_ids:
            die(f"{lab}: D-065 — {cid}'s call here at line {c.get('line')} arranges, and the code map's arranging list does not hold it")
        if xs:
            return "refs", xs, xs
        cand = {x for x in XS if XS[x].get("status") in st}
        if not st or not cand:
            return ("miss" if st else "none"), set(), cand
        if c.get("role") == "act":                               # J6: an acting call the tests arm joins to no ending is not joined by its status
            return "act", set(), cand
        if len(cand) > 1:                                        # J6: several endings have the status it asserts — which one is not recorded
            return "many", set(), cand
        if any(XS[x]["kind"] != "success" for x in cand):
            die(f"{lab}: D-065 — {cid}'s arranging call asserts {sorted(st)}, which joins an ending that is not a success: {sorted(cand)}")
        return "status", cand, cand
    for j in L["tests"].get("journeys") or []:
        cid, corp = str(j.get("cid") or ""), j.get("corpus")
        jid = UNI.jy_id(cid, corp)
        tally["jy:rows"] += 1
        if not jre.search(cid):                                   # a group the station counts from a report the tests arm does not read
            if corp in t_corp:
                die(f"{lab}: D-065 — the journey {cid} is a group of the {corp} corpus, which the tests arm reads: its reason would be false")
            jnm.append([cid, jid, "agg", {"c": corp}]); tally["jy:agg"] += 1
            continue
        tc = TCS.get(cid)
        calls = (tc or {}).get("calls") or []
        here = [i for i, c in enumerate(calls) if c.get("endpoint") == E]
        why = "norec" if not tc else "one" if len(calls) <= 1 else "nohere" if not here else "only" if len(here) == len(calls) else None
        if why:
            jnm.append([cid, jid, why, {"c": corp, "n": len(calls)}]); tally["jy:" + why] += 1
            continue
        tally["jy:ordered"] += 1; tally["jy:multi"] += len(here) > 1
        outer = [i for i in range(len(calls)) if i not in here]
        for k in here:
            how, xs, cand = jjoin(cid, calls[k])
            jp = ends_at(xs)
            if bool(jp) != (how in ("refs", "status")):
                die(f"{lab}: D-065 — {cid}'s call here at step {k + 1} joins by {how}, and rides {len(jp)} paths")
            tally["jy:calls"] += 1; tally["jy:j:" + how] += 1; tally["jy:pm"] += len(jp) > len(xs)
            jv = sorted({XS[x].get("status") for x in xs}, key=str)
            for side, part in (("b", [i for i in outer if i < k]), ("a", [i for i in outer if i > k])):
                if not part:
                    continue
                sts = [jstep(calls[i], i) for i in part]
                if any(s[5] for s in sts):
                    die(f"{lab}: D-065 — {cid} has a call to this endpoint among its outer steps")
                # the hover's walk on this side: the outer steps, this call (1) and the other calls here on this side (2), by place
                seq = sorted([s + [0] for s in sts] + [jstep(calls[i], i) + [1 if i == k else 2] for i in here if i == k or (i < k if side == "b" else i > k)],
                             key=lambda s: s[7])
                pl = [s[7] for s in seq]
                if any(b0 <= a0 for a0, b0 in zip(pl, pl[1:])) or pl != (list(range(1, k + 2)) if side == "b" else list(range(k + 1, len(calls) + 1))) \
                        or [s[6] for s in seq] != [calls[q - 1].get("line") for q in pl] or sum(1 for s in seq if s[8] == 1) != 1:
                    die(f"{lab}: D-065 — {cid}'s walk {side} its step {k + 1} is not its recorded calls, each once, in strictly increasing order: {pl}")
                e = add("proof", ("fix", "start" if side == "b" else "after"), ["case:" + cid] + list(dict.fromkeys(s[4] for s in sts if s[4])), cid,
                        ["jy", side, len(sts)], set(jp), None, "j:" + jid + ":" + side + str(k + 1),
                        x={"jy": {"id": jid, "c": cid, "s": side, "nm": tc.get("name"), "st": sts, "sq": seq, "k": k + 1, "nh": len(here), "j": how, "jv": jv,
                              "jn": len(cand), "pm": 1 if len(jp) > len(xs) else 0, "of": len(calls)}})
                e["jy"] = jid
                tally["jy:chips"] += 1; tally["jy:steps"] += len(sts); tally["jy:noep"] += sum(1 for s in sts if not s[4])
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
            w = ("nm",)                                          # D-064 (2): what the endpoint IS (its method, its login, its limit) has no moment by nature
        add("std", w, ["piece:" + pr["key"]], pr["words"], None, None, None, "x:" + pr["key"], x={"fk": [pr.get("family"), (pr.get("key") or "").split(":", 1)[-1]]})

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
    # review F7 (a): the handler call a path LEAVES inside, where the map shows it — the raise its exit was read to (the routes of the
    # function the forms feed records that raise in name one handler call), else the last handler call its chain makes before a check
    # fires outside the handler's own lines
    qleave = {}
    for pid, ch in chains.items():
        rt = EFP[pid].get("read_to")
        qs0 = {rq for za, _v, rq, _sf, _sz, zp in RZ if za == rt and (zp is None or pid in zp)} if rt else set()
        if not qs0:
            last = None
            for s in ch:
                if s.get("kind") in ("call", "collapsed") and inh(s.get("at")):
                    last = _line(s["at"])
                elif last is not None and s.get("hit") and s.get("at") and not inh(s.get("at")) and (s.get("kind") == "gate" or lvb(s)):
                    qs0 = {last}
        if len(qs0) == 1:
            qleave[pid] = next(iter(qs0))
    # review F1 (D-064 (1)): a function behind the handler whose call line the map does not record (the walk's D-061, the name-joined
    # D-062) cannot be dropped from a path — but a path the map shows leaving the function it hangs under PARTWAY may leave before it is
    # called, and its chip says so on that path ("lq", an upper bound on those paths alone). Partway, where the map shows it: (i) a check
    # fires or a fork returns inside that function's body (its def line from the forms feed, its length from the archmap), or inside a
    # function the forms feed routes through it, or its exit was read to such a raise; no catch in that body took the path back in;
    # (ii) the path's chain makes the handler call, then enters one of the handler's own excepts with nothing firing on the way — an
    # error came out of that call and the map does not say where it was raised, so every function under the call may be left before
    FL = X.get("fnlines") or {}

    def gbody(g):
        d0, n0 = _line((fns.get(g) or {}).get("at")), FL.get(g)
        return (_file(fns[g]["at"]), d0, d0 + n0 - 1) if d0 is not None and n0 and _file(fns[g]["at"]) == g.split("::")[0] else None

    def through(k, q, g, seen=frozenset()):
        """the forms feed's routes take function k, from handler call q, through function g"""
        for rb in (fns.get(k) or {}).get("reached_by") or []:
            for b in _routes(rb) if rb.get("root") == E else ():
                if _line(b.get("root_site")) == q and inh(b.get("root_site")):
                    v = b.get("via")
                    if v == g or (v and v != H and v not in seen and through(v, q, g, seen | {k})):
                        return True
        return False
    zfn = collections.defaultdict(set)                             # a raise's line → the functions the forms feed records it in
    for k0, rec in fns.items():
        for z in rec.get("raises") or []:
            if z.get("at"):
                zfn[z["at"]].add(k0)
    lvpos = {pid: [(i, _file(s["at"]), _line(s["at"])) for i, s in enumerate(ch) if s.get("hit") and s.get("at") and (s.get("kind") == "gate" or lvb(s))]
            + ([(len(ch), _file(EFP[pid]["read_to"]), _line(EFP[pid]["read_to"]))] if EFP[pid].get("read_to") else []) for pid, ch in chains.items()}

    # a catch on the chain inside a body that SWALLOWS the error (the function goes on); one that passes it on or translates it
    # leaves the function all the same
    swallowed = lambda s, b: s.get("kind") == "catch" and _file(s.get("at")) == b[0] and b[1] <= (_line(s.get("at")) or 0) <= b[2] \
        and (cat_rec.get(s.get("at")) or {}).get("outcome") == "swallow"

    def partway(pid, g, q):
        """(i): the path leaves g partway — a leaving point inside g's body, or in a function routed through g (a raise the forms
        feed records there, or a check in its body), and no catch later on the chain inside g's body takes it back in"""
        b = gbody(g)
        for i, fl, ln in lvpos[pid]:
            inb = b is not None and fl == b[0] and b[1] <= ln <= b[2]
            deep = any(through(k0, q, g) for k0 in zfn.get(f"{fl}:{ln}", ())) or any(
                through(k0, q, g) for k0 in fns if k0 != g and (lambda b2: b2 is not None and fl == b2[0] and b2[1] <= ln <= b2[2])(gbody(k0)))
            if not (inb or deep):
                continue
            if b is not None and any(swallowed(s, b) for s in chains[pid][i + 1:]):
                continue                                             # a catch inside g took it back in and swallowed it: g went on
            return True
        return False
    # (ii): per path, the handler calls an error came out of with no line the map names for its raise
    unk = collections.defaultdict(set)
    for pid, ch in chains.items():
        if EFP[pid].get("read_to"):
            continue
        calls_, hits_ = [], []
        for s in ch:
            k = s.get("kind")
            if k in ("call", "collapsed") and inh(s.get("at")):
                calls_.append(_line(s["at"]))
            elif k == "catch" and inh(s.get("at")):
                c = _line(s["at"])
                # a check firing outside the handler, or on a handler line before the except, names where it left: (i) reads it; one
                # on a line after the except is the except's own answer
                if not any(not inh(a) or (_line(a) or 0) < c for a in hits_):
                    unk[pid] |= {q0 for q0 in calls_ if q0 < c}
                calls_, hits_ = [], []
            elif s.get("hit") and s.get("at") and (k == "gate" or lvb(s)):
                hits_.append(s["at"])
    # the function a handler call calls (the chains' own callees at that line): the one an error of (ii) came out of
    callee_at = lambda q: ", ".join(sorted({nm(f0) for f0, qs0 in direct.items() if q in qs0})) or f"@ {q}"
    # review F3: the uncaught 500's record names an error it passes on at a re-raise — the line of that `raise`
    pt500 = [(_file(u[len("pass-through raise "):]), _line(u[len("pass-through raise "):])) for x in fep.get("produced") or [] if x.get("phase") == "uncaught"
             for u in x.get("unknown_causes") or [] if str(u).startswith("pass-through raise ")]

    def lq_add(e, name, pids, how="p"):
        """how: i — it leaves that function partway where the map shows it · ii — an error out of the call, raised where the map does
        not say · p — its parent's or caller's own such paths"""
        if pids:
            e["x"].setdefault("lq", {}).setdefault(name, set()).update(pids)
            for p0 in pids:
                e.setdefault("_lqh", {}).setdefault(p0, set()).add(how)

    def route_broken(k, q, seen=frozenset()):
        """the forms feed's routes do not carry function k from handler call q all the way up to the handler: somewhere on the way a
        function has no route of its own, so the line it is called at is not recorded"""
        rs = [b for rb in (fns.get(k) or {}).get("reached_by") or [] if rb.get("root") == E for b in _routes(rb) if _line(b.get("root_site")) == q and inh(b.get("root_site"))]
        return not rs or any(b.get("via") and b["via"] != H and (b["via"] in seen or route_broken(b["via"], q, seen | {k})) for b in rs)
    # the functions a handler call calls (the chains' own callees there): what a function under that call hangs under, where nothing nearer is known
    at_q = lambda q: {f0 for f0, qs0 in direct.items() if q in qs0}
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
            elif prev and not nxt and prev[1] is not None and prev[1] == qleave.get(pid):
                # review F7 (a): a step the path records after its last placed one, with none after it, where the path leaves inside
                # the very call that last one stands at — it ran inside that call, before the path left
                place[(pid, j)] = (prev[0], prev[1], "order", prev[3]); del miss[(pid, j)]; tally["f7:trail"] += 1
        seen_si = [place[(pid, j)][0] for j in range(len(lst)) if (pid, j) in place and lst[j][2] != "after"]
        if any(b < a for a, b in zip(seen_si, seen_si[1:])):                # PROOF: the recorded order is the spine's
            die(f"{lab} {pid}: its steps, placed, run against the order the path records them in: {seen_si}")
    first = {s: i for i, s in enumerate(sids)}
    dgrp, placed_st = {}, set()
    n_occ, pbo = 0, collections.defaultdict(set)                   # pbo: per path, the buckets of its OWN writes placed here
    pws, paft = collections.defaultdict(set), collections.defaultdict(set)   # D-057: per path, its own writes placed wearing a fate · its steps after the answer
    for (pid, j), (si, q, src, wd) in sorted(place.items(), key=lambda kv: (kv[1][0], first[occ[kv[0][0]][kv[0][1]][0]], kv[0])):
        s = occ[pid][j][0]; rec = steps.get(s) or {}
        mk = (rec.get("fn"), rec.get("at"), rec.get("op"), rec.get("table"))
        e = dgrp.get((mk, si))
        if e is None:
            tb, op = rec.get("table"), rec.get("op")
            e = dgrp[(mk, si)] = {"f": "data", "w": ("si", si), "si": si, "keys": [k for k in (["table:" + tb] if tb else []) + [fk(rec.get("fn"))] if k],
                                  "text": tb or nm(rec.get("fn")), "chip": ["op", "w" if op in WRITE_OPS else "r"] if tb else ["opw", op],
                                  "paths": set(), "pw": set(), "hint": _short(rec.get("at")), "id": "s:" + s, "rec": [], "o": (q or 0, first[s]), "x": {}, "pb": {}}
            els.append(e)
        if "s:" + s not in e["rec"]:
            e["rec"].append("s:" + s)
        e["paths"].add(pid)
        if wd:
            e["pw"].add(pid)
        if (pid, s) in bucket:                                   # D-056 (4): the fate the path gives this write (the feed's bucket)
            e["pb"].setdefault(pid, set()).add(bucket[(pid, s)])
            if occ[pid][j][2] != "gate":
                pbo[pid].add(bucket[(pid, s)])
                pws[pid].add(s)
        if occ[pid][j][2] == "after":
            paft[pid].add(s)
        tally["src:" + src] += 1; n_occ += 1
        placed_st.add(s)
    # D-056 (4) PROOF: the fate each path's own writes wear here is the fate the code map's fates list gives that path (read from the
    # lab's path, whose steps carry their bucket — the feed's path steps do not, so a fate read off them is never more than none or after)
    fate_p = {}
    for p in paths:
        own = pbo.get(p["id"]) or set()
        v = next((f for f in FATES if f in own), None)
        fo = fate_p[p["id"]] = fate_of(LABP[p["id"]], after_writes(p, steps))
        if fo not in ("after", "none") and v != fo:
            die(f"{lab} {p['id']}: its writes, placed, wear {sorted(own)}, and the code map's fates list says {fo}")
    # D-056 (5): a race on a unique key the handler's get-or-create claims — on the chip of the step the race breaks at, joined to the
    # ending it escapes to (the uncaught 500). Proven: exactly the claims the race-500 alarm names, each on a placed chip
    unc_x = next((x["id"] for x in F["exits"] if x["kind"] == "uncaught"), None)
    raced = set()
    for cl in (fep.get("repeat") or {}).get("claims") or []:
        if cl.get("race") != "uncaught":
            continue
        hit = [e for e in dgrp.values() if any((steps.get(s0[2:]) or {}).get("at") == cl.get("race_at") and (steps.get(s0[2:]) or {}).get("fn") == cl.get("fn")
                                               and (steps.get(s0[2:]) or {}).get("op") in ("flush", "commit") for s0 in e["rec"])]
        if not hit or unc_x is None:
            die(f"{lab}: the race at {cl.get('race_at')} stands on no placed flush, or the endpoint has no uncaught ending to join it to")
        for e in hit:
            e["x"]["rc"] = [cl.get("constraint"), cl.get("table"), list(cl.get("unique") or []), unc_x]
            e.setdefault("m", []).append(("race", cl.get("race_at")))
        raced.add(cl.get("race_at"))
    r500 = {f.get("race_at") for f in ((fep.get("arm_findings") or {}).get("contract") or []) if f.get("id") == "race-500"}
    if raced != r500:
        die(f"{lab}: the races marked {sorted(raced)} are not the ones the race-500 alarm names {sorted(r500)}")
    tally["race"] += len(raced)
    # review N3-18: a race the effects arm records on a write itself (steps[].race, nothing catches it) — the login's first add of a
    # user breaks its unique key at the flush when two first requests meet — joined the same way, on the flush it breaks at, to the
    # uncaught ending. A race a claim above already marks is not marked twice
    for s0 in sids:
        rq = (steps.get(s0) or {}).get("race") or {}
        if rq.get("state") != "uncaught" or rq.get("at") in raced or unc_x is None:
            continue
        cols0 = list((rq.get("keys") or [[]])[0])
        tb0 = steps[s0].get("table")
        hit = [e for e in dgrp.values() if not e["x"].get("rc") and any((steps.get(q[2:]) or {}).get("at") == rq.get("at") and (steps.get(q[2:]) or {}).get("fn") == steps[s0].get("fn")
                                                                       and (steps.get(q[2:]) or {}).get("op") in ("flush", "commit") for q in e["rec"])]
        for e in hit:
            e["x"]["rc"] = [tb0, tb0, cols0, unc_x]; e["x"]["rs"] = 1      # no constraint name: the table stands for it
            e.setdefault("m", []).append(("race", rq.get("at")))
        tally["raceStep"] += bool(hit)
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
                       "text": tb or nm(rec.get("fn")), "chip": None, "paths": None, "hint": None, "id": "s:" + s, "rec": [], "o": 0, "pw": set(), "x": {}}
            els.append(dun[mk])
        if "s:" + s not in dun[mk]["rec"]:
            dun[mk]["rec"].append("s:" + s)
    stepped = {(steps.get(s) or {}).get("table") for s in sids}
    for t in L["data"]["tables"]:
        if t["table"] not in stepped:
            add("data", ("un", "notable"), ["table:" + t["table"]], t["table"], ["op", t["rw"]], None, None, "t:" + t["table"])
    # FUNCTIONS — the handler (it starts at its first moment), each call a path's chain makes (at its line, on the paths making it),
    # what those calls reach (the reached_by records, on the paths they name; the path's own steps, at the call that placed them)
    e = add("fn", ("hfirst",), [fk(H)], nm(H), None, "handler", f"{_short(fep.get('file') or hf)}:{fep.get('line')}", "f:" + H)
    # D-057 · the handler's chip carries the code map's handler file: its hover is the file's name and line, the directory cut — PROVEN the
    # same file and line the code map names, and a name no other handler file shares (the build counts the names across the feed)
    if e["hint"] != f"{_short(r.get('file'))}:{r.get('line')}":
        die(f"{lab}: the handler chip says {e['hint']}, the code map's handler pair {r.get('file')}:{r.get('line')}")
    e["m"] = [("file", r.get("file"))] if r.get("_fileOne") else []
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
    fown = collections.defaultdict(set)                          # D-064 (1): per (function, call), the paths its own steps put there
    for (pid, j), (si, q, src, wd) in place.items():
        f = (steps.get(occ[pid][j][0]) or {}).get("fn")
        if q is None or not f or f == H or src == "own":
            continue
        fown[(f, q)].add(pid)
        x = fq.setdefault((f, q), [set(), set(), False])
        # review F7 (b, c): a function a chain calls stands on the paths its call is on AND on those its own steps run on (a chain that
        # leaves the call out, the path's own step there says it ran) — as a data chip there already does
        if not x[2] or pid not in x[0]:
            tally["f7:own"] += bool(x[2])
            x[0].add(pid)
            if wd:
                x[1].add(pid)
    BH = r["_beh"]                                               # D-056 (1): the functions behind the handler, by name
    # PROOF (D-062 (4), the code map's "depth not known", panel.behindExtraPlain): a function the card names behind the handler that
    # the lab's walk does not hold is reached from the handler through no call edge the map draws — so its depth is the map's to lack,
    # never a walk cut short
    near = sorted(f for f in BH["extra"] if f in reach_of(adj, H, memo))
    if near:
        die(f"{lab}: the code map says the depth of {near[:3]} is not known, yet the map's call edges reach them from the handler")
    depth = {f: dp for f, dp, _dep in BH["walk"]}
    for (f, q), (ps, pw, dr) in sorted(fq.items(), key=lambda kv: (kv[0][1], kv[0][0])):
        # D-064 (1): a function the chain does not call itself (a reached_by record, a step of its own under the call) stands on the
        # call's paths LESS those that leave before it inside the functions between (the check rule). PROOF: never a path its own steps
        # put there
        lv = None if dr else before(f, q)
        gone = {pid: w0 for pid in ps for w0 in [leaves(pid, lv, tally) if lv else False] if w0}
        if set(gone) & fown.get((f, q), set()):
            die(f"{lab}: {nm(f)}'s own steps run on {sorted(set(gone) & fown[(f, q)])[:2]}, which the check rule says do not reach it")
        e = add("fn", ("h", q), [fk(f)], nm(f), None, ps - set(gone), f"@ {q}" if dr else None, "f:" + f, x={"dp": depth[f]} if f in depth else None)
        e["pw"] = pw - set(gone)
        e["_q"], e["_par"], e["_dr"] = q, set(), dr
        if not dr:                                                   # review F1 (ii): an error out of the call, raised where the map does not say
            lq_add(e, callee_at(q), {pid for pid in e["paths"] - fown.get((f, q), set()) if q in unk[pid]}, "ii")
            if route_broken(f, q):                                   # (i): a route that stops short of the handler hangs under the call's callee
                e["_par"] = at_q(q)
                for G in sorted(e["_par"]):
                    lq_add(e, nm(G), {pid for pid in e["paths"] - fown.get((f, q), set()) if partway(pid, G, q)}, "i")
        if gone:
            e["_pre"] = set(ps)
            tally["d64:chips"] += 1
            for w0 in gone.values():
                tally["d64:" + w0] += 1
            # review F3: a call written in an except no chain enters, where the uncaught 500 says an error passes through that except
            # (its record names the except's re-raise): it runs on the way to the 500, a path the map does not follow step by step
            if not e["paths"] and set(gone.values()) == {"catch"} and any(
                    fl == pf and c1 < pl <= e1 for a in lv or () for fl, c1 in a["c"] for fn1, fl1, c1b, e1 in exb if fl1 == fl and c1b == c1 for pf, pl in pt500):
                e["_why"] = "in500"; tally["f3:in500"] += 1
    # D-056 (1): every function behind the handler that no call above already places — the lab's walk over the station's call edges
    # (levels.json fn_edges), each with its depth, then the card's other callees (no depth). Where each stands: the handler calls that
    # reach it (the chains', functions{}.reached_by, the call edges); else, under a dependency, the dependencies; else the moment a
    # step of its own is placed at; else no moment. A name the feeds hold no single function for stays in the band, said.
    fn_ids = {H} | {f for f, _q in fq}
    allq = set(site_paths) | {q for d in rb_idx.values() for q in d}
    dstep = collections.defaultdict(list)
    for e in dgrp.values():
        for k in e["keys"]:
            if k.startswith("fn:"):
                dstep[k[3:]].append(e)
    def dep_root(f):                                             # the dependency a walk function runs inside: its walk ancestor with no parent
        while BH["par"].get(f):
            f = BH["par"][f]
        return f
    for f, dp, dep in [w0 for w0 in BH["walk"]] + [(f, None, False) for f in BH["extra"]]:
        if f in fn_ids:
            continue
        fn_ids.add(f)
        # review CR-05 · N3-05: a function a dependency runs is run by FastAPI before the handler, n calls inside that dependency — never
        # "n calls below the handler", which does not call it
        xx = ({"dd": [nm(dep_root(f)), dp - 1]} if dep else {"dp": dp}) if dp else None
        qs = [q for q in sites(f)[0] if q in allq]
        if qs:
            by_si = collections.defaultdict(list)
            for q in qs:
                by_si[hsi(q)].append(q)
            for _si, qq in sorted(by_si.items()):
                # the paths making the call that reaches it; where a path is joined to it only through the station's call edges (or
                # a reached_by record naming no path), the call's paths are an upper bound — a path may leave the call before it
                # runs. Its own steps, where it has any, name the paths it runs on; else the chip says it stands on the call's paths
                ps, inf = set(), set()
                for pid in PIDS:
                    t, src = path_sites(f, pid)
                    hit = set(qq) & set(t)
                    if hit:
                        ps.add(pid)
                        if src == "edges" or (src == "reached" and any((rb_idx.get(f) or {}).get(q) is None for q in hit)):
                            inf.add(pid)
                own = {pid for e2 in dstep.get(f, []) for pid in e2["paths"]}
                xq = dict(xx or {})
                # D-061 (2): a function deeper than the handler's own callees stands on the paths of the CALLER it hangs under in
                # the walk (its walk parent's chip), not on every path of the handler call that reaches it — and its paths are an
                # upper bound only where the parent's are (the parent's hover says so, and so does this one, naming the same call)
                pe = [e0 for e0 in els if e0["f"] == "fn" and e0["keys"][:1] == [fk(BH["par"][f])] and e0["w"][0] != "un"
                      and isinstance(e0.get("paths"), set) and e0["paths"]] if BH["par"].get(f) else []
                pp = set().union(*(e0["paths"] for e0 in pe)) if pe else set()
                ppre = set().union(*(e0.get("_pre") or e0["paths"] for e0 in pe)) if pe else set()   # D-064 (1): the parent's paths before its drop
                pcp = next(((e0.get("x") or {}).get("cp") for e0 in pe if (e0.get("x") or {}).get("cp")), None)
                par_exact = bool(ps & pp) and not pcp
                pre64 = ps & ppre if ps & ppre != ps & pp else None
                if ps & pp:
                    ps &= pp
                    inf &= ps
                    tally["beh:parent"] += 1
                if inf and own:
                    ps -= inf - own
                    tally["beh:own"] += 1
                elif inf and par_exact:
                    tally["beh:pexact"] += 1                 # its parent's paths are the parent's own: said as no upper bound
                elif inf and pcp:
                    xq["cp"] = pcp
                    tally["beh:cp"] += 1
                elif inf:
                    q0 = min(qq)
                    via = sorted({g for g, qs0 in direct.items() if q0 in qs0 and f in reach_of(adj, g, memo)}) or \
                        sorted({g for g, qs0 in direct.items() if q0 in qs0})
                    xq["cp"] = ", ".join(nm(g) for g in via) or None
                    tally["beh:cp"] += 1
                if ps:
                    e1 = add("fn", ("h", min(qq)), [fk(f)], nm(f), None, ps, None, "f:" + f, x=xq or None)
                    if pre64 is not None and pre64 != ps:        # D-064 (1): it follows its parent's drop
                        e1["_pre"] = pre64; tally["d64:follow"] += 1
                    # review F1: the map records no line its parent calls it at — on a path that leaves the parent partway it may never
                    # be called (i), or (ii) an error came out of the handler call from where the map does not say; its parent's own
                    # such paths are its too. Never on a path its own steps run on
                    q0 = min(qq)
                    Gs = {BH["par"][f]} if BH["par"].get(f) else at_q(q0)     # no walk parent (the card's other callees): the call's callee
                    for e0 in pe:
                        for k0, s0 in (e0["x"].get("lq") or {}).items():
                            lq_add(e1, k0, (s0 & ps) - own)
                    for G in sorted(Gs):
                        lq_add(e1, nm(G), {pid for pid in ps - own if partway(pid, G, q0)}, "i")
                    lq_add(e1, callee_at(q0), {pid for pid in ps - own if q0 in unk[pid]}, "ii")
                    e1["_q"], e1["_par"], e1["_own"] = q0, Gs, own
                else:
                    add("fn", ("un", "nopath"), [fk(f)], nm(f), None, None, None, "f:" + f, x=xq or None)
            tally["beh:call"] += 1
        elif dep or f in deps:
            add("fn", ("fix", "gate"), [fk(f)], nm(f), None, gate_paths, None, "f:" + f, x=xx)
            tally["beh:gate"] += 1
        elif dstep.get(f):
            for e2 in dstep[f]:
                add("fn", ("si", e2["si"]), [fk(f)], nm(f), None, set(e2["paths"]), None, "f:" + f, x=xx)["si"] = e2["si"]
            tally["beh:step"] += 1
        else:
            add("fn", ("un", "nolink"), [fk(f)], nm(f), None, None, None, "f:" + f, x=xx)
            tally["beh:none"] += 1
    for nmx in BH["noname"]:
        add("fn", ("un", "noname"), [], nmx, None, None, None, "n:" + nmx)
    named = set(r["u"].get("datafns") or []) | {f.get("fn") for f in (F.get("inside") or {}).get("functions") or []
                                                if f.get("fn") and (f.get("refusals") or any(q.get("here") for q in f.get("raises") or []))}
    for f in sorted(named - fn_ids - deps):
        add("fn", ("un", "fnnone"), [fk(f)], nm(f), None, None, None, "f:" + f)
    for e in els:
        if "si" not in e and e["w"][0] not in ("un", "next"):
            e["si"] = si_of(e)
    # D-057 (d): a function behind the handler no call edge places (the walk's own with no link, the card's other callees, the names no
    # function carries) stands where the function that calls it stands — the placed functions (the handler's own chip apart: it stands
    # where the handler starts, not at a call) whose station behind list (levels.json fn_nodes behind.names) names it, less any of them
    # another of them is behind (so the one nearest it). One moment: there, on that function's paths; several moments: the band says so;
    # none: it stays where it was. A name no function carries is placed by name, no key, no glyph.
    # D-062 (2): its paths are its CALLER chip's paths (each caller chip already stands inside the call it is placed at), exactly as
    # D-061 (2) places a walk function on its parent's — and they are an upper bound only where the caller's are: the "on every path
    # that calls" line is the caller's own, naming the same call, and a caller that carries none gives none.
    # Rounds, until nothing more is placed: a function placed this way can place the ones behind it
    LB = X.get("lvbeh") or {}
    unjoined = lambda e: e["f"] == "fn" and e["w"] in (("un", "nolink"), ("un", "noname"))

    def callers_of(e, callers):
        c = [(g, ge) for g, ge in callers if e["text"] in LB[g]]
        return [(g, ge) for g, ge in c if not any(h != g and nm(h) in LB[g] for h, _he in c)]
    while True:
        callers = [(k[3:], e) for e in els if e["f"] == "fn" and isinstance(e.get("si"), int) and e["w"][0] != "un" and isinstance(e.get("paths"), set)
                   and e["paths"] for k in e["keys"][:1] if k.startswith("fn:") and k[3:] != H and LB.get(k[3:])]
        moved = 0
        for e in [e for e in els if unjoined(e)]:
            c = callers_of(e, callers)
            if len({ge["si"] for _g, ge in c}) == 1:
                e["si"] = c[0][1]["si"]; e["w"] = ("si", e["si"]); moved += 1
                e["paths"] = set().union(*[ge["paths"] for _g, ge in c]); e["pw"] = set().union(*[ge["pw"] for _g, ge in c])
                p64 = set().union(*[ge.get("_pre") or ge["paths"] for _g, ge in c])
                if p64 != e["paths"]:                            # D-064 (1): its caller dropped the paths that leave before it; so does it
                    e["_pre"] = p64; tally["d64:join"] += 1
                ccp = sorted({(ge.get("x") or {}).get("cp") for _g, ge in c} - {None})
                if ccp:
                    e["x"]["cp"] = ", ".join(ccp)
                    tally["join:cp"] += 1                        # a caller whose own paths are an upper bound: said, naming its call
                else:
                    e["x"].pop("cp", None)
                    tally["join:exact"] += 1                     # its callers' paths are their own: no upper-bound line
                e["o"] = min(ge["o"] for _g, ge in c)
                e["_jc"] = {g for g, _ge in c}
                # review F1: as a walk function under its parent — its callers' partway paths are its, and so are the paths that leave a
                # caller partway (i) or bring an error out of the handler call from where the map does not say (ii); never a path its
                # own steps run on
                own_j = {pid for e2 in dstep.get(e["keys"][0][3:], []) for pid in e2["paths"]} if e["keys"] and e["keys"][0].startswith("fn:") else set()
                for g, ge in c:
                    for k0, s0 in (ge["x"].get("lq") or {}).items():
                        lq_add(e, k0, (s0 & e["paths"]) - own_j)
                    qg = ge.get("_q")
                    if qg is not None:
                        lq_add(e, nm(g), {pid for pid in ge["paths"] - own_j if partway(pid, g, qg)}, "i")
                        lq_add(e, callee_at(qg), {pid for pid in ge["paths"] - own_j if qg in unk[pid]}, "ii")
                qgs = {ge.get("_q") for _g, ge in c}
                e["_q"] = next(iter(qgs)) if len(qgs) == 1 else None
                e["_par"], e["_own"] = {g for g, _ge in c}, own_j
                tally["join:name" if e["id"].startswith("n:") else "join:fn"] += 1
        if not moved:
            break
    for e in [e for e in els if unjoined(e)]:                   # the functions nearest it stand at several moments: said, never picked
        if len({ge["si"] for _g, ge in callers_of(e, callers)}) > 1:
            e["w"] = ("un", "twomom"); tally["join:several"] += 1
        else:
            tally["join:left"] += 1
    # review F3: a behind list the station cut (levels.json behind.names_more) names only its first names, so a placed function whose
    # list is cut and does not name it may call it too — nearer than the caller it joined, at another moment or on other paths. Each
    # such function is named in the joined chip's hover (it may also run under it), counted, never silently trusted
    CUT = X.get("lvcut") or {}
    for e in els:
        if "_jc" not in e:
            continue
        jc = e.pop("_jc") | {e["keys"][0][3:] if e["keys"] and e["keys"][0].startswith("fn:") else None}
        hid = sorted({nm(h) for h, _he in callers if CUT.get(h) and e["text"] not in LB[h] and h not in jc})
        if hid:
            e["x"]["cn"] = ", ".join(hid); tally["join:cut"] += 1
    # D-057 (e): the function an error nothing catches is raised in says so on its chip (each chip of it), at the call that reaches it
    for c0, a0 in esc:
        rf = sorted(fid for fid, rec in fns.items() if any(q.get("at") == a0 and q.get("cls") == c0 for q in rec.get("raises") or []))
        for e in els:
            if e["f"] == "fn" and any(k in ("fn:" + g.replace("#", "::") for g in rf) for k in e["keys"]):
                e["x"].setdefault("ru", []).append([c0, _short(a0)])
                e.setdefault("m", []).append(("raise", a0))
    # D-064 (1) PROOF: no function stands on a path that leaves before it — every function chip at a handler call is read again from its
    # own records (the walk's and the name-joined chips stand inside their caller's paths, each such caller read here in turn)
    for e in els:
        if e["f"] == "fn" and e["w"][0] == "h" and e["w"][1] and isinstance(e.get("paths"), set) and e["keys"][:1] and e["keys"][0] != fk(H):
            lv = before(e["keys"][0][3:], e["w"][1])
            bad = sorted(pid for pid in e["paths"] if lv and leaves(pid, lv))
            if bad:
                die(f"{lab}: {e['text']} stands on {bad[:2]}, which leave before it (D-064 (1))")
            tally["d64:proven"] += 1
    # review F1 · F2 PROOF, read from POSITIONS — never through before()/leaves() or partway(): every function chip under a handler call
    # (A) that the forms feed routes from that call (via V, site S) stands on no path that, on every route it is on, never enters the
    # except its call is written in, or leaves V before S — a check firing or a fork returning in V between its def (or that except) and
    # S, or a raise the feed routes through V at a site before S that the path's chain fires or its exit was read to — with no catch in
    # V between; (B) one whose call line the map does not record carries the upper-bound line on every path its own steps do not run on
    # that leaves the function it hangs under partway (a leaving point in that function's body, or a raise the feed routes through it),
    # and (ii) on every such path an error came out of the handler call from where the map does not say
    for e in els:
        if not (e["f"] == "fn" and isinstance(e.get("paths"), set) and e["keys"][:1] and e["keys"][0].startswith("fn:") and e["keys"][0] != fk(H)):
            continue
        f, q = e["keys"][0][3:], e.get("_q")
        if q is None:
            continue
        lqs = {p0 for v0 in (e["x"].get("lq") or {}).values() for p0 in v0}
        routes = [b for rb in (fns.get(f) or {}).get("reached_by") or [] if rb.get("root") == E for b in _routes(rb) if _line(b.get("root_site")) == q and inh(b.get("root_site"))]
        if routes and e["w"] == ("h", q):
            for pid in e["paths"]:
                outs = []
                for b in [b for b in routes if b.get("paths") is None or pid in b["paths"]]:
                    V, S = b.get("via"), b.get("site")
                    if not V or V == H or not S:
                        outs.append(False); continue
                    fl, s0 = _file(S), _line(S)
                    ex = [c1 for fn1, fl1, c1, e1 in exb if fn1 == V and fl1 == fl and c1 < s0 <= e1]
                    if ex and (fl, ex[-1]) not in catpos[pid]:
                        outs.append(True); continue
                    bV = gbody(V)
                    lo = ex[-1] if ex else (bV[1] if bV and bV[0] == fl else _line((fns.get(V) or {}).get("at")))
                    pts = [(i, l_) for i, f_, l_ in lvpos[pid] if f_ == fl and lo is not None and lo <= l_ < s0]
                    pts += [(len(chains[pid]), sz) for za in zpos[pid] for za2, via, rq, sf, sz, _zp in RZ
                            if za2 == za and via == V and rq == q and sf == fl and sz < s0 and (lo is None or lo <= sz)]
                    outs.append(any(not any(cf == fl and l_ < cl <= s0 for cf, cl in catpos[pid]) for _i, l_ in pts))
                if outs and all(outs):
                    die(f"{lab}: {e['text']} stands on {pid}, which never gets to its call (read from the positions) — review F1/F2")
            tally["f1:provenA"] += 1
        if e.get("_par") is not None:
            own = e.get("_own") or fown.get((f, q), set())
            for pid in e["paths"] - own:
                why = [g for g in e["_par"] if (lambda b: any(b and f_ == b[0] and b[1] <= l_ <= b[2] and not any(
                    s.get("kind") == "catch" and _file(s.get("at")) == b[0] and b[1] <= (_line(s.get("at")) or 0) <= b[2] and (cat_rec.get(s.get("at")) or {}).get("outcome") == "swallow"
                    for s in chains[pid][i + 1:]) for i, f_, l_ in lvpos[pid]))(gbody(g)) or any(za in zpos[pid] and via == g and rq == q for za, via, rq, *_r in RZ)]
                if (why or (q in unk[pid] and not e.get("_dr"))) and pid not in lqs:
                    die(f"{lab}: {e['text']} stands on {pid}, which leaves {', '.join(nm(g) for g in why) or 'the call at ' + str(q)} partway, and its chip does not say so — review F1")
            tally["f1:provenB"] += 1

    # ── 6 · each element's paths → the endings it is on; PROOF: every path it is on passes its moment (a "wide" step: never after the
    # path left); an element on no path goes to the band; each block's records, placed or not, are the code map's own ──
    xrow = [[t["x"]["id"], t["x"].get("status"), t["x"]["kind"], x_si[t["x"]["id"]]] for t in rows if t["x"] is not None]
    EI = {x[0]: i for i, x in enumerate(xrow)}                   # the endings in time order (D-053's rows)
    # D-057 (c): the path picker holds one code per PATH — an ending several paths reach is several codes — in the endings' time order,
    # the paths to one ending in the facts' order; an ending no path reaches is not offered. An element's paths ride as bits of one
    # number, one bit per code (the page tests a bit)
    TOP = [p["id"] for p in TO["paths"]]
    picks = sorted((pid for pid in TOP if EXIT[pid] in EI), key=lambda pid: (EI[EXIT[pid]], TOP.index(pid)))
    if len(picks) > 30:
        die(f"{lab}: {len(picks)} paths — the page keeps an element's paths as bits of one number, and holds thirty")
    PI = {pid: i for i, pid in enumerate(picks)}
    live = set(range(len(picks)))
    seen = {p: set(passed[p]) for p in PIDS}
    PX = {("endpoint", lab), ("segment", r.get("seg"))}          # D-057: the facts the placed chips draw (their members) — the heading draws the two
    # D-056 (6): a test whose status fits endings at several moments rides EACH of them, drawn hollow — "several moments" is no longer
    # its reason; one that fits endings at one moment stays one chip; one that proves no ending stays in the band
    for i0 in [i for i, e in enumerate(els) if e["f"] == "proof" and e.get("si") == ("un", "spans")]:
        e = els[i0]
        subs = []
        for xid in e["w"][1]:
            n = dict(e, w=("xs", [xid]), si=x_si[xid], chip=["status", XS[xid].get("status")], paths=ends_at({xid}), pw=set(), x=dict(e["x"], ho=len(e["w"][1])))
            subs.append(n)
        els[i0:i0 + 1] = [None]
        els.extend(subs)
        tally["hollow"] += len(subs); tally["hollowCases"] += 1
    els[:] = [e for e in els if e is not None]
    # round-1 review F03 · CR-03 · N3-17: a test's chips that FIT endings (its status fits several) and stand in one cell fold into
    # ONE chip — every call of the case there, every ending it fits there; its face says "fits" and how many of how many
    fold = collections.OrderedDict()
    for i0, e in enumerate(els):
        if e["f"] == "proof" and e["x"].get("am") and e["w"][0] == "xs" and not e.get("jy"):
            fold.setdefault((e["keys"][0], e.get("si")), []).append(i0)
    for (_k, si0), ix in fold.items():
        grp = [els[i0] for i0 in ix]
        e0 = grp[0]
        xs0 = sorted({x0 for e in grp for x0 in e["w"][1]}, key=lambda x0: (x_si.get(x0, 0), str(XS[x0].get("status")), x0))
        lns = sorted({int(e["id"].split(":")[2]) for e in grp}, key=int)
        n = dict(e0, w=("xs", xs0), chip=proves(set(xs0)), paths=set().union(*[set(e["paths"] or ()) for e in grp]), pw=set().union(*[e["pw"] for e in grp]),
                 id="p:" + e0["id"].split(":")[1] + ":" + ",".join(str(q) for q in lns), rec=list(dict.fromkeys(q for e in grp for q in e["rec"])),
                 x=dict(e0["x"], am=max(e["x"]["am"] for e in grp), hn=len(xs0), **({"asm": {str(int(e["id"].split(":")[2])): e["x"].get("as") for e in grp}} if len(lns) > 1 else {})))
        n["x"].pop("ho", None)
        for i0 in ix:
            els[i0] = None
        els[ix[0]] = n
        tally["fold:chips"] += len(grp) - 1; tally["fold:cells"] += 1
    els[:] = [e for e in els if e is not None]
    # D-069 (his L-09 … L-18): what each element IS — a gate's host, what it does when it holds and where it decides; a rare piece's
    # rarity and the elements it names; what a function decides and touches (proven the code map's deciders and data functions)
    ELS.gates(els, ELC, tally)
    ELS.rarity(els, ELC, L["feedwide"]["pieces"]["rows"], WRITE_OPS, tally)
    ELS.fn_marks(els, ELC, tally)
    # D-069 (P-L14d): a class the handler builds is no function — it wears its schema's or its model's key first (the station's node
    # for it), its function key second; one the station draws no node for stays as it was
    for e in els:
        n0 = nm(e["keys"][0][3:]) if e["f"] == "fn" and e["keys"] and e["keys"][0].startswith("fn:") else ""
        k0 = ("schema:" + n0) if n0 in X["schemas"] else ("table:" + X["m2t"][n0]) if X["m2t"].get(n0) in X["c4tables"] else None
        if k0 and "." not in n0:
            e["keys"] = [k0] + e["keys"]; tally["c1:class"] += 1
    el, un, nmv, gone_fn, inf_src = [], [], [], [], {}
    rp, ru, rn = collections.defaultdict(set), collections.defaultdict(set), collections.defaultdict(set)
    # D-067: each placed item's ONE hover, its own facts in the order the code meets them (_ae_io.io_of — the builder)
    IOC = IO.Ctx(E=E, F=F, fj=fj, fep=fep, XS=XS, steps=steps, H=H, hf=hf, chains=chains, EXIT=EXIT, dset=dset, par=r["_beh"]["par"],
                 pieces=L["feedwide"]["pieces"]["rows"])
    IOC.req = req_name if shape_body else None
    # round-1 review: what the hovers read beside the element — a client branch's function (F18), each drawn function's callers by
    # the station's call edges and its depth (N3-24), its docstring's first sentence and return type (F20)
    IOC.site_fn = {e["id"][2:]: e["x"]["pc"][1] for e in els if e["f"] == "client" and str(e.get("id") or "").startswith("s:") and (e.get("x") or {}).get("pc")}
    IOC.radj, IOC.fninfo, IOC.lvbeh = X["radj"], X["fninfo"], X.get("lvbeh") or {}
    IOC.drawn = {k[3:] for e in els if e["f"] == "fn" for k in e["keys"][:2] if k.startswith("fn:")}
    IOC.depth_of = {k[3:]: e["x"]["dp"] for e in els if e["f"] == "fn" and (e.get("x") or {}).get("dp") for k in e["keys"][:2] if k.startswith("fn:")}
    for e in els:
        if e["w"][0] == "nm":                                    # D-064 (2): no moment by nature — the last column, never the band
            nmv.append([e["f"], "piece", e["keys"], e["text"], e.get("x") or None]); rn[e["f"]].update(e["rec"])
            continue
        if e.get("jy"):                                          # D-065: a journey's other requests, at an outer moment every path passes;
            if e["si"] not in (SI["start"], SI["after"]) or any(e["si"] not in passed[p] for p in e["paths"]):   # on the paths its step here
                die(f"{lab}: D-065 — the journey {e['jy']} stands at {e['si']}, not at an outer moment each of its paths passes")   # ends on
            ends = sorted({PI[p] for p in e["paths"] if p in PI})
            if len(ends) != len(e["paths"]):
                die(f"{lab}: D-065 — the journey {e['jy']} rides a path the picker does not offer")
            # its paths as bits (0: on no one path — drawn while every path is shown, gone once one is picked)
            el.append([e["f"], e["si"], e["keys"], e["text"], e["chip"], None if set(ends) == live else sum(1 << i for i in ends), e["hint"], dict(e["x"]), e["o"]])
            rp["proof"].update(e["rec"]); tally["jy:mask0"] += not ends
            continue
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
            if e["f"] == "fn":                                   # review F2: a function on no path at THIS call may stand at another
                gone_fn.append(e)
                continue
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
        ends = sorted({PI[p] for p in pp if p in PI})
        mask = None if set(ends) == live else sum(1 << i for i in ends)   # the paths it is on, one bit each (the page tests a bit)
        if mask == 0:
            die(f"{lab}: {e['f']} {e['id']} is placed on no path")
        xx = dict(e.get("x") or {})
        if e.get("pb"):                                          # D-056 (4): per path (the picker's index), the fate it gives the write
            xx["fa"] = {str(PI[pid]): [f for f in FATES if f in bs] for pid, bs in sorted(e["pb"].items(), key=lambda kv: PI.get(kv[0], -1)) if pid in PI}
        if "cq" in xx:                                           # review F1: the picker's indices of the paths a check rides only by its call
            xx["cq"] = [xx["cq"][0], sorted(PI[q0] for q0 in xx["cq"][1] if q0 in PI and q0 in pp)]
            if not xx["cq"][1]:
                del xx["cq"]
        if "lq" in xx:                                           # review F1: per function it may be left inside, the picker's indices
            xx["lq"] = [q0 for q0 in ([k0, sorted(PI[p0] for p0 in v0 if p0 in PI and p0 in pp)] for k0, v0 in sorted(xx["lq"].items())) if q0[1]]
            tally["f1:lqChips"] += bool(xx["lq"]); tally["f1:lqPaths"] += len({p0 for q0 in xx["lq"] for p0 in q0[1]})
            tally["f1:noname"] += sum(1 for q0 in xx["lq"] if q0[0].startswith("@ "))
            for p0 in pp & set().union(*[set(v0) for v0 in e["x"]["lq"].values()]):
                hw = e["_lqh"].get(p0) or set()                  # each chip-path once: i before ii before p (inherited only)
                tally["f1:lq:" + ("i" if "i" in hw else "ii" if "ii" in hw else "p")] += p0 in PI
            if not xx["lq"]:
                del xx["lq"]
        if "rc" in xx:                                           # D-056 (5): the ending the race escapes to — its status
            xx["rc"] = xx["rc"][:3] + [XS[xx["rc"][3]].get("status")]
        xx["io"] = IO.io_of(e, xx, IOC)
        el.append([e["f"], si, e["keys"], e["text"], e["chip"], mask, e["hint"], xx, e["o"]]); rp[e["f"]].update(e["rec"])
        if e["f"] == "inf":                                      # D-070: its feed row, for its lifeline
            inf_src[id(el[-1])] = e
        PX.update(e.get("m") or [])
        if e["f"] == "data":
            PX.update(("step", q[2:]) for q in e["rec"] if q.startswith("s:"))
    # review F2 · F3: a function on no path at one call is not drawn there when a call of the endpoint places it (it stands at that
    # one); else it goes to the band — with the reason the except it is called in gives, where that is why (review F3), else on no path
    for e in gone_fn:
        if set(e["rec"]) <= rp["fn"]:
            tally["d64:gonecall"] += 1
            continue
        un.append([e["f"], e["keys"], e["text"], e.get("_why") or "nopath"]); ru[e["f"]].update(e["rec"])
    # D-057 · each path's fate, drawn: a path with no write of its own shows none (the fate "none"); a path whose own writes all stand at
    # their moments wearing its fate on its pick (saved · maybe · rolled back · left unsaved); a path whose writes all run after the
    # answer, each standing after the answer on it
    for pid in picks:
        fo = fate_p[pid]
        own = {q["step"] for q in (EFP[pid].get("steps") or []) if not q.get("dependency") and (steps.get(q["step"]) or {}).get("op") in WRITE_OPS}
        if fo == "none" and not own or fo == "after" and {a["step"] for a in after_writes(PATH[pid], steps)} <= paft[pid] \
                or fo not in ("none", "after") and own and own <= pws[pid]:
            PX.add(("fate", pid))
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
            "shape": ({"q:body"} if shape_body else set()) | {"q:" + f for f in (req_fields or []) if shape_body} | ({"r:reply"} if rsp else set())
                     | {"n:in:" + n2 for n2 in ((r["d"].get("request") or [None, None, []])[2] if shape_body else [])}
                     | {"n:out:" + n2 for n2 in ((rsp or [None, None, []])[2] if rsp else [])},
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
        got = rp[f] | ru[f] | rn[f]
        if rp[f] & ru[f] or (rp[f] | ru[f]) & rn[f]:
            die(f"{lab}: {f}: {sorted((rp[f] & ru[f]) | ((rp[f] | ru[f]) & rn[f]))[:3]} stand in two of: a moment, the band, the no-moment column")
        if f in want and got != want[f]:
            die(f"{lab}: {f}: the records BY MOMENT holds differ from the code map's: only here {sorted(got - want[f])[:3]}, only there {sorted(want[f] - got)[:3]}")
        if f in sub and not sub[f] <= got:
            die(f"{lab}: {f}: the code map counts {sorted(sub[f] - got)[:3]}, which BY MOMENT does not hold")
    # D-056 (2) · D-064 (2): the cases that call it only to set another test up have no moment by nature — every one of them stands in
    # Proof's no-moment cell (the band no longer holds them), one chip per case, as the code map names them. PROOF: exactly the code
    # map's list, each once
    for cid, how in r["d"].get("arranged") or []:
        # review F12: its name and the request it sets up for (the first call after its last arranging call here, to another endpoint);
        # review N3-15: a case that also ACTS on this endpoint tests it, and sets up besides
        cs0 = (TCS.get(cid) or {}).get("calls") or []
        arr_i = [i for i, c0 in enumerate(cs0) if c0.get("endpoint") == E and c0.get("role") != "act"]
        nx = next(([c0.get("method"), c0["endpoint"].split(" ", 1)[1] if c0.get("endpoint") in FEP else c0.get("path")]
                   for c0 in cs0[(max(arr_i) + 1 if arr_i else 0):] if c0.get("endpoint") != E), None)
        ax = {"h": how, "nm": BENCH._case_name((TCS.get(cid) or {}).get("name"), cid)}
        if any(c0.get("endpoint") == E and c0.get("role") == "act" for c0 in cs0):
            ax["t"] = 1; tally["arrActs"] += 1
        if nx:
            ax["nx"] = nx
        nmv.append(["proof", "arr", ["case:" + cid], cid, ax]); rn["proof"].add("p:" + cid + ":arranged")
        tally["arrCol"] += 1
    arr_k = [x[3] for x in nmv if x[1] == "arr"]
    if arr_k != [c0 for c0, _h in r["d"].get("arranged") or []] or len(set(arr_k)) != len(arr_k):
        die(f"{lab}: Proof's no-moment cell holds {arr_k}, the code map's arranging cases {r['d'].get('arranged')}")
    # D-065 (B): the journeys the station names here that cannot be ordered around this request, each with its reason, after the
    # arranging cases. PROOF: every journey of the station's list stands once — placed at the outer moments or named here
    for cid, jid, why, jx in jnm:
        nmv.append(["proof", "jy", ["case:" + cid] if jre.search(cid) else [], cid, dict(jx, id=jid, w=why)]); rn["proof"].add("j:" + jid + ":nm")
    j_all = [UNI.jy_id(str(j.get("cid") or ""), j.get("corpus")) for j in L["tests"].get("journeys") or []]
    j_got = [x[4]["id"] for x in nmv if x[1] == "jy"] + list(dict.fromkeys(e["jy"] for e in els if e.get("jy")))
    if sorted(j_got) != sorted(j_all) or len(set(j_all)) != len(j_all):
        die(f"{lab}: D-065 — the station names the journeys {j_all}, BY MOMENT draws {j_got}")
    n_act = len({x for x in rp["proof"] | ru["proof"] if x.startswith("p:") and not x.endswith((":raises", ":arranged"))})
    if n_act != ((F.get("tests") or {}).get("act") or 0):
        die(f"{lab}: the code map counts {(F.get('tests') or {}).get('act')} test calls acting on it, BY MOMENT holds {n_act}")
    if n_occ != sum(len(v) for v in occ.values()):
        die(f"{lab}: {n_occ} step occurrences placed or counted, the paths list {sum(len(v) for v in occ.values())}")
    tally["occ"] += n_occ
    el.sort(key=lambda x: (x[1], MO_ORDER.index(x[0]), x[8]))           # stable: within one family, the order the records were read
    # D-067 (L-03, his "I don't see the difference between one and the other"): two items of one block at one moment whose hovers
    # would read the same stop the build — each must carry what makes it itself (a limit's scope and numbers, the status a test proves)
    tw = IO.twins(lab, el)
    if tw:
        die(f"{lab}: items whose hovers read the same at one moment (D-067): {tw[:3]}")
    for x in el:
        x.pop()                                                      # [family, moment, keys, words, chip, endings, hint, extras (D-056)]
    # the path picker: each path under the moment its ending leaves at, in time order; two endings of one status at one moment are told
    # apart by the first of these that differs between them — their own words, the limiter, their checks, the ending's condition, its
    # line. D-057 (c): two paths to one ending are told apart by the forks each takes (the chain's branches it takes: their condition,
    # or its running past every fork), else by what FastAPI checks on it (its own parameters or a dependency's) — PROVEN distinct
    frec = {x["id"]: x for x in (fep.get("produced") or []) + (fep.get("framework_exits") or [])}
    lim = {l0.get("exit"): str(l0.get("limiter") or l0.get("class") or "").lstrip("_") for l0 in (F.get("rate") or {}).get("limits") or []}
    chk = {t["x"]["id"]: " · ".join(pre[c].get("pred") or "" for c in t["checks"]) for t in rows if t["x"] is not None}
    tell = (lambda x: says(XS[x]), lim.get, chk.get, lambda x: (frec.get(x) or {}).get("pred"),
            lambda x: _short((frec.get(x) or {}).get("site") or (frec.get(x) or {}).get("at")))
    brs = {b["id"]: b for b in fep.get("branches") or []}
    fork = {}
    for xid in EI:
        ps = [pid for pid in picks if EXIT[pid] == xid]
        if len(ps) < 2:
            continue
        took = {pid: [["pred", brs[s["ref"]]["pred"]] if (brs.get(s["ref"]) or {}).get("pred") else ["fall"] if (brs.get(s["ref"]) or {}).get("token") == "fall-through"
                      else die(f"{lab} {pid}: it takes fork {s['ref']}, which the feed names by no condition") for s in chains[pid] if s.get("kind") == "branch" and s.get("hit")]
                for pid in ps}
        if any(not v for v in took.values()) or len({json.dumps(v) for v in took.values()}) != len(ps):
            took = {pid: [["split", PATH[pid].get("split")]] if PATH[pid].get("split") else [] for pid in ps}
        if any(not v for v in took.values()) or len({json.dumps(v) for v in took.values()}) != len(ps):
            die(f"{lab} {xid}: {len(ps)} paths reach it, and neither the forks they take nor what FastAPI checks tells them apart")
        fork.update(took); tally["forkEnds"] += 1; tally["forkPaths"] += len(ps)
    ex = [[EXIT[pid], XS[EXIT[pid]].get("status"), XS[EXIT[pid]]["kind"], x_si[EXIT[pid]], 1, None] for pid in picks]
    grp = collections.defaultdict(list)
    for i, x in enumerate(ex):
        grp[(x[3], x[1])].append(i)
    for ids in grp.values():
        xs_ = list(dict.fromkeys(ex[i][0] for i in ids))         # the distinct endings among them: two paths to one ending share its words
        if len(xs_) > 1:
            fc = next(([t(x) for x in xs_] for t in tell if all(t(x) for x in xs_) and len({t(x) for x in xs_}) == len(xs_)), None)
            tally["faces"] += fc is None
            for i in ids:
                ex[i][5] = dict(zip(xs_, fc or [None] * len(xs_)))[ex[i][0]]
    for i, x in enumerate(ex):                                    # D-055: what a path code's hover says — the ending's own words, its limiter
        x += [says(XS[x[0]]) or None, lim.get(x[0]) or None, picks[i], fork.get(picks[i])]   # D-057: the path, the forks that tell it apart
    pas = [sorted(seen[pid]) for pid in picks]
    # ── D-070 (his L-12: "we are affecting these tables, but how? With what function?" · L-17: "surface what we are affecting"): the
    # relations across the moments — each function's reads and writes as connectors to its tables, each in-flight value's lifeline —
    # read from what is placed above and PROVEN in _ae_rel (a read before its value is set, an ending decided before its read, a
    # connector the row does not place: the build stops) ──
    def hsi_one(q):                                              # a handler line's moment, or None where it falls in no one run
        c = hclass(q)
        if c == "answer":
            return SI["answer"]
        hit = [i for i, x in enumerate(seg) if x[0] == c and x[1] is not None and x[1] <= q <= x[2]]
        return H0 + hit[0] if len(hit) == 1 else None

    def hnext_one(q):                                            # a line between two runs of its class, no anchor between: the next run
        c = hclass(q)
        nx = sorted((x[1], i) for i, x in enumerate(seg) if x[0] == c and x[1] is not None and x[1] > q)
        if not nx or any(q < a < nx[0][0] for a, _c in anchors):
            return None
        tally["c2:il:gap"] += 1
        return H0 + nx[0][1]
    own_ops = {_line(steps[s]["at"]): steps[s]["op"] for s in sids if steps.get(s, {}).get("fn") == H and inh(steps[s].get("at")) and steps[s].get("op") in REL.RULE_OPS}
    dx = REL.data_links(el, pas, live, lab, die, tally)
    il = REL.lifelines(el, inf_src, REL.Ctx(lab=lab, die=die, rows={"i:" + ikey(x): x for x in (F.get("inflight") or {}).get("rows") or []}, SI=SI, x_si=x_si,
                                            XS=XS, EXIT=EXIT, picks=picks, live=live, pas=pas, hsi=hsi_one, hnext=hnext_one, inh=inh, direct=direct, own_ops=own_ops,
                                            fep=fep, F=F), tally)
    # ── D-068 · the stage each ending's moment stands in is the stage it leaves from (the code map's stages column, read per ending) ──
    for xid, si_ in x_si.items():
        if isinstance(si_, int):
            m_ = sp[si_][0]
            want_ = "ANSWER" if XS[xid]["kind"] == "success" else "UNCAUGHT" if XS[xid]["kind"] == "uncaught" else PHASE_STAGE.get(XS[xid].get("phase"), "HANDLER")
            if m_ in MO_OUT or m_ == "save" or MO_STAGE[m_] != want_:
                die(f"{lab} {xid}: D-068 — it leaves at '{m_}', drawn under {MO_STAGE.get(m_)}, and leaves from {want_}")
    # ── D-068 · the handler's forks (his L-05: "in the handler section we might have different branches … we need to have visibility of
    # that"): the excepts of ONE try side by side (its catches, grouped by the paths the feed records through that try), then where the
    # try goes on when nothing is raised (the next moment, or none when that is another try's except). A request takes ONE of them —
    # PROVEN per path through the try: the excepts its chain enters, plus the next moment when it gets there; two, and the build stops ──
    ctry = {at: frozenset(c.get("paths") or []) for at, c in cat_rec.items()}
    fks, i_ = [], H0
    while i_ < SI["answer"]:
        if sp[i_][0] != "fail":
            i_ += 1
            continue
        tp = ctry.get(TO["gat"][sp[i_][1]])
        if tp is None:
            die(f"{lab}: D-068 — failure group {sp[i_][1]} ({TO['gat'][sp[i_][1]]}) names a catch the feed does not record")
        j_ = i_
        while j_ + 1 < SI["answer"] and sp[j_ + 1][0] == "fail" and ctry.get(TO["gat"][sp[j_ + 1][1]]) == tp:
            j_ += 1
        arms = list(range(i_, j_ + 1))
        go = j_ + 1
        while go < SI["answer"] and sp[go][2] is None:              # an open slot (a moment the handler does not have) is passed by none
            go += 1
        go = go if sp[go][0] != "fail" else None                     # where it goes on: a moment of its own, or another try's except
        take = []
        for pid in picks:
            t_ = [a for a in arms if TO["gat"][sp[a][1]] in cats_of[pid]] + ([go] if go is not None and pid in tp and go in seen[pid] else [])
            if len(t_) > 1:
                die(f"{lab} {pid}: D-068 — a path takes {len(t_)} ways of the try whose excepts stand at {[TO['gat'][sp[a][1]] for a in arms]}: {t_}")
            if pid in tp and not t_ and go is not None and not unc(pid) and (xe_of(pid) is None or xe_of(pid) >= arms[0]):
                die(f"{lab} {pid}: D-068 — a path through the try at {TO['gat'][sp[i_][1]]} takes none of its ways and does not leave inside it")
            take.append(t_[0] if t_ else None)
        fks.append([arms, go, take])
        tally["fk"] += 1; tally["fkArms"] += len(arms) + (go is not None)
        i_ = j_ + 1
    # D-055: the code-map members BY MOMENT places, read through the RECORDS the build check above joins (each placed element's
    # records, turned into the member the code map names: an ending, a guard, a table a step touches, a function …); the members of
    # the records that check counts as the code map's own (want · sub); and the keys every placed element is drawn with
    def mem(f, rec, k0):
        p, _c, v = rec.partition(":")
        if f == "end":
            return [("end", rec)]
        if f == "gate":
            return [({"g": "guard", "b": "fork", "c": "catch", "a": "gate", "l": "limiter"}[p], v)]
        if f == "data":                                           # F1: a step's table, and the op its chip wears (r | w)
            t = (steps.get(v) or {}).get("table") if p == "s" else v
            op = [("wtable" if steps[v].get("op") in WRITE_OPS else "rtable", t)] if t and p == "s" else []
            return [("table", t)] + op if t else []
        if f == "fn":
            return [("fn", v)]
        if f == "shape":                                          # D-056 (8): a schema inside the body or the reply, by its key
            if p == "n":
                return [("nested", tk(v.split(":", 1)[1]))]
            return [("body",)] if rec == "q:body" else [("reply",)] if rec == "r:reply" else [("field", v)]
        if f == "client":                                         # a cache write ("o:") is BY MOMENT's own reading: no field names it
            return [("sender", k0)] if p == "h" else [("screen", v)] if p == "v" else [("reason", v)] if p == "s" else []
        if f == "inf":
            return [("inflight", v)]
        if f == "proof":
            if rec.startswith("j:"):                              # D-065: a journey — no field of the code map names one
                return [("journey", rec[2:].rsplit(":", 1)[0])]
            cid = (rec[:-len(":raises")] if rec.endswith(":raises") else rec)[2:].rsplit(":", 1)[0]
            return [("case", cid)] + ([] if rec.endswith(":raises") else [("act", rec)])
        if f == "stage":                                          # the middleware ("m:") is the chain's own step: no field names it
            return [("rule", v)] if p == "k" else []
        if f == "std":
            return [("switch", v)] if p == "w" else [("piece", v)]
        return []
    PM, KM, byrec = set(), set(), {}
    for x in el:                                                  # the placed elements, as drawn (keys, text) — their records are rp;
        if not (x[4] and x[4][0] == "jy"):                        # a journey's chips are no key of anything (review J3): its case and the
            KM.update(x[2])                                       # endpoints it walks to are drawn by it, not placed — it carries by its id
    for f in rp:
        for rec in rp[f]:
            k0 = next((e["keys"][0] for e in els if rec in e["rec"] and e["f"] == f and e["keys"]), None) if f == "client" else None
            byrec[(f, rec)] = mem(f, rec, k0)
            PM.update(byrec[(f, rec)])
    PW = {m for f in rp for rec in rp[f] if rec in (want.get(f, set()) | sub.get(f, set())) for m in byrec[(f, rec)]}
    for f in rn:                                                  # D-064 (2): what the no-moment column draws of the code map's records
        for rec in rn[f]:
            PM.update(mem(f, rec, None) if not rec.endswith(":arranged") else [("arranged", rec[2:-len(":arranged")])])
    KM.update(k for x in nmv if x[1] != "jy" for k in x[2])
    # the elements each block holds, counted — a journey is counted apart (review J7): its chips and its name are no element of Proof
    ne = lambda xs: len([q for q in xs if not str(q).startswith("j:")])
    return {"sp": sp, "el": el, "un": un, "ex": ex, "pass": pas, "fk": fks, "n": {f: [ne(rp[f]), ne(ru[f]), ne(rn[f])] for f, _a in MO_FAM if ne(rp[f]) or ne(ru[f]) or ne(rn[f])},
            "nm": nmv, "_P": PM | PX, "_Pw": PW, "_K": KM, **({"dx": dx} if dx else {}), **({"il": il} if il else {})}


MO_ORDER = [f for f, _a in MO_FAM]


# ── 2c′ · D-064 (2) (his ruling 2026-09-28: "in the table at the end the [metadata] which is naturally not associated to any moment,
# but there could be things like cluster, entity, file and line and so on") — D-068 (his L-06/L-07) moved it out of the table into
# the ENDPOINT METADATA inside BY MOMENT, one card per block; the record below is unchanged. It was: BY MOMENT's LAST column, "no moment" (the last row when
# the moments are rows). One cell per block: that block's facts that have NO moment by nature — what the endpoint IS (its method and
# path, the path it is served at, its first segment, its entity and the Gabe Universe's cluster, the handler's file and line with its
# def line, its outline and its docstring, the station's flags) and what SUMS it up (the fates of its paths, its longest chain, how
# many functions stand behind it, its proof, its alarms, the cases that only arrange through it, its rare pieces that name what it is,
# the norms it lacks). Each fact's block is read from the ruled tree: the block its attribute is homed in (NM_ATTR, never a block id).
# The band keeps only what SHOULD have a moment and the map cannot place. The path choice never hides the column: each fact is true
# of every path. Every number is read from the same record the code map draws it from, and PROVEN equal to its other readings below.
NM_ATTR = (("ep", "method-path"), ("full", "method-path"), ("seg", "entity-cluster"), ("ent", "entity-cluster"), ("cl", "entity-cluster"),
           ("risk", "risk-flag"), ("behind", "functions-behind-walk-levels"), ("proof", "coverage-per-condition"), ("alarm", "findings"),
           ("file", "file-line"), ("sig", "signature"), ("doc", "the-handler"), ("fate", "fate-of-the-writes-per-ending"),
           ("chain", "the-ordered-chain-per-ending"), ("arr", "case-role-on-this-endpoint"), ("jy", "case-role-on-this-endpoint"), ("piece", "how-common-this-piece-is"),
           ("lack", "how-common-this-piece-is"))
NM_KINDS = [k for k, _a in NM_ATTR]
JY_WHY = ("agg", "one", "norec", "nohere", "only")                      # D-065 (B): why a journey cannot be ordered around this request
JY_JOIN = ("refs", "status", "none", "miss", "many", "act")             # D-065: how a journey's call here follows a picked path (review J6)
NM_SUMS = ("fate", "chain", "behind", "proof")
NM_SUM_K = ("behind", "proof", "alarm", "fate", "chain", "piece", "lack")  # D-068: the facts that sum it up — their columns join the metadata
NM_COL = {"behind": "behind", "proof": "proof", "alarm": "alarms", "fate": "fate", "chain": "chain", "lack": "lacks"}   # D-068: the column each details there                          # the code-map fields that sum it up: one member each, drawn here


def nm_facts(nm: list) -> set:
    """the universe card's items the column draws that carry no key (D-058's ("m", fact) members): the cluster, the outline, the
    docstring, a flag, the count behind — re-read from the column's own record"""
    out = set()
    for x in nm:
        if x[1] in ("cl", "sig", "doc", "behind"):
            out.add({"cl": "cluster"}.get(x[1], x[1]))
        elif x[1] == "risk":
            out.add("risk:" + str((x[4] or {}).get("id")))
    return out


def no_moment(r: dict, L: dict, fj: dict, fep: dict, A: dict, tally: collections.Counter, mounts: list) -> None:
    mo, v, d, I, lab = r["mo"], r["v"], r["d"], L["identity"], r["id"]
    fam = {A[a]["home"]: f for f, a in MO_FAM}
    fam_of = {}
    for k, a in NM_ATTR:
        fam_of[k] = fam.get((A.get(a) or {}).get("home")) or die(f"D-064: the no-moment fact {k} names attribute {a}, homed in no block BY MOMENT draws")
    for x in mo["nm"]:                                                    # the band's two (a timeless piece, an arranging case): their block is by_moment's
        if fam_of[x[1]] != x[0]:
            die(f"{lab}: D-064 — by_moment put a {x[1]} in {x[0]}, the ruled tree homes it in {fam_of[x[1]]}")
    out, P = [], set()

    def put(kind, keys, text, x=None, members=()):
        out.append([fam_of[kind], kind, [k for k in keys if k], text, x or None]); P.update(members)
        tally["nm:" + kind] += 1
    uni = {u["row"]: u for u in r["uni"]["rows"]}
    # WHAT IT IS — the method and path (its glyph and method label are the station's, D-052), the path it is served at and the mount
    # before it, the URL's first segment, the entity, the cluster the Gabe Universe draws it in (its Above row), the station's flags
    put("ep", ["endpoint:" + lab], r["p"], members=[("endpoint", lab)])
    full = r.get("full")
    # review F6: a route the map labels "/" while it is served at a longer path (a path built from a constant): its own path and first
    # segment are read from the served path, less the longest of the app's mounts it starts with — and the hover says the map's label
    own = r["p"] if full and full.endswith(r["p"]) and r["p"] != "/" else None
    mt = full[:len(full) - len(own)] if own else next((m for m in mounts if full and full.startswith(m) and len(full) > len(m) + 1), None)
    if full and full != r["p"]:                                           # the mount before it
        put("full", [], full, {"mt": mt} if mt else None)
        tally["nm:fullOdd"] += own is None
    lb = r["p"] if own is None and mt is not None and full else None
    seg = full[len(mt):].strip("/").split("/")[0] if lb else r["seg"]
    if lb and not seg:
        die(f"{lab}: review F6 — the served path {full} less its mount {mt} leaves no segment")
    put("seg", [], seg, {"lb": lb} if lb else None, members=[("segment", r["seg"])])
    tally["f6:seg"] += bool(lb)
    if r.get("ent"):
        put("ent", ["entity:" + r["ent"]], r["ent"], members=[("entity", r["ent"])])
    if uni.get("ABOVE") and uni["ABOVE"]["items"]:
        put("cl", [], uni["ABOVE"]["items"][0], {"lb": lb} if lb else None)
    # the station's flags — each with its own words (review F4). "no test covers this" is the station's reading of its case index; where
    # a test calls the endpoint (an acting call, or a case that arranges through it) the code says otherwise, and the column, which
    # holds facts about the code, leaves the flag out (the universe panel still draws it)
    called = bool((L["forms"].get("tests") or {}).get("act")) or bool(d.get("arranged")) or bool((d.get("proof") or {}).get("tested"))
    for fl in (uni.get("RISK") or {}).get("items") or []:
        if fl[0] == "untested" and called:
            tally["f4:untestedOut"] += 1
            continue
        put("risk", [], fl[2], {"id": fl[0]})
    # WHAT SUMS IT UP (the Overview's) — how many functions stand behind it and how deep, its proof, its alarms
    if isinstance(v.get("behind"), int) and v["behind"] > 0:
        cb = uni.get("CODE BEHIND")
        if d["behind"][0] != v["behind"] or (cb and cb["count"] != v["behind"]):
            die(f"{lab}: D-064 — {v['behind']} behind in the code map, {d['behind'][0]} in its pair, {cb and cb['count']} on the card")
        put("behind", [], str(v["behind"]), {"n": v["behind"], "dp": d["behind"][1]}, [("sum", "behind")])
    if d.get("proof") and d["proof"].get("of"):
        put("proof", [], "", dict(d["proof"]), [("sum", "proof")])
    al = v["alarms"] if isinstance(v.get("alarms"), list) else []
    if len(al) != (r["k"].get("alarms") or 0):
        die(f"{lab}: D-064 — {len(al)} alarms drawn, the code map counts {r['k'].get('alarms')}")
    for a in al:
        put("alarm", [], a, None, [("finding", a)])
    # THE HANDLER — its file and the line its route is declared at (the code map's pair), the line its def stands at, its outline, its
    # docstring. PROVEN: the file and line are the lab's own place for it; the def line is the forms feed's record of the handler
    df = _line((((fj.get("functions") or {}).get(fep.get("handler")) or {}).get("at")))
    if r.get("file"):
        if I.get("at") and I["at"] != f"{r['file']}:{r['line']}":
            die(f"{lab}: D-064 — the code map says {r['file']}:{r['line']}, the lab's place for it {I.get('at')}")
        if df is not None and df < (r["line"] or 0):
            die(f"{lab}: D-064 — its def stands at line {df}, above the line its route is declared at ({r['line']})")
        put("file", ["file:" + r["file"]], r["file"], {"ln": r["line"], "df": df if df != r["line"] else None}, [("file", r["file"])])
    sg = r.get("sig") or [None] * 5
    if sg[1] is not None:
        if sg[1] != (I.get("sig") or {}).get("lines"):
            die(f"{lab}: D-064 — the outline's {sg[1]} lines are not the lab's {(I.get('sig') or {}).get('lines')}")
        rk = r["dk"].get("response") if sg[2] and sg[2] == (d.get("response") or [None])[0] else None
        put("sig", [rk] if rk else [], sg[3] or "", {"a": 1 if sg[0] else 0, "n": sg[1], "rt": sg[2]})
    if r.get("file"):
        put("doc", [], sg[4] or "", {"no": 1} if not sg[4] else None)
    # WHAT SUMS IT UP (its blocks') — the fates of its paths (each fate with the paths that meet it), its longest chain
    if isinstance(v.get("fate"), dict):
        if sum(v["fate"].values()) != len(L["forms"]["paths"]):
            die(f"{lab}: D-064 — the fates count {sum(v['fate'].values())} paths, the endpoint has {len(L['forms']['paths'])}")
        put("fate", [], "", {"f": [[f, v["fate"][f]] for f in FATES if v["fate"].get(f)]}, [("sum", "fate")])
    if isinstance(v.get("chain"), int):
        if v["chain"] != L["forms"]["counts"]["steps_max"]:
            die(f"{lab}: D-064 — the longest chain is {v['chain']} steps in the code map, {L['forms']['counts']['steps_max']} in the facts")
        put("chain", [], str(v["chain"]), {"n": v["chain"]}, [("sum", "chain")])
    # the norms it lacks (the Standard or specialist block's; its rare pieces that name what it is came from by_moment)
    for (words, n, of), fk in zip(d["lacks"], r["xd"]["lacks"]):
        put("lack", [], words, {"n": n, "of": of, "fk": fk}, [("lack", words)])
    if len(d["lacks"]) != (r["k"].get("lacks") or 0):
        die(f"{lab}: D-064 — {len(d['lacks'])} norms drawn as lacking, the code map counts {r['k'].get('lacks')}")
    nm = sorted(mo["nm"] + out, key=lambda x: NM_KINDS.index(x[1]))       # stable: within one kind, the order read
    tally["nm:facts"] += sum(1 for x in nm if x[1] != "jy"); tally["nm:rows"] += 1   # review J7: a journey named here is counted apart
    mo["nm"] = nm
    mo["_P"] |= P
    mo["_K"] |= {k for x in out for k in x[2]}
    mo["_nmsum"] = {m[1] for m in P if m[0] == "sum"}


# ── 2d · D-055: WHAT BY MOMENT CARRIES OF THE CODE MAP ─────────────────────────────────────────────────────────────────
# His ask 2026-09-26: a switch that dims or hides every field of the code map BY MOMENT already carries, to see what is left. Every
# field the code map draws (its head pairs, its column pairs, its detail pairs and the own checks inside the endings) is read here as
# its MEMBERS — the code map's own identities (the row record's `u`, its detail items, D-053's rows), never the page's words — and a
# member is carried when BY MOMENT places it at a moment on any path (by_moment's _P, read through the records its build check joins).
# An item field (a list, a table's rows) carries each drawn item apart; a count carries all its members or part of them. A field no
# member of which BY MOMENT places (a count of the fates, the alarms' dots, a count of chain steps, the proof rank) stays bright.
#     D-057 (his ruling "build 1 and 2"): a member is also a FACT a placed chip draws, said by by_moment beside the records — the success
# status the decorator declares (the filled success chip), the handler's file (its chip's hover), the endpoint and its first segment
# (BY MOMENT's heading), a path's fate (its writes wearing it on its pick, or no write of its own), a raise's words on its check, a
# client branch's status and what it does, a race on its flush, the cause on the 500 and on the function it escapes from, a step. An
# alarm's members are the facts it reads (amem), so the switch reads it carried when each stands at its moment.
#     PROVEN per endpoint: (A) every member BY MOMENT places is drawn there under the key the code map draws it with; (B) a member not
# placed is never drawn there under a key of its own; (C) every record BY MOMENT places that its build check counts as the code map's
# own (want · sub) is a member a code-map field names — so the switch can hide nothing BY MOMENT does not hold, and miss nothing it does.
# The one exception is the data block's: its records are the effects' steps, and a step on a table the code map does not list is
# BY MOMENT holding MORE than the code map, not less — a gap in the code map, said on the page: the tables fields keep their names in
# every look and say how many tables only BY MOMENT holds (state x), and the header counts them.
# Per field: [state, the drawn items' flags, carried, of, the tables only BY MOMENT holds (state x, or p with some)]; states c · p · b,
# e = the field holds nothing on this endpoint (nothing to carry, nothing left out — counted apart, never "left"), x = every element it
# lists is carried AND BY MOMENT holds more of its kind. Three fields hold nothing a moment could place by construction (the tally
# of the paths' fates, the chain's length, the proof rank): they are never e. D-064 (2): each is ONE member, the sum itself, and
# BY MOMENT's no-moment column draws it (no_moment) — carried; the count behind (c:behind) is read the same way. The column also
# draws the endpoint's entity (h:entity), the handler's file, its alarms (c:alarms), the cases that only arrange through it, its
# rare pieces that name what it is and the norms it lacks — their members join P there, PROVEN by (A) · (B) below like any other.
CV_KINDLESS = ("c:fate", "c:chain", "d:proof")
CV_TABLES = ("c:tables", "d:tables")


def carried(r: dict, L: dict, fj: dict, fep: dict, W: dict) -> None:
    mo, F, U, d, dk, v = r["mo"], L["forms"], r["u"], r["d"], r["dk"], r["v"]
    P, PW, K, SUMS = mo.pop("_P"), mo.pop("_Pw"), mo.pop("_K"), mo.pop("_nmsum")
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
    # D-064 (2): a field that sums the endpoint up (the fates' tally, the longest chain, the count behind, the proof's rank) is ONE
    # member, the sum itself — carried when BY MOMENT's no-moment column draws it (a field whose arm is absent: nothing to draw, left)
    sm1 = lambda k0: [("sum", k0)] if (k0 == "proof" or live(k0)) and k0 in SUMS else []
    # ── every field, as (key, "n" count over members | "i" one entry per drawn item, members) ──
    spec = [("h:method", "n", [("endpoint", r["id"])]),
            ("h:handler", "i", [[("fn", fep.get("handler") or "")], [("file", r.get("file"))]]),
            ("h:entity", "n", [("entity", r["ent"])] if r.get("ent") else []),
            ("h:segment", "n", [("segment", r["seg"])]),
            ("h:declared", "n", [("declared", r["declared"])] if r.get("declared") not in (None, "") else [])]
    # F1 (review 2026-09-26): a table the code map lists as WRITTEN is carried by a write chip on it, a table's r/w item by a chip of
    # each op it names — never by a chip of the other op (a read of cooking_photos never carries its delete); "tables" (touched) by any
    COLM = {"all": ends, "stage": ends if live("stage") else [], "tables": uu("tables", "table"), "written": uu("written", "wtable"), "guards": uu("guards", "guard"),
            "auth": gates if live("auth") else [], "response": [("reply",)] if d.get("response") else [], "acts": acts if live("acts") else [],
            "asserted": cases(True) if live("asserted") else [], "proof": cases(False) if live("proof") else [],
            "branches": uu("branches", "fork"), "catches": uu("catches", "catch"), "rate": lims if live("rate") else [], "fate": sm1("fate"),
            "deciders": uu("deciders", "fn"), "datafns": uu("datafns", "fn"), "request": fields,
            "fetched": [("sender", fb.get("id")) for fb in L["widening"]["fetched_by"]] if live("fetched") else [],
            "reasons": uu("reasons", "reason"), "chain": sm1("chain"), "cases422": uu("cases422", "rule"),
            "inf_answer": uu("inf_answer", "inflight"), "inf_server": uu("inf_server", "inflight"),
            "alarms": [("finding", a) for a in (v["alarms"] if isinstance(v["alarms"], list) else [])],
            "behind": sm1("behind"), "switches": uu("switches", "switch"),
            "pieces": pieces if live("pieces") else [], "lacks": [("lack", x[0]) for x in d["lacks"]]}
    # D-057 · an alarm's members are the facts it reads, each where BY MOMENT draws it (never the verdict word, which has no moment):
    # undeclared — the endings it names, hollow · text-only — its endings, their words in their hovers · shared-status — its endings ·
    # race-500 — the flush the race breaks at, and the uncaught 500 · reason-lost — the check whose raise words its hover says, and the
    # ending that sends other words · reason-collapsed — the client's branch with the status it reads and what it does, and the endings it
    # takes · escape-500 — the cause on the 500, and the raise on the function it escapes from · refusal-writes — the fate of its path ·
    # safe-method-commits — its commit. PROVEN each reading names what the alarm names, else the build stops
    prod = {x["id"]: x for x in fep.get("produced") or []}
    own_txt = [x for x in prod.values() if x.get("phase") != "uncaught" and x.get("state") == "defined" and not x.get("code")]
    dset = declared_set(fep)
    unc_x = next((x["id"] for x in F["exits"] if x["kind"] == "uncaught"), None)
    fnr = fj.get("functions") or {}

    def amem(f):
        fid = f.get("id")
        if fid == "undeclared":
            xs = [xid for xid, x in prod.items() if xid in XS and XS[xid]["kind"] != "uncaught" and x.get("state") in ("defined", "default") and decl_of(XS[xid], dset) == 0]
            if sorted({XS[q].get("status") for q in xs}) != sorted(f.get("statuses") or []):
                die(f"{r['id']}: D-057 — the undeclared endings are {sorted({XS[q].get('status') for q in xs})}, the alarm names {f.get('statuses')}")
            return [("end", q) for q in xs]
        if fid == "text-only":
            if len({(x.get("status"), str(x.get("detail"))) for x in own_txt}) != f.get("n") or any(x["id"] not in XS for x in own_txt):
                die(f"{r['id']}: D-057 — text-only counts {f.get('n')} refusals, the endpoint's own words-only refusals are {len(own_txt)} endings")
            return [("end", x["id"]) for x in own_txt]
        if fid in ("shared-status", "reason-collapsed"):
            xs = [x["id"] for x in own_txt if x["id"] in XS and x.get("status") == f.get("status") and str(x.get("detail")) in (f.get("details") or [])]
            if sorted({str(prod[q].get("detail")) for q in xs}) != sorted(f.get("details") or []):
                die(f"{r['id']}: D-057 — {fid} {f.get('status')} names {f.get('details')}, the endings say {sorted({str(prod[q].get('detail')) for q in xs})}")
            return [("end", q) for q in xs] + ([("rsite", f.get("site"))] if fid == "reason-collapsed" else [])
        if fid == "race-500":
            return [("race", f.get("race_at")), ("end", unc_x)]
        if fid == "reason-lost":
            hr = [x for x in prod.values() if x.get("at") == f.get("at") and x.get("status") == f.get("status") and x.get("detail") == f.get("detail")]
            cls = {c.strip() for x in hr for c in re.split(r"[|,]", str(x.get("via") or "").replace("except ", "")) if c.strip()}
            ats = {q.get("at") for rec in fnr.values() if any(b.get("root") == "endpoint:" + r["id"] for b in rec.get("reached_by") or [])
                   for q in rec.get("raises") or [] if q.get("msg") == f.get("was") and q.get("cls") in cls}
            gs = [g["id"] for g in pre if g.get("at") in ats]
            if len(hr) != 1 or not gs or hr[0]["id"] not in XS:          # one finding stands for every raise of those words it translates
                die(f"{r['id']}: D-057 — reason-lost at {f.get('at')}: {len(hr)} endings send its words, {len(gs)} checks raise “{f.get('was')}”")
            return [("rw", g0) for g0 in gs] + [("end", hr[0]["id"])]
        if fid == "escape-500":
            return [("cause", f.get("at")), ("raise", f.get("at"))]
        if fid == "refusal-writes":
            return [("fate", q) for q in f.get("paths") or []]
        if fid == "safe-method-commits":
            return [("step", q) for q in f.get("commits") or []]
        return [("finding", fid)]
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
           "tables": [[(q + "table", t[0]) for q in ("r", "w") if q in str(t[1] if len(t) > 1 else "")] or [("table", t[0])] for t in d["tables"]["items"]],
           "gateWrites": [[("wtable", t)] for t in d["gateWrites"]],
           # D-057: each path's fate, where BY MOMENT draws it (the write chips on its pick, or no write of its own)
           "fates": [[("fate", p["id"])] for p in TO["paths"]], "gates": [one(m) for m in gates], "limits": [[m] for m in lims],
           # D-056 (8) a schema inside the body or the reply · (7) each ending that sends a header, drawn in the reply pair
           "request": ([("body",)] + fields + [("nested", k0) for k0 in dk["reqNest"]]) if d.get("request") else [],
           "response": ([("reply",)] + [("nested", k0) for k0 in dk["repNest"]] if d.get("response") else []) + [("end", h[3]) for h in r["xd"]["hdr"]],
           "cases": uu("cases422", "rule"), "deciders": [one(("fn", un(k0, "fn:"))) for k0 in dk["deciders"]],
           # D-056 (1) every function behind, by name · (9) every piece or file that sends it, every screen above · (2) each case it arranges
           "switches": [[("switch", un(x[0], "switch:"))] for x in dk["switches"]], "behind": [[("fn", un(k0, "fn:"))] for k0 in dk.get("behind") or []],
           "proof": sm1("proof"),
           "inflight": [[("inflight", un(k0, "inflight:"))] for k0 in dk["inflight"]], "hook": [[("sender", k0)] for k0 in dk["hook"]],
           "screens": [[("screen", k0)] for k0 in dk["screens"]],
           # an arranging call has no moment: its member is its own ("arranged", case), never the acting case's ("case", …), so a case
           # that also acts at a moment does not carry the arranging one with it — only a placed arranging record could, and none is
           "arranged": [[("arranged", un(k0, "case:"))] for k0 in dk["arranged"]],
           "reasons": [[("reason", un(x[0], "reason:"))] for x in dk["reasons"]], "alarms": [amem(f) for f in r["_al"]],
           "pieces": [[("piece", un(k0, "piece:"))] for k0 in dk["pieces"]], "lacks": [[("lack", x[0])] for x in d["lacks"]]}
    ITEMS = {"exits", "guards", "tables", "gateWrites", "fates", "gates", "limits", "deciders", "switches", "inflight", "reasons", "alarms", "pieces", "lacks",
             "behind", "hook", "screens", "arranged"}
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
        if k0 in ("sender", "screen", "nested"):
            return i
        if k0 == "act":
            return "case:" + i[2:].rsplit(":", 1)[0]
        if k0 == "arranged":
            return "case:" + i
        pfx = {"table": "table", "rtable": "table", "wtable": "table", "guard": "guard", "fork": "fork", "catch": "catch", "limiter": "limiter", "reason": "reason",
               "inflight": "inflight", "case": "case", "rule": "rule", "switch": "switch", "piece": "piece"}.get(k0)
        return pfx + ":" + str(i) if pfx and i is not None else None
    allm = {m for _k, t, ms in spec for m in ([x for it in ms for x in it] if t == "i" else ms)}
    # PROOF (A) · (B) · (C) — see the section head
    OPK = {(x[4][1], k0) for x in mo["el"] if x[0] == "data" and x[4] and x[4][0] == "op" for k0 in x[2]}   # (r | w, key) as drawn
    for m in sorted(P & allm, key=str):
        if key(m) and key(m) not in K:
            die(f"{r['id']}: D-055 — BY MOMENT places {m} by its records, but draws no element under its key {key(m)}")
        if m[0] in ("rtable", "wtable") and (m[0][0], key(m)) not in OPK:
            die(f"{r['id']}: F1 — BY MOMENT places {m} by its records, but draws no {m[0][0]} chip on {key(m)}")
    pk = {key(m) for m in P if key(m)}
    for m in sorted(allm - P, key=str):
        if key(m) in K and key(m) not in pk:
            die(f"{r['id']}: D-055 — BY MOMENT draws {key(m)} at a moment, but its records place no member of the code map under it ({m})")
    lost = sorted((m for m in PW - allm if m[0] not in ("table", "rtable", "wtable")), key=str)   # an op the code map does not list on a table: BY MOMENT holding more
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
            if n > 1 or ms != (sm1(k0[2:]) if t == "n" else ms):
                die(f"{r['id']}: D-064 — {k0} sums the endpoint up: its one member is the sum the no-moment column draws, not {ms}")
        elif not n:
            st = "e"
        cv[k0] = [st, fl, a, n]
        if extra and k0 in CV_TABLES:
            cv[k0][0] = "x" if st in ("c", "e") else st
            cv[k0].append(extra)
        nc += cv[k0][0] == "c"
        ne += cv[k0][0] == "e"
    r["cv"], r["cvn"] = cv, [nc, len(spec), ne, len(extra)]
    # D-058: what BY MOMENT draws at a moment, as the two other panels read it — the keys its placed chips carry (K, the set the
    # proofs above join on), the endpoint its heading draws (the member h:method is read carried by, PX), and the functions it places
    # by name only (D-057 d: no key, no glyph — their name is what it draws). F4 (review 2026-09-26): a name is also carried when a
    # KEYED function chip draws it, as long as that name stands for ONE function there (two functions of one name: neither is read);
    # F1: the tables read and the tables written, apart — carried()'s own members rtable · wtable, never the other op
    if ("endpoint", r["id"]) not in P:
        die(f"{r['id']}: D-058 — BY MOMENT's heading is read as drawing the endpoint, yet its members do not hold it")
    # D-065: the journeys BY MOMENT draws (A's chips, B's names) — by the members its records place; the keys a journey is drawn with
    # carry nothing (review J3: a Tests case is carried by a chip of its own, never by a journey wearing its case key)
    r["_by"] = (set(K) | {"endpoint:" + r["id"]}, fn_names(mo["el"]), {"table:" + str(m[1]) for m in P if m[0] == "rtable"},
                {"table:" + str(m[1]) for m in P if m[0] == "wtable"}, nm_facts(mo["nm"]), {m[1] for m in P if m[0] == "journey"})


def fn_names(el: list) -> set:
    """The function names BY MOMENT draws at a moment: a chip with no key (its name is all it draws), or a keyed function chip whose
    name no other function chip there shares under another key (F4)."""
    by = collections.defaultdict(set)
    for x in el:
        if x[0] == "fn":
            by[x[3]].add(next((k0 for k0 in x[2] if str(k0).startswith("fn:")), ""))
    return {n for n, ks in by.items() if "" in ks or len(ks) == 1}


# ── 2e · D-058: WHAT BY MOMENT CARRIES, IN THE GABE UNIVERSE AND THE GAPS ────────────────────────────────────────────────
# His ruling 2026-09-26: "the same buttons to hide or dim the information that we already put below, but in the Gabe universe ...
# see in both panels what is already on the by moment table". ONE join, the code map's: an item is carried when BY MOMENT draws it
# at a moment — by its D-041 key (carried()'s K, the set its proofs join on) or, for a function the card names without a key, by the
# name BY MOMENT places it under; the endpoint by BY MOMENT's heading. Never a second reading: the universe's items are
# _ae_universe.uni_elements (each with its members, or None when the card does not name what it counts — a count, a line, a flag,
# a file's cases), THE GAPS read the same items. A row is carried whole when every item is; in part when some are.
#     THE GAPS, from the universe (b): a name by the universe items it names (their members); an attribute a row shows
# by the row's items that hold it (the why tables say which; an item they do not place may hold any, so it counts for every one);
# a row that maps to no attribute by all its items. From the code map (a): an attribute by the code-map fields that hold it, each
# as carried() read it — carried whole when every field is (c, or x with items), in part when one carries some.
#     PROVEN per endpoint: every item marked carried has each member drawn in BY MOMENT's placed chips (re-read from its record, never
# from its band; a table's access by a chip of ITS op; a function's name on a chip that draws it); every item left bright has a
# member it does not draw; a gap's name is marked exactly as the universe's items it names are; the counts are the marks'.
def panels_carried(r: dict, T: list, NT: dict, slots: list) -> None:
    MK, MN, MR, MW, MM, MJ = r.pop("_by")
    el = r["mo"]["el"]
    # the placed record and the no-moment column (D-064 (2): what it draws is carried too), re-read (the heading: see carried()) — a
    # journey's chips and names left out (review J3): a journey carries only through its own id, below
    rk = {k for x in el if not (x[4] and x[4][0] == "jy") for k in x[2]} | {k for x in r["mo"]["nm"] if x[1] != "jy" for k in x[2]} | {"endpoint:" + r["id"]}
    rm = nm_facts(r["mo"]["nm"])
    fk = lambda x: {k for k in x[2] if str(k).startswith("fn:")}
    rn = {x[3] for x in el if x[0] == "fn" and (not x[2] or len({k for y in el if y[0] == "fn" and y[3] == x[3] for k in fk(y)}) == 1)}
    ro = {(x[4][1], k) for x in el if x[0] == "data" and x[4] and x[4][0] == "op" for k in x[2]}   # (r | w, table key) as each chip draws it
    band = {k for u in r["mo"]["un"] for k in u[1]} - rk                   # what BY MOMENT holds with no moment only
    # D-065: a journey, re-read off the drawn record — a chip at an outer moment (A), or its name in Proof's no-moment cell (B)
    rj = {(x[7] or {}).get("jy", {}).get("id") for x in el if x[4] and x[4][0] == "jy"} | {(x[4] or {}).get("id") for x in r["mo"]["nm"] if x[1] == "jy"}
    SET = {"k": MK, "n": MN, "r": MR, "w": MW, "m": MM, "j": MJ}
    drawn = lambda m: (m[1] in rk and m[1] not in band) if m[0] == "k" else (m[1] in rn) if m[0] == "n" else (m[1] in rm) if m[0] == "m" \
        else (m[1] in rj) if m[0] == "j" else ((m[0], m[1]) in ro)

    def mark(ms, where):
        f = 1 if ms and all(m[1] in SET[m[0]] for m in ms) else 0
        for m in ms or []:
            if f and not drawn(m):
                die(f"{r['id']}: D-058 — {where} is marked carried, yet BY MOMENT places no chip with {m} at a moment")
        if ms and not f and all(drawn(m) for m in ms):
            die(f"{r['id']}: D-058 — BY MOMENT draws every member of {where}, which the panel leaves bright")
        return f

    def state(c, n):
        return "c" if n and c == n else "p" if c else "b"
    # THE GABE UNIVERSE: per row [state, a flag per item in draw order, carried, items]
    ucv, UE = [], {}
    for u in r["uni"]["rows"]:
        es = UNI.uni_elements(u, T, NT)
        fl = [mark(ms, f"the universe's {u['row']} item {i}") for i, (ms, _a, _id) in enumerate(es)]
        ucv.append([state(sum(fl), len(es)), fl, sum(fl), len(es)])
        UE[u["row"]] = (es, fl)
    r["ucv"], r["ucn"] = ucv, [sum(x[2] for x in ucv), sum(x[3] for x in ucv)]
    # THE GAPS, from the universe (b): parallel to rgaps — [the unmapped row's [state, c, n] | None, [per attribute], [a flag per name]].
    # F2 (review 2026-09-26): a name stands for the universe items of its row that it names (its key, or a Code behind function's
    # name) — their members, all of them: a journey by the journey BY MOMENT draws (D-065), both of a table's accesses (r and w); PROVEN marked as
    # those items are, item by item (a name no item of its row carries is read by its own member)
    gb, cb, nb = [], 0, 0
    for g in r["rgaps"]:
        es, fl = UE[g[0]]
        u_it = [state(sum(fl), len(fl)), sum(fl), len(fl)] if g[2] else None
        a_it = []
        for a in g[1]:
            mem = [i for i, (_ms, at_, _id) in enumerate(es) if at_ is None or a in at_]
            a_it.append([state(sum(fl[i] for i in mem), len(mem)), sum(fl[i] for i in mem), len(mem)])
        f_it = []
        for nm_, K in zip(g[3], g[4]):
            gid = ("k", K) if K else ("n", nm_) if g[0] == "CODE BEHIND" else UNI.fact_named(next(u for u in r["uni"]["rows"] if u["row"] == g[0]), nm_)
            its = [i for i, e in enumerate(es) if gid and e[2] == gid]
            if not its:
                ms = [gid] if gid else None
            else:
                ms = None if any(es[i][0] is None for i in its) else list(dict.fromkeys(m for i in its for m in es[i][0]))
            f = mark(ms, f"the gap {nm_!r} @ {g[0]}")
            if its and f != int(all(fl[i] for i in its)):
                die(f"{r['id']}: D-058 — the gap {nm_!r} @ {g[0]} is marked {f}, the universe's items {its} it names {[fl[i] for i in its]}")
            f_it.append(f)
        gb.append([u_it, a_it, f_it])
        cb += (u_it is not None and u_it[0] == "c") + sum(x[0] == "c" for x in a_it) + sum(f_it)
        nb += (u_it is not None) + len(a_it) + len(f_it)
    # THE GAPS, from the code map (a): per attribute [state, members carried, members] over the fields that hold it, as carried() read
    # them. F3 (review 2026-09-26): a field with nothing on this endpoint (e) neither carries nor leaves anything (the code map's own
    # reading) — it is passed over; a field that holds nothing BY MOMENT could place (the fates' tally, the chain, the proof rank) is
    # what BY MOMENT leaves out — ONE member left, so an attribute it keeps from whole reads 15 of 16, never 15 of 15
    cvk = lambda f: "c:" + ",".join(slots) if f.startswith("c:") and f[2:] in slots else f
    ga = {}
    for a in r["gaps"] + [x[0] for x in r["partly"]]:
        fs = list(dict.fromkeys(cvk(f) for f in r["has"].get(a) or []))
        if not fs or any(f not in r["cv"] for f in fs):
            die(f"{r['id']}: D-058 — the gap {a} is held by {fs}, which are not all fields carried() read")
        X = [r["cv"][f] for f in fs if r["cv"][f][0] != "e"]
        whole = bool(X) and all(x[0] == "c" or (x[0] == "x" and x[3]) for x in X)
        ga[a] = ["c" if whole else "p" if any(x[0] in ("c", "p", "x") and x[2] for x in X) else "b", sum(x[2] for x in X), sum(x[3] or 1 for x in X)]
        if (ga[a][0] == "c") != (ga[a][1] == ga[a][2] > 0):
            die(f"{r['id']}: D-058 — the gap {a} reads {ga[a][0]} with {ga[a][1]} of {ga[a][2]} carried")
    r["gcv"] = {"a": ga, "b": gb}
    r["gcn"] = {"cm": [sum(x[0] == "c" for x in ga.values()), len(ga)], "uni": [cb, nb]}


def mo_block(rows: list, W: dict, A: dict, blocks: list, tally: collections.Counter, cols: list) -> dict:
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
    cov, whys = {f: [0, 0, 0] for f, _a in MO_FAM}, collections.Counter()
    for r in rows:
        for f, (a, b, c) in r["mo"]["n"].items():
            cov[f][0] += a; cov[f][1] += b; cov[f][2] += c
        for x in r["mo"]["nm"]:                                    # D-064 (2): the column's facts the code map's records do not count
            if x[1] not in ("arr", "jy", "piece"):                 # (the arranging cases, D-065's journeys, the pieces: by_moment counted them)
                cov[x[0]][2] += 1
        whys.update(u[3] for u in r["mo"]["un"])
    # a block nothing of which acts at a moment on any endpoint (the Overview) is a row all the same: its facts stand in the column
    untimed = [f for f, _a in MO_FAM if not cov[f][0] + cov[f][1]]
    if sorted(untimed) != sorted(MW["nm"]["only"]):
        die(f"BY MOMENT: the words say {sorted(MW['nm']['only'])} have no moment at all, the feed places nothing at a moment for {untimed}")
    fl_ids = {(x[4] or {}).get("id") for r in rows for x in r["mo"]["nm"] if x[1] == "risk"}
    if fl_ids - set(MW["nm"]["k"]["risk"]["ids"]):                   # review F4: every flag drawn has its own words
        die(f"BY MOMENT: flags drawn with no words of their own: {sorted(fl_ids - set(MW['nm']['k']['risk']['ids']))}")
    if sorted(MW["nm"]["k"]) != sorted(NM_KINDS):
        die(f"BY MOMENT: the no-moment column's words and its kinds differ: {sorted(set(MW['nm']['k']) ^ set(NM_KINDS))}")
    if sorted(MW["nm"]["k"]["jy"]["why"]) != sorted(JY_WHY) or sorted(MW["jy"]["role"]) != sorted({s0[2] for r in rows for x in r["mo"]["el"] if x[4] and x[4][0] == "jy"
                                                                                                    for s0 in x[7]["jy"]["sq"]} | {"act", "arrange", "arrange-checked"}):
        die(f"D-065: the words' reasons a journey is not ordered {sorted(MW['nm']['k']['jy']['why'])} or its roles {sorted(MW['jy']['role'])} are not the build's")
    if sorted(MW["jy"]["leave"]) != sorted(h for h in JY_JOIN if h not in ("refs", "status")):
        die(f"D-065: the words say why a call here leaves a picked path for {sorted(MW['jy']['leave'])}, the build joins by {list(JY_JOIN)}")
    if sorted(MW["why"]) != sorted(MO_WHY) or set(whys) - set(MO_WHY):
        die(f"BY MOMENT: the reasons the words name and the build gives differ: {sorted(set(MW['why']) ^ set(MO_WHY))} {sorted(set(whys) - set(MO_WHY))}")
    if sorted(MW["moms"]) != sorted(MO_PRE + MO_POST + tuple(MO_RANK)):
        die(f"BY MOMENT: the moments the words name are not the spine's: {sorted(MW['moms'])}")
    for g, O in MW["opt"].items():
        if O.get("pick") not in (O.get("opts") or {}):
            die(f"mo.opt.{g}: its default {O.get('pick')!r} is not one of its options")
        if "ruled" in O and not re.fullmatch(r"D-\d{3}", str(O["ruled"])):           # his default names the ruling (D-055), like a rail's
            die(f"mo.opt.{g}: `ruled` must name the ruling (D-nnn), not {O['ruled']!r}")
    bad = sorted({d0[1] for r in rows for x in r["mo"]["ex"] for d0 in x[9] or [] if d0[0] == "split" and d0[1] not in MW["path"]["split"]})
    if bad:
        die(f"BY MOMENT: paths told apart by what FastAPI checks ({bad}) that mo.path.split has no words for")
    bad = IO.words_check(W, rows)                                  # D-067: every hover line has words, and shows every value it is given
    if bad:
        die(f"BY MOMENT: hover lines whose words are missing or do not use what they are given (mo.io): {sorted(set(map(str, bad)))[:4]}")
    # ── D-068 (his L-20: "some sections … that I don't see in this table … I would like to see reflected here somehow"): each column
    # of the pinned row on the BY MOMENT row that draws what it counts — a column homed in a block on that block's row; a shared one on
    # the row, of the blocks it is shared by, that draws the most of its members across the feed (never none: the build stops); the
    # stages column is the stage band over the moments (the table's shape, not a row). A column that sums the endpoint up (its
    # attribute is one the metadata's summing facts are homed by, NM_SUM_K) also stands, drawn as the pinned row draws it, in the
    # endpoint's metadata under its block; a block with no moment (the Overview) keeps its columns there only ──
    sum_a = {a for k, a in NM_ATTR if k in NM_SUM_K}
    hits = collections.defaultdict(collections.Counter)
    for r in rows:
        at_ = collections.defaultdict(set)
        for x in r["mo"]["el"]:
            if not (x[4] and x[4][0] == "jy"):
                for k in x[2]:
                    at_[k].add(x[0])
        for c in cols:
            for k in r["ck"].get(c["id"]) or []:
                for f in at_.get(k, ()):
                    hits[c["id"]][f] += 1
    mrow, meta, band = {f: [] for f in fam if f not in untimed}, {}, None
    for c in cols:
        if c["kind"] == "spine":
            if band:
                die(f"D-068: two stage columns, {band} and {c['id']}")
            band = c["id"]
            continue
        if c["attr"] in sum_a:
            if c["shared"] or not c["home"]:
                die(f"D-068: column {c['id']} sums the endpoint up and is homed in no block of its own")
            meta.setdefault(c["home"], []).append(c["id"])
        if c["shared"]:
            fs_ = [f for f in fam if fam[f] in c["sharedIn"] and hits[c["id"]][f]]
            if not fs_:
                die(f"D-068: the shared column {c['id']} — no row of the blocks sharing it ({c['sharedIn']}) draws any of its members")
            f0 = max(fs_, key=lambda f: (hits[c["id"]][f], -MO_ORDER.index(f)))
        else:
            f0 = next(f for f, b in fam.items() if b == c["home"])
        if f0 in untimed:
            if c["attr"] not in sum_a:
                die(f"D-068: column {c['id']} is homed in {fam[f0]}, which has no moment, and does not sum the endpoint up")
        else:
            mrow[f0].append(c["id"])
    if not band:
        die("D-068: no stages column — the stage band has nothing to count")
    na = dict(NM_ATTR)
    for k, cid in NM_COL.items():                                  # a fact drawn beside a column's cell details THAT column: one attribute
        c = next((c for c in cols if c["id"] == cid), None)
        if not c or c["attr"] != na[k] or cid not in meta.get(c["home"], []):
            die(f"D-068: the metadata draws {k} beside column {cid}, which is not the column of its attribute {na[k]}")
    if sorted(MO_STAGE) != sorted(set(MO_PRE + MO_POST + tuple(MO_RANK)) - set(MO_OUT)) or set(MO_STAGE_ALT) - set(MO_STAGE):
        die("D-068: the stages the moments stand in do not name every moment inside the request")
    KT = {}
    for r in rows:
        for x in r["mo"]["el"]:
            x[2] = [KT.setdefault(k, len(KT)) for k in x[2]]
        for x in r["mo"]["un"]:
            x[1] = [KT.setdefault(k, len(KT)) for k in x[1]]
        for x in r["mo"]["nm"]:
            x[2] = [KT.setdefault(k, len(KT)) for k in x[2]]
        dx, il = r["mo"].get("dx"), r["mo"].get("il")                 # D-070: the connectors' nodes and a claim's keys, as indices too
        if dx:
            dx["f"] = [KT.setdefault(k, len(KT)) for k in dx["f"]]; dx["t"] = [KT.setdefault(k, len(KT)) for k in dx["t"]]
            for c0 in dx["c"]:
                c0[0] = KT.setdefault(c0[0], len(KT))
        for L in (il or {}).get("l") or []:
            for d in L[4]:
                if d[4]:
                    d[4][0], d[4][1] = KT.setdefault(d[4][0], len(KT)), KT.setdefault(d[4][1], len(KT))
    # how each step occurrence (a step on one path) was placed — once per path it is on, so the sum is the occurrences, not the steps
    src = {k: tally.get("src:" + k, 0) for k in MO_SRC}
    if sum(src.values()) != tally["occ"]:
        die(f"BY MOMENT: the data-effects sources add up to {sum(src.values())}, the paths list {tally['occ']} step occurrences")
    if sorted(TOKEN.findall(MW["src"])) != sorted(["{occ}"] + ["{" + k + "}" for k in MO_SRC]):
        die(f"BY MOMENT: the words' source line says {sorted(TOKEN.findall(MW['src']))}, the build counts {list(MO_SRC)}")
    return {"fam": fam, "timed": [f for f, _a in MO_FAM if f not in untimed], "untimed": untimed, "cov": cov, "why": dict(whys),
            "src": src, "occ": tally["occ"], "off": tally["off"], "offocc": tally["offocc"], "faces": tally["faces"], "keys": list(KT),
            "cols": mrow, "meta": meta, "band": band, "stg": MO_STAGE, "stgAlt": MO_STAGE_ALT, "out": list(MO_OUT), "fixed": list(MO_PRE + MO_POST),
            "nmCol": NM_COL, "fk": [tally["fk"], tally["fkArms"]]}


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


def first_sentence(doc) -> str | None:
    """a docstring's first sentence, whole (its first paragraph up to the first full stop that ends a sentence); none for a blank or
    a dash"""
    d = " ".join(str(doc or "").split("\n\n")[0].split())
    if not d or d in ("\u2014", "-"):
        return None
    m = re.search(r"(?<!\be\.g)(?<!\bi\.e)\.(\s|$)", d)
    return d[:m.start() + 1] if m else d


def sure_t(t: dict) -> bool:
    """a test joined to an ending that proves it on its own (not one whose status fits several — "ambiguous of N")"""
    return not str(t.get("conf") or "").startswith("ambiguous")


def beyond_t(t: dict) -> bool:
    """review N3-03: a test's call that asserts more than the status — the body's attributes, the detail or the code"""
    a = t.get("asserts") or {}
    return bool(a.get("attrs") or a.get("detail") or a.get("code"))


def arranged_of(t: dict) -> list:
    """D-056 (2): the cases that arrange through this endpoint, each once, in the feed's order (arranged_by, then helper_arranged),
    with how: "a" its own call · "h" through a helper · "ah" both."""
    ab, ha = t.get("arranged_by") or [], t.get("helper_arranged") or []
    out = [[c, ("a" if c in ab else "") + ("h" if c in ha else "")] for c in dict.fromkeys(list(ab) + list(ha))]
    if len({c for c, _h in out}) != len(out) or any(not h for _c, h in out):
        die("D-056 (2): an arranging case is drawn twice, or with no way it arranges")
    return out


def nested_of(top: str | None, S: dict) -> list:
    """D-056 (8): the schemas inside a top model, in the order its fields name them — each field's annotation read for a schema
    of schemas{} (a list's item type among them), followed down; the top itself left out (the rule _ae_universe._gap_q reads).
    Each as [name, the schema whose field names it] — the top for a field of its own, else the nested schema it sits in."""
    if not top:
        return []
    seen, out, todo = set(), [], [(top, None)]
    while todo:
        n, par = todo.pop(0)
        if n in seen:
            continue
        seen.add(n)
        if n != top:
            out.append([n, par])
        todo += [(w, n) for f in (S.get("schema:" + n) or {}).get("fields") or [] for w in IDN.findall(str(f.get("annotation"))) if "schema:" + w in S]
    return out


def nest_split(top: str | None, S: dict) -> tuple:
    """the nested schemas' names (the pair's items, keyed one for one) and, parallel, the schema each sits in"""
    q = nested_of(top, S)
    return [n for n, _p in q], [p for _n, p in q]


def distill(L: dict, fj: dict, W: dict, bridge: list) -> dict:
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
    acts = tst.get("act") or 0                                  # the calls that act on it (review N3-16: the column counts TESTS, these beside)
    E0 = "endpoint:" + ident["label"]
    acting = sorted(cid for cid, tc in (fj.get("test_cases") or {}).items() if any(c.get("endpoint") == E0 and c.get("role") == "act" for c in tc.get("calls") or []))
    put("acts", len(acting), len(acting), Z["acts"]["zero"], acting)
    # BEYOND (review N3-03): a proof — a test that proves an ending on its own — whose call also asserts on the answer's body, its
    # detail or its code; a test whose status only fits several endings proves none, so it is never beyond
    past = sum(1 for x in exits for t in (x.get("tests") or []) if sure_t(t) and beyond_t(t))
    put("asserted", past, past, Z["asserted"]["zero"])
    # PROVEN: an ending a test proves ON ITS OWN. A test whose status fits several endings ("ambiguous of N") proves none
    # of them: it is counted apart, as the third number, and drawn in the hover only
    sure = sure_t
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
    # PROOF (D-062 (4), cols.fetched.name): the column counts the frontend pieces that fetch it, each a hook or a component
    if any(q.get("kind") not in ("hook", "component") for q in fb):
        die(f"{ident.get('label')}: the screen column says it counts hooks and components, yet a {sorted({str(q.get('kind')) for q in fb} - {'hook', 'component'})} piece fetches it")
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

    ALS = list(F.get("findings") or []) + [f for fs in (F.get("arm_findings") or {}).values() for f in fs] + [f for f in (F["frontend"].get("findings") or []) if f.get("id")]
    al = sorted({f["id"] for f in ALS})
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
    rmod = next((r.get("model") for k2, r in sorted((F.get("responses") or {}).items()) if k2.startswith("r:") and r.get("model")), None) \
        or L["data"]["schemas"]["response"].get("name")
    # D-056 (9): who sends it — the lab's hook first, every piece that fetches it, then each file the bridge edge ends at
    hooks = []
    for i2, n2 in [((F["frontend"].get("hook") or {}).get("piece"), None)] + [(q.get("id"), q.get("name")) for q in L["widening"].get("fetched_by") or []] + list(bridge):
        if i2 and i2 not in [h[0] for h in hooks]:
            hooks.append([i2, n2 or str(i2).split("#")[-1]])
    pieces_ = {q.get("id") for q in L["widening"].get("fetched_by") or []} | {(F["frontend"].get("hook") or {}).get("piece")}
    files = [h for h in hooks if h[0] not in pieces_]
    # D-056 (3): each ending declared or not, by the endpoint pass's own rule — PROVEN: the statuses it marks undeclared (the refusals it
    # produces or FastAPI does by default, the uncaught left out) are exactly the ones the `undeclared` alarm names
    dset = declared_set(fep)
    frow = {x["id"]: x for x in fep.get("produced") or []}
    und = sorted({x.get("status") for x in exits if x["id"] in frow and x["kind"] != "uncaught" and frow[x["id"]].get("state") in ("defined", "default")
                  and decl_of(x, dset) == 0})
    alarm = next((f.get("statuses") for f in fep.get("findings") or [] if f.get("id") == "undeclared"), [])
    if und != sorted(alarm):
        die(f"{ident['label']}: the endings marked undeclared are {und}, the undeclared alarm names {alarm}")
    # D-056 (7): the headers each ending sends beside its body, in the endings' time order
    resp = fep.get("responses") or {}
    hdr = [[t["x"].get("status"), t["x"]["kind"], [[h, v2] for h, v2 in sorted(((resp.get(t["x"]["id"]) or {}).get("headers") or {}).items())], t["x"]["id"]]
           for t in TO["rows"] if t["x"] is not None and (resp.get(t["x"]["id"]) or {}).get("headers")]
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
        # D-056 (8): the schemas inside the body and inside the reply, followed down from the top model (their third item)
        # [top, its fields, the schemas inside it, the schema each of those sits in]
        "request": [req_name, (req_fields or [])[:CAP], *nest_split(req_name, fj.get("schemas") or {})] if req_name else None,
        "response": [rmod, k["response"], *nest_split(((fep.get("declared") or {}).get("response_model") or {}).get("name") or rmod, fj.get("schemas") or {})]
                    if k["response"] else None,
        "cases": dict(sorted(F["counts"].get("cases_by_type", {}).items())),
        "deciders": cap([f.get("name") for f in dec]),
        # a switch is named by its port, else the settings it reads, else the condition it tests — a handler flag carries only
        # that, and only in the FEED's record (the lab's copy drops `pred`), so the feed's switch of the same id is read for it
        "switches": cap([[w.get("kind"), w.get("port") or ", ".join(sorted(w.get("settings") or [])) or (w.get("expr") or fsw.get(w.get("id"), {}).get("pred") or "")[:80]] for w in sw]),
        # D-056 (1): [how many behind, how deep, the walk's names by level, the card's other callees (keyspace adds them), the card's
        # names no single function holds (counted, keyspace)] — the walk is the lab's over the station's call edges
        "behind": [L["functions"]["behind"].get("fns"), L["functions"]["behind"].get("depth"), [[q["name"] for q in lv] for lv in L["functions"].get("walk") or []], [], 0],
        "proof": {**{k2: L["feedwide"]["proof"].get(k2) for k2 in ("tested", "produced", "rank", "rank_to", "of")},
                  "sts": [x0.get("status") for x0 in fep.get("produced") or []]},      # review N3-04: the endings it counts, by status
        "inflight": cap([[r.get("kind"), r.get("name"), r.get("dies")] for r in (inf.get("rows") or [])]),
        # D-056 (9): every piece that fetches it and every FILE the station's bridge edge ends at, by name; every screen above them
        "hook": [x[1] for x in hooks] or None,
        "screens": [q.get("name") or str(q.get("id")).split("#")[-1] for q in L["widening"].get("screens") or []],
        # D-056 (2): the cases that call it only to set another test up, ONE item per case — [case, "a" by its own call · "h" through a
        # helper · "ah" both] (a case the feed lists in both lists is one case, counted once)
        "arranged": arranged_of(fep.get("tests") or {}),
        "reasons": cap([[s.get("at"), s.get("branch"), s.get("does_state")] for s in rs]),
        # [id, status, its words, the statuses it names, None] — the statuses ride apart so the code map draws each as a chip (D-043).
        # D-057: the client's own alarms join the list (the count row already counted them); an arm's alarm says no arm — which part
        # of the map found it is about the map, not the code (D-017)
        "alarms": [[f["id"], f.get("status"), ", ".join(str(d) for d in (f.get("details") or f.get("statuses") or []))[:80],
                    [s for s in (f.get("statuses") or []) if isinstance(s, int)], None] for f in ALS],
        "pieces": cap([[r["words"], r["n"], r["of"], r["word"]] for r in pc["rows"] if r["word"] in ("rare", "only here")]),
        "lacks": [[r["words"], r["n"], r["of"]] for r in pc["missing_norms"]],
    }
    if len(det["proof"]["sts"]) != (det["proof"].get("produced") or 0):
        die(f"{ident['label']}: the proof rank counts {det['proof'].get('produced')} produced endings, the feed lists {len(det['proof']['sts'])} — its label would be false")
    method, path = ident["method"], ident["path"]
    return {"id": ident["label"], "m": method, "p": path, "ent": ep.get("entity") or ident.get("entity"),
            "seg": path.strip("/").split("/")[0] or "/", "file": ident.get("file"), "line": ep.get("line"),
            "fn": (ep.get("handler") or "").split("::")[-1], "full": ep.get("full_path"), "declared": ident.get("status"),
            "labels": sorted({f"{stage_of(x)}:{x.get('status')}" for x in exits}),
            "v": v, "k": k, "why": why, "u": u, "d": det,
            # D-056 (11): the handler's outline and docstring [async, lines, returns, the def text, the docstring] · (12) a streamed answer
            "sig": [(ident.get("sig") or {}).get("async"), (ident.get("sig") or {}).get("lines"), (ident.get("sig") or {}).get("returns"), ident.get("gsig"), ident.get("doc") or None],
            "stream": 1 if (L.get("security") or {}).get("stream") else 0,
            "actc": acts,                                                 # review N3-16: the act calls the tests column's tests make
            "_hook": hooks, "_files": files, "_al": ALS,                  # D-057: the alarms' own records, parallel to d.alarms
            # D-043: what the code map's chips need beside the detail lists, parallel to their items — kept OUT of `d`, so the words
            # the gaps are read against (every string `d` holds) do not move: each path's kind of ending, and each piece's family and
            # value from its key (a status, a method or a switch kind in a piece's own sentence is drawn as its chip)
            # D-053: per endings row [its moment, the checks on it (indices into d.guards), the ending's id — or the check's, on a row
            # of its own —, the framework's own code for it (the hover), the call a check of its own row sits inside]; `en` the INPUT
            # facts the info text says for this endpoint; kept out of `d` like the rest of xd: the moment words are the words file's
            "_to": TO,
            # D-056: (3) declared or not, (7) the headers it sends — the endings row's sixth and seventh
            "xd": {"exits": [[t["mom"], t["checks"], t["id"], (t["who"] or [None, None, None])[2], t.get("call"),
                              decl_of(t["x"], dset) if t["x"] is not None else None,
                              [[h, v2] for h, v2 in sorted(((resp.get(t["id"]) or {}).get("headers") or {}).items())] if t["x"] is not None else []] for t in TO["rows"]],
                   "hdr": hdr,
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
    # D-069 (P-L14e): the forms feed's own call rows name functions too — a chain's call, a collapsed call, a read of an in-flight value
    for ep0 in (fj.get("endpoints") or {}).values():
        fq |= {s0["fn"] for p0 in ep0.get("paths") or [] for s0 in p0.get("chain") or [] if s0.get("fn")}
        fq |= {s0["fn"] for s0 in ep0.get("collapsed") or [] if s0.get("fn")}
        fq |= {q0["fn"] for x0 in ep0.get("inflight") or [] for q0 in x0.get("read_at") or [] if q0.get("fn")}
    fq |= {q0["fn"] for x0 in ((fj.get("inflight") or {}).get("process") or {}).values() for q0 in x0.get("read_at") or [] if q0.get("fn")}
    short = collections.defaultdict(set)
    for q in fq:
        if isinstance(q, str) and "::" in q:
            short[q.split("::", 1)[1]].add(q)
    settings = {k.split(":", 1)[1] for k in (fj.get("settings") or {}) if k.startswith("setting:")}
    # the cases whose calls ACT on each endpoint (D-042): the tests column counts those calls, so it counts these cases
    acts, act_calls = collections.defaultdict(set), collections.Counter()
    for cid, t in (fj.get("test_cases") or {}).items():
        for c in t.get("calls") or []:
            if c.get("role") == "act" and c.get("endpoint"):
                acts[c["endpoint"]].add(cid); act_calls[c["endpoint"]] += 1
    # review F1 (D-064 (1)): each function's length, so a function the forms feed records the def line of has its body's last line
    fnlines = {k: v["lines"] for k, v in (am.get("function_insight") or {}).items() if isinstance(v, dict) and isinstance(v.get("lines"), int)}
    # round-1 review F20 · CR-30: what a function does in its author's words — its docstring's first sentence — and the type it returns
    fninfo = {k: (first_sentence(v.get("doc")), v.get("returns") if v.get("returns") not in (None, "", "None", "\u2014") else None)
              for k, v in (am.get("function_insight") or {}).items() if isinstance(v, dict)}
    return {"m2t": m2t, "node_t": node_t, "schemas": schemas, "short": short, "settings": settings, "nAlias": len(m2t), "nAliasC4": n_c4,
            "c4tables": set(node_t.values()), "WRITE": WRITE_OPS,
            "acts": acts, "actCalls": act_calls, "fnlines": fnlines, "fninfo": fninfo,
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
        if len(X["acts"].get("endpoint:" + r["id"]) or ()) != r["k"]["acts"] or X["actCalls"].get("endpoint:" + r["id"], 0) != r["actc"]:
            die(f"{r['id']}: the tests column draws {r['k']['acts']} tests making {r['actc']} act calls, the feed's cases are {len(X['acts'].get('endpoint:' + r['id']) or ())} making {X['actCalls'].get('endpoint:' + r['id'], 0)}")
        to("acts", *["case:" + c for c in sorted(X["acts"].get("endpoint:" + r["id"]) or [])])
    exits = F["exits"]
    for x in exits:
        to("e_" + x["kind"], stat(x.get("status"))); to("all", stat(x.get("status")))
        for t in x.get("tests") or []:
            if not sure_t(t):                            # review F03: a test that only FITS endings proves none — not counted in proven
                continue
            to("proof", "case:" + t["case"] if t.get("case") else None)
            if beyond_t(t):                              # review N3-03: a proof that checks the body, the detail or the code
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
        # D-069 (his L-16): a branch is named by the function it sits in and its line — the feed's raw branch word ("none") is not a name
        lab("reason:" + s["id"], (str(s.get("piece") or "").split("#")[-1] + " · " if s.get("piece") else "") + _short(s.get("at")))
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
          "hook": [h[0] for h in r["_hook"]], "screens": [q.get("id") for q in L["widening"].get("screens") or []],   # D-056 (9)
          "arranged": ["case:" + c[0] for c in d["arranged"]],                                                        # D-056 (2)
          "reqNest": [tkey(n) for n in (d.get("request") or [None, None, []])[2]],                                    # D-056 (8)
          "repNest": [tkey(n) for n in (d.get("response") or [None, None, []])[2]],
          "reasons": [["reason:" + s["id"], "file:" + str(s.get("at")).rsplit(":", 1)[0] if s.get("at") else None] for s in cap(rs)],
          "alarms": ["finding:" + a[0] for a in d["alarms"]],
          "pieces": ["piece:" + p["key"] for p in cap(prow)]}
    for k2, n in (("exits", len(d["exits"]["items"])), ("tables", len(d["tables"]["items"])), ("fates", len(d["fates"]["items"])),
                  ("guards", len(d["guards"]["items"])), ("deciders", len(d["deciders"]["items"])), ("switches", len(d["switches"]["items"])),
                  ("inflight", len(d["inflight"]["items"])), ("reasons", len(d["reasons"]["items"])), ("alarms", len(d["alarms"])),
                  ("pieces", len(d["pieces"]["items"])), ("gates", len(d["gates"])), ("limits", len(d["limits"])),
                  ("hook", len(d["hook"] or [])), ("screens", len(d["screens"])), ("arranged", len(d["arranged"])),
                  ("reqNest", len((d.get("request") or [None, None, []])[2])), ("repNest", len((d.get("response") or [None, None, []])[2]))):
        if len(dk[k2]) != n:
            die(f"{r['id']} · {k2}: {n} items drawn but {len(dk[k2])} keyed — the keys must follow the items one for one")
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
    # D-056 (1): the functions behind the handler BY NAME — the lab's walk over the station's call edges (levels.json fn_edges), level
    # by level, then the card's Code behind callees the walk does not hold that the feeds hold one function for; a callee name the
    # feeds hold no single function for (and the walk does not name) stays a count. The column and the pair hold every named one.
    walk = L["functions"].get("walk") or []
    wids, root, wlist, wpar = [], {}, [], {}
    for i, lv in enumerate(walk):
        for q in lv:
            f = q["id"].replace("#", "::")
            par = next((p0 for p0 in walk[i - 1] if p0["name"] == q.get("via")), None) if i else None
            if par:
                wpar.setdefault(f, par["id"].replace("#", "::"))        # D-061 (2): the caller it hangs under in the walk
            root[f] = root.get(par["id"].replace("#", "::"), f) if par else f
            dep = (q.get("rel") == "depends") if not i else bool(next((w0 for w0 in wlist if w0[0] == root[f] and w0[2]), None))
            wlist.append([f, i + 1, dep]); wids.append(f)
    cb = next((uu for uu in r["uni"]["rows"] if uu["row"] == "CODE BEHIND"), None)
    cnames = (cb["items"] + (cb.get("rest") or [])) if cb else []
    ckeys = cb["keys"] if cb else []
    wnames = {q["name"] for lv in walk for q in lv}
    extra = [(n, k[3:]) for n, k in zip(cnames, ckeys) if k and k[3:] not in wids]
    extra = list({f: (n, f) for n, f in extra}.values())
    noname = [n for n, k in zip(cnames, ckeys) if not k and n not in wnames]
    d["behind"][3], d["behind"][4] = [n for n, _f in extra], len(noname)
    bk = ["fn:" + f for f in wids] + ["fn:" + f for _n, f in extra]
    if len(set(bk)) != len(bk):
        die(f"{r['id']}: a function behind the handler is named twice in the behind pair")
    # review N3-05 · CR-05: the pinned row's behind COUNTS the station's — the handler's own calls; a function a dependency runs is not
    # behind it, so no chip says "counted in: behind" for one (the code map's pair still names the lab's whole walk, as it draws it)
    to("behind", *(["fn:" + f for f, _i, dep in wlist if not dep] + ["fn:" + f for _n, f in extra]))
    dk["behind"] = bk if v.get("behind") != "absent" else []
    r["_beh"] = {"walk": wlist, "extra": [f for _n, f in extra], "noname": noname, "par": wpar}
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


DOES_JS = r"""
const vm=require('vm'),fs=require('fs'),path=require('path');const H=process.argv[1];
const win={};win.window=win;const ctx=vm.createContext(win);
for(const f of ['_station.js','_lab-ep.js','_lab-ep-panels.js']) vm.runInContext(fs.readFileSync(path.join(H,f),'utf8'),ctx,{filename:f});
const S=JSON.parse(fs.readFileSync(0,'utf8')),out={};for(const s of S) out[s.id]=win.doesWords(s);process.stdout.write(JSON.stringify(out));"""


def does_lift(sites: list) -> dict:
    """D-057 (b): {site id: what its branch does} — the lab's own words (_lab-ep-panels.js doesWords), run under node over each
    reason site's does[] rows, never retyped here."""
    uniq = list({s["id"]: s for s in sites if s.get("id")}.values())
    r = subprocess.run(["node", "-e", DOES_JS, str(HERE)], input=json.dumps(uniq), capture_output=True, text=True)
    if r.returncode != 0:
        die("the lab's doesWords could not be run under node: " + r.stderr.strip()[-400:])
    out = json.loads(r.stdout)
    if sorted(out) != sorted(s["id"] for s in uniq) or any(not isinstance(v, str) or not v for v in out.values()):
        die("the lab's doesWords gave no words for some reason site")
    return out


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
    # D-069 (P-L12a, his L-12): BY MOMENT's R and W letters wear the same channel chip (read green, write orange) the code map does
    css = "#ocol-cm, #mogrid, #moband, #mometa{ --font-mono: var(--af-stack); }\n" + "\n".join("#ocol-cm .jdrw, #mogrid .jdrw, #moband .jdrw{ " + b + " }" for b in jd)
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
    icons |= {x["icon"] for f in ("switch", "alarm", "branch", "does") for x in F[f]["vals"].values()} | {g["icon"] for g in G.values()} | {F["limit"]["icon"]}   # D-057: no arm family (D-017)
    return E, css, icons


def mo_keys(r: dict) -> set:
    """every key BY MOMENT draws for one row (placed or not) — they wear the station's marks too (D-052)"""
    return {k for x in r["mo"]["el"] for k in x[2]} | {k for x in r["mo"]["un"] for k in x[1]} | {k for x in r["mo"]["nm"] for k in x[2]} \
        | {k for x in r["mo"]["el"] for k in (x[7] or {}).get("xk") or [] if k}             # D-069: the keys an element draws inside it


# D-069: the page's own glyphs (lucide, ISC), for the looks the station has no glyph for — my proposal, drawn dashed where they mark a
# block (the hourglass, the puzzle) and named "my proposal" in the row's legend where they mark a gate or an in-flight kind
PAGE_SVG = ('<svg class="ico " viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '
            'stroke-linejoin="round">{}</svg>')
PAGE_GLYPH = {
    "pg:hourglass": '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/>'
                    '<path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
    "pg:puzzle": '<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 '
                 '2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 '
                 '1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 0-.474-1.68l1.683-1.682'
                 'a2.414 2.414 0 0 1 3.414 0z"/>',
    "pg:tag": '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/>'
              '<circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    "pg:radio": '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/>'
                '<path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>',
    "pg:list-end": '<path d="M16 12H3"/><path d="M16 6H3"/><path d="M10 18H3"/><path d="M21 6v10a2 2 0 0 1-2 2h-5"/><path d="m16 16-2 2 2 2"/>',
    "pg:hand": '<path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/>'
               '<path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
    "pg:memory-stick": '<path d="M6 19v-3"/><path d="M10 19v-3"/><path d="M14 19v-3"/><path d="M18 19v-3"/><path d="M8 11V9"/><path d="M16 11V9"/><path d="M12 11V9"/>'
                       '<path d="M2 15h20"/><path d="M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1.1a2 2 0 0 0 0 3.837V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5.1a2 2 0 0 0 0-3.837Z"/>',
    "pg:gauge": '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    "pg:shield-check": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0'
                       'C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    "pg:split": '<path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"/><path d="m15 9 6-6"/>',
    "pg:reply": '<polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
    "pg:diamond": '<path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"/>',
}
RDER = collections.Counter()                                  # D-069: the roles the station's own rule gives here, counted for the build line


def graft_gate_rule():
    """the station's gate-by-name rule, read from the station's generator (_a3_graft._is_gate_name) — never retyped here"""
    sys.path.insert(0, str(GENS))
    try:
        return _registry(GENS / "_a3_graft.py")._is_gate_name
    finally:
        sys.path.remove(str(GENS))


def station_marks(W: dict, rows: list, feeds: dict, fj: dict) -> tuple:
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
    # D-069 (P-L14b, his L-14: "they should be given a function icon and a role … I would like to know why"): a role wherever a source
    # knows it — the station's (its node), the lab's walk (roles_by_key), then the station's OWN rule on two positive facts: accessor
    # when the forms feed records a read or write in the function's own body, gate by the station's name rule (_a3_graft._is_gate_name,
    # read from the generator, never retyped). Caller and pure need the whole call graph: never said here
    allk = {k for r in rows for k in all_keys(r) | mo_keys(r)}
    own_ops = {s0["fn"] for s0 in (fj.get("steps") or {}).values() if s0.get("fn") and s0.get("table")}
    is_gate = graft_gate_rule()
    for k in sorted(allk):
        if k.startswith("fn:") and k not in roles:
            q = k[3:]
            if q in own_ops:
                roles[k] = "accessor"; RDER["accessor"] += 1
            elif is_gate(q.split("::")[-1]):
                roles[k] = "gate"; RDER["gate"] += 1
    keys, tally = UNI.sk_keys(allk, SK, SM, feeds, roles)
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
    want = [r["hk"]["handler"][0]] + list(r["dk"]["hook"]) + list(r["dk"]["deciders"]) + list(r["dk"]["gates"]) + list(r["dk"]["behind"])
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
    # round-1 review (lane F1a): three readings corrected ONCE, before any block reads the facts (_ae_truth) — a service-side test
    # proves an ending here only when the function it calls runs here; a step with no table that is not a save is no database write;
    # a raise joined to no ending here takes the ending of the first except of its class up its callers
    LV = json.loads((UNI.EX / "levels.json").read_text(encoding="utf-8"))
    ADJ, MEMO, MOT = fn_adj(LV), {}, collections.Counter()
    TRUTH.drop_tableless(fj, facts, MOT)
    for L in facts:
        H0 = (fj["endpoints"]["endpoint:" + L["identity"]["label"]].get("handler") or "")
        TRUTH.own_raise_tests(L, fj, reach_of(ADJ, H0, MEMO), MOT)
        TRUTH.class_joins(L, fj, MOT)
    spec, feeds = UNI.station_spec(), UNI.station_feeds()
    # D-056 (9): who fetches each endpoint, as the station draws it — its bridge wires, each ending at the piece or FILE that fetched
    nid_, links_ = UNI._station_links(feeds, spec)
    BRIDGE = collections.defaultdict(list)
    for s_, t_, rel_, _x in links_:
        if rel_ == "bridge" and t_.startswith("endpoint:") and s_ not in [b[0] for b in BRIDGE[t_]]:
            BRIDGE[t_].append([s_, nid_[s_]["label"]])
    rows = [distill(L, fj, W, BRIDGE.get("endpoint:" + L["identity"]["label"], [])) for L in facts]
    # ── the one-endpoint section (D-036): the station's card per row, lifted from the station and computed from the facts ──
    for L, r in zip(facts, rows):
        r["uni"] = UNI.universe(L, spec, feeds, W["universe"])
    # ── the identity key space (D-041): every element the two columns draw carries one key, the table's rows index them ──
    X, CL = key_index(fj, json.loads(archmap.read_text(encoding="utf-8")), feeds), {}
    # D-069 (his L-16): each frontend piece's lines, as the c4 graph spans them — a hop of a branch's origin is the piece it stands in
    X["fespan"] = collections.defaultdict(list)
    for p0 in (feeds["graph"].get("fe") or {}).get("pieces") or []:
        if p0.get("span") and p0.get("file") and p0.get("kind") != "fe-type":
            X["fespan"][p0["file"]].append((p0["span"][0], p0["span"][1], p0["id"], p0.get("name"), p0.get("kind")))
    for L, r in zip(facts, rows):
        keyspace(r, L, fj["endpoints"]["endpoint:" + r["id"]], X, CL, spec["_look"]["lift"]["jReal"][0])
        r["ro"] = roles_by_key(L, r)                                   # the roles the code map's chips wear (D-043)
    # ── BY MOMENT (his ask 2026-09-26): every timed block's elements on one spine per endpoint, placed only by recorded facts ──
    # D-057 (d): each function the station draws, the names its behind list holds (levels.json fn_nodes behind.names)
    X["lvbeh"] = {n["id"].replace("#", "::"): set((n.get("behind") or {}).get("names") or []) for n in LV.get("fn_nodes") or [] if (n.get("behind") or {}).get("names")}
    X["lvcut"] = {n["id"].replace("#", "::"): (n.get("behind") or {}).get("names_more") for n in LV.get("fn_nodes") or [] if (n.get("behind") or {}).get("names_more")}
    X["radj"] = collections.defaultdict(set)                           # round-1 review N3-24: each function's callers, by the station's call edges
    for s_, ts_ in ADJ.items():
        for t_ in ts_:
            X["radj"][t_].add(s_)
    # D-057 (b): what each client branch does, in the lab's own words (its doesWords, run over the site's does[] rows)
    X["dw"] = does_lift([s for L in facts for s in L["forms"]["frontend"].get("reason_sites") or []])
    X["jreal"] = spec["_look"]["lift"]["jReal"][0]                     # D-065: the station's own test for a journey that is one real case
    # D-057: the handler chip's hover names the file without its directory — only where no other handler file has that name
    hb = collections.Counter(_short(f) for f in {r["file"] for r in rows if r.get("file")})
    for r in rows:
        r["_fileOne"] = bool(r.get("file")) and hb[_short(r["file"])] == 1
    # review F6: the mounts the app serves its routes under — each endpoint whose served path ends with its own path gives one; the
    # longest first, so a route whose own path the map mislabels ("/") is read from the path it is served at
    MOUNTS = sorted({ep0["full_path"][:len(ep0["full_path"]) - len(ep0["path"])] for ep0 in (fj.get("endpoints") or {}).values()
                     if ep0.get("full_path") and ep0.get("path") and ep0["path"] != "/" and ep0["full_path"].endswith(ep0["path"])}, key=lambda m: (-len(m), m))
    for L, r in zip(facts, rows):
        r["mo"] = by_moment(L, fj, fj["endpoints"]["endpoint:" + r["id"]], r, X, ADJ, MEMO, MOT)
        no_moment(r, L, fj, fj["endpoints"]["endpoint:" + r["id"]], sm["attrs"], MOT, MOUNTS)   # D-064 (2) · D-068: the endpoint metadata
        carried(r, L, fj, fj["endpoints"]["endpoint:" + r["id"]], W)      # D-055: what BY MOMENT carries of the code map, proven
    EXD, ex_css, ex_js, ex_line, ex_icons = BENCH.bench(facts, rows, fj, W, X, PHASE_STAGE, WRITE_OPS)   # D-071: the examples bench (L-23)
    # D-055: the switch's words, and per code-map field, across the feed, how many endpoints leave it bright (whole, or in part)
    CW = W["carry"]
    if CW.get("pick") not in (CW.get("opts") or {}) or "ruled" in CW:
        die(f"carry: its default {CW.get('pick')!r} must be one of its options, and it is my pick (no ruling names it)")
    cv_left, cv_beyond = {}, sum(r["cvn"][3] for r in rows)
    for r in rows:
        for k0, x in r["cv"].items():                                    # per field: endpoints where it is b · p · c · e · x
            cv_left.setdefault(k0, [0, 0, 0, 0, 0])["bpcex".index(x[0])] += 1
    kinds = {k.split(":", 1)[0] for r in rows for k in all_keys(r) | mo_keys(r)}         # D-069: an element draws keys inside it too
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
        r.pop("_cd"); r.pop("_cv"); TO = r.pop("_to"); r.pop("_hook"); r.pop("_files"); r.pop("_beh"); r.pop("_al"); r.pop("_fileOne")
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
    NT = UNI.names_table(W, A, inv, FLD)
    n_st = UNI.gap_whys(rows, fj, W, W["el"]["why"]["table"], NT, A, FLD, bool(only))
    for r in rows:                                                      # each name's selector served the hover's reading only; its KEY
        r["rgaps"] = [g[:4] + [[K for K, _sl in g[4]]] for g in r["rgaps"]]   # stays, so THE GAPS draws the name the station's way (D-052)
    # D-058: what BY MOMENT carries, in the Gabe Universe and THE GAPS — carried()'s own join, proven per endpoint
    slots = [c["id"] for c in cols if c["kind"] == "slot"]
    for r in rows:
        panels_carried(r, W["el"]["why"]["table"], NT, slots)
    icon_names, colour_refs = UNI.mark_refs(W)
    icon_names |= {x["icon"] for x in spec.values() if isinstance(x, dict) and x.get("icon")}
    icon_names |= {f["icon"] for f in spec["RISK"]["flags"].values()} | {c["icon"] for c in W["cols"].values()}
    icon_names |= {x["icon"] for grp in ("head", "details") for x in CM[grp].values()}
    enc, enc_css, enc_icons = enc_lift(W)                             # the code map's value chips (D-043)
    sk, sk_css = station_marks(W, rows, feeds, fj)                         # the station's glyph, colour and subcategory per element (D-052)
    enc_css += "\n" + sk_css
    for r in rows:
        r.pop("ro")                                                     # the roles now ride the station's marks (D.sk.keys)
    icon_names |= enc_icons | ex_icons
    MO = mo_block(rows, W, A, blocks, MOT, cols)                              # BY MOMENT: the blocks, the coverage, the keys once
    got = UNI.harvest(icon_names, colour_refs, HERE)                  # + every lab part's own icon
    lab = UNI.lab_marks()
    marks = UNI.marks(blocks, got["parts"], W, lab)
    got["icons"].update({m["icon"]: m["svg"] for m in lab.values()})
    # D-069 (his L-17: "give it an appropriate icon to that row", L-18: "let's give it an icon also"): the page's own glyphs, and the
    # rows whose mark is my pick — In-flight state and Standard or specialist, which have no page in the lab (D-022)
    got["icons"].update({k: PAGE_SVG.format(v) for k, v in PAGE_GLYPH.items()})
    for f0, ic in (W["marks"].get("own") or {}).items():
        b0 = MO["fam"].get(f0) or die(f"marks.own names {f0!r}, which is no BY MOMENT row")
        if marks[b0]["from"] == "part" or ic not in got["icons"]:
            die(f"marks.own.{f0}: block {b0} has a part's mark, or its icon {ic!r} is not drawn")
        marks[b0] = dict(marks[b0], icon=ic, col="var(--if)" if f0 == "inf" else marks[b0]["col"], **{"from": "own"})
    for f0, x0 in W["enc"]["fam"].items():                           # every icon a family of mine names is drawn
        lost = sorted({v0.get("icon") for v0 in (x0.get("vals") or {}).values() if isinstance(v0, dict) and v0.get("icon")} - set(got["icons"]))
        if lost and f0 in ("ifk", "gdk"):
            die(f"enc.fam.{f0}: icons nothing draws: {lost}")
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

    # D-057 (text-only): the Endings row's info line says no refusal the app sends carries a code — counted on the whole feed, and the
    # build stops the day one does (the line would be false)
    own_ref = [x for e0 in (fj.get("endpoints") or {}).values() for x in e0.get("produced") or [] if x.get("phase") != "uncaught" and x.get("state") == "defined"]
    n_coded = sum(1 for x in own_ref if x.get("code"))
    if n_coded:
        die(f"mo.noCode says no refusal carries a code, and {n_coded} of the app's {len(own_ref)} do — reword it")
    # D-065: the station's journeys. Feed-wide, over every element the station credits one to (its det.test_journeys, each node once,
    # the first home winning as the station draws it): the rows that name one real case (its jReal), how many of those the tests arm
    # records a walk for (more than one call, forms.json test_cases) and how many it does not, and the groups it does not read. Then the
    # page's: every journey the card names on the page's endpoints is placed at the outer moments or named in Proof's no-moment cell,
    # each once (PROVEN per endpoint in by_moment), the page's rows are the station's rows on those endpoints, and the universe's
    # Journeys items are carried exactly as BY MOMENT draws them — every journey it names, since each stands somewhere, and never the
    # "+N" the station counts without naming (review J2: one item more, never carried, so that row reads carried in part)
    jre_, TCS_, nodes_ = re.compile(X["jreal"]), fj.get("test_cases") or {}, {}
    for e_ in (feeds["graph"].get("l2") or {}).values():
        for n_ in e_.get("nodes") or []:
            nodes_.setdefault(n_["id"], n_)
    jrows = [(nid, j) for nid, n_ in nodes_.items() for j in (n_.get("det") or {}).get("test_journeys") or []]
    st_named = [j for _n, j in jrows if jre_.search(str(j.get("cid") or ""))]
    st_walk = sum(1 for j in st_named if len((TCS_.get(j["cid"]) or {}).get("calls") or []) > 1)
    on_page = sum(len((nodes_.get("endpoint:" + r["id"], {}).get("det") or {}).get("test_journeys") or []) for r in rows)
    jwhy = {w: MOT["jy:" + w] for w in JY_WHY}
    if on_page != MOT["jy:rows"] or MOT["jy:ordered"] + sum(jwhy.values()) != MOT["jy:rows"]:
        die(f"D-065: the station names {on_page} journeys on the page's endpoints, the page {MOT['jy:rows']} ({MOT['jy:ordered']} placed + {jwhy})")
    if sum(MOT["jy:j:" + h] for h in JY_JOIN) != MOT["jy:calls"] or MOT["jy:calls"] < MOT["jy:ordered"]:
        die("D-065: the joins of the placed journeys' calls here do not add up to those calls")
    jmore = {r["id"]: (nodes_.get("endpoint:" + r["id"], {}).get("det") or {}).get("test_journeys_more") or 0 for r in rows}
    uj = [(r["id"], x) for r in rows for u, x in zip(r["uni"]["rows"], r["ucv"]) if u["row"] == "JOURNEYS"]
    if sum(x[3] - bool(jmore[i]) for i, x in uj) != MOT["jy:rows"] or any(x[2] != x[3] - bool(jmore[i]) for i, x in uj) \
            or any(bool(jmore[i]) != (x[0] == "p") for i, x in uj):
        die(f"D-065: the universe's Journeys items are {sum(x[3] for _i, x in uj)}, {sum(x[2] for _i, x in uj)} carried; BY MOMENT draws {MOT['jy:rows']} journeys, every one, "
            f"and the station counts {sum(jmore.values())} more it does not name")
    J65 = {"jyRows": MOT["jy:rows"], "jyOrd": MOT["jy:ordered"], "jyCalls": MOT["jy:calls"], "jyRefs": MOT["jy:j:refs"], "jyStat": MOT["jy:j:status"],
           "jyNone": sum(MOT["jy:j:" + h] for h in JY_JOIN if h not in ("refs", "status")),
           "jyAgg": jwhy["agg"], "jyNoRec": jwhy["norec"], "jyOne": jwhy["one"], "jyNoHere": jwhy["nohere"], "jyOnly": jwhy["only"],
           "jyEps": sum(1 for r in rows if any(u["row"] == "JOURNEYS" for u in r["uni"]["rows"])), "jyMore": sum(jmore.values()),
           "jyMoreEps": sum(1 for i, _x in uj if jmore[i])}
    tok = {**J65, "app": app, "head": head, "uniHref": uni_href, "nRefusals": len(own_ref), "nCoded": n_coded, "nFeed": len(keys), "nRows": len(rows), "nCols": len(cols), "nBlocks": len(blocks),
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
            "cvLeft": cv_left, "ex": EXD}

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
                      ("<!--__BENCHLOOK__-->", '<style id="benchlook">\n' + ex_css.replace("</", "<\\/") + "\n</style>"),
                      ("/*__BENCHJS__*/", ex_js.replace("</", "<\\/")),
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
               f" · {len(MO['keys'])} keys · D-068 {MO['fk'][0]} tries drawn as forks ({MO['fk'][1]} ways, each path through one taking one)"
               f"\nD-055 · the code map's {rows[0]['cvn'][1]} fields: BY MOMENT carries {min(r['cvn'][0] for r in rows)}–{max(r['cvn'][0] for r in rows)} whole per endpoint"
               f" · {sum(1 for x in cv_left.values() if not x[2])} fields it carries whole on no endpoint · {sum(1 for x in cv_left.values() if x[2] == len(rows))} on every one"
               f" · {cv_beyond} tables its steps touch that the code map does not list (on {sum(1 for r in rows if r['cvn'][3])} of the endpoints)"
               f" · {sum(r['cvn'][2] for r in rows)} fields with nothing on their endpoint, counted apart from what is left")
    # D-056: the twelve adds, feed-wide — endpoints · elements
    n56 = lambda f: sum(1 for r in rows if f(r))
    sm56 = lambda f: sum(f(r) for r in rows)
    ex56 = [x for r in rows for x in r["xd"]["exits"] if x[5] is not None]
    summary += (f"\nD-056 · (1) behind named {n56(lambda r: r['dk']['behind'])} · {sm56(lambda r: len(r['dk']['behind']))} functions"
                f" ({sm56(lambda r: sum(len(lv) for lv in r['d']['behind'][2]))} by level, {sm56(lambda r: len(r['d']['behind'][3]))} depth not known),"
                f" BY MOMENT at a call {MOT['beh:call']} (on its walk parent's paths {MOT['beh:parent']}; its own steps name its paths {MOT['beh:own']}, on the parent's own paths {MOT['beh:pexact']}, on the call's paths {MOT['beh:cp']}) · the dependencies {MOT['beh:gate']} · a step {MOT['beh:step']} · none {MOT['beh:none']};"
                f" by name only {n56(lambda r: r['d']['behind'][4])} · {sm56(lambda r: r['d']['behind'][4])}"
                f" · (2) arranges {n56(lambda r: r['d']['arranged'])} · {sm56(lambda r: len(r['d']['arranged']))} cases ({MOT['arrCol']} in BY MOMENT's no-moment column, D-064)"
                f" · (3) endings declared {sum(1 for x in ex56 if x[5])} · not {sum(1 for x in ex56 if not x[5])} on {n56(lambda r: any(x[5] == 0 for x in r['xd']['exits']))}"
                f" · (4) write chips with a fate {sm56(lambda r: sum(1 for x in r['mo']['el'] if x[7] and 'fa' in x[7]))}"
                f" · (5) races {n56(lambda r: any(x[7] and 'rc' in x[7] for x in r['mo']['el']))} · {MOT['race']}"
                f" · (6) hollow {MOT['hollowCases']} tests on {MOT['hollow']} endings"
                f" · (7) headers {n56(lambda r: r['xd']['hdr'])} · {sm56(lambda r: len(r['xd']['hdr']))} endings"
                f" · (8) nested {n56(lambda r: r['dk']['reqNest'] or r['dk']['repNest'])} · {sm56(lambda r: len(r['dk']['reqNest']) + len(r['dk']['repNest']))} schemas"
                f" · (9) senders named {n56(lambda r: r['d']['hook'])} · {sm56(lambda r: len(r['d']['hook'] or []))}, files {sm56(lambda r: sum(1 for k0 in r['dk']['hook'] if '#' not in k0))},"
                f" screens {n56(lambda r: r['d']['screens'])} · {sm56(lambda r: len(r['d']['screens']))}"
                f" · (10) limiters {sm56(lambda r: sum(1 for x in r['mo']['el'] if x[7] and 'lm' in x[7]))} · login checks {sm56(lambda r: sum(1 for x in r['mo']['el'] if x[7] and 'au' in x[7]))}"
                f" · asserting tests {sm56(lambda r: sum(1 for x in r['mo']['el'] if x[7] and 'as' in x[7]))}"
                f" · (11) signatures {n56(lambda r: r['sig'][3])} · docstrings {n56(lambda r: r['sig'][4])}"
                f" · (12) streams {n56(lambda r: r['stream'])}")
    # D-057: what the switch now reads as carried, and the five places — endpoints · elements
    lft = {k0: x[0] + x[1] for k0, x in cv_left.items() if x[0] + x[1]}
    cs = next((r for r in rows if r["id"] == "POST /cooking/sessions"), None)
    summary += (f"\nD-057 · carried whole {min(r['cvn'][0] for r in rows)}–{max(r['cvn'][0] for r in rows)} of {rows[0]['cvn'][1]}"
                + (f" · POST /cooking/sessions {cs['cvn'][0]} carried · {cs['cvn'][1] - cs['cvn'][0] - cs['cvn'][2]} left · {cs['cvn'][2]} empty" if cs else "")
                + " · left feed-wide " + " ".join(f"{k0}:{n}" for k0, n in sorted(lft.items(), key=lambda kv: (-kv[1], kv[0])))
                + f"\n        (a) checks saying their raise {MOT['rz']} ({MOT['rzMsg']} with its words)"
                f" · (b) reason chips {sum(1 for r in rows for x in r['mo']['el'] if x[4] and x[4][0] == 'rsn')}"
                f" · (c) endings two paths reach {MOT['forkEnds']} ({MOT['forkPaths']} codes); a check inside a call left off {MOT['f1:drop']} paths that leave before it, {MOT['f1:up']} said on the call's paths"
                f" · (d) out of the band: {MOT['join:fn']} functions behind + {MOT['join:name']} by name only ({MOT['join:cut']} of them may also run under a function whose list is cut), {MOT['join:several']} at several moments, {MOT['join:left']} left"
                f"; on their callers' own paths {MOT['join:exact']}, on a caller's upper bound {MOT['join:cp']} (D-062 (2))"
                f" · upper-bound hovers page-wide {sum(1 for r in rows for x in r['mo']['el'] if x[7] and 'cp' in x[7])}"
                f" · (e) 500s with a cause {sum(1 for r in rows for x in r['mo']['el'] if x[7] and 'cz' in x[7])}, raising chips {sum(1 for r in rows for x in r['mo']['el'] if x[7] and 'ru' in x[7])}")
    # D-058: what BY MOMENT carries in the other two panels — items carried of items, summed over the feed, and on his example
    s58 = lambda f: [sum(f(r)[0] for r in rows), sum(f(r)[1] for r in rows)]
    u58, a58, b58 = s58(lambda r: r["ucn"]), s58(lambda r: r["gcn"]["cm"]), s58(lambda r: r["gcn"]["uni"])
    summary += (f"\nD-058 · the Gabe Universe {u58[0]} of {u58[1]} items carried · {u58[1] - u58[0]} left"
                f" (rows whole {sum(1 for r in rows for x in r['ucv'] if x[0] == 'c')}, in part {sum(1 for r in rows for x in r['ucv'] if x[0] == 'p')})"
                f" · THE GAPS from the code map {a58[0]} of {a58[1]} · {a58[1] - a58[0]} left, from the universe {b58[0]} of {b58[1]} · {b58[1] - b58[0]} left"
                + (f"\n        POST /cooking/sessions · universe {cs['ucn'][0]} of {cs['ucn'][1]} · {cs['ucn'][1] - cs['ucn'][0]} left"
                   f" · gaps from the code map {cs['gcn']['cm'][0]} of {cs['gcn']['cm'][1]} · from the universe {cs['gcn']['uni'][0]} of {cs['gcn']['uni'][1]}" if cs else ""))
    # D-064 (1): the functions behind that the check rule narrows — their own chips, the walk's that follow a narrowed parent, the ones
    # joined by name that follow a narrowed caller; the paths dropped; every function chip at a call proven
    summary += (f"\nD-064 · (1) functions behind narrowed {MOT['d64:chips']} ({MOT['d64:left']} paths dropped that leave before them, {MOT['d64:raise']} at a raise called"
                f" before them (review F2), {MOT['d64:catch']} that never enter the except body the call is written in; {MOT['d64:words']} times the words"
                f" matched and the chain left elsewhere: kept) · following a narrowed caller: the walk's {MOT['d64:follow']}, by name {MOT['d64:join']}"
                f" · {MOT['d64:gonecall']} left on no path at one call and standing at another (not drawn at the first)"
                f" · {MOT['f3:in500']} on the way to the 500 (review F3)"
                f" · {MOT['d64:proven']} function chips at a call proven on no path that leaves before them"
                f"\n        review F1 · upper bound where the path leaves the function it hangs under partway: {MOT['f1:lqChips']} chips · {MOT['f1:lqPaths']} chip-paths"
                f" ({MOT['f1:lq:i']} where the map shows the leaving point, {MOT['f1:lq:ii']} an error from where the map does not say, {MOT['f1:lq:p']} only inherited; calls named by line {MOT['f1:noname']}) · proven from positions: {MOT['f1:provenA']} routed chips, {MOT['f1:provenB']} hanging chips"
                f" · review F7: {MOT['f7:own']} chain-called chips on the paths their own steps run on, {MOT['f7:trail']} trailing steps placed at their call"
                f"\n        (2) the endpoint metadata (D-068): {MOT['nm:facts']} facts on {MOT['nm:rows']} endpoints (" + " · ".join(f"{k} {MOT['nm:' + k] or MOT['arrCol'] if k == 'arr' else MOT['nm:' + k]}" for k in NM_KINDS if k not in ("piece", "jy"))
                + f" · piece {sum(1 for r in rows for x in r['mo']['nm'] if x[1] == 'piece')})"
                + f" · review F4: {MOT['f4:untestedOut']} 'no test covers this' flags left out where a test calls the endpoint"
                + f" · review F5: {sum(1 for r in rows for x in r['mo']['nm'] if x[1] == 'file' and not (x[4] or {}).get('df'))} handlers with no def line in the feed"
                + f" · review F6: {MOT['f6:seg']} first segments read from the served path"
                + (f"\n        POST /cooking/sessions · the code map's hide header {cs['cvn'][0]} of {cs['cvn'][1]} carried · {cs['cvn'][1] - cs['cvn'][0] - cs['cvn'][2]} left · {cs['cvn'][2]} with nothing here"
                   f" · the universe {cs['ucn'][0]} of {cs['ucn'][1]}" if cs else ""))
    # D-065: the journeys — the station feed-wide, then the page's
    summary += (f"\nD-065 · the station names {len(jrows)} journeys across {len({n for n, _j in jrows})} elements: {len(st_named)} one real case each"
                f" ({st_walk} with a recorded walk of more than one call, {len(st_named) - st_walk} without), {len(jrows) - len(st_named)} groups the tests arm does not read"
                f"\n        the page's {len(rows)} endpoints: {MOT['jy:rows']} journeys on {J65['jyEps']} endpoints (+{J65['jyMore']} the station counts without naming)"
                f" · placed at the outer moments {MOT['jy:ordered']} ({MOT['jy:calls']} calls here, each with its own chips — {MOT['jy:multi']} journeys call here more than once;"
                f" {MOT['jy:chips']} chips, {MOT['jy:steps']} steps, {MOT['jy:noep']} to no endpoint the map knows) · a call here follows a picked path by the endings it proves"
                f" {MOT['jy:j:refs']}, by the one ending of the status it asserts {MOT['jy:j:status']} ({MOT['jy:pm']} of all these on an ending several paths reach),"
                f" on no one path " + " · ".join(f"{h} {MOT['jy:j:' + h]}" for h in JY_JOIN if h not in ("refs", "status")) + f" ({MOT['jy:mask0']} chips drawn under all paths only)"
                f" · named in Proof's no-moment cell " + " · ".join(f"{w} {jwhy[w]}" for w in JY_WHY)
                + f" · the universe's Journeys items carried {sum(x[2] for _i, x in uj)} of {sum(x[3] for _i, x in uj)} ({J65['jyMoreEps']} rows with a \"+N\" item never carried)"
                + (f"\n        POST /cooking/sessions · the hide headers: the code map {cs['cvn'][0]} of {cs['cvn'][1]} · {cs['cvn'][1] - cs['cvn'][0] - cs['cvn'][2]} left · {cs['cvn'][2]} with nothing here"
                   f" · the universe {cs['ucn'][0]} of {cs['ucn'][1]} · {cs['ucn'][1] - cs['ucn'][0]} left · THE GAPS from the universe {cs['gcn']['uni'][0]} of {cs['gcn']['uni'][1]}"
                   f" · from the code map {cs['gcn']['cm'][0]} of {cs['gcn']['cm'][1]}" if cs else ""))
    # D-069: what each element says it is — the gates' hosts, the roles the station's own rule gives, the client's reads and branches
    summary += (f"\nD-069 · gates and switches with a host {sum(v for k, v in MOT.items() if k.startswith('c1:host:'))} ("
                + " · ".join(f"{k[8:]} {v}" for k, v in sorted(MOT.items()) if k.startswith("c1:host:")) + f"), with an effect {MOT['c1:eff']}"
                f" · roles by the station's own rule: accessor {RDER['accessor']} · gate {RDER['gate']} · classes drawn as their schema or model {MOT['c1:class']}"
                f" · functions marked with what they decide and touch {MOT['c1:fnMarks']} · rare pieces {MOT['c1:rare']} ({MOT['c1:rareTg']} naming a drawn item)"
                f" · reads a refresh fetches again {MOT['c1:refetch']} · 'any other status' lines {MOT['c1:rest']} · hooks on the way to a send {MOT['c1:orch']}")
    # D-070: the relations across the moments — the data connectors and the in-flight lifelines, each join proven in _ae_rel
    summary += (f"\nD-070 · data connectors {MOT['c2:links']} function → table links ({MOT['c2:ops']} reads and writes, {MOT['c2:rw']} links that read and write)"
                f" · ticks {MOT['c2:tick']} · commit and rollback rules {MOT['c2:rule']} · races on a link {MOT['c2:race']}"
                f" · in-flight lanes {MOT['c2:il:lanes']} ({MOT['c2:il:folds']} folds holding {MOT['c2:il:folded']}) · read dots {MOT['c2:il:dots']}"
                f" · endings a read decides {MOT['c2:il:decides']} · claims {MOT['c2:il:claim']} · reads at no moment {MOT['c2:il:unplaced']} (a line between two runs read into the next {MOT['c2:il:gap']}) · dot-paths left because the path leaves before the read {MOT['c2:il:leftBefore']} · dots on no path of their value {MOT['c2:il:dotOff']} · endings no path reaches, left off {MOT['c2:il:noPathEnd']}")
    summary += "\n" + ex_line                                          # D-071
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
