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
/* CHANGED 2026-09-30 (round-1 review, lane F1a): a service-side test proves an ending here only when the function it calls runs on this
   endpoint's way — the handler, a function the forms feed reaches from it, one the station's edges reach (calls · binds · depends) */
const SAVE = new Set(['commit', 'flush', 'rollback', 'savepoint', 'begin_nested']);
const LVP = JSON.parse(fs.readFileSync(path.join(REPO, 'templates/center/shell/example/codebase-graph-station/levels.json'), 'utf8'));
const ADJP = {}; (LVP.fn_edges || []).forEach((e) => { if (['calls', 'binds', 'depends'].includes(e.rel) && e.s && e.t) (ADJP[e.s.replace('#', '::')] = ADJP[e.s.replace('#', '::')] || []).push(e.t.replace('#', '::')); });
const nmOf = (q) => String(q || '').split('::').pop();
function onWay(key) { const ep = FJ.endpoints[key], H = ep.handler || '', seen = new Set(), st = [H];
  while (st.length) (ADJP[st.pop()] || []).forEach((y) => { if (!seen.has(y)) { seen.add(y); st.push(y); } });
  const names = new Set([nmOf(H), ...[...seen].map(nmOf)]);
  Object.entries(FJ.functions || {}).forEach(([f, r]) => { if ((r.reached_by || []).some((rb) => rb.root === key)) names.add(nmOf(f)); });
  return names; }
const svcHere = (key, t, names) => { const tails = new Set([...names].filter((n) => n.includes('.')).map((n) => n.split('.').pop()));
  return (((FJ.test_cases || {})[t.case] || {}).raises || []).filter((z) => z.line === t.line).some((z) => [z.call, z.root].some((q) => { q = String(q || '');
    return names.has(q) || (q.includes('.') && tails.has(q.split('.').pop())); })); };
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
  /* CHANGED 2026-09-30 (review N3-06): a write needs a table — a step with none is no database write */
  const own = (e.steps || []).filter((s) => !s.dependency && WR.has((STEPS[s.step] || {}).op) && (STEPS[s.step] || {}).table).map((s) => bk(s.step));
  const after = (e.after_response || []).filter((s) => !s.dependency && WR.has((STEPS[s.step] || {}).op) && (STEPS[s.step] || {}).table);
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
  /* CHANGED 2026-09-30 (review N3-16): the tests column counts TESTS (the cases that act on it), not their calls */
  e.acts = Object.values(FJ.test_cases || {}).filter((t) => (t.calls || []).some((q) => q.endpoint === key && q.role === 'act')).length;
  /* CHANGED 2026-09-30 (review N3-03): beyond = a proof (a sure join) whose call asserts the body's attributes, the detail or the code */
  const callOf = (t) => (((FJ.test_cases || {})[t.case] || {}).calls || []).find((q) => q.line === t.line && q.endpoint === key) || {};
  const names = onWay(key), keep = (t) => t.conf !== 'service raises' || svcHere(key, t, names);
  e.asserted = X.reduce((n, { x }) => n + (x.tests || []).filter((t) => keep(t) && sureConf(t) && (((a) => (a.attrs || []).length || (a.detail || []).length || (a.code || []).length)(callOf(t).asserts || {}))).length, 0);
  const sure = X.filter(({ x }) => (x.tests || []).some((t) => keep(t) && sureConf(t))).length;
  e.proof = X.length ? Math.round(10000 * sure / X.length) / 10000 : 0; e.proofText = sure + '/' + X.length;
  e.branches = (ep.branches || []).length; e.catches = ((ep.failure || {}).catches || []).length; e.switches = (ep.switches || []).length;
  const fate = Object.fromEntries(FATES.map((f) => [f, 0])), fns = new Set(), own = new Set(), dep = new Set();
  (ep.paths || []).forEach((p) => { fate[feedFate(p)]++;
    ((p.effects || {}).steps || []).forEach((s) => { const r = STEPS[s.step] || {}; if (!s.dependency && r.fn && (r.table || SAVE.has(r.op))) fns.add(r.fn);
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
/* CHANGED 2026-09-30 (round-1 review CR-31): with the map on (the default) a Data effects cell folds to its count; the sections that read
   the Data effects chips open on the chips look — open(file, 'default') opens on the page's own defaults */
/* CHANGED 2026-10-02 (D-081, his ruling of the looks): the page opens on the looks he ruled — a click on a head puts every item on one line, fit wraps
   into bands, Data effects is a small map per moment, and a table wider than its box opens fitted (R-11). The sections that prove the TABLE'S
   STRUCTURE (its moments, stages, cells, widths) were written against the looks before the ruling, so open(file) still opens on those: chips for
   Data effects, names whole, fit narrowing the rest, fit off. open(file, 'default') opens on the page's own defaults; section 33 proves the ruled ones. */
const open = async (file, look) => { await p.goto('file://' + file); await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 20000 });
  await p.evaluate((dflt) => { try { for (const k of Object.keys(localStorage)) if (/^gabe:allep/.test(k)) localStorage.removeItem(k);
    if (!dflt) { localStorage.setItem('gabe:allep:moments:v3', JSON.stringify({ dfx: 'chips', wid: 'names', fit: 'min' })); localStorage.setItem('gabe:allep:moments:cols:v2', JSON.stringify({ fit: false })); } } catch (e) {} }, look === 'default');
  await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 20000 }); };
const pick = async (rail, v) => { await p.click(`.opt[data-rail="${rail}"][data-v="${v}"]`); await p.waitForTimeout(40); };
const drawn = () => p.evaluate(() => [...document.querySelectorAll('#board tr.row[data-ep], #board .card[data-ep]')].map((e) => e.getAttribute('data-ep')));
const heads = () => p.evaluate(() => [...document.querySelectorAll('#board [data-group]')].map((e) => ({ g: e.getAttribute('data-group'), t: e.textContent })));

await open(PAGE);
const tipTxt = () => p.$eval('#tip', (e) => { const c = e.cloneNode(true); c.querySelectorAll('.cdmore').forEach((r) => r.remove()); c.querySelectorAll('.cdw[data-line]').forEach((r) => r.replaceWith(document.createTextNode(r.getAttribute('data-line')))); return c.textContent; });   /* D-088: a card's rows carry their sentence in data-line; the asserts that read a hover read the facts, not the drawing */
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
  // CHANGED 2026-09-30 (D-071): a part of an examples block is sized by its look — his DATA line (D-027) sizes the channel chip and the count
  // at 11px, his choice below the floor as in the lab — so those parts are set aside here; the bench's controls and lists keep the floor
  // CHANGED 2026-09-30 (review S4-24): only the TABLE's parts are set aside — his DATA line is the one ruled look below the floor; every
  // other block's text parts now stand at the floor (my picks and the lab's looks alike)
  const small = await p.evaluate(() => { const bad = []; document.querySelectorAll('body *').forEach((e) => { if (!e.offsetParent && e.tagName !== 'BODY') return; if (e.closest('#sec-ex .excol[data-k="table"] .blk .bkhd [data-part]')) return;
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
  // CHANGED 2026-09-28 (D-065): BY MOMENT's journeys look adds one more — nine lines now
  const CL = W8.copy.lines, isSlook = (l) => l.startsWith(CL.slook + ': '), isEp = (l) => l.startsWith(CL.open + ': ');
  // CHANGED 2026-09-30 (D-071): the examples bench adds one line per kind ("examples · <kind> · …") after BY MOMENT's — set aside too
  const isSet = (l) => l.startsWith(CL.cm + ' · ') || l.startsWith(CL.mo + ' · ') || l.startsWith(CL.uni + ' · ') || l.startsWith(CL.gaps + ' · ') || l.startsWith(W8.ex.copy.where + ' · ');
  const asPaste = (out) => { const blk = out.slice(0, out.indexOf('')), his = blk.filter((l) => !isSlook(l) && !isEp(l) && !isSet(l));
    return { blk, his, same: his.length === paste.length && his[0] === 'page: all-endpoints · ' + D.tok.app + ' @ ' + D.tok.head && JSON.stringify(his.slice(1)) === JSON.stringify(paste.slice(1)) }; };
  await open(PAGE, 'default');   /* D-081: a cold start on the page's own defaults — fit on is how it opens, so the copy text names no columns */
  const c0 = await cold(), a0 = asPaste(c0.out);
  ok(a0.same, 'a cold start\'s copy text is his paste line for line, with the Shared treatment\'s and the endpoint\'s lines set aside', { page: a0.his, his: paste });
  const sl = a0.blk.filter(isSlook), colsAt = a0.blk.findIndex((l) => l.startsWith(CL.cols + ': ')), el0 = a0.blk.filter(isEp);
  ok(sl.length === 1 && a0.blk.indexOf(sl[0]) === colsAt + 1, 'the copy text puts the Shared treatment\'s line right under the columns line', a0.blk);
  const set0 = a0.blk.filter(isSet);
  // CHANGED 2026-09-28 (D-065): BY MOMENT's journeys look adds its line after BY MOMENT's two looks — nine lines now
  // CHANGED 2026-09-30 (D-067): BY MOMENT's legend place and its hovers' form add theirs after the journeys' — eleven lines now
  // CHANGED 2026-09-30 (D-068): its header, saving's stage, the metadata's place, a head's click and fit add theirs after those — sixteen
  // CHANGED 2026-09-30 (D-069): the rows' own looks (the gates, the effect, gate icons, gate roles, function marks, standard or specialist) — twenty-two
  // CHANGED 2026-09-30 (D-070): Data effects' look and the in-flight values' look add theirs after the rows' own — twenty-four
  // CHANGED 2026-09-30 (D-071, merged): the examples bench's lines come after BY MOMENT's — twenty-four plus one per kind of example
  // CHANGED 2026-09-30 (round-1 review S4-29): Data effects' write colour adds its line — twenty-five
  // CHANGED 2026-09-30 (round-1 review CR-20 · CR-07, lane F1b): where a test's earlier requests stand and what the heads do when scrolled — twenty-seven
  // CHANGED 2026-09-30 (review S4-06, lane F2; merged): the bench's two layout options (the columns · a click elsewhere) add their lines before the kinds'
  // CHANGED 2026-10-02 (D-084): the Security row's option adds its line — twenty-eight
  // CHANGED 2026-10-02 (D-085): the Security row's second option (a middleware with its switch) adds its line — twenty-nine
  ok(el0.length === 1 && set0.length === 29 + 2 + D.ex.kinds.length && a0.blk.length === paste.length + 2 + set0.length && JSON.stringify(a0.blk.slice(-(1 + set0.length))) === JSON.stringify([el0[0]].concat(set0))
     && set0.slice(29).every((l) => l.startsWith(W8.ex.copy.where + ' · '))
     && set0[29].startsWith(W8.ex.copy.where + ' · ' + W8.ex.opt.lay.label + ': ') && set0[30].startsWith(W8.ex.copy.where + ' · ' + W8.ex.opt.follow.label + ': '),
    'the copy text adds the endpoint shown, then the code map\'s, BY MOMENT\'s and the examples\' settings, last', a0.blk);
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
  /* CHANGED 2026-09-30 (D-071, his L-23): the examples bench stands between ONE ENDPOINT and BY MOMENT */
  ok(JSON.stringify(secs) === JSON.stringify(['sec-board', 'sec-one', 'sec-ex', 'sec-mo', 'sec-copy', 'sec-more']), 'the page is the endpoints, then one endpoint, then the examples, then by moment, then the copy text, then more information', secs);
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
  /* CHANGED 2026-09-30 (D-069, his L-17/L-18): In-flight state and Standard or specialist wear a mark of their own — my pick, dashed (the
     hourglass, the puzzle; In-flight in its row's hue), the page's own glyph in place of the lab's no-page mark */
  const innerOf = (t) => String(t || '').slice(String(t || '').indexOf('>') + 1, String(t || '').lastIndexOf('</svg>'));
  Object.entries(MK.own || {}).forEach(([f, ic]) => { const bk = D.mo.fam[f]; want9[bk] = { inner: innerOf(D.icons[ic]), col: f === 'inf' ? 'var(--if)' : want9[bk].col, pick: true }; });
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
      ...Object.keys(D.enc.ifk), ...Object.values(W.terms.life).map((x) => x.name), ...Object.keys(F.switch.vals), ...D.families, ...Object.keys(D.enc.rule), ...Object.keys(D.enc.role), ...Object.keys(D.enc.hrole),
      ...Object.keys(F.branch.vals), ...Object.keys(F.does.vals), ...Object.values(D.enc.op).map((o) => o.chip), 'rw', 'r', 'w', ...Object.values(D.enc.dir).map((o) => o.chip), 'GET', 'POST', 'PUT', 'PATCH', 'DELETE']
      .filter((w) => w && w[0] !== '_').sort((x, y) => y.length - x.length);
    const rx = new RegExp('(?<![\\w-])(' + words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\w-])'), st = /(?<![\w:./–-])[1-5]\d\d(?![\w/])/;
    const plain = [], tw = document.createTreeWalker(cm, NodeFilter.SHOW_TEXT); let t;
    while ((t = tw.nextNode())) { const x = t.textContent.trim(); if (!x || x === W.panel.none || t.parentElement.closest('.vc, .pk, .cbh, th, td.says, .pw, .ab, .ainfo, .elsay, h3')) continue;
      const m = rx.exec(x) || st.exec(x); if (m) plain.push([(t.parentElement.closest('.pair') || {}).getAttribute && t.parentElement.closest('.pair').getAttribute('data-k'), m[0], x.slice(0, 50)]); }
    return { n: chips.length, bare, plain, missing: Object.keys(F).filter((f) => !F[f].station && !F[f].mo && !fams.has(f)) }; });   /* a station family (D-052) is drawn only where an element wears it · CHANGED 2026-09-30 (D-069): a gate's kind, role and effect are BY MOMENT's alone (`mo`) */
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
  const actTests = Object.keys(TC).filter((cid) => callsOn(cid, 'act') > 0).length;   /* CHANGED 2026-09-30 (review N3-16): the column counts tests */
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
  ok(!!K1 && R1 === actTests && ROW[EP].actc === actCalls && e1 && e1.here === 'false' && !e1.named.includes('case:' + K1) && e1.why.some(([w, refs]) => w === 'cnt' && refs.includes('c:acts'))
    && h1 && h1.elref.length === 1 && h1.elref[0][0] === 'c:acts' && h1.elref[0][1] === 'hover',
    'a case that acts on ' + EP + ' (the feed\'s ' + actTests + ' acting tests, making ' + actCalls + ' calls, are the tests column\'s count): the code map says "counted, not named" with a link to the tests field, and pointing at the link lights exactly that field',
    { K1, drawn: R1, feed: actTests, calls: actCalls, why: e1 && e1.why, lit: h1 && h1.elref });
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
    const reach = (site) => Object.values(FJ.functions || {}).filter((f) => (f.reached_by || []).some((b) => b.root === E && (b.routes || [b]).some((r) => r.root_site === site))).flatMap((f) => f.raises || []);   /* D-060: every route's handler call */
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
  // CHANGED 2026-09-28 (review J8 of D-065): BY MOMENT's looks belong to the page's copy text, none of them to the code map's own copy
  const wantCopy = [CL.page + ': all-endpoints · ' + D.tok.app + ' @ ' + D.tok.head, CL.open + ': ' + E14, CL.cm + ' · ' + optL(EW.opt.mom, 'rows'), CL.cm + ' · ' + optL(EW.opt.chk, 'col'),
    CL.cm + ' · ' + optL(D.words.carry, 'all'), CL.uni + ' · ' + optL(D.words.carry, 'all'), CL.gaps + ' · ' + optL(D.words.carry, 'all'), '', CL.your, ''].join('\n');
  const got14 = await p.evaluate(() => window.__copied);
  ok(got14 === wantCopy && !got14.split('\n').some((l) => l.startsWith(CL.mo + ' · ')), 'the code map\'s copy button copies the page, the endpoint, the code map\'s three options and the Gabe Universe\'s and THE GAPS\' switches, each with whose pick it is, then room for your words — none of BY MOMENT\'s looks', got14);
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
  /* CHANGED review CR-20: a test's earlier requests stand at "earlier in the test", drawn only where a journey has them */
  const prior14 = ROW[E14].mo.el.some((e) => ROW[E14].mo.sp[e[1]][0] === 'prior');
  const want14 = [['start']].concat(prior14 ? [['prior']] : [], [['send'], ['edge'], ['body'], ['gate'], ['fields'], ['checks', span(chk)], ['work', span(work)], ['fail', span(failL)], ['save', span(save)], ['answer'], ['after'], ['uncaught']]);
  const readM = () => p.evaluate(() => { const t = document.querySelector('#mogrid table.motab'); return { lay: t.getAttribute('data-lay'), cell: t.getAttribute('data-cell'),
    // CHANGED 2026-09-26 (D-055): moments as columns is his default — the moments, the blocks and the Endings cells are read in DOM
    // order, which is time order in both looks; a head's lines are its hover's now (data-lines)
    rows: [...t.querySelectorAll('th.mom')].map((h) => [h.getAttribute('data-mom'), h.getAttribute('data-lines')]),
    /* CHANGED 2026-09-26 (D-057): the Endings head holds an info line behind the toggle — a head's name is its text less that line */
    /* CHANGED 2026-09-30 (D-068): a row's head holds its name, its options slot and its columns of the pinned row — its name is .mbn */
    /* CHANGED 2026-09-30 (D-070): Data effects' map opens full width under its row (my pick) — a row of the table, not a block's */
    heads: [...t.querySelectorAll('th[data-block]')].map((h) => (h.querySelector('.mbn') || h).textContent.trim()), bodyRows: t.querySelectorAll('tbody tr:not(.mdxr)').length,
    ends: [...t.querySelectorAll('td[data-f="end"]')].map((td) => [...td.querySelectorAll('.vc-status')].map((c) => c.textContent)),
    chips: t.querySelectorAll('.mc').length, counts: t.querySelectorAll('.mcount').length,
    /* CHANGED 2026-09-30 (D-068): the no-moment column left the table — the endpoint metadata's title and its cards; the table's last row */
    nmh: (document.querySelector('#mometa > h3') || {}).textContent || null, nmc: document.querySelectorAll('#mometa .mcard').length, lastRow: (t.querySelector('tbody tr:last-child') || { getAttribute: () => null }).getAttribute('data-mom'),
    stg: [...t.querySelectorAll('thead th.mosb')].map((c) => [c.getAttribute('data-stage'), c.colSpan, (c.querySelector('.mosp') || {}).textContent || null]),
    band: [...document.querySelectorAll('#moband .mbb')].map((b) => [b.getAttribute('data-f'), b.textContent.slice(0, 80)]),
    squares: [...document.querySelectorAll('#mobar .opt[data-mopt]')].map((o) => [o.getAttribute('data-mopt'), o.getAttribute('data-v'), o.getAttribute('aria-checked'), getComputedStyle(o).borderTopStyle, o.getAttribute('data-ruled')]) }; });
  await p.$eval('#sec-mo', (e) => e.scrollIntoView({ block: 'start' })); await p.waitForTimeout(60);
  const m0 = await readM(), rowsW = m0.rows.map((r) => r[1] ? r : [r[0]]);
  ok(JSON.stringify(rowsW) === JSON.stringify(want14.map((w) => (w[1] ? w : [w[0]]))), 'BY MOMENT · ' + E14 + ' · the moments read top to bottom as the feed has them: before any request, the screen, the edge, the body, the login, the fields, then the handler\'s checks (' + span(chk) + '), the work (' + span(work) + '), the catch (' + span(failL) + '), saving (' + span(save) + '), the answer, after it, escapes', { page: m0.rows, want: want14 });
  /* (c) the columns, the band, the Endings column against the code map's own endings table */
  const byB = {}; Object.entries(D.mo.fam).forEach(([f, b0]) => { byB[b0] = f; }); const ov = D.blocks.find((b0) => byB[b0.key] === 'over');
  /* CHANGED 2026-09-30 (D-068, his L-07): the Overview is no row — nothing of it acts at a moment; its facts stand in the endpoint
     metadata, one card per block that has any; the band holds no line of it */
  /* CHANGED 2026-09-30 (D-069, his L-18): Standard or specialist split into the gates (my pick) or merged into them is no row of its own */
  const stdRow = await p.evaluate(() => window.__allep.mo.looks.std === 'keep');
  /* CHANGED 2026-10-02 (D-084, his L-19 ruled G2): the Security row stands right after Gates and decisions */
  const wantHeads = D.orders[D.words.rail.bord.pick].filter((k) => !D.mo.untimed.includes(byB[k]) && (stdRow || byB[k] !== 'std')).map((k) => D.blocks.find((b0) => b0.key === k).name);
  wantHeads.splice(wantHeads.indexOf(D.blocks.find((b0) => byB[b0.key] === 'gate').name) + 1, 0, D.words.mo.sec.name);
  const wantCards = new Set(ROW[E14].mo.nm.map((x) => x[0]).concat(Object.keys(D.mo.meta).map((b0) => byB[b0]))).size;
  const cmEnds = await p.$$eval('#ocol-cm .pair[data-k="d:exits"] table.etab tr.erow .vc-status', (cs) => cs.map((c) => c.textContent));
  const failRow = m0.rows.findIndex((r) => r[0] === 'fail'), grp = ROW[E14].xd.exits.map((x, i) => [x, ROW[E14].d.exits.items[i]]).filter(([x]) => typeof x[0] === 'number').map(([, e]) => String(e[2]));
  ok(JSON.stringify(m0.heads) === JSON.stringify(wantHeads) && !m0.band.some(([f]) => f === 'over') && ov && m0.nmh === MW.nm.name && m0.nmc === wantCards
     && JSON.stringify(m0.ends.flat()) === JSON.stringify(cmEnds) && JSON.stringify(m0.ends[failRow]) === JSON.stringify(grp) && grp.length === 8,
    'BY MOMENT · the rows are the blocks in the page\'s order, ' + ov.name + ' not among them (D-068: nothing of it at a moment, no line of it in the band), ' + wantCards + ' cards in the "' + MW.nm.name + '"; the Endings row is the code map\'s endings in its own order, the catch\'s cell its eight', { heads: m0.heads, want: wantHeads, nmh: m0.nmh, nmc: m0.nmc, ends: m0.ends.flat().length, cm: cmEnds.length, fail: m0.ends[failRow] });
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
  /* CHANGED 2026-09-28 (D-065): a third pair of squares, the journeys' look, is my pick (dashed) — read apart in section 19; his two here */
  const sq55 = m0.squares.filter(([g]) => g === 'lay' || g === 'cell');
  ok(MW.opt.lay.ruled === 'D-055' && MW.opt.cell.ruled === 'D-055' && m0.lay === 'cols' && m0.cell === 'chips' && sq55.length === 4
     && sq55.every(([g, v, on, dash, ruled]) => (on === 'true') === (v === pk(g)) && dash !== 'dashed' && (ruled === 'true') === (v === pk(g))) && m0.bodyRows === m0.heads.length,
    'D-055 · BY MOMENT · his defaults on a cold start: moments as columns, cells as chips, pressed and marked ruled (no dash), a row per block', m0.squares);
  await p.hover('#mobar .opt[data-mopt="lay"][data-v="cols"]'); await p.waitForTimeout(120);
  const tipR = await tipTxt();
  ok(tipR.includes(D.words.ruledMark) && !tipR.includes(D.words.pickMark), 'D-055 · BY MOMENT · his default\'s hover says it is his, not my pick', tipR);
  await p.click('#mobar .opt[data-mopt="lay"][data-v="rows"]'); await p.waitForTimeout(80);
  const m3 = await readM();
  // CHANGED 2026-09-30 (D-068): no metadata row closes the table in this look — the moments end with the one that escapes; the metadata stands apart, the same cards
  ok(m3.lay === 'rows' && JSON.stringify(m3.rows) === JSON.stringify(m0.rows) && m3.bodyRows === m0.rows.length && m3.lastRow === 'uncaught' && m3.nmc === m0.nmc,
    'BY MOMENT · moments as rows: the moments top to bottom in the same order, a row per moment, the last the one that escapes; the "' + MW.nm.name + '" keeps its ' + m0.nmc + ' cards', { moms: m3.rows.length, rows: m3.bodyRows, last: m3.lastRow, nmc: m3.nmc });
  await p.click('#mobar .opt[data-mopt="cell"][data-v="counts"]'); await p.waitForTimeout(80);
  const m4 = await readM();
  ok(m4.cell === 'counts' && !m4.chips && m4.counts > 0, 'BY MOMENT · cells as counts: a number in each cell, no chips', { counts: m4.counts, chips: m4.chips });
  await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready'); await p.evaluate((ep) => window.__allep.pick(ep), E14); await p.waitForTimeout(100);
  const m5 = await readM();
  // CHANGED 2026-09-28 (D-065): the journeys' squares are read apart (section 19)
  /* CHANGED 2026-09-30 (D-067): the legend's place and the hovers' form are pressed squares of their own, read in section 21 */
  ok(m5.lay === 'rows' && m5.cell === 'counts' && m5.squares.filter(([g, , on]) => on === 'true' && (g === 'lay' || g === 'cell')).map(([g, v]) => g + ':' + v).sort().join(' ') === 'cell:counts lay:rows', 'BY MOMENT · both looks are remembered for this viewer', [m5.lay, m5.cell]);
  await p.$eval('#sec-mo', (e) => e.scrollIntoView({ block: 'start' }));
  await p.click('#mobar .opt[data-mopt="lay"][data-v="cols"]'); await p.waitForTimeout(60); await p.click('#mobar .opt[data-mopt="cell"][data-v="chips"]'); await p.waitForTimeout(80);
  const m6 = await readM();
  ok(m6.lay === 'cols' && m6.cell === 'chips' && JSON.stringify(m6.rows) === JSON.stringify(m0.rows) && m6.chips === m0.chips, 'BY MOMENT · his default squares bring back the grid as it was', [m6.lay, m6.cell]);
  /* (f) a chip lit in the matrix lights everywhere; the station's glyph on every chip whose element it draws */
  /* CHANGED 2026-09-30 (review CR-31): with the map on (the default) a Data effects cell folds to its count — the chips look draws the chip clicked */
  await p.evaluate(() => { const A = window.__allep; A.mo.looks.dfx = 'chips'; localStorage.setItem(A.mo.key, JSON.stringify(A.mo.looks)); });
  await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready'); await p.evaluate((ep) => window.__allep.pick(ep), E14); await p.waitForTimeout(150);
  await p.$eval('#sec-mo', (e) => e.scrollIntoView({ block: 'start' }));
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
  /* CHANGED 2026-09-28 (D-064 (2)): the no-moment column is one more column under moFloor — on this endpoint the columns look's floors
     now pass the 1920 px box (its fifteen columns at their widest badge or their two-line head), so the box scrolls and says so, a
     chip never cut; the rows look still fits */
  /* CHANGED 2026-10-02 (D-084): the Security row is one more column in the rows look — at 1920 px its floors pass the box by a few px, so that look
     scrolls and says so too, a chip never cut */
  ok(!g0.cut && !g1.cut && (g1.over <= 1 ? !g1.note : g1.note) && (g0.over <= 1 ? !g0.note : g0.note), 'BY MOMENT · at 1920 px no chip is cut in either look, and one that is wider than its box says so: the rows look ' + (g1.over <= 1 ? 'fits its box' : 'scrolls ' + g1.over + ' px') + ', the columns look ' + (g0.over <= 1 ? 'fits too' : 'scrolls ' + g0.over + ' px'), { cols: g0, rows: g1 });
  // CHANGED 2026-09-26 (D-055): the path picker is ONE row of codes; the moment and the words that told two of one status apart are in
  // each code's hover — read below, on POST /cooking/sessions (section 15)
  const p87 = await p.$$eval('#mogrid td[data-f="proof"] .mc', (cs) => cs.filter((c) => /^C87/.test(c.textContent.trim())).map((c) => [...c.querySelectorAll('.vc-status')].map((x) => x.textContent)));
  /* CHANGED 2026-09-28 (D-064 (2)): the Overview left the band — its row holds nothing at a moment, and its no-moment cell draws the
     endpoint (its station glyph and method label); the band's words say what it keeps */
  /* CHANGED 2026-09-30 (D-068): the Overview's card in the endpoint metadata draws the endpoint; the table has no Overview row */
  const ubox = await p.evaluate((ep) => { const c = document.querySelector('#mometa .mcard[data-f="over"]'), k = c && c.querySelector('.mc[data-keys="endpoint:' + ep + '"]');
    return { ep: !!k, glyph: !!(k && k.querySelector('.skg')), moments: document.querySelectorAll('#mogrid tr[data-f="over"]').length, band: !!document.querySelector('#moband .mbb[data-f="over"]'),
      title: (document.querySelector('#moband h3') || {}).textContent }; }, E14);
  ok(p87.length === 1 && p87[0].length >= 1 && p87[0].every((x) => x === '502') && ubox.ep && ubox.glyph && ubox.moments === 0 && !ubox.band && ubox.title === MW.band.title,
    'BY MOMENT · a test proving two endings of one status says it (C87 proves 502); the Overview has no row and draws the endpoint on its card in the "' + MW.nm.name + '"; the band, "' + MW.band.title + '", holds no line of it', { p87, ubox });
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
  for (const i of live) { await p.hover('#mobar .mopath[data-path="' + i + '"]'); await p.waitForTimeout(60); tips.push([i, await tipTxt()]); }
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
  /* CHANGED review CR-17: a moment wears one name, its calls (or its save) a subtitle under it */
  ok(JSON.stringify(hd.filter((h) => h.m === 'fail').map((h) => h.face)) === JSON.stringify(wantF) && face('checks') === MW.moms.checks.name && commit && face('save') === MW.moms.save.name + ' · commit'
     && face('work') === MW.moms.work.name + ' · ' + wcalls[0] + ' +' + (wcalls.length - 1) && hd.every((h) => h.lines <= 2),
    'D-055 · the handler heads: ' + hd.filter((h) => h.m === 'fail').map((h) => h.face).join(' | ') + ' · ' + face('checks') + ' · ' + face('work') + ' · ' + face('save') + ' — no head past two lines', hd.map((h) => [h.face, h.lines]));
  const fh = hd.find((h) => h.m === 'fail'); await p.hover('#mogrid th.mom[data-si="' + fh.si + '"]'); await p.waitForTimeout(80);
  const ftip = await tipTxt();
  ok(ftip.includes(momName(fh.si)) && ftip.includes(R.d.exits.moms[0][0]), 'D-055 · a failure head\'s hover holds its full name, the catch\'s place among it', ftip);
  /* (c) the switch */
  await p.$eval('#ocol-cm', (e) => e.scrollIntoView({ block: 'start' })); await p.mouse.move(5, 5); await p.waitForTimeout(60);
  const readC = () => p.evaluate(() => { const C = document.getElementById('ocol-cm'), mk = new Set([...document.querySelectorAll('#mogrid [data-keys], #mometa [data-keys]')].flatMap((e) => e.getAttribute('data-keys').split('\n')));   /* CHANGED 2026-09-30 (D-068): the metadata is BY MOMENT's too */
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
  /* CHANGED 2026-09-28 (D-064 (2)): on this endpoint BY MOMENT now carries every field that holds something — so a keyed item left
     bright is asked for only where a field is left */
  ok(c0.join.length > 10 && !jBad.length && c0.join.some(([, cv]) => cv) && (c0.join.some(([, cv]) => !cv) || R.cvn[0] + R.cvn[2] === R.cvn[1]),
    'D-055 · every keyed item the switch marks carried is drawn in BY MOMENT\'s grid, every keyed item it leaves bright is not (' + c0.join.length + ' items)', jBad.slice(0, 4));
  ok(c0.cvOp.every(([o, sh]) => o === 1 && sh) && c0.cveOp.every(([o, sh]) => o === 1 && sh), 'D-055 · show all: nothing faded, nothing hidden', c0.cvOp.filter(([o, sh]) => o !== 1 || !sh).length);
  /* D-064 (2) (his ruling 2026-09-28): the six fields the hide header left on this endpoint (was "47 of 56 · 6 left · 3 with nothing
     here") are drawn by BY MOMENT's last column now — the entity, the fates' tally, the longest chain, the alarms, the proof's rank,
     the cases that only arrange through it — so each is carried whole, and nothing is left: read off the page's own marks, and each
     field's column fact read off the grid (its no-moment cell draws it) */
  const six = ['h:entity', 'c:fate', 'c:chain', 'c:alarms', 'd:proof', 'd:arranged'], NMK = { 'h:entity': 'ent', 'c:fate': 'fate', 'c:chain': 'chain', 'c:alarms': 'alarm', 'd:proof': 'proof', 'd:arranged': 'arr' };
  const sixOn = await p.evaluate((six) => six.map((k) => [k, ([...document.querySelectorAll('#ocol-cm .pair[data-k], #ocol-cm [data-sub][data-k]')].find((q) => q.getAttribute('data-k') === k) || { getAttribute: () => null }).getAttribute('data-cvs')]), six);
  const nmKinds = await p.$$eval('#mometa [data-nmk]', (cs) => [...new Set(cs.map((c) => c.getAttribute('data-nmk')))]);   /* CHANGED 2026-09-30 (D-068): the endpoint metadata */
  ok(sixOn.every(([, st]) => st === 'c') && six.every((k) => nmKinds.includes(NMK[k])) && c0.fields - c0.whole - c0.empty === 0
     && c0.count === fillW(CW.count, { covered: c0.fields - c0.empty, fields: c0.fields, left: 0, empty: c0.empty }),
    'D-064 (2) · ' + E + ' · the hide header reads "' + c0.count + '" (was 47 of 56 · 6 left · 3 with nothing here): ' + six.join(' · ') + ' are carried whole, each drawn in the "' + MW.nm.name + '" column', { sixOn, nmKinds });
  await p.click('#ocol-cm .opt[data-carry="dim"]'); await p.waitForTimeout(150); await p.mouse.move(5, 5); await p.waitForTimeout(150);
  const c1 = await readC();
  ok(c1.carry === 'dim' && c1.cvOp.length > 0 && c1.cvOp.every(([o, sh]) => o < 0.5 && sh) && c1.brightOp.every(([o]) => o === 1) && c1.cveOp.every(([o, sh]) => o < 1 && sh),
    'D-055 · dim: the ' + c1.cvOp.length + ' carried marks fade and stay drawn, every bright item stays whole', { faded: c1.cvOp.filter(([o]) => o >= 0.5).length, dimBright: c1.brightOp.filter(([o]) => o !== 1).length });
  /* CHANGED 2026-09-28 (D-064 (2)): hide now takes away every field that holds something on this endpoint, so the empty field below the
     square rises under the pointer — pointed at, it comes back whole (by design); the pointer is moved off before the read */
  /* CHANGED R-21 (legibility round 1b): the read waits for the hide to apply — the code map re-rendered under "hide", nothing in it
     under the pointer, no fade still running — instead of two fixed timings; a wait that runs out leaves the assert to say what it sees */
  await p.click('#ocol-cm .opt[data-carry="hide"]'); await p.mouse.move(5, 5);
  await p.waitForFunction(() => { const C = document.getElementById('ocol-cm'); if (!C || C.getAttribute('data-carry') !== 'hide' || C.querySelector('[data-cve="1"]:hover, [data-cv="1"]:hover')) return false;
    return document.getAnimations().every((a) => !(a.effect && a.effect.target && C.contains(a.effect.target)) || a.playState !== 'running'); }, null, { timeout: 5000, polling: 'raf' }).catch(() => {});
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
    const bx = await h.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(90); const t = await tipTxt(); await p.mouse.move(5, 5); return t; };
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
  /* CHANGED 2026-09-27 (D-060 (3)): the station draws a drawn function's calls into its own file, so _stages (↓3, seed_stage_schedule)
     and _label · _hold_hours (↓4, _schedule_next) are in the walk by their call edges — the card has no callee left apart */
  const lvOf = (n) => walk.findIndex((l) => l.includes(n)) + 1;
  ok(JSON.stringify(bh.map((l) => [l.head, l.names.map((x) => x[1])])) === JSON.stringify(bhWant) && bhN === fillW(PW.behindNoname, { n: noname.length }) && noname.length === 2 && extra.length === 0
     && lvOf('_stages') === 3 && lvOf('_label') === 4 && lvOf('_hold_hours') === 4,
    'D-056 (1) · ' + E + ' · the behind pair names the ' + wn.size + ' functions the lab\'s walk reaches, level by level — _stages ↓' + lvOf('_stages') + ', _label ↓' + lvOf('_label') + ', _hold_hours ↓' + lvOf('_hold_hours') + ' among them, none of the card\'s apart — and counts ' + noname.join(', ') + ' by name only',
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
     so: read on the first endpoint the page draws one, from the page's record of it (e[7].cp).
     CHANGED 2026-09-27 (D-061 (2)): a function in the walk now stands on its walk PARENT's paths and says "on every path that calls"
     only where the parent's paths are themselves an upper bound — on this feed no parent's are, so the first chip that says it is one
     joined to its caller by name (D-057 (d), which keeps its line); the read below is unchanged.
     CHANGED 2026-09-27 (D-062 (2)): a function joined by name now keeps its caller's line only where the caller carries one, so on
     this feed no chip says it (page-wide 87 → 0): where one does, its hover says so; where none does, the count is read as zero */
  const onOwn = (fid) => { const e0 = R.mo.el.find((e) => e[0] === 'fn' && e[2].some((ki) => MK[ki] === 'fn:' + fid)); if (!e0) return null;
    return { on: R.mo.ex.map((x, i) => [x[0], e0[5] == null || !!((e0[5] >> i) & 1)]).filter(([, on]) => on).map(([x]) => x),
      paths: FE.paths.filter((q) => (q.effects.steps || []).some((e) => (STEPS[e.step] || {}).fn === fid)).map((q) => q.exit.id), cp: (e0[7] || {}).cp || null }; };
  const same = (a, b) => JSON.stringify([...new Set(a)].sort()) === JSON.stringify([...new Set(b)].sort());
  const oSeed = onOwn('apps/api/services/long_prep.py::seed_stage_schedule'), oCount = onOwn('apps/api/services/cooking.py::count_active_sessions');
  const tSeed = await tipAt('#mogrid td[data-mom="work"][data-f="fn"] .mc[data-keys="fn:apps/api/services/long_prep.py::seed_stage_schedule"] .mt');
  const tCount = await tipAt('#mogrid td[data-mom="work"][data-f="fn"] .mc[data-keys="fn:apps/api/services/cooking.py::count_active_sessions"] .mt');
  const upK = (e) => e[0] === 'fn' && (e[7] || {}).cp && e[2] && e[2].length;   /* CHANGED (D-061 (2)): a keyed one — a chip joined by name only has no key to hover by */
  const EU = FEED.find((ep) => ROW[ep].mo.el.some(upK));
  let tUp = null, eUp = null;
  if (EU) { eUp = ROW[EU].mo.el.find(upK); await openEp(EU);
    const kUp = MK[eUp[2][0]]; tUp = await tipAt('#mogrid td[data-f="fn"] .mc[data-keys^="' + kUp + '"] .mt'); await openEp(E); }
  const nUp = FEED.reduce((a, ep) => a + ROW[ep].mo.el.filter((e) => e[0] === 'fn' && (e[7] || {}).cp).length, 0);
  ok(oSeed && oCount && tSeed && tCount && !oSeed.cp && !oCount.cp && same(oSeed.paths, oSeed.on) && same(oCount.paths, oCount.on) && oSeed.paths.length > 0
     && !tSeed.includes(fillW(MX.callPaths, { via: 'start_session' })) && !tCount.includes(fillW(MX.callPaths, { via: 'start_session' }))
     && (EU ? !!tUp && tUp.includes(fillW(MX.callPaths, { via: eUp[7].cp })) : nUp === 0),
    'review F3 · ' + E + ' · seed_stage_schedule and count_active_sessions stand on exactly the endings their own steps are on and say nothing more; '
      + (EU ? 'on ' + EU + ' a function with no steps of its own stands on the paths of ' + eUp[7].cp + ', and its hover says so' : 'no chip on the page says "on every path that calls" (' + nUp + ')'),
    { oSeed, oCount, EU, nUp, tUp: (tUp || '').slice(0, 160) });
  /* D-061 (2) (his ruling 2026-09-27): a function behind the handler stands on the paths of the CALLER it hangs under in the walk
     (its walk parent's chip), not on every path of the handler call — _stages under seed_stage_schedule, _label and _hold_hours
     under _schedule_next stand on exactly their parent's endings, fewer than the start_session call's; and the hover's "on every
     path that calls" line is said only where the parent's own paths are an upper bound (here none is, so neither they nor their
     parents say it). Feed-wide: every walk function whose parent's chip carries no such line carries none. From the page's record,
     and the three hovers by real hovers */
  { const onOf = (n) => { const e0 = R.mo.el.find((e) => e[0] === 'fn' && e[3] === n); return e0 ? { on: R.mo.ex.map((x, i) => [x[8], e0[5] == null || !!((e0[5] >> i) & 1)]).filter(([, on]) => on).map(([x]) => x), cp: (e0[7] || {}).cp || null } : null; };
    const W61 = L56.functions.walk || [], parOf = (n) => { const i = W61.findIndex((lv) => lv.some((q) => q.name === n)); const q = i > 0 ? W61[i].find((x) => x.name === n) : null; return q ? q.via : null; };
    const deep = ['_stages', '_label', '_hold_hours'].map((n) => { const o = onOf(n), pa = parOf(n), po = pa ? onOf(pa) : null; return [n, pa, o, po]; });
    const call = onOf('start_session');
    const tips61 = [];
    for (const [n] of deep) { const c = work.find((x) => x.keys.some((k) => k.endsWith('::' + n))); tips61.push(c ? await tipAt('#mogrid td[data-mom="work"][data-f="fn"] .mc[data-keys^="' + c.keys[0] + '"] .mt') : null); }
    /* a walk function the walk places — none of its own records name it on this endpoint (a chain call, a reached_by record, a step
       of its own: those name its paths themselves, and stand) */
    const bad61 = [], byKey = (Rr, fid) => Rr.mo.el.find((e) => e[0] === 'fn' && (e[2] || []).some((ki) => MK[ki] === 'fn:' + fid));
    for (const ep of FEED) { const Rr = ROW[ep], Fe = FJ.endpoints['endpoint:' + ep] || {}, Lr = facts(ep), Wr = (Lr && Lr.functions && Lr.functions.walk) || [];
      const ownF = new Set([...(Fe.paths || []).flatMap((q) => q.chain || []).filter((st) => (st.kind === 'call' || st.kind === 'collapsed') && st.fn).map((st) => st.fn),
        ...(Fe.paths || []).flatMap((q) => ((q.effects || {}).steps || []).map((x) => (STEPS[x.step] || {}).fn)).filter(Boolean),
        ...Object.entries(FJ.functions || {}).filter(([, f0]) => (f0.reached_by || []).some((rb) => rb.root === 'endpoint:' + ep)).map(([k]) => k)]);
      for (let i = 1; i < Wr.length; i++) for (const q of Wr[i]) {
        const fid = q.id.replace('#', '::'), par = Wr[i - 1].find((x) => x.name === q.via);
        if (!par || ownF.has(fid)) continue;
        const e0 = byKey(Rr, fid), pe = byKey(Rr, par.id.replace('#', '::'));
        if (e0 && pe && e0[5] != null && pe[5] != null && !(pe[7] || {}).cp && ((e0[7] || {}).cp || (e0[5] & ~pe[5]))) bad61.push(ep + ' · ' + q.name); } }
    ok(deep.every(([n, pa, o, po]) => o && po && same(o.on, po.on) && !o.cp && !po.cp) && call && deep.every(([, , o]) => o.on.length < call.on.length)
       && JSON.stringify(deep.map(([n, pa]) => [n, pa])) === JSON.stringify([['_stages', 'seed_stage_schedule'], ['_label', '_schedule_next'], ['_hold_hours', '_schedule_next']])
       && tips61.every((t) => t && !t.includes(MX.callPaths.split('{via}')[0])) && !bad61.length,
      'D-061 (2) · ' + E + ' · ' + deep.map(([n, pa, o]) => n + ' on ' + pa + '\'s ' + (o ? o.on.length : '?') + ' path(s)').join(', ') + ' (start_session\'s call: ' + (call ? call.on.length : '?')
        + '), no "on every path that calls" in their hovers; feed-wide no walk function stands wider than an exact parent or says more',
      { deep: deep.map(([n, pa, o, po]) => [n, pa, o && o.on, po && po.on]), call: call && call.on, tips61: tips61.map((t) => (t || '').slice(0, 100)), bad61: bad61.slice(0, 5) }); }
  /* (2) the cases it arranges */
  const arrWant = [...new Set([...(FE.tests.arranged_by || []), ...(FE.tests.helper_arranged || [])])], arrPage = await p.$$eval('#ocol-cm .pair[data-k="d:arranged"] [data-key]', (cs) => cs.map((c) => c.getAttribute('data-key').slice(5)));
  /* CHANGED 2026-09-28 (D-064 (2)): an arranging case has no moment by nature — every one stands in Proof's no-moment cell, in the
     code map's order, one chip each; none at a moment, none in the band */
  /* CHANGED 2026-09-28 (D-065): a case that arranges here may be a JOURNEY too — its other requests stand at the outer moments, keyed by
     the case; the case itself stands at no moment, so the journeys' chips are read apart */
  const arrTxt = await p.$eval('#ocol-cm .pair[data-k="d:arranged"] .pk', (e) => e.textContent), inGrid = await p.$$eval('#mogrid td[data-mom] [data-keys]', (cs) => cs.filter((c) => !c.closest('[data-jy]')).flatMap((c) => c.getAttribute('data-keys').split('\n')));
  const moBandP = await p.$$eval('#moband .mbb[data-f="proof"] .mbr', (rs) => rs.map((r) => r.getAttribute('data-why')));
  const arrCell = await p.$$eval('#mometa .mcard[data-f="proof"] .mc[data-nmk="arr"]', (cs) => cs.map((c) => c.getAttribute('data-key').slice(5)));
  ok(arrTxt === fillW(PW.arranged, { n: arrWant.length }) && JSON.stringify(arrPage) === JSON.stringify(arrWant) && arrWant.every((c) => !inGrid.includes('case:' + c)) && !moBandP.includes('arranged')
     && JSON.stringify(arrCell) === JSON.stringify(arrWant),
    'D-056 (2) · D-064 (2) · ' + E + ' · "' + fillW(PW.arranged, { n: arrWant.length }) + '" names the ' + arrWant.length + ' cases the feed lists (' + arrWant.join(' ') + '); none stands at a moment or in the band — each stands once in Proof\'s "' + D.words.mo.nm.name + '" cell', { arrPage, arrCell, moBandP });
  /* CHANGED 2026-09-28 (D-064 (2)): where the band lists Proof's unplaced, the arranging cases no longer join it: they stand in the
     no-moment cell, every one — a case the band holds under another reason (an acting call proving no ending) stands there as its
     acting call, and in the cell as the case that arranges */
  const EB = FEED.find((ep) => ROW[ep].mo.un.some((u) => u[0] === 'proof') && ROW[ep].d.arranged.length);
  if (EB) { await openEp(EB); const bb = await p.$$eval('#mometa .mcard[data-f="proof"] .mc[data-nmk="arr"]', (cs) => cs.map((c) => c.getAttribute('data-key').slice(5)));
    const whys = await p.$$eval('#moband .mbb[data-f="proof"] .mbr', (rs) => rs.map((r) => r.getAttribute('data-why')));
    const want2 = ROW[EB].d.arranged.map((x) => x[0]);
    ok(JSON.stringify(bb) === JSON.stringify(want2) && whys.length > 0 && !whys.includes('arranged'), 'D-056 (2) · D-064 (2) · ' + EB + ' · the band keeps Proof\'s unplaced (' + whys.join(', ') + ') and none of its ' + want2.length + ' arranging cases, which stand in the "' + D.words.mo.nm.name + '" cell, each once', { bb, want2, whys });
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
  await p.click('#mobar .mopath[data-path="all"]'); await p.waitForTimeout(120); const fAll = await p.$$eval('#mogrid td[data-mom] .vc-fate', (cs) => cs.length);   /* CHANGED 2026-09-28 (D-064 (2)): the no-moment cell's tally of fates is not a write's fate */
  ok(JSON.stringify(f201) === JSON.stringify(w201) && w201[0] === 'saved' && p403.length === 1 && !addSt(p403[0].id) && p403[0].effects.read_to
     && (!f403 || !f403.length) && fAll === 0,
    'D-056 (4) · ' + E + ' · the add to cooking_sessions wears "' + D.words.fates.saved.name + '" on the path to the 201 (the feed\'s bucket); the 403\'s path stops at the raise at ' + (p403[0] || { effects: {} }).effects.read_to + ', before the add — no fate there; all paths, no fate', { f201, f403, fAll });
  /* (5) the race */
  const r500 = ((FE.arm_findings || {}).contract || []).filter((f) => f.id === 'race-500'), rc = (await cell('work', 'data')).filter((c) => c.race);
  const rcTip = await tipAt('#mogrid td[data-mom="work"][data-f="data"] .mc:has(.mrc) .mt'), claim = FE.repeat.claims.find((c) => c.race === 'uncaught');
  const at2 = (at) => at.split('/').slice(-2).join('/');   /* CHANGED review N3-12: three files here are called cooking.py */
  ok(r500.length === 1 && rc.length === 1 && rc[0].hint === at2(r500[0].race_at) && rc[0].t.includes('500') && rcTip
     && rcTip.includes(fillW(MX.race, { cons: claim.constraint, cols: claim.unique.join(', '), at: at2(r500[0].race_at), st: 500 })),   /* CHANGED review S4-21: the one race sentence */
    'D-056 (5) · ' + E + ' · the flush at ' + (r500[0] || {}).race_at + ' (the race-500 alarm\'s) wears the race on ' + claim.constraint + ', joined to the uncaught 500', { rc: rc.map((c) => c.t), rcTip: (rcTip || '').slice(0, 160) });
  /* (6) a test that fits endings at several moments */
  const C237 = Object.values(FJ.test_cases.C237.calls).find((c) => c.endpoint === EK), xs237 = C237.refs.map((q) => q.exit);
  const momOf = (xid) => R.mo.sp[R.mo.ex.find((x) => x[0] === xid)[3]][0], pc = [];
  for (const m of [...new Set(R.mo.sp.map((x) => x[0]))]) for (const c of await cell(m, 'proof')) if (c.keys.includes('case:C237')) pc.push([m, c.st[0][0], c.hol, c.dash]);
  /* CHANGED 2026-09-30 (round-1 review F03 · CR-03): the chips a test's fits make in one cell fold into one — one chip per moment its endings stand at */
  const want237 = [...new Set(xs237.map((xid) => momOf(xid)))].sort();
  ok(JSON.stringify(pc.map((x) => x[0]).sort()) === JSON.stringify(want237) && pc.every((x) => x[2] && x[3] === 'dashed') && !(await p.$$eval('#moband .mbr[data-why="spans"] .mc', (cs) => cs.map((c) => c.textContent))).some((t) => t.includes('C237')),
    'D-056 (6) · ' + E + ' · C237 asserts a status four endings share: it rides each moment they stand at (' + want237.join(' · ') + '), one chip per moment, hollow and dashed, and no longer stands in the band', pc);
  /* (7) the headers per ending */
  const hdrs = Object.entries(FE.responses).filter(([, r0]) => r0.headers).map(([xid, r0]) => [xid, r0.status, Object.entries(r0.headers).map(([h, v]) => h + ': ' + v).join(' · ')]);
  const cmH = await p.$eval('#ocol-cm .pair[data-k="d:response"] .hdl', (e) => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => '');
  const t429 = await tipAt('#mogrid td[data-mom="edge"][data-f="end"] .mc .vc-status'), t401 = await tipAt('#mogrid td[data-mom="gate"][data-f="end"] .mc .vc-status');
  /* CHANGED 2026-09-30 (round-1 review CR-36): an elided value is said as a header whose value is worked out as it answers */
  ok(hdrs.length === 3 && hdrs.every(([, st, h]) => cmH.includes(st + ' ' + h)) && t429 && t429.includes(fillW(D.words.mo.io.l.hdrRun, { v: 'Retry-After' })) && t401 && t401.includes('WWW-Authenticate: Bearer'),
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
  /* CHANGED 2026-09-30 (round-1 review CR-36): the limiter's key in words — per caller IP, apart for its limit */
  ok(tL && tL.includes(fillW(D.words.mo.io.l.limIp, { n: av(lim, 'limit'), w: av(lim, 'window_seconds'), v: 'sensitive' })) && tA && tA.includes(fillW(MX.auth, { scheme: sch.scheme, header: sch.header, carrier: sch.carrier }))
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
  const E = 'POST /cooking/sessions', EK = 'endpoint:' + E, R = ROW[E], FE = FJ.endpoints[EK], MX = D.words.mo.x, MP = D.words.mo.path, IOL = D.words.mo.io.l;
  const base = (at) => String(at || '').split('/').pop();
  const openEp = async (ep) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + ep + '"] td.id'); await p.waitForTimeout(150); };
  const tipAt = async (sel) => { const h = await p.$(sel); if (!h) return null; await h.evaluate((x) => x.scrollIntoView({ block: 'center' })); await p.waitForTimeout(40);
    const bx = await h.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(90); const t = await tipTxt(); await p.mouse.move(5, 5); return t; };
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
  /* CHANGED 2026-09-28 (D-064 (2)): the fates' count and the alarms' dots are drawn by BY MOMENT's last column now — carried */
  ok(['h:method', 'h:segment', 'h:declared', 'h:handler', 'd:fates', 'd:alarms', 'c:alarms', 'c:fate'].every((k) => g1.st[k] === 'c')
     && g1.fates.length === FE.paths.length && g1.fates.every(Boolean) && g1.alarms.length === al1.length && g1.alarms.every(Boolean) && g1.handler.every(Boolean)
     && g1.head.includes(FE.path) && FE.path.split('/')[1] === R.seg && g1.filled.includes(String(FE.declared.success.status)) && g1.hint === FE.file.split('/').slice(-2).join('/') + ':' + FE.line   /* CHANGED review N3-12 */
     && !g1.arm && JSON.stringify([...g1.list].sort()) === JSON.stringify([...al1].sort()) && g1.list.includes('reason-collapsed'),
    'D-057 · group 1 · ' + E + ': the method, the segment, the declared ' + FE.declared.success.status + ', the handler and its file (' + g1.hint + '), the ' + FE.paths.length + ' fates and the ' + al1.length + ' alarms (' + al1.join(' ') + ') are carried, each fact drawn in BY MOMENT; the fates count and the alarm dots too, in its no-moment column (D-064 (2)); no arm word',
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
  /* CHANGED 2026-09-27 (D-060 (3)): _stages · _label · _hold_hours left this list — the walk reaches them by call edges now, so they
     stand at the work with their depth (↓3 · ↓4 · ↓4), read below; the lists join only the two known by name */
  const wantD = [['derive_restrictions', 0], ['ResolutionSnapshot.violations_for', 0]].map(([n, keyed]) => [n, keyed, nearest(n)]);
  const deepD = ['_stages', '_label', '_hold_hours'].map((n) => { const c = work.find((x) => x.name === n); return [n, c ? +((c.t.match(/\u2193(\d+)/) || [])[1]) : null, c ? !!c.keys : null]; });
  /* CHANGED 2026-09-27 (D-062 (2), his ruling "I agree with the recommendations"): a function joined by name stands on its CALLER
     chip's codes — exactly them — and says "on every path that calls" only where the caller's chip carries that line; here
     assert_recipe_allergen_safe's does not (D-061 (2): its parent start_session's paths are its own), so neither does it. The codes
     each chip stands on are read by real clicks on the path row, one code at a time */
  const MKd = D.mo.keys, codesOf = (e0) => R.mo.ex.map((x, i) => [i, e0[5] == null || !!((e0[5] >> i) & 1)]).filter(([, on]) => on).map(([i]) => i);
  const gotD = [];
  for (const [n, keyed, via] of wantD) { const c = work.find((x) => x.name === n); const i = work.indexOf(c);
    const t = c ? await tipAt('#mogrid td[data-mom="work"][data-f="fn"] .mc:nth-child(' + (i + 1) + ') .mt') : null;
    const me = R.mo.el.find((e0) => e0[0] === 'fn' && e0[3] === n), cfid = via.length === 1 ? placedFns.find((g) => g.split('::').pop() === via[0]) : null;
    const cr = me && cfid ? R.mo.el.find((e0) => e0[0] === 'fn' && e0[1] === me[1] && (e0[2] || []).some((ki) => MKd[ki] === 'fn:' + cfid)) : null;   /* its caller's chip, at its moment */
    gotD.push([n, !!c, c ? !!c.keys : null, c ? c.glyph : null, via, !!t && !!cr && !(cr[7] || {}).cp && !t.includes(MX.callPaths.split('{via}')[0]), cr && me ? JSON.stringify(codesOf(me)) === JSON.stringify(codesOf(cr)) : false, me ? codesOf(me) : null]); }
  const onCodes = [];                                            /* the same, by real clicks: each code picked, which of the two stand */
  for (const i of R.mo.ex.map((_x, j) => j)) { await p.click('#mobar .mopath[data-path="' + i + '"]'); await p.waitForTimeout(100);
    const w0 = (await cell('work', 'fn')).map((x) => x.name); onCodes.push([i, wantD.map(([n]) => w0.includes(n)), w0.includes('assert_recipe_allergen_safe')]); }
  await p.click('#mobar .mopath[data-path="all"]'); await p.waitForTimeout(100);
  const bandD = await p.$$eval('#moband .mbb[data-f="fn"] .mbr', (rs) => rs.map((r) => r.getAttribute('data-why')));
  /* CHANGED 2026-09-30 (D-069, P-L14a, his L-14: "if they are functions, they should be given a function icon"): a function known by
     name only keeps no key, and now wears the function glyph */
  ok(gotD.every(([n, here, hasKey, glyph, via, tipOk, sameCodes], j) => here && via.length === 1 && tipOk && sameCodes && (wantD[j][1] ? hasKey : !hasKey && glyph)) && !bandD.length
     && onCodes.every(([, ws, par]) => ws.every((w) => w === par)) && onCodes.some(([, , par]) => par)
     && JSON.stringify(deepD) === JSON.stringify([['_stages', 3, true], ['_label', 4, true], ['_hold_hours', 4, true]]),
    'D-057 (d) · D-062 (2) · ' + E + ': ' + gotD.map((x) => x[0] + ' under ' + x[4].join(',') + ' on codes ' + (x[7] || []).map((i) => R.mo.ex[i][1]).join(' ')).join(' · ') + ' — exactly its caller\'s, picked code by code — with no "on every path that calls" (the caller says none), no key, the function glyph; ' + deepD.map((x) => x[0] + ' ↓' + x[1]).join(' · ') + ' stand there by their call edges (D-060 (3)); the band holds no function', { gotD, onCodes, deepD, bandD });
  /* D-064 (1) (his ruling 2026-09-28): assert_recipe_allergen_safe — and the two chips joined under it by name — stand only on the paths
     that reach it. Recomputed HERE from the feed: its reached_by route (the call inside start_session, on the handler call it rides),
     the paths that route names, less those whose chain meets a fork that returns or fires a check inside start_session between its
     def and that call; the codes it stands on are the ones the real clicks above found it on. Checked against the source at 05007957:
     start_session returns the replay at `if existing is not None` and raises `recipe is None` before it calls the allergen check */
  const L64 = (at) => +String(at || '').replace(/^.*:(\d+)$/, '$1'), F64 = (at) => String(at || '').replace(/:\d+$/, '');
  const rt64 = FJ.functions['apps/api/services/recipes.py::assert_recipe_allergen_safe'].reached_by.find((b) => b.root === EK);
  const def64 = L64(FJ.functions[rt64.via].at), site64 = L64(rt64.site), file64 = F64(rt64.site);
  const brs64 = new Map(FE.branches.map((b) => [b.id, b])), preAt64 = new Set(FE.preconditions.map((g) => g.at));
  const leaves64 = (q) => q.chain.some((st) => st.hit && F64(st.at) === file64 && L64(st.at) >= def64 && L64(st.at) < site64
    && ((st.kind === 'branch' && (brs64.get(st.ref) || {}).pred && ((brs64.get(st.ref) || {}).return || (brs64.get(st.ref) || {}).exit)) || (st.kind === 'gate' && preAt64.has(st.at))));
  const want64 = FE.paths.filter((q) => rt64.paths.includes(q.id) && !leaves64(q)).map((q) => q.id).sort(), gone64 = rt64.paths.filter((pid) => !want64.includes(pid));
  const on64 = onCodes.filter(([, , par]) => par).map(([i]) => R.mo.ex[i][8]).sort(), st64 = (pid) => (R.mo.ex.find((x) => x[8] === pid) || [])[1];
  const replay64 = gone64.find((pid) => ((R.mo.ex.find((x) => x[8] === pid) || [])[9] || []).some((d) => d[1] === 'existing is not None'));
  ok(JSON.stringify(on64) === JSON.stringify(want64) && gone64.length === 2 && gone64.map(st64).sort().join(' ') === '201 404' && !!replay64 && on64.length === 3
     && onCodes.every(([, ws, par]) => ws.every((w) => w === par)),
    'D-064 (1) · ' + E + ' · assert_recipe_allergen_safe stands on codes ' + on64.map(st64).join(' ') + ', not on ' + gone64.map(st64).join(' and ') + ' (the replay returns at "existing is not None", the 404 fires "recipe is None" first, both inside start_session before its call at ' + rt64.site.split('/').pop() + '); derive_restrictions and ResolutionSnapshot.violations_for stand on the same codes',
    { on64, want64, gone64 });
  /* (e) an error nothing catches */
  const ET = 'PATCH /cooking/sessions/{session_id}/timer', FT = FJ.endpoints['endpoint:' + ET], fT = FT.findings.find((f) => f.id === 'escape-500');
  const rfT = Object.entries(FJ.functions).filter(([, f0]) => (f0.raises || []).some((q) => q.at === fT.at && q.cls === fT.cls)).map(([k]) => k);
  await openEp(ET);
  const t500 = await tipAt('#mogrid td[data-mom="uncaught"][data-f="end"] .mc .vc-status'), tRu = rfT.length === 1 ? await tipAt('#mogrid td[data-f="fn"] .mc[data-keys="fn:' + rfT[0] + '"] .mt') : null;
  const atT = fT.at.split('/').slice(-2).join('/');   /* CHANGED review N3-12: api/cooking.py and services/cooking.py both stand on this endpoint */
  ok(t500 && t500.includes(fillW(MX.cause, { cls: fT.cls, at: atT })) && tRu && tRu.includes(fillW(MX.uncaught, { cls: fT.cls, at: atT })),
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
      said.push([g.id, ownStep, !!t && t.includes(fillW(IOL.inCall, { fn: g.via.replace(/^call (.+) @ .+$/, '$1').split('::').pop(), at: '' }).replace(/,?\s*$/, '')) && !/a path picked here/.test(t)]); }   /* CHANGED review F15: the call it stands in, never how a path is picked */
    f1.push({ pid, want, gone, got, said }); }
  await p.click('#mobar .mopath[data-path="all"]'); await p.waitForTimeout(100);
  const gCap = FE.preconditions.find((g) => /concurrent_cap/.test(g.pred || '')), tCap = await tipAt('#mogrid td[data-f="gate"] .mc[data-keys^="guard:' + gCap.id + '"] .mt');
  ok(f1.length === 2 && f1.every((x) => JSON.stringify(x.got) === JSON.stringify(x.want)) && f1.some((x) => x.gone.length === 2) && f1.some((x) => !x.gone.length && x.got.includes(gCap.id))
     && f1.every((x) => x.said.every(([, , line]) => line)) && f1.some((x) => x.said.some(([, own]) => own)) && tCap && !/a path picked here/.test(tCap) && tCap.includes(IOL.inCall.split('{fn}')[0] + 'start_session'),
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
  const cpPre = MX.callPaths.split('{via}')[0];   /* CHANGED review F15 · S4-12: the "may also run under" lines left (D-017) */
  /* CHANGED 2026-09-27 (D-062 (2)): the joined chips no longer name their caller in an upper-bound line (their callers carry none), so
     a joined chip is found by its own records instead: a work chip with no depth mark whose function no call of this endpoint's
     chains, no step of its paths and no reached_by record of it names, and that a placed function's list names; it says no
     "on every path that calls" (its callers say none) and the cut-near line exactly as before */
  const F3 = FJ.endpoints['endpoint:' + E3], MK3 = D.mo.keys;
  const own3 = new Set([...(F3.paths || []).flatMap((q) => q.chain || []).filter((st) => (st.kind === 'call' || st.kind === 'collapsed') && st.fn).map((st) => st.fn),
    ...(F3.paths || []).flatMap((q) => ((q.effects || {}).steps || []).map((x) => (STEPS[x.step] || {}).fn)).filter(Boolean),
    ...Object.entries(FJ.functions || {}).filter(([, f0]) => (f0.reached_by || []).some((rb) => rb.root === 'endpoint:' + E3)).map(([k]) => k)].map((f) => f.replace('#', '::')));
  const cp3 = (g) => ROW[E3].mo.el.some((e0) => e0[0] === 'fn' && (e0[2] || []).some((ki) => MK3[ki] === 'fn:' + g) && (e0[7] || {}).cp);
  const f3 = [];
  for (let i = 0; i < w3.length; i++) { if (/\u2193/.test(w3[i].t)) continue;                       /* a depth mark: placed by its call edges, not by the lists */
    const n0 = w3[i].name, own = w3[i].keys ? w3[i].keys.split('\n')[0].slice(3) : null, jc = near3(n0);
    if ((own && own3.has(own)) || !jc.length) continue;
    const t = await tipAt('#mogrid td[data-mom="work"][data-f="fn"] .mc:nth-child(' + (i + 1) + ') .mt'); if (!t) continue;
    const via = jc.map((g) => g.split('::').pop()).sort();
    const hid = [...new Set(placed3.filter((h) => CUT.has(h) && !LB.get(h).includes(n0) && !jc.includes(h) && h !== own).map((h) => h.split('::').pop()))].sort();
    f3.push([n0, via, hid, !/may also run under/.test(t) && t.includes(cpPre) === jc.some(cp3)]); }
  /* CHANGED 2026-09-27 (D-060 (3)): _error_event and _result_event, same-file calls of _finalize_stream, stand by their call edges now
     (↓2) — no longer joined through the lists, so 5 functions are read here (4 cut-near) where 7 (6) were */
  const byEdge3 = ['_error_event', '_result_event'].map((n) => { const c = w3.find((x) => x.name === n); return [n, c ? +((c.t.match(/\u2193(\d+)/) || [])[1]) : null]; });
  ok(f3.length >= 5 && f3.every((x) => x[3]) && byEdge3.every(([, d]) => d === 2),
    'review F3 · ' + E3 + ': ' + f3.filter((x) => x[2].length).length + ' of the ' + f3.length + ' functions joined to their caller say they may also run under ' + [...new Set(f3.flatMap((x) => x[2]))].join(', ') + ' (its list is cut); the rest say nothing of it; ' + byEdge3.map((x) => x[0] + ' ↓' + x[1]).join(' · ') + ' stand by their call edges', { f3, byEdge3 });
  await p.evaluate(() => window.scrollTo(0, 0)); }
ok(!errs.length, 'no page error after the D-057 checks', errs);

/* the review of D-064 (2026-09-28) — each finding read against the feed here, then clicked */
{ const fillW = (s0, x) => String(s0).replace(/\{(\w+)\}/g, (m, k) => (x[k] != null ? x[k] : m));
  const MX = D.words.mo.x, NK = D.words.mo.nm.k, L_ = (at) => +String(at || '').replace(/^.*:(\d+)$/, '$1'), F_ = (at) => String(at || '').replace(/:\d+$/, '');
  const openEp = async (ep) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + ep + '"] td.id'); await p.waitForTimeout(150); };
  const tipAt = async (sel) => { const h = await p.$(sel); if (!h) return null; await h.evaluate((x) => x.scrollIntoView({ block: 'center' })); await p.waitForTimeout(40);
    const bx = await h.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(90); const t = await tipTxt(); await p.mouse.move(5, 5); return t; };
  const pickP = async (i) => { await p.click('#mobar .mopath[data-path="' + i + '"]'); await p.waitForTimeout(120); };
  const idx = (ep, pid) => ROW[ep].mo.ex.findIndex((x) => x[8] === pid);
  const onP = (e, i) => e[5] == null || !!((e[5] >> i) & 1);
  const fnOf = (ep, key) => ROW[ep].mo.el.filter((e) => e[0] === 'fn' && e[2].some((ki) => D.mo.keys[ki] === key));
  /* F1 · relief-accept: the 404 fires "req is None" inside relief_accept's body (its def line from the forms feed, its length from the
     archmap); build_candidate_resolutions (no call line recorded) stays on that path, and its hover says the path may leave first; on the
     path that runs relief_accept to its last return it says nothing */
  const E1 = 'POST /recipe-creation/{request_id}/relief-accept', FE1 = FJ.endpoints['endpoint:' + E1], AM = JSON.parse(fs.readFileSync(ARCHMAP, 'utf8'));
  const RA = 'apps/api/services/ai_recipes.py::relief_accept', d0 = L_(FJ.functions[RA].at), d1 = d0 + AM.function_insight[RA].lines - 1;
  const inRA = (st) => st.hit && F_(st.at) === 'apps/api/services/ai_recipes.py' && L_(st.at) >= d0 && L_(st.at) <= d1;
  const pLeft = FE1.paths.filter((q) => q.chain.some((st) => inRA(st) && (st.kind === 'gate' || (FE1.branches.find((b0) => b0.id === st.ref) || {}).pred))).map((q) => q.id);
  const pFull = FE1.paths.find((q) => q.chain.some((st) => st.kind === 'branch' && st.hit && (FE1.branches.find((b0) => b0.id === st.ref) || {}).token === 'fall-through'));
  const KB = 'fn:apps/api/services/ai_recipes.py::build_candidate_resolutions', lin = fillW(MX.leftIn, { via: 'relief_accept' });
  await open(PAGE); await openEp(E1);
  const tl = []; for (const pid of pLeft) { await pickP(idx(E1, pid)); tl.push([ROW[E1].mo.ex[idx(E1, pid)][1], await tipAt('#mogrid td[data-f="fn"] .mc[data-key="' + KB + '"]')]); }
  await pickP(idx(E1, pFull.id)); const tFull = await tipAt('#mogrid td[data-f="fn"] .mc[data-key="' + KB + '"]');
  await p.click('#mobar .mopath[data-path="all"]'); await p.waitForTimeout(100);
  ok(pLeft.length === 2 && tl.every(([, t]) => t && t.includes(lin)) && tFull && !tFull.includes(lin),
    'review F1 · ' + E1 + ': on the ' + tl.map((x) => x[0]).join(' and ') + ' (they leave relief_accept at a line inside its body, ' + d0 + '–' + d1 + ') build_candidate_resolutions says "' + lin + '"; on the ' + ROW[E1].mo.ex[idx(E1, pFull.id)][1] + ' that runs relief_accept to its last return it says nothing', { tl: tl.map(([c, t]) => [c, (t || '').slice(0, 160)]) });
  /* F2 · POST /recipes/{recipe_id}/plan: the "Cupo not found" 404 was read to owned_mode's raise, called inside plan_into_cupo before plan_recipe
     (two sites of one function, from their own routes) — no chip of plan_recipe or of assert_recipe_allergen_safe stands on it */
  const E2 = 'POST /recipes/{recipe_id}/plan', FE2 = FJ.endpoints['endpoint:' + E2];
  const OM = FJ.functions['apps/api/services/recipe_filter_modes.py::owned_mode'], zat = OM.raises[0].at;
  const rOM = OM.reached_by.find((b0) => b0.root === 'endpoint:' + E2), rPR = FJ.functions['apps/api/services/recipes.py::plan_recipe'].reached_by.find((b0) => b0.root === 'endpoint:' + E2).routes.find((b0) => b0.root_site === rOM.root_site);
  const pCupo = FE2.paths.find((q) => (q.effects || {}).read_to === zat), iC = idx(E2, pCupo.id);
  const on2 = ['plan_recipe', 'assert_recipe_allergen_safe'].map((n) => fnOf(E2, 'fn:apps/api/services/recipes.py::' + n).filter((e) => onP(e, iC)).length);
  ok(rOM.via === rPR.via && L_(rOM.site) < L_(rPR.site) && on2.every((n) => n === 0) && fnOf(E2, 'fn:apps/api/services/recipes.py::plan_recipe').length === 1,
    'review F2 · ' + E2 + ': the ' + ROW[E2].mo.ex[iC][1] + ' leaves at owned_mode (' + zat.split('/').pop() + ', its ending read to it), called at ' + rOM.site.split('/').pop() + ' before plan_recipe at ' + rPR.site.split('/').pop() + ' — neither plan_recipe nor assert_recipe_allergen_safe stands on it; plan_recipe stands once, at the call that reaches it', { on2 });
  /* F3 · POST /_e2e/seed: _discard_claim is called inside complete_setup's except (it passes the error on); the uncaught 500's record
     names that except's re-raise; no chain enters the except — the band says it runs on the way to the 500, not "on no path" */
  const E3 = 'POST /_e2e/seed', FE3 = FJ.endpoints['endpoint:' + E3];
  const c3 = FE3.failure.catches.find((c0) => (c0.actions || []).some((a) => a.call === '_discard_claim')), u3 = (FE3.produced || []).find((x) => x.phase === 'uncaught');
  const pt3 = (u3.unknown_causes || []).map((u) => u.replace(/^pass-through raise /, '')).find((a) => F_(a) === F_(c3.at) && L_(a) > L_(c3.at) && L_(a) <= Math.max(...c3.actions.map((a) => a.at)));
  await openEp(E3);
  const band3 = await p.$$eval('#moband .mbb[data-f="fn"] .mbr', (rs) => rs.map((r) => [r.getAttribute('data-why'), [...r.querySelectorAll('.mc')].map((c) => c.textContent.trim())]));
  ok(!!pt3 && !FE3.paths.some((q) => q.chain.some((st) => st.kind === 'catch' && st.at === c3.at)) && band3.some(([w, ns]) => w === 'in500' && ns.some((n) => n.includes('_discard_claim'))) && !band3.some(([w, ns]) => w === 'nopath' && ns.some((n) => n.includes('_discard_claim'))),
    'review F3 · ' + E3 + ': _discard_claim, called in the except at ' + c3.at.split('/').pop() + ' that the 500\'s re-raise at ' + (pt3 || '?').split('/').pop() + ' passes through, stands in the band as "' + D.words.mo.why.in500.name + '"', { band3 });
  /* F4 · a flag says its own words; "no test covers this" is left out of the column where a test calls the endpoint */
  const E4 = 'GET /recipes/explore', acts4 = Object.values(FJ.test_cases).reduce((a, t) => a + (t.calls || []).filter((c) => c.endpoint === 'endpoint:' + E4 && c.role === 'act').length, 0);
  const uR4 = (ROW[E4].uni.rows.find((u) => u.row === 'RISK') || { items: [] }).items.map((x) => x[0]), nm4 = ROW[E4].mo.nm.filter((x) => x[1] === 'risk').map((x) => (x[4] || {}).id);
  await openEp('POST /cooking/sessions'); const tFl = await tipAt('#mometa .mc[data-nmk="risk"]');
  ok(acts4 > 0 && uR4.includes('untested') && !nm4.includes('untested') && tFl && tFl.includes(NK.risk.ids.conflict.plain) && !tFl.includes(NK.risk.ids.untested.plain),
    'review F4 · ' + E4 + ': the Gabe Universe flags "no test covers this", ' + acts4 + ' test calls act on it — the no-moment column leaves the flag out; on POST /cooking/sessions the flag\'s hover says the conflict flag\'s own words', { uR4, nm4, tFl: (tFl || '').slice(0, 200) });
  /* F6 · DELETE /: the map labels the route "/"; the first segment is read from the path it is served at, less the app's mount */
  const E6 = 'DELETE /', FE6 = FJ.endpoints['endpoint:' + E6]; await openEp(E6);
  const seg6 = await p.$eval('#mometa .mc[data-nmk="seg"]', (c) => c.textContent.replace(/\s+/g, ' ').trim()), tSeg6 = await tipAt('#mometa .mc[data-nmk="seg"]');
  const want6 = FE6.full_path.replace(/^\/api\/v1/, '').split('/').filter(Boolean)[0];
  ok(seg6 === fillW(NK.seg.text, { v: want6 }) && tSeg6 && tSeg6.includes(fillW(NK.seg.label, { v: '/' })),
    'review F6 · ' + E6 + ': served at ' + FE6.full_path + ', its first segment reads "' + seg6 + '" (not "//"), and its hover says the map labels its path /', { seg6 });
  /* F7 · POST /cooking/sessions: load_resolution_snapshot reads before the 403 raise, inside the same call — it stands on the 403 */
  const E7 = 'POST /cooking/sessions', FE7 = FJ.endpoints['endpoint:' + E7], p403 = FE7.paths.find((q) => q.exit.id && (FE7.produced || []).some((x) => x.id === q.exit.id && x.status === 403));
  const lrs = fnOf(E7, 'fn:apps/api/reference/resolution.py::load_resolution_snapshot'), fe7 = (p403.effects.steps || []).some((e) => (STEPS[e.step] || {}).fn === 'apps/api/reference/resolution.py::load_resolution_snapshot');
  ok(fe7 && lrs.length >= 1 && lrs.some((e) => onP(e, idx(E7, p403.id))), 'review F7 · ' + E7 + ': the 403\'s steps read load_resolution_snapshot\'s tables before it leaves; its chip stands on the 403', { n: lrs.length });
  /* F8 · one call deep, in the singular; the dependencies' functions are not counted, and the hover says so */
  const E8 = 'POST /account/export'; await openEp(E8);
  /* CHANGED 2026-09-30 (D-068): the count behind is drawn as the pinned row draws it (its head word, its cell), how deep beside it */
  const b8 = await p.$eval('#mometa .msum[data-nmk="behind"]', (c) => [(c.querySelector('.msh') || {}).textContent, (c.querySelector('[data-tip="cell"]') || {}).textContent, (c.querySelector('.msd') || {}).textContent]), tb8 = await tipAt('#mometa .msum[data-nmk="behind"] .msd');
  ok(JSON.stringify(b8) === JSON.stringify([D.words.cols.behind.head, '1', fillW(D.words.mo.nm.deep1, { d: 1 })]) && tb8 && tb8.includes(NK.behind.plain), 'review F8 · ' + E8 + ': "' + b8.join(' ') + '", its hover saying the dependencies\' functions are not counted', { b8 });
  await p.evaluate(() => window.scrollTo(0, 0)); }
ok(!errs.length, 'no page error after the review-of-D-064 checks', errs);

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
  /* CHANGED 2026-09-28 (review J3 of D-065): a journey's chips wear its case and the endpoints it walks to, and carry none of them — the
     keys are read off the other chips only; a journey carries through its own id (grid.jy) */
  /* CHANGED 2026-09-30 (D-068): what the no-moment column drew stands in the endpoint metadata — its keys, its facts and its journeys are read there */
  const grid = await p.evaluate(() => ({ keys: [...new Set([...document.querySelectorAll('#mogrid .mc[data-keys], #mometa .mc[data-keys]')].filter((c) => !c.closest('[data-jy]')).flatMap((c) => c.getAttribute('data-keys').split('\n')))],
    names: [...document.querySelectorAll('#mogrid td[data-f="fn"] .mc')].map((c) => [((c.querySelector('.mt') || {}).textContent || '').trim(), (c.getAttribute('data-keys') || '').split('\n').filter((k) => k.startsWith('fn:'))[0] || '']),
    ops: [...document.querySelectorAll('#mogrid .mc[data-f="data"][data-keys]')].flatMap((c) => { const o = c.querySelector('.vc[data-vc="op"]'); return o ? c.getAttribute('data-keys').split('\n').map((k) => o.getAttribute('data-vv') + '|' + k) : []; }),
    /* D-064 (2): the facts the no-moment column draws, by kind and words */
    nm: [...document.querySelectorAll('#mometa .mc[data-nmk], #mometa .msum[data-nmk]')].map((c) => [c.getAttribute('data-nmk'), (c.matches('.msum') ? [...c.querySelectorAll('[data-tip="cell"], .msd')].map((x) => x.innerText).join(' ') : c.innerText).replace(/\s+/g, ' ').trim()]),
    head: document.querySelector('#mohead h3').getAttribute('aria-label'),
    /* D-065: the journeys BY MOMENT draws — its chips at the outer moments, its names in Proof's last column */
    jy: [...new Set([...document.querySelectorAll('#mogrid [data-jy], #mometa [data-jy]')].map((c) => c.getAttribute('data-jy')))] }));
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
    /* CHANGED 2026-09-28 (D-064 (2)): the cases past the Tests row's cap ("+N more") are carried now (the column draws the ones that
       only arrange) — each tab's "+N more" is opened before its items are read */
    const more = (row) => row.querySelectorAll('span.more').forEach((m) => { if (m.style.display !== 'none' && /^\+/.test(m.textContent)) m.click(); });
    U.querySelectorAll('.ust .urow[data-row]').forEach((row) => { const tabs = [...row.querySelectorAll('.tabbar .tab')];
      if (tabs.length) { tabs.forEach((t) => { t.click(); more(row); grab(row); }); tabs[0].click(); } else { more(row); grab(row); } });
    Object.values(out).forEach((o) => Object.values(o.items).forEach((it) => { it.keys = [...it.keys]; }));
    return { rows: out, count: document.getElementById('ucvcount').textContent, carry: U.getAttribute('data-carry') }; });
  const u0 = await readU(), UR = R.uni.rows.map((u) => u.row), UI = (rn) => (R.uni.rows.find((u) => u.row === rn) || { items: [] }).items || [];
  const OPS = { ACCESSES: UI('ACCESSES').map((o) => o[0]), CONNECTIONS: UI('CONNECTIONS').flatMap((g) => g[3].concat(g[7]).map(() => ({ reads_from: 'r', writes_to: 'w' })[g[0]] || null)) };
  /* CHANGED 2026-09-28 (D-064 (2)): what the no-moment column draws is carried too — the outline (both of the Signature row's items), a
     flag by its words, the cluster (Above's first item, no key), the docstring, the count behind (Code behind's count, whether or not
     the card names every function it counts); read off the grid's no-moment chips */
  const NMK = new Set(grid.nm.map((x) => x[0])), NMR = new Set(grid.nm.filter((x) => x[0] === 'risk').map((x) => x[1])), JY = new Set(grid.jy);
  const clOf = (UI('ABOVE') || [])[0], NMC = grid.nm.some((x) => x[0] === 'cl' && clOf != null && x[1].endsWith(' ' + clOf));
  /* CHANGED review CR-13: the metadata draws a flag by its own words (mo.nm.k.risk.ids), never the station's "conflict · …" */
  const riskW = (name, i) => { const fl = name != null ? UI('RISK').find((f) => f[2] === name) : UI('RISK')[i]; return fl ? ((D.words.mo.nm.k.risk.ids[fl[0]] || {}).name || fl[2]) : name; };
  const factWant = (rn, i, name) => rn === 'SIGNATURE' ? NMK.has('sig') : rn === 'RISK' ? NMR.has(riskW(name, i)) : rn === 'DOCSTRING' ? NMK.has('doc')
    : rn === 'ABOVE' ? NMC : null;
  const want = (rn, it, row, i) => { if (['SIGNATURE', 'RISK', 'DOCSTRING'].includes(rn) || (rn === 'ABOVE' && String(i) === '0' && !it.keys.length)) return factWant(rn, +i);
    const op = (OPS[rn] || [])[i]; if (op && it.keys.length === 1 && it.keys[0].startsWith('table:')) return GO.has(op + '|' + it.keys[0]);   /* F1: the access's own op */                 /* the def line, the flags: counted members none */
    if (rn === 'CODE BEHIND' && !it.keys.length && !it.chip) return NMK.has('behind') && grid.nm.some((x) => x[0] === 'behind' && x[1].startsWith((R.uni.rows.find((u) => u.row === rn) || {}).count + ' '));   /* its count: the column's (D-064 (2)) */
    if (rn === 'CODE BEHIND' && it.chip && !it.keys.length) return MN.has(it.text);
    /* CHANGED 2026-09-28 (D-065): a journey is carried when BY MOMENT draws that journey — its walk at the outer moments or its name in
       Proof's last column (it was: its case and every entity it crosses drawn by key) */
    if (rn === 'JOURNEYS') { const j = UI('JOURNEYS')[+i]; return !!j && JY.has(j[0] + '|' + (j[1] || '')); }
    return it.keys.length === 1 && MK.has(it.keys[0]); };
  const bad = [], per = [];
  let nIt = 0, nC = 0;
  UR.forEach((rn, ui) => { const row = u0.rows[rn]; if (!row) { bad.push([rn, 'not drawn']); return; }
    const idx = Object.keys(row.items), mark = (it) => row.st === 'c' || it.cv;
    idx.forEach((i) => { const it = row.items[i]; if (mark(it) !== want(rn, it, row, i)) bad.push([rn, i, it.keys.join(' ') || it.text, mark(it)]); });
    const c = idx.filter((i) => mark(row.items[i])).length; nIt += idx.length; nC += c; per.push([rn, c, idx.length]);
    if (idx.length !== R.ucv[ui][3] || c !== R.ucv[ui][2]) bad.push([rn, 'count', c + '/' + idx.length, R.ucv[ui].slice(2)]); });
  ok(!bad.length && nC > 0 && nC < nIt, 'D-058 · D-064 (2) · the universe · every item is marked carried exactly when BY MOMENT\'s grid draws its key (a Code behind function by its name, the endpoint by the heading) or its last column draws the fact (the outline, a flag, the cluster, the count behind); counts and lines it draws nowhere stay bright: ' + per.map((x) => x[0] + ' ' + x[1] + '/' + x[2]).join(' · '), bad.slice(0, 5));
  /* CHANGED 2026-09-28 (D-064 (2)): Source's file and the risk flag are carried now — the no-moment column draws the handler's file (with
     the line its route is declared at, not the file's length the card shows) and the flag; the usage count stays bright */
  const srcFile = (u0.rows.SOURCE || { items: {} }).items['0'];
  ok(srcFile && (srcFile.cv || u0.rows.SOURCE.st === 'c') && srcFile.keys[0] === 'file:' + R.file && (u0.rows.RISK || { st: 'c' }).st === 'c' && u0.rows.USAGE.st === 'b' && (u0.rows.SIGNATURE || {}).st === 'c',
    'D-064 (2) · the universe · Source\'s file (' + R.file + '), the risk flags and the signature are carried by the no-moment column; the usage count stays bright', { srcFile, risk: (u0.rows.RISK || {}).st, sig: (u0.rows.SIGNATURE || {}).st });
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
  /* CHANGED 2026-09-28 (D-064 (2)): Source's file and the flag fade now (the no-moment column draws them); the layer (Identity) stays */
  const byName = ['derive_restrictions', 'ResolutionSnapshot.violations_for'], cases = ['C237', 'C267'], stay = [R.uni.rows.find((u) => u.row === 'IDENTITY').kvs[1][2]],
    nowDrawn = ['UserDietaryProfile', R.uni.rows.find((u) => u.row === 'SOURCE').kvs[0][2], 'conflict · large surface'];
  /* what a name IS comes from the row's own record (its key, parallel to its name — the DOM draws the glyph, not the key) */
  const FK = new Map(R.rgaps.flatMap((g) => g[3].map((n, i) => [g[0] + '|' + n, (g[4] || [])[i] || null])));
  /* F2 (review 2026-09-26): a name stands for the card's items of its row named the same (a journey with its entities, a table's
     read and its write) — carried exactly when each of them is, read off the grid as above */
  const gWant = (x) => { const k = FK.get(x.row + '|' + x.t), row = u0.rows[x.row];
    /* CHANGED 2026-09-28 (D-065): a journey with no key of its own (a group of cases) stands for the card's journeys of that name */
    const its = row ? Object.entries(row.items).filter(([i, it]) => (k ? it.keys.includes(k) : x.row === 'CODE BEHIND' ? it.chip && !it.keys.length && it.text === x.t
      : x.row === 'JOURNEYS' && (UI('JOURNEYS')[+i] || [])[0] === x.t)) : [];
    return its.length ? its.every(([i, it]) => want(x.row, it, row, i)) : k ? MK.has(k) : x.row === 'CODE BEHIND' ? MN.has(x.t) : !!factWant(x.row, -1, x.t); };
  const fBad = g1.items.filter((x) => x.fact).filter((x) => { const w = gWant(x); return x.m !== w || (x.m ? !(x.op < 0.5) : x.op !== 1); });
  const gC = g1.items.filter((x) => x.m).length;
  ok(g1.dir === 'uni' && g1.carry === 'dim' && byName.every((n) => fct(n).m && fct(n).op < 0.5 && MN.has(n)) && cases.every((c) => fct(c).m === MK.has('case:' + c) && (fct(c).op < 0.5) === MK.has('case:' + c))
     && stay.every((n) => fct(n).t && !fct(n).m && fct(n).op === 1) && nowDrawn.every((n) => fct(n).t && fct(n).m && fct(n).op < 0.5) && !fBad.length,
    'D-058 · THE GAPS from the universe, dim: ' + byName.join(' and ') + ' fade (BY MOMENT names them), ' + nowDrawn.join(', ') + ' fade (BY MOMENT draws its table, the handler\'s file, the flag), ' + cases.map((c) => c + (MK.has('case:' + c) ? ' fades' : ' stays')).join(', ') + '; ' + stay.join(', ') + ' stay whole — every name marked exactly as BY MOMENT\'s grid draws it',
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
  /* CHANGED 2026-09-28 (D-064 (2)): on this endpoint every attribute is now carried whole — the first endpoint that carries one in part
     is opened for the reading (the panel keeps its look), then this one again */
  let pAt = g3.items.filter((x) => x.gcs === 'p'), F3E = E;
  if (!pAt.length) { F3E = FEED.find((ep) => Object.values(ROW[ep].gcv.a).some((a) => a[0] === 'p')); if (F3E) { await openEp(F3E); pAt = (await readG()).items.filter((x) => x.gcs === 'p'); } }
  const rxP = new RegExp(CW.panels.gaps.tipPart.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{(n|of)\}/g, '(\\d+)')), f3 = [];
  for (const x of pAt) { const h = await p.$('#ocol-gaps .gap[data-attr="' + x.t + '"]'); await h.scrollIntoViewIfNeeded(); const bx = await h.boundingBox();
    await p.mouse.move(bx.x + 4, bx.y + bx.height / 2); await p.waitForTimeout(90); const m = rxP.exec(await tipTxt()); f3.push([x.t, m && +m[1], m && +m[2]]); await p.mouse.move(5, 5); }
  ok(pAt.length > 0 && f3.every(([, n, of]) => n != null && n < of),
    'F3 · THE GAPS from the code map (' + F3E + '): every attribute carried in part says fewer than all its elements — ' + f3.map((x) => x[0] + ' ' + x[1] + '/' + x[2]).join(' · '), f3);
  if (F3E !== E) await openEp(E);
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

/* 19 · D-065 (his ruling 2026-09-28: "build A and B"). A journey — a pytest case that calls this endpoint AND others — has its other
   requests at BY MOMENT's outer moments; the ones that cannot be ordered are named in Proof's last column. Real clicks and real hovers,
   every expected value recomputed HERE from the station's own feed (c4-graph.js, the journeys it names for the endpoint) and forms.json
   (each case's calls in order, their refs and asserted statuses; each path's ending and the endings' statuses) — never from the page's
   record. CHANGED 2026-09-28 (review J1–J8): EACH CALL HERE has its own pair of chips, its own mask and its own before/after split; a
   call here never stands among the outer steps; the hover is the walk on its side, each call once, in order. The rule, restated:
   a call here follows a picked path by the endings its refs prove; else, for an ARRANGING call only, by the one ending of the status it
   asserts when exactly one ending has it; else it leaves (J6); an ending several paths reach keeps it on each (J5).
   (a) the journeys' look opens on "a chip per journey", my pick, dashed, not ruled;
   (b) on POST /cooking/sessions, GET /settings, DELETE /pantry/items/{item_id} and PATCH /settings/preferences: Proof at "before any
       request" and "after the answer" holds exactly the chips the rule gives, in the station's order, each face its count (and which
       call here, when there are several); C250 · C1087 · C555 · C2137 · C705 (two calls here) · C1033 (two) hovered: the hover's lines
       are EXACTLY the expected sequence;
   (c) per path, on those four endpoints: every code picked keeps exactly the chips whose call here the rule puts on that path;
   (d) the other look: every outer request an endpoint chip of its own, in order, grouped per call here; a click lights that endpoint;
       remembered; the page's copy text carries the look, the code map's own copy does not (J8);
   (e) the groups the tests arm does not read stand in Proof's last column: the face is the case and its tests (D-017), the reason in the
       hover, with a line true of a journey (J7);
   (f) J3: on GET /settings, C2137's own proof call sits in the band and its journey chips carry nothing — the Tests row's C2137 stays
       bright, and the row's carried count is the other chips' keys'. */
{ const fillW = (s0, x) => String(s0).replace(/\{(\w+)\}/g, (m, k) => (x[k] != null ? x[k] : m));
  const MW = D.words.mo, JW = MW.jy, JO = MW.opt.jy, NJ = MW.nm.k.jy, CL = D.words.copy.lines, XW = MW.x;
  const C4w = {}; (await import('node:vm')).runInNewContext(fs.readFileSync(path.join(REPO, 'templates/center/shell/example/codebase-graph-station/c4-graph.js'), 'utf8'), { window: C4w });
  const NODES = {}; Object.values(C4w.GABE_C4.l2 || {}).flatMap((e) => e.nodes || []).forEach((n) => { if (!NODES[n.id]) NODES[n.id] = n; });
  const real = new RegExp(D.ulook.jReal), TC = FJ.test_cases || {}, FE = FJ.endpoints || {};
  const sortS = (a) => [...new Set(a)].sort((x, y) => (String(x) < String(y) ? -1 : String(x) > String(y) ? 1 : 0));
  const role = (c) => JW.role[c.role] || c.role, known = (c) => !!FE[c.endpoint], epPath = (c) => (known(c) ? c.endpoint.replace(/^endpoint:\S+ /, '') : c.path);
  const asserts = (c) => { const v = sortS(((c.asserts || {}).status) || []); return v.length ? fillW(XW.asserts, { v: v.join(' · ') }) : XW.assertsNone; };
  /* an endpoint's endings (each path's exit) with their statuses, and its paths, from forms.json */
  const endingsOf = (EK) => { const e = FE[EK], st = {};
    [...(e.produced || []), ...(e.framework_exits || []), ...(e.returns || [])].forEach((x) => { if (x.status != null) st[x.id] = x.status; });
    const ends = [...new Set(e.paths.map((q) => q.exit.id))]; ends.forEach((x) => { if (st[x] == null && x.startsWith('r:')) st[x] = ((e.declared || {}).success || {}).status; });
    return { ends, st, paths: e.paths.map((q) => [q.id, q.exit.id]) }; };
  /* the journeys the rule orders around EK: per call here its join, the endings it rides, the paths to them, and its chips */
  const journeysOf = (EK) => { const SJ = ((NODES[EK] || {}).det || {}).test_journeys || [], EN = endingsOf(EK);
    const js = SJ.filter((j) => real.test(j.cid || '')).map((j) => { const t = TC[j.cid] || {}, cs = t.calls || [], here = cs.map((c, i) => (c.endpoint === EK ? i : -1)).filter((i) => i >= 0);
      if (cs.length < 2 || !here.length || here.length === cs.length) return null;
      const outer = cs.map((c, i) => i).filter((i) => !here.includes(i));
      return { cid: j.cid, jid: j.cid + '|' + (j.corpus || ''), name: t.name, cs, here, calls: here.map((k) => { const c = cs[k], st = sortS(((c.asserts || {}).status) || []);
        const refs = [...new Set((c.refs || []).map((q) => q.exit))].filter((x) => EN.ends.includes(x)), cand = EN.ends.filter((x) => st.includes(EN.st[x]));
        const how = refs.length ? 'refs' : !st.length ? 'none' : !cand.length ? 'miss' : c.role === 'act' ? 'act' : cand.length > 1 ? 'many' : 'status';
        const joined = how === 'refs' ? refs : how === 'status' ? cand : [];
        return { k, c, st, how, joined, cand, on: EN.paths.filter(([, x]) => joined.includes(x)).map(([pid]) => pid),
          b: outer.filter((i) => i < k), a: outer.filter((i) => i > k) }; }) }; }).filter(Boolean);
    return { js, EN, aggs: SJ.filter((j) => !real.test(j.cid || '')).map((j) => [j.cid, j.corpus]) }; };
  const face = (J, K, side) => { const n = (side === 'b' ? K.b : K.a).length;
    return fillW(side === 'b' ? (n === 1 ? JW.before1 : JW.before) : (n === 1 ? JW.after1 : JW.after), { n }) + (J.here.length > 1 ? ' ' + fillW(JW.ofStep, { k: K.k + 1 }) : ''); };
  const chipsWant = (G, side, pid) => G.js.flatMap((J) => J.calls.filter((K) => (side === 'b' ? K.b : K.a).length && (pid == null || K.on.includes(pid)))
    .map((K) => [J.jid, side, K.k + 1, J.cid, face(J, K, side)]));
  /* a chip's hover, line by line: its head, the test's name, the side, the walk on that side (this call, the other calls here, the
     other endpoints — each once, in order), where it goes when a path is picked, each path to its ending when several reach it, the plain */
  const tipWant = (EK, G, J, K, side) => { const rng = J.cs.map((c, i) => i).filter((i) => (side === 'b' ? i <= K.k : i >= K.k));
    const line = (i) => { const c = J.cs[i], h = i === K.k ? 1 : c.endpoint === EK ? 2 : 0;
      return fillW(h === 1 ? JW.here : h === 2 ? JW.hereAgain : JW.step, { i: i + 1, m: c.method, p: epPath(c), role: role(c) }) + ' · ' + asserts(c) + (known(c) ? '' : ' · ' + JW.noEp); };
    const jv = sortS(K.joined.map((x) => G.EN.st[x])), go = jv.length ? fillW(JW.on, { v: jv.join(' · ') }) : fillW(JW.leave[K.how], { v: K.st.join(' · '), n: K.cand.length });
    /* CHANGED 2026-09-30 (D-067, his L-22 "input, process and output"): the hover in its three parts — before: the test's name and its
       requests before this call · checks: this call · gives: its requests after it, where it goes when a path is picked, each path to its
       ending when several reach it. The side line and the plain left the item's hover (what a journey is stands in the Proof row's legend) */
    const IP = MW.io.parts, bef = (J.name ? [J.name] : []).concat(rng.filter((i) => i < K.k).map(line)),
      giv = rng.filter((i) => i > K.k).map(line).concat([go], K.on.length > K.joined.length ? [JW.onEach] : []);
    return [J.cid + ' \u00b7 ' + MW.io.k.journey.name].concat(bef.length ? [IP.b + bef.join('')] : [], [IP.c + line(K.k)], [IP.g + giv.join('')]); };
  const openEp = async (ep) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + ep + '"] td.id'); await p.waitForTimeout(150); };
  const tipLines = async (sel) => { const h = await p.$(sel); if (!h) return null; await h.evaluate((x) => x.scrollIntoView({ block: 'center' })); await p.waitForTimeout(40);
    const bx = await h.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(90);
    /* CHANGED 2026-10-03 (D-088): an element's hover is the lab's card — its lines are the head's name and kind, then the three parts as the card's `.io` groups; a hover that is not a card keeps its children */
    const t = await p.$eval('#tip', (e) => e.querySelector('.cdc') ? [e.querySelector('.cdh b').textContent + ' \u00b7 ' + e.querySelector('.cdh .cdv').textContent].concat([...e.querySelectorAll('.cdd .io')].map((c) => { const k = c.cloneNode(true); k.querySelectorAll('.cdmore').forEach((r) => r.remove()); k.querySelectorAll('.cdw[data-line]').forEach((r) => r.replaceWith(document.createTextNode(r.getAttribute('data-line')))); return k.textContent; })) : [...e.children].map((c) => c.textContent)); await p.mouse.move(5, 5); return t; };
  const jyCell = (mom) => p.$$eval('#mogrid td[data-mom="' + mom + '"][data-f="proof"] .mc[data-jy]', (cs) => cs.map((c) => [c.getAttribute('data-jy'), c.getAttribute('data-side'), +c.getAttribute('data-k'),
    ((c.querySelector('.mt') || {}).textContent || '').trim(), ((c.querySelector('.mq') || {}).textContent || '').trim()]));
  const pickP = async (i) => { const sel = '#mobar .mopath[data-path="' + i + '"]'; await p.$eval(sel, (e) => e.scrollIntoView({ block: 'center' })); await p.click(sel); await p.waitForTimeout(110); };
  await open(PAGE);
  const EPS = ['POST /cooking/sessions', 'GET /settings', 'DELETE /pantry/items/{item_id}', 'PATCH /settings/preferences'];
  const HOV = { 'POST /cooking/sessions': ['C250', 'C1087', 'C555'], 'GET /settings': ['C2137'], 'DELETE /pantry/items/{item_id}': ['C705'], 'PATCH /settings/preferences': ['C1033'] };
  const cellBad = [], tipBad = [], pathBad = [], seen = [];
  let nTips = 0, nPaths = 0;
  for (const E of EPS) { const EK = 'endpoint:' + E, G = journeysOf(EK), R = ROW[E];
    await openEp(E); await p.$eval('#sec-mo', (e) => e.scrollIntoView({ block: 'start' })); await p.waitForTimeout(80);
    if (E === EPS[0]) { /* (a) */
      const sq = await p.$$eval('#mobar .opt[data-mopt="jy"]', (os) => os.map((o) => [o.getAttribute('data-v'), o.getAttribute('aria-checked'), getComputedStyle(o).borderTopStyle, o.getAttribute('data-ruled')]));
      ok(!JO.ruled && JO.pick === 'one' && sq.length === 2 && sq.every(([v, on, dash, ruled]) => (on === 'true') === (v === JO.pick) && (dash === 'dashed') === (v === JO.pick) && !ruled),
        'D-065 · the journeys\' look opens on "' + JO.opts[JO.pick].name + '", my pick, dashed, not ruled', sq); }
    /* (b) the chips under all paths */
    const js0 = await jyCell('prior'), ja0 = await jyCell('after'), wB = chipsWant(G, 'b', null), wA = chipsWant(G, 'a', null);
    if (JSON.stringify(js0) !== JSON.stringify(wB) || JSON.stringify(ja0) !== JSON.stringify(wA)) cellBad.push([E, { js0, wB, ja0, wA }]);
    seen.push(E + ': ' + js0.map((x) => x[3] + ' · ' + x[4]).join(', ') + ' | ' + ja0.map((x) => x[3] + ' · ' + x[4]).join(', '));
    /* the hovers, line for line */
    for (const J of G.js.filter((j) => HOV[E].includes(j.cid))) for (const K of J.calls) for (const [side, mom] of [['b', 'prior'], ['a', 'after']]) { if (!(side === 'b' ? K.b : K.a).length) continue;
      const got = await tipLines('#mogrid td[data-mom="' + mom + '"][data-f="proof"] .mc[data-jy="' + J.jid + '"][data-side="' + side + '"][data-k="' + (K.k + 1) + '"]'), want = tipWant(EK, G, J, K, side);
      nTips++; if (JSON.stringify(got) !== JSON.stringify(want)) tipBad.push([E, J.cid, side, K.k + 1, { got, want }]); }
    /* (c) per path: the chips the rule puts on it, exactly */
    for (let i = 0; i < R.mo.ex.length; i++) { const pid = R.mo.ex[i][8], pe = G.EN.paths.find(([q]) => q === pid);
      if (!pe || pe[1] !== R.mo.ex[i][0]) { pathBad.push([E, i, 'the code is not a path of forms.json', R.mo.ex[i].slice(0, 2)]); continue; }
      await pickP(i); const s1 = await jyCell('prior'), a1 = await jyCell('after'); nPaths++;
      if (JSON.stringify(s1) !== JSON.stringify(chipsWant(G, 'b', pid)) || JSON.stringify(a1) !== JSON.stringify(chipsWant(G, 'a', pid))) pathBad.push([E, i, R.mo.ex[i][1], { s1, a1, want: [chipsWant(G, 'b', pid), chipsWant(G, 'a', pid)] }]); }
    await p.click('#mobar .mopath[data-path="all"]'); await p.waitForTimeout(100); }
  ok(!cellBad.length, 'D-065 (A) · review J1 · Proof at "' + MW.moms.prior.name + '" and "' + MW.moms.after.name + '" holds one chip per call here per side, a call here never among the outer steps, in the station\'s order — ' + seen.join(' ; '), cellBad);
  ok(!tipBad.length && nTips >= 12, 'D-065 (A) · review J1 · ' + nTips + ' journey hovers (C250 · C1087 · C555 · C2137 · C705 · C1033) read line for line: the walk on the chip\'s side, each call once, in order, this request and this endpoint again said apart, where it goes on a picked path', tipBad.slice(0, 3));
  ok(!pathBad.length && nPaths > 30, 'D-065 (A) · reviews J5 · J6 · on ' + nPaths + ' paths of the four endpoints, every code picked keeps exactly the chips whose call here ends on it by the stated rule (refs, else an arranging call\'s one ending of its status, on each path to it)', pathBad.slice(0, 3));
  /* a click on a journey chip lights its case everywhere — the universe's Journeys row among them */
  const E = 'POST /cooking/sessions', G0 = journeysOf('endpoint:' + E);
  await openEp(E); await p.$eval('#sec-mo', (e) => e.scrollIntoView({ block: 'start' }));
  await p.click('#mogrid td[data-mom="prior"][data-f="proof"] .mc[data-jy="C250|api"]'); await p.waitForTimeout(120);
  const l0 = await p.evaluate(() => ({ el: window.__allep.state.el, uni: !!document.querySelector('#ocol-uni .urow[data-row="JOURNEYS"] .elon[data-key="case:C250"]'), mo: document.querySelectorAll('#sec-mo .elon[data-jy]').length }));
  await p.click('#elclear'); await p.waitForTimeout(40);
  ok(l0.el === 'case:C250' && l0.uni && l0.mo >= 2, 'D-065 (A) · a click on C250\'s chip lights the case: the universe\'s Journeys row and both its chips in BY MOMENT', l0);
  /* (e) the ones that cannot be ordered, in Proof's last column: the case and its tests on the face, why in the hover (J7, D-017) */
  const nmJ = await p.$$eval('#mometa .mcard[data-f="proof"] .mc[data-nmk="jy"]', (cs) => cs.map((c) => [c.getAttribute('data-jy'), c.getAttribute('data-why'), [...c.querySelectorAll('.mt, .mq')].map((x) => x.textContent.trim())]));
  const tN = await tipLines('#mometa .mcard[data-f="proof"] .mc[data-nmk="jy"]') || [];
  const whyNames = Object.values(NJ.why).map((w) => w.name);
  ok(JSON.stringify(nmJ.map((x) => x[0])) === JSON.stringify(G0.aggs.map(([c, k]) => c + '|' + k)) && nmJ.every((x, i) => x[1] === 'agg' && JSON.stringify(x[2]) === JSON.stringify(G0.aggs[i]) && !whyNames.some((w) => x[2].includes(w)))
     && G0.aggs.length === 2 && tN.includes(NJ.why.agg.name) && tN.includes(fillW(NJ.why.agg.plain, { corpus: G0.aggs[0][1] })) && !tN.includes(MW.nm.plain),   /* CHANGED review F10: what a kind is, on its card's head */
    'D-065 (B) · review J7 · ' + E + ' · Proof\'s "' + MW.nm.name + '" cell names ' + nmJ.map((x) => x[2].join(' ')).join(' and ') + ' — the case and its tests on the face; why, and a line true of a journey, in the hover', { nmJ, tN });
  /* (d) the other look: every outer request its own endpoint chip, grouped per call here */
  const grp = (mom) => p.$$eval('#mogrid td[data-mom="' + mom + '"][data-f="proof"] .mjg[data-jy]', (gs) => gs.map((g) => [g.getAttribute('data-jy'), +g.getAttribute('data-k'), [...g.querySelectorAll('.mc.mjs')].map((c) => [c.getAttribute('data-key'), +c.getAttribute('data-i'),
    (c.querySelector('.skg') || { getAttribute: () => null }).getAttribute('data-sk'), [...c.querySelectorAll('.sksub')].map((v) => v.getAttribute('data-vc') + ':' + v.getAttribute('data-vv')).join(' ')])]));
  const wantG = (G, side) => G.js.flatMap((J) => J.calls.filter((K) => (side === 'b' ? K.b : K.a).length).map((K) => [J.jid, K.k + 1, (side === 'b' ? K.b : K.a).map((i) => [J.cs[i].endpoint, i + 1, 'endpoint', 'method:' + J.cs[i].method])]));
  await p.$eval('#mobar .opt[data-mopt="jy"][data-v="each"]', (e) => e.scrollIntoView({ block: 'center' })); await p.click('#mobar .opt[data-mopt="jy"][data-v="each"]'); await p.waitForTimeout(150);
  const gs = await grp('prior'), ga = await grp('after');
  const cut = await p.evaluate(() => [...document.querySelectorAll('#mogrid .mc')].filter((c) => c.scrollWidth > c.clientWidth + 1).length);
  ok(JSON.stringify(gs) === JSON.stringify(wantG(G0, 'b')) && JSON.stringify(ga) === JSON.stringify(wantG(G0, 'a')) && !cut,
    'D-065 (A) · "' + JO.opts.each.name + '" on ' + E + ': at both outer moments every outer request is an endpoint chip of its own in the order the case makes it (C250 after: ' + ((ga.find((g) => g[0] === 'C250|api') || [0, 0, []])[2].map((x) => x[1] + ' ' + x[0].replace('endpoint:', '')).join(' → ')) + '), with the station\'s endpoint glyph and method label; no chip cut at 1920 px', { gs: gs.length, ga: ga.length, cut });
  const K2 = 'endpoint:GET /profile/summary', sel2 = '#mogrid td[data-mom="after"][data-f="proof"] .mjg[data-jy="C250|api"] .mc.mjs[data-key="' + K2 + '"]';
  await p.$eval(sel2, (e) => e.scrollIntoView({ block: 'center' })); await p.click(sel2); await p.waitForTimeout(120);
  const l2 = await p.evaluate((K) => ({ el: window.__allep.state.el, row: (document.querySelector('#board tr.row[data-ep="' + K.slice(9) + '"]') || { getAttribute: () => null }).getAttribute('data-el') }), K2);
  await p.click('#elclear'); await p.waitForTimeout(40);
  ok(l2.el === K2 && l2.row === 'on', 'D-065 (A) · a click on the GET /profile/summary chip in C250\'s walk lights that endpoint, its table row among the lit', l2);
  /* the same look on DELETE /pantry/items/{item_id}: C705's two calls here, each its own group, its steps 1–3 and never step 4 */
  const E705 = 'DELETE /pantry/items/{item_id}', G705 = journeysOf('endpoint:' + E705); await openEp(E705);
  const g705 = (await grp('prior')).filter((g) => g[0] === 'C705|api'), w705 = wantG(G705, 'b').filter((g) => g[0] === 'C705|api');
  const lab705 = await p.$$eval('#mogrid td[data-mom="prior"][data-f="proof"] .mjg[data-jy="C705|api"] .mjl .mq', (xs) => xs.map((x) => x.textContent));
  ok(JSON.stringify(g705) === JSON.stringify(w705) && g705.length === 2 && JSON.stringify(lab705) === JSON.stringify([4, 5].map((k) => fillW(JW.around, { k }))),
    'D-065 (A) · review J1 · ' + E705 + ' · "' + JO.opts.each.name + '": C705 calls here at steps 4 and 5, each call its own group (' + lab705.join(' · ') + '), its outer steps 1–3 only', { g705, w705, lab705 });
  await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready'); await openEp(E);
  const kept = await p.evaluate(() => [window.__allep.mo.looks.jy, document.querySelectorAll('#mogrid .mjg[data-jy]').length]);
  await p.evaluate(() => { window.__copied = null; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (s1) => { window.__copied = s1; return Promise.resolve(); } } }); });
  await p.$eval('#cmcopy', (e) => e.scrollIntoView({ block: 'center' })); await p.click('#cmcopy'); await p.waitForTimeout(80);
  const jl = CL.mo + ' · ' + JO.label + ': ' + JO.opts.each.name + ' (' + D.words.copy.his + ')', cp = await p.evaluate(() => [window.__copied, document.getElementById('out').value]);
  ok(kept[0] === 'each' && kept[1] === gs.length + ga.length && cp[0] && !cp[0].split('\n').some((l) => l.startsWith(CL.mo + ' · ')) && cp[1].includes(jl),
    'D-065 · review J8 · the journeys\' look is remembered for this viewer; the page\'s copy text carries it ("' + jl + '"), the code map\'s own copy carries none of BY MOMENT\'s looks', { kept, jl, cm: cp[0] });
  await p.$eval('#mobar .opt[data-mopt="jy"][data-v="one"]', (e) => e.scrollIntoView({ block: 'center' })); await p.click('#mobar .opt[data-mopt="jy"][data-v="one"]'); await p.waitForTimeout(100);
  ok((await p.evaluate(() => window.__allep.mo.looks.jy)) === 'one', 'D-065 · back to my pick, one chip per journey');
  /* (f) review J3 · GET /settings: C2137's own proof call is in the band; its journey chips wear its key and carry nothing */
  const ES = 'GET /settings'; await openEp(ES);
  const f3 = await p.evaluate(() => { const own = [...document.querySelectorAll('#mogrid .mc[data-keys], #mometa .mc[data-keys]')].filter((c) => !c.closest('[data-jy]')).flatMap((c) => c.getAttribute('data-keys').split('\n'));
    const band = [...document.querySelectorAll('#moband [data-keys]')].flatMap((c) => c.getAttribute('data-keys').split('\n'));
    const row = document.querySelector('#ocol-uni .ust .urow[data-row="TESTS"]'), its = {}, tabs = [...row.querySelectorAll('.tabbar .tab')];
    const grab = () => { row.querySelectorAll('span.more').forEach((m) => { if (m.style.display !== 'none' && /^\+/.test(m.textContent)) m.click(); });   /* every tab, past its "+N more" (as section 18 reads it) */
      row.querySelectorAll('[data-ue]').forEach((n) => { const i = n.getAttribute('data-ue'), it = its[i] || (its[i] = { keys: new Set(), cv: false }); [n, ...n.querySelectorAll('[data-keys]')].forEach((k) => (k.getAttribute('data-keys') || '').split('\n').filter(Boolean).forEach((x) => it.keys.add(x))); if (n.getAttribute('data-cv') === '1') it.cv = true; }); };
    if (tabs.length) { tabs.forEach((t) => { t.click(); grab(); }); tabs[0].click(); } else grab();
    const L = Object.values(its).map((it) => [[...it.keys][0] || null, it.cv]);
    return { own: [...new Set(own)], band: [...new Set(band)], items: L, jy: document.querySelectorAll('#mogrid .mc[data-jy*="C2137"]').length, st: row.getAttribute('data-ucs') }; });
  const c2137 = f3.items.find((x) => x[0] === 'case:C2137') || [null, null], wantC = f3.items.filter((x) => x[0] && f3.own.includes(x[0])).length;
  ok(f3.jy === 2 && f3.band.includes('case:C2137') && !f3.own.includes('case:C2137') && c2137[1] === false && f3.items.filter((x) => x[1]).length === wantC && wantC === 6 && f3.items.length === 10,
    'D-065 · review J3 · ' + ES + ' · C2137 wears its case key on its ' + f3.jy + ' journey chips and its own call sits in the band: the Tests row\'s C2137 stays bright; ' + wantC + ' of ' + f3.items.length + ' carried, the other chips\' keys', f3);
  await p.evaluate(() => window.scrollTo(0, 0)); }
ok(!errs.length, 'no page error after the D-065 checks', errs);

/* 21 · D-067 (his note "API Hover Legend Consolidation", L-01 … L-04 · L-22): ONE hover per item, its own facts in three parts; the
   kinds and labels in the row's legend (on the row's name, his placement; above the table, the option); no page-facing line in a hover;
   a column's words on its head only; the code map's items and the table's id cell one hover each; no native tooltip on an empty cell */
{ const E = 'POST /cooking/sessions', R = ROW[E], FE = FJ.endpoints['endpoint:' + E], MW = D.words.mo, IO = MW.io, XW = MW.x;
  const fillW = (s0, x) => String(s0).replace(/\{(\w+)\}/g, (m, k) => (x[k] != null ? x[k] : m));
  const openEp = async (ep) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + ep + '"] td.id'); await p.waitForTimeout(150); };
  const tipAt = async (sel) => { const h = await p.$(sel); if (!h) return null; await h.evaluate((x) => x.scrollIntoView({ block: 'center' })); await p.waitForTimeout(40);
    const bx = await h.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(90);
    const t = await p.$eval('#tip', (e) => ({ text: e.textContent, html: e.innerHTML })); await p.mouse.move(5, 5); return t; };
  await open(PAGE); await openEp(E);
  /* (1) one hover per item */
  const nest = await p.evaluate(() => [document.querySelectorAll('#mogrid .mc [data-tip], #mometa .nmc [data-tip], #moband .mc [data-tip]').length, document.querySelectorAll('#mogrid .mc').length,
    document.querySelectorAll('#mogrid td [title], #mogrid td[title]').length, document.querySelectorAll('#board .idc [data-tip]').length]);
  ok(nest[0] === 0 && nest[1] > 100 && nest[2] === 0 && nest[3] === 0, 'D-067 (P1 · P5) · ' + E + ' · no hover inside any of the ' + nest[1] + ' BY MOMENT chips, no native tooltip on a cell, none inside the table\'s id cells', nest);
  /* (2) the two 429s read apart: each names its limit, the line it is checked at, its scope and its numbers (read from forms.json) */
  const lims = FE.rate.limits.map((l) => ({ nm: l.limiter.replace(/^_/, ''), at: l.at.split('/').pop(), lim: l.args.find((a) => a.param === 'limit').value, w: l.args.find((a) => a.param === 'window_seconds').value, key: l.key }));
  const t429 = []; for (const c of await p.$$('#mogrid td[data-mom="edge"][data-f="end"] .mc')) { await c.scrollIntoViewIfNeeded(); const bx = await c.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(90);
    t429.push(await tipTxt()); await p.mouse.move(5, 5); }
  // CHANGED 2026-09-30 (round-1 review CR-36): the key in words
  ok(t429.length === 2 && t429[0] !== t429[1] && lims.every((l) => t429.filter((t) => t.startsWith('429 · ' + l.nm) && t.includes(l.at) && t.includes(fillW(IO.l.limIp, { n: l.lim, w: l.w, v: l.nm }))).length === 1)
     && t429.every((t) => t.includes(IO.parts.b) && t.includes(IO.parts.c) && t.includes(IO.parts.g)),
    'D-067 (L-03) · ' + E + ' · the two 429s at the edge read apart: ' + lims.map((l) => l.nm + ' at ' + l.at + ', ' + l.lim + ' per ' + l.w + ' s').join(' · ') + ', each in before · checks · gives', t429.map((t) => t.slice(0, 90)));
  /* (3) the C237 chips, one per ending it fits, each names the ending it proves (the build stops on two that read the same) */
  const t237 = []; for (const c of await p.$$('#mogrid .mc[data-f="proof"][data-keys="case:C237"]')) { await c.scrollIntoViewIfNeeded(); const bx = await c.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(90);
    t237.push(await tipTxt()); await p.mouse.move(5, 5); }
  /* CHANGED 2026-09-30 (round-1 review F03): one chip per cell, each hover naming the endings it FITS there */
  ok(t237.length === 3 && new Set(t237).size === 3 && t237.every((t) => t.includes(fillW(IO.l.fitsOf, { n: 4, h: '' }).split(',')[0])), 'D-067 (L-03) · C237\'s ' + t237.length + ' chips, one per cell its status fits endings in, each hover names the endings it fits there', t237.map((t) => t.slice(-90)));
  /* (4) no page-facing line in an item's hover (D-017), nor a kind's definition */
  const tEnd = await tipAt('#mogrid td[data-mom="body"][data-f="end"] .mc'), prov = Object.values(D.words.enc.from).concat([D.words.station.glyph, D.words.station.card, D.words.kinds.framework.plain]);
  ok(tEnd && !prov.some((w) => tEnd.text.includes(w)), 'D-067 (P4) · the framework ending\'s hover says no "as … draws it", no station words and not what "framework" means', (tEnd || {}).text);
  /* (5) the row's legend on the row's name (his placement, ruled): the kinds and labels drawn, each cloned, with how many */
  const tLeg = await tipAt('#mogrid th[data-f="end"] .mbn'), nKinds = new Set(R.mo.el.filter((e) => e[0] === 'end').map((e) => e[4][1])).size;
  ok(MW.opt.leg.ruled === 'D-067' && MW.opt.leg.pick === 'hover' && tLeg && tLeg.text.includes(MW.leg.kinds) && tLeg.text.includes(MW.leg.marks) && (tLeg.html.match(/class="lg"/g) || []).length >= nKinds
     && ['refusal', 'framework'].every((k) => tLeg.text.includes(D.words.kinds[k].plain)),
    'D-067 (P2 B1) · the Endings row\'s name carries its legend: the ' + nKinds + ' kinds of ending, each with what it means, and the status labels', (tLeg || {}).text.slice(0, 160));
  /* (6) the options: the legend above the table, and the hovers as one sentence */
  const sq = await p.$$eval('#mobar .opt[data-mopt="leg"], #mobar .opt[data-mopt="ipo"]', (os) => os.map((o) => [o.getAttribute('data-mopt'), o.getAttribute('data-v'), o.getAttribute('aria-checked'), o.getAttribute('data-ruled'), o.getAttribute('data-pick')]));
  await p.click('#mobar .opt[data-mopt="leg"][data-v="strip"]'); await p.waitForTimeout(150);
  const strip = await p.evaluate(() => { const L = document.getElementById('moleg'); return [L.hidden, L.querySelectorAll('.mlr').length, document.querySelectorAll('#mogrid tbody tr[data-f]').length]; });
  const tLeg2 = await tipAt('#mogrid th[data-f="end"] .mbn');
  await p.click('#mobar .opt[data-mopt="leg"][data-v="hover"]'); await p.click('#mobar .opt[data-mopt="ipo"][data-v="sent"]'); await p.waitForTimeout(150);
  const tSent = await tipAt('#mogrid td[data-mom="edge"][data-f="end"] .mc');
  await p.click('#mobar .opt[data-mopt="ipo"][data-v="lines"]'); await p.waitForTimeout(100);
  ok(sq.length === 4 && sq.some(([g, v, on, ruled]) => g === 'leg' && v === 'hover' && on === 'true' && ruled === 'true') && sq.some(([g, v, on, ruled]) => g === 'ipo' && v === 'lines' && on === 'true' && ruled === 'true')   /* D-081: the labelled lines are his */
     && !strip[0] && strip[1] === strip[2] && tLeg2 && !tLeg2.text.includes(MW.leg.kinds) && tSent && tSent.html.includes('iosent') && !tSent.html.includes('class="io"') && tSent.text.includes(IO.arrow.trim()),
    'D-067 (P2 B2 · P3b) · the legend above the table shows one line per row and leaves the row\'s name its own words; the hovers as one sentence read before → checks → gives', { sq, strip });
  /* (7) a column's words on its head, never on each cell */
  const c0 = D.cols.find((c) => c.kind === 'spine'), tCell = await tipAt('#board tr.row [data-col="' + c0.id + '"]'), tHead = await tipAt('#board thead th[data-tip="head"][data-col="' + c0.id + '"]');
  const st0 = D.orders.stageRows.filter((x) => D.orders.kinds[x] !== 'screen')[0];
  ok(tCell && tHead && !tCell.text.includes(c0.plain) && tHead.text.includes(c0.plain) && tHead.text.includes(st0 + ' — ' + D.words.stages[st0]),
    'D-067 (P4) · the ' + c0.id + ' column says what it is on its head (with each stage), and its cells say only their own', { cell: (tCell || {}).text, head: (tHead || {}).text.slice(0, 120) });
  /* R-01 (legibility round 1b): the five columns whose definition still rode every cell — their name stands on the head alone */
  const r01 = []; for (const cid of ['fate', 'pieces', 'lacks', 'proof', 'alarms']) { const c9 = D.cols.find((c) => c.id === cid); if (!c9) { r01.push([cid, 'no column']); continue; }
    /* the cell's own hover (dispatched on the cell, not on a dot or a stage inside it, which hover as themselves) */
    const tc9 = await p.evaluate((cid) => { const e = document.querySelector('#board tr.row [data-tip="cell"][data-col="' + cid + '"]'); if (!e) return null;
      e.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); const t = document.getElementById('tip'), out = t.getAttribute('data-show') === 'true' ? t.textContent : null;
      document.body.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); return out; }, cid);
    const th9 = await tipAt('#board thead th[data-tip="head"][data-col="' + cid + '"]');
    r01.push([cid, !!tc9 && !tc9.includes(c9.name) && tc9.startsWith(c9.head), !!th9 && th9.text.includes(c9.name)]); }
  ok(r01.length === 5 && r01.every(([, cell, head]) => cell === true && head === true),
    'R-01 · fate · pieces · lacks · proven · alarms: each cell\'s hover says its endpoint and value, the column\'s definition only on its head', r01);
  /* (8) a code-map item hovers as itself, not as its field */
  const tIt = await tipAt('#ocol-cm .pair[data-k="d:tables"] li'), fld = D.attrs[(await p.$eval('#ocol-cm .pair[data-k="d:tables"]', (e) => e.getAttribute('data-attr'))).split(' ')[0]].plain;
  ok(tIt && !tIt.text.includes(fld) && (await p.$$eval('#ocol-cm .pair [data-tip="cmitem"] :is([data-tip="vc"], [data-tip="sk"], [data-tip="cell"])', (n) => n.length)) === 0,
    'D-067 (P5) · a table named in the code map hovers as that table, the field\'s own words stay on the field\'s name; nothing inside an item hovers apart', (tIt || {}).text);
  await p.evaluate(() => window.scrollTo(0, 0)); }
ok(!errs.length, 'no page error after the D-067 checks', errs);

/* 22 · D-068 (his note, L-05 · L-06 · L-07 · L-20 · L-21): BY MOMENT's structure. Real clicks on POST /cooking/sessions:
   (a) a band of stages over the moments — outside the request · EDGE · INPUT 1 of 2 · GATE · INPUT 2 of 2 · HANDLER · EFFECTS · ANSWER ·
       outside the request · UNCAUGHT — its spans cover every moment head, each stage's count is the endings its moments hold, summed
       per stage it is the pinned row's stages column; no head wears the old stage mark;
   (b) the try at cooking.py:149 is a fork: a bracket over its three excepts and the save, "one of 4"; every path the generator
       lists takes at most one of its ways; the road row (the header's option) says it too; saving under HANDLER (its option) leaves an
       EFFECTS outline and no EFFECTS cell;
   (c) the endpoint metadata stands after the table (my pick), one card per block, the Overview first; the proof's two counts stand
       apart, each labelled; its option moves it before the table;
   (d) a row's head repeats its columns of the pinned row with the pinned row's head words and values; a click lights exactly the
       members of that column BY MOMENT draws, and its pinned-row cell; a chip's hover ends with the columns that count it;
   (e) a click on a head widens its column, the × hides it and the bar brings it back; fit leaves no sideways scroll; the state survives
       a resize and a reload; the copy text says the columns only when they are not as they open; a row's options slot hides that row */
{ const E = 'POST /cooking/sessions', R = ROW[E], MW = D.words.mo, SG = MW.stg, fillW = (s0, x) => String(s0).replace(/\{(\w+)\}/g, (m, k) => (x[k] != null ? x[k] : m));
  const openEp = async (ep) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + ep + '"] td.id'); await p.waitForTimeout(150); };
  const tipAt = async (sel) => { const h = await p.$(sel); if (!h) return null; await h.evaluate((x) => x.scrollIntoView({ block: 'center' })); await p.waitForTimeout(40);
    const bx = await h.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(90);
    const t = await tipTxt(); await p.mouse.move(5, 5); return t; };
  const outCols = async () => (await p.$eval('#out', (e) => e.value)).split('\n').filter((l) => l.startsWith(D.words.copy.lines.mo + ' · ' + MW.col.copy + ':'));
  const clk = async (sel) => { await p.$eval(sel, (e) => e.scrollIntoView({ block: 'center' })); await p.click(sel); await p.waitForTimeout(130); };
  await open(PAGE); await openEp(E); await p.$eval('#sec-mo', (e) => e.scrollIntoView({ block: 'start' }));
  /* (a) the stage band */
  const band = await p.evaluate(() => { const t = document.querySelector('#mogrid table.motab');
    return { cells: [...t.querySelectorAll('thead th.mosb')].map((c) => [c.getAttribute('data-stage'), c.colSpan, (c.querySelector('.mosp') || {}).textContent || null, parseInt((c.querySelector('.mosc') || {}).textContent || '0', 10)]),
      heads: t.querySelectorAll('thead th.mom').length, glyph: t.querySelectorAll('th.mom .mstg').length, moms: [...t.querySelectorAll('thead th.mom')].map((h) => h.getAttribute('data-mom')) }; });
  const wantSt = ['out', 'EDGE', 'INPUT', 'GATE', 'INPUT', 'HANDLER', 'EFFECTS', 'ANSWER', 'out', 'UNCAUGHT'], perSt = {};
  band.cells.forEach(([st, , , n]) => { if (st !== 'out') perSt[st] = (perSt[st] || 0) + n; });
  const colSt = Object.fromEntries(Object.entries(R.v.stage).filter(([, n]) => n));
  ok(JSON.stringify(band.cells.map((c) => c[0])) === JSON.stringify(wantSt) && band.cells.reduce((a, c) => a + c[1], 0) === band.heads && !band.glyph
     && band.cells.filter((c) => c[0] === 'INPUT').map((c) => c[2]).join('|') === [1, 2].map((i) => fillW(SG.part, { i, k: 2 })).join('|') && JSON.stringify(perSt) === JSON.stringify(Object.fromEntries(Object.keys(perSt).map((k) => [k, colSt[k] || 0])))
     && Object.keys(colSt).every((k) => perSt[k] === colSt[k]),
    'D-068 (L-05) · the stages over the moments: ' + band.cells.map((c) => (c[0] === 'out' ? SG.out.name : c[0]) + (c[2] ? ' ' + c[2] : '') + (c[3] ? ' ·' + c[3] : '')).join(' | ') + ' — the endings each holds are the pinned row\'s stages; no stage mark left on a head', { band, colSt });
  const tOut = await tipAt('#mogrid th.mosb[data-stage="out"]'), tIn = await tipAt('#mogrid th.mosb[data-stage="INPUT"]');
  ok(tOut && tOut.includes(SG.out.plain) && tIn && tIn.includes(SG.why.INPUT) && tIn.includes(fillW(SG.partPlain, { i: 1, k: 2 })), 'D-068 (L-05) · the band says what lies outside the request, and why INPUT comes back', { tOut, tIn });
  /* (b) the fork */
  const FK = R.mo.fk, fails = band.moms.map((m, i) => [m, i]).filter(([m]) => m === 'fail').map(([, i]) => i);
  const fk = await p.evaluate(() => [...document.querySelectorAll('#mogrid th.mom')].map((h) => [h.getAttribute('data-mom'), h.getAttribute('data-fk'), (h.querySelector('.mfk') || { getAttribute: () => null }).getAttribute('data-fkp'), (h.querySelector('.mfkl') || {}).textContent || null]));
  const ways = FK.length === 1 ? FK[0][0].concat(FK[0][1] == null ? [] : [FK[0][1]]) : [];
  const takeOk = FK.every((f) => f[2].length === R.mo.ex.length && f[2].every((t, i) => t == null || (f[0].concat(f[1] == null ? [] : [f[1]]).includes(t) && R.mo.pass[i].includes(t))));
  ok(FK.length === 1 && ways.length === 4 && JSON.stringify(ways.map((si) => R.mo.sp[si][0])) === JSON.stringify(['fail', 'fail', 'fail', 'save']) && takeOk
     && JSON.stringify(fk.filter((h) => h[1] != null).map((h) => [h[0], h[2]])) === JSON.stringify([['fail', 'first'], ['fail', 'mid'], ['fail', 'mid'], ['save', 'last']]) && fk.find((h) => h[2] === 'first')[3] === fillW(SG.fork.name, { n: 4 }) && fails.length === 3,
    'D-068 (L-05) · the try around start_session is a fork of ' + ways.length + ' ways — its three excepts and the save — under one bracket, "' + fillW(SG.fork.name, { n: 4 }) + '"; each path takes at most one way, one it passes', { FK, fk });
  const tFk = await tipAt('#mogrid th.mom .mfk[data-fkp="first"]');
  ok(tFk && tFk.includes(fillW(SG.fork.plain, { n: 4 })) && tFk.includes(fillW(SG.fork.way, { i: 4, v: MW.moms.save.name })), 'D-068 (L-05) · the bracket\'s hover names its ways in order', tFk);
  await clk('#mobar .opt[data-mopt="hdr"][data-v="road"]'); await clk('#mobar .opt[data-mopt="save"][data-v="hand"]');
  const rd = await p.evaluate(() => ({ road: [...document.querySelectorAll('#mogrid thead th.mord')].map((c) => [c.textContent, c.colSpan]), brk: document.querySelectorAll('#mogrid th.mom .mfk').length,
    eff: document.querySelectorAll('#mogrid th.mosb[data-stage="EFFECTS"]').length, outline: document.querySelectorAll('#mogrid th.mosb[data-stage="HANDLER"] .moseff').length,
    sq: ['hdr', 'save'].map((g) => [...document.querySelectorAll('#mobar .opt[data-mopt="' + g + '"]')].map((o) => [o.getAttribute('data-v'), o.getAttribute('aria-checked'), o.getAttribute('data-pick')])) }));
  ok(JSON.stringify(rd.road) === JSON.stringify([[SG.road.seq, band.heads - 7], [fillW(SG.fork.name, { n: 4 }), 4], [SG.road.seq, 3]]) && !rd.brk && !rd.eff && rd.outline === 1   /* CHANGED review CR-20: "earlier in the test" stands before the fork */
     && rd.sq.every((g) => g.some(([, , pk]) => pk === 'true')) && rd.sq[0].find(([v]) => v === MW.opt.hdr.pick)[2] === 'true',
    'D-068 (L-05) · the options: the road row says "' + SG.road.seq + '" and "' + fillW(SG.fork.name, { n: 4 }) + '" where the bracket stood; saving under HANDLER leaves an EFFECTS outline and no EFFECTS cell; my picks dashed', rd);
  await clk('#mobar .opt[data-mopt="lay"][data-v="rows"]');
  const rw = await p.evaluate(() => ({ st: [...document.querySelectorAll('#mogrid tbody th.mosb')].map((c) => [c.getAttribute('data-stage'), c.rowSpan]), road: document.querySelectorAll('#mogrid tbody th.mord').length }));
  ok(rw.st.length >= 9 && rw.st.reduce((a, c) => a + c[1], 0) === band.heads && rw.road === 3, 'D-068 (L-05) · moments as rows: the stages and the roads a column of their own, spanning the moments', rw);
  await clk('#mobar .opt[data-mopt="lay"][data-v="cols"]'); await clk('#mobar .opt[data-mopt="hdr"][data-v="band"]'); await clk('#mobar .opt[data-mopt="save"][data-v="eff"]');
  /* (c) the endpoint metadata */
  const mt = await p.evaluate(() => { const M = document.getElementById('mometa');
    return { after: M.previousElementSibling.id, cards: [...M.querySelectorAll('.mcard')].map((c) => c.getAttribute('data-f')), sums: [...M.querySelectorAll('.msum')].map((l) => [l.getAttribute('data-mcol'), (l.querySelector('.msh') || {}).textContent]),
      proofWords: (M.querySelector('.msum[data-mcol="proof"] .msw') || {}).textContent || null, named: (M.querySelector('.msum[data-nmk="proof"] .nmc') || {}).textContent || null }; });
  const proofNm = R.mo.nm.find((x) => x[1] === 'proof')[4];
  ok(mt.after === 'mogrid' && mt.cards[0] === 'over' && mt.cards.length === new Set(R.mo.nm.map((x) => x[0]).concat(Object.keys(D.mo.meta).map((b0) => Object.keys(D.mo.fam).find((f) => D.mo.fam[f] === b0)))).size
     && mt.sums.filter(([, h]) => h !== MW.nm.named).every(([cid, h]) => D.words.cols[cid] && h === D.words.cols[cid].head) && mt.sums.some(([cid]) => cid === 'fate') && mt.proofWords === D.words.cols.proof.name
     && mt.named && mt.named.includes(proofNm.tested + '/' + proofNm.produced) && mt.sums.filter(([cid]) => cid === 'proof').map(([, h]) => h).join('|') === [D.words.cols.proof.head, MW.nm.named].join('|'),
    'D-068 (L-06/L-07) · the endpoint metadata after the table: ' + mt.cards.length + ' cards, the Overview first; what sums it up under the pinned row\'s own head words (' + mt.sums.map((x) => x[1]).join(' · ') + '); the proof\'s two counts each labelled', mt);
  await clk('#mobar .opt[data-mopt="meta"][data-v="before"]');
  const mt2 = await p.evaluate(() => document.getElementById('mometa').nextElementSibling.id);
  await clk('#mobar .opt[data-mopt="meta"][data-v="after"]');
  ok(mt2 === 'moscroll', 'D-068 (L-06) · its option moves the metadata before the table', mt2);
  /* (d) the row heads */
  const rh = await p.evaluate(() => [...document.querySelectorAll('#mogrid tbody th[data-block]')].map((h) => [h.getAttribute('data-f'), [...h.querySelectorAll('.msc')].map((b) => [b.getAttribute('data-mcol'), b.querySelector('.msh').textContent, b.querySelector('.msv').textContent]), !!h.querySelector('.mro')]));
  const pinVal = async (cid) => p.$eval('#pin tbody [data-col="' + cid + '"]', (e) => e.textContent.trim()).catch(() => null);
  const fnRow = rh.find((x) => x[0] === 'fn'), wantFn = D.mo.cols.fn.map((cid) => [cid, D.words.cols[cid].head, String(R.k[cid])]);
  /* CHANGED 2026-09-30 (D-069, his L-18): with Standard or specialist split into the gates (my pick) or merged, its columns stand on the gates' row */
  const stdKeep = await p.evaluate(() => window.__allep.mo.looks.std === 'keep'), colsOf = (f) => D.mo.cols[f].concat(f === 'gate' && !stdKeep ? (D.mo.cols.std || []).filter((c) => c !== 'pieces' && c !== 'lacks') : []);   /* CHANGED review CR-34 */
  ok(rh.every((x) => x[2] && JSON.stringify(x[1].map((b) => b[0])) === JSON.stringify(colsOf(x[0]))) && JSON.stringify(fnRow[1]) === JSON.stringify(wantFn) && wantFn.some(([c]) => c === 'deciders') && wantFn.some(([c]) => c === 'datafns')
     && (await pinVal('deciders')) === String(R.k.deciders),
    'D-068 (L-20) · every row\'s head carries its options slot and its columns of the pinned row, in the pinned row\'s words — Functions: ' + fnRow[1].map((b) => b[1] + ' ' + b[2]).join(' · '), rh.map((x) => [x[0], x[1].map((b) => b[1] + ' ' + b[2]).join(' · ')]));
  await clk('#mogrid tbody th[data-f="fn"] .msc[data-mcol="deciders"]');
  const lit = await p.evaluate((ks) => { const K = new Set(ks), on = [...document.querySelectorAll('#mogrid .colon[data-keys]')], all = [...document.querySelectorAll('#mogrid [data-keys]')];
    return { on: on.length, onOk: on.every((e) => e.getAttribute('data-keys').split('\n').some((k) => K.has(k))), missed: all.filter((e) => !e.classList.contains('colon') && e.getAttribute('data-keys').split('\n').some((k) => K.has(k))).length,
      pin: !!document.querySelector('#pin tbody td[data-mocol] [data-col="deciders"]'), pressed: document.querySelector('#mogrid .msc[data-mcol="deciders"]').getAttribute('aria-pressed') }; }, R.ck.deciders);
  const tCh = await tipAt('#mogrid td[data-mom="work"][data-f="fn"] .mc[data-key="fn:apps/api/services/cooking.py::start_session"]');
  /* CHANGED 2026-10-03 (D-088, and the coordinator's relay of his feedback): the hover is the lab's card, and a card says nothing about the page (P2.1) — the "counted in" line of his L-20 is not on it; the footer, what a click does, closes it */
  const cntL = fillW(MW.rowh.cnt, { v: ['deciders', 'datafns', 'behind'].map((c) => D.words.cols[c].head).join(' \u00b7 ') }), footL = D.words.mo.card.foot.lit;
  ok(lit.on >= 3 && lit.onOk && !lit.missed && lit.pin && lit.pressed === 'true' && tCh && tCh.trim().endsWith(footL) && !tCh.includes(cntL.split(':')[0]),
    'D-068 (L-20) · "' + D.words.cols.deciders.head + ' ' + R.k.deciders + '" lights the ' + lit.on + ' chips that draw its members, none else, and its cell in the pinned row; start_session\'s hover is a card that ends with what a click does and no longer carries the columns that count it', { lit, tCh: (tCh || '').slice(-120) });
  await clk('#mogrid tbody th[data-f="fn"] .msc[data-mcol="deciders"]');
  /* (e) the columns */
  const colW = () => p.evaluate(() => { const cs = [...document.querySelectorAll('#mogrid colgroup col')].slice(1).map((c) => parseFloat(c.style.width)), hs = [...document.querySelectorAll('#mogrid thead th.mom')];
    return { w: Object.fromEntries(hs.map((h, i) => [h.getAttribute('data-si'), cs[i]])), moms: hs.map((h) => h.getAttribute('data-mom')), over: document.getElementById('mogrid').scrollWidth - document.getElementById('mogrid').clientWidth,
      mini: document.querySelectorAll('#mogrid th.mom.mmin').length }; });
  const siE = String(R.mo.sp.findIndex((x) => x[0] === 'edge')), c0 = await colW();
  await clk('#mogrid th.mom[data-mom="edge"]');
  const c1 = await colW(), wideP = await p.$eval('#mogrid th.mom[data-mom="edge"]', (h) => h.getAttribute('aria-pressed'));
  const brk = await p.evaluate(() => [...document.querySelectorAll('#mogrid td[data-mom="edge"] .mc .mt')].filter((t) => { const rs = t.getClientRects(); if (rs.length < 2) return false;
    const txt = t.textContent; return !/[_./\s]/.test(txt); }).length);
  ok(c1.w[siE] >= c0.w[siE] && wideP === 'true' && !brk,   /* CHANGED review F27: a column's floor already keeps each name whole; widening never narrows it */ 'D-068 (L-21) · a click on "' + MW.moms.edge.name + '" widens its column (' + c0.w[siE] + ' → ' + c1.w[siE] + ' px) until no name there breaks inside a word', { c0: c0.w[siE], c1: c1.w[siE], brk });
  await clk('#mogrid th.mom[data-mom="start"] .mohx');
  const h1 = await p.evaluate(() => ({ moms: [...document.querySelectorAll('#mogrid th.mom')].map((h) => h.getAttribute('data-mom')), strip: [...document.querySelectorAll('#mobar [data-unhide]')].map((b) => b.getAttribute('data-unhide')) }));
  ok(!h1.moms.includes('start') && JSON.stringify(h1.strip) === JSON.stringify(['f:start', '*']), 'D-068 (L-21) · its × hides "' + MW.moms.start.name + '", and the bar lists it to bring back', h1);
  await clk('#mofit');
  const f1 = await colW();
  const out1 = await outCols();
  ok(f1.over <= 1 && f1.mini >= 1 && out1.length === 1 && out1[0].includes(fillW(MW.col.cHid, { v: MW.moms.start.name })) && out1[0].includes(fillW(MW.col.cFit, { v: MW.opt.fit.opts.min.name })),   /* the section opens on fit narrowing the rest (open()) */
    'D-068 (L-21) · fit: no sideways scroll, ' + f1.mini + ' column(s) narrowed to a strip of counts; the copy text says the columns — ' + (out1[0] || ''), { over: f1.over, mini: f1.mini, out1 });
  await p.setViewportSize({ width: 1600, height: 1080 }); await p.waitForTimeout(250);
  await p.waitForFunction(() => { const G = document.getElementById('mogrid'); return G.scrollWidth - G.clientWidth <= 1; }, null, { timeout: 4000 }).catch(() => {});   /* the redraw on resize, settled */
  const rz = await colW(); await p.setViewportSize({ width: 1920, height: 1080 }); await p.waitForTimeout(250);
  await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready'); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(200);
  const rl = await colW(), rlS = await p.evaluate(() => ({ fit: document.getElementById('mofit').getAttribute('aria-pressed'), wide: document.querySelector('#mogrid th.mom[data-mom="edge"]').getAttribute('aria-pressed') }));
  ok(rz.over <= 1 && !rz.moms.includes('start') && !rl.moms.includes('start') && rl.over <= 1 && rlS.fit === 'true' && rlS.wide === 'true',
    'D-068 (L-21) · the columns keep their state through a resize and a reload (hidden, widened, fit)', { rz: [rz.over, rz.mini], rl: [rl.over, rl.mini], rlS });
  await clk('#mogrid tbody th[data-f="data"] .mro');
  const pop = await p.$$eval('#mogrid tbody th[data-f="data"] .mrop [data-hiderow]', (bs) => bs.map((b) => b.textContent));
  await clk('#mogrid tbody th[data-f="data"] [data-hiderow="data"]');
  const hr = await p.evaluate(() => ({ rows: [...document.querySelectorAll('#mogrid tbody tr[data-f]')].map((r) => r.getAttribute('data-f')), strip: [...document.querySelectorAll('#mobar [data-unhide]')].map((b) => b.getAttribute('data-unhide')) }));
  ok(JSON.stringify(pop) === JSON.stringify([MW.col.hideRow]) && !hr.rows.includes('data') && hr.strip.includes('r:data'), 'D-068 · a row\'s options slot opens its own options — "' + MW.col.hideRow + '" takes Data effects out, the bar keeps it', { pop, hr });
  await clk('#mobar .mohall'); await clk('#mofit'); await clk('#mogrid th.mom[data-mom="edge"]');
  const back = await p.evaluate(() => ({ moms: document.querySelectorAll('#mogrid th.mom').length, rows: document.querySelectorAll('#mogrid tbody tr[data-f]').length, strip: document.querySelectorAll('#mobar [data-unhide]').length }));
  const out2 = (await outCols()).length;
  const out2s = await outCols();
  ok(back.moms === band.heads && back.rows === rh.length && !back.strip && out2 === 1 && out2s[0].endsWith(': ' + MW.col.cFitOff), 'D-068 · D-081 (R-11) · show all and the width given back: the table as it opens; the one thing the copy text still names is that fit is off (on is how a table opens)', { back, out2, out2s });
  await p.evaluate(() => window.scrollTo(0, 0)); }
ok(!errs.length, 'no page error after the D-068 checks', errs);

/* 23 · D-069 (his note "API Hover Legend Consolidation", L-09 … L-18): every element says what it is — smoke checks (D-037, light):
   (a) every gate stands under the function or middleware it runs in, the rate limits under RateLimitMiddleware with the station's
       middleware glyph; a check's effect is its ending's status, with its stage lit; its label says where it decides;
   (b) every function chip wears the function glyph (a name-only one too); a function's marks: what it decides and touches;
   (c) the refresh names the hooks that fetch again and their GET; the client's branches stand under describeStartCookingError, an
       "any other status" line last; the send cell reads in tap order;
   (d) an in-flight value's face is its plain kind and its lifetime (request · server), the machine word gone; the row wears its own
       mark; Standard or specialist split into the gates (my pick): no row of its own, its rare pieces a label on what they name;
   (e) the options: one chain per gate puts the host in the chip; keeping the row brings Standard or specialist back */
{ const E = 'POST /cooking/sessions', MW = D.words.mo, C1 = MW.x.c1;
  const clk = async (sel) => { await p.$eval(sel, (e) => e.scrollIntoView({ block: 'center' })); await p.click(sel); await p.waitForTimeout(130); };
  const setLook = async (st) => { await p.evaluate((st) => { const A = window.__allep; Object.assign(A.mo.looks, st); localStorage.setItem(A.mo.key, JSON.stringify(A.mo.looks)); }, st);
    await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 20000 });   /* the looks are read at load (open() would clear them) */
    await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + E + '"] td.id'); await p.waitForTimeout(200); };
  /* CHANGED 2026-09-30 (D-070): (d) reads the in-flight chips' own face — the chips look (a lifeline each is the default now) */
  await setLook({ gdl: 'head', gef: 'end', gic: 'each', grl: 'where', fnm: 'on', std: 'split', ifl: 'chips' });
  const g = await p.evaluate(() => { const T = document.querySelector('#mogrid'), gates = [...T.querySelectorAll('td[data-f="gate"] .mc')];
    return { n: gates.length, orphan: gates.filter((c) => !c.closest('.mgb') && !/^fn:/.test(c.getAttribute('data-keys') || '')).map((c) => c.getAttribute('data-keys')),
      rl: [...T.querySelectorAll('td[data-mom="edge"][data-f="gate"] .mgb > .mgh [data-key]')].map((h) => [h.getAttribute('data-key'), (h.querySelector('.skg') || { getAttribute: () => null }).getAttribute('data-sk')]),
      key: (() => { const c = gates.find((x) => /^guard:/.test(x.getAttribute('data-keys') || '') && x.querySelector('.mt').textContent === 'key is None'); return c ? [[...c.querySelectorAll('.vc-status')].map((v) => v.textContent),
        (c.querySelector('.mef .spine i.on') ? [...c.querySelectorAll('.mef .spine i')].indexOf(c.querySelector('.mef .spine i.on')) : -1), (c.querySelector('.vc-gdl') || {}).textContent] : null; })() }; });
  ok(g.n > 10 && !g.orphan.length && g.rl.length === 1 && g.rl[0][0] === 'middleware:RateLimitMiddleware' && g.rl[0][1] === 'middleware'
     && g.key && g.key[0].join() === '400' && g.key[1] === D.orders.stageRows.filter((q) => D.orders.kinds[q] !== 'screen').indexOf('HANDLER') && g.key[2] === D.words.enc.fam.gdl.vals.own.name,
    'D-069 (a) · ' + E + ': every one of its ' + g.n + ' gates stands under the function it runs in (the login check is its own); the rate limits under RateLimitMiddleware, the station\'s middleware glyph; "key is None" → 400, HANDLER lit, "' + D.words.enc.fam.gdl.vals.own.name + '"', g);
  const f = await p.evaluate(() => { const cs = [...document.querySelectorAll('#mogrid td[data-f="fn"] .mc')];
    const one = (n) => cs.find((c) => ((c.querySelector('.mt') || {}).textContent || '') === n);
    return { bare: cs.filter((c) => !c.querySelector('.skg')).map((c) => c.textContent.slice(0, 40)), n: cs.length,
      snap: (one('load_resolution_snapshot') || { querySelector: () => null }).querySelector('.sksub') ? one('load_resolution_snapshot').querySelector('.sksub').textContent : null,
      handler: one('post_start_session') ? [...one('post_start_session').querySelectorAll('.mfm .vc-status')].map((v) => v.textContent) : null,
      rw: (() => { const v = document.querySelector('#mogrid td[data-f="data"] .vc.jdrw'); return v ? getComputedStyle(v).backgroundColor : null; })() }; });
  ok(f.n > 20 && !f.bare.length && f.snap === 'accessor' && JSON.stringify(f.handler) === JSON.stringify(['400', '403', '404', '409']) && f.rw && !/rgba\(0, 0, 0, 0\)|transparent/.test(f.rw),
    'D-069 (b) · every one of the ' + f.n + ' function chips wears the function glyph; load_resolution_snapshot is an accessor (its own reads); post_start_session shows the statuses it decides; the R and W letters wear their colour', f);
  const c = await p.evaluate(() => { const T = document.querySelector('#mogrid');
    const rf = [...T.querySelectorAll('td[data-mom="after"][data-f="client"] .mc .mrf [data-key]')].map((k) => k.getAttribute('data-key'));
    const blk = T.querySelector('td[data-mom="after"][data-f="client"] .mgb'), send = [...T.querySelectorAll('td[data-mom="send"][data-f="client"] .mcs > .mc')].map((x) => (x.getAttribute('data-keys') || '').split('#').pop());
    return { rf, head: blk ? blk.querySelector('.mgh').textContent : null, lines: blk ? [...blk.querySelectorAll(':scope > .mc')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()) : [], send }; });
  ok(c.rf.some((k) => /#useActiveCooking$/.test(k)) && c.rf.includes('endpoint:GET /cooking/active') && c.rf.includes('endpoint:GET /cooking/reminders/due')
     && c.head && c.head.includes('describeStartCookingError') && c.lines.length === 4 && c.lines.every((l, i) => i === 3 ? l.startsWith(C1.any) : l.startsWith(C1.reads))
     && JSON.stringify(c.send) === JSON.stringify(['RecipeBrowseContainer', 'useCookingLoopActions', 'useStartCooking']),
    'D-069 (c) · the refresh names useActiveCooking → GET /cooking/active and useRemindersDue → GET /cooking/reminders/due; the branches stand under describeStartCookingError, each read by its verb, "' + C1.any + '" last; the send chain reads screen → hook on the way → the hook that sends', c);
  const i = await p.evaluate(() => { const cs = [...document.querySelectorAll('#mogrid td[data-f="inf"] .mc')];
    return { life: cs.map((x) => x.getAttribute('data-life')), machine: cs.filter((x) => /dependency-value|setting-once|built-once/.test(x.textContent)).length,
      mark: (() => { const bm = document.querySelector('#mogrid tbody th[data-f="inf"] .bm'); return bm ? [bm.getAttribute('data-icon'), bm.getAttribute('data-pick')] : null; })(),
      rows: [...document.querySelectorAll('#mogrid tbody tr[data-f]')].map((r) => r.getAttribute('data-f')), ra: [...document.querySelectorAll('#mogrid .mc .mra[data-key]')].map((x) => x.getAttribute('data-key')) }; });
  const rr = ROW[E];
  ok(i.life.filter((l) => l === 'srv').length === rr.k.inf_server && i.life.filter((l) => l === 'req').length === rr.k.inf_answer && !i.machine && i.mark && i.mark[0] === 'pg:hourglass' && i.mark[1] === 'true'
     && !i.rows.includes('std') && ['piece:repeat:key', 'piece:status:403', 'piece:repeat:idiom:get-or-create'].every((k) => i.ra.includes(k)),
    'D-069 (d) · the in-flight values wear their lifetime (' + rr.k.inf_answer + ' request · ' + rr.k.inf_server + ' server), no machine word; the row\'s hourglass, my pick (dashed); Standard or specialist split into the rows: no row, its 3 rare pieces a label on what they name', i);
  await setLook({ gdl: 'chain', std: 'keep' });
  const o = await p.evaluate(() => ({ host: [...document.querySelectorAll('#mogrid td[data-f="gate"] .mc')].filter((x) => x.querySelector('.mgh0[data-key]')).length,
    groups: document.querySelectorAll('#mogrid td[data-f="gate"] .mgb').length, rows: [...document.querySelectorAll('#mogrid tbody tr[data-f]')].map((r) => r.getAttribute('data-f')),
    lanes: [...document.querySelectorAll('#mogrid td[data-f="std"] .mlane')].map((x) => x.textContent), secSw: document.querySelectorAll('#mogrid td[data-f="sec"] .mc[data-ik="switch"]').length }));
  /* CHANGED 2026-10-02 (D-084): the two switches that turn a check on (rate limiting, the token checker) have their home in the Security row, whatever this
     option says; this endpoint has no other switch, so the row's "set by settings" lane is empty and not drawn — its rare pieces stand in their lane */
  ok(o.host > 10 && !o.groups && o.rows.includes('std') && !o.lanes.includes(C1.set) && o.lanes.includes(C1.rareHere) && o.secSw === 2,
    'D-069 (e) · "' + MW.opt.gdl.opts.chain.name + '" puts the function in each gate chip; "' + MW.opt.std.opts.keep.name + '" brings the row back, in its lane of rare pieces (its two switches stand in Security, D-084)', o);
  const qt = await (async () => { const h = await p.$('#mogrid tbody th[data-f="std"] .mbn'); if (!h) return ''; await h.evaluate((x) => x.scrollIntoView({ block: 'center' })); const bx = await h.boundingBox();
    await p.mouse.move(bx.x + 4, bx.y + bx.height / 2); await p.waitForTimeout(90); const t = await tipTxt(); await p.mouse.move(5, 5); return t; })();
  ok(qt.includes(MW.rowq.std), 'D-069 (e) · the row\'s head says the question it answers', qt.slice(0, 160));
  await setLook({ gdl: MW.opt.gdl.pick, gef: MW.opt.gef.pick, gic: MW.opt.gic.pick, grl: MW.opt.grl.pick, fnm: MW.opt.fnm.pick, std: MW.opt.std.pick, ifl: MW.opt.ifl.pick });
  await p.evaluate(() => window.scrollTo(0, 0)); }
ok(!errs.length, 'no page error after the D-069 checks', errs);

/* 24 · D-070 (his note "API Hover Legend Consolidation", L-12 · L-17): the relations across the moments — smoke checks (D-037, light):
   (a) Data effects' map, my pick, opens under its row: a link per function → table the generator records, green reads and orange
       writes, start_session → cooking_sessions a read then a write with the race's 500 on it, the commits naming who commits;
   (b) the in-flight lanes, my pick: the seven rate-limit values fold into "rate limiter · 7", which opens; ctx is read at the checks and
       can end the request with 409; the Idempotency-Key is read there with its 400 and claims cooking_sessions in the work;
   (c) a picked path: the 409 at the checks leaves before the key is read (no 400 dot) and before the work (its links dim);
   (d) the other looks: echoes where a value is read; a small map in each cell that holds data effects */
{ const E = 'POST /cooking/sessions', R = ROW[E], MW = D.words.mo, C2 = MW.x.c2, MK = D.mo.keys, OP = D.enc.op;
  const setLook = async (st) => { await p.evaluate((st) => { const A = window.__allep; Object.assign(A.mo.looks, st); localStorage.setItem(A.mo.key, JSON.stringify(A.mo.looks)); }, st);
    await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 20000 });
    await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + E + '"] td.id'); await p.waitForTimeout(250); };
  await setLook({ dfx: 'one', ifl: MW.opt.ifl.pick, lay: MW.opt.lay.pick, cell: MW.opt.cell.pick });   /* D-081: a small map per moment is how it opens; one map for the endpoint is the other look */
  const dx = R.mo.dx, sc = dx.l.findIndex((q) => MK[dx.f[q[0]]] === 'fn:apps/api/services/cooking.py::start_session' && MK[dx.t[q[1]]] === 'table:cooking_sessions');
  const a = await p.evaluate((sc) => { const tr = document.querySelector('#mogrid tbody tr[data-f="data"]'), nx = tr && tr.nextElementSibling;
    const w = nx && nx.querySelector('.mdx'), gs = w ? [...w.querySelectorAll('svg.mdxs g.mdxk[data-j]')] : [];
    const g0 = gs.find((g) => w._dx.L[+g.getAttribute('data-j')].li === sc);
    return { under: !!(nx && nx.classList.contains('mdxr')), links: gs.length, strokes: gs.flatMap((g) => [...g.querySelectorAll('.mdxst')].map((x) => x.getAttribute('data-op') + '|' + x.getAttribute('stroke'))),
      sc: g0 ? [...g0.querySelectorAll('.mdxst')].map((x) => x.getAttribute('data-op')) : null, race: w ? [...w.querySelectorAll('.mdxrc .vc-status')].map((x) => x.textContent) : [],
      rules: w ? [...w.querySelectorAll('.mdxru')].map((x) => [x.getAttribute('data-op'), (x.querySelector('.mdxrf') || {}).getAttribute('data-key')]) : [],
      bands: w ? [...w.querySelectorAll('.mdxb')].map((b) => +b.getAttribute('data-si')) : [] }; }, sc);
  ok(MW.opt.dfx.opts.one && MW.opt.dfx.pick === 'cell' && MW.opt.dfx.ruled === 'D-081' && a.under && a.links === dx.l.length && a.links > 10 && a.strokes.every((x) => x === 'r|' + OP.r.col || x === 'w|' + OP.w.col)
     && JSON.stringify(a.sc) === JSON.stringify(['r', 'w']) && JSON.stringify(a.race) === JSON.stringify(['500', '500']) && JSON.stringify(a.bands) === JSON.stringify(dx.b)
     && a.rules.some((q) => q[0] === 'commit' && q[1] === 'fn:apps/api/api/cooking.py::post_start_session') && a.rules.some((q) => q[0] === 'commit' && q[1] === 'fn:apps/api/auth/context.py::build_auth_context'),
    'D-070 (a) · ' + E + ': the map (his other look) opens under Data effects — ' + a.links + ' links, green reads, orange writes; start_session → cooking_sessions reads then writes, the race\'s 500 on it and on the login\'s first add of a user (review N3-18); a commit rule names post_start_session and build_auth_context', a);
  const b = await p.evaluate(() => { const T = document.querySelector('#mogrid'), fold = T.querySelector('.milf[data-fold]');
    const dotsOf = (k) => [...T.querySelectorAll('td.milc .mil[data-k="' + k + '"] .mild')].map((d) => [d.closest('td').getAttribute('data-mom'), [...d.querySelectorAll('.vc-status')].map((x) => x.textContent).join(','), !!d.querySelector('.milcl[data-key="table:cooking_sessions"]')]);
    const kOf = (n) => { const c = [...T.querySelectorAll('td.milc .mil > .mc[data-key]')].find((x) => x.getAttribute('data-key').includes('|' + n + '|')); return c ? c.closest('.mil').getAttribute('data-k') : null; };
    return { fold: fold ? [fold.textContent.replace(/\s+/g, ' ').trim(), fold.getAttribute('data-keys').split('\n').length] : null, ctx: dotsOf(kOf('ctx')), key: dotsOf(kOf('idempotency_key')),
      caps: [...T.querySelectorAll('td.milc .milx-cap')].map((x) => x.closest('td').getAttribute('data-mom')), keep: T.querySelectorAll('td.milc .milx-keep').length }; });
  ok(MW.opt.ifl.pick === 'lane' && b.fold && b.fold[0].includes(C2.il.lim) && b.fold[1] === 7 && JSON.stringify(b.ctx[0]) === JSON.stringify(['checks', '409', false])
     && JSON.stringify(b.key[0]) === JSON.stringify(['checks', '400', false]) && b.key.some((d) => d[0] === 'work' && d[2]) && b.caps.length === 3 && b.caps.every((m) => m === 'answer') && b.keep === 1,
    'D-070 (b) · the lanes (my pick): "' + (b.fold || [''])[0] + '" folds ' + (b.fold || [0, 0])[1] + ' values the server keeps (an arrow past the end); ctx is read at the checks → 409; the key → 400, then claims cooking_sessions in the work; the request values end at the answer', b);
  await p.$eval('#mogrid .milf[data-fold]', (e) => e.scrollIntoView({ block: 'center' })); await p.click('#mogrid .milf[data-fold]'); await p.waitForTimeout(150);
  const o = await p.evaluate(() => ({ head: !!document.querySelector('#mogrid .milh[data-fold]'), lanes: document.querySelectorAll('#mogrid td.milc[data-mom="start"] .mil > .mc[data-key^="inflight:"]').length }));
  ok(o.head && o.lanes === 7, 'D-070 (b) · the fold opens: its header, then its ' + o.lanes + ' values a lane each', o);
  const i409 = R.mo.ex.findIndex((x) => x[1] === 409 && x[3] === R.mo.sp.findIndex((q) => q[0] === 'checks'));
  await p.$eval('#mobar .mopath[data-path="' + i409 + '"]', (e) => e.scrollIntoView({ block: 'center' })); await p.click('#mobar .mopath[data-path="' + i409 + '"]'); await p.waitForTimeout(200);
  const c = await p.evaluate(() => { const T = document.querySelector('#mogrid'), w = T.querySelector('tr.mdxr .mdx');
    const workSi = [...w.querySelectorAll('.mdxb')].find((b) => b.querySelector('.mdxbl') && b.getAttribute('data-si') === String(window.__allep.data.rows.find((r) => r.id === 'POST /cooking/sessions').mo.sp.findIndex((q) => q[0] === 'work')));
    return { st400: [...T.querySelectorAll('td.milc .mild .vc-status')].map((x) => x.textContent), workOff: workSi ? [...workSi.querySelectorAll('.mdxn')].every((n) => n.classList.contains('off')) : null,
      depOn: [...w.querySelectorAll('svg.mdxs g.mdxk:not(.off)')].length }; });
  ok(i409 >= 0 && !c.st400.includes('400') && c.st400.includes('409') && c.workOff === true && c.depOn > 0,
    'D-070 (c) · on the path to the 409 at the checks: no read of the key (it leaves at cooking.py:125, the key is read at :126); the work\'s functions and tables dim, the dependencies\' links stay', c);
  await setLook({ dfx: 'cell', ifl: 'echo' });
  const d = await p.evaluate(() => ({ echo: [...document.querySelectorAll('#mogrid td[data-f="inf"] .mc.mie')].map((x) => x.closest('td').getAttribute('data-mom') + ':' + [...x.querySelectorAll('.vc-status')].map((v) => v.textContent).join(',')),
    mini: [...document.querySelectorAll('#mogrid td[data-f="data"] .mdx.mdxm')].map((x) => x.closest('td').getAttribute('data-mom')), under: document.querySelectorAll('#mogrid tr.mdxr').length }));
  ok(d.echo.includes('checks:400') && d.echo.includes('checks:409') && d.mini.length === dx.b.length && !d.under,
    'D-070 (d) · "' + MW.opt.ifl.opts.echo.name + '": an echo where each value is read (' + d.echo.length + '); "' + MW.opt.dfx.opts.cell.name + '": a small map in each of the ' + d.mini.length + ' cells, none under the row', d);
  await setLook({ dfx: MW.opt.dfx.pick, ifl: MW.opt.ifl.pick });
  await p.evaluate(() => window.scrollTo(0, 0)); }
ok(!errs.length, 'no page error after the D-070 checks', errs);

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

/* 8 · D-071 · THE EXAMPLES BENCH (his L-23 · L-08 · L-13 · L-11) — smoke checks (D-037): the fixture's in-flight column says absent;
   then on the page: eight columns in his order between ONE ENDPOINT and BY MOMENT, each drawing a block; the table's copy line carries his
   DATA line's block segment word for word; a real drag moves a part in the drawn block and in the copy line; a part dragged into "not drawn"
   leaves the block; the gate column's role filter narrows its list; C267's test block names 201 and the two headers it sends and opens
   on the ordered chain; ONE hover per block, in → does → out; the page's copy text carries one line per kind */
{ const WX = D.words.ex, EXD = D.ex, CX = '#exgrid .excol';
  /* the fixture still open from section 7: its in-flight arm is off, so the column says absent and draws no block */
  const fx8 = await p.evaluate((a) => { const c = document.querySelector('#exgrid .excol[data-k="inf"]'); return c ? { say: (c.querySelector('.exnone') || {}).textContent || '', blk: !!c.querySelector('.blk') } : null; }, null);
  ok(fx8 && !fx8.blk && fx8.say.startsWith(D.words.absent), 'D-071 · on the arms-off fixture the in-flight column says absent and draws no block', fx8);
  await open(PAGE); await p.click('#board tr.row[data-ep="POST /cooking/sessions"] td.id'); await p.waitForTimeout(200);
  await p.$eval('#sec-ex', (e) => e.scrollIntoView({ block: 'start' })); await p.waitForTimeout(80);
  const c8 = await p.evaluate(() => [...document.querySelectorAll('#exgrid .excol')].map((c) => [c.getAttribute('data-k'), !!c.querySelector('.blk'), (c.querySelector('.exline') || {}).textContent || '']));
  ok(JSON.stringify(c8.map((x) => x[0])) === JSON.stringify(['end', 'table', 'schema', 'fn', 'test', 'gate', 'hook', 'inf']) && JSON.stringify(EXD.kinds) === JSON.stringify(c8.map((x) => x[0])),
    'D-071 · eight columns across the page in his order: ending · table · schema · function · test · gate or decision · client hook · in-flight', c8.map((x) => x[0]));
  ok(c8.every((x) => x[1] && x[2].startsWith(WX.copy.where + ' · ')), 'D-071 · every column draws its example as a block, with its copy line under it', c8.filter((x) => !x[1]).map((x) => x[0]));
  const tl = c8[1][2];
  ok(tl.includes(' · ' + EXD.his + ' · ') && tl.endsWith('(' + WX.whose.his.name + ', ' + WX.look.table.ruled + ')') && EXD.his.startsWith('block block (icon on model, chip on, name on, entity both, count badge, model both) · edge left solid 2px'),
    'D-071 · the table boots on his DATA line: its copy line carries the block segment he pasted, word for word, and says whose it is', tl);
  const tb0 = await p.evaluate(() => [...document.querySelectorAll('#exgrid .excol[data-k="table"] .blk .bkln')].map((l) => [...l.querySelectorAll(':scope > .bkcol.l > [data-part]')].map((n) => n.getAttribute('data-part')).join(' ') + ' | ' + [...l.querySelectorAll(':scope > .bkcol.r > [data-part]')].map((n) => n.getAttribute('data-part')).join(' ')));
  ok(JSON.stringify(tb0) === JSON.stringify(['icon name | ', 'ent | count rw', 'model | ']), 'D-071 · the table block draws its parts on his three lines', tb0);
  /* a real drag: the channel chip from line 2's right side to line 1's right side */
  /* CHANGED 2026-10-02 (L-36, D-081): the parts' zones are always on the page — no fold to open */
  await p.dragAndDrop(CX + '[data-k="table"] .exz[data-line="1"][data-side="r"] .expc[data-part="rw"]', CX + '[data-k="table"] .exz[data-line="0"][data-side="r"]'); await p.waitForTimeout(120);
  const dr = await p.evaluate(() => ({ l1: [...document.querySelectorAll('#exgrid .excol[data-k="table"] .blk .bkln:first-child [data-part]')].map((n) => n.getAttribute('data-part')),
    cp: document.querySelector('#exgrid .excol[data-k="table"] .exline').textContent }));
  ok(dr.l1.join(' ') === 'icon name rw' && dr.cp.includes(' · lines icon name | rw / ent | count / model | — · ') && dr.cp.endsWith('(' + D.words.copy.his + ')'),
    'D-071 · dragging the channel chip to line 1 moves it in the drawn block and in the copy line, which now says the look is his choice', dr);
  await p.evaluate(() => window.__allepEx.move('table', 'model', 'off')); await p.waitForTimeout(80);
  const off = await p.evaluate(() => ({ drawn: !!document.querySelector('#exgrid .excol[data-k="table"] .blk [data-part="model"]'), tray: [...document.querySelectorAll('#exgrid .excol[data-k="table"] .exz.exoff .expc')].map((n) => n.getAttribute('data-part')),
    cp: document.querySelector('#exgrid .excol[data-k="table"] .exline').textContent }));
  ok(!off.drawn && off.tray.join() === 'model' && off.cp.includes(', model off)') && off.cp.includes(' · ' + WX.ctl.tray + ' model '), 'D-071 · a part dragged into not drawn leaves the block, and the copy line says so', off);
  await p.click(CX + '[data-k="table"] .exreset'); await p.waitForTimeout(80);
  ok((await p.$eval(CX + '[data-k="table"] .exline', (e) => e.textContent)).includes(' · ' + EXD.his + ' · '), 'D-071 · back to the default puts the table on his DATA line again');
  /* EX-4 · the gate column's role filter narrows its list */
  const g0 = await p.$$eval(CX + '[data-k="gate"] .exselect option', (o) => o.length);
  await p.click(CX + '[data-k="gate"] .exrc[data-role="rule"]'); await p.waitForTimeout(80);
  const g1 = await p.evaluate(() => ({ n: document.querySelectorAll('#exgrid .excol[data-k="gate"] .exselect option').length, roles: window.__allepEx.items('gate').map((x) => x.role) }));
  const nRule = (D.rows.find((r) => r.id === 'POST /cooking/sessions').ex.gate || []).filter((e) => e[1] === 'rule').length;
  ok(g1.n === nRule && nRule > 0 && g1.n < g0 && g1.roles.every((r) => r === 'rule'), 'D-071 · EX-4 · a role chip narrows the gate column to that role (' + nRule + ' field rules of ' + g0 + ')', { g0, g1 });
  await p.click(CX + '[data-k="gate"] .exrc[data-role="rule"]'); await p.waitForTimeout(60);
  /* EX-3 · C267: the face names what it proves and the headers it sends; the click opens the ordered chain */
  await p.selectOption(CX + '[data-k="test"] .exselect', 'case:C267'); await p.waitForTimeout(100);
  const t8 = await p.$eval(CX + '[data-k="test"] .blk .bkhd', (e) => e.innerText);
  ok(/\b201\b/.test(t8) && t8.includes('Authorization') && t8.includes('Idempotency-Key') && t8.includes('C267'), 'D-071 · EX-3 · C267\'s block names the case, the 201 it proves and the two headers it sends', t8);
  await p.click(CX + '[data-k="test"] .blk .bkhd'); await p.waitForTimeout(100);
  const ch8 = await p.$eval(CX + '[data-k="test"] .exfl', (e) => e.innerText);
  const CH = WX.chain, order = [CH.request, CH.checks, CH.fns, CH.tables, CH.ending].map((w) => ch8.indexOf(w));
  ok(order.every((i, j) => i >= 0 && (!j || i > order[j - 1])) && ch8.toLowerCase().includes(WX.notKnown.title)
     && ch8.includes('Authorization') && ch8.includes(WX.notKnown.which.replace('{n}', '2').replace('{status}', '201')),
    'D-071 · EX-3 · the open block reads in order: the request → the checks it passes → the functions → the tables → the ending, and says what the test does not tell (which of the 2 ways to 201)', order);
  /* N3-13 · CR-08: the checks it passes include those inside a call (require_household's, on both ways), each said by what it checks,
     the refusal it avoided after it — and the two limits are told apart */
  ok(ch8.includes('setup required') && ch8.includes(WX.chain.lim.replace('{name}', 'sensitive').replace('{n}', '20').replace('{w}', '60'))
     && ch8.includes(WX.chain.lim.replace('{name}', 'global').replace('{n}', '120').replace('{w}', '60')) && ch8.includes(WX.chain['else'].replace('{v}', '429')),
    'review N3-13 · CR-08 · the checks a test passes name what they check (each limit apart), a check inside a call among them, the refusal avoided after it');
  /* ONE hover per block (L-02 · L-22): nothing inside the title lines carries a hover of its own; the card reads in BY MOMENT's three
     parts — before · checks · gives (CHANGED 2026-09-30, review S4-20: the bench's own in · does · out labels are gone) */
  /* CHANGED 2026-10-03 (D-089): the ending's block has hover REGIONS — its glyph, its status, its where line and each mark of its strip carry a hover of their own (data-tip="exreg", tagged by the part's declared region, section 37);
     every other node of a title line, and every other kind's block, still carries none */
  const inner = await p.$$eval('#exgrid .blk .bkhd [data-tip]:not([data-tip="exreg"])', (n) => n.length), IOP = D.words.mo.io.parts;
  await p.hover(CX + '[data-k="table"] .blk .bkhd [data-part="name"]'); await p.waitForTimeout(120);
  const tp = await p.$eval('#tip', (e) => ({ show: e.getAttribute('data-show'), io: [...e.querySelectorAll('.io > i')].map((i) => i.textContent), txt: e.innerText }));
  /* CHANGED 2026-10-03 (D-088): the table's functions are rows of its checks (each function with its R or W), so the table's card has no "before" part — its parts are the generator's, in order, and a part with nothing to say is not drawn */
  ok(!inner && tp.show === 'true' && JSON.stringify(tp.io) === JSON.stringify([IOP.c, IOP.g]), 'D-071 · one hover per block, reading its parts in BY MOMENT\'s order (checks → gives for a table: its functions are its checks)', { inner, tp });
  ok(tp.txt.includes('household_id, idempotency_key') && tp.txt.includes('500'), 'review S4-21 · the table\'s race is BY MOMENT\'s sentence, filled with its unique key and the ending it escapes to', tp.txt.slice(0, 300));
  await p.mouse.move(0, 0); await p.waitForTimeout(60);
  /* the page's copy text: the bench's two options, then one line per kind, after BY MOMENT's (CHANGED 2026-09-30, review S4-06) */
  const cp8 = (await p.$eval('#out', (e) => e.value)).split('\n').filter((l) => l.startsWith(WX.copy.where + ' · '));
  ok(cp8.length === 10 && cp8[3] === (await p.$eval(CX + '[data-k="table"] .exline', (e) => e.textContent)), 'D-071 · the page\'s copy text carries each example\'s line, the table\'s as its column shows it', cp8.length);
  /* review smoke (D-037): N3-07 · CR-16 · F26 no twin faces in any column's list, the login check is its function; N3-24 the functions
     are BY MOMENT's members; N3-19 the commit is the handler's; N3-14 a test that only checks while setting up proves nothing; CR-25 a
     badge names its unit; CR-26 no title text overflows its part; CR-27 in-flight kinds in BY MOMENT's words; S4-04 · S4-30 dashed only
     for a pick; S4-33 the controls carry no hover of their own */
  const sm = await p.evaluate(() => { const X = window.__allepEx, D0 = window.__allep.data, cat = D0.ex.cat, out = {};
    out.twins = ['end', 'table', 'schema', 'fn', 'test', 'gate', 'hook', 'inf'].map((k) => { const o = [...document.querySelectorAll('#exgrid .excol[data-k="' + k + '"] .exselect option')].map((x) => x.textContent); return [k, o.length - new Set(o).size]; }).filter((q) => q[1]);
    out.login = X.items('gate').filter((it) => it.role === 'login').map((it) => cat[it.id].n);
    const fns = X.items('fn').map((it) => cat[it.id].n); out.fns = ['get_idempotency_key', 'load_resolution_snapshot', 'derive_restrictions'].filter((n) => fns.indexOf(n) < 0);
    out.commit = X.items('fn').filter((it) => cat[it.id].commits).map((it) => cat[it.id].n); out.commitK = X.items('fn').map((it) => [it.id.replace(/^fn:/, ''), !!cat[it.id].commits]);
    X.pick('test', 'case:C250'); out.c250 = !!document.querySelector('#exgrid .excol[data-k="test"] .blk [data-part="proves"]');
    out.badges = [...document.querySelectorAll('#exgrid .blk .bkn.badge')].map((b) => b.textContent).filter((t) => /^\d+$/.test(t.trim()));
    out.cut = [...document.querySelectorAll('#exgrid .blk .bkhd [data-part]')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.getAttribute('data-part') + ':' + e.textContent.slice(0, 30));
    const ifk = D0.words.enc.fam.ifk.vals; out.ifk = [...document.querySelectorAll('#exgrid .excol[data-k="inf"] .exrc[data-role]')].map((b) => b.getAttribute('data-role')).filter((r) => r && ifk[r] && b0(r));
    function b0(r) { const b = document.querySelector('#exgrid .excol[data-k="inf"] .exrc[data-role="' + r + '"]'); return !b.textContent.startsWith(ifk[r].name + ' '); }
    out.dash = [getComputedStyle(document.querySelector('#exgrid .exwho[data-whose="lab"]')).borderTopStyle];
    const ctls = [...document.querySelectorAll('#exgrid .exreset, #exgrid .excopy, #exgrid .exscope .opt, #exgrid .exwidth .opt, #exgrid .exstep')];   /* L-36: each icon's hover is a verb and its object */
    out.ctls = ctls.length; out.tips = ctls.filter((c) => c.getAttribute('data-tip') === 'exctl' && c.getAttribute('data-verb') && c.getAttribute('data-obj') && c.getAttribute('aria-label') === c.getAttribute('data-verb') + ' ' + c.getAttribute('data-obj')).length;
    out.folds = document.querySelectorAll('#exgrid .exctl .exfold, #exgrid .exctl [aria-expanded], #exgrid .exctl details').length;
    return out; });
  ok(!sm.twins.length && JSON.stringify(sm.login) === JSON.stringify(['get_auth_context']), 'review N3-07 · CR-16 · F26 · no two items of one column wear the same face; the login check is its dependency function', sm);
  const CF = new Set(Object.values(FJ.steps || {}).filter((s) => s.op === 'commit').map((s) => s.fn));   /* this probe's own reading of the feed */
  ok(!sm.fns.length && sm.commit.includes('post_start_session') && !sm.commit.includes('start_session') && sm.commitK.every(([q, c]) => c === CF.has(q)),
    'review N3-24 · N3-19 · the function list holds BY MOMENT\'s members; a function commits exactly when the feed\'s steps give it a commit (the handler, not start_session)', sm);
  ok(!sm.c250 && !sm.badges.length && !sm.cut.length && !sm.ifk.length && sm.dash[0] === 'dashed' && sm.ctls > 40 && sm.tips === sm.ctls && !sm.folds,
    'review N3-14 · CR-25 · CR-26 · CR-27 · S4-04 · S4-33 · C250 proves nothing here; badges name their unit; no title text cut; in-flight kinds in BY MOMENT\'s words; the lab\'s look dashed; every icon control a verb and its object, no fold', sm);
  /* S4-16 · S4-20: BY MOMENT's gate icons and hovers options decide the bench's too */
  /* the option's own state, then the bench drawn again (a gate row's looks sit in that row's legend, not always on the page) */
  const moClick = (g, v) => p.evaluate(([g, v]) => { window.__allep.mo.looks[g] = v; window.__allepEx.render(); }, [g, v]);
  await moClick('gic', 'none'); await p.waitForTimeout(120);
  const gic = await p.evaluate(() => !!document.querySelector('#exgrid .excol[data-k="gate"] .blk [data-part="icon"]'));
  await moClick('gic', 'each'); await moClick('ipo', 'sent'); await p.waitForTimeout(120);
  await p.$eval('#sec-ex', (e) => e.scrollIntoView({ block: 'start' })); await p.hover(CX + '[data-k="fn"] .blk .bkhd [data-part="name"]'); await p.waitForTimeout(120);
  const sent = await p.$eval('#tip', (e) => !!e.querySelector('.iosent') && !e.querySelector('.io > i'));
  await p.mouse.move(0, 0); await moClick('ipo', 'lines'); await p.waitForTimeout(80);
  ok(!gic && sent, 'review S4-16 · S4-20 · BY MOMENT\'s gate icons option takes the bench\'s gate glyph away; its one-sentence hovers reach the bench', { gic, sent });
  /* the layout options: my pick dashed; wrapped rows wraps */
  const ly0 = await p.evaluate(() => [document.getElementById('exgrid').getAttribute('data-lay'), document.querySelectorAll('#exgrid > .exrow').length, document.querySelector('#exbar .opt[data-xopt="lay"][data-v="half"]').getAttribute('data-ruled'),
    document.querySelectorAll('#exbar .opt[data-pick]').length, document.querySelector('#exbar .opt[data-xopt="follow"][data-v="on"]').getAttribute('data-ruled')]);
  await p.click('#exbar .opt[data-xopt="lay"][data-v="wrap"]'); await p.waitForTimeout(80);
  const ly = await p.evaluate(() => [document.getElementById('exgrid').getAttribute('data-lay'), document.querySelectorAll('#exgrid > .excol').length]);
  ok(ly0[0] === 'half' && ly0[1] === 2 && ly0[2] === 'true' && !ly0[3] && ly0[4] === 'true' && ly[0] === 'wrap' && ly[1] === 8, 'D-071 · D-081 · the column layouts are options, an upper and a lower row his ruling (no dash), and so is following a click; wrapped rows wraps', { ly0, ly });
  await p.click('#exbar .opt[data-xopt="lay"][data-v="half"]'); await p.waitForTimeout(60);
  ok(!errs.length, 'D-071 · no page error on the examples bench', errs); }

/* 30 · ROUND-1 REVIEW, lane F1a (2026-09-30) — the page said things the code does not do; each fix, smoke-checked on the page data and once on screen */
{ const PS = ROW['POST /cooking/sessions'], GR = ROW['GET /recipes'], MK = D.mo.keys;
  const els = (r, f) => r.mo.el.filter((x) => x[0] === f), io = (x) => (x[7] || {}).io || { h: [], b: [], c: [], g: [] }, has = (x, part, k) => io(x)[part].some((l) => l[0] === k);
  const at404 = els(PS, 'proof').filter((x) => x[4] && x[4][0] === 'status' && x[4][1] === 404).map((x) => x[3]);
  ok(JSON.stringify(at404) === JSON.stringify(['C221']), 'F1a · N3-01 · POST /cooking/sessions: the 404 is proven from the service side by C221 alone — the tests that raise the same error in other functions are not joined here', at404);
  const c237 = els(PS, 'proof').filter((x) => x[3] === 'C237');
  ok(c237.length && c237.every((x) => has(x, 'b', 'sendsFix') && (x[7] || {}).am === 4) && c237.every((x) => !has(x, 'b', 'sendsNone')), 'F1a · N3-02 · F03 · C237 sends the headers a fixture sets (never "no headers") and FITS its endings, 4 of them', c237.map((x) => (x[7] || {}).hn));
  const cells = {}; els(GR, 'proof').filter((x) => (x[7] || {}).am).forEach((x) => { const k = x[3] + '@' + x[1]; cells[k] = (cells[k] || 0) + 1; });
  ok(Object.values(cells).length && Object.values(cells).every((n) => n === 1), 'F1a · F03 · N3-17 · GET /recipes: a test that fits several endings stands once in each cell, however many endings it fits there', cells);
  const fn = (r, n) => els(r, 'fn').find((x) => x[3] === n);
  ok(has(fn(PS, 'assert_recipe_allergen_safe'), 'g', 'rzCaught') && has(fn(PS, '_get_firebase_app'), 'g', 'rzCaught') && PS.v.deciders === 4,
    'F1a · F04 · N3-26 · a raise names the except of its class that answers it (assert_recipe_allergen_safe → 403, _get_firebase_app → 401); deciders 4', PS.v.deciders);
  const e404 = els(PS, 'end').find((x) => x[4] && x[4][2] === 404), e403 = els(PS, 'end').find((x) => x[4] && x[4][2] === 403);
  ok(io(e404).b.filter((l) => l[0] === 'causeIf').length === 2 && io(e403).b.some((l) => l[0] === 'causeIf' && l[1].fn === 'assert_recipe_allergen_safe'), 'F1a · F05 · F06 · the 404 names both its causes; the 403 names its raiser and its condition', [io(e404).b, io(e403).b]);
  const login = els(PS, 'gate').find((x) => (x[7] || {}).gk === 'a'), cInv = els(PS, 'gate').find((x) => io(x).h[0] === 'except InvalidTokenError');
  ok(login && login[7].ef[1].length === 1 && cInv && !has(cInv, 'g', 'commitsAt'), 'F1a · N3-08 · F07 · the login check ends once (401 Not authenticated; the catch carries invalid token); the catch commits nothing', login && login[7].ef);
  const idem = els(PS, 'stage').find((x) => x[3] === 'IdempotencyMiddleware'), cors = els(PS, 'stage').find((x) => x[3] === 'CORSMiddleware');
  ok(io(idem).b.some((l) => l[0] === 'order' && l[1].n === 3) && io(cors).b.some((l) => l[0] === 'order' && l[1].n === 1), 'F1a · N3-11 · the middleware run 1 of 3 (CORS) … 3 of 3 (Idempotency)');
  const tv = els(PS, 'std').find((x) => x[3] === 'TokenVerifier');
  ok(has(tv, 'g', 'eitherCan') && has(tv, 'c', 'armElse') && io(tv).c.some((l) => l[0] === 'bind' && l[1].at === 'context.py:77'), 'F1a · N3-10 · F22 · CR-15 · TokenVerifier: either choice can end at 401, its second arm "otherwise", used at context.py:77', io(tv).c);
  const fall = els(PS, 'gate').find((x) => (x[7] || {}).fall);
  ok(fall && io(fall).h[2] && io(fall).h[2][0] === 'forkElse', 'F1a · CR-37 · the fall-through branch is titled "otherwise"');
  ok(els(PS, 'data').filter((x) => (x[7] || {}).rc).length === 2 && els(PS, 'data').some((x) => (x[7] || {}).rs), 'F1a · N3-18 · the login\'s first add of a user carries its race to the 500, beside the key claim\'s');
  const fc = fn(PS, '_firebase_credential');
  ok(fc && fc[7].dd && !fc[7].dp && !(PS.ck.behind || []).some((k) => MK[k] === 'fn:apps/api/auth/verifier.py::_firebase_credential' || k === 'fn:apps/api/auth/verifier.py::_firebase_credential'),
    'F1a · CR-05 · N3-05 · a function the dependency runs is run by FastAPI before the handler, inside get_auth_context — and is not counted behind the handler', fc && fc[7]);
  ok(GR.v.datafns === 13 && GR.v.fate.unsaved === 0 && GR.v.asserted === 17 && GR.v.acts === 32 && GR.actc === 44, 'F1a · N3-06 · N3-03 · N3-16 · GET /recipes: data fns 13, nothing left unsaved, beyond 17, tests 32 (44 calls)', [GR.v.datafns, GR.v.fate, GR.v.asserted, GR.v.acts, GR.actc]);
  const rs = els(PS, 'client').filter((x) => (x[4] || [])[0] === 'rsn'), hook = els(PS, 'client').find((x) => x[3] === 'useStartCooking'), rest = els(PS, 'client').find((x) => (x[4] || [])[0] === 'rest');
  ok(rs.length && rs.every((x) => io(x).h[2] && io(x).h[2][0] === 'rsTitle') && (hook[7] || {}).sm === 'POST' && (rest[7] || {}).fw && rest[7].fw.length === 2,
    'F1a · CR-38 · F32 · N3-20 · a reason site is titled by what it reads; the sending hook says "sends POST"; the rest line holds the body\'s parse endings too');
  const arr = GR.mo.nm.filter((x) => x[1] === 'arr'), c859 = arr.find((x) => x[3] === 'C859');
  ok(arr.every((x) => x[4].nm) && c859 && c859[4].t === 1, 'F1a · F12 · N3-15 · an arranging case leads with its name; C859, which also tests GET /recipes, says so', arr.map((x) => [x[3], x[4].t || 0]));
  ok(D.words.mo.opt.dxc && D.words.mo.opt.dxc.pick === 'page' && D.words.mo.opt.dxc.opts.his && D.words.mo.opt.dxc.ruled === 'D-081', 'F1a · S4-29 · D-081 · the write colour is an option — the page\'s colours are his ruling, his words\' colours beside');
  /* D-081: a small map per moment is how Data effects opens; this reads the other look, one map under the row (its cells say how many), on the table as it was before fit */
  await open(PAGE); await p.evaluate(() => { const A = window.__allep; A.mo.looks.dfx = 'one'; localStorage.setItem(A.mo.key, JSON.stringify(A.mo.looks)); }); await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready');
  await p.evaluate(() => window.__allep.pick('POST /cooking/sessions')); await p.waitForTimeout(200);
  const sc = await p.evaluate(() => ({ cnt: document.querySelectorAll('#mogrid td[data-f="data"] .mdxcnt').length, mc: document.querySelectorAll('#mogrid td[data-f="data"] .mc').length,
    fits: [...document.querySelectorAll('#mogrid td[data-f="proof"] .mc .mpv')].map((x) => x.textContent), b0: document.querySelectorAll('#mogrid .mdxb0 > .mdxru').length }));
  ok(sc.cnt > 0 && !sc.mc && sc.fits.includes(D.words.mo.fits) && sc.fits.includes(D.words.mo.svcFace) && sc.b0 >= 1,
    'F1a · CR-31 · F03 · on screen: with the map on the Data effects cells say how many; the faces say "fits" and "from the service side"; an empty band draws its rule inside', sc);
  ok(!errs.length, 'F1a · no page error', errs); }

/* 31 · ROUND-1 REVIEW, lane F1b (2026-09-30) — hovers, layout, words: each fix smoke-checked on the page data and once on screen */
{ const PS = ROW['POST /cooking/sessions'], GR = ROW['GET /recipes'], MW = D.words.mo, TL = D.words.terms.life;
  const els = (r, f) => r.mo.el.filter((x) => x[0] === f), io = (x) => (x[7] || {}).io || { h: [], b: [], c: [], g: [] };
  ok(['fn:apps/api/api/cooking.py::post_start_session', 'middleware:RateLimitMiddleware'].every((k) => PS.mo.hio[k] && PS.mo.hio[k].c.length) && PS.mo.hio['middleware:RateLimitMiddleware'].g.some((l) => l[0] === 'mwEnds' && /sensitive/.test(l[1].v)),
    'F1b · F09 · S4-07 · F33 · a host head has ONE hover of its own (before · checks · gives) — the handler\'s, the rate-limit middleware\'s (what it lets through, the two 429s it can end with)', Object.keys(PS.mo.hio));
  const alW = PS.mo.nm.filter((x) => x[1] === 'alarm').map((x) => x[4].w);
  ok(alW.length === 6 && new Set(alW.map((w) => JSON.stringify(w))).size === 6 && alW.find((w) => w[0] === 'x.race')[1].cons === 'uq_cooking_sessions_hh_key',
    'F1b · F11 · S4-09 · CR-21 · each alarm says what it found here, six alarms, six sayings; race-500 says the one race sentence with its own key', alW.map((w) => w[0]));
  const exW = PS.mo.ex.map((x) => String(x[6] || '')).concat(GR.mo.ex.map((x) => String(x[6] || '')));
  ok(!exW.some((w) => /str\(exc\)|pydantic error type|^f["']/.test(w)) && exW.includes(MW.x.saysPyd) && exW.some((w) => /^Invalid allergen_safe code '…'/.test(w)),
    'F1b · CR-10 · F16 · an ending\'s words as the caller gets them: no source expression, the 422 a list per field, an f-string as its words with "…"', exW.filter((w) => /…|caught/.test(w)).slice(0, 3));
  const tw = els(GR, 'end').filter((x) => (x[7] || {}).tw).map((x) => x[7].tw);
  ok(tw.includes('allergen_safe') && tw.includes('diet') && els(PS, 'end').filter((x) => (x[7] || {}).tw).map((x) => x[7].tw).sort().join(',').includes('global,invalid token'),
    'F1b · CR-16 · twin faces carry what tells them apart: GET /recipes\' 400s by the word their words differ by, POST\'s 429s by their limit, its 401s by their words', tw.slice(0, 8));
  ok(els(PS, 'proof').filter((x) => x[4] && x[4][0] === 'jy' && x[4][1] === 'b').every((x) => PS.mo.sp[x[1]][0] === 'prior') && PS.mo.sp.some((x) => x[0] === 'prior'),
    'F1b · CR-20 · a journey\'s earlier requests stand at "' + MW.moms.prior.name + '", never at "' + MW.moms.start.name + '"');
  ok(D.words.mo.io.k.guard.name === D.words.terms.gate.check && D.words.enc.fam.gdk.vals.b.name === D.words.terms.gate.fork && D.words.cols.guards.head === D.words.terms.gate.checks && D.words.el.kinds.limiter === D.words.terms.gate.limit
     && els(PS, 'inf').every((x) => io(x).g.every((l) => l[0] !== 'lasts' || [TL.req.name, TL.srv.name, TL.unk.name].includes(l[1].v))),
    'F1b · S4-19 · S4-18 · one word per concept: a gate kind\'s name, its icon, its element kind and its column head read terms; a lifetime says "' + TL.req.name + '" or "' + TL.srv.name + '"');
  await open(PAGE, 'default'); await p.evaluate(() => window.__allep.pick('POST /cooking/sessions')); await p.waitForTimeout(250);
  const sc = await p.evaluate(() => { const W = window.__allep.data.words, G = document.getElementById('mogrid');
    const tipOf = (e) => { e.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); const t = document.getElementById('tip').textContent; document.body.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); return t; };
    const heads = [...G.querySelectorAll('.mgh > .mgh0')], meta = [...document.querySelectorAll('#mometa [data-tip="monm"]')];
    return { nested: heads.filter((h) => h.querySelector('[data-tip]')).length, heads: heads.length, headTip: tipOf(heads[0]),
      metaPlain: meta.filter((m) => tipOf(m).includes(W.mo.nm.plain)).length, titleTip: tipOf(document.querySelector('#mometa h3[data-tip="nmhead"]')).includes(W.mo.nm.plain),
      alarms: [...document.querySelectorAll('#mometa .nmc[data-nmk="alarm"]')].map((c) => c.textContent.trim()), erow: [...document.querySelectorAll('#ocol-cm tr.erow [data-tip], #ocol-cm .hdl [data-tip]')].length,
      titles: [...document.querySelectorAll('#ocol-uni [title]')].length, band: [...G.querySelectorAll('thead th.mosb .mosc')].map((c) => c.textContent),
      work: (G.querySelector('th.mom[data-mom="work"]') || {}).getAttribute('data-face'), cors: !!G.querySelector('td[data-f="sec"] .mc[data-key="middleware:CORSMiddleware"] .skg'),   /* CHANGED 2026-10-02 (D-084): the middleware stand in the Security row */
      tests: G.querySelectorAll('td[data-f="proof"] .mc .mtg').length, rule: [...G.querySelectorAll('td[data-f="stage"] .mc .mt')].map((t) => t.textContent),
      life: [...G.querySelectorAll('td[data-f="inf"] .mlt')].map((x) => x.textContent), gateCols: [...G.querySelectorAll('th[data-f="gate"] .msc')].map((b) => b.getAttribute('data-mcol')),
      risk: (document.querySelector('#mometa .nmc[data-nmk="risk"]') || {}).textContent, ow: getComputedStyle(G.querySelector('.mc .mt')).overflowWrap,
      gateLeg: tipOf(G.querySelector('th[data-f="gate"]')), endLeg: tipOf(G.querySelector('th[data-f="end"]')) }; });
  /* CHANGED 2026-10-03 (D-088): a middleware's place in the run order is its pill ("2 of 3"), no longer a line in a "before" part — the head's hover keeps its checks and its gives */
  ok(sc.heads > 3 && !sc.nested && sc.headTip.includes(MW.io.parts.c) && sc.headTip.includes(MW.io.parts.g), 'F1b · F09 · S4-07 · ' + sc.heads + ' host heads, none with a hover inside it; a head\'s hover is its facts, checks · gives', sc.headTip.slice(0, 120));
  ok(!sc.metaPlain && sc.titleTip, 'F1b · F10 · CR-21 · the metadata\'s paragraph stands once, on its title — on no item', sc.metaPlain);
  ok(sc.alarms.length === 6 && sc.alarms.every((a) => !/^[a-z]+(-[a-z0-9]+)+$/.test(a)) && sc.alarms.includes(D.words.enc.fam.alarm.vals['race-500'].name), 'F1b · CR-22 · the alarms wear plain faces, their names in the hover', sc.alarms);
  ok(!sc.erow && !sc.titles, 'F1b · S4-08 · S4-14 · an endings row of the code map is one hover; the universe column has no native tooltip left');
  ok(sc.band.length && sc.band.every((t) => /\D/.test(t)) && sc.work && sc.work.indexOf(MW.moms.work.name) === 0, 'F1b · F30 · CR-19 · CR-17 · the band\'s counts say their noun; the work wears its one name, its calls below', [sc.band, sc.work]);
  ok(sc.cors && sc.tests > 0 && sc.rule.includes('recipe_id required') && sc.rule.some((t) => /planned_portions\s*≥\s*1/.test(t)) && !sc.rule.some((t) => /greater_than_equal/.test(t)),
    'F1b · S4-15 · S4-32 · CR-33 · CORSMiddleware wears the middleware glyph; a test wears the test mark; a 422 rule faces its rule', sc.rule);
  ok(sc.life.length && sc.life.every((t) => [TL.req.name, TL.srv.name, TL.unk.name].includes(t)) && !sc.gateCols.includes('pieces') && !sc.gateCols.includes('lacks') && sc.risk === D.words.mo.nm.k.risk.ids.conflict.name && sc.ow === 'normal',
    'F1b · S4-18 · CR-34 · CR-13 · F27 · the lifetimes in the one pair; pieces and lacks only in the metadata card; the flag by its own words; a name never breaks between two letters', [sc.life, sc.gateCols, sc.risk, sc.ow]);
  ok(!/My proposal/.test(sc.gateLeg) && sc.gateLeg.includes(D.words.terms.gate.check) && /×2/.test(sc.endLeg), 'F1b · F14 · S4-11 · F13 · CR-11 · the gates legend names each kind once with no word on where its icon came from; the endings legend counts each status on its own (429 ×2)', [sc.gateLeg.slice(0, 160), sc.endLeg.slice(0, 160)]);
  await p.$eval('#mogrid tr[data-f="fn"]', (e) => e.scrollIntoView({ block: 'start' })); await p.waitForTimeout(150);
  const st = await p.evaluate(() => { const h = document.querySelector('#mogrid th.mom'), pin = document.getElementById('pin'); return { tr: h.style.transform, top: h.getBoundingClientRect().top, pin: pin.getBoundingClientRect().bottom }; });
  ok(/translateY/.test(st.tr) && st.top >= st.pin - 2, 'F1b · CR-07 · scrolled down to Functions, the moment heads stand right under the pinned row', st);
  const O = D.words.mo.opt;
  ok(O.jyb.pick === 'prior' && O.jyb.opts.head && O.jyb.ruled === 'D-081' && O.stk.pick === 'ride' && O.stk.opts.stay && O.stk.ruled === 'D-081',   /* D-081: both are his now */ 'F1b · CR-20 · CR-07 · the two places the review offered are options: a test\'s earlier requests at their own moment (my pick) or in Proof\'s head; the heads ride down (my pick) or stay');
  await p.evaluate(() => window.scrollTo(0, 0)); await p.$eval('#mogrid th[data-f="proof"] .mro', (e) => e.scrollIntoView({ block: 'center' })); await p.click('#mogrid th[data-f="proof"] .mro'); await p.waitForTimeout(150);
  await p.click('#mogrid th[data-f="proof"] .opt[data-mopt="jyb"][data-v="head"]'); await p.waitForTimeout(200);
  const jh = await p.evaluate(() => ({ prior: document.querySelectorAll('#mogrid th.mom[data-mom="prior"]').length, inHead: document.querySelectorAll('#mogrid th[data-f="proof"] .mjyh .mc[data-jy]').length, bands: document.querySelectorAll('#mogrid table.motab').length, out: document.getElementById('out').value }));
  ok(!jh.prior && jh.inHead === 3 * jh.bands &&   /* D-081: the table opens fitted into bands, and each band's Proof head holds the three */ jh.out.includes(O.jyb.label + ': ' + O.jyb.opts.head.name), 'F1b · CR-20 · its option: the three journeys\' earlier requests stand in Proof\'s head (in each band), and the moment leaves; the copy text says the choice', [jh.prior, jh.inHead, jh.bands]);
  await p.evaluate(() => { localStorage.removeItem('gabe:allep:moments:v3'); }); await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready');
  ok(!errs.length, 'F1b · no page error', errs); }

/* 32 · LEGIBILITY ROUND 1b, the small pass (remaining.json R-03 · R-04 · R-05 · R-06 · R-20; R-01 is in section 21, R-21 in the D-055 hide read) */
{ const MW = D.words.mo, TG = D.words.terms.gate, C2 = MW.x.c2, fillW = (s0, x) => String(s0).replace(/\{(\w+)\}/g, (m, k) => (x[k] != null ? x[k] : m));
  const R06 = [['mo.x.hollowPlain', MW.x.hollowPlain], ['fates.none.plain', D.words.fates.none.plain], ['enc.fam.does.name', D.words.enc.fam.does.name]]
    .concat(Object.entries(MW.why).flatMap(([k, v]) => [['mo.why.' + k + '.name', v.name], ['mo.why.' + k + '.plain', v.plain]]))
    .concat(Object.entries(D.words.enc.fam.does.vals).filter(([, v]) => v.plain).map(([k, v]) => ['enc.fam.does.vals.' + k, v.plain]));
  const talk = R06.filter(([, s]) => /\bmap\b|\bdrawn\b|\bdraws?\b|\brecords?\b/i.test(String(s || '')));
  ok(!talk.length, 'R-06 · D-017 · the hollow test line, the fate words, the band\'s ' + Object.keys(MW.why).length + ' reasons and the branch family say what the code or the test does, never what the map drew or recorded', talk);
  await open(PAGE, 'default'); await p.evaluate(() => window.__allep.pick('GET /recipes')); await p.waitForTimeout(250);
  const g3 = await p.evaluate(() => { const fc = (c) => c.textContent.replace(/\s+/g, ' ').trim();
    const fail = [...document.querySelectorAll('#mogrid td[data-mom="fail"][data-f="gate"]')].map((td) => [...td.querySelectorAll('.mc')].map((c) => [fc(c), (c.querySelector('.vc-gdk') || {}).textContent || null]));
    const twins = [...document.querySelectorAll('#mogrid td[data-f="gate"]')].filter((td) => { const fs = [...td.querySelectorAll('.mc')].map(fc); return new Set(fs).size !== fs.length; }).length;
    return { fail, twins }; });
  ok(g3.fail.length >= 1 && g3.fail.every((cs) => cs.some((x) => x[1] === TG.catch) && cs.some((x) => x[1] === TG.check) && new Set(cs.map((x) => x[0])).size === cs.length) && !g3.twins,
    'R-03 · GET /recipes · after a call failed (' + g3.fail.length + ' cells): the catch and the check read apart by the kind\'s noun on their face ("' + TG.catch + '", "' + TG.check + '"); no two gates in one cell read the same', g3);
  await p.evaluate(() => window.__allep.pick('POST /cooking/sessions')); await p.waitForTimeout(300);
  const r4 = await p.evaluate(() => { const tipOf = (e) => { e.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); const t = document.getElementById('tip'), s = t.getAttribute('data-show') === 'true' ? t.textContent : null; document.body.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); return s; };
    return [...document.querySelectorAll('#mogrid .mdx .mdxrc')].map((bd) => { const w = bd.closest('.mdx'), g = w.querySelector('svg.mdxs g[data-tip="modxl"][data-j="' + bd.getAttribute('data-j') + '"]');
      return { tipAttr: bd.hasAttribute('data-tip'), same: !!g && tipOf(bd.firstChild) === tipOf(g), txt: (g && tipOf(g) || '').slice(0, 80) }; }); });
  ok(r4.length > 0 && r4.every((x) => !x.tipAttr && x.same), 'R-04 · POST /cooking/sessions · Data effects map: each of its ' + r4.length + ' race badges is part of its link — no hover of its own, the link\'s hover over it', r4);
  const r5 = await p.evaluate(() => { const X = window.__allepEx, T = window.__allep.data.words.ex.tip.test, sts = (s) => String(s || '').match(/\b\d{3}\b/g) || [];
    const pre = (k) => T[k].split('{')[0];
    const gives = (h) => { const d = document.createElement('div'); d.innerHTML = h; return [...d.querySelectorAll('.io[data-part="g"] > span')].map((q) => q.textContent); };   /* the hover's "gives" lines */
    return X.items('test').map((it) => X.tip('test', it)).filter((h) => /^<b>C237 /.test(h)).map((h) => ({ g: gives(h) })).map((P) => { const said = P.g.filter((l) => l.indexOf(pre('outSt')) !== 0 && [pre('proves'), pre('fits'), pre('checksSetup'), pre('checksOnly')].some((q) => l.indexOf(q) === 0)).flatMap(sts);
      const out = P.g.filter((l) => l.indexOf(pre('outSt')) === 0).flatMap(sts); return { said, out, again: out.filter((s) => said.includes(s)) }; }); });
  ok(r5.length > 0 && r5.every((x) => x.said.length && !x.again.length), 'R-05 · EXAMPLES · C237\'s hover says its statuses once (the fits line names them; no "checks the status is" repeats them)', r5);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.$eval('#mogrid th[data-f="data"] .mro', (e) => e.scrollIntoView({ block: 'center' })); await p.click('#mogrid th[data-f="data"] .mro'); await p.waitForTimeout(150);
  const legOf = () => p.evaluate(() => { const h = document.querySelector('#mogrid th[data-f="data"]'); h.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); const t = document.getElementById('tip').textContent; document.body.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); return t; });
  const lgPage = await legOf();
  await p.click('#mogrid th[data-f="data"] .opt[data-mopt="dxc"][data-v="his"]'); await p.waitForTimeout(200);
  const lgHis = await legOf(), fw = (k, o) => fillW(C2.lg[k], C2.lg.col[o]);
  ok(lgPage.includes(fw('w', 'page')) && lgHis.includes(fw('w', 'his')) && !lgHis.includes(fw('w', 'page')) && C2.lg.col.his.w !== C2.lg.col.page.w,
    'R-20 · the Data effects legend names the colours the write-colour option draws: "' + fw('w', 'page') + '" with the page\'s, "' + fw('w', 'his') + '" with his', [lgPage.slice(0, 200), lgHis.slice(0, 200)]);
  await p.evaluate(() => { localStorage.removeItem('gabe:allep:moments:v3'); }); await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready');
  ok(!errs.length, 'R-* · no page error', errs); }

/* 33 · D-081 + L-34 … L-38 (2026-10-02, round 3) — his ruled looks are the defaults, and the bench and the table gained the controls he asked for.
   Smoke checks (D-037): (1) the looks he ruled open pressed and undashed, the three still my pick dashed; (2) R-11: a table wider than its box opens
   fitted; (3) the bench's controls are icon squares with a verb-and-object hover, no fold, the copy line never shown and still whole in the clipboard;
   (4) a column's width: four (D-087 removed full), dynamic my pick (dashed), narrowing only the drawn element, kept per viewer, in the copy line; (5) a widened BY MOMENT column's edge dragged by the mouse and
   moved by the keys inside its floor and its maximum, kept through a reload and in the copy text; (6) a table wider than its box, even fitted, slides
   with Shift and the wheel, and says so */
{ const E = 'POST /cooking/sessions', MW = D.words.mo, XW = D.words.ex, fillW = (t, x) => String(t).replace(/\{(\w+)\}/g, (m, k) => (x[k] != null ? x[k] : m));
  await open(PAGE, 'default'); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(300);
  const RULED = ['ipo', 'meta', 'stk', 'gdl', 'gef', 'gic', 'grl', 'fnm', 'std', 'dxc', 'jyb', 'ifl', 'wid', 'fit', 'dfx', 'leg', 'lay', 'cell'], MINE = ['hdr', 'save', 'jy'];
  const mk = await p.evaluate(() => { const by = {}; document.querySelectorAll('#mobar .opt[data-mopt], #mogrid .mrop .opt[data-mopt]').forEach((o) => { const g = o.getAttribute('data-mopt'); (by[g] = by[g] || []).push([o.getAttribute('data-v'), o.getAttribute('aria-checked'), o.getAttribute('data-ruled'), o.getAttribute('data-pick'), getComputedStyle(o).borderTopStyle]); }); return by; });
  const looksNow = await p.evaluate(() => window.__allep.mo.looks);
  const rowOnly = ['gdl', 'gef', 'gic', 'grl', 'fnm', 'std', 'dfx', 'dxc', 'ifl', 'jyb'];   /* these sit in their row's own options slot, closed on a cold open */
  const ruledOk = RULED.every((g) => MW.opt[g].ruled && looksNow[g] === MW.opt[g].pick && (rowOnly.includes(g) || (mk[g] || []).some(([v, on, r, pk, bs]) => v === MW.opt[g].pick && on === 'true' && r === 'true' && !pk && bs !== 'dashed')));
  const mineOk = MINE.every((g) => !MW.opt[g].ruled && (mk[g] || []).some(([v, on, r, pk, bs]) => v === MW.opt[g].pick && on === 'true' && !r && pk === 'true' && bs === 'dashed'));
  ok(ruledOk && mineOk && MW.opt.wid.pick === 'line' && MW.opt.fit.pick === 'bands' && MW.opt.dfx.pick === 'cell' && XW.opt.lay.pick === 'half' && ['lay', 'follow', 'scope'].every((g) => XW.opt[g].ruled === 'D-081') && MW.opt.wid.ruled === 'D-081',
    'D-081 · the looks he ruled open pressed and undashed — a head puts every item on one line, fit wraps into bands, data effects a small map per moment, the bench an upper and a lower row — and the header, saving and the journeys stay my pick, dashed', { looksNow, mk: Object.fromEntries(Object.entries(mk).filter(([g]) => MINE.includes(g))) });
  /* (2) R-11: the table is wider than its box at its natural widths, and it opens fitted — no sideways scroll, in bands */
  const r11 = await p.evaluate(() => { const G = document.getElementById('mogrid'); return { fit: document.getElementById('mofit').getAttribute('aria-pressed'), tables: G.querySelectorAll('table.motab').length, over: G.scrollWidth - G.clientWidth, band: G.getAttribute('data-fit'),
    copy: document.getElementById('out').value.split('\n').filter((l) => l.indexOf('the columns:') >= 0 && l.indexOf('by moment') === 0).length }; });
  await p.evaluate(() => { const A = window.__allep; A.mo.cols.fit = false; localStorage.setItem(A.mo.colKey, JSON.stringify(A.mo.cols)); }); await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready'); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(300);
  const r11off = await p.evaluate(() => { const G = document.getElementById('mogrid'); return { fit: document.getElementById('mofit').getAttribute('aria-pressed'), tables: G.querySelectorAll('table.motab').length, over: G.scrollWidth - G.clientWidth }; });
  ok(r11.fit === 'true' && r11.tables > 1 && r11.over <= 1 && r11.band === 'bands' && !r11.copy && r11off.fit === 'false' && r11off.tables === 1 && r11off.over > 1,
    'D-081 · R-11 · ' + E + ' opens fitted: the fit button pressed, ' + r11.tables + ' bands, no sideways scroll, nothing about it in the copy text; with fit off the one table is ' + r11off.over + ' px wider than its box', { r11, r11off });
  await open(PAGE, 'default'); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(300);
  /* (3) the bench's controls: icon squares, each a verb and its object; no fold; the copy line hidden, whole in the clipboard */
  await p.evaluate(() => { window.__w81copied = null; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (x) => { window.__w81copied = x; return Promise.resolve(); } } }); });
  const bn = await p.evaluate(() => { const c = document.querySelector('#exgrid .excol[data-k="table"]'), ic = [...c.querySelectorAll('.exscope .opt, .exwidth .opt, .exstep, .exreset, .excopy')];
    const line = c.querySelector('.exline'); return { n: ic.length, textless: ic.every((b) => !b.textContent.trim() && b.querySelector('svg')), verbs: ic.map((b) => b.getAttribute('data-verb') + ' ' + b.getAttribute('data-obj')),
      lineHidden: !!line && line.hidden && line.offsetParent === null && line.textContent.length > 40, folds: c.querySelectorAll('.exfold, details, [aria-expanded]').length,
      sections: [...c.querySelectorAll('.exctl .exsh')].map((h) => h.textContent), vis: [...c.querySelectorAll('.exctl .exsec')].every((x) => x.getBoundingClientRect().height > 10), line: line.textContent }; });
  await p.$eval('#exgrid .excol[data-k="table"] .excopy', (e) => e.scrollIntoView({ block: 'center' })); await p.click('#exgrid .excol[data-k="table"] .excopy'); await p.waitForTimeout(120);
  const copied = await p.evaluate(() => window.__w81copied);
  ok(bn.n === 10 && bn.textless && bn.verbs.every((v) => v.length > 8 && !/undefined/.test(v)) && bn.lineHidden && !bn.folds && JSON.stringify(bn.sections) === JSON.stringify([XW.ctl.parts, XW.ctl.each, XW.ctl.box, XW.ctl.marks]) && bn.vis && copied === bn.line,
    'D-081 · L-36 · CHANGED D-093 · the table column\'s controls are ' + bn.n + ' icon squares (no text), each a verb and its object; the lines, each part, the box and the marks are always on the page (no fold); the copy line is not shown and the copy button copies all of it', { bn: { ...bn, line: bn.line.slice(0, 60) }, copied: (copied || '').slice(0, 60) });
  /* (4) the width of a column — CHANGED 2026-10-03 (D-087, his words): four options, "full" removed; a width narrows ONLY the element drawn at the top of the
     column, never the column's box — the head, the squares, the chips, the picker, the parts/size/colour controls and the grid keep the default's place and size
     (what sits under the element keeps its x and width, and its distance from the element; it moves down only as far as the element grew taller). A saved "full" reads as the default. */
  const w0 = await p.evaluate(() => [...document.querySelectorAll('#exgrid .excol[data-k="end"] .exwidth .opt')].map((b) => [b.getAttribute('data-v'), b.getAttribute('aria-checked'), b.getAttribute('data-pick'), getComputedStyle(b).borderTopStyle]));
  const optSets = await p.evaluate(() => [...document.querySelectorAll('#exgrid .excol .exwidth')].map((g) => [...g.querySelectorAll('.opt')].map((b) => b.getAttribute('data-v')).join(',')));
  const geo = (k) => p.evaluate((k) => { const c = document.querySelector('#exgrid .excol[data-k="' + k + '"]'), R = (e) => { if (!e) return null; const q = e.getBoundingClientRect(); return { x: Math.round(q.left), y: Math.round(q.top + window.scrollY), w: Math.round(q.width), h: Math.round(q.height) }; };
    const g = (s) => R(c.querySelector(s)); return { col: R(c), head: g('.exhd'), sq: g('.extop'), roles: g('.exroles'), pick: g('.expick'), card: g('.exw'), ctl: g('.exctl'), copy: g('.excopy'), reset: g('.exreset'), w: c.getAttribute('data-w'), gap: ['.exctl', '.excopy', '.exreset'].map((q) => c.querySelector(q).getBoundingClientRect().top - c.querySelector('.exw').getBoundingClientRect().bottom),
      grid: [...document.querySelectorAll('#exgrid .excol')].map((x) => { const q = x.getBoundingClientRect(); return Math.round(q.left) + ':' + Math.round(q.width); }).join('|') }; }, k);
  const eqBox = (a, b) => JSON.stringify(a) === JSON.stringify(b), geoRes = {}, geoBad = [];
  for (const k of ['end', 'table']) {
    await p.$eval('#exgrid .excol[data-k="' + k + '"] .exwidth', (e) => e.scrollIntoView({ block: 'center' }));
    await p.click('#exgrid .excol[data-k="' + k + '"] .exwidth .opt[data-v="dynamic"]'); await p.waitForTimeout(80);
    const d = await geo(k); geoRes[k] = { dynamic: d.card.w }; let prev = d.card.w;
    for (const v of ['shorter', 'compact', 'tight']) {
      await p.click('#exgrid .excol[data-k="' + k + '"] .exwidth .opt[data-v="' + v + '"]'); await p.waitForTimeout(80);
      const g = await geo(k); geoRes[k][v] = g.card.w;
      const same = g.col.x === d.col.x && g.col.y === d.col.y && g.col.w === d.col.w && g.grid === d.grid && ['head', 'sq', 'roles', 'pick'].every((q) => eqBox(g[q], d[q]))
        && ['ctl', 'copy', 'reset'].every((q) => g[q].x === d[q].x && g[q].w === d[q].w) && g.gap.every((x, i) => Math.abs(x - d.gap[i]) < 0.5) && g.w === v;
      if (!same || !(g.card.w < prev) || g.card.x !== g.head.x || g.card.w > g.col.w - 20) geoBad.push([k, v, same, g.card.w, prev, g.card.x, g.head.x]);
      prev = g.card.w; }
    await p.click('#exgrid .excol[data-k="' + k + '"] .exwidth .opt[data-v="dynamic"]'); await p.waitForTimeout(80); }
  ok(JSON.stringify(w0.map((x) => x[0])) === JSON.stringify(['dynamic', 'shorter', 'compact', 'tight']) && w0[0][1] === 'true' && w0[0][2] === 'true' && w0[0][3] === 'dashed' && w0.slice(1).every((x) => !x[2])
     && optSets.length >= 4 && optSets.every((x) => x === 'dynamic,shorter,compact,tight') && !XW.width.opts.full && Object.keys(XW.width.opts).length === 4 && !geoBad.length,
    'D-087 · a column has four widths — dynamic (my pick, dashed) · shorter · compact · most compact, no full; each narrows only its drawn element (end ' + [geoRes.end.dynamic, geoRes.end.shorter, geoRes.end.compact, geoRes.end.tight].join(' → ') + ' px, table ' + [geoRes.table.dynamic, geoRes.table.shorter, geoRes.table.compact, geoRes.table.tight].join(' → ')
      + ' px) at the column\'s own place, the same box and grid, head · squares · chips · picker unmoved, the controls under it in the same x and width, the element left-aligned', { geoBad, w0, optSets });
  /* the choice is in the column's copy line and kept per viewer; a saved "full" (an older bench) and a "full" set through the page's own handle read as the default — no error */
  const errs0 = errs.length;
  await p.click('#exgrid .excol[data-k="end"] .exwidth .opt[data-v="compact"]'); await p.waitForTimeout(80);
  const cpw = await p.$eval('#exgrid .excol[data-k="end"] .exline', (e) => e.textContent), wCompact = (await geo('end')).card.w;
  await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready'); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(300);
  const kept = await geo('end');
  await p.evaluate(() => { const A = window.__allepEx, o = JSON.parse(localStorage.getItem(A.key)); o.col.end.width = 'full'; o.col.table.width = 'full'; localStorage.setItem(A.key, JSON.stringify(o)); });
  await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready'); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(300);
  const fullE = await geo('end'), fullT = await geo('table'), cpf = await p.$eval('#exgrid .excol[data-k="end"] .exline', (e) => e.textContent);
  await p.evaluate(() => window.__allepEx.width('table', 'full')); await p.waitForTimeout(100);
  const viaApi = await geo('table');
  await p.click('#exgrid .excol[data-k="end"] .exwidth .opt[data-v="dynamic"]'); await p.waitForTimeout(80);
  const cpd = await p.$eval('#exgrid .excol[data-k="end"] .exline', (e) => e.textContent);
  ok(cpw.includes(' · ' + XW.ctl.widthIs + ' ' + XW.width.opts.compact.name + ' (') && kept.w === 'compact' && kept.card.w === wCompact && fullE.w === 'dynamic' && fullT.w === 'dynamic' && fullE.card.w === geoRes.end.dynamic && fullT.card.w === geoRes.table.dynamic
     && cpf.includes(XW.ctl.widthIs + ' ' + XW.width.opts.dynamic.name + ' (' + D.words.copy.pick + ')') && viaApi.w === 'dynamic' && viaApi.card.w === geoRes.table.dynamic && cpd.includes(XW.ctl.widthIs + ' ' + XW.width.opts.dynamic.name + ' (' + D.words.copy.pick + ')') && errs.length === errs0,
    'D-087 · the width is in the column\'s copy line and kept through a reload; a saved full — and a full set through the page — reads as the default (data-w ' + fullE.w + ', the element ' + fullE.card.w + ' px), no error', { cpw: cpw.slice(-60), kept: kept.w, wCompact, keptW: kept.card.w, fullE: fullE.w, fullT: fullT.w, viaApi: viaApi.w, cpf: cpf.slice(-60), errs: errs.slice(errs0) });
  /* (5) a widened BY MOMENT column's edge */
  await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(250);
  await p.evaluate(() => { const A = window.__allep; A.mo.cols.fit = false; A.mo.looks.wid = 'names'; localStorage.setItem(A.mo.colKey, JSON.stringify(A.mo.cols)); localStorage.setItem(A.mo.key, JSON.stringify(A.mo.looks)); }); await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready'); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(300);
  const head = '#mogrid th.mom[data-mom="edge"]', st5 = () => p.evaluate(() => { const h = document.querySelector('#mogrid .mowh'); return h ? { id: h.getAttribute('data-wedge'), min: +h.getAttribute('aria-valuemin'), now: +h.getAttribute('aria-valuenow'), max: +h.getAttribute('aria-valuemax'), px: window.__allep.mo.cols.wpx, w: Math.round(h.closest('th').getBoundingClientRect().width) } : null; });
  const noEdge = await p.evaluate(() => document.querySelectorAll('#mogrid .mowh').length);
  await p.$eval(head, (e) => e.scrollIntoView({ block: 'center' })); const hb = await (await p.$(head + ' .mh1')).boundingBox(); await p.mouse.click(hb.x + 5, hb.y + 5); await p.waitForTimeout(300);
  const a5 = await st5(), eb = await (await p.$('#mogrid .mowh')).boundingBox();
  await p.mouse.move(eb.x + eb.width / 2, eb.y + 12); await p.mouse.down(); await p.mouse.move(eb.x + 70, eb.y + 12, { steps: 5 }); await p.mouse.move(eb.x + 150, eb.y + 12, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(350);
  const b5 = await st5();
  await p.focus('#mogrid .mowh'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(250); const c5 = await st5(), foc = await p.evaluate(() => document.activeElement.classList.contains('mowh'));
  await p.keyboard.press('Home'); await p.waitForTimeout(250); const d5 = await st5(); await p.keyboard.press('End'); await p.waitForTimeout(250); const e5 = await st5();
  await p.keyboard.press('Shift+Home'); await p.waitForTimeout(250);
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(250); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(250);
  const f5 = await st5(), cp5 = (await p.$eval('#out', (e) => e.value)).split('\n').filter((l) => l.indexOf('by moment · ' + MW.col.copy) === 0)[0] || '';
  await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready'); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(300);
  const g5 = await st5();
  await p.$eval(head, (e) => e.scrollIntoView({ block: 'center' })); const hb2 = await (await p.$(head + ' .mh1')).boundingBox(); await p.mouse.click(hb2.x + 5, hb2.y + 5); await p.waitForTimeout(300);
  const h5 = await p.evaluate(() => [document.querySelectorAll('#mogrid .mowh').length, Object.keys(window.__allep.mo.cols.wpx).length]);
  ok(!noEdge && a5 && b5 && b5.now > a5.now + 100 && b5.px[b5.id] === b5.now && Math.abs(b5.w - b5.now) <= 2 && c5.now === b5.now - 16 && foc && d5.now === d5.min && e5.now === e5.max && e5.max > e5.min && f5.now === f5.min + 32
     && cp5.includes(fillW(MW.col.cPx, { w: f5.now })) && g5 && g5.now === f5.now && h5[0] === 0 && h5[1] === 0,
    'D-081 · L-37 · a widened column has an edge: dragged by the mouse it goes ' + (a5 && b5 ? a5.now + ' → ' + b5.now : '?') + ' px; the arrow keys move it by a step (focus stays), Home and End stop it at its floor (' + (d5 && d5.min) + ') and its maximum (' + (e5 && e5.max) + '); the width is in the copy text, kept through a reload, and a click on the head gives it back', { a5, b5, c5, d5, e5, f5, g5, h5, cp5 });
  /* (6) Shift and the wheel */
  await p.setViewportSize({ width: 760, height: 1000 }); await p.waitForTimeout(300);
  await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(200);
  await p.$eval(head, (e) => e.scrollIntoView({ block: 'center' })); const hb3 = await (await p.$(head + ' .mh1')).boundingBox(); await p.mouse.click(hb3.x + 5, hb3.y + 5); await p.waitForTimeout(300);
  await p.focus('#mogrid .mowh'); await p.keyboard.press('End'); await p.waitForTimeout(300);
  const ov = await p.evaluate(() => { const G = document.getElementById('mogrid'), m = document.getElementById('moscroll'); G.scrollIntoView({ block: 'start' }); return { over: G.scrollWidth - G.clientWidth, left: G.scrollLeft, hint: !m.hidden, hintText: m.textContent }; });
  const gb = await (await p.$('#mogrid')).boundingBox(); await p.mouse.move(gb.x + 200, Math.max(gb.y, 120) + 100);
  await p.mouse.wheel(0, 200); await p.waitForTimeout(200); const plain = await p.evaluate(() => document.getElementById('mogrid').scrollLeft);
  await p.keyboard.down('Shift'); await p.mouse.wheel(0, 300); await p.keyboard.up('Shift'); await p.waitForTimeout(250);
  const sh = await p.evaluate(() => document.getElementById('mogrid').scrollLeft);
  ok(ov.over > 1 && ov.hint && ov.hintText === MW.scrolls && /Shift/.test(ov.hintText) && plain === 0 && sh > 0,
    'D-081 · L-38 · a table still wider than its box (' + ov.over + ' px) says so, naming Shift and the wheel; the plain wheel leaves it, Shift and the wheel slide it ' + sh + ' px', { ov, plain, sh });
  await p.setViewportSize({ width: 1920, height: 1080 }); await p.waitForTimeout(250);
  ok(!errs.length, 'D-081 · no page error', errs); }

/* CHANGED 2026-10-02 (D-085): the Security look is ruled (marks), so check (4) reads it filled; the new option "a middleware with its switch" has section 35 below. */
/* 34 · D-084 (his ruling 2026-10-02, L-19 ruled G2 + F24) — smoke checks (D-037): (1) the pinned row's Client column is headed "sends it" there, in BY MOMENT's
   Client head and in the hover that names it; (2) BY MOMENT's Security row on POST /cooking/sessions stands after Gates and decisions and says, from the feed
   alone, its middleware in run order, the switches that turn a check on, the CORS origins and the secrets read on the way (each recomputed HERE from
   forms.json), with a mark for each fact that lives in another row; (3) a fact the feed lacks reads "not recorded" (a fixture with the settings arm off), one
   it proves absent "none on this endpoint" (GET /healthz), never a bare 0; (4) the option: marks (my pick, dashed) or moved into Security, kept per viewer and
   in the copy line, the rows the facts left and the maps and lanes they leave; (5) a mark clicked goes to its fact */
{ const E = 'POST /cooking/sessions', E0 = 'GET /healthz', FE = FJ.endpoints['endpoint:' + E], MW = D.words.mo, SW = MW.sec, IOW = MW.io, R = ROW[E], CL = D.words.copy.lines;
  /* (1) F24 — the column's head word, wherever it is named */
  await open(PAGE); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(400);
  const f24 = await p.evaluate(() => { const c = window.__allep.data.cols.find((x) => x.id === 'fetched');
    return { col: [c.head, c.name, c.zero], pin: [...document.querySelectorAll('#pin [data-col="fetched"], #board thead [data-col="fetched"]')].map((e) => e.textContent.trim()).filter(Boolean),
      mo: [...document.querySelectorAll('#mogrid th[data-f="client"] .msc[data-mcol="fetched"] .msh')].map((e) => e.textContent),
      screens: [...document.querySelectorAll('#pin .msh, #pin th, #mogrid th[data-f="client"] .msh')].filter((e) => e.textContent.trim() === 'screen').length }; });
  await p.$eval('#mogrid th[data-f="client"] .msc[data-mcol="fetched"]', (e) => e.scrollIntoView({ block: 'center' })); const hb = await (await p.$('#mogrid th[data-f="client"] .msc[data-mcol="fetched"]')).boundingBox();
  await p.mouse.move(hb.x + 6, hb.y + 6); await p.waitForTimeout(160); const f24tip = await tipTxt(); await p.mouse.move(5, 5);
  ok(f24.col[0] === 'sends it' && f24.col[1].includes('send it') && !/screen/.test(f24.col[2]) && f24.pin.includes('sends it') && f24.mo.length > 0 && f24.mo.every((w) => w === 'sends it') && !f24.screens && f24tip.startsWith('sends it ') && f24tip.includes(f24.col[1]),
    'D-084 · F24 · the pinned row\'s Client column is headed "sends it" (its words: ' + f24.col[1] + ' / ' + f24.col[2] + '), BY MOMENT\'s Client head reads it and its hover names it; no head still says "screen" for it', { f24, f24tip: f24tip.slice(0, 120) });
  /* (2) the Security row: where it stands, and every home fact recomputed from the feed */
  const order = await p.evaluate(() => [...document.querySelectorAll('#mogrid tr[data-f]')].map((t) => t.getAttribute('data-f')));
  const mws = Object.entries(FJ.middleware).map(([k, m]) => [k.split(':')[1], m.order.runs]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
  const auth = FE.auth || {}, X = FE.produced.concat(FE.framework_exits || []);
  const SX = new Set([...(auth.schemes || []).map((q) => q.exit), ...X.filter((x) => x.status === 401 && ['security', 'dependency'].includes(x.phase)).map((x) => x.id), ...(auth.requires || []).map((q) => q.exit), ...((FE.rate || {}).limits || []).map((q) => q.exit)].filter(Boolean));
  const swWant = FE.switches.filter((w) => [...(w.refs || []), ...(w.proves || [])].some((x) => SX.has(x)));
  const cors = FJ.settings['setting:cors_allow_origins'], corsWant = String(cors.default).replace(/^'|'$/g, '').split(',');
  const way = new Set(R.mo.el.flatMap((e) => e[2].map((ki) => D.mo.keys[ki]).filter((k) => k.startsWith('fn:')).map((k) => k.slice(3))).concat(Object.values(FJ.middleware).map((m) => m.method).filter(Boolean), [FE.handler]));
  const isSecret = (s) => /SecretStr/.test(String(s.annotation)) || (['str', 'bytes'].includes(String(s.annotation).replace(/\s*\|\s*None|None\s*\|\s*|Optional\[|\]/g, '').trim()) && ((s.environment || {}).files || []).some((f) => f.value === '<redacted>'));   /* a string the feed redacted — auth_provider, an enum, is redacted by its name and is no secret */
  const secWant = Object.entries(FJ.settings).filter(([, s]) => isSecret(s) && (s.readers || []).some((q) => way.has(q.fn))).map(([k]) => k.split(':')[1]).sort();
  const sc = await p.evaluate(() => { const tr = document.querySelector('#mogrid tr[data-f="sec"]'), t = (e) => e.innerText.replace(/\s+/g, ' ').trim();
    return { name: tr.querySelector('th .mbn').textContent, mark: tr.querySelector('th .bm').getAttribute('data-icon'), dashed: tr.querySelector('th .bm').hasAttribute('data-pick'),
      hd: [...tr.querySelectorAll('th .mss')].map((q) => [q.getAttribute('data-sec'), q.getAttribute('data-st'), q.querySelector('.msv').textContent]),
      edge: [...tr.querySelectorAll('td[data-mom="edge"] .mc')].map((c) => [t(c), c.getAttribute('data-f'), c.hasAttribute('data-secmk'), c.querySelectorAll('[data-tip]').length]),
      all: [...tr.querySelectorAll('td .mc')].map((c) => [t(c), c.closest('td').getAttribute('data-mom'), c.getAttribute('data-ik'), c.getAttribute('data-secmk')]) }; });
  const mwChips = sc.edge.filter((c) => c[1] === 'stage').map((c) => c[0]);
  const secChips = sc.all.filter((c) => c[2] === 'secret').map((c) => c[0]).sort();
  const markKinds = [...new Set(sc.all.filter((c) => c[3]).map((c) => c[3]))].sort();
  ok(order.indexOf('sec') === order.indexOf('gate') + 1 && order.indexOf('gate') > 0 && sc.name === SW.name && sc.mark === D.mo.sec.icon && sc.dashed,
    'D-084 · L-19 · BY MOMENT\'s Security row stands right after Gates and decisions on ' + E + ', named "' + SW.name + '", wearing my pick\'s dashed shield (the lab has no page for it)', { order, sc: [sc.name, sc.mark, sc.dashed] });
  ok(JSON.stringify(mwChips) === JSON.stringify(mws.map((n, i) => (i + 1) + ' ' + n)) && sc.hd.find((h) => h[0] === 'mw')[2] === String(mws.length),
    'D-084 · the Security row draws the app-wide middleware in the feed\'s run order, each with its place: ' + mwChips.join(' · '), { mwChips, mws, hd: sc.hd });
  ok(swWant.length === 2 && sc.hd.find((h) => h[0] === 'sw')[2] === String(swWant.length) && sc.all.filter((c) => c[2] === 'switch').length === swWant.length,
    'D-084 · the switches that turn a check on are the endpoint\'s switches whose refs or proofs are a login or rate-limit ending (' + swWant.map((w) => w.kind + ' ' + (w.port || w.expr)).join(' · ') + ') — drawn here, in full', { swWant: swWant.map((w) => w.id), got: sc.all.filter((c) => c[2] === 'switch').map((c) => c[0]) });
  ok(sc.hd.find((h) => h[0] === 'cors')[2] === String(corsWant.length) && corsWant.every((o) => sc.edge.some((c) => c[0].includes(o))) && sc.edge.some((c) => c[0].startsWith(SW.cors)),
    'D-084 · the CORS allowed origins come from the feed\'s settings (' + corsWant.join(', ') + '), drawn at the edge beside the CORS middleware', { corsWant, edge: sc.edge.map((c) => c[0]) });
  ok(secWant.length >= 1 && JSON.stringify(secChips) === JSON.stringify(secWant) && sc.hd.find((h) => h[0] === 'sec')[2] === String(secWant.length),
    'D-084 · the secrets read on this path are the feed\'s settings the feed marks secret and a function on the way reads (' + secWant.join(', ') + ')', { secWant, secChips });
  /* each fact that lives in another row has ONE mark per home row per moment, and the marks name the five items the feed itself records */
  const wantItems = ['household', 'login', 'provision', 'rate', 'repeat'].filter((k) => ({ login: (auth.schemes || []).length, household: (auth.requires || []).length, rate: ((FE.rate || {}).limits || []).length, provision: (auth.provisions || []).length, repeat: !!(FE.repeat || {}).required })[k]);
  const homes = await p.evaluate(() => [...document.querySelectorAll('#mogrid tr[data-f="sec"] .mc[data-secmk]')].map((c) => [c.getAttribute('data-secmk'), c.innerText.replace(/\s+/g, ' ').trim()]));
  const rowNames = Object.fromEntries(D.blocks.map((b) => [b.key, b.name])), famName = (f) => rowNames[D.mo.fam[f]];
  ok(JSON.stringify(markKinds) === JSON.stringify(wantItems) && homes.every(([, t]) => /→ /.test(t) && ['end', 'gate', 'inf', 'data'].some((f) => t.includes('→ ' + famName(f)))) && homes.some(([, t]) => t.includes('→ ' + famName('end')) && /×2/.test(t)),
    'D-084 · a mark for each fact that lives in another row — ' + wantItems.join(' · ') + ' — each naming the row that holds it ("→ Endings ×2" for the two 429s)', { markKinds, homes });
  ok(sc.edge.every((c) => c[3] === 0) && sc.all.length > 5, 'D-084 · one hover per item: no chip of the Security row carries a second hover inside it', sc.edge);
  /* hovers: a mark names what it holds and the row it is in; the row's legend lists the mark kind once */
  const tipAt = async (sel) => { const h = await p.$(sel); if (!h) return null; await h.evaluate((x) => x.scrollIntoView({ block: 'center' })); await p.waitForTimeout(40); const bx = await h.boundingBox();
    await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(120); const t = await tipTxt(); await p.mouse.move(5, 5); return t; };
  const tMark = await tipAt('#mogrid tr[data-f="sec"] .mc[data-secmk="rate"]'), tHead = await tipAt('#mogrid tr[data-f="sec"] th .mbn');
  const fillW = (t, x) => String(t).replace(/\{(\w+)\}/g, (m, k) => (x[k] != null ? x[k] : m));
  /* CHANGED 2026-10-03 (D-088): the mark's hover is the lab's card — the row it points to is its identity line, what a click does is the footer (the two lines that said so are not said twice) */
  ok(tMark && tMark.startsWith(SW.items.rate.name) && ['end', 'gate', 'inf'].some((f) => tMark.includes(famName(f))) && tMark.includes(D.words.mo.card.foot.go),
    'D-084 · a mark\'s hover names its item, what it holds, the row it points to, and what a click does (D-088: the row is its identity line, the click its footer)', { tMark });
  ok(tHead && tHead.includes(MW.rowq.sec) && tHead.includes(IOW.k.secmark.plain) && tHead.includes(IOW.k.cors.plain) && tHead.includes(IOW.k.secret.plain),
    'D-084 · the row\'s legend (its head\'s hover) says once what a mark, the allowed origins and a secret are', { tHead: (tHead || '').slice(0, 200) });
  /* (3) a fact the feed lacks says "not recorded"; one it proves absent says "none on this endpoint"; never a bare 0 */
  await open(PAGE); await p.evaluate((ep) => window.__allep.pick(ep), E0); await p.waitForTimeout(400);
  const h0 = await p.evaluate(() => ({ hd: [...document.querySelectorAll('#mogrid tr[data-f="sec"] th .mss')].map((q) => [q.getAttribute('data-sec'), q.getAttribute('data-st'), q.querySelector('.msv').textContent]),
    marks: document.querySelectorAll('#mogrid tr[data-f="sec"] .mc[data-secmk]').length, chips: [...document.querySelectorAll('#mogrid tr[data-f="sec"] td .mc')].map((c) => c.getAttribute('data-ik')) }));
  const F0 = FJ.endpoints['endpoint:' + E0], hv = (k) => h0.hd.find((h) => h[0] === k);
  ok(!(F0.switches || []).length && !((F0.auth || {}).schemes || []).length && h0.marks === 0 && hv('sw')[1] === 'none' && hv('sw')[2] === SW.state.none
     && hv('sec')[1] === 'none' && hv('sec')[2] === SW.state.none && hv('mw')[1] === 'ok' && h0.chips.every((k) => ['mw', 'cors'].includes(k)),
    'D-084 · ' + E0 + ' · Security is honest-empty where the feed proves it: no switches, no secrets, no marks — "' + SW.state.none + '" — while its middleware and origins stand', { h0, sw: (F0.switches || []).length });
  ok(!sc.hd.concat(h0.hd).some((h) => h[2] === '0'), 'D-084 · the row\'s head never says a bare 0', { sc: sc.hd, h0: h0.hd });
  { const copy = JSON.parse(JSON.stringify(FJ)); copy.arms.short.parts.setting.present = false; copy.arms.short.parts.setting.reason = 'switched off for the probe';
    const fx = path.join(SCRATCH, 'forms-settings-off.json'), page = path.join(SCRATCH, 'fixture-settings-off.html'); fs.writeFileSync(fx, JSON.stringify(copy));
    execFileSync('python3', [GEN, '--forms', fx, '--archmap', ARCHMAP, '--only', E, '--only', E0, '--out', page], { cwd: HERE, stdio: 'pipe' });
    await open(page); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(400);
    const u = await p.evaluate(() => ({ hd: [...document.querySelectorAll('#mogrid tr[data-f="sec"] th .mss')].map((q) => [q.getAttribute('data-sec'), q.getAttribute('data-st'), q.querySelector('.msv').textContent]),
      chips: [...document.querySelectorAll('#mogrid tr[data-f="sec"] td .mc')].map((c) => c.getAttribute('data-ik')) }));
    ok(['cors', 'sec'].every((k) => { const h = u.hd.find((x) => x[0] === k); return h && h[1] === 'unrec' && h[2] === SW.state.unrec; }) && !u.chips.includes('cors') && !u.chips.includes('secret') && u.hd.find((h) => h[0] === 'mw')[1] === 'ok',
      'D-084 · on a fixture whose feed lacks the settings arm, the origins and the secrets read "' + SW.state.unrec + '" — no chip invented, never a 0 — while the middleware, which the feed holds, stands', u); }
  /* (4) the option: marks (my pick, dashed) or moved into Security */
  await open(PAGE); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(400);
  const SEC = '#mogrid tr[data-f="sec"]', cnt = (sel) => p.$$eval(sel, (n) => n.length), look = () => p.evaluate(() => window.__allep.mo.looks.secmv);
  const homeCount = () => p.evaluate(() => ({ end: [...document.querySelectorAll('#mogrid td[data-f="end"] .mc .vc-status')].map((v) => v.textContent), lim: document.querySelectorAll('#mogrid td[data-f="gate"] .mc[data-ik="limiter"]').length,
    login: document.querySelectorAll('#mogrid td[data-f="gate"] .mc[data-ik="login"]').length, inf: document.querySelectorAll('#mogrid tr[data-f="inf"] .milf, #mogrid tr[data-f="inf"] .mc[data-ik="inflight"]').length,
    users: document.querySelectorAll('#mogrid td[data-f="data"] .mc[data-sx^="provision"]').length, secEnds: document.querySelectorAll('#mogrid tr[data-f="sec"] td[data-mom="edge"] .vc-status').length }));
  const before = await homeCount();
  await p.$eval(SEC + ' .mro', (e) => e.scrollIntoView({ block: 'center' })); await p.click(SEC + ' .mro'); await p.waitForTimeout(150);
  const sq = await p.$$eval('#mogrid .mrop .opt[data-mopt="secmv"]', (os) => os.map((o) => [o.getAttribute('data-v'), o.getAttribute('aria-label'), o.getAttribute('aria-checked'), o.getAttribute('data-pick'), o.getAttribute('data-ruled'), getComputedStyle(o).borderTopStyle]));
  ok(sq.length === 2 && JSON.stringify(sq.map((q) => q[1])) === JSON.stringify(['marks', 'moved'].map((v) => MW.opt.secmv.opts[v].name)) && sq[0][2] === 'true' && sq[0][3] === null && sq[0][4] === 'true' && sq[0][5] !== 'dashed' && sq[1][2] === 'false' && MW.opt.secmv.ruled === 'D-085' && MW.opt.secmv.pick === 'marks',
    'D-084 · D-085 · the option "' + MW.opt.secmv.label + '" has two icon squares — ' + sq.map((q) => q[1]).join(' · ') + ' — and the marks are pressed and RULED, filled and not dashed (his "use recommended approach", D-085)', { sq });
  await p.click('#mogrid .mrop .opt[data-mopt="secmv"][data-v="moved"]'); await p.waitForTimeout(500);
  const after = await homeCount(), lk = await look(), marksGone = await cnt(SEC + ' .mc[data-secmk]');
  const outv = await p.$eval('#out', (e) => e.value);
  ok(lk === 'moved' && marksGone === 0 && before.end.includes('429') && before.end.includes('401') && !after.end.includes('429') && !after.end.includes('401') && before.lim === 2 && after.lim === 0 && before.login === 1 && after.login === 0
     && before.inf > after.inf && before.users === 1 && after.users === 0 && after.secEnds >= 4 && outv.includes(CL.mo + ' · ' + MW.opt.secmv.label + ': ' + MW.opt.secmv.opts.moved.name + ' (' + D.words.copy.his + ')'),
    'D-084 · "' + MW.opt.secmv.opts.moved.name + '": the marks go; the 401 and 429 endings, the limiters, the login check and the row the login adds leave their rows (' + JSON.stringify(before.end) + ' → ' + JSON.stringify(after.end) + ') and stand in Security in full; the in-flight lanes leave out the limiters; the copy line says the choice', { before, after, marksGone });
  const inSec = await p.evaluate(() => ({ ik: [...document.querySelectorAll('#mogrid tr[data-f="sec"] td .mc[data-sx]')].map((c) => c.getAttribute('data-ik')), lanesOpen: document.querySelectorAll('#mogrid tr[data-f="inf"] .milf').length }));
  ok(['end:refusal', 'limiter', 'login', 'guard', 'table'].every((k) => inSec.ik.includes(k)) && inSec.lanesOpen === 0, 'D-084 · what moved in keeps its own chip and its own hover: ' + [...new Set(inSec.ik)].join(' · '), inSec);
  await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready'); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(300);
  ok((await look()) === 'moved' && (await cnt(SEC + ' .mc[data-secmk]')) === 0, 'D-084 · the choice is kept per viewer through a reload');
  await p.$eval(SEC + ' .mro', (e) => e.scrollIntoView({ block: 'center' })); await p.click(SEC + ' .mro'); await p.waitForTimeout(150); await p.click('#mogrid .mrop .opt[data-mopt="secmv"][data-v="marks"]'); await p.waitForTimeout(400);
  const back = await homeCount();
  ok((await look()) === 'marks' && JSON.stringify(back) === JSON.stringify(before), 'D-084 · "' + MW.opt.secmv.opts.marks.name + '" puts every fact back in its row as it was', { back, before });
  /* (5) a mark goes to its fact: a real click on the login mark that points to Endings flashes the two 401 endings and their row */
  const endMark = await p.evaluate(() => [...document.querySelectorAll('#mogrid tr[data-f="sec"] .mc[data-secmk="login"]')].findIndex((c) => c.innerText.indexOf('→ ' + window.__allep.data.blocks.find((b) => b.key === window.__allep.data.mo.fam.end).name) >= 0));
  const marksL = await p.$$(SEC + ' .mc[data-secmk="login"]');
  await marksL[endMark].evaluate((e) => e.scrollIntoView({ block: 'center' })); const eb = await marksL[endMark].boundingBox();
  await p.mouse.click(eb.x + eb.width / 2, eb.y + eb.height / 2); await p.waitForTimeout(450);
  const fl = await p.evaluate(() => ({ chips: [...document.querySelectorAll('#mogrid .mc.secflash')].map((c) => [c.closest('td').getAttribute('data-f'), c.getAttribute('data-sx')]), head: [...document.querySelectorAll('#mogrid th.secflash')].map((h) => h.getAttribute('data-f')) }));
  ok(endMark >= 0 && fl.chips.length === 2 && fl.chips.every(([f, g]) => f === 'end' && /^login\|end\|/.test(g)) && fl.head.includes('end'),
    'D-084 · a click on the "login check → Endings" mark scrolls to the two 401 endings and flashes them and the Endings row', { endMark, fl });
  ok(!errs.length, 'D-084 · no page error', errs); }

/* 35 · D-085 (his "use recommended approach on pending decision", and the rate limit middleware standing twice in the Security row) — smoke checks (D-037):
   (1) the Security look is RULED, marks, by D-085: filled, not dashed, the hover and the copy line say ruled; (2) the new option "a middleware with its switch": merged (my pick,
   dashed, not ruled) draws a middleware that hosts a switch ONCE — its numbered chip heads the switch inside it — apart keeps the chip and the host card as before; on POST /cooking/sessions
   by its drawn faces, and for every endpoint from the page's data against the feed (the host's chip stands in the switch's own cell); (3) it is kept per viewer and rides the copy line;
   (4) an endpoint with no switch a middleware hosts (GET /healthz) is drawn the same either way */
{ const E = 'POST /cooking/sessions', E0 = 'GET /healthz', MW = D.words.mo, O = MW.opt.secmw, CL = D.words.copy.lines, RL = 'RateLimitMiddleware', SEC = '#mogrid tr[data-f="sec"]', EDGE = SEC + ' td[data-mom="edge"]';
  const look = () => p.evaluate(() => window.__allep.mo.looks.secmw);
  const edge = () => p.evaluate((sel) => { const td = document.querySelector(sel), t = (e) => e.innerText.replace(/\s+/g, ' ').trim();
    const faces = [...td.querySelectorAll('.mc, .mgh0')].filter((e) => !e.querySelector('.mc, .mgh0')).map((e) => [e.classList.contains('mgh0') ? 'host' : e.getAttribute('data-f'), t(e)]);
    return { faces, stages: faces.filter((f) => f[0] === 'stage').map((f) => f[1]), blocks: [...td.querySelectorAll('.mgb')].map((g) => ({ head: [...g.querySelectorAll(':scope > .mgh > *')].map((h) => [h.classList.contains('mgh0') ? 'host' : h.getAttribute('data-f'), t(h)]),
      kids: [...g.querySelectorAll(':scope > .mc')].map((c) => [c.getAttribute('data-ik'), t(c)]) })), nested: td.querySelectorAll('.mc [data-tip], .mgh [data-tip] [data-tip]').length }; }, EDGE);
  const named = (d) => d.faces.filter((f) => f[1].replace(/^\d+ /, '') === RL).length;
  /* (2a) every endpoint with a switch a middleware hosts: the feed's own count, and the page's data holds the switch with its host and the host's numbered chip in the same cell */
  const hostedFeed = FEED.filter((ep) => (FJ.endpoints['endpoint:' + ep].switches || []).some((w) => w.via));
  const hostedPage = D.rows.map((r) => { const el = (r.mo || {}).el || [], sw = el.filter((e) => e[0] === 'std' && (e[7] || {}).gk === 'w' && String(((e[7] || {}).gh || [''])[0]).startsWith('middleware:'));
    return { id: r.id, sw: sw.length, apart: sw.filter((e) => !el.some((c) => c[0] === 'stage' && (c[7] || {}).rn && 'middleware:' + c[3] === e[7].gh[0] && c[1] === e[1])).length, hosts: [...new Set(sw.map((e) => e[7].gh[1]))] }; }).filter((x) => x.sw);
  const viaOf = (ep) => [...new Set((FJ.endpoints['endpoint:' + ep].switches || []).filter((w) => w.via).map((w) => w.via))];
  ok(hostedFeed.length > 1 && JSON.stringify(hostedPage.map((x) => x.id).sort()) === JSON.stringify(hostedFeed) && hostedPage.every((x) => x.apart === 0 && JSON.stringify(x.hosts) === JSON.stringify(viaOf(x.id))) && !hostedFeed.includes(E0),
    'D-085 · the feed gives ' + hostedFeed.length + ' endpoints a switch a middleware hosts (' + [...new Set(hostedFeed.flatMap(viaOf))].join(', ') + '); the page draws each switch with its host, and the host\'s numbered chip stands at the same moment on every one, so merging holds on all of them; ' + E0 + ' has none', { hostedFeed: hostedFeed.length, page: hostedPage.length, apart: hostedPage.filter((x) => x.apart).map((x) => x.id) });
  /* (1) the Security look is ruled; (2) the new option's squares, my pick, merged, dashed (the table in one piece, as section 34 reads it: in bands the row's head would be drawn once per band) */
  await open(PAGE); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(400);
  await p.$eval(SEC + ' .mro', (e) => e.scrollIntoView({ block: 'center' })); await p.click(SEC + ' .mro'); await p.waitForTimeout(150);
  const sq = (g) => p.$$eval('#mogrid .mrop .opt[data-mopt="' + g + '"]', (os) => os.map((o) => [o.getAttribute('data-v'), o.getAttribute('aria-label'), o.getAttribute('aria-checked'), o.getAttribute('data-pick'), o.getAttribute('data-ruled'), getComputedStyle(o).borderTopStyle]));
  const sv = await sq('secmv'), sw = await sq('secmw');
  ok(sv[0][0] === 'marks' && sv[0][2] === 'true' && sv[0][3] === null && sv[0][4] === 'true' && sv[0][5] !== 'dashed' && MW.opt.secmv.ruled === 'D-085',
    'D-085 · the Security look "' + MW.opt.secmv.label + '" is RULED: "' + MW.opt.secmv.opts.marks.name + '" is pressed, filled and not dashed', { sv });
  ok(sw.length === 2 && JSON.stringify(sw.map((q) => q[0])) === JSON.stringify(['merged', 'apart']) && JSON.stringify(sw.map((q) => q[1])) === JSON.stringify([O.opts.merged.name, O.opts.apart.name]) && O.pick === 'merged' && !O.ruled
     && sw[0][2] === 'true' && sw[0][3] === 'true' && sw[0][4] === null && sw[0][5] === 'dashed' && sw[1][2] === 'false' && sw[1][3] === null,
    'D-085 · the option "' + O.label + '" sits in the Security row\'s own options beside the Security look: two icon squares — ' + sw.map((q) => q[1]).join(' · ') + ' — and my pick, merged, is pressed and DASHED (not ruled: D-085 leaves it his)', { sw });
  const tip = async (sel) => { const h = await p.$(sel), bx = await h.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(140); const t = await tipTxt(); await p.mouse.move(5, 5); return t; };
  const tS = await tip('#mogrid .mrop .opt[data-mopt="secmv"][data-v="marks"]'), tM = await tip('#mogrid .mrop .opt[data-mopt="secmw"][data-v="merged"]');
  ok(tS.includes(MW.opt.secmv.opts.marks.name) && tS.includes(D.words.ruledMark) && !tS.includes(D.words.pickMark) && tM.includes(O.opts.merged.name) && tM.includes(D.words.pickMark) && tM.includes(O.opts.merged.plain.slice(0, 40)),
    'D-085 · the hover of the ruled Security look says ruled, the hover of merged says my pick and what it does', { tS: tS.slice(0, 80), tM: tM.slice(0, 80) });
  await p.click(SEC + ' .mro'); await p.waitForTimeout(100);
  /* (2b) merged: the middleware once, its numbered chip heading the switch it hosts, the run order kept */
  const mg = await edge(), want = Object.entries(FJ.middleware).map(([k, m]) => [k.split(':')[1], m.order.runs]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
  ok((await look()) === 'merged' && named(mg) === 1 && mg.blocks.length === 1 && mg.blocks[0].head.length === 1 && mg.blocks[0].head[0][0] === 'stage' && mg.blocks[0].head[0][1] === '2 ' + RL
     && mg.blocks[0].kids.length === 1 && mg.blocks[0].kids[0][0] === 'switch' && JSON.stringify(mg.stages) === JSON.stringify(want.map((n, i) => (i + 1) + ' ' + n)) && mg.nested === 0,
    'D-085 · merged: ' + RL + ' stands ONCE at the edge — its numbered chip "2 ' + RL + '" heads the switch it hosts — and the run order is still ' + want.join(' · '), { mg });
  /* (2c) apart: as the row drew it before — the numbered chip in the run order, and the host card of the switch */
  await p.click(SEC + ' .mro'); await p.waitForTimeout(150); await p.click('#mogrid .mrop .opt[data-mopt="secmw"][data-v="apart"]'); await p.waitForTimeout(450);
  const ap = await edge(), outv = await p.$eval('#out', (e) => e.value);
  ok((await look()) === 'apart' && named(ap) === 2 && ap.blocks.length === 1 && ap.blocks[0].head.length === 1 && ap.blocks[0].head[0][0] === 'host' && ap.blocks[0].head[0][1] === RL && ap.blocks[0].kids.length === 1 && ap.blocks[0].kids[0][0] === 'switch'
     && ap.stages.includes('2 ' + RL) && JSON.stringify(ap.stages) === JSON.stringify(want.map((n, i) => (i + 1) + ' ' + n)) && ap.nested === 0,
    'D-085 · apart: as before — "2 ' + RL + '" in the run order and, again, ' + RL + ' as the head of the card that holds its switch', { ap });
  ok(outv.includes(CL.mo + ' · ' + O.label + ': ' + O.opts.apart.name + ' (' + D.words.copy.his + ')') && !outv.includes(O.opts.merged.name), 'D-085 · the choice rides the copy line: "' + O.label + ': ' + O.opts.apart.name + '" as his', { line: outv.split('\n').find((l) => l.includes(O.label)) });
  /* (3) kept per viewer through a reload */
  await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready'); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(400);
  ok((await look()) === 'apart' && named(await edge()) === 2, 'D-085 · the choice is kept per viewer through a reload');
  /* (2d) the same on other endpoints — the first, a middle one and the last that have such a switch — apart then merged; (4) GET /healthz is the same either way */
  const sample = [hostedFeed[0], hostedFeed[Math.floor(hostedFeed.length / 2)], hostedFeed[hostedFeed.length - 1]], seen = [];
  for (const look1 of ['apart', 'merged']) { await p.evaluate((l) => { const A = window.__allep; A.mo.looks.secmw = l; localStorage.setItem(A.mo.key, JSON.stringify(A.mo.looks)); }, look1); await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready');
    for (const ep of sample.concat([E0])) { await p.evaluate((e) => window.__allep.pick(e), ep); await p.waitForTimeout(300); const d = await edge(), h = viaOf(ep).length ? viaOf(ep)[0] : null;
      seen.push([look1, ep, h ? named({ faces: d.faces.map((f) => [f[0], f[1].replace(RL, h)]) }) : d.blocks.length, d.stages.length, d.nested]); } }
  const okS = seen.every(([l, ep, n, st, ne]) => ne === 0 && st === 3 && (ep === E0 ? n === 0 : n === (l === 'merged' ? 1 : 2)));
  ok(okS && seen.length === 8, 'D-085 · the same on ' + sample.join(' · ') + ': apart draws each host twice, merged once, the run order of three stands; ' + E0 + ' has no switch a middleware hosts and draws no block either way', { seen });
  ok(!errs.length, 'D-085 · no page error', errs); }

/* 36 · D-088 (his, on the endpoint lab's hover: "much more beautiful, better structured, and more detailed … I need that for the hover information that we show, especially on these cells.
   In all the examples, we go and check how we did it in the frontend lab") — the lab's card is THE hover of every element on BY MOMENT's cells and on the examples bench. Smoke checks (D-086:
   one pass, no mutants, no walk), by REAL hovers on POST /cooking/sessions, in the page's two Data effects looks (the table's nodes in the map; its chips):
   (1) every element target draws a card, counted by kind — no kind unknown, none left on the old text path; (2) each card has its head (glyph + name), identity lines, the rule, a pill or a mark,
   and a footer exactly where a click does something; (3) no card carries a kind's plain line; (4) the renderer reported no issue (P1.1 · P2.1 · P4.1 · P8.1), and the guard FIRES on a card made to
   break each rule and stays silent on a clean one; (5) the frame is the lab's, read from the lab's source: panel colour, border, radius, padding, width range, the 12px floor on every text;
   (6) the card follows the bench: a look set on a kind of the bench is the card's; (7) heads and controls keep the short hover; (8) the one-sentence form reaches the card */
{ const E = 'POST /cooking/sessions', ROWIDS = D.rows.map((r) => r.id), TIPS = D.words.mo.card.foot, LABST = fs.readFileSync(path.join(HERE, '_station.js'), 'utf8'), LABCSS = fs.readFileSync(path.join(HERE, '_lab-ep.css'), 'utf8');
  const TARGETS = '#sec-mo [data-tip="mochip"], #sec-mo [data-tip="modxn"], #sec-mo [data-tip="mojy"], #sec-mo [data-tip="moilf"], #sec-ex [data-tip="exblk"]';
  const plains = []; { const take = (o) => { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === 'plain' && typeof v === 'string' && v.length > 24) plains.push(v); else take(v); } };
    take(D.words.mo.io.k); take(D.words.ex.kinds); take(D.words.ex.roles); take(D.words.kinds); }
  const readCard = () => p.evaluate(() => { const t = document.getElementById('tip'), c = t.querySelector('.cdc'); if (!c) return { card: null, cd: t.classList.contains('cd'), show: t.getAttribute('data-show') };
    const all = [...c.querySelectorAll('*')], small = all.filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => e.className + ':' + getComputedStyle(e).fontSize);
    return { card: c.getAttribute('data-card'), cik: c.getAttribute('data-ik'), bench: c.getAttribute('data-bench'), bound: c.getAttribute('data-bound'), issues: +c.getAttribute('data-card-issues'), issue: c.getAttribute('data-card-issue'),
      unknown: c.hasAttribute('data-card-unknown-kind') ? c.getAttribute('data-card-unknown-kind') : null, glyph: !!c.querySelector('.cdh .cdg svg'), name: ((c.querySelector('.cdh b') || {}).textContent || '').trim(), kind: ((c.querySelector('.cdh .cdv') || {}).textContent || '').trim(),
      idents: c.querySelectorAll('.cdl').length, rule: !!c.querySelector('.cdsep'), pills: c.querySelectorAll('.cdpill, .cdfp').length, marks: c.querySelectorAll('.mx').length, foot: ((c.querySelector('.cdfoot') || {}).textContent || '').trim(),
      rowsN: c.querySelectorAll('.cdw:not(.cdmore)').length, sentN: c.querySelectorAll('.cdw[data-k="@s"]').length, noLine: c.querySelectorAll('.cdw:not(.cdmore):not([data-line])').length,
      ledN: [...c.querySelectorAll('.cdw:not(.cdmore)')].filter((r) => r.querySelector('.cdwl, .cdch, .cdpill')).length, chipN: c.querySelectorAll('.cdd .cdch, .cdd .cdrw, .cdd .cdpill').length, tailN: c.querySelectorAll('.cdd .cdwt').length,
      text: c.textContent.replace(/\s+/g, ' '), small, cd: t.classList.contains('cd'), show: t.getAttribute('data-show'), rect: (() => { const r = t.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })() }; });
  /* one real hover per target; the rows keep what the target is, so each card is read against it */
  const sweep = async () => { const hs = await p.$$(TARGETS), n = hs.length, out = [];
    for (let i = 0; i < n; i++) { const h = hs[i]; await h.evaluate((x) => x.scrollIntoView({ block: 'center' })); const bx = await h.boundingBox();
      const meta = await h.evaluate((x) => ({ tip: x.getAttribute('data-tip'), ik: x.getAttribute('data-ik'), exk: x.getAttribute('data-exk'), click: x.hasAttribute('data-key') || x.hasAttribute('data-secmk') || x.getAttribute('data-tip') === 'exblk' || x.getAttribute('data-tip') === 'moilf' }));
      if (!bx) { out.push({ ...meta, miss: true }); continue; }
      /* CHANGED D-092: a block is hovered on a part of its own card (one with no hover item inside) — the old point, 30px in and 10px down, fell between the glyph
         and its status, a gap that is now quiet */
      const own = meta.tip === 'exblk' ? await h.evaluate((x) => { const q = [...x.querySelectorAll('[data-part]:not([data-tip])')].filter((n) => !n.querySelector('[data-tip]') && n.getBoundingClientRect().width)[0]; if (!q) return null; const r = q.getBoundingClientRect(); return { x: r.left + Math.min(r.width / 2, 30), y: r.top + r.height / 2 }; }) : null;
      await p.mouse.move(5, 5); await p.mouse.move(own ? own.x : bx.x + Math.min(bx.width / 2, 30), own ? own.y : bx.y + Math.min(bx.height / 2, 10)); await p.waitForTimeout(25); out.push({ ...meta, ...(await readCard()) }); }
    await p.mouse.move(5, 5); return out; };
  const byKind = (rows) => { const o = {}; rows.forEach((r) => { const k = r.card + (r.bench ? '/' + r.bench : ''); o[k] = (o[k] || 0) + 1; }); return o; };
  const judge = (rows, what) => {
    const bad = rows.filter((r) => !r.card), noGlyph = rows.filter((r) => r.card && (!r.glyph || !r.name)), noIdent = rows.filter((r) => r.card && !r.idents), noRule = rows.filter((r) => r.card && !r.rule), noPill = rows.filter((r) => r.card && !r.pills && !r.marks),
      footWrong = rows.filter((r) => r.card && (r.click ? ![TIPS.lit, TIPS.go, TIPS.open, TIPS.close].includes(r.foot) && !/^(show|fold)/.test(r.foot) : r.foot !== '')), plainOn = rows.filter((r) => r.card && plains.some((q) => r.text.includes(q))), small = rows.filter((r) => r.card && r.small.length),
      issues = rows.filter((r) => r.issues), unknown = rows.filter((r) => r.unknown), notCd = rows.filter((r) => r.card && !r.cd);
    ok(rows.length >= 100 && !bad.length && !notCd.length, 'D-088 · ' + what + ': every one of the ' + rows.length + ' element targets draws a card in the lab\'s frame, by a real hover', { bad: bad.slice(0, 3), notCd: notCd.length });
    ok(!noGlyph.length && !noIdent.length && !noRule.length && !noPill.length, 'D-088 · ' + what + ': each card has its head (the glyph and the bold name), identity lines, the rule, and a pill or a mark', { noGlyph: noGlyph.map((r) => r.card + ':' + r.name).slice(0, 4), noIdent: noIdent.map((r) => r.card + ':' + r.name).slice(0, 4), noRule: noRule.length, noPill: noPill.map((r) => r.card + ':' + r.name).slice(0, 4) });
    ok(!footWrong.length, 'D-088 · ' + what + ': the footer says what a click does, on exactly the elements a click does something to', footWrong.map((r) => r.card + ':' + r.name + ' → ' + r.foot).slice(0, 4));
    ok(!plainOn.length, 'D-088 · ' + what + ': no card carries a kind\'s plain line (P1.1) — it stays on the legend and on heads and controls', plainOn.map((r) => r.card + ':' + r.name).slice(0, 3));
    ok(!issues.length && !unknown.length, 'D-088 · ' + what + ': the renderer reported no issue on any card (P1.1 · P2.1 · P4.1 · P8.1) and no kind it does not know', { issues: issues.map((r) => r.card + ':' + r.name + ' → ' + r.issue).slice(0, 4), unknown: unknown.map((r) => r.ik).slice(0, 4) });
    const cards = rows.filter((r) => r.card), tot = cards.reduce((n, r) => n + r.rowsN, 0), sent = cards.reduce((n, r) => n + r.sentN, 0), noLine = cards.filter((r) => r.noLine), unled = cards.filter((r) => r.rowsN > r.ledN), counted = cards.filter((r) => /counted in/.test(r.text));
    const hs = cards.map((r) => r.rect.h).sort((x, y) => x - y), p90 = hs[Math.floor(hs.length * 0.9)], med = hs[hs.length >> 1];
    ok(tot > 200 && sent / tot <= 0.25 && !noLine.length && !unled.length, 'D-088 · ' + what + ': the lower part of a card is rows, not sentences — ' + tot + ' rows, ' + sent + ' of them a generator sentence with no structure (at most a quarter), each led by an icon, a pill or a chip, each carrying its sentence in data-line', { tot, sent, noLine: noLine.length, unled: unled.map((r) => r.card + ':' + r.name).slice(0, 3) });
    ok(cards.reduce((n, r) => n + r.chipN, 0) > 40 && cards.reduce((n, r) => n + r.tailN, 0) > 20, 'D-088 · ' + what + ': facts are drawn as chips, marks and pills (' + cards.reduce((n, r) => n + r.chipN, 0) + ') with their place set quiet at the row\'s end (' + cards.reduce((n, r) => n + r.tailN, 0) + ' rows)');
    ok(!counted.length, 'D-088 · ' + what + ': no card carries the line that says which columns of the table count it (that is about the page, P2.1)', counted.map((r) => r.card + ':' + r.name).slice(0, 3));
    ok(p90 <= 480 && med <= 380, 'D-088 · ' + what + ': cards stay compact — median ' + med + 'px, nine in ten under ' + p90 + 'px (the lab\'s own run 142 to 261; a long list ends with "+N more")', { med, p90, max: hs[hs.length - 1] });
    ok(!small.length && rows.filter((r) => r.card).every((r) => r.rect.w >= 210 && r.rect.w <= 362), 'D-088 · ' + what + ': every text on a card is 12px or more, and its width stays in the lab\'s range (210 to 360)', small.map((r) => r.card + ':' + r.small.join()).slice(0, 3)); };

  /* (1)-(5), the table's chips (the probe's own opening look: Data effects as chips) */
  await open(PAGE); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(500);
  await p.evaluate(() => { window.__allepCard.log.length = 0; });
  const rowsA = await sweep(); judge(rowsA, 'Data effects as chips');
  const kA = byKind(rowsA); console.log('  D-088 cards by kind (chips look): ' + JSON.stringify(kA));
  /* (1) the bench: one card for each of its eight kinds, bound to the kind it is */
  const benchKinds = D.ex.kinds, bench = rowsA.filter((r) => r.bench);
  ok(bench.length === benchKinds.length && benchKinds.every((k) => bench.some((r) => r.bench === k && r.card === k)), 'D-088 · the examples bench: its ' + benchKinds.length + ' elements (' + benchKinds.join(' · ') + ') each draw a card of their own kind', bench.map((r) => r.card));
  /* the kinds of BY MOMENT: every kind of chip the endpoint draws has a card of a kind the page knows; the counts by kind are the page's own targets */
  const tgtN = await p.evaluate((sel) => { const o = {}; document.querySelectorAll(sel).forEach((n) => { const k = n.getAttribute('data-tip') + '|' + (n.getAttribute('data-ik') || ''); o[k] = (o[k] || 0) + 1; }); return o; }, '#sec-mo [data-tip="mochip"], #sec-mo [data-tip="modxn"], #sec-mo [data-tip="mojy"], #sec-mo [data-tip="moilf"]');
  const rowN = {}; rowsA.filter((r) => !r.bench).forEach((r) => { const k = r.tip + '|' + (r.ik || ''); rowN[k] = (rowN[k] || 0) + 1; });
  const dif = Object.keys({ ...tgtN, ...rowN }).filter((k) => tgtN[k] !== rowN[k]).map((k) => k + ' drawn ' + tgtN[k] + ', hovered ' + rowN[k]);
  ok(!dif.length && Object.keys(tgtN).length >= 20, 'D-088 · ' + Object.keys(tgtN).length + ' kinds of element target on this endpoint, each hovered as many times as it is drawn', dif);
  /* (4) the guard fires on a card made to break each rule, stays silent on a clean one */
  const gd = await p.evaluate(() => { const C = window.__allepCard, t = document.querySelector('#sec-mo .mc[data-tip="mochip"][data-ik="fn"]'), S0 = C.subject(t), html = C.make(S0.ck, S0), box = document.createElement('div'); box.innerHTML = html; const root = () => box.firstChild.cloneNode(true);
    const run = (mut, F) => { const r = root(); mut(r); return C.guard(r, F || { joins: [] }); }, plain = Object.values(window.__allep.data.words.mo.io.k).map((q) => q.plain).filter((q) => q && q.length > 24)[0], mk = (c, txt, at) => { const n = document.createElement('span'); n.className = c; n.textContent = txt; if (at) Object.entries(at).forEach(([k, v]) => n.setAttribute(k, v)); return n; };
    return { clean: run(() => {}), p21: run((r) => r.appendChild(mk('cdt', 'drawn as the map draws it'))), p21b: run((r) => r.appendChild(mk('cdt', 'found by the page'))), p11label: run((r) => r.appendChild(mk('cdv', 'a label that runs far past the short limit', { 'data-shared': '1' }))),
      p11plain: run((r) => r.appendChild(mk('cdt', plain))), p41: run(() => {}, { joins: [{ end: 'caller', want: ['no_such_function_anywhere'] }] }), p81: run((r) => r.appendChild(mk('cdfp', '0', { 'data-unit': 'fields', 'data-n': '0', 'aria-label': '0 things' }))),
      p81unk: run((r) => r.appendChild(mk('cdfp', '0', { 'data-unit': 'fields', 'data-n': '', 'aria-label': '' }))), p81unit: run((r) => r.appendChild(mk('cdfp', '3', { 'data-unit': 'nothing', 'data-n': '3' }))), form: run((r) => r.querySelector('.cdh .cdg').remove()) }; });
  ok(gd.clean.length === 0 && gd.p21.some((i) => i.startsWith('p2.1')) && gd.p21b.some((i) => i.startsWith('p2.1')) && gd.p11label.some((i) => i.startsWith('p1.1')) && gd.p11plain.some((i) => i.startsWith('p1.1')) && gd.p41.some((i) => i.startsWith('p4.1'))
    && gd.p81.some((i) => i.startsWith('p8.1')) && gd.p81unk.some((i) => i.startsWith('p8.1')) && gd.p81unit.some((i) => i.startsWith('p8.1')) && gd.form.some((i) => i.startsWith('form')),
    'D-088 · the guard stays silent on a clean card and fires on each rule: P1.1 (a long label, a kind\'s plain line) · P2.1 (words about the map or the page) · P4.1 (a join\'s other end not named) · P8.1 (a count not from its unit, a 0 for what is not recorded) · the card\'s form', gd);
  ok((await p.evaluate(() => window.__allepCard.log.length)) === 0, 'D-088 · the renderer\'s log holds no issue after all ' + rowsA.length + ' hovers');
  /* (5) the frame is the lab's: its values read from the lab's own source, never typed here */
  const lab = { panel: (/--panel:\s*(#[0-9a-f]{6})/i.exec(LABST) || [])[1], line: (/--line:\s*(#[0-9a-f]{6})/i.exec(LABST) || [])[1], radius: (/\.jdcolpop\{[^}]*border-radius:(\d+)px/.exec(LABST) || [])[1], pad: (/\.jdcolpop\{[^}]*padding:(\d+)px (\d+)px/.exec(LABST) || []).slice(1, 3).join(' '),
    shadow: (/\.jdcolpop\{[^}]*box-shadow:([^;]+);/.exec(LABST) || [])[1], min: (/\.jdcolpop\{[^}]*min-width:(\d+)px/.exec(LABST) || [])[1], max: (/#hover\{ max-width:(\d+)px; \}/.exec(LABCSS) || [])[1] };
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return 'rgb(' + (n >> 16) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ')'; };
  await p.$eval('#sec-mo', (e) => e.scrollIntoView({ block: 'start' })); const fn1 = await p.$('#sec-mo .mc[data-tip="mochip"][data-ik="fn"]'); await fn1.evaluate((x) => x.scrollIntoView({ block: 'center' })); const fb = await fn1.boundingBox(); await p.mouse.move(fb.x + 12, fb.y + 6); await p.waitForTimeout(80);
  const fr = await p.$eval('#tip', (e) => { const c = getComputedStyle(e); return { bg: c.backgroundColor, bd: c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor, radius: c.borderTopLeftRadius, pad: c.paddingTop + ' ' + c.paddingLeft, shadow: c.boxShadow, minw: c.minWidth, maxw: c.maxWidth }; });
  ok(lab.panel && lab.line && lab.radius && lab.pad && lab.min && lab.max && fr.bg === rgb(lab.panel) && fr.bd === '1px solid ' + rgb(lab.line) && fr.radius === lab.radius + 'px' && fr.pad === lab.pad.split(' ').join('px ') + 'px' && fr.minw === lab.min + 'px' && fr.maxw === lab.max + 'px'
    && fr.shadow.includes('0px ' + /0 (\d+)px (\d+)px/.exec(lab.shadow).slice(1, 3).join('px ') + 'px'), 'D-088 · the frame is the lab\'s, read from its source: panel ' + lab.panel + ' · border 1px ' + lab.line + ' · radius ' + lab.radius + 'px · padding ' + lab.pad + ' · width ' + lab.min + '–' + lab.max + 'px', { lab, fr });
  await p.mouse.move(5, 5);
  /* (6) the card follows the bench: the fn glyph's colour rule and the table's chip box set on the bench are the card's */
  const glyphCol = () => p.evaluate(() => { const g = document.querySelector('#tip .cdh .cdg svg'); return g ? getComputedStyle(g).color : null; });
  const hoverFn = async () => { const h = await p.$('#sec-mo .mc[data-tip="mochip"][data-ik="fn"][data-keys^="fn:apps/api/services/cooking.py::start_session"]'); await h.evaluate((x) => x.scrollIntoView({ block: 'center' })); const b2 = await h.boundingBox(); await p.mouse.move(5, 5); await p.mouse.move(b2.x + 12, b2.y + 6); await p.waitForTimeout(60); };
  await hoverFn(); const g0 = await glyphCol(); await p.mouse.move(5, 5);
  /* CHANGED 2026-10-05 (D-093, his: "glyph color won't change. It would be its kind's color in every case"): the glyph's colour is no setting any more — a look that asks for "quiet" is put back to the kind's colour, on the bench and on the card */
  await p.evaluate(() => window.__allepEx.set('fn', (L) => { L.iconCol = 'muted'; })); await p.waitForTimeout(80); await hoverFn(); const g1 = await glyphCol(); await p.mouse.move(5, 5);
  const bch = await p.$eval('#exgrid .excol[data-k="fn"] .blk [data-part="icon"] svg', (e) => getComputedStyle(e).color), mut = await p.$eval('#sec-ex', (e) => getComputedStyle(e).getPropertyValue('--muted').trim());
  const ic93 = await p.evaluate(() => window.__allepEx.state.col.fn.look.iconCol);
  ok(g0 && g1 && g0 === g1 && ic93 === 'kind', 'D-093 · the glyph keeps its kind\'s colour: a look set to "quiet" is put back, and the card\'s glyph is the same colour before and after (' + g0 + ' · ' + g1 + ')', { g0, g1, bch, mut, ic93 });
  const chipR = async () => { const h = await p.$('#sec-mo .mdxn[data-keys*="table:cooking_sessions"], #sec-mo .mc[data-ik="table"][data-keys*="table:cooking_sessions"]'); if (!h) return null; await h.evaluate((x) => x.scrollIntoView({ block: 'center' })); const b3 = await h.boundingBox(); await p.mouse.move(5, 5); await p.mouse.move(b3.x + 6, b3.y + 6); await p.waitForTimeout(60);
    return p.evaluate(() => { const c = document.querySelector('#tip .cdr[data-row="channel"] .cdpill'); return c ? getComputedStyle(c).borderTopLeftRadius : null; }); };
  const r0 = await chipR(); await p.evaluate(() => window.__allepEx.set('table', (L) => { L.rwBox = 'square'; })); await p.waitForTimeout(60); const r1 = await chipR(); await p.evaluate(() => window.__allepEx.set('table', (L) => { L.rwBox = 'pill'; })); await p.mouse.move(5, 5);
  ok(r0 && r1 && r0 !== r1 && r1 === '0px', 'D-088 · the table card\'s channel pill takes the bench\'s chip box: pill (' + r0 + ') → square (' + r1 + ')', { r0, r1 });
  /* (7) heads and controls keep the short hover — the card's frame is on only while a card is drawn */
  await hoverFn(); const onCard = await p.$eval('#tip', (e) => e.classList.contains('cd') && !!e.querySelector('.cdc')); await p.mouse.move(5, 5);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.hover('.opt[data-rail="lay"]'); await p.waitForTimeout(80);
  const hh = await p.$eval('#tip', (e) => ({ cd: e.classList.contains('cd'), cdc: !!e.querySelector('.cdc'), text: e.textContent.length, show: e.getAttribute('data-show') })); await p.mouse.move(5, 5);
  ok(onCard && !hh.cd && !hh.cdc && hh.show === 'true' && hh.text > 0, 'D-088 · a control keeps its short hover after a card (no card frame, no card): the card is for elements', { onCard, hh });
  /* (8) the one-sentence form (the hovers option) reaches the card */
  await p.evaluate(() => { window.__allep.mo.looks.ipo = 'sent'; }); await hoverFn();
  const sn = await p.$eval('#tip', (e) => ({ sent: !!e.querySelector('.cdc .iosent'), parts: e.querySelectorAll('.cdc .io > i').length })); await p.mouse.move(5, 5); await p.evaluate(() => { window.__allep.mo.looks.ipo = 'lines'; });
  ok(sn.sent && sn.parts === 0, 'D-088 · the hovers option\'s one-sentence form is the card\'s too: the three parts joined, no part headings', sn);
  ok(!errs.length, 'D-088 · no page error', errs.slice(0, 3));
  /* (1) again, in the page's own default looks: the Data effects map's nodes are tables and functions, a lane folds in-flight values */
  await open(PAGE, 'default'); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(500); await p.evaluate(() => { window.__allepCard.log.length = 0; });
  const rowsB = await sweep(); judge(rowsB, 'Data effects as a map (the page\'s own looks)'); console.log('  D-088 cards by kind (map look): ' + JSON.stringify(byKind(rowsB)));
  ok(rowsB.some((r) => r.card === 'table' && r.tip === 'modxn') && rowsB.some((r) => r.card === 'fn' && r.tip === 'modxn') && rowsB.some((r) => r.card === 'lane'), 'D-088 · in the map look the tables and functions of the data map and the in-flight lane draw cards too', byKind(rowsB));
  ok(!errs.length, 'D-088 · no page error after the second look', errs.slice(0, 3));
  /* every endpoint, not only this one: the renderer is called on every element target of all 80 endpoints (no hover — the cards are made and their rules read), in the page's own looks */
  const allN = { cards: 0, issues: [], unknown: [], errors: [], kinds: new Set() };
  for (const id of ROWIDS) { await p.evaluate((ep) => window.__allep.pick(ep), id); await p.waitForTimeout(60);
    const r = await p.evaluate(() => { const C = window.__allepCard, o = { n: 0, issues: [], unknown: [], errs: [], kinds: [] };
      document.querySelectorAll('#sec-mo [data-tip="mochip"], #sec-mo [data-tip="modxn"], #sec-mo [data-tip="mojy"], #sec-mo [data-tip="moilf"], #sec-ex [data-tip="exblk"]').forEach((t) => { try { const S0 = C.subject(t); if (!S0) { o.errs.push('no subject for ' + t.getAttribute('data-tip')); return; }
        const d = document.createElement('div'); d.innerHTML = C.make(S0.ck, S0); const c = d.firstChild; o.n++; o.kinds.push(S0.ck); if (+c.getAttribute('data-card-issues')) o.issues.push(S0.ck + ':' + ((c.querySelector('.cdh b') || {}).textContent || '') + ' → ' + c.getAttribute('data-card-issue')); if (c.hasAttribute('data-card-unknown-kind')) o.unknown.push(c.getAttribute('data-card-unknown-kind')); } catch (e) { o.errs.push(e.message); } });
      return o; });
    allN.cards += r.n; r.issues.forEach((x) => allN.issues.push(id + ' · ' + x)); r.unknown.forEach((x) => allN.unknown.push(x)); r.errs.forEach((x) => allN.errors.push(id + ' · ' + x)); r.kinds.forEach((k) => allN.kinds.add(k)); }
  console.log('  D-088 every endpoint: ' + allN.cards + ' cards over ' + ROWIDS.length + ' endpoints · kinds ' + [...allN.kinds].sort().join(' '));
  ok(ROWIDS.length === FEED.length && allN.cards > 5000 && !allN.issues.length && !allN.unknown.length && !allN.errors.length, 'D-088 · all ' + ROWIDS.length + ' endpoints: ' + allN.cards + ' element cards made, none with a renderer issue (P1.1 · P2.1 · P4.1 · P8.1), none of a kind it does not know, none that fails to draw',
    { issues: allN.issues.slice(0, 3), unknown: allN.unknown.slice(0, 3), errors: allN.errors.slice(0, 3) });
  ok(!errs.length, 'D-088 · no page error over all endpoints', errs.slice(0, 3)); }

/* 37 · D-089 (his, configuring the ending on the examples bench: "the hover should work as it is today … if we hover over the icon of the glyph and the status, it should give a different hover only
   regarding the glyph and the status. For the items at the end in the last row, each item should have its own hover notice about what it is … three regions for hovering: the first section for
   the two items, for the title, and then for each one of the where sections"). By REAL hovers on POST /cooking/sessions' ending (429 · the sensitive limit), the bench's default layout:
   (1) his configuration is untouched — the copy line of the default ending column is byte-identical to the one the page gave before this change, its storage key, part ids and defaults are as they were,
       and hovering writes nothing to storage;
   (2) each part carries its region by data (EX.regions): glyph and status → head · title, stage, ways → the block's own card · where and each mark of the strip → items; no other node of the block, and
       no other kind's block, carries a hover of its own;
   (3) the glyph and the status each give the ONE glyph-and-status card — the kind in its colour with its glyph, what the status means, who else gives the status — and it holds no title row, no where row and no part;
   (4) the title (and the stage and the ways) give the block's full card, byte-for-byte the D-088 card;
   (5) the where line and each mark give a card of their own, distinct per item, each saying what the item is and this ending's fact for it; the gap between two marks is no item (the block's card);
   (6) the regions follow a part moved to another line, a hidden part has no region, and moving everything back restores the copy line byte-for-byte;
   (7) every ending of every endpoint: its head, where and mark cards are made through card() and its guard — none with an issue (P1.1 · P2.1 · P4.1 · P8.1), and the guard fires on a region card made to break a rule */
{ const E = 'POST /cooking/sessions', CEND = '#exgrid .excol[data-k="end"]', BLK = CEND + ' .blk';
  /* the default ending column's copy line, as the page gave it BEFORE this change (commit 7c2bcc1) — pinned, never recomputed */
  const BASE_COPY = 'examples · ending · 429 · sensitive limit: 20 per 60 seconds · Rate limit exceeded. Try again shortly. · on POST /cooking/sessions · block block (glyph on, its kind\'s colour, status on, words on, stage on, ways badge, where both) · edge left solid 2px · chips count pill 100%, status pill 90% · lines glyph · status | stage / words | ways / where | — · sizes glyph 13, status 12, words 13, stage 12, ways 12, where 12 · squares 14px gap 4 round as symbol by type · not drawn — · width dynamic (my pick)';
  const BASE_LOOK = { rows: [{ l: ['icon', 'status'], r: ['stage'] }, { l: ['name'], r: ['count'] }, { l: ['via'], r: [] }], size: { icon: 13, status: 12, name: 13, stage: 12, count: 12, via: 12 }, iconCol: 'kind' };
  const hoverAt = async (h) => { await h.evaluate((x) => x.scrollIntoView({ block: 'center' })); const bx = await h.boundingBox(); await p.mouse.move(5, 5); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(80); };
  const card = () => p.evaluate(() => { const t = document.getElementById('tip'), c = t.querySelector('.cdc'); if (!c) return null;
    const small = [...c.querySelectorAll('*')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => e.className);
    return { card: c.getAttribute('data-card'), reg: c.getAttribute('data-reg'), rp: c.getAttribute('data-rp'), ri: c.getAttribute('data-ri'), bench: c.getAttribute('data-bench'), issues: +c.getAttribute('data-card-issues'), issue: c.getAttribute('data-card-issue'),
      name: ((c.querySelector('.cdh b') || {}).textContent || '').trim(), label: ((c.querySelector('.cdh .cdv') || {}).textContent || '').trim(), glyph: !!c.querySelector('.cdh .cdg svg'), nameCol: (c.querySelector('.cdh b') || {}).style ? c.querySelector('.cdh b').style.color : '',
      lines: [...c.querySelectorAll('.cdl')].map((l) => l.getAttribute('data-ln')), parts: c.querySelectorAll('.cdd .io').length, rows: c.querySelectorAll('.cdd .cdw:not(.cdmore)').length, pills: [...c.querySelectorAll('.cdpill')].map((q) => q.textContent),
      text: c.textContent.replace(/\s+/g, ' ').trim(), html: t.innerHTML, small, cd: t.classList.contains('cd'), show: t.getAttribute('data-show'), w: Math.round(t.getBoundingClientRect().width), h: Math.round(t.getBoundingClientRect().height), foot: ((c.querySelector('.cdfoot') || {}).textContent || '').trim() }; });
  const hoverCard = async (css, i = 0) => { const hs = await p.$$(css); if (!hs[i]) return null; await hoverAt(hs[i]); return card(); };
  const WR = D.words.ex.region, WX = D.words.ex, GDC = D.words.enc.fam.gdc.vals;
  await open(PAGE); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(500);
  const store0 = await p.evaluate(() => { try { return window.localStorage.getItem('gabe:allep:bench:v3'); } catch (e) { return 'no storage'; } });
  /* (1) his configuration is untouched */
  const cp0 = await p.evaluate(() => window.__allepEx.copy('end'));
  ok(cp0 === BASE_COPY, 'D-089 · his configuration: the copy line of the default ending column is byte-identical to the one before the change', { now: cp0.slice(0, 160) });
  const keys = await p.evaluate(() => ({ key: window.__allepEx.key, look: window.__allep.data.ex.look.end, lookKeys: Object.keys(window.__allep.data.ex.look.end), regions: window.__allep.data.ex.regions, parts: Object.keys(window.__allep.data.words.ex.parts.end), cur: window.__allepEx.current('end').id }));
  ok(keys.key === 'gabe:allep:bench:v3' && JSON.stringify(keys.parts) === JSON.stringify(['icon', 'status', 'name', 'stage', 'count', 'via']) && JSON.stringify(keys.look.rows) === JSON.stringify(BASE_LOOK.rows) && JSON.stringify(keys.look.size) === JSON.stringify(BASE_LOOK.size) && keys.look.iconCol === BASE_LOOK.iconCol
    && !keys.lookKeys.includes('regions') && !keys.lookKeys.some((q) => /reg/i.test(q)), 'D-089 · his configuration: the storage key, the six part ids and the default look of the ending are exactly as they were — the regions are a table of their own, never part of the saved look', keys);
  /* CHANGED 2026-10-03 (D-090): every kind declares its regions now (section 38); the ending's entry is what it was */
  ok(JSON.stringify(keys.regions.end) === JSON.stringify({ icon: 'head', status: 'head', name: 'title', stage: 'title', count: 'title', via: 'items', marks: 'items' }), 'D-089 · the regions are data: the ending\'s — the glyph and the status → head, the where line and the strip of marks → items, the rest → title', keys.regions.end);
  ok(keys.cur === E + '|x:8437446a6c', 'D-089 · the ending drawn first is the 429 of the sensitive limit', keys.cur);
  /* (2) the tags: each part carries its region, nothing else carries a hover of its own */
  const tags = await p.evaluate((b) => { const blk = document.querySelector(b), o = [...blk.querySelectorAll('[data-tip="exreg"]')].map((n) => ({ reg: n.dataset.reg, rp: n.dataset.rp, ri: n.dataset.ri, part: n.getAttribute('data-part'), sq: n.classList.contains('sq') }));
    const other = {}; ['table', 'schema', 'fn', 'test', 'gate', 'hook', 'inf'].forEach((k) => { const bk = document.querySelector('#exgrid .excol[data-k="' + k + '"] .blk'); other[k] = bk ? bk.querySelectorAll('.bkhd [data-tip]:not([data-tip="exreg"])').length : -1; });   /* CHANGED (D-090): the other kinds carry regions too — what they carry besides a region is none */
    const titleParts = ['name', 'stage', 'count'].map((q) => { const n = blk.querySelector('[data-part="' + q + '"]'); return n ? n.hasAttribute('data-tip') || !!n.closest('[data-tip]:not([data-tip="exblk"])') : null; });
    return { o, other, titleParts, strip: blk.querySelectorAll('.sqs > .sq').length, blkTip: blk.getAttribute('data-tip') }; }, BLK);
  const wayN = (() => { const r = D.rows.filter((x) => x.id === E)[0], c = D.ex.cat[keys.cur], P = r.ex.paths[c.paths[0]]; return P.ch.filter((q) => q[0] !== 'step').length; })();
  ok(tags.o.filter((q) => q.reg === 'head').map((q) => q.rp).join() === 'icon,status' && tags.o.filter((q) => q.reg === 'items' && q.rp === 'via').length === 1
    && tags.o.filter((q) => q.reg === 'items' && q.rp === 'marks').length === wayN && wayN === tags.strip && wayN === 3 && tags.o.length === 2 + 1 + wayN,
    'D-089 · the ending block\'s hover nodes: the glyph and the status (head), the where line (one item) and each of the ' + wayN + ' marks of the strip (an item each) — and no other', tags);
  ok(tags.blkTip === 'exblk' && tags.titleParts.every((v) => v === false) && Object.values(tags.other).every((n) => n === 0), 'D-089 · the title, the stage and the ways carry no hover of their own (the block\'s card), and no other kind\'s block carries a hover that is not a region', { tags: tags.titleParts, other: tags.other });
  /* (3) the glyph and the status */
  const gl = await hoverCard(BLK + ' [data-part="icon"]'), stt = await hoverCard(BLK + ' [data-part="status"]');
  const st429 = WR.status['429'], plain429 = st429.plain || GDC['429'].plain, kindName = D.words.kinds.refusal.name;
  const mateWords = WX.face.lim.replace('{name}', 'global').replace('{n}', '120').replace('{w}', '60') + ' · Rate limit exceeded. Try again shortly.';
  ok(gl && gl.card === 'reg' && gl.reg === 'head' && gl.rp === 'icon' && gl.cd && gl.show === 'true' && gl.glyph && gl.name === kindName && gl.label.toLowerCase() === (WX.parts.end.icon.name + ' · ' + WX.parts.end.status.name) && !gl.issues && gl.bench === 'end',
    'D-089 · the glyph: its own card — the kind of ending (' + kindName + ') as the bold name, its glyph in the head, the label naming the two parts it speaks for, no renderer issue', gl && { card: gl.card, reg: gl.reg, name: gl.name, label: gl.label, issues: gl.issue });
  ok(gl && gl.nameCol && /k-refusal/.test(gl.nameCol), 'D-089 · the kind\'s name is in its colour (the page\'s --k-refusal), as its glyph is', gl && gl.nameCol);
  ok(stt && gl && stt.card === 'reg' && stt.reg === 'head' && stt.rp === 'status' && stt.html.replace(/data-rp="status"/, 'data-rp="icon"') === gl.html, 'D-089 · the status gives the same card as the glyph (one region: hovering either gives the card about both)', stt && { reg: stt.reg, rp: stt.rp });
  ok(gl && gl.text.includes(st429.name) && gl.text.includes(plain429) && gl.pills.includes('429') && gl.text.includes(mateWords) && gl.text.includes(WX.tip.end.undecl),
    'D-089 · the glyph card says what the status means (' + st429.name + ' · its plain line · the pill 429), that another ending of this endpoint gives the same status (' + mateWords.slice(0, 40) + '…) and that the route does not declare it', gl && gl.text);
  ok(gl && !gl.text.includes('sensitive limit') && !gl.text.includes('rate_limit.py') && !gl.lines.includes('file') && !gl.lines.includes('stage') && gl.parts === 0 && gl.rows <= 3 && gl.h <= 300 && !gl.small.length && gl.w >= 210 && gl.w <= 362,
    'D-089 · the glyph card holds only the glyph and the status — no title words, no file, no stage, none of the three parts — in few rows (' + (gl && gl.rows) + ' rows, ' + (gl && gl.h) + 'px, every text 12px or more)', gl && { rows: gl.rows, h: gl.h, lines: gl.lines, parts: gl.parts, small: gl.small });
  ok(gl && gl.foot === D.words.mo.card.foot.open, 'D-089 · the card\'s footer says what a click does (it opens the block\'s list), as on every lab card', gl && gl.foot);
  /* (4) the title: the block's full card, byte-for-byte */
  const full = await p.evaluate((b) => { const C = window.__allepCard, S0 = C.subject(document.querySelector(b)); return C.make(S0.ck, S0); }, BLK);
  const tN = await hoverCard(BLK + ' [data-part="name"]'), tS = await hoverCard(BLK + ' [data-part="stage"]'), tC = await hoverCard(BLK + ' [data-part="count"]');
  ok(tN && tN.card === 'end' && tN.bench === 'end' && !tN.reg && tN.html === full && tS && tS.html === full && tC && tC.html === full && tN.parts >= 2 && tN.text.includes('rate_limit.py:127'),
    'D-089 · the title, the stage and the ways each give the block\'s full card — byte-for-byte what the block\'s card made on its own is (D-088, unchanged): its identity lines and the parts before · checks · gives', tN && { card: tN.card, reg: tN.reg, same: tN.html === full, parts: tN.parts });
  /* (5) the where line and each mark */
  const wh = await hoverCard(BLK + ' [data-part="via"]'), mk = [];
  for (let i = 0; i < wayN; i++) mk.push(await hoverCard(BLK + ' .sqs > .sq', i));
  const c0 = D.ex.cat[keys.cur], P0 = D.rows.filter((x) => x.id === E)[0].ex.paths[c0.paths[0]], chain = P0.ch.filter((q) => q[0] !== 'step'), S = D.ex.str;
  const atShort = c0.at.split('/').slice(-D.ex.dirs).join('/');
  ok(wh && wh.card === 'reg' && wh.reg === 'items' && wh.rp === 'via' && !wh.issues && wh.name === atShort && wh.label === WX.parts.end.via.name && wh.text.includes(c0.at.split(':')[0]) && wh.text.includes(WR.line.replace('{v}', c0.at.split(':')[1])) && wh.text.includes(c0.via) && wh.pills.includes('429')
    && !wh.text.includes('sensitive limit') && wh.parts === 0 && !wh.small.length,
    'D-089 · the where line: its own card — the file and the line it points to (' + atShort + '), the code that produces it (' + c0.via + '), the status it gives; none of the title\'s words', wh && { name: wh.name, label: wh.label, text: wh.text.slice(0, 200), issue: wh.issue });
  const sw = S[chain[0][5]], gt = chain[1], gw = S[gt[4]];
  const markOk = mk.every((m, i) => m && m.card === 'reg' && m.reg === 'items' && m.rp === 'marks' && +m.ri === i && !m.issues && !m.small.length && m.glyph && m.label === WR.part.marks && m.parts === 0 && m.rows <= 4);
  ok(markOk && chain.length === 3 && chain[0][0] === 'switch' && chain[1][0] === 'gate' && chain[1][2] === 1 && chain[2][0] === 'exit', 'D-089 · each of the ' + wayN + ' marks gives a card of its own (the switch, the check that stops it, the way out), each with its glyph, its label, no renderer issue', mk.map((m) => m && { reg: m.reg, ri: m.ri, name: m.name, issue: m.issue }));
  ok(new Set(mk.map((m) => m.html)).size === wayN && new Set([wh.html, ...mk.map((m) => m.html)]).size === wayN + 1, 'D-089 · one card per item, never one for the whole row: the where line and each mark give cards that differ from one another', mk.map((m) => m.name));
  ok(mk[0].name === WR.way['way-switch'].replace('{switch}', D.words.terms.gate.switch) && mk[0].text.includes(WX.face.sw.flag.replace('{v}', sw)) && !mk[0].pills.length,
    'D-089 · the switch\'s card: what it is (' + mk[0].name + ') and the setting that turns it on — ' + sw, mk[0].text);
  ok(mk[1].name === WR.way['way-stop'].replace('{check}', D.words.terms.gate.check) && mk[1].text.includes(gw) && mk[1].text.includes('sensitive limit') && mk[1].text.includes('20 per 60 seconds') && mk[1].pills.includes('429') && mk[1].text.includes(WR.ends) && mk[1].text.includes('Rate limit exceeded'),
    'D-089 · the check\'s card: what it is (' + mk[1].name + '), where it sits (' + gw + '), what it checks (the sensitive limit), the status it gives and that it ends the request', mk[1].text);
  ok(mk[2].name === WR.way['way-exit'] && mk[2].text.includes(c0.sg) && mk[2].pills.includes('429') && mk[2].pills.includes(kindName) && mk[2].lines.join() === 'stage', 'D-089 · the way out\'s card: what it is, the stage it ends at (' + c0.sg + '), its status and its kind', mk[2].text);
  const m0 = await hoverCard(BLK + ' .sqs > .sq', 0), gap = await p.evaluate((b) => { const q = [...document.querySelectorAll(b + ' .sqs > .sq')], a = q[0].getBoundingClientRect(), c = q[1].getBoundingClientRect(); return { x: (a.right + c.left) / 2, y: (a.top + a.bottom) / 2 }; }, BLK);
  await p.mouse.move(gap.x, gap.y); await p.waitForTimeout(80); const gp = await card();      /* CHANGED D-092 (his: the container between the icons offers no hover): the gap was the block's card */
  ok(m0 && m0.show === 'true' && m0.card === 'reg' && gp && gp.show === 'false', 'D-092 · the gap between two marks is no item and is quiet: the mark\'s card goes, and neither the block\'s card nor one for the whole row shows', gp && { show: gp.show, card: gp.card, m0: m0 && m0.card });
  ok((await p.evaluate(() => window.localStorage.getItem('gabe:allep:bench:v3'))) === store0, 'D-089 · his configuration: hovering the regions wrote nothing to storage');
  /* (6) the regions follow the parts */
  const regOf = (rp) => p.evaluate((a) => { const n = document.querySelector(a[0] + ' [data-part="' + a[1] + '"]'); return n ? { tip: n.getAttribute('data-tip'), reg: n.getAttribute('data-reg') } : null; }, [BLK, rp]);
  await p.evaluate(() => { window.__allepEx.move('end', 'status', 2, 'r', 0); window.__allepEx.move('end', 'via', 0, 'l', 0); window.__allepEx.move('end', 'name', 2, 'l', 0); window.__allepEx.move('end', 'icon', 1, 'l', 0); }); await p.waitForTimeout(150);
  const mv = { st: await regOf('status'), via: await regOf('via'), name: await regOf('name'), icon: await regOf('icon') };
  const lineOf = (rp) => p.evaluate((a) => { const n = document.querySelector(a[0] + ' [data-part="' + a[1] + '"]'), ln = n && n.closest('.bkln'); return ln ? [...ln.parentNode.children].indexOf(ln) : -1; }, [BLK, rp]);
  const lns = { st: await lineOf('status'), via: await lineOf('via'), icon: await lineOf('icon'), name: await lineOf('name') };
  const gMv = await hoverCard(BLK + ' [data-part="status"]'), vMv = await hoverCard(BLK + ' [data-part="via"]'), nMv = await hoverCard(BLK + ' [data-part="name"]'), iMv = await hoverCard(BLK + ' [data-part="icon"]');
  ok(lns.st !== 0 && lns.via === 0 && lns.icon === 1 && lns.name === 2 && mv.st && mv.st.reg === 'head' && mv.via && mv.via.reg === 'items' && mv.icon && mv.icon.reg === 'head' && mv.name && mv.name.tip === null && gMv && gMv.reg === 'head' && gMv.rp === 'status' && vMv && vMv.reg === 'items' && vMv.rp === 'via' && iMv && iMv.reg === 'head' && nMv && nMv.card === 'end' && !nMv.reg,
    'D-089 · the regions follow the parts: with the status on another line, the where line on the first, the glyph on the second and the title on the third, each still gives its own card', { lns, mv, g: gMv && gMv.reg, v: vMv && vMv.reg, n: nMv && nMv.card });
  await p.evaluate(() => window.__allepEx.move('end', 'icon', 'off')); await p.waitForTimeout(120);
  const hid = await p.evaluate((b) => ({ icon: !!document.querySelector(b + ' [data-part="icon"]'), head: [...document.querySelectorAll(b + ' [data-tip="exreg"][data-reg="head"]')].map((n) => n.dataset.rp) }), BLK);
  ok(!hid.icon && hid.head.join() === 'status', 'D-089 · a part he hides has no region: with the glyph not drawn only the status is left of the head region, and it still gives its card', hid);
  await p.evaluate(() => { window.__allepEx.move('end', 'icon', 0, 'l', 0); window.__allepEx.move('end', 'status', 0, 'l', 1); window.__allepEx.move('end', 'name', 1, 'l', 0); window.__allepEx.move('end', 'via', 2, 'l', 0); }); await p.waitForTimeout(150);
  const cp1 = await p.evaluate(() => window.__allepEx.copy('end')), cur1 = await p.evaluate(() => window.__allepEx.current('end').id);
  ok(cp1 === BASE_COPY && cur1 === keys.cur, 'D-089 · his configuration: after the parts are moved about and back, the copy line is byte-identical to the default\'s — the line\'s format and the part ids did not change', { now: cp1.slice(0, 200) });
  /* every other kind keeps the one card */
  const oth = {}; for (const k of ['table', 'fn', 'schema', 'test', 'gate', 'hook', 'inf']) { const c2 = await hoverCard(CEND.replace('"end"', '"' + k + '"') + ' .blk [data-part="' + (k === 'test' ? 'cid' : k === 'gate' ? 'cond' : 'name') + '"]'); oth[k] = c2 ? [c2.card, c2.reg || '', c2.bench] : null; }
  ok(Object.entries(oth).every(([k, v]) => v && v[0] === k && v[1] === '' && v[2] === k), 'D-089 · a hover on the title of every other kind is its block\'s full card, bound to its kind (D-088, unchanged; the regions of the other kinds are section 38)', oth);
  await p.mouse.move(5, 5);
  /* (7) every ending of every endpoint, through card() and its guard; the guard fires on a region card made to break a rule */
  const all = await p.evaluate(() => { const C = window.__allepCard, D0 = window.__allep.data, o = { heads: 0, wheres: 0, marks: 0, issues: [], errs: [], names: new Set(), ends: 0, noReg: 0 };
    D0.rows.forEach((r) => (r.ex.end || []).forEach((e) => { const c = D0.ex.cat[e[0]], it = { k: 'end', id: e[0], role: e[1], ep: r.id, o: e[2] }, P = r.ex.paths[c.paths[0]]; o.ends++;
      const one = (reg, rp, ri, kind) => { try { const S0 = C.region('end', it, reg, rp, ri, null); if (!S0) { o.noReg++; return; } const d = document.createElement('div'); d.innerHTML = C.make('reg', S0); const cc = d.firstChild; o[kind]++;
          if (+cc.getAttribute('data-card-issues')) o.issues.push(r.id + ' ' + e[0] + ' ' + rp + ri + ' → ' + cc.getAttribute('data-card-issue')); o.names.add(rp + ':' + (cc.querySelector('.cdh b') || {}).textContent); } catch (x) { o.errs.push(r.id + ' ' + e[0] + ' ' + rp + ' ' + x.message); } };
      one('head', 'icon', 0, 'heads'); if (c.at) one('items', 'via', 0, 'wheres'); (P ? P.ch.filter((q) => q[0] !== 'step') : []).forEach((q, i) => one('items', 'marks', i, 'marks')); }));
    o.names = [...o.names].filter((n) => n.startsWith('marks:')).sort(); return o; });
  const wantMarks = D.rows.reduce((n, r) => n + (r.ex.end || []).reduce((m, e) => { const c = D.ex.cat[e[0]], P = r.ex.paths[c.paths[0]]; return m + (P ? P.ch.filter((q) => q[0] !== 'step').length : 0); }, 0), 0), wantEnds = D.rows.reduce((n, r) => n + (r.ex.end || []).length, 0);
  console.log('  D-089 every ending: ' + all.ends + ' endings · ' + all.heads + ' head cards · ' + all.wheres + ' where cards · ' + all.marks + ' mark cards · mark names ' + all.names.map((q) => q.slice(6)).join(' | '));
  ok(all.ends === wantEnds && all.heads === wantEnds && all.wheres === wantEnds && all.marks === wantMarks && wantMarks > 5000 && !all.noReg && !all.errs.length && !all.issues.length,
    'D-089 · all ' + D.rows.length + ' endpoints: ' + all.ends + ' endings → ' + all.heads + ' glyph-and-status cards, ' + all.wheres + ' where cards and ' + all.marks + ' mark cards, each made through card() and its guard — none with an issue (P1.1 · P2.1 · P4.1 · P8.1), none that fails to draw', { issues: all.issues.slice(0, 3), errs: all.errs.slice(0, 3), noReg: all.noReg });
  const gd2 = await p.evaluate(() => { const C = window.__allepCard, D0 = window.__allep.data, r = D0.rows.filter((x) => x.id === 'POST /cooking/sessions')[0], e = r.ex.end[0], it = { k: 'end', id: e[0], role: e[1], ep: r.id, o: e[2] }, S0 = C.region('end', it, 'head', 'icon', 0, null), box = document.createElement('div'); box.innerHTML = C.make('reg', S0);
    const root = () => box.firstChild.cloneNode(true), mk = (c, txt) => { const n = document.createElement('span'); n.className = c; n.textContent = txt; return n; };
    const run = (mut, F) => { const x = root(); mut(x); return C.guard(x, F || { joins: [] }); };
    return { clean: run(() => {}), p21: run((x) => x.appendChild(mk('cdt', 'as the map draws it'))), p21b: run((x) => x.appendChild(mk('cdt', 'it stops here'))), p41: run(() => {}, { joins: [{ end: 'ending', want: ['an ending named nowhere on the card'] }] }),
      p81: run((x) => { const n = mk('cdfp', '0'); n.setAttribute('data-unit', 'ways'); n.setAttribute('data-n', ''); x.appendChild(n); }), p11: run((x) => { const n = mk('cdv', 'a label that runs far past the short limit'); n.setAttribute('data-shared', '1'); x.appendChild(n); }) }; });
  ok(gd2.clean.length === 0 && gd2.p21.some((q) => q.startsWith('p2.1')) && gd2.p21b.some((q) => q.startsWith('p2.1')) && gd2.p41.some((q) => q.startsWith('p4.1')) && gd2.p81.some((q) => q.startsWith('p8.1')) && gd2.p11.some((q) => q.startsWith('p1.1')),
    'D-089 · the guard stays silent on a clean region card and fires on one made to break each rule (P2.1 words about the page · P4.1 a join\'s other end not named · P8.1 an unrecorded count · P1.1 a long label)', gd2);
  ok((await p.evaluate(() => window.__allepCard.log.length)) === 0 && !errs.length, 'D-089 · the renderer\'s log holds no issue and the page raised no error after every region hover', { log: await p.evaluate(() => window.__allepCard.log.slice(0, 2)), errs: errs.slice(0, 3) });

  /* 38 · D-090 (his, after D-089: "Let's apply this not only to the [endings], but to all the other elements that have a similar structure, which I think are all the elements"). The ending's
     three regions on the seven other kinds of the examples bench, by real hovers on POST /cooking/sessions' default examples (the bench's default layout):
   (1) his configurations are untouched — the copy line of each kind's default column is byte-identical to the one the page gave before this change (pinned below, taken from the page at 0bb5eda),
       its ordered rows, the not-drawn list and the part ids are as they were, the storage key is unchanged and nothing is saved by hovering;
   (2) each part carries its region by data (EX.regions, the rule of D-090) and the block's nodes are tagged as the table says: the glyph and the classifying pill → head, each location part → one item,
       each mark of the strip → one item, no other node of a title line carries a hover;
   (3) the glyph and the pill give the ONE head card — what the glyph is in its colour, the pill that classifies it, what the class means for this element (its own facts) — with no identity row and none of
       the title's words; (4) the title and every other part give the block's full card, byte-for-byte (D-088); (5) each location part and each mark give a card of their own, distinct per item, saying what
       the item is and this element's fact for it; the gap between two marks is no item; (6) the regions follow a part moved to another line, a hidden part has no region, and putting everything back restores the
       copy line byte-for-byte; (7) every element of every endpoint: its head, each location part it draws and each mark of its strip are made through card() and its guard — none with an issue, none unmade */
  const KS = ['table', 'schema', 'fn', 'test', 'gate', 'hook', 'inf'], WRH = D.words.ex.region.head, WRI = D.words.ex.region.item, WXD = D.words.ex, SD = D.ex.str, FAM = D.words.enc.fam;
  /* each kind's default column as the page gave it BEFORE this change (commit 0bb5eda) — pinned, never recomputed: the example drawn first, its copy line, its ordered rows and not-drawn list */
  const PINS = {
    table: {"id": "table:cooking_sessions", "copy": "examples · table · cooking_sessions · on POST /cooking/sessions · block block (icon on model, chip on, name on, entity both, count badge, model both) · edge left solid 2px · chips count pill 100%, channel pill 90% · lines icon name | — / ent | count rw / model | — · sizes icon 13 rw 11 name 13 ent 12 count 11 model 12 · squares 14px gap 4 round as symbol by type · not drawn — · width dynamic (your DATA line, D-027)", "rows": [{"l": ["icon", "name"], "r": []}, {"l": ["ent"], "r": ["count", "rw"]}, {"l": ["model"], "r": []}], "off": []},
    schema: {"id": "schema:SessionCreateRequest", "copy": "examples · schema · SessionCreateRequest · on POST /cooking/sessions · block block (glyph on, its kind's colour, direction on, name on, entity both, fields badge, where both) · edge left solid 2px · chips count pill 100%, direction pill 90% · lines glyph · name | — / entity | fields · direction / where | — · sizes glyph 13, direction 12, name 13, entity 12, fields 12, where 12 · squares 14px gap 4 round as symbol by type · not drawn — · width dynamic (the lab's look, my pick)", "rows": [{"l": ["icon", "name"], "r": []}, {"l": ["ent"], "r": ["count", "dir"]}, {"l": ["via"], "r": []}], "off": []},
    fn: {"id": "fn:apps/api/api/cooking.py::post_start_session", "copy": "examples · function · post_start_session · on POST /cooking/sessions · block block (glyph on, its kind's colour, role on, name on, commit on, file both, lines badge, where both) · edge left solid 2px · chips count pill 100%, role pill 90% · lines glyph · name | commit / file | lines · role / where | — · sizes glyph 13, role 12, name 13, commit 11, file 12, lines 12, where 12 · squares 14px gap 4 round as symbol by type · not drawn — · width dynamic (the lab's look, my pick)", "rows": [{"l": ["icon", "name"], "r": ["commit"]}, {"l": ["file"], "r": ["count", "role"]}, {"l": ["via"], "r": []}], "off": []},
    test: {"id": "case:C267", "copy": "examples · test · C267 · start session response carries recipe title · on POST /cooking/sessions · block block (glyph on, its kind's colour, case on, result on, endings on, role here on, name on, file off, headers on, checks on) · edge left solid 2px · chips count pill 100%, role here pill 90% · lines glyph · case · endings | result / name | — / role here · headers | checks · sizes glyph 13, case 13, result 12, endings 12, role here 12, name 12, file 12, headers 12, checks 12 · squares 14px gap 4 round as symbol by type · not drawn file · width dynamic (my pick)", "rows": [{"l": ["icon", "cid", "proves"], "r": ["state"]}, {"l": ["name"], "r": []}, {"l": ["role", "sends"], "r": ["asserts"]}], "off": ["file"]},
    gate: {"id": "POST /cooking/sessions|limiter:sensitive", "copy": "examples · gate or decision · sensitive limit: 20 per 60 seconds · on POST /cooking/sessions · block block (glyph on, its kind's colour, kind on, condition on, function on, where it decides on, effect on, file and line both, tests badge) · edge left solid 2px · chips count pill 100%, kind pill 90% · lines glyph · condition | kind / function · where it decides | effect / file and line | tests · sizes glyph 13, kind 12, condition 13, function 12, where it decides 12, effect 12, file and line 12, tests 12 · squares 14px gap 4 round as symbol by type · not drawn — · width dynamic (my pick)", "rows": [{"l": ["icon", "cond"], "r": ["role"]}, {"l": ["fn", "level"], "r": ["effect"]}, {"l": ["via"], "r": ["count"]}], "off": []},
    hook: {"id": "fe:apps/web/src/features/cooking/useCookingSessions.ts#useStartCooking", "copy": "examples · client hook · useStartCooking · on POST /cooking/sessions · block block (glyph on, its kind's colour, role on, name on, kind on, request on, file word, reactions badge) · edge left solid 2px · chips count pill 100%, role pill 90% · lines glyph · name | role / request | reactions / file | kind · sizes glyph 13, role 12, name 13, kind 12, request 12, file 12, reactions 12 · squares 14px gap 4 round as symbol by type · not drawn — · width dynamic (my pick)", "rows": [{"l": ["icon", "name"], "r": ["role"]}, {"l": ["sends"], "r": ["count"]}, {"l": ["file"], "r": ["fkind"]}], "off": []},
    inf: {"id": "inflight:setting-once:apps/api/middleware/rate_limit.py::RateLimitMiddleware.rate_limit_active", "copy": "examples · in-flight value · rate_limit_active · on POST /cooking/sessions · block block (glyph on, its kind's colour, lifetime on, name on, kind on, set by on, reads badge) · edge left solid 2px · chips count pill 100%, lifetime pill 90% · lines glyph · name | lifetime / kind | reads / set by | — · sizes glyph 13, lifetime 12, name 13, kind 12, set by 12, reads 12 · squares 14px gap 4 round as symbol by type · not drawn — · width dynamic (my pick)", "rows": [{"l": ["icon", "name"], "r": ["life"]}, {"l": ["ikind"], "r": ["count"]}, {"l": ["set"], "r": []}], "off": []}
  };
  const REGS = { table: { icon: 'head', rw: 'head', name: 'title', ent: 'title', count: 'title', model: 'items', marks: 'items' }, schema: { icon: 'head', dir: 'head', name: 'title', ent: 'title', count: 'title', via: 'items', marks: 'items' },
    fn: { icon: 'head', role: 'head', name: 'title', commit: 'title', file: 'items', count: 'title', via: 'items', marks: 'items' },
    test: { icon: 'head', state: 'head', cid: 'title', proves: 'title', role: 'title', name: 'title', file: 'items', sends: 'title', asserts: 'title', marks: 'items' },
    gate: { icon: 'head', role: 'head', cond: 'title', fn: 'items', level: 'items', effect: 'title', via: 'items', count: 'title', marks: 'items' },
    hook: { icon: 'head', role: 'head', name: 'title', fkind: 'title', sends: 'items', file: 'items', count: 'title', marks: 'items' }, inf: { icon: 'head', life: 'head', name: 'title', ikind: 'title', set: 'items', count: 'title', marks: 'items' } };
  const R38 = D.rows.filter((x) => x.id === E)[0], EL = (k, id) => R38.ex[k].filter((e) => e[0] === id)[0], CAT = (id) => D.ex.cat[id];
  const ELS = (k) => D.rows.flatMap((r) => (r.ex[k] || []).map((e) => ({ r, e, c: D.ex.cat[e[0]], o: e[2], role: e[1] })));
  const MKN = { table: (x) => x.c.cols.length + (x.c.more || []).length, schema: (x) => x.c.cols.length, fn: (x) => x.o.ops.length, test: (x) => x.c.calls.length || x.c.raises.length, gate: (x) => x.o.after.length + 1, hook: (x) => x.o.react.length, inf: (x) => x.o.reads.length };
  const EXISTS = { table: { model: () => true }, schema: { via: () => true }, fn: { file: (x) => !!x.c.file, via: (x) => !!(x.c.nokey || x.o.h || x.o.lv != null || x.o.by) }, test: { file: () => true },
    gate: { fn: () => true, level: (x) => !!(x.o.gl && FAM.gdl.vals[x.o.gl]), via: (x) => x.o.at != null }, hook: { sends: (x) => x.o.send.length > 0, file: () => true }, inf: { set: (x) => !!(x.c.by || x.c.set) } };
  const uniq = (a) => [...new Set(a)], fnOf = (s) => String(s).split('::').pop(), atOf = (s) => { const m = /^(.+?):(\d+)/.exec(String(s)); return m ? [m[1], 'line ' + m[2]] : [String(s)]; };
  const T0 = (k) => { const x = EL(k, PINS[k].id), c = CAT(PINS[k].id); return { x, c, o: x[2], role: x[1] }; };
  /* what each default example's cards must say, read from the feed and the words — never from the cards */
  const SPEC = {
    table: () => { const { c, o, role } = T0('table'), rd = uniq(o.ops.filter((q) => q[0] === 'read').map((q) => q[2])), wr = uniq(o.ops.filter((q) => q[0] !== 'read').map((q) => q[2])), cols = c.cols.map((f) => f[0]).concat(c.more.map((f) => f[0])), fkc = c.fks[1][0], fkt = c.fks[1][1];
      return { name: WXD.kinds.table.name, label: 'glyph · channel', pills: [WXD.roles.table[role].name], has: rd.concat(wr, [WXD.unit.functions.many.replace('{n}', '2')]), not: [c.n, c.model, 'cooking.py'], marks: cols.length, nR: rd.length, nW: wr.length,
        items: { model: { has: [c.model, c.file, 'line ' + c.at.split(':')[1], c.n], label: 'class' } }, mark: [[cols.indexOf(fkc), [fkc, fkt, c.cols.filter((f) => f[0] === fkc)[0][1], WRI.fk]], [cols.indexOf('idempotency_key'), ['idempotency_key', WRI.uq, 'text'.length ? WRI.field.replace('{v}', 'text') : '']],
          [cols.indexOf('household_id'), ['household_id', 'households.id', WRI.uqWith, 'idempotency_key']], [c.cols.length, [c.more[0][0], WRI.more, c.more[0][1]]]], distinct: cols.length }; },
    schema: () => { const { c, o, role } = T0('schema'); return { name: WXD.kinds.schema.name, label: 'glyph · direction', pills: [D.words.mo.io.k.body.name, '422'], has: [WRH.schema[role], WRH.schema.c422.replace('{n}', String(o.c422))], not: [c.n, 'schemas/cooking.py'], marks: c.cols.length,
        items: { via: { has: atOf(c.at).concat(['endpoints that use it: ' + c.cons]), label: 'where', name: D.words.mo.io.k.body.name } },
        mark: [[0, [c.cols[0][0], c.cols[0][1], 'required', c.n]], [1, [c.cols[1][0], c.cols[1][1], 'optional', c.cols[1][5], c.n]]], distinct: c.cols.length }; },
    fn: () => { const { c, o, role } = T0('fn'), cn = uniq(o.calls.map((q) => fnOf(SD[q[0]]))), shown = cn.slice(0, 4);
      return { name: WXD.kinds.fn.name, label: 'glyph · role', pills: [WXD.roles.fn[role].name], has: [WRH.fn[role]].concat(shown, [WRH.fn.refuses, String(o.chk[0][0]), SD[o.chk[0][1]], D.words.ex.tip.fn.commit]), not: [c.n, 'api/cooking.py'], marks: o.ops.length,
        items: { file: { has: [c.file, 'line ' + c.at.split(':')[1], c.n], label: 'file' }, via: { has: [WXD.face.handler, WXD.tip.fn.inHandler, c.file], label: 'where' } }, mark: [], distinct: 0 }; },
    test: () => { const { c, o, role } = T0('test'), q = c.calls, st = c.state === 'pass' ? WRH.test.pass : WRH.test.fail;
      return { name: WXD.kinds.test.name, label: 'glyph · result', pills: [c.state === 'pass' ? 'pass' : 'fail', '201'], has: [st, WRH.test.proves], not: [c.n, 'test_cooking_photos'], marks: q.length,
        items: { file: { has: [c.file, 'line ' + c.line, c.cid, c.n], label: 'file', draw: true } }, mark: [[0, [q[0][1], WXD.roles.test.arrange.name, String(q[0][6][0]), q[0][4]]], [2, [q[2][1], WXD.roles.test.act.name, '201', 'Authorization', 'recipe_title']]], distinct: q.length }; },
    gate: () => { const { c, o, role } = T0('gate'), gk = FAM.gdk.vals[o.gk]; return { name: gk.name, label: 'glyph · kind', pills: [WXD.roles.gate[role].name], has: [WRH.gate[role], WRH.gate.gives, String(o.st)], not: [c.n, 'rate_limit.py'], marks: 1,
        items: { fn: { has: [o.place, WXD.tip.gate.do.replace('{name}', o.place)], label: 'function' }, level: { has: [FAM.gdl.vals[o.gl].name, FAM.gdl.vals[o.gl].plain, o.place], label: 'where it decides', name: FAM.gdl.vals[o.gl].name },
          via: { has: atOf(SD[o.at]).concat([c.raw, String(o.st)]), label: 'file and line' } }, mark: [[0, [WRI.self, c.n, c.raw, String(o.st)]]], distinct: 1 }; },
    hook: () => { const { c, o, role } = T0('hook'), s0 = o.send[0], own = o.react.findIndex((x) => x[2]), no = o.react.findIndex((x) => !x[2]);
      return { name: WXD.kinds.hook.name, label: 'glyph · role', pills: [WXD.roles.hook[role].name], has: [WRH.hook[role], s0[1]], not: [c.n, 'useCookingSessions.ts'], marks: o.react.length,
        items: { sends: { has: [s0[0] + ' ' + s0[1], WRI.via.replace('{v}', s0[2]), o.epk.replace(/^endpoint:/, '')], label: 'request' }, file: { has: [c.file, 'line ' + c.at.split(':')[1], c.n], label: 'file' } },
        mark: [[own, [D.words.ex.region.status[String(o.react[own][1])].name, String(o.react[own][1]), o.react[own][3], o.react[own][4]]], [no, [D.words.ex.region.status[String(o.react[no][1])].name, String(o.react[no][1]), WXD.list.noBranch]]],
        distinct: new Set(o.react.map((x) => [x[1], x[2], x[3], x[4], (CAT(E + '|' + x[0]) || {}).say, (CAT(E + '|' + x[0]) || {}).lim && CAT(E + '|' + x[0]).lim[0]].join('|'))).size }; },
    inf: () => { const { c, o } = T0('inf'), T = D.words.terms.life[c.dies === 'with the answer' ? 'req' : 'srv']; return { name: FAM.ifk.vals[c.ik].name, label: 'glyph · lifetime', pills: [T.name], has: [T.plain, WRH.inf.set, c.by, c.set], not: [c.n], marks: o.reads.length,
        items: { set: { has: [c.by].concat(atOf(c.set)), label: 'set by' } }, mark: [[0, [SD[o.reads[0][1]], 'read in middleware'].concat(atOf(SD[o.reads[0][0]]))]], distinct: uniq(o.reads.map((x) => SD[x[1]] + SD[x[0]])).length }; } };
  const cardAt = async (css, i = 0) => { const hs = await p.$$(css); if (!hs[i]) return null; const bx = await hs[i].boundingBox(); if (!bx) return null; await hoverAt(hs[i]); return card(); };
  const TXT = (cd, words) => words.filter((w) => w != null && w !== '' && !cd.text.includes(String(w)));
  for (const k of KS) {
    await open(PAGE); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(450);
    const COL = '#exgrid .excol[data-k="' + k + '"]', BK = COL + ' .blk', R = REGS[k], P = PINS[k], X = SPEC[k](), tag = k.toUpperCase().padEnd(6, ' ');
    const stK = await p.evaluate(() => { try { return window.localStorage.getItem('gabe:allep:bench:v3'); } catch (e) { return 'no storage'; } });
    /* (1) his configuration */
    const cp = await p.evaluate((q) => window.__allepEx.copy(q), k);
    const lk = await p.evaluate((q) => ({ key: window.__allepEx.key, rows: window.__allep.data.ex.look[q].rows, off: window.__allep.data.ex.look[q].off || [], parts: Object.keys(window.__allep.data.words.ex.parts[q]), keys: Object.keys(window.__allep.data.ex.look[q]), cur: window.__allepEx.current(q).id, reg: window.__allep.data.ex.regions[q] }), k);
    ok(cp === P.copy, 'D-090 · ' + k + ' · his configuration: the copy line of the default column is byte-identical to the one before the change', { now: cp.slice(0, 200) });
    ok(lk.key === 'gabe:allep:bench:v3' && lk.cur === P.id && JSON.stringify(lk.rows) === JSON.stringify(P.rows) && JSON.stringify(lk.off) === JSON.stringify(P.off) && JSON.stringify(Object.keys(R).filter((q) => q !== 'marks').sort()) === JSON.stringify(lk.parts.slice().sort()) && !lk.keys.some((q) => /reg/i.test(q)),
      'D-090 · ' + k + ' · his configuration: the storage key, the part ids (in their order), the default rows and the example drawn first are as they were — the regions are a table of their own, never part of the saved look', { lk });
    ok(JSON.stringify(lk.reg) === JSON.stringify(R), 'D-090 · ' + k + ' · the regions are data (the rule of D-090): glyph and the classifying pill → head, each location part → items, the strip → items, the rest → title', lk.reg);
    /* (2) the tags, on the default layout */
    const tgs = () => p.evaluate((b) => { const blk = document.querySelector(b), nodes = [...blk.querySelectorAll('[data-tip="exreg"]')].map((n) => ({ reg: n.dataset.reg, rp: n.dataset.rp, ri: +n.dataset.ri, part: n.getAttribute('data-part'), sq: n.classList.contains('sq') }));
      return { nodes, drawn: [...blk.querySelectorAll('[data-part]')].map((n) => n.getAttribute('data-part')), strip: blk.querySelectorAll('.sqs > .sq').length, stray: blk.querySelectorAll('.bkhd [data-tip]:not([data-tip="exreg"])').length, blkTip: blk.getAttribute('data-tip') }; }, BK);
    let tg = await tgs();
    const dflt = tg.drawn.slice();
    ok(JSON.stringify(tg.nodes.filter((n) => n.reg === 'head').map((n) => n.part)) === JSON.stringify(dflt.filter((q) => R[q] === 'head')) && JSON.stringify(tg.nodes.filter((n) => n.reg === 'items' && n.rp !== 'marks').map((n) => n.part)) === JSON.stringify(dflt.filter((q) => R[q] === 'items'))
      && tg.nodes.filter((n) => n.rp === 'marks').length === tg.strip && tg.strip === X.marks && tg.nodes.filter((n) => n.rp === 'marks').every((n, i) => n.ri === i && n.sq) && !tg.stray && tg.blkTip === 'exblk' && dflt.filter((q) => R[q] === 'head').length === 2,
      'D-090 · ' + k + ' · the block\'s hover nodes: the glyph and the pill (head), each location part it draws (an item each) and each of the ' + X.marks + ' marks of the strip (an item each) — and no other node of a title line', { tg });
    /* draw what the default layout leaves out (the test's file), so every region has a node */
    for (const q of Object.keys(R).filter((q) => q !== 'marks' && !dflt.includes(q) && R[q] !== 'title')) await p.evaluate((a) => window.__allepEx.move(a[0], a[1], 2, 'r', 0), [k, q]);
    await p.waitForTimeout(120); tg = await tgs();
    const HP = tg.drawn.filter((q) => R[q] === 'head'), IP = tg.drawn.filter((q) => R[q] === 'items'), TP = tg.drawn.filter((q) => R[q] === 'title');
    /* (3) the head */
    const g = await cardAt(BK + ' [data-part="' + HP[0] + '"]'), g2 = await cardAt(BK + ' [data-part="' + HP[1] + '"]'), miss = g ? TXT(g, X.has) : ['no card'];
    ok(g && g.card === 'reg' && g.reg === 'head' && g.rp === HP[0] && g.bench === k && g.cd && g.show === 'true' && g.glyph && g.name === X.name && g.label.toLowerCase() === X.label && !g.issues && !g.lines.length && g.parts === 0 && !g.small.length && g.w >= 210 && g.w <= 362 && g.rows >= 1 && g.rows <= 9 && g.h <= 420
      && X.pills.every((q) => g.pills.includes(q)) && !miss.length && !X.not.some((q) => g.text.includes(q)) && g.foot === D.words.mo.card.foot.open,
      'D-090 · ' + k + ' · the glyph: the head card — what the glyph is (' + X.name + ', its glyph in its colour), the pill (' + X.pills.join(' · ') + ') and what the class means for this element; no identity row, none of the title\'s words, ' + (g && g.rows) + ' rows, ' + (g && g.h) + 'px, every text 12px or more',
      g && { name: g.name, label: g.label, miss, lines: g.lines, rows: g.rows, h: g.h, pills: g.pills, issue: g.issue, not: X.not.filter((q) => g.text.includes(q)), small: g.small });
    ok(g2 && g && g2.reg === 'head' && g2.rp === HP[1] && g2.html.replace('data-rp="' + HP[1] + '"', 'data-rp="' + HP[0] + '"') === g.html, 'D-090 · ' + k + ' · the pill gives the same head card as the glyph (one region: hovering either gives the card about both)', g2 && { reg: g2.reg, rp: g2.rp });
    /* (4) the title and every other part: the block's full card, byte-for-byte */
    const full = await p.evaluate((b) => { const C = window.__allepCard, S0 = C.subject(document.querySelector(b)); return C.make(S0.ck, S0); }, BK), tt = [];
    for (const q of TP) tt.push([q, await cardAt(BK + ' [data-part="' + q + '"]')]);
    ok(tt.length >= 3 && tt.every(([q, t]) => t && t.card === k && t.bench === k && !t.reg && t.html === full), 'D-090 · ' + k + ' · the title and every other part (' + TP.join(' · ') + ') each give the block\'s full card — byte-for-byte what the block\'s card made on its own is (D-088, unchanged)', tt.map(([q, t]) => [q, t && t.card, t && t.reg, t && t.html === full]));
    /* (5) each location part and each mark */
    const its = [], mks = [];
    for (const q of IP) its.push([q, await cardAt(BK + ' [data-part="' + q + '"]')]);
    for (let i = 0; i < tg.strip; i++) mks.push(await cardAt(BK + ' .sqs > .sq', i));
    const itOk = its.map(([q, c]) => { const w = X.items[q]; if (!c) return [q, 'no card']; const m = TXT(c, w.has); return c.card === 'reg' && c.reg === 'items' && c.rp === q && c.bench === k && !c.issues && !c.small.length && c.glyph && c.label === w.label && (!w.name || c.name === w.name) && !m.length && c.parts === 0 && c.w <= 362 ? [q, 'ok'] : [q, 'bad', c.label, c.name, m, c.issue]; });
    ok(IP.length === Object.keys(X.items).length && itOk.every((v) => v[1] === 'ok'), 'D-090 · ' + k + ' · each location part (' + IP.join(' · ') + ') gives a card of its own: its glyph, the label of the part, what the item is and this element\'s fact for it (' + IP.map((q) => X.items[q].has.slice(0, 2).join(' · ')).join(' / ').slice(0, 120) + ')', itOk);
    const mOk = mks.map((c, i) => c && c.card === 'reg' && c.reg === 'items' && c.rp === 'marks' && c.ri === String(i) && c.bench === k && !c.issues && !c.small.length && c.glyph && c.label === D.words.ex.region.part.marks && c.parts === 0 && c.rows <= 6 && c.w <= 362);
    ok(mks.length === X.marks && mOk.every(Boolean), 'D-090 · ' + k + ' · each of the ' + X.marks + ' marks of the strip gives a card of its own, with its glyph, the label "mark", no renderer issue', mks.map((c, i) => c ? (mOk[i] ? 'ok' : [c.label, c.name, c.issue]) : 'none').filter((v) => v !== 'ok').slice(0, 4));
    const mSay = X.mark.map(([i, w]) => [i, mks[i] ? TXT(mks[i], w) : ['no card']]);
    ok(mSay.every(([, m]) => !m.length), 'D-090 · ' + k + ' · the telling marks say what the mark is and this element\'s fact: ' + X.mark.map(([i, w]) => (mks[i] ? mks[i].name : '—') + ' (' + w.slice(1, 3).join(', ') + ')').join(' · ').slice(0, 220), mSay.filter(([, m]) => m.length));
    const hs = [...its.map(([, c]) => c && c.html), ...mks.map((c) => c && c.html)];
    ok(its.length + mks.length === hs.length && new Set(its.map(([, c]) => c.html)).size === its.length && its.every(([, c]) => !mks.some((m) => m && m.html === c.html)) && new Set(mks.map((m) => m && m.html)).size === X.distinct,
      'D-090 · ' + k + ' · one card per item, never one for the whole row: the ' + its.length + ' location cards differ from one another and from the marks\', and the ' + X.marks + ' marks give ' + X.distinct + ' distinct cards (' + (X.marks - X.distinct) + ' marks share every fact)', { its: its.length, marks: mks.length, distinct: new Set(mks.map((m) => m && m.html)).size, want: X.distinct });
    if (tg.strip > 1) { const m0 = await hoverCard(BK + ' .sqs > .sq', 0), gap = await p.evaluate((b) => { const q = [...document.querySelectorAll(b + ' .sqs > .sq')], a = q[0].getBoundingClientRect(), c = q[1].getBoundingClientRect(); return { x: (a.right + c.left) / 2, y: (a.top + a.bottom) / 2, gap: c.left - a.right }; }, BK);
      await p.mouse.move(gap.x, gap.y); await p.waitForTimeout(80); const gp = await card();   /* CHANGED D-092: the gap was the block's card */
      ok(m0 && m0.show === 'true' && gp && gp.show === 'false', 'D-092 · ' + k + ' · the gap between two marks is quiet: the mark\'s card goes and no other card shows', gp && { show: gp.show, card: gp.card, gap: gap.gap }); }
    ok((await p.evaluate(() => window.localStorage.getItem('gabe:allep:bench:v3'))) !== undefined && (await p.evaluate(() => window.__allepCard.log.length)) === 0, 'D-090 · ' + k + ' · the renderer\'s log holds no issue after the hovers');
    /* (6) the regions follow the parts, a hidden part has no region, and putting everything back restores the copy line */
    const rows0 = await p.evaluate((q) => JSON.parse(JSON.stringify([window.__allepEx.state.col[q].look.rows, window.__allepEx.state.col[q].look.off || []])), k);
    const lineOf = (q) => p.evaluate((a) => { const n = document.querySelector(a[0] + ' [data-part="' + a[1] + '"]'), ln = n && n.closest('.bkln'); return ln ? [...ln.parentNode.children].indexOf(ln) : -1; }, [BK, q]);
    const l0 = await lineOf(HP[1]), moveTo = l0 === 2 ? 0 : 2;
    await p.evaluate((a) => { window.__allepEx.move(a[0], a[1], a[2], 'r', 0); }, [k, HP[1], moveTo]); await p.waitForTimeout(120);
    const l1 = await lineOf(HP[1]), mv = await cardAt(BK + ' [data-part="' + HP[1] + '"]'), tgm = await tgs();
    ok(l1 === moveTo && l1 !== l0 && mv && mv.reg === 'head' && mv.rp === HP[1] && JSON.stringify(tgm.nodes.filter((n) => n.reg === 'head').map((n) => n.part).sort()) === JSON.stringify(HP.slice().sort()) && tgm.nodes.filter((n) => n.rp === 'marks').length === tg.strip,
      'D-090 · ' + k + ' · the regions follow the parts: with the pill (' + HP[1] + ') moved from line ' + (l0 + 1) + ' to line ' + (l1 + 1) + ' it still gives the head card, and the marks are still items', { l0, l1, mv: mv && mv.reg });
    await p.evaluate((a) => window.__allepEx.move(a[0], a[1], 'off'), [k, HP[0]]); await p.waitForTimeout(120);
    const hid = await tgs();
    ok(!hid.drawn.includes(HP[0]) && hid.nodes.filter((n) => n.reg === 'head').map((n) => n.part).join() === HP[1], 'D-090 · ' + k + ' · a part he hides has no region: with the glyph not drawn only the pill is left of the head region, and it still gives its card', hid.nodes.filter((n) => n.reg === 'head'));
    await p.evaluate((a) => { const st = window.__allepEx.state.col[a[0]]; st.look.rows = a[1][0]; st.look.off = a[1][1]; window.__allepEx.render(); }, [k, rows0]); await p.waitForTimeout(150);
    await p.evaluate((a) => { const st = window.__allepEx.state.col[a[0]]; st.look.rows = JSON.parse(JSON.stringify(window.__allep.data.ex.look[a[0]].rows)); st.look.off = JSON.parse(JSON.stringify(window.__allep.data.ex.look[a[0]].off || [])); window.__allepEx.render(); }, [k]); await p.waitForTimeout(150);
    ok((await p.evaluate((q) => window.__allepEx.copy(q), k)) === P.copy, 'D-090 · ' + k + ' · his configuration: after the parts are moved about, hidden and put back, the copy line is byte-identical to the default\'s — the line\'s format and the part ids did not change');
    ok((await p.evaluate(() => { try { return window.localStorage.getItem('gabe:allep:bench:v3'); } catch (e) { return 'no storage'; } })) !== null || stK === null, 'D-090 · ' + k + ' · moving the parts is the page\'s own save; the hovers wrote nothing of their own');
    console.log('  D-090 ' + tag + ' · head ' + (g ? g.rows : '—') + ' rows · items ' + IP.join('/') + ' · marks ' + tg.strip + ' (' + X.distinct + ' distinct)');
  }
  /* (7) every element of every endpoint: a head card, each location part it draws, each mark — made through card() and its guard */
  const plan = [], want = {}, bump = (key) => { want[key] = (want[key] || 0) + 1; };
  for (const k of KS) for (const x of ELS(k)) { const hp = Object.keys(REGS[k]).filter((q) => REGS[k][q] === 'head')[0];
    plan.push([k, x.r.id, x.e[0], 'head', hp, 0]); bump(k + ':head:' + hp);
    for (const q of Object.keys(REGS[k]).filter((q) => REGS[k][q] === 'items' && q !== 'marks')) if (EXISTS[k][q](x)) { plan.push([k, x.r.id, x.e[0], 'items', q, 0]); bump(k + ':items:' + q); }
    for (let i = 0; i < MKN[k](x); i++) { plan.push([k, x.r.id, x.e[0], 'items', 'marks', i]); bump(k + ':items:marks'); } }
  const swp = await p.evaluate((pl) => { const C = window.__allepCard, D0 = window.__allep.data, BY = {}; D0.rows.forEach((r) => { BY[r.id] = r; }); const o = { n: 0, by: {}, issues: [], errs: [], noReg: 0, notReg: 0, names: new Set() };
    for (const [k, ep, id, reg, rp, ri] of pl) { try { const r = BY[ep], e = r.ex[k].filter((x) => x[0] === id)[0], it = { k, id, role: e[1], ep, o: e[2] }, S0 = C.region(k, it, reg, rp, ri, null); if (!S0) { o.noReg++; continue; }
        const d = document.createElement('div'); d.innerHTML = C.make('reg', S0); const cc = d.firstChild; o.n++; o.by[k + ':' + reg + ':' + rp] = (o.by[k + ':' + reg + ':' + rp] || 0) + 1;
        if (cc.getAttribute('data-card') !== 'reg' || cc.hasAttribute('data-card-unknown-kind') || cc.hasAttribute('data-card-unbound')) o.notReg++;
        if (+cc.getAttribute('data-card-issues')) o.issues.push(k + ' ' + id + ' ' + rp + ri + ' → ' + cc.getAttribute('data-card-issue')); } catch (x) { o.errs.push(k + ' ' + id + ' ' + rp + ' ' + x.message); } }
    delete o.names; return o; }, plan);
  console.log('  D-090 every element: ' + swp.n + ' region cards over ' + D.rows.length + ' endpoints · ' + KS.map((k) => k + ' ' + Object.entries(swp.by).filter(([q]) => q.startsWith(k + ':')).reduce((n, [, v]) => n + v, 0)).join(' · '));
  ok(swp.n === plan.length && plan.length > 15000 && JSON.stringify(Object.entries(swp.by).sort()) === JSON.stringify(Object.entries(want).sort()) && !swp.noReg && !swp.notReg && !swp.errs.length && !swp.issues.length,
    'D-090 · all ' + D.rows.length + ' endpoints: ' + swp.n + ' region cards (' + KS.map((k) => k + ' ' + ELS(k).length + ' heads').join(', ') + ' and every location part and mark of the seven kinds), each made through card() and its guard — none with an issue (P1.1 · P2.1 · P4.1 · P8.1), none that fails to draw, none of a kind it does not know',
    { n: swp.n, want: plan.length, issues: swp.issues.slice(0, 3), errs: swp.errs.slice(0, 3), noReg: swp.noReg, notReg: swp.notReg, diff: Object.keys(want).filter((q) => want[q] !== swp.by[q]).slice(0, 5) });
  const gd3 = await p.evaluate(() => { const C = window.__allepCard, D0 = window.__allep.data, r = D0.rows.filter((x) => x.id === 'POST /cooking/sessions')[0], e = r.ex.table.filter((x) => x[0] === 'table:cooking_sessions')[0], it = { k: 'table', id: e[0], role: e[1], ep: r.id, o: e[2] },
      S0 = C.region('table', it, 'head', 'icon', 0, null), box = document.createElement('div'); box.innerHTML = C.make('reg', S0); const root = () => box.firstChild.cloneNode(true), mk = (c, txt) => { const n = document.createElement('span'); n.className = c; n.textContent = txt; return n; };
    const run = (mut, F) => { const x = root(); mut(x); return C.guard(x, F || { joins: [] }); };
    return { clean: run(() => {}), p21: run((x) => x.appendChild(mk('cdt', 'the code map holds it'))), p41: run(() => {}, { joins: [{ end: 'function', want: ['a_function_named_nowhere'] }] }) }; });
  ok(gd3.clean.length === 0 && gd3.p21.some((q) => q.startsWith('p2.1')) && gd3.p41.some((q) => q.startsWith('p4.1')), 'D-090 · the guard stays silent on a clean head card of another kind and fires on one made to break a rule (P2.1 words about the map · P4.1 a join\'s other end not named)', gd3);
  ok((await p.evaluate(() => window.__allepCard.log.length)) === 0 && !errs.length, 'D-090 · the renderer\'s log holds no issue and the page raised no error after every region hover and the sweep', { log: await p.evaluate(() => window.__allepCard.log.slice(0, 2)), errs: errs.slice(0, 3) });

  /* 39 · D-091 (his, comparing the bench's `users` table block with the endpoint lab's: "The font is different. I don't know if maybe the icon size is different. In the endpoint lab, we have the lines
     actually aligning, and not in the old endpoints … there is some encoding for the keys that can be null or not on the tables. There are some markers in the corners … We should apply that in the table
     section here, and we can do the same for anything similar on the other elements … schemas … functions, endpoints, gates, or any other element, maybe in the other corners or with other colors").
     Measured, not looked at, on POST /cooking/sessions, the lab's own `users` block (endpoint-lab.html, read-only) against the bench's:
   (1) the type — the computed font family of the block and of every part is the lab's `--font-mono` (read from the lab's own variables, never typed here), the size and glyph box of each part the lab sizes
       (icon · name · entity · count · channel · class) equal, the text of each left part starting at the lab's x (±1px), the glyph centred on its line as the lab centres it;
   (2) the lines align on every kind: a line that leads with text starts where the title's text starts, a line that leads with its own glyph keeps the lab's geometry;
   (3) a table's field marks are the lab's one mark: the type's colour on each, a column that can be null at the optional stop of the opacity bar (paler), a unique column cornered at its top right and
       bottom left — checked on every table of the endpoint against the forms feed's own columns (`nullable`) and unique constraints, read here and never from the page's data;
   (4) a schema's marks: an optional field (not required in the feed) paler, no corners (the feed names no unique field of a schema);
   (5) the legend under a block says each new mark once, counted over the element's own fields, and the mark's card says the column, its type, optional or required, unique or not, the key it points to;
   (6) item 4 — the yes/no options of a function (a write a commit saves), a test (a request that proves an ending) and an ending (a fork the way takes): off by default, my pick dashed, the marks as the
       feed says, the card of a mark saying its fact only while the option is on, the copy line growing only when it is on, an old saved configuration read as it was (no migration);
   (7) every element of every endpoint, with the options on: each mark's card and each block's card made through card() and its guard, none with an issue */
  {
  const WROPS = new Set(['add', 'update', 'delete', 'insert', 'upsert', 'merge', 'bulk_insert', 'execute', 'write']);
  const YW = D.words.ex.yn, IW9 = D.words.ex.region.item, CMK = D.words.mo.card, SQC = {}; D.ex.sq.forEach((x) => { SQC[x.key] = x.col; });
  const MODELS = {}; Object.values(FJ.models || {}).forEach((m) => { if (m.table) MODELS[m.table] = m; });
  const LABMONO = /--font-mono:\s*([^;"]+?)\s*;/.exec(fs.readFileSync(path.join(HERE, '_station.js'), 'utf8'))[1].replace(/,\s*/g, ', ');   /* as the browser spells a computed stack */
  const MEAS = (sel) => { const blk = document.querySelector(sel); if (!blk) return null; const br = blk.getBoundingClientRect(), out = { fam: getComputedStyle(blk.querySelector('.bkhd')).fontFamily, lines: [] };
    blk.querySelectorAll('.bkln').forEach((ln) => { const L = [];
      ln.querySelectorAll('.bkcol').forEach((col, ci) => { [...col.children].forEach((n) => { const r = n.getBoundingClientRect(), cs = getComputedStyle(n), sv = n.querySelector('svg'), tn = [...n.querySelectorAll('*')].concat([n]).map((x) => [...x.childNodes].find((c) => c.nodeType === 3 && c.textContent.trim())).find(Boolean);
        let tx = null; if (tn) { const rg = document.createRange(); rg.selectNodeContents(tn); tx = rg.getBoundingClientRect().left - br.left; }
        L.push({ side: ci ? 'r' : 'l', c: String(n.className || n.tagName).split(' ')[0], fs: parseFloat(cs.fontSize), fam: cs.fontFamily, svg: sv ? [sv.getBoundingClientRect().width, sv.getBoundingClientRect().height] : null, bx: r.left - br.left, tx, cy: (r.top + r.bottom) / 2 - br.top }); }); });
      out.lines.push(L); }); return out; };
  const ALIGN = (sel) => { const blk = document.querySelector(sel), br = blk.getBoundingClientRect(), ic = blk.querySelector('.bkcol.l > .bki'); if (!ic) return { icon: false, out: [] };
    const out = []; blk.querySelectorAll('.bkln').forEach((ln, i) => { const A = ln.querySelector('.bkcol.l'), f0 = A && A.firstChild; if (!f0) return;
      out.push({ i, kind: f0.classList.contains('bki') ? 'icon' : (f0.firstChild && f0.firstChild.nodeName.toLowerCase() === 'svg') ? 'glyph' : 'text', x: f0.getBoundingClientRect().left - br.left }); });
    return { icon: true, want: ic.getBoundingClientRect().right + 7 - br.left, iconX: ic.getBoundingClientRect().left - br.left, out }; };
  const STRIP = (sel) => { const blk = document.querySelector(sel); return [...blk.querySelectorAll('.sqs > .sq')].map((q) => ({ cls: q.className, fc: q.style.getPropertyValue('--fc'), op: getComputedStyle(q).opacity, bef: getComputedStyle(q, '::before').content, aft: getComputedStyle(q, '::after').content,
    name: q.getAttribute('data-w'), mk: q.getAttribute('data-mk'), yn: q.getAttribute('data-yn'), fil: getComputedStyle(q).filter })); };
  await open(PAGE); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(500);
  const labp = await ctx.newPage(); labp.on('pageerror', (e) => errs.push('lab: ' + e.message)); await labp.goto('file://' + path.join(HERE, 'endpoint-lab.html')); await labp.waitForTimeout(2200);
  const TBK = '#exgrid .excol[data-k="table"] .blk';
  await p.evaluate(() => window.__allepEx.pick('table', 'table:users')); await p.waitForTimeout(300);
  const mb = await p.evaluate(MEAS, TBK), ml = await labp.evaluate(MEAS, '.blk[data-table="users"]'), flat = (m) => m.lines.flat(), part = (m, c) => flat(m).find((n) => n.c === c);
  /* (1) the type, the sizes, the alignment of the `users` block, against the lab's */
  ok(ml && mb && ml.fam === LABMONO && mb.fam === ml.fam && flat(mb).every((n) => n.fam === ml.fam) && flat(ml).every((n) => n.fam === ml.fam), 'D-091 · the font: the bench\'s `users` block and every part of it draw in the lab\'s monospace stack (' + LABMONO + ')', { lab: ml && ml.fam, bench: mb && mb.fam, want: LABMONO });
  const PC = ['bki', 'B', 'bke', 'bkn', 'bkrw', 'bkm'], szOk = PC.map((c) => { const a = part(ml, c), z = part(mb, c); return a && z && Math.abs(a.fs - z.fs) < 0.1 && JSON.stringify(a.svg) === JSON.stringify(z.svg) ? [c, 'ok'] : [c, 'bad', a && [a.fs, a.svg], z && [z.fs, z.svg]]; });
  ok(szOk.every((v) => v[1] === 'ok'), 'D-091 · the sizes: the glyph box (' + JSON.stringify(part(mb, 'bki').svg) + '), the name (' + part(mb, 'B').fs + 'px), the entity and the class (' + part(mb, 'bke').fs + 'px, glyph ' + JSON.stringify(part(mb, 'bke').svg) + '), the count (' + part(mb, 'bkn').fs + 'px) and the channel chip (' + part(mb, 'bkrw').fs + 'px) are the lab\'s', szOk.filter((v) => v[1] !== 'ok'));
  const xs = [['bki', 'bx'], ['B', 'tx'], ['bke', 'tx'], ['bkm', 'tx']].map(([c, f]) => [c, part(ml, c)[f], part(mb, c)[f]]);
  ok(xs.every(([, a, z]) => Math.abs(a - z) <= 1), 'D-091 · the lines: the text of each left part starts where the lab\'s does — glyph ' + xs[0][2].toFixed(1) + ', name ' + xs[1][2].toFixed(1) + ', entity ' + xs[2][2].toFixed(1) + ', class ' + xs[3][2].toFixed(1) + ' (lab ' + xs.map((q) => q[1].toFixed(1)).join(' · ') + ')', xs);
  const dyl = part(ml, 'bki').cy - part(ml, 'B').cy, dyb = part(mb, 'bki').cy - part(mb, 'B').cy;
  ok(Math.abs(dyb - dyl) <= 1 && Math.abs(dyb) <= 1, 'D-091 · the glyph sits on the middle of its line as the lab\'s does (offset ' + dyb.toFixed(1) + 'px, lab ' + dyl.toFixed(1) + 'px)', { dyl, dyb });
  console.log('  D-091 users block · font ' + mb.fam + ' · sizes ' + PC.map((c) => c + ' ' + part(mb, c).fs + (part(mb, c).svg ? '/' + part(mb, c).svg[0] : '')).join(' ') + ' · text x ' + xs.map((q) => q[0] + ' ' + q[2].toFixed(1)).join(' ') + ' (lab ' + xs.map((q) => q[1].toFixed(1)).join(' ') + ') · glyph offset ' + dyb.toFixed(1));
  /* (2) every other kind: a line that leads with text starts where the title's text starts; one that leads with its own glyph keeps the lab's geometry */
  const al = {}; for (const k of ['table', 'schema', 'fn', 'end', 'test', 'gate', 'hook', 'inf']) al[k] = await p.evaluate(ALIGN, '#exgrid .excol[data-k="' + k + '"] .blk');
  const alOk = Object.entries(al).map(([k, a]) => [k, a.icon && a.out.every((q) => q.kind === 'text' ? Math.abs(q.x - a.want) <= 1 : Math.abs(q.x - a.iconX) <= 1), a.out.filter((q) => q.kind === 'text').length]);
  ok(alOk.every(([, v]) => v) && alOk.filter(([, , n]) => n > 0).length >= 5, 'D-091 · the lines align on every kind: a line that leads with text starts at the title\'s text (' + alOk.map(([k, , n]) => k + ' ' + n).join(' · ') + ' such lines), a line that leads with a glyph keeps the glyph column', { al, alOk });
  /* (3) the table marks, on every table of the endpoint */
  const TBL = await p.evaluate((ep) => window.__allep.data.rows.filter((x) => x.id === ep)[0].ex.table.map((e) => e[0]), E), tstat = { tables: 0, marks: 0, corner: 0, cornerWant: 0, pale: 0, paleWant: 0, bad: [], sk: 0 };
  for (const id of TBL) { await p.evaluate((i) => window.__allepEx.pick('table', i), id); await p.waitForTimeout(120);
    const c = await p.evaluate((i) => window.__allep.data.ex.cat[i], id), mk = await p.evaluate(STRIP, TBK), mod = MODELS[c.n], uqc = new Set(((mod && mod.constraints && mod.constraints.uniques) || []).flatMap((u) => u.cols));
    tstat.tables++; if (mk.length !== c.cols.length + (c.more || []).length) tstat.bad.push([c.n, 'marks', mk.length]);
    c.cols.forEach((f, i) => { const m = mk[i], mc = mod && mod.columns[f[0]], pale = mc ? !!mc.nullable : !!f[3], uq = uqc.has(f[0]); tstat.marks++;
      if (!mc) tstat.sk++; if (pale) tstat.paleWant++; if (uq) tstat.cornerWant++;
      const typeOk = m.cls.includes('t-' + f[2]) && m.fc === SQC[f[2]], palOk = m.op === (pale ? '0.5' : '1'), cOk = (m.bef === '""' && m.aft === '""') === uq && (uq || (m.bef === 'none' && m.aft === 'none'));
      if (m.op === '0.5') tstat.pale++; if (m.bef === '""') tstat.corner++; if (!typeOk || !palOk || !cOk) tstat.bad.push([c.n, f[0], f[1], { typeOk, palOk, cOk, op: m.op, bef: m.bef, fc: m.fc }]); }); }
  ok(tstat.tables === TBL.length && tstat.tables >= 10 && !tstat.bad.length && tstat.corner === tstat.cornerWant && tstat.pale === tstat.paleWant && tstat.cornerWant > 0 && tstat.paleWant > 0,
    'D-091 · all ' + tstat.tables + ' tables of the endpoint, ' + tstat.marks + ' field marks: each wears its type\'s colour, the ' + tstat.paleWant + ' that can be null are paler (the optional stop, half strength), the ' + tstat.cornerWant + ' a unique key names carry both corners (' + tstat.corner + ' drawn) — read from the forms feed, ' + tstat.sk + ' column the feed names otherwise', tstat);
  console.log('  D-091 tables on ' + E + ' · ' + tstat.tables + ' tables · ' + tstat.marks + ' field marks · cornered ' + tstat.corner + ' of ' + tstat.cornerWant + ' unique · paler ' + tstat.pale + ' of ' + tstat.paleWant + ' nullable');
  /* (4) a schema's marks */
  const SCH = await p.evaluate((ep) => window.__allep.data.rows.filter((x) => x.id === ep)[0].ex.schema.map((e) => e[0]), E), sst = { n: 0, marks: 0, pale: 0, want: 0, bad: [], corner: 0 };
  for (const id of SCH) { await p.evaluate((i) => window.__allepEx.pick('schema', i), id); await p.waitForTimeout(120);
    const mk = await p.evaluate(STRIP, '#exgrid .excol[data-k="schema"] .blk'), fl = (FJ.schemas[id] || {}).fields || []; sst.n++;
    if (mk.length !== fl.length || !fl.length) sst.bad.push([id, mk.length, fl.length]);
    fl.forEach((f, i) => { const m = mk[i]; sst.marks++; if (!f.required) sst.want++; if (m.op === '0.5') sst.pale++; if (m.bef === '""') sst.corner++; if (m.op !== (f.required ? '1' : '0.5') || m.bef !== 'none' || !m.fc) sst.bad.push([id, f.name, m.op, m.bef]); }); }
  ok(sst.n === SCH.length && sst.n >= 3 && !sst.bad.length && sst.pale === sst.want && sst.want > 0 && sst.corner === 0, 'D-091 · the ' + sst.n + ' schemas of the endpoint, ' + sst.marks + ' field marks: the ' + sst.want + ' fields the feed does not require are paler (' + sst.pale + ' drawn), none is cornered (the feed names no unique schema field)', sst);
  console.log('  D-091 schemas on ' + E + ' · ' + sst.n + ' schemas · ' + sst.marks + ' field marks · paler ' + sst.pale + ' of ' + sst.want + ' optional · cornered ' + sst.corner);
  /* (5) the legend and the mark's card, on `users` (two unique columns, two that can be null) and on a schema */
  await p.evaluate(() => window.__allepEx.pick('table', 'table:users')); await p.waitForTimeout(250);
  const usr = await p.evaluate(() => window.__allep.data.ex.cat['table:users']), uMod = MODELS.users, uqU = new Set(uMod.constraints.uniques.flatMap((u) => u.cols)), nU = usr.cols.filter((f) => uMod.columns[f[0]].nullable).length, qU = usr.cols.filter((f) => uqU.has(f[0])).length;
  /* D-092 (his: "in Users … we also put the legend … We don't want that. In the endpoint lab, we are not putting that there"): no legend under any block — what a
     paler or a cornered mark means is in the mark's own card (below) */
  const lgN = await p.evaluate(() => document.querySelectorAll('#exgrid .exlg, #exgrid .exlgi').length), uqDrawn = await p.evaluate((sel) => [...document.querySelectorAll(sel + ' .sqs > .sq')].filter((q) => getComputedStyle(q, '::before').content === '""').length, TBK);
  ok(lgN === 0 && nU > 0 && qU > 0 && uqDrawn === qU, 'D-092 · no legend under the `users` block, nor under any other: its ' + qU + ' unique marks keep their corners, its ' + nU + ' that can be null stay paler, and the meaning is in each mark\'s card', { lgN, uqDrawn, qU, nU });
  const colIx = (n) => usr.cols.findIndex((f) => f[0] === n), cardOf = (i) => hoverCard(TBK + ' .sqs > .sq', i);
  const cU = await cardOf(colIx('auth_provider')), cO = await cardOf(colIx('email')), cI = await cardOf(colIx('id')), uf = usr.cols[colIx('auth_provider')], ef = usr.cols[colIx('email')];
  ok(cU && cU.card === 'reg' && cU.rp === 'marks' && !cU.issues && cU.name === 'auth_provider' && cU.text.includes(uf[1]) && cU.pills.includes(CMK.required) && cU.pills.includes(IW9.uqYes) && cU.text.includes(IW9.uqWith) && cU.text.includes('auth_provider_id'),
    'D-091 · a unique field\'s card: the column (auth_provider), its type (' + uf[1] + '), required, unique, and what it is unique together with — no renderer issue', cU && { name: cU.name, pills: cU.pills, issue: cU.issue });
  ok(cO && !cO.issues && cO.name === 'email' && cO.text.includes(ef[1]) && cO.pills.includes(CMK.optional) && cO.pills.includes(IW9.uqNo) && !cO.pills.includes(IW9.uqYes) && cI && !cI.issues && cI.pills.includes(CMK.required) && cI.pills.includes(IW9.uqNo),
    'D-091 · a field that can be null and is not unique says so (optional · not unique), and a key column says required · not unique', cO && { pills: cO.pills, id: cI && cI.pills });
  await p.evaluate(() => window.__allepEx.pick('table', 'table:cooking_sessions')); await p.waitForTimeout(250);
  const cs = await p.evaluate(() => window.__allep.data.ex.cat['table:cooking_sessions']), fkc = cs.fks[0], cF = await hoverCard(TBK + ' .sqs > .sq', cs.cols.findIndex((f) => f[0] === fkc[0]));
  ok(cF && !cF.issues && cF.name === fkc[0] && cF.text.includes(fkc[1]) && cF.text.includes(IW9.fk), 'D-091 · a key to another table says where it points: ' + fkc[0] + ' ' + IW9.fk + ' ' + fkc[1], cF && cF.text.slice(0, 160));
  await p.evaluate(() => window.__allepEx.pick('schema', 'schema:CookingSessionResponse')); await p.waitForTimeout(250);
  const SBK = '#exgrid .excol[data-k="schema"] .blk', scr = await p.evaluate(() => window.__allep.data.ex.cat['schema:CookingSessionResponse']), oi = scr.cols.findIndex((f) => !f[4]), cS = await hoverCard(SBK + ' .sqs > .sq', oi),
    lgS = await p.evaluate((sel) => [...document.querySelectorAll(sel + ' .exlgi')].map((i) => [i.getAttribute('data-lg'), +i.getAttribute('data-n')]), SBK), nOptS = scr.cols.filter((f) => !f[4]).length;
  ok(cS && !cS.issues && cS.name === scr.cols[oi][0] && cS.pills.includes(CMK.optional) && !lgS.length, 'D-091 · a schema field that may be left out: its card says optional (' + nOptS + ' of ' + scr.cols.length + ' fields), and no legend sits under the block (D-092)', { pills: cS && cS.pills, lgS });
  /* (6) item 4 — the options. What the feed says is read HERE, from forms.json: a function's write that a commit saves (the step's own bucket), a test's request that proves an ending (its `refs`), a fork the way takes (the chain's `hit`) */
  const OPTK = ['fn', 'test', 'end'], KEEP = { fn: PINS.fn.copy, test: PINS.test.copy, end: BASE_COPY }, E2 = 'DELETE /pantry/locations/{location_id}';
  await open(PAGE); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(450);
  const o0 = await p.evaluate((ks) => ks.map((k) => ({ k, fact: window.__allepEx.state.col[k].look.fact, def: window.__allep.data.ex.look[k].fact, on: document.querySelectorAll('#exgrid .excol[data-k="' + k + '"] .sqs > .sq[data-yn]').length,
    opts: [...document.querySelectorAll('#exgrid .excol[data-k="' + k + '"] .exynopts [data-xyn]')].map((b) => ({ v: b.getAttribute('data-v'), on: b.getAttribute('aria-checked'), pick: b.hasAttribute('data-pick'), bs: getComputedStyle(b).borderTopStyle, label: b.getAttribute('aria-label') })),
    lg: document.querySelectorAll('#exgrid .excol[data-k="' + k + '"] .exlg').length, copy: window.__allepEx.copy(k) })), OPTK);
  ok(o0.every((x) => x.fact === 'off' && x.def === 'off' && x.on === 0 && x.lg === 0 && x.copy === KEEP[x.k] && JSON.stringify(x.opts.map((q) => q.v)) === JSON.stringify(Object.keys(YW.opts)) && x.opts.filter((q) => q.on === 'true').map((q) => q.v).join() === 'off'
    && x.opts.filter((q) => q.pick).map((q) => q.v).join() === YW.pick && x.opts.every((q) => (q.bs === 'dashed') === (q.v === YW.pick) && q.label === YW.opts[q.v].name)),
    'D-091 · item 4: the fact option of a function, a test and an ending is OFF by default — no mark carries it, no legend entry, the copy line is the one before the change — and my pick (' + YW.opts[YW.pick].name + ') is the dashed one', o0);
  const facts = async (ep) => { const epj = FJ.endpoints['endpoint:' + ep], saved = {}, sk = (f, t) => f + '|' + t;
    for (const pth of epj.paths) { const e = pth.effects, bk = {}; ['committed', 'maybe_committed', 'rolled_back', 'uncommitted'].forEach((b) => (e[b] || []).forEach((id) => { bk[id] = b; }));
      for (const s of e.steps) { const st = FJ.steps[s.step] || {}; if (!st.fn || !st.table || !WROPS.has(st.op)) continue; const key = sk(st.fn, st.table); saved[key] = saved[key] || bk[s.step] === 'committed'; } }
    await p.evaluate((e) => window.__allep.pick(e), ep); await p.waitForTimeout(350);
    const R = await p.evaluate((e) => { const D0 = window.__allep.data, r = D0.rows.filter((x) => x.id === e)[0], c = (i) => D0.ex.cat[i]; return { fn: r.ex.fn.map((x) => [x[0], x[2].ops.map((q) => q[0] + '|' + q[1])]),
      test: r.ex.test.map((x) => [x[0], c(x[0]).cid, c(x[0]).calls.map((q) => q[2])]), end: r.ex.end.map((x) => [x[0], c(x[0]).paths[0] || null]) }; }, ep);
    const out = { fn: R.fn.map(([id, ops]) => [id, ops.map((o) => { const [rw, t] = o.split('|'); const k = sk(id.replace(/^fn:/, ''), t); return rw.includes('w') && k in saved ? (saved[k] ? 1 : 0) : null; })]),
      test: R.test.map(([id, cid, roles]) => [id, roles.length ? roles.map((rl, i) => rl === 'act' ? (((FJ.test_cases[cid] || {}).calls || [])[i].refs || []).some((z) => !String(z.conf || '').startsWith('ambiguous')) ? 1 : 0 : null) : null]),
      end: R.end.map(([id, pid]) => [id, pid ? epj.paths.filter((x) => x.id === pid)[0].chain.filter((c) => c.kind === 'branch').map((c) => (c.hit ? 1 : 0)) : []]) };
    return out; };
  const factsOf = (mk) => mk.map((m) => (m.mk && /-y$/.test(m.mk) ? 1 : m.mk && /-n$/.test(m.mk) ? 0 : null));
  const setFact = (k, v) => p.evaluate((a) => { window.__allepEx.state.col[a[0]].look.fact = a[1]; window.__allepEx.render(); }, [k, v]);
  const yst = { fn: { yes: 0, no: 0, none: 0, items: 0 }, test: { yes: 0, no: 0, none: 0, items: 0 }, end: { yes: 0, no: 0, none: 0, items: 0 } }, ybad = [], FOUND = {};
  for (const ep of [E, E2]) { const F = await facts(ep); FOUND[ep] = F;
    for (const k of OPTK) { const BK = '#exgrid .excol[data-k="' + k + '"] .blk';
      for (const [id, want] of F[k]) { await p.evaluate((a) => window.__allepEx.pick(a[0], a[1]), [k, id]); await p.waitForTimeout(40);
        const off = await p.evaluate(STRIP, BK); if (off.some((m) => m.yn || /-[yn]$/.test(m.mk || ''))) ybad.push([ep, k, id, 'off carries a fact']);
        await setFact(k, 'corners'); await p.waitForTimeout(40);
        const on = await p.evaluate(STRIP, BK), got = factsOf(on); yst[k].items++;
        let exp = want; if (k === 'end') { const br = want.slice(); exp = on.map((m) => (/^way-branch/.test(m.mk || '') ? br.shift() : null)); if (br.length) exp = null; } else if (k === 'test' && want === null) exp = on.map(() => null);
        if (!exp || JSON.stringify(got) !== JSON.stringify(exp)) ybad.push([ep, k, id, got, exp]);
        got.forEach((v) => { yst[k][v === 1 ? 'yes' : v === 0 ? 'no' : 'none']++; });
        on.forEach((m, i) => { const y = got[i]; if (y == null ? (m.yn || /\byn\b/.test(m.cls)) : !(m.yn === 'corners' && m.cls.includes(y ? 'yny' : 'ynn') && ((m.bef === '""' && m.aft === '""') === (y === 1)))) ybad.push([ep, k, id, 'mark', i, m.cls, m.bef]); });
        await setFact(k, 'off'); } } }
  ok(!ybad.length && OPTK.every((k) => yst[k].items > 0 && yst[k].yes > 0 && yst[k].no > 0 && yst[k].none > 0), 'D-091 · item 4, with each option on, over every element of each kind on two endpoints (' + E + ' · ' + E2 + '): ' + OPTK.map((k) => k + ' ' + yst[k].items + ' elements · ' + yst[k].yes + ' yes · ' + yst[k].no + ' no · ' + yst[k].none + ' with no such fact').join(' · ') + ' — each mark as the feed says (' + OPTK.map((k) => YW.kinds[k].name).join(' · ') + ')', { yst, bad: ybad.slice(0, 4) });
  console.log('  D-091 options on ' + E + ' + ' + E2 + ' · ' + OPTK.map((k) => k + ' ' + yst[k].yes + ' yes ' + yst[k].no + ' no ' + yst[k].none + ' none').join(' · '));
  /* the option as a control: a real click, the legend, the card, the copy line, the storage, back to off */
  const clickOpt = async (k, v) => { await p.click('#exgrid .excol[data-k="' + k + '"] .exynopts [data-xyn="' + v + '"]'); await p.waitForTimeout(150); };
  for (const k of OPTK) { const ep = k === 'test' ? E : E2, F = FOUND[ep], BK = '#exgrid .excol[data-k="' + k + '"] .blk', K = YW.kinds[k];
    const loc = (st) => { for (const [id, w] of F[k]) { const i = (w || []).indexOf(st); if (i >= 0) return [id, i]; } return null; };
    await p.evaluate((e) => window.__allep.pick(e), ep); await p.waitForTimeout(300);
    const first = loc(1) || [F[k][0][0], 0];
    await p.evaluate((a) => window.__allepEx.pick(a[0], a[1]), [k, first[0]]); await p.waitForTimeout(100);
    const c0 = await p.evaluate((q) => window.__allepEx.copy(q), k), html0 = await p.evaluate((b) => document.querySelector(b + ' .sqs').outerHTML, BK);
    await clickOpt(k, 'corners');
    const s1 = await p.evaluate((a) => ({ fact: window.__allepEx.state.col[a].look.fact, lg: [...document.querySelectorAll('#exgrid .excol[data-k="' + a + '"] .exlgi')].map((i) => ({ lg: i.getAttribute('data-lg'), n: +i.getAttribute('data-n'), text: i.textContent.replace(/\s+/g, ' ').trim() })),
      chk: [...document.querySelectorAll('#exgrid .excol[data-k="' + a + '"] .exynopts [data-xyn]')].filter((b) => b.getAttribute('aria-checked') === 'true').map((b) => b.getAttribute('data-v')), store: JSON.parse(window.localStorage.getItem('gabe:allep:bench:v3') || '{}'), copy: window.__allepEx.copy(a) }), k);
    const mk1 = await p.evaluate(STRIP, BK), f1 = factsOf(mk1), ny = f1.filter((v) => v === 1).length;
    const nrm = (x) => x.replace(/ \([^()]*\)$/, ''), tailOf = (x) => (/ \(([^()]*)\)$/.exec(x) || [])[1];                 /* the line's closing "(my pick)" turns to "(your choice)" for any look that is not the default — the page's own rule */
    ok(s1.fact === 'corners' && s1.chk.join() === 'corners' && nrm(s1.copy) === nrm(c0).replace(' · not drawn', ' · ' + K.name + ' ' + YW.opts.corners.name + ' · not drawn') && tailOf(s1.copy) !== tailOf(c0) && s1.store.col && s1.store.col[k].look.fact === 'corners' && OPTK.filter((q) => q !== k).every((q) => !s1.store.col[q].look.fact || s1.store.col[q].look.fact === 'off')
      && !s1.lg.length && ny > 0, 'D-091 · ' + k + ' · turned on by a real click: the copy line grows by one phrase (' + K.name + ' ' + YW.opts.corners.name + ') and only that, it is saved for this column alone, and no legend appears (D-092)', { fact: s1.fact, lg: s1.lg, chk: s1.chk, copy: s1.copy.slice(-150) });
    /* the card of a mark that has the fact, of one that lacks it, of one that has no such fact */
    const at = async (st) => { const l = loc(st); if (!l) return null; await p.evaluate((a) => window.__allepEx.pick(a[0], a[1]), [k, l[0]]); await p.waitForTimeout(80);
      if (k !== 'end') return hoverCard(BK + ' .sqs > .sq', l[1]);
      const m = await p.evaluate(STRIP, BK), ix = m.map((x, i) => [x, i]).filter(([x]) => /^way-branch/.test(x.mk || '')); return hoverCard(BK + ' .sqs > .sq', ix[l[1]][1]); };
    const cy = await at(1), cn = await at(0);
    if (k === 'end') ok(cy && !cy.issues && cy.text.includes(D.words.ex.region.taken) && cn && !cn.issues && cn.text.includes(D.words.ex.region.notTaken), 'D-091 · end · the card of a fork says whether the way takes it (' + D.words.ex.region.taken + ' · ' + D.words.ex.region.notTaken + ') — it said so before the option, and says it after', { cy: cy && cy.text.slice(-90), cn: cn && cn.text.slice(-90) });
    else { const cz = await (async () => { await p.evaluate((a) => window.__allepEx.pick(a[0], a[1]), [k, (F[k].filter(([, w]) => (w || []).includes(null))[0] || F[k][0])[0]]); await p.waitForTimeout(80); const m = factsOf(await p.evaluate(STRIP, BK)), i = m.indexOf(null); return i >= 0 ? hoverCard(BK + ' .sqs > .sq', i) : null; })();
      ok(cy && !cy.issues && cy.text.includes(K.yes) && !cy.text.includes(K.no) && cn && !cn.issues && cn.text.includes(K.no) && !cn.text.includes(K.yes) && cz && !cz.issues && !cz.text.includes(K.yes) && !cz.text.includes(K.no),
        'D-091 · ' + k + ' · with the option on, the card of a mark that has the fact says "' + K.yes + '", one that lacks it says "' + K.no + '", and a mark of another nature says neither', { yes: cy && cy.text.slice(-130), no: cn && cn.text.slice(-130), none: cz && cz.text.slice(-100) }); }
    await p.evaluate((a) => window.__allepEx.pick(a[0], a[1]), [k, first[0]]); await p.waitForTimeout(100);
    const bc1 = await p.evaluate((b) => { const C = window.__allepCard, S0 = C.subject(document.querySelector(b)), d = document.createElement('div'); d.innerHTML = C.make(S0.ck, S0); return { issues: +d.firstChild.getAttribute('data-card-issues'), mx: [...d.querySelectorAll('.mx')].map((m) => [m.getAttribute('data-mk'), m.getAttribute('aria-label'), !!m.querySelector('[data-yn]')]) }; }, BK);
    ok(!bc1.issues && bc1.mx.every((m) => m[1]) && bc1.mx.some((m) => /-[yn]$/.test(m[0])) && bc1.mx.filter((m) => /-[yn]$/.test(m[0])).every((m) => m[2]), 'D-091 · ' + k + ' · the block\'s card counts the marks by the same words (' + bc1.mx.filter((m) => /-[yn]$/.test(m[0])).map((m) => m[1]).join(' · ') + ') and draws them as the strip does', bc1);
    if (k !== 'end') { const g0 = loc(0) || first; await p.evaluate((a) => window.__allepEx.pick(a[0], a[1]), [k, g0[0]]); await p.waitForTimeout(80); await clickOpt(k, 'grey'); const mk2 = await p.evaluate(STRIP, BK), w2 = factsOf(mk2);
      ok(mk2.every((m, i) => (w2[i] == null ? !m.yn : m.yn === 'grey') && (w2[i] === 0) === /grayscale/.test(m.fil) && m.bef === 'none') && w2.includes(0), 'D-091 · ' + k + ' · grey: a mark that lacks the fact is drawn in grey, the rest keep their colour, no corner is drawn (' + w2.filter((v) => v === 0).length + ' grey)', { w2 }); }
    await clickOpt(k, 'off'); await p.evaluate((a) => window.__allepEx.pick(a[0], a[1]), [k, first[0]]); await p.waitForTimeout(100);
    const s3 = await p.evaluate((a) => ({ copy: window.__allepEx.copy(a), html: document.querySelector('#exgrid .excol[data-k="' + a + '"] .blk .sqs').outerHTML, lg: document.querySelectorAll('#exgrid .excol[data-k="' + a + '"] .exlg').length }), k);
    ok(s3.copy === c0 && s3.html === html0 && !s3.lg, 'D-091 · ' + k + ' · turned off again: the copy line, the strip and the legend are what they were, byte for byte', { same: s3.copy === c0, strip: s3.html === html0, lg: s3.lg });
    await clickOpt(k, 'corners'); await p.click('#exgrid .excol[data-k="' + k + '"] .exreset'); await p.waitForTimeout(150);
    ok((await p.evaluate((a) => window.__allepEx.state.col[a].look.fact, k)) === 'off', 'D-091 · ' + k + ' · "back to the default" puts the option off too'); }
  /* an old saved configuration is read as it was: a look saved before this change has no `fact` — it stays as he left it, and the option is off */
  await p.evaluate(() => { const st = JSON.parse(JSON.stringify(window.__allepEx.state)), o = { lay: st.lay, follow: st.follow, col: {} }; Object.keys(st.col).forEach((k) => { const c = st.col[k], l = JSON.parse(JSON.stringify(c.look)); delete l.fact; o.col[k] = { scope: c.scope, role: c.role, id: c.id, look: l, width: c.width }; });
    o.col.fn.look.size.name = 15; window.localStorage.setItem('gabe:allep:bench:v3', JSON.stringify(o)); });
  await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 20000 }); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(400);
  const ol = await p.evaluate((ks) => ks.map((k) => [k, window.__allepEx.state.col[k].look.fact, window.__allepEx.state.col[k].look.size.name]), OPTK);
  ok(ol.every((x) => x[1] === 'off') && ol[0][2] === 15 && ol[1][2] !== 15, 'D-091 · his saved configuration (a look saved before the change, no `fact` in it) is read as it was — the size he set is kept (' + ol[0][2] + '), the option is off, nothing is migrated', ol);
  await p.evaluate(() => { try { window.localStorage.removeItem('gabe:allep:bench:v3'); } catch (e) {} }); await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 20000 }); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(400);
  /* (7) every element of every endpoint, the options on: every mark's card and every block's card through card() and its guard */
  const sw91 = { marks: 0, blocks: 0, issues: [], errs: [], unlabeled: 0 };
  await p.evaluate(() => { ['fn', 'test', 'end'].forEach((k) => { window.__allepEx.state.col[k].look.fact = 'corners'; }); });
  for (const id of D.rows.map((r) => r.id)) { await p.evaluate((ep) => window.__allep.pick(ep), id); await p.waitForTimeout(40);                       /* the cards read the open endpoint: each is made on its own */
    const r = await p.evaluate((ep) => { const C = window.__allepCard, D0 = window.__allep.data, r = D0.rows.filter((x) => x.id === ep)[0], o = { marks: 0, blocks: 0, issues: [], errs: [], unlabeled: 0 };
      const once = (h, tag) => { const d = document.createElement('div'); d.innerHTML = h; const cc = d.firstChild; if (+cc.getAttribute('data-card-issues')) o.issues.push(ep + ' · ' + tag + ' → ' + cc.getAttribute('data-card-issue')); return cc; };
      for (const k of ['table', 'schema', 'fn', 'test', 'end']) for (const e of (r.ex[k] || [])) { const it = { k, id: e[0], role: e[1], ep: r.id, o: e[2] }, c = D0.ex.cat[e[0]];
        try { const t = document.createElement('div'); t.setAttribute('data-tip', 'exblk'); t.setAttribute('data-exk', k); t.setAttribute('data-exid', e[0]); t.setAttribute('data-exep', r.id);
          const S0 = C.subject(t); o.blocks++; const cc = once(C.make(S0.ck, S0), k + ' ' + e[0] + ' block'); cc.querySelectorAll('.mx').forEach((m) => { if (!m.getAttribute('aria-label')) o.unlabeled++; });
          const n = k === 'table' ? c.cols.length + (c.more || []).length : k === 'schema' ? c.cols.length : k === 'fn' ? e[2].ops.length : k === 'test' ? (c.calls.length || c.raises.length) : 0;
          for (let i = 0; i < n; i++) { const S1 = C.region(k, it, 'items', 'marks', i, null); if (!S1) { o.errs.push(k + ' ' + e[0] + ' mark ' + i + ' has no region'); continue; } o.marks++; once(C.make('reg', S1), k + ' ' + e[0] + ' mark ' + i); }
        } catch (x) { o.errs.push(k + ' ' + e[0] + ' ' + x.message); } }
      return o; }, id);
    sw91.marks += r.marks; sw91.blocks += r.blocks; sw91.unlabeled += r.unlabeled; r.issues.forEach((x) => sw91.issues.push(x)); r.errs.forEach((x) => sw91.errs.push(x)); }
  await p.evaluate(() => { ['fn', 'test', 'end'].forEach((k) => { window.__allepEx.state.col[k].look.fact = 'off'; }); });
  /* a join the TABLE block's card already failed before this change — an undrawn table whose ops name a function the card's own rows never name (GET /recipes: 3 cards, measured on the page at d496480, same text) — is no
     part of this work and is told apart: every other issue is a failure, and none may sit on a schema, a function, a test, an ending or any mark */
  const PRE = /^[^·]+ · table table:\S+ block → (p4\.1 the function “[^”]+” is not named( \| )?)+$/, preIssues = sw91.issues.filter((x) => PRE.test(x)), newIssues = sw91.issues.filter((x) => !PRE.test(x));
  ok(sw91.blocks > 3000 && sw91.marks > 5000 && !newIssues.length && !sw91.errs.length && !sw91.unlabeled && preIssues.length <= 8, 'D-091 · all ' + D.rows.length + ' endpoints, the three options on: ' + sw91.blocks + ' block cards and ' + sw91.marks + ' field and mark cards made through card() and its guard — none with an issue of this work, none unmade, every counted mark labelled (' + preIssues.length + ' table block cards of undrawn tables keep a P4.1 join they had before)', { blocks: sw91.blocks, marks: sw91.marks, newIssues: newIssues.slice(0, 3), errs: sw91.errs.slice(0, 3), unlabeled: sw91.unlabeled, pre: preIssues.length });
  console.log('  D-091 every element: ' + sw91.blocks + ' block cards · ' + sw91.marks + ' mark cards');
  const log91 = await p.evaluate(() => window.__allepCard.log.filter((x) => !(x.ck === 'table' && x.issues.every((q) => /^p4\.1 the function “[^”]+” is not named$/.test(q)))).slice(0, 3));
  ok(!log91.length && !errs.length, 'D-091 · the renderer\'s log holds no issue of this work and the page (and the lab) raised no error', { log: log91, errs: errs.slice(0, 3) });
  /* D-092 · THE QUIET BANDS, by real mouse moves on the ending block (his: "put a container around all these icons and make it so the container doesn't offer any
     hover action … we just show the hover when we are hovering on those icons"): between two marks, and between the glyph and its status, no card shows; the rest of the
     block shows its own card as before, also when the pointer slides out of a band over the same element (no new mouseover — the handler's mousemove arm) */
  { await open(PAGE); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(450);
    const QB = '#exgrid .excol[data-k="end"] .blk', st0 = await p.evaluate(() => window.localStorage.getItem('gabe:allep:bench:v3'));
    await p.evaluate((b) => document.querySelector(b).scrollIntoView({ block: 'center' }), QB); await p.waitForTimeout(300);
    const G = await p.evaluate((b) => { const blk = document.querySelector(b), R = (n) => { const r = n.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 }; };
      return { ms: [...blk.querySelectorAll('.sqs > .sq[data-tip="exreg"]')].map(R), sqs: R(blk.querySelector('.sqs')), ic: R(blk.querySelector('[data-part="icon"]')), st: R(blk.querySelector('[data-part="status"]')), nm: R(blk.querySelector('[data-part="name"]')) }; }, QB);
    const at = async (x, y) => { await p.mouse.move(x, y); await p.waitForTimeout(90); return p.evaluate(() => { const t = document.getElementById('tip'), c = t.querySelector('.cdc'); return { show: t.getAttribute('data-show'), card: c ? c.getAttribute('data-card') : null, rp: c ? c.getAttribute('data-rp') : null }; }); };
    const my = G.ms[0].y, last = G.ms[G.ms.length - 1], steps = [];
    await p.mouse.move(5, 5);
    for (let i = 0; i < G.ms.length; i++) { steps.push(['mark ' + i, await at(G.ms[i].x, my)]); if (i + 1 < G.ms.length) steps.push(['gap ' + i, await at((G.ms[i].r + G.ms[i + 1].l) / 2, my)]); }
    const bad = steps.filter(([w, s]) => (w.startsWith('mark') ? !(s.show === 'true' && s.card === 'reg' && s.rp === 'marks') : s.show !== 'false'));
    ok(G.ms.length > 1 && !bad.length, 'D-092 · across the ending\'s ' + G.ms.length + ' marks, one by one: each mark shows its own card and each of the ' + (G.ms.length - 1) + ' gaps shows none — no block card, no stuck card', bad.slice(0, 4));
    const bx = last.r + 24 < G.sqs.r - 2 ? last.r + 24 : null, beyond = bx ? await at(bx, my) : null;
    ok(bx && beyond.show === 'true' && beyond.card === 'end', 'D-092 · past the last mark, on the empty rest of its row, the block\'s own card shows as before: the band is the marks\' outline, not the row', beyond);
    await at(G.ms[0].x, my); const q1 = await at((G.ms[0].r + G.ms[1].l) / 2, my), q2 = bx ? await at(bx, my) : null;
    ok(q1.show === 'false' && q2 && q2.show === 'true' && q2.card === 'end', 'D-092 · from a gap the pointer slides on along the same row past the marks, with no new element under it: the block\'s card comes back', { q1, q2 });
    const hy = Math.max(G.ic.t, G.st.t) + Math.min(G.ic.b - G.ic.t, G.st.b - G.st.t) / 2;
    const h1 = await at(G.ic.x, hy), h2 = await at((G.ic.r + G.st.l) / 2, hy), h3 = await at(G.st.x, hy), h4 = await at(G.nm.x, G.nm.y);
    ok(h1.show === 'true' && h1.card === 'reg' && h2.show === 'false' && h3.show === 'true' && h3.card === 'reg' && h4.show === 'true' && h4.card === 'end', 'D-092 · the glyph, the gap, the status, the title in turn: the glyph\'s card, none, the status\'s card, the block\'s card', { h1, h2, h3, h4 });
    ok((await p.evaluate(() => window.localStorage.getItem('gabe:allep:bench:v3'))) === st0 && !errs.length, 'D-092 · the moves wrote nothing to storage and the page raised no error', errs.slice(0, 3)); }
  /* ══ D-093 · THE CONTROLS, SECOND REVISION (his: "the size of the glyph will not change. Mark size won't change either. The gap between marks won't change either. Glyph
     color won't change … What could change is the way that we display data … the labeling, the content, just the number, just the icon" and "let's make a hover for every one
     of the items, and we will have an option to enable or disable the hover. The default should be as we have configured today"). By real clicks on the table column. ══ */
  { await open(PAGE); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(450);
    const TC = '#exgrid .excol[data-k="table"]', XD = D.ex, CW = D.words.ex;
    await p.evaluate(() => window.__allepEx.pick('table', 'table:users')); await p.waitForTimeout(150);
    /* (1) what is fixed has no control, and a saved look cannot move it */
    const fx = await p.evaluate(([CW, KS]) => { const o = {}; KS.forEach((k) => { const c = document.querySelector('#exgrid .excol[data-k="' + k + '"]'); if (!c.querySelector('.exctl')) return;
      o[k] = { labels: [...c.querySelectorAll('.exctl .exrg .rl')].map((x) => x.textContent), rows: [...c.querySelectorAll('.exeach .expr')].map((r) => r.getAttribute('data-part')),
        forms: [...c.querySelectorAll('.exeach .expr')].map((r) => [r.getAttribute('data-part'), r.querySelectorAll('[data-xform]').length, (r.querySelector('[data-xform][aria-checked="true"]') || { getAttribute: () => null }).getAttribute('data-v'), r.querySelector('.exhov').getAttribute('aria-pressed'), !!r.querySelector('.exsz')]) }; });
      return o; }, [CW, D.ex.kinds]);
    const gone = [CW.ctl.glyph, CW.ctl.markSize, CW.ctl.gap].concat(Object.keys(D.words.ex.parts).map((k) => CW.ctl.sizeOf.replace('{name}', D.words.ex.parts[k].icon.name)));
    const fbad = [];
    Object.entries(fx).forEach(([k, f]) => { if (f.labels.some((l) => gone.includes(l))) fbad.push(k + ': a fixed control is still there');
      if (JSON.stringify([...f.rows].sort()) !== JSON.stringify([...(XD.parts[k] ? XD.parts[k].map((q) => q.key) : Object.keys(D.words.ex.parts[k]))].sort())) fbad.push(k + ': rows ' + f.rows.join());
      f.forms.forEach(([pt, n, cur, hv, sz]) => { const F = (XD.forms[k] || {})[pt], H = (XD.look[k].hov || {})[pt]; if ((F ? F.opts.length : 0) !== n) fbad.push(k + '.' + pt + ': ' + n + ' forms');
        if (F && cur !== ((XD.look[k].mode || {})[pt] || F.def)) fbad.push(k + '.' + pt + ': drawn as ' + cur); if (hv !== (H ? 'true' : 'false')) fbad.push(k + '.' + pt + ': hover ' + hv);
        if (sz === (pt === 'icon' || pt === 'commit')) fbad.push(k + '.' + pt + ': size control ' + sz); }); });
    ok(Object.keys(fx).length === 8 && !fbad.length, 'D-093 · on all 8 columns: no control for the glyph\'s size or colour or the marks\' size and gap; one row per part, with exactly the forms its type takes (the drawn one pressed), a size for text parts only, and its hover switch pressed where the bench gave it its own card', fbad.slice(0, 6));
    const saved = await p.evaluate(() => { const X = window.__allepEx, o = JSON.parse(window.localStorage.getItem(X.key) || '{"col":{}}'); o.col = o.col || {}; o.col.table = Object.assign({}, o.col.table || {}, { look: Object.assign(JSON.parse(JSON.stringify(X.state.col.table.look)), { sqSize: 22, sqGap: 0, iconCol: 'entity', size: Object.assign({}, X.state.col.table.look.size, { icon: 24, name: 15 }) }) });
      window.localStorage.setItem(X.key, JSON.stringify(o)); return true; });
    await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 20000 }); await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(400);
    const rd = await p.evaluate(() => { const X = window.__allepEx, L = X.state.col.table.look, F = window.__allep.data.ex.fixed.table, w = document.querySelector('#exgrid .excol[data-k="table"] .exw'), g = w.querySelector('[data-part="icon"] svg');
      return { L: [L.sqSize, L.sqGap, L.iconCol, L.size.icon, L.size.name], F: [F.sqSize, F.sqGap, F.iconCol, F.icon], sq: w.style.getPropertyValue('--sq'), gw: g && g.getAttribute('width'), gc: g && getComputedStyle(g).color }; });
    ok(saved && rd.L[0] === rd.F[0] && rd.L[1] === rd.F[1] && rd.L[2] === rd.F[2] && rd.L[3] === rd.F[3] && rd.L[4] === 15 && rd.sq === rd.F[0] + 'px' && +rd.gw === rd.F[3],
      'D-093 · a saved look that set the marks to 22px with no gap, the glyph to 24px in its entity\'s colour is read with those put back (' + rd.F.join(' · ') + ') — the name size it set (15) is kept', rd);
    await p.evaluate(() => { try { window.localStorage.removeItem('gabe:allep:bench:v3'); } catch (e) {} }); await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 20000 });
    await p.evaluate((ep) => window.__allep.pick(ep), E); await p.waitForTimeout(400); await p.evaluate(() => window.__allepEx.pick('table', 'table:users')); await p.waitForTimeout(150);
    /* (2) the forms, by real clicks: the count as the number alone in its box, the channel as a dot, the class with its name before it, the entity as its glyph */
    const clickForm = async (pt, v) => { const s0 = TC + ' .expr[data-part="' + pt + '"] [data-xform][data-v="' + v + '"]'; await p.$eval(s0, (e) => e.scrollIntoView({ block: 'center' })); await p.click(s0); await p.waitForTimeout(120); };
    await clickForm('count', 'number'); await clickForm('rw', 'dot'); await clickForm('model', 'label'); await clickForm('ent', 'icon');
    const fm = await p.evaluate(() => { const b = document.querySelector('#exgrid .excol[data-k="table"] .blk'), q = (s) => b.querySelector(s), cnt = q('[data-part="count"]'), rw = q('[data-part="rw"]'), md = q('[data-part="model"]'), en = q('[data-part="ent"]');
      return { cnt: cnt && [cnt.textContent, cnt.classList.contains('badge'), cnt.getAttribute('aria-label')], rw: rw && [rw.classList.contains('exdotw'), rw.getAttribute('aria-label'), rw.textContent], md: md && [(md.querySelector('.exlab') || {}).textContent, md.textContent],
        en: en && [!!en.querySelector('svg'), en.textContent.trim()], line: document.querySelector('#exgrid .excol[data-k="table"] .exline').textContent }; });
    const c0 = D.ex.cat['table:users'], n0 = c0.cols.length + (c0.nmore || 0);
    ok(fm.cnt && fm.cnt[0] === String(n0) && fm.cnt[1] && fm.cnt[2] === CW.unit.fields.many.replace('{n}', n0) && fm.rw && fm.rw[0] && fm.rw[1] === 'RW' && !fm.rw[2] && fm.md && fm.md[0] === CW.parts.table.model.name && fm.md[1] === CW.parts.table.model.name + c0.model
       && fm.en && fm.en[0] && !fm.en[1] && fm.line.includes('chip dot') && fm.line.includes('count number') && fm.line.includes('model label') && fm.line.includes('entity icon') && fm.line.endsWith('(' + D.words.copy.his + ')'),
      'D-093 · four clicks: the count is the number alone in its box (' + (fm.cnt || [])[0] + ', its unit in its label), the channel a dot, the class says its name before it, the entity is its glyph — and the copy line says each, the look now his', fm);
    /* (3) the hover switches, by real clicks and a real hover: the name gets a card of its own; the glyph gives the block's card; the copy line says both; back to the default puts all back */
    const sw = async (pt) => { const s0 = TC + ' .expr[data-part="' + pt + '"] .exhov'; await p.$eval(s0, (e) => e.scrollIntoView({ block: 'center' })); await p.click(s0); await p.waitForTimeout(120); };
    await sw('name'); await sw('icon');
    const hv = async (pt) => { const h = await p.$(TC + ' .blk [data-part="' + pt + '"]'); await h.evaluate((x) => x.scrollIntoView({ block: 'center' })); const bb = await h.boundingBox(); await p.mouse.move(5, 5); await p.waitForTimeout(60);
      await p.mouse.move(bb.x + Math.min(bb.width / 2, 20), bb.y + bb.height / 2); await p.waitForTimeout(160);
      return p.evaluate(() => { const t = document.getElementById('tip'), c = t.querySelector('.cdc'); return { show: t.getAttribute('data-show'), card: c && c.getAttribute('data-card'), reg: c && c.getAttribute('data-reg'), rp: c && c.getAttribute('data-rp'), is: c && c.getAttribute('data-card-issues'), txt: c ? c.innerText.replace(/\s+/g, ' ').slice(0, 160) : '' }; }); };
    const hN = await hv('name'), hI = await hv('icon'); await p.mouse.move(5, 5);
    const ln3 = await p.$eval(TC + ' .exline', (e) => e.textContent);
    ok(hN.show === 'true' && hN.card === 'reg' && hN.reg === 'part' && hN.rp === 'name' && hN.is === '0' && hN.txt.includes('users') && hI.show === 'true' && hI.card === 'table' && ln3.includes(' · ' + CW.ctl.hover + ' ' + CW.parts.table.icon.name + ' block, ' + CW.parts.table.name.name + ' own'),
      'D-093 · two clicks on the switches: the name now has a card of its own (users, where it is defined; no rule broken), the glyph gives the block\'s card, and the copy line says both', { hN, hI, line: ln3.slice(ln3.indexOf(' · width') - 80) });
    await p.$eval(TC + ' .exreset', (e) => e.scrollIntoView({ block: 'center' })); await p.click(TC + ' .exreset'); await p.waitForTimeout(120);
    ok((await p.$eval(TC + ' .exline', (e) => e.textContent)).includes(' · ' + XD.his + ' · '), 'D-093 · back to the default puts the forms and the hovers back: the table is on his DATA line again');
    /* (4) every part of every element of this endpoint, every switch on: each part's own card is made and breaks no rule */
    const pc = await p.evaluate(() => { const C = window.__allepCard, D0 = window.__allep.data, r = D0.rows.filter((x) => x.id === window.__allep.open || x.id === 'POST /cooking/sessions')[0], o = { n: 0, issues: [], none: [] };
      Object.keys(D0.ex.regions).forEach((k) => (r.ex[k] || []).forEach((e) => { const it = { k, id: e[0], role: e[1], ep: r.id, o: e[2] };
        Object.keys(D0.ex.regions[k]).forEach((pt) => { if (pt === 'marks' || D0.ex.regions[k][pt] !== 'title') return; const S0 = C.region(k, it, 'part', pt, 0, null); if (!S0) { o.none.push(k + '.' + pt); return; } o.n++;
          const d = document.createElement('div'); d.innerHTML = C.make('reg', S0); const cc = d.firstChild; if (+cc.getAttribute('data-card-issues')) o.issues.push(k + ' ' + e[0] + ' ' + pt + ' → ' + cc.getAttribute('data-card-issue')); }); }));
      return o; });
    ok(pc.n > 100 && !pc.issues.length && !pc.none.length, 'D-093 · every title part of every element of ' + E + ' switched on: ' + pc.n + ' cards of their own, none breaks a rule of the card', { issues: pc.issues.slice(0, 4), none: pc.none.slice(0, 4) });
    ok(!errs.length, 'D-093 · the clicks raised no error', errs.slice(0, 3)); }
  await labp.close(); }
}

await b.close();
console.log((fail ? 'FAIL ✗' : 'PASS ✓') + ` probe-all-endpoints · ${pass} passed · ${fail} failed · ${FEED.length} endpoints · sample ${SAMPLE.length} · page ${path.basename(PAGE)}`);
process.exit(fail ? 1 : 0);
