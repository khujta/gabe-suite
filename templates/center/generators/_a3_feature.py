#!/usr/bin/env python3
"""A3 per-entity feature pages — built FROM the shipped feature.html skeleton.

Split out of build_center_a3.py (size budget). The card supplies the authored
translation; every count rendered beside it is machine-read at build time.

Diagrams render as a PICKER (radio + CSS sibling selectors, no script) rather
than three stacked figures: one diagram at a time, chosen by name. The
change-highlight classDef inside each mermaid source is preserved untouched.
"""

from __future__ import annotations

import glob
import re
from pathlib import Path

import _center_data as _cd
import _center_mermaid as M
from _a3_code import build_code_tab, collect_entity_map
from _a3_evidence import (
    build_evidence_tab,
    collect_coverage,
    collect_set,
    is_reference,
    parse_flows,
)
from _a3_render import (
    E,
    card_html,
    gap,
    kpi,
    legend,
    lines_grade,
    md,
    meter,
    pmore,
    sechead,
    strip_slot_doc_comments,
    subnav,
    table,
    xtable,
)

_IC_CHECK = ('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>'
             '<polyline points="22 4 12 14.01 9 11.01"/>')
_IC_ALERT = ('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 '
             '1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>'
             '<line x1="12" y1="9" x2="12" y2="13"/>'
             '<line x1="12" y1="17" x2="12.01" y2="17"/>')
_IC_COMMIT = ('<circle cx="12" cy="12" r="4"/><line x1="1.05" y1="12" x2="7" y2="12"/>'
              '<line x1="17.01" y1="12" x2="22.96" y2="12"/>')
_IC_GRID = ('<rect x="3" y="3" width="18" height="18" rx="2"/>'
            '<line x1="3" y1="9" x2="21" y2="9"/>'
            '<line x1="3" y1="15" x2="21" y2="15"/>'
            '<line x1="12" y1="3" x2="12" y2="21"/>')
_IC_INBOX = ('<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>'
             '<path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 '
             '2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>')
_IC_DOC = ('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>'
           '<polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>'
           '<line x1="16" y1="17" x2="8" y2="17"/>')
_IC_FLOW = ('<rect x="3" y="3" width="7" height="7" rx="1"/>'
            '<rect x="14" y="14" width="7" height="7" rx="1"/>'
            '<path d="M6.5 10v4a2 2 0 0 0 2 2h5"/>')
_IC_SEED = ('<path d="M12 22V12"/><path d="M12 12c0-4 3-7 8-7 0 5-3 8-8 8z"/>'
            '<path d="M12 16c0-3-2.5-5.5-6-5.5 0 3.5 2.5 6 6 6z"/>')
_SEV_CLS = {"high": "s-high", "medium": "s-med", "low": "s-low",
            "gap": "s-gap", "mitigated": "s-ok", "malformed": "s-high"}

# Which test files belong to an entity (broad on purpose: an over-match shows up
# as a visible row, an under-match silently hides coverage) and which proof sets
# a feature page shows — both read from center.config.json `entities.<slug>`, so
# the mapping lives with the project, not in this generator source.
_ENTITIES = _cd.CFG.get("entities", {})
ENTITY_RX = {slug: e["test_rx"] for slug, e in _ENTITIES.items() if e.get("test_rx")}
ENTITY_PROOFS = {slug: e["proofs"] for slug, e in _ENTITIES.items() if e.get("proofs")}
DIAGRAMS = (("DIAGRAM USERFLOW", "Userflow"),
            ("DIAGRAM DATAFLOW", "Dataflow"),
            ("DIAGRAM WORKFLOW", "Workflow"))


def entity_corpus(rx: str, junit_by: dict, corpora: list) -> dict:
    """Per-corpus test files matching the entity — counts are machine-read.
    Keyed by each declared corpus key, so nothing here names a specific suite."""
    pat = re.compile(rx, re.I)
    out: dict[str, dict] = {}
    for c in corpora:
        j = junit_by.get(c["key"])
        hits = {f: r for f, r in (j or {}).get("files", {}).items() if pat.search(f)}
        out[c["key"]] = {
            "files": hits,
            "cases": sum(r["tests"] for r in hits.values()),
            "failed": sum(r["failed"] for r in hits.values()),
            "skipped": sum(r["skipped"] for r in hits.values()),
            # Provenance: whether a junit was loaded for this corpus at all, and
            # WHEN it was captured — so the page can say "captured <time>" instead
            # of asserting a currency ("at HEAD") nobody verified, and can tell a
            # missing file apart from a removed test.
            "present": j is not None,
            "ran_at": (j or {}).get("mtime") or (j or {}).get("ranAt") or "",
        }
    return out


# A case id is the join between a CLAIMED case (card / red-spec) and a RUNNING
# one (junit). Anchored so `C1349` matches but `ABC12` and `C13490` do not.
_CID_RX = re.compile(r"(?<![A-Za-z0-9])C([0-9]{1,5})(?![0-9])")
_STATE_CHIP = {"pass": ('<span class="tag s-ok">pass</span>'),
               "fail": ('<span class="tag s-high">fail</span>'),
               "skip": ('<span class="tag s-gap">skip</span>')}


def case_rows(rec: dict, corpus: str) -> str:
    """One file's cases, with the characteristics junit actually carries:
    the C-id that joins it to a claim, the group it belongs to (pytest class /
    vitest describe), its own name, runtime and state."""
    rows = ""
    # Junit order IS the order the suite ran them; sorting by name replaced a
    # real fact with an alphabetical one that reads exactly like it.
    for i, c in enumerate(rec["cases"], 1):
        name = c["name"]
        group = ""
        if corpus == "api":
            tail = c.get("cls", "").rsplit(".", 1)[-1]
            group = tail if tail[:1].isupper() else ""
        elif ">" in name:                       # vitest: "Describe > case name"
            group, _, name = (p.strip() for p in name.rpartition(">"))
        cid = _CID_RX.search(name)
        cid_cell = (f'<span class="cid">C{cid.group(1)}</span>' if cid
                    else '<span class="cid none">—</span>')
        # The id is shown as an id, then stripped from the prose it prefixes.
        label = _CID_RX.sub("", name).strip(" ·-_[]").replace("_", " ")
        rows += (
            f'<tr><td class="num">{i}</td>'
            f"<td>{cid_cell}</td>"
            f"<td>{E(label) or E(name)}</td>"
            f'<td><small>{E(group) or "—"}</small></td>'
            f'<td class="num">{c["time"]:.2f}s</td>'
            f'<td>{_STATE_CHIP.get(c["state"], "")}</td></tr>')
    return (f'<table class="tbl"><thead><tr><th class="num">#</th><th>Case id</th>'
            f"<th>What it asserts</th><th>Group</th><th class=\"num\">Time</th>"
            f"<th>State</th></tr></thead><tbody>{rows}</tbody></table>")


def kind_state(c: dict) -> str:
    """What the machine can say about a kind right now — never a bare 'ok'."""
    if not c["cases"]:
        return '<span class="tag s-gap">no cases matched</span>'
    if c["failed"]:
        return f'<span class="tag s-high">{c["failed"]} failing</span>'
    if c["skipped"]:
        return f'<span class="tag s-med">{c["skipped"]} skipped</span>'
    when = str(c.get("ran_at") or "")[:16]
    return (f'<span class="tag s-ok">captured {E(when)}</span>' if when
            else '<span class="tag s-ok">captured · time unknown</span>')


# The Kinds table says HOW MUCH; the card says WHAT FOR. Same vocabulary, same
# colors — so the description behind ⊕ reads as the table's own footnote.
_KIND_CLS = {"integration": "l-api", "unit": "l-web", "journey": "l-mobile",
             "coverage": "l-models", "manual": "l-services",
             "deployed": "l-schemas", "evidence": "l-evidence"}


def angles_html(lines: list[str]) -> str:
    """The card's per-kind INTENT, rendered inside the section's ⊕ toggle with
    the kind chips the table above already uses. Counts never live here — they
    are machine-read; a bullet that restates one would drift on the next run."""
    lead = [ln.strip() for ln in lines
            if ln.strip() and not ln.strip().startswith("- ")]
    out = "".join(f'<p>{md(t)}</p>' for t in lead)
    rows = ""
    for ln in lines:
        s = ln.strip()
        if not s.startswith("- "):
            continue
        kind, _, text = s[2:].partition("—")
        key = kind.strip().lower()
        cls = _KIND_CLS.get(key)
        if not cls or not text.strip():
            rows += f'<tr><td colspan="2">{md(s[2:])}</td></tr>'
            continue
        rows += (f'<tr><td><span class="tag {cls}">{E(key)}</span></td>'
                 f"<td>{md(text.strip())}</td></tr>")
    if rows:
        out += (f'<table class="tbl" style="margin-top:8px"><thead><tr>'
                f"<th>Kind</th><th>What it is for on this entity</th></tr>"
                f"</thead><tbody>{rows}</tbody></table>")
    return out


