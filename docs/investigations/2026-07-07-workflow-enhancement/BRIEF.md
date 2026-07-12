# Gabe Suite — Workflow Enhancement Investigation Brief

- **Prepared:** 2026-07-07 (by Opus 4.8 session, at user's direction)
- **Target analyst:** Fable 5 (`claude-fable-5`) — the most capable model, next availability window
- **Status:** Ready to run. Not committed. Not yet executed.
- **Repo under study:** `gabe_lens/` → `github.com/Brownbull/gabe-suite` (origin) + `github.com/khujta/gabe-suite` (korigin). Both remotes in sync at `4dc0b13`.

---

## 0. How to use this brief (read first, Fable)

You are auditing a working development suite (the "Gabe Suite") and the way its human
operator actually uses it across two live projects. The operator's felt problem is:
**"we keep patching skills and commands and re-instructing the AI instead of building
something reliable."** Your job is not to add features. Your job is to find where the
*re-instruction tax* is being paid and decide, per case, the right place to encode the
knowledge — or to leave it as judgment on purpose.

Ground every claim in evidence from the session transcripts and the repos listed in §5.
Do not theorize about what "probably" happens — the transcripts record what *did* happen.
The five threads in §4 are **co-equal**; rank them yourself by evidence-weighted pain and
say why. Deliver the artifacts in §7.

**Before you begin, read §2A** — the operator's **seven locked decisions** and the **Evidence
Doctrine**. They are settled inputs; do not re-litigate them. This is an **analyze-and-plan run
only** (§2A.6): produce recommendations and a sequenced change plan — do **not** modify the
suite or the projects. Implementation is a separate, later, operator-approved pass.

---

## 1. Mandate — the one decision

> For each recurring friction in how this operator develops software with the Gabe Suite,
> decide the **right home** for the knowledge — skill, command wrapper, hook, per-project
> manifest, or deliberately-left-as-judgment — such that the operator stops re-instructing
> the same thing, **without** over-generalizing into something that needs re-parameterizing
> every time.

Everything else (thread rankings, the Storybook pipeline design, evidence conventions)
serves this one decision.

---

## 2. Operating constraints & anti-goals (the tightrope)

The operator was explicit about the failure modes on *both* sides. Respect them.

- **Anti-goal A — Overfit.** Do not propose narrow, project-hardcoded procedures that only
  work for one screen/feature. "I don't want an overfitted thing."
- **Anti-goal B — Over-generalize.** Do not propose a knob-laden general command that has to
  be re-configured/re-explained on every use. That *is* the re-instruction tax, relocated.
  "Something very generalized that I have to keep the instructions for again and again."
- **Target C — "Does the job."** The operator wants procedures that "do the job so we can
  apply them in different ways in the same project." Reusable *shape*, variable *content*.
- **Constraint D — Mockup medium must match the receiving platform (Storybook is the current
  choice for React; the *principle* is the invariant, the tool is swappable).** Hard-won rule:
  a mockup gets implemented on a target platform, so it should be authored in *that platform's
  medium*. Plain HTML/CSS/JS mockups are fine **only when the target is itself a plain
  HTML/CSS/JS surface** (a docs site, a JS-only page). For a React app they are disfavored —
  repeatedly, beautiful HTML/CSS/JS mockups had to be **rebuilt from scratch** in React because
  React could not lift them directly. For React targets the current tool is **Storybook** (a
  genuine win for the *human*: visible steps, linkable, easy to refer to components/layouts).
  The operator is open to other tools, but any replacement must honor the same intent — author
  in the target's medium so implementation is **lift, not rebuild**.
  - **NB — this is about *mockups*, not *docs/specs*.** HTML is fine, even preferred, for
    documentation and design specs (cf. Ara, V4). So "HTML specs over markdown" and "no HTML
    mockups for a React target" do **not** conflict — they operate on different artifacts.
- **Constraint E — Two near-twin projects, not one.** Gustify and Gastify share stack and
  method but differ in specifics. Solutions must handle "same shape, different details"
  cleanly rather than assuming one project.

## 2A. Operator decisions — locked 2026-07-07 (do not re-litigate)

Foundational forks resolved by the operator (1–4 asked directly, 5–7 folded from the flagged
set). Treat as settled inputs.

1. **Autonomy vs. visibility → mechanical auto, design human-visible.** Autonomous for
   mechanical/low-stakes loops (CI, repro bots, running tests, lint); design, architecture,
   and mockup work stay visible and steppable. **This answer carries a deeper intent — the
   Evidence Doctrine below — which is the real core of Thread 3.**
2. **Self-improving artifacts → YES, human-gated.** Skills / CLAUDE.md may accrete their own
   blockers + fixes, but the agent only *proposes*; the human approves before anything lands.
   Pair with a **pruning discipline** so the always-loaded surface (Thread 2 cost) doesn't
   bloat. No silent self-modification of instructions.
3. **Encode-vs-judgment default → NO fixed default; decide per pattern from measured
   frequency.** Fable sets each encode threshold empirically from how often a pattern recurs
   across the transcripts, not a blanket rule. The Method's cluster step must emit frequency
   counts so this is data-driven.
4. **Twins (Gustify/Gastify) → HYBRID: flag, human decides.** Fable surfaces each divergence
   with a unify-vs-keep recommendation; the operator chooses case-by-case. Deliver a divergence
   report, never a unilateral convergence.
5. **Source of truth (suite vs. global `~/.claude/rules`) → LAYERED.** Global rules are the
   universal base (testing-80%, security, git, hooks, agents, code-review); the suite and
   per-project manifests **override only where they genuinely differ** (CSS-specificity style,
   matching the operator's existing `rules/` precedence model). Fable must **de-duplicate**:
   where the suite merely restates a global rule, replace the copy with a reference and keep
   only suite-specific additions — duplicated/contradictory guidance is itself a re-instruction
   source.
6. **Run scope → ANALYZE + PLAN ONLY.** Fable produces analysis, recommendations, and the
   sequenced change plan (§7). It does **not** mutate the suite or the projects — nothing lands
   until the operator reviews and approves. *Implication:* the Method is a read/analyze
   Workflow — no worktree writes, no edits to skills/commands/manifests this run. Implementation
   is a separate, later, operator-approved pass.
7. **Reuse axis → cross-project drives structure.** Optimize for cross-project reuse (global
   skill + per-project manifest); within-project reuse (across features in one app) falls out of
   well-shaped skills rather than being designed separately. *(Folded, not asked — operator may
   later flip to within-project-first.)*

### Evidence Doctrine (operator intent — the core of Thread 3)

Every change must ship **verifiable proof it works as intended to be used** — but the proof is
*scoped and shaped*, not blanket:

- **Scope by importance, not everything.** Generate proof/tests only for the **most critical /
  high-importance** pieces; explicitly do **not** test everything. *(This is the operator's
  answer to flagged tension #5 — enforcement scales with importance, not all-or-nothing.)*
- **Proof form is change-type-specific:**
  - **Backend change →** a backend test that validates the behavior.
  - **Frontend change →** a **side-by-side visual comparison**: mockup/design artifact vs. the
    actually-implemented UI.
  - **New end-to-end feature (both sides) →** the flow **recorded** as screenshots or, ideally,
    a **GIF of the flow** followed by the test that shows what was verified.
- **Living test set — never stale, date-stamped throwaways.** Per feature/app there is ONE
  maintained set you augment / modify / reduce over time; it always checks the latest state and
  carries current evidence. This explicitly **rejects** the old pattern of "a new dated folder
  per test run."
- **Evidence is dual-purpose.** The same visual/actual evidence that verifies a change is the
  **raw material for documentation and demos** — proof clips → docs → small "it works" demos.
  (Connects to `gabe-docs` / `gabe-teach`, and to Ara V4's "record evidence clips.")

**Structural read for Fable:** a suite-global *shape* (proof-for-critical-changes; change-type
→proof-form map; one living set per feature; evidence→docs) with project-local *tooling* (test
runners, the GIF/screenshot capture tool, evidence location) → a prime **global-skill +
per-project-manifest** candidate. Its frontend arm **is** Thread 4's Storybook
mockup-vs-implemented comparison, so Threads 3 and 4 share machinery. It also reframes flagged
tension #8: the side-by-side comparison is *wanted* — the fix is to make it **living and
Storybook-native (reuse, evidence-producing)** rather than regenerate-from-scratch.

---

## 3. The altitude heuristic (seed — validate and refine against evidence)

A starting decision rule for §1. Treat as a hypothesis to sharpen, not gospel.

| Encode as… | When the friction is… |
|---|---|
| **Skill** | A multi-step *procedure* with reusable domain knowledge that recurs across ≥2 contexts with the same **shape** even if different **content**. |
| **Command wrapper** | A thin invocation / lifecycle gate / router over a skill. Keep lean (suite convention). |
| **Hook** (PreToolUse/PostToolUse/Stop) | A rule that must fire *automatically* at a boundary — e.g. "after a backend change, run API tests"; "before commit, verify evidence exists." The AI shouldn't have to *remember*; the harness enforces. |
| **Per-project manifest** | The procedure shape is suite-global but the **tooling / proof / paths differ per project.** Pattern to evaluate: *one suite-global skill + a `.kdbp/…` manifest per project* declaring the project's specifics (test commands, evidence dirs, Storybook location). This may be the single highest-leverage structural move — test it hard. |
| **Leave as judgment** | The variation between instances is in the **reasoning**, not the procedure. Encoding it would either overfit or demand re-parameterization each time (the tax reappears). Naming this explicitly is a valid, valuable outcome. |

**Suite-global vs project-local test:** global when the *procedure shape* is identical
across Gustify/Gastify; project-local (via manifest) when only the *proof, tooling, or
paths* differ. Very little should be a fully project-local *skill* — prefer global skill +
project manifest.

---

## 4. The five threads (co-equal — rank from evidence)

### Thread 1 — The re-instruction / hand-holding audit
- **Symptom:** The suite exists, yet the operator still babysits the AI through tasks,
  re-typing the same guidance. The suite is developed *from inside project sessions*
  (see §5: `gabe_lens` has only 1 session store vs. gustify's 22) — meta-work leaks into
  feature-work, a finding in itself.
- **Hypothesis:** A meaningful fraction of repeated instructions have a natural home
  (skill/command/hook/manifest) and were never moved there.
- **Research questions:** What are the *most frequently repeated* instructions across
  sessions? Which are corrections (AI did it wrong) vs. re-specifications (AI never knew)
  vs. manual routing (human sequencing steps a router should)? For each recurring one,
  which §3 home fits — and which are correctly left as judgment?

### Thread 2 — Generalize vs. specialize (the root of the "patching" feeling)
- **Symptom:** Feels like endless patching; unsure which commands should be suite-global
  vs. project-specific. Candidates the operator named: `gabe-handoff` and `gabe-teach`
  (topics) *feel* generalizable; other things feel project-bound.
- **Hypothesis:** Some commands are pitched at the wrong altitude — either too general
  (re-instructed each use) or duplicated per project when a global+manifest split would do.
- **Research questions:** For each of the 21 command wrappers, is its current altitude
  right? Which are truly suite-global, which need a per-project manifest, which are
  mis-scoped? Where is the "patching" actually a symptom of wrong altitude vs. genuinely
  irreducible per-case judgment?

### Thread 3 — Evidence / proof procedures per change type
- **Symptom:** Different change types need different proof, and it's ad hoc. Backend change
  → what proof? (API testing?) Frontend → E2E + screenshots + a *new folder per test* to
  hold the artifacts. No convention for how proof **accumulates** over time.
- **Hypothesis:** Proof-of-change is a suite-global *shape* with project-local *tooling* —
  a prime candidate for the global-skill + project-manifest pattern (§3), possibly enforced
  by a Stop/PostToolUse hook.
- **Research questions:** Enumerate the change types (backend/frontend/schema/etc.) and the
  proof each currently produces across both projects. Is a new test type best encoded as a
  project skill or a suite skill? Design the accumulation convention (where evidence lives,
  how it's indexed, how a reviewer finds it). Should a hook *require* proof before commit?
  **The operator's locked intent for this thread is §2A's Evidence Doctrine — operationalize
  it:** living test set (augmentable, never dated), change-type→proof-form map, GIF/screenshot
  flow capture, evidence→docs/demo pipeline, all scoped to critical/high-importance pieces.
  Candidate capture tool: **pagecast** (Playwright+ffmpeg→GIF/MP4, headless/WSL-ok, no Chrome-MCP
  dependency); see `simplify-and-e2e-proof-scan.md`.

### Thread 4 — The Storybook → React reuse gap (most concrete pain)
- **Symptom (the operator's words, paraphrased):**
  - Frontend comparison artifacts get generated *in the cloud from scratch* instead of
    spiking on top of what already exists in Storybook.
  - Mockups recreate everything rather than reusing existing Storybook components.
  - Implementing a mockup in the real React app = rebuild from scratch; the intended move —
    *"copy the Storybook component into the real frontend, wire up the backend"* — has never
    materialized reliably. Repeated iteration, no clean operation.
  - Storybook is loved by the human (visible, linkable, referenceable). Plain HTML/CSS/JS
    mockups are worse and double the work (rebuild in React later).
- **Hypothesis:** There is a reusable pipeline hiding here —
  **spike in Storybook → validate → lift the component into the real app → wire data/backend**
  — that the suite (`gabe-mockup`, `gabe-execute`) doesn't yet make repeatable.
- **Research questions:** Study an *actual instance* of the failure in the transcripts (see
  §5 search seeds) and in the gustify Storybook/spike files. Where does the round-trip break?
  Design the SOP that makes "Storybook spike → production React" a first-class, repeatable
  operation that never regenerates from scratch. What must `gabe-mockup` know about the
  existing Storybook to extend it instead of recreating it? Encode the rule **"mockup medium =
  receiving platform"** (HTML only for HTML/JS targets; Storybook or another React-native tool
  for React) and decide its home — likely the `gabe-mockup` skill (the shape) + a per-project
  manifest field naming that project's mockup tool (the detail that differs across projects).

### Thread 5 — Reference material intake (Anthropic talks/tutorials)
- **Purpose:** Ground the above in current Anthropic guidance on skills, commands, hooks,
  agent design, and harness patterns. This is *input*, not a separate deliverable — extract
  applicable patterns and cite them where they inform a recommendation.
- **Sources supplied by the operator** (as timestamped **mini-summaries**, not verbatim
  transcripts — saved in `refs/`):
  1. **"Stop babysitting your agents"** — Sid Buddhisara — `wI0ptqCSL0I`
     → `refs/wI0ptqCSL0I-summary.txt`. (Thread 1; verification loops → 3–4.)
  2. **"Beyond the basics with Claude Code"** — Daisy Holman — `tuY2ChJIx48`
     → `refs/tuY2ChJIx48-summary.txt`. (Skills/hooks/context altitude → Threads 2–3.)
  3. **Boris Cherny (Head of Claude Code) × Jarred Sumner (Bun) session** — URL not supplied
     → `refs/boris-jarred-bun-session-summary.txt`. (Self-healing verification pipeline,
     tests-required PRs, self-improving CLAUDE.md, multi-agent adversarial review → 1, 3.)
  4. **Agent-native verification workshop** — Anthropic eng. "Ara" — URL not supplied
     → `refs/ara-agent-native-verification-workshop-summary.txt`. (HTML specs, DOM-published
     verify-state, three-layer verification, evidence clips → Threads 3–4 — **most relevant to
     the Storybook/mockup pain**.)
- **Verbatim transcripts: NOT cached (optional).** The mini-summaries are enough to extract
  patterns. Full transcripts were unreachable from the prep box — YouTube caption-gates this
  datacenter IP (4 methods failed: transcript-api, yt-dlp±Deno, WebFetch). If a verbatim quote
  is needed, the operator captures it via the browser "Show transcript" method (Appendix A)
  into `refs/<videoID>.txt`. Absent files → proceed and note the gap; don't re-attempt the
  blocked fetch during the run.
- **Reference leads — cross-source convergence (LEADS to verify against evidence, NOT
  conclusions).** All four talks answer "stop babysitting" the same way; cited V1=Daisy,
  V2=Sid, V3=Boris/Jarred, V4=Ara:
  - **Thread 1 (re-instruction tax):** never copy-paste context — build a tool/connection to
    feed it directly (V1). Make artifacts **self-improving** — when the agent repeats a
    mistake, the skill / CLAUDE.md records the blocker + fix so it can't recur (V2, V3).
    *This is the structural cure for "patching": the artifact accumulates learning, not the human.*
  - **Thread 2 (altitude / over-standardization):** a skill's **description is always in the
    system prompt**; bloating the always-loaded surface (redundant CLAUDE.md/descriptions per
    plugin) does not scale (V1) → audit the suite's 19 always-loaded skill descriptions for
    cost. Stable/global info first, volatile last; "zero-overhead" (V1).
  - **Thread 3 (proof/evidence):** enforcement in **hooks**, outside the context window
    ("red squiggly": lint / typecheck / tests) (V1). Verification loop = design→build→test→
    fix→deploy (V2). **Tests-required gate**: accept a change only if tests fail on base and
    pass on fix (V3). **Three-layer verification**: human dashboard / agent-driven browser run
    / headless CI (V4). **Record evidence clips**, store + share (V4) → the concrete "how
    evidence accumulates" answer. Metric-driven hill-climbing for perf (V3).
  - **Thread 4 (Storybook→React):** publish component state to the **DOM via data attributes**
    (`data-verify-*`) so an agent verifies without scraping or rebuild (V4). Multi-agent
    adversarial review — one proposes, one reviews (V3). **On the HTML-specs question (resolved
    by Constraint D):** V4's "HTML specs over markdown" is about *docs/specs* (HTML is fine
    there), NOT about *mockups*. The invariant is **mockup medium = receiving platform** →
    React targets use Storybook (or another React-native tool), never HTML. Synthesis to verify
    against the real gustify Storybook: keep Storybook for the human **+** add `data-verify-*`
    so spikes become agent-verifiable **and** liftable (lift-not-rebuild). The
    "mockup medium = target platform" rule is itself a candidate manifest field — each project
    declares its mockup tool (Storybook for React; plain HTML only for HTML/JS targets).
  - **Orchestration (supports all threads):** `/loop` + routines + remote-control + `claude
    agents` + git worktrees + Auto mode remove the human from the hot path (V1, V2, V3).

---

## 5. Evidence inventory (concrete paths)

### Session transcripts — `~/.claude/projects/<slug>/*.jsonl`
Mine **all** of these (operator confirmed full mining, not a curated subset):

| Sessions | Store slug |
|---:|---|
| 22 | `-home-khujta-projects-apps-gustify` |
| 14 | `-home-khujta-projects-apps-gastify` |
| — | `-home-khujta-projects-apps-gustify-apps-web`, `…-apps-api`, `…-web-src` (sub-stores) |
| — | `-home-khujta-projects-apps-gastify-web`, `…-backend`, `…-design-lab`, `…-design-lab-src` |
| — | `-home-khujta-projects-apps-gustify-docs-mockups-playful-geometric-explorations` (Thread 4) |
| 1 | `-home-khujta-projects-gabe-lens` (note: suite built from project sessions — Thread 1) |

Each `.jsonl` is one session; user turns + tool calls are recorded. Extract **re-instruction
incidents** (Appendix B taxonomy). Suggested Thread-4 search seeds across transcripts:
`storybook`, `spike`, `mockup`, `from scratch`, `recreate`, `wire`, `screenshot`.

### Repos
- **Suite:** `/home/khujta/projects/gabe_lens` — 13 core skills, 6 command-wrapper skills,
  21 command files, templates, `install.sh` (installs to `~/.claude/` and `~/.agents/`).
  Skills most relevant: `gabe-mockup`, `gabe-execute`, `gabe-review`, `gabe-handoff`,
  `gabe-teach`, `gabe-health`.
- **Project A:** `/home/khujta/projects/apps/gustify` — has Storybook + `spikes/` +
  `*.stories.tsx` (e.g. detail-signals spike). Best place to study Thread 4's live failure.
- **Project B:** `/home/khujta/projects/apps/gastify` — near-twin; also a `design-lab`.
  Use to test "same shape, different details" (Constraint E).

### Installed state (for altitude analysis)
`~/.claude/skills/gabe-*` (18 installed; `gabe-docsite` not yet installed) and
`~/.claude/commands/gabe-*.md`. Compare against the operator's *global rules* in
`~/.claude/CLAUDE.md` and `~/.claude/rules/common/*` — these already encode standards
(testing 80%, hooks, agents) that some re-instructions may duplicate (resolve per §2A.5 —
layered, de-duplicate).

### External references (web scan 2026-07-07)
See **`external-skills-scan.md`** (this folder) and **Appendix C** — Anthropic skill repos +
notable community skills (ponytail, caveman, cavemem) mapped to threads with adopt/reference
verdicts. **Top prior art:** `anthropics/cwc-long-running-agents` implements the Evidence
Doctrine as a Default-FAIL evidence hook + fresh-context evaluator + agent-maintained handoff.

Also **`simplify-and-e2e-proof-scan.md`** (2026-07-08) — two operator-requested capabilities:
(a) a **simplify step after review** — the built-in `/simplify` already exists (3 parallel
angle-agents, quality-only); the gap is lifecycle integration → a thin `/gabe-simplify` wrapper
or a tiered gate in `gabe-commit`, with ponytail as the write-time restraint; (b) **E2E proof
capture** — `mcpware/pagecast` (Playwright+ffmpeg → GIF/MP4, headless/WSL-ok) as the Evidence
Doctrine capture tool, producing docs/demo-ready evidence in one step.

Also **`documentation-skills-scan.md`** (2026-07-08) — market documentation skills/standards to
learn from (the suite already has `gabe-docs` / `gabe-docsite` / `gabe-teach`): **HADS** (one doc
format for human + AI readers), **Diataxis** (tutorial/how-to/reference/explanation taxonomy), and
drift-closing patterns (changelog / OpenAPI / ADR / docs-review). Cross-cutting: a **living-docs**
principle — generate/verify docs from code + evidence rather than hand-maintain — paralleling the
Evidence Doctrine's living test set; align `gabe-commit docs-audit` to it.

---

## 6. Method (recommended: a Workflow, multi-agent)

Fable should run this as an orchestrated Workflow, not one linear pass. **This run is
read/analyze only (§2A.6) — it produces recommendations and a plan, not changes.**

1. **Fan-out read** — one reader-agent per session store (gustify, gastify, + sub-stores).
   Each extracts re-instruction incidents into the Appendix B schema. Parallel.
2. **Cluster** — dedup incidents into patterns; count frequency across sessions/projects.
   (Plain synthesis pass — needs all incidents together, so a barrier here is correct.)
3. **Classify** — per pattern, decide the §3 home (skill / command / hook / manifest /
   judgment) with the rationale and the anti-goal it avoids.
4. **Thread-4 deep dive** — separate track: read one real Storybook→React failure end to
   end (transcript + gustify files), then design the reuse SOP.
5. **Reference pass** — read the four mini-summaries in `refs/` (Thread 5) and fold the
   cross-source leads into the above; verbatim transcripts are optional (not cached). Also read
   `external-skills-scan.md` / Appendix C — treat `anthropics/cwc-long-running-agents` as prior
   art for the proof convention rather than designing it from scratch.
6. **Synthesize** — rank the five threads by evidence-weighted pain; produce §7 deliverables.

Adversarially verify the top recommendations: for each "encode as a skill" proposal, have a
skeptic agent argue it should stay judgment (Anti-goal B), and vice versa. Keep only
recommendations that survive.

**Model routing (operator preference):** run reasoning-heavy stages (orchestration, cluster,
classify, Thread-4 SOP, adversarial verify, deliverables) on **Fable** (`claude-fable-5`); run
the high-volume mechanical stages (fan-out transcript readers + Appendix B extraction, bulk
scans) on **Sonnet** (`claude-sonnet-5`) via `{model: 'claude-sonnet-5'}`. Fable decides and
plans; Sonnet reads and extracts.

---

## 7. Decision outputs wanted (deliverables)

1. **Re-instruction pattern catalog** — table: pattern · frequency · projects seen · example
   session · proposed home (§3) · anti-goal avoided.
2. **Command altitude table** — all 21 command wrappers: current altitude · verdict (right /
   too general / too specific / duplicate) · proposed change (global / global+manifest /
   project-local / merge / retire).
3. **Storybook→React reuse SOP** — a concrete, repeatable operation (spike → lift → wire),
   what `gabe-mockup`/`gabe-execute` must change to support it, and what kills the
   from-scratch regeneration. Include the manifest fields a project must declare (Storybook
   path, component conventions).
4. **Evidence Doctrine, operationalized** (see §2A) — the **living test set** convention
   (augmentable, never date-stamped throwaways); the **change-type→proof-form** map (backend
   test / frontend side-by-side mockup-vs-implemented / GIF+screenshots of the flow); the
   **importance filter** (what qualifies as critical/high-importance and thus earns proof); and
   the **evidence→docs/demo** pipeline. Global skill + per-project manifest spec (test runners,
   capture tool, evidence location).
5. **Thread ranking** — the five threads ordered by evidence-weighted pain, with the reason.
6. **Sequenced change plan** — smallest first: which 2–3 changes to make immediately, which
   need design, which to explicitly *not* do (and why — the judgment-is-correct cases).
7. **Twin divergence report** — each Gustify/Gastify difference flagged with a unify-vs-keep
   recommendation for the operator to decide (per §2A.4); never a unilateral convergence.

---

## 8. Resolved + still-open questions

**Resolved (2026-07-07):**
- **"Zustand" flag → RESOLVED.** Confirmed it meant **over-standardization** across projects,
  *not* the Zustand state library. Thread 2 should treat the concern as "we standardized/
  generalized too aggressively across projects" — read every generalization decision against
  the risk that it forced re-instruction rather than removing it.
- **Reference sources → SUPPLIED.** Four talks captured as timestamped mini-summaries in
  `refs/` (see Thread 5); verbatim transcripts not cached (caption-gated) but optional.
- **Nine tension points → RESOLVED.** The seven foundational decisions are locked in **§2A**;
  flagged tensions #5 (proof scope) and #8 (cloud-artifact fix) were absorbed into the Evidence
  Doctrine and Thread 4.

**Resolved (project scope):**
- **No project C for now.** Scope the global-skill + per-project-manifest split for exactly
  **Gustify + Gastify** today. Keep it *extensible* but don't pay generality cost for
  hypotheticals. If a third project later qualifies it would be **chiless / cifrachile** or
  **archie** (both already have session history: `-home-khujta-projects-apps-chiless` 14
  sessions, `-home-khujta-projects-bmad-archie` 7) — design the manifest so adding one is
  "write a new manifest," not "re-architect the skill."

**Still open (human only):**
- *(none blocking — raise here if new questions surface during the run.)*

---

## Appendix A — YouTube transcript fetch recipe

**Most reliable (no install, never IP-gated) — browser "Show transcript":** open the video →
expand the description ("...more") → click **"Show transcript"** → in the transcript panel
click the **⋮** and "Toggle timestamps" off → select-all → copy → paste into
`refs/<videoID>.txt`. Uses the logged-in session, so it bypasses the datacenter-IP caption
gate that defeated every headless tool here.

**CLI paths (only work from a residential IP / non-gated network):**

```bash
pip install youtube-transcript-api        # one-time
```
```python
# fetch_transcripts.py — feed it URLs or IDs
import re, sys, json
from youtube_transcript_api import YouTubeTranscriptApi

def vid(u):
    m = re.search(r"(?:v=|youtu\.be/|/shorts/)([\w-]{11})", u)
    return m.group(1) if m else u  # bare ID passthrough

for url in sys.argv[1:]:
    vid_id = vid(url)
    try:
        # API surface differs by version: try v0.6 then v1.x
        try:
            data = YouTubeTranscriptApi.get_transcript(vid_id, languages=["en"])
        except AttributeError:
            data = YouTubeTranscriptApi().fetch(vid_id).to_raw_data()
        text = " ".join(seg["text"] for seg in data)
        print(f"\n===== {vid_id} =====\n{text}\n")
    except Exception as e:
        print(f"[FAIL {vid_id}] {e}", file=sys.stderr)
```
Fallback (auto-captions via yt-dlp, if the API is blocked):
```bash
pip install yt-dlp
yt-dlp --write-auto-sub --sub-lang en --skip-download --convert-subs srt "<URL>"
```
**Caveats:** **datacenter IPs are caption-gated** — this is what defeated every headless tool
during prep (see Thread 5), so run these CLI paths from a residential IP or use the browser
method above; region/age-gated or caption-less videos also fail.

---

## Appendix B — Re-instruction incident taxonomy (extraction schema)

For each incident a reader-agent finds in a transcript, capture:

```
{
  "type": "correction | re-specification | manual-routing | reconstruction |
           context-reload | proof-reminder",
  "what": "one-line: what the human had to say again",
  "project": "gustify | gastify | suite",
  "session": "<jsonl filename>",
  "trigger": "what the AI did (or failed to do) that forced it",
  "current_home": "where this knowledge lives now, if anywhere",
  "smells_like": "skill | command | hook | manifest | judgment"
}
```
Type definitions:
- **correction** — AI did it, human said "no, do it this way."
- **re-specification** — human re-explained a procedure the AI never retained.
- **manual-routing** — human told the AI which step/command comes next (a router's job).
- **reconstruction** — AI rebuilt something that already existed (Storybook-from-scratch).
- **context-reload** — human re-pasted the same context a new session should have loaded.
- **proof-reminder** — human reminded the AI to run tests / take screenshots / save evidence.

---

## Appendix C — External skill/repo references (web scan 2026-07-07)

Full detail + adopt/reference verdicts in **`external-skills-scan.md`** (same folder). The three
to read first:

- **`anthropics/cwc-long-running-agents`** — Anthropic's own long-running-agent harness: a
  **Default-FAIL evidence contract enforced by a `PreToolUse` hook** (can't mark a criterion
  "pass" until evidence is opened), a **fresh-context evaluator** agent (no Write/Edit), and an
  **agent-maintained handoff** (`PROGRESS.md` + commit-on-stop). This is the Evidence Doctrine
  (§2A) + decisions #1/#2 **already implemented** — study it before designing the proof
  convention. → Threads 1, 3; decisions #1, #2.
- **`DietrichGebert/ponytail`** — a 7-rung anti-over-engineering decision ladder (YAGNI → reuse
  → stdlib → native → dep → one-liner → minimal) with safety carve-outs. **Encodable restraint**
  → Anti-goals A/B, Target C, and Thread 4's reuse-before-build gap (rung 2 = "already in the
  codebase?").
- **`JuliusBrussee/caveman`** — compresses the always-loaded surface (~46% input savings from
  rewriting CLAUDE.md-style files). Gives **Thread 2** a *metric* for description/CLAUDE.md bloat.

Others (`cavemem` self-improving memory; `anthropics/skills` spec+template;
`defending-code-reference-harness`; `trailofbits/skills`; the plugin marketplaces) are in the
scan doc. **These are references, not adopt-wholesale** — extract the technique; the viral
community skills are partly stylistic.
