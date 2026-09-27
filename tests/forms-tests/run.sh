#!/usr/bin/env bash
# Forms tests battery — the TESTS arm (docs/design/element-forms/amendment-1.md §A2 Slice 9): which test proves which exit
# and which path. A synthetic FastAPI tree with a pytest module and its junit results is built through the real
# orchestrator with `paths,tests` selected — AST only, no test runs. Each case FIREs and stays SILENT. Exit 0 = all pass.
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
GEN="${GEN_OVERRIDE:-$REPO/templates/center/generators}"

T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
pass=0; fail=0
ok()  { pass=$((pass+1)); }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }

A="$T/app"
mkdir -p "$A/api" "$A/services" "$A/tests/results" "$A/docs/site/center"
cat > "$A/docs/site/center/center.config.json" <<'CFG'
{"corpora": [{"key": "api", "runner": "pytest"}], "paths": {"results": "tests/results"}}
CFG
cat > "$A/uv.lock" <<'LOCK'
version = 1

[[package]]
name = "fastapi"
version = "0.136.3"
LOCK
cat > "$A/main.py" <<'PYF'
from fastapi import FastAPI

app = FastAPI()
PYF
cat > "$A/schemas.py" <<'PYF'
from pydantic import BaseModel, Field


class ItemIn(BaseModel):
    name: str = Field(min_length=1)
PYF
cat > "$A/auth.py" <<'PYF'
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

bearer = HTTPBearer()


class BadToken(Exception):
    pass


def verify(creds):
    if not creds:
        raise BadToken
    return creds


def get_user(creds=Depends(bearer)):
    try:
        return verify(creds)
    except BadToken as exc:
        raise HTTPException(status_code=401, detail="invalid token") from exc
PYF
cat > "$A/services/items.py" <<'PYF'
class Busy(Exception):
    pass


class Taken(Exception):
    pass


def create(name):
    if name == "busy":
        raise Busy
    if name == "taken":
        raise Taken
    return {"name": name}
PYF
cat > "$A/services/other.py" <<'PYF'
class Busy(Exception):
    pass


def poke():
    raise Busy
PYF
cat > "$A/api/items.py" <<'PYF'
from fastapi import APIRouter, Depends, HTTPException, Request

from auth import get_user
from schemas import ItemIn
from services.items import Busy, Taken, create

router = APIRouter(prefix="/api/v1/items")


@router.post("/create")
def create_item(request: Request, body: ItemIn, user=Depends(get_user)):
    key = request.headers.get("Idempotency-Key")
    if key is None:
        raise HTTPException(status_code=400, detail="Idempotency-Key required")
    try:
        return create(body.name)
    except Busy:
        raise HTTPException(status_code=409, detail="busy")
    except Taken:
        raise HTTPException(status_code=409, detail="taken")


@router.get("/me")
def me(user=Depends(get_user)):
    return {"user": user}

PYF
cat > "$A/api/other.py" <<'PYF'
from fastapi import APIRouter, Depends, HTTPException

from auth import get_user
from services.other import Busy, poke

router = APIRouter(prefix="/api/v1/other")


@router.post("/poke")
def other(user=Depends(get_user)):
    try:
        poke()
    except Busy:
        raise HTTPException(status_code=409, detail="other busy")
    return {"ok": True}


@router.get("/things/special")
def thing_special():
    return {"special": True}


@router.get("/things/{thing_id}")
def thing_one(thing_id: str):
    if thing_id == "gone":
        raise HTTPException(status_code=404, detail="no thing")
    return {"id": thing_id}

PYF
cat > "$A/tests/test_items.py" <<'PYF'
import pytest

from services.items import Busy, create

AUTH = {"Authorization": "Bearer t"}


async def _seed(client):
    r = await client.post("/api/v1/items/create", json={"name": "seed"}, headers={**AUTH, "Idempotency-Key": "s"})
    assert r.status_code == 200
    return r


async def test_missing_key_400_C1(client):
    resp = await client.post("/api/v1/items/create", json={"name": "x"}, headers=AUTH)
    assert resp.status_code == 400
    assert "Idempotency-Key" in resp.json()["detail"]


async def test_me_unauthenticated_C2(client):
    resp = await client.get("/api/v1/items/me")
    assert resp.status_code in (401, 403)


