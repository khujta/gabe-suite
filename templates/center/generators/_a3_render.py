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

import hashlib
import html
import re

E = html.escape


# --------------------------------------------------------------------------- #
# NEW-row marking — what changed THIS iteration, badged in place.
#
# Every table/xtable row gets a stable key (table columns + first-cell text +
# occurrence counter) and a content hash (all cells, tags stripped, volatile
# relative-time text normalized out). The builder arms a BASELINE — the
# rows-seen map of the last COMMITTED build (git show HEAD:…/rows-seen.json) —
# and any row whose key is absent or whose hash moved wears a NEW badge.
# Anchoring on HEAD makes the wipe-and-restamp fall out for free: regens
# within one iteration are idempotent, and the moment the snapshot lands in a
# commit the next build's baseline includes it, so old badges vanish and only
# that iteration's touches light up. Baseline None (bootstrap: no snapshot at
# HEAD yet) badges nothing but still records, so the FIRST commit seeds the
# cycle instead of painting the whole estate NEW.
# --------------------------------------------------------------------------- #

# --------------------------------------------------------------------------- #
# Entity icons — every registered entity gets a stable icon, picked
# DETERMINISTICALLY from the pool by slug hash (no authored state, same icon
# every build and everywhere the entity is referenced: sidebar, entity index,
# cross-entity link labels). Pool of 20 distinct stroke glyphs; with a
# realistic registry (≤ ~10 entities) collisions are unlikely and harmless
# (the label always carries the name).
# --------------------------------------------------------------------------- #

import hashlib as _hashlib  # noqa: E402  (also used by the rowmarks engine)

ENTITY_ICON_POOL = [
    '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    '<path d="M12.6 2.9 21 11.4a2 2 0 0 1 0 2.8l-6.8 6.8a2 2 0 0 1-2.8 0L2.9 12.6A2 2 0 0 1 2.3 11V4.3a2 2 0 0 1 2-2H11a2 2 0 0 1 1.6.6z"/><circle cx="7.5" cy="7.5" r="1"/>',
    '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    '<path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
    '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/>',
    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    '<path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
    '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
]


# Named glyphs for the SEMANTIC layer (operator ruling 2026-07-23: icons must
# SUIT the entity, hash-luck is the fallback, not the rule). Keys are stable
# names; the keyword map below picks by slug/display-name substring.
ENTITY_GLYPHS = {
    "card": '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
    "scan": '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/>',
    "filetext": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    "tag": '<path d="M12.6 2.9 21 11.4a2 2 0 0 1 0 2.8l-6.8 6.8a2 2 0 0 1-2.8 0L2.9 12.6A2 2 0 0 1 2.3 11V4.3a2 2 0 0 1 2-2H11a2 2 0 0 1 1.6.6z"/><circle cx="7.5" cy="7.5" r="1"/>',
    "users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    "shield": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    "pie": '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    "book": '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    "alert": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    "basket": '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    "flame": '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    "lock": '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    "trend": '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    "box": '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
}

# First hit wins; ORDER MATTERS (alias before card — "card-alias" is a naming
# concept, not a payment card). Matched against "<slug> <display name>".
ENTITY_ICON_KEYWORDS = [
    (("alias",), "tag"),
    (("transac", "payment", "card"), "card"),
    (("scan", "receipt", "capture"), "scan"),
    (("statement", "bank", "ledger"), "filetext"),
    (("share", "group", "member", "social"), "users"),
    (("consent", "privacy", "legal", "policy"), "shield"),
    (("analytic", "report", "insight", "drill"), "pie"),
    (("recipe", "catalog"), "book"),
    (("allerg", "hazard", "warn"), "alert"),
    (("pantry", "stock", "inventory", "grocer"), "basket"),
    (("cook", "kitchen", "meal"), "flame"),
    (("auth", "login", "account", "session"), "lock"),
    (("progress", "level", "achiev", "streak"), "trend"),
    (("order", "purchase", "checkout"), "basket"),
    (("notif", "alert-inbox",), "alert"),
    (("doc", "note", "content"), "filetext"),
]


def entity_glyph_name(slug: str, label: str = "") -> str:
    """Which glyph an entity gets: semantic keyword match on slug+label,
    hash-pool fallback. Exposed for the battery."""
    text = f"{slug} {label}".lower()
    for keys, name in ENTITY_ICON_KEYWORDS:
        if any(k in text for k in keys):
            return name
    return ""


