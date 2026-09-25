#!/usr/bin/env bash
# _a3_commits battery — recent git commits → the graph ELEMENTS they touched, as journeys.
#
# build_commits reads git + the built c4 graph's file→node index and returns the most recent
# N commits that TOUCHED THE MAP (a commit changing only tests/docs/config is SKIPPED).
# Proven HERMETICALLY (a throwaway git repo + a stub graph, no twin, no network):
#   * FILE→NODE mapping covers BOTH backend det.file AND fe piece file; a node with no file
#     is never mapped.
#   * MAP-TOUCHING FILTER: a commit touching only non-graph files has no journey (skipped),
#     so N counts map-touching commits, not raw commits.
#   * HONEST-EMPTY: no git → None; emit(None) → window.GABE_COMMITS = [].
#   * DETERMINISM: byte-identical on a re-run (a function of tree+head; no wallclock).
#   * TWO PASSES (pick by name, measure the picked): output json-identical to the old single
#     --numstat pass, kept inline below as the reference; add/del still count the WHOLE commit.
#   * THE REASON: an empty feed's stub names why (no graph · no git · git log failed · timed out ·
#     no map-touching commit) on ONE comment line, proven with a PATH git shim; an unchanged feed is
#     not rewritten; no map (no c4-graph.json) writes neither feed; the tail's keep_last keeps the last
#     good commits.js over a failed git; a write that raises reads 'failed' and the other feed still lands.
#   * THE SPINE (spine.js): the LEDGER's five beats, newest first whatever order the file keeps,
#     each commit ONCE per beat — in the newest row naming it, 7- and 8-char spellings folded to the
#     longer, a summary row re-listing its tasks' shas never doubling one — green@ in Gates as the
#     fallback, archives read, Commits read by position, the sha tokenizer's FIRE and SILENT sets.
# FIRE and SILENT both exercised (mutation-proven). Exit 0 = all pass.
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
GEN="${GEN_OVERRIDE:-$REPO/templates/center/generators}"   # override for the mutation proof

python3 - "$GEN" <<'PY'
import sys, json, tempfile, subprocess, pathlib, os, shutil, time
gen = sys.argv[1]
sys.path.insert(0, gen)
import _a3_commits, _a3_sim, _kdbp_ledger

pass_ = 0; fail = 0
def check(cond, msg):
    global pass_, fail
    if cond: pass_ += 1
    else: fail += 1; print("  FAIL:", msg)

# a stub c4 graph: backend nodes homed by det.file + one fe piece by file; one node has NO file.
GRAPH = {"l2": {"recipe": {"nodes": [
            {"id": "model:Recipe",        "det": {"file": "api/recipe.py"}},
            {"id": "endpoint:GET /recipes","det": {"file": "api/recipe.py"}},
            {"id": "model:NoFile"}]}},                      # no det.file → never mapped
         "fe": {"pieces": [{"id": "fe:web/RecipeScreen.tsx", "file": "web/RecipeScreen.tsx"}]}}

