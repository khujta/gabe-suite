#!/usr/bin/env bash
# map-baseline.sh — the codebase-map GOLDEN MASTER for extractor refactors.
#
# WHY: the generators are being split per language/framework (the extractor-gateway work). A refactor
# that "changes nothing" must be PROVEN to change nothing, on real repos, not asserted. This captures
# the emitted map for a roster of real projects, then re-runs and reports the delta — byte-level AND
# semantic, because "archmap.json differs" is useless next to "endpoints 128 → 127".
#
# READ-ONLY on every target: GABE_REPO_ROOT points the build at a foreign tree and GABE_CENTER_OUT
# redirects every WRITE to scratch, so a target repo is never mutated (GABE_GRAFT_BUILD=0 also keeps
# the run off its graft index). Targets must be CLEAN and pinned — a dirty target makes its own noise.
#
#   scripts/map-baseline.sh capture [--gens DIR] [name...]   # bless the current output as the baseline
#   scripts/map-baseline.sh check   [--gens DIR] [name...]   # re-run and report the impact
#   scripts/map-baseline.sh list
#
# --gens DIR runs a DIFFERENT generators tree (an A/B of a refactor branch) against the same baseline.
# The SHELL renders with its generators: every build takes GABE_SHELL_SRC=<gens>/../shell (the pair under test — a
# target's own vendored shell is the target's, and after D-061 a shell older than its generators renders a board that
# cannot count its days), unless the target's pinned env names one; a build whose log says a page does not load
# assets/a3-days.js FAILS instead of being blessed or compared.
# Baseline bulk lives outside the repo ($GABE_BASELINE_DIR, default ~/.cache/gabe-map-baselines);
# a per-file hash manifest is COMMITTED at tests/baselines/<name>.sha256 so re-blessing shows up in git.
#
# NORMALISATION is deliberately narrow — the regen stamp (the build's own clock, where the pages and the archmap
# carry it) and nothing else. Anything else that differs is REAL and must be explained, never normalised away: since
# D-061 the board and the Evidence tab, and since D-062 the run cells of index and the test corpora, write no
# wallclock-relative word (their dates are absolute; the page counts the days when it is opened), and every OTHER
# date-time a build writes is content — a run-history line's run time, a feature page's "captured", a commit's date —
# so a day's tick no longer moves them and nothing here hides one that starts to.
#
# COST: a full capture/check of all three targets is MINUTES (tier3 alone is 3.4k py + 2.6k ts).
# Serial by design — this machine runs heavy work one job at a time.
set -uo pipefail
# Every git READ of a target runs without optional locks — `git status` would otherwise refresh the target's index
# and take its index.lock, a write into a tree this script promises never to touch (and a lock another session on
# that repo can trip over). Exported, so the build's own git reads (the commits feed) inherit it too.
export GIT_OPTIONAL_LOCKS=0
REPO="$(cd "$(dirname "$0")/.." && pwd)"
BASE_DIR="${GABE_BASELINE_DIR:-$HOME/.cache/gabe-map-baselines}"
MANIFEST_DIR="$REPO/tests/baselines"
GENS="$REPO/templates/center/generators"

# The TARGET ROSTER is machine-local and lives OUTSIDE this file — a shipped surface must not couple
# to one machine (suite-doctor P6). Roster file: $GABE_BASELINE_TARGETS, else tests/baselines/targets.conf
# (gitignored). One "name|path|env" per line, blank lines and # comments ignored; see targets.conf.example.
# The ENV is part of the RECIPE, not of the machine that ran it: a repo with no installed node_modules
# needs GABE_TS_DIR, or its TS files baseline as 0 fe pieces and the baseline covers half the pipeline —
# then lights up as a huge "refactor" delta the day someone installs it.
TARGETS_FILE="${GABE_BASELINE_TARGETS:-$REPO/tests/baselines/targets.conf}"
TARGETS=()
if [ -f "$TARGETS_FILE" ]; then
  while IFS= read -r line; do
    line="${line%%#*}"; line="$(echo "$line" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')"
    [ -z "$line" ] && continue
    case "$line" in *"|"*) TARGETS+=("$line");; *) echo "  ⚠ ignoring malformed roster line: $line" >&2;; esac
  done < "$TARGETS_FILE"
