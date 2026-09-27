#!/usr/bin/env bash
# Forms effects battery — the EFFECTS arm (docs/design/element-forms/amendment-1.md §A2 Slice 6): what each path writes,
# commits and rolls back, read against the point the path leaves each function. The cases drive the real orchestrator
# (_a3_forms_build.extend_backend) with `effects` selected over _a3_paths.build output on a synthetic FastAPI +
# SQLAlchemy tree — AST only, nothing imports the fixture. Each case is shown to FIRE and to stay SILENT. Exit 0 = all pass.
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
GEN="${GEN_OVERRIDE:-$REPO/templates/center/generators}"

T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
pass=0; fail=0
ok()  { pass=$((pass+1)); }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }

A="$T/app"
mkdir -p "$A/api" "$A/services" "$A/docs/site/center"
printf '{}' > "$A/docs/site/center/center.config.json"
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
cat > "$A/models.py" <<'PYF'
from sqlalchemy import Column, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (UniqueConstraint("ref", name="uq_orders_ref"),)
    id = Column(Integer, primary_key=True)
    ref = Column(String)


class Claim(Base):
    __tablename__ = "claims"
    __table_args__ = (Index("ix_claims_key", "key", unique=True),)
    id = Column(Integer, primary_key=True)
    key = Column(String)


class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)


class Audit(Base):
    __tablename__ = "audits"
    id = Column(Integer, primary_key=True)
    note = Column(String)
PYF
cat > "$A/db.py" <<'PYF'
from fastapi import Depends, HTTPException

from models import Audit


def get_session():
    session = make_session()
    try:
        yield session
    finally:
        session.close()


def get_user(token: str, session=Depends(get_session)):
    if token == "banned":
        session.add(Audit(note="banned"))
        raise HTTPException(status_code=403, detail="banned")
    seen = Audit(note=token)
    session.add(seen)
    session.commit()
    return seen
PYF
cat > "$A/services/ports.py" <<'PYF'
from typing import Protocol


class Notifier(Protocol):
    def send(self, msg: str) -> None: ...
PYF
cat > "$A/services/orders.py" <<'PYF'
from contextlib import suppress

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from models import Audit, Claim, Order, Tag
from services.ports import Notifier


class Refused(Exception):
    pass


def claim(session, key):
    try:
        with session.begin_nested():
            row = Claim(key=key)
            session.add(row)
            session.flush()
    except IntegrityError:
        return "replay"
    return "new"


def discard(session, key):
    row = session.execute(select(Claim).where(Claim.key == key)).scalar_one_or_none()
    if row is not None:
        session.delete(row)
        session.commit()


def place(session, ref, key):
    state = claim(session, key)
    if state == "replay":
        session.commit()
        return "replayed"
    try:
        order = Order(ref=ref)
        session.add(order)
        session.flush()
        if ref == "bad":
            raise Refused
        session.commit()
        return "placed"
    except Exception:
        session.rollback()
        with suppress(Exception):
            discard(session, key)
        raise


def make_pair(session, ref) -> tuple[Order, Tag]:
    return Order(ref=ref), Tag(name=ref)


def tally(session: Session, ref):
    seen = set()
    seen.add(ref)
    return session.execute(select(func.count(Audit.id))).scalar()


def alert(port: Notifier, msg):
    port.send(msg)


def write_note(session, ref):
    if ref:
        session.add(Audit(note=ref))


def feed(session, ref):
    session.add(Audit(note=ref))
    session.commit()
    yield b"x"
    raise Refused()


def frames(events):
    for e in events:
        yield b"data: " + e


def stamp(session, ref):
    session.add(Tag(name=ref))


def guard_stamp(session, ref):
    session.add(Audit(note=ref))
    if ref == "no":
        raise Refused()
    session.add(Tag(name=ref))


def deep_stamp(session, ref):
    session.add(Audit(note=ref))
    check_ref(session, ref)
    session.add(Tag(name=ref))


def check_ref(session, ref):
    session.add(Claim(key=ref))
    if ref == "no":
        raise Refused("deep")


def either_stamp(session, ref):
    check_ref(session, ref)
    session.add(Tag(name=ref))
    check_other(session, ref)


def check_other(session, ref):
    if ref == "other":
        raise Refused("other")


def deep_value(session, ref):
    session.add(Audit(note=ref))
    check_value(ref)
    session.add(Tag(name=ref))


def check_value(ref):
    if ref == "bad":
        raise ValueError("bad value")


def relay_stamp(session, ref):
    from services.soft import Soft
    try:
        if ref == "soft":
            raise Soft()
    except Refused:
        session.rollback()  # the relay undoes, then passes it on
        raise
    session.add(Tag(name=ref))
PYF
cat > "$A/services/soft.py" <<'PYF'
from services.orders import Refused


class Soft(Refused):
    pass
PYF
cat > "$A/services/errs3.py" <<'PYF'
class AppError(Exception):
    pass


class Denied3(AppError):
    pass
PYF
cat > "$A/services/relay.py" <<'PYF'
def relay3(session, ref):
    from services.errs3 import AppError, Denied3
    try:
        if ref == "x":
            raise Denied3()
    except AppError:
        session.rollback()
        raise
PYF
cat > "$A/services/deep.py" <<'PYF'
from models import Audit


def d1(session, ref):
    d2(session, ref)


def d2(session, ref):
    d3(session, ref)


def d3(session, ref):
    d4(session, ref)


def d4(session, ref):
    d5(session, ref)


def d5(session, ref):
    session.add(Audit(note=ref))
