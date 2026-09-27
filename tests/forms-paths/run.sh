#!/usr/bin/env bash
# Forms paths battery — what the generation ARMS write into forms.json, slice by slice (docs/design/element-forms/
# amendment-1.md §A2). Slice 2 · ids: once any arm is selected, every produced exit carries an `x:` id and every
# precondition a `g:` id plus the `exit` it guards; with no arm selected nothing changes. The cases drive the real
# orchestrator (_a3_forms_build.extend_backend) over _a3_paths.build output on a synthetic FastAPI tree — AST only.
# Each case is shown to FIRE and to stay SILENT. Exit 0 = all pass.
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
GEN="${GEN_OVERRIDE:-$REPO/templates/center/generators}"

T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
pass=0; fail=0
ok()  { pass=$((pass+1)); }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }

A="$T/app"
mkdir -p "$A/api" "$A/services" "$A/middleware" "$A/docs/site/center"
printf '{}' > "$A/docs/site/center/center.config.json"
cat > "$A/uv.lock" <<'LOCK'
version = 1

[[package]]
name = "fastapi"
version = "0.136.3"
LOCK
cat > "$A/main.py" <<'PYF'
from fastapi import FastAPI

from middleware.gate import Gate

app = FastAPI()
app.add_middleware(Gate)
PYF
cat > "$A/middleware/gate.py" <<'PYF'
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from config import Settings, get_settings

EXEMPT = frozenset({"/healthz"})
HOT = ("/orders",)


def over(request):
    return request.headers.get("x-over") == "1"


class Gate(BaseHTTPMiddleware):
    def __init__(self, app, settings: Settings | None = None):
        super().__init__(app)
        s = settings or get_settings()
        self._enabled = s.limit_enabled

    async def dispatch(self, request, call_next):
        if not self._enabled or request.url.path in EXEMPT:
            return await call_next(request)
        if request.url.path.startswith(HOT):
            if over(request):
                return self._throttled()
        if over(request):
            return self._throttled()
        return await call_next(request)

    def _throttled(self):
        return JSONResponse(status_code=429, content={"detail": "slow down"})
PYF
cat > "$A/services/orders.py" <<'PYF'
class OrderError(Exception):
    pass


def place(x):
    if x == 13:
        raise OrderError
    return x


def settle(session, mode):
    if mode == Mode.REPLAY:
        return "replay"
    if mode == Mode.DONE:
        session.commit()
        return "done"
    session.commit()
    return "fresh"


def label(x):
    if x:
        return "a"
    return "b"


def stream():
    yield 1


def one(x):
    return x


def compute(x):
    if x:
        return 1
    return 2


def reserve(x):
    if x == 13:
        raise OrderError
    if x > 100:
        return "big"
    return "small"


class Mode:
    REPLAY = 1
    DONE = 2
PYF
cat > "$A/config.py" <<'PYF'
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_")

    limit_enabled: bool = False


def get_settings() -> Settings:
    return Settings()
PYF
cat > "$A/api/health.py" <<'PYF'
from fastapi import APIRouter

router = APIRouter()


@router.get("/healthz")
def healthz():
    return {"ok": True}
PYF
cat > "$A/api/orders.py" <<'PYF'
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from services.orders import OrderError, compute, label, one, place, reserve, settle, stream

router = APIRouter(prefix="/orders")


@router.post("/create")
def create(x: int):
    if x < 0:
        raise HTTPException(status_code=400, detail="negative")
    if x < 0:
        raise HTTPException(status_code=400, detail="still negative")
    try:
        place(x)
    except OrderError as exc:
        raise HTTPException(status_code=409, detail="order refused") from exc
    return {"ok": True}


@router.post("/settle")
def settle_order(x: int):
    status = settle(None, x)
    tag = label(x)
    for _ in stream():
        pass
    one(x)
    return {"status": status, "tag": tag}


@router.get("/safe")
def safe(x: int):
    try:
        return compute(x)
    except Exception:
        return None


@router.post("/made")
def made(x: int):
    return JSONResponse(status_code=201, content={"x": x})


@router.delete("/drop")
def drop(x: int):
    if x:
        return {"dropped": True}


@router.post("/reserve")
def reserve_order(x: int):
    try:
        size = reserve(x)
    except OrderError as exc:
        raise HTTPException(status_code=409, detail="reserve refused") from exc
    return {"size": size}
PYF
cat > "$A/api/users.py" <<'PYF'
from fastapi import APIRouter

router = APIRouter(prefix="/users")


@router.get("/list")
def list_users(page: int):
    return []
PYF
cat > "$A/api/people.py" <<'PYF'
from fastapi import APIRouter

router = APIRouter(prefix="/people")


@router.get("/list")
def list_people(page: int):
    return []
PYF

py() {  # py "<name>" <<'PY' … PY  — the prelude gives A · T · GEN · build(repo, arms) → forms · rows(forms) · strip(endpoints)
  local name="$1" src; src=$(cat)
  if (cd "$T" && PYTHONPATH="$GEN" A="$A" T="$T" GEN="$GEN" python3 - >"$T/py.txt" 2>&1 <<PY
import copy, json, os, re, shutil, sys
from pathlib import Path
A, T, GEN = (Path(os.environ[k]) for k in ("A", "T", "GEN"))
import _a3_code as C, _a3_paths as P, _a3_forms_build as B, _a3_forms_ids as I
def build(repo, arms):
    files = sorted(str(p.relative_to(repo)) for p in (repo / "api").glob("*.py"))
    amap = {"head": "abc1234", "entities": {"x": {"endpoints": C.parse_endpoints(repo, files)}},
            "app_middleware": C.parse_app_middleware(repo, {"x": {"api": ["api/*.py"]}})}
    for ep in amap["entities"]["x"]["endpoints"]:
        ep.pop("refs", None)
    if arms is None:
        os.environ.pop("GABE_FORMS_ARMS", None)
    else:
        os.environ["GABE_FORMS_ARMS"] = arms
    return B.extend_backend(P.build(amap, repo), amap, repo, {})
def rows(forms, kind="produced"):
    for key, e in forms["endpoints"].items():
        for vi, v in enumerate(e.get("variants") or [e]):
            for r in v.get(kind) or []:
                yield key, vi, r
def strip(endpoints):
    endpoints = copy.deepcopy(endpoints)
    for e in endpoints.values():
        for v in e.get("variants") or [e]:
            for r in (v.get("produced") or []) + (v.get("preconditions") or []):
                for k in ("id", "exit", "exits"):
                    r.pop(k, None)
    return endpoints
def variant(name, edit):
    d = T / name
    shutil.rmtree(d, ignore_errors=True)
    shutil.copytree(A, d)
    edit(d)
    return d
def patch(d, rel, a, b):
    p = d / rel
    s = p.read_text()
    assert s.count(a) == 1, (rel, a)
    p.write_text(s.replace(a, b))
$src
PY
  ); then ok; else bad "$name: $(tail -4 "$T/py.txt")"; fi
}

py "S2.1 · SILENT: with no arm selected no row carries an id and there is no ids block" <<'PY'
f = build(A, None)
assert f["present"] and "ids" not in f and "arms" not in f, sorted(f)
assert not any(k in r for _, _, r in list(rows(f)) + list(rows(f, "preconditions")) for k in ("id", "exit", "exits")), "an id rode on an arms-off build"
g = build(A, "none")
assert g == f, "GABE_FORMS_ARMS=none is arms off"
PY

