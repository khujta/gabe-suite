#!/usr/bin/env python3
"""Validate Gabe Suite docs, inventory references, and docs installation."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]

EXPECTED_COMMANDS = [
    "gabe-align",
    "gabe-assess",
    "gabe-commit",
    "gabe-debt",
    "gabe-execute",
    "gabe-health",
    "gabe-help",
    "gabe-init",
    "gabe-lens",
    "gabe-mockup",
    "gabe-next",
    "gabe-plan",
    "gabe-push",
    "gabe-review",
    "gabe-roast",
    "gabe-scope",
    "gabe-scope-addition",
    "gabe-scope-change",
    "gabe-scope-pivot",
    "gabe-teach",
]

EXPECTED_CORE_SKILLS = [
    "gabe-align",
    "gabe-arch",
    "gabe-assess",
    "gabe-debt",
    "gabe-docs",
    "gabe-health",
    "gabe-help",
    "gabe-lens",
    "gabe-mockup",
    "gabe-review",
    "gabe-roast",
]

EXPECTED_COMMAND_WRAPPER_SKILLS = [
    "gabe-commit",
    "gabe-execute",
    "gabe-next",
    "gabe-plan",
    "gabe-push",
]

EXPECTED_SKILLS = sorted(EXPECTED_CORE_SKILLS + EXPECTED_COMMAND_WRAPPER_SKILLS)

EXPECTED_ROOT_TEMPLATE_COUNT = 23

REQUIRED_WORKFLOW_DOCS = [
    "docs/workflows/README.md",
    "docs/workflows/greenfield.md",
    "docs/workflows/brownfield.md",
    "docs/suite-state-audit.md",
]

INSTALLED_DOC_SOURCES = [
    "README.md",
    "docs/README.md",
    "docs/WORKFLOW.md",
    "docs/GAPS.md",
    "docs/suite-state-audit.md",
    "docs/workflows/README.md",
    "docs/workflows/greenfield.md",
    "docs/workflows/brownfield.md",
    "docs/architecture/README.md",
    "docs/architecture/diagram-standards.md",
    "docs/architecture/requirements.md",
    "docs/architecture/scope-data-contracts.md",
    "docs/architecture/stack.md",
]


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def read(relative: str) -> str:
    return (REPO / relative).read_text(encoding="utf-8")


def check_inventory() -> None:
    commands = sorted(path.stem for path in (REPO / "commands").glob("gabe-*.md"))
    if commands != EXPECTED_COMMANDS:
        fail(f"command inventory differs. Expected {EXPECTED_COMMANDS!r}, found {commands!r}")

    skills = sorted(path.parent.name for path in (REPO / "skills").glob("gabe-*/SKILL.md"))
    if skills != EXPECTED_SKILLS:
        fail(f"skill inventory differs. Expected {EXPECTED_SKILLS!r}, found {skills!r}")

    root_templates = sorted(
        path
        for path in (REPO / "templates").iterdir()
        if path.is_file() and path.suffix in {".md", ".yaml", ".json"}
    )
    if len(root_templates) != EXPECTED_ROOT_TEMPLATE_COUNT:
        fail(
            f"root template count differs. Expected {EXPECTED_ROOT_TEMPLATE_COUNT}, "
            f"found {len(root_templates)}"
        )


def check_public_references() -> None:
    readme = read("README.md")
    if "Skills (11)" not in readme:
        fail("README.md missing Skills (11)")
    if "Command Wrappers (20)" not in readme:
        fail("README.md missing Command Wrappers (20)")
    if "AP1-AP13" not in readme:
        fail("README.md missing AP1-AP13 guidance")
    if "HTML review artifact" not in readme:
        fail("README.md missing HTML review artifact guidance")
    for command in EXPECTED_COMMANDS:
        if f"/{command}" not in readme:
            fail(f"README.md missing /{command}")

    claude = read("CLAUDE.md")
    if "Current Skills (11)" not in claude:
        fail("CLAUDE.md missing Current Skills (11)")
    if "Command Wrappers (20)" not in claude:
        fail("CLAUDE.md missing Command Wrappers (20)")
    for skill in EXPECTED_CORE_SKILLS:
        if skill not in claude:
            fail(f"CLAUDE.md missing skill {skill}")
    for command in EXPECTED_COMMANDS:
        if f"/{command}" not in claude:
            fail(f"CLAUDE.md missing /{command}")

    help_text = read("skills/gabe-help/SKILL.md")
    if "20 command wrappers, 11 skills" not in help_text:
        fail("gabe-help missing current inventory summary")
    for skill in EXPECTED_CORE_SKILLS:
        if skill not in help_text:
            fail(f"gabe-help missing skill {skill}")
    for command in EXPECTED_COMMANDS:
        if f"/{command}" not in help_text:
            fail(f"gabe-help missing /{command}")


def check_workflow_docs() -> None:
    for relative in REQUIRED_WORKFLOW_DOCS:
        if not (REPO / relative).exists():
            fail(f"required workflow doc missing: {relative}")

    link_expectations = {
        "README.md": REQUIRED_WORKFLOW_DOCS,
        "CLAUDE.md": REQUIRED_WORKFLOW_DOCS,
        "docs/README.md": [
            "workflows/README.md",
            "workflows/greenfield.md",
            "workflows/brownfield.md",
            "suite-state-audit.md",
        ],
        "docs/WORKFLOW.md": [
            "workflows/README.md",
            "workflows/greenfield.md",
            "workflows/brownfield.md",
            "suite-state-audit.md",
        ],
    }
    for relative, needles in link_expectations.items():
        text = read(relative)
        for needle in needles:
            if needle not in text:
                fail(f"{relative} missing workflow link/reference: {needle}")

    workflow_index = read("docs/workflows/README.md")
    for needle in ("Greenfield", "Brownfield", "AP1-AP13", "architecture-principles.md"):
        if needle not in workflow_index:
            fail(f"docs/workflows/README.md missing {needle}")

    greenfield = read("docs/workflows/greenfield.md")
    for needle in (
        "/gabe-align deep",
        "/gabe-init",
        "/gabe-scope",
        "/gabe-plan",
        "/gabe-next",
        "/gabe-debt brief",
        "/gabe-mockup design-ref",
        "AP1",
        "AP11",
        "AP12",
    ):
        if needle not in greenfield:
            fail(f"docs/workflows/greenfield.md missing {needle}")

    brownfield = read("docs/workflows/brownfield.md")
    for needle in (
        "/gabe-init update",
        "/gabe-health",
        "/gabe-debt brief",
        "/gabe-plan check",
        "/gabe-scope",
        "guide-only workflow",
        "AP2",
        "AP12",
    ):
        if needle not in brownfield:
            fail(f"docs/workflows/brownfield.md missing {needle}")

    gaps = read("docs/GAPS.md")
    if "W14 — Brownfield adoption is guide-only, not command-backed" not in gaps:
        fail("docs/GAPS.md missing W14 brownfield gap")

    requirements = read("docs/architecture/requirements.md")
    if "R13 — Project-start mode is explicit" not in requirements:
        fail("requirements missing explicit project-start requirement")
    if "Fully automatic brownfield migration" not in requirements:
        fail("requirements missing softened N7 brownfield non-goal")


def check_html_artifact_guidance() -> None:
    gabe_plan = read("commands/gabe-plan.md")
    for needle in (
        "--html-artifact",
        "--no-html-artifact",
        "--html-path=<path>",
        "docs/gabe/plans/YYYY-MM-DD-<slug>/index.html",
        "HTML review artifact; .kdbp/PLAN.md and .kdbp/DECISIONS.md remain canonical.",
        "docs/mockups/**/*.html",
        "## Review Artifacts",
        "HTML_ARTIFACT:",
    ):
        if needle not in gabe_plan:
            fail(f"commands/gabe-plan.md missing HTML artifact guidance: {needle}")

    gabe_docs = read("skills/gabe-docs/SKILL.md")
    for needle in (
        "HTML review artifacts for complex plans",
        "single self-contained `.html` file",
        "no network dependencies",
        "HTML review artifact; .kdbp/PLAN.md and .kdbp/DECISIONS.md remain canonical.",
        "Do not write Gabe Plan HTML artifacts under `docs/mockups/**/*.html`",
    ):
        if needle not in gabe_docs:
            fail(f"skills/gabe-docs/SKILL.md missing HTML artifact standard: {needle}")

    gabe_plan_skill = read("skills/gabe-plan/SKILL.md")
    if "optional HTML review artifacts" not in gabe_plan_skill:
        fail("skills/gabe-plan/SKILL.md missing HTML artifact wrapper guidance")

    workflow = read("docs/WORKFLOW.md")
    if "self-contained HTML review artifact" not in workflow:
        fail("docs/WORKFLOW.md missing HTML review artifact workflow guidance")


def check_temp_home_docs_install() -> None:
    install_script = REPO / "install.sh"
    with tempfile.TemporaryDirectory(prefix="gabe-suite-docs-") as temp_home:
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
        if "archive excluded" not in result.stdout:
            fail("install.sh output does not mention docs archive exclusion")

        home_root = Path(temp_home)
        for home in (".claude", ".agents"):
            installed_root = home_root / home / "docs" / "gabe-suite"
            if not installed_root.exists():
                fail(f"installed docs root missing: {home}/docs/gabe-suite")
            if (installed_root / "docs" / "archive").exists():
                fail(f"docs archive should not be installed for {home}")

            for source_rel in INSTALLED_DOC_SOURCES:
                source = REPO / source_rel
                target = installed_root / source_rel
                if not target.exists():
                    fail(f"installed doc missing for {home}: {source_rel}")
                if source.read_text(encoding="utf-8") != target.read_text(encoding="utf-8"):
                    fail(f"installed doc differs for {home}: {source_rel}")


def main() -> int:
    check_inventory()
    check_public_references()
    check_workflow_docs()
    check_html_artifact_guidance()
    check_temp_home_docs_install()
    print("suite-docs check: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
