#!/usr/bin/env python3
"""Regenerate the shell-preview: every station skeleton from templates/center/shell/ filled
with gastify-baseline ILLUSTRATIVE content (sweep numbers real, rows illustrative; banner-noted)
so the shipped templates can be inspected visually. Run from anywhere: python3 generate.py"""
import shutil
from pathlib import Path

OUT = Path(__file__).resolve().parent
REPO = OUT.parents[3]
T = REPO / 'templates/center/shell'

(OUT / 'assets').mkdir(exist_ok=True)
for asset in ('a3.css', 'slots.js', 'a3-settings.js', 'a3-lightbox.js'):
    shutil.copy(T / f'assets/{asset}', OUT / f'assets/{asset}')

IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>'
BOX = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>'
EXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'

ENTITIES = [('Transactions', 126), ('Scan / Receipt', 395), ('Statements', 126), ('Card aliases', 18),
            ('Groups & sharing', 132), ('Consent & privacy', 66), ('Analytics drill-down', 100)]

def kpi(lab, val, sub):
    return f'<div class="kpi"><div class="lab">{IC} {lab}</div><div class="val">{val}</div><div class="sub">{sub}</div></div>'
def tbl(headers, rows):
    h = ''.join(f'<th>{x}</th>' for x in headers)
    b = ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>' for r in rows)
    return f'<div class="panel"><table class="tbl"><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table></div>'
def panel(title, body):
    return f'<div class="panel" style="padding:14px 16px;margin-bottom:12px"><b>{title}</b><p style="margin:4px 0 0;font-size:.82rem;color:var(--ink-2)">{body}</p></div>'

NOTE = '<div class="panel" style="padding:10px 14px;margin-bottom:14px"><b>Illustrative preview</b> — the shipped skeleton filled by hand (gastify baseline; sweep numbers real, rows illustrative). Real pages are generator-emitted.</div>'

def common(on_entity=None):
    ents = ''.join(
        f'<a class="navitem{" on" if n == on_entity else ""}" href="feature.html">{BOX} {n} <span class="count">{c}</span></a>'
        for n, c in ENTITIES)
    return {'LANG': 'en', 'PROJECT_NAME': 'Gastify', 'REGEN_STAMP': '2026-07-17 (preview)',
        'HEAD_SHA': '44a3ecd', 'GENERATOR_NAME': 'preview-fill',
        'STATUS_PILLS': '<span class="statuspill warn"><span class="dot"></span> preview</span>',
        'SYNC_AGE': 'preview', 'ENTITY_COUNT': '7', 'TESTS_COUNT': '1,585',
        'SIDEBAR_ENTITIES': ents,
        'SIDEBAR_TESTS_SUB': ('<div class="navsub"><a href="tests.html#tab-tests">Matrix</a>'
            '<a href="tests.html#tab-evidence">Walks · shelf</a><a href="tests.html#tab-risk">Gates</a></div>'),
        'SIDEBAR_LEAF': (f'<a class="navitem" href="#">{EXT} htmlcov</a>'
                         f'<a class="navitem" href="#">{EXT} playwright report</a>')}

def fill(name, subs, on_entity=None):
    t = (T / name).read_text()
    for k, v in {**common(on_entity), **subs}.items():
        t = t.replace('{{' + k + '}}', v)
    (OUT / name).write_text(t)
    assert '{{' not in t, f'unfilled slot in {name}: ' + t[t.find('{{'):t.find('{{') + 40]

fill('index.html', {
 'HUB_TITLE': 'The ledger, mission-controlled',
 'HUB_LEDE': 'What shipped, how it was verified, where the proof lives. The sidebar picks a subject; four tabs re-lens it.',
 'HUB_HEADLINE_STATS': '<div class="kpis">' + kpi('Automated checks', '1,585', '1,070 backend · 515 web+e2e')
    + kpi('C-id coverage', '98.3%', '27 unstamped, named') + kpi('Waiting on you', '4', '2 reviews · 1 push · 1 walk') + '</div>',
 'RECENT_CHANGES': NOTE + panel('The sweep (1,585 C-ids)', '5dbd928 · corpus became a registry — from git + LEDGER.')
    + panel('Red column adopted', 'd2309ef · ⬜ seeded on 16/17/26/27; router → /gabe-red 16.'),
 'NEEDS_YOU': panel('DF5 red checkpoint', 'awaiting your walk · 2d')
    + panel('Never walked', 'deploy-rollback — renders red until a human walks it.'),
 'TAB_TESTS': panel('Tests lens', 'Corpus buckets + link to the Tests station.'),
 'TAB_EVIDENCE': panel('Evidence lens', 'Latest proof sets + digests.'),
 'TAB_RISK': panel('Risk lens', 'Open findings, deferred debt, gate states.')})

