# Archived checks — decommissioned, not deleted

Moved here by the 2026-07-22 alignment review (finding M10): both checks below
validate a suite shape that no longer exists, so they could NEVER pass — and a
check that cannot pass is worse than no check, because its permanent red trains
everyone to ignore red.

- `suite-docs/check.py` — asserts the retired `commands/` directory (B2
  skills-only migration removed it), the archived gabe-teach/gabe-arch, the
  "12 skills / 21 command wrappers" era counts, and the dropped `~/.agents`
  install target.
- `architecture-principles/check.py` — asserts an AP-catalog shape
  (per-command AP references) from the same pre-migration era.

The live residue each once carried now has a real owner:

- Doc currency (runtime docs must not present archived skills as live) — the
  suite-doctor archived-slug grep (G1, lands with the P3 doc purge).
- Harness liveness (a battery that exists must run green) — the suite-doctor
  G3 invariant runs every zero-arg `tests/*/run.sh`; this `_archive/` dir is
  excluded by name.
- The AP-catalog shape itself is deliberately UNWATCHED: AP1–AP13 are advisory
  context for /gabe-align, /gabe-debt and /gabe-review, low-churn by design —
  recorded here so the absence of a checker reads as a ruling, not an
  oversight.

To reinstate one: rewrite it against the CURRENT inventory first — resurrecting
either as-is just restores the permanent red.
