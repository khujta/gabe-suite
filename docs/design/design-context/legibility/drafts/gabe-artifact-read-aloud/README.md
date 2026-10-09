> **LANDED (D-085)** — in `skills/gabe-artifact/` (SKILL.md H7, `references/read-aloud.md`, `assets/read-aloud.{js,css}`, `assets/read-aloud-demo.html`, `tools/verify-read-aloud.mjs`) and `tests/read-aloud/`; gabe-artifact 1.5.0. This folder stays as the design record; the landed files are the source. gabe-artifact 1.8.0 (`1c611f23`) later reversed the every-page rule: a page is plain by default, with the bar only when asked; pages that carry the bar keep it.

# gabe-artifact · read-aloud — DRAFT, do not land (D-076, D-077, D-078)

His words (D-076): *"I would like to save this for any future artifact that we create, especially with the GabeArtifact skill"* and *"the bar appeared, and it's perfect. The only thing is that I would like to see that bar all the time on this kind of artifacts."*
D-077 nests the bar's menu: each section a dropdown of its items, each item with its own spoken summary and a gabe-lens plain line.
D-078 (his dictation, read as: *"include examples and impact on the decision items, and for icons use the rules we identified to put text to show about the icons when we hover them"*) gives an item an optional `example` and `impact`, read after its summary, and states the icon-hover rule for the bar's icons.
This folder is the whole proposal as files. **Nothing outside it was touched** (no `skills/`, `templates/`, `tests/`, `install.sh`, `CLAUDE.md`, `README.md`, and not the review page or the voice lab). It lands only on his "land it".

## What it is

A dependency-free module (`ReadAloud.mount({ sections: [{ id, title, say, items: [{ id, title, say, example, impact, plain }] }], voice })`) extracted from the reference build (`legibility-review.tpl.html`, `voices/voice-lab.tpl.html`, D-072/D-074/D-075): a spoken summary opening each section and each item, a copy button on each, "copy every summary" on top, and a sticky player bar in view all the time — play/pause, stop, previous/next, speed, follow, a chip per section (a dropdown of its items where it has any), the one being read lit, a skip that moves the reading and the page, the voice chain with the fallback named in words.

## What lands where, if he says "land it"

| Draft file | Suite destination | Note |
|---|---|---|
| `SKILL-clause.md` | `skills/gabe-artifact/SKILL.md` — H7 after H6, plus five one-line edits | 140 → ~149 lines (cap 200); version 1.3.1 → 1.4.0 |
| `read-aloud.md` | `skills/gabe-artifact/references/read-aloud.md` (the skill has no `references/` yet — the suite convention for a deep spec) | the binding spec, 116 lines |
| `read-aloud.js`, `read-aloud.css` | `skills/gabe-artifact/assets/` | pasted into each Artifact as kit blocks 4 and 5 (CSP: no sibling files) |
| `demo.html` | `skills/gabe-artifact/assets/read-aloud-demo.html` | standalone proof and the retrofit starting point; wears the kit verbatim |
| `verify-read-aloud.mjs` | `skills/gabe-artifact/tools/` | resolves Playwright like the chrome gate (`PLAYWRIGHT_DIR`, then the docsite helper); no machine path in it |
| `run.sh`, `fixtures/without-bar.html` | `tests/read-aloud/` | a 3-line path edit at the top of `run.sh` (marked) |
| — | `CLAUDE.md` gabe-artifact row: 1.3.1 → 1.4.0 + a clause | the doctor's version-parity invariant fails without it; `README.md` row: a few words |
| — | **`install.sh`: no edit.** It runs `cp -r skills/<name>/*`, so `assets/`, `references/` and `tools/` new files install by themselves | checked in the script, not assumed |

## What it costs (measured, 2026-10-02)

| | |
|---|---|
| New files in the suite | 7 (module 2 · demo · gate · battery · fixture · reference) + 1 directory (`references/`) |
| Lines | module 247 + 100 · gate 310 · battery 118 · demo 545 · fixture 534 · spec 116 — every file under the 800 budget; the module and gate are dense, like the reference build |
| Weight in every Artifact | 28.0 KB JS + 9.3 KB CSS pasted in (about 12.1 KB gzipped); the kit itself is 26 KB |
| New battery | `tests/read-aloud` — 42 assertions, **33.7 s** wall (11.1 s CPU), one headless Chrome. The doctor (46 batteries, about 5½ min) grows by one battery, ≈ +10% |
| The gate on a page | 44 checks, **8.2 s**; `--only` runs one group (the battery uses it so a mutant pays for what it proves) |
| Facts record | `docs/center/generators/write_facts.py --only read-aloud` records the new battery in seconds; the full sweep picks it up by itself (batteries are discovered, not listed) |
| Every future artifact | a summary per section (and per item) to author or generate, a `plain` line per item, and the voice inlined at build — real work on every page, not just wiring |

## Proved here (run, not read)

