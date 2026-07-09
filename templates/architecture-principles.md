# Architecture Principles

Shared advisory architecture checks for the Gabe Suite. These principles are not
hard gates by themselves. Gabe commands may cite an AP ID only when the target,
diff, decision, or finding has concrete evidence that touches the principle.

## Runtime contract

- Load this catalog for architecture-aware commands from the first available path:
  `templates/architecture-principles.md`,
  `~/.claude/templates/gabe/architecture-principles.md`.
- Treat AP checks as advisory. They produce CONCERN context, review citations, or
  debt annotations; they do not block commits or PRs unless a project-local rule
  or value separately makes the issue blocking.
- Do not create a finding from an AP principle alone. First identify evidence via
  a target artifact, diff, rule, pattern, or review finding, then attach the AP
  citation that explains the architectural force.
- Prefer exact AP IDs in output, for example: `AP8 explicit state`.

## Catalog

### AP1 - Single idea

**Principle:** Good design is a single idea pervaded throughout.
**Advisory test:** Can the system's main organizing idea be stated in one clear
sentence, and do the modules, names, data model, and user flows reinforce it?
**Evidence signals:** competing metaphors, mixed product models, duplicated
abstractions for the same job, or docs/code that explain the same surface in
incompatible ways.

### AP2 - Minimize surprise

**Principle:** More generally, your goal should be to minimize surprise.
**Advisory test:** Would a user or maintainer predict this behavior from the
name, type, route, command, or previous pattern?
**Evidence signals:** hidden defaults, surprising fallbacks, overloaded names,
side effects in read-looking operations, or behavior that contradicts adjacent
commands/components.

### AP3 - Allowed means used

**Principle:** If your system allows it, people will do it.
**Advisory test:** Does the design prevent the unsafe or unsupported path, or
does it merely hope users avoid it?
**Evidence signals:** missing guardrails, impossible states representable in the
model, permissive APIs, optional validation for required invariants, or comments
that warn against an action the interface still permits.

### AP4 - Everyone will not just

**Principle:** If your solution starts with "if everyone will just...", then you
do not have a solution.
**Advisory test:** Is correctness enforced by structure, automation, or
interfaces instead of team memory and repeated manual discipline?
**Evidence signals:** manual sync steps, runbook-only invariants, checklist-only
safety, required ordering not encoded in the workflow, or comments that ask
future maintainers to remember a hidden constraint.

### AP5 - Transform/use separation

**Principle:** Isolate the parts of your system that transform data from the ones
that use it. Data models outlive code.
**Advisory test:** Are parsing, normalization, migration, and projection
separated from business logic and UI usage?
**Evidence signals:** UI code normalizing API payloads, persistence code owning
presentation shape, business logic performing ad hoc parsing, or no named
boundary between canonical data and derived views.

### AP6 - Coupling

**Principle:** Coupling is the root of most evil.
**Advisory test:** Can one concern change without forcing unrelated modules,
commands, data stores, or user flows to change at the same time?
**Evidence signals:** cross-feature direct mutation, shared mutable state,
wide imports, circular dependencies, god files, or test failures that require
touching unrelated domains.

### AP7 - Versioning

**Principle:** Versioning is inevitable.
**Advisory test:** Does the design have an explicit version, compatibility, or
migration story for data, APIs, prompts, generated artifacts, and persisted state?
**Evidence signals:** unversioned payloads that cross boundaries, one-way schema
changes, TODO compatibility shims, generated artifacts without format versions,
or callers assuming all producers update at once.

### AP8 - Explicit state

**Principle:** Make state explicit.
**Advisory test:** Can a reader locate who owns state, how it changes, and what
states are valid without reconstructing behavior from scattered side effects?
**Evidence signals:** implicit global state, hidden caches, flags inferred from
timestamps or missing rows, multi-op stale state, async listener races, or state
machines spread across files.

### AP9 - Single source of truth

**Principle:** Every piece of information should have a single source of truth.
**Advisory test:** Is each fact authored once and derived elsewhere, or are
multiple files hand-maintaining equivalent information?
**Evidence signals:** duplicated constants/enums, hand-synced docs and code,
parallel config files, source and generated output both edited, or multiple
stores competing for canonical ownership.

### AP10 - Naming

**Principle:** You should spend more time thinking about naming things correctly.
**Advisory test:** Does the name expose the true responsibility, boundary, and
level of abstraction?
**Evidence signals:** vague names (`manager`, `handler`, `data`, `thing`),
names that promise more than they do, names hiding side effects, or inconsistent
terms for the same concept across commands/docs/code.

### AP11 - Testability

**Principle:** If testing is difficult, the design is wrong.
**Advisory test:** Can the important behavior be exercised without excessive
setup, sleeps, network dependence, global mutation, or brittle inspection?
**Evidence signals:** tests requiring full-system boot for local logic, no seam
for injected dependencies, untestable async timing, hidden side effects, or
review findings where the only verification is manual.

### AP12 - Documented decisions

**Principle:** You will regret every undocumented decision.
**Advisory test:** Is there a durable decision record for choices that shape
future implementation, scope, APIs, data, or operational behavior?
**Evidence signals:** architecture implied only by code, repeated debates with no
ADR/rule, TODOs replacing decisions, conflicting docs, or scope changes without
DECISIONS/SCOPE/PLAN updates.

### AP13 - Communication tax

**Principle:** Communication is a tax that you should justify before paying it.
**Advisory test:** Does this interface, handoff, service boundary, or process
justify the coordination cost it adds?
**Evidence signals:** unnecessary service or package splits, extra handoff docs
without clear readers, approval loops for local decisions, chat-only contracts,
or boundaries whose only purpose is organizational neatness.
