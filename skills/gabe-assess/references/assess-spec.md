# Gabe Assess — full spec

> This file is the binding spec; the SKILL.md core is a summary.
> E1–E7: see `../../gabe-docs/references/execution-contract.md`.

> **Rendering note.** Output templates in this spec wrapped in bare triple-backtick fences are spec-meta delimiters — render their contents as plain markdown at runtime so blast-radius tables display as tables, not monospace code. See `gabe-docs/SKILL.md` § "Runtime output rendering convention".

## When to Use

**Use when:**
- Someone suggests a fix or change and you're about to say "yes" reflexively
- A tangent emerges mid-task that feels quick but might not be
- You're asked to fix something outside your current scope
- A blocker appears and the "obvious" fix has unclear consequences
- A review or roast surfaced gaps and now you need to decide which to address

**Don't use when:**
- The change is trivially scoped (rename a variable, fix a typo)
- You've already assessed and are now implementing
- The change is the planned work itself, not a detour

---

## Required Input

### 1. The Proposed Change

What someone wants to do or is suggesting you do. Can be:

| Input Type | Example |
|---|---|
| **Inline** | "Fix the CORS config on staging Storage" |
| **Reference** | "the two staging issues from the smoke test" |
| **Context** | "this" or "what you just proposed" |

If the change isn't clear, ask: "What specifically is being proposed?"

### 2. Context (auto-detected or stated)

The assessment adapts based on what's happening:
- **Mid-task**: you were doing X, now Y is proposed. Assessment weighs Y against X.
- **Planning**: you're deciding what to do next. Assessment compares options.
- **Post-review**: a review found gaps. Assessment triages which to fix now.
- **Blocker**: something blocks progress. Assessment evaluates the unblock options.

If context is ambiguous, state it: "I'm assessing this as a mid-task detour."

---

## Assessment Dimensions

### D1: Blast Radius

What does this change touch?

| Scope | Meaning |
|---|---|
| **Contained** | Single file, single config, no downstream effects |
| **Local** | 2-5 files in the same feature/module, tests may need updating |
| **Cross-cutting** | Multiple modules, shared infrastructure, or affects other projects |
| **External** | Affects deployed environments, other teams, users, or third-party services |

### D2: Maturity-Appropriate Scope

Is this the right level of fix for where we are?

| Level | What's appropriate |
|---|---|
| **MVP** | Minimum to unblock. Duct tape is fine. Document the shortcut. |
| **Enterprise** | Proper fix with tests. No duct tape, but no gold plating either. |
| **Scale** | Systematic fix. Consider monitoring, rollback, multi-environment. |

The skill identifies which level the CURRENT project/situation is at, and flags when a proposed fix is over-engineered or under-engineered for that level.

Current level := the `maturity:` frontmatter field of `.kdbp/BEHAVIOR.md` (same source /gabe-debt Step 0 uses). If the file/field is absent, print `maturity unknown — assuming MVP` in D2 output — never guess from vibes.

**Posture mix (advisory).** Once the level is known, D2 may cite the archetype posture-mix for that maturity from `templates/archetype-map.md` (or `~/.claude/templates/gabe/archetype-map.md`) — e.g. at MVP lean Prototyper + Builder + Sweeper; at Scale, Sweeper + Grower + Maintainer with a Builder in reserve. This frames *what mode the fix should be made in*, not just its level, and can flag a change made in the wrong posture (Maintainer-grade hardening on a pre-PMF prototype). Advisory only — never a gate.

### D3: Prerequisites

What must be true or verified before this change is safe?

- Dependencies that must exist
- State that must be checked
- Permissions or access required
- Knowledge gaps that could cause the fix to fail or make things worse

### D4: Alternatives

Is there a simpler, cheaper, or more appropriate path?

- **Do nothing**: What happens if we skip this? Is it truly blocking?
- **Defer**: Can this wait? What's the cost of deferring?
- **Minimal**: What's the smallest possible version of this fix?
- **Proper**: What's the "right" fix if we had unlimited time?
- **Workaround**: Is there a way to achieve the goal without this change?

### D5: Structural Fit

Does this change land in known folder patterns, or does it propose new locations?

