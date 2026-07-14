---
name: gabe-quip
description: "Sharpen HUMAN-FACING HTML surfaces with sarcastic, insight-carrying wit — page/section titles, hero hooks, callout and label asides that surface the pain point and name the obvious-but-unsaid, so a rendered page pulls the reader in. One lever in the engagement kit (diagrams · memes · progressive disclosure · labels · colors · styles). The joke carries the point never replaces it; punch-up; dosed. Proposes, never silently rewrites. Usage: /gabe-quip <rendered surface|authored hero/label> [title|hook|aside|pass]"
when_to_use: "Make a human-facing RENDERED surface (command-center page, docsite, HTML report, mockup) or the content that feeds it more engaging — a witty title, hook, callout, or label that names a pain point. Sibling of /gabe-meme. NOT for markdown consumed by skills/agents (README, SKILL.md, workflow guides, .kdbp, config) — those stay straight and functional."
metadata:
  version: 1.1.0
---

# Gabe Quip — sarcastic wit for the surfaces a human actually reads

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings. Full text: `../gabe-docs/references/execution-contract.md` (if missing, E6 — STOP).

## The intention (why this skill exists)

*A rendered page has one job: get read. Diagrams, memes, progressive disclosure, labels, and colors all fight for the reader's attention — and a sharp true line is another lever in that same kit. A well-placed sarcastic title or hook says the thing everyone already feels but nobody wrote down, and the reader leans in.* This is the prose sibling of `/gabe-meme` — the same oblique wit (the point lands in the reader's head), applied to the words ON a human-facing surface.

Wit is **one engagement lever among several** — diagrams (`/gabe-docs` + mermaid), memes (`/gabe-meme`), progressive disclosure (collapsing the heavy/optional), labels, colors, styles. Reach for a quip when a title/hook/label would hit harder as a sharp true line; reach for a sibling lever when a diagram or a collapse serves the reader better. The skill's whole job is judgment: which line is worth a quip, what the unsaid pain point is, and — hardest — when to shut up. It proposes; the human places.

## Scope gate (run FIRST, every invocation)

This skill touches only **surfaces a person reads in a browser** and the authored content that feeds them: the generated command-center pages, the docsite, HTML reports, mockups — and their heroes, section titles, callouts, empty-state lines, chip/label text. It is **NOT for markdown consumed by skills or agents** — `README.md`, `SKILL.md`, workflow guides, `.kdbp/` state, `center.config.json`, cards used purely as data. Those stay functional and straight. **If the target is a skill/reference/config file, STOP and say so** — point the human at the human-facing surface that markdown eventually renders into, if any.

## The four rules (the craft in one screen)

1. **The quip carries the point; it never replaces it.** The wit must make the real content land *harder*, not distract from it. Test: delete the fact and keep only the joke — if the joke still "works," it's decoration, and it's wrong. The best quip is useless without the truth it rides on.
2. **Materialize the implicit — name the elephant.** The sharpest lines say what everyone knows and nobody wrote: the pain point, the obvious trade-off, the "yes, we all pretend this is fine." A quip that surfaces a real unsaid thing beats ten clever-for-clever's-sake ones.
3. **Punch up, never at the reader, and dose with restraint.** Aim at the situation, the complexity, the system — never "you, who didn't understand." And ration it: ONE sharp line per view beats snark in every heading. Wall-to-wall wit reads as trying-hard and buries the signal. When unsure, cut it.
4. **Match the register to the surface.** A landing hero or a report intro can be bold; a data table, a stat strip, or a runbook stays mostly straight with at most one aside. The faster a surface must be scanned, the less wit it can carry. A joke must never slow down something someone reads under pressure.

## Modes

### `/gabe-quip <surface> title` — a sharper title/heading
Read the surface (or its authored source). Propose 3 title/heading options that are accurate first and witty second, each naming what the section actually delivers — not a pun that hides it. The human picks; you place.

### `/gabe-quip <surface> hook` — a hero/opening line that earns the read
Propose 2–3 hooks that surface the reader's real reason to care (usually a pain point). It must set up the content that follows, not stand alone as a zinger. This is the top-of-page lever (a page hero, a section lede, a card HANDLE).

### `/gabe-quip <surface> aside` — a well-placed witty label/callout
For a specific spot, propose an aside that names the obvious/implicit — a callout, a caption, an empty-state line, a chip/label. Show exactly where it goes and keep it removable — the surface must still stand if it's cut.

### `/gabe-quip <surface> pass` (or no mode) — a light wit pass
Read the whole surface and propose the 2–3 spots (not more) where a quip would most help — each with the line and why it earns its place. Flag any spot where wit would *hurt* (a stat strip, a warning, a dense table). The human approves per-spot; nothing is inserted unseen (E3).

## Guardrails

- **Human-facing surfaces only.** The scope gate is the wall: no wit in skill/reference/config markdown. If a surface is generated, the quip goes into the AUTHORED source (a card's hero line, a report's section title, a template string) so it survives regeneration — never hand-edit generated HTML.
- **Propose, don't silently rewrite.** Present options and placements; the human accepts each. Never swap a surface's voice wholesale on your own call.
- **Accuracy outranks the joke, always.** If the funniest line bends the fact, the fact wins and the line is rewritten or dropped.
- **Restraint is the feature, and it's one lever.** "Here and there" is the brief. If a view already carries a quip — or a diagram/meme is already doing the engaging — a second is usually no.
- **Stay in your lane.** Comprehension via analogy is `/gabe-lens`; the structural doc standard is `/gabe-docs`; image wit is `/gabe-meme`; disclosure/labels/colors are the generator's own styling. This skill is the *voice* lever on human surfaces — it sharpens, it doesn't restructure or explain.

The deeper craft — the patterns of a good quip, the anti-patterns that kill a page, register-by-surface dosing, and worked before/after examples — lives once in `references/quip-craft.md`.

## Output contract

Per invocation: a small set of options or placements (titles/hooks/asides/spots) for a HUMAN-FACING surface, each accurate-first and dosed for that surface's register, with the pain point it surfaces named — for the human to pick and place, into the authored source when the surface is generated. Never a silent rewrite; never a joke that costs a fact; never wit on skill/reference markdown. E7: report which spots were proposed and where they'd land.
