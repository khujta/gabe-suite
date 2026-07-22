#!/usr/bin/env python3
"""A3 command-center render helpers — pure, data-free HTML builders.

Split out of build_center_a3.py (which crossed its 800-line budget): nothing
here reads a machine source or touches global state, so these are safe to reuse
from any station builder and trivial to reason about in isolation.

Every helper enforces one of the center's rendering rules:
  md()     markdown markers are RENDERED, never leaked into the page
  trunc()  cuts on a word boundary — a mid-word chop reads as corrupted data
  table()  repeated records get a REAL header row, never title-only columns
  gap()    an absent source is a NAMED gap, never a zero
"""

from __future__ import annotations

import html
import re

E = html.escape


def strip_slot_doc_comments(text: str) -> str:
    """Template-authoring comments document slot NAMES (they contain {{TOKEN}}).
    A generated page must not carry them, else substitution duplicates filled
    blocks inside inert comments. Content comments are kept."""
    return re.sub(r"<!--.*?-->",
                  lambda m: "" if "{{" in m.group(0) else m.group(0),
                  text, flags=re.DOTALL)


def md(text: str) -> str:
    """Card / PENDING / LEDGER text is markdown — render **bold**, *italic* and
    `code`, never leak the markers. Code spans are stashed FIRST so a glob like
    `*scan*` inside them is not read as emphasis. Unbalanced markers left by
    truncation are stripped."""
    t = E(text)
    codes: list[str] = []

    def _stash(m: re.Match) -> str:
        codes.append(m.group(1))
        return f"\x00{len(codes) - 1}\x00"

    t = re.sub(r"`([^`]+)`", _stash, t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"\*([^*\n]+?)\*", r"<em>\1</em>", t)
    t = t.replace("**", "").replace("*", "").replace("`", "")
    return re.sub(r"\x00(\d+)\x00",
                  lambda m: f"<code>{codes[int(m.group(1))]}</code>", t)


def trunc(text: str, n: int) -> str:
    """Cut on a WORD boundary — a mid-word chop reads as corrupted data."""
    text = text.strip()
    if len(text) <= n:
        return text
    cut = text[:n].rsplit(" ", 1)[0].rstrip(" ,;·(")
    return f"{cut}…"


def pmore(text: str, n: int, small: bool = False) -> str:
    """Long cell text truncated at a word boundary with a ⊕ that expands it IN
    PLACE (no script). A cut sentence with no way to finish it is worse than no
    sentence — every truncation on a page must carry its own expander."""
    text = (text or "").strip()
    if not text:
        return '<span class="sub">—</span>'
    body = md(text)
    if len(text) <= n:
        return f"<small>{body}</small>" if small else body
    cut = E(trunc(text, n))
    inner = (f'<span class="cut">{cut}</span><span class="full">{body}</span>'
             f"<i></i>")
    inner = f"<small>{inner}</small>" if small else inner
    return f'<details class="pmore"><summary>{inner}</summary></details>'


def kpi(label: str, value: str, sub: str = "", alert: bool = False) -> str:
    """A KPI card."""
    cls = "kpi alert" if alert else "kpi"
    sub_html = f'<div class="sub">{E(sub)}</div>' if sub else ""
    return (f'<div class="{cls}"><div class="lab">{E(label)}</div>'
            f'<div class="val">{E(value)}</div>{sub_html}</div>')


def lines_grade(n: int, thousands: bool = False) -> str:
    """The 800-line budget as colour — green at/below the cap, deepening red
    toward 2,000, capped there. The number IS the flag.

    ONE definition, shared by the code map (`thousands=False` → `812`) and the
    structure move (`thousands=True` → `1,293`) so the two Lines columns cannot
    drift on threshold or curve — only on the digit-grouping the caller asks
    for. Move the 800 budget here and both surfaces move together."""
    fmt = f"{n:,}" if thousands else f"{n}"
    if n <= 800:
        return f'<b style="color:var(--good)">{fmt}</b>'
    frac = min((n - 800) / 1200, 1.0)
    r = int(0xE5 + (0xB7 - 0xE5) * frac)
    g = int(0x73 + (0x1C - 0x73) * frac)
    b = int(0x73 + (0x1C - 0x73) * frac)
    return f'<b style="color:rgb({r},{g},{b})">{fmt}</b>'


def frow(name: str, desc: str, meta: str, href: str | None = None) -> str:
    inner = (f'<div class="nm"><b>{E(name)}</b><p>{E(desc)}</p></div>'
             f'<div class="meta">{meta}</div>')
    return (f'<a class="frow" href="{href}">{inner}</a>' if href
            else f'<div class="frow">{inner}</div>')


