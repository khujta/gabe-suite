---
id: request-response-lifecycle
name: Request / Response Lifecycle
tier: foundational
specialization: [web]
tags: [http, lifecycle, middleware, request-phases]
prerequisites: []
related: [stateful-vs-stateless-services, input-validation-at-boundary]
one_liner: "Every HTTP request passes through the same phases — know them or debug blind."
---

## The problem

A request misbehaves — wrong status, missing header, mysterious latency — and you don't know which part of the stack owns the bug. Without a mental model of the phases, debugging is guessing by timestamp.

## The idea

Every HTTP request walks the same ordered stages from connection to response; knowing which stage owns a symptom tells you where to look.

## Picture it

An airport security line: boarding pass check, ID verification, bag scan, walkthrough, gate agent. Each station can reject you; if all pass, you board. Any lost item has to be somewhere along that specific conveyor.

## How it maps

```
arriving at the terminal       →  TCP accept + TLS handshake
boarding pass scan             →  HTTP parse (method, path, headers)
checkpoint line assignment     →  routing (match URL → handler)
pre-checkpoint inspectors      →  request-direction middleware (auth, rate-limit,
                                 logging, body parse)
gate agent checking the        →  the handler — your business logic
  specific flight
post-boarding cleanup          →  response-direction middleware (compression,
                                 response logging, CORS headers)
jet bridge back out            →  response serialization + connection close/keepalive
lost bag on conveyor 3         →  symptom lives in one specific phase — look there
```

## Primary force

Requests do not hit your handler directly. They pass through accept, TLS, parse, route, request-middleware, handler, response-middleware, serialize, close — each with its own failure modes, timing, and observability surface. Knowing which phase owns the bug is the difference between a ten-minute fix and a four-hour search. Auth belongs in middleware, not the handler. Headers have to be set before the body. Malformed-body logs belong before the parser, not after.

## When to reach for it

- Debugging "why did this request behave that way" — phase-by-phase tracing is the answer.
- Adding cross-cutting concerns (auth, logging, rate-limit, compression) at the right stage.
- Onboarding to a new framework — understanding where your code actually runs.

## When NOT to reach for it

- Non-HTTP protocols (gRPC streaming, WebSockets, raw TCP) — different lifecycles, different phases.
- Auth logic placed in the handler instead of middleware — rejections happen too late.
- Setting response headers after writing the body — no-op; headers are already on the wire.
- No handler timeouts — a single slow request ties up the connection slot indefinitely.

## Evidence a topic touches this

- Keywords: middleware, lifecycle, request phase, router, handler, before_request, after_request
- Files: `**/middleware*`, `**/app.py`, `**/main.py`, `**/api/*.py`
- Commit verbs: "add middleware", "wire router", "before request hook", "intercept at"

## Deeper reading

- Framework-specific: FastAPI docs (Dependencies + Middleware), Express docs (Middleware)
- "High Performance Browser Networking" (Grigorik) ch. 9-11
