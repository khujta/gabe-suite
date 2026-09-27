#!/usr/bin/env bash
# Forms core battery — the amendment-1 FOUNDATION (docs/design/element-forms/amendment-1.md §A2 Slice 1): the arms
# orchestrator `_a3_forms_build` and the shared leaves every generation arm stands on — ids · settings · catch · reach —
# plus the two sync laws the consumers depend on. K1–K9, each shown to FIRE and to stay SILENT; K6–K9 also mutate
# in-process to prove the guard can fail. Every case below either pins a law of the slice or reproduces a defect the
# Slice 1 review confirmed (F-ids in the case names). Hermetic: a synthetic FastAPI tree, AST only. Exit 0 = all pass.
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
GEN="${GEN_OVERRIDE:-$REPO/templates/center/generators}"

T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
pass=0; fail=0
ok()  { pass=$((pass+1)); }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }

A="$T/app"
mkdir -p "$A/api" "$A/services" "$A/middleware" "$A/scripts" "$A/docs/site/center"
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

HOT = ("/orders",)


def over(request):
    return request.headers.get("x-over") == "1"


class Gate(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.url.path.startswith(HOT):
            if over(request):
                return self._throttled()
        if over(request):
            return self._throttled()
        return await call_next(request)

    def _throttled(self):
        return JSONResponse(status_code=429, content={"detail": "slow down"})
PYF
cat > "$A/config.py" <<'PYF'
from enum import Enum
from typing import ClassVar

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(str, Enum):
    LOCAL = "local"
    PRODUCTION = "production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_")

    environment: Environment = Environment.LOCAL
    limit_enabled: bool = False
    burst: int = Field(default=5)

    @property
    def is_production(self) -> bool:
        return self.environment is Environment.PRODUCTION

    @property
    def limit_active(self) -> bool:
        """Always on in production."""
        return self.limit_enabled or self.is_production

    @property
    def two_returns(self) -> bool:
        if self.limit_enabled:
            return True
        return False

    @property
    def hop1(self) -> bool:
        return self.is_production and self.burst > 1

    @property
    def hop0(self) -> bool:
        return self.hop1 or self.limit_enabled


def get_settings() -> Settings:
    return Settings()


class Child(Settings):
    extra: int = 1


class Global(BaseSettings):
    flag2: bool = True


class LegacySettings(BaseSettings):
    debug: bool = False

    class Config:
        env_prefix = "OLD_"


class DictSettings(BaseSettings):
    model_config = {"env_prefix": "DICT_"}

    region: str = "eu"
    legacy: bool = Field(default=False, validation_alias="LEGACY_FLAG")
    choice: str = Field("x", validation_alias=AliasChoices("A_ONE", "A_TWO"))
    req: str = Field(...)
    items: list = Field(default_factory=list)
    counter: ClassVar[int] = 0


class CaseSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="Cs_", case_sensitive=True)

    flag: bool = False
PYF
cat > "$A/consts.py" <<'PYF'
from typing import Final

OPEN_PATHS: frozenset[str] = frozenset({"/healthz", "/ready"})
LIMIT: Final = 7
GROW = ("/a",)
GROW = GROW + ("/b",)
PYF
cat > "$A/middleware/limit.py" <<'PYF'
from starlette.middleware.base import BaseHTTPMiddleware

from config import Child, Global, Settings, get_settings
from consts import OPEN_PATHS

HOT = ("/orders", "/admin")


def is_hot(path):
    return path.startswith(HOT)


def is_api(req):
    return req.url.path.startswith(HOT)


def second(req, path):
    return path.startswith(HOT)


class Limit(BaseHTTPMiddleware):
    def __init__(self, app, settings: Settings | None = None):
        super().__init__(app)
        s = settings or get_settings()
        self._enabled = s.limit_active
        self._burst = s.burst
        self._twice = s.two_returns
        self._plain = 3
        self._hop = s.hop0
        self._maybe = False
        if app:
            self._maybe = s.limit_enabled
        self._again = False
        self._again = s.burst
        self._aug = s.burst
        self._aug += 1
        t: Settings = settings or get_settings()
        self._typed = t.limit_enabled
        s3 = Settings()
        self._built = s3.burst

    def configure(self, s: Settings):
        self._late = s.limit_enabled

    async def dispatch(self, request, call_next):
        if not self._enabled or request.url.path in OPEN_PATHS:
            return await call_next(request)
        return await call_next(request)


class FromChild:
    def __init__(self, s: Child):
        self._c = s.limit_active


class FromGlobal:
    def __init__(self, s: Global):
        self._g = s.flag2
PYF
cat > "$A/services/orders.py" <<'PYF'
import asyncio
import contextlib


class OrderError(Exception):
    pass


class OtherError(Exception):
    pass


class Stop(BaseException):
    pass


def cleanup(x):
    return x


def notify(x):
    return x


def place(session, x):
    try:
        if x is None:
            raise OrderError
        session.add(x)
    except Exception:
        session.rollback()
        with contextlib.suppress(Exception):
            cleanup(x)
        raise


def convert(x):
    try:
        if x is None:
            raise OrderError
    except OrderError as exc:
        raise OtherError() from exc


def keep(x):
    try:
        if x is None:
            raise OrderError
    except OrderError:
        return None


def nested(x):
    try:
        try:
            raise OrderError
        except OrderError:
            raise
    except OrderError:
        return None


def swallow_with_inner(x):
    try:
        raise OrderError
    except OrderError:
        try:
            notify(x)
        except OSError:
            raise
        for y in notify(x):
            pass
        if notify(x):
            pass
        return None


def base_only():
    try:
        raise Stop
    except Exception:
        return None


def cancelled():
    try:
        raise asyncio.CancelledError
    except Exception:
        return None
PYF
cat > "$A/api/orders.py" <<'PYF'
from fastapi import APIRouter, HTTPException

from services.orders import OrderError, place

router = APIRouter(prefix="/orders")


