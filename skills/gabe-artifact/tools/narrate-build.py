#!/usr/bin/env python3
"""gabe-artifact · narrated page builder (H7, engine "recorded") — script v2

Assembles one self-contained HTML file from a work directory — a standalone document by default (a project keeps them in
.kdbp/explainers/), or with --fragment the host-wrapped Artifact form (no doctype/html/head/body):

  narration.json   title, voice, sections (id, clip, menu label, title, icon), optional icons / lang
  body.html        the content: <header> + one <section class="sec" id=…> per section, with placeholders, and the
                   page's figure blocks, each between <!-- fig:<id> --> and <!-- /fig --> (lifted out, placed by @fig)
  txt/<clip>.txt   the script IS the section's content: one spoken paragraph per line, and between them the figures
                   that land each idea — @img <path> | caption · @vid <path> | caption · @fig <id>
                   (script v4: a number is a pair [[n:SHOWN|SPOKEN]] — the page shows the left, the voice says the right)
  mp3/<clip>.mp3   + mp3/<clip>.words.json — written by tools/narrate-tts.py (which never speaks an @ line)
  page.css         optional — the page's own components
  page.js          optional — the page's own motion (registers window.FXREPLAY[slug], defines __rebuildMotion)

Placeholders in body.html:
  {{ICON:name}}            an inline Lucide icon (ICONS below, or narration.json "icons")
  {{LISTEN:clip[:label]}}  the section's play pill + seek bar + time
  {{TX:clip}}              the script, every paragraph shown, every word a .w span timed from the clip's WordBoundary
                           events (a number pair is ONE span, .w.n, timed at its first spoken word, its spoken words in
                           data-say); each figure ties to the paragraph before it (data-p) and goes live while it is spoken
  {{NEXT:id}}              the section foot: "Next: <the next section's title>" (the last one: back to the top)
  {{IMG:path}}             a file under the work dir as a data: URI (the file travels alone, so media rides inline)
  {{RUNTIME}} {{CLIP_COUNT}}  generated from the clips, never typed

The chrome is read from assets/artifact-chrome.html (blocks 1–3), so a kit fix reaches every rebuild.
Usage:  python3 narrate-build.py <workdir> [-o out.html] [--fragment]
Spec:   references/narration.md · gate: tools/verify-narration.mjs
"""
import argparse
import base64
import html
import json
import mimetypes
import re
import subprocess
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
CHROME = SKILL / "assets" / "artifact-chrome.html"
NCSS = SKILL / "assets" / "narrated.css"
NJS = SKILL / "assets" / "narrated.js"
COG_CSS_MARK = "  /* ══ cog + options panel"

