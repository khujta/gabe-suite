"""Element forms — the PATHS arm, part 1 (amendment 1 §A2 Slice 3 · A4 · A5).

What an endpoint RETURNS when it does not refuse, which called functions DECIDE among several success results, which
calls were collapsed and why — and, for every middleware row that carries a ``when``, whether that condition can hold on
this endpoint's path.

* ``returns[]`` — every return of the handler (a value, a bare ``return``, falling off the end = ``implicit``, a return
  inside an except = ``catch-return``), with its guards. A returned response is sent as built: a literal status is
  ``defined``, the class's own default ``default``, a runtime status ``unknown``; any other value answers the declared
  success status as ``default``. A 4xx/5xx response returned directly is already a refusal row.
* ``branches[]`` — the value returns of a DECIDING callee (D14): at least two candidates (the guarded ones plus the first
  unguarded fall-through) AND either the call site contributes a produced row or precondition, or the arms differ in a
  ``.commit(`` on their guard prefix. A branch links to its depth-1 ``returns[]`` row and that row back to it.
* ``collapsed[]`` — every other project call, with the reason it does not decide.
* ``conditions{}`` + ``when_for_path`` / ``applies`` on middleware rows — the ``when`` terms resolved by
  ``_a3_forms_settings``; path membership is decided against the endpoint's route template; a provable False annotates
  ``applies: false`` and the row stays (D19).
"""
from __future__ import annotations

import ast
import copy
from pathlib import Path

import _a3_forms as F
import _a3_forms_ids as I
import _a3_forms_reach as R
import _a3_forms_schema as SC
import _a3_forms_settings as S
import _a3_forms_walk as W
import _a3_paths as P

PARTS = ("returns", "conditions", "framework", "paths")
_BARE, _IMPLICIT = "__gabe_bare_return__", "__gabe_implicit_return__"


def _own_nodes(fn):
    todo = list(ast.iter_child_nodes(fn))
    while todo:
        n = todo.pop()
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda, ast.ClassDef)):
            continue
        yield n
        todo.extend(ast.iter_child_nodes(n))


def _handlers(repo: Path, forms: dict):
    for key in sorted(forms.get("endpoints") or {}):
        e = forms["endpoints"][key]
        for v in e.get("variants") or [e]:
            file, _, name = str(v.get("handler") or "").partition("::")
            m = P._mod(repo, file) if file else None
            if m is None or not name:
                continue
            fn, dec = P._find_handler(m, {"fn": name, "method": v.get("method"), "path": v.get("path")})
            if fn is not None:
                yield key, v, m, fn


def _breaks(stmts: list) -> bool:
    """Whether a ``break`` in ``stmts`` leaves THIS loop — a nested loop's body keeps its own breaks, its ``else`` does not."""
    todo = list(stmts)
    while todo:
        n = todo.pop()
        if isinstance(n, ast.Break):
            return True
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda)):
            continue
        todo.extend(n.orelse if isinstance(n, (ast.For, ast.AsyncFor, ast.While)) else ast.iter_child_nodes(n))
    return False


def _falls_off(stmts: list) -> bool:
    """Whether control can run past the last statement — ``implicit`` return when it can."""
    if not stmts:
        return True
    last = stmts[-1]
    if isinstance(last, (ast.Return, ast.Raise)):
        return False
    if isinstance(last, ast.If):
        return _falls_off(last.body) or _falls_off(last.orelse)
    if isinstance(last, (ast.With, ast.AsyncWith)):
        return _falls_off(last.body)
    if isinstance(last, P._TRY):
        return (_falls_off(last.body + last.orelse) or any(_falls_off(h.body) for h in last.handlers)) \
            and _falls_off(last.finalbody or [ast.Pass()])
    if isinstance(last, ast.Match):                        # exhaustive only with an unguarded wildcard case
        wild = any(isinstance(c.pattern, ast.MatchAs) and c.pattern.pattern is None and c.guard is None for c in last.cases)
        return not wild or any(_falls_off(c.body) for c in last.cases)
    if isinstance(last, ast.While) and isinstance(last.test, ast.Constant) and last.test.value in (True, 1):
        return _breaks(last.body)
    if isinstance(last, (ast.For, ast.AsyncFor, ast.While)) and last.orelse:
        return _breaks(last.body) or _falls_off(last.orelse)
    return True