with tempfile.TemporaryDirectory() as td:
    root = pathlib.Path(td)
    (root / "api").mkdir(); (root / "web").mkdir(); (root / "docs").mkdir()
    env = {**os.environ, "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@t",
           "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@t"}
    def git(*a): subprocess.run(["git", *a], cwd=td, env=env, capture_output=True)
    git("init", "-q")
    # base: docs ONLY (not a graph file) → base itself is NOT map-touching
    (root / "docs/README.md").write_text("# docs\n")
    git("add", "-A"); git("commit", "-qm", "base: docs only")
    # commit A: ADD a backend file AND the fe file → maps to 3 nodes
    (root / "api/recipe.py").write_text("x=1\n"); (root / "web/RecipeScreen.tsx").write_text("export const S=1\n")
    git("add", "-A"); git("commit", "-qm", "A: recipe api + screen")
    # commit B: touch ONLY docs (no graph node) → MUST be skipped
    (root / "docs/README.md").write_text("# docs v2\n")
    git("add", "-A"); git("commit", "-qm", "B: docs only")
    # commit C: a MAPPED file (small change → literal lines) AND an UNMAPPED one in the SAME
    # commit — so "an unmapped file never enters diffs" is a live assertion, not a vacuous one
    (root / "api/recipe.py").write_text("x=3\n")
    (root / "docs/README.md").write_text("# docs v3\n")
    git("add", "-A"); git("commit", "-qm", "C: recipe api")
    # commit D (newest): rewrite the fe file WIDE — past _SMALL, so counts only, no lines
    (root / "web/RecipeScreen.tsx").write_text("".join(f"export const v{i}={i}\n" for i in range(40)))
    git("add", "-A"); git("commit", "-qm", "D: wide screen rewrite")

    cs = _a3_commits.build_commits(root, GRAPH, n=30)
    check(cs is not None and len(cs) == 3,
          f"only the 3 MAP-TOUCHING commits are kept (B, docs-only, is skipped) — got {None if cs is None else len(cs)}")
    subs = [c["subject"] for c in (cs or [])]
    check("B: docs only" not in subs, "the docs-only commit produces NO journey (map-touching filter)")
    check(bool(cs) and cs[0]["subject"].startswith("D") and cs[2]["subject"].startswith("A"),
          "commits are newest-first (D before C before A)")
    # C touched the backend file → both nodes homed to it, sorted; the no-file node never appears
    check(bool(cs) and cs[1]["touched"] == ["endpoint:GET /recipes", "model:Recipe"],
          f"a backend file maps to ALL its nodes, sorted; a file-less node never maps — got {cs[1]['touched'] if cs else None}")
    # A touched backend + fe → the fe piece id is included (fe file mapping works)
    check(bool(cs) and "fe:web/RecipeScreen.tsx" in cs[2]["touched"] and cs[2]["nTouched"] == 3,
          f"a commit touching an fe file maps to its fe piece — got {cs[2]['touched'] if cs else None}")
    # n limit counts MAP-TOUCHING commits: n=1 → only the newest map-touching (C)
    c1 = _a3_commits.build_commits(root, GRAPH, n=1)
    check(bool(c1) and len(c1) == 1 and c1[0]["subject"].startswith("D"),
          "n limits to the newest MAP-TOUCHING commits (n=1 → D only)")
    # ── the CHANGE BLOCK the commit-journey step panel reads (operator 2026-09-11) ──
    D, C = cs[0], cs[1]
    check("diffs" in C and "api/recipe.py" in C["diffs"], "each commit carries per-file diffs for its MAPPED files")
    check(C["diffs"]["api/recipe.py"]["a"] == 1 and C["diffs"]["api/recipe.py"]["d"] == 1,
          f"per-file added/deleted are exact — got {C['diffs']['api/recipe.py']}")
    check(C["add"] == 2 and C["del"] == 2,
          f"the rollup ± counts the WHOLE commit, mapped or not — got +{C['add']}/-{C['del']}")
    lines = C["diffs"]["api/recipe.py"].get("lines")
    check(bool(lines) and ["-", "x=1"] in lines and ["+", "x=3"] in lines,
          f"a SMALL change carries its literal ± lines (side-by-side) — got {lines}")
    check(all(len(p) == 2 and p[0] in "+-" for p in lines), "every stored line is a [sign, text] pair")
    big = D["diffs"]["web/RecipeScreen.tsx"]
    check(big["a"] == 40 and big["d"] == 1, f"a BIG file still carries exact counts — got {big}")
    check("lines" not in big, "a BIG change carries NO literal lines — counts only, never truncated content")
    check("api/recipe.py" in C["diffs"] and "docs/README.md" not in C["diffs"],
          f"an UNMAPPED file never enters diffs even beside a mapped one — got {sorted(C['diffs'])}")
    # DETERMINISM: a function of tree+head → byte-identical
    check(json.dumps(cs, sort_keys=True) == json.dumps(_a3_commits.build_commits(root, GRAPH, n=30), sort_keys=True),
          "build_commits is byte-deterministic across re-runs")
    # a graph with NO files → nothing maps → no map-touching commits (empty, not a crash)
    check(_a3_commits.build_commits(root, {"l2": {}, "fe": {"pieces": []}}, n=30) == [],
          "a graph with no file-homed node yields ZERO commit journeys (honest-empty)")

    # ── (a) TWO PASSES == the old ONE pass. The reference below is the single `git log --numstat`
    # derivation as it stood before the split, verbatim; the two-pass one must match it to the byte.
    def ref_build(root, graph, n=30, scan=None):
        if not _a3_sim._ok(["git", "rev-parse", "--git-dir"], root):
            return None
        f2n = _a3_commits._file_to_nodes(graph)
        scan = scan or max(n * 20, 400)
        fmt = _a3_commits._REC + _a3_commits._SEP.join(["%H", "%h", "%s", "%aI", "%an"])
        stream = _a3_sim._sh(["git", "log", "-n", str(scan), "--no-merges", "--numstat", "--no-renames",
                              f"--format={fmt}"], root)
        kept = []
        for chunk in stream.split(_a3_commits._REC):
            chunk = chunk.strip("\n")
            if not chunk:
                continue
            lines = chunk.split("\n")
            head = lines[0].split(_a3_commits._SEP)
            if len(head) < 5:
                continue
            sha, short, subject, date, author = head[:5]
            stat = {}
            for row in lines[1:]:
                if not row.strip():
                    continue
                parts = row.split("\t")
                if len(parts) < 3:
                    continue
                f = _a3_sim._unrename(parts[2])
                a, d = parts[0], parts[1]
                stat[f] = [-1, -1] if (a == "-" or d == "-") else [int(a or 0), int(d or 0)]
            files = sorted(stat)
            touched = sorted({nid for f in files for nid in f2n.get(f, [])})
            if not touched:
                continue
            mapped = [f for f in files if f2n.get(f)]
            small = [f for f in mapped if stat[f] != [-1, -1] and sum(stat[f]) <= _a3_commits._SMALL][:_a3_commits._MAX_FILES]
            content = _a3_commits._hunk_lines(root, sha, small)
            diffs = {f: ({"a": stat[f][0], "d": stat[f][1]} | ({"lines": content[f]} if f in content else {})) for f in mapped}
            kept.append({"sha": sha, "short": short, "subject": subject, "date": date, "author": author,
                         "touched": touched, "diffs": diffs, "nFiles": len(files), "nTouched": len(touched),
                         "add": sum(v[0] for v in stat.values() if v[0] > 0),
                         "del": sum(v[1] for v in stat.values() if v[1] > 0)})
            if len(kept) >= n:
                break
        return kept
    for kw in ({"n": 30}, {"n": 1}, {"n": 2}, {"n": 30, "scan": 2}):
        check(json.dumps(ref_build(root, GRAPH, **kw)) == json.dumps(_a3_commits.build_commits(root, GRAPH, **kw)),
              f"two passes == the old single numstat pass, json-identical ({kw})")
    check(json.dumps(ref_build(root, {"l2": {}}, n=30)) == json.dumps(_a3_commits.build_commits(root, {"l2": {}}, n=30)),
          "two passes == the old single pass on a graph nothing maps to")

    # ── (b) render: one stub for None and [], emit writes exactly render(), exact bytes twice
    check(_a3_commits.render(None) == _a3_commits.render([]) and _a3_commits.render(None).startswith("// commits honest-empty — ")
          and _a3_commits.render(None).endswith("\nwindow.GABE_COMMITS = [];\n"),
          f"render(None) == render([]) is the honest-empty stub — got {_a3_commits.render(None)!r}")
    out_b = root / "out-b"; out_b.mkdir()
    _a3_commits.emit(cs, out_b)
    check((out_b / "commits.js").read_text(encoding="utf-8") == _a3_commits.render(cs), "emit writes exactly render(commits)")
    _a3_commits.emit(None, out_b, "no git (rev-parse failed)")
    check((out_b / "commits.js").read_text(encoding="utf-8") == _a3_commits.render(None, "no git (rev-parse failed)"),
          "emit(None, reason) writes exactly render(None, reason)")
    r1 = _a3_commits.render(*_a3_commits.derive(root, GRAPH)); r2 = _a3_commits.render(*_a3_commits.derive(root, GRAPH))
    check(r1 == r2 and r1.startswith("window.GABE_COMMITS = ["), "commits.js text is byte-identical across two derivations")
    check(_a3_commits.derive(root, GRAPH)[1] is None, "a feed with commits carries no reason")
    check(_a3_commits.derive(root, None) == (None, "no graph (the c4 derivation failed)"), "no graph → None + 'no graph'")
    check(_a3_commits.derive(root, {"l2": {}}) == ([], "no map-touching commit in the last 600"),
          f"nothing on the map → [] + 'no map-touching commit in the last 600' — got {_a3_commits.derive(root, {'l2': {}})}")
    # a reason that spans lines is flattened into the stub's ONE comment line — a newline would push its tail into code,
    # the stub would not parse and GABE_COMMITS would be undefined: the silent blank the reason exists to end
    two = _a3_commits.render(None, "commits derivation error: line one\nline two")
    check(two == "// commits honest-empty — commits derivation error: line one line two\nwindow.GABE_COMMITS = [];\n",
          f"a multi-line reason stays on the stub's one comment line — got {two!r}")

    # ── (c) the REASON under a failing git: a PATH shim that refuses only `log` (FIRE), then the real git (SILENT)
    real_git = shutil.which("git")
    shim = root / "shim"; shim.mkdir()
    (shim / "git").write_text(f'#!/bin/sh\ncase "$1" in log) echo "fatal: the shim refuses log" >&2; exit 1;; esac\nexec "{real_git}" "$@"\n')
    (shim / "git").chmod(0o755)
    path0 = os.environ["PATH"]
    os.environ["PATH"] = f"{shim}{os.pathsep}{path0}"
    try:
        got, why = _a3_commits.derive(root, GRAPH)
        stub = _a3_commits.render(got, why)
    finally:
        os.environ["PATH"] = path0
    check(got is None and stub.startswith("// commits honest-empty — git log failed: rc 1 — fatal: the shim refuses log\n")
          and "window.GABE_COMMITS = [];" in stub, f"a failing git log names itself in the stub — got {stub!r}")
    got2, why2 = _a3_commits.derive(root, GRAPH)
    check(bool(got2) and why2 is None, "SILENT: the real git gives data and no reason")
    # a git log past the budget reads as a timeout, not as 'failed' and not as an empty map
    (shim / "git").write_text(f'#!/bin/sh\ncase "$1" in log) exec sleep 3;; esac\nexec "{real_git}" "$@"\n')
    t0, os.environ["PATH"], _a3_commits._TIMEOUT = _a3_commits._TIMEOUT, f"{shim}{os.pathsep}{path0}", 1
    try:
        got3, why3 = _a3_commits.derive(root, GRAPH)
    finally:
        os.environ["PATH"], _a3_commits._TIMEOUT = path0, t0
    check(got3 is None and why3 == "git log timed out after 1 s", f"a git log past the budget reads 'timed out' — got {why3!r}")

    # ── (d) refresh_feeds: both feeds in one step; a second run leaves bytes AND mtimes alone
    center = root / "center"; center.mkdir(); kd = root / ".kdbp"; kd.mkdir()
    (kd / "LEDGER.md").write_text("| Date | Entry | Theme | Commits | Gates |\n|---|---|---|---|---|\n"
                                  f"| 2026-09-23 | COMMIT | c | {cs[0]['short']} | ok |\n")
    res1 = _a3_commits.refresh_feeds(root, center, kd, graph=GRAPH)
    check(res1 == {"commits": ("wrote", 3, None), "spine": ("wrote", 1, None)}, f"refresh_feeds writes both feeds — got {res1}")
    check((center / "commits.js").read_text(encoding="utf-8") == _a3_commits.render(cs), "refresh_feeds' commits.js == render(build_commits)")
    mt = {f: (center / f).stat().st_mtime_ns for f in ("commits.js", "spine.js")}
    time.sleep(0.02)
    res2 = _a3_commits.refresh_feeds(root, center, kd, graph=GRAPH)
    check(res2 == {"commits": ("unchanged", 3, None), "spine": ("unchanged", 1, None)}
          and mt == {f: (center / f).stat().st_mtime_ns for f in mt},
          f"a second refresh_feeds is 'unchanged' and leaves st_mtime_ns alone — got {res2}")
    # no map, no feed: graph=None with no (or a broken) c4-graph.json returns {} and leaves BOTH files' bytes and mtimes
    # alone — the spine too, whatever only= asks (a center without its map is pre-map, or the suite's own)
    snap = lambda c=center: {f: ((c / f).read_bytes(), (c / f).stat().st_mtime_ns) for f in ("commits.js", "spine.js")}
    s0 = snap()
    check(_a3_commits.refresh_feeds(root, center, kd) == {} and _a3_commits.refresh_feeds(root, center, kd, only=("spine",)) == {}
          and snap() == s0, "graph=None with no c4-graph.json writes neither feed (spine included) and returns {}")
    (center / "c4-graph.json").write_text("{not json")
    check(_a3_commits.refresh_feeds(root, center, kd) == {} and snap() == s0, "a c4-graph.json that does not parse writes neither feed")
    (center / "c4-graph.json").write_text(json.dumps(GRAPH))
    check(_a3_commits.refresh_feeds(root, center, kd, only=("commits",)) == {"commits": ("unchanged", 3, None)},
          "graph=None reads center/c4-graph.json (the beat tail); only= names a subset")
    # keep_last (the E8 tail): a FAILED git leaves the last good commits.js as it is (FIRE); the regen writes the stub (SILENT)
    (shim / "git").write_text(f'#!/bin/sh\ncase "$1" in log) echo "fatal: the shim refuses log" >&2; exit 1;; esac\nexec "{real_git}" "$@"\n')
    fresh = root / "center-fresh"; fresh.mkdir(); (fresh / "c4-graph.json").write_text(json.dumps(GRAPH))
    why_log = "git log failed: rc 1 — fatal: the shim refuses log"
    s1 = snap()
    os.environ["PATH"] = f"{shim}{os.pathsep}{path0}"
    try:
        kept = _a3_commits.refresh_feeds(root, center, kd, only=("commits",), keep_last=True)
        s2 = snap()
        regen = _a3_commits.refresh_feeds(root, center, kd, only=("commits",))
        first = _a3_commits.refresh_feeds(root, fresh, kd, only=("commits",), keep_last=True)
    finally:
        os.environ["PATH"] = path0
    check(kept == {"commits": ("kept", 3, why_log)} and s2 == s1,
          f"keep_last: a failed git keeps the last good commits.js — its bytes, its mtime, its count — got {kept}")
    check(regen == {"commits": ("wrote", 0, why_log)} and (center / "commits.js").read_text(encoding="utf-8") == _a3_commits.render(None, why_log),
          f"SILENT (the regen): without keep_last a failed git writes the stub naming why — got {regen}")
    check(first == {"commits": ("wrote", 0, why_log)} and (fresh / "commits.js").is_file(),
          f"keep_last with no commits.js on disk yet writes the stub — got {first}")
    check(_a3_commits.refresh_feeds(root, center, kd, only=("commits",), keep_last=True) == {"commits": ("wrote", 3, None)},
          "keep_last never keeps over a good derivation — the real git writes the feed back")
    # a write that raises reads 'failed' with its error (never swallowed) — and the other feed is still written
    broken = root / "center-broken"; broken.mkdir(); (broken / "commits.js").mkdir()
    bad = _a3_commits.refresh_feeds(root, broken, kd, graph=GRAPH)
    check(bad.get("commits", ("",))[0] == "failed" and str(bad["commits"][2]).startswith("commits write error: ")
          and bad.get("spine") == ("wrote", 1, None) and (broken / "spine.js").is_file(),
          f"a commits.js that cannot be written reads 'failed' + its error, and spine.js is still written — got {bad}")
    broken2 = root / "center-broken2"; broken2.mkdir(); (broken2 / "spine.js").mkdir()
    bad2 = _a3_commits.refresh_feeds(root, broken2, kd, graph=GRAPH)
    check(bad2.get("spine", ("",))[0] == "failed" and str(bad2["spine"][2]).startswith("spine write error: ")
          and bad2.get("commits") == ("wrote", 3, None),
          f"a spine.js that cannot be written reads 'failed' + its error, and commits.js is written — got {bad2}")

