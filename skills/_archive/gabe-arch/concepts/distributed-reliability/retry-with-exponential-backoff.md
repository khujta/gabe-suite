---
id: retry-with-exponential-backoff
name: Retry with Exponential Backoff
tier: intermediate
specialization: [distributed-reliability]
tags: [retries, backoff, jitter, transient-failure]
prerequisites: [idempotency-keys]
related: [circuit-breaker, deterministic-fallback-chain]
one_liner: "Wait longer between each retry so the failing system can recover."
---

## The problem

A downstream service flakes for a few seconds. Every client retries instantly, in lockstep, and keeps the service pinned under load. A 2-second blip becomes a 5-minute outage because the callers won't let it breathe.

## The idea

On each retry, wait exponentially longer, and add random jitter so callers don't sync up.

## Picture it

A polite guest at a closed door. Knock once, wait a beat, knock again a little later, wait longer, eventually leave a note. Nobody pounds the door forever; nobody arrives at the same second as every other guest.

## How it maps

```
the closed door           →  the failing downstream (timeout, 503, rate limit)
each knock                →  a retry attempt
longer waits between      →  exponential delay: 1s, 2s, 4s, 8s
  each knock
guests arrive out of sync →  jitter (±25% random) spreads the retry herd
giving up after N knocks  →  bounded attempts; don't retry forever
leaving a note behind     →  surface the failure to caller / fallback path
```

## Primary force

Retries without backoff amplify outages — every client hammering a failing service keeps it failing. It's a self-inflicted denial-of-service where your own clients execute the attack. Exponential delay gives the target room to recover; jitter prevents the thundering herd that otherwise shows up the instant the cooldown ends. The system self-heals instead of thrashing.

## When to reach for it

- Transient failures: network blips, 429 rate limits, 503s, temporary overload.
- Idempotent operations (safe to replay) or writes protected by an idempotency key.
- Any HTTP client talking to a remote service with known occasional flakiness.

## When NOT to reach for it

- Permanent failures — 4xx that aren't 429 or 408 won't change on retry; surface the error.
- Non-idempotent writes with no key — retries double-charge or duplicate records.
- Sub-second user-facing paths — backoff adds latency the user can't absorb.
- Fixed-delay retries or no jitter — thundering herd hits the service the moment it recovers.

## Evidence a topic touches this

- Keywords: retry, backoff, tenacity, exponential, jitter, urllib3.Retry, httpx retries
- Files: `**/http_client*`, `**/retry_policy*`, `**/transport*`
- Commit verbs: "add retry", "handle 429", "backoff on", "wrap in tenacity"

## Deeper reading

- AWS Architecture Blog: "Exponential Backoff and Jitter"
- tenacity Python library docs
- Google SRE Book: Handling Overload
