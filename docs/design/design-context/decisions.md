# Decision log — panels and graph (template: design-context-agent-guide.md §10)

Entries D-001…D-006 are BACKFILLED from 2026-09-17: they were ruled by seeing, with no test run. They stand until a test
says otherwise; "Tests run: none" is the honest record, not a gap to hide.

## D-001 — The endpoint's stages are the standard spine
Date: 2026-09-17 · Fader moved: space (the axis every topic shares) · Variants compared: the six part panels alone vs the same on EDGE · GATE · INPUT · HANDLER · EFFECTS · ANSWER (+ the 500 bay, the client screen)
Tests run: none (ruled by seeing the robot and the WHEN picture) · Result: adopted
Decision + reason: every endpoint in every app gets the same eight-row spine; doors compare, a gap is a silhouette. Record: `workflow-panel/endpoint-stages.md`.
Revisit if: a second door (GET /recipes, 22 paths) does not read on the spine, or a timed question is slower than on the old panels.

## D-002 — The Blocks card is the table's face in every layout
Date: 2026-09-17 · Fader moved: none (a constant, P6) · Variants compared: stage grid (WHEN) vs the Blocks card grouped by stage
Tests run: none · Result: adopted — the stage only groups the block (rows or columns)
Decision + reason: the block was tuned over a week and reads well; positional constancy across layouts.
Revisit if: the glyph-face count fails P3 (the face shows ~7 attributes today) or the 5-second test recalls fewer than 4.
Backfill 2026-09-23 (the one line of `console-rules.md`, 2026-09-18, not already below; that file is now `records/console-rules.md`): function cards are "usable now, to be revisited — possibly another layout, possibly an attribute every function block must surface."

## D-003 — The rail is grouped by the region a control changes, and every control is tagged
Date: 2026-09-17 · Fader moved: none on the console (lab chrome) · Tests run: probe only · Result: adopted
Revisit if: a control's region tag is wrong in use.

## D-004 — An animation opens on its finished frame; Replay runs it
Date: 2026-09-17 · Fader moved: state (transitions) · Tests run: motion gate · Result: adopted — agrees with P10 (never require watching an animation to read a static value)
Revisit if: never expected.

## D-005 — Page content is centred on the operator's wide screen
Date: 2026-09-17 · Fader moved: space · Tests run: none · Result: adopted for local pages and artifacts; the artifact kit's H1 still says left
Revisit if: the kit flip is landed.

## D-006 — The command card navigates topic and label (seven groups, ≤ 3 levels, the cancel corner everywhere)
Date: 2026-09-17 · Fader moved: several at once (grouping · depth · what a cell opens) — the pattern this log exists to stop
Tests run: probe only · Result: adopted as the default, not tested against the part buttons for speed
Revisit if: timed questions show the part buttons are faster for "open topic X".

## D-007 — Data's default is the Blocks card grouped by stage (rows), with columns as the compared option
Date: 2026-09-17, committed 2026-09-18 · Fader moved: space (grouping by stage) — plus two more in the same build (placement · empty stages), which the method now forbids in one variant
Variants compared: stage grid (WHEN) · stage blocks in rows · stage blocks in columns — seen one at a time in the lab, not side by side
Tests run: probe only (1,013 structure asserts: the block is proven identical to the Blocks block table for table); none of the five design tests
Result: adopted as the Data default by the operator's words ("we keep the blocks … group them in rows or in columns")
Decision + reason: positional constancy (P6) — the table's face never changes; the stage is only a group. The stage header states the expectation (P12: one tooltip per concept), not a diagnosis.
Revisit if: GET /recipes (22 paths) does not fit the bands; the squint test cannot tell the six bands apart; rows vs columns has never been timed on Q1/Q2 — run that before calling either the winner.

---

# Gabe's corrections to D-001 … D-007 (2026-09-18) — his words, condensed; the full rules lived in `console-rules.md` (now `records/console-rules.md` — its three lines not carried here are backfilled under D-002 and D-008) and live in `prisms.md`