# HONEST-EMPTY: a non-git dir → None; emit(None) → the empty stub
with tempfile.TemporaryDirectory() as td2:
    check(_a3_commits.build_commits(pathlib.Path(td2), GRAPH) is None,
          "no git → None (caller writes honest-empty)")
    _a3_commits.emit(None, pathlib.Path(td2))
    txt = (pathlib.Path(td2) / "commits.js").read_text()
    check("window.GABE_COMMITS = [];" in txt, "emit(None) writes the honest-empty stub")
    _a3_commits.emit([{"sha": "z", "short": "z", "subject": "s", "date": "2026-01-01T00:00:00",
                       "author": "a", "touched": ["model:X"], "nFiles": 1, "nTouched": 1}], pathlib.Path(td2))
    txt2 = (pathlib.Path(td2) / "commits.js").read_text()
    check(txt2.startswith("window.GABE_COMMITS = [") and "model:X" in txt2, "emit(list) writes the window global")
    check(_a3_commits.derive(pathlib.Path(td2), GRAPH) == (None, "no git (rev-parse failed)"), "no git → None + 'no git (rev-parse failed)'")

# ── (e) THE SPINE — the LEDGER's five beats. The same logical rows written two ways: newest first under
# a header (gustify's head), and appended oldest first with prose between rows and no header (gastify).
ROWS = [  # newest → oldest
    ("2026-09-23", "COMMIT", "feat: the newest of the day", "515e9449", "ok"),
    ("2026-09-23", "COMMIT", "fix: earlier the same day", "273b80fc", "ok"),
    ("2026-09-23", "REVIEW", "phase 12 review", "—", "GREEN-PROVEN green@569cd070"),
    ("2026-09-22", "REVIEW", "phase 11 review", "—", "FIXED abafb416"),
    ("2026-09-22", "COMMIT", "feat: the sha at eight", "569cd070", "ok"),
    ("2026-09-22", "EXEC", "execute, short form", "80cfd6e5", "ok"),
    ("2026-09-21", "EXECUTE", "execute, long form", "8aea964b 852987d7", "ok"),
    ("2026-09-21", "HANDOFF", "a handoff is not a beat", "HEAD 20e42a2d", "—"),
    ("2026-09-20", "COMMIT", "the same commit at seven", "569cd07", "ok"),
    ("2026-09-20", "RED", "red checkpoint", "3f74d5fd*", "RED-PROVEN"),
    ("2026-09-19", "PUSH", "staging ← main @ 14543567", "14543567", "CI run 30949598299"),
    ("2026-09-19", "PUSH", "a merge", "$MERGE", "—"),
    ("2026-09-18", "COMMIT", "a row with extra pipes", "6516722", "a | b | c"),
    ("2026-09-17", "REVIEW", "a workflow id only", "wf_74f0a593", "—"),
]
line = lambda r: "| " + " | ".join(r) + " |\n"
ARCHIVE = "# LEDGER archive 2026H1\n\n## 2026-06-30 — prose, no table\n\nnotes\n\n" + line(("2026-06-30", "PUSH", "an archived push", "cccc333d", "ok"))
def kdbp(td, body):
    k = pathlib.Path(td) / ".kdbp"; (k / "archive").mkdir(parents=True)
    (k / "LEDGER.md").write_text(body); (k / "archive" / "LEDGER-2026H1.md").write_text(ARCHIVE)
    return k
