---
id: sse-streaming-progress
name: SSE Streaming for Agent Progress
tier: intermediate
specialization: [agent, web]
tags: [sse, streaming, progress, user-experience]
prerequisites: [async-background-processing]
related: [agent-observability]
one_liner: "Show the model thinking in real time — silence over 5s feels like the thing is broken."
---

## The problem

A 30-second LLM pipeline with no feedback gets abandoned. The user stares at a spinner, assumes a crash, hits refresh, and now the same expensive work runs twice. The latency didn't kill trust — the silence did.

## The idea

Push named progress events to the client over a single long-lived HTTP connection as each pipeline stage transitions.

## Picture it

Watching a progress bar fill versus staring at a frozen screen. Same 30-second wait, opposite feelings — one reads as "work happening," the other as "crash."

## How it maps

```
the progress bar filling   →  stream of named SSE events (Server-Sent Events)
each tick of the bar       →  one `event: progress` push ("classifying...", "routing...")
the cable to the display   →  long-lived `text/event-stream` HTTP response
the auto-reconnect wire    →  EventSource reconnect on transient disconnect
the "still alive" pulse    →  heartbeat events keeping proxies from closing the connection
the red error light        →  dedicated `event: error` channel (not mixed with data)
the bar finishing          →  `event: done` with the final payload
```

## Primary force

Dead air kills user trust. A 30-second LLM pipeline with no progress feedback gets abandoned; the same pipeline streaming "validated input → classifying → routing → responding" finishes just as fast but feels 3x faster. SSE (Server-Sent Events) is the simplest streaming primitive — one-way, HTTP-native, auto-reconnect — and doesn't need WebSocket complexity for most agent apps.

## When to reach for it

- Any AI processing taking longer than ~5 seconds where a human is watching.
- Multi-step agent runs with observable stage transitions worth showing.
- User-facing apps where abandonment rises sharply with perceived latency.

## When NOT to reach for it

- Batch jobs with no human waiting — progress events are overhead for no one's benefit.
- Clients that can't consume SSE — older browsers or strict B2B integrations; fall back to polling.
- Streaming raw token-by-token output when users only care about stage transitions.
- Forgetting heartbeats and buffer flushes — idle connections die at 30-60s, and buffered events arrive in a useless burst at the end.

## Evidence a topic touches this

- Keywords: SSE, Server-Sent Events, streaming, event: progress, EventSource, text/event-stream
- Files: `**/streaming*`, `**/api/*.py`, `**/sse*`
- Commit verbs: "stream progress", "add SSE", "emit event", "flush buffer"

## Deeper reading

- `refrepos/docs/arch-ref-lib/docs/agent-engineering/005-level-4-production-pipeline.md`
- User value U5 (Stream the Thinking)
- MDN Server-Sent Events
