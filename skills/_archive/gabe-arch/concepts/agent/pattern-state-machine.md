---
id: pattern-state-machine
name: "Pattern C: LangGraph State Machine"
tier: advanced
specialization: [agent]
tags: [pattern, state-machine, checkpoint, human-in-loop]
prerequisites: [pattern-single-agent-pipeline, deterministic-fallback-chain]
related: [pattern-tool-use-loop, agent-observability]
one_liner: "Nodes + edges + checkpoints — for agents that must survive restarts and pause for humans."
---

## The problem

A 90-second multi-stage agent fails two minutes in — right after the expensive model call, before the final one. Without checkpointing, you re-run from the top at full cost, and there's no single place to pause the flow for a human approval that the compliance team requires.

## The idea

Model the agent as named nodes connected by edges with durable checkpoints, so you can resume from the last good state and pause at designated nodes for humans.

## Picture it

A manufacturing line with inspection checkpoints. The product stops at each station, gets stamped, and if the power goes out the line resumes from the last stamp — not from raw materials.

## How it maps

```
each inspection station     →  a named node in the graph
the stamp on the product    →  checkpoint write (durable state transition)
the conveyor routing        →  edges (conditional or straight-through)
the emergency pause button  →  human-in-the-loop interrupt at a node
resuming after power-out    →  restart from last checkpoint, not from scratch
the station manifest        →  audit trail of which node produced what
the spec sheet              →  StateGraph definition (typed, inspectable)
```

## Primary force

Complex multi-stage agents fail in the middle — after the expensive step, before the final one. Without checkpointing, a failure forces a full re-run at full cost. A state machine with persisted transitions lets the system resume from the last good state, pause for human approval at specific nodes, and produce a complete audit trail of what happened where.

## When to reach for it

- Long-running multi-stage agent tasks where end-to-end runtime exceeds 60 seconds.
- Workflows that must survive process restarts — checkpoint/recovery is load-bearing.
- Enterprise systems requiring human-in-the-loop approval at specific stages, with full audit trail.

## When NOT to reach for it

- MVP agent apps — Pattern A is 10x faster to ship and you don't yet know your stage boundaries.
- High-throughput, low-latency paths — state machine overhead is real and persistence is not free.
- 30-node graphs where 5 would do — more nodes mean more debugging surface, not more correctness.
- Paying the complexity tax without collecting the benefit — no human-in-loop, in-memory state only, no audit consumers.

## Evidence a topic touches this

- Keywords: LangGraph, state machine, StateGraph, checkpoint, node, edge, human-in-loop
- Files: `**/graph*`, `**/nodes/*`, `**/langgraph*`
- Commit verbs: "add node", "wire edge", "add checkpoint", "pause for human"

## Deeper reading

- `refrepos/docs/arch-ref-lib/docs/agent-engineering/001-architecture-taxonomy.md` (Pattern C)
- `refrepos/docs/arch-ref-lib/docs/agent-engineering/005-level-4-production-pipeline.md`
