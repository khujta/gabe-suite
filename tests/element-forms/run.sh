#!/usr/bin/env bash
# Element forms battery — _a3_paths.py's executable contract (docs/design/element-forms/plan.md §3.4).
#
# The pass reads what a FastAPI endpoint DECIDES: every refusal it can produce (U7), what it declares
# against what it produces (K1), and the guards in its body that end in a refusal (U3). Every case
# below is a shape the gustify dry-run met first:
#   · a service error translated to a status in the handler's except — the 409 must say WHERE it was
#     raised, and the guard behind it is a precondition too
#   · a method on a dependency-returned object (`ctx.require_household()`) — the 409 lives one call down
#   · two refusals on one status told apart only by their text (the setup endpoint's two 409s)
#   · a raise two levels down must NEVER become a row — the pass reads one call level, and says so
# Hermetic: a synthetic FastAPI tree, AST only (FastAPI need not be installed). Exit 0 = all pass.
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
GEN="${GEN_OVERRIDE:-$REPO/templates/center/generators}"

T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
pass=0; fail=0
ok()  { pass=$((pass+1)); }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }

A="$T/app"
mkdir -p "$A/api" "$A/services" "$A/middleware" "$A/docs/site/center"
cat > "$A/docs/site/center/center.config.json" <<'JSON'
{"entities": {"items": {"code": {"api": ["api/*.py"]}}}}
JSON
cat > "$A/uv.lock" <<'LOCK'
version = 1

[[package]]
name = "fastapi"
version = "0.136.3"
LOCK
cat > "$A/errors.py" <<'PYF'
from enum import Enum


class CodedError(Exception):
    pass


class LockedError(Exception):
    status = 423


class HeldError(LockedError):
    pass


class RetiredError(Exception):
    pass


class GoneError(Exception):
    pass


class SpentError(Exception):
    pass


class ErrCode(Enum):
    SPENT = ("SPENT", 402)

    def detail(self, message: str) -> dict:
        return {"error_code": self.value[0], "detail": message}


METER_LIMIT = "3/hour"
TIERS = ["6/hour", "20/day"]

PYF
cat > "$A/main.py" <<'PYF'
from fastapi import FastAPI
from fastapi.responses import JSONResponse

from errors import CodedError, ErrCode, SpentError
from middleware.throttle import Throttle

app = FastAPI()
app.add_middleware(Throttle)


@app.exception_handler(CodedError)
async def coded_handler(request, exc):
    return JSONResponse(status_code=422, content={"code": "coded", "detail": "coded failure"})


@app.exception_handler(SpentError)
async def spent_handler(request, exc):
    return JSONResponse(status_code=402, content={"message": str(exc), **ErrCode.SPENT.detail(str(exc))})
PYF
cat > "$A/middleware/throttle.py" <<'PYF'
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

HOT = ("/items/apply",)


def is_hot(path):
    return path.startswith(HOT)


class Throttle(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if is_hot(request.url.path):
            return JSONResponse(status_code=429, content={"detail": "slow down"})
        return await call_next(request)
PYF
cat > "$A/auth.py" <<'PYF'
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer

bearer = HTTPBearer(auto_error=True)


class BadToken(Exception):
    pass


class Ctx:
    team = None

    def require_team(self):
        if self.team is None:
            raise HTTPException(status.HTTP_409_CONFLICT, "team required")
        return self.team


def decode(token):
    raise BadToken()


def get_ctx(creds=Depends(bearer)) -> Ctx:
    try:
        decode(creds)
    except BadToken:
        raise HTTPException(401, "bad token")
    return Ctx()
PYF
cat > "$A/services/items.py" <<'PYF'
from fastapi import HTTPException

from errors import CodedError


class Busy(Exception):
    pass


class Lost(Exception):
    pass


def cleanup():
    return None


def apply(x):
    if x.done:
        return x
    if x.busy:
        raise Busy("busy now")
    try:
        x.save()
    except Exception:
        cleanup()
        raise
    return x


def _inner():
    raise Lost()


def deep():
    return _inner()


def guard():
    raise HTTPException(403, "no")


def coded():
    raise CodedError()


class Denied(HTTPException):
    def __init__(self, detail):
        super().__init__(status_code=403, detail=detail)


def deny(err):
    raise err


def lock():
    from errors import LockedError
    raise LockedError()


def scrub(tag, allowed=None):
    if allowed is not None and tag not in allowed:
        raise HTTPException(422, "tag not allowed")
    return tag


def fetch(item_id, include_deleted=False):
    if not include_deleted:
        raise Lost("deleted items are hidden")
    if item_id < 0:
        raise Lost("bad id")
    return item_id


def pick_one(item_id):
    if item_id < 0:
        raise Busy("negative")
    if item_id == 0:
        raise HTTPException(410, "gone")
    return item_id
PYF
cat > "$A/services/gate.py" <<'PYF'
def forbid(flag):
    from services.items import Denied
    if flag:
        raise Denied("scoped no")
    return flag


def hold_on(flag):
    from errors import HeldError
    if flag:
        raise HeldError()
    return flag
PYF
cat > "$A/api/items.py" <<'PYF'
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from slowapi import Limiter

from auth import Ctx, get_ctx
from errors import METER_LIMIT, TIERS
from services.items import Busy, Denied, Lost, apply, coded, deep, deny, fetch, guard, lock, scrub

router = APIRouter(prefix="/items")


class Body(BaseModel):
    name: str


@router.post("/apply", status_code=status.HTTP_201_CREATED)
async def post_apply(request: Request, body: Body, ctx: Annotated[Ctx, Depends(get_ctx)]):
    key = request.headers.get("k")
    if key is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "key required")
    try:
        return apply(body)
    except Busy as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "item_busy"}) from exc


