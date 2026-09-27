#!/usr/bin/env python3
"""A3 Evidence tab — the proof a person can look at and judge.

Split out of _a3_feature.py (size budget). Every fact here is read off disk:
the shots, videos and traces by walking the proof set RECURSIVELY (an earlier
top-level-only glob reported two full sets as empty gaps — a false gap is as
dishonest as a false pass), and the narration from each set's committed
`manifest.json` (feature · spec · proof_form · source_run · legs · narration).
Nothing on this tab is authored in the entity card.
"""

from __future__ import annotations

import datetime as _dt
import json
import os
import re
import subprocess
from pathlib import Path

import _center_data as _cd
import re as _re
from _a3_render import E, legend, md, pmore, sechead, subnav, table, trunc, xtable

_CENTER_REL = _cd._PATHS.get("center", "docs/site/center")
_PROOF_REL = _cd._PATHS.get("proof", "tests/web-e2e/proof")

_IC_CAM = ('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 '
           '2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>')
_IC_INBOX = ('<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>'
             '<path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 '
             '2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>')
_IC_FLOWMAP = ('<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>'
               '<path d="M6 9v6"/><circle cx="18" cy="12" r="3"/>'
               '<path d="M9 6h6a3 3 0 0 1 3 3"/>')

_SHOT_EXT = (".png", ".jpg", ".jpeg", ".webp")
_VIDEO_EXT = (".webm", ".mp4", ".mov")
_TRACE_EXT = (".zip",)
# Web pages resolve proof files relative to the center dir — the link gate
# probes these estate hrefs against the disk after every regen (the files were
# walked at build time, so a missing target is a broken href, not a view-time
# concern). Derived from the configured center/proof paths so a different
# layout stays correct (gastify's docs/site/center + tests/web-e2e/proof ->
# ../../../…).
_PREFIX = os.path.relpath(_PROOF_REL, _CENTER_REL).replace(os.sep, "/")


# A Storybook / design-lab REFERENCE is not evidence. It is what the screen was
# rebuilt to match — captured at development time, from the design source, not
# from a run of our own software. Fidelity sets keep both halves side by side
# (`ref/browse` beside `live/browse`), so the split is per FILE, not per set,
# and the held-out count is always stated — never silently dropped.
_REF_RX = re.compile(r"(^|[-/_])(ref|reference|storybook|mockup|design)([-/_.]|$)",
                     re.I)


def _is_reference(rel: Path, set_name: str = "") -> bool:
    """The SET NAME counts. `df2-trends-ref/` is six design captures whose
    marker is on the box, not the contents — matching only the path inside the
    set held out zero of them. The separator class is widened for the same
    reason: `05-reportviewer-reference.png` and `v2-ref-shot.png` carry the
    marker mid-token."""
    return bool(_REF_RX.search(f"{set_name}/{rel}".replace("\\", "/").lstrip("/")))


def _resolve_single(pdir: Path) -> Path | None:
    """A declared proof that is one FILE, not a directory of them. The tracker
    cites three of these (`01-scan-complete.png`, `04-statement-reconciled.png`,
    `03-insights-by-item.png`) — each sitting loose at the proof root."""
    if pdir.is_dir():
        return None
    for ext in _SHOT_EXT + _VIDEO_EXT:
        cand = pdir.with_suffix(ext)
        if cand.is_file():
            return cand
    return pdir if pdir.is_file() else None


# Public alias: the same rule decides whether a SPEC is a reference capture
# (`df2-trends-ref-capture.spec.ts` runs the design lab, not the product), so
# the rule lives in one place rather than being re-guessed per caller.
is_reference = _is_reference


# --------------------------------------------------------------------------- #
# Flow coverage — which proof sets are the MAIN workflow and which are edge
# cases, derived, never interviewed. The card's `# FLOWS` section is the flow
# registry (authored once, per entity); each set is classified from its own
# manifest: explicit `role:` / `flows:` fields win, otherwise the role is
# INFERRED from the set's identity text and labeled as inferred, and a set the
# build cannot read renders UNCLASSIFIED — a clarification action item, never a
# silent guess. A card flow no classified set covers is UNPROVEN — a placeholder
# row and an action item ("the golden path has no proof" is a finding, not a
# blank). A reference set never covers a flow: what the screen was built to
# match is not proof of the workflow.
# --------------------------------------------------------------------------- #

_ROLE_TAG = {
    "principal": ("s-ok", "the main workflow"),
    "edge": ("s-med", "guards · degraded · destructive paths"),
    # violet, NOT the teal l-services — beside the green principal badge the two
    # read as the same colour, and reference is the one role that is NOT proof.
    "reference": ("l-models", "design-lab fidelity — not workflow proof"),
    "supporting": ("l-schemas", "context around the main flows"),
}
# Role signals are read from the set's IDENTITY (name · feature · proof_form),
# never from legs/story — one degrade leg must not flip a journey set to edge.
_EDGE_SIG_RX = re.compile(
    r"guard|destruct|degrade|dirty|denied|invalid|reject|fallback|edge", re.I)
_REF_SIG_RX = re.compile(r"fidelity|reference\s*⟷\s*live|reference.live", re.I)
_JOURNEY_SIG_RX = re.compile(r"journey|recorded", re.I)
_FLOW_STOP = frozenset(
    "the and with into that this from for its are post get put delete patch "
    "http mode same one works even inside past whole any clears".split())


