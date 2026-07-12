# B2 Kickstart — paste into a fresh session (cwd: /home/khujta/projects/gabe_lens)

> Generated 2026-07-09 by `/gabe-handoff` (prompt-only mode — suite repo has no `.kdbp/`).
> Companion to the original `KICKSTART.md` convention that launched the investigation itself.

---

Continue the Gabe Suite transformation on branch `chore/reconcile-hardening-pass` (HEAD `b225d56` — fix(suite-doctor); parent `650d0eb` — the reconciliation). Execute **Phase B2: the skills-only migration**, per the decided fork (operator locked A2+B2+C on 2026-07-09).

READ FIRST (in this order):
1. Auto-memory loads the investigation summary automatically (`fable-workflow-investigation.md`).
2. `docs/investigations/2026-07-07-workflow-enhancement/output/09-fork-migration-plan.md` — **§B2.1 (per-capability table) + §B2.2 (cross-cutting rules) are the spec for this session.**
3. `output/impl/0.1-reconcile-log.md` — what already landed (incl. the post-commit review).
4. `output/10-code-audit-simplify-verdict.md` §2 — the simplify tier that goes INSIDE the gabe-commit skill.

STATE
- Landed: step 0.1 reconcile — commits `650d0eb` + `b225d56`, both on `chore/reconcile-hardening-pass`, NOT pushed/merged (operator's gate). Verified this session: `./install.sh` → 41/41 both homes; `./scripts/suite-doctor.sh` → CLEAN (3-way identical); post-commit review APPROVE.
- Untouched operator WIP (do NOT bundle into commits): `docs/site/assets/site.css`, `skills/gabe-docsite/{assets,generator}` modifications, and the untracked `docs/investigations/` folder.
- If the operator has merged the branch by the time you start, work from `main`; otherwise stack B2 commits on this branch.

TASK (do this next — quoted from deliverable 9 §B2, no silent downgrade)
Migrate the suite to **one skill per capability**: for each row of the §B2.1 table, re-home the command spec into `skills/<name>/` as a lean SKILL.md core (≤200 lines) + `references/` for the deep spec. Apply §B2.2 verbatim: (1) E1–E7 stated ONCE in a suite-owned conventions reference, every skill carries a one-line pointer (kills the 38-copy duplication); (2) every `when_to_use` is a trigger sentence written from incident evidence, ≤1,536 chars combined with description; (3) bodies stay host-portable — Claude-specific frontmatter (`paths`, `hooks`, `context: fork`) must degrade gracefully for Codex; (4) `install.sh` ships skills (keep commands/ during transition); (5) **deletion is the LAST step** — `commands/*.md` + the 6 wrapper shims are removed ONLY after a full lifecycle dry-run (plan → execute → review → commit → push on a test phase) passes via skills alone, in BOTH harnesses. Include the gabe-commit simplify tier (deliverable 10 §2: deterministic >800-line size-budget check in its scripts/hooks + triggered quality-only pass in references/). Satellites (health/debt/roast/myopic) get `context: fork`. gabe-scope-pivot and gabe-init get `disable-model-invocation: true`.

RUNBOOK
- Verify per milestone: `./scripts/suite-doctor.sh` after each `./install.sh` re-run (expect DRIFT during work, CLEAN after each reinstall).
- Model routing: Fable authors the `when_to_use` trigger sentences + the conventions reference (judgment); delegate the mechanical spec re-homing to Sonnet subagents.
- Evidence log: append to `docs/investigations/2026-07-07-workflow-enhancement/output/impl/B2-migration-log.md` (commands + results, E2 style).
- Commit in slices on the branch (conventional commits, no attribution trailer); operator gates merge/push.
- Gotchas: the 4 thin shims (`commands/gabe-{debt,health,help,review}.md`) intentionally carry NO E1–E7 preamble ("corrupted auto-derived descriptions" — hardening ledger); their SKILL.md counterparts carry it. `templates/CLAUDE.md` must keep "Khujta Deep Behavioural Protocol" (the repo-side name is the corrected one). Skill `description`+`when_to_use` cap: 1,536 chars combined.

AFTER THAT
1. Dual-harness dry-run (Claude Code + Codex) → only then retire commands/ + shims.
2. Update the target-state page's B2 action row to ✅ with evidence (same pattern as 0.1).
3. Next in sequence: A2 KDBP-lite, gustify first (deliverable 9 §A2).
