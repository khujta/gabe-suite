# Adopt spec — the binding contract behind /gabe-adopt

> The one deep home for the adoption tracker, archive rules, the generator-promotion path,
> ranking signals, the section checklist, and walk-recorded approval. SKILL.md carries intention
> + modes and points here; nothing below is restated there.
> Design record & ruling: `docs/design/verification-first/README.md` §5 addendum R7 (suite repo).

## Preconditions (all modes)

- Git repository + `.kdbp/` present — else exit: `⛔ No KDBP. Run /gabe-init first.`
- `section`/`status`/`rank` require the tracker (`docs/site/center/adoption.json`) — else exit
  with the init pointer. `init` with an existing tracker asks: resume (report status) or
  re-adopt (archives the current center again — rare, confirm twice).
- A project with a center but no tracker is mid-flight history (hand-bootstrapped, n=2 era):
  `init` treats the existing center as archivable inventory like any other doc tree.

## The adoption tracker — `docs/site/center/adoption.json`

Small, append-only in spirit: rows change status, never vanish.

```json
{
  "version": 1,
  "started": "YYYY-MM-DD",
  "archived_to": "docs/_archive/YYYY-MM-DD-pre-adoption/",
  "shortlist_approved": null,
  "sections": [
    {
      "entity": "cook-state",
      "rank": "critical",
      "status": "pending",
      "checklist": {
        "testing_inventory": false, "legacy_reverified": false, "card": false,
        "diagrams": false, "proofs": false, "gate_green": false, "walk_recorded": false
      },
      "signals": "junit 34 hits · churn 12 commits/90d · SCOPE REQ-03",
      "approved_walk": null,
      "notes": ""
    }
  ]
}
```

- `status`: `pending | building | awaiting-approval | approved | covered-by-feature | dropped`.
- `covered-by-feature`: the forward track (`/gabe-feature <phase>`) already built this entity's
  section — record the phase id in `notes`, reuse, never duplicate (E4).
- `dropped` requires a reason in `notes`. Rows are never deleted.
- The tracker NEVER lives in PLAN.md and `/gabe-next` never reads it — the main plan keeps
  shipping while adoption proceeds in spare time; both tracks meet in the same center.

## Mode `init`

1. **Inventory** — list what exists, with counts: `docs/**` trees (by subsystem), any
   `docs/site/center/` (hand-built), README-adjacent doc files, mockup/investigation dirs.
   Render as a table: path · files · looks-like (docs system / center / investigation / assets).
2. **Archive picker (checkpoint)** — the operator marks each inventory row KEEP or ARCHIVE.
   Machine sources are never offered for archive: tests, junit/results, `.kdbp/`, root README,
   source code. Default proposal: archive superseded human doc trees + any hand-built center;
   keep investigations referenced in git history.
3. **Archive (on approval)** — `git mv` each ARCHIVE row into
   `docs/_archive/<date>-pre-adoption/<original-path>/`, then write an `README.md` in the archive
   dir: why archived, what replaced it (the center), how to reference (links keep working in git
   history; nothing was deleted). One commit, path-scoped. Same policy as suite skills:
   **archived, never deleted**.
4. **Bootstrap the center shell** from the installed suite `templates/center/`:
   `center.config.json` skeleton (project name, corpora bindings, results globs from
   `.kdbp/BEHAVIOR.md` `results_out` when present), the generator scripts, assets/shell, empty
   section dirs.
   - **Generator promotion (first-ever adoption only):** if `templates/center/` does not exist
     in the installed suite, init's first job IS the promotion (design record §5: ripe at n=2,
     executed at n=3 with purpose): port the most mature existing center implementation
     (gustify `scripts/_center_*.py`, `refresh_center.sh`, `check_center_links.py`),
     generalize hard-coded paths into `center.config.json` bindings, land them in the SUITE
     repo as `templates/center/`, reinstall, and only then bootstrap the project. E6: never
     compose generators from memory; if the reference implementation is unreachable, STOP.
   - Promoted-generator floor (what the templates must support): C-id extraction from junit
     test names via the anchored token pattern (red-spec §Backfill); **ever-red** per id
     (`git log -S "C<id>"` → first commit → `RED:` trailer present?); `walks.jsonl` → manual
     angles + staleness; honest-gap rendering (`⤫ skipped(no reporter)`, NEVER-walked red).
