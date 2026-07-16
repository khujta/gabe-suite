#!/usr/bin/env bash
# PLAN-PROOF-GUARD — PostToolUse hook for Write|Edit on .kdbp/PLAN.json / PLAN.md
# D7 (block lies, warn debts): a ✅ cell whose evidence does not exist is a LIE and is BLOCKED
# at every tier. Debts (thin coverage, un-walked, absent angles) are NEVER this hook's business.
# Checks (validates the WHOLE current PLAN.json state after the write — no diffing):
#   · cells.red  == done → the phase's `cases` record must exist; a `red@<sha>` must be reachable
#   · cells.exec == done → every declared PROOF artifact path must exist on disk (proof:null passes)
#     Real proof lines use shorthand (globs, {a,b}.png braces, 01..06 ranges — ruling R2): a token
#     passes if the literal path exists, a brace-expanded glob matches, or its parent dir is
#     non-empty. An empty/missing evidence dir still blocks — that is the lie being caught.
#     A token with NO concrete path component (a bare *, ../../**) is never evidence — blocked.
# Exit 2 + stderr = blocking feedback to the model. Parse errors exit 0 (a malformed mirror is
# next.mjs's exit-2 concern, not a lie — never brick edits from a hook).
set -uo pipefail

[ -f ".kdbp/PLAN.json" ] || exit 0
input=$(cat)

# Only fire when the WRITE targeted the plan (path check inside the script keeps the matcher broad)
fp=$(printf '%s' "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"//;s/"$//')
case "$fp" in
  *".kdbp/PLAN.json"|*".kdbp/PLAN.md") ;;
  *) exit 0 ;;
esac

# The guard's whole job is blocking — an invisible no-op would fail open silently.
if ! command -v python3 >/dev/null 2>&1; then
  echo "[WARN] plan-proof-guard INERT: python3 not on PATH — PLAN honesty checks were NOT run" >&2
  exit 0
fi

viol=$(python3 - <<'PY' 2>/dev/null
import collections, glob as globmod, json, os, re, subprocess, sys

MAX_BRACE = 256  # expansion cap — a runaway brace product must not hang past the hook timeout

def brace_expand(tok):
    # FIFO (breadth-first): on a cap-trip the leftovers are evenly partially-expanded, so
    # their brace-free prefixes are deep enough for a fair per-candidate parent probe
    done, work = [], collections.deque([tok])
    while work and len(done) + len(work) <= MAX_BRACE:
        t = work.popleft()
        m = re.search(r"\{([^{}]*)\}", t)
        if not m:
            done.append(t)
            continue
        head, tail = t[: m.start()], t[m.end():]
        work.extend(head + part + tail for part in m.group(1).split(","))
    return done + list(work)  # cap hit → partial expansion; prefixes still probeable

def concrete_parent(tok):
    # deepest brace/glob-free leading directory of THIS candidate
    prefix = re.split(r"[*?\[\]{]", tok)[0]
    parent = prefix if prefix.endswith("/") else os.path.dirname(prefix)
    return parent.rstrip("/")

def evidence_exists(tok):
    # R2: literal path → brace-expanded glob → non-empty parent dir (human shorthand tolerated;
    # a missing or empty evidence dir still fails). Two rules keep the leniency honest:
    #  · a token with no concrete path component (bare */**/{,}) is never evidence;
    #  · the parent probe is PER-CANDIDATE — a mid-path brace whose alternatives don't exist
    #    must NOT pass off an unrelated shared ancestor (docs/{a,b}/x.png needs docs/a or
    #    docs/b to be real, not merely a non-empty docs/).
    if os.path.exists(tok):
        return True
    if not re.sub(r"[*?\[\]{},]|\.\.|/|\.", "", tok).strip():
        return False
    magic_in_dir = bool(re.search(r"[*?\[\]{]", tok.rpartition("/")[0]))
    for cand in brace_expand(tok):
        if "{" in cand:  # cap leftover — probe its (now deeper) brace-free parent
            p = concrete_parent(cand)
            if p and os.path.isdir(p) and os.listdir(p):
                return True
        elif globmod.glob(cand):
            return True
        elif magic_in_dir:
            # fully-expanded candidate with a concrete dir: its OWN parent may vouch for it
            p = os.path.dirname(cand)
            if p and not re.search(r"[*?\[\]]", p) and os.path.isdir(p) and os.listdir(p):
                return True
    if magic_in_dir:
        return False  # no alternative's own directory is real — ancestors prove nothing
    parent = tok.rpartition("/")[0]
    return bool(parent) and os.path.isdir(parent) and bool(os.listdir(parent))

try:
    plan = json.load(open(".kdbp/PLAN.json"))
except Exception:
    sys.exit(0)  # malformed mirror = not a lie; other tooling reports it
out = []
sha_cache = {}  # dedupe: verify each distinct sha once (a 5k-phase plan must not fork 5k gits)
def sha_reachable(sha):
    if sha not in sha_cache:
        if len(sha_cache) >= 200:  # pathological plan — stop forking, past-cap shas pass
            return True
        r = subprocess.run(["git", "cat-file", "-e", sha + "^{commit}"], capture_output=True)
        sha_cache[sha] = (r.returncode == 0)
    return sha_cache[sha]

for ph in plan.get("phases", []) or []:
    pid = str(ph.get("id", "?")); c = ph.get("cells") or {}
    # --- red ✅ without its record / with an unreachable red commit ---
    if c.get("red") == "done":
        cases = (ph.get("cases") or "").strip()
        if not cases:
            out.append(f"phase {pid}: Red ✅ but no `cases` record (PLAN.json phases[].cases — written by /gabe-red)")
        else:
            for sha in re.findall(r"red@([0-9a-f]{7,40})", cases):
                if not sha_reachable(sha):
                    out.append(f"phase {pid}: Red ✅ cites red@{sha} but that commit is unreachable")
    # --- exec ✅ with a declared proof whose artifact is missing on disk ---
    if c.get("exec") == "done":
        proof = ph.get("proof")
        if isinstance(proof, str) and "→" in proof:
            for seg in proof.split(" · "):
                parts = [p.strip() for p in seg.split("→")]
                if len(parts) >= 3 and parts[0].upper().startswith("PROOF"):
                    # strip a trailing "(3 shots)"-style annotation; keep paths with spaces intact
                    path = re.sub(r"\s*\([^)]*\)\s*$", "", parts[-1]).strip()
                    if path and not evidence_exists(path):
                        out.append(f"phase {pid}: Exec ✅ but declared proof artifact missing on disk: {path}")
print("\n".join(out))
PY
)

if [ -n "${viol:-}" ]; then
  {
    echo "⛔ PLAN-PROOF-GUARD blocked this PLAN write (D7 — a ✅ without its evidence is a lie):"
    echo "$viol"
    echo "Fix: re-run the phase's proof step and land the artifact at the printed path, OR re-point red@<sha> in the Cases record to a reachable red commit (.kdbp/PLAN.md Phase Details + PLAN.json phases[].cases), OR set that phase's cells.red/cells.exec back to its honest state in BOTH mirrors. Debts warn; lies block."
  } >&2
  exit 2
fi
exit 0
