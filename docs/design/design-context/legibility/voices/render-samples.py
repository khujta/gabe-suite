#!/usr/bin/env python3
"""render-samples.py - renders the voice lab's local samples (D-073): the review page's FIRST spoken summary, read by five
free local Piper voices at three speeds, as small mp3s next to the page. Nothing is typed here: the text is read from
../legibility-review.html (its window.LEG_DATA.say[0]) and the files are named in samples/samples.json, which the generator
(gen-voice-lab.mjs) reads for the player rows. When the review page's first summary changes, run this again; the generator's
--check says when the samples were made from other words.

  python3 render-samples.py --setup                 # once: venv + piper-tts + the five voices (about 370 MB, outside the repo)
  python3 render-samples.py                         # renders what is missing or stale into samples/
  python3 render-samples.py --force                 # renders everything again
    --home <dir>     where the venv and the voices live (default ~/.cache/gabe-voice-lab)
    --python <exe>   the python that has piper-tts (default <home>/venv/bin/python)
    --voices <dir>   the folder of voice models (default <home>/voices)

How the setup is made by hand (what --setup runs):
  uv venv <home>/venv --python 3.13
  uv pip install --python <home>/venv/bin/python piper-tts
  <home>/venv/bin/python -m piper.download_voices en_US-lessac-medium en_US-amy-medium en_US-ryan-high \\
        en_GB-alan-medium en_GB-jenny_dioco-medium --download-dir <home>/voices
Check the disk first (df -h /mnt/c must stay above 40 GB free) and run it ALONE (WSL2: one heavy job at a time).

A speed is Piper's length scale: the voice's own value times a factor (slower 1.25, normal 1.0, faster 0.8 - a bigger scale
makes slower speech). Each wav is turned into a 96 kbps mono mp3 with ffmpeg (needs ffmpeg on the PATH). Same text and same
voices give the same words, so a re-run only renders a file whose text hash changed or that is missing. """
import argparse, hashlib, json, os, shutil, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REVIEW = HERE.parent / "legibility-review.html"
OUT = HERE / "samples"
VOICES = [  # id, language tag the page shows, quality word
    ("en_US-lessac-medium", "en-US", "medium"),
    ("en_US-amy-medium", "en-US", "medium"),
    ("en_US-ryan-high", "en-US", "high"),
    ("en_GB-alan-medium", "en-GB", "medium"),
    ("en_GB-jenny_dioco-medium", "en-GB", "medium"),
]
SPEEDS = [("slower", 1.25), ("normal", 1.0), ("faster", 0.8)]
BITRATE = "96k"


def die(msg):
    print("render-samples: " + msg, file=sys.stderr)
    sys.exit(2)


def first_summary():
    """The review page's first spoken summary: {key, title, text} from its inline window.LEG_DATA."""
    if not REVIEW.exists():
        die("cannot read " + str(REVIEW))
    html = REVIEW.read_text(encoding="utf8")
    at = html.find("window.LEG_DATA = ")
    if at < 0:
        die("the review page no longer carries window.LEG_DATA")
    data, _ = json.JSONDecoder().raw_decode(html[at + len("window.LEG_DATA = "):])
    say = data.get("say") or die("the review page's data holds no spoken summaries")
    return say[0]


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, **kw)
    if r.returncode:
        die("%s failed: %s" % (cmd[0], (r.stderr or b"").decode("utf8", "replace")[-400:]))
    return r


def setup(home):
    free = shutil.disk_usage(home if home.exists() else home.parent).free / 2**30
    if free < 40:
        die("less than 40 GB free where the voices would go (%.0f GB)" % free)
    home.mkdir(parents=True, exist_ok=True)
    py = home / "venv" / "bin" / "python"
    if not py.exists():
        run(["uv", "venv", str(home / "venv"), "--python", "3.13"])
    run(["uv", "pip", "install", "--python", str(py), "piper-tts"])
    run([str(py), "-m", "piper.download_voices", *[v[0] for v in VOICES], "--download-dir", str(home / "voices")])
    print("setup done in " + str(home))


def seconds(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)])
    return round(float(r.stdout.decode().strip()), 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--setup", action="store_true")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--home", default=str(Path.home() / ".cache" / "gabe-voice-lab"))
    ap.add_argument("--python")
    ap.add_argument("--voices")
    a = ap.parse_args()
    home = Path(a.home)
    if a.setup:
        return setup(home)
    py = a.python or str(home / "venv" / "bin" / "python")
    vdir = Path(a.voices or home / "voices")
    if not Path(py).exists():
        die("no python with piper-tts at " + py + " (run with --setup, or pass --python)")
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        die("ffmpeg and ffprobe are needed on the PATH")
    s = first_summary()
    text = (s["title"].rstrip(".") + ". " + s["text"]).strip()
    sha = hashlib.sha1(text.encode("utf8")).hexdigest()[:10]
    old = {}
    if (OUT / "samples.json").exists():
        old = json.loads((OUT / "samples.json").read_text(encoding="utf8"))
    same = old.get("text", {}).get("sha") == sha
    OUT.mkdir(exist_ok=True)
    voices = []
    for vid, lang, quality in VOICES:
        model = vdir / (vid + ".onnx")
        cfg = json.loads((vdir / (vid + ".onnx.json")).read_text(encoding="utf8")) if model.exists() else die("no voice model " + str(model))
        base = float(cfg["inference"]["length_scale"])
        row = {"id": vid, "lang": lang, "quality": quality, "speeds": []}
        for sid, factor in SPEEDS:
            f = OUT / ("%s-%s.mp3" % (vid, sid))
            if a.force or not same or not f.exists():
                wav = OUT / ("%s-%s.wav" % (vid, sid))
                run([py, "-m", "piper", "-m", str(model), "-f", str(wav), "--length-scale", "%.3f" % (base * factor)], input=text.encode("utf8"))
                run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-ac", "1", "-codec:a", "libmp3lame", "-b:a", BITRATE, str(f)])
                wav.unlink()
                print("rendered " + f.name)
            row["speeds"].append({"id": sid, "factor": factor, "file": f.name, "bytes": f.stat().st_size, "seconds": seconds(f)})
        voices.append(row)
    manifest = {
        "about": "Made by render-samples.py from the review page's first spoken summary; read by gen-voice-lab.mjs. Do not edit by hand.",
        "text": {"key": s["key"], "title": s["title"], "body": s["text"], "sha": sha},
        "bitrate": BITRATE,
        "voices": voices,
    }
    (OUT / "samples.json").write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + "\n", encoding="utf8")
    total = sum(x["bytes"] for v in voices for x in v["speeds"])
    print("%d files, %d bytes, text %s" % (len(voices) * len(SPEEDS), total, sha))


if __name__ == "__main__":
    main()
