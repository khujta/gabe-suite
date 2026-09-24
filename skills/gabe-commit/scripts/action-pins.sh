#!/usr/bin/env bash
# action-pins — deterministic WARN check (supply chain, archie S1 2026-09-24).
#
# A third-party GitHub Action named by a mutable tag (`@v5`) runs whatever its owner last pushed to that
# tag, with the job's token and secrets — on a self-hosted runner, on the machine itself. This check warns
# when a STAGED workflow change ADDS a `uses:` line that is:
#   · not a local action (`./…`) and not GitHub's own `actions/*`
#   · not pinned to a full commit SHA (`@<40 hex>`) — or, for `docker://`, to an `@sha256:` digest
# Only ADDED lines count: an existing unpinned ref is debt the diff did not create, and a removed one is a fix.
# Exit codes: 0 = clean/skipped, 2 = warned. Never blocks — the finding enters triage like any other.
set -u

files=$(git diff --cached --name-only --diff-filter=AM -- '.github/workflows/*.yml' '.github/workflows/*.yaml' 2>/dev/null)
[ -n "$files" ] || exit 0
command -v python3 >/dev/null 2>&1 || { echo "ℹ action-pins: python3 unavailable — skipped"; exit 0; }

git diff --cached -U0 --diff-filter=AM -- '.github/workflows/*.yml' '.github/workflows/*.yaml' | python3 -c '
import re, sys
USES = re.compile(r"^\+\s*(?:-\s*)?uses:\s*[\"\x27]?([^\s\"\x27#]+)")
hits, path, line = [], None, 0
for raw in sys.stdin.read().splitlines():
    if raw.startswith("+++ "):
        path = raw[6:] if raw.startswith("+++ b/") else raw[4:]
        continue
    h = re.match(r"^@@ -\S+ \+(\d+)", raw)
    if h:
        line = int(h.group(1))
        continue
    if raw.startswith("+"):
        m = USES.match(raw)
        if m:
            ref = m.group(1)
            name, _, pin = ref.partition("@")
            if ref.startswith("docker://"):
                bad = "@sha256:" not in ref
            else:
                bad = not (name.startswith("./") or name.startswith("actions/") or re.fullmatch(r"[0-9a-f]{40}", pin))
            if bad:
                hits.append("  %s:%d  %s" % (path, line, ref))
        line += 1
if hits:
    print("⚠ ACTION PINS: %d third-party action ref(s) added without a commit-SHA pin — a mutable tag runs whatever its owner pushes next:" % len(hits))
    print("\n".join(hits))
    print("  Pin: uses: owner/action@<40-hex sha>  # vN   (resolve: gh api repos/<owner>/<action>/commits/<tag> --jq .sha)")
    sys.exit(2)
'
