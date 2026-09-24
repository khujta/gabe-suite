# Mini universes — the station, boxed

**The ask (operator, 2026-09-08):** from the big graph, generate *little* graphs that embed in web pages
throughout the Gabe Center — for one **entity**, one **commit**, one **test** — showing only what is
pertinent, with the flip menu, the legend and the rest of the station's chrome cut to a couple of
buttons. **The correction, same day:** not pictures. *"The actual 3D mini planes that allow us to
navigate, just like we do when we focus on something."*

**What that turned out to be:** the station already has this. `__uniHLSelect`
([gabe-universe.html:2645](../../../templates/center/shell/gabe-universe.html)) — *"a CLICK
focuses+HIDES the outside (operator: show THIS + its immediate neighbours)"*. A mini pane is **that
focus state, made permanent and boxed**: the subject as the focus origin instead of a clicked node,
chrome stripped, dropped into a page.

**The second pass (operator, 2026-09-09):** a step rail like Comet's — steps down the right, transport
in the middle of the panel; and *"the coloring and transparency are not as we are showing it in the
graph… everything looks kind of white."*

Open **[index.html](index.html)** — four live mini universes (journey · entity · commit · test). Drag
to orbit, wheel to zoom, click a piece, or walk the steps with home / prev / next.

---

## One picture

```
  c4-graph.js (1,188 kb) ─┐
  commits.js    (34 kb) ──┼─► _slice.js  RESOLVER ──► {subject, nodes, edges, steps, honest, stats}
  workflows.js   (6 kb) ──┘   journey | entity | commit | test      0.8 – 8.2 kb
                              hops 1|2 · seed-first cap             │
                                                                    ▼
  gabe-universe.html ─────► _uni-grammar.js ────────────────► _pane.js   ForceGraph3D
    (the station)           EXTRACTED VERBATIM                 layer force · exact camera fit
                            glyphs · planet bubble             click → detail line
                            badges · colour rosters                    │
                                                                       ▼
                       ┌────────────────────────────────┬───────────────┐
                       │  ● Store ingredients…        ↗  │   AUTHORED    │
                       │ ┌──────────────┐                │ 1 ● POST /pa… │
                       │ │ ◍ subject │ ◍→ +1 hop │       │ 2 ● POST /pa… │
                       │ └──────────────┘                │ 3 ● PATCH /p… │ ← cursor
                       │      [ orbit · zoom · click ]    │ 4 ● GET /pan… │
                       │                                 ├───────────────┤
                       │                                 │   ‹   ⌂   ›   │
                       ├─────────────────────────────────┴───────────────┤
                       │ ● PATCH /pantry/items/{item_id} endpoint         │
                       │                         complete — nothing held  │
                       └──────────────────────────────────────────────────┘

   REACH changes what is DRAWN, so it sits on the picture.  TRANSPORT changes where you ARE,
   so it sits with the steps.  Two classes of control, two homes.

   Selecting a piece — by click or by step — rings it, lights its IMMEDIATE neighbours and the
   wires between them (2.6x), and dims everything else to geography.  The station's law, the
   station's numbers; GLOW rather than the station's FOCUS+hide, because a pane of 24 has no
   context to spare.
```

---

## What was measured before anything was designed

Frozen example feed — gustify, `c4_head 8356f531`, read 2026-09-08.

### Can a page host several live 3D views? Yes, easily.

Measured on **swiftshader** — CPU-emulated GL, the slowest possible host. A real GPU is faster.

| instances | mount | canvases | contexts lost | heap | errors |
|---:|---:|---:|---:|---:|---:|
| 1 | 51 ms | 1 | 0 | 13 MB | 0 |
| 3 | 54 ms | 3 | 0 | 13 MB | 0 |
| 6 | 97 ms | 6 | 0 | 16 MB | 0 |
| **12** | **204 ms** | **12** | **0** | **15 MB** | **0** |

This was the one thing that could have killed the idea. It does not.

### What a pane actually costs