Requires `.kdbp/STRUCTURE.md`. Skip silently if missing.

From the change description, extract the anticipated file paths (explicit paths, inferred `new file X.py`, or "add Y under Z/"). For each:

| Outcome | Flag |
|---|---|
| Matches an Allowed Pattern at or below project maturity | ✅ in-standard |
| Matches a Disallowed Pattern | ❌ disallowed — explain why |
| No match — new location proposed | ⚠ drift — suggest 2-3 nearest-match allowed patterns, or propose adding this as a new pattern |

A change proposing 3+ files in new locations is a signal — either the STRUCTURE is outdated (project has evolved and needs pattern additions) or the change itself is architecturally questionable. Flag this explicitly in the assessment output.

Output format inside D5:
```
D5 Structural Fit:
  ✅ api/routes/incidents.py (matches api/routes/*.py, MVP tier)
  ⚠ experiments/prompt_eval.py — no matching pattern
    Nearest: tests/**/*.py, scripts/**/*.py
    Suggest: add `experiments/**/*.py` as Enterprise tier, or reroute to scripts/
```

This catches drift at the cheapest moment — before any code is written. Hook + commit-time CHECK 8 remain as safety nets for changes that skip assess.

**Source-of-truth note:** `STRUCTURE.md` Allowed Patterns are the authoritative source for "where files belong" in this project. The `Paths` column in KNOWLEDGE.md Gravity Wells (legacy — only present on projects that still carry a `.kdbp/KNOWLEDGE.md`) is a **derived** view — it maps architectural sections to path globs for activity signals in `/gabe-teach brief`. When STRUCTURE patterns and wells Paths diverge, **STRUCTURE wins**. `/gabe-teach wells → [paths N]` will warn when a user-entered path is absent from STRUCTURE.md Allowed Patterns and suggest adding it there first.

---

## Output Format

```
GABE ASSESS: [change description]
Context: [mid-task / planning / post-review / blocker]

D1 BLAST RADIUS: [Contained / Local / Cross-cutting / External]
   Checked: [files/configs opened this assessment | none — description-only]
   [1-2 sentences: what specifically is touched and what could ripple]

D2 MATURITY SCOPE: [MVP / Enterprise / Scale]
   Current level: [where the project actually is]
   Proposed fix level: [what level the fix is scoped at]
   [Match / Over-engineered / Under-engineered — and why]

D3 PREREQUISITES:
   - [thing to verify or ensure before proceeding]
   - [another prerequisite]
   (if none: "None identified — change is self-contained")

D4 ALTERNATIVES:
   [A] Do nothing    — [consequence]
   [B] Minimal fix   — [what it looks like, effort T-shirt size]
   [C] Proper fix    — [what it looks like, effort T-shirt size]
   [D] Workaround    — [if applicable]

D5 STRUCTURAL FIT: (only if .kdbp/STRUCTURE.md exists)
   ✅ in-standard: [count]   ⚠ drift: [count]   ❌ disallowed: [count]
   [per-file breakdown for drift/disallowed items]

RECOMMENDATION: [A/B/C/D] — [one sentence why]
ONE-LINER: "[memorable handle for this decision — Gabe Lens format]"
```

---

## Compression Modes

### Full (default)

All dimensions, all alternatives. Use when the change isn't trivial and you need to decide.

### Brief (`brief` | `bf`)

```
ASSESS (brief): [change]
Blast: [scope] | Maturity: [match/over/under] | Prereqs: [count]
Rec: [A/B/C/D] — [one line]
Handle: "[one-liner]"
```

Use when you want a quick gut-check, not a full analysis. Good for triaging multiple changes in sequence.

### Inline (`inline` | `il`)

A single sentence inserted into conversation flow, no formatting:

> "Before we fix CORS: that's an External-scope change touching GCP bucket config shared with Gustify — verify Gustify isn't using the same bucket first. Minimal fix is a 1-line gsutil command."

Use when the assessment should feel like a colleague's aside, not a document.

---

## Behavior Rules

### Before Assessing

1. Identify the proposed change clearly. If vague, ask.
2. Identify the context (mid-task, planning, post-review, blocker).
3. Read enough to understand what the change touches — files, configs, environments.

