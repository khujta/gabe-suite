#!/usr/bin/env bash
# Center-generator fixture battery — the executable contract of the center's
# guard layer (2026-07-22 alignment review M01/M02/M04/M05/M09/M12).
#
# Every deterministic guard the generators ship is proven able to both FIRE and
# stay SILENT here: the refresh driver's capture→gates chaining (M01), the
# crawl gate's dead-href / estate-probe / empty-crawl / paths.center cases
# (M02, M04), the D123 unknown-slug abort, the lens-card completeness abort,
# the shell-missing exit 2 and the a3.css .xtbl guard exit 3, and the flow
# grammar + classifier honesty rules (M05, M12). Hermetic: temp fixture
# projects, env-override lab pattern (GABE_REPO_ROOT / GABE_SHELL_SRC), no
# network, cleans up after itself. Exit 0 = all pass.
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
GEN="$REPO/templates/center/generators"
SHELL_SRC="$REPO/templates/center/shell"

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

pass=0; fail=0
ok()  { pass=$((pass+1)); }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }

# --- fixture project ------------------------------------------------------
mk_fixture() { # $1 = dir, $2 = center rel path (default docs/site/center)
  python3 - "$1" "${2:-docs/site/center}" <<'PY'
import base64, json, sys
from pathlib import Path
root, center_rel = Path(sys.argv[1]), sys.argv[2]
c = root / center_rel
(c / "cards").mkdir(parents=True)
(root / "src").mkdir(parents=True)
(root / "src" / "api.py").write_text("def handler():\n    return 1\n")
cfg = {"project": {"name": "Fixture", "domain": "battery"},
       "paths": {"center": center_rel, "kdbp": ".kdbp",
                 "results": "tests/results", "proof": "tests/web-e2e/proof"},
       "corpora": [],
       "entities": {"gadget": {"test_rx": "gadget",
                               "proofs": ["g1", "solo"],
                               "code": {"api": ["src/api.py"]},
                               "models": []}}}
# The config ALWAYS lives at the DEFAULT center path — it is where paths.center
# itself is read from (_center_data: "CENTER_DIR is where config lives, so it
# cannot itself come from config"); everything else follows the override.
cfg_home = root / "docs/site/center"
cfg_home.mkdir(parents=True, exist_ok=True)
(cfg_home / "center.config.json").write_text(json.dumps(cfg, indent=1))
(c / "adoption.json").write_text(json.dumps(
    {"sections": [{"entity": "gadget", "display_name": "Gadget",
                   "status": "adopted", "rank": "high",
                   "signals": "fixture", "notes": ""}]}, indent=1))
(c / "cards" / "gadget.md").write_text("""# HANDLE
The gadget ledger.
# WHAT & WHY
Tracks gadgets end to end.
# FOR WHOM
Fixture people.
# FLOWS
- scan ★ → receipt into the ledger
- manual → typed entry path
# IS
The gadget slice.
# IS NOT
Everything else.
# DECIDED
- D1 fixture ruling.
""")
png = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk"
    "YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")
g1 = root / "tests/web-e2e/proof/g1"
g1.mkdir(parents=True)
(g1 / "01-walk.png").write_bytes(png)
(g1 / "manifest.json").write_text(json.dumps(
    {"feature": "Gadget scan walk", "spec": "g1.spec.ts",
     "proof_form": "recorded journey", "source_run": "local 2026-07-22",
     "role": "principal", "flows": ["scan"],
     "legs": {"walk": ["01"]},
     "narration": {"story": "One pass through the scan flow.",
                   "legs": {"walk": "start to finish"}}}, indent=1))
# A single-FILE proof set: loose at the proof root (M04's exact case).
(root / "tests/web-e2e/proof/solo.png").write_bytes(png)
PY
}

build() { # $1 = fixture root, $2 = shell dir; echoes exit code
  (cd "$T" && GABE_REPO_ROOT="$1" GABE_SHELL_SRC="$2" \
     python3 "$GEN/build_center_a3.py" >"$T/build.out" 2>&1; echo $?)
}
gate() { # $1 = fixture root; echoes exit code
  (cd "$T" && GABE_REPO_ROOT="$1" \
     python3 "$GEN/check_center_links.py" >"$T/gate.out" 2>&1; echo $?)
}

# --- builder guards: SILENT (happy build) + every FIRE ---------------------
FIX="$T/fix"; mk_fixture "$FIX"
[ "$(build "$FIX" "$SHELL_SRC")" = 0 ] && ok || { bad "builder: happy fixture must build (see $T/build.out)"; cat "$T/build.out"; }
[ -f "$FIX/docs/site/center/feature-gadget.html" ] && ok || bad "builder: feature page written for carded entity"
# M04: the single-file set's href carries NO set-name segment.
grep -q 'proof/solo.png"' "$FIX/docs/site/center/feature-gadget.html" \
  && ok || bad "single-file set: href must be proof-root relative"
