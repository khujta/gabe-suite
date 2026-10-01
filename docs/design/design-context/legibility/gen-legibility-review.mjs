#!/usr/bin/env node
/* gen-legibility-review.mjs — the page he reviews round 1 of his human reading on (D-066, D-025.8): a GENERATED decision page.
   Every look added this round with its real-click picture and my pick dashed, his 23 items with what changed and what the review
   found, his questions answered from the feed, the L-19 gap analysis, the patterns (DRAFT suite proposals), what is still on the
   page, and one copy button. Never a text plan.

     node docs/design/design-context/legibility/gen-legibility-review.mjs              # writes legibility-review.html
     node docs/design/design-context/legibility/gen-legibility-review.mjs --check      # exit 1 when the page is stale
     node docs/design/design-context/legibility/gen-legibility-review.mjs --publish <dir>
         # writes <dir>/legibility-review.html with srcs "shots/NNN.png" and copies exactly the pictures it uses into <dir>/shots/
         # (for a later Artifact publish; <dir> is never committed)
       --forms <file>    default ~/.cache/gabe-map-baselines/lab-input/forms.json (the frozen feed, READ-ONLY)
       --archmap <file>  default: archmap.json beside --forms

   READS   legibility-review.words.json (every authored sentence; a typed number stops the build — numbers are {tokens}) ·
           ../legibility-feedback.md (the ledger L-01..L-23) · ../decisions.md (D-066..D-071) · patterns.json · review-r1.raw.json ·
           fix-1b.json · remaining.json · gap-l19.json · measures.{before,r1,r1b}.json ·
           ../../workflow-panel/shots/all-endpoints/walk.json (the walk's pictures, tagged by item and option) ·
           ../../workflow-panel/all-endpoints.words.json NOW and at 6170519 (git show — the options ADDED this round are the option
           groups present now and absent then, derived, never typed) · ../../workflow-panel/all-endpoints.tpl.html (ROWOPT: which
           looks sit in which row's options) · ../../workflow-panel/all-endpoints.html (AE_DATA: the row names, the app) ·
           the frozen forms + archmap feeds and ../../workflow-panel/_ep_pieces.py (run through python3 — the lab's own piece count,
           never re-derived here) · the gabe-artifact kit (../kit-blocks.js) · legibility-review.tpl.html
   WRITES  legibility-review.html (pictures referenced RELATIVELY — he opens pages from Windows Chrome, never an absolute path)
   The work's commit in the copy text is the last commit that touched the REVIEWED inputs (a "+" when they are dirty), not HEAD:
   HEAD moves with this page's own commit, and the page must stay byte-identical to its inputs (--check).
   No wallclock: same inputs, same bytes. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url)), DC = path.resolve(HERE, '..'), ROOT = path.resolve(DC, '../../..');
const WP = path.resolve(DC, '../workflow-panel'), SHOTS = path.join(WP, 'shots/all-endpoints'), OUT = path.join(HERE, 'legibility-review.html');
const SHOT_REL = path.relative(HERE, SHOTS).split(path.sep).join('/') + '/';
const die = (m) => { console.error('gen-legibility-review: ' + m); process.exit(2); };
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; if (i + 1 >= args.length) die(k + ' needs a value'); return args[i + 1]; };
const CHECK = args.includes('--check'), PUBLISH = opt('--publish', null);
const FORMS = path.resolve(opt('--forms', path.join(os.homedir(), '.cache/gabe-map-baselines/lab-input/forms.json')));
const ARCHMAP = path.resolve(opt('--archmap', path.join(path.dirname(FORMS), 'archmap.json')));
const rd = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch (e) { die('cannot read ' + path.relative(ROOT, f)); } };
const rj = (f) => { try { return JSON.parse(rd(f)); } catch (e) { die('not JSON: ' + path.relative(ROOT, f) + ' — ' + e.message); } };
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
const line = (loc) => String(loc || '').split(':').pop();
const base = (loc) => String(loc || '').split(':')[0].split('/').pop();
/* a file named for a reader: its folder and its name — three files of one app are called cooking.py (the review's N3-12), so a bare basename would point at several */
const loc2 = (loc) => String(loc || '').split(':')[0].split('/').slice(-2).join('/');
const fnName = (key) => String(key || '').split('::').pop().split('#').pop().replace(/^middleware:/, '');
const uniq = (a) => [...new Set(a)];

/* ── 1 · the words, swept ─────────────────────────────────────────────────────────────────────────────────────────────
   House rule (gen-all-endpoints.py §1, ported): a fact is generated, never typed — a number inside an authored sentence is a
   {token} this generator fills, a number spelled as a word too, and a JSON number in the words file is refused outright.
   Exemptions, declared here and nowhere else:
     E1  a {token} — filled below; an unknown token stops the build.
     E2  an id that carries a number — a decision (D-066), an item (L-01), a remaining item (R-11), a pattern (P1), a
         recommendation (G1), a bench proposal (EX-5), a review finding (F24 · CR-41 · N3-13 · S4-29), the round's names
         "round 1" · "round 1b" · "r1" — and an HTTP status, which is a LABEL (his question names the 403 and the 404).
     E3  a number inside “curly quotes” only when the same line also carries a {token}.
     E4  "one" is English's article or pronoun.
   The agent's own strings never say "door" or "lock" (D-018). */
const W = rj(path.join(HERE, 'legibility-review.words.json'));
const NUMWORD = /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|dozen)\b/i;
const QUOTED = /“[^”]*”/g, TOKEN = /\{[a-z]\w*\}/i, BANNED = /\b(door|doors|lock|locks)\b/i;
const scrub = (s) => String(s).replace(QUOTED, ' ').replace(/\{[a-z]\w*\}/gi, ' ').replace(/\b(?:D|L|R|EX|CR|N3|S4)-\d+\b/g, ' ')
  .replace(/\b[PGF]\d{1,2}\b/g, ' ').replace(/\bround 1b?\b/gi, ' ').replace(/\br1b?\b/g, ' ').replace(/\b[1-5]\d\d\b/g, ' ');
