# The Evidence Doctrine (suite convention)

> Suite-owned convention, stated once. Consumers point here: gabe-plan (proof field), gabe-execute
> (evidence tasks), gabe-commit (freshness check), gabe-review (fresh-context evaluation),
> gabe-mockup (L4 render gate, capture). Locked intent: proof scoped by importance; proof form per
> change type; ONE living set per feature (never dated throwaways); evidence doubles as docs/demos.

## 1. Importance filter — proof is declared at plan time, never judged at gate time

- The human declares `proof:` per phase at plan time (the same moment as the tier call). It lives in
  the PLAN.json mirror (`phases[].proof`): the required journey command / spec path / artifact dir —
  or `null` for phases with no runtime requirement. A gate-time classifier is incentivized to
  classify down; the executing AI never gets to decide what deserves proof.
- Ad-hoc work without a plan phase inherits `proof: test` when it touches paths the manifest marks
  critical (`critical_paths` in `.kdbp/BEHAVIOR.md`), else none.
- Everything else is explicitly NOT proof-gated. Enforcement scales with importance.

## 2. Change-type → proof-form map

| Change type | Proof artifact |
|---|---|
| Backend behavior | failing-then-passing test (fails on base, passes on fix) + the run output line |
| Frontend visual | side-by-side: canonical reference (story/design-lab) vs live render, at the manifest's breakpoints |
| End-to-end feature | recorded flow — numbered per-step screenshots, ideally GIF/MP4 — plus the journey test that exercised it |
| Schema/migration | migration up+down run output + row-count/shape check |
| Deploy/promotion | deployed-bundle-hash-changed check + smoke journey on the deployed URL |

The project manifest names the tools (`verify_commands`, `capture`); this table names the forms.

## 3. The living proof set (accumulation convention)

One evidence home per feature — curated, committed, augmented in place:

```
<journey_specs>/                   # manifest key; e.g. tests/web-e2e/
  <feature>.spec.ts                # ONE spec per feature, augmented in place
  proof/<feature>/                 # ONE evidence folder per feature — proof_root; NO dates in names
    manifest.json                  # ALWAYS committed: run status, artifact index, hashes, timestamps
    01-<step>.png … NN-<step>.png  # the CURATED subset — the handful the docs embed, replaced in place
```

Rules:
- **Text manifests are always committed.** (A gitignored run-status manifest was once deleted by a
  background cleanup and every doc page reverted to "not run" — the manifest is the memory.)
- **Screenshots: curated, importance-scoped subset committed**; full run output stays gitignored and
  pruned. No `git add -f` — use an explicit `.gitignore` un-ignore carve-out
  (`!<proof_root>/**`) so the intent is visible in the repo.
- **Dated folders are terminated as a convention.** A new dated dir for a re-run is the smell;
  replace artifacts in place. Existing dated dirs are grandfathered as archives, not templates.
- Superseded-artifact history lives in git history (the file was replaced in place) — reviewers diff
  manifests, not PNGs.

## 4. Freshness enforcement (the commit-gate arm) — staged rollout

The invariant is **freshness, not access**: the newest artifact under the manifest's `proof_root`
must be at least as new as the newest staged source change, whenever the current phase carries a
non-null `proof`. Deterministic script, not model judgment: `gabe-commit/scripts/evidence-freshness.sh`.

- **Stage 1 — WARN-and-LOG (now):** stale/missing evidence prints a visible warning and appends one
  line to `.kdbp/archive/evidence-bypass.log`. Never blocks. This measures the real bypass rate
  instead of pretending a PreToolUse hook is airtight (Bash writes bypass PreToolUse).
- **Stage 2 — promote to Default-FAIL** only where the log shows warnings being ignored, and only on
  the gabe-commit chokepoint (the one gate that actually runs every time) — a Wave-2 decision made
  from the log, not from optimism.
- The Exec-side guard already exists: gabe-execute halts Exec ✅ when required runtime evidence is
  absent (its completion invariant re-reads PLAN.json `proof`).

## 5. Fresh-context evaluation (the second arm)

For `proof: visual | journey` phases, **the verifier of the evidence is not its author**: a
read-only evaluator (an Explore/read-only agent — no Write/Edit) receives the phase's acceptance
criteria + the proof folder and returns PASS / NEEDS_WORK with the failing artifact named.
"Plausibility is not correctness; a reasonable diff plus a broken screenshot is NEEDS_WORK."
gabe-review runs this during its runtime-evidence check; the executing session never grades its own
screenshots.

## 6. Evidence → docs/demos (dual purpose)

- The proof folder IS the docs asset source: doc pages and the docsite embed
  `proof/<feature>/NN-*.png` and the flow GIF directly; doc wiring reads the committed manifest.
- A feature's demo GIF = the journey capture, re-rendered by the manifest's capture tool. No
  separate "make a demo" workflow — demos regenerate whenever the living set is refreshed.

## 7. Capture contract

- Manifest field `capture:` names the tool + breakpoints. Zero-dependency baseline that always
  ships: Playwright video + ffmpeg. Polished candidate: **pagecast** (headless, WSL-safe, GIF/MP4
  with cursor/zoom) — a per-project choice, never a suite dependency. Evaluate it during a project's
  migration/freeze window, not in the suite.
- **Capture mode, not a separate workflow.** The journey specs already perform the real actions;
  capture is a flag on the same run (e.g. `CAPTURE=1`), never a hand-made recording. In capture
  mode the runner (a) injects the cursor-overlay init script — a fixed-position dot tracking
  `mousemove`, shrink-on-press, click ripple — so headless recordings show visible navigation,
  (b) enables Playwright `recordVideo`, and (c) post-renders per this contract. CI runs stay
  capture-off. Proven recipe (working example): the owning project's capture tool dir
  (reference implementation: gustify `.gabe-dogfood/tools/cursor-record.mjs`).
- **Render rules (the color lesson):** MP4/H.264 (`yuv420p`, faststart) is the primary output —
  full color, ~10× smaller than GIF. GIF only where a platform demands it, and then ALWAYS
  full-palette: `palettegen=stats_mode=diff` + `paletteuse=dither=sierra2_4a` — never a reduced
  `max_colors` palette on UI screenshots (visible banding). Slideshow GIFs from step screenshots
  follow the same palette rule.
- **Who triggers a capture:** (1) a `proof: journey` phase's evidence task, when the journey is
  authored or refreshed — the demo regenerates with the proof; (2) docs publication (gabe-docsite
  embedding a feature page) when the existing video is staler than the journey's artifacts;
  (3) an explicit ask ("regenerate the <feature> demo") — routed to the project's journey
  runner/skill, which reads this contract via the manifest. No dedicated suite skill: capture is a
  mode of the journey run, owned per-project.
