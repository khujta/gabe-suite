"""Testing Command Center — results-ingest layer (stdlib only).

Split out of _center_data.py at the P165 seam: the loaders that read RUN
RESULTS — junit XML, coverage JSON, and the center's own run-history
accumulator. These are the sources that get REPLACED on every refresh (a run
overwrites its junit), as opposed to the durable KDBP layer in _center_data.

Paths are resolved from _center_data's config-derived constants (RESULTS_DIR,
CENTER_DIR, REPO_ROOT), so a project points these at its own results dirs
through center.config.json `paths`, never by editing this file. Every source
parses GRACEFULLY ABSENT so the pages render a named gap until the step that
turns the source on lands.
"""

from __future__ import annotations

import datetime as _dt
import json
import xml.etree.ElementTree as ET
from pathlib import Path

import _center_data as _cd  # constants resolved from center.config.json


def _junit_file_of(case: ET.Element, suite_name: str) -> str:
    """Normalize a testcase to its source file across producers.

    pytest (xunit2): classname='tests.test_recipes[.TestClass]', no file attr
    vitest (junit reporter): suite name = 'src/foo.test.ts' relative path
    """
    f = case.get("file")
    if f:
        return f
    cn = case.get("classname", "")
    if "/" in cn or cn.endswith((".ts", ".tsx", ".py")):
        return cn
    if "/" in suite_name or suite_name.endswith((".ts", ".tsx", ".py")):
        return suite_name
    if "." in cn:
        parts = cn.split(".")
        # Drop trailing CamelCase class segments (pytest classes)
        while parts and parts[-1][:1].isupper():
            parts.pop()
        if parts:
            return "/".join(parts) + ".py"
    return cn or suite_name or "?"


def load_junit(name: str) -> dict | None:
    """<results>/<name>-junit.xml -> {'files': {path: {...}}, totals}.

    `name` is a corpus key from center.config.json `corpora` (e.g. 'api',
    'web'); the results dir comes from `paths.results`. Absent file -> None."""
    path = _cd.RESULTS_DIR / f"{name}-junit.xml"
    if not path.exists():
        return None
    root = ET.parse(path).getroot()
    files: dict[str, dict] = {}
    total = failures = errors = skipped = 0
    suites = list(root.iter("testsuite")) or [root]
    ranat = None
    for suite in suites:
        ranat = suite.get("timestamp") or ranat
        for case in suite.iter("testcase"):
            f = _junit_file_of(case, suite.get("name", ""))
            rec = files.setdefault(f, {"tests": 0, "failed": 0, "skipped": 0,
                                       "time": 0.0, "cases": []})
            rec["tests"] += 1
            total += 1
            rec["time"] += float(case.get("time") or 0)
            state = "pass"
            if case.find("failure") is not None or case.find("error") is not None:
                rec["failed"] += 1
                failures += 1
                state = "fail"
            elif case.find("skipped") is not None:
                rec["skipped"] += 1
                skipped += 1
                state = "skip"
            # classname carries the GROUP a case belongs to (pytest class /
            # vitest suite) — kept so a per-file expansion can show the case's
            # own characteristics without re-parsing the XML.
            rec["cases"].append({"name": case.get("name", "?"), "state": state,
                                 "cls": case.get("classname", ""),
                                 "time": float(case.get("time") or 0)})
    return {"files": files, "total": total, "failed": failures + errors,
            "skipped": skipped, "ranAt": ranat,
            "mtime": _dt.datetime.fromtimestamp(path.stat().st_mtime,
                                                _dt.timezone.utc).isoformat()}


def load_history() -> list[dict]:
    """The center's run-history accumulator (docs/site/center/run-history.jsonl)
    — one line per source per build whose totals moved. Absent -> []."""
    path = _cd.CENTER_DIR / "run-history.jsonl"
    if not path.exists():
        return []
    out = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if line:
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return out


def load_coverage() -> dict[str, dict]:
    """{corpus_key: {'percent': float, 'leaf': relpath, ...}} from the coverage
    reporters named in center.config.json `coverage`. Absent reporter -> the
    key is simply missing (a named gap upstream, never a fabricated zero).

    Consumed by the A3 build's Testing KPI row; with no reporter wired the KPI
    stays the honest "no reporter wired" gap and the Risk tab names it."""
    cfg = _cd.CFG.get("coverage", {})
    out: dict[str, dict] = {}
    api = cfg.get("api", {})
    if api.get("json"):
        p = _cd.REPO_ROOT / api["json"]
        if p.exists():
            data = json.loads(p.read_text())
            pct = data.get("totals", {}).get("percent_covered")
            if pct is not None:
                out["api"] = {"percent": round(pct, 1),
                              "leaf": api.get("leaf", "")}
    web = cfg.get("web", {})
    if web.get("summary"):
        p = _cd.REPO_ROOT / web["summary"]
        if p.exists():
            data = json.loads(p.read_text())
            pct = data.get("total", {}).get("lines", {}).get("pct")
            if pct is not None:
                listed = len([k for k in data if k != "total"])
                src = _cd.REPO_ROOT / web.get("src", "web/src")
                exts = tuple(web.get("src_ext", [".ts", ".tsx"]))
                src_total = sum(1 for f in src.rglob("*")
                                if f.suffix in exts and ".test." not in f.name
                                and ".stories." not in f.name) if src.exists() else 0
                out["web"] = {"percent": round(float(pct), 1),
                              "leaf": web.get("leaf", ""),
                              "listed": listed, "src_total": src_total}
    return out