PYF
cat > "$A/api/shop.py" <<'PYF'
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy import select as msel
from sqlalchemy.exc import IntegrityError

from db import get_session, get_user
from models import Audit, Order, Tag
from services.deep import d1
from services.errs3 import Denied3
from services.orders import Refused, alert, deep_stamp, deep_value, either_stamp, feed, frames, make_pair, place, relay_stamp, tally, write_note
from services.relay import relay3

router = APIRouter(prefix="/shop")


@router.post("/place")
def place_order(ref: str, key: str, user=Depends(get_user), session=Depends(get_session)):
    if ref == "":
        raise HTTPException(status_code=400, detail="empty")
    try:
        result = place(session, ref, key)
    except Refused:
        raise HTTPException(status_code=409, detail="refused")
    return {"result": result}


@router.get("/pure")
def pure(ref: str, user=Depends(get_user), session=Depends(get_session)):
    rows = session.execute(select(Order).where(Order.ref == ref)).scalars().all()
    if not rows:
        raise HTTPException(status_code=404, detail="none")
    return {"n": len(rows)}


@router.get("/touch")
def touch(ref: str, session=Depends(get_session)):
    session.commit()
    return {"n": tally(session, ref)}


@router.post("/widen")
def widen(ref: str, session=Depends(get_session)):
    order, tag = make_pair(session, ref)
    order.ref = ref
    found = session.execute(select(Order).where(Order.ref == ref)).scalar_one()
    found.ref = "x"
    session.add_all([Tag(name=ref), Order(ref=ref)])
    session.commit()
    return {"ok": True}


@router.post("/deep")
def deep(ref: str, session=Depends(get_session)):
    d1(session, ref)
    alert(None, ref)
    return {"ok": True}


@router.post("/pick")
def pick(ref: str, session=Depends(get_session)):
    if ref == "a":
        session.add(Audit(note="a"))
    else:
        session.add(Audit(note="b"))
        return {"picked": "b"}
    session.commit()
    return {"picked": "a"}


@router.post("/retry")
def retry(ref: str, session=Depends(get_session)):
    try:
        write_note(session, ref)
        session.commit()
    except Exception:
        session.rollback()
        write_note(session, ref)
    return {"ok": True}


@router.post("/claim")
def claim(ref: str, session=Depends(get_session)):
    try:
        session.add(Audit(note=ref))
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail="dup")
    return {"ok": True}


@router.post("/quiet")
def quiet(ref: str, session=Depends(get_session)):
    try:
        write_note(session, ref)
    except Exception:
        pass
    session.commit()
    return {"ok": True}


@router.get("/stream")
def stream(ref: str, session=Depends(get_session)):
    return StreamingResponse(feed(session, ref))


@router.get("/stream2")
def stream2(ref: str, session=Depends(get_session)):
    events = feed(session, ref)
    return StreamingResponse(frames(events), media_type="text/event-stream")


@router.delete("/me")
def delete_me(ref: str, session=Depends(get_session)):
    session.add(Audit(note=ref))
    session.commit()
    try:
        alert(None, ref)
    except Exception:
        pass
    return None


@router.post("/stamp")
def stamp_it(ref: str, session=Depends(get_session)):
    from services.orders import stamp
    stamp(session, ref)
    session.commit()
    return {"ok": True}


@router.post("/stamp2")
def stamp_again(ref: str, session=Depends(get_session)):
    stamp(session, ref)
    session.commit()
    return {"ok": True}


@router.post("/guarded")
def guarded_stamp(ref: str, session=Depends(get_session)):
    from services.orders import guard_stamp
    try:
        guard_stamp(session, ref)
    except Refused:
        raise HTTPException(status_code=403, detail="refused")
    session.commit()
    return {"ok": True}


@router.post("/deep2")
def deep_two(ref: str, session=Depends(get_session)):
    try:
        deep_stamp(session, ref)
    except Refused:
        raise HTTPException(status_code=403, detail="refused deep")
    session.commit()
    return {"ok": True}


@router.post("/deepv")
def deep_v(ref: str, session=Depends(get_session)):
    try:
        deep_value(session, ref)
    except ValueError:
        raise HTTPException(status_code=422, detail="bad value")
    session.commit()
    return {"ok": True}


@router.post("/either")
def either(ref: str, session=Depends(get_session)):
    try:
        either_stamp(session, ref)
    except Refused:
        raise HTTPException(status_code=403, detail="refused either")
    session.commit()
    return {"ok": True}


@router.get("/tags")
def list_tags(session=Depends(get_session)):
    from sqlalchemy import select as _sel
    return {"n": len(session.execute(_sel(Tag)).scalars().all())}


@router.get("/tags2")
def list_tags_module(session=Depends(get_session)):
    return {"n": len(session.execute(msel(Tag)).scalars().all())}


@router.post("/relay")
def relay(ref: str, session=Depends(get_session)):
    try:
        relay_stamp(session, ref)
    except Refused:
        raise HTTPException(status_code=403, detail="relayed")
    session.commit()
    return {"ok": True}


@router.post("/relay3")
def relay_three(ref: str, session=Depends(get_session)):
    try:
        relay3(session, ref)
    except Denied3:
        raise HTTPException(status_code=403, detail="denied3")
    return {"ok": True}


@router.post("/rename")
def rename(ref: str, session=Depends(get_session)):
    from sqlalchemy import select as _sel
    found = session.execute(_sel(Tag).where(Tag.name == ref)).scalar_one()
    found.name = "x"
    session.commit()
    return {"ok": True}
PYF

