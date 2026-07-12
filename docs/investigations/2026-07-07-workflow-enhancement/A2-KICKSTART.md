# A2 Kickstart — paste this into a FRESH session

> Generated 2026-07-09 by /gabe-handoff · suite repo `main` @ `eb98da1` (all B2 work merged +
> pushed to both remotes). Launch the session in `/home/khujta/projects/gabe_lens` with gustify
> added as a working directory (e.g. `claude --add-dir /home/khujta/projects/apps/gustify`).

---

Continue the Gabe Suite transformation. Suite repo `/home/khujta/projects/gabe_lens` is on `main` (HEAD `eb98da1` — fix(specs): apply the two dry-run findings). Execute **Phase A2: KDBP-lite, gustify first**, per the decided fork (operator locked A2+B2+C on 2026-07-09; Codex dropped 2026-07-09 — Claude Code is the only harness).

READ FIRST (in this order):
1. Auto-memory loads the investigation summary automatically (`fable-workflow-investigation.md`).
2. `docs/investigations/2026-07-07-workflow-enhancement/output/09-fork-migration-plan.md` — **§A2.1 (file disposition table) + §A2.2 (order and verification) are the spec for this session.** The §B2.1 rows tagged "(A2)" also come due now: gabe-plan writes the PLAN.json mirror, gabe-init template inventory update.
3. `output/impl/B2-migration-log.md` — everything that already landed (B2 complete end-to-end: 25 skills, commands/ retired, Claude-only, dry-run evidence).
4. `output/10-code-audit-simplify-verdict.md` §3 — the gustify one-time cleanup backlog that lands in PENDING.md this pass.

STATE
- Landed (all merged to `main`, pushed to origin + korigin, verified `eb98da1` on all refs): B2 skills-only migration (25 skills, lean cores + references/, E1–E7 stated once), commands/ retired after the Claude-leg lifecycle dry-run passed via skills alone, Codex support dropped (install.sh Claude-only, suite-doctor 2-way), simplify tier in gabe-commit, dry-run spec fixes (review 5a excludes `.kdbp/**`; PUSH template ci=none).
- Verified this past session: `./install.sh` → 25/25 skills; `./scripts/suite-doctor.sh` → CLEAN (repo vs ~/.claude); full lifecycle fixture run green (plan→execute→commit→review→push, Phases row ✅✅✅✅).
- Untouched operator WIP in the suite repo (do NOT bundle into commits): `docs/site/assets/site.css`, `skills/gabe-docsite/{assets,generator}` modifications, and the untracked `docs/investigations/` folder.
- Target project: `/home/khujta/projects/apps/gustify` — its `.kdbp/` currently holds the ~24-file inventory the disposition table reduces (verified by `ls`).

TASK (do this next — quoted from deliverable 9 §A2, no silent downgrade)
Apply the **A2.1 file disposition table** to gustify's `.kdbp/`: "~24 files → ~11 keepers (7 hot + 4 low-inertia), one new JSON mirror." Per-file, verbatim from the table: PLAN.md **KEEP, slimmed** (state table + phase details only; narrative stripped to commits/HANDOFF) + **NEW sibling `PLAN.json`** — machine mirror (phases, cells, tier, `proof:` field), written by gabe-plan/auto-tick; PENDING/HANDOFF/PUSH+DEPLOYMENTS/STRUCTURE/SCOPE+scope-references/VALUES **KEEP unchanged**; DECISIONS **KEEP** with ≥60-day resolved entries rotated to `archive/DECISIONS-2026H1.md` (live file under ~300 lines); RULES **KEEP** (gustify unchanged); BEHAVIOR **KEEP, grows** — becomes the manifest host (the `mockup:` bindings block + `critical_paths`/`proof_root`); LEDGER **SHED** — current 1.3MB file → `archive/LEDGER-2026H1.md`, new format = thin session index (one line per session/checkpoint), drop the per-tool-call tail and remove its PostToolUse append-hook; DOCS.md **KEEP** (gustify); ROADMAP **RETIRE** (pending arc folds into SCOPE §Phases; file → `archive/retired/`); KNOWLEDGE/ENTITIES/MAINTENANCE/MOCKUP-VALIDATION/DEVIATIONS **RETIRE** → `archive/retired/`; one-shots **ARCHIVE**. "Suite-side writes updated in the same change: gabe-commit/plan/execute/handoff write-paths, session-start awareness hooks, `templates/` for gabe-init, and the retired files' references removed from all skill bodies" — or the files regrow. Rollback rule: "everything moves to `archive/`, nothing is deleted — reverting is `git mv` back."

Also riding this pass (absorbed items, from deliverable 9's interaction table + B2 deferral notes):
- gabe-plan gains the PLAN.json writer (remove the "Pending (phase A2)" note from its core when done); gabe-init templates updated to the KDBP-lite inventory (same — remove its pending note).
- The 1.1 `mockup:` manifest bindings land in gustify's BEHAVIOR.md; the gabe-mockup references' "Project bindings — scheduled to move in A2" blocks shed to gustify's RULES.md/DESIGN.md.
- Fork C: one `/loop` CI-babysitting runbook line in gustify's PUSH.md; the 0.5c restraint line in gabe-init's CLAUDE.md template.
- Deliverable 10 §3 gustify cleanup backlog → PENDING.md rows (6 items: ProfileScreens/RecipeFilterPanel/CookingScreenModel/RecipeBrowseContainer splits, 3 duplicated helpers, ~9.9K dead archive lines).

RUNBOOK
- Verify per milestone: in the suite repo, `./install.sh` + `./scripts/suite-doctor.sh` (expect CLEAN); in gustify, §A2.2's gate — "one full lifecycle cycle (plan → execute one small task → review → commit → push) runs green on the new inventory; a fresh session resumes correctly from HANDOFF + PLAN.json alone."
- Model routing: Fable plans, decides dispositions, and authors PLAN.json schema + write-path edits; Sonnet subagents do mechanical file moves/archives and reference sweeps.
- Evidence log: `docs/investigations/2026-07-07-workflow-enhancement/output/impl/A2-migration-log.md` (E2 style — commands + results).
- Commit in slices, conventional commits, no attribution trailer. Suite-repo commits on a new branch off `main`; gustify commits per its own KDBP flow. Operator gates merge/push in both repos.
- Gotchas: (1) a pre-commit hook false-positives on COMPOUND shell commands containing `git commit` — run each `git commit` as its own minimal Bash call (message via `-F <file>` when it contains code snippets); (2) gustify is a live project — archive, never delete (rollback = `git mv` back); (3) suite install is Claude-only now — no `~/.agents` anywhere; (4) `templates/CLAUDE.md` must keep "Khujta Deep Behavioural Protocol"; (5) do not bundle the suite repo's operator WIP (docsite files, docs/investigations/).

AFTER THAT
1. gastify second: same disposition pass plus its 0.2 additions (RULES.md created, seeded from its paid-for lessons; DOCS.md retired there).
2. Update the target page's A2 action row to ✅ with evidence (`output/site/target.html`, same pattern as 0.1/B2).
3. Then the Wave-1 remainder on the new structure (evidence freshness 1.3c, living proof set, capture tool) per `output/06-sequenced-change-plan.md`.
