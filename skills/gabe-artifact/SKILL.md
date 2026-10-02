---
name: gabe-artifact
description: "House chrome for published Artifacts — left-anchored content, a cog panel top-right, the fixed font roster, three suite skins, iconed section title pills set in a condensed grotesque, a 12px legibility floor, and motion-first visuals with a gated pause contract. Owns the build loop: design pass → kit → render gate → publish → report, plus two gated pattern libraries."
when_to_use: "ANY request that ends in a published Artifact (report, dashboard, spec page, comparison, explorer) — not only explicit invocations. Also when an existing artifact is being updated or retrofitted with house chrome."
metadata:
  version: 1.4.0
  status: suite skill (generic, project-agnostic)
  scope: any project that publishes Artifacts
---

# gabe-artifact — the house style for published pages

**Usage:** `/gabe-artifact <what to publish>` · `/gabe-artifact retrofit <path-or-url>`

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

> **One line:** an Artifact is a *product surface*, not a scratch file. Every page this project publishes wears the same chrome — content flush left, one cog top-right, the same font roster behind it — so a reader who has seen one has learned all of them.

## The six house rules

### H1 · Content is anchored LEFT
The column sits against the left edge with a gutter, never `margin: 0 auto`, and **nothing is centre-aligned** — not the hero, not section heads, not stat tiles. On a wide screen the right side stays empty; that is the look, not a bug. The kit ships this as `.artifact-page { margin: 0 auto 0 clamp(16px, 4vw, 56px) }`.

### H2 · One cog, top-right, and nothing else floats
A single fixed cog button at `top: 14px; right: 14px` opens the options panel. It is the *only* floating affordance on the page — no floating TOCs, no back-to-top, no toasts parked in a corner. The panel is a real `radiogroup`, closes on Escape, closes on outside click, and returns focus to the cog.

**Scrollbars are chrome too, and they wear the skin.** A native bar is the one control the page does not own by default: a grey OS scrollbar with stepper arrows, sitting inside a dark panel, reads as a rendering fault rather than a control (founder, 2026-07-31: *"it's very disruptive in terms of being in line with all the elements around it"*). The kit styles both engines — Firefox's `scrollbar-width`/`scrollbar-color`, WebKit's pseudo-elements — mixes the thumb from `--accent` so it moves with the theme, and **removes the stepper arrows**: a scroll bar is a position indicator, not a pair of buttons anyone clicks. The gate checks the computed value AND re-checks it after a skin switch, because a hardcoded grey passes "is it styled" while still clashing with two skins out of three.

### H3 · The font roster is fixed and always present
Every artifact offers the same families, chosen from the founder's type-bench selections. They are declared once, in `assets/artifact-chrome.html`:

| Option | Stack | Base | Tracking | Note |
|---|---|---|---|---|
| **Mono** (default) | `ui-monospace, monospace` | 15px | −0.025em | The founder's pick resolved to the platform's default fixed face; `ui-monospace` leads so non-Windows machines get a modern mono instead of Courier. |
| **Segoe UI** | `"Segoe UI", sans-serif` | 16px | −0.015em | Windows-only face; elsewhere it falls to the platform sans. |
| _(third slot — unset)_ | — | — | — | The founder's shortlist contained two distinct settings, not three: two of the three pasted blocks were byte-identical. **Do not invent the third** — ask, then add one line to the roster. |

Family, base size and tracking move **together** — the settings were chosen as a set, so a family switch applies all three. Content must size in relative units (`em`, `%`) so the base size actually propagates; a hard-coded `font-size: 14px` opts that element out of the roster and is a defect.

**One title takes a face of its own — the section pill, and nothing else.** `.sec-head h2` pins `--af-title` (`"Bahnschrift", "DIN Alternate", "Roboto Condensed", "Arial Narrow", ui-sans-serif, system-ui, sans-serif`) and sets it in **caps**: a modern condensed grotesque of DIN lineage, so a title reads as console lettering rather than body copy, and a long one still fits its pill. The stack resolves locally in order (Bahnschrift ships with Windows 10+, DIN Alternate with macOS) — nothing routes through a blocked webfont. **Every other title — `h1`, panel `h3`, `h4` — stays in the content face.** A distinctive treatment spread across all headings distinguishes nothing; the gate enforces both halves.