# Entity COLORS (operator ruling 2026-07-23): each entity gets a stable
# color beside its icon — hash-picked like the icon, carried everywhere the
# entity is represented (nav, entity columns, cross-entity chips).
ENTITY_COLOR_POOL = [
    "#0d6e78", "#7c3aed", "#b45309", "#0a7d6b", "#b3403a", "#1f6feb",
    "#8e4585", "#3f6d4c", "#9a5a00", "#5a53a8", "#c2461e", "#0f766e",
]


def entity_color(slug: str) -> str:
    idx = int(_hashlib.sha1(("c:" + slug).encode("utf-8")).hexdigest(), 16) \
        % len(ENTITY_COLOR_POOL)
    return ENTITY_COLOR_POOL[idx]


# --- test-kind identity: ONE icon + color per kind, used throughout the
# center (chips, Kinds & coverage, detail tables) — operator ruling 2026-07-23.
KIND_GLYPHS = {
    "integration": '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    "unit": '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    "journey": '<circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M12 19h4.5a3.5 3.5 0 0 0 0-7h-8a3.5 3.5 0 0 1 0-7H12"/>',
    "coverage": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    "manual": '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    "deployed": '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
}
KIND_CLS = {"integration": "l-api", "unit": "l-web", "journey": "l-mobile",
            "coverage": "l-models", "manual": "l-services",
            "deployed": "l-schemas"}


def kind_ic(kind: str, size: int = 12) -> str:
    g = KIND_GLYPHS.get(kind, "")
    if not g:
        return ""
    return (f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" '
            f'fill="none" stroke="currentColor" stroke-width="2" '
            f'stroke-linecap="round" stroke-linejoin="round" '
            f'style="vertical-align:-2px">{g}</svg>')


def kind_tag(kind: str, cls: str = "", suffix: str = "") -> str:
    """The one way a test kind is named anywhere on the center."""
    return (f'<span class="tag {cls or KIND_CLS.get(kind, "")}">'
            f"{kind_ic(kind)} {E(kind)}{suffix}</span>")


# The entity-column HEADER label (operator ruling 2026-07-24): a table whose
# icon-only entity column shipped an EMPTY header now labels it with the
# Entity-index layers glyph. Pass ENT_COL as the header string — table(),
# xtable() and the ledger render it as the raw icon; every other header
# stays E()'d. The sentinel can never collide with authored header text.
ENT_COL = "\x00entity\x00"
_ENT_TH = ('<svg viewBox="0 0 24 24" width="13" height="13" fill="none" '
           'stroke="currentColor" stroke-width="2" stroke-linecap="round" '
           'stroke-linejoin="round" style="vertical-align:-2px">'
           "<title>entity</title>"
           '<polygon points="12 2 2 7 12 12 22 7 12 2"/>'
           '<polyline points="2 17 12 22 22 17"/>'
           '<polyline points="2 12 12 17 22 12"/></svg>')


def th_label(h: str) -> str:
    """Header-cell content: the ENT_COL sentinel renders the entity glyph."""
    return _ENT_TH if h == ENT_COL else E(h)


def entity_badge(slug: str, label: str = "", size: int = 13,
                 show_name: bool = False) -> str:
    """The entity's icon in ITS color — the compact identity used in entity
    columns (icon-only, tooltip carries the name) and, with show_name, in
    chips. Carries ent-<slug> so entity filter bars can match rows."""
    name = label or slug
    body = entity_icon(slug, size, label=name)
    if show_name:
        body += f" {E(name)}"
    return (f'<span class="entb ent-{slug}" style="color:{entity_color(slug)}"'
            f' title="entity: {E(name)}">{body}</span>')


def entity_icon(slug: str, size: int = 13, label: str = "") -> str:
    """The entity's stable icon svg — semantically matched when a keyword
    fits (transaction→card, allergen→alert…), hash-picked from the pool
    otherwise. Never authored, same glyph every build."""
    name = entity_glyph_name(slug, label)
    if name:
        path = ENTITY_GLYPHS[name]
    else:
        idx = int(_hashlib.sha1(slug.encode("utf-8")).hexdigest(), 16) \
            % len(ENTITY_ICON_POOL)
        path = ENTITY_ICON_POOL[idx]
    return (f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" '
            'fill="none" stroke="currentColor" stroke-width="2" '
            'stroke-linecap="round" stroke-linejoin="round">'
            f"{path}</svg>")


