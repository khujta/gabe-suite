# Skin spec — "Station Card" (Skin J, LIGHT-ONLY) — FINAL

- **Decision trail:** G "Pixel Console" was the round-5 pick; round-6 made the build LIGHT-ONLY; round-10 fixed the
  type system (two-voice hierarchy) and introduced J; **round 11 (operator, 2026-07-10): "Use J" — J · Station Card
  is the FINAL skin.** Chosen over B·light / E / F / G after touring all four layouts in every candidate.
- **Design intent (recorded):** the laminated station card a line cook tapes above their station — an artifact whose
  entire purpose is one-glance reading mid-rush. Reading speed is the metric; the skin serves the semantic channels
  (state color, criticality weight, freshness) and never competes with them.
- **Binding artifacts:** `mockups/center-skins.css` — the base component system + the `[data-skin="j"]` block IS the
  skin source (port both; collapse `[data-skin="j"]` into the defaults at port time) — plus the four multi-layout
  mockups viewed in J (`center-hub-multi.html`, `center-board-multi.html`, `center-tests-multi.html`,
  `center-drill-multi.html`). The older G-only mockups and the A–I skin blocks are historical record only.
- **Consumer:** the gustify session, spike step A1+ (`02-spike-plan.md`). Writable surfaces only.

## 1. Design tokens (build the Light column only — there is no dark mode)

| Token | Value |
|---|---|
| `--page` | `#f2efe8` (warm-neutral paper — calmer than G's cream) |
| `--surface` | `#fffefb` |
| `--panel` | `#faf8f2` |
| `--ink` / `--ink2` / `--muted` | `#26221c` / `#5d564b` / `#948b7d` |
| `--line` (strong) / `--line-soft` | `#3b3630` / `#e3ded4` |
| `--accent` (criticality/alert ONLY) | `#c2461e` persimmon |
| `--good` / `--fail` / `--stale` | `#2e7d32` / `#c2461e` / `#a87b10` |
| `--bright` (headline ink) | `#14110d` |
| `--good-t` / `--fail-t` / `--stale-t` | `#e9f2e6` / `#fae7de` / `#f6efdc` |
| `--shadow` | `0 2px 0 rgba(59,54,48,.16)` — flat under-edge, grounded not floating |
| `--radius` / `--bw` | `8px` / `1.5px` |
| `--font-body` | `14px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif` |
| `--font-mono` | `ui-monospace,'Cascadia Mono',Consolas,monospace` |
| `--font-head` | body stack, weight 800 |

## 2. Rules (the Station Card contract)

1. **Two-voice type (round-10 ruling):** sans carries everything you READ — body, card/ticket titles (800-weight,
   `letter-spacing:-.01em`, `line-height:1.25`), prose, tables. Mono carries ONLY telemetry — the system name
   (`GUSTIFY::…`), timestamps/clock, freshness stamps (`T−2h`), the event ticker, log lines, `autotag` badges.
   Mono never carries a sentence; sans never carries telemetry.
2. **Left rails = the checklist idiom (J's signature):** grid cells carry a `5px` left border in their STATE color
   (`--good`/`--stale`/`--fail`; `--line-soft` when empty), text left-aligned beside it. The eye scans the rail
   column, not the fills. Tints stay as quiet backgrounds.
3. **Criticality (size/border channel):** the T1 row's cells switch full border-color to `--accent` with a `7px`
   left rail; tier label in `--accent`. T1 is always the first row. Neutral structural cards (stats, group cards,
   panels, first table column) carry a `5px` `--line` rail.
4. **Section headers = laminated tab-chips:** `h2` renders as an inline dark chip (`background:--line`,
   `color:#f2efe8`, radius 5, letter-spacing `.14em`, uppercase) with the PixelLab kind icon inside
   (`filter:brightness(1.35)`) and the italic analogy subtitle in `rgba(242,239,232,.72)`.
5. **State (color channel):** value color + tint background = `--good/--fail/--stale`; skip/void = `--muted`,
   dashed border, no shadow, no rail color. Color never encodes anything but state.
6. **Kind (icon channel):** the PixelLab set at 22–30px, `image-rendering: pixelated`. Oven mitt = hand-run marker.
7. **Numbers:** `font-variant-numeric: tabular-nums`, large (stat tiles ~1.7rem), tight tracking.
8. **Freshness:** relative mono stamps (`T−2h`) in `--muted`; stale items also carry the `--stale` tint/rail.
9. **Shadows:** the flat under-edge `--shadow` only — no blur, no offsets in two axes, nothing floats.
10. **Chrome:** topbar (pot icon + mono system name in `--ink` + breadcrumb + right mono clock, `--bw` bottom
    border) · nav strip (active item = filled dark chip like the h2 tabs) · bottom event ticker (mono, `✓/⚠`).
11. **Theme:** LIGHT-ONLY — no toggle, no `data-theme`, no media query. All colors via the custom properties above
    (a future dark mode stays a one-block option). The multi-mockups' skin-switcher is mockup-only tooling.
12. **Voice (content, not skin — unchanged):** kitchen-console microcopy ("risk matrix — what could burn",
    "on the pass", "dress rehearsals") · title + italic analogy subtitle per section · one worked example per
    section (the allergy-thread pattern).
13. **Semantics inherited, never restyled:** color=state · icon=kind · size/border/rail=criticality · freshness
    visible · IDs derive from names.

## 3. What wears this skin

Every center page: hub (with the three lenses — risk / levels / recency), board, tests, drill. OSS leaf reports
(coverage HTML, Playwright report) are LINKED, never reskinned. The docs-site Cifra shell keeps its own look —
the center is the `center/` subtree with its own skin.

## 4. Runner-up record

Kept-but-not-chosen at the final: B·light (light console), E (Bento Glass), F (Blueprint), G (Pixel Console — the
long-time provisional pick; its type fix lives on in rule 1). Discarded along the way: A Cifra, C Pixel Kitchen,
D Editorial, H Swiss, I Gallery Hall. If Station Card ever wears thin, the multi-mockups + `center-skins.css`
preserve every candidate for a one-file revisit.