def parse_flows(lines: list[str]) -> tuple[list[tuple[str, str, bool]], list[str]]:
    """Card `# FLOWS` grammar: `- <key> [★] → <description>` — the key is the
    flow's one-word name (scan, manual, browse…), the description its path. A
    `★` (or `(golden)`) after the key marks the flow as part of THIS feature's
    GOLDEN PATH — the authored judgment of which flows are the main journey, so
    the build can rank an unproven golden flow above an ordinary gap.

    Returns (flows, malformed). A line that does not parse — multi-word key,
    missing `→` — rides the MALFORMED bucket instead of vanishing: a silently
    shrunken denominator makes the coverage note lie about the card."""
    out: list[tuple[str, str, bool]] = []
    bad: list[str] = []
    for ln in lines or []:
        s = ln.strip().removeprefix("- ")
        if not s:
            continue
        key, sep, desc = s.partition("→")
        golden = "★" in key or bool(re.search(r"\(golden\)", key, re.I))
        key = re.sub(r"★|\(golden\)", "", key, flags=re.I)
        key = key.strip().strip("`").lower()
        if sep and key and " " not in key:
            out.append((key, desc.strip(), golden))
        else:
            bad.append(ln.strip())
    return out, bad


def _flow_tokens(desc: str) -> set[str]:
    return {w for w in re.findall(r"[a-zA-Z]{4,}", desc.lower())
            if w not in _FLOW_STOP}


def _classify(s: dict, flows: list[tuple[str, str]]) -> dict:
    """One set's role + matched flows. Explicit manifest fields win; inference
    is labeled; no manifest / no signal → unclassified (role "", with a reason).

    A MALFORMED explicit signal — a `role:` outside the role set, a `flows:`
    that is not a list, a `flows:` entry naming a key the card does not have —
    also lands on unclassified WITH ITS REASON. Guessing over a broken
    declaration is how a typo'd reference set becomes golden coverage."""
    man = s["man"]
    # Inference reads the set's IDENTITY ONLY (name · feature · proof_form) —
    # never the narration story or leg names (suite ruling 2026-07-23,
    # evolution handoff §9): both observed false positives (ca0's five
    # phantom flows, scan-receipt's boleta/review) arrived through story
    # text. Narration DESCRIBES; it must not classify.
    identity = " ".join(str(man.get(k, "")) for k in ("feature", "proof_form"))
    identity = f'{s["name"]} {identity}'.lower()

    known = {k for k, _, _g in flows}

    def _bad(reason: str) -> dict:
        return {"role": "", "inferred": False, "flows": [], "golden": False,
                "explicit_match": False, "reason": reason}

    _role_raw = man.get("role")
    if _role_raw is not None and (not isinstance(_role_raw, str)
                                  or _role_raw not in _ROLE_TAG):
        return _bad(f"manifest `role:` {_role_raw!r} is not one of "
                    "principal|edge|reference|supporting")
    _fl = man.get("flows")
    if _fl is not None and not isinstance(_fl, list):
        return _bad("manifest `flows:` must be a LIST of flow keys")
    explicit_flows = [f.lower() for f in _fl
                      if isinstance(f, str)] if isinstance(_fl, list) else []
    unknown = [f for f in explicit_flows if f not in known]
    if unknown:
        return _bad("manifest `flows:` names key(s) the card's # FLOWS does "
                    "not have: " + " · ".join(unknown[:4]))

    if isinstance(_fl, list):
        # An explicit list wins OUTRIGHT — including the empty list, which is
        # the only way a supporting/context set can declare "covers nothing":
        # treating [] as absent re-opens the inference door its author closed
        # (ca0's story text inferred five flows before this held).
        matched = [k for k, _, _g in flows if k in explicit_flows]
    else:
        matched = []
        for key, desc, _g in flows:
            if re.search(rf"(?<![a-z]){re.escape(key)}(?![a-z])", identity):
                matched.append(key)
            elif len([t for t in _flow_tokens(desc) if t in identity]) >= 2:
                matched.append(key)
    golden = bool(set(matched) & {k for k, _, g in flows if g})

    def _out(role: str, inferred: bool, m: list[str], reason: str = "") -> dict:
        return {"role": role, "inferred": inferred, "flows": m,
                "golden": golden and bool(m),
                "explicit_match": bool(explicit_flows) and bool(m),
                "reason": reason}

    explicit_role = _role_raw if isinstance(_role_raw, str) else ""
    if explicit_role in _ROLE_TAG:
        return _out(explicit_role, False, matched)
    if not man:
        return _out("", False, matched, "no manifest")
    if _REF_SIG_RX.search(identity) and not _JOURNEY_SIG_RX.search(identity):
        return _out("reference", True, matched)
    if _EDGE_SIG_RX.search(identity):
        return _out("edge", True, matched)
    if matched:
        return _out("principal", True, matched)
    return _out("", False, [], "no role signal in the set's identity")


