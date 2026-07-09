# Push Configuration

Managed by `/gabe-push`. First run writes this file; every run after reads it.
Edit values directly or rerun `/gabe-push --reconfigure` to redo the interview.

## Defaults

| Setting | Value |
|---------|-------|
| remote | origin |
| default_env | production |
| pr_template | none |

## Environments

<!-- One block per env. `/gabe-push <name>` targets the env named below. -->
<!-- `/gabe-push` (no arg) targets default_env. -->

### production

| Setting | Value |
|---------|-------|
| target_branch | main |
| promote_from | — |
| ci | none |
| branch_cleanup | ask |

<!--
target_branch:   The branch this env lives on remotely.
promote_from:    If set (e.g., "staging"), /gabe-push for THIS env checks if
                 origin/<promote_from> is ahead of origin/<target_branch> and
                 offers to promote it (push origin/<promote_from> -> <target_branch>).
                 Leave blank/— when the env has no upstream source env.
ci:              github-actions | none
branch_cleanup:  ask | always | never   (applies to source branch after successful push)
-->

<!-- Example second env (uncomment + adjust on staging-then-prod setup):
### staging

| Setting | Value |
|---------|-------|
| target_branch | staging |
| promote_from | — |
| ci | none |
| branch_cleanup | ask |
-->

## Remote branch policy

| Setting | Value |
|---------|-------|
| known_branches | main |
| on_extra | prompt |

<!--
known_branches:  Comma-separated list of remote branches /gabe-push recognizes. Any other
                 branch detected on origin at Step 2.7 triggers on_extra policy (unless the
                 branch appears in the Decisions log below).
on_extra:        prompt | ignore | block
                   prompt → ask the user what to do (then persist the answer)
                   ignore → silently skip extras every run
                   block  → stop the push until the extras are resolved
-->

## Decisions log

<!-- Auto-appended by /gabe-push Step 2.7 when the user decides what to do with an extra remote branch. -->
<!-- One row per decision, keyed by branch name. Dedup: if a row with the same branch exists, update in place. -->

| Branch | Action | Decided | Notes |
|--------|--------|---------|-------|

<!-- Actions: ignore-always | delete-remote | register-as-env=<name> -->
