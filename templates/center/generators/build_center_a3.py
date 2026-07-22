#!/usr/bin/env python3
"""A3 command-center station generator (stdlib only).

Fills the SHIPPED A3-Tabbed shell skeletons
(templates/center/shell/ — vendored, adopt-spec 1.1.1 §shell contract) with
machine facts from _center_data.py. The shell's invariant chrome — colored+iconed
sidebar (map v3: Now · Board · Entities · Docs · Code · Testing · Ledger ·
Releases · Leaf), the five-tab feature bar (Overview · Code · Tests · Evidence ·
Risk) and its data-sec section identities — ships IN the skeletons and is never
regenerated here; this only fills the project-specific slots.

Anti-curation: every number below is read from a machine source at build time
(PLAN.md, PENDING.md, LEDGER.md, junit XML, adoption.json, git). Slots whose
generator does not exist yet are left as raw {{TOKEN}}s so assets/slots.js
renders them as an honest "awaiting generator" chip — never as fake coverage.

Usage:  python3 scripts/build_center_a3.py
Gate:   python3 scripts/check_center_links.py   (run after)
"""

from __future__ import annotations

import contextlib
import datetime as _dt
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _center_data as D  # noqa: E402
from _a3_code import ENTITY_CODE, ENTITY_MODELS, collect_entity_map  # noqa: E402
from _a3_feature import (  # noqa: E402
    ENTITY_PROOFS,
    ENTITY_RX,
    build_feature_pages,
    case_rows,
)

REPO_ROOT = D.REPO_ROOT
CENTER = D.CENTER_DIR               # READ root (config, adoption, cards, archmap)
# GABE_CENTER_OUT redirects every WRITE (pages, assets, archmap, run-history) to
# a scratch dir so a lab run can read a real project and never mutate it.
CENTER_OUT = (Path(os.environ["GABE_CENTER_OUT"])
              if os.environ.get("GABE_CENTER_OUT") else CENTER)
CFG = D.CFG
# The corpora a project verifies with — key · runner · kind, declared in
# center.config.json so no test-suite name is hardcoded here. Defaults to the
# api(pytest)/web(vitest) pair the suite ships with.
CORPORA = CFG.get("corpora") or [
    {"key": "api", "runner": "pytest", "kind": "integration",
     "kind_detail": "HTTP surface", "tag_class": "l-api", "kpi_detail": "pytest"},
    {"key": "web", "runner": "vitest", "kind": "unit",
     "kind_detail": "components/hooks", "tag_class": "l-web", "kpi_detail": "vitest"},
]
E2E = CFG.get("e2e", {})
_PROJECT = CFG.get("project", {})
PROJECT_NAME = _PROJECT.get("name", REPO_ROOT.name)
PROJECT_DISPLAY = _PROJECT.get("display_name", PROJECT_NAME)
# Project maturity is READ from .kdbp/BEHAVIOR.md, not assumed. "" when absent —
# the feature pages render an honest "not declared" rather than a fabricated tier.
MATURITY = D.load_maturity()
# This generator emits the app-wide Architecture station every run (rendered
# from archmap.json — the read-once rule), so its Code-group nav item is always
# lit. A binding a project has not wired yet would flip this False and get the
# honest "not built yet" line instead.
BUILD_ARCHITECTURE = CFG.get("build_architecture", True)
_IC_LIST = ('<line x1="8" y1="6" x2="21" y2="6"/>'
            '<line x1="8" y1="12" x2="21" y2="12"/>'
            '<line x1="8" y1="18" x2="21" y2="18"/>'
            '<line x1="3" y1="6" x2="3.01" y2="6"/>'
            '<line x1="3" y1="12" x2="3.01" y2="12"/>'
            '<line x1="3" y1="18" x2="3.01" y2="18"/>')
_IC_CODE = ('<polyline points="16 18 22 12 16 6"/>'
            '<polyline points="8 6 2 12 8 18"/>')
_IC_DB = ('<ellipse cx="12" cy="5" rx="9" ry="3"/>'
          '<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>'
          '<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>')
_IC_FILES = ('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 '
             '3h9a2 2 0 0 1 2 2z"/>')
_VERB_CLS = {"GET": "m-get", "POST": "m-post", "DELETE": "m-del",
             "PUT": "m-mut", "PATCH": "m-mut"}
# The shell is a build INPUT, so it is vendored IN THE REPO. It used to be read
# straight from ~/.claude/templates/…, which meant the same commit rendered a
# different center depending on which template version the machine happened to
# have installed — and CI could not regenerate the center at all. For a system
# whose whole claim is "regenerate it and check", the regeneration input has to
# be under version control. The installed copy is now a FALLBACK, and a drift
# between the two is reported rather than silently preferred.
VENDORED_SHELL = REPO_ROOT / "templates" / "center" / "shell"
INSTALLED_SHELL = Path.home() / ".claude" / "templates" / "gabe" / "center" / "shell"


def resolve_shell() -> tuple[Path, str]:
    """(shell dir, one-line provenance) — vendored first, installed as fallback."""
    env = os.environ.get("GABE_SHELL_SRC")
    if env:
        return Path(env), f"shell: {env} (env override)"
    if VENDORED_SHELL.is_dir():
        note = f"shell: {VENDORED_SHELL.relative_to(REPO_ROOT)} (vendored)"
        if INSTALLED_SHELL.is_dir():
            drift = [p.name for p in sorted(VENDORED_SHELL.rglob("*"))
                     if p.is_file()
                     and (INSTALLED_SHELL / p.relative_to(VENDORED_SHELL)).exists()
                     and (INSTALLED_SHELL / p.relative_to(VENDORED_SHELL)
                          ).read_bytes() != p.read_bytes()]
            if drift:
                note += (f" · ⚠ {len(drift)} file(s) differ from the installed "
                         f"copy ({', '.join(drift[:4])}) — vendored wins")
        return VENDORED_SHELL, note
    return INSTALLED_SHELL, (f"shell: {INSTALLED_SHELL} (INSTALLED — not in this "
                             f"repo; regen is not reproducible from a clone)")


SHELL_SRC, SHELL_NOTE = resolve_shell()

from _a3_render import (  # noqa: E402  (helpers live beside this module)
    E,
    legend,
    meter,
    sechead,
    gap,
    kpi,
    md,
    strip_slot_doc_comments,
    table,
    trunc,
)


def sh(*args: str) -> str:
    try:
        return subprocess.run(args, capture_output=True, text=True,
                              cwd=REPO_ROOT).stdout.strip()
    except OSError:
        return ""


# --------------------------------------------------------------------------- #
# Machine sources
# --------------------------------------------------------------------------- #

plan = D.load_plan()
pending = D.load_pending()
ledger = D.load_ledger(8)
# One junit read per declared corpus — keyed by the corpus key, so nothing
# downstream names a specific suite; it iterates CORPORA.
junit_by = {c["key"]: D.load_junit(c["key"]) for c in CORPORA}

adoption = {}
adopt_path = CENTER / "adoption.json"
if adopt_path.exists():
    adoption = json.loads(adopt_path.read_text())
sections = adoption.get("sections", [])

walks = []
_walks_path = REPO_ROOT / ".kdbp" / "walks.jsonl"
if _walks_path.exists():
    for _ln in _walks_path.read_text().splitlines():
        if _ln.strip():
            with contextlib.suppress(json.JSONDecodeError):
                walks.append(json.loads(_ln))

phases = plan["phases"]
done_phases = [p for p in phases if all(v == "done" for v in p["cells"].values())]
owed = [p for p in phases if any(v != "done" for v in p["cells"].values())]
open_pending = [r for r in pending if r["open"]]
crit_pending = [r for r in open_pending if r["priority"] in ("critical", "high")]

t_total = sum((j or {}).get("total", 0) for j in junit_by.values())
t_failed = sum((j or {}).get("failed", 0) for j in junit_by.values())
t_skipped = sum((j or {}).get("skipped", 0) for j in junit_by.values())
pass_pct = f"{100.0 * (t_total - t_failed) / t_total:.1f}%" if t_total else "—"

