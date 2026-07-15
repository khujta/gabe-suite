---
id: health-checks-liveness-readiness
name: "Health Checks: Liveness vs Readiness"
tier: foundational
specialization: [infra]
tags: [health-check, liveness, readiness, kubernetes, lb]
prerequisites: []
related: [load-balancer-basics, blue-green-deploy]
one_liner: "Liveness asks 'are you alive?'; readiness asks 'are you ready for traffic?' — different answers, different actions."
---

## The problem

A new container starts slowly — pool warmup, config load, cache prefill. The orchestrator can't tell "still warming up" apart from "broken", kills it mid-startup, and the service never reaches steady state.

## The idea

Use two separate probes: liveness decides whether to restart the process; readiness decides whether the load balancer sends it traffic.

## Picture it

A restaurant at opening time. One question: "is the chef breathing?" If no, call 911. A different question: "is the kitchen set up — stoves on, ingredients prepped?" If no, don't seat customers yet, but don't replace the chef either.

## How it maps

```
"is the chef breathing?"    →  liveness probe (shallow: process is responsive)
call 911 if no              →  liveness failure → orchestrator restarts container
"kitchen set up yet?"       →  readiness probe (dependencies reachable, warm)
don't seat customers yet    →  readiness failure → LB stops sending traffic
chef keeps setting up       →  container stays alive; no restart triggered
opening-time warmup window  →  startupProbe (Kubernetes) — grace period before
                              readiness is enforced aggressively
```

## Primary force

"Is this instance alive?" and "should the load balancer send it traffic?" are different questions with different correct actions. Liveness failure is drastic — restart the container. Readiness failure is gentle — pause traffic, let the instance recover. Conflating them means a slow-warmup service gets killed mid-warmup, or a flapping dependency triggers a restart storm that makes everything worse.

## When to reach for it

- Any containerized deployment (Kubernetes, ECS, Nomad) behind an orchestrator.
- Services with slow-starting dependencies (connection pools, cache warmup, config load).
- Rolling deploys where new instances need time before receiving traffic.

## When NOT to reach for it

- Truly instant-start, dependency-free services — both probes collapse into one shallow check.
- Same endpoint for liveness and readiness with deep dependency checks — DB flap restarts everyone.
- Liveness probe that queries the DB — DB outage restarts every instance simultaneously.
- Auth-gated health endpoint — LB can't reach it; infinite restart loop.

## Evidence a topic touches this

- Keywords: liveness, readiness, health check, /healthz, startup probe, livenessProbe
- Files: `**/health*`, `**/kubernetes/*`, `**/deploy/*.yaml`
- Commit verbs: "add health check", "liveness probe", "readiness endpoint", "/healthz"

## Deeper reading

- Kubernetes docs: Liveness, Readiness, and Startup Probes
- "Site Reliability Engineering" (Google) ch. 22
