#!/usr/bin/env node
/* gen-voice-lab.mjs - builds the voice lab (D-073, D-074): one page that reads a text in many voices, with every setting tunable and one
   copy button that writes his pick as a line to paste back. A GENERATED page: every sentence it draws is in voice-lab.words.json (a number
   there is a {token} this generator fills), the text it opens on is READ from the review page's spoken summaries, and the local samples are
   the ones render-samples.py made.

     node docs/design/design-context/legibility/voices/gen-voice-lab.mjs               # writes voice-lab.html
     node docs/design/design-context/legibility/voices/gen-voice-lab.mjs --check       # exit 1 when the page is stale
     node docs/design/design-context/legibility/voices/gen-voice-lab.mjs --publish <dir>
         # writes <dir>/voice-lab.html and copies the mp3s into <dir>/samples/ (for a later Artifact publish; <dir> is never committed)

   READS   ../legibility-review.html (its window.LEG_DATA.say: the 8 spoken summaries - found there, never typed) ·
           voice-lab.words.json · voice-lab.tpl.html · samples/samples.json (what render-samples.py made) and the mp3s beside it ·
           the gabe-artifact kit (../../kit-blocks.js)
   WRITES  voice-lab.html (relative paths only: he opens pages from Windows Chrome; the page fetches nothing at run time, its data is inline)
   The page keeps his pick in localStorage "gabe:voice:v1" (the shape the review page reads); see the template.
   --check also NOTES (exit stays 0) when the samples were made from other words than the review page's first summary now holds.
   No wallclock: same inputs, same bytes. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url)), LEG = path.resolve(HERE, '..'), DC = path.resolve(LEG, '..'), ROOT = path.resolve(DC, '../../..');
const OUT = path.join(HERE, 'voice-lab.html'), SAMPLES = path.join(HERE, 'samples');
const die = (m) => { console.error('gen-voice-lab: ' + m); process.exit(2); };
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; if (i + 1 >= args.length) die(k + ' needs a value'); return args[i + 1]; };
const CHECK = args.includes('--check'), PUBLISH = opt('--publish', null);
const rd = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch (e) { die('cannot read ' + path.relative(ROOT, f)); } };
const rj = (f) => { try { return JSON.parse(rd(f)); } catch (e) { die('not JSON: ' + path.relative(ROOT, f) + ' - ' + e.message); } };
const sha10 = (s) => crypto.createHash('sha1').update(s, 'utf8').digest('hex').slice(0, 10);

/* ── 1 · the words, swept (the review generator's house rule, ported) ─────────────────────────────────────────────────
   A fact is generated, never typed: a number inside an authored sentence is a {token} this generator fills, a number spelled as a word
   too, and a JSON number in the words file is refused outright. Exemptions: a {token} or {{token}} · a decision id (D-073) · "one" (the
   article or pronoun). The agent's own strings never say "door" or "lock" (D-018), and the page speaks TO you: no he · him · his. */
const W = rj(path.join(HERE, 'voice-lab.words.json'));
const NUMWORD = /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|dozen)\b/i;
const BANNED = /\b(door|doors|lock|locks)\b/i, HIM = /\b(he|him|his|himself)\b/i;
const scrub = (s) => String(s).replace(/\{\{?[a-z]\w*\}?\}/gi, ' ').replace(/\bD-\d+\b/g, ' ');
(function sweep(o, at) {
  if (typeof o === 'number') die(`a typed number in the words file - make it a {token} the generator fills · ${at}: ${o}`);
  if (typeof o === 'string') {
    if (BANNED.test(o)) die(`a word D-018 took out of every string the pages draw · ${at}: "${o.slice(0, 90)}"`);
    if (HIM.test(o)) die(`the page speaks TO you - a he · him · his in ${at}: "${o.slice(0, 90)}"`);
    const s = scrub(o), m = s.match(/\d/) || s.match(NUMWORD);
    if (m) die(`a typed number in an authored line - make it a {token} the generator fills · ${at}: "${o.slice(0, 90)}" (found "${m[0]}")`);
    return;
  }
  if (Array.isArray(o)) return o.forEach((v, i) => sweep(v, at + '[' + i + ']'));
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (k[0] !== '_') sweep(v, at + '.' + k);
})(W, '');

