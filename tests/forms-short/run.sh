#!/usr/bin/env bash
# Forms short battery — the SHORT arm's schema part and the body-parse framework exits (docs/design/element-forms/
# amendment-1.md §A2 Slice 4 · A6 · critic gap G2): request schemas become `schemas{}`, every validation row gains the 422
# `cases[]` a request can break (pydantic error type · full loc · the rule's line), and a body endpoint gains FastAPI's two
# body-parse `framework_exits[]`. The cases drive the real orchestrator over _a3_paths.build on a synthetic FastAPI tree —
# AST only — and edit the fixture in-test to prove each case can FAIL. Exit 0 = all pass.
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
GEN="${GEN_OVERRIDE:-$REPO/templates/center/generators}"

T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
pass=0; fail=0
ok()  { pass=$((pass+1)); }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }

A="$T/app"
mkdir -p "$A/api" "$A/docs/site/center"
printf '{}' > "$A/docs/site/center/center.config.json"
cat > "$A/uv.lock" <<'LOCK'
version = 1

[[package]]
name = "fastapi"
version = "0.136.3"
LOCK
cat > "$A/consts.py" <<'PYF'
ALLOWED = ("a", "b")
MAX_TAGS = 5
PYF
cat > "$A/schemas.py" <<'PYF'
from pydantic import BaseModel, ConfigDict, Field, field_validator

from consts import ALLOWED, MAX_TAGS


def clean(raw, *, max_items, label, allowed=None):
    out = []
    for item in raw:
        tag = item.strip().lower()
        if not tag:
            raise ValueError(f"{label} contains an empty tag")
        out.append(tag)
    if len(out) > max_items:
        raise ValueError(f"{label} allows at most {max_items} items")
    if allowed is not None:
        unknown = [t for t in out if t not in allowed]
        if unknown:
            raise ValueError(f"unknown {label} code(s) {unknown}")
    return out


class Inner(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tags: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    size: int = 1

    @field_validator("tags")
    @classmethod
    def _tags(cls, value):
        return clean(value, max_items=MAX_TAGS, label="tags", allowed=ALLOWED)

    @field_validator("notes")
    @classmethod
    def _notes(cls, value):
        return clean(value, max_items=3, label="notes")

    @field_validator("size")
    @classmethod
    def _size(cls, value):
        if value not in (1, 2, 4):
            raise ValueError("size must be 1, 2 or 4")
        return value


class CreateItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=40)
    inner: Inner = Field(default_factory=Inner)
    label: str = ""

    @field_validator("label")
    @classmethod
    def _label(cls, value):
        return value.strip()


class Loose(BaseModel):
    name: str
PYF
cat > "$A/api/items.py" <<'PYF'
from fastapi import APIRouter, Query

from schemas import CreateItem, Loose

router = APIRouter(prefix="/items")


@router.post("/create")
def create(body: CreateItem):
    return {"ok": True}


@router.get("/search")
def search(page: int = Query(1, ge=1, le=50), q: str = Query(...)):
    return []


@router.post("/loose")
def loose(payload: Loose):
    return {"ok": True}
PYF

py() {  # py "<name>" <<'PY' … PY  — the prelude gives A · T · build(repo, arms) → forms · variant(name, edit) · patch · row(forms, key)
  local name="$1" src; src=$(cat)
  if (cd "$T" && PYTHONPATH="$GEN" A="$A" T="$T" python3 - >"$T/py.txt" 2>&1 <<PY
import copy, json, os, re, shutil
from pathlib import Path
A, T = Path(os.environ["A"]), Path(os.environ["T"])
import _a3_code as C, _a3_paths as P, _a3_forms_build as B
def build(repo, arms, schema_files=("schemas.py",)):
    files = sorted(str(p.relative_to(repo)) for p in (repo / "api").glob("*.py"))
    amap = {"head": "abc1234", "entities": {"items": {"endpoints": C.parse_endpoints(repo, files), "schemas": C.parse_schemas(repo, list(schema_files))}},
            "app_middleware": []}
    for ep in amap["entities"]["items"]["endpoints"]:
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
def patch(d, rel, a, b):
    p = d / rel
    s = p.read_text()
    assert s.count(a) == 1, (rel, a)
    p.write_text(s.replace(a, b))
def row(forms, key):
    return next(r for r in forms["endpoints"][key]["produced"] if r.get("phase") == "validation")
$src
PY
  ); then ok; else bad "$name: $(tail -4 "$T/py.txt")"; fi
}

py "SF1 · a nested body gives its exact case list: forbid, bounds, a helper's rules with call-site keywords, a constant allow-list" <<'PY'
f = build(A, "short")
r = row(f, "endpoint:POST /items/create")
got = sorted((c["loc"], c["type"], c.get("rule") or json.dumps((c.get("allowed") or {}).get("values")) if c.get("allowed") else c.get("rule") or c.get("msg")) for c in r["cases"] if c.get("state") != "default")
want = sorted([
    ("body", "extra_forbidden", 'extra="forbid"'),
    ("body.name", "missing", None), ("body.name", "string_too_short", "min_length=1"), ("body.name", "string_too_long", "max_length=40"),
    ("body.inner", "extra_forbidden", 'extra="forbid"'),
    ("body.inner.tags", "value_error", "tags contains an empty tag"), ("body.inner.tags", "value_error", "tags allows at most 5 items"),
    ("body.inner.tags", "value_error", '["a", "b"]'),
    ("body.inner.notes", "value_error", "notes contains an empty tag"), ("body.inner.notes", "value_error", "notes allows at most 3 items"),
    ("body.inner.size", "value_error", "[1, 2, 4]"),
], key=str)
assert sorted(got, key=str) == want, "\n".join(map(str, sorted(got, key=str)))
assert [c["loc"] for c in r["cases"] if c.get("state") == "default"] == ["body"], r["cases"]
assert r["schemas"] == ["schema:CreateItem", "schema:Inner"] and r["types"] == "collapsed", (r["schemas"], r.get("types"))
assert all(c["id"].startswith(("case:schema:", "case:framework:")) for c in r["cases"]) and len({c["id"] for c in r["cases"]}) == len(r["cases"])
assert f["schemas"]["schema:CreateItem"]["extra"] == "forbid" and f["schemas"]["schema:CreateItem"]["consumers"] == 1
PY

py "SF13 · FIRE+SILENT: a validator that imports its error classes in its OWN body reads them with their bases — a ValueError subclass it raises is a value_error case, one it catches as ValueError itself is none" <<'PY'
def local(d):
    (d / "errs.py").write_text("class BadName(ValueError):\n    pass\n\n\nclass Quiet(ValueError):\n    pass\n")
    patch(d, "schemas.py", "class Loose(BaseModel):\n    name: str\n", '''class Loose(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def _name(cls, value):
        from errs import BadName, Quiet
        try:
            if value == "q":
                raise Quiet("hush")
        except ValueError:
            return value
        if value == "x":
            raise BadName("no x")
        return value
''')
f = build(variant("localerr", local), "short")
r = row(f, "endpoint:POST /items/loose")
got = sorted((c["loc"], c["type"], c.get("rule") or c.get("msg")) for c in r["cases"] if c.get("state") != "default" and c["loc"] == "body.name")
assert got == [("body.name", "missing", None), ("body.name", "value_error", "no x")], got
PY

py "SF1 · SILENT: no extra_forbidden without forbid, no allow-list case when the call site passes none, no case for a normalisation" <<'PY'
f = build(A, "short")
lo = row(f, "endpoint:POST /items/loose")
assert [(c["loc"], c["type"]) for c in lo["cases"] if c.get("state") != "default"] == [("body.name", "missing")], lo["cases"]
cr = row(f, "endpoint:POST /items/create")
assert not [c for c in cr["cases"] if c["loc"] == "body.inner.notes" and c.get("allowed")], "a falsified `allowed is not None` guard kept its rule"
assert not [c for c in cr["cases"] if c["loc"] == "body.label"], "a normalisation-only validator minted a case"
assert [x["subject"] for x in f["arm_findings"]["short"] if x["id"] == "extra-ignored"] == ["schema:Loose"], f["arm_findings"]
PY

py "SF2 · query parameters: Query(ge, le) bounds; missing only where the parameter is required" <<'PY'
f = build(A, "short")
q = row(f, "endpoint:GET /items/search")
got = sorted((c["loc"], c["type"], c.get("rule")) for c in q["cases"])
assert got == [("query.page", "greater_than_equal", "ge=1"), ("query.page", "less_than_equal", "le=50"), ("query.q", "missing", None)], got
PY

py "SF-B · body-parse exits: FIRE on a body endpoint, SILENT on a GET; ids per handler" <<'PY'
f = build(A, "paths")
for key in ("endpoint:POST /items/create", "endpoint:POST /items/loose"):
    fx = f["endpoints"][key].get("framework_exits") or []
    assert [(x["status"], x["phase"], x["source"]) for x in fx] == [(422, "body-parse", "fastapi/routing.py:427"), (400, "body-parse", "fastapi/routing.py:447")], (key, fx)
    assert all(re.fullmatch(r"x:[0-9a-f]{10}", x["id"]) for x in fx)
