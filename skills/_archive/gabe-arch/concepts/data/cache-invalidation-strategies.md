---
id: cache-invalidation-strategies
name: Cache Invalidation Strategies
tier: advanced
specialization: [data]
tags: [cache, invalidation, ttl, write-through, write-behind]
prerequisites: []
related: [prompt-caching, request-response-lifecycle]
one_liner: "Cache invalidation is hard — pick the right wrongness rather than chasing correctness."
---

## The problem

A cache makes reads fast until the underlying data changes — and then the cache serves wrong answers until you do something about it. Every invalidation strategy trades one flavor of wrongness (staleness, slow writes, complexity) for another; there is no free option.

## The idea

Pick the invalidation trade-off — TTL, write-through, write-behind, or event-driven — that matches which wrongness your workload can tolerate.

## Picture it

A bulletin board in a busy lobby. You can tear old notices down the instant news changes (constant work, always current), refresh the whole board daily (stale all day, almost no work), or stamp every notice with "expires 5pm" (bounded staleness, lazy cleanup). Each suits a different kind of news.

## How it maps

```
tear down on every update    →  write-through: update cache + DB atomically
refresh whole board nightly  →  TTL: bounded staleness, simple, no eventing
"expires 5pm" stamp          →  per-key TTL with lazy expiry on read
wire-report alarm bell       →  event-driven invalidation (pub/sub on writes)
post-it in back, file later  →  write-behind: cache now, DB flush async
everyone reading at 9am      →  cache stampede when many miss simultaneously
pre-posting tomorrow's news  →  cache warming to avoid cold-start latency
```

## Primary force

There is no free invalidation strategy — each trades staleness, cost, or complexity. TTL (Time To Live) is simple and bounded-stale. Write-through is correct but slows every write. Write-behind is fast but risks data loss on crash. Event-driven is correct but requires a pub/sub infrastructure and discipline. Pick based on which wrongness you can tolerate for this workload: stale reads, slow writes, lost writes, or operational complexity.

## When to reach for it

- Any system with a cache layer — Redis, Memcached, CDN, HTTP cache, LLM response cache.
- High-read workloads where cache hit rate dominates cost or latency.
- Read-heavy views over write-heavy data where the DB can't carry full read load.

## When NOT to reach for it

- No meaningful read repetition — cache doesn't help, skip it.
- Strict consistency requirements where any staleness is unacceptable — skip cache, eat latency.
- Default TTL of "forever" — that's not caching, that's stale data with extra steps.
- No cache-stampede protection (single-flight, jittered TTL) — one miss becomes a DB pileup.

## Evidence a topic touches this

- Keywords: cache, invalidate, TTL, write-through, write-behind, cache-aside, stampede
- Files: `**/cache*`, `**/redis*`, `**/memcached*`
- Commit verbs: "invalidate cache", "set TTL", "warm cache", "cache-aside"

## Deeper reading

- "Designing Data-Intensive Applications" (Kleppmann) ch. 3
- AWS ElastiCache caching strategies documentation
- "There are only two hard things..." — Phil Karlton's classic quote