with tempfile.TemporaryDirectory() as tn, tempfile.TemporaryDirectory() as to, tempfile.TemporaryDirectory() as tx:
    kn = kdbp(tn, "# LEDGER\n\n| Date | Entry | Theme / scope | Commits | Gates / results |\n|---|---|---|---|---|\n"
              + "".join(line(r) for r in ROWS))
    ko = kdbp(to, "# LEDGER\n\n" + "".join(f"## {r[0]} — a prose entry\n\nsome notes\n\n" + line(r) + "\n" for r in reversed(ROWS)))
    sn, so = _a3_commits.build_spine(pathlib.Path(tn), kn), _a3_commits.build_spine(pathlib.Path(to), ko)
    bare = lambda s: _a3_commits.render_spine({**s, "sources": [], "beats": {b: [{k: v for k, v in e.items() if k != "src"}
                                                                                  for e in es] for b, es in s["beats"].items()}})
    check(bare(sn) == bare(so), "a newest-first and an oldest-first LEDGER give the same spine bytes (src lines aside)")
    col = lambda s, b: [e["sha"] for e in s["beats"][b]]
    check(col(sn, "COMMIT") == ["515e9449", "273b80fc", "569cd070", "6516722"],
          f"COMMIT newest first, the same day by the file's direction — got {col(sn, 'COMMIT')}")
    c569 = [e for e in sn["beats"]["COMMIT"] if e["sha"].startswith("569cd07")]
    check(len(c569) == 1 and c569[0]["rows"] == 2 and c569[0]["date"] == "2026-09-22" and c569[0]["shas"] == ["569cd070"],
          f"the same sha at 8 and at 7 chars folds to ONE entry, rows=2, the newest row standing — got {c569}")
    rv = sn["beats"]["REVIEW"]
    check(len(rv) == 1 and rv[0]["sha"] == "569cd070" and rv[0]["via"] == "gates",
          f"a REVIEW row with '—' in Commits and green@<sha> in Gates is kept via='gates' — got {rv}")
    check("abafb416" not in json.dumps(sn["beats"]) and sn["no_sha"] == {"RED": 0, "EXECUTE": 0, "REVIEW": 2, "COMMIT": 0, "PUSH": 1},
          f"SILENT: 'FIXED abafb416', a workflow id and $MERGE name no commit — dropped and counted — got {sn['no_sha']}")
    check(col(sn, "EXECUTE") == ["80cfd6e5", "8aea964b"] and sn["beats"]["EXECUTE"][1]["shas"] == ["8aea964b", "852987d7"],
          f"EXEC and EXECUTE both land in EXECUTE, every sha of a cell kept — got {sn['beats']['EXECUTE']}")
    check(col(sn, "PUSH") == ["14543567", "cccc333d"] and sn["beats"]["PUSH"][1]["src"].startswith(".kdbp/archive/LEDGER-2026H1.md:"),
          f"the archive's one dated row joins the spine, its src naming the archive — got {sn['beats']['PUSH']}")
    wide = [e for e in sn["beats"]["COMMIT"] if e["sha"] == "6516722"]
    check(len(wide) == 1 and wide[0]["gates"] == "a | b | c", f"a 7-cell row still reads Commits by position — got {wide}")
    check(col(sn, "RED") == ["3f74d5fd"] and "20e42a2d" not in json.dumps(sn["beats"]), "a trailing * still reads; a HANDOFF is not a beat")
    check([s["order"] for s in sn["sources"]] == ["newest-first", "newest-first"] and so["sources"][0]["order"] == "oldest-first"
          and [s["file"] for s in so["sources"]] == [".kdbp/LEDGER.md", ".kdbp/archive/LEDGER-2026H1.md"] and so["sources"][0]["rows"] == 14,
          f"sources name each file, its dated rows and the order it keeps — got {sn['sources']} / {so['sources']}")
    check(_kdbp_ledger._file_order(["2026-09-23", "2026-09-22", "2026-07-13", "2026-07-14"]) == "mixed",
          "a prepended head over an appended tail reads 'mixed'")
    check(sn["reason"] is None and sn["v"] == 1 and sn["order"] == ["RED", "EXECUTE", "REVIEW", "COMMIT", "PUSH"], "a spine with rows has no reason")
    # the tokenizer: SILENT on ids / words / CI runs, FIRE on shas however they are glued
    for tok in ("wf_74f0a593", "$MERGE", "(#56)", "pending", "30949598299", "defaced", "#1234567", "abc1234_x"):
        check(_kdbp_ledger.sha_tokens(tok) == [], f"sha_tokens SILENT on {tok!r} — got {_kdbp_ledger.sha_tokens(tok)}")
    for tok, want in (("14543567", "14543567"), ("6516722", "6516722"), ("@e1c5558f", "e1c5558f"),
                      ("green@569cd070", "569cd070"), ("19f1e220*", "19f1e220")):
        check(_kdbp_ledger.sha_tokens(tok) == [want], f"sha_tokens FIRES on {tok!r} — got {_kdbp_ledger.sha_tokens(tok)}")
    check(_kdbp_ledger.sha_tokens("8aea964b, 8aea964b 852987d7") == ["8aea964b", "852987d7"], "sha_tokens keeps order, each once")
    # no LEDGER: the stub, same shape, five empty beats, the reason; a LEDGER with no beat row says so too
    st = _a3_commits.build_spine(pathlib.Path(tx), pathlib.Path(tx) / ".kdbp")
    check(st == _kdbp_ledger.empty_spine("no .kdbp/LEDGER.md") and st["beats"] == {b: [] for b in ("RED", "EXECUTE", "REVIEW", "COMMIT", "PUSH")},
          f"no LEDGER → the stub: five empty beats + reason 'no .kdbp/LEDGER.md' — got {st}")
    txt = _a3_commits.render_spine(st)
    check(txt.startswith("window.GABE_SPINE = {") and '"reason":"no .kdbp/LEDGER.md"' in txt and txt.endswith("};\n"),
          f"render_spine(stub) is the window global with its reason — got {txt!r}")
    check(_a3_commits.render_spine(None, "no .kdbp/LEDGER.md") == txt, "render_spine(None, reason) renders that same stub")
    (pathlib.Path(tx) / ".kdbp").mkdir(); (pathlib.Path(tx) / ".kdbp" / "LEDGER.md").write_text(line(("2026-09-01", "PLAN", "p", "abc1234", "")))
    check(_a3_commits.build_spine(pathlib.Path(tx), pathlib.Path(tx) / ".kdbp")["reason"] == "no RED/EXECUTE/REVIEW/COMMIT/PUSH row names a commit",
          "a LEDGER whose rows name no beat commit says so")
    moved = pathlib.Path(tx) / "ops" / "kdbp"; moved.mkdir(parents=True); (moved / "LEDGER.md").write_text(line(ROWS[0]))
    mv = _a3_commits.build_spine(pathlib.Path(tx), moved)
    check(mv["sources"][0]["file"] == "ops/kdbp/LEDGER.md" and mv["beats"]["COMMIT"][0]["src"] == "ops/kdbp/LEDGER.md:1",
          f"a moved kdbp dir is named repo-relative — got {mv['sources']}")
    # EACH COMMIT ONCE PER BEAT — the laws on the fixture both ways: no 7-char prefix in two entries of a beat, and a
    # beat's rows plus its no_sha count every row of that beat (a row stands for exactly one entry, or for none)
    nrows = {b: 0 for b in _kdbp_ledger.SPINE_ORDER}
    for r in ROWS + [("2026-06-30", "PUSH")]:
        b = _kdbp_ledger.BEATS.get("".join(ch for ch in r[1].upper() if "A" <= ch <= "Z"))
        if b:
            nrows[b] += 1
    for s in (sn, so):
        check(all(len(k) == len(set(k)) for k in ([t[:7] for e in es for t in e["shas"]] for es in s["beats"].values())),
              f"no commit sits in two entries of one beat — got {s['beats']}")
        check(all(sum(e["rows"] for e in s["beats"][b]) + s["no_sha"][b] == nrows[b] for b in nrows),
              f"rows + no_sha count every row of the beat — want {nrows}, got {({b: sum(e['rows'] for e in s['beats'][b]) for b in nrows}, s['no_sha'])}")

