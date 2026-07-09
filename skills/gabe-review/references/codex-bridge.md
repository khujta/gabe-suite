# Codex Command Bridge

Read this file when: running under Codex.

## Codex Command Bridge

When Codex invokes this skill as the `Gabe Review` command surface, first read
the active command wrapper from `.agents/commands/gabe-review.md`,
`~/.agents/commands/gabe-review.md`, or
`~/projects/gabe_lens/commands/gabe-review.md`, then preserve that command's
argument routing and visible output contract. This `SKILL.md` is the review
engine referenced by the command file; if there is any conflict, the command
file controls command-time behavior such as `Gabe-Lens block` rendering,
singleton `REVIEW.md` reconciliation, and mode-specific skips.