HEAD_SHA = sh("git", "rev-parse", "--short", "HEAD") or "—"
_NOW = _dt.datetime.now(_dt.timezone.utc)
STAMP = _NOW.strftime("%Y-%m-%d %H:%MZ")
STAMP_ISO = _NOW.strftime("%Y-%m-%dT%H:%M:%SZ")
adopted = sum(1 for s in sections if s["status"] == "approved")

# --------------------------------------------------------------------------- #
# The center's own run accumulator — run-history.jsonl. The pre-adoption center
# kept one line per source per build; the A3 rebuild dropped the WRITER while
# keeping the reader (D.load_history) and the named-gap render. This is the
# writer, restored (adopt-spec §ephemeral/accumulator — the center's accumulator
# is this file). A build appends a source's line ONLY when its totals moved
# since that source's last line, so a regen that re-rendered identical junit adds
# nothing and the cap holds real run history rather than regen noise.
# --------------------------------------------------------------------------- #
HISTORY_CAP = 50


def append_history() -> list[dict]:
    hist = D.load_history()
    last: dict[str, dict] = {}
    for rec in hist:
        last[rec.get("source", "?")] = rec.get("totals", {})
    new = []
    for c in CORPORA:
        src, j = c["runner"], junit_by.get(c["key"])
        if not j:
            continue
        totals = {"passed": j["total"] - j["failed"] - j["skipped"],
                  "failed": j["failed"], "skipped": j["skipped"]}
        if last.get(src) != totals:
            new.append({"ts": STAMP_ISO, "source": src, "totals": totals})
    if not new:
        return hist
    lines = (hist + new)[-HISTORY_CAP:]
    (CENTER_OUT / "run-history.jsonl").write_text(
        "".join(json.dumps(rec) + "\n" for rec in lines))
    return lines


HISTORY = append_history()


def _verification_changelog() -> str:
    """The Tests-station accumulator, rendered — one row per source with its last
    recorded totals and how many builds moved it. Empty history stays an honest
    named gap rather than a zeroed table."""
    if not HISTORY:
        return gap("Verification changelog", "docs/site/center/run-history.jsonl")
    by_src: dict[str, list[dict]] = {}
    for rec in HISTORY:
        by_src.setdefault(rec.get("source", "?"), []).append(rec)
    rows = []
    for src, recs in sorted(by_src.items()):
        t = recs[-1].get("totals", {})
        rows.append([f"<b>{E(src)}</b>", str(t.get("passed", 0)),
                     str(t.get("failed", 0)), str(t.get("skipped", 0)),
                     str(len(recs)), E(D.rel_age(recs[-1].get("ts")))])
    return table(
        ["Source", "Passed", "Failed", "Skipped", "Runs recorded", "Last change"],
        rows, num={1, 2, 3, 4},
        note=f"{len(HISTORY)} line(s) in run-history.jsonl (committed, capped "
             f"{HISTORY_CAP}) — one per source per build whose totals moved. The "
             f"durable memory of what actually ran; a regen that changed nothing "
             f"adds nothing.")


verification_changelog = _verification_changelog()

# --------------------------------------------------------------------------- #
# Sidebar (entities come from the APPROVED adoption baseline — never an
# archived nav; adopt-spec 1.1.1 shell contract)
# --------------------------------------------------------------------------- #

BOX = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
       'stroke-linecap="round" stroke-linejoin="round">'
       '<rect x="3" y="3" width="18" height="18" rx="2"/></svg>')
# ONE vocabulary. adoption.json is the entity registry: every station names
# entities from it. This used to be a second hand-kept list, while tests.html
# grouped by a THIRD (center.config.json `areas`) and the config declared a
# fourth (`entities`, rendered nowhere) — so a reader crossing from the corpus
# matrix to a feature page silently changed taxonomy. See D123.
# D123: rows carry `display_name` — one word, one fact, rendered on nav, pages
# and the map. `label` is read as a fallback for tracker rows written before the
# rename, so an un-migrated adoption.json still names its entities.
LABELS = {s["entity"]: (s.get("display_name") or s.get("label") or s["entity"])
          for s in sections}
_REGISTRY = set(LABELS)


def _assert_registered(name: str, keys) -> None:
    """A per-entity mapping keyed on a slug the registry does not know is a
    typo that renders as silence — the exact drift class this center exists to
    kill. The config validates its own ids this way; the code dicts never did."""
    unknown = sorted(set(keys) - _REGISTRY)
    if unknown:
        raise SystemExit(
            f"center: {name} has key(s) {unknown} that are not entities in "
            f"adoption.json. Registry: {sorted(_REGISTRY)}")


for _n, _d in (("_a3_feature.ENTITY_RX", ENTITY_RX),
               ("_a3_feature.ENTITY_PROOFS", ENTITY_PROOFS),
               ("_a3_code.ENTITY_CODE", ENTITY_CODE),
               ("_a3_code.ENTITY_MODELS", ENTITY_MODELS)):
    _assert_registered(_n, _d)
def _has_card(slug: str) -> bool:
    """A feature page is written only once the entity has a card
    (build_feature_pages skips the cardless) — so a card on disk is the honest
    test for whether feature-<slug>.html will exist to link to."""
    return (CENTER / "cards" / f"{slug}.md").exists()


def _entity_href(slug: str) -> str:
    """A feature page exists only once the entity has a card — until then the
    nav points at the index rather than a 404."""
    return f"feature-{slug}.html" if _has_card(slug) else "entity-index.html"


# Map v3 (D123): adoption.json IS the registry that drives the sidebar. An
# entity with a card links its feature page; a pending entity (no card yet)
# renders MUTED and points at the index — never a dead feature link. Every row
# that is not yet approved wears its tracker state as a chip, so the sidebar
# tells the truth about what is adopted and what is still owed.
def _sidebar_entity(s: dict) -> str:
    slug = s["entity"]
    status = s["status"]
    approved = status in ("approved", "covered-by-feature")
    has_card = _has_card(slug)
    chip = "" if approved else f' <span class="count">{E(status)}</span>'
    style = "" if has_card else ' style="opacity:.55"'
    href = f"feature-{slug}.html" if has_card else "entity-index.html"
    return (f'<a class="navitem"{style} href="{href}" '
            f'title="{E(s["rank"])} · {E(status)}">{BOX} '
            f'{E(LABELS.get(slug, slug))}{chip}</a>')


sidebar_entities = "\n  ".join(_sidebar_entity(s) for s in sections) \
    or '<span class="navsub" style="opacity:.5">no shortlist yet</span>'

# {{SIDEBAR_CODE}} — the Architecture item lights up only when architecture.html
# is on disk (this generator writes it every run, so it is always lit here); a
# project that has not built the station yet gets an honest muted line, never a
# dead link. The per-feature Code TAB deliberately has no nav item of its own.
_ARCH_IC = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
            '<polyline points="16 18 22 12 16 6"/>'
            '<polyline points="8 6 2 12 8 18"/></svg>')


def _sidebar_code(current: bool = False) -> str:
    if (CENTER / "architecture.html").exists() or BUILD_ARCHITECTURE:
        on = " on" if current else ""
        return f'<a class="navitem{on}" href="architecture.html">{_ARCH_IC} Architecture</a>'
    return '<span class="navsub" style="opacity:.5">not built yet</span>'


# {{SIDEBAR_LEAF}} — each known OSS report gets a link WHEN its file is on disk
# under center/leaf/, else the honest empty line. Never a dead link.
_LEAF_REPORTS = [(r["path"], r["label"]) for r in CFG.get("leaf_reports", [])]
_LEAF_IC = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
            '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'
            '<polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>')
sidebar_leaf = "\n  ".join(
    f'<a class="navitem" href="{rel}">{_LEAF_IC} {E(label)}</a>'
    for rel, label in _LEAF_REPORTS if (CENTER / rel).exists()
) or '<span class="navsub" style="opacity:.5">none wired yet</span>'

