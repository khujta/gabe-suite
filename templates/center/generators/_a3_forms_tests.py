"""Element forms — the TESTS arm: which test proves which exit, and which path (amendment 1 §A2 Slice 9 · A10 · U14).

The map credits every test that calls an endpoint to the whole endpoint; a refusal a test never asserts reads as tested.
This arm reads each pytest corpus's junit (``<paths.results>/<corpus>-junit.xml``), extracts each test function's
calls and assertions (``_a3_test_asserts``), matches each call to an endpoint — its mounted ``full_path`` first, else a
suffix of its path (``route_match: suffix``) — and joins each ``act`` call to the exits it can prove: by the asserted
status, narrowed by an asserted ``detail`` or ``code``, by the headers it sends (a missing ``Authorization`` is the
security 401, a present one the dependency 401 — not read when the headers are unknown or the module overrides
dependencies), a bare 422 on a JSON body is the validation row. One candidate left → a ref with its ``conf``; several →
``ambiguous of n`` on each; none → ``asserted-unproduced``. A ``pytest.raises(X)`` around a service call joins the rows
X translates that were raised in that service's file. Refs land on ``produced[j].tests``, ``returns[k].tests``,
``framework_exits[f].tests`` and ``paths[i].tests``; each endpoint gets ``tests{act, arranged_by, helper_arranged,
unjoined}``; top-level ``test_cases{}`` keeps every case's calls. No pytest junit → ``present: false``.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path

import _a3_forms as F
import _a3_test_asserts as TA
import _a3_tests as TS
import _results_ingest as RI


def _cases(repo: Path, cfg: dict) -> list[dict]:
    results = repo / (((cfg or {}).get("paths") or {}).get("results") or "tests/results")
    out = []
    for c in (cfg or {}).get("corpora") or []:
        if c.get("runner") != "pytest":
            continue
        p = results / f"{c.get('key')}-junit.xml"
        if not p.exists():
            continue
        root = ET.parse(p).getroot()
        rows = []
        for suite in list(root.iter("testsuite")) or [root]:
            for case in suite.iter("testcase"):
                state = "fail" if case.find("failure") is not None or case.find("error") is not None else "skip" if case.find("skipped") is not None else "pass"
                rows.append({"name": case.get("name", "?"), "file": RI._junit_file_of(case, suite.get("name", "")), "state": state})
        base = TS._probe_root(repo, sorted({r["file"] for r in rows}), c.get("root", ""))
        for r in rows:
            out.append({**r, "corpus": c.get("key"), "path": f"{base}/{r['file']}" if base else r["file"]})
    return out


def _endpoints(forms: dict) -> list[dict]:
    out = []
    for key, e in sorted((forms.get("endpoints") or {}).items()):
        for v in e.get("variants") or [e]:
            out.append({"key": key, "v": v, "method": str(v.get("method") or "").upper(),
                        "full": TS._segs(str(v.get("full_path") or "")), "tsegs": TS._segs(str(v.get("path") or "")), "path": v.get("path")})
    return out


def _fits(t: str, s: str) -> bool:
    """One segment: an endpoint template `{x}` takes any test segment; a literal takes only itself — a test's `*` slot
    (an f-string variable) never stands in for a literal the route spells out (§A4 V10 · V11)."""
    return t.startswith("{") or t == s


def _match(eps: list, method: str, path: str) -> tuple[dict | None, str | None]:
    """The endpoint a test path names — ``full`` when every segment fits, else the longest fitting ``suffix``. When a
    literal route and a template route both fit (`/things/special` beside `/things/{id}`), the literal one comes
    first: ``_endpoints`` sorts the keys, and a literal segment sorts before ``{`` — the order a sane registration
    protects, which the feed cannot read. That invariant, not a tie-break, is what picks it."""
    segs = ["*" if "{*}" in s else s for s in TS._segs(path.split("?")[0])]
    for e in eps:
        if e["method"] == method and e["full"] and len(e["full"]) == len(segs) and all(_fits(t, s) for t, s in zip(e["full"], segs)):
            return e, "full"
    best = None
    for e in eps:                                            # the suffix fallback, under the same segment rule
        t = e["tsegs"]
        if e["method"] != method or not t or len(t) > len(segs):
            continue
        if all(_fits(ts, ls) for ts, ls in zip(t, segs[-len(t):])) and (best is None or len(t) > len(best["tsegs"])):
            best = e
    return (best, "suffix") if best else (None, None)


def _candidates(v: dict) -> list[dict]:
    out = [{"row": r, "id": r.get("id"), "status": r.get("status"), "phase": r.get("phase"), "detail": r.get("detail"), "raised_at": r.get("raised_at"),
            "via": r.get("via")} for r in v.get("produced") or [] if r.get("id") and r.get("applies") is not False]
    out += [{"row": x, "id": x.get("id"), "status": x.get("status"), "phase": x.get("phase"), "detail": x.get("detail")} for x in v.get("framework_exits") or [] if x.get("id")]
    out += [{"row": r, "id": r.get("id"), "status": r.get("status"), "phase": "success"} for r in v.get("returns") or [] if r.get("depth") == 0 and r.get("id")]
    return out


def _join(call: dict, v: dict, overrides: bool) -> tuple[list, list, str | None]:
    """``(candidates left, conf parts, problem)`` for one act call."""
    a = call["asserts"]
    cands = _candidates(v)
    wanted = list(dict.fromkeys(a["status"]))
    if a["is_success"] and not wanted:
        cands = [c for c in cands if isinstance(c["status"], int) and 200 <= c["status"] < 300]
        conf = ["success"]
    elif wanted:
        cands = [c for c in cands if c["status"] in wanted]
        conf = ["status"]
    else:
        return [], [], None
    problem = None
    for lit in a["detail"] + a["code"]:
        narrowed = [c for c in cands if isinstance(c.get("detail"), str) and lit in c["detail"]]
        if narrowed:
            cands = narrowed
            conf.append("detail" if lit in a["detail"] else "code")
        else:
            problem = "test-detail-unmatched"
    if len(cands) > 1 and call["sends"] is not None and not overrides:
        auth = any(k.lower() == "authorization" for k in call["sends"])
        phases = {c["phase"] for c in cands}
        if "security" in phases and "dependency" in phases:
            cands = [c for c in cands if (c["phase"] != "security") == auth]
            conf.append("shape")
    if len(cands) > 1 and wanted == [422] and call["json"]:
        val = [c for c in cands if c["phase"] == "validation"]
        if val:
            cands = val
    return cands, conf, problem


def run(forms: dict, ctx: dict) -> dict:
    """The tests arm: ``test_cases{}``, ``.tests`` refs on rows and paths, ``tests{}`` per endpoint; findings
    ``test-detail-unmatched`` · ``asserted-unproduced`` · ``untested-exit``."""
    repo = Path(ctx["repo"])
    cases = _cases(repo, ctx.get("cfg") or {})
    if not cases:
        return {"present": False, "reason": "absent: no pytest junit under the results directory", "version": 1, "stats": {}}
    eps = _endpoints(forms)
    extracted: dict = {}
    stats = {"cases": 0, "calls": {}, "unmatched": 0, "headers_unknown": 0, "joins": {"single": 0, "ambiguous": 0, "unproduced": 0},
             "exits": {"tested": 0, "total": 0}, "endpoints_tested": 0, "raises_refs": 0, "findings": {}}
    found: list = []
    summary: dict = {}
    test_cases: dict = {}
    seen_cid: dict = {}                                      # §A4 V35: a C-id keys a case only when it is UNIQUE in
    for case in cases:                                       # the feed — parametrized runs share one and fall back
        m0 = TA.CID_RX.search(case["name"])
        if m0:
            seen_cid[f"C{m0.group(1)}"] = seen_cid.get(f"C{m0.group(1)}", 0) + 1
    for case in cases:
        src_path = repo / case["path"]
        if src_path not in extracted:
            try:
                extracted[src_path] = TA.extract(src_path.read_text())
            except (OSError, SyntaxError, UnicodeDecodeError):
                extracted[src_path] = {"tests": {}, "overrides": False}
        mod = extracted[src_path]
        fn_name = case["name"].split("[", 1)[0]
        t = mod["tests"].get(fn_name)
        if t is None:
            continue
        m = TA.CID_RX.search(case["name"])
        cid = f"C{m.group(1)}" if m and seen_cid.get(f"C{m.group(1)}", 0) == 1 else f"{case['path']}::{fn_name}"
        stats["cases"] += 1
        calls_out = []
        for call in t["calls"]:
            stats["calls"][call["role"]] = stats["calls"].get(call["role"], 0) + 1
            if call["sends"] is None:
                stats["headers_unknown"] += 1
            e, how = _match(eps, call["method"], call["path"])
            rec = {k: call[k] for k in ("line", "method", "path", "sends", "role")}
            rec["asserts"] = {k: v for k, v in call["asserts"].items() if v}
            if call.get("helper"):
                rec["helper"] = call["helper"]
            if e is None:
                stats["unmatched"] += 1
                calls_out.append(rec)
                continue
            rec.update(endpoint=e["key"], route_match=how)
            s = summary.setdefault(id(e["v"]), {"v": e["v"], "key": e["key"], "act": 0, "arranged_by": set(), "helper_arranged": set(), "unjoined": set()})
            if call["role"] != "act":
                (s["helper_arranged"] if call.get("helper") else s["arranged_by"]).add(cid)
                calls_out.append(rec)
                continue
            s["act"] += 1
            cands, conf, problem = _join(call, e["v"], mod["overrides"])
            if problem:
                found.append({"id": problem, "slot": F.FINDINGS[problem]["slot"], "case": cid, "line": call["line"], "endpoint": e["key"]})
            if not conf:
                s["unjoined"].add(cid)
                calls_out.append(rec)
                continue
            if not cands:
                stats["joins"]["unproduced"] += 1
                s["unjoined"].add(cid)
                found.append({"id": "asserted-unproduced", "slot": F.FINDINGS["asserted-unproduced"]["slot"], "case": cid, "line": call["line"],
                              "endpoint": e["key"], "statuses": call["asserts"]["status"]})
                calls_out.append(rec)
                continue
            label = "+".join(conf) if len(cands) == 1 else f"ambiguous of {len(cands)}"
            stats["joins"]["single" if len(cands) == 1 else "ambiguous"] += 1
            refs = []
            for c in cands:
                ref = {"case": cid, "line": call["line"], "conf": label}
                missing = sorted(set(call["asserts"]["status"]) - {x["status"] for x in _candidates(e["v"])})
                if missing and len(cands) == 1:
                    ref["alternatives"] = missing
                c["row"].setdefault("tests", []).append(ref)
                refs.append({"exit": c["id"], "conf": label, **({"alternatives": ref["alternatives"]} if "alternatives" in ref else {})})
            rec["refs"] = refs
            calls_out.append(rec)
        for r in t["raises"]:                              # the rows that translate X, raised in the called service's file
            imp = r["imp"] if "imp" in r else mod.get("imports", {}).get(r.get("root") or "")   # a root the test imports itself
            files = {f"{imp[0].replace('.', '/')}.py", f"{imp[0].replace('.', '/')}/{imp[1]}.py" if imp[1] else ""} - {""} if imp else set()
            hits = [(e, row) for e in eps for row in e["v"].get("produced") or []
                    if row.get("raised_at") and row.get("via") and r["raises"] in str(row["via"]) and row.get("id")
                    and any(str(row["raised_at"]).rpartition(":")[0].endswith(f) for f in files)]
            for e, row in hits:
                row.setdefault("tests", []).append({"case": cid, "line": r["line"], "conf": "service raises"})
                stats["raises_refs"] += 1
        test_cases[cid] = {"name": case["name"], "file": case["path"], "line": t["line"], "state": case["state"], "corpus": case["corpus"],
                           "calls": calls_out, **({"raises": t["raises"]} if t["raises"] else {})}
    for e in eps:
        v = e["v"]
        by_exit: dict = {}
        for row in (v.get("produced") or []) + (v.get("framework_exits") or []) + [r for r in v.get("returns") or [] if r.get("depth") == 0]:
            if row.get("tests"):
                row["tests"] = sorted(row["tests"], key=lambda x: (x["case"], x["line"]))
                by_exit[row.get("id")] = row["tests"]
        for p in v.get("paths") or []:
            if (p.get("exit") or {}).get("id") in by_exit:
                p["tests"] = by_exit[p["exit"]["id"]]
        exits = [r for r in v.get("produced") or [] if r.get("id") and r.get("applies") is not False]
        tested = [r for r in exits if r.get("tests")]
        stats["exits"]["total"] += len(exits)
        stats["exits"]["tested"] += len(tested)
        s = summary.get(id(v))
        if s is not None:
            v["tests"] = {"act": s["act"], "arranged_by": sorted(s["arranged_by"]), "helper_arranged": sorted(s["helper_arranged"]),
                          "unjoined": sorted(s["unjoined"])}
            stats["endpoints_tested"] += 1 if tested else 0
            untested = [r["id"] for r in exits if not r.get("tests")]
            if untested and (tested or s["act"]):
                found.append({"id": "untested-exit", "slot": F.FINDINGS["untested-exit"]["slot"], "endpoint": e["key"], "exits": untested})
    forms["test_cases"] = dict(sorted(test_cases.items()))
    if found:
        forms["arm_findings"].setdefault("tests", []).extend(found)
    for f in found:
        stats["findings"][f["id"]] = stats["findings"].get(f["id"], 0) + 1
    return {"version": 1, "stats": stats}
