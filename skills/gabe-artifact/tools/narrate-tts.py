#!/usr/bin/env python3
"""gabe-artifact · narration synthesis (H7, engine "recorded")

For each section clip in <workdir>/narration.json: lint txt/<clip>.txt against the spoken-text rules, synthesize it with
the edge-tts Python API (one WordBoundary event per word — the CLI's subtitles give sentences only), encode mono 48 kbps,
and check that the voice spoke as many words as the script holds. One clip at a time (the WSL2 rule: serial work).

  <venv>/bin/python narrate-tts.py <workdir> [clip ...] [--force] [--lint-only]

Needs edge-tts 7.2.8 in a venv (the system build answered 403) and ffmpeg on PATH:
  python3 -m venv <scratch>/tts-venv && <scratch>/tts-venv/bin/pip install -q edge-tts==7.2.8
A clip whose script, voice and rate are unchanged since its last synthesis is skipped (mp3/<clip>.src.sha256).
Exit 0 = every clip synthesized or current and clean; 1 = a lint error or a word-count mismatch; 2 = could not run.

Script v2 : a line that starts with @ places a figure — `@img <path> | caption`, `@vid <path> | caption`,
`@fig <id>` — and is never spoken, linted as speech, counted or hashed; caption edits do not re-synthesize.
The lint also warns where a concept goes unlanded: a clip with no figure, or a run of paragraphs with none between.
Script v3: a cue `[[<fig>:<step>]]` before a word lights that step of an @fig figure while the
voice is on the word. Cues are never spoken or hashed, so adding or moving one never re-synthesizes; the lint checks the
syntax and that the figure is placed in the same script. Spec: references/narration.md §3.
Script v4: a number is a pair, `[[n:10,407|about ten thousand]]` — the page shows the left side, the recording speaks the
right, and the reading wave lights the shown number for the whole spoken span. The digit ban covers only what is spoken:
the right side obeys every spoken-text rule, the left may hold digits, commas, % and the like. A digit outside a pair is
still refused; the shown side must hold a digit, and two pairs need a space between them. Only the spoken side is
hashed, counted and linted as speech, so a script with no pair hashes as before and turning a spelled number into a
pair re-synthesizes nothing. The figure id `n` is reserved. Spec: references/narration.md §3.
"""
import argparse
import asyncio
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

# spoken text: numbers are words, never digits; no ids, paths, code or symbols — a voice reads them as noise
BANNED = [
    (re.compile(r"\d"), "a digit in the spoken text — write the number as a pair [[n:600|six hundred]] (the page shows the left side, the voice says the right)"),
    (re.compile(r"[/\\`_{}<>|#@=*~^$%+]"), "a symbol, path or code fragment — say what it means instead"),
    (re.compile(r"→|←|·|…|&"), "a typographic symbol the voice skips or misreads"),
]
SENTENCE_MAX = 30          # the register's cap is ~25; past 30 is a rewrite
PARA_MAX_WORDS = 70        # a paragraph is one idea the reader holds until its figure lands
UNLANDED_RUN = 3           # this many paragraphs in a row with no figure between them is a concept left unlanded
CLIP_WORDS = (60, 230)     # ~25 s to ~1.5 min of speech; a longer section wants splitting
MARKERS = ("@img", "@vid", "@fig")
CUE = re.compile(r"\[\[([\w-]+):(\d+)\]\]")
PAIR = re.compile(r"\[\[n:(.*?)\]\]")   # [[n:SHOWN|SPOKEN]] — narrate-build.py keeps the same pattern


def pair_sides(body):
    """'SHOWN|SPOKEN' → (shown, spoken), or None when the pair is malformed: no bar, an empty side, a pair inside it."""
    shown, bar, say = body.partition("|")
    if not bar or "[[" in body:
        return None
    shown, say = shown.strip(), say.strip()
    return (shown, say) if shown and say else None


