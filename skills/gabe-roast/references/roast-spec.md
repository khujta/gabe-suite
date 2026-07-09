# Gabe Roast — full spec (split)

> Split from this skill's SKILL.md (B2 skills-only migration, 2026-07-09). This file is the
> binding spec; the SKILL.md core is a summary. E1–E7: see `../../gabe-docs/references/execution-contract.md`.

> **Rendering note.** Output templates in this spec wrapped in bare triple-backtick fences are spec-meta delimiters — render their contents as plain markdown at runtime so gap tables and severity classifications display as tables. See `gabe-docs/SKILL.md` § "Runtime output rendering convention".

## Required Inputs

Every roast requires two inputs. If either is missing, ask before proceeding.

### 1. Target — What to review

| Input Type | Example |
|---|---|
| **File** | `/docs/architecture/PROP-001.md` |
| **Folder** | `/src/services/` (roasts the system implied by the files) |
| **Inline** | A plan, concept, or design described in conversation |
| **Context** | "this conversation" or "what we just discussed" |

When the target is a file or folder, read it fully before starting. For folders, read enough files to understand the system (entry points, core logic, configuration).

### 2. Perspective — Who is attacking

The perspective is **never optional**. Always require it. Examples:

| Perspective | What they look for |
|---|---|
| Architect | Structural flaws, coupling, scalability bottlenecks, missing abstractions |
| UX/UI Designer | Flow gaps, inconsistency, accessibility, information architecture |
| Security Auditor | Attack surfaces, auth gaps, data exposure, injection vectors |
| QA/Testing Lead | Untestable code, missing edge cases, flaky assumptions |
| DevOps Engineer | Deployment gaps, monitoring blind spots, recovery failures |
| Domain Expert | Business logic errors, domain model gaps, real-world mismatches |
| End User | Confusing flows, dead ends, broken expectations |

The reviewer adopts the perspective fully — think like that person, worry about what they worry about, catch what they would catch.

---

## Classification Dimensions

### Maturity Level — When does this gap matter?

These levels apply to ANY artifact — code, designs, plans, workflows, processes. They are not limited to software.

| Level | Prefix | Meaning |
|---|---|---|
| **MVP** | M | Must fix before first use — first users, first presentation, first deployment |
| **Enterprise** | E | Must fix before real conditions — organizations, real load, paying customers |
| **Scale** | S | Must fix before 10x growth — multi-region, compliance, large teams |

### Importance — How bad is it if we ignore this?

| Level | Indicator | Meaning |
|---|---|---|
| **Critical** | `CRITICAL` | System breaks, data loss, security hole, or blocked launch |
| **High** | `HIGH` | Major degradation, user trust erosion, expensive rework later |
| **Medium** | `MEDIUM` | Friction, tech debt accumulation, missed opportunity |
| **Low** | `LOW` | Polish, best practice, future-proofing |

### Ordering

Within the same maturity + importance bucket, order gaps by **impact** — the most damaging gap comes first.

---

## Per-Gap Fields

| Field | Required | Description |
|---|---|---|
| **Gap ID** | Yes | Prefixed by maturity level: M1, M2... E1, E2... S1, S2... |
| **Gap** | Yes | What's missing or broken. 2-3 sentences. Concrete, not vague. |
| **One-liner** | Yes | A Gabe Lens handle — a memorable phrase (5-12 words) that captures the essence of THIS gap. Must survive fatigue and re-anchor the issue without re-reading the description. Concrete, not abstract. |
| **Effort** | Yes | T-shirt size (S / M / L / XL) with confidence: `M (confident)` or `L (uncertain — depends on existing auth layer)`. Never false-precision story points without codebase knowledge. |
| **What we lose** | Yes | The specific consequence of inaction. Not generic ("tech debt") — concrete ("first user with two accounts overwrites their own data"). |
| **Evidence** | Yes | Proof the gap is real, from files opened this roast. Code: `path:line` + ≤2-line quote. ABSENCE claims ("no rate limiting", "nothing validates X"): the search executed + empty result (`grep -rn "rateLimit" src/ → 0 hits`). Docs: §section + quoted sentence. |
| **Suggested fix** | Optional | A concrete recommendation. 1-3 sentences. Include file/component references when the target is code. Skip only when the fix is obvious from the gap description. |

