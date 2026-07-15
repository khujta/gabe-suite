# Gabe Arch — Taxonomy

The map of tiers × specializations. Each cell represents a target concept density — the catalog is seeded sparsely and grows as real project work surfaces concepts worth promoting.

## Tiers

Three tiers, chosen to keep the mental model compact.

| Tier | Meaning | Test |
|------|---------|------|
| **foundational** | Concepts a developer must know to read modern backend/agent code at all. | Can you describe what this concept solves in one sentence, without an analogy? |
| **intermediate** | Concepts needed to build production systems that survive real traffic. | Can you choose when to use this vs. a simpler alternative, and defend the choice? |
| **advanced** | Concepts where architect-level tradeoffs live. Usually involve cross-specialization reasoning. | Can you construct a scenario where this is the wrong answer, and name the better alternative? |

**Tier is not seniority.** A senior engineer may have advanced mastery of `agent` and foundational-only mastery of `data`. The human's global state tracks tier per specialization, not overall.

## Specializations (7)

| ID | Name | Scope | Seeded from |
|----|------|-------|-------------|
| `agent` | Agent engineering | LLM pipelines, tool use, guardrails, orchestration, agent patterns A/B/C/D, context engineering, progressive disclosure | `refrepos/docs/arch-ref-lib/docs/agent-engineering/`, khujta-mem `anthropic/claude-sdk-architect/` |
| `web` | Web / app architecture | Request/response, stateful vs stateless, API design, versioning, rendering strategies, session state | New |
| `data` | Data architecture | Schemas, migrations, consistency, pagination, caching, indexing, storage engines | New |
| `distributed-reliability` | Distributed systems + reliability | Retries, circuit breakers, timeouts, idempotency, consensus, CAP, SLOs, observability basics, dead-letter queues | New |
| `security` | Security | Authn/authz, input validation, secrets management, threat modeling at the pattern level (not specific CVEs) | New |
| `infra` | Infrastructure | Load balancing, blue/green, health checks, autoscaling, networking primitives, container orchestration | New |
| `cost` | Cost-aware engineering | Model routing, prompt caching, token budgets, cache hit rates, request coalescing, rate limiting for budget, per-pipeline cost measurement | khujta-mem, user values U3/U4/U8 |

### Why these seven, not more

- `agent` is its own specialization because the patterns (pipelines, tool loops, state machines) are genuinely distinct from generic web architecture.
- `distributed-reliability` is one merged spec — in practice retries, circuit breakers, and CAP-level concepts reference each other so constantly that splitting adds navigation cost without pedagogical benefit.
- `cost` is its own spec because in an LLM-heavy practice, cost is a first-class architectural concern (tied to values U3/U4/U8), not an afterthought under infra.
- `ml-ops` (dataset versioning, training pipelines, model registry) is intentionally absent — not this user's domain. Promote if it becomes relevant.
- `frontend` / `backend` split is absent — `web` covers both; specialization by function (data, infra, security) beats specialization by tech layer.
- `testing` is absent — testing is a meta-concern that applies across all specs; it lives in project-specific `.kdbp/` rules, not here.

### When to add a new specialization

Only when all three hold:

1. You have identified 5+ distinct concepts that don't fit any existing spec cleanly.
2. The concepts have real prerequisite dependencies among themselves (not just a grab-bag).
3. A human would reasonably say "I'm working on <X>" where X names the specialization.

Proposals go in `TAXONOMY.md` via edit, not in concept files.

## Specialization membership rules

- A concept declares 1-N specializations in its frontmatter `specialization` array.
- Order matters for display: the first entry is the **primary** spec, the rest are cross-references.
- A concept lives physically in the directory of its primary spec: `concepts/{primary}/{slug}.md`.
- Cross-specialization concepts appear in queries for all their specs but are stored once.

Example:

```yaml
id: retry-aware-cost-cap
specialization: [cost, distributed-reliability]
```

File lives at `concepts/cost/retry-aware-cost-cap.md` (primary = first entry). Queries for either spec include it.

## Seed density targets

Phase 2 seeds this way:

| Specialization | Target count (end of Phase 2) |
|----------------|-------------------------------|
| agent | ~12 |
| cost | ~3 |
| distributed-reliability | ~3 |
| data | ~3 |
| web | ~3 |
| security | ~3 |
| infra | ~3 |

Grows organically thereafter. No maintenance cadence target in v1 — concepts get added when real project topics surface the need.

## Navigation quick reference

From a terminal:

| Goal | Command |
|------|---------|
| See the whole map | `/gabe-teach arch` (dashboard) |
| Explore a spec | `/gabe-teach arch browse agent` |
| Explore a tier | `/gabe-teach arch browse foundational` |
| Teach me a concept | `/gabe-teach arch show <concept-id>` |
| Pick my next concept | `/gabe-teach arch next` |
| I already know this | `/gabe-teach arch verify <concept-id>` (prompts quick-check or skip-check) |

From a concept file:

- `prerequisites` link up the dependency chain
- `related` link sideways to sibling concepts
- `## Deeper reading` links out to long-form references