def resolve(line):
    """A paragraph line with every number pair replaced by its spoken side (a malformed pair is left for the lint)."""
    return PAIR.sub(lambda m: (pair_sides(m.group(1)) or (None, m.group(0)))[1], line)


def uncue(line):
    """A paragraph line without its cues: the words the voice says and the page shows."""
    return " ".join(CUE.sub(" ", line).split())


def spoken(text):
    """The voice's text: every non-empty line that is not a figure marker, pairs resolved to their spoken side, cues
    dropped, one paragraph per line."""
    return "\n".join(uncue(resolve(ln)) for ln in text.splitlines() if ln.strip() and not ln.strip().startswith("@"))


def lint(clip, text):
    errs, warns = [], []
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    paras = [ln for ln in lines if not ln.startswith("@")]
    if not paras:
        return [f"{clip}: empty script"], warns
    run, figs = 0, 0
    placed = {ln.split()[1] for ln in lines if ln.startswith("@fig") and len(ln.split()) > 1}
    badpair = set()   # paragraphs whose pair is malformed: said once, then not linted as speech
    for n, p in enumerate(paras, 1):
        for m in PAIR.finditer(p):
            sides = pair_sides(m.group(1))
            if sides is None and re.fullmatch(r"\d+", m.group(1)):
                errs.append(f"{clip} ¶{n}: the figure id n is reserved for number pairs — {m.group(0)!r} is not a cue; write [[n:SHOWN|SPOKEN]]")
                badpair.add(n)
            elif sides is None:
                errs.append(f"{clip} ¶{n}: a malformed number pair {m.group(0)!r} — write [[n:SHOWN|SPOKEN]], both sides filled, no pair inside a pair")
                badpair.add(n)
            elif not re.search(r"\d", sides[0]):
                errs.append(f"{clip} ¶{n}: the pair {m.group(0)!r} shows no digit — a pair is for a number the page shows (the gate refuses a shown side without one); spell a plain word out instead")
        if "]][[n:" in p and n not in badpair:
            errs.append(f"{clip} ¶{n}: two number pairs with nothing between them — the voice would say one run-together word; put a space or a word between them")
            badpair.add(n)
        q = PAIR.sub(" pair ", p)   # cues are checked around the pairs, never inside them
        if "[[n:" in CUE.sub("", q) and n not in badpair:
            errs.append(f"{clip} ¶{n}: an unclosed number pair — [[n:SHOWN|SPOKEN]] needs its closing ]]")
            badpair.add(n)
        for fig in sorted({f for f, _ in CUE.findall(q)} - placed):
            errs.append(f"{clip} ¶{n}: cue [[{fig}:…]] names a figure this script never places — add `@fig {fig}` or fix the id")
        if ("[[" in CUE.sub("", q) or "]]" in CUE.sub("", q)) and n not in badpair:
            errs.append(f"{clip} ¶{n}: a cue that is not [[figure:step]]")
        if re.search(CUE.pattern + r"\s*$", q):
            errs.append(f"{clip} ¶{n}: a cue closes the paragraph — a cue lands on the word after it")
    paras = [uncue(resolve(p)) for p in paras]   # from here on: what the voice says
    for ln in lines:
        if ln.startswith("@"):
            if ln.split()[0] not in MARKERS:
                errs.append(f"{clip}: unknown marker {ln.split()[0]!r} — one of {', '.join(MARKERS)}")
            if ln.split()[0] == "@fig" and ln.split()[1:2] == ["n"]:
                errs.append(f"{clip}: `@fig n` — the figure id n is reserved for number pairs")
            figs += 1
            run = 0
            continue
        run += 1
        if run == UNLANDED_RUN:
            warns.append(f"{clip}: {UNLANDED_RUN} paragraphs in a row with no figure — land the idea on a still or a clip ({ln[:50]}…)")
    if not figs:
        warns.append(f"{clip}: no figure at all — every section lands on at least one visual")
    for n, p in enumerate(paras, 1):
        for rx, why in BANNED:
            m = rx.search(p)
            if m and n not in badpair:
                errs.append(f"{clip} ¶{n}: {m.group(0)!r} — {why}")
        for s in re.split(r"(?<=[.!?])\s+", p):
            if len(s.split()) > SENTENCE_MAX:
                warns.append(f"{clip} ¶{n}: a {len(s.split())}-word sentence — split it ({s[:60]}…)")
        if len(p.split()) > PARA_MAX_WORDS:
            warns.append(f"{clip} ¶{n}: {len(p.split())} words — split it, or land it on a figure sooner (≤ {PARA_MAX_WORDS})")
    total = sum(len(p.split()) for p in paras)
    if not CLIP_WORDS[0] <= total <= CLIP_WORDS[1]:
        warns.append(f"{clip}: {total} words, outside {CLIP_WORDS[0]}–{CLIP_WORDS[1]}")
    return errs, warns