/* ── 2 · the text: the review page's spoken summaries, found in its inline data ─────────────────────────────────────── */
const REVIEW = rd(path.join(LEG, 'legibility-review.html'));
const SAY = (() => {
  const mark = 'window.LEG_DATA = ', a = REVIEW.indexOf(mark), b = REVIEW.indexOf(';</script>', a);
  if (a < 0 || b < 0) die('the review page no longer carries window.LEG_DATA');
  let d; try { d = JSON.parse(REVIEW.slice(a + mark.length, b)); } catch (e) { die('the review page data is not JSON: ' + e.message); }
  if (!Array.isArray(d.say) || !d.say.length) die('the review page holds no spoken summaries (LEG_DATA.say)');
  for (const s of d.say) if (!s.title || !s.text) die('a spoken summary with no title or text: ' + JSON.stringify(s).slice(0, 80));
  return d.say.map((s) => ({ key: s.key, title: s.title, text: s.text }));
})();
const TEXT = SAY.map((s) => s.title + '\n' + s.text).join('\n\n');

/* ── 3 · the local samples ─────────────────────────────────────────────────────────────────────────────────────────── */
const MAN = rj(path.join(SAMPLES, 'samples.json'));
if (!MAN.voices || !MAN.voices.length) die('samples/samples.json holds no voices - run render-samples.py');
const SAMPLE_TEXT = MAN.text.title.replace(/\.+$/, '') + '. ' + MAN.text.body;
const piperVoices = MAN.voices.map((v) => {
  if (!W.local.voice[v.id]) die('words.local.voice has no name for ' + v.id);
  if (!W.local.accent[v.lang]) die('words.local.accent has no phrase for ' + v.lang);
  if (!W.local.quality[v.quality]) die('words.local.quality has no phrase for ' + v.quality);
  for (const s of v.speeds) {
    if (!W.local.speed[s.id]) die('words.local.speed has no word for ' + s.id);
    if (!fs.existsSync(path.join(SAMPLES, s.file))) die('a sample file is missing: samples/' + s.file + ' - run render-samples.py');
  }
  return { id: v.id, lang: v.lang, quality: v.quality, speeds: v.speeds.map((s) => ({ id: s.id, file: s.file, bytes: s.bytes, seconds: s.seconds })) };
});
/* a speed's rate for the saved pick: the length factor turned over (a factor of 1.25 is slower, a rate of 0.8) */
const PIPER_RATE = {};
for (const v of MAN.voices) for (const s of v.speeds) { const r = Math.round(100 / s.factor) / 100; if (PIPER_RATE[s.id] !== undefined && PIPER_RATE[s.id] !== r) die('a speed word with two factors: ' + s.id); PIPER_RATE[s.id] = r; }
const nSpeeds = Object.keys(PIPER_RATE).length;

/* ── 4 · the facts the words need, and the page's defaults (my picks, drawn dashed - D-025.2) ──────────────────────────── */
const DEFAULTS = { engine: 'browser', voice: 'auto', lang: 'en-US', rate: 1, pitch: 1, volume: 1, pauseSentence: 250, pauseSection: 900, readTitles: true };
const RANGES = { rate: [0.5, 2, 0.05], pitch: [0, 2, 0.1], volume: [0, 1, 0.05], pauseSentence: [0, 2000, 50], pauseSection: [0, 3000, 50] };
const EXTERNAL = { elCredits: '10,000' };   /* ElevenLabs' free plan, as the operator was told: the one outside fact the words state */
const fmt1 = (n) => (Number.isInteger(n) ? n.toFixed(1) : String(+n.toFixed(2)));
const TOK = { nSections: SAY.length, nVoices: piperVoices.length, nSpeeds, sampleTitle: MAN.text.title, elCredits: EXTERNAL.elCredits,
  rateNormal: fmt1(DEFAULTS.rate), pitchNormal: fmt1(DEFAULTS.pitch), volFull: fmt1(RANGES.volume[1]) };
const fill = (s, at) => String(s).replace(/(?<!\{)\{(\w+)\}(?!\})/g, (m, k) => (k in TOK ? String(TOK[k]) : die(`no value for {${k}} in ${at}: "${String(s).slice(0, 80)}"`)));
const UI = (function f(o, at) {
  if (typeof o === 'string') return fill(o, at);
  if (Array.isArray(o)) return o.map((v, i) => f(v, at + '[' + i + ']'));
  const r = {}; for (const [k, v] of Object.entries(o)) if (k[0] !== '_') r[k] = f(v, at + '.' + k); return r;
})(W, 'words');