py() {  # py "<name>" <<'PY' … PY  — the prelude gives A · T · GEN · build() · variant() · patch() · at() · paths() · seq()
  local name="$1" src; src=$(cat)
  if (cd "$T" && PYTHONPATH="$GEN" A="$A" T="$T" GEN="$GEN" python3 - >"$T/py.txt" 2>&1 <<PY
import copy, json, os, re, shutil, sys
from pathlib import Path
A, T, GEN = (Path(os.environ[k]) for k in ("A", "T", "GEN"))
import _a3_code as C, _a3_paths as P, _a3_forms as F, _a3_forms_build as B, _a3_forms_effects as E
MODELS = [{"cls": "Order", "table": "orders", "file": "models.py", "uqs": ["UniqueConstraint('ref', name='uq_orders_ref')"]},
          {"cls": "Claim", "table": "claims", "file": "models.py", "uqs": []},
          {"cls": "Tag", "table": "tags", "file": "models.py", "uqs": []},
          {"cls": "Audit", "table": "audits", "file": "models.py", "uqs": []}]
def build(repo, arms="paths,effects", models=True, widen=True):
    files = sorted(str(p.relative_to(repo)) for p in (repo / "api").glob("*.py"))
    amap = {"head": "abc1234", "entities": {"x": {"endpoints": C.parse_endpoints(repo, files), "models": MODELS if models else []}},
            "app_middleware": C.parse_app_middleware(repo, {"x": {"api": ["api/*.py"]}})}
    for ep in amap["entities"]["x"]["endpoints"]:
        ep.pop("refs", None)
    os.environ["GABE_FORMS_ARMS"] = arms
    F.OPTIONS["effects_widenings"] = widen
    before = copy.deepcopy(amap)
    f = B.extend_backend(P.build(amap, repo), amap, repo, {})
    F.OPTIONS["effects_widenings"] = True
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
def paths(f, key):
    return f["endpoints"][key]["paths"]
def seq(f, p):
    return [f["steps"][x["step"]] for x in p["effects"]["steps"]]
def tables(f, ids):
    return sorted({f["steps"][i]["table"] for i in ids})
def by_split(f, key):
    return {(p["status"], p.get("split") or p["phase"]): p for p in paths(f, key)}
def arm_path(f, key, rel, ret, repo=A):
    return next(p for p in paths(f, key) if any(c["kind"] == "branch" and c.get("hit") and c.get("at") == at(rel, ret, repo=repo) for c in p["chain"]))
def ret_path(f, key, rel, text):
    e = f["endpoints"][key]
    rid = next(r["id"] for r in e["returns"] if r["at"] == at(rel, text))
    return next(p for p in e["paths"] if p["exit"]["id"] == rid)
$src
PY
  ); then ok; else bad "$name: $(tail -4 "$T/py.txt")"; fi
}

py "E1 · FIRE: the place path's steps in request order — the dependency, the claim, the order — and every write committed" <<'PY'
f = build(A)
p = arm_path(f, "endpoint:POST /shop/place", "services/orders.py", 'return "placed"')
got = [(r["op"], r["at"]) for r in seq(f, p) if r["op"] != "read"]
want = [("add", at("db.py", "session.add(seen)")), ("commit", at("db.py", "session.commit()")),
        ("savepoint", at("services/orders.py", "begin_nested")), ("add", at("services/orders.py", "session.add(row)")),
        ("flush", at("services/orders.py", "session.flush()")), ("add", at("services/orders.py", "session.add(order)")),
        ("flush", at("services/orders.py", "session.flush()", 2)), ("commit", at("services/orders.py", "session.commit()", 3))]
assert got == want, got
eff = p["effects"]
assert tables(f, eff["committed"]) == ["audits", "claims", "orders"] and not (eff["maybe_committed"] or eff["rolled_back"] or eff["uncommitted"]), eff
assert all(not r["cond"] for r in seq(f, p) if r["op"] in ("add", "commit")), [(r["op"], r["at"], r["cond"]) for r in seq(f, p)]
assert seq(f, p)[3].get("savepoint") == at("services/orders.py", "begin_nested"), seq(f, p)[3]
PY

py "E1b · SILENT: the arm beside the path's, a block that leaves before its point, a set's add — no step; every write in one bucket" <<'PY'
f = build(A)
placed = arm_path(f, "endpoint:POST /shop/place", "services/orders.py", 'return "placed"')
replayed = arm_path(f, "endpoint:POST /shop/place", "services/orders.py", 'return "replayed"')
assert at("services/orders.py", "session.commit()", 2) not in [r["at"] for r in seq(f, placed)], "the replay arm's commit rode the placed path"
assert at("services/orders.py", "session.commit()", 2) in [r["at"] for r in seq(f, replayed)] and \
    at("services/orders.py", "session.add(order)") not in [r["at"] for r in seq(f, replayed)], [r["at"] for r in seq(f, replayed)]