py "S2.2 · FIRE: any arm on → every exit an x: id, every precondition a g: id; nothing else moves" <<'PY'
off, on = build(A, None), build(A, "paths")
xs = [r for _, _, r in rows(on)]
gs = [r for _, _, r in rows(on, "preconditions")]
assert xs and gs and all(re.fullmatch(r"x:[0-9a-f]{10}", r["id"]) for r in xs) and all(re.fullmatch(r"g:[0-9a-f]{10}", r["id"]) for r in gs), (xs, gs)
assert on["ids"] == {"present": True, "reason": None, "x": len(xs), "g": len(gs), "linked": on["ids"]["linked"],
                     "ambiguous": 0, "unlinked": on["ids"]["unlinked"], "collisions": 0}, on["ids"]
assert on["ids"]["linked"] + on["ids"]["unlinked"] == len(gs)
def subset(a, b):
    if isinstance(a, dict):
        return isinstance(b, dict) and all(k in b and subset(v, b[k]) for k, v in a.items())
    if isinstance(a, list):
        return isinstance(b, list) and len(a) == len(b) and all(subset(x, y) for x, y in zip(a, b))
    return type(a) is type(b) and a == b                  # 0 is not False, 200 is not 200.0 — the file would differ
assert subset(off["endpoints"], on["endpoints"]), "an arm changed or removed something the endpoint pass wrote"
PY

py "S2.3 · FIRE: the global 429 — filtered per endpoint by path prefix — carries ONE id on every endpoint; the sensitive 429 another" <<'PY'
f = build(A, "paths")
by_site = {}
carriers = {}
for key, _, r in rows(f):
    if r.get("phase") == "middleware":
        by_site.setdefault(r["site"], set()).add(r["id"])
        carriers.setdefault(r["site"], set()).add(key)
assert len(by_site) == 2 and all(len(v) == 1 for v in by_site.values()), by_site
glob = max(carriers, key=lambda s: len(carriers[s]))
hot = min(carriers, key=lambda s: len(carriers[s]))
assert len(carriers[glob]) == len(f["endpoints"]) and all(k.split(" ", 1)[1].startswith("/orders") for k in carriers[hot]), carriers
assert len(set().union(*by_site.values())) == 2, "one id names two exits"
PY

py "S2.4 · SILENT on sharing: a handler-owned default (422 · 500) gets a different id on every handler" <<'PY'
f = build(A, "paths")
for phase in ("validation", "uncaught"):
    ids = {}
    for key, _, r in rows(f):
        if r.get("phase") == phase:
            ids.setdefault(r["id"], set()).add(key)
    assert ids and all(len(keys) == 1 for keys in ids.values()), (phase, ids)
PY

py "S2.5 · FIRE: a precondition links to the exit it guards — in the handler and one call down; identical guards stay two" <<'PY'
f = build(A, "paths")
e = f["endpoints"]["endpoint:POST /orders/create"]
by_id = {r["id"]: r for r in e["produced"]}
guards = [g for g in e["preconditions"] if g.get("pred") == "x < 0"]
assert len(guards) == 2 and guards[0]["id"] != guards[1]["id"], guards
assert sorted(by_id[g["exit"]]["detail"] for g in guards) == ["negative", "still negative"], [by_id.get(g["exit"]) for g in guards]
assert all(by_id[g["exit"]]["at"] == g["at"] for g in guards)
deep = [g for g in e["preconditions"] if g.get("depth") == 1]
assert deep and by_id[deep[0]["exit"]]["status"] == 409 and by_id[deep[0]["exit"]]["raised_at"] == deep[0]["at"], (deep, e["produced"])
PY

py "S2.6 · ids survive a line move and follow a reworded detail — x: moves, g: does not" <<'PY'
def ids(repo):
    f = build(repo, "paths")
    return ({r["id"]: r.get("detail") for _, _, r in rows(f)}, {r["id"] for _, _, r in rows(f, "preconditions")})
base_x, base_g = ids(A)
def variant(name, edit):
    d = T / name
    shutil.rmtree(d, ignore_errors=True)
    shutil.copytree(A, d)
    edit(d)
    return ids(d)
def prepend(d):
    for rel in ("api/orders.py", "services/orders.py", "middleware/gate.py", "api/users.py"):
        p = d / rel
        p.write_text("\n" * 7 + p.read_text())
dx, dg = variant("drift", prepend)
assert set(dx) == set(base_x) and dg == base_g, "a line move changed an id"
def reword(d):
    p = d / "api/orders.py"
    p.write_text(p.read_text().replace('"order refused"', '"order declined"'))
rx, rg = variant("reword", reword)
assert len(set(base_x) - set(rx)) == 1 and len(set(rx) - set(base_x)) == 1 and rg == base_g, (base_x, rx)
PY

py "S2.7 · two handlers on one method and path: each variant's rows carry their own ids" <<'PY'
d = T / "variants"
shutil.rmtree(d, ignore_errors=True)
shutil.copytree(A, d)
(d / "api/people.py").write_text((d / "api/people.py").read_text().replace('prefix="/people"', 'prefix="/users"'))
f = build(d, "paths")
e = f["endpoints"].get("endpoint:GET /users/list") or {}
assert len(e.get("variants") or []) == 2, sorted(f["endpoints"])
v422 = [next(r["id"] for r in v["produced"] if r.get("phase") == "validation") for v in e["variants"]]
assert len(set(v422)) == 2 and all(r.get("id") for v in e["variants"] for r in v["produced"]), v422
assert f["ids"]["collisions"] == 0
PY

py "S2.8 · honest-empty: ids that fail write no id, say why, and never cost the arms" <<'PY'
def boom(*a, **k):
    raise RuntimeError("ids down")
I.g_ids = boom
f = build(A, "paths")
assert f["ids"] == {"present": False, "reason": "error: RuntimeError: ids down"}, f["ids"]
assert "arms" in f and "arms_error" not in f, sorted(f)
assert not any("id" in r for _, _, r in rows(f)), "a half-written id set reached the feed"
PY

py "S3.P1 · FIRE: a deciding callee becomes branches — each arm linked to its return; statuses defined · default · implicit" <<'PY'
f = build(A, "paths")
s = f["endpoints"]["endpoint:POST /orders/settle"]
br = s["branches"]
assert [b["token"] for b in br] == ["REPLAY", "DONE", "fall-through"], [b["token"] for b in br]
assert len(br) == 3 and all(b["call"] == "settle" and b["fn"] == "services/orders.py::settle" and b["why"] == ["commit-differs"] for b in br), br
rets = {r["id"]: r for r in s["returns"]}
assert all(rets[b["return"]]["depth"] == 1 and rets[b["return"]]["site"] == b["site"] and rets[b["return"]]["branch"] == b["id"] for b in br), (br, s["returns"])
assert [rets[b["return"]]["kind"] for b in br] == ["return", "return", "fall-through"], [rets[b["return"]] for b in br]
assert all(re.fullmatch(r"b:[0-9a-f]{10}", b["id"]) for b in br) and all(re.fullmatch(r"r:[0-9a-f]{10}", r["id"]) for r in s["returns"])
top = [r for r in s["returns"] if r["depth"] == 0]
assert top == [dict(top[0], status=200, state="default")] and top[0]["kind"] == "return", top
m = [r for r in f["endpoints"]["endpoint:POST /orders/made"]["returns"] if r["depth"] == 0]
assert [(r["status"], r["state"]) for r in m] == [(201, "defined")], m
d = [r for r in f["endpoints"]["endpoint:DELETE /orders/drop"]["returns"] if r["depth"] == 0]
assert [r["kind"] for r in d] == ["return", "implicit"] and d[0]["pred"] == "x", d
PY