assert "framework_exits" not in f["endpoints"]["endpoint:GET /items/search"]
ids = [x["id"] for k in ("endpoint:POST /items/create", "endpoint:POST /items/loose") for x in f["endpoints"][k]["framework_exits"]]
assert len(set(ids)) == 4, ids
assert f["arms"]["paths"]["parts"]["framework"]["present"] is True, f["arms"]["paths"]["parts"]
PY

py "SF9 · determinism: two builds of the same tree are byte-identical" <<'PY'
a, b = build(A, "short,paths"), build(A, "short,paths")
assert json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)
PY

py "SF10a · FIRE: dropping extra=forbid removes its case and raises extra-ignored" <<'PY'
d = variant("noforbid", lambda d: patch(d, "schemas.py", '''class CreateItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
''', '''class CreateItem(BaseModel):
'''))
f = build(d, "short")
r = row(f, "endpoint:POST /items/create")
assert not [c for c in r["cases"] if c["loc"] == "body" and c["type"] == "extra_forbidden"], r["cases"]
assert [c for c in r["cases"] if c["loc"] == "body.inner" and c["type"] == "extra_forbidden"], "the nested model's own forbid must stay"
assert "schema:CreateItem" in [x["subject"] for x in f["arm_findings"]["short"] if x["id"] == "extra-ignored"], f["arm_findings"]
PY

py "SF11 · honest-empty: a schema part that writes its cases and then raises reads present:false and leaves no case on any row" <<'PY'
import _a3_forms_schema as SC
real = SC.schema_part
def boom(*a, **k):
    real(*a, **k)                                  # every row gets its cases first — the restore is what is proven
    raise RuntimeError("schema down")
SC.schema_part = boom
f = build(A, "short")
assert f["arms"]["short"]["parts"]["schema"] == {"present": False, "reason": "error: RuntimeError: schema down"}, f["arms"]["short"]
assert not any("cases" in r for e in f["endpoints"].values() for r in e["produced"]) and "schemas" not in f, sorted(f)
PY

py "SF12 · no dangling schema: a body model no claim covers is formed through its handler, kept as claimed:false, and every case's schema is in the map" <<'PY'
def edit(d):
    patch(d, "api/items.py", "from fastapi import APIRouter, Query\n", "from fastapi import APIRouter, Query\nfrom pydantic import BaseModel, Field\n")
    patch(d, "api/items.py", '@router.post("/loose")', '''class InlineBody(BaseModel):
    code: str = Field(min_length=2)


@router.post("/inline")
def inline(body: InlineBody):
    return {"ok": True}


@router.post("/loose")''')
f = build(variant("inline", edit), "short")
s = f["schemas"]["schema:InlineBody"]
assert s["claimed"] is False and s["file"] == "api/items.py" and s["consumers"] == 1, s
assert all("claimed" not in v for k, v in f["schemas"].items() if k != "schema:InlineBody"), "a claimed schema gained a marker"
refs = {c["schema"] for e in f["endpoints"].values() for r in e["produced"] for c in r.get("cases") or [] if c.get("schema")}
assert "schema:InlineBody" in refs and refs <= set(f["schemas"]), sorted(refs - set(f["schemas"]))
assert f["arms"]["short"]["stats"]["schemas_unclaimed"] == 1, f["arms"]["short"]["stats"]
PY

cat > "$T/review_fixture.py" <<'PYF'
def w(d, rel, text):
    p = d / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)


def identity(d):
    p = d / "schemas.py"
    p.write_text(p.read_text() + '''

class Dup(BaseModel):
    a: int


class Quiet(BaseModel):
    note: str | None = None


class Addr(BaseModel):
    street: str


class Two(BaseModel):
    home: Addr
    work: Addr
''')
    w(d, "s2.py", "from pydantic import BaseModel\n\n\nclass Dup(BaseModel):\n    b: int\n")
    w(d, "s3.py", "from pydantic import BaseModel\n\nfrom schemas import Addr\n\n\nclass Dup(BaseModel):\n    inner: Addr\n")
    w(d, "api/dups.py", '''from fastapi import APIRouter

from s2 import Dup
from schemas import Quiet, Two

router = APIRouter(prefix="/dups")


@router.post("/dup2")
def dup2(body: Dup):
    return {}


@router.post("/quiet")
def quiet(body: Quiet):
    return {}


@router.post("/two")
def two(body: Two):
    return {}
''')


def params(d):
    w(d, "api/params.py", '''from enum import Enum
from typing import Annotated, Optional

from fastapi import APIRouter, Body, Depends, Form, Header, Query, UploadFile
from pydantic import BaseModel

from schemas import Loose

router = APIRouter(prefix="/org/{org_id}")


class Color(str, Enum):
    RED = "red"
    BLUE = "blue"


class Filters(BaseModel):
    q: str


@router.get("/p")
def p(org_id: int, color: Color, f: Annotated[Filters, Depends()], req_opt: Optional[str], x_trace_id: str = Header(),
      need: int = Query(default=...), maybe: Optional[str] = Query(...), limit: Annotated[int, Query(ge=1, le=20)] = 10,
      opt: Optional[str] = None):
    return {}


@router.post("/tags")
def tags(org_id: int, tags: list[int]):
    return {}


@router.post("/up")
def up(org_id: int, file: UploadFile):
    return {}


@router.post("/emb")
def emb(org_id: int, item: Loose = Body(embed=True)):
    return {}


@router.post("/name")
def name_form(org_id: int, username: str = Form()):
    return {}
''')


def shapes(d):
    w(d, "base.py", '''from pydantic import BaseModel, field_validator


class Base(BaseModel):
    model_config = {"extra": "forbid"}
    x: int


class Parent(BaseModel):
    p: str = ""

    @field_validator("p")
    @classmethod
    def pv(cls, v):
        if v == "bad":
            raise ValueError("parent says bad")
        return v
''')
    w(d, "schemas2.py", '''from decimal import Decimal
from typing import Annotated, Generic, NewType, TypeVar

from pydantic import BaseModel as PM, ConfigDict, Field, StringConstraints, field_validator
from pydantic.alias_generators import to_camel
from sqlmodel import SQLModel

import base as b

T = TypeVar("T")
Name = Annotated[str, Field(min_length=2, max_length=9)]
Code = NewType("Code", str)
STRICT = ConfigDict(extra="forbid")
Line = Annotated[str, Field(max_length=200)]


class Sq(SQLModel):
    title: str = Field(min_length=1)


class Kw(PM, extra="forbid"):
    a: int


class Named(PM):
    model_config = STRICT
    a: int


class Rules(PM):
    nm: Name
    sc: Annotated[str, StringConstraints(min_length=3)]
    tags: Annotated[list[str], Field(default_factory=list)]
    _secret: str
    fl: float = Field(1.0, allow_inf_nan=True)
    items: list[str] = Field(min_items=1)
    odd: int = Field(0, frobnicate=3)
    price: Decimal = Field(max_digits=5, decimal_places=2)
    lines: list[Line]
    scores: dict[str, Annotated[int, Field(ge=0)]]
    first: str = Field(alias="firstName")

    @field_validator("first")
    @classmethod
    def chk(cls, v):
        if v == "x":
            raise ValueError("no x")
        return v


class Camel(PM):
    model_config = ConfigDict(alias_generator=to_camel)
    first_name: str


class Page(PM, Generic[T]):
    items: list[T]
    total: int


class Dotted(b.Base):
    y: int
''')
    w(d, "api/shapes.py", '''from fastapi import APIRouter

from schemas import Loose
from schemas2 import Camel, Dotted, Kw, Named, Page, Rules, Sq

router = APIRouter(prefix="/shapes")


@router.post("/sq")
def sq(body: Sq):
    return {}


@router.post("/kw")
def kw(body: Kw):
    return {}


@router.post("/named")
def named(body: Named):
    return {}


@router.post("/rules")
def rules(body: Rules):
    return {}


@router.post("/camel")
def camel(body: Camel):
    return {}


@router.post("/page")
def page(body: Page[Loose]):
    return {}


@router.post("/dotted")
def dotted(body: Dotted):
    return {}
''')