# --------------------------------------------------------------------------- #
# Hub content
# --------------------------------------------------------------------------- #

hub_stats = '<div class="kpis">' + "".join([
    kpi("tests", f"{t_total:,}", f"{t_failed} failed · {t_skipped} skipped",
        alert=bool(t_failed)),
    kpi("pass rate", pass_pct, "junit api + web"),
    kpi("phases", f"{len(done_phases)}/{len(phases)}", f"current {plan['current_phase']}"),
    kpi("open debt", str(len(open_pending)),
        f"{len(crit_pending)} critical/high", alert=bool(crit_pending)),
    kpi("adopted", f"{adopted}/{len(sections)}",
        f"{sum(1 for s in sections if s['status'] == 'awaiting-approval')} "
        f"awaiting approval", alert=bool(len(sections) - adopted)),
]) + "</div>"

recent_changes = table(
    ["Date", "Type", "Change", "Commit"],
    [[E(r[0]), E(r[1]), f"<b>{md(r[2])}</b>", f"<code>{E(r[3])}</code>"] for r in ledger],
    note="Source: .kdbp/LEDGER.md — newest first.")

needs_rows = [
    [f'<b>{E(p["id"])}</b> {E(trunc(p["name"], 44))}',
     E(", ".join(k for k, v in p["cells"].items() if v != "done")), "phase cell"]
    for p in owed[:8]
] + [
    [f'<b>P{E(r["num"])}</b> {md(trunc(r["finding"], 44))}',
     E(r["priority"]), E(r["source"])]
    for r in crit_pending[:6]
]
# Adoption owes too. The hub knew about phases and debt and nothing about the
# sections — so the re-walk the transaction page demands on its own risk
# register did not appear in the one place a reader looks for "what needs me".
_adopt_rows = []
for _s in sections:
    if _s["status"] == "approved":
        continue
    _unchecked = [k.replace("_", " ") for k, v in _s.get("checklist", {}).items()
                  if not v]
    _owes = (", ".join(_unchecked) if _unchecked
             else "operator approval — the checklist is complete")
    _adopt_rows.append([
        f'<a href="{_entity_href(_s["entity"])}"><b>'
        f'{E(LABELS[_s["entity"]])}</b></a>',
        E(_owes), f'adoption · {E(_s["status"])}'])
needs_rows += _adopt_rows

needs_you = (
    f'<div class="callout warn"><h3>{len(owed)} phase(s) owe cells · '
    f'{len(crit_pending)} critical/high debt · {len(_adopt_rows)} section(s) '
    f'not yet approved</h3></div>'
    + table(["Item", "Owes / priority", "Kind"], needs_rows,
            note=f"Showing {len(needs_rows)} of "
                 f"{len(owed) + len(crit_pending) + len(_adopt_rows)} open "
                 f"items — phase cells, priced debt, and sections awaiting "
                 f"adoption."))

# Drift: the authored current phase vs the earliest phase still owing a cell.
# When they disagree, a phase everyone considers shipped is missing a tick.
if plan.get("authored_phase") and plan["first_owed"] not in plan["authored_phase"]:
    stale = next((p for p in phases if p["id"] == plan["first_owed"]), None)
    unticked = ", ".join(k for k, v in stale["cells"].items() if v != "done") if stale else "?"
    needs_you += (
        f'<div class="callout warn"><h3>PLAN drift — authored phase '
        f'{E(plan["authored_phase"])}, but {E(plan["first_owed"])} still owes '
        f'{E(unticked)}</h3><div class="items">'
        f'<a href="board.html"><b>{E(plan["first_owed"])}</b> unticked '
        f'<span class="tag">{E(unticked)}</span></a></div></div>')

# --------------------------------------------------------------------------- #
# Board content
# --------------------------------------------------------------------------- #

board_kpis = '<div class="kpis">' + "".join([
    kpi("phases done", f"{len(done_phases)}/{len(phases)}"),
    kpi("current", plan["current_phase"], "authored (PLAN.json)"),
    kpi("first owed", plan["first_owed"], "earliest unticked cell"),
    kpi("owed", str(len(owed)), "any cell not done", alert=bool(owed)),
    kpi("open debt", str(len(open_pending)), f"{len(crit_pending)} critical/high"),
]) + "</div>"

GLYPH = {"done": "✅", "in_progress": "🔄", "todo": "⬜"}
_rail_src = owed[:14] or phases[-14:]
rail = table(
    ["Phase", "Tier", "Complexity", "Red", "Exec", "Review", "Commit", "Push"],
    [[f'<b>{E(p["id"])}</b> {E(trunc(p["name"], 46))}', E(p["tier"]), E(p["complexity"]),
      GLYPH.get(p["red"] or "", "—"), GLYPH[p["cells"]["exec"]],
      GLYPH[p["cells"]["review"]], GLYPH[p["cells"]["commit"]],
      GLYPH[p["cells"]["push"]]] for p in _rail_src],
    note=f"{len(owed)} of {len(phases)} phases owe at least one cell · "
         f"showing {len(_rail_src)}. ✅ done · 🔄 in progress · ⬜ todo · — n/a.")

review_debt = [r for r in open_pending if "review" in r["source"].lower()]
review_lane = table(
    ["#", "Finding", "Priority", "File"],
    [[f'<b>P{E(r["num"])}</b>', md(trunc(r["finding"], 68)), E(r["priority"]),
      md(r["file"][:46])] for r in review_debt[:10]],
    note=f"{len(review_debt)} open review-sourced row(s).")

nonphase = [r for r in open_pending if "review" not in r["source"].lower()]
nonphase_lane = table(
    ["#", "Finding", "Source", "Priority"],
    [[f'<b>P{E(r["num"])}</b>', md(trunc(r["finding"], 64)), E(r["source"]),
      E(r["priority"])] for r in nonphase[:10]],
    note=f"{len(nonphase)} open non-review row(s).")

_backlog_src = sorted(open_pending,
                      key=lambda r: {"critical": 0, "high": 1, "medium": 2}.get(
                          r["priority"], 3))[:12]
backlog = table(
    ["#", "Finding", "Priority", "Deferred", "File"],
    [[f'<b>P{E(r["num"])}</b>', md(trunc(r["finding"], 60)), E(r["priority"]),
      f'{E(r["deferred"])}×', md(r["file"][:40])] for r in _backlog_src],
    num={3},
    note=f"{len(open_pending)} open · showing {len(_backlog_src)} by priority.")

# --------------------------------------------------------------------------- #
# Tests station
# --------------------------------------------------------------------------- #

def entities_of(path: str) -> list[str]:
    """Which registry entities claim this test file — the SAME regexes the
    feature pages count with, so the corpus matrix and a feature page can never
    disagree about what belongs to an entity.

    Returns a LIST because the regexes overlap by design: per-entity counts are
    views over the corpus, never a partition of it. A file claimed twice is
    counted on both rows and says so, rather than being silently assigned to
    whichever rule matched first (which is what the old glob map did)."""
    return [slug for slug, rx in ENTITY_RX.items() if re.search(rx, path, re.I)]


corpora = {c["key"]: junit_by.get(c["key"]) for c in CORPORA}
grid: dict[str, dict[str, list[int]]] = {
    s["entity"]: {c: [0, 0] for c in corpora} for s in sections}
unmapped = {c: [0, 0] for c in corpora}
shared_files = 0
for corpus, j in corpora.items():
    for fpath, rec in (j or {}).get("files", {}).items():
        owners = entities_of(fpath)
        if len(owners) > 1:
            shared_files += 1
        for slug in (owners or [None]):
            row = grid[slug] if slug in grid else unmapped
            row[corpus][0] += rec["tests"]
            row[corpus][1] += 1