py "S3.P2 · collapsed: a non-deciding callee, an iterated generator and a one-return helper each say why; nothing collapsed rides a deciding site" <<'PY'
f = build(A, "paths")
col = {c["call"]: c["reason"] for c in f["endpoints"]["endpoint:POST /orders/settle"]["collapsed"]}
assert col == {"label": "arms change neither exit nor commit", "stream": "no value return", "one": "one return"}, col   # `for _ in stream()` runs BEFORE the response (§A4 V15)
c2 = {c["call"]: c["reason"] for c in f["endpoints"]["endpoint:POST /orders/create"]["collapsed"]}
assert c2 == {"place": "one return"}, c2
assert "branches" not in f["endpoints"]["endpoint:POST /orders/create"]
PY

py "S3.P6 · a return inside a swallowing except is catch-return; the call it swallows is collapsed" <<'PY'
f = build(A, "paths")
s = f["endpoints"]["endpoint:GET /orders/safe"]
assert [(r["kind"], r.get("pred")) for r in s["returns"] if r["depth"] == 0] == [("return", None), ("catch-return", "except Exception")], s["returns"]
assert s["collapsed"] == [{"site": s["collapsed"][0]["site"], "call": "compute", "fn": "services/orders.py::compute", "reason": "swallowed by the caller"}], s["collapsed"]
PY

py "S3.P7 · conditions: when_for_path names the setting; the exempt path reads applies:false; no row is added or dropped" <<'PY'
off, on = build(A, None), build(A, "paths")
for k in off["endpoints"]:
    assert len(on["endpoints"][k]["produced"]) == len(off["endpoints"][k]["produced"]), k
glob = lambda e: [r for r in e["produced"] if r.get("phase") == "middleware" and r.get("scope") == "all"]
h = glob(on["endpoints"]["endpoint:GET /healthz"])
assert len(h) == 1 and h[0]["applies"] is False and "when_for_path" not in h[0], h
c = glob(on["endpoints"]["endpoint:POST /orders/create"])
assert c[0]["when_for_path"] == "settings.limit_enabled" and "applies" not in c[0], c
ck = "middleware/gate.py::Gate: not (not self._enabled or request.url.path in EXEMPT)"
assert list(on["conditions"]) == [ck], list(on["conditions"])
assert [t["kind"] for t in on["conditions"][ck]["terms"]] == ["expr", "in"]
assert on["arms"]["paths"]["stats"]["applies_false"] >= 1 and on["arms"]["paths"]["parts"]["framework"]["present"] is True, on["arms"]["paths"]
PY

py "S3.P3 · contributes-rows: a callee whose raise the handler turns into a refusal decides the path with no commit in it" <<'PY'
s = build(A, "paths")["endpoints"]["endpoint:POST /orders/reserve"]
assert [(b["token"], b["why"]) for b in s.get("branches", [])] == [("x", ["contributes-rows"]), ("fall-through", ["contributes-rows"])], s.get("branches")
PY

py "S3.P8 · returns as sent: a redirect's own 307, a runtime status unknown, a held response, no phantom implicit; one callee at two sites, a commit an except skips, a void helper, a constructor" <<'PY'
import _a3_forms_paths as FP
assert FP._token("match Mode.REPLAY") == "REPLAY" and FP._token("mode == Mode.DONE") == "DONE"
def edit(d):
    (d / "services/shapes.py").write_text("class Shape:\n    pass\n")
    (d / "services/tx.py").write_text('''def guarded(session, x):
    try:
        session.commit()
    except Exception:
        return "failed"
    return "ok"


def ensure(session, x):
    if x:
        return
    session.commit()
''')
    (d / "api/edge.py").write_text('''from fastapi import APIRouter
from fastapi.responses import JSONResponse, RedirectResponse

from services.orders import settle
from services.shapes import Shape
from services.tx import ensure, guarded

router = APIRouter(prefix="/edge")


@router.get("/go", status_code=200)
def go():
    return RedirectResponse("/elsewhere")


@router.get("/dyn")
def dyn(code: int):
    return JSONResponse(status_code=code, content={})


@router.get("/held")
def held():
    resp = RedirectResponse("/x", status_code=302)
    return resp


@router.get("/match")
def pick(x: int):
    match x:
        case 1:
            return {"one": True}
        case _:
            return {"other": True}


@router.get("/loop")
def spin():
    while True:
        return {"spun": True}


@router.post("/twice")
def twice(x: int):
    a = settle(None, x)
    b = settle(None, x)
    s = Shape()
    return {"a": a, "b": b}


@router.post("/tx")
def tx(x: int):
    g = guarded(None, x)
    ensure(None, x)
    return {"g": g}
''')
f = build(variant("edge", edit), "paths")
def top(k):
    return [(r["kind"], r["status"], r["state"]) for r in f["endpoints"][k]["returns"] if r["depth"] == 0]
assert top("endpoint:GET /edge/go") == [("return", 307, "default")], top("endpoint:GET /edge/go")
assert top("endpoint:GET /edge/dyn") == [("return", None, "unknown")], top("endpoint:GET /edge/dyn")
assert top("endpoint:GET /edge/held") == [("return", 302, "defined")], top("endpoint:GET /edge/held")
assert [k for k, _, _ in top("endpoint:GET /edge/match")] == ["return", "return"], top("endpoint:GET /edge/match")
assert [k for k, _, _ in top("endpoint:GET /edge/loop")] == ["return"], top("endpoint:GET /edge/loop")
t = f["endpoints"]["endpoint:POST /edge/twice"]
assert len(t["branches"]) == 6 and len({b["id"] for b in t["branches"]}) == 6 and len({r["id"] for r in t["returns"]}) == len(t["returns"]), (t["branches"], t["returns"])
assert {c["call"]: c["reason"] for c in t["collapsed"]} == {"Shape": "constructor: builds a value"}, t["collapsed"]
x = f["endpoints"]["endpoint:POST /edge/tx"]
assert [(b["call"], b["why"]) for b in x.get("branches", [])] == [("guarded", ["commit-differs"])] * 2, x.get("branches")
assert {c["call"]: c["reason"] for c in x["collapsed"]} == {"ensure": "no value return"}, x["collapsed"]   # a void helper
PY