pb = ret_path(f, "endpoint:POST /shop/pick", "api/shop.py", '"picked": "b"')
pa = ret_path(f, "endpoint:POST /shop/pick", "api/shop.py", '"picked": "a"')
assert [(r["op"], r["at"], r["cond"]) for r in seq(f, pb)] == [("add", at("api/shop.py", 'note="b"'), False)], seq(f, pb)
assert [(r["op"], r["at"], r["cond"]) for r in seq(f, pa)] == [("add", at("api/shop.py", 'note="a"'), True), ("commit", at("api/shop.py", "session.commit()", 3), False)], seq(f, pa)
assert tables(f, pa["effects"]["committed"]) == ["audits"] and tables(f, pb["effects"]["uncommitted"]) == ["audits"], (pa["effects"], pb["effects"])
assert not any(r["at"] == at("services/orders.py", "seen.add") for r in f["steps"].values()), "a set's add became a database write"
rt = next(p for p in paths(f, "endpoint:POST /shop/retry") if p["exit"]["kind"] == "success")   # try: write · commit / except: rollback · write again
note = [x["step"] for x in rt["effects"]["steps"] if f["steps"][x["step"]]["at"] == at("services/orders.py", "session.add(Audit(note=ref))")]
assert len(note) == 2 and len(set(note)) == 1, note
assert rt["effects"]["committed"] == [note[0]] and not rt["effects"]["uncommitted"], rt["effects"]   # met twice, its strongest reading
for e in f["endpoints"].values():
    for v in e.get("variants") or [e]:
        for p in v.get("paths") or []:
            b = [set(p["effects"][k]) for k in ("committed", "maybe_committed", "rolled_back", "uncommitted")]
            assert all(not (b[i] & b[j]) for i in range(4) for j in range(i + 1, 4)), (p["id"], p["effects"])
PY

py "E2 · FIRE + SILENT: which dependencies ran before each exit; refusal-writes on place's own writes, never on a dependency's" <<'PY'
f = build(A)
k = by_split(f, "endpoint:POST /shop/place")
dp = k[(422, "dependency-params")]["effects"]
assert dp["dependency"] == "not-run" and not dp["steps"], dp
for key in ((422, "own-params"), (400, "handler"), (409, "handler")):
    eff = k[key]["effects"]
    assert eff["dependency"] == "ran" and "audits" in tables(f, eff["committed"]), (key, eff)
banned = k[(403, "dependency")]["effects"]
assert banned["dependency"] == "ran" and [(r["op"], r["at"]) for r in seq(f, k[(403, "dependency")])] == [("add", at("db.py", 'note="banned"'))] \
    and tables(f, banned["uncommitted"]) == ["audits"] and not banned["committed"], (banned, seq(f, k[(403, "dependency")]))
unc = next(p for p in paths(f, "endpoint:POST /shop/place") if p["exit"]["kind"] == "uncaught")["effects"]
assert unc["dependency"] == "ran" and {f["steps"][s]["at"] for s in unc["may_follow_commits"]} >= {at("db.py", "session.commit()"), at("services/orders.py", "session.commit()", 3)}, unc
found = {(key, x["id"]) for key, e in f["endpoints"].items() for x in (e.get("arm_findings") or {}).get("effects") or []}
assert found == {("endpoint:POST /shop/place", "refusal-writes"), ("endpoint:GET /shop/touch", "safe-method-commits")}, found
rw = next(x for x in f["endpoints"]["endpoint:POST /shop/place"]["arm_findings"]["effects"] if x["id"] == "refusal-writes")
assert rw["paths"] == [k[(409, "handler")]["id"]], rw
st = f["arms"]["effects"]["stats"]
assert st["refusal_writes_inherited"] == 1 and st["safe_method_commits_inherited"] == 1 and st["findings"] == {"refusal-writes": 1, "safe-method-commits": 1}, st
old = variant("oldfw", lambda d: patch(d, "uv.lock", 'version = "0.136.3"', 'version = "0.100.0"'))
g = build(old)
states = {p["effects"]["dependency"] for e in g["endpoints"].values() for v in (e.get("variants") or [e]) for p in v.get("paths") or []}
assert states == {"unknown"}, states
gs = g["arms"]["effects"]["stats"]                                                  # V21: a closed gate SAYS so, and the
assert gs["dependency_gate"].startswith("closed: fastapi 0.100.0 < ") and gs["refusal_writes_inherited"] == "unknown" and gs["safe_method_commits_inherited"] == "unknown", gs   # inherited counters are unknown, not 0
assert st["dependency_gate"] == "open", st
floor = build(variant("floorfw", lambda d: patch(d, "uv.lock", 'version = "0.136.3"', 'version = "0.136.1"')))
assert floor["arms"]["effects"]["stats"]["dependency_gate"] == "open" and floor["arms"]["effects"]["stats"]["refusal_writes_inherited"] == 1, floor["arms"]["effects"]["stats"]   # gastify's pin is inside the gate
PY

py "E3 · FIRE: a consent-shape refusal — the rollback undoes the claim and the order, the suppressed discard may commit its delete" <<'PY'
f = build(A)
p = by_split(f, "endpoint:POST /shop/place")[(409, "handler")]
eff = p["effects"]
assert tables(f, eff["rolled_back"]) == ["claims", "orders"] and tables(f, eff["committed"]) == ["audits"], eff
md = [f["steps"][i] for i in eff["maybe_committed"]]
assert [(r["op"], r["table"], r["cond"], r.get("suppressed")) for r in md] == [("delete", "claims", True, True)], md
rb = [r for r in seq(f, p) if r["op"] == "rollback"]
assert len(rb) == 1 and not rb[0]["cond"], rb
dc = [r for r in seq(f, p) if r["at"] == at("services/orders.py", "session.commit()")]
assert len(dc) == 1 and dc[0]["cond"] and dc[0]["suppressed"], dc
assert at("services/orders.py", "session.commit()", 3) not in [r["at"] for r in seq(f, p)], "the commit after the raise ran on the refusal"
cat = f["endpoints"]["endpoint:POST /shop/place"]["failure"]["catches"]
pt = next(c for c in cat if c["outcome"] == "pass-through")
assert [a["op"] for a in pt["actions"]] == ["rollback", "call", "pass-through"] and pt["actions"][1].get("suppressed"), pt["actions"]
assert p["id"] in pt["paths"] and pt["types"] == ["Exception"] and tables(f, pt["writes"]) == ["orders"] and pt["answers"] == [], pt
tr = next(c for c in cat if c["outcome"] == "translate")
assert tr["answers"] == [409] and tr["types"] == ["Refused"], tr
races = {(r["table"], r["race"]["state"], json.dumps(r["race"]["keys"])) for r in f["steps"].values() if "race" in r}
assert races == {("claims", "handled", '[["key"]]'), ("orders", "uncaught", '[["ref"]]')}, races
PY

