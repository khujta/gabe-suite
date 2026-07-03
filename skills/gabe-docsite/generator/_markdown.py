#!/usr/bin/env python3
"""No-dependency markdown -> HTML converter for gabe-docsite (stdlib only).

Ported from gustify's ``scripts/build_docs_site.py`` markdown engine, with
one addition: the ``:::note`` container directive (see BUILD-SPEC.md). The
subset handled — confirmed sufficient by the mature original — is:

* ATX headings ``#``/``##``/``###`` — ``##`` auto-numbers with a leading
  ``<span class="num">NN</span>`` when the heading itself starts with a
  number (``## 3. Title``), else numbers sequentially per page.
* paragraphs, ``**bold**``/``*em*``/`` `code` ``
* fenced code blocks (``` ``` ```), with a ``mermaid`` language tag rendered
  as ``<figure class="mermaid-fig"><pre class="mermaid">SOURCE</pre></figure>``
* ``-``/``*`` bullet lists (nested), ``1.`` ordered lists, GitHub task-list
  checkboxes (``- [ ]`` / ``- [x]``)
* markdown tables (wrapped in ``<div class="table-wrap">``)
* ``[text](url)`` links, ``---`` horizontal rules, ``>`` blockquotes
* the ``:::note Optional Label`` … ``:::`` callout directive

Does NOT aim for full CommonMark — only what gabe-docsite pages need.
"""

from __future__ import annotations

import html as _html
import re

_BOLD_RE = re.compile(r"\*\*(.+?)\*\*")
_EM_RE = re.compile(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])")
_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
_HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)


def esc(text: str) -> str:
    return _html.escape(text, quote=False)


def render_inline(text: str) -> str:
    """Inline markdown -> HTML. Code spans are tokenized out first so their
    contents are escaped but never re-parsed for bold/em/links."""
    placeholders: list[str] = []

    def _stash(html_frag: str) -> str:
        placeholders.append(html_frag)
        return "\x00%d\x00" % (len(placeholders) - 1)

    def _stash_code(match: re.Match[str]) -> str:
        return _stash("<code>" + esc(match.group(1)) + "</code>")

    text = re.sub(r"`([^`]+)`", _stash_code, text)
    text = esc(text)
    text = _LINK_RE.sub(
        lambda m: '<a href="%s">%s</a>' % (m.group(2).replace("&", "&amp;"), m.group(1)),
        text,
    )
    text = _BOLD_RE.sub(r"<strong>\1</strong>", text)
    text = _EM_RE.sub(r"<em>\1</em>", text)
    for i, frag in enumerate(placeholders):
        text = text.replace("\x00%d\x00" % i, frag)
    return text


def slugify(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text).lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text.strip())
    return text or "section"


class _Numbering:
    """Sequential per-page ## counter, used when a heading has no explicit
    leading number of its own (``## 3. Title``)."""

    def __init__(self) -> None:
        self.count = 0

    def next(self) -> str:
        self.count += 1
        return "%02d" % self.count


def _heading_html(level: int, raw: str, numbering: _Numbering) -> str:
    text = raw.strip()
    if level == 1:
        return "<h1>%s</h1>" % render_inline(text)
    if level == 2:
        m = re.match(r"^(\d+)\.?\s+(.*)$", text)
        auto_num = numbering.next()  # always advance, even when the heading supplies its own number
        if m:
            num = "%02d" % int(m.group(1)) if len(m.group(1)) <= 2 else m.group(1)
            title = m.group(2)
        else:
            num = auto_num
            title = text
        slug = slugify(title)
        return '<h2 id="%s"><span class="num">%s</span>%s</h2>' % (
            slug,
            num,
            render_inline(title),
        )
    slug = slugify(text)
    return '<h3 id="%s">%s</h3>' % (slug, render_inline(text))


def _split_table_row(line: str) -> list[str]:
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|"):
        s = s[:-1]
    return [c.strip() for c in s.split("|")]


def _is_table_divider(line: str) -> bool:
    cells = _split_table_row(line)
    return bool(cells) and all(re.fullmatch(r":?-{1,}:?", c) for c in cells if c != "")


