"""Three readings corrected before anything is drawn (round-1 review, lane F1a — the page said things the code does not do).

Each is a fact the feeds hold, read the way the code runs, applied ONCE to the facts every block reads (the lab's facts per
endpoint and the forms feed in memory — never a file), so the Proof row, the Data effects row, the pinned row's columns, the
endpoint metadata and the examples bench all say the same thing:

  own_raise_tests  a test that raises an error from the service side proves an ending HERE only when the function it calls runs
                   on this endpoint's way (the handler, a function the feed reaches from it, one the station's call edges reach) —
                   not because another function raises the same class (N3-01 · F01 · CR-01)
  drop_tableless   a step with no table that is not a save (commit · flush · rollback · savepoint) is not drawn as a database
                   write: out of the chips, the data functions and the fates (N3-06 · CR-04) — the map's own `writes` already
                   require a table
  class_joins      a raise the feed joins to no ending here, whose class an `except` of a caller on this endpoint's way names,
                   below the call that reaches it, becomes that except's ending — "by class" (F04 · CR-09 · N3-26)

catch_up(fid, cls, parent, cats) is the walk the third one makes, shared with the hover builder (_ae_io), which walks the
dependency's functions too."""
from __future__ import annotations

SAVE_OPS = {"commit", "flush", "rollback", "savepoint", "begin_nested"}


def _nm(q) -> str:
    return str(q or "").split("::")[-1]


def _file(at) -> str:
    return str(at or "").rsplit(":", 1)[0]


def _line(at):
    t = str(at or "").rsplit(":", 1)
    return int(t[1]) if len(t) == 2 and t[1].isdigit() else None


def on_way(E: str, fep: dict, fj: dict, walk: list, reach: set) -> set:
    """the names of the functions that run on this endpoint's way: its handler, every function the forms feed reaches from it,
    the lab's walk (its dependencies' too), and the station's call edges from the handler"""
    out = {_nm(fep.get("handler"))}
    out |= {_nm(f) for f, rec in (fj.get("functions") or {}).items() if any(rb.get("root") == E for rb in rec.get("reached_by") or [])}
    out |= {q.get("name") for lv in walk or [] for q in lv if q.get("name")}
    out |= {_nm(f.replace("#", "::")) for f in reach}
    return out - {"", None}


def _calls_one(z: dict, names: set) -> bool:
    """a test's raise names the function it calls (`start_session`, `ctx.require_household`, `Model.model_validate`): on the way
    when that name is one of them — a method by its own name, since the receiver is the test's variable"""
    tails = {n.split(".")[-1] for n in names if "." in n}
    for q in (z.get("call"), z.get("root")):
        q = str(q or "")
        if q in names or ("." in q and q.split(".")[-1] in tails):
            return True
    return False


def own_raise_tests(L: dict, fj: dict, reach: set, tally) -> None:
    """N3-01: drop, from this endpoint's endings and its test roster, every service-side test whose raise calls a function that
    does not run here"""
    E = "endpoint:" + L["identity"]["label"]
    fep = (fj.get("endpoints") or {}).get(E) or {}
    names = on_way(E, fep, fj, L["functions"].get("walk") or [], reach)
    TC = fj.get("test_cases") or {}
    gone = set()
    for x in L["forms"].get("exits") or []:
        keep = []
        for t in x.get("tests") or []:
            if t.get("role") == "service-raises":
                rz = [z for z in (TC.get(t.get("case")) or {}).get("raises") or [] if z.get("line") == t.get("line")]
                if not any(_calls_one(z, names) for z in rz):
                    gone.add((t.get("case"), x["id"])); tally["own:svcDrop"] += 1
                    continue
                tally["own:svcKeep"] += 1
            keep.append(t)
        x["tests"] = keep
    T = L.get("tests") or {}
    ro = []
    for t in T.get("roster") or []:
        if t.get("role") == "service-raises":
            t = dict(t, proves=[z for z in t.get("proves") or [] if (t["cid"], z.get("exit")) not in gone])
            if not t["proves"]:
                continue
        ro.append(t)
    if T.get("roster") is not None:
        T["roster"] = ro
        if isinstance(T.get("roles"), dict) and "service-raises" in T["roles"]:
            T["roles"]["service-raises"] = sum(1 for t in ro if t.get("role") == "service-raises")


def drop_tableless(fj: dict, facts: list, tally) -> set:
    """N3-06: the steps that are not database writes (no table, not a save) — out of every path's effects, in the feed and in each
    endpoint's facts. Returns their ids"""
    bad = {s for s, rec in (fj.get("steps") or {}).items() if not rec.get("table") and rec.get("op") not in SAVE_OPS}
    lists = ("steps", "after_response", "committed", "maybe_committed", "rolled_back", "uncommitted")

    def clean(ef: dict) -> None:
        for k in lists:
            if isinstance(ef.get(k), list):
                ef[k] = [q for q in ef[k] if (q.get("step") if isinstance(q, dict) else q) not in bad]
    for ep in (fj.get("endpoints") or {}).values():
        for p in ep.get("paths") or []:
            clean(p.get("effects") or {})
        for c in (ep.get("failure") or {}).get("catches") or []:
            if isinstance(c.get("writes"), list):
                c["writes"] = [q for q in c["writes"] if q not in bad]
    for L in facts:
        for p in L["forms"].get("paths") or []:
            ef = p.get("effects") or {}
            n0 = len(ef.get("steps") or [])
            clean(ef)
            tally["own:tablelessOcc"] += n0 - len(ef.get("steps") or [])
    tally["own:tableless"] = len(bad)
    return bad