NEW_BADGE = ' <span class="tag t-new">NEW</span>'
_TAG_RX = re.compile(r"<[^>]+>")
# Relative-time vocabulary that moves between builds without the row itself
# changing — hashed as a placeholder so a T−27h → T−28h tick never re-badges.
_VOLATILE_RX = re.compile(
    # A day the PAGE counts (D-061: `<span … data-day="YYYY-MM-DD" …>date</span>`, filled
    # by assets/a3-days.js) takes the placeholder a relative age took before it — so a row
    # that used to read "31d ago" keeps its fingerprint, and is not badged NEW for the change.
    r'<span\b[^>]*\bdata-day="[^"]*"[^>]*>[^<]*</span>|'
    # `d` was missing from the T− class while the sibling "N ago" alternative had it, so a
    # T−34d → T−35d tick DID re-badge — the exact failure this scrubber exists to prevent
    # (caught on gastify by the golden master, 2026-09-11: one flipped day re-fingerprinted
    # the api corpus row and stamped it NEW on an unchanged tree).
    # `future?` is rel_age's word for a record stamped past the build's clock: a tick too (review B-6).
    r"T−\d+\s*[dhm]|\b\d+\s*[dhm]\s+ago\b|\btoday\b|\byesterday\b|\bhoy\b|\bayer\b|\bfuture\?",
    re.IGNORECASE)
_ROWMARKS: dict = {"baseline": None, "seen": {}, "counts": {}}


def init_rowmarks(baseline: dict | None) -> None:
    """Arm the marker for one build: `baseline` maps row key → content hash
    from the last committed build, or None to disarm badging (bootstrap)."""
    _ROWMARKS["baseline"] = baseline
    _ROWMARKS["seen"] = {}
    _ROWMARKS["counts"] = {}


def rowmarks_seen() -> dict:
    """This build's row key → content hash map — the next snapshot."""
    return dict(_ROWMARKS["seen"])