### H4 · Motion outranks stillness
**Founder ruling (2026-07-31): "these animations will be higher in priority to use than the static ones."** Anything that is a flow, a trace, a pipeline, an architecture, a user journey, a state change or a sequence over time ships as a **moving** element — not a static picture of one. A still diagram is the fallback for material with no movement in it (a comparison matrix, a stat tile, a taxonomy), not the default.

Three obligations come with that, and they are not optional:

1. **Replayable.** Every animation carries its own Replay control; a one-shot that has finished before the reader arrives is a blank card.
2. **Pausable.** A global `Motion: Playing / Paused` group in the cog panel, wired to both CSS (`:root[data-motion="off"]` → `animation-play-state: paused`) and SMIL (`svg.pauseAnimations()`).
3. **Reduced-motion safe.** Under `prefers-reduced-motion` every element renders its **finished state** — bars at full width, traces fully written, nothing moving. Never a start state, never an empty frame.

**The pause contract.** CSS animation freezes on `:root[data-motion="off"]` and SMIL on `svg.pauseAnimations()` — a JS-driven animation (`setInterval`/`rAF`) hears neither. So every JS animation registers a rebuild:

```js
window.FXREPLAY = window.FXREPLAY || {};
window.FXREPLAY["<slug>"] = build;          // build() restarts from zero AND reads MOTION.on
```

and the cog calls `window.__rebuildMotion()` — **before** it freezes SVGs, because a rebuild replaces the element and a `pauseAnimations()` aimed at the old one does nothing for the new. Mark each animation's stage `data-fx="<slug>"` so the gate can fingerprint it in isolation. Three defects this contract exists to prevent, all found in shipped files on 2026-07-31: the kit's cog never reached JS animation at all; eight library patterns ran straight through "Paused"; and the ghost-cursor pattern kept mutating the page from a trailing 700 ms timer after the pause.