@router.post("/create")
def create(x: int, y: int):
    if x < 0:
        raise HTTPException(status_code=400, detail="bad input")
    if y < 0:
        raise HTTPException(status_code=400, detail="bad input")
    try:
        place(None, x)
    except OrderError as exc:
        raise HTTPException(status_code=409, detail="order refused") from exc
    return {"ok": True}
PYF
cat > "$A/api/users.py" <<'PYF'
from fastapi import APIRouter

router = APIRouter(prefix="/users")


@router.get("/list")
def list_users():
    return []
PYF
cat > "$A/services/chain.py" <<'PYF'
class Svc:
    def run(self):
        return self.step()

    def step(self):
        return leaf()


def leaf():
    return deeper()


def deeper():
    return deepest()


def deepest():
    return 1
PYF
cat > "$A/api/reach.py" <<'PYF'
from scripts._a3_code import parse_endpoints
from scripts.tooling import helper
from services.chain import Svc


def root(svc: Svc):
    svc.run()
    parse_endpoints()
    helper()
PYF
printf 'def parse_endpoints():\n    return 1\n' > "$A/scripts/_a3_code.py"   # a vendored center generator — never walked
printf 'def helper():\n    return 1\n' > "$A/scripts/tooling.py"                # the project's own script — walked
# K13 · the scoped-import rule: names a function imports in its OWN body (outside api/, so no endpoint changes)
cat > "$A/services/far.py" <<'PYF'
def leaf():
    return 1


def helper():
    return 2


def relay():
    return helper()
PYF
cat > "$A/services/scoped.py" <<'PYF'
from typing import TYPE_CHECKING

from services.chain import leaf


def before():
    leaf()
    from services.far import leaf
    leaf()


def nested():
    from services.far import helper as hh

    def inner():
        return hh()

    return inner


def sibling():
    leaf()
    hh()


def aliased():
    import services.far as ff
    from services.far import helper as hp
    ff.helper()
    hp()


def typed():
    if TYPE_CHECKING:
        from services.far import leaf
    leaf()


def guarded():
    try:
        from services.far import leaf
    except ImportError:
        pass
    leaf()


def shadowed():
    from json import loads as leaf
    leaf()


def chained():
    from services.far import relay
    relay()


def reimport():
    from services.chain import leaf
    leaf()
    from services.far import leaf
    leaf()


def outer_only():
    def inner():
        from services.far import leaf
        return leaf()

    leaf()
    return inner


def dotted():
    import services.sub.deep
    services.pkg_fn()
PYF
mkdir -p "$A/services/sub"
printf 'def pkg_fn():\n    return 1\n' > "$A/services/__init__.py"
printf 'def pkg_fn():\n    return 2\n' > "$A/services/sub/deep.py"
printf '' > "$A/services/sub/__init__.py"

py() {  # py "<name>" <<'PY' … PY   — runs outside $GEN (so GEN_OVERRIDE wins); the prelude gives A · T · REPO · GEN ·
        # forms_of(repo) · hev_of(events) · eps(forms) · writer(key)
  local name="$1" src; src=$(cat)
  if (cd "$T" && PYTHONPATH="$GEN:$REPO/skills/gabe-pulse/scripts:$REPO/skills/gabe-map/scripts" \
        A="$A" T="$T" REPO="$REPO" GEN="$GEN" python3 - >"$T/py.txt" 2>&1 <<PY
import ast, copy, json, os, re, shutil, sys
from pathlib import Path
A, T, REPO, GEN = (Path(os.environ[k]) for k in ("A", "T", "REPO", "GEN"))
os.environ.pop("GABE_FORMS_ARMS", None)
def forms_of(repo):
    import _a3_code as C, _a3_paths as P
    files = sorted(str(p.relative_to(repo)) for p in (repo / "api").glob("*.py"))
    amap = {"head": "abc1234", "entities": {"orders": {"endpoints": C.parse_endpoints(repo, files)}},
            "app_middleware": C.parse_app_middleware(repo, {"orders": {"api": ["api/*.py"]}})}
    for ep in amap["entities"]["orders"]["endpoints"]:
        ep.pop("refs", None)
    return amap, P.build(amap, repo)
def hev_of(evs):
    h = {}
    for e in evs:
        if e["handler"] is not None:
            h.setdefault(id(e["handler"][1]), []).append(e)
    return h
def eps(forms):
    for e in forms["endpoints"].values():
        yield from (e.get("variants") or [e])
def strip_ids(endpoints):
    endpoints = copy.deepcopy(endpoints)
    for v in eps({"endpoints": endpoints}):
        for r in (v.get("produced") or []) + (v.get("preconditions") or []):
            for k in ("id", "exit", "exits"):
                r.pop(k, None)
    return endpoints
def writer(key):
    def run(forms, ctx):
        for v in eps(forms):
            v[key] = list(ctx["parts"]) or key
        return {"stats": {key: 1}}
    return run
$src
PY
  ); then ok; else bad "$name: $(tail -4 "$T/py.txt")"; fi
}

py "K1 · SILENT: no arm selected writes the endpoint forms plus head — nothing else" <<'PY'
import _a3_forms_build as B
assert GEN.as_posix() in B.__file__, B.__file__
amap, raw = forms_of(A)
assert raw["present"] and raw["version"] == 2 and {"endpoint:POST /orders/create", "endpoint:GET /users/list"} <= set(raw["endpoints"]), sorted(raw["endpoints"])
for cfg in ({}, {"forms_arms": {}}, {"forms_arms": {"paths": False}}, {"forms_arms": []}):
    f = B.extend_backend(copy.deepcopy(raw), amap, A, cfg)
    assert "arms" not in f and f["head"] == "abc1234", (cfg, sorted(f))
    assert {k: v for k, v in f.items() if k != "head"} == raw, cfg
os.environ["GABE_FORMS_ARMS"] = "none"
assert "arms" not in B.extend_backend(copy.deepcopy(raw), amap, A, {"forms_arms": {"paths": True}}), "GABE_FORMS_ARMS=none must beat the config"
PY