n_files = sum(len((j or {}).get("files", {})) for j in junit_by.values())
_corpus_kpis = [
    kpi(c["key"], f"{(junit_by.get(c['key']) or {}).get('total', 0):,}",
        f"{len((junit_by.get(c['key']) or {}).get('files', {}))} files · {c['runner']}")
    for c in CORPORA]
# Coverage rides the KPI row when a reporter is wired (config `coverage`
# block, read by load_coverage); absent it stays the honest named gap.
_covd = D.load_coverage()
_cov_kpi = (
    kpi("coverage", " · ".join(f"{v['percent']}% {k}" for k, v in _covd.items()),
        "lines, from the wired reporter(s)")
    if _covd else kpi("coverage", "—", "no reporter wired"))
tests_kpis = '<div class="kpis">' + "".join([
    kpi("total", f"{t_total:,}", f"{n_files} files"),
    *_corpus_kpis,
    kpi("failed", str(t_failed), f"{t_skipped} skipped", alert=bool(t_failed)),
    _cov_kpi,
]) + "</div>"

# "N api + M web" — the per-corpus estate breakdown for the Testing lede.
_corpus_breakdown = " + ".join(
    f"{(junit_by.get(c['key']) or {}).get('total', 0):,} {c['key']}" for c in CORPORA)

_hdr = "".join(f"<th>{E(c)}</th>" for c in corpora)
_rows = ""
for a in [{"id": s["entity"], "label": LABELS[s["entity"]]} for s in sections]:
    # .cell is display:block and belongs on an element INSIDE the <td> — putting
    # it on the <td> drops the cell out of table layout and stacks the columns.
    cells = "".join(
        f'<td><span class="cell"><b>{grid[a["id"]][c][0]}</b> '
        f'<small>{grid[a["id"]][c][1]} files</small></span></td>' if grid[a["id"]][c][0]
        else '<td class="void">—</td>'
        for c in corpora)
    _rows += (f'<tr><th class="area"><a href="{_entity_href(a["id"])}">'
              f'{E(a["label"])}</a></th>{cells}</tr>')
_um = "".join(
    f'<td><span class="cell"><b>{unmapped[c][0]}</b> '
    f'<small>{unmapped[c][1]} files</small></span></td>'
    for c in corpora)
_rows += f'<tr><th class="area">unclaimed</th>{_um}</tr>'
matrix = (f'<table class="riskgrid"><tr><th class="area"></th>{_hdr}</tr>{_rows}</table>'
          f'<p class="sub">Files are claimed by the ENTITY REGISTRY '
          f'(adoption.json) through the same regexes the feature pages count '
          f'with — click an entity to open its page. The regexes overlap by '
          f'design, so {shared_files} file(s) are claimed by more than one '
          f'entity and counted on each row: these are views over the corpus, '
          f'not a partition of it, and the rows do not sum to the total. '
          f'"unclaimed" is honest surface area, not failure.</p>')

# --- the corpus, file by file: the reverse index the archive had and the A3
# center dropped. A reader on a feature page can reach its files; nobody could
# go the other way, and the 608 unclaimed cases had no surface at all.
_file_rows, _file_exp = [], []
for _corpus, _j in corpora.items():
    for _f, _rec in sorted((_j or {}).get("files", {}).items(),
                           key=lambda x: -x[1]["tests"]):
        _owners = entities_of(_f)
        _claim = " ".join(
            f'<a class="dlink" href="{_entity_href(o)}">{E(LABELS[o])}</a>'
            for o in _owners) or '<span class="tag s-gap">unclaimed</span>'
        _file_rows.append([
            f'<span class="tag {"l-api" if _corpus == "api" else "l-web"}">'
            f"{E(_corpus)}</span>",
            f"<code>{E(_f)}</code>", str(_rec["tests"]),
            meter(_rec["tests"] - _rec["failed"], _rec["tests"]), _claim])
        _file_exp.append((f'The {_rec["tests"]} case(s) in '
                          f'<code>{E(_f.rsplit("/", 1)[-1])}</code>',
                          case_rows(_rec, _corpus)))
_unclaimed_files = sum(1 for r in _file_rows if "unclaimed" in r[4])
matrix += (
    sechead("Testing", "The corpus, file by file", "#0f766e", _IC_LIST,
            sub="every test file in the estate, what claims it, and its cases",
            id_="sec-tests-files",
            info='<div class="leg">Claimed by = the registry entities whose '
                 "file pattern matches; open a row to read the cases without "
                 "leaving this page. A file may be claimed twice — the counts "
                 "are views, not a partition.</div>"
                 + legend("Claim state:", [
                     ("s-gap", "unclaimed",
                      "no adopted entity names this file yet — surface area, "
                      "not failure")]))
    + table(["Corpus", "File", "Cases", "Passing", "Claimed by"],
            _file_rows, num={2}, expand=_file_exp,
            note=f"{len(_file_rows)} file(s) · {_unclaimed_files} unclaimed. "
                 f"Read from the junit capture at build time; a file that stops "
                 f"running disappears from this table by itself."))

_results_rel = CFG.get("paths", {}).get("results", "tests/results")
_bucket_rows = [
    [f'<b>{E(c["key"])}</b>', E(c["runner"]),
     str(len((junit_by.get(c["key"]) or {}).get("files", {}))),
     f'{(junit_by.get(c["key"]) or {}).get("total", 0):,}',
     f'{_results_rel}/{c["key"]}-junit.xml'] for c in CORPORA]
if E2E:
    _bucket_rows.append(
        ["<b>e2e</b>", E(E2E.get("runner", "playwright")), "—", "—",
         f'<span class="tag">not wired</span> {E(E2E.get("not_wired_note", ""))}'])
buckets = table(
    ["Corpus", "Runner", "Files", "Tests", "Report source"],
    _bucket_rows, num={2, 3})

hooks = D.load_precommit_hooks()
ci_jobs = D.load_ci_jobs()
gates = table(
    ["Gate", "Kind", "Detail"],
    [[f"<b>{E(h)}</b>", "pre-commit", ".pre-commit-config.yaml"] for h in hooks]
    + [[f"<b>{E(wf)}</b>", "ci", f"{len(js)} job(s)"] for wf, js in ci_jobs.items()],
    note=f'{len(hooks)} pre-commit hook(s) · '
         f'{sum(len(j) for j in ci_jobs.values())} CI job(s).')

proof_root = D.PROOF_DIR
pdirs = sorted((d for d in proof_root.iterdir() if d.is_dir()),
               key=lambda d: d.name) if proof_root.exists() else []
demo_shelf = table(
    ["Proof set", "Shots"],
    [[f"<b>{E(d.name)}</b>", str(len(list(d.glob("*.png"))))] for d in pdirs[:14]],
    num={1},
    note=f"{len(pdirs)} proof set(s) on disk · showing {min(len(pdirs), 14)}."
) if pdirs else gap("Demo shelf", "tests/web-e2e/proof/")

# --------------------------------------------------------------------------- #
# Entity index station — the approved adoption baseline (adoption.json)
# --------------------------------------------------------------------------- #

_by_rank = {"critical": 0, "high": 1, "medium": 2}
entities_kpis = '<div class="kpis">' + "".join([
    kpi("entities", str(len(sections)), "approved baseline"),
    kpi("critical", str(sum(1 for s in sections if s["rank"] == "critical"))),
    kpi("high", str(sum(1 for s in sections if s["rank"] == "high"))),
    kpi("adopted", f"{adopted}/{len(sections)}", "walk-approved sections",
        alert=(adopted == 0 and bool(sections))),
]) + "</div>"

entity_grid = table(
    ["Entity", "Rank", "Status", "Machine signals", "Treatment"],
    [[f'<a href="{_entity_href(s["entity"])}"><b>'
      f'{E(LABELS.get(s["entity"], s["entity"]))}</b></a>', E(s["rank"]),
      E(s["status"]), E(trunc(s["signals"], 96)),
      # The column header already says Treatment — don't repeat it in the cell.
      E(trunc(s["notes"].removeprefix("Treatment:").split(".")[0], 58))]
     for s in sorted(sections, key=lambda s: _by_rank.get(s["rank"], 3))],
    note="Source: docs/site/center/adoption.json — built one per run via "
         "/gabe-adopt section <entity>, then walk-approved.")

