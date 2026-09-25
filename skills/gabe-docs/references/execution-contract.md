# Suite conventions — the Gabe execution contract

> **Stated once, here, for the whole suite.** Every gabe skill carries a one-line pointer to
> this file instead of a pasted copy — do not re-add the full block to individual skills or
> commands.

## Gabe execution contract (E1–E7)

These are floors, not ceilings — a skill's own gate may be stricter, never looser.

- **E1 EVIDENCE** — every claim about code/state cites file:line or a command run THIS session; no citation → mark it `(assumed)` and verify before building on it. Absence claims ("no X exists") require a recorded search → 0 hits. A `mcp__gabe-map__*` / `mcp__gabe-kdbp__*` answer IS such a citation — a map answer stamps `map@<head> · <fresh|stale|unknown>`, a kdbp answer names the root it parsed `.kdbp/` from — but an EMPTY answer is NOT: the map is a FLOOR, never a scope, so the absence proof stays the recorded `grep -rn` → 0 hits.
- **E2 RUN-BEFORE-✅** — ✅ only after the command executed here (paste cmd + exit/count). The command comes from the project's binding, never a guessed flag — `mcp__gabe-kdbp__verify_commands` relays it (`.kdbp/BEHAVIOR.md ## Verify Commands` first, else manifest candidates) and never runs it; you do. Skipped = `⤫ skipped(<reason>)`, never ✅. Every printed number is copied from this run's output — never estimated.
- **E3 NO SILENT DOWNGRADE** — quote the task text verbatim before implementing; if your plan delivers a cheaper class (restyle≠rebuild, stub≠implement, recreate≠reuse), STOP and ask. Substitution requires an explicit user decision line.
- **E4 REUSE FIRST** — before creating anything, print: `REUSE <path> | EXTEND <path> | NEW (searched <where> — none fit)`. The search behind a `NEW` starts at the map, not at Grep: `mcp__gabe-map__find` (by name or doc text) and `mcp__gabe-map__touches` (by file · model · endpoint · function) FIRST, then Grep/Glob — a `NEW` is an absence claim, so the Grep/Glob arm always runs (E1) and `<where>` names both. No map → the tool says so and Grep/Glob is the whole search. Recreating an existing artifact is a defect.
- **E5 STATE SYNC** — actions that change reality (commit/merge/defer/pivot) write their state row in the SAME turn; a skipped write prints an enumerated skip code, never silence. Where the row is authored by hand, `mcp__gabe-kdbp__pending_row_preview` / `ledger_row_preview` compose it first — the file's own column order, the next `P-id`, the `Verified` anchor, the recurring flag, `Gates` verbatim — and the harness Write/Edit persists it; the previews write nothing, and the D7 hooks only ever see the Write.
- **E6 MISSING ANCHOR = STOP** — referenced template/spec/catalog absent → print ⛔ and stop; never reconstruct it from memory.
- **E7 REPORT WHERE** — end user-visible work with: exact URL/screen · env (local :port vs deployed) · what to look at · absolute artifact paths.

## The tool floor — stated once, ruled 2026-09-02

The suite ships two read-only MCP servers, registered once at user scope and answering from the
project the session is in: **gabe-map** — the committed command-center map as tools — and
**gabe-kdbp** — a project's `.kdbp/` lifecycle state as tools. The rosters live in
`../../gabe-map/SKILL.md` and `../../gabe-kdbp/SKILL.md` and the servers advertise them every
session; they are not re-listed here. Five laws govern how a skill reaches for them:

- **ASK FIRST, THEN THE OLD METHOD.** Any step that asks *where · who calls · what touches ·
  which entity owns · which cases cover · where does the project stand* asks the tool BEFORE it
  greps, globs, or re-reads PLAN/PENDING/LEDGER by hand. The old method stays as the second arm,
  never as the first.
- **THE MAP IS A FLOOR, NEVER A SCOPE (E1).** An empty answer is not an absence proof and never
  narrows a change's scope; `grep -rn` → 0 hits remains the absence proof.
- **HONEST-EMPTY.** No center · no `.kdbp/` → the tool says so and names the reason; the servers
  unregistered → the `mcp__*` tools are not in the session at all. Every step still completes on
  both paths; a step that only works with the tools is a defect.
