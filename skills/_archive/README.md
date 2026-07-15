# Archived skills

Skills decommissioned but **not deleted** — parked here, outside the `skills/gabe-*/` glob that
`install.sh` and `suite-doctor.sh` walk, so they are neither installed nor drift-checked. Git
history is not the archive mechanism on purpose: the operator wants reinstatement to be one move,
not an archaeology dig.

| Skill | Archived | Why |
|---|---|---|
| `gabe-teach` (2.0.1) + `_templates/gabe-lens-learning.md` | 2026-07-15 | The 2,554-line reference corpus served ~2 observed real uses across both dogfood projects (trim-matrix audit). Capability parked, not judged worthless. |
| `gabe-arch` (1.1.1) + `_templates/gabe-arch-{STATE,HISTORY}.md` | 2026-07-15 | Existed solely to feed `gabe-teach` — rides its fate. |

## Reinstate

1. `git mv skills/_archive/gabe-teach skills/gabe-teach` (same for `gabe-arch`; move its
   `_templates/*` back to `templates/`).
2. Restore the init bootstrap: init-spec §"~/.claude/gabe-arch/ global state" (see the archived
   note left in place there) and the teach rows in CLAUDE.md / README / help-spec.
3. `./install.sh` && `scripts/suite-doctor.sh` (must be CLEAN).

## Residue, by design

- `~/.claude/gabe-arch/` (the user's cross-project learning state) is **left untouched** —
  user data survives decommission.
- Legacy-gated mentions of `/gabe-teach` remain in some specs (gate-spec docs-audit well
  machinery, review-spec mark-stale, assess-spec wells note, docs-spec well-doc template).
  All are behind "only when a legacy `.kdbp/KNOWLEDGE.md` / well doc exists" guards and no-op
  on current projects. Active ROUTING (init next-steps, execute/push/commit teach nudges,
  catalogs) was removed at archive time.