py "S3.P19 · FIRE+SILENT: a class a handler imports in its OWN body is read there — its constructor collapses as one, a response class it subclasses sets the return's status; the same names no import explains are unresolved" <<'PY'
def edit(d):
    (d / "services/shapes.py").write_text("class Shape:\n    pass\n")
    (d / "services/resp.py").write_text("from fastapi.responses import RedirectResponse\n\n\nclass Away(RedirectResponse):\n    pass\n")
    (d / "api/local.py").write_text('''from fastapi import APIRouter

router = APIRouter(prefix="/local")


@router.post("/shape")
def shape():
    from services.shapes import Shape
    s = Shape()
    return {"s": str(s)}


@router.get("/away")
def away():
    from services.resp import Away
    return Away("/elsewhere")


@router.post("/bare")
def bare():
    s = Shape()
    return Away(str(s))
''')
f = build(variant("localimp", edit), "paths")
sh = f["endpoints"]["endpoint:POST /local/shape"]
assert [(c["call"], c["fn"], c["reason"]) for c in sh["collapsed"]] == [("Shape", "services/shapes.py::Shape", "constructor: builds a value")], sh.get("collapsed")
aw = [(r["kind"], r["status"], r["state"]) for r in f["endpoints"]["endpoint:GET /local/away"]["returns"] if r["depth"] == 0]
assert aw == [("return", 307, "default")], aw
b = f["endpoints"]["endpoint:POST /local/bare"]
assert not b.get("collapsed"), b.get("collapsed")          # SILENT: no import names them — neither a constructor nor an unresolved project call
assert [(r["kind"], r["status"]) for r in b["returns"] if r["depth"] == 0] != [("return", 307)], b["returns"]
PY

py "S3.P9 · conditions read a local path and route templates; a condition proven true reads applies:true" <<'PY'
def edit(d):
    patch(d, "middleware/gate.py", "        if not self._enabled or request.url.path in EXEMPT:", "        path = request.url.path\n        if path in EXEMPT:")
    patch(d, "middleware/gate.py", 'EXEMPT = frozenset({"/healthz"})', 'EXEMPT = frozenset({"/healthz", "/users/me"})')
    patch(d, "api/users.py", '@router.get("/list")\ndef list_users(page: int):', '@router.get("/{uid}")\ndef list_users(uid: str):')
f = build(variant("cond", edit), "paths")
def glob(k):
    return [r for r in f["endpoints"][k]["produced"] if r.get("phase") == "middleware" and r.get("scope") == "all"]
assert [r.get("applies") for r in glob("endpoint:GET /healthz")] == [False], glob("endpoint:GET /healthz")
assert [r.get("applies") for r in glob("endpoint:GET /people/list")] == [True], glob("endpoint:GET /people/list")
u = glob("endpoint:GET /users/{uid}")
assert [r.get("applies") for r in u] == [None] and u[0]["when_for_path"] == "not path in EXEMPT", u
assert list(f["conditions"]) == ["middleware/gate.py::Gate: not (path in EXEMPT)"], list(f["conditions"])
PY

py "S3.P10 · options are honoured: expand_branches all and none; an exempt_rows form that is not built refuses" <<'PY'
import _a3_forms as F
F.OPTIONS["expand_branches"] = "all"
s = build(A, "paths")["endpoints"]["endpoint:POST /orders/settle"]
assert [b["why"] for b in s["branches"] if b["call"] == "label"] == [["expand_branches: all"]] * 2, s["branches"]
F.OPTIONS["expand_branches"] = "none"
s = build(A, "paths")["endpoints"]["endpoint:POST /orders/settle"]
assert "branches" not in s and {c["call"]: c["reason"] for c in s["collapsed"]}["settle"] == "expand_branches: none", s
F.OPTIONS["expand_branches"], F.OPTIONS["exempt_rows"] = "deciding", "drop"
p = build(A, "paths")["arms"]["paths"]
assert p["parts"]["conditions"]["present"] is False and "exempt_rows 'drop' is not built" in p["parts"]["conditions"]["reason"], p["parts"]
PY

py "S3.P11 · a needed-only arm: the parts that ran say computed in memory, a part not built keeps its own reason" <<'PY'
import _a3_forms_paths as FPm
B.RUNNERS["effects"] = lambda forms, ctx: {}
FPm.run.parts = ("returns", "conditions", "framework")     # a paths part no runner builds, so its own reason must survive
p = build(A, "effects")["arms"]["paths"]
assert p["reason"] == "switched off — computed in memory for effects" and p["parts"]["returns"]["reason"] == p["reason"], p
assert p["parts"]["paths"]["reason"] == "not built yet (slice 5)", p["parts"]
PY

cat > "$T/switches_fixture.py" <<'PYF'
PORTS = '''from typing import Protocol

from config import Settings


class BadToken(Exception):
    pass


class Verifier(Protocol):
    def verify(self, token: str) -> str: ...


class RealVerifier:
    def verify(self, token: str) -> str:
        if not token:
            raise BadToken("empty")
        return token


class MockVerifier:
    def verify(self, token: str) -> str:
        if token == "bad":
            raise BadToken("bad")
        return "mock"


def get_verifier(settings: Settings) -> Verifier:
    if settings.real_auth:
        return RealVerifier()
    return MockVerifier()


def check(token: str, verifier: Verifier) -> str:
    return verifier.verify(token)
'''
DEPS = '''from fastapi import Depends, HTTPException

from config import Settings, get_settings
from ports import BadToken, Verifier, check, get_verifier


def _verifier(settings: Settings = Depends(get_settings)) -> Verifier:
    return get_verifier(settings)


def get_user(token: str = "", verifier: Verifier = Depends(_verifier)) -> str:
    try:
        return check(token, verifier)
    except BadToken as exc:
        raise HTTPException(status_code=401, detail="bad token") from exc
'''
CREDITS = '''from config import Settings


def allowance_for(tier: str, settings: Settings) -> int:
    if tier == "chef":
        return settings.credits_chef
    return settings.credits_free


def summary(tier: str, settings: Settings) -> int:
    return allowance_for(tier, settings)


def block(tier: str, settings: Settings) -> int:
    return summary(tier, settings)
'''
ME = '''from fastapi import APIRouter, Depends, HTTPException

from config import Settings, get_settings
from deps import _verifier, get_user
from ports import Verifier, check
from services.credits import block

router = APIRouter(prefix="/me")


@router.get("/credits")
def credits(user: str = Depends(get_user), settings: Settings = Depends(get_settings)):
    total = block("free", settings)
    if total < 0:
        raise HTTPException(status_code=409, detail="negative allowance")
    return {"allowance": total}


@router.get("/direct")
def direct(token: str = "", verifier: Verifier = Depends(_verifier)):
    return {"who": check(token, verifier)}
'''


def edit_sw(d):
    (d / "ports.py").write_text(PORTS)
    (d / "deps.py").write_text(DEPS)
    (d / "services/credits.py").write_text(CREDITS)
    (d / "api/me.py").write_text(ME)
    p = d / "config.py"
    s = p.read_text()
    assert s.count("    limit_enabled: bool = False\n") == 1
    p.write_text(s.replace("    limit_enabled: bool = False\n", "    limit_enabled: bool = False\n    real_auth: bool = False\n    credits_chef: int = 15\n    credits_free: int = 0\n"))
PYF

