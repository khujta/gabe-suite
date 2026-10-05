# read-aloud — the binding spec for H7

> Binding for every artifact or generated page that has sections: `SKILL.md` (H7) points here; `tools/verify-read-aloud.mjs` proves it on a rendered page.
> The operator's words behind it: *"a summary that I can copy and paste and read out loud"* · *"the header navigation bar gets frozen on
> the top… I can stop or skip to a later section, and it will also take me to that section on the page"* · his own voice · *"I would like to
> see that bar all the time on this kind of artifacts"* and *"save this for any future artifact… especially with the GabeArtifact skill"* ·
> *"a more indented way, like with dropdowns, maybe by sections… summaries, especially in the parts where we have to make decisions… using gabe-lens plain"* · *"include examples and impact on the decision items, and for icons use the rules we identified to put text to show about the icons when we hover them"*
> A rule marked **default** is a number the operator accepted as a starting point rather than set himself; it lives in one constant of the gate and is his to change.

## 1 · When it applies

Every artifact or generated page that has sections (`.sec`, the kit's section) — one section is enough. A page with no `.sec` is outside the rule and the
gate reports a loud `SKIP` (nothing to read is not "verified"). There is no per-page opt-out — only a change of engine: a narrated explainer
built by `tools/narrate-build.py` carries recorded narration instead (`references/narration.md`), and this gate SKIPs it by its
`nav#dock[data-narration="recorded"]` mark and names `tools/verify-narration.mjs`.

## 2 · The model: sections, items, units

```js
ReadAloud.mount({ sections: [{ id, title, say, items: [{ id, title, say, example, impact, plain }] }], voice, words, icons, storageKey, voiceKey, bar, host, topHost })
```

- A **section** is an element that already exists in the page (`id`), with a `title` (the chip's name, also read first when titles are on) and a `say`.
- An **item** is a part of a section the reader may want to land on — each decision, each pattern, each card. Its element is inside the section's,
  in page order. `say` is its own short summary; `example` and `impact` (optional, and only on an item that has a `say`) are one sentence each (§3); `plain` is one sentence in the gabe-lens plain voice (§3).
- A **unit** is one thing the reading can stand on: a section's summary, then its items' summaries, in page order. An item's summary is read in this order: `say`, then `example`, then `impact`
  (and the `plain` line last, where a page reads it: open choice 3). An item with only a `plain` line is read by it; an item with neither is a menu entry that only moves the page. Every id must name an element in the page, in order; the module warns once
  on the console for a missing one and the gate fails on it.

## 3 · The spoken summary

| Rule | Binding |
|---|---|
| Where | A section's summary sits directly under its head (`.sec-head`); an item's sits under its heading, indented. Both are marked blocks (`data-ra-say`), never inside a table. |
| Length | A section: **3 to 6 sentences** (ruled). An item: **2 to 4** (default; the operator only said "short"). Every sentence ends with `.`, `!` or `?`. |
| Words | Plain spoken words, present tense, the reader as "you" where they act. Lead with the point; end on what changes their next move. A thing is named, never its id. |
| Never in a summary | An id (`D-17`, `P3`), a code identifier (`snake_case`, `camelCase`), a path or file name, a slash, a symbol a voice trips on (`· → × | # " < > =`), a `{token}`, `undefined`, `NaN`, `null`. |
| Numbers | **Generated, never typed.** The page's data fills sentence templates at build or load time; the build stops on a `{token}` left over, an `undefined`, or a digit typed into a template. The gate cannot see typing — only the generator can — so this rule is the generator's. |
| Items that decide | What it decides · the options and what each sets in motion · the pick · the reader's pick once made. Generated from the page's own data. |
| Example and impact | `example`: **one** sentence, one concrete case from the page's own real data (a named thing and its true numbers), never an id or a code name. `impact`: **one** sentence for the whole item, saying for each option what changes on the page, for the reader, or elsewhere if it is picked ("pick A and it …; pick B and it …"), numbers generated. Both are shown under the summary (labelled), read after it, and copied with it; the gate reads them with the same lint as the summary and counts one sentence each. |
| Plain line | `/gabe-lens plain X` voice: **one sentence**, a concrete noun for what the thing IS, then at most one em dash clause that sharpens it; the reader's side of the screen; no analogy. It is shown (under the item in the menu, and leading its block) and is **not spoken** when the item has a summary. |
| Copy | Each block has **"copy to read aloud"**: the text as shown, without its heading. The page has **"copy every summary"** on top: every unit in page order, each headed by its title on its own line, blank line between. |

## 4 · The bar

**Position.** One `<nav class="ra-bar" aria-label>` in the page's flow after the header, `position: sticky; top: 0`, so it is at the top of the screen at
every scroll position and **always** — not only while a voice plays, and also where the browser cannot speak (the chips still move the page).
It is sticky, never `fixed`: the cog stays the only floating thing (H2 is amended, not broken). Its right edge clears the cog (56px). The option
`bar: "playing"` (only while a voice plays) exists as the other value of the "always / only while a voice plays" option; a page that sets it fails the gate's group 2.

**Rows.** (1) The player, where the browser can speak: play/pause · stop · previous · next · the voice's name · the speed (slower · normal · faster) · follow.
(2) The contents: `contents` and one chip per section; a section with items is a **split chip** — the section (a link) and a caret that opens its items
in **one** menu under the bar (outside the chip row, whose own scroll would clip it); a section without items is a flat chip. The section being
read has its chip lit; in the menu the item being read is lit; the summary being read is marked.

**Behaviour.**

| Control | Rule |
|---|---|
| Play | Starts at the unit in view (the last unit whose element starts above 80px below the bar, or below the screen's top before the bar has stuck) and runs on through every later unit, then stops by itself. It moves nothing on the page. |
| Pause / resume | Pause cancels the sentence in flight and keeps the position; resume says that sentence again from its first word. Never `speechSynthesis.pause()` — it hangs on Chrome's online voices. |
| Stop | Cancels, clears every lit state, disables itself, previous and next. The next play starts from the unit in view. |
| Previous / next | One **unit** back or forward (default: unit, not section — a chip skips a whole section); moves the reading AND the page. |
| A chip, a menu item | While reading: the reading moves to that unit AND the page scrolls to its element, just under the bar; the reading then runs on. Not reading: the link's own jump. An item with no text stands on the next unit. |
| Auto-advance | When the reading moves to the next unit by itself, the page follows it if **follow** is on (default on; kept per reader). A skip always scrolls. |
| Menu | Opens from the caret; Escape closes it and returns focus to the caret; a click outside, a pick or focus leaving the bar closes it; a keyboard open lands on the first item. Each entry: title, then its plain line. |
| Hovers | **One hover per item**: every icon sits inside exactly one hover, and a standalone icon is its own item. A hover says its item's own fact in plain words, never only the icon's word; a control's hover is a verb and its object, six words at most (*Play the reading*, *Next open decision*); what a kind of icon means is said once, in a legend, and no hover repeats it; no word about the page or the map, no code spelling (the rules are `references/legibility.md`). |
| Speed | `slower` 0.8 · `normal` 1 · `faster` 1.25, each **times the voice's own rate** (saved, else ruled), so a voice he tuned keeps its character. Kept per reader; applies from the next sentence. |

**Sentence by sentence.** Every sentence is its own utterance (so a pause, a skip and a stop land on a sentence; a long utterance stalls Chrome's online voices),
with the voice's `pauseSentence` between sentences and `pauseSection` between units. The saved voice setting is read again at every sentence, so a change in the
voice lab reaches the next one. With titles on (§5) a unit's title is its first utterance.

## 5 · The voice

Resolution, in order; the first that exists reads, and the page **says which in words** (the top row's note, visible at every width, and the bar's voice chip on wide screens):

1. the saved setting `gabe:voice:v1` (written by the voice lab: `{engine, voice, lang, rate, pitch, volume, pauseSentence, pauseSection, readTitles}`) — a Piper voice cannot play here and is said so;
2. the **ruled voice** — the `voice` object the builder inlines from the voice file it finds (an Artifact cannot fetch); where that file lives is below;
3. a **British Google** voice (`en-GB`, name has Google);
4. an **English Natural or Google** voice;
5. the browser's own default.

Notes the page speaks: *Reading with {name}, the voice you saved* · *…the voice this page was built with* · *The voice {want} is not in this browser, so {name} reads instead* ·
*…so this browser's default voice reads instead* · *Reading with {name}, a British / an English voice from this browser* · *This browser cannot speak…*. Each is a `words` key.
Rate, pitch, volume and pauses resolve saved → ruled → default, per value. Titles: saved `readTitles` → ruled `readTitles` → on during a run.

**Where the ruled voice lives.** The module carries no voice of its own: the page's `voice` option is the ruled voice, and the **builder inlines it at build** from a `voice.ruled.json`
(`{engine, voice, lang, rate, pitch, volume, pauseSentence, pauseSection, readTitles, ruled[]}` — the file the voice lab writes; `ruled` lists the values the operator set himself, the rest are picks).
Look for it in this order: the project's own `voice.ruled.json`; else, in a Gabe Suite checkout, the operator's file at `docs/design/design-context/legibility/voices/voice.ruled.json`
(a path inside the repo — never an absolute path typed into this skill or a page). The operator's ruled voice: **Google UK English Female** (`en-GB`), **speed 1.15**, pitch 1, volume 1,
**250 ms** between sentences, 900 ms between units, titles read (`ruled`: voice, rate, pitch, pauseSentence). No file found → omit `voice`: the chain starts at rung 3, the page says so, and the build report says no ruled voice was found.

## 6 · Storage

Two keys, every call in try/catch (a sandboxed frame throws): `gabe:voice:v1` (read only — the voice lab owns it) and `gabe:artifact:readaloud` (`{speed, follow}`, shared across this reader's
artifacts on purpose, like `gabe:artifact:font`). The page renders and reads correctly with storage blocked.

## 7 · The look

Skin tokens only (`--ground --card --raised --ink --ink-soft --muted --rule --accent --accent-soft --radius --rail --shadow`), so it wears Catalog, Blueprint and Mission Console, light and dark, on an opaque ground.
Sizes are the kit's `--fs-*` steps — **nothing under 12px**, measured at the smallest roster base (15px). **No motion**: no animation, no transition, no smooth scroll; a state is a static style (artifacts start
finished). Reflows at **390px**: controls on as few rows as fit, the chips scroll inside their own row, the open menu takes the bar's width, no sideways scroll, the bar ≤ 20% of the screen (default). Every
control is a native button, link or select with a visible focus ring (2px accent); icons are inline Lucide geometry; `aria-label`s name every icon-only control.

## 8 · What the render gate checks (`tools/verify-read-aloud.mjs`, 44 checks on the demo)

`speechSynthesis` is mocked; 6 groups, runnable alone with `--only`. **1** the bar is on the page · every id is in the page, in order · every section has a summary and a copy button · 3–6 / 2–4 sentences ·
no id / path / symbol / `{token}` (in an item's example and impact too, one sentence each) · a plain line is one sentence · a chip per section, a caret only where there are items · the controls exist · copy and copy-every put the shown text on the clipboard.
**2** scrolled to the bottom with no voice playing the bar is at the top, visible, uncovered · the cog stays the only fixed thing. **3** a run reads every unit once in page order and stops · every utterance is one
sentence · play starts at the unit in view in the ruled voice at its own rate · lit chip and marked summary · pause/resume · next, a chip and a menu pick each move the reading AND the page · the menu lists
the items with plain lines, on screen · Escape and outside click · slower is 0.8 × the voice's rate · stop · no running animation · speed kept across a reload. **4** each rung of the voice chain, used and named.
**5** storage that throws · a browser that cannot speak. **6** 12px floor · no motion · every skin, light and dark · 390px · the cog clear · keyboard focus and Enter.
**Fixture law:** it FIRES on `tests/read-aloud/fixtures/without-bar.html` and stays SILENT on `assets/read-aloud-demo.html`; `tests/read-aloud/run.sh` adds one fixture per defect class and one-line mutants of the module (mutation-anchored — a stale anchor aborts).
Not proved, and said so: that audio comes out of a real voice (mocked), that a number was generated rather than typed (the generator's rule), and that the words are *good* (a reader's call).

## 9 · Wiring a page (the builder's steps)

1. Paste the kit's three blocks, then `read-aloud.css` as block 4 (style) and `read-aloud.js` as block 5 (script) — an Artifact cannot load sibling files.
2. Give every section a `.sec` with an id and an iconed head; give each item an element with an id inside its section.
3. Resolve the ruled voice (§5, "Where the ruled voice lives") and inline it as `voice`; build each `say` (and an item's `example` and `impact`) from sentence templates over the page's data; author each `plain` with `/gabe-lens plain`.
4. `ReadAloud.mount({ sections, voice })` after the page's content exists.
5. Run `verify-read-aloud.mjs` beside the chrome gate; publish on green.
