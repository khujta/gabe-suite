# How we design the panels — the working method (adopted 2026-09-18)

> **Start at [STATE.md](STATE.md)** — where the loop stands, what is open, what is next. This file is the METHOD only; the
> rulings are in [decisions.md](decisions.md). Neither is restated here.

Source: `design-context-agent-guide.md` (Gabe's research handoff, same folder). That guide is recommendations; THIS file is
the working agreement built from it, and it changes when Gabe says so. One word differs from the guide: a **prism** is a
point of view, the standpoint an element is read from (D-011), not the guide's colour lens over the universe.

## The loop, and where each step lives in this repo

| step (guide §8) | what it is | where it lives |
|---|---|---|
| 1 INVENTORY | every attribute of an entity type: data type · cardinality · importance · volatility · own/relation | `inventory-<kind>.md` |
| 2 QUESTIONS | 10–20 real questions Gabe asks the graph, tagged locate · trace · compare · audit · summarize | `questions.md` |
| 3 FADERS | the five families: data · task · encoding · space · state | the lab rail (`workflow-panel/endpoint-lab.html`) — every pick is a fader; the copy line is the preset |
| 4 MATRICES | M1 attribute × question · M2 attribute × zoom · M3 attribute × channel (the channel budget) · M4 cardinality × zone | generated pages `matrices-*.html` |
| 5 PRISMS | a named recipe: questions · promotes · channels · dims · alert rule · entry | `prisms.md` + `prisms-endpoint.json` |
| 6 VARIANTS | 3–5 at once, ONE fader moved each, labelled, real data incl. the densest entity | a gallery page beside the lab |
| 7 TEST · LOG · PROMOTE | squint · grayscale · worst-case · 5-second · timed questions → `decisions.md` → slot maps + tokens | probe + dev toggles + `decisions.md` |

## How importance is decided — one ordered procedure per element kind

Each step names the artifact that did it for the API endpoint, so the next kind copies a working shape.

0. **Sort the files first** (a triage of files, not of attributes). For every file ask, in this order: does a script read it?
   → INPUT, never reworded without its readers. Does it hold a ruling of his found nowhere else? → lift the ruling into
   `decisions.md` first. Is it the position page? → `STATE.md`, rewritten, never appended. Otherwise → RECORD.
1. **Inventory.** List every attribute the feed can carry for the kind, with its type, measured cardinality, volatility,
   own/relation, and the zoom level it first appears at. Rows come from the kind's form slots (`_a3_forms.py` `KINDS`) plus
   the unbuilt slots of his scorecard U1–U14 (D-033; full list in `logic-map/element-forms.html`). → `inventory-endpoint.md`.
2. **Rate 1–3** on his scale (D-020): 3 = can change the path, the data, the context or the flow · 2 = gives context to
   something rated 3 · 1 = mentioned, never drilled. The agent proposes with a reason per row; he rules on a GENERATED sheet
   with a copy button. A row stays "proposed" until ruled. → `gen-rate-sheet.js` → `rate-endpoint.html` (D-013, D-020).
3. **Questions.** 10–20 questions in his words, each tagged locate · trace · compare · audit · summarize. Frozen once a
   ruling rests on them. → `questions.md`.
4. **M1 — need.** Three agent raters from three seats plus a judge on hard splits fill attribute × question; an attribute's
   NEED is the number of questions that use it. Blocks = the cut at the widest gap; an attribute three or more blocks need is
   SHARED. He keeps, merges or drops blocks on a generated page. → `m1-merge.js` → `m1-endpoint.json` · `m1-cluster.js` ·
   `m1-homes.js` → `matrices-*.html` (D-014, D-015, D-021).
5. **M2 — disclosure.** The zoom level each attribute starts at, by rule from rating × need; the face = rating 3 with the
   highest need, within the face budget. The rule has ONE home, the header of `gen-matrices.js`; the budget is
   `prisms-endpoint.json` `faceBudget`.
6. **Prisms.** Each surviving block is a point of view with a standpoint sentence in his words; then each block is paired with
   a page, "no page yet", or a running header. → `prisms.md`, `prisms-endpoint.json` (D-011, D-015) ·
   `workflow-panel/section-map.words.json` (D-022).
7. **Leftovers.** What M1 could not place goes through cost × importance into pieces of work, read as analysis, not
   diagnosis. → `gen-gaps.js` → `gaps-endpoint.html` (D-016).
8. **M3 — channels**, then 9. **the gallery**, then 10. **test and promote** — not yet run for any kind.

**Tie-break** when two things compete for one slot: his rating › M1 need › the fixed slots of D-012 (drawn even when empty) ›
the agent's pick (always marked).

**What the procedure still lacks.** (a) M3 (attribute × channel) and M4 (cardinality × zone) have no generator. (b) Nothing
ranks ACROSS endpoints — "Standard or specialist" has no instrument; the all-endpoints page (D-024) supplies the distribution
a rating is checked against (a 3 that is empty on most endpoints is a finding about the rating). (c) Record pages have no
freeze guard except `gen-review.js`'s `review-leftovers.ruled.json` (both now in `records/review/`); `gen-gaps.js`, `gen-rate-sheet.js` and round 1 of
`gen-matrices.js` need the same.

## The rules the agent works under (guide §11, adopted; 10–13 added from D-025, 14 from D-081)

Rules 10–13 come from his rulings, but parts of them are the agent's reading, and D-025 marks each: the same-commit clause
of 10, the real-click method in 11, and "before he is asked to rule" in 13.

1. **Ask first:** which question or prism does this change serve? No answer → it is not built.
2. **One fader per variant**, 3–5 variants side by side, each labelled with the fader it moved.
3. **Real data, ugliest included:** the densest endpoint (GET /recipes, 22 paths) and the widest table ride every gallery.
4. **Four on the face** (P3): a glyph or card face shows ≤ 4–5 attributes; the rest is hover, nested and pinnable.
5. **One channel, one meaning, per view** (P4 · M3): a hue or shape is added only after the channel budget says it is free.
6. **Quiet resting state** (P2): colour is an alarm; alert tokens are separate and never reused for categories; a 4xx
   ending is not a warning — the alarm is the anomaly (a write with no 401, a body with no 422, an ending with no test).
7. **Same slot, every card** (P6): slot maps per entity type live in ONE source-of-truth file.
8. **Tests before promotion:** squint · grayscale · worst-case data measured by the probe; 5-second and timed questions
   run by Gabe on a harness page; the result goes to `decisions.md` with "revisit if".
9. **Explain to Gabe in gabe-lens form** (problem → analogy → map → constraint box → handle); hovers in plain mode.
10. **A ruling is written into `decisions.md` in the same commit that acts on it** — never only into memory, a brief or a
    commit body (D-025.5).
11. **Every ruling round is a generated decision page** — options, the agent's picks marked, real-click pictures, one copy
    button — never a text plan (D-025.8); a click path in it comes from a real-click walk (D-025.4).
12. **Explanations are Gabe Artifact pictures, one part per page**, built from the kit and pattern libraries; the dense page
    stays a record (D-025.7).
13. **Two navigation systems get a page of their own** explaining how they relate, before he is asked to rule (D-025.9).
14. **A bench before a dense view** — one element per column, its parts and its controls, before a view of many
    (D-081, from the legibility patterns: P9). The same step stands in the suite at `skills/gabe-mockup/references/spike.md` S5a.

## The guide's unknowns — answered from the codebase (2026-09-18)

| unknown (guide §12) | answer | source |
|---|---|---|
| what `widening` means | how far the endpoint reaches outward: the hook that fetches it → screen → route → router → app, plus the workflow steps around it | `_lab-ep-panels.js` renderWidening · `LABEP.widening` |
| renderer stack | `ForceGraph3D` (3d-force-graph over three.js), one instanced render path | `templates/center/shell/gabe-universe.html` |
| do column icons map to the card's rows | NO — one mark per column of the table; they summarise the whole table, not the block's rows | `dataBlockNode` field marks |
| the 4 rows of a table block | title lines: icon + name · entity · count + RW chip · model — then the field-marks row | the operator's default line (D-027) |
| columns per table | min 3 · median 8 · max 10 listed (the feed lists up to 10 and counts the rest as `cols_more` — a cap to verify) | example feed `c4-graph.js`, 57 models |
| node count | 312 L2 nodes (123 schemas · 81 endpoints · 57 models · 33 screens…) + 1,078 frontend pieces on gustify; ~3.9k on onyx | same feed |
| densest entity for worst-case tests | GET /recipes — 22 paths; widest tables UserExplorationPreferences · TaxonomyValue · ShoppingItem (10 listed) | arms-on forms feed |
| a mock of the left-rail proposal | none in this repo | — |

By the guide's own §7 table, icons that summarise the whole table make the footer strip "fine"; the left rail wins only if
the self-test says so. That test is not run yet.
