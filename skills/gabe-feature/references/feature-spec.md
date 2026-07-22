# Feature spec — the binding intentions behind /gabe-feature

> The one deep home for the card contract. SKILL.md carries intention + flow
> and points here; nothing below is restated there. Cards are PER ENTITY:
> `cards/<slug>.md`, one per slug registered in `adoption.json` (the entity
> registry — D123; an `entities.<slug>` config key the registry does not know
> aborts the build). Diagram headings (exact): `# DIAGRAM USERFLOW` ·
> `# DIAGRAM DATAFLOW` · `# DIAGRAM WORKFLOW` — any other heading renders
> nowhere and the gate flags it. One card renders the entity's feature page
> under the invariant five-tab bar (Overview · Code · Tests · Evidence · Risk).

The FORMAT authority is the generator suite: `_center_data.py`'s `parse_card`
fails loud on a missing or empty required section, `build_center_a3.py` aborts
on an unregistered entity slug, and `check_center_links.py` WARNs on
card-quality drift (no canonical diagrams, no reviewed stamp, TODO markers,
narration gaps). This file records the INTENTIONS the validators cannot check.
Never duplicate the schema here.

## The editorial line (the whole system in two sentences)

**Machine sources assert; authored artifacts translate.** The config maps
(which tests, code files and proof sets belong to which entity), the card
explains (what/why/whom/is/is-not/decided), the narration describes (what the
evidence shows) — none of them may ever state a count, a pass/fail, or a
coverage number: those come only from junit / run-history / coverage / archmap
at build time, so they can never drift from the truth.

## The one binding file — center.config.json (shape, stated once)

- `project` — `name` · `display_name` · `lang` (page chrome only).
- `paths` — `center` · `kdbp` · `results` · `proof` · `e2e_spec_glob` ·
  `mermaid_renderer`: every loader resolves from here; nothing is hardcoded.
- `corpora[]` — one per test suite: `key` · `runner` · `kind` · `kind_detail` ·
  `tag_class` · `kpi_detail`. Drives junit loading, the estate totals, the
  corpus matrix, the per-entity Tests tab, and run-history sources.
- `e2e` — runner + the local-only / coverage-gate notes the prose interpolates.
- `commands` — `junit[]` · `coverage[]` · `e2e[]`: the shell lines
  `scripts/refresh_center.sh <mode>` runs, one line each, from the repo root
  (`regen` runs none).
- `leaf_reports[]` · `foundations[]` · `code_layers[]` · `build_architecture`.
- `entities` — a DICT keyed by adoption.json slug: `test_rx` (required — it
  claims test files into the corpus matrix even before a section is built),
  and once the section is adopted `proofs[]` · `code{layer: [globs]}` ·
  `models[]`.

Names live in the REGISTRY, not here: display names come from adoption.json
rows (`display_name`, with `label` as the pre-rename fallback); entity colors
come from the generator maps. Config that names or colors things is drift
waiting to render.

## The card, section by section (what GOOD looks like)

Required — `parse_card` refuses a card missing any of these (or with one empty):

| Section | Intention | Trap to avoid |
|---|---|---|
| HANDLE | one line a stranger repeats correctly (≤14 words) | feature-name restating |
| WHAT & WHY | before → after → why it matters; close with ONE physical-analogy line (house voice) | implementation detail; multiple analogies |
| FOR WHOM | who feels it, in their words | "users" |
| FLOWS | the entity's flow registry — grammar below (§Flow coverage) | route lists; multi-word keys |
| IS / IS NOT | shipped behaviors / deliberate non-goals + known gaps, plainly | IS NOT as excuses; hiding gaps |
| DECIDED | D-refs + one-line rulings that shaped it | re-arguing decisions |

Optional — rendered where present:

- `# LENS` — LEADS the feature page (`handle:` · `is:` · `is not:` ·
  `decides:` · `analogy:` · `map:` as `X → Y` rows · `confuse:` · `limits:`);
  the full card folds behind it — a reader who only reads the lens still
  leaves with the entity's shape.
- `# CODE` — the Code tab's authored outro, rendered at the END of the tab
  (the machine half — endpoints · code map · data model — renders from
  archmap, never from prose).
- `# RISKS` — grammar `SEV · status · Kind · what is at stake · detail`
  (older 3/4-field forms still parse); an unparseable line renders MALFORMED,
  never dropped. A severity with no consequence is a number nobody can argue
  with.
- `# ANGLES` — per-kind INTENT only (`- <kind> — what it is for on this
  entity`); hand-written counts are FORBIDDEN (the card says WHAT FOR; the
  machine says HOW MUCH). The open moves themselves are machine business: the
  Action Ledger derives every gap — missing/red/skipped corpus, e2e, coverage
  slice, walk, deployed probes, proof and flow gaps, the structure budget —
  with its close-price AND its keep-open-price, ripeness read against
  BEHAVIOR.md's maturity. The card never restates a row of it.
- `# NOT CARRIED FORWARD` — dropped legacy claims with one-line reasons
  (visible on the page).
- `# DIAGRAM USERFLOW / DATAFLOW / WORKFLOW` — flowchart / sequenceDiagram /
  stateDiagram-v2 — types, node shapes, and the change-highlight rule are
  BINDING per `gabe-docs/references/docs-spec.md` §Mermaid (shapes-per-
  operation table + `classDef changed` / sequence `rect` blocks; validate
  highlight targets — mermaid silently ignores misses).
