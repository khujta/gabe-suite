#!/usr/bin/env bash
# Forms contract battery — the CONTRACT arm (docs/design/element-forms/amendment-1.md §A2 Slice 7): what a client can rely
# on at an endpoint — repeat{} (the idempotency key and the inserts it claims, finding race-500) · auth{} · rate{} ·
# responses{}. The cases drive the real orchestrator (_a3_forms_build.extend_backend) with `contract` selected over
# _a3_paths.build output on a synthetic FastAPI + SQLAlchemy tree — AST only. Each case FIREs and stays SILENT. Exit 0 = all pass.
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

from middleware.keys import KeyMiddleware
from middleware.limit import LimitMiddleware

app = FastAPI()
app.add_middleware(KeyMiddleware)
app.add_middleware(LimitMiddleware)
PYF
cat > "$A/config.py" <<'PYF'
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SHOP_")

    limit_enabled: bool = False
    hot_per_minute: int = 5
    window_seconds: float = 60.0


def get_settings() -> Settings:
    return Settings()
PYF
cat > "$A/middleware/keys.py" <<'PYF'
from starlette.middleware.base import BaseHTTPMiddleware

KEY_HEADER = "Idempotency-Key"


class KeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        key = request.headers.get(KEY_HEADER)
        request.state.idem_key = key
        return await call_next(request)


def read_key(request):
    return getattr(request.state, "idem_key", None)
PYF
cat > "$A/middleware/limit.py" <<'PYF'
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from config import Settings, get_settings

EXEMPT = frozenset({"/healthz"})
HOT = ("/shop/place",)


class Window:
    def __init__(self, limit: int, window_seconds: float) -> None:
        self._limit = limit
        self._window = window_seconds

    def allow(self, key, now):
        return True


class LimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, settings: Settings | None = None):
        super().__init__(app)
        s = settings or get_settings()
        self._enabled = s.limit_enabled
        self._hot = Window(s.hot_per_minute, s.window_seconds)
        self._all = Window(100, s.window_seconds)

    async def dispatch(self, request, call_next):
        if not self._enabled or request.url.path in EXEMPT:
            return await call_next(request)
        ip = request.client.host
        now = 0
        if request.url.path.startswith(HOT):
            key = f"{ip}:hot"
            if not self._hot.allow(key, now):
                return self._throttled()
        gkey = f"{ip}:all"
        if not self._all.allow(gkey, now):
            return self._throttled()
        return await call_next(request)

    @staticmethod
    def _throttled():
        return JSONResponse(status_code=429, content={"detail": "slow down"}, headers={"Retry-After": "1"})
PYF
cat > "$A/models.py" <<'PYF'
from sqlalchemy import Column, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (UniqueConstraint("key", name="uq_orders_key"),)
    id = Column(Integer, primary_key=True)
    key = Column(String)


class Claim(Base):
    __tablename__ = "claims"
    __table_args__ = (Index("ix_claims_key", "key", unique=True),)
    id = Column(Integer, primary_key=True)
    key = Column(String)


class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True)
    text = Column(String)
PYF
cat > "$A/db.py" <<'PYF'
def get_session():
    session = make_session()
    try:
        yield session
    finally:
        session.close()
PYF
cat > "$A/auth.py" <<'PYF'
from typing import Annotated
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

from db import get_session
from models import Note

bearer = HTTPBearer()


class Ctx:
    def __init__(self, team):
        self.team = team

    def require_team(self):
        if self.team is None:
            raise HTTPException(status_code=403, detail="no team")
        return self.team


def get_current_ctx(creds=Depends(bearer), session=Depends(get_session)) -> Ctx:
    seen = Note(text="login")
    session.add(seen)
    session.commit()
    return Ctx(None)


CurrentCtx = Annotated[Ctx, Depends(get_current_ctx)]

PYF
cat > "$A/schemas.py" <<'PYF'
from pydantic import BaseModel


class OrderOut(BaseModel):
    id: int
    key: str
PYF
cat > "$A/services/orders.py" <<'PYF'
from sqlalchemy.exc import IntegrityError

from models import Claim, Order


def place(session, key):
    order = Order(key=key)
    session.add(order)
    session.flush()
    return order


def claim(session, key):
    try:
        with session.begin_nested():
            row = Claim(key=key)
            session.add(row)
            session.flush()
    except IntegrityError:
        return "replay"
    return "new"