(function sweep(o, at) {
  if (typeof o === 'number') die(`a typed number in the words file — make it a {token} the generator fills · ${at}: ${o}`);
  if (typeof o === 'string') {
    if (BANNED.test(o)) die(`a word D-018 took out of every string the pages draw · ${at}: “${o.slice(0, 90)}”`);
    if ((o.match(QUOTED) || []).some((q) => /\d/.test(q) || NUMWORD.test(q)) && !TOKEN.test(o)) die(`a number inside a quote must be answered by a {token} in the same line · ${at}: “${o.slice(0, 90)}”`);
    const s = scrub(o), m = s.match(/\d/) || s.match(NUMWORD);
    if (m) die(`a typed number in an authored line — make it a {token} the generator fills · ${at}: “${o.slice(0, 90)}” (found “${m[0]}”)`);
    return;
  }
  if (Array.isArray(o)) return o.forEach((v, i) => sweep(v, at + '[' + i + ']'));
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (k[0] !== '_') sweep(v, at + '.' + k);
})(W, '');
const fill = (s, tok, at) => String(s).replace(/(?<!\{)\{(\w+)\}(?!\})/g, (m, k) => (k in tok && tok[k] !== undefined && tok[k] !== null ? String(tok[k]) : die(`no value for {${k}} in ${at}: “${String(s).slice(0, 80)}”`)));
const need = (o, k, at) => (o && o[k] !== undefined ? o[k] : die(`words: no ${at}.${k}`));

