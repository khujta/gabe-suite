# Legibility feedback — what was clear to the model and not to a human

The ledger of D-066. Every item he raises as a HUMAN reader is logged here BEFORE it is fixed, with the pattern behind it,
so the patterns can later be carried into the Gabe Suite (a check, a words rule, a reference clause) — draft first, nothing
lands in the suite before his "land it".

Round 1 — source: his dictated note "API Hover Legend Consolidation" (Wispr Flow, 2026-09-30), read on
`../workflow-panel/all-endpoints.html`, endpoint **POST /cooking/sessions**, section **BY MOMENT** (moments as columns, blocks
as rows). His closing words: "the representation was close enough … we are very close to finishing this work."

Fields per item: **words** (his, verbatim — dictated, so a "read as" line gives the on-screen term where a word is a homophone)
· **where** (section · row · column · element) · **could not tell** (what a human reader could not get from the page) ·
**fix** (proposed until built, then what was built and where) · **tag** (named from this item's evidence, never from a
pre-made list) · **status** (logged · building · built `<sha>` · option — his to pick · question — answered on the page ·
deferred + trigger).

---

### L-01
- **words:** "I can hover 3 different things. I can hover the label refusal, that says "kind of ending," an ending where the
  app's own code says no, color as a table draws it, icon as the endpoint, lab draws it. That is kind of irrelevant on this
  content. Why? Because it repeats in so many places. We can put it, like, a legend somewhere, and that would be better than
  repeated that hover every— in every place, and having 3 different hover descriptions for one item. So that. Is something
  that we should keep in mind when we have some— something that repeats always with the same text, that is not something that
  we should put as a hover. Instead, it should be something con— consolidated section, like a legend for a table."
- **where:** BY MOMENT · Endings · "at the edge" · the `refusal` label on each 429 ending
- **could not tell:** anything about THIS ending — the label's hover is the kind's definition (identical on every refusal)
  plus how the page chose its colour and icon, a fact about the page, not the code.
- **fix:** BUILT — BY MOMENT chips are one hover each; a kind's definition (and how the page drew it, D-017) left every item hover
  and stands once in the row's legend (`_ae_io.py` · all-endpoints.tpl.html `legHtml`/`oneTip`).
- **tag:** `static-text-repeated-in-hovers`
- **status:** built (D-067)

### L-02
- **words:** "the final is the container that contains both the label and the 4, 29 square. That says 4, 29 endings. Rate
  limit exceeded, try again shortly. And for the second one, says exactly the same thing. So I don't know which— what is the
  difference. And I don't know— and I guess that we should consolidate in just one hover this whole icon. Okay. And— and the
  idea is that the hover ha— between icon— between items contains the different information because they are different
  items."