### One-Liner Rules

The one-liner follows Gabe Lens format:
- 5-12 words
- Concrete, not abstract
- Captures the KEY tension or failure mode of this specific gap
- Must be useful standalone — if the reader sees only the one-liner in a summary table, they should recall the gap
- Preferred: physical-system analogy. But if the gap is already concrete, a sharp summary beats a forced metaphor.
- Test: "Would this phrase mean something at 11pm after a long session?"

---

## Output Format — Full Mode

```
GABE ROAST: [Target Name]
Perspective: [Perspective]
Read: [ledger]

═══ MVP ════════════════════════════════════════════════

CRITICAL

  M1
  **Gap:** [What's missing or broken — 2-3 sentences]
  **One-liner:** "[memorable handle]"
  **Effort:** [size] ([confidence])
  **Lose:** [specific consequence of inaction]
  **Evidence:** [citation or search→0 hits]
  **Fix:** [concrete recommendation — optional]

  M2
  **Gap:** [description]
  **One-liner:** "[handle]"
  **Effort:** [size] ([confidence])
  **Lose:** [consequence]
  **Evidence:** [citation or search→0 hits]

HIGH

  M3
  **Gap:** [description]
  **One-liner:** "[handle]"
  **Effort:** [size] ([confidence])
  **Lose:** [consequence]
  **Evidence:** [citation or search→0 hits]
  **Fix:** [suggestion]

MEDIUM

  M4
  ...

LOW

  M5
  ...

═══ ENTERPRISE ═════════════════════════════════════════

CRITICAL

  E1
  ...

═══ SCALE ══════════════════════════════════════════════

HIGH

  S1
  ...

────────────────────────────────────────────────────────
TOTAL: [X] gaps — [Y] critical, [Z] high, [W] medium, [V] low
Effort estimate: [range] ([overall confidence note])
```

### Rules for Full Mode
- Every field label is in **bold** followed by a colon, then the content
- Gap ID (M1, E1, S1) is on its own line as a header for the gap
- Suppress empty maturity levels entirely (no empty headers)
- Suppress empty importance levels within a maturity level
- Each gap is separated by a blank line for readability
- The summary line at the bottom gives totals and aggregate effort

---

## Output Format — Brief Mode

Brief mode produces a scannable table. All fields compressed to one line each.

```
GABE ROAST (brief): [Target Name] — [Perspective]

| ID | Maturity | Importance | Gap | One-liner | Effort |
|----|----------|------------|-----|-----------|--------|
| M1 | MVP | Critical | [short description] | "[handle]" | S |
| M2 | MVP | High | [short description] | "[handle]" | M |
| E1 | Enterprise | Critical | [short description] | "[handle]" | L |
| E2 | Enterprise | Medium | [short description] | "[handle]" | S |
| S1 | Scale | High | [short description] | "[handle]" | XL |

TOTAL: [X] gaps — [Y] critical, [Z] high
```

### Rules for Brief Mode
- Table sorted by: Maturity (MVP first) then Importance (Critical first) then Impact
- Gap description truncated to ~15 words max
- "What we lose" and "Suggested fix" omitted
- Evidence text is omitted in brief, but the kill-gate (rule 12) still runs first — unevidenced gaps never reach the table.
- Use when scanning or comparing, not when deciding

---

## Behavior Rules

### Before Roasting
1. Confirm both inputs are present (target + perspective). If either is missing, ask.
2. **Pre-roast gate:** Run `/gabe-align shallow` on the target (core values A1-A3 + project values). If all PASS: proceed. If CONCERN: print warning, proceed. If FAIL: print warning + "Foundational alignment issue. Consider `/gabe-align standard`. Proceed? [y/n]". Skip this gate if no `.kdbp/VALUES.md` or `~/.kdbp/VALUES.md` exists.
3. Read before attacking — measurable, not vibes:
   (a) list the folder tree first; (b) open every entry point + config;
   (c) never cite or roast a file you did not open this session;
   (d) print a read ledger in the output header, directly under Perspective:
       `Read: 14/38 files — skipped: tests/, assets/`.
4. If the target references other files (imports, links, config), read those too — gaps often hide at boundaries.