def stage(session, key):
    row = Claim(key=key)
    session.add(row)
    return row
PYF
cat > "$A/api/mine.py" <<'PYF'
from fastapi import APIRouter

from auth import CurrentCtx

router = APIRouter(prefix="/shop")


@router.get("/mine")
def mine(ctx: CurrentCtx):
    return {"user": ctx.user_id}
PYF
cat > "$A/api/shop.py" <<'PYF'
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from slowapi import Limiter
from sqlalchemy.exc import IntegrityError

from auth import Ctx, get_current_ctx
from db import get_session
from middleware.keys import read_key
from schemas import OrderOut
from services.orders import claim, place, stage

router = APIRouter(prefix="/shop")
limiter = Limiter(key_func=None)


@router.post("/place", response_model=OrderOut)
def place_order(request: Request, ctx: Ctx = Depends(get_current_ctx), session=Depends(get_session)):
    ctx.require_team()
    key = read_key(request)
    if key is None:
        raise HTTPException(status_code=400, detail="key required")
    order = place(session, key)
    session.commit()
    return order


@router.post("/claim")
def claim_it(request: Request, session=Depends(get_session)):
    key = request.headers.get("Idempotency-Key")
    state = claim(session, key=key)
    if state == "replay":
        return {"replayed": True}
    session.commit()
    return {"replayed": False}


@router.post("/staged")
def staged(request: Request, session=Depends(get_session)):
    key = read_key(request)
    try:
        stage(session, key)
        session.commit()
    except IntegrityError:
        return {"dup": True}
    return {"dup": False}


@router.post("/nokey")
def nokey(session=Depends(get_session)):
    return {"ok": True}


@router.get("/look")
def look(request: Request):
    trace = request.headers.get("X-Trace")
    return {"ok": True, "trace": trace}


@router.get("/ping")
@limiter.limit("5/minute")
def ping(request: Request):
    return {"pong": True}


@router.post("/made")
def made(q: int = 1):
    return JSONResponse(status_code=201, content={"x": 1}, headers={"Location": "/x"})


@router.get("/feed")
def feed():
    return StreamingResponse(iter([b"a"]), media_type="text/event-stream")


_SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


@router.get("/pooled")
@limiter.shared_limit("10/minute", scope="shop")
def pooled(request: Request):
    return {"ok": True}


@router.get("/feed2")
def feed_sse(request: Request):
    return StreamingResponse(iter([b"x"]), media_type="text/event-stream", headers=_SSE_HEADERS)


@router.delete("/gone", status_code=204)
def gone(request: Request) -> None:
    return None


PYF

py() {  # py "<name>" <<'PY' … PY  — the prelude gives A · T · GEN · build() · variant() · patch() · at() · ep()
  local name="$1" src; src=$(cat)
  if (cd "$T" && PYTHONPATH="$GEN" A="$A" T="$T" GEN="$GEN" python3 - >"$T/py.txt" 2>&1 <<PY
import copy, json, os, re, shutil, sys
from pathlib import Path
A, T, GEN = (Path(os.environ[k]) for k in ("A", "T", "GEN"))
import _a3_code as C, _a3_paths as P, _a3_forms as F, _a3_forms_build as B
MODELS = [{"cls": "Order", "table": "orders", "file": "models.py", "uqs": ["UniqueConstraint('key', name='uq_orders_key')"]},
          {"cls": "Claim", "table": "claims", "file": "models.py", "uqs": []},
          {"cls": "Note", "table": "notes", "file": "models.py", "uqs": []}]
def build(repo, arms="paths,effects,contract"):
    files = sorted(str(p.relative_to(repo)) for p in (repo / "api").glob("*.py"))
    amap = {"head": "abc1234", "entities": {"x": {"endpoints": C.parse_endpoints(repo, files), "models": MODELS}},
            "app_middleware": C.parse_app_middleware(repo, {"x": {"api": ["api/*.py"]}})}
    for e in amap["entities"]["x"]["endpoints"]:
        e.pop("refs", None)
    os.environ["GABE_FORMS_ARMS"] = arms
    before = copy.deepcopy(amap)
    f = B.extend_backend(P.build(amap, repo), amap, repo, {})
    assert amap == before, "the build changed the archmap"
    return f
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
def at(rel, text, nth=1, repo=A):
    hits = [i + 1 for i, l in enumerate((repo / rel).read_text().splitlines()) if text in l]
    return f"{rel}:{hits[nth - 1]}"
def ep(f, key):
    return f["endpoints"][key]
def race500(f):
    return sorted((k, x["claim"]) for k, e in f["endpoints"].items() for v in (e.get("variants") or [e]) for x in (v.get("arm_findings") or {}).get("contract") or [])
$src
PY
  ); then ok; else bad "$name: $(tail -4 "$T/py.txt")"; fi
}

