## What this pass was

Picture a checklist that a strong, careful model fills in correctly almost by instinct — citing line numbers, pasting real command output, stopping to ask before quietly doing a cheaper version of a task. Now hand that same checklist to a faster, more literal model. It will happily write "done ✅" without running anything, because nothing in the skill text *forced* it to do otherwise. The 2026-07 hardening pass went through every gabe-* skill and command file, found the places where a real Gastify/Gustify-style session had drifted this way, and rewrote the instructions so the safe behavior is mechanical rather than a matter of which model happened to be running.

The work was scoped as 47 numbered proposals (P0–P47 in the plan; the numbering has small historical gaps) sorted into six waves — shared preamble, core loop, gates, init/mockup, analysis skills, and authoring/teaching. Every proposal was judged before it shipped: **KEEP** (land as designed), **REVISE** (land with a correction the judge specified), or **KILL** (drop). This round produced 42 KEEP, 5 REVISE, and 0 KILL — every anchor the plan cited was re-verified against the files actually on disk before editing.

:::note Source documents
`~/.claude/gabe-hardening/final-plan.md` (the ranked plan, cross-cutting contracts, dependency notes) and `~/.claude/gabe-hardening/APPLY-STATUS.md` (the live status table + resume runbook) are the two files this page distills. Read them directly for anchor quotes and packet-level detail — this page is the summary, not the replacement.
:::

## Wave 0 — the shared preamble sweep

Before touching any individual skill, the pass embedded the 15-line [E1–E7 execution contract](contract.html) byte-identical under the title of every gabe command and skill file — **38 files** in total. The idea is the one running through this whole suite: a shared naming layer that stays identical everywhere is detectable by a plain text diff, while 38 slightly-different paraphrases of "cite your evidence" would each need separate judgment calls to trust.

The sweep had one deliberate exception. Four files are thin command *shims* — `commands/gabe-debt.md`, `commands/gabe-health.md`, `commands/gabe-help.md`, `commands/gabe-review.md` — whose entire markdown body doubles as the auto-derived one-line description shown in command pickers. Pasting a 15-line contract block into that body corrupted the derived description, so the preamble was applied and then removed from those four specifically. Their real logic lives in the matching `skills/gabe-*/SKILL.md` file, which does carry the full contract. This is a standing exception, not an oversight — a future pass should not re-add the preamble to those four shims.

| Scope | Count | Detail |
| --- | --- | --- |
| Files carrying the full E1–E7 block | 38 | Every gabe-* command + skill file except the four shims below |
| Files with the preamble intentionally removed | 4 | `commands/gabe-{debt,health,help,review}.md` — auto-derived description corruption; SKILL.md counterpart carries it instead |

## File-by-file: what each skill got

This is the flat index. Each row names the file, the proposal IDs that landed on it, and a one-line description of the gate in plain language. Full wording for any row lives in the file itself — grep the file for the bolded gate name.

