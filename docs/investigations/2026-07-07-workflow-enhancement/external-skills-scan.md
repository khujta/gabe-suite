# External Skill & Repo Scan — 2026-07-07

**Purpose:** survey publicly available Claude Code skills/repos (Anthropic + community) that
could serve as **references** for this investigation. Gathered via GitHub search + README reads
on 2026-07-07. Star counts as reported by `gh search` that day (approximate, viral repos move
fast). Community skills are **reference-the-technique, not adopt-wholesale** unless noted.

---

## Top picks (read these)

### 1. `anthropics/cwc-long-running-agents` — the single most relevant reference
A "Code with Claude 2026" take-home implementing three quality-loop primitives that are, in
effect, **our Evidence Doctrine + handoff, already built as hooks**:

- **Default-FAIL contract** — a `test-results.json` where every criterion starts `false`; a
  `PreToolUse` hook **blocks marking anything "pass" until the agent has opened the evidence**
  (screenshots / logs / result files). Structural enforcement, not prompt-based.
  → **Thread 3 / Evidence Doctrine's enforcement arm, as a hook** — "proof before done,"
  enforced by the harness instead of by remembering.
- **Fresh-context evaluator** (`agents/evaluator.md`) — a separate agent with **no Write/Edit**,
  grading from a context that never saw the build; returns `PASS` / `NEEDS_WORK`.
  → our Method's adversarial-verify pass + decision #1 (evaluator ≠ builder).
- **Agent-maintained handoff** — `PROGRESS.md` re-read at session start + a `commit-on-stop`
  hook. → decision #2 (self-improving / durable handoff) and `gabe-handoff`.
- **Operator control hooks** — `kill-switch.sh` (halt while `AGENT_STOP` exists), `steer.sh`
  (inject `STEER.md` mid-run). → decision #1 autonomy-with-visibility.
- Grounded in Anthropic eng posts: *Effective Harnesses for Long-Running Agents* (Nov 2025) and
  *Harness Design for Long-Running Application Development* (Mar 2026).

**Verdict: adopt the patterns.** The Default-FAIL contract is a near-drop-in model for the
Evidence Doctrine's enforcement arm. Fable should study this *before* designing the proof
convention from scratch.

### 2. `DietrichGebert/ponytail` — ⭐~77k — encodable restraint (anti-over-engineering)
A **seven-rung decision ladder** run before writing code: necessity (YAGNI) → reuse-in-codebase
→ standard library → native platform → installed dependency → one-line solution → minimal
implementation. Motto: *"lazy about solutions, never about reading."* Non-negotiable carve-outs
(security, data-loss, trust-boundary, accessibility are **never** cut). Installs via plugin
marketplace; runs as lifecycle hooks + skills + an always-on ruleset.

- Maps to **Anti-goals A/B + Target C** ("do the job, don't overfit") — proof the tightrope can
  be a concrete ladder, not a vibe. Also **Thread 4**: rung 2 ("already in the codebase?") is
  literally the Storybook-reuse discipline. Its safety carve-out mirrors our scoped-proof
  (critical pieces always covered).
- **Verdict: reference the ladder.** Encode a similar "reuse-before-build" gate in
  `gabe-review` / `gabe-mockup`. Don't adopt the meme framing wholesale.

### 3. `JuliusBrussee/caveman` — ⭐~86k — the always-loaded surface has measurable cost
Compresses output *style*, never *content* (code/commands byte-exact). A hook activates it from
message one; **`/caveman-compress` rewrites CLAUDE.md-style memory files for ~46% input savings
every session after** (the persistent, always-loaded surface).

- Maps to **Thread 2** — Daisy's "don't bloat the always-loaded descriptions" concern, with a
  number attached. The "compress the always-loaded memory" move is a concrete lever for the
  suite's 19 skill descriptions + CLAUDE.md files.
- **Verdict: reference the technique** (measure + compress always-loaded surfaces). Adopting the
  terse output style is a separate taste call.

---

## Also relevant

### 4. `JuliusBrussee/cavemem` — ⭐~609 — self-improving memory, infra-based
Session events → redact → caveman-compress → SQLite + FTS5, exposed via MCP tools
(`search` / `timeline` / `get_observations`). Captures blockers/solutions for cross-session
recall. → **decision #2 (self-improving)**, but a heavier (SQLite + MCP) alternative to
file-based self-improving skills. **Verdict: reference as a design option**; the
capture→compress→recall *loop shape* is right even if the infra is more than the suite wants.

### 5. `anthropics/skills` — ⭐~159k — canonical Agent Skills structure
`SKILL.md` + frontmatter (`name`, `description`), self-contained folder, a `spec/` (the Agent
Skills standard) and a `template/`, plus production-grade document skills (PDF/DOCX/PPTX/XLSX) as
reference implementations. → **Thread 2 (authoring/altitude)**: confirms the suite's own
SKILL.md convention; the `spec` + `template` are the authoring source of truth.
**Verdict: baseline reference** — align the suite's skill structure + description discipline.

### 6. `anthropics/defending-code-reference-harness` — skills (threat-model/scan/triage/patch) +
an autonomous harness. Another autonomous-loop reference, security-flavored. **Verdict: skim**
for harness structure.

### 7. `trailofbits/skills` — ⭐~6k — a reputable security org's Claude Code skills.
**Verdict: structural reference** for well-authored, non-toy skills.

### 8. Distribution refs — `anthropics/claude-plugins-official`, `claude-plugins-community`,
`anthropics/knowledge-work-plugins`. Plugin-marketplace / packaging patterns, relevant if the
suite ever distributes via the marketplace. **Verdict: note for later.**

---

## Cross-cutting takeaways for the investigation

- **Hooks are the enforcement layer everyone converges on.** cwc's Default-FAIL contract and
  ponytail's always-on ruleset both put the rule in a *hook*, not in prose the agent must
  remember — reinforces §3's `encode-as-hook` target and the Evidence Doctrine enforcement arm.
- **Restraint is encodable.** ponytail proves the "do-the-job-not-overfit" tightrope can be a
  concrete decision ladder.
- **The always-loaded surface has a measurable price.** caveman quantifies it (~46% input
  savings from compressing memory files) — gives Thread 2 a metric, not just a worry.
- **Anthropic already ships the Evidence-Doctrine pattern.** `cwc-long-running-agents` is close
  enough that Fable should treat it as prior art for the proof convention.

**Caveats:** viral community skills (caveman/ponytail) carry huge star counts but are partly
meme-driven — the *underlying technique* is the reference, not necessarily the skill itself.
Verify licenses before borrowing code.

## URLs
- https://github.com/anthropics/skills
- https://github.com/anthropics/cwc-long-running-agents
- https://github.com/anthropics/defending-code-reference-harness
- https://github.com/anthropics/claude-plugins-official
- https://github.com/anthropics/knowledge-work-plugins
- https://github.com/DietrichGebert/ponytail
- https://github.com/JuliusBrussee/caveman
- https://github.com/JuliusBrussee/cavemem
- https://github.com/trailofbits/skills
