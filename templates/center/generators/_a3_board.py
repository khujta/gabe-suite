"""Testing Command Center — the BOARD station.

The board answers "what are my available moves?" so that "what's next?" is a
choice instead of a question. It replaces the old rail-plus-three-lanes page,
which could only ever show one phase as current and left every other live
thread — owed walks, ripening fixes, priced debt, the scope arc — in the
operator's head.

It is a PROJECTION, never a database (operator ruling 2026-07-25). Cards move
when PLAN.md / PENDING.md / adoption.json move; nothing here is draggable and
nothing is stored, because a manipulable card becomes a second source of truth
competing with the files it was derived from.

FIVE TRACKS, all machine-derived:

  verify  adoption.json §sections checklist + .kdbp/walks.jsonl
  prove   archmap.json §coverage.unproven — flows no test claims
  build   PLAN.md phases owing lifecycle cells + unbuilt adoption.flows
  debt    PENDING.md rows (live + .kdbp/archive/PENDING-resolved_*.md)
  arc     SCOPE.md §Phases / ROADMAP.md — not yet pulled into a plan

SIX FRAMINGS over one card set — state (landing) · track · entity · effort ·
age · done. The first five column the OPEN cards; `done` switches population.

Two honesty rules the spike settled (docs/investigations/2026-07-25-board-spike/):

  * ENTITY ATTRIBUTION IS PATH-DERIVED OR ABSENT. No keyword fallback. A cell
    naming no archmap path reads `cross-cutting`, which is a real answer — a
    tooling debt has no entity. Roughly half of the guesses the keyword
    fallback used to make were wrong, and a confidently wrong chip is worse
    than an honest blank.
  * EFFORT IS PRICED FROM RECORDED LINE COUNTS where archmap has them, and
    stamped `~inferred` where it does not.
"""

from __future__ import annotations

import re

import _a3_guard
import _center_data as D
from _a3_render import E, entity_color, kpi, trunc

# --------------------------------------------------------------------------- #
# vocabulary
# --------------------------------------------------------------------------- #
TRACKS = {
    "verify": ("Verify", "#b45309",
               "An entity's evidence is built and waiting on a human eye."),
    "prove": ("Prove", "#3f6d4c",
              "A named flow that no test claims — the born-red candidates."),
    "build": ("Build", "#1f6feb",
              "A planned phase with lifecycle cells still unticked."),
    "debt": ("Debt", "#b3403a",
             "An open deferred finding, priced and dated."),
    "guard": ("Guard", "#c2461e",
              "Code that is used but that no test names — change it and "
              "no NAMED case goes red."),
    "arc": ("Arc", "#5a53a8",
            "A scope phase not yet pulled into a plan — the long horizon."),
}
TRACK_ORDER = ["verify", "prove", "guard", "build", "debt", "arc"]

STATES = [
    ("owed_to_you", "Owed to you", "#b45309",
     "Nobody else can clear these. A walk, an approval, a founder ruling — "
     "the machine has done all it can."),
    ("ripe", "Ripe now", "#16794c",
     "Prerequisites already met and the cost is small. Pick from here when "
     "you have a gap, not a day."),
    ("ready", "Ready", "#0d6e78",
     "Nothing blocks it, but it is not cheap or not yet scoped. The honest "
     "backlog."),
    ("inflight", "In flight", "#1f6feb",
     "Started — at least one cell ticked, at least one owed."),
    ("blocked", "Blocked", "#b3403a",
     "Gated by a decision, not by neglect. Escalate, don't re-triage."),
    ("parked", "Parked", "#7a8595",
     "Deliberately later. Here so it stays visible, not so it nags."),
]

EFFORTS = [("XS", "XS · minutes", "#16794c"), ("S", "S · under an hour", "#0d6e78"),
           ("M", "M · a sitting", "#b45309"), ("L", "L · a phase", "#b3403a")]

AGES = [
    ("fresh", "This week", "#16794c", "Recorded in the last 7 days."),
    ("recent", "8 – 30 days", "#0d6e78", "Still current."),
    ("aging", "1 – 3 months", "#b45309", "Old enough to re-read before acting."),
    ("stale", "Over 3 months", "#b3403a",
     "Carried for a quarter. Either it matters or it should be closed."),
    ("undated", "Undated", "#7a8595",
     "No creation date is recorded anywhere in the repo — PLAN phases and "
     "scope arcs carry none."),
]

RECENCY = [
    ("d7", "Last 7 days", "#16794c", ""),
    ("d30", "Last 30 days", "#0d6e78", ""),
    ("d90", "Last 90 days", "#b45309", ""),
    ("older", "Older", "#5a53a8", ""),
    ("undated", "Undated", "#7a8595",
     "Closed, but no resolution date was recorded."),
]

MODES = [("state", "State", "what can I actually pick up"),
         ("track", "Track", "what kind of work is it"),
         ("entity", "Entity", "where does each domain stand"),
         ("effort", "Effort", "how much time do I have"),
         ("age", "Age", "what is going stale"),
         ("done", "Done", "what I have finished, newest first")]

