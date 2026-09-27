/* probe-all-endpoints.mjs — the all-endpoints page's render proof (headless system Chrome via the spike's playwright-core).

     node docs/design/workflow-panel/probe-all-endpoints.mjs [--page FILE] [--forms FILE] [--archmap FILE] [--scratch DIR] [--shots DIR] [--gen FILE]

   WHERE EACH EXPECTED VALUE COMES FROM. The page's generator reads the lab's facts and, for four readings, the feed. This probe
   does NOT reuse that route where it can avoid it: every column the forms feed decides (the endings, their stages, guards,
   login, rate, the JSON body's fields, the reply's fields where the contract names them, tests, proof, forks, catches, fate,
   data functions, switches, rules, in-flight values, alarms) is recomputed for ALL rows straight from forms.json — the raw
   endpoint record, its paths' effect buckets and the feed's steps — never from the lab's record. The columns only the MAP
   decides (tables, the map's written tables, screens, reason sites, steps, deciders, functions behind, pieces) are read from
   the lab's facts for a sample (gen-endpoint-facts.py run here, into --scratch, never over _lab-ep.js).
   What is compared: a cell's sort key (data-v), and for a composite cell its drawn parts — every stage box, every fate and
   pieces segment (its share of the bar and its colour), every alarm dot (its family and whether it is lit). Group rows are
   recomputed from the rows' members; category cells are measured for being cut; the header is measured on screen while the
   page and the board both scroll. An absent arm is proven on a FIXTURE page built from a scratch copy of the feed with two
   arms switched off. Exit 1 on any failure; SKIP loudly (exit 0) when chrome or playwright-core is missing. Browser-gated: run it ALONE. */
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname), REPO = path.resolve(HERE, '../../..');
const args = process.argv.slice(2), opt = (k, d) => (args.indexOf(k) >= 0 ? args[args.indexOf(k) + 1] : d);
const home = (p) => p.replace(/^~/, os.homedir());
const PAGE = path.resolve(opt('--page', path.join(HERE, 'all-endpoints.html')));
const FORMS = home(opt('--forms', '~/.cache/gabe-map-baselines/lab-input/forms.json'));
const ARCHMAP = home(opt('--archmap', path.join(path.dirname(FORMS), 'archmap.json')));
const SCRATCH = path.resolve(opt('--scratch', path.join(os.tmpdir(), 'allep-probe'))), shotsAt = opt('--shots', null);
const GEN = path.resolve(opt('--gen', path.join(HERE, 'gen-all-endpoints.py')));        /* the generator the fixture is built with (a mutant passes its copy) */
const PW = path.join(REPO, 'docs/design/graft-adoption/spike/_build/node_modules/playwright-core'), CHROME = '/usr/bin/google-chrome-stable';
if (!fs.existsSync(CHROME) || !fs.existsSync(PW)) { console.log('SKIP ⚠ — no system chrome / playwright-core on this host (RENDER COVERAGE DID NOT RUN)'); process.exit(0); }
fs.mkdirSync(SCRATCH, { recursive: true }); if (shotsAt) fs.mkdirSync(shotsAt, { recursive: true });
const { chromium } = require(PW);
let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) pass++; else { fail++; console.log('  FAIL: ' + m + (extra !== undefined ? ' — ' + JSON.stringify(extra).slice(0, 300) : '')); } };

/* ── what the feed holds, read here ── */
const FJ = JSON.parse(fs.readFileSync(FORMS, 'utf8'));
const FEED = Object.keys(FJ.endpoints || {}).map((k) => k.replace(/^endpoint:/, '')).sort();
const labSha = () => (fs.existsSync(path.join(HERE, '_lab-ep.js')) ? execFileSync('sha1sum', [path.join(HERE, '_lab-ep.js')]).toString().split(' ')[0] : null);
const LAB0 = labSha();

/* ── the lab's facts for a sample, and this probe's OWN reading of every column from them ── */
const facts = (ep) => { const out = path.join(SCRATCH, 'facts-' + ep.replace(/[^A-Za-z0-9]+/g, '_') + '.js');
  execFileSync('python3', [path.join(HERE, 'gen-endpoint-facts.py'), ep, '--forms', FORMS, '--archmap', ARCHMAP, '--out', out], { cwd: HERE, stdio: 'pipe' });
  const s = fs.readFileSync(out, 'utf8'), i = s.indexOf('window.LABEP = ') + 'window.LABEP = '.length; return JSON.parse(s.slice(i).replace(/;\s*$/, '')); };
const WR = new Set(['add', 'update', 'delete', 'insert', 'upsert', 'merge', 'bulk_insert', 'execute', 'write']);
const LEAVE = { middleware: 'EDGE', security: 'GATE', dependency: 'GATE', 'body-parse': 'INPUT', validation: 'INPUT', handler: 'HANDLER', uncaught: 'UNCAUGHT' };
const FATES = ['saved', 'maybe', 'rolled', 'unsaved', 'after', 'none'];
const STEPS = FJ.steps || {}, SCHEMAS = FJ.schemas || {}, PROC = (FJ.inflight || {}).process || {};
const sureConf = (t) => !String(t.conf || '').startsWith('ambiguous');
/* the feed's own endings of one endpoint: its produced rows, its framework rows, its returns that carry a status */
function feedExits(ep) {
  const d = new Map();
  (ep.produced || []).forEach((x) => d.set(x.id, ['produced', x])); (ep.framework_exits || []).forEach((x) => d.set(x.id, ['framework', x]));
  (ep.returns || []).forEach((x) => { if (x.status != null) d.set(x.id, ['return', x]); });
  return [...d.values()].map(([row, x]) => ({ x, kind: row === 'return' ? 'success' : row === 'framework' ? 'framework' : x.phase === 'uncaught' ? 'uncaught' : x.phase === 'validation' ? 'validation' : 'refusal' }));
}
/* the JSON body: read at all (body-parse endings), and the top schema the validation ending names (the one no other names) */
function feedBody(ep) {
  if (!(ep.framework_exits || []).some((x) => x.phase === 'body-parse')) return 0;
  const listed = [...new Set((ep.produced || []).filter((x) => x.phase === 'validation').flatMap((x) => x.schemas || []))].filter((s) => SCHEMAS[s]);
  const cls = (s) => SCHEMAS[s].cls || s.split(':').pop();
  const top = listed.filter((t) => !listed.some((s) => s !== t && (SCHEMAS[s].fields || []).some((f) => new RegExp('\\b' + cls(t) + '\\b').test(String(f.annotation || '')))));
  return top.length === 1 && !SCHEMAS[top[0]].variants ? (SCHEMAS[top[0]].fields || []).length : 'unknown';
}
/* one path's fate, from the feed's buckets: the endpoint's own writes before the answer, then its writes after it */
function feedFate(p) {
  const e = p.effects || {}, bk = (sid) => ['committed', 'maybe_committed', 'rolled_back', 'uncommitted'].find((b) => (e[b] || []).includes(sid));
  const own = (e.steps || []).filter((s) => !s.dependency && WR.has((STEPS[s.step] || {}).op)).map((s) => bk(s.step));
  const after = (e.after_response || []).filter((s) => !s.dependency && WR.has((STEPS[s.step] || {}).op));
  return own.includes('committed') ? 'saved' : own.includes('maybe_committed') ? 'maybe' : own.includes('rolled_back') ? 'rolled' : own.includes('uncommitted') ? 'unsaved' : after.length ? 'after' : 'none';
}
function fromFeed(key, W) {                        /* column id → the drawn key, for every column the forms feed decides */
  const ep = FJ.endpoints[key], X = feedExits(ep), e = {}, kinds = {}, st = {};
  X.forEach(({ kind }) => { kinds[kind] = (kinds[kind] || 0) + 1; });
  ['success', 'refusal', 'framework', 'validation', 'uncaught'].forEach((k) => { e['e_' + k] = kinds[k] || 0; });
  e.all = X.length;
  X.forEach(({ x, kind }) => { const s = kind === 'success' ? 'ANSWER' : LEAVE[x.phase]; st[s] = (st[s] || 0) + 1; });
  e.stage = Object.keys(st).length;
  e.guards = (ep.preconditions || []).length;
  const au = ep.auth || {}; e.auth = [...new Set((au.schemes || []).map((s) => String(s.scheme)))].sort().join('+') || ((au.gates || []).length ? W.authNoScheme : 'none');
  e.rate = [...new Set(((ep.rate || {}).limits || []).map((l) => String(l.limiter || l.class || '?').replace(/^_+/, '')))].sort().join('+') || 'none';
  e.request = feedBody(ep);
  const named = Object.entries(ep.responses || {}).filter(([k, r]) => k.startsWith('r:') && r.fields != null);
  if (named.length) e.response = new Set(named.flatMap(([, r]) => r.fields)).size;
  e.acts = (ep.tests || {}).act || 0;
  e.asserted = X.reduce((n, { x }) => n + (x.tests || []).filter((t) => String(t.conf || '').includes('+')).length, 0);
  const sure = X.filter(({ x }) => (x.tests || []).some(sureConf)).length;
  e.proof = X.length ? Math.round(10000 * sure / X.length) / 10000 : 0; e.proofText = sure + '/' + X.length;
  e.branches = (ep.branches || []).length; e.catches = ((ep.failure || {}).catches || []).length; e.switches = (ep.switches || []).length;
  const fate = Object.fromEntries(FATES.map((f) => [f, 0])), fns = new Set(), own = new Set(), dep = new Set();
  (ep.paths || []).forEach((p) => { fate[feedFate(p)]++;
    ((p.effects || {}).steps || []).forEach((s) => { const r = STEPS[s.step] || {}; if (!s.dependency && r.fn) fns.add(r.fn);
      if (WR.has(r.op) && r.table) (s.dependency ? dep : own).add(r.table); });
    ((p.effects || {}).after_response || []).forEach((s) => { const r = STEPS[s.step] || {}; if (!s.dependency && WR.has(r.op) && r.table) own.add(r.table); }); });
  e.fate = fate.saved; e.fateParts = fate; e.datafns = fns.size;
  e.ownWrites = own; e.gateOnly = new Set([...dep].filter((t) => !own.has(t)));
  e.cases422 = X.reduce((n, { x }) => n + (x.cases || []).filter((c) => c && typeof c === 'object').length, 0);
  const dies = {}; (ep.inflight || []).forEach((ir) => { const r = ir.ref && PROC[ir.ref] ? { ...PROC[ir.ref], ...ir } : ir; dies[r.dies] = (dies[r.dies] || 0) + 1; });
  e.inf_answer = dies['with the answer'] || 0; e.inf_server = dies['with the server process'] || 0;
  e.alarmIds = [...new Set([...(ep.findings || []).map((f) => f.id), ...Object.values(ep.arm_findings || {}).flat().map((f) => f.id),
    ...(((FJ.arm_findings || {}).frontend || []).filter((f) => f.endpoint === key).map((f) => f.id))])].sort();
  e.alarms = e.alarmIds.length;
  return { e, st };
}
function fromLab(L) {                              /* column id → the drawn key, for the columns only the map decides */
  const F = L.forms, e = {};
  e.tables = L.data.tables.length; e.tableNames = L.data.tables.map((t) => t.table).sort();
  e.mapWritten = L.data.tables.filter((t) => t.rw !== 'r').map((t) => t.table);
  e.deciders = ((F.inside || {}).functions || []).filter((f) => (f.refusals || []).length || (f.raises || []).some((r) => (r.here || []).length)).length;
  e.fetched = L.widening.fetched_by.length; e.reasons = (F.frontend.reason_sites || []).length;
  e.chain = Math.max(0, ...F.paths.map((p) => p.chain.length));
  e.behind = L.functions.behind.fns || 0;
  const pw = L.feedwide.pieces.rows; e.pieces = pw.filter((r) => r.word === 'rare' || r.word === 'only here').length; e.lacks = L.feedwide.pieces.missing_norms.length;
  e.pieceParts = {}; pw.forEach((r) => { e.pieceParts[r.word] = (e.pieceParts[r.word] || 0) + 1; });
  const resp = L.data.schemas.response; e.labResponse = resp.present ? (resp.cols || []).length + (resp.cols_more || 0) : resp.name ? 'unknown' : 0;
  return e;
}

const b = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--no-sandbox', '--disable-gpu-sandbox', '--disable-dev-shm-usage'] });
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage(), errs = [];
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const open = async (file) => { await p.goto('file://' + file); await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 20000 });
  await p.evaluate(() => { try { for (const k of Object.keys(localStorage)) if (/^gabe:allep/.test(k)) localStorage.removeItem(k); } catch (e) {} });
  await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 20000 }); };
const pick = async (rail, v) => { await p.click(`.opt[data-rail="${rail}"][data-v="${v}"]`); await p.waitForTimeout(40); };
const drawn = () => p.evaluate(() => [...document.querySelectorAll('#board tr.row[data-ep], #board .card[data-ep]')].map((e) => e.getAttribute('data-ep')));
const heads = () => p.evaluate(() => [...document.querySelectorAll('#board [data-group]')].map((e) => ({ g: e.getAttribute('data-group'), t: e.textContent })));

await open(PAGE);
const D = await p.evaluate(() => window.__allep.data);
const shot = async (n) => { if (shotsAt) await p.screenshot({ path: path.join(shotsAt, n + '.png') }); };

/* 1 · the rows are the feed's endpoints, each once */
{ const ids = await drawn();
  ok(ids.length === FEED.length, 'the table draws one row per endpoint the feed holds', { drawn: ids.length, feed: FEED.length });
  ok(JSON.stringify([...ids].sort()) === JSON.stringify(FEED), 'the rows drawn are exactly the feed\'s endpoints');
  ok(D.tok.nFeed === FEED.length && D.rows.length === FEED.length, 'the page data carries the feed\'s endpoint count'); }

/* 2 · every layout × grouping draws every endpoint exactly once, in the groups the row records call for */
const keyOf = (r, grp) => grp === 'entity' ? (r.ent || '—') : grp === 'seg' ? r.seg : grp === 'method' ? r.m
  : grp === 'labels' ? [...r.labels].sort().join('|') : grp === 'counts' ? ['success', 'refusal', 'framework', 'validation', 'uncaught'].map((k) => r.v['e_' + k]).join('|') : '';
for (const lay of ['rows', 'two', 'three']) {
  await pick('lay', lay);
  for (const grp of ['entity', 'seg', 'method', 'labels', 'counts', 'flat']) {
    await pick('grp', grp);
    for (const alone of grp === 'flat' ? ['gather'] : ['gather', 'own']) {
      if (grp !== 'flat') await pick('alone', alone);
      const ids = await drawn(), tag = lay + ' · ' + grp + ' · ' + alone;
      const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
      ok(ids.length === FEED.length && !dup.length && new Set(ids).size === FEED.length, 'every endpoint drawn exactly once · ' + tag, { n: ids.length, dup: dup.slice(0, 3) });
      if (grp === 'flat') continue;
      const want = {}; D.rows.forEach((r) => { const k = keyOf(r, grp); want[k] = (want[k] || 0) + 1; });
      const nGroups = Object.keys(want).length, nAlone = Object.values(want).filter((n) => n === 1).length;
      const hs = await heads(), expectHeads = alone === 'own' ? nGroups : nGroups - nAlone + (nAlone ? 1 : 0);
      ok(hs.length === expectHeads, 'the group headers drawn are the groups the row records call for · ' + tag, { drawn: hs.length, expect: expectHeads });
      /* the members under each header share one key (a gathered header holds only groups of a single endpoint) */
      const members = await p.evaluate(() => { const out = []; let cur = null;
        document.querySelectorAll('#board [data-group], #board tr.row[data-ep], #board .card[data-ep]').forEach((e) => {
          if (e.hasAttribute('data-group')) { cur = { g: e.getAttribute('data-group'), ids: [] }; out.push(cur); } else if (cur) cur.ids.push(e.getAttribute('data-ep')); }); return out; });
      const R = Object.fromEntries(D.rows.map((r) => [r.id, r]));
      const bad = members.filter((m) => m.g === '_alone' ? m.ids.some((id) => want[keyOf(R[id], grp)] !== 1) : new Set(m.ids.map((id) => keyOf(R[id], grp))).size !== 1);
      ok(!bad.length, 'every group holds endpoints of one key · ' + tag, bad.slice(0, 2));
    }
  }
}
await pick('lay', 'rows'); await pick('grp', 'entity'); await pick('alone', 'gather');

/* 3 · every header strip sums to the row count, and each piece counts the drawn cells in its bin */
{ const strips = await p.evaluate(() => [...document.querySelectorAll('#board thead th[data-col]')].map((h) => ({ col: h.getAttribute('data-col'),
    segs: [...h.querySelectorAll('.sg')].map((s) => ({ bin: s.getAttribute('data-bin'), n: +s.getAttribute('data-n') })),
    cells: [...document.querySelectorAll('#board tr.row [data-col="' + h.getAttribute('data-col') + '"]')].map((c) => c.getAttribute('data-v')) })));
  ok(strips.length === D.cols.length, 'every column wears a header strip', { strips: strips.length, cols: D.cols.length });
  const inBin = (v, bin) => bin === 'absent' || bin === 'unknown' ? v === bin : bin.startsWith('c:') ? v === bin.slice(2) : (() => { const [, lo, hi] = bin.split(':'); return v !== 'absent' && v !== 'unknown' && +v >= +lo && +v <= +hi; })();
  for (const s of strips) {
    const sum = s.segs.reduce((a, x) => a + x.n, 0);
    ok(sum === FEED.length, 'the strip of ' + s.col + ' sums to the row count', { sum });
    const miss = s.segs.filter((g) => s.cells.filter((v) => inBin(v, g.bin)).length !== g.n);
    ok(!miss.length, 'each piece of the ' + s.col + ' strip counts the drawn cells in its bin', miss.slice(0, 2));
    ok(s.cells.every((v) => s.segs.some((g) => inBin(v, g.bin))), 'every drawn ' + s.col + ' cell falls in a piece of its strip'); } }

/* 4 · EVERY row, every column the forms feed decides, recomputed from forms.json; the drawn parts of the composite cells */
const readRow = (id) => p.evaluate((id) => { const tr = document.querySelector('#board tr.row[data-ep="' + CSS.escape(id) + '"]'); const o = {};
  const bgOf = (css) => { const q = document.createElement('i'); q.style.background = css; document.body.appendChild(q); const c = getComputedStyle(q).backgroundColor; q.remove(); return c; };
  tr.querySelectorAll('[data-col]').forEach((c) => { o[c.getAttribute('data-col')] = { v: c.getAttribute('data-v'), t: c.textContent,
    spine: [...c.querySelectorAll('[data-stage]')].map((i) => [i.getAttribute('data-stage'), +i.getAttribute('data-n')]),
    segs: [...c.querySelectorAll('.sb i')].map((i) => ({ s: i.getAttribute('data-s'), w: parseFloat(i.style.width), bg: getComputedStyle(i).backgroundColor,
      want: bgOf(c.getAttribute('data-col') === 'fate' ? 'var(--f-' + i.getAttribute('data-s') + ')' : 'var(--p-' + ({ 'the norm': 'norm', common: 'common', rare: 'rare', 'only here': 'only' })[i.getAttribute('data-s')] + ')') })),
    dots: [...c.querySelectorAll('.dots i')].map((i) => [i.getAttribute('data-f'), i.classList.contains('on')]) }; }); return o; }, id);
const WDS = D.words, D_UNKNOWN_WORD = D.words.unknown, ROW = Object.fromEntries(D.rows.map((r) => [r.id, r]));
/* the alarm families' fixed places, recomputed: most frequent across the feed first, ties by name */
{ const fam = {}; FEED.forEach((ep) => fromFeed('endpoint:' + ep, WDS).e.alarmIds.forEach((f) => { fam[f] = (fam[f] || 0) + 1; }));
  const want = Object.keys(fam).sort((a, b) => fam[b] - fam[a] || (a < b ? -1 : 1));
  ok(JSON.stringify(D.families) === JSON.stringify(want), 'the alarm dots stand in the order of how often the feed raises each family', { page: D.families, feed: want }); }
const FEEDCOLS = ['all', 'e_success', 'e_refusal', 'e_framework', 'e_validation', 'e_uncaught', 'stage', 'guards', 'auth', 'rate', 'request', 'response', 'acts', 'asserted',
  'proof', 'branches', 'catches', 'switches', 'fate', 'datafns', 'cases422', 'inf_answer', 'inf_server', 'alarms'];
const miss4 = {};
for (const ep of FEED) {
  const { e, st } = fromFeed('endpoint:' + ep, WDS), got = await readRow(ep), bad = (c, x) => { (miss4[c] = miss4[c] || []).push([ep, x]); };
  for (const c of FEEDCOLS) {
    if (!(c in e)) continue;                                                        /* a reply the contract names no fields for: the sample reads it */
    const g = got[c]; if (!g) { bad(c, 'no cell'); continue; }
    const want = e[c], same = typeof want === 'number' ? g.v !== 'absent' && g.v !== 'unknown' && Math.abs(+g.v - want) < 1e-9 : g.v === String(want);
    if (!same) bad(c, { drawn: g.v, feed: want });
  }
  if (got.proof.t !== e.proofText) bad('proof-text', { drawn: got.proof.t, feed: e.proofText });
  const spine = Object.fromEntries(got.stage.spine);
  if (!(Object.keys(st).every((s) => spine[s] === st[s]) && Object.entries(spine).every(([s, n]) => (st[s] || 0) === n))) bad('stage-boxes', { drawn: spine, feed: st });
  const tot = Object.values(e.fateParts).reduce((a, b) => a + b, 0), fsegs = got.fate.segs;
  const wantF = FATES.filter((f) => e.fateParts[f]);
  if (JSON.stringify(fsegs.map((x) => x.s)) !== JSON.stringify(wantF) || fsegs.some((x) => Math.abs(x.w - 100 * e.fateParts[x.s] / tot) > 0.01)) bad('fate-segments', { drawn: fsegs.map((x) => [x.s, x.w]), feed: e.fateParts });
  if (fsegs.some((x) => x.bg !== x.want)) bad('fate-colour', fsegs.map((x) => [x.s, x.bg, x.want]));
  const lit = got.alarms.dots.filter((d) => d[1]).map((d) => d[0]).sort();
  if (JSON.stringify(got.alarms.dots.map((d) => d[0])) !== JSON.stringify(D.families) || JSON.stringify(lit) !== JSON.stringify(e.alarmIds)) bad('alarm-dots', { lit, feed: e.alarmIds });
  const wr = new Set(ROW[ep].u.written || []);
  if ([...e.gateOnly].some((t) => wr.has(t)) || [...e.ownWrites].some((t) => !wr.has(t)) || +got.written.v !== wr.size) bad('written', { drawn: [...wr], gateOnly: [...e.gateOnly], own: [...e.ownWrites] });
}
for (const c of [...FEEDCOLS, 'proof-text', 'stage-boxes', 'fate-segments', 'fate-colour', 'alarm-dots', 'written'])
  ok(!miss4[c], 'every row · ' + c + ' drawn as the forms feed says', (miss4[c] || []).slice(0, 3));

/* 4b · a sample: the columns only the map decides, from the lab's own facts */
const SAMPLE = ['POST /setup/complete', 'GET /recipes', 'DELETE /', 'GET /recipe-creation/gustify/stream', 'POST /pantry/items/batch', 'GET /', 'GET /pantry/overview'].filter((x) => FEED.includes(x));
ok(SAMPLE.length >= 6, 'the sample names endpoints the feed holds', SAMPLE);
const blocksRead = new Set(FEEDCOLS.filter((c) => !miss4[c]).map((c) => { const col = D.cols.find((x) => x.id === c); return col.shared ? '_shared' : col.home; }));
for (const ep of SAMPLE) {
  const L = facts(ep), m = fromLab(L), { e } = fromFeed('endpoint:' + ep, WDS), got = await readRow(ep);
  for (const c of ['tables', 'deciders', 'fetched', 'reasons', 'chain', 'behind', 'pieces', 'lacks']) {
    const same = got[c] && Math.abs(+got[c].v - m[c]) < 1e-9; ok(same, ep + ' · ' + c + ' drawn as the lab\'s facts say', { drawn: got[c] && got[c].v, facts: m[c] });
    if (same) { const col = D.cols.find((x) => x.id === c); blocksRead.add(col.shared ? '_shared' : col.home); } }
  ok(JSON.stringify(ROW[ep].u.tables) === JSON.stringify(m.tableNames), ep + ' · the tables a group row counts are the lab\'s tables', { page: ROW[ep].u.tables, facts: m.tableNames });
  const wantW = [...new Set([...m.mapWritten.filter((t) => !e.gateOnly.has(t)), ...e.ownWrites])].sort();
  ok(JSON.stringify(ROW[ep].u.written) === JSON.stringify(wantW), ep + ' · writes are the map\'s written tables less the login check\'s, plus its own', { page: ROW[ep].u.written, want: wantW });
  if (!('response' in e)) { const gv = got.response.v;
    ok(gv === String(m.labResponse), ep + ' · a reply the contract names no fields for: the lab\'s count of its model, unknown when the model is named but unread, zero when none is named', { drawn: gv, lab: m.labResponse }); }
  const pt = Object.values(m.pieceParts).reduce((a, b) => a + b, 0), ps = got.pieces.segs;
  ok(ps.every((x) => Math.abs(x.w - 100 * m.pieceParts[x.s] / pt) < 0.01 && x.bg === x.want) && ps.length === Object.keys(m.pieceParts).length,
    ep + ' · each pieces segment is its word\'s share of the bar, in its word\'s colour', { drawn: ps.map((x) => [x.s, x.w]), facts: m.pieceParts });
}
ok(D.blocks.every((bk) => blocksRead.has(bk.key)) && blocksRead.has('_shared'), 'the sample read at least one column of every block', [...blocksRead]);
ok(labSha() === LAB0, 'the lab\'s own facts file is untouched by the sample');

/* 5 · a zero says why in the words file's own line (D-017: never a reader's reason); unknown is never drawn as a number; the head is said once */
{ const zs = await p.evaluate(() => { const A = window.__allep, W = A.data.words, out = [];
    A.data.rows.forEach((r) => A.data.cols.forEach((c) => { if (c.kind === 'cat' || r.v[c.id] === 'absent') return; const k = r.k[c.id], s = A.cellWords(c, r);
      if (r.v[c.id] === 'unknown') { if (!s.startsWith(W.unknown + ' — ')) out.push([r.id, c.id, s]); return; }
      if (!k && r.why[c.id] !== W.cols[c.id].zero) out.push([r.id, c.id, r.why[c.id]]); })); return out; });
  ok(!zs.length, 'every zero cell\'s hover gives its column\'s reason from the words file, and every unknown cell says unknown', zs.slice(0, 3));
  const unk = await p.evaluate(() => [...document.querySelectorAll('#board tr.row [data-v="unknown"]')].map((c) => c.textContent));
  ok(unk.every((t) => t === D_UNKNOWN_WORD), 'an unknown cell draws the word, never a number', unk.slice(0, 3));
  const z = await p.evaluate(() => { const c = document.querySelector('#board tr.row [data-col="request"][data-v="0"]'); if (!c) return null;
    c.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); return document.getElementById('tip').textContent; });
  ok(z && z.includes(D.words.cols.request.zero), 'a zero cell\'s hover carries its reason on screen', z);
  // CHANGED 2026-09-23 (D-038): the head line sits behind THE ENDPOINTS' toggle — counted with the toggle open
  const txt = await p.evaluate(() => { document.getElementById('itog-board').click(); const t = document.body.innerText; document.getElementById('itog-board').click(); return t; });
  const heads = (txt.match(new RegExp(D.tok.head, 'g')) || []).length;
  ok(heads === 1, 'the page says its head once (behind the toggle)', heads);
  ok(txt.includes(D.tok.app), 'the page names the app'); }

/* 5b · a group row: endings add up, a shared thing is counted once — recomputed from its members for every group */
{ const G = await p.evaluate(() => [...document.querySelectorAll('#board tr.grow')].map((g) => { const ids = []; let n = g.nextElementSibling;
    while (n && n.classList.contains('row')) { ids.push(n.getAttribute('data-ep')); n = n.nextElementSibling; }
    return { g: g.getAttribute('data-group'), ids, agg: Object.fromEntries([...g.querySelectorAll('td[data-col]')].map((td) => [td.getAttribute('data-col'), td.textContent])) }; }));
  const badG = [];
  for (const g of G) for (const c of D.cols) { if (!c.agg) continue;
    const rs = g.ids.map((id) => ROW[id]).filter((r) => r.v[c.id] !== 'absent' && r.v[c.id] !== 'unknown'); if (!rs.length) continue;
    const want = c.agg === 'union' ? new Set(rs.flatMap((r) => r.u[c.id] || [])).size : c.agg === 'ratio' ? rs.reduce((a, r) => a + r.v[c.id][0], 0) + '/' + rs.reduce((a, r) => a + r.v[c.id][1], 0)
      : c.agg === 'count' ? rs.filter((r) => r.v[c.id] && r.v[c.id] !== 'none').length : rs.reduce((a, r) => a + (r.k[c.id] || 0), 0);
    if (String(want) !== g.agg[c.id]) badG.push([g.g, c.id, g.agg[c.id], want]); }
  ok(G.length > 1 && !badG.length, 'every group row counts a thing its endpoints share once, and adds up what each owns', badG.slice(0, 4));
  const unionCols = D.cols.filter((c) => c.agg === 'union').map((c) => c.id);
  ok(['tables', 'written', 'datafns', 'inf_server', 'inf_answer', 'deciders', 'switches', 'guards', 'cases422'].every((c) => unionCols.includes(c)), 'the columns of shared things count by identity', unionCols); }

/* 5c · a name cell is never cut: its whole value is on screen */
{ const cut = await p.evaluate(() => [...document.querySelectorAll('#board tr.row .cat')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
  ok(!cut.length, 'no name cell is cut short', cut.slice(0, 3));
  const rt = await p.evaluate(() => [...document.querySelectorAll('#board tr.row [data-col="rate"]')].map((e) => [e.getAttribute('data-v'), e.textContent]));
  const norm = D.rows.reduce((m, r) => { m[r.v.rate] = (m[r.v.rate] || 0) + 1; return m; }, {}), top = Object.keys(norm).sort((a, b) => norm[b] - norm[a])[0];
  ok(rt.every(([v, t]) => v === top ? t === '·' : t === v.replace(/\+/g, ' · ')), 'a rate that is not the common one is written out in full', rt.filter(([v, t]) => v !== top).slice(0, 2)); }

/* 6 · sorting, lighting, the endpoint section, the rails */
{ await p.click('#board thead th[data-col="tables"]'); await p.waitForTimeout(60);
  const vals = async () => p.evaluate(() => { const out = []; let cur = []; document.querySelectorAll('#board tbody tr').forEach((tr) => {
    if (tr.classList.contains('grow')) { cur = []; out.push(cur); } else cur.push(+tr.querySelector('[data-col="tables"]').getAttribute('data-v')); }); return out; });
  const up = await vals(); ok(up.every((g) => g.every((v, i) => !i || g[i - 1] <= v)), 'a header click sorts every group up');
  await p.click('#board thead th[data-col="tables"]'); await p.waitForTimeout(60);
  const dn = await vals(); ok(dn.every((g) => g.every((v, i) => !i || g[i - 1] >= v)), 'a second click sorts every group down');
  await p.click('#board thead th.idh >> nth=1'); await p.waitForTimeout(60);
  const seg = await p.$('#board thead th[data-col="written"] .sg'); const segN = +(await seg.getAttribute('data-n'));
  await seg.click(); await p.waitForTimeout(60);
  const dim = await p.evaluate(() => document.querySelectorAll('#board tr.row[data-dim="true"]').length);
  ok(dim === FEED.length - segN, 'lighting a strip piece dims every row outside it', { dim, segN });
  ok(await p.isVisible('#litchip'), 'while rows are lit, a chip says so');
  await p.click('#litclear'); await p.waitForTimeout(40);
  const ep = 'POST /setup/complete'; await p.click('#board tr.row[data-ep="' + ep + '"] td.id'); await p.waitForTimeout(80);
  // CHANGED 2026-09-23 (D-036): the side panel is gone — a row click fills the ONE-ENDPOINT section below the table and the address
  ok(!(await p.$('#side, aside.side')), 'no side panel is drawn on the page');
  /* CHANGED 2026-09-25 (D-052): the title draws the endpoint the station's way (its glyph, its path, its method as the label at the end);
     its words in their own order are its aria-label, read here */
  const side = await p.evaluate(() => ({ h: document.querySelector('#onehead h3').getAttribute('aria-label'), n: document.querySelector('#onehead h3').getAttribute('aria-label'), search: window.location.search,
    cmd: (document.getElementById('labcmd') || {}).textContent || '', href: document.getElementById('lablink') ? document.getElementById('lablink').getAttribute('href') : '' }));
  const slugOf = require(path.join(HERE, '_ep-slug.js')).slug;
  ok(side.h.replace(/\s+/g, '') === ep.replace(/\s+/g, '') && side.n === ep, 'a row click fills the endpoint section with the row clicked', side);
  ok(side.search === '?ep=' + slugOf(ep), 'a row click writes the endpoint into the address, by the one slug rule', side.search);
  // CHANGED 2026-09-23 (D-035): the lab opens any endpoint through ?ep=, so the panel no longer hands a command that rewrites the
  // lab's own facts file (gen-endpoint-facts.py over _lab-ep.js) — it links the lab on this endpoint and names the command that
  // builds that endpoint's file (gen-endpoint-set.py --only); the slug is _ep-slug.js's, the rule the lab reads too.
  ok(side.cmd.includes('"' + ep + '"') && side.cmd.includes('--forms') && side.cmd.includes('gen-endpoint-set.py --only') && !side.cmd.includes('gen-endpoint-facts.py'),
    'the endpoint section gives the command that builds this endpoint\'s lab file, never one that rewrites the lab\'s own', side.cmd);
  ok(side.href === 'endpoint-lab.html?ep=' + slugOf(ep), 'the endpoint section links the lab on this endpoint, by the one slug rule', side.href);
  /* D-038: the Gabe Universe link — the example station's ?node=<the row's id>, by a RELATIVE path (Windows Chrome over wsl.localhost) */
  const UNI_REL = '../../../templates/center/shell/example/codebase-graph-station/gabe-universe.html';
  const uh = await p.getAttribute('#unilink', 'href');
  ok(uh === UNI_REL + '?node=' + encodeURIComponent('endpoint:' + ep) && fs.existsSync(path.resolve(path.dirname(PAGE), UNI_REL)),
    'the universe link opens the example station on ?node= with the row\'s id, by a relative path to a file that exists', uh);
  /* D-038: with the toggle closed the ONE ENDPOINT face holds no paragraph text; the toggle opens it and closes it again */
  const faceText = () => p.evaluate(() => [...document.querySelectorAll('#sec-one p, #sec-one pre, #sec-one .ainfo, #sec-board .ainfo, #sec-board .ainfo *')].filter((e) => e.offsetParent !== null && e.textContent.trim()).map((e) => e.id || e.className));
  const closed = await faceText();
  ok(!closed.length && (await p.getAttribute('#itog-one', 'aria-expanded')) === 'false', 'with the toggles closed, no paragraph text is on the face of either section', closed);
  await p.click('#itog-one'); await p.click('#itog-board'); await p.waitForTimeout(40);
  const opened = await faceText();
  ok(['one-lede', 'labcmd', 'lede', 'keys'].every((id) => opened.includes(id)), 'the toggles show what they hid', opened);
  await p.click('#itog-one'); await p.click('#itog-board'); await p.waitForTimeout(40);
  await shot('one-endpoint');
  const full = await p.evaluate(() => { document.getElementById('more-btn').click(); return document.body.innerText; });
  ok(!/\b(door|doors|lock|locks)\b/i.test(full), 'no string on the page says a word D-018 took out', (full.match(/.{30}\b(door|lock)s?\b.{30}/i) || [''])[0]);
  const small = await p.evaluate(() => { const bad = []; document.querySelectorAll('body *').forEach((e) => { if (!e.offsetParent && e.tagName !== 'BODY') return;
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); if (!own) return; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 12) bad.push(e.tagName + '.' + e.className + ' ' + fs); }); return bad; });
  ok(!small.length, 'no visible text under the 12px floor', small.slice(0, 4));
  // REMOVED 2026-09-23 (D-036): "Escape closes the side panel" — there is no panel to close; the section stays on the page
  const picks = await p.evaluate(() => [...document.querySelectorAll('.rgrp')].map((g) => g.querySelectorAll('.opt[data-pick], .opt[data-ruled]').length));
  ok(picks.length && picks.every((n) => n === 1), 'every rail marks exactly one option as its default, his or mine', picks);
  await pick('cols', 'top');
  const rs = await p.evaluate(() => [...document.querySelectorAll('#board thead th[data-col]')].map((h) => window.__allep.data.cols.find((c) => c.id === h.getAttribute('data-col')).r));
  ok(rs.length && rs.every((r) => r === D.tok.rTop), 'rated-top-only draws only the columns the inventory rates at the top', rs);
  await pick('cols', 'all'); await pick('lay', 'two'); await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready');
  ok(await p.evaluate(() => window.__allep.state.lay === 'two'), 'the rail is remembered across a reload');
  await pick('lay', 'rows'); }