ICONS = {  # Lucide geometry, inlined (the CSP blocks icon CDNs)
    "map": '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
    "waves": '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
    "panel-bottom": '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 15h18"/><path d="m9 10 3-3 3 3"/>',
    "panel-left": '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
    "calculator": '<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>',
    "chart-spline": '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16c.5-2 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4.5-5 5-7"/>',
    "bar-chart": '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    "git-branch": '<line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
    "route": '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    "gavel": '<path d="m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/>',
    "flag": '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
    "key-round": '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
    "file-text": '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h5"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    "swap": '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    "alert": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    "layers": '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m6.08 11-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83L17.9 11"/>',
    "search": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    "siren": '<path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"/><path d="M21 12h1"/><path d="M18.5 4.5 18 5"/><path d="M2 12h1"/><path d="M12 2v1"/><path d="m4.929 4.929.707.707"/><path d="M12 12v6"/>',
    "bug": '<path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
    "timer": '<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>',
    "gauge": '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    "heart-pulse": '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
    "activity": '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
    "cloud-upload": '<path d="M12 13v8"/><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m8 17 4-4 4 4"/>',
    "hard-drive-upload": '<path d="m16 6-4-4-4 4"/><path d="M12 2v8"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 18h.01"/><path d="M10 18h.01"/>',
    "archive": '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
    "life-buoy": '<circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/>',
    "refresh-cw": '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    "database-backup": '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 12a9 3 0 0 0 5 2.69"/><path d="M21 9.3V5"/><path d="M3 5v14a9 3 0 0 0 6.47 2.88"/><path d="M12 12v4h4"/><path d="M13 20a5 5 0 0 0 9-3 4.5 4.5 0 0 0-4.5-4.5c-1.33 0-2.54.54-3.41 1.41L12 16"/>',
    "shield-check": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    "circle-check": '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    "list-checks": '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
    "server": '<rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>',
    "clock": '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    # chrome of the dock itself
    "arrow-down": '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    "arrow-up": '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    "arrow-right": '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    "rewind": '<polygon points="11 19 2 12 11 5 11 19"/><polygon points="22 19 13 12 22 5 22 19"/>',
    "skip-back": '<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" x2="5" y1="19" y2="5"/>',
    "skip-forward": '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/>',
    "square": '<rect width="14" height="14" x="5" y="5" rx="2"/>',
    "rotate-ccw": '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    "list": '<path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/>',
    "list-video": '<path d="M12 12H3"/><path d="M16 6H3"/><path d="M12 18H3"/><path d="m16 12 5 3-5 3v-6Z"/>',
    "circle-play": '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',
    "circle-pause": '<circle cx="12" cy="12" r="10"/><line x1="10" x2="10" y1="15" y2="9"/><line x1="14" x2="14" y1="15" y2="9"/>',
    "chevrons-down": '<path d="m7 6 5 5 5-5"/><path d="m7 13 5 5 5-5"/>',
    "film": '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>',
    "image": '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    # a starter set for figures that encode with icons
    "git-pull-request": '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" x2="6" y1="9" y2="21"/>',
    "git-commit": '<circle cx="12" cy="12" r="3"/><line x1="3" x2="9" y1="12" y2="12"/><line x1="15" x2="21" y1="12" y2="12"/>',
    "upload": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    "globe": '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    "eye": '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
    "check": '<path d="M20 6 9 17l-5-5"/>',
    "x": '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    "zap": '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    "database": '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
    "clock-alert": '<path d="M12 6v6l4 2"/><path d="M16 21.16a10 10 0 1 1 5-13.516"/><path d="M20 11.5v6"/><path d="M20 21.5h.01"/>',
    "ellipsis": '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    "pencil": '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    "play": '<polygon points="6 3 20 12 6 21 6 3"/>',
    "book-open": '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    "box": '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    "spline": '<circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><path d="M5 17A12 12 0 0 1 17 5"/>',
    "panel-right": '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/>',
    "calendar": '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    "type": '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>',
    "users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    "terminal": '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
    "rocket": '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
    "headphones": '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    "trending-down": '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
    "arrow-down-to-line": '<path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/>',
    "ruler": '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>',
    "git-fork": '<circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"/><path d="M12 12v3"/>',
    "locate": '<line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/>',
}
PLAY_SVG = '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path class="solid" d="M7 4v16l13-8z"/></svg>'
PAUSE_SVG = '<svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path class="solid" d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>'


def die(msg):
    print("narrate-build: " + msg, file=sys.stderr)
    sys.exit(2)


def icon(name, cls=""):
    if name not in ICONS:
        die(f"no icon {name!r} — add its Lucide paths to narration.json \"icons\"")
    c = f'class="{cls}" ' if cls else ""
    return f'<svg {c}viewBox="0 0 24 24" aria-hidden="true">{ICONS[name]}</svg>'


def mmss(s):
    s = int(round(s))
    return f"{s // 60}:{s % 60:02d}"


def runtime_words(total_s):
    halves = max(1, round(total_s / 30))   # nearest half minute
    whole, half = divmod(halves, 2)
    if whole == 0:
        return "about half a minute"
    return f"about {whole}{'½' if half else ''} min"


def chrome_blocks():
    t = CHROME.read_text(encoding="utf-8")
    b1, b2, b3 = (t.index(f"<!-- ══ BLOCK {n}") for n in (1, 2, 3))
    s0 = t.index("<style>", b1) + len("<style>")
    css = t[s0:t.index("</style>", s0)]
    cog_html = t[t.index('<div class="af-chrome">', b2):b3].rstrip() + "\n"
    j0 = t.index("<script>", b3) + len("<script>")
    cog_js = t[j0:t.rindex("</script>")]
    if COG_CSS_MARK not in css:
        die(f"the kit's CSS lost its cog marker {COG_CSS_MARK.strip()!r} — the narrated CSS has nowhere to go")
    return css, cog_html, cog_js