fill('feature.html', {
 'SUBJECT_TITLE': 'Card aliases',
 'SUBJECT_LEDE': 'Learned payment methods + the Efectivo system alias — the money-destruction guard rails (B3/B7) live here.',
 'SUBJECT_HEADLINE_STATS': '<div class="kpis">' + kpi('Tests', '10', 'test_card_aliases.py, all C-id’d')
    + kpi('Ever-red', '—', 'backfilled; none observed yet') + kpi('Migrations', '049 · 050', 'cash unique guard') + '</div>',
 'TAB_OVERVIEW': NOTE + panel('The story', 'Aliases are learned from statements; Efectivo is a SYSTEM alias (D119) excluded from dedup.'),
 'TAB_CODE': panel('Endpoints (from archmap.json — the read-once code map)',
    'GET /api/card-aliases · POST /api/card-aliases · DELETE /api/card-aliases/{id} (Efectivo guarded, 409) — decorators, docstrings, response models read by ast once per build.')
    + panel('Data model', 'CardAlias: id · user_id (FK users.id) · display_name · is_system — relationships rendered APART from columns, backing FK named.')
    + panel('Code map', 'api/card_aliases.py 214 lines · services/alias_dedup.py 388 · migrations 049/050 — 800-line heat green.'),
 'TAB_TESTS': tbl(['C-id', 'test', 'status'], [['<b>C201</b>', 'create alias from statement', 'pass'],
    ['<b>C202</b>', 'Efectivo reserved name 409', 'pass'], ['<b>C203</b>', 'dedup orphan guard (B1)', 'pass']]),
 'TAB_EVIDENCE': panel('Proof', 'gs6-chooser-card-pill e2e 3/3 · settings.cards unit shots.'),
 'TAB_RISK': panel('Findings history', 'B3 IntegrityError honesty + B7 race guard — resolved #66/#67; P155 prod 0 orphans.')},
 on_entity='Card aliases')

fill('tests.html', {
 'TESTS_TITLE': 'The test estate',
 'TESTS_LEDE': 'Every number names its source; an empty ever-red is history, not shame.',
 'TESTS_KPIS': kpi('Corpus', '1,585', 'junit ×3, digested') + kpi('C-id’d', '98.3%', '27 backtick residue')
    + kpi('Ever-red', '1', 'C1592 · red@95849f2') + kpi('Never walked', '1', 'deploy-rollback'),
 'BUCKETS': tbl(['Corpus', 'Tests', 'Junit', 'Fresh'], [['backend · pytest', '1,070', 'api-junit.xml', 'T−0d'],
    ['web · vitest', '344', 'web-junit.xml', 'T−0d'], ['e2e · playwright', '171', 'e2e-junit.xml', 'T−2d']]),
 'VERIFICATION_CHANGELOG': panel('Commits that reshaped the corpus', '5dbd928 sweep C1–C1585 · 7a449ab blame-ignore · d2309ef Red column — from git.'),
 'MATRIX': NOTE + tbl(['C-id', 'test', 'corpus', 'status', 'ever-red?', 'last run'],
    [['<b>C38</b>', 'invite deep-link survives redirect', 'api', 'pass', 'RED seen · red@c6dd185', '07-17 09:41'],
     ['<b>C187</b>', 'list consents empty (async)', 'api', 'pass', '— backfilled', '07-17 09:41'],
     ['<b>C926</b>', 'SharedGroupsCard owner chip', 'web', 'fail', '— backfilled', '07-17 09:43'],
     ['—', 'it(`shows ${count} scans`)', 'web', 'no id — unstamped', 'n/a', '07-17 09:43']]),
 'MANUAL_ANGLES': panel('walks.jsonl', 'walked: gs1-detail-share · pass · 07-15 · khujta — NEVER walked: deploy-rollback (renders red until a human walks it).'),
 'DEMO_SHELF': panel('Curated sets', 'ca10-destructive-guards (6 shots) · p134-consent (manifest) — from tests/web-e2e/proof/.'),
 'GATES': panel('Gates', 'crawl gate 0 dead links · token-classes green · quarantine empty · web digest ⤫ skipped(no reporter) until flags land.')})