py "E10 · FIRE+SILENT: shared_limit is a limiter and a 429; headers from a module constant are read; a -> None handler has no body" <<'PY'
f = build(A)
pooled = ep(f, "endpoint:GET /shop/pooled")
dec = [x for x in pooled["rate"]["limits"] if x.get("idiom")]                                      # beside the app middleware's
assert [x["idiom"] for x in dec] == ["limiter.shared_limit"] and dec[0]["limit"] == 10, pooled["rate"]
assert [r["status"] for r in pooled["produced"] if r.get("via", "").startswith("decorator")] == [429], pooled["produced"]
ping = ep(f, "endpoint:GET /shop/ping")
assert [r["status"] for r in ping["produced"] if r.get("via", "").startswith("decorator")] == [429], ping["produced"]
feed = ep(f, "endpoint:GET /shop/feed2")["responses"]
succ = next(v for k, v in feed.items() if isinstance(v, dict) and v.get("status") == 200)
assert succ.get("headers") == {"Cache-Control": "…", "X-Accel-Buffering": "…"}, succ                  # V24: _SSE_HEADERS read one hop
gone = ep(f, "endpoint:DELETE /shop/gone")["responses"]
none = next(v for k, v in gone.items() if isinstance(v, dict) and v.get("body") == "none")
assert none["media"] == "n/a", gone                                                                 # V24: -> None serializes nothing
mine = ep(f, "endpoint:GET /shop/mine")["auth"]["gates"]                                            # V22a: the gate behind an
assert mine and all(g["fn"] == "auth.py::get_current_ctx" for g in mine), mine                    # Annotated alias resolves
assert ep(f, "endpoint:GET /shop/look")["responses"] and all(v.get("body") != "none" for v in ep(f, "endpoint:GET /shop/look")["responses"].values() if isinstance(v, dict)), "a model return still reads its fields"
PY

py "E6 · FIRE + SILENT: race-500 on an unguarded claim; silent on a savepoint claim and on a claim whose commit sits in the caller's try" <<'PY'
f = build(A)
assert race500(f) == [("endpoint:POST /shop/place", at("services/orders.py", "order = Order(key=key)"))], race500(f)
pl = ep(f, "endpoint:POST /shop/place")["repeat"]["claims"]
assert [(c["model"], c["column"], c["unique"], c.get("constraint"), c["race"]) for c in pl] == [("Order", "key", ["key"], "uq_orders_key", "uncaught")], pl
cl = ep(f, "endpoint:POST /shop/claim")["repeat"]["claims"]
assert [(c["model"], c["race"], c.get("constraint"), c["idioms"]) for c in cl] == [("Claim", "handled", "ix_claims_key", ["begin_nested"])], cl
assert cl[0]["arms"] == [{"pred": "state == 'replay'", "exit": "return", "at": at("api/shop.py", 'if state == "replay"')}], cl[0]["arms"]
st = ep(f, "endpoint:POST /shop/staged")["repeat"]["claims"]
assert [(c["model"], c["race"], c["fn"]) for c in st] == [("Claim", "handled", "services/orders.py::stage")], st
s = f["arms"]["contract"]["stats"]
assert s["findings"] == {"race-500": 1} and s["claims"] == 3 and s["races"] == {"handled": 2, "uncaught": 1}, s
PY

py "E7 · FIRE + SILENT: U12 — a key through request.state or a header read, the refusal that requires it; missing on a keyless POST, n/a on a GET" <<'PY'
f = build(A)
pl = ep(f, "endpoint:POST /shop/place")["repeat"]
assert pl["state"] == "defined" and pl["key"] == {"read_at": at("api/shop.py", "key = read_key(request)"), "name": "Idempotency-Key", "carrier": "header",
                                                  "through": "request.state.idem_key", "set_at": at("middleware/keys.py", "request.state.idem_key = key")}, pl["key"]
