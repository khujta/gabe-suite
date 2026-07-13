# Feature spec — the binding intentions behind /gabe-feature

The FORMAT authority is the project's validator (`scripts/_center_data.py` — it
fails loud on referential errors: unknown entities, unmatched globs, missing
card sections). This file records the INTENTIONS the validator cannot check,
plus the bootstrap for new projects. Never duplicate the schema here.

## The editorial line (the whole system in two sentences)

**Machine sources assert; authored artifacts translate.** The config maps
(which sources belong to which feature), the card explains (what/why/whom/
is/is-not/decided), the narration describes (what the evidence shows) — none
of them may ever state a count, a pass/fail, or a coverage number: those come
only from junit / run-status / coverage / OpenAPI at build time, so they can
never drift from the truth.

## The card, section by section (what GOOD looks like)

| Section | Intention | Trap to avoid |
|---|---|---|
| HANDLE | one line a stranger repeats correctly (≤14 words) | feature-name restating |
| WHAT & WHY | before → after → why it matters; close with ONE physical-analogy line (house voice) | implementation detail; multiple analogies |
| FOR WHOM | who feels it, in their words | "users" |
| FLOWS | the user flows it lives in; journey links resolve at render | route lists |
| IS / IS NOT | shipped behaviors / deliberate non-goals + known gaps, plainly | IS NOT as excuses; hiding gaps |
| DECIDED | D-refs + one-line rulings that shaped it | re-arguing decisions |
| ENTITIES | ids from config `entities[]` (validator enforces), ORDERED BY PRIMACY — the FIRST entity is the feature's home cluster on the hub/docs groupings, and it must be the MOST SPECIFIC entity the feature is about ('user' is almost never primary; a photos feature homes under photos, not under the person holding the camera). The list MAY grow: a genuinely new domain entity is added to config `entities[]` (id + label + a NEW distinct color) in the same authoring pass — part of the card review; the validator's hard-fail is the prompt, not a wall | 'user' first by default; inventing entities inline; splitting hairs (a variant of an existing entity is that entity) |
| ANGLES | one REASON line per absent angle; "not yet mapped/run", never 'untested'-sounding words; notes on partial angles render as footnotes | justifying instead of recording |
| DIAGRAM USERFLOW / DATAFLOW / WORKFLOW | flowchart / sequenceDiagram / stateDiagram-v2 — types, node shapes, and the change-highlight rule are BINDING per `gabe-docs/references/docs-spec.md` §Mermaid (shapes-per-operation table + `classDef changed` / sequence `rect` blocks; validate highlight targets — mermaid silently ignores misses) | drawing the whole system; highlighting everything |
| REVIEWED | date + who, stamped ONLY after the human reviewed the BUILT pages | stamping a TODO-free draft |

## Narration (proof manifests)

Authored by the session that creates the evidence, in the manifest's
`narration` block: `story` (2–3 sentences, anyone), `capture_story` (what the
video shows), `legs` (one plain sentence per leg — each leg is a claim, its
shots are the proof). Describes, never asserts. Video custody: capture output
is machine-local and never committed (stable name `latest.mp4` via the journey
runner); committed proof = the curated shots. The pages state both.

## Backfill tiers

- **full** — recent work: evidence exists or is one run away. Everything.
- **card-only** — history: registry + card; ANGLES carry why evidence isn't
  demanded of the past. No fake proof, ever.
- **skip** — dropped/obsoleted work: one line in `backfill_dispositions`
  with the reason. A skip with a reason beats a hollow page.

Queue denominator honesty: `next_feature.py` covers the CURRENT PLAN.json
generation; prior-plan phases are a separately-agreed pass.

## Bootstrap (a project without a center — e.g. gastify at its window)

Copy from the reference implementation (gustify), then adapt the config:
`scripts/{build_center_docs,check_center_links,scaffold_feature,curate_proof,next_feature}.py`,
`scripts/{_center_data,_center_pages,_center_matrix,_center_docs}.py`,
`scripts/refresh_center.sh`, `docs/site/center/assets/` (center.css + icons),
`docs/site/center/center.config.json` (EMPTY features[]; project's own tiers/
areas/entities/future_stations). Wire the refresh commands to the project's
test runners. This is a COPY, priced as one — real generator promotion to the
suite is D7, decided at n=2 evidence, not assumed.

## Wave-2 notes (recorded, not built)

gabe-commit runs the crawl gate when `docs/site/center/**` is staged · KDBP
schema enrichment (D6) absorbs the feature registry · diagram library
(`center/diagrams/*.mmd` bases + per-feature highlight refs) when a second
feature shares a topology.