def table(headers: list[str], rows: list[list[str]],
          num: set[int] | frozenset = frozenset(), note: str = "",
          expand: list[tuple[str, str]] | None = None,
          widths: list[str] | None = None) -> str:
    """Any repeated-record section renders as a REAL table with a labeled header
    row — never a card list whose columns are only explained in the section
    title. Cell content is pre-escaped by the caller (it may carry markup).

    `expand` is parallel to `rows`: each (summary, html) pair renders as an
    expander row directly UNDER its record, so the row's detail opens in place
    instead of on a page the reader has to navigate away to. An empty pair
    means that record has nothing to open.

    `widths` (parallel to `headers`) pins each column's width and switches the
    table to fixed layout — so a wide-column table (the action ledger) gives its
    text columns room instead of letting the browser starve them."""
    if not rows:
        return f'<p class="sub">{E(note or "nothing to show")}</p>'
    # A short `expand` list used to drop the trailing rows' detail in silence.
    # A build script may fail loudly; a page may not lie quietly.
    if expand is not None and len(expand) != len(rows):
        raise ValueError(f"table(): {len(rows)} row(s) but {len(expand)} "
                         f"expander(s) — the lists must be parallel")
    head = "".join(f'<th class="num">{E(h)}</th>' if i in num else f"<th>{E(h)}</th>"
                   for i, h in enumerate(headers))
    body = ""
    for i, r in enumerate(rows):
        body += ("<tr>" + "".join(
            f'<td class="num">{c}</td>' if j in num else f"<td>{c}</td>"
            for j, c in enumerate(r)) + "</tr>")
        summary, inner = (expand[i] if expand and i < len(expand) else ("", ""))
        if summary and inner:
            body += (f'<tr class="exp"><td colspan="{len(headers)}">'
                     f'<details class="more"><summary>{summary}</summary>'
                     f"{inner}</details></td></tr>")
    # The note is prose: markdown markers are RENDERED (a leaked `code`
    # span or a literal <code> tag reads as corrupted output).
    tail = f'<p class="sub">{md(note)}</p>' if note else ""
    cls = "tbl wcol" if widths else "tbl"
    colgroup = ("<colgroup>"
                + "".join(f'<col style="width:{w}">' for w in widths)
                + "</colgroup>") if widths else ""
    return (f'<div class="panel"><table class="{cls}">{colgroup}'
            f"<thead><tr>{head}</tr></thead>"
            f"<tbody>{body}</tbody></table></div>{tail}")


def xtable(columns: list[str], rows: list, widths: list[str] | None = None,
           note: str = "") -> str:
    """An EXPANDABLE-ROW table: the summary IS the row — clicking anywhere on it
    opens the row's detail in place, no separate button (`.xtbl`/`.xrow` shell
    CSS). One component for the data model, the test matrix and the proof shelf.

    `rows` items are (cells, detail_html[, row_id]) — cells pre-escaped by the
    caller; a row with empty detail renders FLAT (no toggle). `widths` are grid
    fractions parallel to `columns` (default equal); a trailing chevron column
    is appended automatically."""
    widths = widths or (["1fr"] * len(columns))
    tmpl = " ".join(widths) + " 20px"
    head = ('<div class="xhead">'
            + "".join(f"<span>{E(c)}</span>" for c in columns)
            + "<span></span></div>")
    body = []
    for row in rows:
        cells, detail = row[0], row[1]
        rid = row[2] if len(row) > 2 else ""
        idattr = f' id="{rid}"' if rid else ""
        summ = ("".join(f"<span>{c}</span>" for c in cells)
                + '<span class="xtgl"></span>')
        if detail:
            body.append(f'<details class="xrow"{idattr}><summary>{summ}</summary>'
                        f'<div class="xbody">{detail}</div></details>')
        else:
            body.append(f'<div class="xrow xflat"{idattr}>'
                        f'<div class="xsummary">{summ}</div></div>')
    tail = f'<p class="sub">{md(note)}</p>' if note else ""
    return (f'<div class="xtbl" style="--xcols:{tmpl}">{head}'
            + "".join(body) + f"</div>{tail}")


def meter(done: int, total: int, label: str = "") -> str:
    """A count and its proportion in ONE cell: the bar carries the shape, the
    percentage the precision, and the caller's label the denominator. A bar
    alone hides the count; a percentage alone hides the denominator."""
    if total <= 0:
        return '<span class="sub">—</span>'
    pct = round(done * 100 / total)
    fill = "" if pct == 100 else f' class="{"warn" if pct >= 80 else "bad"}"'
    full = " full" if pct == 100 else ""
    txt = label or f"{pct}%"
    return (f'<span class="meter{full}"><span class="bar">'
            f'<i{fill} style="width:{pct}%"></i></span>'
            f'<span class="pct">{E(txt)}</span></span>')


