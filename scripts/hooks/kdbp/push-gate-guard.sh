#!/usr/bin/env bash
# PUSH-GATE-GUARD — PreToolUse hook for Bash (terminal-env promotion guard)
# Ruling 2026-08-07, after the observed bypass: 49 commits promoted to production main via raw
# `git push origin origin/staging:main` — the scan ran, but the mandated proceed/hold ask was
# never asked and three gate fixes shipped sight-unseen. Spec prose alone did not hold (the
# same cycle's TASK CONTRACT went 0-for-19), so the terminal push fails CLOSED here instead.
#
# SECURITY POSTURE — fail closed on ambiguity. A gate that parses a command string cannot
# out-parse bash, so it does NOT try: any `git push` that this hook cannot PROVE targets only a
# non-terminal branch REQUIRES the marker. Every parser gap (glued operators, --all/--mirror,
# unknown global value-flags, repo redirection, glob refspecs, an unlocatable push verb) becomes
# a safe block, not a bypass. Clean feature pushes still resolve and stay silent.
# (The command-string layer is the fast advisory; a git-native pre-push hook that sees promotions,
#  wrappers, aliases and IDE pushes with zero parsing is the logged deeper follow-up — backlog.)
#
# Behavior:
#   · Fires only in KDBP projects with a MULTI-env .kdbp/PUSH.md (single-env gating is OFF by
#     ruling 2026-07-31). Only the DEFAULT env's terminal branch is gated (a mis-wired topology
#     where several envs read as terminal must not block ordinary staging pushes).
#   · A `git push` this hook cannot prove is non-terminal-only is BLOCKED unless /gabe-push wrote a
#     marker whose recorded HEAD sha equals the current HEAD (the scan ran against THIS tree — any
#     commit since invalidates it; content, never mtime, so it is portable and clone-safe).
#   · A PR MERGE is a promotion too (archie B1, 2026-09-24 — `gh pr merge 43 --merge` promoted to
#     main with no marker): `gh pr merge [<sel>]`, `gh api -X PUT …/pulls/<n>/merge` and a graphql
#     merge mutation resolve the PR's base with `gh pr view --json baseRefName` (5 s); a terminal base,
#     an unresolvable one, or a repo other than origin REQUIRES the same sha-bound marker. A merge made
#     in the GitHub web UI never passes through a local hook — branch protection is that gate.
#   · A QUOTED heredoc body (<<'X' <<"X" <<\X, and the <<- forms) is data bash never expands, so it
#     is dropped before parsing when the heredoc feeds a data reader (git commit -F -, cat, python…)
#     and nothing in the command runs a shell; anything else keeps the whole body (fail closed).
#   · Emergency escape: `GABE_PUSH_EMERGENCY=1` in the command — allowed with a loud warning.
#   · INERT (allow + loud warn) ONLY when a TOOL is missing (python3), never on push ambiguity.
# Exit 2 + stderr = blocking feedback. Battery: tests/hooks/run.sh (FIRE and SILENT both proven).
set -uo pipefail

[ -f ".kdbp/PUSH.md" ] || exit 0
input=$(cat)

# Cheap bash-side prefilter: the ~99% of Bash calls that are not pushes or merges never pay a
# python boot. A quoted decoy mentioning either word slips through to python, which decides.
case "$input" in *push*|*merge*) ;; *) exit 0 ;; esac

if ! command -v python3 >/dev/null 2>&1; then
  echo "[WARN] push-gate-guard INERT: python3 not on PATH — terminal-env push gating was NOT enforced"
  exit 0
fi

MARKER=".kdbp/.push-gate-ok"

