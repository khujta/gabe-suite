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
import os
import subprocess
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
    written, how = report_written(path)
    at = run_stamp(ranat, naive_zone(name))
    # ONE rule for when the run happened, read by every page that shows it (index's Last run, the run-history line and
    # so the test corpora, a feature page's "captured") — D-062: the report's own run time; when it names none, or one
    # that does not parse, the time the report FILE was written (report_written), and the page says which.
    run = {"at": at or written, "how": "ran" if at else how, "raw": None if (at or not ranat) else ranat}
    return {"files": files, "total": total, "failed": failures + errors,
            "skipped": skipped, "ranAt": ranat, "written": written, "run": run}


def _git(cwd: Path, *args: str) -> str | None:
    """One git READ (stdout) without optional locks — a build only reads the tree it reports on; None when git is
    missing, the directory is no work tree, or the call fails."""
    try:
        r = subprocess.run(["git", *args], cwd=str(cwd), capture_output=True, text=True, timeout=30,
                           env={**os.environ, "GIT_OPTIONAL_LOCKS": "0"})
    except (OSError, subprocess.SubprocessError):
        return None
    return r.stdout if r.returncode == 0 else None


def report_written(path: Path) -> tuple[str, str]:
    """When a report FILE was written → ``(UTC "YYYY-MM-DDTHH:MM:SSZ", how)``, D-061's evidence rule for one file: a
    report git tracks and the working tree has not changed since is dated by its last COMMIT — ``how`` "committed", the
    same instant in a clone made on any day — and any other (untracked, changed since, or no git) by the file's time —
    ``how`` "file". A tracked file's time is the checkout's, never the run's, which is why it only dates a file git
    cannot (the D-062 review's F1)."""
    d, name = path.parent, path.name
    if (_git(d, "ls-files", "-z", "--", name) or "").strip("\0") \
            and _git(d, "status", "--porcelain", "-z", "--untracked-files=no", "--", name) == "":
        ct = (_git(d, "log", "-1", "--format=%ct", "--", name) or "").strip()
        if ct.isdigit():
            return _dt.datetime.fromtimestamp(int(ct), _dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "committed"
    return (_dt.datetime.fromtimestamp(path.stat().st_mtime, _dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "file")


_ZONES: dict = {}


def naive_zone(key: str) -> _dt.tzinfo | None:
    """The zone a corpus's runner writes a zone-less stamp in — ``naive_tz`` on its ``center.config.json`` corpora
    entry: "utc" (jest-junit writes UTC with no zone marker), an offset "+HH:MM" / "-HH:MM", or an IANA name
    ("America/Sao_Paulo"). None — the default — reads such a stamp as its date and time AS WRITTEN (a runner's local
    time, zone unknown). A value that names no zone is said once and read as None."""
    if key in _ZONES:
        return _ZONES[key]
    spec = next((c.get("naive_tz") for c in (_cd.CFG.get("corpora") or [])
                 if isinstance(c, dict) and c.get("key") == key), None)
    zone = None
    if spec:
        s = str(spec).strip()
        try:
            if s.lower() in ("utc", "z"):
                zone = _dt.timezone.utc
            elif s[:1] in "+-" and ":" in s:
                h, m = s[1:].split(":", 1)
                zone = _dt.timezone((-1 if s[0] == "-" else 1) * _dt.timedelta(hours=int(h), minutes=int(m)))
            else:
                from zoneinfo import ZoneInfo
                zone = ZoneInfo(s)
        except Exception:   # noqa: BLE001 — an unknown zone is a config error, said once; the stamp stays as written
            print(f"  ⚠ center.config.json corpora[{key}].naive_tz {s!r} names no zone — its zone-less run times are "
                  "read as written")
            zone = None
    _ZONES[key] = zone
    return zone


def run_stamp(raw: str | None, zone: _dt.tzinfo | None = None) -> str | None:
    """When a report's run RAN, in the form the run-history records it (D-062) — the run's own clock, never the
    build's: a stamp that names its zone becomes UTC ``YYYY-MM-DDTHH:MM:SSZ``; one that does not is read in ``zone``
    (the corpus's ``naive_tz``, naive_zone) and becomes UTC the same way, else — a runner's local time, zone unknown —
    keeps its date and time as written, to the second. None when the report names no time, or names one that does not
    parse."""
    if not raw:
        return None
    try:
        ts = _dt.datetime.fromisoformat(str(raw).strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    if ts.tzinfo is None and zone is not None:
        ts = ts.replace(tzinfo=zone)
    if ts.tzinfo is None:
        return ts.strftime("%Y-%m-%dT%H:%M:%S")
    return ts.astimezone(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


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