# Pricing per growth KIND: what closing it costs to build, at which maturity it
# is worth building, what it buys, and what it costs FOREVER after (every angle
# added is time spent on every future run — a growth list that hides the
# recurring cost sells work nobody budgeted for). Effort is the class, not a
# promise; the stage is read against BEHAVIOR.md's maturity.
_GROWTH_PRICE = {
    "coverage": ("M", "~half a day", "enterprise",
                 "turns “is this tested?” into a number per path — the "
                 "untested lines get named instead of guessed at",
                 "+10–20s on every backend run, and one more artifact that "
                 "goes stale if a run is skipped"),
    "journey": ("S", "~2h", "mvp",
                "the browser walks stop being invisible — a verdict lands "
                "beside the specs instead of “on disk, state unknown”",
                "+2–4 min per full run, and a junit that must be refreshed or "
                "it silently describes an older HEAD"),
    "manual": ("XS", "~15 min", "mvp",
               "the one angle with no machine source gets a dated verdict and "
               "a name against it",
               "one walk per material rewrite — a walk approves a SCOPE, so "
               "reshaping the feature re-opens it"),
    "deployed": ("L", "~2 days", "scale",
                 "catches the gap between what we tested and what is actually "
                 "running — the only angle that can",
                 "a probe suite to keep green, prod data hygiene per run, and "
                 "a new class of flake to triage"),
    "integration": ("M", "~half a day", "mvp",
                    "the entity gets a failing-first record of what it must do "
                    "through its own HTTP surface",
                    "+~0.1s per case on every backend run, forever"),
    "unit": ("S", "~2h", "mvp",
             "the renderer family gets pinned against regressions that no "
             "API test can see",
             "+~0.05s per case on every web run, forever"),
    "evidence": ("S", "~1h", "mvp",
                 "the claim becomes something a person can look at and judge, "
                 "not a sentence to be believed",
                 "re-capture whenever the screen changes — shots rot faster "
                 "than assertions"),
}
_EFFORT_CLS = {"XS": "e-xs", "S": "e-s", "M": "e-m", "L": "e-l"}
_STAGE_CLS = {"mvp": "st-mvp", "enterprise": "st-ent", "scale": "st-scale"}


def parse_risks(lines: list[str]) -> list[tuple[str, str, str, str, str]]:
    """Card grammar: `SEV · status · Kind · what is at stake · detail`.

    The stake is what makes a row a RISK rather than a note: severity without
    a consequence is a number nobody can argue with.

    Fields are separated by `·` with a bounded split, so prose may contain any
    punctuation it likes — an earlier version split the stake off at the first
    em-dash and silently truncated every stake that contained one, which the
    grammar practically invites. Older forms still parse: 4 fields fall back to
    splitting the last on its first em-dash, 3 fields yield no stake. A line
    that parses as NONE of these is returned as `malformed` rather than
    dropped — a risk that vanishes because of its punctuation is the worst
    possible failure for a register."""
    out = []
    for ln in lines:
        s = ln.strip().removeprefix("- ")
        if not s:
            continue
        parts = [p.strip() for p in s.split("·", 4)]
        if len(parts) == 5:
            out.append((parts[0], parts[1], parts[2], parts[3], parts[4]))
            continue
        if len(parts) == 4 and "—" in parts[3]:
            stake, _, detail = parts[3].partition("—")
            out.append((parts[0], parts[1], parts[2], stake.strip(), detail.strip()))
            continue
        if len(parts) == 3 and "—" in parts[2]:
            kind, _, detail = parts[2].partition("—")
            out.append((parts[0], parts[1], kind.strip(), "", detail.strip()))
            continue
        out.append(("malformed", "unparsed", "—", "", s))
    return out


# What each unverified angle actually puts at risk. The gap itself is machine-
# derived; this names the consequence of leaving it open, which is the only
# thing that makes it belong on a risk register.
_GAP_STAKE = {
    "journey": "a browser-only regression — a broken guard, a lost draft — "
               "ships without anything noticing",
    "coverage": "untested code reads exactly like tested code, so the gap is "
                "invisible when deciding what to touch",
    "deployed": "what we tested and what is actually running drift apart "
                "silently between deploys",
    "manual": "nobody has confirmed the built thing matches what this page "
              "says it does",
    "evidence": "nobody outside the team can check the claim — there is "
                "nothing to look at, only prose to be believed",
}


def shared_owners(fname: str, slug: str) -> list[str]:
    """Other entities whose file regex also claims this test file.

    ENTITY_RX is broad on purpose, so per-entity counts OVERLAP — they are
    views over the corpus, never a partition of it, and summing them is wrong.
    Measured today: 50 cases across 6 files are claimed by two entities each.
    A shared file says so on its own row rather than letting two pages raise
    the same alarm as if they were two events."""
    return sorted(other for other, rx in ENTITY_RX.items()
                  if other != slug and re.search(rx, fname, re.I))


def file_flags(rec: dict, shared: list[str] | None = None) -> str:
    """Issues on a file render as flags — a green row says so by having none."""
    out = []
    if shared:
        out.append(f'<span class="tag l-services">shared with '
                   f'{E(", ".join(shared))}</span>')
    if rec["failed"]:
        out.append(f'<span class="tag s-high">{rec["failed"]} failing</span>')
    if rec["skipped"]:
        out.append(f'<span class="tag s-med">{rec["skipped"]} skipped</span>')
    return " ".join(out) or '<span class="tag s-ok">clean</span>'


def diagram_picker(slug: str, card: dict) -> str:
    """One diagram at a time, picked by name. Pure CSS via :target, so the
    choice rides in the URL — a radio group kept it in DOM state only, and a
    reader who pasted the link to make a point about the dataflow sent their
    colleague to the userflow. Safe inside the :target tabs because
    `.tabpane:has(:target)` keeps the enclosing pane open."""
    have = [(key, title) for key, title in DIAGRAMS if card.get(key)]
    if not have:
        return ""
    bar = "".join(
        f'<a href="#dgm-{E(slug)}-{i}">{E(title)}</a>'
        for i, (_, title) in enumerate(have))
    panes = "".join(
        f'<div class="pane p{i}" id="dgm-{E(slug)}-{i}">'
        f"{M._mermaid_svg(chr(10).join(card[key]))}</div>"
        for i, (key, _) in enumerate(have))
    return (f'<div class="dgm"><div class="dgmbar">{bar}</div>'
            f'<div class="panes">{panes}</div></div>')


def lens_block(card: dict) -> str:
    """The gabe-lens translation, rendered as the page's OPENING — handle first,
    then the constraint box, then the analogy and its mapping.

    This is why the detail below can collapse: a reader who only reads the lens
    still leaves with the entity's shape. Nothing is deleted, only deferred."""
    lines = card.get("LENS", [])
    if not lines:
        return ""
    fields: dict[str, list[str]] = {}
    for ln in lines:
        key, _, val = ln.strip().partition(":")
        if val.strip():
            fields.setdefault(key.strip().lower(), []).append(val.strip())

    def one(k: str) -> str:
        return md(fields.get(k, [""])[0])

    out = ""
    if fields.get("handle"):
        out += f'<p class="lenshandle">“{one("handle")}”</p>'
    box = "".join(
        f'<div class="lenscell"><b>{lab}</b><span>{one(k)}</span></div>'
        for lab, k in (("IS", "is"), ("IS NOT", "is not"), ("DECIDES", "decides"))
        if fields.get(k))
    if box:
        out += f'<div class="lensbox">{box}</div>'
    if fields.get("analogy"):
        out += f'<p class="lensanalogy">{one("analogy")}</p>'
    if fields.get("map"):
        out += table(["Analogy", "In this codebase"],
                     [[md(p.split("→")[0].strip()), md(p.split("→")[-1].strip())]
                      for p in fields["map"] if "→" in p])
    if fields.get("confuse"):
        out += ('<p class="sub">Easy to confuse:</p><ul>'
                + "".join(f"<li>{md(c)}</li>" for c in fields["confuse"]) + "</ul>")
    if fields.get("limits"):
        out += (f'<p class="sub">Where the analogy stops working: '
                f'{one("limits")}</p>')
    return f'<div class="lens">{out}</div>'