# --------------------------------------------------------------------------- #
# Hub lens tabs — the four-tab set re-lenses ONE subject (here: the project).
# Each lens is a rollup that points at the station holding the full view.
# --------------------------------------------------------------------------- #

_corpus_meta = [(c["key"], c["runner"], junit_by.get(c["key"])) for c in CORPORA]
tab_tests = (
    '<p class="sub">Corpus rollup — one row per corpus. The full matrix, gates '
    'and angles live on <a href="tests.html">Tests</a>.</p>'
    + table(["Corpus", "Runner", "Files", "Tests", "Failed", "Skipped", "Last run"],
            [[f"<b>{E(n)}</b>", E(runner), str(len(j["files"])), f'{j["total"]:,}',
              str(j["failed"]), str(j["skipped"]), E(D.rel_age(j.get("ranAt")))]
             for n, runner, j in _corpus_meta if j]
            + ([["<b>e2e</b>", E(E2E.get("runner", "playwright")), "—", "—", "—",
                 "—", '<span class="tag">not wired</span>']] if E2E else []),
            num={2, 3, 4, 5}))

digests = []
for name in [c["key"] for c in CORPORA]:
    dp = REPO_ROOT / "tests" / "results" / f"{name}-junit.xml.digest.json"
    if dp.exists():
        # A corrupt digest is a missing digest — the row simply doesn't render.
        with contextlib.suppress(json.JSONDecodeError):
            digests.append((name, json.loads(dp.read_text())))

_proof_rows = []
if pdirs:
    _dated = [(d, max((p.stat().st_mtime for p in d.glob("*.png")), default=0),
               len(list(d.glob("*.png")))) for d in pdirs]
    for d, mt, n in sorted(_dated, key=lambda x: -x[1])[:8]:
        when = _dt.datetime.fromtimestamp(mt, _dt.timezone.utc).strftime("%Y-%m-%d") \
            if mt else "—"
        _proof_rows.append([f"<b>{E(d.name)}</b>", str(n), when])

tab_evidence = (
    '<p class="sub">Committed run digests — the memory of what actually ran '
    '(gate-spec <code>results_out</code>).</p>'
    + table(["Report", "Exit", "Passed", "Failed", "Skipped", "Duration", "HEAD", "Recorded"],
            # dict.get(k, default) does NOT apply the default when the key
            # EXISTS with a null value — and a digest legitimately carries
            # `"duration_s": null` when its runner reports no wall clock (the
            # web vitest digest does). Coalesce explicitly; a missing duration
            # renders as a named gap, not as "0s", which would read as a run
            # that took no time.
            [[f"<b>{E(n)}</b>", str(d.get("exit")),
              f'{(d.get("passed") or 0):,}',
              str(d.get("failed") or 0), str(d.get("skipped") or 0),
              (f'{d["duration_s"]:.0f}s' if d.get("duration_s") is not None
               else '<span class="sub">not recorded</span>'),
              f'<code>{E(str(d.get("head_sha")))}</code>',
              E(str(d.get("timestamp_utc", ""))[:16].replace("T", " "))] for n, d in digests],
            num={1, 2, 3, 4, 5},
            note="Absent digest = the run left no machine record.")
    + '<p class="sub">Latest proof sets — newest first. Full shelf on '
      '<a href="tests.html">Tests → Evidence</a>.</p>'
    + table(["Proof set", "Shots", "Newest"], _proof_rows, num={1},
            note=f"{len(pdirs)} proof set(s) on disk · showing {len(_proof_rows)}."))

# Risk = what is NOT verified: owed debt, drift, and unwired surfaces.
_risk_rows = [
    [f'<b>P{E(r["num"])}</b> {md(trunc(r["finding"], 52))}', E(r["priority"]),
     md(trunc(r["file"], 34)), E(r["source"])] for r in crit_pending[:8]]
if plan.get("authored_phase") and plan["first_owed"] not in plan["authored_phase"]:
    _risk_rows.append([f'PLAN drift — {E(plan["first_owed"])} still owes a cell '
                       f'while {E(plan["authored_phase"])} is authored current',
                       "high", ".kdbp/PLAN.md", "plan"])
for _n, _d in digests:
    if str(_d.get("head_sha")) != HEAD_SHA:
        _risk_rows.append([f'{E(_n)} evidence predates HEAD '
                           f'(recorded at <code>{E(str(_d.get("head_sha")))}</code>)',
                           "medium", "tests/results/", "digest"])
_gaps = [("e2e junit", "not wired — D121 local-only")]
if not _covd:
    _gaps.insert(0, ("Coverage", "no reporter wired"))
if not walks:
    _gaps.append(("Manual angles", ".kdbp/walks.jsonl absent"))
for _what, _src in _gaps:
    _risk_rows.append([f"{_what} unverified", "gap", E(_src), "named gap"])

tab_risk = (
    '<p class="sub">What is not verified — open critical/high debt, plan drift, '
    'stale evidence and unwired surfaces. Gate states below.</p>'
    + table(["Risk", "Severity", "Where", "Source"], _risk_rows,
            note=f"{len(crit_pending)} critical/high open of {len(open_pending)} total.")
    + '<p class="sub">Gate states.</p>' + gates)

# --------------------------------------------------------------------------- #
# Ledger station — one page per change, from git + PLAN cells + LEDGER row.
# (DEPLOYMENTS/ledger parsing lives here, not in _center_data.py, which is
# already over its size budget — see PENDING split seam.)
# --------------------------------------------------------------------------- #

_shortstat = sh("git", "show", "--shortstat", "--format=", "HEAD").strip()
_head_subject = sh("git", "log", "-1", "--format=%s")
_head_when = sh("git", "log", "-1", "--format=%ad", "--date=short")
_week = sh("git", "log", "--since=7.days", "--format=%h")
_nums = re.findall(r"(\d+) (files? changed|insertions?|deletions?)", _shortstat)
_stat = {k.split()[0]: v for v, k in _nums}

change_kpis = '<div class="kpis">' + "".join([
    kpi("commit", HEAD_SHA, _head_when),
    kpi("files", _stat.get("files", "0"), "changed in HEAD"),
    kpi("insertions", _stat.get("insertions", "0")),
    kpi("deletions", _stat.get("deletions", "0")),
    kpi("commits / 7d", str(len([c for c in _week.splitlines() if c]))),
]) + "</div>"

_log = sh("git", "log", "-10", "--format=%h\x1f%ad\x1f%s", "--date=short")
def entities_touched(sha: str) -> list[str]:
    """Which registry entities a commit touched, from the files it changed.

    ENTITY_CODE already maps entity -> source paths for the Code tab; the same
    map answers "which entity did this change belong to", which the ledger and
    release stations could not say at all. Globs are matched the way the code
    map expands them, so the answer here and on a feature page agree."""
    import fnmatch
    files = sh("git", "show", "--name-only", "--format=", sha).splitlines()
    hit = []
    for slug, layers in ENTITY_CODE.items():
        pats = [pat for pats in layers.values() for pat in pats]
        if any(fnmatch.fnmatch(f, pat) or f == pat
               for f in files for pat in pats):
            hit.append(slug)
    return sorted(hit)


def _entity_chips(slugs: list[str]) -> str:
    return " ".join(
        f'<a class="dlink" href="{_entity_href(x)}">{E(LABELS[x])}</a>'
        for x in slugs) or '<span class="sub">—</span>'


_commit_rows = [p for p in (ln.split("\x1f") for ln in _log.splitlines() if ln)
                if len(p) == 3]
change_commits = table(
    ["Commit", "Date", "Subject", "Entity"],
    [[f"<code>{E(p[0])}</code>", E(p[1]), md(trunc(p[2], 66)),
      _entity_chips(entities_touched(p[0]))] for p in _commit_rows],
    note="Source: git log — newest first. Entity is derived from the files the "
         "commit touched against the same code map the feature pages render, "
         "so a commit with no entity column changed something no adopted "
         "section claims yet.")