- **where:** BY MOMENT · Endings · at the edge · one ending chip = three hover targets (label · code square · container)
- **could not tell:** which of three partial cards describes the item; each tells a third of it.
- **fix:** BUILT — the label, the status square, the glyph and the role label inside a chip no longer hover apart (`oneTip`); the
  chip's one hover carries the item's own facts in before · checks · gives (`ioParts` over the generator's `e[7].io`).
- **tag:** `one-item-three-hovers`
- **status:** built (D-067)

### L-03
- **words:** "Then if I hover in the 4, 29, I can see a client error status. Not declare, status. Sense, retry after. And
  that's okay. I suppose that that's a description of what is actually happening. There, and why. And that— that might be
  good. But the thing is that in the 2, 4, 29 sections that we have on this row, in endings, on— at the edge, both 4, 29 say.
  The same, exactly the same, seems like, yeah. So I don't see the difference between one and the other."
- **read as:** "not declared · status · sends Retry-After"
- **where:** BY MOMENT · Endings · at the edge · the two 429 endings
- **could not tell:** what makes the two 429s two endings — the hovers never name what differs between them.
- **fix:** BUILT — each 429 leads with its own limit: sensitive (7 routes, 23 endpoints, rate_limit.py:117, 20 per 60 s) · global
  (all but /healthz, 79 endpoints, :121, 120 per 60 s); the generator stops on two items at one moment whose hovers read the same.
- **tag:** `twin-items-indistinguishable`
- **status:** built (D-067)

### L-04
- **words:** "We have framework, error 4, 22. Again, the same structure, framework can be— when we hover in top of framework,
  says framework kind of ending, and ending the framework produces why and continues. So we can put that in a legend,
  external legend, or— or in the endings. Actually, in the row endings, at the beginning we can have when we hover in top of
  the ending, we can show the different labels that we manage show. Same thing, we have 3 different hovers, which should
  consolidate. In just one, with a specific information for this one. And that happens throughout all the endings in that
  row. But besides that, that row is very clear."
- **read as:** "an ending the framework produces while it reads the body" · "the different labels that we show"
- **where:** BY MOMENT · Endings · reads the body · the framework 422 — and every ending in the row
- **could not tell:** same as L-01 and L-02, on every ending of the row.
- **fix:** BUILT — pointing at a row's name ("Endings") shows its legend: the kinds and labels it draws, cloned, with what each means
  and how many are here (his placement, ruled); the legend above the table, one line per row, is the other option (mo.opt.leg).
- **tag:** `static-text-repeated-in-hovers`
- **status:** built (D-067); the legend ruled — on the row's name (D-067)

### L-05
- **words:** "by moment is kind of confusing, because some moments show with this progressive bar, like at the edge, then
  reads the body, the— the— the third and fourth columns, but. Some of them— the first two, the before any request and the
  screen send it, do not show any— Progressive. So that also should be noted somehow. We can probably have another header row
  for principal moments, like the— the core stages, and inside we can put branches of those stages. For example, in the
  handler section we might have different branches, in the input or gate section we might have different branches, at
  different moments and that's okay. But we need to have visibility of that."
- **read as:** "progress bar" = the stage mark over a moment's column
- **where:** BY MOMENT · the column headers
- **could not tell:** why some columns wear the mark and others do not, which moments belong to which core stage, and that
  some columns are branches of one stage.
- **fix:** BUILT — a band of stages over the moments (INPUT 1 of 2 · 2 of 2 around GATE, the save under EFFECTS, the moments outside
  the request in a cell of their own, each stage counting the endings that leave it); the excepts of one try and where it goes on under
  one bracket, "one of 4", proven per path by gen-all-endpoints.py; the stage mark left the heads (all-endpoints.tpl.html `moRuns`/`moForks`).
- **tag:** `mark-without-its-meaning`
- **status:** built (D-068); ruled — stages over moments, saving under EFFECTS (D-084)

### L-06
- **words:** "the final column, the one that says "no moment", in that column we might just remove it. I mean, not remove it
  at all, but put it in a different— in another row, separate from the table at the end. Or at the beginning. With the
  metadata. And we can put labels on that metadata saying that some data pertains to the proof section, or the data effects,
  and so on. But there is no need to have this "no moment" section there."
- **where:** BY MOMENT · the last column, "no moment"
- **could not tell:** that a column in a time table holds no time — it reads as one more moment and takes width from the rest.
- **fix:** BUILT — the column left the table for the ENDPOINT METADATA inside BY MOMENT: one card per block, its mark and name on top;
  what sums it up in the pinned row's own cells and head words, what it is as chips (all-endpoints.tpl.html `renderMeta`).
- **tag:** `timeless-facts-inside-a-timeline`
- **status:** built (D-068); ruled — metadata after the table (D-081); one big element with layout controls later (L-39)

### L-07
- **words:** "Same thing for "overview" and "risk". That is also metadata information. So this is metadata for the whole API
  endpoint, and that will go in a different section in our navigation bar on the Gabe universe." — and later: "overview. We
  already said that it will be consolidated in a metadata information section for the whole API endpoint or element that we
  are selecting"
- **where:** BY MOMENT · the rows Overview and Risk
- **could not tell:** same as L-06 — rows of timeless facts inside the timeline.
- **fix:** BUILT — the Overview and risk row left the table; its facts are the metadata's first card, the proof's two counts one under
  the other, each saying what it counts (proven 2/14 · named 4/11, rank 3–6 of 80).
- **tag:** `timeless-facts-inside-a-timeline`
- **status:** built (D-068)

### L-08
- **words:** "proof is a different monster because it encodes a lot of information. A lot. Information. So ideally we should
  find— we will iterate in a way to show better how we represent the tests, like. Say I would like to see, okay, like the data
  structures, the functions, the models, use, or different components using that that are around our API endpoint used in
  that. The gates and decisions also, that's very important. In-flight states. That might be affected by the test. So we will
  do a similar work done we did in the. In the. Endpoint lab, where we figured out a way to represent the tables. In blocks.
  But this will be for tests. Because right now it's very difficult to grasp what is happening on each test and journey, and
  how it relates to our API endpoint. If we hover on top of it, we have some information there, but it's not enough. I mean,
  it's enough in the sense of having the context, but it doesn't— Communicate well the meaning of what is happening inside the
  tests and what is being affected and what is being tested."
- **where:** BY MOMENT · Proof · the proof chips (`C221 proves 404` …), the journey chips (`C250 4 steps after` …), the
  arranging tests
- **could not tell:** what a test does, what it touches (structures, functions, models, gates, in-flight state) and what it
  proves.
- **fix:** built: the TEST column of the examples bench (`sec-ex`) — a strip of its requests, and a click that opens the ordered
  chain (request → checks passed → branch → functions → tables, saved or not → ending) with what the test does not tell.
- **tag:** `context-without-meaning`
- **status:** built (D-071); its look is decided on the all-endpoints bench (D-083)

### L-09
- **words:** "For this one we have many columns with items that have no icon. And I would like to know why. For example, at
  the edge we have the sensitive and global. Sensitive says sensitive gates and decisions, rate limit, that by. Line 117, 20
  per 60 seconds, keyed something the checks that stop a request and the force that decide sending. What is this? It's a
  function. What it is. So if we have different gates and decisions, we should show the function method. Of the place where
  they are being called, the item. There should be associated to an item, ideally an affection with a function role. It's okay
  if the functions gets repeated throughout the different gates and decisions. That's expected."
- **read as:** "the forks that decide something" · "ideally a function, with a function role"
- **where:** BY MOMENT · Gates and decisions · at the edge · `sensitive` and `global` — and the other G&D cells
- **could not tell:** what kind of thing a gate chip is (it wears no glyph) and which function it lives in.
- **fix:** BUILT — every gate and switch names the function (or middleware) it runs in, a station element with its glyph and role
  (`_ae_els.gates` · all-endpoints.tpl.html `gdHost`/`moCell`); a gate wears the page's own icon per kind (my pick, dashed).
- **tag:** `element-without-identity`
- **status:** built (D-069); the gate icons ruled — an icon per kind (D-081)

### L-10
- **words:** "Then we have some in the column checks. We have some return codes like 409, 400, then in the next column
  subscription tier for we have the 404, 409. We should also associate those because those are endings, right? We should
  associate those with functions. So gates and decisions will probably— we will most likely mutate that to have a change of
  functions. With the actual gates and decisions, like the flag or the condition that they are evaluating. And then if there
  is— the effect of that. That might be a validation or something like that. Or an ending, like in the columns checks and
  subscription. Where we have an ending for 409, 404, and 400. … This operation is happening in this function. And the result
  of that is an ending or maybe something else. That's okay. Maybe a branching— That's also valid. But again, if we do that, we
  should encode that with some color or something that we will use for that branch or the stage. In the API endpoint moment."
- **read as:** "a chain of functions"
- **where:** BY MOMENT · Gates and decisions · checks (409, 400) · subscription_tier_for +2 (404, 409)
- **could not tell:** which function evaluates a condition and what its result does — an ending, a validation, a branch.
- **fix:** BUILT — each gate is function → condition → what happens (the ending's status with its stage lit, or "returns" · "passes
  the error on" · "goes on"); three looks and two effect colours in the Gates row's options slot (`gdChip`, `gdEff`).
- **tag:** `condition-without-actor-or-effect`
- **status:** built — ruled: function, gates under it · the ending's colour, stage lit (D-081); refined on the bench (L-39)

### L-11
- **words:** "by the way, in gates and decisions, in gates and decisions, we might have, okay, we will have the functions
  associated to the gates and decisions, but can we also put some roles in the gates and decisions themselves? I'm not sure
  about this I just figured out that since functions already have a role, maybe gates and decisions might have something
  similar since they validate things on different levels."
- **where:** BY MOMENT · Gates and decisions (the whole row)
- **could not tell:** at which level a gate decides — the chips carry no subcategory.
- **fix:** BUILT — a label at each gate's end from the feed's own categories: where it decides (my pick) · what it does · what a check
  guards · none, in the Gates row's options slot (`gdRole`, words enc.fam.gdl/gdv/gdc) (D-069); and on the examples bench the GATE OR
  DECISION column's role filter — nine roles from the feed's own groups, each block naming the function it runs in (glyph + role), its
  condition and its effect (D-071).
- **tag:** `kind-without-subcategory`
- **status:** built — ruled: where it decides (D-081); the bench's gate look is decided on the all-endpoints bench (D-083)

### L-12
- **words:** "Data effects the same thing for gates and decisions. We are doing things on tables basically. That's what we
  want to highlight here. And also we are mentioning some functions. So what would be a nice representation here would be put
  functions on the— in a block. In different blocks the functions on the left. And in the right the tables. And have sort of a
  mind map that gives you the relationship between the functions and the tables. Where the connectors will describe the kind
  of operation. Like right might be red, red might be green, and red and right might be orange or something like that. I think
  that somehow we have already encoded that kind of information. … In data effects we want to say, okay, we are affecting
  these tables, but how? With what function? Okay."
- **read as:** "write might be red, read might be green, read and write orange"
- **where:** BY MOMENT · Data effects
- **could not tell:** which function does which operation on which table — the row lists tables with R/W beside a few
  functions, never the link between them.
- **fix:** BUILT — Data effects' options slot: one map for the endpoint under the row (my pick): functions left, tables right, the moments
  as bands, green reads, orange writes, a tick a flush, a rule a commit naming who commits, the race on its link · a small map per cell · chips.
- **tag:** `relation-flattened-into-a-list`
- **status:** built — ruled: a small map per moment (D-081); the R/W colour built (D-069)

### L-13
- **words:** "in functions again, we will have to do kind of the same thing that we did on the endpoint lab for the tables for
  functions also. I think that we already did it for schemas. So functions should be shown with a little bit more of detail.
  And in blocks."
- **where:** BY MOMENT · Functions
- **could not tell:** what a function does — a chip is its name and role only.
- **fix:** built: the FUNCTION column of the examples bench on the lab's function look — a strip of the tables it touches; a
  click lists its raises (and what each becomes here), tables, calls and what it does. Its use in BY MOMENT waits on EX-5.
- **tag:** `name-only-chip`
- **status:** built (D-071); its look is decided on the all-endpoints bench (D-083)

### L-14
- **words:** "there is some functions that do not have the function icon or their role. For example, in the column for
  subscription tier for plus two, we have the resolution snapshot that violations for. And we have the derive underscore
  restrictions. Those two, if they are functions, they should be— they should be given a function, icon, and a role. And I
  would like to know why we haven't done that. Or in the get idempotency key, in the checks column also having the same thing."
- **read as:** `ResolutionSnapshot.violations_for` · `derive_restrictions` · `get_idempotency_key`
- **where:** BY MOMENT · Functions · subscription_tier_for +2 and checks
- **could not tell:** whether those names are functions at all.
- **fix:** BUILT — a function always wears the function glyph; its role from the station, the lab's walk, else the station's own rule on
  the feed (accessor · gate); no role: glyph and name, the hover says what it does; the why is answered in D-069, not on the page.
- **tag:** `element-without-identity`
- **status:** built (D-069)

### L-15
- **words:** "on client, we have the hook— okay. Can we somehow associate that hook with some schema or table? I don't know. I'm
  not really sure, but the hook is kind of the frontend function. The place is and says it's a fetcher. But what is fetching
  and from where?"
- **where:** BY MOMENT · Client · after the answer · the hook `refresh ["cooking"]`, role fetcher
- **could not tell:** what the fetcher fetches (which endpoint, which schema, which tables) and from where.
- **fix:** BUILT — the refresh names its trigger and, one line each, the hooks that fetch again and the GET each sends; its hover names
  each reply and the tables behind it (`_ae_els.refetches`, `refetchChip`).
- **tag:** `role-without-its-object`
- **status:** built (D-069)

### L-16
- **words:** "And the same thing in the— after the answer column for client, we have some ending for 403 and 404. Why do they
  trigger? In which context? A function I gave what is happening there."
- **read as:** "Which function, and what is happening there?"
- **where:** BY MOMENT · Client · after the answer · `cookingSessionModel.ts:381 403` · `:384 404` · `:389 409`
- **could not tell:** why the client branch fires, in which function, and what it does — the chip shows a file and a line.
- **fix:** BUILT — the branches stand under their function (describeStartCookingError) with the way the error comes, each line
  "reads 409 ×2 → “…”", an "any other status" line last; the send cell reads in tap order (`moCell`, `_ae_io` client lines).
- **tag:** `location-without-actor`
- **status:** built (D-069)

### L-17
- **words:** "In flight state is something very important and I would like to give it an appropriate icon to that row." — and:
  "inside state— We have different. Items there. Which I think that need a better representation so with the some icon
  coloring for. Roles in the inflight state, and say. What— okay, inflight state is basically some sort of temporary flag that
  we store or something like that, right, that will affect something. So the idea here is visualize or surface what we are
  affecting. Um, So I would like to dig deeper on that to see possibilities on what we could represent on that inflight state."
- **read as:** "in-flight state"
- **where:** BY MOMENT · In-flight state (`dependency-value session`, `dependency-value ctx`)
- **could not tell:** what an in-flight item is and what it affects; the row has no icon.
- **fix:** BUILT — the icon and look (D-069); In-flight's options slot: a lifeline each (my pick) — set · read, with the ending each read
  can decide · a cross at the answer or an arrow past it; alike values fold ("rate limiter · 7") · echoes where read · chips.
- **tag:** `role-without-its-object`
- **status:** built (D-069) — the icon and look; the lifelines ruled — a lifeline each (D-081)

### L-18
- **words:** "Then standard of specialists, let's give it an icon also. We have here flags, binding, and different things um.
  I'm not sure what what are we representing here let. Me check pieces Again this might require its own icon but I think that
  this maybe can be merged with gates and decisions because they are touching similar things like functions that will
  determine something along the way so tell me about that"
- **read as:** "standard or specialist"
- **where:** BY MOMENT · Standard or specialist (`binding TokenVerifier`, `reads a repeat key`, `claims its key with
  get-or-create`, `can answer 403`)
- **could not tell:** what the row represents.
- **fix:** BUILT — a puzzle mark (my pick, dashed); the row's question on its head's hover, answered in D-069; split into the gates (my
  pick) · merged · kept as its row, in the options slot; a switch shows the endings it can change, a piece how rare it is.
- **tag:** `concept-never-explained`
- **status:** question — answered on the review page (D-069); ruled: split into the gates (D-081)

### L-19
- **words:** "I think that we are about to consolidate the sections so we might have endings proof case and decisions data and
  effects function structures client in flight state and for the others we will see but those for now we'd probably be the
  the different um. Like. Context or or sections that we can see that right now in the lab are the data schemas function test
  widening and security those would be replaced by these ones uh also need to I need a gap analysis between those and see if
  we are missing something we are clearly probably missing security section here I don't know if something worth adding or
  yeah. Probably we we are missing that one"
- **read as:** "endings · proof · gates and decisions · data and effects · functions · structures · client · in-flight state"
- **where:** the page's blocks against the lab's six parts (data · schemas · functions · tests · widening · security)
- **could not tell:** that the page and the lab name one set of things two ways.
- **fix:** a gap analysis between the two sets, on a generated page.
- **tag:** `two-vocabularies-for-one-thing`
- **status:** question — answered on the review page (the gap analysis, D-066)

### L-20
- **words:** "in the top row the one that comes from the table where we have all the endpoints we have some sections that we
  don't I don't see in this table some items for example in the functions deciders and data f and s in client screen and
  reads in flight request and server standard of specialist switches pieces lags yeah those are interesting pieces that I
  would like to see reflected here somehow"
- **read as:** Functions → deciders, data fns · Client → screen, reads · In-flight → request, server · Standard or
  specialist → switches, pieces, lacks
- **where:** THE ENDPOINTS' pinned row (its sub-columns) against the rows of BY MOMENT
- **could not tell:** where those counts live in the timeline.
- **fix:** BUILT — each row's head repeats its block's columns of the pinned row with the same words and this endpoint's values
  ("Functions · deciders 3 · data fns 10"); a click lights their members and the pinned cell; each hover ends "counted in: …".
- **tag:** `lost-between-views`
- **status:** built (D-068)

### L-21
- **words:** "we are going to remove the no moment column but still the layout is awful it's difficult to read we don't give a
  lot of space for the other columns so I would like to be able to uh. Click the columns for accommodation. The contents
  inside so give a little more width to put the contents as is expected that we need to show properly the contents that per
  column and to also hide other columns so I can probably have hiding columns will give more room to the other columns to
  accommodate and and we will still have a button that will force accommodation by minimizing or moving the other columns
  around"
- **where:** BY MOMENT · the whole table
- **could not tell:** a cell's contents — names wrap letter by letter in columns too narrow for them.
- **fix:** BUILT — a click on a head widens its column to what it holds; its × hides it and the bar brings it back; "fit to the box"
  narrows the columns that do not fit to strips of counts; kept through a resize and a reload, said in the copy text.
- **tag:** `cramped-columns`
- **status:** built (D-068); ruled — every item on one line, wrap into bands, open fitted (D-081)

### L-22
- **words:** "we were basically missing okay we have too many hovers too many repetitive hovers describing things that were
  static not dynamic the idea is to show a little bit of content of the static things on the dynamic explanation of the items
  that that that that will be a very good summarization of the hovering um description of something in general in this kind
  of panels that whatever dynamic information we have that should give in enough static context to be understandable when we
  hover in top of the item that will be it and understandable on this content would be understand the input process and output
  like okay initial conditions what are we checking then how are we checking that and then what are we producing whatever it is
  an endpoint a functions a table or schema for what is being used and what is the effect of on that"
- **where:** every hover of the page
- **could not tell:** the item — hovers describe its KIND and leave out what this one checks, how, and what it produces.
- **fix:** BUILT — every BY MOMENT item's hover is before · checks · gives from the feed (`_ae_io.io_of`, the one builder later kinds
  extend); labelled lines (my pick, dashed) or one sentence (mo.opt.ipo); a column's words sit on its head only. The code map's
  items are one hover each (their name, kind and labels), not yet in the three parts.
- **tag:** `hover-describes-the-kind-not-the-item`
- **status:** built (D-067); ruled — labelled lines (D-081); the one hover format follows the frontend lab's cards (L-33)

### L-23
- **words:** "You know what no let's put the section before the buy moment between buy moment and the one endpoint section I want
  a section where we put an example that we can change like let's say an example of a table an example of a schema example of
  uh a test example of how we represent a function and so on and it should give us the option to change on the different
  functions or roles for a given element separate separate by element so one example for uh. Let's say let's do for endings
  too that you can propose an example for every element that we are trying to represent on the table so we can decide the
  layout on that so I want a dedicated section for that and every one of these should have a control section with copies copy
  button settings where I can modify the settings uh. Let's put it below the each one of the examples so it will be different
  columns one by other one by one throughout. The width of the page different columns uh each column will contain the title
  with the selector of the element that we are showing the different elements and if they have roles also the role to look
  for filter for roles then the the representation itself of the element we already have defined that for the tables so we
  can pick it up uh still we are going to put it and going to modify if it's necessary and after that we will put the controls
  to modify that uh Blocks for the tables we want something very similar to that where we can drag and drop the different
  elements that we show inside uh show show them or not size color and so on and that for every one of the elements that we
  we want to represent on this table"
- **read as:** "by moment" · "copy button"
- **where:** a new section between ONE ENDPOINT and BY MOMENT
- **could not tell:** how a table, a schema, a test, a function or an ending should look — there is no place to decide one
  element's look on its own.
- **fix:** built: section EXAMPLES (`sec-ex`) between ONE ENDPOINT and BY MOMENT — eight columns in his order, each a title,
  a scope switch, role chips and a select, the block, then parts (drag · not drawn) · size · colour · back to the default · copy.
- **tag:** `no-bench-for-one-element`
- **status:** built (D-071)

---

Round 2 — source: his message of 2026-10-01 after reading `legibility/legibility-review.html` (the round-1 review page) as a human.

### L-24
- **words:** "I have been looking at the page. It's very dense. We can use more width to better accommodate the tables. There are some
  rows that might benefit from this and end up in one row only. The status column, for example, in the first table on the What
  Round 1B Left, is using two rows. It can change to just one."
- **where:** the review page · every table · first seen on "What round 1b left", its first table's status column
- **could not tell:** a row at a glance — short values (a status, a count) wrap onto a second line in a column narrower than they
  need, while the page leaves width unused at the sides.
- **fix:** built: the page's column stays centred and takes the screen (up to 1800 px, or 96% of a narrower one); every table
  spans it; a short value (a status, a count, an id, a kind, a verdict) sits in its own column on one line and never wraps, so a
  row reads as one line wherever its values are short; the long-prose columns take the width that is left; the status of a row
  in What round 1b left is two marks on one line; below phone width the page reflows. Measured at 1920 and at 1600 px.
- **tag:** `short-values-wrapped`
- **status:** built (D-072)

### L-25
- **words:** "Can we also use more encoding using icons and summarize things?"
- **where:** the review page · every section
- **could not tell:** where a section stands without reading it all — states and kinds are written out as words, and nothing sums a
  section up before its tables.
- **fix:** built: every state wears an icon and a colour (fixed, partly fixed, left, open, yours to rule, my pick, yours, ruled,
  built, waiting on your pick, question answered, logged, and the kinds of an open row); each pattern wears its own icon wherever
  it appears (cards, chips, tables); the words stand once in a legend near the top and in each icon's hover; a table cell shows
  the icon and its number; a stacked bar shows fixed, partly, left and yours to rule per item, pattern and question; an overview
  table opens each of Your items, the patterns, Your calls, Your questions and What round 1b left; each section opens with what
  it sums up to (the spoken summary, L-26).
- **tag:** `words-where-a-mark-would-do`
- **status:** built (D-072)

### L-26
- **words:** "At the beginning of each set of tables, I would like a summary that I can copy and paste and read out loud in a chat that
  I have dedicated to reading out loud your messages."
- **where:** the review page · the start of every section
- **could not tell:** the page by ear — there was no text written to be read aloud: ids, file paths and symbols read badly when spoken.
- **fix:** built: each section opens with a spoken summary of 3 to 6 sentences in plain words (no ids, paths or symbols; an item or a
  pattern by its name), generated from the data, with a copy-to-read-aloud button whose text is the summary shown; one button at
  the top copies every summary in page order, each headed by its section's name. My proposal, dashed: a listen button beside each
  copy button reads the summary with the browser's own voice, at a speed you pick and the browser remembers; it hides where the
  browser has no speech.
- **tag:** `no-spoken-channel`
- **status:** built (D-072)

### L-27
- **words:** "when we put a voice, I would like it so that when I scroll down, the header navigation bar gets frozen on the top
  section. That way, I can stop or skip to a later section of the transcript, and it will also take me to that section on the page."
- **where:** the review page · the listen buttons (D-072) and the contents strip at the top
- **could not tell:** where the voice was, or how to move it — once the page scrolled, the controls stayed behind, and the reading had
  no tie to the place on the page.
- **fix:** built: while a voice plays, the contents bar freezes at the top of the screen and carries the player: play and pause, stop,
  the previous and next section, the sections with the one being read lit, and the speed. A skip (previous, next, or a section)
  moves the reading to that section's summary and scrolls the page there, and the summary being read is highlighted; stop ends
  the reading and the bar lets go. My proposals, drawn dashed: "follow the reading" (when the reading moves on by itself the page
  follows it; on unless you turn it off) and "the bar stays at the top" (only while a voice plays is your reading and the default;
  always is the alternative). Both are kept in this browser and ride the copy text. The page reads the voice you saved in the
  voice lab (voice, speed, pitch, volume, the pauses, whether section names are read) and falls back to the browser's voice,
  saying so in the bar's hover, where the saved voice is a Piper one.
- **tag:** `player-without-a-place`
- **status:** built (D-074)

### L-28
- **words:** "in the legibility review element, we have the voice mode, but what I would like to have is that when we scroll down, we still
  show the bar with the reproduction of the audio and some hashtags or markers to transport to the different sections of the artifact
  page. This is especially where we have to make some decisions and change the audio that we are reproducing."
- **where:** the review page · the player bar (D-074) and the decision points (the calls, the proposals, the patterns' land-it choices)
- **could not tell:** where the decisions are while reading — the bar showed only while a voice played, and it marked sections, never the
  places where a choice waits; the audio could not be moved to a decision.
- **fix:** built: the player bar is in view all the time on the review page and the voice lab ("always" is the default, ruled;
  "only while a voice plays" is the other option); the bar itself unchanged, as he asked (D-076, `85022b1`).
- **tag:** `controls-only-while-playing`
- **status:** built (D-076)

### L-29
- **words:** "when we reproduce audio, the menu right now is showing different sections in the artifact page (which is fine) or the HTML
  file (which is fine). I would like to have a more indented way, like with dropdowns, maybe by sections, because I also want to
  implement summaries, especially in the parts where we have to make decisions, including some explanation using gabe-lens plain."
- **where:** the review page · the player bar's section chips, and the decision points (the looks to pick, the proposals, the patterns'
  land-it choices, the L-19 recommendation)
- **could not tell:** what a decision is about by ear — the bar reached sections only, and a decision had no summary of its own and no
  plain line saying what it means.
- **fix:** built: the bar's section chips that hold decisions are dropdowns (a caret on the chip, the section's count of open
  ones on it), each listing its decision points indented under their group: the looks to pick (the table, each row, the bench and its
  kinds), the proposals, each pattern's draft suite proposals and the L-19 recommendation, every entry with an icon for its state
  (open, decided by you, ruled, my pick kept); a section with none stays a plain chip. Each decision has a spoken summary of two to
  four sentences, generated from the page's data (what it decides and its options, what choosing sets in motion, my pick or your
  earlier ruling, your pick once you have made one), and one plain line in the gabe-lens plain voice on its card, read right after the
  summary. Picking one scrolls the page to its card just under the bar, highlights it and moves the reading there (starting it if no
  voice played); each card has a listen button. My proposals, drawn dashed: the option "after a decision" (stop there, go on to the
  next open decision, go on with the section) and a "next open decision" button in the bar.
