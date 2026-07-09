# Gabe Lens — full spec (split)

> Split from this skill's SKILL.md (B2 skills-only migration, 2026-07-09). This file is the
> binding spec; the SKILL.md core is a summary. E1–E7: see `../../gabe-docs/references/execution-contract.md`.

## Cognitive Profile (Default Suit: Spatial-Analogical)

### How the Learner Thinks
- **Visual-spatial** — Reasons through images, diagrams, spatial relationships
- **Conceptual-analogical** — Primary reasoning substrate is metaphor. Thinks *through* analogy, not *with* analogy
- **Top-down, constraint-driven** — Asks "why does this exist?" before "how does it work?"
- **Spiral learner** — Iterates: do → generalize → formalize → refine
- **High working memory in familiar domains** — Holds 4-5 conceptual objects in known territory. In unfamiliar domains, reduce to 2-3 and build up.

### Optimal Sequence
1. **Problem first** — "What does this solve?" (or for tool/building-block concepts: "What does this enable?")
2. **Analogy to ground it** — Map to familiar physical system
3. **Code/mechanism to make concrete** — Executable understanding

### What Works
- Functional separation with concrete examples
- Tables mapping metaphors to real mechanisms
- Open-ended speculation prompts (let the user reason)
- Spatial diagrams (ASCII art, flow maps, state diagrams)
- Constraint boxes (IS / IS NOT / DECIDES)

### What Doesn't Work
- Abstract justification without examples
- Mathematical notation without paired intuitive explanation
- Questions that seem "too simple" (triggers overthinking loop)
- Walls of bullet points without spatial structure

### The Overthinking Trap
When the learner arrives at a simple answer quickly, the mind says "this can't be right — too easy." They search for hidden complexity, don't find it, lose energy.
- Signal **Quick check ✓** for simple concepts (trust first instinct)
- Signal **Deeper question ◆ (~5 min focus)** when there are real layers but focused attention resolves them
- Signal **Deeper question ◆ (rethink your model)** when the concept changes how you think about the topic

---

## Compression Modes

Gabe Blocks are token-expensive. A full block costs ~200-350 tokens. In agent frameworks with limited context windows, this matters. Every block can be expressed at three fidelity levels. Use the leanest mode that serves the current need.

| Mode | Tokens | When to use |
|---|---|---|
| **Full** | ~200-350 | First encounter, documentation, teaching |
| **Brief** | ~40-80 | Referencing a known concept, warm context loading |
| **Oneliner** | ~5-15 | Compaction handoffs, session re-anchoring, summaries |

### Compression Examples

**Full Block:**
```
┌─── GABE BLOCK: Enforcement Tiers ────────────────────┐
│  THE PROBLEM                                          │
│  Rules in docs get ignored under fatigue...           │
│  THE ANALOGY                                          │
│  Gravity vs. posted speed limits...                   │
│  HOW IT MAPS                                          │
│    gravity        →  Tier 1 hooks (always on)         │
│    speed bump     →  Tier 2 workflows (optional)      │
│    posted sign    →  Tier 3 docs (ignored under load) │
│  THE MAP                                              │
│  Tier 1: GRAVITY ══════► Always works                 │
│  ...                                                   │
│  CONSTRAINT BOX                                       │
│    IS: A reliability classification for rules         │
│    IS NOT: A quality judgment                         │
│    DECIDES: Where to invest enforcement effort        │
│  EASY TO CONFUSE WITH                                 │
│    • hook vs workflow — hook fires automatic;         │
│      workflow fires only if invoked                    │
│    • doc-rule vs retro-lesson — both Tier 3 but       │
│      decay differently (compaction vs sprint amnesia) │
│  ONE-LINE HANDLE                                      │
│  "Hooks are gravity — docs are speed limit signs"     │
│  ANALOGY LIMITS                                       │
│  When reasoning about hook maintenance, gravity       │
│  has no cost, but hooks do...                          │
│  SIGNAL: Quick check ✓                                │
└───────────────────────────────────────────────────────┘
```

**Brief:**
```
ENFORCEMENT TIERS
  IS: A reliability classification for rules
  IS NOT: A quality judgment
  DECIDES: Where to invest enforcement effort
  HANDLE: "Hooks are gravity — docs are speed limit signs"
```

**Oneliner:**
```
"Hooks are gravity — docs are speed limit signs"
```

---

## The Gabe Block — Output Template

When a concept is complex or critical, produce a **Gabe Block**:

```
┌─── GABE BLOCK: [Concept Name] ───────────────────────┐
│                                                        │
│  THE PROBLEM                                           │
│  [1-2 sentences: why this exists, what breaks without  │
│   it. Purpose-first, no mechanism yet.]                │
│                                                        │
│  THE ANALOGY                                           │
│  [Physical system mapping. Choose from: mechanical,    │
│   fluid dynamics, optical, chemical, electromagnetic,  │
│   thermodynamic, biological. Must be a system the      │
│   user can visualize spatially — not an abstract       │
│   metaphor. Must capture the KEY TRADE-OFF.]           │
│                                                        │
│  HOW IT MAPS                                           │
│  [Arrow-lines translating analogy pieces into concrete │
│   system/code pieces. 3-6 lines. Format:               │
│     <analogy piece>  →  <concrete piece>               │
│   Without this section the analogy is decoration —     │
│   the reader must guess the mapping. With it, the      │
│   analogy earns its keep.]                             │
│                                                        │
│  THE MAP                                               │
│  [ASCII spatial diagram showing relationships, flow,   │
│   states, or architecture. Use boxes, arrows, layers.  │
│   Max 15 lines. This is the visual anchor.]            │
│                                                        │
│  CONSTRAINT BOX                                        │
│    IS:      [what this concept/thing IS]               │
│    IS NOT:  [what it is NOT — prevents overthinking]   │
│    DECIDES: [what trade-off or choice it resolves]     │
│                                                        │
│  EASY TO CONFUSE WITH                                  │
│    [Optional. Use when the concept has multiple        │
│     orthogonal sub-parts that share surface similarity.│
│     1-3 bullets; each names a distinction pair + a     │
│     one-line clarification. Addresses sub-part         │
│     conflation — distinct from CONSTRAINT BOX (which   │
│     handles category confusion) and ANALOGY LIMITS     │
│     (which handles metaphor failures).]                │
│                                                        │
│  ONE-LINE HANDLE                                       │
│  [A memorable phrase — 5-10 words — that captures the  │
│   essence. Must survive compaction, fatigue, and        │
│   context loss. Think bumper sticker, not abstract.]   │
│                                                        │
│  ANALOGY LIMITS                                        │
│  [1-3 sentences. Lead with the CASE: when does this    │
│   analogy stop working? Then explain why it breaks.    │
│   Case first, explanation second.]                     │
│                                                        │
│  SIGNAL: Quick check ✓ | Deeper question ◆             │
│  [Quick check = trust first instinct.                   │
│   Deeper question (~5 min) = layers, but tractable.     │
│   Deeper question (rethink) = changes your model.]      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Rules for Each Component

### THE PROBLEM
- Start with the pain, not the solution
- One concrete scenario where the absence of this concept causes failure
- No jargon that isn't already defined
- Example: "Without batch chunking, a Firestore write of 600 items silently drops the last 100 — no error, just lost data."
- **For tool/building-block concepts** (data structures, language features, patterns) where no natural problem exists: replace THE PROBLEM with **WHAT IT ENABLES** — what becomes possible or easier with this concept. Example: "Generics let you write one sort function that works on any type — without them, you write a separate sort for strings, numbers, dates, etc."

### THE ANALOGY
- Must be a **physical system** the user can visualize in 3D space
- Preferred domains (in order): mechanical systems, fluid dynamics, optics/light, chemistry, electromagnetism, thermodynamics, biology
- The analogy must capture the **key trade-off**, not just surface similarity
- Bad: "It's like a traffic light" (too simple, no spatial depth)
- Good: "It's like a pressure relief valve — flow is unrestricted until pressure hits the threshold, then the valve diverts excess to a holding tank. The threshold is your 500-operation batch limit. The holding tank is the retry queue."
- If no good physical analogy exists, say so explicitly: "No clean physical analogy — here's how the mechanism works directly."

### HOW IT MAPS
- Arrow-lines translating analogy pieces to concrete system/code pieces
- Format: `<analogy piece>  →  <concrete piece>` (two spaces, arrow, two spaces)
- 3-6 lines. Fewer than 3 means the analogy is thin; more than 6 means it's sprawling
- This section is **load-bearing** — without it, the analogy is decorative and the reader has to reconstruct the mapping from context. With it, the analogy does the teaching.
- Every analogy element that appears in THE ANALOGY body must map to something concrete here. If you used "pressure relief valve" and "holding tank" in the analogy, both must appear on the left-hand side below.
- Good:
  ```
  pressure relief valve  →  batch-size checker
  closed valve           →  batch under 500 items (normal write)
  valve opens            →  batch hits limit; chunker activates
  holding tank           →  retry queue (FIFO, durable)
  drain back to system   →  retry worker pulls chunks every N seconds
  ```
- Bad: using the word "mapping" but only repeating the analogy ("the valve is like a valve in the code"). If the right-hand side isn't a concrete code/system term, the mapping failed.
- If the analogy is so direct it doesn't need a mapping (rare — usually means the analogy is too thin to carry teaching weight), write `(direct — no additional mapping)` as a single line. Don't skip the section; that signals you forgot.

### THE MAP
- ASCII art with boxes, arrows, and labels
- Maximum 15 lines (scannable, not overwhelming)
- Show: entities, relationships, flow direction, decision points
- Use spatial positioning to convey hierarchy (top = high-level, bottom = implementation)
- Use `───→` for data flow, `- - →` for optional/conditional flow, `══►` for critical path

### CONSTRAINT BOX
- **IS:** One sentence defining what this is (use everyday language)
- **IS NOT:** One sentence clarifying what it's NOT (prevents overthinking trap — explicitly removes the "maybe it's also X?" distraction)
- **DECIDES:** The trade-off this concept resolves. What tension does it sit between?

### EASY TO CONFUSE WITH
- **Optional** — include only when the concept has multiple orthogonal sub-parts that share surface similarity. Skip when the concept is atomic.
- Addresses a **different failure mode** than CONSTRAINT BOX or ANALOGY LIMITS:
  - CONSTRAINT BOX `IS NOT:` — category confusion ("is this a X or a Y?")
  - ANALOGY LIMITS — where the metaphor betrays you
  - EASY TO CONFUSE WITH — sub-part conflation (two distinct roles inside the concept look alike)
- Format: 1-3 bullets. Each bullet names a distinction pair + one-line clarification.
- Good example (for "Async Background Processing"):
  ```
  • ticket_id vs persisted job state — the first is a handle; the second is storage.
    You can have a ticket without persistence, or persistence without a ticket.
  • 202 Accepted vs "work started" — 202 is acknowledgement. The worker may still be cold.
  • SSE vs polling vs webhooks — three delivery channels, orthogonal to persistence choice.
  ```
- Bad example: `• Don't confuse with caching.` (no pair, no clarification, too abstract)
- Test: after reading this section, could the reader explain which sub-part does which job, without guessing?