# PLAN cell flips: which phase rows changed, in the commits that touched PLAN.md.
_plan_log = sh("git", "log", "-6", "--format=%h\x1f%ad\x1f%s", "--date=short",
               "--", ".kdbp/PLAN.md")
_cell_rows = []
for _ln in _plan_log.splitlines():
    if not _ln:
        continue
    _p = _ln.split("\x1f")
    if len(_p) != 3:
        continue
    _diff = sh("git", "show", _p[0], "--format=", "--", ".kdbp/PLAN.md")
    _ids = []
    for _dl in _diff.splitlines():
        if _dl[:1] in "+-" and _dl[1:2] == "|":
            _c = [x.strip() for x in _dl[1:].strip().strip("|").split("|")]
            if len(_c) > 1 and _c[0] and _c[0] != "#":
                _pid = _c[1].partition("·")[0].strip() or _c[0]
                if _pid not in _ids:
                    _ids.append(_pid)
    _cell_rows.append([f"<code>{E(_p[0])}</code>", E(_p[1]), md(trunc(_p[2], 46)),
                       E(", ".join(_ids[:6]) or "—")])
change_cells = table(
    ["Commit", "Date", "Subject", "Phase rows touched"], _cell_rows,
    note="Commits that edited .kdbp/PLAN.md — the phase rows whose cells moved.")

_verify_rows = [[E(r[1]), md(trunc(r[2], 44)), f"<code>{E(r[3])}</code>",
                 md(trunc(r[4], 88))] for r in ledger[:6]]
change_verify = table(
    ["Type", "Change", "Commit", "Gates recorded"], _verify_rows,
    note="Source: .kdbp/LEDGER.md Gates column — what the gate actually recorded.")

# --------------------------------------------------------------------------- #
# Releases station — DEPLOYMENTS.md (stakeholder showcase)
# --------------------------------------------------------------------------- #


def load_deployments() -> list[dict]:
    """.kdbp/DEPLOYMENTS.md table -> rows, parsed never interpreted."""
    path = REPO_ROOT / ".kdbp" / "DEPLOYMENTS.md"
    out: list[dict] = []
    if not path.exists():
        return out
    for line in path.read_text().splitlines():
        if not line.startswith("|") or line.startswith("|--") or "| Date |" in line:
            continue
        cells = [c.strip() for c in line.strip().strip("|").replace("\\|", "|").split("|")]
        if len(cells) >= 6 and cells[0] and cells[0] != "#":
            out.append({"id": cells[0], "date": cells[1], "target": cells[2],
                        "pr": cells[3], "ci": cells[4], "notes": cells[5],
                        # gabe-push 7.5b writes a 7th Decisions column; older
                        # tables carry 6 — absent reads as the "—" it renders.
                        "decisions": cells[6] if len(cells) >= 7 else "—"})
    return out


deploys = load_deployments()
_recent = list(reversed(deploys))[:12]
_with_pr = [d for d in deploys if d["pr"] not in ("—", "-", "")]

releases_kpis = '<div class="kpis">' + "".join([
    kpi("deploys", str(len(deploys)), "DEPLOYMENTS.md rows"),
    kpi("latest", deploys[-1]["date"][:10] if deploys else "—",
        deploys[-1]["target"][:26] if deploys else ""),
    kpi("via PR", str(len(_with_pr)), f"of {len(deploys)}"),
    kpi("covered", f"{adopted}/{len(sections)}", "center sections"),
]) + "</div>"

latest_release = table(
    ["Field", "Value"],
    [["<b>id</b>", E(deploys[-1]["id"])], ["<b>date</b>", E(deploys[-1]["date"])],
     ["<b>branch → target</b>", md(deploys[-1]["target"])],
     ["<b>PR</b>", md(deploys[-1]["pr"])], ["<b>CI result</b>", md(deploys[-1]["ci"])],
     ["<b>notes</b>", md(trunc(deploys[-1]["notes"], 220))]]
    + ([["<b>decisions</b>", md(trunc(deploys[-1]["decisions"], 220))]]
       if deploys[-1]["decisions"] not in ("—", "-", "") else []),
    note="Newest row of .kdbp/DEPLOYMENTS.md."
) if deploys else gap("Latest release", ".kdbp/DEPLOYMENTS.md")

release_index = table(
    ["#", "Date", "Branch → Target", "PR", "CI result", "Decisions"],
    [[f'<b>{E(d["id"])}</b>', E(d["date"][:10]), md(trunc(d["target"], 40)),
      md(d["pr"]), md(trunc(d["ci"], 40)),
      md(trunc(d["decisions"], 40))] for d in _recent],
    note=f"{len(deploys)} deployment(s) recorded · showing {len(_recent)} newest. "
         f"Decisions come from /gabe-push 7.5b note actions.")

# --------------------------------------------------------------------------- #
# Docs station — feature-docs accumulator + foundations
# --------------------------------------------------------------------------- #

_FOUNDATIONS = CFG.get("foundations", [
    "SCOPE", "DECISIONS", "RULES", "BEHAVIOR", "STRUCTURE",
    "PLAN", "PENDING", "DOCS", "ENTITIES", "ROADMAP"])
_found_rows = []
for _name in _FOUNDATIONS:
    _p = REPO_ROOT / ".kdbp" / f"{_name}.md"
    if not _p.exists():
        continue
    _found_rows.append([
        f"<b>{E(_name)}.md</b>", str(len(_p.read_text().splitlines())),
        E(sh("git", "log", "-1", "--format=%ad", "--date=short", "--",
             f".kdbp/{_name}.md") or "—")])
foundations = table(["Document", "Lines", "Last change"], _found_rows, num={1},
                    note="Source: .kdbp/ — the durable project memory.")

_cards = sorted((CENTER / "cards").glob("*.md")) if (CENTER / "cards").exists() else []
feature_docs = table(
    ["Card", "Entity", "Lines"],
    [[f"<b>{E(c.stem)}</b>", "—", str(len(c.read_text().splitlines()))] for c in _cards],
    num={2},
    note="Feature cards accumulate here as sections are adopted "
         "(/gabe-adopt section <entity>)."
) if _cards else gap("Feature docs", "docs/site/center/cards/*.md — 0 sections adopted")

_decisions = len(re.findall(r"^\| *D\d+",
                            (REPO_ROOT / ".kdbp" / "DECISIONS.md").read_text(), re.M)) \
    if (REPO_ROOT / ".kdbp" / "DECISIONS.md").exists() else 0
docs_kpis = '<div class="kpis">' + "".join([
    kpi("foundations", str(len(_found_rows)), ".kdbp documents"),
    kpi("decisions", str(_decisions), "DECISIONS.md rows"),
    kpi("feature cards", str(len(_cards)), f"{adopted}/{len(sections)} adopted",
        alert=not _cards),
    kpi("wells / runbooks",
        f'{len(list((REPO_ROOT / "docs" / "wells").glob("*.md")))} / '
        f'{len(list((REPO_ROOT / "docs" / "runbooks").glob("*.md")))}'),
]) + "</div>"

manual_angles = table(
    ["Subject", "Who", "When", "Result", "Evidence"],
    [[f'<b>{E(w.get("subject", "?"))}</b>', E(w.get("who", "?")),
      E(str(w.get("when", ""))[:10]), E(w.get("result", "?")),
      md(str(w.get("evidence") or "—"))] for w in reversed(walks)],
    note=f"{len(walks)} recorded walk(s) — the one verification input with no "
         f"machine source (.kdbp/walks.jsonl, append-only)."
) if walks else gap("Manual angles", ".kdbp/walks.jsonl")

# --------------------------------------------------------------------------- #
# Feature pages — one per entity that has a card, built FROM feature.html.
# The card is the authored translation; every count beside it is machine-read.
# --------------------------------------------------------------------------- #