- **tag:** `decision-without-its-own-summary`
- **status:** built (D-077)

### L-30
- **words:** "include examples a d impact on the desición items and for icons use the rules we identified to.pjt text to show about the
  icons when we hover them"
- **read as:** "include examples and impact on the decision items, and for icons use the rules we identified to put text to show about
  the icons when we hover them"
- **where:** the review page · every decision card (D-077) and every icon (the state marks, the pattern marks, the bar's buttons)
- **could not tell:** what a choice would look like or change before choosing it; and what an icon says about THIS item — a hover gave
  the icon's word, not the item's fact.
- **fix:** built: every decision card (the 29 looks, the 4 proposals, the 19 draft suite proposals, the audit, and the L-19 recommendation
  where it stands twice) shows an EXAMPLE, one concrete case from the page's own data (POST /cooking/sessions on the frozen feed for a look
  or a proposal; for a suite proposal, the case on this page it would have caught, with the measured count and the first open row), and the
  IMPACT of each option (what changes on the page, for your reading, or in the suite if you pick it, the cost included for a suite
  proposal); both stand in the decision's spoken summary after what choosing sets in motion and before my pick, so the base is now 2 to 5
  sentences, and every number is filled from the data once for the card and once, spelled out, for the voice. Every icon's hover follows
  this round's rules: one hover per item (a mark inside a chip, a cell, a row or a card adds its fact to that item's hover; a mark that
  stands alone has its own), the item's own fact in plain words (a state mark on a decision says "Open: you have not picked yet. My pick is
  …" and follows your pick), what a kind of mark means said once, in the legend, and a control's hover a verb and its object in six words
  at most. The read-aloud draft takes an optional `example` and `impact` on an item and states the hover rule for the bar's icons.