def probe_seconds(mp3):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(mp3)])
    return float(out.decode().strip())


def probe_size(path):
    """(width, height) of an image or a video's first stream — written on the element so the layout never shifts."""
    out = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                                   "-of", "csv=p=0", str(path)]).decode().strip().split(",")
    return int(out[0]), int(out[1])


def data_uri(path):
    if not path.exists():
        die(f"no file {path}")
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def plain(markup):
    return html.unescape(re.sub(r"<[^>]+>", "", markup)).strip()


CUE = re.compile(r"\[\[([\w-]+):(\d+)\]\]")
PAIR = re.compile(r"\[\[n:(.*?)\]\]")   # [[n:SHOWN|SPOKEN]] — narrate-tts.py keeps the same pattern
HELD = re.compile(r"\x00(\d+)\x00")


def pair_sides(body):
    """'SHOWN|SPOKEN' → (shown, spoken), or None when the pair is malformed: no bar, an empty side, a pair inside it."""
    shown, bar, say = body.partition("|")
    if not bar or "[[" in body:
        return None
    shown, say = shown.strip(), say.strip()
    return (shown, say) if shown and say else None


def page_tokens(p):
    """A paragraph line → [(shown, [spoken word, …], [cue, …], is_pair)], one per span on the page. Whitespace separates
    tokens except inside a [[n:SHOWN|SPOKEN]] pair; text glued to a pair joins its token ("(3)" shows "(3)", says
    "(three)"). A [[fig:k]] token (alone or glued to the token after it) lands on that token, so a figure's step lights
    when the voice reaches it. Cues and pair markup are never spoken."""
    held = []
    if "]][[n:" in p:
        die("two number pairs with nothing between them — the voice would say one run-together word; put a space or a word between them")

    def hold(m):
        sides = pair_sides(m.group(1))
        if sides is None:
            die(f"a malformed number pair {m.group(0)!r} — write [[n:SHOWN|SPOKEN]], both sides filled, no pair inside a pair")
        held.append(sides)
        return f"\x00{len(held) - 1}\x00"
    out, pend = [], []
    for tok in PAIR.sub(hold, p).split():
        m = CUE.match(tok)
        while m:
            pend.append(f"{m.group(1)}:{m.group(2)}")
            tok = tok[m.end():]
            m = CUE.match(tok)
        if "[[n:" in tok:
            die(f"an unclosed number pair in {tok!r} — [[n:SHOWN|SPOKEN]] needs its closing ]]")
        if "[[" in tok:
            die(f"a cue that is not [[figure:step]] in {tok!r}")
        if tok:
            segs = HELD.split(tok)   # even = plain text, odd = the index of a held pair
            shown = "".join(held[int(x)][0] if i % 2 else x for i, x in enumerate(segs))
            say = "".join(held[int(x)][1] if i % 2 else x for i, x in enumerate(segs))
            out.append((shown, say.split(), pend, len(segs) > 1))
            pend = []
    if pend:
        die(f"cue {pend} closes a paragraph — it has no word to land on")
    return out


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower())