| asset | size | loaded by a pane? |
|---|---:|---|
| `3d-bundle.js` (THREE + ForceGraph3D) | 1.6 MB | **yes** — shared and cached across every pane and the station |
| `chip-assets.js` (ship + satellite GLBs) | 2.7 MB | **no** — fleets are a station-only layer |
| `c4-graph.js` | 1,188 kb | only where the page already has it; a slice is 0.8–8.2 kb |
| `levels.js` | 1,132 kb | **no** — no scope needed it |

### The four scopes resolve with no emitter work

| fact | number |
|---|---:|
| L2 nodes · cross-edges | 313 · 343 |
| fe pieces · fe edges | 1,078 · 3,229 |
| commits carrying `touched[]` | 30 |
| touched ids that fail to resolve | **0 of 425** |
| touched ids that are `fe:` | 246 of 425 (58%) |
| distinct C-ids on `det.cases` | 488 across 196 nodes |
| curated journeys in `workflows.js` | 16, all steps drawn |

### The four panes on the page

| subject | seed | drawn | wires | steps | slice | held back |
|---|---:|---:|---:|---|---:|---|
| journey `Store ingredients` | 4 | 24 | 39 | **4 authored** | 4.4 kb | nothing |
| entity `pantry` | 81 | 24 | 35 | 24 derived | 4.5 kb | 6 web · 14 endpoint · 31 schema · 6 model |
| commit `a99719f3` | 65 | 24 | 13 | 24 derived | 3.9 kb | 6 component · 3 module · 7 fe-type · 4 endpoint · 2 middleware · 19 schema |
| test `C250` | 20 | 20 | 15 | 20 derived | 2.7 kb | *(fe pieces unmeasured — F2)* |

### The walk

A pane's steps come from one of two places, and the rail head names which:

| source | where from | rail head | who has it |
|---|---|---|---|
| **authored** | `workflows.js` — the operator's own ordered endpoints | `authored` | the journey scope |
| **derived** | the drawn pieces in request order (the lane law) | `derived order` | entity · commit · test |

A derived order is a *reading* order, not a chronology. Saying so in the rail head is the whole point:
a commit pane that presented lane order as "what happened first" would be lying.

All **16** curated journeys keep every authored step under the budget (0 missing, 0 held) — which was
only true after F10 below.

---

## How the grammar stays the station's

`_uni-grammar.js` lifts **340 lines** out of `gabe-universe.html` in eleven bands — the disclosure tiers,
the lucide `GLYPH` roster, the `KINDS` forms and the kind extensions, `KINDCOL`/`METHOD`/`RELCOL`/`LINKMETA`,
`dimCol`/`inkCol`, the primitive and billboard meshes, the planet `bubble`, `labelSprite`, `iconCol`,
`massR`, the badge painter and its colour roster, `buildNode`.

The trick that keeps it verbatim: the extracted code expects station globals (`ENC`, `CFG`, `fieldOf`,
`PULSE`, the badge globals). Rather than rewrite it — which would turn a future promotion into
`assets/` from a **move** into a **rewrite** — the factory *provides those names as locals*, with the
station's own defaults and the encoding layer switched off.

Left behind deliberately: fleets and war zones, the encoding channels (glow, satellite rings, radar
verts, pulse), heat colouring, hulls, journeys, the config panel. `ENC`/`CFG` hold them off, so the
extracted guards simply skip them.

**It is generated, never hand-edited:** [`promote.py`](promote.py) finds each band by its start marker
and the balanced close of its end marker (never a line number), applies the four renames that turn the
station's badge globals into factory locals, and writes the file here and into
`templates/center/shell/assets/`, beside generated copies of the other six runtime files (D-045). The
bands and the renames are listed in the file header. `python3 docs/design/embed-graph/promote.py --check`
is the drift guard, and `tests/gabe-universe` (11c) runs it: a band of the station that moves without a
re-run fails the battery.

---

## Findings

### F1 · Wire density kills a small picture; node count does not