- **tag:** `choice-without-example-or-impact`
- **status:** built (D-078)

### L-31
- **words:** "The explanations used and read aloud in each one of the items on the patterns or the places where I need to make decisions are
  still too cryptic for me and difficult to follow. Can you use more analogies powered by the Gabe Lens? Especially, I would like to know
  the pain that we are trying to solve and the cost of solving it."
- **where:** the review page · the ten pattern cards and the 53 decision cards, on the page and read aloud
- **could not tell:** why a pattern or a choice matters — the words described the mechanism in the page's own terms, without the pain it
  removes, a picture to hold it by, or what fixing it costs.
- **fix:** built: every pattern card and every decision card (the 29 looks, the 4 proposals, the 19 draft suite proposals, the audit, and the L-19
  recommendation where it stands twice) opens with blocks written in his suit, Sequential-Procedural, with the gabe-lens method: THE PAIN (what goes wrong
  for you today, as a step that fails, with the real case from POST /cooking/sessions and its count), ONE analogy from everyday life, a process, with
  where it stops, THE COST (what solving it takes, in your review time, passes of work or suite run time, and what keeps happening if it is not solved)
  and a one-line handle; a pattern adds the steps of how the defect happens, time from the top with the failing step marked, and the box: does, does not
  do, decides when. The spoken summary of every pattern and decision is rebuilt in that order, the pain first, then the analogy, the cost, the options and
  my pick, 4 to 7 sentences, and a pattern has a listen button of its own. The words are in legibility-review.lens.json; every number in them is generated,
  and the build stops on an id, a path, a symbol, code or a typed number there.
