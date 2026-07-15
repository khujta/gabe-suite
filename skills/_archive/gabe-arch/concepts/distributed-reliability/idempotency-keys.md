---
id: idempotency-keys
name: Idempotency Keys
tier: foundational
specialization: [distributed-reliability]
tags: [idempotency, retry-safety, deduplication, stripe-pattern]
prerequisites: []
related: [retry-with-exponential-backoff, async-background-processing]
one_liner: "Tag each write so replays don't double-charge — the price of retry-safety."
---

## The problem

A client retries a POST because the response never arrived — but the server already processed the first one. Now the customer has two charges, two orders, two emails. Retries are necessary; duplicates from retries are catastrophic.

## The idea

The client stamps each logical write with a unique key; the server remembers the key and returns the original response instead of processing again.

## Picture it

A concert ticket with a serial number. Scan it once — doors open. Scan the same ticket again — the scanner beeps red and the bouncer waves you off. Same ticket, same seat, no matter how many times it's scanned.

## How it maps

```
unique serial on ticket    →  client-generated UUID (the Idempotency-Key header)
first scan at the door     →  first request: server processes, stores {key → response}
scanner's memory           →  server-side key store with TTL (time-to-live)
repeat scan beeps red      →  retry arrives: server returns the stored response
ticket stub kept on file   →  response cached for the retention window
different concert needs    →  key scoped per-user or per-endpoint, not global —
  a different serial         prevents collisions between unrelated operations
```

## Easy to confuse with

- **key generation vs key storage vs key TTL** — three separable concerns. The client generates the key (UUID typically); the server stores `{key → response}`; the entry ages out after TTL. Conflating these hides failure modes: client-side collisions, unbounded storage, or replays after the window expires.
- **idempotency-key vs content-hash** — a client-generated UUID treats logically-distinct-but-identical-bodied requests as separate operations (two users transferring $10 to same recipient). A content-hash collapses them. Idempotency keys are about intent, not content.
- **retry-safety vs deduplication** — retry-safety is "the same logical request, replayed, produces the same result." Deduplication is "two different requests, identical in body, collapse to one." Idempotency keys give you retry-safety, not deduplication.

## Primary force

Networks fail after the server has already committed the write — the client never sees the 200 and retries. Without a key, that retry is a brand-new request: a second charge, a second order. Idempotency keys let the server recognize "I've seen this exact operation" and replay the original response. The caller gets the same answer whether it retried once or five times, and the underlying write happens exactly once.

## When to reach for it

- Every non-read endpoint (POST, PUT, PATCH, DELETE) exposed over an unreliable network.
- Payment, order, and transfer flows where a duplicate costs real money.
- Webhook receivers — providers routinely redeliver the same event.

## When NOT to reach for it

- Pure reads — GETs are naturally idempotent; a key adds no value.
- Body-hash as the key — two users submitting the same content collide into one response.
- No TTL on the key store — unbounded growth until the table eats the database.
- Storing only success responses — a retry of a legitimately-failed request "succeeds" next time.

## Evidence a topic touches this

- Keywords: idempotency key, Idempotency-Key header, deduplicate, once-and-only-once, Stripe-style
- Files: `**/api/*.py`, `**/middleware*`, `**/idempotency*`
- Commit verbs: "add idempotency", "dedupe by key", "accept X-Idempotency-Key"

## Deeper reading

- Stripe API docs — the canonical implementation
- IETF draft: "The Idempotency-Key HTTP Header Field"
