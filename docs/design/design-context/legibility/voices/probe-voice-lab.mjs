/* probe-voice-lab.mjs - a SMOKE probe of the voice lab (D-037 light: build, --check, this probe once). Headless Chrome has few or no
   voices, so the page runs against a MOCK speechSynthesis (page.addInitScript): three voices that arrive late, and utterances that fire
   onend after a timer. It proves: the page loads with no error (wrapped as the host does, and opened bare as a file) · the text holds
   the review page's 8 sections, found there · the voice list draws from the mock (English first, all languages on a switch, on-this-device
   or online) · a changed setting changes the copy line AND the saved key (the exact shape the review page reads) · a Piper pick writes
   its own line · play shows the frozen bar at the top after a scroll, with the page's 12px floor held · next moves the reading and scrolls
   to that section's text, lit while read · pause and resume · a chip jumps · a setting made mid-reading reaches the next utterance · stop
   hides the bar · compare reads one sentence in each ticked voice, in order · every sample file exists and plays (duration > 0) · the copy
   line has no {token}, undefined or NaN and the copy button copies it · no sideways scroll at 1920 and 390 · a browser with no speech still
   loads and says so.

     node docs/design/design-context/legibility/voices/probe-voice-lab.mjs [--html <file>] [--shots <dir>]   # browser-gated; run it ALONE
       --shots <dir>   also save two pictures at 1920 wide: the top, and the frozen bar after a scroll (for looking, never committed) */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname), REPO = path.resolve(HERE, '../../../../..');
const PW = path.join(REPO, 'docs/design/graft-adoption/spike/_build/node_modules/playwright-core'), CHROME = '/usr/bin/google-chrome-stable';
const args = process.argv.slice(2), opt = (k) => (args.indexOf(k) >= 0 ? args[args.indexOf(k) + 1] : null);
const SRC = path.resolve(opt('--html') || path.join(HERE, 'voice-lab.html')), SHOTS = opt('--shots');
if (!fs.existsSync(CHROME) || !fs.existsSync(PW)) { console.log('SKIP - no system chrome / playwright-core on this host (RENDER COVERAGE DID NOT RUN)'); process.exit(0); }
const { chromium } = require(PW);
let pass = 0, fail = 0; const ok = (c, m, extra) => { if (c) { pass++; console.log('  ok   ' + m + (extra ? ' - ' + extra : '')); } else { fail++; console.log('  FAIL ' + m + (extra ? ' - ' + extra : '')); } };

/* the review page's summaries, found in its inline data (the page under test must hold the same words) */
const REVIEW = fs.readFileSync(path.join(HERE, '../legibility-review.html'), 'utf8');
const SAY = (() => { const m = 'window.LEG_DATA = ', a = REVIEW.indexOf(m), b = REVIEW.indexOf(';</script>', a); return JSON.parse(REVIEW.slice(a + m.length, b)).say; })();
const MAN = JSON.parse(fs.readFileSync(path.join(HERE, 'samples/samples.json'), 'utf8'));