# --------------------------------------------------------------------------- #
# Slot maps
# --------------------------------------------------------------------------- #

SHARED = {
    "{{LANG}}": _PROJECT.get("lang", "en"),
    "{{PROJECT_NAME}}": PROJECT_DISPLAY,
    "{{HEAD_SHA}}": HEAD_SHA,
    "{{REGEN_STAMP}}": STAMP,
    "{{GENERATOR_NAME}}": "build_center_a3.py",
    "{{ENTITY_COUNT}}": str(len(sections)),
    "{{TESTS_COUNT}}": f"{t_total:,}",
    "{{SIDEBAR_ENTITIES}}": sidebar_entities,
    # {{SIDEBAR_TESTS_SUB}} is retired — the Testing navsub (matrix · evidence ·
    # gates) is now STATIC in the skeletons (map v3), so it cannot drift.
    "{{SIDEBAR_CODE}}": _sidebar_code(),
    "{{SIDEBAR_LEAF}}": sidebar_leaf,
    # Repo-wide totals. On an ENTITY page these are overridden with that
    # entity's own line — a green "1,448 · 0 failed" beside KPIs reading 87/141
    # was read as this entity's verdict, which is the loudest kind of false
    # pass a page can make.
    "{{STATUS_PILLS}}": (
        f'<span class="statuspill {"warn" if t_failed else "ok"}">'
        f'repo · {t_total:,} tests · {t_failed} failed</span> '
        f'<span class="statuspill {"warn" if owed else "ok"}">'
        f'phase {plan["current_phase"]}</span>'),
    # NOT a freshness fact about the DATA: this is the generator's own
    # clock (STAMP above), identical on all 9 pages, and the default
    # `refresh_center.sh regen` path does not re-run any suite. The
    # skeletons label it "regen" for that reason — "synced" implied the
    # numbers had just been re-read, which regen alone never does.
    "{{SYNC_AGE}}": STAMP,
}

PER_FILE = {
    "index.html": {
        "{{HUB_TITLE}}": f"{PROJECT_DISPLAY} Command Center",
        "{{HUB_LEDE}}": (f"Verification-first view of {PROJECT_DISPLAY} — every number below "
                         "is read from PLAN.md, PENDING.md, LEDGER.md and junit at build "
                         "time. Sidebar entities are the approved adoption baseline."),
        "{{HUB_HEADLINE_STATS}}": hub_stats,
        "{{RECENT_CHANGES}}": recent_changes,
        "{{NEEDS_YOU}}": needs_you,
        "{{TAB_TESTS}}": tab_tests,
        "{{TAB_EVIDENCE}}": tab_evidence,
        "{{TAB_RISK}}": tab_risk,
    },
    "board.html": {
        "{{BOARD_TITLE}}": "Board",
        "{{BOARD_LEDE}}": ("Phase rail · review-debt · backlog — from PLAN.md cells and "
                           "PENDING.md rows, parsed never interpreted."),
        "{{BOARD_KPIS}}": board_kpis,
        "{{RAIL}}": rail,
        "{{REVIEW_DEBT_LANE}}": review_lane,
        "{{NONPHASE_LANE}}": nonphase_lane,
        "{{BACKLOG}}": backlog,
    },
    "entity-index.html": {
        "{{ENTITIES_TITLE}}": "Entity index",
        "{{ENTITIES_LEDE}}": (f"The approved adoption baseline — {len(sections)} entities, "
                              f"{adopted} adopted. Each section is built one per run via "
                              f"/gabe-adopt section, then walk-approved."),
        "{{ENTITIES_KPIS}}": entities_kpis,
        "{{ENTITY_GRID}}": entity_grid,
    },
    "docs.html": {
        "{{DOCS_TITLE}}": "Docs",
        "{{DOCS_LEDE}}": (f"Foundations ({len(_found_rows)} .kdbp documents) plus the "
                          f"feature-docs accumulator — cards land here one per adopted "
                          f"section."),
        "{{DOCS_KPIS}}": docs_kpis,
        "{{FEATURE_DOCS}}": feature_docs,
        "{{FOUNDATIONS}}": foundations,
    },
    "tests.html": {
        "{{TESTS_TITLE}}": "Testing",
        "{{TESTS_LEDE}}": (f"The whole test estate — {t_total:,} junit cases "
                           f"({_corpus_breakdown}), "
                           f"{t_failed} failed. Absent sources are named, not zeroed."),
        "{{TESTS_KPIS}}": tests_kpis,
        "{{BUCKETS}}": buckets,
        "{{MATRIX}}": matrix,
        "{{GATES}}": gates,
        "{{DEMO_SHELF}}": demo_shelf,
        "{{MANUAL_ANGLES}}": manual_angles,
        "{{VERIFICATION_CHANGELOG}}": verification_changelog,
    },
    "ledger.html": {
        "{{CHANGE_TITLE}}": f"Latest change · {HEAD_SHA}",
        "{{CHANGE_LEDE}}": (f"{md(trunc(_head_subject, 96))} — one page per change, from "
                            f"git, the PLAN cells it moved, and its LEDGER gates row."),
        "{{CHANGE_KPIS}}": change_kpis,
        "{{CHANGE_COMMITS}}": change_commits,
        "{{CHANGE_CELLS}}": change_cells,
        "{{CHANGE_VERIFY}}": change_verify,
    },
    "releases.html": {
        "{{RELEASES_TITLE}}": "Releases",
        "{{RELEASES_LEDE}}": (f"Stakeholder showcase — {len(deploys)} deployment(s) recorded "
                              f"in .kdbp/DEPLOYMENTS.md, newest first."),
        "{{RELEASES_KPIS}}": releases_kpis,
        "{{LATEST_RELEASE}}": latest_release,
        "{{RELEASE_INDEX}}": release_index,
    },
}


