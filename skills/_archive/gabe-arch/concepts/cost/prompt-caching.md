---
id: prompt-caching
name: Prompt Caching (Stable-Prefix Reuse)
tier: intermediate
specialization: [cost, agent]
tags: [caching, prompt-cache, cost-optimization, ttl]
prerequisites: [context-engineering-basics]
related: [progressive-knowledge-disclosure, model-routing-by-task]
one_liner: "Pay once for the stable prefix; reuse it on every call within TTL."
---

## The problem

Every turn of a chatty agent resends the same 8K-token system prompt and tool definitions, and you pay full price to process them every single time. That fixed prefix can be 80% of the tokens on each call with zero new information.

## The idea

Mark the stable prefix as cacheable so the provider processes it once and bills later calls at ~10% for the cached portion within TTL (Time To Live).

## Picture it

A coffee shop that pre-grinds beans once an hour, not once per cup. The grind is identical for every order, so grinding per-cup is pure waste — do it once, keep the hopper warm, scoop from it.

## How it maps

```
pre-ground beans in hopper   →  cached prefix sitting in provider memory
grinding once per hour       →  one full-price process pass on cache miss
scooping per cup             →  cache hit billed at ~10% of full price
the hour the grind stays     →  the cache TTL (Anthropic: 5 minutes)
variable order (oat, vanilla) →  variable suffix appended per call
grinder sits cold all night  →  cache eviction after TTL expires
```

## Primary force

Most tokens in a typical agent call are context setup (system prompt, tool definitions, retrieved docs) that does not change turn-to-turn. Caching lets the provider process that prefix once and bill subsequent calls at roughly 10% for the cached portion. In a chatty agent that is often 50-80% cost reduction with zero architectural change beyond ordering the prompt correctly — stable content first, variable content last.

## When to reach for it

- System prompts or instructions shared across many requests in a short window.
- RAG (Retrieval-Augmented Generation) contexts where the same document subset recurs within a session.
- Multi-turn conversations where early turns stay identical across calls.

## When NOT to reach for it

- Prompts that change every request — no reusable prefix means nothing to cache.
- Slow-drip traffic where calls arrive farther apart than the TTL (5 min for Anthropic).
- Tiny prefixes where the cache-miss penalty exceeds the cache-hit win.
- Contorting prompt design to hit the cache — don't let the tail wag the dog.

## Evidence a topic touches this

- Keywords: prompt cache, cache_control, stable prefix, cache hit rate, ephemeral cache
- Files: `**/prompt_builder*`, `**/llm_client*`, `**/cache*`
- Commit verbs: "enable cache", "add cache_control", "stabilize prefix", "order prompt for cache"

## Deeper reading

- Anthropic prompt-caching docs (5-minute TTL specifics)
- `/mnt/g/My Drive/Claude-Cowork/khujta_memory/_system/research/anthropic/claude-sdk-architect/`