| File | Proposals | What it got |
| --- | --- | --- |
| `commands/gabe-execute.md` | #1–#5 | Task contract + REUSE LEDGER gate before any write; persistent per-task checklist in PLAN.md; deterministic Types fallback + PROOF line template + `ls` existence check; T[i] VERIFY evidence block; mechanical scope fence at checkpoints |
| `commands/gabe-plan.md` | #6–#9 | Acceptance/tier template — Types column, Scope/References/Acceptance/Checkpoint fields, Tasks-block anchor; auto-tick phase-footer cross-check + enumerated skip codes; scope-fence `update` mode + row-state staleness bullet; inline closed type-tag list + missing-template STOP |
| `commands/gabe-next.md` | #10 | Step 1.7 prior-row sweep (always prints, never silently blocks) + re-print on advance; Types/Tier added to expected columns |
| `commands/gabe-commit.md` | #11–#13 | Executed-evidence gate — Step 2.0 command resolution, evidence rows, 3-state glyphs, fixed ALL-PASS exemplar; CHECK 6 deterministic match + mandatory deferred-scan line + hard ≥3 escalation; skip-to-pending still leaves commit BLOCKED (force-commit requires a `FORCED:` reason) |
| `commands/gabe-push.md` | #14–#16 | Pasted CI output required (⏳ ≠ ✅); Step 6.7 deploy-verify smoke probe against the live target; Step 10 tick decision record; non-interactive defaults table for all ~8 prompts (safety rows never default to proceed); Step 8.5 substep renumbering |
| `skills/gabe-review/SKILL.md` | #17–#22 | Per-finding Evidence line + mandatory Step 4.4 verify/kill pass; both triage bypasses closed (skipped CRITICAL, mid-triage exit → auto-defer); canonical 10-column PENDING.md schema; Step 3.2 four pass-criteria + genericized micro-examples; mandatory deduction worksheet (no mental arithmetic); merge-mode/post-review/Codex-bridge content relocated to `references/` |
| `skills/gabe-align/SKILL.md` | #23–#24 | Cited COVERED / inspected PASS / deterministic ALIGNMENT map; checkpoint handoff writes the canonical PENDING.md schema, with `deferred-cr.md` kept only as a legacy fallback |
| `commands/gabe-init.md` | #25–#26 | Missing-anchor STOP for hook JSON, rewired to read from the new `templates/gabe/hooks.json`; mode-routing table for reset/update/skip replacing scattered prose |
| `skills/gabe-mockup/SKILL.md` | #36–#40 | Reference-fidelity gate — R3 structural inventory through R12 tick + same-viewport side-by-side capture; Rule 7 rewritten as a MUST-MATCH / MAY-DIFFER contract; REUSE LEDGER before any new component file; RF3 per-breakpoint gap table; unknown mode argument now hits a confirm gate instead of silently falling through |
| `skills/gabe-myopic/SKILL.md` + `method.md` | #27–#28 | Evidence line per finding + absence-claim search proof + verify-accounting header; mandatory verify/kill pass and a quote-what-the-screen-says gate in Step 0 |
| `skills/gabe-roast/SKILL.md` | #29–#31 | Required Evidence field + kill-gate for absence claims (with a trim of the superseded prose rule); measurable read protocol + printed read ledger; sequential dedup sourced from the located prior artifact, never memory |
| `skills/gabe-debt/SKILL.md` | #33 | Zero-pattern-catalog STOP branch; evidence floor before a finding can be marked `status=missing` |
| `skills/gabe-health/SKILL.md` | #34–#35 | Runnable coupling recipe (a real command) replacing the `[compute…]` placeholder + no-fabrication gate; `.kdbp/PLAN.md` added to the scope-creep plan lookup, severity legend, copied-numbers checksum, placeholder-ized examples |
| `skills/gabe-assess/SKILL.md` | #32 | D1 `Checked:` receipts line; D2 maturity claims now anchor to `.kdbp/BEHAVIOR.md`'s `maturity:` field instead of being asserted from memory |
| `commands/gabe-scope.md` | #41–#42 | Step 8(a) assembles from the CURRENT on-disk files + a diff gate before any overwrite; LLM cost accounting restricted to observable figures only, no invented dollar amounts |
| `commands/gabe-scope-change.md` | #43 | The 9 pivot-trigger rules inlined verbatim (with a keep-in-sync note) + a user-picks fallback if the classifier prompt can't be read |
| `commands/gabe-teach.md` | #44–#45 | Step 4b exact commit-range anchor + mandatory range echo; answer-key grading gate for Q1/Q2 — scored against a written key, uncertain rounds down |
| `skills/gabe-docs/SKILL.md` | #46 | Quality checklist bound to a Write/Edit trigger + a one-line `docs-check:` output contract |
| `skills/gabe-lens/SKILL.md` | #47 | Pre-emit self-check for analogy blocks — cut, don't decorate — graded against the file's own "Bad" example |

One structural note on `gabe-teach.md`: it is the suite's largest file (2,504 lines) and received +12/−1 lines in this pass. A progressive-disclosure trim similar to the review file's `references/` split is flagged as a recommended follow-up — it was out of scope for this round.

## Shared strings — why wording had to stay byte-identical

Several of the gates above are actually the same mechanism appearing in more than one file — a proof line that gabe-execute produces and gabe-review later consumes, for instance. If the wording drifted even slightly between the two files, a literal-minded model reading only one of them would treat it as a different, unrelated format. The plan calls these out explicitly as strings that must be **byte-identical wherever they appear**:

