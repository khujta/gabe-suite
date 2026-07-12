# Workflow Enhancement Investigation — 2026-07-07

Self-contained working folder for the Gabe Suite **workflow-enhancement** investigation.
Everything produced for it lives here so the work stays together.

- **Status:** Ready to run — **analyze + plan only** (no changes land until the operator approves). Uncommitted.
- **Target analyst:** Fable 5, next availability window.
- **Prepared:** 2026-07-07 (Opus 4.8 session, at the operator's direction).

## Contents

- **[KICKSTART.md](KICKSTART.md)** — the paste-able prompt to launch the Fable run (paste into a
  fresh session). **Run this first.**
- **[BRIEF.md](BRIEF.md)** — the investigation brief. **Read §2A first** (the
  operator's 7 locked decisions + the Evidence Doctrine). Self-contained — a cold session can
  execute it without extra context.
- **[external-skills-scan.md](external-skills-scan.md)** — web/GitHub scan (2026-07-07) of
  Anthropic skill repos + notable community skills (ponytail, caveman, cavemem) mapped to the
  threads, with adopt/reference verdicts. Top pick: `anthropics/cwc-long-running-agents`.
- **[simplify-and-e2e-proof-scan.md](simplify-and-e2e-proof-scan.md)** — focused scan
  (2026-07-08): a **simplify step after review** (built-in `/simplify` + `/gabe-simplify`
  wrapper idea) and **E2E proof/GIF generation** (Playwright + `pagecast`, WSL-safe) for
  evidence that doubles as docs/demos.
- **[documentation-skills-scan.md](documentation-skills-scan.md)** — market scan (2026-07-08)
  of documentation skills/standards to learn from: **HADS** (human+AI doc format), **Diataxis**,
  drift-closing (changelog/OpenAPI/ADR), and the **living-docs** principle that parallels the
  Evidence Doctrine's living test set.
- **refs/** — four Anthropic-talk **mini-summaries** (timestamped rubrics, not verbatim
  transcripts) that ground the analysis:
  - `wI0ptqCSL0I-summary.txt` — *Stop babysitting your agents* (Sid Buddhisara)
  - `tuY2ChJIx48-summary.txt` — *Beyond the basics with Claude Code* (Daisy Holman)
  - `boris-jarred-bun-session-summary.txt` — Boris Cherny × Jarred Sumner (Bun)
  - `ara-agent-native-verification-workshop-summary.txt` — "Ara" (agent-native verification)

## Opening move (for the Fable session)

> Paste **`KICKSTART.md`** into a fresh Fable session. (In short: read `BRIEF.md` from §2A and
> run the Method as a read/analyze multi-agent Workflow — **Fable** for planning/synthesis,
> **Sonnet** for the mechanical fan-out — writing deliverables to `output/`.)

## Convention

Future investigations each get their own dated folder under `docs/investigations/`
(`YYYY-MM-DD-<name>/`), so every investigation's brief, references, and outputs remain
self-contained in one place.