grep -q 'proof/solo/solo.png' "$FIX/docs/site/center/feature-gadget.html" \
  && bad "single-file set: minted a dead <set>/<file> href (M04 regression)" || ok

# D123 unknown-slug abort.
D123="$T/d123"; mk_fixture "$D123"
python3 - "$D123" <<'PY'
import json, sys
from pathlib import Path
p = Path(sys.argv[1]) / "docs/site/center/center.config.json"
cfg = json.loads(p.read_text())
cfg["entities"]["bogus"] = {"test_rx": "bogus"}
p.write_text(json.dumps(cfg))
PY
[ "$(build "$D123" "$SHELL_SRC")" != 0 ] && ok || bad "D123: unknown config slug must abort"
grep -q "not entities in adoption.json" "$T/build.out" && ok || bad "D123: abort names the registry"

# Lens-card completeness abort.
CARD="$T/card"; mk_fixture "$CARD"
sed -i '/# DECIDED/,$d' "$CARD/docs/site/center/cards/gadget.md"
[ "$(build "$CARD" "$SHELL_SRC")" != 0 ] && ok || bad "card: missing required section must abort"
grep -q "missing section" "$T/build.out" && ok || bad "card: abort names the missing section"

# Shell missing → exit 2.
[ "$(build "$FIX" "$T/no-such-shell")" = 2 ] && ok || bad "shell missing must exit 2"

# a3.css without .xtbl → exit 3.
BROKEN="$T/shell-broken"; cp -a "$SHELL_SRC" "$BROKEN"
python3 - "$BROKEN/assets/a3.css" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1])
p.write_text(p.read_text().replace(".xtbl", ".gone"))
PY
XFIX="$T/xfix"; mk_fixture "$XFIX"
[ "$(build "$XFIX" "$BROKEN")" = 3 ] && ok || bad "a3.css without .xtbl must exit 3"

# M05: malformed FLOWS lines surface as a build warning, never vanish.
M5="$T/m5"; mk_fixture "$M5"
sed -i 's/- manual → typed entry path/- manual entry with no arrow/' \
  "$M5/docs/site/center/cards/gadget.md"
[ "$(build "$M5" "$SHELL_SRC")" = 0 ] && ok || bad "m5: malformed FLOWS still builds"
grep -q "FLOWS line(s) did not parse" "$T/build.out" && ok || bad "m5: build must WARN on malformed FLOWS"
grep -q "FLOWS line(s) did not parse" "$M5/docs/site/center/feature-gadget.html" \
  && ok || bad "m5: the page's coverage note must carry the malformed count"

# --- crawl gate: SILENT + every FIRE --------------------------------------
[ "$(gate "$FIX")" = 0 ] && ok || { bad "gate: clean center must pass"; cat "$T/gate.out"; }
grep -q " 0 dead" "$T/gate.out" && ok || bad "gate: clean center reports 0 dead"

# Dead internal href → exit 1.
DEAD="$T/dead"; mk_fixture "$DEAD"
build "$DEAD" "$SHELL_SRC" >/dev/null
echo '<a href="nope-missing.html">x</a>' >> "$DEAD/docs/site/center/index.html"
[ "$(gate "$DEAD")" = 1 ] && ok || bad "gate: dead internal href must exit 1"

# Estate (../) ref probed on disk → missing target is DEAD, not exempt (M04).
EST="$T/est"; mk_fixture "$EST"
build "$EST" "$SHELL_SRC" >/dev/null
echo '<a href="../../../tests/web-e2e/proof/never.png">x</a>' >> "$EST/docs/site/center/index.html"
[ "$(gate "$EST")" = 1 ] && ok || bad "gate: missing estate target must exit 1"
grep -q "estate target missing" "$T/gate.out" && ok || bad "gate: estate probe names its finding"

# paths.center override honored end to end (M02: no hardcoded center path).
PANEL="$T/panel"; mk_fixture "$PANEL" "docs/site/panel"
[ "$(build "$PANEL" "$SHELL_SRC")" = 0 ] && ok || bad "panel: paths.center build"
[ -f "$PANEL/docs/site/panel/index.html" ] && ok || bad "panel: pages land under paths.center"
[ "$(gate "$PANEL")" = 0 ] && ok || bad "gate: must crawl the CONFIGURED center dir"
grep -q " 0 pages" "$T/gate.out" && bad "gate: crawled the hardcoded default instead of paths.center (M02 regression)" || ok