- **TOOLS ARE NOT RAILS.** Enforcement stays on hooks, gates, and the deterministic scripts a
  skill already owns; the D7 hooks watch Write/Edit, never `mcp__*` — a `_preview` tool composes
  a row, the harness Write persists it. A tool supersedes a script only where it relays that
  script's own output — `center_status` runs the SUITE's copy of `center_status.py` against the
  project (never the installed `scripts/center_status.py` — WS-2, as the findings contract below states)
  and relays it capped at 6,000 chars with `truncated` named; a truncated or absent relay sends
  the beat back to the script.
- **READ-ONLY, WITH ONE EXCEPTION.** Every tool answers without writing — except `who_calls`,
  whose default run appends the gitignored map-delta line for a code hit the map missed. A
  read-only or `context: fork` beat passes `emit: false`, or asks with `direction=out`, which
  never emits: the emit happens inside the server's own process, so an `agent: Explore`
  Write/Edit restriction does not stop it.
- **GRAFT SERVES MAP CREATION ONLY — its agent skill is DELETE-ON-ADOPTION (ruling 2026-09-02, stated
  here 2026-09-04).** `graft build` runs inside the center regen and the red beat's reach, always anchored
  to the repo toplevel (`cd "$(git rev-parse --show-toplevel)"` — a persisted `cd apps/web` once indexed a
  subtree and wrote a stray `.gitignore`); no skill reaches for graft's MCP or hooks. A project's
  `.claude/skills/graft/` ("get your context from graft before grepping") contradicts the first law and is
  removed on adoption: `propagate.sh` names it, the operator removes it — a twin never re-decides it.

## The findings contract — stated once, ruled 2026-08-10

Any beat whose output ends in a **list of actionable findings** — things the operator must go fix, check, or act on — renders each finding as a **clickable local link plus a concrete remediation step**, so nothing has to be hunted for and no "next action" is a bare label:

- **LINK** — every location a finding names (a `file:line`, a PENDING/registry row, an entity page, a god-file, a diff hunk) renders as a workspace-relative markdown link: `[file:line](path#Lnn)` when a line is known, `[label](path)` otherwise. A finding the operator cannot click is one they have to go find — never emit one. Where a finding names a symbol rather than a line, `mcp__gabe-map__outline` gives the file's definitions with kind, signature and — where the graft index resolves the file — the span, and `mcp__gabe-map__touches` resolves a bare symbol to its `file::fn` owner; the `#Lnn` comes from there before it comes from a grep, and from the grep whenever the map or the index is blind there. Local, workspace-relative links are fine (the IDE/terminal makes them clickable). Links render only as **markdown, never inside a ``` code fence** — a report that fences its rows for column alignment emits the linkable rows as rendered markdown (a table or plain lines) instead, or the link is inert text.
- **STEP** — every finding ends in the exact next move: a command to run (`/gabe-… <args>`) or a precise edit ("add `# DIAGRAM WORKFLOW` to the card"). "report X" / "surface" / "flag" / "next action" without the concrete move is half a finding.

Where a deterministic script already owns the findings AND their paths (a gate, a scanner, a committed census), the script emits the link + step itself and the skill relays it verbatim — never re-composing a link by hand (reference implementation: gabe-cc-update `status` → `center_status.py`, reachable in any project as `mcp__gabe-map__center_status`, which runs the suite's OWN copy of that script against the project — never the repo's (WS-2) — and relays its links and → next steps verbatim; no `center.config.json` there → the tool names the absence). Where the findings are model-derived (a code review, a gap roast, a myopic trap), this contract is the mandate the skill's output section points at.

## The beat brief — stated once, ruled 2026-08-07 (ask C)

Every spine beat's report carries ONE compact orientation block, printed just before the E8
tail. It exists because the audited cycles' only orientation was hand-authored prose that
evaporated with the context window (7 re-orientation asks). Output-only, like every
Gabe-Lens surface — NEVER written to PLAN/REVIEW/LEDGER/PENDING/commits/docs; the machine
half persists via `inflight.json`, the prose half is meant to evaporate.

```
**Gabe-Lens brief**
ENTITY:  <the phase's declared entities, verbatim from the plan record; `none declared`
          when the record has no entities key (honest blank, never a guess); append
          `· touched: <slugs>` when the in-flight projection names entities the
          declaration does not>
FEATURE: <phase id — phase name, in the plan's own words>
DID:     <this beat's outcome in one sentence — what moved, not what was attempted>
```

`NEXT` is deliberately absent — the E8 tail renders it from the router; the brief never
duplicates it. Beat-specific richness EXTENDS this block where it already exists and stays
where it lives: execute's `PLATFORM PROGRESS` (BUILT / NOW POSSIBLE / STILL NOT POSSIBLE /
HANDLE — execute-spec) and commit's commit-shaped brief (gate-spec) print after these three
lines, never instead of them.

