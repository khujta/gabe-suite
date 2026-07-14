---
name: gabe-meme
description: "Generate oblique memes as visual metaphors — the punchline lands in the reader's head, never on the image. Picks a template whose PERSONA fits, writes text that goes by tangent (a mental step from what-it-says to what-it-means), renders via memegen.link (no auth), and verifies the rendered PNG before shipping. Punch-up only. Usage: /gabe-meme <subject or thread> [count]"
when_to_use: "Make a meme (or a set) for a doc, post, thread, or presentation — oblique/satirical visual metaphors from a real subject, rendered to PNG. Not for emoji-composed images (that is not a meme); not for photorealistic art (use an image model)."
metadata:
  version: 1.1.0
---

# Gabe Meme — oblique memes as engagement metaphors

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings. Full text: `../gabe-docs/references/execution-contract.md` (if missing, E6 — STOP).

## The intention (why this skill exists)

*A meme is an oblique derivative of a subject: the facts come from the real thing, but the meme NEVER states them directly. It works by tangent — it says something that sounds almost normal, and the reader connects it to what's actually going on. The punchline isn't in the meme; it's in the reader's head.* Ported from the Cifra·Chile `meme-hilo` pipeline — this is the transferable craft (the oblique method + the template engine), with the Chile-specific editorial/legal apparatus and its React `MemePanel`/`hilos` wiring left behind.

## Setup gate (run FIRST, every invocation)

Tone is a per-project choice — dark-oblique satire and dry dev-deadpan want
different words for the same fact — so it is seeded once per project and read
every run after.

1. **Look for `meme.config.json`** — check `docs/memes/`, then `public/memes/`,
   then the repo root. If it exists, read it: `tone` + `tone_note` steer every
   concept (thread them into the writing prompt, step 2), `output_dir` is where
   PNGs land, `real_subjects` says whether the Ethics gate engages hard.
2. **If it does NOT exist, this is first use here — seed it, do not guess the
   tone.** Ask the human with AskUserQuestion, offering the tone menu from
   `references/meme-craft.md` §Setup — present each option with its concrete
   example meme (as option previews) so they feel the difference on one shared
   subject; "Other" lets them describe their own voice. Then WRITE
   `<output_dir>/meme.config.json` (default `output_dir` = `docs/memes/`;
   `real_subjects` defaults true so ethics stays on unless the project is clearly
   abstract/dev-only) and proceed to the pipeline. One-time; later runs read it
   silently. The schema lives once in `references/meme-craft.md` §Setup.

## The four rules (the craft in one screen)

1. **A meme is a riddle, not a summary.** It never says literally what happened. The darkness/humor comes from what it does *not* say. **The mental-step test:** if the reader gets it without thinking, it's mis-calibrated — the right meme earns a "wait… oh. *oh.*"
2. **Implicit beats explicit.** "Fined US$55M / damage US$1.5B" *informs*; "pay the fine / with the cartel's own profits / and keep the change / repeat" *disturbs*. Say the normal-sounding thing; let the reader supply the sinister part.
3. **Punch-up, never punch-down.** Satire targets power (companies, institutions, systems), never the victim. Don't state a crime as fact about a named real person who has no final conviction — satirize the conduct or the entity instead, and anchor the caption to a source. (The full ethical line is in `references/meme-craft.md` §Ethics — read it whenever real people or entities are involved.)
4. **Respect the template's persona.** Every template has a voice (who speaks / who acts). Victim templates (`harold`, `blb`) must never carry the perpetrator's words; perpetrator templates (`rollsafe`, `stonks`) must never speak for the victim. Wrong persona destroys the joke. (Catalog with per-template persona: `references/meme-craft.md` §Templates.)

## The pipeline (default mode: `/gabe-meme <subject> [count]`)

1. **Read the subject.** Extract the 3–5 key facts, the actors involved (and — when they're real — their standing, so the meme knows what it can assert), and the single most absurd/ironic angle. If the subject is a file/thread, read it in full first (E1).
2. **Draft oblique concepts.** For each meme: pick a template (never repeat one in the same set), write text that goes by the TANGENT of the fact **in the project's `tone`** (from the config), apply the mental-step test, and cap each text field at ~10 words. Use the generation prompt in `references/meme-craft.md` §Writing (drop the config's `tone`/`tone_note` into its tone line).
3. **Present the concepts to the human** as a table (position · template · exact text per field · the oblique connection the reader makes). They approve, edit, reject, or swap templates — authored satire is a human call, never auto-shipped.
4. **Render + verify.** Build the memegen.link URL (mind the URL-encoding table — special chars are literal `%`-encodes, NOT the `~d`/`~p` escapes), confirm HTTP 200, download to the target dir, and **Read the PNG to confirm it rendered right** before integrating (E2 — a field in the wrong panel silently kills the joke). Never mark a meme done unseen.
5. **Report where** (E7): the PNG paths + one line per meme (template + the connection it makes). Integration into a page/component is the caller's job — this skill produces verified images and their captions.

## Ethics gate (run before rendering, whenever a real entity is named)

Punch-up · don't defame · verify the implicit facts · caption carries the source. Do not state a crime as fact about a real, un-convicted person; when in doubt, raise the abstraction and satirize the conduct/entity, not the individual. Full tiers and the literal-reading filters are in `references/meme-craft.md` §Ethics. A meme that fails the gate is rewritten (to a consequence) or re-templated — it does not ship.

## Output contract

Per request: N verified meme PNGs (each rendered, Read-confirmed, non-repeating templates, in the project's tone), each with a one-line caption naming its source when a real subject is involved, plus the concept table the human approved. On first use in a project, also a seeded `meme.config.json`. No unseen renders, no punch-down, no template used against its persona. The setup schema + tone menu, template catalog, URL-encoding gotchas, brevity/legibility rules, and the writing prompt live once in `references/meme-craft.md`.
