---
id: stateful-vs-stateless-services
name: Stateful vs Stateless Services
tier: foundational
specialization: [web]
tags: [state, scaling, session, horizontal-scale]
prerequisites: []
related: [request-response-lifecycle]
one_liner: "Stateless servers scale horizontally; stateful servers scale operationally."
---

## The problem

Capacity is tight, so you add a second instance behind the load balancer. Users start getting logged out at random, carts empty mid-checkout — because instance A holds session data instance B has never heard of.

## The idea

Keep per-request state out of instance memory; store it somewhere shared (database, cache, signed token) so any instance can handle any request.

## Picture it

A drive-through window versus your regular barber. Every car at the window gets a fresh order from whoever's on shift — no memory needed, just add windows. Your barber knows exactly how you like it — impossible to clone; you need that specific person.

## How it maps

```
drive-through window           →  stateless HTTP instance
any staffer can take the       →  load balancer routes freely across instances
  order
"may I take your order?"       →  request carries everything the handler needs
order ticket stuck to the cup  →  signed token / session ID the client presents
shared kitchen and POS         →  external state store: Redis, DB, JWT
your regular barber            →  stateful instance holding in-memory session
can't swap barbers mid-cut     →  sticky sessions required; loses routing freedom
cloning the barber             →  state sync / replication — expensive and fragile
```

## Primary force

State is the enemy of horizontal scale. If instance A knows something instance B doesn't, the load balancer can't route freely — you're forced into sticky sessions, cross-instance sync, or manual coordination. Moving state out of the instance (to Redis, to the DB, to a signed client token) makes every instance interchangeable, which turns capacity from an operational puzzle into a dial you turn. Stateful services aren't wrong, but the tradeoff should be conscious, not accidental.

## When to reach for it

- Any HTTP service you want to scale by adding instances behind a load balancer.
- Serverless runtimes (Lambda, Cloud Run) where instances die and respawn constantly.
- Multi-region deployments where session affinity becomes a liability at the edge.

## When NOT to reach for it

- WebSocket / long-lived connection servers — per-connection state is inherent; plan for affinity.
- Stream-processing where colocated state beats the network cost of fetching every message.
- In-instance session memory used "because it's fast" — fine until you scale and it vanishes.
- Sticky sessions used as a long-term architecture instead of a temporary migration step.

## Evidence a topic touches this

- Keywords: stateless, session, in-memory, horizontal scale, load balancer, sticky session
- Files: `**/session*`, `**/auth*`, `**/server.py`, `**/main.py`
- Commit verbs: "make stateless", "move to Redis", "remove sticky", "externalize state"

## Deeper reading

- "Designing Data-Intensive Applications" (Kleppmann) ch. 1
- The Twelve-Factor App (Factor VI: Processes)