py "E14 · FIRE+SILENT: the commit that raised into the except this path leaves through committed nothing — the rollback rolls the write back" <<'PY'
f = build(A)
r409 = by_split(f, "endpoint:POST /shop/claim")[(409, "handler")]
eff = r409["effects"]
assert tables(f, eff["rolled_back"]) == ["audits"] and not eff["committed"] and not eff["maybe_committed"], eff
failed = [x for x in eff["steps"] if x.get("failed")]
assert len(failed) == 1 and f["steps"][failed[0]["step"]]["op"] == "commit", eff["steps"]   # and the feed SAYS which
ok = next(p for p in paths(f, "endpoint:POST /shop/claim") if p["exit"]["kind"] == "success")
assert tables(f, ok["effects"]["committed"]) == ["audits"] and not any(x.get("failed") for x in ok["effects"]["steps"]), ok["effects"]
PY

py "E15 · FIRE: a try whose handler swallows is on the path and says so — no exit ever minted it" <<'PY'
f = build(A)
cat = f["endpoints"]["endpoint:POST /shop/quiet"]["failure"]["catches"]
sw = [c for c in cat if c["outcome"] == "swallow"]
assert len(sw) == 1 and sw[0]["types"] == ["Exception"] and sw[0]["answers"] == [], cat
ok = next(p for p in paths(f, "endpoint:POST /shop/quiet") if p["exit"]["kind"] == "success")
assert ok["id"] in sw[0]["paths"] and tables(f, sw[0]["writes"]) == ["audits"], sw[0]
me = [c for c in f["endpoints"]["endpoint:DELETE /shop/me"]["failure"]["catches"] if c["outcome"] == "swallow"]
assert len(me) == 1 and me[0]["writes"] == [] and me[0]["types"] == ["Exception"], f["endpoints"]["endpoint:DELETE /shop/me"].get("failure")   # no step inside — still on the path
PY

py "E16 · FIRE+SILENT: a generator the response streams runs after the exit — its steps are listed apart, never rolled up, never a finding" <<'PY'
f = build(A, arms="paths,effects,kinds")
ok = next(p for p in paths(f, "endpoint:GET /shop/stream") if p["exit"]["kind"] == "success")
eff = ok["effects"]
late = [f["steps"][x["step"]]["op"] for x in eff.get("after_response") or []]
assert late == [E.EF["write_m"]["add"], "commit"], eff                      # V17: the walk is kept, apart
assert not eff["committed"] and not eff["maybe_committed"] and not eff["uncommitted"], eff
assert "safe-method-commits" not in {x["id"] for x in f["endpoints"]["endpoint:GET /shop/stream"].get("arm_findings", {}).get("effects", [])}
unc = next(r for r in f["endpoints"]["endpoint:GET /shop/stream"]["produced"] if r["phase"] == "uncaught")
assert [x["cls"] for x in unc.get("after_response") or []] == ["Refused"] and not unc.get("causes"), unc   # V18: not the 500
assert "escape-500" not in {x["id"] for x in f["endpoints"]["endpoint:GET /shop/stream"]["findings"]}
fn = f["functions"]["services/orders.py::feed"]
raise_ = next(x for x in fn["raises"] if x["cls"] == "Refused")
assert raise_["translation"] == "after the response line" and raise_["after_response"], raise_
assert "untranslated-raise" not in {x["id"] for x in f["arm_findings"].get("kinds", []) if x.get("fn") == "services/orders.py::feed"}
ok2 = next(p for p in paths(f, "endpoint:GET /shop/stream2") if p["exit"]["kind"] == "success")   # the generator bound to a
late2 = [f["steps"][x["step"]]["op"] for x in ok2["effects"].get("after_response") or []]         # NAME the return hands on
assert late2 == [E.EF["write_m"]["add"], "commit"] and not ok2["effects"]["committed"], ok2["effects"]
place = by_split(f, "endpoint:POST /shop/place")[(409, "handler")]                  # SILENT: a plain callee's steps
assert "after_response" not in place["effects"] and place["effects"]["rolled_back"], place["effects"]   # stay in the rollup
PY

py "E17 · FIRE+SILENT: a service the handler imports in its OWN body is walked — its write is a step on the path, committed by the handler; a handler that calls the same name without importing it books nothing from it" <<'PY'
f = build(A)
ok = next(p for p in paths(f, "endpoint:POST /shop/stamp") if p["exit"]["kind"] == "success")
got = [(r["op"], r["table"], r["at"], r["fn"]) for r in seq(f, ok)]
lines = (A / "api/shop.py").read_text().splitlines()
commit = next(i + 1 for i in range(lines.index("def stamp_it(ref: str, session=Depends(get_session)):"), len(lines)) if "session.commit()" in lines[i])
assert got == [("add", "tags", at("services/orders.py", "session.add(Tag(name=ref))"), "services/orders.py::stamp"),
               ("commit", None, f"api/shop.py:{commit}", "api/shop.py::stamp_it")], got
