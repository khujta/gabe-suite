# Gabe Suite Workflows

**Purpose:** choose the right project-start path before writing code.

## Quick Chooser

| Situation | Use | First command |
|-----------|-----|---------------|
| New app from an idea | [Greenfield](greenfield.md) | `/gabe-align deep "<idea>"` |
| Existing codebase, no KDBP | [Brownfield](brownfield.md) | read-only inventory, then `/gabe-init <name>` |
| Existing codebase with KDBP | [Brownfield](brownfield.md) | `/gabe-help`, then `/gabe-init update` if needed |
| Existing active plan | [Core workflow](../WORKFLOW.md) | `/gabe-next` |
| Shipped work needs explaining / testing invisible | Testing Command Center (`/gabe-feature`) | `/gabe-feature status`, then `backfill` |

## Common Rule

Do not start with implementation — the reflex this page exists to interrupt. Start by finding the current state:

- For greenfield, the current state is the idea, constraints, and intended user.
- For brownfield, the current state is the repository, tests, docs, existing decisions, and drift.

AP1-AP13 from `templates/architecture-principles.md` are advisory checks throughout both workflows. They explain design pressure; they do not create hard gates by themselves.

## Related

- [Greenfield workflow](greenfield.md)
- [Brownfield workflow](brownfield.md)
- [Suite state audit](../suite-state-audit.md)
- [Core workflow state machine](../WORKFLOW.md)
- [Workflow gaps](../GAPS.md)