py "K1 · FIRE: a selection writes the arms envelope — every arm listed, hard needs closed, unknown names named (F7 F36)" <<'PY'
import _a3_forms as F, _a3_forms_build as B
B.RUNNERS.clear()                                  # the bare envelope: no arm is built in this case …
amap, raw = forms_of(A)
assert B.closure({"paths"}, B._built) == {f"paths.{p}" for p in F.ARMS["paths"]["parts"]}, "a unit no runner builds pulled in its needs"
B.RUNNERS["paths"] = lambda forms, ctx: {}         # … but a paths runner that builds every part and writes nothing
f = B.extend_backend(copy.deepcopy(raw), amap, A, {"forms_arms": {"paths": True}})
a = f["arms"]
assert list(a) == list(F.ARM_ORDER) and "frontend" in a, list(a)
assert a["paths"]["present"] is True and a["paths"]["reason"] == "partial — paths: needs kinds.middleware", a["paths"]
assert a["paths"]["parts"] == {**{p: {"present": True, "reason": None} for p in F.ARMS["paths"]["parts"]}, "paths": {"present": False, "reason": "needs kinds.middleware"}}, a["paths"]["parts"]
assert a["kinds"]["reason"] == "not built yet (slice 3) — needed by paths" and a["kinds"]["parts"]["middleware"]["reason"] == "not built yet (slice 3)", a["kinds"]
assert set(a["kinds"]["parts"]) == set(F.ARMS["kinds"]["parts"]) and set(a["short"]["parts"]) == set(F.ARMS["short"]["parts"]), (a["kinds"], a["short"])
assert a["effects"]["reason"] == "switched off" and strip_ids(f["endpoints"]) == raw["endpoints"] and "arm_findings" not in f, sorted(f)
assert f["ids"]["present"] and f["ids"]["x"] > 0 and f["ids"]["g"] > 0, f["ids"]
os.environ["GABE_FORMS_ARMS"] = "ALL, Bogus"
g = B.extend_backend(copy.deepcopy(raw), amap, A, {})
assert list(g["arms"]) == list(F.ARM_ORDER) and g["arms_ignored"] == ["bogus"], (list(g["arms"]), g.get("arms_ignored"))
assert g["arms"]["frontend"]["reason"].startswith("not built yet (slice 11)"), g["arms"]["frontend"]
os.environ["GABE_FORMS_ARMS"] = "bogus"
h = B.extend_backend(copy.deepcopy(raw), amap, A, {})
assert "arms" not in h and h["arms_ignored"] == ["bogus"], sorted(h)
os.environ.pop("GABE_FORMS_ARMS")
assert "paths" in B.extend_backend(copy.deepcopy(raw), amap, A, {"forms_arms": ["Paths"]})["arms"]
assert sorted(B.closure({"contract"})) == ["contract", "effects", "kinds.middleware", "paths.conditions", "paths.framework", "paths.paths", "paths.returns"], sorted(B.closure({"contract"}))
PY

py "K2 · honest-empty: a raising arm restores the feed and reads present:false; the later arms still run" <<'PY'
import _a3_forms as F, _a3_forms_build as B
amap, raw = forms_of(A)
F.ARMS.update({k: {"slice": 0, "parts": ()} for k in ("fake_ok", "fake", "fake_dep", "fake_late")})
F.ARM_STAGES = (("fake_ok", ()), ("fake", ()), ("fake_dep", ()), ("fake_late", ())) + F.ARM_STAGES
F.ARM_ORDER = ("fake_ok", "fake", "fake_dep", "fake_late") + F.ARM_ORDER
F.ARM_NEEDS = {**F.ARM_NEEDS, "fake_dep": ("fake",), "fake_late": ("fake_ok",)}
def boom(forms, ctx):
    forms["endpoints"]["endpoint:POST /orders/create"]["half"] = 1
    forms["junk"] = {}
    forms["arm_findings"]["fake"] = [1]
    raise ValueError("boom")
def finder(key):
    def run(forms, ctx):
        writer(key)(forms, ctx)
        forms["arm_findings"][key] = [{"id": key}]
        next(eps(forms))["arm_findings"][key] = [{"id": key}]
        return {"stats": {"endpoints": len(forms["endpoints"])}}
    return run
B.RUNNERS.update({"fake": boom, "fake_ok": finder("fake_ok"), "fake_late": finder("fake_late"), "fake_dep": writer("fake_dep")})
os.environ["GABE_FORMS_ARMS"] = "fake,fake_dep,fake_late"
f = B.extend_backend(copy.deepcopy(raw), amap, A, {})
a = f["arms"]
assert a["fake"]["present"] is False and a["fake"]["reason"] == "error: ValueError: boom", a["fake"]
assert a["fake_dep"]["reason"] == "needs fake", a["fake_dep"]
assert a["fake_late"]["present"] is True and a["fake_late"]["stats"] == {"endpoints": len(raw["endpoints"])} and a["fake_late"]["bytes"] > 0, a["fake_late"]
assert a["fake_ok"] == {"present": False, "reason": "switched off — computed in memory for fake_late", "version": 1, "options": {}, "stats": {}}, a["fake_ok"]
assert "junk" not in f and f["arm_findings"] == {"fake_late": [{"id": "fake_late"}]}, (sorted(f), f.get("arm_findings"))
bare = strip_ids(f["endpoints"])
for v in eps({"endpoints": bare}):
    assert v.pop("fake_late") == "fake_late" and "half" not in v and "fake_ok" not in v, sorted(v)
    af = v.pop("arm_findings", None)
    assert af in (None, {"fake_late": [{"id": "fake_late"}]}), af
assert bare == raw["endpoints"], "the endpoints are not the snapshot plus the selected arm's keys"
def explode(*a, **k):
    raise RuntimeError("machinery")