def align(tokens, bounds):
    """Map whitespace tokens to WordBoundary onsets: exact/prefix match on lowercased alphanumerics, three steps of
    lookahead either side, a substitution otherwise, linear interpolation for gaps, never decreasing."""
    t = [None] * len(tokens)
    i = j = 0

    def match(a, b):
        return bool(a) and bool(b) and (a == b or a.startswith(b) or b.startswith(a))

    while i < len(tokens) and j < len(bounds):
        a, b = norm(tokens[i]), norm(bounds[j][2])
        if match(a, b):
            t[i] = bounds[j][0]; i += 1; j += 1; continue
        ahead = next((k for k in range(1, 4) if j + k < len(bounds) and match(a, norm(bounds[j + k][2]))), None)
        if ahead:
            j += ahead; continue
        behind = next((k for k in range(1, 4) if i + k < len(tokens) and match(norm(tokens[i + k]), b)), None)
        if behind:
            i += 1; continue
        t[i] = bounds[j][0]; i += 1; j += 1
    known = [(k, v) for k, v in enumerate(t) if v is not None]
    end = (len(t), bounds[-1][0] + bounds[-1][1]) if bounds else (len(t), 0)
    for k in range(len(t)):
        if t[k] is None:
            prev = max((p for p in known if p[0] < k), default=(-1, 0), key=lambda p: p[0])
            nxt = min((p for p in known if p[0] > k), default=end, key=lambda p: p[0])
            t[k] = round(prev[1] + (nxt[1] - prev[1]) * (k - prev[0]) / (nxt[0] - prev[0]))
    for k in range(1, len(t)):
        t[k] = max(t[k], t[k - 1])
    return t, len(known)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("workdir")
    ap.add_argument("-o", "--out")
    ap.add_argument("--fragment", action="store_true", help="the Artifact host form: no doctype/html/head/body, 15 MB cap")
    a = ap.parse_args()
    wd = Path(a.workdir).resolve()
    cfg = json.loads((wd / "narration.json").read_text(encoding="utf-8"))
    ICONS.update(cfg.get("icons", {}))
    secs = cfg["sections"]
    out = Path(a.out) if a.out else wd / f"{cfg.get('slug') or wd.name}.html"

    css, cog_html, cog_js = chrome_blocks()
    add_css = NCSS.read_text(encoding="utf-8")
    if (wd / "page.css").exists():
        add_css += "\n  /* ══ the page's own components ══ */\n" + (wd / "page.css").read_text(encoding="utf-8")
    css = css.replace(COG_CSS_MARK, add_css + "\n" + COG_CSS_MARK, 1)

    if cfg.get("extra_fonts"):
        die("extra_fonts is retired — Georgia joined the kit's roster (D5, 2026-10-05); a further family is the operator's call (H3)")

    dur, clips_b64 = {}, {}
    for s in secs:
        mp3 = wd / "mp3" / f"{s['clip']}.mp3"
        if not mp3.exists():
            die(f"missing {mp3} — run tools/narrate-tts.py first")
        dur[s["clip"]] = round(probe_seconds(mp3), 2)
        clips_b64[s["clip"]] = base64.b64encode(mp3.read_bytes()).decode()
    total = sum(dur.values())

    rt = runtime_words(total)

    body = (wd / "body.html").read_text(encoding="utf-8")
    ids = [s["id"] for s in secs]
    byid = {s["id"]: s for s in secs}
    for s in secs:
        for need in (f'id="{s["id"]}"', f'{{{{LISTEN:{s["clip"]}', f'{{{{TX:{s["clip"]}}}}}'):
            if need not in body:
                die(f"body.html has no {need} for section {s['id']!r}")
    body = re.sub(r"\{\{ICON:([\w-]+)\}\}", lambda m: icon(m.group(1)), body)
    body = body.replace("{{RUNTIME}}", rt).replace("{{CLIP_COUNT}}", str(len(secs)))

    body = re.sub(r"\{\{IMG:([^}]+)\}\}", lambda m: data_uri(wd / m.group(1)), body)
    # the page's figure blocks leave the body here (after ICON/IMG, so a block may use both); the scripts place them with @fig <id>
    blocks = {}

    def lift(m):
        if m.group(1) in blocks:
            die(f"figure block {m.group(1)!r} is defined twice in body.html")
        blocks[m.group(1)] = m.group(2).strip()
        return ""
    body = re.sub(r"<!--\s*fig:([\w-]+)\s*-->(.*?)<!--\s*/fig\s*-->\n?", lift, body, flags=re.S)

    def listen(m):
        clip, label = m.group(1), m.group(2) or "Listen"
        return (f'<div class="listen" data-clip="{clip}"><button class="play" type="button">{PLAY_SVG}{PAUSE_SVG}<span>{html.escape(label)}</span></button>'
                f'<input type="range" class="seek" min="0" max="1000" step="1" value="0" aria-label="Seek within: {html.escape(label)}">'
                f'<span class="dur">{mmss(dur[clip])}</span></div>')
    body = re.sub(r"\{\{LISTEN:([\w-]+)(?::([^}]*))?\}\}", listen, body)

    times, report, used = {}, [], set()

    def figure(line, k, cued=frozenset()):
        """One @ line → a <figure class="fig" data-p=k>, tied to the paragraph before it. A figure the script cues is
        marked data-cued: the voice steps it, so going live does not replay it from the top."""
        kind, _, rest = line.partition(" ")
        src, _, cap = rest.partition("|")
        src, cap = src.strip(), cap.strip()
        if kind == "@fig":
            if src not in blocks:
                die(f"@fig {src!r} has no <!-- fig:{src} --> block in body.html")
            used.add(src)
            cue = ' data-cued="true"' if src in cued else ""
            return f'<figure class="fig" data-p="{k}" data-fig="{src}"{cue}>{blocks[src]}</figure>'
        path = wd / src
        w, h = probe_size(path)
        if "@2x" in path.stem:   # recorded at deviceScaleFactor 2: show it at its CSS size, sharp on a dense screen
            w, h = w // 2, h // 2
        alt = html.escape(plain(cap), quote=True)
        capt = f"<figcaption>{cap}</figcaption>" if cap else ""
        if kind == "@img":
            capt = f'<figcaption><span class="kind" title="A still — click it to enlarge">{icon("image")}</span><span>{cap}</span></figcaption>' if cap else ""
            return (f'<figure class="fig" data-p="{k}" style="--fw:{w + 2}px"><button type="button" data-zoom aria-label="Enlarge: {alt}">'
                    f'<img src="{data_uri(path)}" width="{w}" height="{h}" alt="{alt}" decoding="async"></button>{capt}</figure>')
        if kind == "@vid":
            capt = f'<figcaption><span class="kind" title="An action clip from the app — click it to enlarge">{icon("film")}</span><span>{cap}</span></figcaption>'
            return (f'<figure class="fig" data-p="{k}" style="--fw:{w + 2}px"><video muted loop playsinline preload="auto" width="{w}" height="{h}" '
                    f'aria-label="{alt}" title="Click to enlarge" src="{data_uri(path)}"></video>{capt}</figure>')
        die(f"unknown marker {kind!r} — @img, @vid or @fig")

    def tx(m):
        clip = m.group(1)
        lines = [ln.strip() for ln in (wd / "txt" / f"{clip}.txt").read_text(encoding="utf-8").splitlines() if ln.strip()]
        paras = [ln for ln in lines if not ln.startswith("@")]
        ptoks = [page_tokens(p) for p in paras]
        flat = [w for pt in ptoks for _, say, _, _ in pt for w in say]   # exactly what the voice said, word by word
        placed = {ln.split()[1] for ln in lines if ln.startswith("@fig") and len(ln.split()) > 1}
        cued = {c.split(":")[0] for pt in ptoks for _, _, cs, _ in pt for c in cs}
        for pt in ptoks:
            for _, _, cues, _ in pt:
                for c in cues:
                    fig, k = c.split(":")
                    if fig not in placed:
                        die(f"{clip}: cue [[{c}]] names a figure this script never places with @fig {fig}")
                    steps = {s for v in re.findall(r'data-k="([^"]*)"', blocks.get(fig, "")) for s in v.split()}
                    if k not in steps:
                        die(f"{clip}: cue [[{c}]] — figure {fig!r} has no element with data-k {k} (it has {sorted(steps) or 'none'})")
        bounds = json.loads((wd / "mp3" / f"{clip}.words.json").read_text(encoding="utf-8"))
        wt, hit = align(flat, bounds)
        first, at = [], 0   # a page span is timed at the onset of its FIRST spoken word, so it stays the crest for the whole span
        for pt in ptoks:
            for _, say, _, _ in pt:
                first.append(wt[at])
                at += len(say)
        times[clip] = first
        n_figs = len(lines) - len(paras)
        n_cues = sum(len(cs) for pt in ptoks for _, _, cs, _ in pt)
        n_nums = sum(1 for pt in ptoks for *_, is_pair in pt if is_pair)
        report.append(f"align {clip}: {hit}/{len(flat)} words matched a boundary · {n_figs} figure(s)" + (f" · {n_cues} cue(s)" if n_cues else "")
                      + (f" · {n_nums} number(s)" if n_nums else ""))

        def word(shown, say, cues, is_pair):
            cue = f' data-cue="{" ".join(cues)}"' if cues else ""
            if is_pair:
                return f'<span class="w n"{cue} data-say="{html.escape(" ".join(say))}">{html.escape(shown)}</span>'
            return f'<span class="w"{cue}>{html.escape(shown)}</span>'
        out, k = [], -1
        for ln in lines:
            if ln.startswith("@"):
                out.append(figure(ln, max(k, 0), cued))
            else:
                k += 1
                out.append(f'<p data-p="{k}">{" ".join(word(*t) for t in ptoks[k])}</p>')
        return f'<div class="tx" data-clip="{clip}">{"".join(out)}</div>'
    body = re.sub(r"\{\{TX:([\w-]+)\}\}", tx, body)
    unused = sorted(set(blocks) - used)
    if unused:
        die(f"figure blocks no script places: {unused} — add @fig lines or delete the blocks")

    def nextbtn(m):
        k = ids.index(m.group(1))
        if k + 1 < len(ids):
            n = byid[ids[k + 1]]
            return f'<div class="sec-foot"><button class="next-btn" type="button" data-goto="{n["id"]}">Next: {html.escape(n["title"])}{icon("arrow-right")}</button></div>'
        return f'<div class="sec-foot"><button class="next-btn" type="button" data-goto="top">Back to the top{icon("arrow-up")}</button></div>'
    body = re.sub(r"\{\{NEXT:([\w-]+)\}\}", nextbtn, body)

    # ── the dock: ONE bar (operator 2026-10-05) — the sections menu, Play all and Next as icons on the left;
    # the player in the centre (transport · what is playing · seek · speed); the cog on the right, inside the bar ──
    def tone(sid, k):
        m = re.search(r'<section\b[^>]*\bid="%s"[^>]*>' % re.escape(sid), body)
        n = re.search(r'data-sec="(\d)"', m.group(0)) if m else None
        return n.group(1) if n else str(k % 9 + 1)
    items = []
    for k, s in enumerate(secs):
        t_, d = html.escape(s["title"]), mmss(dur[s["clip"]])
        items.append(
            f'<li class="ti" data-target="{s["id"]}" style="--c:var(--sec{tone(s["id"], k)})">'
            f'<button class="ti-go" type="button" data-act="go"><span class="ti-ico">{icon(s["icon"])}</span>'
            f'<span class="ti-t">{t_}</span><span class="ti-d">{d}</span></button>'
            f'<button class="ti-play" type="button" data-act="play" title="Play this section’s audio · {d}" aria-label="Play {t_}, {d}">{PLAY_SVG}{PAUSE_SVG}</button></li>')
    dock = f'''<nav class="dock" id="dock" aria-label="Sections and narration" data-narration="recorded">
  <div class="dock-in">
    <div class="dk-left">
      <div class="toc-wrap">
        <button class="dk-icon toc-btn" type="button" id="toc-btn" aria-expanded="false" aria-controls="toc" title="Sections" aria-label="Sections: go to or play any of the {len(secs)}">{icon("list")}<span class="toc-cur" id="toc-cur">1 / {len(secs)}</span>{icon("chevron-down", "chev")}</button>
        <div class="toc" id="toc" hidden>
          <p class="toc-head">{icon("headphones")}<span>{len(secs)} sections · {rt} of narration</span></p>
          <ol class="toc-list">{"".join(items)}</ol>
        </div>
      </div>
      <button class="dk-icon" type="button" id="playall" title="Play all · the narration from here to the end, {rt}" aria-label="Play all: the whole narration, {rt}">{icon("list-video", "i-all")}{PAUSE_SVG}</button>
      <button class="dk-icon" type="button" id="gonext" title="Next section" aria-label="Go to the next section">{icon("chevrons-down")}</button>
    </div>
    <div class="player" id="player" role="group" aria-label="Narration player">
      <div class="pl-trans">
        <button class="pl-btn" type="button" id="pl-top" title="Start over from the first section" aria-label="Start over from the first section">{icon("rewind")}</button>
        <button class="pl-btn" type="button" id="pl-prev" title="Previous section" aria-label="Previous section's audio">{icon("skip-back")}</button>
        <button class="pl-btn pl-main" type="button" id="pl-play" title="Play the section in view" aria-label="Play">{PLAY_SVG}{PAUSE_SVG}</button>
        <button class="pl-btn" type="button" id="pl-next" title="Next section" aria-label="Next section's audio">{icon("skip-forward")}</button>
      </div>
      <div class="pl-now">
        <div class="pl-line"><span class="pl-ico" id="pl-ico" aria-hidden="true">{icon("headphones")}</span><span class="pl-title" id="pl-title" aria-live="polite">Nothing playing · press play</span><span class="pl-time" id="pl-time">0:00 / 0:00</span></div>
        <input type="range" class="seek pl-seek" id="pl-seek" min="0" max="1000" step="1" value="0" aria-label="Seek within the current section" disabled>
      </div>
      <div class="pl-x">
        <button class="pl-btn" type="button" id="pl-restart" title="Restart this section" aria-label="Restart this section from the beginning">{icon("rotate-ccw")}</button>
        <button class="pl-btn" type="button" id="pl-stop" title="Stop" aria-label="Stop">{icon("square")}</button>
        <button class="pl-btn pl-rate" type="button" id="pl-rate" title="Speed">1×</button>
      </div>
    </div>
    <div class="dk-right">
{cog_html.rstrip()}
    </div>
  </div>
</nav>
'''

    js = NJS.read_text(encoding="utf-8")
    js = js.replace("{{SECS}}", json.dumps([{"id": s["id"], "clip": s["clip"], "title": s["title"]} for s in secs], ensure_ascii=False))
    js = js.replace("{{TIMES}}", json.dumps(times, separators=(",", ":")))
    js = js.replace("{{DURS}}", json.dumps(dur))
    js = js.replace("{{CLIPS}}", ",\n".join(f'    "{c}": "data:audio/mpeg;base64,{b}"' for c, b in clips_b64.items()))
    page_js = (wd / "page.js").read_text(encoding="utf-8") if (wd / "page.js").exists() else ""

    zoom = '<dialog class="zoom" id="zoom" aria-label="Enlarged figure"><img alt="" hidden><video muted loop playsinline hidden></video></dialog>\n'
    inner = f"{dock}\n{body}\n{zoom}\n<script>\n{cog_js}\n{js}\n{page_js}\n</script>\n"
    title = html.escape(cfg["title"])
    if a.fragment:
        page = f"<title>{title}</title>\n\n<style>{css}</style>\n\n{inner}"
    else:
        desc = f'<meta name="description" content="{html.escape(cfg["description"], quote=True)}">\n' if cfg.get("description") else ""
        page = (f'<!doctype html>\n<html lang="{cfg.get("lang", "en")}">\n<head>\n<meta charset="utf-8">\n'
                f'<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="color-scheme" content="light dark">\n'
                f"{desc}<title>{title}</title>\n<style>{css}</style>\n</head>\n<body>\n{inner}</body>\n</html>\n")
    left = re.findall(r"\{\{[^}]*\}\}", page)
    if left:
        die(f"unfilled placeholders: {left[:5]}")
    out.write_text(page, encoding="utf-8")
    for r in report:
        print(r)
    mb = len(page.encode("utf-8")) / 1e6
    print(f"wrote {out} · {mb:.2f} MB · {len(secs)} clips · {mmss(total)} of narration ({rt}) · {'Artifact fragment' if a.fragment else 'standalone document'}")
    if a.fragment and mb > 15:
        die(f"{mb:.1f} MB is over the 16 MB Artifact limit's safe margin — trim the narration or the media")
    if mb > 40:
        print(f"WARN  {mb:.1f} MB — a browser opens it, but trim the clips before it travels by mail or chat")


if __name__ == "__main__":
    main()
