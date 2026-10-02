# Legibility — the rules a human reader needs

> Binding for every page this skill builds or retrofits that a person will READ (dashboards, explorers, lab and
> review pages, generated reports). `SKILL.md` points here; the chrome gates (`verify-artifact-chrome.mjs`) prove the
> page is a well-formed artifact, these rules prove a person can read it.

**Why they exist.** The model that builds a page reads every hover at once, beside the data record that tells items
apart, so repetition, a bare word or a code spelling costs it nothing. A person sees one hover at a time and the
pixels: a definition repeated on every item hides the one line about THIS item, a bare word is an unknown thing, a
mark with no key stops the reading. Each rule below is stated once, with one example, and says whether the audit
checks it.

**The audit** — `node <skill>/tools/legibility-audit.mjs <page.html> [options]` opens the built page in a browser and
counts what the rules below forbid. It REPORTS and never gates: every count is a lead for a look, not a verdict (a
repeated line may be a legend line on purpose). Declare the page's hover system by option (`--hover-attr`, `--tip`,
`--tip-shown`; defaults fit the suite's generated pages: a `data-tip` attribute on each target and one `#tip` box) and
narrow the audit to a grid of elements with `--rows`. Header of the tool: every option and count. Battery:
`tests/legibility-audit/run.sh`.

## Hovers

### One hover per item
An item is ONE hover target. Its glyph, its label and its status mark are drawn inside it and do not hover apart —
pointing at the label and at the icon of one chip must not show two cards.
*Example:* a gate chip (`login check · 401`) answers with one card; the `401` square inside it does not carry its own.
*Checked:* `nested` — a hover target inside another.

### The item's own facts first — before · checks · gives
A hover opens with what makes THIS item itself, in the order the code meets it: **before** (what must hold, what brings
the code here) · **checks** (what it checks or does, and where) · **gives** (what comes out, and what that does). A part
the data holds nothing for is left out, never guessed. Two different items never read the same.
*Example:* a rate limiter — before: every request but the health check · checks: 120 per 60 seconds, keyed by caller
address · gives: 429, and the request goes no further.
*Checked:* `twins` — two items in one container whose hovers read the same. Whether the facts are the right ones, and
in this order, is a read.

### A label may repeat; what a kind means lives once
Information may repeat across hovers only as a short label or a very short note. The majority of a hover is the content
that changes from item to item. A definition of what a kind of item IS — anything that would be the same on every item
of its kind — moves to ONE place the reader can open: a legend on the row or the table, or an appendix.
*Example:* every `ending` hover repeating "an ending is every way a request can end" is a legend line; the hover keeps
`409 · the household has no free slot · rolls the save back`.
*Checked:* `repeatLine` — a line of at least `--label-len` characters (24) that `--repeat` hovers (5) show;
`repeatMajority` — hovers whose repeated lines are more than half of the hover. Shorter lines may repeat freely.

## Faces and words

### What the code does is shown; how the map knows it is not
A hover, a face or a legend says what the CODE does. It never says where the page took a colour or an icon from, which
generator or map found a fact, or what the map could not read ("as the table draws it", "found by the graph", "the map
does not know"). A panel whose subject IS the map or the page (a coverage page, a gaps page) is the one exception and
says so in its title.
*Example:* "checks the token, and refuses with 401" — not "checks the token (as the station draws it)".
*Checked:* not yet — a review reads for it until a check on a rail that already runs is agreed.

### An element wears its identity
Every item in a row of elements carries an icon of its kind — the station's own, or a page mark the legend declares —
so a reader can tell a gate from a function from a screen without hovering. A number or a mark alone is a value, not an
element, and needs none.
*Example:* a gate chip carries the gate glyph before its words; a bare `check` is an unknown thing.
*Checked:* `bare` — a named item in a row of elements with no glyph (point `--rows` at the grid).

### Meaning first, in words; the code last, as written
A face and the opening line of a hover say what the thing means in words. The code spelling — an expression, a library
error id, a feed id, an i18n key — belongs last in the hover, as written, for the reader who wants it. A role word
names its object: a fetcher OF what, a check IN which function.
*Example:* face `no household set`; hover last line `self.household is None`. Never the expression as the face.
*Checked:* `machineWords` — raw expressions, library error ids, feed ids and i18n keys on a face or a hover's opening
line (`--machine` adds a page's own words, `--keep` the names that are the only name there is).

### Nothing unfilled
No `{token}`, `undefined` or `NaN` is ever visible; a URL's `/users/{id}` is a path, not a hole.
*Checked:* `unfilled`.

## Marks, numbers, axes

### A mark carries a visible key; a number carries its noun; an axis holds one kind of thing
A colour, a stage pip or a shape that means something has its key drawn beside it on the page, not only in a hover. A
count says what it counts. A timeline's heads are all moments; a column of timeless facts goes beside the timeline, not
inside it.
*Example:* `proven 2/14 — endings` and a swatch row naming each stage colour; "no moment" is not a column of a timeline.
*Checked:* not yet — a review reads for it until the navigation consolidation settles the check.

## A rule needs its check

A rule that lives only in words breaks on the next surface. When a page rule is written, the change names the check
that holds it, on a rail that already runs: the generator's build, the render gate, the commit gate, or this audit. See
the execution contract's generated-pages clause (`../../gabe-docs/references/execution-contract.md`).