def spine_of(rows):
    with tempfile.TemporaryDirectory() as t:
        k = pathlib.Path(t) / ".kdbp"; k.mkdir()
        (k / "LEDGER.md").write_text("".join(line(r) for r in rows))
        return _a3_commits.build_spine(pathlib.Path(t), k)
ent = lambda s, b: [(e["sha"], e["shas"], e["rows"]) for e in s["beats"][b]]
# the mirror of the 8-then-7 fold: the 7-char spelling on the NEWER row — the newer row stands, at the LONGER spelling
m = spine_of([("2026-09-22", "COMMIT", "newer, at seven", "569cd07", "ok"), ("2026-09-20", "COMMIT", "older, at eight", "569cd070", "ok")])
check(ent(m, "COMMIT") == [("569cd070", ["569cd070"], 2)] and m["beats"]["COMMIT"][0]["label"] == "newer, at seven",
      f"a 7-char row newer than its 8-char twin folds to ONE entry at the longer spelling, the newer row standing — got {m['beats']['COMMIT']}")
check(_kdbp_ledger.sha_tokens("569cd07 569cd070") == ["569cd070"] and _kdbp_ledger.sha_tokens("569cd070, 569cd07 aaaaaaa1") == ["569cd070", "aaaaaaa1"],
      f"one cell naming a commit at 7 and at 8 chars reads it ONCE, at the longer — got {_kdbp_ledger.sha_tokens('569cd07 569cd070')}")