@router.get("/team")
async def get_team(ctx: Annotated[Ctx, Depends(get_ctx)]):
    return ctx.require_team()


@router.get("/dynamic")
async def get_dynamic(request: Request, code: int, x: str):
    raise HTTPException(status_code=code, detail=f"bad {x}")


@router.get("/deep")
async def get_deep(request: Request):
    return deep()


@router.get("/swallow")
async def get_swallow(request: Request):
    try:
        guard()
    except Exception:
        return {"ok": False}


@router.get("/coded")
async def get_coded(request: Request):
    return coded()


@router.get("/locked")
async def get_locked(request: Request):
    return lock()


@router.get("/denied")
async def get_denied(request: Request):
    if request.headers.get("x") is None:
        raise Denied("no x")
    return deny(ValueError("v"))


@router.get("/loose")
async def get_loose(tag: str):
    return scrub(tag)


@router.get("/strict")
async def get_strict(tag: str):
    return scrub(tag, allowed=("fresh",))


@router.get("/kept")
async def get_kept(item_id: int):
    try:
        return fetch(item_id, include_deleted=True)
    except Lost as exc:
        raise HTTPException(404, "not found") from exc


@router.get("/leak")
async def get_leak(item_id: int):
    return fetch(item_id, include_deleted=True)


@router.get("/maybe")
async def get_maybe(item_id: int, keep: bool = False):
    return fetch(item_id, include_deleted=keep)


def _chunks(item_id: int):
    yield b"a"
    if item_id < 0:
        raise Lost("stream broke")
    yield b"b"


@router.get("/stream")
async def get_stream(item_id: int):
    return StreamingResponse(_chunks(item_id))


@router.get("/stream2")
async def get_stream2(item_id: int):
    body = _chunks(item_id)
    return StreamingResponse(body, media_type="text/event-stream")


limiter = Limiter(key_func=lambda r: "k")


@router.get("/limited")
@limiter.limit("5/minute")
async def get_limited(request: Request):
    return {"ok": True}


@router.get("/pooled")
@limiter.shared_limit("10/minute", scope="items")
async def get_pooled(request: Request):
    return {"ok": True}


@router.get("/metered")
@limiter.limit(METER_LIMIT, key_func=lambda r: "k")
async def get_metered(request: Request):
    return {"ok": True}


@router.get("/tiered")
@limiter.limit(TIERS[0], key_func=lambda r: "k")
@limiter.limit(TIERS[1], key_func=lambda r: "k")
async def get_tiered(request: Request):
    return {"ok": True}


@router.get("/scoped")
async def get_scoped(item_id: int):
    from services.gate import forbid
    from services.items import pick_one
    forbid(item_id)
    try:
        return pick_one(item_id)
    except Busy as exc:
        raise HTTPException(409, "scoped busy") from exc


@router.get("/unscoped")
async def get_unscoped(item_id: int):
    return pick_one(item_id)


@router.get("/held")
async def get_held(flag: int):
    from errors import LockedError
    from services.gate import hold_on
    try:
        return hold_on(flag)
    except LockedError:
        raise HTTPException(423, "held")


@router.get("/held2")
async def get_held2(flag: int):
    from services.gate import hold_on
    return hold_on(flag)


@router.get("/retired")
async def get_retired(flag: int):
    from errors import ErrCode, GoneError, RetiredError
    code = ErrCode("x")
    if flag:
        raise RetiredError()
    raise GoneError(code)


@router.get("/caught")
async def get_caught(flag: int):
    from errors import HeldError, LockedError
    try:
        if flag:
            raise HeldError()
    except LockedError:
        return {"kept": True}
    return {"ok": True}
PYF
mkdir -p "$A/api/errors"
cat > "$A/api/errors/handlers.py" <<'PYF'
from fastapi.responses import JSONResponse

from errors import LockedError


def as_response(exc):
    return JSONResponse(status_code=exc.status, content={"code": "locked"})


def register(app):
    @app.exception_handler(LockedError)
    async def locked(request, exc):
        return as_response(exc)
PYF
cat > "$A/api/errors/late.py" <<'PYF'
from errors import GoneError, RetiredError


def register_late(app):
    from api.errors.render import retired_response
    app.add_exception_handler(RetiredError, retired_response)
    app.add_exception_handler(GoneError, gone_handler)


def gone_handler(request, exc):
    from api.errors.render import to_gone
    return to_gone(exc)
PYF
cat > "$A/api/errors/render.py" <<'PYF'
from fastapi.responses import JSONResponse


