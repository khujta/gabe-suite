/* gabe-artifact · read-aloud gate
 *
 * Proves a page that has sections also reads them aloud before it is published: every section opens with a spoken summary that a voice can
 * say (3 to 6 plain sentences; no id, path, symbol or token left in) and a copy button; the player bar is in view at the top of the screen
 * ALL THE TIME, with its controls; a skip, a chip and a menu item each move the reading AND the page; pause and stop land on a sentence;
 * the voice chain (saved → the project's ruled voice → a British Google voice → an English Natural or Google voice → the browser's own)
 * falls back and NAMES the fallback in words; storage may throw; nothing moves by itself; nothing is under 12px; it reflows at 390px.
 *
 * Usage:  node verify-read-aloud.mjs [page.html] [--root <dir>] [--only 1,3]
 *   --only runs just those groups (1 structure + summaries + copy · 2 the bar in view · 3 the reading · 4 the voice chain · 5 where it goes
 *   wrong · 6 what it looks like); group 1's page is always opened because the others read its state. The fixture battery uses it to
 *   prove each check can fire without paying for the whole gate on every mutant.
 * The page is served over http from a root that holds read-aloud.js/.css (found by walking up from the page, or --root), so a disk page's
 * relative links work and localStorage behaves as it does on a published page. A published Artifact has the module inlined; either works.
 * speechSynthesis is MOCKED (addInitScript): an utterance ends `ms` after it starts; cancel ends it with an "interrupted" error, as Chrome does.
 * Playwright: PLAYWRIGHT_DIR=/path/to/node_modules/playwright-core (or playwright), else the suite's docsite resolver, else `playwright`.
 * Chrome: CHROME_BIN, else /usr/bin/google-chrome-stable | google-chrome | chromium when present, else Playwright's own.
 * Exit 0 = every check passed (a loud SKIP is not a failure but is not "verified"); 1 = a check failed; 2 = the gate could not run.
 *
 * FIXTURE LAW: this gate FIRES on a page without the bar (fixtures/without-bar.html) and stays SILENT on the demo; run.sh beside this file
 * proves both, plus a fixture for each class of defect.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : null; };
const ROOT_ARG = flag('--root'), ONLY_ARG = flag('--only');
const ONLY = ONLY_ARG ? new Set(ONLY_ARG.split(',').map(Number)) : null;
const target = resolve(args[0] || (existsSync(resolve(HERE, 'demo.html')) ? resolve(HERE, 'demo.html') : resolve(HERE, '../assets/read-aloud-demo.html')));
if (!existsSync(target)) { console.error('no such page: ' + target); process.exit(2); }

/* the rules, as numbers (a rule that is a proposal says so: it is the one place to change it) */
const SECTION_SENTENCES = [3, 6];   /* ruled: 3 to 6 sentences per section */
const ITEM_SENTENCES = [2, 4];      /* default — the operator said "short"; the number is a default, his to change */
const FLOOR_PX = 12, SMALLEST_BASE = 15, PHONE = { width: 390, height: 844 }, PHONE_BAR_MAX = 0.2;   /* the bar may take 20% of a phone screen: a default */
const LINT = {
  'an id or a code identifier': [/\b[A-Z]{1,4}-\d+\b/, /\b[A-Z]\d{1,3}\b/, /\b[a-z]+_[a-z0-9_]+\b/, /\b[a-z]+[A-Z][A-Za-z0-9]*\b/],
  'a path or a file name': [/\b[\w-]+\.(?:py|mjs|cjs|js|jsx|ts|tsx|json|md|html|css|ya?ml|sh|toml)\b/i, /\b[\w.-]+\/[\w.-]+/],
  'a symbol a voice cannot say': [/[·→←×|#\\“”"`<>=@^~]/],
  'a {token} or a missing value left in': [/[{}]/, /\bundefined\b|\bNaN\b|\bnull\b|\[object /i],
};
const sentencesOf = (t) => t.split(/(?<=[.!?])\s+/).filter(Boolean);
const countSentences = (t) => (t.match(/[^.!?]+[.!?]+(?:\s|$)/g) || []).length;
const dirtOf = (t) => Object.entries(LINT).flatMap(([what, rxs]) => rxs.filter((rx) => rx.test(t)).map((rx) => `${what}: “${(t.match(rx) || [''])[0]}”`));
const bare = (t) => t.replace(/[.!?]+$/, '');

/* ── Playwright + Chrome ── */
let chromium;
for (const f of [
  async () => { if (!process.env.PLAYWRIGHT_DIR) return null; const m = await import(process.env.PLAYWRIGHT_DIR + '/index.js'); return (m.default || m).chromium; },
  async () => (await import('../../gabe-docsite/tools/_playwright.mjs')).chromium,
  async () => (await import('playwright')).chromium,
]) { try { chromium = await f(); if (chromium) break; } catch { /* next */ } }
if (!chromium) { console.error('Playwright not found — set PLAYWRIGHT_DIR=/path/to/node_modules/playwright-core (or playwright) and retry.'); process.exit(2); }
const CHROME = [process.env.CHROME_BIN, '/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));

/* ── a static server rooted where read-aloud.js is ── */
let ROOT = ROOT_ARG ? resolve(ROOT_ARG) : null;
if (!ROOT) { let d = dirname(target); for (let i = 0; i < 4 && !ROOT; i++, d = dirname(d)) if (existsSync(join(d, 'read-aloud.js'))) ROOT = d; ROOT = ROOT || dirname(target); }
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  try { const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[/\\]+/, ''), f = join(ROOT, p);
    if (!f.startsWith(ROOT + sep) && f !== ROOT) throw new Error('outside root');
    const body = await readFile(f); res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404); res.end('not found'); } });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const PAGE_URL = ORIGIN + '/' + target.slice(ROOT.length + 1).split(sep).join('/');