def _row_mark(context: str, cells: list) -> str:
    """Record one rendered row; return the NEW badge when it was not in the
    baseline with this exact (normalized) content, else an empty string."""
    texts = [_TAG_RX.sub("", str(c)).strip() for c in cells]
    ident = texts[0] or " ".join(t for t in texts if t)[:80]
    base_key = f"{context}|{ident}"
    n = _ROWMARKS["counts"].get(base_key, 0)
    _ROWMARKS["counts"][base_key] = n + 1
    key = f"{base_key}#{n}"
    # The volatile scrub runs on the RAW cell, BEFORE tags are removed. Stripping first glues
    # adjacent text nodes — "31d ago<br><small>node…</small>" becomes "31d agonode…" — and
    # "\\bago\\b" cannot match "agonode", so the relative age rode into the digest and every
    # day-tick re-badged an unchanged row NEW (gustify, 2026-09-11: "31d ago" → "32d ago"
    # flipped two proof rows in 2.5 hours). Scrubbing raw keeps the boundary ("ago<") intact.
    # `texts` above is left alone ON PURPOSE: it is the KEY material, and rewriting it would
    # re-key thousands of stable rows to fix a handful of volatile ones.
    norm = _VOLATILE_RX.sub("·", " ".join(
        _TAG_RX.sub("", _VOLATILE_RX.sub("·", str(c))).strip() for c in cells))
    digest = hashlib.sha1(norm.encode("utf-8")).hexdigest()[:12]
    _ROWMARKS["seen"][key] = digest
    baseline = _ROWMARKS["baseline"]
    if baseline is None:
        return ""
    return "" if baseline.get(key) == digest else NEW_BADGE


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
    head = "".join(f'<th class="num">{E(h)}</th>' if i in num
                   else f"<th>{th_label(h)}</th>"
                   for i, h in enumerate(headers))
    ctxkey = "tbl|" + "|".join(headers)
    body = ""
    for i, r in enumerate(rows):
        mark = _row_mark(ctxkey, r)
        cells = [f"{r[0]}{mark}", *r[1:]] if mark else list(r)
        body += ("<tr>" + "".join(
            f'<td class="num">{c}</td>' if j in num else f"<td>{c}</td>"
            for j, c in enumerate(cells)) + "</tr>")
        summary, inner = (expand[i] if expand and i < len(expand) else ("", ""))
        if summary and inner:
            body += (f'<tr class="exp"><td colspan="{len(headers)}">'
                     f'<details class="more"><summary>{summary}</summary>'
                     f"{inner}</details></td></tr>")
    # The note is prose: markdown markers are RENDERED (a leaked `code`
    # span or a literal <code> tag reads as corrupted output).
    tail = f'<p class="sub">{md(note)}</p>' if note else ""
    cls = "tbl wcol" if widths else "tbl"
    # Callers speak the xtable fr dialect, but a real <col> knows no fr —
    # the browser silently ignored it and every "pinned" table rendered
    # EQUAL columns. Convert: px passes through, fr becomes its share of
    # the width (a few % held back per px column).
    if widths:
        _frs = [float(w[:-2]) for w in widths if w.endswith("fr")]
        _tot = sum(_frs) or 1.0
        _avail = 100 - 4 * (len(widths) - len(_frs))
        widths = [w if not w.endswith("fr")
                  else f"{float(w[:-2]) / _tot * _avail:.1f}%"
                  for w in widths]
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
            + "".join(f"<span>{th_label(c)}</span>" for c in columns)
            + "<span></span></div>")
    ctxkey = "xtbl|" + "|".join(columns)
    body = []
    for row in rows:
        cells, detail = row[0], row[1]
        rid = row[2] if len(row) > 2 else ""
        idattr = f' id="{rid}"' if rid else ""
        mark = _row_mark(ctxkey, cells)
        cells = [f"{cells[0]}{mark}", *cells[1:]] if mark else cells
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
            sec_id: str = "", note: str = "") -> str:
    """A tinted, iconed section banner. Everything explanatory — the description,
    the color legend, AND the note that used to trail the table — collapses behind
    a ⊕ beside the title (the title row IS the toggle), so a table is flanked only
    by its data: the stat cards above it and the rows below (operator declutter
    ruling 2026-07-22, reversing the earlier "legend always outside" rule — the
    prose around tables read as noise). Tables themselves never hide. A section
    whose banner defines an INTERACTION CONTRACT passes open_=True so its keyboard
    map is visible by default rather than shipped closed.

    `note` is the table's trailing prose, folded into the disclosure (after the
    legend): pass it HERE instead of to table()/xtable() so nothing renders below
    the rows.

    `sec_id` stamps `data-sec="<id>"` on the banner — the section-identity marker
    map v3 requires on EVERY generator-owned section. It is auto-derived from
    `id_` (dropping the page-anchor `sec-` prefix) or the title, so no section
    renders without an identity; passing sec_id explicitly is how two pages name
    the SAME section the same way."""
    sec_id = sec_id or (id_.removeprefix("sec-") if id_ else _sec_slug(title))
    id_attr = f' id="{id_}"' if id_ else ""
    sec_attr = f' data-sec="{E(sec_id)}"' if sec_id else ""
    head = (f'<div class="sechead"{id_attr}{sec_attr} style="--gc:{color}"><span class="secic">'
            f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
            f"{icon}</svg></span><div>")
    title_h2 = f'<h2><span class="gtag">{E(gtag)}</span> {E(title)}'
    # Description, color legend (info), and the former after-table note all live
    # inside the ⊕ — a reader opts into every word; the table keeps only its rows.
    body = ((f"<p>{E(sub)}</p>" if sub else "") + info
            + (f'<p class="sub tnote">{md(note)}</p>' if note else ""))
    if body:
        head += (f'<details class="secinfo"{" open" if open_ else ""}>'
                 f'<summary>{title_h2} '
                 f'<i class="tgl"></i></h2></summary>'
                 f'<div class="secbody">{body}</div></details>')
    else:
        head += f"{title_h2}</h2>"
    return f"{head}</div></div>"


def tinfo(text: str, flip: bool = False) -> str:
    """The ⓘ popover — a small window of prose anchored to the icon, an × to
    close, auto-dismissed by the page script after a few seconds. The one
    way explanatory text rides a value anywhere in the center (ledger fold
    labels, shelf state tags) — never a line of prose repeated per row.
    `flip` opens it to the bottom-LEFT — for icons in a table's rightmost
    column, where the default bottom-right runs off the edge."""
    cls = "tinfo tflip" if flip else "tinfo"
    return (f'<details class="{cls}"><summary aria-label="more about this">'
            'ⓘ</summary><div class="tx">'
            '<button type="button" class="tclose" aria-label="close">×'
            f"</button>{E(text)}</div></details>")


# The ⓘ behavior for pages that do NOT ship the ledger script (which carries
# the same handler): × closes, opening arms a 6s auto-dismiss.
TINFO_SCRIPT = (
    "<script>(function(){document.addEventListener('click',function(e){"
    "var x=e.target.closest('.tclose');"
    "if(x){e.preventDefault();x.closest('details').removeAttribute('open');return;}"
    "var s2=e.target.closest('.tinfo>summary');"
    "if(s2){var d2=s2.parentNode;clearTimeout(d2._t);"
    "d2._t=setTimeout(function(){d2.removeAttribute('open');},6000);}});"
    "})();</script>")


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
