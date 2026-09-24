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