def collect_coverage(names: list[str], proof_root: Path,
                     flows: list[tuple[str, str]],
                     malformed: list[str] = ()) -> dict:
    """All of an entity's proof sets, classified, plus the coverage verdicts:
    which card flows are UNPROVEN, which sets are UNCLEAR (name, reason), which
    covered flows rest on INFERENCE alone, and the card's malformed FLOWS
    lines. The single source the Evidence tab, the placeholders, and the
    action moves read."""
    sets = [collect_set(n, proof_root / n) for n in names]
    for s in sets:
        s["cls"] = _classify(s, flows)
    covered: set[str] = set()
    covered_explicit: set[str] = set()
    for s in sets:
        if s["cls"]["role"] in ("principal", "edge", "supporting"):
            covered.update(s["cls"]["flows"])
            if s["cls"]["explicit_match"]:
                covered_explicit.update(s["cls"]["flows"])
    return {"sets": sets, "flows": flows, "malformed": list(malformed),
            "covered_inferred": sorted(covered - covered_explicit),
            "unproven": [(k, d, g) for k, d, g in flows if k not in covered],
            "unclear": [(s["name"], s["cls"].get("reason", ""))
                        for s in sets if not s["cls"]["role"]]}


def _role_cell(cls: dict) -> str:
    if not cls["role"]:
        why = cls.get("reason") or "clarify"
        return ('<span class="tag s-gap">unclassified</span>'
                f'<br><small>{E(trunc(why, 64))} — see Pending above</small>')
    tag, _ = _ROLE_TAG[cls["role"]]
    # ★ only on roles that COUNT as coverage — a reference set touching a golden
    # flow is still not proof of it, so it never wears the star.
    star = (" ★" if cls.get("golden")
            and cls["role"] in ("principal", "edge", "supporting") else "")
    small = []
    if star:
        small.append("golden path")
    if cls["inferred"]:
        small.append("inferred")
    if cls["flows"]:
        small.append("flow: " + " · ".join(cls["flows"][:3]))
    return (f'<span class="tag {tag}">{E(cls["role"])}{star}</span>'
            + (f'<br><small>{E(" — ".join(small))}</small>' if small else ""))


_GIT_TIMEOUT = 30
_TOPS: dict[str, str | None] = {}


def _git(cwd: Path, *args: str) -> str | None:
    """One git READ (stdout), without optional locks (never an index.lock in a tree a build only reads); None when git
    is missing, the directory is no work tree, the call fails or times out."""
    try:
        r = subprocess.run(["git", *args], cwd=str(cwd), capture_output=True, text=True, timeout=_GIT_TIMEOUT,
                           env={**os.environ, "GIT_OPTIONAL_LOCKS": "0"})
    except (OSError, subprocess.SubprocessError):
        return None
    return r.stdout if r.returncode == 0 else None


def captured_at(files: list[Path]) -> tuple[float, bool]:
    """When a proof set was captured → ``(instant, committed)``: the newest COMMIT time of its tracked files (``git log -1
    --format=%ct``) — a commit's date, so a clone made any day reads the same instant — and ``committed`` True; a file
    git does not track (or a tree with no git) counts by its modification time, and when such a file is the newest the
    instant is that file's time and ``committed`` False (the page says so). ``(0.0, False)`` for no files. The file time
    is the checkout's or the copy's, never the capture's, which is why it is only the fallback (D-061 review B-2)."""
    if not files:
        return 0.0, False
    d = files[0].parent
    key = str(d)
    if key not in _TOPS:
        top = _git(d, "rev-parse", "--show-toplevel")
        _TOPS[key] = top.strip() if top and top.strip() else None
    top = _TOPS[key]
    rel: dict[str, Path] = {}
    if top:
        root = Path(top).resolve()
        for f in files:
            try:
                rel[f.resolve().relative_to(root).as_posix()] = f
            except ValueError:
                pass
    tracked: set[str] = set()
    if rel:
        out = _git(Path(top), "ls-files", "-z", "--", *sorted(rel))
        tracked = {x for x in (out or "").split("\0") if x in rel}
    ct = 0.0
    if tracked:
        out = _git(Path(top), "log", "-1", "--format=%ct", "--", *sorted(tracked))
        ct = float(out.strip()) if out and out.strip().isdigit() else 0.0
    counted = {id(rel[t]) for t in tracked} if ct else set()      # a tracked file is counted by its commit
    mt = max((f.stat().st_mtime for f in files if id(f) not in counted), default=0.0)
    return (ct, True) if ct and ct >= mt else (mt, False)


def _captured(ts: float, committed: bool = True) -> str:
    """When a set was captured (``captured_at``): an INSTANT (``data-day="@<epoch seconds>"``), and the page's own script
    (assets/a3-days.js) takes the VIEWER's calendar day of it and counts the days to the viewer's today when the page
    is opened (D-061) — a capture at 22:30 in UTC−3 is that evening's, never the next UTC day's. The static text is the
    UTC date (what a page without the script shows, said as UTC). The build writes no wallclock-relative word, so an
    unchanged shelf renders the same bytes on any day; a capture counted by a file's time says so."""
    day = _dt.datetime.fromtimestamp(ts, _dt.timezone.utc).date().isoformat()
    loose = "" if committed else " (the file's time — not committed)"
    return (f'<span class="a3-day" data-day="@{int(ts)}" data-day-text="{{d}}" data-day-title="captured {{date}}{loose} · {{d}}" '
            f'title="captured {day} UTC{loose}">{day}</span>')