/* the template's own word paths: every data-t and data-aria must resolve to a string with no run-time token in it */
const TPL = rd(path.join(HERE, 'voice-lab.tpl.html'));
for (const m of TPL.matchAll(/data-(?:t|aria)="([\w.]+)"/g)) {
  const v = m[1].split('.').reduce((o, k) => (o ? o[k] : undefined), UI);
  if (typeof v !== 'string') die('the template names words that do not exist: ' + m[1]);
  if (v.includes('{{')) die('the template draws a run-time token before the page can fill it: ' + m[1]);
}
for (const k of ['text', 'browser', 'local', 'notyet', 'pick', 'bar']) for (const f of ['title', 'n', 'take']) if (!UI.sec[k] || !UI.sec[k][f]) die(`words.sec.${k}.${f} is missing`);
if (!/^\s*<meta charset/i.test(TPL)) die('the template must open with its charset');

/* ── 5 · the page ──────────────────────────────────────────────────────────────────────────────────────────────────── */
const ICONS = {
  play: '<polygon points="6 3 20 12 6 21 6 3"/>', pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
  stop: '<rect width="14" height="14" x="5" y="5" rx="2"/>', speaker: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>', check: '<path d="M20 6 9 17l-5-5"/>',
  skipBack: '<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" x2="5" y1="19" y2="5"/>', skipFwd: '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/>',
  wifi: '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
  monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
  reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>', minus: '<path d="M5 12h14"/>', plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
};
const DATA = { ui: UI, text: TEXT, defaults: DEFAULTS, ranges: RANGES, icons: ICONS, piper: { dir: 'samples/', rate: PIPER_RATE, voices: piperVoices, text: SAMPLE_TEXT } };
DATA.pageSha = sha10(JSON.stringify(DATA));
/* inline JSON that no encoding can break: every non-ASCII character is escaped, and "<" so a "</script>" can never close the tag */
const inline = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/[\u007f-\uffff]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const { kitBlocks, withoutMotion } = require(path.join(DC, 'kit-blocks.js'));
let KIT; try { KIT = withoutMotion(kitBlocks(ROOT), ''); } catch (e) { die(e.message); }
const page = () => { let html = TPL;
  for (const [mark, val] of [['<!--__KIT1__-->', KIT.k1], ['<!--__KIT2__-->', KIT.k2.trim()], ['<!--__KIT3__-->', KIT.k3], ['/*__DATA__*/null', inline(DATA)]]) {
    if (!html.includes(mark)) die('template marker missing: ' + mark); html = html.replace(mark, () => val); }
  return html; };
const html = page();
const staleSamples = MAN.text.sha !== sha10(SAMPLE_TEXT);
if (CHECK) {
  const ok = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === html;
  console.log(ok ? 'voice-lab.html is current' : 'voice-lab.html is STALE - run gen-voice-lab.mjs');
  if (staleSamples) console.log('note: the samples were made from other words than the review page\'s first summary holds now - run render-samples.py');
  process.exit(ok ? 0 : 1);
}
if (PUBLISH) {
  const dir = path.resolve(PUBLISH);
  if (dir.startsWith(path.resolve(ROOT) + path.sep) && !dir.includes(path.sep + 'tmp')) console.warn('note: --publish writes into the repo at ' + path.relative(ROOT, dir) + ' - keep it out of a commit');
  fs.mkdirSync(path.join(dir, 'samples'), { recursive: true });
  for (const v of piperVoices) for (const s of v.speeds) fs.copyFileSync(path.join(SAMPLES, s.file), path.join(dir, 'samples', s.file));
  fs.writeFileSync(path.join(dir, 'voice-lab.html'), html);
  console.log(`published to ${dir}: voice-lab.html + ${piperVoices.length * nSpeeds} samples · page ${DATA.pageSha}`); process.exit(0);
}
fs.writeFileSync(OUT, html);
const bytes = piperVoices.reduce((a, v) => a + v.speeds.reduce((b, s) => b + s.bytes, 0), 0);
console.log(`voice-lab.html · ${SAY.length} sections of text · ${piperVoices.length} local voices x ${nSpeeds} speeds (${(bytes / 1048576).toFixed(1)} MB of mp3) · page ${DATA.pageSha} · ${html.length} bytes` + (staleSamples ? ' · NOTE: samples read other words than the review page now holds' : ''));