- **D-001 stands, scoped.** The spine is the structure for API endpoints in general — the result of working a lot on the endpoint itself. Whether it translates to the other element kinds is open: start with it, then look at the principal kinds. Priorities (tier 1 in the graph): backend endpoints · functions · schemas · models; frontend views · components · stores · hooks.
- **D-002 is downgraded from a law to a default.** "The block card is the table's face in every layout" was an assumption made while settling things; probably not the case. The blocks for tables/models and for schemas are right ("we nailed them"); function cards are to be revisited; tests have no card at all, only labels — wanted; other block kinds may come.
- **D-003 was read as the MIDDLE section, and that reading is the ruling that matters** (the lab's controls rail stays grouped by region — lab chrome). See D-008.
- **D-004 is scoped to ARTIFACTS** (start finished + a repeat button; the gabe-artifact skill may change for it). Panels follow the guide's animation directions (P10). The 3D graph's animations are a separate topic, at the end.
- **D-005 is scoped to ARTIFACTS.** Exploration pages use the endpoint lab's layout — configuration on the left, the page on the right.
- **D-006 stands with a constraint:** the command card holds topics and points of view, **nothing with actual codes**. See D-008 and D-009.
- **D-007 stands** as the default for API endpoints: on entering an endpoint, what we rationalise first are its stages / facets / general attributes, and grouping by position gives that structure quickly.

## D-008 — What each console region may hold
Date: 2026-09-18 · Fader moved: none — a rule of the space family
Decision: COMMAND = concepts and points of view only (topics · prisms · kinds of ending), never a code or a value · MIDDLE = the ground of operations, everything available under the point of view, specifics and the filter by code live here, drill-down in several ways (data · functions · cases · paths — behaviour, not only reach) · PORTRAIT = the detail of the one thing clicked.
Reason: the command helps you know what is available to explore and move through it swiftly; specifics would crowd it.
Known conflict: the built PATHS ▸ level lists fourteen endings by status code — to be reworked into kinds in the loop.
Revisit if: a kind-only command makes "open the 409" slower than today (timed on Q2/Q6).
Backfill 2026-09-23 (the two lines of `console-rules.md`, 2026-09-18, this entry did not carry; that file is now `records/console-rules.md`): the PORTRAIT never holds navigation. And, marked there "a possibility, not a decision": the command panel gets a section of the possible paths as KINDS of response, and the middle shows everything with the filter by code.

## D-009 — Hovers have three depths
Date: 2026-09-18 · Decision: headers · the command panel · little buttons · settings → very short, one brief explanation (+ ONE example of application if complex, nothing more) · elements with more to show (tables · models · function blocks) → a detail hover with more context, less than the portrait · click → the portrait.
Known conflict: command cells, headers and rail controls open multi-row cards today — to be shortened.
Revisit if: a short hover leaves a control unusable without the docs.

## D-010 — Loop 1 runs on the endpoint card as a whole; importance is proposed by the agent and corrected by Gabe
Date: 2026-09-18 · Inventory: `inventory-endpoint.md` (ratings 3 · 2 · 1 with a reason each, cardinalities measured over 80 doors).
Revisit if: Gabe's corrections move more than a third of the ratings — then the rating rule itself is wrong, not the rows.

## D-011 — "Prism" means a point of view
Date: 2026-09-18 · Decision: in the design context, a prism is a standpoint from which an element is read (data effects · in-flight state · decision points · structures · functions by how crucial they are · coverage · context · reach outward — candidates in `prisms.md`). The depth rule: detail where something can change the path, the data, the context or the flow; the rest is mentioned, never drilled.
Note: the suite's authored "prism pages" (gabe-imagine) share the word and are a different thing.

## D-012 — The kinds of ending are fixed slots, drawn even when empty
Date: 2026-09-18 · Fader moved: Space (fixed slot vs flowing) · State (resting)
Decision: success · refusal · framework · validation · uncaught are FIVE constant slots on an endpoint, always drawn in the same order; a kind with no ending is drawn hollow (the zero state), never removed; an empty kind that should not be empty raises an alert (a write endpoint with no refusal · a body with no validation). The same idea is expected on other element kinds, with their own constants.
Reason (Gabe, on the rating sheet): "These families might be constants here in the API endpoint and later in other elements, so we will still show them even if they are empty. They might surface some kind of flag or warning." It is P6 (positional constancy) and the element-forms idea that an empty slot is a finding.
Tests run: none. Revisit if: a kind is empty on every endpoint of an app, so its slot is only noise there.

## D-013 — The endpoint inventory's ratings are ruled; request-scoped state sits at 1 by Gabe's own rule
Date: 2026-09-18 · Input: the RATINGS text pasted from `rate-endpoint.html` (inventory 05cdd08f): 3 changed · 39 confirmed · 1 untouched.
Decision: the ratings in `inventory-endpoint.md` are the record — file:line 1 · signature 2 (the async mark) · deciding branches 3 with an alert · own guards 3 left as proposed. Request-scoped state moves 2 → 1: he confirmed 2 but wrote "maybe a 1 since it's just information… if there is some important information that we can have by having this as a 2 (so we can filter something that is important), we might keep it as a 2", and today nothing can be filtered by it — the three instances the feed knows (auth context · idempotency key · database session) already ride on rows rated 2 or 3, and no generation arm reads request-scoped state in general.
Also: four rows were ADDED after his pass, marked (proposed) — events published · tasks dispatched · outside services called · delivery (a stream) — because his note on `signature` described "other code subscribed to the action", which exists in the feed and was missing from the inventory. They wait for his rating.
Revisit if: a generation arm reads request.state / context variables in general and finds state that no other row carries — then request-scoped state is worth a 2 again.
**FIRED 2026-09-22, and the answer is NO on this app** — the general arm is built (Slice 12, `320a7b4`). On gustify it finds ONE request-scoped name, `idempotency_key`, which the repeat row already carries; there is no context variable at all. So request-scoped state stays a **1** here by his own rule, and the general reading it waited for is the row below it (in-flight values, 706 rows over the 80 endpoints) — which is worth its 2 for what NO other row carried: the 468 process-scoped things every request shares (a setting read once at start, a counter built once) and the lifetime of each. On the other study apps the answer would differ — gastify has 96 context variables and tier3 1,977 — so the rule is re-read per app, never settled once.

## D-014 — How M1 is measured: three agent raters, a judge on hard splits, and a cut at the widest gap
Date: 2026-09-18 · Fader moved: none — this is the method's own instrument, logged so its weak points stay visible
Decision: M1 (attribute × question) is filled by THREE AGENT raters, each from a different seat (operator at the console · data engineer · minimalist), merged by the median; a 0 against a 2 is a hard split and only there a fourth agent rules as judge. The questions are grouped by average-linkage on idf-weighted cosine similarity, and the CUT falls at the widest drop between two consecutive joins — no hand-picked threshold. An attribute's home is the block where its total use is highest; an attribute needed in three or more blocks sits in the shared band on top. M2 (attribute × zoom) is a stated rule in `gen-matrices.js`, never a judgement.
Reason: the first cut used a similarity threshold of 0.42, which landed INSIDE a band of three near-equal joins (0.44 · 0.43 · 0.41) and merged tests into the endings and security into the route; the page then told Gabe "tests form no view of their own". A review caught it. The joins run 0.79 … 0.565, then drop to 0.44: the widest gap, and the cut it gives keeps all six lab parts as blocks. The three joins just past it are shown to him as merge candidates, which is what his Merge verdict is for.
Tests run: probe-matrices 76 asserts (the cut is asserted to be the ladder's widest drop; a claim on a card must be checkable on that card); a four-lens review + verifier, 47 findings, 31 confirmed and fixed. Not run: any test with Gabe — the blocks are a proposal until he rules.
Known weak points, said on the page: the raters are agents, not people · three blocks hold a single question · 202 of 301 marked cells had the raters one step apart.
Revisit if: Gabe corrects the question list (the blocks are made of his questions, so they move with it) · his verdicts merge or drop more than a third of the blocks (then the questions, not the clustering, are the thing to fix) · a second rating run on the same input moves a block.
**Correction, 2026-09-22 (a count only; the ruled text above stands):** FOUR blocks hold a single question, not three — Proof (Q4) · Client (Q8) · Standard or specialist (Q12) · In-flight state (Q16), as `prisms-endpoint.json` `blocks` and `prisms.md` record.

## D-015 — The API endpoint has eleven prisms; all kept, none merged
Date: 2026-09-19 · Input: the RULING text pasted from `matrices-endpoint.html` (m1 95121cec) — eleven `keep`, no note.
Decision: Endings · Data effects · Overview and risk · Gates and decisions · Standard or specialist · Functions · Stages and order · In-flight state · Structures · Proof · Client are the points of view of the API endpoint (table in `prisms.md`). The three merge candidates past the cut stay apart.
Consequence: the command panel's topic level grows from the lab's six parts to eleven concepts — over the "about seven" a menu holds comfortably, and D-006/D-008 cap nesting at three levels. How the eleven are grouped or paged in the command panel is a display question for the variants step, decided by seeing; it is NOT decided here.
Also asked the same day, answered in `gaps-endpoint` (the evaluation page): whether response shape per ending and context-giving functions should leave their rating of 2 (recommendation: keep both at 2 — raising the first moves nothing, raising the second spends a face slot on a value that is the same on 78 of 80 endpoints, lowering either hides it from the 4–5 questions that need it).
Tests run: none with Gabe beyond the ruling itself. Revisit if: the variants step shows eleven entries cannot be navigated in the command panel within three levels · the question list changes (the blocks are made of it).

## D-016 — What M1 left over: ten pieces of work are "do", one is "later"; two attributes dropped, three demoted, four kept
Date: 2026-09-19 · Input: the RULING text pasted from `gaps-endpoint.html` (eval c2f7f9c5), every line his.
Decision: DO 1 The route, in order · 2 What an empty slot means · 3 What each ending carries · 4 Whose write it is · 5 Proof you can open · 6 Inside the calls · 7 How common each piece is · 8 Field rules, and a line to open · 10 What the screen does on each ending · 11 What stays alive during the request (the agent had said "later" on 8, 10 and 11). LATER: 9 Why a touch happens, and why it survives. Attributes: KEEP provisions · race on a unique key · cases · signature (the agent had said demote: the async mark separates nothing in this app); DEMOTE entity · cluster · rate limit · journeys; DROP steps in the longest chain · usage · fan-in.
Consequence: the living inventory changes (61 rows, 20 of them proposed) while M1 round 1 stays a record (`m1-round1.inventory.md`); the order and the definition of done are in `program-leftovers.md`. A piece lands FACTS and corrections with components the lab already has; how the card finally shows them is decided later, by the loop (M3 → variants → tests), by seeing.
Trigger for piece 9 (a "later" needs one): when pieces 1 and 6 have landed — they give a table touch the numbered step and the opened call its condition attaches to — or sooner if Q1 · Q2 · Q19 come up again.
Revisit if: a piece turns out to cost more than its estimate by a whole tier (hours → a day → days) — then it is re-priced on the page before it is built.

## D-017 — What happens in the code is shown; how the map knows it sits behind "more information"
Date: 2026-09-20 · Input: Gabe, reading the review page — "Things that are related to how we found the information, like reasons that are more related to our framework than the actual code, should be hidden and not always shown … they don't offer information about what is happening, actually, in the table, but about how we actually mapped that in our codebase map. Any kind of decision of this nature should be hidden. We will get it behind some information options or a plus information option that we can toggle later."
Decision: a fact has one of two natures. **About the code** — what a table, a function, an ending or a route IS and DOES — is shown. **About the map** — how we found it, which reading found it, whether a zero was measured or never read, a place that is a guess, a roster, a word of our own framework — is nice to have and NOT critical: hidden by default, to live behind one "more information" option that is toggled.
Consequence: (1) the lab — the table record goes back to four rows; the fifth row `found by` (leftovers piece 4) is hidden behind a switch that is off (`window.MOREINFO`), the fact stays generated. Hover cards are not "always shown", so facts of this nature that ride a hover stay where they are. (2) decision pages — a decision of this nature is not put in front of him: it is left to Claude's pick, folded away, and listed as such in the pasted text. (3) the same rule cuts reading: on the review page the 30 norm lines that are drawn nowhere yet fold away too, and a card shows its decision, its why, and what each option sets in motion, with the rest behind "more".
Trigger for the toggle (a "later" needs one): when the display step starts (M3 → the variants gallery), where it is built as one rail option and decided by seeing — or sooner, the first time a fact about the map is needed to trust a number on a card.
Revisit if: a fact about the map changes what he would DO — a list he cannot trust, a count that is a floor. Then that one fact is promoted, as an alert, never the whole class.

## D-018 — The review of the leftovers program: his rulings on what I wrote, piece 10 lands, piece 11 follows it
Date: 2026-09-20 · Input: the REVIEW text pasted from `review-leftovers.html` (now `records/review/`; review 7aa8b87d · POST /setup/complete @ 05007957 · 47 his · 10 left as my pick).
Decision, his: **the 36 norm lines** — 34 ok; `tables · GATE` and `security · EDGE` reword, with no note, so I propose the words and show them before they land. **vocab: sweep** — door and lock leave every drawn string the lab owns, and the probe asserts that quote them; the two sentences lifted from the suite's legend stay (a separate suite change, not ruled). **thresholds: 9 in 10 · 1 in 10** stay. **roles: any raise counts.** **through-route: the most checks, and none named when two tie.** **test roles: the words are right.** **piece 10: land it.** **piece 11: after piece 10.** Opened from the folded section and ruled: the slot sentences are right · mark a helper's guessed place · "after the handler" stays. Already his by D-017: `found by` sits behind "more information".
Left to my pick by D-017 (choices inside the framework), so they stand as I picked: a `useNavigate` roster — yes · the word for "the caller decides" — `beyond one level`, not the design's `returned` · `toast` as a library idiom — yes · `useTranslation` with no app using it — no · piece 11's part keeps the name `inflight`.
The five layout cards came pasted as "my pick, not ruled" — never an approval — and were then ruled by his follow-up in the chat, "go with the recommendation": the three new rows on the function record stay · what sits inside a call becomes a RAIL OPTION with three states (always open · closed until clicked · closed; open by default until he has seen all three) · the two rows and the section on an ending's record stay · field and column rules stay on hover cards · this endpoint's place stays on the whole-app card. One correction attached to the place card is a defect, not a choice, and is fixed: the counts took the app's startup as an endpoint (81, the app has 80).
Consequence: the lab changes land first (the sweep · the tie rule · the guess mark, on hover cards only by D-017 · the count), then piece 10's generation part by its plan (`docs/design/element-forms/plans/slice-11e-does.plan.md`), spec block first, with the four picks above written into it.
Revisit if: the first dry run of piece 10 shows `no-rows` or `beyond one level` on most places the client reads a failure — the plan's own BREAKS IF — then it is re-priced on a page before more is built.

## D-019 — Piece 10 seen in the lab; the two rewordings, the push, the order after piece 11, and piece 11's three rulings — "land it"
Date: 2026-09-21 · Input: his reply in the chat, after he followed the real-click walk and saw piece 10's row ("rewordings: ok · push the suite: yes · piece 9: after 11 · rating pass: after 11 · R1: U15 · R2: carrier · R3: in · land it").
Decision, his: **the two norm lines he had ruled "reword" take my words** — `tables · GATE`: "the rows the login check reads or creates to know who is calling" · `security · EDGE`: "the app-wide checks — the rate limit and the origin rules; a repeat key where the app reads one". **Push the suite: yes** — done the same hour, `graft-adoption` at `ee59102` on both remotes; the twins' push and PR stay his. **Piece 9 after piece 11** — its "later" trigger fired (pieces 1 and 6 landed); it opens with its own plan once piece 11 is in the lab. **The rating pass after piece 11** — so every row has its real example and he rates once. **Piece 11, the three rulings:** R1 the slot is **U15** · R2 `dies` describes the **carrier** (the slot that holds the value, not the object behind it; a server-wide object handed in is caught in two shapes and says so) · R3 values handed in by a dependency are rows — **in** (behind `OPTIONS.inflight_dep_values`, the first thing cut if the scope must shrink). **"Land it."**
Left to my pick by D-017 (choices inside the framework), as the spec states them: the part runs in its own stage · rows carry no id · the second round of detectors (12b) is deferred until the dry run shows gastify's `user_id` read unfound or tier3's unknown rows outnumbering its proven ones.
Consequence: `amendment-1.md` Slice 12 goes from PROPOSED to AUTHORIZED and lands in the spec's order — the carrier lift first, proven byte-identical on gustify before any new code; a review of the real feeds before the commit; the lab feed built at the lab's own head; a real-click walk before any click path is handed to him.
Revisit if: he reads "with the answer" on a row whose object outlives the request and finds it misleading (R2 then says `unknown` there — one roster line), or the dry run shows the dependency-value rows drowning the other seven kinds (R3 is then cut by its option).

## D-020 — The rating pass is closed: the twenty rows added after his first pass are ruled, one demoted by his own earlier rule
Date: 2026-09-22 · Input: his reply in the chat, after the suite was pushed ("push and on The rating pass. proceed with your proposed ratings").
Decision, his: **the pass is closed and the judgment is the agent's.** He had ruled (D-019) that the rating pass waits until piece 11 lands, so that every row would carry a real example generated from the feed rather than a promise; with all ten pieces of work done he handed the call over rather than rating the twenty by hand.
What the agent did with it, rather than rubber-stamping: read each of the twenty back against HIS scale (3 = a thing that can change the path, the data, the context or the flow · 2 = a thing that gives context to something rated 3 · 1 = a thing that gets mentioned and never drilled into) and against the evidence the ten pieces had since measured. **Nineteen stood. One moved:** *how this table was found* 2 → **1**, by his own D-017 — it says how the MAP knows a table is touched, not what happens to the table, and he had already ruled that kind of fact "nice to have but not critical" and put it behind a plus-information option; the lab gates its row that way today. The rows the measurement most strongly confirmed: *the predicate per decision point* (3 — 59 failures inside calls, 26 answered here, 7 nothing catches, 21 deeper than the reading follows), *what the case asserts* (3 — of 324 calls that test an endpoint, 302 assert only the status, so "tested" without it is not a fact), *why this slot is empty* (3 — it is what makes every other empty row believable), and *in-flight values* (2 — the request-scoped half adds nothing another row lacks, exactly as D-013 predicted, while the 468 process-scoped things every request shares were carried by nothing else).
Consequence: the endpoint card's inventory is fully ruled — 26 rows at 3, 25 at 2, 9 at 1 over 60 attributes — and nothing on it is a proposal. The rating sheet stops being a form and becomes a record. Loop 1 moves to its display half: M1 round 2 re-cuts the blocks against the ruled inventory, then M3, then the variants, decided by SEEING built options.
Revisit if: a built variant shows a row rated 2 doing the work of a 3 on the face (or the reverse) — then that row is re-rated from what he sees, which is the loop's own method, not from the table.

## D-021 — The card stays ELEVEN blocks; the brain map groups by stage AND by section, toggleable
Date: 2026-09-22 · Input: his reply in the chat, after M1 round 2 re-cut the matrix to eight ("11 blocks" · "both, toggleable").
Decision, his: **the eleven blocks stand.** M1 round 2 scored the 18 attributes added since round 1 and the parameter-free cut
fell at eight: Proof folded into Endings, and Stages and order + Gates and decisions + Standard or specialist merged into one.
The merge survived four attempts to prove it an artifact. He keeps his eleven. **The round-2 CELLS stand as data** — every
attribute's home and the shared spine are read from them; only the CUT is his, not the arithmetic's.
**The brain map's grouping rail offers BOTH his six stages and the inventory's seven sections, toggleable.**
Consequence: the matrices page must say plainly that it draws a cut the arithmetic did not choose — the ladder's own cut was
eight, his ruling holds eleven — and show both, so the choice stays visible rather than silently overwritten. The brain map and
the lab's section map already read the eleven with round-2 homes, so they need no change. A stage grouping needs a block→stage
mapping that nothing in the data supplies; it is AUTHORED as a proposal, and a block that spans stages sits under its own
"across the stages" branch rather than being forced onto one.
Revisit if: a built variant shows a merged pair (Proof beside Endings, or Stages beside Gates) reading as one subject on the
face — then the arithmetic's eight gets a second look, judged by seeing.

## D-022 — Where each block lives in the lab, and what a click does
Date: 2026-09-22 · Input: his reply after both were explained with options ("agree with your recommendations").
Decision, his — **the block-to-surface pairings**, on the principle that a block has a page, has no page yet, or is a running
header across every page: **Endings keeps** the command panel (picking an ending redraws every part) · **In-flight state has
NO PAGE YET** — the portrait's path record carries it only once a route is picked, which is a workaround, not a home ·
**Standard or specialist has NO PAGE YET** — it compares endpoints, and no part does that · **Stages and order is a RUNNING
HEADER** — it belongs to every part, not to Data alone. The other seven pairings stand as proposed.
Decision, his — **what a click does: option C.** A click always SHOWS. Keep only — a filter — is NEVER a click: it is its own
control, and it says visibly that it is on until it is removed. Open and Follow remain as moves a node offers.
Why: forcing two blocks onto the nearest existing part hid two real gaps, and "no page yet" is the more useful answer because
the gaps are what the next piece should build. And a filter that switches on from an ordinary click is the thing that confuses
people — clicking a folder opens it; you never want it to silently hide every other folder.
Consequence: the lab's section map gains a third kind of pairing, the running header, and shows three gaps instead of one
(Overview and risk · In-flight state · Standard or specialist). The brain map's moves drop Keep only from the click and gain a
Keep-only CONTROL that shows its state, so option C can be seen working rather than read about.
Revisit if: a running header reads as noise once every part carries its own stage reading — then it becomes a chapter again.

---

# Entries D-023 … (2026-09-22) — today's rule and ask, then the rulings that had no home

D-023 and D-024 were ruled or asked today. D-025 … D-033 are BACKFILLED on 2026-09-22 from the source each one names: a ruling
that lived only in session memory, a brief or a commit body now has one home here. Every quote was checked against its source
— for his typed words, the session transcript (`~/.claude/projects/-home-khujta-projects-gabe-lens/<session>.jsonl`, times in
UTC). Where a line is the agent's reading and not his words, it says so.

## D-023 — No propagation: the work stays in the Gabe Suite
Date: 2026-09-22 · Input: his message in the chat (transcript `fa35dc07…`, 20:57 UTC): "And by the way, our work now will not
affect anything anymore. We will not propagate any more changes for now. We will just work in the Gabe Suite for now."
Decision, his: nothing is propagated to the twins (gustify, gastify) and no twin is rebuilt, until he says otherwise.
Consequence: the design pages read the FROZEN lab feed — `~/.cache/gabe-map-baselines/lab-input/{forms.json,archmap.json}`
(gustify @ `05007957`, every arm on; backup `lab-input.bak-2026-09-22`) — and `_lab-ep.js` is regenerated only with
`--forms` pointing there. The "twins" step is suspended wherever a definition of done carries it: `program-leftovers.md`
(the paragraph for the generation pieces) and the landing orders in `element-forms/amendment-1.md` (e.g. Slice 11e's and
Slice 12's). Those files are not edited; this entry is what suspends them. The twins' unpushed commits stay his, and are no
longer a next step.
Revisit if: he names a twin again, or the station (Gabe Universe) must show arm data — no committed twin feed carries any.

## D-024 — His ask: simpler docs, a method for what matters, the brain map folded into the lab, one page for every endpoint
Date: 2026-09-22 · Input: two messages (transcript `fa35dc07…`). This is an ASK, not a display ruling.
- 15:18 UTC, the second section: "in the lab, we will do a division on the right side, where we have the middle panel, the
  rail, and the command panel. We will have a second section below that one where we will show all the information in an
  indented format that we have for an API endpoint. The idea is that, as we go through the different sections in the
  panels, we highlight what parts of information are we show[ing] on the panels".
- 20:57 UTC, the consolidation: "Check the documentation that we have generated for this. Consolidate some things. See if
  there is redundant work. Establish a method to be able to figure out what is more important and what is not." · "I would
  like to simplify the documentation that we have." · "I would like to see if we should tackle something important before
  we consolidate this in the endpoint lab." · "matrices for your context are very good to have around." · "the other one
  for the brain map endpoint didn't really cover it. I would like to consolidate it in the endpoint lab instead of having a
  separate file. I need to see what is happening in the panels when we go through the brain map and highlight the different
  fields that we navigate through that brain map." · and one more page: "all the fields that we have available in the
  different dimensions and group them intuitively for one of the applications … let's pick one of them … all of one type of
  element on the same page at the same time … Maybe one row per endpoint, or maybe two columns per row, or three … so I can
  spot patterns".
Consequence: (1) the docs — every ruling gets one home here (this entry and D-025 … D-033), `STATE.md` is rewritten as one
page, `method.md` keeps method only and gains the importance procedure; no file moves until the fold and the skeptics'
verdicts. (2) the fold — the brain map's tree leaves its page for a data file the lab reads, then a FIELD layer (attribute →
the element a panel draws) so navigating lights fields, not only blocks; the second section and the fold are the same thing,
built once. Where it sits is a display choice, built as rail options and picked by seeing. `brainmap-endpoint.html` retires
only after D-021, D-022 and its open picks are carried. (3) the all-endpoints page — the app is the agent's pick, gustify,
because the frozen feed is gustify's (D-023); rows vs two or three columns per row are built as options. (4) the matrices
pages stay, by his words.
Revisit if: the field layer can be generated for fewer than half the attributes — then the authored proposals outnumber the
measured ones and the layer is re-priced on a page before it is built.
Note 2026-09-23: the fold is built — the lab's section map tab carries the brain map's groupings, Keep only, the moves and the
three placements, and its probe carries the brain map's ruling asserts. `brainmap-endpoint.html` retired to `records/brainmap/`
(with its template, probe, walk and pictures); `gen-brainmap.js` writes only the tree the lab reads. NOT carried, against
this entry's own condition: the page's drawn layouts A–D — among them "As sketched" at about 45°, his D-032 ask — and
shared fields drawn as one band. The lab draws the map as an indented tree only; the retired page still opens from
`records/brainmap/`, and STATE asks him whether the drawings belong in the lab.

## D-025 — Standing rules of this loop (backfilled 2026-09-22)
The working rules that until today lived in memory, briefs or commit bodies. One line each: the rule · since · source.
1. **Display is decided by SEEING built options, and generation is finished before display.** Since 2026-09-14 · transcript
   `fa35dc07…` 13:55 UTC: "Just skip the decision. I want to be able to see all of them and then decide. Anything related to
   how we display information, we basically are not going to decide from summaries or text." and, first, "I want to complete
   our codebase generation first." · memory `decide-display-by-seeing.md`.
2. **Every choice the agent would make alone is built as a switchable rail option, with the agent's pick marked.** Since
   2026-09-13 · transcript 19:18 UTC: "let's build them all and have them as options to choose in the left panel to
   experiment with them." · memory `options-not-decisions.md`. Bounded since 2026-09-18 by method rule 2 (3–5 variants, one
   fader each). "The pick marked" is the agent's practice, not his words.
3. **Facts are generated, never typed** — a number inside an authored sentence is a token the generator fills. Since
   2026-09-09 (the kind lab's law) · memory `kind-lab-arc.md`; `program-leftovers.md` definition of done, item 1; enforced by
   the brain map's generator since `8f1bbbf`. The AGENT's law; he has never contradicted it, but it is not his words.
4. **A click path handed to him comes from a real-click walk** (words read off the controls, a picture per step), never from
   a probe's script calls. Since 2026-09-21 · transcript 13:44 UTC, after a script-derived path failed him: "Can you maybe do
   a playwright test and navigate through the sections to see if they are actually displaying?" · memory
   `click-paths-from-real-clicks.md` · commit `6e72cdc`. His words ask only for the walk; the rule itself (words off the
   controls, a picture per step, never a probe's script calls) is the AGENT's standing rule drawn from it
   (`program-leftovers.md`, "STANDING RULE FROM THIS"), not his words.
5. **A ruling is written into the design-context docs, never only into session memory — into `decisions.md`, in the same
   commit that acts on it.** Since 2026-09-18 · transcript 14:57 UTC: "let's make sure to not save this only in the context
   memory of this session, but also save all this information in the actual design context documents." · commit `a2abb89`.
   The same-commit clause is added 2026-09-22, because rulings kept leaking into commit bodies and memory.
6. **Analysis, not diagnosis.** A verdict is restated as the fact underneath it (a rank in a distribution, what a test
   asserted, a floor). Since 2026-09-19 · transcript 22:07 UTC: "…having this tool as an analysis tool of the codebase and
   not a diagnostic tool." (and 2026-09-17, 23:24 UTC, on the stage hovers: "the information that we should get there is not
   diagnostic") · memory `gaps-endpoint-eval.md` · commit `2ff4716`. His words are the standpoint; restating a verdict as
   the fact underneath it (a rank, what a test asserted, a floor) is the AGENT's reading of it, recorded in
   `gaps-endpoint-eval.md`, not his words.
7. **Explanations for him are pictures, one part per page**, built from the gabe-artifact kit and the pattern libraries, one
   idea per section, words on hover, each section ending with a short "take from this". Since 2026-09-17 · transcript 17:34
   UTC: "this is unreadable, too much for my cognitive bandwidth. Again, visual representations: Gabe Artifact skill." ·
   17:35 UTC: "let's do it only for the tables section, only for models and tables" · 18:42 UTC: "after each table … put
   some brief pointers with a plain explanation about what is expected" · memory `one-part-as-pictures.md` · commit `9c568e4`.
8. **He reviews built work — and rates — on a GENERATED decision page** with options, the agent's picks, real-click pictures
   and one copy button, never a text plan or a markdown table. Since 2026-09-18 (15:10 UTC: "Maybe we can do a GabeArtifact
   with the table … and we can put a copy button so I can copy the ratings") and 2026-09-20 (18:50 UTC: "let's create an
   artifact for it, just like we did for the other decisions, with the options, some recommendations, and everything that
   needs to be read and figured out") · memory `rating-sheet.md`, `review-page.md` · commit `3ff8d79`.
9. **Two navigation systems are explained on a page of their own before he is asked to rule on them.** Since 2026-09-17 ·
   transcript 05:06 UTC: "Can we create a diagram that shows me all the possible options to navigate this? I also want to
   understand how they relate to the buttons that we already have in the panel" · answered by `workflow-panel/command-map.html`
   (`5b73e2e`) · memory `command-card-rules.md`. His words ask for the diagram; "before he is asked to rule on them" is the
   AGENT's rule (the "How to apply" of `command-card-rules.md`), not his words.
Revisit if: a rule here contradicts a later ruling of his — the later ruling wins and this line gets a dated note.

## D-026 — The six parts of an element, from his alphabet, and the lab's no-loss law (backfilled 2026-09-22)
Date: 2026-09-10 · 2026-09-11 · 2026-09-12 · Source: transcript `fa35dc07…`; memory `operator-alphabet-rulings.md`,
`endpoint-lab-arc.md`; commit `390e270`.
- **The alphabet as it binds the lab (2026-09-10, 17:30 UTC).** A "how many" is "crucial"; its fields group into DIMENSIONS
  — data · functions · tests · widening · flags or security · schemas (he also named dependencies) — which became the six
  PARTS, each a fixed slot. C:
  "use the icon instead of the word. If we hover over the icon, we will see what we mean by that icon." D: "limit to one or
  two of these representations per element" (the agent placed them: FUNCTIONS with a moving bead, WIDENING as the ladder); F
  merges into D. E: stacks for data, "the sequence might be used in things that relate more to the ephemeral, like functions
  or states". I: commit is the DATABASE transaction, never git — his question ("Is that what you mean by commit, or is the
  comment in the sense of GitHub?") answered that way. J (mutation), K (speed) and M (waiting): agreed — M in his words
  "agree with these". B, G, H and L: he asked for applied examples — L (acceleration) in his words "This is more difficult
  to grasp, so I will need examples of the application of this".
  **Tension with D-017, not resolved here:** his G intuition was about data's LIFETIME (ephemeral, in transit, deleted later);
  the agent's applied example made G the MAP's certainty (dashed inferred · hatched unmeasured · hollow measured-zero), and
  by D-017 a fact about the map is hidden by default. Which reading G keeps is his.
- **No loss (2026-09-11, 13:07 UTC):** "If we have more information than what we are showing today, that's okay, but what we
  cannot do is show less or lose information." Every row the station's card shows lands somewhere in the lab; a hover card
  counts.
- **Schemas split back out of Data (2026-09-12, commit `390e270`):** "Merging them was too much" — six parts again, DATA ·
  SCHEMAS · FUNCTIONS · TESTS · WIDENING · SECURITY. `workflow-panel/ep-brief.md` still describes the merge; it is superseded
  on this point.
Revisit if: a part stays empty on most endpoints of an app (then its fixed slot is noise there, as D-012 asks of endings).

## D-027 — The Pattern Book laws, and which boot lines are his (backfilled 2026-09-22)
Date: 2026-09-11 … 2026-09-13 · Source: `workflow-panel/panel-patterns.html` (commit `559b8d7`, the full text — it stays the
home of every rule); transcript `fa35dc07…`; memory `panel-pattern-book.md`, `endpoint-lab-arc.md`; `probe-eplab.mjs`.
- **The five laws** (panel-patterns.html): the panel holds only what ships · icons are the labels · a card mirrors its thing ·
  every look is a setting, pasted back as a copy line · measure what is drawn. Its card law carries "no feed-wide comparison"
  on a card (rank, median and the heaviest belong one level up).
- **His words behind the rules:** "I want all the controls minimized except for the one that we are working on currently"
  (2026-09-12, 14:56 UTC) · a slider's current value opens a third along: "The size right now should be like a third of the
  available sizes to select." (2026-09-13, 15:12 UTC) · "I kind of agree with that, but I didn't ask for that" → anything
  drawn by choice becomes a dial with a none option, and unique was narrowed to corners (2026-09-13, 16:12 UTC) · one hover
  per drawn element: "consolidate the hover only to show the hover that we are showing for the whole table" (2026-09-13).
- **Which boot lines are his.** He pasted the DATA line — nine versions from 2026-09-12 16:11 to 2026-09-13 16:59 UTC; at
  14:54 UTC on 09-13 he said "take this as the default configuration for everything" over an earlier version, and the line
  the lab boots on is his LAST paste (16:59 UTC), except `shown as stageblocks` and the `stages` segment D-007 added. He
  pasted the HEAD BAR line (2026-09-11, 17:55 and 18:11 UTC), the PART BUTTONS line (2026-09-11 19:42 UTC, revised 2026-09-12
  14:17 and 14:42 UTC) and the FRAME line (2026-09-12, 14:42 UTC; its parts now close the bench, head-bar and part-buttons
  copy lines). The COMMAND · MIDDLE · PORTRAIT lines (`CMDBOOT` · `MIDBOOT` · `PORTBOOT` in `probe-eplab.mjs`) were never
  pasted by him — they are the agent's defaults.
- **What the probe pins, measured 2026-09-22.** Word for word (`===`): his DATA line and the agent's three lines. His HEAD BAR,
  PART BUTTONS and FRAME lines are NOT pinned: `probe-eplab.mjs` checks only their endings (the frame parts, by regex), the
  head line's shape (`verbosity … LEFT … RIGHT … off … styles`), or the line against itself before and after an action. Their
  words — e.g. `styles kind(none,icon 24) … kindword(rect)`, `glyph 22px ghost at 77% · titles caps` — are asserted
  nowhere, so a rail change can overwrite them and nothing goes red. Owed before the fold (D-024) changes the rail: pin those
  three word for word, and put a comment beside every pinned line saying whose it is and when he pasted it (audit 2026-09-22,
  `rulingsToLift` #25). Not done in this backfill: the probe is outside the three design-context docs this wave edits.
Revisit if: he pastes a line for a region — it replaces the agent's default word for word.

## D-028 — Go shallow (backfilled 2026-09-22)
Date: 2026-09-13 · Source: transcript `fa35dc07…` 20:16 UTC; memory `shallow-logic-map.md`.
His words: "so we are missing something like a shallow internal wiring map right (we don't want to map everything for that is
better to watch code directly) ?"
Decision: the map follows the major paths inside pieces that carry logic and stops; the code itself is the deep view. It is
encoded, without his quote, as the element forms' depth rule — `element-forms/plan.md` D6 (handler + one call level + the
dependency chain) and `amendment-1.md` D17.
Revisit if: a question he asks cannot be answered one level down and the answer changes an ending.

## D-029 — One kind at a time, and the lab is the API endpoint kind only (backfilled 2026-09-22)
Date: 2026-09-09 · 2026-09-17 · Source: transcript `0b3d1f35…` 2026-09-09 19:58 UTC; commit `a015def`; memory
`kind-lab-arc.md`, `endpoint-lab-arc.md`.
- **One kind at a time (2026-09-09):** "…continue with the next one and start merging and seeing patterns … but one at a
  time." Nothing is generalised from one kind. The kind ORDER the kind lab recorded is superseded by his tier-1 priorities
  (2026-09-18, under D-001): backend endpoints · functions · schemas · models; frontend views · components · stores · hooks.
- **Lab scope (2026-09-17, 22:19 UTC, `a015def`):** "Right now, we are working just in the setup for this API endpoint, and
  that's it for setup complete. The API endpoint is it. The entity one, we will work on that separately. It is a completely
  different setup" (the transcript; the `a015def` body condenses it). The entity card and the scope pick left the lab.
Revisit if: the second kind (functions) opens — it gets its own inventory and loop, never the endpoint's by copy.

## D-030 — The console model WHAT × PATH × TIME, and the arrange lab parked (backfilled 2026-09-22)
Date: 2026-09-17 · Source: transcript `fa35dc07…` 16:13 UTC and 17:19 UTC; memory `console-model-what-path-time.md`,
`arrange-lab.md`, `field-atlas.md`; `workflow-panel/arrange-brief.md`.
- **The model, his words (16:13 UTC):** "The first dimension is just rich, but the second one is like path, moment, or
  case/use case. For tables, we might want to see those for use case, and the same goes for schemas, functions, tests … it
  should be path dimension, because inside each path we might also have time". The agent's reading, built in the arrange lab:
  every standpoint has three views — all · path · time — and tests have no time inside ("a case proves an ending", the
  agent's words); dimensions are typed by nature (global · temporal · standpoint · control · transient · record). D-008 now
  governs which region holds what; this entry is the axis model beside it.
- **The arrange lab is parked, not retired (17:19 UTC):** "the [arrange] lab will still exist, but I will work in both the
  [arrange] lab and the endpoint lab. In the endpoint lab, we are polishing what we are actually going to show for a given
  entity." (the transcript's speech-to-text reads "range lab"). D-010 then put loop 1 on the endpoint card.
Revisit if: loop 1 reaches layout across regions (the variants step) — the arrange lab is the tool for that.

## D-031 — The selection-independent WORLD region (backfilled 2026-09-22)
Date: 2026-09-08 · Source: transcript `0b3d1f35…` 13:16 UTC; `workflow-panel/CONSOLE-MAP.md` (§ the information / action
law) and `MINIMAP-CONSTRAINTS.md` (C3, C5).
His words: "on the left, we have a panel to have the high overview. That would be a mini map of the entirety of the map in
2D" · "this entire panel is dedicated to the information about what you have selected. The right-hand side panel is dedicated
to the actions." So LEFT = the minimap · CENTRE = information · RIGHT = actions are his. The agent's reading from the game
console adds only the framing: the left is the WORLD — selection-independent — and holds the global counters beside his
minimap. D-008 replaced what the centre and right hold for the endpoint console; the WORLD region is PARKED, not dropped. His
minimap asks stand with it: "The map should be able to rotate just like we do" (a camera-relative projection), and the size:
after it read as "a sixth of the page" he asked "Let's try a fourth of the page, 25% of the page" — `MINIMAP-CONSTRAINTS.md`
C5 implements it as `--dock: 25vh` (sizing in `vh` is the agent's mechanism). The audit (2026-09-22, `rulingsToLift` #21)
also wanted a line for this region in `suite-backlog.md`; it is owed, not written — this wave edits only the three
design-context docs.
Revisit if: the station (Gabe Universe) work opens — the world counters are the first thing a selection must never erase.

## D-032 — The brain map is a navigator, and his display words from looking at it (backfilled 2026-09-22)
Date: 2026-09-21 · Source: transcript `fa35dc07…` (UTC times below); commits `7f0390b`, `535c07a`, `2294e74`, `eae286e`.
- 21:43 UTC: "I would need a brain map for navigation of resulting panels, lilke is shown in the image (rotate it 45
  degreewes though)". Built as a NAVIGATOR, not a diagram: clicking a node opens its panel into the tray (`7f0390b`).
- 22:37 UTC: "The panel is too small to see. Can you use more of the screen? … I would like to have the panel tray on the
  right side." (`535c07a`)
- 23:00 UTC: "consolidate this artifact's layout to use the entire page with the right panel … the navigation of the actions
  in the right-side panel … whether they are going to select new data or show new data (maybe in the middle section or in
  the portrait) … The arrow is weird". (`2294e74`; the moves a node offers — Show · Keep only · Open · Follow — and the
  region each answers in are the agent's PROPOSAL, since ruled in part by D-022.)
- 23:19 UTC, in the lab: "Let's add the endpoint card section map with the indented map … We will open things on the
  indented map or the other way around … a way to put feedback as a copy button in that left panel. With this, I should
  actually see what is happening in the panels, not only read about it" (`eae286e`, the lab's third rail tab).
Consequence: these are display requirements the fold (D-024) inherits — the whole width, the tray on the right, every move
saying which region answers, an arrow that no longer reads as weird, both directions of navigation, a feedback copy. The fix
built for the arrow — one short hop from the opened node to ITS panel (`2294e74`) — is the AGENT's, not his requirement: in
the fold it is an option picked by seeing (D-025.2), not a ruled line.
Note: `brainmap.words.json` `acts._why` dates the 23:00 ask 2026-09-22; the transcript and the commit put it on 2026-09-21.
Revisit if: in the fold, a placement he picks by seeing contradicts one of these lines — the picture wins, and the line gets a
dated note.


## D-033 — His scorecard U1–U14: the slots an element's form must fill (backfilled 2026-09-22)
Date: 2026-09-13 · 2026-09-21 · Source: `logic-map/element-forms.html` (the slot list U1–U14 and the `COVER` table of what
the map captured on 2026-09-13 — it stays their only full home); `element-forms/plan.md` ("The operator accepted the approach
on the Element Forms page", `df62e8c`); `element-forms/amendment-1.md` R1, ruled 2026-09-21 ("U1–U14 are his scorecard; U15
is the next free number" — U15 is in-flight state, Slice 12).
The slots: U1 Purpose · U2 Inputs · U3 Preconditions · U4 Defaults · U5 Bounds · U6 Paths · U7 Refusal reasons · U8 Switches
& flags · U9 Effects · U10 Invariants · U11 Failure handling · U12 Repeat safety · U13 Observability · U14 Tests per path. An
empty slot is a finding, the way a scorecard with no capping rule was one.
Not built as a slot of their own, by the 2026-09-22 audit (`rulingsToLift` #26): U1 Purpose · U2 Inputs · U4 Defaults · U5
Bounds · U10 Invariants · U13 Observability. Some of their facts are read in passing by other arms (e.g. schema and setting
bounds by the short arm); no arm fills these slots as slots. `element-forms.html` marks U1 Purpose and U10 Invariants as
needing a person's judgement.
Consequence: `method.md` step 1 reads these slots as inventory rows for every kind; nothing here builds them.
Revisit if: a kind's inventory rates one of the six at 3 — then that slot is priced as an arm on a page before it is built.

## D-034 — The all-endpoints table's defaults, icons for its options, and the shared attributes made prominent
Date: 2026-09-22 · Input: his reply after opening `workflow-panel/all-endpoints.html`, pasting the page's own copy line.
Decision, his — **the table's defaults**, pasted (its lines joined here with " / "): "page: all-endpoints · gustify @ 05007957
/ layout: one per row / grouped by: entity (7) / columns: every column · their own group, first · stage order / sorted: in
path order", with "your words:" left empty. Those five rails stop being
the agent's picks and become his defaults. The rails his paste does not name (a group of a single endpoint · group order ·
numbers · a column's most common value) stay the agent's picks, marked as such.
Decision, his — **the options become icons**: "The titles are okay, but the options should be mostly icons, so they occupy
less space. The options might be noted by having the border of the square dash." Each option is a small icon square, its
words on hover (a control's hover stays short, D-009); the agent's unruled pick wears a DASHED border — the same mark the
decision pages use for "my pick".
Decision, his — **the shared attributes stand out**: "can we mark the [shared] attributes because they are in their own
group? I would like to be able to see them more prominently somehow, maybe with some header distinction or highlight". (His
dictated "chart attributes" is read as the Shared group — the columns the page groups as "their own group, first".) How
they stand out is built as options and decided by seeing (D-025.2).
Consequence: the page's rail shrinks to titles + icon squares; the Shared group's header (and its cells) carry a distinct
treatment; the probe asserts his five defaults, the dashed mark on exactly the unruled picks, and every icon's hover.
Revisit if: an icon square cannot be told from its neighbours at a glance — then that option gets a short word beside it.

## D-035 — The endpoint lab: the section map lives below, simpler and in icons, and the lab switches endpoints
Date: 2026-09-23 · Input: his message with a screenshot of the lab (the section map full width below the panels) and a
hand-drawn sketch.
Decision, his: "In the endpoint lab, I would like to: Consolidate the layout we have in the image. Leave the section map in
the bottom section and remove it from the top-left section selector, where we have the controls and the [no-loss] list.
Restructure it to be more simplified and use more icons. Right now, I cannot understand what is happening in that section
map. Be able to change the endpoint for any of the other endpoints that we have here in the all endpoints.html file."
(Dictated; "now list" read as the no-loss list, the rail's second tab.)
Consequence: the map's placement is RULED — full width below the panels; the rail-tab and right-column placements leave with
the rail's "section map" tab, and the rail is back to controls · no-loss. The section map is redrawn to be read at a glance —
icons and marks instead of sentences — and what is still the agent's choice inside it is built as options, the pick dashed
(D-034's convention). The lab opens any of the endpoints the all-endpoints page lists, the facts for each generated the same
way as today's one baked endpoint (never typed).
Revisit if: the simpler map loses a fact he then asks for — it returns behind "more information", not on the face.

## D-036 — The all-endpoints page: the table, then one endpoint compared three ways
Date: 2026-09-23 · Input: the same message and his sketch ("THE ENDPOINTS · OPTIONS · a table SHARED | ENDINGS | Proof | … ·
ENDPOINT INFO FROM GRAPH · INFO FROM CODE MAP").
Decision, his: "the all endpoints will have just two sections: The endpoints with the table, as shown in the screenshot where I
hand-drew everything. One specific endpoint. For whatever endpoint we select, we are showing the detail in a right-side panel.
I would like to change that. Instead of that, I would like to see the information that we show in the right-side panel or from
the code map in the column on the right, on the endpoint. On the left, I want us to show the information that we are showing
today in the Gabe universe. I didn't put it, but in the middle, probably I will add a narrower third column with the gaps.
Also, let's add icons and colors, if possible, to the different sections that we have in the table form for all the endpoints
in the all endpoints.html file, to align it better with our controls in the endpoint lab and the sections in the all
endpoints. For more information on what I'm looking at, they remain, but at the end or bottom of the page."
Consequence: the page has two sections — THE ENDPOINTS (options, then the table) and ONE ENDPOINT (the row picked in the
table): left, what the Gabe Universe shows for it today; right, what the code map knows (today's side panel); a narrow middle
column of the gaps between them (built, and marked as the agent's reading of "the gaps" until he rules it). The table's block
groups carry an icon and a colour, the same as the lab's parts where a block is paired to one. "More information" moves to the
end of the page.
Revisit if: the universe column and the code-map column cannot be read side by side at 1920 — then they stack, left above right.

## D-037 — Design pages are checked lightly; the heavy proof is for what ships
Date: 2026-09-23 · Input: his question after a build ran 253 minutes, three-quarters of it in browser tests.
His words: "What are we gaining with these tests? What we're doing right now is not application development itself. It's just
developing some panels for me to look at, navigate, and establish how we are going to represent the different elements in the
Gabe universe. This is not part of the application, so I'm not sure if we are gaining much by testing that much at this stage
in this context."
Decision — the agent's reading of his direction, his to adjust. For the DESIGN pages (the endpoint lab, the all-endpoints
page, the matrices, any page he looks at to decide how the universe draws an element):
- KEEP: the numbers on a page are true — checked inside its generator, no browser, seconds (a page he reads patterns from must
  not lie) · a SMOKE check — every page loads without a page error, and the lab opens every endpoint · ONE real-click walk at
  the end of a build, because its pictures are what he reviews (D-025.4) · ONE read-only review only when a page shows NEW
  numbers or claims.
- DROP for design pages: sabotage (mutant) runs proving each check can fail · the full probe re-run after every edit · second
  review rounds on layout polish.
- The existing full probes are kept, not deleted, and run ONCE before a commit, not during iteration.
- Unchanged: the suite's GENERATION code that ships (the forms arms, the station's generators, hooks) keeps its full proof —
  batteries that fire and stay silent, mutants, dry runs (CLAUDE.md's rules).
Why: the tests found real defects — but the ones that mattered to him (false numbers on the all-endpoints page) came from
reviews reading the data against its source; the browser re-runs and sabotage checks mostly re-proved panels that are
exploration, not product, at ~75% of every build's time.
Revisit if: a design page shows him a wrong number or breaks while he is navigating it — then that page's check grows back.

## D-038 — The all-endpoints page: less title, a link into the Gabe Universe, the non-actionable text behind a toggle
Date: 2026-09-23 · Input: his message after opening the page.
Decision, his: "in the top section on the one endpoint, we reduce the amount of title that we have there. We have a [Gabe]
universe in place … already running … Let's use that to be able to produce the same kind of link that we have for the endpoint
lab, but for the Gabe universe. That way, I can check in the endpoint lab or the Gabe universe what is being shown. I can also
compare against the actual universe to see if our aggregate description of the [Gabe] universe matches the actual [display] in
the [Gabe] universe and the titles and description in general. Whatever is not actionable, let's hide it in a toggle button
next to the title in one endpoint and also in the endpoints. For the endpoints, I want to hide whatever is above it, like the
description of the title. All 80 endpoints, not justified, one row each."
Consequence: the station gains a `?node=<id>` deep link (both copies of gabe-universe.html; its battery proves it fires on a
real endpoint and stays silent on an unknown id), and ONE ENDPOINT links to it beside the lab link. Each section's title
carries one toggle; everything that is not a control, a value or a link — ledes, column descriptions, the build command, the
head line — sits behind it, closed by default. "All 80 endpoints, not justified, one row each" asks for NO change: the agent
first read it as "every endpoint at once, one unwrapped line each"; asked, he answered "Nothing — leave the table as it was"
(2026-09-23). The table stays as D-034/D-036 left it.
Revisit if: a hidden line turns out to be one he reads every time — it comes back to the face.

## D-039 — The selected endpoint's row is pinned at the top of the all-endpoints page
Date: 2026-09-24 · Input: his message.
Decision, his: "when we select an endpoint in the one endpoint section … When we scroll down to the one endpoint, I want to have
that particular row from the endpoints table with all the labels for all the column names for that row, but only that one. If I
scroll down, I should still see that one for the selected endpoint. Actually, we can put that at the top of everything … When we
scroll down, we're always going to see the table and the row for the specific API endpoint."
Consequence: a pin at the very top of the page holds the table's block and column names and the SELECTED row, and stays on screen
through the table and down into ONE ENDPOINT. It is drawn by the table's own renderer (its header still sorts and lights), copies
the table's measured column widths and follows its sideways scroll, so it reads as the top of the same table; while the table is
scrolled, the table's own header tucks behind it and its rows run on under the pinned row. Picking a row updates it; clicking the
pinned row goes to ONE ENDPOINT.
Revisit if: the pin's height crowds the screen at 1080 — then its block-name row folds away and only the column names stay.

## D-040 — The universe column draws the station's own visual encoding, and the gaps go both ways
Date: 2026-09-24 · Input: his message with a screenshot of the station's CONNECTIONS row (writes_to 3 · reads_from 7 · touches 2 ·
walled by 1, each group badged INFERRED / STRUCTURAL, its items as coloured chips with kind icons, "+1 more").
Decision, his: "In all the endpoints where we show one endpoint in the Gabe universe … Some groupings are not applied here and are
not clear. For example, in the connections, write-to and read-from … are shown in the universe as very well-established different
groups … Here they are just text items next to each other. We don't want that. We don't want to lose that kind of grouping,
coloring, and labeling … so when I compare, I compare not just the text but also the visual encoding that we already created in
the [Gabe] universe." And: "I'm not sure if the gaps are only in the left-to-right direction. Maybe there are some in the
right-to-left direction. We should have a toggle button at the top of the gaps section, maybe two buttons to see the gaps between
what the [Gabe] universe has in relation to the map and what the map might have in relation to the [Gabe] universe."
Consequence: ONE ENDPOINT's left column draws each station row the way the station draws it — groups, their labels and badges,
chips with their kind icons and colours, the "+N more" — its look lifted from gabe-universe.html itself, never retyped. THE GAPS
carries two buttons: what the code map holds that the universe does not show (today's reading), and what the universe shows that
the code map does not hold (new) — both marked as the agent's reading of "the gaps".
Revisit if: a station row's look cannot be lifted without copying the station's code wholesale — then that row links to the
station (?node=) instead of imitating it.

## D-041 — Click an element of information and it lights everywhere it appears: the table, the universe column, the code map
Date: 2026-09-24 · Input: his message.
Decision, his: "in the panels for the [Gabe] universe and the code map, in the one endpoint and all endpoints, when I select, I
should be able to click the elements of information that we are showing. That should highlight that element throughout all the
panels in the table, in the Gabe universe, and in the code map. That way, I can clearly see if something is there or not and how
it's being represented in different ways across the different interfaces that we have, which are the three ones: the table for all
endpoints, the Gabe Universe section, the code map section in the one endpoint."
Consequence: every element of information the universe and code-map columns draw (a table or its model, a function, a guard, a
schema, a flag, a test case, a status, a file) carries one identity key, the same key space the table's rows already hold their
members in. Clicking one lights it in all three places at once — the table (the endpoints whose rows hold it, and the cells that
count it), the universe column and the code-map column (every chip or pair that is it, however it is drawn) — and each place says
plainly when the element is NOT there. One click again, or clear, puts it out. How a model class and its table are treated as one
element is the agent's reading, said on the page.
Also this date: "All this work can remain local for now. Just committed." — commit the design work; no push until he says.
Revisit if: a key joins two things he sees as different (or misses one he sees as the same) — then that alias is split or added.

## D-042 — When the code map lacks a lit element, it says WHY, and links the field that holds it another way
Date: 2026-09-24 · Input: his message.
Decision, his: "when something is missing, I would like to know the reason. It's missing because it's not important, we
deprioritize it, we are showing it with a different layout or in a different way in another field, or something like that. If
it's in another field, it should link to the other field. When I click that or hover over it, it should highlight the other field.
This should only apply to the code map section on the right side."
Consequence: the code-map column's "not here" line (D-041) carries the reason(s), each derived from data the page holds, never
typed per element — counted, not named (a field counts it without naming it) · shown another way in another field · low priority
(its attribute is rated 1, D-020) · about the map, not the code (D-017) · not carried (a real gap, pointing at THE GAPS). A reason
that names another field links it: hovering or clicking the link lights that field. The reason vocabulary and which kinds map to
which fields are the agent's reading, said on the page. Only the code-map column; the universe column's note stays as it is.
Revisit if: a reason reads as an excuse for a gap he wants closed — then it is re-worded as a gap, not a reason.

## D-043 — In the code map, every verb and every catalog value wears a visual encoding
Date: 2026-09-24 · Input: his message.
Decision, his: "in the code map section on the right side, in the one endpoint on all endpoint.html, let's look out for the verbs
like read and write, or any other action. Let's make sure that all the verbs have some coloring label or icon associated with them.
Also, if there is any catalog of anything like a type of function, type of schema, or something else, that also should be encoded
with a visual aid like coloring or an icon."
Consequence: in ONE ENDPOINT's code-map column, every action word (read · write · read-and-write · saved · rolled back · …) and every
value drawn from a fixed catalog (kind of ending · stage · fate of a write · in-flight lifetime · switch kind · function role · schema
kind · piece commonness · alarm family · …) is a chip with a colour and/or an icon, its words on hover. An encoding the page, the lab
or the station already uses for the same catalog is REUSED, read from where it lives, never re-invented; a catalog with no encoding
yet gets one small set, marked as the agent's proposal, its colours kept apart from the status and series colours. Only the code-map
column changes.
Revisit if: two catalogs end up wearing look-alike chips — then one of them switches to an icon-only encoding.

## D-044 — A gap's hover says why the gap exists and how it is solved, or that it is not being solved
Date: 2026-09-24 · Input: his message.
Decision, his: "in the gaps, especially in the ones that are in the universe and not in the code map, when I hover over it, it gives
me more information. Can we also put the reason why we have that gap and how we solve it, or if we are not solving it?"
Consequence: every item in THE GAPS — above all the "in the universe, not in the code map" direction — carries, in its hover, the
REASON (the same derived reasons as D-042) and a STATUS: solved elsewhere (with the field that holds it, a link) · not solving (and
why — rated 1, D-020; about the map, D-017; …) · open (and how it would be solved — what the code map's data would have to carry,
and from where). The status lines are one authored table, the agent's proposal, said on the page; the reasons stay derived. The
wording states facts and plans, not verdicts (D-025.6).
Revisit if: an "open" line has no plan he can act on — then it names the missing measurement instead of a fix.

## D-045 — The embed-graph seats ship, board seats 10 + 11 first
Date: 2026-09-24 · Input: the gastify brief `~/.kdbp/handoffs/2026-09-24-gastify-to-suite-seats.md` (Q1), put to him as a
question in session `92f1e6c5…`, and his message: "Can we make these changes without disrupting the other work and then
propagate it to the twin projects, so the [Gabe] command centers get updated with these changes, following the recommended paths
mentioned in the message from the other session on Gastify?"
Decision, his: yes to the seats; the first slice is the board's two seats — 10, the commit picker, and 11, the spine strip —
not all eleven.
Consequence: the seats stop being a mock (`embed-graph/seats/`) for the board only: the generators and the shell emit them, so a
normal regen draws them from each center's own data. Seats 3, 4, 1/2, 5, 6/7, 8 and 9 wait, one page family at a time, until the
feed shape (D-048) is ruled again for them.
Revisit if: the board's seated page costs more to load than the board is worth (the 1.6 MB `3d-bundle.js` was never measured on
a center page) — then the seats become opt-in per center.

## D-046 — "3D mini planes" means panes
Date: 2026-09-24 · Input: the same question round (embed-graph README D1).
Decision, his: panes — small 3D viewports, each about one subject — not drawn layer floors.
Consequence: `embed-graph/README.md` D1 is closed; the layer banding stays inside each pane.
Revisit if: he asks for the layers to be visible surfaces.

## D-047 — The pane runtime is copied into the shell; the station keeps its own copy, guarded by a drift check
Date: 2026-09-24 · Input: the same question round (embed-graph README D2).
Decision, his: option (b) — all seven runtime files (`_grammar.js`, `_slice.js`, `_uni-grammar.js`, `_pane.js`,
`_pane-console.js`, `_pane.css`, `_pane-console.css`) are re-extracted fresh into `templates/center/shell/assets/`, with a
public `GabePane.destroy` and the pane CSS scoped under `.seat`; `gabe-universe.html` is NOT cut over and keeps its private
copies; `tests/gabe-universe` gains an assert that fails when the two drift.
Consequence: every center ships the runtime on a normal regen; the station is not edited, so the D-040/D-041 work beside it is
untouched. Cutting the station over (option a) is its own later change.
Revisit if: the drift assert fires twice in a month — the copy costs more than the refactor, and the cut-over is due.

## D-048 — The board is the first page, and it loads the whole feed
Date: 2026-09-24 · Input: the same question round (embed-graph README D3 and the open feed-shape item `pending-02`).
Decision, his: the board first; the board loads the whole `c4-graph.js`, `commits.js` and `workflows.js`, no per-subject slices.
Consequence: one page carries the feed cost. Before any feature, ledger or tests seat, the feed shape is ruled again (per-subject
slice files at regen time vs the whole feed on every page).
Revisit if: a second page family is seated — that is the trigger to rule the feed shape again.

## D-049 — D-023 is lifted for the seats only; the suite propagates gustify, gastify propagates itself
Date: 2026-09-24 · Input: the same question round (brief Q2).
Decision, his: D-023 ("no propagation") is lifted for the board-seats slice only. The suite session propagates gustify itself
and commits there on its current branch, as `816665b2` did, with no push. Gastify gets the exact command and the hand-back
report, and runs its own propagation through `/gabe-commit` (its D130) — the suite commits nothing in gastify.
Consequence: the return path of the gastify brief is open for this slice; everything else under D-023 (the design pages read the
frozen lab feed, no twin rebuild for design work) still stands.
Revisit if: another slice needs a twin — each lift is its own entry.

## D-050 — The seats are built on their own branch and worktree, merged at the end, not pushed
Date: 2026-09-24 · Input: the same question round (the agent's question: a parallel session was busy in the same tree with an
uncommitted `decisions.md`).
Decision, his: all seat work happens on branch `center/seats` in the worktree `.claude/worktrees/seats` (off `6294da9`); the
branch merges into `graft-adoption` when the slice is green, and only then does `./install.sh` run (`~/.claude` is shared, and an
early install would show drift in the other session's doctor). Nothing is pushed: the other session's D-041 keeps its work local,
and a push of `graft-adoption` would publish it. Gastify checks byte parity against this checkout, on the same machine.
Consequence: the brief's Q3 ("push `graft-adoption` first") is replaced by this entry.
Revisit if: gastify needs the suite sha from a remote — then the push is his call.

## D-051 — The brief's other recommendations stand as the build's defaults
Date: 2026-09-24 · Input: the agent listed them before the question round as "taken unless you overrule"; he overruled none.
This is the agent's reading of his silence, said here so it can be overturned.
Decision (defaults, not his words): Q4 (b) — the `commits.js` cap stays, its wording is corrected, and the beat tail refreshes
it. Q5 — one fixed spine parser (newest first by date, deduped, `green@<sha>` read from Gates when Commits is `—`, archives read,
EXEC and EXECUTE one beat, sha length normalized before any join), writing a gitignored spine feed beside `commits.js` with an
always-written stub. Q6 (a) — done-card chips read PENDING by header with a positional fallback past the header. Q7 — the
`load_ledger` order fix lands first, as its own commit. Q8 — the board seats mount through a generator token. Q9 — the pane keeps
its dark ground for now. The suite centre's own shell fork (`docs/center/shell`) is out of this slice.
Revisit if: he names any of these.

## D-052 — Every element the page names wears the station's glyph and colour, and its subcategory as a label at the end
Date: 2026-09-25 · Input: his message.
Decision, his: "we can inherit more things from the Gabe universe. Whenever we mention something that is a component in the
universe (whatever it is: a table, a function, an API endpoint, a store view, or any other kind of element that we put in the
graph), we should put it with the icon that we are putting in the graph, at least. Ideally, also with the color … there are things
that have subcategories, like functions, endpoints, and others. For those, we should find a way to be able to communicate both
things: the color of the element used [and] the category, maybe with a label at the end."
Consequence: on the all-endpoints page, every mention of a station element (a model/table, a function, an endpoint, a schema, a
flag, a store, a view, a hook, a route, a module, a provider, an entity, …) is drawn with the station's glyph for its KIND in the
station's KIND colour (KINDCOL); where the kind has subcategories — a function's role, an endpoint's method, a component's class, a
hook's role, a module's class, a provider's class, delivery — a small label at the END names the subcategory in the station's badge
colour (__BADGE_COL). All of it lifted from gabe-universe.html, never retyped (the drift guard of D-040). A mention whose kind the
station does not draw (a setting, a test case, a status) keeps the page's own encoding and says so; the kind mapping is the agent's
proposal where it is not one-to-one.
Revisit if: a kind colour and a subcategory label read as one thing — then the label moves inside the chip's outline.

## D-053 — The endings and the own checks are one table, in the order they happen
Date: 2026-09-25 · Input: his question on the code map ("Can you explain to me the difference between the endings and its own
checks? Does it happen at a different moment … maybe create a stage 0"), the agent's answer, and his reply.
Decision, his: "Build it and also consider the time dimension. Order it in the order that they happen." — "it" being the agent's
proposal: the two lists repeat each other (every own check names the ending it produces; POST /recipe-creation/gustify's 11 own
checks ARE its 11 HANDLER endings), so merge them, and split HANDLER into its real moments instead of a stage 0 (eight of that
endpoint's eleven checks run only after the main call has failed).
Consequence: on the all-endpoints page's code map, "the endings" and "its own checks" become ONE table. Each own check sits on the
row of the ending it produces; a row decided by shared code (the rate limiter, the login check, FastAPI) names who decides it. The
rows run in the order a request meets them, DERIVED from the feed's path chains (never typed), with UNCAUGHT last; "each path's
fate" follows the same order. INPUT splits into reads the body · checks the fields, and HANDLER into checks · after a call failed
(one group per catch). A fact the time order exposes, shown rather than hidden: FastAPI reads the body BEFORE the login check, so
INPUT appears on both sides of GATE — the D-001 spine is a reading order, not always the time order. How the moments and the
check are drawn are the agent's picks, built as options (D-025.2).
Revisit if: a request's real order is not a single line (the moments of two branches read as one sequence and mislead) — then the
table draws the branches side by side.

## D-054 — The moments are a dimension every section can wear: explore a moment × section view, and copy the code map's settings
Date: 2026-09-26 · Input: his message on the D-053 build, with a screenshot of POST /cooking/sessions.
Decision, his: "we have some configuration there, but I don't have a button to copy it. Let's make sure that the code map has a
button to copy it" — and: "are these moments universal or something that we can apply to all the other sections … In the data
effects, in the function structures, in clients, and all the other sections, can we apply the same thing? I think that this is a
very nice dimension to have. That probably will be moved also in the middle panel. Maybe everything can be shown as this kind of
dimension, and we can group them by them and assign columns to each one of these dimensions. Let's explore that option."
Consequence: the code map gets a Copy button for its own settings, and the page's bottom text carries them too. The exploration is
measured first — per block, whether the feed records WHEN each element acts — and then built as a full-width BY MOMENT section on
the all-endpoints page (the agent's call: see it here before it moves into the lab's middle panel): moments in time order × the
timed blocks, a path choice (all paths or one ending — his WHAT × PATH × TIME of 2026-09-17), and the untimed blocks in a band of
their own with the reason. It is the TIME half of that model made finer: the stage spine (D-001) stays the coarse axis, the moments
are its inner grain, derived per endpoint from the code.
Revisit if: a block's elements can only be placed by guessing — then that block stays out of the matrix and the gap is named, never
filled.

## D-055 — BY MOMENT reads as columns of chips; the code map can dim what BY MOMENT already carries; the path row is codes only
Date: 2026-09-26 · Input: his message on the D-054 build, with a screenshot of POST /cooking/sessions.
Decision, his: "this table by moment is wonderful. Definitely, I ordered the moments as columns and the cells as chips." — "in the
code map [I want] a switch where we hide or dim down all the fields that we have in the code map that are already covered in the by
moment table, to see if we are missing something else … address the gaps that we have in the code map to see if we really need them
put in or surfaced in the code map. If so, we can add them, and that may impact the time moment table too." — "compress the path
section, which is using two rows right now. Put only the codes, like 429, 429, 422, 400, all paths, and so on. If I hover over it,
it will tell me the information about it." — "In the column names for the by moment column, in the handler, the important
information to have is the `accept` and the `functioning` boolean. Those two. All the other information … can be encoded in the
hover window."
Consequence: BY MOMENT's defaults are his (moments as columns · cells as chips), marked ruled. The code map gets a switch — show
all · dim · hide — over every element BY MOMENT places, so what is left bright is what has no moment. The path choice is one row of
status codes in time order, the rest in each code's hover. A HANDLER column's header carries two things — read by the agent as the
EXCEPT class caught and the FUNCTION that raised (his words were dictated; his to correct) — the rest in the header's hover. The
gaps (what the universe shows and the code map does not, and what the code map shows with no moment) are evaluated one by one with a
recommendation each; nothing is added before he rules on that list.
Revisit if: dimming hides a field he needs to read while comparing — then dim becomes an outline on the covered elements instead.

## D-056 — The gap list: twelve adds built on the page, the reach fix deferred
Date: 2026-09-26 · Input: the agent's gap evaluation on D-055 (33 rows, one recommendation each) and its recommendation to accept
1–12 (page-only) and defer 13 (generation work).
Decision, his: "agree with your recommendations".
Consequence: built on the all-endpoints page, each where the evaluation placed it — (1) the functions behind the handler by name,
at the call that reaches them · (2) the tests that arrange this endpoint, in Proof, no moment · (3) declared vs undeclared on each
ending · (4) the fate of the writes on a picked path, on the write chips · (5) the race on a unique key, on the flush chip with its
500 · (6) a test that fits several endings rides each, hollow · (7) response headers per ending, in its hover · (8) nested schemas
under the top schema · (9) who fetches it when it is a file or a piece the code map missed, at "the screen sends it" · (10) the
limiter's numbers, the auth scheme and what a case asserts, in the hovers · (11) the handler's signature and docstring, in its
hover · (12) the stream delivery badge on the answer. The twenty rows marked shown another way, not needed or timeless stay as they
are.
Deferred, with its trigger: (13) the reach fix — the map misses imports made inside a function, so UserDietaryProfile, two more
tables and five functions on POST /cooking/sessions have no recorded step — waits until generation work reopens (D-023 lifted);
it changes the forms generators, so it takes the full proof regime, not D-037's.

## D-057 — What BY MOMENT already draws counts as carried; five more facts get a moment
Date: 2026-09-26 · Input: the agent's verified analysis of what hide mode leaves bright on POST /cooking/sessions (34 rows, 29
held, 5 corrected), asked by him: "can we do analysis about info that is not being showed in the moments? some of it might not fit
in there but some might".
Decision, his: "build 1 and 2".
Consequence: (1) the code map's "what BY MOMENT carries" switch counts what BY MOMENT already draws — declared success (the filled
success chip), the alarms undeclared · text-only · shared-status · race-500 (their endings and the raced flush), each path's fate
(the write chips on a picked path), the handler's file (its chip's hover), method and path and the first URL segment (the heading).
(2) five facts get a place: (a) reason-lost — the words the service raises, in the hover of the check that raises them · (b)
reason-collapsed — the client's branch chip after the answer shows the status it reads and what it does · (c) the path row gets one
code per PATH, not per ending, where several paths reach one ending (the replay 201 and the first-run 201) · (d) the functions
behind with no call edge or known by name only, as chips at the call that reaches them, on its paths as an upper bound · (e)
escape-500 — the cause in the 500 chip's hover. The timeless fields (fate tally, step count, behind count, proof rank, the
arranging tests, the entity) stay where they are.

## D-058 — The universe and the gaps panels get the same "what BY MOMENT carries" switch
Date: 2026-09-26 · Input: his message on the D-057 build, with a screenshot of THE GAPS on POST /cooking/sessions.
Decision, his: "I want the same buttons to hide or dim the information that we already put below, but in the Gabe universe, I want
to be able to see in both panels what is already on the by moment table."
Consequence: THE GABE UNIVERSE and THE GAPS panels of ONE ENDPOINT each get the show all · dim · hide switch the code map has
(D-055), over the same join: an element BY MOMENT draws — by its element key, or by name for a name-only chip — is carried; a row
whose elements are all carried is carried whole; a count or text item stays bright unless every member it counts is carried. Each
panel's header counts what BY MOMENT carries and what is left. One switch per panel (the agent's call, his to overturn: dim one
panel while reading another whole). Both copy texts carry the switches.

## D-059 — The reach fix is built now; the twins' code-vs-map coverage audit waits for the elements bar
Date: 2026-09-27 · Input: the agent's explanation of the reach fix (the paths reader sees only a file's top-level imports; gustify
imports its own modules inside 17 functions at 32 places) and its recommendation to do it next.
Decision, his: "do the [reach] fix" — and: "save this other item for when we have figured out the command bar we are designing now
for all elements: map twin all's code against the coverage of the resulting codebase map and Gabe Universe, with that check for the
things we are not putting in the map/universe, classify them by importance/relevance from an architect's pov and evaluate if scan
must be wider or [deeper] to reach some of those gaps … parallel to this session or after we finish our current work and settle in
a new layout for the elements bar in the Gabe Universe diagram".
Consequence: (1) the reach fix — `_a3_paths_read` also reads the imports written inside a function, scoped to that function — is
built as generation code under the FULL proof regime (fixture cases that fire and stay silent, mutants, the forms batteries, an A/B
dry run of the old and new generators on copies of the four targets, id stability, re-blessed baselines, the doctor), not D-037's.
D-023 holds: nothing is written into a twin; the design pages keep gustify @ 05007957 — their feed is rebuilt from a read-only copy
of that commit, and swapped only if the old generators reproduce today's feed from the same copy. (2) the coverage audit is parked
in STATE.md with its trigger: the elements bar's new layout settled — or a parallel session he starts, read-only on the twins.

## D-060 — The reach fix's four follow-ups are built
Date: 2026-09-27 · Input: the four follow-ups the reach fix (D-059) found and did not build, each needing a ruling.
Decision, his: "lets tackle these" — and on the coverage audit file another session wrote: "the coverage audit is in fact the
parallel work, your [decision] was ok".
Consequence, each under the FULL proof regime of D-059 (fixtures that fire and stay silent, mutants, serial batteries, an A/B dry run
on copies of the four targets, re-blessed baselines, the lab feed rebuilt from a copy of gustify @ 05007957, the doctor):
(1) module-level library aliases of ORM verbs (`pg_insert`, `sa_delete`, …) are read as those verbs, like the function-local ones —
the byte rule is lifted for this change on purpose (gustify 2 sites, tier3 23); (2) `reached_by` keeps every route a root takes to a
function, so its path list is the union and no true path reference is dropped (tier3 loses 14 today); (3) the call graph's missing
same-module calls — `_stages` (a plain call, long_prep.py:100), `_label` and `_hold_hours` (inside keyword arguments, :84–85), the
last two not even nodes — are diagnosed first, then fixed in suite code; graft is third-party and stays untouched; (4) the baseline
checker stops reading the board's "on the board N days" text as a real change.

## D-061 — The board's relative dates are counted when the page opens; the helpers stand on their caller's paths; the small items close
Date: 2026-09-27 · Input: the D-060 report's two open calls (BY MOMENT's deep helpers on an upper bound; the board still changing daily)
and its "left open" list.
Decision, his: "let's tackle the two goals … About the board, it still changes daily. If there is a day there, let's make it so that
the dates are kind of absolute in the sense that commits will not change date (because those are commits). Any other date that we
show should be calculated on the fly against today, not recorded hard in the code somewhere when we generate this. It should be
dynamic. No matter if we open the thing today or tomorrow, the calculation will happen at the moment that we open it … It's okay
that we don't show things like yesterday or 2 days ago and only show the distance in days. Also, I would like to tackle the left
open and small items."
Consequence: (1) the board generator writes no wallclock-relative text: a commit's date stays absolute; every other date goes into
the page as an absolute date and the page's own script shows the distance in days when it is opened — "N days", no "yesterday" or
"today" words; the board is byte-stable across days, so the baseline checker's board rule goes if nothing needs it. (2) BY MOMENT
places a function behind the handler on the paths of the caller it hangs under, not on every path of the handler call. (3) the small
items: a project function literally named `delete`/`select` is no ORM verb; functions drawn by rule 2 get their qualified id (the id
changes are listed); the contract arm's idioms and the model arm's guard-use check ask the shared verb rule; map-baseline's git
status runs with GIT_OPTIONAL_LOCKS=0. Generation code takes the full proof (D-059); the page change takes D-037's.

## D-062 — The center's other relative dates count at open; name-joined chips follow their caller; the suite board is rebuilt; the all-endpoints page is audited
Date: 2026-09-27 · Input: the D-061 report's open list and the agent's recommendations 1–3.
Decision, his: "I agree with the recommendations. Let's tackle the still open items with your recommendations. And once we do that,
let's see if we need to update anything else in the all-endpoints HTML file."
Consequence: (1) the "T−N" freshness cells on the center's index and test-corpora pages — and any other date text a center page
computes at build time — are written as absolute dates and counted by the page when it opens (D-061's mechanism, a3-days.js), and
the baseline checker's T−N rule goes if nothing needs it; full proof (D-059). (2) BY MOMENT's name-joined chips (D-057 (d)) stand on
their caller chip's paths, like walk-placed functions (D-061 (2)); the upper-bound line only where the caller carries it. (3) the
suite center's own board, index and test-corpora pages are rebuilt so the page he opens counts at open time. (4) the all-endpoints
page is audited against the current feeds and generators — words, info texts, gap and band reasons, hovers, counts, references to
states since resolved (the reach fix, the deferred item 13, "upper bound", "depth not known") — and every stale item is fixed; the
page change takes D-037's light checks. Accepted by the agent (review F6, his to overturn): a report that used to read "never" or "?"
in a Last-run cell gets ONE NEW badge the first time it is counted — no target has such a report today.

## D-063 — Two proof regimes for generation code: full for what the map says, lighter for how it is shown
Date: 2026-09-27 · Input: his question on why a fix takes 3–5 hours (measured: the reach fix 8.3 h, D-060 4.1 h, D-061 3.2 h — serial
batteries, mutants, four-target A/B, the doctor, review loops) and the agent's proposal.
Decision, his: "yes on lighter regime".
Consequence: a generation change that alters WHAT THE MAP SAYS — ids, nodes, edges, steps, paths, reach, endpoint facts — keeps the
full regime of D-059 (fixtures fire + silent, ≥3 mutants per item, every touched battery, A/B on the four targets, re-blessed
baselines, the doctor). A DISPLAY-SIDE generation change — how a fact is rendered (dates, labels, page scripts, words) — takes the
lighter regime: fixtures fire + silent, 1–2 mutants per item, only the batteries the changed files touch during build, the A/B on
the gustify copy + tier3 only (gastify/keypro when the change touches what they exercise), and small fixes batched with ONE doctor
run at the end. Design pages keep D-037. Runs already launched keep the regime they were briefed with (D-062 stays full).

## D-064 — A function behind drops the paths that leave before it; BY MOMENT ends with a "no moment" column of metadata
Date: 2026-09-28 · Input: the D-062 audit's open overstatement and his look at the all-endpoints page.
Decision, his: "apply the recommendation, and also in all endpoints I think we are missing in the table at the end the [metadata]
which is naturally not associated to any moment, but there could be things like cluster, entity, file and line and so on".
Consequence: (1) a function behind the handler stands only on the paths that reach it — the paths the map shows leaving before it
(a returning fork, a check that fires first) are dropped, the rule checks inside a call already follow (e.g. on POST
/cooking/sessions, assert_recipe_allergen_safe and the chips under it leave the replay 201 and the 404). (2) BY MOMENT's table ends
with a "no moment" column (a last row when moments are rows): per block, the facts that have no moment by nature — the endpoint's
metadata (method and path, entity, cluster, handler file and line, URL segment, signature, docstring, and the like the feeds hold) and
the timeless summaries (the fate tally, the step count, the behind count, the proof rank, the arranging tests, the alarms row); the
NO MOMENT band keeps only what should have a moment but the feed cannot place. The column's placement is the agent's reading of "in
the table at the end", his to correct. Page-only: D-037's light checks.

## D-065 — Journeys enter BY MOMENT: a test's walk across endpoints is the outer time around one request
Date: 2026-09-28 · Input: his question on why the tables show nothing of the Gabe Universe's journeys, and the agent's answer (a
journey is a test that walks across several endpoints; the tables keep only the step it takes here; the D-055 evaluation's "not
needed" was right for the web/e2e groups, wrong for the pytest journeys, whose ordered calls the feed holds — 191 of 306 named
journey rows).
Decision, his: "build A and B".
Consequence: (A) BY MOMENT's Proof row gets each journey's OTHER steps at the outer moments — its earlier requests at "before any
request", its later ones at "after the answer"; this endpoint's own step stays the proof chip at its ending; with a path picked,
only the journeys whose step here ends on that path stay. Two looks, built as options (D-025.2): one chip per journey per side with
the ordered steps in its hover (the agent's pick, dashed) · every step as its own endpoint chip, in order. (B) the "no moment"
column's Proof cell names the journeys that cannot be ordered — the web/e2e groups the tests arm does not read, and tests with no
recorded walk — each with the reason. The D-055 evaluation row "journeys · not needed" is superseded for the pytest journeys.
Page-only: D-037's light checks. Reading the web/e2e reports is generation work, left for later.

## D-066 — His human-reader feedback on the all-endpoints page: fix each item, and name the pattern behind it
Date: 2026-09-30 · Input: his message at the handoff, and his dictated note "API Hover Legend Consolidation" (Wispr Flow,
2026-09-30), read on POST /cooking/sessions, BY MOMENT.
Decision, his: "I took my time to look at it as a human, and I ended up having a lot of feedback about it. The idea is to take
that feedback and work on it, but also identify the patterns, because we reach a point where we created all these endpoints
screens. Probably, for you as a model or machine reading all this information, it was there and well contextualized. … there
are a lot of things that were not obvious for the human reading this. Those things I would like to carry over later to identify
the patterns, so that we try to avoid that in the future. I don't expect that to be perfect, but we can build towards it,
including some of it in the GABE SUITE".
Consequence: every item of the note is logged in `legibility-feedback.md` BEFORE it is fixed — his words verbatim, where on the
page, what a human could not tell, the fix, a pattern tag named from that item's evidence, a status (round 1: 23 items, L-01 …
L-23). Each item is fixed under D-037's light checks; each ruling the note makes goes into this file in the commit that acts on
it (D-025.5); a representation he asks for is built as options with the agent's pick dashed (D-025.2). When the items are
worked, the tags are grouped into patterns — count, example items, why it was clear to the model and not to him — each with a
proposal for how the suite could catch or prevent it, shown on a generated page (D-025.8). Carrying a pattern into the suite is
a meta change: drafted, and nothing lands before his "land it".

## D-067 — One hover per item, in before · checks · gives; what a kind means moves to the row's legend
Date: 2026-09-30 · Input: his note "API Hover Legend Consolidation", legibility-feedback.md L-01, L-02, L-03, L-04, L-22; the hovers
investigation (P1–P5).
Decision, his: "something that repeats always with the same text, that is not something that we should put as a hover. Instead, it
should be something con— consolidated section, like a legend for a table" (L-01) · "we should consolidate in just one hover this whole
icon … the hover … between items contains the different information because they are different items" (L-02) · "both 4, 29 say. The
same, exactly the same … So I don't see the difference between one and the other" (L-03) · "in the row endings, at the beginning we can
have when we hover in top of the ending, we can show the different labels that we manage show" (L-04, the legend's place) · "whatever
dynamic information we have that should give in enough static context to be understandable … the input process and output like okay
initial conditions what are we checking then how are we checking that and then what are we producing" (L-22).
Consequence: (1) BY MOMENT: every chip is ONE hover — the kind label, the status square, the station glyph and the role label inside it
stay drawn (D-052) but no longer hover apart (D-044's precedent); the empty cells lose their native "nothing here" tooltip. (2) An
item's hover is its OWN facts in three parts in the order the code meets them — before (what must hold, what brings the code here) ·
checks (what it checks or does, and where) · gives (what comes out, and what that does) — for every kind BY MOMENT draws: ending,
own guard, deciding branch, catch, rate limiter, login check, table op, save step, function, handler, body, body field, reply, schema,
hook, file, screen, cache write, reason site, in-flight value, switch, piece, middleware, 422 rule, test case, journey. The generator
writes the lines from the feed (`_ae_io.io_of`, the one builder later kinds extend; words mo.io); a part the feed holds nothing for is
left out, never guessed. (3) The two 429s (his L-03) now lead with what makes each itself: the sensitive limit (7 routes, 23 endpoints,
checked at rate_limit.py:117, 20 per 60 seconds) and the global one (every request but /healthz, 79 endpoints, :121, 120 per 60 s); the
build now STOPS when two items of one block at one moment would read the same, naming them (on its first run it stopped on GET /recipes:
C316, C574 and C811 each fit several 400s at one moment whose words are the same — a proof now names where the ending it proves is
produced; C237's four chips on POST /cooking/sessions each name the status and the ending they prove). (4) The row's legend: pointing at a row's name
shows the kinds of item it holds and the labels its chips wear, each cloned as drawn, with what it means and how many are here — his
placement, the default, marked ruled (D-067). (5) Page-wide (D-017): no hover says where the page took its colour or icon ("as the table
draws it", "as the Gabe Universe draws it", the station's card); a table column's label, meaning and rating sit on its head only, with
each stage's meaning on a stage column's head and the findings' order on the dots column's head — a cell, a stage pip, a finding dot says
only its own. (6) THE ENDPOINTS' id cell is one hover; each item of ONE ENDPOINT's code map (a list item, a keyed name, a row of the
endings table) is one hover of its own, so pointing at a name no longer shows the field's words.
Options built (D-025.2): the legend's place — on the row's name (his, ruled, the default) · above the table, one line per row (the
external legend he named as the other option); the hovers' form — labelled lines, top to bottom (the agent's pick, dashed) · one
sentence, the parts joined by arrows. His to pick by seeing. Page-only: D-037's light checks.

## D-068 — BY MOMENT's shape: stages over the moments with the forks bracketed; the endpoint metadata out of the table; each row's head carries its pinned-row columns; the columns widen, hide and fit
Date: 2026-09-30 · Input: his note "API Hover Legend Consolidation", legibility-feedback.md L-05, L-06, L-07, L-20, L-21; the table and
lost-columns investigations.
Decision, his: "We can probably have another header row for principal moments, like the— the core stages, and inside we can put branches
of those stages … we need to have visibility of that" (L-05) · "put it in a different— in another row, separate from the table at the end.
Or at the beginning. With the metadata. And we can put labels on that metadata saying that some data pertains to the proof section, or the
data effects" (L-06) · "Same thing for "overview" and "risk". That is also metadata information" (L-07) · "those are interesting pieces that
I would like to see reflected here somehow" (L-20) · "Click the columns for accommodation … give a little more width … and to also hide
other columns … a button that will force accommodation by minimizing or moving the other columns around" (L-21).
Consequence: (1) his words — a row of stages over the moments; my reading of it — neighbouring moments of one stage share a cell, INPUT is
drawn twice in time order ("1 of 2", "2 of 2", D-053), the handler's own save stands under EFFECTS, the server starting, the screen and
what follows the answer share a cell named "outside the request", and each stage cell counts the endings that leave it. The generator
PROVES the stage of every ending's moment is the stage the pinned row's stages column reads for it. The seven-bar stage mark left the
moment heads. (2) his words — branches visible; my reading — the excepts of ONE try (its catches, grouped by the paths the feed records
through that try) and the moment the handler goes on to when nothing is raised are one fork, under a bracket "one of N" whose hover names
each way; the generator derives it per endpoint and STOPS when a path takes two ways of one fork, or a path through the try takes none
and does not leave inside it (55 tries, 119 ways on the feed). (3) his words — the no-moment column and the Overview and risk row leave the
table; my reading — an ENDPOINT METADATA block inside BY MOMENT, one card per block that has facts, headed by its mark and name, the
Overview first; what sums the endpoint up is drawn with the pinned row's own cell and head word (fate, steps, proven, alarms, behind,
pieces, lacks), what it is as chips; the proof's two counts stand one under the other, each saying what it counts (proven 2/14 — endings;
named 4/11, rank 3–6 of 80 — refusals). "Carried" is unchanged: the proofs read the record (r.mo.nm), not the drawing; the carry words
that said "stands at a moment" or "last column" now say "or in its endpoint metadata". (4) his words — the pinned row's sub-columns
reflected; my reading — each row's head repeats its block's columns of the pinned row with the same head words and this endpoint's values
(a shared column on the row that draws the most of its members — endings on Endings, tables on Data effects, guards and login on Gates
and decisions, reply on Structures; the stages column is the band), a click lights the members BY MOMENT draws and outlines the pinned-row
cell, and every chip's hover ends "counted in: …". Each row's head also carries an options slot for that row alone (for now, "hide this
row"); the table's options stay in the bar, grouped under labels (the table · the items · the columns). (5) his words — widen, hide, a
fitting button; my reading — a click on a head widens its column to what it holds (again gives it back), its × hides it, the bar lists
what is hidden with "show all", "fit to the box" makes the table fit; the state is kept through a resize and a reload, and the copy text
says the columns only when they are not as they open.
Options built (D-025.2), my picks dashed: the header — stages over moments with a bracket over the ways (my pick) · three rows, stage ·
road · moment; saving — under EFFECTS (my pick) · under HANDLER with an empty EFFECTS outline; the metadata — after the table (my pick, his
first words) · before it; a head's click — names whole (my pick) · every item on one line; fit — narrow the rest to strips of counts (my
pick) · wrap into bands. His to pick by seeing. The forks and the stage proof are display-side generation (D-063's lighter regime);
the rest is page-only: D-037's light checks.

## D-069 — Every element says what it is: a gate names its function, its condition and what happens; a function always wears its glyph; the client says what it fetches and which function reads the answer; in-flight values and Standard or specialist get their own look
Date: 2026-09-30 · Input: his note "API Hover Legend Consolidation", legibility-feedback.md L-09, L-10, L-11, L-12 (the R/W colour
only), L-14, L-15, L-16, L-17, L-18; the gates, functions-data, client, inflight-specialist and lost-columns investigations.
Decision, his: "if we have different gates and decisions, we should show the function method. Of the place where they are being
called … ideally a function with a function role. It's okay if the functions gets repeated" (L-09) · "we will most likely mutate that
to have a chain of functions. With the actual gates and decisions, like the flag or the condition that they are evaluating. And then
… the effect of that … we should encode that with some color" (L-10) · "can we also put some roles in the gates and decisions
themselves? I'm not sure about this" (L-11) · "Those two, if they are functions, they should be given a function, icon, and a role.
And I would like to know why we haven't done that" (L-14) · "the hook is kind of the frontend function … it's a fetcher. But what is
fetching and from where?" (L-15) · "Why do they trigger? In which context? A function I gave what is happening there" (L-16) ·
"I would like to give it an appropriate icon to that row … surface what we are affecting" (L-17) · "let's give it an icon also … I'm
not sure what what are we representing here … maybe can be merged with gates and decisions … tell me about that" (L-18).
Consequence (his asks, built; how each is drawn is my reading): (1) every gate and switch names the function it runs in — the
function whose raise or refusal the feed records at a check's line, a fork's and a catch's own function, the middleware a rate limit
runs in (RateLimitMiddleware, the station's middleware node, glyph, no role: the station draws no function node for its dispatch) —
as a station element with its glyph and role (D-052); the build STOPS when a gate runs in no function the feed names or a check is
recorded in two (704 gates and switches: 523 in a function, 181 in a middleware). (2) Each gate is a chain: its host, its condition
(a catch's "except …"; a fork's last arm "otherwise"), then what happens — the ending's status (a click lights it) or "returns" ·
"passes the error on" · "goes on" · "decides" · "can end at" (the TokenVerifier binding: either choice ends the same). (3) A function
always wears the function glyph, a name the feeds join to no function too; its role where a source knows it — the station's, the
lab's walk, then the station's own rule on the feed's own facts (accessor when the forms feed records a read or write in its body;
gate by `_a3_graft._is_gate_name`, read, never retyped; caller and pure never said here); with no role it wears glyph and name, and
its hover says what it does (where it is defined, the tables it touches, the in-flight value it reads: get_idempotency_key "reads
idempotency_key, set by IdempotencyMiddleware (idempotency.py:25)"). Why some have no role, answered for him here, not on the page
(D-017): the code map reads ten folders of apps/api; reference/, middleware/, i18n/, net/, streaming/ and config.py are not among
them, so the station draws no node for their functions. A class the handler builds (36: ActiveCookingResponse, RecipeDemand …) wears
its schema's or model's glyph, its function key second; the name index reads the forms feed's call rows (equipment_codes gains its
key). (4) BY MOMENT's R and W letters wear the code map's colours (read green, write orange). (5) The refresh chip names its trigger
("useStartCooking · on success · refresh ["cooking"]") and, one line each, the hooks whose saved answers it throws away and the GET each
sends again (useActiveCooking → GET /cooking/active, useRemindersDue → GET /cooking/reminders/due, from each query's own
invalidated_by); its hover names each reply, the tables it reads, and the tables this request wrote that it reads. (6) The client's
branches stand under the function they sit in (describeStartCookingError, the function glyph, no role: the station draws no node for
it), with the way the error comes (from useCookingLoopActions, error handed over at lines 303, 386, in RecipeBrowseContainer — the
feed's origins, each hop resolved to the frontend piece the c4 graph spans over its line); each line leads with its verb ("reads 409
×2 → “cooking.error.start_concurrent_cap”"), the reason-collapsed alarm where the feed flags it; an "any other status" line holds the
endings no branch compares (its does is not recorded — a feed gap, D-023); the hover title no longer ends in the feed's word "none".
The send cell reads in tap order: RecipeBrowseContainer → useCookingLoopActions (orchestrator, "sends it at 293, 382") →
useStartCooking; useStartCooking's hover says what it sends, that a failed send is not tried again, and where an error goes. (7) An
in-flight value's face is its kind's glyph in the row's one hue, its name, its type, its kind in plain words at its end ("from a
dependency", "setting at start", "built at start", "on the request"; a lock's kind is "held") and its lifetime in the pinned row's
words (request · server); a value the server keeps is filled, one that goes with the answer outlined, an unknown one dashed. (8) Each
row's head hover says the question the row answers (Gates and decisions, In-flight state, Standard or specialist). His L-18 question,
answered: the row asks "is this endpoint built like the others, and what is unusual about it?" — its switches are set by the server's
settings (79 of 80 endpoints carry the same binding and flag), its pieces are counted against the 80 endpoints (norm ≥ 9 in 10, rare
≤ 1 in 10); only the switches decide something along the way, so the merge is built as options. A rare piece says how rare it is
("6 of 80"). Every number above is the feed's; the build line says them (D-069 ·).
Options built (D-025.2), my picks dashed, each in its row's options slot (D-068): the gates — function a head, its gates under it (my
pick, B) · one chain per gate (A) · function · condition · effect side by side (C); the effect — the ending's colour with its stage lit
on a small spine (my pick, e1) · a band in a colour per stage (e2, a stage palette of mine); gate icons — an icon per kind (my pick, the
page's own glyphs: a gauge, a shield, a split, a reply, a sliders mark for a switch; their legend line says "my proposal: the station
draws no node for this") · one gate icon (a diamond) · none; gate roles — where it decides (my pick, R2: app-wide · at login · in a
dependency · in the handler · inside a call) · what it does (R1: refuses · translates · routes · passes on · swallows) · what a check
guards (R3: bad input · not found · conflict …) · none; function marks (lost-columns P2) — what it decides and touches: the statuses its
own code decides, R/W per table, the login check's own tables hollow (my pick) · name and role only; standard or specialist — split into
the gates (my pick, M1: a switch beside what it switches, "set by settings"; a rare piece a label on the item it names, "rare · 6 of 80",
a click lights the piece; its pieces and lacks stay in the endpoint metadata) · merged into the gates as they are (M2) · kept as its
row, in lanes "set by settings" and "rare here" (M3). The row marks: In-flight state an hourglass in its hue, Standard or specialist a
puzzle — my picks, dashed; timer and activity were the other candidates for In-flight, a star and a fingerprint for Standard or
specialist; the lab's section map keeps its no-page mark until he rules (D-036). My proposal for the review page: the pinned row's
"screen" head counts the hook that sends the request, not a screen — rename it "sends it" (lost-columns P3); his word stays until he
rules. Not built here: the data-effects connector diagram and the in-flight lifelines (C2), the bench (L-23). Feed gaps left as they
are (D-023, generation work): start_session's raise at services/cooking.py:129 is not joined to its 404 (its effect reads "not
recorded"), assert_recipe_allergen_safe's raise is not joined to this endpoint, the fall-through branch records no does, the via hops
carry no function names, and the code map does not read apps/api/middleware/ or reference/. Display-side generation (D-063's lighter
regime) and page-only: D-037's light checks.

## D-070 — What is affected, drawn across the moments: Data effects as a map of functions and tables; each in-flight value as a lifeline
Date: 2026-09-30 · Input: his note "API Hover Legend Consolidation", legibility-feedback.md L-12 and L-17; the functions-data (P-L12b)
and inflight-specialist (P3) investigations.
Decision, his: "put functions on the— in a block. In different blocks the functions on the left. And in the right the tables. And have
sort of a mind map that gives you the relationship between the functions and the tables. Where the connectors will describe the kind
of operation … In data effects we want to say, okay, we are affecting these tables, but how? With what function?" (L-12) · "inflight
state is basically some sort of temporary flag that we store or something like that, right, that will affect something. So the idea
here is visualize or surface what we are affecting. Um, So I would like to dig deeper on that to see possibilities on what we could
represent on that inflight state." (L-17)
Consequence (his asks, built; how each is drawn is my reading): (1) Data effects as connectors (his L-12): the generator turns the row's
placed chips into one record per endpoint (`_ae_rel.data_links`) — the functions in the order they first touch data, the tables in the
order they are first touched, each function → table its reads and writes in time order, a step with no table of its own (a flush, a
savepoint) a tick on the function's last write before it, a commit or rollback a rule naming who commits, the race on the link it breaks
— and PROVES it draws exactly the row's chips, each once, each at a moment one of its paths passes (feed-wide: 744 links, 1,000 reads
and writes, 138 links that read and then write, 179 ticks, 136 rules, 2 races). His colours, read as "write red, read green": the page's
own read green and write orange (red is the station's accessor label beside the function; amber its gate label); a function that reads
a table and then writes it gets both lines, green above orange, in that order. The path picker dims what a path does not run. (2) Each
in-flight value's lifeline (his L-17): the moment it is set, every moment that reads it (a middleware's read at the edge, a
dependency's in the dependencies, the handler's on its line or on the call its read hangs under — a line between two runs goes on into
the next), what each read can decide (an ending checked or produced at that very line, a rate limit checked there, the Idempotency-Key's
400 and its get-or-create claim on cooking_sessions), and when it dies — with the answer (on a picked path, where that path's answer
leaves) or kept by the server past it. PROVEN in the generator: a value is never read before it is set; an ending a read decides leaves
at or after the read, on one of its paths; a path that leaves inside a moment before a read there is not on that read (the 409 at the
checks leaves at cooking.py:125, before the key is read at :126 — 60 such dot-paths feed-wide); the claim is the placed write of the
claimed table. Values set together by one owner, read at the same moments and dying alike fold into one lane that opens (the seven
rate-limit values: "rate limiter · 7"; 80 folds, 446 values; 696 lanes, 701 read dots). 49 of the lanes' reads stand at no moment the
page can name; each is said on its lane's end ("also read at …").
Options built (D-025.2), my picks dashed, each in its row's options slot (D-068): Data effects — chips (as before) · a small map per
moment, inside each cell · one map for the endpoint, full width under the Data effects row (my pick, P-L12b's B; with moments as rows
it stands under the table); In-flight values — chips where set (as before) · a lifeline each (my pick, P3's A; with moments as rows,
each lane a rail down the cell) · echoes where read (P3's B). The Data effects row's head now says its question ("Which function reads or
writes which table, when, and is the write saved?"); the row legend names the new marks (a read's dot, the cross at the answer, the
arrow past it, the fold, the map's lines, ticks, rules and race). His to pick by seeing. Display-side generation (D-063's lighter
regime) and page-only: D-037's light checks.

## D-071 — The examples bench: one example of every kind of element, a column each, its controls below it
Date: 2026-09-30 · Input: his note 'API Hover Legend Consolidation', legibility-feedback.md L-23 (with L-08, L-13, L-11).
Decision, his: "I want a section where we put an example that we can change like let's say an example of a table an example
of a schema example of uh a test example of how we represent a function and so on … let's do for endings too … it will be
different columns one by other one by one throughout. The width of the page … each column will contain the title with the
selector of the element that we are showing … and if they have roles also the role to look for filter for roles then the the
representation itself of the element we already have defined that for the tables so we can pick it up … and after that we will
put the controls … where we can drag and drop the different elements that we show inside uh show show them or not size color";
for tests (L-08): "the data structures, the functions, the models … the gates and decisions … in-flight states … what is being
tested"; for functions (L-13): "with a little bit more of detail. And in blocks".
Consequence: a section EXAMPLES (`sec-ex`) stands between ONE ENDPOINT and BY MOMENT and follows the endpoint the table has open.
His words decide: the section and its place; one column per kind in his order (ending · table · schema · function · test ·
gate or decision · client hook · in-flight value), each a title, a selector with a role filter, the element drawn, and below
it the controls — the parts dragged between the lines or out of the block, their size, the colours — and a copy button; the
table's look is his DATA line (D-027), lifted from the lab and proven word for word by the build against probe-eplab.mjs.
The agent's picks: every kind is drawn in the lab's block anatomy (title lines with a left and a right side → a strip of
marks → a list a click opens → ONE hover in · does · out, L-22); the schema and the function boot on the lab's own looks (its
SCHCFG and FNCFG, not ruled); the ending, test, gate, hook and in-flight parts, lines and sizes are mine (dashed). The test
block (L-08) opens on the ordered chain its request runs through here — request → checks passed → branch → functions → tables
(saved or not) → ending — and says what the test does not tell (the body, header values a fixture sets, which of n ways to a
status it takes, what one step hands the next, checks inside a loop) as facts about the test. The gate column's role filter
(L-11) reads nine roles from the feed's own groups (rate limiter · login scheme · login check · field rule · own check · check
one call down · branch that picks the answer · catch that translates · switch), each block naming the function it runs in
with its role (L-09) and its effect (L-10). Options built (D-025.2), my pick first: the columns — one row across the page
(sideways when narrower) · wrapped rows · an upper and a lower row; the element lit elsewhere — the column follows it · stays;
per column, which elements — this endpoint · every endpoint (an element not on the open endpoint is drawn as on the first
endpoint that has it; the role filter then counts every role it has anywhere); hiding a part — dragged into "not drawn" (the
lab's on/off picks are not repeated). A kind whose arm the feed lacks says absent. Not built: EX-5, the bench's looks drawn in
BY MOMENT's chips (one hover per chip, L-02) — trigger: he rules a kind's look; that look then becomes the words file's default
("ruled") and a BY MOMENT cell option "blocks from the bench" is built and decided by seeing. Page-only: D-037's light checks.

## D-072 — The review pages: more width, icons with one legend, a spoken summary at the start of each section
Date: 2026-10-01 · Input: his message after reading legibility-review.html (legibility-feedback.md L-24..L-26)
Decision, his: "I have been looking at the page. It's very dense. We can use more width to better accommodate the tables. There are
some rows that might benefit from this and end up in one row only. The status column, for example, in the first table on the What
Round 1B Left, is using two rows. It can change to just one. Can we also use more encoding using icons and summarize things? At the
beginning of each set of tables, I would like a summary that I can copy and paste and read out loud in a chat that I have dedicated
to reading out loud your messages."
Consequence (his asks, built; how each is drawn is my reading; the listen button is my proposal): (1) Width (L-24): the page's column
stays centred and takes the screen, min(96vw, 1800px), so 1800 px at 1920 and 1536 at 1600, and every table spans it. A table's
columns are of two kinds: a short value (an id, a count, a status, a kind, a verdict, a mark) never wraps, a prose column takes the
width that is left. The status of a What round 1b left row is now two marks on one line, and an item card's keys no longer wrap.
The probe measures it at 1920 and at 1600: 779 cells of short-value columns in 28 tables, none taller than one line, no table wider
than its box, no sideways scroll; the page still reflows at 390. (2) Icons (L-25): 39 inline-svg marks (Lucide geometry, the
gabe-artifact kit's own; legibility-review.icons.json, geometry only, no words) for fixed, partly fixed, left, open, yours to
rule, my pick, yours, ruled, built, waiting on your pick, question answered, logged, the three kinds of open row, how a measure
moved and what a question is about; and one mark of its own for each of the 10 patterns (the build stops on a pattern with none or
two sharing one), drawn on cards, chips and tables. The words stand once, in a legend under the page's head (7 groups, the patterns
last), and in each mark's hover; a table cell shows the mark and its number. Prose counts became stacked bars (fixed, partly, left,
yours to rule) per item, pattern and question, and five overview tables open Your items, The patterns, Your calls, Your questions
and What round 1b left. (3) Spoken summary (L-26): each of the 8 sections opens with 3 to 6 sentences in plain words, an item or a
pattern by its name and never an id, a path, a symbol or code, with a "copy to read aloud" button whose copied text is the text
shown; "copy every summary" at the top copies all 8 in page order, each headed by its section's name. The summaries are GENERATED:
the words file holds sentence templates, the generator fills every number from the data, and the build stops on an id, a path, a
symbol, a quote, a {token} left in, or a sentence count outside 3 to 6. (4) My proposal, drawn dashed because you did not ask for
it: a listen / stop button beside each copy button, and one for every summary, using the browser's own speech (free, nothing sent
anywhere, works in Windows Chrome). It prefers an English voice named Natural or Google, reads sentence by sentence, has one speed
control (slower, normal, faster) the browser remembers, and hides where the browser has no speech. The round-2 items (L-24..L-26)
sit as the last 3 cards of Your items, built and not yet reviewed, and wear no pattern (patterns.json is round 1's record). The
page's work head counts the reviewed work and no longer the two logs (the ledger and this file), which are written in the same
commit as the page and could never name their own commit. Page-only: D-037's light checks (generator --check, the probe once: 42
passed, a picture of each section's top at 1920 and at 1600).

## D-073 — A voice lab: one text read by every voice, every setting tunable, one copy button
Date: 2026-10-01 · Input: his message after the text-to-speech exploration (D-072).
Decision, his: "I would like to dedicate one iteration to creating an artifact, maybe dedicated to just voices, different kinds of voices
in a given text, with things that I can tune out, like options, if it's possible. I can decide on the voice with a copy button, so I end
up copying back the configuration that I want for the voices."
Consequence: a voice lab page in `legibility/voices/`: a text he can edit (it opens on the review page's spoken summaries); every voice
his browser offers, played live, with its settings tunable (voice, speed, pitch, volume, the pauses between sentences and between
sections, whether section names are read); the free local voices (Piper) rendered on this machine as samples at three speeds; what
ElevenLabs and Kokoro would need, said plainly; one copy button that writes his configuration as a line to paste back. The pick is kept
in one saved voice setting (`gabe:voice:v1`) that the review page reads too. The defaults are the agent's picks, dashed (D-025.2); his
pasted configuration becomes the ruled default. Published as a private Artifact when built.

## D-074 — While a voice plays, the review page's contents bar freezes at the top and steers the reading
Date: 2026-10-01 · Input: his message, logged as legibility-feedback.md L-27.
Decision, his: "when we put a voice, I would like it so that when I scroll down, the header navigation bar gets frozen on the top section.
That way, I can stop or skip to a later section of the transcript, and it will also take me to that section on the page."
Consequence: on the review page, while a voice plays the contents bar sticks to the top with play/pause, stop, the previous and next
section and the sections themselves, the one being read lit; a skip moves the reading AND scrolls the page there. "Only while a voice
plays" is his reading and the default; "always" is an option (the agent's, dashed). The page reads the saved voice setting the voice lab
writes (D-073). The voice lab uses the same bar.

## D-075 — His voice: Google UK English Female, speed 1.15 — the default for every page that reads aloud
Date: 2026-10-01 · Input: the line he copied from the voice lab (D-073).
Decision, his: "this is my pick VOICE · engine browser · voice Google UK English Female · lang en-GB · speed 1.15 · pitch 1.0 · volume
1.0 · pause between sentences 250 ms · between sections 900 ms · section names read · yours: voice, speed, pitch, pause between sentences
· still my pick: volume, pause between sections, section names"
Consequence: one file, `legibility/voices/voice.ruled.json`, holds the pick, and both page builders read it. RULED (his): voice Google UK
English Female (en-GB) · speed 1.15 · pitch 1.0 · pause between sentences 250 ms. Still the agent's picks, at the same values (his line
says so; a "my pick" is never a ruling): volume 1.0 · pause between sections 900 ms · section names read. The voice lab opens on it with
his four values filled ("yours") and "back to the default" returns to it; the review page reads in his voice when the browser holds no
saved setting (before, it had no pause and speed 1). His voice is one of Chrome's online Google voices: where it is missing (Edge, another
browser) the pages fall back to a British Google voice, then an English Natural or Google voice, then the browser's default, and say so.

## D-076 — The player bar shows all the time on pages that read aloud; every future artifact gets it
Date: 2026-10-01 · Input: his two messages after D-075, logged as legibility-feedback.md L-28.
Decision, his: "when we scroll down, we still show the bar with the reproduction of the audio and some hashtags or markers to transport
to the different sections of the artifact page. This is especially where we have to make some decisions and change the audio that we
are reproducing. Also, I would like to save this for any future artifact that we create, especially with the GabeArtifact skill." —
then, having played it: "I just started reproducing the audio, and the bar appeared, and it's perfect. The only thing is that I would
like to see that bar all the time on this kind of artifacts."
Consequence: (1) the bar as built (D-074: play/pause, stop, previous and next, the section chips that move the reading and the page, the
speed) is kept as it is; its default becomes "always" — his ruling, on the review page and on the voice lab — and D-074's "only while a
voice plays" becomes the other option. No decision markers are added: his second message says the bar is right as it stands. (2) "save
this for any future artifact": recorded as his standing preference at once; the gabe-artifact change (the read-aloud bar + the spoken
summary rules as a reusable part) is a suite change, so it is drafted first and lands on his "land it" (iterate-before-implement).

## D-077 — The bar's menu nests by section; every decision gets its own spoken summary and a plain line
Date: 2026-10-01 · Input: his message after D-076, logged as legibility-feedback.md L-29.
Decision, his: "I would like to have a more indented way, like with dropdowns, maybe by sections, because I also want to implement
summaries, especially in the parts where we have to make decisions, including some explanation using gabe-lens plain."
Consequence: on the review page the bar's section chips become dropdowns, each listing its decision points indented under it (the looks
to pick, the proposals, each pattern's land-it choices, the L-19 recommendation); a section with no decision stays a plain chip. Each
decision gets a short spoken summary (what it decides, its options and what each sets in motion, my pick, his pick when made — generated
from the page's data) and one sentence in the gabe-lens plain voice saying what it means for him; picking a decision scrolls the page
there and moves the reading to it. Scoping the summaries to decision points is the agent's reading of "especially in the parts where we
have to make decisions", his to widen. The read-aloud draft for gabe-artifact (D-076) takes the same nested shape.

## D-078 — Every decision shows an example and its impact; every icon's hover follows this round's hover rules
Date: 2026-10-02 · Input: his dictated message after D-077, logged as legibility-feedback.md L-30 (the "read as" line is the agent's
reading of the dictation, his to correct).
Decision, his: "include examples a d impact on the desición items and for icons use the rules we identified to.pjt text to show about the
icons when we hover them"
Consequence: (1) each of the 53 decision cards (and its spoken summary) gains an EXAMPLE — one concrete case from the real page (POST
/cooking/sessions on the frozen feed) of what the choice is about — and the IMPACT of each option: what changes on the page, for him, or in
the suite if he picks it, generated from the page's data where the data holds it and authored with tokens where it does not. (2) every
icon on the review page gets a hover written by the rules this round named (D-067, D-009, D-017, the patterns P1/P2/P7): one hover per item
(an icon inside an item adds to that item's one hover; a standalone icon is its own item); the hover says the item's own fact in plain
words, in before · checks · gives order where it fits; what a kind of icon means is said once, in the legend; a control's hover is very
short (a verb and its object); no word about the page or the map. The read-aloud draft (D-076) takes the example and impact fields too.

## D-079 — Every pattern and decision opens with the pain, a gabe-lens analogy, and the cost of solving it
Date: 2026-10-02 · Input: his message after D-078, logged as legibility-feedback.md L-31.
Decision, his: "The explanations used and read aloud in each one of the items on the patterns or the places where I need to make decisions
are still too cryptic for me and difficult to follow. Can you use more analogies powered by the Gabe Lens? Especially, I would like to know
the pain that we are trying to solve and the cost of solving it."
Consequence: on the review page each of the 10 patterns and the 53 decisions gets, before anything else, written in his calibrated suit
(Sequential-Procedural, ~/.claude/gabe-lens-profile.md): THE PAIN — what goes wrong for him today, as a step that fails, with the real case
and its count; ONE ANALOGY — a process he knows (a recipe, an assembly line, a protocol), with where it stops; THE COST — what solving it
takes (work, his time, run time, what it adds or bends) and what not solving it costs; a ONE-LINE HANDLE. The patterns also get the suit's
box, DOES / DOES NOT / DECIDES WHEN. They are read aloud in that order, before the options. Numbers are generated; the words are authored with
the gabe-lens method and checked for jargon.

## D-080 — The decision and situation blocks wear icons and visual encodings; each icon's hover explains it
Date: 2026-10-02 · Input: his message during the D-079 build, logged as legibility-feedback.md L-32.
Decision, his: "in all these blocks where we are trying to communicate something that needs to be decided or a situation, let's use more
icons and more visual encoding of the meaning that we are trying to communicate. Remember that the icons, when we hover on top of them,
should give a little explanation of what they are trying to communicate."
Consequence: built in the same pass as D-079: the pain gets an icon and a meter of its real size; the analogy an icon for its kind of
process; the cost a small/medium/large meter beside the "if not" mark, a cost-versus-pain balance where it fits; the handle a pin; a
pattern's steps become numbered chips joined by arrows with the failing step marked; its box reads as does / does not / decides-when marks;
each option's impact is marked as a gain, a cost or neutral. Every icon's hover says what it communicates there (D-078's rules: one hover
per item, the item's own fact, a kind's meaning once in the legend, controls a verb and its object). Sizes come from the page's data.

## D-081 — His review of round 1: the looks he ruled, the suite proposals he lands, the ones he changes or defers
Date: 2026-10-02 · Input: his REVIEW text from legibility-review.html (head "REVIEW · legibility r1 · 8d02cb1a · gustify @05007957 ·
7bb7b1b", "41 yours · 12 left as my pick"). A line "my pick, not ruled" is NOT a ruling and stays my pick.
Decision, his (each line as he gave it):
- LOOKS RULED (all-endpoints.html): legend on the row's name (already D-067) · hovers as labelled lines · metadata after the table · a head's
  click puts every item on one line (over my "names whole") · fit wraps into bands (over my "narrow the rest") · heads ride under the pinned
  row · gates as the function with its gates under it · the effect in the ending's colour with its stage lit · an icon per gate kind · gate
  roles "where it decides" · function marks "what it decides and touches" · standard or specialist split into the gates · data effects as a
  small map per moment (over my "one map for the endpoint") · the page's colours for writes · a test's earlier requests get their own moment
  · in-flight values as a lifeline each · bench columns as an upper and a lower row (over my "one row") · a click elsewhere: follow it ·
  bench scope: this endpoint · open fitted when it is wider than the box (R-11) · player: the bar always (D-076), follow the reading on.
- STILL MY PICK, NOT RULED: the header (stages over moments) and saving (under EFFECTS) — "I can't see the difference … in the screenshots,
  they show the same thing"; every bench kind's look except the table's (D-027); F24 (rename "screen"), the L-19 Security recommendation and
  EX-5 — "I will need a better depiction of what would happen on the different options on this. I don't get what is happening here";
  after a decision: stop there.
- SUITE PROPOSALS — LAND IT: A1 (the legibility audit) · P1.1 · P1.2 · P2.2 · P3.1 · P4.1 · P4.2 · P5.2 · P7.1 · P7.2 · P8.1 · P8.2 · P9.1 ·
  P10.1 · P10.2.
- CHANGE IT: P3.2 — "For new kinds of elements, the idea is not to create them dynamically … put them with a generic label, like 'unknown'
  maybe, and then be able to check all the unknowns … a skill or tool to evaluate which ones deserve to be considered included in the kinds";
  P2.1 — "I would like to be able to produce a better corpus that has these rules embedded, rather than generating something, then correcting
  everything … label different parts, such as hovers related to endings, databases, schemas, functions … and then check those dynamically …
  one final pass, something like that, but I don't want to have n passes by the n points of view".
- NOT YET: P5.1 — "too much for now … we might end up solving this during the consolidation of our navigation bar … a very shallow version,
  like a very quick check or a use case"; P6.1 and P6.2 — "Our work should lean more toward how to structure the data better instead of trying
  to identify confusion among different definitions … I prefer to focus on encoding, structuring, grouping, movement, coloring, shapes, icons".
- On P1.1 he adds: "we can repeat some information in the hover, but only a small part … if they are going to contain similar content, it
  should be a label or a very short note … The majority of the hover information should be used for the content that is actually changing …
  if we have to explain something complicated regarding the label or the concept … put it in a separate appendix, like in the legend section".
Consequence: (1) the ruled looks become the pages' defaults, marked ruled; (2) the landed proposals are carried into the suite (skills,
references, the audit tool with its battery, the execution contract, the page generators' build checks), each with fixtures that fire and
stay silent, install and a clean doctor; (3) P3.2 and P2.1 are redrafted to his words and shown again before they land; (4) P5.1, P6.1 and
P6.2 wait — trigger: the navigation bar's consolidation; P5.1 may become a shallow quick check then; (5) his other notes are logged as
legibility items L-33 … L-39 and worked: the frontend lab's hover format for every hover (L-33), the identical pictures (L-34), clearer
depictions of unclear options (L-35), a simpler bench (L-36), a resizable widened column (L-37), sliding a wide table with Shift and the wheel
(L-38), and dedicated bench sections for the gate card, the stage encoding, gate roles, function marks, the standard-or-specialist split and
the metadata layouts (L-39, a later design pass — trigger: this pass lands).

## D-082 — The pending choices are already gathered: the dashed circles in the bar's menu (no new section)
Date: 2026-10-02 · Input: his message after the round-3 page pass, logged as legibility-feedback.md L-40, and his follow-up with a screenshot
of the "Your calls" menu.
Decision, his: "On the legibility review, can I get a section or a button for the pending decisions where we updated the content for me to make
the decision?" — then: "Seems like I can't see them in the circles that are not with the checkmark in this table, right? If that is the case,
just tell me, and I will go through them."
Consequence: confirmed — in the bar's menu every dashed circle is a choice still waiting on him and the count on the "Your calls" chip (12) is
exactly those: the header, saving, the seven bench kind looks, F24, L-19, EX-5 (the "after a decision" option sits in the bar's player
options). He goes through them from there; no "decide now" section is built. His round-1 review text is kept as a record
(`legibility/review-r1.his.txt`) for when a page has to know what still waits on him.

## D-083 — A card's layout is decided on the all-endpoints bench, not on the review page
Date: 2026-10-02 · Input: his message after D-082 ("eligibility review" read as the legibility review — dictation).
Decision, his: "all the decisions that are related to the layout of any card for any element, let's leave them to be determined in the All
Endpoints screen, where we have these cards. I will do the modification there and will let you know about the configuration that we should
follow … we can defer these decisions on the eligibility review for now, pending a decision about those elements in the All Endpoints section,
which is after we finish with this one. For example, for each card, the decision should be made in the All Endpoints, not here in the
legibility".
Consequence: on the review page the pending card-layout choices — the seven bench kind looks (ending, schema, function, test, gate or decision,
client hook, in-flight value) and EX-5 (the bench's looks in the table's chips) — are marked DEFERRED, decided on the all-endpoints bench; they
leave the count of choices waiting on him and the copy text says where they will be decided. Still pending on the review page: the header and
saving (the table's layout), F24 and L-19. Trigger to take them up: the legibility work is finished; he then configures the cards on the
all-endpoints bench and pastes the configuration (the bench's copy lines), which becomes the ruled default. His card rulings in D-081 stand,
and their refinement joins the same bench work (L-39). The agent's sorting of which choices are card layouts is his to correct.

## D-084 — His second paste of round 1: the header, saving, F24 and L-19 ruled; Security becomes a ninth row
Date: 2026-10-02 · Input: his REVIEW text from the review page (head `bff9244a`), kept as `legibility/review-r1b.his.txt`.
Decision, his: the header stays **stages over moments** and saving stays **under EFFECTS** (both "yours, same as my pick"); the pinned row's
Client column is renamed **"sends it"** (F24); L-19 is **G2 · a ninth row, Security**, over my pick G1 — "9th row because security might grow in
the future." His other lines repeat D-067 · D-076 · D-081 · D-083 unchanged. `pl.after` (what the player does after a decision) stays "my pick,
not ruled" — open.
Reading: every note on his lines except L-19's is the text of his round-1 notes, word for word (the page keeps a note in his browser), so they
are read as carried — already logged as L-33 … L-39 and the D-081 redrafts — not as new feedback. If a note is new (the header and saving
pictures still showing him no difference), he says so and it is logged.
Consequence: on all-endpoints.html the Client head reads "sends it" on the pinned row, on BY MOMENT's Client head and in every hover that names
the column; BY MOMENT gains a ninth row, **Security**, after Gates and decisions. Its home facts — the app-wide middleware in run order, the two
switches that turn a check on, the CORS allowed origins and the secrets read on the path (the last two read from the feed's settings, "not
recorded" where the feed lacks them) — sit in the Security row in full. The security facts that already live in other rows (the 401 and 429
endings, the limiters, the users row the login adds, the login check, the repeat key) are a choice made alone, so it is built as options
(D-025.2): **a short mark in Security that points to its home row** (my pick, dashed) or **moved into Security**. The review page reads both
records in order, so a fresh page shows these four ruled.
Revisit if: a security fact appears on another endpoint that fits neither the home facts nor the marked ones — it is added to the row's roster
by name, never by guess.

## D-085 — Swaps deleted; the read-aloud bar lands; my recommended picks become his; "go" on the queue
Date: 2026-10-02 · Input: his message "I confirm delete the old swaps. also land it use recommended approach on pending esicion. go"
("esicion" read as "decision" — dictation).
Decision, his: (1) the two old WSL swap files in Windows Temp are deleted (done: `1E706178…` 4.57 GB, `3A761F6D…` 0.88 GB; the live
`5C520C0D…` kept; C: 49 → 54 GB free). (2) **Land it** — the read-aloud bar (D-076 … D-078, draft `legibility/drafts/gabe-artifact-read-aloud/`)
lands in the gabe-artifact skill, under the full proof regime for suite code; the draft's eleven open choices take the draft's picks (its
README, "Open choices"). (3) **The recommended approach on the pending decisions**: the Security look is **marks to their home row**
(`mo.secmv`), the player's after-a-decision is **stop there** (`pl.after`). (4) **Go** on the queue: P4.1 · P8.1 · P10.1, the P3.2 and P2.1
redrafts, L-33, L-39.
Reading: "use recommended approach" is read as covering the choices that carried a recommendation when he wrote it. The rate limit middleware
standing twice in the Security row had none yet, so it is built as an option — **merged** (the switch nests inside its numbered middleware;
my pick, dashed) or **apart** — and stays his.
How the queue is built — his P2.1 note (D-081) governs it: *"produce a better corpus that has these rules embedded, rather than generating
something, then correcting everything … label different parts, such as hovers related to endings, databases, schemas, functions … and then
check those dynamically … one final pass, something like that, but I don't want to have n passes."* So P4.1 (both ends of a relation), P8.1
(a count's label from its own definition; state words) and P10.1 (a standing rule gets a check on a running rail) are built as checks AT
EMISSION over labelled hovers — every hover is made by one emitter that knows its element's kind, and the rules for that kind run as it is
made — not as passes over a finished page; the audit A1 stays the one final pass. L-33's card (the endpoint lab's hover format, its origin
traced first) is that emitter's one output. P2.1 and P3.2 are redrafted to his words and shown for a new "land it" (P3.2's note: an unknown
kind gets the generic label "unknown", accumulated and judged in batches by a tool, never labelled live). L-39's bench sections follow, on
the same emitter.
Revisit if: a rule cannot be checked at emission (it needs the whole page, like twins across sections) — it stays in the audit, by name.

## D-086 — Lean testing and a disk that is not rewritten: restore points, compaction, browsers in memory
Date: 2026-10-03 · Input: his message "I want to do 1, 2, and 4. Also, what are we gaining with so much testing from the doctor? Since these
pages are not an actual application, they are just showcases of something, so testing them really isn't a test of the app itself. I don't
know what we are actually gaining with this."
Why it came up: C: fell 54 → 33 GB in an evening of agent builds while no file grew (the WSL vhdx, Docker's vhdx, the swap file and the
pagefile allocation byte-identical; −15 GB/h building, −5 GB/h idle). WSL had WRITTEN 49 GB to its disk in 37 hours while storing little — our
outputs are small (the endpoints page 8.8 MB, every walk picture 118 MB), the rewriting is not. Suspected sink: Windows restore points copying
every overwritten block (unconfirmed until his admin check).
Decision, his: (1) cap restore-point storage — `C:\Users\Gabe\disk-fix\1-restore-points.ps1` (admin; reads first, asks before capping at
15 GB); (2) compact the WSL disk file (383 GB holding 231 GB) — `2-compact-wsl.ps1` with every WSL window closed; (4) we write less.
Item 4, measured: one review-page check writes 222 MB to the WSL disk with Chrome's throwaway profile in /tmp, and 2 MB with it in /dev/shm
(idle noise ≈ 5 MB). Built: `~/.local/bin/heavy <command>` — one heavy job at a time (lock `/dev/shm/heavy.lock`), TMPDIR in RAM, a C: floor
of 40 GB checked first (exit 3; HEAVY_FORCE=1 overrides).
The answer to his question, and the testing rule that follows (my proposal under his "4"; his to overrule): the doctor never tests these
pages — it tests the suite code that runs inside his real apps (hooks, map generators, forms arms, map tools), which is real software. The
waste was running ALL of it (66 test folders, 11 with a browser, 6–14 min) for a change to one skill. From now on: a suite change runs only
that skill's batteries plus the parity check (`GABE_DOCTOR_NO_BATTERIES=1 scripts/suite-doctor.sh`, seconds); the full sweep runs once,
before a push. A design page: its check once per batch of edits; a walk only when a click path is handed to him (D-025.4), re-shooting what
changed. Every browser run goes through `heavy`.
Revisit if: a break in an untouched battery reaches a push sweep twice — then the per-change set widens to the batteries that import the
changed files.

## D-087 — A bench column keeps its size; its width control narrows only the element it draws
Date: 2026-10-03 · Input: his message with a picture of the EXAMPLES bench (ending · table · schema · function columns at the default width).
Decision, his: "in the All Endpoints section, where I will test different configurations, I want the size of the squares for each element to
remain the same. It doesn't matter if I change the width. The full width is something we are not going to use. We are only going to use the
original one, the default one at the beginning, like in the screenshot, or the last three options. If I select any of the last three options,
the only thing that should change is the width of the element we are working on, not the width of the entire square for the element's
configuration".
Consequence: each bench column's width options (L-36: dynamic · full · shorter · compact · most compact) become **the default (as in his
picture) · shorter · compact · most compact** — "full" is removed. A column's box — its head, its parts lines, size and colour controls —
keeps the default size whatever width is picked; the width narrows only the drawn element at the top of the column. A saved "full" reads as
the default. The width still rides the column's copy line.

## D-088 — The endpoint lab's hover card is the hover of the endpoints page: the cells and every bench example first
Date: 2026-10-03 · Input: his message with a picture of the endpoint lab's hover on the `locations` table block (glyph and bold name · the
entity in its colour · the class · the file · a rule · the channel pill "reads" · the field count and each mark with its count · a footer
"click to open its whole record in the portrait").
Decision, his: "I need that for the hover information that we show, especially on these cells. In all the examples, we go and check how we
did it in the frontend lab. As you can see in the screenshot, the hover that we show there is much more beautiful, better structured, and
more detailed. It communicates better with symbols and colors what we want to say there in the hover."
Consequence: L-33 is confirmed and phase 2 (D-085) starts on all-endpoints.html: every element hover — the BY MOMENT cells' element chips and
every element on the EXAMPLES bench — is drawn by ONE card renderer in the lab's format (traced in `legibility/drafts/hover-and-corpus/`):
head (the kind's glyph and colour, the bold name, a value at the right) · the identity lines with their icons (entity in its colour, class,
file) · a rule · the element's own pills and marks with counts · a rule · a quiet footer naming what a click does. The card mirrors the
element's own block (same glyph, colour and marks, as the lab's block card mirrors its block) and adds the detail. The rules of P1.1 · P2.1 ·
P4.1 · P8.1 are checked as each card is made (D-085). The kind-level plain line stays only on control and head cards (my pick, not ruled —
the research flagged that a kind's line repeated on every item is what P1.1 forbids). The review page joins later.

## D-089 — An element's block has hover REGIONS: the glyph and status, the title, and each item of the last row
Date: 2026-10-03 · Input: his message while configuring the ending on the all-endpoints bench (dictated; "52 elements" read as "the two
elements", "reference titles" as the block's title words).
Decision, his: "for the ending, I am working on the configuration. The configuration so far is super good. The only thing that I would
change is the hover. In general, the hover should work as it is today. For example, if we hover over any of the [two] elements, which is the
icon of the glyph and the status, it should give a different hover only regarding the glyph and the status. For the items at the end in the
last row, each item should have its own hover notice about what it is. That way, we will have three regions for hovering: the first section
for the two items, for the [title], and then for each one of the where sections."
Consequence: on the ending block (the bench, and wherever the bench's ending look is drawn) hovering is split by part: (1) the glyph and the
status → a card about the glyph and the status only (the kind of ending and what the status means); (2) the title and the block's other parts
→ today's full card (D-088); (3) each item of the last row (the where line) → its own card saying what that item is. The regions follow the
parts wherever he places them on the bench (a part carries its region), so the same mechanism serves the other kinds when he configures
them. His bench configuration in his browser (saved settings, the copy line) is kept as it is. Assumed (his to correct): the stage and the
ways count belong to the title region.

## D-090 — Every element kind hovers by region, as the ending does
Date: 2026-10-03 · Input: his message after D-089 ("endpoints" read as "endings" — dictation).
Decision, his: "Let's apply this not only to the [endings], but to all the other elements that have a similar structure, which I think are
all the elements."
Consequence: the three hover regions of D-089 go on every kind of the EXAMPLES bench — table, schema, function, test, gate or decision, client
hook, in-flight value — and wherever the bench's look of a kind is drawn. The same rule picks each kind's parts (a choice made alone, his to
correct by one table entry): **glyph and status** = the glyph plus the coloured pill that classifies the element (a table's reads/writes, a
schema's in/out, a function's role, a test's state, a gate's role, a hook's role, an in-flight value's lifetime); **title** = the name and every
other part (today's full card); **each item** = every location part (file, where, class, set by) and each mark of the strip, one card per item.
His bench configurations stay as saved (keys, part ids, copy lines unchanged).

## D-091 — The bench blocks take the lab's type, icon size and line alignment, and its field marks: paler when nullable, corners when unique
Date: 2026-10-03 · Input: his message with a picture comparing the all-endpoints bench's `users` table block with the endpoint lab's.
Decision, his: "The font is different. I don't know if maybe the icon size is different. In the endpoint lab, we have the lines actually
aligning, and not in the old endpoints. We should fix that. Also, there is some encoding for the keys that can be null or not on the tables.
There are some markers in the corners … We should apply that in the table section here, and we can do the same for anything similar on the
other elements. Maybe in other elements, we might do that with different colors … We might do the same on schemas if there is something like
that. For functions, endpoints, gates, or any other element, we might do something similar, but maybe in the other corners or with other
colors, if we have to do some encoding like that."
Reading (from the lab's code, `_lab-ep-panels.js` sqNode + `_lab-ep.css` "THE UNIQUE CORNERS" / "FIELD-MARK OPACITY"): in the lab the
CORNERS (an L at top-right and bottom-left, accent colour) mark a UNIQUE column; a column that CAN BE NULL (`| None`) is drawn PALER (the
optional stop of one opacity bar). Both come over.
Consequence: (1) every bench block (and the bench look wherever drawn) takes the lab block's font (monospace), sizes (icon 13 · name 13 ·
other parts 12, read from the lab's BKDEF) and alignment (a fixed icon column, so each line's text starts at the same x); (2) the TABLE block's
field marks become the lab's: type-coloured marks, nullable paler, unique cornered; (3) the SCHEMA block's field marks take the same mark,
with an optional field (not required) paler — the schema's analogue of nullable; (4) other kinds get a corner or colour encoding only where
the feed carries a real yes/no property of the same nature — proposed as options with my pick dashed, never invented.

## D-092 — The gaps between a row's icons hover nothing; no legend under the field marks
Date: 2026-10-05 · Input: his message after D-091, with two pictures (the ending's strip hovered; the `users` block with its legend row).
Decision, his: "when I hover in the last row on the end, for example, or in any other row that has this kind of thing, there is a little
moment where I show the hover for the whole block … What we could do is put a container around all these icons and make it so the container
doesn't offer any hover action. Instead of showing the huge hover, which is for the whole container, we don't show any hover when I am moving
from one to the other." And: "in Users and other places where we have this notation with the optional and unique [encoding] on the icons, we
also put the legend … We don't want that. In the endpoint lab, we are not putting that there. That is information not necessary."
Consequence: (1) every group of a block's hover items that sit side by side — the strip's marks, a part's items, tagged parts next to each
other on one line (the glyph and its status, a gate's function and level) — is a QUIET BAND: in a gap between two of them no card shows,
neither the item's nor the block's; on the items each card shows as before, and the rest of the block (its title, the empty rest of a row)
still shows the block's card. D-089's "a gap keeps the block's own card" is replaced for gaps inside a band. (2) The legend row under a table's
and a schema's strip ("optional 2 · unique 2", and the item-4 option's entry) is removed; what a paler or a cornered mark means stays in
each mark's own card. Chosen alone (his to correct): the band is the group's own outline, computed at hover time, not a wrapper element — a
wrapper would move the lines D-091 aligned to the lab's pixels and would not follow a part he drags elsewhere.

## D-093 — The bench's controls, second revision: fixed glyph and marks, a form per part, a hover switch per part
Date: 2026-10-05 · Input: his two messages after D-092 ("the two controls" read as "the controls" — dictation).
Decision, his: "I want to have a second revision in the options for each example of the different elements because they are too generic.
If we look in the endpoint lab, we have better options for the containers for the tables, for example: - The size of the glyph will not
change. - Mark size won't change either. - The gap between marks won't change either. - Glyph color won't change. It would be its kind's
color in every case. What could change is the way that we display data. For example, we still have differences against the endpoint lab.
We still show the six fields and the name fields there. That should be an option to show or not show that kind of thing, like the
labeling, the content, just the number, just the icon, or the position in some other thing … We have draggable sections for the items.
That's okay … let's rethink how we show the [controls] now on the elements in all endpoints." And: "let's make a hover for every one of
the items, and we will have an option to enable or disable the hover. The default should be as we have configured today."
Consequence: (1) glyph size, mark size, the gap between marks and the glyph's colour leave the controls — fixed at the lab's values, the
glyph in its kind's colour; a saved configuration that set them is read with those keys ignored. (2) Each part gets a FORM — what it shows
of its data (the word and the value, the value alone, the number alone, the glyph alone, the glyph and the value), only the forms the part's
data can take; the lines and dragging stay. (3) Every part gets a hover card of its own, and a switch per part: on = its own card, off = the
block's card; the default is today's (the glyph and status and each item on, the title parts off). (4) The controls are laid out again
around the part, four sections always on the page: LINES (drag a part to a line, a side, or not drawn) · EACH PART (one row per part: its
name, its forms as icon squares, a size for a text part, its hover switch; picking a part on the block lights its row) · BOX (edge, chips,
counts) · MARKS (drawn as, coloured by, corners, and the marks' hover switch). Read alone (his to correct): "off" means the block's card,
not no card; every part has a row at once, not only the picked one, so a form is one click from anywhere; a text part keeps its size
control; a status chip takes three forms (in its box · the word in its colour · a dot, the word on its hover); "name and word" puts the
part's own name before its value ("class User"); the box options and the marks' drawing stay as options.

## D-094 — The bench's controls as four tabs: order · show · format · hover
Date: 2026-10-05 · Input: his message after D-093, on the built controls.
Decision, his: "the configuration part is getting crowded, so let's make the configuration different tabs … I would like to have separate
sections for: the hover · the order of the parts · the format (whatever is related to size, colors, borders, or anything else). Maybe there
is another section where we can separate things."
Consequence: each column's controls are four TABS, one pane shown at a time — ORDER (the three lines and not drawn, dragged as before) ·
SHOW (the "another section": each part that takes more than one form, its forms; and the kind's extra mark, where it has one) · FORMAT
(the text parts' sizes, the box — edge, chips, counts — and how the marks are drawn) · HOVER (a switch for every part and one for the
marks). Nothing sits in two tabs; reset and copy stay under the tabs on every tab. Measured on the table column: the controls stood about
790 px with everything on the page; by tab they stand 302 · 267 · 511 · 406 px. Chosen alone (his to correct): a tab picked in one column
opens in every column (the bench compares kinds side by side), it is kept per viewer, and the order tab opens first; the tabs are words,
not icon squares (they name sections, they are not looks); SHOW lists only the parts with a choice, FORMAT only the text parts.

## D-095 — The hover card's layout: the section name above its content, a wider card, or both
Date: 2026-10-05 · Input: his message on the ending's hover card (with two screenshots).
Decision, his: "For all those sections where we have 'before checks' and 'gives,' let's make the information in a second row after that one.
Instead of having two columns … we will have just one row, and we will put the message after that. It could be a configuration in the hover
… or we can expand the width a little bit to accommodate things better based on the content inside, or a combination of both."
Consequence: the hover tab gains CARD LAYOUT, four options per column — name beside (today: the section name in its own column, the content
beside it) · name above (the name on its own row, the content under it at full width) · wider (name beside, the card may grow from 360 to
520 px when its content needs it) · name above, wider. The copy line names the layout only when it is not the default. Measured: on 401
invalid token (DELETE /me, a short card) name above is 258 px wide against 308 beside, and "wider" changes nothing — the content fits; on GET
/recipes' 400 invalid temperature code (a long check) beside is 360 × 438, above 360 × 473, wider 520 × 387, above-and-wider 520 × 422.
Chosen alone (his to correct): the default is NAME ABOVE (dashed) — his first ask; "wider" is a ceiling, not a fixed width, so a short card
stays short; the layout is per column like every other look, and every card a column opens takes it (the block's card and the parts' cards).

## D-096 — The item's own mark in its strip, as a choice: a ring · in its colour · a box behind it · double · the others paler · not marked
Date: 2026-10-05 · Input: his message on the ending's hover card (same message as D-095).
Decision, his: "some icons … the gate 401 refusal has a border that is thicker than the other ones … That's something similar to the
encoding that we do in tables for the keys that are required and the ones that are optional. I would like to be able to tailor that also. Go
and check in the endpoint lab how we were able to tailor that kind of thing … Maybe the same one with a different color, or another one mainly
related to the border."
Consequence: the thick ring is the strip marking the item's OWN place — an ending's way out, a test's acting call, a gate's own check (one
per strip). The format tab's marks section gains THIS ITEM'S MARK on those three kinds, six looks as icon squares the way the lab offers an
encoding (the extra mark's off · corners · grey): a ring (today) · a ring in the mark's own colour · a pale box of its colour behind it · a
double ring · the others paler (no ring; the other marks drop to the optional stop a table's nullable columns use) · not marked — and the
ring's thickness, 1 to 4 px, under the ring looks. The copy line names the look only off the default. Found on the way and fixed: the faded
marks (a gate the way passes, a field past the shown ones) had drawn at full strength since D-091 — the lab's imported opacity rule outranked
the bench's; they fade to 0.38 again. Chosen alone (his to correct): the default stays today's ring, dashed; the look is per column; a ring
drawn inside the mark was built and dropped — on a 14 px mark it reads as a dark square.

## D-097 — An ending's "how": what in the code makes it, as a part he can draw
Date: 2026-10-05 · Input: his message on the ending's hover card (same message as D-095).
Decision, his: "when I hover over this invalid token 401, the fourth field says 'except invalid token error.' What is that? That might be
something we want to show as well. It seems like not everyone has this … I want to know what that is and whether that might be something we
want to show in this card for these endings."
Consequence: the line is the feed's `via` — what in the code turns the request into this ending, beside "where" (its file and line). It takes
four shapes, said in words on a new ending part HOW: an error the code catches ("catches InvalidTokenError") · a call it is raised in
("raised inside AuthContext.require_household, called at api/cooking.py:572") · a security scheme ("refused by HTTPBearer") · a middleware
("refused by RateLimitMiddleware"). Measured over the page's 728 endings: 394 have one — catches 141 · middleware 103 · scheme 78 · call 72 —
and 334 say nothing (a success, a plain raise in the handler); swept, every one of the 394 draws its words, none empty or unfilled. The hover
card keeps the raw line in its head. Chosen alone (his to correct): HOW starts in NOT DRAWN — he drags it onto a line to see it on the block;
it is a separate part from WHERE (the call shape names a second file); the words name the code, never the feed's syntax.

## D-098 — One kind tailored at a time: its controls and the lab's portrait, in a row under the columns
Date: 2026-10-05 · Input: his message on the ending's hover card (same message as D-095).
Decision, his: "I need the things we are going to show in the endpoint lab that would be in the portrait section when we click any of these
to see the details inside. Let's make it so that only one of these can be active at a time. Can we modify one of these at a time and, when we
do, show the different options to tailor it? We also move them in a row, showing the current section where we tailor this and the section of
the portrait that we will show when we click that item."
Consequence: every column's head gains a TAILOR square (a sliders icon; hover "tailor the ending"); one column is active at a time, drawn
with an outline and its square pressed. The controls leave the columns — the eight columns keep only their element — and one row under the
grid holds the active kind: HOW IT IS DRAWN at the left (the four tabs, unchanged) and WHAT OPENS ON A CLICK at the right, the portrait the
lab opens for that element. The ending's portrait is built from the bench's own data: its head (glyph · status · words · stage), then WHAT IT
IS (stage · where · how · check · code · answer form · in the contract), BEFORE · CHECKS · GIVES (the card's lines, on the page's colours),
THE ANSWER IT SENDS (media · model · fields · body · headers), THE RULES THAT REFUSE THE BODY (each rule's place, type and limit — on 42 of
the 728 endings, 281 rules), WAYS THAT END HERE (one strip per way, the ending's own mark ringed — 14 endings have more than one) and TESTS
THAT PROVE IT (184 endings have one). The table, schema, function and test say their portrait is owed; the gate, the client hook and the
in-flight value say the lab opens none. The active kind survives a reload.
Chosen alone (his to correct): the ending is active until he picks; the portrait is rebuilt on the bench's data, not imported from the lab;
its lines section keeps the label beside its lines (the row is wide, so the hover card's D-095 layout does not apply to it); the other kinds'
portraits wait for his read of this one.

## D-099 — The tailoring area: the kind's column cloned with a dropdown, its controls, and its portrait in the lab's frame
Date: 2026-10-05 · Input: his message after D-098, with a screenshot of the endpoint lab's portrait panel (a table's record).
Decision, his: "We are not there yet. In this section for Tailoring, let's have a section similar to the eight sections we have in Examples. It
should have a dropdown where we can change the kind of item we want to change, including table schema, functions, and so on. We will then clone
the same configuration section we have for that specific element. We're also going to show that element in what would be the portrait panel.
[…] tables, for example, have different sections. I would like to replicate something similar here, actually kind of the same, because what we
are going to configure is what we are going to show there in the endpoint lab later […] I want to be able to see in the Tailoring configuration
section […] how the card is going to look next to what we are going to show in the portrait for each one of these elements. You can interpolate
or approximate what we want to show in that portrait section by looking in the endpoint lab at what we already have for the tables."
Consequence: the row under the columns becomes TAILORING. At its left, THE ELEMENT: the chosen kind's Examples column drawn again — the same
scope and width squares, roles, picker and steps, the same block — bound to the same state, so a step there moves the column above too. The
kind's name in its head is a dropdown of all eight; picking one makes it the one tailored, as its tailor square does. HOW IT IS DRAWN (the four
tabs) sits under it. At its right, WHAT OPENS ON A CLICK: a portrait in the lab's own frame — its dark panel 440 × 560, the head with the
subject's glyph, its name in caps, the view's name and one square per way of drawing it, the body one of the lab's records (glyph and name, rows
of icon · label · value, sections in caps, field tables whose rows share one grid). The views are the lab's: a table's Record · Shape · Wheel ·
Keys, a schema's and a function's Record, an ending's Exit (D-098's sections, now in record form), a test's Case. The gate, the client hook and
the in-flight value — which the lab opens no portrait for — are drawn in the same record from the bench's data, and the frame says so in one
line under its head. The field marks wear the column's look. The kind, the view per kind and both options survive a reload. Every element on
all 80 endpoints draws one (728 endings · 648 tables · 218 schemas · 1,529 functions · 544 tests · 1,063 gates · 51 client hooks · 706
in-flight values); the 44 functions the map knows by name only say so, as their card and block do.
Chosen alone (his to correct): the column's tailor squares stay beside the dropdown; two options of mine, each its default dashed — where the
controls sit (under the element · right of the portrait) and the portrait's box (the lab's 440 × 560 that scrolls · as tall as its record);
the frame keeps the lab's dark colours in the light theme, as the hover card does (D-088); the approximated three follow the record pattern,
not a new layout.
Found while building: the page's kit owns a class `.out` (an output box 7em tall), which caught the lab's foreign-key class `fkx out` — the
portrait's classes avoid `out` and `in`. A kind the endpoint has none of (DELETE /me reads no body, so it has no schema) first drew "Pick an
element in its column", with nothing to pick; the portrait now says what its column says, "nothing of this kind on this endpoint".
Came in from outside this lane: the rebuild inlines gabe-artifact 1.7.0's chrome (`020c2aae`, the other session's), which opens every page at
text size 110 % — the whole page's text is a tenth larger than at D-098 (body 15 → 16.5 px); the cog's text size takes it back to 100 %. The
portrait frame is sized in pixels and keeps 440 × 560.

## D-100 — The ending's card gains how · answer form · in the contract; the portrait gets its own controls (order · show · layout)
Date: 2026-10-08 · Input: his message after D-099 (dictated).
Decision, his: "In the card, I think we are missing some elements. I can see that when we click the card or in the portrait section, we have:
the stage, which we show; the where, which we show; the how, which we are not showing; the answer from; the in contract. Let's make those
available. In the portrait section, let's also add some configuration on the right of the portrait, similar to the configuration that we have
for the card, but for the portrait: stuff like what we show, how we show it, the order of the things in different sections, and the layout.
For example, in the hover, you change the layout in the before section because it was too long. We have a similar situation here in the
portrait, in the before section, so that layout might change for any of the other sections too. For checks and gives."
Read as (dictation): "answer from" = the portrait's ANSWER FORM row; "in contract" = its IN THE CONTRACT row; "the card" = the bench's block,
whose controls are the four tabs order · show · format · hover.
Consequence, the card: the ending gains four parts — answer form, in the contract, check, code (the portrait's facts rows, each in words).
Line 3 is now where · how | answer form · in the contract; check and code start in not drawn, his to drag in. The feed's form words become
plain words (text → "a fixed message", object → "an object with fields", default-phrase → "the status's own phrase", dynamic → "a message built
when it runs"), and a contract the feed does not know now says "not known" — the portrait said "not declared" for the 80 endings whose
contract is unknown. Feed: 728 endings — form text 264 · object 195 · default-phrase 80 · dynamic 28 · none 161; in the contract declared
180 · not declared 468 · not known 80; a check 223; a code 92.
Consequence, the portrait: a column right of it, HOW THE PORTRAIT IS DRAWN, three tabs. ORDER — the sections top to bottom, each with its
rows; drag a section above or below another, a row along its own section, either into a not-drawn bin. SHOW — per row: icon · label · value,
label · value, icon · value, or the value alone. LAYOUT — per section that names things: the names beside or above (before, checks and gives
are now a section each, their name the card's own). Kept per kind and per way of drawing it ("end:exit", "table:record", …), through a reload;
back to the default and copy under the tabs, as the card's. It works the same for all eight kinds: the record is taken apart after it is drawn —
its sections, its top rows as one section ("its facts"), each top table as its own section; rows under one key (a rule, a send) move as one.
Chosen alone (his to correct, each default dashed): every row as the lab draws it (icon · label · value), names beside — except before,
checks and gives, whose name sits above its lines, as he picked for the hover (D-095); the controls sit right of the portrait in every case
(the card's "where the controls sit" option moves only the card's); a table's Shape and Wheel have no sections and say so; table sections
(fields · tables it touches · functions it calls) are ordered but not laid out — a table's header row is already its names.