assert tables(f, ok["effects"]["committed"]) == ["tags"] and not ok["effects"]["uncommitted"], ok["effects"]
two = next(p for p in paths(f, "endpoint:POST /shop/stamp2") if p["exit"]["kind"] == "success")
assert [r["op"] for r in seq(f, two)] == ["commit"] and not two["effects"]["committed"], "a local import leaked into another handler: " + str(seq(f, two))
PY

py "E19 · FIRE: a refusal the handler translates from a service it imports in its own body is verified at the service's raise, and its path reads that service TO the raise — the write before it is a step, the write after it never ran" <<'PY'
f = build(A)
r = next(x for x in f["endpoints"]["endpoint:POST /shop/guarded"]["produced"] if x["status"] == 403)
assert r["source"] == "verified" and r["raised_at"] == at("services/orders.py", "        raise Refused()"), r
p = next(p for p in paths(f, "endpoint:POST /shop/guarded") if p["status"] == 403)
got = [(s["op"], s["table"], s["at"]) for s in seq(f, p) if s["fn"] == "services/orders.py::guard_stamp"]
lines = (A / "services/orders.py").read_text().splitlines()
first = next(i + 1 for i in range(lines.index("def guard_stamp(session, ref):"), len(lines)) if "session.add(" in lines[i])
assert got == [("add", "audits", f"services/orders.py:{first}")], got
assert tables(f, p["effects"]["uncommitted"]) == ["audits"] and not p["effects"]["committed"], p["effects"]
ok = next(p for p in paths(f, "endpoint:POST /shop/guarded") if p["exit"]["kind"] == "success")
assert tables(f, ok["effects"]["committed"]) == ["audits", "tags"], ok["effects"]                 # SILENT: the success path runs it all
PY

py "E18 · SILENT: the local scan only ADDS — with it off, every endpoint but the two whose handler imports in its own body is byte-identical and every step id the same; the one row it CHANGES is the refusal whose raise site became known" <<'PY'
import _a3_paths_read as PR, _a3_forms_reach as R
on = build(A)
keep = PR._fn_scopes
PR._fn_scopes = lambda mm: []
P.reset_caches(); R.reset_caches()
try:
    off = build(A)
finally:
    PR._fn_scopes = keep
    P.reset_caches(); R.reset_caches()
diff = sorted(k for k in set(on["endpoints"]) | set(off["endpoints"]) if json.dumps(on["endpoints"].get(k), sort_keys=True) != json.dumps(off["endpoints"].get(k), sort_keys=True))
assert diff == ["endpoint:GET /shop/tags", "endpoint:POST /shop/guarded", "endpoint:POST /shop/relay", "endpoint:POST /shop/relay3", "endpoint:POST /shop/rename", "endpoint:POST /shop/stamp"], diff
assert all(on["steps"][k] == off["steps"][k] for k in set(off["steps"]) & set(on["steps"])), "a step id changed its row"
gone = {k: off["steps"][k] for k in set(off["steps"]) - set(on["steps"])}      # only a step the whole-call read of an UNVERIFIED 403 minted:
assert [(r["fn"], r["op"], r["table"], r["cond"]) for r in gone.values()] == [("services/orders.py::relay_stamp", "add", "tags", True)], gone   # verified now, the path stops at the raise
assert {on["steps"][k]["fn"] for k in set(on["steps"]) - set(off["steps"])} == {"services/orders.py::stamp", "services/orders.py::guard_stamp",
                                                                                "api/shop.py::list_tags", "api/shop.py::rename", "services/orders.py::relay_stamp",
                                                                                "services/relay.py::relay3"}, \
    sorted((on["steps"][k]["fn"], on["steps"][k]["op"], on["steps"][k]["cond"]) for k in set(on["steps"]) - set(off["steps"]))
rows = {n: {(r["phase"], r["status"]): r for r in x["endpoints"]["endpoint:POST /shop/guarded"]["produced"]} for n, x in (("on", on), ("off", off))}
assert rows["off"][("handler", 403)]["source"] == "unverified" and "raised_at" not in rows["off"][("handler", 403)], rows["off"]
changed = sorted(k for k in rows["on"] if rows["on"][k]["id"] != rows["off"].get(k, {}).get("id"))
assert changed == [("handler", 403)], changed        # the ONE changed row: its raise site is known now, and the site joins its x: id
PY