def validators(d):
    shapes(d)
    w(d, "helpers2.py", '''HELPER_MAX = 10


def check_limit(value, limit=HELPER_MAX):
    if len(value) > limit:
        raise ValueError(f"over {limit}")
    return value


def check_allowed(value, allowed=None):
    if allowed is None:
        return value
    if value not in allowed:
        raise ValueError("not allowed")
    return value


def check_boolop(value, allowed=None):
    if allowed is not None and value not in allowed:
        raise ValueError("not allowed either")
    return value


def check_in(value, allowed):
    if value not in allowed:
        raise ValueError("not in")
    return value


def outer(value):
    return inner(value)


def inner(value):
    if value == "deep":
        raise ValueError("deep")
    return value
''')
    w(d, "vals.py", '''from typing import ClassVar

from pydantic import BaseModel, field_validator
from pydantic_core import PydanticCustomError

from base import Parent
from helpers2 import check_allowed, check_boolop, check_in, check_limit, outer

HELPER_MAX = 99
SCHEMA_ALLOWED = ("s1", "s2")
MSG = "must be valid"
FIELDS = ("f1",)


class MyValueError(ValueError):
    pass


class Base2(BaseModel):
    x: str = ""

    @field_validator("x")
    @classmethod
    def chk(cls, v):
        raise ValueError("base says no")


class V(Base2):
    CODES: ClassVar[tuple] = ("p", "q")
    a: str = ""
    b: str = ""
    c: str = ""
    d: int = 0
    f1: str = ""

    @field_validator("x")
    @classmethod
    def chk(cls, v):
        return v

    @field_validator("a")
    @classmethod
    def va(cls, v):
        try:
            if v == "boom":
                raise ValueError("swallowed")
        except ValueError:
            return v
        check_limit(v)
        check_allowed(v)
        check_boolop(v)
        check_in(v, allowed=SCHEMA_ALLOWED)
        return outer(v)

    @field_validator("b")
    @classmethod
    def vb(cls, v):
        assert v != "no", "no b"
        if v == "sub":
            raise MyValueError("sub error")
        if v == "bare":
            raise ValueError
        if v == "custom":
            raise PydanticCustomError("code_bad", "the code {v} is bad", {"v": "zz"})
        if v == "msg":
            raise ValueError(MSG)
        return cls._helper(v)

    @classmethod
    def _helper(cls, v):
        if v == "helped":
            raise ValueError("helper refuses")
        return v

    @field_validator("c")
    @classmethod
    def vc(cls, v):
        if v not in cls.CODES:
            raise ValueError("unknown code")
        return v

    @field_validator("d")
    @classmethod
    def vd(cls, v):
        if 1 <= v <= 5:
            raise ValueError("in the refused band")
        return v

    @field_validator("*")
    @classmethod
    def star(cls, v):
        if v == "star":
            raise ValueError("star")
        return v

    @field_validator(*FIELDS)
    @classmethod
    def starred(cls, v):
        if v == "starred":
            raise ValueError("starred")
        return v


class Kid(Parent):
    k: int = 0
''')
    w(d, "api/checks.py", '''from fastapi import APIRouter

from vals import Kid, V

router = APIRouter(prefix="/vals")


@router.post("/v")
def v_(body: V):
    return {}


@router.post("/kid")
def kid(body: Kid):
    return {}
''')


def framework(d):
    params(d)
    w(d, "app.py", '''from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

app = FastAPI()


@app.exception_handler(RequestValidationError)
async def reshape(request, exc):
    return JSONResponse(status_code=400, content={"detail": "bad request"})
''')
    w(d, "api/deps.py", '''from fastapi import APIRouter, Depends

from schemas import Loose

router = APIRouter(prefix="/deps")


def body_dep(payload: Loose):
    return payload


def require(scope: str):
    def dependency(x: int = 0):
        return x
    return dependency


@router.post("/flat")
def flat(extra: Loose = Depends(body_dep)):
    return {}


@router.get("/factory")
def factory(page: int, dep=Depends(require("admin"))):
    return {}
''')
PYF

py "SF13 · schema identity: three same-named claimed classes are variants and serialise; a handler's class is its own file's; a rule-less body still consumes; one model at two fields keeps two ids" <<'PY'
import sys; sys.path.insert(0, str(T))
from review_fixture import identity
d = variant("identity", identity)
f = build(d, "short", ("schemas.py", "s2.py", "s3.py"))
assert f["arms"]["short"]["present"] is True, f["arms"]["short"]
var = f["schemas"]["schema:Dup"]["variants"]
assert sorted(x["file"] for x in var) == ["s2.py", "s3.py", "schemas.py"] and "_ann" not in json.dumps(var), var
dc = row(f, "endpoint:POST /dups/dup2")["cases"]
assert [(c["loc"], c["type"]) for c in dc if c.get("schema") == "schema:Dup"] == [("body.b", "missing")] and all(c["schema_file"] == "s2.py" for c in dc if c.get("schema") == "schema:Dup"), dc
q = row(f, "endpoint:POST /dups/quiet")
assert q["schemas"] == ["schema:Quiet"] and f["schemas"]["schema:Quiet"]["consumers"] == 1, (q, f["schemas"]["schema:Quiet"])
assert "schema:Quiet" in [x["subject"] for x in f["arm_findings"]["short"] if x["id"] == "extra-ignored"], f["arm_findings"]["short"]
tc = row(f, "endpoint:POST /dups/two")["cases"]
assert {"case:schema:Addr/home.street/missing", "case:schema:Addr/work.street/missing"} <= {c["id"] for c in tc} and len({c["id"] for c in tc}) == len(tc), [c["id"] for c in tc]
PY

py "SF14 · parameters as FastAPI reads them: an Enum is a query, a list a body, an UploadFile a form field; Annotated Query bounds; no missing path; header aliases; required by the default alone; Depends() is no body" <<'PY'
import sys; sys.path.insert(0, str(T))
from review_fixture import params
f = build(variant("params", params), "short,paths")
pc = {(c["loc"], c["type"]) for c in row(f, "endpoint:GET /org/{org_id}/p")["cases"]}
want = {("query.color", "missing"), ("query.color", "enum"), ("query.req_opt", "missing"), ("header.x-trace-id", "missing"),
        ("query.need", "missing"), ("query.maybe", "missing"), ("query.limit", "greater_than_equal"), ("query.limit", "less_than_equal")}
assert pc == want, sorted(pc ^ want)
assert "framework_exits" not in f["endpoints"]["endpoint:GET /org/{org_id}/p"], "a Depends() model read as a body"
assert [(c["loc"], c["type"]) for c in row(f, "endpoint:POST /org/{org_id}/tags")["cases"]] == [("body", "missing")], row(f, "endpoint:POST /org/{org_id}/tags")["cases"]
assert [(c["loc"], c["type"]) for c in row(f, "endpoint:POST /org/{org_id}/up")["cases"]] == [("body.file", "missing")], row(f, "endpoint:POST /org/{org_id}/up")["cases"]
assert [(c["loc"], c["type"]) for c in row(f, "endpoint:POST /org/{org_id}/name")["cases"]] == [("body.username", "missing")]
em = row(f, "endpoint:POST /org/{org_id}/emb")
assert {(c["loc"], c["type"]) for c in em["cases"]} == {("body.item.name", "missing"), ("body.item", "missing")} and em["embed"].startswith("fastapi/"), em
PY

py "SF15 · schema reading: SQLModel, aliased and attribute bases, class-keyword and named extra, Annotated aliases and StringConstraints, defaults inside Annotated, private attributes, v1 and unknown keywords, decimal digits, items, aliases and generators, generics" <<'PY'
import sys; sys.path.insert(0, str(T))
from review_fixture import shapes
f = build(variant("shapes", shapes), "short,paths")
def lt(k):
    return {(c["loc"], c["type"]) for c in row(f, k)["cases"] if c.get("state") != "default"}
assert lt("endpoint:POST /shapes/sq") == {("body.title", "missing"), ("body.title", "string_too_short")} and f["endpoints"]["endpoint:POST /shapes/sq"].get("framework_exits"), lt("endpoint:POST /shapes/sq")
assert ("body", "extra_forbidden") in lt("endpoint:POST /shapes/kw") and ("body", "extra_forbidden") in lt("endpoint:POST /shapes/named")
assert lt("endpoint:POST /shapes/dotted") == {("body", "extra_forbidden"), ("body.x", "missing"), ("body.y", "missing")}, lt("endpoint:POST /shapes/dotted")
r = row(f, "endpoint:POST /shapes/rules")["cases"]
got = {(c["loc"], c["type"], c.get("rule")) for c in r}
for x in [("body.nm", "string_too_short", "min_length=2"), ("body.nm", "string_too_long", "max_length=9"), ("body.sc", "string_too_short", "min_length=3"),
          ("body.items", "too_short", "min_length=1"), ("body.odd", "unknown", "frobnicate=3"), ("body.price", "decimal_whole_digits", "max_digits=5,decimal_places=2"),
          ("body.lines.[]", "string_too_long", "max_length=200"), ("body.scores.{}", "greater_than_equal", "ge=0"), ("body.firstName", "missing", None),
          ("body.firstName", "value_error", None)]:
    assert x in got, (x, sorted(map(str, got)))
assert not [c for c in r if c["loc"] in ("body.tags", "body._secret") or c["type"] == "finite_number"], [c for c in r if c["loc"] in ("body.tags", "body._secret") or c["type"] == "finite_number"]
assert f["arms"]["short"]["stats"]["unknown"] == {"frobnicate": 1}, f["arms"]["short"]["stats"]
assert lt("endpoint:POST /shapes/camel") == {("body.firstName", "missing")}, lt("endpoint:POST /shapes/camel")
assert lt("endpoint:POST /shapes/page") == {("body.items", "missing"), ("body.total", "missing")}, lt("endpoint:POST /shapes/page")
PY

py "SF16 · validator rules: an override replaces the base; a swallowed raise, an early return and an and-guard the call site decides drop; constants read in the right module; assert, subclasses, bare raises, custom errors, class helpers, star fields, class allow-lists, bands; the defining validator; an unread second hop" <<'PY'
import sys; sys.path.insert(0, str(T))
from review_fixture import validators
f = build(variant("vals", validators), "short")
vc = row(f, "endpoint:POST /vals/v")["cases"]
by = {}
for c in vc:
    by.setdefault(c.get("msg"), []).append(c)