# --------------------------------------------------------------------------- #
# The Action Ledger (direction A+D) — ONE derivation of every open MOVE on an
# entity. Replaces the growth_rows / unverified_risks branch-trees, which were
# hand-synchronized ("the register has to agree with it or one of them is
# lying"). The ledger, the Risk residual and the hub rollup all read from
# angle_rows(): the FACT (now), the cost to CLOSE (do) and the cost to LEAVE
# OPEN (don't) ride ONE row, sorted ripe-first then cheapest.
# --------------------------------------------------------------------------- #

_EFFORT_ORD = {"XS": 0, "S": 1, "M": 2, "L": 3}
_MATURITY_ORD = {"mvp": 0, "enterprise": 1, "scale": 2}

# Stat-strip glyphs. Seed + check REUSE the _IC_ definitions at the top of this
# file — they were byte-identical duplicates, so one source cannot drift from the
# other; only the clock and trend are new here.
_KPI_SEED = _IC_SEED
_KPI_CLOCK = '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
_KPI_TREND = ('<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>'
              '<polyline points="17 6 23 6 23 12"/>')
_KPI_CHECK = _IC_CHECK

# structure move: pricing for the 800-line ruled budget (effort scales with the
# overage in _struct_effort; buys/cost are fixed).
_STRUCT_BUYS = ("reviewable files, a smaller blast radius per change, and "
                "reviews that can hold the whole file again")
_STRUCT_COST = "none — a split charges nothing recurring"
_STAKE_EXTRA = {
    "integration": "the HTTP surface has no failing-first record of what it must "
                   "do — a contract nobody wrote down",
    "unit": "renderer regressions no API test can see ship quietly",
    "structure": "every edit pays the god-file tax — reviews skim what they "
                 "cannot hold, and the blast radius grows with the file",
}
# Long adoption statuses overflow the KPI `.val` (1.85rem); show a short token
# there and the full status in the sub.
_STATUS_SHORT = {"awaiting-approval": "awaiting", "covered-by-feature": "covered"}


def _struct_effort(lines: int) -> tuple[str, str]:
    over = lines - 800
    if over <= 300:
        return "S", "~2h"
    if over <= 800:
        return "M", "~half a day"
    return "L", "~2 days"


def angle_rows(slug: str, inv: dict, specs: list[str], walks: list[dict],
               section: dict, proof_root, corpora: list, e2e: dict,
               over_files: list, maturity: str = "mvp",
               flow_gaps: list = (), unclear_sets: list = (),
               flows_malformed: list = (),
               inferred_cover: list = ()) -> tuple[list[dict], list[str]]:
    """Every OPEN move on the entity (one dict per row, both prices) plus the
    CLOSED-angle labels (a green / walked / proven angle emits no row). The
    single source the ledger, the Risk residual and the hub rollup read."""
    rows: list[dict] = []
    closed: list[str] = []

    def _stake(kind: str) -> str:
        return _GAP_STAKE.get(kind) or _STAKE_EXTRA.get(kind, "")

    def add(kind: str, now: str, move: str, eff: str, hours: str, stage: str,
            src: str = "machine", now_html: str = "") -> None:
        price = _GROWTH_PRICE.get(kind)
        rows.append({
            "kind": kind, "now": now, "now_html": now_html, "move": move,
            "eff": eff, "hours": hours,
            "stage": stage, "ripe": _MATURITY_ORD[stage] <= _MATURITY_ORD[maturity],
            "buys": price[3] if price else _STRUCT_BUYS,
            "stake": _stake(kind), "cost": price[4] if price else _STRUCT_COST,
            "src": src, "domain": _ACTION_DOMAIN.get(kind, "other")})

    for c in corpora:
        key, kind = c["key"], c["kind"]
        eff, hours, stage, _, _ = _GROWTH_PRICE[kind]
        if not inv[key]["cases"]:
            add(kind, f"no {kind} case matches this entity",
                f"author the first {kind} cases", eff, hours, stage)
        elif inv[key]["failed"]:
            # A red corpus is the single most urgent move on the entity and is
            # ripe NOW whatever the maturity — it must never reach the green
            # "closed" branch below and get stamped as passing.
            add(kind, f'{inv[key]["failed"]} failing case(s) — the suite is red',
                "fix the failing cases", eff, hours, "mvp")
        elif inv[key]["skipped"]:
            add(kind, f'{inv[key]["skipped"]} skipped case(s) — claimed coverage '
                      f"that does not execute",
                "make the skipped cases run, or drop the claim", eff, hours, stage)
        else:
            closed.append(f'{kind} — {inv[key]["cases"]} green')

    eff, hours, stage, _, _ = _GROWTH_PRICE["journey"]
    _local = e2e.get("local_only_note", "web e2e is local-only")
    if specs:
        add("journey", f"{len(specs)} spec(s) walk this entity, no junit record "
                       f"— {_local}",
            "wire a junit capture for the journey run", eff, hours, stage)
    else:
        add("journey", "no browser spec walks this entity end to end",
            "author the first end-to-end spec", eff, hours, stage)

    eff, hours, stage, _, _ = _GROWTH_PRICE["coverage"]
    if e2e.get("coverage_sliced"):
        # The capability is wired — the move CLOSES. A move that can never reach
        # this branch is decoration, not an action item.
        closed.append("coverage — sliced per entity")
    else:
        add("coverage", f'repo gate ({e2e.get("coverage_gate", "coverage")}) '
                        f"passes, not sliced by path",
            "slice the coverage report per entity path", eff, hours, stage)

    eff, hours, stage, _, _ = _GROWTH_PRICE["manual"]
    mine = [w for w in walks if w.get("subject") == f"adopt:{slug}"]
    if not mine:
        add("manual", "no walk on record for this entity",
            "walk the feature and record it", eff, hours, stage)
    elif section.get("status") == "awaiting-approval":
        add("manual", "the recorded walk approved an earlier scope",
            "re-walk against the current scope", eff, hours, stage)
    else:
        closed.append(f'manual — walked {str(mine[-1].get("when", ""))[:10]}')

    eff, hours, stage, _, _ = _GROWTH_PRICE["deployed"]
    if e2e.get("deployed_probes"):
        closed.append("deployed — probes on record")
    else:
        add("deployed", "nothing machine-readable probes the deployed surfaces",
            "stand up a read-only probe suite", eff, hours, stage)

    eff, hours, stage, _, _ = _GROWTH_PRICE["evidence"]
    declared = ENTITY_PROOFS.get(slug, [])
    empty = [n for n in declared
             if not (lambda st: st["shots"] or st["videos"])(
                 collect_set(n, proof_root / n))]
    if not declared:
        add("evidence", "no proof set is registered for this entity",
            "register and capture the first proof set", eff, hours, stage)
    elif empty:
        for name in empty:
            add("evidence", f"proof set `{name}` declared but empty",
                "capture it, or retire the declaration", eff, hours, stage)
    else:
        closed.append(f"evidence — {len(declared)} set(s) on disk")
    # Flow coverage (from collect_coverage over the card's # FLOWS): a card flow
    # no classified set covers, and a set the build cannot classify, are both
    # OPEN evidence moves — the golden path with no proof is work, not a blank.
    for key, _desc, golden in flow_gaps:
        if golden:
            add("evidence", f"GOLDEN PATH flow `{key}` has no proof",
                "capture the feature's main path — the first proof to have",
                eff, hours, "mvp")
        else:
            add("evidence", f"card flow `{key}` has no covering proof set",
                "capture the flow's proof, or mark the covering set's `flows:`",
                eff, hours, stage)
    for name, why in unclear_sets:
        add("evidence", f"proof set `{name}` — {why or 'unclear what it proves'}",
            "add `role:` / `flows:` to its manifest (author it if missing)",
            "XS", "~10 min", "mvp")
    if flows_malformed:
        add("evidence", f"{len(flows_malformed)} FLOWS line(s) in the card do "
                        f"not parse — excluded from the coverage denominator",
            "fix the card grammar — `- <key> [★] → <description>`, one-word key",
            "XS", "~10 min", "mvp")
    if inferred_cover:
        add("evidence", f"{len(inferred_cover)} covered flow(s) rest on "
                        f"inference alone: " + " · ".join(inferred_cover[:4]),
            "confirm with an explicit `flows:` in the covering manifest(s)",
            "XS", "~10 min", "mvp")

    for fpath, n in over_files:
        eff, hours = _struct_effort(n)
        pct = round(n * 100 / 800)
        add("structure", f"`{fpath}` · {n:,} lines ({pct}% of budget)",
            "split at its natural seam", eff, hours, "mvp",
            now_html=(f'<code>{E(fpath)}</code> · {lines_grade(n, thousands=True)} '
                      f'lines ({pct}% of budget)'))

    rows.sort(key=lambda r: (not r["ripe"], _EFFORT_ORD[r["eff"]], r["kind"]))
    return rows, closed