py "S5.P8 · binding switch: one per function and port, preds equal _a3_stacks_pydi, placed on the dependency scope; agreeing branches prove the translated 401, a branch that escapes differently changes the exit" <<'PY'
import sys; sys.path.insert(0, str(T))
import _a3_stacks_pydi as PYDI
from switches_fixture import edit_sw
d = variant("sw", edit_sw)
f = build(d, "switches")
e = f["endpoints"]["endpoint:GET /me/credits"]
b = [s for s in e["switches"] if s["kind"] == "binding"]
assert len(b) == 1, e["switches"]
b = b[0]
assert (b["scope"], b["fn"], b["port"], b["factories"]) == ("dependency", "ports.py::check", "Verifier", ["ports.py::get_verifier"]), b
pyd = sorted((x["impl"], x["predicate"]) for x in PYDI.parse(d)["edges"] if x["via"] == "binding")
assert sorted((x["impl"], x["pred"]) for x in b["branches"]) == pyd == [("MockVerifier", "not (settings.real_auth)"), ("RealVerifier", "settings.real_auth")], (b["branches"], pyd)
row = next(r for r in e["produced"] if r.get("status") == 401 and r.get("detail") == "bad token")
assert b["changes_exit"] is False and b["proves"] == [row["id"]], (b, row)
assert b["site"].startswith("ports.py:") and b["anchor"].startswith("deps.py:") and re.fullmatch(r"sw:[0-9a-f]{10}", b["id"]), b
assert f["arms"]["switches"]["stats"]["binding"] == 1 and f["arms"]["switches"]["stats"]["binds_unplaced"] == 0, f["arms"]["switches"]["stats"]
dr = [s for s in f["endpoints"]["endpoint:GET /me/direct"]["switches"] if s["kind"] == "binding"]
assert [(s["id"], s["scope"]) for s in dr] == [(b["id"], "call")] and dr[0]["anchor"].startswith("api/me.py:") and "proves" not in dr[0], dr
def differs(d):
    edit_sw(d)
    patch(d, "ports.py", '            raise BadToken("bad")', '            raise ValueError("bad")')
g = build(variant("sw-differs", differs), "switches")
b2 = next(s for s in g["endpoints"]["endpoint:GET /me/credits"]["switches"] if s["kind"] == "binding")
assert b2["changes_exit"] is True and "proves" not in b2, b2
PY

py "S5.P20 · FIRE: switches read names their functions import in their OWN body — a branch's error class imported inside it keeps its base (the except of the base translates it); a settings factory called inside a function is a settings choice" <<'PY'
import sys; sys.path.insert(0, str(T))
from switches_fixture import edit_sw
def local(d):
    edit_sw(d)
    (d / "revoked.py").write_text("from ports import BadToken\n\n\nclass Revoked(BadToken):\n    pass\n")
    patch(d, "ports.py", '        if token == "bad":\n            raise BadToken("bad")', '        from revoked import Revoked\n        if token == "bad":\n            raise Revoked("bad")')
    patch(d, "services/credits.py", "    if tier == \"chef\":\n        return settings.credits_chef\n",
          "    from config import get_settings as gs2\n    if tier == \"chef\":\n        return gs2().credits_chef\n")
f = build(variant("sw-local", local), "switches")
e = f["endpoints"]["endpoint:GET /me/credits"]
b = next(s for s in e["switches"] if s["kind"] == "binding")
ends = {x["impl"]: x.get("ends") for x in b["branches"]}
assert [x.split(" → ")[1].split(" ")[0] for x in ends["MockVerifier"]] == ["translate"] and ends["MockVerifier"][0].startswith("Revoked → translate deps.py:") \
    and ends["MockVerifier"][0].split(" ")[-1] == ends["RealVerifier"][0].split(" ")[-1], ends     # both caught by the same except BadToken
v = [s for s in e["switches"] if s["kind"] == "value"]
assert [(x.get("setting"), x["pred"]) for x in v[0]["branches"]] == [("credits_chef", "tier == 'chef'"), ("credits_free", "not (tier == 'chef')")], v
PY

py "S5.P9 · value switch: a settings choice three calls down is placed with its chain; one past reach_depth is only counted" <<'PY'
import sys; sys.path.insert(0, str(T))
from switches_fixture import edit_sw
f = build(variant("sw", edit_sw), "switches")
v = [s for s in f["endpoints"]["endpoint:GET /me/credits"]["switches"] if s["kind"] == "value"]
assert [(s["fn"], s["depth"], s["scope"], s["on"]) for s in v] == [("services/credits.py::allowance_for", 3, "call", "success")], v
assert [(b.get("setting"), b["pred"]) for b in v[0]["branches"]] == [("credits_chef", "tier == 'chef'"), ("credits_free", "not (tier == 'chef')")], v[0]["branches"]
assert v[0]["chain"] == ["api/me.py::credits", "services/credits.py::block", "services/credits.py::summary", "services/credits.py::allowance_for"], v[0]["chain"]
assert v[0]["anchor"].startswith("api/me.py:") and v[0]["settings"]["credits_chef"]["default"] == "15", v[0]
def deeper(d):
    edit_sw(d)
    patch(d, "services/credits.py", "def block(tier: str, settings: Settings) -> int:\n    return summary(tier, settings)\n",
          "def block(tier: str, settings: Settings) -> int:\n    return summary(tier, settings)\n\n\ndef outer1(tier: str, settings: Settings) -> int:\n    return block(tier, settings)\n\n\ndef outer2(tier: str, settings: Settings) -> int:\n    return outer1(tier, settings)\n")
    patch(d, "api/me.py", "from services.credits import block", "from services.credits import outer2")
    patch(d, "api/me.py", 'block("free", settings)', 'outer2("free", settings)')
g = build(variant("sw-deep", deeper), "switches")
assert not [s for s in g["endpoints"]["endpoint:GET /me/credits"]["switches"] if s["kind"] == "value"], "a value switch past reach_depth was placed"
assert g["arms"]["switches"]["stats"]["switch_depth_capped"] >= 1, g["arms"]["switches"]["stats"]
PY

py "S5.P10 · SILENT: a port no Protocol declares gives no binding; a return that is neither setting nor constant, or a guard comparing two names, gives no value switch" <<'PY'
import sys; sys.path.insert(0, str(T))
from switches_fixture import edit_sw
def plain(d):
    edit_sw(d)
    patch(d, "ports.py", "class Verifier(Protocol):", "class Verifier:")
f = build(variant("sw-plain", plain), "switches")
assert not [s for s in f["endpoints"]["endpoint:GET /me/credits"].get("switches", []) if s["kind"] == "binding"], f["endpoints"]["endpoint:GET /me/credits"].get("switches")
def open_value(d):
    edit_sw(d)
    patch(d, "services/credits.py", "        return settings.credits_chef\n", "        return len(tier)\n")
g = build(variant("sw-open", open_value), "switches")
assert not [s for s in g["endpoints"]["endpoint:GET /me/credits"]["switches"] if s["kind"] == "value"], "a computed return made a value switch"
def names(d):
    edit_sw(d)
    patch(d, "services/credits.py", '    if tier == "chef":\n', "    if tier == settings.premium_name:\n")
h = build(variant("sw-names", names), "switches")
assert not [s for s in h["endpoints"]["endpoint:GET /me/credits"]["switches"] if s["kind"] == "value"], "a guard comparing two names made a value switch"
PY

py "S5.F1 · flag switch: the settings a middleware condition reads, naming every row it gates on the route; a path-exempt route gets none" <<'PY'
f = build(A, "switches")
e = f["endpoints"]["endpoint:POST /orders/create"]
fl = [s for s in e["switches"] if s["kind"] == "flag"]
ids429 = sorted(r["id"] for r in e["produced"] if r.get("status") == 429)
assert len(fl) == 1 and len(ids429) == 2 and fl[0]["refs"] == ids429, (fl, ids429)
assert fl[0]["settings"] == {"limit_enabled": {"default": "False", "env": "APP_LIMIT_ENABLED"}} and fl[0]["expr"] == "settings.limit_enabled", fl[0]
assert not f["endpoints"]["endpoint:GET /healthz"].get("switches"), f["endpoints"]["endpoint:GET /healthz"].get("switches")
PY

