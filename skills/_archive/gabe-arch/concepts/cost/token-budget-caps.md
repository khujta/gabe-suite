---
id: token-budget-caps
name: Token Budget Caps (Per-Request Limits)
tier: foundational
specialization: [cost]
tags: [budget, max-tokens, cost-control, circuit-breaker]
prerequisites: []
related: [model-routing-by-task, circuit-breaker]
one_liner: "Every LLM call gets a max_tokens cap — no exceptions, no 'but this one's special'."
---

## The problem

One misbehaving prompt generates 16K tokens and the bill arrives a week later at 10x the expected per-call cost. Without a hard ceiling, a single runaway loop can eat a month's budget in an afternoon.

## The idea

Every outbound LLM (Large Language Model) call carries an explicit `max_tokens` cap sized to its task — no call leaves without one.

## Picture it

A taxi meter with a hard stop at $50. The driver pulls over when the meter hits the cap, no matter where you are. You might walk the last block, but you never come home to a $400 fare.

## How it maps

```
the meter                    →  running token counter during generation
the $50 ceiling              →  max_tokens value on the outbound request
driver pulling over          →  provider truncating output at the cap
different fares per ride     →  per-task caps (20 for classify, 1000 for report)
you walking the block        →  caller handling a truncated response gracefully
```

## Primary force

A cap is the cheapest last line of defense against runaway cost — cheaper than a circuit breaker, cheaper than a rate limit, cheaper than noticing the bill a week later. It also forces the model to be concise, which usually improves output quality. Every other cost control (routing, caching, batching) is optimization; the cap is load-bearing.

## When to reach for it

- Every production LLM call, including streaming responses (cap the total, not per-chunk).
- Open-ended generation (summaries, drafts) where the model could ramble forever.
- Multi-turn agent loops where unbounded output compounds into unbounded cost.

## When NOT to reach for it

- Never skip the cap — even dev prototypes benefit from caps against runaway iteration loops.
- Don't set the cap to the model's maximum — that's not a cap, it's cover for omitting one.
- Don't reuse one cap across every task — size it per task (classify ≠ report).
- Don't trust a cap in config you haven't verified is actually applied in the outbound request.

## Evidence a topic touches this

- Keywords: max_tokens, token budget, cap, output limit, truncate
- Files: `**/llm_client*`, `**/config/*.yaml`, `**/agents/*.py`
- Commit verbs: "add max_tokens", "cap output", "limit generation", "set budget"

## Deeper reading

- Provider docs (Anthropic, OpenAI): max_tokens semantics per model
- User value U8 (Measure the Machine — caps are the enforceable companion to measurement)