def retired_response(request, exc):
    return JSONResponse(status_code=410, content={"code": "retired"})


def to_gone(exc):
    return JSONResponse(status_code=404, content={"code": "gone"})
PYF
cat > "$A/api/plain.py" <<'PYF'
from fastapi import APIRouter, Request

router = APIRouter(prefix="/plain")


@router.get("")
async def get_plain(request: Request):
    return {"ok": True}
PYF

cat > "$A/api/files.py" <<'PYF'
from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from errors import SpentError

router = APIRouter(prefix="/files")
_BASE = "/kept"
_ROUTES = {"pick": "/pick"}


class FileMeta(BaseModel):
    name: str


class CsvResponse(Response):
    media_type = "text/csv"


@router.get("/raw")
def raw_file() -> Response:
    return Response(content=b"x", media_type="application/octet-stream")


@router.get("/sheet")
def sheet_file() -> CsvResponse:
    return CsvResponse(content=b"a,b")


@router.get("/meta", response_model=FileMeta, responses={200: {"model": FileMeta}, 404: {"description": "gone"}})
def file_meta() -> Response:
    return JSONResponse({"name": "x"})


@router.get(_BASE + "/{name}")
def kept_file(name: str) -> FileMeta:
    return FileMeta(name=name)


@router.post(_ROUTES["pick"])
def pick_file() -> FileMeta:
    return FileMeta(name="p")


@router.get("/spent")
def spent_file() -> FileMeta:
    raise SpentError("out of credit")
PYF

# the shared driver: parse the tree the way the build does, run the pass, dump JSON
cat > "$T/drive.py" <<'PYF'
import json, pathlib, sys
repo = pathlib.Path(sys.argv[1])
import _a3_code as C
import _a3_paths as P
files = sorted(str(p.relative_to(repo)) for p in (repo / "api").glob("*.py"))
amap = {"entities": {"items": {"endpoints": C.parse_endpoints(repo, files)}},
        "app_middleware": C.parse_app_middleware(repo)}
for ep in amap["entities"]["items"]["endpoints"]:
    ep.pop("refs", None)
print(json.dumps({"amap": amap, "forms": P.build(amap, repo)}, sort_keys=True))
PYF
drive() { (cd "$GEN" && PYTHONPATH="$GEN" GABE_REPO_ROOT="$1" python3 "$T/drive.py" "$1"); }
drive "$A" > "$T/out.json" 2>"$T/err.txt" || { echo "FAIL: the pass did not run: $(tail -3 "$T/err.txt")"; exit 1; }

check() {  # check "<name>" <<'PY' … PY   (python reads O = the forms feed, E(id) = one endpoint)
  local name="$1" src; src=$(cat)
  if GEN="$GEN" APP="$A" python3 - "$T/out.json" >"$T/check.txt" 2>&1 <<PY
import json, sys
D = json.load(open(sys.argv[1])); O = D["forms"]
def E(k): return O["endpoints"][k]
def rows(k, **kw): return [r for r in E(k)["produced"] if all(r.get(a) == b for a, b in kw.items())]
def fid(k): return {f["id"] for f in E(k)["findings"]}
$src
print("ok")
PY
  then ok; else bad "$name: $(tail -4 "$T/check.txt")"; fi
}

check "C0 · the pass runs and forms every endpoint" <<'PY'
assert O["present"] is True, O
assert O["framework"]["locks"] == {"uv.lock": "0.136.3"}, O["framework"]
assert O["stats"]["endpoints"] == 32 and O["stats"]["unformed"] == 0 and O["stats"]["collisions"] == 0, O["stats"]
assert set(O["endpoints"]) == {"endpoint:POST /items/apply", "endpoint:GET /items/team", "endpoint:GET /items/dynamic",
    "endpoint:GET /items/deep", "endpoint:GET /items/swallow", "endpoint:GET /items/coded", "endpoint:GET /items/denied",
    "endpoint:GET /items/locked", "endpoint:GET /plain", "endpoint:GET /files/raw", "endpoint:GET /files/sheet",
    "endpoint:GET /files/meta", "endpoint:GET /files/spent", "endpoint:GET /files", "endpoint:POST /files", "endpoint:GET /items/loose", "endpoint:GET /items/strict",
    "endpoint:GET /items/kept", "endpoint:GET /items/leak", "endpoint:GET /items/maybe",
    "endpoint:GET /items/stream", "endpoint:GET /items/stream2", "endpoint:GET /items/limited", "endpoint:GET /items/pooled", "endpoint:GET /items/metered", "endpoint:GET /items/tiered",
    "endpoint:GET /items/scoped", "endpoint:GET /items/unscoped", "endpoint:GET /items/held", "endpoint:GET /items/held2",
    "endpoint:GET /items/caught", "endpoint:GET /items/retired"}, sorted(O["endpoints"])
PY

