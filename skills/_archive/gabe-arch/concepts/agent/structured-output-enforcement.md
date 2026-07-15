---
id: structured-output-enforcement
name: Structured Output Enforcement
tier: foundational
specialization: [agent]
tags: [pydantic, schema, output-type, reliability]
prerequisites: []
related: [deterministic-fallback-chain, input-guardrails]
one_liner: "Never trust prompt instructions to produce valid JSON — enforce at the framework layer."
---

## The problem

Asking the model for JSON in the system prompt works 99% of the time, and the remaining 1% is production at 2 AM — a trailing comment, a missing brace, a bonus explanation. Downstream code that assumed the shape crashes silently or corrupts state, and nobody knows until the dashboard goes empty.

## The idea

Declare the output shape as a typed schema at the framework level, so invalid output becomes a caught exception instead of a silent downstream crash.

## Picture it

Filling out a form with labeled boxes versus being asked "please write your address in all caps." The form constrains the answer by construction; the polite request relies on cooperation the model doesn't owe you.

## How it maps

```
the labeled boxes           →  typed schema (PydanticAI output_type, JSON mode)
the form's required fields  →  required keys with declared types
the validation on submit    →  framework-level parse + re-raise on mismatch
the polite cover letter     →  the system prompt (instruction, not enforcement)
the clerk rejecting a form  →  caught ValidationError you can branch on
the resubmit loop           →  output_retries with stricter guidance
```

## Primary force

LLM outputs drift. The same prompt produces valid JSON 99% of the time and a trailing comment 1% of the time, and that 1% is production at 2 AM. Framework-level enforcement — PydanticAI `output_type`, Claude `tool_choice`, OpenAI JSON mode — makes the shape a hard constraint, not a hopeful suggestion. Invalid output becomes a caught exception, not a silent downstream crash.

## When to reach for it

- Any production LLM output consumed by code, not displayed as prose.
- API responses that must be parseable — a JSON-consuming client can't render raw model text.
- Classification, extraction, routing — tasks where the shape matters more than the prose.

## When NOT to reach for it

- Pure free-text output for human consumption — summaries, email drafts, chat replies.
- Exploratory dev prompts where you want to see what the model produces naturally.
- Asking for JSON in the prompt AND adding a schema — pick one enforcement mechanism, not both.
- Using structured output with no fallback when parse fails — pair with `deterministic-fallback-chain`.

## Evidence a topic touches this

- Keywords: output_type, PydanticAI, JSON mode, tool_choice, structured output, schema
- Files: `**/agents/*.py`, `**/schemas/*.py`, `**/output_models.py`
- Commit verbs: "enforce schema", "add PydanticAI", "structure output", "use tool_choice"

## Deeper reading

- `refrepos/docs/arch-ref-lib/docs/agent-engineering/003-level-2-structured-agent.md`
- User value U4 (Enforce Output Structure Mechanically)
- PydanticAI `output_type` docs
