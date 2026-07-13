---
name: gabe-docsite
description: "Publish documentation onto a self-contained, browsable HTML docs site — decide the right SECTION and disclosure level, wire it into the nav, and render it in the Cifra-styled shell with working diagrams. It PLACES and RENDERS; it does not fact-check the doc against the codebase (that is /gabe-docs, reviews, and the source-of-truth skills). Markdown is the source of truth; the HTML is generated. Usage: /gabe-docsite <what to document, or 'add the doc I wrote at docs/src/X.md'>"
when_to_use: "Publish or update a page on the generated HTML docs site — place a doc in the right section, wire the nav, render with working diagrams. Markdown stays the source of truth."
metadata:
  version: 1.0.0
  status: suite skill (generic, project-agnostic)
  scope: any project with a docs/ site
---

# gabe-docsite — publish a doc into a browsable HTML site

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

> **One line:** take a document (one you wrote, or one to author) and put it on the project's **HTML docs site** in the *right place* — the correct section, at the correct disclosure level — then render it so it displays anywhere, including straight off disk (`file://`). It is **not** responsible for whether the doc matches the code; accuracy/drift is owned elsewhere (`/gabe-docs`, reviews). Here we care about: *where does this belong, how is it structured, and does it render.*

## The site this skill operates

A **self-contained, dependency-free static HTML docs site** under `docs/site/`, viewable over `file://`, styled with the warm **Cifra** palette. Every page wears identical chrome (sticky sidebar nav + top breadcrumb + masthead), **generated** from markdown — never hand-written.

- **Source of truth** = markdown under `docs/src/*.md` + one **config** (`docs/docsite.config.py`) that declares the sections, the per-doc metadata, and the reading order.
- **Generator** = `skills/gabe-docsite/generator/build_docsite.py --config docs/docsite.config.py` → emits `docs/site/*.html` + the hub `index.html` + `assets/`.
- **Never hand-edit the generated HTML** — it is overwritten on every build.
- **Diagrams** render via a **locally vendored classic `mermaid.min.js`** (not a CDN, not an ES-module), so they display over `file://` with no network and no build-time browser.

## The four conventions (the heart of this skill)

These are what turn "dump the doc somewhere" into a site a reader can actually navigate. Apply them in order.

### 1 · Separation of concerns — placement by intent, not keywords
A doc has ONE primary job. Place it by that job, not by which words it contains:

- performance / architecture trade-off study → an **Analysis** section
- "we decided X because Y" → a **Decisions / ADR** section
- what-to-build / scope / a feature brief → a **Product** section
- flows / layout / component rationale → a **UX** section
- how-we-operate / runbook / retro → a **Process** section
- concept explainer / reference / change-log → whatever section owns that concern

If a doc genuinely serves two jobs, that is the signal it is **two docs** — split it (see convention 4). If no existing section fits and you will add several of this kind, propose a **new section** rather than forcing a misfit. **State your placement decision — which section, and why — before wiring anything.**

### 2 · Structure — the shell is generated, the content is authored
Never hand-roll a page. The masthead, sidebar, breadcrumb, hub cards, and footer come from the shell + config so every page is consistent and the nav is always correct. You author only the **markdown body** and the **config row**. Within a page: lead with the plain-language version, use numbered `##` sections, put scannable facts in tables (`:::note` for callouts, mermaid fences for diagrams). One idea per section; if a section sprawls past a screen or two of dense prose, it wants subsections or a split.

### 3 · Progressive disclosure — basic → advanced, across and within
Order is a teaching tool. Sections carry a **difficulty** (`basic` → `core` → `advanced`) and the hub lists them in that order, so a newcomer reads the first tier and stops — that is enough to *use* the thing; deeper tiers are for daily drivers and maintainers. Within a doc, the same gradient: the first section orients a beginner with no jargon; later sections add the mechanism, the edge cases, the rationale. **A reader should be able to stop at any point and have gained a complete, if shallower, understanding.** Never open a page with its most advanced content.

### 4 · The myopic split-decision — when to separate information
The hardest call is *when one page should become several*. Do not guess — run the **myopic test** (borrowed from `/gabe-myopic`): read the page as a short-sighted reader with a planning horizon of ~1.5 steps, who sees only what is on screen and holds one intention at a time. **Split when any of these fire:**