- **tag:** `mechanism-without-its-pain`
- **status:** built (D-079)

### L-32
- **words:** "in all these blocks where we are trying to communicate something that needs to be decided or a situation, let's use more icons
  and more visual encoding of the meaning that we are trying to communicate. Remember that the icons, when we hover on top of them, should
  give a little explanation of what they are trying to communicate."
- **where:** the review page · the pain, analogy, cost, handle, steps, box and options blocks of every pattern and decision (D-079)
- **could not tell:** the weight of a situation at a glance — sizes, costs and gains were sentences to read, not marks to see.
- **fix:** built: the blocks wear icons and small visual encodings, and every icon's hover says what it shows there: the pain wears an icon for its kind
  (cannot tell, the same words again, out of sight, not true, cut or broken, no room, mixed up, a rule nobody checks, a piece missing, talk about the page, half
  a link) and a meter drawn from its real count (a measured check at the start and now, a count of a total, a tally, or how often the pattern came up and how
  many are still there); the analogy wears an icon for its kind of everyday process (a recipe, an assembly line, an order ticket, a checklist, a protocol and
  so on); the cost shows a small, medium or large bar for what it takes to solve (derived from a proposal's kind and gate) beside the if-not mark, and the patterns
  and the suite proposals a two-pan balance of pain against cost; the handle wears a pin; a pattern's steps are numbered chips joined by arrows with the failing
  one marked, and its box reads as does, does not do and decides-when marks; each option's impact is marked as a gain, a cost, both or neutral. The legend says
  each new mark once.
- **tag:** `weight-told-not-shown`
- **status:** built (D-080)

---

Round 3 — source: his REVIEW text from `legibility/legibility-review.html` (2026-10-02), the notes he wrote on its lines.

### L-33
- **words:** "We should improve the hover display using the layout and practices we use in the frontend. On the left, in the endpoint, we have
  some hovers that are beautiful, informative, and easier to read. We should follow that format for all the hovers in general" — and "We
  should track down how we ended up with that kind of hover information but those are the ones I would like to have everywhere, including
  these kinds of pages. That's something that should be present in the gates when we design hover notices and hover windows"
- **where:** every hover on all-endpoints.html and the review page, against the endpoint lab's hover cards
- **could not tell:** a hover at a glance — the pages' hovers are lines of text, the lab's are laid-out cards.
- **fix:** trace how the lab's hover cards came about; make that card the one hover format on these pages; a gate checks a new hover follows it.
- **tag:** `two-hover-formats`
- **status:** logged

### L-34
- **words:** "I can't see the difference between this and the screenshot … both have the same header … At least in the screenshots, they show
  the same thing." — "These are the same screenshots we had in the previous point on the header … it's very important to me to be able to see
  this."
- **where:** the review page · the header and saving choices' pictures
- **could not tell:** what each option changes — the pictures of the different options look the same.
- **fix:** BUILT — the header and saving choices each show only the region that changes, as tight crops taken by real clicks in the walk: the stage
  band over the moment heads (stages over moments against stages, roads, moments) and the commit column under its stage (saving under EFFECTS against
  under HANDLER), each option's crop beside the other's on the review page with one line of what to look at. The two header looks differ on
  POST /cooking/sessions (the road row), so no other endpoint was needed.
- **tag:** `picture-shows-no-difference`
- **status:** built (D-081)

### L-35
- **words:** "I will need a better depiction of what would happen on the different options on this. I don't get what is happening here."
  (on every bench kind's look, on F24, the L-19 recommendation and EX-5)
- **where:** the review page · those choice cards
- **could not tell:** what happens if he picks an option.
- **fix:** BUILT — every bench kind's look, F24, the L-19 recommendation and EX-5 show what you would see after picking each option: a before and an
  after picture, taken by real clicks in the walk where it is a page state (the bench columns), a small drawn mock labelled as a mock where it is a
  proposal not yet built (F24's head, the L-19 rows, EX-5's chip), and one line that begins "after you pick this, you will see".
- **tag:** `option-without-its-outcome`
- **status:** built (D-081)

### L-36
- **words:** "let's simplify them. The options at the top of each container should be more icon-based. We don't need to show the string we are
  going to copy; we just need the button to copy the configuration. The controls for configuring each one should always be visible, along
  with all the controls for modifying what is inside. There should also be a control for the width … Dynamic width - Full width - A shorter
  width - A compact width - The most compact version"
- **where:** all-endpoints.html · the EXAMPLES bench columns
- **could not tell:** the bench's controls at a glance — options were words, the copy string took space, the controls hid in folds.
- **fix:** BUILT — the bench's options are icon squares (the layouts, follow or stay, this endpoint or every endpoint, the steps, back to the default and
  copy), each hover a verb and its object; the copy line is never shown and the copy button copies it whole; parts, size and colour are always on the
  page, none behind a fold; each column has a width (dynamic, full, shorter, compact, most compact; dynamic is my pick, dashed), kept per viewer and
  part of the column's copy line.
- **tag:** `controls-hidden-or-wordy`
- **status:** built (D-081)

### L-37
- **words:** "Ideally the selected column that is widened should be adjustable. I should be able to go to the edges of the column and move left
  or right, with some limits as the maximum and minimum width."
- **where:** all-endpoints.html · BY MOMENT · a widened column
- **could not tell:** — (a control he wants)
- **fix:** BUILT — a widened BY MOMENT column has an edge on its head: drag it with the mouse, or focus it and press the arrow keys (Shift for a bigger
  step, Home and End for the smallest and the largest). The width stays between the column's floor (no name cut) and most of the box, is kept
  like the other column state, rides the copy text, and a click on the head gives it back.
- **tag:** `fixed-width-only`
- **status:** built (D-081)

### L-38
- **words:** "If we don't have enough room, we can make the table bigger than they allow, so we can slide it to the right or left using Shift and
  the mouse wheel"
- **where:** all-endpoints.html · BY MOMENT, when even fitted it is wider than the box
- **could not tell:** — (a way he wants to move)
- **fix:** BUILT — a table that is still wider than its box after fit stays wider; Shift and the mouse wheel slide it sideways (the scroll box takes the
  wheel itself), and a hint line above it says so whenever it overflows. A table opens fitted (R-11, ruled in D-081), so the hint shows only where
  fit could not make it fit.
- **tag:** `wide-table-without-a-way-across`
- **status:** built (D-081)

### L-39
- **words:** "We would need a dedicated section to show the layout for representing this with all the different dimensions and draggable
  objects inside the cards" (the gate card) · "a dedicated section to figure out the layout … depict the stage in a better, more intuitive way
  … dots … or maybe a time-encoded circle with the progress bar" (the stage) · "a dedicated section … I can modify, sort, trigger, move
  things, and show or encode different information using icons, words, colors … and then give you back the copy of the configuration" (gate
  roles, function marks, standard or specialist) · "show all the metadata in just one big element … add controls to show different layouts
  for the metadata" (the metadata)
- **where:** all-endpoints.html · the EXAMPLES bench (new sections)
- **could not tell:** — (the next design pass)
- **fix:** bench sections for the gate card, the stage encoding, gate roles, function marks, the standard-or-specialist split and the metadata
  layout, each with draggable parts, encoding controls and a copy button. Later — trigger: the round-3 page pass lands.
- **tag:** `element-without-a-bench`
- **status:** deferred — trigger: the round-3 page pass lands

### L-40
- **words:** "On the legibility review, can I get a section or a button for the pending decisions where we updated the content for me to make the
  decision?"
- **where:** the review page · the 12 choices he left as my pick in his review (D-081) whose content round 3 updated (L-34 crops, L-35
  depictions)
- **could not tell:** which decisions wait on him now — they sit among 53 cards across three sections.
- **fix:** none needed — the bar's menu already gathers them: every dashed circle is a pending choice, and the "Your calls" chip counts them
  (12). He confirmed and goes through them from there (D-082).
- **tag:** `pending-scattered`
- **status:** answered — already on the page (D-082)