# Empty crawl → refuse the vacuous pass (M02).
EMPTY="$T/empty"; mkdir -p "$EMPTY"
[ "$(gate "$EMPTY")" = 1 ] && ok || bad "gate: 0 pages must exit 1, not pass green"
grep -q "refusing the vacuous pass" "$T/gate.out" && ok || bad "gate: empty crawl says why it failed"

# --- refresh driver wiring (M01) — stubbed builders isolate the shell logic -
RF="$T/rf"; mkdir -p "$RF/scripts" "$RF/docs/site/center"
cp "$GEN/refresh_center.sh" "$RF/scripts/"
cat > "$RF/scripts/build_center_a3.py" <<'PY'
open("gates-ran.marker", "w").write("build")
print("stub build")
PY
cat > "$RF/scripts/check_center_links.py" <<'PY'
print("stub gate")
PY
cat > "$RF/docs/site/center/center.config.json" <<'JSON'
{"commands": {"junit": ["echo capture-ran"], "coverage": ["echo cov-ran"],
              "e2e": ["echo e2e-ran"]}}
JSON
run_rf() { (cd "$RF" && bash scripts/refresh_center.sh "$@" >"$T/rf.out" 2>&1; echo $?); }

rm -f "$RF/gates-ran.marker"
[ "$(run_rf junit)" = 0 ] && ok || bad "refresh junit: must exit 0 (M01: was exit 1 before the gates)"
grep -q "capture-ran" "$T/rf.out" && ok || bad "refresh junit: capture ran"
[ -f "$RF/gates-ran.marker" ] && ok || bad "refresh junit: regenerate+gates block must be REACHED (M01)"

rm -f "$RF/gates-ran.marker"
[ "$(run_rf all)" = 0 ] && ok || bad "refresh all: must exit 0"
grep -q "cov-ran" "$T/rf.out" && grep -q "e2e-ran" "$T/rf.out" \
  && ok || bad "refresh all: must not die after the first group (M01)"
[ -f "$RF/gates-ran.marker" ] && ok || bad "refresh all: gates reached"

# No-commands group: says so, still reaches the gates.
cat > "$RF/docs/site/center/center.config.json" <<'JSON'
{"commands": {}}
JSON
rm -f "$RF/gates-ran.marker"
[ "$(run_rf junit)" = 0 ] && ok || bad "refresh junit(no cmds): exit 0"
grep -q "no commands declared" "$T/rf.out" && ok || bad "refresh junit(no cmds): says so"
[ -f "$RF/gates-ran.marker" ] && ok || bad "refresh junit(no cmds): gates reached"

[ "$(run_rf bogus-mode)" = 2 ] && ok || bad "refresh: unknown mode must exit 2"

# --- flow grammar + classifier honesty (M05/M12/M03) -----------------------
if (cd "$GEN" && python3 - <<'PY'
import sys
import _a3_evidence as ev

flows, bad = ev.parse_flows(
    ["- scan ★ → receipt to ledger", "- browse the list",
     "- two words → x", "- manual → typed entry"])
assert [f[0] for f in flows] == ["scan", "manual"]
assert flows[0][2] is True and flows[1][2] is False
assert len(bad) == 2, bad

F = [("scan", "receipt into the ledger pipeline", True),
     ("manual", "typed entry path", False)]
S = lambda man, name="x": {"man": man, "name": name, "legs": []}
c = ev._classify(S({"role": "Principal"}), F)
assert c["role"] == "" and "role" in c["reason"]           # typo'd role → unclear
c = ev._classify(S({"role": "principal", "flows": "scan"}), F)
assert c["role"] == "" and "LIST" in c["reason"]           # string flows → unclear
c = ev._classify(S({"flows": ["scam"]}), F)
assert c["role"] == "" and "scam" in c["reason"]           # unknown key → unclear
c = ev._classify(S({"role": "principal", "flows": ["scan"]}), F)
assert (c["role"], c["flows"], c["golden"], c["explicit_match"]) == \
       ("principal", ["scan"], True, True)                 # explicit wins
c = ev._classify(S({"feature": "the scan journey", "proof_form": "recorded"},
                   name="scan-walk"), F)
assert c["role"] == "principal" and c["inferred"] and not c["explicit_match"]
c = ev._classify(S({}), F)
assert c["role"] == "" and c["reason"] == "no manifest"
sys.exit(0)
PY
) >"$T/py.out" 2>&1; then ok; else bad "flow grammar/classifier unit asserts (see below)"; cat "$T/py.out"; fi

echo
echo "center battery: $pass passed, $fail failed"
[ "$fail" = 0 ] || exit 1
