# Harness assessment — pre-twin-install cleanup (2026-07-09)

Operator ask: with the old-hardening drift lesson in mind, audit `~/.claude` for anything that
interferes with the gabe suite, decide keep/remove, and leave the harness clean for the gustify/
gastify freeze-window installs. Decisions executed same day; everything reversible
(archive at `~/.claude/_disabled-20260709/`, ECC source intact at `~/projects/refrepos/everything-claude-code`).

## 1. The old-hardening check (first, per the ask)

- `~/.claude/gabe-hardening/APPLY-STATUS.md`: every group ✅ DONE/APPLIED. The two
  "verification pending" rows (commit/push packets) tracked `commands/*.md` files that the 0.1
  reconcile captured verbatim into the repo and B2 later re-homed **byte-verified** into skill
  references before retiring `commands/` — the pending verification has no referent anymore.
- The structural fix for that failure mode is live: suite changes land in the repo first,
  `install.sh` regenerates, `suite-doctor` makes drift visible (CLEAN at every step of this pass).
- Ledger archived to the disabled dir; the suite repo's git history is the durable record.

## 2. Usage evidence (the decision input)

Transcript mining over `~/.claude/projects/*/*.jsonl` — 80 sessions, 21 project slugs,
2026-05-04 → 2026-07-09 (~9 weeks). Patterns: `<command-name>/X<`, `"skill":"X"`,
`"subagent_type":"X"`; sanity control: gabe-commit = 36 sessions (pattern proven live).

| Surface | Installed | Never invoked | Kept |
|---|---|---|---|
| Commands (`~/.claude/commands`) | 69 | 66 (plan/pixel-icon/model-route: 1 each) | **0** — all archived; the three one-offs are superseded (gabe-plan; generalized pixellab-icons; /model built-in) |
| Non-gabe skills | 59 | 57 | **1** — pixellab-icons (5 sessions) |
| Agents | 36 | 26 | **10** — code-reviewer 8 · typescript-reviewer 4 · security-reviewer 3 · refactor-cleaner 2 · build-error-resolver 2 · python-reviewer/planner/e2e-runner/database-reviewer/architect 1 |
| gabe-* skills | 25 | (out of scope) | 25 — the actual working surface (commit 36 · push 22 · plan 15 · execute 13 · review 10 · handoff 10 …) |

Language check for the language packs: swift/go/kt/cpp files under `~/projects` live only in
`refrepos/` (reference reading) or `.venv` artifacts; `.php`/`.pl` are zero; `.cs` is one April
hackathon. Rust is live (`apps/gastify`, `apps/nmkgn`) → rust RULES kept (agents/skills for rust
had zero invocations and are archived — restore on first rust-dev session if wanted).

## 3. Hooks (the interference layer)

ECC hooks are profile-gated (`ECC_HOOK_PROFILE=standard`, per-hook profiles, plus an
`ECC_DISABLED_HOOKS` override — the sanctioned lever; no settings surgery needed).

**Disabled** (settings.json `env.ECC_DISABLED_HOOKS`), with reasons:
- `pre:observe` + `post:observe` (continuous-learning-v2): fired on EVERY tool call ×2; the
  instinct system had zero usage (instinct-* commands never invoked) and contradicts the locked
  investigation decision #2 — self-improvement is human-gated. Skill dir archived too.
- `post:quality-gate`: per-edit quality gate — overlaps the gabe-commit gate (the measured
  chokepoint); double-gating with different rules is the interference the operator asked about.
- `pre:write:doc-file-warning`: superseded by gabe-commit's deterministic `docs-budget.sh` (0.5b).
- `pre:governance-capture` + `post:governance-capture`: per-call logging, output never consumed.
- `pre:insaits-security`: heavy per-Bash/Edit python monitor; the used security path is the
  security-reviewer agent + gabe gates.
- `pre:mcp-health-check` + `post:mcp-health-check`: node spawn per tool call; MCP failures
  surface on their own.

**Kept, deliberately:**
- `npx block-no-verify` — load-bearing: it IS the "user policy disallows hook bypass" that
  gabe-push/commit rely on.
- Session persistence chain (session-start-bootstrap, the Stop/SessionEnd inline hooks,
  `session-data/`) — produces the session summary this very session resumed from; complements
  (not conflicts with) KDBP state for non-KDBP projects.
- `auto-tmux-dev`, `config-protection`, `suggest-compact`/`pre-compact`, `pr-created`/
  `build-complete`, command-log audit+cost (measurement is a Wave-2 input).
- The 5 kdbp hooks (suite-owned, repo-homed).
- `tmux-reminder`/`git-push-reminder`/`commit-quality` were already inert (strict-profile-only).

## 4. Rules diet

Archived: `rules/zh/` (Chinese duplicates of common/ — always-loaded payload doubled for no
information), unused language dirs (cpp/csharp/golang/java/kotlin/perl/php/swift), and
`common/performance.md` (pre-Claude-5 model guidance actively contradicting the operator's
Fable-plans/Sonnet-mechanical routing). Kept: the rest of common/, python/, typescript/, rust/.

## 5. pixellab-icons (operator direction: user-level, for every project)

Rewritten in place at `~/.claude/skills/pixellab-icons/`: project-neutral description; the API +
five operational rules unchanged (universal); gustify's style/sizes/paths recast as the
**per-project bindings contract** (with gustify as the reference column); new **Usage (any
project)** runbook (key+budget → bindings via probe icons → manifest → batch/one-off curl →
register + `image-rendering: pixelated` → `--redo`). The one-use `pixel-icon` command is archived
(the skill is the surface). NOT relocated to gustify — kept user-level per the operator.

## 6. End state (ready for the twin installs)

- Live surface: 25 gabe skills + pixellab-icons · 10 used agents · 0 legacy commands ·
  rules common(-performance)/python/typescript/rust · trimmed hook set. `suite-doctor` CLEAN.
- `~/.agents` (Codex home) archived; `~/.codex` left for the operator's own cleanup (may hold auth).
- Restores are one `mv` back; hook re-enables are one id removed from `ECC_DISABLED_HOOKS`.
- Note for the freeze windows: nothing archived here affects the twins' project-local skills
  (`gustify: docsite, gabe-e2e · gastify: design-fidelity-check`), which stay in their repos.
