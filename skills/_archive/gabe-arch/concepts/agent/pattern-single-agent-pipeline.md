---
id: pattern-single-agent-pipeline
name: "Pattern A: Single Agent + Deterministic Pipeline"
tier: foundational
specialization: [agent]
tags: [pattern, pipeline, deterministic, mvp]
prerequisites: []
related: [pattern-multi-model-pipeline, pattern-tool-use-loop, structured-output-enforcement]
one_liner: "One agent + fixed deterministic stages around it — the boring pattern that wins."
---

## The problem

Teams reach for LangGraph or multi-agent swarms before they have one working pipeline, and ship nothing for weeks. The task at hand — triage, routing, moderation — usually needs one reasoning step bolted onto a fixed flow, and the extra framework complexity buys only more ways for non-determinism to bite on every layer.

## The idea

Wrap one LLM call in deterministic pre- and post-stages (guard, classify, notify) — the model does the one hard decision, everything else is plain code.

## Picture it

An assembly line with one skilled worker in the middle. Conveyor belts handle the routine parts; the worker makes the single decision machines can't. Predictable, inspectable, cheap to run.

## How it maps

```
the conveyor in            →  input validation + guardrails (deterministic)
the skilled worker         →  single LLM call with a structured output_type
the conveyor out           →  notification / side-effect / response shaping
the foreman's checklist    →  fixed flow — no branching on model whim
the one worker, not ten    →  one non-deterministic stage, easy to debug
the assembly-line log      →  structured trace per stage, per request
```

## Primary force

Deterministic pipelines fail predictably. When only one stage uses a model, you can reason about, test, and debug the system without tripping over non-determinism at every layer. Across a survey of production agent teams, Pattern A was the most common shipped-and-running architecture — complexity is not maturity.

## When to reach for it

- Most agent MVPs and production apps with clear input/output contracts.
- Incident triage, support routing, content moderation — fixed flow plus one reasoning step.
- Teams that need to ship in days, not weeks, with 5-15s acceptable latency.

## When NOT to reach for it

- Agent needs to choose its own investigation path — reach for Pattern D (tool-use loop).
- Multi-step reasoning where each step spawns sub-tasks — reach for Pattern C (state machine).
- Making the single agent stage too broad — split it into classify + act before it becomes a god-function.
- Skipping guardrails or progress streaming because "it's just one agent" — pre-agent validation is cheaper than post-agent cleanup, and 10s of silence kills user trust.

## Evidence a topic touches this

- Keywords: single agent, deterministic pipeline, triage, classify-then-act, one agent
- Files: `**/pipeline.py`, `**/triage.py`, `**/agent/orchestrator*`
- Commit verbs: "add pipeline", "wire agent", "classify then route"

## Deeper reading

- `refrepos/docs/arch-ref-lib/docs/agent-engineering/001-architecture-taxonomy.md`
- `refrepos/docs/arch-ref-lib/docs/agent-engineering/003-level-2-structured-agent.md`
