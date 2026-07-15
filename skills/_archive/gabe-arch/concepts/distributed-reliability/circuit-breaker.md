---
id: circuit-breaker
name: Circuit Breaker
tier: intermediate
specialization: [distributed-reliability]
tags: [circuit-breaker, failure-isolation, half-open, cascading-failure]
prerequisites: [retry-with-exponential-backoff]
related: [deterministic-fallback-chain, token-budget-caps]
one_liner: "Stop calling a dead downstream — give it time to recover before the next attempt."
---

## The problem

A downstream service goes down and every caller keeps retrying. The service can't recover while being hammered, your threads fill with stuck calls, and the outage cascades into your own system.

## The idea

Track the failure rate; when it crosses a threshold, stop calling for a cooldown, then probe once to decide whether to resume.

## Picture it

A home electrical panel. Current spikes, the breaker trips with a clack, the room goes dark. You wait, check the wiring, flip the switch back — if it trips again, you stop flipping.

## How it maps

```
current spike              →  rising failure rate on a downstream call
breaker trips with a clack →  state transitions to "open"; calls fail fast
the dark room              →  caller short-circuits to fallback (or fast error)
waiting before flipping    →  cooldown timer before probing again
test-flip the switch       →  "half-open" state: one probe call allowed through
lights stay on             →  success closes the breaker; normal traffic resumes
trips again, back off      →  failure reopens breaker; longer cooldown next time
```

## Easy to confuse with

- **open vs closed (intuitive naming inversion)** — "open" means calls are BLOCKED (like an open electrical circuit: no current flows); "closed" means calls PASS THROUGH (closed circuit, current flows). Many readers map the words to the wrong behavior on first encounter.
- **failure threshold vs cooldown duration** — two independent tuning knobs. Threshold governs *when* to trip (e.g., "5 failures in 30 seconds"). Cooldown governs *how long* to stay open before probing. Both matter; they don't substitute for each other.
- **circuit breaker vs retry-with-backoff** — they complement, they don't replace. Retry-with-backoff handles transient failures inside a single call. Circuit breaker handles sustained failures across the caller population. Use them together: retry individual calls with backoff, wrap the whole thing in a breaker for when the retries themselves are failing.
- **half-open vs "testing the water"** — half-open allows exactly ONE probe call. Not N calls with low concurrency — one. If the probe succeeds, the breaker closes; if it fails, back to open with extended cooldown. Misreading this as "reduced traffic" defeats the recovery-while-quiet purpose.

## Primary force

Retrying against a down service makes the outage worse — the service can't recover while being hammered, and your threads pile up waiting on doomed calls. A circuit breaker turns a flood of failures into a controlled trickle: open fails fast, half-open probes recovery with one call, closed resumes normal traffic. That's how you stop the caller from becoming an unintentional denial-of-service attack against its own dependency.

## When to reach for it

- Calls to external services (payment, email, LLM providers) with known failure modes.
- Downstream dependencies where stalled calls would exhaust your thread/connection pool.
- Production paths where cascading failure from one sick dependency is a real risk.

## When NOT to reach for it

- In-process calls — the state-machine overhead outweighs the protection.
- No sensible degraded-mode fallback — "instant failure" may be worse than "slow failure".
- Shared breaker across unrelated endpoints — one bad call trips all of them; scope per-dependency.
- No observability on state transitions — you can't debug a trip you can't see.

## Evidence a topic touches this

- Keywords: circuit breaker, open/closed/half-open, failure threshold, pybreaker, resilience4j
- Files: `**/circuit_breaker*`, `**/resilience*`, `**/clients/*.py`
- Commit verbs: "add circuit breaker", "trip on", "half-open", "fail fast when"

## Deeper reading

- Martin Fowler: "CircuitBreaker" (canonical article)
- Netflix Hystrix docs (deprecated but historically significant)
- pybreaker / resilience4j library docs