CELLS = ["Red", "Exec", "Review", "Commit", "Push", "Center"]
GLYPH = {"done": "✅", "in_progress": "🔄", "todo": "⬜", "paused": "⏸",
         "n/a": "—"}
CAP = 8          # cards shown before a column folds the rest away
EORDER = {"XS": 0, "S": 1, "M": 2, "L": 3}
SORDER = {k: i for i, (k, *_ ) in enumerate(STATES)}


def phase_id(p: dict) -> str:
    """The id to SHOW and to look up in the ledger.

    load_plan derives `id` by partitioning the Phase cell on "·", which suits a
    table whose Phase reads "W1 · Token foundation" but not one whose `#`
    column already carries the id and whose Phase is plain prose — there the
    partition returns the whole name as the id, so a card titled itself twice
    and the ledger lookup for "P4" never matched. When no separator was found,
    id == name; fall back to the `#` column, which is the id in that layout.
    """
    return p["num"] if p.get("id") == p.get("name") else p.get("id") or p["num"]


def age_bucket(n):
    if n is None:
        return "undated"
    return ("fresh" if n <= 7 else "recent" if n <= 30
            else "aging" if n <= 90 else "stale")


def recency_bucket(n):
    if n is None:
        return "undated"
    return "d7" if n <= 7 else "d30" if n <= 30 else "d90" if n <= 90 else "older"


def human_age(n):
    if n is None:
        return "undated"
    if n < 31:
        return f"{n}d"
    if n < 365:
        return f"{round(n / 30.4)}mo"
    return f"{n // 365}y"


# --------------------------------------------------------------------------- #
# entity attribution — path-derived or absent
# --------------------------------------------------------------------------- #
def _expand_braces(tok: str) -> list[str]:
    """`features/{cooking,shopping}/**` → both branches. A brace list is how a
    row says "this spans these domains"; collapsing it to one guess is what
    produced the wrong chips."""
    m = re.search(r"\{([^{}]*)\}", tok)
    if not m:
        return [tok]
    out: list[str] = []
    for part in m[1].split(","):
        out += _expand_braces(tok[:m.start()] + part.strip() + tok[m.end():])
    return out


def cite_tokens(cell: str) -> list[str]:
    """A File cell normalised into candidate path tokens. These cells are prose
    as often as paths: `apps/api (DB) + tests`, `config.py:176-178`."""
    if not cell or cell in ("—", "-"):
        return []
    clean = re.sub(r"[`*]", " ", cell)
    clean = re.sub(r"\([^)]*\)", " ", clean)
    toks = []
    # Expand braces BEFORE splitting on separators. A brace list contains
    # commas, so splitting first tore `features/{cooking,shopping}/**` into
    # `features/{cooking` and `shopping}/**` and the expansion never ran —
    # every multi-domain citation resolved to nothing.
    for branch in _expand_braces(clean):
        for raw in re.split(r"[\s,+]+", branch):
            tok = re.sub(r"/\*+$", "", raw.strip().split(":")[0]).strip("/ ")
            if (tok and "/" in tok) or tok.endswith(
                    (".py", ".ts", ".tsx", ".json", ".mjs")):
                toks.append(tok)
    return toks


AREA_BY_SEGMENT = {
    "api": "api", "backend": "api", "server": "api",
    "web": "web", "frontend": "web", "client": "web",
    "mobile": "mobile", "app": "mobile",
    "scripts": "tooling", "tools": "tooling", "bin": "tooling",
    ".kdbp": "process", "docs": "docs", ".github": "ci",
    "data": "data", "shared": "shared", "packages": "shared",
    "infra": "infra", "deploy": "infra",
}


def area_of(cell: str):
    """WHERE the work lives — matched on path SEGMENTS, never on prefixes.
    Prefix rules written against one twin's layout (`apps/api`, `apps/web`)
    labelled the other twin's entire codebase "tooling", 69 of 96 debt rows."""
    if not cell or cell in ("—", "-"):
        return None
    for tok in cite_tokens(cell) or [re.sub(r"[`*]", "", cell)]:
        segs = [s for s in tok.split("/") if s]
        if any(s.startswith("web-e2e") or s == "e2e" for s in segs):
            return "e2e"
        if segs and segs[0] == "tests":
            return "tests"
        for s in segs:
            if s in AREA_BY_SEGMENT:
                return AREA_BY_SEGMENT[s]
    return None