/* 6b · the column names stay on screen while a person reads down a column: the page scrolled past the board's top, the board scrolled too.
   (2026-09-23: the table keeps its own scroll box — he asked for no change to the table, D-038) */
{ await p.evaluate(() => { const bd = document.getElementById('board'); window.scrollTo(0, 0); window.scrollTo(0, bd.getBoundingClientRect().top + 400); bd.scrollTop = 600; });
  const settle = (cond) => p.waitForFunction(cond, null, { timeout: 3000 }).catch(() => {});   /* a scroll event lands on the next frame, which a heavy table can delay */
  /* wait for BOTH the pin to reach the top AND the table's header to tuck behind it — the header moves on the scroll event's next
     frame, which a heavy table delays; measuring on the pin alone raced it on a first load (2026-09-24) */
  await settle(() => { const pin = document.getElementById('pin'), b0 = document.querySelector('#board thead tr.bh th.bstart'); if (!pin || !b0) return false;
    const pr = pin.getBoundingClientRect(), bt = b0.getBoundingClientRect().top; return Math.abs(pr.top) <= 1 && bt >= pr.top && bt < pr.bottom; });
  const at = await p.evaluate(() => { const bd = document.getElementById('board'), h = document.querySelector('#board thead tr.ch th[data-col]'), b0 = document.querySelector('#board thead tr.bh th.bstart');
    return { board: Math.round(bd.getBoundingClientRect().top), head: Math.round(h.getBoundingClientRect().top), band: Math.round(b0.getBoundingClientRect().top), scrolled: bd.scrollTop }; });
  ok(at.board < -300 && at.scrolled > 0, 'the page is scrolled past the board\'s top and the board is scrolled', at);
  /* CHANGED 2026-09-24 (D-039): the names at the top of the screen are the PIN's — it holds the block names, the column names and
     the selected row; the table's own header tucks BEHIND it (inside the pin's box), so its rows run on under the pinned row */
  const pn = await p.evaluate(() => { const pin = document.getElementById('pin'), pr = pin.getBoundingClientRect();
    const pb = pin.querySelector('thead tr.bh th.bstart'), ph = pin.querySelector('thead tr.ch th[data-col]'), row = pin.querySelector('tbody tr.row');
    return { top: Math.round(pr.top), bottom: Math.round(pr.bottom), band: Math.round(pb.getBoundingClientRect().top), head: Math.round(ph.getBoundingClientRect().top),
      row: row && row.getAttribute('data-ep'), open: window.__allep.state.open }; });
  ok(pn.top <= 1 && pn.band >= pn.top && pn.head > pn.band && pn.head < 120 && pn.row === pn.open,
    'the block names, the column names and the selected row sit at the top of the screen, in the pin', pn);
  ok(at.band >= pn.top && at.head + 10 <= pn.bottom, 'and the table\'s own header is tucked behind the pin, not stacked under it', { at, pin: pn });
  await p.evaluate(() => { window.scrollTo(0, 0); document.getElementById('board').scrollTop = 0; });
  await settle(() => { const bd = document.getElementById('board'), b0 = document.querySelector('#board thead tr.bh th.bstart'); return Math.abs(b0.getBoundingClientRect().top - bd.getBoundingClientRect().top) <= 2; });
  const back = await p.evaluate(() => { const bd = document.getElementById('board'), b0 = document.querySelector('#board thead tr.bh th.bstart'); return [Math.round(bd.getBoundingClientRect().top), Math.round(b0.getBoundingClientRect().top)]; });
  ok(Math.abs(back[1] - back[0]) <= 2, 'with the page at its top, the header sits at the board\'s top', back); }
ok(!errs.length, 'no page error', errs);

/* 8 · D-034: his five defaults, the dash on my picks only, every option an icon square, the Shared group standing out */
const DECISIONS = path.join(REPO, 'docs/design/design-context/decisions.md');
const PRISMS = path.join(REPO, 'docs/design/design-context/prisms-endpoint.json');
{ /* his paste, read from the ruling itself: the lines after "page:" are what the page's copy text must say on a cold start */
  const dec = fs.readFileSync(DECISIONS, 'utf8'), sec = dec.slice(dec.indexOf('## D-034'));
  const m = sec.slice(0, 1500).replace(/\n/g, ' ').match(/pasted \(.*?\): "(page: .*?)", with "your words:"/);
  const paste = m ? m[1].split(' / ').map((x) => x.trim()) : [];
  ok(paste.length === 5 && /^page: all-endpoints/.test(paste[0]), 'the ruling D-034 carries his pasted copy line', paste);
  const RULED = { lay: 'layout', grp: 'grouped by', cols: 'columns', shared: 'columns', bord: 'columns' };   /* the rails his paste names, by the copy line that says them */
  const W8 = D.words, name = (r, k) => W8.rail[r].opts[k].name.replace('{cards}', D.layouts[k]).replace('{rTop}', D.tok.rTop);
  const said = (r, k) => paste.some((l) => l.startsWith(RULED[r] + ': ') && l.slice(RULED[r].length + 2).split(' · ').some((x) => x.replace(/ \(\d+\)$/, '') === name(r, k)));
  ok(Object.keys(RULED).every((r) => said(r, W8.rail[r].pick)), 'each ruled rail\'s default is the option his paste names', Object.fromEntries(Object.keys(RULED).map((r) => [r, W8.rail[r].pick])));
  const ruledSet = Object.keys(W8.rail).filter((r) => W8.rail[r].ruled).sort();
  ok(JSON.stringify(ruledSet) === JSON.stringify(Object.keys(RULED).sort()), 'exactly the rails his paste names are marked ruled', ruledSet);
  const cold = async () => p.evaluate(() => ({ st: Object.fromEntries(window.__allep.rails.map((r) => [r, window.__allep.state[r]])), sort: window.__allep.state.sort,
    out: document.getElementById('out').value.split('\n') }));
  /* the copy text's state block (the lines before the first empty one), split into his paste's lines and the Shared treatment's
     line — the one rail on the copy text he has not ruled; everything else must be his paste, line for line and in order */
  // CHANGED 2026-09-23 (D-036): the page always shows one endpoint below the table, and the copy text names it on its own line
  // (the first row on a cold start) — set aside beside the Shared treatment's line; his paste is still compared line for line
  // CHANGED 2026-09-26 (his ask): the copy text also carries the code map's settings and BY MOMENT's, each on its own line after the
  // endpoint's (the code map's two looks, BY MOMENT's two looks, the path) — set aside too; his paste is still compared line for line
  // CHANGED 2026-09-26 (D-055): the code map's switch "what BY MOMENT carries" adds its line among the code map's settings — six lines now
  // CHANGED 2026-09-26 (D-058): the Gabe Universe's and the gaps' own switches add their lines after the code map's — eight lines now
  const CL = W8.copy.lines, isSlook = (l) => l.startsWith(CL.slook + ': '), isEp = (l) => l.startsWith(CL.open + ': ');
  const isSet = (l) => l.startsWith(CL.cm + ' · ') || l.startsWith(CL.mo + ' · ') || l.startsWith(CL.uni + ' · ') || l.startsWith(CL.gaps + ' · ');
  const asPaste = (out) => { const blk = out.slice(0, out.indexOf('')), his = blk.filter((l) => !isSlook(l) && !isEp(l) && !isSet(l));
    return { blk, his, same: his.length === paste.length && his[0] === 'page: all-endpoints · ' + D.tok.app + ' @ ' + D.tok.head && JSON.stringify(his.slice(1)) === JSON.stringify(paste.slice(1)) }; };
  await open(PAGE);
  const c0 = await cold(), a0 = asPaste(c0.out);
  ok(a0.same, 'a cold start\'s copy text is his paste line for line, with the Shared treatment\'s and the endpoint\'s lines set aside', { page: a0.his, his: paste });
  const sl = a0.blk.filter(isSlook), colsAt = a0.blk.findIndex((l) => l.startsWith(CL.cols + ': ')), el0 = a0.blk.filter(isEp);
  ok(sl.length === 1 && a0.blk.indexOf(sl[0]) === colsAt + 1, 'the copy text puts the Shared treatment\'s line right under the columns line', a0.blk);
  const set0 = a0.blk.filter(isSet);
  ok(el0.length === 1 && set0.length === 8 && a0.blk.length === paste.length + 2 + set0.length && JSON.stringify(a0.blk.slice(-9)) === JSON.stringify([el0[0]].concat(set0)),
    'the copy text adds the endpoint shown, then the code map\'s and BY MOMENT\'s settings, last', a0.blk);
  ok(c0.sort === null, 'a cold start is in path order', c0.sort);
  /* an old remembered state, from before the ruling, must not override it */
  const OLD = { lay: 'three', grp: 'method', alone: 'own', gord: 'name', shared: 'first', bord: 'card', cols: 'top', heat: 'plain', norm: 'full', sort: { col: 'tables', dir: -1 } };
  await p.evaluate((o) => { localStorage.setItem('gabe:allep:v1', JSON.stringify(o)); }, OLD); await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready');
  const c1 = await cold();
  ok(asPaste(c1.out).same && c1.sort === null, 'over a state remembered before the ruling, the page still opens on his defaults', { page: asPaste(c1.out).his, sort: c1.sort });
  ok(JSON.stringify(c1.st) === JSON.stringify(c0.st), 'over a state remembered before the ruling, every rail opens on its default', { cold: c0.st, over: c1.st });
  ok(await p.evaluate(() => localStorage.getItem('gabe:allep:v1') === null), 'the state remembered before the ruling is dropped');
  await open(PAGE);

  /* the dash: on exactly the defaults of the rails he has not ruled, and on nothing else */
  const opts = await p.evaluate(() => [...document.querySelectorAll('#rail .opt')].map((o) => { const cs = getComputedStyle(o), sv = o.querySelector('svg'), bx = o.getBoundingClientRect();
    return { r: o.getAttribute('data-rail'), v: o.getAttribute('data-v'), dash: cs.borderTopStyle === 'dashed' && cs.borderLeftStyle === 'dashed', on: o.getAttribute('aria-checked') === 'true',
      aria: o.getAttribute('aria-label'), svg: sv ? sv.innerHTML : null, shapes: sv ? sv.querySelectorAll('path,rect,circle,line,polyline').length : 0,
      text: (o.textContent || '').trim(), w: bx.width, h: bx.height, hidden: !o.offsetParent }; }));
  const unruled = Object.keys(W8.rail).filter((r) => !W8.rail[r].ruled);
  const dashed = opts.filter((o) => o.dash);
  ok(dashed.length === unruled.length && dashed.every((o) => !W8.rail[o.r].ruled && W8.rail[o.r].pick === o.v), 'a dashed border sits on exactly one option per unruled rail, its default', { dashed: dashed.map((o) => o.r + ':' + o.v), unruled });
  ok(!opts.some((o) => W8.rail[o.r].ruled && o.dash), 'no option of a ruled rail wears a dash', opts.filter((o) => W8.rail[o.r].ruled && o.dash).map((o) => o.r + ':' + o.v));
  ok(Object.keys(W8.rail).every((r) => opts.some((o) => o.r === r && o.v === W8.rail[r].pick && o.on)), 'on a cold start every rail\'s default is the pressed square');
  /* every option an icon square: a drawn svg, no words on its face, its words in its aria-label */
  const iconBad = opts.filter((o) => !o.svg || !o.shapes || o.text !== '' || o.aria !== name(o.r, o.v));
  ok(opts.length === Object.values(W8.rail).reduce((n, R) => n + Object.keys(R.opts).length, 0) && !iconBad.length, 'every option is an icon with its words as its aria-label', iconBad.slice(0, 3));
  ok(opts.filter((o) => !o.hidden).every((o) => o.w <= 36 && o.h <= 36 && Math.abs(o.w - o.h) <= 1), 'every option is a small square', opts.filter((o) => o.w > 36 || Math.abs(o.w - o.h) > 1).slice(0, 3));
  const icons = opts.map((o) => o.svg);
  ok(new Set(icons).size === icons.length, 'no two options draw the same icon', opts.filter((o, i) => icons.indexOf(o.svg) !== i).map((o) => o.r + ':' + o.v));
  /* resemblance, not only identity: every icon rasterised as the square draws it (stroke 2, round caps, .fl filled) at 48px,
     and every pair's overlap (intersection over union of the inked pixels) stays under IOU_MAX. It measures a shared
     silhouette — a sort arrow on two rails, a framed square on five — never what an icon MEANS; that is his to judge by looking */
  const IOU_MAX = 0.58;
  const iou = await p.evaluate(async () => { const I = window.__allep.icons, S = 48, flat = [];
    Object.keys(I).forEach((r) => Object.keys(I[r]).forEach((k) => flat.push([r + ':' + k, I[r][k]])));
    const mask = async (inner) => { const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' + S + '" height="' + S + '" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><style>.fl{fill:#000;stroke:none}</style>' + inner + '</svg>';
      const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await im.decode();
      const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, S, S).data;
      const m = new Uint8Array(S * S); for (let i = 0; i < S * S; i++) m[i] = d[i * 4 + 3] > 64 ? 1 : 0; return m; };
    const M = []; for (const [n, s] of flat) M.push([n, await mask(s)]);
    const out = []; for (let i = 0; i < M.length; i++) for (let j = i + 1; j < M.length; j++) { let a = 0, u = 0;
      for (let q = 0; q < S * S; q++) { const x = M[i][1][q], y = M[j][1][q]; if (x && y) a++; if (x || y) u++; } out.push([M[i][0], M[j][0], u ? a / u : 1]); }
    return { n: M.length, inked: M.every(([, m]) => m.some((v) => v)), pairs: out.sort((a, b) => b[2] - a[2]) }; });
  ok(iou.n === opts.length && iou.inked && iou.pairs[0][2] < IOU_MAX, 'no two option icons share most of their inked pixels (overlap under ' + IOU_MAX + ')', iou.pairs.slice(0, 3));
  /* the hover names the option (and says whose default it is) */
  const tipBad = [], longBad = [], HOVER_MAX = 20;
  for (const o of opts.filter((x) => !x.hidden)) {
    await p.hover(`.opt[data-rail="${o.r}"][data-v="${o.v}"]`); await p.waitForTimeout(15);
    const t = await p.evaluate(() => { const tp = document.getElementById('tip'); return tp.getAttribute('data-show') === 'true' ? tp.textContent : ''; });
    const mark = W8.rail[o.r].pick !== o.v ? null : W8.rail[o.r].ruled ? W8.ruledMark : W8.pickMark;
    if (!t.startsWith(o.aria) || (mark && !t.includes(mark)) || (!mark && (t.includes(W8.pickMark) || t.includes(W8.ruledMark)))) tipBad.push([o.r, o.v, t.slice(0, 60)]);
    const words = t.split(/\s+/).filter((w) => /[A-Za-z0-9{]/.test(w)).length; if (words > HOVER_MAX) longBad.push([o.r, o.v, words]); }
  ok(!tipBad.length, 'every icon\'s hover names it, and a default\'s says whose it is', tipBad.slice(0, 3));
  ok(!longBad.length, 'every icon\'s hover is ' + HOVER_MAX + ' words or fewer, its name included (D-009: a control\'s hover is short)', longBad.slice(0, 4));
  await p.mouse.move(5, 5);
  /* keyboard focus stays visible on an icon square */
  await p.focus('.opt[data-rail="lay"][data-v="rows"]'); await p.keyboard.press('Tab');
  const foc = await p.evaluate(() => { const a = document.activeElement, cs = getComputedStyle(a); return { opt: a.classList.contains('opt'), style: cs.outlineStyle, w: parseFloat(cs.outlineWidth) }; });
  ok(foc.opt && foc.style !== 'none' && foc.w >= 2, 'keyboard focus on an icon square is drawn', foc);
  /* a press from the keyboard: the rail is rebuilt, and focus stays on the square pressed, its name still in the focus tip */
  await p.focus('.opt[data-rail="grp"][data-v="seg"]'); await p.keyboard.press('Space'); await p.waitForTimeout(40);
  const kp = await p.evaluate(() => { const a = document.activeElement, tp = document.getElementById('tip');
    return { grp: window.__allep.state.grp, r: a.getAttribute('data-rail'), v: a.getAttribute('data-v'), tip: tp.getAttribute('data-show') === 'true' ? tp.textContent : '' }; });
  ok(kp.grp === 'seg' && kp.r === 'grp' && kp.v === 'seg' && kp.tip.startsWith(name('grp', 'seg')), 'after a key press on an icon, focus stays on that icon and its tip names it', kp);
  await pick('grp', W8.rail.grp.pick);
  /* pressing each icon still switches what it switched: its rail's state, its pressed look, every endpoint drawn once */
  const swBad = [];
  for (const r of Object.keys(W8.rail)) for (const k of Object.keys(W8.rail[r].opts)) {
    if (r === 'slook') await pick('shared', 'own');
    if (r === 'alone' || r === 'gord') await pick('grp', 'entity');
    await pick(r, k);
    const st = await p.evaluate((r) => ({ v: window.__allep.state[r], on: [...document.querySelectorAll('.opt[data-rail="' + r + '"][aria-checked="true"]')].map((o) => o.getAttribute('data-v')) }), r);
    const ids = await drawn();
    if (st.v !== k || st.on.length !== 1 || st.on[0] !== k || ids.length !== FEED.length || new Set(ids).size !== FEED.length) swBad.push([r, k, st, ids.length]); }
  ok(!swBad.length, 'pressing each icon switches its rail, presses that icon alone, and draws every endpoint once', swBad.slice(0, 3));
  await open(PAGE);

  /* the Shared group stands out: each treatment differs, in the table header, down its cells and on a card; the default is my pick */
  const nShare = (JSON.parse(fs.readFileSync(PRISMS, 'utf8')).clusterOpts || {}).spineClusters;
  ok(D.tok.nShare === nShare && D.cols.filter((c) => c.shared).every((c) => c.sharedIn.length >= nShare), 'shared means needed by the tree\'s own count of blocks or more', { page: D.tok.nShare, tree: nShare });
  ok(W8.rail.slook.pick && !W8.rail.slook.ruled && opts.some((o) => o.r === 'slook' && o.v === W8.rail.slook.pick && o.dash), 'the Shared treatment\'s default is my pick, dashed', W8.rail.slook.pick);
  const sig = () => p.evaluate(() => { const g = (sel, ks) => { const e = document.querySelector(sel); if (!e) return null; const cs = getComputedStyle(e); return ks.map((k) => cs[k]).join('|'); };
    const K = ['backgroundColor', 'borderTopWidth', 'borderTopColor', 'borderLeftWidth', 'borderLeftColor', 'borderRightWidth', 'fontWeight', 'color'];
    return { band: g('#board thead tr.bh th[data-block="_shared"]', K), other: g('#board thead tr.bh th[data-block]:not([data-block="_shared"]):not(.bz)', K),
      head: g('#board thead tr.ch th.shf', K), cell: g('#board tbody tr.row td.shf', K), last: g('#board tbody tr.row:last-child td.shl', ['borderBottomWidth', 'borderBottomColor', 'borderRightWidth']),
      n: document.querySelectorAll('#board thead tr.ch th.sh').length,
      heads: [...document.querySelectorAll('#board thead tr.ch th.sh')].map((h) => { const cs = getComputedStyle(h), hd = getComputedStyle(h.querySelector('.hd'));
        return [cs.backgroundColor, cs.borderTopWidth, cs.borderTopColor, cs.borderLeftWidth, cs.borderLeftColor, cs.borderRightWidth, cs.borderRightColor, hd.color, hd.fontWeight].join('|'); }) }; });
  const nSharedCols = D.cols.filter((c) => c.shared).length, looks = Object.keys(W8.rail.slook.opts), S8 = {};
  for (const lk of looks) { await pick('slook', lk); S8[lk] = await sig(); }
  /* the untreated Shared group, measured by lifting the board's treatment for one reading (a measurement, not a click path) */
  const bare = await p.evaluate(() => { const bd = document.getElementById('board'), was = bd.getAttribute('data-slook'); bd.setAttribute('data-slook', ''); return was; })
    .then(async (was) => { const x = await sig(); await p.evaluate((w) => document.getElementById('board').setAttribute('data-slook', w), was); return x; });
  ok(looks.every((lk) => S8[lk].band !== bare.band), 'every treatment changes the Shared header from its untreated look', looks.map((lk) => [lk, S8[lk].band === bare.band]));
  /* measured per column head, against that same head untreated: a treatment that styles only the group's edges leaves the
     middle heads as they were, and this goes red */
  const sameHeads = (lk) => S8[lk].heads.map((h, i) => (h === bare.heads[i] ? i : -1)).filter((i) => i >= 0);
  ok(looks.length >= 2 && looks.every((lk) => S8[lk].n === nSharedCols && bare.heads.length === nSharedCols && !sameHeads(lk).length),
    'under every Shared treatment, each shared column\'s own head looks different from that head untreated', looks.map((lk) => [lk, S8[lk].n, sameHeads(lk)]));
  /* the band is the Shared group's own hue, not the heat's: an empty Shared cell's ground must not read as a small tinted number.
     Colours are read as computed; the heat chips are the accent at every tint the page draws (8% to 50%) laid over the card */
  const hueRead = (theme) => p.evaluate(({ theme }) => { const bd = document.getElementById('board');
    const rgb = (css, prop) => { const q = document.createElement('i'); q.style[prop || 'backgroundColor'] = css; bd.appendChild(q); const c = getComputedStyle(q)[prop || 'backgroundColor']; q.remove(); return c; };
    const parse = (c) => { const n = c.match(/[\d.]+/g).map(Number); return c.startsWith('color(') ? n.slice(0, 3).map((x) => x * 255) : n.slice(0, 3); };
    const A = parse(rgb('var(--accent)')), C = parse(rgb('var(--card)'));
    const ground = (sel) => { const e = document.querySelector(sel); return e ? parse(getComputedStyle(e).backgroundColor) : null; };
    // CHANGED 2026-09-23 (D-036): one row is always picked now (the endpoint section shows it), and a picked row wears the
    // accent — so the grounds are read on a row that is NOT picked, which is what every other row looks like
    const band = ground('#board tbody tr.row:not([data-sel]) td.sh'), bz = ground('#board tbody tr.row:not([data-sel]) td.bz:not(.sh)');
    /* the hue of a TINT, read against the card it is laid on (a dark card is itself bluish): the ground's step from the card,
       its grey part removed, as an angle from the accent's step; a step with almost no colour in it is neutral (180) */
    const chroma = (x) => { const d = x.map((v, i) => v - C[i]), m = (d[0] + d[1] + d[2]) / 3; return [d.map((v) => v - m), Math.hypot(...d)]; };
    const hueGap = (x) => { const [cx, nx] = chroma(x), [ca] = chroma(A), lx = Math.hypot(...cx), la = Math.hypot(...ca);
      if (!nx || lx < 0.15 * nx) return 180; return Math.acos(Math.max(-1, Math.min(1, cx.reduce((s, v, i) => s + v * ca[i], 0) / (lx * la)))) * 180 / Math.PI; };
    const chipDist = (x) => { let m = 1e9; for (let p = 8; p <= 50; p++) { const a = p / 100, ch = A.map((v, i) => a * v + (1 - a) * C[i]); m = Math.min(m, Math.hypot(...ch.map((v, i) => v - x[i]))); } return m; };
    const hd = ground('#board thead tr.bh th[data-block="_shared"]'), other = ground('#board thead tr.bh th[data-block]:not([data-block="_shared"]):not(.bz)');
    return { theme, card: C.map(Math.round).join(','), band: band && band.map(Math.round), bz: bz && bz.map(Math.round), bandGap: band && Math.round(hueGap(band)), bandChip: band && +chipDist(band).toFixed(1), bzGap: bz && Math.round(hueGap(bz)),
      headOff: hd && other ? Math.round(Math.hypot(...hd.map((v, i) => v - other[i]))) : null }; }, { theme });
  await pick('slook', 'band');
  const H8 = [await hueRead('light')];
  await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(60); H8.push(await hueRead('dark')); await p.emulateMedia({ colorScheme: 'light' }); await p.waitForTimeout(40);
  ok(H8[0].card !== H8[1].card, 'the dark reading is taken with the page drawn dark', H8.map((h) => h.card));
  ok(H8.every((h) => h.band && h.bandGap >= 40 && h.bandChip >= 8), 'under the band, a Shared cell\'s ground is outside the heat\'s hue and is no heat chip\'s colour, light and dark', H8);
  ok(H8.every((h) => h.bz && h.bzGap >= 40), 'the alternating block ground is outside the heat\'s hue, light and dark', H8.map((h) => [h.theme, h.bz, h.bzGap]));
  ok(H8.every((h) => h.headOff >= 60), 'under the band, the Shared header stands off another block\'s header by a colour distance of 60 or more, light and dark', H8.map((h) => [h.theme, h.headOff]));
  const sigOf = (x) => [x.band, x.head, x.cell, x.last].join(' ~ ');
  ok(new Set(looks.map((lk) => sigOf(S8[lk]))).size === looks.length, 'each Shared treatment looks different from the others', looks.map((lk) => [lk, S8[lk].band]));
  ok(looks.every((lk) => S8[lk].band !== S8[lk].other), 'under every treatment the Shared header differs from another block\'s', looks.map((lk) => [S8[lk].band, S8[lk].other]));
  await pick('lay', 'three');
  const cardSig = () => p.evaluate(() => { const e = document.querySelector('#board .card .cb.sh'), f = document.querySelector('#board .card .cb:not(.sh)'); if (!e || !f) return null;
    const k = (x) => { const cs = getComputedStyle(x); return [cs.backgroundColor, cs.borderTopWidth, cs.borderTopColor, cs.borderLeftWidth, cs.borderLeftColor].join('|'); }; return { sh: k(e), other: k(f) }; });
  const C8 = {}; for (const lk of looks) { await pick('slook', lk); C8[lk] = await cardSig(); }
  ok(looks.every((lk) => C8[lk] && C8[lk].sh !== C8[lk].other) && new Set(looks.map((lk) => C8[lk].sh)).size === looks.length, 'on a card, the Shared block stands out, differently under each treatment', C8);
  await pick('lay', 'rows'); await pick('slook', W8.rail.slook.pick);
  await p.hover('#board thead tr.bh th[data-block="_shared"]'); await p.waitForTimeout(20);
  const stip = await p.evaluate(() => document.getElementById('tip').textContent);
  ok(stip.includes(String(nShare)) && stip.includes(W8.sharedBlock.name), 'the Shared header\'s hover says how many blocks make an attribute shared', stip);
  await p.mouse.move(5, 5);
  await pick('shared', 'first');
  const off = await p.evaluate(() => ({ sh: document.querySelectorAll('#board .sh').length, look: document.getElementById('board').getAttribute('data-slook'), hid: document.querySelector('.rgrp[data-rail="slook"]').hidden }));
  ok(off.sh === 0 && off.look === '' && off.hid, 'with the shared columns under their first block, no Shared treatment is drawn and its rail steps aside', off);
  await shot('d034-shared-first');
  await pick('shared', 'own'); }
ok(!errs.length, 'no page error after the D-034 checks', errs);