fi
if [ ${#TARGETS[@]} -eq 0 ]; then
  echo "no baseline targets. Write $TARGETS_FILE — one 'name|path|env' per line:"
  echo "    myapp|/abs/path/to/myapp|"
  echo "    bigrepo|/abs/path/to/bigrepo|GABE_TS_DIR=/abs/path/to/a/tree/with/node_modules"
  echo "  (cp tests/baselines/targets.conf.example tests/baselines/targets.conf and edit)"
  exit 2
fi

MODE="${1:-}"; shift || true
while [ $# -gt 0 ]; do case "$1" in --gens) GENS="$(cd "$2" && pwd)"; shift 2;; *) break;; esac; done
WANT=("$@")

_want() { [ ${#WANT[@]} -eq 0 ] && return 0; for w in "${WANT[@]}"; do [ "$w" = "$1" ] && return 0; done; return 1; }

# Strip the one rendering that moves WITHOUT the tree moving, so two runs of the SAME generators compare
# equal: the regen stamp (build_center_a3.STAMP, "YYYY-MM-DD HH:MMZ" — when the build ran), ANCHORED where
# it is written: a page's "regen <stamp>" / "regen · <stamp>" and the archmap's "generated". Deliberately
# narrow — anything else that differs is REAL. D-062 anchored it: the old rule blanked EVERY ISO date-time
# in every file, so a run-history line stamped with the build's clock, or a feature page "captured" at a
# clone's time, compared equal. D-061 retired the board's "on the board N days" and the "N d ago" rules,
# D-062 the T−N freshness rule (a suite run's age on index and the test corpora): those cells now carry
# absolute dates — a run-history line its RUN's time, never the build's — and the viewer's browser counts
# the days, so a normaliser for them would only hide a regression that wrote one back. (The suite treats
# relative time as volatile too: _a3_render._VOLATILE_RX hashes it out of the row fingerprint so a tick
# cannot re-badge a row NEW.) Proven by tests/board.
_NORM_RX='s/(regen (· )?)[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}Z/\1STAMP/g; s/("generated": ")[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}Z"/\1STAMP"/g'
_norm() { sed -E "$_NORM_RX" "$1"; }

# the SEMANTIC census — what a reader of the map would actually lose or gain
_census() {
  python3 - "$1" <<'PY'
import json, os, sys
d = sys.argv[1]
def j(n):
    p = os.path.join(d, n)
    try: return json.load(open(p))
    except Exception: return None
out = {}
a, c, l = j("archmap.json"), j("c4-graph.json"), j("levels.json")
if a:
    ents = a.get("entities") or {}
    out["entities"] = len(ents)
    out["endpoints"] = sum(len(e.get("endpoints") or []) for e in ents.values() if e)
    out["models"] = sum(len(e.get("models") or []) for e in ents.values() if e)
    out["files_claimed"] = sum(len(e.get("files") or []) for e in ents.values() if e)
    out["function_insight"] = len(a.get("function_insight") or {})
    for k in ("boot_roots", "task_roots", "action_roots", "app_middleware", "unparseable"):
        out[k] = len(a.get(k) or [])
if c:
    out["l1_edges"] = len((c.get("l1") or {}).get("edges") or [])
    out["l2_nodes"] = sum(len(v.get("nodes") or []) for v in (c.get("l2") or {}).values())
    out["l2_edges"] = sum(len(v.get("edges") or []) for v in (c.get("l2") or {}).values())
    out["cross_edges"] = len(c.get("cross_edges") or [])
    fe = (c.get("fe") or {})
    out["fe_pieces"] = len(fe.get("pieces") or []); out["fe_edges"] = len(fe.get("edges") or [])
    st = c.get("stats") or {}
    w = st.get("web") or {}
    out["web_fetch_sites"] = w.get("fetch_sites"); out["web_matched"] = w.get("matched")
    h = st.get("homing") or {}
    out["homing_move"] = h.get("move"); out["homing_agree"] = h.get("agree")
fm = j("forms.json")
if fm and fm.get("present"):                     # element forms (plan Phase 3): what the endpoints DECIDE, counted
    fs = fm.get("stats") or {}; ff = fs.get("findings") or {}
    out["forms_endpoints"] = fs.get("endpoints"); out["forms_rows"] = fs.get("rows"); out["forms_unknown_rows"] = fs.get("unknown_rows")
    out["forms_nag"] = sum(ff.get(k, 0) for k in ("shared-status", "reason-lost", "escape-500", "http-swallowed"))
    out["forms_count"] = sum(ff.get(k, 0) for k in ("text-only", "undeclared", "declared-unproduced"))
if l:
    out["fn_nodes"] = len(l.get("fn_nodes") or []); out["fn_edges"] = len(l.get("fn_edges") or [])
    out["lv_models"] = len(l.get("models") or []); out["use_edges"] = len(l.get("use_edges") or [])
    out["schema_edges"] = len(l.get("schema_edges") or [])
print(json.dumps(out, indent=1, sort_keys=True))
PY
}

_run() {  # $1 name, $2 repo path, $3 out dir
  local name="$1" path="$2" out="$3"   # $4 = pinned env
  [ -d "$path" ] || { echo "  SKIP $name — $path missing"; return 1; }
  local dirty; dirty=$(git -C "$path" status --porcelain 2>/dev/null | wc -l)
  [ "$dirty" = 0 ] || echo "  ⚠ $name has $dirty dirty path(s) — the baseline will carry that noise"
  rm -rf "$out"; mkdir -p "$out"
  local shell; shell="$(cd "$GENS/.." && pwd)/shell"
  [ -d "$shell" ] || { echo "  ⚠ no shell beside $GENS — $name renders with its own (resolve_shell)"; shell=""; }
  ( cd "$GENS" && env ${shell:+GABE_SHELL_SRC="$shell"} $4 GABE_REPO_ROOT="$path" GABE_CENTER_OUT="$out" GABE_GRAFT_BUILD=0 \
      timeout 1800 python3 build_center_a3.py ) >"$out/.build.log" 2>&1
  local rc=$?
  [ $rc = 0 ] || { echo "  FAIL $name — build exited $rc (see $out/.build.log)"; return 1; }
  if grep -q 'does not load assets/a3-days.js' "$out/.build.log"; then
    echo "  FAIL $name — $(grep -m1 'does not load assets/a3-days.js' "$out/.build.log" | sed -E 's/^ *⚠ //' | cut -c1-90)… (the shell cannot count its days)"
    return 1
  fi
  echo "$(git -C "$path" rev-parse HEAD)" > "$out/.head"
  return 0
}

_manifest() {  # $1 out dir → normalized per-file sha256, sorted
  ( cd "$1" && find . -type f ! -name '.build.log' ! -name '.head' ! -name '.env' | sort | while read -r f; do
      printf '%s  %s\n' "$(_norm "$f" | sha256sum | cut -d' ' -f1)" "${f#./}"
    done )
}
export -f _norm 2>/dev/null || true

case "$MODE" in
list)
  for t in "${TARGETS[@]}"; do n="${t%%|*}"; rest="${t#*|}"; p="${rest%%|*}"; ev="${rest#*|}"
    echo "  $n → $p  $([ -d "$BASE_DIR/$n" ] && echo "(baseline $(cut -c1-8 < "$BASE_DIR/$n/.head" 2>/dev/null))" || echo "(no baseline)")${ev:+  env: $ev}"
  done ;;

capture)
  mkdir -p "$MANIFEST_DIR"
  for t in "${TARGETS[@]}"; do n="${t%%|*}"; rest="${t#*|}"; p="${rest%%|*}"; ev="${rest#*|}"; _want "$n" || continue
    echo "── capture $n"
    _run "$n" "$p" "$BASE_DIR/$n" "$ev" || continue
    ( cd "$BASE_DIR/$n" && find . -type f ! -name '.build.log' ! -name '.head' ! -name '.env' | sort | while read -r f; do
        printf '%s  %s\n' "$(sed -E "$_NORM_RX" "$f" | sha256sum | cut -d' ' -f1)" "${f#./}"
      done ) > "$MANIFEST_DIR/$n.sha256"
    _census "$BASE_DIR/$n" > "$MANIFEST_DIR/$n.census.json"
    echo "  blessed: $(wc -l < "$MANIFEST_DIR/$n.sha256") file(s) · head $(cut -c1-8 < "$BASE_DIR/$n/.head")"
  done ;;

check)
  rc=0
  for t in "${TARGETS[@]}"; do n="${t%%|*}"; rest="${t#*|}"; p="${rest%%|*}"; ev="${rest#*|}"; _want "$n" || continue
    [ -f "$MANIFEST_DIR/$n.sha256" ] || { echo "── $n: NO BASELINE — run capture first"; rc=1; continue; }
    echo "── check $n  (generators: $GENS)"
    NEW="$BASE_DIR/.check/$n"
    _run "$n" "$p" "$NEW" "$ev" || { rc=1; continue; }
    ( cd "$NEW" && find . -type f ! -name '.build.log' ! -name '.head' ! -name '.env' ! -name '.manifest' ! -name '.census.json' | sort | while read -r f; do
        printf '%s  %s\n' "$(sed -E "$_NORM_RX" "$f" | sha256sum | cut -d' ' -f1)" "${f#./}"
      done ) > "$NEW/.manifest"
    bh=$(cat "$BASE_DIR/$n/.head" 2>/dev/null); nh=$(cat "$NEW/.head" 2>/dev/null)
    [ "$bh" = "$nh" ] || echo "  ⚠ HEAD MOVED ${bh:0:8} → ${nh:0:8} — a content change here is the REPO's, not the refactor's"
    d=$(diff <(cat "$MANIFEST_DIR/$n.sha256") "$NEW/.manifest" | grep -c '^[<>]')
    if [ "$d" = 0 ]; then echo "  BYTE-IDENTICAL — $(wc -l < "$NEW/.manifest") file(s), 0 differing"
    else
      echo "  $((d/2)) file(s) differ:"
      diff <(cut -c66- "$MANIFEST_DIR/$n.sha256") <(cut -c66- "$NEW/.manifest") | grep '^[<>]' | sed 's/^/    roster /' | head -5
      join -j2 <(sort -k2 "$MANIFEST_DIR/$n.sha256") <(sort -k2 "$NEW/.manifest") 2>/dev/null \
        | awk '$2 != $3 {print "    changed " $1}' | head -20
      rc=1
    fi
    _census "$NEW" > "$NEW/.census.json"
    python3 - "$MANIFEST_DIR/$n.census.json" "$NEW/.census.json" <<'PY'
import json, sys
a = json.load(open(sys.argv[1])); b = json.load(open(sys.argv[2]))
rows = [(k, a.get(k), b.get(k)) for k in sorted(set(a) | set(b)) if a.get(k) != b.get(k)]
if not rows: print("  census: IDENTICAL on all", len(a), "measures")
else:
    print("  census DELTA — what a reader of the map gains or loses:")
    for k, x, y in rows:
        try: arrow = f"{x} → {y}  ({y-x:+d})"
        except Exception: arrow = f"{x} → {y}"
        print(f"    {k:<22} {arrow}")
PY
  done
  exit $rc ;;

*) echo "usage: map-baseline.sh capture|check|list [--gens DIR] [name...]"; exit 2 ;;
esac