py "E20 · FIRE+SILENT: an UNVERIFIED translation whose one possible raise is two calls down reads the call to THAT raise — the writes before it are on the path, the write after it never ran; two possible raises read the call whole" <<'PY'
import _a3_forms_catch as CA
f = build(A)
row = next(r for r in f["endpoints"]["endpoint:POST /shop/deep2"]["produced"] if r.get("status") == 403)
assert row["source"] == "unverified" and "raised_at" not in row, row                 # the endpoint pass still reads one level
p = next(p for p in paths(f, "endpoint:POST /shop/deep2") if p["status"] == 403)
deep = at("services/orders.py", 'raise Refused("deep")')
assert p["effects"]["read_to"] == deep and p["state"] == "partial", (p["effects"], p["state"])
got = [(s["op"], s["table"], s["fn"]) for s in seq(f, p)]
assert got == [("add", "audits", "services/orders.py::deep_stamp"), ("add", "claims", "services/orders.py::check_ref")], got
assert tables(f, p["effects"]["uncommitted"]) == ["audits", "claims"] and all(f["steps"][x]["cond"] for x in p["effects"]["uncommitted"]), p["effects"]
ok = next(p for p in paths(f, "endpoint:POST /shop/deep2") if p["exit"]["kind"] == "success")
assert tables(f, ok["effects"]["committed"]) == ["audits", "claims", "tags"] and "read_to" not in ok["effects"], ok["effects"]      # SILENT: success runs it all
two = next(p for p in paths(f, "endpoint:POST /shop/either") if p["status"] == 403)
assert "read_to" not in two["effects"] and tables(f, two["effects"]["uncommitted"]) == ["claims", "tags"], two["effects"]         # SILENT: two raises, no bound
g = next(p for p in paths(f, "endpoint:POST /shop/guarded") if p["status"] == 403)
assert "read_to" not in g["effects"], g["effects"]                                    # SILENT: a verified translation reads its own raise
v = next(p for p in paths(f, "endpoint:POST /shop/deepv") if p["status"] == 422 and p["phase"] == "handler")
assert "read_to" not in v["effects"] and tables(f, v["effects"]["uncommitted"]) == ["audits", "tags"], v["effects"]   # SILENT: `except ValueError` also catches what a library raises
keep = CA.deep_raise
CA.deep_raise = lambda *a, **k: None
try:
    g2 = build(A)
    q = next(p for p in paths(g2, "endpoint:POST /shop/deep2") if p["status"] == 403)
    assert "tags" in tables(g2, [x["step"] for x in q["effects"]["steps"]]), "E20 cannot fail: the deep raise is not what bounded the read"
finally:
    CA.deep_raise = keep
PY

py "E21 · FIRE+SILENT: an ORM verb a function imports under an alias is that verb — its read is a step, in the effects arm and in the code map; a MODULE-level alias stays the written name" <<'PY'
f = build(A)
ok = next(p for p in paths(f, "endpoint:GET /shop/tags") if p["exit"]["kind"] == "success")
assert [(s["op"], s["table"], s["at"]) for s in seq(f, ok)] == [("read", "tags", at("api/shop.py", "_sel(Tag)"))], seq(f, ok)
two = next(p for p in paths(f, "endpoint:GET /shop/tags2") if p["exit"]["kind"] == "success")
assert seq(f, two) == [], seq(f, two)
m = P._mod(A, "api/shop.py")
m2t = {r["cls"]: r["table"] for r in MODELS}
sc = C._S.fn_scopes(m.tree)
assert C._orm_access(m.defs["list_tags"], m2t, sc).get("ops") == [{"model": "Tag", "table": "tags", "rw": "r"}], C._orm_access(m.defs["list_tags"], m2t, sc)
assert not C._orm_access(m.defs["list_tags"], m2t).get("ops") and not C._orm_access(m.defs["list_tags_module"], m2t, sc).get("ops")
PY

py "E22 · FIRE: a class the callee imports in its own body is read with its bases on the path — the except of its base it passes through is a catch on the chain, its rollback a step" <<'PY'
f = build(A)
p = next(p for p in paths(f, "endpoint:POST /shop/relay") if p["status"] == 403)
row = next(r for r in f["endpoints"]["endpoint:POST /shop/relay"]["produced"] if r.get("status") == 403)
assert row["source"] == "verified" and row["raised_at"] == at("services/orders.py", "            raise Soft()"), row
src = (A / "services/orders.py").read_text().splitlines()
start = src.index("def relay_stamp(session, ref):")
relay_except = f"services/orders.py:{next(i + 1 for i in range(start, len(src)) if src[i] == '    except Refused:')}"
cat = [c for c in p["chain"] if c["kind"] == "catch"]
assert [(c["op"], c["at"], c["cls"]) for c in cat][:1] == [("pass-through", relay_except, "Refused")], cat
assert "rollback" in [s["op"] for s in seq(f, p)], seq(f, p)
q = next(p for p in paths(f, "endpoint:POST /shop/relay3") if p["status"] == 403)      # the chain names the callee's except of a BASE of the class the handler catches
src3 = (A / "services/relay.py").read_text().splitlines()
assert [(c["op"], c["at"], c["cls"]) for c in q["chain"] if c["kind"] == "catch"][:1] == [("pass-through", f"services/relay.py:{src3.index('    except AppError:') + 1}", "AppError")], q["chain"]
assert [s["op"] for s in seq(f, q)] == ["rollback"], seq(f, q)
PY

py "E4 · FIRE + SILENT: each widening tagged where it binds; with widenings off no step carries one" <<'PY'
f = build(A)
wid = {(r["op"], r["table"], r.get("widening"), r["at"]) for r in f["steps"].values() if r.get("widening")}
want = {("update", "orders", "W1", at("api/shop.py", "order.ref = ref")), ("update", "orders", "W2", at("api/shop.py", 'found.ref = "x"')),
        ("delete", "claims", "W2", at("services/orders.py", "session.delete(row)")), ("read", "audits", "W3", at("services/orders.py", "func.count")),
        ("add", "tags", "W4", at("api/shop.py", "add_all")), ("add", "orders", "W4", at("api/shop.py", "add_all")),
        ("update", "tags", "W2", at("api/shop.py", 'found.name = "x"'))}                 # bound from `_sel(Tag)`, a select the handler imports under an alias
assert want <= wid, sorted(want - wid)
assert f["arms"]["effects"]["stats"]["widenings"] == {"W1": 1, "W2": 3, "W3": 1, "W4": 2}, f["arms"]["effects"]["stats"]["widenings"]
g = build(A, widen=False)
assert not any(r.get("widening") for r in g["steps"].values()) and g["arms"]["effects"]["options"]["widenings"] is False
assert not any(r["op"] == "update" for r in g["steps"].values()), "an update bound through a widening with widenings off"
PY