assert "base says no" not in by and "swallowed" not in by and "not allowed" not in by and "not allowed either" not in by, sorted(map(str, by))
lim = by["over 10"][0]
assert lim["bound"] == {"limit": 10} and lim["validator"] == "vals.py::V.va", lim
assert by["not in"][0]["allowed"] == {"values": ["s1", "s2"]}, by["not in"][0]
assert [(c["type"], c["loc"]) for c in by["no b"]] == [("assertion_error", "body.b")], by["no b"]
assert [c["type"] for c in by["sub error"]] == ["value_error"] and [c["type"] for c in by["the code zz is bad"]] == ["code_bad"], (by["sub error"], by["the code zz is bad"])
assert [c["loc"] for c in by["must be valid"]] == ["body.b"] and [c["loc"] for c in by["helper refuses"]] == ["body.b"], by
assert any(c["type"] == "value_error" and c.get("msg") is None and c["loc"] == "body.b" for c in vc), "a bare `raise ValueError` minted no case"
assert by["unknown code"][0]["allowed"] == {"values": ["p", "q"]} and (by["in the refused band"][0]["range"], by["in the refused band"][0]["band"]) == ([1, 5], "refused"), (by["unknown code"], by["in the refused band"])
assert sorted(c["loc"] for c in by["star"]) == ["body.a", "body.b", "body.c", "body.d", "body.f1", "body.x"] and [c["loc"] for c in by["starred"]] == ["body.f1"], (by["star"], by["starred"])
va = next(v for v in f["schemas"]["schema:V"]["validators"] if v["name"] == "va")
assert va["unread_calls"] == [next(f"inner @ helpers2.py:{i + 1}" for i, l in enumerate((T / "vals/helpers2.py").read_text().splitlines()) if "return inner(value)" in l)], va
kc = row(f, "endpoint:POST /vals/kid")["cases"]
assert [(c["msg"], c["validator"]) for c in kc if c["type"] == "value_error"] == [("parent says bad", "base.py::Parent.pv")], kc
PY

py "SF17 · framework and dependencies: a form body sends two 400s and no JSON exit; a version below the one read reads unknown; framework ids join the ids audit; a dependency's body is read; a factory's argument is named; an app 422 handler answers; cap and depth markers" <<'PY'
import sys; sys.path.insert(0, str(T))
import _a3_forms_short as SH
from review_fixture import framework
d = variant("fw", framework)
f = build(d, "short,paths")
up = f["endpoints"]["endpoint:POST /org/{org_id}/up"]["framework_exits"]
assert [(x["status"], x["body"], x.get("detail_state")) for x in up] == [(400, "form", "variable"), (400, "form", None)], up
fx = [x for e in f["endpoints"].values() for x in e.get("framework_exits") or []]
assert f["ids"]["framework_x"] == len(fx) and f["ids"]["collisions"] == 0, f["ids"]
fl = row(f, "endpoint:POST /deps/flat")
assert ("body.name", "missing", "body_dep.payload") in {(c["loc"], c["type"], c["param"]) for c in fl["cases"]} and f["endpoints"]["endpoint:POST /deps/flat"].get("framework_exits"), fl
fa = row(f, "endpoint:GET /deps/factory")
assert [u["param"] for u in fa.get("unread", [])] == ["require.scope"] and "factory" in fa["unread"][0]["reason"], fa.get("unread")
assert all(r["answered_by"]["status"] == 400 for e in f["endpoints"].values() for r in e["produced"] if r.get("phase") == "validation"), "the app's RequestValidationError handler is not said"
def old(d2):
    framework(d2)
    (d2 / "uv.lock").write_text('version = 1\n\n[[package]]\nname = "fastapi"\nversion = "0.133.1"\n')
g = build(variant("fw-old", old), "short,paths")
ox = [x for e in g["endpoints"].values() for x in e.get("framework_exits") or []]
assert ox and all(x["state"] == "unknown" and x["status"] is None and "predates" in x["reason"] for x in ox), ox[:2]
SH.OPTIONS["case_cap"], SH.OPTIONS["nest_depth"] = 2, 0
h = build(A, "short")
cr = row(h, "endpoint:POST /items/create")
assert len(cr["cases"]) == 2 and cr["cases_truncated"] > 0 and cr["nest_cut"] == ["body.inner"], {k: cr.get(k) for k in ("cases_truncated", "nest_cut")}
PY

cat > "$T/model_fixture.py" <<'PYF'
"""Slice 10a's fixture — its own tree, so the schema cases above keep their exact counts: two SQLAlchemy 2.0 models, an
alembic tree of two revisions (a helper spread, a module constant, a batch-added check, a loop-added column), a service
with a unique-set guard and an overridden default, an idempotent endpoint whose claim races and one whose claim is caught,
and constructor sites the map does not cover (a seed script, a test)."""
import os
import shutil
from pathlib import Path

import _a3_code as C
import _a3_forms_build as B
import _a3_forms_model as MD
import _a3_paths as P

T = Path(os.environ["T"])
MODELS = [{"cls": "Order", "table": "orders", "file": "models.py", "uqs": ["UniqueConstraint('team_id', 'key', name='uq_orders_team_key')"]},
          {"cls": "Tag", "table": "tags", "file": "models.py", "uqs": []}]
FILES = {
    "docs/site/center/center.config.json": "{}",
    "uv.lock": 'version = 1\n\n[[package]]\nname = "fastapi"\nversion = "0.136.3"\n\n[[package]]\nname = "sqlalchemy"\nversion = "2.0.50"\n',
    "alembic.ini": "[alembic]\nscript_location = migrations\n",
    "migrations/versions/0001_orders.py": '''import sqlalchemy as sa
from alembic import op

revision = "0001_orders"
down_revision = None

STATUS = "new"


def _stamps():
    return (sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),)


def upgrade():
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default=STATUS),
        sa.Column("qty", sa.Integer(), nullable=False),
        *_stamps(),
        sa.UniqueConstraint("team_id", "key", name="uq_orders_team_key"),
    )
    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(30), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
''',
    "migrations/versions/0002_orders_check.py": '''import sqlalchemy as sa
from alembic import op

revision = "0002_orders_check"
down_revision = "0001_orders"

_CK = "ck_orders_qty"
_COLS = ("display_rank",)


def upgrade():
    with op.batch_alter_table("orders") as batch:
        batch.create_check_constraint(_CK, "qty > 0")
    for col in _COLS:
        op.add_column("orders", sa.Column(col, sa.Integer(), nullable=True))
''',
    "models.py": '''from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Integer, String, UniqueConstraint, event, false, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, validates

STATUS_NEW = "new"


class Base(DeclarativeBase):
    pass


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        UniqueConstraint("team_id", "key", name="uq_orders_team_key"),
        CheckConstraint("qty > 0", name="ck_orders_qty"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_id: Mapped[int] = mapped_column(Integer)
    key: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20), default=STATUS_NEW, server_default=STATUS_NEW)
    qty: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    rank: Mapped[int | None] = mapped_column("display_rank", Integer)


@event.listens_for(Order, "before_insert")
def _stamp(mapper, connection, target):
    target.qty = target.qty or 1


class Tag(Base):
    __tablename__ = "tags"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(30), unique=True)
    active: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())

    @validates("name")
    def _name(self, key, value):
        return value.strip()
''',
    "db.py": '''def get_session():
    session = make_session()
    try:
        yield session
    finally:
        session.close()
''',
    "services/orders.py": '''from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from models import Order, Tag


def place(session, team_id, key, qty):
    existing = session.execute(select(Order).where(Order.team_id == team_id, Order.key == key)).scalar_one_or_none()
    if existing is not None:
        return existing
    order = Order(team_id=team_id, key=key, qty=qty, status="held")
    session.add(order)
    session.flush()
    return order


def label(session, name):
    try:
        with session.begin_nested():
            tag = Tag(name=name)
            session.add(tag)
            session.flush()
    except IntegrityError:
        return None
    return tag
''',
    "api/orders.py": '''from fastapi import APIRouter, Depends, Request

from db import get_session
from services.orders import label, place

router = APIRouter(prefix="/orders")


@router.post("/place")
def place_order(request: Request, session=Depends(get_session)):
    key = request.headers.get("Idempotency-Key")
    order = place(session, 1, key, 2)
    session.commit()
    return {"id": order.id}


@router.post("/tag")
def tag_it(request: Request, session=Depends(get_session)):
    key = request.headers.get("Idempotency-Key")
    tag = label(session, key)
    session.commit()
    return {"tag": key}
''',
    "scripts/seed.py": '''from models import Tag


def seed(session):
    session.add(Tag(name="starter"))
''',
    "tests/test_orders.py": '''from models import Order


def test_order():
    assert Order(team_id=1, key="k", qty=1).key == "k"
''',
}


def make(d=None):
    d = d or T / "mapp"
    shutil.rmtree(d, ignore_errors=True)
    for rel, text in FILES.items():
        p = d / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)
    return d


def mvariant(name, edit):
    d = make(T / name)
    edit(d)
    return d


def mbuild(repo, arms, models=MODELS):
    C.ENTITY_CODE = {"x": {"api": ["api/*.py"], "services": ["services/*.py"], "models": ["models.py"]}}
    C._EMAP_CACHE.clear()
    MD._REPLAYS.clear()
    files = sorted(str(p.relative_to(repo)) for p in (repo / "api").glob("*.py"))
    amap = {"head": "abc1234", "entities": {"x": {"endpoints": C.parse_endpoints(repo, files), "models": models}}, "app_middleware": [],
            "function_insight": {"services/orders.py::place": {"access": {"ops": [{"model": "Order", "rw": "w"}]}}}}
    for e in amap["entities"]["x"]["endpoints"]:
        e.pop("refs", None)
    os.environ["GABE_FORMS_ARMS"] = arms
    return B.extend_backend(P.build(amap, repo), amap, repo, {})


