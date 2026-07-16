#!/usr/bin/env bash
# KDBP CHECKPOINT — PreToolUse hook for Bash (git commit detection)
# 1) Reminds to use /gabe-commit instead of raw git commit.
# 2) D7 deterministic WARNS (never blocks — debts warn; only plan-proof-guard blocks lies):
#    · a STAGED NEW test file with no C[N] id marker (see gabe-red references/red-spec.md)
#    · a declared case id (current phase's `cases` record) that greps 0 hits in the corpus
set -euo pipefail
if [ -f ".kdbp/BEHAVIOR.md" ]; then
  input=$(cat)
  # Extract tool_input.command with a real JSON parse (the grep '[^"]*' form truncates at the
  # first escaped quote — `echo "building" && git commit` would slip through), then emit it
  # with quoted spans removed so a `git commit` inside a quoted ARGUMENT (git log --grep
  # "; git commit") never false-triggers. Stripping happens ONLY when shlex confirms the
  # quoting is balanced — an unterminated quote (typo) keeps the raw command, so a real
  # `git commit` can never be swallowed (false-warn over false-silence; a parity count
  # cannot make that guarantee). Grep fallback (raw, unstripped) when python3 is absent.
  cmd_bare=""
  if command -v python3 >/dev/null 2>&1; then
    cmd_bare=$(printf '%s' "$input" | python3 -c '
import json, re, shlex, sys
try:
    cmd = json.load(sys.stdin).get("tool_input", {}).get("command", "")
except Exception:
    cmd = ""
bare = cmd
try:
    shlex.split(cmd)  # raises ValueError on unbalanced quoting
    bare = re.sub(r"\"[^\"]*\"", "", cmd)
    bare = re.sub(r"\x27[^\x27]*\x27", "", bare)
except ValueError:
    pass  # unbalanced (typo) → keep raw; never strip on a guess
print(bare)' 2>/dev/null || true)
  fi
  if [ -z "$cmd_bare" ]; then
    cmd_bare=$(printf '%s' "$input" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/"command"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//' || true)
  fi
  if [ -n "$cmd_bare" ] && printf '%s' "$cmd_bare" | grep -qE '(^|&&[[:space:]]*|;[[:space:]]*)git commit' 2>/dev/null; then
      echo "[WARN] KDBP CHECKPOINT: Use /gabe-commit instead of raw git commit"

      # --- C-ID warn: new test files staged without an id marker ---
      # NUL-delimited so filenames with spaces/globs survive (an unquoted for-loop word-splits)
      while IFS= read -r -d '' f; do
        [ -f "$f" ] || continue
        if ! printf '%s' "$f" | grep -qE '(^|/)tests?/|(^|/)test_[^/]+\.|\.(test|spec)\.[a-zA-Z]+$'; then
          continue
        fi
        # token must not ride inside another word (SEC101, RFC1234, UTC2024 are not case ids);
        # ERE form of red-spec's anchored pattern — portable, no grep -P dependency
        if ! grep -qE '(^|[^A-Za-z0-9])C[0-9]{1,5}([^0-9]|$)' "$f" 2>/dev/null; then
          echo "[WARN] C-ID: new test file $f carries no C[N] case id (gabe-red red-spec — ids are born in test names)"
        fi
      done < <(git diff --cached --name-only --diff-filter=A -z 2>/dev/null || true)

      # --- declared-case warn: the current phase's case ids must exist in the corpus ---
      if [ -f ".kdbp/PLAN.json" ] && command -v python3 >/dev/null 2>&1; then
        ids=$(python3 -c '
import json,re
try:
    p=json.load(open(".kdbp/PLAN.json"))
    cur=str(p.get("current_phase",""))
    for ph in p.get("phases",[]) or []:
        if str(ph.get("id"))==cur:
            print(" ".join(sorted(set(re.findall(r"(?<![A-Za-z0-9])C[0-9]{1,5}(?![0-9])", ph.get("cases") or "")))))
except Exception:
    pass' 2>/dev/null || true)
        for cid in $ids; do
          # exclude .kdbp — the PLAN that DECLARES the id must not satisfy its own corpus check;
          # anchored both sides so C147 never rides on C1472 or ABC147 (red-spec's ERE form)
          if ! git grep -qE "(^|[^A-Za-z0-9])${cid}([^0-9]|\$)" -- ':(exclude).kdbp' 2>/dev/null; then
            echo "[WARN] C-ID: declared $cid (current phase Cases record) greps 0 hits in the corpus — write the test with $cid in its name, or fix the id in the Cases record"
          fi
        done
      fi
  fi
fi
