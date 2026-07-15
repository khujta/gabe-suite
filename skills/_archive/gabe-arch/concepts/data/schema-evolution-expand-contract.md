---
id: schema-evolution-expand-contract
name: Schema Evolution — Expand / Migrate / Contract
tier: intermediate
specialization: [data]
tags: [migration, schema, zero-downtime, expand-contract]
prerequisites: []
related: [api-versioning-strategies]
one_liner: "Never break old readers — add new, migrate, then remove old, across three deploys."
---

## The problem

A one-shot rename — `ALTER TABLE users RENAME COLUMN email_addr TO email` — breaks every running instance of the old code the moment it lands. You have a live database with deployed readers that can't all flip at the same instant, and taking the system down for a migration window is often not an option.

## The idea

Split any breaking schema change into three separate deploys — Expand (add the new shape), Migrate (move data and flip reads), Contract (remove the old shape) — so old and new code always overlap safely.

## Picture it

Widening a highway without closing it. You build the new lanes beside the existing ones, open them in parallel so cars can drift over, then close the old lanes once everyone's on the new ones. Traffic never stops; the layout just changes under it.

## How it maps

```
old lanes still open         →  old column still readable by deployed code
new lanes built beside       →  Expand: add new column, dual-write both shapes
signs routing traffic over   →  Migrate: backfill + flip reads to new column
old lanes coned off          →  Contract: drop the old column
traffic never stops          →  zero-downtime — each deploy compatible with the last
cones can be pulled back     →  each step reversible until Contract lands
```

## Primary force

A single-deploy breaking change couples the schema change to every reader's deploy — and at real scale those deploys never happen atomically. Expand/migrate/contract decouples the change into three compatible states, each safe with the previous running in parallel. The old and new shapes coexist just long enough for every reader to catch up, then the old shape is removed. Each step is individually reversible until the final contract.

## When to reach for it

- Any live database with deployed code that reads from it.
- Renaming columns, changing types, splitting or merging tables.
- API response shape changes where active clients you don't control are reading.

## When NOT to reach for it

- Brand-new systems with no deployed readers yet — just write the target schema.
- Single-deploy systems where you fully control read and write in one release.
- Tiny datasets where a short maintenance window is cheaper than the choreography.
- Skipping the contract step — both columns forever is technical debt that compounds.

## Evidence a topic touches this

- Keywords: expand contract, zero-downtime migration, schema migration, backfill, dual-write
- Files: `**/migrations/*`, `**/alembic/*`, `**/db/schema*`
- Commit verbs: "add column", "backfill", "drop old column", "dual-write"

## Deeper reading

- Stripe Engineering: "Online migrations at scale"
- GitHub Engineering: "gh-ost" (large table migration tooling)
- "Refactoring Databases" by Ambler & Sadalage