def at(repo, rel, text, nth=1):
    hits = [i + 1 for i, l in enumerate((repo / rel).read_text().splitlines()) if text in l]
    return f"{rel}:{hits[nth - 1]}"
PYF

py "SF3 · FIRE: M2 guard_use on the unique set, M4 checks read, M6 an overridden default, M7 hooks, M8 a nullable by annotation, M9 writers in and outside the map; the tree replayed" <<'PY'
import sys; sys.path.insert(0, str(T))
from model_fixture import at, make, mbuild
M = make()
f = mbuild(M, "short")
o = f["models"]["model:Order"]
assert o["guard_use"] == [{"fn": "services/orders.py::place", "at": at(M, "services/orders.py", "existing = session.execute"), "unique": ["key", "team_id"],
                           "exit_at": at(M, "services/orders.py", "if existing is not None")}], o["guard_use"]
assert o["default_overridden"] == [{"column": "status", "default": "new", "set": "held", "at": at(M, "services/orders.py", 'status="held"')}], o["default_overridden"]
assert o["constraints"]["checks"] == [{"name": "ck_orders_qty", "sql": "qty > 0", "at": int(at(M, "models.py", "CheckConstraint(").split(":")[1])}], o["constraints"]
assert o["drift"] == [{"column": "created_at", "field": "nullable", "model": False, "migration": True, "model_from": "annotation"}], o["drift"]
md = next(x for x in f["arm_findings"]["short"] if x["id"] == "migration-drift")
assert md["fields"] == {"nullable": 1} and md["columns"] == ["created_at"], md      # V25: the finding says WHICH field disagrees
c = o["columns"]
assert (c["display_rank"]["attr"], c["display_rank"]["nullable"], c["status"]["default"], c["status"]["server_default"], c["qty"]["nullable_from"]) == ("rank", True, "new", "new", "annotation"), c
assert [h["event"] for h in o["hooks"]] == ["before_insert"] and [(h["event"], h["cols"]) for h in f["models"]["model:Tag"]["hooks"]] == [("validates", ["name"])]
assert o["writers"] == ["services/orders.py::place"] and o["writers_outside_map"] == [] and o["tests_outside_map"] == 1, (o["writers"], o["writers_outside_map"], o["tests_outside_map"])
assert f["models"]["model:Tag"]["writers_outside_map"] == [at(M, "scripts/seed.py", "Tag(")], f["models"]["model:Tag"]["writers_outside_map"]
mg = f["migrations"]["migrations/versions"]
assert (mg["state"], mg["revisions"], mg["heads"], mg["tables"], o["migration"]) == ("defined", 2, ["0002_orders_check"], 2, {"tree": "migrations/versions", "state": "defined"}), mg
assert sorted((x["id"], x["model"]) for x in f["arm_findings"]["short"]) == [("default-overridden", "model:Order"), ("migration-drift", "model:Order")], f["arm_findings"]["short"]
s = f["arms"]["short"]["stats"]["model"]
assert (s["models"], s["drift_models"], s["drift_columns"], s["guard_use"], s["overridden"], s["hooks"]) == (2, 1, 1, 1, 1, 2), s
PY

py "SF3 · SILENT: the batch-added check matches, the loop-added column matches its name override, a constant and sa.false() server default match, a caught unique column has no guard, a seed that sets no default overrides none" <<'PY'
import sys; sys.path.insert(0, str(T))
from model_fixture import make, mbuild
f = mbuild(make(), "short")
o, t = f["models"]["model:Order"], f["models"]["model:Tag"]
assert not [x for x in o["drift"] if x["field"] != "nullable"], o["drift"]
assert t["drift"] == [] and t["default_overridden"] == [] and t["guard_use"] == [], t
assert t["columns"]["name"]["unique"] is True and t["columns"]["active"]["server_default"] == "false", t["columns"]
PY

py "SF3 · mutations: a check dropped from the migration, a type the migration widens, a guard that names half the unique set, a constructor that sets the default" <<'PY'
import sys; sys.path.insert(0, str(T))
from model_fixture import mbuild, mvariant
def edit(d):
    patch(d, "migrations/versions/0002_orders_check.py", '''    with op.batch_alter_table("orders") as batch:
        batch.create_check_constraint(_CK, "qty > 0")
''', "")
    patch(d, "migrations/versions/0001_orders.py", 'sa.Column("qty", sa.Integer(), nullable=False)', 'sa.Column("qty", sa.BigInteger(), nullable=False)')
    patch(d, "services/orders.py", "Order.team_id == team_id, ", "")
    patch(d, "services/orders.py", 'status="held"', 'status="new"')
g = mbuild(mvariant("mdrift", edit), "short")
o = g["models"]["model:Order"]
got = {(x.get("column") or x.get("constraint"), x["field"], x["model"], x["migration"]) for x in o["drift"]}
assert got == {("created_at", "nullable", False, True), ("ck_orders_qty", "check", "present", "absent"), ("qty", "type", "Integer", "BigInteger")}, got
assert o["guard_use"] == [] and o["default_overridden"] == [], (o["guard_use"], o["default_overridden"])
fd = next(x for x in g["arm_findings"]["short"] if x["id"] == "migration-drift")
assert (fd["columns"], fd["checks"]) == (["created_at", "qty"], ["ck_orders_qty"]) and not [x for x in g["arm_findings"]["short"] if x["id"] == "default-overridden"], g["arm_findings"]["short"]
PY

py "SF3b · FIRE+SILENT (D-061 S2): M2 guard_use reads the guard's select by the ONE verb rule — the library's select under an alias or through its module is one; a project function named select never is" <<'PY'
import sys; sys.path.insert(0, str(T))
from model_fixture import mbuild, mvariant
def guard(name, head, call):
    def edit(d):
        patch(d, "services/orders.py", "from sqlalchemy import select\n", head)
        patch(d, "services/orders.py", "session.execute(select(Order)", "session.execute(" + call)
        (d / "helpers.py").write_text("def select(*a):\n    return a\n")
        (d / "dbf.py").write_text("from sqlalchemy import select\n")
    g = mbuild(mvariant(name, edit), "short")
    return [u["unique"] for u in g["models"]["model:Order"]["guard_use"]]
assert guard("g-alias", "from sqlalchemy import select as q\n", "q(Order)") == [["key", "team_id"]]        # FIRE: the written name was `q`
assert guard("g-mod", "import sqlalchemy as sa\n", "sa.select(Order)") == [["key", "team_id"]]             # FIRE: through the library module
assert guard("g-proj", "from helpers import select\n", "select(Order)") == []                              # SILENT: a project `select`
assert guard("g-facade", "from dbf import select\n", "select(Order)") == [["key", "team_id"]]              # FIRE: a project facade of the library's select, one hop
PY

py "SF11 · FIRE+SILENT: a raw ALTER TABLE … RENAME COLUMN is a rename the replay reads — no phantom drift for either half, and it is not a raw op" <<'PY'
import sys; sys.path.insert(0, str(T))
from model_fixture import make, mbuild, mvariant
def rename(d):
    (d / "migrations/versions/0003_note.py").write_text('import sqlalchemy as sa\nfrom alembic import op\n\nrevision = "0003_note"\ndown_revision = "0002_orders_check"\n\n\ndef upgrade():\n    op.add_column("orders", sa.Column("note", sa.String(50), nullable=True))\n')
    (d / "migrations/versions/0004_rename.py").write_text('from alembic import op\n\nrevision = "0004_rename"\ndown_revision = "0003_note"\n\n\ndef upgrade():\n    op.execute("ALTER TABLE orders RENAME COLUMN note TO memo")\n    op.execute("SELECT 1")\n')
    m = d / "models.py"; src = m.read_text()
    assert src.count("    qty: Mapped[int] = mapped_column(Integer, default=1)\n") == 1
    m.write_text(src.replace("    qty: Mapped[int] = mapped_column(Integer, default=1)\n", "    qty: Mapped[int] = mapped_column(Integer, default=1)\n    memo: Mapped[str | None] = mapped_column(String(50), nullable=True)\n"))
base = mbuild(make(), "short")
g = mbuild(mvariant("rename", rename), "short")
o = g["models"]["model:Order"]
assert "memo" in o["columns"] and o["columns"]["memo"]["nullable"] is True, sorted(o["columns"])       # the model's column …
drift = [x for x in o["drift"] if x.get("column") in ("note", "memo")]
assert drift == [], drift                                                                            # … meets a migration column: no phantom half
assert g["migrations"]["migrations/versions"]["state"] == "defined", g["migrations"]
assert g["arms"]["short"]["stats"]["migration"]["raw_ops"] == base["arms"]["short"]["stats"]["migration"]["raw_ops"] + 1, "only SELECT 1 is raw"
PY

py "SF3 · a second head reads the tree unknown; a model part that raises reads present:false and writes no model or finding" <<'PY'
import sys; sys.path.insert(0, str(T))
import _a3_forms_model as MD
from model_fixture import make, mbuild, mvariant
def fork(d):
    (d / "migrations/versions/0003_side.py").write_text('revision = "0003_side"\ndown_revision = "0001_orders"\n\n\ndef upgrade():\n    pass\n')
