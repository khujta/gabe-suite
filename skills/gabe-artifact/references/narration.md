# narration — the binding spec for H7, engine "recorded" (script v4)

> Binding for a **narrated explainer**, built only when the operator says the word *narrated* (a page is plain by default — `SKILL.md` H7): a page the operator listens to, section by section, in a recorded neural voice. `SKILL.md` (H7) points here;
> `tools/narrate-tts.py` records it, `tools/narrate-build.py` builds it, `tools/clip-recorder.mjs` + `tools/clip-encode.py` make its action clips,
> `tools/verify-narration.mjs` proves it on the rendered page.
> The operator's words behind it (2026-10-04): *"We did this kind of artifact using the GabeArtifact skill. I wanted to update it to generate artifacts
> more similar to this one"* — the reference was a narrated plan page with a dock menu, per-section dropdowns, a player and a word-timed wave.
> And behind v2 (2026-10-05): *"The transcript should be the actual explanation for any given section… we are defining many things in the transcript,
> but we are not chaining them with examples — ideally a GIF of the action happening or an image of the concept."*
> First v1 page: the Tier 3 explainer (gastify, 8 clips, 7:28, 3.93 MB) — chrome 39/39 · narration 41/41 · motion 9/9.
> And behind v3 (2026-10-05): *"The 'before a run,' 'after a run,' and 'after an edit' were kind of following two different lines… The diagram that
> highlights the states one by one… might be a better way"* — and *"integrate the bar for what we are playing… leave the center space to put the bar
> with the reproduction."*
> First v2 page: a project drill-down recap (7 sections, 6:17, 10 action clips, 24 figures, 7.92 MB standalone) — chrome 36/36 · narration 42/42 · motion 6/6.
> The same page rebuilt as v3 (6:25, 32 cues over 7 figures, 8.03 MB) — chrome 41/41 · narration 49/49 · motion 4/4; with Georgia and the
> rest/replay rule (D5, D15) — chrome 44/44 · narration 52/52 · motion 4/4.
> And behind v4: *"Numbers: the page shows them, the voice says them"* — a number is a pair `[[n:shown|spoken]]` (D16).

## 1 · When it applies — and which engine

| Engine | Voice | Text | Use for |
|---|---|---|---|
| **browser** (`references/read-aloud.md`) | the viewer's speechSynthesis voice | generated from the page's data at view time | pages read in place when the operator asks for read-aloud — reports, dashboards, decision pages whose text changes |
| **recorded** (this file) | edge-tts neural voice, recorded at build | fixed scripts, one per section | explainers the operator asked to have narrated, listened to start to finish — a plan recap, a design walk-through |

A page carries one engine, never both. The recorded page marks itself `nav#dock[data-narration="recorded"]`; `verify-read-aloud.mjs` SKIPs it by
that mark and names this gate instead. **Nothing is narrated by default: a page is plain unless the operator says the word *narrated*** (`SKILL.md` H7). When one is asked for, the engine is recorded,
written as a standalone file (`SKILL.md`, "Two outputs, one kit"); the browser engine is added only when the operator asks for read-aloud.
Everything H1–H6 says still binds.

## 2 · The work dir

A project explainer lives in the project, gitignored: `.kdbp/explainers/<slug>.html` beside its work dir `.kdbp/explainers/<slug>/`, so the next
explainer starts from the last one's capture script and furniture.

**The worked example** is `examples/narrated-mini/` in this skill — three sections, one cued figure each, mp3 committed. Build it to see every
part of this reference at once, and to have a page the gates must pass: `narrate-build.py <skill>/examples/narrated-mini -o /tmp/mini.html`.
Copy it as the starting work dir of a new explainer when no earlier one exists.