check "C1 · FIRE: a handler raise is a text-only refusal, its guard a precondition, the body a 422" <<'PY'
k = "endpoint:POST /items/apply"
r = rows(k, status=400)
assert len(r) == 1 and r[0]["state"] == "defined" and r[0]["form"] == "text" and not r[0].get("code"), r
assert r[0]["detail"] == "key required" and r[0]["pred"] == "key is None", r[0]
assert any(g["pred"] == "key is None" and g["depth"] == 0 for g in E(k)["preconditions"]), E(k)["preconditions"]
v = rows(k, status=422)
assert v and v[0]["state"] == "default" and v[0]["params"] == ["body"], v
PY

check "C2 · FIRE+SILENT: a translated service error carries its code, its raise site and its guard" <<'PY'
k = "endpoint:POST /items/apply"
r = rows(k, status=409)
assert len(r) == 1, r
assert r[0]["code"] == "item_busy" and r[0]["source"] == "verified", r[0]
assert r[0]["raised_at"].startswith("services/items.py:"), r[0]
assert E(k)["declared"]["success"] == {"status": 201, "state": "defined"}, E(k)["declared"]
und = [f for f in E(k)["findings"] if f["id"] == "undeclared"]
assert und and und[0]["statuses"] == [400, 401, 409, 429], und
g = [g for g in E(k)["preconditions"] if g["pred"] == "x.busy"]
assert g and g[0]["depth"] == 1 and g[0]["after"] == ["not (x.done)"], E(k)["preconditions"]
t = rows(k, status=429)
assert t and t[0]["scope"] == ["/items/apply"] and t[0]["phase"] == "middleware", t
assert "text-only" in fid(k) and "shared-status" not in fid(k), E(k)["findings"]
PY

check "C3 · FIRE: a method on a dependency-returned object, the bearer default, an unverified translation" <<'PY'
k = "endpoint:GET /items/team"
r = rows(k, status=409)
assert r and r[0]["via"].startswith("call Ctx.require_team") and r[0]["pred"] == "self.team is None", r
b = rows(k, phase="security")
assert b and b[0]["status"] == 401 and b[0]["state"] == "default", b
d = rows(k, phase="dependency")
assert d and d[0]["status"] == 401 and d[0]["source"] == "unverified" and d[0]["detail"] == "bad token", d
assert not rows(k, status=429), "HOT scope leaked onto /items/team"
PY

check "C4 · SILENT: a bare endpoint reads n/a everywhere and produces only the uncaught 500" <<'PY'
k = "endpoint:GET /plain"
assert [r["status"] for r in E(k)["produced"]] == [500], E(k)["produced"]
assert E(k)["findings"] == [], E(k)["findings"]
s = E(k)["slots"]
assert s["U7"]["state"] == "n/a" and s["U3"]["state"] == "n/a" and s["K1"]["state"] == "n/a", s
PY

check "C5 · a dynamic status is unknown, a built detail is dynamic — never guessed" <<'PY'
k = "endpoint:GET /items/dynamic"
r = [x for x in E(k)["produced"] if x["phase"] == "handler"]
assert len(r) == 1 and r[0]["status"] is None and r[0]["state"] == "unknown", r
assert r[0]["reason"].startswith("dynamic status") and r[0]["form"] == "dynamic", r[0]
assert O["stats"]["unknown_rows"] >= 1, O["stats"]
PY

check "C6 · the depth floor: a raise two levels down never becomes a row" <<'PY'
k = "endpoint:GET /items/deep"
assert [r["status"] for r in E(k)["produced"]] == [500], E(k)["produced"]
assert "Lost" not in json.dumps(E(k)), "a depth-two raise leaked into the form"
PY

check "C7 · a refusal raised inside a broad except that returns normally is swallowed — and said" <<'PY'
k = "endpoint:GET /items/swallow"
assert not rows(k, status=403), "a swallowed 403 was reported as produced"
assert "http-swallowed" in fid(k), E(k)["findings"]
PY

check "C8 · an app exception handler translates an escaping error" <<'PY'
k = "endpoint:GET /items/coded"
r = [x for x in E(k)["produced"] if x.get("via") == "app handler CodedError"]
assert r and r[0]["status"] == 422 and r[0]["code"] == "coded", E(k)["produced"]
assert "escape-500" not in fid(k), E(k)["findings"]
PY

check "C12 · an HTTPException SUBCLASS is a refusal with its constructor's status; a raised VARIABLE is not a class" <<'PY'
k = "endpoint:GET /items/denied"
r = rows(k, status=403)
assert len(r) == 1 and r[0]["via"] == "raise Denied" and r[0]["state"] == "defined" and r[0]["pred"].startswith("request.headers.get"), E(k)["produced"]
assert "escape-500" not in fid(k), E(k)["findings"]
assert not [x for x in E(k)["produced"] if x.get("via", "").startswith("call deny")], "a raised variable (`raise err`) produced a row"
PY

check "C13 · an app handler registered deep under the routes' top dir, status set at runtime, still translates" <<'PY'
k = "endpoint:GET /items/locked"
r = [x for x in E(k)["produced"] if x.get("via") == "app handler LockedError"]
assert r and r[0]["state"] == "unknown" and r[0]["status"] is None and "status set at runtime" in r[0]["reason"], E(k)["produced"]
assert "escape-500" not in fid(k), E(k)["findings"]
PY

