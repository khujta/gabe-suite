#!/usr/bin/env python3
"""display_labels — the naming helpers entity_context uses to put the project's frontend mark over an entity's words.

Not a tool module: it registers nothing. `_label` / `_claim_name` read the `naming` block of the committed map's entity-models
block (`center.entity_models()`) and render a display label through the project's frontend/backend convention — display only,
the id stays the join key. Mirrors `_a3_naming.render`.
"""
from __future__ import annotations
import re

_CASE_RX = re.compile(r"^(.*?)( · | — )(.*)$")


def _case(run: str, how: str) -> str:
    ws = [w for w in re.split(r"[\s_\-/&]+", run) if w]                     # mirrors _a3_naming._case: interiors kept
    if not ws:
        return run
    if how == "camel":
        return ws[0][:1].lower() + ws[0][1:] + "".join(w[:1].upper() + w[1:] for w in ws[1:])
    if how == "pascal":
        return "".join(w[:1].upper() + w[1:] for w in ws)
    return run


def _render(form: str, name: str) -> str:
    """The three-line substitution every surface owns (mirrors _a3_naming.render): {name} · {name|camel} · {name|pascal} on the leading word-run."""
    m = _CASE_RX.match(name or "")
    head, sep, tail = (m.group(1), m.group(2), m.group(3)) if m else (name or "", "", "")
    out = (form or "{name}").replace("{name|camel}", _case(head, "camel") + sep + tail).replace("{name|pascal}", _case(head, "pascal") + sep + tail).replace("{name}", name or "")
    return re.sub(r"\{name\|[a-z]+\}", name or "", out)


def _naming(block: dict) -> dict:
    nb = (block or {}).get("naming") or {}
    return nb if isinstance(nb, dict) and nb.get("positions") else {}


def _claim_name(block: dict, slug: str) -> str:
    """A claim entity's words under the project default: its naming.entities / adoption display when the default is `config`, else the slug."""
    nb = _naming(block)
    if nb.get("default") == "config":
        return (((nb.get("entities") or {}).get(slug) or {}).get("display")) or slug
    return slug


def _label(block: dict, ident: str, name: str) -> str:
    """The name through the config's frontend/backend convention — `[api] cooking` · `cookingSessions` — never used as a key."""
    nb = _naming(block)
    fe = nb.get("fe") or {}
    forms = fe.get("forms") if fe.get("present") is not False else None
    conv = fe.get("convention") or "case"
    form = (forms or {}).get(conv) or {"fe": "fe · {name}", "be": "{name}"}
    return _render(form["fe" if str(ident).startswith("fe·") else "be"], name)
