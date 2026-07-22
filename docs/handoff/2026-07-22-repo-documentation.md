# Repo Documentation — making the Gabe Suite repo navigable (handoff)

**Track 2 of a two-track split (2026-07-22).** The work was divided so each track can
run without blocking the other:

- **Track 1 — suite propagation + retrofit.** Continue on the scripts/templates/skills,
  mature the Action Ledger feature-page redesign (its **roast is still pending**), then
  propagate the suite changes and retrofit the generated pages in **gastify** and
  **gustify**. Package: [`docs/handoff/2026-07-22-action-ledger/`](2026-07-22-action-ledger/README.md).
- **Track 2 — THIS handoff.** Make the *repository itself* navigable: take the
  maintainer-facing docs (the `site ⟷ files ⟷ suite` map is the anchor), document them
  properly, and link them into a browsable surface so future-us can navigate the repo
  instead of spelunking the file tree.

> Track 2 is about documenting **the suite as a codebase we maintain** — NOT the command
> center the suite *generates* for other projects. Different audience, different site.

---

## The goal

A **maintainer-facing "repo atlas"**: one navigable entry point that answers *"how is
this repository wired, and where does X live?"* — anchored by the interactive
`map-site-files-suite.html` (nav ⟷ sections ⟷ files ⟷ commands), and reaching the design
record, the architecture docs, and the conventions. Today those exist but are scattered
and only cross-linked by hand from `CLAUDE.md`.

---

## The documentation surfaces today (what exists, and the constraint)

| Surface | Location | Audience | Form | How it's reached |
|---|---|---|---|---|
| Public README | `README.md` | visitors/users | md | repo root |
| Project context | `CLAUDE.md` | AI + maintainers | md | the de-facto index (prose) |
| **Published docsite** | `docs/site/` ← `docs/docsite.config.py` (skill `gabe-docsite`) | **users** ("how to use") | **md → HTML, markdown-only** | generated site |
| **Design record** | `docs/design/verification-first/` | **maintainers** ("read before restructuring") | md + **interactive HTML** | `CLAUDE.md` + its own README |
| Architecture docs | `docs/architecture/` (README, diagram-standards, requirements, scope-data-contracts, stack) | maintainers | md | file tree only — no nav surfaces them |
| Workflow docs | `docs/workflows/` + `docs/WORKFLOW.md` | users/maintainers | md | `CLAUDE.md`; installed to `~/.claude/docs/gabe-suite/` |
| Gaps | `docs/GAPS.md` (`W1..Wn`) | maintainers+users | md | `WORKFLOW.md` |
| Suite-state audit | `docs/suite-state-audit.md` | maintainers | md | `CLAUDE.md` |
| In-CLI catalog | skill `gabe-help` (generated Full Suite Catalog + P14 registry) | users | CLI | `/gabe-help` |
| Investigations / handoffs | `docs/investigations/`, `docs/handoff/` | historical | HTML/md | dated, unindexed |

**The linchpin constraint:** the published docsite generator is **markdown-only**
(`source_md` per section in `docs/docsite.config.py`). It cannot publish the bespoke
interactive HTML maps as-is. So "link the map to a documentation site" is a real design
choice, not a one-line config add — see the decision below.