def _render_table(rows: list[str]) -> str:
    header = _split_table_row(rows[0])
    body = [_split_table_row(r) for r in rows[2:]]
    out = ['<div class="table-wrap"><table>']
    out.append("<thead><tr>")
    out.extend("<th>%s</th>" % render_inline(c) for c in header)
    out.append("</tr></thead>")
    if body:
        out.append("<tbody>")
        for r in body:
            cells = (r + [""] * len(header))[: len(header)]
            out.append("<tr>" + "".join("<td>%s</td>" % render_inline(c) for c in cells) + "</tr>")
        out.append("</tbody>")
    out.append("</table></div>")
    return "".join(out)


_BULLET_RE = re.compile(r"^(\s*)[-*]\s+(.*)$")
_ORDERED_RE = re.compile(r"^(\s*)\d+[.)]\s+(.*)$")
_TASK_RE = re.compile(r"^\[([ xX])\]\s+(.*)$")
_NOTE_OPEN_RE = re.compile(r"^:::note\s*(.*)$")


def _indent_level(spaces: str) -> int:
    cols = spaces.replace("\t", "    ")
    return len(cols) // 2


def _render_list_items(items: list[tuple[int, str, str]]) -> str:
    """Render collected list items. Task items pre-format their own <li ...>;
    plain items are wrapped here. Nesting handled via a depth stack."""
    out: list[str] = []
    stack: list[str] = []
    depths: list[int] = []

    def open_list(kind: str, depth: int, first_li: str) -> None:
        tag = "ul" if kind in ("ul", "ul-task") else "ol"
        cls = ' class="tasklist"' if kind == "ul-task" else ""
        out.append("<%s%s>" % (tag, cls))
        stack.append(tag)
        depths.append(depth)
        out.append(first_li)

    for depth, kind, li in items:
        if not li.startswith("<li"):
            li = "<li>" + li

        if not stack:
            open_list(kind, depth, li)
            continue

        if depth > depths[-1]:
            open_list(kind, depth, li)
        elif depth < depths[-1]:
            while len(stack) > 1 and depths[-1] > depth:
                out.append("</li>")
                out.append("</%s>" % stack.pop())
                depths.pop()
            out.append("</li>")
            out.append(li)
        else:
            out.append("</li>")
            out.append(li)

    while stack:
        out.append("</li>")
        out.append("</%s>" % stack.pop())
        depths.pop()
    return "".join(out)


