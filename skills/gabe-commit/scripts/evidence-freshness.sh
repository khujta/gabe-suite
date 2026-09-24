#!/usr/bin/env bash
# evidence-freshness — deterministic WARN-and-LOG check (Evidence Doctrine §4, stage 1).
#
# Invariant: when the current phase carries a non-null proof (PLAN.json), the newest artifact
# under the manifest's proof_root must be >= the newest STAGED source change. Stale or missing
# evidence => visible WARN + one line appended to .kdbp/archive/evidence-bypass.log.
# Exit codes: 0 = ok/skipped, 2 = warned. NEVER blocks (stage-2 promotion is a Wave-2 decision
# made from the bypass log).
# SOURCE means app code: .kdbp bookkeeping, the proof folder, PROSE (docs/, *.md) and TEST ROOTS are never
# the staged change this check measures — a red checkpoint (tests only) and a docs tombstone each logged a
# false bypass into the Wave-2 promotion evidence (gustify P8, 2026-09-04). No message channel exists here
# (the gate runs this before the commit), so the exemption is on the staged PATHS, deterministically.
set -u

kdbp=".kdbp"
plan_json="$kdbp/PLAN.json"
behavior="$kdbp/BEHAVIOR.md"
bypass_log="$kdbp/archive/evidence-bypass.log"

[ -f "$plan_json" ] || exit 0   # non-KDBP repo or pre-mirror plan — nothing to check
command -v python3 >/dev/null 2>&1 || { echo "ℹ evidence-freshness: python3 unavailable — skipped"; exit 0; }

read -r phase_id proof <<EOF
$(python3 - "$plan_json" <<'PY'
import json, sys
try:
    p = json.load(open(sys.argv[1]))
except Exception:
    print("- -"); raise SystemExit
if p.get("status") != "active":
    print("- -"); raise SystemExit
cur = str(p.get("current_phase", ""))
ph = next((x for x in p.get("phases", []) if str(x.get("id")) == cur), None)
proof = (ph or {}).get("proof")
print(cur if cur else "-", "-" if proof in (None, "", "null") else "carrying")
PY
)
EOF

[ "$proof" = "carrying" ] || exit 0   # phase carries no proof requirement

# proof_root from the BEHAVIOR.md manifest (frontmatter line: proof_root: <path>; a trailing # comment is not
# part of the path). Read here, JUDGED only after the staged-source test below: a bookkeeping-only commit has
# nothing to measure, so an unset proof_root must not print its info line on every one (archie F, 2026-09-24).
proof_root=$(grep -E '^\s*proof_root:' "$behavior" 2>/dev/null | head -1 | sed 's/^\s*proof_root:\s*//; s/\s*#.*$//' | tr -d ' ')

# newest STAGED source change (exclude .kdbp bookkeeping and the proof folder itself)
newest_src=0
newest_src_file=""
while IFS= read -r f; do
  case "$f" in
    .kdbp/*) continue ;;
    "${proof_root:-.kdbp}"/*) continue ;;                      # the proof folder itself (unset: a no-op repeat)
    docs/*|*.md) continue ;;                                   # prose is not source
    tests/*|test/*|*/tests/*|*/test/*|*/__tests__/*|__tests__/*|e2e/*|*/e2e/*|playwright/*|*/playwright/*) continue ;;   # test roots
    *.spec.*|*.test.*|*_test.py|test_*.py|*/test_*.py|conftest.py|*/conftest.py) continue ;;                          # test files by name
  esac
  [ -f "$f" ] || continue
  m=$(stat -c %Y "$f" 2>/dev/null || echo 0)
  if [ "$m" -gt "$newest_src" ]; then newest_src=$m; newest_src_file=$f; fi
done <<EOF
$(git diff --cached --name-only 2>/dev/null)
EOF

[ "$newest_src" -gt 0 ] || exit 0   # no staged source files — bookkeeping-only commit

if [ -z "$proof_root" ]; then
  echo "ℹ evidence-freshness: no proof_root in $behavior — check skipped (/gabe-init seeds it; set it to the committed evidence folder to enable the check)"
  exit 0
fi

# newest artifact under proof_root
newest_proof=0
if [ -d "$proof_root" ]; then
  newest_proof=$(find "$proof_root" -type f -printf '%T@\n' 2>/dev/null | sort -rn | head -1 | cut -d. -f1)
  newest_proof=${newest_proof:-0}
fi

if [ "$newest_proof" -ge "$newest_src" ] && [ "$newest_proof" -gt 0 ]; then
  echo "✓ evidence-freshness: proof under $proof_root is fresher than the staged changes (phase $phase_id)"
  exit 0
fi

if [ "$newest_proof" -eq 0 ]; then
  reason="no artifacts under $proof_root"
else
  reason="newest proof artifact is OLDER than staged change $newest_src_file"
fi
echo "⚠ EVIDENCE FRESHNESS: phase $phase_id carries proof but $reason."
echo "  Refresh the living proof set (re-run the journey/capture), or record why in the commit body."
mkdir -p "$(dirname "$bypass_log")"
printf '%s | phase %s | %s | newest_src=%s | newest_proof=%s\n' \
  "$(date '+%Y-%m-%d %H:%M')" "$phase_id" "$reason" "$newest_src" "$newest_proof" >> "$bypass_log"
exit 2