class Attributor:
    """Maps a cited File cell onto the entities that own those paths."""

    def __init__(self, archmap: dict, labels: dict):
        self.labels = labels
        self.owner: dict[str, str] = {}
        self.lines: dict[str, int] = {}
        for slug, ent in (archmap.get("entities") or {}).items():
            for f in ent.get("files", []):
                if isinstance(f, (list, tuple)) and len(f) >= 2:
                    path, n = f[1], (f[2] if len(f) > 2 else None)
                else:
                    path, n = f, None
                self.owner.setdefault(path, slug)
                if n is not None:
                    self.lines.setdefault(path, n)
        self.by_stem: dict[str, set] = {}
        for path, slug in self.owner.items():
            self.by_stem.setdefault(path.rsplit("/", 1)[-1], set()).add(slug)

    def __call__(self, cell: str) -> tuple[list[str], list[str]]:
        weight: dict[str, int] = {}
        matched: list[str] = []
        toks = cite_tokens(cell)
        for tok in toks:
            for path, slug in self.owner.items():
                if path == tok or path.startswith(tok.rstrip("/") + "/"):
                    weight[slug] = weight.get(slug, 0) + 1
                    matched.append(path)
        if not weight:                       # basename hit — still a path fact
            for tok in toks:
                owners = self.by_stem.get(tok.rsplit("/", 1)[-1])
                if owners and len(owners) == 1:
                    slug = next(iter(owners))
                    weight[slug] = weight.get(slug, 0) + 1
        slugs = sorted(weight, key=lambda s: -weight[s])
        # A citation sweeping in most of the registry is not an attribution:
        # `apps/web/src` really does contain every entity's files. Past half
        # the registry the honest label is cross-cutting.
        if len(slugs) > max(2, len(self.labels) // 2):
            return [], matched
        return slugs, matched


# --------------------------------------------------------------------------- #
# card model
# --------------------------------------------------------------------------- #
def _card(**kw) -> dict:
    kw.setdefault("entities", [])
    kw.setdefault("area", None)
    kw.setdefault("priority", None)
    kw.setdefault("gate", None)
    kw.setdefault("ripe", False)
    kw.setdefault("ripe_why", "")
    kw.setdefault("done", False)
    kw.setdefault("created", None)
    kw.setdefault("closed", None)
    kw.setdefault("last_activity", None)
    kw.setdefault("effort", None)
    kw.setdefault("effort_basis", "")
    kw.setdefault("inferred", [])
    kw.setdefault("cells", None)
    kw.setdefault("owes", [])
    kw["age_days"] = D.days_since(kw.get("created"))
    kw["closed_days"] = D.days_since(kw.get("closed"))
    c, x = D.as_date(kw.get("created")), D.as_date(kw.get("closed"))
    kw["cycle_days"] = (x - c).days if (c and x) else None
    return kw


def build_cards(*, plan, sections, archmap, adoption, labels, entity_href,
                pending=None) -> list[dict]:
    """Every open move plus every closed one, from the committed data alone."""
    attribute = Attributor(archmap, labels)
    clock = D.phase_clock()
    cards: list[dict] = []

    # --- verify: an entity's evidence awaits a human eye --------------------
    for s in sections:
        slug = s["entity"]
        checklist = s.get("checklist") or {}
        unchecked = [k for k, v in checklist.items() if not v]
        if s.get("status") == "approved" and not unchecked:
            continue
        only_walk = unchecked == ["walk_recorded"]
        adopted = re.search(r"[Aa]dopted (20\d\d-\d\d-\d\d)", str(s.get("notes") or ""))
        cards.append(_card(
            id=f"verify:{slug}", track="verify", entities=[slug],
            title=f"Walk & approve {labels.get(slug, slug)}",
            detail=("Checklist is complete — the page is built, the gate is "
                    "green, the proofs are curated. What's left is one human "
                    "walk." if only_walk else
                    "Adoption owes: " + ", ".join(k.replace("_", " ")
                                                  for k in unchecked)),
            # only the operator can clear a walk — nobody else, ever
            state="owed_to_you", owes=unchecked,
            checklist_done=sum(1 for v in checklist.values() if v),
            checklist_total=len(checklist),
            ripe=only_walk,
            ripe_why=("the checklist is already satisfied bar one item, and "
                      "that item is a walk" if only_walk else ""),
            effort="XS" if only_walk else "M",
            effort_basis=("checklist arithmetic — 1 unchecked item, and it is "
                          "a walk" if only_walk
                          else f"{len(unchecked)} unchecked checklist items"),
            area="product",
            created=(adopted[1] if adopted else adoption.get("started")),
            # a 0/7 checklist does not need a walk, it needs adoption: naming
            # the wrong command sends the operator to a beat whose
            # preconditions are not met
            cmd=(f"record walk: {slug} → walks.jsonl" if only_walk
                 else f"/gabe-cc-init section {slug}"),
            href=entity_href(slug), source="adoption.json §sections"))

    for w in D.load_walks():
        subj = str(w.get("subject", ""))
        slug = subj.split(":", 1)[-1]
        cards.append(_card(
            id=f"walk:{subj}:{w.get('when', '')}", track="verify",
            entities=[slug] if slug in labels else [],
            title=f"Walked {labels.get(slug, subj)}"
                  + (" — section approved" if subj.startswith("adopt:") else ""),
            detail=str(w.get("note") or "")[:220] or f"result: {w.get('result')}",
            state="done", done=True, closed=str(w.get("when") or ""),
            created=str(w.get("when") or ""), area="product",
            walker=w.get("who"), result=w.get("result"),
            href=entity_href(slug) if slug in labels else "index.html",
            source=".kdbp/walks.jsonl"))

    # --- prove: a named flow no test claims ---------------------------------
    for slug, cov in (archmap.get("coverage") or {}).items():
        unproven = cov.get("unproven") or []
        if not unproven:
            continue
        proven = cov.get("covered", 0)
        cards.append(_card(
            id=f"prove:{slug}", track="prove", entities=[slug],
            title=f"{len(unproven)} unproven flow(s) on {labels.get(slug, slug)}",
            detail="No test claims: " + ", ".join(unproven),
            state="ready", flows=unproven, area="tests",
            ripe=proven > 0,
            ripe_why=(f"{proven} sibling flow(s) already carry claiming tests — "
                      "the corpus and fixtures exist, only the case is missing"
                      if proven else ""),
            effort="S" if proven else "M",
            effort_basis=f"{proven}/{cov.get('total', 0)} flows already claimed",
            cmd=f"/gabe-red  → declare cases for {', '.join(unproven[:2])}",
            href=entity_href(slug), source="archmap.json §coverage"))

    # --- build: phases owing cells, and any unbuilt declared flow -----------
    for p in plan.get("phases", []):
        pid = phase_id(p)
        # load_plan keeps Red and Center OUTSIDE `cells` (they arrived later
        # than the original four); the board shows one rail, so re-join them
        # here in lifecycle order. A None means the column is absent from this
        # project's table — not that the cell is owed.
        cellmap = {}
        for k in CELLS:
            v = (p.get("red") if k == "Red" else p.get("center") if k == "Center"
                 else p["cells"].get(k.lower()))
            if v is not None:
                cellmap[k] = v
        owed = [k for k, v in cellmap.items() if v in ("todo", "in_progress")]
        clk = clock.get(pid) or clock.get("P" + pid.lstrip("P")) \
            or clock.get(pid.lstrip("P"))
        types = ", ".join(p.get("types") or [])
        area = ("web" if "user-facing" in types else
                "api" if "persistence" in types else "process")
        # declared at plan time, operator-confirmed (ruling 2026-08-07) — a DIFFERENT
        # provenance from the path-derived attribution the other tracks use, so it must
        # NOT borrow the default "archmap path match" tooltip. Keep only registered
        # slugs for column bucketing; an unregistered slug (typo, or not yet adopted)
        # keeps the card (it lands in _cross) and is named honestly rather than vanishing.
        declared = p.get("entities") or []
        reg = [s for s in declared if s in labels]
        unreg = [s for s in declared if s not in labels]
        how = "declared at plan time (operator-confirmed)"
        if unreg:
            how += f" · unregistered: {', '.join(unreg)}"
        common = dict(
            id=f"build:{pid}", track="build", entities=reg,
            entity_how=(how if declared else None),
            title=f"{pid} — {p.get('name', '')}", detail=p.get("desc", ""),
            cells=cellmap, tier=p.get("tier", ""),
            complexity=p.get("complexity", ""), area=area,
            types=p.get("types") or [],
            created=(clk["first"] if clk else None),
            href="board.html", source=".kdbp/PLAN.md §Phases")
        if not owed:
            cards.append(_card(state="done", done=True, owes=[],
                               closed=(clk["last"] if clk else None), **common))
            continue
        started = any(v == "done" for v in cellmap.values())
        cards.append(_card(
            state="inflight" if started else "ready", owes=owed,
            last_activity=(clk["last"] if clk else None),
            ripe=len(owed) == 1,
            ripe_why=(f"only the {owed[0]} cell is unticked — one beat closes "
                      "the phase" if len(owed) == 1 else ""),
            effort={1: "S", 2: "M"}.get(len(owed), "L"),
            effort_basis=f"{len(owed)} of {len(cellmap)} lifecycle cells unticked",
            cmd=(f"/gabe-execute {pid}" if "Exec" in owed
                 else f"/gabe-next  → {owed[0]}"),
            **common))

    for key, f in (adoption.get("flows") or {}).items():
        if key.startswith("_"):
            continue
        blob = f if isinstance(f, str) else str(f)
        if "NOT BUILT" not in blob.upper():
            continue          # a finished flow is not a move
        pieces = re.search(r"(\d+) named missing pieces?:([^.]+)", blob)
        label = key.split("_", 1)[1].replace("_", " → ") if "_" in key else key
        cards.append(_card(
            id=f"flow:{key}", track="build", entities=[],
            title=f"Flow not built — {label}",
            detail=(f"{pieces[1]} named missing pieces:{pieces[2].strip()}"
                    if pieces else blob[:220]),
            state="ready", area="product", effort="L",
            effort_basis=(f"{pieces[1]} named missing pieces, none built"
                          if pieces else "unbuilt flow"),
            cmd="/gabe-red  → the born-red flow, test-first",
            href="index.html", source="adoption.json §flows"))

    # --- debt: PENDING rows, live and archived ------------------------------
    for r in (pending if pending is not None else D.load_pending_rows()):
        slugs, matched = attribute(r["file"])
        biggest = max((attribute.lines[p_] for p_ in matched
                       if p_ in attribute.lines), default=None)
        single = bool(r["file"]) and not re.search(r"[,+]|\*\*", r["file"]) \
            and r["file"] not in ("—", "-")
        if biggest is None:
            eff = "S" if single else "M"
            basis = "single file cited" if single else "multiple files / glob cited"
        elif biggest <= 300:
            eff, basis = "S", f"largest cited file is {biggest} lines"
        elif biggest <= 800:
            eff, basis = "M", f"largest cited file is {biggest} lines"
        else:
            eff, basis = "L", (f"largest cited file is {biggest} lines — past "
                               "the 800-line budget")
        ndefer = int(r["deferred"]) if str(r["deferred"]).isdigit() else 0
        gate = r.get("gate") or None
        pri = (r["priority"] or "").split("(")[0].strip().lower()
        ripe = (single and ndefer == 0 and not gate and pri == "low"
                and eff == "S" and r["open"])
        clean = re.sub(r"^\[[a-z\-]+\]\s*", "", re.sub(r"[*`]", "", r["finding"]))
        cards.append(_card(
            id=f"debt:{r['num']}", track="debt", entities=slugs,
            entity_how=(f"{len(set(matched))} archmap path(s) matched" if slugs
                        else "no archmap path in the File cell"),
            area=area_of(r["file"]),
            title=f"#{r['num']} {trunc(clean, 88)}",
            detail=trunc(r["impact"], 200),
            state=("done" if r["closed"] else "blocked" if gate else "ready"),
            done=r["closed"], closed=(r["closed_on"] or None),
            shas=(r["shas"] if r["closed"] else []),
            created=r["date"], priority=pri, gate=gate, file=r["file"],
            deferred=ndefer, ripe=ripe,
            ripe_why=(f"one cited file ({biggest} lines), never deferred, no "
                      "gate — a contained low-priority fix" if ripe else ""),
            effort=eff, effort_basis=basis, cited_lines=biggest,
            inferred=([] if biggest is not None else ["effort"]),
            cmd=f"fix #{r['num']} · /gabe-review deferred",
            href="board.html", source=r["origin_file"]))

    # --- guard: used, but nothing would go red -------------------------------
    # The two halves know different things, so the cards say which: a python
    # function is an EXACT ast-to-C-id join, a web file is a name-matched FLOOR.
    for m in _a3_guard.guard_moves(
            archmap.get("guard_insight")
            or _a3_guard.guard_insight(
                function_insight=archmap.get("function_insight") or {},
                by_function=(archmap.get("test_insight") or {}).get(
                    "by_function", {}),
                by_endpoint=(archmap.get("test_insight") or {}).get(
                    "by_endpoint", {}),
                exercises=(archmap.get("test_insight") or {}).get(
                    "exercises", {}),
                entities=archmap.get("entities") or {})):
        cards.append(_card(
            id=m["id"], track="guard",
            entities=[m["entity"]] if m["entity"] in labels else [],
            entity_how="the entity that owns this file",
            title=m["title"], detail=m["detail"],
            state="ready",
            area=area_of(m["file"]),
            file=m["file"], unguarded=m["unguarded"], declared=m["declared"],
            usage=m.get("usage"),
            effort=m["effort"], effort_basis=m["effort_basis"],
            # the web half is a name match, and a card that hides that is
            # inviting the reader to treat a floor as a coverage number
            inferred=([] if m["exact"] else ["name-matched (a floor)"]),
            cmd=f"/gabe-red  → write a guard for {m['file'].rsplit('/', 1)[-1]}",
            href="arch-code-map.html",
            source="archmap.json §guard_insight"))

    # --- arc: scope phases not yet planned ----------------------------------
    arc, arc_src = D.load_scope_arc()
    for a in arc:
        done = a["status"] in ("complete", "completed", "done")
        cards.append(_card(
            id=f"arc:{a['id']}", track="arc", entities=[],
            title=f"Arc {a['id']} — {a['name']}",
            detail=(f"{a['reqs']} REQ(s) · depends on {a['depends']}"
                    + (f" · parallel with {a['parallel']}"
                       if a["parallel"] != "—" else "")),
            state=("done" if done else
                   "parked" if a["status"] == "pending" else "inflight"),
            done=done, area="product", effort=None if done else "L",
            effort_basis=("" if done else
                          "a whole scope phase — plan it before you price it"),
            cmd=None if done else f"/gabe-plan  → pull arc {a['id']} into a plan",
            href="board.html", source=arc_src))
    return cards


# --------------------------------------------------------------------------- #
# rendering
# --------------------------------------------------------------------------- #
def _chip(cls: str, text: str, title: str = "", style: str = "") -> str:
    return (f'<span class="{cls}"'
            + (f' style="{style}"' if style else "")
            + (f' title="{E(title)}"' if title else "")
            + f">{text}</span>")


def card_html(c: dict, labels: dict) -> str:
    tlabel, tcol, _ = TRACKS[c["track"]]
    chips = [_chip("bc-tk", E(tlabel), style=f"--tc:{tcol}")]

    ents = c.get("entities") or []
    for slug in ents[:2]:
        chips.append(_chip(
            "bc-ent", f'<i></i>{E(labels.get(slug, slug))}',
            f"entity: {labels.get(slug, slug)} — "
            f"{c.get('entity_how', 'archmap path match')}",
            f"--ec:{entity_color(slug)}"))
    if len(ents) > 2:
        chips.append(_chip("bc-area", f"+{len(ents) - 2}",
                           ", ".join(labels.get(x, x) for x in ents[2:])))
    if not ents and c["track"] == "debt":
        chips.append(_chip(
            "bc-cross", "cross-cutting",
            "no archmap path in the File cell — this finding does not belong "
            "to one entity, and saying so is more useful than guessing"))
    if c.get("area"):
        chips.append(_chip("bc-area", E(c["area"])))
    if c.get("effort"):
        col = dict((k, v) for k, _l, v in EFFORTS)[c["effort"]]
        chips.append(_chip("bc-eff", E(c["effort"]), c.get("effort_basis", ""),
                           f"--fc:{col}"))
    if c.get("priority"):
        chips.append(_chip(f'bc-pri p-{E(c["priority"])}', E(c["priority"])))
    if c.get("gate"):
        chips.append(_chip("bc-gate", f'⛔ {E(c["gate"])}',
                           "blocked by a decision, not by neglect"))
    if c.get("deferred"):
        chips.append(_chip("bc-def", f'↻{c["deferred"]}', "times deferred"))

    if c["done"]:
        if c.get("closed_days") is not None:
            chips.append(_chip("bc-closed", f'✓ {human_age(c["closed_days"])} ago',
                               f'closed {c.get("closed")}'))
        if c.get("cycle_days") is not None:
            chips.append(_chip("bc-age", f'{c["cycle_days"]}d open',
                               "days from first recorded to closed"))
    elif c.get("age_days") is not None:
        chips.append(_chip(f'bc-age age-{age_bucket(c["age_days"])}',
                           human_age(c["age_days"]),
                           f'recorded {c.get("created")} — on the board '
                           f'{c["age_days"]} days'))
    if c.get("last_activity") and not c["done"]:
        chips.append(_chip("bc-age", f'touched {E(c["last_activity"])}',
                           "last ledger entry naming this phase"))

    ripe = (_chip("bc-ripe", "◆ ripe", c["ripe_why"]) if c["ripe"] else "")
    # the commit a DONE row names, Status first (never .bchip: board.js reads
    # those as filters); seats.js marks it ●/○ against commits.js and a click
    # on a ● draws it in the changes seat
    sha = ""
    if c["done"] and c.get("shas"):
        s0 = c["shas"][0]
        sha = (f'<button type="button" class="bc-sha" data-sha="{E(s0)}" '
               f'data-shas="{E(" ".join(c["shas"]))}" data-id="{E(c["id"])}" '
               f'title="resolved @ {E(s0)}">{E(s0)}</button>')

    rail = ""
    if c.get("cells"):
        rail = '<div class="bc-rail">' + "".join(
            f'<span class="{"owed" if v in ("todo", "in_progress") else ""}">'
            f'{GLYPH.get(v, "⬜")}<i>{E(k)}</i></span>'
            for k, v in c["cells"].items()) + "</div>"

    prog = ""
    if c.get("checklist_total"):
        pct = round(100 * c["checklist_done"] / c["checklist_total"])
        prog = (f'<div class="bc-prog"><i style="width:{pct}%"></i></div>'
                f'<div class="bc-progl">{c["checklist_done"]}/'
                f'{c["checklist_total"]} checklist</div>')

    inf = (_chip("bc-inf", "~inferred",
                 "not a recorded fact — derived by the board: "
                 + ", ".join(c["inferred"])) if c.get("inferred") else "")
    nxt = (f'<div class="bc-next"><code>{E(c["cmd"])}</code></div>'
           if c.get("cmd") and not c["done"] else "")

    # Two date facts the KPI tiles filter on, carried as attributes so a tile
    # click can narrow to its OWN population (mode-switch alone shows the whole
    # board). Definitions mirror kpis() EXACTLY — "closed 30d" = done and closed
    # within 30 days; "over 3 months" = open and older than 90 days.
    cd, ad = c.get("closed_days"), c.get("age_days")
    closed30 = "1" if (c["done"] and cd is not None and cd <= 30) else "0"
    aged = "1" if (not c["done"] and ad is not None and ad > 90) else "0"

    return (
        f'<article class="bcard" data-track="{E(c["track"])}" '
        f'data-state="{E(c["state"])}" '
        f'data-entities="{E(" ".join(ents))}" '
        f'data-area="{E(c.get("area") or "")}" '
        f'data-effort="{E(c.get("effort") or "")}" '
        f'data-ripe="{"1" if c["ripe"] else "0"}" '
        f'data-closed30="{closed30}" data-aged="{aged}" '
        f'style="--tc:{tcol}">'
        f'<div class="bc-top">{"".join(chips)}{ripe}{sha}</div>'
        f'<h4>{E(c["title"])}</h4><p>{E(c["detail"])}</p>'
        f'{rail}{prog}{nxt}'
        f'<div class="bc-src">{E(c["source"])}{inf}</div></article>')


def _sortkey(c):
    # ripe first, then cheapest, then least-blocked — a pick-list, not an inbox
    return (0 if c["ripe"] else 1, EORDER.get(c.get("effort"), 9),
            SORDER.get(c["state"], 9), c["title"])


def _columns_for(mode, cards, labels):
    open_, done = ([c for c in cards if not c["done"]],
                   [c for c in cards if c["done"]])
    if mode == "state":
        keys = [(k, lab, col, blurb) for k, lab, col, blurb in STATES]
        keyf = lambda c: ("ripe" if c["ripe"] and c["state"] == "ready"
                          else c["state"])
        return keys, keyf, open_
    if mode == "track":
        return ([(k, *TRACKS[k]) for k in TRACK_ORDER],
                lambda c: c["track"], open_)
    if mode == "effort":
        return ([(k, lab, col, "") for k, lab, col in EFFORTS],
                lambda c: c.get("effort") or "L", open_)
    if mode == "age":
        return (list(AGES), lambda c: age_bucket(c.get("age_days")), open_)
    if mode == "done":
        return (list(RECENCY),
                lambda c: recency_bucket(c.get("closed_days")), done)
    ents = [e for e in labels if any(e in (c["entities"] or []) for c in open_)]
    keys = [(e, labels[e], entity_color(e), "") for e in ents]
    keys.append(("_cross", "Cross-cutting", "#7a8595",
                 "No single entity owns it — tooling, process, whole-app work."))
    return keys, lambda c: ((c["entities"] or [None])[0]) or "_cross", open_


def board_html(mode, cards, labels) -> str:
    keys, keyf, pop = _columns_for(mode, cards, labels)
    buckets: dict[str, list] = {k: [] for k, *_ in keys}
    for c in pop:
        buckets.setdefault(keyf(c), []).append(c)
    cols = []
    for k, label, colr, blurb in keys:
        items = sorted(buckets.get(k, []),
                       key=(lambda c: (c.get("closed") or "", c["title"]))
                       if mode == "done" else _sortkey,
                       reverse=(mode == "done"))
        nripe = sum(1 for c in items if c["ripe"])
        head, tail = items[:CAP], items[CAP:]
        mix: dict[str, int] = {}
        for c in items:
            mix[c["track"]] = mix.get(c["track"], 0) + 1
        mixline = (" · ".join(f"{n} {TRACKS[t][0].lower()}" for t, n in
                              sorted(mix.items(), key=lambda kv: -kv[1]))
                   if len(mix) > 1 else "")
        cols.append(
            f'<section class="bcol" data-col="{E(k)}" style="--cc:{colr}">'
            f'<header><h3>{E(label)}<span class="n">{len(items)}</span></h3>'
            + (f'<span class="rp">◆ {nripe} ripe</span>'
               if nripe and k != "ripe" else "")
            + (f'<p>{E(blurb)}</p>' if blurb else "")
            + (f'<p class="mix">{E(mixline)}</p>' if mixline else "")
            + '</header><div class="bstack">'
            + "".join(card_html(c, labels) for c in head)
            + (f'<div class="bfold">'
               f'{"".join(card_html(c, labels) for c in tail)}</div>'
               f'<button class="bmore" data-n="{len(tail)}">+ {len(tail)} more'
               f'</button>' if tail else "")
            + ('<div class="bempty">'
               + ("nothing closed in this window" if mode == "done"
                  else "nothing here — and that is the good outcome")
               + "</div>" if not items else "")
            + "</div></section>")
    return (f'<div class="bboard" data-mode="{E(mode)}" style="display:none">'
            f'{"".join(cols)}</div>')


def filter_bar(cards, labels) -> str:
    """One dropdown per axis. The chip grid this replaces put four rows of
    vocabulary above the board before a single card appeared."""
    ents = sorted({e for c in cards for e in (c["entities"] or [])})
    areas = sorted({c["area"] for c in cards if c.get("area")})

    def n_of(f, v):
        return sum(1 for c in cards
                   if (v in (c["entities"] or []) if f == "entity"
                       else c.get(f) == v))

    def sel(name, key, opts, alllabel):
        return (f'<label class="bfsel"><span>{E(name)}</span>'
                f'<select data-f="{key}">'
                f'<option value="">{E(alllabel)}</option>'
                + "".join(f'<option value="{E(o)}">{E(labels.get(o, o))}'
                          f"  ({n_of(key, o)})</option>" for o in opts)
                + "</select></label>")

    return ('<div class="bfilters">'
            + sel("Track", "track", TRACK_ORDER, "all tracks")
            + sel("Entity", "entity", ents, "all entities")
            + sel("Area", "area", areas, "all areas")
            + sel("Effort", "effort", [k for k, *_ in EFFORTS], "any effort")
            + '<button class="bchip" data-f="ripe" data-v="1">◆ ripe only</button>'
              '<button class="bchip" data-f="unblocked" data-v="1">unblocked</button>'
            + '<div class="bfgrp bfx"><span class="bcount"></span>'
              '<button class="bchip bclear">reset</button></div></div>')


def phase_strip(plan) -> tuple[str, str]:
    """The ONE thing the card board does not subsume: a card exists only while
    a phase still owes a cell, so finished phases leave no trace and the
    sequence disappears with them. Returns (html, payload-json)."""
    # The current phase is stamped HERE via the num-or-id join (a phase has two
    # identities — the `#` column `num` and the id inside the Phase cell). board.js
    # must test this stamp, never string-compare inflight.current_phase to p.id: the
    # two live in different id spaces and never match on a `<id> · <name>` layout,
    # which left the whole live overlay silently dark (ruling 2026-08-07).
    cur_ref = str(plan.get("current_phase") or "")
    seq = []
    for p in plan.get("phases", []):
        cells = {}
        for k in CELLS:
            v = (p.get("red") if k == "Red" else p.get("center") if k == "Center"
                 else p["cells"].get(k.lower()))
            if v is not None:
                cells[k] = v
        owed = [k for k, v in cells.items() if v in ("todo", "in_progress")]
        is_current = cur_ref != "" and cur_ref in (str(p.get("id")), str(p.get("num")))
        seq.append({"id": phase_id(p), "num": p.get("num"), "current": is_current,
                    "name": p.get("name", ""), "owes": owed,
                    "cells": cells, "desc": p.get("desc", ""),
                    "tier": p.get("tier", ""),
                    "complexity": p.get("complexity", ""),
                    "types": p.get("types") or [],
                    # null = never declared · [] = declared none (honest blank)
                    "entities": p.get("entities"),
                    "scope": p.get("scope"),
                    "state": ("done" if not owed else "inflight"
                              if any(v == "done" for v in cells.values())
                              else "todo")})
    if not seq:
        return "", "[]"
    done = sum(1 for p in seq if p["state"] == "done")
    cur = next((p for p in seq if p["state"] == "inflight"),
               next((p for p in seq if p["state"] == "todo"), None))
    nodes = "".join(
        f'<button class="ph ph-{p["state"]}" data-i="{i}" '
        f'title="{E(p["id"])} — {E(p["name"])}'
        + (f' · owes {E(", ".join(p["owes"]))}' if p["owes"] else " · complete")
        + f'">{E(p["id"])}</button>' for i, p in enumerate(seq))
    html = ('<div class="bseq"><div class="bseqhead">'
            f'<b>Phase sequence</b> <span>{done}/{len(seq)} complete'
            + (f' · now <b>{E(cur["id"])} {E(trunc(cur["name"], 44))}</b>'
               if cur else "")
            + ' · <i>click a phase for its detail</i></span></div>'
            f'<div class="bseqrail">{nodes}</div>'
            '<div class="bseqdet" hidden></div></div>')
    import json as _json
    return html, _json.dumps(seq)


def kpis(cards) -> str:
    open_ = [c for c in cards if not c["done"]]
    done = [c for c in cards if c["done"]]
    owed = sum(1 for c in open_ if c["state"] == "owed_to_you")
    # `x or 999` would be wrong: a card closed TODAY has closed_days == 0,
    # which is falsy, and every same-day close would count as ancient.
    d7 = sum(1 for c in done
             if c.get("closed_days") is not None and c["closed_days"] <= 7)
    d30 = sum(1 for c in done
              if c.get("closed_days") is not None and c["closed_days"] <= 30)
    stale = sum(1 for c in open_
                if c.get("age_days") is not None and c["age_days"] > 90)
    cyc = sorted(c["cycle_days"] for c in done if c.get("cycle_days") is not None)
    out = [
        kpi("open cards", str(len(open_)), "across 6 tracks"),
        kpi("owed to you", str(owed), "only a human can clear these",
            alert=bool(owed)),
        kpi("ripe now", str(sum(1 for c in open_ if c["ripe"])),
            "prerequisites already met"),
        kpi("blocked", str(sum(1 for c in open_ if c["state"] == "blocked")),
            "gated by a decision"),
        kpi("closed 30d", str(d30), f"{d7} in the last 7"),
        kpi("over 3 months", str(stale), "open and aging", alert=bool(stale)),
    ]
    if cyc:
        out.append(kpi("median cycle", f"{cyc[len(cyc) // 2]}d",
                       f"{len(cyc)} dated, longest {cyc[-1]}d"))
    return '<div class="kpis">' + "".join(out) + "</div>"


def modebar() -> str:
    return '<div class="bmodes">' + "".join(
        f'<button data-m="{m}"><span>{E(lab)}</span><i>{E(sub)}</i></button>'
        for m, lab, sub in MODES) + "</div>"
