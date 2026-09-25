"""The board's SEATS — a picture of the code, mounted on a centre page (D-043 · D-046).

A seat is a labelled strip that holds a mini universe of ONE subject (the pane runtime in
shell/assets/: `_pane.js` and its siblings). The board carries two, in this order:

  the spine    the LEDGER's five beats (RED · EXECUTE · REVIEW · COMMIT · PUSH) as columns, each a
               picker over the commits that beat recorded, newest first — a control, it draws nothing
  the changes  the newest commits in commits.js as ONE pane and a picker; a spine pick that commits.js
               carries selects it here. One pane at a time = one WebGL context per seat

MARKUP ONLY. The data rides the feeds (`commits.js` · `spine.js`, written by `_a3_commits.refresh_feeds`
in one step and refreshed by the E8 beat tail), the behaviour rides `assets/seats.js`, the look
`assets/seats.css` — so a regen never bakes a feed into a tracked page, and a seat that cannot boot
(a feed or a runtime file not loaded) still says what it needs: the head's text below is the page's
own words until seats.js replaces it.

The strip goes OUTSIDE every table (no rowmarks), carries no id= (the crawl gate's duplicate-id check)
and no `{{` (the slot counter), and never folds with the intro (`.desc-min` hides `.pagehead p`, which
a seat never holds): a pane measures its width ONCE, at mount, and one mounted hidden falls back to
900 px and never reflows — wider than the column it later shows in.
"""
from __future__ import annotations

# what the head says when seats.js never ran — the page on its own, with no feed and no runtime
FALLBACK = "needs spine.js · commits.js · the pane runtime — not loaded"


def _seat(kind: str, label: str, extra: str = "") -> str:
    return (f'<div class="seat" data-seat="{kind}"{extra} data-sec="board.{kind}">'
            f'<div class="seat-hd"><b>{label}</b><span>{FALLBACK}</span></div>'
            f'<div class="seat-row"></div></div>')


def board_seats(cap: int) -> str:
    """`{{BOARD_SEATS}}` — the spine strip, then the commit picker over at most ``cap`` commits
    (``_a3_commits.N``, so the picker and the feed can never disagree on how many there are)."""
    return "\n".join((
        '<div class="seats" data-sec="board.seats">',
        _seat("spine", "the spine"),
        _seat("commits", "the changes", f' data-cap="{int(cap)}"'),
        "</div>"))