/* ── 2 · the ledger (his items, his words) ───────────────────────────────────────────────────────────────────────────── */
const LEDGER = rd(path.join(DC, 'legibility-feedback.md'));
const items = LEDGER.split(/^### /m).slice(1).filter((b) => /^L-\d\d\b/.test(b)).map((b) => {
  const id = b.slice(0, 4), f = {}; let cur = null;
  for (const ln of b.split('\n').slice(1)) {
    const m = /^- \*\*([a-z ]+):\*\* ?(.*)$/.exec(ln);
    if (m) { cur = m[1]; f[cur] = m[2]; } else if (cur && /^ {2}\S/.test(ln)) f[cur] += ' ' + ln.trim(); else cur = null;
  }
  for (const k of ['words', 'where', 'could not tell', 'fix', 'tag', 'status']) if (!f[k]) die(`ledger ${id}: no ${k}`);
  return { id, words: f.words, readAs: f['read as'] || null, where: f.where, couldNot: f['could not tell'], fix: f.fix, tag: f.tag.replace(/`/g, '').trim(), status: f.status };
});
if (!items.length) die('the ledger holds no items');
const EP = (/endpoint \*\*([A-Z]+ [^*]+)\*\*/.exec(LEDGER) || die('the ledger no longer names the endpoint he read on'))[1];
const EPID = 'endpoint:' + EP;
const statusKind = (s) => { const k = (/^(built|option|question|logged|deferred)\b/.exec(s) || die('ledger: a status that starts with no known word: ' + s.slice(0, 40)))[1]; return k; };
const firstSentence = (w) => { const t = w.replace(/^"|"$/g, ''); const m = /^(.+?[.?!])(\s+|"\s|$)/.exec(t); return m ? [m[1], t.slice(m[1].length).trim()] : [t, '']; };

/* ── 3 · decisions D-066..D-071 ────────────────────────────────────────────────────────────────────────────────────── */
const DEC = rd(path.join(DC, 'decisions.md'));
const decs = {}; for (const m of DEC.matchAll(/^## (D-\d{3}) — (.+)$/gm)) decs[m[1]] = { id: m[1], title: m[2], at: m.index };
const ROUND_D = ['D-066', 'D-067', 'D-068', 'D-069', 'D-070', 'D-071'];
for (const d of ROUND_D) if (!decs[d]) die('decisions.md has no ' + d);
const decText = (d) => { const ids = Object.keys(decs).sort((a, b) => decs[a].at - decs[b].at), i = ids.indexOf(d); return DEC.slice(decs[d].at, i + 1 < ids.length ? decs[ids[i + 1]].at : DEC.length); };

/* ── 4 · the round's records ─────────────────────────────────────────────────────────────────────────────────────── */
const P = rj(path.join(HERE, 'patterns.json')), REV = rj(path.join(HERE, 'review-r1.raw.json')), FIX = rj(path.join(HERE, 'fix-1b.json'));
const REM = rj(path.join(HERE, 'remaining.json')), GAP = rj(path.join(HERE, 'gap-l19.json'));
const MEAS = ['measures.before.json', 'measures.r1.json', 'measures.r1b.json'].map((f) => rj(path.join(HERE, f)));
const WALK = rj(path.join(SHOTS, 'walk.json'));
const findings = REV.flatMap((L, li) => L.findings.map((f) => Object.assign({ lens: li }, f)));
const outcomeOf = (id) => (FIX.fixed.includes(id) ? ['fixed', null] : FIX.partly[id] ? ['partly', FIX.partly[id]] : FIX.left[id] ? ['left', FIX.left[id]] : FIX.his[id] ? ['his', FIX.his[id]] : die('fix-1b.json says nothing of the finding ' + id));
{ const all = new Set(findings.map((f) => f.id)); if (all.size !== findings.length) die('two review findings share an id');
  for (const k of [...FIX.fixed, ...Object.keys(FIX.partly), ...Object.keys(FIX.left), ...Object.keys(FIX.his)]) if (!all.has(k)) die('fix-1b.json names a finding the review does not hold: ' + k); }
for (const f of findings) if (!P.reviewTagMap[f.pattern]) die(`a reviewer tag missing from patterns.json reviewTagMap: “${f.pattern}” (${f.id})`);
for (const it of items) if (!P.ledgerTagMap[it.tag]) die(`a ledger tag missing from patterns.json ledgerTagMap: ${it.tag} (${it.id})`);
const PATS = P.patterns, patById = Object.fromEntries(PATS.map((p) => [p.id, p]));
for (const r of REM.items) if (!patById[r.pattern]) die('remaining.json names no pattern ' + r.pattern + ' (' + r.id + ')');
if (W.lens.length !== REV.length) die(`words.lens names ${W.lens.length} lenses; the review has ${REV.length}`);

/* pictures: the walk's round-1 shots, each checked on disk */
const R1 = WALK.round1 || die('walk.json has no round1');
for (const s of R1) if (!fs.existsSync(path.join(SHOTS, s.file))) die('the walk names a picture that is not on disk: ' + s.file);
const VERB = need(W, 'shotVerb', ''), VERB_KEYS = ['hover', 'click', 'look', 'scrolled', 'wheeled', 'column', 'drag', 'shows'];
const used = new Set();
let lookOf = () => null;   /* set once the added looks are known: a shot taken under a look says which */
const pic = (s) => { used.add(s.file); const k = VERB_KEYS.find((x) => s[x] != null); let cap = k ? (VERB[k] || die('words.shotVerb has no ' + k)) + ' ' + String(s[k]) : (W.shotOpen || die('words.shotOpen'));
  const lk = s.option ? lookOf(s.option, s.value) : null; if (lk) cap += ' · ' + lk;
  return { f: s.file, w: s.size[0], h: s.size[1], cap }; };
const itemsOfShot = (s) => String(s.item || '').split(/\s+/).filter(Boolean);

/* ── 5 · the looks added this round (derived from the words file now and before) ──────────────────────────────────── */
const AEW_PATH = 'docs/design/workflow-panel/all-endpoints.words.json', BEFORE_SHA = W._before || die('words._before: the commit the round started from');
const AEW = rj(path.join(ROOT, AEW_PATH));
let AEW0; try { AEW0 = JSON.parse(git('show', BEFORE_SHA + ':' + AEW_PATH)); } catch (e) { die('git show ' + BEFORE_SHA + ':' + AEW_PATH + ' failed — ' + e.message.split('\n')[0]); }
const groupsOf = (w) => { const out = {}; for (const sec of ['mo', 'ex']) for (const [g, v] of Object.entries((w[sec] || {}).opt || {})) if (v && v.opts && typeof v.opts === 'object') out[sec + '.' + g] = v; return out; };
const G_NOW = groupsOf(AEW), G_BEFORE = groupsOf(AEW0);
const ADDED = Object.keys(G_NOW).filter((k) => !G_BEFORE[k]);
if (!ADDED.length) die('no option group was added since ' + BEFORE_SHA);
const TPL_AE = rd(path.join(WP, 'all-endpoints.tpl.html'));
const ROWOPT = (() => { const m = /ROWOPT = (\{[^}]*\})/.exec(TPL_AE) || die('all-endpoints.tpl.html no longer declares ROWOPT'); return (0, eval)('(' + m[1] + ')'); })();
const AEH = rd(path.join(WP, 'all-endpoints.html'));
const AE = (() => { const a = AEH.indexOf('window.AE_DATA = '), b = AEH.indexOf(';</script>', a); if (a < 0 || b < 0) die('all-endpoints.html carries no AE_DATA'); return JSON.parse(AEH.slice(a + 17, b)); })();
const BLKNAME = Object.fromEntries(AE.blocks.map((b) => [b.key, b.name]));
const rowName = (f) => BLKNAME[AE.mo.fam[f]] || die('AE_DATA names no block for the BY MOMENT row ' + f);
const bareId = (gid) => gid.split('.')[1];
{ const ids = ADDED.map(bareId); const dup = ids.filter((x, i) => ids.indexOf(x) !== i); if (dup.length) die('two added groups share the walk id ' + dup.join(',') + ' — the walk cannot tell their pictures apart'); }
const SEC_ABOUT = { mo: AEW.mo._about || '', ex: AEW.ex._about || '' };
const decOfGroup = (g, v) => { const a = /\bD-\d{3}\b/.exec(v._about || ''); if (a) return a[0]; if (v.ruled && decs[v.ruled]) return v.ruled;
  const s = /\bD-\d{3}\b/.exec(SEC_ABOUT[g.split('.')[0]]); if (s && ROUND_D.includes(s[0])) return s[0];
  const names = Object.values(v.opts).map((o) => o.name.toLowerCase()); const hit = ROUND_D.find((d) => names.some((n) => decText(d).toLowerCase().includes(n))); if (hit) return hit;
  const r = /\b(?:CR|S4|N3)-\d+\b|\bF\d\d\b/.exec(v._about || ''); return r ? r[0] : die('no decision or review finding names the look ' + g); };
lookOf = (g, v) => { const gid = ADDED.find((k) => bareId(k) === g); const o = gid && G_NOW[gid].opts[v]; return o ? G_NOW[gid].label + ': ' + o.name : null; };
const MOTION = need(W.calls, 'motion', 'calls');
for (const k of Object.keys(MOTION)) if (k[0] !== '_' && !ADDED.includes(k)) die('words.calls.motion names a look that was not added this round: ' + k);
const calls = ADDED.map((gid) => {
  const v = G_NOW[gid], g = bareId(gid), sec = gid.split('.')[0];
  const rows = Object.keys(ROWOPT).filter((f) => ROWOPT[f].includes(g));
  const where = sec === 'ex' ? 'bench' : rows.length ? 'row' : 'table';
  const shotsOf = R1.filter((s) => s.option === g);
  const opts = Object.entries(v.opts).map(([k, o]) => { const s = shotsOf.find((x) => x.value === k); return { v: k, name: o.name, plain: o.plain, shot: s ? pic(s) : null }; });
  if (!v.opts[v.pick]) die(`${gid}: the pick “${v.pick}” is not one of its looks`);
  const from = decOfGroup(gid, v);
  return { id: gid, where, rows: rows.map(rowName), label: v.label, pick: v.pick, ruled: v.ruled ? v.pick : null, ruledBy: v.ruled || null, from,
    answers: uniq(shotsOf.flatMap(itemsOfShot)).filter((x) => /^(L|CR|S4|N3)-\d+$|^F\d\d$/.test(x)), motion: MOTION[gid] || die('words.calls.motion has no line for ' + gid + ' — what choosing it sets in motion'), opts };
});
const WHERE_ORDER = ['table', 'row', 'bench'];
calls.sort((a, b) => WHERE_ORDER.indexOf(a.where) - WHERE_ORDER.indexOf(b.where));

/* ── 6 · the feed: facts his questions need, every number read here ─────────────────────────────────────────────── */
const F = rj(FORMS), A = rj(ARCHMAP), FTXT = rd(FORMS);
const E = F.endpoints[EPID] || die('the forms feed has no ' + EPID);
const exitById = Object.fromEntries((E.produced || []).map((x) => [x.id, x]));
const detailOf = (x) => { const d = String(x.detail || ''); const m = /'detail':\s*'([^']*)'/.exec(d); return m ? m[1] : d; };
const fmtNum = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));
const tablesOf = (epId, ops) => { const e = F.endpoints[epId] || die('the forms feed has no ' + epId); const out = new Set();
  for (const p of e.paths || []) for (const s of (p.effects || {}).steps || []) { if (s.dependency) continue; const st = F.steps[s.step]; if (st && st.table && ops.has(st.op)) out.add(st.table); }
  return [...out].sort(); };
const READS = new Set(['read']), WRITES = new Set(['add', 'insert', 'update', 'delete']);
const listOr = (a, none) => (a.length ? a.join(' · ') : none);

/* Q2 — the two limiters */
const QF = {};
{ const lims = (E.rate || {}).limits || die(EP + ' has no rate limits in the feed');
  const mw = F.middleware['middleware:' + lims[0].via] || die('no middleware ' + lims[0].via);
  const ex = (l) => mw.exits.find((x) => x.id === l.exit) || die('the middleware holds no exit ' + l.exit);
  const S = lims.find((l) => Array.isArray(ex(l).scope)) || die('no limiter with a path scope'), G = lims.find((l) => ex(l).scope === 'all') || die('no limiter for every path');
  const arg = (l, p) => (l.args.find((a) => a.param === p) || die('limiter ' + l.limiter + ' has no ' + p)).value;
  if (ex(S).status !== ex(G).status || detailOf(ex(S)) !== detailOf(ex(G))) die('the two limiters answer differently — the Q2 words assume one answer');
  QF.limiter = { nLim: lims.length, limClass: S.class, initS: line(S.init_at), initG: line(G.init_at), mwFile: loc2(mw.file), mwName: mw.cls, mwMethod: fnName(mw.method),
    sName: S.limiter.replace(/^_/, ''), gName: G.limiter.replace(/^_/, ''), sPrefixN: ex(S).scope.length, sEndpoints: ex(S).applies_to, sLimit: arg(S, 'limit'), sWindow: fmtNum(arg(S, 'window_seconds')), sLine: line(S.at),
    gExempt: (E.rate.exempt || []).join(', ') || die('no exempt path'), gEndpoints: ex(G).applies_to, gLimit: arg(G, 'limit'), gWindow: fmtNum(arg(G, 'window_seconds')), gLine: line(G.at),
    limStatus: ex(S).status, limDetail: detailOf(ex(S)), limSwitch: E.rate.switch || die('no switch on the limits') };
  if (!(Number(QF.limiter.sLine) < Number(QF.limiter.gLine))) die('the sensitive check no longer comes before the global one — the Q2 words say it does'); }

/* Q3 — the sender, the refresh, what is fetched again */
{ const FE = F.frontend.pieces, pieces = Object.entries(FE);
  const snd = pieces.map(([k, p]) => [k, (p.calls || []).find((c) => c.endpoint === EPID && c.kind === 'mutation')]).find(([, c]) => c) || die('no mutation sends ' + EP);
  const [sk, sc] = snd, inv = (sc.invalidates || [])[0] || die(fnName(sk) + ' refreshes nothing'), fe = sc.fetch[0];
  const re = pieces.flatMap(([k, p]) => (p.calls || []).filter((c) => (c.invalidated_by || []).some((b) => b.hook === sk && b.when === inv.when)).map((c) => ({ hook: fnName(k), ep: c.endpoint, method: c.fetch[0].method, path: c.fetch[0].path })));
  if (!re.length) die('no saved answer is refreshed by ' + fnName(sk));
  const writes = tablesOf(EPID, WRITES);
  QF.fetch = { sender: fnName(sk), senderKind: sc.kind, sendMethod: fe.method, sendPath: fe.path, invKey: JSON.stringify(inv.key), invWhen: inv.when, invAt: loc2(inv.at) + ':' + line(inv.at),
    nRefetch: re.length, refetchList: re.map((r) => fill(W.q.refetchOne, { hook: r.hook, method: r.method, path: r.path }, 'q.refetchOne')).join(' · '),
    writes: listOr(writes, W.q.none), readsList: re.map((r) => fill(W.q.readsOne, { hook: r.hook, tables: listOr(tablesOf(r.ep, READS), W.q.none), overlap: listOr(tablesOf(r.ep, READS).filter((t) => writes.includes(t)), W.q.none) }, 'q.readsOne')).join(' ') };
  QF.sender = QF.fetch.sender; }

/* Q4 — why the 403 and the 404 trigger: server side (the raise, the catch) and client side (the branch) */
const PLAIN_PRED = need(W, 'plainPred', '');
const predWords = (p) => (PLAIN_PRED[p] ? fill(W.q.predPlain, { plain: PLAIN_PRED[p], code: p }, 'q.predPlain') : fill(W.q.predCode, { code: p }, 'q.predCode'));
QF.statuses = (W.q.statuses || die('words.q.statuses')).map((st) => {
  const exits = (E.produced || []).filter((x) => String(x.status) === st && x.phase === 'handler');
  if (!exits.length) die(EP + ' produces no handler ' + st);
  const server = exits.map((x) => {
    const m = /^except (\w+)$/.exec(x.via || '');
    if (!m) return fill(W.q.ownCheck, { status: st, detail: detailOf(x), at: loc2(x.at) + ':' + line(x.at) }, 'q.ownCheck');
    const cls = m[1], c = (E.failure.catches || []).find((k) => k.types.includes(cls)) || die('no catch for ' + cls);
    const raises = Object.entries(F.functions).flatMap(([k, fn]) => (fn.raises || []).filter((r) => r.cls === cls).map((r) => {
      const rb = (fn.reached_by || []).find((b) => b.root === EPID && (b.paths || []).some((p) => c.paths.includes(p))); return rb ? { fn: fnName(k), at: r.at, pred: r.pred, depth: rb.depth } : null; })).filter(Boolean);
    if (!raises.length) die('nothing this endpoint reaches raises ' + cls);
    const how = raises.map((r) => fill(r.depth === 1 ? W.q.raiseOne : W.q.raiseN, { fn: r.fn, at: loc2(r.at) + ':' + line(r.at), depth: r.depth, when: predWords(r.pred) }, 'q.raise'));
    return [fill(raises.length > 1 ? W.q.catchMany : W.q.catchOne, { status: st, detail: detailOf(x), cls, catchAt: loc2(c.at) + ':' + line(c.at), n: raises.length }, 'q.catch'), ...how];
  }).flat();
  const site = F.frontend.reasons.sites.find((s) => (s.endpoints || []).includes(EPID) && String(s.value) === st);
  const client = site ? fill(W.q.client, { fn: fnName(site.piece), status: st, line: line(site.at), key: ((site.does || [])[0] || {}).literal || W.q.none,
    cbFile: loc2(site.origins[0].via[1]), cbLines: uniq(site.origins.map((o) => line(o.via[1]))).join(', '), screen: base(site.origins[0].via[site.origins[0].via.length - 1]).replace(/\.\w+$/, '') }, 'q.client') : fill(W.q.noClient, { status: st }, 'q.noClient');
  if (site) QF.screen = base(site.origins[0].via[site.origins[0].via.length - 1]).replace(/\.\w+$/, '');
  return { status: st, lines: [...server, client] };
});

/* Q5 — Standard or specialist, through the lab's own piece count (never re-derived here) */
{ const py = `import json,sys\nsys.path.insert(0, sys.argv[3])\nimport _ep_pieces as P\nfj=json.load(open(sys.argv[1]))\nprint(json.dumps({"cb": P.common_block(fj, sys.argv[2], None, ""), "t": P.tally(fj["endpoints"])}))`;
  let o; try { o = JSON.parse(execFileSync('python3', ['-c', py, FORMS, EPID, WP], { encoding: 'utf8', maxBuffer: 64 << 20 })); } catch (e) { die('the lab\'s piece count failed — ' + String(e.message).split('\n')[0]); }
  const cb = o.cb, rare = cb.rows.filter((r) => r.word === 'rare' || r.word === 'only here');
  const kinds = uniq((E.switches || []).map((s) => s.kind));
  QF.pieces = { nEp: cb.of, nPieces: cb.rows.length, nNorm: cb.by_word['the norm'], nCommon: cb.by_word.common, nRare: cb.by_word.rare, nOnly: cb.by_word['only here'], pieceRule: cb.rule,
    rareList: listOr(rare.map((r) => fill(W.q.pieceOne, { words: r.words, n: r.n, of: r.of }, 'q.pieceOne')), W.q.none), nLacks: cb.missing_norms.length,
    switchKinds: kinds.join(' and '), switchLine: kinds.map((k) => fill(W.q.switchOne, { kind: k, n: o.t['switch:' + k] || 0, of: cb.of }, 'q.switchOne')).join(', ') }; }

/* Q6 — in-flight values: their lifetime, and what each read decides */
{ const proc = (F.inflight || {}).process || {};
  const rows = (E.inflight || []).map((r) => (r.ref ? Object.assign({}, proc[r.ref] || die('no process row ' + r.ref), { name: r.name }) : r));
  const req = rows.filter((r) => r.dies === 'with the answer'), srv = rows.filter((r) => r.dies === 'with the server process'), unk = rows.length - req.length - srv.length;
  const readLocs = (r) => (r.read_at || []).map((x) => x.via || x.at);
  const fmtLocs = (locs) => { const by = {}; for (const l of locs) (by[loc2(l)] = by[loc2(l)] || []).push(line(l)); return Object.entries(by).map(([f, ls]) => f + ':' + uniq(ls).join(', ')).join(' · '); };
  const reqLines = req.map((r) => {
    const locs = readLocs(r), said = [];
    for (const x of E.produced || []) { const m = /@ (\S+)$/.exec(x.via || ''); if (m && locs.includes(m[1])) said.push(fill(W.q.infDecides, { at: loc2(m[1]) + ':' + line(m[1]), status: x.status, detail: detailOf(x) }, 'q.infDecides')); }
    for (const st of Object.values(F.steps)) if (st.op === 'commit' && locs.includes(st.at)) said.push(fill(W.q.infSaves, { at: loc2(st.at) + ':' + line(st.at) }, 'q.infSaves'));
    const rk = (E.repeat || {}).key;
    if (rk && String(rk.through || '').endsWith('.' + r.name)) { const q = E.repeat.required, ex = exitById[q.exit] || {}, cl = (E.repeat.claims || [])[0], unc = (E.produced || []).find((x) => x.phase === 'uncaught');
      said.push(fill(W.q.infKey, { status: q.status, detail: detailOf(ex), at: loc2(q.at) + ':' + line(q.at) }, 'q.infKey'));
      if (cl) said.push(fill(W.q.infClaim, { fn: fnName(cl.fn), idiom: cl.idioms.join(', '), table: cl.table, unique: cl.unique.join(' + '), uncaught: unc ? unc.status : W.q.none }, 'q.infClaim')); }
    return fill(r.type ? W.q.infReq : W.q.infReqNoType, { name: r.name, type: r.type, setBy: fnName(r.set_by), lines: fmtLocs(locs) }, 'q.infReq') + (said.length ? ' ' + said.join(' ') : '');
  });
  const srvDec = srv.filter((r) => readLocs(r).some((l) => (E.produced || []).some((x) => x.site === l)));
  const decStat = uniq(srvDec.flatMap((r) => (E.produced || []).filter((x) => readLocs(r).includes(x.site)).map((x) => x.status)));
  QF.inflight = { nInf: rows.length, nReq: req.length, nSrv: srv.length, nUnk: unk, reqLines, srvNames: srv.map((r) => r.name).join(', '), srvDecNames: srvDec.map((r) => r.name).join(', '),
    srvDecStatus: decStat.join(', '), srvDecLines: fmtLocs(uniq((E.produced || []).filter((x) => decStat.includes(x.status) && x.site).map((x) => x.site))) }; }

/* Q7 — why some functions have no role: the map's folders (about the map, D-017 — said here, not on the page) */
{ const sc = A.file_census.scanned_dirs || die('archmap has no scanned_dirs');
  const scanned = sc.map((d) => d.replace(/^apps\/api\//, ''));
  const folders = uniq([...FTXT.matchAll(/apps\/api\/([a-z0-9_]+)\/[\w/]+\.py/g)].map((m) => m[1])).filter((d) => d !== 'tests' && !scanned.some((s) => s === d || s.startsWith(d + '/'))).sort();
  const l14 = items.find((x) => x.id === 'L-14') || die('no L-14');
  const names = uniq([...String(l14.readAs || '').matchAll(/`([^`]+)`/g)].map((m) => m[1]));
  if (!names.length) die('L-14 no longer reads the names he asked about');
  const named = names.map((n) => { const short = n.split('.').pop(); const m = new RegExp('(apps/api/[\\w/]+\\.py)::(?:[\\w.]*\\.)?' + short + '\\b').exec(FTXT);
    if (!m) return fill(W.q.nameOnly, { name: n }, 'q.nameOnly');
    const dir = m[1].split('/')[2]; return fill(scanned.some((s) => s.split('/')[0] === dir) ? W.q.inRead : W.q.inUnread, { name: n, dir, file: loc2(m[1]) }, 'q.in'); });
  QF.roles = { nScanned: sc.length, scannedList: scanned.join(' · '), unreadDirs: folders.join(' · '), named }; }

/* Q1 — the icons: the measure's own count, before and now */
{ const b = MEAS[0].mo, n = MEAS[2].mo;
  QF.icons = { bareBefore: b.bare, bareNow: n.bare, gateBefore: (b.bareByRow || {}).gate || 0, gateNow: (n.bareByRow || {}).gate || 0, fnBefore: (b.bareByRow || {}).fn || 0, fnNow: (n.bareByRow || {}).fn || 0,
    bareNowRows: Object.entries(n.bareByRow || {}).map(([f, k]) => rowName(f) + ' ' + k).join(' · ') || W.q.none }; }

const verdictsOf = (key) => REV.map((L, li) => { const v = L.verdicts.find((x) => x.item === key || x.item.startsWith(key + ' ')); return v ? { lens: li, verdict: v.verdict, remains: v.remains } : null; }).filter(Boolean);
const QTOK = Object.assign({ ep: EP }, QF.limiter, QF.fetch, QF.pieces, QF.inflight, QF.roles, QF.icons, { screen: QF.screen });
const questions = W.questions.map((q) => {
  const lines = [];
  for (const l of q.lines) {
    if (l === '@statuses') for (const s of QF.statuses) lines.push(...s.lines);
    else if (l === '@inflightReq') lines.push(...QF.inflight.reqLines);
    else if (l === '@named') lines.push(...QF.roles.named);
    else lines.push(fill(l, QTOK, 'questions.' + q.key));
  }
  const hov = R1.filter((s) => s.hover), pickS = [];   /* one picture per item he named first, then the next of the first item */
  for (const i of q.items) { const s = hov.find((x) => itemsOfShot(x).includes(i) && !pickS.includes(x)); if (s) pickS.push(s); }
  for (const s of hov) if (pickS.length < 2 && !pickS.includes(s) && itemsOfShot(s).some((i) => q.items.includes(i))) pickS.push(s);
  const shots = pickS.slice(0, 2).map(pic);
  const fx = (q.findings || []).map((id) => { const f = findings.find((x) => x.id === id) || die('no finding ' + id); const [o, why] = outcomeOf(id); return { id, what: f.what, outcome: o, why }; });
  return { key: q.key, q: q.q, items: q.items, about: q.about || null, lines, verdict: q.verdict ? (verdictsOf(q.verdict)[0] || die('no review verdict for ' + q.verdict)) : null, findings: fx, shots };
});

/* ── 7 · his items, with the review's verdict and round 1b's outcome ────────────────────────────────────────────────── */
const itemCards = items.map((it) => {
  const [first, rest] = firstSentence(it.words);
  const fs1 = findings.filter((f) => f.item === it.id).map((f) => { const [o, why] = outcomeOf(f.id); return { id: f.id, sev: f.severity, what: f.what, outcome: o, why }; });
  return Object.assign({}, it, { first, rest, kind: statusKind(it.status), pattern: P.ledgerTagMap[it.tag], verdicts: verdictsOf(it.id), findings: fs1,
    shots: R1.filter((s) => itemsOfShot(s).includes(it.id)).map(pic) });
});

/* ── 9 · the gap analysis (L-19), counted from gap-l19.json ─────────────────────────────────────────────────────────── */
const TOP = Math.max(...GAP.parts.flatMap((p) => p.rows.map((r) => r[1])));
const gap = { topRating: TOP, newSections: GAP.newSections, undecided: GAP.undecided, toMetadata: GAP.toMetadata, asAxis: GAP.asAxis, ruledPairing: GAP.ruledPairing,
  parts: GAP.parts.map((p) => { const by = {}; for (const r of p.rows) { const k = r[2] || ''; by[k] = (by[k] || 0) + 1; }
    return { part: p.part, n: p.rows.length, r3: p.rows.filter((r) => r[1] === TOP).length, none: p.rows.filter((r) => !r[2]).length, to: Object.entries(by).filter(([k]) => k).sort((a, b) => b[1] - a[1]), rows: p.rows }; }),
  security: GAP.security, widening: GAP.widening, orphaned: GAP.orphanedRated3, alsoFound: GAP.alsoFound };
gap.nRows = gap.parts.reduce((a, p) => a + p.n, 0); gap.nNone = gap.parts.reduce((a, p) => a + p.none, 0);
gap.secMissing = GAP.security.filter((s) => /missing/.test(s[1])).length; gap.secOrphan = GAP.security.filter((s) => /orphaned/.test(s[1])).length;

/* ── 10 · the patterns ─────────────────────────────────────────────────────────────────────────────────────────────── */
const CHECKS = {          /* a check named by patterns.json → where the measure keeps its number (null: the section did not exist then) */
  nested: (m) => m.totals.nested, titles: (m) => m.totals.titles, repeatText: (m) => m.totals.repeatText, repeatLine: (m) => m.totals.repeatLine,
  pageTalk: (m) => m.totals.pageTalk, twins: (m) => m.mo.twins, twinFaces: (m) => m.mo.twinFaces, bare: (m) => m.mo.bare, midWord: (m) => m.mo.midWord,
  benchMidWord: (m) => (m.perSection['sec-ex'] ? m.bench.midWord : null), cut: (m) => Object.values(m.cut || {}).reduce((a, b) => a + b, 0),
  machineWords: (m) => m.mo.machineWords, timeless: (m) => m.mo.timeless, unfilled: (m) => m.unfilled };
const CHECK_ORDER = ['nested', 'titles', 'repeatText', 'repeatLine', 'pageTalk', 'twins', 'twinFaces', 'bare', 'midWord', 'benchMidWord', 'cut', 'machineWords', 'timeless', 'unfilled'];
const checkRow = (id) => { const w = W.checks[id] || die('words.checks has no plain name for the check ' + id); const vals = MEAS.map((m) => CHECKS[id](m));
  if (vals.some((v) => v !== null && typeof v !== 'number')) die('the measure holds no number for ' + id); return { id, name: w.name, plain: w.plain, vals }; };
for (const p of PATS) for (const c of p.checks) if (!CHECKS[c]) die(`pattern ${p.id} names a check the measure does not keep: ${c}`);
const itemsOfPat = (pid) => uniq([...items.filter((it) => P.ledgerTagMap[it.tag] === pid).map((it) => it.id), ...((P.alsoItems || {})[pid] || [])]).sort();
const findOfPat = (pid) => findings.filter((f) => P.reviewTagMap[f.pattern] === pid);
const patterns = PATS.map((p) => {
  const its = itemsOfPat(p.id), fd = findOfPat(p.id), rm = REM.items.filter((r) => r.pattern === p.id), open = rm.filter((r) => r.status === 'open');
  const stillThere = open.length + fd.filter((f) => ['partly', 'left'].includes(outcomeOf(f.id)[0])).length;
  const pick = stillThere > 0 ? 'land' : 'notyet';   /* the rule, said on the page: land where something of the pattern is still on the page */
  return { id: p.id, name: p.name, line: p.line, whyModel: p.whyModel, whyHuman: p.whyHuman, items: its, nFind: fd.length, nOpen: open.length, nRem: rm.length, stillThere,
    out: { fixed: fd.filter((f) => outcomeOf(f.id)[0] === 'fixed').length, partly: fd.filter((f) => outcomeOf(f.id)[0] === 'partly').length, left: fd.filter((f) => outcomeOf(f.id)[0] === 'left').length, his: fd.filter((f) => outcomeOf(f.id)[0] === 'his').length },
    checks: p.checks.map(checkRow), suite: p.suite.map((s, i) => ({ cid: p.id + '.' + (i + 1), kind: s.kind, target: s.target, what: s.what, size: s.size, pick })) };
}).sort((a, b) => (b.items.length + b.nFind) - (a.items.length + a.nFind) || PATS.findIndex((x) => x.id === a.id) - PATS.findIndex((x) => x.id === b.id));
{ const tagged = items.filter((it) => !patterns.some((p) => p.items.includes(it.id))); if (tagged.length) die('items no pattern holds: ' + tagged.map((x) => x.id).join(',')); }

/* ── 11 · still on the page, by pattern ─────────────────────────────────────────────────────────────────────────────── */
const remaining = PATS.map((p) => ({ id: p.id, name: p.name, rows: REM.items.filter((r) => r.pattern === p.id).map((r) => ({ id: r.id, where: r.where, what: r.what, source: r.source, open: r.status === 'open', status: r.status })) })).filter((g) => g.rows.length);

/* ── 12 · at a glance ──────────────────────────────────────────────────────────────────────────────────────────────── */
const kinds = ['built', 'option', 'question', 'logged', 'deferred'];
const glance = { status: kinds.map((k) => ({ k, word: W.statusWord[k] || die('words.statusWord has no ' + k), n: items.filter((it) => statusKind(it.status) === k).length })).filter((x) => x.n),
  withOpt: items.filter((it) => /\boption\b/.test(it.status)).length,
  review: { total: findings.length, fixed: FIX.fixed.length, partly: Object.keys(FIX.partly).length, left: Object.keys(FIX.left).length, his: Object.keys(FIX.his).length },
  labels: MEAS.map((m) => m.label), checks: CHECK_ORDER.map(checkRow), viewport: MEAS[2].viewport };
{ const t = glance.review; if (t.fixed + t.partly + t.left + t.his !== t.total) die('fix-1b.json does not account for every finding'); }
const cmp = glance.checks.filter((c) => c.vals[0] !== null && c.vals[2] !== null);

/* ── 13 · tokens for the page's own sentences, then the words filled ─────────────────────────────────────────────── */
const workHead = (() => { const inputs = ['docs/design/design-context/legibility-feedback.md', 'docs/design/design-context/decisions.md', ...['patterns', 'review-r1.raw', 'fix-1b', 'remaining', 'gap-l19', 'measures.before', 'measures.r1', 'measures.r1b'].map((f) => 'docs/design/design-context/legibility/' + f + '.json'),
    'docs/design/workflow-panel/shots/all-endpoints/walk.json', AEW_PATH, 'docs/design/workflow-panel/all-endpoints.html', 'docs/design/workflow-panel/all-endpoints.tpl.html'];
  const h = git('log', '-1', '--format=%H', '--', ...inputs).trim().slice(0, 7) || die('git knows no commit of the reviewed inputs'); const dirty = git('status', '--porcelain', '--', ...inputs).trim();
  return h + (dirty ? '+' : ''); })();
const T = { ep: EP, nItems: items.length, nFindings: findings.length, nLenses: REV.length, nChecks: glance.checks.length, viewport: glance.viewport, withOpt: glance.withOpt,
  built: items.filter((it) => statusKind(it.status) === 'built').length, opts: glance.withOpt, down: cmp.filter((c) => c.vals[2] < c.vals[0]).length, same: cmp.filter((c) => c.vals[2] === c.vals[0]).length,
  up: cmp.filter((c) => c.vals[2] > c.vals[0]).length, nCompared: cmp.length, nCalls: calls.length, nRuled: calls.filter((c) => c.ruled).length, nProps: 0,
  nPatterns: patterns.length, nSuite: patterns.reduce((a, p) => a + p.suite.length, 0), nLand: patterns.filter((p) => p.suite[0].pick === 'land').length,
  topPattern: patterns[0].name, topN: patterns[0].items.length + patterns[0].nFind, nRem: REM.items.length, nOpen: REM.items.filter((r) => r.status === 'open').length,
  nParts: gap.parts.length, topRating: TOP, nRows: gap.nRows, nNone: gap.nNone, nNew: gap.newSections.length, secMissing: gap.secMissing, secOrphan: gap.secOrphan, nOrphan: gap.orphaned.length,
  partlyItems: itemCards.filter((c) => (c.verdicts[0] || {}).verdict !== 'answered').length, itemFindings: itemCards.reduce((a, c) => a + c.findings.length, 0),
  closed: itemCards.reduce((a, c) => a + c.findings.filter((f) => f.outcome === 'fixed').length, 0), feedHead: F.head || die('the forms feed carries no head'), workHead,
  app: AE.tok.app || die('AE_DATA names no app'), nPics: 0, nQs: questions.length };

/* ── 8 · the proposals that need his word (after the tokens: their sentences may count) ────────────────────────────── */
const rem = Object.fromEntries(REM.items.map((r) => [r.id, r]));
const PTOK = Object.assign({}, T, { oldHead: (AEW.cols.fetched || die('all-endpoints words: no cols.fetched')).head, sender: QF.sender, screen: QF.screen, hisIds: Object.keys(FIX.his).join(' · ') });
const proposals = W.proposals.map((p) => {
  const opts = p.opts === '@gap' ? GAP.recommend.map((g) => ({ v: g.id, name: g.id + ' · ' + g.name, plain: g.what })) : p.opts.map((o) => ({ v: o.v, name: fill(o.name, PTOK, p.id), plain: fill(o.plain, PTOK, p.id) }));
  const pick = p.opts === '@gap' ? (GAP.recommend.filter((g) => g.pick).map((g) => g.id)[0] || die('gap-l19 marks no pick')) : p.pick;
  if (!opts.some((o) => o.v === pick)) die(`proposal ${p.id}: my pick “${pick}” is not one of its options`);
  const facts = (p.facts || []).map((k) => (rem[k] ? { id: k, text: rem[k].what } : FIX.left[k] ? { id: k, text: FIX.left[k] } : FIX.his[k] ? { id: k, text: FIX.his[k] } : findings.find((f) => f.id === k) ? { id: k, text: findings.find((f) => f.id === k).what } : die('proposal ' + p.id + ' cites nothing called ' + k)));
  const shots = (p.pics || []).map((q) => R1.find((s) => s.option === q.option && s.value === q.value) || die('no walk picture for ' + q.option + '=' + q.value)).map(pic);
  return { id: p.id, title: fill(p.title, PTOK, p.id), what: fill(p.what, PTOK, p.id), motion: fill(p.motion, PTOK, p.id), opts, pick, facts, shots, alsoIn: p.alsoIn || null };
});
T.nProps = proposals.length;
for (const c of calls) c.motion = fill(c.motion, T, 'calls.motion.' + c.id);
T.nPics = used.size;
const fillTree = (o, at) => (typeof o === 'string' ? fill(o, T, at) : Array.isArray(o) ? o.map((v, i) => fillTree(v, at + '[' + i + ']')) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).filter(([k]) => k[0] !== '_').map(([k, v]) => [k, fillTree(v, at + '.' + k)])) : o);
const UI = fillTree({ page: W.page, sec: W.sec, calls: Object.assign({}, W.calls, { motion: undefined }), statusWord: W.statusWord, outcome: W.outcome, verdict: W.verdict, sev: W.sev, lens: W.lens, items: W.items, qs: W.qs, gap: W.gap, pat: W.pat, rem: W.rem, copy: W.copy }, 'ui');
delete UI.calls.motion;

