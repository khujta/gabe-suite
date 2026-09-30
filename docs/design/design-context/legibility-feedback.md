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
- **fix:** the kind definitions leave the item hovers and become a legend (see L-04 for where).
- **tag:** `static-text-repeated-in-hovers`
- **status:** logged

### L-02
- **words:** "the final is the container that contains both the label and the 4, 29 square. That says 4, 29 endings. Rate
  limit exceeded, try again shortly. And for the second one, says exactly the same thing. So I don't know which— what is the
  difference. And I don't know— and I guess that we should consolidate in just one hover this whole icon. Okay. And— and the
  idea is that the hover ha— between icon— between items contains the different information because they are different
  items."
- **where:** BY MOMENT · Endings · at the edge · one ending chip = three hover targets (label · code square · container)
- **could not tell:** which of three partial cards describes the item; each tells a third of it.
- **fix:** ONE hover per item, on the whole chip, carrying that item's own facts.
- **tag:** `one-item-three-hovers`
- **status:** logged

### L-03
- **words:** "Then if I hover in the 4, 29, I can see a client error status. Not declare, status. Sense, retry after. And
  that's okay. I suppose that that's a description of what is actually happening. There, and why. And that— that might be
  good. But the thing is that in the 2, 4, 29 sections that we have on this row, in endings, on— at the edge, both 4, 29 say.
  The same, exactly the same, seems like, yeah. So I don't see the difference between one and the other."
- **read as:** "not declared · status · sends Retry-After"
- **where:** BY MOMENT · Endings · at the edge · the two 429 endings
- **could not tell:** what makes the two 429s two endings — the hovers never name what differs between them.
- **fix:** each ending's hover leads with what makes it itself (who produces it, on what condition, with what numbers).
- **tag:** `twin-items-indistinguishable`
- **status:** logged

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
- **fix:** the legend sits at the row's head: hovering "Endings" shows the kinds the row uses (his placement); an external
  legend is the other option. One hover per ending.
- **tag:** `static-text-repeated-in-hovers`
- **status:** logged

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
- **fix:** a header row of core stages over the moments; each moment under its stage; branches visible as branches; the
  moments outside the request grouped and said so.
- **tag:** `mark-without-its-meaning`
- **status:** logged

### L-06
- **words:** "the final column, the one that says "no moment", in that column we might just remove it. I mean, not remove it
  at all, but put it in a different— in another row, separate from the table at the end. Or at the beginning. With the
  metadata. And we can put labels on that metadata saying that some data pertains to the proof section, or the data effects,
  and so on. But there is no need to have this "no moment" section there."
- **where:** BY MOMENT · the last column, "no moment"
- **could not tell:** that a column in a time table holds no time — it reads as one more moment and takes width from the rest.
- **fix:** out of the table into a metadata section of the endpoint, each fact labelled with the block it belongs to (after the
  table or before it — an option).
- **tag:** `timeless-facts-inside-a-timeline`
- **status:** logged

### L-07
- **words:** "Same thing for "overview" and "risk". That is also metadata information. So this is metadata for the whole API
  endpoint, and that will go in a different section in our navigation bar on the Gabe universe." — and later: "overview. We
  already said that it will be consolidated in a metadata information section for the whole API endpoint or element that we
  are selecting"
- **where:** BY MOMENT · the rows Overview and Risk
- **could not tell:** same as L-06 — rows of timeless facts inside the timeline.
- **fix:** into the same metadata section as L-06.
- **tag:** `timeless-facts-inside-a-timeline`
- **status:** logged

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
- **status:** option — his to pick (D-071)

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
- **fix:** built: the GATE OR DECISION column's role filter on the examples bench — nine roles from the feed's own groups, each
  block naming the function it runs in (glyph + role), its condition and its effect.
- **tag:** `kind-without-subcategory`
- **status:** option — his to pick (D-071)

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
- **fix:** built: the FUNCTION column of the examples bench on the lab's function look — a strip of the tables it touches; a
  click lists its raises (and what each becomes here), tables, calls and what it does. Its use in BY MOMENT waits on EX-5.
- **tag:** `name-only-chip`
- **status:** option — his to pick (D-071)

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
- **fix:** each such column shown in BY MOMENT, or its place there named.
- **tag:** `lost-between-views`
- **status:** logged

### L-21
- **words:** "we are going to remove the no moment column but still the layout is awful it's difficult to read we don't give a
  lot of space for the other columns so I would like to be able to uh. Click the columns for accommodation. The contents
  inside so give a little more width to put the contents as is expected that we need to show properly the contents that per
  column and to also hide other columns so I can probably have hiding columns will give more room to the other columns to
  accommodate and and we will still have a button that will force accommodation by minimizing or moving the other columns
  around"
- **where:** BY MOMENT · the whole table
- **could not tell:** a cell's contents — names wrap letter by letter in columns too narrow for them.
- **fix:** click a column to widen it to its content · hide a column · one button that fits the table by narrowing the rest.
- **tag:** `cramped-columns`
- **status:** logged

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
- **fix:** a hover rule: the item's own facts in input → process → output order, with only the static context needed to read
  them.
- **tag:** `hover-describes-the-kind-not-the-item`
- **status:** logged

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
