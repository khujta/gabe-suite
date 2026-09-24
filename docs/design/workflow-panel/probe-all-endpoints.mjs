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
  const side = await p.evaluate(() => ({ h: document.querySelector('#onehead h3').textContent, n: document.querySelector('#onehead h3').textContent, search: window.location.search,
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
  const CL = W8.copy.lines, isSlook = (l) => l.startsWith(CL.slook + ': '), isEp = (l) => l.startsWith(CL.open + ': ');
  const asPaste = (out) => { const blk = out.slice(0, out.indexOf('')), his = blk.filter((l) => !isSlook(l) && !isEp(l));
    return { blk, his, same: his.length === paste.length && his[0] === 'page: all-endpoints · ' + D.tok.app + ' @ ' + D.tok.head && JSON.stringify(his.slice(1)) === JSON.stringify(paste.slice(1)) }; };
  await open(PAGE);
  const c0 = await cold(), a0 = asPaste(c0.out);
  ok(a0.same, 'a cold start\'s copy text is his paste line for line, with the Shared treatment\'s and the endpoint\'s lines set aside', { page: a0.his, his: paste });
  const sl = a0.blk.filter(isSlook), colsAt = a0.blk.findIndex((l) => l.startsWith(CL.cols + ': ')), el0 = a0.blk.filter(isEp);
  ok(sl.length === 1 && a0.blk.indexOf(sl[0]) === colsAt + 1, 'the copy text puts the Shared treatment\'s line right under the columns line', a0.blk);
  ok(el0.length === 1 && a0.blk.length === paste.length + 2 && a0.blk[a0.blk.length - 1] === el0[0], 'the copy text adds one more line, the endpoint shown, last', a0.blk);
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
  ok(JSON.stringify(secs) === JSON.stringify(['sec-board', 'sec-one', 'sec-copy', 'sec-more']), 'the page is the endpoints, then one endpoint, then the copy text, then more information', secs);
  ok(await p.evaluate(() => { const m = document.getElementById('sec-more'), all = [...document.querySelectorAll('.artifact-page *')];
    return all.filter((x) => x.offsetParent !== null && !m.contains(x) && (m.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING)).length === 0; }), 'nothing on the page is drawn after more information');
  /* a cold start shows the first row drawn */
  const c9 = await p.evaluate(() => ({ first: document.querySelector('#board tr.row[data-ep]').getAttribute('data-ep'), open: window.__allep.state.open, n: document.querySelector('#onehead h3').textContent,
    sel: [...document.querySelectorAll('#board tr.row[data-sel="true"]')].map((e) => e.getAttribute('data-ep')) }));
  ok(c9.open === c9.first && c9.n === c9.first && c9.sel.length === 1 && c9.sel[0] === c9.first, 'a cold start shows the table\'s first row in the endpoint section, and marks that row', c9);
  /* ?ep= on load picks that row; a slug the page does not hold says so and shows the first row */
  const ADDR = 'GET /recipe-creation/gustify/stream';
  await p.goto('file://' + PAGE + '?ep=' + slug9(ADDR)); await p.waitForFunction('window.__allep && window.__allep.ready');
  const a9 = await p.evaluate(() => ({ open: window.__allep.state.open, n: document.querySelector('#onehead h3').textContent, sel: [...document.querySelectorAll('#board tr.row[data-sel="true"]')].map((e) => e.getAttribute('data-ep')),
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
      proof: (d.proof.produced || 0) > 0, inflight: len(d.inflight), hook: !!d.hook, screens: d.screens > 0, reasons: len(d.reasons), alarms: d.alarms.length, pieces: len(d.pieces), lacks: d.lacks.length };
    if (JSON.stringify(Object.keys(H).sort()) !== JSON.stringify(Object.keys(DET).sort())) throw new Error('the recomputation does not read every code-map pair the words name');
    for (const k of Object.keys(H)) if (H[k]) add(DET[k].attrs);
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
    const dom = await p.evaluate(() => ({ n: document.querySelector('#onehead h3').textContent, search: window.location.search,
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
      pairs: [...document.querySelectorAll('#ocol-cm .pair[data-attr]')].map((x) => ({ k: x.getAttribute('data-k'), attrs: x.getAttribute('data-attr').split(' ') })),
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
  // (2) a callee of Code behind that touches no data: its attribute is rated at the bottom of the inventory — low priority
  const lowR = invRate('functions behind · walk levels'), fns2 = new Set([...(ROW[EP].u.datafns || []), ...(ROW[EP].u.deciders || [])].map((q) => q.split('::').pop()));
  const cb = ROW[EP].uni.rows.find((u) => u.row === 'CODE BEHIND'), i2 = cb.items.findIndex((nm, i) => cb.keys[i] && !fns2.has(nm)), K2 = i2 >= 0 ? cb.keys[i2] : null;
  let e2 = null; if (K2) { await p.evaluate(() => window.scrollTo(0, 0)); if (await lightVisible(K2)) e2 = await whyOf(); }
  ok(!!K2 && lowR === Math.min(...Object.values(D.attrs).map((a) => a.r)) && e2 && e2.here === 'false' && e2.why.some(([w, , at]) => w === 'low' && at === D.attrs['functions-behind-walk-levels'].label),
    'a Code behind callee that touches no data (' + (K2 || '').split('::').pop() + '): the inventory rates functions behind ' + lowR + ', and the code map says "low priority"', { K2, lowR, why: e2 && e2.why });
  // (3) a case that only ARRANGES through this endpoint: nothing in the code map holds it — "not carried", and its link turns THE GAPS
  const arr = new Set(((FJ.endpoints[EPK] || {}).tests || {}).arranged_by || []), inExits = new Set(ROW[EP].d.exits.items.length ? ROW[EP].dk.exits.flatMap((x) => x[1]) : []);
  const K3 = cardCases.find((cid) => arr.has(cid) && !callsOn(cid, 'act') && !inExits.has('case:' + cid)); let e3 = null, g3 = null;
  if (K3) { await p.evaluate(() => window.scrollTo(0, 0)); if (await lightVisible('case:' + K3)) { e3 = await whyOf();
    await p.$eval('#el-cm .elref[data-ref="gap"]', (x) => x.scrollIntoView({ block: 'center' })).catch(() => {}); await p.click('#el-cm .elref[data-ref="gap"]').catch(() => {}); await p.waitForTimeout(80);
    g3 = Object.assign({ dir: await p.$eval('#ocol-gaps', (x) => x.getAttribute('data-dir')) }, await whyOf()); } }
  ok(!!K3 && e3 && e3.here === 'false' && e3.why.length === 1 && e3.why[0][0] === 'gap' && g3 && g3.dir === 'uni' && g3.elref.some(([k, how]) => k === K3 && how === 'pin'),
    'a case that only arranges through ' + EP + ' (' + K3 + '): the code map says "not carried", and its link turns THE GAPS to the universe side, where the case is lit', { K3, why: e3 && e3.why, after: g3 && [g3.dir, g3.elref] });
  await p.click('#elclear').catch(() => {}); await p.click('#ocol-gaps .opt[data-gdir="cm"]').catch(() => {}); await p.waitForTimeout(60); }
ok(!errs.length, 'no page error after the D-041 checks', errs);

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