- Gate on `demo.html`: **44/44** (D-078: the demo's three decision items now carry an `example` and an `impact`, so the lint reads them; the gate stayed at 44 checks, the sentence check and the lint grew), three runs in a row before that. A first run failed 5 of 42: a favicon 404 the page did not cause, three measures split in time by a fast mock, and a cog test that ignored the chip row's own scroll clipping; a later battery run showed a pause check that depended on timing. All fixed in how the gate measures — no threshold was loosened.
- Gate on `fixtures/without-bar.html`: **FIRES — 27 of 31 checks fail**, exit 1.
- `bash run.sh`: **42 passed, 0 failed** (D-078 added five: an example holding an id and a path, and an impact of two sentences, fail the lint and the sentence count, and nothing else goes red). Besides the two above: a page with no sections SKIPs loudly; a summary with an id, a path, a symbol, a `{token}`, `undefined` and 8 sentences fails the five summary checks; CSS defects (bar static, copy hidden, a transition, 10px text) fail their four; five one-line module mutants (skip does not scroll, saved voice ignored, speed absolute, a whole-paragraph utterance, default not "always") fail the checks that name them; a page that does not name its fallback voice fails the three fallback rungs; a bar under the cog and a menu wider than the phone fail theirs; unguarded storage fails.
- Looked at (screenshots, 1280 and 390): the bar at rest, mid-reading with a lit chip and a marked summary, the open menu, in Catalog and Mission Console.
- Also run once by hand, outside the battery: the options `host`, `topHost`, `icons`, `words`, `bar: "playing"`, an item with only a plain line (read by it), an item with nothing (menu only).

## What speaks against it

1. **It bends H1/H2.** "Nothing else floats" becomes "…except a sticky bar"; it is in the flow, not fixed, and the gate checks that nothing else is `fixed`, but a bar that stays on screen is a floating contents bar in everything but name. He asked for it; the clause says so.
2. **It costs screen on every artifact**: about 83px on a wide screen and 86px on a phone (10% of 844) for a feature a dashboard nobody reads aloud does not need. D-076 says "all the time", so the draft has no opt-out.
3. **The voice is a Chrome online voice.** On Edge, Firefox on Linux or a phone the fallback reads in another voice (or none: then the bar is a plain contents bar and the page says why). The online voices send the text to Google (D-073 said so on the lab).
4. **The gate cannot hear.** `speechSynthesis` is mocked; audio from a real voice is proved only by his ear. A number *typed* into a summary is also invisible to it — that rule is the generator's.
5. **Two sets of lint rules** (the gate's, and each page generator's build-time stop) can drift; a shared JSON would fix that and was not built.
6. **A pasted module goes stale** in published pages, like the kit does; the cure is the same (retrofit rule), not a link.
7. **The reference builds keep their inline copies** until someone moves them onto the module — two sources of truth for a while (not done here: they are being edited in parallel).

## Open choices (his to rule; the draft's pick in brackets)

1. Previous/next step by **unit** (finest) or by section? [unit; a chip skips a whole section]
2. An item's summary length: **2 to 4** sentences? [proposal; the section's 3 to 6 is his]
3. Is the plain line ever spoken? [only when an item has no summary]
4. Where does a project's ruled voice live for artifacts built anywhere? [the builder inlines whatever it finds; the draft assumes the project's `voice.ruled.json`. A user-level `~/.claude` voice file, written once by the voice lab, would serve every project — then project file → user file → none]
5. A cog group "bar: always / only while a voice plays"? [none; `bar: "playing"` is a mount option and fails the gate's group 2]
6. The reference's "listen to every summary" button at the top. [dropped: the always-on bar's play does it]
7. Per-block "listen" buttons (dashed "my proposal" in the reference). [kept, solid]
8. The bar's share of a phone screen, at most 20%. [proposal; measured 10%]
9. A pause between items as long as between sections (`pauseSection`)? [yes; a separate `pauseItem` is one line later]
10. A deliberate change from the reference: it ignored the ruled `readTitles` and read titles only in a run; the module honours saved → ruled → "on during a run". [changed]
11. The H1 conflict he already named (a centred column on review pages vs the kit's left anchor): the demo wears H1 (left); not decided here.

## Not done, said plainly

- No run with a real voice or real audio; no run in Edge or Firefox.
- Options **not** exercised by the battery: `host`, `topHost`, `icons`, `storageKey`, `voiceKey`, `bar: "playing"` (the by-hand run above only; the gate treats `playing` as a failure by design).
- The review page and the voice lab were not touched, so they do not yet consume the module.
- The demo's content is about the bar itself; a real page (the review page) is the better retrofit test.

## Run it

```bash
export PLAYWRIGHT_DIR=<a node_modules/playwright-core>        # on this machine: docs/design/graft-adoption/spike/_build/node_modules/playwright-core
# WSL2 rule: one heavy job at a time
flock <heavy.lock> node verify-read-aloud.mjs demo.html                 # 44/44, ~8 s
flock <heavy.lock> node verify-read-aloud.mjs fixtures/without-bar.html # exit 1, FAILs
flock <heavy.lock> bash run.sh                                          # 42 assertions, ~34 s
```
