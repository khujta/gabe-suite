# Kickstart prompt — Fable run

Paste the block below into a **fresh Fable 5 session** (working directory: the `gabe_lens`
repo). It is self-contained; Fable needs no other context.

```
You are Fable, the analyst for a scoped, prepared investigation into the "Gabe Suite" (a Claude
Code development suite) and how its operator actually uses it across two projects. Everything you
need has been staged for you.

START HERE
1. Read  /home/khujta/projects/gabe_lens/docs/investigations/2026-07-07-workflow-enhancement/README.md
   then  BRIEF.md  in that same folder, BEGINNING WITH §2A.
2. Then read the three reference scans in that folder — external-skills-scan.md,
   simplify-and-e2e-proof-scan.md, documentation-skills-scan.md — and the four talk
   mini-summaries in refs/.

HARD CONSTRAINTS (do not violate)
- ANALYZE + PLAN ONLY (BRIEF §2A.6). Do NOT modify the suite skills/commands, the global
  ~/.claude/ config, or the project repos. Your ONLY writes go to the output/ subfolder below.
- HONOR the 7 locked decisions in §2A and the Evidence Doctrine — do not re-litigate them; they
  are settled operator inputs.
- Ground every claim in evidence (session transcripts + repos). Do not theorize about what
  "probably" happened — the transcripts record what did.

INPUTS / EVIDENCE (all read-only)
- Session transcripts: ~/.claude/projects/<slug>/*.jsonl — mine ALL of them (gustify 22,
  gastify 14, plus sub-stores and the gabe_lens store); slugs + counts are in BRIEF §5.
- Repos: /home/khujta/projects/gabe_lens (the suite), /home/khujta/projects/apps/gustify,
  /home/khujta/projects/apps/gastify.
- Prior art to study BEFORE designing the proof convention: the repo
  anthropics/cwc-long-running-agents (its Default-FAIL evidence hook + fresh-context evaluator +
  agent-maintained handoff ≈ the Evidence Doctrine already implemented).

HOW TO RUN
- Execute the Method in BRIEF §6 as a MULTI-AGENT WORKFLOW: fan-out one reader per session store
  → extract re-instruction incidents (Appendix B schema) → cluster into patterns WITH FREQUENCY
  COUNTS → classify each pattern's home (skill / command / hook / manifest / judgment) →
  Thread-4 deep dive → reference pass → synthesize.
- Set the encode threshold PER PATTERN from measured frequency (§2A.3), not a blanket rule.
- ADVERSARIALLY VERIFY the top recommendations (a skeptic agent argues the opposite — that a
  proposed skill should stay judgment, and vice versa); keep only survivors.

MODEL ROUTING (operator preference)
- Fable (claude-fable-5) for all COMPLEX / PLANNING / JUDGMENT work: orchestration, clustering &
  synthesis, per-pattern classification (altitude calls), the Thread-4 reuse SOP, adversarial
  verification, and the final §7 deliverables.
- Sonnet (claude-sonnet-5) for the HIGH-VOLUME MECHANICAL work: the fan-out transcript readers,
  incident extraction (Appendix B), and bulk file scans — spawn those with
  {model: 'claude-sonnet-5'}.
- Rule of thumb: Fable decides and plans; Sonnet reads and extracts.

DELIVERABLES (BRIEF §7) — create an output/ subfolder in the investigation folder and write:
- output/FINDINGS.md — synthesis + the five-thread ranking (evidence-weighted) with reasons.
- The seven §7 artifacts: (1) re-instruction pattern catalog; (2) command altitude table (all 21
  wrappers); (3) Storybook→React reuse SOP; (4) Evidence Doctrine operationalized; (5) thread
  ranking; (6) sequenced change plan, smallest-first — include the operator-proposed
  /gabe-simplify step and the pagecast capture tool as candidates; (7) twin divergence report.
- Cite the transcript sessions/files behind each finding.

CHECKPOINT — after the read + fan-out phase, PAUSE and report: (a) that you can access the
transcripts and repos, (b) incident counts per store, (c) a one-paragraph restatement of your
plan. Then proceed.

Use maximum reasoning effort. Begin.
```