B.closure = explode
g = B.extend_backend(copy.deepcopy(raw), amap, A, {})
assert g["arms_error"] == "RuntimeError: machinery" and g["endpoints"] == raw["endpoints"] and g["head"] == "abc1234", sorted(g)
PY

py "K2 · isolation: sibling parts run past a failed need; unwritable data restores; runners never touch amap; no half-merged stats (F1 F2 F4 F5 F6)" <<'PY'
import _a3_forms_build as B
amap, raw = forms_of(A)
def run(env, runners):
    B.RUNNERS.clear(); B.RUNNERS.update(runners)
    os.environ["GABE_FORMS_ARMS"] = env
    mine = copy.deepcopy(amap)
    f = B.extend_backend(copy.deepcopy(raw), mine, A, {})
    json.dumps(f, sort_keys=True, ensure_ascii=False)
    return f, mine
def boom(forms, ctx):
    raise ValueError("boom")
f, _ = run("kinds", {"kinds": writer("kinds_k"), "paths": writer("paths_k"), "effects": boom})
k = f["arms"]["kinds"]
assert k["parts"]["tasks"]["present"] and k["parts"]["handlers"]["reason"] == "needs effects" and k["parts"]["functions"]["reason"] == "needs effects", k["parts"]   # handlers read the publisher's effects steps (Slice 8)
assert k["present"] and k["reason"].startswith("partial — functions: needs effects"), k
assert all(v["kinds_k"] == ["tasks"] for v in eps(f))   # the stage runs only the part whose needs held
def setter(forms, ctx):
    for v in eps(forms):
        v["paths_k"] = {"a"}
f, _ = run("paths", {"kinds": writer("kinds_k"), "paths": setter})
assert f["arms"]["paths"]["reason"].startswith("error: TypeError") and not any("paths_k" in v for v in eps(f)), f["arms"]["paths"]
def mutate(forms, ctx):
    ctx["amap"]["entities"]["orders"]["endpoints"].clear()
    raise ValueError("after mutating")
f, mine = run("paths", {"kinds": writer("kinds_k"), "paths": mutate})
assert mine == amap, "a runner edited the caller's archmap"
f, _ = run("paths", {"kinds": writer("kinds_k"), "paths": lambda forms, ctx: {"stats": {"leak": 1}, "version": "x"}})
assert f["arms"]["paths"]["stats"] == {} and not f["arms"]["paths"]["present"], f["arms"]["paths"]
def late(forms, ctx):
    if "tasks" in ctx["parts"]:
        raise RuntimeError("late")
    return writer("kinds_k")(forms, ctx)
f, _ = run("kinds", {"kinds": late, "paths": writer("paths_k"), "effects": writer("effects_k")})
assert f["arms"]["kinds"]["present"] and f["arms"]["kinds"]["reason"].startswith("partial — functions: error: RuntimeError: late"), f["arms"]["kinds"]
PY

py "K2 · needed-only data never reaches the file; a selected arm writing inside a needed one keeps its host and says so (F3 F30)" <<'PY'
import _a3_forms_build as B
amap, raw = forms_of(A)
def run(env, runners):
    B.RUNNERS.clear(); B.RUNNERS.update(runners)
    os.environ["GABE_FORMS_ARMS"] = env
    return B.extend_backend(copy.deepcopy(raw), copy.deepcopy(amap), A, {})
def paths(forms, ctx):
    for v in eps(forms):
        v["paths"] = [{"id": "p1"}]
        v["arm_findings"]["paths"] = [{"id": "pf"}]
def effects(forms, ctx):
    for v in eps(forms):
        v["paths"][0]["effects"] = 1
        v["arm_findings"]["effects"] = [{"id": "ef"}]
    forms["steps"] = {"st:1": 1}
f = run("paths,contract", {"kinds": writer("kinds_k"), "paths": paths, "effects": effects, "contract": writer("contract_k")})
for v in eps(f):
    assert v["paths"] == [{"id": "p1"}] and "kinds_k" not in v and v["contract_k"] == "contract_k", v
    assert v["arm_findings"] == {"paths": [{"id": "pf"}]}, v["arm_findings"]
assert "steps" not in f and "arm_findings" not in f, sorted(f)
assert f["arms"]["effects"]["reason"] == "switched off — computed in memory for contract", f["arms"]["effects"]
assert f["arms"]["kinds"]["reason"] == "switched off — computed in memory for contract, paths", f["arms"]["kinds"]
assert f["arms"]["contract"]["bytes"] > 0 and f["arms"]["paths"]["bytes"] > 0, f["arms"]
def rich(forms, ctx):
    for v in eps(forms):
        v["paths"] = [{"id": "p1", "rich": 1}]
def tests(forms, ctx):
    for v in eps(forms):
        v["paths"][0]["tests"] = [1]
f = run("tests", {"kinds": writer("kinds_k"), "paths": rich, "tests": tests})
assert all(v["paths"] == [{"id": "p1", "rich": 1, "tests": [1]}] for v in eps(f)), list(eps(f))
assert f["arms"]["paths"]["present"] and f["arms"]["paths"]["reason"] == "needed by tests; written only where tests writes inside it", f["arms"]["paths"]
PY

py "K3 · ids: a middleware exit filtered per endpoint keeps ONE id everywhere, and one id names one exit (F10)" <<'PY'
import _a3_forms_ids as I
amap, f = forms_of(A)
ids = I.x_ids(A, f)
by_site, users = {}, None
for k, e in f["endpoints"].items():
    for vi, v in enumerate(e.get("variants") or [e]):
        assert len(ids[k][vi]) == len(v["produced"]), k
        for r, i in zip(v["produced"], ids[k][vi]):
            if r.get("phase") == "middleware":
                by_site.setdefault(r["site"], set()).add(i)
                if k == "endpoint:GET /users/list":
                    users = r["site"]
assert len(by_site) == 2 and users in by_site, by_site
assert all(len(v) == 1 for v in by_site.values()) and len(set().union(*by_site.values())) == 2, by_site
assert all(re.fullmatch(r"x:[0-9a-f]{10}", i) for rows in ids.values() for vs in rows for i in vs)
PY