def _mark(stmts: list) -> None:
    for st in stmts:
        if isinstance(st, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            continue
        if isinstance(st, ast.Return) and st.value is None:
            st.value = ast.copy_location(ast.Constant(_BARE), st)
        for field in ("body", "orelse", "finalbody"):
            _mark(getattr(st, field, None) or [])
        for h in getattr(st, "handlers", None) or []:
            _mark(h.body)
        for case in getattr(st, "cases", None) or []:
            _mark(case.body)


def returns_of(fn) -> list[dict]:
    """Every return event of ``fn`` — bare and implicit ones included — with ``_a3_paths._walk``'s guard/after/try context."""
    body = copy.deepcopy(fn.body)
    _mark(body)
    if _falls_off(body):
        end = ast.Return(value=ast.Constant(_IMPLICIT))
        end.lineno = end.value.lineno = getattr(fn, "end_lineno", fn.lineno)
        end.col_offset = end.value.col_offset = 0
        body.append(end)
    out: list = []
    P._walk(body, (), (), (), None, False, out)
    return sorted((e for e in out if e["kind"] == "return"), key=lambda e: e["line"])


def _value(e: dict):
    v = e["node"].value
    return None if isinstance(v, ast.Constant) and v.value in (_BARE, _IMPLICIT) else v


def _kind(e: dict) -> str:
    v = e["node"].value
    if isinstance(v, ast.Constant) and v.value == _IMPLICIT:
        return "implicit"
    return "catch-return" if e["handler"] is not None else "return"


def _pred(e: dict) -> str | None:
    parts = [g for g, _ in e["guards"]]
    if e["handler"] is not None:
        parts.append("except " + " | ".join(sorted(P._handler_types(e["handler"][1]) or {"*"})))
    return " and ".join(parts) or None


def _assigned_once(fn, name: str):
    vals = [n.value for n in _own_nodes(fn) if isinstance(n, ast.Assign) and len(n.targets) == 1
            and isinstance(n.targets[0], ast.Name) and n.targets[0].id == name]
    return vals[0] if len(vals) == 1 else None


def _response_class(repo: Path, m, call) -> str | None:
    """The response class a call builds — by name, or a project class one base away from a known one."""
    name = P._leaf(call.func)
    if name in F.RESPONSE_DEFAULTS:
        return name
    r = P._resolve(repo, m, name, at=call) if isinstance(call.func, ast.Name) else None
    cls = r[0].classes.get(r[1]) if r else None
    return next((b for b in (P._leaf(x) for x in (cls.bases if cls is not None else ())) if b in F.RESPONSE_DEFAULTS), None)


def _success(repo: Path, v, m, declared: dict) -> tuple:
    inner = v.value if isinstance(v, ast.Await) else v
    cls = _response_class(repo, m, inner) if isinstance(inner, ast.Call) else None
    if cls is None:
        return ((declared or {}).get("success") or {}).get("status"), "default"
    arg = next((k.value for k in inner.keywords if k.arg == "status_code"), inner.args[1] if len(inner.args) > 1 else None)
    if arg is None:                                        # sent as built: the route's status_code never applies to it
        return F.RESPONSE_DEFAULTS[cls], "default"
    st = P._status(arg, m)
    return (st, "defined") if st else (None, "unknown")


def _token(guard: str | None) -> str | None:
    """A branch in the reader's words: the rightmost name of its innermost guard (``mode == Mode.REPLAY`` → ``REPLAY``;
    a ``match`` case reads its pattern)."""
    if not guard:
        return None
    try:
        tree = ast.parse(guard[len("match "):] if guard.startswith("match ") else guard, mode="eval")
    except SyntaxError:
        return None
    names = [(getattr(n, "end_col_offset", 0), n.attr if isinstance(n, ast.Attribute) else n.id)
             for n in ast.walk(tree) if isinstance(n, (ast.Attribute, ast.Name))]
    return max(names)[1] if names else None


def _row(fid: str, rel: str, e: dict, depth: int, **extra) -> dict:
    row = {"fn": fid, "kind": _kind(e), "at": f"{rel}:{e['line']}", "depth": depth, **extra}
    v = _value(e)
    row["value"] = P._unp(v, 80) if v is not None else None
    pred = _pred(e)
    if pred:
        row["pred"] = pred
    if e["after"]:
        row["after"] = list(e["after"])
    if e["loop"]:
        row["in_loop"] = True
    return row


def _tuple_r(row: dict, e: dict, site_fn: str | None = None) -> list:
    """The ``r:`` tuple; a depth-1 row adds the function it is called from, so one callee reached from two sites (ranked
    by site) or two handlers never shares an id."""
    t = [row["fn"], row["kind"], [g for g, _ in e["guards"]], list(e["after"])]
    return t if site_fn is None else t + [site_fn]


def _deciding(repo: Path, m, fn, v: dict, fid: str):
    """The handler's project calls → ``(branch sets, collapsed rows)``; a branch set is ``(site, call, callee fid, cm, [(event, fall)], why)``.

    A collapsed row's ``reason`` is one of a DECLARED set, each saying what the code does and nothing more (§A4 V20):
    ``unresolved`` · ``constructor: builds a value`` · ``generator: runs after the response line`` · ``swallowed by the
    caller`` · ``expand_branches: none`` · ``no value return`` (the callee raises, or returns nothing to branch on) ·
    ``one return`` · ``arms change neither exit nor commit`` (≥2 arms, same exit and same commit state, and nothing
    leaves the callee by raising) · ``arms differ only in the value returned`` (the same, but a raise DOES leave it, so
    the exit it reaches is reported on the endpoint, not here). A row whose callee supplies one of the endpoint's own
    rows carries ``contributes: "rows"`` whatever its reason — the fact is read before the arm count, never after."""
    mode = F.OPTIONS["expand_branches"]
    evs = P._events(fn)
    hev: dict = {}
    for e in evs:
        if e["handler"] is not None:
            hev.setdefault(id(e["handler"][1]), []).append(e)
    rows = (v.get("produced") or []) + (v.get("preconditions") or [])
    sets, collapsed, seen = [], [], set()
    streamed = P._streamed_calls(fn)                         # §A4 V15: a `with`-entered @contextmanager is no stream
    for ce in (e for e in evs if e["kind"] == "call"):
        call = ce["node"]
        site = f"{m.rel}:{ce['line']}"
        name = P._unp(call.func, 60)
        if (site, name) in seen:
            continue
        seen.add((site, name))
        r = R.callee(repo, m, fn.name, fn, call)
        if r is None:
            f = call.func
            if isinstance(f, ast.Name) and (P._import_at(m, f.id, call) or (None,))[0]:
                got = P._resolve(repo, m, f.id, at=call)
                if got and got[1] in got[0].classes:
                    collapsed.append({"site": site, "call": name, "fn": f"{got[0].rel}::{got[1]}", "reason": "constructor: builds a value"})
                else:
                    collapsed.append({"site": site, "call": name, "fn": None, "reason": "unresolved"})
            continue
        cm, qual = r
        cnode = cm.defs[qual]
        cfid = f"{cm.rel}::{qual}"
        base = {"site": site, "call": name, "fn": cfid}
        if id(call) in streamed and any(isinstance(n, (ast.Yield, ast.YieldFrom)) for n in _own_nodes(cnode)):
            collapsed.append({**base, "reason": "generator: runs after the response line"})
            continue
        if P._climb("Exception", {"Exception"}, ce["tries"], hev)[0] == "swallow":
            collapsed.append({**base, "reason": "swallowed by the caller"})
            continue
        if mode == "none":
            collapsed.append({**base, "reason": "expand_branches: none"})
            continue
        rets = [e for e in returns_of(cnode) if _value(e) is not None]      # VALUE returns only (step 3)
        fall = next((e for e in rets if not e["guards"] and e["handler"] is None and not e["loop"]), None)
        cands = [e for e in rets if e is not fall and (e["guards"] or e["handler"] is not None or e["loop"])] + ([fall] if fall else [])
        via = f"call {qual} @ {site}"
        lo, hi = cnode.lineno, getattr(cnode, "end_lineno", cnode.lineno)
        rowy = any(x.get("via") == via for x in rows) or any(                # §A4 V20: read BEFORE the arm count, so a
            (x.get("raised_at") or "").rpartition(":")[0] == cm.rel          # callee that supplies a row says so even
            and lo <= I._line(x.get("raised_at")) <= hi for x in rows)       # when it has no arm to draw
        note = {"contributes": "rows"} if rowy else {}
        if len(cands) < 2:
            collapsed.append({**base, **note, "reason": "one return" if cands else "no value return"})
            continue
        why = ["contributes-rows"] if rowy else []
        commits = [e for e in P._events(cnode) if e["kind"] == "call" and P._leaf(e["node"].func) in F.TX_CALLS]

        def committed(e) -> bool:
            """A commit ran before this return on its guard prefix — never one inside the try whose except holds the return."""
            gs = [g for g, _ in e["guards"]]
            own = {e["handler"][0].lineno} if e["handler"] is not None else set()
            return any(c["line"] < e["line"] and [g for g, _ in c["guards"]] == gs[:len(c["guards"])]
                       and not own & {t.lineno for t in c["tries"]} for c in commits)

        if len({committed(e) for e in cands}) > 1:
            why.append("commit-differs")
        if not why and mode == "all":
            why.append("expand_branches: all")
        if not why:                                                      # §A4 V20: only claim "neither exit" when
            cev = P._events(cnode)                                        # nothing leaves the callee by raising
            chev: dict = {}
            for e in cev:
                if e["handler"] is not None:
                    chev.setdefault(id(e["handler"][1]), []).append(e)
            escapes = any(e["kind"] == "raise" and P._climb("Exception", {"Exception"}, e["tries"], chev)[0] == "escape"
                          for e in cev)
            collapsed.append({**base, **note, "reason": "arms differ only in the value returned" if escapes
                              else "arms change neither exit nor commit"})
            continue
        sets.append((site, name, cfid, cm, [(e, e is fall) for e in sorted(cands, key=lambda e: e["line"])], why))
    return sets, collapsed


def returns_part(repo: Path, forms: dict) -> dict:
    stats = {"returns": 0, "branch_returns": 0, "branches": 0, "handlers_expanded": 0, "collapsed": {}}
    r_entries, b_entries, pending = [], [], []
    for key, v, m, fn in _handlers(repo, forms):
        fid = f"{m.rel}::{fn.name}"
        rets = []
        for e in returns_of(fn):
            val = _value(e)
            if val is not None and P._response_exit(val.value if isinstance(val, ast.Await) else val, m, repo):
                continue                                  # a returned refusal is already a produced row
            held = _assigned_once(fn, val.id) if isinstance(val, ast.Name) else None
            shown = held if held is not None else val     # `resp = RedirectResponse(…); return resp` answers what resp is
            status, state = _success(repo, shown, m, v.get("declared")) if shown is not None else (((v.get("declared") or {}).get("success") or {}).get("status"), "default")
            row = _row(fid, m.rel, e, 0, status=status, state=state)
            rets.append(row)
            r_entries.append((_tuple_r(row, e), I._pos(row["at"]), row))
        sets, collapsed = _deciding(repo, m, fn, v, fid)
        branches = []
        for site, name, cfid, cm, arms, why in sets:
            for e, fall in arms:
                ret = _row(cfid, cm.rel, e, 1, status=None, state="n/a", site=site)
                if fall:
                    ret["kind"] = "fall-through" if ret["kind"] == "return" else ret["kind"]
                rets.append(ret)
                r_entries.append((_tuple_r(ret, e, fid), I._pos(ret["at"], site), ret))
                br = {"site": site, "call": name, "fn": cfid, "pred": ret.get("pred"), "after": ret.get("after") or [],
                      "token": "fall-through" if fall else _token(e["guards"][-1][0] if e["guards"] else None),
                      "why": list(why), "_ret": ret}
                branches.append(br)
                b_entries.append(([cfid, [g for g, _ in e["guards"]], list(e["after"]), fid], I._pos(ret["at"], site), br))
        stats["returns"] += sum(1 for r in rets if r["depth"] == 0)
        stats["branch_returns"] += sum(1 for r in rets if r["depth"] == 1)
        stats["branches"] += len(branches)
        stats["handlers_expanded"] += 1 if sets else 0
        for c in collapsed:
            stats["collapsed"][c["reason"]] = stats["collapsed"].get(c["reason"], 0) + 1
        pending.append((v, rets, branches, collapsed))
    for (t, pos, row), ident in zip(r_entries, I.ranked("r", [(t, pos) for t, pos, _ in r_entries])):
        row["id"] = ident
    for (t, pos, row), ident in zip(b_entries, I.ranked("b", [(t, pos) for t, pos, _ in b_entries])):
        row["id"] = ident
    for v, rets, branches, collapsed in pending:
        v["returns"] = sorted(rets, key=lambda r: (r["depth"], I._line(r.get("site")), I._line(r["at"])))
        for br in branches:
            ret = br.pop("_ret")
            br["return"], ret["branch"] = ret["id"], br["id"]
        if branches:
            v["branches"] = [{"id": b["id"], **{k: b[k] for k in ("site", "call", "fn", "pred", "after", "token", "return", "why")}} for b in branches]
        if collapsed:
            v["collapsed"] = collapsed
    return stats


class _Subst(ast.NodeTransformer):
    def __init__(self, table: dict) -> None:
        self.table = table

    def visit_Attribute(self, node: ast.Attribute):
        src = ast.unparse(node)
        return ast.parse(self.table[src], mode="eval").body if src in self.table else self.generic_visit(node)


def row_condition(repo: Path, r: dict, fp: str, cache: dict) -> tuple:
    """A middleware row's ``when`` on the route ``fp`` → ``(True | False | None, residual, terms)``: path membership is
    decided against the route template, every other term stays open. ``cache`` keeps the resolved terms and the method's
    once-assigned locals per (file, via, when) — the switches arm reads the same answer."""
    site = str(r.get("site") or r.get("at") or "")
    file = site.rpartition(":")[0]
    ck = (file, r.get("via"), r["when"], site)
    if ck not in cache:
        m = P._mod(repo, file)
        meth = next((m.defs[f"{r.get('via')}.{x}"] for x in F.MIDDLEWARE_METHODS if f"{r.get('via')}.{x}" in m.defs), None) if m else None
        cache[ck] = (S.terms(repo, m, r.get("via"), r["when"], at=site) if m else [], S.locals_once(meth) if meth is not None else {})
    terms, subst = cache[ck]
    known = {}
    for t in terms:
        kind = {"in": "in", "not-in": "in", "startswith": "startswith"}.get(t["kind"])
        hit = S.path_match(fp, kind, t["values"]) if kind and S.is_path(t.get("subject"), subst) else None
        if hit is not None:
            known[t["src"]] = hit != (t["kind"] == "not-in")
    val, residual = S.evaluate(r["when"], known)
    return val, residual, terms


def conditions_part(repo: Path, forms: dict) -> tuple[dict, dict]:
    if F.OPTIONS["exempt_rows"] != "annotate":
        raise ValueError(f"exempt_rows {F.OPTIONS['exempt_rows']!r} is not built — annotate is the only form (D19)")
    conds: dict = {}
    cache: dict = {}
    stats = {"conditions": 0, "applies_false": 0, "applies_true": 0, "when_for_path": 0}
    for e in (forms.get("endpoints") or {}).values():
        for v in e.get("variants") or [e]:
            fp = v.get("full_path") or ""
            for r in v.get("produced") or []:
                if r.get("phase") != "middleware" or not r.get("when"):
                    continue
                val, residual, terms = row_condition(repo, r, fp, cache)
                file = str(r.get("site") or r.get("at") or "").rpartition(":")[0]
                if not any(c["file"] == file and c["via"] == r.get("via") and c["when"] == r["when"] for c in conds.values()):
                    conds[f"{file}::{r.get('via')}: {r['when']}"] = {"via": r.get("via"), "when": r["when"], "file": file, "terms": terms}
                if val is False:
                    r["applies"] = False
                    stats["applies_false"] += 1
                elif val is True:
                    r["applies"] = True
                    stats["applies_true"] += 1
                elif residual:
                    table = {t["src"]: t["expr"] for t in terms if t["kind"] == "expr" and t.get("expr")}
                    try:
                        r["when_for_path"] = ast.unparse(_Subst(table).visit(ast.parse(residual, mode="eval").body))
                    except SyntaxError:                   # a `when` cut at 160 characters stays as written
                        r["when_for_path"] = residual
                    stats["when_for_path"] += 1
    stats["conditions"] = len(conds)
    return dict(sorted(conds.items())), stats


def run(forms: dict, ctx: dict) -> dict:
    """The paths arm's parts: ``returns`` (returns · branches · collapsed) and ``conditions`` (Slice 3), ``framework`` (the
    body-parse exits FastAPI answers before any dependency, Slice 4) and ``paths`` (one path per exit, Slice 5b)."""
    repo, parts = Path(ctx["repo"]), ctx["parts"]
    stats: dict = {}
    if "returns" in parts:
        stats.update(returns_part(repo, forms))
    if "conditions" in parts:
        forms["conditions"], got = conditions_part(repo, forms)
        stats.update(got)
    if "framework" in parts:
        stats.update(SC.framework_exits(repo, forms))
    if "paths" in parts:
        stats.update(W.paths_part(repo, forms))
    return {"version": 1, "stats": stats,
            "options": {"expand_branches": F.OPTIONS["expand_branches"], "exempt_rows": F.OPTIONS["exempt_rows"]}}


run.parts = PARTS
