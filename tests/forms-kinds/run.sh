#!/usr/bin/env bash
# Forms kinds battery — the KINDS arm (docs/design/element-forms/amendment-1.md §A2 Slice 3 · B-mw · B-dep): the
# middleware forms (stack order, pass-through arms, exits with the endpoint rows' ids, applies_to / exempt) and the
# dependency forms (parameter order, own + inherited exits, commits one call down, teardown, applies_to), with their
# findings `indistinct-exits` and `dependency-commits`. The cases drive the real orchestrator over _a3_paths.build on a
# synthetic FastAPI tree — AST only — and edit the fixture in-test to prove each case can FAIL. Exit 0 = all pass.
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
GEN="${GEN_OVERRIDE:-$REPO/templates/center/generators}"

T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
pass=0; fail=0
ok()  { pass=$((pass+1)); }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }

A="$T/app"
mkdir -p "$A/api" "$A/middleware" "$A/docs/site/center"
printf '{}' > "$A/docs/site/center/center.config.json"
cat > "$A/uv.lock" <<'LOCK'
version = 1

[[package]]
name = "fastapi"
version = "0.136.3"
LOCK
cat > "$A/config.py" <<'PYF'
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_")

    limit_enabled: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
PYF
cat > "$A/main.py" <<'PYF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from middleware.gate import Gate
from middleware.stamp import Stamp

app = FastAPI()
app.add_middleware(Stamp)
app.add_middleware(Gate)
app.add_middleware(CORSMiddleware, allow_origins=["*"])
PYF
cat > "$A/middleware/stamp.py" <<'PYF'
from starlette.middleware.base import BaseHTTPMiddleware