const results = []; let skipped = 0;
const check = (name, ok, detail) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`); };
const skip = (name, why) => { skipped++; console.log(`SKIP  ${name} — ${why} (nothing to verify is not the same as verified)`); };
/* a group runs when asked for; a group that throws is a FAIL, never a crash that hides every later group */
const group = async (n, label, fn) => { if (ONLY && !ONLY.has(n)) return; try { await fn(); } catch (e) { check(`group ${n} (${label}) runs to the end`, false, String(e.message).split('\n')[0]); } };

const browser = await chromium.launch({ ...(CHROME ? { executablePath: CHROME } : {}), args: ['--no-sandbox', '--disable-gpu-sandbox', '--disable-dev-shm-usage'] });

/* the mock: a speechSynthesis with the given voices; an utterance ends `ms` after it starts; cancel ends it as Chrome does */
function mock({ ms, voices, saved, speech, throwStorage }) {
  window.__ss = { said: [], cancels: 0, ms, voices };
  if (throwStorage) { const boom = () => { throw new Error('storage blocked'); }; Object.defineProperty(window, 'localStorage', { configurable: true, get: boom }); }
  else if (saved) { try { localStorage.setItem('gabe:voice:v1', JSON.stringify(saved)); } catch (e) { /* none */ } }
  if (!speech) { Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined }); Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: undefined }); return; }
  window.SpeechSynthesisUtterance = function (text) { this.text = text; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null; this.lang = ''; };
  let cur = null;
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => window.__ss.voices, addEventListener() {},
    cancel() { window.__ss.cancels++; if (cur) { const c = cur; cur = null; clearTimeout(c.tm); setTimeout(() => c.u.onerror && c.u.onerror({ error: 'interrupted' }), 0); } },
    speak(u) { window.__ss.said.push({ text: u.text, rate: u.rate, pitch: u.pitch, volume: u.volume, voice: u.voice && u.voice.name, lang: u.lang });
      const c = { u, tm: setTimeout(() => { if (cur === c) { cur = null; u.onend && u.onend({}); } }, window.__ss.ms) }; cur = c; } } });
}
const V = (name, lang) => ({ name, lang });
const FAST = { pauseSentence: 5, pauseSection: 20 };   /* a saved setting with no voice in it: the ruled voice still reads, the pauses are short for the test */

async function open(opts = {}) {
  const o = { w: 1280, h: 800, ms: 40, voices: [V('Mock Two', 'en-US')], saved: FAST, speech: true, throwStorage: false, ...opts };
  const ctx = await browser.newContext({ viewport: { width: o.w, height: o.h } }), page = await ctx.newPage(), errs = [];
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN }).catch(() => {});
  page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  await page.addInitScript(mock, o); await page.goto(PAGE_URL, { waitUntil: 'load' }); await page.waitForTimeout(150); page.setDefaultTimeout(5000);
  return { page, ctx, errs };
}
const st = (page) => page.evaluate(() => (window.ReadAloud && window.ReadAloud.state && window.ReadAloud.state()) || null);
const said = (page) => page.evaluate(() => window.__ss.said.map((x) => x));
const until = (page, fn, arg, t = 5000) => page.waitForFunction(fn, arg, { timeout: t }).then(() => true, () => false);
const near = (top, bar) => !!bar && top !== null && top >= bar.bottom - 2 && top <= bar.bottom + 60;
/* ONE evaluate: the reading's unit, the bar's bottom and an element's top read in the same instant, so a reading that moves on cannot split them */
const snap = (page, id) => page.evaluate((i) => { const b = document.querySelector('.ra-bar').getBoundingClientRect(), e = document.getElementById(i), s = window.ReadAloud.state();
  return { i: s.i, id: s.id, top: e ? Math.round(e.getBoundingClientRect().top) : null, bottom: Math.round(b.bottom), hot: [...document.querySelectorAll('[data-ra-say]')].filter((x) => x.dataset.reading === 'true').map((x) => x.dataset.raSay), menuHidden: document.querySelector('[data-ra-menu]').hidden }; }, id);

/* ═══ the page as it stands ═══ */
const A = await open();
const sections = await A.page.evaluate(() => [...document.querySelectorAll('.artifact-page section.sec')].map((s) => s.id));
if (!sections.length) { skip('all read-aloud checks', 'the page has no .artifact-page section.sec — there is nothing to read aloud'); await browser.close(); server.close(); console.log(`\n0 checks run, ${skipped} skipped — ${target}`); process.exit(0); }
const S0 = await st(A.page);
const RNAME = (S0 && S0.ruled) || 'Google UK English Female';   /* the voice the page was built with: the mock offers it from here on (the module asks for the voice list at every sentence) */
await A.page.evaluate((v) => { window.__ss.voices = v; }, [V(RNAME, 'en-GB'), V('Mock Two', 'en-US')]);
const firstSay = (u) => (S0.ruledTitles === false ? sentencesOf(u.text)[0] : bare(u.title) + '.');   /* what a reading says first on a unit */

/* ═══ 1 · structure, summaries, copy ═══ */
await group(1, 'structure, summaries, copy', async () => {
  check('the page renders without console errors or warnings', A.errs.length === 0, A.errs.slice(0, 2).join(' | '));
  const bars = await A.page.evaluate(() => ({ n: document.querySelectorAll('nav.ra-bar').length, label: document.querySelector('nav.ra-bar')?.getAttribute('aria-label') || '' }));
  check('the read-aloud bar is on the page: one nav, named', bars.n === 1 && !!bars.label, `${bars.n} bar(s) · “${bars.label}”`);
  check('every id the page gave the module is in the page, in page order', !!S0 && S0.missing.length === 0 && S0.orderOk, S0 ? `missing ${S0.missing.join(',') || 'none'} · order ${S0.orderOk}` : 'the module is not on the page');
  const blocks = await A.page.evaluate((ids) => ids.map((id) => { const s = document.getElementById(id), b = s && s.querySelector('[data-ra-say]'), t = b && b.querySelector('[data-ra-text]'), c = b && b.querySelector('[data-ra-copy]');
    return { id, block: !!b, text: t ? t.textContent.trim() : '', copy: !!c, copyShown: !!c && c.getBoundingClientRect().height > 0 }; }), sections);
  check('every section opens with a spoken summary and a copy button', blocks.every((b) => b.block && b.text && b.copy && b.copyShown), `${blocks.filter((b) => b.block && b.text && b.copy && b.copyShown).length} of ${blocks.length} sections`);
  const spoken = await A.page.evaluate(() => [...document.querySelectorAll('[data-ra-say]')].map((b) => ({ id: b.dataset.raSay, item: b.classList.contains('ra-sub'), text: (b.querySelector('[data-ra-text]') || {}).textContent || '', plain: (b.querySelector('[data-ra-plain]') || {}).textContent || '', ex: (b.querySelector('[data-ra-example]') || {}).textContent || '', im: (b.querySelector('[data-ra-impact]') || {}).textContent || '' })));
  const secSay = spoken.filter((x) => !x.item), itemSay = spoken.filter((x) => x.item);
  const badCount = [...secSay.filter((x) => { const n = countSentences(x.text); return n < SECTION_SENTENCES[0] || n > SECTION_SENTENCES[1]; }), ...itemSay.filter((x) => { const n = countSentences(x.text); return n < ITEM_SENTENCES[0] || n > ITEM_SENTENCES[1]; }), ...itemSay.filter((x) => (x.ex && countSentences(x.ex.replace(/^\s*Example\s*/, '')) !== 1) || (x.im && countSentences(x.im.replace(/^\s*Impact\s*/, '')) !== 1))].map((x) => `${x.id} ${countSentences(x.text)}`);
  check(`a section's summary is ${SECTION_SENTENCES.join(' to ')} sentences, an item's ${ITEM_SENTENCES.join(' to ')} (its example and its impact one each), and each ends where a sentence ends`, !!spoken.length && !badCount.length && spoken.every((x) => sentencesOf(x.text).every((s) => /[.!?]$/.test(s))),
    badCount.length ? 'outside: ' + badCount.join(', ') : `${secSay.length} sections · ${itemSay.length} items`);
  const dirt = spoken.flatMap((x) => [...dirtOf(x.text), ...dirtOf(x.plain), ...dirtOf(x.ex), ...dirtOf(x.im)].map((d) => `${x.id} → ${d}`));
  for (const what of Object.keys(LINT)) { const hit = dirt.filter((d) => d.includes(' → ' + what)); check(`no summary holds ${what}`, !!spoken.length && !hit.length, hit.length ? hit.slice(0, 3).join(' | ') : `${spoken.length} summaries read`); }
  const plains = await A.page.evaluate(() => [...document.querySelectorAll('[data-ra-plain]')].map((p) => p.textContent.trim()));
  const badPlain = plains.filter((p) => sentencesOf(p).length !== 1 || (p.match(/—/g) || []).length > 1 || !/[.!?]$/.test(p));
  check('a plain line is ONE sentence with at most one dash', !badPlain.length, badPlain.length ? badPlain.slice(0, 2).join(' | ') : `${plains.length} plain lines in blocks`);
  const cont = await A.page.evaluate(() => [...document.querySelectorAll('.ra-bar .ra-tc')].map((t) => ({ chip: t.querySelector('.ra-chip')?.dataset.raChip, caret: !!t.querySelector('.ra-caret') })));
  const withItems = S0 ? S0.sections.filter((s) => s.items.length).map((s) => s.id) : [];
  check('the bar has one chip per section, a caret only where a section has items', !!S0 && cont.length === sections.length && cont.every((c) => c.caret === withItems.includes(c.chip)), `${cont.length} chips · ${cont.filter((c) => c.caret).length} with a caret of ${withItems.length} sections with items`);
  check('the bar has play/pause, stop, previous, next and a speed control', await A.page.evaluate(() => ['playpause', 'stop', 'prev', 'next'].every((a) => document.querySelector(`.ra-bar [data-act="${a}"]`)) && !!document.querySelector('.ra-bar select[data-act="rate"]')));
  const first = blocks[0] && blocks[0].id;
  if (first && blocks[0].copy) { await A.page.click(`[data-ra-copy="${first}"]`); await A.page.waitForTimeout(150);
    const clip = await A.page.evaluate(() => navigator.clipboard.readText().catch(() => null)), lc = (await st(A.page))?.lastCopy;
    check('copy puts the summary as shown on the clipboard', (clip === null ? lc : clip) === blocks[0].text, clip === null ? 'clipboard unreadable here; compared the page’s own record' : `${blocks[0].text.length} characters`); }
  else check('copy puts the summary as shown on the clipboard', false, 'no copy button');
  const hasAll = await A.page.evaluate(() => !!document.querySelector('[data-ra-copyall]'));
  if (hasAll) await A.page.click('[data-ra-copyall]'); await A.page.waitForTimeout(150);
  const clip = await A.page.evaluate(() => navigator.clipboard.readText().catch(() => null)), lc = (await st(A.page))?.lastCopy, got = clip === null ? lc : clip, want = S0 ? S0.units.map((u) => u.title + '\n' + u.text).join('\n\n') : null;
  check('copy every summary copies all of them in page order, each headed by its name', hasAll && !!want && got === want, want ? `${S0.units.length} summaries` : 'no copy-every button or no module');
});

/* ═══ 2 · the bar is in view all the time ═══ */
await group(2, 'the bar in view', async () => {
  const tall = await A.page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  check('the page is long enough to prove a scroll', tall > 400, tall + 'px of scroll');
  await A.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await A.page.waitForTimeout(150);
  const r = await A.page.evaluate(() => { const b = document.querySelector('.ra-bar'); if (!b) return null; const bx = b.getBoundingClientRect(), cs = getComputedStyle(b), hit = document.elementFromPoint(bx.left + bx.width / 2, bx.top + 4);
    return { top: Math.round(bx.top), h: Math.round(bx.height), pos: cs.position, vis: cs.visibility, hit: !!hit && b.contains(hit), on: !!((window.ReadAloud && ReadAloud.state()) || {}).on }; });
  check('scrolled to the bottom with no voice playing, the bar is still at the top and visible', !!r && r.top === 0 && r.h > 0 && r.pos === 'sticky' && r.vis !== 'hidden' && r.hit && !r.on, r ? `top ${r.top} · ${r.h}px high · ${r.pos} · covered ${!r.hit}` : 'no bar on the page');
  const fixedThings = await A.page.evaluate(() => [...document.querySelectorAll('body *')].filter((n) => getComputedStyle(n).position === 'fixed' && !n.closest('.af-chrome')).length);
  check('the cog stays the only FIXED thing on the page (the bar is sticky, in flow)', fixedThings === 0, fixedThings + ' other fixed element(s)');
});

/* ═══ 3 · the reading: a run, play, pause, resume, next, a chip, the menu, speed, stop ═══ */
await group(3, 'the reading', async () => {
  if (!S0) { check('the reading flow runs (a run · play · pause · skip · chip · menu · stop)', false, 'no module state — the bar is not on this page'); return; }
  const p = A.page;
  /* a whole run: every summary once, in page order, then it stops by itself */
  await p.evaluate(() => { window.scrollTo(0, 0); window.__ss.ms = 12; window.__ss.said.length = 0; });
  await p.click('.ra-bar [data-act="playpause"]'); const seq = []; const t0 = Date.now();
  while (Date.now() - t0 < 12000) { const s = await st(p); if (s.on && seq[seq.length - 1] !== s.i) seq.push(s.i); if (!s.on && seq.length) break; await p.waitForTimeout(8); }
  const end = await st(p), want = S0.units.map((_, i) => i);
  check('a run reads every summary once, section then its items then the next section, in page order, and stops by itself at the end', !end.on && seq.join() === want.join(), `visited ${seq.join(' ')} of ${want.length} units`);
  const log = await said(p);
  const multi = log.filter((u) => sentencesOf(u.text).length !== 1);
  check('every utterance is one sentence (or a section name): a pause, a skip and a stop each land on a sentence', log.length > 0 && !multi.length, multi.length ? `${multi.length} multi-sentence utterance(s): “${multi[0].text.slice(0, 50)}”` : `${log.length} utterances`);
  /* play from the section in view */
  await p.evaluate(() => { window.__ss.ms = 40; window.__ss.said.length = 0; });
  const si = Math.min(1, sections.length - 1), secId = S0.sections[si].id, u0 = S0.units.findIndex((u) => u.id === secId);
  await p.evaluate(([id]) => { const s = document.getElementById(id); window.scrollTo(0, s.getBoundingClientRect().top + scrollY - 140); }, [secId]); await p.waitForTimeout(120);
  await p.evaluate(() => { window.__ss.ms = 400; });   /* slow utterances: a pause 120ms after the click lands in the MIDDLE of a sentence, the case resume must repeat */
  await p.click('.ra-bar [data-act="playpause"]'); const started = await until(p, () => window.__ss.said.length >= 1);
  const s1 = await st(p), sd = await said(p);
  check('play starts the reading at the section in view, in the ruled voice at the voice’s own pace', started && s1.on && s1.i === u0 && sd[0].text === firstSay(S0.units[u0]) && sd[0].voice === S0.ruled && Math.abs(sd[0].rate - 1.15) < 0.001 && sd[0].pitch === 1 && sd[0].volume === 1,
    started ? `unit ${s1.i} (want ${u0}) · “${sd[0].text}” · ${sd[0].voice} · rate ${sd[0].rate}` : 'nothing was spoken');
  const lit = await p.evaluate(() => ({ chip: [...document.querySelectorAll('.ra-bar .ra-chip')].filter((a) => a.dataset.lit === 'true').map((a) => a.dataset.raChip), hot: [...document.querySelectorAll('[data-ra-say]')].filter((b) => b.dataset.reading === 'true').map((b) => b.dataset.raSay) }));
  check('the section being read has its chip lit and its summary marked, and no other', lit.chip.join() === secId && lit.hot.length === 1, `chip ${lit.chip.join()} · summary ${lit.hot.join()}`);
  /* pause lands on a sentence; resume says that sentence again from its first word */
  await p.click('.ra-bar [data-act="playpause"]'); await p.waitForTimeout(120); const n1 = (await said(p)).length; await p.waitForTimeout(300); const n2 = (await said(p)).length, paused = await p.evaluate(() => document.querySelector('.ra-bar [data-act="playpause"]').dataset.state);
  const lastText = (await said(p))[n2 - 1].text;
  await p.click('.ra-bar [data-act="playpause"]'); const resumed = await until(p, (n) => window.__ss.said.length > n, n2), after = await said(p);
  check('pause stops at a sentence; resume says that sentence again from its first word', n1 === n2 && paused === 'paused' && resumed && after[n2].text === lastText, `paused after ${n2} utterances · “${lastText.slice(0, 40)}” again: ${resumed && after[n2].text === lastText}`);
  /* next: the reading AND the page (utterances are slowed so the reading cannot move on between a click and its measure) */
  const nextUnit = Math.min(u0 + 1, S0.units.length - 1); await p.click('.ra-bar [data-act="next"]'); await p.waitForTimeout(150);
  const s2 = await snap(p, S0.units[nextUnit].id);
  check('next moves the reading to the next summary AND scrolls the page there, just under the bar', s2.i === nextUnit && near(s2.top, s2), `unit ${s2.i} (want ${nextUnit}) · element top ${s2.top} · bar bottom ${s2.bottom}`);
  const lastSec = S0.sections[S0.sections.length - 1].id, lastU = S0.units.findIndex((u) => u.id === lastSec);
  await p.click(`.ra-bar [data-ra-chip="${lastSec}"]`); await p.waitForTimeout(150); const s3 = await snap(p, lastSec);
  check('a section chip moves the reading to that section AND the page there', s3.i === lastU && near(s3.top, s3), `unit ${s3.i} (want ${lastU}) · section top ${s3.top}`);
  /* the menu: open, list the items with their plain lines, pick one — the reading and the page both go there */
  const mi = S0.sections.findIndex((s) => s.items.length);
  if (mi < 0) skip('the dropdown checks', 'no section on this page has items');
  else { const ms = S0.sections[mi], itemId = ms.items[Math.min(1, ms.items.length - 1)], itemU = S0.units.findIndex((u) => u.id === itemId);
    await p.evaluate(() => window.scrollTo(0, 600)); await p.click(`.ra-bar [data-ra-caret="${ms.id}"]`); await p.waitForTimeout(100);
    const mm = await p.evaluate(() => { const m = document.querySelector('[data-ra-menu]'), r = m.getBoundingClientRect();
      return { hid: m.hidden, in: r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1, ids: [...m.querySelectorAll('[data-ra-item]')].map((a) => a.dataset.raItem), plain: m.querySelectorAll('[data-ra-menu-plain]').length, expanded: document.querySelector('.ra-caret[aria-expanded="true"]') !== null }; });
    const wantPlain = ms.items.filter((id) => S0.units.find((u) => u.id === id)?.plain).length;
    check('a caret opens its section’s items, indented under it, each with its plain line, fully on screen', !mm.hid && mm.expanded && mm.in && mm.ids.join() === ms.items.join() && mm.plain === wantPlain, `${mm.ids.length} items · ${mm.plain} plain lines · on screen ${mm.in}`);
    await p.click(`.ra-menu [data-ra-item="${itemId}"]`); await p.waitForTimeout(150);
    const s4 = await snap(p, itemId), sd4 = await said(p);
    check('picking an item moves the reading to its summary AND the page to it, and closes the menu', s4.i === itemU && near(s4.top, s4) && sd4.slice(-3).some((x) => x.text === firstSay(S0.units[itemU])) && s4.hot.join() === itemId && s4.menuHidden,
      `unit ${s4.i} (want ${itemU}) · element top ${s4.top} · bar bottom ${s4.bottom} · marked ${s4.hot.join()}`);
    await p.click(`.ra-bar [data-ra-caret="${ms.id}"]`); await p.keyboard.press('Escape'); await p.waitForTimeout(60);
    const esc = await p.evaluate(() => ({ closed: document.querySelector('[data-ra-menu]').hidden, onCaret: document.activeElement?.classList.contains('ra-caret') }));
    await p.click(`.ra-bar [data-ra-caret="${ms.id}"]`); await p.mouse.click(5, 400); await p.waitForTimeout(60); const out = await p.evaluate(() => document.querySelector('[data-ra-menu]').hidden);
    check('Escape closes the menu and returns focus to its caret; a click outside closes it too', esc.closed && esc.onCaret && out, `escape closed ${esc.closed} · focus on caret ${esc.onCaret} · outside click closed ${out}`); }
  /* speed is a multiple of the voice's own rate */
  await p.selectOption('.ra-bar select[data-act="rate"]', '0'); await p.waitForTimeout(40); const nBefore = (await said(p)).length;
  await p.click('.ra-bar [data-act="next"]').catch(() => {}); await until(p, (n) => window.__ss.said.length > n, nBefore); const slow = (await said(p)).slice(-1)[0];
  check('"slower" is 0.8 of the voice’s own rate from the next sentence on (1.15 × 0.8)', !!slow && Math.abs(slow.rate - 0.92) < 0.001, slow ? 'rate ' + slow.rate : 'nothing spoken');
  /* stop ends it, and nothing more is said */
  await p.click('.ra-bar [data-act="stop"]'); await p.waitForTimeout(100); const n5 = (await said(p)).length; await p.waitForTimeout(350); const n6 = (await said(p)).length, s5 = await st(p), dis = await p.evaluate(() => document.querySelector('.ra-bar [data-act="stop"]').disabled);
  const anim = await p.evaluate(() => document.getAnimations().length);
  check('stop ends the reading: no more is said, stop is off, nothing is lit', n5 === n6 && !s5.on && dis && (await p.evaluate(() => document.querySelectorAll('[data-reading="true"], .ra-chip[data-lit="true"]').length)) === 0, `${n6 - n5} utterances after stop`);
  check('nothing moves by itself: no running animation or transition anywhere on the page', anim === 0, anim + ' running animation(s)');
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(150); const kept = await p.evaluate(() => ({ v: document.querySelector('.ra-bar select[data-act="rate"]').value, s: window.ReadAloud.state().speed }));
  check('the speed survives a reload', kept.v === '0' && kept.s === 0, `select ${kept.v} · state ${kept.s}`);
});
await A.ctx.close();

/* ═══ 4 · the voice chain: each rung, and the fallback named in words ═══ */
await group(4, 'the voice chain', async () => {
  const rungs = [
    { name: 'saved', voices: [V(RNAME, 'en-GB'), V('Mock Two', 'en-US')], saved: { ...FAST, voice: 'Mock Two', rate: 1.5 }, source: 'saved', speaks: 'Mock Two', names: ['Mock Two'] },
    { name: 'ruled', voices: [V(RNAME, 'en-GB'), V('Mock Two', 'en-US')], saved: FAST, source: 'ruled', speaks: RNAME, names: [RNAME] },
    { name: 'a British Google voice', voices: [V('Mock Natural One', 'en-US'), V('Google GB Mock', 'en-GB')], saved: FAST, source: 'british', speaks: 'Google GB Mock', names: ['Google GB Mock', RNAME] },
    { name: 'an English Natural voice', voices: [V('Mock Natural One', 'en-US'), V('Mock Two', 'en-US')], saved: FAST, source: 'english', speaks: 'Mock Natural One', names: ['Mock Natural One', RNAME] },
    { name: 'the browser’s default', voices: [V('Mock Voix', 'fr-FR')], saved: FAST, source: 'default', speaks: null, names: [RNAME] },
  ];
  for (const r of rungs) {
    const B = await open({ voices: r.voices, saved: r.saved }); const bs = await st(B.page);
    if (!bs) { check(`voice resolution — ${r.name}`, false, 'no module state'); await B.ctx.close(); continue; }
    const seen = await B.page.evaluate(() => ({ vox: document.querySelector('.ra-vox')?.dataset.source, note: (document.querySelector('[data-ra-note]') || {}).textContent || '', noteShown: !!document.querySelector('[data-ra-note]') && document.querySelector('[data-ra-note]').getBoundingClientRect().height > 0 }));
    await B.page.click('.ra-bar [data-act="playpause"]'); await until(B.page, () => window.__ss.said.length >= 1); const u = (await said(B.page))[0];
    check(`voice resolution — ${r.name}: the page uses it and says so in words`, bs.source === r.source && seen.vox === r.source && !!u && u.voice === r.speaks && seen.noteShown && r.names.every((n) => seen.note.includes(n)) && (r.name !== 'saved' || Math.abs(u.rate - 1.5) < 0.001),
      `source ${bs.source} · speaks ${u && u.voice} · “${seen.note}”`);
    await B.ctx.close();
  }
});

/* ═══ 5 · where things go wrong: storage that throws, a browser that cannot speak ═══ */
await group(5, 'where it goes wrong', async () => {
  { const B = await open({ throwStorage: true, saved: null, voices: [V(RNAME, 'en-GB')] }); const bs = await st(B.page);
    if (bs) { await B.page.click('.ra-bar [data-act="playpause"]'); await until(B.page, () => window.__ss.said.length >= 1); await B.page.selectOption('.ra-bar select[data-act="rate"]', '2').catch(() => {}); }
    check('storage that throws changes nothing: the page mounts, reads and keeps no error', !!bs && B.errs.length === 0 && (await said(B.page)).length >= 1, B.errs.slice(0, 2).join(' | ') || (bs ? 'read with storage blocked' : 'no module state')); await B.ctx.close(); }
  { const B = await open({ speech: false }), bs = await st(B.page);
    await B.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await B.page.waitForTimeout(100);
    const r = await B.page.evaluate(() => { const q = (s) => [...document.querySelectorAll(s)], shown = (n) => n.getBoundingClientRect().height > 0, bar = document.querySelector('.ra-bar'), note = document.querySelector('[data-ra-note]');
      return { player: q('.ra-player').filter(shown).length, listen: q('[data-ra-listen]').filter(shown).length, copy: q('[data-ra-copy]').filter(shown).length, barTop: bar ? Math.round(bar.getBoundingClientRect().top) : null, chips: q('.ra-chip').length, note: note ? note.textContent : '' }; });
    check('where the browser cannot speak: no player and no listen buttons, but copy, the chips and the bar stay, and the page says why', !!bs && r.player === 0 && r.listen === 0 && r.copy > 0 && r.barTop === 0 && r.chips === sections.length && r.note.length > 0 && B.errs.length === 0, `player ${r.player} · listen ${r.listen} · copy ${r.copy} · bar top ${r.barTop} · “${r.note.slice(0, 60)}”`); await B.ctx.close(); }
});

/* ═══ 6 · what it looks like: the 12px floor, no motion, the skins, a phone, the cog, the keyboard ═══ */
await group(6, 'what it looks like', async () => {
  { const B = await open({ voices: [V(RNAME, 'en-GB')] }), p = B.page, bs = await st(p);
    const mi = bs ? bs.sections.find((s) => s.items.length) : null; if (mi) await p.click(`.ra-bar [data-ra-caret="${mi.id}"]`);
    const small = await p.evaluate(([floor, base]) => { document.documentElement.style.setProperty('--af-size', base + 'px'); const out = [];
      for (const n of document.querySelectorAll('.ra-top *, .ra-bar *, .ra-say *')) { const own = [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()); if (!(own || /^(SELECT|OPTION)$/.test(n.tagName))) continue;
        const cs = getComputedStyle(n); if (cs.display === 'none') continue; const fs = parseFloat(cs.fontSize); if (fs < floor - 0.05) out.push(`${n.className || n.tagName} ${fs.toFixed(1)}px`); }
      return { out, n: document.querySelectorAll('.ra-top *, .ra-bar *, .ra-say *').length }; }, [FLOOR_PX, SMALLEST_BASE]);
    check(`nothing the bar or a summary draws is under ${FLOOR_PX}px, measured at the roster's smallest base (${SMALLEST_BASE}px)`, !!bs && small.n > 0 && small.out.length === 0, small.out.length ? small.out.slice(0, 3).join(', ') : `${small.n} elements`);
    const mo = await p.evaluate(() => { const bad = []; for (const n of document.querySelectorAll('.ra-top, .ra-top *, .ra-bar, .ra-bar *, .ra-say, .ra-say *')) { const cs = getComputedStyle(n); if (cs.animationName !== 'none' || cs.transitionDuration.split(',').some((d) => parseFloat(d) > 0)) bad.push(n.className); }
      return { bad, smooth: getComputedStyle(document.documentElement).scrollBehavior === 'smooth' }; });
    check('no animation, no transition and no smooth scroll on the bar, the summaries or the page', !!bs && mo.bad.length === 0 && !mo.smooth, mo.bad.slice(0, 3).join(',') || 'static');
    const skins = await p.evaluate(() => [...document.querySelectorAll('#af-skins .af-opt')].map((b) => b.dataset.id));
    if (!skins.length || !(await p.evaluate(() => typeof window.__setSkin === 'function'))) skip('skin checks', 'the page declares no skin roster (#af-skins) or no __setSkin');
    else { const seen = new Set(); let allMatch = true, opaque = true, why = '';
      for (const sk of skins) for (const th of ['light', 'dark']) { const r = await p.evaluate(([s, t]) => { window.__setSkin(s); document.documentElement.setAttribute('data-theme', t); const probe = document.createElement('i'); probe.style.color = 'var(--accent)'; document.body.appendChild(probe);
          const acc = getComputedStyle(probe).color; probe.remove(); const go = document.querySelector('.ra-bar .ra-go'), bar = document.querySelector('.ra-bar');
          return { acc, go: go ? getComputedStyle(go).backgroundColor : null, bar: bar ? getComputedStyle(bar).backgroundColor : null, ground: getComputedStyle(document.body).backgroundColor }; }, [sk, th]);
        seen.add(r.acc + '|' + r.bar); if (r.go !== r.acc) { allMatch = false; why = `${sk}/${th}: go ${r.go} vs accent ${r.acc}`; } if (r.bar !== r.ground) { opaque = false; why = `${sk}/${th}: bar ${r.bar} vs ground ${r.ground}`; } }
      check('the bar wears every skin, light and dark: its accent is the skin’s accent and its ground is the page’s', !!bs && allMatch && opaque && seen.size >= skins.length, why || `${skins.length} skins × 2 themes · ${seen.size} distinct looks`); }
    await B.ctx.close(); }
  { const B = await open({ w: PHONE.width, h: PHONE.height, voices: [V(RNAME, 'en-GB')] }), p = B.page, bs = await st(p);
    const mi = bs ? bs.sections.find((s) => s.items.length) : null; await p.evaluate(() => window.scrollTo(0, 900)); if (mi) await p.click(`.ra-bar [data-ra-caret="${mi.id}"]`);
    const r = await p.evaluate(() => { const bar = document.querySelector('.ra-bar'), b = bar && bar.getBoundingClientRect(), cog = document.querySelector('.af-cog')?.getBoundingClientRect(), m = document.querySelector('[data-ra-menu]');
      const hit = cog && bar ? [...bar.querySelectorAll('button, a, select')].filter((n) => { if (n.closest('[data-ra-menu]')) return false; const q = n.getBoundingClientRect(), sc = n.closest('.ra-tcs'), c = sc ? sc.getBoundingClientRect() : null,   /* the chips scroll inside their own row: what is scrolled out of it is not drawn */
          l = c ? Math.max(q.left, c.left) : q.left, rr = c ? Math.min(q.right, c.right) : q.right;
        return q.width > 0 && rr > l && !(rr <= cog.left || l >= cog.right || q.bottom <= cog.top || q.top >= cog.bottom); }).length : -1;
      const mr = m && !m.hidden ? m.getBoundingClientRect() : null;
      return { side: document.documentElement.scrollWidth - innerWidth, h: b ? Math.round(b.height) : 0, top: b ? Math.round(b.top) : null, cogHit: hit, menuIn: mr ? mr.left >= 0 && mr.right <= innerWidth + 1 : null }; });
    check(`at ${PHONE.width}px the page does not scroll sideways, the bar is at the top, within ${Math.round(PHONE_BAR_MAX * 100)}% of the screen, and the open menu fits`, !!bs && r.side <= 1 && r.top === 0 && r.h > 0 && r.h <= PHONE.height * PHONE_BAR_MAX && r.menuIn !== false, `sideways ${r.side}px · bar ${r.h}px of ${PHONE.height} · menu inside ${r.menuIn}`);
    check('the cog is clear of every control in the bar at a phone’s width', !!bs && r.cogHit === 0, r.cogHit + ' control(s) under the cog'); await B.ctx.close(); }
  { const B = await open({ voices: [V(RNAME, 'en-GB')] }), p = B.page, bs = await st(p); let focused = null, ring = null;
    for (let i = 0; i < 40 && bs; i++) { await p.keyboard.press('Tab'); focused = await p.evaluate(() => document.activeElement?.dataset?.act || ''); if (focused === 'playpause') { ring = await p.evaluate(() => { const cs = getComputedStyle(document.activeElement); return { style: cs.outlineStyle, w: parseFloat(cs.outlineWidth) }; }); break; } }
    if (ring) { await p.keyboard.press('Enter'); await until(p, () => window.__ss.said.length >= 1); }
    check('the keyboard reaches play with a visible focus ring, and Enter starts the reading', !!ring && ring.style !== 'none' && ring.w >= 2 && !!(await st(p))?.on, ring ? `${ring.style} ${ring.w}px` : 'play was not reached by Tab'); await B.ctx.close(); }
});

await browser.close(); server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed${skipped ? `, ${skipped} skipped` : ''} — ${target}`);
process.exit(failed.length ? 1 : 0);