g = mbuild(mvariant("mfork", fork), "short")
mg = g["migrations"]["migrations/versions"]
assert mg["state"] == "unknown" and sorted(mg["heads"]) == ["0002_orders_check", "0003_side"] and g["arms"]["short"]["stats"]["migration"]["multi_head"] == 1, mg
assert g["models"]["model:Order"]["migration"] == {"tree": "migrations/versions", "state": "unknown"}, g["models"]["model:Order"]["migration"]
real = MD.model_part
def boom(*a, **k):
    real(*a, **k)
    raise RuntimeError("model down")
MD.model_part = boom
h = mbuild(make(), "short")
assert h["arms"]["short"]["parts"]["model"] == {"present": False, "reason": "error: RuntimeError: model down"}, h["arms"]["short"]["parts"]
assert "models" not in h and not [x for x in h.get("arm_findings", {}).get("short", []) if x["id"] in ("migration-drift", "default-overridden")], sorted(h)
PY

py "SF3 · replay idioms: a renamed table, a check created twice under one name, a dropped table its model still maps, an import alias, a TypeDecorator impl, nested and Python-side type arguments, an enum member default, an explicit None default, Uuid ≡ UUID, a quoted text() default, an imported TypeDecorator, a table the replay only saw altered" <<'PY'
import sys; sys.path.insert(0, str(T))
from model_fixture import MODELS, mbuild, mvariant
def idioms(d):
    (d / "migrations/versions/0003_notes.py").write_text("""import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0003_notes"
down_revision = "0002_orders_check"

CK = "ck_memo_body"


def upgrade():
    op.create_table(
        "memo",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("body", sa.String(length=80), nullable=False),
        sa.Column("ref", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("kind", sa.String(), nullable=False, server_default="note"),
        sa.Column("flag", sa.Boolean(), nullable=True, server_default=None),
        sa.Column("code", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("labels", sa.JSON(), nullable=True, server_default=sa.text("'[]'")),
        sa.Column("extra", sa.Text(), nullable=True),
    )
    op.create_check_constraint(CK, "memo", "length(body) > 0")
    op.create_check_constraint(CK, "memo", "length(body) > 1")
    op.rename_table("memo", "notes")
    op.create_table("gone", sa.Column("id", sa.Integer(), primary_key=True))
    op.drop_table("gone")
    op.alter_column("legacy", "name", nullable=False)
""")
    (d / "coltypes.py").write_text("""from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator


class Wide(TypeDecorator):
    impl = Text
""")
    (d / "notes.py").write_text("""import uuid

from sqlalchemy import JSON, Boolean, Integer, String, Uuid
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import TypeDecorator

from coltypes import Wide
from models import Base


class NoteKind:
    NOTE = "note"


class Trimmed(TypeDecorator):
    impl = String


class Note(Base):
    __tablename__ = "notes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    body: Mapped[str] = mapped_column(Trimmed(80))
    ref: Mapped[str | None] = mapped_column(PGUUID(as_uuid=True))
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    kind: Mapped[str] = mapped_column(String, server_default=NoteKind.NOTE.value)
    flag: Mapped[bool | None] = mapped_column(Boolean)
    code: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    labels: Mapped[list | None] = mapped_column(JSON, server_default="[]")
    extra: Mapped[str | None] = mapped_column(Wide)


class Gone(Base):
    __tablename__ = "gone"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)


class Legacy(Base):
    __tablename__ = "legacy"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String)
""")
models = MODELS + [{"cls": "Note", "table": "notes", "file": "notes.py", "uqs": []}, {"cls": "Gone", "table": "gone", "file": "notes.py", "uqs": []},
                   {"cls": "Legacy", "table": "legacy", "file": "notes.py", "uqs": []}]
f = mbuild(mvariant("midioms", idioms), "short", models)
n, g = f["models"]["model:Note"], f["models"]["model:Gone"]
assert n["drift"] == [{"constraint": "ck_memo_body", "field": "check", "model": "absent", "migration": "present"}], n["drift"]
c = n["columns"]
assert (c["body"]["type"], c["ref"]["type"], c["tags"]["type"], c["kind"]["server_default"], c["flag"]["server_default"]) == ("String", "UUID", "ARRAY(String)", "note", None), c
assert n["migration"] == {"tree": "migrations/versions", "state": "defined"}, n["migration"]
assert (c["code"]["type"], c["labels"]["server_default"], c["extra"]["type"]) == ("UUID", "[]", "Text"), c
assert f["models"]["model:Legacy"]["drift"] == [], f["models"]["model:Legacy"]["drift"]
assert g["drift"] == [{"field": "table", "model": "present", "migration": "dropped"}] and g["migration"]["table"] == "dropped", g
assert f["migrations"]["migrations/versions"]["tables"] == 4 and f["arms"]["short"]["stats"]["model"]["no_migration"] == 0, (f["migrations"], f["arms"]["short"]["stats"]["model"])
PY

py "SF4 · M10 by reference: the racing claim's Slice 6 fact and Slice 7 race-500 on its model; SILENT on the caught claim; no race-500 without the contract arm" <<'PY'
import sys; sys.path.insert(0, str(T))
from model_fixture import at, make, mbuild
M = make()
f = mbuild(M, "short,effects,contract")
o, t = f["models"]["model:Order"]["m10"], f["models"]["model:Tag"]["m10"]
assert [r["state"] for r in o["races"]] == ["uncaught"] and all(r["step"] in f["steps"] for r in o["races"]), o
assert o["race_500"] == [{"endpoint": "endpoint:POST /orders/place", "claim": at(M, "services/orders.py", "order = Order(")}], o["race_500"]
assert [r["state"] for r in t["races"]] == ["handled"] and t["race_500"] == [], t
g = mbuild(M, "short")
assert g["models"]["model:Order"]["m10"]["race_500"] == [] and g["arms"]["contract"]["present"] is False, (g["models"]["model:Order"]["m10"], g["arms"]["contract"])
PY

cat > "$T/setting_fixture.py" <<'PYF'
"""Slice 10b's fixture — its own tree: one settings class (a Literal, an Enum, a flag its constant pairs with, a bare cap, a
Field-bounded and a validator-bounded number, an aliased secret), readers a parameter, a module name and a property prove,
an untyped receiver and a copy, tracked env files beside a `.env` and `.env.local` that must never be read, and tests with
an autouse fixture."""
import os
import shutil
from pathlib import Path

T = Path(os.environ["T"])
FILES = {
    "docs/site/center/center.config.json": "{}",
    "uv.lock": 'version = 1\n\n[[package]]\nname = "fastapi"\nversion = "0.136.3"\n',
    "config.py": """from enum import StrEnum
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Mode(StrEnum):
    MOCK = "mock"
    REAL = "real"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SHOP_")

    environment: Literal["local", "staging", "production"] = "local"
    mode: Mode = Mode.MOCK
    # Set SHOP_ORDERS_ENABLED=true on staging; leave unset everywhere else.
    orders_enabled: bool = False
    order_cap: int = 10
    page_size: int = Field(default=20, ge=1, le=100)
    photo_limit: int = 5
    api_token: str = Field(default="", validation_alias="SHOP_TOKEN")
    region: str = "eu"

    @field_validator("photo_limit")
    @classmethod
    def _positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("photo_limit must be >= 1")
        return v

    @property
    def orders_live(self) -> bool:
        return self.orders_enabled and self.environment != "production"

    @model_validator(mode="after")
    def _guard(self):
        if self.orders_enabled and self.environment == "production":
            raise ValueError("orders_enabled is forbidden in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
""",
    "constants.py": "from typing import Final\n\nORDERS_ENABLED: Final[bool] = False\n",
    "api/orders.py": """from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from config import Settings, get_settings
from constants import ORDERS_ENABLED

router = APIRouter(prefix="/orders")


@router.post("/place")
def place(settings: Annotated[Settings, Depends(get_settings)]):
    if not (ORDERS_ENABLED or settings.orders_enabled):
        raise HTTPException(status_code=403, detail="orders are disabled")
    return {"cap": settings.order_cap}


@router.get("/list")
def list_orders(cfg=Depends(get_settings)):
    return {"size": cfg.page_size}
""",
    "services/limits.py": """from config import get_settings

settings = get_settings()
CAP = settings.order_cap


def live() -> bool:
    return settings.orders_live


def region_for(s) -> str:
    return s.region
""",
    ".env.example": "SHOP_MODE=real\n# SHOP_ORDER_CAP=10\n# SHOP_REGION=us\nSHOP_TOKEN=abc123\n",
    ".env": "SHOP_ORDER_CAP=99\nSHOP_ORDERS_ENABLED=true\n",
    ".env.local": "SHOP_REGION=zz\n",
    ".github/workflows/ci.yml": "jobs:\n  test:\n    env:\n      SHOP_ENVIRONMENT: staging\n",
    "tests/conftest.py": """import pytest

import api.orders as orders


@pytest.fixture(autouse=True)
def _orders_on(monkeypatch):
    monkeypatch.setattr(orders, "ORDERS_ENABLED", True)
""",
    "tests/test_orders.py": """from config import Settings, get_settings


def test_orders_off(monkeypatch, client):
    import api.orders as orders
    monkeypatch.setattr(orders, "ORDERS_ENABLED", False)
    client.app.dependency_overrides[get_settings] = lambda: Settings(orders_enabled=False)


def test_cap():
    s = Settings(order_cap=10)
    assert s.order_cap == 10


def test_page(monkeypatch):
    monkeypatch.setenv("SHOP_PAGE_SIZE", "50")
""",
}


