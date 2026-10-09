---
name: gabe-artifact
description: "House chrome for published pages — one centred column, a cog panel top-right (font, text size, spacing, skin, motion), the fixed font roster, three suite skins, iconed section title pills set in a condensed grotesque, a 12px legibility floor, and motion-first visuals with a gated pause contract. A page is plain by default, with no audio. Builds narrated explainers when asked for by name, as standalone HTML files: the spoken script IS the page, every idea landed on a recorded action clip, a still or a diagram the voice steps through part by part (cue words), one sticky bar — sections menu, the player, the cog — and a word-timed reading wave. Owns the build loop: design pass → kit → render gate → write or publish → report, plus two gated pattern libraries."
when_to_use: "ANY request that ends in a published Artifact or a standalone explainer page (report, dashboard, spec page, comparison, explorer, narrated explainer of finished work) — not only explicit invocations. Also when an existing page is being updated or retrofitted with house chrome."
metadata:
  version: 1.8.0
  status: suite skill (generic, project-agnostic)
  scope: any project that publishes Artifacts or keeps explainer pages
---

# gabe-artifact — the house style for published pages

**Usage:** `/gabe-artifact <what to publish>` · `/gabe-artifact retrofit <path-or-url>`

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

> **One line:** an Artifact is a *product surface*, not a scratch file. Every page this project publishes wears the same chrome — one centred column, one cog top-right, the same font roster behind it — so a reader who has seen one has learned all of them.

## The seven house rules

### H1 · One centred column, text set left inside it
The column sits in the middle of the window with equal air both sides — `.artifact-page { margin: 0 auto }` — and the **text inside it is set left**: no `text-align: center` on the hero, the section heads, the stat tiles or a caption. Operator ruling (2026-10-05, the drill-down recap): the left-anchored column left a wide screen's right half empty and read as a page that failed to load its layout. The gate measures it — `content column is centred, equal air both sides` (left and right gaps within 8px).

**A narrated page reads at a measure, not at the column's width.** The column is `--col: 64rem`; the header, the section heads and every spoken paragraph sit on a narrower centred measure, `--read: calc(var(--af-size) * 46)` (about 70 characters), because a 64rem line of prose is past what an eye tracks back from. A clip or a still breaks out to its own width (`--fw`, capped at `100vw − 48px`), centred; a widget figure takes `--af-size * 54`, or the full column when it carries `.wide`.

**A centring margin dies to a shorthand.** `h1 { margin: 8px 0 0 }` zeroes the `margin-inline: auto` the measure gave it, and the title snaps left while everything under it stays centred — write `margin-block` on anything that sits on the measure.

### H2 · One cog, top-right, and nothing else floats
A single cog button top-right opens the options panel. On a plain page it is fixed at `top: 14px; right: 14px` and is the *only* floating affordance — no floating TOCs, no back-to-top, no toasts parked in a corner; the read-aloud bar (H7) is *sticky in the flow* and clears it. **On a narrated page the cog rides inside the dock** (operator 2026-10-05: *"integrate the bar for what we are playing… with the configuration"*): the right end of the one sticky bar, so nothing on the page is fixed at all. The gate accepts either and checks the cog is still top-right after a long scroll. The panel is a real `radiogroup`, closes on Escape, closes on outside click, and returns focus to the cog.

**Scrollbars are chrome too, and they wear the skin.** A native bar is the one control the page does not own by default: a grey OS scrollbar with stepper arrows, sitting inside a dark panel, reads as a rendering fault rather than a control (founder, 2026-07-31: *"it's very disruptive in terms of being in line with all the elements around it"*). The kit styles both engines — Firefox's `scrollbar-width`/`scrollbar-color`, WebKit's pseudo-elements — mixes the thumb from `--accent` so it moves with the theme, and **removes the stepper arrows**: a scroll bar is a position indicator, not a pair of buttons anyone clicks. The gate checks the computed value AND re-checks it after a skin switch, because a hardcoded grey passes "is it styled" while still clashing with two skins out of three.

### H3 · The font roster is fixed and always present
Every artifact offers the same families, chosen from the founder's type-bench selections. They are declared once, in `assets/artifact-chrome.html`:

