---
id: deterministic-fallback-chain
name: Deterministic Fallback Chain
tier: intermediate
specialization: [agent, distributed-reliability]
tags: [fallback, reliability, graceful-degradation, output-shape]
prerequisites: [structured-output-enforcement]
related: [retry-with-exponential-backoff, circuit-breaker]
one_liner: "When structured output fails, don't raise — degrade through a chain of cheaper guesses."
---

## The problem

Structured LLM output fails in a dozen small ways — schema mismatch, timeout, rate limit, half-parsed JSON — and every caller downstream has to handle the shape being wrong. Left unhandled, one 1% failure mode becomes a 2 AM page about nulls in the notifications table.

## The idea

On primary-output failure, try the next-cheapest step in an ordered chain that still returns the caller's expected shape — never raise, always degrade.

## Picture it

An ATM that prefers to dispense twenties, falls back to tens, then fives, and if the cash drawer is empty prints a receipt pointing to the nearest working machine. It never shrugs and locks your card.

## How it maps

```
dispensing twenties        →  structured output from the primary model
falling back to tens       →  retry with a stricter schema prompt
falling back to fives      →  regex / cheap parser extraction path
printing a location slip   →  named safe-default response returned to caller
the ATM never locking up   →  caller always receives the expected response shape
the transaction ledger     →  structured log naming which fallback step fired
```

## Primary force

Production LLM systems fail in many small ways — schema mismatches, timeouts, rate limits, partial JSON. A fallback chain converts a class of scattered failures into a single predictable response shape, which is what every caller actually wants. The chain is deterministic: same input → same fallback step → same output.

## When to reach for it

- Agent API that must always return the same response shape, even when the model misbehaves.
- User-facing flows where "partial answer" beats "error screen."
- Downstream systems that cannot handle nulls but can handle a safe, named default.

## When NOT to reach for it

- Critical correctness paths — payments, medical, legal — prefer explicit error over silent degradation.
- Fallback quality is indistinguishable from the primary — you're hiding a bug, not degrading gracefully.
- No logging of which step fired — you never learn the primary is broken.
- Fallbacks that are themselves LLM calls with the same fragility — recursive risk, not a fallback.

## Evidence a topic touches this

- Keywords: fallback, graceful degradation, default value, fallback chain, on_error
- Files: `**/fallback*`, `**/agents/*.py`, `**/error_handlers.py`
- Commit verbs: "add fallback", "degrade to", "handle parse error", "default when"

## Deeper reading

- `refrepos/docs/arch-ref-lib/docs/agent-engineering/003-level-2-structured-agent.md`
- PydanticAI `output_retries` + custom exception handlers