# an OLDER row re-listing a commit a newer row already holds: it keeps only its new shas — the commit is not shown twice
o = spine_of([("2026-09-22", "EXECUTE", "task 2", "aaaaaaa1", "ok"), ("2026-09-20", "EXECUTE", "tasks 1 + 2", "bbbbbbb2 aaaaaaa1", "ok")])
check(ent(o, "EXECUTE") == [("aaaaaaa1", ["aaaaaaa1"], 1), ("bbbbbbb2", ["bbbbbbb2"], 1)],
      f"a commit re-listed by an older row stays in the newer row's entry only — got {ent(o, 'EXECUTE')}")
# a phase summary (newest) re-listing its tasks' checkpoints, each task row naming one of them: all fold into the summary
p = spine_of([("2026-09-23", "EXEC", "phase complete", "aaaaaaa1 ccccccc3", "ok"), ("2026-09-23", "EXEC", "task 3", "ccccccc3", "ok"),
              ("2026-09-22", "EXEC", "task 1", "aaaaaaa1", "ok")])
check(ent(p, "EXECUTE") == [("aaaaaaa1", ["aaaaaaa1", "ccccccc3"], 3)],
      f"task rows whose commits a newer summary holds fold into it, rows summed — got {ent(p, 'EXECUTE')}")

print(f"commits battery: {pass_} passed, {fail} failed")
sys.exit(1 if fail else 0)
PY