| Option | Stack | Base | Tracking | Note |
|---|---|---|---|---|
| **Mono** (default) | `ui-monospace, monospace` | 15px | −0.025em | The founder's pick resolved to the platform's default fixed face; `ui-monospace` leads so non-Windows machines get a modern mono instead of Courier. |
| **Segoe UI** | `"Segoe UI", sans-serif` | 16px | −0.015em | Windows-only face; elsewhere it falls to the platform sans. |
| **Georgia** | `Georgia, "Times New Roman", serif` | 16px | +0.005em | The serif the reference explainer offered; the operator ratified it into the third slot (2026-10-05: *"yes, let's add Georgia to the available fonts"*). Ships with Windows and macOS. |

**The roster is full at three.** A fourth family is the operator's call — ask, then add one line to `FONTS`. The page-level `extra_fonts` opt-in that carried Georgia before it was ratified is retired; the builder refuses it. Every page that pastes the kit carries the same three — the pattern libraries and the read-aloud demo included.

**Text size and spacing sit beside the family** (operator 2026-10-05: *"add a control for the font size… also the spacing"*). Size is four steps — 100 · 110 (default) · 120 · 135 % — multiplying the family's base, never shrinking it, so the 12px floor holds at every step. Spacing is three — Tight · Normal · Airy — setting line height (1.5 · 1.65 · 1.85), the air between paragraphs (`--af-para`) and, at Airy, a hair of tracking. Both persist (`gabe:artifact:size`, `gabe:artifact:spacing`); the gate checks every step moves the rendered type and survives a reload.

Family, base size and tracking move **together** — the settings were chosen as a set, so a family switch applies all three. Content must size in relative units (`em`, `%`) so the base size actually propagates; a hard-coded `font-size: 14px` opts that element out of the roster and is a defect.

**One title takes a face of its own — the section pill, and nothing else.** `.sec-head h2` pins `--af-title` (`"Bahnschrift", "DIN Alternate", "Roboto Condensed", "Arial Narrow", ui-sans-serif, system-ui, sans-serif`) and sets it in **caps**: a modern condensed grotesque of DIN lineage, so a title reads as console lettering rather than body copy, and a long one still fits its pill. The stack resolves locally in order (Bahnschrift ships with Windows 10+, DIN Alternate with macOS) — nothing routes through a blocked webfont. **Every other title — `h1`, panel `h3`, `h4` — stays in the content face.** A distinctive treatment spread across all headings distinguishes nothing; the gate enforces both halves.

### H4 · Motion outranks stillness
**Founder ruling (2026-07-31): "these animations will be higher in priority to use than the static ones."** Anything that is a flow, a trace, a pipeline, an architecture, a user journey, a state change or a sequence over time ships as a **moving** element — not a static picture of one. A still diagram is the fallback for material with no movement in it (a comparison matrix, a stat tile, a taxonomy), not the default.

Three obligations come with that, and they are not optional:

1. **Replayable.** Every animation carries its own Replay control; a one-shot that has finished before the reader arrives is a blank card. **On a narrated page the voice is the replay** (operator 2026-10-05: *"that might be"* — provisional, D14): no Replay button beside an animation. Play resets it to its first frame, its cue word runs it (H7), and dragging the section's seek bar back before that word plays it again. **Read without the voice, it rests on its finished frame** and never animates on load or on scroll into view (operator 2026-10-05: *"when we are not reproducing transcriptions, they should go to the final state, ending the animation, not at the beginning of the animation. When we play the transcription, it should reset to the original state"*). A widget timing itself beside the voice is the defect this replaces — *"following two different lines"*.
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

### H5 · Three skins, and one device in every one
The cog carries a **Theme** group. All three skins come from the suite's own files — chrome only: ground, ink, rules, accent, geometry. Each ships light and dark, and the viewer's `data-theme` stamp still wins in both directions.

| Skin | Source | Accent | Radius |
|---|---|---|---|
| **Catalog** (default) | `docs/site/center/assets/a3.css` | `#4f46e5` indigo | 10px |
| **Blueprint** | skin F, `output/mockups/center-skins.css` | `#1d4ed8` blue | 6px |
| **Mission Console** | skin B, same file | `#0e7c8c` teal | 4px |

