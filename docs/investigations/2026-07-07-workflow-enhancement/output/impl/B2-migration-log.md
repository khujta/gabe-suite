# Implementation log — Phase B2: skills-only migration

- **Executed:** 2026-07-09, on the operator's go (fork decision A2+B2+C locked 2026-07-09). Branch: `chore/reconcile-hardening-pass`, stacked on `b225d56` (0.1 reconcile still unmerged — operator's gate). Commits `2694a2c..98239bf`, NOT pushed/merged.
- **Spec:** deliverable 9 §B2.1 (per-capability table) + §B2.2 (cross-cutting rules); simplify tier from deliverable 10 §2.
- **Model routing honored:** Fable authored the judgment pieces (execution-contract reference, all 25 `when_to_use` trigger sentences, P14 tool registry, size-budget script + simplify-pass reference, install.sh rework, verification); 6 parallel Sonnet subagents did the mechanical spec re-homing, each with mandatory diff-verification duties.
- **E2 evidence:** every ✅ below carries the command/result from this run.

## Commits (this session, in order)

| Commit | Slice |
|---|---|
| `2694a2c` | feat(skills): state E1-E7 once in a suite conventions reference + P14 tool registry |
| `c7156d5` | feat(skills): migrate lifecycle commands into capability skills (incl. gabe-commit simplify tier) |
| `3310bc6` | feat(skills): migrate scope family, init, and teach into skills |
| `9b3e9bf` | feat(gabe-mockup): lift SOP core + references split + paths auto-trigger |
| `5f0f0b6` | refactor(skills): lean cores + spec references for satellite and knowledge skills |
| `98239bf` | feat(install): auto-discover and ship all capability skills |

## What was done (per §B2.1/§B2.2)