/* ── 14 · the data, the hash, the page ─────────────────────────────────────────────────────────────────────────────── */
const choices = [...calls.map((c) => ({ id: c.id, group: 'CALLS', mine: c.pick, ruled: c.ruled, opts: c.opts.map((o) => [o.v, o.name]) })),
  ...proposals.map((p) => ({ id: p.id, group: 'PROPOSALS', mine: p.pick, ruled: null, opts: p.opts.map((o) => [o.v, o.name]) })),
  ...patterns.flatMap((p) => p.suite.map((s) => ({ id: s.cid, group: 'PATTERNS', mine: s.pick, ruled: null, opts: W.pat.choice.map((x) => [x[0], x[1]]) })))];
if (new Set(choices.map((c) => c.id)).size !== choices.length) die('two choices share an id');
const DATA = { ep: EP, app: T.app, feedHead: T.feedHead, workHead, ui: UI, glance, calls, proposals, items: itemCards, questions, gap, patterns, remaining, choices };
const pageSha = crypto.createHash('sha1').update(JSON.stringify(DATA)).digest('hex').slice(0, 8);
DATA.pageSha = pageSha;

const { kitBlocks, withoutMotion } = require(path.join(DC, 'kit-blocks.js'));
let KIT; try { KIT = withoutMotion(kitBlocks(ROOT), ''); } catch (e) { die(e.message); }
const page = (shotBase) => { let html = rd(path.join(HERE, 'legibility-review.tpl.html'));
  const data = Object.assign({ shotBase }, DATA);
  for (const [mark, val] of [['<!--__KIT1__-->', KIT.k1], ['<!--__KIT2__-->', KIT.k2.trim()], ['<!--__KIT3__-->', KIT.k3], ['/*__DATA__*/null', JSON.stringify(data).replace(/</g, '\\u003c')]]) {
    if (!html.includes(mark)) die('template marker missing: ' + mark); html = html.replace(mark, () => val); }
  return html; };