def catch_up(fid: str, cls: str, parent, cats: list):
    """the first `except` naming `cls` in a caller of `fid` on this endpoint's way, below the call that reaches it: parent(f) →
    (the function calling f, the line f is called at there, or None when the feeds hold no line); None when no caller has one"""
    cur, seen = fid, set()
    while cur and cur not in seen:
        seen.add(cur)
        par, site = parent(cur)
        if not par:
            return None
        for c in cats:
            if c.get("fn") == par and cls in (c.get("types") or []):
                if site is None or (_file(site) == _file(c.get("at")) and (_line(site) or 0) < (_line(c.get("at")) or 0)):
                    return c
        cur = par
    return None


def exit_of_catch(c: dict, XS: dict):
    """the ending a translating except makes: the one ending of its status that the endpoint says comes `except <its class>`"""
    ty = ["except " + t for t in c.get("types") or []]
    xs = [x for x in XS.values() if x.get("status") in (c.get("answers") or []) and str(x.get("via") or "") in ty]
    return xs[0] if len(xs) == 1 else None


def class_joins(L: dict, fj: dict, tally) -> None:
    """F04 · N3-26: each raise of a function the handler reaches that the feed joins to no ending here gets the ending of the first
    except of its class up its callers — written into the lab's `here` (with `by: class`), so the deciders, the functions' marks and
    the hovers all read it"""
    E = "endpoint:" + L["identity"]["label"]
    fep = (fj.get("endpoints") or {}).get(E) or {}
    cats = [c for c in (fep.get("failure") or {}).get("catches") or [] if c.get("outcome") == "translate"]
    XS = {x["id"]: x for x in L["forms"].get("exits") or []}
    ins = {f.get("fn"): f for f in ((L["forms"].get("inside") or {}).get("functions") or []) if f.get("fn")}
    parent = lambda f: ((ins.get(f) or {}).get("via"), (ins.get(f) or {}).get("site"))
    for f in ins.values():
        for z in f.get("raises") or []:
            if z.get("here") or not z.get("cls"):
                continue
            c = catch_up(f["fn"], z["cls"], parent, cats)
            x = exit_of_catch(c, XS) if c else None
            if x:
                z["here"] = [{"exit": x["id"], "status": x.get("status"), "at": (c.get("actions") or [{}])[0].get("at") and _file(c["at"]) + ":" + str(c["actions"][0]["at"]),
                              "by": "class", "catch": c.get("id"), "catch_at": c.get("at")}]
                tally["own:classJoin"] += 1


def parent_of(ins: dict, par: dict, fns: dict):
    """the caller of a function on this endpoint's way, and the line it calls it at: the lab's inside record (a function the handler
    reaches: `via`, `site`), else the lab's walk (its dependencies' too) with the site a forms-feed route of the function names"""
    def parent(f):
        i = ins.get(f) or {}
        if i.get("via"):
            return i["via"], i.get("site")
        p = par.get(f)
        if not p:
            return None, None
        site = next((b.get("site") for rb in (fns.get(f) or {}).get("reached_by") or [] for b in [rb] + list(rb.get("routes") or [])
                     if b.get("via") == p and b.get("site")), None)
        return p, site
    return parent


def causes(xid: str, ins: dict, par: dict, fns: dict, cats: list, XS: dict) -> list:
    """F05 · F06: the raises that become ending `xid` on this endpoint — every raise of a function the handler reaches joined to it
    (by the feed, or by class), and every raise of a function its dependencies run whose class the first except up its callers
    turns into it: [(function, the if it sits in | None, where, how: "" | "class", its message | None)] in the order the functions are read"""
    out, seen = [], set()
    for f in ins.values():
        for z in f.get("raises") or []:
            for h in z.get("here") or []:
                if h.get("exit") == xid and (f.get("fn"), z.get("at")) not in seen:
                    seen.add((f.get("fn"), z.get("at"))); out.append((f.get("fn"), z.get("pred"), z.get("at"), h.get("by") or "", z.get("msg")))
    parent = parent_of(ins, par, fns)
    for f in par:
        if f in ins:
            continue
        for z in (fns.get(f) or {}).get("raises") or []:
            if (f, z.get("at")) in seen or not z.get("cls"):
                continue
            c = catch_up(f, z["cls"], parent, cats)
            x = exit_of_catch(c, XS) if c else None
            if x and x.get("id") == xid:
                seen.add((f, z.get("at"))); out.append((f, z.get("pred"), z.get("at"), "class", z.get("msg")))
    return out