def markdown_to_html(md: str, numbering: _Numbering | None = None) -> str:
    """Convert a markdown document body to an HTML fragment.

    ``numbering`` carries the sequential ``##`` counter across recursive
    calls (e.g. blockquotes); a fresh one is created for a top-level call.
    """
    if numbering is None:
        numbering = _Numbering()
    md = _HTML_COMMENT_RE.sub("", md)
    lines = md.replace("\r\n", "\n").split("\n")
    out: list[str] = []
    i = 0
    n = len(lines)
    para: list[str] = []

    def flush_para() -> None:
        if para:
            text = " ".join(s.strip() for s in para).strip()
            if text:
                out.append("<p>%s</p>" % render_inline(text))
            para.clear()

    while i < n:
        line = lines[i]
        stripped = line.strip()

        # :::note directive
        m_note = _NOTE_OPEN_RE.match(stripped)
        if m_note:
            flush_para()
            label = m_note.group(1).strip()
            i += 1
            buf: list[str] = []
            while i < n and lines[i].strip() != ":::":
                buf.append(lines[i])
                i += 1
            i += 1  # skip closing :::
            inner = markdown_to_html("\n".join(buf), numbering)
            lbl_html = '<span class="lbl">%s</span>' % esc(label) if label else ""
            out.append('<div class="note">%s%s</div>' % (lbl_html, inner))
            continue

        # fenced code block
        if stripped.startswith("```"):
            flush_para()
            lang = stripped[3:].strip().lower()
            i += 1
            buf = []
            while i < n and not lines[i].strip().startswith("```"):
                buf.append(lines[i])
                i += 1
            i += 1  # skip closing fence
            if lang == "mermaid":
                out.append(
                    '<figure class="mermaid-fig"><pre class="mermaid">%s</pre></figure>'
                    % esc("\n".join(buf))
                )
            else:
                out.append("<pre><code>%s</code></pre>" % esc("\n".join(buf)))
            continue

        # blank line
        if stripped == "":
            flush_para()
            i += 1
            continue

        # horizontal rule
        if re.fullmatch(r"(-{3,}|\*{3,}|_{3,})", stripped):
            flush_para()
            out.append("<hr>")
            i += 1
            continue

        # heading
        m = re.match(r"^(#{1,3})\s+(.*)$", line)
        if m:
            flush_para()
            out.append(_heading_html(len(m.group(1)), m.group(2), numbering))
            i += 1
            continue

        # table (header line followed by a divider line)
        if "|" in line and i + 1 < n and _is_table_divider(lines[i + 1]):
            flush_para()
            tbl = [lines[i], lines[i + 1]]
            i += 2
            while i < n and lines[i].strip() != "" and "|" in lines[i]:
                tbl.append(lines[i])
                i += 1
            out.append(_render_table(tbl))
            continue

        # blockquote
        if stripped.startswith(">"):
            flush_para()
            quote: list[str] = []
            while i < n and lines[i].strip().startswith(">"):
                quote.append(re.sub(r"^\s*>\s?", "", lines[i]))
                i += 1
            inner = markdown_to_html("\n".join(quote), numbering)
            out.append("<blockquote>%s</blockquote>" % inner)
            continue

        # lists (bullet / ordered, with nesting + task items)
        if _BULLET_RE.match(line) or _ORDERED_RE.match(line):
            flush_para()
            items: list[tuple[int, str, str]] = []
            while i < n:
                bm = _BULLET_RE.match(lines[i])
                om = _ORDERED_RE.match(lines[i])
                if bm:
                    depth = _indent_level(bm.group(1))
                    content_raw = bm.group(2)
                    tm = _TASK_RE.match(content_raw)
                    if tm:
                        done = tm.group(1).lower() == "x"
                        cls = "done" if done else "todo"
                        content = '<li class="%s">%s' % (cls, render_inline(tm.group(2)))
                        items.append((depth, "ul-task", content))
                    else:
                        items.append((depth, "ul", "<li>" + render_inline(content_raw)))
                elif om:
                    depth = _indent_level(om.group(1))
                    items.append((depth, "ol", "<li>" + render_inline(om.group(2))))
                elif lines[i].strip() == "":
                    if i + 1 < n and (_BULLET_RE.match(lines[i + 1]) or _ORDERED_RE.match(lines[i + 1])):
                        i += 1
                        continue
                    break
                else:
                    break
                i += 1
            out.append(_render_list_items(items))
            continue

        # default: accumulate paragraph text
        para.append(line)
        i += 1

    flush_para()
    return "\n".join(out)


def strip_leading_h1(md: str) -> str:
    """Drop the source's first H1 (the masthead carries the title instead)."""
    lines = md.replace("\r\n", "\n").split("\n")
    out, dropped = [], False
    for ln in lines:
        if not dropped and re.match(r"^#\s+", ln):
            dropped = True
            continue
        out.append(ln)
    return "\n".join(out)


def first_h1_text(md: str) -> str | None:
    """Return the plain text of the source's first H1, if any (used to
    default a doc's title when the config doesn't override it)."""
    for ln in md.replace("\r\n", "\n").split("\n"):
        m = re.match(r"^#\s+(.*)$", ln)
        if m:
            return m.group(1).strip()
    return None


def split_lede(md: str) -> tuple[str, str]:
    """Split a markdown body into (first paragraph's raw text, remaining
    markdown). Used for the hub intro: the first paragraph becomes the
    masthead lede, everything after (diagrams, notes) renders as page body.
    Leading blank lines are skipped. If the body has no leading paragraph
    (e.g. it starts with a heading or fence), returns ("", original md)."""
    lines = md.replace("\r\n", "\n").split("\n")
    i = 0
    n = len(lines)
    while i < n and lines[i].strip() == "":
        i += 1
    if i >= n:
        return "", md
    first_line = lines[i].lstrip()
    if first_line.startswith(("#", "```", ">", "-", "*", ":::")) or re.match(r"^\d+[.)]\s", first_line):
        return "", md
    para: list[str] = []
    while i < n and lines[i].strip() != "":
        para.append(lines[i].strip())
        i += 1
    lede_text = " ".join(para)
    rest = "\n".join(lines[i:])
    return lede_text, rest