need = next(r for r in ep(f, "endpoint:POST /shop/place")["produced"] if r.get("pred") == "key is None")
assert pl["required"] == {"exit": need["id"], "status": 400, "at": need["at"]}, pl["required"]
cl = ep(f, "endpoint:POST /shop/claim")["repeat"]
assert cl["state"] == "defined" and cl["key"]["carrier"] == "header" and "through" not in cl["key"] and cl["required"] is None, cl
assert ep(f, "endpoint:POST /shop/nokey")["repeat"] == {"state": "missing"} and ep(f, "endpoint:GET /shop/look")["repeat"] == {"state": "n/a"}
s = f["arms"]["contract"]["stats"]["repeat"]
assert s == {"defined": 3, "missing": 3, "n/a": 6}, s          # E10's routes: DELETE /gone keyless · GET /pooled · GET /feed2 · GET /mine
PY

py "E8 · FIRE + SILENT: K3 — limiter arguments resolved to settings defaults, the key, the switch and exempt paths; the hot limit only on the hot path; a decorator limit" <<'PY'
f = build(A)
r = ep(f, "endpoint:POST /shop/place")["rate"]
hot = next(x for x in r["limits"] if x.get("limiter") == "_hot")
assert [(a["param"], a["value"], a["state"], a.get("setting"), a.get("at")) for a in hot["args"]] == \
    [("limit", 5, "default", "hot_per_minute", at("config.py", "hot_per_minute")), ("window_seconds", 60.0, "default", "window_seconds", at("config.py", "window_seconds"))], hot["args"]
assert hot["key"] == "f'{ip}:hot'" and hot["class"] == "Window" and hot["state"] == "default", hot
al = next(x for x in r["limits"] if x.get("limiter") == "_all")
assert al["args"][0] == {"param": "limit", "expr": "100", "value": 100, "state": "defined"}, al["args"]
assert r["state"] == "defined" and r["switch"] == "settings.limit_enabled" and r["exempt"] == ["/healthz"], r
look = ep(f, "endpoint:GET /shop/look")["rate"]
assert [x.get("limiter") for x in look["limits"]] == ["_all"], look
ping = ep(f, "endpoint:GET /shop/ping")["rate"]
assert any(x.get("idiom") == "limiter.limit" and x.get("limit") == 5 and x.get("per") == "minute" for x in ping["limits"]), ping
seven = build(variant("seven", lambda d: patch(d, "config.py", "hot_per_minute: int = 5", "hot_per_minute: int = 7")))
assert next(x for x in ep(seven, "endpoint:POST /shop/place")["rate"]["limits"] if x.get("limiter") == "_hot")["args"][0]["value"] == 7
PY

py "E11 · FIRE: a limiter class the middleware's __init__ imports in its own body is read there — its arguments are named by that class's parameters" <<'PY'
def local(d):
    (d / "middleware/window.py").write_text("class Window2:\n    def __init__(self, limit: int, window_seconds: float) -> None:\n        self._limit = limit\n\n    def allow(self, key, now):\n        return True\n")
    patch(d, "middleware/limit.py", "        self._hot = Window(s.hot_per_minute, s.window_seconds)\n",
          "        from middleware.window import Window2 as W2\n        self._hot = W2(s.hot_per_minute, s.window_seconds)\n")
hot = next(x for x in ep(build(variant("localwin", local)), "endpoint:POST /shop/place")["rate"]["limits"] if x.get("limiter") == "_hot")
assert hot["class"] == "W2" and [(a["param"], a["value"], a["state"]) for a in hot["args"]] == [("limit", 5, "default"), ("window_seconds", 60.0, "default")], hot
PY