def make(d=None):
    d = d or T / "sapp"
    shutil.rmtree(d, ignore_errors=True)
    for rel, text in FILES.items():
        p = d / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)
    return d


def at(repo, rel, text, nth=1):
    hits = [i + 1 for i, l in enumerate((repo / rel).read_text().splitlines()) if text in l]
    return f"{rel}:{hits[nth - 1]}"
PYF

py "SF5 · setting forms: a flag paired with its constant, readers proven by a parameter, a module name and a property, a copy that is no reader, the exit it decides, its startup rule, the autouse test value" <<'PY'
import sys; sys.path.insert(0, str(T))
from setting_fixture import at, make
S_ = make()
f = build(S_, "short", ())
st = f["settings"]
oe = st["setting:orders_enabled"]
assert (oe["at"], oe["env"], oe["allowed"], oe["cls"]) == (at(S_, "config.py", "orders_enabled: bool"), "SHOP_ORDERS_ENABLED", {"values": [False, True]}, "Settings"), oe
assert [(r["at"], r["receiver"], r["receiver_at"]) for r in oe["readers"] if not r.get("via")] == [(at(S_, "api/orders.py", "settings.orders_enabled"), "parameter", at(S_, "api/orders.py", "def place("))], oe["readers"]
assert [(r["at"], r["via"], r["receiver"], r["receiver_at"]) for r in oe["readers"] if r.get("via")] == [(at(S_, "services/limits.py", "settings.orders_live"), "orders_live", "module", "services/limits.py:3")], oe["readers"]
assert [(e["constant"], e["at"], e["value"], e["op"]) for e in oe["effective"]] == [("ORDERS_ENABLED", "constants.py:3", False, ["or"])], oe["effective"]
assert [(x["endpoint"], x["status"]) for x in oe["fallback"]] == [("endpoint:POST /orders/place", 403)], oe["fallback"]
assert [(r["kind"], r["at"]) for r in oe["startup"]] == [("model_validator", at(S_, "config.py", "if self.orders_enabled and"))], oe["startup"]
oc = st["setting:order_cap"]
assert [(c["to"], c["receiver"]) for c in oc["copies"]] == [("CAP", "module")] and [r["at"] for r in oc["readers"]] == [at(S_, "api/orders.py", "settings.order_cap")], (oc["copies"], oc["readers"])
assert oe["tests"]["values"] == ["false", "true"] and oe["tests"]["default_runs"] is False and any(t.get("autouse") for t in oe["tests"]["sets"]), oe["tests"]
assert [r["via"] for r in st["setting:environment"]["readers"]] == ["orders_live"] and st["setting:environment"]["allowed"] == {"values": ["local", "staging", "production"]}
assert st["setting:mode"]["allowed"] == {"values": ["mock", "real"], "enum": "Mode"} and f["arms"]["short"]["parts"]["setting"]["present"] is True
PY

py "SF6 · F2 unbounded-number FIRE on a bare cap, SILENT on a Field bound and a validator comparison; F4 a commented default, a commented other value, a redacted secret, a workflow value, never .env; F7 and F8 counts" <<'PY'
import sys; sys.path.insert(0, str(T))
from setting_fixture import at, make
S_ = make()
f = build(S_, "short", ())
st = f["settings"]
fs = sorted((x["id"], x["setting"]) for x in f["arm_findings"]["short"] if x["id"] in ("unbounded-number", "startup-unchecked", "env-unset", "one-value-tested"))
assert fs == [("env-unset", "setting:orders_enabled"), ("env-unset", "setting:region"), ("one-value-tested", "setting:order_cap"),
              ("startup-unchecked", "setting:order_cap"), ("unbounded-number", "setting:order_cap")], fs
assert st["setting:page_size"]["bounds"] == {"ge": 1, "le": 100} and [r.get("bound") for r in st["setting:photo_limit"]["startup"]] == ["v < 1"]
assert [r["at"] for r in st["setting:page_size"]["readers_unverified"]] == [at(S_, "api/orders.py", "cfg.page_size")] and not st["setting:page_size"]["readers"]
assert [r["at"] for r in st["setting:region"]["readers_unverified"]] == [at(S_, "services/limits.py", "s.region")]
env = st["setting:order_cap"]["environment"]
assert env["state"] == "default" and [(x["file"], x.get("commented"), x["value"]) for x in env["files"]] == [(".env.example", True, "10")], env
assert (st["setting:region"]["environment"]["state"], st["setting:region"]["environment"]["because"]) == ("external", "commented value")
assert (st["setting:orders_enabled"]["environment"]["state"], st["setting:orders_enabled"]["environment"]["because"]) == ("external", "declaration comment")
tok = st["setting:api_token"]
assert tok["env"] == "SHOP_TOKEN" and tok["environment"]["state"] == "defined" and tok["environment"]["files"][0]["value"] == "<redacted>", tok["environment"]
assert (st["setting:environment"]["environment"]["state"], st["setting:environment"]["environment"]["files"][0]["file"]) == ("defined", ".github/workflows/ci.yml")
read = {x["file"] for s in st.values() for x in s["environment"]["files"]}
assert read <= {".env.example", ".github/workflows/ci.yml"}, read
assert st["setting:page_size"]["tests"]["values"] == ["50.0"] and st["setting:page_size"]["tests"]["default_runs"] is True
PY

py "SF-X · external on a deploy-only value; SILENT once a tracked example file sets it" <<'PY'
import sys; sys.path.insert(0, str(T))
from setting_fixture import T as TT, make
d = make(TT / "sfx")
(d / ".env.example").write_text((d / ".env.example").read_text() + "SHOP_ORDERS_ENABLED=false\n")
f = build(d, "short", ())
oe = f["settings"]["setting:orders_enabled"]["environment"]
assert oe["state"] == "defined" and [(x["file"], x["value"]) for x in oe["files"]] == [(".env.example", "false")], oe
assert not [x for x in f["arm_findings"]["short"] if x["id"] == "env-unset" and x["setting"] == "setting:orders_enabled"], f["arm_findings"]["short"]
PY

py "SF14 · FIRE: a settings factory a function imports in its OWN body proves the call it makes a reader — the read is a reader with a call receiver, never an unverified one" <<'PY'
import sys; sys.path.insert(0, str(T))
from setting_fixture import T as TT, at, make
d = make(TT / "slocal")
p = d / "services/limits.py"
p.write_text(p.read_text() + "\n\ndef region_now() -> str:\n    from config import get_settings as gs3\n    return gs3().region\n")
f = build(d, "short", ())
rg = f["settings"]["setting:region"]
assert (at(d, "services/limits.py", "gs3().region"), "call") in [(r["at"], r["receiver"]) for r in rg["readers"]], rg["readers"]
assert at(d, "services/limits.py", "gs3().region") not in [r["at"] for r in rg.get("readers_unverified") or []], rg
PY

py "SF10 · mutations: a typed receiver turns an unverified read into a reader; a tree with no settings class reads the part absent while its stage stands; a setting part that raises reads present:false and writes no settings" <<'PY'
import sys; sys.path.insert(0, str(T))
import _a3_forms_setting as ST
from setting_fixture import T as TT, at, make
d = make(TT / "styped")
patch(d, "api/orders.py", "def list_orders(cfg=Depends(get_settings)):", "def list_orders(cfg: Settings = Depends(get_settings)):")
f = build(d, "short", ())
ps = f["settings"]["setting:page_size"]
assert [(r["at"], r["receiver"]) for r in ps["readers"]] == [(at(d, "api/orders.py", "cfg.page_size"), "parameter")] and ps["readers_unverified"] == [], ps
e = make(TT / "snone")
(e / "config.py").write_text("X = 1\n")
h = build(e, "short", ())
assert h["arms"]["short"]["parts"]["setting"] == {"present": False, "reason": "no BaseSettings class in the project"} and "settings" not in h, h["arms"]["short"]["parts"]
assert h["arms"]["short"]["parts"]["schema"]["present"] is True and h["arms"]["short"]["parts"]["model"]["present"] is True, h["arms"]["short"]["parts"]
real = ST.setting_part
def boom(*a, **k):
    real(*a, **k)
    raise RuntimeError("setting down")
ST.setting_part = boom
g = build(make(), "short", ())
assert g["arms"]["short"]["parts"]["setting"] == {"present": False, "reason": "error: RuntimeError: setting down"}, g["arms"]["short"]["parts"]
assert "settings" not in g and not [x for x in g.get("arm_findings", {}).get("short", []) if x.get("setting")], sorted(g)
PY

cat > "$T/mirror_fixture.py" <<'PYF'
"""Slice 10c's fixture — its own tree: a model with a check, a create schema and its batch sibling (a type alias, a
different default, a length only the sibling caps), a from_attributes response, a service fed by the schema and one that
writes the column from nothing a schema checked."""
import os
import shutil
from pathlib import Path

import _a3_code as C
import _a3_forms_build as B
import _a3_forms_model as MD
import _a3_paths as P

