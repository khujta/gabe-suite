---
id: progressive-knowledge-disclosure
name: Progressive Knowledge Disclosure
tier: advanced
specialization: [agent]
tags: [context, lazy-loading, skills, disclosure]
prerequisites: [context-engineering-basics]
related: [prompt-caching]
one_liner: "Announce what exists; load content only when relevance is proven."
---

## The problem

An agent with hundreds of skills or tools burns its context budget on descriptions before it even reads the user's message. Load everything upfront and every first turn is slow and expensive; load nothing and the model can't find the capability it needs. Both fail, differently.

## The idea

Expose each capability as a compact name + summary at all times, and fetch the full body only when the model asks for it.

## Picture it

A library card catalog. Every book's title and one-line description is on a card you can flip through in seconds; you pull the actual book off the shelf only when a card earns it.

## How it maps

```
the card catalog           →  skill / tool listing (names + summaries)
each card                  →  one capability announcement (cheap, cache-friendly)
the stacks on the shelf    →  full tool schemas, skill bodies, doc pages
pulling a book             →  lookup call (ToolSearch, resolve-skill, fetch-doc)
working memory             →  the context window — only the catalog lives here
the librarian's sub-agent  →  memory side-query (facts fetched out of band)
the acquisitions budget    →  fixed upfront cost for catalog, variable for pulls
```

## Primary force

Context windows are finite but the universe of capabilities is unbounded. Progressive disclosure — announce names and summaries, fetch bodies on request — scales to thousands of skills and tools without token inflation. Claude Code announces skills by name plus truncated description (about 1% of the context budget), defers tool schemas behind ToolSearch, and side-queries memory via a sub-agent. Each layer trades a small fixed upfront cost for unbounded capacity.

## When to reach for it

- Systems with many capabilities — skills, tools, doc corpora, long session history.
- Agent harnesses where the set of available actions is far larger than what any turn will use.
- Any system at scale that has already hit "token budget exceeded" during normal operation.

## When NOT to reach for it

- Small bounded agents with 3-5 tools — upfront loading is cheaper than the indirection round-trip.
- Latency-critical paths where the extra announce-then-fetch hop is load-bearing.
- Disclosing so lazily the model can't find capabilities — under-announcement is as bad as over.
- Treating announcement and body as the same artifact — they need distinct formats and cache tiers.

## Evidence a topic touches this

- Keywords: progressive disclosure, lazy load, deferred, announce, ToolSearch, skill listing
- Files: `**/skills/*`, `**/tool_registry*`, `**/context_loader*`
- Commit verbs: "defer load", "announce then fetch", "lazy resolve", "register skill"

## Deeper reading

- `/mnt/g/My Drive/Claude-Cowork/khujta_memory/_system/research/anthropic/claude-sdk-architect/progressive-knowledge-disclosure.md` (authoritative)
- `/mnt/g/My Drive/Claude-Cowork/khujta_memory/_system/research/anthropic/claude-sdk-architect/skills-deep-dive.md`
