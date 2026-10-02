"""D-084 · THE SECURITY ROW (his L-19, ruled G2: "9th row because security might grow in the future").

BY MOMENT gains a row after Gates and decisions. Everything it says is read from the forms feed the page already reads, per endpoint,
by the feed's own blocks — never typed for one endpoint:

  HOME FACTS — shown in full in the row, whatever the look of the row:
    · the app-wide middleware in run order          fj.middleware{} (order.runs), each at "at the edge"
    · the switches that turn a check on             the endpoint's switches[] whose refs/proves are a security ending
    · the CORS allowed origins                      fj.settings{}, the setting whose name says cors + origin (the CORS middleware's)
    · the secrets read on this path                 fj.settings{}, a setting with a secret type or an env value the feed redacted,
                                                    read by a function on this endpoint's way
  FACTS THAT LIVE IN OTHER ROWS — his choice made alone, so an option (D-025.2, mo.opt.secmv): a short mark in this row that names the
  item and points to its home row (my pick), or the item moved into this row. Each is an item the feed itself records:
    login        auth.schemes[].exit · a 401 refusal before the handler · the login check (auth.gates[]) · its translating except
    household    auth.requires[] — the refusal and the check
    rate         rate.limits[] — the 429, the limiter, and the values the limiting middleware keeps (in-flight rows read inside it)
    provision    auth.provisions[] — the row the login adds, as the write step the feed names
    repeat       repeat.required · repeat.key · repeat.claims[] — the check, the value it keeps, the write that claims it

flag() runs once per placed element inside by_moment, before its hover is built: it stamps the element's extras (sh: a home fact that
used to stand in another row · sx: a fact whose home is another row · so: its order in the cell). build() runs once at the end of
by_moment: it adds the elements that are new (a middleware no chain passes, the CORS origins, each secret, one mark per item per home
row per moment) and the row's head states. "none on this endpoint" is said only when the arm that would record it ran; otherwise
the head says "not recorded" (D-017: never a bare 0)."""
from __future__ import annotations

import collections
import re

import _ae_io as IO
import _ae_truth as TRUTH

ITEMS = ("login", "household", "rate", "provision", "repeat")
HOME_ROWS = ("end", "proof", "gate", "data", "fn", "shape", "client", "inf", "stage", "std")      # the rows a mark can point to, in the order the table draws them
O_MW, O_SW, O_CORS, O_SECRET, O_MARK, O_MOVED = 0, 100, 200, 300, 400, 500        # the order inside a cell: home facts first, marks, then what moved in
CORS_RX = re.compile(r"cors", re.I)
ORIGIN_RX = re.compile(r"origin", re.I)


def _ikey(x: dict) -> str:
    return x.get("ref") or "|".join(str(x.get(q)) for q in ("kind", "name", "set_at"))


def _arm(fj: dict, name: str, part: str | None = None) -> bool:
    a = (fj.get("arms") or {}).get(name) or {}
    if not a.get("present"):
        return False
    return not part or bool(((a.get("parts") or {}).get(part) or {}).get("present"))


def _line(at):
    t = str(at or "").rsplit(":", 1)
    return int(t[1]) if len(t) == 2 and t[1].isdigit() else None


def _unq(v) -> str:
    return str(v or "").strip().strip("'\"")


def _is_secret(rec: dict) -> bool:
    """a secret by the feed's own evidence: its type hides the value (SecretStr), or the feed redacted the value an env file gives it
    on a setting that is a plain string — the feed redacts by the setting's name, and a mode (an enum) named for "auth" is no secret"""
    ann = str(rec.get("annotation") or "")
    if "SecretStr" in ann:
        return True
    base = re.sub(r"\s*\|\s*None|None\s*\|\s*|Optional\[|\]", "", ann).strip()
    return base in ("str", "bytes") and any(str(f.get("value")) == "<redacted>" for f in (rec.get("environment") or {}).get("files") or [])