py "K3 · ids: identical tuples told apart by n; a line move keeps every id" <<'PY'
import _a3_forms_ids as I
def ids(repo):
    amap, f = forms_of(repo)
    e = f["endpoints"]["endpoint:POST /orders/create"]
    return dict(zip(I.x_ids(repo, f)["endpoint:POST /orders/create"][0], [(r.get("status"), r.get("detail"), r.get("at")) for r in e["produced"]]))
def variant(name, edit):
    d = T / name
    shutil.rmtree(d, ignore_errors=True)
    shutil.copytree(A, d)
    edit(d)
    return ids(d)
base = ids(A)
b400 = sorted((v[2], k) for k, v in base.items() if v[0] == 400)
assert len(b400) == 2 and b400[0][1] != b400[1][1], base
def prepend(d):
    for rel in ("api/orders.py", "services/orders.py", "middleware/gate.py"):
        p = d / rel
        p.write_text("\n" * 7 + p.read_text())
drift = variant("drift", prepend)
assert set(drift) == set(base), (base, drift)
assert all(drift[k][2] != base[k][2] for k in base if base[k][2]), "the fixture did not move the rows"
PY

py "K3 · FIRE: a detail edit changes exactly that id; removing a duplicate shifts n back" <<'PY'
import _a3_forms_ids as I
def ids(repo):
    amap, f = forms_of(repo)
    e = f["endpoints"]["endpoint:POST /orders/create"]
    return dict(zip(I.x_ids(repo, f)["endpoint:POST /orders/create"][0], [(r.get("status"), r.get("detail"), r.get("at")) for r in e["produced"]]))
def variant(name, edit):
    d = T / name
    shutil.rmtree(d, ignore_errors=True)
    shutil.copytree(A, d)
    edit(d)
    return ids(d)
base = ids(A)
def reword(d):
    p = d / "api/orders.py"
    p.write_text(p.read_text().replace('"order refused"', '"order declined"'))
rew = variant("reword", reword)
gone, new = set(base) - set(rew), set(rew) - set(base)
assert len(gone) == 1 and len(new) == 1, (base, rew)
assert base[gone.pop()][1] == "order refused" and rew[new.pop()][1] == "order declined"
def undup(d):
    p = d / "api/orders.py"
    s = p.read_text()
    dup = '    if y < 0:\n        raise HTTPException(status_code=400, detail="bad input")\n'
    assert s.count(dup) == 1
    p.write_text(s.replace(dup, ""))
und = variant("undup", undup)
b400 = sorted((v[2], k) for k, v in base.items() if v[0] == 400)
assert [k for k, v in und.items() if v[0] == 400] == [b400[0][1]], (b400, und)
assert I.via_sym("call Svc.run @ services/chain.py:3") == "call Svc.run" and I.via_sym(None) is None
PY

py "K4 · settings: self.<attr> → the fields behind it, properties expanded to a fixed point, env names; constants resolve (F15 F19–F22)" <<'PY'
import _a3_paths as P, _a3_forms_settings as S
m = P._mod(A, "middleware/limit.py")
r = S.resolve_self_attr(A, m, "Limit", "_enabled")
assert r["kind"] == "expr" and r["expr"] == "settings.limit_enabled or settings.is_production", r
assert r["expands"] == {"settings.is_production": "settings.environment is Environment.PRODUCTION"} and r["settings_class"] == "config.py::Settings", r
assert r["fields"] == {"environment": {"annotation": "Environment", "default": "Environment.LOCAL", "env": "APP_ENVIRONMENT"},
                       "limit_enabled": {"annotation": "bool", "default": "False", "env": "APP_LIMIT_ENABLED"}}, r["fields"]
assert S.resolve_self_attr(A, m, "Limit", "_burst") == {"kind": "expr", "expr": "settings.burst", "settings_class": "config.py::Settings",
    "fields": {"burst": {"annotation": "int", "default": "5", "env": "APP_BURST"}}}
h = S.resolve_self_attr(A, m, "Limit", "_hop")
assert h["expr"] == "settings.hop1 or settings.limit_enabled" and h["expands"] == {
    "settings.hop1": "settings.is_production and settings.burst > 1",
    "settings.is_production": "settings.environment is Environment.PRODUCTION"} and set(h["fields"]) == {"burst", "environment", "limit_enabled"} and "unresolved" not in h, h
for attr, expr in (("_again", "settings.burst"), ("_typed", "settings.limit_enabled"), ("_built", "settings.burst")):
    got = S.resolve_self_attr(A, m, "Limit", attr)
    assert got.get("expr") == expr and got["kind"] == "expr", (attr, got)
c = S.resolve_self_attr(A, m, "FromChild", "_c")
assert c["expr"] == "child.limit_enabled or child.is_production" and c["settings_class"] == "config.py::Child" and c["fields"]["limit_enabled"]["env"] == "APP_LIMIT_ENABLED", c
assert S.resolve_self_attr(A, m, "FromGlobal", "_g")["expr"] == "global_.flag2", "a class named after a keyword keeps a parseable subject"
assert S.resolve_const(A, m, "OPEN_PATHS") == ("/healthz", "/ready")
cm = P._mod(A, "consts.py")
assert S.resolve_const(A, cm, "LIMIT") == 7 and S.resolve_const(A, m, "LIMIT") is None
assert S.resolve_const(A, cm, "GROW") is None, "a reassigned constant stays unresolved"
src = "not self._enabled or request.url.path in OPEN_PATHS"
assert S.evaluate(src, {"self._enabled": True}) == (None, "request.url.path in OPEN_PATHS") and S.evaluate(src, {"self._enabled": False}) == (True, None)
assert S.evaluate("a and b", {"a": False}) == (False, None) and S.evaluate("a and b", {"a": True, "b": True}) == (True, None)
PY