```
.kdbp/explainers/<slug>/
  narration.json    the config (below)
  body.html         the header, one section skeleton each, and the figure blocks — placeholders, no audio, no dock
  txt/<clip>.txt    one script per section: the section's content, paragraphs and figure markers (§3)
  mp3/              written by narrate-tts.py: <clip>.mp3 · <clip>.words.json · <clip>.src.sha256
  clips/            action clips, H.264 MP4, written by clip-encode.py (§9)
  shots/            stills, JPEG
  capture/          the Playwright script that records the clips and stills against the dev server (§9)
  page.css          optional — the page's own furniture
  page.js           optional — the page's own animations (§10)
```

```json
{
  "title": "Tier 3 Operability",            // the <title>: a name, two to four words
  "slug": "tier3-operability",              // output file name
  "description": "…",                       // optional — the standalone <meta name="description">
  "lang": "en",                             // optional — the standalone <html lang>
  "voice": "en-US-AndrewNeural",            // any edge-tts voice
  "rate": "+4%",
  "icons": { "name": "<svg inner markup>" }, // optional, beyond the builder's ~47 Lucide icons
  "sections": [
    { "id": "plan", "clip": "00-plan", "menu": "Plan", "title": "The plan in one minute", "icon": "map" }
  ]
}
```

`id` is the section element's id · `clip` names the script and the audio · `title` is what the sections menu and the player show · `icon` leads
the menu row and the player's title, on the section's own tone. `menu` (a one-word label) is read by nothing since the one-bar dock (§6, D11);
an old config may keep it.

## 3 · The script (v2, cues v3, numbers v4) — the section IS its script

One line per spoken paragraph. Between paragraphs, the figures that land the idea just spoken:

```
Open a tick, and the panel now lists the distinct paths its requests took, each with its fate, its time and its exact share.
@vid clips/stories-open.mp4 | <b>Open tick 50, scroll its paths.</b> 14 distinct paths; the rare timeout row survives at 1 in 667.
A path names its blocks by vendor, and numbers repeated ones, so three app servers read as number one, two and three.
@img shots/p4-panel.jpg | <b>The top of the panel.</b> The three app servers #1, #2 and #3.
The shares are exact, not sampled. They add up to the whole tick.
@fig paths
```

| Marker | Places | Caption |
|---|---|---|
| `@vid <path> \| caption` | an action clip (§9): muted, looping, played while in view, enlarged on click | after the `\|` — markup allowed; digits allowed (it is never spoken) |
| `@img <path> \| caption` | a still, enlarged on click | same |
| `@fig <id>` | the block in `body.html` between `<!-- fig:<id> -->` and `<!-- /fig -->` — a widget, a table, a chart | inside the block, as its own `<figcaption>` |

**A figure lands the paragraph before it.** The builder ties it to that paragraph (`data-p`) and the page makes it **live** while the voice is in that
paragraph (§7). So the order is always: say the idea, then show it. A figure before the first paragraph has nothing to land.

**What earns a figure:** a paragraph that names a control, a panel, a state or a number the reader has not yet seen. An action — a click, a drag,
a panel opening, a value changing — is a clip; a state is a still; a relation, a sequence or a formula is a widget. A paragraph of pure connective
tissue ("two items stay open") may stand alone; three in a row is a section that has stopped showing.