### ONE-LINE HANDLE
- 5-10 words maximum
- Must be concrete, not abstract
- Must be memorable under fatigue
- Test: "Would this phrase mean something at 11pm after 3 compactions?"
- Test: "If this is the ONLY thing that survives context compression, does it re-anchor the concept?"
- Examples:
  - "Hooks are laws, docs are suggestions"
  - "The autopilot resets every 27 minutes"
  - "Fix commits outnumber feature commits"
  - "Empty planning folder, full ceremony"

### ANALOGY LIMITS
- Lead with the CASE: when does this analogy stop working? What scenario breaks it?
- Then explain WHY it breaks in that case
- 1-3 sentences. Case first, explanation second.
- Example: "When reasoning about retry priority, a real valve doesn't queue overflow by arrival time, but the retry queue does."

### SIGNAL
- **Quick check ✓** — The concept is straightforward. First instinct is probably right. Don't overthink. Only use when the simple answer IS correct — if a common misconception looks simple, use Deeper question instead.
- **Deeper question ◆ (~5 min focus)** — There are real layers, but focused attention will get you there. Sit with the analogy.
- **Deeper question ◆ (rethink your model)** — This will change how you think about the topic. The surface answer is wrong or incomplete. Take your time.

### Pre-emit self-check (run before emitting any block)
1. Every noun used in THE ANALOGY appears on a HOW-IT-MAPS left-hand side.
2. Every HOW-IT-MAPS right-hand side is a concrete code/system term.
3. ONE-LINE HANDLE is ≤10 words.
If (1)/(2) cannot be met, cut the analogy per the ANALOGY rule ('No clean physical analogy — here's the mechanism directly') rather than emitting a decorative one. Fix before emitting; never present a block that fails the check.

---

## Analogy Hygiene

Analogies are powerful but they have a failure mode: **analogy rot.** An analogy that fits perfectly today can become misleading as the underlying system evolves.

### Prevention
Every block includes an ANALOGY LIMITS field that documents where the analogy breaks NOW, so readers know the boundaries upfront.

### Detection
When revisiting a concept or updating documentation, check:
1. Read the ANALOGY LIMITS field
2. Ask: "Has the system evolved past any of these limits?"
3. If yes: update the analogy or replace it
4. If approaching: flag for next review

### Repair
When an analogy no longer fits:
1. **Don't patch — replace.** A patched analogy is worse than a fresh one.
2. **Keep the one-line handle if it still works.** Handles often outlive their analogies.
3. If the handle also breaks, the concept may have fundamentally changed — reconsider the full block.

---

## When to Apply

**ALWAYS apply a Gabe Block for:**
- Architecture decisions (new patterns, state management, data flow)
- Trade-off resolutions (why A over B)
- Failure modes (what went wrong and why)
- New abstractions being introduced
- Counter-intuitive findings (data says something unexpected)

**NEVER apply a Gabe Block for:**
- Trivial facts (file counts, dates, version numbers)
- Step-by-step procedures (just list the steps)
- Code that speaks for itself (a 3-line function doesn't need an analogy)
- Concepts the user has already demonstrated understanding of (avoid condescension)

**APPLY LIGHTLY (brief or oneliner) for:**
- Reinforcement of previously explained concepts
- Context reminders at session start or compaction
- Quick status summaries

---

## Embedding in Workflows

### At compaction checkpoints
When producing a compaction handoff note, include one-line handles for the key decisions made this session. These survive context compression and re-anchor the spatial model.

### In dev-story / code-review workflows
When the planner or architect agent makes a significant decision, apply gabe-lens to that decision before presenting it.

---

## Example Gabe Blocks

### Example 1: Enforcement Tiers

```
┌─── GABE BLOCK: Enforcement Tiers ────────────────────┐
│                                                        │
│  THE PROBLEM                                           │
│  Rules written in docs get ignored under fatigue and   │
│  context loss. 19 files exceeded the 800-line limit    │
│  despite the limit being documented everywhere.        │
│                                                        │
│  THE ANALOGY                                           │
│  Think of it as gravity vs. posted speed limits.       │
│  Gravity (Tier 1 hooks) works whether you're paying    │
│  attention or not — drop a ball, it falls. Speed       │
│  limits (Tier 3 docs) only work if the driver reads    │
│  the sign AND chooses to comply. Tier 2 (workflows)    │
│  is like a speed bump — it slows you down IF you       │
│  drive over it, but you can take a different road.     │
│                                                        │
│  HOW IT MAPS                                           │
│    gravity (always on)   →  Tier 1 hooks (PreToolUse,  │
│                             pre-commit, CI pipeline)   │
│    dropping a ball       →  every Edit/commit/PR fires │
│                             the hook unconditionally   │
│    speed bump            →  Tier 2 workflows (optional │
│                             slash commands)            │
│    taking another road   →  skipping the workflow by   │
│                             not invoking it            │
│    posted speed sign     →  Tier 3 docs (CLAUDE.md     │
│                             rules, retro lessons)      │
│    ignoring the sign     →  rule lost after compaction │
│                             or fatigue                 │
│                                                        │
│  THE MAP                                               │
│                                                        │
│    Tier 1: GRAVITY ══════════════════► Always works    │
│    (hooks)    PreToolUse:Edit ─→ fires every edit      │
│               pre-commit ─→ fires every commit         │
│               CI pipeline ─→ fires every PR            │
│                                                        │
│    Tier 2: SPEED BUMPS ─ ─ ─ ─ ─ ─ ─► Works if used  │
│    (workflows) /ecc-code-review ─→ only if invoked     │
│                /workflow-close ─→ only if remembered    │
│                                                        │
│    Tier 3: POSTED SIGNS · · · · · · ·► Often ignored  │
│    (docs)     CLAUDE.md rules ─→ lost after compaction │
│               Retro lessons ─→ forgotten next sprint   │
│                                                        │
│  CONSTRAINT BOX                                        │
│    IS:      A reliability classification for rules     │
│    IS NOT:  A quality judgment (Tier 3 rules aren't    │
│             bad rules — they're just badly placed)     │
│    DECIDES: Where to invest enforcement effort —       │
│             convert Tier 3 lessons into Tier 1 hooks   │
│                                                        │
│  EASY TO CONFUSE WITH                                  │
│    • hook vs workflow — a hook fires unconditionally   │
│      on the trigger event; a workflow fires only when  │
│      invoked. Enforcement strength comes from the       │
│      auto-fire, not from the rule's wording.            │
│    • doc-rule vs retro-lesson — both are Tier 3 but    │
│      decay differently: doc-rules die to compaction,   │
│      retro-lessons die to sprint amnesia.               │
│                                                        │
│  ONE-LINE HANDLE                                       │
│  "Hooks are gravity — docs are speed limit signs"      │
│                                                        │
│  ANALOGY LIMITS                                        │
│  When reasoning about hook maintenance burden, gravity   │
│  has no cost and is uniform, but real hooks can be       │
│  misconfigured, disabled, or have false positives with   │
│  execution overhead.                                     │
│                                                        │
│  SIGNAL: Quick check ✓                                 │
│  (The concept is intuitive once you see the tiers.     │
│   Don't overthink — the tier system IS the insight.)   │
└────────────────────────────────────────────────────────┘
```

### Example 2: Cache-Read Cost Spiral

```
┌─── GABE BLOCK: Cache-Read Cost Spiral ───────────────┐
│                                                        │
│  THE PROBLEM                                           │
│  65.9% of the $8,812 project cost ($5,808) came from   │
│  the AI re-reading files it had already processed but  │
│  forgotten after compaction. The AI is doing the same  │
│  work over and over.                                   │
│                                                        │
│  THE ANALOGY                                           │
│  A refrigerator with a door that opens every 27        │
│  minutes. Each time the door opens, warm air rushes    │
│  in and the compressor has to run again to cool        │
│  everything back down. The compressor is your cache-   │
│  read cost. The door opening is compaction. If you     │
│  open the door 6x per day, the compressor runs         │
│  constantly. If you open it once, the food (context)   │
│  stays cold (fresh) and the compressor barely runs.    │
│                                                        │
│  HOW IT MAPS                                           │
│    cold food in fridge    →  context held in-window    │
│    door closed            →  session cache is warm     │
│    door opens             →  compaction event fires    │
│    warm air rushes in     →  context summary replaces  │
│                              full detail               │
│    compressor runs        →  AI re-reads files to      │
│                              rebuild lost detail       │
│    compressor kWh bill    →  cache-read token cost     │
│    opening door 6x/day    →  6 compactions per session │
│                                                        │
│  THE MAP                                               │
│                                                        │
│    Session start ──→ AI reads all files ──→ Context    │
│         │                                    warm      │
│         ↓ (27 min)                                     │
│    Compaction ──→ Context compressed ──→ Details lost   │
│         │                                              │
│         ↓                                              │
│    AI re-reads same files ──→ $1.875/1M tokens ──→ $$$│
│         │                                              │
│         ↓ (27 min)                                     │
│    Compaction again ──→ RE-reads AGAIN ──→ $$$$$$      │
│         │                                              │
│    [repeat 6x per day = $5,808 over 18 days]           │
│                                                        │
│  CONSTRAINT BOX                                        │
│    IS:      A feedback loop where context loss causes  │
│             expensive re-reads that cause more context  │
│             bloat that causes more compaction           │
│    IS NOT:  A token pricing problem (rates are fine)   │
│    DECIDES: Session length — shorter sessions with     │
│             fresh context are cheaper than long ones    │
│                                                        │
│  EASY TO CONFUSE WITH                                  │
│    • context loss vs token cost — they're linked but   │
│      distinct. Context loss is the mechanism; token    │
│      cost is one symptom. Fixing one without the other │
│      misses the loop.                                   │
│    • compaction vs re-read — compaction is the trigger;│
│      re-read is the consequence. The compressor runs   │
│      BECAUSE the door opened, not alongside it.         │
│                                                        │
│  ONE-LINE HANDLE                                       │
│  "The refrigerator door opens every 27 minutes"        │
│                                                        │
│  ANALOGY LIMITS                                        │
│  When deciding what to KEEP vs. DISCARD during          │
│  compaction, opening a fridge doesn't lose food, just   │
│  warms it, but compaction actually deletes detail.       │
│  Also re-reading is not uniform like cooling; some       │
│  files get re-read far more than others.                │
│                                                        │
│  SIGNAL: Quick check ✓                                 │
│  (The mechanism is simple — the numbers are shocking    │
│   but the fix is obvious: close the door less often.)  │
└────────────────────────────────────────────────────────┘
```
