#!/usr/bin/env python3
"""
validate.py — Schema validator for /gabe-scope Phase 2 artifacts.

Usage:
  validate.py references <yaml-file>   # validates against scope-references.schema.json
  validate.py session <json-file>      # validates against scope-session.schema.json

Exit codes:
  0 — valid
  1 — validation failed (errors printed)
  2 — harness error (missing file, missing pyyaml/jsonschema dep, etc. — the gate could not run; STOP, never a pass)
"""
import datetime as dt
import importlib.util
import json
import sys
from pathlib import Path

# Dependency preflight — pyyaml + jsonschema are third-party, and this script is
# the /gabe-scope abort gate: if it cannot run it has proven nothing, so a
# missing dep is a loud one-line exit 2 (STOP), never a traceback.
_MISSING_DEPS = [pkg for mod, pkg in (("yaml", "pyyaml"), ("jsonschema", "jsonschema"))
                 if importlib.util.find_spec(mod) is None]
if _MISSING_DEPS:
    print(
        f"GATE CANNOT RUN — missing package(s): {', '.join(_MISSING_DEPS)}. "
        f"Schema validation is the /gabe-scope abort gate; exit 2 = STOP, the doc is "
        f"NOT proven valid. Install: pip install {' '.join(_MISSING_DEPS)}",
        file=sys.stderr,
    )
    sys.exit(2)

import yaml
from jsonschema import Draft202012Validator


SCHEMA_DIR = Path(__file__).parent


def load_schema(name: str) -> dict:
    path = SCHEMA_DIR / f"scope-{name}.schema.json"
    return json.loads(path.read_text())


def _stringify_dates(obj):
    """Recursively convert YAML-parsed date/datetime values into ISO strings
    so the JSON Schema string+format validator accepts them."""
    if isinstance(obj, dict):
        return {k: _stringify_dates(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_stringify_dates(v) for v in obj]
    if isinstance(obj, dt.datetime):
        return obj.isoformat()
    if isinstance(obj, dt.date):
        return obj.isoformat()
    return obj


def load_data(kind: str, path: Path) -> dict:
    text = path.read_text()
    if kind == "references":
        return _stringify_dates(yaml.safe_load(text))
    return json.loads(text)


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        return 2
    kind, file_arg = sys.argv[1], Path(sys.argv[2])
    if kind not in ("references", "session"):
        print(f"ERROR: unknown kind '{kind}' (expected: references | session)", file=sys.stderr)
        return 2
    if not file_arg.is_file():
        print(f"ERROR: file not found: {file_arg}", file=sys.stderr)
        return 2

    schema = load_schema(kind)
    data = load_data(kind, file_arg)
    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(data), key=lambda e: e.path)

    if not errors:
        print(f"VALID: {file_arg} conforms to scope-{kind}.schema.json")
        return 0

    print(f"INVALID: {file_arg} has {len(errors)} error(s):")
    for err in errors:
        path = ".".join(str(p) for p in err.path) or "<root>"
        print(f"  - at {path}: {err.message}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