Lint in `narrate-tts.py`. Errors — nothing is synthesized while one stands:
- **a digit in the spoken text** — write the number as a pair, `[[n:600|six hundred]]`: the page shows the left side, the voice says the right (*six hundred seconds*, not *600 s*). A digit outside a pair is refused, and the right side of a pair obeys every spoken-text rule here;
- **a symbol, path or code fragment** — `` / \ ` _ { } < > | # @ = * ~ ^ $ % + ``;
- **a typographic symbol the voice skips or misreads** — `→ ← · … &`;
- **an unknown marker** — a line starting `@` that is not `@img`, `@vid` or `@fig`.

Warnings — rewrite unless there is a reason:
- a sentence over 30 words (the register's aim is 25);
- a paragraph over 70 words (it is one idea the reader holds until its figure lands);
- three paragraphs in a row with no figure between them;
- a script with no figure at all;
- a script outside 60–230 spoken words (about 25 s to 1.5 min — longer wants a split).

### Cues (v3) — the voice steps a figure

A widget that animates on its own clock beside the voice makes the reader follow two lines. A **cue** ties a part of a figure to the word that
names it instead:

```
There are two sources, and three moments decide which one answers. [[src:1]]Before a run there are no numbers yet, so the catalog
estimate answers. [[src:2]]After the run, the last run answers, at the tick the canvas shows. [[src:3]]After an edit, that run no longer…
@fig src
```

- `[[fig:k]]` sits before a word, alone or glued to it; the builder puts `data-cue="fig:k"` on that word. It is never spoken and never hashed — a
  cue-only edit does not re-record.
- The figure's parts carry `data-k="k"` (or a list, `data-k="1 5"`, for a part named twice). As the voice passes each cue, the figure takes that
  step: parts naming it read `data-at="now"`, parts named earlier `past`, parts not yet named `next` (dimmed). Style the three in `page.css`.
- **At rest the figure shows whole** — its final frame — whenever no clip is current: never played, stopped, or ended. **When its clip starts it
  resets to its first frame** — step 0, every part `next`, a moving stage empty — and the cues step it from there; a pause holds the step
  (operator 2026-10-05: *"when we play the transcription, it should reset to the original state"*). A reader without audio loses nothing.
- Steps are state, not motion: they hold under reduced motion and Motion: Paused, because they are what the voice is pointing at.
- Do not nest `data-k` parts — the dim compounds.

**What a cued figure is for.** It encodes — an icon and a colour per kind, a bar per share, the app's own status colours on a dot — and the cues walk
the reader through that encoding in the voice's order. A generic table or a row of identical cards does not earn a figure: write it as text.

Lint adds three errors: a malformed `[[`…`]]`; a cue naming a figure this script does not place with `@fig`; a cue closing a paragraph (it would name
no word). The builder adds a fourth: a cue step no `data-k` in the figure's block carries.

### Numbers (v4) — the page shows them, the voice says them

A number in a script is a pair, `[[n:SHOWN|SPOKEN]]`:

```
The panel lists [[n:10,407|about ten thousand]] requests, and [[n:3|three]] of them timed out.
```

- The page shows the left side (digits, commas, `%` and the like are fine there); the recording speaks the right; the reading wave lights the shown number for
  the whole spoken span. A page paragraph never spells out a number the reader needs to see — show the digits through the pair.
- The builder renders a pair as ONE word span, `<span class="w n" data-say="about ten thousand">10,407</span>`, timed at its first spoken word, and aligns the
  boundaries over the spoken words, so `words.json` is unchanged in shape and `narrated.js` needs nothing. A script with no pair builds byte-identical to v3.
- Only the spoken side is spoken, counted (the 60–230 words, the sentence and paragraph lengths) and hashed, so turning a spelled number into a pair — or
  editing the shown side — re-synthesizes nothing.
- Lint adds four errors: a malformed or unclosed pair (both sides filled, no pair inside a pair, a closing `]]`); a pair whose shown side holds no
  digit (a word needs no pair); two pairs glued together (`]][[n:` would speak as one run-on word — put a space between); and the figure id `n`, which is
  reserved (`[[n:3]]` is not a cue, and `@fig n` is refused). A digit or a symbol on the spoken side fails the ordinary spoken-text rules above, naming
  the clip and the paragraph. The builder stops on the same malformed, unclosed or glued pair.
- Cues may sit beside a pair, never inside it.

The visible page keeps its real numbers, ids and merges — in captions, figure blocks and the header. **Every number the page states about the
narration is generated**: `{{RUNTIME}}`, `{{CLIP_COUNT}}`, the durations — never typed. A number the script states is the exception that proves the rule: it
is typed once, as a pair (`[[n:3|three]]`), and the page shows the digits while the voice says the words.

## 4 · The pipeline

One clip at a time, one heavy job at a time (the WSL2 rule).

```bash
# once per machine — the system edge-tts answered 403; 7.2.8 in a venv works
python3 -m venv <scratchpad>/tts-venv && <scratchpad>/tts-venv/bin/pip install -q edge-tts==7.2.8

<scratchpad>/tts-venv/bin/python <skill>/tools/narrate-tts.py <workdir> --lint-only   # rules only
<scratchpad>/tts-venv/bin/python <skill>/tools/narrate-tts.py <workdir> [clip …]       # record
python3 <skill>/tools/narrate-build.py <workdir> -o <out.html>                          # build — standalone
python3 <skill>/tools/narrate-build.py <workdir> -o <out.html> --fragment               # build — Artifact form
```

`narrate-tts.py` speaks only the paragraph lines — never an `@` line — through the Python API with `boundary="WordBoundary"`: one event per word,
offsets in 100 ns ticks (÷ 1e4 → ms). The CLI's subtitles give sentences only. It encodes mono 48 kbps with ffmpeg, retries three times, and checks
that the voice spoke as many words as the script holds (tolerance max(2, n/50) — a hyphenated compound may speak as two; a pair counts as its spoken
side). An unchanged script, voice and rate skips (`mp3/<clip>.src.sha256`) — a figure-only edit does not re-record, and neither does a change to the shown
side of a pair; `--force` does. Exit 0 ok · 1 lint or word mismatch ·
2 could not run.

`narrate-build.py` pastes the kit's three blocks, injects `assets/narrated.css` (+ `page.css`) before the cog's CSS, generates the dock, lifts the
figure blocks out of `body.html`, fills the placeholders, places every figure after its paragraph, aligns every script word to a boundary, embeds
the audio, clips and stills as base64 `data:` URIs, and appends `assets/narrated.js` (+ `page.js`). Standalone, it writes the doctype, `<html lang>`
and a `<head>` with charset, viewport, `color-scheme: light dark`, the title and the description. It dies on an unfilled placeholder, a section with
no listen row or script, an `@fig` with no block, a block no script places, a block defined twice, an unknown marker, an unknown extra font, or —
with `--fragment` — a page past 15 MB.

## 5 · Placeholders in `body.html`

| Placeholder | Becomes |
|---|---|
| `{{ICON:name}}` | an inline Lucide `<svg>` |
| `{{LISTEN:clip[:label]}}` | the section's listen row: play pill, seek bar, time |
| `{{TX:clip}}` | the script — every paragraph shown as `<p data-p>`, every word a `.w` span (a number pair is ONE `.w.n` span: the shown number as its text, the spoken words in `data-say`); every figure placed after its paragraph as `<figure class="fig" data-p>` |
| `{{NEXT:id}}` | the section foot: "Next: <the next section's title>"; the last section gets "Back to the top" |
| `{{IMG:path}}` | a file under the work dir as a `data:` URI |
| `{{RUNTIME}}` · `{{CLIP_COUNT}}` | "about 6½ min" · the clip count |

A section is `<section class="sec" data-sec="N" id="<id>">` with a `.sec-head h2` led by `{{ICON:…}}` (H5, H6), then `{{LISTEN}}`, `{{TX}}` and
`{{NEXT}}`. Its figure blocks may sit anywhere in `body.html` — the builder lifts them out — but keep each beside the section that places it.

A widget block is `<div class="widget panel">…</div><figcaption>…</figcaption>`: `.panel` is a hairline frame — no accent rail (H5, retired
2026-10-05); the chrome gate fails one. `.wide` on the widget lets it take the full column instead of the widget measure (H1). Parts a script cues
carry `data-k` (§3, cues).

## 6 · The dock — one bar

One sticky `nav#dock` at the top of the flow, never fixed. Since v3 it is **one row** that carries the cog as well (operator 2026-10-05:
*"integrate the bar for what we are playing… with the configuration"*), so nothing on the page is fixed at all (H2).

- **Left · the sections menu.** One button — a list icon, the reader's place (`3 / 7`), a chevron — opens a panel listing every section: its icon on
  the section's own tone, its title, its duration, and a play button for its audio. Focus moves in; the arrow keys walk the rows; Escape (focus back),
  an outside click or opening the cog closes it. The scrollspy marks the row in view (`data-current` + `aria-current="location"`) and the button counts
  it; the row playing shows a pause icon.
- **Left · Play all and Next** — icons only, each named on hover (`title`) and to a screen reader (`aria-label`). Play all chains to the end and turns
  into pause while it runs; Next scrolls to the following section.
- **Centre · the player.** Start over · previous · play/pause · next | what is playing — the section's icon on its tone, its title, the time — over the
  seek bar | restart this section · stop · speed (1 → 1.15 → 1.3 → 0.85, saved as `gabe:narration:rate`).
- **Right · the cog**, the kit's own, riding in the bar; its panel drops under it.
- Under 980px *start over* and *restart* leave the bar (the menu's first row and the previous button cover them). Under 640px the bar takes two rows:
  menu · Play all · Next … cog, then the player, with the title on its own line and the time beside the seek bar. A jump parks the section below the
  dock: `--dock-h` is measured (ResizeObserver) and `.sec { scroll-margin-top: calc(var(--dock-h) + 14px) }`.
- **The last section reaches the dock too.** A short last section on a short page cannot scroll up there — it lands mid-screen, the counter names
  the section above it and Play starts that one's clip (the worked example failed three checks on exactly this). The engine measures what the page
  lacks below the last section and grows its end by that much: `--tail` on `.artifact-page::after`, re-measured a frame after the dock or the page
  resizes (resizing inside the ResizeObserver callback itself is a loop error).

## 7 · The audio engine (`assets/narrated.js`)

One `Audio()` for the page. Play on a section loads its clip, applies the rate (after every `load()` — a new source resets it), and paints every
view of the state: listen rows, the menu's rows, the player's icon, tone and title. `ended` plays the next clip and scrolls to it when the chain is on (Play all, Start over).
Space on the page body toggles. The test hook `window.__narration = { audio, TIMES, DURS, ORDER, CUES, state() }` is what the gate and `page.js`
read; `state().live` names the live paragraph as `<clip>:<p>`, `state().steps` the step each cued figure shows.

**Live figures.** Each frame the engine finds the paragraph under the voice. When it changes, every figure tied to it gets `data-live="true"` and
every other figure loses it; a live clip restarts from its first frame, and a live widget replays each `[data-fx]` stage inside it through
`window.FXREPLAY`. The page follows the voice — it scrolls the live figure into view — unless the reader scrolled in the last five seconds
(`FOLLOW_QUIET`): a reader who went looking for something keeps their place. Under reduced motion or Motion: Paused a figure still goes live (the
outline), but nothing restarts. A **cued** figure (`data-cued`, §3) neither outlines nor replays when it goes live — its parts carry the voice.

**The cue engine.** At load the engine reads every `data-cue` word into `CUES[clip]`. Each frame it takes the word under the voice and, for each
figure the clip cues, the last cue at or before it: that step goes on the figure as `data-step`, and every `[data-k]` part gets `data-at`
now · past · next. While a clip is current, every figure it cues sits on step 0 (every part `next`) until its first cue; with no clip current —
stopped, ended, never played — every figure loses both and shows whole.

**Clips on the page.** Every `@vid` is muted, looping and `playsinline`; an IntersectionObserver plays it while it is in view and pauses it when it
leaves. Motion: Paused pauses every clip. Under reduced motion a clip never plays: it rests on its last frame — the finished state — with native
controls, so the reader can still run it by hand. A click on any clip or still opens it in `dialog#zoom` at full size; Escape or a click closes it
and focus returns to the figure.

## 8 · The reading wave

The wave lights the word under the voice and its neighbours, a crest that moves with the speech. A number pair is one span, timed at its first spoken word, so the shown number stays the crest for the whole of its spoken words.

- The centre word is a fractional index, binary-searched in the clip's onset times each frame.
- Each word within ±4 of the centre gets a weight `w = exp(−(j − c)² / (2 · 0.9²))`, set as `--w` on the word.
- `.w` draws the weight as `-webkit-text-stroke: calc(var(--w) * 0.8px)` and a `color-mix` toward `--ink`.

**ONE copy of each word.** A stroke never changes a glyph's advance, so nothing reflows. Never cross-fade a regular and a bold copy: in a
proportional face the two read as two words.

Under reduced motion or Motion: Paused, the wave narrows to the current word alone — the reading position stays, the movement goes.

## 9 · Action clips (`tools/clip-recorder.mjs` + `tools/clip-encode.py`)

A clip shows the app doing the one thing its paragraph says — a click, a drag, a panel opening — in a few seconds, then rests on the result.

**Record** from a Playwright test in `capture/` against the dev server, one test per clip so a bad one re-records alone
(`npx playwright test -c capture/capture.config.ts -g "<name>"`; the config's `outputDir` sits outside the repo):

```js
import { installCursor, glide, tap, park, startClip } from "<skill>/tools/clip-recorder.mjs";
await installCursor(page, { titles: true });     // before goto; titles paints `title` tooltips, which a screencast never shows
const rec = await startClip(page, "room-open", FRAMES);
await tap(page, page.getByTestId("sim-open-tick"));   // the drawn cursor glides there and rings on the press
await rec.stop(await cropAround(page, [button, panel], 10));
```

- Frames come from CDP `Page.startScreencast` (JPEG q85, every second frame), each with its real timestamp — Playwright's own `recordVideo` is VP8 at a
  fixed bitrate and blurs 12px UI text.
- **Record at deviceScaleFactor 1.** Headless Chromium's screencast arrives at CSS-pixel size whatever the DPR; a page shows a clip at its own size.
  (A clip whose frames really are 2× — clip-encode prints the scale — is named `<name>@2x.mp4`, and the builder halves it.)
- **Crop around the pressed element and what it opened**, with 10px of air, ≤ ~1240px wide. Take the pressed element's box **before** the click — a
  panel opening can move it.
- **Hover the element that owns the title you mean.** With `titles: true` the cursor paints the nearest `[title]` under it; a child with its own title
  (a select inside a card) wins, and the clip explains the wrong thing.

**Encode** one clip at a time, then delete its frames once the clip is good:

```bash
python3 <skill>/tools/clip-encode.py <frames>/room-open clips/room-open.mp4 [--speed 2] [--crf 24]
```

Each frame holds for its real on-screen time; the first holds 0.5 s longer (lead) and the last 1.8 s (hold), so the loop rests on the finished state.
H.264 `slow`, CRF 24, 30 fps, yuv420p, faststart, no audio. `--speed` plays the action faster than it was recorded — for a step where the app is slow
(a slider drag re-renders on every step) — while the lead and the hold keep their length. Aim for 6–15 s on the page; the recap's ten clips run
6.7–14.6 s, three of them sped up (×1.3, ×2, ×2.5).

## 10 · Page animations on a narrated page

H4 binds as everywhere, with two additions:

- **Rest on the finished frame.** With no clip current a stage shows its finished state and holds still — it never animates on load, nor when it
  scrolls into view (operator 2026-10-05: *"when we are not reproducing transcriptions, they should go to the final state, ending the animation,
  not at the beginning of the animation"*). A stage dimmed or empty while it waits is what a thumbnail and a skimmer see.
- **The voice and the picture move together** — through cues and live figures (§7), never on a figure's own timer. A figure the voice walks
  through is cued, and has no animation of its own: the steps are the movement. A stage that genuinely moves (bars filling to their shares)
  follows its figure's `data-step`: none → the finished frame · `0` → the first frame (play just started) · `k` → step *k*, animated. A replay
  through `FXREPLAY` runs from zero at rest and re-applies the step on a stepped figure, so it never runs ahead of the voice. A widget that replays on a clock
  beside the voice (the v2 recap's timeline and moments) is the defect v3 removed; so is a `page.js` that replays a whole section when narration
  starts it (v1).

`window.FXREPLAY[slug]` and `window.__rebuildMotion` are the H4 contract unchanged. The portable worked example is `examples/narrated-mini/page.js`
(one stage, `meter`, ~25 lines: a `MutationObserver` on its figure's `data-step`, `rest()` at load); the drill-down recap's `page.js` (`paths`) is
the full-size one.

## 11 · The gate (`tools/verify-narration.mjs`, 53 checks, ~65 s with real audio)

Chromium runs with `--autoplay-policy=no-user-gesture-required` over a local http server. Five groups:

1. **Structure** — no console errors; the hook exists; the dock is sticky, nothing on the page is fixed and the cog rides in the dock, the dock's
   controls end before it; one iconed, playable menu row per clip; the menu hidden; Play all and Next named icons; every clip has a duration, a
   listen row and its script; **every section lands its script on at least one
   figure**; one rising timing per word; no digit or symbol in the spoken text (a number pair is read by its spoken side, `data-say`); every number the page shows carries the words the voice says (the shown side holds a digit, the spoken side is non-empty with no digit or symbol); `--dock-h` and the scroll margin agree; the next-button chain ends
   at the top; no sideways scroll at 1280px; **at rest a moving figure shows its finished frame and holds still** — each stage sampled at uneven
   gaps, then replayed through `FXREPLAY` and left to settle: the settled frame must be the frame it rested on.
2. **Sections menu** — focus moves in; the arrows walk the rows; Escape returns focus; an outside click (in the left gutter — the page centre can sit
   under the open menu) closes it, and so does opening the cog; a row lands its section under the dock once the smooth scroll settles; the scrollspy
   marks it and the button counts it (`3 / 7`); Next goes to the following section.
3. **Player** — play starts the section in view and names it; **the figure tied to the paragraph under the voice goes live, and only it**; the wave's
   top word sits within ±2 of the timed index with 2–9 words lit, drawn as a stroke on one copy; dock seek, row seek, restart, speed (persisting
   into next), previous, Space; Motion: Paused narrows to one word; **a cue word steps its figure** — seeked through a section bar to a cue of step
   2 or more, clear of the next cue, the figure shows that step with its part *now* and an earlier one *past*; **play resets a cued figure to
   its first frame** — a clip played from its start shows a figure cued more than 2.5 s in on step 0, every part waiting, its moving stage off the
   finished frame (a figure with a stage is preferred); stop clears the clip, returns every figure whole and **every moving figure to its
   finished frame**; start over and Play all chain.
4. **Reduced motion** — exactly one word lit.
5. **Phone (390px)** — no sideways scroll; the dock ≤ 30% of the screen; no dock control overlaps another, and no dock button spills out of its own
   box; what is playing keeps ≥ 120px; the menu opens inside the screen; nothing in the dock (the cog's panel aside — chrome), the script, listen
   rows or section foot under 12px.

A run that crashes prints `INCOMPLETE n/m` and exits 2 — never a pass. **Fire-proof:** with the `[hidden]` rule stripped (the v1 defect —
`.dd { display:flex }` beats `hidden`, every dropdown renders open) the v2 gate failed three checks and stopped INCOMPLETE 13/16. With the phone's
`.dock .toc-btn { width: auto }` stripped (the v3 defect — a 32px square squeezed "3 / 7" under Play all) the gate fails one check, *toc-btn spills
29px*; a box-overlap test alone passed it, because the button's box never touched its neighbour, only its text did.

**The battery** `tests/narration/run.sh` keeps that proof standing: it builds the worked example and requires the gate SILENT on it and FIRING on
ten mutations — the menu shipped without `hidden`, the phone's `.dock .toc-btn { width: auto }` stripped, every `data-cue` removed, the `--tail` rule
removed, the dock made fixed, play without the step-0 reset, a widget that animates when scrolled into view, a widget resting on its first
frame, a shown number that lost the words the voice says, a shown number whose spoken words are empty. Eleven gate runs, ~4 min; run it alone. Nine
fast checks with no browser come first: the lint silent on the example and firing on a bare digit, a malformed pair, a digit on the spoken side, a
shown side with no digit, two glued pairs and a reserved `@fig n`; the spoken text (so the synthesis stamp) the same with the pair as without; the
builder rendering the pair as one `.w.n` span.

**Waits are measured, never slept.** A jump on a long page is a smooth scroll that can take over a second (1.3 s on the recap's 18,000px page); the
gate polls `scrollY` until two reads agree before it checks where the section landed. A fixed sleep passed on a short page and failed on a long one.

## 12 · Size budget

Mono 48 kbps ≈ 0.36 MB per minute of speech; base64 adds a third → ≈ 0.48 MB per minute on the page. Stills go in as JPEG (≈ 50–100 KB each), never
PNG. Clips are the weight: ≈ 0.2–1 MB each at CRF 24, depending on crop and motion — the recap's ten came to about 4.5 MB of its 7.92 MB.

- **Artifact (`--fragment`):** the builder dies past 15 MB (the host caps at 16) — about 25 minutes of narration with no clips, far less with them.
- **Standalone:** no cap; the builder WARNs past 40 MB, where a file stops travelling by mail or chat. Trim clips before narration.

## 13 · Decisions taken

| # | Decision | Status |
|---|---|---|
| D1 | Engine: recorded edge-tts for a narrated explainer; browser speech for a page read in place when read-aloud is asked for | taken (2026-10-04) |
| D2 | Voice: `en-US-AndrewNeural` at +4%, matching the reference; per page in the config. The ruled browser voice (en-GB, see `read-aloud.md` §5) maps to `en-GB-SoniaNeural` +15% when a page wants it | default — the operator's to change |
| D3 | The wave is allowed; it narrows to one word under reduced motion and Motion: Paused. Smooth scroll stays on, off under reduced motion | taken (2026-10-04) |
| D4 | ~~Summary + transcript: the first paragraph shows open; the rest folds~~ — superseded by D7 | superseded (2026-10-05) |
| D5 | Georgia joins the roster as its third family (16px, +0.005em); the page-level `extra_fonts` opt-in retires | taken (2026-10-05, operator: *"yes, let's add Georgia to the available fonts"*) |
| D6 | The dock IS the read-aloud bar (H7) on a recorded page, with a speed control added | taken (2026-10-04) |
| D7 | Script v2: the script IS the section — every paragraph shown, each idea landed on a clip, still or widget placed by `@vid`/`@img`/`@fig`, and the figure goes live while its paragraph is spoken | taken (2026-10-05, operator) |
| D8 | A project explainer is a standalone HTML file in gitignored `.kdbp/explainers/`; the Artifact form is `--fragment`, on request | taken (2026-10-05, operator) |
| D9 | One centred column with text set left; prose on a ~70-character measure, media breaking out to its own width (H1) | taken (2026-10-05, operator) |
| D10 | Script v3 cues: a figure the voice explains is stepped by `[[fig:k]]` cue words, never by its own timer; at rest it shows whole | taken (2026-10-05, operator) |
| D11 | One-bar dock: sections menu + Play all + Next (icons) left, the player centre, the cog right; nothing fixed | taken (2026-10-05, operator) |
| D12 | Figures encode (icon + colour per kind, bars for shares, status dots); a generic table or a uniform card grid becomes text; the accent rail is retired | taken (2026-10-05, operator) |
| D13 | Text size (100–135 %) and spacing (tight · normal · airy) in the cog, persisted beside the family | taken (2026-10-05, operator) |
| D14 | On a narrated page the voice is an animation's replay (its cue word; a seek back replays it) — no Replay button beside it | taken, provisional (2026-10-05, operator: *"that might be"*) |
| D15 | With no clip current every figure and moving stage shows its final frame and holds still; play resets the section's figures to their first frame and the cues step them | taken (2026-10-05, operator) |
| D16 | A page is plain by default — no player bar, no spoken summaries, no audio; a narrated page only on the word *narrated*, the read-aloud bar only on a request for read-aloud (reverses D-076). Numbers: the page shows them, the voice says them — a number is a pair `[[n:shown\|spoken]]` (script v4) and the digit ban covers only the spoken side | taken (2026-10-09, operator) |