py "K4 · fields: aliases, AliasChoices, case_sensitive, required, default_factory, ClassVar, v1 Config, dict model_config (F17 F18)" <<'PY'
import _a3_paths as P, _a3_forms_settings as S
cm = P._mod(A, "config.py")
f = lambda name: S.fields(A, cm, cm.classes[name])
assert f("LegacySettings")["debug"]["env"] == "OLD_DEBUG"
d = f("DictSettings")
assert d["region"] == {"annotation": "str", "default": "'eu'", "env": "DICT_REGION"}, d["region"]
assert d["legacy"]["env"] == "LEGACY_FLAG" and d["choice"]["env"] == "A_ONE" and d["choice"]["env_choices"] == ["A_ONE", "A_TWO"], d
assert d["req"] == {"annotation": "str", "default": None, "env": "DICT_REQ", "required": True}, d["req"]
assert d["items"] == {"annotation": "list", "default": None, "env": "DICT_ITEMS", "default_factory": "list"}, d["items"]
assert "counter" not in d, sorted(d)
assert f("CaseSettings")["flag"]["env"] == "Cs_flag"
assert f("Child")["limit_enabled"]["env"] == "APP_LIMIT_ENABLED" and f("Child")["extra"]["env"] == "APP_EXTRA", "a subclass inherits fields and env_prefix"
PY

py "K4 · terms: in CONST, startswith direct / imported / through a helper whose subject is the tested expression (F16)" <<'PY'
import _a3_paths as P, _a3_forms_settings as S
m = P._mod(A, "middleware/limit.py")
t = S.terms(A, m, "Limit", "not self._enabled or request.url.path in OPEN_PATHS")
assert [x["kind"] for x in t] == ["expr", "in"] and t[0]["src"] == "self._enabled", t
assert t[1] == {"src": "request.url.path in OPEN_PATHS", "kind": "in", "subject": "request.url.path", "values": ["/healthz", "/ready"]}, t[1]
for call in ("is_hot(request.url.path)", "is_api(request)", "second(request, request.url.path)", "second(req=request, path=request.url.path)"):
    got = S.terms(A, m, "Limit", call)
    assert got == [{"src": call, "kind": "startswith", "subject": "request.url.path", "values": ["/orders", "/admin"]}], (call, got)
assert S.terms(A, m, "Limit", "request.url.path.startswith(OPEN_PATHS)")[0]["values"] == ["/healthz", "/ready"]
assert S.terms(A, m, "Limit", "request.url.path not in ('/a', '/b')")[0] == {"src": "request.url.path not in ('/a', '/b')",
    "kind": "not-in", "subject": "request.url.path", "values": ["/a", "/b"]}
PY

py "K4 · SILENT: what the resolver cannot prove stays opaque, verbatim, with its reason (F14)" <<'PY'
import _a3_paths as P, _a3_forms_settings as S
m = P._mod(A, "middleware/limit.py")
cases = {"_late": "not assigned in __init__", "_plain": "not a settings attribute",
         "_twice": "a method, a property with more than one return, or not declared on the class or its bases",
         "_maybe": "assigned conditionally or more than once in __init__", "_aug": "assigned conditionally or more than once in __init__"}
for attr, why in cases.items():
    r = S.resolve_self_attr(A, m, "Limit", attr)
    assert r["kind"] == "opaque" and r["reason"] == why, (attr, r)
assert S.resolve_self_attr(A, m, "Limit", "_maybe")["assignments"] == ["False", "s.limit_enabled"]
assert S.resolve_self_attr(A, m, "Nope", "_enabled")["reason"] == "class not found"
assert S.resolve_const(A, m, "NOT_A_CONST") is None
src = "not self._enabled or request.url.path in OPEN_PATHS"
assert S.evaluate(src, {}) == (None, src) and S.evaluate("a and", {}) == (None, "a and")
assert S.terms(A, m, "Limit", "request.method == 'GET' and request.url.path in UNKNOWN") == [
    {"src": "request.method == 'GET'", "kind": "opaque"}, {"src": "request.url.path in UNKNOWN", "kind": "opaque"}]
assert S.terms(A, m, "Limit", "a and") == [{"src": "a and", "kind": "opaque", "reason": "unparseable"}]
PY

py "K5 · catch: pass-through into an outer handler; a different class is rethrow; a return swallows; BaseException-only escapes (F13 F33)" <<'PY'
import _a3_paths as P, _a3_forms_catch as K
sm = P._mod(A, "services/orders.py")
def raised(qual, cls):
    evs = P._events(sm.defs[qual])
    e = next(e for e in evs if e["kind"] == "raise" and P._leaf(e["node"].exc) == cls)
    return [x["op"] for x in K.trail(cls, P._bases(A, sm, cls), e["tries"], hev_of(evs))]
assert raised("place", "OrderError") == ["pass-through", "escape"]
assert raised("nested", "OrderError") == ["pass-through", "swallow"], raised("nested", "OrderError")
assert raised("convert", "OrderError") == ["rethrow"] and raised("keep", "OrderError") == ["swallow"]
assert raised("base_only", "Stop") == ["escape"] and raised("cancelled", "CancelledError") == ["escape"]
api = P._mod(A, "api/orders.py")
evs = P._events(api.defs["create"])
call = next(e for e in evs if e["kind"] == "call" and P._leaf(e["node"].func) == "place")
assert [x["op"] for x in K.trail("OrderError", P._bases(A, sm, "OrderError"), call["tries"], hev_of(evs))] == ["translate"]
assert K.trail("OrderError", set(), (), {}) == [{"op": "escape"}]
PY

py "K5 · actions: rollback · suppressed call · re-raise; a nested handler's re-raise is its own; calls in tests and iterables (F11 F12)" <<'PY'
import _a3_paths as P, _a3_forms_catch as K
sm = P._mod(A, "services/orders.py")
def handler(qual):
    evs = P._events(sm.defs[qual])
    e = next(e for e in evs if e["kind"] == "raise")
    return e["tries"][-1].handlers[0]