py "S5.P12 · honest-empty and determinism: a raising switches arm leaves no switches key; two builds are byte-identical" <<'PY'
import sys; sys.path.insert(0, str(T))
import _a3_forms_switch as SW
from switches_fixture import edit_sw
d = variant("sw", edit_sw)
a, b = build(d, "switches"), build(d, "switches")
assert json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)
def boom(*x, **k):
    raise RuntimeError("switches down")
SW.scope_functions = boom
c = build(d, "switches")
assert c["arms"]["switches"]["present"] is False and "switches down" in c["arms"]["switches"]["reason"], c["arms"]["switches"]
assert not any("switches" in v for e in c["endpoints"].values() for v in (e.get("variants") or [e])), "a half-written switch reached the feed"
PY

cat > "$T/paths_fixture.py" <<'PYF'
TWO = '''def pick_a(session, x):
    if x == 1:
        session.commit()
        return "a1"
    return "a2"


def pick_b(session, y):
    if y == 1:
        session.commit()
        return "b1"
    return "b2"
'''
TWO_API = '''from fastapi import APIRouter

from services.two import pick_a, pick_b

router = APIRouter(prefix="/two")


@router.post("/both")
def both(x: int, y: int):
    a = pick_a(None, x)
    b = pick_b(None, y)
    return {"a": a, "b": b}
'''
DROP = '''class PrincipalError(Exception):
    pass


def lookup(session, key):
    return None


def drop_row(session, key):
    row = lookup(session, key)
    if row is None:
        return False
    if row.is_principal:
        raise PrincipalError()
    session.delete(row)
    return True
'''
DROP_API = '''from fastapi import APIRouter, HTTPException

from services.drop import PrincipalError, drop_row

router = APIRouter(prefix="/drop")


@router.delete("/{key}", status_code=204)
def remove(key: str, session=None):
    try:
        deleted = drop_row(session, key)
    except PrincipalError as exc:
        raise HTTPException(409, "principal") from exc
    if not deleted:
        raise HTTPException(404, "not found")
    session.commit()
'''
RELIEF = '''from fastapi import HTTPException


class NotFound(Exception):
    pass


class Quota(Exception):
    pass


def run_job(session, job_id):
    if job_id < 0:
        raise NotFound()
    if job_id == 0:
        session.commit()
        return "empty"
    session.commit()
    return "done"


def translate(exc):
    if isinstance(exc, Quota):
        raise HTTPException(429, "quota")
    raise HTTPException(502, "upstream")


def need_owner(ctx):
    if ctx is None:
        raise HTTPException(409, "owner required")
    return ctx


def pick_mode(job_id):
    if job_id > 10:
        raise RuntimeError("too big")
    if job_id == 1:
        return "a"
    return "b"


def ticks(n):
    for i in range(n):
        yield b"tick"
'''
RELIEF_API = '''from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter

from fastapi.responses import StreamingResponse

from services.relief import NotFound, need_owner, pick_mode, run_job, ticks, translate

router = APIRouter(prefix="/relief")


@router.get("/live")
def live(n: int):
    for _ in ticks(1):
        pass
    return StreamingResponse(ticks(n))


limiter = Limiter(key_func=lambda r: "k")


@router.post("/rush")
@limiter.limit("5/minute")
def rush(request: Request, job_id: int, session=None):
    outcome = run_job(session, job_id)
    return {"outcome": outcome}


@router.post("/{job_id}")
def accept(job_id: int, session=None):
    ctx = need_owner(session)
    mode = pick_mode(job_id)
    try:
        outcome = run_job(session, job_id)
    except NotFound as exc:
        raise HTTPException(404, "not found") from exc
    except Exception as exc:
        translate(exc)
        raise
    session.commit()
    return {"outcome": outcome, "mode": mode, "ctx": ctx}
'''
SPLIT_API = '''from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/split")


class Item(BaseModel):
    name: str


@router.post("/body")
def body_ep(item: Item):
    return {"name": item.name}


def get_token(token: str = Query(...)):
    if token == "bad":
        raise HTTPException(status_code=401, detail="bad token")
    return token


def get_scope(scope: str = Query(...)):
    return scope


@router.get("/me")
def me(page: int, t: str = Depends(get_token), s: str = Depends(get_scope)):
    return {"page": page}
'''
ERRORS = '''class Boom(Exception):
    pass


def helper(x):
    if x:
        raise Boom()
'''
BOOMY = '''from fastapi import APIRouter, Depends, Request

from services.errors import Boom, helper

router = APIRouter(prefix="/boomy")


def check_boom(request: Request) -> None:
    if request.headers.get("boom"):
        raise Boom()


@router.post("/direct")
def direct(x: int):
    if x:
        raise Boom()
    return {}


@router.post("/nested")
def nested(x: int):
    helper(x)
    return {}


@router.post("/argument")
def argument(x: int):
    str(helper(x))
    return {}


@router.post("/dep")
def dep(_: None = Depends(check_boom)):
    return {}
'''
MAIN_APPH = '''

from fastapi.responses import JSONResponse

from services.errors import Boom


@app.exception_handler(Boom)
async def boom_handler(request, exc):
    return JSONResponse(status_code=418, content={"detail": "boom"})
'''


def apph(d):
    (d / "services/errors.py").write_text(ERRORS)
    (d / "api/boomy.py").write_text(BOOMY)
    p = d / "main.py"
    p.write_text(p.read_text() + MAIN_APPH)


def two(d):
    (d / "services/two.py").write_text(TWO)
    (d / "api/two.py").write_text(TWO_API)


def drop(d):
    (d / "services/drop.py").write_text(DROP)
    (d / "api/drop.py").write_text(DROP_API)


def relief(d):
    (d / "services/relief.py").write_text(RELIEF)
    (d / "api/relief.py").write_text(RELIEF_API)


def split(d):
    (d / "api/split.py").write_text(SPLIT_API)


def drift(d):
    for rel in ("services/orders.py", "api/orders.py", "middleware/gate.py"):
        p = d / rel
        p.write_text("\n\n\n" + p.read_text())
PYF

py "S5.W1 · paths: one per exit in request order — the stack's gates, the handler's guards and calls, each deciding arm its own success path" <<'PY'
f = build(A, "paths")
assert f["arms"]["paths"]["parts"]["paths"]["present"] is True, f["arms"]["paths"]["parts"]
ps = f["endpoints"]["endpoint:POST /orders/settle"]["paths"]
succ = [p for p in ps if p["exit"]["kind"] == "success"]
assert [p["names"]["token"] for p in succ] == ["REPLAY", "DONE", "fall-through"] and len({p["id"] for p in succ}) == 3, [p["names"] for p in succ]
assert len({p["exit"]["id"] for p in succ}) == 1 and all(re.fullmatch(r"p:[0-9a-f]{10}", p["id"]) for p in ps), succ
done = [c["kind"] + ("+" if c.get("hit") else "-" if c.get("hit") is False else "") for c in succ[1]["chain"] if c["kind"] in ("call", "branch")]
assert done == ["call", "branch-", "branch+"], done
assert ps[-1]["exit"]["kind"] == "uncaught" and ps[-1].get("anywhere") and ps[-1]["state"] == "partial", ps[-1]
kinds = [p["exit"]["kind"] for p in f["endpoints"]["endpoint:GET /healthz"]["paths"]]
assert kinds == ["success", "uncaught"], "a path-exempt 429 got a path: " + str(kinds)
PY

