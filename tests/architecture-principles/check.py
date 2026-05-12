#!/usr/bin/env python3
"""Validate the Gabe Suite architecture-principles integration."""

from __future__ import annotations

import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]

EXPECTED_PRINCIPLES = [
    ("AP1", "Single idea"),
    ("AP2", "Minimize surprise"),
    ("AP3", "Allowed means used"),
    ("AP4", "Everyone will not just"),
    ("AP5", "Transform/use separation"),
    ("AP6", "Coupling"),
    ("AP7", "Versioning"),
    ("AP8", "Explicit state"),
    ("AP9", "Single source of truth"),
    ("AP10", "Naming"),
    ("AP11", "Testability"),
    ("AP12", "Documented decisions"),
    ("AP13", "Communication tax"),
]

REFERENCE_CHECKS = {
    "skills/gabe-align/SKILL.md": [
        "architecture-principles.md",
        "advisory AP checks",
        "ARCHITECTURE PRINCIPLES (advisory)",
    ],
    "commands/gabe-align.md": [
        "architecture-principles.md",
        "AP1-AP13",
        "not hard gates",
    ],
    "skills/gabe-debt/SKILL.md": [
        "Architecture Principle Catalog",
        "Architecture principles: AP6 coupling, AP12 documented decisions",
        "do not change severity",
    ],
    "commands/gabe-debt.md": [
        "architecture-principles.md",
        "do not create findings",
        "Architecture principle citations",
    ],
    "skills/gabe-review/SKILL.md": [
        "Architecture principle citations (advisory)",
        "architecture-principles.md",
        "do not create findings",
    ],
    "commands/gabe-review.md": [
        "architecture-principles.md",
        "AP IDs",
        "do not create findings",
    ],
}

INSTALL_EXPECTATIONS = {
    "skills/gabe-align/SKILL.md": ".{home}/skills/gabe-align/SKILL.md",
    "commands/gabe-align.md": ".{home}/commands/gabe-align.md",
    "skills/gabe-debt/SKILL.md": ".{home}/skills/gabe-debt/SKILL.md",
    "commands/gabe-debt.md": ".{home}/commands/gabe-debt.md",
    "skills/gabe-review/SKILL.md": ".{home}/skills/gabe-review/SKILL.md",
    "commands/gabe-review.md": ".{home}/commands/gabe-review.md",
    "templates/architecture-principles.md": ".{home}/templates/gabe/architecture-principles.md",
}


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def read(relative: str) -> str:
    return (REPO / relative).read_text(encoding="utf-8")


def check_catalog() -> None:
    catalog_path = REPO / "templates/architecture-principles.md"
    if not catalog_path.exists():
        fail("templates/architecture-principles.md is missing")

    text = catalog_path.read_text(encoding="utf-8")
    headings = list(re.finditer(r"^### (AP\d+) - (.+)$", text, re.MULTILINE))
    found = [(match.group(1), match.group(2).strip()) for match in headings]
    if found != EXPECTED_PRINCIPLES:
        fail(f"AP catalog headings differ. Expected {EXPECTED_PRINCIPLES!r}, found {found!r}")

    for index, match in enumerate(headings):
        start = match.end()
        end = headings[index + 1].start() if index + 1 < len(headings) else len(text)
        block = text[start:end]
        ap_id = match.group(1)
        for marker in ("**Principle:**", "**Advisory test:**", "**Evidence signals:**"):
            if marker not in block:
                fail(f"{ap_id} is missing {marker}")

    for required in (
        "Runtime contract",
        "templates/architecture-principles.md",
        "~/.claude/templates/gabe/architecture-principles.md",
        "~/.agents/templates/gabe/architecture-principles.md",
        "do not block commits or PRs",
    ):
        if required not in text:
            fail(f"catalog missing runtime contract text: {required}")


def check_references() -> None:
    for relative, needles in REFERENCE_CHECKS.items():
        text = read(relative)
        for needle in needles:
            if needle not in text:
                fail(f"{relative} missing reference text: {needle}")


def check_temp_home_install() -> None:
    install_script = REPO / "install.sh"
    with tempfile.TemporaryDirectory(prefix="gabe-ap-install-") as temp_home:
        env = os.environ.copy()
        env["HOME"] = temp_home
        result = subprocess.run(
            ["bash", str(install_script)],
            cwd=REPO,
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )
        if result.returncode != 0:
            fail(f"install.sh failed in temp HOME:\n{result.stdout}")

        if "Installed 31/31 components." not in result.stdout:
            fail("install.sh did not report Installed 31/31 components")

        home_root = Path(temp_home)
        for home in ("claude", "agents"):
            for source_rel, target_template in INSTALL_EXPECTATIONS.items():
                source = REPO / source_rel
                target_rel = target_template.format(home=home)
                target = home_root / target_rel
                if not target.exists():
                    fail(f"installed file missing for {home}: {target_rel}")
                if source.read_text(encoding="utf-8") != target.read_text(encoding="utf-8"):
                    fail(f"installed file differs for {home}: {target_rel}")


def main() -> int:
    check_catalog()
    check_references()
    check_temp_home_install()
    print("architecture-principles check: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