class Stamp(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        return await call_next(request)
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
cat > "$A/db.py" <<'PYF'
class Session:
    def commit(self):
        return None


def get_session():
    session = Session()
    yield session
PYF
cat > "$A/auth.py" <<'PYF'
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

from db import get_session

bearer = HTTPBearer(auto_error=True)


class BadToken(Exception):
    pass


def verifier():
    return object()


def persist(token, session):
    if not token:
        raise BadToken
    session.commit()
    return token


def get_auth(session=Depends(get_session), creds=Depends(bearer), check=Depends(verifier)):
    try:
        return persist(creds, session)
    except BadToken as exc:
        raise HTTPException(status_code=401, detail="invalid token") from exc
PYF
cat > "$A/api/orders.py" <<'PYF'
from fastapi import APIRouter, Depends

from auth import get_auth

router = APIRouter(prefix="/orders")


@router.post("/create")
def create(x: int, user=Depends(get_auth)):
    return {"ok": True}
PYF
cat > "$A/api/me.py" <<'PYF'
from fastapi import APIRouter, Depends

from auth import get_auth
from config import get_settings

router = APIRouter(prefix="/me")


@router.get("/profile")
def profile(user=Depends(get_auth), cfg=Depends(get_settings)):
    return {"user": user}
PYF
cat > "$A/api/users.py" <<'PYF'
from fastapi import APIRouter

router = APIRouter(prefix="/users")


@router.get("/list")
def list_users():
    return []
PYF
cat > "$A/api/health.py" <<'PYF'
from fastapi import APIRouter

router = APIRouter()


@router.get("/healthz")
def healthz():
    return {"ok": True}
PYF

# the Slice 8 fixture: a copy of the tree above plus services, tasks and an event bus — the Slice 3 cases keep theirs
S8="$T/s8"; cp -r "$A" "$S8"
mkdir -p "$S8/services" "$S8/tasks" "$S8/events"
cat > "$S8/services/work.py" <<'PYF'
from fastapi import HTTPException


class Busy(Exception):
    pass


class Gone(Exception):
    pass


def reserve(x):
    if x > 10:
        raise Busy
    return x


def deep_a(x):
    return deep_b(x)


def deep_b(x):
    if x < 0:
        raise Gone
    if x == 0:
        raise HTTPException(status_code=410, detail="deep gone")
    return x


def record(session, x):
    try:
        with session.begin_nested():
            session.add(x)
    except Exception:
        return None


def careful(x):
    try:
        return reserve(x)
    except Exception:
        raise
PYF
cat > "$S8/services/listen.py" <<'PYF'
def on_placed(session, event):
    session.add(event)
PYF
cat > "$S8/events/types.py" <<'PYF'
class Placed:
    def __init__(self, x):
        self.x = x
PYF
cat > "$S8/events/bus.py" <<'PYF'
class EventBus:
    def __init__(self):
        self._handlers = {}
        self._failed = {}

    def register_once(self, event_type, handler):
        self._handlers.setdefault(event_type, []).append(handler)

    def publish(self, session, event):
        for handler in self._handlers.get(type(event), []):
            try:
                with session.begin_nested():
                    handler(session, event)
            except Exception:
                self._failed[handler] += 1


bus = EventBus()


def register_handlers():
    from events.types import Placed
    from services.listen import on_placed as audit_handler
    bus.register_once(Placed, audit_handler)
PYF
cat > "$S8/tasks/jobs.py" <<'PYF'
from celery import shared_task

MAX = 3


class Names:
    SWEEP = "sweep_docs"


@shared_task(name=Names.SWEEP, bind=True, max_retries=MAX, acks_late=True)
def sweep(self, doc):
    for _ in range(1):
        try:
            return doc
        except Exception as e:
            if self.request.retries >= self.max_retries:
                break
            self.retry(exc=e, countdown=5)


@shared_task(bind=True)
def spin(self, doc):
    try:
        return doc
    except Exception as e:
        self.retry(exc=e)


def kick(doc):
    sweep.delay(doc)
    spin.apply_async((doc,))
    celery_app.send_task(dynamic_name)


beat_schedule = {
    "sweep-nightly": {"task": Names.SWEEP, "schedule": 3600},
    "ghost": {"task": "no_such_task", "schedule": 60},
}
PYF
cat > "$S8/api/work.py" <<'PYF'
from fastapi import APIRouter, Depends, HTTPException

from db import get_session
from events.bus import bus
from events.types import Placed
from services.work import Busy, careful, deep_a, record, reserve

router = APIRouter(prefix="/work")


@router.post("/reserve")
def do_reserve(x: int):
    try:
        reserve(x)
    except Busy:
        raise HTTPException(status_code=409, detail="busy")
    return {"ok": True}


@router.post("/raw")
def raw(x: int):
    reserve(x)
    return {"ok": True}


@router.post("/deep")
def deep(x: int):
    deep_a(x)
    return {"ok": True}


@router.post("/record")
def rec(x: int, session=Depends(get_session)):
    record(session, x)
    careful(x)
    return {"ok": True}


@router.post("/place")
def place(x: int, session=Depends(get_session)):
    session.commit()
    bus.publish(session, Placed(x))
    session.commit()
    return {"ok": True}
PYF

# the Slice 12 fixture: a THIRD copy — state, a context variable, a counter built once, a dependency that writes and a factory
# whose closure reads, a background task, locks and caches — so C14–C29 keep their exact counts
IFX="$T/ifx"; cp -r "$A" "$IFX"
mkdir -p "$IFX/services"
cat > "$IFX/config.py" <<'PYF'
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_")

    limit_enabled: bool = False
    limit_n: int = 5


@lru_cache
def get_settings() -> Settings:
    return Settings()
PYF
cat > "$IFX/state.py" <<'PYF'
from contextvars import ContextVar

REQ = ContextVar("req", default=None)
WHO: ContextVar[str | None] = ContextVar("who", default=None)
SEEN = ContextVar("seen")


def current_seen():
    return SEEN.get()
PYF
cat > "$IFX/middleware/keys.py" <<'PYF'
from starlette.middleware.base import BaseHTTPMiddleware

from state import REQ

HDR = "x-req-key"


class KeyStamp(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        key = request.headers.get(HDR)
        request.state.req_key = key
        tok = REQ.set(key)
        try:
            return await call_next(request)
        finally:
            REQ.reset(tok)
PYF
cat > "$IFX/middleware/count.py" <<'PYF'
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from config import Settings, get_settings


class Window:
    def __init__(self, limit, seconds):
        self._limit = limit
        self._seconds = seconds
        self._hits = defaultdict(deque)

    def allow(self, key):
        return len(self._hits[key]) < self._limit


class Count(BaseHTTPMiddleware):
    def __init__(self, app, settings: Settings | None = None):
        super().__init__(app)
        s = settings or get_settings()
        self._on = s.limit_enabled
        self._win = Window(s.limit_n, 60)

    async def dispatch(self, request, call_next):
        if not self._on:
            return await call_next(request)
        key = request.headers.get("x-ip")
        if request.url.path.startswith("/flight/park"):
            if not self._win.allow(key):
                return JSONResponse(status_code=429, content={"detail": "parked too often"})
        return await call_next(request)
PYF
cat > "$IFX/deps.py" <<'PYF'
from fastapi import Request

from state import WHO


class Registry:
    pass


REGISTRY = Registry()


def mark(u):
    WHO.set(u)


def who(request: Request):
    u = request.headers.get("x-user")
    if u:
        request.state.user_id = u
    mark(u)
    return u


def need(scope):
    def _check(request: Request):
        return getattr(request.state, "user_id", None) == scope
    return _check


def plain():
    return 1


def shared():
    return REGISTRY
PYF
cat > "$IFX/services/tables.py" <<'PYF'
from functools import lru_cache


@lru_cache
def load_table():
    return (1, 2, 3)


@lru_cache
def unused_cached():
    return ()


@lru_cache
def far_table():
    return ("far",)


def table_names():
    return far_table()
PYF
cat > "$IFX/api/flight.py" <<'PYF'
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Request

from config import Settings, get_settings
from db import get_session
from deps import need, plain, shared, who
from services.tables import load_table, table_names
from state import current_seen

router = APIRouter(prefix="/flight")


class Guard:
    def lock(self, name):
        return self


guard = Guard()


def read_key(request: Request):
    return getattr(request.state, "req_key", None)


def read_far(request: Request):
    return read_key(request)


def send(key, who=None):
    return None


@router.post("/park")
def park(request: Request, tasks: BackgroundTasks, settings: Annotated[Settings, Depends(get_settings)], ctx=Depends(who),
         ok=Depends(need("a")), session=Depends(get_session), n=Depends(plain), reg=Depends(shared)):
    key = read_key(request)
    tasks.add_task(send, key, who=ctx)
    with guard.lock("k"):
        q = session.query().with_for_update()
    conn = pool.acquire()
    cfg = {"x": settings.limit_n}
    flag = cfg.get("x")
    again = get_settings()
    return {"key": key, "ok": ok, "rows": load_table(), "reg": reg, "n": n, "flag": flag, "again": again, "q": q, "conn": conn}


@router.get("/plain")
def plain_ep():
    return {}


@router.get("/deep")
def deep(request: Request, tasks: BackgroundTasks):
    return {"key": read_far(request), "seen": current_seen(), "names": table_names()}
PYF
cat > "$IFX/main.py" <<'PYF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from middleware.count import Count
from middleware.gate import Gate
from middleware.keys import KeyStamp
from middleware.stamp import Stamp

app = FastAPI()
app.add_middleware(Stamp)
app.add_middleware(Gate)
app.add_middleware(Count)
app.add_middleware(KeyStamp)
app.add_middleware(CORSMiddleware, allow_origins=["*"])


def startup(session):
    session.execute("SELECT pg_advisory_lock(7)")
PYF

# the prelude every case starts with — A · T · build(repo, arms) → forms · variant(name, edit) → repo copy. A FILE, so a case can
# run it again in a subprocess of its own (C38's PYTHONHASHSEED leg)
cat > "$T/prelude.py" <<'PYP'
import copy, json, os, re, shutil
from pathlib import Path
A, T = Path(os.environ["A"]), Path(os.environ["T"])
S8 = T / "s8"
IFX = T / "ifx"
import _a3_code as C, _a3_paths as P, _a3_forms_build as B
def build(repo, arms):
    files = sorted(str(p.relative_to(repo)) for p in (repo / "api").glob("*.py"))
    C.ENTITY_CODE = {"x": {"api": files, "services": ["services/*.py", "events/*.py", "tasks/*.py", "auth.py", "db.py"]}}
    C._TASKS = None; C._TASK_ROOTS = None; C._DISPATCH = None; C._EMAP_CACHE.clear()   # the task + dispatch maps read the claims, cached per process
    amap = {"head": "abc1234", "entities": {"x": {"endpoints": C.parse_endpoints(repo, files)}},
            "app_middleware": C.parse_app_middleware(repo, {"x": {"api": ["api/*.py"]}}),
            "task_roots": C.parse_task_roots(repo), "dispatch": C.dispatch_map(repo)}
    for ep in amap["entities"]["x"]["endpoints"]:
        ep.pop("refs", None)
    if arms is None:
        os.environ.pop("GABE_FORMS_ARMS", None)
    else:
        os.environ["GABE_FORMS_ARMS"] = arms
    return B.extend_backend(P.build(amap, repo), amap, repo, {})
def variant(name, edit):
    d = T / name
    shutil.rmtree(d, ignore_errors=True)
    shutil.copytree(A, d)
    edit(d)
    return d
def at(rel, text, nth=1, repo=None):
    repo = repo or S8
    hits = [i + 1 for i, l in enumerate((repo / rel).read_text().splitlines()) if text in l]
    return f"{rel}:{hits[nth - 1]}"
def variant8(name, edit):
    d = T / name
    shutil.rmtree(d, ignore_errors=True)
    shutil.copytree(S8, d)
    edit(d)
    return d
def variant_if(name, edit):
    d = T / name
    shutil.rmtree(d, ignore_errors=True)
    shutil.copytree(IFX, d)
    edit(d)
    return d
def flight(f, path):
    return f["endpoints"][f"endpoint:{path}"]["inflight"]
def row(rows, **where):
    hits = [r for r in rows if all(r.get(k) == v for k, v in where.items())]
    assert len(hits) == 1, (where, hits)
    return hits[0]
def patch(d, rel, a, b):
    p = d / rel
    s = p.read_text()
    assert s.count(a) == 1, (rel, a)
    p.write_text(s.replace(a, b))
PYP

py() {  # py "<name>" <<'PY' … PY  — the prelude, then the case
  local name="$1" src; src=$(cat)
  if (cd "$T" && { cat "$T/prelude.py"; printf '%s\n' "$src"; } | PYTHONPATH="$GEN" A="$A" T="$T" python3 - >"$T/py.txt" 2>&1); then ok; else bad "$name: $(tail -4 "$T/py.txt")"; fi
}

py "C14 · middleware: the stack runs in reverse registration; pass-through arms by kind; exits carry the endpoint ids, applies_to and exempt" <<'PY'
f = build(A, "kinds")
mw = f["middleware"]
assert list(mw) == ["middleware:Stamp", "middleware:Gate", "middleware:CORSMiddleware"], list(mw)
g = mw["middleware:Gate"]
assert g["order"] == {"registered": 1, "runs": 1, "of": 3} and g["outer"] == "middleware:CORSMiddleware" and g["inner"] == "middleware:Stamp", g
assert mw["middleware:CORSMiddleware"]["kind"] == "third-party" and mw["middleware:CORSMiddleware"]["order"]["runs"] == 0
kinds = [(a["kind"], a.get("values"), a.get("expr")) for a in g["pass_through"]]
assert kinds == [("flag", None, "not settings.limit_enabled"), ("exact-paths", ["/healthz"], None)], kinds
by_scope = {("all" if x["scope"] == "all" else "hot"): x for x in g["exits"]}
assert by_scope["hot"]["applies_to"] == 1 and by_scope["hot"]["exempt"] == [], by_scope["hot"]
assert by_scope["all"]["applies_to"] == 3 and by_scope["all"]["exempt"] == ["endpoint:GET /healthz"], by_scope["all"]
rows = {r["site"]: r["id"] for e in f["endpoints"].values() for r in e["produced"] if r.get("phase") == "middleware"}
assert all(x["id"] == rows[x["site"]] for x in g["exits"]) and "on_endpoints" not in json.dumps(g["exits"]), (g["exits"], rows)
parts = f["arms"]["kinds"]["parts"]
assert all(parts[p]["present"] for p in ("functions", "tasks", "handlers")), parts   # Slice 8 built them
PY

py "C14 · FIRE: swapping two registrations swaps outer and inner; dropping the exempt arm widens applies_to by one" <<'PY'
d = variant("swap", lambda d: patch(d, "main.py", "app.add_middleware(Stamp)\napp.add_middleware(Gate)\n", "app.add_middleware(Gate)\napp.add_middleware(Stamp)\n"))
g = build(d, "kinds")["middleware"]["middleware:Gate"]
assert g["order"]["registered"] == 0 and g["outer"] == "middleware:Stamp" and g["inner"] is None, g
d = variant("noexempt", lambda d: patch(d, "middleware/gate.py", "if not self._enabled or request.url.path in EXEMPT:", "if not self._enabled:"))
g = build(d, "kinds")["middleware"]["middleware:Gate"]
glob = next(x for x in g["exits"] if x["scope"] == "all")
assert glob["applies_to"] == 4 and glob["exempt"] == [] and [a["kind"] for a in g["pass_through"]] == ["flag"], (glob, g["pass_through"])
PY

py "C15 · indistinct-exits: FIRE when one builder answers both 429s; SILENT when each says its own" <<'PY'
f = build(A, "kinds")
hits = [x for x in f["arm_findings"]["kinds"] if x["id"] == "indistinct-exits"]
assert len(hits) == 1 and hits[0]["subject"] == "middleware:Gate" and len(hits[0]["sites"]) == 2, hits
assert f["arms"]["kinds"]["stats"]["findings"]["indistinct-exits"] == 1
d = variant("distinct", lambda d: patch(d, "middleware/gate.py", "            if over(request):\n                return self._throttled()\n",
    '            if over(request):\n                return JSONResponse(status_code=429, content={"detail": "slow down, hot path"})\n'))
g = build(d, "kinds")
assert not [x for x in g["arm_findings"].get("kinds", []) if x["id"] == "indistinct-exits"] if "arm_findings" in g else True, g.get("arm_findings")
assert "indistinct-exits" not in g["arms"]["kinds"]["stats"]["findings"]
PY

py "C16 · dependency forms: parameter order, own and inherited exits with ids, a commit one call down, teardown, applies_to" <<'PY'
f = build(A, "kinds")
deps = f["dependencies"]
auth = deps["auth.py::get_auth"]
assert auth["subdeps"] == ["db.py::get_session", "auth.py::bearer", "auth.py::verifier"], "parameter order, not gate-first: " + str(auth["subdeps"])
assert [(x["status"], x.get("detail")) for x in auth["exits"]] == [(401, "invalid token")] and auth["exits"][0]["id"].startswith("x:"), auth["exits"]
assert [(x["phase"], x["status"]) for x in auth["inherited_exits"]] == [("security", 401)], auth["inherited_exits"]
rows = {(r.get("at"), r["status"]): r["id"] for r in f["endpoints"]["endpoint:POST /orders/create"]["produced"]}
assert auth["exits"][0]["id"] == rows[(auth["exits"][0]["at"], 401)] and auth["inherited_exits"][0]["id"] == rows[(auth["inherited_exits"][0]["at"], 401)], (auth, rows)
src = (A / "auth.py").read_text().splitlines()
commit_ln = next(i + 1 for i, l in enumerate(src) if "session.commit()" in l)
call_ln = next(i + 1 for i, l in enumerate(src) if "return persist(" in l)
assert auth["effects"] == [{"op": "commit", "at": f"auth.py:{commit_ln}", "via": f"persist @ auth.py:{call_ln}"}], auth["effects"]
assert auth["applies_to"] == 2 and auth["teardown"] is False and deps["db.py::get_session"]["teardown"] is True, auth
assert deps["auth.py::bearer"]["kind"] == "security" and deps["auth.py::bearer"]["exits"][0]["status"] == 401, deps["auth.py::bearer"]
found = [x for x in f["arm_findings"]["kinds"] if x["id"] == "dependency-commits"]
assert [x["subject"] for x in found] == ["auth.py::get_auth"], found
assert all(deps[k]["applies_to"] == 2 for k in ("auth.py::get_auth", "auth.py::bearer", "db.py::get_session", "auth.py::verifier")), "each dependency runs on both dependent endpoints, transitively: " + str({k: v["applies_to"] for k, v in deps.items()})
assert deps["config.py::get_settings"]["subdeps"] == [] and deps["config.py::get_settings"]["applies_to"] == 1, "a decorator on a dependency is not a dependency: " + str(deps["config.py::get_settings"])
PY

py "C16 · SILENT: a dependency-free endpoint adds nothing; a dependency with no commit carries no finding" <<'PY'
d = variant("nocommit", lambda d: patch(d, "auth.py", "    session.commit()\n", ""))
f = build(d, "kinds")
assert not [x for x in (f.get("arm_findings") or {}).get("kinds", []) if x["id"] == "dependency-commits"], f.get("arm_findings")
assert f["dependencies"]["auth.py::get_auth"]["effects"] == []
def strip_deps(d):
    patch(d, "api/orders.py", "def create(x: int, user=Depends(get_auth)):", "def create(x: int):")
    patch(d, "api/me.py", "def profile(user=Depends(get_auth), cfg=Depends(get_settings)):", "def profile():")
d2 = variant("nodeps", strip_deps)
g = build(d2, "kinds")
assert g["dependencies"] == {}, g["dependencies"]
PY

py "C17 · honest: arms off writes no kinds map; paths needs the middleware stack for its paths part — kinds is computed in memory and stripped" <<'PY'
off = build(A, None)
assert not {"middleware", "dependencies", "arms"} & set(off), sorted(off)
f = build(A, "paths")
assert not {"middleware", "dependencies"} & set(f), sorted(f)
assert f["arms"]["kinds"]["reason"].startswith("switched off — computed in memory for paths") and f["arms"]["paths"]["parts"]["paths"]["present"] is True, (f["arms"]["kinds"], f["arms"]["paths"]["parts"])
PY

py "C18 · pass-through polarity: a negated prefix passes every path but its own; the kinds form and the paths rows agree endpoint by endpoint" <<'PY'
d = variant("neg", lambda d: patch(d, "middleware/gate.py", "if not self._enabled or request.url.path in EXEMPT:",
                                   'if not request.url.path.startswith(HOT) or request.method == "OPTIONS":'))
f = build(d, "kinds,paths")
g = f["middleware"]["middleware:Gate"]
assert [(a["kind"], a.get("values"), a.get("negated")) for a in g["pass_through"]] == [("prefix", ["/orders"], True), ("method", ["OPTIONS"], None)], g["pass_through"]
glob = next(x for x in g["exits"] if x["scope"] == "all")
assert glob["exempt"] == ["endpoint:GET /healthz", "endpoint:GET /me/profile", "endpoint:GET /users/list"] and glob["applies_to"] == 1, glob
rows = {k: r for k, e in f["endpoints"].items() for r in e["produced"] if r.get("id") == glob["id"]}
assert {k for k, r in rows.items() if r.get("applies") is False} == set(glob["exempt"]), ({k: r.get("applies") for k, r in rows.items()}, glob["exempt"])
PY

py "C19 · exits no endpoint carries: a scoped exit matching no route and two helper sites each mint their own id and say on_endpoints:false" <<'PY'
def edit(d):
    patch(d, "middleware/gate.py", 'HOT = ("/orders",)', 'HOT = ("/nowhere",)')
    patch(d, "middleware/gate.py", "def over(request):", 'def too_many():\n    return JSONResponse(status_code=429, content={"detail": "too many"})\n\n\ndef over(request):')
    patch(d, "middleware/gate.py", "        return await call_next(request)\n\n    def _throttled",
          '        if request.headers.get("x-a"):\n            return too_many()\n        if request.url.path.startswith(HOT):\n'
          '            return too_many()\n        return await call_next(request)\n\n    def _throttled')
f = build(variant("off", edit), "kinds")
g = f["middleware"]["middleware:Gate"]
on_eps = {r["id"] for e in f["endpoints"].values() for r in e["produced"]}
assert len({x["id"] for x in g["exits"]}) == len(g["exits"]) == 4, g["exits"]
scoped = next(x for x in g["exits"] if x["scope"] == ["/nowhere"] and not x.get("hop"))
assert scoped.get("on_endpoints") is False and scoped["id"] not in on_eps and scoped["applies_to"] == 0, scoped
helpers = sorted((x for x in g["exits"] if x.get("hop") == "helper too_many"), key=lambda x: x["site"])
assert len(helpers) == 2 and all(x.get("on_endpoints") is False and x["id"] not in on_eps and x.get("when") for x in helpers), helpers
assert [x["scope"] for x in helpers] == ["all", ["/nowhere"]] and helpers[0]["pred"].startswith("request.headers.get"), helpers
assert f["arms"]["kinds"]["stats"]["middleware_exits_off_endpoints"] == 3, f["arms"]["kinds"]["stats"]
PY

py "C20 · a security scheme under an unreadable framework version: its exit carries the endpoint row's id and unknown status" <<'PY'
d = variant("nolock", lambda d: (d / "uv.lock").unlink())
f = build(d, "kinds")
b = f["dependencies"]["auth.py::bearer"]["exits"]
rows = [r for r in f["endpoints"]["endpoint:POST /orders/create"]["produced"] if r.get("phase") == "security"]
assert len(b) == 1 and len(rows) == 1 and b[0]["id"] == rows[0]["id"] and b[0]["status"] is None and b[0]["state"] == "unknown" and "on_endpoints" not in b[0], (b, rows)
PY

py "C21 · dependencies as FastAPI calls them: Depends(Cls) reads __init__, Depends(instance) its class __call__; a commit after yield is teardown and raises no finding" <<'PY'
def edit(d):
    patch(d, "db.py", "    yield session\n", "    yield session\n    session.commit()\n")
    (d / "extras.py").write_text('''from fastapi import Depends, HTTPException

from db import get_session


class Role:
    def __init__(self, name):
        self.name = name

    def __call__(self):
        raise HTTPException(status_code=403, detail="role")


class Pager:
    def __init__(self, page: int = 1, session=Depends(get_session), missing=Depends(nowhere)):
        self.page = page

    def __call__(self):
        raise RuntimeError("never called by FastAPI")


class Audit:
    def __call__(self, session=Depends(get_session)):
        self.record(session)

    def record(self, session):
        session.commit()


audit = Audit()
''')
    patch(d, "api/users.py", "from fastapi import APIRouter\n", "from fastapi import APIRouter, Depends\n\nfrom extras import Pager, Role, audit\n")
    patch(d, "api/users.py", "def list_users():", 'def list_users(p=Depends(Pager), a=Depends(audit), r=Depends(Role("admin"))):')
f = build(variant("deps", edit), "kinds")
deps = f["dependencies"]
ro = deps["extras.py::Role"]
rows = {r["id"] for r in f["endpoints"]["endpoint:GET /users/list"]["produced"]}
assert ro["kind"] == "instance" and ro["calls"] == "extras.py::Role.__call__" and [(x["status"], x["id"] in rows) for x in ro["exits"]] == [(403, True)], ro
pg = deps["extras.py::Pager"]
assert pg["kind"] == "class" and pg["calls"] == "extras.py::Pager.__init__" and pg["escapes"] == [], pg
assert pg["subdeps"] == ["db.py::get_session", {"name": "nowhere", "resolved": False}], pg["subdeps"]
au = deps["extras.py::audit"]
assert au["kind"] == "instance" and au["calls"] == "extras.py::Audit.__call__" and au["subdeps"] == ["db.py::get_session"], au
assert [(x["op"], x["via"].split(" @ ")[0]) for x in au["effects"]] == [("commit", "Audit.record")], au["effects"]
gs = deps["db.py::get_session"]
assert gs["teardown"] is True and [x.get("when") for x in gs["effects"]] == ["teardown"], gs
hits = [x["subject"] for x in f["arm_findings"]["kinds"] if x["id"] == "dependency-commits"]
assert "db.py::get_session" not in hits and "extras.py::audit" in hits, hits
assert f["arms"]["kinds"]["stats"]["dependency_endpoint_pairs"] == sum(v.get("applies_to", 0) for v in deps.values())
PY

py "C22 · reading the stack: a guard past 160 characters and a match case keep their arms; an elif pass-through is its own test; a class registered twice or under an alias is read once, by its class; unscanned registrations are named" <<'PY'
LONG = 'request.url.path in EXEMPT or request.headers.get("x-internal-service-token-for-a-long-guard") == "a-very-long-token-value-that-pushes-the-guard-well-past-the-cap"'
def edit(d):
    patch(d, "middleware/gate.py", "if not self._enabled or request.url.path in EXEMPT:", f"if {LONG}:")
    patch(d, "middleware/stamp.py", "from starlette.middleware.base import BaseHTTPMiddleware\n",
          "from starlette.middleware.base import BaseHTTPMiddleware\nfrom starlette.responses import JSONResponse\n")
    patch(d, "middleware/stamp.py", "        return await call_next(request)\n",
          '        if request.method == "HEAD":\n            return JSONResponse(status_code=405, content={"detail": "no"})\n'
          '        elif request.url.path in ("/healthz",):\n            return await call_next(request)\n'
          '        match request.method:\n            case "OPTIONS":\n                return await call_next(request)\n'
          '        return JSONResponse(status_code=403, content={"detail": "stamped"})\n')
    patch(d, "main.py", "from middleware.gate import Gate\n", "from middleware.gate import Gate as Limiter\n")
    patch(d, "main.py", "app.add_middleware(Gate)\n", "app.add_middleware(Limiter)\n")
    patch(d, "main.py", "app = FastAPI()\n", 'app = FastAPI()\n\n\n@app.middleware("http")\nasync def stamp_header(request, call_next):\n    return await call_next(request)\n\n\n')
    (d / "wire.py").write_text("from middleware.stamp import Stamp\n\n\ndef wire(app):\n    app.add_middleware(Stamp)\n")
assert len(LONG) > 160
f = build(variant("stack", edit), "kinds,paths")
k = f["arms"]["kinds"]
assert k["parts"]["middleware"]["present"] and f["arms"]["paths"]["parts"]["conditions"]["present"], (k, f["arms"]["paths"])
g = f["middleware"]["middleware:Limiter"]
assert [a["kind"] for a in g["pass_through"]] == ["exact-paths", "expr"], g["pass_through"]
rows = {r["id"] for e in f["endpoints"].values() for r in e["produced"]}
glob = next(x for x in g["exits"] if x["scope"] == "all")
assert glob["exempt"] == ["endpoint:GET /healthz"] and all(x["id"] in rows for x in g["exits"]), g["exits"]
st = f["middleware"]["middleware:Stamp"]["variants"]
assert len(st) == 2 and all(v["order"]["basis"].startswith("file-sorted") for v in st), [v["order"] for v in st]
assert all([(a["kind"], a.get("reason")) for a in v["pass_through"]] == [("exact-paths", None), ("expr", "a match case is a pattern, not a condition")] for v in st), [v["pass_through"] for v in st]
assert all(sorted(x["status"] for x in v["exits"]) == [403, 405] for v in st), [v["exits"] for v in st]
assert next(x for x in st[0]["exits"] if x["status"] == 403)["exempt"] == ["endpoint:GET /healthz"], st[0]["exits"]
un = st[0]["order"]["unscanned"]
assert len(un) == 1 and un[0].startswith("main.py:") and un[0].endswith("@app.middleware stamp_header") and k["stats"]["unscanned_registrations"] == 1, (un, k["stats"])
PY

py "C23 · a dependency's form never depends on which endpoint reached it first: a deep chain keeps its tail" <<'PY'
def edit(d):
    (d / "depchain.py").write_text("from fastapi import Depends\n\n\ndef e_dep():\n    return 5\n\n\ndef d_dep(e=Depends(e_dep)):\n    return e\n\n\n"
                                   "def c_dep(d=Depends(d_dep)):\n    return d\n\n\ndef b_dep(c=Depends(c_dep)):\n    return c\n\n\ndef a_dep(b=Depends(b_dep)):\n    return b\n")
    (d / "api/deep.py").write_text('from fastapi import APIRouter, Depends\n\nfrom depchain import a_dep, d_dep\n\nrouter = APIRouter()\n\n\n'
                                   '@router.get("/aaa/deep")\ndef deep(x=Depends(a_dep)):\n    return {}\n\n\n@router.get("/zzz/shallow")\ndef shallow(y=Depends(d_dep)):\n    return {}\n')
deps = build(variant("chain", edit), "kinds")["dependencies"]
assert deps["depchain.py::d_dep"]["subdeps"] == ["depchain.py::e_dep"] and deps["depchain.py::e_dep"]["applies_to"] == 2, {k: (v["subdeps"], v["applies_to"]) for k, v in deps.items() if k.startswith("depchain")}
PY

py "C24 · FIRE + SILENT: a service raise joined to the endpoint that translates it and the one that leaves it to 500; a raise two calls down reads beyond one level" <<'PY'
f = build(S8, "kinds")
r = f["functions"]["services/work.py::reserve"]["raises"]
busy = next(x for x in r if x["cls"] == "Busy")
assert [(t["endpoint"], t["status"]) for t in busy["translated_by"]] == [("endpoint:POST /work/reserve", 409)], busy
assert [(u["endpoint"], u["status"]) for u in busy["untranslated_at"]] == [("endpoint:POST /work/raw", 500)] and busy["translation"] == "mixed", busy
for did, dep in f["dependencies"].items():                                        # V36: a dependency's exits carry their phase
    for x in dep.get("exits") or []:
        assert x.get("phase") in ("dependency", "security"), (did, x)   # a security-class dependency keeps its own phase
deep = next(x for x in f["functions"]["services/work.py::deep_b"]["refusals"] if x["status"] == 410)
assert deep["surfaces_on"] == [] and deep["surfaces"] == "beyond one level", deep      # V23: reached, two levels down, on no row — and it says so
for fid, fn_ in f["functions"].items():                                             # V23: `surfaces_on: []` never reads "nowhere"
    for x in fn_["refusals"]:
        assert ("surfaces" in x) == (not x["surfaces_on"]), (fid, x)
        assert x.get("surfaces") in (None, "beyond one level", "not reached by an endpoint"), (fid, x)
gone = next(x for x in f["functions"]["services/work.py::deep_b"]["raises"] if x["cls"] == "Gone")
assert gone["translation"] == "beyond one level" and not gone["translated_by"] and not gone["untranslated_at"], gone
db = {b["root"]: b for b in f["functions"]["services/work.py::deep_b"]["reached_by"]}
assert db["endpoint:POST /work/deep"]["depth"] == 2 and db["endpoint:POST /work/deep"]["root_site"] == at("api/work.py", "deep_a(x)"), db   # the site in the ROOT, not the last hop
assert any(b["root"] == "auth.py::get_auth" for b in f["functions"]["auth.py::persist"]["reached_by"]), f["functions"].get("auth.py::persist")   # a dependency function is a root
by = {b["root"]: b for b in f["functions"]["services/work.py::reserve"]["reached_by"]}
assert by["endpoint:POST /work/reserve"]["depth"] == 1 and by["endpoint:POST /work/reserve"]["root_site"] == at("api/work.py", "reserve(x)", 1), by
assert by["endpoint:POST /work/reserve"]["paths"], by["endpoint:POST /work/reserve"]
ids = [x for x in f["arm_findings"]["kinds"] if x["id"] == "untranslated-raise"]
assert [(x["fn"], x["cls"], x["endpoints"]) for x in ids] == [("services/work.py::reserve", "Busy", ["endpoint:POST /work/raw"])], ids
PY

py "C25 · FIRE + SILENT: a broad except that returns normally is swallows-broad; one that re-raises is not" <<'PY'
f = build(S8, "kinds")
rec = f["functions"]["services/work.py::record"]
assert [s["at"] for s in rec["swallows"]] == [at("services/work.py", "except Exception:", 1)] and rec["savepoints"] == [at("services/work.py", "begin_nested")], rec
assert not (f["functions"].get("services/work.py::careful") or {}).get("swallows"), f["functions"].get("services/work.py::careful")
sw = [x for x in f["arm_findings"]["kinds"] if x["id"] == "swallows-broad"]
assert [x["fn"] for x in sw] == ["services/work.py::record"], sw
PY

py "C26 · FIRE + SILENT: task forms — decorator keywords, the retry and its last-failure branch, dispatch and beat triggers; a retry with no bound is retry-unbounded" <<'PY'
f = build(S8, "kinds")
t = f["tasks"]["endpoint:TASK sweep_docs"]
assert t["decorator"]["keywords"] == {"name": "sweep_docs", "bind": True, "max_retries": 3, "acks_late": True}, t["decorator"]
assert [s["at"] for s in t["retry"]["sites"]] == [at("tasks/jobs.py", "self.retry(exc=e, countdown=5)")] and t["retry"]["max_retries"] == 3, t["retry"]
assert t["retry"]["last_failure"] == [{"at": at("tasks/jobs.py", "if self.request.retries >= self.max_retries"), "guard": "self.request.retries >= self.max_retries", "exit": "break"}], t["retry"]
assert {(x["kind"], x.get("from") or x.get("schedule")) for x in t["triggers"]} == {("dispatch", "tasks/jobs.py#kick"), ("beat", "3600")}, t["triggers"]
assert t["concurrency"] == {"acks_late": True, "locks": []}, t["concurrency"]
st = f["arms"]["kinds"]["stats"]["tasks"]
assert st["beat"] == {"entries": 2, "joined": 1, "unjoined": 1} and "dynamic_name" in st["unresolved_dispatch"], st
un = [x for x in f["arm_findings"]["kinds"] if x["id"] == "retry-unbounded"]
assert [x["task"] for x in un] == ["endpoint:TASK spin"], un
PY

py "C27 · FIRE: a handler form — publisher, bus loop isolation and catch, registration order, retries, the publisher's commits around the publish" <<'PY'
f = build(S8, "kinds")
h = f["handlers"]["services/listen.py::on_placed"]
assert h["event"] == "Placed" and h["publisher"] == {"fn": "api/work.py::place", "at": at("api/work.py", "bus.publish")}, h
assert h["bus"]["fn"] == "events/bus.py::EventBus.publish" and h["bus"]["isolation"] == {"kind": "savepoint", "at": at("events/bus.py", "begin_nested")}, h["bus"]
assert h["bus"]["catch"] == {"at": at("events/bus.py", "except Exception:"), "types": ["Exception"], "outcome": "swallow", "counter": at("events/bus.py", "+= 1")}, h["bus"]["catch"]
assert h["registration"] == [{"at": at("events/bus.py", "bus.register_once(Placed"), "call": "register_once", "order": 0, "of": 1}] and h["retries"] == 0 and h["bus"]["execution"] == "sequential", h
assert h["publisher_commits"] == {"before": [at("api/work.py", "session.commit()", 1)], "after": [at("api/work.py", "session.commit()", 2)]}, h["publisher_commits"]
assert h["dropped"] and [x["handler"] for x in f["arm_findings"]["kinds"] if x["id"] == "handler-dropped"] == ["services/listen.py::on_placed"]
PY

py "C28 · mutation: no except Busy moves the translator to untranslated_at; no bound on sweep makes it retry-unbounded; no register_once takes the handler form away" <<'PY'
g = build(variant8("nobusy", lambda d: patch(d, "api/work.py", "    try:\n        reserve(x)\n    except Busy:\n        raise HTTPException(status_code=409, detail=\"busy\")\n", "    reserve(x)\n")), "kinds")
busy = next(x for x in g["functions"]["services/work.py::reserve"]["raises"] if x["cls"] == "Busy")
assert not busy["translated_by"] and sorted(u["endpoint"] for u in busy["untranslated_at"]) == ["endpoint:POST /work/raw", "endpoint:POST /work/reserve"], busy
def unbound(d):
    patch(d, "tasks/jobs.py", "max_retries=MAX, ", "")
    patch(d, "tasks/jobs.py", "            if self.request.retries >= self.max_retries:\n                break\n", "")
h = build(variant8("unbound", unbound), "kinds")
assert sorted(x["task"] for x in h["arm_findings"]["kinds"] if x["id"] == "retry-unbounded") == ["endpoint:TASK spin", "endpoint:TASK sweep_docs"]
k = build(variant8("noreg", lambda d: patch(d, "events/bus.py", "    bus.register_once(Placed, audit_handler)\n", "    pass\n")), "kinds")
assert k["handlers"] == {} and not any(x["id"] == "handler-dropped" for x in k["arm_findings"]["kinds"]), k["handlers"]
PY

py "C29 · honest-empty + determinism + non-interference: no task or bus writes empty parts; two builds agree; the kinds parts change no endpoint row" <<'PY'
def strip(d):
    for rel in ("tasks/jobs.py", "events/bus.py", "events/types.py", "services/listen.py"):
        (d / rel).unlink()
    patch(d, "api/work.py", "from events.bus import bus\nfrom events.types import Placed\n", "")
    patch(d, "api/work.py", "    bus.publish(session, Placed(x))\n", "")
e = build(variant8("bare", strip), "kinds")
assert e["tasks"] == {} and e["handlers"] == {} and e["arms"]["kinds"]["stats"]["tasks"]["tasks"] == 0, (e["tasks"], e["handlers"])
a1, a2 = build(S8, "kinds"), build(S8, "kinds")
assert json.dumps(a1, sort_keys=True) == json.dumps(a2, sort_keys=True), "two builds differ"
kp, p = build(S8, "kinds,paths"), build(S8, "paths")
assert all(kp["endpoints"][k]["produced"] == p["endpoints"][k]["produced"] for k in p["endpoints"]), "a kinds part moved an endpoint row"
PY

py "C30 · state FIRE + SILENT + mutation: a middleware write from a header, read one call down; two calls down is not read; with the write gone the read says no-write-found and nothing is invented" <<'PY'
f = build(IFX, "kinds")
r = row(flight(f, "POST /flight/park"), kind="state", name="req_key")
want = {"kind": "state", "name": "req_key", "carrier": "request.state", "scope": "request", "set_at": at("middleware/keys.py", "request.state.req_key =", repo=IFX),
        "set_by": "middleware:KeyStamp", "set_in": "middleware", "from": {"kind": "header", "name": "x-req-key"},
        "read_at": [{"at": at("api/flight.py", 'getattr(request.state, "req_key"', repo=IFX), "fn": "api/flight.py::read_key", "in": "handler", "via": at("api/flight.py", "key = read_key(request)", repo=IFX)}],
        "reads": "found", "dies": "with the answer", "rule": "request-state"}
assert r == want, r
for path in ("GET /flight/plain", "GET /flight/deep"):                      # SILENT: the row is there, and two levels down is not read — nothing claims otherwise
    q = row(flight(f, path), kind="state", name="req_key")
    assert q["reads"] == "none in scope" and q["read_at"] == [] and q["set_at"] == want["set_at"] and "never" not in json.dumps(q), (path, q)
assert f["arms"]["kinds"]["stats"]["inflight"]["names"]["state:req_key"] == {"set_on": 7, "read_on": 1}, f["arms"]["kinds"]["stats"]["inflight"]["names"]
assert f["inflight"]["rules"]["request-state"]["dies"] == "with the answer" and f["inflight"]["rules"]["request-state"]["source"].startswith("starlette/requests.py"), f["inflight"]["rules"]
g = build(variant_if("nowrite", lambda d: patch(d, "middleware/keys.py", "        request.state.req_key = key\n", "        pass\n")), "kinds")
m = row(flight(g, "POST /flight/park"), kind="state", name="req_key")
assert (m["set_at"], m["set_by"], m["dies"], m["rule"], m["reads"]) == ("unknown", "unknown", "unknown", "no-write-found", "found") and "from" not in m, m
assert not [x for x in flight(g, "GET /flight/plain") if x["kind"] == "state"], flight(g, "GET /flight/plain")
PY

py "C31 · a dependency's conditional write, read by a factory's RETURNED closure; FIRE: moved into the factory body the read is gone — import time is not the request; Depends(Role(\"a\")) is an INSTANCE — its __call__ is walked, never counted as a factory" <<'PY'
f = build(IFX, "kinds")
r = row(flight(f, "POST /flight/park"), kind="state", name="user_id")
assert (r["set_by"], r["set_in"], r.get("set_cond"), r["set_at"]) == ("deps.py::who", "dependency", True, at("deps.py", "request.state.user_id = u", repo=IFX)), r
assert r["read_at"] == [{"at": at("deps.py", 'getattr(request.state, "user_id"', repo=IFX), "fn": "deps.py::need._check", "in": "dependency"}] and r["rule"] == "request-state", r
assert not [x for x in flight(f, "GET /flight/plain") + flight(f, "GET /flight/deep") if x["name"] == "user_id"], "an endpoint that never solves the dependency carries no row"
assert f["arms"]["kinds"]["stats"]["inflight"]["factories_unread"] == 0
def move(d):
    patch(d, "deps.py", 'def need(scope):\n    def _check(request: Request):\n        return getattr(request.state, "user_id", None) == scope\n',
          'def need(scope):\n    found = getattr(request.state, "user_id", None)\n\n    def _check(request: Request):\n        return found == scope\n')
m = row(flight(build(variant_if("factory", move), "kinds"), "POST /flight/park"), kind="state", name="user_id")
assert m["reads"] == "none in scope" and m["read_at"] == [] and m["rule"] == "request-state", m
def role(d):                                                             # a CALLED dependency that is a class instance: FastAPI calls __call__, no closure is looked for
    patch(d, "deps.py", "def plain():", 'class Role:\n    def __init__(self, name):\n        self.name = name\n\n    def __call__(self, request: Request):\n        return getattr(request.state, "user_id", None) == self.name\n\n\ndef plain():')
    patch(d, "api/flight.py", "from deps import need, plain, shared, who\n", "from deps import Role, need, plain, shared, who\n")
    patch(d, "api/flight.py", "reg=Depends(shared)):", 'reg=Depends(shared), role=Depends(Role("admin"))):')
d = variant_if("role", role)
g = build(d, "kinds")
assert g["arms"]["kinds"]["stats"]["inflight"]["factories_unread"] == 0, g["arms"]["kinds"]["stats"]["inflight"]
assert {"at": at("deps.py", 'getattr(request.state, "user_id"', 2, repo=d), "fn": "deps.py::Role.__call__", "in": "dependency"} in row(flight(g, "POST /flight/park"), kind="state", name="user_id")["read_at"], row(flight(g, "POST /flight/park"), kind="state", name="user_id")["read_at"]
PY

py "C32 · contextvar: a reset in a finally goes with the answer; a set one call down with no reset says unknown; a get with no set says so; .get on a module-level dict is no context variable; FIRE: no finally, no reset" <<'PY'
f = build(IFX, "kinds")
park = flight(f, "POST /flight/park")
req = row(park, kind="contextvar", name="REQ")
assert (req["dies"], req["rule"], req["reset_at"], req["var"], req["label"]) == ("with the answer", "cv-reset", at("middleware/keys.py", "REQ.reset(tok)", repo=IFX), "state.py::REQ", "req") and "from" not in req, req
who = row(park, kind="contextvar", name="WHO")
assert (who["dies"], who["rule"], who["set_fn"], who["set_via"], who["set_at"]) == ("unknown", "cv-no-reset", "deps.py::mark", at("deps.py", "    mark(u)", repo=IFX), at("deps.py", "WHO.set(u)", repo=IFX)), who
assert "leak" not in json.dumps(f["inflight"]["rules"]["cv-no-reset"]), "a set with no reset never says it leaks"
seen = row(flight(f, "GET /flight/deep"), kind="contextvar", name="SEEN")
assert (seen["scope"], seen["set_at"], seen["rule"], seen["dies"]) == ("unknown", "unknown", "cv-get-only", "unknown") and seen["read_at"][0]["via"] == at("api/flight.py", "current_seen()", repo=IFX), seen
assert [x["name"] for x in park if x["kind"] == "contextvar"] == ["REQ", "WHO"], "park meets two context variables, no more: " + str([x["name"] for x in park if x["kind"] == "contextvar"])
def lookup(d):                                                           # a module-level object that RESOLVES and has .get — a registry, not a ContextVar(...)
    patch(d, "state.py", 'SEEN = ContextVar("seen")\n', 'SEEN = ContextVar("seen")\nLOOKUP = dict()\n')
    patch(d, "api/flight.py", "from state import current_seen\n", "from state import LOOKUP, current_seen\n")
    patch(d, "api/flight.py", "def plain_ep():\n    return {}\n", 'def plain_ep():\n    return {"x": LOOKUP.get("x")}\n')
lk = [x["name"] for x in flight(build(variant_if("lookup", lookup), "kinds"), "GET /flight/plain") if x["kind"] == "contextvar"]
assert lk == ["REQ"], "LOOKUP.get('x') resolves to dict(), never to ContextVar(...): " + str(lk)
g = build(variant_if("noreset", lambda d: patch(d, "middleware/keys.py", "        try:\n            return await call_next(request)\n        finally:\n            REQ.reset(tok)\n", "        return await call_next(request)\n")), "kinds")
m = row(flight(g, "POST /flight/park"), kind="contextvar", name="REQ")
assert (m["rule"], m["dies"]) == ("cv-no-reset", "unknown") and "reset_at" not in m, m
PY

py "C33 · built-once + setting-once: the counter a middleware builds in __init__, what it holds, the prefixes its read sits under, the setting handed to it — by position or by keyword; a required setting says unknown; the INNERMOST path guard names the scope; FIRE: built inside dispatch it is per request — no row" <<'PY'
f = build(IFX, "kinds")
proc = f["inflight"]["process"]
win = proc["built-once:middleware/count.py::Count._win"]
assert (win["class"], win["rule"], win["dies"], win["owner"], win["applies_to"]) == ("Window", "middleware-init", "with the server process", "middleware:Count", 1), win
assert win["holds"] == [{"attr": "_hits", "as": "defaultdict", "at": at("middleware/count.py", "self._hits =", repo=IFX)}] and win["class_at"] == at("middleware/count.py", "class Window", repo=IFX), win
assert win["read_at"][0]["scope"] == ["/flight/park"] and win["read_at"][0]["call"] == "self._win.allow(key)" and win["read_at"][0]["key"] == "request.headers.get('x-ip')", win["read_at"]
n = proc["setting-once:middleware/count.py::Count.limit_n"]
assert (n["value"], n["state"], n["env"], n["setting"], n["applies_to"]) == (5, "default", "APP_LIMIT_N", "limit_n", 1) and n["declared_at"] == at("config.py", "limit_n: int", repo=IFX), n
assert [{k: h[k] for k in ("attr", "param")} for h in n["hands_to"]] == [{"attr": "_win", "param": "limit"}], n["hands_to"]
assert proc["setting-once:middleware/count.py::Count.limit_enabled"]["applies_to"] == len(f["endpoints"]) == 7, proc["setting-once:middleware/count.py::Count.limit_enabled"]
ref = row(flight(f, "POST /flight/park"), kind="built-once", name="_win")
assert ref["ref"] == "built-once:middleware/count.py::Count._win" and ref["read_at"] == [{"at": at("middleware/count.py", "self._win.allow", repo=IFX), "fn": "middleware/count.py::Count.dispatch", "in": "middleware"}], ref
assert not [x for x in flight(f, "GET /flight/plain") if x["name"] == "_win"], "an endpoint outside the prefix never meets the counter"
assert not [k for k in proc if "Stamp" in k or "CORS" in k or "KeyStamp" in k], "a class with no __init__ and a third-party class add nothing: " + str(sorted(proc))
def local(d):
    patch(d, "middleware/count.py", "        self._win = Window(s.limit_n, 60)\n", "")
    patch(d, "middleware/count.py", "            if not self._win.allow(key):\n", "            win = Window(5, 60)\n            if not win.allow(key):\n")
g = build(variant_if("local", local), "kinds")
assert not [k for k in g["inflight"]["process"] if k.startswith("built-once:")] and g["arms"]["kinds"]["stats"]["inflight"]["by_kind"]["built-once"] == 0, sorted(g["inflight"]["process"])
def shapes(d):                                                           # a required setting · a keyword hand-off · a held attribute that is no container
    patch(d, "config.py", "    limit_n: int = 5\n", "    limit_n: int = 5\n    limit_key: str\n")
    patch(d, "middleware/count.py", "        self._on = s.limit_enabled\n", "        self._on = s.limit_enabled\n        self._key = s.limit_key\n")
    patch(d, "middleware/count.py", "        self._win = Window(s.limit_n, 60)\n", "        self._win = Window(seconds=60, limit=s.limit_n)\n")
    patch(d, "middleware/count.py", "        self._hits = defaultdict(deque)\n", "        self._hits = defaultdict(deque)\n        self._log = make_logger()\n")
d = variant_if("shapes", shapes)
sp = build(d, "kinds")["inflight"]["process"]
k = sp["setting-once:middleware/count.py::Count.limit_key"]
assert (k["state"], k["value"], k["env"]) == ("unknown", None, "APP_LIMIT_KEY"), "a setting with no default has no value to claim: " + str(k)
assert [{x: h[x] for x in ("attr", "param")} for h in sp["setting-once:middleware/count.py::Count.limit_n"]["hands_to"]] == [{"attr": "_win", "param": "limit"}], sp["setting-once:middleware/count.py::Count.limit_n"]["hands_to"]
assert sp["built-once:middleware/count.py::Count._win"]["holds"] == [{"attr": "_hits", "as": "defaultdict", "at": at("middleware/count.py", "self._hits =", repo=d)}], "holds lists CONTAINERS — a logger is none: " + str(sp["built-once:middleware/count.py::Count._win"]["holds"])
def nested(d):
    patch(d, "middleware/count.py", '        if request.url.path.startswith("/flight/park"):\n            if not self._win.allow(key):\n                return JSONResponse(status_code=429, content={"detail": "parked too often"})\n',
          '        if request.url.path.startswith("/flight"):\n            if request.url.path.startswith("/flight/park"):\n                if not self._win.allow(key):\n                    return JSONResponse(status_code=429, content={"detail": "parked too often"})\n')
ne = build(variant_if("nested", nested), "kinds")
nw = ne["inflight"]["process"]["built-once:middleware/count.py::Count._win"]
assert nw["read_at"][0]["scope"] == ["/flight/park"] and nw["applies_to"] == 1, "two path guards, one inside the other: the inner one is the read's scope: " + str(nw)
assert not [x for x in flight(ne, "GET /flight/plain") if x["name"] == "_win"], "/flight/plain passes the outer guard only"
PY

py "C34 · background: a queued task, its arguments, after the answer, dies unknown; an unused parameter says none in scope; add_task on a parameter that is no BackgroundTasks is no queue; background=BackgroundTask(f) on a response is one; FIRE: handed on twice it is beyond one level, handed on once it is found" <<'PY'
f = build(IFX, "kinds")
r = row(flight(f, "POST /flight/park"), kind="background")
assert {k: r[k] for k in ("name", "param", "task", "args", "after_answer", "queues", "dies", "rule", "set_at")} == {"name": "send", "param": "tasks", "task": "api/flight.py::send",
    "args": ["key", "who=ctx"], "after_answer": True, "queues": "found", "dies": "unknown", "rule": "after-the-answer", "set_at": at("api/flight.py", "tasks.add_task(", repo=IFX)}, r
d = row(flight(f, "GET /flight/deep"), kind="background")
assert (d["queues"], d["name"], d["set_at"], d["dies"]) == ("none in scope", "tasks", "unknown", "unknown") and "passed_at" not in d, d
def sched(d):                                                            # SILENT, on a fixture that could say otherwise: the receiver is a parameter, its type is not BackgroundTasks
    patch(d, "api/flight.py", "def plain_ep():\n    return {}\n", 'def plain_ep(sched=None):\n    sched.add_task(send, "k")\n    return {}\n')
s_ = flight(build(variant_if("sched", sched), "kinds"), "GET /flight/plain")
assert not [x for x in s_ if x["kind"] == "background"], [x for x in s_ if x["kind"] == "background"]
def onresp(d):
    patch(d, "api/flight.py", "from state import current_seen\n", "from state import current_seen\nfrom starlette.background import BackgroundTask\nfrom starlette.responses import JSONResponse\n")
    patch(d, "api/flight.py", "def plain_ep():\n    return {}\n", 'def plain_ep():\n    return JSONResponse({}, background=BackgroundTask(send, "k"))\n')
d = variant_if("onresp", onresp)
b = row(flight(build(d, "kinds"), "GET /flight/plain"), kind="background")
assert (b["name"], b["param"], b["task"], b["args"], b["queues"], b["rule"], b["set_at"]) == ("send", None, "api/flight.py::send", ["'k'"], "found", "after-the-answer", at("api/flight.py", "background=BackgroundTask(", repo=d)), b
def twice(d):
    patch(d, "api/flight.py", "def send(key, who=None):", "def queue_it(tasks, key):\n    return queue_more(tasks, key)\n\n\ndef queue_more(tasks, key):\n    tasks.add_task(send, key)\n\n\ndef send(key, who=None):")
    patch(d, "api/flight.py", "    tasks.add_task(send, key, who=ctx)\n", "    queue_it(tasks, key)\n")
m = row(flight(build(variant_if("twice", twice), "kinds"), "POST /flight/park"), kind="background")
assert (m["queues"], m["passed_at"], m["set_at"]) == ("beyond one level", at("api/flight.py", "    queue_it(tasks, key)", repo=T / "twice"), "unknown"), m
def once(d):
    patch(d, "api/flight.py", "def send(key, who=None):", "def queue_it(tasks, key):\n    tasks.add_task(send, key)\n\n\ndef send(key, who=None):")
    patch(d, "api/flight.py", "    tasks.add_task(send, key, who=ctx)\n", "    queue_it(tasks, key)\n")
o = row(flight(build(variant_if("once", once), "kinds"), "POST /flight/park"), kind="background")
assert (o["queues"], o["set_fn"], o["param"], o["args"]) == ("found", "api/flight.py::queue_it", "tasks", ["key"]), o
PY

py "C35 · lock: a with-block goes with the answer, FOR UPDATE ends with its transaction, a pool checkout is no lock, a startup lock is never counted; an advisory lock in a station's SQL is open, its xact twin ends with the transaction; lock = … then with lock: is a with-block; FIRE: a bare call is lock-open" <<'PY'
f = build(IFX, "kinds")
locks = [x for x in flight(f, "POST /flight/park") if x["kind"] == "lock"]
assert [(x["name"], x["held"], x["rule"], x["dies"]) for x in locks] == [("guard.lock", "with-block", "lock-with-block", "with the answer"), ("with_for_update", "call", "lock-transaction", "unknown")], locks
assert locks[1]["released"] == "when its transaction ends" and not [x for x in locks if "acquire" in x["call"]], locks
assert f["arms"]["kinds"]["stats"]["inflight"]["by_kind"]["lock"] == 2, "main.py's startup advisory lock is no station: " + str(f["arms"]["kinds"]["stats"]["inflight"]["by_kind"])
def bare(d):
    patch(d, "api/flight.py", '    with guard.lock("k"):\n        q = session.query().with_for_update()\n', '    guard.lock("k")\n    q = session.query().with_for_update()\n')
m = row(flight(build(variant_if("bare", bare), "kinds"), "POST /flight/park"), kind="lock", name="guard.lock")
assert (m["held"], m["rule"], m["dies"]) == ("call", "lock-open", "unknown") and "released_at" not in m, m
def obj(d):                                                              # a lock OBJECT is no lock taken: the acquire is, and its release in a finally is seen
    patch(d, "api/flight.py", '    with guard.lock("k"):\n        q = session.query().with_for_update()\n',
          '    lock = guard.lock("k")\n    lock.acquire()\n    try:\n        q = session.query().with_for_update()\n    finally:\n        lock.release()\n')
    patch(d, "api/flight.py", "def send(key, who=None):", 'def spare():\n    return guard.lock("spare")\n\n\ndef send(key, who=None):')
    patch(d, "api/flight.py", "    cfg = {", "    kept = spare()\n    cfg = {")
o = [x for x in flight(build(variant_if("lockobj", obj), "kinds"), "POST /flight/park") if x["kind"] == "lock" and x["rule"] != "lock-transaction"]
assert [(x["name"], x["rule"], x.get("released_at")) for x in o] == [("lock.acquire", "lock-released", at("api/flight.py", "lock.release()", repo=T / "lockobj"))], o
def sql(d):                                                              # the SQL-text arm INSIDE a station: a session lock nobody releases, and the transaction one
    patch(d, "api/flight.py", "    conn = pool.acquire()\n", '    conn = pool.acquire()\n    session.execute("SELECT pg_advisory_lock(7)")\n    session.execute("SELECT pg_advisory_xact_lock(8)")\n')
q = {x["name"]: x for x in flight(build(variant_if("sqllock", sql), "kinds"), "POST /flight/park") if x["kind"] == "lock"}
assert (q["pg_advisory_lock"]["rule"], q["pg_advisory_lock"]["dies"]) == ("lock-open", "unknown") and "released" not in q["pg_advisory_lock"], q["pg_advisory_lock"]
assert (q["pg_advisory_xact_lock"]["rule"], q["pg_advisory_xact_lock"]["released"]) == ("lock-transaction", "when its transaction ends"), q["pg_advisory_xact_lock"]
w = [x for x in flight(build(variant_if("withname", lambda d: patch(d, "api/flight.py", '    with guard.lock("k"):\n', '    lock = guard.lock("k")\n    with lock:\n')), "kinds"), "POST /flight/park") if x["kind"] == "lock" and x["rule"] != "lock-transaction"]
assert [(x["name"], x["held"], x["rule"], x["dies"]) for x in w] == [("guard.lock", "with-block", "lock-with-block", "with the answer")], w
PY

py "C36 · cache: a cached function met in scope is a process row with a ref; an unreached one has none; deeper reach is counted, never listed; FIRE: no decorator, no rows" <<'PY'
f = build(IFX, "kinds")
c = f["inflight"]["process"]["cache:services/tables.py::load_table"]
assert (c["decorator"], c["maxsize"], c["applies_to"], c["rule"], c["dies"]) == ("lru_cache", "default 128", 1, "functools-cache", "with the server process"), c
ref = row(flight(f, "POST /flight/park"), kind="cache", name="load_table")
assert ref["ref"] == "cache:services/tables.py::load_table" and [x["at"] for x in ref["read_at"]] == [at("api/flight.py", "load_table()", repo=IFX)], ref
assert not [k for k in f["inflight"]["process"] if "unused_cached" in k or "far_table" in k], sorted(f["inflight"]["process"])
assert f["arms"]["kinds"]["stats"]["inflight"]["caches_deeper"] == 1, f["arms"]["kinds"]["stats"]["inflight"]
g = build(variant_if("nocache", lambda d: patch(d, "services/tables.py", "@lru_cache\ndef load_table():", "def load_table():")), "kinds")
assert "cache:services/tables.py::load_table" not in g["inflight"]["process"] and not [x for x in flight(g, "POST /flight/park") if x["kind"] == "cache"], sorted(g["inflight"]["process"])
PY

py "C37 · dependency-value: solved per request, torn down with it, a cached callee and a module-level object live with the process; an injected type is never one; a cached dependency's BODY runs once per process — nothing in it is this request's; FIRE: a return where the yield was is dep-solved" <<'PY'
f = build(IFX, "kinds")
park = flight(f, "POST /flight/park")
by = {x["param"]: x for x in park if x["kind"] == "dependency-value"}
assert sorted(by) == ["ctx", "n", "ok", "reg", "session", "settings"], "request and tasks are injected by type, never a dependency value: " + str(sorted(by))
assert (by["ctx"]["rule"], by["ctx"]["dependency"], by["ctx"]["dies"], by["ctx"]["set_at"]) == ("dep-solved", "deps.py::who", "with the answer", at("deps.py", "def who(", repo=IFX)), by["ctx"]
assert (by["session"]["rule"], by["session"]["teardown"], by["session"]["dies"]) == ("dep-teardown", True, "with the answer"), by["session"]
st = by["settings"]
assert (st["scope"], st["rule"], st["ref"], st["dies"], st["type"]) == ("process", "dep-cached", "cache:config.py::get_settings", "with the server process", "Settings"), st
assert [x["kind"] for x in park if x.get("ref") == st["ref"]] == ["dependency-value"], "a cached dependency is ONE row — the direct get_settings() call adds no second cache row"
assert f["inflight"]["process"][st["ref"]]["as_dependency"] is True
assert (by["reg"]["rule"], by["reg"]["scope"]) == ("dep-module-object", "process") and by["ok"]["set_at"] == at("deps.py", "def _check(", repo=IFX), (by["reg"], by["ok"])
m = build(variant_if("noyield", lambda d: patch(d, "db.py", "    yield session\n", "    return session\n")), "kinds")
s2 = row(flight(m, "POST /flight/park"), kind="dependency-value", param="session")
assert (s2["rule"], s2["teardown"]) == ("dep-solved", False), s2
F_ = __import__("_a3_forms")
F_.OPTIONS["inflight_dep_values"] = False                                # R3: the rows sit behind an option — off, none is written and the cache says so itself
off = build(IFX, "kinds")
F_.OPTIONS["inflight_dep_values"] = True
assert not [x for x in flight(off, "POST /flight/park") if x["kind"] == "dependency-value"] and row(flight(off, "POST /flight/park"), kind="cache", name="get_settings")
def boot(d):                                                             # a set inside the cached get_settings(): met, never walked
    patch(d, "config.py", "from functools import lru_cache\n", "from functools import lru_cache\n\nfrom state import SEEN\n")
    patch(d, "config.py", "def get_settings() -> Settings:\n", 'def get_settings() -> Settings:\n    SEEN.set("boot")\n')
bp = flight(build(variant_if("boot", boot), "kinds"), "POST /flight/park")
assert not [x for x in bp if x["name"] == "SEEN"] and row(bp, kind="dependency-value", param="settings")["rule"] == "dep-cached", [x for x in bp if x["name"] == "SEEN"]
PY

py "C38 · off · honest-empty · determinism (two builds in one process AND two processes under two hash seeds) · ONLY ADDS: no arm, no key; contract alone never pulls the part and repeat{} keeps its bytes; nothing to find writes []; the whole feed minus the part's own keys is the feed without it" <<'PY'
ALL = "kinds,short,switches,paths,effects,contract,tests"
def keys(f):
    return ("inflight" in f, [k for k, e in f["endpoints"].items() for v in (e.get("variants") or [e]) if "inflight" in v])
assert keys(build(IFX, None)) == (False, []), "arms off"
c, kc = build(IFX, "contract"), build(IFX, "kinds,contract")
assert keys(c) == (False, []) and keys(kc)[0] and len(keys(kc)[1]) == 7, (keys(c), keys(kc))
assert all(c["endpoints"][k]["repeat"] == kc["endpoints"][k]["repeat"] for k in c["endpoints"]), "repeat{} moved when the part ran"
def bare(d):
    patch(d, "main.py", "app.add_middleware(Gate)\n", "")
    patch(d, "api/orders.py", "def create(x: int, user=Depends(get_auth)):", "def create(x: int):")
    patch(d, "api/me.py", "def profile(user=Depends(get_auth), cfg=Depends(get_settings)):", "def profile():")
e = build(variant("bare12", bare), "kinds")
st = e["arms"]["kinds"]["stats"]["inflight"]
assert e["inflight"] == {"process": {}, "rules": {}} and all(v["inflight"] == [] for v in e["endpoints"].values()), e["inflight"]
assert st["rows"] == 0 and st["endpoints"] == 4 and sorted(st["by_kind"]) == sorted(["state", "contextvar", "dependency-value", "background", "lock", "cache", "built-once", "setting-once"]) and not any(st["by_kind"].values()), st
assert sorted(st["by_dies"]) == ["unknown", "with the answer", "with the server process"] and e["arms"]["kinds"]["options"] == {"inflight_scope": "one-level", "inflight_dep_values": True}, (st, e["arms"]["kinds"]["options"])
g = build(variant_if("nolock12", lambda d: (d / "uv.lock").unlink()), "kinds")           # a closed framework gate is a state, never a guess
gs = row(flight(g, "POST /flight/park"), kind="state", name="req_key")
assert (gs["scope"], gs["dies"], gs["rule"], gs["would_be"]) == ("request", "unknown", "framework-gate-closed", "request-state"), gs
assert g["arms"]["kinds"]["stats"]["inflight"]["framework_gate"].startswith("closed: fastapi unpinned <") and st["framework_gate"] == "open", g["arms"]["kinds"]["stats"]["inflight"]
assert row(flight(g, "POST /flight/park"), kind="contextvar", name="REQ")["rule"] == "cv-reset", "a rule that cites no framework stays open"
gp = flight(g, "POST /flight/park")                                       # the closed gate reaches EVERY gated rule: dependency values and the queue too
ctx, ses, cfg = (row(gp, kind="dependency-value", param=p_) for p_ in ("ctx", "session", "settings"))
assert (ctx["rule"], ctx["would_be"], ctx["dies"], ctx["scope"]) == ("framework-gate-closed", "dep-solved", "unknown", "request"), ctx
assert (ses["rule"], ses["would_be"]) == ("framework-gate-closed", "dep-teardown"), ses
assert (cfg["rule"], cfg["dies"]) == ("dep-cached", "with the server process") and "would_be" not in cfg, "functools cites no framework — its rule stays open: " + str(cfg)
bg = row(gp, kind="background")
assert (bg["rule"], bg["would_be"]) == ("framework-gate-closed", "after-the-answer"), bg
a1, a2 = build(IFX, ALL), build(IFX, ALL)
assert json.dumps(a1, sort_keys=True) == json.dumps(a2, sort_keys=True), "two builds differ"
import subprocess, sys
def many(d):                                                             # a fixture with a SET behind a list: nine more writes of one state name
    patch(d, "middleware/keys.py", "        request.state.req_key = key\n", "        request.state.req_key = key\n" + "".join(f'        request.state.req_key = "{i}"\n' for i in range(9)))
SEEDED = """
import os, sys
exec(open(os.path.join(os.environ["T"], "prelude.py")).read())
import _a3_forms_inflight as IF
if sys.argv[1] == "unsorted":
    real = IF._placed
    def leaky(*a):                                                       # the FIRE leg: also_set_at passes through a SET — its order follows the string hash
        r = real(*a)
        if "also_set_at" in r:
            r["also_set_at"] = list(set(r["also_set_at"]))
        return r
    IF._placed = leaky
out = {}
for name in sys.argv[2:]:
    f = build(T / name, "kinds")
    out[name] = {"top": f["inflight"], "stats": f["arms"]["kinds"]["stats"]["inflight"],
                 "endpoints": {k: [v.get("inflight") for v in (e.get("variants") or [e])] for k, e in f["endpoints"].items()}}
print(json.dumps(out, sort_keys=True))
"""
variant_if("many", many)
def seeded(seed, mode="real"):
    got = subprocess.run([sys.executable, "-c", SEEDED, mode, "ifx", "many"], env={**os.environ, "PYTHONHASHSEED": seed}, capture_output=True, text=True)
    assert got.returncode == 0, got.stderr[-600:]
    return got.stdout
s1, s2 = seeded("1"), seeded("2")
assert s1 == s2, "the inflight blocks differ between PYTHONHASHSEED=1 and =2 — a set's order reached the feed"
assert len(row(json.loads(s1)["many"]["endpoints"]["endpoint:POST /flight/park"][0], kind="state", name="req_key")["also_set_at"]) == 9 and json.loads(s1)["ifx"]["top"]["process"], "the seeded builds read nothing"
assert seeded("1", "unsorted") != seeded("2", "unsorted"), "the two-seed comparison cannot fail"
import _a3_forms as F, _a3_forms_inflight as IF
def strip(f):
    f = copy.deepcopy(f)
    f.pop("inflight", None)
    for e_ in f["endpoints"].values():
        for v in e_.get("variants") or [e_]:
            v.pop("inflight", None)
    k = f["arms"]["kinds"]
    k["parts"].pop("inflight", None); k["stats"].pop("inflight", None); k.pop("bytes", None)
    for o in ("inflight_scope", "inflight_dep_values"):
        k["options"].pop(o, None)
    return json.dumps(f, sort_keys=True)
stages = F.ARM_STAGES
F.ARM_STAGES = tuple(s for s in stages if s != ("kinds", ("inflight",)))
off = build(IFX, ALL)
F.ARM_STAGES = stages
assert len(F.ARM_STAGES) == len(stages) and "inflight" not in off and "inflight" not in off["arms"]["kinds"]["parts"], "the OFF leg still ran the part"
assert strip(a1) == strip(off), "the part moved something outside its own keys"
real = IF.inflight_part
def meddling(repo, forms, amap):
    forms["stats"]["rows"] += 1                                          # a part that moves a value it does not own
    return real(repo, forms, amap)
IF.inflight_part = meddling
bad = build(IFX, ALL)
IF.inflight_part = real
assert strip(bad) != strip(off), "the only-adds comparison cannot fail"
PY

py "C39 · isolation: a raise in the part costs the part only — its OWN stage; FIRE: moved into the first kinds stage the same raise takes middleware{} down" <<'PY'
import _a3_forms as F, _a3_forms_inflight as IF
real = IF.inflight_part
def boom(repo, forms, amap):
    raise RuntimeError("inflight broke")
IF.inflight_part = boom
f = build(IFX, "kinds,paths,effects,contract")
part = f["arms"]["kinds"]["parts"]["inflight"]
assert part["present"] is False and part["reason"].startswith("error: RuntimeError: inflight broke"), part
assert f["middleware"] and f["dependencies"] and "inflight" not in f and all(f["arms"][a]["present"] for a in ("kinds", "paths", "effects", "contract")), {a: f["arms"][a]["reason"] for a in f["arms"]}
assert all(f["arms"]["kinds"]["parts"][p]["present"] for p in ("middleware", "dependencies", "functions", "tasks", "handlers")), f["arms"]["kinds"]["parts"]
assert not any("inflight" in v for e in f["endpoints"].values() for v in (e.get("variants") or [e])), "a failed part left rows behind"
stages, needs = F.ARM_STAGES, F.ARM_NEEDS
F.ARM_STAGES = (("kinds", ("middleware", "dependencies", "inflight")),) + tuple(s for s in stages[1:] if s != ("kinds", ("inflight",)))
F.ARM_NEEDS = {k: v for k, v in needs.items() if k != "kinds.inflight"}
g = build(IFX, "kinds,paths,effects,contract")
F.ARM_STAGES, F.ARM_NEEDS, IF.inflight_part = stages, needs, real
assert g["arms"]["kinds"]["parts"]["middleware"]["present"] is False and "middleware" not in g and not g["arms"]["paths"]["parts"]["paths"]["present"], "sharing a stage, the raise must cost middleware{} — that is why the stage is its own: " + str(g["arms"]["kinds"]["parts"])
ok_again = build(IFX, "kinds")
assert ok_again["arms"]["kinds"]["parts"]["inflight"]["present"] is True and ok_again["arms"]["kinds"]["stats"]["inflight"]["rows"] > 0, ok_again["arms"]["kinds"]["parts"]
PY

py "C40 · request order: the rows of one endpoint run middleware by run order, then the dependencies, then the handler — a state row KeyStamp writes sits before the counter Count reads, and both before what a dependency hands over" <<'PY'
f = build(IFX, "kinds")
names = [(r["kind"], r["name"]) for r in flight(f, "POST /flight/park")]
assert names.index(("state", "req_key")) < names.index(("built-once", "_win")) < names.index(("dependency-value", "settings")), names
assert names.index(("dependency-value", "settings")) < names.index(("background", "send")) < names.index(("cache", "load_table")), names
PY

py "C41 · the exempt arm (D19): a pass-through for /healthz ABOVE a middleware's reads keeps the row and says applies false, and the process row counts one endpoint less; an arm on the read's own line exempts nothing" <<'PY'
base = build(IFX, "kinds")
key = "setting-once:middleware/count.py::Count.limit_enabled"
def early(d):
    patch(d, "middleware/count.py", "class Window:", 'EXEMPT = frozenset({"/healthz"})\n\n\nclass Window:')
    patch(d, "middleware/count.py", "        if not self._on:\n", "        if request.url.path in EXEMPT:\n            return await call_next(request)\n        if not self._on:\n")
f = build(variant_if("early", early), "kinds")
hz = flight(f, "GET /healthz")
assert row(hz, kind="setting-once", ref=key)["applies"] is False, row(hz, kind="setting-once", ref=key)
assert "applies" not in row(hz, kind="setting-once", ref="setting-once:middleware/gate.py::Gate.limit_enabled"), "Gate's arm sits on the line of its read — it proves nothing about the read"
assert "applies" not in row(flight(f, "GET /flight/plain"), kind="setting-once", ref=key), "a path the arm does not name is not exempt"
assert (base["inflight"]["process"][key]["applies_to"], f["inflight"]["process"][key]["applies_to"]) == (7, 6), (base["inflight"]["process"][key]["applies_to"], f["inflight"]["process"][key]["applies_to"])
PY

py "C42 · first write wins: two writes of one state name are ONE row — set_at the first in REQUEST order (a helper called first writes before the handler's own later line), also_set_at the rest in REQUEST order too — middleware, then dependency, then handler, whatever their files are called; inside one function by line NUMBER (99 before 100); a setting read twice in __init__ is one process row the same way" <<'PY'
def twice(d):
    patch(d, "middleware/keys.py", "        request.state.req_key = key\n", '        request.state.req_key = key\n        request.state.req_key = key or "none"\n')
    patch(d, "middleware/count.py", "        self._win = Window(s.limit_n, 60)\n", "        self._win = Window(s.limit_n, 60)\n        self._cap = s.limit_n\n")
d = variant_if("twowrites", twice)
f = build(d, "kinds")
r = row(flight(f, "POST /flight/park"), kind="state", name="req_key")
assert (r["set_at"], r["also_set_at"]) == (at("middleware/keys.py", "request.state.req_key = key", repo=d), [at("middleware/keys.py", "request.state.req_key = key", 2, repo=d)]), r
n = f["inflight"]["process"]["setting-once:middleware/count.py::Count.limit_n"]
assert (n["set_at"], n["also_set_at"]) == (at("middleware/count.py", "Window(s.limit_n", repo=d), [at("middleware/count.py", "self._cap = s.limit_n", repo=d)]), n
assert [h["attr"] for h in n["hands_to"]] == ["_win", "_cap"], n["hands_to"]
def helper(d):                                                           # request order is not line order: stamp() sits BELOW park's own write in the file's call order, above it in time
    patch(d, "api/flight.py", "def send(key, who=None):", 'def stamp(request: Request):\n    request.state.trace = "h"\n\n\ndef send(key, who=None):')
    patch(d, "api/flight.py", "    key = read_key(request)\n", '    stamp(request)\n    key = read_key(request)\n    request.state.trace = "own"\n')
d = variant_if("helperfirst", helper)
t = row(flight(build(d, "kinds"), "POST /flight/park"), kind="state", name="trace")
assert (t["set_at"], t.get("set_fn"), t["set_via"], t["also_set_at"]) == (at("api/flight.py", 'request.state.trace = "h"', repo=d), "api/flight.py::stamp", at("api/flight.py", "    stamp(request)", repo=d), [at("api/flight.py", 'request.state.trace = "own"', repo=d)]), t
e = variant_if("helpertwice", lambda x: (helper(x), patch(x, "api/flight.py", '    request.state.trace = "own"\n', '    request.state.trace = "own"\n    stamp(request)\n')))
t2 = row(flight(build(e, "kinds"), "POST /flight/park"), kind="state", name="trace")
assert (t2["set_at"], t2["also_set_at"]) == (at("api/flight.py", 'request.state.trace = "h"', repo=e), [at("api/flight.py", 'request.state.trace = "own"', repo=e)]), "the helper called AGAIN writes at the set_at site — a site is said once, never as its own 'other': " + str(t2)
def cross(d):                                                            # THREE stations, three files: "api/…" < "deps.py" < "middleware/…" by name — the request runs them the other way round
    twice(d)
    patch(d, "deps.py", "    mark(u)\n", "    request.state.req_key = u\n    mark(u)\n")
    patch(d, "api/flight.py", "    key = read_key(request)\n", '    key = read_key(request)\n    request.state.req_key = "own"\n')
d = variant_if("crossfile", cross)
x = row(flight(build(d, "kinds"), "POST /flight/park"), kind="state", name="req_key")
want = [at("middleware/keys.py", "request.state.req_key = key", 2, repo=d), at("deps.py", "request.state.req_key = u", repo=d), at("api/flight.py", 'request.state.req_key = "own"', repo=d)]
assert (x["set_at"], x["set_in"], x["also_set_at"]) == (at("middleware/keys.py", "request.state.req_key = key", repo=d), "middleware", want), x
assert want == sorted(want, reverse=True), "the fixture must put request order AGAINST file order, or the assert above pins nothing: " + str(want)
def wide(d):                                                             # writes on 2-digit AND 3-digit lines: "keys.py:100" sorts before "keys.py:12" as a STRING
    pad = "".join(f"        # {i}\n" for i in range(90))
    patch(d, "middleware/keys.py", "        request.state.req_key = key\n", '        request.state.req_key = key\n        request.state.req_key = "a"\n' + pad + "".join(f'        request.state.req_key = "{i}"\n' for i in range(7)))
    patch(d, "middleware/count.py", "        self._win = Window(s.limit_n, 60)\n", "        self._win = Window(s.limit_n, 60)\n        self._cap = s.limit_n\n" + pad + "        self._far = s.limit_n\n")
d = variant_if("widelines", wide)
f = build(d, "kinds")
also = row(flight(f, "POST /flight/park"), kind="state", name="req_key")["also_set_at"]
lines = [int(x.rpartition(":")[2]) for x in also]
assert len(also) == 8 and lines == sorted(lines) and lines[0] < 100 <= lines[1] and also != sorted(also), also
n = f["inflight"]["process"]["setting-once:middleware/count.py::Count.limit_n"]
lines = [int(x.rpartition(":")[2]) for x in n["also_set_at"]]
assert len(lines) == 2 and lines == sorted(lines) and lines[0] < 100 <= lines[1], n["also_set_at"]
PY

py "C43 · the reset must be of THE SAME variable: WHO set beside REQ, with only REQ put back in the finally, stays cv-no-reset · unknown — another variable's reset proves nothing" <<'PY'
def other(d):
    patch(d, "middleware/keys.py", "from state import REQ\n", "from state import REQ, WHO\n")
    patch(d, "middleware/keys.py", "        tok = REQ.set(key)\n", "        tok = REQ.set(key)\n        other = WHO.set(key)\n")
d = variant_if("otherset", other)
plain = flight(build(d, "kinds"), "GET /flight/plain")
who, req = row(plain, kind="contextvar", name="WHO"), row(plain, kind="contextvar", name="REQ")
assert (who["rule"], who["dies"], who["set_at"]) == ("cv-no-reset", "unknown", at("middleware/keys.py", "WHO.set(key)", repo=d)) and "reset_at" not in who, who
assert (req["rule"], req["reset_at"]) == ("cv-reset", at("middleware/keys.py", "REQ.reset(tok)", repo=d)), req
PY

py "C44 · the coverage floor is SAID: reads past the cap are counted, a function middleware no station walks is counted and named wherever it is wired from (never a test file), a factory that returns a lambda is counted, a reach cut short is counted" <<'PY'
def nine(d):
    patch(d, "api/flight.py", "    key = read_key(request)\n", "    key = read_key(request)\n" + "".join(f"    k{i} = request.state.req_key\n" for i in range(9)))
r = row(flight(build(variant_if("nine", nine), "kinds"), "POST /flight/park"), kind="state", name="req_key")
assert (len(r["read_at"]), r["reads_more"], r["reads"]) == (8, 2, "found"), r            # ten reads: one through read_key, nine in the handler
base = build(IFX, "kinds")
st0 = base["arms"]["kinds"]["stats"]["inflight"]
assert (st0["unplaced_middleware"], st0["unplaced_middleware_at"], st0["factories_unread"], st0["reach_truncated"]) == (0, [], 0, 0) and "reads_more" not in row(flight(base, "POST /flight/park"), kind="state", name="req_key"), st0
def fn_mw(d):
    patch(d, "main.py", "\n\ndef startup(session):", '\n\n@app.middleware("http")\nasync def tag(request, call_next):\n    return await call_next(request)\n\n\ndef startup(session):')
one = build(variant_if("fnmw", fn_mw), "kinds")["arms"]["kinds"]["stats"]["inflight"]
assert one["unplaced_middleware"] == 1 and one["unplaced_middleware_at"] == [at("main.py", '@app.middleware("http")', repo=T / "fnmw") + " @app.middleware tag"], one
def wired(d):                                                            # registered through a helper, in a folder no stack scan reads
    fn_mw(d)
    (d / "util").mkdir(); (d / "tests").mkdir()
    body = 'def add_trace(app):\n    @app.middleware("http")\n    async def trace(request, call_next):\n        return await call_next(request)\n'
    (d / "util" / "wiring.py").write_text(body)
    (d / "tests" / "test_wiring.py").write_text(body)
two = build(variant_if("wired", wired), "kinds")["arms"]["kinds"]["stats"]["inflight"]
assert two["unplaced_middleware"] == 2 and two["unplaced_middleware_at"] == [at("main.py", '@app.middleware("http")', repo=T / "wired") + " @app.middleware tag", "util/wiring.py:2 @app.middleware trace"], two
lam = build(variant_if("lambda", lambda d: patch(d, "deps.py", '    def _check(request: Request):\n        return getattr(request.state, "user_id", None) == scope\n    return _check\n', "    return lambda request: scope\n")), "kinds")
assert lam["arms"]["kinds"]["stats"]["inflight"]["factories_unread"] == 1 and not [x for x in flight(lam, "POST /flight/park") if x.get("param") == "ok"], lam["arms"]["kinds"]["stats"]["inflight"]
F_ = __import__("_a3_forms")
depth = F_.OPTIONS["reach_depth"]
F_.OPTIONS["reach_depth"] = 0
cut = build(IFX, "kinds")["arms"]["kinds"]["stats"]["inflight"]
F_.OPTIONS["reach_depth"] = depth
assert cut["reach_truncated"] > 0 and cut["caches_deeper"] == 0, cut
PY

py "C45 · from a header, honestly: a binding under a condition says cond, and so does a header read that is ONE ARM of the written value; a method test the endpoint's method provably fails means the header is never read there — no from; a test nobody can resolve keeps cond on every method" <<'PY'
def guarded(d):
    patch(d, "middleware/keys.py", 'HDR = "x-req-key"\n', 'HDR = "x-req-key"\nMUTATING = frozenset({"POST", "PUT"})\n')
    patch(d, "middleware/keys.py", "        key = request.headers.get(HDR)\n", "        key = None\n        if request.method in MUTATING:\n            key = request.headers.get(HDR)\n")
f = build(variant_if("guarded", guarded), "kinds")
post, get = row(flight(f, "POST /flight/park"), kind="state", name="req_key"), row(flight(f, "GET /flight/plain"), kind="state", name="req_key")
assert post["from"] == {"kind": "header", "name": "x-req-key", "cond": True} and "set_cond" not in post, post
assert "from" not in get and get["set_at"] == post["set_at"] and get["rule"] == "request-state", get
assert row(flight(build(IFX, "kinds"), "GET /flight/plain"), kind="state", name="req_key")["from"] == {"kind": "header", "name": "x-req-key"}, "an unconditional binding carries no cond"
def opaque(d):
    patch(d, "middleware/keys.py", "        key = request.headers.get(HDR)\n", "        key = None\n        if wanted(request):\n            key = request.headers.get(HDR)\n")
g = build(variant_if("opaque", opaque), "kinds")
for path in ("POST /flight/park", "GET /flight/plain"):
    assert row(flight(g, path), kind="state", name="req_key")["from"] == {"kind": "header", "name": "x-req-key", "cond": True}, path
def negated(d):                                                          # `not in` — the header is read on every method OUTSIDE the set
    guarded(d)
    patch(d, "middleware/keys.py", "        if request.method in MUTATING:\n", "        if request.method not in MUTATING:\n")
n = build(variant_if("negated", negated), "kinds")
assert "from" not in row(flight(n, "POST /flight/park"), kind="state", name="req_key") and row(flight(n, "GET /flight/plain"), kind="state", name="req_key")["from"]["cond"] is True
arm = build(variant_if("onearm", lambda d: patch(d, "middleware/keys.py", "        request.state.req_key = key\n", '        request.state.req_key = request.headers.get(HDR) or "none"\n')), "kinds")
assert row(flight(arm, "POST /flight/park"), kind="state", name="req_key")["from"] == {"kind": "header", "name": "x-req-key", "cond": True}, "`<header> or 'none'` — the header is one arm of what is written: " + str(row(flight(arm, "POST /flight/park"), kind="state", name="req_key"))
PY

py "C46 · a cached loader imported INSIDE the function that calls it is met like one imported at the top of the file: a ref row on that endpoint and one more on applies_to" <<'PY'
def local(d):
    patch(d, "api/flight.py", 'def plain_ep():\n    return {}\n', 'def plain_ep(kind: str = ""):\n    if kind:\n        from services.tables import unused_cached as table\n\n        return {"t": table()}\n    return {}\n')
d = variant_if("localimport", local)
f = build(d, "kinds")
key = "cache:services/tables.py::unused_cached"
ref = row(flight(f, "GET /flight/plain"), kind="cache", name="unused_cached")
assert ref["ref"] == key and [x["at"] for x in ref["read_at"]] == [at("api/flight.py", '"t": table()', repo=d)], ref
assert f["inflight"]["process"][key]["applies_to"] == 1 and key not in build(IFX, "kinds")["inflight"]["process"], f["inflight"]["process"].get(key)
PY

py "C47 · a ref row is SHORT: kind · name · ref and this endpoint's own reads — its scope, lifetime, rule and where it is set are said once, on the process row; a dependency-value row stays whole; no private key leaves the part; the stats still count every row" <<'PY'
f = build(IFX, "kinds")
def rows_all(f):
    return [r for e in f["endpoints"].values() for r in e["inflight"]]
park, proc = flight(f, "POST /flight/park"), f["inflight"]["process"]
short = {"kind", "name", "ref", "read_at", "reads"}
refs = [r for r in park if r.get("ref") and r["kind"] != "dependency-value"]
assert sorted(r["kind"] for r in refs) == ["built-once", "cache", "setting-once", "setting-once", "setting-once"], [(r["kind"], r["name"]) for r in refs]
assert all(set(r) == short for r in refs), [sorted(set(r) ^ short) for r in refs]
assert all({"scope", "dies", "rule", "set_at", "set_by", "set_in", "applies_to"} <= set(proc[r["ref"]]) for r in refs), "the process row says what the ref row no longer does"
dep = row(park, kind="dependency-value", param="settings")
assert {"scope", "dies", "rule", "set_at", "set_by", "set_in", "ref", "dependency", "teardown", "type"} <= set(dep), sorted(dep)
said = {"at", "fn", "in", "via", "scope", "call", "key"}                 # every key a read_at entry may carry — the part's sort key `_line` is not one
assert any(p_["read_at"] for p_ in proc.values()) and all(set(e) <= said for p_ in proc.values() for e in p_["read_at"]), [sorted(set(e) - said) for p_ in proc.values() for e in p_["read_at"]]
assert not [k for r in rows_all(f) for k in r if k.startswith("_")] and not [k for p_ in proc.values() for k in p_ if k.startswith("_")], "a private key in a row"
st = f["arms"]["kinds"]["stats"]["inflight"]
rows = rows_all(f)
assert sum(st["by_dies"].values()) == sum(st["by_rule"].values()) == sum(st["by_kind"].values()) == st["rows"] == len(rows), st
assert st["by_rule"]["middleware-init"] == sum(1 for r in rows if r["kind"] == "built-once") == 1 and st["by_rule"]["setting-at-init"] == sum(1 for r in rows if r["kind"] == "setting-once"), st["by_rule"]
assert st["by_dies"]["with the server process"] == sum(1 for r in rows if (r.get("dies") or proc[r["ref"]]["dies"]) == "with the server process"), st["by_dies"]
g = build(variant_if("nolock47", lambda d: (d / "uv.lock").unlink()), "kinds")           # a closed gate is said on the process row, and counted through it
gp = g["inflight"]["process"]["built-once:middleware/count.py::Count._win"]
assert (gp["rule"], gp["would_be"], gp["dies"]) == ("framework-gate-closed", "middleware-init", "unknown") and set(row(flight(g, "POST /flight/park"), kind="built-once")) == short, gp
assert g["arms"]["kinds"]["stats"]["inflight"]["by_rule"]["framework-gate-closed"] > st["by_rule"].get("framework-gate-closed", 0), g["arms"]["kinds"]["stats"]["inflight"]["by_rule"]
PY

py "C48 · receiver proof: <x>.state is the request only when x is proven to be one — an untyped parameter is kept and says unproven, request.app.state is the APPLICATION's and lives with the process; FIRE: typed as the Request the same read is request.state" <<'PY'
def edit(d):
    patch(d, "api/flight.py", "def send(key, who=None):", "def peek(thing):\n    return thing.state.mode\n\n\ndef send(key, who=None):")
    patch(d, "api/flight.py", "def plain_ep():\n    return {}\n", 'def plain_ep(request: Request):\n    return {"m": peek(request), "p": request.app.state.pool}\n')
d = variant_if("receivers", edit)
f = build(d, "kinds")
plain = flight(f, "GET /flight/plain")
r = row(plain, kind="state", name="mode")
assert (r["carrier"], r.get("receiver"), r["rule"], r["scope"], r["dies"]) == ("thing.state", "unproven", "receiver-unproven", "unknown", "unknown"), r
assert r["read_at"] == [{"at": at("api/flight.py", "return thing.state.mode", repo=d), "fn": "api/flight.py::peek", "in": "handler", "via": at("api/flight.py", '"m": peek(request)', repo=d)}], r["read_at"]
a = row(plain, kind="state", name="pool")
assert (a["carrier"], a["rule"], a["scope"], a["dies"], a["set_at"]) == ("app.state", "app-state", "process", "with the server process", "unknown") and "receiver" not in a, a
assert {"receiver-unproven", "app-state"} <= set(f["inflight"]["rules"]), sorted(f["inflight"]["rules"])
g = build(variant_if("receivers-typed", lambda x: (edit(x), patch(x, "api/flight.py", "def peek(thing):", "def peek(thing: Request):"))), "kinds")
m = row(flight(g, "GET /flight/plain"), kind="state", name="mode")
assert (m["carrier"], m["rule"], m["scope"]) == ("request.state", "no-write-found", "request") and "receiver" not in m, m
PY

py "C49 · a context variable imported INSIDE the function that sets or reads it is the same variable: from state import WHO in the body, import state + state.SEEN.get(); FIRE: a local name no import explains is no row" <<'PY'
def local(d):
    patch(d, "deps.py", "from state import WHO\n", "")
    patch(d, "deps.py", "def mark(u):\n    WHO.set(u)\n", "def mark(u):\n    from state import WHO\n\n    WHO.set(u)\n")
    patch(d, "api/flight.py", "def plain_ep():\n    return {}\n", 'def plain_ep():\n    import state\n\n    return {"seen": state.SEEN.get()}\n')
d = variant_if("cvlocal", local)
f = build(d, "kinds")
who = row(flight(f, "POST /flight/park"), kind="contextvar", name="WHO")
assert (who["var"], who["label"], who["rule"], who["dies"], who["set_fn"], who["set_at"]) == ("state.py::WHO", "who", "cv-no-reset", "unknown", "deps.py::mark", at("deps.py", "WHO.set(u)", repo=d)), who
seen = row(flight(f, "GET /flight/plain"), kind="contextvar", name="SEEN")
assert (seen["var"], seen["rule"], seen["read_at"][0]["at"]) == ("state.py::SEEN", "cv-get-only", at("api/flight.py", "state.SEEN.get()", repo=d)), seen
base = row(flight(build(IFX, "kinds"), "POST /flight/park"), kind="contextvar", name="WHO")
moved = ("set_at", "set_via")                                            # the edit shifts deps.py's lines — every other word of the row is the module-level import's
assert {k: v for k, v in who.items() if k not in moved} == {k: v for k, v in base.items() if k not in moved}, "the local import is the SAME row the module-level one makes: " + str((who, base))
g = build(variant_if("cvnone", lambda x: (local(x), patch(x, "deps.py", "    from state import WHO\n\n", "    WHO = registry()\n"))), "kinds")
assert not [x for x in flight(g, "POST /flight/park") if x["kind"] == "contextvar" and x["name"] == "WHO"], "a local that is no import resolves to nothing — no row"
PY

py "C50 · sub-dependencies: a dependency's own Depends() is a station of its own — what it writes is this request's, set by it; it runs BEFORE its parent (its rows sit before the parent's and before what the parent hands over); a dependency two askers name is solved ONCE — what it takes is one row, not two" <<'PY'
def sub(d):
    patch(d, "deps.py", "from fastapi import Request\n", "from fastapi import Depends, Request\n")
    patch(d, "deps.py", "def who(request: Request):", 'def base(request: Request):\n    request.state.tenant = "t"\n    return "t"\n\n\ndef who(request: Request, t=Depends(base)):')
d = variant_if("subdep", sub)
park = flight(build(d, "kinds"), "POST /flight/park")
t = row(park, kind="state", name="tenant")
assert (t["set_at"], t["set_by"], t["set_in"], t["rule"]) == (at("deps.py", "request.state.tenant =", repo=d), "deps.py::base", "dependency", "request-state"), t
names = [(r["kind"], r["name"]) for r in park]
assert names.index(("state", "tenant")) < names.index(("state", "user_id")) and names.index(("state", "tenant")) < names.index(("dependency-value", "ctx")), names
def twice(d):                                                            # park asks plain() itself AND through who — a lock row appends per site, so a second station would show
    patch(d, "deps.py", "from fastapi import Request\n", "from fastapi import Depends, Request\n")
    patch(d, "deps.py", "def plain():\n    return 1\n", 'def plain(db=None):\n    db.execute("SELECT pg_advisory_xact_lock(1)")\n    return 1\n')
    patch(d, "deps.py", "def who(request: Request):", "def who(request: Request, n=Depends(plain)):")
d = variant_if("deponce", twice)
locks = [x for x in flight(build(d, "kinds"), "POST /flight/park") if x["kind"] == "lock" and x["name"] == "pg_advisory_xact_lock"]
assert [(x["set_at"], x["set_by"]) for x in locks] == [(at("deps.py", "pg_advisory_xact_lock", repo=d), "deps.py::plain")], locks
PY

py "C51 · a dependency with nothing to walk is STILL what the handler is handed: a security scheme is set where it is built, a class with no __init__ says set_at unknown — both dep-solved, neither torn down" <<'PY'
def sec(d):
    patch(d, "deps.py", "def plain():", "class Pager:\n    pass\n\n\ndef plain():")
    patch(d, "api/flight.py", "from deps import need, plain, shared, who\n", "from auth import bearer\nfrom deps import Pager, need, plain, shared, who\n")
    patch(d, "api/flight.py", "def plain_ep():", "def plain_ep(creds=Depends(bearer), pg=Depends(Pager)):")
d = variant_if("secdep", sec)
by = {x["param"]: x for x in flight(build(d, "kinds"), "GET /flight/plain") if x["kind"] == "dependency-value"}
assert sorted(by) == ["creds", "pg"], sorted(by)
assert (by["creds"]["dependency"], by["creds"]["set_at"], by["creds"]["rule"], by["creds"]["teardown"]) == ("auth.py::bearer", at("auth.py", "bearer = HTTPBearer", repo=d), "dep-solved", False), by["creds"]
assert (by["pg"]["dependency"], by["pg"]["set_at"], by["pg"]["rule"], by["pg"]["teardown"]) == ("deps.py::Pager", "unknown", "dep-solved", False), by["pg"]
PY

py "C52 · set_cond one call down: a write in a helper says set_cond when the CALL sits under a condition; SILENT: the same helper called outright carries none" <<'PY'
def cond(d):
    patch(d, "api/flight.py", "def send(key, who=None):", 'def stamp(request: Request):\n    request.state.trace = "h"\n\n\ndef send(key, who=None):')
    patch(d, "api/flight.py", "    key = read_key(request)\n", "    key = read_key(request)\n    if key:\n        stamp(request)\n")
d = variant_if("condhelper", cond)
t = row(flight(build(d, "kinds"), "POST /flight/park"), kind="state", name="trace")
assert (t.get("set_cond"), t["set_fn"], t["set_via"]) == (True, "api/flight.py::stamp", at("api/flight.py", "        stamp(request)", repo=d)), t
e = variant_if("plainhelper", lambda x: (cond(x), patch(x, "api/flight.py", "    if key:\n        stamp(request)\n", "    stamp(request)\n")))
assert "set_cond" not in row(flight(build(e, "kinds"), "POST /flight/park"), kind="state", name="trace"), "an unconditional call of an unconditional write carries no set_cond"
PY

py "C53 · a cached function is MET at the call, never walked: its read entry is the caller's own line and function — no via — on the endpoint's ref row and on the process row alike" <<'PY'
f = build(IFX, "kinds")
want = [{"at": at("api/flight.py", "load_table()", repo=IFX), "fn": "api/flight.py::park", "in": "handler"}]
assert row(flight(f, "POST /flight/park"), kind="cache", name="load_table")["read_at"] == want, row(flight(f, "POST /flight/park"), kind="cache", name="load_table")
assert f["inflight"]["process"]["cache:services/tables.py::load_table"]["read_at"] == want, f["inflight"]["process"]["cache:services/tables.py::load_table"]["read_at"]
PY

py "C54 · a context variable set from a request.state read says where its value came from" <<'PY'
def cvf(d):
    patch(d, "api/flight.py", "from state import current_seen\n", "from state import SEEN, current_seen\n")
    patch(d, "api/flight.py", "    key = read_key(request)\n", "    key = read_key(request)\n    SEEN.set(request.state.req_key)\n")
s = row(flight(build(variant_if("cvfrom", cvf), "kinds"), "POST /flight/park"), kind="contextvar", name="SEEN")
assert s["from"] == {"kind": "state", "name": "req_key"} and s["rule"] == "cv-no-reset", s
PY

py "C55 · structlog binders, one row per NAME: a bind cleared in a finally goes with the answer; bound as a with is scoped; ONE bind call of two names with an unbind of one of them in the finally — the named one is reset, the other proves nothing" <<'PY'
def sl(d):
    patch(d, "middleware/keys.py", "from state import REQ\n", "from structlog.contextvars import bind_contextvars, clear_contextvars\n\nfrom state import REQ\n")
    patch(d, "middleware/keys.py", "        tok = REQ.set(key)\n", "        tok = REQ.set(key)\n        bind_contextvars(req_key=key)\n")
    patch(d, "middleware/keys.py", "            REQ.reset(tok)\n", "            REQ.reset(tok)\n            clear_contextvars()\n")
    patch(d, "api/flight.py", "from state import current_seen\n", "from state import current_seen\nfrom structlog.contextvars import bind_contextvars, bound_contextvars, unbind_contextvars\n")
    patch(d, "api/flight.py", "def plain_ep():\n    return {}\n", 'def plain_ep():\n    bind_contextvars(job="j", step="s")\n    try:\n        with bound_contextvars(span="p"):\n            return {}\n    finally:\n        unbind_contextvars("job")\n')
d = variant_if("structlog", sl)
f = build(d, "kinds")
by = {r["name"]: r for r in flight(f, "GET /flight/plain") if r.get("through") == "structlog"}
assert sorted(by) == ["job", "req_key", "span", "step"], sorted(by)
assert (by["req_key"]["rule"], by["req_key"]["reset_at"], by["req_key"]["dies"], by["req_key"]["set_in"]) == ("cv-reset", at("middleware/keys.py", "clear_contextvars()", repo=d), "with the answer", "middleware"), by["req_key"]
assert (by["span"]["rule"], by["span"]["dies"], by["span"]["set_at"]) == ("cv-scoped", "with the answer", at("api/flight.py", "with bound_contextvars(", repo=d)) and "reset_at" not in by["span"], by["span"]
assert (by["job"]["rule"], by["job"]["dies"], by["job"]["reset_at"]) == ("cv-reset", "with the answer", at("api/flight.py", 'unbind_contextvars("job")', repo=d)), by["job"]
assert (by["step"]["rule"], by["step"]["dies"], by["step"]["set_at"]) == ("cv-no-reset", "unknown", by["job"]["set_at"]) and "reset_at" not in by["step"], "step was bound by the SAME call as job — only job is unbound: " + str(by["step"])
assert "var" not in by["job"] and "label" not in by["job"] and "cv-scoped" in f["inflight"]["rules"], by["job"]
PY

py "C56 · a put-back is proof only AFTER the set: a finally ABOVE the set ran before it — REQ keeps the reset below it, never the one above; with only the one above, the variable and the binder both say cv-no-reset · unknown" <<'PY'
def above(d):
    patch(d, "middleware/keys.py", "from state import REQ\n", "from structlog.contextvars import bind_contextvars, clear_contextvars\n\nfrom state import REQ\n")
    patch(d, "middleware/keys.py", "        tok = REQ.set(key)\n", "        try:\n            old = None\n        finally:\n            REQ.reset(old)\n            clear_contextvars()\n        tok = REQ.set(key)\n        bind_contextvars(req_key=key)\n")
d = variant_if("resetabove", above)
plain = flight(build(d, "kinds"), "GET /flight/plain")
req, bound = row(plain, kind="contextvar", name="REQ"), row(plain, kind="contextvar", name="req_key")
line = lambda site: int(site.rpartition(":")[2])
assert line(at("middleware/keys.py", "REQ.reset(old)", repo=d)) < line(req["set_at"]) and req["set_at"] == at("middleware/keys.py", "REQ.set(key)", repo=d), "the fixture must put a finally-reset ABOVE the set: " + str(req)
assert (req["rule"], req["reset_at"]) == ("cv-reset", at("middleware/keys.py", "REQ.reset(tok)", repo=d)), "the reset BELOW the set is the one that puts it back: " + str(req)
assert (bound["rule"], bound["dies"]) == ("cv-no-reset", "unknown") and "reset_at" not in bound, "a clear above the bind cleared nothing of it: " + str(bound)
e = variant_if("resetaboveonly", lambda x: (above(x), patch(x, "middleware/keys.py", "        try:\n            return await call_next(request)\n        finally:\n            REQ.reset(tok)\n", "        return await call_next(request)\n")))
only = row(flight(build(e, "kinds"), "GET /flight/plain"), kind="contextvar", name="REQ")
assert (only["rule"], only["dies"]) == ("cv-no-reset", "unknown") and "reset_at" not in only, "a reset that ran before the set never says 'with the answer': " + str(only)
PY

py "C57 · a lock's release is proof only in a finally, and only AFTER the taking: a bare release, or a finally above the acquire, leaves the lock open" <<'PY'
def nofinal(d):
    patch(d, "api/flight.py", '    with guard.lock("k"):\n        q = session.query().with_for_update()\n', '    lock = guard.lock("k")\n    lock.acquire()\n    q = session.query().with_for_update()\n    lock.release()\n')
def before(d):
    patch(d, "api/flight.py", '    with guard.lock("k"):\n        q = session.query().with_for_update()\n', '    try:\n        q = session.query().with_for_update()\n    finally:\n        guard.release()\n    lock = guard.lock("k")\n    lock.acquire()\n')
for name, edit in (("locknofinal", nofinal), ("lockbefore", before)):
    o = [x for x in flight(build(variant_if(name, edit), "kinds"), "POST /flight/park") if x["kind"] == "lock" and x["rule"] != "lock-transaction"]
    assert [(x["name"], x["rule"], x["dies"]) for x in o] == [("lock.acquire", "lock-open", "unknown")] and "released_at" not in o[0], (name, o)
PY

py "C58 · the cache's size in its own words: a positional literal is its number, maxsize=None and @cache are unbounded, a name nobody resolves is unknown" <<'PY'
def ms(d):
    patch(d, "services/tables.py", "from functools import lru_cache\n", "from functools import cache, lru_cache\n")
    patch(d, "services/tables.py", "@lru_cache\ndef load_table():", "@lru_cache(32)\ndef load_table():")
    patch(d, "services/tables.py", "@lru_cache\ndef unused_cached():", "@lru_cache(maxsize=None)\ndef unused_cached():")
    patch(d, "services/tables.py", "def table_names():", "@cache\ndef every():\n    return ()\n\n\n@lru_cache(maxsize=SIZE)\ndef sized():\n    return ()\n\n\ndef table_names():")
    patch(d, "api/flight.py", "from services.tables import load_table, table_names\n", "from services.tables import every, load_table, sized, table_names, unused_cached\n")
    patch(d, "api/flight.py", "def plain_ep():\n    return {}\n", 'def plain_ep():\n    return {"a": unused_cached(), "b": every(), "c": sized()}\n')
p = build(variant_if("maxsize", ms), "kinds")["inflight"]["process"]
got = {k.rpartition("::")[2]: (v["decorator"], v["maxsize"]) for k, v in p.items() if k.startswith("cache:services/")}
assert got == {"load_table": ("lru_cache", 32), "unused_cached": ("lru_cache", "unbounded"), "every": ("cache", "unbounded"), "sized": ("lru_cache", "unknown")}, got
PY

py "C59 · as_dependency is said only of a cache FastAPI solves; applies_to counts the endpoints handed a cached dependency — a dependency-value row with a ref counts like any ref" <<'PY'
proc = build(IFX, "kinds")["inflight"]["process"]
assert "as_dependency" not in proc["cache:services/tables.py::load_table"], proc["cache:services/tables.py::load_table"]
gs = proc["cache:config.py::get_settings"]
assert gs["as_dependency"] is True and gs["applies_to"] == 2, "park and /me/profile are both handed get_settings(): " + str(gs)
PY

py "C60 · a setting read through a PROPERTY is its expression over the fields it reads — never a field of its own, never unresolved" <<'PY'
def prop(d):
    patch(d, "config.py", "    limit_n: int = 5\n", "    limit_n: int = 5\n\n    @property\n    def window_s(self) -> int:\n        return self.limit_n * 60\n")
    patch(d, "middleware/count.py", "        self._on = s.limit_enabled\n", "        self._on = s.limit_enabled\n        self._ttl = s.window_s\n")
w = build(variant_if("property", prop), "kinds")["inflight"]["process"]["setting-once:middleware/count.py::Count.window_s"]
assert (w["expr"], w["fields"], w["state"], w["settings_class"]) == ("settings.limit_n * 60", ["limit_n"], "default", "config.py::Settings") and "setting" not in w and "unresolved" not in w, w
PY

py "C61 · the rules closure, both ways: rules holds EXACTLY the ids the rows use — every one used, none unused — and a would_be under a closed gate is one of them" <<'PY'
for f in (build(IFX, "kinds"), build(variant_if("nolock61", lambda d: (d / "uv.lock").unlink()), "kinds")):
    rows = [r for e in f["endpoints"].values() for r in e["inflight"]] + list(f["inflight"]["process"].values())
    used = {r[k] for r in rows for k in ("rule", "would_be") if r.get(k)}
    assert used == set(f["inflight"]["rules"]), sorted(used ^ set(f["inflight"]["rules"]))
assert {"request-state", "dep-solved", "framework-gate-closed"} <= set(f["inflight"]["rules"]), sorted(f["inflight"]["rules"])
PY

py "C62 · stats.names, the WHOLE map: context variables are counted beside state names, a get-only variable is read and never set" <<'PY'
n = build(IFX, "kinds")["arms"]["kinds"]["stats"]["inflight"]["names"]
assert n == {"contextvar:REQ": {"set_on": 7, "read_on": 0}, "contextvar:SEEN": {"set_on": 0, "read_on": 1}, "contextvar:WHO": {"set_on": 1, "read_on": 0},
             "state:req_key": {"set_on": 7, "read_on": 1}, "state:user_id": {"set_on": 1, "read_on": 1}}, n
PY

py "C63 · an inflight_scope the part does not build is REFUSED: the part is absent and says why, writes nothing, costs its arm nothing — and options still says the scope that was ASKED" <<'PY'
F_ = __import__("_a3_forms")
F_.OPTIONS["inflight_scope"] = "two-level"
try:
    h = build(IFX, "kinds")
finally:
    F_.OPTIONS["inflight_scope"] = "one-level"
kinds = h["arms"]["kinds"]
assert kinds["parts"]["inflight"] == {"present": False, "reason": "inflight_scope='two-level': only 'one-level' is built"}, kinds["parts"]["inflight"]
assert kinds["options"] == {"inflight_scope": "two-level", "inflight_dep_values": True}, "a reader of options must see WHY the part is absent: " + str(kinds["options"])
assert "inflight" not in h and "inflight" not in kinds["stats"] and not [k for k, e in h["endpoints"].items() if "inflight" in e], "a refused scope left rows behind"
assert kinds["present"] and h["middleware"] and h["dependencies"] and all(kinds["parts"][p]["present"] for p in ("middleware", "dependencies", "functions", "tasks", "handlers")), kinds["parts"]
again = build(IFX, "kinds")["arms"]["kinds"]
assert again["parts"]["inflight"] == {"present": True, "reason": None} and again["options"]["inflight_scope"] == "one-level", again["parts"]
PY

py "C64 · a dependency value's reads are the loads of ITS parameter only — each row its own line in the handler, nobody else's" <<'PY'
park = flight(build(IFX, "kinds"), "POST /flight/park")
want = {"ctx": "who=ctx", "settings": "settings.limit_n", "session": "session.query()", "n": '"n": n'}
for p_, text in want.items():
    r = row(park, kind="dependency-value", param=p_)
    assert r["read_at"] == [{"at": at("api/flight.py", text, repo=IFX), "fn": "api/flight.py::park", "in": "handler"}], (p_, r["read_at"])
PY

py "C65 · a fact one call down sits on a branch THE CALL SITE decides (the falsification leaf, every kind): a flag the call leaves at its False default is no state, context variable, queue or lock of this request — the else arm is; passed True it is all four and the else arm is gone; a runtime value proves nothing (both arms, set_cond); a parameter the helper rebinds, or a call that spreads **kw, is never proof" <<'PY'
def touch(d, call="touch(request, session, tasks)", head="", default="False"):
    patch(d, "api/flight.py", "from state import current_seen\n", "from state import SEEN, current_seen\n")
    patch(d, "api/flight.py", "def send(key, who=None):", f'def touch(request: Request, session, tasks: BackgroundTasks, deep: bool = {default}):\n{head}    if deep:\n        request.state.deep = "d"\n        SEEN.set("d")\n        tasks.add_task(send, "d")\n        session.query().with_for_update()\n    else:\n        request.state.shallow = "s"\n\n\ndef send(key, who=None):')
    patch(d, "api/flight.py", "def plain_ep():\n    return {}\n", f"def plain_ep(request: Request, tasks: BackgroundTasks, session=Depends(get_session)):\n    {call}\n    return {{}}\n")
def facts(d):
    rows = flight(build(d, "kinds"), "GET /flight/plain")
    deep = sorted((r["kind"], r["name"]) for r in rows if r.get("set_fn") == "api/flight.py::touch" and r["name"] != "shallow")
    return rows, deep, [r for r in rows if r["kind"] == "state" and r["name"] == "shallow"]
ALL = [("background", "send"), ("contextvar", "SEEN"), ("lock", "with_for_update"), ("state", "deep")]
rows, deep, shallow = facts(variant_if("deadarm", touch))
assert deep == [] and len(shallow) == 1 and shallow[0]["set_cond"] is True, "the call leaves deep at False — nothing under `if deep:` is this request's: " + str((deep, shallow))
rows, deep, shallow = facts(variant_if("livearm", lambda d: touch(d, "touch(request, session, tasks, deep=True)")))
assert deep == ALL and shallow == [], "passed True, every kind under it is a row and the else arm is dead: " + str((deep, shallow))
assert all(r["set_cond"] is True and r["set_via"] == at("api/flight.py", "    touch(request", repo=T / "livearm") for r in rows if r.get("set_fn") == "api/flight.py::touch"), rows
rows, deep, shallow = facts(variant_if("openarm", lambda d: touch(d, 'touch(request, session, tasks, deep=bool(request.headers.get("x-deep")))')))
assert deep == ALL and len(shallow) == 1, "a value only the request knows proves nothing — both arms stay, each under set_cond: " + str((deep, shallow))
rows, deep, shallow = facts(variant_if("defaulttrue", lambda d: touch(d, default="True")))       # the in-test mutation: the SAME call, the default flipped
assert deep == ALL and shallow == [], "the default decides when the call is silent: " + str((deep, shallow))
rows, deep, shallow = facts(variant_if("rebound", lambda d: touch(d, head='    deep = deep or bool(request.headers.get("x-deep"))\n')))
assert deep == ALL and len(shallow) == 1, "the helper rebinds the flag — its default proves nothing: " + str((deep, shallow))
rows, deep, shallow = facts(variant_if("spread", lambda d: touch(d, 'touch(request, session, tasks, **{"deep": True})')))
assert deep == ALL and len(shallow) == 1, "a **kw call may pass the flag — the default proves nothing: " + str((deep, shallow))
rows, deep, shallow = facts(variant_if("starred", lambda d: touch(d, "touch(*[request, session, tasks, True])")))
assert deep == ALL and len(shallow) == 1, "a *args call may pass the flag — the default proves nothing: " + str((deep, shallow))
PY

py "C66 · a dependency a FACTORY names through a local alias is walked, not dropped: base = chat if allow_anonymous else current, over the factory's own imports — the arm the Depends(factory(...)) call proves is the station (no set_cond), the other arm is none; a flag nothing proves walks both, each under set_cond; a factory PARAMETER is the name the call passed; a name that resolves to nothing is COUNTED and NAMED, and only that endpoint's unwritten reads say dep-unresolved" <<'PY'
def fac(d, call='require("a")', alias="chat if allow_anonymous else current"):
    (d / "users.py").write_text('from fastapi import Request\n\n\ndef current(request: Request):\n    request.state.scopes = ["a"]\n    return "u"\n\n\ndef chat(request: Request):\n    request.state.anon = True\n    return None\n')
    patch(d, "deps.py", "from fastapi import Request\n", "from fastapi import Depends, Request\n")
    patch(d, "deps.py", "def plain():", f'def pick(flag):\n    return None\n\n\ndef require(perm, *, allow_anonymous: bool = False):\n    from users import chat, current\n\n    base_user = {alias}\n\n    def dependency(request: Request, user=Depends(base_user)):\n        return getattr(request.state, "scopes", None)\n\n    return dependency\n\n\ndef through(dep):\n    def inner(got=Depends(dep)):\n        return got\n\n    return inner\n\n\ndef plain():')
    patch(d, "api/flight.py", "from deps import need, plain, shared, who\n", "from deps import need, plain, require, shared, through, who\n\nANON = bool(router)\n")
    patch(d, "api/flight.py", "def plain_ep():\n    return {}\n", f'def plain_ep(u=Depends({call})):\n    return {{"seen": current_seen()}}\n')
    patch(d, "api/flight.py", '    return {"key": read_far(request)', '    getattr(request.state, "scopes", None)\n    return {"key": read_far(request)')
    patch(d, "api/flight.py", "    key = read_key(request)\n", '    key = read_key(request)\n    getattr(request.state, "scopes", None)\n')
def states(f):
    return {r["name"]: r for r in flight(f, "GET /flight/plain") if r["kind"] == "state" and r["name"] in ("scopes", "anon")}
d = variant_if("facalias", fac)
f = build(d, "kinds")
st, stats = states(f), f["arms"]["kinds"]["stats"]["inflight"]
assert sorted(st) == ["scopes"], "allow_anonymous stays False — `current` is the ONE arm, `chat` is never solved: " + str(st)
sc = st["scopes"]
assert (sc["set_at"], sc["set_by"], sc["set_in"], sc["rule"], sc["reads"]) == (at("users.py", "request.state.scopes =", repo=d), "users.py::current", "dependency", "request-state", "found") and "set_cond" not in sc, sc
assert sc["read_at"][0]["fn"] == "deps.py::require.dependency" and (stats["deps_unresolved"], stats["deps_unresolved_at"], stats["factories_unread"]) == (0, [], 0), (sc, stats)
st = states(build(variant_if("facanon", lambda x: fac(x, 'require("a", allow_anonymous=True)')), "kinds"))
assert st["anon"]["set_by"] == "users.py::chat" and "set_cond" not in st["anon"] and st["scopes"]["rule"] == "no-write-found", "passed True the OTHER arm is the station, and nothing writes scopes: " + str(st)
st = states(build(variant_if("facopen", lambda x: fac(x, 'require("a", allow_anonymous=ANON)')), "kinds"))
assert (st["scopes"]["set_by"], st["scopes"].get("set_cond"), st["anon"]["set_by"], st["anon"].get("set_cond")) == ("users.py::current", True, "users.py::chat", True), "nothing proves the flag — both arms, each conditional: " + str(st)
st = states(build(variant_if("facswap", lambda x: fac(x, alias="current if allow_anonymous else chat")), "kinds"))     # the in-test mutation: the arms swapped
assert sorted(st) == ["anon", "scopes"] and st["anon"]["set_by"] == "users.py::chat" and st["scopes"]["rule"] == "no-write-found", st
def param(x):
    fac(x, "through(mine)")
    patch(x, "api/flight.py", "def send(key, who=None):", "def mine(request: Request):\n    request.state.mine = 1\n\n\ndef send(key, who=None):")
user = [r for r in flight(build(variant_if("facparam", param), "kinds"), "GET /flight/plain") if r["kind"] == "state" and r["name"] == "mine"]
assert [(r["set_by"], r["rule"]) for r in user] == [("api/flight.py::mine", "request-state")], "a factory PARAMETER is the name the call passed, read in the ASKER's module — deps.py never heard of it: " + str(user)
e = variant_if("faclost", lambda x: fac(x, alias="pick(allow_anonymous)"))
g = build(e, "kinds")
lost, stats = states(g)["scopes"], g["arms"]["kinds"]["stats"]["inflight"]
assert (lost["rule"], lost["scope"], lost["dies"], lost["set_at"]) == ("dep-unresolved", "request", "unknown", "unknown"), "a read behind an unresolved dependency never says 'nothing writes it': " + str(lost)
assert (stats["deps_unresolved"], stats["deps_unresolved_at"]) == (1, [at("deps.py", "def dependency(", repo=e) + " Depends(base_user)"]), stats
seen = {p: row(flight(g, p), kind="contextvar", name="SEEN") for p in ("GET /flight/plain", "GET /flight/deep")}
assert (seen["GET /flight/plain"]["rule"], seen["GET /flight/plain"]["scope"], seen["GET /flight/deep"]["rule"]) == ("cv-dep-unresolved", "unknown", "cv-get-only"), seen
for other in ("GET /flight/deep", "POST /flight/park"):                 # one read BEFORE the lossy endpoint in build order, one AFTER it
    assert row(flight(g, other), kind="state", name="scopes")["rule"] == "no-write-found", "SILENT: an endpoint whose dependencies all resolve keeps the unqualified words: " + other
assert {"dep-unresolved", "cv-dep-unresolved", "no-write-found", "cv-get-only"} <= set(g["inflight"]["rules"]) and "could not be resolved" in g["inflight"]["rules"]["dep-unresolved"]["says"], sorted(g["inflight"]["rules"])
assert "dep-unresolved" not in f["inflight"]["rules"] and "dep-unresolved" not in build(IFX, "kinds")["inflight"]["rules"], "SILENT: a tree with nothing unresolved never names the rule"
PY

py "C67 · a BackgroundTasks handed one call down as (tasks if FLAG else None) to a helper typed (BackgroundTasks | None) IS queued in scope: found · the task · set_fn · set_via · set_cond (another arm may arrive) — ONE row for the parameter; a bare name carries no set_cond; the annotation is read through X | None · Optional · Union · Annotated; a parameter handed on inside an expression to a helper that queues nothing says beyond one level, never none in scope" <<'PY'
def opt(d, arg="tasks if FLAG else None", ann="BackgroundTasks | None", body="tasks.add_task(send, key)"):
    patch(d, "api/flight.py", "from typing import Annotated\n", "from typing import Annotated, Optional, Union\n")
    patch(d, "api/flight.py", "def send(key, who=None):", f"FLAG = bool(router)\n\n\ndef pick(x):\n    return x\n\n\ndef later(key, tasks: {ann} = None):\n    {body}\n\n\ndef send(key, who=None):")
    patch(d, "api/flight.py", '    return {"key": read_far(request)', f'    later("k", tasks={arg})\n    return {{"key": read_far(request)')
def bg(d):
    return [r for r in flight(build(d, "kinds"), "GET /flight/deep") if r["kind"] == "background"]
d = variant_if("bgopt", opt)
rows = bg(d)
assert len(rows) == 1, "the parameter is ONE row — never a found row beside a `none in scope` one: " + str(rows)
r = rows[0]
assert (r["queues"], r["name"], r["param"], r["set_at"], r["set_fn"], r["set_via"], r.get("set_cond")) == ("found", "send", "tasks", at("api/flight.py", "    tasks.add_task(send, key)", repo=d), "api/flight.py::later", at("api/flight.py", '    later("k"', repo=d), True), r
r = bg(variant_if("bgbare", lambda x: opt(x, arg="tasks")))
assert len(r) == 1 and (r[0]["queues"], r[0]["param"]) == ("found", "tasks") and "set_cond" not in r[0], "SILENT: a bare name is handed over outright — no set_cond: " + str(r)
for n, ann in enumerate(("BackgroundTasks | None", "Optional[BackgroundTasks]", "Union[BackgroundTasks, None]", 'Annotated[BackgroundTasks, "x"]', '"BackgroundTasks | None"')):
    r = [x for x in bg(variant_if(f"bgann{n}", lambda x: opt(x, arg="pick(tasks)", ann=ann))) if x["queues"] == "found"]     # its OWN folder: a parsed module is kept per path
    assert [(x["name"], x["set_fn"]) for x in r] == [("send", "api/flight.py::later")], "the helper's OWN annotation says it queues on a BackgroundTasks: " + str((ann, r))
r = [x for x in bg(variant_if("bgnotann", lambda x: opt(x, arg="pick(tasks)", ann="object | None"))) if x["queues"] == "found"]
assert r == [], "SILENT: a receiver nothing types as BackgroundTasks, handed nothing the caller owns, is no queue: " + str(r)
r = bg(variant_if("bgtwo", lambda x: opt(x, arg="tasks if FLAG else request")))
assert sorted((x["queues"], x["param"]) for x in r) == [("beyond one level", "tasks"), ("found", None)], "two of the caller's parameters among the arms — which one arrives is not said: " + str(r)
e = variant_if("bgrelay", lambda x: opt(x, body="pick(key)"))           # the in-test mutation: the helper no longer queues — it is handed the parameter and nothing in scope uses it
r = bg(e)
assert [(x["queues"], x["name"], x.get("passed_at")) for x in r] == [("beyond one level", "tasks", at("api/flight.py", '    later("k"', repo=e))], "handed on inside `tasks if FLAG else None` — the row says so, and where: " + str(r)
PY

py "C68 · a task a handler imports in its OWN body and queues is that function: background row with its task; SILENT: the same name no import explains names no task" <<'PY'
def localsend(d):
    (d / "services/mail.py").write_text("def post(key, who=None):\n    return None\n")
    patch(d, "api/flight.py", "    tasks.add_task(send, key, who=ctx)\n", "    from services.mail import post\n    tasks.add_task(post, key, who=ctx)\n")
r = row(flight(build(variant_if("localsend", localsend), "kinds"), "POST /flight/park"), kind="background")
assert (r["name"], r.get("task"), r["queues"]) == ("post", "services/mail.py::post", "found"), r
def nosend(d):
    (d / "services/mail.py").write_text("def post(key, who=None):\n    return None\n")
    patch(d, "api/flight.py", "    tasks.add_task(send, key, who=ctx)\n", "    tasks.add_task(post, key, who=ctx)\n")
r = row(flight(build(variant_if("nosend", nosend), "kinds"), "POST /flight/park"), kind="background")
assert r["name"] == "post" and r.get("task") is None, r
PY

py "C69 · a class a service imports in its own body and raises is read with its BASES there: the except of its base it passes through is on its raise's trail" <<'PY'
def relay(d):
    (d / "services/errs.py").write_text("from services.work import Gone\n\n\nclass Missing(Gone):\n    pass\n")
    patch(d, "services/work.py", "def careful(x):", "def relay_gone(x):\n    from services.errs import Missing\n    try:\n        if x < 0:\n            raise Missing()\n    except Gone:\n        raise\n    return x\n\n\ndef careful(x):")
    patch(d, "api/work.py", "from services.work import Busy, careful, deep_a, record, reserve\n", "from services.work import Busy, careful, deep_a, record, relay_gone, reserve\n")
    patch(d, "api/work.py", '@router.post("/raw")', '@router.post("/relay")\ndef relay(x: int):\n    relay_gone(x)\n    return {"ok": True}\n\n\n@router.post("/raw")')
d = variant8("relay", relay)
f = build(d, "kinds")
m = next(x for x in f["functions"]["services/work.py::relay_gone"]["raises"] if x["cls"] == "Missing")
assert m.get("through") == [{"at": at("services/work.py", "    except Gone:", repo=d), "types": ["Gone"], "op": "pass-through"}], m
assert [(u["endpoint"], u["status"]) for u in m["untranslated_at"]] == [("endpoint:POST /work/relay", 500)], m
PY

py "C70 · a path helper a middleware imports INSIDE dispatch is read where the guard is written: its prefix scopes the exit under it, and as a pass-through arm it is a prefix the exempt route is decided by — in the kinds form and the paths rows alike" <<'PY'
def localhelp(d):
    (d / "middleware/paths.py").write_text("from starlette.responses import JSONResponse\n\nHOT2 = (\"/orders\",)\nOPEN = (\"/healthz\",)\n\n\ndef is_hot(path):\n    return path.startswith(HOT2)\n\n\n"
                                           "def is_open(path):\n    return path.startswith(OPEN)\n\n\ndef too_many():\n    return JSONResponse(status_code=429, content={\"detail\": \"too many\"})\n")
    patch(d, "middleware/gate.py", "    async def dispatch(self, request, call_next):\n        if not self._enabled or request.url.path in EXEMPT:",
          "    async def dispatch(self, request, call_next):\n        from middleware.paths import is_hot, is_open, too_many\n        if not self._enabled or is_open(request.url.path):")
    patch(d, "middleware/gate.py", "        if request.url.path.startswith(HOT):", "        if is_hot(request.url.path):\n            if request.headers.get(\"x-flood\"):\n                return too_many()")
d = variant("localhelp", localhelp)
f = build(d, "kinds,paths")
g = f["middleware"]["middleware:Gate"]
assert [(a["kind"], a.get("values")) for a in g["pass_through"]] == [("flag", None), ("prefix", ["/healthz"])], g["pass_through"]
by_scope = {("all" if x["scope"] == "all" else "hot"): x for x in g["exits"]}
assert by_scope["hot"]["scope"] == ["/orders"] and by_scope["hot"]["applies_to"] == 1, by_scope["hot"]
assert by_scope["all"]["exempt"] == ["endpoint:GET /healthz"] and by_scope["all"]["applies_to"] == 3, by_scope["all"]
hz = [r for r in f["endpoints"]["endpoint:GET /healthz"]["produced"] if r.get("id") == by_scope["all"]["id"]]
assert hz and all(r.get("applies") is False for r in hz), hz
hop = [x for x in g["exits"] if x.get("hop") == "helper too_many"]
assert len(hop) == 1 and hop[0]["scope"] == ["/orders"] and hop[0]["at"].startswith("middleware/paths.py:"), "a response helper imported in dispatch is read one hop down, scoped by the local path helper above it: " + str(hop)
PY

py "C71 · deps_unresolved_at and unplaced_middleware_at never fall to a set's hash order: two entries on one line sort by the whole entry, whatever order they arrive in" <<'PY'
import itertools, _a3_forms_inflight as IFL
want = ["a.py:1 Depends(x)", "a.py:3 Depends(alpha)", "a.py:3 Depends(zeta)", "b.py:2 y"]
for perm in itertools.permutations(want):
    assert sorted(perm, key=IFL._by_site) == want, (perm, sorted(perm, key=IFL._by_site))
PY

py "C72 · a middleware's __init__ and dispatch read names they import in their OWN body: the settings object a locally imported factory or class returns, the counter class it builds and hands a setting to, a settings factory call that is no object built, the path helper that scopes the read" <<'PY'
def initlocal(d):
    (d / "middleware/window.py").write_text("from collections import defaultdict, deque\n\n\nclass Window:\n    def __init__(self, limit, seconds):\n        self._limit = limit\n        self._hits = defaultdict(deque)\n\n    def allow(self, key):\n        return len(self._hits[key]) < self._limit\n")
    (d / "middleware/paths.py").write_text("def on_park(path):\n    return path.startswith(\"/flight/park\")\n")
    patch(d, "middleware/count.py", "    def __init__(self, app, settings: Settings | None = None):\n        super().__init__(app)\n        s = settings or get_settings()\n        self._on = s.limit_enabled\n        self._win = Window(s.limit_n, 60)\n",
          "    def __init__(self, app, settings=None):\n        super().__init__(app)\n        from config import Settings as Cfg, get_settings as gs\n        from middleware.window import Window as Win\n"
          "        s = settings or Cfg()\n        t = settings or gs()\n        self._on = t.limit_enabled\n        self._win = Win(s.limit_n, 60)\n        self._cfg = gs()\n")
    patch(d, "middleware/count.py", "    async def dispatch(self, request, call_next):\n        if not self._on:",
          "    async def dispatch(self, request, call_next):\n        from middleware.paths import on_park\n        if not self._on:")
    patch(d, "middleware/count.py", '        if request.url.path.startswith("/flight/park"):', "        if on_park(request.url.path):")
d = variant_if("initlocal", initlocal)
proc = build(d, "kinds")["inflight"]["process"]
win = proc.get("built-once:middleware/count.py::Count._win") or {}
assert (win.get("class"), win.get("class_at")) == ("Win", at("middleware/window.py", "class Window", repo=d)) and [h["attr"] for h in win.get("holds") or []] == ["_hits"], win
assert win["read_at"][0]["scope"] == ["/flight/park"] and win["applies_to"] == 1, win.get("read_at")
n = proc.get("setting-once:middleware/count.py::Count.limit_n") or {}
assert [{k: h[k] for k in ("attr", "param")} for h in n.get("hands_to") or []] == [{"attr": "_win", "param": "limit"}], n
assert "setting-once:middleware/count.py::Count.limit_enabled" in proc, sorted(proc)
assert "built-once:middleware/count.py::Count._cfg" not in proc, "a settings factory the __init__ imports is a settings read, never an object built: " + str(sorted(proc))
PY

py "C73 · a bus instance the publisher imports in its OWN body is that bus: the handler form names its publish method, isolation and catch" <<'PY'
def localbus(d):
    patch(d, "api/work.py", "from events.bus import bus\n", "")
    patch(d, "api/work.py", "def place(x: int, session=Depends(get_session)):\n", "def place(x: int, session=Depends(get_session)):\n    from events.bus import bus\n")
d = variant8("localbus", localbus)
h = build(d, "kinds")["handlers"]["services/listen.py::on_placed"]
assert (h["bus"] or {}).get("fn") == "events/bus.py::EventBus.publish" and h["bus"]["isolation"]["kind"] == "savepoint", h.get("bus")
PY

echo "forms-kinds: $pass passed, $fail failed"
[ "$fail" -eq 0 ] || exit 1
