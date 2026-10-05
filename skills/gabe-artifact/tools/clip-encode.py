#!/usr/bin/env python3
"""gabe-artifact · action-clip encoder (script v2)

Turns one clip recorded by tools/clip-recorder.mjs (<frames>/frames.json + fNNNNN.jpg) into a looping H.264 MP4:
each frame held for its real on-screen time, the first held a little longer (lead) and the last held so the loop
rests on the finished state (hold), cropped to the region the clip is about, 30 fps, yuv420p, faststart, no audio.

  python3 clip-encode.py <frames-dir> <out.mp4> [--crf 24] [--speed 1]

--speed plays the action faster than it was recorded (a slider drag re-renders the app on every step, so its real
time drags on screen); the lead and the closing hold keep their length, so the finished state still rests.
Name the output <name>@2x.mp4 when it was recorded at deviceScaleFactor 2 — narrate-build.py halves an @2x file's
width and height, so it renders sharp at its CSS size. One clip at a time (the WSL2 rule).
Spec: references/narration.md §9.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path


def even(n):
    return int(n) - int(n) % 2


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("frames")
    ap.add_argument("out")
    ap.add_argument("--crf", type=int, default=24)
    ap.add_argument("--speed", type=float, default=1.0)
    a = ap.parse_args()
    if a.speed <= 0:
        print("clip-encode: --speed must be above 0")
        sys.exit(1)
    d = Path(a.frames).resolve()
    meta = json.loads((d / "frames.json").read_text(encoding="utf-8"))
    frames = meta["frames"]
    if len(frames) < 2:
        print(f"clip-encode: {d.name} has {len(frames)} frame(s) — nothing moved while it recorded")
        sys.exit(1)
    w_px = int(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width",
                                        "-of", "csv=p=0", str(d / frames[0]["file"])]).decode().strip())
    s = w_px / meta["viewport"]["width"]
    c = meta["crop"]
    x, y, w, h = even(c["x"] * s), even(c["y"] * s), even(c["width"] * s), even(c["height"] * s)

    lines = ["ffconcat version 1.0"]
    for i, f in enumerate(frames):
        dur = (frames[i + 1]["t"] - f["t"]) / a.speed if i + 1 < len(frames) else meta.get("hold", 1.8)
        if i == 0:
            dur += meta.get("lead", 0.5)
        lines += [f"file {f['file']}", f"duration {max(dur, 1 / 60):.4f}"]
    lines.append(f"file {frames[-1]['file']}")   # the concat demuxer drops the last duration without a repeat
    (d / "list.ffconcat").write_text("\n".join(lines) + "\n", encoding="utf-8")

    out = Path(a.out).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(d / "list.ffconcat"),
                    "-vf", f"crop={w}:{h}:{x}:{y},fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", str(a.crf),
                    "-movflags", "+faststart", "-an", str(out)], check=True)
    secs = (frames[-1]["t"] - frames[0]["t"]) / a.speed + meta.get("hold", 1.8) + meta.get("lead", 0.5)
    fast = f" at ×{a.speed:g}" if a.speed != 1 else ""
    print(f"{out.name}: {len(frames)} frames · {secs:.1f} s{fast} · {w}×{h} px (×{s:g}) · {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