One structural device applies in **every** skin (borrowed from skin J, kept without its palette). The second — a `5px` accent rail down every panel's left edge — is **retired** (operator 2026-10-05: *"having the left bar with purple in every one of these… is really AI slop"*); a mark on everything distinguishes nothing. A panel's left border now matches its frame, and the gate fails a rail.

1. **Section title pill** — every `.sec-head h2` sits on its own colour from `--sec1…--sec9` (set `data-sec` on the section), in the title face, in **caps**, at **normal reading size** with tracking held to `.045em`. Founder ruling 2026-07-31 reversed the earlier uppercase ban: what made that version read "massive" was the *size bump* travelling with the caps, so the size and tracking guards stay and only the caps ban goes. A wide slab made a later version read as a banner competing with its own content — hence the pill (`border-radius: 999px`) with padding tight to the characters. Prominence comes from the block, the icon and the face; never from type size.

Three rules that follow:
- **Section block tones live outside the series and status palettes** — page furniture must never be mistakable for data.
- **Nothing square.** Every skin's radius is ≥ 4px; sharp corners were rejected.
- **Never theme chart series or status colours.** Both suite brand palettes were run through the dataviz validator as categorical series and **failed** (Cifra green↔copper ΔE 2.7 protan; chroma floor). Brand identity themes the chrome; series identity and severity are validated systems.

### H6 · Titles are iconed, and nothing falls under the floor
Two rules the gate enforces, both born from reading a shipped page and failing to.

1. **Every section title is led by an icon.** Lucide geometry, inlined into the title's own `<svg>` (the CSP blocks icon CDNs; an icon font falls back to nothing without saying so). The kit carries a starter set — key-round, route, file-text, panel-left, swap, bar-chart, alert, gavel, layers, search — and any Lucide glyph is legal. **Resolve the icon to the section's subject**; a decorative glyph repeated down the page is worse than none, because it teaches the reader the icons carry no information.
2. **The legibility floor is 12px computed, inside `.artifact-page`.** Secondary content sizes off `--fs-sm` (.92em) / `--fs-xs` (.855em) / `--fs-min` (.82em) and never below. The failure this prevents is specific and was observed: a table whose first column read cleanly while its status column, three steps down the scale, had stopped being readable — the reader skips the column instead of reporting it. Stacked `em` is how it happens (`.855em` heads inside a `.92em` table land at 11.8px while both authored values look safe), so the steps are `calc()` off `--af-size` — absolute, non-compounding — and the gate measures **rendered pixels**: computed size × the SVG's viewBox scale, at the roster's **smallest** base. Measuring authored values, or measuring at the largest base, is how an unreadable column ships green.

### H7 · A page is plain unless voice is asked for
**Operator ruling (reverses D-076):** a page is plain by default: no player bar, no spoken summaries, no audio. A **narrated** page is built only when the operator says the word *narrated*; the browser read-aloud bar is added only when the operator asks for read-aloud. When either is asked for, everything below applies in full.

**Numbers: the page shows them, the voice says them.** The digit ban covers only what is spoken. In a script, a number is written as a pair, `[[n:10,407|about ten thousand]]`: the page shows the left side, the recording speaks the right, and the reading wave lights the shown number for the whole spoken span. A digit outside a pair is still refused by `narrate-tts.py`.

**Two engines, one per page.** *Browser* (below) speaks generated text through the viewer's speechSynthesis voice — for pages read in place, whose text comes from data. *Recorded* is the engine for a narrated **explainer** listened to start to finish: one script per section, recorded at build in an edge-tts neural voice, embedded as audio with word timings; one sticky dock (left: a sections menu, Play all and Next as icons named on hover · centre: the player — transport, what is playing over its seek bar, restart · stop · speed · right: the cog); and a reading wave that lights the word under the voice. Spec `references/narration.md` · assets `assets/narrated.css` + `.js` · tools `tools/narrate-tts.py` (lint + record), `tools/narrate-build.py` (build), `tools/clip-recorder.mjs` + `tools/clip-encode.py` (action clips) · gate `tools/verify-narration.mjs` (53 checks).