The plan record behind ENTITY and FEATURE is asked for, not re-read: `mcp__gabe-kdbp__phase_context`
returns the phase's `plan_json` record (`entities`, `name`, `tier`, `proof`, `cells`) and its
`records` (`Cases:` / `Reach:`) in one answer — `none declared` stays the honest blank when
`entities` is empty, never a guess. No `.kdbp/` → the tool says so and PLAN.json/PLAN.md are the read.

## The beat tail (E8) — stated once, ruled 2026-08-07

Every spine beat (`/gabe-plan` · `/gabe-red` · `/gabe-execute` · `/gabe-review` · `/gabe-commit` ·
`/gabe-push`) ENDS with one three-part tail, in this order, after the skill's own report. It
replaces every hand-written closing line — the audited cycles' hand-written tails were
non-uniform (one beat had none) and the operator asked "how's it going / what's next" seven
times across two repos while the router already knew the answer. Each part degrades to
SILENCE — a missing source never prints filler.

1. **`NOW:` / `NEXT:` — printed from the router's own rendered strings, never formatted here.** Run
   `node ${ECC_ROOT:-$HOME/.claude}/skills/gabe-next/scripts/next.mjs --json` (read-only, zero LLM,
   no state writes) and print its `now_line` / `next_line` fields VERBATIM:
   ```
   NOW:  <now_line>
   NEXT: <next_line>
   ```
   The tail must NOT build these itself — the payload's `state` is a cells OBJECT, and formatting
   it by hand rendered `· [object Object]` on every beat; the router owns the vocabulary and emits
   the finished strings. The tail runs AFTER the beat's state writes (E5, same turn), so the router
   reads fresh cells. Degrade rules: `now_line` is `null` on the plan-complete payload → print only
   the NEXT line; `next` is `null` (exit 2 mirror-unusable, or the exit-1 no-active-plan payload) →
   print NEITHER line; `node` not installed / the command errors → print NEITHER (never invent the
   lines). When the beat KNOWS the router's answer is stale (e.g. push blocked on an operator
   merge — the observed loop-spin), print `NEXT: blocked — <reason>` INSTEAD; an honest override,
   never both.

2. **`CENTER:` — refresh the in-flight projection, then point at it. Conditional, never a
   gate.** Only when `docs/site/center/center.config.json` exists — first run
   `python3 ${ECC_ROOT:-$HOME/.claude}/skills/gabe-cc-update/scripts/write-inflight.py .`
   (deterministic, zero LLM: projects PLAN.json + git into `docs/site/center/inflight.json`,
   which the board and chrome pill read at view time; when the center has a committed
   `c4-graph.json` the script also rebuilds the gitignored `commits.js` and `spine.js` from
   git plus LEDGER through the suite's own `_a3_commits` (WS-2 — never the project's
   `scripts/`), the regen's writer — the regen's bytes once the project's `scripts/` copy is at
   the suite's version; a feed git does not ignore is never written, and a failed git keeps the
   last good `commits.js`; silent no-op when nothing changed — batteries at
   `tests/inflight/run.sh` + `tests/commits/run.sh`), then print:
   ```
   CENTER: docs/site/center/ — inflight.json carries this beat's state (phase · declared vs touched entities)
   ```
   No center → run nothing, print nothing. (Same conditional shape as push-spec's terminal-env
   release pointer — silent when inapplicable.)

3. **The PULSE line — last.** Run
   `python3 ${ECC_ROOT:-$HOME/.claude}/skills/gabe-pulse/scripts/angles.py . --one-line`
   and print its output VERBATIM — at most one line, silence when no signal fires, never an
   all-clear, no suggestions added beside it. The signals, sources, and decay rule live in
   `../../gabe-pulse/references/pulse-spec.md` §5.

Why parts 1–2 pass the no-unconditional-lines law: a beat just CHANGED cell state, so
`NOW:`/`NEXT:` are state-carrying, not reassurance; the `CENTER:` pointer prints only where a
center exists to point at. Part 3 keeps its own silence contract.

## Orchestration restraint (0.5c)

Before any multi-agent design/mockup fan-out, run the premise past the human with ONE cheap
single-agent spike. **Orchestrate to verify, not to generate taste.**

Why: in the 2026-07 investigation corpus, multi-agent fan-out was measurably strong for
*verification* (adversarial passes caught real defects) and measurably weak for *taste
generation* (delegated design panels amplified wrong premises instead of challenging them).