`settings` draws **16 nodes and 43 wires**; `pantry` draws **24 and 35**. The smaller entity is the
harder picture. Same for tests: `C13` is 16 pieces and 30 relations, denser than `C250`'s 20 and 15.
A node budget alone is the wrong control — the cap wants a wire term.

### F2 · A frontend piece has no test data, and the test scope says so

The `fe` arm carries `area · feClass · file · home · id · kind · name · span` — no `det`, no `cases`.
A frontend piece in a test slice is **unmeasured**, never *untested*, and the resolver prints that
sentence on every test-scope slice.

Same defect [`workflow-panel/FINDINGS.md`](../workflow-panel/FINDINGS.md) F2 found in the station's own
card, where all 1,078 fe pieces render "unguarded · no test covers this". Two independent surfaces hit
it in one day: it is a **feed** gap, not a render gap.

### F3 · The commit scope is a frontend scope

246 of 425 touched ids are `fe:`. A commit pane that only understood backend nodes would draw a
minority of the change and look complete doing it.

### F4 · Hop 2 is a sample, not a neighbourhood

Hop 2 takes `__unclaimed__` from 9 candidates to 43, `allergen` 11 → 65, `auth` 18 → 70. Every hop-2
slice at card budget is capped, always — so the honest line carries that weight, and the probe asserts
it stays orange there.

### F5 · `zoomToFit` lies when node objects are custom *(fixed)*

force-graph measures `nodeThreeObject` groups. A pane's node carries a planet bubble and (at larger
sizes) a label sprite, so the wrapper framed a box far bigger than the pieces: **every pane sat at
roughly a quarter of its viewport**, and an earlier variant overflowed instead. The DOM was identical
in all three states — only a screenshot showed it.

The fix computes the fit from the nodes' own bounding box and the camera's real vertical and horizontal
FOV. The probe now asserts the drawn field **projects inside the viewport** and **spans ≥ 0.45** of it:
geometry, not element counts.

### F6 · The layer law has to beat the charge force

At `LZ × 0.22` with a `0.055` pull against a `-95` charge, the banding was invisible and `pantry` read
as a horizontal smear. At `× 0.62` / `0.16` against `-70`, the bands separate and a pane reads
top-down: frontend and endpoints up, api in the middle, models and providers below.

*Honest gap:* no assert covers this. The probe would pass with the layer force deleted. It is a visual
law verified by eye, and saying so is better than implying otherwise.

### F7 · The station's kind roster is not one literal

`KINDS` ends at line 1103, but the station **mints nine more kinds afterwards** — `web`, `module`,
`unknown`, `capsule`, `middleware`, `provider`, `flag`, `prompt`, `element` — with their glyphs and
`RELCOL` rows. A band that stops at the literal dies immediately on `KINDS.web.col`. Anyone extracting
from this station needs lines **1123–1215** too.

### F8 · Station labels are sized for a station camera

`labelSprite` is tuned for the universe's far camera. In a 330px pane the labels were illegible *and*
redundant — the ruled interaction already names a piece in the detail line on click. So a card-sized
pane drops them entirely and the larger sizes shrink them to 0.7.

### F9 · I hand-wrote a station constant, and the picture went white *(fixed)*

`OPMAP.bubble` is a **named** map in the station — `{film:0.006, ghost:0.012, faint:0.022, subtle:0.035,
medium:0.05, strong:0.075}` — and `CFG.bubble` defaults to `"film"`. The first extraction wrote it as an
**array** `[0, 0.10, 0.18, 0.28]` and indexed 1, so every planet's shell rendered at **0.10 — seventeen
times too opaque** — with its wireframe rim at 0.17 against a true 0.0102. That grey-blue `#aab4c6` shell
washed the whole picture out, which is exactly what the operator saw: *"everything looks kind of white."*

The background was a near-miss too: `#0e1118` against the station's `#0e1524`.

The rule this earns: **a station constant is extracted or it is wrong.** The comment on the fabricated
array even claimed it was "the station's four bubble-opacity steps" — a guess wearing a citation, which
is worse than an obvious guess.