### During Assessment

4. Be concrete. "Cross-cutting" alone is not enough. State what crosses what.
4b. D1 verdicts need receipts: claim Contained/Local only after opening the files/configs the change names. With `Checked: none — description-only`, append `(unverified)` to the D1 classification and name what to open to confirm it.
5. Don't inflate. A contained change is contained. Don't manufacture risk.
6. Don't deflate. If a "quick fix" touches production config, say so.
7. Alternatives must be real options, not straw men. "Do nothing" should state the actual consequence, which might be "nothing bad happens."
8. The maturity judgment is about the PROJECT, not the change. A solo MVP project doesn't need Enterprise-level CORS configuration.
9. Prerequisites should be verifiable — "check X" not "be careful about X."

### After Assessing

10. The recommendation is a suggestion, not a gate. The user decides.
11. The one-liner follows Gabe Lens format: 5-12 words, concrete, survives fatigue.
12. If the assessment reveals the change is trivial after all, say so: "This is contained, no prerequisites, recommend proceeding. No assessment needed."

---

## Sequential Assessment

When multiple changes are proposed together (e.g., "fix these two staging issues"):

1. Assess each separately in brief mode
2. Then produce a combined recommendation:
   - Are they independent or coupled?
   - Should they be done together or sequenced?
   - What's the combined blast radius?

```
ASSESS (batch): [group description]

| # | Change | Blast | Maturity | Rec |
|---|--------|-------|----------|-----|
| 1 | [desc] | [scope] | [match] | [A/B/C/D] |
| 2 | [desc] | [scope] | [match] | [A/B/C/D] |

Combined: [independent / coupled / sequenced]
Order: [which first, if it matters]
Handle: "[one-liner for the batch decision]"
```

---

## Integration with Other Skills

- **After gabe-roast**: Roast finds gaps. Assessment triages which gaps to fix and how. Use `/gabe-assess` on each gap's suggested fix before implementing.
- **Before gabe-align**: If the proposed change is large enough to question alignment, run `/gabe-align shallow` first, then `/gabe-assess` on the aligned approach.
- **With gabe-lens**: Assessment one-liners use Gabe Lens format. If the user needs to understand WHY a change has cross-cutting blast radius, use `/gabe-lens` on the underlying concept.

---

## Example: Staging CORS + Permissions Fix

```
GABE ASSESS: Fix Storage CORS and Firestore permissions for staging scan testing
Context: blocker — fixture pipeline is deployed but can't be verified due to staging infra gaps

D1 BLAST RADIUS: External
   CORS: touches GCP bucket config for boletapp-staging.firebasestorage.app.
   This bucket is shared with Gustify. CORS changes affect all apps using this bucket.
   Firestore: staging rules file is shared between Boletapp and Gustify (documented in INC-001).
   Deploying rules from Boletapp could overwrite Gustify's staging rules.

D2 MATURITY SCOPE: MVP
   Current level: MVP (solo dev, staging env for testing)
   Proposed fix level: MVP-appropriate (config changes, not code)
   Match — but the SHARED infrastructure elevates the blast radius beyond what
   a solo MVP fix normally implies.

D3 PREREQUISITES:
   - Verify Gustify doesn't have its own CORS config on the same bucket
   - Check if staging rules are deployed from Gustify or Boletapp repo (INC-001 says Gustify)
   - Confirm Alice's UID is in the allowedEmails whitelist on staging

D4 ALTERNATIVES:
   [A] Do nothing      — Fixture system works server-side (unit tests prove it).
                          E2E verification deferred until staging infra is fixed separately.
   [B] Minimal fix     — Set CORS on bucket + add Alice to allowedEmails. No rules deploy. (S)
   [C] Proper fix      — CORS + rules deploy from Gustify repo with combined rules. (M)
   [D] Workaround      — Test via admin script (bypass client, call CF directly). (S)

RECOMMENDATION: [B] — CORS is a bucket-level setting (doesn't affect rules),
and allowedEmails is a Firestore doc addition (doesn't require rules deploy).
Neither touches the shared rules file.

ONE-LINER: "Bucket knob and guest list — don't redecorate the shared house"
```