def collect_set(name: str, pdir: Path) -> dict:
    """One proof set, read off disk. Files are walked recursively and split by
    kind; the manifest supplies the narration, never the counts."""
    man: dict = {}
    mpath = pdir / "manifest.json"
    if mpath.exists():
        try:
            man = json.loads(mpath.read_text())
        except json.JSONDecodeError:
            man = {}
    # A structurally-valid JSON whose ROOT is not an object (a list, a string)
    # would make every `man.get(...)` below throw and abort the WHOLE center
    # build for one bad file. One entity's manifest degrades one entity's tab.
    if not isinstance(man, dict):
        man = {}
    shots: list[Path] = []
    videos: list[Path] = []
    traces: list[Path] = []
    refs: list[Path] = []
    # A declared proof resolves to a DIRECTORY or a single FILE. Gating on
    # is_dir() made three entities' only cited artifact read "absent — no
    # directory" while it sat on disk: a false gap, in the section written to
    # outlaw false gaps.
    single = _resolve_single(pdir)
    if single is not None:
        pdir, walk = single.parent, [single]
    elif pdir.is_dir():
        walk = sorted(pdir.rglob("*"))
    else:
        walk = []
    if True:
        for f in walk:
            if not f.is_file():
                continue
            ext = f.suffix.lower()
            if ext in _TRACE_EXT:
                traces.append(f)
                continue
            if ext not in _SHOT_EXT and ext not in _VIDEO_EXT:
                continue
            if _is_reference(f.relative_to(pdir), name):
                refs.append(f)
            elif ext in _SHOT_EXT:
                shots.append(f)
            else:
                videos.append(f)

    # The manifest's artifact list is an authored READING ORDER; files it does
    # not name still appear (never hide evidence), just after the named ones.
    _arts = man.get("artifacts", [])
    order = {n: i for i, n in enumerate(_arts if isinstance(_arts, list) else [])}
    # Reading order: what the manifest named, then the stills, then the
    # recordings — a walk is read as frames before it is watched.
    media = shots + videos
    _still = set(shots)
    kind = {p: (0 if p in _still else 1) for p in media}
    media.sort(key=lambda p: (order.get(p.name, 10_000), kind[p],
                              str(p.relative_to(pdir)).lower()))

    # Legs map a leg name to relative-path PREFIXES — they match both a file
    # stem convention ("ref-default.png") and a directory ("prod/cl/01.png").
    # legs / narration may be authored the wrong SHAPE (a list, a string) and
    # still parse as JSON — coerce each non-dict to {} so a hand-edited manifest
    # degrades to "no legs" instead of raising AttributeError mid-build.
    legs_def = man.get("legs", {})
    if not isinstance(legs_def, dict):
        legs_def = {}
    _narr = man.get("narration", {})
    if not isinstance(_narr, dict):
        _narr = {}
    notes = _narr.get("legs", {})
    if not isinstance(notes, dict):
        notes = {}
    buckets: dict[str, list[Path]] = {k: [] for k in legs_def}
    unassigned: list[Path] = []
    for p in media:
        rel = str(p.relative_to(pdir)).replace("\\", "/")
        hit = next((leg for leg, pres in legs_def.items()
                    if any(rel.startswith(pre) for pre in (pres or []))), None)
        # Fallback: a recording is usually named for the leg it records
        # (`local/videos/cl-supermarket.webm`), which no path prefix catches.
        # Exact stem match only — a looser rule would misfile shots.
        if hit is None:
            hit = next((leg for leg in legs_def if p.stem == leg), None)
        (buckets[hit] if hit else unassigned).append(p)
    # A leg note authored as a non-string (a list/dict) would reach E()/md()
    # downstream and raise — coerce it to "" at the source so every consumer
    # (the tile data-note, the leg heading) gets a str.
    _note = lambda leg: (n if isinstance(n := notes.get(leg, ""), str) else "")
    legs = [{"name": leg, "note": _note(leg), "files": files}
            for leg, files in buckets.items() if files]
    if unassigned:
        legs.append({"name": "unfiled", "files": unassigned,
                     "note": "on disk in this set but not claimed by any leg "
                             "in the manifest — shown, not hidden"})
    newest, committed = captured_at(media)
    return {"name": name, "dir": pdir,
            "exists": pdir.is_dir() or single is not None,
            "single": single is not None, "man": man,
            "shots": shots, "videos": videos, "traces": traces, "refs": refs,
            "legs": legs, "newest": newest, "committed": committed}


def _labels(files: list[Path], pdir: Path) -> list[str]:
    """Tile captions inside one leg. A stem alone collides when the same walk
    was recorded twice (`local/videos/x.webm` and `prod/videos/x.webm`) — only
    the colliding ones get their folder back, so the common case stays short.

    The prefix is the file's directory RELATIVE TO THE SET, which is the only
    part that actually differs between the twins. An earlier version used
    `parent.parent.name`, which handed both twins the same prefix (the set's
    own name) — leaving the collision it exists to resolve — and, for a file
    sitting at the set root, named a directory outside the set entirely."""
    stems = [f.stem.replace("-", " ").replace("_", " ") for f in files]
    dupes = {s for s in stems if stems.count(s) > 1}
    out = []
    for f, s in zip(files, stems):
        if s not in dupes:
            out.append(s)
            continue
        try:
            where = str(f.relative_to(pdir).parent).replace("\\", "/")
        except ValueError:                       # not under the set — show the path
            where = str(f.parent)
        out.append(f"{s}" if where in (".", "") else f"{where} · {s}")
    return out


