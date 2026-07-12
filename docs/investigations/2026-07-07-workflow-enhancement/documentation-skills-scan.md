# Documentation Skills Scan — 2026-07-08

**Purpose:** survey market documentation skills the suite could **learn from** (the operator
already has doc skills — `gabe-docs`, `gabe-docsite`, `gabe-teach` — and wants patterns to
borrow, not a rebuild). Gathered via web search + curated aggregator lists + GitHub search on
2026-07-08.

**Verification note (read this):** GitHub search surfaced **few standalone doc-skill repos** —
most named skills below are **marketplace *plugins*** catalogued by aggregator sites
(thicket.sh, agensi.io), not repos I could open and confirm. **Star counts are
aggregator-reported and unreliable** (several are implausibly identical — treat as "popular,"
not exact). So: treat these as **references to verify**, and lean on the *frameworks/standards*
(HADS, Diataxis, Keep-a-Changelog, ADR), which are solid regardless of any single skill.

---

## What you already have (baseline — don't rebuild)
- **Suite:** `gabe-docs` (documentation standards + Mermaid diagrams library), `gabe-docsite`
  (doc-site generator), `gabe-teach` (human knowledge consolidation), `gabe-arch` (architecture
  curriculum).
- **Environment:** `frontend-slides` (HTML presentations), `doc-updater` agent, `update-docs` /
  `update-codemaps`.

The gaps the market fills are **patterns/standards**, not missing generators.

---

## Market skills worth learning from (from thicket.sh's technical-writer list)

| Skill (plugin) | What it does | Maps to your | Learn-from |
|---|---|---|---|
| **hads** (HADS) | **Human *and* AI Documentation Standard** — one doc format that reads cleanly for both people and LLMs (2026 reality: docs get pasted into models / hit retrieval pipelines) | `gabe-docs` standards | ⭐⭐ strongest concept |
| **doc-coauthoring** | Long-form doc workflow: interview → outline → draft → review; extracts context from busy SMEs | `gabe-teach` (Socratic consolidation) | ⭐ pattern |
| **changelog-automation** | Changelog from commits following **Keep a Changelog** (Added/Changed/Deprecated/Removed/Fixed/Security); release-pipeline sync | `gabe-commit` / `gabe-push` | ⭐ |
| **openapi-spec-generation** | OpenAPI 3.1, **bidirectional drift-closing** between docs and the running API | Evidence Doctrine (backend/API proof) | reference |
| **architecture-decision-records** | ADRs in a structured format (context / decision / status / consequences) as searchable institutional memory | `gabe-debt` `DECISIONS.md` | ⭐ |
| **docs-review** | Audits doc PRs for style-guide compliance; catches voice/terminology drift | `gabe-review` / `gabe-commit docs-audit` | ⭐ |
| **postmortem-writing** | Blameless postmortems (timeline, root cause, actions) | optional — retro/incident | skim |

---

## Frameworks & formats to reference (standards, not skills — safe to adopt directly)
- **HADS — Human + AI Documentation Standard.** Write docs for a dual audience. Aligns with
  Ara's "agent-ergonomic docs" (V4) and the dual-purpose evidence idea. **Biggest conceptual
  gain for `gabe-docs`.**
- **Diataxis** — the four doc modes (tutorial / how-to / reference / explanation). A clean
  organizing taxonomy for `gabe-docs` + `gabe-teach` + `gabe-docsite`. (diataxis.fr)
- **Keep a Changelog** — Added/Changed/Deprecated/Removed/Fixed/Security; user-impact-first prose.
- **ADR** — context / decision / status / consequences (pairs with `gabe-debt`'s DECISIONS.md).

---

## Diagrams-as-code
- **Mermaid** — already in `gabe-docs`; keep it.
- **D2** — an alternative diagram-as-code language worth evaluating for larger/auto-laid-out
  diagrams (not confirmed as a packaged skill here — evaluate directly).
- **Excalidraw** — the **Excalidraw MCP is already available in this environment**; usable for
  hand-drawn-style architecture views. Candidate for "diagram from / synced with code."
- **Key technique everyone stresses:** generate/refresh diagrams *from* code so they don't rot.

---

## Cross-cutting takeaway for the investigation
- **"Doc drift is the enemy" — a *living-docs* principle that parallels the Evidence Doctrine's
  *living test set*.** Nearly every market skill's value prop is "keep docs in sync with code"
  (changelog from commits, OpenAPI drift-closing, ADRs as memory, docs-review catching drift).
  Combine with the Evidence Doctrine (evidence → docs): **docs should be generated/verified from
  evidence + code, not hand-maintained.** → candidate: a docs-freshness convention that aligns
  `gabe-commit`'s existing `docs-audit` mode to these patterns, plus **adopt the HADS framing** so
  docs serve human + agent (matches Ara and the dual-purpose evidence).
- **Interview-first authoring** (doc-coauthoring + Ara's "let Claude interview you") reinforces
  `gabe-teach`'s Socratic approach — a shared pattern worth strengthening, not a new skill.

## Top picks (learn-from, for the Fable run)
1. **HADS** — fold the dual human+AI framing into `gabe-docs` standards. Biggest conceptual gain.
2. **Diataxis** — adopt as the organizing taxonomy across `gabe-docs` / `gabe-teach` / `gabe-docsite`.
3. **Living-docs / drift-closing** — align `gabe-commit docs-audit` + changelog + ADR patterns so
   docs regenerate/verify from code + evidence (ties directly to the Evidence Doctrine).
4. **Diagram-as-code sync** — keep Mermaid; evaluate D2 and the already-available Excalidraw MCP,
   generated from code.

## Caveats
- Named skills are marketplace plugins, not confirmed standalone repos — **verify before
  adopting**; star counts are aggregator-reported and unreliable.
- The suite already has strong doc bones — the value here is **patterns/standards** (HADS,
  Diataxis, drift-closing, interview-first), not wholesale new skills.

## URLs / sources
- Agensi documentation skills — https://www.agensi.io/learn/best-claude-code-skills-documentation · https://www.agensi.io/skills/documentation
- thicket.sh technical writers — https://skills.thicket.sh/blog/best-claude-code-skills-for-technical-writers
- Diataxis — https://diataxis.fr
- Keep a Changelog — https://keepachangelog.com
- Generic doc-skill repos (GitHub) — https://github.com/pranavred/claude-code-documentation-skill · https://github.com/GGPrompts/ccguide
