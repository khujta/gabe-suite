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
from pathlib import Path

import _center_data as _cd
from _a3_render import E, legend, md, pmore, sechead, subnav, table, trunc, xtable

_CENTER_REL = _cd._PATHS.get("center", "docs/site/center")
_PROOF_REL = _cd._PATHS.get("proof", "tests/web-e2e/proof")

_IC_CAM = ('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 '
           '2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>')
_IC_INBOX = ('<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>'
             '<path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 '
             '2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>')

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
    identity = " ".join(str(man.get(k, "")) for k in ("feature", "proof_form"))
    identity = f'{s["name"]} {identity}'.lower()
    narr = man.get("narration") if isinstance(man.get("narration"), dict) else {}
    story = narr.get("story", "") if isinstance(narr.get("story", ""), str) else ""
    text = " ".join([identity, story.lower(),
                     " ".join(leg["name"] for leg in s["legs"])]).lower()

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

    if explicit_flows:
        matched = [k for k, _, _g in flows if k in explicit_flows]
    else:
        matched = []
        for key, desc, _g in flows:
            if re.search(rf"(?<![a-z]){re.escape(key)}(?![a-z])", text):
                matched.append(key)
            elif len([t for t in _flow_tokens(desc) if t in text]) >= 2:
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


def _rel_days(ts: float) -> str:
    days = (_dt.datetime.now().timestamp() - ts) / 86400
    if days < 1:
        return "today"
    if days < 2:
        return "yesterday"
    return f"{int(days)}d ago"


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
    newest = max((f.stat().st_mtime for f in media), default=0.0)
    return {"name": name, "dir": pdir,
            "exists": pdir.is_dir() or single is not None,
            "single": single is not None, "man": man,
            "shots": shots, "videos": videos, "traces": traces, "refs": refs,
            "legs": legs, "newest": newest}


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
        names = ", ".join(sorted(t.name for t in s["traces"])[:6])
        out += (f'<p class="sub">{len(s["traces"])} playwright trace(s) kept for '
                f"forensics — not viewable here, opened with "
                f"<code>npx playwright show-trace</code>: {E(names)}"
                f'{"…" if len(s["traces"]) > 6 else ""}</p>')
    return out


def build_evidence_tab(cov: dict, label: str = "this entity") -> str:
    """The Evidence tab for one entity, rendered from collect_coverage(): a
    header table of its proof sets — each row carrying its ROLE (principal ·
    edge · reference · supporting, or unclassified) and opening onto its own
    galleries — followed by one PLACEHOLDER row per card flow no classified set
    covers. A declared set with nothing on disk keeps its row and reads as a
    named gap; an uncovered flow reads as an unproven one."""
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
        captured = (f'{_rel_days(s["newest"])}<br>'
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
        # set with nothing on disk stays a flat, un-expandable row.
        rows.append((cells, _set_detail(s, _story) if n_media else ""))

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

    html = subnav([("sec-ev-sets", "Proof sets", _IC_CAM),
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