def _tile(s: dict, leg: dict, f: Path, label: str, i: int, n: int) -> str:
    """One gallery tile. The anchor still points at the real file (it works
    with JS off and the link gate can probe it); the viewer intercepts the
    click and opens it in place instead of navigating away."""
    rel = str(f.relative_to(s["dir"])).replace("\\", "/")
    # A single-FILE set sits loose at the proof root — s["dir"] IS the root, so
    # prepending the set name here minted hrefs to a directory that does not
    # exist (…/proof/<set>/<set>.png). The set name is identity, not a path.
    href = (f'{_PREFIX}/{E(rel)}' if s["single"]
            else f'{_PREFIX}/{E(s["name"])}/{E(rel)}')
    is_video = f.suffix.lower() in _VIDEO_EXT
    title = s["man"].get("feature", s["name"])
    if not isinstance(title, str):        # feature authored as a list/dict
        title = s["name"]
    body = (f'<span class="ph vid">▶ {E(f.suffix.lstrip("."))}</span>' if is_video
            else f'<img src="{href}" loading="lazy" style="width:100%;'
                 f'aspect-ratio:4/3;object-fit:cover;display:block">')
    noun = "recording" if is_video else "screenshot"
    return (f'<a class="shot" href="{href}" data-lb="1" data-kind='
            f'"{"video" if is_video else "image"}" data-set="{E(title)}" '
            f'data-leg="{E(leg["name"])}" data-note="{E(leg["note"])}" '
            f'data-shot="{E(rel)}" data-setname="{E(s["name"])}" '
            f'data-i="{i}" data-n="{n}" '
            f'data-noun="{noun}{"" if n == 1 else "s"}">{body}'
            f'<div class="cap"><b>{E(leg["name"])}</b>'
            f'<span class="ix">{i} of {n}</span>'
            # Stated exception to "every truncation carries its expander": a
            # thumbnail caption is an identifier, not a sentence, and the full
            # path is one click away in the viewer's own caption.
            f"<span>{E(trunc(label, 44))}</span></div></a>")


def _set_detail(s: dict, story: str = "") -> str:
    """What opens under a proof-set row: the full story (its summary cell is
    truncated PLAIN — see build_evidence_tab), the run it came from, then one
    collapsible leg per journey. The whole block is ONE viewer group, so
    arrowing runs across the entire set and not just the leg on screen."""
    man = s["man"]
    out = ""
    if story:
        out += f'<p class="sub"><b>What this set shows:</b> {md(story)}</p>'
    _pf = man.get("proof_form")
    if isinstance(_pf, str) and _pf:
        out += f'<p class="sub">{md(_pf)}</p>'
    if s["refs"]:
        out += (f'<p class="sub"><b>{len(s["refs"])} reference artifact(s) held '
                f"out.</b> Storybook / design-lab captures live in this "
                f"directory for fidelity comparison; they are what the screen "
                f"was built to match, not a run of our software, so they are "
                f"not counted or shown as proof.</p>")
    for leg in s["legs"]:
        labels = _labels(leg["files"], s["dir"])
        n = len(leg["files"])
        note = f' — {md(leg["note"])}' if leg["note"] else ""
        out += (f'<details class="legset" data-sub="1" open><summary><b>{E(leg["name"])}</b>'
                f'<span class="count">{n}</span>{note}</summary>'
                '<div class="gal">'
                + "".join(_tile(s, leg, f, lab, i, n)
                          for i, (f, lab) in enumerate(zip(leg["files"], labels), 1))
                + "</div></details>")
    if s["traces"]:
        names = ", ".join(sorted(t.name for t in s["traces"]))
        out += (f'<p class="sub">{len(s["traces"])} playwright trace(s) kept for '
                f"forensics — not viewable here, opened with "
                f"<code>npx playwright show-trace</code>: {E(names)}"
                "</p>")
    return out


# --------------------------------------------------------------------------- #
# The workflow navigator — census-driven. The census
# (docs/site/center/workflows/<slug>.json) is an ACCUMULATOR (see
# templates/center/workflows/README.md): steps change status but never vanish.
# The page INLINES its data — center pages open over file://, where fetch() is
# blocked (shell README, wiring trap 2) — and an absent census renders a NAMED
# absence: never silence, never a fake empty tree (report-never-gate; the
# /gabe-pulse S8 angle nags the debt).
# --------------------------------------------------------------------------- #


def _census_gap(rel: str, title: str, detail: str) -> str:
    """The one-line honest absence state for the Evidence tab. `detail` is
    trusted HTML (it carries the <code>command</code> that clears the debt)."""
    return (f'<div class="callout"><h3>Workflows — {E(title)}</h3>'
            f'<div class="items"><span>Source: <b>{E(rel)}</b> — {detail} '
            "Named gap, never a staged tree.</span></div></div>")


_CENSUS_MEMO: dict[str, dict] = {}


def census_scan(slug: str, center_dir: Path) -> dict:
    """One entity's census, read and disk-probed ONCE per build — memoized on
    the census path, because TWO surfaces consume the same facts: the
    navigator (workflow_nav_section) RENDERS each gap in place, and the action
    ledger (_a3_feature.angle_rows) PRICES it as a pending row. Rendering an
    absence and pricing it are two halves of one honesty, and neither half may
    re-probe the shots the other already probed.

    Returns {"status": "absent" | "unreadable" | "ok", "rel": <center-relative
    census path>}; when unreadable, plus "err" (the exception class name);
    when ok, plus the raw "states" / "workflows" / "start", the "inlined"
    states (the honesty pass applied: a shot missing under the center dir is
    held out, a "running" step with no surviving capture demotes to
    "unpowered" ON THE PAGE while the census file keeps its claim — the
    accumulator law; check_workflow_drift.py prices the stale claim), and the
    gap classes in census order: "ghost" (named, no proof), "unpowered"
    (asserted, never photographed, as authored) and "demoted" (claimed
    running, capture missing on disk at build)."""
    census_path = center_dir / "workflows" / f"{slug}.json"
    key = str(census_path)
    hit = _CENSUS_MEMO.get(key)
    if hit is not None:
        return hit
    out = _census_scan_once(slug, center_dir, census_path)
    _CENSUS_MEMO[key] = out
    return out


