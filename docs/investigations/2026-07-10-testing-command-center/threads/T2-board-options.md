# T2 — Ticket-board options, three families (raw thread report)

> Produced 2026-07-10 by the T2 research agent (Sonnet 5); receipts from live commands/fetches run 2026-07-10.
> Synthesis lives in `../output/01-options-report.md`; this file is the receipt.

Constraint frame: `.kdbp/` files (PLAN.json, PENDING.md, LEDGER.md) stay the source of truth; static/no-standing-services preferred; sync-drift priced honestly.

## Family A — KDBP-native static board (rendered view over files)

**Headline finding:** nothing off-the-shelf reads PLAN.json/PENDING.md as-is. Everything either defines its own markdown/file convention (adopt = migrate your format) or proves the *pattern* (files → build step → static board.html) is trivial and precedented. Drag-drop→file write-back genuinely exists ONLY in this family.

### Backlog.md (MrLesk/Backlog.md) — the family heavyweight
- Own markdown task-file format (one file per task, git-native, human+AI workflows). `backlog board export` → markdown reports; interactive board = TUI or local web server with **real drag-drop write-back to the md files**.
- Receipt: `gh repo view MrLesk/Backlog.md` → **6,039★, MIT, pushed 2026-07-10, v1.47.1 (2026-06-17)**. Very active.
- KDBP fit: poor as-is — adopting it = migrating .kdbp/ into its format or running a converter (= double bookkeeping). Value: proof the architecture works at 6k-star scale.

### kanban-cli (Vochsel/kanban-cli)
- Single-markdown-board local server; "writes every edit back to the markdown file, reloads when the file changes on disk" — the cleanest write-back mechanic found. Receipt: 11★, Apache-2.0, pushed 2026-05-05. Tiny/unproven; format mismatch; a mechanic to copy, not a dependency.

### Obsidian Kanban format (obsidian-community/obsidian-kanban)
- De facto markdown-kanban standard (`## Column` + `- [ ]` items). 4,401★, GPL-3.0, pushed 2026-03-06 but **latest release 2024-05-31 — coasting**. Independent renderers exist but hobby-scale (Kardinal 0★; remark-obsidian-kanban static-buildable; trip2g 0★). PENDING rows could be *emitted* into the format; PLAN.json phases/tier/proof don't map without loss.

### Static-HTML-from-files prior art
- twpol/markdown-kanban: C# CLI → static index.html (verified in Program.cs). 0★, MIT, pushed 2026-07-07 (dependabot). Exists, zero adoption.
- Serchinastico/github-kanban-action: static HTML from GitHub Projects v2. 3★, dormant 2024.
- j-jith/taskwarrior-kanban: Python → HTML kanban. 24★, dormant 2023.
- **Verdict: pattern precedented three times, no maintained adoptable implementation — and it is exactly the shape of what the gabe-docsite generator already does for docs.**

### Ruled out / negative results
- "mdBoard": effectively does not exist (best hits 2★).
- vscode-kanban (mkloubert): **archived**, "deprecated" per own README (2022). Living alternative: LachyFS/kanban-markdown-vscode-extension, 72★, pushed 2026-07-01, VS Code-only.
- taskell: archived 2023. taskwarrior-web: dormant 2019.
- Tasks.md: healthy (2,152★, v3.3.0 2026-03) but an always-on server — Family B ergonomics with Family A storage.
- kanban-md (antopolskiy): 160★, pushed 2026-06-19 — file-based board *for AI-agent loops* (CLI/TUI, atomic claim ops); adjacent prior art, no static HTML output.

## Family B — self-hosted OSS trackers

Structural fact shared by all seven: **their database is their truth.** None write back to files; a files→tracker push makes the tracker a disposable mirror; any UI edit silently forks the truth.

### Plane
- **~12 containers** (web, admin, space, api, worker, beat-worker, migrator, live + postgres + valkey + rabbitmq + minio; verified from docker-compose.yml). Docker AIO = evaluation only.
- 54,245★, pushed 2026-07-10, v1.3.1 (2026-05-14), 980 open issues.
- **License confirmed:** CE = AGPL-3.0 (LICENSE.txt fetched); Commercial/Airgapped editions closed-source; CE matches free Cloud tier — hard open-core split.
- API: REST, X-API-Key, **60 req/min documented**. Daily flow: realistically always-on. Drift: no write-back.

