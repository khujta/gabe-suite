# Where loop 1 stands

One page, rewritten (never appended) whenever the position moves. Read it before `method.md` (the method) and
`decisions.md` (every ruling, D-001 … D-084). Updated 2026-10-02 · on `graft-adoption`, **committed
locally, not pushed** (his rule: "All this work can remain local for now. Just committed.").

## In plain words

Loop 1 is the API endpoint card. Its display half lives on ONE page, `../workflow-panel/all-endpoints.html` (gustify @
`05007957`, frozen feed). On 2026-09-30 he read that page as a HUMAN and dictated 23 items of feedback (D-066): much that was clear
to the model was not clear to him. Round 1 fixed them AND named the patterns behind them, so they can be carried into the Gabe Suite.

**Now: PAUSED ON DISK, the fix is his (D-086, 2026-10-03).** C: fell 54 → 33 GB while no file grew (writes, not storage: WSL wrote 49 GB in
37 h). His steps, ready in `C:\Users\Gabe\disk-fix\` (README.txt): (1) `1-restore-points.ps1` — admin, reads, asks before capping restore
points at 15 GB; (2) `2-compact-wsl.ps1` — every WSL window closed, 15–60 min. Ours (4), done: `~/.local/bin/heavy <cmd>` runs browser jobs
one at a time with temp in RAM (one check: 222 MB → 2 MB written) and refuses under 40 GB. Testing is lean (D-086): a suite change runs its
skill's batteries + the parity check, the full sweep before a push; a page check once per batch; a walk only for a click path.
Round 1 is ruled (D-081, D-084, D-085). D-085 ("land it", "use recommended approach", "go"): Security = marks, after-a-decision = stop there
(`9a9bb86`); the doubled rate limit middleware as an option, merged (my pick, dashed) or apart (`1790c87`, probe 776/0); L-33 traced + the
hover emitter designed + P2.1/P3.2 redrafted (`8b7917d`, `legibility/drafts/hover-and-corpus/`).
OWED, in order, once C: ≥ 40 GB: (1) the read-aloud landing in gabe-artifact 1.5.0 — done in the working tree and on `wip/read-aloud-landing`
(`ccb96c6`), battery 42/42, install parity CLEAN — needs gabe-artifact's own batteries (artifact-chrome · artifact-motion · legibility-audit; read-aloud 42/42 done) through `heavy`, then its commit — the full sweep before a push (D-086); (2) the all-endpoints walk (the merged/apart steps
are written, never run), two `walk-extra.json` tags, the review page regenerated + its probe (both edited, uncommitted, never run) → the third
commit; (3) phase 2: the hover emitter on both pages (the lab's card, P1.1/P2.1/P4.1/P8.1/P10.1 checked at emission) + the redrafts on the
review page for his "land it"; (4) phase 3: L-39's bench sections on the emitter.

## Round 1 — what happened (D-066 … D-071)

| step | what | where |
|---|---|---|
| log | his 23 items logged BEFORE any fix: words, where, could-not-tell, fix, pattern tag, status | `legibility-feedback.md` (L-01 … L-23) |
| build | hovers + row legend (D-067) · stage band, metadata section, column controls, row-head columns (D-068) · element identity: gate hosts and chains, function icons, client blocks, in-flight and specialist looks (D-069) · data map + lifelines (D-070) · the EXAMPLES bench with test and function blocks (D-071) | `3343b42` … `2ee6ab5` |
| review | one read-only review, four lenses: 136 findings; his items 9 answered · 13 partly · L-19 not built | `legibility/review-r1.raw.json` |
| fix | round 1b: 117 fixed · 13 partly · 4 left (the feed lacks the fact) · 2 his to rule; then a small pass (7 items) | `89d99e0` … `efe3725`, `legibility/fix-1b.json` |
| measure | a prototype of the pattern checks, before · round 1 · after the small pass, on POST /cooking/sessions | `legibility/measure-legibility.mjs`, `measures.*.json` |
| walk | repaired for D-067 … D-071 + a D-066 section of 116 real-click steps (pictures 294 … 409) | `3835fed` |
| page | the review + patterns page, then a two-lens content review of it, fixed | `1ccb861` … `fa7f250` |

Checks at the end: `probe-all-endpoints` 739/0 · the review page's smoke probe 23/23 · both `--check` current · the walk exits 0.

## The patterns (draft — nothing lands in the suite before his "land it")

Ten, in `legibility/patterns.json`, each with why it was clear to a model and not to him, the checks that measure it, and suite
proposals with cost and counter-argument: P1 the hover describes the kind, not the item · P2 the page talks about itself · P3 an
element without its identity · P4 one end of a relation · P5 structure hidden in a mark or mixed into an axis · P6 one thing, several
names · P7 the code's spelling instead of its meaning · P8 a word or number that promises more than its rule · P9 no bench for one
element · P10 a written rule with no check breaks on the next surface. The six check proposals share one tool, the audit A1
(`measure-legibility.mjs` moved into `skills/gabe-artifact/tools/`). Evidence that rules alone do not hold: the review found the
same patterns on the surfaces the agents had just built, and two merged lanes broke a shared word key no build check could see.

## Rules in force

| rule | where |
|---|---|
| No propagation to the twins; pages read the frozen feed (the review page also reads gustify's source read-only, git grep at `05007957`, to place two functions — a deviation he may overrule) | D-023 |
| Display is decided by seeing built options; a choice made alone is an option with the agent's pick dashed | D-025.1, D-025.2 |
| Facts are generated, never typed — numbers in words are `{tokens}`; numbers in commit messages are measured first | D-025.3 |
| A click path comes from a real-click walk | D-025.4 |
| A ruling goes into `decisions.md` in the same commit that acts on it | D-025.5 |
| He reviews on a generated decision page | D-025.8 |
| Design pages are checked lightly: true numbers in the generator, `--check`, the probe once, one walk | D-037 |
| Facts about the code are shown; how the map knows them is hidden | D-017 |
| One hover per item, in before · checks · gives; a kind's meaning lives in the row's legend | D-067 |
| Every element named wears the station's glyph and colour, its subcategory as a label at the end | D-052 |

## Round 2 (D-072) — the review page, read by a human

He found the review page dense (L-24..L-26): it now takes the screen's width (1800 px at 1920), short values stay on one line, states
and patterns wear icons with one legend, and every section opens with a spoken summary — copy to read aloud, or listen (the
browser's own voice; my proposal, dashed). Text to speech was explored: the in-page listen button and Edge's Read aloud are free and
work now; Piper (local, free) tested fine; Kokoro failed on a packaging bug (needs `sudo apt install espeak-ng`); ElevenLabs
(`uvx elevenlabs-mcp`, free tier 10,000 credits a month) needs his API key. His pick of a route is open.

Then (D-073, D-074): the **voice lab** `legibility/voices/voice-lab.html` — one text (the 8 summaries) read by every browser voice,
every setting tunable, 15 Piper samples (5 voices × 3 speeds), one copy line `VOICE · engine … · voice … · speed …` — published
privately at https://claude.ai/artifact/6aChNSpmewj39KQSsSeH8m; and the review page's contents bar now freezes while a voice reads
and steers it (skip = the reading AND the page move). Both read one saved setting, `gabe:voice:v1`. Tested only against a mocked
voice engine: his first listen on Windows is the real test. **His pick is ruled (D-075):** Google UK English Female (en-GB),
speed 1.15, pitch 1.0, pause between sentences 250 ms — the default on both pages, from `legibility/voices/voice.ruled.json`
(volume, pause between sections and section names stay my picks). It is a Chrome online voice; elsewhere the pages fall back and say so.
Then D-076/D-077: the bar shows ALL THE TIME on both pages (his ruling, having played it); its menu nests — The patterns,
Your calls and The gap analysis are dropdowns of their 53 decisions, each with a spoken summary and a gabe-lens plain line, a
"next open decision" button; each decision also shows an example from the real page and the impact of each option, and every
icon's hover follows this round's rules (one per item, the item's own fact, the meaning once in the legend — D-078). Then D-079/D-080: every
pattern and decision opens with THE PAIN (with a meter), LIKE (a gabe-lens analogy in his Sequential-Procedural suit), THE COST
(to solve · if not, a size bar, a balance) and THE HANDLE; patterns add numbered steps and the DOES / DOES NOT / DECIDES WHEN box;
all authored in `legibility/legibility-review.lens.json` (numbers generated), read aloud in that order. **Draft for the suite, awaiting his "land it":** `legibility/drafts/gabe-artifact-read-aloud/` —
the read-aloud bar as a reusable gabe-artifact part (H7 clause, reference, module, demo, a gate that fires without the bar and
stays silent with it, a battery); its README says what lands where and the cost (+1 browser battery ≈ 35 s on the doctor).

## His review of round 1 is in (D-081, 2026-10-02)

41 lines his, 12 left as my pick. In progress: (a) the page pass — his ruled looks as defaults, the header/saving pictures that showed no
difference (L-34), clearer depictions where he wrote "I don't get what is happening here" (L-35), a simpler bench with a width control
(L-36), a resizable widened column (L-37), Shift+wheel across a wide table (L-38); (b) the suite landing of A1 · P1.1 · P1.2 · P2.2 ·
P3.1 · P4.2 · P5.2 · P7.1 · P7.2 · P8.2 · P9.1 · P10.2 (the audit into gabe-artifact with its battery, the references, the contract
clauses), install + a clean doctor. Queued after: P4.1 · P8.1 · P10.1 (build checks in the page generators); P3.2 and P2.1 redrafted to
his words for a new "land it"; L-33 (the frontend lab's hover cards as the one hover format — trace its origin first); L-39 (bench
sections: the gate card, stage encoding, gate roles, function marks, the standard-or-specialist split, the metadata layout). Not yet:
P5.1, P6.1, P6.2 — trigger: the navigation bar's consolidation. The read-aloud draft (D-076) still waits on its own "land it".

## The round-3 page pass and the suite landing are done (2026-10-02)

Suite: A1 · P1.1 · P1.2 · P2.2 · P3.1 · P4.2 · P5.2 · P7.1 · P7.2 · P8.2 · P9.1 · P10.2 landed (d72feba … 6971efa; install; doctor CLEAN).
Pages: his ruled looks are the defaults, the simpler bench with a width per column, a draggable widened column, Shift+wheel across a
wide table (739d528, probe 746/0); the walk with real clicks (fcd1063, exit 0, 448 pictures); the review page with the header/saving
crops side by side and a before/after or a labelled mock for every option he could not follow (c37cc0d, probe 163/0). A disk alarm
paused the work at C: 38 GB; deleting the WSL crash dumps (10.9 GB) and the Windows pip cache (4.1 GB) brought it to 52 GB. Two old
WSL swap files (5 GB) in Temp wait on his word.

## Open for you

1. **On the review page** — the Security look (marks · moved; seen on all-endpoints.html → POST /cooking/sessions → BY MOMENT's
   Security row → its options square) and the player's "after a decision"; then paste the copy text. Seen while building: the rate
   limit middleware stands twice at the edge (the numbered middleware, and the host of its switch) — his to merge or keep.
2. **On the all-endpoints bench** (D-083) — the seven kind looks (endpoint · schema · function · test · gate · hook · in-flight) and
   EX-5; his configuration comes back as words, not a review line.
3. **The read-aloud draft** (`legibility/drafts/gabe-artifact-read-aloud/`) — "land it" or not.
4. **Two old WSL swap files** in Windows Temp (≈5 GB) — "delete the old swaps" or keep.
5. **Older opens, still standing**: the agent-added rules of D-064, which handler line a handler shows, the 2026-09-23 opens
   (D-035's section map, the four standpoints, the lab's picks, M3's first face, the command layout).

## Generation items open (suite code; each needs its regime, D-063)

Router tags · a call inside another call's arguments recorded after it · relief-accept's error paths · the web/e2e journeys (the
tests arm reading Playwright reports) · a re-export two hops deep · the universe card's Source line. New from round 1 (all feed
gaps the page now states as "not recorded"): a raise inside an `except` joined to its outer `if` · `start_session`'s raise at :129
and `assert_recipe_allergen_safe`'s raise not joined to their endings · a fall-through branch's does[] · via-hop function names ·
a step's condition text · a call's end line · three real writes whose model the feed did not resolve · gustify's code map not
reading `middleware/`, `reference/`, `i18n/`, `net/`, `streaming/` (why ~87 functions have no role) · the CORS origins and the
secrets a path reads (settings{} has them, unjoined).

## Next, in order

1. **His Security look and "after a decision"** (copy text) → each a D-entry in the same commit; "my pick, not ruled" is never a ruling.
2. **On his "go"**: P4.1 · P8.1 · P10.1 (build checks in the page generators); P3.2 and P2.1 redrafted to his words for a new
   "land it"; L-33 (the frontend lab's hover cards as the one hover format — trace its origin first); L-39 (bench sections).
3. **The card layouts** from his bench configuration (D-083), after the legibility work.
4. **M3** (the channel budget for the first prism), then **the gallery**; generation items above, each under its D-063 regime.

Later: the twins' code-vs-map COVERAGE AUDIT (a parallel session; its files under `coverage/` are that session's — never touch) ·
piece 9 (D-016) · 12b (D-019) · the robot for every kind · the "more information" toggle (D-017) · pages for the blocks with none
yet (D-022) · the parked WORLD region (D-031) · `pieces-digest.json` is stale against the cache.