- **Overwhelm** — one page asks the reader to hold more than ~4 distinct ideas at once, or front-loads many decisions before any payoff. → split into a section of tiered pages.
- **Foresight demand** — understanding section C requires having internalized A and B two steps back, invisibly. → pull the prerequisite into its own earlier (basic) page and link forward.
- **Mixed altitude** — a single page swings between "what is this" and "here is the exact wording of the gate." → separate the concept page (basic) from the reference page (advanced).
- **Length** — a page runs many screens of dense, uniform material (a catalog, a long table). → keep it as ONE reference page but give it a "read this first" opener and in-page anchors, rather than making the reader scroll blind.

**Do NOT split** when the consequence is immediate and visible on the same screen, when the material is genuinely one linear argument, or purely for aesthetics. Splitting has a cost — a reader now has to navigate. Split to *reduce required foresight*, never to tidy.

State the split decision (keep as one page / split into a tiered section / extract a prerequisite) with the trigger that fired, before wiring.

## The procedure

### 1 · UNDERSTAND the doc + its goal
What IS it, and what is the reader meant to take away? Is the source written (`docs/src/X.md` exists) or must you author it? If authoring, write the markdown FIRST (see Source format). Ask the user if the intent is ambiguous — placement follows intent.

### 2 · DECIDE placement + structure (conventions 1–4)
Pick the section (1), confirm the page structure leads simple-then-deep (2–3), and run the myopic split-decision (4). Write the decision down before wiring.

### 3 · WIRE it — edit the config (append-only)
Add a doc entry to the chosen section in `docs/docsite.config.py`: `slug`, `source_md`, `title`, `nav_label`, `kicker` ("Category · Doc-type"), `summary` (hub-card line), `swatch` (a hex dot from the section's family). Create a new section entry if convention 1 called for one (with its `difficulty`, placed in basic→advanced order).

### 4 · GENERATE + VERIFY (the gate)
```
python3 skills/gabe-docsite/generator/build_docsite.py --config docs/docsite.config.py
node   skills/gabe-docsite/tools/diagram-compliance.mjs        # file:// diagram gate
```
- The build must complete with the new page in the Cifra shell, its nav entry under the right section, the breadcrumb resolving, and the hub card present.
- **The compliance gate must pass (exit 0):** it loads every page over `file://` and asserts each diagram is a rendered, sized `<svg>` showing no raw mermaid source. This is the guard against the "diagram renders as raw text over `file://`" class of bug — a real regression the CDN/ES-module approach silently causes.
- Spot-check headless (`file://`, ~1340×1000): 0 pageerror.

## Source format (the converter is intentionally small)
No-dependency markdown → HTML. Supported subset: ATX headings (`##` auto-numbered), `-`/`1.` lists, `- [ ]`/`- [x]`, GitHub tables, `[text](url)`, `---`, inline + fenced code, bold/italic, blockquotes, the `:::note [Label] … :::` callout directive, and mermaid fenced code blocks. If a doc needs richer interactivity than this, that is a signal it is a *specialized* build, not a prose page — flag it to the user.

## Guardrails
- **Placement + rendering only.** Do NOT fact-check the doc against the code — accuracy/drift is owned elsewhere. Mention a glaring contradiction; do not fix it here.
- **The Testing Command Center is not this site.** `docs/site/center/` is a specialized machine-truth build owned by `/gabe-feature` — never place or edit pages there.
- **Markdown is the source of truth** under `docs/src/`. Never hand-edit generated `docs/site/*.html` (overwritten every build).
- **Never recolor the Cifra palette** or hand-roll a page — reuse the shell.
- **Diagrams: vendored classic mermaid only.** Never a CDN URL, never `type="module"` (breaks over `file://`).
- **Commit via `/gabe-commit`** — the generated HTML, the source markdown, and the config edit go together.

## Setup for a project that has no site yet
Copy `skills/gabe-docsite/generator/docsite.config.example.py` → `docs/docsite.config.py` and edit `SITE` + `SECTIONS`. Put markdown in `docs/src/`. Run the generator. The `assets/` (Cifra `site.css` + `site.js` + vendored `mermaid.min.js`) are copied from the skill on every build.