const html = page(SHOT_REL);
if (CHECK) { const ok = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === html; console.log(ok ? 'legibility-review.html is current' : 'legibility-review.html is STALE — run gen-legibility-review.mjs'); process.exit(ok ? 0 : 1); }
if (PUBLISH) { const dir = path.resolve(PUBLISH); if (dir.startsWith(path.resolve(ROOT) + path.sep) && !dir.includes(path.sep + 'tmp')) console.warn('note: --publish writes into the repo at ' + path.relative(ROOT, dir) + ' — keep it out of a commit');
  fs.mkdirSync(path.join(dir, 'shots'), { recursive: true }); for (const f of used) fs.copyFileSync(path.join(SHOTS, f), path.join(dir, 'shots', f));
  fs.writeFileSync(path.join(dir, 'legibility-review.html'), page('shots/'));
  console.log(`published to ${dir}: legibility-review.html + ${used.size} pictures in shots/ · page ${pageSha}`); process.exit(0); }
fs.writeFileSync(OUT, html);
console.log(`legibility-review.html · ${items.length} items · ${calls.length} looks (${calls.filter((c) => c.ruled).length} ruled) in ${uniq(calls.map((c) => c.where)).length} places · ${proposals.length} proposals · ${questions.length} questions · ${patterns.length} patterns (${T.nSuite} suite proposals) · ${REM.items.length} remaining · ${choices.length} choices · ${used.size} pictures · page ${pageSha} · work ${workHead} · ${html.length} bytes`);
