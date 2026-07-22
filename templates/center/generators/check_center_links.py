#!/usr/bin/env python3
"""Command-center crawl gate (corpus design §6 mods 7–8; stdlib only).

"Navigable" is a GATE, not a hope: after every regen this checks that
  1. every internal href in the center's *.html resolves to a file on disk,
  2. every #anchor resolves to an id= in its target page,
  3. every local asset src exists,
  4. every estate reference that leaves the center (../… proof shots, spec
     files) exists on disk — the build walked those files moments ago, so a
     missing target is a broken href, not a view-time concern,
and WARNs (non-fatal) when
  5. an ADOPTED entity (adoption.json — the D123 registry) has no card yet (the
     forgotten-step nudge), or an entity's card lacks canonical DIAGRAM sections /
     a reviewed stamp / carries an unfinished TODO. Completeness is checked on the
     ENTITY axis the center renders from, not the PLAN-phase axis (build waves
     live in PLAN/LEDGER/git — they were never per-phase feature cards).

Dead links are a FAILURE (exit 1), and so is an EMPTY crawl: a gate that
finds zero pages proves nothing and must say so, not pass green.

Run standalone:  python3 scripts/check_center_links.py
Chained after build_center_a3.py by scripts/refresh_center.sh (every mode).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

# Path resolution lives in _center_data (paths.center, GABE_REPO_ROOT,
# GABE_CONFIG) — a hardcoded center path here made the gate crawl an empty
# default dir and pass green whenever a project retargeted paths.center.
import _center_data as D
from _a3_evidence import _ROLE_TAG, parse_flows

REPO_ROOT = D.REPO_ROOT
CENTER = D.CENTER_DIR

HREF_RX = re.compile(r'(?:href|src)="([^"]+)"')
ID_RX = re.compile(r'id="([^"]+)"')


def run_checks() -> int:
    import posixpath
    pages = {p.relative_to(CENTER).as_posix(): p.read_text()
             for p in sorted(CENTER.rglob("*.html"))
             if "leaf/" not in p.relative_to(CENTER).as_posix()
             and "archive/" not in p.relative_to(CENTER).as_posix()}
    ids = {name: set(ID_RX.findall(html)) for name, html in pages.items()}
    if not pages:
        print(f"  crawl gate: 0 pages found under {CENTER} — an empty crawl "
              f"proves nothing; refusing the vacuous pass")
        return 1
    dead: list[str] = []
    checked = 0
    for name, html in pages.items():
        here = posixpath.dirname(name)
        for ref in HREF_RX.findall(html):
            if ref.startswith(("http://", "https://", "mailto:", "data:")):
                continue
            target, _, anchor = ref.partition("#")
            resolved = posixpath.normpath(posixpath.join(here, target)) if target else ""
            if resolved.startswith(".."):
                # Estate refs (proof shots, spec files) leave the center but
                # point at THIS disk — the build walked them at render time, so
                # probe existence instead of exempting (a single-file proof set
                # once rendered dead hrefs no layer could see).
                checked += 1
                if not (CENTER / resolved).exists():
                    dead.append(f"{name}: {ref} — estate target missing on disk")
                continue
            checked += 1
            if target:
                tpath = CENTER / resolved
                if not tpath.exists():
                    dead.append(f"{name}: {ref} — target missing")
                    continue
                if anchor and target.endswith(".html"):
                    tids = ids.get(resolved)
                    if tids is None and tpath.exists():
                        tids = set(ID_RX.findall(tpath.read_text()))
                    if tids is not None and anchor not in tids:
                        dead.append(f"{name}: {ref} — anchor #{anchor} not found")
            elif anchor and anchor not in ids[name]:
                dead.append(f"{name}: #{anchor} — same-page anchor missing")

    warns: list[str] = []
    try:
        # The same config the builder used (honors GABE_CONFIG); {} = no
        # config, which the registry checks below must SAY, not skip silently.
        config = D.CFG
        if not config:
            raise OSError("no center.config.json found")
        # Documentation completeness is checked against the ENTITY registry
        # (adoption.json — D123), not PLAN phases: the center's feature pages are
        # per ADOPTED ENTITY, so both the forgotten-step nudge and the card-quality
        # checks read the registry the pages actually render from. This reframes
        # the old features[]/phase check, which measured an axis the center no
        # longer documents per-phase (build waves live in PLAN / LEDGER / git).
        adoption: dict = {}
        apath = CENTER / "adoption.json"
        if apath.exists():
            adoption = json.loads(apath.read_text())
        sections = adoption.get("sections", [])
        entities_cfg = config.get("entities", {})
        cards_dir = CENTER / "cards"
        proof_root = D.PROOF_DIR

        # Forgotten-step nudge: an entity the registry treats as ADOPTED (any
        # non-pending status) but with no card on disk — the registry claims it,
        # the documentation is missing. Pending entities legitimately have none.
        missing = [s["entity"] for s in sections
                   if s.get("entity")
                   and (s.get("status") or "pending") != "pending"
                   and not (cards_dir / f"{s['entity']}.md").exists()]
        if missing:
            warns.append(f"{len(missing)} adopted entity(ies) have no card yet "
                         f"(registry adopted, cards/ empty): {' '.join(missing[:12])}"
                         + (" …" if len(missing) > 12 else ""))
        # S5 completeness + review detection: incompleteness is machine-visible.
        if "TODO(verify-glob)" in json.dumps(config):
            warns.append("registry carries TODO(verify-glob) — scaffolded globs unconfirmed")

        # Per-entity card quality — every entity that HAS a card is held to the
        # same bar the phase-feature cards used to be: canonical diagrams, a
        # reviewed stamp, no unfinished TODO(author), and proof-set narration.
        for s in sections:
            slug = s.get("entity")
            if not slug:
                continue
            card = cards_dir / f"{slug}.md"
            if not card.exists():
                continue
            text = card.read_text()
            if "TODO(author)" in text:
                warns.append(f"entity '{slug}': card has TODO(author) sections")
            # Canonical names only — "# DIAGRAMS — types"-style improvisations
            # render NOWHERE (the H4 lesson: substring checks hide silent loss).
            canonical = ("# DIAGRAM USERFLOW", "# DIAGRAM DATAFLOW", "# DIAGRAM WORKFLOW")
            if not any(c in text for c in canonical):
                warns.append(f"entity '{slug}': no canonical DIAGRAM sections "
                             "(# DIAGRAM USERFLOW / DATAFLOW / WORKFLOW) — anything "
                             "else renders nowhere")
            low = text.lower()
            if "reviewed:" not in low and "# reviewed" not in low:
                warns.append(f"entity '{slug}': card lacks a reviewed: stamp "
                             "(a TODO-free draft is not a reviewed card)")
            # Flow layer: the card's # FLOWS must parse, and the manifests'
            # role:/flows: signals must be well-formed against it — the build
            # already classifies (malformed = unclassified with reason); the
            # gate makes the same drift a standing warn after every regen.
            flow_lines, in_flows = [], False
            for ln in text.splitlines():
                if ln.startswith("# "):
                    in_flows = ln[2:].strip().upper() == "FLOWS"
                    continue
                if in_flows and ln.strip():
                    flow_lines.append(ln)
            flows, badf = parse_flows(flow_lines)
            if badf:
                warns.append(f"entity '{slug}': {len(badf)} FLOWS line(s) do "
                             "not parse (grammar `- key [★] → desc`)")
            known = {k for k, _d, _g in flows}
            # The entity's declared proof sets carry their narration (config
            # entities.<slug>.proofs, resolved under the configured proof path).
            for pname in entities_cfg.get(slug, {}).get("proofs", []):
                manifest = proof_root / pname / "manifest.json"
                if manifest.exists():
                    mtext = manifest.read_text()
                    if '"narration"' not in mtext:
                        warns.append(f"entity '{slug}': proof set '{pname}' "
                                     "manifest has no narration block")
                    elif "TODO(narration)" in mtext:
                        warns.append(f"entity '{slug}': proof set '{pname}' "
                                     "narration carries TODO(narration)")
                    try:
                        man = json.loads(mtext)
                    except json.JSONDecodeError:
                        man = None
                    if isinstance(man, dict):
                        role = man.get("role")
                        if role is not None and (
                                not isinstance(role, str)
                                or role not in _ROLE_TAG):
                            warns.append(
                                f"entity '{slug}': proof set '{pname}' role "
                                f"{role!r} is not one of "
                                f"{'|'.join(_ROLE_TAG)}")
                        fl = man.get("flows")
                        if fl is not None and not isinstance(fl, list):
                            warns.append(f"entity '{slug}': proof set "
                                         f"'{pname}' flows: must be a LIST "
                                         "of flow keys")
                        elif isinstance(fl, list):
                            unknown = [x for x in fl if isinstance(x, str)
                                       and x.lower() not in known]
                            if unknown:
                                warns.append(
                                    f"entity '{slug}': proof set '{pname}' "
                                    "flows: names key(s) the card lacks: "
                                    + " · ".join(unknown[:4]))
    except (OSError, json.JSONDecodeError, KeyError) as exc:
        warns.append(f"registry checks skipped: {exc}")

    print(f"  crawl gate: {checked} internal refs across {len(pages)} pages — "
          f"{len(dead)} dead")
    for d in dead:
        print(f"    ✗ {d}")
    for w in warns:
        print(f"    ⚠ {w}")
    return 1 if dead else 0


if __name__ == "__main__":
    sys.exit(run_checks())