*Consequence:* at the true `film` the pieces are glyph-forward with a barely-there shell, so `iconSize`
moved 10 → 14. That is legitimate — the station itself calls `iconSize` a **global display control**, and
a 270px viewport is not a 1400px one. The transparency, colours and forms are now the station's exactly.

### F10 · The per-kind cap starved the subject's own pieces *(fixed)*

A journey's authored endpoints are the seed — the pane is *about* them. But the per-kind proportional
quota treated them as ordinary candidates competing with their own neighbourhood, so **"Look for recipes"
lost one of its three steps to the budget** and the rail struck it through as though the map had never
drawn it. Two different failures wearing one mark.

The cap is now two-tier: **the seed has first claim**, and only the neighbourhood competes for what is
left; if the seed alone overflows, the neighbourhood is dropped entirely and said out loud rather than
competing with the subject. And a step now carries `missing` (the map drew no such endpoint) separately
from `held` (it exists, the budget did not reach it), because striking both through identically misreports
the journey.

All 16 curated journeys now keep every authored step. Both halves are mutation-proven.

---

**F11 · The two pictures differed by budget, not by kind — and the operator read it as tier.** *(2026-09-09,
the pantry seat beside the station)* Measured with the resolver, no browser: pantry claims 81 pieces —
20 endpoints · 8 models · 43 schemas · 1 external · 9 screens. At the station's boot tier (T1) that is
the whole set; the fill pane drew **60 of 81** (12 schemas · 5 endpoints · 2 screens · 2 models held) and
the station drew all 81, so the station looked richer. Two fixes: the FILL budget rose 60→120 (80 under
900 px) so an entity of this size draws whole, and the tier now travels (R10) so a station parked at T2/T3
comes back to the pane's picture on paste. The pieces a pane can *never* draw are the station's
functions — `levels.js` is not a pane feed — which is exactly why the tier must land on the station and
not the other way round.

## The console skin — the game-UI library, applied

**The ask (operator, 2026-09-09):** *"look at the library list of components or representations in
games … see if we can improve or design better and more beautiful components here."* The library is
[`workflow-panel/CONSOLE-MAP.md`](../workflow-panel/CONSOLE-MAP.md) — Blizzard's own SC2 region names,
each traced to what the station has. `_pane-console.js` + `_pane-console.css` port those regions to
pane scale, and since 2026-09-09 (operator: *"much more beautiful than the other"*) the console is the
pane's **default**; the classic frame survives as `skin: "classic"` with its own battery, and
[index.html](index.html) shows either. The four seats carry the console.

| SC2 region | pane component | the law it carries |
|---|---|---|
| PortraitPanel | the head: the subject's own station glyph on a kind-tinted pill, name, a scope badge | a portrait, not a dot |
| InfoPaneQueue | the step rail as a **queue**: kind glyph per step, a segmented progress bar, the current step lit | one lit row, one lit segment |
| MinimapPanel | **discarded** — a plan view was built and rejected on sight: at pane scale the picture already *is* the whole slice, so a second map of it is furniture | recorded as a negative result |
| InfoPaneUnit vitals | **four fixed meters** — drawn · wires · steps · tested — on tracks | each slot always present, wearing one of the states: LIT · FULL · GREY · HATCHED · BLANK |
| CommandPanel | the verbs as **cells**: reach on the picture, transport under the queue, copy · open in the head | a disabled verb keeps its cell — SC2 blanks it, never slides the next up |
| BehaviorBar | the honest line as **chips**: kind glyph + count per held-back kind, hatched for unmeasured, green when complete | the sentence moves to the tooltip |
| the HUD's shared tip | one instant tooltip for every control, no native `title` | the words live in the hover |

Region tints are the dock's own (`_hud.js` `REGTINT`), so the pane and the console read as one family.
The resolver now also reports what it held back as data (`stats.held`, per kind) beside the sentence,
and the grammar exports its `GLYPH` roster for skins that draw kind icons in HTML.