py "E5 · parity: with widenings off every function's (model, rw) pairs and commit flag are _a3_code._orm_access's" <<'PY'
m2t = {r["cls"]: r["table"] for r in MODELS}
checked = 0
for rel in ("db.py", "services/orders.py", "services/deep.py", "api/shop.py"):
    m = P._mod(A, rel)
    for qual, node in m.defs.items():
        evs = E.effect_events(A, m, qual, node, m2t, widen=False)
        mine = {(e["model"], "r" if e["op"] == "read" else "w") for e in evs
                if e["kind"] == "fx" and e.get("model") and e["op"] not in ("flush", "commit", "rollback", "savepoint")}
        acc = C._orm_access(node, m2t, C._S.fn_scopes(m.tree))
        assert mine == {(o["model"], o["rw"]) for o in acc.get("ops") or []}, (rel, qual, mine, acc)
        assert any(e["kind"] == "fx" and e["op"] in ("flush", "commit") for e in evs) == bool(acc.get("commits")), (rel, qual)
        checked += 1
assert checked >= 17, checked
PY

py "E11 · floors: a write five calls down counts into floor; a Protocol port call is unresolved, a library Session's is not" <<'PY'
f = build(A)
st, opts = f["arms"]["effects"]["stats"], f["arms"]["effects"]["options"]
deep = next(p for p in paths(f, "endpoint:POST /shop/deep") if p["exit"]["kind"] == "success")
assert opts["depth"] == 4 and st["floor"] >= 1 and at("services/deep.py", "session.add") not in [r["at"] for r in seq(f, deep)], (st, seq(f, deep))
assert st["unresolved"] == 1, st
near = variant("near", lambda d: patch(d, "services/deep.py", "def d4(session, ref):\n    d5(session, ref)", "def d4(session, ref):\n    session.add(Audit(note=ref))"))
g = build(near)
gd = next(p for p in paths(g, "endpoint:POST /shop/deep") if p["exit"]["kind"] == "success")
assert at("services/deep.py", "session.add", repo=near) in [r["at"] for r in seq(g, gd)], seq(g, gd)
PY

py "E12 · honest-empty + determinism: effects off writes nothing; two builds agree; step ids survive a line move" <<'PY'
off = build(A, arms="paths")
assert "steps" not in off and not any("effects" in p or "failure" in v for e in off["endpoints"].values() for v in (e.get("variants") or [e]) for p in v.get("paths") or []), "effects rode an effects-off build"
solo = build(A, arms="effects")
sp = [p for e in solo["endpoints"].values() for v in (e.get("variants") or [e]) for p in v.get("paths") or []]
assert sp and all("effects" in p for p in sp) and not any("returns" in v for e in solo["endpoints"].values() for v in (e.get("variants") or [e])), \
    "effects alone: its paths carry effects, and the paths arm's own keys stay unwritten"
a1, a2 = build(A), build(A)
assert json.dumps(a1, sort_keys=True) == json.dumps(a2, sort_keys=True), "two builds differ"
def drift(d):
    for rel in ("db.py", "services/orders.py", "services/deep.py", "api/shop.py"):
        (d / rel).write_text("\n\n\n" + (d / rel).read_text())
dd = variant("drift", drift)
b = build(dd)
assert sorted(a1["steps"]) == sorted(b["steps"]), sorted(set(a1["steps"]) ^ set(b["steps"]))
pa = arm_path(a1, "endpoint:POST /shop/place", "services/orders.py", 'return "placed"')
pb = arm_path(b, "endpoint:POST /shop/place", "services/orders.py", 'return "placed"', repo=dd)
assert [x["step"] for x in pa["effects"]["steps"]] == [x["step"] for x in pb["effects"]["steps"]], "a line move changed the placed path's steps"
bare = build(A, models=False)
assert not any(r.get("table") for r in bare["steps"].values()) and not bare["arms"]["effects"]["stats"]["races"], bare["arms"]["effects"]["stats"]
PY

py "E13 · mutation: no handler commit empties committed; an IntegrityError catch handles the race; no rollback empties rolled_back" <<'PY'
f = build(A)
w = next(p for p in paths(f, "endpoint:POST /shop/widen") if p["exit"]["kind"] == "success")["effects"]
assert w["committed"] and not w["uncommitted"], w
nc = build(variant("nocommit", lambda d: patch(d, "api/shop.py", "    session.add_all([Tag(name=ref), Order(ref=ref)])\n    session.commit()\n", "    session.add_all([Tag(name=ref), Order(ref=ref)])\n")))
w2 = next(p for p in paths(nc, "endpoint:POST /shop/widen") if p["exit"]["kind"] == "success")["effects"]
assert not w2["committed"] and w2["uncommitted"], w2
ie = build(variant("integrity", lambda d: patch(d, "services/orders.py", "    except Exception:\n        session.rollback()", "    except IntegrityError:\n        return \"dup\"\n    except Exception:\n        session.rollback()")))
assert {r["race"]["state"] for r in ie["steps"].values() if "race" in r and r["table"] == "orders"} == {"handled"}, [r for r in ie["steps"].values() if "race" in r]
nr = build(variant("norollback", lambda d: patch(d, "services/orders.py", "        session.rollback()\n", "")))
p = by_split(nr, "endpoint:POST /shop/place")[(409, "handler")]["effects"]
assert not p["rolled_back"] and tables(nr, p["maybe_committed"]) == ["claims", "orders"], p
PY

echo "forms-effects: $pass passed, $fail failed"
[ "$fail" -eq 0 ] || exit 1