fill('board.html', {
 'BOARD_TITLE': 'The board',
 'BOARD_LEDE': 'The lifecycle rail from PLAN.json — glyphs are the machine truth; debts are named, never nagged.',
 'BOARD_KPIS': kpi('Phases', '43 / 47', 'done incl. GS suite') + kpi('Current', '16 · DF5', 'next: /gabe-red 16')
    + kpi('Owed cells', '15', '13 Center · 2 Review'),
 'RAIL': NOTE + tbl(['#', 'Phase', 'Red', 'Exec', 'Review', 'Commit', 'Push', 'Center'],
    [['15', '<b>DF4 · notifications</b>', '—', '✅', '⬜', '✅', '✅', '⬜'],
     ['16', '<b>DF5 · SSE families</b>', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜'],
     ['37', '<b>GS1 · detail share</b>', '—', '✅', '✅', '✅', '✅', '⬜'],
     ['41', '<b>GS5 · Efectivo</b>', '—', '✅', '✅', '✅', '✅', '⬜'],
     ['42', '<b>P134 · consent</b>', '—', '✅', '✅', '✅', '✅', '⬜']]),
 'REVIEW_DEBT_LANE': panel('Open, non-blocking', 'P147 · P149 · P150 — from PENDING.md with ages.'),
 'NONPHASE_LANE': panel('Outside phases', 'GS6 chooser cards (LEDGER-only, PR #63) — from git.'),
 'BACKLOG': panel('Queued', '17 · DF6 overlays — 26 · CA7 — 27 · CA8, plus the SCOPE arc remainder.')})

fill('entity-index.html', {
 'ENTITIES_TITLE': 'Entities',
 'ENTITIES_LEDE': 'The durable nouns — each links to its subject page; coverage states from adoption.json.',
 'ENTITIES_KPIS': kpi('Entities', '7', 'baseline approved') + kpi('Covered', '0/7', 'adoption starting')
    + kpi('Parked', '4', 'notif · auth · billing · ref'),
 'ENTITY_GRID': NOTE + ''.join(panel(n, f'{d} <span class="echips"><span class="echip">{c}</span></span>') for n, d, c in [
    ('Transactions', 'The T1 ledger spine — 113 web C-ids, churn 21.', '6 cards to reorganize'),
    ('Scan / Receipt', 'The acquisition funnel — 353 api C-ids.', '3 cards adequate'),
    ('Statements', '117 api C-ids, zero dedicated cards — the biggest gap.', 'NEW section'),
    ('Card aliases', 'GS5 money-destruction guard rails.', 'NEW section'),
    ('Groups & sharing', '90-day window, locks — well tested.', '2-3 cards, index'),
    ('Consent & privacy', 'Ley 21.719 — register + erasure uncarded.', 'extend ce card'),
    ('Analytics drill-down', 'Sankey · treemap · L1→L4 · drill to items.', 'NEW nav-story card')])})

fill('docs.html', {
 'DOCS_TITLE': 'Docs',
 'DOCS_LEDE': 'The feature-doc accumulator plus the human-owned foundations.',
 'DOCS_KPIS': kpi('Cards', '0', 'clean slate — re-ingestion pending') + kpi('Foundations', '4', 'SCOPE · DECISIONS · RULES · BEHAVIOR'),
 'FEATURE_DOCS': NOTE + panel('Empty by design', 'Post clean-slate init — cards re-enter one section at a time via /gabe-adopt.'),
 'FOUNDATIONS': panel('The four anchors', 'SCOPE.md (premise + arc) · DECISIONS.md (D1–D121) · RULES.md · BEHAVIOR.md (verify commands) — authored, linked out.')})

fill('ledger.html', {
 'CHANGE_TITLE': 'The C-id sweep',
 'CHANGE_LEDE': '1,585 tests received permanent identities; names only, counts preserved — the corpus became a registry.',
 'CHANGE_KPIS': kpi('Files', '221', '+1,585 / −1,585') + kpi('Phases touched', '0', 'mechanical') + kpi('Cells flipped', '0', '—'),
 'CHANGE_COMMITS': NOTE + tbl(['sha', 'commit'], [['<span style="font:var(--mono)">5dbd928</span>', '<b>test: C-id backfill sweep — 1585 stamped</b>'],
    ['<span style="font:var(--mono)">7a449ab</span>', 'chore(git): blame-ignore registration']]),
 'CHANGE_CELLS': panel('PLAN cells flipped', 'None — the sweep is identity work, not lifecycle work.'),
 'CHANGE_VERIFY': panel('Verified by', 'Counts before==after · idempotent re-run 0 · py_compile clean · guard rc=0.')})

fill('releases.html', {
 'RELEASES_TITLE': 'Releases',
 'RELEASES_LEDE': 'The stakeholder showcase — covered features since each terminal-env ship.',
 'RELEASES_KPIS': kpi('Releases', '—', 'none since adoption') + kpi('Candidates', 'GS suite', '13 phases Center-pending'),
 'LATEST_RELEASE': NOTE + panel('Next release (preview)', 'GS1–GS6 + P134 + DF3 become the first post-adoption showcase once their sections land.'),
 'RELEASE_INDEX': tbl(['date', 'env', 'features'], [['—', '—', 'no releases recorded yet — honest empty']])})

print('preview regenerated:', sorted(p.name for p in OUT.glob('*.html')))
