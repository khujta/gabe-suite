#!/usr/bin/env python3
"""days_check.py — judge days.mjs's snapshots of the datefix board at 2026-09-27 and 2026-09-28 (D-061).

    days_check.py <snapshots.jsonl>              prints PASS/FAIL <id> <what> per assert; exit 1 on any FAIL
    days_check.py --evidence <snapshots.jsonl>   the same for the datefix --evidence feature page (review B-1 · B-4)

The page's OWN script counted the days; these are the values a reader must see on each day. The pairs are the bounds
the fixture straddles: a card crosses 7, 30 and 90 between the two days, so the SAME bytes must land it in different
columns, flags and counts depending only on the day the page is opened.
"""
import json
import sys

EVID = sys.argv[1] == "--evidence"
snaps = {}
for line in open(sys.argv[-1], encoding="utf-8"):
    line = line.strip()
    if line.startswith("{"):
        d = json.loads(line)
        snaps[d["day"]] = d
fails = 0


def check(cid: str, what: str, ok: bool, got=None) -> None:
    global fails
    print(("  PASS  " if ok else "  FAIL  ") + f"{cid} {what}" + ("" if ok else f" — got {got!r}"))
    fails += 0 if ok else 1


def col(s: dict, mode: str, key: str) -> dict:
    return ((s.get("cols") or {}).get(mode, {}).get("cols") or {}).get(key) or {}


def nums(s: dict, mode: str, key: str) -> list:
    return [t.split(" ", 1)[0] for t in col(s, mode, key).get("cards") or []]


def chip(s: dict, key: str) -> dict:
    return (s.get("chips") or {}).get(key) or {}


def flag(s: dict, num: str, name: str):
    return next((f.get(name) for t, f in (s.get("flags") or {}).items() if t.startswith(num + " ")), None)


if EVID:
    # the Captured cell: `gadget-walk` committed at 2026-09-28T01:30Z (22:30 on the 27th at UTC−3), `gadget-draft`
    # uncommitted, its file time 2026-09-20T12:00Z. The day is the VIEWER's calendar day of the instant.
    SP_EVE, SP_LATER, UTC = ("2026-09-28T02:45:00Z@America/Sao_Paulo", "2026-09-30T13:00:00Z@America/Sao_Paulo",
                             "2026-09-28T12:00:00Z@UTC")
    WALK, DRAFT = "a3-day@@1790559000", "a3-day@@1789905600"
    check("E0", "the three viewers opened the page", all(k in snaps for k in (SP_EVE, SP_LATER, UTC)), sorted(snaps))
    if not all(k in snaps for k in (SP_EVE, SP_LATER, UTC)):
        sys.exit(1)
    for i, k in enumerate((SP_EVE, SP_LATER, UTC)):
        check(f"E1.{i}", "the page ran without a script error", not snaps[k].get("errors"), snaps[k].get("errors"))
    w = lambda k: chip(snaps[k], WALK)
    check("E2", "the page counted the Captured day (the feature page loads a3-days.js)",
          all(w(k).get("text", "").endswith((" day", " days")) for k in (SP_EVE, SP_LATER, UTC)), [w(k) for k in (SP_EVE, SP_LATER, UTC)])
    check("E3", "an evening capture west of Greenwich is that evening's: 0 days at 23:45 the same night, never -1",
          (w(SP_EVE).get("text"), w(SP_EVE).get("title")) == ("0 days", "captured 2026-09-27 · 0 days"), w(SP_EVE))
    check("E4", "… and three days on at UTC−3, from the 27th", (w(SP_LATER).get("text"), w(SP_LATER).get("title"))
          == ("3 days", "captured 2026-09-27 · 3 days"), w(SP_LATER))
    check("E5", "a viewer in UTC counts the UTC day of the same instant", (w(UTC).get("text"), w(UTC).get("title"))
          == ("0 days", "captured 2026-09-28 · 0 days"), w(UTC))
    dr = chip(snaps[UTC], DRAFT)
    check("E6", "an uncommitted set counts by its file time and says so",
          (dr.get("text"), dr.get("title")) == ("8 days", "captured 2026-09-20 (the file's time — not committed) · 8 days"), dr)
    print(f"days: {fails} failed")
    sys.exit(1 if fails else 0)

A, B = snaps.get("2026-09-27"), snaps.get("2026-09-28")
check("D0", "both days were opened", A is not None and B is not None, sorted(snaps))
if A is None or B is None:
    sys.exit(1)
for day, s in (("27", A), ("28", B)):
    check(f"D1.{day}", "the page ran without a script error", not s.get("errors"), s.get("errors"))
    check(f"D2.{day}", "no card or KPI says ago / today / yesterday", not s.get("words"), s.get("words"))
    check(f"D3.{day}", "the date framings' pools were emptied into their columns",
          all(v.get("pool") == 0 for v in (s.get("cols") or {}).values()) and len(s.get("cols") or {}) == 2, s.get("cols", {}).keys())
# the age framing: each bound crossed by one card between the days
check("A1", "7-day bound: #3 is This week on the 27th, 8 – 30 days on the 28th",
      "#3" in nums(A, "age", "fresh") and "#3" in nums(B, "age", "recent"), (nums(A, "age", "fresh"), nums(B, "age", "recent")))
check("A2", "30-day bound: #4 is 8 – 30 days on the 27th, 1 – 3 months on the 28th",
      "#4" in nums(A, "age", "recent") and "#4" in nums(B, "age", "aging"), (nums(A, "age", "recent"), nums(B, "age", "aging")))
