# Section-template lab — 2026-07-20

The per-SECTION analogue of the 2026-07-14 layout lab. That lab ruled the page shell
(A3 · Tabbed, now binding via adopt-spec + `templates/center/shell/`); this one explores the
INTERNALS — one exploration per row of the connection map's left column ("THE CENTER · PAGES ·
SECTIONS"), 2–3 candidate layouts each, rendered over gastify example data on the a3 skin.

**Front door:** `index.html` — the registry mapping (map section ⟷ section id ⟷ home template +
slot ⟷ also-appears-on ⟷ machine sources) plus the identity scheme. Group pages (`now` · `board` ·
`entities` · `docs` · `testing` · `ledger` · `releases`) hold the direction renders; recommended
direction always listed first with a green pill.

**Navigation + palette:** every mapping-table row links to its section's directions; every "home
template" cell links BOTH to the raw shipped skeleton (`templates/center/shell/`) and to the
filled shell-preview page — all relative paths, navigable over `file://`. Group colors
(`--h-now` #0d7a84 · `--h-board` #1f6feb · `--h-ent` #0a7d6b · `--h-docs` #8e4585 · `--h-test`
#3f6d4c · `--h-ledger` #9a5a00 · `--h-rel` #7a5a8a · `--h-leaf` #8494a4) and command-chip colors
(`--c-plan`, `--c-red`, `--c-commit`, …) are verbatim from the landed-map artifact's CSS vars;
each section carries "written by" chips derived from the map's edge data — solid = writes,
dashed = verifies (guard), dotted = reads.

## The identity scheme (the point of this lab)

A section is not a page — it is a unit of meaning that may render on several pages
(`testing.matrix` renders full on Tests and entity-scoped on every feature page;
`docs.feature-cards` is an index on Docs and a single card on a feature's Overview tab).
Therefore:

- each map section gets a stable id (`now.needs-you`, `board.rail`, `testing.matrix`, …);
- each becomes ONE fragment template — `templates/center/shell/sections/<id>.html` — with its own
  placeholder contract;
- every rendered instance carries `data-sec="<id>"` on its wrapper, so sections are identifiable
  wherever they appear;
- page skeletons keep their slots; slot comments name the fragment(s) that fill them; generators
  compose pages FROM fragments. A section rendered from scratch instead of its fragment is a
  defect (extends the adopt-spec page rule down one level).

`leaf.reports` is deliberately template-less: external tools' own HTML, linked, never re-skinned.
Auxiliary slots (`{{BUCKETS}}`, `{{GATES}}`, `{{VERIFICATION_CHANGELOG}}`, KPI strips) inherit
their parent section's direction — no separate exploration.

## Status

Directions rendered, awaiting operator picks (one per section). On picks: fragments land in
`templates/center/shell/sections/`, page skeletons gain `data-sec` markers + fragment pointers,
shell README's contract table grows a sections column, `./install.sh` + doctor. Nothing is
binding until picked — this dir is exploration, like the layout lab before its convergence.

Regenerator: session scratchpad `gen-section-lab.py` (illustrative fill; not promoted — the lab
is a decision record, not a build tool).
