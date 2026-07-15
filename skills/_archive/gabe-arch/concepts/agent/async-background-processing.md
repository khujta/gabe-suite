---
id: async-background-processing
name: Async Background Processing (202 Accepted)
tier: foundational
specialization: [agent, web]
tags: [async, 202-accepted, background-task, sse]
prerequisites: []
related: [sse-streaming-progress, request-response-lifecycle]
one_liner: "Return a ticket immediately; process in the background; stream progress separately."
signal: deeper-5min
---

## The problem

Synchronous LLM calls hold a server thread for 10+ seconds. At real scale that means either huge thread pools (expensive) or timeouts (user-hostile). The client's wait is coupled to the server's work — a long job becomes an operational liability even when the logic is correct.

## The idea

Return a ticket immediately; do the work separately; deliver the result later via a status endpoint or push channel.

## Picture it

A coat-check counter. You hand over your jacket and walk away with a numbered ticket. The attendant hangs it at their own pace — nobody stands at the counter waiting. You come back, or get paged, when it's ready.

## How it maps

```
the jacket                    →  your request (HTTP payload)
the claim check               →  ticket_id returned in 202 response
the attendant                 →  worker pool / BackgroundTask handler
"got it, here's your ticket"  →  HTTP 202 Accepted response
getting paged                 →  SSE event or status endpoint polling
the coat-check tag index      →  persisted job state (DB row keyed by ticket_id)
```

## Easy to confuse with

- **ticket_id vs persisted job state** — the ticket_id is a handle (the claim check you walk away with); persisted job state is storage (the DB row keyed by ticket_id). You can have a ticket with no persistence (in-memory only — server restart loses jobs) or persistence with no ticket (content-hash key). They're orthogonal.
- **202 Accepted vs "work started"** — 202 means "I've accepted the request." The worker pool may still be cold; processing hasn't necessarily begun. Don't conflate acknowledgement with progress.
- **SSE vs polling vs webhooks** — three different delivery channels, all orthogonal to whether jobs are persisted. SSE holds a connection; polling is request-driven; webhooks push to the client's server. Pick one based on client topology, not on whether you're using 202.

## Primary force

A synchronous LLM call blocks a server thread for 10+ seconds. At any real scale, that means either huge thread pools (expensive) or timeouts (user-hostile). 202 Accepted + background processing decouples the client's wait from the server's work — the connection closes in milliseconds, the work proceeds at its natural pace, and progress is streamed back via SSE or polled via a status endpoint.

## When to reach for it

- Long-running LLM calls, OCR, batch ingest — any work with p99 > ~5s.
- Endpoints that must survive client disconnect (mobile networks, flaky clients).
- Work that benefits from independently scaling the worker pool (CPU-bound batch vs I/O-bound API).

## When NOT to reach for it

- Sub-200ms lookups — 202 + polling turns one round-trip into three. Use 200 OK.
- Fire-and-forget work with no need to report completion — a plain queue is simpler.
- In-memory ticket state without persistence — server restart loses jobs. Pair 202 with durable state or don't use it.
- No idempotency key on the submit endpoint — client retries double-process the same job.
- Returning 200 instead of 202 — muddies the "accepted but not done" semantics.

## Evidence a topic touches this

- Keywords: 202 Accepted, BackgroundTask, background processing, ticket ID, async job
- Files: `**/api/*.py`, `**/tasks/*`, `**/workers/*`
- Commit verbs: "return 202", "add BackgroundTask", "async submit", "enqueue"

## Deeper reading

- `refrepos/docs/arch-ref-lib/docs/agent-engineering/005-level-4-production-pipeline.md`
- FastAPI `BackgroundTasks` docs