### Taiga
- **9 services** (verified compose: postgres:12.3, back, async, 2× rabbitmq, front, events, protected, nginx); docs: ≥1GB RAM. Pins postgres 12.3 — maintenance smell.
- taiga-back 838★ MPL-2.0 pushed 2026-07-02; front AGPL-3.0; tag 6.10.2. Alive but slow.
- API: comprehensive REST, Bearer + refresh dance. Always-on; no write-back.

### Focalboard — deprecation CONFIRMED
- Not archived, but README opens: "**This repository is currently not maintained**" (issue #5038 seeks maintainers). Last release **v8.0.0, 2024-06-13**; last main commit 2025-06-11 (dependabot). Maintained continuation = mattermost-plugin-boards (requires full Mattermost server).
- 26,280★, mixed licenses. **Ruled out.**

### Vikunja
- Light: single Go binary, **1 container with SQLite is a supported deployment**; PG/MySQL only "more than a handful of users".
- 4,726★, AGPL-3.0, pushed 2026-07-10, v2.3.0 (2026-04-09), 201 open issues. Healthy.
- API: full REST + OpenAPI at /api/v1/docs on every instance; long-lived API tokens. Start/stop per session viable. No file write-back (CalDAV is calendars, not files).

### WeKan
- App + **MongoDB 7** (Meteor) — heaviest per-feature stack here. 20,989★, MIT, pushed 2026-07-10, v9.81→9.83 all 2026-07-09 (hyperactive, largely one maintainer).
- API: REST, but project's own docs say "**REST API is not complete yet**" — card CRUD exists; board/list creation missing → real problem for scripted bootstrap.

### Kanboard
- **Minimal — verified single container with SQLite** (docker-compose.sqlite.yml defines exactly one service). PHP, no separate DB.
- 9,703★, MIT, pushed 2026-07-10, v1.2.52 (2026-04-05), decade of monthly-ish cadence. Boring-stable.
- API: **JSON-RPC 2.0** incl. `createTask`, `updateTask`, **`moveTaskPosition`**, `moveTaskToProject`, `searchTasks` — the board position itself is scriptable (unique in this family). Official Python client. Cheapest daily flow in B; mirror fully regenerable (delete + re-push).

### Gitea / Forgejo
- Lightest possible: **single binary + SQLite officially supported**; doubles as git host.
- Gitea 56,771★, MIT, v1.26.4 (2026-06-21), pushed 2026-07-10. Forgejo (Codeberg): 5,100★, v15.0.4 + v11.0.16 LTS both 2026-07-09; GPL-3.0+ since v9.0 (2024, per project announcements — not re-verified today).
- **Critical asymmetry:** Issues API mature (full REST/swagger, PATs, no default rate limits) but **Projects/kanban boards have NO API at all** — go-gitea/gitea#14299 open since 2021-01-10, still open (verified via gh api; plus #28111, #35921). A script can create issues/labels but cannot place cards on columns. Same gap in Forgejo.
- Drift: issues in DB, no write-back; board-API gap adds a second, script-invisible drift surface.

## Family C — SaaS synced

### Jira
- REST v3 mature; Basic auth (email:api_token). Free ≤10 users, 2GB; **idle-site deactivation risk documented**. Rate limits: points system (65k/hr from 2026-03) excludes API-token traffic (legacy unpublished burst limits). US/EU residency; JSON export scriptable; migration downtime ≤24h. No offline. One-way mirror; UI edits invisible to PLAN.json.

### Trello
- Simplest REST (key+token; POST/PUT /1/cards). Free: unlimited cards, **10 boards**, 250 Butler runs/mo, 10MB/file. Rate limits: **300 req/10s per key, 100 req/10s per token**. **US-only residency; worst export story** (1,000 most recent actions; full export = Premium; lossy, non-reimportable). No desktop offline.

### Linear
- Best DX: GraphQL + official TS SDK; personal API keys. Free: unlimited members, 2 teams, **hard cap 250 non-archived issues** (a genuine ceiling for a phase/cell mirror), API included. Rate limits: 5,000 req/hr + 3M complexity points/hr. Metadata + API keys always US-stored. **Local-first sync engine** — meaningfully better offline than Jira/Trello. Most bidirectional-ready API (webhooks + clean mutations), still one-way today.

### GitHub Projects v2
- **Verified live in this environment:** `gh project` subcommands exist (field-create TEXT/SINGLE_SELECT/DATE/NUMBER, item-create, item-edit, item-add, item-list --format json). Caveat found live: default gh token lacks `project` scopes — needs one-time `gh auth refresh -s project,read:project`.
- Free on all plans; item cap 1,200 → **50,000/project** (changelog 2025-02-26). Rate limits verified live: core 5,000/hr, GraphQL 5,000/hr.
- Lowest lock-in of the four (same vendor as the repos; full JSON dump via CLI). Board state is server-side, NOT in the repo. `projects_v2_item` webhooks carry before/after values — strongest future-bidirectional foundation, nothing out of the box.

## Final comparison table

| Candidate | Standing infra | Sync-drift risk | Sync effort | Solo daily friction | Health | License |
|---|---|---|---|---|---|---|
| A: custom static render over KDBP | none | **none** (board IS the files) | small one-off generator | open a file | you own it; pattern precedented ×3 | yours |
| A: Backlog.md | none standing | none — but format is ITS, not KDBP's | zero if you adopt its format (= migration) | local server per session | 6,039★, v1.47.1 2026-06 | MIT |
| B: Plane | ~12 containers always-on | high | low-med (REST, 60/min) | heavy | 54k★ very active | AGPL CE / closed comm. |
| B: Taiga | 9 services, ≥1GB | high | medium | heavy | alive, slow; PG 12.3 pin | MPL+AGPL |
| B: Focalboard | — | — | — | — | **unmaintained (own README)** | mixed |
| B: Vikunja | 1 container (SQLite) | high | low (REST+OpenAPI) | light | 4.7k★ v2.3.0 | AGPL-3.0 |
| B: WeKan | app+MongoDB | high | medium (**API incomplete**) | moderate | 21k★ | MIT |
| B: Kanboard | **1 container SQLite** | high but cheap-regen | **low (JSON-RPC incl. moveTaskPosition)** | lightest in B | 9.7k★ decade-stable | MIT |
| B: Gitea/Forgejo | single binary | high + **boards have NO API** (#14299 open since 2021) | low issues / impossible columns | light | both very alive | MIT / GPL3+ |
| C: Jira | $0 (idle-deactivation risk) | moderate | low-med | moderate-high | healthy | SaaS ToS |
| C: Trello | $0 (10 boards) | moderate; worst export | low | low (familiar) | healthy | SaaS ToS |
| C: Linear | $0 to 250-issue cap | moderate; most bi-di-ready | low (GraphQL SDK) | low (best UX) | healthy | SaaS ToS |
| C: GitHub Projects v2 | $0 (bundled) | low-mod (regenerable, webhooks) | low-med (gh CLI verified; scope grant) | moderate | very healthy (50k items) | SaaS ToS |

## Strongest per family
- **A:** a small custom static renderer over PLAN.json/PENDING.md — the only option in ANY family with literally zero sync-drift (the board IS the files). Backlog.md is the standout existing tool but adopting it = adopting its format (forbidden double bookkeeping).
- **B:** **Kanboard** — verified 1-container SQLite, MIT, decade-stable, only API in the family where board position is scriptable (fully regenerable mirror). Gitea/Forgejo more strategic IF consolidating git hosting, but the no-board-API gap disqualifies it for sync-from-files. Focalboard out; Plane unreasonable for one user.
- **C:** **GitHub Projects v2** — free, co-located with the repos, gh CLI scriptability verified live (not assumed); frictions = one-time scope grant + plainer UX; lowest lock-in (no new vendor).