def _ledger_render(rows: list[dict]) -> list[list[str]]:
    """The ledger table body — one row per open move, both prices side by side."""
    out = []
    for r in rows:
        src = ('<span class="tag s-ok" title="derived from a machine source '
               'this build">machine</span>' if r["src"] == "machine" else
               '<span class="tag e-m" title="card-authored judgment, '
               're-verified at adoption">judgment</span>')
        ripe = ('<span class="tag s-ok">ripe now</span>' if r["ripe"]
                else '<span class="tag s-gap">later</span>')
        out.append([
            f'<span class="tag {_KIND_CLS.get(r["kind"], "s-gap")}">'
            f'{E(r["kind"])}</span><br>{src}',
            r.get("now_html") or md(r["now"]), f'<b>{md(r["move"])}</b>',
            f'<span class="tag {_EFFORT_CLS[r["eff"]]}">{E(r["eff"])}</span>'
            f'<br><small>{E(r["hours"])}</small>',
            f'<span class="tag {_STAGE_CLS[r["stage"]]}">{E(r["stage"])}</span>'
            f'<br>{ripe}',
            pmore(r["buys"], 92), pmore(r["stake"], 92), pmore(r["cost"], 80)])
    return out


# --------------------------------------------------------------------------- #
# Action tables are organized BY THE SECTION that owns each move, so a move
# appears in exactly ONE place (retiring the three-places scatter). The SAME
# table component fronts its record section AND is cloned on the Overview
# ledger; the ledger also carries a summary dashboard + an "Other" table for
# moves with no section home.
# --------------------------------------------------------------------------- #

_ACTION_DOMAIN = {
    "structure": "code",
    "integration": "tests", "unit": "tests", "journey": "tests",
    "coverage": "tests", "evidence": "evidence",
    "manual": "other", "deployed": "other",
}
# domain -> (label, in-section action-table anchor, what it covers)
_DOMAIN_META = {
    "code": ("Code", "sec-code-actions", "refactors on the code this entity owns"),
    "tests": ("Tests", "sec-tests-actions", "test kinds this entity is missing"),
    "evidence": ("Evidence", "sec-ev-actions", "proof a person could look at"),
    "risk": ("Risk", "sec-risk-register", "authored risks, priced as actions"),
    "other": ("Other", "sec-ov-act-other", "moves with no single section home"),
}
_DOMAIN_ORDER = ("code", "tests", "evidence", "risk", "other")
# The buckets a machine-derived ledger row can land in — DERIVED from the domains
# _ACTION_DOMAIN actually maps to (in _DOMAIN_ORDER), never a hand-kept tuple, so
# adding a move-domain cannot silently drop its rows from every table. 'risk' is
# not here: risks come from the card, not angle_rows.
_LEDGER_DOMAINS = tuple(d for d in _DOMAIN_ORDER
                        if d in set(_ACTION_DOMAIN.values()))
assert set(_ACTION_DOMAIN.values()) <= set(_LEDGER_DOMAINS), (
    "every _ACTION_DOMAIN value needs a _DOMAIN_ORDER bucket")
_LEDGER_COLS = ["Kind", "Now — the machine fact", "The move", "Effort",
                "Stage · ripe?", "If we do", "If we don't", "Cost / run after"]
# Risk uses the ledger shape MINUS Effort + Cost/run-after — a risk is not
# machine-priced like a test or refactor; its weight is severity + the stake.
_RISK_LEDGER_COLS = ["Severity", "Now — the exposure", "The move",
                     "Stage · ripe?", "If we do", "If we don't"]
_RISK_MOVE = {
    "gap": "close the gap — implement the missing check",
    "latent": "harden before the path becomes reachable",
    "by-design": "accept explicitly, or redesign to fail closed",
}


def _risk_move(status: str) -> str:
    s = status.lower()
    for key, move in _RISK_MOVE.items():
        if key in s:
            return move
    return "mitigate, or accept and track"


def _risk_ledger_render(risk_tuples: list) -> list[list[str]]:
    """Authored risks mapped onto the ledger columns (the Code/Tests shape) so
    Risk reads as one more action table. Effort/Cost are “—”: a risk is weighed
    by severity + stake, not machine-priced."""
    out = []
    for sev, status, kind, stake, detail in risk_tuples:
        ripe = sev.lower() in ("high", "medium")
        out.append([
            f'<span class="tag {_SEV_CLS.get(sev.lower(), "s-med")}">{E(sev)}</span>'
            f'<br><small>{E(status)}</small>',
            f'<b>{md(kind)}</b><br>{pmore(detail, 92, small=True)}',
            md(_risk_move(status)),
            ('<span class="tag s-ok">ripe now</span>' if ripe
             else '<span class="tag s-gap">later</span>'),
            "the exposure closes",
            pmore(stake, 92)])
    return out


def _stat_strip(items: list) -> str:
    """A compact stat strip (icon · value · label · sub) — lighter than the .kpi
    cards, with breathing room before the table below. Inline styles reference
    a3 tokens, so it themes without touching a3.css."""
    cells = []
    for icon, value, label, sub in items:
        svg = (f'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" '
               f'stroke="currentColor" stroke-width="2" stroke-linecap="round" '
               f'stroke-linejoin="round" style="color:var(--muted);flex:none">'
               f'{icon}</svg>')
        subhtml = (f'<div style="font-size:.63rem;color:var(--muted)">{E(sub)}</div>'
                   if sub else "")
        cells.append(
            f'<div style="flex:1;min-width:150px;display:flex;align-items:center;'
            f'gap:11px;background:var(--surface);border:1px solid var(--line);'
            f'border-radius:var(--radius);padding:9px 14px">{svg}'
            f'<div style="line-height:1.2"><div style="font-size:1.3rem;'
            f'font-weight:700;letter-spacing:-.01em">{E(value)}</div>'
            f'<div style="font-size:.63rem;text-transform:uppercase;'
            f'letter-spacing:.06em;color:var(--muted);font-weight:600">{E(label)}'
            f'</div>{subhtml}</div></div>')
    return ('<div style="display:flex;gap:11px;flex-wrap:wrap;margin:4px 0 22px">'
            + "".join(cells) + "</div>")


# Column widths (fixed layout) so the text-heavy columns get room and the tag
# columns stay tight — an 8-col ledger table and the 6-col risk table. Kind gets
# enough room that "structure" / "machine" stay on one line.
_LEDGER_W = ["10%", "17%", "16%", "7%", "8%", "14%", "14%", "14%"]
_RISK_W = ["11%", "29%", "18%", "10%", "14%", "18%"]


def action_table(title: str, rows: list, *, id_: str, link_label: str,
                 link_href: str, note: str, columns=None, render=None,
                 widths=None) -> str:
    """The reusable action-table component — a tinted Action sechead carrying a
    jump link, then the table (same treatment fronting a record section and
    cloned on the ledger). Empty -> an honest 'clear' line, never a fake row."""
    columns = columns or _LEDGER_COLS
    render = render or _ledger_render
    widths = widths or _LEDGER_W
    info = (f'<div class="leg"><a class="dlink" href="#{link_href}">'
            f'{E(link_label)} ↗</a></div>')
    head = sechead("Action", title, "#b45309", _IC_SEED, id_=id_, info=info,
                   note=note)
    if not rows:
        return head + ('<p class="sub">Nothing pending in this area — it is '
                       "clear this build.</p>")
    return head + table(columns, render(rows), widths=widths)