check "C14 · FIRE+SILENT: FastAPI declares no response model for a Response return, and a 2xx `responses={}` key is no refusal" <<'PY'
raw, sheet, meta = E("endpoint:GET /files/raw"), E("endpoint:GET /files/sheet"), E("endpoint:GET /files/meta")
assert raw["declared"]["response_model"] == {"state": "n/a"}, raw["declared"]          # -> Response (routing.py:847-850)
assert sheet["declared"]["response_model"] == {"state": "n/a"}, sheet["declared"]      # -> a project Response subclass
assert meta["declared"]["response_model"] == {"name": "FileMeta", "state": "defined"}, meta["declared"]
assert E("endpoint:GET /files")["declared"]["response_model"] == {"name": "FileMeta", "state": "default"}, "a model return still reads default"
assert meta["declared"]["refusals"] == [404], meta["declared"]                         # the documented 200 is the success shape
d = [f for f in meta["findings"] if f["id"] == "declared-unproduced"]
assert d and d[0]["statuses"] == [404], meta["findings"]                               # a real declared refusal still fires
assert not [f for f in meta["findings"] if f["id"] == "declared-unproduced" and 200 in f["statuses"]], meta["findings"]
PY

check "C15 · FIRE+SILENT: a route path built from a module constant resolves; an unresolved argument says so" <<'PY'
kept, pick = E("endpoint:GET /files"), E("endpoint:POST /files")
assert kept["full_path"] == "/files/kept/{name}" and "full_path_state" not in kept, kept["full_path"]
assert pick["full_path"] == "/files" and pick["full_path_state"] == "unknown", (pick["full_path"], pick.get("full_path_state"))
assert E("endpoint:GET /items/team")["full_path"] == "/items/team" and "full_path_state" not in E("endpoint:GET /items/team")
PY

check "C16 · FIRE+SILENT: a code carried by a double-star Enum-member detail unpack is a code, not text-only" <<'PY'
k = "endpoint:GET /files/spent"
r = rows(k, status=402)
assert len(r) == 1 and r[0]["form"] == "object" and r[0]["code"] == "ErrCode.SPENT", r
assert r[0]["via"] == "app handler SpentError", r[0]
assert "text-only" not in fid(k), E(k)["findings"]
t = rows("endpoint:POST /items/apply", status=400)                                      # a plain string detail stays text
assert t and t[0]["form"] == "text" and not t[0].get("code"), t
PY

check "C17 · FIRE+SILENT: a guard the CALL SITE decides kills the row, the reason and the escape behind it" <<'PY'
loose, strict = "endpoint:GET /items/loose", "endpoint:GET /items/strict"
assert not rows(loose, detail="tag not allowed"), E(loose)["produced"]      # scrub(tag): allowed defaults to None
assert len(rows(strict, detail="tag not allowed")) == 1, E(strict)["produced"]   # scrub(tag, allowed=(…)): live
assert rows(loose, status=422), "the framework's own 422 must survive"      # falsification drops one row, not a status
rl = [f for f in E("endpoint:GET /items/kept")["findings"] if f["id"] == "reason-lost"]
assert len(rl) == 1 and rl[0]["was"] == "bad id", rl                        # include_deleted=True kills the other raise
esc = [f for f in E("endpoint:GET /items/leak")["findings"] if f["id"] == "escape-500"]
assert len(esc) == 1 and esc[0]["cls"] == "Lost", esc                       # one escape, not two
maybe = [f for f in E("endpoint:GET /items/maybe")["findings"] if f["id"] == "escape-500"]
assert len(maybe) == 2, maybe    # SILENT: `include_deleted=keep` passes a NAME — a name holds whatever the request
assert O["stats"]["falsified"] == 3, O["stats"]                             # gave it, so NOTHING is proven dead here
PY

check "C18 · FIRE+SILENT: a raise inside the generator the response streams is not the endpoint's 500 — the status line already went out" <<'PY'
k = "endpoint:GET /items/stream"
assert "escape-500" not in fid(k), E(k)["findings"]
unc = rows(k, phase="uncaught")[0]
assert [x["cls"] for x in unc.get("after_response") or []] == ["Lost"] and not unc.get("causes"), unc
k2 = "endpoint:GET /items/stream2"                                                          # bound to a NAME first
assert "escape-500" not in fid(k2) and [x["cls"] for x in rows(k2, phase="uncaught")[0].get("after_response") or []] == ["Lost"], E(k2)
assert O["stats"]["after_response"] == 2, O["stats"]
leak = [f for f in E("endpoint:GET /items/leak")["findings"] if f["id"] == "escape-500"]      # SILENT: a plain call's
assert len(leak) == 1, leak                                                                    # raise is still the 500
PY

check "C19 · FIRE+SILENT: a third-party limiter on the route is a 429 the route produces — limit and shared_limit alike; a route without one has none" <<'PY'
for k, spec in (("endpoint:GET /items/limited", "5/minute"), ("endpoint:GET /items/pooled", "10/minute")):
    r = rows(k, status=429)
    assert len(r) == 1 and r[0]["form"] == "object" and spec in r[0]["detail"] and r[0]["via"].startswith("decorator limiter."), E(k)["produced"]
    assert r[0]["state"] == "defined" and r[0]["source"] == "framework", r[0]
    assert any(f["id"] == "undeclared" and 429 in f["statuses"] for f in E(k)["findings"]), E(k)["findings"]   # produced, never declared
