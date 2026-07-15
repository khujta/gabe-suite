# {PROJECT_NAME}

{DOMAIN}

<!-- KDBP-MARKER: gabe-init v1 -->

## KDBP Active

This project uses **KDBP (Khujta Deep Behavioural Protocol)** — structured project memory under `.kdbp/` that every Claude Code session reads. KDBP gives context, plans, values, knowledge, decisions, and quality gates a durable home outside the session window.

Maturity: **{MATURITY}** · Stack: {TECH}

### What to read when

| Moment | File | Why |
|--------|------|-----|
| Session start | `.kdbp/BEHAVIOR.md` | Project identity, maturity, tech stack |
| Before decisions | `.kdbp/VALUES.md` + `~/.kdbp/VALUES.md` | Project + user values override defaults |
| Before implementing | `.kdbp/PLAN.md` | Active phase, task status, tier constraints |
| Before architectural changes | `.kdbp/DECISIONS.md` | Prior decisions + rationale |
| Before creating files | `.kdbp/STRUCTURE.md` | Folder conventions (enforced by gabe-commit CHECK 9) |
| Before editing source | `.kdbp/DOCS.md` | Source → doc drift mappings |
| Pre-commit | `.kdbp/PENDING.md` | Deferred review findings + escalation |
| Incident / audit | `.kdbp/LEDGER.md` | Checkpoint + commit + review history |

### Active commands

| Command | When to use |
|---------|-------------|
| `/gabe-help` | Context-aware "what should I do next?" |
| `/gabe-plan` | Create or view the active plan |
| `/gabe-next` | Router — dispatches to the next phase step |
| `/gabe-execute` | Implement current phase tasks |
| `/gabe-review` | Risk-priced code review with triage + confidence |
| `/gabe-commit` | Commit quality gate — **never use raw `git commit`** |
| `/gabe-push` | Push + PR + CI watch + branch promotion |

### Invariants

1. **No raw commits.** `/gabe-commit` runs CHECK 1–9, deferred scan, doc drift, and the Notable Updates digest. Raw `git commit` bypasses the gate.
2. **PLAN before code.** Check `.kdbp/PLAN.md` phase state (✅/⬜/🔄) before implementing — `/gabe-execute` enforces the Commit-column invariant.
3. **STRUCTURE before placement.** New files must match a pattern in `.kdbp/STRUCTURE.md` — PostToolUse hook warns on drift.
4. **VALUES override defaults.** Project `.kdbp/VALUES.md` + user `~/.kdbp/VALUES.md` outrank model priors.
5. **Orchestration restraint:** before any multi-agent design/mockup fan-out, run the premise past the human with ONE cheap single-agent spike — orchestrate to verify, not to generate taste.

### Full reference

- Suite skills — `~/.claude/skills/gabe-*/SKILL.md`
- Documentation standards — `~/.claude/skills/gabe-docs/SKILL.md`
- User values — `~/.kdbp/VALUES.md` (cross-project)
- Project docs — `docs/` (if present)

<!-- Content above this line is managed by /gabe-init and refreshed by `update` mode. -->
<!-- Add project-specific instructions for Claude Code below. -->
