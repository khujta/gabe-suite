# Codex Command Bridge

Read this file when: running under Codex.

## Codex Command Bridge

When Codex invokes `Gabe Review` by any phrasing (slash-style `/gabe-review`,
"review this", or a picker selection), this skill is the complete contract:
follow `SKILL.md` (argument routing, modes) and its binding spec
`references/review-spec.md` (process, output contracts) exactly — including
command-time output behavior such as `Gabe-Lens block` rendering, singleton
`REVIEW.md` reconciliation, and mode-specific skips.

Do not go looking for a separate command wrapper; the skill directory is the
single source of truth in every host. If a legacy `gabe-review.md` command
file is still present from an older install, it is a frozen mirror — this
skill controls.