py "E9 · FIRE: K4 — each exit's media, body and headers: a response model, a literal response, a security 401, a refusal, a 422, a 500" <<'PY'
f = build(A)
e = ep(f, "endpoint:POST /shop/place")
rs = e["responses"]
by = {r["id"]: r for r in e["produced"]}
ret = next(r for r in e["returns"] if r["depth"] == 0)
assert rs[ret["id"]] == {"status": 200, "media": "application/json", "model": "OrderOut", "fields": ["id", "key"], "source": at("schemas.py", "class OrderOut")}, rs[ret["id"]]
sec = next(i for i, r in by.items() if r["phase"] == "security")
assert rs[sec]["headers"] == {"WWW-Authenticate": "Bearer"} and rs[sec]["status"] == 401, rs[sec]
lim = next(i for i, r in by.items() if r["status"] == 429)
assert rs[lim]["body"] == {"detail": "…"} and rs[lim]["headers"] == {"Retry-After": "…"} and rs[lim]["media"] == "application/json", rs[lim]
ref = next(i for i, r in by.items() if r["status"] == 403)
assert rs[ref] == {"status": 403, "media": "application/json", "body": {"detail": "…"}, "source": "fastapi/exception_handlers.py:11-17"}, rs[ref]
unc = next(i for i, r in by.items() if r["phase"] == "uncaught")
assert rs[unc]["media"] == "text/plain" and rs[unc]["body"] == "Internal Server Error", rs[unc]
m = ep(f, "endpoint:POST /shop/made")
v422 = next(r["id"] for r in m["produced"] if r["phase"] == "validation")
assert m["responses"][v422]["body"] == {"detail": "list"} and m["responses"][v422]["status"] == 422, m["responses"][v422]
mr = next(r for r in m["returns"] if r["depth"] == 0)
assert m["responses"][mr["id"]]["body"] == {"x": "…"} and m["responses"][mr["id"]]["headers"] == {"Location": "…"}, m["responses"][mr["id"]]
fd = ep(f, "endpoint:GET /shop/feed")
fr = next(r for r in fd["returns"] if r["depth"] == 0)
assert fd["responses"][fr["id"]] == {"status": 200, "media": "n/a"}, fd["responses"][fr["id"]]   # a stream has no body shape
PY

py "E10 · FIRE + SILENT: K2 — the scheme and its carrier, the gate, what a gate's return class requires, what the dependency provisions; auto_error=False takes the scheme away" <<'PY'
f = build(A)
a = ep(f, "endpoint:POST /shop/place")["auth"]
assert [(s["scheme"], s["carrier"], s["header"], s["status"]) for s in a["schemes"]] == [("HTTPBearer", "header", "Authorization", 401)], a["schemes"]
assert [g["name"] for g in a["gates"]] == ["get_current_ctx"], a["gates"]
assert [(r["method"], r["status"]) for r in a["requires"]] == [("Ctx.require_team", 403)], a["requires"]
assert [(p["table"], p["state"], p["committed_at"]) for p in a["provisions"]] == [("notes", "committed", at("auth.py", "session.commit()"))], a["provisions"]
assert ep(f, "endpoint:GET /shop/look")["auth"]["state"] == "none"
off = build(variant("noauto", lambda d: patch(d, "auth.py", "bearer = HTTPBearer()", "bearer = HTTPBearer(auto_error=False)")))
o = ep(off, "endpoint:POST /shop/place")
assert o["auth"]["schemes"] == [] and not any(p["phase"] == "security" for p in o["paths"]), (o["auth"], [p["phase"] for p in o["paths"]])
PY

py "E11 · mutation: a claim's flush wrapped in an IntegrityError catch takes race-500 away" <<'PY'
g = build(variant("wrapped", lambda d: patch(d, "services/orders.py", "    session.add(order)\n    session.flush()\n    return order",
                                               "    session.add(order)\n    try:\n        session.flush()\n    except IntegrityError:\n        return None\n    return order")))
assert race500(g) == [], race500(g)
assert ep(g, "endpoint:POST /shop/place")["repeat"]["claims"][0]["race"] == "handled"
PY

py "E12 · honest-empty + determinism: contract off writes none of its blocks; two builds agree" <<'PY'
off = build(A, arms="paths,effects")
assert not any(k in v for e in off["endpoints"].values() for v in (e.get("variants") or [e]) for k in ("repeat", "auth", "rate", "responses")), "a contract block rode a contract-off build"
a1, a2 = build(A), build(A)
assert json.dumps(a1, sort_keys=True) == json.dumps(a2, sort_keys=True), "two builds differ"
assert a1["arms"]["contract"]["present"] and a1["arms"]["contract"]["bytes"] > 0, a1["arms"]["contract"]
PY

echo "forms-contract: $pass passed, $fail failed"
[ "$fail" -eq 0 ] || exit 1