async def synth(edge_tts, text, voice, rate, raw):
    words = []
    c = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    with open(raw, "wb") as f:
        async for ch in c.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":   # offset and duration are 100 ns ticks
                words.append([round(ch["offset"] / 1e4), round(ch["duration"] / 1e4), ch["text"]])
    return words


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("workdir")
    ap.add_argument("clips", nargs="*")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--lint-only", action="store_true")
    a = ap.parse_args()
    wd = Path(a.workdir).resolve()
    cfg = json.loads((wd / "narration.json").read_text(encoding="utf-8"))
    voice, rate = cfg.get("voice", "en-US-AndrewNeural"), cfg.get("rate", "+4%")
    clips = a.clips or [s["clip"] for s in cfg["sections"]]
    (wd / "mp3").mkdir(exist_ok=True)

    bad = False
    texts = {}
    for clip in clips:
        p = wd / "txt" / f"{clip}.txt"
        if not p.exists():
            print(f"FAIL  {clip}: no script at {p}")
            bad = True
            continue
        raw_text = p.read_text(encoding="utf-8")
        errs, warns = lint(clip, raw_text)
        texts[clip] = spoken(raw_text)
        for e in errs:
            print(f"FAIL  {e}")
        for w in warns:
            print(f"WARN  {w}")
        bad |= bool(errs)
    if bad:
        print("lint failed — nothing synthesized")
        sys.exit(1)
    if a.lint_only:
        print(f"lint clean · {len(texts)} scripts")
        return

    try:
        import edge_tts
    except ImportError:
        print("edge-tts is not importable here — run this with the venv's python (see the docstring)")
        sys.exit(2)

    for clip in clips:
        text = texts[clip]
        src = hashlib.sha256(f"{voice}|{rate}|{text}".encode()).hexdigest()
        stamp, mp3 = wd / "mp3" / f"{clip}.src.sha256", wd / "mp3" / f"{clip}.mp3"
        if not a.force and mp3.exists() and stamp.exists() and stamp.read_text().strip() == src:
            print(f"skip  {clip}: unchanged since its last synthesis")
            continue
        raw = wd / "mp3" / f"{clip}.raw.mp3"
        words = None
        for attempt in range(3):
            try:
                words = asyncio.run(synth(edge_tts, text, voice, rate, raw))
                break
            except Exception as e:   # the service drops connections now and then
                print(f"retry {clip}: {type(e).__name__}: {e}")
        if words is None:
            print(f"FAIL  {clip}: synthesis failed three times")
            sys.exit(2)
        subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", str(raw), "-ac", "1", "-b:a", "48k", str(mp3)], check=True)
        raw.unlink()
        (wd / "mp3" / f"{clip}.words.json").write_text(json.dumps(words), encoding="utf-8")
        n_script = len(text.split())
        ok = abs(len(words) - n_script) <= max(2, n_script // 50)   # a hyphenated compound may speak as two words
        print(f"{'ok  ' if ok else 'FAIL'}  {clip}: {len(words)} boundaries for {n_script} script words · {mp3.stat().st_size // 1024} KB")
        if ok:
            stamp.write_text(src)
        bad |= not ok
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