m = rows("endpoint:GET /items/metered", status=429)
assert len(m) == 1 and "3/hour" in m[0]["detail"] and m[0]["state"] == "defined", m           # the spec imported as a constant resolves one hop
t = rows("endpoint:GET /items/tiered", status=429)
assert sorted(r["detail"] for r in t) == ["{'error': 'Rate limit exceeded: 20/day'}", "{'error': 'Rate limit exceeded: 6/hour'}"] and all(r["state"] == "defined" for r in t), t   # one entry each of a list constant, two decorators → two rows
assert "shared-status" in fid("endpoint:GET /items/tiered"), E("endpoint:GET /items/tiered")["findings"]   # two 429s told apart only by text — a real nag
assert not rows("endpoint:GET /items/loose", status=429), "a route without a limiter mints no 429"
PY

check "C20 · FIRE: a callee the HANDLER imports in its own body is read one call level down — its refusal, its raise the except translates (verified, with the guard behind it), and a class it imports itself to raise is that class" <<'PY'
import re
k = "endpoint:GET /items/scoped"
src = open(__import__("os").environ["APP"] + "/services/items.py").read().splitlines()
busy = next(i + 1 for i, l in enumerate(src) if 'raise Busy("negative")' in l)
t = rows(k, status=409)
assert len(t) == 1 and t[0]["source"] == "verified" and t[0]["raised_at"] == f"services/items.py:{busy}", t
assert any(g["pred"] == "item_id < 0" and g["status"] == 409 and g["depth"] == 1 for g in E(k)["preconditions"]), E(k)["preconditions"]
g = rows(k, status=410)
assert len(g) == 1 and g[0]["depth"] == 1 and g[0]["via"].startswith("call pick_one @ api/items.py:") and g[0]["detail"] == "gone", g
d = rows(k, status=403)
assert len(d) == 1 and d[0]["detail"] == "Denied(…)" and d[0]["via"].startswith("call forbid @ api/items.py:") and d[0]["state"] == "defined" \
    and d[0]["pred"] == "flag" and d[0]["at"] == "services/gate.py:4", E(k)["produced"]
assert not [f for f in E(k)["findings"] if f["id"] == "escape-500"], "a class imported to be raised is still an HTTPException subclass: " + str(E(k)["findings"])
PY

check "C21 · SILENT: another handler that calls the same name WITHOUT importing it reads nothing from it — a local import never leaks out of its function" <<'PY'
k = "endpoint:GET /items/unscoped"
assert sorted((r["phase"], r["status"]) for r in E(k)["produced"]) == [("uncaught", 500), ("validation", 422)], E(k)["produced"]
assert "pick_one" not in json.dumps(E(k)) and E(k)["findings"] == [], E(k)
PY

check "C22 · SILENT: the local scan only ADDS — with it off, every endpoint but the one whose handler imports in its own body is byte-identical (a class imported to be raised that is no HTTPException, /items/locked, included)" <<'PY'
import pathlib, os
sys.path.insert(0, os.environ["GEN"]); os.environ["GABE_REPO_ROOT"] = os.environ["APP"]
import _a3_paths as P, _a3_paths_read as PR
keep = PR._fn_scopes
PR._fn_scopes = lambda mm: []
P.reset_caches()
try:
    off = P.build(D["amap"], pathlib.Path(os.environ["APP"]))
finally:
    PR._fn_scopes = keep
    P.reset_caches()
diff = sorted(k for k in O["endpoints"] if json.dumps(O["endpoints"][k], sort_keys=True) != json.dumps(off["endpoints"].get(k), sort_keys=True))
assert diff == ["endpoint:GET /items/caught", "endpoint:GET /items/held", "endpoint:GET /items/held2", "endpoint:GET /items/retired", "endpoint:GET /items/scoped"], diff
skip = ("rows", "findings", "unknown_rows", "unknown_reasons", "unresolved_calls")
assert {k: v for k, v in O["stats"].items() if k not in skip} == {k: v for k, v in off["stats"].items() if k not in skip}, (O["stats"], off["stats"])
assert O["stats"]["rows"] == off["stats"]["rows"] + 5, (O["stats"]["rows"], off["stats"]["rows"])    # scoped's 403 and 410, held2's and retired's two app-handler rows
assert O["stats"]["unknown_rows"] == off["stats"]["unknown_rows"] + 1, (O["stats"], off["stats"])      # held2's app handler sets its status at runtime
assert O["stats"]["unresolved_calls"] == off["stats"]["unresolved_calls"] + 1, (O["stats"], off["stats"])   # retired's ErrCode("x"): a class its import names
more = {k: O["stats"]["findings"].get(k, 0) - off["stats"]["findings"].get(k, 0) for k in set(O["stats"]["findings"]) | set(off["stats"]["findings"])}
assert {k: v for k, v in more.items() if v} == {"reason-lost": 1, "escape-500": -3, "undeclared": 1}, more   # the 409 knows its raise; caught's catch is seen; retired's two app handlers answer
PY

