---
id: pattern-multi-model-pipeline
name: "Pattern B: Multi-Model Staged Pipeline"
tier: intermediate
specialization: [agent, cost]
tags: [pattern, pipeline, cost-optimization, model-routing]
prerequisites: [pattern-single-agent-pipeline, model-routing-by-task]
related: [pattern-state-machine, structured-output-enforcement]
one_liner: "Different models at different stages — cheap for sorting, expensive only for reasoning."
---

## The problem

Sending every request through one expensive model is the wrong answer when 90% of those requests only need a cheap classifier. At thousands of incidents a day the bill scales linearly with volume when it should scale with complexity — a $0.05-per-incident agent that could have cost $0.007.

## The idea

Route each pipeline stage to the minimum-capability model that can handle it — cheap for classification and sorting, expensive only for the stage that actually reasons.

## Picture it

A hospital intake. A receptionist checks you in, a triage nurse scores urgency, a specialist sees you only when the case warrants it. Nobody pays a surgeon to take a temperature.

## How it maps

```
the receptionist              →  rule-based or keyword filter (near-zero cost)
the triage nurse              →  cheap classifier model (Haiku, small LLM)
the specialist                →  expensive reasoning model (Sonnet, Opus)
the intake form               →  structured schema passed between stages
the triage decision           →  routing label selecting the next stage
the billing department        →  per-stage cost metric (not per-request)
escalation to the specialist  →  only complex cases invoke the expensive model
```

## Primary force

One expensive model per request is the wrong answer when 90% of requests only need a cheap classifier. Multi-model pipelines route each stage to the minimum-capability model that can do the job, so cost scales with complexity rather than volume. A measured production system ran at $0.007/incident using five models where a single Claude call would have cost $0.05+.

## When to reach for it

- Per-incident cost is load-bearing — high volume, thin margin, measured spend.
- Task decomposes cleanly into cheap-to-classify plus expensive-to-reason stages.
- You have measured per-stage cost and accuracy, and the cheap/expensive split is 10x+ favorable.

## When NOT to reach for it

- MVPs where cost isn't yet a concern — Pattern A is faster to ship.
- The cheap model routinely misroutes and you end up re-processing on the expensive one.
- Latency budget under 5s — stage-to-stage serialization overhead adds up.
- Hard-coded model choices with no per-stage metrics — you can't optimize what you don't measure.

## Evidence a topic touches this

- Keywords: model routing, Haiku, Sonnet, multi-model, classifier, cheap classify
- Files: `**/model_router.*`, `**/classifier.py`, `**/stages/*`
- Commit verbs: "route to", "switch to Haiku", "classify with cheap model"

## Deeper reading

- `refrepos/docs/arch-ref-lib/docs/agent-engineering/001-architecture-taxonomy.md` (Pattern B section)
- User value U6 (Route by Task, Not by User)