1. **One skill per capability — 19 → 25 skills.** New dirs: gabe-init, gabe-teach, gabe-scope, gabe-scope-change, gabe-scope-addition, gabe-scope-pivot. The 6 wrapper shims (next/plan/execute/commit/push/handoff) became real capability skills: lean core + `references/<name>-spec.md` re-homed **verbatim** from `commands/*.md` (mechanical awk extraction; every move diff-verified byte-identical — `diff <(awk 'p{print} /^- \*\*E7 REPORT WHERE\*\*/{p=1}' commands/gabe-X.md) <(tail -n +6 …-spec.md)` → exit 0 for commit/plan/execute/push/handoff/init/teach; 1:1-into-core diffs empty for next/scope-change/scope-addition/scope-pivot).
2. **B2.2-1 E1–E7 stated once.** `skills/gabe-docs/references/execution-contract.md` (chose the gabe-docs home over a new `gabe-conventions` skill — no new always-loaded surface, honoring 0.5c; the 0.5c restraint line lives in the same file). Block verified byte-identical to the 31 pasted copies (`md5 3dbe05b2daa73b2c70757359f6b85020` both sides). All 25 SKILL.md files now carry the 3-line pointer instead: `grep -rl 'E1 EVIDENCE\*\* —' skills/` → **1 file** (the reference itself). The 18 copies in `commands/` were left as-is deliberately — that directory is the frozen transition surface and retires wholesale after the dry-run; editing files scheduled for deletion would be churn and would weaken the fallback.
3. **B2.2-2 `when_to_use` everywhere.** All 25 skills; trigger phrasing from incident evidence (gabe-mockup claims ad-hoc phrasing per RC1/F10; gabe-teach honest about its 2-uses reality). Combined description+when_to_use validated programmatically: max 1,384 chars (gabe-mockup), all ≤1,536. gabe-myopic's over-long description trimmed to fit alongside its when_to_use.
4. **B2.2-3 host portability.** Bodies unchanged for Codex; Claude-specific frontmatter (`paths`, `context: fork`, `agent: Explore`, `disable-model-invocation`, `user-invocable`) are ignorable keys that degrade gracefully. Contract pointer uses the relative path `../gabe-docs/references/execution-contract.md`, valid in the repo and both installed homes.
5. **B2.2-4 install.sh.** Auto-discovers `skills/gabe-*/` (25) — install and uninstall; no more list maintenance. `commands/` still ships, explicitly comment-marked TRANSITION ONLY. `./install.sh` → **Installed 47/47 components** (25 skills + 22 commands).
6. **B2.2-5 deletion deferred.** `commands/*.md` untouched (`git diff --stat commands/ templates/` → empty). Retirement happens only after the dual-harness lifecycle dry-run passes via skills alone.
7. **Simplify tier (deliverable 10 §2) inside gabe-commit.** `scripts/size-budget.sh` — deterministic staged-file check, >800 first-party lines or newly crossing → WARN naming the file + recorded seams from `.kdbp/{RULES,PENDING}.md`; generated files exempt by header; exit 2 on warnings, never blocks. Smoke-tested: WARNs on 1,198- and 2,518-line files (exit 2), silent on clean file (exit 0). `references/simplify-pass.md` — the evidence-triggered quality-only pass (reuse/simplification/efficiency, never bug-hunting) with the Wave-2 re-open trigger recorded. Wired into the gabe-commit core.
8. **Fork C frontmatter.** `context: fork` on gabe-debt/health/roast/myopic; `agent: Explore` (read-only analysis) on debt/health/roast — per the kickstart enumeration; gabe-align/assess stay inline (align's commit/PR-boundary guardian role and assess's quick-check shape don't fit a fork). `disable-model-invocation: true` on gabe-init + gabe-scope-pivot. `user-invocable: false` applied to gabe-docs + gabe-arch (the §B2.1 "candidates" — applied; one-line revert if it annoys).
9. **gabe-mockup rebuilt** around the lift SOP L0–L4 + manifest read (`mockup:` block in `.kdbp/BEHAVIOR.md`, fallback `.kdbp/MOCKUP.md`) + `paths:` auto-trigger (Thread-4 dispatch fix, native). 823-line monolith → 70-line core + 5 references, full heading map produced; project bindings (P7 sheet recipe, D-ids, named components) flagged in place with "scheduled to move … in phase A2" notes.
10. **Altitude fix:** the `refrepos/` personal-path rule removed from the re-homed scope spec (one standalone comment line, `commands/gabe-scope.md:78`; diff evidence in the agent report — the source command file itself untouched).

## Verification (all run this session)

| Check | Command | Result |
|---|---|---|
| Core line caps | `wc -l skills/*/SKILL.md` | 25/25 ≤200 (max 186, gabe-arch); total SKILL.md surface 5,967 → 1,767 lines |
| De-dup complete | `grep -rl 'E1 EVIDENCE\*\* —' skills/` | 1 (execution-contract.md only) |
| Pointer universal | grep per skill | 25/25 carry the pointer (gabe-docsite's added by hand — it never had the block) |
| Frontmatter | python yaml sweep (name match, when_to_use present, char caps, flag placement) | PROBLEMS: NONE (25 skills) — after fixing 2 agent defects: gabe-arch/gabe-docs had `user-invocable` nested under a literal `flags:` key; hoisted to top level |
| Verbatim moves | per-agent diffs + orchestrator re-runs (execute, teach) | all byte-identical |
| Content preservation | heading-mapping tables per split + spot greps | nothing lost; 2 false alarms investigated ("R0" never existed in the old mockup skill — rules start at R1, all present; review's `## Purpose` prose lives in the core's "What this does") |
| Install | `./install.sh` | 47/47 components, both homes |
| Drift | `./scripts/suite-doctor.sh` (after install AND after all commits) | **CLEAN**, exit 0 — repo, ~/.claude, ~/.agents in sync |
| Operator WIP | `git status` | untouched: docs/site/assets/site.css, gabe-docsite assets/generator mods, docs/investigations/ (this log stays uncommitted with the folder) |

## Explicit deferrals (not silent — tagged A2/later in the plan itself)

- **PLAN.json mirror** written by gabe-plan → A2 (noted in the gabe-plan core as pending).
- **gabe-init template inventory update** for KDBP-lite → A2 (noted in the gabe-init core).
- **gabe-next `scripts/next.mjs`** → post-A2 (noted in the gabe-next core).
- **Evidence-freshness WARN hook (1.3c)** in gabe-commit frontmatter → rides Wave 1 on the new structure; only the simplify tier was in this session's mandate.
- **Mockup project-binding shed** to gustify RULES.md/DESIGN.md → A2 (flagged in the reference files).
- **Target-state page B2 row → ✅** — after the dual-harness dry-run, when B2 is complete end-to-end.

## Post-landing amendment (same day, operator direction): provenance out of runtime files

Operator flagged that reference headers carried migration archaeology (dates, deliverable
citations, "re-homed verbatim from", install-path notes) and asked whether it belongs in the
files at all. Verdict: agreed for the archaeological part — commit messages + this log already
hold all of it, and the A2 "git becomes the ledger" rationale applies (no separate CHANGELOG
file either, for the same reason LEDGER.md was shed). Kept the normative lines: binding-spec /
core-summary precedence, the "do not re-add the E1–E7 block" rule, E1–E7 pointers, and the A2
forward markers (project-binding shed notes, pending PLAN.json/template lines).

- Commit: `efa2b40` — 25 skill files trimmed (17 spec headers, 5 mockup headers,
  execution-contract, simplify-pass, tool-registry, size-budget.sh comment, header rewraps).
  (First attempt `14231c4` accidentally bundled the operator's 3 docsite WIP files via a broad
  `git add skills/`; caught on the post-commit status check, soft-reset and redone with the WIP
  restored to unstaged — tree verified clean.)
- Re-checked after trim: archaeology grep → 0 hits in skills/; contract block md5 unchanged
  (`3dbe05b2…`); verbatim body spot-diff (execute, header now 4 lines → `tail -n +5`) →
  IDENTICAL; `./install.sh` + `./scripts/suite-doctor.sh` → CLEAN, exit 0.

## Dual-harness lifecycle dry-run (2026-07-09, same day — B2.2 rule 5 gate)

**Pre-flight sweep** found five lingering `commands/` dependencies inside skills that would have
broken at retirement (and one would have silently defeated a skills-alone test): gabe-next's
downstream dispatch loaded command specs from `~/.claude/commands`/`~/.agents/commands`;
gabe-review's codex-bridge instructed reading the command wrapper with a repo-path fallback;
plus three doc-path references (debt-spec, init-spec, docs-spec). Fixed → commit `ebc33e4`;
doctor CLEAN after reinstall.

**Method:** two scratch fixture projects (git + seeded `.kdbp/` from installed templates + local
bare `origin`); the installed command mirrors HIDDEN during each leg (`mv ~/.claude/commands/gabe-*.md`
away, restored after — doctor CLEAN before and after both legs), so skills were the only surface.

**Claude Code leg — GREEN.** Full lifecycle on a one-phase MVP goal (add `slugify(s)` + tests):
- `/gabe-plan` via Skill tool → resolved to `~/.claude/skills/gabe-plan` (base-dir evidence);
  plan-spec read in full; PLAN.md written spec-shape (C1–C7: Exec/Review/Commit/Push + Tier +
  Types + Phase Details YAML `phase_tier: mvp, dim_overrides: []`), DECISIONS D2 + LEDGER
  PLAN-CREATED same turn.
- `/gabe-execute task` → task contract printed, implemented, `npm test` exit 0 (both suites),
  Exec ⬜→🔄→✅.
- `/gabe-commit` (invoked inline by execute per its Step 4.5 MUST) → gate evidence: tests exit 0;
  lint/types `⤫ skipped (no tool configured)`; coverage `⤫ (mvp)`; shape below threshold;
  `DEFERRED SCAN: 0/0/0`; doc-drift 0 (template patterns are `.py`, diff `.mjs`); structure pass
  (`.kdbp/**` MVP-allowed); **size-budget exit 0** (the new script ran as a gate check). 0 findings
  → commit `8d0d427` with the Step-5 body + Phase/Task footer; LEDGER FINDINGS entry; Commit ✅.
- `/gabe-review HEAD` → raw 1 → killed 1 (unicode-collapse candidate; K3 — accepted in PLAN Risks)
  → survived 0; confidence 100/100; coverage HIGH; verdict APPROVE; REVIEW archived to
  `reviews-archive/` + gitignore line; Review ✅; LEDGER PHASE-REVIEW trace with TICK ✅.
- `/gabe-push production` → PUSH.md env configured (production→main, ci none, defaults printed);
  drift check clean; pre-push state commit; direct push to origin/main (exit 0, remote verified);
  DEPLOYMENTS P1 row; LEDGER PUSH entry; bookkeeping commit local-only; decision record
  `push ✓ · CI —(none) · env=production ✓ · promotion-final ✓ → TICK`; Push ✅.
- End state: Phases row `✅ ✅ ✅ ✅`, work on the remote. Every `references/` anchor resolved
  (E6 never fired). Registry evidence: with commands hidden, the skill list showed only
  skill-derived entries; `disable-model-invocation` (init, scope-pivot) and
  `user-invocable: false` (docs, arch) behaved exactly as designed.

**Codex leg — BLOCKED (environment, not suite).** `codex exec` (CLI 0.50.0 research preview,
Windows-npm binary, ChatGPT-account auth) rejects EVERY model with
`400: The '<model>' model is not supported when using Codex with a ChatGPT account` — probed
gpt-5.3-codex-spark (configured), gpt-5.2-codex, gpt-5.1-codex, gpt-5-codex, gpt-5.1, o4-mini.
Last real Codex session in `~/.codex/session_index.jsonl`: 2026-05-28 — the CLI has likely been
deprecated server-side since. Also noted: `codex exec` exits 0 on this hard API error. Operator
action needed: update the Codex CLI (Windows npm global) and/or re-auth, then re-run the leg —
the fixture and the exact prompt are reproducible in one command.

**Verdict: retirement WITHHELD** per B2.2 rule 5 (both harnesses must pass). `commands/` and the
installed mirrors stay; the target-page B2 row stays pending. The Claude leg needs no re-run —
only the Codex leg remains.

**Genuine findings the dry-run surfaced (beyond the pre-flight fixes):**
1. `gabe-review` sub-check 5a counts command-owned `.kdbp/**` state writes as off-scope files —
   mechanically, every properly-run phase commit (which bundles PLAN/LEDGER ticks) scores <70%
   on-scope → MISALIGNED, which would skip the Review tick. Spec fix candidate: exclude
   `.kdbp/**` from the 5a off-scope count. (This run classified ALIGNED with the exclusion
   rationale stated in the LEDGER trace.)
2. `templates/PUSH.md` ships `ci | github-actions` as a filled-in value rather than a placeholder —
   the fixture had no CI and the value had to be corrected to `none` by hand.

## Retirement + Codex decommission (same day — operator decision closed the gate)

**Operator decision (2026-07-09):** drop everything Codex/ChatGPT-related — Codex will be
uninstalled; Claude Code is the only harness. That collapsed the B2.2 rule-5 gate to
single-harness, and the Claude leg had already passed GREEN → deletion-last step executed:

- `commands/` deleted from the repo (22 files) and the installed mirrors removed from BOTH homes.
  Each skill IS its command. Live registry confirmed mid-session: only skill-derived entries left.
- Codex decommissioned: install.sh rewritten Claude-only (no `~/.agents` targets, no
  `--codex-only`); suite-doctor now 2-way (repo vs `~/.claude`) and flags any surviving command
  mirror as a straggler; `gabe-review` lost `codex-bridge.md` + `merge-mode.md` (cross-CLI
  machinery with no second CLI — `post-review.md` kept, it ingests external review tools, not
  Codex); every `~/.agents` path fallback and Codex mention swept from skill specs (final grep:
  ZERO); the `~/.agents` gabe footprint (skills/templates/docs/commands) uninstalled.
- Docs: CLAUDE.md rewritten (skills-only structure, conventions incl. the provenance rule,
  25-skill capability table), README command-surface section, docs/README, docs/WORKFLOW,
  suite-state-audit currency banner.
- Dry-run findings applied: review-spec 5a now excludes `.kdbp/**` from the off-scope count;
  templates/PUSH.md ships `ci = none` as placeholder.
- Commits: `4452f58` (feat(suite)!: skills-only + Claude-only) + `eb98da1` (fix(specs): dry-run
  findings). Doctor caught the two deleted review references still installed (cp-based install
  never prunes) — removed, re-run **CLEAN**. `./install.sh` → 25/25 skills.
- Target page B2 action row flipped to ✅ DONE with evidence link (0.1 pattern); page manifest
  status updated.

**B2 is complete end-to-end.** The suite is: 25 skills, no commands/, one harness, one contract
statement, git as the ledger.

## Merged + pushed (2026-07-09, operator's go)

`chore/reconcile-hardening-pass` (12 commits: 0.1 reconcile ×2 · B2 migration ×6 · provenance
trim · pre-flight fixes · retirement+Codex-drop · spec fixes) fast-forwarded into `main`
(`4dc0b13..eb98da1`) and pushed to BOTH remotes — `origin` (Brownbull/gabe-suite) and `korigin`
(khujta/gabe-suite) — each exit 0, all refs verified at `eb98da1`. Direct FF merge, no PR;
CI: none configured; deploy-verify: n/a (docs/tooling repo); DEPLOYMENTS/LEDGER/bookkeeping:
skipped — the suite repo has no `.kdbp/`; this log is the record. Local branch kept (delete
anytime with `git branch -d chore/reconcile-hardening-pass`). Working tree back on `main` with
only the operator's docsite WIP + this uncommitted investigations folder.

## Open items for the operator

1. **Codex leftovers outside this repo** (operator's own cleanup, whenever): uninstall the Codex
   CLI (Windows npm global) and remove `~/.codex` / any remaining non-gabe `~/.agents` content.
2. **Next in sequence:** A2 KDBP-lite, gustify first (deliverable 9 §A2) — fresh session,
   kickstart at `docs/investigations/2026-07-07-workflow-enhancement/A2-KICKSTART.md`.
