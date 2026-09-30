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
- **status:** built (D-067); the external legend — option, his to pick (D-067)

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
- **status:** built (D-068); the header's form and the stage saving stands in — option, his to pick (D-068)

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
- **status:** built (D-068); after the table or before it — option, his to pick (D-068)

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
- **fix:** a test BLOCK, the way the lab's table block was found — designed on the examples bench (L-23), then iterated.
- **tag:** `context-without-meaning`
- **status:** logged

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
- **fix:** every gate or decision names the function it runs in, with the function's glyph and role (repeats are fine).
- **tag:** `element-without-identity`
- **status:** logged

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
- **fix:** G&D as chains — function → condition (the flag or expression) → effect (ending · validation · branch), the effect
  coloured by the stage or branch it leads to. A representation: built as options, decided by seeing.
- **tag:** `condition-without-actor-or-effect`
- **status:** logged

### L-11
- **words:** "by the way, in gates and decisions, in gates and decisions, we might have, okay, we will have the functions
  associated to the gates and decisions, but can we also put some roles in the gates and decisions themselves? I'm not sure
  about this I just figured out that since functions already have a role, maybe gates and decisions might have something
  similar since they validate things on different levels."
- **where:** BY MOMENT · Gates and decisions (the whole row)
- **could not tell:** at which level a gate decides — the chips carry no subcategory.
- **fix:** a proposal of G&D roles read from the feed's own categories, shown as an option.
- **tag:** `kind-without-subcategory`
- **status:** logged (question)

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
- **fix:** functions on the left, tables on the right, connectors coloured by operation (the page's existing read/write
  encoding reused). A representation: built as options.
- **tag:** `relation-flattened-into-a-list`
- **status:** logged

### L-13
- **words:** "in functions again, we will have to do kind of the same thing that we did on the endpoint lab for the tables for
  functions also. I think that we already did it for schemas. So functions should be shown with a little bit more of detail.
  And in blocks."
- **where:** BY MOMENT · Functions
- **could not tell:** what a function does — a chip is its name and role only.
- **fix:** a function BLOCK, designed on the examples bench (L-23), then used in the row.
- **tag:** `name-only-chip`
- **status:** logged

### L-14
- **words:** "there is some functions that do not have the function icon or their role. For example, in the column for
  subscription tier for plus two, we have the resolution snapshot that violations for. And we have the derive underscore
  restrictions. Those two, if they are functions, they should be— they should be given a function, icon, and a role. And I
  would like to know why we haven't done that. Or in the get idempotency key, in the checks column also having the same thing."
- **read as:** `ResolutionSnapshot.violations_for` · `derive_restrictions` · `get_idempotency_key`
- **where:** BY MOMENT · Functions · subscription_tier_for +2 and checks
- **could not tell:** whether those names are functions at all.
- **fix:** a function always wears the function glyph; its role where the map knows it; the why answered on the page.
- **tag:** `element-without-identity`
- **status:** logged

### L-15
- **words:** "on client, we have the hook— okay. Can we somehow associate that hook with some schema or table? I don't know. I'm
  not really sure, but the hook is kind of the frontend function. The place is and says it's a fetcher. But what is fetching
  and from where?"
- **where:** BY MOMENT · Client · after the answer · the hook `refresh ["cooking"]`, role fetcher
- **could not tell:** what the fetcher fetches (which endpoint, which schema, which tables) and from where.
- **fix:** the hook names its fetch — the endpoint it calls, the schema that answers, the tables behind — and its file.
- **tag:** `role-without-its-object`
- **status:** logged

### L-16
- **words:** "And the same thing in the— after the answer column for client, we have some ending for 403 and 404. Why do they
  trigger? In which context? A function I gave what is happening there."
- **read as:** "Which function, and what is happening there?"
- **where:** BY MOMENT · Client · after the answer · `cookingSessionModel.ts:381 403` · `:384 404` · `:389 409`
- **could not tell:** why the client branch fires, in which function, and what it does — the chip shows a file and a line.
- **fix:** the branch names the function it sits in, the endings of this endpoint that reach it, and what it does.
- **tag:** `location-without-actor`
- **status:** logged

### L-17
- **words:** "In flight state is something very important and I would like to give it an appropriate icon to that row." — and:
  "inside state— We have different. Items there. Which I think that need a better representation so with the some icon
  coloring for. Roles in the inflight state, and say. What— okay, inflight state is basically some sort of temporary flag that
  we store or something like that, right, that will affect something. So the idea here is visualize or surface what we are
  affecting. Um, So I would like to dig deeper on that to see possibilities on what we could represent on that inflight state."
- **read as:** "in-flight state"
- **where:** BY MOMENT · In-flight state (`dependency-value session`, `dependency-value ctx`)
- **could not tell:** what an in-flight item is and what it affects; the row has no icon.
- **fix:** a row icon; each item with its kind's glyph and colour and what it affects; possibilities shown as options.
- **tag:** `role-without-its-object`
- **status:** logged

### L-18
- **words:** "Then standard of specialists, let's give it an icon also. We have here flags, binding, and different things um.
  I'm not sure what what are we representing here let. Me check pieces Again this might require its own icon but I think that
  this maybe can be merged with gates and decisions because they are touching similar things like functions that will
  determine something along the way so tell me about that"
- **read as:** "standard or specialist"
- **where:** BY MOMENT · Standard or specialist (`binding TokenVerifier`, `reads a repeat key`, `claims its key with
  get-or-create`, `can answer 403`)
- **could not tell:** what the row represents.
- **fix:** a row icon; the row explained on the page; merging it into Gates and decisions evaluated and shown as an option.
- **tag:** `concept-never-explained`
- **status:** logged (question)

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
- **status:** logged (analysis)

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
- **status:** built (D-068); what a head's click gives and what fit does — option, his to pick (D-068)

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
- **status:** built (D-067); the hover's form — option, his to pick (D-067)

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
- **fix:** an EXAMPLES section: one column per element kind across the page, each with a title, an element selector and a
  role filter, the element drawn, and below it its controls (show · order by drag · size · colour) and a copy button.
- **tag:** `no-bench-for-one-element`
- **status:** logged