def render_architecture(amap: dict) -> str:
    """The app-wide Architecture STATION, rendered FROM archmap.json (the
    read-once map: the whole application parsed once per build into a committed
    file, so a PR diff of it IS the architecture change). Every row here is a
    consumer of the map — this station never re-reads the codebase. Fills its
    OWN shell skeleton (shell/architecture.html — {{ARCH_KPIS}}/{{ARCH_BODY}})
    like every other station.  SIDEBAR_CODE lights and marks itself current."""
    ents = amap.get("entities", {})
    mapped = {k: v for k, v in ents.items() if v}

    def _chip(slug: str) -> str:
        return (f'<a class="dlink" href="{_entity_href(slug)}">'
                f'{E(LABELS.get(slug, slug))}</a>')

    ep_rows = []
    for slug, v in mapped.items():
        for e in v.get("endpoints", []):
            ep_rows.append([
                f'<span class="tag {_VERB_CLS.get(e["method"], "m-mut")}">'
                f'{E(e["method"])}</span>',
                f'<code>{E(e["path"])}</code>', f'<code>{E(e["fn"])}()</code>',
                f'<code>{E(e["file"].rsplit("/", 1)[-1])}</code>', _chip(slug)])
    ep_rows.sort(key=lambda r: r[1])

    md_rows, md_exp = [], []
    for slug, v in mapped.items():
        for m in v.get("models", []):
            cols = m.get("cols", [])
            md_rows.append([
                f'<b>{E(m["cls"])}</b>', f'<code>{E(m["table"])}</code>',
                f'<code>{E(m["file"].rsplit("/", 1)[-1])}</code>',
                str(len(cols)), _chip(slug)])
            md_exp.append((
                f'The {len(cols)} column(s) of <code>{E(m["cls"])}</code>',
                '<p class="sub">' + ", ".join(
                    f"{E(c[0])}: <code>{E(str(c[1]))}</code>" for c in cols)
                + "</p>"))

    seen: dict[str, dict] = {}
    for slug, v in mapped.items():
        for layer, path, lines in v.get("files", []):
            rec = seen.setdefault(path, {"layer": layer, "lines": lines,
                                         "ents": set()})
            rec["ents"].add(slug)
    file_rows = [
        [f'<span class="tag l-{E(info["layer"])}">{E(info["layer"])}</span>',
         f"<code>{E(path)}</code>", str(info["lines"]),
         " ".join(_chip(s) for s in sorted(info["ents"]))]
        for path, info in sorted(seen.items(), key=lambda x: -x[1]["lines"])]

    n_ep = sum(len(v.get("endpoints", [])) for v in mapped.values())
    n_md = sum(len(v.get("models", [])) for v in mapped.values())
    n_sc = sum(len(v.get("schemas", [])) for v in mapped.values())
    loc = sum(i["lines"] for i in seen.values())
    kpis = '<div class="kpis">' + "".join([
        kpi("entities mapped", str(len(mapped)), f"of {len(ents)} registered",
            alert=(len(mapped) < len(ents))),
        kpi("endpoints", str(n_ep)), kpi("models", str(n_md)),
        kpi("schemas", str(n_sc)),
        kpi("files", str(len(seen)), f"{loc:,} lines read"),
    ]) + "</div>"

    body = (
        sechead("Code", "Endpoints", "#4f46e5", _IC_CODE,
                sub="every HTTP entry point the map found, across all mapped "
                    "entities", id_="sec-arch-endpoints", sec_id="architecture.endpoints",
                info='<div class="leg">Parsed from FastAPI decorators + '
                     "docstrings (ast) into archmap.json — this table renders the "
                     "map, never the source. Click an entity to open its "
                     "feature page.</div>")
        + table(["Method", "Path", "Handler", "File", "Entity"], ep_rows, num={},
                note=f"{len(ep_rows)} endpoint(s) across {len(mapped)} mapped "
                     f"entity(ies).")
        + sechead("Code", "Data model", "#7c3aed", _IC_DB,
                  sub="ORM tables the map found — open a row for its columns",
                  id_="sec-arch-models", sec_id="architecture.models",
                  info='<div class="leg">SQLAlchemy Mapped columns, parsed by '
                       "ast. Column types are as declared in the model.</div>")
        + table(["Model", "Table", "File", "Columns", "Entity"], md_rows,
                num={3}, expand=md_exp,
                note=f"{len(md_rows)} model(s).")
        + sechead("Code", "Files & code map", "#0f766e", _IC_FILES,
                  sub="the source files the map touched, largest first",
                  id_="sec-arch-files", sec_id="architecture.files",
                  info='<div class="leg">Line counts are measured off disk. A '
                       "file claimed by more than one entity lists each — the map "
                       "is a view over the code, not a partition of it.</div>")
        + table(["Layer", "File", "Lines", "Entity"], file_rows, num={2},
                note=f"{len(seen)} file(s) · {loc:,} lines. A file over the 800 "
                     f"budget is a split candidate."))

    base = strip_slot_doc_comments((SHELL_SRC / "architecture.html").read_text())
    fills = {**SHARED, "{{SIDEBAR_CODE}}": _sidebar_code(current=True),
             "{{ARCH_KPIS}}": kpis, "{{ARCH_BODY}}": body}
    for tok, val in fills.items():
        base = base.replace(tok, val)
    return base


def main() -> int:
    if not SHELL_SRC.exists():
        print(f"⛔ shell templates missing: {SHELL_SRC}")
        return 2
    # GABE_CENTER_OUT is a lab override — if it is set, SAY SO loudly, so a leaked
    # env var can never silently write the whole center to a scratch dir while
    # printing "regen OK" (its sibling GABE_SHELL_SRC already announces itself).
    if CENTER_OUT != CENTER:
        print(f"  ⚠ WRITE redirected to {CENTER_OUT} (GABE_CENTER_OUT set) — "
              f"reads still come from {CENTER}. LAB run: the real center was "
              f"NOT touched.")
    CENTER_OUT.mkdir(parents=True, exist_ok=True)
    (CENTER_OUT / "assets").mkdir(exist_ok=True)
    for asset in (SHELL_SRC / "assets").iterdir():
        (CENTER_OUT / "assets" / asset.name).write_bytes(asset.read_bytes())

    wrote = []
    for src in sorted(SHELL_SRC.glob("*.html")):
        # architecture.html is owned by render_architecture below — the generic
        # pass would ship it slot-empty (or at all when build_architecture off).
        if src.name == "architecture.html":
            continue
        text = strip_slot_doc_comments(src.read_text())
        for tok, val in SHARED.items():
            text = text.replace(tok, val)
        for tok, val in PER_FILE.get(src.name, {}).items():
            text = text.replace(tok, val)
        (CENTER_OUT / src.name).write_text(text)
        wrote.append((src.name, text.count("{{")))

    ctx = SimpleNamespace(
        center=CENTER, center_out=CENTER_OUT, shell_src=SHELL_SRC,
        repo_root=REPO_ROOT, sections=sections, labels=LABELS,
        junit_by=junit_by, corpora=CORPORA, e2e=E2E, proof_root=proof_root,
        cfg=CFG, walks=walks, shared=SHARED, parse_card=D.parse_card,
        maturity=MATURITY, flow_coverage={},
    )
    for name in build_feature_pages(ctx):
        wrote.append((name, 0))

    # The committed architecture map — machine-derived (ast), regenerated every
    # build, diffable in PRs. Consumers read THIS instead of re-analyzing code.
    # `coverage` carries each carded entity's flow-coverage verdict so agents
    # read the machine numbers here instead of scraping the Evidence tab.
    amap = {"version": 1, "head": HEAD_SHA, "generated": STAMP,
            "coverage": ctx.flow_coverage,
            "entities": {s: collect_entity_map(s, REPO_ROOT) for s in ENTITY_CODE}}
    (CENTER_OUT / "archmap.json").write_text(
        json.dumps(amap, indent=1, ensure_ascii=False) + "\n")
    n_eps = sum(len(v["endpoints"]) for v in amap["entities"].values() if v)
    n_models = sum(len(v["models"]) for v in amap["entities"].values() if v)
    print(f"    wrote docs/site/center/archmap.json — {len(amap['entities'])} "
          f"entity(ies) · {n_eps} endpoints · {n_models} models")

    # The app-wide Architecture station — a consumer of the read-once map, not a
    # second read of the code. Lights up {{SIDEBAR_CODE}} across the estate.
    if BUILD_ARCHITECTURE:
        arch_html = render_architecture(amap)
        (CENTER_OUT / "architecture.html").write_text(arch_html)
        wrote.append(("architecture.html", arch_html.count("{{")))

    print(f"  A3 regen @ {STAMP} · HEAD {HEAD_SHA}")
    print(f"  {SHELL_NOTE}")
    for name, left in wrote:
        state = "filled" if left == 0 else f"{left} slot(s) awaiting generator"
        print(f"    wrote docs/site/center/{name} — {state}")

    # Asset↔markup guard. The pages emit expandable-row tables (.xtbl/.xrow) for
    # the data model, the test matrix, Claimed coverage and the proof shelf. If
    # the a3.css that was COPIED lacks the .xtbl rule, every one of those renders
    # as unstyled stacked cells — the exact "regenerated with the new generators
    # over a stale a3.css" failure. Refuse to report success, don't ship it quiet.
    _css = CENTER_OUT / "assets" / "a3.css"
    _css_text = _css.read_text() if _css.exists() else ""
    if ".xtbl" not in _css_text:
        print("  ⛔ assets/a3.css has NO .xtbl rule — the expandable tables (data "
              "model · matrix · claims · proof shelf) will render UNSTYLED. Fold "
              "proposed-a3css-additions.css into a3.css (at the END, after the "
              "base rules) before regenerating. Refusing to report success.")
        return 3
    if not (CENTER_OUT / "assets" / "rowclick.js").exists():
        print("  ⚠ assets/rowclick.js is missing — row-click-to-expand and the "
              "targeted-row (#dm-…) opener degrade; wire it into the skeletons.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