class Ctx:
    """one endpoint's security facts, keyed the way an element is looked up (built once per endpoint, in by_moment)"""

    def __init__(self, F: dict, fj: dict, fep: dict, XS: dict):
        au, rt, rp = F.get("auth") or {}, F.get("rate") or {}, F.get("repeat") or {}
        self.fj = fj
        self.mw = sorted(((str(k).split(":", 1)[-1], m) for k, m in (fj.get("middleware") or {}).items()),
                         key=lambda q: ((q[1].get("order") or {}).get("runs", 99), q[0]))
        self.auth_x = {s.get("exit") for s in au.get("schemes") or [] if s.get("exit")} \
            | {i for i, x in XS.items() if x.get("status") == 401 and x.get("phase") in ("security", "dependency")}
        self.req_x = {q.get("exit") for q in au.get("requires") or [] if q.get("exit")}
        self.rate_x = {q.get("exit") for q in rt.get("limits") or [] if q.get("exit")}
        rq = rp.get("required") or {}
        self.rep_x = {rq["exit"]} if rq.get("exit") else set()
        self.sx = self.auth_x | self.req_x | self.rate_x                         # the endings a switch can turn a check on for
        self.end_item = {}
        for item, xs in (("login", self.auth_x), ("household", self.req_x), ("rate", self.rate_x), ("repeat", self.rep_x)):
            for x in xs:
                self.end_item.setdefault(x, item)
        self.gate_item = {"a:" + str(g.get("fn")): "login" for g in au.get("gates") or []}
        for g in F.get("preconditions") or []:
            if g.get("exit") in self.req_x:
                self.gate_item["g:" + g["id"]] = "household"
            elif g.get("exit") in self.rep_x:
                self.gate_item["g:" + g["id"]] = "repeat"
        for q in rt.get("limits") or []:
            self.gate_item["l:" + str(q.get("limiter") or q.get("class") or "?").lstrip("_")] = "rate"
        for c in (fep.get("failure") or {}).get("catches") or []:
            if c.get("outcome") == "translate":
                x = TRUTH.exit_of_catch(c, XS)
                if x and x["id"] in self.auth_x:
                    self.gate_item["c:" + c["id"]] = "login"
        # the in-flight rows: read inside the middleware that owns a limiter (the values the limit keeps and the setting it reads), or
        # the value the repeat key is kept as
        lim_cls = {str(q.get("via")) for q in rt.get("limits") or [] if q.get("via")}
        lim_pre = []
        for cls, m in self.mw:
            if cls in lim_cls and m.get("method"):
                lim_pre.append(str(m["method"]).split("::")[0] + "::" + cls + ".")
        key = (rp.get("key") or {})
        rkn = str(key.get("through") or "").rsplit(".", 1)[-1]
        self.inf_item = {}
        for x in (F.get("inflight") or {}).get("rows") or []:
            fns = [str(q.get("fn") or "") for q in x.get("read_at") or []] + [str(x.get("set_by") or "")]
            if lim_pre and any(f.startswith(p) for p in lim_pre for f in fns):
                self.inf_item[_ikey(x)] = "rate"
            elif rkn and x.get("name") == rkn and x.get("kind") == "state" and str(x.get("set_by") or "").startswith("middleware:"):
                self.inf_item[_ikey(x)] = "repeat"
        self.prov = {str(p.get("step")) for p in au.get("provisions") or [] if p.get("step")}
        self.claims = [(c.get("table"), str(c.get("fn") or "").replace("#", "::"), c.get("at"), c.get("race_at")) for c in rp.get("claims") or []]
        # a switch is a security switch when what it decides is a security ending
        raw = {w["id"]: w for w in fep.get("switches") or []}
        self.sec_sw = {w["id"] for w in F.get("switches") or []
                       if (set(dict(w, **raw.get(w["id"], {})).get("refs") or []) | set(dict(w, **raw.get(w["id"], {})).get("proves") or [])) & self.sx}
        self.mw_names = {n for n, _m in self.mw}

    def item_of(self, e: dict) -> str | None:
        f, idn = e["f"], str(e.get("id") or "")
        if f == "end":
            return self.end_item.get(idn)
        if f == "gate":
            return self.gate_item.get(idn)
        if f == "inf":
            return self.inf_item.get(idn[2:])
        if f == "data":
            if any(str(q)[2:] in self.prov for q in e.get("rec") or [] if str(q).startswith("s:")):
                return "provision"
            ch = e.get("chip") or []
            hint = str(e.get("hint") or "")
            for tb, fn, at, race in self.claims:
                if ch[:2] == ["op", "w"] and ("table:" + str(tb)) in e["keys"] and ("fn:" + fn) in e["keys"] and _line(at) is not None \
                        and hint.split(":")[0] == TRUTH.short(at).split(":")[0] and _line(at) <= (_line(hint) or -1) <= (_line(race) or 10 ** 9):
                    return "repeat"
        return None

    def flag(self, e: dict, xx: dict, si) -> None:
        """stamp one placed element's extras — home fact (sh), a fact whose home is another row (sx), its order in a cell (so)"""
        f, idn = e["f"], str(e.get("id") or "")
        if f == "stage" and idn.startswith("m:") and idn[2:] in self.mw_names:
            xx["sh"] = 1
            xx["rn"] = [n for n, _m in self.mw].index(idn[2:]) + 1                 # its place in the run order, on its face
            xx["so"] = O_MW + xx["rn"] - 1
        elif f == "std" and idn.startswith("w:") and idn[2:] in self.sec_sw:
            xx["sh"] = 1
            xx["so"] = O_SW
        else:
            item = self.item_of(e)
            if item:
                xx["sx"] = "%s|%s|%s" % (item, f, si)
                xx["so"] = O_MOVED