- `# REVIEWED` — date + who, stamped ONLY after the human reviewed the BUILT
  pages; the gate warns on its absence (a TODO-free draft is not a reviewed
  card). Supersede flow: a material rewrite after a walk flips the tracker
  back to `awaiting-approval` — **a walk approves a SCOPE, not a slug.** The
  SAME stamp closes the PLAN loop (E5): the phase's `Center` cell → ✅ in
  PLAN.md + PLAN.json (SKILL.md §Modes step 5).

Feature pages are generated from registration data (config + registry + card +
machine sources) — per-entity page code is a defect.

## Flow coverage (card # FLOWS ⟷ proof-set manifests)

The card's `# FLOWS` section is the entity's flow registry (authored once);
each proof set is classified against it from its own `manifest.json`.
Derived, never interviewed.

**Card grammar** — one line per flow:

    - <key> [★] → <description>

`<key>` is the flow's ONE-word name, lowercase (backticks allowed); `★` (or
`(golden)`) after the key marks the flow as part of THIS entity's GOLDEN PATH —
the authored judgment of which flows are the main journey, so the build can
rank an unproven golden flow above an ordinary gap. A line that does not parse
(multi-word key, missing `→`) is surfaced as MALFORMED — a build warning, a
coverage-note line, and an Action-Ledger move — never silently dropped: a
quietly shrunken denominator makes the coverage note lie about the card.

**Manifest keys** — in the set's `manifest.json`:

- `role:` — one of `principal` (the main workflow) · `edge` (guards ·
  degraded · destructive paths) · `reference` (design-lab fidelity — NOT
  workflow proof) · `supporting` (context around the main flows).
- `flows:` — a LIST of keys the card's `# FLOWS` actually declares.

Explicit fields win. Absent fields are INFERRED from the set's identity
(name · feature · proof_form — never from legs/story: one degrade leg must not
flip a journey set to edge) and labeled "inferred". A MALFORMED explicit
signal — a `role:` outside the four, a `flows:` that is not a list, a key the
card does not have — renders the set UNCLASSIFIED with its reason: guessing
over a broken declaration is how a typo'd reference set becomes golden
coverage. A reference set never covers a flow: what the screen was built to
match is not proof of the workflow.

**Coverage semantics** — a flow is COVERED when a principal/edge/supporting
set matches it; inferred matches count toward coverage, and the topline says
how many covered flows rest on inference alone ("confirm with `flows:`"). A
flow no classified set covers is UNPROVEN — a placeholder row and an action
item ("the golden path has no proof" is a finding, not a blank); a set the
build cannot classify is a clarification move ("add `role:`/`flows:` to its
manifest"), never a silent guess.

## The verification changelog (machine — run-history.jsonl)

Run results are replaced on every refresh BY DESIGN; the center's durable
memory is `run-history.jsonl`, written by the builder itself: one line per
source per build whose totals MOVED (committed, capped at 50), rendered as the
Tests-station changelog. A regen that changed nothing adds nothing. Nothing
here is authored — there is no commit list to maintain; per-file corpus entry
dates come from git at build time.

## Narration (proof manifests)

Authored by the session that creates the evidence, in the manifest's
`narration` block: `story` (2–3 sentences, anyone) + `legs` (one plain
sentence per leg — each leg is a claim, its shots are the proof). Describes,
never asserts. Classification (`role:`/`flows:`) rides the same manifest —
§Flow coverage above; `/gabe-feature curate` authors both and registers the
set in `entities.<slug>.proofs[]`. Video custody: recordings are
machine-local and never committed; committed proof = the curated shots. The
pages state both.

## Backfill tiers

- **full** — recent work: evidence exists or is one run away. Everything.
- **card-only** — history: registry block + card; ANGLES carry why evidence
  isn't demanded of the past. No fake proof, ever.
- **skip** — dropped/obsoleted work: the disposition is recorded where the
  queue reads it — a phase marks its PLAN `Center` cell ⏸ (deferred) or ⚰️
  (obsolete), a cardless entity carries the reason on its registry row. A
  skip with a reason beats a hollow page.

Queue denominator honesty: `next_feature.py` counts and NAMES the phases that
predate the Center column as out-of-generation — never silently absent.

## Bootstrap (a project without a center)

Owned by `/gabe-adopt` (ruling R7 — its own skill, its own spec). The
machinery is SUITE TEMPLATES: `templates/center/generators/` (builder + data
and ingest layers + gate + refresh + `curate_proof.py` + `next_feature.py`),
`templates/center/shell/` (the vendored A3-Tabbed skeletons) and
`templates/center/verify_center_chrome.mjs`. Adoption copies them into the
project (`scripts/` + `docs/site/center/`), copies
`center.config.template.json` to `docs/site/center/center.config.json` and
fills it (`center.config.example.json` is the worked example); `rank`/
`section` then ingest the back-catalog one approved section at a time. This
spec owns the FORWARD track only: covering shipped work in a center that
already exists.

## Release (the stakeholder showcase — a MODE, not a beat)

`/gabe-feature release [--since <deployments-row>]` renders `releases/<id>.html` for
stakeholders: the covered set = phases whose `Center` cell went ✅ since the last TERMINAL-env
row in `.kdbp/DEPLOYMENTS.md` (the trigger is derived — `/gabe-push` detects the terminal-env
ship and prints the pointer; staging ships fire nothing; projects without a center: silent skip).
Contents v1 (design record D3): curated proof shots + diagrams + each feature's summary/narration
— **video slots render as named gaps** ("recording available on the build machine") until video
custody is decided at the first real release. Pure re-runnable join over committed data: no new
state, no config key, nobody is asked "is this a release?".

## Wave-2 notes (recorded, not built)

gabe-commit runs the crawl gate when `docs/site/center/**` is staged · diagram
library (`center/diagrams/*.mmd` bases + per-entity highlight refs) when a
second entity shares a topology.