/* 9 · D-036: two sections, the endpoint picked, the universe card as the station draws it, the gaps, the block marks, nothing lost */
const STATION_PAGE = path.join(REPO, 'templates/center/shell/example/codebase-graph-station/gabe-universe.html');
const INVENTORY = path.join(REPO, 'docs/design/design-context/inventory-endpoint.md');
{ await open(PAGE);
  const W9 = D.words, slug9 = require(path.join(HERE, '_ep-slug.js')).slug;
  /* the page's sections, in order: the endpoints, one endpoint, the copy text, and more information LAST */
  const secs = await p.evaluate(() => [...document.querySelectorAll('section')].map((s) => s.id));
  /* CHANGED 2026-09-26 (his ask): BY MOMENT stands right after ONE ENDPOINT, the endpoint it follows */
  ok(JSON.stringify(secs) === JSON.stringify(['sec-board', 'sec-one', 'sec-mo', 'sec-copy', 'sec-more']), 'the page is the endpoints, then one endpoint, then by moment, then the copy text, then more information', secs);
  ok(await p.evaluate(() => { const m = document.getElementById('sec-more'), all = [...document.querySelectorAll('.artifact-page *')];
    return all.filter((x) => x.offsetParent !== null && !m.contains(x) && (m.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING)).length === 0; }), 'nothing on the page is drawn after more information');
  /* a cold start shows the first row drawn */
  const c9 = await p.evaluate(() => ({ first: document.querySelector('#board tr.row[data-ep]').getAttribute('data-ep'), open: window.__allep.state.open, n: document.querySelector('#onehead h3').getAttribute('aria-label'),
    sel: [...document.querySelectorAll('#board tr.row[data-sel="true"]')].map((e) => e.getAttribute('data-ep')) }));
  ok(c9.open === c9.first && c9.n === c9.first && c9.sel.length === 1 && c9.sel[0] === c9.first, 'a cold start shows the table\'s first row in the endpoint section, and marks that row', c9);
  /* ?ep= on load picks that row; a slug the page does not hold says so and shows the first row */
  const ADDR = 'GET /recipe-creation/gustify/stream';
  await p.goto('file://' + PAGE + '?ep=' + slug9(ADDR)); await p.waitForFunction('window.__allep && window.__allep.ready');
  const a9 = await p.evaluate(() => ({ open: window.__allep.state.open, n: document.querySelector('#onehead h3').getAttribute('aria-label'), sel: [...document.querySelectorAll('#board tr.row[data-sel="true"]')].map((e) => e.getAttribute('data-ep')),
    note: !document.getElementById('onenote').hidden }));
  ok(a9.open === ADDR && a9.n === ADDR && a9.sel.join() === ADDR && !a9.note, 'an address that names an endpoint opens the page on it', a9);
  await p.goto('file://' + PAGE + '?ep=no-such-endpoint'); await p.waitForFunction('window.__allep && window.__allep.ready');
  const b9 = await p.evaluate(() => ({ open: window.__allep.state.open, first: document.querySelector('#board tr.row[data-ep]').getAttribute('data-ep'),
    note: document.getElementById('onenote').hidden ? '' : document.getElementById('onenote').textContent }));
  ok(b9.open === b9.first && b9.note.includes('no-such-endpoint'), 'an address naming no endpoint shows the first row and says so', b9);
  await open(PAGE);

  /* THE UNIVERSE COLUMN, against the station itself: the example station opened beside, every endpoint selected through the
     station's own select path, and its card read off the panel — row set, order, counts, values, icons */
  const p2 = await ctx.newPage(); p2.on('pageerror', (e) => errs.push('station: ' + e.message));
  await p2.goto('file://' + STATION_PAGE); await p2.waitForFunction('window.__uniGoto && window.__uniSelNode', null, { timeout: 60000 });
  const TITLE = Object.fromEntries(D.uspec.filter((u) => u.title).map((u) => [u.title, u.row]));
  const cards = await p2.evaluate(({ ids, TITLE }) => { const norm = (x) => x.replace(/\s+/g, ' ').trim(); const out = {};
    for (const id of ids) { window.__uniGoto('endpoint:' + id); const pb = document.getElementById('pbody'), rows = [];
      [...pb.children].forEach((ch) => {
        if (ch.classList.contains('flagssec')) { rows.push({ row: 'RISK', text: norm(ch.innerText), icon: (ch.querySelector('svg') || {}).innerHTML || '' }); return; }
        const hd = ch.querySelector(':scope > .sechd');
        if (hd) { const title = [...hd.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim(), cnt = hd.querySelector('.cnt');
          const row = { row: TITLE[title] || '?' + title, count: cnt ? cnt.textContent : null, text: norm(ch.innerText.slice(hd.innerText.length)), icon: (hd.querySelector('svg') || {}).innerHTML || '' };
          /* what the row draws inside it: chips, a "+N more", a green count, its lines (a chip's own label, its icon and marks aside) */
          const lab = (c) => [...c.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
          const vis = (e) => e.offsetParent !== null;
          if (row.row === 'CONNECTIONS') { row.groups = [...ch.querySelectorAll('.connbox > .sublbl')].map((sb) => { const box = sb.nextElementSibling, cs = [...box.querySelectorAll(':scope > .xpl > .xrow > .xhead .pchip')];
              /* D-040: the group's look too — its icon, its trust badge, its list's class, each chip's class, glyph and twisty */
              return { head: norm(sb.innerText), chips: cs.map(lab), more: norm((box.querySelector(':scope > .xpl > .xmore') || {}).textContent || ''),
                icon: (sb.querySelector('svg') || {}).innerHTML || '', ttag: ((sb.querySelector('.ttag') || {}).className || ''), list: box.className,
                chipCls: cs.map((c) => c.className.replace(/\bxnav\b/, '').trim()), chipIco: cs.map((c) => (c.querySelector('svg') || {}).innerHTML || ''), tw: cs.map((c) => c.previousElementSibling.className) }; });
            ch.querySelectorAll('.connbox .xmore').forEach((b) => b.click());           /* every member, the ones behind "+N more" too */
            const sbs = [...ch.querySelectorAll('.connbox > .sublbl')];
            row.groups.forEach((g, i) => { g.all = [...sbs[i].nextElementSibling.querySelectorAll(':scope > .xpl > .xrow > .xhead .pchip')].map(lab); }); }
          if (row.row === 'CODE BEHIND') row.chips = [...ch.querySelectorAll('.xpl > .xrow > .xhead .pchip')].map(lab), row.more = norm((ch.querySelector('.xpl > .xmore') || {}).textContent || '');
          if (row.row === 'TESTS') row.ok = !!hd.querySelector('.cnt.ok'), row.chips = [...ch.querySelectorAll('.pchip[class*="st-"]')].filter(vis).map((c) => [lab(c), (c.className.match(/\bst-(\w+)/) || [])[1]]);
          if (row.row === 'ACCESSES') row.lines = [...ch.querySelectorAll(':scope > div:not(.sechd) > .sublbl')].map((x) => norm(x.innerText));
          if (row.row === 'JOURNEYS') row.lines = [...ch.querySelectorAll('.jmeta')].map((x) => norm(x.innerText)), row.faces = [...ch.querySelectorAll('.jfaces')].map((f) => [...f.querySelectorAll('.face')].map((x) => x.title));
          if (row.row === 'SIGNATURE') row.sig = norm(ch.innerText);
          rows.push(row); return; }
        if (ch.classList.contains('kv')) { const k = ch.querySelector('.k').textContent; rows.push({ row: TITLE[k] || '?' + k, count: null, text: norm(ch.querySelector('.v').innerText), icon: (ch.querySelector('svg') || {}).innerHTML || '' }); return; }
        rows.push({ row: '?' + ch.className }); });
      out[id] = { head: norm(document.getElementById('phead').innerText), headIcon: (document.querySelector('#phead .ptype svg') || {}).innerHTML || '', rows }; }
    return out; }, { ids: FEED, TITLE });
  /* the station's opening view (the tier it boots on and whether it draws functions), read off the running station */
  const view9 = await p2.evaluate(() => ({ tier: window.__uniTier, name: (_TIER_PRESETS[window.__uniTier] || {}).name, fns: CFG.showFns,
    deeper: _TIER_PRESETS.slice(window.__uniTier + 1).filter((t) => t.koff.indexOf('function') < 0).map((t) => t.name) }));
  const nv = (x) => String(x).replace(/·/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const sq = (x) => String(x).replace(/\s+/g, '').replace(/\/>/g, '>').replace(/<\/(path|circle|rect|ellipse|line|polyline|polygon)>/g, '');   /* drawn svg markup, serialisation aside */
  const VALUE_ROWS = ['USAGE', 'EVIDENCE', 'MODEL ROW', 'PAYLOAD', 'DELIVERY', 'IDENTITY', 'SOURCE', 'RISK', 'ABOVE'];
  const u9 = {};
  for (const ep of FEED) { const st = cards[ep], mine = ROW[ep].uni.rows, bad = (k, x) => { (u9[k] = u9[k] || []).push([ep, x]); };
    const sr = st.rows.map((x) => x.row), mr = mine.filter((x) => x.row !== 'HEAD').map((x) => x.row);
    if (JSON.stringify(sr) !== JSON.stringify(mr)) bad('rows', { station: sr, page: mr });
    for (const x of st.rows) { const m = mine.find((y) => y.row === x.row); if (!m) continue;
      if ((x.count || null) !== (m.count == null ? null : String(m.count))) bad('counts', [x.row, x.count, m.count]);
      if (VALUE_ROWS.includes(x.row) && !nv(x.text).includes(nv(m.value))) bad('values', [x.row, x.text.slice(0, 120), m.value]); }
    if (nv(st.head) !== nv(mine[0].value)) bad('head', [st.head, mine[0].value]);
    const silentWant = D.uspec.map((u) => u.row).filter((r) => r !== 'HEAD' && !mr.includes(r));
    if (JSON.stringify([...ROW[ep].uni.silent].sort()) !== JSON.stringify(silentWant.sort())) bad('silent', { page: ROW[ep].uni.silent, want: silentWant }); }
  for (const k of ['rows', 'counts', 'values', 'head', 'silent'])
    ok(!u9[k], 'every endpoint · the universe column\'s ' + k + ' are the station card\'s, read off the station', (u9[k] || []).slice(0, 3));
  /* what each row draws INSIDE it (review 2026-09-23): the Connections groups as the station keys them (relation · direction · the
     other end's kind), each group's shown members and its "+N more"; Code behind's listed callees and its "+N more" (never the
     feed's names_more, which the station draws nowhere); each test's state and the green count; the table on every access line;
     the Delivery note; each journey's corpus, component count and entities */
  const in9 = {}, inBad = (k, ep, x) => { (in9[k] = in9[k] || []).push([ep, x]); };
  const UC = D.ucard, moreOf = (t) => { const m = /^\+(\d+) (\w+)$/.exec(t || ''); return m ? [+m[1], m[2]] : [0, null]; };
  for (const ep of FEED) { const st = cards[ep], by = Object.fromEntries(ROW[ep].uni.rows.map((u) => [u.row, u])), sr = Object.fromEntries(st.rows.map((x) => [x.row, x]));
    const c = sr.CONNECTIONS, mc = by.CONNECTIONS;
    if (c && mc) { const want = c.groups.map((g) => { const [n, w] = moreOf(g.more); return [g.head, g.chips, n, w]; }),
        got = mc.items.map((g) => [g[0] + ' ' + g[1] + ' ' + g[2], g[3], g[4], g[4] ? UC.more : null]);
      if (JSON.stringify(want.map((x) => [nv(x[0]), x[1], x[2], x[3]])) !== JSON.stringify(got.map((x) => [nv(x[0]), x[1], x[2], x[3]]))) inBad('conns', ep, { station: want, page: got }); }
    const b = sr['CODE BEHIND'], mb = by['CODE BEHIND'];
    if (b && mb) { const [n, w] = moreOf(b.more); if (JSON.stringify(b.chips) !== JSON.stringify(mb.items) || n !== (mb.more || 0) || (n && w !== UC.more)) inBad('behind', ep, { station: [b.chips.length, b.more], page: [mb.items.length, mb.more] }); }
    const t = sr.TESTS, mt = by.TESTS;
    if (t && mt) { const mine = Object.fromEntries(mt.items.map((x) => [x[0], x[1]]));
      if (t.ok !== !!mt.ok || t.chips.some(([cid, stt]) => mine[cid] !== stt)) inBad('tests', ep, { station: [t.ok, t.chips.slice(0, 3)], page: [mt.ok, mt.items.slice(0, 3)] }); }
    const a = sr.ACCESSES, ma = by.ACCESSES;
    if (a && ma && JSON.stringify(a.lines.map(nv)) !== JSON.stringify(ma.items.map((o) => nv((o[0] === 'w' ? D.words.universe.say.writes : D.words.universe.say.reads) + ' → ' + o[1] + ' · ' + o[2])))) inBad('accesses', ep, { station: a.lines.slice(0, 2), page: ma.items.slice(0, 2) });
    const dl = sr.DELIVERY, md = by.DELIVERY;
    if (dl && md && !(md.note && nv(dl.text).includes(nv(md.note)))) inBad('delivery', ep, { station: dl.text, page: md.note });
    const j = sr.JOURNEYS, mj = by.JOURNEYS;
    if (j && mj && (JSON.stringify(j.lines.map(nv)) !== JSON.stringify(mj.items.map((x) => nv(x[0] + ' ' + x[1] + ' ' + x[2] + ' ' + UC.comp)))
      || JSON.stringify(j.faces) !== JSON.stringify(mj.items.map((x) => [...new Set(x[3])])))) inBad('journeys', ep, { station: [j.lines.slice(0, 2), j.faces.slice(0, 1)], page: mj.items.slice(0, 2) }); }
  for (const k of ['conns', 'behind', 'tests', 'accesses', 'delivery', 'journeys'])
    ok(!in9[k], 'every endpoint · what the universe column\'s ' + k + ' row draws inside it is what the station\'s card draws there', (in9[k] || []).slice(0, 2));
  /* the tested fixture of the grouping fix: an endpoint whose station card keeps two `touches` groups apart (a model and a schema) */
  ok(FEED.some((ep) => ROW[ep].uni.rows.find((u) => u.row === 'CONNECTIONS').items.filter((g) => g[0] === 'touches').length === 2), 'some endpoint draws two touches groups, as the station keys them apart by the other end\'s kind');
  /* the column says which view of the station it reproduces: the tier the station opens on, functions hidden there (the words say so) */
  ok(view9.name && view9.fns === 'off' && D.tok.uniTier === view9.name && D.tok.uniDeeper === view9.deeper.join(' · '), 'the universe column names the tier the station opens on, and the deeper tiers that draw functions', view9);

  /* a sample, DRAWN: pick it by a click in the table, and read the three columns off the page */
  const INV_IDS = new Set(fs.readFileSync(INVENTORY, 'utf8').split('\n').map((l) => l.match(/^\|\s*([^|]+?)\s*\|/)).filter(Boolean).map((m) => m[1])
    .filter((x) => x !== 'attribute' && !/^-+$/.test(x)).map((x) => x.replace(/\*|`|\([^)]*\)/g, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')));
  ok(INV_IDS.size === Object.keys(D.attrs).length && Object.keys(D.attrs).every((a) => INV_IDS.has(a)), 'the page\'s attributes are the inventory\'s rows', { inv: INV_IDS.size, page: Object.keys(D.attrs).length });
  const UMAP = Object.fromEntries(D.uspec.map((u) => [u.row, u.attrs]));
  ok(D.uspec.every((u) => u.attrs.every((a) => INV_IDS.has(a))), 'every attribute a universe row is said to show is an inventory row');
  /* what the code map HOLDS for a row, recomputed here from the row record (a zero, an empty list, none, absent or unknown holds nothing) */
  const DET = W9.codemap.details, HEADP = W9.codemap.head;
  const holds = (r) => { const out = new Set(), add = (as) => as.forEach((a) => out.add(a));
    add(HEADP.method.attrs); if (r.fn) add(HEADP.handler.attrs); if (r.ent) add(HEADP.entity.attrs); if (r.seg) add(HEADP.segment.attrs); if (r.declared) add(HEADP.declared.attrs);
    for (const c of D.cols) { const v = r.v[c.id]; if (v === 'absent' || v === 'unknown') continue;
      const has = c.kind === 'num' || c.kind === 'slot' ? v > 0 : c.kind === 'cat' ? !!v && v !== 'none' : c.kind === 'spine' ? Object.values(v).some((n) => n > 0)
        : c.kind === 'stack' ? (c.id === 'fate' ? Object.entries(v).some(([f, n]) => f !== 'none' && n > 0) : r.k[c.id] > 0) : c.kind === 'ratio' ? v[1] > 0 : c.kind === 'dots' ? v.length > 0 : false;
      if (has) add([c.attr]); }
    const d = r.d, len = (x) => (x && x.items ? x.items.length : (x || []).length);
    const H = { exits: len(d.exits), tables: len(d.tables), gateWrites: d.gateWrites.length, fates: d.fates.items.some((f) => f[2] !== 'none'), guards: len(d.guards), gates: d.gates.length, limits: d.limits.length,
      request: d.request != null, response: d.response != null, cases: Object.keys(d.cases).length, deciders: len(d.deciders), switches: len(d.switches), behind: d.behind[0] > 0,
      // CHANGED 2026-09-26 (D-056): the screens pair names the screens (a list, no longer a count); the new pair: the cases it arranges
      proof: (d.proof.produced || 0) > 0, inflight: len(d.inflight), hook: !!d.hook, screens: (d.screens || []).length > 0, reasons: len(d.reasons), alarms: d.alarms.length, pieces: len(d.pieces), lacks: d.lacks.length,
      arranged: (d.arranged || []).length };
    if (JSON.stringify(Object.keys(H).sort()) !== JSON.stringify(Object.keys(DET).sort())) throw new Error('the recomputation does not read every code-map pair the words name');
    for (const k of Object.keys(H)) if (H[k]) add(DET[k].attrs);
    if (r.stream && H.exits) add(['delivery']);   /* D-056 (12): a streamed answer's badge on the endings table carries delivery */
    return out; };
  /* changed 2026-09-23 (review findings 3 and 4): the gaps were "held less the rows' fixed attributes"; a few attributes are now
     read per endpoint off the STATION's card: request shape is shown when a Connections chip or the signature names the request
     schema; a switch or an own guard when a flag the card draws as "walled by" is a name its condition reads (some → in part) */
  const IDN = /[A-Za-z_][A-Za-z0-9_]*/g, perEp = (ep, r) => { const st = cards[ep], c = st.rows.find((x) => x.row === 'CONNECTIONS'), sg = st.rows.find((x) => x.row === 'SIGNATURE');
    const members = new Set((c ? c.groups : []).flatMap((g) => g.all)), walls = new Set((c ? c.groups : []).filter((g) => /^walled by\b/i.test(g.head)).flatMap((g) => g.all)), out = {};
    if (r.d.request) { const nm = r.d.request[0], hit = members.has(nm) || (sg && new RegExp('\\b' + nm + '\\b').test(sg.sig)); out['request-shape'] = [hit ? 1 : 0, 1, hit ? [nm] : []]; }
    for (const [attr, key, text] of [['switches', 'switches', (x) => x.filter(Boolean).join(' ')], ['own-guards', 'guards', (x) => String(x[1] || '')]]) {
      const L2 = r.d[key] || { items: [], more: 0 }, hits = L2.items.map((x) => (text(x).match(IDN) || []).filter((w) => walls.has(w)));
      out[attr] = [hits.filter((h) => h.length).length, L2.items.length + (L2.more || 0), [...new Set(hits.flat())].sort()]; }
    return out; };
  const g9 = [], p9 = [];
  for (const ep of FEED) { const r = ROW[ep], shown = new Set(r.uni.rows.flatMap((u) => UMAP[u.row])), here = perEp(ep, r), ord = (a, b) => D.attrOrder.indexOf(a) - D.attrOrder.indexOf(b);
    const cand = [...holds(r)].filter((a) => !shown.has(a)), want = cand.filter((a) => !here[a] || !here[a][0]).sort(ord),
      part = cand.filter((a) => here[a] && here[a][0] && here[a][0] < here[a][1]).sort(ord).map((a) => [a, ...here[a]]);
    if (JSON.stringify(want) !== JSON.stringify(r.gaps)) g9.push([ep, { page: r.gaps, want }]);
    if (JSON.stringify(part) !== JSON.stringify(r.partly)) p9.push([ep, { page: r.partly, want: part }]); }
  ok(!g9.length, 'every endpoint · the gaps are what the code map holds less what the universe rows drawn show, read off the station card', g9.slice(0, 2));
  ok(!p9.length, 'every endpoint · an attribute the station card shows only part of here is listed as shown in part, with what it draws', p9.slice(0, 2));
  ok(FEED.filter((ep) => ROW[ep].d.request && !ROW[ep].gaps.includes('request-shape')).length > 0 && FEED.some((ep) => ROW[ep].partly.length),
    'the request schema the card names clears request shape, and a flag it draws walled by makes a switch and a guard shown in part');
  /* a switch is named in the code-map column — by its port, else its settings, else the condition it tests (the feed's) */
  const sw9 = FEED.filter((ep) => { const fe = FJ.endpoints['endpoint:' + ep], want = (fe.switches || []).slice(0, 14).map((w) => [w.kind, w.port || Object.keys(w.settings || {}).sort().join(', ') || String(w.expr || w.pred || '').slice(0, 80)]);
    return JSON.stringify(want) !== JSON.stringify(ROW[ep].d.switches.items); });
  ok(!sw9.length && FEED.every((ep) => ROW[ep].d.switches.items.every((x) => x[1])), 'every endpoint · each switch in the code-map column carries its name or its condition, never its kind alone', sw9.slice(0, 3));
  const OLD_PANEL = ['exits', 'tables', 'gateWrites', 'fates', 'guards', 'gates', 'limits', 'request', 'response', 'cases', 'deciders', 'switches', 'behind', 'proof', 'inflight', 'hook', 'screens', 'reasons', 'alarms', 'pieces', 'lacks'];
  const SAMPLE9 = ['POST /setup/complete', 'GET /recipes', 'GET /recipe-creation/gustify/stream', 'DELETE /', 'GET /healthz', 'PATCH /pantry/items/{item_id}'].filter((x) => FEED.includes(x));
  for (const ep of SAMPLE9) {
    await p.click('#board tr.row[data-ep="' + ep + '"] td.id'); await p.waitForTimeout(60);
    const dom = await p.evaluate(() => ({ n: document.querySelector('#onehead h3').getAttribute('aria-label'), search: window.location.search,   /* D-052: the title's words, in order */
      /* changed 2026-09-24 (D-040): the column draws the station's card, so a row is read the way the station's card is read
         below — its header (icon, title, count), then the words it draws after the header; a key-value row by its value */
      uni: [...document.querySelectorAll('#ocol-uni .ust .urow')].map((u) => { const hd = u.querySelector(':scope > .sechd'), cnt = hd && hd.querySelector('.cnt'), kv = u.classList.contains('kv');
        const ic = (hd || u).querySelector('svg'), t = hd ? u.innerText.slice(hd.innerText.length) : kv ? u.querySelector('.v').innerText : u.innerText;
        return { row: u.getAttribute('data-row'), count: cnt ? cnt.textContent : null, text: t.replace(/\s+/g, ' ').trim(), icon: ic ? ic.innerHTML : '' }; }),
      conns: [...document.querySelectorAll('#ocol-uni .urow[data-row="CONNECTIONS"] .connbox > .sublbl')].map((sb) => { const box = sb.nextElementSibling, cs = [...box.querySelectorAll(':scope > .xpl > .xrow > .xhead .pchip')];
        const lab = (c) => [...c.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
        return { head: sb.innerText.replace(/\s+/g, ' ').trim(), chips: cs.map(lab), more: ((box.querySelector(':scope > .xpl > .xmore') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
          icon: (sb.querySelector('svg') || {}).innerHTML || '', ttag: ((sb.querySelector('.ttag') || {}).className || ''), list: box.className,
          chipCls: cs.map((c) => c.className.trim()), chipIco: cs.map((c) => (c.querySelector('svg') || {}).innerHTML || ''), tw: cs.map((c) => c.previousElementSibling.className) }; }),
      behind: { chips: [...document.querySelectorAll('#ocol-uni .urow[data-row="CODE BEHIND"] .xpl > .xrow > .xhead .pchip')].map((c) => c.textContent.trim()),
        more: ((document.querySelector('#ocol-uni .urow[data-row="CODE BEHIND"] .xpl > .xmore') || {}).textContent || '').trim() },
      /* changed 2026-09-23 (review finding 3/4): an attribute the card shows only in part is drawn in the column too, marked
         data-part — the whole gaps are the ones without that mark, and they are compared as before */
      gaps: [...document.querySelectorAll('#ocol-gaps .gap[data-attr]:not([data-part])')].map((g) => g.getAttribute('data-attr')),
      part: [...document.querySelectorAll('#ocol-gaps .gap[data-part]')].map((g) => [g.getAttribute('data-attr'), g.getAttribute('data-part')]),
      states: [...document.querySelectorAll('#ocol-uni .urow[data-row="TESTS"] .pchip[class*="st-"]')].filter((x) => x.offsetParent !== null).map((x) => [x.textContent.trim(), (x.className.match(/\bst-(\w+)/) || [])[1]]),
      testsOk: !!document.querySelector('#ocol-uni .urow[data-row="TESTS"] .sechd .cnt.ok'),
      plain: (document.querySelector('#ocol-uni .plain') || {}).textContent || '',
      /* changed 2026-09-25 (D-053): "its own checks" is no longer a pair of its own — it is the endings table's check column, a field
         drawn INSIDE the endings pair (data-sub), so it is read with the pairs */
      pairs: [...document.querySelectorAll('#ocol-cm .pair[data-attr], #ocol-cm [data-sub][data-attr]')].map((x) => ({ k: x.getAttribute('data-k'), attrs: x.getAttribute('data-attr').split(' ') })),
      lab: !!document.getElementById('lablink') && !!document.getElementById('labcmd') }));
    const r = ROW[ep], st = cards[ep];
    ok(dom.n === ep && dom.search === '?ep=' + slug9(ep), ep + ' · a click fills the section and the address', { n: dom.n, search: dom.search });
    /* changed 2026-09-24 (D-040): the rows were compared as flat values; the column now draws the station's card, so its rows and
       counts are the row record's, and the words each row DRAWS are the station card's own words for that row, read off the station */
    ok(JSON.stringify(dom.uni.map((u) => [u.row, u.count])) === JSON.stringify(r.uni.rows.map((u) => [u.row, u.count == null ? null : String(u.count)])), ep + ' · the universe column draws its rows and counts', dom.uni.slice(0, 3));
    const wordsBad = dom.uni.filter((u) => { const s2 = u.row === 'HEAD' ? { text: st.head } : st.rows.find((x) => x.row === u.row); return !s2 || nv(s2.text) !== nv(u.text); }).map((u) => [u.row, u.text.slice(0, 90), ((st.rows.find((x) => x.row === u.row) || {}).text || st.head).slice(0, 90)]);
    ok(!wordsBad.length, ep + ' · every row draws the words the station\'s card draws for it, in its order', wordsBad.slice(0, 2));
    /* the icon each row wears is the icon the station's card draws for that row (compared as drawn markup) */
    const iconBad = dom.uni.filter((u) => u.row !== 'HEAD').filter((u) => { const s2 = st.rows.find((x) => x.row === u.row); return !s2 || sq(s2.icon) !== sq(u.icon); }).map((u) => u.row);
    const headBad = sq(st.headIcon) !== sq(dom.uni[0].icon);
    ok(!iconBad.length && !headBad, ep + ' · every universe row wears the icon the station draws for it', { rows: iconBad, head: headBad });
    ok(JSON.stringify([...dom.gaps].sort()) === JSON.stringify([...r.gaps].sort()) && dom.gaps.length === r.gaps.length, ep + ' · the gaps column lists the row\'s gaps, each once (drawn by block)', { dom: dom.gaps, data: r.gaps });
    ok(JSON.stringify(dom.part) === JSON.stringify(r.partly.map((x) => [x[0], x[1] + '/' + x[2]])), ep + ' · the gaps column draws what the card shows only in part, marked so', dom.part);
    /* the lines drawn inside the rows: every station group's words and shown members, the listed callees, each case's state */
    const scn = st.rows.find((x) => x.row === 'CONNECTIONS'), sbh = st.rows.find((x) => x.row === 'CODE BEHIND'), sts = st.rows.find((x) => x.row === 'TESTS');
    /* D-040 · on two endpoints, the Connections row against the station's own card: the same groups in the same order, each with
       its relation and count, its icon, its trust badge, its list's class, and each chip's class (the other end's kind), glyph,
       label and twisty, then the same "+N more" */
    if (ep === 'POST /setup/complete' || ep === 'GET /recipe-creation/gustify/stream') {
      const key = (g) => [nv(g.head), sq(g.icon), g.ttag, g.list, g.chips, g.chipCls, g.chipIco.map(sq), g.tw, nv(g.more)];
      ok(scn && scn.groups.length > 1 && JSON.stringify(dom.conns.map(key)) === JSON.stringify(scn.groups.map(key)),
        ep + ' · the Connections row draws the station\'s groups — relation, count, icon, trust badge, chips with their kind\'s class and glyph, twisties, +N more', { page: dom.conns.map(key).slice(0, 2), station: scn && scn.groups.map(key).slice(0, 2) }); }
    ok(!sbh || (JSON.stringify(dom.behind.chips) === JSON.stringify(sbh.chips) && nv(dom.behind.more) === nv(sbh.more)), ep + ' · the Code behind row draws the callees the station lists and its more, nothing else', [sbh && sbh.more, dom.behind]);
    ok(!sts || sts.chips.every(([cid, stt]) => dom.states.some(([c2, s2]) => c2 === cid && s2 === stt)), ep + ' · each case the station shows is drawn with its state', dom.states.slice(0, 3));
    ok(!sts || sts.ok === dom.testsOk, ep + ' · the Tests count is green exactly when the station\'s is', [sts && sts.ok, dom.testsOk]);
    ok(dom.plain.includes(view9.name), ep + ' · the universe column says which tier of the station it is', dom.plain);
    const inRight = new Set(dom.pairs.flatMap((x) => x.attrs)), leftAttrs = new Set(dom.uni.flatMap((u) => UMAP[u.row] || []));
    ok(dom.gaps.every((a) => INV_IDS.has(a) && inRight.has(a) && !leftAttrs.has(a)), ep + ' · every gap is an inventory attribute the code-map column carries and no universe row drawn shows',
      dom.gaps.filter((a) => !(INV_IDS.has(a) && inRight.has(a) && !leftAttrs.has(a))));
    /* nothing the old side panel held is lost: its header lines, every column's value, every detail block, the lab's link and command */
    const ks = new Set(dom.pairs.flatMap((x) => x.k.replace(/^c:/, '').split(',').map((y) => (x.k.startsWith('c:') ? 'c:' + y : x.k))));
    const miss = [...['handler', 'entity', 'segment', 'declared'].map((k) => 'h:' + k), ...D.cols.map((c) => 'c:' + c.id), ...OLD_PANEL.map((k) => 'd:' + k)].filter((k) => !ks.has(k));
    ok(!miss.length && dom.lab, ep + ' · every line the side panel held is in the code-map column (only its close button left, with the panel)', miss); }
  /* D-040 · THE GAPS BOTH WAYS: two icon squares at the top of the gaps, today's reading the default and the agent's pick (dashed);
     switching to the other way changes the list, and what it lists is the universe card's: a row the card draws, an attribute
     of that row the code map holds nothing for here, or a name that row draws which no code-map value names. Remembered per viewer. */
  { const GEP = 'POST /setup/complete', r = ROW[GEP], hold = holds(r);
    await p.click('#board tr.row[data-ep="' + GEP + '"] td.id'); await p.waitForTimeout(60);
    /* every member the card holds: its "+N more" opened, and a tabbed row read tab by tab (a row shows one tab at a time — the
       Tests row's second corpus is drawn only once its tab is picked; found by the one run of 2026-09-24, fixed here) */
    const readG = () => p.evaluate(() => { document.querySelectorAll('#ocol-uni .ust .xmore, #ocol-uni .ust .more').forEach((b) => b.click());
      const tabbed = {}; document.querySelectorAll('#ocol-uni .ust .urow').forEach((u) => { const tabs = [...u.querySelectorAll('.tabbar .tab')];
        tabbed[u.getAttribute('data-row')] = tabs.map((t) => { t.click(); return u.textContent; }).join(' \u2502 '); if (tabs.length) tabs[0].click(); });
      return { dir: document.getElementById('ocol-gaps').getAttribute('data-dir'), count: document.querySelector('#ocol-gaps .gcount').textContent,
        a: [...document.querySelectorAll('#ocol-gaps .gblk[data-block] .gap[data-attr]')].map((g) => g.getAttribute('data-attr')),
        groups: [...document.querySelectorAll('#ocol-gaps .gblk[data-row]')].map((bx) => ({ row: bx.getAttribute('data-row'), attrs: [...bx.querySelectorAll('.gap[data-attr]')].map((g) => g.getAttribute('data-attr')),
          unm: !!bx.querySelector('.gap.gunm'), facts: [...bx.querySelectorAll('.gfact')].map((f) => f.getAttribute('data-fact')) })),
        squares: [...document.querySelectorAll('#ocol-gaps .opt[data-gdir]')].map((o) => [o.getAttribute('data-gdir'), o.getAttribute('aria-checked'), getComputedStyle(o).borderTopStyle, o.getAttribute('aria-label'), !!o.querySelector('svg')]),
        cm: [...document.querySelectorAll('#ocol-cm .pv')].map((x) => x.innerText).join(' \u2502 '),
        uni: Object.fromEntries([...document.querySelectorAll('#ocol-uni .ust .urow')].map((u) => [u.getAttribute('data-row'), u.textContent + ' \u2502 ' + (tabbed[u.getAttribute('data-row')] || '')])) }; });
    const a0 = await readG();
    ok(a0.dir === 'cm' && a0.squares.length === 2 && a0.squares[0][1] === 'true' && a0.squares[0][2] === 'dashed' && a0.squares[1][1] === 'false' && a0.squares[1][2] !== 'dashed'
      && a0.squares.every((q) => q[3] && q[4]) && a0.a.length === r.gaps.length + r.partly.length, 'the gaps open on today\'s reading, the agent\'s pick dashed, beside a second icon square; each square carries its words', a0.squares);
    await p.click('#ocol-gaps .opt[data-gdir="uni"]'); await p.waitForTimeout(60);
    const b0 = await readG(), inWords = (f, t) => new RegExp('(?<![\\w])' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w])', 'i').test(t);
    const badB = b0.groups.filter((g) => !(g.row in b0.uni) || g.attrs.some((x) => hold.has(x) || !UMAP[g.row].includes(x)) || g.unm !== !UMAP[g.row].length
      || g.facts.some((f) => inWords(f, b0.cm) || !b0.uni[g.row].toLowerCase().includes(f.toLowerCase()))).map((g) => g.row);
    ok(b0.dir === 'uni' && b0.groups.length > 0 && !b0.a.length && b0.count !== a0.count && b0.groups.some((g) => g.facts.length) && !badB.length,
      'switching the gaps to the other way changes the list: each item is a row the universe card draws, an attribute of it the code map holds nothing for here, or a name it draws that no code-map value names',
      { bad: badB, count: [a0.count, b0.count], rows: b0.groups.map((g) => g.row) });
    await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready'); await p.click('#board tr.row[data-ep="' + GEP + '"] td.id'); await p.waitForTimeout(60);
    const c0 = await readG();
    ok(c0.dir === 'uni' && JSON.stringify(c0.groups) === JSON.stringify(b0.groups), 'the gaps\' direction is remembered for this viewer', c0.dir);
    await p.click('#ocol-gaps .opt[data-gdir="cm"]'); await p.waitForTimeout(60);
    ok((await readG()).dir === 'cm', 'the first square brings back today\'s reading'); }
  await p2.close();

  /* THE BLOCK MARKS: each block's icon and colour, expected from an independent read — the lab's registry run here, the tree's
     pairing from the lab's own facts, the marks the words file picks for blocks with no part */
  const vm = await import('node:vm'); const win = {}; win.window = win; const vctx = vm.createContext(win);
  for (const f of ['_station.js', '_lab-ep.js', '_lab-ep-panels.js']) vm.runInContext(fs.readFileSync(path.join(HERE, f), 'utf8'), vctx, { filename: f });
  const PAN = win.PANELS, STN = win.STATION, SMB = facts('POST /setup/complete').sectionmap.blocks, MK = W9.marks;
  const iconOf = (n) => { const t = STN.icon(n, 16, 'currentColor'); return t.slice(t.indexOf('>') + 1, t.lastIndexOf('</svg>')); };
  /* the lab's own section map, opened: the mark its blockMark() gives each block (D-036 — the table aligns with the lab).
     changed 2026-09-23 (review finding 7): a block no part answers was expected to wear the words file's own pick; it now wears
     the lab section map's mark, read here off the running lab, not off the page's generator */
  const p3 = await ctx.newPage(); p3.on('pageerror', (e) => errs.push('lab: ' + e.message));
  await p3.goto('file://' + path.join(HERE, 'endpoint-lab.html')); await p3.waitForFunction('window.LABMAP && window.LABMAP.mark && window.LABEP', null, { timeout: 60000 });
  const LABM = await p3.evaluate(() => Object.fromEntries(window.LABEP.sectionmap.blocks.map((b) => { const m = window.LABMAP.mark(b), t = m.svg || '';
    return [b.key, { kind: m.kind, col: m.col, inner: t.slice(t.indexOf('>') + 1, t.lastIndexOf('</svg>')) }]; })));
  await p3.close();
  const want9 = Object.fromEntries(SMB.map((b) => { const pt = PAN[b.join.surface_key];
    return [b.key, pt ? { inner: iconOf(pt.icon), col: pt.col, pick: false } : { inner: LABM[b.key].inner, col: LABM[b.key].col, pick: true }]; }));
  want9._shared = { inner: iconOf(MK.shared.icon), col: null, pick: true };
  ok(SMB.filter((b) => !PAN[b.join.surface_key]).every((b) => LABM[b.key] && LABM[b.key].inner && LABM[b.key].col), 'the lab draws a mark for every block no part answers', LABM);
  const readMarks = (sel) => p.evaluate(({ sel, want }) => { const rgb = (c) => { const q = document.createElement('i'); q.style.color = c; document.body.appendChild(q); const v = getComputedStyle(q).color; q.remove(); return v; };
    return [...document.querySelectorAll(sel)].map((h) => { const bm = h.querySelector('.bm'), sv = bm && bm.querySelector('svg'), k = h.getAttribute('data-block');
      return { key: k, inner: sv ? sv.innerHTML : '', color: bm ? getComputedStyle(bm).color : '', dash: bm ? getComputedStyle(bm).outlineStyle : '', shadow: getComputedStyle(h).boxShadow,
        sh: rgb('var(--sh)'), wantRgb: want[k] && want[k].col ? rgb(want[k].col) : null }; }); }, { sel, want: want9 });
  const checkMarks = (list, where, stripe) => { const bad = [];
    for (const m of list) { const w = want9[m.key]; if (!w) { bad.push([m.key, 'no expectation']); continue; }
      if (sq(m.inner) !== sq(w.inner)) bad.push([m.key, 'icon']);
      /* a colour is a hex (a part's) or the token the lab names (var(--accent) …), resolved on this page */
      if (m.color !== (w.col ? m.wantRgb : m.sh)) bad.push([m.key, 'colour', m.color, w.col]);
      if ((m.dash === 'dashed') !== w.pick) bad.push([m.key, 'dash', m.dash, w.pick]);
      if (stripe && w.col && m.key !== '_shared' && !m.shadow.includes(m.wantRgb)) bad.push([m.key, 'stripe', m.shadow]); }
    ok(list.length >= 11 && !bad.length, where + ' · every block wears its part\'s icon and colour, or the lab section map\'s mark for it dashed', bad.slice(0, 4)); };
  checkMarks(await readMarks('#board thead tr.bh th[data-block]'), 'the table\'s block headers', true);
  checkMarks(await readMarks('#ocol-cm .cbh[data-block]'), 'the code-map column\'s block heads', false);
  ok(SMB.filter((b) => PAN[b.join.surface_key]).length >= 6, 'six blocks are paired to a lab part', SMB.map((b) => b.join.surface_key));
  await pick('lay', 'three'); checkMarks(await readMarks('#board .card[data-ep] .bn[data-block]'), 'the cards\' block names', false); await pick('lay', 'rows');
  const shHue = await p.evaluate(() => { const b = document.querySelector('#board thead tr.bh th[data-block="_shared"]'); return b ? getComputedStyle(b.querySelector('.bm')).color : null; });
  ok(shHue && shHue === (await p.evaluate(() => { const q = document.createElement('i'); q.style.color = 'var(--sh)'; document.body.appendChild(q); const v = getComputedStyle(q).color; q.remove(); return v; })), 'the Shared group\'s mark keeps its rose', shHue);

  /* at 1920 the three columns stand side by side, the gaps the narrowest (D-036's revisit trigger: they stack when they cannot) */
  const lay9 = await p.evaluate(() => ['ocol-uni', 'ocol-gaps', 'ocol-cm'].map((id) => { const b = document.getElementById(id).getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width)]; }));
  ok(lay9[0][1] === lay9[1][1] && lay9[1][1] === lay9[2][1] && lay9[0][0] < lay9[1][0] && lay9[1][0] < lay9[2][0] && lay9[1][2] < lay9[0][2] && lay9[1][2] < lay9[2][2],
    'at 1920 the universe, the gaps and the code map stand side by side, the gaps the narrowest', lay9);
  /* the mapping the gaps are computed from is on the page, behind more information, row by row */
  /* more information says how a few attributes are read per endpoint, and that a deeper tier changes the card (naming those tiers) */
  const mi = await p.evaluate(() => document.getElementById('more-body').textContent);
  ok(mi.includes(D.words.one.gaps.perEp) && view9.deeper.every((t) => mi.includes(t)), 'more information says which attributes are read per endpoint, and names the deeper tiers whose card differs', view9.deeper);
  const um = await p.evaluate(() => [...document.querySelectorAll('#umap tr[data-row]')].map((t) => t.getAttribute('data-row')));
  ok(JSON.stringify(um) === JSON.stringify(D.uspec.map((u) => u.row)), 'more information lists which attributes each universe row shows', um);
}
ok(!errs.length, 'no page error after the D-036 checks', errs);

/* 10 · D-041: click an element in the universe column or the code-map column and it lights in the three places. The rows expected
   lit are recomputed HERE from the row records (u · d · the universe card's rows), the model→table alias read here from the
   station's own c4 graph — never from the keys the generator wrote. Real clicks, located by the words a chip draws. */
{ await open(PAGE);
  const c4s = fs.readFileSync(path.join(REPO, 'templates/center/shell/example/codebase-graph-station/c4-graph.js'), 'utf8');
  const c4w = {}; (await import('node:vm')).runInNewContext(c4s, { window: c4w }); const C4 = c4w.GABE_C4, M2T = {};   /* the station's own feed, run as the station runs it */
  Object.values(C4.l2 || {}).forEach((e) => (e.nodes || []).forEach((n) => { if (n.kind === 'model' && n.table) M2T[n.label] = n.table; }));
  const uniOf = (r, row) => (r.uni.rows.find((u) => u.row === row) || { items: [] }).items;
  /* where the card draws a table: an access line, a model chip, a model class its signature or its payload names */
  const uniTables = (r) => new Set([...uniOf(r, 'ACCESSES').map((o) => o[2]),
    ...uniOf(r, 'CONNECTIONS').filter((g) => g[5] === 'model').flatMap((g) => g[3].concat(g[7])).map((m) => M2T[m]),
    ...(String(uniOf(r, 'SIGNATURE')[0] || '').match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).map((w) => M2T[w]),
    ...[/→ (\S+)/.exec((r.uni.rows.find((u) => u.row === 'PAYLOAD') || {}).value || '')].filter(Boolean).map((m) => M2T[m[1]])].filter(Boolean));
  /* where the code map names one: the tables and writes columns, the login check's writes, the tables list, a request or reply model */
  const cmTables = (r) => new Set([...(r.u.tables || []), ...(r.u.written || []), ...r.d.gateWrites, ...r.d.tables.items.map((x) => x[0]),
    ...[r.d.request && r.d.request[0], r.d.response && r.d.response[0]].map((m) => M2T[m]).filter(Boolean)]);
  const holdsT = (r, t) => uniTables(r).has(t) || cmTables(r).has(t);
  const EP = 'POST /setup/complete', T0 = 'households', CLS = Object.keys(M2T).find((c) => M2T[c] === T0), WEL = D.words.el;
  const lit = () => p.evaluate(() => ({ on: [...document.querySelectorAll('#board tr.row[data-el="on"]')].map((e) => e.getAttribute('data-ep')).sort(),
    off: document.querySelectorAll('#board tr.row[data-el="off"]').length,
    cells: Object.fromEntries([...document.querySelectorAll('#board tr.row[data-el="on"]')].map((e) => [e.getAttribute('data-ep'),
      [...e.querySelectorAll('[data-elcell]')].map((c) => c.classList.contains('id') ? 'id' : (c.querySelector('[data-col]') || {}).getAttribute('data-col')).sort()])),
    pin: [...document.querySelectorAll('#pin [data-elcell]')].length, chip: document.getElementById('elchip').hidden ? null : document.getElementById('elsays').textContent,
    uni: [...document.querySelectorAll('#ocol-uni .elon')].map((e) => [(e.closest('.urow') || {}).getAttribute('data-row'), e.textContent.trim()]),
    cm: [...document.querySelectorAll('#ocol-cm .elon')].map((e) => [(e.closest('.pair') || {}).getAttribute('data-k'), e.textContent.trim()]),
    sayU: document.getElementById('el-uni').hidden ? null : [document.getElementById('el-uni').getAttribute('data-here'), document.getElementById('el-uni').textContent],
    sayC: document.getElementById('el-cm').hidden ? null : [document.getElementById('el-cm').getAttribute('data-here'), document.getElementById('el-cm').textContent],
    open: window.__allep.state.open, out: document.getElementById('out').value, any: document.querySelectorAll('[data-el], [data-elcell], .elon').length }));
  await p.click('#board tr.row[data-ep="' + EP + '"] td.id'); await p.waitForTimeout(60);
  /* D-043 · in the code-map column of POST /setup/complete every verb and every catalog value is a chip that carries a colour or an
     icon and keeps its words (aria-label or text), every family the words file names is drawn, and no catalog word is left as
     plain text outside a chip. The catalog words are read HERE from the words file and the lifted encodings; free text is not a
     catalog slot (what an ending says, a piece's own sentence, the labels, the table's state words), nor is the key behind the toggle */
  const enc = await p.evaluate(() => { const D = window.__allep.data, W = D.words, F = W.enc.fam, cm = document.getElementById('ocol-cm'), ink = getComputedStyle(document.body).color;
    const chips = [...cm.querySelectorAll('.vc')].filter((c) => !c.closest('.ainfo')), bare = [], fams = new Set();
    chips.forEach((c) => { fams.add(c.getAttribute('data-vc')); const cs = getComputedStyle(c), ico = !!c.querySelector('svg, .spine');
      const fill = [c, ...c.querySelectorAll('i')].some((x) => !/^rgba\(0, 0, 0, 0\)$|^transparent$/.test(getComputedStyle(x).backgroundColor));
      if (!(ico || fill || cs.color !== ink || parseFloat(cs.borderLeftWidth) >= 3) || !(c.getAttribute('aria-label') || c.textContent.trim())) bare.push(c.getAttribute('data-vc') + ':' + c.textContent); });
    const words = [...Object.values(W.kinds).map((x) => x.name), ...D.orders.stageRows, ...Object.values(W.fates).map((x) => x.name), ...Object.values(W.pieceWords).map((x) => x.name),
      ...Object.keys(D.enc.ifk), ...Object.keys(F.life.vals), ...Object.keys(F.switch.vals), ...D.families, ...Object.keys(D.enc.rule), ...Object.keys(D.enc.role), ...Object.keys(D.enc.hrole),
      ...Object.keys(F.branch.vals), ...Object.keys(F.does.vals), ...Object.values(D.enc.op).map((o) => o.chip), 'rw', 'r', 'w', ...Object.values(D.enc.dir).map((o) => o.chip), 'GET', 'POST', 'PUT', 'PATCH', 'DELETE']
      .filter((w) => w && w[0] !== '_').sort((x, y) => y.length - x.length);
    const rx = new RegExp('(?<![\\w-])(' + words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\w-])'), st = /(?<![\w:./–-])[1-5]\d\d(?![\w/])/;
    const plain = [], tw = document.createTreeWalker(cm, NodeFilter.SHOW_TEXT); let t;
    while ((t = tw.nextNode())) { const x = t.textContent.trim(); if (!x || x === W.panel.none || t.parentElement.closest('.vc, .pk, .cbh, th, td.says, .pw, .ab, .ainfo, .elsay, h3')) continue;
      const m = rx.exec(x) || st.exec(x); if (m) plain.push([(t.parentElement.closest('.pair') || {}).getAttribute && t.parentElement.closest('.pair').getAttribute('data-k'), m[0], x.slice(0, 50)]); }
    return { n: chips.length, bare, plain, missing: Object.keys(F).filter((f) => !F[f].station && !fams.has(f)) }; });   /* a station family (D-052) is drawn only where an element wears it */
  ok(enc.n > 100 && !enc.bare.length && !enc.missing.length && !enc.plain.length,
    'D-043 · ' + EP + ' · every verb and catalog value in the code-map column is a chip carrying a colour or an icon and its words, every family is drawn, and no catalog word is left as plain text', { chips: enc.n, bare: enc.bare.slice(0, 4), missing: enc.missing, plain: enc.plain.slice(0, 4) });
  /* D-052 · on POST /setup/complete every code-map mention of an element the station draws as a node carries that kind's glyph in
     its KINDCOL colour, and every mention whose kind has a subcategory in the station's feed carries that label in its __BADGE_COL
     colour. Recomputed HERE from the station's own file and feeds (GLYPH · KINDCOL · VIEWCOL · ENT · inkCol · __BADGE_COL · the c4
     graph · levels.json); the words file's station.map says which station kind a page key kind is drawn as (the agent's proposal) */
  { const ST = fs.readFileSync(path.join(REPO, 'templates/center/shell/example/codebase-graph-station/gabe-universe.html'), 'utf8');
    const lit = (m) => { const i = ST.indexOf(m), j = ST.indexOf('{', i); let d = 0, k = j, q = null;
      for (; k < ST.length; k++) { const c = ST[k]; if (q) { if (c === '\\') k++; else if (c === q) q = null; continue; }
        if (ST.startsWith('//', k)) { k = ST.indexOf('\n', k); continue; } if (ST.startsWith('/*', k)) { k = ST.indexOf('*/', k) + 1; continue; }   /* a comment's quote is no string */
        if (c === '"' || c === "'") q = c; else if (c === '{') d++; else if (c === '}' && !--d) break; }
      return ST.slice(j, k + 1); };
    const vm = await import('node:vm'), ev = (x, ctx) => vm.runInNewContext('(' + x + ')', ctx || {});
    const GL = ev(lit('var GLYPH={')); for (const [, g, v] of ST.matchAll(/(?<![\w.])GLYPH\.(\w+)\s*=\s*('(?:[^'\\]|\\.)*')/g)) if (!GL[g]) GL[g] = ev(v);
    const KC = ev(lit('var KINDCOL={')); for (const [, k, c] of ST.matchAll(/(?<![\w.])KINDCOL\.(\w+)\s*=\s*"(#[0-9a-fA-F]+)"/g)) KC[k] = c;
    const VIEW = /var VIEWCOL="(#[0-9a-fA-F]+)"/.exec(ST)[1], BC = ev(lit('window.__BADGE_COL={'));
    const ink = vm.runInNewContext('(function(){ var window={__uniTheme:"light"}; return ' + ST.slice(ST.indexOf('function inkCol(hex)'), ST.indexOf('function onCol(')) + '})()');
    const LVJ = JSON.parse(fs.readFileSync(path.join(REPO, 'templates/center/shell/example/codebase-graph-station/levels.json'), 'utf8'));
    const ROLE = Object.fromEntries((LVJ.fn_nodes || []).map((f) => ['fn:' + f.id.replace('#', '::'), f.role]));
    const NODE = {}; Object.values(C4.l2 || {}).forEach((e) => (e.nodes || []).forEach((n) => { NODE[n.id] = n; }));
    const FEP = Object.fromEntries(((C4.fe || {}).pieces || []).map((x) => [x.id, x])), FK = { 'fe-type': 'type', 'fe-unknown': 'unknown' }, MAP = D.words.station.map;
    const want = (K) => { const kind = K.slice(0, K.indexOf(':')), id = K.slice(K.indexOf(':') + 1), to = (MAP[kind] || {}).to; let sk = to, subs = [], ent = null;
      if (to === 'fe') { const x = FEP[K]; if (!x) return null; sk = FK[x.kind] || x.kind;
        if (sk === 'component' && x.feClass === 'view') sk = 'view'; else if (sk === 'component' && BC.feclass[x.feClass]) subs = [['feclass', x.feClass]];
        else if (sk === 'hook' && BC.hrole[x.hrole]) subs = [['hrole', x.hrole]]; else if (sk === 'module' && BC.mclass[x.mclass]) subs = [['mclass', x.mclass]]; }
      else if (to === 'element') { if (!NODE['element:' + id]) return null; }
      else if (to === 'endpoint') { if (!NODE[K]) return null; const m = /^(GET|POST|PUT|PATCH|DELETE|BOOT|TASK)\b/.exec(NODE[K].label || id); if (m) subs.push(['method', m[1]]); if (NODE[K].stream) subs.push(['delivery', 'stream']); }
      else if (to === 'function') { if (!(K in ROLE)) return null; if (BC.role[ROLE[K]]) subs = [['role', ROLE[K]]]; }   /* a node only where the station's function layer holds it (D-052 review F1) */
      else if (to === 'model') { if (kind === 'table' && !Object.values(NODE).some((n) => n.kind === 'model' && n.table === id)) return null; }
      else if (to === 'schema' || to === 'flag') { if (!NODE[K]) return null; }
      else if (to === 'entity') ent = id;
      else if (!to && kind === 'setting' && Object.values(NODE).some((n) => n.kind === 'flag' && ((n.det || {}).aliases || []).includes(id))) sk = 'flag';   /* the station's own alias (F2) */
      if (!sk) return null;
      const hex = sk === 'view' ? VIEW : ent ? (C4.colors || {})[ent] : KC[sk];
      return { sk, glyph: GL[sk === 'view' ? 'screen' : sk], hex, subs: subs.map(([f, v]) => [f, v, BC[f][v]]) }; };
    const got = await p.evaluate(() => { const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (document.documentElement.getAttribute('data-theme') !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
      return { dark, m: [...document.querySelectorAll('#ocol-cm [data-key]')].filter((n) => !n.closest('.ainfo')).map((n) => { const g = n.querySelector(':scope > .skg:first-child, :scope > .vc-ent:first-child > .skg');   /* the entity's glyph sits in its chip */
        return { K: n.getAttribute('data-key'), sk: g && g.getAttribute('data-sk'), svg: g ? g.querySelector('svg').innerHTML : null, col: g ? getComputedStyle(g).color : null,
          subs: [...n.querySelectorAll(':scope > .sksub')].map((x) => [x.getAttribute('data-vc'), x.getAttribute('data-vv'), getComputedStyle(x).backgroundColor]),
          discs: [...n.querySelectorAll(':scope > .sksub')].filter((x) => { const cv = x.querySelector(':scope > canvas.skd'); if (!cv) return true; const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return false; return true; }).length }; }) }; });   /* F4: each label carries the station's painted disc */
    const rgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return 'rgb(' + [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16)).join(', ') + ')'; };
    const norm = async (g) => p.evaluate((x) => { const t = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); t.innerHTML = x; return t.innerHTML; }, g);
    const badG = [], badS = [], seen = { kinds: new Set(), subs: new Set() };
    for (const x of got.m) { const w = want(x.K);
      if (!w) { if (x.sk) badG.push([x.K, 'a glyph on a kind the station draws no node for']); continue; }
      const hex = got.dark ? w.hex : ink(w.hex);
      if (x.sk !== w.sk || x.svg !== await norm(w.glyph) || x.col !== rgb(hex)) badG.push([x.K, x.sk, w.sk, x.col, rgb(hex)]); else seen.kinds.add(w.sk);
      const ws = JSON.stringify(w.subs.map(([f, v, c]) => [f, v, rgb(c)])); if (JSON.stringify(x.subs) !== ws || x.discs) badS.push([x.K, x.subs, ws, x.discs]); else w.subs.forEach(([f]) => seen.subs.add(f)); }
    ok(got.m.length > 20 && !badG.length && ['endpoint', 'function', 'model', 'schema', 'entity', 'hook'].every((k) => seen.kinds.has(k)),
      'D-052 · ' + EP + ' · every code-map mention with a station kind carries that kind\'s glyph in its KINDCOL colour (recomputed from the station file), and none without one does',
      { n: got.m.length, bad: badG.slice(0, 4), kinds: [...seen.kinds] });
    ok(!badS.length && ['method', 'role', 'hrole'].every((f) => seen.subs.has(f)),
      'D-052 · ' + EP + ' · every code-map mention whose kind has a subcategory in the station\'s feed carries that label at its end, in the __BADGE_COL colour', { bad: badS.slice(0, 4), fams: [...seen.subs] }); }
  ok(!!CLS && uniOf(ROW[EP], 'CONNECTIONS').some((g) => g[5] === 'model' && g[3].includes(CLS)), 'the c4 graph names the model class of ' + T0 + ', and ' + EP + '\'s card draws it as a connection chip', CLS);
  await p.locator('#ocol-uni .urow[data-row="CONNECTIONS"] .pchip', { hasText: new RegExp('^' + CLS + '$') }).first().click(); await p.waitForTimeout(80);
  const a = await lit(), want = FEED.filter((ep) => holdsT(ROW[ep], T0)).sort();
  const wantCells = Object.fromEntries(want.map((ep) => [ep, ['tables', 'written'].filter((c) => (ROW[ep].u[c] || []).includes(T0)).sort()]));
  ok(JSON.stringify(a.on) === JSON.stringify(want) && a.off === FEED.length - want.length && JSON.stringify(Object.entries(a.cells).sort()) === JSON.stringify(Object.entries(wantCells).sort()) && a.pin > 0
    && a.chip && a.chip.includes(T0) && a.chip.includes(String(want.length)) && a.out.includes(D.words.copy.lines.el + ': ' + T0 + ' (' + WEL.kinds.table + ') · table:' + T0),
    'clicking the ' + CLS + ' chip in the universe lights exactly the table rows whose record holds ' + T0 + ' (recomputed here), the columns that count it, the pinned row, the chip and the copy text',
    { lit: a.on.length, want: want.length, chip: a.chip, cellsBad: want.filter((ep) => JSON.stringify(a.cells[ep]) !== JSON.stringify(wantCells[ep])).slice(0, 3) });
  ok(a.cm.some(([k, t]) => k === 'd:tables' && t.startsWith(T0 + ' ')) && a.cm.some(([k]) => k === 'c:tables') && a.uni.some(([rw, t]) => rw === 'ACCESSES' && t.endsWith('· ' + T0))
    && a.uni.filter(([rw, t]) => rw === 'CONNECTIONS' && t === CLS).length >= 1 && a.sayU[0] === 'true' && a.sayC[0] === 'true',
    'the same element lights in the code-map column (its tables pair and its list item) and wherever the universe card draws it (the access lines, the model chips)', { uni: a.uni, cm: a.cm });
  /* D-043 · the light still lights the code map's "households · rw" item: the lit item of the tables pair is that table, and the
     read-and-write it carries is now the channel chip inside it (its op read here from the row record) */
  const rwWant = (ROW[EP].d.tables.items.find((x) => x[0] === T0) || [])[1];
  const rwLit = await p.evaluate(() => [...document.querySelectorAll('#ocol-cm .pair[data-k="d:tables"] li.elon')].map((li) => { const c = li.querySelector('.vc[data-vc="op"]');
    return [li.textContent.trim(), c ? c.getAttribute('data-vv') : null, c ? c.getAttribute('aria-label') : null]; }));
  ok(rwWant === 'rw' && rwLit.length === 1 && rwLit[0][0].startsWith(T0 + ' ') && rwLit[0][1] === rwWant && !!rwLit[0][2],
    'D-043 · the element light still lights the code map\'s "' + T0 + ' · rw" item, the RW chip inside it', rwLit);
  /* another endpoint, the light kept: a row that holds it, clicked in the table */
  const other = want.find((ep) => ep !== EP && ROW[ep].u.written && ROW[ep].u.written.includes(T0)) || want.find((ep) => ep !== EP);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + other + '"] td.id'); await p.waitForTimeout(80);
  /* CHANGED 2026-09-24 (D-042): the code map's line says "here" only where it NAMES the element — its tables list, the login
     check's writes, a request or reply model; a count that holds it lights with it, and the line then says why */
  const cmNamesT = (r, t) => r.d.tables.items.some((x) => x[0] === t) || r.d.gateWrites.includes(t) || [r.d.request && r.d.request[0], r.d.response && r.d.response[0]].some((m) => m && M2T[m] === t);
  const b10 = await lit(), nU = uniTables(ROW[other]).has(T0), nC = cmNamesT(ROW[other], T0);
  ok(b10.open === other && JSON.stringify(b10.on) === JSON.stringify(want) && (b10.sayU[0] === 'true') === nU && (b10.sayC[0] === 'true') === nC && (b10.uni.length > 0) === nU,
    'choosing another endpoint keeps the element lit, and its two columns say whether they hold it', { other, sayU: b10.sayU, sayC: b10.sayC });
  /* a place that lacks it says so: the login check's table, which POST /setup/complete's code map names and its card does not */
  await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + EP + '"] td.id'); await p.waitForTimeout(60);
  const T1 = ROW[EP].d.gateWrites.find((t) => !uniTables(ROW[EP]).has(t));
  await p.locator('#ocol-cm .pair[data-k="d:gateWrites"] .pv span', { hasText: new RegExp('^' + T1 + '$') }).first().click(); await p.waitForTimeout(60);
  const c10 = await lit();
  ok(!!T1 && c10.sayU && c10.sayU[0] === 'false' && c10.sayU[1].includes(T1) && c10.sayU[1].includes(WEL.places.uni) && !c10.uni.length && c10.sayC[0] === 'true' && c10.cm.length > 0,
    'an element the universe card lacks: the universe column says plainly it is not there, the code map outlines where it is', { T1, sayU: c10.sayU, cm: c10.cm.length });
  /* out: the same element again, then Escape, then the clear link */
  await p.locator('#ocol-cm .pair[data-k="d:gateWrites"] .pv span', { hasText: new RegExp('^' + T1 + '$') }).first().click(); await p.waitForTimeout(40);
  const d1 = await lit();
  await p.locator('#ocol-cm .pair[data-k="d:gateWrites"] .pv span', { hasText: new RegExp('^' + T1 + '$') }).first().click(); await p.waitForTimeout(40);
  await p.keyboard.press('Escape'); await p.waitForTimeout(40); const d2 = await lit();
  await p.locator('#ocol-cm .pair[data-k="d:gateWrites"] .pv span', { hasText: new RegExp('^' + T1 + '$') }).first().click(); await p.waitForTimeout(40);
  await p.click('#elclear'); await p.waitForTimeout(40); const d3 = await lit();
  ok([d1, d2, d3].every((x) => x.any === 0 && x.chip === null && x.sayU === null && x.sayC === null && !x.out.includes(D.words.copy.lines.el + ': ')),
    'clicking it again, Escape, and clear each put everything out: no row lit or dimmed, no cell or element outlined, no chip, no line, no copy line', [d1.any, d2.any, d3.any]);

  /* 11 · D-042: when the code map does not NAME a lit element, its line says why. What each case expects is recomputed HERE from
     the forms feed and inventory-endpoint.md: the cases whose calls ACT on the endpoint (the tests column counts those calls), the
     cases that only arrange through it, and the rating of the attribute Code behind shows. Real mouse, on POST /setup/complete. */
  const EPK = 'endpoint:' + EP, TC = FJ.test_cases || {};
  const callsOn = (cid, role) => ((TC[cid] || {}).calls || []).filter((c) => c.endpoint === EPK && c.role === role).length;
  const actCalls = Object.keys(TC).reduce((n, cid) => n + callsOn(cid, 'act'), 0);
  const invRate = (label) => { const row = fs.readFileSync(path.join(REPO, 'docs/design/design-context/inventory-endpoint.md'), 'utf8').split('\n')
    .find((l) => l.toLowerCase().startsWith('| ' + label.toLowerCase() + ' |')); return row ? Number((row.split('|')[4].match(/\d/) || [])[0]) : null; };
  const whyOf = () => p.evaluate(() => { const s = document.getElementById('el-cm'); return { here: s.getAttribute('data-here'), text: s.textContent,
    why: [...s.querySelectorAll('.elwhy')].map((w) => [w.getAttribute('data-why'), [...w.querySelectorAll('.elref')].map((b) => b.getAttribute('data-ref')), (w.querySelector('.elat') || {}).textContent || null]),
    named: [...document.querySelectorAll('#ocol-cm [data-key]')].map((e) => e.getAttribute('data-key')), elref: [...document.querySelectorAll('[data-elref]')].map((e) => [e.getAttribute('data-k') || e.getAttribute('data-fact') || e.getAttribute('data-gdir'), e.getAttribute('data-elref')]) }; });
  const lightVisible = async (K) => { const h = await p.evaluateHandle((k) => [...document.querySelectorAll('#ocol-uni [data-key]')].find((e) => e.getAttribute('data-key') === k && e.offsetParent), K);
    const e = h.asElement(); if (!e) return false; await e.evaluate((x) => x.scrollIntoView({ block: 'center' })); await p.waitForTimeout(60); await e.click(); await p.waitForTimeout(80); return true; };
  await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + EP + '"] td.id'); await p.waitForTimeout(60);
  // (1) a case that ACTS here: counted by the tests column, never named — and the link lights exactly that field
  const cardCases = ROW[EP].uni.rows.find((u) => u.row === 'TESTS').items.map((c) => c[0]);
  const K1 = cardCases.find((cid) => callsOn(cid, 'act') > 0); let e1 = null, h1 = null;
  if (K1 && await lightVisible('case:' + K1)) { e1 = await whyOf();
    const ln = await p.$('#el-cm .elref[data-ref="c:acts"]'); if (ln) { await ln.evaluate((x) => x.scrollIntoView({ block: 'center' })); await p.waitForTimeout(60);
      const bx = await ln.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(80); h1 = await whyOf(); await p.mouse.move(5, 5); } }
  const R1 = ROW[EP].k.acts;
  ok(!!K1 && R1 === actCalls && e1 && e1.here === 'false' && !e1.named.includes('case:' + K1) && e1.why.some(([w, refs]) => w === 'cnt' && refs.includes('c:acts'))
    && h1 && h1.elref.length === 1 && h1.elref[0][0] === 'c:acts' && h1.elref[0][1] === 'hover',
    'a case that acts on ' + EP + ' (the feed\'s act calls, ' + actCalls + ', are the tests column\'s count): the code map says "counted, not named" with a link to the tests field, and pointing at the link lights exactly that field',
    { K1, drawn: R1, feed: actCalls, why: e1 && e1.why, lit: h1 && h1.elref });
  // (2) a callee of Code behind that touches no data — CHANGED 2026-09-26 (D-056 (1)): the code map's behind pair now names every
  // function behind the handler, so the callee is NAMED there (it said "low priority, counted, not named" before)
  const fns2 = new Set([...(ROW[EP].u.datafns || []), ...(ROW[EP].u.deciders || [])].map((q) => q.split('::').pop()));
  const cb = ROW[EP].uni.rows.find((u) => u.row === 'CODE BEHIND'), i2 = cb.items.findIndex((nm, i) => cb.keys[i] && !fns2.has(nm)), K2 = i2 >= 0 ? cb.keys[i2] : null;
  let e2 = null, b2 = []; if (K2) { await p.evaluate(() => window.scrollTo(0, 0)); if (await lightVisible(K2)) e2 = await whyOf();
    b2 = await p.$$eval('#ocol-cm .pair[data-k="d:behind"] [data-key]', (cs) => cs.map((c) => c.getAttribute('data-key'))); }
  ok(!!K2 && e2 && e2.here === 'true' && b2.includes(K2) && JSON.stringify(b2) === JSON.stringify(ROW[EP].dk.behind),
    'D-056 · a Code behind callee that touches no data (' + (K2 || '').split('::').pop() + ') is named by the code map\'s behind pair, which names every function behind by name (' + b2.length + ')', { K2, here: e2 && e2.here, n: b2.length });
  // (3) a case that only ARRANGES through this endpoint
  const arr = new Set(((FJ.endpoints[EPK] || {}).tests || {}).arranged_by || []), inExits = new Set(ROW[EP].d.exits.items.length ? ROW[EP].dk.exits.flatMap((x) => x[1]) : []);
  const K3 = cardCases.find((cid) => arr.has(cid) && !callsOn(cid, 'act') && !inExits.has('case:' + cid)); let e3 = null;
  if (K3) { await p.evaluate(() => window.scrollTo(0, 0)); if (await lightVisible('case:' + K3)) e3 = await whyOf(); }
  // CHANGED 2026-09-26 (D-056 (2)): the code map's pair "arranges other cases" names every case the feed lists in tests.arranged_by and
  // helper_arranged — the case that only arranges is NAMED there now (it said "not carried", with a link to THE GAPS, before)
  const arr3 = await p.$$eval('#ocol-cm .pair[data-k="d:arranged"] [data-key]', (cs) => cs.map((c) => c.getAttribute('data-key')));
  const want3 = [...new Set([...(((FJ.endpoints[EPK] || {}).tests || {}).arranged_by || []), ...(((FJ.endpoints[EPK] || {}).tests || {}).helper_arranged || [])])].map((c) => 'case:' + c);   /* review F1: one per case */
  ok(!!K3 && e3 && e3.here === 'true' && arr3.includes('case:' + K3) && JSON.stringify(arr3) === JSON.stringify(want3),
    'D-056 · a case that only arranges through ' + EP + ' (' + K3 + ') is named by the code map\'s "' + D.words.panel.arranged.replace('{n}', want3.length) + '" pair, which lists exactly the feed\'s ' + want3.length + ' arranging cases', { K3, here: e3 && e3.here, arr3: arr3.length, want: want3.length });
  await p.click('#elclear').catch(() => {}); await p.click('#ocol-gaps .opt[data-gdir="cm"]').catch(() => {}); await p.waitForTimeout(60); }
/* 12 · D-044: a gap's hover says WHY the gap exists (D-042's reasons) and a STATUS (my proposal): solved elsewhere · not solving · open.
   On POST /setup/complete, the gaps the other way: every item's hover carries a reason in D-042's words and one of the three statuses;
   and a "solved elsewhere" item's link lights the field it names — pointing lights it, a click keeps it lit, Escape puts it out. Real mouse. */
{ const EP12 = 'POST /setup/complete', GSW = D.words.one.gaps.status, WHYW = [...Object.values(D.words.el.why.codes), ...Object.values(GSW.aWhy)].map((c) => c.name);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + EP12 + '"] td.id'); await p.waitForTimeout(60);
  await p.click('#ocol-gaps .opt[data-gdir="uni"]'); await p.waitForTimeout(60);
  await p.evaluate(() => document.querySelectorAll('#ocol-gaps .gfmore').forEach((x) => x.click()));
  const items = await p.$$('#ocol-gaps [data-gw]'), bad = [], seen = {}; let solvedAt = null;
  for (const it of items) { await it.evaluate((x) => x.scrollIntoView({ block: 'center' })); await it.hover(); await p.waitForTimeout(15);
    const h = await p.evaluate(() => { const t = document.getElementById('tip'), gw = t.querySelector('.gw'), gs = t.querySelector('.gs');
      return { show: t.getAttribute('data-show'), why: gw ? [...gw.querySelectorAll('b')].map((b) => b.textContent) : [], st: gs ? gs.getAttribute('data-st') : null,
        stName: gs && gs.querySelector('b') ? gs.querySelector('b').textContent : null, links: t.querySelectorAll('.elref[data-gref]').length }; });
    const gw = await it.getAttribute('data-gw');
    if (h.show !== 'true' || !h.why.length || !h.why.every((w) => WHYW.includes(w)) || !GSW.words[h.st] || h.stName !== GSW.words[h.st].name || (h.st === 'solved') !== (h.links > 0)) bad.push([gw, h]);
    else { seen[h.st] = (seen[h.st] || 0) + 1; if (h.st === 'solved' && !solvedAt) solvedAt = gw; } }
  const nB = (ROW[EP12].rgaps || []).reduce((n, g) => n + (g[2] ? 1 : 0) + g[1].length + g[3].length, 0);
  ok(nB > 0 && items.length === nB && !bad.length, 'every gap the other way on ' + EP12 + ' (' + nB + ') has a hover with a reason in D-042\'s words and a status; a solved one carries a link', { n: items.length, nB, bad: bad.slice(0, 3), seen });
  const lit = () => p.evaluate(() => [...document.querySelectorAll('[data-elref]')].map((e) => [e.getAttribute('data-k'), e.getAttribute('data-elref')]));
  let ref = null, l1 = null, l2 = null, l3 = null;
  if (solvedAt) { const g = await p.$('#ocol-gaps [data-gw="' + solvedAt + '"]'); await g.evaluate((x) => x.scrollIntoView({ block: 'center' })); await p.waitForTimeout(40); await g.hover(); await p.waitForTimeout(60);
    const ln = await p.$('#tip .elref[data-gref]'); ref = ln && await ln.getAttribute('data-gref'); const bx = ln && await ln.boundingBox();
    if (bx) { await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2, { steps: 4 }); await p.waitForTimeout(80); l1 = await lit(); await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(100); l2 = await lit(); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(40); l3 = await lit(); }
  ok(!!ref && l1 && l1.length === 1 && l1[0][0] === ref && l1[0][1] === 'hover' && l2 && l2.length === 1 && l2[0][0] === ref && l2[0][1] === 'pin' && l3 && !l3.length,
    'a "solved elsewhere" gap (' + solvedAt + ') links the field it names: pointing at the link lights ' + ref + ' in the code map, a click keeps it lit, Escape puts it out', { ref, l1, l2, l3 });
  await p.mouse.move(5, 5); await p.click('#ocol-gaps .opt[data-gdir="cm"]').catch(() => {}); await p.waitForTimeout(40); }
/* 13 · D-053: ONE endings table, its rows in the order the endings happen. On POST /recipe-creation/gustify the rows are read off
   the page and held against the order the operator verified from the chain, the source and FastAPI: the edge's two limiters, FastAPI
   reading the body, the login, FastAPI checking the fields, the handler's own checks, the pipeline's failures in the order of their
   isinstance lines, the success, the uncaught. Each row's identity is told apart HERE from forms.json (a limiter by the key its
   condition reads, a check by its line or the handler line it sits inside). The body read keeps the chain's order: FastAPI's
   `except JSONDecodeError` (422) is met before its `except Exception` (400). Every own check sits on the row of the ending the
   feed says it produces; the moment headers are the chain's, recomputed here — a failure group names a call only when the feed shows
   it raising into the catch (the ending's own check inside it, its raise translated into the ending, or a raise of the caught class
   in a function reached from it), for every group on every endpoint; the fates end where the endings end; a check a dependency makes
   is drawn under the dependency that makes it; both looks switch and are remembered; a guard lit lands on its row's check. Real clicks. */
{ const E13 = 'POST /recipe-creation/gustify', FE = FJ.endpoints['endpoint:' + E13], EW = D.words.endings, X = {};
  [...(FE.produced || []), ...(FE.framework_exits || []), ...(FE.returns || [])].forEach((x) => { X[x.id] = x; });
  await open(PAGE); await p.click('#board tr.row[data-ep="' + E13 + '"] td.id'); await p.waitForTimeout(80);
  const readE = () => p.evaluate(() => { const t = document.querySelector('#ocol-cm .pair[data-k="d:exits"] table.etab');
    return { mom: t.getAttribute('data-mom'), chk: t.getAttribute('data-chk'), guardsPair: document.querySelectorAll('#ocol-cm .pair[data-k="d:guards"]').length,
      sub: document.querySelectorAll('#ocol-cm .pair[data-k="d:exits"] th[data-sub][data-k="d:guards"]').length,
      rows: [...t.querySelectorAll('tr')].map((tr) => tr.classList.contains('mom') ? { head: tr.getAttribute('data-mom'), text: tr.textContent.replace(/\s+/g, ' ').trim() }
        : tr.classList.contains('erow') ? { x: tr.getAttribute('data-x'), mom: tr.getAttribute('data-mom'), stage: (tr.querySelector('.vc-stage b') || {}).textContent || null,
            chip: (tr.querySelector('.vc-stage .mw') || {}).textContent || null, status: (tr.querySelector('.vc-status') || {}).textContent || null,
            checks: [...tr.querySelectorAll('.ck')].map((c) => c.getAttribute('data-key')), line: !!tr.querySelector('td.says .ckl .ck'), col: !!tr.querySelector('td.chk'),
            shared: !!tr.querySelector('.shd') } : null).filter(Boolean),
      fates: [...document.querySelectorAll('#ocol-cm .pair[data-k="d:fates"] li .vc-status')].map((c) => c.textContent),
      squares: [...document.querySelectorAll('#ocol-cm .opt[data-eopt]')].map((o) => [o.getAttribute('data-eopt'), o.getAttribute('data-v'), o.getAttribute('aria-checked'), getComputedStyle(o).borderTopStyle, o.getAttribute('aria-label')]) }; });
  const L13 = (x) => +((String(x.at || '').match(/:(\d+)/) || [])[1] || 0), V13 = (x) => +((String(x.via || '').match(/^call .+ @ .+:(\d+)$/) || [])[1] || 0);
  const want = [['EDGE', 429, (x) => /_sensitive/.test(x.pred || '')], ['EDGE', 429, (x) => /_global/.test(x.pred || '')],
    ['INPUT', 422, (x) => x.phase === 'body-parse' && x.code === 'json_invalid'], ['INPUT', 400, (x) => x.phase === 'body-parse'],
    ['GATE', 401, (x) => x.phase === 'security'], ['GATE', 401, (x) => x.phase === 'dependency'], ['INPUT', 422, (x) => x.phase === 'validation'],
    ['HANDLER', 403, (x) => L13(x) === 236], ['HANDLER', 409, (x) => V13(x) === 240], ['HANDLER', 400, (x) => L13(x) === 243],
    ...[[166, 400], [168, 429], [175, 429], [184, 402], [188, 503], [194, 429], [200, 502], [207, 502]].map(([ln, st]) => ['HANDLER', st, (x) => V13(x) === 259 && L13(x) === ln]),
    ['ANSWER', 201, (x) => x.phase == null || x.phase === 'handler'], ['UNCAUGHT', 500, (x) => x.phase === 'uncaught']];
  const e0 = await readE(), er = e0.rows.filter((x) => x.x), bad13 = [];
  if (er.length !== want.length) bad13.push(['rows', er.length, want.length]);
  er.forEach((r, i) => { const w = want[i], x = X[r.x]; if (!w || !x || r.stage !== w[0] || x.status !== w[1] || r.status !== String(w[1]) || !w[2](x)) bad13.push([i, r.x, r.stage, r.status, w && w[0], w && w[1]]); });
  ok(!bad13.length, 'D-053 · ' + E13 + ' · the endings read in the order they happen — limiters, body read, login, field check, own checks, the failures by line, success, uncaught (' + want.length + ' rows, no cap)', bad13.slice(0, 4));
  /* the 11 own checks, one on each HANDLER row, each on the row of the ending the feed ties it to; shared code named on the rows it decides */
  const PRE = FE.preconditions || [], hand = er.filter((r) => r.stage === 'HANDLER'), onRow = er.flatMap((r) => r.checks.map((k) => [k, r.x]));
  const off13 = PRE.filter((g) => !onRow.some(([k, x]) => k === 'guard:' + g.id && x === g.exit)).map((g) => g.id);
  ok(PRE.length === 11 && hand.length === 11 && hand.every((r) => r.checks.length === 1) && onRow.length === PRE.length && !off13.length && e0.guardsPair === 0 && e0.sub === 1,
    'D-053 · the 11 own checks sit one on each of the 11 HANDLER rows, on the row of the ending the feed says each produces; no separate list of checks is left, its field is the table\'s check column',
    { pre: PRE.length, hand: hand.length, placed: onRow.length, off: off13, guardsPair: e0.guardsPair, sub: e0.sub });
  ok(er.filter((r) => ['EDGE', 'GATE', 'INPUT'].includes(r.stage)).every((r) => r.shared && !r.checks.length) && er.filter((r) => ['ANSWER', 'UNCAUGHT'].includes(r.stage)).every((r) => !r.shared && !r.checks.length),
    'D-053 · a row shared code decides names who decides it, apart; the success and the uncaught carry no check', er.map((r) => [r.stage, r.shared, r.checks.length]));
  /* the moment headers, recomputed from the chain here: INPUT's two, then the handler's checks, then the failure group — the catch
     its paths pass after the handler starts, and the calls listed between the last check before it and it, on lines above it */
  /* the calls a failure group names, recomputed from forms.json: between the handler's last gate before the catch (a gate in the
     catch's file) and the catch, in its file, above its line — each only when the feed shows it raising into the catch */
  const F13 = (a) => String(a || '').replace(/:\d+(-\d+)?$/, ''), PREPH = ['middleware', 'body-parse', 'security', 'dependency', 'validation'];
  const raisers = (ep, xid) => { const E = 'endpoint:' + ep, F0 = FJ.endpoints[E], XS = {}, out = {}; let cat = null;
    [...(F0.produced || []), ...(F0.framework_exits || []), ...(F0.returns || [])].forEach((x) => { XS[x.id] = x; });
    const reach = (site) => Object.values(FJ.functions || {}).filter((f) => (f.reached_by || []).some((b) => b.root === E && b.root_site === site)).flatMap((f) => f.raises || []);
    (F0.paths || []).filter((q) => q.exit.id === xid).forEach((q) => { const ch = q.chain;
      let lb = -1; ch.forEach((s, i) => { if (PREPH.includes(s.phase)) lb = i; });
      const cs = ch.map((s, i) => (s.kind === 'catch' && i > lb ? i : -1)).filter((i) => i >= 0); if (!cs.length) return;
      const ci = cs[cs.length - 1], c = ch[ci], cf = F13(c.at), cl = L13(c), cls = String(c.cls || '').split(/[|,]/).map((t) => t.trim()).filter(Boolean);
      cat = c; let pg = -1; ch.forEach((s, i) => { if (i < ci && s.kind === 'gate' && XS[s.ref] && s.ref !== xid && F13(s.at) === cf) pg = i; });
      for (let j = pg + 1; j < ci; j++) { const s = ch[j]; if (!(s.kind === 'call' || s.kind === 'collapsed') || F13(s.at) !== cf || !(L13(s) < cl)) continue;
        let nx = ci; for (let k = j + 1; k < ci; k++) if (ch[k].at && F13(ch[k].at) === cf) { nx = k; break; }
        const rs = reach(s.at), own = ch.slice(j + 1, nx).some((t) => t.kind === 'gate' && t.ref === xid);
        if (own || rs.some((r) => (r.translated_by || []).some((t) => t.endpoint === E && t.exit === xid)) || rs.some((r) => cls.some((k) => k === 'Exception' || k === 'BaseException') || cls.includes(r.cls))) out[s.call] = L13(s); } });
    return { cat, calls: out }; };
  const fl = er.find((r) => r.mom === 'failed'), R13 = raisers(E13, fl.x), cat = R13.cat || {};
  const calls = Object.keys(R13.calls).sort((a, b) => R13.calls[a] - R13.calls[b]);
  const failHead = EW.mom.failed.name + ' — ' + EW.caught.replace('{calls}', calls.join(' · ')).replace('{at}', String(cat.at).split('/').pop()).replace('{cls}', cat.cls);
  const heads = e0.rows.filter((x) => x.head), runOf = (h) => { const i = e0.rows.indexOf(h), out = []; for (let j = i + 1; j < e0.rows.length && !e0.rows[j].head; j++) if (e0.rows[j].mom === h.head) out.push(e0.rows[j].stage); return out; };
  ok(JSON.stringify(heads.map((h) => h.head)) === JSON.stringify(['body', 'fields', 'checks', 'failed'])
    && heads[0].text === EW.mom.body.name && heads[1].text === EW.mom.fields.name && heads[2].text === EW.mom.checks.name && heads[3].text === failHead
    && JSON.stringify(calls) === JSON.stringify(['generate_gustify_recipe']) && cat.at === 'apps/api/api/recipe_creation.py:258' && cat.cls === 'Exception'
    && JSON.stringify(heads.map((h) => runOf(h).length)) === JSON.stringify([2, 1, 3, 8]),
    'D-053 · the moment headers read as the chain has them — reads the body (2) · checks the fields (1) · checks (3) · after a call failed, naming the call the feed shows raising into it (generate_gustify_recipe; client_ip only runs inside the try) and the catch (8)', heads.map((h) => [h.head, h.text.slice(0, 120), runOf(h).length]).concat([[failHead]]));
  { /* every failure group on every endpoint names exactly the calls recomputed here, in line order */
    const badG = [];
    for (const ep of FEED) { const R = ROW[ep], groups = {};
      R.xd.exits.forEach((xe, i) => { if (typeof xe[0] !== 'number') return; const g = groups[xe[0]] = groups[xe[0]] || {}; Object.assign(g, raisers(ep, xe[2]).calls); });
      (R.d.exits.moms || []).forEach((m, gi) => { const g = groups[gi] || {}, want = Object.keys(g).sort((a, b) => g[a] - g[b] || (a < b ? -1 : 1));
        if (JSON.stringify(m[2]) !== JSON.stringify(want)) badG.push([ep, m[0], m[2], want]); }); }
    ok(!badG.length && FEED.reduce((n, ep) => n + (ROW[ep].d.exits.moms || []).length, 0) === 64, 'D-053 · on all ' + FEED.length + ' endpoints every failure group names exactly the calls the feed shows raising into its catch', badG.slice(0, 4)); }
  /* the fates: every path, in the endings' order, never capped — the list ends where the endings table ends */
  const fWant = er.flatMap((r) => (FE.paths || []).filter((q) => q.exit.id === r.x).map((q) => String(q.status)));
  ok(JSON.stringify(e0.fates) === JSON.stringify(fWant) && fWant.includes('201') && fWant[fWant.length - 1] === er[er.length - 1].status && FEED.every((ep) => ROW[ep].d.fates.more === 0 && ROW[ep].d.fates.items.length === (FJ.endpoints['endpoint:' + ep].paths || []).length),
    'D-053 · each path\'s fate follows the endings\' order and is never capped: on ' + E13 + ' the success is in the list and it ends where the endings end, and every endpoint lists every path', { fates: e0.fates, want: fWant });
  /* the info text says INPUT appears twice only where the rows show it, and the field check above the login only where it stands there */
  const eTexts = await p.$$eval('#ocol-cm .pair[data-k="d:exits"] .eplain p', (ps) => ps.map((x) => x.textContent));
  const runsIn = (ep) => { const st = ROW[ep].d.exits.items.map((e) => e[1]); return st.filter((s2, i) => s2 === 'INPUT' && st[i - 1] !== 'INPUT').length; };
  const aboveGate = (ep) => { const R = ROW[ep], f = R.xd.exits.map((x, i) => (x[0] === 'fields' ? i : -1)).filter((i) => i >= 0), g = R.d.exits.items.map((e, i) => (e[1] === 'GATE' ? i : -1)).filter((i) => i >= 0); return !!(f.length && g.length && Math.min(...f) < Math.max(...g)); };
  const enBad = FEED.filter((ep) => (ROW[ep].xd.en.includes('twice') !== (runsIn(ep) >= 2)) || (ROW[ep].xd.en.includes('first') !== aboveGate(ep)));
  ok(JSON.stringify(eTexts) === JSON.stringify([EW.plain, EW.plainInput, EW.plainChecks]) && !enBad.length && FEED.filter((ep) => ROW[ep].xd.en.includes('first')).join() === 'GET /recipe-creation/gustify/stream',
    'D-053 · the info text says INPUT appears twice only on the endpoints whose rows show it (' + FEED.filter((ep) => runsIn(ep) >= 2).length + '), and says a field check stands above the login check only on the stream, where it does', { eTexts: eTexts.length, enBad: enBad.slice(0, 3) });
  /* the two looks: my picks pressed and dashed on a cold start; each switches the table; both are remembered for this viewer */
  const sq0 = e0.squares, pick0 = (g) => EW.opt[g].pick;
  ok(sq0.length === 4 && sq0.every(([g, v, on, dash, lab]) => (on === 'true') === (v === pick0(g)) && (dash === 'dashed') === (v === pick0(g)) && lab === EW.opt[g].opts[v].name) && e0.mom === 'rows' && e0.chk === 'col',
    'D-053 · two looks on icon squares, my picks (moments as header rows, the check as its own column) pressed and dashed on a cold start', sq0);
  await p.$eval('#ocol-cm .opt[data-eopt="mom"][data-v="chip"]', (e) => e.scrollIntoView({ block: 'center' })); await p.click('#ocol-cm .opt[data-eopt="mom"][data-v="chip"]'); await p.waitForTimeout(80);
  const e1 = await readE(), er1 = e1.rows.filter((x) => x.x);
  ok(e1.mom === 'chip' && !e1.rows.some((x) => x.head) && er1.filter((r) => r.mom).length === 14 && er1.every((r) => r.mom ? r.chip === EW.mom[r.mom].name : !r.chip) && JSON.stringify(er1.map((r) => r.x)) === JSON.stringify(er.map((r) => r.x)),
    'D-053 · moments inside the stage chip: no header rows, each INPUT and HANDLER row\'s stage chip carries its moment, the order unchanged', er1.map((r) => [r.stage, r.chip]).slice(0, 12));
  await p.$eval('#ocol-cm .opt[data-eopt="chk"][data-v="line"]', (e) => e.scrollIntoView({ block: 'center' })); await p.click('#ocol-cm .opt[data-eopt="chk"][data-v="line"]'); await p.waitForTimeout(80);
  const e2 = await readE(), er2 = e2.rows.filter((x) => x.x);
  ok(e2.chk === 'line' && er2.every((r) => !r.col) && er2.filter((r) => r.checks.length).length === 11 && er2.filter((r) => r.checks.length).every((r) => r.line) && e2.sub === 1,
    'D-053 · the check as a line under the ending\'s words: no check column, each check under its ending\'s words, the field still found at the words\' head', { rows: er2.length, sub: e2.sub });
  await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready'); await p.waitForTimeout(80);
  const e3 = await readE();
  ok(e3.mom === 'chip' && e3.chk === 'line' && e3.squares.filter(([, , on]) => on === 'true').map(([g, v]) => g + ':' + v).sort().join(' ') === 'chk:line mom:chip', 'D-053 · both looks are remembered for this viewer', [e3.mom, e3.chk]);
  await p.$eval('#ocol-cm .opt[data-eopt="mom"][data-v="rows"]', (e) => e.scrollIntoView({ block: 'center' })); await p.click('#ocol-cm .opt[data-eopt="mom"][data-v="rows"]'); await p.waitForTimeout(60);
  await p.$eval('#ocol-cm .opt[data-eopt="chk"][data-v="col"]', (e) => e.scrollIntoView({ block: 'center' })); await p.click('#ocol-cm .opt[data-eopt="chk"][data-v="col"]'); await p.waitForTimeout(80);
  const e4 = await readE();
  ok(e4.mom === 'rows' && e4.chk === 'col' && JSON.stringify(e4.rows) === JSON.stringify(e0.rows), 'D-053 · the first squares bring back my picks, the table as it was', [e4.mom, e4.chk]);
  /* D-041 · a guard lit lands on its row's check: the login check's household guard, which many endpoints share — the rows lit are
     the endpoints whose feed record holds it, recomputed here; in the code map, the check on the 409 row */
  const G13 = PRE.find((g) => g.exit && V13(g) === 240), GK = 'guard:' + (G13 || {}).id, sel13 = '#ocol-cm tr.erow[data-x="' + (G13 || {}).exit + '"] .ck[data-key="' + GK + '"]';
  await p.$eval(sel13, (e) => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(60); await p.click(sel13); await p.waitForTimeout(100);
  const g13 = await p.evaluate((K) => ({ on: [...document.querySelectorAll('#board tr.row[data-el="on"]')].map((e) => e.getAttribute('data-ep')).sort(),
    cells: [...document.querySelectorAll('#board tr.row[data-el="on"] [data-elcell]')].map((c) => (c.querySelector('[data-col]') || c).getAttribute('data-col')).filter(Boolean),
    cm: [...document.querySelectorAll('#ocol-cm .elon')].filter((e) => e.getAttribute('data-key') === K).map((e) => [e.closest('tr.erow') ? e.closest('tr.erow').getAttribute('data-x') : null, e.getAttribute('data-key')]),
    col: !!document.querySelector('#ocol-cm .pair.elon[data-k="c:guards"]'),
    here: document.getElementById('el-cm').getAttribute('data-here') }), GK);
  const want13 = FEED.filter((ep) => ((FJ.endpoints['endpoint:' + ep] || {}).preconditions || []).some((g) => g.id === G13.id)).sort();
  ok(!!G13 && JSON.stringify(g13.on) === JSON.stringify(want13) && g13.cm.length === 1 && g13.cm[0][0] === G13.exit && g13.cm[0][1] === GK && g13.here === 'true' && g13.col && g13.cells.length === want13.length && g13.cells.every((c) => c === 'guards'),
    'D-053 · a guard lit from its check lands on its row: the check on the 409 row named and outlined (the guards count lights with it), the ' + want13.length + ' endpoints that hold it lit, their guards cells outlined', { lit: g13.on.length, want: want13.length, cm: g13.cm, cells: g13.cells.slice(0, 3) });
  await p.click('#elclear'); await p.waitForTimeout(40);
  /* a check the feed ties to no ending joins the ending its sibling raise of the same class is caught into: no row of its own is left,
     and on PATCH …/stage both stage checks sit on the one 409 row, below the 404 raised before them inside update_stage */
  const E14 = 'PATCH /cooking/sessions/{session_id}/stage', PS = FJ.endpoints['endpoint:' + E14].preconditions || [];
  const odd14 = FEED.flatMap((ep) => (FJ.endpoints['endpoint:' + ep].preconditions || []).map((g, i) => [ep, g, i]).filter(([, g]) => g.exit == null));
  const st14 = ROW[E14], at14 = (id) => st14.xd.exits.findIndex((x) => x[2] === id), g409 = PS.filter((g) => g.status === 409 && /update_stage/.test(g.via || ''));
  const row409 = st14.xd.exits.find((x) => x[1].some((i) => PS[i] === g409[0]));
  ok(odd14.length === 4 && FEED.every((ep) => ROW[ep].xd.exits.every((x) => x[0] !== 'unplaced')) && odd14.every(([ep, , i]) => ROW[ep].xd.exits.some((x) => x[1].includes(i) && x[2].startsWith('x:')))
     && g409.length === 2 && row409 && g409.every((g) => row409[1].includes(PS.indexOf(g))) && at14('x:951dde791f') < at14(row409[2]),
    'D-053 · the four checks the feed ties to no ending sit on the ending their sibling raise is caught into; PATCH …/stage draws one 409 row with both stage checks, below the 404', { odd: odd14.length, row409 });
  /* POST /_e2e/seed: the 404 its dependency's check makes is a shared row — the dependency named, its check muted beside it; FastAPI
     named on the body and field rows, its own code in the hover */
  const E15 = 'POST /_e2e/seed';
  await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + E15 + '"] td.id'); await p.waitForTimeout(80);
  const e15 = await p.$$eval('#ocol-cm .pair[data-k="d:exits"] table.etab tr.erow', (trs) => trs.map((tr) => ({ stage: (tr.querySelector('.vc-stage b') || {}).textContent || null,
    who: (tr.querySelector('.shd') || {}).textContent || null, src: tr.querySelector('.shd') ? tr.querySelector('.shd').getAttribute('data-src') : null,
    muted: [...tr.querySelectorAll('.ck')].map((c) => c.classList.contains('ckm')) })));
  const dep15 = e15.find((r) => r.stage === 'GATE' && r.muted.length);
  const allIn = FEED.every((ep) => ROW[ep].d.exits.items.every((e, i) => e[1] !== 'INPUT' || (e[5] === 'FastAPI' && /^fastapi\//.test(ROW[ep].xd.exits[i][3] || ''))));
  ok(!!dep15 && /_require_seed_controls/.test(dep15.who) && dep15.muted.every(Boolean) && e15.filter((r) => r.stage === 'HANDLER').every((r) => r.muted.every((m) => !m)) && allIn,
    'D-053 · a check a dependency makes sits on its GATE row under the dependency that makes it, muted; every INPUT row on every endpoint names FastAPI, its own code in the hover', { dep15, allIn });
  await p.evaluate(() => window.scrollTo(0, 0)); }
ok(!errs.length, 'no page error after the D-041 checks', errs);

/* 14 · BY MOMENT (his ask 2026-09-26) and the code map's copy button. Real clicks. On POST /recipe-creation/gustify:
   (a) the code map's copy button (beside its options) copies the page, the endpoint, every option of the code map with its value and
       whose pick it is, then "your words:" — read off a stubbed clipboard; the page's own copy text carries the same option lines;
   (b) the moments read top to bottom as recomputed HERE from forms.json: the fixed ones, then the handler's runs by line — its own checks
       (their lines, a check inside a call at the call's line), the work (the chain's calls after them and before the catch), the catch
       the handler's failures pass (with the call its except body makes), the handler's own commit — then the answer, after it, escapes;
   (c) the columns are the blocks in the page's block order, less Overview and risk, which stands in the band with its reason; the Endings
       column holds D-053's endings in the code map's own order, and the catch's row holds exactly its group's eight;
   (d) the path to the 403 keeps the moments its chain passes (recomputed from its chain here) and fewer chips, the 403 among them and
       no 402; all paths brings every moment back;
   (e) both looks switch, are remembered across a reload, my picks dashed on a cold start, and come back;
   (f) a chip clicked in the matrix lights everywhere: the table rows that hold it, and its outline here; every chip whose element the
       station draws wears the station's glyph (D-052);
   (g) the review's fixes, read back: the matrix fits its box at this width in both looks, no chip cut; the path picker groups the
       endings under the moment each leaves at, in time order, two of one status there told apart by their own words; a test proving
       two endings of one status says it; the untimed block says "no time" with its reason behind the info toggle; POST /setup/complete
       draws the login dependency's read at the dependencies AND the handler's own read at the work, and the path to its 422 does not
       pass the work (recomputed from the feed: each occurrence's `dependency`); GET /healthz offers no path to the 429 no path ends
       at and puts it in the band, on no path. */
{ const fillW = (s, x) => String(s).replace(/\{(\w+)\}/g, (m, k) => (x[k] != null ? x[k] : m));
  const E14 = 'POST /recipe-creation/gustify', FE = FJ.endpoints['endpoint:' + E14], MW = D.words.mo, EW = D.words.endings, CL = D.words.copy.lines;
  await open(PAGE); await p.click('#board tr.row[data-ep="' + E14 + '"] td.id'); await p.waitForTimeout(120);
  /* (a) the code map's copy */
  await p.evaluate(() => { window.__copied = null; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (s) => { window.__copied = s; return Promise.resolve(); } } }); });
  await p.$eval('#cmcopy', (e) => e.scrollIntoView({ block: 'center' })); await p.click('#cmcopy'); await p.waitForTimeout(80);
  // CHANGED 2026-09-26 (D-055): a ruled default is copied as his default; the code map's switch adds its own line
  const optL = (R, v) => R.label + ': ' + R.opts[v].name + ' (' + (v === R.pick ? (R.ruled ? D.words.ruledMark : D.words.copy.pick) : D.words.copy.his) + ')';
  // CHANGED 2026-09-26 (D-058): the Gabe Universe's and the gaps' switches are copied too, after the code map's
  const wantCopy = [CL.page + ': all-endpoints · ' + D.tok.app + ' @ ' + D.tok.head, CL.open + ': ' + E14, CL.cm + ' · ' + optL(EW.opt.mom, 'rows'), CL.cm + ' · ' + optL(EW.opt.chk, 'col'),
    CL.cm + ' · ' + optL(D.words.carry, 'all'), CL.uni + ' · ' + optL(D.words.carry, 'all'), CL.gaps + ' · ' + optL(D.words.carry, 'all'), '', CL.your, ''].join('\n');
  const got14 = await p.evaluate(() => window.__copied);
  ok(got14 === wantCopy, 'the code map\'s copy button copies the page, the endpoint, each of its options with whose pick it is, then room for your words', got14);
  await p.click('#ocol-cm .opt[data-eopt="chk"][data-v="line"]'); await p.waitForTimeout(80); await p.click('#cmcopy'); await p.waitForTimeout(80);
  const got14b = await p.evaluate(() => window.__copied), out14 = await p.$eval('#out', (e) => e.value);
  ok(got14b && got14b.includes(CL.cm + ' · ' + optL(EW.opt.chk, 'line')) && out14.includes(CL.cm + ' · ' + optL(EW.opt.chk, 'line')) && out14.includes(CL.mo + ' · ' + optL(MW.opt.lay, 'cols'))
     && out14.includes(CL.mo + ' · ' + CL.path + ': ' + MW.path.all), 'an option he changed is copied as his choice, and the page\'s copy text carries the code map\'s and BY MOMENT\'s settings', got14b);
  await p.click('#ocol-cm .opt[data-eopt="chk"][data-v="col"]'); await p.waitForTimeout(80);
  /* (b) the moments in time order, recomputed from the feed */
  const H = FE.handler, HF = FE.file, L14 = (at) => +((String(at || '').match(/:(\d+)$/) || [])[1] || 0), inF = (at) => String(at || '').replace(/:\d+$/, '') === HF;
  const cat = (FE.failure.catches || []).find((c) => c.fn === H), cL = L14(cat.at);
  const own = (g) => { const m = /^call .+ @ (.+):(\d+)$/.exec(g.via || ''); return m ? (m[1] === HF ? +m[2] : 0) : (inF(g.at) ? L14(g.at) : 0); };
  const chk = (FE.preconditions || []).map(own).filter((q) => q && q < cL), work = [...new Set(FE.paths.flatMap((q) => q.chain).filter((s) => (s.kind === 'collapsed' || s.kind === 'call') && inF(s.at)).map((s) => L14(s.at)))].filter((q) => q > Math.max(...chk) && q < cL);
  const failL = [cL].concat((cat.actions || []).filter((a) => a.op === 'call').map((a) => a.at)), save = Object.values(STEPS).filter((s) => s.fn === H && s.op === 'commit').map((s) => L14(s.at));
  const span = (qs) => fillW(Math.min(...qs) === Math.max(...qs) ? MW.line : MW.lines, { lo: Math.min(...qs), hi: Math.max(...qs) });
  const want14 = [['start'], ['send'], ['edge'], ['body'], ['gate'], ['fields'], ['checks', span(chk)], ['work', span(work)], ['fail', span(failL)], ['save', span(save)], ['answer'], ['after'], ['uncaught']];
  const readM = () => p.evaluate(() => { const t = document.querySelector('#mogrid table.motab'); return { lay: t.getAttribute('data-lay'), cell: t.getAttribute('data-cell'),
    // CHANGED 2026-09-26 (D-055): moments as columns is his default — the moments, the blocks and the Endings cells are read in DOM
    // order, which is time order in both looks; a head's lines are its hover's now (data-lines)
    rows: [...t.querySelectorAll('th.mom')].map((h) => [h.getAttribute('data-mom'), h.getAttribute('data-lines')]),
    /* CHANGED 2026-09-26 (D-057): the Endings head holds an info line behind the toggle — a head's name is its text less that line */
    heads: [...t.querySelectorAll('th[data-block]')].map((h) => [...h.childNodes].filter((q) => !(q.classList && q.classList.contains('ainfo'))).map((q) => q.textContent).join('').trim()), bodyRows: t.querySelectorAll('tbody tr').length,
    ends: [...t.querySelectorAll('td[data-f="end"]')].map((td) => [...td.querySelectorAll('.vc-status')].map((c) => c.textContent)),
    chips: t.querySelectorAll('.mc').length, counts: t.querySelectorAll('.mcount').length,
    band: [...document.querySelectorAll('#moband .mbb')].map((b) => [b.getAttribute('data-f'), b.textContent.slice(0, 80)]),
    squares: [...document.querySelectorAll('#mobar .opt[data-mopt]')].map((o) => [o.getAttribute('data-mopt'), o.getAttribute('data-v'), o.getAttribute('aria-checked'), getComputedStyle(o).borderTopStyle, o.getAttribute('data-ruled')]) }; });
  await p.$eval('#sec-mo', (e) => e.scrollIntoView({ block: 'start' })); await p.waitForTimeout(60);
  const m0 = await readM(), rowsW = m0.rows.map((r) => r[1] ? r : [r[0]]);
  ok(JSON.stringify(rowsW) === JSON.stringify(want14.map((w) => (w[1] ? w : [w[0]]))), 'BY MOMENT · ' + E14 + ' · the moments read top to bottom as the feed has them: before any request, the screen, the edge, the body, the login, the fields, then the handler\'s checks (' + span(chk) + '), the work (' + span(work) + '), the catch (' + span(failL) + '), saving (' + span(save) + '), the answer, after it, escapes', { page: m0.rows, want: want14 });
  /* (c) the columns, the band, the Endings column against the code map's own endings table */
  const byB = {}; Object.entries(D.mo.fam).forEach(([f, b0]) => { byB[b0] = f; }); const ov = D.blocks.find((b0) => byB[b0.key] === 'over');
  const wantHeads = D.orders[D.words.rail.bord.pick].filter((k) => k !== ov.key).map((k) => D.blocks.find((b0) => b0.key === k).name);
  const cmEnds = await p.$$eval('#ocol-cm .pair[data-k="d:exits"] table.etab tr.erow .vc-status', (cs) => cs.map((c) => c.textContent));
  const failRow = m0.rows.findIndex((r) => r[0] === 'fail'), grp = ROW[E14].xd.exits.map((x, i) => [x, ROW[E14].d.exits.items[i]]).filter(([x]) => typeof x[0] === 'number').map(([, e]) => String(e[2]));
  ok(JSON.stringify(m0.heads) === JSON.stringify(wantHeads) && m0.band.some(([f, t]) => f === 'over' && t.includes(ov.name) && t.includes(MW.band.untimed.over.slice(0, 30)))
     && JSON.stringify(m0.ends.flat()) === JSON.stringify(cmEnds) && JSON.stringify(m0.ends[failRow]) === JSON.stringify(grp) && grp.length === 8,
    'BY MOMENT · the columns are the blocks in the page\'s order less Overview and risk, which stands in the band with its reason; the Endings column is the code map\'s endings in its own order, the catch\'s row its eight', { heads: m0.heads, want: wantHeads, ends: m0.ends.flat().length, cm: cmEnds.length, fail: m0.ends[failRow] });
  /* (d) the path to the 403: the moments its chain passes, recomputed from that chain; fewer chips; the 403 there, no 402 */
  const X403 = (FE.produced || []).find((x) => x.status === 403), P403 = FE.paths.find((q) => q.exit.id === X403.id);
  const PH = { middleware: 'edge', 'body-parse': 'body', security: 'gate', dependency: 'gate', validation: 'fields', handler: 'checks' };
  const want403 = ['start', 'send', ...new Set(P403.chain.map((s) => PH[s.phase]).filter(Boolean)), 'after'];
  const i403 = ROW[E14].mo.ex.findIndex((x) => x[0] === X403.id);
  await p.click('#mobar .mopath[data-path="' + i403 + '"]'); await p.waitForTimeout(100);
  const m1 = await readM();
  ok(JSON.stringify(m1.rows.map((r) => r[0])) === JSON.stringify(want403) && m1.chips < m0.chips && m1.ends.flat().includes('403') && !m1.ends.flat().includes('402')
     && await p.$eval('#mobar .mopath[data-path="' + i403 + '"]', (e) => e.getAttribute('aria-checked')) === 'true',
    'BY MOMENT · the path to the 403 keeps only the moments its chain passes (' + want403.join(' · ') + ') and fewer chips — the 403 among them, no 402', { rows: m1.rows.map((r) => r[0]), chips: [m1.chips, m0.chips] });
  await p.click('#mobar .mopath[data-path="all"]'); await p.waitForTimeout(100);
  const m2 = await readM();
  ok(JSON.stringify(m2.rows) === JSON.stringify(m0.rows) && m2.chips === m0.chips, 'BY MOMENT · all paths brings every moment and every chip back', [m2.rows.length, m2.chips]);
  /* (e) the two looks: HIS defaults (D-055: moments as columns, cells as chips) pressed on a cold start, marked ruled, no dash; each
     switches the grid; both remembered; back to his defaults */
  const pk = (g) => MW.opt[g].pick;
  ok(MW.opt.lay.ruled === 'D-055' && MW.opt.cell.ruled === 'D-055' && m0.lay === 'cols' && m0.cell === 'chips' && m0.squares.length === 4
     && m0.squares.every(([g, v, on, dash, ruled]) => (on === 'true') === (v === pk(g)) && dash !== 'dashed' && (ruled === 'true') === (v === pk(g))) && m0.bodyRows === m0.heads.length,
    'D-055 · BY MOMENT · his defaults on a cold start: moments as columns, cells as chips, pressed and marked ruled (no dash), a row per block', m0.squares);
  await p.hover('#mobar .opt[data-mopt="lay"][data-v="cols"]'); await p.waitForTimeout(120);
  const tipR = await p.$eval('#tip', (e) => e.textContent);
  ok(tipR.includes(D.words.ruledMark) && !tipR.includes(D.words.pickMark), 'D-055 · BY MOMENT · his default\'s hover says it is his, not my pick', tipR);
  await p.click('#mobar .opt[data-mopt="lay"][data-v="rows"]'); await p.waitForTimeout(80);
  const m3 = await readM();
  ok(m3.lay === 'rows' && JSON.stringify(m3.rows) === JSON.stringify(m0.rows) && m3.bodyRows === m0.rows.length, 'BY MOMENT · moments as rows: the moments top to bottom in the same order, a row per moment', { moms: m3.rows.length, rows: m3.bodyRows });
  await p.click('#mobar .opt[data-mopt="cell"][data-v="counts"]'); await p.waitForTimeout(80);
  const m4 = await readM();
  ok(m4.cell === 'counts' && !m4.chips && m4.counts > 0, 'BY MOMENT · cells as counts: a number in each cell, no chips', { counts: m4.counts, chips: m4.chips });
  await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready'); await p.evaluate((ep) => window.__allep.pick(ep), E14); await p.waitForTimeout(100);
  const m5 = await readM();
  ok(m5.lay === 'rows' && m5.cell === 'counts' && m5.squares.filter(([, , on]) => on === 'true').map(([g, v]) => g + ':' + v).sort().join(' ') === 'cell:counts lay:rows', 'BY MOMENT · both looks are remembered for this viewer', [m5.lay, m5.cell]);
  await p.$eval('#sec-mo', (e) => e.scrollIntoView({ block: 'start' }));
  await p.click('#mobar .opt[data-mopt="lay"][data-v="cols"]'); await p.waitForTimeout(60); await p.click('#mobar .opt[data-mopt="cell"][data-v="chips"]'); await p.waitForTimeout(80);
  const m6 = await readM();
  ok(m6.lay === 'cols' && m6.cell === 'chips' && JSON.stringify(m6.rows) === JSON.stringify(m0.rows) && m6.chips === m0.chips, 'BY MOMENT · his default squares bring back the grid as it was', [m6.lay, m6.cell]);
  /* (f) a chip lit in the matrix lights everywhere; the station's glyph on every chip whose element it draws */
  const K14 = 'table:users', sel14 = '#mogrid td[data-mom="gate"][data-f="data"] .mc[data-key="' + K14 + '"]';
  await p.$eval(sel14, (e) => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(60); await p.click(sel14); await p.waitForTimeout(120);
  const l14 = await p.evaluate((K) => ({ el: window.__allep.state.el, chip: !document.getElementById('elchip').hidden, here: document.getElementById('el-mo').getAttribute('data-here'),
    on: [...document.querySelectorAll('#board tr.row[data-el="on"]')].map((e) => e.getAttribute('data-ep')).sort(),
    want: window.__allep.data.rows.filter((r) => { const ks = window.__allep.rowKeys(r); return ks.U[K] || ks.C[K]; }).map((r) => r.id).sort(),
    mo: [...document.querySelectorAll('#sec-mo .elon')].map((e) => (e.getAttribute('data-keys') || '').split('\n').includes(K)) }), K14);
  ok(l14.el === K14 && l14.chip && l14.here === 'true' && l14.on.length && JSON.stringify(l14.on) === JSON.stringify(l14.want) && l14.mo.length >= 1 && l14.mo.every(Boolean),
    'BY MOMENT · a chip clicked in the matrix lights everywhere: the ' + l14.want.length + ' table rows that hold it, and every place the matrix draws it', { on: l14.on.length, want: l14.want.length, mo: l14.mo.length });
  await p.click('#elclear'); await p.waitForTimeout(40);
  const g14 = await p.evaluate(() => { const SKK = window.__allep.data.sk.keys, bad = [], n = [0, 0];
    document.querySelectorAll('#mogrid [data-key]').forEach((c) => { const K = c.getAttribute('data-key'), s = SKK[K]; if (!s || !s[0]) return; n[0]++;
      const g = c.querySelector('.skg'); if (!g || g.getAttribute('data-sk') !== s[0]) bad.push(K); else n[1]++; }); return { bad, n }; });
  ok(!g14.bad.length && g14.n[0] > 0, 'BY MOMENT · every chip whose element the Gabe Universe draws wears the station\'s glyph for its kind (' + g14.n[1] + ' chips)', g14.bad.slice(0, 4));
  /* (g) the review's fixes */
  const fit = async () => p.evaluate(() => { const G = document.getElementById('mogrid'); return { over: G.scrollWidth - G.clientWidth, note: !document.getElementById('moscroll').hidden,
    cut: [...G.querySelectorAll('.mc')].filter((c) => c.scrollWidth > c.clientWidth + 1).length }; });
  await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + E14 + '"] td.id'); await p.waitForTimeout(120);
  const g0 = await fit(); await p.click('#mobar .opt[data-mopt="lay"][data-v="rows"]'); await p.waitForTimeout(80); const g1 = await fit();
  await p.click('#mobar .opt[data-mopt="lay"][data-v="cols"]'); await p.waitForTimeout(80);
  ok(g0.over <= 1 && g1.over <= 1 && !g0.cut && !g1.cut && !g0.note && !g1.note, 'BY MOMENT · at 1920 px the matrix fits its box in both looks and no chip is cut: chips wrap inside their cells', { cols: g0, rows: g1 });
  // CHANGED 2026-09-26 (D-055): the path picker is ONE row of codes; the moment and the words that told two of one status apart are in
  // each code's hover — read below, on POST /cooking/sessions (section 15)
  const p87 = await p.$$eval('#mogrid td[data-f="proof"] .mc', (cs) => cs.filter((c) => /^C87/.test(c.textContent.trim())).map((c) => [...c.querySelectorAll('.vc-status')].map((x) => x.textContent)));
  const ubox = await p.$eval('#moband .mbb[data-f="over"]', (b) => { const inf = b.querySelector('.ainfo'); return { word: b.querySelector('b').textContent, infoHidden: inf ? getComputedStyle(inf).display === 'none' : null, info: inf ? inf.textContent : '' }; });
  ok(p87.length === 1 && p87[0].length >= 1 && p87[0].every((x) => x === '502') && ubox.word === MW.band.noTime && ubox.infoHidden === true && ubox.info.includes(MW.band.untimed.over.slice(0, 30)),
    'BY MOMENT · a test proving two endings of one status says it (C87 proves 502); the untimed block says "' + MW.band.noTime + '", its reason behind the info toggle', { p87, ubox });
  const E16 = 'POST /setup/complete', FE16 = FJ.endpoints['endpoint:' + E16];
  const readMem = (sid) => { const at = new Set(); FE16.paths.forEach((q) => (q.effects.steps || []).forEach((e) => { if (e.step === sid) at.add(e.dependency ? 'gate' : 'handler'); })); return at; };
  const memSid = Object.keys(STEPS).find((k) => STEPS[k].table === 'memberships' && STEPS[k].op === 'read' && /load_household_context$/.test(STEPS[k].fn));
  const want16 = readMem(memSid), P422 = FE16.paths.find((q) => q.exit.id && (FE16.produced || []).concat(FE16.framework_exits || []).some((x) => x.id === q.exit.id && x.status === 422 && x.phase === 'validation'));
  await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + E16 + '"] td.id'); await p.waitForTimeout(120);
  const memAt = await p.$$eval('#mogrid td[data-f="data"] .mc[data-key="table:memberships"]', (cs) => [...new Set(cs.map((c) => c.closest('td').getAttribute('data-mom')))]);
  const i422 = ROW[E16].mo.ex.findIndex((x) => x[0] === P422.exit.id);
  await p.click('#mobar .mopath[data-path="' + i422 + '"]'); await p.waitForTimeout(100);
  const rows422 = await p.$$eval('#mogrid th.mom', (hs) => hs.map((h) => h.getAttribute('data-mom')));
  await p.click('#mobar .mopath[data-path="all"]'); await p.waitForTimeout(80);
  ok(want16.has('gate') && want16.has('handler') && memAt.includes('gate') && memAt.includes('work') && !rows422.includes('work') && !rows422.includes('checks'),
    'BY MOMENT · ' + E16 + ': the memberships read the feed lists once as the login dependency\'s and once as the handler\'s stands at the dependencies AND at the work; the path to its 422 leaves before the handler and passes neither', { feed: [...want16], page: memAt, rows422 });
  const E17 = 'GET /healthz', FE17 = FJ.endpoints['endpoint:' + E17];
  const dead17 = (FE17.produced || []).filter((x) => !FE17.paths.some((q) => q.exit.id === x.id)).map((x) => x.id);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + E17 + '"] td.id'); await p.waitForTimeout(120);
  const pk17 = await p.$$eval('#mobar .mopath[data-x]', (bs) => bs.map((b) => b.getAttribute('data-x')));
  const band17 = await p.$$eval('#moband .mbb[data-f="end"] .mbr', (rs) => rs.map((r) => [r.getAttribute('data-why'), r.querySelectorAll('.mc').length]));
  // CHANGED 2026-09-26 (D-057 c): one code per PATH, not per ending
  ok(dead17.length === 1 && !pk17.includes(dead17[0]) && pk17.length === FE17.paths.length && JSON.stringify(band17) === JSON.stringify([['nopath', 1]]),
    'BY MOMENT · ' + E17 + ': the 429 the feed lists but no path ends at is not offered as a path, and stands in the band, on no path', { dead17, pk17, band17 });
  await p.evaluate(() => window.scrollTo(0, 0)); }
ok(!errs.length, 'no page error after the BY MOMENT checks', errs);

/* 15 · D-055 (his ruling 2026-09-26). Real clicks and real hovers on POST /cooking/sessions, his example:
   (a) the path row is ONE line: "all paths", then each ending a path ends at as its status alone, in time order, a gap between moments;
       every code's hover names its moment (recomputed here from the words and D-053's failure groups), what the ending says and that it is
       not in force; codes of one status have hovers of their own; a clicked code is filled, ringed, and says it is the path in force;
       Tab from "all paths" lands on the first code with its focus drawn and its hover shown;
   (b) the handler heads read his three failure groups, the checks, the work's first call (+ how many more) and "commit", recomputed from
       the feed; no head runs past two lines (its line boxes counted); a failure head's hover names the catch's place;
   (c) the code map's switch "what BY MOMENT carries": show all (my pick, dashed) on a cold start; its count is the fields the page marks
       carried, of the fields it draws; every item marked carried carries a key BY MOMENT's grid draws, every keyed item left bright a key
       it does not (the key join, read off the two sections); dim fades exactly the carried; hide takes them away, keeps the switch, and
       says "+n in BY MOMENT" on a field carried in part; the copy button and the page's copy text carry the switch's line;
       (review B2) a field with nothing on the endpoint is counted apart from "left" and fades in dim and hide, never hidden;
       (review B1) on GET /recipe-creation/gustify/stream, whose steps touch tables the code map does not list, the tables fields stay
       in hide and say how many, their hover names them (recomputed from BY MOMENT's drawn keys minus the code map's list), the header counts them */
{ const fillW = (s0, x) => String(s0).replace(/\{(\w+)\}/g, (m, k) => (x[k] != null ? x[k] : m));
  const E = 'POST /cooking/sessions', R = ROW[E], FE = FJ.endpoints['endpoint:' + E], MW = D.words.mo, EW = D.words.endings, CW = D.words.carry, CL = D.words.copy.lines;
  await open(PAGE); await p.click('#board tr.row[data-ep="' + E + '"] td.id'); await p.waitForTimeout(150);
  await p.$eval('#sec-mo', (e) => e.scrollIntoView({ block: 'start' })); await p.waitForTimeout(80);
  /* (a) the path row */
  const live = R.mo.ex.map((x, i) => i).filter((i) => R.mo.ex[i][4]);
  /* one line: every button's middle within a few pixels of the first's (a code is a little shorter than "all paths", centred on the line) */
  const pr = await p.evaluate(() => { const bs = [...document.querySelectorAll('#mobar .mopath')], mid = (b) => { const q = b.getBoundingClientRect(); return q.top + q.height / 2; };
    return { n: bs.length, tops: [...new Set(bs.map((b) => Math.abs(mid(b) - mid(bs[0])) <= 3 ? 0 : Math.round(mid(b))))],
    codes: bs.slice(1).map((b) => [+b.getAttribute('data-path'), b.innerText.trim(), b.parentElement.getAttribute('data-si')]), first: bs[0].getAttribute('data-path'),
    gaps: [...document.querySelectorAll('#mobar .mopg')].map((g) => parseFloat(getComputedStyle(g).marginRight)) }; });
  ok(pr.first === 'all' && pr.n === live.length + 1 && pr.tops.length === 1 && JSON.stringify(pr.codes.map((c) => c[0])) === JSON.stringify(live)
     && pr.codes.every(([i, t, si]) => t === String(R.mo.ex[i][1]) && +si === R.mo.ex[i][3]) && pr.gaps.length > 1 && pr.gaps.every((g) => g > 0),
    'D-055 · the path row is one line: all paths, then each ending\'s status alone in time order (' + pr.codes.map((c) => c[1]).join(' ') + '), a gap between moments', pr);
  const momName = (si) => { const x = R.mo.sp[si]; if (x[0] !== 'fail') return MW.moms[x[0]].name; const g = R.d.exits.moms[x[1]]; return MW.moms.fail.name + ' — ' + fillW(g[2].length ? EW.caught : EW.caughtBare, { calls: g[2].join(' · '), at: g[0], cls: g[1] }); };
  const tips = [];
  for (const i of live) { await p.hover('#mobar .mopath[data-path="' + i + '"]'); await p.waitForTimeout(60); tips.push([i, await p.$eval('#tip', (e) => e.textContent)]); }
  const badTip = tips.filter(([i, t]) => !t.includes(fillW(MW.path.mom, { mom: momName(R.mo.ex[i][3]) })) || !t.includes(MW.path.pickIt) || (R.mo.ex[i][6] && !t.includes(R.mo.ex[i][6])));
  const byStatus = {}; tips.forEach(([i, t]) => { (byStatus[R.mo.ex[i][1]] = byStatus[R.mo.ex[i][1]] || []).push(t); });
  const dupSame = Object.entries(byStatus).filter(([, ts]) => new Set(ts).size !== ts.length), dups = Object.keys(byStatus).filter((k) => byStatus[k].length > 1);
  ok(!badTip.length && !dupSame.length && dups.length >= 2,
    'D-055 · every code\'s hover names its moment, what the ending says and that it is not in force; codes of one status (' + dups.join(' · ') + ') have hovers of their own', { badTip: badTip.slice(0, 2), dupSame });
  const i404 = R.mo.ex.findIndex((x) => x[1] === 404);
  await p.click('#mobar .mopath[data-path="' + i404 + '"]'); await p.waitForTimeout(120);
  await p.mouse.move(5, 5); await p.hover('#mobar .mopath[data-path="' + i404 + '"]'); await p.waitForTimeout(80);
  const on = await p.evaluate((i) => { const b = document.querySelector('#mobar .mopath[data-path="' + i + '"]'), o = document.querySelector('#mobar .mopath[data-path="all"]');
    return { checked: b.getAttribute('aria-checked'), bg: getComputedStyle(b).backgroundColor, bgOff: getComputedStyle(o).backgroundColor, sh: getComputedStyle(b).boxShadow, tip: document.getElementById('tip').textContent }; }, i404);
  ok(on.checked === 'true' && on.bg !== on.bgOff && on.sh !== 'none' && on.tip.includes(MW.path.inForce), 'D-055 · the chosen code is filled and ringed, and its hover says it is the path in force', on);
  await p.click('#mobar .mopath[data-path="all"]'); await p.waitForTimeout(100); await p.mouse.move(5, 5);
  await p.keyboard.press('Tab'); await p.waitForTimeout(100);
  const kf = await p.evaluate(() => { const a = document.activeElement; return { path: a && a.getAttribute('data-path'), outline: a ? getComputedStyle(a).outlineStyle : null, tip: document.getElementById('tip').getAttribute('data-show') }; });
  ok(kf.path === String(live[0]) && kf.outline !== 'none' && kf.tip === 'true', 'D-055 · Tab from "all paths" lands on the first code, its focus drawn and its hover shown', kf);
  await p.keyboard.press('Escape');
  /* (b) the heads */
  const hd = await p.evaluate(() => [...document.querySelectorAll('#mogrid th.mom')].map((h) => { const rs = [...h.querySelectorAll('.mstg, .mn, .mh2')].flatMap((e) => [...e.getClientRects()]);
    const ts = rs.map((q) => q.top).sort((a, b) => a - b); let lines = 0, at = -1e9; ts.forEach((t) => { if (t - at > 6) { lines++; at = t; } });   /* line boxes, by their tops */
    return { m: h.getAttribute('data-mom'), si: +h.getAttribute('data-si'), face: h.getAttribute('data-face'), lines }; }));
  /* CHANGED 2026-09-27 (the scoped-import fix): start_session imports assert_recipe_allergen_safe in its own body — the page now sees the
     class raised through that call, so the 403's head names start_session like its neighbours */
  const wantF = ['start_session · SessionNotFoundError', 'start_session · AllergenConflictError', 'start_session · ConcurrentCookCapError'];
  const hLine = (q) => +String(q || '').replace(/^.*:(\d+)$/, '$1');
  const wk = R.mo.sp.find((x) => x[0] === 'work'), wcalls = [...new Set(FE.paths.flatMap((q) => q.chain).filter((st) => (st.kind === 'call' || st.kind === 'collapsed') && String(st.at || '').startsWith(FE.file + ':')
    && hLine(st.at) >= wk[2] && hLine(st.at) <= wk[3]).sort((a, b) => hLine(a.at) - hLine(b.at)).map((st) => st.fn.split('::').pop()))];
  const commit = Object.values(STEPS).some((st) => st.fn === FE.handler && st.op === 'commit');
  const face = (m) => (hd.find((h) => h.m === m) || {}).face;
  ok(JSON.stringify(hd.filter((h) => h.m === 'fail').map((h) => h.face)) === JSON.stringify(wantF) && face('checks') === MW.moms.checks.name && commit && face('save') === 'commit'
     && face('work') === wcalls[0] + ' +' + (wcalls.length - 1) && hd.every((h) => h.lines <= 2),
    'D-055 · the handler heads: ' + hd.filter((h) => h.m === 'fail').map((h) => h.face).join(' | ') + ' · ' + face('checks') + ' · ' + face('work') + ' · ' + face('save') + ' — no head past two lines', hd.map((h) => [h.face, h.lines]));
  const fh = hd.find((h) => h.m === 'fail'); await p.hover('#mogrid th.mom[data-si="' + fh.si + '"]'); await p.waitForTimeout(80);
  const ftip = await p.$eval('#tip', (e) => e.textContent);
  ok(ftip.includes(momName(fh.si)) && ftip.includes(R.d.exits.moms[0][0]), 'D-055 · a failure head\'s hover holds its full name, the catch\'s place among it', ftip);
  /* (c) the switch */
  await p.$eval('#ocol-cm', (e) => e.scrollIntoView({ block: 'start' })); await p.mouse.move(5, 5); await p.waitForTimeout(60);
  const readC = () => p.evaluate(() => { const C = document.getElementById('ocol-cm'), mk = new Set([...document.querySelectorAll('#mogrid [data-keys]')].flatMap((e) => e.getAttribute('data-keys').split('\n')));
    /* a path's fate is keyed by its ending's status, not by a member of its own: it is left out of the key join */
    /* CHANGED 2026-09-26 (D-057): an alarm is carried by the facts it reads and the handler's file by its chip's hover — neither is a
       key BY MOMENT's grid draws, so both are left out of the key join too */
    const fs = [...C.querySelectorAll('.pair[data-k], [data-sub][data-k]')], items = [...C.querySelectorAll('[data-cf][data-ci][data-key]:not([data-cf="d:fates"]):not([data-cf="d:alarms"]):not([data-cf="h:handler"][data-ci="1"])')];
    const shown = (e) => !!(e.offsetParent || e.getClientRects().length) && getComputedStyle(e).display !== 'none';
    const op = (e) => { let o = 1; for (let n = e; n && n !== C; n = n.parentElement) o *= +getComputedStyle(n).opacity; return o; };
    return { carry: C.getAttribute('data-carry'), count: document.getElementById('cvcount').textContent, fields: fs.length, whole: fs.filter((f) => f.getAttribute('data-cvs') === 'c').length,
      squares: [...C.querySelectorAll('.opt[data-carry]')].map((o) => [o.getAttribute('data-carry'), o.getAttribute('aria-checked'), getComputedStyle(o).borderTopStyle]),
      join: items.map((e) => [e.getAttribute('data-key'), e.getAttribute('data-cv') === '1', mk.has(e.getAttribute('data-key'))]),
      cvOp: [...C.querySelectorAll('[data-cv="1"]')].map((e) => [op(e), shown(e)]), brightOp: items.filter((e) => e.getAttribute('data-cv') !== '1').map((e) => [op(e), shown(e)]),
      notes: [...C.querySelectorAll('.cvn')].filter(shown).map((e) => e.textContent), switchShown: shown(C.querySelector('.cvopt')),
      empty: fs.filter((f) => f.getAttribute('data-cvs') === 'e').length, cveOp: [...C.querySelectorAll('[data-cve="1"]')].map((e) => [op(e), shown(e)]),
      xnotes: [...C.querySelectorAll('.cvx')].filter(shown).map((e) => [e.closest('[data-k]').getAttribute('data-k'), e.textContent]) }; });
  const c0 = await readC();
  ok(c0.carry === CW.pick && c0.squares.every(([v, on0, dash]) => (on0 === 'true') === (v === CW.pick) && (dash === 'dashed') === (v === CW.pick)),
    'D-055 · the switch opens on "' + CW.opts[CW.pick].name + '", my pick, dashed', c0.squares);
  ok(c0.count === fillW(CW.count, { covered: c0.whole, fields: c0.fields, left: c0.fields - c0.whole - c0.empty, empty: c0.empty }) && JSON.stringify([c0.whole, c0.fields, c0.empty, 0]) === JSON.stringify(R.cvn)
     && c0.empty > 0 && c0.cveOp.length === c0.empty,
    'D-055 · the header\'s count is the page\'s own, the fields with nothing here counted apart from what is left: ' + c0.count, { count: c0.count, whole: c0.whole, fields: c0.fields, empty: c0.empty, gen: R.cvn });
  const jBad = c0.join.filter(([, cv, inMo]) => cv !== inMo);
  ok(c0.join.length > 10 && !jBad.length && c0.join.some(([, cv]) => cv) && c0.join.some(([, cv]) => !cv),
    'D-055 · every keyed item the switch marks carried is drawn in BY MOMENT\'s grid, every keyed item it leaves bright is not (' + c0.join.length + ' items)', jBad.slice(0, 4));
  ok(c0.cvOp.every(([o, sh]) => o === 1 && sh) && c0.cveOp.every(([o, sh]) => o === 1 && sh), 'D-055 · show all: nothing faded, nothing hidden', c0.cvOp.filter(([o, sh]) => o !== 1 || !sh).length);
  await p.click('#ocol-cm .opt[data-carry="dim"]'); await p.waitForTimeout(150); await p.mouse.move(5, 5); await p.waitForTimeout(150);
  const c1 = await readC();
  ok(c1.carry === 'dim' && c1.cvOp.length > 0 && c1.cvOp.every(([o, sh]) => o < 0.5 && sh) && c1.brightOp.every(([o]) => o === 1) && c1.cveOp.every(([o, sh]) => o < 1 && sh),
    'D-055 · dim: the ' + c1.cvOp.length + ' carried marks fade and stay drawn, every bright item stays whole', { faded: c1.cvOp.filter(([o]) => o >= 0.5).length, dimBright: c1.brightOp.filter(([o]) => o !== 1).length });
  await p.click('#ocol-cm .opt[data-carry="hide"]'); await p.waitForTimeout(150);
  const c2 = await readC(), partly = Object.values(R.cv).filter((v) => v[0] === 'p');
  ok(c2.carry === 'hide' && c2.cvOp.every(([, sh]) => !sh) && c2.brightOp.every(([, sh]) => sh) && c2.switchShown && c2.notes.length === partly.length
     && c2.cveOp.length === c0.empty && c2.cveOp.every(([o, sh]) => o < 1 && sh) && !c2.xnotes.length
     && c2.notes.every((t) => /^\+\d+ /.test(t) && t === fillW(CW.more, { n: +t.slice(1).split(' ')[0] })) && c2.count === c0.count,
    'D-055 · hide: every carried mark leaves, every bright item stays, the switch stays, and each of the ' + partly.length + ' fields carried in part says how many are in BY MOMENT', { left: c2.cvOp.filter(([, sh]) => sh).length, notes: c2.notes });
  await p.evaluate(() => { window.__copied = null; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (s0) => { window.__copied = s0; return Promise.resolve(); } } }); });
  await p.click('#cmcopy'); await p.waitForTimeout(80);
  const cLine = CL.cm + ' · ' + CW.label + ': ' + CW.opts.hide.name + ' (' + D.words.copy.his + ')';
  const cp = await p.evaluate(() => [window.__copied, document.getElementById('out').value]);
  ok(cp[0] && cp[0].includes(cLine) && cp[1].includes(cLine), 'D-055 · the code map\'s copy and the page\'s copy text both carry "' + cLine + '"', cp[0]);
  /* (review B1) BY MOMENT holding MORE than the code map, said on the page: the stream endpoint, still in hide */
  { const ES = 'GET /recipe-creation/gustify/stream', RS = ROW[ES], MK = D.mo.keys;
    const moT = [...new Set(RS.mo.el.flatMap((e) => e[2].map((ki) => MK[ki])).filter((k) => k.startsWith('table:')).map((k) => k.slice(6)))];
    const cmT = new Set((RS.u.tables || []).concat(RS.d.tables.items.map((t) => t[0]))), want = moT.filter((t) => !cmT.has(t)).sort();
    await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + ES + '"] td.id'); await p.waitForTimeout(150);
    await p.$eval('#ocol-cm', (e) => e.scrollIntoView({ block: 'start' })); await p.mouse.move(5, 5); await p.waitForTimeout(60);
    const cs = await readC(), tipOf = async (k) => { await p.hover('#ocol-cm .pair[data-k="' + k + '"] .cvx'); await p.waitForTimeout(80); return p.$eval('#tip', (e) => e.textContent); };
    const tips = [await tipOf('c:tables'), await tipOf('d:tables')], note = fillW(CW.beyond, { n: want.length });
    ok(want.length > 0 && JSON.stringify(cs.xnotes.map((x) => x[0]).sort()) === JSON.stringify(['c:tables', 'd:tables']) && cs.xnotes.every((x) => x[1] === note)
       && tips.every((t) => t.includes(fillW(CW.tipBeyond, { n: want.length, names: want.join(', ') })))
       && cs.count === fillW(CW.count, { covered: cs.whole, fields: cs.fields, left: cs.fields - cs.whole - cs.empty, empty: cs.empty }) + ' · ' + fillW(CW.beyondCount, { n: want.length }),
      'B1 · ' + ES + ': BY MOMENT touches ' + want.join(', ') + ', which the code map does not list — both tables fields stay in hide, say "' + note + '", name them in their hover, and the header counts them',
      { want, xnotes: cs.xnotes, count: cs.count, tip: tips[1].slice(0, 200) }); }
  /* review F6: in hide, the rule that hides a behind level whose every function BY MOMENT carries reaches the behind levels only — a
     nested-schema line (its names carry no per-item flag) stays drawn wherever its pair stays. On this feed every pair holding one is
     carried whole, so the pair's own flag is lifted for the reading and put back */
  { const EN = 'GET /cooking/active'; await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + EN + '"] td.id'); await p.waitForTimeout(150);
    const f6 = await p.evaluate(() => { const pr = document.querySelector('#ocol-cm .pair[data-k="d:response"]'), ln = pr && pr.querySelector('.bhl:not(.bh)'); if (!ln) return null;
      const was = pr.getAttribute('data-cv'); pr.removeAttribute('data-cv'); const shown = getComputedStyle(ln).display !== 'none', flags = ln.querySelectorAll('[data-ci]').length;
      if (was != null) pr.setAttribute('data-cv', was); const bh = [...document.querySelectorAll('#ocol-cm .bhl.bh')].map((l) => [getComputedStyle(l).display, [...l.querySelectorAll(':scope > [data-ci]')].every((c) => c.getAttribute('data-cv') === '1')]);
      return { shown, flags, carry: document.getElementById('ocol-cm').getAttribute('data-carry'), bh }; });
    ok(f6 && f6.carry === 'hide' && f6.shown && f6.flags === 0 && f6.bh.every(([dsp, all]) => (dsp === 'none') === all),
      'review F6 · hide: ' + EN + '\'s "inside it" line stays drawn when its pair stays (the hide rule reaches the behind levels only), and each behind level hides exactly when BY MOMENT carries its every function', f6); }
  await p.click('#ocol-cm .opt[data-carry="all"]'); await p.waitForTimeout(120);
  ok((await readC()).carry === 'all', 'D-055 · show all brings the code map back whole');
  await p.evaluate(() => window.scrollTo(0, 0)); }
ok(!errs.length, 'no page error after the D-055 checks', errs);

/* 16 · D-056 (his ruling "agree with your recommendations", 2026-09-26): the twelve adds from the gap evaluation, each read back on
   POST /cooking/sessions where the row's example is there (else on the endpoint the row names), every expected value recomputed HERE
   from forms.json, the lab's facts (gen-endpoint-facts.py, run here) or the station's feeds — never from the page's own record:
   (1) the behind pair names the walk's functions level by level, the card's other callees apart, the names no function carries counted;
       BY MOMENT stands each walk function at the handler call that reaches it, with its depth, the rest in the band;
   (2) "arranges other cases" names exactly the feed's arranging cases; they stand at no moment (the band only where Proof's unplaced are);
   (3) each ending's status is filled when the endpoint declares it, hollow when not — the hollow statuses are the undeclared alarm's;
   (4) a picked path's write chips wear the feed's bucket for that path's step; all paths, none;
   (5) the flush the race-500 alarm names wears the race, joined to the uncaught 500;
   (6) a test whose status fits endings at several moments rides each of them, hollow and dashed, at each one's moment;
   (7) the headers an ending sends ride its hover and the code map's reply pair;
   (8) a schema inside the reply (or the body) stands under its top model, in BY MOMENT and the code map;
   (9) a FILE that fetches it and every hook, component and screen are named: at "the screen sends it" and in the hook and screens pairs;
   (10) the limiter's numbers, the login check's scheme and carrier, what a case asserts — in their hovers;
   (11) the handler pair's hover says async, its lines, what it returns, the def text and the docstring;
   (12) the stream's success wears the station's delivery:stream label, and no other endpoint's does. Real clicks and real hovers. */
{ const fillW = (s0, x) => String(s0).replace(/\{(\w+)\}/g, (m, k) => (x[k] != null ? x[k] : m));
  const E = 'POST /cooking/sessions', EK = 'endpoint:' + E, R = ROW[E], FE = FJ.endpoints[EK], MX = D.words.mo.x, PW = D.words.panel, MK = D.mo.keys;
  const L56 = facts(E), C4w = {}; (await import('node:vm')).runInNewContext(fs.readFileSync(path.join(REPO, 'templates/center/shell/example/codebase-graph-station/c4-graph.js'), 'utf8'), { window: C4w });
  const C4 = C4w.GABE_C4;   /* the station's own feed, run as the station runs it */
  const openEp = async (ep) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + ep + '"] td.id'); await p.waitForTimeout(150); };
  const tipAt = async (sel) => { const h = await p.$(sel); if (!h) return null; await h.evaluate((x) => x.scrollIntoView({ block: 'center' })); await p.waitForTimeout(40);
    const bx = await h.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(90); const t = await p.$eval('#tip', (e) => e.textContent); await p.mouse.move(5, 5); return t; };
  const cell = (mom, f) => p.$$eval('#mogrid td[data-mom="' + mom + '"][data-f="' + f + '"] .mc', (cs) => cs.map((c) => ({ keys: (c.getAttribute('data-keys') || '').split('\n'), t: c.innerText.replace(/\s+/g, ' ').trim(),
    hol: c.classList.contains('hol'), dash: getComputedStyle(c).borderTopStyle, st: [...c.querySelectorAll('.vc-status')].map((v) => [v.textContent, v.getAttribute('data-decl'), getComputedStyle(v).backgroundColor]),
    fate: [...c.querySelectorAll('.vc-fate')].map((v) => v.getAttribute('data-vv')), race: !!c.querySelector('.mrc'), sub: [...c.querySelectorAll('.sksub')].map((v) => v.getAttribute('data-vc') + ':' + v.getAttribute('data-vv')), hint: c.getAttribute('data-hint') })));
  await open(PAGE); await openEp(E);
  /* (1) the functions behind, by name */
  const walk = (L56.functions.walk || []).map((lv) => lv.map((q) => q.name)), wids = (L56.functions.walk || []).flat().map((q) => 'fn:' + q.id.replace('#', '::'));
  const bh = await p.$$eval('#ocol-cm .pair[data-k="d:behind"] .bhl', (ls) => ls.map((l) => ({ head: l.querySelector('.bhd').textContent, names: [...l.querySelectorAll('[data-key]')].map((c) => [c.getAttribute('data-key'), [...c.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('')]) })));
  const bhN = await p.$eval('#ocol-cm .pair[data-k="d:behind"]', (e) => { const n = e.querySelector('[data-tip="bhn"]'); return n ? n.textContent : null; });
  const card = R.uni.rows.find((u) => u.row === 'CODE BEHIND'), cn = card.items.concat(card.rest || []), wn = new Set(walk.flat());
  const extra = cn.filter((n, i) => card.keys[i] && !wids.includes(card.keys[i])), noname = cn.filter((n, i) => !card.keys[i] && !wn.has(n));
  const bhWant = walk.map((lv, i) => [fillW(PW.behindDepth, { n: i + 1 }), lv]).concat(extra.length ? [[PW.behindExtra, extra]] : []);
  ok(JSON.stringify(bh.map((l) => [l.head, l.names.map((x) => x[1])])) === JSON.stringify(bhWant) && bhN === fillW(PW.behindNoname, { n: noname.length }) && noname.length === 2 && extra.length === 3,
    'D-056 (1) · ' + E + ' · the behind pair names the ' + wn.size + ' functions the lab\'s walk reaches, level by level, then the card\'s ' + extra.join(', ') + ' (depth not known), and counts ' + noname.join(', ') + ' by name only',
    { page: bh.map((l) => [l.head, l.names.length]), want: bhWant.map((x) => [x[0], x[1].length]), bhN });
  const work = await cell('work', 'fn'), gate = await cell('gate', 'fn');
  const wantWork = ['seed_stage_schedule', 'assert_recipe_allergen_safe', '_schedule_next'].map((n) => { const lv = walk.findIndex((l) => l.includes(n)); return [n, lv + 1]; });
  const dW = (n) => { const c = work.find((x) => x.keys.some((k) => k.endsWith('::' + n))); return c ? +((c.t.match(/↓(\d+)/) || [])[1]) : null; };
  const band1 = await p.$$eval('#moband .mbb[data-f="fn"] .mbr', (rs) => rs.map((r) => [r.getAttribute('data-why'), [...r.querySelectorAll('.mc')].map((c) => c.innerText.replace(/\s+/g, ' ').trim())]));
  ok(wantWork.every(([n, d]) => d > 1 && dW(n) === d) && gate.some((c) => c.keys.some((k) => k.endsWith('::build_auth_context')))
     /* CHANGED 2026-09-26 (D-057 d): the card's other callees and the names no function carries now stand where their caller stands —
        read in section 17 — so the band holds no function here */
     && !band1.some(([w]) => w === 'nolink' || w === 'noname'),
    'D-056 (1) · BY MOMENT stands ' + wantWork.map(([n, d]) => n + ' ↓' + d).join(', ') + ' at the work (the call inside start_session reaches them), the login check\'s own at the dependencies; no function behind is left in the band (D-057)',
    { work: work.map((c) => c.t), band: band1 });
  /* review F3: a function whose own steps name the paths it runs on stands on those paths only and says nothing more —
     count_active_sessions (not the replay 201), and seed_stage_schedule too.
     CHANGED 2026-09-27 (the scoped-import fix): start_session imports seed_stage_schedule in its own body, so the effects arm now walks
     it — its update of cooking_sessions is a step on the 201 path, and it stands on exactly that ending (it was the upper-bound example).
     A function with no steps of its own still stands on the paths of the handler call that reaches it — an upper bound, its hover says
     so: read on the first endpoint the page draws one, from the page's record of it (e[7].cp) */
  const onOwn = (fid) => { const e0 = R.mo.el.find((e) => e[0] === 'fn' && e[2].some((ki) => MK[ki] === 'fn:' + fid)); if (!e0) return null;
    return { on: R.mo.ex.map((x, i) => [x[0], e0[5] == null || !!((e0[5] >> i) & 1)]).filter(([, on]) => on).map(([x]) => x),
      paths: FE.paths.filter((q) => (q.effects.steps || []).some((e) => (STEPS[e.step] || {}).fn === fid)).map((q) => q.exit.id), cp: (e0[7] || {}).cp || null }; };
  const same = (a, b) => JSON.stringify([...new Set(a)].sort()) === JSON.stringify([...new Set(b)].sort());
  const oSeed = onOwn('apps/api/services/long_prep.py::seed_stage_schedule'), oCount = onOwn('apps/api/services/cooking.py::count_active_sessions');
  const tSeed = await tipAt('#mogrid td[data-mom="work"][data-f="fn"] .mc[data-keys="fn:apps/api/services/long_prep.py::seed_stage_schedule"] .mt');
  const tCount = await tipAt('#mogrid td[data-mom="work"][data-f="fn"] .mc[data-keys="fn:apps/api/services/cooking.py::count_active_sessions"] .mt');
  const EU = FEED.find((ep) => ROW[ep].mo.el.some((e) => e[0] === 'fn' && (e[7] || {}).cp));
  let tUp = null, eUp = null;
  if (EU) { eUp = ROW[EU].mo.el.find((e) => e[0] === 'fn' && (e[7] || {}).cp); await openEp(EU);
    const kUp = MK[eUp[2][0]]; tUp = await tipAt('#mogrid td[data-f="fn"] .mc[data-keys^="' + kUp + '"] .mt'); await openEp(E); }
  ok(oSeed && oCount && tSeed && tCount && !oSeed.cp && !oCount.cp && same(oSeed.paths, oSeed.on) && same(oCount.paths, oCount.on) && oSeed.paths.length > 0
     && !tSeed.includes(fillW(MX.callPaths, { via: 'start_session' })) && !tCount.includes(fillW(MX.callPaths, { via: 'start_session' }))
     && !!EU && !!tUp && tUp.includes(fillW(MX.callPaths, { via: eUp[7].cp })),
    'review F3 · ' + E + ' · seed_stage_schedule and count_active_sessions stand on exactly the endings their own steps are on and say nothing more; on ' + EU + ' a function with no steps of its own stands on the paths of ' + (eUp && eUp[7].cp) + ', and its hover says so',
    { oSeed, oCount, EU, tUp: (tUp || '').slice(0, 160) });
  /* (2) the cases it arranges */
  const arrWant = [...new Set([...(FE.tests.arranged_by || []), ...(FE.tests.helper_arranged || [])])], arrPage = await p.$$eval('#ocol-cm .pair[data-k="d:arranged"] [data-key]', (cs) => cs.map((c) => c.getAttribute('data-key').slice(5)));
  const arrTxt = await p.$eval('#ocol-cm .pair[data-k="d:arranged"] .pk', (e) => e.textContent), inGrid = await p.$$eval('#mogrid [data-keys]', (cs) => cs.flatMap((c) => c.getAttribute('data-keys').split('\n')));
  const moBandP = await p.$$eval('#moband .mbb[data-f="proof"] .mbr', (rs) => rs.map((r) => r.getAttribute('data-why')));
  ok(arrTxt === fillW(PW.arranged, { n: arrWant.length }) && JSON.stringify(arrPage) === JSON.stringify(arrWant) && arrWant.every((c) => !inGrid.includes('case:' + c)) && !moBandP.includes('arranged'),
    'D-056 (2) · ' + E + ' · "' + fillW(PW.arranged, { n: arrWant.length }) + '" names the ' + arrWant.length + ' cases the feed lists (' + arrWant.join(' ') + '); none stands at a moment, and the band holds no Proof row to join', { arrPage, moBandP });
  const EB = FEED.find((ep) => ROW[ep].mo.un.some((u) => u[0] === 'proof' && u[3] !== 'arranged') && ROW[ep].d.arranged.length);
  if (EB) { await openEp(EB); const bb = await p.$$eval('#moband .mbb[data-f="proof"] .mbr[data-why="arranged"] .mc', (cs) => cs.map((c) => c.getAttribute('data-key').slice(5)));
    /* review F2: a case the band already holds under another reason (an acting call proving no ending) is not drawn there twice */
    const held = new Set(await p.$$eval('#moband .mbb[data-f="proof"] .mbr:not([data-why="arranged"]) .mc', (cs) => cs.map((c) => c.getAttribute('data-key').slice(5))));
    const want2 = ROW[EB].d.arranged.map((x) => x[0]).filter((c) => !held.has(c));
    ok(JSON.stringify(bb) === JSON.stringify(want2) && bb.every((c) => !held.has(c)), 'D-056 (2) · ' + EB + ' · where the band already lists Proof\'s unplaced, the arranging cases join it, "' + D.words.mo.why.arranged.name + '" — each once, never beside the same case under another reason (' + [...held].filter((c) => ROW[EB].d.arranged.some((x) => x[0] === c)).join(' ') + ' already there)', { bb, want2 });
    await openEp(E); }
  /* review F1: a case the feed lists as arranging both ways (arranged_by and helper_arranged) is ONE item, counted once */
  const EA = FEED.find((ep) => { const t = (FJ.endpoints['endpoint:' + ep] || {}).tests || {}; return (t.arranged_by || []).some((c) => (t.helper_arranged || []).includes(c)); });
  if (EA) { await openEp(EA); const tA = FJ.endpoints['endpoint:' + EA].tests, uA = [...new Set([...(tA.arranged_by || []), ...(tA.helper_arranged || [])])], both = uA.filter((c) => tA.arranged_by.includes(c) && tA.helper_arranged.includes(c));
    const pA = await p.$$eval('#ocol-cm .pair[data-k="d:arranged"] [data-key]', (cs) => cs.map((c) => [c.getAttribute('data-key').slice(5), (c.querySelector('.hlp') || {}).textContent || ''])), nA = await p.$eval('#ocol-cm .pair[data-k="d:arranged"] .pk', (e) => e.textContent);
    ok(JSON.stringify(pA.map((x) => x[0])) === JSON.stringify(uA) && nA === fillW(PW.arranged, { n: uA.length }) && both.every((c) => pA.find((x) => x[0] === c)[1].trim() === PW.arrangedBoth),
      'D-056 (2) · ' + EA + ' · ' + both.join(' ') + ', listed both ways by the feed, is one item ("' + PW.arrangedBoth + '"), and the pair counts ' + uA.length + ' cases', { pA: pA.length, uA: uA.length });
    await openEp(E); }
  /* (3) declared or not */
  const dset = new Set([422, FE.declared.success.status, ...(FE.declared.refusals || [])]);
  const ends = await p.$$eval('#mogrid td[data-f="end"] .mc .vc-status', (cs) => cs.map((v) => [v.textContent, v.getAttribute('data-decl'), getComputedStyle(v).backgroundColor]));
  const und = (FE.findings.find((f) => f.id === 'undeclared') || {}).statuses || [];
  const cmSt = await p.$$eval('#ocol-cm .pair[data-k="d:exits"] tr.erow .vc-status', (cs) => cs.map((v) => [v.textContent, v.getAttribute('data-decl')]));
  const hollowBg = ends.filter(([, d]) => d === '0').map(([, , bg]) => bg), fillBg = ends.filter(([, d]) => d === '1').map(([, , bg]) => bg);
  ok(ends.length === new Set(R.mo.ex.map((x) => x[0])).size && ends.every(([s0, d]) => (s0 === '500' ? d === null : d === (dset.has(+s0) ? '1' : '0')))
     && JSON.stringify([...new Set(ends.filter(([, d]) => d === '0').map(([s0]) => +s0))].sort()) === JSON.stringify([...und].sort())
     && JSON.stringify(cmSt) === JSON.stringify(ends.map(([s0, d]) => [s0, d])) && hollowBg.every((bg) => /rgba\(0, 0, 0, 0\)|transparent/.test(bg)) && fillBg.every((bg) => !/rgba\(0, 0, 0, 0\)/.test(bg)),
    'D-056 (3) · ' + E + ' · each ending declared (' + [...new Set(ends.filter(([, d]) => d === '1').map(([s0]) => s0))].join(' ') + ') is filled, each not (' + und.join(' ') + ', the undeclared alarm) hollow, the uncaught unmarked — in BY MOMENT and the endings table',
    { ends: ends.map(([s0, d]) => s0 + ':' + d).join(' '), und });
  /* (4) the fate of the writes on a picked path */
  const bucketOf = (pid, sid) => { const ef = FE.paths.find((q) => q.id === pid).effects; return ({ committed: 'saved', maybe_committed: 'maybe', rolled_back: 'rolled', uncommitted: 'unsaved' })[['committed', 'maybe_committed', 'rolled_back', 'uncommitted'].find((b0) => (ef[b0] || []).includes(sid))]; };
  const addSt = (pid) => (FE.paths.find((q) => q.id === pid).effects.steps || []).map((e) => e.step).find((sid) => STEPS[sid].table === 'cooking_sessions' && STEPS[sid].op === 'add');
  /* CHANGED 2026-09-26 (D-057 c): a code is a path — the path to the ending that runs the add is picked by its own id */
  const fateOn = async (pid) => { const i = R.mo.ex.findIndex((x) => x[8] === pid); await p.click('#mobar .mopath[data-path="' + i + '"]'); await p.waitForTimeout(120);
    const c = (await cell('work', 'data')).find((q) => q.keys.includes('table:cooking_sessions') && /\bW\b/.test(q.t)); return c ? c.fate : null; };
  const X201 = FE.returns.find((x) => x.status === 201).id, X403 = FE.produced.find((x) => x.status === 403).id;
  const w201 = [...new Set(FE.paths.filter((q) => q.exit.id === X201 && addSt(q.id)).map((q) => bucketOf(q.id, addSt(q.id))))];
  /* CHANGED 2026-09-27 (the scoped-import fix): the 403 is raised inside assert_recipe_allergen_safe, two calls down, BEFORE start_session
     adds the session — its path stops at that raise (effects.read_to), so no path to the 403 runs the add and the chip wears no fate there
     (it wore "left unsaved", a claim the fix found false) */
  const p403 = FE.paths.filter((q) => q.exit.id === X403), f201 = await fateOn((FE.paths.find((q) => q.exit.id === X201 && addSt(q.id)) || {}).id);
  const f403 = p403.length === 1 ? await fateOn(p403[0].id) : ['more than one path'];
  await p.click('#mobar .mopath[data-path="all"]'); await p.waitForTimeout(120); const fAll = await p.$$eval('#mogrid .vc-fate', (cs) => cs.length);
  ok(JSON.stringify(f201) === JSON.stringify(w201) && w201[0] === 'saved' && p403.length === 1 && !addSt(p403[0].id) && p403[0].effects.read_to
     && (!f403 || !f403.length) && fAll === 0,
    'D-056 (4) · ' + E + ' · the add to cooking_sessions wears "' + D.words.fates.saved.name + '" on the path to the 201 (the feed\'s bucket); the 403\'s path stops at the raise at ' + (p403[0] || { effects: {} }).effects.read_to + ', before the add — no fate there; all paths, no fate', { f201, f403, fAll });
  /* (5) the race */
  const r500 = ((FE.arm_findings || {}).contract || []).filter((f) => f.id === 'race-500'), rc = (await cell('work', 'data')).filter((c) => c.race);
  const rcTip = await tipAt('#mogrid td[data-mom="work"][data-f="data"] .mc:has(.mrc) .mt'), claim = FE.repeat.claims.find((c) => c.race === 'uncaught');
  ok(r500.length === 1 && rc.length === 1 && rc[0].hint === r500[0].race_at.split('/').pop() && rc[0].t.includes('500') && rcTip && rcTip.includes(fillW(MX.race, { cons: claim.constraint })) && rcTip.includes(claim.unique.join(', ')),
    'D-056 (5) · ' + E + ' · the flush at ' + (r500[0] || {}).race_at + ' (the race-500 alarm\'s) wears the race on ' + claim.constraint + ', joined to the uncaught 500', { rc: rc.map((c) => c.t), rcTip: (rcTip || '').slice(0, 160) });
  /* (6) a test that fits endings at several moments */
  const C237 = Object.values(FJ.test_cases.C237.calls).find((c) => c.endpoint === EK), xs237 = C237.refs.map((q) => q.exit);
  const momOf = (xid) => R.mo.sp[R.mo.ex.find((x) => x[0] === xid)[3]][0], pc = [];
  for (const m of [...new Set(R.mo.sp.map((x) => x[0]))]) for (const c of await cell(m, 'proof')) if (c.keys.includes('case:C237')) pc.push([m, c.st[0][0], c.hol, c.dash]);
  const want237 = xs237.map((xid) => [momOf(xid), String((FE.produced.concat(FE.framework_exits)).find((x) => x.id === xid).status)]).sort().map((x) => x.join(' '));
  ok(JSON.stringify(pc.map((x) => x[0] + ' ' + x[1]).sort()) === JSON.stringify(want237) && pc.every((x) => x[2] && x[3] === 'dashed') && !(await p.$$eval('#moband .mbr[data-why="spans"] .mc', (cs) => cs.map((c) => c.textContent))).some((t) => t.includes('C237')),
    'D-056 (6) · ' + E + ' · C237 asserts a status four endings share: it rides each (' + want237.join(' · ') + '), hollow and dashed, and no longer stands in the band', pc);
  /* (7) the headers per ending */
  const hdrs = Object.entries(FE.responses).filter(([, r0]) => r0.headers).map(([xid, r0]) => [xid, r0.status, Object.entries(r0.headers).map(([h, v]) => h + ': ' + v).join(' · ')]);
  const cmH = await p.$eval('#ocol-cm .pair[data-k="d:response"] .hdl', (e) => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => '');
  const t429 = await tipAt('#mogrid td[data-mom="edge"][data-f="end"] .mc .vc-status'), t401 = await tipAt('#mogrid td[data-mom="gate"][data-f="end"] .mc .vc-status');
  ok(hdrs.length === 3 && hdrs.every(([, st, h]) => cmH.includes(st + ' ' + h)) && t429 && t429.includes(fillW(MX.headers, { v: 'Retry-After: …' })) && t401 && t401.includes('WWW-Authenticate: Bearer'),
    'D-056 (7) · ' + E + ' · Retry-After on both 429s and WWW-Authenticate on the 401 ride their chips\' hovers and the code map\'s reply pair', { cmH, t429: (t429 || '').slice(0, 120) });
  /* (8) the schemas inside the reply */
  const S8 = FJ.schemas, nest = (top) => { const seen = new Set(), out = [], todo = [top]; while (todo.length) { const n = todo.shift(); if (seen.has(n)) continue; seen.add(n); if (n !== top) out.push(n);
    for (const f of ((S8['schema:' + n] || {}).fields || [])) for (const w of String(f.annotation).match(/[A-Za-z_][A-Za-z0-9_]*/g) || []) if (S8['schema:' + w]) todo.push(w); } return out; };
  const n8 = nest(FE.declared.response_model.name), ans = await cell('answer', 'shape'), cmN = await p.$$eval('#ocol-cm .pair[data-k="d:response"] .bhl [data-key]', (cs) => cs.map((c) => c.getAttribute('data-key')));
  ok(n8.length > 0 && n8.every((n) => ans.some((c) => c.keys.includes('schema:' + n) && c.t.startsWith('↳'))) && JSON.stringify(cmN) === JSON.stringify(n8.map((n) => 'schema:' + n)),
    'D-056 (8) · ' + E + ' · ' + n8.join(', ') + ', inside ' + FE.declared.response_model.name + ' (schemas{}), stands under it at the answer and in the code map\'s reply pair', { ans: ans.map((c) => c.t), cmN });
  const E8 = 'GET /cooking/active', n8b = nest(FJ.endpoints['endpoint:' + E8].declared.response_model.name); await openEp(E8);
  const ans8 = await cell('answer', 'shape');
  ok(n8b.includes('CookingSessionResponse') && n8b.includes('CookingPhotoRef') && n8b.every((n) => ans8.some((c) => c.keys.includes('schema:' + n))), 'D-056 (8) · ' + E8 + ' · the row\'s example: ' + n8b.join(', ') + ' stand under the reply at the answer', ans8.map((c) => c.t));
  /* review F4: a schema two levels down names the schema it sits in, not the top — read off schemas{} here */
  const parOf = (n) => Object.entries(S8).find(([k0, v0]) => (v0.fields || []).some((f) => (String(f.annotation).match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).includes(n)) && n8b.concat([FJ.endpoints['endpoint:' + E8].declared.response_model.name]).includes(k0.slice(7)))[0].slice(7);
  const tPhoto = await tipAt('#mogrid td[data-mom="answer"][data-f="shape"] .mc[data-keys="schema:CookingPhotoRef"] .mt'), cmPar = await p.$eval('#ocol-cm .pair[data-k="d:response"] .bhl', (e) => e.innerText.replace(/\s+/g, ' ').trim());
  ok(parOf('CookingPhotoRef') === 'CookingSessionResponse' && tPhoto && tPhoto.includes(fillW(MX.inside, { v: 'CookingSessionResponse' })) && !tPhoto.includes(fillW(MX.inside, { v: 'ActiveCookingResponse' }))
     && cmPar.includes('CookingPhotoRef ' + fillW(PW.nestedParent, { v: 'CookingSessionResponse' })),
    'D-056 (8) · ' + E8 + ' · CookingPhotoRef sits inside CookingSessionResponse (its photos field), and its hover and the reply pair say so — not the top', { tPhoto: (tPhoto || '').slice(0, 120), cmPar });
  /* (9) who fetches it */
  const bridge = (ep) => { const out = []; (C4.cross_edges || []).forEach((e0) => { if (e0.kind === 'bridge' && e0.to === 'endpoint:' + ep) out.push(e0); }); return out; };
  const E9 = 'GET /account/export'; await openEp(E9);
  const hk9 = await p.$$eval('#ocol-cm .pair[data-k="d:hook"] [data-key]', (cs) => cs.map((c) => [c.getAttribute('data-key'), c.getAttribute('data-tip')]));
  const send9 = await cell('send', 'client');
  ok(bridge(E9).length === 1 && hk9.length === 1 && /accountExport\.ts$/.test(hk9[0][0]) && hk9[0][1] === 'hookfile' && send9.some((c) => c.keys.includes(hk9[0][0])),
    'D-056 (9) · ' + E9 + ' · the file its bridge edge ends at (accountExport) is named in the hook pair and at "the screen sends it"', { hk9, send9: send9.map((c) => c.t) });
  const E9b = 'PATCH /settings/preferences', L9b = facts(E9b); await openEp(E9b);
  const hk9b = await p.$$eval('#ocol-cm .pair[data-k="d:hook"] [data-key]', (cs) => cs.map((c) => c.getAttribute('data-key'))), sc9b = await p.$$eval('#ocol-cm .pair[data-k="d:screens"] [data-key]', (cs) => cs.map((c) => c.getAttribute('data-key')));
  ok(JSON.stringify(hk9b) === JSON.stringify(L9b.widening.fetched_by.map((q) => q.id)) && JSON.stringify(sc9b) === JSON.stringify(L9b.widening.screens.map((q) => q.id)) && hk9b[0].endsWith('#useRedoSetup'),
    'D-056 (9) · ' + E9b + ' · the hook pair names useRedoSetup and the screens pair its screen, by name (the lab\'s fetched_by and screens), no longer a bare count', { hk9b, sc9b });
  await openEp(E);
  /* (10) the hovers of the limiter, the login check and a case */
  const lim = FE.rate.limits.find((l) => l.limiter === '_sensitive'), av = (l, q) => l.args.find((a) => a.param === q).value;
  const tL = await tipAt('#mogrid .mc[data-keys="limiter:sensitive"] .mt'), tA = await tipAt('#mogrid td[data-mom="gate"][data-f="gate"] .mc[data-key^="fn:"] .mt'), tC = await tipAt('#mogrid .mc[data-f="proof"][data-keys="case:C267"] .mt');
  const sch = FE.auth.schemes[0], c267 = FJ.test_cases.C267.calls.find((c) => c.endpoint === EK && c.role === 'act');
  ok(tL && tL.includes(fillW(MX.limit, { n: av(lim, 'limit'), w: av(lim, 'window_seconds'), k: lim.key })) && tA && tA.includes(fillW(MX.auth, { scheme: sch.scheme, header: sch.header, carrier: sch.carrier }))
     && tC && tC.includes(fillW(MX.asserts, { v: c267.asserts.status.join(' · ') })),
    'D-056 (10) · ' + E + ' · the limiter\'s hover says ' + av(lim, 'limit') + ' per ' + av(lim, 'window_seconds') + ' s keyed ' + lim.key + '; the login check\'s, ' + sch.scheme + ' reads the ' + sch.header + ' ' + sch.carrier + '; C267\'s, what it asserts', { tL: (tL || '').slice(0, 140), tA: (tA || '').slice(0, 140), tC: (tC || '').slice(0, 140) });
  /* (11) the handler pair's hover */
  const sg = L56.identity.sig, tH = await tipAt('#ocol-cm .pair[data-k="h:handler"] .pk'), SW = D.words.codemap.sig;
  ok(tH && tH.includes([sg.async ? SW.async : SW.sync, fillW(SW.lines, { lines: sg.lines }), fillW(SW.returns, { ret: sg.returns })].join(' · ')) && tH.includes(L56.identity.gsig) && tH.includes(L56.identity.doc ? fillW(SW.doc, { v: L56.identity.doc }) : SW.noDoc),
    'D-056 (11) · ' + E + ' · the handler pair\'s hover: ' + (sg.async ? 'async' : 'not async') + ' · ' + sg.lines + ' lines · returns ' + sg.returns + ', the def text, ' + (L56.identity.doc ? 'its docstring' : 'no docstring'), (tH || '').slice(0, 200));
  /* (12) a streamed answer */
  const streams = Object.values(C4.l2 || {}).flatMap((e0) => e0.nodes || []).filter((n) => n.kind === 'endpoint' && n.stream).map((n) => n.id.replace(/^endpoint:/, ''));
  const E12 = streams[0]; await openEp(E12);
  const ok12 = await cell('answer', 'end'), cm12 = await p.$$eval('#ocol-cm .pair[data-k="d:exits"] tr.erow .sksub', (cs) => cs.map((v) => v.getAttribute('data-vc') + ':' + v.getAttribute('data-vv')));
  const others = FEED.filter((ep) => !streams.includes(ep) && ROW[ep].stream);
  ok(streams.length === 1 && ok12.length === 1 && ok12[0].sub.includes('delivery:stream') && cm12.includes('delivery:stream') && !others.length,
    'D-056 (12) · ' + E12 + ' · the success wears the station\'s delivery:stream label in BY MOMENT and the endings table; no other endpoint streams', { ok12: ok12.map((c) => c.sub), cm12 });
  await p.evaluate(() => window.scrollTo(0, 0)); }
ok(!errs.length, 'no page error after the D-056 checks', errs);

/* 17 · D-057 (his ruling "build 1 and 2", 2026-09-26), each expected value recomputed HERE from forms.json or the station's levels.json,
   read off the page after a real click or a real hover.
   GROUP 1 — the switch counts what BY MOMENT already draws: on POST /cooking/sessions the method, the first segment, the declared status,
   the handler (its function and its file), every path's fate and every alarm are carried; the count of the fates and the alarms' dots stay;
   the facts are on the page (the heading's path, the filled success status, the handler chip's file:line, the alarms list with no arm
   word and with the client's alarm); GET /healthz's alarms stay bright (its 429 is on no path). The Endings row's info line says no
   refusal carries a code, counted on the feed.
   GROUP 2 — (a) the check that raises the lost reason says the class and its words, the ending after the catch keeps the words it sends;
   (b) a client branch shows the status it reads and says what it does, in place of the map's "read"; (c) the two paths to the 201 are two
   codes, told apart by the fork each takes, each keeping its own moments and chips; (d) the functions behind no call edge places stand
   where their nearest caller stands (the station's behind lists), on its paths, said in the hover, the ones known by name only without a
   glyph; (e) on PATCH …/timer the 500 says what escapes to it and the function it is raised in says nothing catches it. */
{ const fillW = (s0, x) => String(s0).replace(/\{(\w+)\}/g, (m, k) => (x[k] != null ? x[k] : m));
  const E = 'POST /cooking/sessions', EK = 'endpoint:' + E, R = ROW[E], FE = FJ.endpoints[EK], MX = D.words.mo.x, MP = D.words.mo.path;
  const base = (at) => String(at || '').split('/').pop();
  const openEp = async (ep) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + ep + '"] td.id'); await p.waitForTimeout(150); };
  const tipAt = async (sel) => { const h = await p.$(sel); if (!h) return null; await h.evaluate((x) => x.scrollIntoView({ block: 'center' })); await p.waitForTimeout(40);
    const bx = await h.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(90); const t = await p.$eval('#tip', (e) => e.textContent); await p.mouse.move(5, 5); return t; };
  const cell = (mom, f) => p.$$eval('#mogrid td[data-mom="' + mom + '"][data-f="' + f + '"] .mc', (cs) => cs.map((c) => ({ keys: c.getAttribute('data-keys'), t: c.innerText.replace(/\s+/g, ' ').trim(),
    name: (c.querySelector('.mt') || {}).textContent || '', glyph: !!c.querySelector('.skg'), st: [...c.querySelectorAll('.vc-status')].map((v) => v.textContent), does: !!c.querySelector('[data-vc="does"]'),
    w: [...c.querySelectorAll('.vc[data-vc="op"]')].map((v) => v.getAttribute('data-vv')), fate: [...c.querySelectorAll('.vc-fate')].map((v) => v.getAttribute('data-vv')), hint: c.getAttribute('data-hint') })));
  await open(PAGE); await openEp(E);
  /* GROUP 1 */
  const g1 = await p.evaluate((fk) => { const C = document.getElementById('ocol-cm'), st = (k) => { const e = [...C.querySelectorAll('.pair[data-k]')].find((x) => x.getAttribute('data-k') === k); return e ? e.getAttribute('data-cvs') : null; };
    const items = (k) => [...C.querySelectorAll('[data-cf="' + k + '"][data-ci]')].map((e) => e.getAttribute('data-cv') === '1');
    const hc = [...document.querySelectorAll('#mogrid .mc[data-f="fn"]')].find((c) => c.getAttribute('data-keys') === fk);
    return { st: Object.fromEntries(['h:method', 'h:segment', 'h:declared', 'h:handler', 'd:fates', 'd:alarms', 'c:alarms', 'c:fate'].map((k) => [k, st(k)])),
      fates: items('d:fates'), alarms: items('d:alarms'), handler: items('h:handler'), head: [...document.querySelectorAll('#mohead h3 > span')].map((q) => q.textContent),
      arm: C.querySelectorAll('.pair[data-k="d:alarms"] [data-vc="arm"]').length, list: [...C.querySelectorAll('.pair[data-k="d:alarms"] li [data-vc="alarm"]')].map((v) => v.getAttribute('data-vv')),
      hint: hc ? hc.getAttribute('data-hint') : null, filled: [...document.querySelectorAll('#mogrid td[data-f="end"] .vc-status[data-decl="1"]')].map((v) => v.textContent) }; }, 'fn:' + FE.handler);
  const al1 = [...(FE.findings || []), ...Object.values(FE.arm_findings || {}).flat(), ...((FJ.arm_findings || {}).frontend || []).filter((f) => f.endpoint === EK)].map((f) => f.id);
  ok(['h:method', 'h:segment', 'h:declared', 'h:handler', 'd:fates', 'd:alarms'].every((k) => g1.st[k] === 'c') && g1.st['c:alarms'] === 'b' && g1.st['c:fate'] === 'b'
     && g1.fates.length === FE.paths.length && g1.fates.every(Boolean) && g1.alarms.length === al1.length && g1.alarms.every(Boolean) && g1.handler.every(Boolean)
     && g1.head.includes(FE.path) && FE.path.split('/')[1] === R.seg && g1.filled.includes(String(FE.declared.success.status)) && g1.hint === base(FE.file) + ':' + FE.line
     && !g1.arm && JSON.stringify([...g1.list].sort()) === JSON.stringify([...al1].sort()) && g1.list.includes('reason-collapsed'),
    'D-057 · group 1 · ' + E + ': the method, the segment, the declared ' + FE.declared.success.status + ', the handler and its file (' + g1.hint + '), the ' + FE.paths.length + ' fates and the ' + al1.length + ' alarms (' + al1.join(' ') + ') are carried, each fact drawn in BY MOMENT; the fates count and the alarm dots stay; no arm word',
    { st: g1.st, head: g1.head, hint: g1.hint, list: g1.list, fates: g1.fates.filter((x) => !x).length, alarms: g1.alarms });
  const own = FJ.endpoints ? Object.values(FJ.endpoints).flatMap((e0) => e0.produced || []).filter((x) => x.phase !== 'uncaught' && x.state === 'defined') : [];
  await p.click('#itog-mo'); await p.waitForTimeout(80);
  const nc = await p.$eval('#mo-nocode', (e) => [e.textContent, getComputedStyle(e).display, !!e.closest('#mogrid tr[data-f="end"]')]).catch(() => null);
  await p.click('#itog-mo'); await p.waitForTimeout(60);
  const nc0 = await p.$eval('#mo-nocode', (e) => getComputedStyle(e).display).catch(() => null);
  ok(nc && nc[0] === fillW(D.words.mo.noCode, { nCoded: own.filter((x) => x.code).length, nRefusals: own.length }) && own.filter((x) => x.code).length === 0 && nc[1] !== 'none' && nc[2] && nc0 === 'none',
    'D-057 · text-only · the Endings row says, behind the info toggle, that none of the app\'s ' + own.length + ' own refusals carries a code (' + own.filter((x) => x.code).length + ')', { nc, nc0 });
  const E17b = 'GET /healthz', F17b = FJ.endpoints['endpoint:' + E17b], dead = (F17b.produced || []).filter((x) => !F17b.paths.some((q) => q.exit.id === x.id)).map((x) => x.status);
  await openEp(E17b);
  const hz = await p.evaluate(() => [...document.querySelectorAll('#ocol-cm [data-cf="d:alarms"][data-ci]')].map((e) => e.getAttribute('data-cv') === '1'));
  ok(dead.length === 1 && dead[0] === 429 && hz.length === 2 && hz.every((x) => !x), 'D-057 · group 1 · ' + E17b + ': its alarms stay bright — the ' + dead[0] + ' they read is on no path', { dead, hz });
  await openEp(E);
  /* (a) the lost reason */
  const rl = FE.findings.find((f) => f.id === 'reason-lost'), rz = Object.values(FJ.functions).flatMap((f0) => f0.raises || []).find((q) => q.msg === rl.was && FE.preconditions.some((g) => g.at === q.at));
  const gA = FE.preconditions.find((g) => g.at === rz.at), tA = await tipAt('#mogrid td[data-f="gate"] .mc[data-keys^="guard:' + gA.id + '"] .mt');
  const momA = await p.$eval('#mogrid td[data-f="gate"] .mc[data-keys^="guard:' + gA.id + '"]', (c) => c.closest('td').getAttribute('data-mom')).catch(() => null);
  const xA = FE.produced.find((x) => x.at === rl.at && x.status === rl.status), endA = await p.$$eval('#mogrid td[data-f="end"] .mc', (cs) => cs.map((c) => [c.closest('td').getAttribute('data-mom'), c.getAttribute('data-hint')]));
  ok(tA && tA.includes(fillW(MX.raises, { cls: rz.cls, msg: rz.msg })) && momA === 'work' && endA.some(([m, h]) => m === 'fail' && h === xA.detail),
    'D-057 (a) · ' + E + ': the check ' + gA.pred + ' (at the work) says it raises ' + rz.cls + ' “' + rz.msg + '”; after the catch the 404 sends “' + xA.detail + '”', { tA: (tA || '').slice(0, 200), momA });
  /* (b) what the client branch reads and does */
  const S1 = FJ.frontend.reasons.sites.find((s0) => s0.id === 'r-56d72b7e4b'), cB = (await cell('after', 'client')).find((c) => c.keys === 'reason:' + S1.id);
  const tB = await tipAt('#mogrid td[data-mom="after"][data-f="client"] .mc[data-keys="reason:' + S1.id + '"] .mt');
  const E16b = 'POST /setup/complete', S2 = FJ.frontend.reasons.sites.find((s0) => s0.id === 'r-56477c4fb6');
  await openEp(E16b); const cB2 = (await cell('after', 'client')).find((c) => c.keys === 'reason:' + S2.id), tB2 = await tipAt('#mogrid td[data-mom="after"][data-f="client"] .mc[data-keys="reason:' + S2.id + '"] .mt');
  await openEp(E);
  ok(cB && JSON.stringify(cB.st) === JSON.stringify([String(S1.value)]) && !cB.does && tB && tB.includes(S1.does[0].literal) && tB.includes(fillW(MX.reads, { what: S1.reads, op: S1.op, v: S1.value }))
     && cB2 && JSON.stringify(cB2.st) === JSON.stringify([String(S2.value)]) && tB2 && tB2.includes(S2.does[0].args[0]),
    'D-057 (b) · the client branch at ' + base(S1.at) + ' shows the ' + S1.value + ' it reads and says it hands back “' + S1.does[0].literal + '”; on ' + E16b + ' ' + base(S2.at) + ' says it calls ' + S2.does[0].callee + '(“' + S2.does[0].args[0] + '”)', { cB, tB: (tB || '').slice(0, 220), cB2 });
  /* (c) two paths to the 201 */
  const X201 = FE.returns.find((x) => x.status === 201).id, P201 = FE.paths.filter((q) => q.exit.id === X201);
  const forkOf = (q) => q.chain.filter((s0) => s0.kind === 'branch' && s0.hit).map((s0) => { const b0 = FE.branches.find((b1) => b1.id === s0.ref); return b0.pred || MP.fall; }).join(' · ');
  const codes = await p.$$eval('#mobar .mopath[data-x="' + X201 + '"]', (bs) => bs.map((b) => [b.getAttribute('data-path'), b.getAttribute('data-p'), b.parentElement.getAttribute('data-mom'), b.innerText.trim()]));
  const res = [];
  for (const [i, pid] of codes) { const t = await tipAt('#mobar .mopath[data-path="' + i + '"]'); await p.click('#mobar .mopath[data-path="' + i + '"]'); await p.waitForTimeout(120);
    const own0 = FE.paths.find((q) => q.id === pid).effects.steps.filter((e0) => !e0.dependency && WR.has((STEPS[e0.step] || {}).op)).map((e0) => STEPS[e0.step].table);
    const ws = []; for (const m of ['checks', 'work', 'fail', 'save']) for (const c of await cell(m, 'data')) if (c.w.includes('w')) ws.push([c.name, c.fate]);
    res.push({ pid, t, own0: [...new Set(own0)].sort(), ws, rows: await p.$$eval('#mogrid th.mom', (hs) => hs.map((h) => h.getAttribute('data-mom'))) }); }
  await p.click('#mobar .mopath[data-path="all"]'); await p.waitForTimeout(100);
  const oneLine = await p.evaluate(() => { const bs = [...document.querySelectorAll('#mobar .mopath')], mid = (b) => { const q = b.getBoundingClientRect(); return q.top + q.height / 2; }; return bs.every((b) => Math.abs(mid(b) - mid(bs[0])) <= 3); });
  ok(P201.length === 2 && codes.length === 2 && JSON.stringify(codes.map((c) => c[1]).sort()) === JSON.stringify(P201.map((q) => q.id).sort()) && codes.every((c) => c[2] === 'answer' && c[3] === '201')
     && res.every((x) => x.t && x.t.includes(fillW(MP.fork, { v: forkOf(FE.paths.find((q) => q.id === x.pid)) }))) && res[0].t !== res[1].t
     && res.every((x) => JSON.stringify([...new Set(x.ws.map((w) => w[0]))].sort()) === JSON.stringify(x.own0) && x.ws.every((w) => w[1].length === 1)) && res.some((x) => !x.ws.length) && res.some((x) => x.ws.length) && oneLine,
    'D-057 (c) · ' + E + ': the 201 two paths reach is two codes at the answer, told apart by the fork each takes (' + P201.map((q) => forkOf(q)).join(' | ') + '); each keeps only its own writes (' + res.map((x) => x.ws.map((w) => w[0] + ':' + w[1]).join(',') || 'none').join(' | ') + '); the row stays one line',
    { codes, res: res.map((x) => ({ pid: x.pid, ws: x.ws, own0: x.own0, t: (x.t || '').slice(0, 120) })) });
  /* (d) the functions behind no call edge places */
  const LV = JSON.parse(fs.readFileSync(path.join(REPO, 'templates/center/shell/example/codebase-graph-station/levels.json'), 'utf8'));
  const LB = new Map(LV.fn_nodes.filter((n) => n.behind && n.behind.names).map((n) => [n.id.replace('#', '::'), n.behind.names]));
  const work = await cell('work', 'fn'), placedFns = work.filter((c) => c.keys && c.keys.startsWith('fn:')).map((c) => c.keys.slice(3)).filter((k) => k !== FE.handler && LB.has(k));
  const nearest = (n) => { const c0 = placedFns.filter((g) => LB.get(g).includes(n)); return c0.filter((g) => !c0.some((h) => h !== g && LB.get(g).includes(h.split('::').pop()))).map((g) => g.split('::').pop()); };
  const wantD = [['_stages', 1], ['_label', 1], ['_hold_hours', 1], ['derive_restrictions', 0], ['ResolutionSnapshot.violations_for', 0]].map(([n, keyed]) => [n, keyed, nearest(n)]);
  const gotD = [];
  for (const [n, keyed, via] of wantD) { const c = work.find((x) => x.name === n); const i = work.indexOf(c);
    const t = c ? await tipAt('#mogrid td[data-mom="work"][data-f="fn"] .mc:nth-child(' + (i + 1) + ') .mt') : null;
    gotD.push([n, !!c, c ? !!c.keys : null, c ? c.glyph : null, via, t && via.length === 1 && t.includes(fillW(MX.callPaths, { via: via[0] }))]); }
  const bandD = await p.$$eval('#moband .mbb[data-f="fn"] .mbr', (rs) => rs.map((r) => r.getAttribute('data-why')));
  ok(gotD.every(([n, here, hasKey, glyph, via, tipOk], j) => here && via.length === 1 && tipOk && (wantD[j][1] ? hasKey : !hasKey && !glyph)) && !bandD.length,
    'D-057 (d) · ' + E + ': ' + gotD.map((x) => x[0] + ' under ' + x[4].join(',')).join(' · ') + ' stand at the work on their caller\'s paths (the hover says so); the two known by name only carry no key and no glyph; the band holds no function', { gotD, bandD });
  /* (e) an error nothing catches */
  const ET = 'PATCH /cooking/sessions/{session_id}/timer', FT = FJ.endpoints['endpoint:' + ET], fT = FT.findings.find((f) => f.id === 'escape-500');
  const rfT = Object.entries(FJ.functions).filter(([, f0]) => (f0.raises || []).some((q) => q.at === fT.at && q.cls === fT.cls)).map(([k]) => k);
  await openEp(ET);
  const t500 = await tipAt('#mogrid td[data-mom="uncaught"][data-f="end"] .mc .vc-status'), tRu = rfT.length === 1 ? await tipAt('#mogrid td[data-f="fn"] .mc[data-keys="fn:' + rfT[0] + '"] .mt') : null;
  ok(t500 && t500.includes(fillW(MX.cause, { cls: fT.cls, at: base(fT.at) })) && tRu && tRu.includes(fillW(MX.uncaught, { cls: fT.cls, at: base(fT.at) })),
    'D-057 (e) · ' + ET + ': the 500 says it escapes from ' + fT.cls + ' raised at ' + base(fT.at) + ', and ' + (rfT[0] || '?').split('::').pop() + ' says it raises it and nothing catches it', { t500: (t500 || '').slice(0, 200), tRu: (tRu || '').slice(0, 200) });
  /* review F1 · a check inside a call is on the paths making the call, less those the feed shows leaving before it (a returning fork
     or a fired check its `after` negates): the replay code shows neither the recipe check nor the cap check; the first-run code shows
     both, the cap check saying it may be skipped (its chain carries no step of it) */
  await openEp(E);
  const brF = new Map(FE.branches.map((b0) => [b0.id, b0])), preAt = new Map(FE.preconditions.filter((g) => g.at).map((g) => [g.at, g.pred]));
  const takenF = (q) => new Set(q.chain.flatMap((s0) => s0.kind === 'branch' && s0.hit && brF.get(s0.ref) && (brF.get(s0.ref).return || brF.get(s0.ref).exit) ? [brF.get(s0.ref).pred]
    : s0.kind === 'gate' && s0.hit && preAt.get(s0.at) ? [preAt.get(s0.at)] : []).filter(Boolean).map((T) => 'not (' + T + ')'));
  const inCall = FE.preconditions.filter((g) => /^call .+ @ /.test(g.via || ''));
  const f1 = [];
  for (const [i, pid] of codes) { const q = FE.paths.find((x) => x.id === pid), tk = takenF(q), site = (g) => g.via.replace(/^call .+ @ /, '');
    const makes = (g) => q.chain.some((s0) => (s0.kind === 'call' || s0.kind === 'collapsed') && s0.at === site(g)), carries = (g) => q.chain.some((s0) => (s0.kind === 'gate' || s0.kind === 'exit') && s0.ref === g.exit);
    const want = inCall.filter((g) => carries(g) || (makes(g) && !(g.after || []).some((a) => tk.has(a)))).map((g) => g.id).sort();
    const gone = inCall.filter((g) => makes(g) && !carries(g) && (g.after || []).some((a) => tk.has(a))).map((g) => g.id).sort();
    await p.click('#mobar .mopath[data-path="' + i + '"]'); await p.waitForTimeout(120);
    const got = (await p.$$eval('#mogrid td[data-f="gate"] .mc[data-keys^="guard:"]', (cs) => cs.map((c) => c.getAttribute('data-keys').split('\n')[0].slice(6)))).filter((k) => inCall.some((g) => g.id === k)).sort();
    /* on this path, a check it rides only by the call (its chain carries no step of its own) says so in its hover; one it carries does not */
    const said = [];
    for (const g of inCall.filter((g0) => got.includes(g0.id))) { const t = await tipAt('#mogrid td[data-f="gate"] .mc[data-keys^="guard:' + g.id + '"] .mt');
      const ownStep = q.chain.some((s0) => (s0.kind === 'gate' && s0.at === g.at) || (g.exit && (s0.kind === 'gate' || s0.kind === 'exit') && s0.ref === g.exit));
      said.push([g.id, ownStep, !!t && t.includes(fillW(MX.callCheck, { via: g.via.replace(/^call (.+) @ .+$/, '$1').split('::').pop() }))]); }
    f1.push({ pid, want, gone, got, said }); }
  await p.click('#mobar .mopath[data-path="all"]'); await p.waitForTimeout(100);
  const gCap = FE.preconditions.find((g) => /concurrent_cap/.test(g.pred || '')), tCap = await tipAt('#mogrid td[data-f="gate"] .mc[data-keys^="guard:' + gCap.id + '"] .mt');
  ok(f1.length === 2 && f1.every((x) => JSON.stringify(x.got) === JSON.stringify(x.want)) && f1.some((x) => x.gone.length === 2) && f1.some((x) => !x.gone.length && x.got.includes(gCap.id))
     && f1.every((x) => x.said.every(([, own, line]) => own !== line)) && f1.some((x) => x.said.some(([, own]) => own)) && tCap && tCap.includes(fillW(MX.callCheck, { via: 'start_session' })),
    'review F1 · ' + E + ': a check inside start_session stands only on the paths that reach it — the replay code drops ' + (f1.find((x) => x.gone.length) || { gone: [] }).gone.length + ' (its fork returns first); the first-run code keeps the cap check, whose hover says a path may skip it, and the recipe check, whose own step its chain carries, says nothing of it',
    { f1, tCap: (tCap || '').slice(0, 200) });
  /* review F2 · a raise with no fixed words says its words are built as it raises (or none are given) — never that it has none */
  const gF2 = FE.preconditions.find((g) => g.pred === 'recipe is None'), rzF2 = FJ.functions['apps/api/services/cooking.py::start_session'].raises.find((q) => q.at === gF2.at);
  const tF2 = await tipAt('#mogrid td[data-f="gate"] .mc[data-keys^="guard:' + gF2.id + '"] .mt');
  ok(rzF2 && rzF2.msg == null && tF2 && tF2.includes(fillW(MX.raisesBuilt, { cls: rzF2.cls })) && !/no fixed words/.test(tF2),
    'review F2 · ' + E + ': the check ' + gF2.pred + ' says “' + fillW(MX.raisesBuilt, { cls: rzF2 && rzF2.cls }) + '”', (tF2 || '').slice(0, 200));
  /* review F3 · a function joined to its caller by the station's behind lists names every placed function whose list is cut and does
     not name it (it may also run under it) — recomputed from levels.json on the stream endpoint */
  const E3 = 'GET /recipe-creation/gustify/stream', HF3 = FJ.endpoints['endpoint:' + E3].handler;
  const CUT = new Map(LV.fn_nodes.filter((n) => n.behind && n.behind.names_more).map((n) => [n.id.replace('#', '::'), n.behind.names_more]));
  await openEp(E3);
  const allFn = await p.$$eval('#mogrid td[data-f="fn"] .mc', (cs) => cs.map((c) => c.getAttribute('data-keys'))), w3 = await cell('work', 'fn');
  const placed3 = [...new Set(allFn.filter((k) => k && k.startsWith('fn:')).map((k) => k.split('\n')[0].slice(3)).filter((k) => k !== HF3 && LB.has(k)))];
  const near3 = (n) => { const c0 = placed3.filter((g) => LB.get(g).includes(n)); return c0.filter((g) => !c0.some((h) => h !== g && LB.get(g).includes(h.split('::').pop()))); };
  const cpPre = MX.callPaths.split('{via}')[0], cpNext = MX.callPathsPlain.split('{via}')[0], cnPre = MX.cutNear.split('{v}')[0];
  const f3 = [];
  for (let i = 0; i < w3.length; i++) { if (/\u2193/.test(w3[i].t)) continue;                       /* a depth mark: placed by its call edges, not by the lists */
    const t = await tipAt('#mogrid td[data-mom="work"][data-f="fn"] .mc:nth-child(' + (i + 1) + ') .mt'); if (!t || !t.includes(cpPre)) continue;
    const n0 = w3[i].name, own = w3[i].keys ? w3[i].keys.split('\n')[0].slice(3) : null, jc = near3(n0);
    const via = t.slice(t.indexOf(cpPre) + cpPre.length).split(cpNext)[0].split(', ').sort();
    if (JSON.stringify(via) !== JSON.stringify(jc.map((g) => g.split('::').pop()).sort())) continue;
    const hid = [...new Set(placed3.filter((h) => CUT.has(h) && !LB.get(h).includes(n0) && !jc.includes(h) && h !== own).map((h) => h.split('::').pop()))].sort();
    f3.push([n0, via, hid, hid.length ? t.includes(fillW(MX.cutNear, { v: hid.join(', ') })) && t.includes(fillW(MX.cutNearPlain, { v: hid.join(', ') })) : !t.includes(cnPre)]); }
  ok(f3.length >= 6 && f3.every((x) => x[3]) && f3.filter((x) => x[2].length).length >= 6,
    'review F3 · ' + E3 + ': ' + f3.filter((x) => x[2].length).length + ' of the ' + f3.length + ' functions joined to their caller say they may also run under ' + [...new Set(f3.flatMap((x) => x[2]))].join(', ') + ' (its list is cut); the rest say nothing of it', f3);
  await p.evaluate(() => window.scrollTo(0, 0)); }
ok(!errs.length, 'no page error after the D-057 checks', errs);

/* 18 · D-058 (his ruling 2026-09-26: "the same buttons to hide or dim the information that we already put below, but in the Gabe
   universe ... see in both panels what is already on the by moment table"). Real clicks on POST /cooking/sessions, every expected
   value read off the page's OTHER section — BY MOMENT's grid (the keys its chips carry, the names of its chips with no key, its heading)
   — never from the generator's marks:
   (a) both new switches open on "show all", my pick, dashed; the code map's too;
   (b) the universe: every item (its "+N more" opened, each Tests tab visited) is marked carried exactly when its one key is a key
       BY MOMENT's grid draws (a Code behind function with no key: when a grid chip with no key has its name; the endpoint: the
       heading); a count, a line, a flag, the signature, Source's file (the file's length, not the handler line) stay bright;
       the header's count is the items the page marks, of the items it draws, per row the generator's;
   (c) dim fades exactly the marks, the Accesses rows for the tables BY MOMENT draws among them, the rest whole; hide takes them away,
       each row carried in part says "+n in BY MOMENT"; the switches are independent and remembered apart (a reload);
   (d) THE GAPS from the universe: derive_restrictions and ResolutionSnapshot.violations_for fade (the grid has them by name), C237 and
       C267 fade exactly when the grid draws them, UserDietaryProfile, Source's file and the risk flags stay; hide takes the carried
       away; the count is the page's own; from the code map: an attribute is carried exactly when every code-map pair naming it that
       holds something here is carried whole (the code map's own marks); the count follows the way shown;
   (e) both copy texts carry the two switches' lines. */
{ const fillW = (s0, x) => String(s0).replace(/\{(\w+)\}/g, (m, k) => (x[k] != null ? x[k] : m));
  const E = 'POST /cooking/sessions', R = ROW[E], CW = D.words.carry, CL = D.words.copy.lines;
  const openEp = async (ep) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + ep + '"] td.id'); await p.waitForTimeout(150); };
  await open(PAGE); await openEp(E);
  const grid = await p.evaluate(() => ({ keys: [...new Set([...document.querySelectorAll('#mogrid .mc[data-keys]')].flatMap((c) => c.getAttribute('data-keys').split('\n')))],
    names: [...document.querySelectorAll('#mogrid td[data-f="fn"] .mc')].map((c) => [((c.querySelector('.mt') || {}).textContent || '').trim(), (c.getAttribute('data-keys') || '').split('\n').filter((k) => k.startsWith('fn:'))[0] || '']),
    ops: [...document.querySelectorAll('#mogrid .mc[data-f="data"][data-keys]')].flatMap((c) => { const o = c.querySelector('.vc[data-vc="op"]'); return o ? c.getAttribute('data-keys').split('\n').map((k) => o.getAttribute('data-vv') + '|' + k) : []; }),
    head: document.querySelector('#mohead h3').getAttribute('aria-label') }));
  /* F4 (review 2026-09-26): a name BY MOMENT draws — a function chip with no key, or a keyed one whose name no other function chip
     there wears under another key; F1: a table's read or write by a data chip wearing that op */
  const NK = {}; grid.names.forEach(([n, k]) => { (NK[n] = NK[n] || new Set()).add(k); });
  const MK = new Set(grid.keys.concat(grid.head === E ? ['endpoint:' + E] : [])), MN = new Set(Object.keys(NK).filter((n) => NK[n].has('') || NK[n].size === 1)), GO = new Set(grid.ops);
  const sq = (id) => p.evaluate((i) => ({ carry: document.getElementById(i).getAttribute('data-carry'),
    squares: [...document.querySelectorAll('#' + i + ' .opt[data-carry]')].map((o) => [o.getAttribute('data-carry'), o.getAttribute('aria-checked'), getComputedStyle(o).borderTopStyle]) }), id);
  const s0 = [await sq('ocol-uni'), await sq('ocol-gaps'), await sq('ocol-cm')];
  ok(s0.every((x) => x.carry === CW.pick && x.squares.length === 3 && x.squares.every(([v, on0, dash]) => (on0 === 'true') === (v === CW.pick) && (dash === 'dashed') === (v === CW.pick))),
    'D-058 · the Gabe Universe, THE GAPS and the code map each open their own switch on "' + CW.opts[CW.pick].name + '", my pick, dashed', s0);
  /* (b) the universe's items, every one drawn: the lists opened, each Tests tab visited */
  const readU = () => p.evaluate(() => { const U = document.getElementById('ocol-uni'), out = {};
    const shown = (e) => !!e.getClientRects().length && getComputedStyle(e).display !== 'none';
    const op = (e) => { let o = 1; for (let n = e; n && n !== U; n = n.parentElement) o *= +getComputedStyle(n).opacity; return o; };
    U.querySelectorAll('.ust .xmore').forEach((b) => b.click());
    const grab = (row) => { const rn = row.getAttribute('data-row'), o = out[rn] || (out[rn] = { st: row.getAttribute('data-ucs'), rowShown: shown(row), rowOp: op(row), note: [...row.querySelectorAll('.cvn')].filter(shown).map((e) => e.textContent), items: {} });
      row.querySelectorAll('[data-ue]').forEach((n) => { const i = n.getAttribute('data-ue'), it = o.items[i] || (o.items[i] = { keys: new Set(), cv: false, text: '', op: 1, shown: false, chip: false });
        [n, ...n.querySelectorAll('[data-keys]')].forEach((k) => (k.getAttribute('data-keys') || '').split('\n').filter(Boolean).forEach((x) => it.keys.add(x)));
        if (n.getAttribute('data-cv') === '1') it.cv = true; if (n.classList.contains('xrow')) { it.chip = true; it.text = ((n.querySelector('.pchip') || {}).textContent || '').trim(); }
        it.op = Math.min(it.op, op(n)); it.shown = it.shown || shown(n); }); };
    U.querySelectorAll('.ust .urow[data-row]').forEach((row) => { const tabs = [...row.querySelectorAll('.tabbar .tab')];
      if (tabs.length) { tabs.forEach((t) => { t.click(); grab(row); }); tabs[0].click(); } else grab(row); });
    Object.values(out).forEach((o) => Object.values(o.items).forEach((it) => { it.keys = [...it.keys]; }));
    return { rows: out, count: document.getElementById('ucvcount').textContent, carry: U.getAttribute('data-carry') }; });
  const u0 = await readU(), UR = R.uni.rows.map((u) => u.row), UI = (rn) => (R.uni.rows.find((u) => u.row === rn) || { items: [] }).items || [];
  const OPS = { ACCESSES: UI('ACCESSES').map((o) => o[0]), CONNECTIONS: UI('CONNECTIONS').flatMap((g) => g[3].concat(g[7]).map(() => ({ reads_from: 'r', writes_to: 'w' })[g[0]] || null)) };
  const want = (rn, it, row, i) => { if (rn === 'SIGNATURE' || rn === 'RISK') return false;
    const op = (OPS[rn] || [])[i]; if (op && it.keys.length === 1 && it.keys[0].startsWith('table:')) return GO.has(op + '|' + it.keys[0]);   /* F1: the access's own op */                 /* the def line, the flags: counted members none */
    if (rn === 'CODE BEHIND' && !it.keys.length && !it.chip) { const ch = Object.values(row.items).filter((x) => x.chip);   /* its count: every callee named and drawn */
      return ch.length === (R.uni.rows.find((u) => u.row === rn) || {}).count && ch.every((x) => want(rn, x, row)); }
    if (rn === 'CODE BEHIND' && it.chip && !it.keys.length) return MN.has(it.text);
    if (rn === 'JOURNEYS') return it.keys.length > 1 && it.keys.every((k) => MK.has(k)) && it.keys.some((k) => k.startsWith('case:'));
    return it.keys.length === 1 && MK.has(it.keys[0]); };
  const bad = [], per = [];
  let nIt = 0, nC = 0;
  UR.forEach((rn, ui) => { const row = u0.rows[rn]; if (!row) { bad.push([rn, 'not drawn']); return; }
    const idx = Object.keys(row.items), mark = (it) => row.st === 'c' || it.cv;
    idx.forEach((i) => { const it = row.items[i]; if (mark(it) !== want(rn, it, row, i)) bad.push([rn, i, it.keys.join(' ') || it.text, mark(it)]); });
    const c = idx.filter((i) => mark(row.items[i])).length; nIt += idx.length; nC += c; per.push([rn, c, idx.length]);
    if (idx.length !== R.ucv[ui][3] || c !== R.ucv[ui][2]) bad.push([rn, 'count', c + '/' + idx.length, R.ucv[ui].slice(2)]); });
  ok(!bad.length && nC > 0 && nC < nIt, 'D-058 · the universe · every item is marked carried exactly when BY MOMENT\'s grid draws its key (a Code behind function by its name, the endpoint by the heading); counts, lines, flags, the signature and Source\'s file stay bright: ' + per.map((x) => x[0] + ' ' + x[1] + '/' + x[2]).join(' · '), bad.slice(0, 5));
  const srcFile = (u0.rows.SOURCE || { items: {} }).items['0'];
  ok(srcFile && !srcFile.cv && srcFile.keys[0] === 'file:' + R.file && (u0.rows.RISK || { st: 'b' }).st === 'b' && u0.rows.USAGE.st === 'b',
    'D-058 · the universe · Source\'s file (' + R.file + ', the file\'s length, not the handler line), the risk flags and the usage count stay bright', { srcFile, risk: (u0.rows.RISK || {}).st });
  ok(u0.count === fillW(CW.pcount, { carried: nC, items: nIt, left: nIt - nC }) && JSON.stringify([nC, nIt]) === JSON.stringify(R.ucn),
    'D-058 · the universe\'s header count is the page\'s own marks: ' + u0.count, { count: u0.count, page: [nC, nIt], gen: R.ucn });
  /* (c) dim, hide, independent, remembered */
  await p.click('#ocol-uni .opt[data-carry="dim"]'); await p.waitForTimeout(150); await p.mouse.move(5, 5); await p.waitForTimeout(150);
  const u1 = await readU(), acc = u1.rows.ACCESSES, accBad = Object.entries(acc.items).filter(([i, it]) => (it.op < 0.5) !== GO.has(OPS.ACCESSES[i] + '|' + it.keys[0]));
  const dimBad = []; Object.entries(u1.rows).forEach(([rn, row]) => Object.entries(row.items).forEach(([i, it]) => { const m = row.st === 'c' || it.cv, o = row.st === 'c' ? row.rowOp : it.op;
    if (m ? !(o < 0.5 && it.shown) : o !== 1) dimBad.push([rn, i, o]); }));
  /* CHANGED 2026-09-27 (the scoped-import fix): the handler's own read of user_dietary_profile (`_sel(UserDietaryProfile)` after a
     `select as _sel` it imports in its body) is a step now, so BY MOMENT draws all seven tables and every Accesses row fades — accBad
     still proves each row against BY MOMENT's grid */
  ok(u1.carry === 'dim' && !dimBad.length && !accBad.length && Object.values(acc.items).some((it) => it.op < 0.5),
    'D-058 · dim: the universe\'s carried items fade and stay drawn — the Accesses rows of the tables BY MOMENT draws (' + Object.values(acc.items).filter((it) => it.op < 0.5).length + ' of ' + Object.keys(acc.items).length + ') among them — every other item stays whole', { dimBad: dimBad.slice(0, 4), accBad });
  await p.click('#ocol-uni .opt[data-carry="hide"]'); await p.waitForTimeout(150);
  const u2 = await readU(), hideBad = [], notes = [];
  UR.forEach((rn, ui) => { const row = u2.rows[rn], cv = R.ucv[ui]; if (!row) { if (cv[0] !== 'c') hideBad.push([rn, 'gone']); return; }
    if (cv[0] === 'c' && row.rowShown) hideBad.push([rn, 'row shown']);
    Object.entries(row.items).forEach(([i, it]) => { if (it.cv && it.shown) hideBad.push([rn, i, 'carried shown']); if (!it.cv && row.st !== 'c' && !it.shown && !(rn === 'TESTS')) hideBad.push([rn, i, 'bright hidden']); });
    if (cv[0] === 'p') { notes.push(row.note[0]); if (JSON.stringify(row.note) !== JSON.stringify([fillW(CW.more, { n: cv[2] })])) hideBad.push([rn, 'note', row.note]); } });
  const ind = await p.evaluate(() => [document.getElementById('ocol-gaps').getAttribute('data-carry'), document.getElementById('ocol-cm').getAttribute('data-carry'), localStorage.getItem('gabe:allep:carry:uni:v1')]);
  ok(u2.carry === 'hide' && !hideBad.length && notes.length === R.ucv.filter((x) => x[0] === 'p').length && ind[0] === CW.pick && ind[1] === CW.pick && ind[2] === 'hide',
    'D-058 · hide: the universe\'s carried items and whole rows leave, every bright item stays, each of the ' + notes.length + ' rows carried in part says how many are in BY MOMENT; THE GAPS and the code map keep their own look', { hideBad: hideBad.slice(0, 4), ind });
  /* F5 (review 2026-09-26): a separator goes with the item BY MOMENT draws beside it — hide leaves no line starting or ending on " · " */
  const f5 = await p.evaluate(() => { const U = document.getElementById('ocol-uni'), vis = (q) => { const e = U.querySelector(q); return e ? e.innerText.trim() : null; };
    return [vis('.ust .phead .ptype'), vis('.ust .urow[data-row="PAYLOAD"] .sublbl')]; });
  ok(f5[0] != null && !/^·/.test(f5[0]) && f5[1] != null && f5[1].length > 0 && !/·$/.test(f5[1]),
    'F5 · hide leaves no stray separator: the head reads "' + String(f5[0]).replace(/\n/g, ' ') + '", the payload "' + f5[1] + '"', f5);
  await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready'); await openEp(E);
  const re0 = [await sq('ocol-uni'), await sq('ocol-gaps'), await sq('ocol-cm')].map((x) => x.carry);
  ok(JSON.stringify(re0) === JSON.stringify(['hide', CW.pick, CW.pick]), 'D-058 · after a reload the universe stays on hide, THE GAPS and the code map on their own', re0);
  /* (d) THE GAPS, from the universe */
  await p.click('#ocol-gaps .opt[data-gdir="uni"]'); await p.waitForTimeout(80); await p.click('#ocol-gaps .opt[data-carry="dim"]'); await p.waitForTimeout(150); await p.mouse.move(5, 5); await p.waitForTimeout(150);
  const readG = () => p.evaluate(() => { const G = document.getElementById('ocol-gaps'); G.querySelectorAll('.gfmore').forEach((b) => b.click());
    const shown = (e) => !!e.getClientRects().length && getComputedStyle(e).display !== 'none';
    const op = (e) => { let o = 1; for (let n = e; n && n !== G; n = n.parentElement) o *= +getComputedStyle(n).opacity; return o; };
    const items = [...G.querySelectorAll('.gblk .gap, .gblk .gfact')].map((e) => ({ t: e.classList.contains('gfact') ? e.getAttribute('data-fact') : e.getAttribute('data-attr') || 'unmapped',
      row: (e.closest('.gblk') || {}).getAttribute('data-row'), fact: e.classList.contains('gfact'),
      m: e.getAttribute('data-cv') === '1' || e.closest('.gblk').getAttribute('data-cv') === '1', gcs: e.getAttribute('data-gcs'), op: op(e), shown: shown(e) }));
    return { items, count: document.getElementById('gcvcount').textContent, carry: G.getAttribute('data-carry'), dir: G.getAttribute('data-dir') }; });
  const g1 = await readG(), fct = (t) => g1.items.find((x) => x.fact && x.t === t) || {};
  /* CHANGED 2026-09-27 (the scoped-import fix): UserDietaryProfile moved from "stays whole" to "fades" — BY MOMENT draws its table now */
  const byName = ['derive_restrictions', 'ResolutionSnapshot.violations_for'], cases = ['C237', 'C267'], stay = [R.uni.rows.find((u) => u.row === 'SOURCE').kvs[0][2], 'conflict · large surface'], nowDrawn = ['UserDietaryProfile'];
  /* what a name IS comes from the row's own record (its key, parallel to its name — the DOM draws the glyph, not the key) */
  const FK = new Map(R.rgaps.flatMap((g) => g[3].map((n, i) => [g[0] + '|' + n, (g[4] || [])[i] || null])));
  /* F2 (review 2026-09-26): a name stands for the card's items of its row named the same (a journey with its entities, a table's
     read and its write) — carried exactly when each of them is, read off the grid as above */
  const gWant = (x) => { const k = FK.get(x.row + '|' + x.t), row = u0.rows[x.row];
    const its = row ? Object.entries(row.items).filter(([, it]) => (k ? it.keys.includes(k) : x.row === 'CODE BEHIND' && it.chip && !it.keys.length && it.text === x.t)) : [];
    return its.length ? its.every(([i, it]) => want(x.row, it, row, i)) : k ? MK.has(k) : x.row === 'CODE BEHIND' && MN.has(x.t); };
  const fBad = g1.items.filter((x) => x.fact).filter((x) => { const w = gWant(x); return x.m !== w || (x.m ? !(x.op < 0.5) : x.op !== 1); });
  const gC = g1.items.filter((x) => x.m).length;
  ok(g1.dir === 'uni' && g1.carry === 'dim' && byName.every((n) => fct(n).m && fct(n).op < 0.5 && MN.has(n)) && cases.every((c) => fct(c).m === MK.has('case:' + c) && (fct(c).op < 0.5) === MK.has('case:' + c))
     && stay.every((n) => fct(n).t && !fct(n).m && fct(n).op === 1) && nowDrawn.every((n) => fct(n).t && fct(n).m && fct(n).op < 0.5) && !fBad.length,
    'D-058 · THE GAPS from the universe, dim: ' + byName.join(' and ') + ' fade (BY MOMENT names them), ' + nowDrawn.join(', ') + ' fades (BY MOMENT draws its table), ' + cases.map((c) => c + (MK.has('case:' + c) ? ' fades' : ' stays')).join(', ') + '; ' + stay.join(', ') + ' stay whole — every name marked exactly as BY MOMENT\'s grid draws it',
    { fBad: fBad.slice(0, 4), stay: stay.map((n) => [n, fct(n).m, fct(n).op]) });
  ok(g1.count === fillW(CW.pcount, { carried: gC, items: g1.items.length, left: g1.items.length - gC }) && JSON.stringify([gC, g1.items.length]) === JSON.stringify(R.gcn.uni),
    'D-058 · THE GAPS\' header count (from the universe) is the page\'s own marks: ' + g1.count, { count: g1.count, page: [gC, g1.items.length], gen: R.gcn.uni });
  await p.click('#ocol-gaps .opt[data-carry="hide"]'); await p.waitForTimeout(150);
  const g2 = await readG(), g2Bad = g2.items.filter((x) => x.m === x.shown);
  const uStill = await p.evaluate(() => document.getElementById('ocol-uni').getAttribute('data-carry'));
  ok(g2.carry === 'hide' && !g2Bad.length && uStill === 'hide', 'D-058 · hide: THE GAPS\' carried names leave (a block whose every gap is carried with its head), every bright one stays; the universe keeps its own look', { bad: g2Bad.slice(0, 4), uStill });
  /* THE GAPS from the code map: an attribute is carried exactly when every code-map pair naming it that holds something here is
     carried whole (the code map's own data-cvs: c, or x with items) */
  await p.click('#ocol-gaps .opt[data-gdir="cm"]'); await p.waitForTimeout(150);
  const g3 = await readG(), pairs = await p.evaluate(() => [...document.querySelectorAll('#ocol-cm .pair[data-k], #ocol-cm [data-sub][data-k]')].map((q) => [q.getAttribute('data-k'), (q.getAttribute('data-attr') || '').split(' '), q.getAttribute('data-cvs')]));
  const aBad = g3.items.filter((x) => { const hold = pairs.filter(([k, as, st]) => as.includes(x.t) && st && st !== 'e'), cv = (k) => R.cv[k];
    const whole = hold.length > 0 && hold.every(([k, , st]) => st === 'c' || (st === 'x' && cv(k)[3])); return x.m !== whole || x.m === x.shown; });
  const aC = g3.items.filter((x) => x.m).length;
  ok(g3.dir === 'cm' && !aBad.length && aC > 0 && g3.count === fillW(CW.pcount, { carried: aC, items: g3.items.length, left: g3.items.length - aC }) && JSON.stringify([aC, g3.items.length]) === JSON.stringify(R.gcn.cm),
    'D-058 · THE GAPS from the code map, hide: an attribute leaves exactly when every code-map pair holding it is carried whole — ' + g3.count, { bad: aBad.slice(0, 4).map((x) => x.t), count: g3.count, gen: R.gcn.cm });
  /* F3 (review 2026-09-26): an attribute carried in part never reads "n of its n" — a field that sums the endpoint up (the fates'
     tally, the proof rank) is one element BY MOMENT leaves out */
  const rxP = new RegExp(CW.panels.gaps.tipPart.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{(n|of)\}/g, '(\\d+)')), pAt = g3.items.filter((x) => x.gcs === 'p'), f3 = [];
  for (const x of pAt) { const h = await p.$('#ocol-gaps .gap[data-attr="' + x.t + '"]'); await h.scrollIntoViewIfNeeded(); const bx = await h.boundingBox();
    await p.mouse.move(bx.x + 4, bx.y + bx.height / 2); await p.waitForTimeout(90); const m = rxP.exec(await p.$eval('#tip', (e) => e.textContent)); f3.push([x.t, m && +m[1], m && +m[2]]); await p.mouse.move(5, 5); }
  ok(pAt.length > 0 && f3.every(([, n, of]) => n != null && n < of),
    'F3 · THE GAPS from the code map: every attribute carried in part says fewer than all its elements — ' + f3.map((x) => x[0] + ' ' + x[1] + '/' + x[2]).join(' · '), f3);
  /* (e) the copy texts */
  await p.evaluate(() => { window.__copied = null; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (s1) => { window.__copied = s1; return Promise.resolve(); } } }); });
  await p.$eval('#cmcopy', (e) => e.scrollIntoView({ block: 'center' })); await p.click('#cmcopy'); await p.waitForTimeout(80);
  const optL = (v) => CW.label + ': ' + CW.opts[v].name + ' (' + (v === CW.pick ? D.words.copy.pick : D.words.copy.his) + ')';
  const lines = [CL.uni + ' · ' + optL('hide'), CL.gaps + ' · ' + optL('hide')], cp = await p.evaluate(() => [window.__copied, document.getElementById('out').value]);
  ok(cp[0] && lines.every((l) => cp[0].includes(l) && cp[1].includes(l)), 'D-058 · the code map\'s copy and the page\'s copy text both carry "' + lines.join('" and "') + '"', cp[0]);
  await p.click('#ocol-uni .opt[data-carry="all"]'); await p.waitForTimeout(100); await p.click('#ocol-gaps .opt[data-carry="all"]'); await p.waitForTimeout(100);
  ok((await sq('ocol-uni')).carry === 'all' && (await sq('ocol-gaps')).carry === 'all', 'D-058 · show all brings both panels back whole');
  await p.evaluate(() => window.scrollTo(0, 0)); }
ok(!errs.length, 'no page error after the D-058 checks', errs);

/* 7 · an arm the feed lacks reads "absent", never 0 — on a fixture built from a scratch copy of the feed */
{ const copy = JSON.parse(JSON.stringify(FJ));
  copy.arms.frontend.present = false; copy.arms.frontend.reason = 'switched off for the probe';
  copy.arms.kinds.parts.inflight.present = false; copy.arms.kinds.parts.inflight.reason = 'switched off for the probe';
  const fx = path.join(SCRATCH, 'forms-arms-off.json'), page = path.join(SCRATCH, 'fixture-arms-off.html');
  fs.writeFileSync(fx, JSON.stringify(copy));
  execFileSync('python3', [GEN, '--forms', fx, '--archmap', ARCHMAP, '--only', 'POST /setup/complete', '--only', 'GET /recipes', '--out', page], { cwd: HERE, stdio: 'pipe' });
  await open(page);
  const a = await p.evaluate(() => ['reasons', 'inf_answer', 'inf_server'].map((c) => [...document.querySelectorAll('#board tr.row [data-col="' + c + '"]')].map((e) => [e.getAttribute('data-v'), e.textContent])));
  ok(a.every((col) => col.length === 2 && col.every(([v, t]) => v === 'absent' && t === 'absent')), 'a cell whose arm is off reads absent, never 0', a);
  const segs = await p.evaluate(() => [...document.querySelectorAll('#board thead th[data-col="reasons"] .sg')].map((s) => [s.getAttribute('data-bin'), s.getAttribute('data-n')]));
  ok(segs.length === 1 && segs[0][0] === 'absent' && segs[0][1] === '2', 'the strip of an absent column counts it as absent', segs);
  const other = await p.evaluate(() => document.querySelector('#board tr.row [data-col="tables"]').getAttribute('data-v'));
  ok(other !== 'absent', 'a column whose arm is on still carries its value on the fixture', other);
  ok(await p.isVisible('#partial'), 'a fixture page says it draws part of the feed');
  ok(labSha() === LAB0, 'the lab\'s own facts file is untouched by the fixture build'); }
ok(!errs.length, 'no page error on the fixture', errs);

await b.close();
console.log((fail ? 'FAIL ✗' : 'PASS ✓') + ` probe-all-endpoints · ${pass} passed · ${fail} failed · ${FEED.length} endpoints · sample ${SAMPLE.length} · page ${path.basename(PAGE)}`);
process.exit(fail ? 1 : 0);