T = Path(os.environ["T"])
FILES = {
    "docs/site/center/center.config.json": "{}",
    "uv.lock": 'version = 1\n\n[[package]]\nname = "fastapi"\nversion = "0.136.3"\n\n[[package]]\nname = "sqlalchemy"\nversion = "2.0.50"\n',
    "models.py": """from enum import Enum

from sqlalchemy import CheckConstraint, Float, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Size(str, Enum):
    SMALL = "s"
    LARGE = "l"


class Base(DeclarativeBase):
    pass


class Item(Base):
    __tablename__ = "items"
    __table_args__ = (CheckConstraint("kind IN ('a', 'b')", name="ck_items_kind"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40))
    kind: Mapped[str] = mapped_column(String(10), default="a")
    qty: Mapped[float] = mapped_column(Float, default=1.0)
    unit: Mapped[str] = mapped_column(String(10), default="u")
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    size: Mapped[str] = mapped_column(String(5), default=Size.SMALL)
""",
    "schemas.py": """from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from models import Size

RowKind = Literal["a", "b"]


class ItemCreate(BaseModel):
    name: str = Field(max_length=40)
    kind: Literal["a", "b"] = "a"
    qty: float = Field(default=1.0, gt=0)
    unit: str = Field(default="u", max_length=10)
    note: str | None = None
    size: Size = Size.SMALL


class RowBase(BaseModel):
    kind: RowKind = "a"


class RowInput(RowBase):
    name: str = Field(max_length=40)
    qty: float = Field(default=1.0, gt=0)
    unit: str = Field(default="uu", max_length=10)
    note: str | None = Field(default=None, max_length=300)


class BatchRequest(BaseModel):
    rows: list[RowInput]


class ItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    note: str


class ItemEcho(BaseModel):
    name: str
    note: str = ""
""",
    "services/items.py": """from models import Item
from schemas import ItemCreate


def add(session, payload: ItemCreate):
    item = Item(name=payload.name, kind=payload.kind, qty=payload.qty, unit=payload.unit, note=payload.note, size=payload.size)
    session.add(item)
    return item


def restock(session, name):
    session.add(Item(name=name, qty=0))


def clone(session, payload: ItemCreate):
    session.add(Item(**payload.model_dump()))
""",
    "api/items.py": """from fastapi import APIRouter

from schemas import BatchRequest, ItemCreate, ItemEcho, ItemOut
from services.items import add

router = APIRouter(prefix="/items")


@router.post("/one", response_model=ItemOut)
def one(payload: ItemCreate):
    return add(None, payload)


@router.post("/batch")
def batch(payload: BatchRequest):
    for index, row in enumerate(payload.rows):
        create = ItemCreate(name=row.name, kind=row.kind, qty=row.qty, unit=row.unit, note=row.note)
        add(None, create)
    return {}


@router.post("/echo")
def echo(payload: ItemCreate):
    return ItemEcho(name=payload.name, note=payload.note)
""",
}


def make(d=None):
    d = d or T / "mirapp"
    shutil.rmtree(d, ignore_errors=True)
    for rel, text in FILES.items():
        p = d / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)
    return d


def mirbuild(repo):
    C.ENTITY_CODE = {"x": {"api": ["api/*.py"], "services": ["services/*.py"], "models": ["models.py"], "schemas": ["schemas.py"]}}
    C._EMAP_CACHE.clear()
    MD._REPLAYS.clear()
    files = sorted(str(p.relative_to(repo)) for p in (repo / "api").glob("*.py"))
    amap = {"head": "abc1234", "app_middleware": [], "entities": {"x": {"endpoints": C.parse_endpoints(repo, files),
            "schemas": C.parse_schemas(repo, ["schemas.py"]), "models": [{"cls": "Item", "table": "items", "file": "models.py", "uqs": []}]}}}
    for e in amap["entities"]["x"]["endpoints"]:
        e.pop("refs", None)
    os.environ["GABE_FORMS_ARMS"] = "short"
    return B.extend_backend(P.build(amap, repo), amap, repo, {})


def at(repo, rel, text, nth=1):
    hits = [i + 1 for i, l in enumerate((repo / rel).read_text().splitlines()) if text in l]
    return f"{rel}:{hits[nth - 1]}"
PYF

py "SF7 · mirrors: a schema bound the table lacks and the writer that bypasses it, a sibling default and length that differ, allowed values that agree through an alias and a base class, a response that calls a nullable column required, a model_dump writer, an enum member default that agrees, no pair into a response rebuilt from a request" <<'PY'
import sys; sys.path.insert(0, str(T))
from mirror_fixture import at, make, mirbuild
M_ = make()
f = mirbuild(M_)
mr = f["mirrors"]
q = mr["mirror:Item.qty"]
assert [(p["with"], p["via"], p["sites"]) for p in q["pairs"]] == [("schema:ItemCreate.qty", "flow", [at(M_, "services/items.py", "item = Item("), at(M_, "services/items.py", "Item(**payload.model_dump())")])], q["pairs"]
assert "mirror:ItemEcho.note" not in mr and "mirror:ItemEcho.name" not in mr, sorted(k for k in mr if "Echo" in k)
assert [(r["rule"], r["verdict"], r["other"]) for r in q["rows"]] == [("bound", "schema-only", {"gt": 0})], q["rows"]   # V26: `other` is the schema's value, `with` its reference
assert q["bypass_writers"] == [{"at": at(M_, "services/items.py", "Item(name=name, qty=0)"), "value": "0"}], q["bypass_writers"]
u = mr["mirror:ItemCreate.unit"]
assert [(p["with"], p["via"], p["sites"]) for p in u["pairs"]] == [("schema:RowInput.unit", "sibling", [at(M_, "api/items.py", "create = ItemCreate(")])], u["pairs"]
assert [(r["rule"], r["verdict"], r["other"], r["subject"]) for r in u["rows"]] == [("default", "disagree", "uu", "u")], u["rows"]   # V26: the form is the subject's
assert [(r["rule"], r["verdict"], r["other"], r["subject"]) for r in mr["mirror:ItemCreate.note"]["rows"]] == [("length", "disagree", 300, None)]
assert mr["mirror:ItemCreate.kind"]["rows"] == [] and mr["mirror:ItemCreate.kind"]["agree"] >= 1, mr["mirror:ItemCreate.kind"]
k = mr["mirror:Item.kind"]
assert [(r["rule"], r["verdict"]) for r in k["rows"]] == [("length", "model-only")] and k["agree"] >= 2, k
assert [(r["rule"], r["verdict"], r["via"]) for r in mr["mirror:Item.note"]["rows"]] == [("nullable", "disagree", "orm")], mr["mirror:Item.note"]
sz = mr["mirror:Item.size"]
assert not [r for r in sz["rows"] if r["rule"] == "default"] and sz["agree"] >= 2, sz
fs = sorted((x["id"], x["mirror"], x.get("rule")) for x in f["arm_findings"]["short"] if x["id"] in ("mirror-disagree", "schema-only-bound"))
assert fs == [("mirror-disagree", "mirror:Item.note", "nullable"), ("mirror-disagree", "mirror:ItemCreate.note", "length"),
              ("mirror-disagree", "mirror:ItemCreate.unit", "default"), ("schema-only-bound", "mirror:Item.qty", None)], fs
assert f["arms"]["short"]["parts"]["mirror"]["present"] is True and not [p for p in f["arms"]["short"]["parts"].values() if "not built" in str(p.get("reason"))]
PY

py "SF10 · mirror mutations: equal sibling defaults drop the row; a table check agrees with the schema bound; a copied setting constant with another value disagrees, its paired constant agrees" <<'PY'
import sys; sys.path.insert(0, str(T))
from mirror_fixture import T as TT, make, mirbuild
d = make(TT / "mireq")
patch(d, "schemas.py", 'unit: str = Field(default="uu", max_length=10)', 'unit: str = Field(default="u", max_length=10)')
patch(d, "models.py", '(CheckConstraint("kind IN (\'a\', \'b\')", name="ck_items_kind"),)', '(CheckConstraint("kind IN (\'a\', \'b\')", name="ck_items_kind"), CheckConstraint("qty > 0", name="ck_items_qty"))')
g = mirbuild(d)
assert g["mirrors"]["mirror:ItemCreate.unit"]["rows"] == [], g["mirrors"]["mirror:ItemCreate.unit"]
assert [(r["rule"], r["verdict"]) for r in g["mirrors"]["mirror:Item.qty"]["rows"]] == [] and "bypass_writers" not in g["mirrors"]["mirror:Item.qty"], g["mirrors"]["mirror:Item.qty"]
assert not [x for x in g["arm_findings"]["short"] if x["id"] == "schema-only-bound" or (x["id"] == "mirror-disagree" and x["mirror"] == "mirror:ItemCreate.unit")]
from setting_fixture import make as smake
e = smake(TT / "mircopy")
(e / "constants.py").write_text((e / "constants.py").read_text() + "ORDER_CAP = 12\n")
h = build(e, "short", ())
oc, oe = h["mirrors"]["mirror:setting:order_cap"], h["mirrors"]["mirror:setting:orders_enabled"]
assert [(r["rule"], r["verdict"], r["subject"], r["other"], r["via"]) for r in oc["rows"]] == [("value", "disagree", "10", 12, "setting-copy")], oc   # the setting is the subject, the copied constant the other
assert oe["rows"] == [] and oe["agree"] == 1 and [p["via"] for p in oe["pairs"]] == ["flag-pair"], oe
PY

echo "forms-short: $pass passed, $fail failed"
[ "$fail" -eq 0 ] || exit 1