def _census_scan_once(slug: str, center_dir: Path, census_path: Path) -> dict:
    rel = f"workflows/{slug}.json"
    if not census_path.exists():
        return {"status": "absent", "rel": rel}
    try:
        census = json.loads(census_path.read_text())
        states = census["states"]
        workflows = census["workflows"]
        if (not isinstance(states, dict) or not isinstance(workflows, dict)
                or not workflows):
            raise ValueError("states/workflows must be non-empty objects")
        start = census.get("start") or next(iter(workflows))
    except Exception as err:                       # noqa: BLE001
        print(f"    ⚠ feature-{slug}.html workflow census unreadable — "
              f"section degraded to a named gap: {type(err).__name__}: {err}")
        return {"status": "unreadable", "rel": rel, "err": type(err).__name__}

    inlined: dict = {}
    ghost: list[str] = []
    unpowered: list[str] = []
    demoted: list[str] = []
    for sid, raw in states.items():
        s = dict(raw) if isinstance(raw, dict) else raw
        if isinstance(s, dict) and not s.get("grp"):
            shots = [u for u in (s.get("shot") or []) if isinstance(u, str)]
            live = [u for u in shots if (center_dir / u).exists()]
            for u in shots:
                if u not in live:
                    print(f"    ⚠ feature-{slug}.html workflow '{sid}': "
                          f"capture missing on disk, held out of the page: {u}")
            if live != shots:
                if live:
                    s["shot"] = live
                else:
                    s.pop("shot", None)
            if s.get("st") == "running" and not live:
                s["st"] = "unpowered"
                demoted.append(sid)
                print(f"    ⚠ feature-{slug}.html workflow '{sid}': demoted "
                      f"running→unpowered on the page — no capture on disk; "
                      f"the census keeps the claim for the drift checker")
            elif s.get("st") == "unpowered":
                unpowered.append(sid)
            elif s.get("st") == "ghost":
                ghost.append(sid)
        inlined[sid] = s
    return {"status": "ok", "rel": rel, "states": states,
            "workflows": workflows, "start": start, "inlined": inlined,
            "ghost": ghost, "unpowered": unpowered, "demoted": demoted}


def workflow_nav_section(slug: str, center_dir: Path) -> tuple[str, bool]:
    """The Evidence tab's FIRST section — the evidence navigator (workflow
    bracket-tree map left, the selected step's capture + provenance right),
    mounted from the entity's census at <center>/workflows/<slug>.json.

    Census present → the exemplar's rendered shape exactly (see
    shell/example/feature-transaction.html): the sechead legend naming the
    three proof states + ✎, the `#ev-nav-root` div, then ONE inline <script>
    holding the data and the `EvidenceNav.mount()` call — inlined, never
    fetched, and parsing AFTER the root div. The census is inlined verbatim
    minus one build-time honesty pass: a `shot` path that does not resolve
    under the center dir is HELD OUT of the inlined copy (never a broken
    <img> — evidence-nav.js renders any `shot` entry it is given), and a
    "running" step left with no surviving capture demotes to "unpowered" on
    the page — the assertion claim stands, the capture claim does not. The
    census file keeps the stale claim ON PURPOSE (accumulator law), so
    check_workflow_drift.py still prices it as capture-debt.

    No census → the one-line named absence (the debt + the command that clears
    it). A malformed census degrades to the same shape with its reason — one
    entity's section, never a dead build. Every fact here comes from
    census_scan() — the ONE read + probe per entity per build; the action rows
    that price these same gaps (_a3_feature.angle_rows) read the same scan.
    Returns (html, census_exists)."""
    scan = census_scan(slug, center_dir)
    rel = scan["rel"]
    if scan["status"] == "absent":
        return (_census_gap(
            rel, "census not captured",
            "absent. The workflow census is CAPTURE DEBT: author it with "
            "<code>/gabe-cc-update</code> (the <code>/gabe-pulse</code> S8 "
            "nag counts it)."), False)
    if scan["status"] == "unreadable":
        return (_census_gap(
            rel, "census unreadable",
            f'present but unreadable ({E(scan["err"])}). Correct it '
            "with <code>/gabe-cc-update</code>."), False)
    inlined, workflows, start = scan["inlined"], scan["workflows"], scan["start"]

    def _js(obj) -> str:
        # A literal </ inside a JSON string would close the inline script
        # mid-data; <\/ is the same string to the JS parser.
        return json.dumps(obj, ensure_ascii=False,
                          separators=(",", ":")).replace("</", "<\\/")

    head = sechead(
        "Evidence", "Workflows", "#6b46c1", _IC_FLOWMAP,
        sub="the steps this census has captured, and what proves each — pick a "
            "workflow, click a node, read its capture",
        id_="sec-ev-flows", open_=True,
        info='<div class="leg">The map is the index; the screenshot is the '
             'evidence. Node colour is the PROOF state: '
             '<span class="tag s-ok">running</span> a capture and an assertion '
             'both exist &middot; <span class="tag s-warn">unpowered</span> '
             'asserted (api/unit/e2e) but never photographed &middot; '
             '<span class="tag s-gap">ghost</span> neither — a named absence, '
             'never a staged shot. <b>&#9998;</b> marks a step that WRITES '
             'data; its panel maps every field to the function that writes it '
             'and the model it lands in. Sections with real complexity are '
             'their own linked workflows (&#10696;), and a shared one returns '
             'to whichever parent you entered from.</div>')
    # The mount script sits AFTER the root div (same fragment, source order),
    # and evidence-nav.js is a NON-deferred head include in feature.html — the
    # global exists when this parses (shell README, wiring trap 1). Do not add
    # includes here and never add `defer` there.
    mount = (
        "<script>\n"
        "/* Evidence navigator DATA — INLINED, never fetched: center pages\n"
        "   open over file://, where fetch() is blocked (shell README). */\n"
        'EvidenceNav.mount(document.getElementById("ev-nav-root"),\n'
        f"  {{states: {_js(inlined)},\n"
        f"   workflows: {_js(workflows)},\n"
        f"   start: {_js(start)}}});\n"
        "</script>")
    return (head + '<div id="ev-nav-root"></div>' + mount, True)