### During the Roast
5. Stay in character as the perspective. An architect doesn't flag typos. A UX designer doesn't flag missing database indexes.
6. Be specific. "Error handling is weak" is not a gap. "The `/api/checkout` endpoint catches all exceptions with a generic 500, hiding payment failures from the user and from monitoring" is a gap.
7. Don't pad. If there are only 3 gaps, report 3 gaps. Don't invent LOW items to fill a quota.
8. Don't repeat. If the same issue manifests in multiple places, it's ONE gap with multiple locations listed, not separate gaps.
9. Classify honestly. Not everything is CRITICAL. Inflation of importance defeats the purpose.

### After the Roast
10. The summary line is mandatory. It gives the reader a pulse check without re-reading.
11. If zero gaps are found (rare), say so explicitly: "No gaps found from [perspective] perspective at any maturity level." Don't manufacture findings.
12. **Kill-gate (mandatory before printing).** Re-verify every gap against its Evidence; for absence claims run the targeted search NOW if not yet recorded. A gap with an empty Evidence field is DELETED, not demoted to LOW. Print above TOTAL: `drafted N → killed X → reported Y`.

### Sequential Roasting

The most effective pattern is roasting the same target from multiple perspectives in sequence (e.g., architect → UX designer → domain expert). When performing a follow-up roast on the same target:

- Before a follow-up roast, LOCATE the previous roast output (file or earlier message) and re-read it — list its gap IDs + one-liners first, then tag every new gap `NEW` or `covered by <ID>`. If the prior output cannot be located, say so in the header and roast fresh — never dedup from memory.
- Each perspective produces its own numbered gaps (M1/E1/S1 restart per roast)
- After multiple passes, the combined gap list gives a 360-degree view of the target

---

## When to Use

**Use Gabe Roast for:**
- Self-review of your own designs before building — the most effective use. You already know what you intended; the roast finds what you missed.
- Pre-implementation review of architecture proposals or plans
- Post-implementation review before shipping or merging
- Validating designs from a stakeholder perspective you don't naturally think from
- Stress-testing workflows, processes, or playbooks
- Finding blind spots by deliberately adopting an adversarial viewpoint

**Don't use Gabe Roast for:**
- Code style reviews (use a linter)
- Line-by-line code review (use a code reviewer)
- Requirements gathering (roast finds what's MISSING, not what should be BUILT)
- Trivial targets where a roast would be overkill (a 5-line utility function)

---

## Example

```
GABE ROAST: MOCKUP-PLAN.md
Perspective: UX Designer

═══ MVP ════════════════════════════════════════════════

CRITICAL

  M1
  **Gap:** The plan starts with 12 isolated screen mockups but
  defines no user flow diagrams. Without flows, each screen is
  designed in a vacuum — transitions, data handoffs, and
  navigation paths are undefined.
  **One-liner:** "Building rooms before drawing the hallways"
  **Effort:** M (confident)
  **Lose:** Every screen gets reworked once flows reveal they
  don't connect.
  **Fix:** Add a Phase 0 that maps the 5 primary user journeys
  before any screen work begins.

HIGH

  M2
  **Gap:** Component library is extracted BEFORE screens exist.
  Designers can't extract reusable components from screens they
  haven't made yet — the components will be hypothetical, not
  battle-tested.
  **One-liner:** "Packing a suitcase before knowing the destination"
  **Effort:** S (confident)
  **Lose:** Component library gets rebuilt from scratch once real
  screens reveal actual patterns.
  **Fix:** Reverse order — screens first (Phase 2), component
  extraction at a checkpoint after.

═══ ENTERPRISE ═════════════════════════════════════════

MEDIUM

  E1
  **Gap:** No interaction specification template. Mockups show
  static layouts but gesture behaviors (swipe, long-press,
  pull-to-refresh), transition animations, and loading states
  are unspecified.
  **One-liner:** "A blueprint with no doors marked"
  **Effort:** S (confident)
  **Lose:** Developers implement inconsistent interactions across
  screens; QA has no spec to test against.
  **Fix:** Add an Interaction Notes section to each mockup template.

────────────────────────────────────────────────────────
TOTAL: 3 gaps — 1 critical, 1 high, 1 medium
Effort estimate: S-M range (confident — scope is documentation, not code)
```
