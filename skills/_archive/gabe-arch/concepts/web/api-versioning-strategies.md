---
id: api-versioning-strategies
name: API Versioning Strategies
tier: intermediate
specialization: [web]
tags: [versioning, api, breaking-changes, semver]
prerequisites: [request-response-lifecycle]
related: [schema-evolution-expand-contract]
one_liner: "The day you ship v1 you've promised not to break it — plan for v2 before you need it."
---

## The problem

You need to change a response shape, but clients are in the wild — mobile apps installed months ago, partner integrations you can't redeploy. A breaking change to a live API breaks every consumer who hasn't upgraded, and you can't upgrade them for them.

## The idea

Expose old and new contracts side by side under distinct version identifiers; deprecate the old one on a published schedule.

## Picture it

A train station with two platforms running different timetables. New trains leave from platform 2; the old schedule keeps running from platform 1 until the last passenger has moved. You don't tear up platform 1 the day platform 2 opens.

## How it maps

```
the station                    →  your public API surface
platform 1 (old timetable)     →  v1 contract — frozen, still serving old clients
platform 2 (new timetable)     →  v2 contract — breaking changes live here
platform number on the board   →  version selector: URL path, header, or query param
timetable posted weeks ahead   →  deprecation headers / dates announced to clients
last old train leaves          →  v1 sunset: cutoff after which it stops serving
conductor checking tickets     →  version routing: request → correct handler
shared track segments          →  shared internal code; versions diverge at the edge
```

## Primary force

A breaking change to an API in use breaks every client that hasn't upgraded — and you don't control when they upgrade. Versioning gives you a parallel track: old clients keep working on v1 while new ones use v2, and you deprecate v1 on a schedule the consumers can plan around. Pick one selector (path, header, or query param) and stick with it; the mechanism matters less than the discipline of honoring both versions until the sunset date you promised.

## When to reach for it

- Public APIs with external clients you don't control or can't force-upgrade.
- Mobile APIs where old client versions linger in the wild for years.
- Internal APIs with many independently-deployed consumers.

## When NOT to reach for it

- Pre-launch APIs with no real callers — version when you have something to protect.
- Internal APIs within a single deploy unit — just refactor and redeploy atomically.
- Shipping v1 with no deprecation policy — you'll paint yourself into a corner the first breaking change.
- Versioning the whole API when one field changed — prefer field-level schema evolution.

## Evidence a topic touches this

- Keywords: API version, /v1/, /v2/, Accept header, deprecation, breaking change
- Files: `**/api/v*`, `**/versioned*`, `**/routes/*`
- Commit verbs: "bump to v2", "deprecate v1", "add version path", "support both versions"

## Deeper reading

- Stripe API versioning (date-based version pinning)
- GitHub REST API v3 → v4 (REST → GraphQL) migration story
- "Designing Web APIs" (Jin, Sahni, Shevat) ch. 7
