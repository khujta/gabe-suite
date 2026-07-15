---
id: pagination-cursor-vs-offset
name: "Pagination: Cursor vs Offset"
tier: foundational
specialization: [data, web]
tags: [pagination, cursor, offset, scale]
prerequisites: []
related: [schema-evolution-expand-contract]
one_liner: "Offset pagination breaks at scale — cursors are the grown-up answer."
---

## The problem

`OFFSET 100000 LIMIT 50` forces the database to scan and throw away 100,000 rows on every call to get page 2,001. Queries get slower the deeper users scroll, new rows inserted during browsing cause duplicates and skips, and one caller asking for `limit=100000` can take the DB down.

## The idea

Return a cursor (an opaque pointer to the last row seen) and ask for "next 50 after this cursor" — O(log n) via index lookup instead of O(n) via row-skipping.

## Picture it

Reading a long book two ways. "Skip to page 500" forces someone to count 500 pages every time you ask. "Continue from this bookmark" lets you pick up exactly where you left off instantly — the bookmark remembers the position.

## How it maps

```
"skip to page 500"           →  OFFSET 500 LIMIT N (scan-and-discard)
"continue from bookmark"     →  WHERE id > last_seen_id LIMIT N (index seek)
the bookmark itself          →  opaque cursor token returned to the client
page number in TOC           →  raw row offset (couples API to storage layout)
book growing overnight       →  new rows inserted while a user paginates
bookmark still works         →  cursor unaffected by inserts above/below it
```

## Primary force

Offset-based pagination costs grow linearly with depth — every query re-scans the prefix you've already paged past. Cursor pagination uses the index directly and runs in constant time regardless of depth. The tradeoff: cursors don't support "jump to page 500," only "next page from here." For infinite scroll, feeds, and search, that's exactly what the product wanted anyway; "jump to arbitrary page" is an operational smell for user-facing lists.

## When to reach for it

- Any list endpoint returning more than a few dozen items.
- Infinite-scroll UIs, search results, activity feeds, timelines.
- Datasets expected to grow past a few thousand rows with deep pagination.

## When NOT to reach for it

- Truly bounded lists like "top 10 all time" — no pagination needed at all.
- Internal admin UIs where offset queries stay at operational scale forever.
- Cursors based on non-unique fields without a tie-breaker — ties cause duplicates or skips.
- Exposing raw DB primary keys as cursors — couples API to schema; wrap/obfuscate instead.

## Evidence a topic touches this

- Keywords: pagination, cursor, offset, LIMIT, page_token, next_cursor
- Files: `**/api/*.py`, `**/endpoints/*`, `**/repositories/*`
- Commit verbs: "add pagination", "switch to cursor", "replace offset", "next_cursor"

## Deeper reading

- GitHub GraphQL API: Relay-style cursor pagination
- Stripe API pagination docs
- "Use The Index, Luke" — pagination anti-patterns