async def test_conflict_C3(client):
    resp = await client.post("/api/v1/items/create", json={"name": "busy"}, headers={**AUTH, "Idempotency-Key": "k"})
    assert resp.status_code == 409


async def test_flow_C4(client):
    first = await client.get("/api/v1/items/me", headers=AUTH)
    assert first.status_code == 200
    resp = await client.post("/api/v1/items/create", json={"name": "x"}, headers={**AUTH, "Idempotency-Key": "f"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "x"


async def test_helper_only_C5(client):
    await _seed(client)


async def test_blank_422_C6(client):
    resp = await client.post("/api/v1/items/create", json={"name": ""}, headers={**AUTH, "Idempotency-Key": "b"})
    assert resp.status_code == 422


async def test_teapot_C7(client):
    resp = await client.post("/api/v1/items/create", json={"name": "x"}, headers={**AUTH, "Idempotency-Key": "t"})
    assert resp.status_code == 418


async def test_detail_mismatch_C8(client):
    resp = await client.post("/api/v1/items/create", json={"name": "busy"}, headers={**AUTH, "Idempotency-Key": "m"})
    assert resp.status_code == 409
    assert resp.json()["detail"] == "occupied"


def test_service_busy_C9():
    with pytest.raises(Busy):
        create("busy")


async def test_setup_only_C10(client):
    await client.get("/api/v1/items/me", headers=AUTH)
    resp = await client.post("/api/v1/items/create", json={"name": "y"}, headers={**AUTH, "Idempotency-Key": "c"})
    assert resp.status_code == 200


def test_thing_special(client):
    r = client.get("/api/v1/other/things/special")
    assert r.status_code == 200


def test_thing_by_id(client):
    tid = "gone"
    r = client.get(f"/api/v1/other/things/{tid}")
    assert r.status_code == 404
    assert "no thing" in r.json()["detail"]


def test_things_unknown_literal(client):
    r = client.get("/api/v1/other/things/special/extra")
    assert r.status_code == 404


def test_two_slots(client):
    kind, tid = "things", "gone"
    r = client.get(f"/api/v1/other/{kind}/{tid}")
    assert r.status_code == 404


def test_para_C12(client):
    r = client.get("/api/v1/other/things/special")
    assert r.status_code == 200

PYF
python3 - "$A/tests/results/api-junit.xml" <<'PYJ'
import sys
names = ["test_missing_key_400_C1", "test_me_unauthenticated_C2", "test_conflict_C3", "test_flow_C4", "test_helper_only_C5",
         "test_blank_422_C6", "test_teapot_C7", "test_detail_mismatch_C8", "test_service_busy_C9", "test_setup_only_C10",
         "test_thing_special", "test_thing_by_id", "test_things_unknown_literal", "test_two_slots", "test_para_C12[a]", "test_para_C12[b]"]
cases = "".join(f'<testcase classname="tests.test_items" name="{n}" time="0.01" />' for n in names)
open(sys.argv[1], "w").write(f'<testsuites><testsuite name="pytest" tests="{len(names)}">{cases}</testsuite></testsuites>')
PYJ

py() {  # py "<name>" <<'PY' … PY  — the prelude gives A · T · build() · variant() · patch() · ep() · row()
  local name="$1" src; src=$(cat)
  if (cd "$T" && PYTHONPATH="$GEN" A="$A" T="$T" python3 - >"$T/py.txt" 2>&1 <<PY
import copy, json, os, re, shutil
from pathlib import Path
A, T = Path(os.environ["A"]), Path(os.environ["T"])
import _a3_code as C, _a3_paths as P, _a3_forms_build as B
def build(repo, arms="paths,tests"):
    files = sorted(str(p.relative_to(repo)) for p in (repo / "api").glob("*.py"))
    amap = {"head": "abc1234", "entities": {"x": {"endpoints": C.parse_endpoints(repo, files)}},
            "app_middleware": C.parse_app_middleware(repo, {"x": {"api": ["api/*.py"]}})}
    for e in amap["entities"]["x"]["endpoints"]:
        e.pop("refs", None)
    os.environ["GABE_FORMS_ARMS"] = arms
    cfg = json.loads((repo / "docs/site/center/center.config.json").read_text())
    return B.extend_backend(P.build(amap, repo), amap, repo, cfg)
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
def ep(f, key):
    return f["endpoints"][key]
def row(f, key, status, detail=None, phase=None):
    return next(r for r in ep(f, key)["produced"] if r["status"] == status and (detail is None or r.get("detail") == detail) and (phase is None or r.get("phase") == phase))
def refs(r):
    return [(t["case"], t["conf"]) + ((tuple(t["alternatives"]),) if t.get("alternatives") else ()) for t in r.get("tests") or []]
CREATE, ME, OTHER = "endpoint:POST /items/create", "endpoint:GET /items/me", "endpoint:POST /other/poke"
$src
PY
  ); then ok; else bad "$name: $(tail -4 "$T/py.txt")"; fi
}

py "T5 · FIRE+SILENT: a literal test path joins the most literal route, an f-string slot joins the template, and a slot never stands in for a literal" <<'PY'
f = build(A)
sp = next(v for k, v in f["endpoints"].items() if k.endswith("/things/special")); one = next(v for k, v in f["endpoints"].items() if k.endswith("/things/{thing_id}"))
assert any(t["case"].endswith("test_thing_special") for r in sp["returns"] for t in r.get("tests") or []), sp.get("returns")   # the literal route, not {thing_id}
assert not any(t["case"].endswith("test_thing_special") for r in one["produced"] + one["returns"] for t in r.get("tests") or []), "the literal test leaked onto the template route"
r404 = next(r for r in one["produced"] if r.get("status") == 404 and r.get("detail") == "no thing")
assert any(t["case"].endswith("test_thing_by_id") for t in r404.get("tests") or []), r404          # the f-string slot fits {thing_id}
assert not any(t["case"].endswith("test_things_unknown_literal") for e in (sp, one) for r in e["produced"] + e["returns"] for t in r.get("tests") or []), "a longer literal path joined by suffix"
joined = {t["case"] for e in f["endpoints"].values() for r in e["produced"] + e.get("returns", []) for t in r.get("tests") or []}
assert not any(c.endswith("test_two_slots") for c in joined), "a path of two slots stood in for a literal route (V11)"
two = next(v for k, v in f["test_cases"].items() if k.endswith("::test_two_slots"))
act = next(c for c in two["calls"] if c["role"] == "act")
assert act["path"] == "/api/v1/other/{*}/{*}" and "endpoint" not in act and "route_match" not in act, act   # V11: no route stands behind two slots
PY

py "T6 · FIRE+SILENT: a C-id keys a case only when it is unique in the feed — parametrized runs fall back to <tfile>::<def>; a unique C-id still keys as itself" <<'PY'
f = build(A)
assert "C12" not in f["test_cases"] and "tests/test_items.py::test_para_C12" in f["test_cases"], sorted(k for k in f["test_cases"] if "para" in k or k == "C12")   # V35
assert "C1" in f["test_cases"], sorted(f["test_cases"])[:4]
assert f["arms"]["tests"]["present"] is True
g = build(variant("nojunit2", lambda d: (d / "tests/results/api-junit.xml").unlink()))
assert g["arms"]["tests"]["reason"].startswith("absent: "), g["arms"]["tests"]                            # V39: the enumerated form
PY

py "T1 · FIRE: a status plus a detail literal joins the one refusal that says it — never the body-parse 400" <<'PY'
f = build(A)
assert refs(row(f, CREATE, 400, "Idempotency-Key required")) == [("C1", "status+detail")], refs(row(f, CREATE, 400, "Idempotency-Key required"))
call = f["test_cases"]["C1"]["calls"][0]
assert call["role"] == "act" and call["route_match"] == "full" and call["sends"] == ["Authorization"], call
bp = next(x for x in ep(f, CREATE)["framework_exits"] if x["status"] == 400)
assert not bp.get("tests"), bp
PY

py "T2 · FIRE: a status_in with no Authorization sent is the security 401, with the other status as an alternative" <<'PY'
f = build(A)
assert refs(row(f, ME, 401, phase="security")) == [("C2", "status+shape", (403,))], refs(row(f, ME, 401, phase="security"))
assert not row(f, ME, 401, phase="dependency").get("tests"), row(f, ME, 401, phase="dependency")
PY

py "T3 · FIRE: two refusals on one status and no detail asserted — each carries the ref as ambiguous of 2" <<'PY'
f = build(A)
for d in ("busy", "taken"):
    assert ("C3", "ambiguous of 2") in refs(row(f, CREATE, 409, d)), (d, refs(row(f, CREATE, 409, d)))
assert f["test_cases"]["C3"]["calls"][0]["sends"] == ["Authorization", "Idempotency-Key"], f["test_cases"]["C3"]["calls"][0]   # a spread header dict is read
PY

py "T4 · FIRE: a status-only 2xx followed by an asserted call is arrange-checked; the act joins the success return and its path" <<'PY'
f = build(A)
calls = f["test_cases"]["C4"]["calls"]
assert [c["role"] for c in calls] == ["arrange-checked", "act"], calls
ret = next(r for r in ep(f, CREATE)["returns"] if r["depth"] == 0)
assert ("C4", "status") in refs(ret), refs(ret)
path = next(p for p in ep(f, CREATE)["paths"] if p["exit"]["id"] == ret["id"])
assert any(t["case"] == "C4" for t in path.get("tests") or []), path.get("tests")
assert "C4" in ep(f, ME)["tests"]["arranged_by"] and not any(t["case"] == "C4" for r in ep(f, ME)["produced"] + ep(f, ME)["returns"] for t in r.get("tests") or []), ep(f, ME)["tests"]
PY

py "T5 · SILENT: a helper's calls arrange — the case credits nothing and is named helper_arranged" <<'PY'
f = build(A)
assert [c["role"] for c in f["test_cases"]["C5"]["calls"]] == ["arrange"] and f["test_cases"]["C5"]["calls"][0]["helper"] == "_seed", f["test_cases"]["C5"]
assert "C5" in ep(f, CREATE)["tests"]["helper_arranged"], ep(f, CREATE)["tests"]
assert [c["role"] for c in f["test_cases"]["C10"]["calls"]] == ["arrange", "act"] and "C10" in ep(f, ME)["tests"]["arranged_by"], (f["test_cases"]["C10"], ep(f, ME)["tests"])
assert not any(t["case"] == "C5" for e in f["endpoints"].values() for r in e["produced"] + e.get("returns", []) + e.get("framework_exits", []) for t in r.get("tests") or [])
PY

py "T6 · FIRE: a bare 422 on a JSON body joins the validation row, never the body-parse 422" <<'PY'
f = build(A)
assert refs(row(f, CREATE, 422, phase="validation")) == [("C6", "status")], refs(row(f, CREATE, 422, phase="validation"))
bp = next(x for x in ep(f, CREATE)["framework_exits"] if x["status"] == 422)
assert not bp.get("tests"), bp
PY

py "T7 · FIRE: a status the endpoint never produces is asserted-unproduced; a detail no candidate says is test-detail-unmatched" <<'PY'
f = build(A)
found = f["arm_findings"]["tests"]
assert [(x["case"], x["statuses"]) for x in found if x["id"] == "asserted-unproduced"] == [("C7", [418])], found
assert [x["case"] for x in found if x["id"] == "test-detail-unmatched"] == ["C8"], found
assert "C7" in ep(f, CREATE)["tests"]["unjoined"], ep(f, CREATE)["tests"]
PY

py "T8 · FIRE + SILENT: pytest.raises(Busy) around the service credits the row that translates Busy raised in that file, not Taken's" <<'PY'
f = build(A)
assert ("C9", "service raises") in refs(row(f, CREATE, 409, "busy")), refs(row(f, CREATE, 409, "busy"))
assert ("C9", "service raises") not in refs(row(f, CREATE, 409, "taken")), refs(row(f, CREATE, 409, "taken"))
o = row(f, OTHER, 409, "other busy")
assert o.get("raised_at", "").startswith("services/other.py:") and ("C9", "service raises") not in refs(o), (o.get("raised_at"), refs(o))   # a verified Busy raised in another file
PY

py "T12 · FIRE+SILENT: a service the test imports in its OWN body is the pytest.raises root — the translating row raised in its file takes the ref; the same name no import explains takes none" <<'PY'
def local(d):
    patch(d, "tests/test_items.py", 'def test_service_busy_C9():\n    with pytest.raises(Busy):\n        create("busy")',
          'def test_service_busy_C9():\n    from services.items import create as make\n    with pytest.raises(Busy):\n        make("busy")')
f = build(variant("localraise", local))
assert ("C9", "service raises") in refs(row(f, CREATE, 409, "busy")), refs(row(f, CREATE, 409, "busy"))
r = f["test_cases"]["C9"]["raises"]
assert [(x["root"], x.get("imp")) for x in r] == [("make", ["services.items", "create"])], r
g = build(variant("localgone", lambda d: patch(d, "tests/test_items.py", '    with pytest.raises(Busy):\n        create("busy")', '    with pytest.raises(Busy):\n        make("busy")')))
assert ("C9", "service raises") not in refs(row(g, CREATE, 409, "busy")) and "imp" not in g["test_cases"]["C9"]["raises"][0], g["test_cases"]["C9"]
PY

py "T9 · honest-empty: no junit reads present false; the tests arm off writes nothing" <<'PY'
g = build(variant("nojunit", lambda d: (d / "tests/results/api-junit.xml").unlink()))
assert g["arms"]["tests"]["present"] is False and "junit" in g["arms"]["tests"]["reason"] and "test_cases" not in g, g["arms"]["tests"]
off = build(A, "paths")
assert "test_cases" not in off and not any("tests" in v for v in off["endpoints"].values()), "a tests key rode a tests-off build"
PY

py "T10 · determinism + non-interference: two builds agree; with the refs stripped every endpoint row is the paths build's" <<'PY'
a1, a2 = build(A), build(A)
assert json.dumps(a1, sort_keys=True) == json.dumps(a2, sort_keys=True), "two builds differ"
p = build(A, "paths")
def strip(v):
    v = copy.deepcopy(v)
    v.pop("tests", None)
    for k in ("produced", "returns", "framework_exits", "paths"):
        for r in v.get(k) or []:
            r.pop("tests", None)
    return v
assert all(strip(a1["endpoints"][k]) == strip(p["endpoints"][k]) for k in p["endpoints"]), "the tests arm moved something the paths arm wrote"
PY

py "T11 · mutation: no status assert leaves the 400 untested; raises(ValueError) takes the service ref; headers=AUTH moves C2 to the dependency 401; no later act makes the first call act" <<'PY'
a = build(variant("nostatus", lambda d: patch(d, "tests/test_items.py", '    resp = await client.post("/api/v1/items/create", json={"name": "x"}, headers=AUTH)\n    assert resp.status_code == 400\n',
                                               '    resp = await client.post("/api/v1/items/create", json={"name": "x"}, headers=AUTH)\n')))
assert not row(a, CREATE, 400, "Idempotency-Key required").get("tests"), row(a, CREATE, 400, "Idempotency-Key required")
b = build(variant("valueerror", lambda d: patch(d, "tests/test_items.py", "pytest.raises(Busy)", "pytest.raises(ValueError)")))
assert ("C9", "service raises") not in refs(row(b, CREATE, 409, "busy")), refs(row(b, CREATE, 409, "busy"))
c = build(variant("authed", lambda d: patch(d, "tests/test_items.py", 'resp = await client.get("/api/v1/items/me")', 'resp = await client.get("/api/v1/items/me", headers=AUTH)')))
assert refs(row(c, ME, 401, phase="dependency")) == [("C2", "status+shape", (403,))] and not row(c, ME, 401, phase="security").get("tests"), (refs(row(c, ME, 401, phase="dependency")), row(c, ME, 401, phase="security"))
d = build(variant("nolater", lambda d: patch(d, "tests/test_items.py", '    resp = await client.post("/api/v1/items/create", json={"name": "x"}, headers={**AUTH, "Idempotency-Key": "f"})\n    assert resp.status_code == 200\n    assert resp.json()["name"] == "x"\n', "")))
assert [x["role"] for x in d["test_cases"]["C4"]["calls"]] == ["act"], d["test_cases"]["C4"]["calls"]
PY

echo "forms-tests: $pass passed, $fail failed"
[ "$fail" -eq 0 ] || exit 1
