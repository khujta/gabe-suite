# The disk target — a prism as a command-center page

The binding spec for `--target disk`, which is the default. The artifact target
(`--target artifact`) is unchanged and documented by `gabe-artifact`.

## Why a second target exists

An Artifact is a published page: one URL, strict CSP, everything inline, and a
fixed 74rem column, centred. That is right for something leaving the repo
and wrong for a floor plan, which wants the screen and wants to sit beside the
work it explains. The disk target trades the URL for the viewport.

| | artifact target | **disk target (default)** |
|---|---|---|
| chrome | `gabe-artifact` house kit | the **center shell** — same sidebar, same cog, same skins |
| width | `max-width: 74rem` | **viewport minus the sidebar**, scaled not reflowed |
| assets | inline only, strict CSP | `assets/prism.css` + `assets/prism-fx.js`, shared |
| delivery | a published URL | `docs/site/center/prism-<slug>.html`, in git, in the nav |
| reuse | one page, one URL | **fragments** embeddable in any doc page |

Everything about the *material* is identical across both: the actor table, the
STOP condition, the four states, the five patterns, `verify-prism.mjs`. A target
changes the chrome, never the claims.

## The two width contracts, and why they disagree

```
the CANVAS   viewport − sidebar, free to exceed any measure
the PROSE    76ch, everywhere, including inside the canvas
```

Freedom applies to the diagram, not to the sentence. A 190-character line is
unreadable at any resolution, and a canvas that lets prose inherit its freedom
has simply removed the reading column without replacing it.
`check-prism-fit.mjs` measures this rather than trusting the stylesheet.

### The legibility arithmetic

```
authored smallest text inside .pf   13px
minimum scale prism-fx.js will use  0.92
effective floor                     12px   = gabe-artifact's floor, exactly
```

Below 0.92 the drawing stops shrinking and **its own box** scrolls sideways. The
page body never does. Text outside `.pf` (scrub bar, legend, inspectors) is never
scaled and keeps the center's 11–12px chrome sizes.

**Belt length follows from this, not from taste.** Eight machines plus seven hops
is ~2,150px, which clamps to the minimum scale at every desktop width and hands
the reader a drawing that always scrolls. Past ~5 machines, break the belt into
authored rows (`.pf-rows` > `.pf-row`, with a `.pf-hop.pf-return` at the break).
Never rely on flex-wrap: an implicit break drops a machine onto the next line
with no marker and the reader reads the gap as a fork.

## The two page kinds

Chosen by the shape of the question, exactly like the pattern chooser:

| mode | Use when the question is | Motion |
|---|---|---|
| **console** | *how does this move* — one screen, the whole system at once | ambient loop + scrub bar, autoplays, reader can stop and step |
| **article** | *what does each part do* — one machine at a time | the floor assembles as you scroll; may end on a console cover |

A neural network is the canonical case for needing both: "what each part does" is
an article, "how a correction at the output reaches a weight at the input" is a
console, and the article can end on the console of the thing it was building
toward (`.pf-cover`).

## Motion — three drivers, one pause

All in `assets/prism-fx.js`.