check "C23 · FIRE: a class a function imports in its own body is read with its BASES where it is raised — the handler's except of the base translates it (verified), an app handler registered for the base answers it, a handler's own except of the base catches it" <<'PY'
import os
src = open(os.environ["APP"] + "/services/gate.py").read().splitlines()
held = "services/gate.py:" + str(next(i + 1 for i, l in enumerate(src) if "raise HeldError()" in l))
t = rows("endpoint:GET /items/held", status=423)
assert len(t) == 1 and t[0]["source"] == "verified" and t[0]["raised_at"] == held and t[0]["via"] == "except LockedError", E("endpoint:GET /items/held")["produced"]
assert "escape-500" not in fid("endpoint:GET /items/held"), E("endpoint:GET /items/held")["findings"]
a = [r for r in E("endpoint:GET /items/held2")["produced"] if r.get("via") == "app handler LockedError"]
assert len(a) == 1 and a[0]["raised_at"] == held and a[0]["source"] == "verified", E("endpoint:GET /items/held2")["produced"]
assert "escape-500" not in fid("endpoint:GET /items/held2"), E("endpoint:GET /items/held2")["findings"]
unc = next(r for r in E("endpoint:GET /items/caught")["produced"] if r["phase"] == "uncaught")
assert "causes" not in unc and "escape-500" not in fid("endpoint:GET /items/caught"), E("endpoint:GET /items/caught")
PY

check "C25 · FIRE: app exception handlers read where they are written — a handler function a register function imports in its own body, a helper a handler imports to build its answer; a class the handler imports and only constructs counts as an unresolved project call" <<'PY'
k = "endpoint:GET /items/retired"
got = sorted((r["status"], r["via"], r["at"], r["source"]) for r in E(k)["produced"] if str(r.get("via", "")).startswith("app handler "))
assert got == [(404, "app handler GoneError", "api/errors/render.py:9", "verified"), (410, "app handler RetiredError", "api/errors/render.py:5", "verified")], got
assert "escape-500" not in fid(k), E(k)["findings"]
assert O["stats"]["unresolved_calls"] == 1, O["stats"]
PY

check "C24 · FIRE+SILENT: a middleware class an app FACTORY imports in its own body is read where add_middleware names it — its exits, its form, the request.state it sets; one imported by another function never is" <<'PY'
import os, pathlib, tempfile
sys.path.insert(0, os.environ["GEN"])
import _a3_code as C, _a3_paths as P, _a3_forms_mw as MW, _a3_forms_contract as CT
r = pathlib.Path(tempfile.mkdtemp())
(r / "app/mw").mkdir(parents=True)
(r / "app/mw/auth.py").write_text(
    "from fastapi.responses import JSONResponse\n\n\nclass AuthMiddleware:\n    async def dispatch(self, request, call_next):\n"
    "        request.state.tenant = request.headers.get('x-tenant')\n        if not request.headers.get('x-key'):\n"
    "            return JSONResponse(status_code=401, content={'detail': 'no key'})\n        return await call_next(request)\n")
(r / "app/main.py").write_text(
    "from fastapi import FastAPI\n\n\ndef create_app():\n    app = FastAPI()\n    from app.mw.auth import AuthMiddleware\n"
    "    app.add_middleware(AuthMiddleware)\n    return app\n\n\ndef other_app():\n    app = FastAPI()\n    app.add_middleware(AuthMiddleware)\n    return app\n")
amap = {"app_middleware": C.parse_app_middleware(r, entity_code={"e": {"api": ["app/main.py"]}})}
assert [(x["cls"], x["line"]) for x in amap["app_middleware"]] == [("AuthMiddleware", 7), ("AuthMiddleware", 13)], amap
st = {"unknown_middleware": []}
ex = P._middleware_exits(r, amap, st)
assert [(x["status"], x["via"]) for x in ex] == [(401, "AuthMiddleware")] and st["unknown_middleware"] == ["AuthMiddleware"], (ex, st)
forms, _, _ = MW.middleware_forms(r, {"endpoints": {}}, amap)
kinds = sorted((f.get("registered_at"), f.get("kind")) for e in forms.values() for f in (e.get("variants") or [e]))
assert kinds == [("app/main.py:13", "unknown"), ("app/main.py:7", "project")], kinds
assert CT._state_setter(r, amap, "tenant") == {"header": "x-tenant", "set_at": "app/mw/auth.py:6", "via": "AuthMiddleware"}, CT._state_setter(r, amap, "tenant")
PY

check "C10a · determinism and no mutation of the archmap it reads" <<'PY'
import copy, pathlib, os
sys.path.insert(0, os.environ["GEN"]); os.environ["GABE_REPO_ROOT"] = os.environ["APP"]
import _a3_paths as P
repo = pathlib.Path(os.environ["APP"])
amap = D["amap"]; before = json.dumps(amap, sort_keys=True)
P.reset_caches(); a = json.dumps(P.build(amap, repo), sort_keys=True)
assert json.dumps(amap, sort_keys=True) == before, "the pass mutated the archmap it read"
rev = copy.deepcopy(amap); rev["entities"]["items"]["endpoints"].reverse()
P.reset_caches(); b = json.dumps(P.build(rev, repo), sort_keys=True)
assert a == b, "endpoint discovery order changed the bytes"
assert a == json.dumps(O, sort_keys=True), "a second run differs from the first"
PY

