# Where loop 1 stands

One page, rewritten (never appended) whenever the position moves. Read it before `method.md` (the method) and
`decisions.md` (every ruling, D-001 … D-065). Updated 2026-09-30 · D-038 … D-065 built, on `graft-adoption` — 38 commits ahead
of origin, **committed locally, not pushed** (his rule: "All this work can remain local for now. Just committed.").

## In plain words

Loop 1 is the API endpoint card. Its first half (inventory, questions, blocks, prisms, leftovers) is done and ruled. The
display half moved onto ONE page: `../workflow-panel/all-endpoints.html` — every gustify endpoint (frozen feed, gustify @
`05007957`), and for the endpoint you pick, three views of it plus BY MOMENT, the request laid out in time.

Since 2026-09-23 the page grew fast (D-038 … D-065), and generation work re-opened narrowly INSIDE the suite to make the page
truthful: the reach fix and its follow-ups (D-059, D-060), the center's dates counted when a page opens (D-061, D-062), under
two proof regimes (D-063). Nothing reached a twin: every build read a read-only copy (D-023 holds).

**Next:** he brings his feedback on `all-endpoints.html` as a HUMAN reader. Much that was clear to the model was not clear to
him. The work is twofold — fix what he flags, and name the PATTERNS behind each flag, so they can later be carried into the
Gabe Suite (checks, rules, references) and the next page avoids them. His words are quoted in the handoff and belong in
decisions.md as D-066 when the work starts.

## The all-endpoints page, top to bottom (for a cold reader)

Build: `cd docs/design/workflow-panel && python3 gen-all-endpoints.py --forms ~/.cache/gabe-map-baselines/lab-input/forms.json`
then `--check`. Probe: `node docs/design/workflow-panel/probe-all-endpoints.mjs` (≈3 min, browser — run it alone, under a
lock). Walk (his pictures, real clicks): `node docs/design/workflow-panel/walk-all-endpoints.mjs` → `shots/all-endpoints/`.

| section | what it shows | rulings |
|---|---|---|
| THE ENDPOINTS | one row per endpoint, the eleven blocks as column groups, his defaults; the picked row pinned on top | D-034, D-038, D-039 |
| ONE ENDPOINT | three columns: the Gabe Universe card · THE GAPS (two directions, a reason and a status per gap) · the code map (by the eleven blocks; endings in time order with their checks) | D-036, D-040 … D-044, D-052, D-053 |
| — switches | each panel: show all · dim · hide what BY MOMENT carries; "copy the settings" | D-054, D-055, D-058 |
| BY MOMENT | moments as columns (his default) × the blocks as rows; a path row of codes; cells as chips; the handler's moments named by function + except; journeys at the outer moments; a last "no moment" column of metadata | D-054 … D-057, D-061, D-062, D-064, D-065 |
| not placed | only what should have a moment but the feed cannot place, with the reason | D-064 |
| the copy text | every setting, then "your words:" — how he hands a configuration back | D-034, D-054 |

## Rules in force

| rule | where |
|---|---|
| No propagation to the twins; pages read the frozen feed; a twin is only ever read through a read-only copy | D-023 |
| Display is decided by seeing built options; generation comes first | D-025.1 |
| A choice made alone is an option with the agent's pick DASHED | D-025.2 |
| Facts are generated, never typed (numbers as `{tokens}` in the words files) | D-025.3 |
| A click path comes from a real-click walk | D-025.4 |
| A ruling goes into `decisions.md` in the same commit that acts on it | D-025.5 |
| Analysis, not diagnosis | D-025.6 |
| Design pages are checked lightly: true numbers in the generator, `--check`, the probe once, one walk | D-037 |
| Generation code: FULL proof for what the map says · LIGHTER for how it is shown | D-059, D-063 |
| Non-actionable text sits behind an ⓘ beside the section title | D-038 |
| Facts about the code are shown; how the map knows them is hidden | D-017 |
| Every element named wears the station's glyph and colour, its subcategory as a label at the end | D-052 |
| Hovers: very short on a control, richer on an element | D-009 |
| Regions: COMMAND concepts · MIDDLE specifics · PORTRAIT detail | D-008 |
| One stage spine for every endpoint; the moments are its inner grain | D-001, D-054 |
| The kinds of ending are fixed slots, drawn even when empty | D-012 |
| One kind at a time; the lab is the API endpoint kind only | D-029 |
| Artifacts start finished, and are centred | D-004, D-005 |

## Open for you — what to LOOK at

1. **The wider BY MOMENT table** (D-064): the "no moment" column pushes 30 of 80 endpoints into a sideways scroll at 1920 px
   (was 16). Keep it · a narrower column with details in hovers · a row under the table.
2. **Rules the agents added and you have not ruled** (D-064, all shown as fact): a call inside an `except` stands only on the
   paths that enter it · a path landing in the handler's `except` with no evidence of the source counts as leaving partway ·
   an except-body call on the way to a 500 is labelled so.
3. **Which line a handler shows**: the decorator line (`cooking.py:114`, as the code map shows) and "def at line 119" both
   stand today.
4. **Accepted without you** (D-062): a report that read "never" gets one NEW badge the first time it is counted.
5. **Older opens from 2026-09-23, still standing**: the lab's simpler section map and its By-stage switch (D-035) · "the four
   standpoints" (all nine blocks stand unless you meant four) · the lab's navigation picks · the all-endpoints page's own
   picks (D-034) · which face M3 starts from · the command layout and its two conflicts · the five click obstacles of
   2026-09-21 · the per-arm acceptance sheet (`../element-forms/goldens/acceptance.html`).

## Generation items open (suite code; each needs its regime, D-063)

Router tags (`APIRouter(tags=…)`) are in no feed · a call inside another call's arguments is recorded after the call it runs
before (`concurrent_cook_cap_for_tier` in `start_session(...)`) · relief-accept's error paths list every step of the
handler · the web/e2e journeys need the tests arm to read the Playwright reports · a re-export two hops deep is not followed ·
the universe card's Source shows the file's length, not the handler line · gustify's baseline waits for its twin to settle
(it moved to `fd4573f8`); gastify's is another session's.

## Next, in order

1. **His human-reader feedback on all-endpoints.html** — each item fixed AND logged with the pattern behind it (the handoff
   of 2026-09-30 carries the method); record his ask as D-066.
2. **M3**: the channel budget for the first prism.
3. **The gallery**: 3–5 variants of the card at true size, one fader each, judged by seeing. Then the tests, and promote.

Later: carry the legibility patterns into the Gabe Suite (his ask; iterate-before-implement — a draft he approves with "land
it") · the twins' code-vs-map COVERAGE AUDIT (D-059) — running in a parallel session, its files under
`coverage/` are that session's · piece 9 (D-016) · 12b, the second round of in-flight detectors (D-019) · the robot for every
kind (`workflow-panel/robot-brief.md`) · the "more information" toggle (D-017) · pages for the blocks with none yet (D-022) ·
the parked WORLD region (D-031) · `pieces-digest.json` is stale against the cache.