acts = K.actions(handler("place"))
assert [x["op"] for x in acts] == ["rollback", "call", "pass-through"], acts
assert acts[1]["call"] == "cleanup" and acts[1].get("suppressed") is True and "suppressed" not in acts[0], acts
inner = K.actions(handler("swallow_with_inner"))
through = [x for x in inner if x["op"] == "pass-through"]
assert through and all("in_handler" in x for x in through), inner
assert sum(1 for x in inner if x.get("call") == "notify") == 3 and inner[-1]["op"] == "return" and "in_handler" not in inner[-1], inner
PY

py "K6 · reach: self.m() resolved, the depth cap counts what it cut, a vendored center file is skipped" <<'PY'
import _a3_paths as P, _a3_forms_reach as R, _a3_graft as G
m = P._mod(A, "api/reach.py")
root = "api/reach.py::root"
out = R.bfs(A, [(m, "root")], depth=4)
got = out["reached"]
assert got["services/chain.py::Svc.run"][root]["depth"] == 1, got
assert got["services/chain.py::Svc.step"][root] == {"depth": 2, "via": "services/chain.py::Svc.run", "site": "services/chain.py:3"}, got
assert got["services/chain.py::deeper"][root]["depth"] == 4 and "services/chain.py::deepest" not in got and out["truncated"] == 1, (got, out["truncated"])
assert "scripts/tooling.py::helper" in got and not any(k.startswith("scripts/_a3_code.py") for k in got), got
R.reset_caches()
deep = R.bfs(A, [(m, "root")], depth=5)
assert deep["truncated"] == 0 and deep["reached"]["services/chain.py::deepest"][root]["depth"] == 5, deep
R.reset_caches()
keep = R.callee
R.callee = lambda repo, mm, q, fn, call: P._callee(repo, mm, fn, call)
assert "services/chain.py::Svc.step" not in R.bfs(A, [(m, "root")], depth=4)["reached"], "K6 cannot fail: self.m() reached without its arm"
R.callee = keep
R.reset_caches()
G._is_center = lambda p: False
assert "scripts/_a3_code.py::parse_endpoints" in R.bfs(A, [(m, "root")], depth=4)["reached"], "K6 cannot fail: the skip is not what hid the vendored file"
PY

