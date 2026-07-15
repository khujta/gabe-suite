---
id: context-engineering-basics
name: Context Engineering Basics
tier: intermediate
specialization: [agent]
tags: [context, rag, prompt, token-budget]
prerequisites: [structured-output-enforcement]
related: [progressive-knowledge-disclosure, prompt-caching]
one_liner: "Every token in context steals from reasoning — load the minimum, defer the rest."
---

## The problem

Stuffed prompts degrade reasoning — not linearly, not monotonically, but measurably. Load the whole codebase "just in case" and the model's answers get worse and its cost goes up at the same time, with no obvious failure to point at.

## The idea

Load only what the current step needs into the prompt, and retrieve or summarize everything else on demand.

## Picture it

A surgeon's operating tray. Only the instruments needed for this incision are within reach; the rest stay on a cart that gets wheeled in when the procedure advances.

## How it maps

```
the operating tray         →  context window visible to the model
the instruments on it      →  tokens spent on prompt, tools, history, retrievals
the cart in the hallway    →  RAG index / memory store / side-queried sub-agent
swapping trays per stage   →  retrieval + compaction between steps
the surgeon's focus        →  reasoning quality (degrades as the tray fills)
the prep nurse             →  the retriever that decides what goes on the tray
```

## Primary force

LLM reasoning quality degrades as context fills, and the degradation is measurable long before you hit the hard token limit. The best systems load exactly what the current step needs and defer everything else — Claude Code's own architecture proves this at scale: system prompts are memoized, skill listings load truncated, tool schemas are deferred until requested, memory is side-queried.

## When to reach for it

- Any agent with non-trivial reference material — docs, past conversations, knowledge base.
- Long-running sessions where naive history accumulation bloats every subsequent prompt.
- Multi-tool agents where tool descriptions alone consume a meaningful fraction of the budget.

## When NOT to reach for it

- Toy prompts with ≤1KB of context — engineering overhead exceeds the win.
- One-shot completions with bounded, static input that already fits comfortably.
- Loading the entire codebase "just in case" — the model's reasoning gets worse, not better.
- No per-stage token measurement — you can't optimize what you don't measure.

## Evidence a topic touches this

- Keywords: context window, token budget, RAG, retrieval, prompt engineering, context compaction
- Files: `**/context*`, `**/rag*`, `**/retrieval*`, `**/prompt_builder*`
- Commit verbs: "trim context", "add retrieval", "compact history", "reduce prompt"

## Deeper reading

- `/mnt/g/My Drive/Claude-Cowork/khujta_memory/_system/research/anthropic/claude-sdk-architect/progressive-knowledge-disclosure.md`
- `refrepos/docs/arch-ref-lib/docs/agent-engineering/004-level-3-context-engineered.md`