/* the mock: three voices that arrive 150 ms after load, utterances that end after window.__mockMs, a log of everything spoken */
const MOCK = () => {
  const voices = [
    { name: 'Mock Natural Voice', lang: 'en-US', localService: false, default: false, voiceURI: 'mock-1' },
    { name: 'Mock UK Voice', lang: 'en-GB', localService: true, default: true, voiceURI: 'mock-2' },
    { name: 'Mock Voix Francaise', lang: 'fr-FR', localService: true, default: false, voiceURI: 'mock-3' }];
  window.__spoken = []; window.__mockMs = 300; window.__pending = [];
  window.SpeechSynthesisUtterance = function (text) { this.text = text; this.voice = null; this.lang = ''; this.rate = 1; this.pitch = 1; this.volume = 1; };
  const listeners = []; let list = [];
  const mock = { getVoices: () => list.slice(), addEventListener: (t, f) => { if (t === 'voiceschanged') listeners.push(f); }, removeEventListener() {}, pause() {}, resume() {},
    set onvoiceschanged(f) { listeners.push(f); },
    speak(u) { window.__spoken.push({ text: u.text, voice: u.voice && u.voice.name, lang: u.lang, rate: u.rate, pitch: u.pitch, volume: u.volume });
      const t = setTimeout(() => { window.__pending = window.__pending.filter((x) => x !== t); if (u.onend) u.onend({}); }, window.__mockMs); window.__pending.push(t); },
    cancel() { window.__pending.forEach(clearTimeout); window.__pending = []; } };
  Object.defineProperty(window, 'speechSynthesis', { value: mock, configurable: true });
  setTimeout(() => { list = voices; listeners.forEach((f) => f({})); }, 150);
};
const NOSPEECH = () => { Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); delete window.SpeechSynthesisUtterance; };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'voicelab-probe-')), wrapped = path.join(tmp, 'page.html');
fs.writeFileSync(wrapped, '<!doctype html><html><head><meta charset="utf8"><base href="file://' + path.dirname(SRC) + '/"></head><body>' + fs.readFileSync(SRC, 'utf8') + '</body></html>');
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-gpu-sandbox', '--disable-dev-shm-usage'] });
/* CHANGED 2026-10-01 (D-075): the page opens on HIS pasted pick, not on my first-Natural-voice pick; the mock has no Google UK voice, so it also proves the missing-voice path */
const LINE0 = 'VOICE · engine browser · voice Google UK English Female · lang en-GB · speed 1.15 · pitch 1.0 · volume 1.0 · pause between sentences 250 ms · between sections 900 ms · section names read';
try {
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } }); await ctx.addInitScript(MOCK);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + wrapped); await p.waitForFunction('window.__vl && window.__vl.ready', { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(500);
  const line = () => p.evaluate(() => window.__vl.line), stored = () => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('gabe:voice:v1')); } catch (e) { return 'bad'; } });
  const player = () => p.evaluate(() => window.__vl.player()), spoken = () => p.evaluate(() => window.__spoken);
  const setRange = (key, v) => p.$eval(`[data-set="${key}"] input`, (el, x) => { el.value = String(x); el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  const bar = () => p.evaluate(() => { const e = document.getElementById('vbar'), r = e.getBoundingClientRect(); return { hidden: e.hidden, shown: r.height > 0, top: Math.round(r.top), pos: getComputedStyle(e).position, h: Math.round(r.height) }; });
  ok(errs.length === 0, 'the page loads with no page error', errs.slice(0, 2).join(' | '));

  /* the text: the review page's summaries, each headed by its section name */
  { const secs = await p.evaluate(() => window.__vl.sections()), box = await p.$eval('#vt-box', (e) => e.value), titles = await p.$$eval('.vt-h', (n) => n.map((x) => x.textContent));
    ok(secs.length === 8 && SAY.length === 8, 'the text holds 8 sections, as the review page does', secs.length + ' sections · review ' + SAY.length);
    ok(titles.join('|') === SAY.map((s) => s.title).join('|'), 'each section is headed by the review page\'s own section name', titles.join(' / '));
    ok(SAY.every((s) => box.includes(s.title) && box.includes(s.text)) && secs.every((s) => s.n >= 3), 'the box opens on every summary in full, each split into sentences', secs.map((s) => s.n).join(','));
    ok(await p.$$eval('#sec-text .js-read', (n) => n.length) === 1 && (await p.$eval('#sec-text .n', (e) => e.textContent)).includes('8 sections'), 'the section count shows beside the title', await p.$eval('#sec-text .n', (e) => e.textContent)); }

  /* the voice list draws from the mock, English first */
  { const en = await p.$$eval('.vc', (n) => n.map((x) => x.getAttribute('data-voice')));
    ok(en.join('|') === 'Mock UK Voice|Mock Natural Voice', 'the list draws from the voices the browser offers, English first and English only by default', en.join(', '));
    await p.click('[data-lang="all"]'); const all = await p.$$eval('.vc', (n) => n.map((x) => x.getAttribute('data-voice')));
    ok(all.length === 3 && all[2] === 'Mock Voix Francaise', 'the all-languages switch adds the other languages after English', all.join(', '));
    const dev = await p.$$eval('.vc', (n) => n.map((x) => x.querySelector('.chip:nth-child(2)').textContent.trim()));
    ok(dev.join('|') === 'on this device|online|on this device', 'each card says on this device or online (localService)', dev.join(', '));
    ok(await p.$$eval('.vc [data-sample]', (n) => n.length) === 3 && await p.$$eval('.vc [data-use]', (n) => n.length) === 3, 'each card has a sample button and a use button');
    await p.click('[data-lang="en"]'); }

  /* untouched: my pick, dashed, the default line, nothing saved */
  { const l = await line();
    ok(l.startsWith(LINE0) && l.includes('yours: voice, speed, pitch, pause between sentences') && l.includes('still my pick: volume, pause between sections, section names'), 'untouched, the line is his pick (D-075): his four values yours, the other three my pick', l);
    ok((await stored()) === null, 'nothing is saved until you change a value');
    ok(await p.$eval('.vc[data-voice="Mock Natural Voice"] [data-use]', (e) => e.getAttribute('data-mine') === 'true'), 'his voice is missing here, so the voice reading for it is drawn dashed, a stand-in');
    ok(await p.$eval('#vmiss', (e) => !e.hidden && e.textContent.includes('Google UK English Female') && e.textContent.includes('Mock Natural Voice')), 'a note says his voice is not offered here and which voice reads for it');
    if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: path.join(SHOTS, 'voice-lab-top-1920.png') }); } }

  /* a changed setting changes the line and the saved key, in the exact shape */
  { await setRange('rate', 1.5); await setRange('pauseSentence', 50); await setRange('pauseSection', 100);
    const l = await line(), s = await stored();
    ok(l.includes('speed 1.5') && l.includes('pause between sentences 50 ms') && l.includes('between sections 100 ms') && l.includes('yours: voice, speed, pitch, pause between sentences, pause between sections'), 'changing a setting changes the line and names it as yours', l.slice(l.indexOf('speed')));
    ok(JSON.stringify(Object.keys(s)) === JSON.stringify(['engine', 'voice', 'lang', 'rate', 'pitch', 'volume', 'pauseSentence', 'pauseSection', 'readTitles']) && s.engine === 'browser' && s.voice === 'Google UK English Female' && s.lang === 'en-GB' && s.rate === 1.5 && s.pauseSentence === 50 && s.pauseSection === 100 && s.readTitles === true, 'the saved key gabe:voice:v1 holds exactly the agreed shape', JSON.stringify(s));
    ok(await p.$eval('[data-set="rate"] .btn.nb', (e) => e.getAttribute('aria-pressed') === 'true' && e.textContent === 'yours') && await p.$eval('[data-set="volume"] .btn.nb', (e) => e.getAttribute('data-mine') === 'true' && e.textContent === 'my pick'), 'a value you changed turns filled (yours); one still my pick stays dashed');
    await p.reload(); await p.waitForFunction('window.__vl && window.__vl.ready', { timeout: 20000 }); await p.waitForTimeout(400);
    ok((await line()).includes('speed 1.5') && (await p.$eval('[data-set="rate"] input', (e) => e.value)) === '1.5', 'a reload keeps the pick (and which values are yours)'); }
  { await p.click('[data-lang="all"]'); await p.click('.vc[data-voice="Mock UK Voice"] [data-use]'); const l = await line(), s = await stored();
    ok(l.includes('voice Mock UK Voice') && l.includes('lang en-GB') && /yours: voice, speed/.test(l) && s.voice === 'Mock UK Voice' && s.lang === 'en-GB', 'using another voice writes it, with its language, as yours', l.slice(0, 80));
    await p.click('[data-pick="en_US-ryan-high/normal"]'); const lp = await line(), sp = await stored();
    ok(lp.startsWith('VOICE · engine piper · voice en_US-ryan-high · lang en-US · speed normal') && !lp.includes('pitch') && sp.engine === 'piper' && sp.voice === 'en_US-ryan-high' && sp.rate === 1, 'a Piper pick writes its own line and saved shape', lp.slice(0, 110));
    await p.click('[data-pick="en_GB-alan-medium/slower"]'); const sl = await stored();
    ok(sl.voice === 'en_GB-alan-medium' && sl.lang === 'en-GB' && sl.rate === 0.8, 'a slower Piper speed saves as a rate below 1', JSON.stringify(sl));
    await p.click('.vc[data-voice="Mock Natural Voice"] [data-use]'); await p.click('[data-lang="en"]'); }

  /* play: the frozen bar after a scroll */
  await p.evaluate(() => { window.__mockMs = 2000; });
  await p.evaluate(() => window.scrollTo(0, 1500)); const y0 = await p.evaluate(() => window.scrollY);
  ok((await bar()).hidden === false, 'before anything is read the bar is in view (D-076: all the time is his default)');   /* CHANGED 2026-10-01 (D-076) */
  await p.evaluate(() => document.querySelector('#sec-browser .js-read').click()); await p.waitForTimeout(250);
  { const bb = await bar(), y1 = await p.evaluate(() => window.scrollY), sp = await spoken();
    ok(bb.shown && bb.top === 0 && bb.pos === 'fixed' && y1 > 1000, 'play shows the bar fixed at the top, after a scroll', `top ${bb.top} · ${bb.pos} · scrollY ${y1}`);
    ok(Math.abs(y1 - y0) < 4, 'a play button never moves the page', `${y0} -> ${y1}`);
    ok(sp.length === 1 && sp[0].text === SAY[0].title + '.' && sp[0].voice === 'Mock Natural Voice' && sp[0].rate === 1.5, 'it reads the section name first, in the chosen voice at the chosen speed', JSON.stringify(sp[0]));
    ok(await p.$eval('#vb-chips', (n) => n.children.length) === 8 && await p.$eval('.vb-chips .chip[data-on="true"]', (e) => e.getAttribute('data-i')) === '0', 'the bar holds a chip per section, the one being read lit', 'chip 0 lit');
    ok(await p.$eval('#vt-sec-0', (e) => e.getAttribute('data-on')) === 'true' && await p.$eval('#vt-h-0', (e) => e.getAttribute('data-on')) === 'true', 'the section being read is highlighted on the page');
    /* the 12px floor, with the bar and every control showing */
    const small = await p.evaluate(() => { const bad = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) { const t = n.nodeValue.trim(); if (!t) continue; const e = n.parentElement; if (!e || /^(SCRIPT|STYLE|TITLE|OPTION)$/.test(e.tagName)) continue;
        const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
        if (parseFloat(cs.fontSize) < 12) bad.push(e.tagName + ':' + parseFloat(cs.fontSize).toFixed(1) + ':' + t.slice(0, 20)); } return bad; });
    ok(small.length === 0, 'no text under 12px, the bar included', small.slice(0, 3).join(' | ')); }
  /* next: the reading moves and the page scrolls there */
  { await p.click('#vb-next'); await p.waitForTimeout(250);
    const pl = await player(), top = await p.$eval('#vt-sec-1', (e) => Math.round(e.getBoundingClientRect().top)), sp = await spoken(), bb = await bar();
    ok(pl.sec === 1 && pl.mode === 'read', 'next moves the reading to the next section', JSON.stringify(pl));
    ok(top >= 0 && top <= 140 && bb.top === 0 && bb.shown, 'and takes the page to that section\'s text, the bar still at the top', `section top ${top}px`);
    ok(sp[sp.length - 1].text === SAY[1].title + '.' && await p.$eval('#vt-sec-1', (e) => e.getAttribute('data-on')) === 'true' && await p.$eval('.vb-chips .chip[data-on="true"]', (e) => e.getAttribute('data-i')) === '1', 'the new section is read from its name and lit in the text and on its chip', sp[sp.length - 1].text);
    await p.click('#vb-play'); await p.waitForTimeout(100); const n1 = (await spoken()).length; await p.waitForTimeout(500);
    ok((await player()).paused === true && (await spoken()).length === n1, 'pause holds the reading', 'paused, nothing more spoken');
    await p.click('#vb-play'); await p.waitForTimeout(250); const sp2 = await spoken();
    ok((await player()).paused === false && sp2.length === n1 + 1 && sp2[sp2.length - 1].text === sp2[n1 - 1].text, 'resume reads the same sentence again', sp2[sp2.length - 1].text.slice(0, 40));
    await p.click('#vb-prev'); await p.waitForTimeout(150); ok((await player()).sec === 0, 'previous goes back a section');
    await p.click('.vb-chips .chip[data-i="3"]'); await p.waitForTimeout(250);
    const t3 = await p.$eval('#vt-sec-3', (e) => Math.round(e.getBoundingClientRect().top));
    ok((await player()).sec === 3 && t3 >= 0 && t3 <= 140, 'a chip jumps to its section and scrolls there', `section 3 top ${t3}px`);
    await setRange('pitch', 1.3); await p.click('#vb-next'); await p.waitForTimeout(250); const sp3 = await spoken();
    ok(sp3[sp3.length - 1].pitch === 1.3 && sp3[sp3.length - 1].rate === 1.5, 'a setting made while reading reaches the next utterance', 'pitch ' + sp3[sp3.length - 1].pitch);
    await p.click('#vb-fast'); ok((await p.$eval('#vb-rate', (e) => e.textContent)) === '1.6' && (await stored()).rate === 1.6, 'the bar\'s speed buttons change the speed and save it', 'speed 1.6'); }
  /* the picture with the frozen bar: a reading that does not end while the picture is taken */
  if (SHOTS) { await p.evaluate(() => { window.__mockMs = 600000; }); await p.click('#vb-next'); await p.waitForTimeout(250); await p.evaluate(() => window.scrollBy(0, 40)); await p.waitForTimeout(100); await p.screenshot({ path: path.join(SHOTS, 'voice-lab-frozen-bar-1920.png') }); await p.evaluate(() => { window.__mockMs = 2000; }); }
  /* stop */
  { await p.click('#vb-stop'); await p.waitForTimeout(100); const bb = await bar(), lit = await p.$$eval('.vt-sec[data-on="true"], .vt-s[data-on="true"]', (n) => n.length);
    ok(bb.hidden === false && (await player()).mode === null && lit === 0, 'stop ends the reading and clears the highlight; the bar stays in view (D-076)');   /* CHANGED 2026-10-01 (D-076) */
    await p.click('[data-bar="playing"]'); await p.waitForTimeout(100);
    ok((await bar()).hidden === true, 'with "while a voice reads" picked, the bar hides when nothing is read'); await p.click('[data-bar="always"]'); await p.waitForTimeout(100); }
  /* the bar's own option */
  { await p.evaluate(() => document.querySelector('[data-bar="always"]').click()); const bb = await bar();
    ok(bb.shown && bb.top === 0, 'the always option shows the bar with nothing playing');
    await p.evaluate(() => document.querySelector('[data-bar="playing"]').click()); ok((await bar()).hidden === true, 'and the default hides it again'); }
  /* compare: one sentence through each ticked voice, in order */
  { await p.evaluate(() => { window.__mockMs = 120; window.__spoken.length = 0; });
    await p.click('[data-lang="all"]'); for (const n of ['Mock Natural Voice', 'Mock UK Voice']) await p.check(`.vc[data-voice="${n}"] .tick input`);
    const label = await p.$eval('#cmp-go', (e) => e.textContent); await p.click('#cmp-go'); await p.waitForTimeout(1200); const sp = await spoken();
    ok(/Compare 2 voices/.test(label) && sp.length === 2 && sp[0].voice === 'Mock Natural Voice' && sp[1].voice === 'Mock UK Voice' && sp[0].text === sp[1].text && sp[0].text === SAY[0].text.split(/(?<=[.!?])\s+/)[0], 'compare reads the chosen sentence in each ticked voice, one after another', sp.map((x) => x.voice).join(' then '));
    await p.evaluate(() => { window.__spoken.length = 0; }); await p.click('.vc[data-voice="Mock UK Voice"] [data-sample]'); await p.waitForTimeout(250);
    ok((await spoken()).length === 1 && (await spoken())[0].voice === 'Mock UK Voice', 'a card\'s sample button reads a short line in that voice'); }
  /* the samples: every file exists and plays */
  { const files = MAN.voices.flatMap((v) => v.speeds.map((s) => s.file));
    ok(files.length === 15 && files.every((f) => fs.existsSync(path.join(HERE, 'samples', f))), 'every sample file exists beside the page', files.length + ' files');
    const srcs = await p.$$eval('audio', (n) => n.map((a) => a.getAttribute('src')));
    ok(srcs.length === 15 && srcs.every((s) => /^samples\/[\w.-]+\.mp3$/.test(s)) && files.every((f) => srcs.includes('samples/' + f)), 'one player per sample, on a relative path samples/<name>.mp3', srcs.length + ' players');
    const durs = await p.evaluate((fs_) => Promise.all(fs_.map((f) => new Promise((res) => { const a = new Audio('samples/' + f); const t = setTimeout(() => res(0), 8000); a.addEventListener('loadedmetadata', () => { clearTimeout(t); res(a.duration); }); a.addEventListener('error', () => { clearTimeout(t); res(-1); }); a.load(); }))), files);
    ok(durs.every((d) => d > 5), 'every sample plays: its duration is read', 'shortest ' + Math.min(...durs).toFixed(1) + ' s · longest ' + Math.max(...durs).toFixed(1) + ' s');
    ok(MAN.voices.every((v) => v.speeds.length === 3 && v.speeds.every((s) => Math.abs(s.seconds - durs[files.indexOf(s.file)]) < 1.5)), 'each recorded length matches what the browser reads', ''); }
  /* the copy line and its button */
  { await p.click('#pk-copy'); await p.waitForTimeout(150); const l = await line(), last = await p.evaluate(() => window.__vl.lastCopy), shown = await p.$eval('#pk-line', (e) => e.value);
    ok(last === l && shown === l, 'the copy button copies the line shown', l.slice(0, 60) + '...');
    ok(!/[{}]|undefined|NaN|null/.test(l) && !/[{}]|undefined|NaN/.test(await p.evaluate(() => document.body.innerText)), 'no {token}, undefined or NaN in the line or on the page');
    ok(/^VOICE · engine (browser|piper) · voice \S.* · lang [a-z]{2}-[A-Z]{2} · speed \S+/.test(l) && /yours: .+ · still my pick: .+$/.test(l), 'the line follows the agreed format and marks what is yours and what is still my pick'); }
  /* the page reflows */
  { for (const w of [1920, 390]) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(150);
      const sw = await p.evaluate(() => ({ s: document.documentElement.scrollWidth, w: window.innerWidth }));
      ok(sw.s <= sw.w + 1, `no sideways scroll at ${w}px`, `${sw.s} of ${sw.w}`); }
    await p.setViewportSize({ width: 1920, height: 1080 }); }
  /* opened bare as a file (no host wrapper), and in a browser with no speech */
  { const q = await ctx.newPage(); const e2 = []; q.on('pageerror', (e) => e2.push(e.message)); await q.goto('file://' + SRC); await q.waitForFunction('window.__vl && window.__vl.ready', { timeout: 20000 }).catch(() => {}); await q.waitForTimeout(400);
    ok(e2.length === 0 && await q.$$eval('.vt-sec', (n) => n.length) === 8 && await q.$$eval('audio', (n) => n.length) === 15, 'opened bare as a file the page loads, with its text and players', e2.join('|')); await q.close();
    const c2 = await b.newContext({ viewport: { width: 1920, height: 1080 } }); await c2.addInitScript(NOSPEECH); const r = await c2.newPage(); const e3 = []; r.on('pageerror', (e) => e3.push(e.message));
    await r.goto('file://' + wrapped); await r.waitForFunction('window.__vl && window.__vl.ready', { timeout: 20000 }).catch(() => {}); await r.waitForTimeout(300);
    ok(e3.length === 0 && await r.$eval('#vt-nospeech', (e) => !e.hidden) && await r.$$eval('.js-read', (n) => n.every((x) => x.hidden)) && (await r.evaluate(() => window.__vl.line)).startsWith('VOICE'), 'with no speech in the browser the page still loads, says so, and still writes the line', e3.join('|')); await c2.close(); }
} finally { await b.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