Battery: `node console-probe.mjs` — measures the laws, not the DOM: one lit queue row and segment while walking, chips summing to the held-back total, a frontend-only test
pane showing TESTED as hatched.

---

## Rulings

**R1 · The pane is the station's picture, not a picture of the same data.** *(operator, 2026-09-08)*
Glyphs, planet bubble, badges and colour rosters are extracted verbatim. A pane that invents its own
spheres is a different instrument wearing the same data.

**R2 · Look, don't leave the subject.** *(operator, 2026-09-08)*
Orbit, zoom, hover, and click-to-name. A click **never re-roots** the pane, so a feature page for
`pantry` always shows `pantry` and the page's subject and the pane's subject cannot disagree. The only
way out is the station link. The probe asserts the subject survives a drag.

**R3 · The chrome floor is five buttons and one link, in two classes.** *(amended 2026-09-09)*
It was two — hop depth and open-in-station. The step rail added three, so the floor is now
**2 reach + 3 transport + 1 link**, and the two classes live apart:

| class | what it changes | where it lives | how it reads |
|---|---|---|---|
| **reach** | what is DRAWN | on the picture, top-left (the station's corner-box grammar) | `◍ subject` · `◍→ +1 hop` — **words**, because two 9px dot-glyphs could not carry the difference |
| **transport** | where you ARE in the walk | under the steps, in the rail | `‹ ⌂ ›` — **home in the middle**, drawn as lucide icons, never text characters |

The detail line and the rail rows are *readouts*, not controls. The probe pins the count, the order,
the icons and the two homes — moving reach back to the foot or home back to the left fails the
battery.

**R4 · Everything held back is counted and named.** The per-kind proportional quota (floor 1) keeps
every present kind visible, and what is dropped appears on the honest line, per kind.

**R5 · The rail names whose order you are walking.** *(2026-09-09)*
A journey walks the operator's **authored** order from `workflows.js`; every other scope has none, so
its rail head reads `derived order` and the order comes from the lane law. A reading order presented as
a chronology would be a lie about a commit.

**R8 · A view travels as a payload; OPEN is the only gesture, and it replaces.** *(2026-09-09, amended after first use)*
The copy action in a pane's head emits a small object — subject, selected node id, hop depth, the
map's `head`, and `focus: true`. The station's **paste a view** box — a clipboard icon in the header, left of the tier dots,
opening a small popover (moved out of the journeys panel 2026-09-09: a view can be an entity, not
only a journey) — opens it under four rules the operator set after trying it:

1. **Paste never opens.** Only the *open* button (or Enter in the box) does, and *open* lights only
   when there is something to open.
2. **Open clears first.** Whatever journey, trail, selection, pins and highlight are live go before
   the pasted view lands — a paste is a replacement, never an addition. A successful open also closes
   the popover and the journeys picker, so the loaded view is what you see.
3. **A journey opens at its first element.** The pane's own selection rides along as a note
   ("the pane's selection is step 24") for the walk controls to reach — never as the position.
4. **It opens focused.** `__uniJrnStart` sets glow on purpose for a hand-picked journey; a pasted one
   flips to focus once the walk exists.

Two defects the first version had, both found by the operator in use: pasting auto-opened, and a
selection that was not on the station's walk sent the reader through `__uniHLSelect`, which turns a
running journey into a 7-step trail. The reader now never selects while a journey walks, and it
verifies the walk actually started (`__uniJrnStart` returns silently for a journey with no drawn
carriers) rather than reporting the previous state as the new one.

What looked like accumulation was mostly scale: the station's walk is `fe.concat(carriers)`, so
"Cook a recipe" is **96** steps, "Look for recipes" **88** — against 4–5 authored endpoints in the
pane. Measured: starting A then B gives B's length alone; `__uniJrnStart` replaces.

A payload from another `c4_head` still opens, and says so. Junk is refused with a reason. This is
the one thing in the folder that touches `gabe-universe.html`; the example page is refilled from the
template with `fill-example.py`, and `tests/gabe-universe` stays green.

**R7 · A selection lights its immediate neighbourhood; it never hides the rest.** *(2026-09-09)*
The station's law is copied exactly — `_hlCompute` (:2534) BFS to **depth 1** ("a click focuses the
IMMEDIATE neighbourhood, not a depth-3 flood"), lit wires are the ones with **both** ends in the set,
and `_hlLinkF` (:2553) emphasises them by **2.6**.

The *treatment* differs on purpose. `__uniHLSelect` puts the station in `FOCUS` + `rest:"hide"`, which
removes everything outside the set — right for a 1,351-node field, wrong for a pane of 24, where it
leaves three pieces floating. A pane uses the station's other shipped style, **GLOW**, and dims the
outside to 0.28 of its own base opacity so it survives as *geography*. Dimming scales each material's
own base, so a film-thin bubble stays film-thin rather than jumping to a flat value.

Stepping selects, so the walk carries the highlight with it. A background click restores every
material and the probe measures that on the live materials, not on a class name.

**R9 · The camera never moves on its own.** *(operator, 2026-09-09: "that kind of movement is not necessary")*
No fly on a step — the pane fits all its pieces, so a stepped piece is already in view and the fly
only added motion. And the picture **appears already framed**: the viewport stays invisible until the
one settle fit, then fades in, so no camera cut and no layout flight is ever on screen. The backstop
fit fires only when the engine has gone silent without reporting a stop — a fixed delay is
host-relative (a GPU settles in 2–3 s, swiftshader in ~13 s) and a backstop that fits a half-settled
layout made a *second* cut when the real stop arrived. Measured: one fit, then the camera holds; a
step changes nothing.

**R10 · The pane draws at a tier, and the tier travels.** *(operator, 2026-09-09: "we also should carry over
the tier view into the graph when we copy the object")* The station's four disclosure presets
(`_TIER_PRESETS`, extracted verbatim as `window.GabeUniTiers`) are the pane's too: the resolver drops the
preset's `koff` kinds and `fcoff` component classes, a journey's authored steps pinned through it the way
the station pins a walk. The pane boots at **T1 · Surface** like the station, wears a `T1` badge beside the
scope badge, and the payload carries `tier`; the station's reader applies it **before** the open (a tier
press re-applies the preset and clears any non-journey focus). A payload without a tier leaves the
station's tier alone. Hidden-by-tier is counted in `stats.tierHid` and said on the honest line — it is
never a budget chip.

**R6 · The seed has first claim on the budget.** *(2026-09-09, from F10)*
A pane is *about* its subject, so the subject's own pieces are kept whole and only the neighbourhood
competes for what is left. A step held back by the budget (`held`) is marked differently from one the
map never drew (`missing`).

### Ruled — 2026-09-24 ([decisions.md](../design-context/decisions.md) D-043 … D-049)

**D1 · "3D mini planes" means panes** — small 3D viewports, one subject each; the layer banding stays
inside each pane (**D-044**).

**The station's paste box landed.** The **paste a view** section and `__uniPasteView` in
`gabe-universe.html` (additive over `__uniJrnStart` / `__uniPanelEnt` / `__uniHLSelect` / `__uniHLMode`)
are committed (`87bf927`).

**D2 · The runtime is copied into the shell; the station keeps its own copy** (**D-045**, option b). All
seven runtime files ship from `templates/center/shell/assets/`, generated by [`promote.py`](promote.py),
with a public `GabePane.destroy` and the pane CSS scoped under `.seat`. `gabe-universe.html` (now
6,619 lines) is not cut over; `tests/gabe-universe` 11c fails when the two drift. Cutting the station
over is its own later change — due if the drift assert fires twice in a month.

**D3 · The board is the first page, and it loads the whole feed** (**D-046**) — its two seats, the commit
picker and the spine strip, first (**D-043**). Feature, ledger and tests seats wait until the feed shape
is ruled again.

---

## Running it

```bash
xdg-open docs/design/embed-graph/index.html        # three live panes; ?size=panel|wide

cd docs/design/embed-graph && node probe.mjs       # 130 asserts, ~3 min, headless browser
cd docs/design/embed-graph && node paste-probe.mjs # 31 asserts — the ROUND TRIP into the real station, the four rules of OPEN
bash tests/gabe-universe/run.sh                    # the station's own battery, after any patch

python3 docs/design/embed-graph/promote.py         # after ANY edit to a runtime file here or to a station band
python3 docs/design/embed-graph/promote.py --check # 0 in sync · 1 DRIFT · 2 a band marker is gone
bash tests/embed-pane/run.sh                       # the shipped copies: static contract + destroy, headless
```

**Mutation-proven, 2026-09-08:**

| mutant | caught |
|---|---|
| the camera fit pulls back 3× (the bug that shipped twice) | 5 failures |
| the click readout names something generic | 2 failures |
| the seed loses first claim on the budget (F10) | 4 failures |
| `held` and `missing` wear one mark | 2 failures |
| home slides back to the left of the transport | 1 failure |
| the reach control returns to the foot | 2 failures |
| the highlight BFS floods to depth 2 | 2 failures |
| a wire lights if EITHER end is in the set | 1 failure |
| clearing the selection forgets to restore | 2 failures |
| open no longer clears first (rule 2) | 1 failure *(round trip)* |
| *(found live)* the focus flag dropped on the walk path | 1 failure *(round trip)* |

The probe measures geometry, not the DOM: node projections against the viewport, the field's span inside
it, a click on a *specific* node naming *that* node, a drag actually moving the camera, and a hand-read
**BASELINE** table so a resolver that stops reporting cannot move both sides of an assert together.

Nothing in this folder is installed. What ships is what `promote.py` generates into
`templates/center/shell/assets/`; the doctor reaches it through two batteries — `tests/gabe-universe`
(11c, the drift guard) and `tests/embed-pane` (the shipped copies: static contract + the destroy
contract in a real browser).

---

## Files

| | |
|---|---|
| `_slice.js` | **the resolver** — entity / commit / test → a slice, plus the cap law. Engine-agnostic; it survived the 2D→3D pivot untouched. |
| `_uni-grammar.js` | the station's identity builders, extracted by band, plus the environment they expect — GENERATED by `promote.py` |
| `promote.py` | writes the seven runtime files into `templates/center/shell/assets/` (and `_uni-grammar.js` here); `--check` is the drift guard |
| `_pane.js` | the mini-universe host: layer force, exact camera fit, selection ring + depth-1 highlight, the step cursor + camera fly, the rail and transport, and `GabePane.embed()` — the one call a center page makes |
| `_pane.css` | the frame. `.pn*` ships; `.lab*` does not |
| `_grammar.js` | the flat colour/kind rosters (used by the resolver and the retired 2D pages). A hand summary, shipped as a byte copy — **open: the brief's "wire colours" item.** Its `RELCOL` lacks `depends` · `gated_by` · `dispatches` · `reaches` · `fnprompts` · `binds` and says `serializes` #06b6d4 where the station says #0ca678; its `INFERRED` set is not the station's `LINKMETA` pv:0 set (the station makes `imports` and `fecall` pv:1); and `_pane.js` passes the raw edge kind, so the station's `FE_REL` is not applied. The fix derives them from the extracted `RELCOL` · `LINKMETA` · `FE_REL`, as its own change, decided by seeing. `promote.py --check` guards the copy, not the drift. |
| `index.html` | four panes, one page |
| `probe.mjs` | the render proof |
| `_pane-console.js` · `_pane-console.css` | the **console skin** — the SC2 regions at pane scale, opt-in |
| `console-probe.mjs` | the console skin's laws, measured |
| `paste-probe.mjs` | the ROUND TRIP — stages the patched station beside the real feeds and opens a pane payload in it |
| `_2d-attempt/` | **retired** — six 2D layouts and their 792-assert battery. The wrong instrument, kept because F1–F4 came out of it; see [its README](_2d-attempt/README.md) |