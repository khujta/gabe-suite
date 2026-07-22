# Archetype Map

Five work-mode archetypes — a way to name *what posture* a person (or agent) is in
while running the lifecycle, independent of *which beat* they are on. The set comes from
the observation that engineering/product/design roles are melting into a few recurring
modes: **Prototyper · Builder · Sweeper · Grower · Maintainer**.

These are advisory. They are a **reading of the maturity axis the suite already tracks**
(`.kdbp/BEHAVIOR.md` `maturity:` — MVP/Enterprise/Scale), *not* a second level system and
*not* a parallel command set. The lifecycle is still organized by beats; an archetype only
tells you which posture to run those beats in, and which mix of postures a given maturity
calls for.

## Runtime contract

- Load this catalog for archetype-aware commands from the first available path:
  `templates/archetype-map.md`,
  `~/.claude/templates/gabe/archetype-map.md`.
- Two consumers:
  - `/gabe-roast` — the five names are **canonical perspectives** (`/gabe-roast Sweeper <target>`);
    each has a fixed attacking lens below so the perspective means the same thing every run.
  - `/gabe-assess` — D2 may cite the **maturity → posture mix** below when advising scope.
- Advisory only. Archetypes never gate a commit, review, or PR. They set what the reviewer
  worries about or which posture a fix should be made in — never the output contract.
- Maturity vocabulary here IS the suite's MVP/Enterprise/Scale, mapped to the product-stage
  framing (pre-PMF / growing / strong-PMF). Do not invent new level names.

## The five archetypes

### Prototyper

**Mode:** churns brand-new ideas; most never ship.
**Optimizes for:** idea throughput and speed to a first signal.
**Tolerates:** mess, no tests, throwaway code, dead branches.
**Refuses:** commitment and polish before the idea is validated.
**Dominant maturity:** MVP (pre-PMF).
**Runs (beats):** thin in the suite today — `/gabe-scope` and `/gabe-plan` are *deliberate*,
  checkpoint-gated authoring, the opposite of throwaway churn. This is the one archetype the
  lifecycle under-serves; name it honestly rather than pretend a beat covers it.
**Roast lens (what a Prototyper attacks):** commitment too early — infrastructure, polish, or
  abstraction built before anyone proved the idea is worth building.

### Builder

**Mode:** turns a prototype or idea into production-grade product/infra.
**Optimizes for:** the path from "it works on my machine" to shippable.
**Tolerates:** narrowing scope to land something real.
**Refuses:** gold-plating and speculative generality.
**Dominant maturity:** MVP → Enterprise (pre-PMF → growing).
**Runs (beats):** the core loop — `/gabe-red` → `/gabe-execute` → `/gabe-review` →
  `/gabe-commit` → `/gabe-push`.
**Roast lens (what a Builder attacks):** what is not production-grade yet — missing tests,
  unhandled failure paths, config that only works locally, the gap between demo and product.

### Sweeper

**Mode:** cleans up the UI, simplifies code and system, unships, optimizes performance.
**Optimizes for:** simplicity, smaller surface, speed.
**Tolerates:** deleting work — including its own.
**Refuses:** adding new surface when subtraction would do.
**Dominant maturity:** MVP *and* Scale (matters early to stay lean, and late to stay fast).
**Runs (beats):** `/gabe-commit` simplify-tier · `/gabe-health` · `/gabe-debt`.
**Roast lens (what a Sweeper attacks):** unnecessary surface, complexity, dead code paths,
  unshipped cruft, duplicated abstractions, slow hot paths.

### Grower

**Mode:** takes a built product and iterates on it to improve product-market fit.
**Optimizes for:** PMF — moving a real metric on a live product.
**Tolerates:** churn and rework on something already shipped.
**Refuses:** greenfield rewrites when iteration would learn faster.
**Dominant maturity:** Enterprise (growing).
**Runs (beats):** `/gabe-feature`/command center · `/gabe-scope-change`.
**Roast lens (what a Grower attacks):** what blocks PMF iteration — outcomes that can't be
  measured, friction that makes change slow, features that ship but can't be learned from.

### Maintainer

**Mode:** owns a mature system to keep it secure, reliable, fast, and efficient as it scales.
**Optimizes for:** reliability, security, operability under growth.
**Tolerates:** slow, deliberate change with a paper trail.
**Refuses:** any regression to a working invariant.
**Dominant maturity:** Scale (strong-PMF).
**Runs (beats):** `/gabe-align` · `/gabe-commit` gates · `/gabe-push` CI + deploy-verify ·
  the "scale" tier.
**Roast lens (what a Maintainer attacks):** what breaks at 10x — regressions, reliability
  gaps, security holes, missing rollback/monitoring, operability blind spots.

## Maturity → posture mix (for /gabe-assess D2)

A healthy effort mixes postures by product stage. Given the project's `maturity:`, D2 can
advise which mix fits — and flag a change made in the wrong posture (e.g. Maintainer-grade
hardening on a pre-PMF prototype).

| Project maturity | Product stage | Dominant mix | Reserve |
|---|---|---|---|
| **MVP** | pre-PMF | Prototyper + Builder + Sweeper | — |
| **Enterprise** | growing | Builder + Sweeper + Grower | + some Maintainer |
| **Scale** | strong-PMF | Sweeper + Grower + Maintainer | + some Builder |

Read it as: *find the thing* (MVP) → *grow the thing* (Enterprise) → *hold the thing* (Scale).

## How the suite already serves each archetype

The archetypes are not new capabilities — they are a lens over work the beats already do.
Builder ≈ the core loop; Sweeper ≈ commit simplify-tier + health + debt; Grower ≈ feature/
center + scope-change; Maintainer ≈ align + commit/push gates + the scale tier. Prototyper is
the honest gap: no beat is built for throwaway idea-churn, and the map says so rather than
claiming coverage that isn't there.

## Guardrail

If you find yourself treating an archetype as a required step, a status, or a competing
"level," stop — that is the failure mode this map is written to avoid. It is a posture and a
mix, read off the maturity the project already declares. Beats sequence the work; tiers set
its rigor; archetypes only name the mode.
