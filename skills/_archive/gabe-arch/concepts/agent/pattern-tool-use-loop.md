---
id: pattern-tool-use-loop
name: "Pattern D: Tool-Use Loop (Autonomous Investigation)"
tier: advanced
specialization: [agent]
tags: [pattern, tool-use, investigation, autonomous]
prerequisites: [structured-output-enforcement, context-engineering-basics]
related: [pattern-state-machine, progressive-knowledge-disclosure]
one_liner: "Give the agent tools and a stopping condition — let it decide what to look at."
---

## The problem

Some tasks — incident forensics, codebase exploration, research synthesis — can't be served by a fixed pipeline. The right next step depends on what the last step uncovered, so a pre-wired flow either over-investigates cheap cases or under-investigates complex ones. And handing the model open tools without bounds means an infinite loop with an open wallet.

## The idea

Give the model a bounded tool set, a clear stopping condition, and an iteration budget — then let it choose the next call based on what it just saw.

## Picture it

A detective handed a case file and full access to the records room. They read, hypothesize, pull more records, revise, and close the file when the evidence is sufficient or the shift ends.

## How it maps

```
the case assignment       →  system prompt (goal + stopping criteria)
the records room          →  the vetted tool set the agent can call
reading a record          →  tool call + result observation
forming a hypothesis      →  model reasoning step between tool calls
"do I have enough?"       →  explicit evidence-budget check in the loop
the shift ending          →  hard iteration cap (max_iter)
filing the final report   →  structured output emitted when stop condition trips
```

## Primary force

Some tasks genuinely require "decide what to look at next based on what you just saw." Pipelines can't do that — they're fixed. A tool-use loop lets the model drive investigation, but it requires you to define bounded tool surfaces, strict stopping conditions, and iteration budgets. Without those three, you have an open wallet and a cliff.

## When to reach for it

- Investigation and research agents where the next step depends on what was just learned.
- Deep-analysis tasks where a fixed pipeline would mis-size the effort across cases.
- Codebase exploration, incident forensics, research synthesis — adaptability over predictability.

## When NOT to reach for it

- Request-response paths with a latency SLO under 30s — loops can take minutes.
- Cost-sensitive paths — every loop iteration is a model call, charges stack fast.
- No hard iteration cap or unbounded tool outputs — infinite loops and context blowups on iteration 3.
- No explicit evidence-budget check — "am I done?" is the key stop signal; make it a tool call, not a vibe.

## Evidence a topic touches this

- Keywords: tool use, tool loop, ReAct, agent iterations, max_iter, evidence budget
- Files: `**/tool_loop*`, `**/agent/*.py`, `**/react_agent*`
- Commit verbs: "add tool loop", "iterate until", "bound iterations", "evidence check"

## Deeper reading

- `refrepos/docs/arch-ref-lib/docs/agent-engineering/006-level-5-autonomous-investigation.md`
- `refrepos/docs/arch-ref-lib/docs/agent-engineering/001-architecture-taxonomy.md` (Pattern D)