py "S5.P4 · a translated refusal's chain: the stack passed, the call, the raise in the callee, the catch that translated it — in that order" <<'PY'
f = build(A, "paths")
p = next(p for p in f["endpoints"]["endpoint:POST /orders/reserve"]["paths"] if p["status"] == 409)
tail = [c["kind"] for c in p["chain"] if c["kind"] in ("call", "gate", "catch", "exit")][-4:]
assert tail == ["call", "gate", "catch", "exit"], [c["kind"] for c in p["chain"]]
hit = next(c for c in p["chain"] if c.get("hit"))
catch = next(c for c in p["chain"] if c["kind"] == "catch")
assert hit["at"].startswith("services/orders.py:") and catch["op"] == "translate" and catch["at"].startswith("api/orders.py:") and p["names"]["exception"] == "OrderError", p["chain"]
gates = [c for c in p["chain"] if c["kind"] == "gate" and not c["hit"]]
assert [c["phase"] for c in gates][:2] == ["middleware", "middleware"], gates
g2 = build(A, "switches,paths")
k2 = [c["kind"] for c in next(p for p in g2["endpoints"]["endpoint:POST /orders/reserve"]["paths"] if p["status"] == 409)["chain"]]
assert "switch" in k2 and k2.index("switch") < k2.index("gate"), "the middleware flag switch does not sit before the gates it decides: " + str(k2)
PY

py "S5.P5 · the linear rule: two deciding calls with two arms each give three success paths and one omitted combination" <<'PY'
import sys; sys.path.insert(0, str(T))
from paths_fixture import two
f = build(variant("two", two), "paths")
succ = [p for p in f["endpoints"]["endpoint:POST /two/both"]["paths"] if p["exit"]["kind"] == "success"]
chosen = sorted(tuple(sorted(c["ref"] for c in p["chain"] if c["kind"] == "branch" and c.get("hit"))) for p in succ)
assert len(succ) == 3 and len(set(chosen)) == 3 and all(len(x) == 2 for x in chosen), chosen
assert f["arms"]["paths"]["stats"]["combinations_omitted"] == 1, f["arms"]["paths"]["stats"]
PY

py "S5.P16 · FIRE+SILENT: an arm that contradicts the exit gets no path — the delete that ran cannot reach the not-deleted refusal" <<'PY'
import sys; sys.path.insert(0, str(T))
from paths_fixture import drop, two as two_
f = build(variant("drop", drop), "paths,effects")
ps = f["endpoints"]["endpoint:DELETE /drop/{key}"]["paths"]
r404 = [p for p in ps if p["status"] == 404]
succ = [p for p in ps if p["exit"]["kind"] == "success"]
assert len(r404) == 1 and len(succ) == 1, [(p["status"], p["exit"]["kind"]) for p in ps]
w404 = r404[0].get("effects") or {}
assert not any(w404.get(b) for b in ("committed", "maybe_committed", "uncommitted")), w404   # the refusal books no write
assert any((succ[0].get("effects") or {}).get(b) for b in ("committed", "maybe_committed")), succ[0].get("effects")
assert f["arms"]["paths"]["stats"]["impossible"] == 2, f["arms"]["paths"]["stats"]          # one per exit, and it SAYS so
assert "refusal-writes" not in {x["id"] for x in f.get("arm_findings", {}).get("effects", [])}, f.get("arm_findings")
two = build(variant("two", two_), "paths")                                                  # SILENT: arms nothing guards
assert two["arms"]["paths"]["stats"]["impossible"] == 0, two["arms"]["paths"]["stats"]
PY

py "S5.P17 · FIRE+SILENT: a call that raised into the except we stand in returns no arm, and the catch joins the chain" <<'PY'
import sys; sys.path.insert(0, str(T))
from paths_fixture import relief
f = build(variant("relief", relief), "paths")
ps = f["endpoints"]["endpoint:POST /relief/{job_id}"]["paths"]
def kinds(p): return [c["kind"] for c in p["chain"]]
for st in (429, 502, 404):                                                  # every refusal raised inside an except …
    got = [p for p in ps if p["status"] == st and p["phase"] == "handler"]   # the app's own 429 middleware is not this
    assert len(got) == 1, (st, [kinds(p) for p in got])                      # … gets ONE path, not one per arm
    assert "catch" in kinds(got[0]), (st, kinds(got[0]))                     # … and says which handler caught it
    assert "branch" not in kinds(got[0]), (st, kinds(got[0]))                # … and claims no arm returned
    assert kinds(got[0]).index("catch") < kinds(got[0]).index("exit"), kinds(got[0])
succ = [p for p in ps if p["exit"]["kind"] == "success"]                     # SILENT: the arms still enumerate where
assert len(succ) == 2 and all("branch" in kinds(p) for p in succ), [kinds(p) for p in succ]   # the call DID return
st = f["arms"]["paths"]["stats"]                                             # nothing is "omitted": the product and
assert st["combinations_omitted"] == 0 and st["impossible"] == 0, st         # the walk agree once the raiser is out
PY

py "S5.P18 · FIRE+SILENT: a collapsed reason says what the code does — the row-supplier says so, the raiser does not claim it changes no exit" <<'PY'
import sys; sys.path.insert(0, str(T))
from paths_fixture import relief
f = build(variant("relief", relief), "paths")
col = {c["call"]: c for c in f["endpoints"]["endpoint:POST /relief/{job_id}"]["collapsed"]}
assert col["need_owner"]["reason"] == "one return", col["need_owner"]              # one arm …
assert col["need_owner"]["contributes"] == "rows", col["need_owner"]
assert col["pick_mode"]["reason"] == "arms differ only in the value returned", col["pick_mode"]
assert "contributes" not in col["pick_mode"], col["pick_mode"]                     # SILENT: it supplies no row
assert "arms change neither exit nor commit" not in {c["reason"] for c in col.values()}, col
base = {c["call"]: c["reason"] for c in f["endpoints"]["endpoint:POST /orders/settle"]["collapsed"]}
assert base["label"] == "arms change neither exit nor commit", base                # SILENT: a callee that never raises
rush = f["endpoints"]["endpoint:POST /relief/rush"]["paths"]
p429 = [p for p in rush if p["status"] == 429 and p["phase"] == "handler"]
assert len(p429) == 1 and p429[0]["exit"]["kind"] == "refusal", [(p["status"], p["phase"]) for p in rush]     # V12: the limiter's 429 has a path …
kinds = [c["kind"] for c in p429[0]["chain"]]
assert kinds[-2:] == ["gate", "exit"] and "call" not in kinds, kinds                                               # … the gate before the body, no call ran
assert f["arms"]["paths"]["stats"]["unplaced"] == 0, f["arms"]["paths"]["stats"]
live = [(c["site"], c["reason"]) for c in f["endpoints"]["endpoint:GET /relief/live"]["collapsed"] if c["call"] == "ticks"]
assert sorted(r for _, r in live) == ["generator: runs after the response line", "no value return"], live   # V15: the same
PY

