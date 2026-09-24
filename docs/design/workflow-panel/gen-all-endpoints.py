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
    det = {
        "exits": cap([[x["kind"], stage_of(x), x.get("status"), (x.get("detail") or x.get("code") or x.get("via") or x.get("reason") or "")[:70],
                       len(x.get("tests") or [])] for x in exits]),
        "tables": cap([[t["table"], t["rw"]] for t in tables]),
        "fates": cap([[p["names"]["drawn"], p.get("status"), fate_of(p, after_all[p["id"]])] for p in F["paths"]]),
        "gateWrites": sorted(gate_only),
        "guards": cap([[g.get("status"), (g.get("pred") or "")[:80]] for g in (F.get("preconditions") or [])]),
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
            "xd": {"fates": [p["kind"] for p in F["paths"]][:CAP],
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
    dk = {"exits": [[stat(x.get("status")), sorted({"case:" + t["case"] for t in x.get("tests") or [] if t.get("case")})] for x in cap(exits)],
          "tables": ["table:" + t["table"] for t in cap(L["data"]["tables"])],
          "gateWrites": ["table:" + t for t in d["gateWrites"]],
          "fates": [stat(p.get("status")) for p in cap(F["paths"])],
          "guards": [["guard:" + g["id"], ks, stat(g.get("status"))] for g, ks in cap(list(zip(pre, gk)))],
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
    icons |= {x["icon"] for f in ("switch", "alarm", "arm", "branch", "does") for x in F[f]["vals"].values()} | {g["icon"] for g in G.values()} | {F[f]["icon"] for f in ("limit", "role", "hrole")}
    return E, css, icons


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
    for r in rows:
        r.pop("_cd"); r.pop("_cv")
    order = list(A)
    for r in rows:
        r["has"] = UNI.carried(r, cols, CM)
        g_full, g_part = UNI.gaps(set(r["has"]), r["uni"], UW, UNI.read_here(r, r["uni"]))
        r["gaps"] = sorted(g_full, key=order.index)
        r["partly"] = sorted(g_part, key=lambda x: order.index(x[0]))
        r["rgaps"] = UNI.reverse_gaps(r, r["uni"], UW, set(r["has"]))        # the gaps the other way (D-040)
        r["uni"].pop("_drawn")                                          # the generator's own reading, never drawn
    icon_names, colour_refs = UNI.mark_refs(W)
    icon_names |= {x["icon"] for x in spec.values() if isinstance(x, dict) and x.get("icon")}
    icon_names |= {f["icon"] for f in spec["RISK"]["flags"].values()} | {c["icon"] for c in W["cols"].values()}
    icon_names |= {x["icon"] for grp in ("head", "details") for x in CM[grp].values()}
    enc, enc_css, enc_icons = enc_lift(W)                             # the code map's value chips (D-043)
    icon_names |= enc_icons
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
           "uniTier": spec["_card"]["tier"], "uniDeeper": " · ".join(t["name"] for t in spec["_card"]["tiers"][spec["_card"]["bootTier"] + 1:] if not t["fnOff"])}
    if not spec["_card"]["tiers"][spec["_card"]["bootTier"]]["fnOff"]:
        die("the station now opens with functions drawn — one.uni.plain says they are hidden; reword it before building")
    if sorted(LAYOUTS) != sorted(W["rail"]["lay"]["opts"]):
        die("the words file's layouts and the page's differ")
    data = {"tok": tok, "partial": bool(only), "layouts": LAYOUTS, "rows": rows, "cols": cols, "blocks": blocks, "orders": orders, "families": families,
            "kinds5": list(KINDS5), "fates": list(FATES), "pieceWords": list(PIECE_WORDS), "words": W,
            "icons": got["icons"], "marks": marks, "uspec": uspec, "attrs": attrs, "attrOrder": order, "ulook": ulook,
            "ucard": {k: spec["_card"][k] for k in ("more", "comp", "okState")}, "elLabels": dict(sorted(CL.items())), "enc": enc}

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
               f"under {len(blocks)} blocks · alarm families {len(families)} · forms {tok['formsSha']} · {len(html)} bytes")
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
