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
           legibility-review.icons.json (the inline-svg marks, and which mark each pattern wears — no words in it) ·
           ../legibility-feedback.md (the ledger: round 1 L-01..L-23, round 2 from L-24) · ../decisions.md (D-066..D-074) · patterns.json · review-r1.raw.json ·
           fix-1b.json · remaining.json · gap-l19.json · measures.{before,r1,r1b}.json ·
           ../../workflow-panel/shots/all-endpoints/walk.json (the walk's pictures, tagged by item and option) ·
           ../../workflow-panel/all-endpoints.words.json NOW and at 6170519 (git show — the options ADDED this round are the option
           groups present now and absent then, derived, never typed) · ../../workflow-panel/all-endpoints.tpl.html (ROWOPT: which
           looks sit in which row's options) · ../../workflow-panel/all-endpoints.html (AE_DATA: the row names, the app) ·
           the frozen forms + archmap feeds and ../../workflow-panel/_ep_pieces.py (run through python3 — the lab's own piece count,
           never re-derived here) · the gabe-artifact kit (../kit-blocks.js) · legibility-review.tpl.html
   WRITES  legibility-review.html (pictures referenced RELATIVELY — he opens pages from Windows Chrome, never an absolute path)
   The work's commit in the copy text is the last commit that touched the REVIEWED inputs (a "+" when they are dirty), not HEAD:
   HEAD moves with this page's own commit, and the page must stay byte-identical to its inputs (--check). The two LOGS the page
   reads for content (the ledger and the decisions) are not among the reviewed inputs: they are written in the same commit as the
   page they feed, and a head that counted them could never equal its own commit.
   SPOKEN SUMMARIES (L-26): each section opens with a few sentences written to be read aloud — the words file holds the sentences as
   templates, this generator fills every number, and the build stops on an id, a path, a symbol or a {token} left in one.
   THE PLAYER (L-27, D-074): the contents bar freezes at the top while a voice plays and carries the player; its words are words.player,
   its marks are the icons file's (pause · prev · next · follow · pin). The page reads the voice lab's saved setting (gabe:voice:v1) at run time.
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
let TWIN = opt('--twin', null);   /* the app's repo, read-only (git grep at the feed's head); default ~/projects/apps/<app> */
const rd = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch (e) { die('cannot read ' + path.relative(ROOT, f)); } };
const rj = (f) => { try { return JSON.parse(rd(f)); } catch (e) { die('not JSON: ' + path.relative(ROOT, f) + ' — ' + e.message); } };
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
const line = (loc) => String(loc || '').split(':').pop();
const base = (loc) => String(loc || '').split(':')[0].split('/').pop();
/* a file named for a reader: its folder and its name — three files of one app are called cooking.py (the review's N3-12), so a bare basename would point at several */
const loc2 = (loc) => String(loc || '').split(':')[0].split('/').slice(-2).join('/');
const fnName = (key) => String(key || '').split('::').pop().split('#').pop().replace(/^middleware:/, '');
const uniq = (a) => [...new Set(a)];
const andList = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
/* the page speaks TO you (L17, LT-16): a record written about "him" is turned to the second person before it is drawn, and the build
   stops on any he · him · his left in a drawn string (the check at the end, P10). The verb after "he" follows the person. */
const VERB2 = { is: 'are', was: 'were', has: 'have', does: 'do' };
const you = (s) => (s == null ? s : String(s)
  .replace(/\b([Hh])e (is|was|has|does)\b/g, (m, h, v) => (h === 'H' ? 'You ' : 'you ') + VERB2[v])
  .replace(/\b([Hh])e ([a-z]+?)(ches|shes|sses|xes|s)\b/g, (m, h, w, e) => (h === 'H' ? 'You ' : 'you ') + w + (e.length > 1 ? e.slice(0, -2) : ''))
  .replace(/\b([Hh])is(?= to\b|\s*[.,;:)]|$)/g, (m, h) => (h === 'H' ? 'Yours' : 'yours'))
  .replace(/\bHe\b/g, 'You').replace(/\bhe\b/g, 'you').replace(/\bHis\b/g, 'Your').replace(/\bhis\b/g, 'your')
  .replace(/\bhimself\b/g, 'yourself').replace(/\bHim\b/g, 'You').replace(/\bhim\b/g, 'you'));
/* a long face lifted into a caption: its first line only (a chip's sub-lines start at ↳), cut at a word, never inside a path (L23) */
const cutText = (t, n) => { let s = String(t).split(' ↳ ')[0].trim(); if (s.length <= n) return s; s = s.slice(0, n); const sp = s.lastIndexOf(' ');
  return (sp > n / 3 ? s.slice(0, sp) : s).replace(/[\s·↳→,;:|]+$/, '') + '…'; };

/* ── 1 · the words, swept ─────────────────────────────────────────────────────────────────────────────────────────────
   House rule (gen-all-endpoints.py §1, ported): a fact is generated, never typed — a number inside an authored sentence is a
   {token} this generator fills, a number spelled as a word too, and a JSON number in the words file is refused outright.
   Exemptions, declared here and nowhere else:
     E1  a {token} — filled below; an unknown token stops the build.
     E2  an id that carries a number — a decision (D-066), an item (L-01), a remaining item (R-11), a pattern (P1), a
         recommendation (G1), a bench proposal (EX-5), the audit (A1), a review finding (F24 · CR-41 · N3-13 · S4-29), the round's
         names "round 1" · "round 1b" · "r1" — and an HTTP status, which is a LABEL (his question names the 403 and the 404).
     E3  a number inside “curly quotes” only when the same line also carries a {token}.
     E4  "one" is English's article or pronoun.
   The agent's own strings never say "door" or "lock" (D-018). */
const W = rj(path.join(HERE, 'legibility-review.words.json'));
const NUMWORD = /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|dozen)\b/i;
const QUOTED = /“[^”]*”/g, TOKEN = /\{[a-z]\w*\}/i, BANNED = /\b(door|doors|lock|locks)\b/i;
const scrub = (s) => String(s).replace(QUOTED, ' ').replace(/\{[a-z]\w*\}/gi, ' ').replace(/\b(?:D|L|R|EX|CR|N3|S4)-\d+\b/g, ' ')
  .replace(/\b[PGFA]\d{1,2}\b/g, ' ').replace(/\bround 1b?\b/gi, ' ').replace(/\br1b?\b/g, ' ').replace(/\b[1-5]\d\d\b/g, ' ');
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
/* the ledger is written in rounds ("Round 2 — source: …" stands above the first item of its round); an item's round is the last
   round line above its heading. Round 1 is the reviewed round: its items carry a pattern, a review verdict and findings; a later
   round's items are what you asked on reading this page, built here and not yet reviewed. */