check "C10b · honest-empty: no endpoints and a missing tree say why, and never raise" <<'PY'
import pathlib, os
sys.path.insert(0, os.environ["GEN"]); os.environ["GABE_REPO_ROOT"] = os.environ["APP"]
import _a3_paths as P
e = P.build({"entities": {}}, pathlib.Path(os.environ["APP"]))
assert e["present"] is False and e["reason"], e
m = P.build({"entities": {"x": {"endpoints": [{"method": "GET", "path": "/", "fn": "f", "file": "nope.py"}]}}},
            pathlib.Path(os.environ["APP"] + "-missing"))
assert m["present"] is True and m["stats"]["unformed"] == 1, m
PY

# ── C9 · mutation: the battery must FAIL when the code it guards changes ─────────────────────────────
M="$T/mut"; cp -r "$A" "$M"
python3 - "$M/api/items.py" "$M/auth.py" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
a = "    try:\n        return apply(body)\n    except Busy as exc:\n        raise HTTPException(status.HTTP_409_CONFLICT, detail={\"code\": \"item_busy\"}) from exc\n"
assert a in s; open(p, "w").write(s.replace(a, "    return apply(body)\n"))
q = sys.argv[2]; t = open(q).read()
assert "HTTPBearer(auto_error=True)" in t; open(q, "w").write(t.replace("HTTPBearer(auto_error=True)", "HTTPBearer(auto_error=False)"))
PY
drive "$M" > "$T/mut.json" 2>/dev/null
if python3 - "$T/mut.json" >"$T/check.txt" 2>&1 <<'PY'
import json, sys
O = json.load(open(sys.argv[1]))["forms"]; f = O["endpoints"]["endpoint:POST /items/apply"]
assert not [r for r in f["produced"] if r.get("status") == 409], "the 409 survived deleting its except"
assert any(x["id"] == "escape-500" and x["cls"] == "Busy" for x in f["findings"]), f["findings"]
unc = [r for r in f["produced"] if r["phase"] == "uncaught"][0]
assert any(c.startswith("Busy ") for c in unc.get("causes", [])), unc
assert not [r for r in f["produced"] if r["phase"] == "security"], "auto_error=False still produced the bearer 401"
print("ok")
PY
then ok; else bad "C9 · mutation — deleting the except and auto_error=False must flip the form: $(tail -3 "$T/check.txt")"; fi

# ── C11 · the review arm: form_drift reads a NEW raise on a diff and classifies it against the committed forms ──
PULSE="$REPO/skills/gabe-pulse/scripts"
if python3 - "$PULSE" "$T/out.json" >"$T/check.txt" 2>&1 <<'PY'
import json, subprocess, sys, tempfile
sys.path.insert(0, sys.argv[1]); import form_drift as FD
forms = json.load(open(sys.argv[2]))["forms"]
diff = """diff --git a/api/items.py b/api/items.py
+++ b/api/items.py
@@ -1,3 +1,9 @@
+    if thing:
+        raise HTTPException(
+            status.HTTP_409_CONFLICT,
+            "item locked",
+        ) from exc
+    raise HTTPException(status_code=409, detail={"code": "locked"})
 unchanged = raise_nothing()
+++ b/docs/notes.md
+raise HTTPException(500, "not python")
"""
new = FD.diff_new_raises(diff)
assert [(n["file"], n["status"], n["form"]) for n in new] == [("api/items.py", 409, "text"), ("api/items.py", 409, "object")], new
assert new[0]["detail"] == "item locked" and new[1]["code"] == "locked", new
drift = FD.classify_new_raises(new, forms)
locked = [d for d in drift if d.get("detail") == "item locked"][0]
assert any(w.startswith("text only") for w in locked["why"]), locked
assert any("shares 409 with 'team required' on GET /items/team" == w for w in locked["why"]), locked["why"]
coded = [d for d in drift if d.get("code") == "locked"][0]
assert not any(w.startswith(("text only", "shares")) for w in coded["why"]), "a coded refusal was called text-only or shared"
assert FD.diff_new_raises("+++ b/api/x.py\n+    return 1\n") == [], "a diff with no raise produced a row"
with tempfile.TemporaryDirectory() as empty:
    out = subprocess.run([sys.executable, sys.argv[1] + "/form_drift.py", empty, "--diff"], capture_output=True, text=True)
    assert out.returncode == 0 and out.stdout.startswith("FORM DRIFT NOT RUN:"), (out.returncode, out.stdout)
s = FD.summary(forms)
assert s["nag"].get("http-swallowed") == 1 and s["count"].get("text-only", 0) >= 1, s
print("ok")
PY
then ok; else bad "C11 · form_drift diff arm + standing summary: $(tail -4 "$T/check.txt")"; fi

echo "element-forms: $pass passed, $fail failed"
[ "$fail" -eq 0 ] || exit 1