def subnav(items: list[tuple[str, str, str]]) -> str:
    """Per-tab secondary navigation — iconed section anchors, sticky under the
    tabbar, vertically centered."""
    links = "".join(
        f'<a href="#{i}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{icon}</svg>'
        f"{E(label)}</a>" for i, label, icon in items)
    return f'<nav class="subnav">{links}</nav>'


def _sec_slug(text: str) -> str:
    """A stable, filename-safe section identity from free text — the last-resort
    data-sec when a call passes neither sec_id nor id_."""
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "section"


def sechead(gtag: str, title: str, color: str, icon: str, sub: str = "",
            id_: str = "", info: str = "", open_: bool = False,
            sec_id: str = "") -> str:
    """A tinted, iconed section banner. When a description or legend exists it
    collapses behind a ⊕ beside the title (the title row IS the toggle) — the
    reader opts into the explanation; tables never hide.

    Two exceptions, both from the myopic walk: a `legend()` COLOR KEY always
    renders outside the disclosure (a key nobody can see explains nothing), and
    a section whose banner defines an INTERACTION CONTRACT passes open_=True —
    the viewer's keyboard map shipped closed and the readers who most needed it
    never found it.

    `sec_id` stamps `data-sec="<id>"` on the banner — the section-identity marker
    map v3 requires on EVERY generator-owned section (the station shells carry it
    on their `<section>` wrapper; the generator's feature-tab sections had lost
    it). It is auto-derived from `id_` (dropping the page-anchor `sec-` prefix)
    or, failing that, the title — so no section renders without an identity, but
    passing sec_id explicitly is how two pages name the SAME section the same way."""
    sec_id = sec_id or (id_.removeprefix("sec-") if id_ else _sec_slug(title))
    id_attr = f' id="{id_}"' if id_ else ""
    sec_attr = f' data-sec="{E(sec_id)}"' if sec_id else ""
    head = (f'<div class="sechead"{id_attr}{sec_attr} style="--gc:{color}"><span class="secic">'
            f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
            f"{icon}</svg></span><div>")
    title_h2 = f'<h2><span class="gtag">{E(gtag)}</span> {E(title)}'
    # A LEGEND is the key to colors the table below is already using — it has to
    # be readable without opening anything. Prose explanation stays behind the ⊕.
    # All 13 of these shipped closed, so a reader met colored tags with no key
    # and never learned the viewer's own keyboard contract. legend() is the only
    # producer of `<div class="leg">`, so the split is deterministic.
    legends = "".join(re.findall(r'<div class="leg key">.*?</div>', info, re.S))
    prose = re.sub(r'<div class="leg key">.*?</div>', "", info, flags=re.S).strip()
    body = (f"<p>{E(sub)}</p>" if sub else "") + prose
    if body:
        head += (f'<details class="secinfo"{" open" if open_ else ""}>'
                 f'<summary>{title_h2} '
                 f'<i class="tgl"></i></h2></summary>'
                 f'<div class="secbody">{body}</div></details>')
    else:
        head += f"{title_h2}</h2>"
    return f"{head}</div></div>{legends}"


def legend(intro: str, items: list[tuple[str, str, str]]) -> str:
    """A color legend line: (css-class, label, meaning) chips after a title —
    a color that isn't explained right where it's used is decoration."""
    chips = " ".join(f'<span class="tag {cls}">{E(label)}</span> {E(meaning)}'
                     for cls, label, meaning in items)
    return f'<div class="leg key">{E(intro)} {chips}</div>'


def gap(what: str, source: str) -> str:
    """An absent source renders as a NAMED gap — never as a zero, never staged."""
    return (f'<div class="callout"><h3>{E(what)} — not wired</h3>'
            f'<div class="items"><span>Source: <b>{E(source)}</b> — absent. '
            f'Named gap, not a zero.</span></div></div>')


def card_html(lines: list[str]) -> str:
    """Card prose -> HTML. Bullets become a list; everything else a paragraph."""
    out, bullets = [], []
    for ln in lines:
        s = ln.strip()
        if s.startswith("- "):
            bullets.append(f"<li>{md(s[2:])}</li>")
            continue
        if bullets:
            out.append("<ul>" + "".join(bullets) + "</ul>")
            bullets = []
        if s:
            out.append(f"<p>{md(s)}</p>")
    if bullets:
        out.append("<ul>" + "".join(bullets) + "</ul>")
    return "".join(out)
