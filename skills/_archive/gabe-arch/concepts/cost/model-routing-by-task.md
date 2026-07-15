---
id: model-routing-by-task
name: Model Routing by Task Complexity
tier: foundational
specialization: [cost, agent]
tags: [routing, model-selection, haiku, sonnet, opus]
prerequisites: []
related: [pattern-multi-model-pipeline, token-budget-caps]
one_liner: "Cheap model for sorting, expensive only for reasoning — never expose the choice to users."
---

## The problem

Every call running through the biggest model means you pay Opus prices to do work Haiku handles at 98% accuracy. A pipeline where 90% of calls are "classify this" costs 15x what it should — and users never asked for the expensive model anyway.

## The idea

The system routes each call to the cheapest model that meets its accuracy bar for that task — the user never sees or picks the model.

## Picture it

A restaurant kitchen. The salad station doesn't run the grill, and the grill doesn't plate desserts. Each ticket goes to the station built for it, and the customer just gets the dish.

## How it maps

```
incoming order               →  incoming request at the API gateway
expediter reads ticket       →  router inspects task type / metadata
salad station                →  Haiku (cheap, fast, simple shape)
grill station                →  Sonnet (mid-cost, handles reasoning)
pastry station               →  Opus (expensive, reserved for hard logic)
customer sees the dish       →  user sees the answer, never the model name
```

## Primary force

Not all tokens are equal. A classification task Haiku handles with 98% accuracy costs ~3x less than Sonnet and ~15x less than Opus. Routing by task type (not by user choice) means cost scales with problem complexity rather than uniformly per request. Exposing model choice to users pushes an architectural decision into the UX (User Experience) layer where it does not belong.

## When to reach for it

- Multi-stage pipelines where stages have meaningfully different complexity.
- Apps where a ≥10x cost differential between models moves the bottom line.
- Classification-plus-reasoning workflows where classification is 90% of call volume.

## When NOT to reach for it

- Single-call simple apps — the routing overhead exceeds the savings.
- When the cheap model's accuracy tanks and you re-process more than you save — measure first.
- MVPs (Minimum Viable Products) where speed to market matters more than per-call cost.
- Routing by user tier instead of task complexity — monetization leaking into architecture.

## Evidence a topic touches this

- Keywords: Haiku, Sonnet, Opus, model routing, classifier model, cheap model
- Files: `**/model_router*`, `**/config/*.yaml`, `**/routing*`
- Commit verbs: "route to Haiku", "switch model for", "use cheap classifier", "escalate to Sonnet"

## Deeper reading

- User value U6 (Route by Task, Not by User)
- `refrepos/docs/arch-ref-lib/docs/agent-engineering/001-architecture-taxonomy.md` (Pattern B)