verdict=$(GABE_HOOK_INPUT="$input" python3 - <<'PY' 2>/dev/null
import json, os, re, shlex, subprocess, sys

def out(v): print(v); sys.exit(0)

try:
    cmd = json.loads(os.environ.get("GABE_HOOK_INPUT", "{}")).get("tool_input", {}).get("command", "")
except Exception:
    out("ALLOW")

# ── quoted heredoc bodies are DATA (archie A, 2026-09-24: /gabe-push's own bookkeeping commit,
#    `git commit -F - <<'EOF'` with "push" and an apostrophe in the body, was blocked as
#    `unparseable`). Bash never expands a body whose delimiter is quoted, so a message or a probe
#    that MENTIONS push/merge is not a command — unless something in the command runs a shell
#    (`bash <<'EOF'`, `cat <<'EOF' | sh`, `… && bash x.sh`), where the body IS the command.
#    Anything this scanner cannot follow with certainty returns the command UNCHANGED, so the
#    old parse (and its fail-closed verdicts) applies. Unquoted bodies are always kept. ──────────
DATA_OWNERS = {"cat", "tee", "git", "gh", "python", "python3", "node", "jq", "grep", "sed", "awk",
               "head", "tail", "wc", "sort", "uniq", "cut", "tr", "column"}
SHELLS = {"bash", "sh", "zsh", "dash", "ksh", "fish", "source", "eval", "exec", "ssh", "xargs",
          "sudo", "su", "env", "nohup", "script", "watch", "timeout", "nice", "parallel"}
_SEP = re.compile(r"\|\||&&|;|\||\$\(|\(")

def _owner(prefix):
    try:
        ws = shlex.split(_SEP.split(prefix)[-1])
    except ValueError:
        return None
    ws = [w for w in ws if not re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", w)]
    return os.path.basename(ws[0]) if ws else None

def strip_quoted_heredocs(c):
    if "<<" not in c:
        return c
    lines, kept = c.split("\n"), []
    stack, depth, pending, li = ["N"], [0], [], 0   # N normal · S '…' · D "…" · C $(…)
    while li < len(lines):
        line, i = lines[li], 0
        n = len(line)
        while i < n:
            st, ch = stack[-1], line[i]
            if st == "S":
                if ch == "'":
                    stack.pop()
                i += 1
                continue
            if line.startswith("${", i):                 # ${…}: no redirect lives inside
                k = line.find("}", i)
                if k < 0 or re.search(r"['\"{]", line[i + 2:k]):
                    return c
                i = k + 1
                continue
            if ch == "\\":
                i += 2
                continue
            if st == "D":
                if ch == '"':
                    stack.pop()
                elif line.startswith("$(", i):
                    if "C" in stack:
                        return c                          # nested substitution — give up
                    stack.append("C"); depth.append(0); i += 2
                    continue
                i += 1
                continue
            if ch == "'":
                stack.append("S"); i += 1
                continue
            if ch == '"':
                stack.append("D"); i += 1
                continue
            if ch == "#" and (i == 0 or line[i - 1] in " \t;&|("):
                break                                     # a comment runs to the end of the line
            if line.startswith("$(", i):
                if "C" in stack:
                    return c
                stack.append("C"); depth.append(0); i += 2
                continue
            if st == "C" and ch == "(":
                depth[-1] += 1
            elif st == "C" and ch == ")":
                if depth[-1] == 0:
                    stack.pop(); depth.pop(); i += 1
                    continue
                depth[-1] -= 1
            if line.startswith("<<<", i):
                i += 3
                continue
            if line.startswith("<<", i):
                j = i + 2
                dash = j < n and line[j] == "-"
                j += 1 if dash else 0
                while j < n and line[j] in " \t":
                    j += 1
                word, quoted = [], False
                while j < n and line[j] not in " \t;&|<>()":
                    q = line[j]
                    if q in "'\"":
                        k = line.find(q, j + 1)
                        if k < 0:
                            return c
                        word.append(line[j + 1:k]); quoted = True; j = k + 1
                        continue
                    if q == "\\":
                        word.append(line[j + 1:j + 2]); quoted = True; j += 2
                        continue
                    word.append(q); j += 1
                delim = "".join(word)
                if not delim:
                    return c
                if quoted and _owner(line[:i]) not in DATA_OWNERS:
                    return c                              # the body may feed a shell — keep it all
                pending.append((delim, quoted, dash))
                i = j
                continue
            i += 1
        kept.append(line)
        li += 1
        if pending:
            if stack[-1] in ("S", "D") or line.endswith("\\"):
                return c                                  # a body cannot open inside a quote/continuation
            for delim, quoted, dash in pending:
                end = next((t for t in range(li, len(lines))
                            if (lines[t].lstrip("\t") if dash else lines[t]) == delim), None)
                if end is None:
                    return c                              # unterminated: bash reads to EOF
                if not quoted:
                    kept.extend(lines[li:end + 1])        # an expanded body stays for the parse
                li = end + 1
            pending = []
    if pending or stack != ["N"]:
        return c
    out_cmd = "\n".join(kept)
    # constructs the scanner does not follow — checked on the text OUTSIDE quoted bodies, where a
    # backtick or `case` is shell syntax (inside a body it is only data)
    if "`" in out_cmd or "$((" in out_cmd or "$'" in out_cmd or re.search(r"\bcase\b", out_cmd):
        return c
    try:
        ts = shlex.split(out_cmd)
    except ValueError:
        return c
    # something runs a shell (or `. file` sources one) — the body may be its script
    if any(os.path.basename(t) in SHELLS for t in ts) or any(
            t == "." and k + 1 < len(ts) and ts[k + 1] not in ("&&", "||", ";", "|") for k, t in enumerate(ts)):
        return c
    return out_cmd

cmd = strip_quoted_heredocs(cmd) if cmd else cmd
if not cmd or not (("push" in cmd and "git" in cmd) or ("merge" in cmd and "gh" in cmd)):
    out("ALLOW")
if "GABE_PUSH_EMERGENCY=1" in cmd:
    out("EMERGENCY")

def git(args):
    try:
        r = subprocess.run(["git"] + args, capture_output=True, text=True, timeout=10)
        return r.stdout.strip() if r.returncode == 0 else ""
    except Exception:
        return ""

# ── PUSH.md → env table + default_env (comments stripped: the template ships an example env
#    inside <!-- --> that must never count as declared). Two real shapes are parsed — template
#    table rows (`| target_branch | main |`) and plain key lines (`target_branch: main`) — and
#    the key cell is de-decorated (bold **k**, `backtick`, spaces) because the file is
#    hand-editable and markdown tables get prettified. A file that declares env headings but
#    yields no target_branch is INERT (loud), never a silent ALLOW. ──────────────────────────
try:
    raw = open(".kdbp/PUSH.md", encoding="utf-8").read()
except Exception:
    out("INERT")
raw = re.sub(r"<!--.*?-->", "", raw, flags=re.S)

def clean_key(k):
    return k.strip().strip("*").strip("`").strip()

def field(block, key):
    for line in block.splitlines():
        m = re.match(r"\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|", line)
        if m and clean_key(m.group(1)) == key:
            return m.group(2).strip()
        m = re.match(r"\s*([^:|]+?)\s*:\s*(.+?)\s*$", line)
        if m and clean_key(m.group(1)) == key:
            return m.group(2).strip()
    return None

def default_env(text):
    # de-decorate the key the same way field()/clean_key() do — a prettified
    # `| **default_env** | staging |` row must not fall silently to "production"
    for line in text.splitlines():
        m = re.match(r"\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|", line)
        if m and clean_key(m.group(1)) == "default_env":
            return m.group(2).strip()
        m = re.match(r"\s*([^:|]+?)\s*:\s*(.+?)\s*$", line)
        if m and clean_key(m.group(1)) == "default_env":
            return m.group(2).strip()
    return "production"

heading_blocks = re.split(r"^###\s+", raw, flags=re.M)[1:]
envs = []  # (name, target_branch, promote_from)
for block in heading_blocks:
    name = block.splitlines()[0].strip()
    tb = field(block, "target_branch")
    pf = field(block, "promote_from")
    if tb:
        envs.append((name, tb, pf or ""))

if heading_blocks and not envs:
    out("INERT")               # declared env headings but none parsed — never a silent ALLOW
if len(envs) < 2:
    out("ALLOW")               # single env: gating OFF (ruling 2026-07-31)

sources = {pf for _, _, pf in envs if pf and pf.lower() not in ("—", "-", "", "null", "none")}
terminal = {tb for name, tb, _ in envs if tb not in sources}
if not terminal:
    out("ALLOW")               # cyclic/odd config — not this guard's call
# A mis-wired topology reads several envs as terminal (the template's example second env,
# uncommented without wiring production.promote_from). Gate only the DEFAULT env's branch so
# ordinary staging pushes stay free; keep the whole set only when the default is not terminal.
if len(terminal) > 1:
    de = default_env(raw)
    de_tb = next((tb for name, tb, _ in envs if name == de), None)
    if de_tb in terminal:
        terminal = {de_tb}

# ── command → push destinations, fail-closed on anything unprovable ─────────────────────────
REDIRECT = ("-C", "--git-dir", "--work-tree", "--namespace", "--exec-path", "--config-env")
VALUE_FLAGS = {"-o", "--push-option", "--receive-pack", "--exec", "--repo", "-C", "-c",
               "--git-dir", "--work-tree", "--namespace", "--exec-path", "--config-env"}
GLUE = ("&&", "||", ";", "|", "`", "$(", "\n")
# SEQ = the CLEAN sequence/pipe boundaries. A STANDALONE one (its own shlex token) ends this push's
# segment trustworthily — the segment before it is fully parseable, so evaluate it and let the outer
# loop pick up whatever follows. Only a FUSED operator (staging&&echo) or a substitution token
# (` / $( / newline) makes the parse untrustworthy → fail closed. (Backtick/$(/newline are NOT in SEQ.)
SEQ = ("&&", "||", ";", "|")

try:
    toks = shlex.split(cmd)
except ValueError:
    out("REQUIRE unparseable")  # unbalanced quoting on a push-shaped command → fail closed
# PUSH-SHAPED or not — decided BEFORE any fail-close (gustify P8, 2026-09-04: the bash prefilter admits any
# command that merely MENTIONS "push" — a test filename `test_pre_push_api_gate.py`, the config key
# `push.default`, a table cell inside a python heredoc — and the fail-closes below then blocked read-only
# work three times in one session). A command is push-shaped only when some token IS `push`, or a token
# that could HIDE a push (a substitution/backtick/embedded newline) carries BOTH `git` and `push`.
# Everything else is not a push: ALLOW here, so no later fail-close ever fires on it.
def _hides(t):
    return ("`" in t) or ("$(" in t) or ("\n" in t)
# MERGE-SHAPED (archie B1): a `gh` token plus a merge verb, a REST merge path or a graphql merge
# mutation — or a hiding token that carries both words.
MERGE_MUTATIONS = ("mergePullRequest", "enablePullRequestAutoMerge")
MERGE_PATH = re.compile(r"^/?(?:repos/)?([^/\s]+)/([^/\s]+)/pulls/(\d+)/merge/?$")
def _merge_tok(t):
    return t == "merge" or bool(MERGE_PATH.match(t)) or any(m in t for m in MERGE_MUTATIONS)
push_shaped = any(t == "push" for t in toks) or any(_hides(t) and "git" in t and "push" in t for t in toks)
merge_shaped = (any(os.path.basename(t) == "gh" for t in toks) and any(_merge_tok(t) for t in toks)) or any(
    _hides(t) and re.search(r"\bgh\b", t) and re.search(r"\bmerge\b", t) for t in toks)
if not push_shaped and not merge_shaped:
    out("ALLOW")                        # mentions push/merge, is neither
# A command SUBSTITUTION (`…` or $(…)) or an embedded newline can hide a push the token walk never
# sees as `git` (e.g. `… && echo \`git push origin main\``) → fail closed for the WHOLE command,
# regardless of any clean leading segment. Sequence operators (&&/||/;/|) are handled per-segment below.
if any(_hides(t) for t in toks):
    out("REQUIRE substitution")

# ── gh merges: resolve the PR's base; a terminal base, an unresolvable one, or another repo REQUIRES ──
GH_PR_VALUE = {"-b", "--body", "-F", "--body-file", "-t", "--subject", "-A", "--author-email",
               "--match-head-commit", "-R", "--repo"}
API_FIELDS = {"-f", "--raw-field", "-F", "--field", "--input"}
env_repo = next((t.split("=", 1)[1] for t in toks if t.startswith("GH_REPO=")), None)

def _slug(s):
    parts = [p for p in re.sub(r"\.git$", "", (s or "").strip().rstrip("/")).split("/") if p]
    return "/".join(parts[-2:]).lower() if len(parts) >= 2 else None

def same_repo(slug):
    m = re.search(r"[:/]([^/:]+/[^/]+?)(?:\.git)?/?$", git(["remote", "get-url", "origin"]))
    return bool(m) and _slug(slug) == m.group(1).lower()

def pr_base(sel, repo):
    args = ["gh", "pr", "view"] + ([sel] if sel else []) + (["-R", repo] if repo else [])
    try:
        r = subprocess.run(args + ["--json", "baseRefName", "-q", ".baseRefName"],
                           capture_output=True, text=True, timeout=5)
        return r.stdout.strip() if r.returncode == 0 else ""
    except Exception:
        return ""

def gh_merge(seg):
    """None when this gh segment merges nothing; else (kind, selector, repo-or-None)."""
    if seg and seg[0] == "pr":
        verb, pos, repo, s = None, [], env_repo, 1
        while s < len(seg):
            t = seg[s]
            if t.startswith("-"):
                if t in ("-R", "--repo") and s + 1 < len(seg):
                    repo = seg[s + 1]
                elif t.startswith("--repo="):
                    repo = t.split("=", 1)[1]
                elif t.startswith("-R") and len(t) > 2:
                    repo = t[2:]
                s += 2 if (t in GH_PR_VALUE and "=" not in t) else 1
                continue
            if verb is None:
                verb = t
            else:
                pos.append(t)
            s += 1
        if verb != "merge" or "--disable-auto" in seg:
            return None
        sel = pos[0] if pos else None
        url = re.match(r"https?://[^/]+/([^/]+/[^/]+)/pull/\d+", sel or "")
        return ("pr", sel, url.group(1) if url else repo)
    if seg and seg[0] == "api":
        if "graphql" in seg and any(m in t for t in seg for m in MERGE_MUTATIONS):
            return ("graphql", None, None)
        path = next((MERGE_PATH.match(t) for t in seg if MERGE_PATH.match(t)), None)
        if not path:
            return None
        method, fields = None, False
        for s, t in enumerate(seg):
            if t in ("-X", "--method") and s + 1 < len(seg):
                method = seg[s + 1]
            elif t.startswith("--method="):
                method = t.split("=", 1)[1]
            elif re.match(r"-X[A-Za-z]+$", t):
                method = t[2:]
            if t in API_FIELDS or re.match(r"(--(raw-)?field|--input)=|-[fF].", t):
                fields = True
        if (method or ("POST" if fields else "GET")).upper() == "GET":
            return None                 # reading a PR's merge status merges nothing
        owner, name, num = path.groups()
        placeholder = owner in ("{owner}", ":owner") and name in ("{repo}", ":repo")
        return ("api", num, env_repo if placeholder else owner + "/" + name)
    return None

def resolve_current():
    up = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"])
    if up and "/" in up:
        return up.split("/", 1)[1]     # remote-tracking → its branch
    return git(["rev-parse", "--abbrev-ref", "HEAD"]) or None

i = 0
while i < len(toks):
    if os.path.basename(toks[i]) == "gh":
        seg, k, glued = [], i + 1, False
        while k < len(toks):
            if toks[k] in SEQ:
                k += 1
                break
            glued = glued or any(g in toks[k] for g in GLUE)
            seg.append(toks[k]); k += 1
        if glued and any(_merge_tok(t) or "merge" in t for t in seg):
            out("REQUIRE shell-glue")   # an operator fused into a gh segment that mentions a merge
        mg = gh_merge(seg)
        if mg:
            kind, sel, repo = mg
            if kind == "graphql":
                out("REQUIRE merge-base-unresolved (graphql merge mutation)")
            if repo and not same_repo(repo):
                out("REQUIRE repo-redirect (merge in %s, not origin)" % repo)
            base = pr_base(sel, repo)
            if not base:
                out("REQUIRE merge-base-unresolved (gh pr view failed)")
            if base in terminal:
                out("REQUIRE merge into " + base)
        i = k
        continue
    if os.path.basename(toks[i]) != "git":   # /usr/bin/git is still git
        i += 1
        continue
    # any global redirect flag means our cwd/PUSH.md may be the wrong repo → cannot prove safe
    seg_has_redirect = False
    j = i + 1
    while j < len(toks) and toks[j].startswith("-"):
        t = toks[j]
        if t in REDIRECT or t.startswith(tuple(r + "=" for r in REDIRECT)):
            seg_has_redirect = True
        j += 2 if (t in VALUE_FLAGS and not t.endswith("=") and "=" not in t) else 1
    if j >= len(toks) or toks[j] != "push":
        # a `git` whose subcommand we could not locate as `push` (an unknown value-flag ate it,
        # or it is `git log`/etc). If the whole command still mentions push, fail closed.
        i = j
        continue
    if seg_has_redirect:
        out("REQUIRE repo-redirect")
    # collect this push's segment up to a shell operator
    seg, k = [], j + 1
    while k < len(toks):
        tk = toks[k]
        if tk in SEQ:                   # STANDALONE sequence operator → clean boundary: this segment is
            k += 1                      # complete + parseable. Stop here; the outer loop (i = k) resumes
            break                       # past it — a later `git push` or `gh` merge gets its own segment.
        if any(g in tk for g in GLUE):  # operator FUSED into a token, or a substitution/newline → untrustworthy
            out("REQUIRE shell-glue")
        seg.append(tk); k += 1
    if any(f in seg for f in ("--all", "--mirror", "--tags")):
        out("REQUIRE push-all")         # updates branches wholesale, main among them
    deleting = ("--delete" in seg) or ("-d" in seg)
    pos, s = [], 0
    while s < len(seg):
        t = seg[s]
        if t.startswith("-"):
            s += 2 if (t in VALUE_FLAGS and "=" not in t) else 1
            continue
        pos.append(t); s += 1
    refspecs = pos[1:]  # pos[0] = remote
    dests = []
    if not refspecs:
        cur = resolve_current()
        if not cur:
            out("REQUIRE unknown-branch")
        dests = [cur]
    else:
        for r in refspecs:
            d = r.split(":", 1)[1] if ":" in r else r
            d = re.sub(r"^\+", "", d).replace("refs/heads/", "")
            if d in ("HEAD", "@", ""):
                cur = resolve_current()
                if not cur:
                    out("REQUIRE unknown-branch")
                d = cur
            if re.search(r"[*?\[]", d):
                out("REQUIRE glob-refspec")  # `refs/heads/*` — can't prove it misses terminal
            dests.append(d)
    hit = sorted(set(d for d in dests if d in terminal))
    if hit:
        verb = "delete of" if deleting else "push to"
        out("REQUIRE " + verb + " " + " ".join(hit))
    i = k

out("ALLOW")
PY
)
rc=$?

if [ "$rc" -ne 0 ] || [ -z "${verdict:-}" ]; then
  echo "[WARN] push-gate-guard INERT: the guard could not run to a verdict — terminal-env push gating was NOT enforced on this call"
  exit 0
fi

case "$verdict" in
  ALLOW) exit 0 ;;
  INERT)
    echo "[WARN] push-gate-guard INERT: .kdbp/PUSH.md declares env headings but none parsed — terminal-env push gating was NOT enforced. Fix the env table (target_branch rows) or run /gabe-push --reconfigure."
    exit 0 ;;
  EMERGENCY)
    echo "[WARN] push-gate-guard: GABE_PUSH_EMERGENCY=1 — terminal-env push allowed WITHOUT the production gate. This bypass rides its own commit history; expect /gabe-review to flag it."
    exit 0 ;;
  REQUIRE*)
    reason=${verdict#REQUIRE }
    head=$(git rev-parse HEAD 2>/dev/null || true)
    if [ -f "$MARKER" ] && [ -n "$head" ]; then
      read -r m_sha _rest < "$MARKER" 2>/dev/null || m_sha=""
      if [ "$m_sha" = "$head" ]; then
        echo "push-gate: marker honored (HEAD ${head:0:8}) — this push was authorized by /gabe-push"
        exit 0
      fi
    fi
    {
      echo "⛔ PUSH-GATE-GUARD blocked this promotion-shaped command (${reason}) — a \`git push\` or a \`gh\` PR merge it cannot prove misses the terminal branch, or a substitution that could hide either."
      echo "The production gate has not run for THIS tree: no .kdbp/.push-gate-ok whose recorded HEAD matches $(printf %.8s "${head:-?}") (the marker is written by /gabe-push Step 3.5 ONLY after the /gabe-health findings are presented and the operator answers the ONE proceed/hold question; any commit since re-arms the gate)."
      echo "Fix: run /gabe-push <terminal-env> — it runs the scan, asks, writes the sha-bound marker, and performs this push itself."
      echo "Emergency only: prefix the push with GABE_PUSH_EMERGENCY=1 — allowed with a loud warning, reviewable after the fact."
    } >&2
    exit 2 ;;
  *) exit 0 ;;
esac