py "S5.P13 · the 422 split: a dependency's parameters answer before its body, the endpoint's own after every dependency" <<'PY'
import sys; sys.path.insert(0, str(T))
from paths_fixture import split
f = build(variant("split", split), "short,paths")
order = [(p["status"], p.get("split")) for p in f["endpoints"]["endpoint:GET /split/me"]["paths"] if p["exit"]["kind"] != "success"]
i_dep, i_401, i_own = order.index((422, "dependency-params")), order.index((401, None)), order.index((422, "own-params"))
assert i_dep < i_401 < i_own, order
dep = next(p for p in f["endpoints"]["endpoint:GET /split/me"]["paths"] if p.get("split") == "dependency-params")
own = next(p for p in f["endpoints"]["endpoint:GET /split/me"]["paths"] if p.get("split") == "own-params")
assert dep["exit"]["id"] == own["exit"]["id"] and dep["id"] != own["id"] and dep["cases"] and own["cases"] and not set(dep["cases"]) & set(own["cases"]), (dep, own)
deps = [p for p in f["endpoints"]["endpoint:GET /split/me"]["paths"] if p.get("split") == "dependency-params"]
assert len(deps) == 2 and len({p["id"] for p in deps}) == 2 and [p["dependency"] for p in deps] == ["api/split.py::get_token", "api/split.py::get_scope"], [(p["id"], p.get("dependency")) for p in deps]
bp = [p for p in f["endpoints"]["endpoint:POST /split/body"]["paths"] if p.get("split") == "body-parse"]
ids_bp = {p["exit"]["id"] for p in bp}
assert len(bp) == 2 and all(not {c.get("ref") for c in p["chain"] if c["kind"] == "gate" and c.get("hit") is False} & ids_bp for p in bp), [p["chain"] for p in bp]
later = next(p for p in f["endpoints"]["endpoint:POST /split/body"]["paths"] if p.get("split") == "own-params")
assert ids_bp <= {c.get("ref") for c in later["chain"] if c["kind"] == "gate" and c.get("hit") is False}, "a later path does not pass the body read"
PY

py "S5.P8b · a binding that agrees proves the translated 401; without a declared port the same path is partial" <<'PY'
import sys; sys.path.insert(0, str(T))
from switches_fixture import edit_sw
f = build(variant("sw", edit_sw), "switches,paths")
p = next(p for p in f["endpoints"]["endpoint:GET /me/credits"]["paths"] if p["status"] == 401)
sw = next(s for s in f["endpoints"]["endpoint:GET /me/credits"]["switches"] if s["kind"] == "binding")
assert p["proven_by"] == sw["id"] and sw["id"] in p["switches"] and p["state"] == "defined", p
def plain(d):
    edit_sw(d)
    patch(d, "ports.py", "class Verifier(Protocol):", "class Verifier:")
g = build(variant("sw-plain", plain), "switches,paths")
q = next(p for p in g["endpoints"]["endpoint:GET /me/credits"]["paths"] if p["status"] == 401)
assert "proven_by" not in q and q["state"] == "partial" and any("unverified" in u for u in q["unknown"]), q
v = [p for p in f["endpoints"]["endpoint:GET /me/credits"]["paths"] if any(c["kind"] == "switch" and c["ref"].startswith("sw:") for c in p["chain"])]
value_id = next(s["id"] for s in f["endpoints"]["endpoint:GET /me/credits"]["switches"] if s["kind"] == "value")
assert all(value_id not in p["switches"] for p in f["endpoints"]["endpoint:GET /me/credits"]["paths"] if p["exit"]["kind"] != "success"), "a value switch rode a refusal path"
PY

py "S5.P3 · path ids survive a line move; an exempt route loses its 429 path; honest-empty and determinism" <<'PY'
import sys; sys.path.insert(0, str(T))
import _a3_forms_walk as W
from paths_fixture import drift
f = build(A, "paths")
g = build(variant("drift", drift), "paths")
ids = lambda x: sorted(p["id"] for e in x["endpoints"].values() for p in e.get("paths") or [])
assert ids(f) == ids(g) and len(ids(f)) == len(set(ids(f))), "a path id moved with a blank line"
assert json.dumps(f, sort_keys=True) == json.dumps(build(A, "paths"), sort_keys=True)
def exempt(d):
    patch(d, "middleware/gate.py", 'EXEMPT = frozenset({"/healthz"})', 'EXEMPT = frozenset({"/healthz", "/orders/reserve"})')
h = build(variant("exempt", exempt), "paths")
before = [p["status"] for p in f["endpoints"]["endpoint:POST /orders/reserve"]["paths"]]
after = [p["status"] for p in h["endpoints"]["endpoint:POST /orders/reserve"]["paths"]]
assert before.count(429) == 2 and after.count(429) == 0, (before, after)   # the pass-through runs before both 429 exits
def boom(*a, **k):
    raise RuntimeError("paths down")
W.endpoint_paths = boom
x = build(A, "paths")
assert x["arms"]["paths"]["parts"]["paths"]["present"] is False and not any("paths" in e for e in x["endpoints"].values()), x["arms"]["paths"]["parts"]
assert x["arms"]["paths"]["parts"]["returns"]["present"] is True, "a failing paths part cost the returns"
PY

py "S5.P14 · a refusal an app exception handler answers gets its path: raised in the handler or a callee, closed by that handler's catch" <<'PY'
import sys; sys.path.insert(0, str(T))
from paths_fixture import apph
f = build(variant("apph", apph), "paths")
for key, raised, phase in (("endpoint:POST /boomy/direct", "api/boomy.py:", "handler"), ("endpoint:POST /boomy/nested", "services/errors.py:", "handler"),
                           ("endpoint:POST /boomy/argument", "services/errors.py:", "handler"), ("endpoint:POST /boomy/dep", "api/boomy.py:", "dependency")):
    p = next((p for p in f["endpoints"][key]["paths"] if p["status"] == 418), None)
    assert p is not None, (key, [(x["status"], x["exit"]["kind"]) for x in f["endpoints"][key]["paths"]])
    hit = next(c for c in p["chain"] if c.get("hit"))
    catch = [c for c in p["chain"] if c["kind"] == "catch"]
    assert hit["at"].startswith(raised) and catch and catch[-1]["op"] == "translate" and catch[-1]["at"].startswith("main.py:") and p["names"]["exception"] == "Boom", (key, p["chain"])
    assert p["phase"] == phase and hit["phase"] == phase, (key, p["phase"], hit)
arg = next(p for p in f["endpoints"]["endpoint:POST /boomy/argument"]["paths"] if p["status"] == 418)
assert any(c["kind"] in ("call", "collapsed") and c.get("at", "").startswith("api/boomy.py:") for c in arg["chain"]), arg["chain"]   # through the outer statement
dep = next(p for p in f["endpoints"]["endpoint:POST /boomy/dep"]["paths"] if p["status"] == 418)
assert not any(c.get("phase") == "handler" for c in dep["chain"]), dep["chain"]   # a dependency's refusal never enters the handler
assert f["arms"]["paths"]["stats"]["unplaced"] == 0, f["arms"]["paths"]["stats"]
PY

echo "forms-paths: $pass passed, $fail failed"
[ "$fail" -eq 0 ] || exit 1
