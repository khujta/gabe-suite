---
id: authn-vs-authz
name: "Authentication vs Authorization (Authn vs Authz)"
tier: foundational
specialization: [security]
tags: [authn, authz, identity, permissions, rbac]
prerequisites: []
related: [input-validation-at-boundary]
one_liner: "Authn proves who you are; authz decides what you're allowed to do — two problems, two layers."
---

## The problem

"If they're logged in, let them through" is how production breaches happen — any authenticated user ends up able to read any other user's data because nobody checked per-resource permissions. Conflating identity with permission is a top source of access-control bugs.

## The idea

Authn (Authentication) proves who the caller is; authz (Authorization) decides what that caller may do — keep them in separate layers that evolve independently.

## Picture it

A nightclub. The bouncer at the door checks your ID and decides you're really Alex. Inside, a separate velvet rope at the VIP lounge decides whether Alex — now known — gets past. Same person, two independent gates, different staff, different rules.

## How it maps

```
bouncer at the door          →  authn middleware (OAuth, JWT, session cookie)
your ID / passport           →  credential presented by the caller
"yes, you're Alex"           →  authenticated identity attached to the request
VIP rope inside              →  authz check at each protected resource
"Alex is on the list"        →  policy / role / ACL lookup for this action
bouncer swap at 10pm         →  swap SSO provider without touching permissions
rope moved to new room       →  change permission rules without re-authenticating
```

## Primary force

Conflating identity and permissions is a top source of production security bugs. Authn happens once per request (or session) via standards like OAuth, JWT (JSON Web Token), or session cookies. Authz happens on every resource access via role checks, policy engines, or ACLs (Access Control Lists). Keeping them in separate layers means you can change how users log in (SSO rollout, password policy) without touching permissions, and refactor permissions (RBAC → ABAC) without re-authenticating users.

## When to reach for it

- Any multi-user system — literally every one, from day one.
- APIs distinguishing roles, tiers, or per-resource ownership.
- Services acting on behalf of a user against downstream resources (delegation flows).

## When NOT to reach for it

- Don't let authn alone gate action — "logged in" is not the same as "allowed to do X."
- Don't trust client-supplied user IDs in request bodies — use the authenticated session identity.
- Don't trust a JWT payload as authoritative — verify signature AND re-fetch authoritative data.
- Don't protect admin endpoints with obscurity (`/admin-panel-9a8f`) — that's not authz, that's hope.

## Evidence a topic touches this

- Keywords: authn, authz, authorization, permissions, RBAC, role, JWT, OAuth
- Files: `**/auth*`, `**/middleware*`, `**/permissions*`, `**/policies*`
- Commit verbs: "add auth check", "require role", "authorize", "verify JWT"

## Deeper reading

- OWASP ASVS: Authentication (V2), Access Control (V4)
- "The Three Rs of Authorization" — Okta Engineering
- OAuth 2.0 / OIDC specs