py "K13 · the scoped-import rule: a function-local import binds from its line on, in its function and the defs nested in it, shadows the module's name there, never leaks to a sibling; TYPE_CHECKING and ImportError blocks stay unread; aliases bind like module-level ones; the reach follows it" <<'PY'
import _a3_paths as P, _a3_paths_read as PR, _a3_forms_reach as R
m = P._mod(A, "services/scoped.py")
def fn(name):
    return next(n for n in ast.walk(m.tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name == name)
def own_calls(f):
    return sorted((c for c in ast.walk(f) if isinstance(c, ast.Call) and not any(
        c in ast.walk(d) for d in ast.walk(f) if d is not f and isinstance(d, (ast.FunctionDef, ast.AsyncFunctionDef)))),
        key=lambda c: (c.lineno, c.col_offset))
def got(name):
    f = fn(name)
    return [(lambda r: f"{r[0].rel}::{r[1]}" if r else None)(P._callee(A, m, f, c)) for c in own_calls(f)]
CH, FL, FH = "services/chain.py::leaf", "services/far.py::leaf", "services/far.py::helper"
assert got("before") == [None, FL], "before its line the name is the function's local, still unbound — nothing, never the module's; after it the local import's: " + str(got("before"))
assert got("reimport") == [CH, FL], "a later import of the same name in one function wins from its line on: " + str(got("reimport"))
assert got("outer_only") == [CH] and got("inner") == [FH] and [P._callee(A, m, fn("inner"), c) for c in own_calls(fn("inner"))][0][0].rel == "services/far.py", \
    "SILENT: a nested def's own import never reaches its enclosing function: " + str((got("outer_only"), got("inner")))
assert got("dotted") == ["services/__init__.py::pkg_fn"], "`import a.b` binds `a`, the PACKAGE — never the file of a.b: " + str(got("dotted"))
assert got("inner") == [FH], "a nested def sees its enclosing function's import, alias and all: " + str(got("inner"))
assert got("sibling") == [CH, None], "SILENT: another function's local import never leaks: " + str(got("sibling"))
assert got("aliased") == [FH, FH], "`import a.b as c` and `from x import y as z` bind like module-level ones: " + str(got("aliased"))
assert got("typed") == [CH] and got("guarded") == [CH], "SILENT: TYPE_CHECKING and ImportError blocks are unread, as at module level: " + str((got("typed"), got("guarded")))
assert got("shadowed") == [None], "a library import shadows the module's project name — nothing, never the module's leaf: " + str(got("shadowed"))
assert P._resolve(A, m, "leaf") == P._resolve(A, m, "leaf", at=fn("sibling").body[0]) and P._resolve(A, m, "leaf")[0].rel == "services/chain.py"
assert sorted(m.imports) == ["TYPE_CHECKING", "leaf"], "SILENT: the module table is the module's own statements: " + str(sorted(m.imports))
assert P._import_at(m, "leaf", fn("before").body[0]) == (None, None), "a use before the function's own import binds nothing"
assert P._import_at(m, "leaf", fn("before").body[2]) == ("services/far.py", "leaf") and P._import_at(m, "leaf") == ("services/chain.py", "leaf")
assert P._resolve(A, m, "leaf", at="services/other.py:8") == P._resolve(A, m, "leaf"), "a site in another file reads the module table"
out = R.bfs(A, [(m, "chained")], depth=4)["reached"]
assert out.get("services/far.py::relay", {}).get("services/scoped.py::chained", {}).get("depth") == 1 and \
    out.get(FH, {}).get("services/scoped.py::chained") == {"depth": 2, "via": "services/far.py::relay", "site": "services/far.py:10"}, out
keep = PR._fn_scopes
PR._fn_scopes = lambda mm: []
R.reset_caches()
try:
    assert got("before") != [None, FL] and "services/far.py::relay" not in R.bfs(A, [(m, "chained")], depth=4)["reached"], \
        "K13 cannot fail: the local scan is not what resolved these"
finally:
    PR._fn_scopes = keep
    R.reset_caches()
PY

py "K7 · sync: form_drift NAG/COUNT and the baseline census equal the registry; arm findings never reach the endpoint summary (F37)" <<'PY'
import _a3_forms as F, form_drift as fd
def reg(cls):
    return sorted(k for k, v in F.FINDINGS.items() if v.get("arm") == "endpoint" and v.get("pulse") == cls)
def census(cls):
    src = (REPO / "scripts/map-baseline.sh").read_text()
    hit = re.search(r'out\["forms_%s"\] = sum\(ff\.get\(k, 0\) for k in \(([^)]*)\)\)' % cls, src)
    return sorted(re.findall(r'"([^"]+)"', hit.group(1))) if hit else None
def in_sync():
    return reg("nag") == sorted(fd.NAG) == census("nag") and reg("count") == sorted(fd.COUNT) == census("count")
assert in_sync(), (reg("nag"), sorted(fd.NAG), census("nag"), reg("count"), sorted(fd.COUNT), census("count"))
F.FINDINGS["race-500"] = {"arm": "endpoint", "slot": "U7", "pulse": "nag", "says": "x"}
assert not in_sync(), "K7 cannot fail: a new endpoint nag finding went unnoticed"
base = {"version": 2, "present": True, "stats": {}, "endpoints": {"endpoint:GET /x": {"findings": [{"id": "shared-status", "status": 409}, {"id": "text-only", "n": 1}]}}}
armed = copy.deepcopy(base)
armed["arm_findings"] = {"effects": [{"id": "shared-status"}, {"id": "escape-500"}]}
armed["endpoints"]["endpoint:GET /x"]["arm_findings"] = {"effects": [{"id": "reason-lost"}, {"id": "http-swallowed"}]}
assert fd.summary(armed) == fd.summary(base), "arm findings leaked into the endpoint nag/count summary"
PY

py "K12 · FIRE: the registry the spec promised — every kind and slot as built, external a state; head on a feed that is not present" <<'PY'
import _a3_forms as F, _a3_forms_build as B
assert set(F.KINDS["endpoint"]) == {"U3", "U7", "K1", "U6", "U8", "U9", "U11", "U12", "U14", "K2", "K3", "K4", "U15"}, sorted(F.KINDS["endpoint"])   # V32 · U15 in-flight state (Slice 12)
assert {"middleware", "dependency", "service", "task", "handler", "schema", "model", "migration", "setting", "mirror", "guard", "hook", "component", "store_action"} <= set(F.KINDS), sorted(F.KINDS)
assert all("block" in v for k in F.KINDS if k != "endpoint" for v in F.KINDS[k].values()), "every kind's slot names the block that is it"
assert "external" in F.STATES, F.STATES
off = B.extend_backend({"present": False, "reason": "no FastAPI endpoints in the archmap"}, {"head": "h123"}, T, {})
assert off["head"] == "h123" and off["present"] is False, off                                              # V37: head rides an absent feed (D21)
PY

py "K8 · guard: every private the arms reach for in _a3_paths · _a3_graft · _a3_stacks_pydi exists" <<'PY'
import _a3_paths as P, _a3_graft as G, _a3_stacks_pydi as PD
srcs = {f.name: f.read_text() for f in sorted(GEN.glob("_a3_forms_*.py"))}
assert {"_a3_forms_build.py", "_a3_forms_ids.py", "_a3_forms_settings.py", "_a3_forms_catch.py", "_a3_forms_reach.py"} <= set(srcs), sorted(srcs)
def missing():
    out = []
    for name, src in srcs.items():
        for mod, alias in ((P, "P"), (G, "G")):
            out += [f"{name}: {alias}.{n}" for n in sorted(set(re.findall(r"\b%s\.(_\w+)" % alias, src))) if not hasattr(mod, n)]
        for line in re.findall(r"^from _a3_stacks_pydi import (.+)$", src, re.M):
            out += [f"{name}: _a3_stacks_pydi.{x.strip()}" for x in line.split(",") if not hasattr(PD, x.strip())]
    return out
assert missing() == [], missing()
used = sorted({n for src in srcs.values() for n in re.findall(r"\bP\.(_\w+)", src)})
assert len(used) >= 10, used
saved = getattr(P, used[0])
delattr(P, used[0])
assert missing(), "K8 cannot fail: a renamed _a3_paths private went unnoticed"
setattr(P, used[0], saved)
PY

py "K9 · form_drift and gabe-map speak the same state words — no file · present:false · present" <<'PY'
import form_drift as fd, mapquery as mq
def root(name, forms):
    r = T / name
    (r / "docs/site/center").mkdir(parents=True, exist_ok=True)
    (r / "docs/site/center/center.config.json").write_text("{}")
    if forms is not None:
        (r / "docs/site/center/forms.json").write_text(json.dumps(forms))
    return r
def states(r):
    return fd.load_forms(r)[0], mq.Center(r / "docs/site/center").forms_block()[1]
none = root("k9-none", None)
off = root("k9-off", {"version": 2, "present": False, "reason": "no FastAPI endpoints in the archmap"})
on = root("k9-on", {"version": 2, "present": True, "endpoints": {}, "stats": {}})
assert states(none) == ("not_emitted", "not_emitted"), states(none)
assert states(off) == ("absent", "absent"), states(off)
assert states(on) == ("present", "present"), states(on)
saved = fd.load_forms
fd.load_forms = lambda r: ("absent", {}, "") if not (r / "docs/site/center/forms.json").is_file() else saved(r)
a, b = states(none)
assert a != b, "K9 cannot fail: an inverted no-file word went unnoticed"
PY

echo "forms-core: $pass passed, $fail failed"
[ "$fail" -eq 0 ] || exit 1
