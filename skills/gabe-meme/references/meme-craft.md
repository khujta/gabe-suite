# Meme craft — the binding catalog and gotchas behind /gabe-meme

> The one deep home for the template engine. SKILL.md carries the four rules and
> the pipeline and points here; nothing below is restated there. Provenance: this
> is the transferable core of the Cifra·Chile `meme-hilo` skill (the memegen.link
> engine + the oblique method), with that project's editorial-legal luz system,
> `MemePanel.tsx`/`hilos` wiring, and per-article changelog dropped. The insights
> below were each a real fix in that pipeline (dates kept as scars, not history).

## §Setup — the per-project config (seeded on first use)

Tone is per-project; `/gabe-meme` seeds it once and reads it every run after. The
setup gate writes `meme.config.json` into the output dir:

```json
{
  "tone": "oblique-dark",
  "tone_note": "the voice in the human's own words — one line, editable by hand",
  "output_dir": "docs/memes",
  "real_subjects": true
}
```

- `tone` — one of the menu ids below (or a custom id the human named via "Other").
- `tone_note` — a free line the human can edit; it goes verbatim into the writing
  prompt's tone slot, so the voice stays theirs even if the menu id is coarse.
- `output_dir` — where PNGs (and this config) live. Default `docs/memes/`.
- `real_subjects` — `true` when the project memes real people/entities (Ethics gate
  engages hard, captions carry sources); `false` for abstract/dev-only humor (still
  punch-up, but no legal-standing classification). Defaults `true`.

**The tone menu** — present each with its example as an AskUserQuestion preview, all
on ONE shared subject ("*shipping a risky change on a Friday afternoon*") so the
human feels the tonal difference, not a content difference:

| id | Voice | Example on the shared subject |
|---|---|---|
| `oblique-dark` | Satirical tangent, punch-up, the ported house voice — the edge is in what it doesn't say | This Is Fine — "just a small change / before the weekend" |
| `dry-deadpan` | Understated, self-aware engineering humor; flat affect | Futurama Fry — "not sure if it's done / or if I stopped looking" |
| `wholesome` | Earnest, celebratory, punches nowhere; gentle and sincere | Success Kid — "shipped on Friday / and nothing broke" |
| `absurdist` | Surreal non-sequitur; the humor is the wrongness of the frame | Doge — "such deploy / very friday / wow consequences" |

If the human picks "Other", capture their description as `tone_note` and set `tone`
to a short slug of their own words. The four ids are starting points, not a fence.

## §Writing — the oblique method

The meme goes by the tangent of the fact. Say the normal-sounding thing; let the
reader supply the sinister part. The punchline lands in their head.

| Direct (weak) | Oblique (strong) |
|---|---|
| "They colluded for 10 years" | "Meet once a month for coffee" |
| "Nobody went to prison" | "Wait 10 years for everyone to forget" |
| "They set how much to produce" | "We're just deciding how much chicken you get to buy" |

**The generation prompt** (adapt the subject; keep the constraints):

```xml
<system>
You write OBLIQUE memes: visual metaphors that translate a subject into implicit,
dark-or-dry humor. FUNDAMENTAL RULE: the meme never says directly what happened.
It goes by tangent — something that sounds almost normal or innocent, but a second
of thought reveals the edge. The punchline is in the reader's head, not the meme.
Test: if it reads clear without thinking, rewrite it more oblique.
ETHICAL LIMIT (non-negotiable): punch up, never down. Never assert a crime as fact
about a named real person without a final conviction — satirize the conduct or the
entity; the un-convicted go outside the punchline or as attributed suspicion.
Tone: {TONE_NOTE from the project meme.config.json — e.g. "satirical tangent, the
edge is in what it doesn't say"}. Punch-up only, always. Max ~10 words per field.
Distinct templates (no repeats within a set).
</system>
<context>Subject: {TITLE} · Key facts: {FACTS} · Most absurd angle: {ANGLE}</context>
<task>Generate {N} meme concepts. Each: position, template, exact text per field,
and one line naming the oblique connection the reader makes.</task>
```

## §Templates — the catalog (memegen.link, no auth)