check("A3", "90-day bound: #5 is 1 – 3 months on the 27th, over 3 months on the 28th",
      "#5" in nums(A, "age", "aging") and "#5" in nums(B, "age", "stale"), (nums(A, "age", "aging"), nums(B, "age", "stale")))
check("A4", "a card with no date sits in Undated on both days",
      nums(A, "age", "undated") == nums(B, "age", "undated") == ["Walk"], (nums(A, "age", "undated"), nums(B, "age", "undated")))
check("A5", "over 3 months folds past its eight: 9 → +1 more on the 27th, 10 → +2 more on the 28th",
      (col(A, "age", "stale").get("n"), col(A, "age", "stale").get("more"), col(B, "age", "stale").get("n"), col(B, "age", "stale").get("more"))
      == ("9", "+ 1 more", "10", "+ 2 more"),
      (col(A, "age", "stale").get("n"), col(A, "age", "stale").get("more"), col(B, "age", "stale").get("n"), col(B, "age", "stale").get("more")))
check("A6", "the column head counts its ripe cards, and the reading order holds (ripe first)",
      col(A, "age", "stale").get("rp") == "◆ 1 ripe" and nums(A, "age", "stale")[0] == "#6", (col(A, "age", "stale").get("rp"), nums(A, "age", "stale")[:2]))
# the done framing
check("N1", "a close 7 days back is in the last 7 on the 27th, in the last 30 on the 28th",
      "#7" in nums(A, "done", "d7") and "#7" in nums(B, "done", "d30"), (nums(A, "done", "d7"), nums(B, "done", "d30")))
check("N2", "a close 30 days back is in the last 30 on the 27th, in the last 90 on the 28th",
      "#8" in nums(A, "done", "d30") and "#8" in nums(B, "done", "d90"), (nums(A, "done", "d30"), nums(B, "done", "d90")))
check("N3", "an empty window says so, newest first where it is full, and the tracks mix",
      col(A, "done", "d90").get("empty") == "nothing closed in this window" and nums(A, "done", "d7") == ["Walked", "#7"]
      and col(A, "done", "d7").get("mix") == "1 verify · 1 debt",
      (col(A, "done", "d90").get("empty"), nums(A, "done", "d7"), col(A, "done", "d7").get("mix")))
# the two date KPIs, and the card flags their clicks filter on
check("K1", "closed 30d counts 3 (2 in the last 7) on the 27th, 2 (1) on the 28th",
      ((A["kpis"].get("closed 30d") or {}).get("val"), (A["kpis"].get("closed 30d") or {}).get("sub"),
       (B["kpis"].get("closed 30d") or {}).get("val"), (B["kpis"].get("closed 30d") or {}).get("sub"))
      == ("3", "2 in the last 7", "2", "1 in the last 7"), (A["kpis"].get("closed 30d"), B["kpis"].get("closed 30d")))
check("K2", "over 3 months counts 9 on the 27th and 10 on the 28th, and alerts",
      ((A["kpis"].get("over 3 months") or {}).get("val"), (B["kpis"].get("over 3 months") or {}).get("val"),
       (B["kpis"].get("over 3 months") or {}).get("alert")) == ("9", "10", True), (A["kpis"].get("over 3 months"), B["kpis"].get("over 3 months")))
check("K3", "the card flags follow the day: #8 closed30 1 → 0, #5 aged 0 → 1",
      (flag(A, "#8", "closed30"), flag(B, "#8", "closed30"), flag(A, "#5", "aged"), flag(B, "#5", "aged")) == ("1", "0", "0", "1"),
      (flag(A, "#8", "closed30"), flag(B, "#8", "closed30"), flag(A, "#5", "aged"), flag(B, "#5", "aged")))
# the chips: "N days", 0 on the day itself, the tooltip carries the absolute date and the distance
c0a, c0b = chip(A, "bc-age@2026-09-27"), chip(B, "bc-age@2026-09-27")
check("C1", "a card recorded on the day reads 0 days, and 1 day the next day",
      (c0a.get("text"), c0b.get("text")) == ("0 days", "1 day"), (c0a.get("text"), c0b.get("text")))
check("C2", "its tooltip says the absolute date and the distance",
      c0a.get("title") == "recorded 2026-09-27 — on the board 0 days", c0a.get("title"))
c30a, c30b = chip(A, "bc-age@2026-08-28"), chip(B, "bc-age@2026-08-28")
check("C3", "the chip's colour class follows the bound: 30 days age-recent, 31 days age-aging",
      (c30a.get("text"), "age-recent" in (c30a.get("cls") or ""), c30b.get("text"), "age-aging" in (c30b.get("cls") or ""))
      == ("30 days", True, "31 days", True), (c30a, c30b))
cc = chip(A, "bc-closed@2026-09-20")
check("C4", "a closed card's chip: ✓ 7 days, tooltip closed <date> · 7 days",
      (cc.get("text"), cc.get("title")) == ("✓ 7 days", "closed 2026-09-20 · 7 days"), cc)
ct, ct2 = chip(A, "bc-age@2026-09-24"), chip(B, "bc-age@2026-09-24")
check("C5", "an open phase's last ledger touch is counted too (review B-5): touched 3 days → touched 4 days",
      (ct.get("text"), ct.get("title"), ct2.get("text")) == ("touched 3 days", "last ledger entry naming this phase — 2026-09-24 · 3 days",
                                                             "touched 4 days"), (ct, ct2))
print(f"days: {fails} failed")
sys.exit(1 if fails else 0)
