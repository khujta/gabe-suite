#!/usr/bin/env bash
# Scope-schema validator battery — the executable contract of the /gabe-scope
# abort gate (2026-07-22 alignment review G2).
#
# schemas/validate.py is spec-binding (scope-spec.md: schema violation = abort;
# validator exit 2 = E6 STOP) yet shipped with zero fixtures and undeclared
# third-party deps (pyyaml, jsonschema). This battery proves every exit: a
# VALID doc is SILENT (exit 0), an INVALID doc FIRES exit 1, harness errors
# FIRE exit 2, and the dependency preflight FIRES exit 2 with one loud line —
# simulated by `python3 -I -S`, which drops site-packages from sys.path so the
# third-party deps genuinely vanish (the battery probes that the trick works
# before trusting it). Hermetic: temp dir, no network, cleans up after itself.
# Exit 0 = all pass.
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
VAL="$REPO/schemas/validate.py"

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

pass=0; fail=0
ok()  { pass=$((pass+1)); }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }

run() { # $1 kind, $2 file; runs validator, echoes exit code, output -> $T/out
  python3 "$VAL" "$1" "$2" >"$T/out" 2>&1; echo $?
}

# --- fixtures --------------------------------------------------------------
cat > "$T/refs-valid.yaml" <<'YAML'
references:
  - id: ref-1
    path: docs/fixture.md
    role: Fixture reference for the battery
    weight: authoritative
    load_mode: full_read
    added: 2026-07-22
YAML
printf 'references: []\n' > "$T/refs-empty.yaml"
cat > "$T/refs-bad-enum.yaml" <<'YAML'
references:
  - id: ref-1
    path: docs/fixture.md
    role: Fixture reference for the battery
    weight: load-bearing
    load_mode: full_read
    added: 2026-07-22
YAML
cat > "$T/refs-summarize-hole.yaml" <<'YAML'
references:
  - id: ref-1
    path: docs/fixture.md
    role: Fixture reference for the battery
    weight: suggestive
    load_mode: summarize
    added: 2026-07-22
YAML
cat > "$T/sess-valid.json" <<'JSON'
{
  "session_id": "12345678-1234-1234-1234-123456789abc",
  "command_version": "v2.1.1",
  "created": "2026-07-22T10:00:00Z",
  "last_updated": "2026-07-22T10:05:00Z",
  "current_step": "step-1-intake",
  "completed_steps": ["step-0.5-reference-frame"],
  "prompt_versions_used": {"intake": "v1"}
}
JSON
# Brainstorm cycle over the hard cap of 2 — the exact overflow scope-spec.md
# leans on the schema to catch ("session.json cap catches this").
python3 - "$T" <<'PY'
import json, sys
from pathlib import Path
t = Path(sys.argv[1])
sess = json.loads((t / "sess-valid.json").read_text())
(t / "sess-cycle-overflow.json").write_text(json.dumps(
    {**sess, "intake": {"brainstorm_cycles": {"q1": 3}}}))
(t / "sess-unknown-key.json").write_text(json.dumps(
    {**sess, "not_in_schema": True}))
PY

# --- VALID docs: SILENT (exit 0) -------------------------------------------
[ "$(run references "$T/refs-valid.yaml")" = 0 ] && ok || { bad "valid references must exit 0"; cat "$T/out"; }
grep -q '^VALID:' "$T/out" && ok || bad "valid references must say VALID"
[ "$(run references "$T/refs-empty.yaml")" = 0 ] && ok || bad "empty references list is valid (no-framing mode)"
[ "$(run session "$T/sess-valid.json")" = 0 ] && ok || { bad "valid session must exit 0"; cat "$T/out"; }

# --- INVALID docs: FIRE (exit 1) -------------------------------------------
[ "$(run references "$T/refs-bad-enum.yaml")" = 1 ] && ok || bad "bad weight enum must exit 1"
grep -q 'INVALID' "$T/out" && ok || bad "invalid run must say INVALID"
grep -q 'weight' "$T/out" && ok || bad "invalid run must name the offending path"
[ "$(run references "$T/refs-summarize-hole.yaml")" = 1 ] && ok || bad "load_mode=summarize w/o summary must exit 1 (conditional required)"
[ "$(run session "$T/sess-cycle-overflow.json")" = 1 ] && ok || bad "brainstorm cycle 3 (cap 2) must exit 1"
[ "$(run session "$T/sess-unknown-key.json")" = 1 ] && ok || bad "unknown root key must exit 1 (additionalProperties)"

# --- harness errors: exit 2 ------------------------------------------------
[ "$(run bogus-kind "$T/refs-valid.yaml")" = 2 ] && ok || bad "unknown kind must exit 2"
[ "$(run references "$T/no-such-file.yaml")" = 2 ] && ok || bad "missing file must exit 2"
python3 "$VAL" >/dev/null 2>&1; [ $? = 2 ] && ok || bad "no args must exit 2"

# --- dependency preflight: exit 2, loud, no traceback ----------------------
# `-I -S` drops site-packages; probe that the deps really vanish there before
# trusting the simulation.
if python3 -I -S -c "import yaml, jsonschema" >/dev/null 2>&1; then
  bad "preflight: -I -S probe still sees deps — cannot simulate a missing-dep env"
else
  ok
  python3 -I -S "$VAL" references "$T/refs-valid.yaml" >"$T/pre.out" 2>&1
  [ $? = 2 ] && ok || { bad "missing deps must exit 2 even on a VALID doc (gate cannot prove it)"; cat "$T/pre.out"; }
  grep -q 'GATE CANNOT RUN' "$T/pre.out" && ok || bad "preflight must announce the gate cannot run"
  grep -q 'pyyaml' "$T/pre.out" && grep -q 'jsonschema' "$T/pre.out" \
    && ok || bad "preflight must name every missing package"
  grep -q 'Traceback' "$T/pre.out" && bad "preflight must not traceback" || ok
fi

echo
echo "scope-schema battery: $pass passed, $fail failed"
[ "$fail" = 0 ] || exit 1