| Shared string | Appears in |
| --- | --- |
| REUSE LEDGER block | gabe-execute (#1) ≡ gabe-mockup (#38) ≡ preamble E4 |
| `PROOF: <cmd> → <runtime> → <artifact path>` | gabe-execute producer (#3) ≡ gabe-review consumer (#20) |
| Evidence row — `<check>: \`<cmd>\` → exit <code>, "<copied count>"` | gabe-execute (#4) ≡ gabe-commit (#11) |
| Verify-pass header — `raw N → killed X → downgraded Y → survived Z` | gabe-review (#17) ≡ gabe-myopic (#27/#28) ≡ gabe-roast (#29) |
| Skip code — `ℹ PLAN: <col> tick skipped (<enum>)` | gabe-plan (#7) ≡ gabe-commit (#13) ≡ gabe-execute (#2) |
| Prior-phase warning — `⚠ INCOMPLETE PRIOR PHASES: [...]` | gabe-plan (#8) ≡ gabe-next (#10) |
| 3-state glyphs — `✅ / ❌ / ⤫ skipped(<reason>)` | gabe-commit (#11) ≡ gabe-execute (#4) ≡ preamble E2 |
| Canonical PENDING.md schema (10 columns) — `\| # \| Date \| Source \| Finding \| File \| Scale \| Priority \| Impact \| Times Deferred \| Status \|` | gabe-review (#19) ≡ gabe-commit (#12) ≡ gabe-align (#24) |

:::note Ordering dependency
#19 (the canonical PENDING.md schema) had to land before #12 (commit's deferred-scan line) and #24 (align's checkpoint handoff), since both of those read the schema it defines. #25 (init's hook STOP) required `templates/gabe/hooks.json` to exist first. #22 (review's relocation) landed in the same change as #17/#20/#21 so the review file's total line count still nets negative even after the new gates were added.
:::

## What the 5 REVISE proposals changed from the original plan

Five proposals shipped with a correction from the judge rather than exactly as first drafted. In every case the correction made the gate more honest or more generic, never weaker.

| ID | File | Revision |
| --- | --- | --- |
| #6 | gabe-plan | Also emit a **References** field, so the template's field names match exactly what gabe-execute Step 1 reads — the original draft would have left a naming mismatch between producer and consumer. |
| #9 | gabe-plan | Drop the "copy this at next release" meta-instruction and inline the closed type-tag list immediately — a weak model can't act on a deferred-maintenance note, so the fix has to be present now, not scheduled. |
| #12 | gabe-commit | The class tag for a deferred-scan finding lives inside the Finding cell (`[test-gap] …`) rather than as a new table column — keeps #19's 10-column schema canonical instead of forking it. |
| #20 | gabe-review | Genericize the Step 3.2 micro-examples — use placeholders like `:<port>` and `e2e/proof/…` instead of a real project's actual port number or path, so the reference file stays project-agnostic. |
| #22 | gabe-review | Honest line-count accounting on the relocation — the merge-mode/post-review/Codex-bridge content totals roughly 145 lines, not the 710 the first draft assumed; still enough to fund the new additions (~+34 lines) so the file nets negative overall. |

## Shipped artifacts

Two new artifacts exist on disk because of this pass, beyond the edited skill/command files themselves.

| Artifact | Purpose |
| --- | --- |
| `skills/gabe-review/references/`<br>merge-mode.md · post-review.md · codex-bridge.md | The three sections relocated out of `SKILL.md` by #22 (merge-mode handling, post-review follow-up, the Codex bridge). Each keeps a trigger line at its original anchor in SKILL.md so a reader still finds it; the review file dropped from 1,307 to 1,198 lines even after adding #17–#21's new gates. |
| `~/.claude/templates/gabe/hooks.json` | Seven real hook-array entries extracted **verbatim** from an installed `~/.claude/settings.json` (SessionStart/PreToolUse/PostToolUse/Stop), keyed by the marker string gabe-init's Step 2 greps for: `KDBP Active`, `ACTIVE PLAN`, `KNOWLEDGE:`, `KDBP CHECKPOINT`, `LEDGER.md`, `STRUCTURE:`, `SESSION-END REMINDER`. This is the anchor #25's missing-anchor STOP checks for — before this file existed, a missing hook definition had no fallback but to be reconstructed from memory, which is exactly what E6 forbids. |

## Rollback

The entire pre-hardening suite was tarred before the first edit landed. Restoring any single file, or the whole suite, is a one-line extraction — there is no partial-state risk from trying a rollback.

| Scope | Command |
| --- | --- |
| One file | `tar xzf ~/.claude/backups/gabe-suite-pre-hardening-20260702.tar.gz -C ~/.claude <path-inside-tar>` |
| Whole suite | Extract the full tarball over `~/.claude` |

## Current status: 47/47 applied, verification partly open

Every one of the 47 proposals shows DONE or APPLIED in `APPLY-STATUS.md` as of this pass — there is no proposal left unstarted. The one open item is that two groups, **commit** and **push**, are marked *"APPLIED — verification pending"*: the edits are in the files, but nobody has yet re-read those two files side-by-side against their packets to confirm every proposed line is present and correctly worded, the way every other group in the table already has been.

:::note What "verification pending" means in practice
It does not mean the gates are missing — grep for the gate names (for example the executed-evidence gate in `commands/gabe-commit.md`, or the deploy-verify smoke probe in `commands/gabe-push.md`) and they are there. It means the specific verification step in the resume procedure below — checking packet vs. file line by line — has not been run for those two files yet.
:::

## How a future session resumes or verifies this work

The runbook is designed so any model, in any single session, can pick up exactly one group and finish it correctly without re-reading the whole 47-item plan.

1. Read `APPLY-STATUS.md` first — it is the single source of truth for what's done versus pending, not this page.
2. Read that group's packet(s) under `~/.claude/gabe-hardening/packets/packet__*.md` in full — each packet holds the anchor quote, the exact change text, the judge's verdict (KEEP/REVISE with its correction), and any paired trim.
3. Locate each anchor **by its quoted text**, not by line number — line numbers drift as earlier proposals land. A REVISE note always overrides the packet's original change text.
4. Use the canonical shared strings (§04 above) byte-identical — never paraphrase them, even for a "clearer" wording.
5. After editing: confirm every proposal in the packet is present in the file, headings and numbering are still coherent, and no project-specific names crept in — anonymize examples as `:<port>`, `src/routes/...`, never a real project's port or path.
6. Update the status table in `APPLY-STATUS.md` in the same session — this is itself an application of the E5 state-sync rule the pass exists to enforce.

For the two groups still marked verification-pending: the next session that picks up **commit** or **push** should do step 4 of that procedure — a direct packet-vs-file comparison — before touching anything else, then flip the status cell from "verification pending" to a confirmed date.