def build_evidence_tab(cov: dict, label: str = "this entity",
                       repo=None, corpora: list | None = None,
                       has_workflows: bool = False) -> str:
    """The Evidence tab for one entity, rendered from collect_coverage(): a
    header table of its proof sets — each row carrying its ROLE (principal ·
    edge · reference · supporting, or unclassified) and opening onto its own
    galleries — followed by one PLACEHOLDER row per card flow no classified set
    covers. A declared set with nothing on disk keeps its row and reads as a
    named gap; an uncovered flow reads as an unproven one.

    `has_workflows` — the caller mounted the workflow navigator ahead of this
    tab (workflow_nav_section, census present): the pane's ONE subnav gains
    the Workflows link. The absence line gets no nav entry, and this section
    never emits a second nav bar (shell README, wiring trap 3)."""
    sets = cov["sets"]
    if not sets and not cov["unproven"]:
        return ""
    rows = []
    for s in sets:
        n_media = len(s["shots"]) + len(s["videos"])
        man = s["man"]
        # The verdict, not a repeat of the count beside it: whether this set
        # can be looked at, or is a declared-but-unbacked claim.
        if not s["exists"]:
            state = '<span class="tag s-gap">absent — no directory</span>'
        elif not n_media and s["refs"]:
            state = ('<span class="tag s-gap">reference only — not proof</span>')
        elif not n_media:
            state = '<span class="tag s-gap">empty — named gap</span>'
        elif not man:
            state = '<span class="tag s-med">no manifest</span>'
        else:
            state = f'<span class="tag s-ok">on disk · {len(s["legs"])} leg(s)</span>'
        # xtable SUMMARY cells must never contain a <details> (a <details> nested
        # in a <summary> is invalid HTML, and with JS off the inner ⊕ toggles the
        # OUTER row). Truncate PLAIN here; the row opens to the full story below.
        _narr = man.get("narration")
        _story = _narr.get("story", "") if isinstance(_narr, dict) else ""
        if not isinstance(_story, str):        # story authored as a list/dict
            _story = ""
        counts = " ".join(filter(None, [
            f'{len(s["shots"])} shot(s)' if s["shots"] else "",
            f'{len(s["videos"])} video(s)' if s["videos"] else "",
            f'{len(s["traces"])} trace(s)' if s["traces"] else ""])) or "—"
        captured = (f'{_captured(s["newest"], s.get("committed", True))}<br>'
                    f'<small>{E(trunc(str(man.get("source_run", "run not recorded")), 42))}</small>'
                    if s["newest"] else '<span class="sub">—</span>')
        # The story is NOT a column — it reads in full inside the opened row
        # (_set_detail), so the table stays scannable instead of repeating a
        # truncated copy of what the expansion already shows.
        cells = [
            f'<b>{E(s["name"])}</b><br>'
            f'<small>{E(trunc(str(man.get("feature", "no manifest")), 60))}</small>',
            _role_cell(s["cls"]), counts, captured, state]
        # Click the row to open the galleries in place (no separate button); a
        # set with nothing on disk stays a flat, un-expandable row. The
        # EVIDENCE SEAM leads the detail: the spec's C-ids (ledger rows on
        # this page) and what its files touch — or the named gap.
        _verify = ""
        if repo is not None and corpora and n_media:
            import _a3_ledger
            _verify = _a3_ledger.proof_verification_html(
                repo, man.get("spec"), corpora)
        _rid = "ev-" + _re.sub(r"[^A-Za-z0-9]+", "-", s["name"]).strip("-")
        rows.append((cells, (_verify + _set_detail(s, _story))
                     if n_media else "", _rid))

    # One placeholder per UNPROVEN card flow — the golden path with no proof is
    # a visible row and an action item, never a blank between the rows above.
    # The SAME flow also rides the Pending action table (angle_rows): the
    # placeholder marks WHERE the proof will live, the Pending row is the move
    # that fills it — the state cell links the two.
    for key, desc, golden in cov["unproven"]:
        star = " ★" if golden else ""
        gap_txt = ("<b>GOLDEN PATH</b> — no proof set" if golden
                   else "no proof set — placeholder")
        rows.append(([f'<span class="sub">flow</span> <b>{E(key)}{star}</b><br>'
                      f'<small>{E(trunc(desc, 90))}</small>',
                      '<span class="tag s-gap">unproven</span>',
                      "—", "—",
                      f'<span class="tag s-gap">{gap_txt}</span><br>'
                      f'<small><a class="dlink" href="#sec-ev-actions">'
                      f'the move → Pending ↑</a></small>'],
                     ""))

    n_sets = sum(1 for s in sets if s["shots"] or s["videos"])
    n_shots = sum(len(s["shots"]) for s in sets)
    n_vids = sum(len(s["videos"]) for s in sets)
    flows = cov["flows"]
    _gold_all = [k for k, _, g in flows if g]
    _gold_open = [k for k, _, g in cov["unproven"] if g]
    _cover_note = (f" · {len(flows) - len(cov['unproven'])}/{len(flows)} card "
                   f"flows covered ({len(cov['unproven'])} unproven)"
                   if flows else "")
    if _gold_all:
        _cover_note += (f" · golden path "
                        f"{len(_gold_all) - len(_gold_open)}/{len(_gold_all)}")
    # Inference counts toward coverage (settled design) but never silently: the
    # topline SAYS which part of the verdict rests on a guess awaiting `flows:`.
    _inf = cov.get("covered_inferred", [])
    if _inf:
        _cover_note += (f" · {len(_inf)} of them by inference — confirm with "
                        f"`flows:`")
    _bad = cov.get("malformed", [])
    if _bad:
        _cover_note += (f" · {len(_bad)} FLOWS line(s) did not parse "
                        f"(grammar `- key [★] → desc`)")
    _unclear_note = (f" · {len(cov['unclear'])} set(s) unclassified"
                     if cov["unclear"] else "")
    # `spec` authored as a list/dict is unhashable — guard the set membership on
    # str-ness so one mis-typed field cannot raise mid-tab.
    specs = sorted({s["man"]["spec"] for s in sets
                    if isinstance(s["man"].get("spec"), str) and s["man"]["spec"]})

    html = subnav(([("sec-ev-flows", "Workflows", _IC_FLOWMAP)]
                   if has_workflows else [])
                  + [("sec-ev-sets", "Proof sets", _IC_CAM),
                     ("sec-ev-gaps", "Not proven here", _IC_INBOX)])
    html += sechead(
        "Evidence", "Proof sets", "#0f766e", _IC_CAM,
        sub="what a person can look at and judge — captured by the e2e runs, "
            "never staged for the page",
        id_="sec-ev-sets", open_=True,   # carries the viewer's keyboard contract
        note=f"{n_sets} set(s) with evidence · {n_shots} shot(s) · {n_vids} "
             f"video(s){_cover_note}{_unclear_note} · click a row to open its "
             f"galleries · walked recursively from `{_PROOF_REL}/` at build time.",
        info='<div class="leg">A set is one directory under '
             f'<code>{_PROOF_REL}/</code>; its <code>manifest.json</code> '
             "supplies the story and the leg names, the file counts are walked "
             "off disk. The ROLE column says where each set sits in the entity's "
             "story — derived from the card's <code># FLOWS</code> and the "
             "manifest (an explicit <code>role:</code>/<code>flows:</code> in "
             "the manifest overrides the inference; an inferred role says so). "
             "A <code>★</code> in the card's FLOWS marks the GOLDEN PATH — this "
             "feature's own main journey; a set covering a ★ flow wears the "
             "star, and an unproven ★ flow is the loudest gap on the shelf. "
             "Open a row to see its legs, then click any artifact "
             "to open the viewer — <b>←</b> / <b>→</b> or the side arrows "
             "run through the WHOLE set, leg by leg; <b>↑</b> / <b>↓</b> move to "
             "the previous or next set (folding this one shut and "
             "unfolding that one); <b>Esc</b> closes. Opening or closing "
             "a set cascades to its legs.</div>"
             + legend("Role:", [
                 ("s-ok", "principal ★", "main workflow · ★ = golden path ·"),
                 ("s-med", "edge", "guards · degraded · destructive ·"),
                 ("l-models", "reference", "design-lab fidelity, not proof ·"),
                 ("l-schemas", "supporting", "context ·"),
                 ("s-gap", "unclassified / unproven",
                  "needs clarification, or a flow with no set — both feed "
                  "Pending")])
             + legend("Row states:", [
                 ("s-ok", "artifacts", "on disk this build ·"),
                 ("s-gap", "empty / absent",
                  "declared for this entity but nothing to show — a named gap")]))
    html += xtable(
        ["Proof set", "Role", "Artifacts", "Captured", "State"],
        rows, widths=["2fr", "1.4fr", "1fr", "1.2fr", "1.4fr"])
    html += sechead("Evidence", "Not proven here", "#8a6d1a", _IC_INBOX,
                    sub="the evidence kinds this entity does not have",
                    id_="sec-ev-gaps",
                    note="Absent evidence is named, never zeroed. Specs behind "
                         "the sets above: "
                         + (", ".join(f"`{s}`" for s in specs)
                            or "none recorded in the manifests."))
    html += table(
        ["Kind", "Why"],
        [["deployed probes", f"no machine-readable probe watches the deployed "
                              f"{label} surfaces — every artifact above is a "
                              f"capture from a run, not a live check"],
         ["mobile (Maestro)", "no Maestro flow is attached to this entity; the "
                              "mobile app consumes the same API but leaves no "
                              "artifact here"],
         ["a junit record of these runs",
          "D121 keeps web e2e local-only, so the shots above exist without a "
          "pass/fail record beside them — the pre-push local gate is where "
          "they are enforced"]])
    return html