5. **Write the tracker** (`sections: []`, `shortlist_approved: null`) and report (E7): archive
   manifest, bootstrapped paths, the `rank` pointer.

## Mode `rank`

1. **Gather signals — every candidate cites machine sources only:**
   - `.kdbp/SCOPE.md` REQs + §Phases entities; `.kdbp/PLAN.md` phases **including archived
     plans** (`.kdbp/archive/`); routes/modules (framework route tables, top-level feature
     dirs); test density per entity (corpus grep + junit name matches); churn
     (`git log --since=90.days` commits per dir); existing `walks.jsonl` subjects;
     `.kdbp/BEHAVIOR.md` `critical_paths` (hotfix-sensitive globs rank critical by default).
2. **Render the candidate table:** entity · proposed rank (critical/high/medium) · the signal
   evidence per column · what a section would contain (tests found y/n, legacy docs found y/n,
   proofs found y/n). No signal, no row — an entity the machine cannot see is proposed only by
   the operator.
3. **Checkpoint:** the operator trims, re-ranks, adds, drops. On approval: write `sections[]`
   rows (status `pending`, signals recorded), stamp `shortlist_approved`, report. Re-running
   `rank` later APPENDS new candidates; approved rows are never re-ranked silently.

## Mode `section <entity>`

**One entity per run — refuse batching** (`⛔ one section per run — human-speed review is the
point`). Preconditions: shortlist approved, entity row exists and is `pending`/`building`.

1. **Testing inventory** (machine): corpus tests matching the entity (grep + junit), counts per
   corpus (api/web/e2e), angle classification (automated angles present; manual angles from
   `walks.jsonl`; **absent angles NAMED** — the gap list is content, not shame). Tick
   `testing_inventory`.
2. **Legacy mining:** read the archived docs for this entity (`archived_to` + git history).
   Every claim carried forward is RE-VERIFIED against current code/tests before it enters the
   center; claims that no longer verify go to a `Not carried forward` list on the section page
   with one-line reasons. Bulk import is forbidden — a legacy page is testimony, not truth.
   Tick `legacy_reverified`.
3. **Build:** feature card (entity primacy, gabe-feature's card contract where applicable),
   diagrams per `gabe-docs` standards (or the card states why fewer), testing page (angles +
   verdicts from machine facts), proofs — curate real shots/artifacts where they exist; absent
   proofs render as named gaps, never staged. Tick `card` / `diagrams` / `proofs`.
4. **Regenerate + gate:** run the center refresh; the link/gate check must be green with this
   section contributing zero WARNs. Tick `gate_green`.
5. **Checklist render + checkpoint:** show the checklist, the built page paths, the
   dropped-claims list. Operator verdict:
   - **approve** → record via `/gabe-walk adopt:<entity> pass` (who·when·evidence = section
     path); store the walk timestamp in `approved_walk`; status `approved`. Tick
     `walk_recorded`.
   - **changes** → status `awaiting-approval`, notes carry the asks; next run resumes here.
   - **park** → status stays `building`, notes say why.
6. **Report (E7):** paths, checklist, tracker row, and the walk line verbatim on approval.

## Mode `status`

Read tracker + `walks.jsonl`; render the board: per-section status/checklist glyphs, approved
n/of-shortlist convergence, stalest approved section (walk age), suggested next entity (highest
rank still pending). Read-only — writes nothing.

## Non-goals

- No forward-track coverage (`/gabe-feature` owns shipped phases + the PLAN `Center` cell).
- No standalone doc placement (`/gabe-docsite`), no scope/plan edits, no deletion — ever.
- No auto-approval: a section without its walk record is not approved, whatever the prose says.
- No synthesized history: the section's changelog derives from git; adoption never backdates.
