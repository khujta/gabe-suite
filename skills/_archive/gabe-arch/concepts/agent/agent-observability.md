---
id: agent-observability
name: Agent Observability (Traces + Metrics)
tier: intermediate
specialization: [agent, distributed-reliability]
tags: [observability, langfuse, prometheus, tracing, metrics]
prerequisites: [input-guardrails]
related: [sse-streaming-progress, token-budget-caps]
one_liner: "If you can't see what the agent did, you can't improve it — trace every call, name every metric."
---

## The problem

The same prompt produced a $0.40 run today and a $0.02 run last week, and nobody can say why. Without structured traces and named metrics, agent regressions — cost drift, silent model swaps, latency creep — are invisible until a finance review or a customer complaint surfaces them.

## The idea

Record every run as a structured trace plus per-stage metrics, so you can replay any incident and track cost, latency, and tokens per pipeline.

## Picture it

A dashcam in a car. You don't watch the footage daily, but the one time something crashes, you need the two seconds before impact on tape — plus the odometer reading to know how fast you were going.

## How it maps

```
the dashcam footage       →  named trace / span tree (Langfuse, LangSmith)
each captured frame       →  one span per model call or tool invocation
the odometer reading      →  named metric (cost_per_run, latency_p95, token_usage)
time-stamped playback     →  run replay showing prompt, output, cost per step
the crash review          →  post-incident drill-down on the misbehaving run
the crash detector        →  alert rules on metric thresholds (cost regression, p95 spike)
```

## Primary force

Agents fail in ways no other software fails — the same prompt produces different outputs, costs drift silently, model versions change behavior without warning. Named traces plus structured metrics (cost-per-run, latency-p95, token-usage) let you see those failures instead of guessing. Boolean success/failure is not enough; you need the full run recorded and per-pipeline-run metrics to answer "what changed since last week?"

## When to reach for it

- Any production agent system — auditability and cost tracking are table stakes.
- Debugging cost regressions where you need to see which model, prompt, or token caused the jump.
- Teams with more than one engineer who need shared ground truth about what the agent actually does.

## When NOT to reach for it

- One-off scripts and hackathon prototypes — instrumentation cost exceeds the investigation win.
- Traces would leak PII (Personally Identifiable Information) into a third-party service — solve privacy first.
- Logging text but not structured spans — grep-able logs are not searchable traces.
- Sending traces synchronously to a slow store — the trace pipeline becomes your new SLO (Service Level Objective).

## Evidence a topic touches this

- Keywords: Langfuse, LangSmith, Prometheus, OpenTelemetry, trace, span, metric, cost_per_run
- Files: `**/observability*`, `**/tracing*`, `**/metrics*`
- Commit verbs: "add Langfuse", "emit metric", "wrap span", "trace run"

## Deeper reading

- `refrepos/docs/arch-ref-lib/docs/agent-engineering/005-level-4-production-pipeline.md`
- User value U8 (Measure the Machine)
- Langfuse / LangSmith / OpenTelemetry docs
