## Gabe Suite: Repo vs Installed-State Drift Report

**Repo:** `/home/khujta/projects/gabe_lens`
**Compared against:** `~/.claude/{skills,commands}/gabe-*`, `~/.agents/{skills,commands}/gabe-*`, `~/.claude/docs/gabe-suite/`, `~/.agents/docs/gabe-suite/`
**Read-only** — nothing under `~/.claude` or `~/.agents` was modified.

### Headline finding

A large, undocumented-in-repo edit pass ("the hardening pass," self-documented at `~/.claude/gabe-hardening/`, dated 2026-07-02/07-03) was applied **directly to `~/.claude/skills/gabe-*` and `~/.claude/commands/gabe-*.md`, and nowhere else.** It added a 12-line "Gabe execution contract (E1–E7)" preamble to 38 files and 47 structural edit proposals (new evidence/verify-pass rules, a `references/` subdir under `gabe-review`, a `hooks.json` template under `~/.claude/templates/gabe/`, etc.) across ~22 files. `~/.claude/gabe-hardening/APPLY-STATUS.md` names the exact proposals and files. **None of this was ever committed back to the repo**, and it was **never applied to `~/.agents`** either — so the two install locations are now themselves out of sync with each other, on top of both being out of sync with the repo.

Ironically, the repo's own docs site (`docs/site/contract.html`, `reference.html`, committed content) *narrates* this hardening pass ("the pass embedded the 15-line E1–E7 execution contract... under the title of every gabe command and skill file — 38 files in total") — so the repo **documents** a change whose actual diffs live only in `~/.claude`, not in the repo's own `skills/*.md` / `commands/*.md` source.

---

### 1. `~/.claude/skills/gabe-*` vs `skills/<name>/SKILL.md`

| Skill | Status | Note |
|---|---|---|
| gabe-align | DIFFERS | +E1–E7 preamble; PENDING.md 10-col schema swapped in for legacy `deferred-cr.md`; evidence-citation tightening on PASS lines |
| gabe-arch | DIFFERS | +E1–E7 preamble |
| gabe-assess | DIFFERS | +E1–E7 preamble; D1 `Checked:` receipts line, D2 maturity-source anchor added |
| gabe-commit | DIFFERS | +E1–E7 preamble |
| gabe-debt | DIFFERS | +E1–E7 preamble; zero-pattern-catalog STOP branch, evidence floor added |
| gabe-docs | DIFFERS | +E1–E7 preamble; answer-key grading gate added |
| gabe-docsite | **MISSING-FROM-INSTALL** | Not installed to `~/.claude` at all, despite being in `install.sh`'s `CORE_SKILLS` since commit `e4b92e0` |
| gabe-execute | DIFFERS | +E1–E7 preamble |
| gabe-handoff | IDENTICAL | Added post-hardening (2026-07-05), never ran through the pass |
| gabe-health | DIFFERS | +E1–E7 preamble; coupling placeholder replaced with runnable `co-change` recipe |
| gabe-help | DIFFERS | +E1–E7 preamble (note: the *command* wrapper `gabe-help.md` was deliberately reverted, see §Commands) |
| gabe-lens | DIFFERS | +E1–E7 preamble |
| gabe-mockup | DIFFERS | +E1–E7 preamble; STRUCTURAL INVENTORY checklist, MUST-MATCH/MAY-DIFFER contract, REUSE LEDGER block, per-breakpoint gap table added |
| gabe-myopic | DIFFERS | Both `SKILL.md` and `method.md` differ; +E1–E7 preamble |
| gabe-next | DIFFERS | +E1–E7 preamble; Step 1.7 prior-row sweep, Types/Tier columns added |
| gabe-plan | DIFFERS | +E1–E7 preamble; scope-fence `update`, inline closed type-tag list added |
| gabe-push | DIFFERS | +E1–E7 preamble |
| gabe-review | DIFFERS + **EXTRA files** | +E1–E7 preamble; Evidence contract + Step 4.4 kill-question verify pass added; 1307→1198 lines. **New `references/` subdir** (`codex-bridge.md`, `merge-mode.md`, `post-review.md`) exists only in the install, not in the repo |
| gabe-roast | DIFFERS | +E1–E7 preamble; Evidence field + kill-gate rule added |