def claim_verdicts(claims: list[str], inv: dict, corpora: list,
                   junit_complete: bool = True) -> dict:
    """The Tests-tab ACCUMULATOR: the card's `# CLAIMS` (one line per test class
    with its intent) joined to the run by the class's NAME — the build checks the
    claimed class still runs. The C-ids are read from the matched cases and
    DISPLAYED (they identify the individual cases), but they are NOT the join key:
    the join is the class name the card names, so renaming a claimed class
    correctly reads as DRIFT — the claim's referent is gone until the card is
    updated. A short-name-only or multi-class match is flagged AMBIGUOUS rather
    than silently counted running. DRIFT is asserted ONLY when junit is COMPLETE
    (`junit_complete` — every corpus loaded); if any corpus's junit is missing, a
    no-match claim reads "drift unknown" instead, never a blanket red DRIFT caused
    by a missing file — including the partial case (pytest ran, vitest didn't).
    Rows are xtable (cells, detail) tuples, always 5 cells; running/ambiguous
    expand to the case list, drift/unknown are flat."""
    # corpus -> (kind, colour class) so each claim carries the SAME kind tag the
    # Kinds & coverage table uses (api → integration/l-api, web → unit/l-web).
    kindmap = {c["key"]: (c["kind"], c["tag_class"]) for c in corpora}
    observed: dict[str, dict] = {}
    for c in corpora:
        corpus = c["key"]
        for rec in inv[corpus]["files"].values():
            for case in rec.get("cases", []):
                cls = case.get("cls") or ""
                if not cls:
                    continue
                o = observed.setdefault(cls, {"n": 0, "cids": set(),
                                              "cases": [], "corpus": corpus})
                o["n"] += 1
                o["cases"].append(case)
                m = _CID_RX.search(case.get("name", ""))
                if m:
                    o["cids"].add("C" + m.group(1))

    def _match(key: str) -> tuple[list[str], str]:
        """(matched observed classes, quality). 'exact' = a full or dotted-
        qualified name matched (a pytest class); 'base' = the path basename
        matched (vitest, where the test FILE is the unit and its name — e.g.
        `Foo.test.tsx` — is the identity). A UNIQUE match either way is a clean
        join; only a name matching MORE THAN ONE observed class is a collision."""
        exact = sorted(cls for cls in observed
                       if cls == key or cls.endswith("." + key))
        if exact:
            return exact, "exact"
        base = sorted(cls for cls in observed if cls.rsplit("/", 1)[-1] == key)
        return base, ("base" if base else "none")

    rows, claimed = [], set()
    tally = {"running": 0, "ambiguous": 0, "drift": 0, "unknown": 0}
    _none_kind = '<span class="sub">—</span>'
    _none_cid = '<span class="cid none">—</span>'
    for ln in claims:
        s = ln.strip()
        if not s.startswith("- "):
            continue
        key, _, intent = s[2:].partition("—")
        key, intent = key.strip(), intent.strip()
        if not key:
            continue
        matches, quality = _match(key)
        claimed.update(matches)
        intent_cell = md(intent) if intent else '<span class="sub">—</span>'
        key_cell = f"<code>{E(key)}</code>"
        if not matches:
            # DRIFT — "the class was removed" — may ONLY be asserted when junit is
            # COMPLETE. If ANY corpus's junit is missing (pytest ran, vitest
            # didn't) the no-match could be that missing file, not a removed
            # class, so the honest verdict is withheld. A matched claim still
            # reads running whatever the completeness — a match is a match.
            if junit_complete:
                tally["drift"] += 1
                rows.append(([_none_kind, key_cell, intent_cell, _none_cid,
                              '<span class="tag s-gap">DRIFT — claimed class not '
                              'running</span>'], ""))
            else:
                tally["unknown"] += 1
                rows.append(([_none_kind, key_cell, intent_cell, _none_cid,
                              '<span class="tag s-med">drift unknown — junit '
                              'incomplete</span>'], ""))
            continue
        # Match found — build the case list once, then grade it.
        n = sum(observed[c]["n"] for c in matches)
        cids = sorted({x for c in matches for x in observed[c]["cids"]},
                      key=lambda x: int(x[1:]))
        # The first few C-ids ride the summary; the row EXPANDS to the full case
        # list — replacing the old "+N" truncation with a real read.
        shown = " ".join(f'<span class="cid">{E(x)}</span>' for x in cids[:6])
        cases_cell = (f"{n} · {shown}" if shown
                      else f'{n} · <span class="cid none">—</span>')
        cases = [cc for c in matches for cc in observed[c]["cases"]]
        _corpus = observed[matches[0]]["corpus"]
        detail = case_rows({"cases": cases}, _corpus)
        _kind, _kcls = kindmap.get(_corpus, ("—", ""))
        kind_cell = (f'<span class="tag {_kcls}">{E(_kind)}</span>' if _kcls
                     else _none_kind)
        if len(matches) > 1:
            tally["ambiguous"] += 1
            state = (f'<span class="tag s-med">ambiguous — the name matches '
                     f"{len(matches)} classes; qualify the claim</span>")
        else:
            tally["running"] += 1
            state = '<span class="tag s-ok">running</span>'
        rows.append(([kind_cell, key_cell, intent_cell, cases_cell, state],
                     detail))
    return {"rows": rows, "verified": tally["running"],
            "running": tally["running"], "ambiguous": tally["ambiguous"],
            "drift": tally["drift"], "unknown": tally["unknown"],
            "unclaimed": len(set(observed) - claimed)}