**Verify motion by sampling, never by eye** (the founder's animation rule):

```
node <skill>/tools/verify-motion.mjs <file.html>       # any artifact, not just the library
```

It discovers animations by `.ex[data-anim]` card first, then `window.FXREPLAY`, fingerprints each stage's computed transforms, dash-offsets, opacity, colours and geometry, replays, and requires a difference. A page with neither reports a loud `SKIP` — *nothing to verify is not the same as verified*. Four traps it cost us to learn, all now encoded: a fingerprint blind to `background-color`/`border-color` calls a colour-only animation frozen; a window shorter than the animation's cadence calls a slow loop dead; **a single before/after pair aliases** — sample at uneven gaps, because 2400 ms across a 600 ms loop lands on the identical frame; and a settle delay under ~800 ms catches the pause's own CSS transition mid-flight and reports a page that froze correctly as still moving. Its fixture battery is `tests/artifact-motion/run.sh` (6 cases, each proven to FIRE and stay SILENT).

### H5 · Three skins, and two devices in every one
The cog carries a **Theme** group. All three skins come from the suite's own files — chrome only: ground, ink, rules, accent, geometry. Each ships light and dark, and the viewer's `data-theme` stamp still wins in both directions.

| Skin | Source | Accent | Radius |
|---|---|---|---|
| **Catalog** (default) | `docs/site/center/assets/a3.css` | `#4f46e5` indigo | 10px |
| **Blueprint** | skin F, `output/mockups/center-skins.css` | `#1d4ed8` blue | 6px |
| **Mission Console** | skin B, same file | `#0e7c8c` teal | 4px |

Two structural devices apply in **every** skin (borrowed from skin J, kept without its palette):

1. **Panel left rail** — `5px` in the skin's accent, so a page reads as one skin with many sections. It needs the `:root .panel` prefix in the kit: at equal specificity the base `border:` shorthand wins and the rail silently renders at 1px.
2. **Section title pill** — every `.sec-head h2` sits on its own colour from `--sec1…--sec9` (set `data-sec` on the section), in the title face, in **caps**, at **normal reading size** with tracking held to `.045em`. Founder ruling 2026-07-31 reversed the earlier uppercase ban: what made that version read "massive" was the *size bump* travelling with the caps, so the size and tracking guards stay and only the caps ban goes. A wide slab made a later version read as a banner competing with its own content — hence the pill (`border-radius: 999px`) with padding tight to the characters. Prominence comes from the block, the icon and the face; never from type size.

Three rules that follow:
- **Section block tones live outside the series and status palettes** — page furniture must never be mistakable for data.
- **Nothing square.** Every skin's radius is ≥ 4px; sharp corners were rejected.
- **Never theme chart series or status colours.** Both suite brand palettes were run through the dataviz validator as categorical series and **failed** (Cifra green↔copper ΔE 2.7 protan; chroma floor). Brand identity themes the chrome; series identity and severity are validated systems.

### H6 · Titles are iconed, and nothing falls under the floor
Two rules the gate enforces, both born from reading a shipped page and failing to.

1. **Every section title is led by an icon.** Lucide geometry, inlined into the title's own `<svg>` (the CSP blocks icon CDNs; an icon font falls back to nothing without saying so). The kit carries a starter set — key-round, route, file-text, panel-left, swap, bar-chart, alert, gavel, layers, search — and any Lucide glyph is legal. **Resolve the icon to the section's subject**; a decorative glyph repeated down the page is worse than none, because it teaches the reader the icons carry no information.
2. **The legibility floor is 12px computed, inside `.artifact-page`.** Secondary content sizes off `--fs-sm` (.92em) / `--fs-xs` (.855em) / `--fs-min` (.82em) and never below. The failure this prevents is specific and was observed: a table whose first column read cleanly while its status column, three steps down the scale, had stopped being readable — the reader skips the column instead of reporting it. Stacked `em` is how it happens (`.855em` heads inside a `.92em` table land at 11.8px while both authored values look safe), so the steps are `calc()` off `--af-size` — absolute, non-compounding — and the gate measures **rendered pixels**: computed size × the SVG's viewBox scale, at the roster's **smallest** base. Measuring authored values, or measuring at the largest base, is how an unreadable column ships green.

## The pattern libraries

Two built, gated and kept as assets — **read them before inventing a form.** Both are self-contained: open in a browser, or lift a single card.

| Library | Holds | Use when |
|---|---|---|
| `assets/motion-patterns.html` | 25 moving elements — flow diagram, marching ants, command-trace replay, span waterfall, pipeline, architecture-with-traffic, loop grid floor (directed 2×2 cycle, arrowheaded wires, accent return), event fan-out, queue, pulse, screen walkthrough, ghost cursor, funnel, scroll steps, bar race, chart entrance, chart morph, divergence fates (N policies, one scale, gaps as argument), decision fork (staged trunk, branch thickness = outcome), timeline conveyor (the belt is a ruled timeline under a fixed NOW cursor), growing composition map (absolute scale — the canvas is the final frame), scrubber, skeleton, log ticker, state machine | **First stop.** Per H4. |
| `assets/static-patterns.html` | 31 still elements — stat tiles, bar/line/area/histogram/scatter/radar/donut, sparkline, heat calendar, dumbbell, timeline, tree, matrix, stepper, Mermaid, tabs, accordion, chips, sortable table, callouts, empty state | The material genuinely doesn't move. |

Charts in both follow the `dataviz` skill's validated palette — load that skill before writing chart code, and **run its validator**; never eyeball a palette.

## The build loop

1. **Design pass — always.** Load the `artifact-design` skill before writing markup. It sets treatment (utilitarian vs editorial); this skill only fixes the chrome, never the palette or the concept. A report and a landing page both wear the cog; they should not look alike otherwise.
2. **E4 line.** Publishing an update to an existing page? `REUSE <path>` — republish the same file path (same URL) or pass `url:` from a different conversation. Minting a second URL for the same subject is a defect.
3. **Copy the kit, don't retype it.** `assets/artifact-chrome.html` carries three marked blocks — tokens+CSS, cog markup, roster script. Paste all three; author content inside `.artifact-page`.
4. **Write to the session scratchpad**, not the repo, unless the user asked for a file in the project.
5. **Run the gate** (E2): `node <skill>/tools/verify-artifact-chrome.mjs <file>` — 36 checks covering cog placement, panel behaviour, every roster option actually changing computed type, every skin painting a distinct ground, rails, section blocks, title size, corner radius, reload persistence, left anchoring, no sideways scroll, every section title iconed, pilled, capped and in the title face while every other title stays in the content face, and no content text under the 12px floor. Pages predating the skin system report loud `SKIP` lines rather than passing silently. Publish only on green; paste the count. If the page animates, also run `tools/verify-motion.mjs <file>` (see H4) — motion is never signed off by eye, and a `SKIP` on a page that should move is a failure, not a pass.
6. **Publish** with the Artifact tool: `file_path`, a one-sentence `description`, a `favicon` (1–2 emoji, **stable across redeploys**), and a `<title>` in the file. Same file path → same URL.
7. **Report (E7 + founder preference).** End with the published URL **and** the absolute source path. Both, every time — the founder reviews artifacts by opening the file as often as the page.

**A page a person will read** also follows `references/legibility.md` — one hover per item, the item's own facts first, a kind's meaning once in a legend, the code last — and runs `node <skill>/tools/legibility-audit.mjs <page>`: report-only counts, each a lead for a look, never a gate.

## Platform constraints (do not relearn these the hard way)

- **Strict CSP.** No CDN scripts, external stylesheets, webfonts, remote images, `fetch`, or WebSockets. Inline everything; embed images as `data:` URIs. A webfont must be a `@font-face` data URI or it silently falls back — which is why the roster is built from locally-resolvable stacks.
- **No `<!doctype>`/`<html>`/`<head>`/`<body>`** in the file — the host wraps it. Keep `<title>`.
- **Theme is the viewer's.** `prefers-color-scheme` carries the OS setting and the viewer's toggle stamps `data-theme` on the root; the kit defines both, and `:root[data-theme]` must win in both directions. **Never add your own light/dark control to the cog panel** — it would fight the host chrome.
- **Storage can throw.** The published page runs in a sandboxed frame; every `localStorage` call is wrapped. The roster key `gabe:artifact:font` is shared across this user's artifacts on purpose — pick a family once, and every page opens that way. An id that is not in the current roster falls back to the default.
- **Mermaid renders natively** (```mermaid fences, or `<pre class="mermaid">`) — never vendor a diagram library.

## Extending

- **Another family** → one entry in the `FONTS` array in block 3. The panel, the radio wiring, and the gate pick it up with no other edit.
- **Another option** (density, numerals, reduced motion…) → add a second `.af-group` block inside the panel, same `radiogroup` pattern. Keep the panel to one screen without scrolling; if it needs a scrollbar the artifact wants a settings *page*, not a popover.
- **Retrofit** an existing artifact → paste the three blocks, wrap the content in `.artifact-page`, strip any `text-align: center` and `margin: 0 auto`, run the gate, republish to the same URL.

## Anti-patterns

- Centred hero text, centred stat tiles, `margin: 0 auto` on the column — all violate H1.
- A settings icon that opens nothing, or options that do not persist.
- Leaving the scrollbar to the OS, or styling it with a fixed colour that ignores the skin (H2).
- Hard-coded `font-family` on content elements; only the chrome's own labels may pin a face (`ui-monospace` for spec readouts is the one sanctioned exception).
- Publishing before the gate runs, or reporting a URL without its source path.
- Inventing a third roster family because the table has an empty row.
- A section title with no icon, a square title block, lowercase, or set in the body face — all violate H6.
- Spreading `--af-title` onto `h1`/`h3`/`h4`. The pill is the one distinctive title; everything else reads in the content face.
- Stacking `em` steps until a column computes under 12px. Size secondary text off `--fs-sm`/`--fs-xs`/`--fs-min`, and let the gate measure it.