- **console** — `data-tick` ms per hop; `.pf-hop[i]` goes live at step *i*; a
  scrub bar (prev · play/pause · next · step *n*/*N* · payload name · reset) is
  injected per floor. Stepping by hand stops autoplay, because yanking the view
  forward one tick after the reader chose a step is a bug.
- **article** — `.pf-scene` plays **once** on entering view; `.pf-assembly` +
  `.pf-beat[data-reveal]` reveals one machine per beat, forwards **and
  backwards**, since a reader scrolling back to beat 3 is asking what the system
  looked like at beat 3.
- **cover** — a console floor inside `.pf-cover`; identical driver, but it waits
  until scrolled to, so it starts running when the reader arrives.

**Fragments autoplay and carry their own controls** (operator ruling): a
component behaves identically standalone and embedded, and a page conductor was
rejected because a fragment that only moves when its host cooperates is a
component with a hidden dependency.

The pause contract is `gabe-artifact`'s, verbatim: `prism-fx.js` injects
`#af-motion` with `.af-opt[data-id="off"]` into the center's cog panel and
defines `window.__setMotion`, which is exactly what `verify-motion.mjs` reaches
for. One contract, two targets, one gate. Spacebar toggles it too. Every floor
with `data-fx` registers `window.FXREPLAY[slug]`; `build_prisms.py` assigns the
slug when the author omits it, so no floor is unreachable by the gate.

`prefers-reduced-motion` — no autoplay, no assembly transition, scrubber still
works, and every floor renders its **finished** state rather than a start frame.

## Authoring

```
docs/prisms/<slug>/prism.json       the page's metadata — full schema below
docs/prisms/<slug>/body.html        the authored floor(s) + prose
docs/prisms/_fragments/<slug>.html  an embeddable component; optional header:
                                    <!--prism { "title": "…", "note": "…" } -->
                                    (absent/malformed header ⇒ builder falls
                                    back to the filename, never errors)
```

**prism.json — the full schema** (required unless marked opt):

| field | meaning |
|---|---|
| `title` | the page H1 |
| `nav_label` | sidebar text |
| `kicker` | the small line over the title (e.g. "seat page · end user") |
| `mode` | `console` · `article` · `index` — index = a section's landing page, own nav glyph |
| `pattern` (opt) | the grammar used (belt-line …); omit on index pages |
| `order` | nav sort within Explanations — estate convention: 10s per subject (catan 10, its children 11–13), next subject 20, one-offs 50+; builder default 999 |
| `section` (opt) | parent SLUG — nests this page under that page in the nav, listed right after it; absent/self/unknown parent renders flat, never hidden |
| `kind` (opt) | free-text classification shown on the index card |
| `card` · `lede` · `handle` · `source` | the index-card blurb · the opening paragraph · the hook line · the numbers' provenance line |

**Slug collision rule:** `build_prisms.py` regenerates every `<slug>/` pair —
writing into an existing slug REPLACES that page. Doing so requires the
operator's explicit word at the I2 checkpoint; new work takes a new slug.

The floor root is `<div class="pf" data-prism data-fx="…">`. **The builder wraps
it** in `.pfwrap > .pfsize > .pffit` — never type those. Two elements rather than
one because a transform does not change layout: with the scale on the only
wrapper, the box keeps its unscaled width and grows a scrollbar it does not need.
`.pfwrap`'s `overflow-x` also means a reader with JS off gets a box that scrolls
instead of a page that does.

Per node: `data-node` `data-in` `data-out` `data-num` `data-state`, plus
`data-detail="#panel-id"` when it opens an inspector. Gates carry `data-gate` and
a state, and **never** `data-in`/`data-out` — a gate decides, it does not
transform.

**Probe hooks — authored WITH any page-local `<script>`.** Everything the
script renders declares what the render probe must find:

| hook | asserts |
|---|---|
| `data-probe` | the element renders NON-EMPTY after load (children, text, or an SVG `d`) |
| `data-probe-expect="<regex>"` | the element's textContent matches at load |
| `data-probe-react` (container) | EACH input/select inside moves ≥1 `data-probe-out`, EVERY `data-probe-out` moves under some input, then restores (perturbation is stepUp-based — range inputs snap raw value writes to their step) |
| `data-probe-hover="<selector>"` | hovering the element's center changes the target (text or visibility) |

`tools/probe-render.mjs` executes them headless; an authored script with **no**
hooks fails the probe — an undeclared interactive page is how the
compound-interest one-shot shipped a simulator no gate had ever run.

**The one-model contract.** Components sharing variables read ONE master
control set; a consolidated sticky variable bar (chips → hover-morph
sliders, master-dispatch sync) is the visible surface — full recipe in
`dissection/interaction-hooks.md` §variable bar. A simulator lays out
**controls → stat tiles → one full-width chart** (the tile row precedes the
plot — the static library's own rule); floor wires carry arrowheads, the
return edge accent-weighted (`dissection/visual-grammar.md`).

**Section titles + the section rail.** Every section title is an ICONED `h2`
pill inside `.prismprose` — a small inline stroke svg, then a lowercase label;
the pill background is what lets the eye find section starts without reading.
Two or more h2 pills ⇒ `prism-fx.js` builds `.prism-toc`, a sticky in-page
section rail at the stage top, automatically (icons cloned from the pills;
scroll-spy highlight; reduced-motion jumps). The head stays four labeled
elements — title · lede · the tagged handle box · the seat row — and the
`kicker` is set to `""` when the body opens with a seat row: the seat carries
the addressing, and one more unlabeled format is exactly what a crowded head
does not need.

## The dimension grammar — one container silhouette per kind

Established on the Catan dissection (operator ruling, 2026-08-01): when several
KINDS of thing share a page, the **outer container** names the kind before any
label is read. Colour and motion are secondary; the silhouette is the identity.

| Kind | Class | Silhouette |
|---|---|---|
| action / machine | `.pf-node` | sharp numbered card with a recipe face |
| gate / rule | `.pf-gate` | flat tag in the gate register — never card weight |
| payload | `.pf-chip` | the small carrier riding a hop |
| seat / angle | `.gv-seat` | capsule pill — a person, so soft and small |
| sphere | `.gv-sphere` | wide soft-cornered region panel, round-badge head |
| body / part | `.gv-body` | small square tile living inside a sphere |
| relationship | `.gv-links` | stroke-only SVG **between** containers, never a box |

**The gravity map** is the relationship component:
`<div class="gv" data-gravity data-fx="…" data-tick="…">` holding a `.gv-seats`
rail of `.gv-seat[data-pull="id,id,…"]` capsules and `.gv-sphere` panels of
`.gv-body[data-body="id"]` tiles. `prism-fx.js` cycles one seat per tick,
lights the pulled tiles, dims the rest, and draws animated stroke curves from
the seat to its bodies; clicking a seat stops the cycle on it. A `.gv` is NOT a
floor — nothing transforms, so it carries no `data-prism` and the contract gate
ignores it — but it MOVES, so it registers in `window.FXREPLAY`, obeys the cog
pause, the spacebar and reduced motion (held state, no cycling), and is
therefore reachable by `verify-motion.mjs` like any floor.

## Fragments — the embed seam

`{{PRISM:<slug>}}` in any markdown doc page. `build_prisms.py` writes
`prism-fragments.json`; `build_docsite.py` reads it via `--prisms` and expands
the token — the same one-producer/one-consumer shape as `nav.json`, with no
import in either direction. Rejected: iframes (break theme, nav and height) and
web components (a build step and a runtime for static HTML).

**A fragment never gets a nav item.** A fragment with its own nav entry is a
page, and should be one. `prism_pages()` in `build_suite_center.py` scans only
`<slug>/prism.json` directories; the absence of fragment-scanning code is the
enforcement.

Expansion happens **after** reference extraction: a component's own links are its
chrome, not the hosting document's claims, and letting them into the reference
graph would make one fragment add edges to every page it appears on.

## Build order

**One command runs everything, builds and gates, in the suite repo:**

```
bash docs/center/generators/refresh_suite_center.sh regen
```

What it runs (know it, don't hand-run it unless iterating):
`docs/center/generators/build_suite_center.py` (emits nav.json) →
`skills/gabe-imagine/generator/build_prisms.py --shell docs/center/shell
--nav docs/site/center/nav.json` (pages + prism-fragments.json) →
`skills/gabe-docsite/generator/build_docsite.py` (needs both seam files) →
center second pass → gates: links → diagrams → prism contract → fit →
motion. Prisms run **before** the docs: a doc page can embed a fragment, so
the manifest must exist first. Fast iteration loop: the first two builds +
the three per-page gates only.

## Gates

| Gate | Checks | Battery |
|---|---|---|
| `tools/verify-prism.mjs` | payloads named and different · a number per stage · legal + legended states · gates are not stages · inspectors open something | `tests/prism/` |
| `tools/check-prism-fit.mjs` | page body never scrolls sideways · 12px floor holds after scaling · overflowing floors can scroll their box · prose stays inside 76ch · no page errors — at 1440/1280/1024 | `tests/prism-fit/` |
| `gabe-artifact/tools/verify-motion.mjs` | replay moves · cog pause freezes everything · reduced motion renders finished | `tests/artifact-motion/` |
| `tools/probe-render.mjs` | the authored script RAN: zero page/console errors (load + after interaction) · every `data-fx` slug registered in FXREPLAY · the declared `data-probe*` hooks hold (§Authoring) · an authored script with no hooks fails | `tests/prism-probe/` |

The motion gate takes ~20s per page, so the full chain runs over two minutes on a
site with several floors. That is the cost of proving motion rather than
asserting it; it is stated here so nobody "optimises" it by dropping the leg.

### A known limit, found by building

`verify-prism.mjs` checks that `data-num` is **present**, not that it holds a
traceable number. The gastify page passes it with `⌀ not measured here` in every
slot — correctly, since that page is honest — but a page with invented figures
would pass identically. Closing this needs a provenance field (`data-num-source`)
the gate can resolve. Recorded so it is not rediscovered a third time.

## Portability — the honest state

`prismpage.html`, `prism.css` and `prism-fx.js` live in **both**
`docs/center/shell/` (the suite's fork) and `templates/center/shell/` (what
`/gabe-cc-init` gives a downstream project), byte-identical, and
`build_prisms.py` takes `--shell`/`--nav` so it can render against either.
**But the standard downstream center is NOT yet wired for prisms**:
`build_center_a3.py` has no `prism_pages()` nav scan, `refresh_center.sh`
has no prism leg, and `{{PRISM:}}` fragment expansion is suite-only. A
downstream disk run today means: invoke
`~/.claude/skills/gabe-imagine/generator/build_prisms.py` by hand against
the project's shell + nav.json, accept NO nav entry and NO fragments, and
SAY SO to the operator — or take `--target artifact`, stated, never as a
silent downgrade (E3). Wiring the standard center is owed at twin
propagation.