const ROUND_AT = [...LEDGER.matchAll(/^Round (\d+) — /gm)].map((m) => ({ n: Number(m[1]), at: m.index }));
const roundOfAt = (at) => ROUND_AT.filter((r) => r.at < at).reduce((a, r) => Math.max(a, r.n), 1);
let LAT = 0;
const items = LEDGER.split(/^### /m).slice(1).filter((b) => /^L-\d\d\b/.test(b)).map((b) => {
  const id = b.slice(0, 4), f = {}; let cur = null; LAT = LEDGER.indexOf('### ' + id, LAT); const round = roundOfAt(LAT);
  for (const ln of b.split('\n').slice(1)) {
    const m = /^- \*\*([a-z ]+):\*\* ?(.*)$/.exec(ln);
    if (m) { cur = m[1]; f[cur] = m[2]; } else if (cur && /^ {2}\S/.test(ln)) f[cur] += ' ' + ln.trim(); else cur = null;
  }
  for (const k of ['words', 'where', 'could not tell', 'fix', 'tag', 'status']) if (!f[k]) die(`ledger ${id}: no ${k}`);
  return { id, round, words: f.words, readAs: f['read as'] || null, where: f.where, couldNot: f['could not tell'], fix: f.fix, tag: f.tag.replace(/`/g, '').trim(), status: f.status };
});
if (!items.length) die('the ledger holds no items');
const items1 = items.filter((it) => it.round === 1), itemsLater = items.filter((it) => it.round > 1);
/* each item's short name, so an id is never drawn alone (L11): an id chip reads "L-18 · what the row represents" and links to its card */
const ITEM_NAME = need(W.items, 'names', 'items');
for (const it of items) { it.name = ITEM_NAME[it.id] || die('words.items.names has no short name for ' + it.id); }
for (const k of Object.keys(ITEM_NAME)) if (k[0] !== '_' && !items.some((it) => it.id === k)) die('words.items.names names an item the ledger does not hold: ' + k);
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
for (const it of items1) if (!P.ledgerTagMap[it.tag]) die(`a ledger tag missing from patterns.json ledgerTagMap: ${it.tag} (${it.id})`);   /* a later round's items belong to no pattern: patterns.json is round 1's record */
const PATS = P.patterns, patById = Object.fromEntries(PATS.map((p) => [p.id, p]));
for (const r of REM.items) if (!patById[r.pattern]) die('remaining.json names no pattern ' + r.pattern + ' (' + r.id + ')');
if (W.lens.length !== REV.length) die(`words.lens names ${W.lens.length} lenses; the review has ${REV.length}`);

/* pictures: the walk's round-1 shots, each checked on disk */
const R1 = WALK.round1 || die('walk.json has no round1');
for (const s of R1) if (!fs.existsSync(path.join(SHOTS, s.file))) die('the walk names a picture that is not on disk: ' + s.file);
const VERB = need(W, 'shotVerb', ''), VERB_KEYS = ['hover', 'click', 'look', 'scrolled', 'wheeled', 'column', 'drag', 'shows'];
const used = new Set();
let lookOf = () => null;   /* set once the added looks are known: a shot taken under a look says which */
/* what a caption says of its target: a raw element key reads as words, a block's face as the block it is, a long face is cut at a word */
const SHOT_KEY = need(W.gen, 'shotKey', 'gen');
const shotText = (k, v) => { const t = String(v);
  const key = /^([a-z]+):(\S+)$/.exec(t); if (key && SHOT_KEY[key[1]]) return fill(SHOT_KEY[key[1]], { id: key[2] }, 'shotKey.' + key[1]);
  const blk = k === 'click' && /^(C\d+)\s/.exec(t); if (blk) return fill(need(W.gen, 'shotBlock', 'gen'), { id: blk[1] }, 'gen.shotBlock');
  return cutText(t, 72); };
const pic = (s) => { used.add(s.file); const k = VERB_KEYS.find((x) => s[x] != null); let cap = k ? (VERB[k] || die('words.shotVerb has no ' + k)) + ' ' + shotText(k, s[k]) : (W.shotOpen || die('words.shotOpen'));
  const lk = s.option ? lookOf(s.option, s.value) : null; if (lk) cap += ' · ' + lk;
  return { f: s.file, w: s.size[0], h: s.size[1], cap: you(cap) }; };
/* the walk photographs the click that puts an option back to its default SMALL — the options group itself, not the look (its own words:
   "that click is a step too, photographed small"). Such a crop is never a look's picture (LT-01, L8): under 300 px on both sides, or a
   strip under 100 px tall. */
const isCrop = (s) => (s.size[0] < 300 && s.size[1] < 300) || s.size[1] < 100;
const hasVerb = (s) => VERB_KEYS.some((x) => s[x] != null) || s.clicks != null;
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
TWIN = path.resolve(TWIN || path.join(os.homedir(), 'projects/apps', String(AE.tok.app || '')));
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
const LOOK_AT = need(W.gen, 'lookAt', 'gen');
const placeOf = (gid) => { const g = bareId(gid), sec = gid.split('.')[0], rows = Object.keys(ROWOPT).filter((f) => ROWOPT[f].includes(g));
  return { sec, rows, where: sec === 'ex' ? 'bench' : rows.length ? 'row' : 'table' }; };
const samePlace = (a, b) => { const A = placeOf(a), B = placeOf(b); return A.where === B.where && (A.where !== 'row' || A.rows.some((r) => B.rows.includes(r))); };
/* a look's picture: the largest of its own shots that is not a crop of the options; failing that, for the look the page opens on, the
   shot of its place taken AS IT OPENS (no click yet, every option of the place at its default), nearest before the group's first shot —
   only for a group the walk pictured at all (a look that is a behaviour, like ex.follow, has no still picture to borrow) */
const lookPic = (gid, v, k) => { const g = bareId(gid), own = R1.filter((s) => s.option === g);
  const mine = own.filter((s) => s.value === k && !isCrop(s)).sort((a, b) => b.size[0] * b.size[1] - a.size[0] * a.size[1] || a.n - b.n)[0];
  const look = LOOK_AT[gid] || die('words.calls.lookAt has no line for ' + gid + ' — where to look in its pictures');
  const capOf = (s, open) => { const k2 = VERB_KEYS.find((x) => s[x] != null);
    const how = open || !k2 ? fill(W.gen.capOpen, { place: W.gen.place[placeOf(gid).where] }, 'gen.capOpen') : k2 === 'hover' ? VERB.hover + ' ' + shotText('hover', s.hover) : k2 && k2 !== 'click' ? VERB[k2] + ' ' + shotText(k2, s[k2]) : W.gen.capClick;
    return you(how + ' · ' + look); };
  const out = (s, open) => { if (isCrop(s)) die(`${gid}=${k}: its picture ${s.file} is a crop of the options, not the look`); used.add(s.file); return { f: s.file, w: s.size[0], h: s.size[1], cap: capOf(s, open), open: !!open }; };
  if (mine) return out(mine, false);
  if (k !== v.pick || !own.some((s) => !isCrop(s))) return null;
  const first = Math.min(...own.map((s) => s.n));
  const opening = R1.filter((s) => s.n < first && s.option && !hasVerb(s) && !isCrop(s) && s.option !== g).filter((s) => { const og = ADDED.find((x) => bareId(x) === s.option);
    return og && samePlace(og, gid) && G_NOW[og].pick === s.value; }).sort((a, b) => b.n - a.n)[0];
  return opening ? out(opening, true) : null; };
/* the items a look answers: the ones its own words name ("his L-09"); the walk's tags only when its words name none (LT-06) */
const itemsOfLook = (gid, v) => { const own = uniq((String(v._about || '').match(/\bL-\d\d\b/g) || [])); if (own.length) return own;
  return uniq(R1.filter((s) => s.option === bareId(gid)).flatMap(itemsOfShot)).filter((x) => /^(L|CR|S4|N3)-\d+$|^F\d\d$/.test(x)); };
const calls = ADDED.map((gid) => {
  const v = G_NOW[gid], P0 = placeOf(gid);
  if (!v.opts[v.pick]) die(`${gid}: the pick “${v.pick}” is not one of its looks`);
  const opts = Object.entries(v.opts).map(([k, o]) => ({ v: k, name: you(o.name), plain: you(o.plain), shot: lookPic(gid, v, k) }));
  const from = decOfGroup(gid, v);
  return { id: gid, where: P0.where, rows: P0.rows.map(rowName), label: v.label, pick: v.pick, ruled: v.ruled ? v.pick : null, ruledBy: v.ruled || null, from,
    answers: itemsOfLook(gid, v), motion: MOTION[gid] || die('words.calls.motion has no line for ' + gid + ' — what choosing it sets in motion'), opts };
});
/* the bench's kind looks, added this round too (LT-09): one call per kind that is on the bench now and was not before, its column as
   the bench opens as the picture, my pick dashed, a kind the words file marks ruled filled */
const KINDS = (AEW.ex || {}).kinds || die('all-endpoints words: no ex.kinds'), KINDS0 = (AEW0.ex || {}).kinds || {};
const KLOOK = (AEW.ex || {}).look || {};
const kindCalls = Object.entries(KINDS).filter(([k]) => !KINDS0[k]).map(([k, kd]) => {
  const s = R1.find((x) => x.column === kd.name && !isCrop(x)) || null; if (s) used.add(s.file);
  const ruledBy = (KLOOK[k] || {}).ruled || null;
  return { id: 'ex.kind.' + k, kind: k, where: 'bench', rows: [], label: you(kd.name), pick: 'drawn', ruled: ruledBy ? 'drawn' : null, ruledBy,
    from: ruledBy || decOfGroup('ex.kind', { _about: SEC_ABOUT.ex }), answers: s ? itemsOfShot(s).filter((x) => /^L-\d\d$/.test(x)) : [],
    motion: fill(need(W.gen, 'kindMotion', 'gen'), { kind: kd.name }, 'gen.kindMotion'),
    about: you(kd.plain), opts: [{ v: 'drawn', name: W.gen.kindDrawn, plain: fill(W.gen.kindDrawnPlain, { kind: kd.name }, 'gen.kindDrawnPlain'), shot: s ? { f: s.file, w: s.size[0], h: s.size[1], cap: you(fill(W.gen.kindCap, { kind: kd.name }, 'gen.kindCap')), open: true } : null },
      { v: 'change', name: W.gen.kindChange, plain: W.gen.kindChangePlain, shot: null, note: W.gen.kindChangeNote }] }; });
if (!kindCalls.length) die('no bench kind was added since ' + BEFORE_SHA);
calls.push(...kindCalls);
/* an id is never drawn alone (L11): a decision wears its title's first words, a review finding its first words, an item its short name */
const refName = (id) => { if (decs[id]) return you(cutText(decs[id].title, 52)); const f = findings.find((x) => x.id === id); if (f) return you(cutText(f.what, 52));
  const it = items.find((x) => x.id === id); return it ? it.name : null; };
for (const c of calls) { c.fromName = refName(c.from); c.answers = c.answers.map((id) => ({ id, name: refName(id) })); }
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
    sName: S.limiter.replace(/^_/, ''), gName: G.limiter.replace(/^_/, ''), sCode: S.limiter, gCode: G.limiter, sPrefixN: ex(S).scope.length, sEndpoints: ex(S).applies_to, sLimit: arg(S, 'limit'), sWindow: fmtNum(arg(S, 'window_seconds')), sLine: line(S.at),
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
  const client = site ? fill(W.q.client, { fn: fnName(site.piece), status: st, at: loc2(site.at) + ':' + line(site.at), key: ((site.does || [])[0] || {}).literal || W.q.none,
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
  const PN = need(W, 'plainName', ''), lim = QF.limiter;
  const meaning = (n) => (n === lim.sCode ? fill(W.q.counterName, { name: lim.sName }, 'q.counterName') : n === lim.gCode ? fill(W.q.counterName, { name: lim.gName }, 'q.counterName') : PN[n] || null);
  const named = (n) => (meaning(n) ? fill(W.q.meantAs, { plain: meaning(n), code: n }, 'q.meantAs') : n);
  QF.inflight = { nInf: rows.length, nReq: req.length, nSrv: srv.length, nUnk: unk, reqLines, srvNames: srv.map((r) => named(r.name)).join(' · '), srvDecNames: andList(srvDec.map((r) => meaning(r.name) || r.name)),
    srvDecStatus: decStat.join(', '), srvDecLines: fmtLocs(uniq((E.produced || []).filter((x) => decStat.includes(x.status) && x.site).map((x) => x.site))) }; }

/* Q7 — why some functions have no role: the map's folders (about the map, D-017 — said here, not on the page) */
{ const sc = A.file_census.scanned_dirs || die('archmap has no scanned_dirs');
  const scanned = sc.map((d) => d.replace(/^apps\/api\//, ''));
  const folders = uniq([...FTXT.matchAll(/apps\/api\/([a-z0-9_]+)\/[\w/]+\.py/g)].map((m) => m[1])).filter((d) => d !== 'tests' && !scanned.some((s) => s === d || s.startsWith(d + '/'))).sort();
  const l14 = items.find((x) => x.id === 'L-14') || die('no L-14');
  const names = uniq([...String(l14.readAs || '').matchAll(/`([^`]+)`/g)].map((m) => m[1]));
  if (!names.length) die('L-14 no longer reads the names he asked about');
  /* where a name lives: the forms feed first; a name no feed records is looked up in the app's source AT THE FEED'S HEAD (a read-only
     git grep in the twin, --twin), so the answer names the real file; with no twin the answer says only what was searched (LT-02) */
  const fromSource = (short) => { if (!fs.existsSync(path.join(TWIN, '.git'))) return null;
    try { const out = execFileSync('git', ['-C', TWIN, 'grep', '-n', '-E', '^\\s*(async\\s+)?def ' + short + '\\b', F.head, '--', 'apps/api'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n').filter(Boolean);
      const files = uniq(out.map((l) => l.split(':')[1])); return files.length === 1 ? files[0] : null; } catch (e) { return null; } };
  const named = names.map((n) => { const short = n.split('.').pop(); const m = new RegExp('(apps/api/[\\w/]+\\.py)::(?:[\\w.]*\\.)?' + short + '\\b').exec(FTXT);
    const file = m ? m[1] : fromSource(short);
    if (!file) return fill(W.q.nameOnly, { name: n }, 'q.nameOnly');
    const dir = file.split('/')[2]; return fill(scanned.some((s) => s.split('/')[0] === dir) ? W.q.inRead : W.q.inUnread, { name: n, dir, file: loc2(file) }, 'q.in'); });
  QF.roles = { nScanned: sc.length, scannedList: scanned.join(' · '), unreadDirs: folders.join(' · '), named }; }

/* Q1 — the icons: the measure's own count, before and now */
{ const b = MEAS[0].mo, n = MEAS[2].mo;
  QF.icons = { bareBefore: b.bare, bareNow: n.bare, gateBefore: (b.bareByRow || {}).gate || 0, gateNow: (n.bareByRow || {}).gate || 0, fnBefore: (b.bareByRow || {}).fn || 0, fnNow: (n.bareByRow || {}).fn || 0,
    bareNowRows: Object.entries(n.bareByRow || {}).map(([f, k]) => rowName(f) + ' ' + k).join(' · ') || W.q.none }; }

const verdictsOf = (key) => REV.map((L, li) => { const v = L.verdicts.find((x) => x.item === key || x.item.startsWith(key + ' ')); return v ? { lens: li, verdict: v.verdict, remains: you(v.remains) } : null; }).filter(Boolean);
const QTOK = Object.assign({ ep: EP }, QF.limiter, QF.fetch, QF.pieces, QF.inflight, QF.roles, QF.icons, { screen: QF.screen });
const SUBJECTS = ['code', 'page', 'map'];
const questions = W.questions.map((q) => {
  const lines = [];
  for (const l of q.lines) {
    if (l === '@statuses') for (const s of QF.statuses) lines.push(...s.lines);
    else if (l === '@inflightReq') lines.push(...QF.inflight.reqLines);
    else if (l === '@named') lines.push(...QF.roles.named);
    else lines.push(fill(l, QTOK, 'questions.' + q.key));
  }
  if (!SUBJECTS.includes(q.subject)) die(`questions.${q.key}: subject must be one of ${SUBJECTS.join(' · ')} — what the answer is about (L6)`);
  const hov = R1.filter((s) => s.hover), pickS = [];   /* one picture per item he named first, then the next of the first item */
  for (const i of q.items) { const s = hov.find((x) => itemsOfShot(x).includes(i) && !pickS.includes(x)); if (s) pickS.push(s); }
  for (const s of hov) if (pickS.length < 2 && !pickS.includes(s) && itemsOfShot(s).some((i) => q.items.includes(i))) pickS.push(s);
  const shots = pickS.slice(0, 2).map(pic);
  const fx = (q.findings || []).map((id) => { const f = findings.find((x) => x.id === id) || die('no finding ' + id); const [o, why] = outcomeOf(id); return { id, what: you(f.what), outcome: o, why: you(why) }; });
  return { key: q.key, q: q.q, short: need(q, 'short', 'questions.' + q.key), subject: q.subject, items: q.items, about: q.about || null, lines, verdict: q.verdict ? (verdictsOf(q.verdict)[0] || die('no review verdict for ' + q.verdict)) : null, findings: fx, shots };
});

/* ── 7 · his items, with the review's verdict and round 1b's outcome ────────────────────────────────────────────────── */
/* what changed, as you see it (L12): the record's code names — a parenthesis that holds a code word, an option's key — leave the face;
   the record as written stays in a fold for Claude */
const plainFix = (t) => { const s = String(t).replace(/^(?:BUILT|built)\s*(?:—|:)\s*/, '').replace(/\s*\([^()]*`[^()]*\)/g, '').replace(/\s*\((?:mo|ex)\.opt\.\w+\)/g, '').replace(/,\s*proven [^,;]*?\bby [\w./-]+\.(?:py|mjs|js)\b/g, '').replace(/`/g, '').replace(/\s+([,;.])/g, '$1').trim();
  return you(s.charAt(0).toUpperCase() + s.slice(1)); };
const itemCards = items.map((it) => {
  const [first, rest] = firstSentence(it.words);
  const fs1 = findings.filter((f) => f.item === it.id).map((f) => { const [o, why] = outcomeOf(f.id); return { id: f.id, sev: f.severity, what: you(f.what), outcome: o, why: you(why) }; });
  const fix = plainFix(it.fix);
  return { id: it.id, round: it.round, name: it.name, words: it.words, readAs: it.readAs, first, rest, where: you(it.where), couldNot: you(it.couldNot), fix, fixRecord: fix === you(it.fix) ? null : you(it.fix),
    status: you(it.status), kind: statusKind(it.status), pattern: P.ledgerTagMap[it.tag] || null, patternName: (patById[P.ledgerTagMap[it.tag]] || {}).name || null, verdicts: verdictsOf(it.id), findings: fs1,
    shots: R1.filter((s) => itemsOfShot(s).includes(it.id)).map(pic) };
});
const ITEM_BY = Object.fromEntries(itemCards.map((c) => [c.id, c]));

/* ── 9 · the gap analysis (L-19), counted from gap-l19.json ─────────────────────────────────────────────────────────── */
/* one name per row (L19, LT-13): a gap record's section name is drawn as the page's own row name (AE_DATA's blocks) */
const normRow = (x) => String(x).toLowerCase().replace(/\band\b/g, ' ').replace(/\s+/g, ' ').trim();
const PAGE_ROW = Object.fromEntries(AE.blocks.map((b) => [normRow(b.name), b.name]));
const rowWord = (x) => (x == null ? x : String(x).split(' + ').map((p) => PAGE_ROW[normRow(p)] || (normRow(p) === 'metadata' ? W.gen.metadata : p)).join(' + '));
const TOP = Math.max(...GAP.parts.flatMap((p) => p.rows.map((r) => r[1]))), LOW = Math.min(...GAP.parts.flatMap((p) => p.rows.map((r) => r[1])));
const gap = { topRating: TOP, newSections: GAP.newSections.map(rowWord), undecided: GAP.undecided.map(rowWord), toMetadata: GAP.toMetadata.map(rowWord), asAxis: GAP.asAxis.map(rowWord), ruledPairing: GAP.ruledPairing,
  parts: GAP.parts.map((p) => { const by = {}; for (const r of p.rows) { const k = rowWord(r[2]) || ''; by[k] = (by[k] || 0) + 1; }
    return { part: p.part, n: p.rows.length, r3: p.rows.filter((r) => r[1] === TOP).length, none: p.rows.filter((r) => !r[2]).length, to: Object.entries(by).filter(([k]) => k).sort((a, b) => b[1] - a[1]), rows: p.rows.map((r) => [r[0], r[1], rowWord(r[2])]) }; }),
  security: GAP.security.map((r) => [r[0], r[1], rowWord(r[2])]), widening: GAP.widening.map((r) => [r[0], rowWord(r[1])]), orphaned: GAP.orphanedRated3.map((r) => [r[0], you(r[1])]), alsoFound: GAP.alsoFound.map(you) };
{ const names = uniq([...GAP.newSections, ...GAP.undecided, ...GAP.toMetadata, ...GAP.asAxis]).filter((x) => rowWord(x).toLowerCase() !== x.toLowerCase());
  const inProse = (t) => names.reduce((acc, x) => acc.replace(new RegExp('\\b' + x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'), rowWord(x)), String(t));
  gap.ruledPairing = inProse(gap.ruledPairing); gap.orphaned = gap.orphaned.map((r) => [r[0], inProse(r[1])]); }
gap.nRows = gap.parts.reduce((a, p) => a + p.n, 0); gap.nNone = gap.parts.reduce((a, p) => a + p.none, 0);
gap.secMissing = GAP.security.filter((s) => /missing/.test(s[1])).length; gap.secOrphan = GAP.security.filter((s) => /orphaned/.test(s[1])).length;
/* where each orphaned fact sat, and what happens to that row: the axis, or leaving with your std choice (never stated as settled, LT-13) */
gap.orphanFates = uniq(GAP.security.map((s) => (/orphaned \(it sat in ([^)]+)\)/.exec(s[1]) || [])[1]).filter(Boolean)).map((r) => {
  const nm = rowWord(r); if (GAP.asAxis.some((x) => normRow(x) === normRow(r))) return fill(W.gen.fateAxis, { row: nm }, 'gen.fateAxis');
  if (GAP.undecided.some((x) => normRow(x) === normRow(r))) return fill(W.gen.fateUndecided, { row: nm }, 'gen.fateUndecided');
  return die('gap-l19: an orphaned fact sat in ' + r + ', a row the record neither moves nor leaves undecided'); }).join(', and ');

/* ── 10 · the patterns ─────────────────────────────────────────────────────────────────────────────────────────────── */
const CHECKS = {          /* a check named by patterns.json → where the measure keeps its number (null: the section did not exist then) */
  nested: (m) => m.totals.nested, titles: (m) => m.totals.titles, repeatText: (m) => m.totals.repeatText, repeatLine: (m) => m.totals.repeatLine,
  pageTalk: (m) => m.totals.pageTalk, twins: (m) => m.mo.twins, twinFaces: (m) => m.mo.twinFaces, bare: (m) => m.mo.bare, midWord: (m) => m.mo.midWord,
  benchMidWord: (m) => (m.perSection['sec-ex'] ? m.bench.midWord : null), cut: (m) => Object.values(m.cut || {}).reduce((a, b) => a + b, 0),
  machineWords: (m) => m.mo.machineWords, timeless: (m) => m.mo.timeless, unfilled: (m) => m.unfilled };
const CHECK_ORDER = ['nested', 'titles', 'repeatText', 'repeatLine', 'pageTalk', 'twins', 'twinFaces', 'bare', 'midWord', 'benchMidWord', 'cut', 'machineWords', 'timeless', 'unfilled'];
/* a check whose words say what it does not see (`blind`) keeps its numbers on the page with that said beside them, and stays out of the
   went-down tally (LT-03: the cut check never measures a closed selector) */
const checkRow = (id) => { const w = W.checks[id] || die('words.checks has no plain name for the check ' + id); const vals = MEAS.map((m) => CHECKS[id](m));
  if (vals.some((v) => v !== null && typeof v !== 'number')) die('the measure holds no number for ' + id); return { id, name: w.name, plain: w.plain, blind: w.blind || null, vals }; };
for (const p of PATS) for (const c of p.checks) if (!CHECKS[c]) die(`pattern ${p.id} names a check the measure does not keep: ${c}`);
const itemsOfPat = (pid) => uniq([...items.filter((it) => P.ledgerTagMap[it.tag] === pid).map((it) => it.id), ...((P.alsoItems || {})[pid] || [])]).sort();
const findOfPat = (pid) => findings.filter((f) => P.reviewTagMap[f.pattern] === pid);
const REM_KINDS = ['surface', 'feed', 'yours', 'process'];
for (const r of REM.items) if (!REM_KINDS.includes(r.kind)) die('remaining.json ' + r.id + ': kind must be one of ' + REM_KINDS.join(' · '));
const callById = Object.fromEntries(calls.map((c) => [c.id, c]));
const AUDIT = P.audit || die('patterns.json has no audit (A1) — the script the check proposals share');
const AUDIT_SRC = path.join(HERE, 'measure-legibility.mjs');
const patterns = PATS.map((p) => {
  const its = itemsOfPat(p.id), fd = findOfPat(p.id), rm = REM.items.filter((r) => r.pattern === p.id), open = rm.filter((r) => r.status === 'open');
  const stillThere = open.length + fd.filter((f) => ['partly', 'left'].includes(outcomeOf(f.id)[0])).length;
  /* the pick (L3): land where the pattern came back after the agents had been told the rules (an open row of What round 1b left that is
     not left for your call), or where you raised it yourself; not yet otherwise. It reads one round, and it does not weigh the cost. */
  const backRows = open.filter((r) => r.kind !== 'yours'), back = backRows.map((r) => r.id);
  const backWords = REM_KINDS.filter((k) => backRows.some((r) => r.kind === k)).map((k) => backRows.filter((r) => r.kind === k).map((r) => r.id).join(' · ') + ' (' + W.rem.kind[k] + ')').join('; ');
  const pick = back.length || its.length ? 'land' : 'notyet';
  const checks = p.checks.map(checkRow);
  const suite = p.suite.map((s, i) => { const cid = p.id + '.' + (i + 1);
    for (const k of ['kind', 'target', 'what', 'lands', 'gate', 'against']) if (!s[k]) die(`patterns.json ${cid}: no ${k} — a proposal states where it lands, what it costs and what speaks against it (L1)`);
    if (s.size) die(`patterns.json ${cid}: “size” was the kind of file, not a size — say it in lands`);
    for (const c of s.checks || []) if (!p.checks.includes(c)) die(`patterns.json ${cid}: a check its pattern does not name: ${c}`);
    if (s.partOf && s.partOf !== AUDIT.id) die(`patterns.json ${cid}: part of ${s.partOf}, which is not the audit`);
    const waits = (s.waitsOn || []).map((g) => { const c = callById[g] || die(`patterns.json ${cid}: waits on ${g}, which is not one of your calls`); return { id: g, label: c.label }; });
    const flags = (s.checks || []).map((c) => { const r = checkRow(c); return r.name + ' ' + r.vals[2] + (r.blind ? ' (' + r.blind + ')' : ''); });
    return { cid, kind: s.kind, target: you(s.target), what: you(s.what), lands: you(s.lands), gate: you(s.gate), against: you(s.against), partOf: s.partOf || null, waits,
      flags: flags.length ? fill(W.gen.flagsToday, { list: flags.join(' · ') }, 'gen.flagsToday') : s.kind === 'check' ? W.gen.noFlags : null, pick }; });
  return { id: p.id, name: p.name, line: you(p.line), whyModel: you(p.whyModel), whyHuman: you(p.whyHuman), items: its, nFind: fd.length, nOpen: open.length, nRem: rm.length, stillThere,
    because: pick === 'land' ? [back.length ? fill(W.gen.becauseBack, { ids: backWords }, 'gen.becauseBack') : null, its.length ? fill(W.gen.becauseYours, { ids: its.join(' · ') }, 'gen.becauseYours') : null].filter(Boolean).join(' ') : W.gen.becauseNot,
    out: { fixed: fd.filter((f) => outcomeOf(f.id)[0] === 'fixed').length, partly: fd.filter((f) => outcomeOf(f.id)[0] === 'partly').length, left: fd.filter((f) => outcomeOf(f.id)[0] === 'left').length, his: fd.filter((f) => outcomeOf(f.id)[0] === 'his').length },
    checks, suite };
/* your items first, then the review's findings (L5) — the biggest is the one you raised most */
}).sort((a, b) => b.items.length - a.items.length || b.nFind - a.nFind || PATS.findIndex((x) => x.id === a.id) - PATS.findIndex((x) => x.id === b.id));
{ const tagged = items1.filter((it) => !patterns.some((p) => p.items.includes(it.id))); if (tagged.length) die('items no pattern holds: ' + tagged.map((x) => x.id).join(',')); }
const auditParts = patterns.flatMap((p) => p.suite.filter((s) => s.partOf === AUDIT.id).map((s) => s.cid));
if (!auditParts.length) die('no proposal is part of the audit ' + AUDIT.id);
for (const k of ['id', 'name', 'what', 'lands', 'gate', 'battery', 'against']) if (!AUDIT[k]) die('patterns.json audit: no ' + k);
const audit = { id: AUDIT.id, name: you(AUDIT.name), what: you(AUDIT.what), lands: you(AUDIT.lands), gate: you(AUDIT.gate), battery: you(AUDIT.battery), against: you(AUDIT.against),
  lines: fill(W.gen.auditLines, { n: rd(AUDIT_SRC).split('\n').filter((l, i, a) => i < a.length - 1 || l).length }, 'gen.auditLines'), parts: auditParts,
  pick: patterns.some((p) => p.suite.some((s) => s.partOf === AUDIT.id && s.pick === 'land')) ? 'land' : 'notyet' };

/* ── 11 · what round 1b left, by pattern: the open rows, the findings it fixed only partly or left, and what the small pass fixed (L4) ── */
const SMALL = uniq(REM.items.map((r) => (/^fixed (\w+)$/.exec(r.status) || [])[1]).filter(Boolean));
if (SMALL.length > 1) die('remaining.json: rows fixed by more than one pass (' + SMALL.join(', ') + ') — the page names one small pass');
const srcWord = (s) => { let m;   /* where a row was seen, in words (L22): never a lane id or a sha on the face */
  if ((m = /^lane F\w+(?: \((.+)\))?$/.exec(s))) return W.gen.srcLane + (m[1] ? ' · ' + m[1] : '');
  if ((m = /^measure r1b \((\w+)\)$/.exec(s))) return fill(W.gen.srcMeasure, { check: (W.checks[m[1]] || die('remaining: a measure check with no words: ' + m[1])).name }, 'gen.srcMeasure');
  if (/^merge \w+$/.test(s)) return W.gen.srcMerge; if (s === 'this session') return W.gen.srcSession;
  return die('remaining.json: a source with no words: ' + s); };
const remaining = PATS.map((p) => {
  const rm = REM.items.filter((r) => r.pattern === p.id).map((r) => ({ id: r.id, where: you(r.where), what: you(r.what), source: srcWord(r.source), kind: r.kind, open: r.status === 'open' }));
  const left = findOfPat(p.id).filter((f) => ['partly', 'left'].includes(outcomeOf(f.id)[0])).map((f) => { const [o, why] = outcomeOf(f.id); return { id: f.id, where: you(f.where), what: you(f.what), outcome: o, why: you(why) }; });
  return { id: p.id, name: p.name, open: rm.filter((r) => r.open), left, fixed: rm.filter((r) => !r.open) }; }).filter((g) => g.open.length + g.left.length + g.fixed.length);
const remOpen = REM.items.filter((r) => r.status === 'open'), byKind = (k) => remOpen.filter((r) => r.kind === k);

/* ── 12 · at a glance ──────────────────────────────────────────────────────────────────────────────────────────────── */
const kinds = ['built', 'option', 'question', 'logged', 'deferred'];
const shaOf = (m) => (/·\s*(\w+)\s*$/.exec(m.label) || die('a measure label names no commit: ' + m.label))[1];
const MLAB = need(W.gen, 'measLabels', 'gen'); if (MLAB.length !== MEAS.length) die('words.gen.measLabels names ' + MLAB.length + ' columns; the measure has ' + MEAS.length);
const glance = { status: kinds.map((k) => ({ k, word: W.statusWord[k] || die('words.statusWord has no ' + k), n: items1.filter((it) => statusKind(it.status) === k).length })).filter((x) => x.n),
  withOpt: items1.filter((it) => /\boption\b/.test(it.status)).length,
  review: { total: findings.length, fixed: FIX.fixed.length, partly: Object.keys(FIX.partly).length, left: Object.keys(FIX.left).length, his: Object.keys(FIX.his).length },
  labels: MEAS.map((m, i) => fill(MLAB[i], { sha: shaOf(m) }, 'gen.measLabels')), checks: CHECK_ORDER.map(checkRow), viewport: MEAS[2].viewport };
{ const t = glance.review; if (t.fixed + t.partly + t.left + t.his !== t.total) die('fix-1b.json does not account for every finding'); }
const cmp = glance.checks.filter((c) => c.vals[0] !== null && c.vals[2] !== null && !c.blind);
const leftOut = glance.checks.filter((c) => !cmp.includes(c)).map((c) => c.name + ' (' + (c.blind || W.gen.noBefore) + ')').join(' · ');

/* ── 13 · tokens for the page's own sentences, then the words filled ─────────────────────────────────────────────── */
const workHead = (() => { const inputs = [...['patterns', 'review-r1.raw', 'fix-1b', 'remaining', 'gap-l19', 'measures.before', 'measures.r1', 'measures.r1b'].map((f) => 'docs/design/design-context/legibility/' + f + '.json'),
    'docs/design/workflow-panel/shots/all-endpoints/walk.json', AEW_PATH, 'docs/design/workflow-panel/all-endpoints.html', 'docs/design/workflow-panel/all-endpoints.tpl.html'];
  const h = git('log', '-1', '--format=%H', '--', ...inputs).trim().slice(0, 7) || die('git knows no commit of the reviewed inputs'); const dirty = git('status', '--porcelain', '--', ...inputs).trim();
  return h + (dirty ? '+' : ''); })();
const isLook = (c, o) => !c.kind || o.v === 'drawn';
const nLooks = calls.reduce((a, c) => a + c.opts.filter((o) => isLook(c, o)).length, 0), nNoPic = calls.reduce((a, c) => a + c.opts.filter((o) => isLook(c, o) && !o.shot).length, 0);
const optOnly = items1.filter((it) => statusKind(it.status) === 'option').length;
const subj = (k) => questions.filter((q) => q.subject === k);
const T = { ep: EP, nItems: items1.length, nAllItems: items.length, nRound2: itemsLater.length, nRound2Built: itemsLater.filter((it) => statusKind(it.status) === 'built').length, nFindings: findings.length, nLenses: REV.length, nChecks: glance.checks.length, viewport: glance.viewport, withOpt: glance.withOpt, optOnly, optBeside: glance.withOpt - optOnly,
  built: items1.filter((it) => statusKind(it.status) === 'built').length, opts: glance.withOpt, down: cmp.filter((c) => c.vals[2] < c.vals[0]).length, same: cmp.filter((c) => c.vals[2] === c.vals[0]).length,
  up: cmp.filter((c) => c.vals[2] > c.vals[0]).length, nCompared: cmp.length, leftOut, smallPass: SMALL[0] || die('remaining.json: no row was fixed by a small pass'),
  nCalls: calls.length, nGroups: calls.filter((c) => !c.kind).length, nKinds: kindCalls.length, nKindsRuled: kindCalls.filter((c) => c.ruled).length, nLooks, nNoPic, nRuled: calls.filter((c) => c.ruled).length, nProps: 0,
  nPatterns: patterns.length, nSuite: patterns.reduce((a, p) => a + p.suite.length, 0), nLand: patterns.filter((p) => p.suite[0].pick === 'land').length, auditId: audit.id, nAuditParts: auditParts.length,
  topPattern: patterns[0].name, topItems: patterns[0].items.length, topFind: patterns[0].nFind, nRem: REM.items.length, nOpen: remOpen.length,
  nSurf: byKind('surface').length, nFeed: byKind('feed').length, nYoursRem: byKind('yours').length, nProc: byKind('process').length, procIds: byKind('process').map((r) => r.id).join(' · ') || W.q.none,
  nLeftFind: Object.keys(FIX.partly).length + Object.keys(FIX.left).length, nFixedSmall: REM.items.filter((r) => r.status !== 'open').length,
  nParts: gap.parts.length, topRating: TOP, lowRating: LOW, nRows: gap.nRows, nNone: gap.nNone, nNew: gap.newSections.length, secMissing: gap.secMissing, secOrphan: gap.secOrphan, orphanFates: gap.orphanFates, nOrphan: gap.orphaned.length,
  partlyItems: itemCards.filter((c) => c.verdicts.some((v) => v.verdict !== 'answered') || c.findings.length).length, itemFindings: itemCards.reduce((a, c) => a + c.findings.length, 0),
  closed: itemCards.reduce((a, c) => a + c.findings.filter((f) => f.outcome === 'fixed').length, 0), feedHead: F.head || die('the forms feed carries no head'), workHead,
  app: AE.tok.app || die('AE_DATA names no app'), nPics: 0, nQs: questions.length, nCodeQs: subj('code').length,
  pageQs: subj('page').map((q) => q.short).join(' and ') || W.q.none, mapQs: subj('map').map((q) => q.short).join(' and ') || W.q.none };

/* ── 8 · the proposals that need his word (after the tokens: their sentences may count) ────────────────────────────── */
const rem = Object.fromEntries(REM.items.map((r) => [r.id, r]));
const PTOK = Object.assign({}, T, { oldHead: (AEW.cols.fetched || die('all-endpoints words: no cols.fetched')).head, sender: QF.sender, screen: QF.screen, hisIds: Object.keys(FIX.his).join(' · ') });
const shotBy = (q) => { const keys = Object.keys(q).filter((k) => k !== 'cap'); return R1.find((s) => keys.every((k) => s[k] === q[k]) && !isCrop(s)) || die('no walk picture for ' + JSON.stringify(q)); };
const proposals = W.proposals.map((p) => {
  const opts = p.opts === '@gap' ? GAP.recommend.map((g) => ({ v: g.id, name: g.id + ' · ' + you(g.name), plain: you(g.what + (g.cost ? ' ' + g.cost : '')) })) : p.opts.map((o) => ({ v: o.v, name: fill(o.name, PTOK, p.id), plain: fill(o.plain, PTOK, p.id) }));
  if (p.opts === '@gap') for (const g of GAP.recommend) if (g.pick && !g.cost) die('gap-l19: my pick ' + g.id + ' states no cost (L14)');
  const pick = p.opts === '@gap' ? (GAP.recommend.filter((g) => g.pick).map((g) => g.id)[0] || die('gap-l19 marks no pick')) : p.pick;
  if (!opts.some((o) => o.v === pick)) die(`proposal ${p.id}: my pick “${pick}” is not one of its options`);
  const facts = (p.facts || []).map((k) => (rem[k] ? { id: k, text: you(rem[k].what) } : FIX.left[k] ? { id: k, text: you(FIX.left[k]) } : FIX.his[k] ? { id: k, text: you(FIX.his[k]) } : findings.find((f) => f.id === k) ? { id: k, text: you(findings.find((f) => f.id === k).what) } : die('proposal ' + p.id + ' cites nothing called ' + k)));
  const shots = (p.pics || []).map((q) => { const sh = pic(shotBy(q)); if (q.cap) sh.cap = you(fill(q.cap, PTOK, p.id + '.pics')); return sh; });
  return { id: p.id, title: fill(p.title, PTOK, p.id), what: fill(p.what, PTOK, p.id), motion: fill(p.motion, PTOK, p.id), opts, pick, facts, shots, alsoIn: p.alsoIn || null };
});
T.nProps = proposals.length;
for (const c of calls) c.motion = fill(c.motion, T, 'calls.motion.' + c.id);
T.nPics = used.size;
const fillTree = (o, at) => (typeof o === 'string' ? fill(o, T, at) : Array.isArray(o) ? o.map((v, i) => fillTree(v, at + '[' + i + ']')) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).filter(([k]) => k[0] !== '_').map(([k, v]) => [k, fillTree(v, at + '.' + k)])) : o);
const omit = (o, ks) => Object.fromEntries(Object.entries(o).filter(([k]) => !ks.includes(k)));
const UI = fillTree({ page: W.page, toc: W.toc, sec: W.sec, calls: omit(W.calls, ['motion']), statusWord: W.statusWord, outcome: W.outcome, verdict: W.verdict, sev: W.sev, lens: W.lens, items: omit(W.items, ['names']), qs: W.qs, gap: W.gap, pat: W.pat, rem: W.rem, copy: W.copy, legend: W.legend, mark: W.mark, say: W.say, player: need(W, 'player', ''), ov: W.ov }, 'ui');

/* ── 14 · the data, the hash, the page ─────────────────────────────────────────────────────────────────────────────── */
const choices = [...calls.map((c) => ({ id: c.id, group: 'CALLS', mine: c.pick, ruled: c.ruled, ruledBy: c.ruledBy, opts: c.opts.map((o) => [o.v, o.name]) })),
  ...proposals.map((p) => ({ id: p.id, group: 'PROPOSALS', mine: p.pick, ruled: null, ruledBy: null, opts: p.opts.map((o) => [o.v, o.name]) })),
  { id: audit.id, group: 'PATTERNS', mine: audit.pick, ruled: null, ruledBy: null, opts: W.pat.choice.map((x) => [x[0], x[1]]) },
  ...patterns.flatMap((p) => p.suite.map((s) => ({ id: s.cid, group: 'PATTERNS', mine: s.pick, ruled: null, ruledBy: null, opts: W.pat.choice.map((x) => [x[0], x[1]]) })))];
if (new Set(choices.map((c) => c.id)).size !== choices.length) die('two choices share an id');

/* ── 13b · the marks (L-25) and the spoken summaries (L-26) ──────────────────────────────────────────────────────────────
   The icons file holds geometry only; every mark's word is read from the words file, so a concept has one word. A pattern with no
   mark of its own, a mark two patterns share, or a mark the page needs and the file lacks stops the build. */
const IC = rj(path.join(HERE, 'legibility-review.icons.json'));
{ const NEED = ['built', 'option', 'question', 'logged', 'deferred', 'fixed', 'partly', 'left', 'open', 'his', 'mine', 'yours', 'ruled', 'land', 'notyet', 'surface', 'feed', 'process', 'down', 'same', 'up', 'code', 'page', 'map', 'copy', 'play', 'stop', 'speaker', 'check', 'pause', 'prev', 'next', 'follow', 'pin'];
  for (const k of NEED) if (!IC.marks[k]) die('icons: the page needs a mark named ' + k);
  for (const [k, v] of Object.entries(IC.marks)) if (/<(script|style|a|foreignObject|image)\b|\bon\w+\s*=|javascript:/i.test(v)) die('icons: a mark that is not plain shapes: ' + k);
  for (const p of PATS) { const n = IC.pattern[p.id]; if (!n) die(`icons: pattern ${p.id} wears no mark of its own`); if (!IC.marks[n]) die(`icons: pattern ${p.id} wears “${n}”, which is not in marks`); }
  const worn = PATS.map((p) => IC.pattern[p.id]), dup = worn.filter((x, i) => worn.indexOf(x) !== i); if (dup.length) die('icons: two patterns wear one mark: ' + uniq(dup).join(', '));
  for (const k of Object.keys(IC.pattern)) if (!patById[k]) die(`icons: a mark for ${k}, which patterns.json does not hold`); }
/* the sections in the order the page draws them (the template's own order; the probe reads the DOM and says if they ever differ) */
const SEC_ORDER = ['glance', 'rem', 'pat', 'calls', 'items', 'qs', 'gap', 'copy'];
const remTop = remaining.map((g) => ({ id: g.id, n: g.open.length })).sort((a, b) => b.n - a.n)[0] || { id: patterns[0].id, n: 0 };
Object.assign(T, { nAnswered: items1.filter((it) => statusKind(it.status) === 'question').length, nFixedF: FIX.fixed.length, nPartlyF: Object.keys(FIX.partly).length, nLeftF: Object.keys(FIX.left).length, nHisF: Object.keys(FIX.his).length,
  nPatOpen: remaining.filter((g) => g.open.length).length, openTopName: patById[remTop.id].name, openTopN: remTop.n, nNotYet: patterns.length - T.nLand,
  round2Names: andList(itemsLater.map((it) => it.name)), nPageQs: subj('page').length, nMapQs: subj('map').length, nChoices: choices.length });
/* a spoken summary: 3 to 6 sentences a voice can read — no id, path, symbol, quote, code or token left in it */
const SAY_BAD = [[/[·→/×|#{}\\“”"`<>]/, 'a symbol a voice cannot say'], [/\b(?:L|R|D|EX|CR|N3|S4)-\d+/, 'an id'], [/\b[PGFA]\d{1,2}\b/, 'an id'], [/(^|\s)[xg]:/i, 'an id'], [/\b[\w-]+\.(?:py|mjs|js|json|md|html|tsx?|css)\b/i, 'a file name'],
  [/\bundefined\b|\bNaN\b/, 'a missing value'], [/\b(?:he|him|his|himself)\b/i, 'he · him · his']];
const SPK = need(W, 'spoken', '');
const say = SEC_ORDER.map((k) => {
  const sents = SPK[k] || die('words.spoken has no ' + k), title = need(need(UI.sec, k, 'sec'), 'title', 'sec.' + k);
  const text = sents.map((x, i) => fill(x, T, 'spoken.' + k + '[' + i + ']')).join(' ').replace(/\s+/g, ' ').trim();
  for (const [rx, what] of SAY_BAD) { const m = rx.exec(text); if (m) die(`the spoken summary of ${k} holds ${what}: “${m[0]}” in “${text.slice(Math.max(0, m.index - 30), m.index + 30)}”`); }
  const n = (text.match(/[^.!?]+[.!?]+(?:\s|$)/g) || []).length; if (n < 3 || n > 6) die(`the spoken summary of ${k} has ${n} sentences; it is 3 to 6`);
  if (text.split(/(?<=[.!?])\s+/).some((x) => !/[.!?]$/.test(x))) die(`the spoken summary of ${k} has a sentence that does not end`);
  return { key: k, id: 'sec-' + k, title, text }; });
for (const k of Object.keys(SPK)) if (k[0] !== '_' && !SEC_ORDER.includes(k)) die('words.spoken names a section the page does not draw: ' + k);
/* D-075: his pasted voice pick is the default reading voice — the same file the voice lab reads (voices/voice.ruled.json) */
const VOICE = (({ _about, ruled, ...v }) => v)(rj(path.join(HERE, 'voices', 'voice.ruled.json')));
const DATA = { ep: EP, app: T.app, voice: VOICE, feedHead: T.feedHead, workHead, ui: UI, glance, calls, proposals, items: itemCards, itemNames: Object.fromEntries(items.map((it) => [it.id, it.name])), questions, gap, audit, patterns, remaining, choices, say, icons: IC.marks, patIcon: IC.pattern };
/* the page speaks to you (L17): no he · him · his in anything drawn — his own quoted words aside, and an option's key is not drawn */
{ const SKIP = new Set(['f', 'v', 'mine', 'pick', 'ruled', 'outcome', 'words', 'first', 'rest', 'readAs', 'q', 'icons', 'patIcon']); const hits = [];
  const walk = (o, at) => { if (typeof o === 'string') { if (/\b(he|him|his|himself)\b/i.test(o)) hits.push(at + ': “' + o.slice(0, 80) + '”'); return; }
    if (Array.isArray(o)) return o.forEach((v, i) => walk(v, at + '[' + i + ']'));
    if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (SKIP.has(k)) continue; if (k === 'opts' && at.startsWith('.choices')) { v.forEach((x, i) => walk(x[1], at + '.opts[' + i + ']')); continue; } walk(v, at + '.' + k); } };
  walk(DATA, ''); if (hits.length) die('the page speaks TO you — a he · him · his left in a drawn string (' + hits.length + '):\n  ' + hits.slice(0, 8).join('\n  ')); }
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
console.log(`legibility-review.html · ${items.length} items · ${calls.length} choices (${calls.filter((c) => c.ruled).length} ruled) in ${uniq(calls.map((c) => c.where)).length} places · ${proposals.length} proposals · ${questions.length} questions · ${patterns.length} patterns (${T.nSuite} suite proposals) · ${REM.items.length} remaining · ${choices.length} choices · ${used.size} pictures · page ${pageSha} · work ${workHead} · ${html.length} bytes`);