API: `https://api.memegen.link/images/{id}/{text1}/{text2}[/{text3}/{text4}].png`
Before building a URL, GET `https://api.memegen.link/templates/{id}` and read
`lines` + `example` — field order is not always intuitive.

| Template | id | Lines | Best for | Persona (who speaks/acts) |
|---|---|---|---|---|
| Drake | `drake` | 2 | Inverted priority: rejects the right thing / approves the wrong | Judge: chooses badly |
| This Is Fine | `fine` | 2 | Casual denial as it all burns; nobody acts | Victim/system: ignores danger |
| Galaxy Brain | `gb` | 4 | Escalating absurdity — each panel worse | Narrator: exposes the twisted logic |
| Gru's Plan | `gru` | 4 | Plan backfires (panels 3 & 4 identical, shocked) | Actor: plan fails by design |
| Daily Struggle | `ds` | 3 | Impossible dilemma: two buttons (t1=left, t2=right) + sweating (t3) | Actor: paralyzed |
| Roll Safe | `rollsafe` | 2 | "Can't go wrong if…" (false sinister logic) | Perpetrator: self-justifies |
| Panik Kalm Panik | `panik-kalm-panik` | 3 | False calm: good news annulled by reality | Anyone: false hope crushed |
| Anakin & Padmé | `right` | 4 | "You're going to X, right?" / growing silence = dread | Victim: senses betrayal |
| Scooby Doo Reveal | `reveal` | 4 | Unmasking: "it was X all along" | Narrator: exposes the hidden |
| Who Killed Hannibal | `wkh` | 3 | Blame another for what you did (t1=victim, t2=blamed, t3=cynical question) | Perpetrator: blames another |
| Same Picture | `same` | 3 | Two "different" things that are identical | Narrator: reveals equivalence |
| Epic Handshake | `handshake` | 3 | Two actors agreeing on something dark (t1/t2=arms, t3=the accord) | Two actors: dark accord |
| Woman Yelling at Cat | `woman-cat` | 2 | Outrage vs. cynical calm | Victim vs. perpetrator |
| Hide the Pain Harold | `harold` | 2 | Smiling through pain, passive-aggressive | ALWAYS the citizen/victim — never the perpetrator |
| Change My Mind | `cmm` | 1 | Provocative thesis challenging the reader (1 line, big) | Narrator: plants a thesis |
| Futurama Fry | `fry` | 2 | "Not sure if X or Y" — squints at ambiguity | Observer: suspects something |
| Spider-Man Pointing | `spiderman` | 2 | Mutual blame/equivalence | Two actors: point at each other |
| Disaster Girl | `disastergirl` | 2 | Smiles at a disaster they caused/benefit from | Perpetrator/beneficiary |
| Success Kid | `success` | 2 | Ironic "win" — something that should've been normal | Narrator: celebrates the minimum |
| Bad Luck Brian | `blb` | 2 | Unjust bad luck, did nothing wrong | ALWAYS the victim — never the perpetrator |
| Doge | `doge` | 3-5 | Scattered absurd remarks ("such X / very Y / wow Z") | Ironic narrator |
| One Does Not Simply | `mordor` | 2 | "One does not simply…" — looks easy, is impossible | Narrator: warns of difficulty |
| Stonks | `stonks` | 2 | Celebrate a "win" that's actually a catastrophe | Perpetrator: thinks they won |

Templates NOT on memegen.link (Clown, UNO Draw 25, Expanding Brain…) need the
imgflip API — a free account, `IMGFLIP_USER`/`IMGFLIP_PASS` in env. memegen.link
is the default because it needs no auth.

## §Persona — the matching rule (Rule 4, in depth)

Read the meme's text and ask "who is saying this?" If the answer doesn't match the
template's persona, it's mis-placed.

| Persona | Text must come from… | Example |
|---|---|---|
| Victim (`harold`, `blb`, `right`) | the affected people, the citizen, the debtor | Harold: "Your fund loses 12% / but the fee is charged anyway" |
| Perpetrator (`rollsafe`, `stonks`, `disastergirl`) | the company, the official, the system | Rollsafe: "It's not corruption if only one person is jailed" |
| Narrator (`cmm`, `gb`, `doge`, `mordor`, `same`) | external, ironic, objective observation | CMM: "The funds carry the risk / change my mind" |
| Two actors (`handshake`, `ds`, `spiderman`) | both sides of the conflict | Handshake: "Promise relief" + "Execute seizures" = "The State" |

