#!/usr/bin/env python3
"""curate_proof.py — mechanics of proof-set curation (distillation S4).

The SELECTION is human judgment; everything after it is deterministic: copy
the chosen shots from the gitignored run artifacts into the committed proof
set and derive the manifest skeleton (legs from shot names, artifacts list,
source_run) with TODO markers the crawl gate WARNs on until the narration —
and the flow-coverage `role:` / `flows:` fields — are authored. A TODO role
renders the set UNCLASSIFIED with its reason on the Evidence tab: deliberate
pressure to author the classification while the run is fresh.

Paths come from center.config.json via _center_data (paths.proof); the run
artifacts default to the `artifacts/web-journey` sibling of the proof root.

Usage:
  python3 scripts/curate_proof.py <artifact-subdir> <shot-num…> [--dest <proof-dir>]
  python3 scripts/curate_proof.py cook-state 02 03 05        # dest defaults to subdir
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import _center_data as D

REPO = D.REPO_ROOT
PROOF = D.PROOF_DIR
ART = PROOF.parent / "artifacts" / "web-journey"
_PROOF_REL = PROOF.relative_to(REPO).as_posix()


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) < 2:
        print(__doc__)
        return 2
    subdir, nums = args[0], set(args[1:])
    dest_name = (sys.argv[sys.argv.index("--dest") + 1]
                 if "--dest" in sys.argv else subdir)
    src = ART / subdir
    if not src.is_dir():
        print(f"no artifacts at {src.relative_to(REPO)} — run the journey first")
        return 1
    shots = sorted(p.name for p in src.glob("*.png") if p.name[:2] in nums)
    missing = nums - {s[:2] for s in shots}
    if missing:
        print(f"shots not found for numbers: {sorted(missing)}")
        return 1
    dest = PROOF / dest_name
    dest.mkdir(parents=True, exist_ok=True)
    for name in shots:
        shutil.copy2(src / name, dest / name)
    manifest = dest / "manifest.json"
    if manifest.exists():
        print(f"manifest exists, artifacts refreshed in place: {manifest.relative_to(REPO)}")
        return 0
    legs = {name[3:].removesuffix(".png"): [name[:2]] for name in shots}
    e2e_rel = PROOF.parent.relative_to(REPO).as_posix()
    manifest.write_text(json.dumps({
        "feature": "TODO(narration) — feature + promise, one line",
        "spec": f"{e2e_rel}/{subdir if subdir.startswith('web-journey') else 'web-journey-' + subdir}.spec.ts",
        "proof_form": "journey — curated step subset; full run output stays gitignored",
        "role": "TODO — principal|edge|reference|supporting (explicit beats inference)",
        "flows": [],
        "legs": legs,
        "artifacts": shots,
        "source_run": f"artifacts/web-journey/{subdir}",
        "curated": "TODO(narration) — date + occasion",
        "convention": "replace in place on refresh — never dated copies; demo GIF/MP4 via capture mode, not committed",
        "narration": {
            "_convention": "authored by the session that makes the evidence; DESCRIBES, never asserts",
            "story": "TODO(narration) — 2–3 sentences: what this proof set shows, for anyone",
            "capture_story": "TODO(narration) — what the video shows (delete if no capture)",
            "legs": {leg: "TODO(narration) — one plain sentence" for leg in legs},
        },
    }, indent=1, ensure_ascii=False) + "\n")
    print(f"proof set: {len(shots)} shots → {dest.relative_to(REPO)}")
    print(f"manifest skeleton: {manifest.relative_to(REPO)} — author the narration, "
          "merge legs that share a claim, set role:/flows: (the card's # FLOWS "
          "keys), append the set name to entities.<slug>.proofs[] in "
          "center.config.json, then regen")
    return 0


if __name__ == "__main__":
    sys.exit(main())