def build_feature_pages(ctx) -> list[str]:
    """One page per baseline entity that has a card. Entities without a card are
    skipped — a feature page is never invented ahead of its section."""
    src = ctx.shell_src / "feature.html"
    written: list[str] = []
    if not src.exists():
        return written
    tpl = strip_slot_doc_comments(src.read_text())
    for s in ctx.sections:
        slug = s["entity"]
        card_path = ctx.center / "cards" / f"{slug}.md"
        if not card_path.exists():
            continue
        card = ctx.parse_card(card_path)
        rx = ENTITY_RX.get(slug, re.escape(slug))
        inv = entity_corpus(rx, ctx.junit_by, ctx.corpora)
        # The entity's own totals, computed ONCE: the title-bar pill and the
        # Tests tab quote the same variable, so they cannot drift apart.
        own = sum(inv[c["key"]]["cases"] for c in ctx.corpora)
        own_failed = sum(inv[c["key"]]["failed"] for c in ctx.corpora)
        _spec_glob = ctx.cfg.get("paths", {}).get(
            "e2e_spec_glob", "tests/web-e2e/**/*.spec.ts")
        matched = [p for p in sorted(glob.glob(_spec_glob, recursive=True))
                   if re.search(rx, p, re.I)]
        # A `*-ref-capture.spec.ts` runs the DESIGN LAB, not the product.
        # Counting it as journey verification is the same mistake as counting a
        # Storybook png as proof, one layer up.
        ref_specs = [p for p in matched if is_reference(Path(p).name)]
        specs = [p for p in matched if p not in ref_specs]

        _corpus_kpis = [
            kpi(f'{c["key"]} cases', str(inv[c["key"]]["cases"]),
                f'{len(inv[c["key"]]["files"])} files') for c in ctx.corpora]
        stats = '<div class="kpis">' + "".join([
            *_corpus_kpis,
            kpi("e2e specs", str(len(specs)), "no junit capture", alert=True),
            kpi("priority", s["rank"], f'adoption: {s["status"]}'),
        ]) + "</div>"

        # Overview — what it is · diagrams · what is still open · why it is the
        # way it is. Lens first, prose folded away; the two sections a reader
        # comes back for (growth + changelog) close the tab.
        proof_root = ctx.proof_root
        # The Action Ledger's single derivation (A+D): every open move, both
        # prices, one row. structure moves come from the 800-line budget on the
        # entity's files (measured on the archmap — read once).
        _emap = collect_entity_map(slug, ctx.repo_root) or {}
        over_files = [(f, n) for _lyr, f, n in _emap.get("files", []) if n > 800]
        # Project maturity is READ (BEHAVIOR.md, via ctx), never assumed. When it
        # is not declared the ripe split falls back to mvp AND every surface says
        # so — the page never invents a "from BEHAVIOR.md" provenance it did not
        # read.
        _mat_raw = (getattr(ctx, "maturity", "") or "").lower()
        _mat_declared = _mat_raw in _MATURITY_ORD
        maturity = _mat_raw if _mat_declared else "mvp"
        # Flow coverage — the card's # FLOWS joined to the proof sets on disk
        # (classified in _a3_evidence: explicit manifest role/flows win, inferred
        # roles say so, no signal = unclassified). Computed BEFORE the ledger so
        # unproven flows and unclassified sets become evidence moves; a broken
        # manifest degrades to "no coverage verdicts", never a dead build.
        _flows, _flows_bad = parse_flows(card.get("FLOWS", []))
        if _flows_bad:
            print(f"    ⚠ feature-{slug}.html: {len(_flows_bad)} FLOWS line(s) "
                  f"did not parse (grammar `- key [★] → desc`) — the coverage "
                  f"denominator excludes them")
        try:
            _cov = collect_coverage(ENTITY_PROOFS.get(slug, []), proof_root,
                                    _flows, malformed=_flows_bad)
        except Exception as _cov_err:                      # noqa: BLE001
            print(f"    ⚠ feature-{slug}.html flow coverage skipped: "
                  f"{type(_cov_err).__name__}: {_cov_err}")
            _cov = {"sets": [], "flows": _flows, "malformed": _flows_bad,
                    "covered_inferred": [], "unproven": [], "unclear": []}
        ledger_rows, ledger_closed = angle_rows(
            slug, inv, specs, ctx.walks, s, proof_root, ctx.corpora, ctx.e2e,
            over_files, maturity,
            flow_gaps=_cov["unproven"], unclear_sets=_cov["unclear"],
            flows_malformed=_cov["malformed"],
            inferred_cover=_cov["covered_inferred"])
        ledger_ripe = sum(1 for r in ledger_rows if r["ripe"])
        _lw = [w for w in ctx.walks if w.get("subject") == f"adopt:{slug}"]

        # Partition moves by the section that owns them (each appears once). The
        # bucket set is DERIVED (_LEDGER_DOMAINS); a row whose domain has no
        # bucket RAISES rather than vanishing from every table while still being
        # counted. The Risk domain's actions are the card's OPEN authored risks.
        _dom_rows = {d: [r for r in ledger_rows if r["domain"] == d]
                     for d in _LEDGER_DOMAINS}
        _unbucketed = sorted({r["kind"] for r in ledger_rows
                              if r["domain"] not in _LEDGER_DOMAINS})
        if _unbucketed:
            raise ValueError(
                f"ledger move(s) with no action-table bucket: {_unbucketed} — "
                f"map the kind in _ACTION_DOMAIN, or add the domain to "
                f"_DOMAIN_META / _DOMAIN_ORDER")
        _all_risks = parse_risks(card.get("RISKS", []))
        _dom_count = {**{d: len(v) for d, v in _dom_rows.items()},
                      "risk": len(_all_risks)}
        _dom_ripe = {d: sum(1 for r in v if r["ripe"]) for d, v in _dom_rows.items()}
        _dom_ripe["risk"] = sum(1 for r in _all_risks
                                if r[0].lower() in ("high", "medium"))
        # ONE universe of moves: machine moves + authored risks. The stat strip,
        # the status pill AND the dashboard note all read THIS total and THIS
        # ripe count, so the page can never show 6 in one place and 10 in
        # another. (Each ledger row is bucketed exactly once above, so this sum
        # equals the dashboard's sum of _dom_count by construction.)
        _moves_total = len(ledger_rows) + len(_all_risks)
        _moves_ripe = ledger_ripe + _dom_ripe["risk"]

        def _action_block(domain: str, id_: str, link_label: str,
                          link_href: str) -> str:
            label, _a, covers = _DOMAIN_META[domain]
            rows = _dom_rows[domain]
            return action_table(
                f"Pending — {covers}", rows, id_=id_, link_label=link_label,
                link_href=link_href,
                note=f"{len(rows)} pending {label} move(s) · ripe-first, then "
                     f"cheapest. Both prices ride the row; the record is below. "
                     f"⊕ expands a cut cell.")

        picker = diagram_picker(slug, card)
        # --- Overview order: the ACTION LEDGER leads (action items on top),
        # then the feature card (identity), diagrams, and the changelog. ------
        nav = [("sec-ov-actions", "Actions", _IC_SEED),
               ("sec-ov-card", "What it is", _IC_DOC)]
        if picker:
            nav.append(("sec-ov-diagrams", "Diagrams", _IC_FLOW))
        nav.append(("sec-ov-changelog", "Changelog", _IC_COMMIT))

        # 1 · Action Ledger block ---------------------------------------------
        _ledger_block = sechead(
            "Action", "Action Ledger", "#b45309", _IC_SEED,
            sub="the dashboard of what to do next on this entity — grouped by the "
                "section that owns each move (project maturity: "
                + (maturity if _mat_declared
                   else f"{maturity} — assumed; not declared in BEHAVIOR.md")
                + ")",
            id_="sec-ov-actions",
            note=f"{_moves_total} pending move(s) across {len(_DOMAIN_ORDER)} "
                 f"areas. Each area's full table sits at the TOP of its own "
                 f"section — use Jump. Only “Other” (no section home) has its "
                 f"table here.",
            info='<div class="leg">Every move lives in exactly ONE area. The '
                 "summary below counts each area and jumps to it; each area's "
                 "full table is at the TOP of its own section (Code · Tests · "
                 "Evidence · Risk). Both prices ride each row — what it buys if "
                 "we do, what it risks if we don't — plus the recurring cost. "
                 "“Other” has no section, so its table lives here. The record "
                 "tabs below say only what already exists.</div>"
                 + legend("Kind:", [
                     ("l-api", "integration", "·"), ("l-web", "unit", "·"),
                     ("l-mobile", "journey", "·"), ("l-models", "coverage", "·"),
                     ("l-services", "manual · structure", "·"),
                     ("l-schemas", "deployed", "·"),
                     ("l-evidence", "evidence", "proof artifacts")])
                 + legend("Effort:", [
                     ("e-xs", "XS", "minutes ·"), ("e-s", "S", "hours ·"),
                     ("e-m", "M", "a day ·"), ("e-l", "L", "days, new machinery")])
                 + legend("Ripe?", [
                     ("s-ok", "ripe now", "stage ≤ project maturity ·"),
                     ("s-gap", "later", "worth doing at a later maturity — kept "
                      "visible, never urgent")]))
        _adopt = s["status"]
        _ledger_block += _stat_strip([
            (_KPI_SEED, str(_moves_total), "open moves", f"{_moves_ripe} ripe now"),
            (_KPI_CLOCK, str(_moves_total - _moves_ripe), "later",
             "stage above maturity"),
            (_KPI_TREND, maturity if _mat_declared else "not set", "maturity",
             "from BEHAVIOR.md" if _mat_declared
             else "not declared · assuming mvp"),
            (_KPI_CHECK, _STATUS_SHORT.get(_adopt, _adopt), "adoption",
             f"{_adopt} · {len(_lw)} walk(s)"),
        ])
        _dash = []
        for d in _DOMAIN_ORDER:
            label, anchor, covers = _DOMAIN_META[d]
            n, rp = _dom_count[d], _dom_ripe[d]
            jump = (f'<a class="dlink" href="#{anchor}">open {E(label)} ↗</a>'
                    if d != "other" else
                    '<a class="dlink" href="#sec-ov-act-other">see below ↓</a>')
            _dash.append([
                f'<b>{E(label)}</b>', str(n),
                (f'<span class="tag s-ok">{rp}</span>' if rp
                 else '<span class="sub">—</span>'),
                E(covers), jump])
        _ledger_block += table(
            ["Area", "Pending", "Ripe", "What it covers", "Jump"], _dash,
            num={1})
        _ledger_block += _action_block("other", "sec-ov-act-other",
                                       "top of the ledger", "sec-ov-actions")
        if ledger_closed:
            _ledger_block += ('<p class="sub">Closed this build — no row (only OPEN '
                              "moves surface): " + " · ".join(
                                  f'<span class="tag s-ok">{E(c)}</span>'
                                  for c in ledger_closed) + "</p>")

        # 2 · Feature card block (identity) -----------------------------------
        _card_block = sechead(
            "Docs", "The feature card", "#8e4585", _IC_DOC,
            sub="the entity in one handle, one analogy and one constraint box",
            id_="sec-ov-card",
            info='<div class="leg">Authored in '
                 f"<code>cards/{E(slug)}.md</code> — the only hand-written "
                 "source on this page. Everything counted elsewhere is read "
                 "from the codebase at build time.</div>")
        _card_block += lens_block(card)
        # ENTITIES is covered by the Code tab's data model — it does not repeat.
        detail = "".join(
            f"<h3>{E(sec.title())}</h3>{card_html(card.get(sec, []))}"
            for sec in ("WHAT & WHY", "FOR WHOM", "FLOWS", "IS", "IS NOT")
            if card.get(sec))
        if detail:
            _card_block += (f'<details class="more"><summary>Full card — what &amp; '
                            f'why, for whom, flows, is / is not</summary>{detail}'
                            f"</details>")

        # 3 · Diagrams block ---------------------------------------------------
        _diagrams_block = ""
        if picker:
            _diagrams_block = sechead(
                "Docs", "Diagrams", "#4f46e5", _IC_FLOW,
                sub="one at a time — the flow, the data and the state machine",
                id_="sec-ov-diagrams") + picker

        # 4 · Changelog block --------------------------------------------------
        _changelog_block = sechead(
            "Docs", "Changelog — decisions that shaped it", "#8a6d1a", _IC_COMMIT,
            sub="why the entity behaves the way it does", id_="sec-ov-changelog",
            note="Source: the entity card's DECIDED section. A decision here is "
                 "a rule the code obeys, not a plan — the ones with ids are in "
                 "`.kdbp/DECISIONS.md`.")
        dec_rows = []
        for ln in card.get("DECIDED", []):
            t = ln.strip().removeprefix("- ")
            head, sep, rest = t.partition("—")
            if sep and len(head.strip()) <= 40:
                dec_rows.append([f'<b>{md(head.strip())}</b>', md(rest.strip())])
            elif t:
                dec_rows.append(['<span class="sub">—</span>', md(t)])
        _changelog_block += table(
            ["Decision", "What it settles"], dec_rows)

        overview = (subnav(nav) + _ledger_block + _card_block
                    + _diagrams_block + _changelog_block)

        # Code tab — the technical decode. Card intro (authored) + AST-parsed
        # endpoints / code map / data model. No mapping yet -> a named gap.
        code_tab = build_code_tab(slug, ctx.repo_root,
                                  card_html(card.get("CODE", [])))
        if not code_tab:
            code_tab = gap("Code decode", f"_a3_code.ENTITY_CODE['{slug}'] mapping")
        # Action table at the TOP of the section, then the record decode.
        code_tab = _action_block("code", "sec-code-actions",
                                 "all actions on Overview", "sec-ov-actions") + code_tab

        # Tests tab — kinds FIRST (what verifies this entity, with its pass
        # proportion), then the per-file matrix whose rows open onto their own
        # cases. Every count here is read from junit at build time; the card
        # contributes only the INTENT of each kind, which rides in the ⊕ toggle.
        walks_here = [w for w in ctx.walks if w.get("subject") == f"adopt:{slug}"]
        _e2e_runner = ctx.e2e.get("runner", "playwright")
        _gap_tag = ctx.e2e.get("junit_gap_tag", "local-only")
        _cov_gate = ctx.e2e.get("coverage_gate", "the coverage gate")
        _corpus_kind_rows = [
            [f'<span class="tag {c["tag_class"]}">{c["kind"]}</span>',
             f'{c["runner"]} ({c["kind_detail"]})',
             str(inv[c["key"]]["cases"]), f'{len(inv[c["key"]]["files"])} file(s)',
             meter(inv[c["key"]]["cases"] - inv[c["key"]]["failed"], inv[c["key"]]["cases"]),
             kind_state(inv[c["key"]])] for c in ctx.corpora]
        _kind_rows = _corpus_kind_rows + [
            ['<span class="tag l-mobile">journey</span>', f"{_e2e_runner} (e2e)",
             "—",
             f"{len(specs)} spec(s) on disk"
             + (f'<br><small>+{len(ref_specs)} reference-capture spec(s) held '
                f"out — they run the design lab, not the product</small>"
                if ref_specs else ""),
             meter(0, 0),
             f'<span class="tag s-gap">no junit capture ({_gap_tag})</span>'],
            ['<span class="tag l-models">coverage</span>',
             f"pytest --cov (repo gate {_cov_gate})", "—", "not sliced per entity",
             meter(0, 0), '<span class="tag s-gap">named gap</span>'],
            ['<span class="tag l-services">manual</span>', "operator walks",
             str(len(walks_here)), "walks.jsonl", meter(0, 0),
             ('<span class="tag s-ok">recorded</span>' if walks_here
              else '<span class="tag s-gap">none on record</span>')],
            ['<span class="tag l-schemas">deployed</span>', "probes", "—",
             "nothing probes the deployed surface", meter(0, 0),
             '<span class="tag s-gap">absent</span>'],
        ]
        # Matrix — GROUPED by corpus (like the data model's models/schemas),
        # each an expandable-row table: click a file row to read its cases in
        # place. The Kind column is retired into the coloured group title.
        _matrix_groups, _matrix_nfiles = "", 0
        for c in ctx.corpora:
            corpus, kind, kcls = c["key"], c["kind"], c["tag_class"]
            files = sorted(inv[corpus]["files"].items(), key=lambda x: -x[1]["tests"])
            if not files:
                continue
            _matrix_nfiles += len(files)
            _rows = []
            for fname, rec in files:
                ran = rec["tests"] - rec["skipped"]
                cells = [f"<code>{E(fname)}</code>", str(rec["tests"]),
                         meter(rec["tests"] - rec["failed"], rec["tests"]),
                         f'<span class="pct">{ran}/{rec["tests"]}</span>',
                         file_flags(rec, shared_owners(fname, slug))]
                _rows.append((cells, case_rows(rec, corpus)))
            _matrix_groups += (
                f'<p class="sub"><span class="tag {kcls}">{E(kind)}</span> '
                f"{len(files)} {E(corpus)} file(s) — click a row to read its "
                f"cases:</p>"
                + xtable(["File", "Cases", "Passing", "Ran", "Flags"], _rows,
                         widths=["2.4fr", "0.7fr", "1fr", "0.8fr", "1.3fr"]))
        # Claimed coverage — the accumulator that LEADS the tab: card # CLAIMS
        # joined to the run by the class NAME. DRIFT is asserted only when junit
        # is COMPLETE — EVERY corpus loaded (using the per-corpus `present` field
        # entity_corpus carries). A partial outage (pytest ran, vitest didn't)
        # makes no-match claims "drift unknown", never a blanket false DRIFT.
        _junit_complete = all(inv[c["key"]]["present"] for c in ctx.corpora)
        cv = claim_verdicts(card.get("CLAIMS", []), inv, ctx.corpora,
                            _junit_complete)
        if cv["rows"]:
            _amb = (f' · {cv["ambiguous"]} ambiguous' if cv["ambiguous"] else "")
            _unk = (f' · {cv["unknown"]} unknown (junit incomplete)'
                    if cv["unknown"] else "")
            claim_section = (
                sechead("Testing", "Claimed coverage", "#0d9488", _IC_CHECK,
                        sub="the case classes this entity claims to test, and "
                            "whether each still runs — the accumulator the matrix "
                            "is measured against",
                        id_="sec-tests-claims",
                        note=f'{cv["running"]} claim(s) running · {cv["drift"]} '
                             f'drifted{_amb}{_unk} · {cv["unclaimed"]} running '
                             f'class(es) not yet claimed — click a claim to read '
                             f'its cases. A drifted claim is a test that was '
                             f'promised and is gone.',
                        info='<div class="leg">Authored in the card '
                             "<code># CLAIMS</code> — one line per test class with "
                             "its intent. The build joins each claim to the run by "
                             "the class NAME (the C-ids are read from the matched "
                             "cases and shown, not the join key); a claimed class "
                             "no longer running is DRIFT, a match by short name or "
                             "to several classes is AMBIGUOUS, and if no junit "
                             "loaded at all the verdict is withheld. Click a "
                             "running claim to read its cases.</div>"
                             + legend("Claim state:", [
                                 ("s-ok", "running", "the class is in junit ·"),
                                 ("s-med", "ambiguous / unknown",
                                  "short-name match, or junit absent ·"),
                                 ("s-gap", "DRIFT", "claimed, not running")]))
                + xtable(["Kind", "Class", "Intent", "Cases · C-ids", "State"],
                         cv["rows"],
                         widths=["0.9fr", "1.3fr", "2fr", "1.7fr", "1fr"]))
        else:
            claim_section = (
                sechead("Testing", "Claimed coverage", "#0d9488", _IC_CHECK,
                        sub="no claims authored for this entity yet",
                        id_="sec-tests-claims")
                + '<p class="sub">The card has no <code># CLAIMS</code> section '
                  "yet — the matrix below is the machine truth; a claim card would "
                  "add the authored intent and the drift check on top of it.</p>")
        # Order (after the Pending action table, which is prepended below):
        # Kinds & coverage (the fast testing snapshot) → Claimed coverage →
        # Matrix (per file).
        tests_tab = (
            subnav([("sec-tests-kinds", "Kinds & coverage", _IC_CHECK),
                    ("sec-tests-claims", "Claims", _IC_CHECK),
                    ("sec-tests-matrix", "Matrix", _IC_GRID)])
            + sechead("Testing", "Kinds & coverage", "#15803d", _IC_CHECK,
                      sub=f"{own:,} automated case(s) · {own_failed} failed — "
                          f"what verifies this entity, "
                          f"how much of it runs, and what each kind is for",
                      id_="sec-tests-kinds",
                      note="Cases, files and the passing proportion are read from "
                           "the junit capture at build time. A kind with no "
                           "machine record shows its gap instead of a zero — "
                           "open ⊕ above for what each kind is for here.",
                      info=legend("Kind colors:", [
                          ("l-api", "integration", "API through HTTP ·"),
                          ("l-web", "unit", "components in isolation ·"),
                          ("l-mobile", "journey", "real browser flows ·"),
                          ("l-models", "coverage", "lines executed ·"),
                          ("l-services", "manual", "a human walked it ·"),
                          ("l-schemas", "deployed", "probes against the live app")])
                      + angles_html(card.get("ANGLES", [])))
            + table(["Kind", "Runner", "Cases", "Where", "Passing", "State"],
                    _kind_rows, num={2})
            + claim_section
            + sechead("Testing", "Matrix — per file", "#4f46e5", _IC_GRID,
                      sub="every test file touching this entity — open a row "
                          "to read its cases",
                      id_="sec-tests-matrix",
                      note=f"{own} automated case(s) across {_matrix_nfiles} "
                           "file(s), grouped by corpus, all read from the junit "
                           "capture — never hand-listed.",
                      info='<div class="leg">Passing = cases that did not fail. '
                           "Ran = cases that were not skipped (a skipped case "
                           "is claimed coverage that did not execute). Flags "
                           "name a file's issues; a file with none reads "
                           '<span class="tag s-ok">clean</span>. Opening a row '
                           "lists its cases with the C-id that joins each one "
                           "to a claim.</div>"
                      + legend("Line coverage is NOT on this table:", [
                          ("s-gap", "named gap",
                           "the repo --cov gate is not sliced per entity")]))
            + _matrix_groups)

        # Evidence — a header table of the entity's proof sets, each row opening
        # onto its own galleries; artifacts open in the in-page viewer. Built
        # from disk + each set's manifest.json (see _a3_evidence).
        # Every risky manifest read lives in build_evidence_tab; the leaf-value
        # coercions in _a3_evidence handle the known bad shapes, and this backstop
        # catches any I did not enumerate — a malformed proof manifest degrades
        # ONE entity's Evidence tab to a named gap, never aborts the whole build.
        try:
            evidence = build_evidence_tab(
                _cov, ctx.labels.get(slug, slug).lower())
        except Exception as _ev_err:                       # noqa: BLE001
            print(f"    ⚠ feature-{slug}.html Evidence tab degraded to a gap: "
                  f"{type(_ev_err).__name__}: {_ev_err}")
            evidence = gap("Proof sets", f"proof manifest unreadable "
                                         f"({type(_ev_err).__name__})")
        if not evidence:
            evidence = gap("Proof sets", f"_a3_feature.ENTITY_PROOFS['{slug}']")
        evidence = _action_block("evidence", "sec-ev-actions",
                                 "all actions on Overview", "sec-ov-actions") + evidence
        # Tests action table fronts the Tests tab (kinds/matrix are the record).
        tests_tab = _action_block("tests", "sec-tests-actions",
                                  "all actions on Overview", "sec-ov-actions") + tests_tab

        # Risk — one register. Authored lines carry the judgments a machine
        # cannot make; the unverified angles JOIN THEM as GAP rows rather than
        # sitting in a separate list, because an unverified surface is a risk
        # and a bare list of gaps beside a risk table is redundant twice over.
        # ONE consolidated table: every authored risk mapped onto the ledger
        # columns (the Code/Tests shape) — no pending/register split, no GAP
        # rows (those angles live in their own sections now).
        risk = (
            subnav([("sec-risk-register", "Risk actions", _IC_ALERT),
                    ("sec-risk-dropped", "Not carried forward", _IC_INBOX)])
            + sechead("Risk", "Risk register — priced as actions", "#d1443c",
                      _IC_ALERT,
                      sub="every authored risk as one action row — the exposure "
                          "now, the move to close it, and the stake if we don't; "
                          "matched to the Code/Tests columns",
                      id_="sec-risk-register",
                      note=f"{len(_all_risks)} authored risk(s). The move is "
                           "derived from each risk's status. ⊕ expands the "
                           "exposure or the stake.",
                      info='<div class="leg">One row per authored risk (the '
                           "card's RISKS section, re-verified prose), in the "
                           "action shape the other sections use — minus Effort "
                           "and recurring cost, which a risk does not carry: its "
                           "weight is the SEVERITY and the stake. The mitigation "
                           "move is derived from each risk's status.</div>"
                           + legend("Severity:", [
                               ("s-high", "HIGH", "act soon ·"),
                               ("s-med", "MEDIUM", "watch / tracked ·"),
                               ("s-low", "LOW", "mitigated, tripwired")]))
            + table(_RISK_LEDGER_COLS, _risk_ledger_render(_all_risks),
                    widths=_RISK_W)
            + sechead("Risk", "Not carried forward", "#8a6d1a", _IC_INBOX,
                      sub="claims the legacy pages made that this page refuses "
                          "to repeat, and why", id_="sec-risk-dropped")
            + (card_html(card.get("NOT CARRIED FORWARD", []))
               or '<p class="sub">Nothing was dropped when this section was '
                  "adopted.</p>"))
        # The Decisions changelog used to close this tab; the operator moved it
        # to Overview, beside the growth list — what is open and why it is the
        # way it is belong together, ahead of the risk pricing.

        html_out = tpl
        # The sticky bar carries THIS entity's numbers, not the repo's. The
        # shared pill (repo totals) read as an entity verdict on an entity page
        # — a reader who saw "1,448 tests · 0 failed" beside KPIs of 87/141/7
        # formed the verdict there and never opened the tabs that qualify it.
        # Each pill LINKS to the section that owns its number, and the number is
        # a landmark there — not a footnote. The moves pill goes to the Action
        # Ledger (what to do next); the status pill to the Risk register. The
        # moves pill reads the SAME total the ledger's stat strip and dashboard
        # do, so the three never disagree.
        # A card with zero matching cases is NOT a pass — a green "0 cases · 0
        # failed" is the loudest false-pass a not-yet-built entity can wear, so
        # own==0 gets its own amber "no cases yet" state.
        if own == 0:
            _cases_cls, _cases_txt = "warn", "no cases yet"
        else:
            _cases_cls = "warn" if own_failed else "ok"
            _cases_txt = f'{own:,} cases · {own_failed} failed'
        entity_pills = (
            f'<a class="statuspill {_cases_cls}" '
            f'href="#sec-tests-kinds" title="Tests → Kinds &amp; coverage">'
            f'{_cases_txt}</a> '
            f'<a class="statuspill {"warn" if _moves_ripe else "ok"}" '
            f'href="#sec-ov-actions" title="Overview → Action Ledger">'
            f'{_moves_total} moves · {_moves_ripe} ripe</a> '
            f'<a class="statuspill {"warn" if s["status"] != "approved" else "ok"}" '
            f'href="#sec-risk-register" title="Risk → register">'
            f'{E(s["status"])}</a>')
        for tok, val in {**ctx.shared, **{
            "{{STATUS_PILLS}}": entity_pills,
            "{{SUBJECT_TITLE}}": E(ctx.labels.get(slug, slug)),
            "{{SUBJECT_LEDE}}": md(" ".join(card.get("HANDLE", []))),
            "{{SUBJECT_HEADLINE_STATS}}": stats,
            "{{TAB_OVERVIEW}}": overview,
            "{{TAB_CODE}}": code_tab,
            "{{TAB_TESTS}}": tests_tab,
            "{{TAB_EVIDENCE}}": evidence,
            "{{TAB_RISK}}": risk,
        }}.items():
            html_out = html_out.replace(tok, val)
        out_path = getattr(ctx, "center_out", ctx.center) / f"feature-{slug}.html"
        out_path.write_text(html_out)
        written.append(out_path.name)
    return written