**Extra dirs in install not in repo:** none beyond `gabe-review/references/` above.
**Totals:** 17 DIFFERS, 1 IDENTICAL (gabe-handoff), 1 MISSING (gabe-docsite), 0 EXTRA skill dirs.

### 2. `~/.claude/commands/gabe-*.md` vs `commands/<name>.md`

| Command | Status | Note |
|---|---|---|
| gabe-align.md | DIFFERS | +E1–E7 preamble only |
| gabe-assess.md | DIFFERS | +E1–E7 preamble only |
| gabe-commit.md | DIFFERS | +E1–E7 preamble + proposals #11–#13 (70 diff lines) |
| gabe-debt.md | **IDENTICAL** | Preamble deliberately removed post-application — "corrupted auto-derived description" (see APPLY-STATUS.md) |
| gabe-execute.md | DIFFERS | +E1–E7 preamble + #1–#5 (Step 1.6 Types fallback, Step 4.3 PROOF format, Step 7 `ls` check) — 60 diff lines |
| gabe-handoff.md | IDENTICAL | Added post-hardening |
| gabe-health.md | **IDENTICAL** | Deliberately reverted (same 4-file exception as gabe-debt) |
| gabe-help.md | **IDENTICAL** | Deliberately reverted |
| gabe-init.md | DIFFERS | +E1–E7 preamble + mode-routing table + hooks.json-template read path (#25/#26) — 30 diff lines |
| gabe-lens.md | DIFFERS | +E1–E7 preamble only |
| gabe-mockup.md | DIFFERS | +E1–E7 preamble only |
| gabe-myopic.md | DIFFERS | +E1–E7 preamble only |
| gabe-next.md | DIFFERS | +E1–E7 preamble + #10 — 21 diff lines |
| gabe-plan.md | DIFFERS | +E1–E7 preamble + #6–#9 — 51 diff lines |
| gabe-push.md | DIFFERS | +E1–E7 preamble + #14–#16 — 51 diff lines |
| gabe-review.md | **IDENTICAL** | Deliberately reverted (4-file exception) |
| gabe-roast.md | DIFFERS | +E1–E7 preamble only |
| gabe-scope-addition.md | DIFFERS | +E1–E7 preamble only |
| gabe-scope-change.md | DIFFERS | +E1–E7 preamble + #41–#43 partial — 28 diff lines |
| gabe-scope-pivot.md | DIFFERS | +E1–E7 preamble only |
| gabe-scope.md | DIFFERS | +E1–E7 preamble + #41–#43 — 20 diff lines |
| gabe-teach.md | DIFFERS | +E1–E7 preamble + #44/#45 — 16 diff lines |

**Totals:** 17 DIFFERS, 5 IDENTICAL, 0 MISSING, 0 EXTRA.

**Extra artifact found (not a command/skill file but produced by the same pass):** `~/.claude/templates/gabe/hooks.json` (created 2026-07-03, referenced by the hardened `gabe-init.md`) has **no repo counterpart** under `templates/` and does not exist under `~/.agents/templates/gabe/`. If `install.sh` is ever re-run from the repo, it will overwrite the hardened `gabe-init.md` with the un-hardened repo version while this template file it depends on is never shipped/backed up by the installer — an orphaned, install-breaking artifact if not reconciled first.

---

### 3. `~/.agents/` comparison

`~/.agents/skills/gabe-*` and `~/.agents/commands/gabe-*.md` are the control group: they were **not** touched by the hardening pass.

| Category | Result |
|---|---|
| Skills (19 checked) | 18 **IDENTICAL** to repo, 1 **MISSING** (`gabe-docsite`, same reason as `.claude`) |
| Commands (22 checked) | 22 **IDENTICAL** to repo |
| Extra dirs/files | None |

`~/.agents` reflects a single clean `install.sh` run from repo commit-state as of **2026-07-01**, plus a manual sync of the newer `gabe-handoff`/`gabe-help` files on **2026-07-05** (matching mtimes across repo/`.claude`/`.agents` for those two). It never received the 2026-07-02/07-03 hardening pass, so **`~/.claude` and `~/.agents` are now two different suites** — a Codex session and a Claude Code session running the "same" `/gabe-review` or `/gabe-init` today get materially different instructions (e.g., Claude Code's `gabe-review` has the `references/` bridge files and Step 4.4 kill-question pass; Codex's does not).

---

### 4. `~/.claude/docs/gabe-suite/` and `~/.agents/docs/gabe-suite/`

Both present, and **identical to each other** (single simultaneous install). Compared against repo `docs/` + root `README.md`:

| File | Status |
|---|---|
| `README.md` (root) | Stale — installed copy says "21 command wrappers / 5 lifecycle wrappers", missing the `gabe-handoff` row; repo now says 22/6 |
| `docs/README.md` | IDENTICAL |
| `docs/WORKFLOW.md` | IDENTICAL |
| `docs/GAPS.md` | IDENTICAL |
| `docs/suite-state-audit.md` | Stale — installed copy dated 2026-07-01 ("added gabe-myopic... 21/12"); repo updated 2026-07-05 to 22/12 with gabe-handoff |
| `docs/workflows/*` | IDENTICAL |
| `docs/architecture/*` | IDENTICAL |

This is **ordinary install staleness**, not hand-editing: both doc trees are byte-identical to each other and simply reflect the repo state as of the last `install.sh` run (2026-07-01), before `gabe-handoff` was added (2026-07-05) and before `gabe-docsite` was generated. Re-running `install.sh` would fix this cleanly (unlike the skill/command drift in §1–2, which would be *destroyed* by a naive re-run since it only exists in `~/.claude` and nowhere in the repo to restore from).

---

### 5. Drift summary — what's edited in place and never came home

| Drift item | Where it lives | Repo has it? | `.agents` has it? |
|---|---|---|---|
| E1–E7 execution-contract preamble (38 files) | `~/.claude/skills/*`, `~/.claude/commands/*` | No (only *described* in `docs/site/`) | No |
| 47 hardening edit-proposals (evidence gates, verify passes, PENDING.md schema, REUSE ledger, etc.) | same 22 files | No | No |
| `gabe-review/references/{codex-bridge,merge-mode,post-review}.md` | `~/.claude/skills/gabe-review/references/` | No | No |
| `templates/gabe/hooks.json` | `~/.claude/templates/gabe/` | No | No |
| Hardening source corpus (`catalog.md`, `incidents.md`, `final-plan.md`, `preamble.md`, `packets/`, `result.json`) | `~/.claude/gabe-hardening/` | No (only narrated in `docs/site/contract.html`, `reference.html`, `mechanisms.html`, `drift.html` — note: that "drift" page is about *model behavior* drift, unrelated naming coincidence to this report) | No |
| `gabe-docsite` skill | repo `skills/gabe-docsite/`, in `install.sh` `CORE_SKILLS` | Yes (committed) | **Not installed anywhere** — install.sh hasn't been re-run since it was added |
| `gabe-handoff` skill+command | repo, `.claude`, `.agents` | Yes | Yes (all three in sync — this one's clean) |
| docs/gabe-suite install trees | `.claude` and `.agents` | Stale by one feature (`gabe-handoff`, count strings) | same staleness, mirrored |

**Net picture:** the repo is the stalest of the three surfaces for skill/command *behavior* — `~/.claude` has raced ahead via direct patching, `~/.agents` is frozen at the last clean install, and the repo sits documented-but-uncommitted in between (its docs site talks about a contract its own skill files don't contain). The only fully clean, three-way-consistent artifact is `gabe-handoff`.

### Files/paths referenced
- `/home/khujta/.claude/gabe-hardening/APPLY-STATUS.md` — authoritative log of what was patched where
- `/home/khujta/.claude/gabe-hardening/PREAMBLE.txt`, `final-plan.md`, `catalog.md`, `incidents.md`, `preamble.md`, `result.json`, `packets/*.md`
- `/home/khujta/.claude/skills/gabe-review/references/{codex-bridge.md,merge-mode.md,post-review.md}`
- `/home/khujta/.claude/templates/gabe/hooks.json`
- `/home/khujta/projects/gabe_lens/docs/site/{contract.html,reference.html,mechanisms.html,drift.html}` and `docs/src/reference.md`
- `/home/khujta/projects/gabe_lens/install.sh` (line 36, `CORE_SKILLS`)
- `/home/khujta/projects/gabe_lens/docs/investigations/2026-07-07-workflow-enhancement/` — unrelated, pre-existing investigation folder noticed but not examined (out of scope for this drift audit)
