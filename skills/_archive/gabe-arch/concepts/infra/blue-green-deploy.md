---
id: blue-green-deploy
name: Blue / Green Deployment
tier: intermediate
specialization: [infra]
tags: [deployment, zero-downtime, rollback, canary]
prerequisites: [load-balancer-basics, health-checks-liveness-readiness]
related: [schema-evolution-expand-contract]
one_liner: "Two identical production environments — deploy to the inactive one, flip traffic when green."
---

## The problem

A bad deploy lands in production and rollback takes minutes while old and new instances run side by side under a rolling update. Every minute costs users; you need a rollback that's measured in seconds, not deploy cycles.

## The idea

Run two full copies of production; deploy to the idle one, verify it, then flip traffic at the load balancer in a single step.

## Picture it

Two dining rooms set for the same party. Blue has guests mid-meal with the old menu. Green is fully prepped with the new menu — tables set, candles lit, food ready. When green looks right, you walk guests across. If the new menu goes badly, they walk straight back to blue.

## How it maps

```
blue dining room              →  current production environment serving traffic
green dining room             →  parallel environment running the new version
setting green's tables        →  deploy new code to green; wait for readiness
tasting before seating guests →  smoke tests / synthetic checks on green
walking guests across         →  LB traffic switch from blue → green (atomic cutover)
guests walk back to blue      →  rollback = flip the LB back; blue was never torn down
tearing down blue later       →  decommission old environment after a hold period
shared kitchen across rooms   →  shared database — needs expand/contract migrations
```

## Primary force

Rolling deploys mix old and new code across the fleet during the deploy window, which makes rollback slow and messy — you have to un-roll whatever you already rolled. Blue/green keeps two complete environments and flips atomically at the load balancer. Rollback becomes a single flip back, so the blast radius of a bad deploy is seconds. The price is doubled infrastructure during the deploy window — you're paying for two production-grade environments to get instant reversibility.

## When to reach for it

- Production services where any user-visible downtime during deploys is unacceptable.
- Deploys that need a verification window — run smoke tests on green before the cutover.
- Strict rollback SLOs — pre-deploy state must be recoverable in seconds, not minutes.

## When NOT to reach for it

- Budget-constrained systems — idle green is too expensive; prefer a rolling deploy.
- Shared DB without expand/contract migrations — blue breaks the moment green adds a column.
- No smoke tests on green before the flip — you'll find the bug after real traffic lands.
- Stateful connections (WebSockets, long polls) with no graceful migration plan on blue.

## Evidence a topic touches this

- Keywords: blue green, canary, deploy, zero-downtime, cutover, traffic shift
- Files: `**/deploy/*`, `**/terraform/*`, `**/ci/*`
- Commit verbs: "blue/green deploy", "shift traffic", "flip to green", "roll back to blue"

## Deeper reading

- Martin Fowler: "BlueGreenDeployment"
- AWS CodeDeploy blue/green docs
- Netflix's canary analysis: Spinnaker + Kayenta