**A diagram steps with the voice** (script v3, operator 2026-10-05). A cue token `[[fig:k]]` before a word marks the moment the voice names part *k* of a figure; the figure's parts carry `data-k`, and as the voice passes each cue the named part reads *now*, earlier parts *past*, later ones dim. With no clip current the figure shows its final frame, whole; when its clip starts it resets to the first frame — every part waiting, a moving stage empty — and the cues step it from there (operator 2026-10-05). This is how a widget stays on the voice's line: *"the diagram that highlights the states one by one… might be a better way."* A figure encodes its information — an icon and a colour per kind, a bar per share, a status dot in the app's own colours — or it is text; a generic table or a row of identical cards is noise, not a figure.

**On a recorded page the script IS the section** (operator ruling 2026-10-05, script v2). No summary-plus-folded-transcript: every spoken paragraph shows, in order, and between them sit the figures that land each idea — `@vid` an action clip of the app doing the thing, `@img` a still, `@fig` a moving widget from `body.html`. A paragraph that names a control, a panel or a state the reader has never seen is followed by a picture of it; *"we are accumulating blocks of understanding without landing them on a visual example"* is the defect this replaces. A figure ties to the paragraph before it and **goes live while that paragraph is spoken** — outlined, its clip restarted, its widget replayed, the page following the voice unless the reader scrolled in the last five seconds. The lint warns on three paragraphs in a row with no figure, and the gate fails a section with none. The browser engine's spec: `references/read-aloud.md` · module: `assets/read-aloud.js` + `.css` (pasted as kit blocks 4 and 5 — an Artifact cannot load sibling files; standalone proof `assets/read-aloud-demo.html`) · gate: `tools/verify-read-aloud.mjs`.
1. **Summary.** 3–6 plain spoken sentences under each `.sec-head` — no ids, paths, code or symbols; every number generated from the page's data, never typed — with "copy to read aloud" on each and "copy every summary" on top. A section made of parts (each decision, each pattern) lists them as **items**, each with its own short summary, one `/gabe-lens plain` sentence, and, where it decides something, an `example` (one sentence, a concrete case from the page's own data) and an `impact` (one sentence: what each option changes), read after the summary.
2. **Bar.** `ReadAloud.mount({ sections: [{ id, title, say, items: [{ id, title, say, example, impact, plain }] }], voice })`: play/pause · stop · previous/next · speed · a chip per section — a **dropdown of its items** when it has any — the one being read lit. A skip, a chip or a menu item moves the reading **and** the page. It is sticky in the flow, never fixed (the cog stays the only floating thing), and clears the cog. Every icon in it has one hover, a verb and its object in six words at most; what a kind of icon means is said once, in a legend.
3. **Voice.** The saved `gabe:voice:v1` → the **ruled voice**, inlined at build from the `voice.ruled.json` the builder finds (the project's own, else the operator's in the suite checkout; where it lives and the operator's values are in the reference, §5) → a British Google voice → an English Natural or Google voice → the browser's own; the page says in words which one reads. Speed is relative to the voice's own rate.
4. **Floors.** No motion, nothing under 12px, reflows at 390px, storage in try/catch. Run `verify-read-aloud.mjs` beside the chrome gate; it fires on a page without the bar.

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
3. **Copy the kit, don't retype it.** `assets/artifact-chrome.html` carries three marked blocks — tokens+CSS, cog markup, roster script. Paste all three; author content inside `.artifact-page`. A page the operator asked to have read aloud also takes the two read-aloud blocks (H7). **A narrated explainer is built, not pasted:** write `narration.json`, `body.html` and `txt/<clip>.txt` in a work dir, record the action clips (`clip-recorder.mjs` from a Playwright capture script, `clip-encode.py` one at a time), record the voice with `narrate-tts.py`, build with `narrate-build.py` — it pastes the kit itself (`references/narration.md` §2–§5, clips §9).
4. **Write where it lives.** A **narrated explainer of the project** is a standalone file under `.kdbp/explainers/` — gitignored, one `<slug>.html` beside its `<slug>/` work dir (script, clips, stills, capture script), so the next one starts from the last. Anything else goes to the session scratchpad unless the user asked for a file in the project.
5. **Run the gate** (E2): `node <skill>/tools/verify-artifact-chrome.mjs <file>` — 44 checks on the kit and on the drill-down recap, covering cog placement (and its reach after a long scroll), panel behaviour, every roster option — family, text size, spacing — actually changing computed type, every skin painting a distinct ground, no accent rail, section blocks, title size, corner radius, reload persistence, a centred column, no sideways scroll, every section title iconed, pilled, capped and in the title face while every other title stays in the content face, and no content text under the 12px floor. A page with the read-aloud bar also runs `tools/verify-read-aloud.mjs <file>` (44 checks, H7) — or, on a recorded page, `tools/verify-narration.mjs <file>` (53 checks, ~60 s with real audio; the read-aloud gate SKIPs it by name). Run the gates one at a time. Changing a gate or the engine? Run its battery too — `tests/artifact-chrome/run.sh` (24 cases) and `tests/narration/run.sh` (9 fast checks + 11 gate runs, ~4 min). Pages predating the skin system report loud `SKIP` lines rather than passing silently. Deliver only on green; paste the count. If the page animates, also run `tools/verify-motion.mjs <file>` (see H4) — motion is never signed off by eye, and a `SKIP` on a page that should move is a failure, not a pass.
6. **Publish — only an Artifact.** A standalone explainer is not published; the file is the deliverable. When the user does want an Artifact, build with `--fragment` and publish with the Artifact tool: `file_path`, a one-sentence `description`, an `icon` on the first publish (one generic word — `chart`, `audio`, `map` — never a brand or emoji; omitted on a redeploy so it stays; `favicon` is deprecated), and a `<title>` in the file — a name of two to four words. Same file path → same URL.
7. **Report (E7 + founder preference).** End with where the page is — the standalone file's absolute path, or the published URL — **and** the absolute source path (the work dir). Both, every time — the founder reviews pages by opening the file as often as the page.

**A page a person will read** also follows `references/legibility.md` — one hover per item, the item's own facts first, a kind's meaning once in a legend, the code last — and runs `node <skill>/tools/legibility-audit.mjs <page>`: report-only counts, each a lead for a look, never a gate.

## Two outputs, one kit

| Output | Built by | Wrapper | Theme | Cap | Use for |
|---|---|---|---|---|---|
| **Standalone file** (default for a narrated explainer) | `narrate-build.py <wd> -o .kdbp/explainers/<slug>.html` | the builder writes `<!doctype html>`, `<html lang>`, `<head>` with charset, viewport, `color-scheme: light dark` and `<title>` | the OS setting, through `prefers-color-scheme` — there is no host toggle | none; WARN past 40 MB (mail and chat choke) | pages kept with the project and opened from disk |
| **Artifact** | `narrate-build.py <wd> --fragment`, or a page pasted from the kit | none — the host wraps it | the host's toggle stamps `data-theme` | the builder dies past 15 MB (the host caps at 16) | pages someone opens by link |

The page is the same in both — same kit, same gates, same `data:` media. Operator ruling (2026-10-05): *"No need to have this as a Claude artifact… that way we can get rid of the header for Claude."*

## Platform constraints (do not relearn these the hard way)

- **Strict CSP (Artifact).** Scripts load only from cdnjs, jsdelivr, unpkg, the Tailwind play CDN and code.jquery; stylesheets only from Google Fonts. No remote images, media, `fetch` or WebSockets — inline everything else and embed images, clips and audio as `data:` URIs. A standalone file keeps the same rule on purpose: it travels alone, so nothing it shows may live beside it. The roster stays on locally-resolvable stacks by choice: a page never waits on a font host. (Corrected 2026-10-04: this line used to forbid CDN scripts and webfonts outright.)
- **No `<!doctype>`/`<html>`/`<head>`/`<body>`** in an Artifact — the host wraps it. Keep `<title>`. The standalone builder writes them itself.
- **Theme is the viewer's.** `prefers-color-scheme` carries the OS setting and, on an Artifact, the host's toggle stamps `data-theme` on the root; the kit defines both, and `:root[data-theme]` must win in both directions. **Never add your own light/dark control to the cog panel** — on an Artifact it fights the host chrome, and on a standalone page the OS already answers it.
- **Storage can throw.** The published page runs in a sandboxed frame; every `localStorage` call is wrapped. The roster key `gabe:artifact:font` is shared across this user's artifacts on purpose — pick a family once, and every page opens that way. An id that is not in the current roster falls back to the default.
- **Mermaid renders natively** (```mermaid fences, or `<pre class="mermaid">`) — never vendor a diagram library.

## Extending

- **Another family** → one entry in the `FONTS` array in block 3. The panel, the radio wiring, and the gate pick it up with no other edit.
- **Another option** (density, numerals, reduced motion…) → add a second `.af-group` block inside the panel, same `radiogroup` pattern. Keep the panel to one screen without scrolling; if it needs a scrollbar the artifact wants a settings *page*, not a popover.
- **Retrofit** an existing artifact → paste the three blocks, wrap the content in `.artifact-page` (the kit centres it), strip any `text-align: center` and any page-level margin that pins the column to one side, run the gate, republish to the same URL.

## Anti-patterns

- A column pinned to one edge, or centred hero text and centred stat tiles inside a centred column — H1 centres the column, never the text.
- A `margin:` shorthand on anything that sits on the reading measure — it zeroes the inline `auto` and that one element snaps left (H1).
- On a narrated page: a paragraph that introduces a control, a panel or a state and lands on no figure; a summary with the rest folded away (script v1); a figure that never goes live because no paragraph precedes it.
- A clip cropped so tight the click target falls outside it — crop around the element pressed **and** what it opened, with 10px of air.
- A clip that hovers an element whose children carry `title` attributes of their own — the drawn tooltip paints the child's text, not the one the paragraph is about. Hover the element that owns the title you mean.
- A clip longer than ~15 s because the app is slow at one step (a slider re-render) — encode it with `--speed`; the lead and the closing hold keep their length.
- A settings icon that opens nothing, or options that do not persist.
- Leaving the scrollbar to the OS, or styling it with a fixed colour that ignores the skin (H2).
- Hard-coded `font-family` on content elements; only the chrome's own labels may pin a face (`ui-monospace` for spec readouts is the one sanctioned exception).
- Publishing before the gate runs, or reporting a URL without its source path.
- Adding a fourth roster family, or a font on one page only, without the operator's ruling (H3).
- A section title with no icon, a square title block, lowercase, or set in the body face — all violate H6.
- Spreading `--af-title` onto `h1`/`h3`/`h4`. The pill is the one distinctive title; everything else reads in the content face.
- Stacking `em` steps until a column computes under 12px. Size secondary text off `--fs-sm`/`--fs-xs`/`--fs-min`, and let the gate measure it.
- A read-aloud bar or a narration nobody asked for; once asked for, a bar that shows only while a voice plays, or a summary with an id, a path or a typed number in it (H7).
- Cross-fading a regular and a bold copy of a word for the reading wave — in a proportional face they read as two words. One copy, a stroke (`references/narration.md` §8).
- A digit outside a `[[n:shown|spoken]]` pair, an id, a path or a symbol in a narration script — the voice reads it as noise; `narrate-tts.py` refuses to record it. A page paragraph that spells a number the reader needs to see ("ten thousand four hundred and seven") — show the digits through the pair.
- A narrated page without the `[hidden] { display: none !important }` rule — the moment the menu, a row or a panel gets a `display` rule, `hidden` loses and it renders open (the v1 dropdowns did). The host adds the rule; a standalone file does not.
- A fixed dock, or a second floating cog beside it — the dock is sticky in the flow and the cog rides in it (H2).
- A widget animating on its own clock beside the voice — the reader follows two lines and has to stop the narration to watch. Step it on cue words (H7, script v3).
- A generic table, or a grid of identical cards, where the data has kinds, shares or states — encode them (icon + colour per kind, a bar per share, a status dot); otherwise it is noise, not information (operator 2026-10-05).
- An accent rail down every panel (H5, retired) — a mark on everything distinguishes nothing.
- An `inline-flex` label on the reading measure — `margin-inline: auto` does not centre an inline box; make it `flex` (the eyebrow sat off the column).
- A range input carrying a `flex` basis inside a column flexbox — the basis becomes its HEIGHT (the dock's seek bar rendered as a 140px oval). Reset it where it sits.
- A blanket size rule on every dock icon — it squares the labelled one too, and "3 / 7" spills under its neighbour. The narration gate checks no dock button spills out of its box at 390px.
- An animation stage left dim until an observer fires, or one that animates by itself on load or on scroll into view — it rests on its finished frame; on a narrated page play resets it and the voice runs it (H4).
- A jump that cannot park the last section under the dock because the page ends too soon — the counter and Play then name the section above it. The engine's `--tail` grows the page end; never remove it.