def build(SC: Ctx, el: list, sp: list, IOC, W: dict, fep: dict, H: str) -> dict:
    """add the row's own elements to `el` (the final list, family "sec" — or "stage" for a middleware no chain passes) and return its
    record: {hd: [[head key, count | None, "ok" | "none" | "unrec"] …]}"""
    fj, S = SC.fj, W["mo"]["sec"]
    si_of = {}
    for i, q in enumerate(sp):
        si_of.setdefault(q[0], i)
    edge = si_of["edge"]
    # ── the middleware: each in run order, at the edge; one no chain passes gets its stage chip (the hover the stage chips have) ──
    have = {x[3] for x in el if x[0] == "stage" and (x[7] or {}).get("sh")}
    for k, (name, _m) in enumerate(SC.mw):
        if name in have:
            continue
        io = IO.io_of({"f": "stage", "id": "m:" + name, "text": name, "keys": []}, {}, IOC)
        el.append(["stage", edge, [], name, None, None, None, {"sh": 1, "rn": k + 1, "so": O_MW + k, "xk": ["middleware:" + name], "io": io}])
    n_sw = sum(1 for x in el if x[0] == "std" and (x[7] or {}).get("sh"))
    hd = []
    mw_ok = _arm(fj, "kinds", "middleware")
    hd.append(["mw", len(SC.mw) or None, "ok" if SC.mw else "none" if mw_ok else "unrec"])           # a count when the feed holds some; "none" only where the arm ran
    sw_ok = _arm(fj, "switches")
    hd.append(["sw", n_sw or None, "ok" if n_sw else "none" if sw_ok else "unrec"])
    # ── the settings the feed records ──
    st_ok = _arm(fj, "short", "setting")
    settings = {str(k).split(":", 1)[-1]: v for k, v in (fj.get("settings") or {}).items()} if st_ok else {}
    # CORS: the origins the CORS middleware allows — the setting named for them
    cors_mw = any(CORS_RX.search(n) for n in SC.mw_names)
    cors = next(((n, s) for n, s in sorted(settings.items()) if CORS_RX.search(n) and ORIGIN_RX.search(n)), None)
    if cors_mw and cors:
        n, s = cors
        origins = [_unq(q) for q in _unq(s.get("default")).split(",") if _unq(q)]
        env, b, c, g = s.get("environment") or {}, [], [], []
        b.append(["setting", {"v": n, "env": s.get("env") or "?", "d": s.get("default") if s.get("default") is not None else "?"}])
        c.append(["corsAllow", {"v": ", ".join(origins) or "?"}])
        for q in s.get("startup") or []:
            c.append(["corsGuard", {"fn": str(q.get("fn") or "").split("::")[-1]}])
        for fl in (env.get("files") or [])[:4]:
            if fl.get("value"):
                g.append(["corsEnvC" if fl.get("commented") else "corsEnv", {"v": str(fl["value"])}])
        el.append(["sec", edge, [], S["cors"], ["sec", "cors"], None, None,
                   {"so": O_CORS, "co": origins[:3], "con": len(origins), "io": {"h": [n, "cors"], "b": b, "c": c, "g": g}}])
        hd.append(["cors", len(origins), "ok"])
    else:
        hd.append(["cors", None, "none" if mw_ok and not cors_mw else "unrec"])
    # secrets: a setting the feed marks secret, read by a function on this endpoint's way (its placed functions, the handler, the
    # middleware's methods) — at the moment that function stands
    way = {}
    for x in el:
        for k in x[2]:
            if str(k).startswith("fn:"):
                way.setdefault(k[3:], (x[1], x[5]))
    for _n, m in SC.mw:
        if m.get("method"):
            way.setdefault(str(m["method"]), (edge, None))
    if H:                                                         # the handler's own reads stand at its first moment
        way.setdefault(H, (si_of.get("checks", si_of.get("work", edge)), None))
    nsec = 0
    for n, s in sorted(settings.items()):
        if not _is_secret(s):
            continue
        rd = [q for q in s.get("readers") or [] if str(q.get("fn")) in way]
        if not rd:
            continue
        si, mask = min((way[str(q["fn"])] for q in rd), key=lambda t: t[0])
        env = s.get("environment") or {}
        c = [["secRead", {"fn": str(q["fn"]).split("::")[-1], "at": TRUTH.short(q.get("at"))}] for q in rd[:3]]
        g = [["secEnv" + str(env.get("state") or "default"), {}]]
        el.append(["sec", si, [], n, ["sec", "secret"], mask, None, {"so": O_SECRET + nsec, "io": {"h": [n, "secret"], "b": [], "c": c, "g": g}}])
        nsec += 1
    hd.append(["sec", nsec or None, "ok" if nsec else "none" if st_ok else "unrec"])
    # ── the marks: one per item, per home row, per moment — it names the item and points to its home row ──
    groups = collections.OrderedDict()
    for x in el:
        sx = (x[7] or {}).get("sx")
        if sx:
            groups.setdefault(sx, []).append(x)
    for gid, xs in groups.items():
        item, fam, si = gid.split("|")
        ms = [q[5] for q in xs]
        mask = None                                              # on every path when any of its elements is; else the paths they are on
        if all(m is not None for m in ms):
            mask = 0
            for m in ms:
                mask |= m
        names = list(dict.fromkeys(str(((q[7] or {}).get("io") or {}).get("h", [""])[0]) for q in xs))
        lab = S["items"][item]["name"]
        shown = ", ".join(names[:3]) + (f", +{len(names) - 3}" if len(names) > 3 else "")
        io = {"h": [lab, "secmark"], "b": [], "c": [["markHolds", {"v": shown}]], "g": [["markGo", {}]]}
        el.append(["sec", int(si), [], lab, ["mark", item], mask, None,
                   {"so": O_MARK + ITEMS.index(item) * 20 + (HOME_ROWS.index(fam) if fam in HOME_ROWS else len(HOME_ROWS)), "mk": [item, fam, len(xs)], "sxg": gid, "io": io}])
    return {"hd": hd}
