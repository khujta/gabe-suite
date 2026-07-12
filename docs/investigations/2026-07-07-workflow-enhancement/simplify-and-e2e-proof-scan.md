# Simplify & E2E-Proof Tooling Scan — 2026-07-08

**Purpose:** deeper scan on two operator-requested capabilities — (1) a **simplification step**
after review (possibly embedded in the commit gate or a `git simplify`-style command), and (2)
**end-to-end proof generation** (Playwright-based, producing GIFs/images that later feed
documentation or demos). Gathered via GitHub search + web search + README reads on 2026-07-08.
References, not adopt-wholesale — extract the technique.

---

## Part 1 — Simplification ("a simplify step after review")

### You already have the core: the built-in `/simplify`
`/simplify` reviews **recently changed files** for reuse / quality / efficiency and **applies
the fixes** — it spawns **three parallel review agents**, each looking from a different angle
(a mini multi-agent review without leaving the terminal). **Quality only — it does not hunt for
bugs** (that's `/code-review`). Most valuable **right after a large refactor or after accepting
a batch of AI-generated code** (unused imports, redundant vars, extract-shared-logic, overly
complex conditionals). `/code-review --fix` is the adjacent option that also applies findings.

→ **The operator's instinct is correct and the gap is *integration*, not a missing skill.** The
"simplify step after review" already exists as a skill; it just isn't wired into the KDBP
lifecycle (`gabe-review` → **simplify** → `gabe-commit`).

### ponytail vs. /simplify — complementary, not competing
- **ponytail = prevention (write-time):** the 7-rung "don't over-engineer" ladder stops
  complexity being created in the first place. Belongs *before/*during* coding (a gate/ruleset).
- **/simplify = cleanup (after-the-fact):** removes complexity that already landed. Belongs
  *after review, before commit*.
- Use **both**: ponytail as the restraint gate, `/simplify` as the post-review cleanup pass.

### Reference implementations (portable / packaged)
| Repo | What it is | Verdict |
|---|---|---|
| `xpiu/simplify` | The Claude Code `/simplify` command converted to a portable `SKILL.md` | **Reference** — shows how to package `/simplify` as an installable skill (useful if the suite ships its own) |
| `dimillian/skills/review-and-simplify-changes` | A skill that combines **review + simplify** in one | **Reference** — the exact "review→simplify" fusion the operator described |
| `AbdoKnbGit/opencode-simplify` | Automated review + quality enhancement (reuse/quality/perf), inspired by `/simplify` | Reference |
| `ohwisey/simplify` | Tiny free `/simplify` + `/recap` + `/decide` | Skim |
| `citypaul/.dotfiles → refactoring/SKILL.md` | A structured refactoring skill | Reference for refactor phrasing |
| `levnikolaevich/claude-code-skills` | Full delivery-lifecycle plugin suite (multi-model review, audits, perf) | Skim — heavier, lifecycle ideas |

### Operator-proposed change (for Fable to evaluate)
**Embed a simplify pass in the KDBP lifecycle**, quality-only, positioned *after* `gabe-review`
(bugs) and *before/at* `gabe-commit`. Options:
- **Thin `/gabe-simplify` wrapper** over the built-in `/simplify` (altitude: command wrapper —
  the work already exists; the wrapper just routes and fits the lifecycle). Cheapest.
- **A gate inside `gabe-commit`** — run simplify as a pre-commit quality step (opt-in / tiered,
  so it doesn't add friction on trivial commits).
- Keep it **strictly quality-only** (reuse/simplify/efficiency); bug-hunting stays in
  `gabe-review`. Mirrors the built-in split and avoids scope-creep.
- **Altitude note:** this is a *suite-global* step (same shape both projects) → global wrapper,
  no per-project manifest needed. Feeds Thread 2 + the §7 sequenced plan.

---

## Part 2 — E2E proof + GIF/video for docs/demos (Playwright)

### Constraint (operator): WSL on Windows, Chrome-MCP is problematic → stick with **Playwright**
**Good news — the whole pipeline is WSL-safe with no Chrome-MCP:** Playwright's Chromium runs
**headless and records video with no display server**, and `ffmpeg` runs natively in WSL. So
"record the flow → GIF/MP4" needs nothing from the Windows host or a Chrome MCP.

### Native Playwright (baseline — already in your stack)
- **Video recording**: set `video` in the Playwright config → `.webm` per test in
  `test-results/`. Screenshots + the **trace viewer** are the other built-ins.
- Convert `webm` → `gif`/`mp4` with `ffmpeg` (one-liner). This alone satisfies the Evidence
  Doctrine's "GIF of the flow," but it's raw (no cursor/zoom polish).

### Tools that turn Playwright flows into polished proof/demos
| Tool | What it does | Fit |
|---|---|---|
| **`mcpware/pagecast`** ⭐ | **MCP server + CLI**: drives Playwright, tracks every click/scroll with bounding boxes, post-processes with **ffmpeg** → **GIF / MP4 / WebM**. `--headless` (WSL/CI-safe). **Tooltip mode** (magnified overlays), **cinematic mode** (pan/zoom to each action), **cursor highlight + click ripple**, **platform presets** (GitHub 1280×720, TikTok 1080×1920…). Needs Node ≥20, ffmpeg, Playwright. | **Top pick** — turns an E2E flow into a polished demo GIF/video for docs/demos, exactly the Evidence Doctrine's "evidence → docs/demo" arm. MCP form drops into the suite cleanly. |
| `qawolf/playwright-video` | Saves a video of a Playwright page via DevTools screencast + ffmpeg | Reference / lighter alternative |
| `playwright-recast` | Parses Playwright test-results → renders mp4/other formats (needs ffmpeg, Node 20+) | Reference — "tests → videos" batch |
| Native `ffmpeg webm→gif` | `ffmpeg -i in.webm -vf "fps=12,scale=960:-1" out.gif` | Zero-dep fallback |

### How this wires into the Evidence Doctrine (§2A)
- **The "capture tool" is a per-project manifest field.** Candidate default: **pagecast**
  (polished, headless, WSL-ok) with native Playwright video + ffmpeg as the zero-dep fallback.
- Produces the **GIF-of-flow** evidence that **doubles as documentation/demos** — the Doctrine's
  dual-purpose requirement, satisfied by one tool.
- Maps to Ara's **three-layer verification**: Playwright covers the **agent-driven browser run**
  and **headless CI** layers; the human dashboard is the rendered GIF/report.

---

## Top actionables (for the §7 sequenced plan)
1. **Simplify step** — wire the built-in `/simplify` into the lifecycle as a thin
   `/gabe-simplify` wrapper (or a tiered gate in `gabe-commit`), quality-only, after
   `gabe-review`. Pair with ponytail-style restraint at write-time. *Suite-global; cheap.*
2. **E2E proof capture** — adopt **pagecast** (Playwright+ffmpeg → GIF/MP4, headless/WSL-ok) as
   the Evidence Doctrine capture tool; declare it as the per-project manifest field, with native
   Playwright-video+ffmpeg as fallback. Produces docs/demo-ready evidence in one step.

## URLs
- Playwright videos: https://playwright.dev/docs/videos
- pagecast: https://github.com/mcpware/pagecast
- playwright-video: https://github.com/qawolf/playwright-video
- xpiu/simplify: https://github.com/xpiu/simplify
- dimillian review-and-simplify-changes: https://github.com/dimillian/skills
- opencode-simplify: https://github.com/AbdoKnbGit/opencode-simplify
- levnikolaevich lifecycle suite: https://github.com/levnikolaevich/claude-code-skills