**The interactive HTMLs that need a home** (all under `docs/design/verification-first/`,
currently linked only from that dir's README):
- `map-site-files-suite.html` — **the anchor** (nav ⟷ sections ⟷ files ⟷ commands)
- `example-testing-page.html` — the Testing page preview over real dry-run numbers
- `consolidated-trees.html` — the three leveled trees
- `gabe-red-design.html` — the TDD-beat design brief
- `shell-preview/*.html` — the eight A3 station skeletons (board/docs/entity-index/feature/index/ledger/releases/tests)

---

## Done already this session (Track 2, uncommitted)

Working tree carries two unstaged edits — the first Track-2 step, ready to be the opening
commit:

- **`map-site-files-suite.html` synced to v3.** The repo copy had drifted to v2 (3-column,
  "updated 2026-07-16"); the polished **v3 four-column** version (adds the far-left "sidebar
  as gastify renders TODAY" column + the RULED-2026-07-21 gap table + ruled-nav mock) had
  only ever lived as a claude.ai artifact. Now written back to the repo — repo is the source
  of truth again. (389 lines / 34.6 KB; braces balanced; renders standalone.)
- **`docs/design/verification-first/README.md`** reference note updated from "07-16" to
  describe the v3 four-column structure + the gap table.

Suggested first commit (Track 2 opens here):
`docs(design): sync the site⟷files⟷suite map to v3 in the repo (was stale at v2)`

---

## The core decision to rule (before building)

**Where does the repo atlas live, and how do the interactive HTML maps get surfaced given
the docsite is markdown-only?** Three options:

- **A (REC) — a standalone maintainer "atlas" index, separate from the user docsite.**
  Add `docs/design/index.html` (or `docs/atlas.html`) — a light navigable landing that links
  every interactive HTML + the design/architecture markdown, with a one-line "what/why/who"
  per entry. Keeps the user-facing docsite (`docs/site/`) clean and unchanged; the atlas is
  honestly maintainer-facing. Cheapest; no generator surgery. The interactive HTMLs stay
  first-class (opened directly, no iframe).
- **B — extend `docsite.config.py` to publish raw/`source_html` pages** and add a
  "Repository / Architecture" tier to the existing docsite. One site for everything, but it
  mixes two audiences (how-to-use vs how-it's-built) and needs generator work + a nav that
  can host embedded interactive pages.
- **C — minimal: just cross-link.** Add an index section to the design-record README and a
  richer "Workflow Docs / Repo map" block in `CLAUDE.md`; no new site. Lowest effort, but
  "navigable site" stays aspirational.

Recommendation: **A** now (a real navigable surface without entangling the user docsite),
with **C's** cross-links folded in for free. Revisit **B** only if the atlas earns enough
traffic to deserve unification.

---

## Work items (ordered, once the decision is ruled)

1. **Commit the v3 map sync + README note** (the done-already work above) as Track 2's
   opening commit.
2. **Build the atlas index** (per the ruling — default A): a navigable page linking the
   interactive HTMLs + the design/architecture markdown, each with a one-line purpose and
   audience tag. Anchor it on `map-site-files-suite.html`.
3. **Surface the architecture docs** (`docs/architecture/*`) from the atlas — they're
   currently reachable only via the raw file tree.
4. **Cross-link both ways:** `CLAUDE.md` "Workflow Docs" → the atlas; the atlas → `CLAUDE.md`,
   `WORKFLOW.md`, `GAPS.md`, `suite-state-audit.md`.
5. **Decide the map's maintenance contract:** repo is source of truth (convention:
   "suite changes land in the REPO first"). If the claude.ai artifact is kept for sharing,
   record that it is **published FROM** the repo file, never edited in place — so v2→v3 drift
   doesn't recur.
6. **(Depends on Track 1)** Once the Action Ledger design is roasted + matured, fold its
   deltas into the map (new feature-page sections: the **Action Ledger** lead, per-section
   **Pending** action tables, **Claimed coverage** claims→junit(C-id)/DRIFT accumulator).
   Deferred on purpose — mapping a design the roast may still change wastes the edit.
7. **Suite-doctor check:** the map/atlas are design-record files, not part of the docsite
   `SECTIONS` nor installed to `~/.claude`, so they don't touch the doctor's docsite-staleness
   / version-parity checks. Confirm CLEAN after any change that *does* reach templates or
   config.

---

## Open questions (resolve at ruling time)

- **Atlas home:** `docs/design/index.html`, `docs/index.html`, or `docs/atlas.html`? (Naming
  signals scope: `design/` = "design record index"; top-level = "whole-repo atlas".)
- **Is the atlas published anywhere** (GitHub Pages / the docsite output dir), or opened as
  a local file? Governs whether asset paths must be relative-portable.
- **Keep the claude.ai artifact** as the shareable copy, or retire it now that the repo holds
  v3? (If kept: repo-first, publish-from-repo — see item 5.)
- **Scope of "navigable":** just the design/architecture record, or also a rendered view of
  the skills catalog (which `gabe-help` already generates for the CLI)?

---

## Cross-track note: what belongs to Track 1 (not here)

- The **roast** of the Action Ledger design is still pending (perspective + target to be
  chosen). It gates the map's item 6 above.
- Generator + shell retrofit and the twins regen live in
  [`docs/handoff/2026-07-22-action-ledger/`](2026-07-22-action-ledger/README.md).

---

## Resume prompt (paste to pick up Track 2)

> Continue **Track 2 — repo documentation** (handoff:
> `docs/handoff/2026-07-22-repo-documentation.md`). The `site⟷files⟷suite` map is already
> synced to v3 in `docs/design/verification-first/map-site-files-suite.html` (uncommitted).
> Rule the core decision (atlas home + how interactive HTML is surfaced; recommendation is
> option A — a standalone maintainer atlas index separate from the user docsite), then work
> the ordered items: commit the v3 sync, build the atlas index anchored on the map, surface
> `docs/architecture/*`, and cross-link `CLAUDE.md` ⇄ atlas. Track 1 (Action Ledger roast +
> retrofit) is separate; the map's Action-Ledger deltas wait on that roast.
