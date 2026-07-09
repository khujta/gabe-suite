#!/usr/bin/env bash
# suite-doctor — drift check: repo vs ~/.claude (Claude Code is the only harness).
#
# The standing rule this enforces (investigation 2026-07, plan step 0.1):
#   suite changes land in the REPO first; installs are regenerated via
#   ./install.sh, never patched in place. This script makes silent drift
#   visible. Exit 0 = clean, exit 1 = drift found.
#
# Usage: scripts/suite-doctor.sh [--quiet]
set -u
REPO="$(cd "$(dirname "$0")/.." && pwd)"
QUIET="${1:-}"
drift=0

hash_of() { [ -f "$1" ] && md5sum "$1" | cut -d' ' -f1 || echo "MISSING"; }

report() { # status path detail
  drift=1
  echo "DRIFT  $1  $2"
}

check_pair() { # repo_file install_file label
  local rh ih
  rh=$(hash_of "$1"); ih=$(hash_of "$2")
  if [ "$rh" != "$ih" ]; then
    if [ "$ih" = "MISSING" ]; then report "$3" "missing from install: $2"
    elif [ "$rh" = "MISSING" ]; then report "$3" "exists only in install (never committed): $2"
    else report "$3" "differs: $2"
    fi
  fi
}

check_home() { # home label
  local home="$1" label="$2"
  [ -d "$home" ] || { echo "SKIP   $label — $home not present"; return; }
  # skills
  for d in "$REPO"/skills/gabe-*/; do
    name=$(basename "$d")
    while IFS= read -r f; do
      rel="${f#"$d"}"
      check_pair "$f" "$home/skills/$name/$rel" "$label"
    done < <(find "$d" -type f ! -path '*node_modules*' ! -path '*__pycache__*')
    # files present in install but not in repo
    if [ -d "$home/skills/$name" ]; then
      while IFS= read -r f; do
        rel="${f#"$home"/skills/"$name"/}"
        [ -f "$d$rel" ] || report "$label" "exists only in install (never committed): $f"
      done < <(find "$home/skills/$name" -type f ! -path '*__pycache__*')
    fi
  done
  # commands retired (B2 skills-only migration) — any surviving gabe command file is a straggler
  for f in "$home"/commands/gabe-*.md; do
    [ -e "$f" ] || continue
    report "$label" "retired surface still installed (commands are gone — remove): $f"
  done
  # kdbp session hooks (repo scripts/hooks/kdbp/* → <home>/scripts/hooks/kdbp/*, both directions)
  while IFS= read -r f; do
    rel="${f#"$REPO"/scripts/hooks/kdbp/}"
    check_pair "$f" "$home/scripts/hooks/kdbp/$rel" "$label"
  done < <(find "$REPO/scripts/hooks/kdbp" -type f 2>/dev/null)
  if [ -d "$home/scripts/hooks/kdbp" ]; then
    while IFS= read -r f; do
      rel="${f#"$home"/scripts/hooks/kdbp/}"
      [ -f "$REPO/scripts/hooks/kdbp/$rel" ] || report "$label" "retired hook still installed (A2 KDBP-lite — remove): $f"
    done < <(find "$home/scripts/hooks/kdbp" -type f)
  fi
  # templates (repo templates/* → <home>/templates/gabe/*, both directions)
  while IFS= read -r f; do
    rel="${f#"$REPO"/templates/}"
    check_pair "$f" "$home/templates/gabe/$rel" "$label"
  done < <(find "$REPO/templates" -type f)
  if [ -d "$home/templates/gabe" ]; then
    while IFS= read -r f; do
      rel="${f#"$home"/templates/gabe/}"
      [ -f "$REPO/templates/$rel" ] || report "$label" "exists only in install (never committed): $f"
    done < <(find "$home/templates/gabe" -type f)
  fi
}

check_home "$HOME/.claude" "claude"

if [ "$drift" -eq 0 ]; then
  [ "$QUIET" = "--quiet" ] || echo "suite-doctor: CLEAN — repo and ~/.claude are in sync."
  exit 0
else
  echo "suite-doctor: DRIFT FOUND — reconcile via the repo (commit repo-ward captures, then ./install.sh). Never patch installs in place."
  exit 1
fi
