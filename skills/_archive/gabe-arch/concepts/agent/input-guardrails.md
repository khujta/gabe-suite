---
id: input-guardrails
name: Input Guardrails (Pre-Agent Validation)
tier: foundational
specialization: [agent, security]
tags: [guardrails, prompt-injection, validation, safety]
prerequisites: []
related: [input-validation-at-boundary, structured-output-enforcement]
one_liner: "Filter adversarial input before it reaches the model — cheaper than filtering output."
---

## The problem

Prompt-injection text — "ignore previous instructions and..." — exploits the model's helpfulness and costs a full model call every time it reaches the LLM. Without a pre-filter, you're paying Claude rates to catch attacks a regex would reject in microseconds, and you have no named record of which patterns trended this week.

## The idea

Run cheap deterministic pattern checks on untrusted input before invoking the model, and emit the matched pattern names as observable evidence.

## Picture it

A bouncer at a club door checking IDs and refusing anyone with obvious weapons before they step inside. Much easier than letting everyone in and trying to clear the floor after drinks are poured.

## How it maps

```
the bouncer                →  pre-agent guardrail function (pre_validate)
the ID / pat-down checks   →  regex patterns for known injection payloads
the club interior          →  the LLM call downstream of the guardrail
"no entry, you matched X"  →  structured rejection with matched_patterns array
the bouncer's incident log →  observability metric emitting which patterns fired
the new-weapons memo       →  versioned pattern set updated as attacks evolve
```

## Primary force

Prompt injection attacks exploit the model's helpfulness. A regex that blocks "ignore previous instructions" before the model sees it is 1000x cheaper than a model call, 100% deterministic, and produces named evidence of attack patterns for your ops dashboard. The goal is not perfect filtering — it's removing the obvious 80% so the model's remaining defenses handle the 20%.

## When to reach for it

- Any agent taking untrusted input — public APIs, support ticket intake, chat surfaces.
- Prompt-injection attack surfaces where text could hijack instructions downstream.
- You need named evidence of which attack patterns are trending on your system.

## When NOT to reach for it

- Fully trusted input pipelines — internal batch jobs with already-sanitized data.
- As the only defense — guardrails complement model-side safety, they don't replace it.
- Returning only `{safe: bool}` with no pattern names — you lose observability on attack trends.
- Matching patterns case-sensitively and unversioned — attackers use mixed case and unicode, and you need to know when rules changed.

## Evidence a topic touches this

- Keywords: guardrail, prompt injection, input validation, regex pattern, jailbreak, matched_patterns
- Files: `**/guardrails.py`, `**/patterns*`, `**/agent/pre_validate*`
- Commit verbs: "add guardrail", "block pattern", "detect injection", "expand patterns"

## Deeper reading

- `refrepos/docs/arch-ref-lib/docs/agent-engineering/003-level-2-structured-agent.md`
- OWASP LLM Top 10 (LLM01: Prompt Injection)