The classic error: putting the perpetrator's confession in a victim's mouth (Harold
with "Scam a million people / suspended sentence" frames Harold AS the scammer —
wrong; Harold is the victim smiling through pain).

## §Encoding — URL gotchas (each a real bug)

Use the literal URL-encoded character, NOT memegen's `~` escapes for symbols
(`~d`/`~p` render as literal "~D"/"~P", they do NOT become `$`/`%`).

| Char | In the URL | Note |
|---|---|---|
| space | `_` | underscore |
| `$` | `%24` | literal — never `~d` |
| `%` | `%25` | literal — never `~p` |
| `¿` | `%C2%BF` | Spanish opening question |
| `?` | `%3F` or `~q` | both work |
| newline | `~n` | but avoid it in small panels (see below) |
| literal `_` | `__` | double underscore |
| `ñ` | `%C3%B1` | the raw byte sometimes drops the tilde ("ANO" for "AÑO") |

Download and **Read the PNG** to confirm rendering before integrating — always.

## §Panels — brevity for 4-panel templates (`right`, `gb`, `gru`, `reveal`)

Small panels; text competes with the image. **Max ~5 words per panel.** Do NOT use
`~n` in small panels — the API auto-wraps better than a forced break (which shrinks
the font). Patterns: `right` = action → naïve expectation → "right?" → "right?"
(dread); `gru` = panels 3 & 4 identical; `gb` = each panel escalates.

## §Legibility — what to avoid (tested and replaced)

- **Legible text beats a clever template.** Dark/busy backgrounds (`astronaut`
  "Always Has Been", `exit` "Left Exit 12") drown white text at small sizes. Prefer
  flat, high-contrast: `cmm`, `fry`, `wkh`, `woman-cat`, `same`.
- **Local recognition matters.** A template the audience doesn't recognize doesn't
  fire (Pepperidge Farm `remembers` was dropped for a Chilean audience). Same bar
  anywhere: if your reader won't recognize the format, don't use it.

## §Ethics — the full line (read when a real entity is named)

Punch-up is the spine; these keep it clean when real people/entities appear. The
Cifra·Chile original layered a jurisdiction-specific legal-status system on top of
this — dropped here as project-specific; the portable core is:

- **Satirize conduct, systems, and entities with a settled record with full edge.**
  A company with a final ruling, or a person with a final conviction, is safe ground
  — stick to the thing they were actually found to have done.
- **The un-convicted stay out of the punchline.** For someone accused / under
  investigation / acquitted, do NOT assert the crime as fact — satirize the
  suspicion or the system ("according to the prosecutor…"), and the caption carries
  the disclaimer ("case in process · no conviction"). An administrative fine is not
  a prison sentence; don't read it as one.
- **When in doubt, raise the abstraction.** Instead of naming the person, satirize
  the maneuver or the entity — just as sharp, and it stops naming the un-convicted.
- **Two literal-reading filters** (assume part of the audience misses the irony and
  reads it straight): (A) *False safety* — the literal read must not tell the reader
  they're safe / need do nothing, especially on unresolved matters. (B) *Individual
  action* — if the actor is an ordinary person, rewrite so it can't read as
  something a reader should personally do (or as blaming the victim); if the actor
  is clearly the powerful, the sharp second-person IS the satire and stays.
- **Framing hygiene.** A verb/adjective with animus in the caption or alt-text can
  read as a verdict even when the base fact is true — truth doesn't save the epithet.
  Report the fact; don't editorialize the person.
- **The caption is the anchor, not decoration.** It always names the official source
  of the implied fact; for open/administrative matters it also carries the
  disclaimer. Oblique meme + sourced, disclaiming caption = protected satire.

Pre-render checklist: mental-step required? · punches up? · implied facts verified? ·
real entity's standing classified? · no crime asserted as fact against the
un-convicted? · no administrative fine read as a criminal conviction? · no personal/
sexual/ethnic attack? · caption carries source (+ disclaimer if open)? · no template
repeated in the set? · each template's persona respected?
