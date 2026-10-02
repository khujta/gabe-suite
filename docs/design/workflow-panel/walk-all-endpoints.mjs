/* walk-all-endpoints.mjs — REAL mouse clicks only, from a cold load of all-endpoints.html through every thing a person does on it.

     node docs/design/workflow-panel/walk-all-endpoints.mjs        # writes shots/all-endpoints/*.png + walk.json · browser-gated, run it ALONE

   A click path handed to the operator comes from a walk like this one (memory: click paths from real clicks): the mouse moves to
   the control's centre and clicks, the words are read off the control, and each step is photographed with the control about to be
   clicked ringed. Nothing is selected by a script call; the page's data is READ only to know which control to look for. */
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname), REPO = path.resolve(HERE, '../../..'), OUT = process.env.WALK_OUT || path.join(HERE, 'shots/all-endpoints');   /* WALK_OUT: a trial run's pictures somewhere else */
const PW = path.join(REPO, 'docs/design/graft-adoption/spike/_build/node_modules/playwright-core'), CHROME = '/usr/bin/google-chrome-stable';
const { chromium } = require(PW);
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const W = Number(process.env.VW || 1920), H = Number(process.env.VH || 1080);
const b = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--no-sandbox', '--disable-gpu-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.join(HERE, 'all-endpoints.html')); await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 20000 });
/* D-081: the page opens on the looks he ruled; the sections before D-066 are older work, photographed on the looks they were built against (Data effects as
   one map under its row, names whole, fit narrowing the rest, fit off) — a setup, like the cleared storage; the D-066 section below starts again from the
   page's own defaults */
const BASELINE = () => { try { for (const k of Object.keys(localStorage)) if (/^gabe:allep/.test(k)) localStorage.removeItem(k);
  localStorage.setItem('gabe:allep:moments:v3', JSON.stringify({ dfx: 'one', wid: 'names', fit: 'min' })); localStorage.setItem('gabe:allep:moments:cols:v2', JSON.stringify({ fit: false })); } catch (e) {} };
await p.evaluate(BASELINE);
await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 20000 });
const wait = (ms) => p.waitForTimeout(ms), log = [], say = (k, v) => { log.push([k, v]); console.log(k + ': ' + (typeof v === 'string' ? v : JSON.stringify(v))); };
// an option is an icon square (D-034): its words are its aria-label, so a control's words are read from there first
const txt = async (sel) => p.$eval(sel, (e) => (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' '));
let n = 0;
const pic = async (name, clip) => { n++; await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + name + '.png'), ...(clip ? { clip } : {}) }); };
const ring = async (sel) => p.$eval(sel, (e) => { e.dataset.__ring = '1'; e.style.outline = '3px solid #ff2d9b'; e.style.outlineOffset = '2px'; });
const unring = async () => p.$$eval('[data-__ring]', (els) => els.forEach((e) => { e.style.outline = ''; e.style.outlineOffset = ''; delete e.dataset.__ring; }));
const step = async (name, sel, note) => {            // photograph with the target ringed, then click it with the mouse at its centre
  const el = await p.$(sel); if (!el) { say('MISSING ' + name, sel); return false; }
  await p.mouse.move(5, H - 10); await p.evaluate(() => window.hoverHide && window.hoverHide()); await wait(160);
  await el.scrollIntoViewIfNeeded();
  // the click must land on the control: scrolled under the pinned row (D-039) the mouse meets the pin instead (found 2026-09-30, the
  // info toggle of ONE ENDPOINT at y=2) — then the control is brought to the middle of the screen first
  const lands = () => el.evaluate((e) => { const r = e.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!h && (h === e || e.contains(h)); });
  if (!(await lands())) { await el.evaluate((e) => e.scrollIntoView({ block: 'center' })); await wait(150); if (!(await lands())) say('COVERED ' + name, sel); }
  await ring(sel); await wait(100);
  await pic(name);
  const box = await el.boundingBox(), label = await txt(sel);
  await unring();
  say('step ' + (n) + ' · ' + name, { click: label.slice(0, 70), at: [Math.round(box.x), Math.round(box.y)], size: [Math.round(box.width), Math.round(box.height)], note: note || null });
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await wait(400); return true; };
const rows = () => p.$$eval('#board tr.row[data-ep], #board .card[data-ep]', (els) => els.length);
// WALK_FROM=<label>: a trial run that starts at one of the later sections (d053 · bymoment · d055 · d056 · d057 · d058 · d064 · d064r ·
// d065 · d066); the parts before the first of them always run. The committed pictures come from a run with it unset
const FROM = process.env.WALK_FROM || null; let reached = !FROM;
const go = (label) => { if (!reached && label === FROM) reached = true; return reached; };
let ROUND1 = null;   // D-066 round 1: one record per step (item · option · value), written into walk.json

if (!FROM) {   // the walk's first part: the table, the rail, ONE ENDPOINT (a trial run from a later section skips it)
// [pressed] · {dashed = my pick on a rail he has not ruled} — read off the squares' aria-labels and their drawn borders
say('rails at load', await p.$$eval('.rgrp', (gs) => gs.map((g) => (g.querySelector('.rl') || {}).textContent + ': ' + [...g.querySelectorAll('.opt')].map((o) => {
  const on = o.getAttribute('aria-checked') === 'true', dash = getComputedStyle(o).borderTopStyle === 'dashed', w = o.getAttribute('aria-label');
  return (on ? '[' : '') + (dash ? '{' + w + '}' : w) + (on ? ']' : ''); }).join(' | '))));
await pic('cold-load');
// D-038: the toggle beside THE ENDPOINTS' title shows what sits above the table that is not a control, and hides it again
await step('endpoints-info-open', '#itog-board', 'the info toggle beside THE ENDPOINTS');
say('endpoints info shown', await p.$$eval('#info-board p', (ps) => ps.filter((e) => e.offsetParent).map((e) => e.textContent.slice(0, 60))));
await p.evaluate(() => window.scrollTo(0, 0)); await pic('endpoints-info-shown');
await step('endpoints-info-close', '#itog-board', 'the same toggle, again');
const railClip = async () => { const r = await (await p.$('#rail')).boundingBox(); return { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: Math.min(W - 1, r.width + 16), height: r.height + 16 }; };
await pic('the-rail', await railClip());
{ // hover one square with the real mouse: its words appear, short
  const sq = await p.$('.opt[data-rail="grp"][data-v="labels"]'), bx = await sq.boundingBox();
  await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await wait(250);
  say('hover on a square', await txt('#tip')); const rc = await railClip(); await pic('hover-a-square', { ...rc, height: rc.height + 90 });
  await p.mouse.move(5, H - 10); await wait(100); }
const headClip = async () => { const bd = await (await p.$('#board')).boundingBox(); return { x: bd.x, y: Math.max(0, bd.y), width: Math.min(1100, bd.width), height: 340 }; };
await pic('shared-header-default', await headClip());
await step('shared-marked-by-a-rule', '.opt[data-rail="slook"][data-v="rule"]', 'shared marked by: a strong rule');
await pic('shared-header-rule', await headClip());
await step('shared-marked-by-a-frame', '.opt[data-rail="slook"][data-v="box"]', 'shared marked by: a frame');
await pic('shared-header-frame', await headClip());
await step('shared-back-to-the-band', '.opt[data-rail="slook"][data-v="band"]', 'shared marked by: a tinted band');
// the same three treatments with the viewer's system in DARK mode — a setting of the viewer's machine, not a control on the page
// (the page has no light/dark switch of its own); every choice on the page is still made by a real click
const LOOKS = [['band', 'a tinted band'], ['rule', 'a strong rule'], ['box', 'a frame']];
const threeLooks = async (where, clip) => { for (const [v, w] of LOOKS) {
  if (!(await p.$eval('.opt[data-rail="slook"][data-v="' + v + '"]', (e) => e.getAttribute('aria-checked') === 'true'))) await step(where + '-pick-' + v, '.opt[data-rail="slook"][data-v="' + v + '"]', 'shared marked by: ' + w);
  await p.mouse.move(5, H - 10); await p.evaluate(() => window.hoverHide && window.hoverHide()); await wait(120);
  await pic(where + '-shared-' + v, await clip()); }
  await step(where + '-back-to-the-band', '.opt[data-rail="slook"][data-v="band"]', 'shared marked by: a tinted band'); };
await p.emulateMedia({ colorScheme: 'dark' }); await wait(200); say('viewer system theme', 'dark');
await threeLooks('dark-table', headClip);
await p.emulateMedia({ colorScheme: 'light' }); await wait(200); say('viewer system theme', 'light');
say('rows at load', await rows());
{ const bd = await p.$('#board'), bx = await bd.boundingBox(); await p.mouse.move(W / 2, 400); for (let i = 0; i < 8; i++) { await p.mouse.wheel(0, 120); await wait(40); } await wait(200);
  await pic('the-table-by-wheel'); say('board top after wheel', Math.round((await bd.boundingBox()).y)); }
// wheel INSIDE the board: its header must stay on top OF THE SCREEN while the rows move under it, even when the wheel has also
// carried the page past the board's top (the log says whether the column names were on screen when the photo was taken)
{ const bd = await p.$('#board'), bx = await bd.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, Math.min(H - 60, Math.max(60, bx.y + 300))); for (let i = 0; i < 5; i++) { await p.mouse.wheel(0, 120); await wait(40); } await wait(200);   /* D-038: the page scrolls now, so a short wheel keeps the photo inside the table */
  const hdr = await p.evaluate(() => { const h = document.querySelector('#board thead tr.ch th[data-col]'), bd = document.getElementById('board'); return { head: Math.round(h.getBoundingClientRect().top), board: Math.round(bd.getBoundingClientRect().top), scrolled: bd.scrollTop }; });
  hdr.onScreen = hdr.head >= 0 && hdr.head < 120;
  say('header while the board scrolls', hdr); await pic('header-stays-on-top'); }
await step('sort-by-tables', '#board thead th[data-col="tables"] .hd', 'the column header "tables"');
say('sorted says', await txt('#sortsays'));
await pic('sorted-by-tables');
await step('sort-again-reverses', '#board thead th[data-col="tables"] .hd', 'the same header, again');
say('sorted says', await txt('#sortsays'));
await step('back-to-path-order', '#board thead tr.ch th.idh .hd', 'the corner of the header row');
// the page to its top first: scrolled down, the table's own header tucks behind the pinned row (D-039) and a click at the board
// strip's centre lands on the pinned row instead (found 2026-09-24, the first walk after the pin)
await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
{ // the largest piece of the "refused" strip — read which one it is from the page, then click it by mouse
  const bin = await p.$$eval('#board thead th[data-col="e_refusal"] .sg', (ss) => ss.map((s) => [s.getAttribute('data-bin'), +s.getAttribute('data-n')]).sort((a, b) => b[1] - a[1])[0][0]);
  await step('light-a-strip-piece', '#board thead th[data-col="e_refusal"] .sg[data-bin="' + bin + '"]', 'the biggest piece of the "refused" strip');
  say('lit says', await txt('#litsays')); say('rows dimmed', await p.$$eval('#board tr.row[data-dim="true"]', (e) => e.length));
  await pic('rows-lit'); }
await step('clear-the-light', '#litclear', 'the clear link on the lit chip');
await step('group-by-ending-labels', '.opt[data-rail="grp"][data-v="labels"]', 'group by: ending labels');
say('groups', await p.$$eval('#board tr.grow', (gs) => gs.map((g) => (g.querySelector('.gn').textContent + ' · ' + g.querySelector('.gc').textContent).slice(0, 140))));
await pic('grouped-by-ending-labels');
await step('three-per-row', '.opt[data-rail="lay"][data-v="three"]', 'layout: 3 per row');
say('cards drawn', await rows());
await pic('three-per-row');
// the Shared block on a card, under each treatment, light then dark (the first cards, where the Shared block is the first run of cells)
const cardClip = async () => { const c = await (await p.$('#board .cards')).boundingBox(); return { x: c.x, y: Math.max(0, c.y), width: Math.min(W - c.x, c.width), height: 300 }; };
await threeLooks('cards', cardClip);
await p.emulateMedia({ colorScheme: 'dark' }); await wait(200); say('viewer system theme', 'dark');
await threeLooks('dark-cards', cardClip);
await p.emulateMedia({ colorScheme: 'light' }); await wait(200); say('viewer system theme', 'light');
// D-036: a click on a card or a row fills the ONE-ENDPOINT section below the table (no side panel) and writes ?ep= into the address
const oneClip = async () => { const b = await p.evaluate(() => { const r = document.getElementById('sec-one').getBoundingClientRect(); return { y: r.top + window.scrollY, h: r.height }; });
  return { x: 0, y: Math.max(0, b.y - 8), width: W, height: Math.min(4000, b.h + 16) }; };
const onePic = async (name) => { await p.mouse.move(5, H - 10); await p.evaluate(() => window.hoverHide && window.hoverHide()); await wait(120); n++;
  await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + name + '.png'), clip: await oneClip(), fullPage: true }); };
{ const first = await p.$eval('#board .card[data-ep]', (c) => c.getAttribute('data-ep'));
  await step('open-a-card', '#board .card[data-ep="' + first + '"] .pth', 'the first card\'s path');
  say('endpoint section', { title: await txt('#onehead h3'), address: await p.evaluate(() => window.location.search), scrolledTo: await p.evaluate(() => Math.round(document.getElementById('sec-one').getBoundingClientRect().top)) });
  await pic('one-endpoint-after-a-card'); }
await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
await step('one-per-row', '.opt[data-rail="lay"][data-v="rows"]', 'layout: one per row');
await step('group-by-entity', '.opt[data-rail="grp"][data-v="entity"]', 'group by: entity');
await step('click-a-row', '#board tr.row[data-ep="POST /setup/complete"] td.id', 'the row POST /setup/complete');
say('endpoint section', { title: await txt('#onehead h3'), address: await p.evaluate(() => window.location.search),
  columns: await p.evaluate(() => ['ocol-uni', 'ocol-gaps', 'ocol-cm'].map((id) => { const b = document.getElementById(id).getBoundingClientRect(); return [id, Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; })),
  universe: await p.$$eval('#ocol-uni .urow', (us) => us.map((u) => u.innerText.replace(/\s+/g, ' ').slice(0, 90))),
  gaps: await p.$$eval('#ocol-gaps .gap', (gs) => gs.map((g) => g.textContent)) });
await onePic('one-endpoint-three-columns');
// D-038: the face of ONE ENDPOINT is its title, the method and path, two links and the toggle; the toggle shows the rest, then hides it
await step('one-info-open', '#itog-one', 'the info toggle beside ONE ENDPOINT');
say('one endpoint info shown', await p.$$eval('#sec-one .ainfo', (xs) => xs.filter((e) => e.offsetParent).map((e) => (e.id || e.className) + ': ' + e.textContent.replace(/\s+/g, ' ').slice(0, 70))));
await onePic('one-endpoint-info-shown');
await step('one-info-close', '#itog-one', 'the same toggle, again');
{ // point at the first gap with the real mouse: the code-map pairs that hold it light up
  const g = await p.$('#ocol-gaps .gap'); await g.scrollIntoViewIfNeeded(); const bx = await g.boundingBox();
  await p.mouse.move(bx.x + 10, bx.y + bx.height / 2); await wait(250);
  say('pointing at a gap', { gap: await p.$eval('#ocol-gaps .gap', (e) => e.textContent), lit: await p.$$eval('#ocol-cm [data-lit-attr="true"] .pk', (xs) => xs.map((x) => x.textContent)), tip: await txt('#tip') });
  await pic('point-at-a-gap'); }
{ // D-040: the universe column draws the station's own card — the CONNECTIONS row photographed on its own, to set beside the
  // station's card (the picture the universe link takes below)
  const cn = await p.$('#ocol-uni .urow[data-row="CONNECTIONS"]'); await cn.scrollIntoViewIfNeeded(); await p.mouse.move(5, H - 10); await p.evaluate(() => window.hoverHide && window.hoverHide()); await wait(150);
  const pageBox = (sel) => p.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; });
  const cb = await pageBox('#ocol-uni .urow[data-row="CONNECTIONS"]'); n++;
  await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-the-universe-connections.png'), clip: { x: Math.max(0, cb.x - 12), y: Math.max(0, cb.y - 12), width: cb.width + 24, height: cb.height + 24 }, fullPage: true });
  say('the universe column\'s connections', await p.$$eval('#ocol-uni .urow[data-row="CONNECTIONS"] .connbox > .sublbl', (ss) => ss.map((s) => s.innerText.replace(/\s+/g, ' ') + ' · ' + s.nextElementSibling.querySelectorAll('.pchip').length + ' chips'))); }
{ // D-043: the code-map column wears its value chips — every verb and every catalog value a colour and/or an icon. One chip pointed
  // at with the real mouse (its words on hover, logged), then the whole column photographed, POST /setup/complete
  const rw = '#ocol-cm .pair[data-k="d:tables"] .vc[data-vv="rw"]';
  await p.$eval(rw, (e) => e.scrollIntoView({ block: 'center' })); await wait(150);
  const bx = await (await p.$(rw)).boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await wait(250);
  say('hover a value chip', { chip: await txt(rw), tip: await p.$eval('#tip', (t) => t.innerText.replace(/\s+/g, ' ')) });
  await p.mouse.move(5, H - 10); await p.evaluate(() => { window.hoverHide && window.hoverHide(); window.scrollTo(0, 0); }); await wait(150);
  say('the code map\'s chips, by family', await p.$$eval('#ocol-cm .vc', (cs) => { const o = {}; cs.filter((c) => !c.closest('.ainfo')).forEach((c) => { const f = c.getAttribute('data-vc'); o[f] = (o[f] || 0) + 1; }); return o; }));
  const cmb = await p.$eval('#ocol-cm', (e) => { const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; }); n++;
  await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-the-code-map-encoding.png'), clip: { x: Math.max(0, cmb.x - 8), y: Math.max(0, cmb.y - 8), width: cmb.width + 16, height: cmb.height + 16 }, fullPage: true }); }
{ // D-040: the gaps go both ways — the second square at the top of THE GAPS turns the list the other way, then the first turns it back
  say('gaps squares', await p.$$eval('#ocol-gaps .opt[data-gdir]', (os) => os.map((o) => (o.getAttribute('aria-checked') === 'true' ? '[' : '') + (getComputedStyle(o).borderTopStyle === 'dashed' ? '{' + o.getAttribute('aria-label') + '}' : o.getAttribute('aria-label')) + (o.getAttribute('aria-checked') === 'true' ? ']' : ''))));
  say('gaps, this way', { count: await txt('#ocol-gaps .gcount'), first: await p.$$eval('#ocol-gaps .gap', (gs) => gs.slice(0, 3).map((g) => g.textContent)) });
  await step('gaps-the-other-way', '#ocol-gaps .opt[data-gdir="uni"]', 'the second square at the top of THE GAPS: in the universe, not in the code map');
  say('gaps, the other way', { count: await txt('#ocol-gaps .gcount'), groups: await p.$$eval('#ocol-gaps .gblk[data-row]', (bs) => bs.map((bx) => bx.querySelector('.gbh').textContent + ': '
    + [...bx.querySelectorAll('.gap, .gfact')].slice(0, 3).map((x) => x.textContent.slice(0, 40)).join(' | '))) });
  { await p.mouse.move(5, H - 10); await p.evaluate(() => window.hoverHide && window.hoverHide()); await wait(120); n++;
    const gb = await p.$eval('#ocol-gaps', (e) => { const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; });
    await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-the-gaps-the-other-way.png'), clip: { x: Math.max(0, gb.x - 8), y: Math.max(0, gb.y - 8), width: gb.width + 16, height: Math.min(1800, gb.height + 16) }, fullPage: true }); }
  { // D-044: point at a gap the other way with the real mouse — the hover says WHY the gap exists (D-042's reasons) and its STATUS
    // (my proposal); a "solved elsewhere" gap names the field that holds it as a link. CHANGED 2026-09-26 (D-056 (11)): the Guards row's
    // names are held now (the handler's def text in its pair names them), so the Tests row's first name the code map lacks
    const gs = '#ocol-gaps .gfact[data-row="TESTS"]', g = await p.$(gs);
    if (g) { await g.evaluate((e) => e.scrollIntoView({ block: 'center' })); await wait(120); const bx = await g.boundingBox();
      await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await wait(300);
      say('pointing at a gap the other way', { gap: await txt(gs), status: await p.$eval('#tip', (t) => (t.querySelector('.gs') || {}).getAttribute ? t.querySelector('.gs').getAttribute('data-st') : null),
        links: await p.$$eval('#tip .elref[data-gref]', (ls) => ls.map((l) => l.textContent)), tip: await p.$eval('#tip', (t) => t.innerText.replace(/\s+/g, ' ')) });
      await pic('hover-a-gap-the-other-way'); await p.mouse.move(5, H - 10); await p.evaluate(() => window.hoverHide && window.hoverHide()); await wait(120); }
    else say('MISSING a gap the other way in the Tests row', gs); }
  await step('gaps-back-this-way', '#ocol-gaps .opt[data-gdir="cm"]', 'the first square: in the code map, not in the universe'); }
{ // D-041: click an element in the universe column and it lights in the three places — the Household chip on POST /setup/complete
  const lit = async () => p.evaluate(() => ({ chip: document.getElementById('elchip').hidden ? null : document.getElementById('elsays').textContent,
    rowsLit: document.querySelectorAll('#board tr.row[data-el="on"]').length, rowsDim: document.querySelectorAll('#board tr.row[data-el="off"]').length,
    uni: [...document.querySelectorAll('#ocol-uni .elon')].map((e) => e.textContent.trim().slice(0, 50)), cm: [...document.querySelectorAll('#ocol-cm .elon')].map((e) => e.textContent.trim().slice(0, 50)),
    uniSays: document.getElementById('el-uni').hidden ? null : document.getElementById('el-uni').textContent, cmSays: document.getElementById('el-cm').hidden ? null : document.getElementById('el-cm').textContent }));
  const topPic = async (name) => { await p.mouse.move(5, H - 10); await p.evaluate(() => { window.hoverHide && window.hoverHide(); window.scrollTo(0, 0); }); await wait(200);
    const st = await (await p.$('#status')).boundingBox(); n++; await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + name + '.png'), clip: { x: 0, y: Math.max(0, st.y - 60), width: W, height: Math.min(H - Math.max(0, st.y - 60), 820) } }); };
  // the chip is found by the key the page gave it — the first one, under reads_from; its words are read off it and logged
  await step('light-household-in-the-universe', '#ocol-uni .urow[data-row="CONNECTIONS"] .pchip[data-key="table:households"]', 'the Household chip under reads_from, in the universe column');
  say('lit: Household', await lit());
  await topPic('the-table-lit');
  await onePic('the-two-columns-lit');
  // another endpoint with the light on: the first lit row below the open one, clicked in the table
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  const other = await p.evaluate(() => [...document.querySelectorAll('#board tr.row[data-el="on"]')].map((e) => e.getAttribute('data-ep')).find((x) => x !== window.__allep.state.open));
  await step('another-endpoint-light-on', '#board tr.row[data-ep="' + other + '"] td.id', 'a lit row: ' + other);
  say('lit, another endpoint', Object.assign({ endpoint: await txt('#onehead h3') }, await lit()));
  await onePic('another-endpoint-lit');
  // a code-map element the universe card does not draw: the login check's table on POST /setup/complete
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('back-to-setup-complete', '#board tr.row[data-ep="POST /setup/complete"] td.id', 'the row POST /setup/complete');
  await step('light-users-in-the-code-map', '#ocol-cm .pair[data-k="d:gateWrites"] .pv span[data-key]', 'users, under "the login check writes", in the code map');
  say('lit: users', await lit());
  await onePic('users-not-in-the-universe');
  await step('clear-the-element-light', '#elclear', 'the clear link on the lit chip above the table');
  say('after clear', await lit());
  await topPic('the-light-put-out'); }
{ // D-042: an element the code map does not NAME says why, on the code map's top line; a reason that names a field links it —
  // pointing at the link lights that field, a click goes there and keeps it lit. Then one the code map does not carry at all.
  const why = async () => p.evaluate(() => { const s = document.getElementById('el-cm'); return { here: s.getAttribute('data-here'), line: s.textContent,
    reasons: [...s.querySelectorAll('.elwhy')].map((w) => w.getAttribute('data-why') + ': ' + [...w.querySelectorAll('b, .elat, .elref')].map((b) => b.textContent + (b.getAttribute('data-ref') ? ' → ' + b.getAttribute('data-ref') : '')).join(' | ')),
    fieldsLit: [...document.querySelectorAll('[data-elref]')].map((e) => (e.getAttribute('data-k') || e.getAttribute('data-fact') || e.getAttribute('data-gdir')) + ' · ' + e.getAttribute('data-elref')) }; });
  const center = async (sel) => { await p.$eval(sel, (e) => e.scrollIntoView({ block: 'center' })); await wait(150); };   /* clear of the pinned row at the top */
  const C1 = '#ocol-uni .urow[data-row="TESTS"] .pchip[data-key="case:C1048"]';
  await center(C1);
  await step('light-a-case-the-code-map-counts', C1, 'the C1048 chip under Tests, in the universe column');
  say('lit: C1048, the code map says', await why());
  await onePic('the-code-map-says-why');
  // the first link, pointed at with the real mouse: the field it names lights; the picture spans the line and the field
  await center('#el-cm .elref');
  const lk = await p.$('#el-cm .elref'), lb = await lk.boundingBox(), lw = await txt('#el-cm .elref');
  await p.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2); await wait(250);
  say('hover the reason link', Object.assign({ link: lw, tip: await txt('#tip') }, await why()));
  { const span = await p.evaluate(() => { const c = document.getElementById('ocol-cm').getBoundingClientRect(), a = document.getElementById('el-cm').getBoundingClientRect(),
      f = document.querySelector('[data-elref="hover"]'), fb = f ? f.getBoundingClientRect() : a;
      const top = Math.min(a.top, fb.top) + scrollY - 12, bot = Math.max(a.bottom, fb.bottom) + scrollY + 12; return { x: c.left + scrollX - 6, y: top, width: c.width + 12, height: bot - top }; });
    n++; await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-hover-the-reason-link.png'), clip: span, fullPage: true }); }
  await step('click-the-reason-link', '#el-cm .elref', 'the link "' + lw + '" in the code map\'s line');
  say('clicked the reason link', Object.assign({ fieldTop: await p.evaluate(() => { const f = document.querySelector('[data-elref="pin"]'); return f ? Math.round(f.getBoundingClientRect().top) : null; }) }, await why()));
  await p.mouse.move(5, H - 10); await p.evaluate(() => window.hoverHide && window.hoverHide()); await wait(120);
  await pic('the-field-kept-lit');
  // CHANGED 2026-09-26 (D-056 (2)): C1087, a case that only sets something up through this endpoint, is no longer missing from the code
  // map — its pair "arranges other cases" names it: its journey id, clicked, and the code map says it is there
  const C2 = '#ocol-uni .urow[data-row="JOURNEYS"] [data-key="case:C1087"]';
  await center(C2);
  await step('light-a-case-the-code-map-now-names', C2, 'the journey C1087, in the universe column');
  say('lit: C1087, the code map says', Object.assign({ inArranged: await p.$$eval('#ocol-cm .pair[data-k="d:arranged"] .elon', (es) => es.map((e) => e.textContent)) }, await why()));
  await onePic('the-arranging-case-named');
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('clear-the-light-again', '#elclear', 'the clear link on the lit chip above the table');
  await center('#ocol-gaps .opt[data-gdir="cm"]');
  await step('gaps-back-to-this-way', '#ocol-gaps .opt[data-gdir="cm"]', 'the first square of THE GAPS, back to its default'); }
{ // D-052: every element the code map and THE GAPS name wears the station's glyph in its kind colour, and its subcategory as a label at the end
  const center = async (sel) => { await p.$eval(sel, (e) => e.scrollIntoView({ block: 'center' })); await wait(150); };
  const marks = (col) => p.$$eval(col + ' .skg', (gs) => { const o = {}; gs.filter((g) => !g.closest('.ainfo')).forEach((g) => { const k = g.getAttribute('data-sk'), l = [...g.parentElement.querySelectorAll(':scope > .sksub')].map((x) => x.textContent);
    o[k] = o[k] || { n: 0, labels: {} }; o[k].n++; l.forEach((x) => { o[k].labels[x] = (o[k].labels[x] || 0) + 1; }); }); return o; });
  say('D-052 · the endpoint shown', await p.evaluate(() => window.__allep.state.open));
  await p.mouse.move(5, H - 10); await p.evaluate(() => window.hoverHide && window.hoverHide()); await wait(150);
  n++; await (await p.$('#ocol-cm')).screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-code-map-station-marks.png') });
  say('code map · the station glyphs and labels', await marks('#ocol-cm'));
  await center('#ocol-gaps .opt[data-gdir="uni"]');
  await step('gaps-the-universe-way', '#ocol-gaps .opt[data-gdir="uni"]', 'the second square of THE GAPS');
  await p.mouse.move(5, H - 10); await p.evaluate(() => window.hoverHide && window.hoverHide()); await wait(150);
  n++; await (await p.$('#ocol-gaps')).screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-gaps-station-marks.png') });
  say('the gaps · the station glyphs and labels', await marks('#ocol-gaps'));
  await center('#ocol-gaps .opt[data-gdir="cm"]');
  await step('gaps-back-once-more', '#ocol-gaps .opt[data-gdir="cm"]', 'the first square of THE GAPS, back to its default'); }
// the row's click scrolls ONE ENDPOINT's head to the top, under the pinned row, where a click at the lab link's centre lands on the
// pin (found by the walk, 2026-09-25): the page back to its top first, so the next step scrolls the link into open view
await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
{ // the lab link: a real click opens the lab on this endpoint, then back
  await step('open-in-the-lab', '#lablink', 'the open-in-the-lab link');
  await p.waitForLoadState('load'); await wait(1500);
  say('the lab opened', { url: p.url().replace(/^.*\//, ''), lede: await p.evaluate(() => { const e = document.getElementById('ledebench'); return e ? e.textContent : null; }) });
  await pic('the-lab-on-this-endpoint');
  await p.goBack(); await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 20000 }); await wait(200);
  say('back on the page', { open: await p.evaluate(() => window.__allep.state.open), address: await p.evaluate(() => window.location.search) }); }
{ // the Gabe Universe link: a real click opens the example station on this endpoint (?node=), its card open; then back
  await step('open-in-the-universe', '#unilink', 'the universe link');
  await p.waitForLoadState('load'); await p.waitForFunction('window.__nodeDone === true', null, { timeout: 30000 }).catch(() => {}); await wait(4000);
  say('the station opened', { url: p.url().replace(/^.*\//, ''), node: await p.evaluate(() => window.__node || null), selected: await p.evaluate(() => window.__nodeDone === true) });
  await pic('the-universe-on-this-endpoint');
  await p.goBack(); await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 20000 }); await wait(200);
  say('back on the page', { open: await p.evaluate(() => window.__allep.state.open), address: await p.evaluate(() => window.location.search) }); }
{ // the streaming endpoint: its station card draws the flag that walls it, so a switch and an own guard are shown in part
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('click-the-stream-row', '#board tr.row[data-ep="GET /recipe-creation/gustify/stream"] td.id', 'the row GET /recipe-creation/gustify/stream');
  say('endpoint section', { title: await txt('#onehead h3'), plain: await txt('#ocol-uni .plain'),
    universe: await p.$$eval('#ocol-uni .urow', (us) => us.map((u) => u.innerText.replace(/\s+/g, ' ').slice(0, 140))),
    gaps: await p.$$eval('#ocol-gaps .gap', (gs) => gs.map((g) => g.textContent)) });
  await onePic('stream-endpoint-three-columns');
  const g = await p.$('#ocol-gaps .gap[data-part]');
  if (g) { await g.scrollIntoViewIfNeeded(); const bx = await g.boundingBox(); await p.mouse.move(bx.x + 10, bx.y + bx.height / 2); await wait(250);
    say('pointing at a gap shown in part', { gap: await p.$eval('#ocol-gaps .gap[data-part]', (e) => e.textContent), tip: await txt('#tip') });
    await pic('point-at-a-gap-shown-in-part'); } else say('MISSING a gap shown in part', '#ocol-gaps .gap[data-part]'); }
await step('more-information', '#more-btn', 'the more information button, at the end of the page');
await pic('more-information-open');
}
if (go('d053')) { // D-053, LAST: the endings and the own checks as ONE table, in the order they happen — POST /recipe-creation/gustify (the operator's
  // screenshot endpoint) opened from the table; each look switched by its square and back; one own check lit, photographed where it
  // lands; then GET /recipes, the longest table. The table is photographed on its own after every change; the words are read off it
  const center = async (sel) => { await p.$eval(sel, (e) => e.scrollIntoView({ block: 'center' })); await wait(150); };
  const EX = '#ocol-cm .pair[data-k="d:exits"]';
  // the table photographed from the page's top, as a clip of the full page: scrolled to it, the pinned row would sit over its first rows
  const endPic = async (name) => { await p.mouse.move(5, H - 10); await p.evaluate(() => { window.hoverHide && window.hoverHide(); window.scrollTo(0, 0); }); await wait(200); n++;
    const bx = await p.$eval(EX, (e) => { const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; });
    await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + name + '.png'), clip: { x: Math.max(0, bx.x - 8), y: Math.max(0, bx.y - 8), width: bx.width + 16, height: bx.height + 16 }, fullPage: true }); };
  const table = () => p.$$eval(EX + ' table.etab tr', (trs) => trs.map((tr) => (tr.classList.contains('mom') ? '── ' : '') + tr.innerText.replace(/\s+/g, ' ').slice(0, 150)));
  const sq = async (g, v) => { const s2 = EX + ' .opt[data-eopt="' + g + '"][data-v="' + v + '"]'; await center(s2); return s2; };
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('open-gustify-from-the-table', '#board tr.row[data-ep="POST /recipe-creation/gustify"] td.id', 'the row POST /recipe-creation/gustify');
  say('D-053 · the endings, in time order', await table());
  await center(EX); await endPic('endings-in-time');
  // (a) the moments: a word inside the stage chip, then back to header rows (my pick)
  let s2 = await sq('mom', 'chip'); await step('moments-as-a-word-in-the-stage-chip', s2, 'the square "' + (await txt(s2)) + '"');
  say('D-053 · moments inside the stage chip', await table()); await center(EX); await endPic('endings-moments-in-the-stage-chip');
  s2 = await sq('mom', 'rows'); await step('moments-back-to-header-rows', s2, 'the square "' + (await txt(s2)) + '" (my pick)');
  // (b) the check: a line under the ending's words, then back to its own column (my pick)
  s2 = await sq('chk', 'line'); await step('check-as-a-line-under-the-words', s2, 'the square "' + (await txt(s2)) + '"');
  say('D-053 · the check as a line', await table()); await center(EX); await endPic('endings-check-as-a-line');
  s2 = await sq('chk', 'col'); await step('check-back-to-its-column', s2, 'the square "' + (await txt(s2)) + '" (my pick)');
  // one own check lit: the first HANDLER row that carries one — which row it is is read from the page's data, the click is the mouse's
  const X1 = await p.evaluate(() => { const r = window.AE_DATA.rows.find((q) => q.id === 'POST /recipe-creation/gustify'); const i = r.xd.exits.findIndex((x) => x[0] === 'checks' && x[1].length); return r.xd.exits[i][2]; });
  const CK = EX + ' tr.erow[data-x="' + X1 + '"] td.chk .ck';
  await center(CK);
  await step('light-one-own-check', CK, 'the check "' + (await txt(CK)).slice(0, 60) + '"');
  say('D-053 · a check lit', await p.evaluate(() => ({ chip: document.getElementById('elchip').hidden ? null : document.getElementById('elsays').textContent,
    rowsLit: document.querySelectorAll('#board tr.row[data-el="on"]').length,
    landsOn: [...document.querySelectorAll('#ocol-cm .elon')].map((e) => [e.closest('tr.erow') ? e.closest('tr.erow').getAttribute('data-x') : null, e.closest('td') ? e.closest('td').className : null, e.textContent.trim().slice(0, 60)]),
    cmSays: document.getElementById('el-cm').textContent })));
  await center(CK); await endPic('endings-own-check-lit');
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('clear-the-check-light', '#elclear', 'the clear link on the lit chip above the table');
  // the longest table: GET /recipes, opened from the table
  await step('open-get-recipes-from-the-table', '#board tr.row[data-ep="GET /recipes"] td.id', 'the row GET /recipes');
  const t2 = await table(); say('D-053 · GET /recipes, the endings in time order', { rows: t2.filter((x) => !x.startsWith('── ')).length - 1, table: t2 });
  await center(EX); await endPic('endings-longest-table-get-recipes'); }
if (go('bymoment')) { // BY MOMENT (his ask 2026-09-26), LAST: the code map's copy button, then the section below ONE ENDPOINT — the endpoint's moments
  // as columns (his default, D-055), its timed blocks as rows — on POST /recipe-creation/gustify: its info; each look switched and back; the path to the
  // 402 and back; one table lit from the grid, then POST /setup/complete opened with the light still on (the login dependency reads
  // that table, and the handler's call reads it again: two moments). The section is photographed from the page's top as a clip of the
  // full page after every change (scrolled to it, the pinned row would sit over its first rows); its words are read off it
  const center = async (sel) => { await p.$eval(sel, (e) => e.scrollIntoView({ block: 'center' })); await wait(150); };
  // a section taller than the browser can photograph in one piece (past 8,192 px the capture repeats its top) is photographed in
  // pieces of 8,000 px, the first under the step's name, the rest "-continued", "-continued-2" …
  const moPic = async (name) => { await p.mouse.move(5, H - 10); await p.evaluate(() => { window.hoverHide && window.hoverHide(); window.scrollTo(0, 0); }); await wait(200); n++;
    const bx = await p.$eval('#sec-mo', (e) => { const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; });
    const y0 = Math.max(0, bx.y - 8), hAll = bx.height + 16, TILE = 8000;
    for (let k = 0; k * TILE < hAll; k++) await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + name + (k ? '-continued' + (k > 1 ? '-' + k : '') : '') + '.png'),
      clip: { x: Math.max(0, bx.x - 8), y: y0 + k * TILE, width: Math.min(W, bx.width + 16), height: Math.min(TILE, hAll - k * TILE) }, fullPage: true }); };
  const grid = () => p.$$eval('#mogrid table.motab tr', (trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').slice(0, 170)));
  // D-055: the path row is one line of codes — each group is a moment (its data-mom), each code a status; the words are the hover's
  const paths = () => p.$$eval('#mobar .mopaths > *', (gs) => gs.map((g) => g.classList.contains('mopg') ? g.getAttribute('data-mom') + ': ' + [...g.querySelectorAll('.mopath')].map((x) => x.innerText.replace(/\s+/g, ' ').trim()).join(' ') : g.innerText.trim()).join(' │ '));
  const fits = () => p.evaluate(() => { const G = document.getElementById('mogrid'); return { box: G.clientWidth, table: G.scrollWidth, scrollsSideways: !document.getElementById('moscroll').hidden }; });
  const lands = () => p.evaluate(() => ({ chip: document.getElementById('elchip').hidden ? null : document.getElementById('elsays').textContent,
    rowsLit: document.querySelectorAll('#board tr.row[data-el="on"]').length, says: document.getElementById('el-mo').textContent,
    inGrid: [...document.querySelectorAll('#mogrid .elon')].map((e) => { const td = e.closest('td'); return [td ? td.getAttribute('data-mom') : null, td ? td.getAttribute('data-f') : null, e.textContent.trim().slice(0, 40)]; }) }));
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('open-gustify-for-by-moment', '#board tr.row[data-ep="POST /recipe-creation/gustify"] td.id', 'the row POST /recipe-creation/gustify');
  // the code map's copy button, beside its options: what it copies is read off a stubbed clipboard (the page cannot be asked)
  await p.evaluate(() => { window.__copied = null; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (s) => { window.__copied = s; return Promise.resolve(); } } }); });
  await center('#cmcopy'); await step('copy-the-code-map-settings', '#cmcopy', 'the button "' + (await txt('#cmcopy')) + '" beside the code map\'s options');
  say('the code map\'s copy button copied', await p.evaluate(() => window.__copied));
  { const bx = await p.$eval('#ocol-cm .pair[data-k="d:exits"] .eopts', (e) => { const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; });
    n++; await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-code-map-copy-said.png'), clip: { x: Math.max(0, bx.x - 8), y: Math.max(0, bx.y - 8), width: Math.min(W, bx.width + 16), height: bx.height + 16 }, fullPage: true }); }
  await center('#sec-mo'); say('BY MOMENT · the path picker', await paths()); say('BY MOMENT · all paths', await grid()); say('BY MOMENT · fits its box', await fits());
  await moPic('by-moment-all-paths');
  say('BY MOMENT · no moment', await p.$eval('#moband', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 400)));
  await center('#itog-mo'); await step('by-moment-info-open', '#itog-mo', 'the info toggle beside BY MOMENT');
  say('BY MOMENT · its info', await p.$$eval('#info-mo p', (ps) => ps.map((e) => e.textContent.slice(0, 120)))); await moPic('by-moment-info-shown');
  await center('#itog-mo'); await step('by-moment-info-close', '#itog-mo', 'the same toggle, again');
  // the two looks: each switched, photographed, and back to his default (D-055)
  say('BY MOMENT · the heads (moments as columns, his default)', await p.$$eval('#mogrid th.mom', (hs) => hs.map((h) => h.getAttribute('data-face'))));
  let s3 = '#mobar .opt[data-mopt="lay"][data-v="rows"]'; await center(s3); await step('moments-as-rows', s3, 'the square "' + (await txt(s3)) + '"');
  say('BY MOMENT · moments as rows', { fits: await fits(), heads: await p.$$eval('#mogrid th.mom', (hs) => hs.map((h) => h.getAttribute('data-face'))) });
  await moPic('by-moment-moments-as-rows');
  s3 = '#mobar .opt[data-mopt="lay"][data-v="cols"]'; await center(s3); await step('moments-back-to-columns', s3, 'the square "' + (await txt(s3)) + '" (his default)');
  s3 = '#mobar .opt[data-mopt="cell"][data-v="counts"]'; await center(s3); await step('cells-as-counts', s3, 'the square "' + (await txt(s3)) + '"');
  say('BY MOMENT · cells as counts', await grid()); await moPic('by-moment-cells-as-counts');
  s3 = '#mobar .opt[data-mopt="cell"][data-v="chips"]'; await center(s3); await step('cells-back-to-chips', s3, 'the square "' + (await txt(s3)) + '" (his default)');
  // the path: the 402 (which square it is is read from the page's data; the click is the mouse's), then all paths again
  const i402 = await p.evaluate(() => window.AE_DATA.rows.find((q) => q.id === 'POST /recipe-creation/gustify').mo.ex.findIndex((x) => x[1] === 402));
  const P402 = '#mobar .mopath[data-path="' + i402 + '"]';
  await center(P402); await step('path-to-the-402', P402, 'the path square "' + (await txt(P402)) + '"');
  say('BY MOMENT · the path to the 402', await grid()); await moPic('by-moment-path-to-the-402');
  await center('#mobar .mopath[data-path="all"]'); await step('all-paths-again', '#mobar .mopath[data-path="all"]', 'the path square "' + (await txt('#mobar .mopath[data-path="all"]')) + '"');
  // one table lit from the grid: households, which the login dependency reads (the dependencies' row, Data effects)
  /* CHANGED 2026-09-30 (D-070): Data effects is one map under its row (his default look now) — households is a table of that map, in
     the dependencies' band (the band of its first step); its cells say how many */
  const CH = '#mogrid tr.mdxr .mdxn[data-side="t"][data-key="table:households"]';
  await center(CH); await step('light-households-in-by-moment', CH, 'the table "' + (await txt(CH)).slice(0, 40) + '" in the Data effects map, the dependencies\' band');
  say('BY MOMENT · households lit, where the light lands', await lands());
  await moPic('by-moment-households-lit');
  // another endpoint with the light on: POST /setup/complete, clicked in the table — the same table read at two moments
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('open-setup-complete-light-on', '#board tr.row[data-ep="POST /setup/complete"] td.id', 'the row POST /setup/complete');
  say('BY MOMENT · POST /setup/complete, where the light lands', await lands());
  say('BY MOMENT · POST /setup/complete, the path picker', await paths());
  await moPic('by-moment-setup-complete-households-lit');
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('clear-the-by-moment-light', '#elclear', 'the clear link on the lit chip above the table'); }
if (go('d055')) { // D-055 (his ruling 2026-09-26), LAST: POST /cooking/sessions, his example — the path row's codes and their hovers, the handler heads and
  // one's hover, then the code map's switch "what BY MOMENT carries": dim, hide, and back to show all, the code map photographed each time
  const center = async (sel) => { await p.$eval(sel, (e) => e.scrollIntoView({ block: 'center' })); await wait(150); };
  const paths = () => p.$$eval('#mobar .mopaths > *', (gs) => gs.map((g) => g.classList.contains('mopg') ? g.getAttribute('data-mom') + ': ' + [...g.querySelectorAll('.mopath')].map((x) => x.innerText.trim()).join(' ') : g.innerText.trim()).join(' │ '));
  const clipOf = async (sel, maxH) => p.$eval(sel, (e, mh) => { const r = e.getBoundingClientRect(); return { x: Math.max(0, r.left + scrollX - 8), y: Math.max(0, r.top + scrollY - 8), width: r.width + 16, height: Math.min(mh, r.height + 16) }; }, maxH);
  // photographed from the section's top, whole: a tall section in 8,000 px pieces (…-continued, …-continued-2)
  const shotOf = async (name, sel) => { await p.mouse.move(5, H - 10); await p.evaluate(() => { window.hoverHide && window.hoverHide(); window.scrollTo(0, 0); }); await wait(200); n++;
    const bx = await clipOf(sel, 1e9), TILE = 8000;
    for (let k = 0; k * TILE < bx.height; k++) await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + name + (k ? '-continued' + (k > 1 ? '-' + k : '') : '') + '.png'),
      clip: { x: bx.x, y: bx.y + k * TILE, width: Math.min(W - bx.x, bx.width), height: Math.min(TILE, bx.height - k * TILE) }, fullPage: true }); };
  const hoverSay = async (label, sel) => { const e = await p.$(sel); await e.scrollIntoViewIfNeeded(); const bx = await e.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await wait(250);
    say(label, await p.$eval('#tip', (t) => t.innerText.replace(/\n+/g, ' ┆ '))); n++;
    const tb = await p.$eval('#tip', (t) => { const r = t.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
    const x0 = Math.max(0, Math.min(bx.x, tb.x) - 10), y0 = Math.max(0, Math.min(bx.y, tb.y) - 10);
    await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + label.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40) + '.png'),
      clip: { x: x0, y: y0, width: Math.min(W - x0, Math.max(bx.x + bx.width, tb.x + tb.width) - x0 + 10), height: Math.min(H - y0, Math.max(bx.y + bx.height, tb.y + tb.height) - y0 + 10) } });
    await p.mouse.move(5, H - 10); await wait(100); };
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('open-cooking-sessions', '#board tr.row[data-ep="POST /cooking/sessions"] td.id', 'the row POST /cooking/sessions');
  await center('#sec-mo'); say('D-055 · the path row', await paths());
  say('D-055 · the heads', await p.$$eval('#mogrid th.mom', (hs) => hs.map((h) => h.getAttribute('data-face'))));
  await shotOf('d055-by-moment-cooking-sessions', '#sec-mo');
  // his defaults (D-055): the two pressed squares, and the hover of one saying it is his
  await hoverSay('hover the moments-as-columns square', '#mobar .opt[data-mopt="lay"][data-v="cols"]');
  const i429 = await p.evaluate(() => window.AE_DATA.rows.find((q) => q.id === 'POST /cooking/sessions').mo.ex.findIndex((x) => x[1] === 429));
  await hoverSay('hover the first 429 code', '#mobar .mopath[data-path="' + i429 + '"]');
  await hoverSay('hover the second 429 code', '#mobar .mopath[data-path="' + (i429 + 1) + '"]');
  const i404 = await p.evaluate(() => window.AE_DATA.rows.find((q) => q.id === 'POST /cooking/sessions').mo.ex.findIndex((x) => x[1] === 404));
  await center('#mobar'); await step('path-code-404', '#mobar .mopath[data-path="' + i404 + '"]', 'the code "' + (await txt('#mobar .mopath[data-path="' + i404 + '"]')) + '"');
  await hoverSay('hover the chosen 404 code', '#mobar .mopath[data-path="' + i404 + '"]');
  await shotOf('d055-path-to-the-404', '#sec-mo');
  await center('#mobar'); await step('path-all-again', '#mobar .mopath[data-path="all"]', 'the square "' + (await txt('#mobar .mopath[data-path="all"]')) + '"');
  await hoverSay('hover a failure head', '#mogrid th.mom[data-mom="fail"]');
  await hoverSay('hover the work head', '#mogrid th.mom[data-mom="work"]');
  // the switch: its words read off the squares; the count read off the code map's header after each press
  const cvSay = async (label) => say(label, await p.evaluate(() => { const fs = [...document.querySelectorAll('#ocol-cm .pair[data-k]')].filter((e) => e.offsetParent), nm = (e) => (e.querySelector('.pk') || {}).textContent;
    return { count: document.getElementById('cvcount').textContent, carry: document.getElementById('ocol-cm').getAttribute('data-carry'),
      left: fs.filter((e) => !/^[ce]$/.test(e.getAttribute('data-cvs'))).map((e) => nm(e) + ({ p: ' (part)', x: ' (BY MOMENT holds more)' }[e.getAttribute('data-cvs')] || '')),
      nothingHere: fs.filter((e) => e.getAttribute('data-cvs') === 'e').map(nm),
      notes: [...document.querySelectorAll('#ocol-cm .cvn, #ocol-cm .cvx')].filter((e) => e.offsetParent).map((e) => e.textContent) }; }));
  await cvSay('D-055 · the code map, show all');
  await hoverSay('hover the dim square', '#ocol-cm .opt[data-carry="dim"]');
  await center('#ocol-cm .opt[data-carry="dim"]'); await step('carry-dim', '#ocol-cm .opt[data-carry="dim"]', 'the square "' + (await txt('#ocol-cm .opt[data-carry="dim"]')) + '"');
  await cvSay('D-055 · the code map, dim'); await shotOf('d055-code-map-dim', '#ocol-cm');
  await center('#ocol-cm .opt[data-carry="hide"]'); await step('carry-hide', '#ocol-cm .opt[data-carry="hide"]', 'the square "' + (await txt('#ocol-cm .opt[data-carry="hide"]')) + '"');
  await cvSay('D-055 · the code map, hide'); await shotOf('d055-code-map-hide', '#ocol-cm');
  await p.evaluate(() => { window.__copied = null; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (s) => { window.__copied = s; return Promise.resolve(); } } }); });
  await center('#cmcopy'); await step('copy-the-settings-with-hide', '#cmcopy', 'the button "' + (await txt('#cmcopy')) + '"');
  say('D-055 · the code map\'s copy', await p.evaluate(() => window.__copied));
  // review B1: an endpoint whose steps touch tables the code map does not list — opened in the table, hide still on
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('open-the-stream-endpoint-in-hide', '#board tr.row[data-ep="GET /recipe-creation/gustify/stream"] td.id', 'the row GET /recipe-creation/gustify/stream');
  await cvSay('D-055 · GET /recipe-creation/gustify/stream, hide'); await shotOf('d055-stream-code-map-hide', '#ocol-cm');
  await hoverSay('hover the stream tables note', '#ocol-cm .pair[data-k="d:tables"] .cvx');
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('back-to-cooking-sessions', '#board tr.row[data-ep="POST /cooking/sessions"] td.id', 'the row POST /cooking/sessions');
  await center('#ocol-cm .opt[data-carry="all"]'); await step('carry-show-all', '#ocol-cm .opt[data-carry="all"]', 'the square "' + (await txt('#ocol-cm .opt[data-carry="all"]')) + '" (my pick)');
  await cvSay('D-055 · the code map, show all again'); }
if (go('d056')) { // D-056 (his ruling "agree with your recommendations"), LAST: the twelve adds, on POST /cooking/sessions (his example), then the file
  // that fetches GET /account/export and the stream's success — each read off the page after a real click or a real hover
  const center = async (sel) => { await p.$eval(sel, (e) => e.scrollIntoView({ block: 'center' })); await wait(150); };
  const clipOf = async (sel, maxH) => p.$eval(sel, (e, mh) => { const r = e.getBoundingClientRect(); return { x: Math.max(0, r.left + scrollX - 8), y: Math.max(0, r.top + scrollY - 8), width: r.width + 16, height: Math.min(mh, r.height + 16) }; }, maxH);
  const shotOf = async (name, sel, maxH) => { await p.mouse.move(5, H - 10); await p.evaluate(() => { window.hoverHide && window.hoverHide(); window.scrollTo(0, 0); }); await wait(200); n++;
    const bx = await clipOf(sel, maxH || 8000); await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + name + '.png'), clip: { ...bx, width: Math.min(W - bx.x, bx.width) }, fullPage: true }); };
  const hoverSay = async (label, sel) => { const e = await p.$(sel); if (!e) { say('MISSING ' + label, sel); return; } await e.scrollIntoViewIfNeeded(); const bx = await e.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await wait(250);
    say(label, await p.$eval('#tip', (t) => t.innerText.replace(/\n+/g, ' ┆ '))); n++;
    const tb = await p.$eval('#tip', (t) => { const r = t.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
    const x0 = Math.max(0, Math.min(bx.x, tb.x) - 10), y0 = Math.max(0, Math.min(bx.y, tb.y) - 10);
    await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + label.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40) + '.png'),
      clip: { x: x0, y: y0, width: Math.min(W - x0, Math.max(bx.x + bx.width, tb.x + tb.width) - x0 + 10), height: Math.min(H - y0, Math.max(bx.y + bx.height, tb.y + tb.height) - y0 + 10) } });
    await p.mouse.move(5, H - 10); await wait(100); };
  const pair = (k) => p.$eval('#ocol-cm .pair[data-k="' + k + '"]', (e) => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => null);
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('d056-open-cooking-sessions', '#board tr.row[data-ep="POST /cooking/sessions"] td.id', 'the row POST /cooking/sessions');
  for (const k of ['d:behind', 'd:arranged', 'd:hook', 'd:screens', 'd:response']) say('D-056 · the code map, ' + k, await pair(k));
  await shotOf('d056-code-map-cooking-sessions', '#ocol-cm');
  await hoverSay('d056 hover the handler pair', '#ocol-cm .pair[data-k="h:handler"] .pk');
  await hoverSay('d056 hover a not-declared 409', '#ocol-cm .pair[data-k="d:exits"] tr.erow[data-mom="checks"] .vc-status');
  await center('#sec-mo'); await shotOf('d056-by-moment-all-paths', '#sec-mo');
  await hoverSay('d056 hover a function behind', '#mogrid .mc[data-keys="fn:apps/api/services/long_prep.py::seed_stage_schedule"] .mt');
  /* CHANGED 2026-09-30 (D-070 · R-04): the race is a badge on its link in the Data effects map — the link to cooking_sessions (read off
     the page's data to know which badge; the hover is the mouse's) */
  const raceSel = await p.evaluate(() => { document.querySelectorAll('[data-w66race]').forEach((x) => x.removeAttribute('data-w66race'));
    const w = document.querySelector('#mogrid tr.mdxr .mdx'), D0 = window.__allep.data, R0 = D0.rows.find((q) => q.id === window.__allep.state.open), X0 = R0 && R0.mo.dx;
    const bd = w && X0 ? [...w.querySelectorAll('.mdxrc')].find((x) => { const L0 = w._dx.L[+x.getAttribute('data-j')]; return L0 && D0.mo.keys[X0.t[L0.t]] === 'table:cooking_sessions'; }) : null;
    if (!bd) return null; bd.setAttribute('data-w66race', '1'); return '[data-w66race="1"]'; });
  if (raceSel) await hoverSay('d056 hover the race', raceSel); else say('MISSING d056 hover the race', 'the race badge on cooking_sessions');
  await hoverSay('d056 hover the first 429', '#mogrid td[data-mom="edge"][data-f="end"] .mc .vc-status');
  await hoverSay('d056 hover the limiter', '#mogrid .mc[data-keys="limiter:sensitive"] .mt');
  await hoverSay('d056 hover the login check', '#mogrid td[data-mom="gate"][data-f="gate"] .mc[data-key^="fn:"] .mt');
  await hoverSay('d056 hover C237 hollow', '#mogrid .mc.hol .mt');
  await hoverSay('d056 hover C267', '#mogrid .mc[data-f="proof"][data-keys="case:C267"] .mt');
  const fates = () => p.$$eval('#mogrid td[data-mom] .mc:has(.vc-fate)', (cs) => cs.map((c) => c.innerText.replace(/\s+/g, ' ').trim()));   /* the writes at their moments (D-064 (2): not the no-moment tally) */
  // CHANGED 2026-09-26 (D-057 c): a code is a path, and the 201 has two — the one whose path writes is looked for (read off the page's data)
  const writesAt = (s0) => p.evaluate((st) => { const R = window.AE_DATA.rows.find((q) => q.id === 'POST /cooking/sessions');
    return R.mo.ex.findIndex((x, i) => x[1] === st && R.mo.el.some((e) => e[7] && e[7].fa && e[7].fa[i])); }, s0);
  for (const st of [201, 403]) { const i = await writesAt(st);
    const sel = '#mobar .mopath[data-path="' + i + '"]'; await center('#mobar'); await step('d056-path-to-the-' + st, sel, 'the code "' + (await txt(sel)) + '"');
    say('D-056 · the writes on the path to the ' + st, await fates()); await shotOf('d056-by-moment-path-to-the-' + st, '#sec-mo'); }
  await center('#mobar'); await step('d056-all-paths-again', '#mobar .mopath[data-path="all"]', 'the square "' + (await txt('#mobar .mopath[data-path="all"]')) + '"');
  say('D-056 · all paths, writes wearing a fate', (await fates()).length);
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('d056-open-account-export', '#board tr.row[data-ep="GET /account/export"] td.id', 'the row GET /account/export');
  say('D-056 · GET /account/export, what sends it', await pair('d:hook'));
  await hoverSay('d056 hover the file that sends it', '#ocol-cm .pair[data-k="d:hook"] [data-tip="hookfile"]');
  say('D-056 · GET /account/export, the screen sends it', await p.$$eval('#mogrid td[data-mom="send"][data-f="client"] .mc', (cs) => cs.map((c) => c.innerText.replace(/\s+/g, ' ').trim())));
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('d056-open-the-stream', '#board tr.row[data-ep="GET /recipe-creation/gustify/stream"] td.id', 'the row GET /recipe-creation/gustify/stream');
  say('D-056 · the stream, its answer', await p.$$eval('#mogrid td[data-mom="answer"][data-f="end"] .mc', (cs) => cs.map((c) => c.innerText.replace(/\s+/g, ' ').trim())));
  await center('#mogrid td[data-mom="answer"][data-f="end"]'); await shotOf('d056-the-stream-by-moment', '#sec-mo');
  // after the review's fixes (F1–F6): the six things he looks at, each by a real click or a real hover, each photographed from the
  // top of its section (a section taller than 8,000 px in 8,000 px pieces)
  const shotPieces = async (name, sel) => { await p.mouse.move(5, H - 10); await p.evaluate(() => { window.hoverHide && window.hoverHide(); window.scrollTo(0, 0); }); await wait(200);
    const r = await p.$eval(sel, (e) => { const q = e.getBoundingClientRect(); return { x: Math.max(0, q.left + scrollX - 8), y: Math.max(0, q.top + scrollY - 8), width: q.width + 16, height: q.height + 16 }; });
    const k = Math.max(1, Math.ceil(r.height / 8000));
    for (let i = 0; i < k; i++) { n++; await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + name + (k > 1 ? '-piece-' + (i + 1) : '') + '.png'),
      clip: { x: r.x, y: r.y + i * 8000, width: Math.min(W - r.x, r.width), height: Math.min(8000, r.height - i * 8000) }, fullPage: true }); }
    say('picture · ' + name, { pieces: k, height: Math.round(r.height) }); };
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('review-open-cooking-sessions', '#board tr.row[data-ep="POST /cooking/sessions"] td.id', 'the row POST /cooking/sessions');
  say('review · the behind pair, by name', await pair('d:behind'));
  await shotPieces('review-behind-pair-by-name', '#ocol-cm .pair[data-k="d:behind"]');
  await hoverSay('review hover the handler signature and docstring', '#ocol-cm .pair[data-k="h:handler"] .pk');
  { const i201 = await p.evaluate(() => { const R = window.AE_DATA.rows.find((q) => q.id === 'POST /cooking/sessions');   /* D-057 (c): the 201 code whose path writes */
      return R.mo.ex.findIndex((x, i) => x[1] === 201 && R.mo.el.some((e) => e[7] && e[7].fa && e[7].fa[i])); }), sel = '#mobar .mopath[data-path="' + i201 + '"]';
    await center('#mobar'); await step('review-path-to-the-201', sel, 'the code "' + (await txt(sel)) + '"');
    say('review · the writes on the path to the 201, each with its fate', await fates());
    /* CHANGED 2026-09-27 (the scoped-import fix): seed_stage_schedule's own steps now name the path it runs on — the first-run 201 —
       so on this replay 201 it is not drawn; its hover is read on the first-run 201 below */
    say('review · seed_stage_schedule on the replay 201 path', (await p.$('#mogrid .mc[data-keys="fn:apps/api/services/long_prep.py::seed_stage_schedule"]')) ? 'drawn' : 'not drawn: the replay returns before start_session seeds a stage');
    await shotPieces('review-by-moment-path-to-the-201', '#sec-mo');
    await center('#mobar'); await step('review-all-paths-again', '#mobar .mopath[data-path="all"]', 'the square "' + (await txt('#mobar .mopath[data-path="all"]')) + '"'); }
  await hoverSay('review hover the 401 declared or not with its header', '#mogrid td[data-mom="gate"][data-f="end"] .mc .vc-status');
  say('review · the arranges pair', await pair('d:arranged'));
  await shotPieces('review-the-arranges-pair', '#ocol-cm .pair[data-k="d:arranged"]');
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('review-open-cooking-active', '#board tr.row[data-ep="GET /cooking/active"] td.id', 'the row GET /cooking/active');
  say('review · GET /cooking/active, the reply pair', await pair('d:response'));
  await hoverSay('review hover CookingPhotoRef, inside CookingSessionResponse', '#mogrid td[data-mom="answer"][data-f="shape"] .mc[data-keys="schema:CookingPhotoRef"] .mt');
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('review-open-the-stream', '#board tr.row[data-ep="GET /recipe-creation/gustify/stream"] td.id', 'the row GET /recipe-creation/gustify/stream');
  say('review · the stream, its answer', await p.$$eval('#mogrid td[data-mom="answer"][data-f="end"] .mc', (cs) => cs.map((c) => c.innerText.replace(/\s+/g, ' ').trim() + ' [' + [...c.querySelectorAll('.sksub')].map((v) => v.getAttribute('data-vc') + ':' + v.getAttribute('data-vv')).join(' ') + ']')));
  await shotPieces('review-the-stream-answer', '#sec-mo'); }
if (go('d057')) { // D-057 (his ruling "build 1 and 2"), LAST: POST /cooking/sessions — the switch's new count and hide; the two codes of the 201, hovered
  // and clicked; the check that raises the lost reason, the client branch, the functions behind at their caller, the Endings row's info
  // line; then PATCH …/timer's 500 and the function it escapes from, and POST /setup/complete's client branch — real clicks, real hovers
  const center = async (sel) => { await p.$eval(sel, (e) => e.scrollIntoView({ block: 'center' })); await wait(150); };
  const shotOf = async (name, sel) => { await p.mouse.move(5, H - 10); await p.evaluate(() => { window.hoverHide && window.hoverHide(); window.scrollTo(0, 0); }); await wait(200);
    const r = await p.$eval(sel, (e) => { const q = e.getBoundingClientRect(); return { x: Math.max(0, q.left + scrollX - 8), y: Math.max(0, q.top + scrollY - 8), width: q.width + 16, height: q.height + 16 }; });
    const k = Math.max(1, Math.ceil(r.height / 8000));
    for (let i = 0; i < k; i++) { n++; await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + name + (k > 1 ? '-piece-' + (i + 1) : '') + '.png'),
      clip: { x: r.x, y: r.y + i * 8000, width: Math.min(W - r.x, r.width), height: Math.min(8000, r.height - i * 8000) }, fullPage: true }); } };
  const hoverSay = async (label, sel) => { const e = await p.$(sel); if (!e) { say('MISSING ' + label, sel); return; } await e.scrollIntoViewIfNeeded(); const bx = await e.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await wait(250);
    say(label, await p.$eval('#tip', (t) => t.innerText.replace(/\n+/g, ' ┆ '))); n++;
    const tb = await p.$eval('#tip', (t) => { const r = t.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
    const x0 = Math.max(0, Math.min(bx.x, tb.x) - 10), y0 = Math.max(0, Math.min(bx.y, tb.y) - 10);
    await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + label.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40) + '.png'),
      clip: { x: x0, y: y0, width: Math.min(W - x0, Math.max(bx.x + bx.width, tb.x + tb.width) - x0 + 10), height: Math.min(H - y0, Math.max(bx.y + bx.height, tb.y + tb.height) - y0 + 10) } });
    await p.mouse.move(5, H - 10); await wait(100); };
  // a chip found by the words on it (the page's data is not asked); marked so the mouse can go to it
  const chipBy = async (mom, f, word) => p.evaluate(([m, f0, w]) => { document.querySelectorAll('[data-w57]').forEach((x) => x.removeAttribute('data-w57'));
    const c = [...document.querySelectorAll('#mogrid td' + (m ? '[data-mom="' + m + '"]' : '') + '[data-f="' + f0 + '"] .mc')].find((x) => ((x.querySelector('.mt') || {}).textContent || '').trim() === w);
    if (!c) return null; (c.querySelector('.mt') || c).setAttribute('data-w57', '1'); return '[data-w57="1"]'; }, [mom, f, word]);
  const paths = () => p.$$eval('#mobar .mopaths > *', (gs) => gs.map((g) => g.classList.contains('mopg') ? g.getAttribute('data-mom') + ': ' + [...g.querySelectorAll('.mopath')].map((x) => x.innerText.trim()).join(' ') : g.innerText.trim()).join(' │ '));
  const writes = () => p.$$eval('#mogrid td[data-f="data"] .mc', (cs) => cs.filter((c) => c.querySelector('.vc[data-vc="op"][data-vv="w"]')).map((c) => c.closest('td').getAttribute('data-mom') + ' ' + c.innerText.replace(/\s+/g, ' ').trim()));
  const cvSay = async (label) => say(label, await p.evaluate(() => { const fs = [...document.querySelectorAll('#ocol-cm .pair[data-k]')].filter((e) => e.offsetParent), nm = (e) => (e.querySelector('.pk') || {}).textContent;
    return { count: document.getElementById('cvcount').textContent, left: fs.filter((e) => !/^[ce]$/.test(e.getAttribute('data-cvs'))).map((e) => nm(e) + ({ p: ' (part)' }[e.getAttribute('data-cvs')] || '')) }; }));
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('d057-open-cooking-sessions', '#board tr.row[data-ep="POST /cooking/sessions"] td.id', 'the row POST /cooking/sessions');
  await cvSay('D-057 · the code map, show all');
  await center('#ocol-cm .opt[data-carry="hide"]'); await step('d057-carry-hide', '#ocol-cm .opt[data-carry="hide"]', 'the square "' + (await txt('#ocol-cm .opt[data-carry="hide"]')) + '"');
  await cvSay('D-057 · the code map, hide'); await shotOf('d057-code-map-hide', '#ocol-cm');
  await center('#ocol-cm .opt[data-carry="all"]'); await step('d057-carry-show-all', '#ocol-cm .opt[data-carry="all"]', 'the square "' + (await txt('#ocol-cm .opt[data-carry="all"]')) + '"');
  await hoverSay('d057 hover the alarms pair', '#ocol-cm .pair[data-k="d:alarms"] .pk');
  await center('#sec-mo'); say('D-057 · the path row', await paths());
  const c201 = await p.$$eval('#mobar .mopath', (bs) => bs.filter((b) => b.innerText.trim() === '201').map((b) => b.getAttribute('data-path')));
  for (const i of c201) await hoverSay('d057 hover a 201 code (' + i + ')', '#mobar .mopath[data-path="' + i + '"]');
  for (const i of c201) { await center('#mobar'); await step('d057-the-201-code-' + i, '#mobar .mopath[data-path="' + i + '"]', 'the code "' + (await txt('#mobar .mopath[data-path="' + i + '"]')) + '"');
    say('D-057 · on this 201, the writes', await writes()); say('D-057 · on this 201, the moments', await p.$$eval('#mogrid th.mom', (hs) => hs.map((h) => h.getAttribute('data-face')).join(' · ')));
    await shotOf('d057-by-moment-the-201-code-' + i, '#sec-mo'); }
  await center('#mobar'); await step('d057-all-paths-again', '#mobar .mopath[data-path="all"]', 'the square "' + (await txt('#mobar .mopath[data-path="all"]')) + '"');
  const sa = await chipBy('work', 'gate', 'existing is not None and existing.user_id != user_id'); if (sa) await hoverSay('d057 hover the check that raises the lost reason', sa);
  await hoverSay('d057 hover the 404 after the catch', '#mogrid td[data-mom="fail"][data-f="end"] .mc');
  /* CHANGED 2026-09-30 (D-069 (6)): the client's branches stand under describeStartCookingError, each line led by its verb — the line
     that reads 409, found by the words on it */
  const lineBy = async (mom, f, lead) => p.evaluate(([m, f0, w]) => { document.querySelectorAll('[data-w57]').forEach((x) => x.removeAttribute('data-w57'));
    const c = [...document.querySelectorAll('#mogrid td[data-mom="' + m + '"][data-f="' + f0 + '"] .mgb > .mc')].find((x) => x.innerText.replace(/\s+/g, ' ').trim().startsWith(w));
    if (!c) return null; c.setAttribute('data-w57', '1'); return '[data-w57="1"]'; }, [mom, f, lead]);
  const sb = await lineBy('after', 'client', 'reads 409'); if (sb) await hoverSay('d057 hover the client branch that reads 409', sb); else say('MISSING the client line that reads 409', 'after');
  for (const w of ['_stages', '_label', 'derive_restrictions']) { const sd = await chipBy('work', 'fn', w); if (sd) await hoverSay('d057 hover ' + w + ' at the work', sd); else say('MISSING ' + w, 'work'); }
  await center('#itog-mo'); await step('d057-open-the-by-moment-info', '#itog-mo', 'the info toggle of BY MOMENT');
  say('D-057 · the Endings row, behind the info toggle', await p.$eval('#mo-nocode', (e) => e.textContent).catch(() => null));
  await shotOf('d057-endings-row-info', '#mogrid tr[data-f="end"] th');
  await center('#itog-mo'); await step('d057-close-the-by-moment-info', '#itog-mo', 'the info toggle of BY MOMENT');
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('d057-open-the-timer', '#board tr.row[data-ep="PATCH /cooking/sessions/{session_id}/timer"] td.id', 'the row PATCH /cooking/sessions/{session_id}/timer');
  await hoverSay('d057 hover the 500', '#mogrid td[data-mom="uncaught"][data-f="end"] .mc .vc-status');
  const se = await chipBy(null, 'fn', 'set_session_timer'); if (se) await hoverSay('d057 hover set_session_timer', se);
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('d057-open-setup-complete', '#board tr.row[data-ep="POST /setup/complete"] td.id', 'the row POST /setup/complete');
  const sc = await lineBy('after', 'client', 'reads'); if (sc) await hoverSay('d057 hover the setup client branch', sc); else say('MISSING the setup client branch', 'after');   /* CHANGED 2026-09-30 (D-069 (6)): its first line, by its verb */
  say('D-057 · POST /setup/complete, the path row', await paths());
  // the review of D-057 (F1 · F2 · F3), LAST: POST /cooking/sessions — the code map hidden where BY MOMENT carries it (its count in the
  // header); the two 201 codes hovered, the first-run one picked by the words its hover says (past every fork); on it the recipe check
  // (the raise's words) and the cap check (a path may skip it); all paths again; the client branch after the answer; a function known by
  // name only at the work; then POST …/complete's 500 and what escapes to it. Each chip is brought to the middle of the screen before the
  // mouse goes to it (at the top edge it sits under the grid's pinned header, and the mouse meets the header)
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('review-open-cooking-sessions', '#board tr.row[data-ep="POST /cooking/sessions"] td.id', 'the row POST /cooking/sessions');
  await center('#ocol-cm .opt[data-carry="hide"]'); await step('review-carry-hide', '#ocol-cm .opt[data-carry="hide"]', 'the square "' + (await txt('#ocol-cm .opt[data-carry="hide"]')) + '"');
  await cvSay('review · the code map, hide'); await shotOf('review-code-map-hide', '#ocol-cm');
  await center('#ocol-cm .opt[data-carry="all"]'); await step('review-carry-show-all', '#ocol-cm .opt[data-carry="all"]', 'the square "' + (await txt('#ocol-cm .opt[data-carry="all"]')) + '"');
  await center('#sec-mo'); say('review · the path row', await paths());
  const fall = await p.evaluate(() => window.AE_DATA.words.mo.path.fall), tips = {};
  for (const i of c201) { await hoverSay('review hover the 201 code ' + i, '#mobar .mopath[data-path="' + i + '"]');
    tips[i] = (log[log.length - 1] || [])[1] || ''; }
  const first = c201.find((i) => String(tips[i]).includes(fall));
  say('review · the first-run 201 is the code whose hover says', first != null ? fall : 'MISSING');
  if (first != null) { await center('#mobar'); await step('review-pick-the-first-run-201', '#mobar .mopath[data-path="' + first + '"]', 'the code "' + (await txt('#mobar .mopath[data-path="' + first + '"]')) + '"');
    say('review · on the first-run 201, the checks at the work', await p.$$eval('#mogrid td[data-mom="work"][data-f="gate"] .mc', (cs) => cs.map((c) => c.innerText.replace(/\s+/g, ' ').trim())));
    await hoverSay('review hover seed_stage_schedule on the first-run 201', '#mogrid .mc[data-keys="fn:apps/api/services/long_prep.py::seed_stage_schedule"] .mt');
    await shotOf('review-by-moment-first-run-201', '#sec-mo');
    const sr = await chipBy('work', 'gate', 'recipe is None'); if (sr) await center(sr); if (sr) await hoverSay('review hover the check that raises SessionNotFoundError', sr); else say('MISSING recipe is None', 'work');
    const sq = await chipBy('work', 'gate', 'concurrent_cap is not None and active + 1 > concurrent_cap'); if (sq) await center(sq); if (sq) await hoverSay('review hover the cap check', sq); else say('MISSING the cap check', 'work');
    await center('#mobar'); await step('review-all-paths-again', '#mobar .mopath[data-path="all"]', 'the square "' + (await txt('#mobar .mopath[data-path="all"]')) + '"'); }
  const sv = await lineBy('after', 'client', 'reads 409'); if (sv) await center(sv); if (sv) await hoverSay('review hover the client branch after the answer', sv); else say('MISSING the client branch', 'after');
  const sn = await chipBy('work', 'fn', 'ResolutionSnapshot.violations_for'); if (sn) await center(sn); if (sn) await hoverSay('review hover a function known by name only', sn); else say('MISSING ResolutionSnapshot.violations_for', 'work');
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('review-open-session-complete', '#board tr.row[data-ep="POST /cooking/sessions/{session_id}/complete"] td.id', 'the row POST /cooking/sessions/{session_id}/complete');
  await center('#mogrid td[data-mom="uncaught"][data-f="end"] .mc .vc-status'); await hoverSay('review hover the 500 of complete', '#mogrid td[data-mom="uncaught"][data-f="end"] .mc .vc-status'); }
if (go('d058')) { // D-058 (his ruling 2026-09-26), LAST: POST /cooking/sessions — the Gabe Universe's own switch (show all, dim with a hover, hide), then
  // THE GAPS' own switch on the universe → code map way (dim with a hover on derive_restrictions, hide) and on the code map → universe
  // way; each panel's count in its header, the "+n in BY MOMENT" notes; the page's copy text; both panels back to show all
  const center = async (sel) => { await p.$eval(sel, (e) => e.scrollIntoView({ block: 'center' })); await wait(150); };
  const shotOf = async (name, sel) => { await p.mouse.move(5, H - 10); await p.evaluate(() => { window.hoverHide && window.hoverHide(); window.scrollTo(0, 0); }); await wait(200);
    const r = await p.$eval(sel, (e) => { const q = e.getBoundingClientRect(); return { x: Math.max(0, q.left + scrollX - 8), y: Math.max(0, q.top + scrollY - 8), width: q.width + 16, height: q.height + 16 }; });
    n++; await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + name + '.png'), clip: { x: r.x, y: r.y, width: Math.min(W - r.x, r.width), height: Math.min(8000, r.height) }, fullPage: true }); };
  const hoverSay = async (label, sel) => { const e = await p.$(sel); if (!e) { say('MISSING ' + label, sel); return; } await e.scrollIntoViewIfNeeded(); const bx = await e.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await wait(250);
    say(label, await p.$eval('#tip', (t) => t.innerText.replace(/\n+/g, ' ┆ '))); n++;
    const tb = await p.$eval('#tip', (t) => { const r = t.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
    const x0 = Math.max(0, Math.min(bx.x, tb.x) - 10), y0 = Math.max(0, Math.min(bx.y, tb.y) - 10);
    await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + label.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40) + '.png'),
      clip: { x: x0, y: y0, width: Math.min(W - x0, Math.max(bx.x + bx.width, tb.x + tb.width) - x0 + 10), height: Math.min(H - y0, Math.max(bx.y + bx.height, tb.y + tb.height) - y0 + 10) } });
    await p.mouse.move(5, H - 10); await wait(100); };
  const pcSay = async (label) => say(label, await p.evaluate(() => { const U = document.getElementById('ocol-uni'), G = document.getElementById('ocol-gaps');
    const where = (e) => { const r = e.closest('[data-row]') || e.closest('[data-block]'); return r ? (r.getAttribute('data-row') || r.getAttribute('data-block')) : '?'; };
    return { universe: [U.getAttribute('data-carry'), document.getElementById('ucvcount').textContent], gaps: [G.getAttribute('data-carry'), G.getAttribute('data-dir'), document.getElementById('gcvcount').textContent],
      notes: [...U.querySelectorAll('.cvn'), ...G.querySelectorAll('.cvn')].filter((e) => e.offsetParent).map((e) => where(e) + ' ' + e.textContent) }; }));
  const sq = (pn, v) => '#ocol-' + pn + ' .opt[data-carry="' + v + '"]';
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('d058-open-cooking-sessions', '#board tr.row[data-ep="POST /cooking/sessions"] td.id', 'the row POST /cooking/sessions');
  await pcSay('D-058 · both panels, show all'); await shotOf('d058-universe-show-all', '#ocol-uni');
  await hoverSay('d058 hover the universe dim square', sq('uni', 'dim'));
  await center(sq('uni', 'dim')); await step('d058-universe-dim', sq('uni', 'dim'), 'the square "' + (await txt(sq('uni', 'dim'))) + '" in the Gabe Universe');
  await pcSay('D-058 · the universe, dim'); await shotOf('d058-universe-dim', '#ocol-uni');
  await hoverSay('d058 hover the Accesses row title', '#ocol-uni .urow[data-row="ACCESSES"] .sechd');
  await center(sq('uni', 'hide')); await step('d058-universe-hide', sq('uni', 'hide'), 'the square "' + (await txt(sq('uni', 'hide'))) + '" in the Gabe Universe');
  await pcSay('D-058 · the universe, hide'); await shotOf('d058-universe-hide', '#ocol-uni');
  await center('#ocol-gaps .opt[data-gdir="uni"]'); await step('d058-gaps-the-universe-way', '#ocol-gaps .opt[data-gdir="uni"]', 'the square "' + (await txt('#ocol-gaps .opt[data-gdir="uni"]')) + '"');
  await center(sq('gaps', 'dim')); await step('d058-gaps-dim', sq('gaps', 'dim'), 'the square "' + (await txt(sq('gaps', 'dim'))) + '" in THE GAPS');
  await pcSay('D-058 · the gaps (the universe way), dim'); await shotOf('d058-gaps-universe-way-dim', '#ocol-gaps');
  await hoverSay('d058 hover derive_restrictions in the gaps', '#ocol-gaps .gfact[data-fact="derive_restrictions"]');
  await hoverSay('d058 hover UserDietaryProfile in the gaps', '#ocol-gaps .gfact[data-fact="UserDietaryProfile"]');
  await center(sq('gaps', 'hide')); await step('d058-gaps-hide', sq('gaps', 'hide'), 'the square "' + (await txt(sq('gaps', 'hide'))) + '" in THE GAPS');
  await pcSay('D-058 · the gaps (the universe way), hide'); await shotOf('d058-gaps-universe-way-hide', '#ocol-gaps');
  await center('#ocol-gaps .opt[data-gdir="cm"]'); await step('d058-gaps-the-code-map-way', '#ocol-gaps .opt[data-gdir="cm"]', 'the square "' + (await txt('#ocol-gaps .opt[data-gdir="cm"]')) + '"');
  await pcSay('D-058 · the gaps (the code map way), hide'); await shotOf('d058-gaps-code-map-way-hide', '#ocol-gaps');
  say('D-058 · the page\'s copy text, the three switches', (await p.$eval('#out', (e) => e.value)).split('\n').filter((l) => / · what BY MOMENT carries: /.test(l)));
  await center(sq('uni', 'all')); await step('d058-universe-show-all-again', sq('uni', 'all'), 'the square "' + (await txt(sq('uni', 'all'))) + '" (my pick)');
  await center(sq('gaps', 'all')); await step('d058-gaps-show-all-again', sq('gaps', 'all'), 'the square "' + (await txt(sq('gaps', 'all'))) + '" (my pick)');
  await pcSay('D-058 · both panels, show all again');
  // the review of D-058 (F1–F5), LAST, still on POST /cooking/sessions: the Gabe Universe dim → hide → show all (the head and the
  // payload line read in hide: no stray " · "); THE GAPS on the universe → code map way, dim → hide → show all; then the code map's
  // "copy the settings", the copied text recorded (the clipboard's writeText is watched, the button is clicked with the mouse)
  const lineSay = async (label) => say(label, await p.evaluate(() => { const U = document.getElementById('ocol-uni'), vis = (q) => { const e = U.querySelector(q); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; };
    return { head: vis('.ust .phead .ptype'), payload: vis('.ust .urow[data-row="PAYLOAD"] .sublbl'), accesses: [...U.querySelectorAll('.urow[data-row="ACCESSES"] .sublbl')].map((e) => [e.innerText.replace(/\s+/g, ' ').trim(), e.getAttribute('data-cv') === '1', getComputedStyle(e).display === 'none' ? 'gone' : getComputedStyle(e).opacity]) }; }));
  const factSay = async (label) => say(label, await p.$$eval('#ocol-gaps .gfact', (fs) => fs.map((f) => f.getAttribute('data-fact') + (f.getAttribute('data-cv') === '1' || (f.closest('.gblk') || f).getAttribute('data-cv') === '1' ? ' · carried' : '') + (f.offsetParent ? '' : ' · gone'))));
  if ((await p.$eval('#ocol-uni', (e) => e.getAttribute('data-ep'))) !== 'POST /cooking/sessions') say('MISSING POST /cooking/sessions open', '#ocol-uni');
  await center(sq('uni', 'dim')); await step('d058-review-universe-dim', sq('uni', 'dim'), 'the square "' + (await txt(sq('uni', 'dim'))) + '" in the Gabe Universe');
  await pcSay('D-058 review · the universe, dim'); await lineSay('D-058 review · the universe, dim — head · payload · accesses'); await shotOf('d058-review-universe-dim-panel', '#ocol-uni');
  await center(sq('uni', 'hide')); await step('d058-review-universe-hide', sq('uni', 'hide'), 'the square "' + (await txt(sq('uni', 'hide'))) + '" in the Gabe Universe');
  await pcSay('D-058 review · the universe, hide'); await lineSay('D-058 review · the universe, hide — head · payload · accesses'); await shotOf('d058-review-universe-hide-panel', '#ocol-uni');
  await center(sq('uni', 'all')); await step('d058-review-universe-show-all', sq('uni', 'all'), 'the square "' + (await txt(sq('uni', 'all'))) + '" (my pick)');
  await center('#ocol-gaps .opt[data-gdir="uni"]'); await step('d058-review-gaps-the-universe-way', '#ocol-gaps .opt[data-gdir="uni"]', 'the square "' + (await txt('#ocol-gaps .opt[data-gdir="uni"]')) + '"');
  await center(sq('gaps', 'dim')); await step('d058-review-gaps-dim', sq('gaps', 'dim'), 'the square "' + (await txt(sq('gaps', 'dim'))) + '" in THE GAPS');
  await pcSay('D-058 review · the gaps (the universe way), dim'); await factSay('D-058 review · the gaps\' names, dim'); await shotOf('d058-review-gaps-dim-panel', '#ocol-gaps');
  await center(sq('gaps', 'hide')); await step('d058-review-gaps-hide', sq('gaps', 'hide'), 'the square "' + (await txt(sq('gaps', 'hide'))) + '" in THE GAPS');
  await pcSay('D-058 review · the gaps (the universe way), hide'); await factSay('D-058 review · the gaps\' names, hide'); await shotOf('d058-review-gaps-hide-panel', '#ocol-gaps');
  await center(sq('gaps', 'all')); await step('d058-review-gaps-show-all', sq('gaps', 'all'), 'the square "' + (await txt(sq('gaps', 'all'))) + '" (my pick)');
  await p.evaluate(() => { window.__walkCopied = null; const c = navigator.clipboard, orig = c && c.writeText ? c.writeText.bind(c) : null;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (s1) => { window.__walkCopied = s1; return orig ? orig(s1).catch(() => {}) : Promise.resolve(); } } }); });
  await center('#cmcopy'); await step('d058-review-copy-the-settings', '#cmcopy', 'the button "' + (await txt('#cmcopy')) + '" of the code map');
  say('D-058 review · the code map\'s copy, as copied', await p.evaluate(() => window.__walkCopied));
  say('D-058 review · beside the button', await p.$eval('#cmsaid', (e) => e.textContent));
  { const r = await p.$eval('#cmcopy', (e) => { const q = e.parentElement.getBoundingClientRect(); return { x: Math.max(0, q.left - 8), y: Math.max(0, q.top - 8), width: q.width + 16, height: q.height + 16 }; });
    n++; await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-d058-review-copied.png'), clip: { x: r.x, y: r.y, width: Math.min(W - r.x, r.width), height: Math.min(H - r.y, r.height) } }); } }
if (go('d064')) { // D-064 (his ruling 2026-09-28), LAST: POST /cooking/sessions — (2) the table's last column, no moment: photographed, the box scrolled
  // sideways by the mouse's wheel to reach it, its head and three of its chips hovered; the code map's hide header read before and after
  // the square; (1) assert_recipe_allergen_safe looked for in the work on the replay 201, the 404 and the first-run 201, each code clicked
  const center = async (sel) => { await p.$eval(sel, (e) => e.scrollIntoView({ block: 'center' })); await wait(150); };
  const hoverSay = async (label, sel) => { const e = await p.$(sel); if (!e) { say('MISSING ' + label, sel); return; } await e.evaluate((x) => x.scrollIntoView({ block: 'center' })); await wait(120); const bx = await e.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await wait(250);
    say(label, await p.$eval('#tip', (t) => t.innerText.replace(/\n+/g, ' ┆ '))); n++;
    const tb = await p.$eval('#tip', (t) => { const r = t.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
    const x0 = Math.max(0, Math.min(bx.x, tb.x) - 10), y0 = Math.max(0, Math.min(bx.y, tb.y) - 10);
    await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + label.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40) + '.png'),
      clip: { x: x0, y: y0, width: Math.min(W - x0, Math.max(bx.x + bx.width, tb.x + tb.width) - x0 + 10), height: Math.min(H - y0, Math.max(bx.y + bx.height, tb.y + tb.height) - y0 + 10) } });
    await p.mouse.move(5, H - 10); await wait(100); };
  /* CHANGED 2026-09-30 (D-068, his L-06/L-07): the "no moment" column left the table — what it held stands in the ENDPOINT METADATA,
     one card per block, after the table; each card photographed, the metadata's title and three of its chips hovered */
  const nmCards = () => p.$$eval('#mometa .mcard', (cs) => cs.map((c) => c.getAttribute('data-f') + ': ' + c.innerText.replace(/\s+/g, ' ').trim().slice(0, 160)));
  const workFns = () => p.$$eval('#mogrid td[data-mom="work"][data-f="fn"] .mc', (cs) => cs.map((c) => ((c.querySelector('.mt') || c).textContent || '').replace(/\s+/g, ' ').trim()));
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('d064-open-cooking-sessions', '#board tr.row[data-ep="POST /cooking/sessions"] td.id', 'the row POST /cooking/sessions');
  await center('#sec-mo'); say('D-064 (2) · the endpoint metadata, card by card (D-068: where the no-moment column went)', await nmCards());
  say('D-064 (2) · the band', await p.$eval('#moband', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 300)));
  say('D-064 (2) · the box, at its start', await p.evaluate(() => { const G = document.getElementById('mogrid'); return { box: G.clientWidth, table: G.scrollWidth, at: G.scrollLeft, metadataAfter: document.getElementById('mometa').previousElementSibling.id }; }));
  // each card brought to the middle of the window and photographed there, below the pinned row (a full-page capture resizes the window)
  { await p.mouse.move(5, H - 10); await p.evaluate(() => window.hoverHide && window.hoverHide());
    const fams = await p.$$eval('#mometa .mcard', (cs) => cs.map((c) => c.getAttribute('data-f')));
    for (const f of fams) { await p.$eval('#mometa .mcard[data-f="' + f + '"]', (e) => e.scrollIntoView({ block: 'center' })); await wait(150);
      const r = await p.evaluate((f0) => { const c = document.querySelector('#mometa .mcard[data-f="' + f0 + '"]').getBoundingClientRect(),
        pin = document.getElementById('pin'), pb = pin && pin.getBoundingClientRect().height ? pin.getBoundingClientRect().bottom : 0, y = Math.max(c.top - 6, pb, 0);
        return { x: Math.max(0, c.left - 6), y, width: Math.min(innerWidth - Math.max(0, c.left - 6), c.width + 12), height: Math.max(40, Math.min(c.bottom + 6, innerHeight) - y) }; }, f);
      n++; await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-d064-metadata-' + f + '.png'), clip: r });
      say('D-064 (2) · the metadata card of ' + f + ' photographed', { h: Math.round(r.height) }); } }
  await hoverSay('d064 hover the metadata title', '#mometa h3[data-tip="nmhead"]');
  await hoverSay('d064 hover the handler file and line', '#mometa .nmc[data-nmk="file"]');
  await hoverSay('d064 hover the outline', '#mometa .nmc[data-nmk="sig"]');
  await hoverSay('d064 hover the cluster', '#mometa .nmc[data-nmk="cl"]');
  // (1) the allergen check behind start_session, per code (which square is which is read off the page's data; the clicks are the mouse's)
  const codeOf = (pred) => p.evaluate((pr) => { const R = window.AE_DATA.rows.find((q) => q.id === 'POST /cooking/sessions'); return R.mo.ex.findIndex(pr === 404 ? (x) => x[1] === 404 : (x) => x[1] === 201 && JSON.stringify(x[9] || []).includes(pr)); }, pred);
  for (const [name, pr] of [['the-replay-201', 'existing is not None'], ['the-404', 404], ['the-first-run-201', 'fall']]) { const i = await codeOf(pr), sel = '#mobar .mopath[data-path="' + i + '"]';
    await center('#mobar'); await step('d064-path-' + name, sel, 'the code "' + (await txt(sel)) + '"');
    say('D-064 (1) · ' + name + ' · the work\'s functions', await workFns()); }
  await center('#mobar'); await step('d064-all-paths-again', '#mobar .mopath[data-path="all"]', 'the square "' + (await txt('#mobar .mopath[data-path="all"]')) + '"');
  // the code map's hide header, before and after the square (was "47 of 56 · 6 left · 3 with nothing here")
  say('D-064 (2) · the code map\'s header, show all', await p.$eval('#cvcount', (e) => e.textContent));
  await center('#ocol-cm .opt[data-carry="hide"]'); await step('d064-carry-hide', '#ocol-cm .opt[data-carry="hide"]', 'the square "' + (await txt('#ocol-cm .opt[data-carry="hide"]')) + '"');
  say('D-064 (2) · the code map\'s header, hide', await p.$eval('#cvcount', (e) => e.textContent));
  say('D-064 (2) · the code map\'s fields left in hide', await p.$$eval('#ocol-cm .pair[data-k]', (fs) => fs.filter((e) => e.offsetParent && !/^[ce]$/.test(e.getAttribute('data-cvs'))).map((e) => (e.querySelector('.pk') || {}).textContent)));
  await center('#ocol-cm .opt[data-carry="all"]'); await step('d064-carry-show-all', '#ocol-cm .opt[data-carry="all"]', 'the square "' + (await txt('#ocol-cm .opt[data-carry="all"]')) + '" (my pick)'); }
if (go('d064r')) { // the review of D-064 (2026-09-28), LAST, on POST /cooking/sessions: BY MOMENT photographed from the section's top with its last column,
  // "no moment", in view (the box wheeled sideways to its end; a tall section in 8,000 px pieces); the entity chip and the file:line in
  // that column hovered — CHANGED 2026-09-30 (D-068): that column left the table, so BY MOMENT is photographed with its endpoint
  // metadata after the table (the box at its start) and the two chips are hovered there; the replay 201 picked (assert_recipe_allergen_safe no longer on it), all paths again; the code map in hide, its
  // header photographed, then show all again
  const E = 'POST /cooking/sessions';
  const center = async (sel) => { await p.$eval(sel, (e) => e.scrollIntoView({ block: 'center' })); await wait(150); };
  const hoverPic = async (label, sel) => { const e = await p.$(sel); if (!e) { say('MISSING ' + label, sel); return; } await e.scrollIntoViewIfNeeded(); await wait(100); const bx = await e.boundingBox();
    await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await wait(250);
    say(label, await p.$eval('#tip', (t) => t.innerText.replace(/\n+/g, ' ┆ '))); n++;
    const tb = await p.$eval('#tip', (t) => { const r = t.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
    const x0 = Math.max(0, Math.min(bx.x, tb.x) - 10), y0 = Math.max(0, Math.min(bx.y, tb.y) - 10);
    await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + label.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 44) + '.png'),
      clip: { x: x0, y: y0, width: Math.min(W - x0, Math.max(bx.x + bx.width, tb.x + tb.width) - x0 + 10), height: Math.min(H - y0, Math.max(bx.y + bx.height, tb.y + tb.height) - y0 + 10) } });
    await p.mouse.move(5, H - 10); await wait(100); };
  // BY MOMENT from the section's top: the window as tall as the section (a piece at most 8,000 px), the page at the section's top less the
  // pinned row, the box wheeled to its end — a photo of the window, never a full-page capture (that resizes the window, and BY MOMENT redraws)
  const secPics = async (name) => { const hs = await p.$eval('#sec-mo', (e) => Math.ceil(e.getBoundingClientRect().height)); const pieces = Math.ceil(hs / 8000);
    for (let k = 0; k < pieces; k++) { const ph = Math.min(8000, hs - k * 8000);
      const pinH = await p.evaluate(() => { const q = document.getElementById('pin'); return q ? Math.ceil(q.getBoundingClientRect().height) : 0; });
      await p.setViewportSize({ width: W, height: ph + pinH + 16 }); await wait(500);
      await p.evaluate(([k0, pinH0]) => { const t = document.getElementById('sec-mo').getBoundingClientRect().top + scrollY; window.scrollTo(0, Math.max(0, t + k0 * 8000 - pinH0 - 8)); }, [k, pinH]); await wait(250);
      await p.mouse.move(5, 5); await p.evaluate(() => window.hoverHide && window.hoverHide()); await wait(120);
      n++; await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + name + (pieces > 1 ? '-' + (k + 1) : '') + '.png') });
      /* CHANGED 2026-09-30 (D-068): the no-moment column left the table; the endpoint metadata stands after it, its cards read here */
      say('review of D-064 · BY MOMENT photographed from its top' + (pieces > 1 ? ', piece ' + (k + 1) + ' of ' + pieces : ''), { section: hs, window: ph + pinH + 16,
        box: await p.evaluate(() => { const G = document.getElementById('mogrid'); return { box: G.clientWidth, table: G.scrollWidth, at: G.scrollLeft }; }),
        metadata: await p.$eval('#mometa', (m) => ({ after: m.previousElementSibling.id, cards: [...m.querySelectorAll('.mcard')].map((c) => c.getAttribute('data-f')) })) }); }
    await p.setViewportSize({ width: W, height: H }); await wait(500); };
  const open0 = await p.$eval('#mohead h3', (h) => h.getAttribute('aria-label')).catch(() => null);
  if (open0 !== E) { await p.evaluate(() => window.scrollTo(0, 0)); await wait(150); await step('d064r-open-cooking-sessions', '#board tr.row[data-ep="' + E + '"] td.id', 'the row ' + E); }
  say('review of D-064 · BY MOMENT is open on', await p.$eval('#mohead h3', (h) => h.getAttribute('aria-label')));
  await secPics('d064r-by-moment-and-its-metadata');
  // the entity chip and the file:line, in the endpoint metadata now (D-068), hovered with the mouse
  await center('#mometa .nmc[data-nmk="ent"]'); await hoverPic('d064r hover the entity chip', '#mometa .nmc[data-nmk="ent"]');
  await center('#mometa .nmc[data-nmk="file"]'); await hoverPic('d064r hover the file and line', '#mometa .nmc[data-nmk="file"]');
  // the replay 201: which square is which is read off the page's data; the click is the mouse's
  const iRe = await p.evaluate((ep) => { const R = window.AE_DATA.rows.find((q) => q.id === ep); return R.mo.ex.findIndex((x) => x[1] === 201 && JSON.stringify(x[9] || []).includes('existing is not None')); }, E);
  const selRe = '#mobar .mopath[data-path="' + iRe + '"]';
  await center('#mobar'); await step('d064r-pick-the-replay-201', selRe, 'the code "' + (await txt(selRe)) + '"');
  const work = await p.$$eval('#mogrid td[data-mom="work"][data-f="fn"] .mc', (cs) => cs.map((c) => ((c.querySelector('.mt') || c).textContent || '').replace(/\s+/g, ' ').trim()));
  say('review of D-064 · the replay 201 · the work\'s functions', { work, assertRecipeAllergenSafe: work.includes('assert_recipe_allergen_safe') });
  { await center('#mogrid tr[data-f="fn"]'); await p.mouse.move(5, H - 10); await p.evaluate(() => window.hoverHide && window.hoverHide()); await wait(150);
    const r = await p.evaluate(() => { const tr = document.querySelector('#mogrid tr[data-f="fn"]').getBoundingClientRect(), G = document.getElementById('mogrid').getBoundingClientRect(),
      bar = document.getElementById('mobar').getBoundingClientRect(), pin = document.getElementById('pin'), pb = pin && pin.getBoundingClientRect().height ? pin.getBoundingClientRect().bottom : 0,
      y = Math.max(Math.min(tr.top, bar.top) - 6, pb, 0); return { x: Math.max(0, G.left - 6), y, width: Math.min(innerWidth, G.right + 6) - Math.max(0, G.left - 6), height: Math.max(40, Math.min(tr.bottom + 6, innerHeight) - y) }; });
    n++; await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-d064r-replay-201-functions.png'), clip: r }); }
  await center('#mobar'); await step('d064r-all-paths-again', '#mobar .mopath[data-path="all"]', 'the square "' + (await txt('#mobar .mopath[data-path="all"]')) + '"');
  // the code map in hide: its header photographed
  await center('#ocol-cm .opt[data-carry="hide"]'); await step('d064r-code-map-hide', '#ocol-cm .opt[data-carry="hide"]', 'the square "' + (await txt('#ocol-cm .opt[data-carry="hide"]')) + '"');
  say('review of D-064 · the code map\'s header, hide', await p.$eval('#cvcount', (e) => e.textContent));
  { await center('#cvcount'); await p.mouse.move(5, H - 10); await p.evaluate(() => window.hoverHide && window.hoverHide()); await wait(150);
    const r = await p.$eval('#cvcount', (e) => { const h = e.closest('h3').getBoundingClientRect(); return { x: Math.max(0, h.left - 8), y: Math.max(0, h.top - 8), width: h.width + 16, height: h.height + 16 }; });
    n++; await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-d064r-code-map-hide-header.png'), clip: { x: r.x, y: r.y, width: Math.min(W - r.x, r.width), height: Math.min(H - r.y, r.height) } }); }
  await center('#ocol-cm .opt[data-carry="all"]'); await step('d064r-code-map-show-all', '#ocol-cm .opt[data-carry="all"]', 'the square "' + (await txt('#ocol-cm .opt[data-carry="all"]')) + '" (my pick)'); }
if (go('d065')) { // D-065 (his ruling 2026-09-28, "build A and B") and its review (J1–J8), LAST, on POST /cooking/sessions: BY MOMENT photographed from
  // the section's top with the box at its start ("before any request") and wheeled to "after the answer" (the Proof row's journey chips
  // at the two outer moments); C250's before chip and its after chip hovered; "every step a chip" pressed, photographed, and back; the 404
  // picked (the journeys gone), all paths again; then DELETE /pantry/items/{item_id}: C705's two calls here, each its own chip, photographed
  // and the second one hovered. Which chip is which is read off the page's attributes; every click and hover is the mouse's
  const E = 'POST /cooking/sessions', E705 = 'DELETE /pantry/items/{item_id}';
  const center = async (sel) => { await p.$eval(sel, (e) => e.scrollIntoView({ block: 'center' })); await wait(150); };
  const boxY = async () => { const g = await p.$('#mogrid'), bx = await g.boundingBox();
    const pb = await p.evaluate(() => { const q = document.getElementById('pin'); return q && q.getBoundingClientRect().height ? q.getBoundingClientRect().bottom : 0; });
    return { bx, y: Math.min(bx.y + bx.height - 20, Math.max(bx.y + 20, pb + 40, 60), (p.viewportSize() || { height: H }).height - 20) }; };
  // the box wheeled sideways by the mouse: to its start, or until a target (a column head, a chip) stands inside it
  const wheelBox = async (target) => { const { bx, y } = await boxY(); await p.mouse.move(bx.x + bx.width / 2, y);
    for (let k = 0; k < 60; k++) { const st = await p.evaluate((t) => { const G = document.getElementById('mogrid'), g = G.getBoundingClientRect();
        if (!t) return G.scrollLeft <= 0 ? 0 : -1; const e = document.querySelector(t); if (!e) return 0; const r = e.getBoundingClientRect(); return r.left < g.left + 4 ? -1 : r.right > g.right - 4 ? 1 : 0; }, target);
      if (!st) break; await p.mouse.wheel(st * 240, 0); await wait(60); }
    await p.mouse.move(5, 5); await p.evaluate(() => window.hoverHide && window.hoverHide()); await wait(120);
    return p.evaluate(() => { const G = document.getElementById('mogrid'); return { box: G.clientWidth, table: G.scrollWidth, at: G.scrollLeft }; }); };
  // BY MOMENT from the section's top: the window as tall as the section (a piece at most 8,000 px), the page at the section's top less the
  // pinned row, the box wheeled where asked — a photo of the window, never a full-page capture (that resizes the window, and BY MOMENT redraws)
  const secPics = async (name, target) => { const hs = await p.$eval('#sec-mo', (e) => Math.ceil(e.getBoundingClientRect().height)); const pieces = Math.ceil(hs / 8000);
    for (let k = 0; k < pieces; k++) { const ph = Math.min(8000, hs - k * 8000);
      const pinH = await p.evaluate(() => { const q = document.getElementById('pin'); return q ? Math.ceil(q.getBoundingClientRect().height) : 0; });
      await p.setViewportSize({ width: W, height: ph + pinH + 16 }); await wait(500);
      await p.evaluate(([k0, pinH0]) => { const t = document.getElementById('sec-mo').getBoundingClientRect().top + scrollY; window.scrollTo(0, Math.max(0, t + k0 * 8000 - pinH0 - 8)); }, [k, pinH]); await wait(250);
      const sc = await wheelBox(target);
      n++; await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + name + (pieces > 1 ? '-' + (k + 1) : '') + '.png') });
      say('D-065 · ' + name + ' · BY MOMENT photographed from its top' + (pieces > 1 ? ', piece ' + (k + 1) + ' of ' + pieces : ''), { section: hs, window: ph + pinH + 16, box: sc }); }
    await p.setViewportSize({ width: W, height: H }); await wait(500); };
  // at 1920 px: a chip whose words overflow it, and a journey chip's word broken across two lines — both should be none
  const cutSay = async (label) => say(label, await p.evaluate(() => ({ cut: [...document.querySelectorAll('#mogrid .mc')].filter((c) => c.scrollWidth > c.clientWidth + 1).map((c) => c.innerText.slice(0, 40)),
    broken: [...document.querySelectorAll('#mogrid [data-jy] .mt, #mogrid [data-jy] .mq')].filter((x) => x.getClientRects().length > 1).map((x) => x.textContent) })));
  /* CHANGED 2026-09-30 (review CR-20): a journey's earlier requests stand at "earlier in the test" (prior), no longer "before any request" */
  const proofSay = async (label) => say(label, await p.evaluate(() => ['prior', 'after'].map((m) => m + ': ' + [...document.querySelectorAll('#mogrid td[data-mom="' + m + '"][data-f="proof"] [data-jy]')]
    .filter((c) => !c.parentElement.closest('[data-jy]')).map((c) => c.innerText.replace(/\s+/g, ' ').trim()).join(' | '))));
  const hoverPic = async (label, sel) => { const e = await p.$(sel); if (!e) { say('MISSING ' + label, sel); return; }
    await p.$eval(sel, (x) => { const r = x.getBoundingClientRect(); if (r.top < 120 || r.bottom > innerHeight - 40) x.scrollIntoView({ block: 'center' }); }); await wait(120);
    await wheelBox(sel); const bx = await e.boundingBox();
    await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await wait(250);
    say(label, await p.$eval('#tip', (t) => t.innerText.replace(/\n+/g, ' ┆ '))); n++;
    const tb = await p.$eval('#tip', (t) => { const r = t.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
    const x0 = Math.max(0, Math.min(bx.x, tb.x) - 10), y0 = Math.max(0, Math.min(bx.y, tb.y) - 10);
    await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + label.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 44) + '.png'),
      clip: { x: x0, y: y0, width: Math.min(W - x0, Math.max(bx.x + bx.width, tb.x + tb.width) - x0 + 10), height: Math.min(H - y0, Math.max(bx.y + bx.height, tb.y + tb.height) - y0 + 10) } });
    await p.mouse.move(5, H - 10); await wait(100); };
  const open0 = await p.$eval('#mohead h3', (h) => h.getAttribute('aria-label')).catch(() => null);
  if (open0 !== E) { await p.evaluate(() => window.scrollTo(0, 0)); await wait(150); await step('d065-open-cooking-sessions', '#board tr.row[data-ep="' + E + '"] td.id', 'the row ' + E); }
  say('D-065 · BY MOMENT is open on', await p.$eval('#mohead h3', (h) => h.getAttribute('aria-label')));
  say('D-065 · the journeys\' look, as the squares say', await p.$$eval('#mobar .opt[data-mopt="jy"]', (os) => os.map((o) => o.getAttribute('aria-label') + (o.getAttribute('aria-checked') === 'true' ? ' [pressed]' : '') + (getComputedStyle(o).borderTopStyle === 'dashed' ? ' {my pick}' : ''))));
  await proofSay('D-065 · Proof at the outer moments, all paths');
  await cutSay('D-065 · ' + E + ' · chips cut or words broken at ' + W + ' px');
  await secPics('d065-proof-before-any-request', null);
  await secPics('d065-proof-after-the-answer', '#mogrid .mom[data-mom="after"]');
  await center('#mogrid tr[data-f="proof"]');
  await hoverPic('d065 hover C250 before chip', '#mogrid td[data-mom="prior"][data-f="proof"] .mc[data-jy="C250|api"][data-side="b"]');
  await hoverPic('d065 hover C250 after chip', '#mogrid td[data-mom="after"][data-f="proof"] .mc[data-jy="C250|api"][data-side="a"]');
  const sqEach = '#mobar .opt[data-mopt="jy"][data-v="each"]', sqOne = '#mobar .opt[data-mopt="jy"][data-v="one"]';
  await center('#mobar'); await step('d065-every-step-a-chip', sqEach, 'the square "' + (await txt(sqEach)) + '"');
  await proofSay('D-065 · Proof at the outer moments, every step a chip');
  await secPics('d065-proof-every-step-a-chip-after', '#mogrid .mom[data-mom="after"]');
  await center('#mobar'); await step('d065-back-to-a-chip-per-journey', sqOne, 'the square "' + (await txt(sqOne)) + '" (my pick)');
  // the 404: which square it is is read off the page's data; the click is the mouse's
  const i404 = await p.evaluate((ep) => window.AE_DATA.rows.find((q) => q.id === ep).mo.ex.findIndex((x) => x[1] === 404), E), sel404 = '#mobar .mopath[data-path="' + i404 + '"]';
  await center('#mobar'); await step('d065-pick-the-404', sel404, 'the code "' + (await txt(sel404)) + '"');
  await proofSay('D-065 · Proof at the outer moments, the 404 picked');
  await secPics('d065-the-404-journeys-gone', null);
  await center('#mobar'); await step('d065-all-paths-again', '#mobar .mopath[data-path="all"]', 'the square "' + (await txt('#mobar .mopath[data-path="all"]')) + '"');
  // DELETE /pantry/items/{item_id}: C705 calls it twice (step 4 → 404, step 5 → 200), each call its own chip before any request
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('d065-open-delete-pantry-item', '#board tr.row[data-ep="' + E705 + '"] td.id', 'the row ' + E705);
  say('D-065 · BY MOMENT is open on', await p.$eval('#mohead h3', (h) => h.getAttribute('aria-label')));
  await proofSay('D-065 · ' + E705 + ' · Proof at the outer moments');
  await cutSay('D-065 · ' + E705 + ' · chips cut or words broken at ' + W + ' px');
  await secPics('d065-delete-pantry-item-c705-two-calls', null);
  await center('#mogrid tr[data-f="proof"]');
  await hoverPic('d065 hover C705 step 5 chip', '#mogrid td[data-mom="prior"][data-f="proof"] .mc[data-jy="C705|api"][data-k="5"]'); }
if (go('d066')) { // D-066 ROUND 1 (his note "API Hover Legend Consolidation"; D-067 … D-071 and the round-1 review fixes), LAST, on POST
  // /cooking/sessions: each item of the note shown as he would meet it — a hover by the mouse, an option by a click on its square, a part
  // of the bench moved by a real drag — and ONE ELEMENT picture per step (the row, the cell region, the hover box with what it hovers, the
  // bench column), never the whole page. Every step is tagged in walk.json ("round1": item · option · value) so a picture is found by the
  // item it answers. An option is put back to its default by a click once it is photographed; that click is a step too, photographed small
  const E = 'POST /cooking/sessions', R1 = [];
  /* D-081: from here the page is on its own defaults — the looks he ruled (a head's click puts every item on one line, fit wraps into bands, Data effects a
     small map per moment, the bench an upper and a lower row) and a table wider than its box opening fitted (R-11): the storage cleared, the page loaded again */
  await p.evaluate(() => { try { for (const k of Object.keys(localStorage)) if (/^gabe:allep/.test(k)) localStorage.removeItem(k); } catch (e) {} });
  await p.goto('file://' + path.join(HERE, 'all-endpoints.html')); await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 20000 }); await wait(300);
  if (n < 292) n = 292;                                                     /* the new pictures are numbered after his earlier ones (… 292) */
  const VH = () => (p.viewportSize() || { height: H }).height;
  const clear = async () => { await p.mouse.move(5, VH() - 10); await p.evaluate(() => window.hoverHide && window.hoverHide()); await wait(120); };
  const fname = (name) => String(++n).padStart(2, '0') + '-d066-' + name + '.png';
  const rec = (name, file, t, what) => { const e = Object.assign({ n, file, item: t[0] }, t[1] ? { option: t[1], value: t[2] } : {}, what || {}); R1.push(e); say('D-066 · ' + n + ' · ' + name, e); };
  const pinB = () => p.evaluate(() => { const q = document.getElementById('pin'); return q && q.getBoundingClientRect().height ? Math.max(0, q.getBoundingClientRect().bottom) : 0; });
  const words = (h) => h.evaluate((e) => (e.getAttribute('aria-label') || e.innerText || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 140));
  const boxOf = (h) => h.evaluate((e) => (e.closest('#mogrid') ? '#mogrid' : e.closest('#exgrid') ? '#exgrid' : null));
  const lands = (x, y, sel) => p.evaluate(([x0, y0, s0]) => { const h = document.elementFromPoint(x0, y0), e0 = document.querySelector(s0); return !!h && !!e0 && (h === e0 || e0.contains(h)); }, [x, y, sel]);
  // a box that scrolls sideways (BY MOMENT's, the bench's) wheeled by the mouse until `sel` stands inside it ('start' · 'end': its ends)
  const wheelBox = async (sel, box) => { const g = await p.$(box); if (!g) return;
    for (let k = 0; k < 40; k++) {
      const dx = await p.evaluate(([s0, b0]) => { const G = document.querySelector(b0), gb = G.getBoundingClientRect(), max = G.scrollWidth - G.clientWidth;
        if (s0 === 'start') return G.scrollLeft > 0 ? -Math.min(600, G.scrollLeft) : 0;
        if (s0 === 'end') return G.scrollLeft < max - 1 ? Math.min(600, max - G.scrollLeft) : 0;
        const e = document.querySelector(s0); if (!e) return 0; const r = e.getBoundingClientRect();
        if (r.width > gb.width - 8) return r.left < gb.left + 2 && G.scrollLeft > 0 ? -Math.min(600, gb.left + 2 - r.left) : 0;
        if (r.left < gb.left + 2 && G.scrollLeft > 0) return -Math.min(600, gb.left + 12 - r.left);
        if (r.right > gb.right - 2 && G.scrollLeft < max - 1) return Math.min(600, r.right - gb.right + 12);
        return 0; }, [sel, box]);
      if (!dx) break;
      const gb = await g.boundingBox(), pb = await pinB(), y = Math.min(gb.y + gb.height - 20, VH() - 20, Math.max(gb.y + 20, pb + 30));
      await p.mouse.move(gb.x + gb.width / 2, y); await p.mouse.wheel(dx, 0); await wait(90); }
    await clear(); };
  // the picture: a clip of the window (a full-page capture resizes the window, and BY MOMENT redraws on a resize) — or, for the bench, which
  // does not redraw, a clip of the full page (`page`), so a column taller than the window below the pinned row is whole
  const clipShot = async (name, c, t, what, page) => { const f = fname(name), lim = page ? 1e9 : VH();
    const x = Math.max(0, Math.round(c.x)), y = Math.max(0, Math.round(c.y)), clip = { x, y, width: Math.min(Math.round(c.width), W - x), height: Math.max(20, Math.min(Math.round(c.height), lim - y)) };
    await p.screenshot(Object.assign({ path: path.join(OUT, f), clip }, page ? { fullPage: true } : {})); rec(name, f, t, Object.assign({ size: [clip.width, clip.height] }, what || {})); };
  const rectOf = (sels, pad) => p.evaluate(([ss, pd]) => { let r = null; const pin = document.getElementById('pin'), pb = pin && pin.getBoundingClientRect().height ? Math.max(0, pin.getBoundingClientRect().bottom) : 0;
    for (const s0 of ss) { const e = document.querySelector(s0); if (!e) continue; const b = e.getBoundingClientRect(), bx = e.closest('#mogrid, #exgrid'); let l = b.left, rr = b.right;
      if (bx) { const g = bx.getBoundingClientRect(); l = Math.max(l, g.left); rr = Math.min(rr, g.right); }
      r = r ? { l: Math.min(r.l, l), t: Math.min(r.t, b.top), r: Math.max(r.r, rr), b: Math.max(r.b, b.bottom) } : { l, t: b.top, r: rr, b: b.bottom }; }
    if (!r) return null; const y = Math.max(r.t - pd, pb); return { x: r.l - pd, y, width: r.r - r.l + 2 * pd, height: r.b + pd - y }; }, [sels, pad == null ? 8 : pad]);
  // an element brought to the middle of the window below the pinned row (its top under the row when it is taller), then photographed
  const place = async (sel) => { const pb0 = await pinB(); await p.evaluate(([s0, pb]) => { const e = document.querySelector(s0); if (!e) return; e.scrollIntoView({ block: 'center' });
      const r = e.getBoundingClientRect(), pin = document.getElementById('pin'), pb1 = pin && pin.offsetHeight ? pin.offsetHeight : pb, avail = innerHeight - pb1;
      window.scrollBy(0, r.height + 20 < avail ? r.top - pb1 - (avail - r.height) / 2 : r.top - pb1 - 8); }, [sel, pb0]); await wait(220); };
  const elShot = async (name, sels, t, what, o) => { o = o || {}; if (!(await p.$(sels[0]))) { say('MISSING ' + name, sels[0]); return; }
    await clear(); if (!o.stay) await place(sels[0]); if (o.wheel) await wheelBox(o.wheel, o.box || '#mogrid'); await clear();
    const r = await rectOf(sels, o.pad); if (!r) { say('MISSING ' + name, sels.join(' + ')); return; } await clipShot(name, r, t, what); };
  // the page at its top first: scrolled, the pinned row (sticky) would be drawn over the clip
  const pageShot = async (name, sels, t, what) => { sels = [].concat(sels); if (!(await p.$(sels[0]))) { say('MISSING ' + name, sels[0]); return; } await clear();
    await p.evaluate(() => window.scrollTo(0, 0)); await wait(200);
    const r = await p.evaluate((ss) => { let u = null; for (const s0 of ss) { const e = document.querySelector(s0); if (!e) continue; const b = e.getBoundingClientRect(), bx = e.closest('#mogrid, #exgrid'), g = bx ? bx.getBoundingClientRect() : b;
        const l = Math.max(b.left, g.left), rr = Math.min(b.right, g.right); u = u ? { l: Math.min(u.l, l), t: Math.min(u.t, b.top), r: Math.max(u.r, rr), b: Math.max(u.b, b.bottom) } : { l, t: b.top, r: rr, b: b.bottom }; }
      return u ? { x: u.l + scrollX - 8, y: u.t + scrollY - 8, width: u.r - u.l + 16, height: u.b - u.t + 16 } : null; }, sels);
    if (!r) { say('MISSING ' + name, sels.join(' + ')); return; } await clipShot(name, r, t, what, true); };
  // a row of BY MOMENT, right under its heads (which ride under the pinned row), the box at its start or wheeled to `wheel`; `pin` keeps
  // the pinned row in the picture
  const rowShot = async (name, rows, t, what, o) => { o = o || {}; if (!(await p.$(rows[0]))) { say('MISSING ' + name, rows[0]); return; } await clear();
    await p.evaluate((s0) => { const tr = document.querySelector(s0), T = tr.closest('table'), hd = T.tHead, pin = document.getElementById('pin'), ph = pin && pin.offsetHeight ? pin.offsetHeight : 0;
      window.scrollTo(0, Math.max(0, tr.getBoundingClientRect().top + scrollY - ph - (hd ? hd.offsetHeight : 0) - 4)); }, rows[0]); await wait(300);
    await wheelBox(o.wheel || 'start', '#mogrid');
    const r = await p.evaluate(([ss, wp]) => { const G = document.getElementById('mogrid').getBoundingClientRect(), pin = document.getElementById('pin'), pb = pin && pin.offsetHeight ? Math.max(0, pin.getBoundingClientRect().bottom) : 0;
      let b = 0; for (const s0 of ss) { const e = document.querySelector(s0); if (e) b = Math.max(b, e.getBoundingClientRect().bottom); }
      const y = wp ? 0 : pb; return { x: G.left - 4, y, width: G.width + 8, height: b + 6 - y }; }, [rows, !!o.pin]);
    await clipShot(name, r, t, what); };
  // the top of BY MOMENT's table — its stages, its moments and the rows named — with the head in its own place (not riding)
  const topShot = async (name, rows, t, what, o) => { o = o || {}; await clear();
    await p.evaluate((above) => { const T = document.querySelector('#mogrid table.motab'), a = above ? document.querySelector(above) : null, pin = document.getElementById('pin'), ph = pin && pin.offsetHeight ? pin.offsetHeight : 0;
      const top = (a || T).getBoundingClientRect().top + scrollY; window.scrollTo(0, Math.max(0, top - ph - 12)); }, o.above || null); await wait(300);
    await wheelBox(o.wheel || 'start', '#mogrid');
    const r = await p.evaluate(([ss, above]) => { const G = document.getElementById('mogrid').getBoundingClientRect(), T = document.querySelector('#mogrid table.motab').getBoundingClientRect(), a = above ? document.querySelector(above).getBoundingClientRect() : null;
      let b = document.querySelector('#mogrid table.motab thead').getBoundingClientRect().bottom; for (const s0 of ss) { const e = document.querySelector(s0); if (e) b = Math.max(b, e.getBoundingClientRect().bottom); }
      const y = (a ? Math.min(a.top, T.top) : T.top) - 6, x = a ? Math.min(G.left, a.left) : G.left; return { x: x - 4, y, width: Math.max(G.right, a ? a.right : 0) - x + 8, height: b + 6 - y }; }, [rows, o.above || null]);
    await clipShot(name, r, t, what); };
  // the mouse to an element and the hover photographed with what it hovers (`at`: 'left' points at its first letters)
  const hoverShot = async (name, sel, t, what, o) => { o = o || {}; const e = await p.$(sel); if (!e) { say('MISSING ' + name, sel); return null; }
    await clear(); await e.evaluate((x) => x.scrollIntoView({ block: 'center' })); await wait(150);
    const bx0 = await boxOf(e); if (bx0) await wheelBox(sel, bx0);
    const b = await e.boundingBox(), at = o.at === 'left' ? [b.x + Math.min(10, b.width / 2), b.y + b.height / 2] : [b.x + b.width / 2, b.y + b.height / 2];
    if (!(await lands(at[0], at[1], sel))) say('COVERED ' + name, sel);
    await p.mouse.move(at[0], at[1], { steps: 4 }); await wait(320);
    const tp = await p.$eval('#tip', (q) => { const r = q.getBoundingClientRect(); return { show: q.getAttribute('data-show') === 'true', text: q.innerText.replace(/\n+/g, ' ┆ '), l: r.left, t: r.top, r: r.right, b: r.bottom }; });
    if (!tp.show) say('NO HOVER ' + name, sel);
    const x0 = Math.min(b.x, tp.show ? tp.l : b.x) - 10, y0 = Math.min(b.y, tp.show ? tp.t : b.y) - 10, x1 = Math.max(b.x + b.width, tp.show ? tp.r : 0) + 10, y1 = Math.max(b.y + b.height, tp.show ? tp.b : 0) + 10;
    await clipShot(name, { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, t, Object.assign({ hover: await words(e), tip: tp.show ? tp.text : null }, what || {}));
    await clear(); return tp; };
  // a control clicked by the mouse at its centre (brought to the middle of the window, its box wheeled to it), then `shoot` photographs
  // what the click changed
  const press = async (name, sel, t, shoot, what) => { const e = await p.$(sel); if (!e) { say('MISSING ' + name, sel); return false; }
    await clear(); await e.evaluate((x) => x.scrollIntoView({ block: 'center' })); await wait(150);
    const bx0 = await boxOf(e); if (bx0) await wheelBox(sel, bx0);
    const b = await e.boundingBox(), w0 = await words(e), cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    if (!(await lands(cx, cy, sel))) say('COVERED ' + name, sel);
    await p.mouse.click(cx, cy); await wait(450);
    await shoot(name, t, Object.assign({ click: w0, at: [Math.round(cx), Math.round(cy)] }, what || {})); return true; };
  // L-34: a TIGHT crop of the region that changes — from one head to another across the table that holds them, the head rows and the body rows down to
  // `row` (never the whole table); the box wheeled until both heads are inside; the entry is marked `region` so the review page never takes it for a crop of the options
  const cropShot = async (name, t, what, spec) => {
    const ok0 = await p.evaluate((sp) => { document.querySelectorAll('[data-wcrop]').forEach((x) => x.removeAttribute('data-wcrop'));
      const pick = (root, s0, at) => { const l = root.querySelectorAll(s0); return l.length ? (at === 'last' ? l[l.length - 1] : l[0]) : null; }, z0 = pick(document, sp.to, sp.toAt), a0 = z0 && pick(z0.closest('table'), sp.from, sp.fromAt);   /* `from` is looked for in the table that holds `to` (the bands split the heads) */
      if (!a0 || !z0) return false; a0.setAttribute('data-wcrop', 'from'); z0.setAttribute('data-wcrop', 'to'); return true; }, spec);
    if (!ok0) { say('MISSING ' + name, spec.from + ' … ' + spec.to); return; } await clear();
    await p.evaluate(() => { const T = document.querySelector('[data-wcrop="from"]').closest('table'), pin = document.getElementById('pin'), ph = pin && pin.offsetHeight ? pin.offsetHeight : 0;
      window.scrollTo(0, Math.max(0, T.getBoundingClientRect().top + scrollY - ph - 12)); }); await wait(300);
    await wheelBox('[data-wcrop="from"]', '#mogrid'); await wheelBox('[data-wcrop="to"]', '#mogrid'); await clear();
    const r = await p.evaluate((sp) => { const a = document.querySelector('[data-wcrop="from"]'), z = document.querySelector('[data-wcrop="to"]'), T = a.closest('table'), rw = T.querySelector(sp.row) || T.tBodies[0].rows[0];
      const ar = a.getBoundingClientRect(), zr = z.getBoundingClientRect(), hd = T.tHead.getBoundingClientRect(), rb = rw.getBoundingClientRect();
      const x0 = sp.w ? (sp.at === 'to' ? zr.left : ar.left) + (sp.dx || 0) : ar.left - 4; return { x: x0, y: hd.top - 6, width: sp.w || zr.right - ar.left + 8, height: rb.bottom - hd.top + 12 }; }, spec);
    await clipShot(name, r, t, Object.assign({ region: true }, what || {})); };
  const S = { el: (sels, o) => (nm, t, w) => elShot(nm, sels, t, w, o), row: (rows, o) => (nm, t, w) => rowShot(nm, rows, t, w, o), top: (rows, o) => (nm, t, w) => topShot(nm, rows, t, w, o),
    page: (sels) => (nm, t, w) => pageShot(nm, sels, t, w) };
  const sq = (g, v) => '#mobar .opt[data-mopt="' + g + '"][data-v="' + v + '"]', grp = (g) => '#mobar .mgrp[data-mopt="' + g + '"]';
  const rsq = (f, g, v) => '#mogrid tbody th[data-f="' + f + '"] .mrop .opt[data-mopt="' + g + '"][data-v="' + v + '"]', rgrp = (f, g) => '#mogrid tbody th[data-f="' + f + '"] .mrop .mgrp[data-mopt="' + g + '"]';
  const ROW = (f) => '#mogrid tbody tr[data-f="' + f + '"]', HEAD = (f) => '#mogrid tbody th[data-f="' + f + '"]', MAP = '#mogrid tbody tr.mdxr';
  const CELL = (m, f) => '#mogrid td[data-mom="' + m + '"][data-f="' + f + '"]';
  // an item found by the words on it (the page's data is not asked); marked so the mouse can go to it
  const markNth = (scope, i) => p.evaluate(([sc, k]) => { document.querySelectorAll('[data-w66]').forEach((x) => x.removeAttribute('data-w66'));
    const c = document.querySelectorAll(sc)[k]; if (!c) return null; c.setAttribute('data-w66', '1'); return '[data-w66="1"]'; }, [scope, i]);
  const mark = (scope, lead, exact) => p.evaluate(([sc, w, ex]) => { document.querySelectorAll('[data-w66]').forEach((x) => x.removeAttribute('data-w66'));
    const c = [...document.querySelectorAll(sc)].find((x) => { const s0 = x.innerText.replace(/\s+/g, ' ').trim(); return ex ? s0 === w : s0.startsWith(w); });
    if (!c) return null; c.setAttribute('data-w66', '1'); return '[data-w66="1"]'; }, [scope, lead, !!exact]);

  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await press('open-cooking-sessions', '#board tr.row[data-ep="' + E + '"] td.id', ['D-066'], S.el(['#sec-mo .sec-head']));
  say('D-066 · BY MOMENT is open on', await p.$eval('#mohead h3', (h) => h.getAttribute('aria-label')).catch(() => null));

  /* L-01 · L-02 · L-22: one hover per ending, in before · checks · gives — pointed at by its kind label ("refusal"), which once hovered apart */
  const END409 = CELL('checks', 'end') + ' .mc[data-key="status:409"]';
  await hoverShot('hover-an-ending-by-its-label', END409 + ' .vc-kind', ['L-01 L-02 L-22', 'ipo', 'lines'], null, { at: 'left' });
  await press('hovers-as-one-sentence', sq('ipo', 'sent'), ['L-22', 'ipo', 'sent'], S.el([grp('ipo')]));
  await hoverShot('hover-the-ending-one-sentence', END409 + ' .vc-kind', ['L-01 L-02 L-22', 'ipo', 'sent'], null, { at: 'left' });
  await press('hovers-back-to-labelled-lines', sq('ipo', 'lines'), ['L-22', 'ipo', 'lines'], S.el([grp('ipo')]));
  /* L-03: the two 429s at the edge, each its own words */
  for (const [i, nm] of [[0, 'hover-the-first-429'], [1, 'hover-the-second-429']]) { const s9 = await markNth(CELL('edge', 'end') + ' .mc[data-key="status:429"]', i);
    if (s9) await hoverShot(nm, s9, ['L-03']); else say('MISSING ' + nm, CELL('edge', 'end')); }
  /* L-04: the Endings row's legend on its name (his placement, ruled); the other place, above the table */
  await hoverShot('hover-the-endings-row-name', HEAD('end') + ' .mbn', ['L-04', 'leg', 'hover']);
  await press('legend-above-the-table', sq('leg', 'strip'), ['L-04', 'leg', 'strip'], S.page([grp('leg'), '#moleg']));   /* taller than the window */
  await press('legend-back-on-the-row-name', sq('leg', 'hover'), ['L-04', 'leg', 'hover'], S.el([grp('leg')]));

  /* L-05 · L-34: the header and saving — his words "I can't see the difference … they show the same thing", so each option's picture is only the region that
     changes, a tight crop taken after the click: the stage band over the moment heads from the work to the saving (stages over moments: the bracket "one of 4
     ways" sits on the heads · stages, roads, moments: a row of roads between them), and the commit column under its stage (saving under EFFECTS: its own cell ·
     under HANDLER: an outline beside it) with the rows below it as far as Data effects */
  const HDR = { from: 'thead th.mom[data-mom="fail"]', to: '#mogrid th.mom[data-face^="saving"]', w: 560, dx: -4, at: 'from', row: 'tbody tr[data-f="end"]' };
  const SAVE = { from: 'thead th.mom[data-mom="fail"]', fromAt: 'last', to: '#mogrid th.mom[data-face^="saving"]', w: 480, dx: -250, at: 'to', row: 'tbody tr[data-f="end"]' };
  const at2 = (spec) => (nm, t, w) => cropShot(nm, t, w, spec);
  await cropShot('header-stages-over-moments', ['L-05 L-34', 'hdr', 'band'], null, HDR);
  await press('header-stages-roads-moments', sq('hdr', 'road'), ['L-05 L-34', 'hdr', 'road'], at2(HDR));
  await press('header-back-to-the-band', sq('hdr', 'band'), ['L-05', 'hdr', 'band'], S.el([grp('hdr')]));
  await cropShot('saving-under-effects', ['L-05 L-34', 'save', 'eff'], null, SAVE);
  await press('saving-under-handler', sq('save', 'hand'), ['L-05 L-34', 'save', 'hand'], at2(SAVE));
  await press('saving-back-under-effects', sq('save', 'eff'), ['L-05', 'save', 'eff'], S.el([grp('save')]));

  /* L-06 · L-07: the endpoint metadata out of the table, after it (my pick) · before it */
  await pageShot('the-endpoint-metadata-after-the-table', ['#mogrid table.motab:last-of-type tbody tr[data-f="stage"]', '#mometa'], ['L-06 L-07', 'meta', 'after']);   /* the last band's last row above it (D-081: the table opens fitted into bands) */
  await press('metadata-before-the-table', sq('meta', 'before'), ['L-06 L-07', 'meta', 'before'], S.page([grp('meta'), '#mometa', '#mogrid table.motab thead']));
  await press('metadata-back-after-the-table', sq('meta', 'after'), ['L-06 L-07', 'meta', 'after'], S.el([grp('meta')]));

  /* L-20: a row's head carries its columns of the pinned row; "deciders" lights the members BY MOMENT draws (and its pinned-row cell) */
  await elShot('the-functions-row-head-columns', [HEAD('fn') + ' .mbh', HEAD('fn') + ' .msub'], ['L-20']);
  await press('light-the-deciders', HEAD('fn') + ' .msc[data-mcol="deciders"]', ['L-20'], S.row([ROW('fn')], { pin: true }));
  say('D-066 · deciders lit', await p.evaluate(() => ({ chips: [...document.querySelectorAll('#mogrid .colon[data-keys]')].map((e) => (e.querySelector('.mt') || e).textContent.trim().slice(0, 40)), pin: !!document.querySelector('#pin td[data-mocol]') })));
  await press('deciders-put-out', HEAD('fn') + ' .msc[data-mcol="deciders"]', ['L-20'], S.el([HEAD('fn') + ' .msub']));

  /* L-21 · R-11: a click on a head widens its column (every item on one line, his ruling); its × hides it, the bar lists it; the table opens FITTED into bands (his
     ruling, R-11) and the fit button turns that off and on; the other values of "a head's click" and "fit"; the heads ride under the pinned row when the page
     scrolls (and the other value, they stay at the top) */
  await press('widen-at-the-edge', '#mogrid th.mom[data-mom="edge"] .mh1', ['L-21', 'wid', 'line'], S.top([ROW('end'), ROW('proof')]));
  await press('widen-names-whole', sq('wid', 'names'), ['L-21', 'wid', 'names'], S.top([ROW('end'), ROW('proof')], { above: grp('wid') }));
  await press('widen-back-to-one-line', sq('wid', 'line'), ['L-21', 'wid', 'line'], S.el([grp('wid')]));
  { const hx = '#mogrid th.mom[data-mom="start"] .mohx', h0 = await p.$('#mogrid th.mom[data-mom="start"]');   /* the × shows when the mouse is on the head */
    if (h0) { await h0.evaluate((x) => x.scrollIntoView({ block: 'center' })); await wait(120); await wheelBox('start', '#mogrid'); const hb = await h0.boundingBox(); await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2, { steps: 3 }); await wait(200); }
    await press('hide-before-any-request', hx, ['L-21'], S.top([], { above: '#mobar .mohid' })); }
  await topShot('the-table-opens-fitted', [ROW('end'), ROW('proof')], ['L-21 R-11', 'fit', 'bands'], null, { above: grp('fit') });
  say('D-066 · fit', await p.evaluate(() => { const G = document.getElementById('mogrid'); return { box: G.clientWidth, table: G.scrollWidth, tables: G.querySelectorAll('table.motab').length, strips: G.querySelectorAll('th.mom.mmin').length }; }));
  { const t2 = await p.$$('#mogrid table.motab'); say('D-066 · fit, wrapped into bands', { tables: t2.length });   /* the second band: its own heads, further down */
    if (t2.length > 1) { await clear(); await p.evaluate(() => { const T = document.querySelectorAll('#mogrid table.motab')[1], pin = document.getElementById('pin'), ph = pin && pin.offsetHeight ? pin.offsetHeight : 0;
        window.scrollTo(0, Math.max(0, T.getBoundingClientRect().top + scrollY - ph - 12)); }); await wait(300);
      const r = await p.evaluate(() => { const T = document.querySelectorAll('#mogrid table.motab')[1], G = document.getElementById('mogrid').getBoundingClientRect(), tb = T.getBoundingClientRect(), rws = T.querySelectorAll('tbody tr[data-f]');
        const b = rws[1] ? rws[1].getBoundingClientRect().bottom : tb.top + 400; return { x: G.left - 4, y: tb.top - 6, width: G.width + 8, height: b - tb.top + 12 }; });
      await clipShot('fit-the-second-band', r, ['L-21', 'fit', 'bands'], { look: 'the second band, further down' }); } else say('MISSING the second band', '#mogrid table.motab'); }
  await press('fit-off', '#mofit', ['L-21 R-11'], S.top([ROW('end'), ROW('proof')], { above: grp('fit') }));
  say('D-066 · fit off', await p.evaluate(() => { const G = document.getElementById('mogrid'); return { box: G.clientWidth, table: G.scrollWidth, hint: !document.getElementById('moscroll').hidden }; }));
  await press('fit-on-again', '#mofit', ['L-21 R-11'], S.el([grp('fit')]));
  await press('fit-narrow-the-rest', sq('fit', 'min'), ['L-21', 'fit', 'min'], S.top([ROW('end'), ROW('proof')], { above: grp('fit') }));
  await press('fit-back-to-bands', sq('fit', 'bands'), ['L-21', 'fit', 'bands'], S.el([grp('fit')]));
  await press('show-all-columns', '#mobar .mohall', ['L-21'], S.el(['#mobar .mset[data-set="cols"]']));
  await press('widen-given-back', '#mogrid th.mom[data-mom="edge"] .mh1', ['L-21'], S.top([ROW('end')]));
  // the page scrolled by the wheel until Functions stands under the pinned row: the heads ride with it (my pick) · stay at the top
  const scrollTo = async (sel) => { await clear(); await p.mouse.move(W / 2, VH() / 2);
    for (let k = 0; k < 40; k++) { const top = await p.$eval(sel, (e) => e.getBoundingClientRect().top), pb = await pinB();
      if (top < pb + 260 && top > pb + 60) break; await p.mouse.wheel(0, Math.max(-500, Math.min(500, top - pb - 160))); await wait(120); }
    await clear(); };
  const scrolledShot = async (name, t, what) => { await scrollTo(ROW('fn')); const r = await p.evaluate(() => { const G = document.getElementById('mogrid').getBoundingClientRect(); return { x: G.left - 4, y: 0, width: G.width + 8, height: Math.min(innerHeight, 640) }; });
    await clipShot(name, r, t, what); };
  await scrolledShot('heads-ride-when-scrolled', ['L-21', 'stk', 'ride'], { scrolled: 'by the wheel, to Functions' });
  await press('heads-stay-at-the-top', sq('stk', 'stay'), ['L-21', 'stk', 'stay'], S.el([grp('stk')]));
  await scrolledShot('heads-stay-when-scrolled', ['L-21', 'stk', 'stay'], { scrolled: 'by the wheel, to Functions' });
  await press('heads-back-to-ride', sq('stk', 'ride'), ['L-21', 'stk', 'ride'], S.el([grp('stk')]));

  /* L-09 · L-10 · L-11: the Gates row (default look); its options slot: the looks A and C, the effect e2, gate icons one · none, gate
     roles R1 · R3 · off; then the RateLimitMiddleware head and the sensitive limit hovered */
  await rowShot('the-gates-row', [ROW('gate')], ['L-09 L-10 L-11', 'gdl', 'head']);
  await press('open-the-gates-row-options', HEAD('gate') + ' .mro', ['L-09 L-10 L-11'], S.el([HEAD('gate') + ' .mbh', HEAD('gate') + ' .mrop']));
  const GOPT = [['gdl', 'chain', 'gates-look-a-one-chain-per-gate', 'L-09 L-10'], ['gdl', 'cols', 'gates-look-c-side-by-side', 'L-09 L-10'], ['gdl', 'head', null, 'L-09 L-10'],
    ['gef', 'stage', 'effect-e2-a-colour-per-stage', 'L-10'], ['gef', 'end', null, 'L-10'],
    ['gic', 'one', 'gate-icons-one', 'L-09'], ['gic', 'none', 'gate-icons-none', 'L-09'], ['gic', 'each', null, 'L-09'],
    ['grl', 'what', 'gate-roles-r1-what-it-does', 'L-11'], ['grl', 'guards', 'gate-roles-r3-what-it-guards', 'L-11'], ['grl', 'off', 'gate-roles-off', 'L-11'], ['grl', 'where', null, 'L-11']];
  for (const [g, v, nm, it] of GOPT) await press(nm || (g + '-back-to-' + v), rsq('gate', g, v), [it, g, v], nm ? S.row([ROW('gate')]) : S.el([rgrp('gate', g)]));
  /* L-18: Standard or specialist — M1 split into the gates (my pick), M2 merged into them, M3 kept as its row */
  await rowShot('standard-m1-split-into-the-gates', [ROW('gate')], ['L-18', 'std', 'split']);
  await press('standard-m2-merged-into-the-gates', rsq('gate', 'std', 'merge'), ['L-18', 'std', 'merge'], S.row([ROW('gate')]));
  await press('standard-m3-kept-as-its-row', rsq('gate', 'std', 'keep'), ['L-18', 'std', 'keep'], S.row([ROW('std')]));
  await press('standard-back-to-split', rsq('gate', 'std', 'split'), ['L-18', 'std', 'split'], S.el([rgrp('gate', 'std')]));
  await press('close-the-gates-row-options', HEAD('gate') + ' .mro', ['L-09 L-10 L-11 L-18'], S.el([HEAD('gate') + ' .mbh']));
  await hoverShot('hover-the-gates-row-head', HEAD('gate') + ' .mbn', ['L-18']);
  await hoverShot('hover-ratelimitmiddleware', CELL('edge', 'gate') + ' .mgh .mgh0[data-key="middleware:RateLimitMiddleware"]', ['L-09']);
  await hoverShot('hover-the-sensitive-limit', CELL('edge', 'gate') + ' .mc[data-key="limiter:sensitive"]', ['L-09 L-10']);

  /* L-12: Data effects — a small map per moment (his ruling), one map for the endpoint under the row, the chips; the write colour, his words' colours */
  await rowShot('data-effects-a-small-map-per-moment', [ROW('data')], ['L-12', 'dfx', 'cell']);
  await press('open-the-data-row-options', HEAD('data') + ' .mro', ['L-12'], S.el([HEAD('data') + ' .mbh', HEAD('data') + ' .mrop']));
  await press('data-effects-one-map-for-the-endpoint', rsq('data', 'dfx', 'one'), ['L-12', 'dfx', 'one'], S.row([ROW('data'), MAP]));
  await press('data-effects-as-chips', rsq('data', 'dfx', 'chips'), ['L-12', 'dfx', 'chips'], S.row([ROW('data')]));
  await press('data-effects-back-to-a-map-per-moment', rsq('data', 'dfx', 'cell'), ['L-12', 'dfx', 'cell'], S.el([rgrp('data', 'dfx')]));
  await press('write-colour-his-words', rsq('data', 'dxc', 'his'), ['L-12', 'dxc', 'his'], S.row([ROW('data')]));
  await press('write-colour-back-to-the-page', rsq('data', 'dxc', 'page'), ['L-12', 'dxc', 'page'], S.el([rgrp('data', 'dxc')]));
  await press('close-the-data-row-options', HEAD('data') + ' .mro', ['L-12'], S.el([HEAD('data') + ' .mbh']));

  /* L-13 · L-14: the Functions row with its marks (my pick) · name and role only; a function known by name only, hovered */
  await rowShot('the-functions-row-with-marks', [ROW('fn')], ['L-13 L-14', 'fnm', 'on']);
  await press('open-the-functions-row-options', HEAD('fn') + ' .mro', ['L-13'], S.el([HEAD('fn') + ' .mbh', HEAD('fn') + ' .mrop']));
  await press('functions-marks-off', rsq('fn', 'fnm', 'off'), ['L-13', 'fnm', 'off'], S.row([ROW('fn')]));
  await press('functions-marks-back-on', rsq('fn', 'fnm', 'on'), ['L-13', 'fnm', 'on'], S.el([rgrp('fn', 'fnm')]));
  await press('close-the-functions-row-options', HEAD('fn') + ' .mro', ['L-13'], S.el([HEAD('fn') + ' .mbh']));
  { const vf = await mark(CELL('work', 'fn') + ' .mc', 'ResolutionSnapshot.violations_for');
    if (vf) await hoverShot('hover-resolutionsnapshot-violations-for', vf, ['L-14']); else say('MISSING ResolutionSnapshot.violations_for', 'the work'); }

  /* L-15: the refresh chip after the answer · L-16: the line that reads 403 */
  await hoverShot('hover-the-refresh-chip', CELL('after', 'client') + ' .mc:has(.mrf)', ['L-15'], null, { at: 'left' });
  { const r403 = await mark(CELL('after', 'client') + ' .mgb > .mc', 'reads 403');
    if (r403) await hoverShot('hover-the-reads-403-line', r403, ['L-16'], null, { at: 'left' }); else say('MISSING the line that reads 403', 'after the answer'); }

  /* L-17: the in-flight values as lifelines (my pick) — the row from its start and wheeled to its end; the folded rate limiter opened;
     a read dot hovered; then the echoes and the chips */
  await rowShot('in-flight-lifelines', [ROW('inf')], ['L-17', 'ifl', 'lane']);
  await rowShot('in-flight-lifelines-to-the-end', [ROW('inf')], ['L-17', 'ifl', 'lane'], { wheeled: 'the box to its end' }, { wheel: 'end' });
  await press('open-the-rate-limiter-lane', CELL('start', 'inf') + ' .milf[data-fold]', ['L-17'], S.row([ROW('inf')]));
  await press('fold-the-rate-limiter-lane', CELL('start', 'inf') + ' .milh[data-fold]', ['L-17'], S.el([CELL('start', 'inf')]));
  { const dot = await p.evaluate(() => { document.querySelectorAll('[data-w66]').forEach((x) => x.removeAttribute('data-w66'));
      const d = [...document.querySelectorAll('#mogrid td[data-mom="checks"][data-f="inf"] .mild')].find((x) => /409/.test(x.innerText)); if (!d) return null; d.setAttribute('data-w66', '1'); return '[data-w66="1"]'; });
    if (dot) await hoverShot('hover-a-read-dot', dot, ['L-17'], null, { at: 'left' }); else say('MISSING the read dot at the checks', 'In-flight'); }
  await press('open-the-in-flight-row-options', HEAD('inf') + ' .mro', ['L-17'], S.el([HEAD('inf') + ' .mbh', HEAD('inf') + ' .mrop']));
  await press('in-flight-echoes-where-read', rsq('inf', 'ifl', 'echo'), ['L-17', 'ifl', 'echo'], S.row([ROW('inf')]));
  await press('in-flight-chips-where-set', rsq('inf', 'ifl', 'chips'), ['L-17', 'ifl', 'chips'], S.row([ROW('inf')]));
  await press('in-flight-back-to-lifelines', rsq('inf', 'ifl', 'lane'), ['L-17', 'ifl', 'lane'], S.el([rgrp('inf', 'ifl')]));
  await press('close-the-in-flight-row-options', HEAD('inf') + ' .mro', ['L-17'], S.el([HEAD('inf') + ' .mbh']));

  /* CR-20: a test's earlier requests — their own moment (my pick) · in Proof's head */
  await press('open-the-proof-row-options', HEAD('proof') + ' .mro', ['CR-20'], S.row([ROW('proof')]));
  await press('earlier-requests-in-proofs-head', rsq('proof', 'jyb', 'head'), ['CR-20', 'jyb', 'head'], S.row([ROW('proof')]));
  await press('earlier-requests-back-to-their-moment', rsq('proof', 'jyb', 'prior'), ['CR-20', 'jyb', 'prior'], S.row([ROW('proof')]));
  await press('close-the-proof-row-options', HEAD('proof') + ' .mro', ['CR-20'], S.el([HEAD('proof') + ' .mbh']));

  /* L-23: THE EXAMPLES BENCH — whole; each column's block (the bench wheeled to it); the test column on C267 by its own arrows, its chain
     opened, then C250; a REAL drag of a part into "not drawn"; the size and colour controls; a role chip; a column on every endpoint;
     the copy line; the bench's two other layouts */
  const XC = (k) => '#exgrid .excol[data-k="' + k + '"]';
  await pageShot('the-examples-bench', '#sec-ex', ['L-23 L-36', 'lay', 'half']);
  for (const k of await p.$$eval('#exgrid .excol', (cs) => cs.map((c) => c.getAttribute('data-k')))) {
    await clear(); await p.$eval(XC(k), (e) => e.scrollIntoView({ block: 'nearest' })).catch(() => {}); await wheelBox(XC(k), '#exgrid');
    await pageShot('bench-column-' + k, XC(k), [{ test: 'L-23 L-08 L-36', fn: 'L-23 L-13 L-36', gate: 'L-23 L-11 L-36' }[k] || 'L-23 L-36'], { column: await p.$eval(XC(k) + ' h3', (h) => h.textContent).catch(() => k) }); }
  // the test column: its own arrows until it shows C267 (each click read off the arrow); one picture of where they land
  const stepTo = async (want) => { const clicks = []; for (let k = 0; k < 16; k++) {
      const at = await p.evaluate(([c0, w]) => { const s0 = document.querySelector(c0 + ' .exselect'); if (!s0) return null; const vs = [...s0.options].map((o) => o.value); return { i: vs.indexOf(s0.value), j: vs.indexOf(w) }; }, [XC('test'), want]);
      if (!at || at.j < 0 || at.i === at.j) break; const arrow = XC('test') + ' .expick > button.exstep:' + (at.j > at.i ? 'last' : 'first') + '-of-type';
      await p.$eval(arrow, (e) => e.scrollIntoView({ block: 'center' })); await wheelBox(arrow, '#exgrid'); const b = await (await p.$(arrow)).boundingBox();
      clicks.push(await words(await p.$(arrow))); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await wait(250); }
    return clicks; };
  { const c1 = await stepTo('case:C267'); await pageShot('test-column-on-c267', XC('test'), ['L-23 L-08'], { clicks: c1.length, arrow: c1[0] || null, shows: await p.$eval(XC('test') + ' .exselect', (s0) => s0.value) }); }
  await press('test-c267-open-its-chain', XC('test') + ' .blk .bkhd', ['L-23 L-08'], S.page(XC('test')));
  { const FL = XC('test') + ' .blk .exfl';   /* the open list scrolls inside the block (a window of 380 px): wheeled by the mouse to its end, one picture */
    const st0 = await p.$eval(FL, (e) => ({ max: e.scrollHeight - e.clientHeight, h: e.clientHeight, all: e.scrollHeight })).catch(() => null);
    if (st0 && st0.max > 2) { await clear(); await p.$eval(FL, (e) => e.scrollIntoView({ block: 'center' })); await wait(150); const b = await (await p.$(FL)).boundingBox();
      await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      for (let k = 0; k < 40; k++) { if (await p.$eval(FL, (e) => e.scrollTop >= e.scrollHeight - e.clientHeight - 2)) break; await p.mouse.wheel(0, 600); await wait(60); }
      await pageShot('test-c267-the-chain-wheeled-to-its-end', XC('test') + ' .exw', ['L-23 L-08'], { wheeled: 'inside the open block, to its end', list: st0 }); }
    else say('MISSING the open chain\'s scroll', FL); }
  { const c2 = await stepTo('case:C250'); await pageShot('test-column-on-c250', XC('test'), ['L-23 L-08'], { clicks: c2.length, arrow: c2[0] || null, shows: await p.$eval(XC('test') + ' .exselect', (s0) => s0.value) }); }
  await press('test-block-closed-again', XC('test') + ' .blk .bkhd', ['L-23'], S.page(XC('test')));
  // the table column: its parts, then a REAL drag — the mouse down on the part "model", moved over "not drawn", up
  { const from = XC('table') + ' .exz[data-line="2"] .expc[data-part="model"]', to = XC('table') + ' .exz.exoff';
    if ((await p.$(from)) && (await p.$(to))) { await clear(); await p.$eval(from, (e) => e.scrollIntoView({ block: 'center' })); await wait(150); await wheelBox(from, '#exgrid');
      const a = await (await p.$(from)).boundingBox(), z = await (await p.$(to)).boundingBox(), fw = await words(await p.$(from));
      await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(a.x + a.width / 2 + 6, a.y + a.height / 2 + 6, { steps: 2 });
      await p.mouse.move(z.x + Math.min(40, z.width / 2), z.y + z.height / 2, { steps: 12 }); await wait(120); await p.mouse.up(); await wait(400);
      const after = await p.evaluate((c0) => ({ drawn: !!document.querySelector(c0 + ' .blk [data-part="model"]'), tray: [...document.querySelectorAll(c0 + ' .exz.exoff .expc')].map((x) => x.getAttribute('data-part')) }), XC('table'));
      if (after.drawn || after.tray.indexOf('model') < 0) say('DRAG DID NOT LAND', after);
      await pageShot('drag-model-into-not-drawn', XC('table'), ['L-23'], { drag: fw, from: [Math.round(a.x + a.width / 2), Math.round(a.y + a.height / 2)], to: [Math.round(z.x + Math.min(40, z.width / 2)), Math.round(z.y + z.height / 2)], after }); }
    else say('MISSING the part "model" or "not drawn"', from); }
  await press('table-size-of-name', XC('table') + ' .exz .expc[data-part="name"]', ['L-23 L-36'], S.page(XC('table')));
  await press('table-back-to-the-default', XC('table') + ' .exreset', ['L-23'], S.page(XC('table')));
  // the gate column: a role chip, then every endpoint
  await press('gate-column-role-field-rule', XC('gate') + ' .exrc[data-role="rule"]', ['L-23 L-11'], S.page(XC('gate')));
  await press('gate-column-every-role-again', XC('gate') + ' .exrc[data-role=""]', ['L-23 L-11'], S.el([XC('gate') + ' .exroles'], { box: '#exgrid' }));
  await press('gate-column-every-endpoint', XC('gate') + ' .exscope .opt[data-v="all"]', ['L-23', 'scope', 'all'], S.page(XC('gate')));
  await press('gate-column-back-to-this-endpoint', XC('gate') + ' .exscope .opt[data-v="here"]', ['L-23', 'scope', 'here'], S.el([XC('gate') + ' .exsel'], { box: '#exgrid' }));
  // the copy line: what the button copies is read off a watched clipboard (the page cannot be asked)
  await p.evaluate(() => { window.__w66copied = null; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (s1) => { window.__w66copied = s1; return Promise.resolve(); } } }); });
  await press('table-copy-line', XC('table') + ' .excopy', ['L-23'], S.el([XC('table') + ' .excp'], { box: '#exgrid' }));
  say('D-066 · the table\'s copy line, as copied', await p.evaluate(() => window.__w66copied));
  // the bench's layouts: wrapped rows · one row across the page · back to an upper and a lower row (his ruling)
  await press('bench-wrapped-rows', '#exbar .opt[data-xopt="lay"][data-v="wrap"]', ['L-23', 'lay', 'wrap'], S.page('#sec-ex'));
  await press('bench-one-row-across-the-page', '#exbar .opt[data-xopt="lay"][data-v="row"]', ['L-23', 'lay', 'row'], S.page('#sec-ex'));
  await press('bench-back-to-an-upper-and-a-lower-row', '#exbar .opt[data-xopt="lay"][data-v="half"]', ['L-23', 'lay', 'half'], S.el(['#exbar']));

  /* L-36 · the bench's icon squares: a hover is a verb and its object; each column's width — compact, most compact, full — and back to dynamic (my pick) */
  await hoverShot('hover-an-icon-square-every-endpoint', XC('gate') + ' .exscope .opt[data-v="all"]', ['L-36']);
  await hoverShot('hover-an-icon-square-the-copy-button', XC('table') + ' .excopy', ['L-36']);
  for (const v of ['compact', 'tight', 'full']) await press('width-' + v, XC('end') + ' .exwidth .opt[data-v="' + v + '"]', ['L-36'], S.page(XC('end')));
  await press('width-back-to-dynamic', XC('end') + ' .exwidth .opt[data-v="dynamic"]', ['L-36'], S.el([XC('end') + ' .extop'], { box: '#exgrid' }));

  /* L-35 · what each bench look would show after it is picked: the column as drawn (the look "as drawn" keeps it), then — by a real drag of one title-line part
     into "not drawn" — the same column changed (the look "change it" is made with exactly these controls); each pair is tagged for the review page */
  const dragPart = async (k) => { const part = await p.evaluate((c0) => { const z = [...document.querySelectorAll(c0 + ' .exz:not(.exoff) .expc')].filter((x) => !['icon', 'name'].includes(x.getAttribute('data-part'))); return z.length ? z[z.length - 1].getAttribute('data-part') : null; }, XC(k));
    if (!part) return null; const from = XC(k) + ' .exz:not(.exoff) .expc[data-part="' + part + '"]', to = XC(k) + ' .exz.exoff';
    await clear(); await p.$eval(from, (e) => e.scrollIntoView({ block: 'center' })); await wait(150);
    const a = await (await p.$(from)).boundingBox(), z = await (await p.$(to)).boundingBox();
    await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(a.x + a.width / 2 + 6, a.y + a.height / 2 + 6, { steps: 2 });
    await p.mouse.move(z.x + Math.min(40, z.width / 2), z.y + z.height / 2, { steps: 12 }); await wait(120); await p.mouse.up(); await wait(400);
    const left = await p.evaluate(([c0, q]) => !!document.querySelector(c0 + ' .blk [data-part="' + q + '"]'), [XC(k), part]);
    if (left) say('DRAG DID NOT LAND', k + ' · ' + part); return part; };
  for (const k of ['end', 'schema', 'fn', 'test', 'gate', 'hook', 'inf']) {
    if (!(await p.$(XC(k) + ' .blk'))) { say('MISSING depict ' + k, XC(k)); continue; }
    await pageShot('depict-' + k + '-as-drawn', XC(k), ['L-35'], { depict: ['ex.kind.' + k + ':drawn:after', 'ex.kind.' + k + ':change:before'], kind: k, column: await p.$eval(XC(k) + ' h3', (h) => h.textContent) });
    const part = await dragPart(k);
    if (part) await pageShot('depict-' + k + '-one-part-dragged-out', XC(k), ['L-35'], { depict: ['ex.kind.' + k + ':change:after'], kind: k, column: await p.$eval(XC(k) + ' h3', (h) => h.textContent), dragged: part });
    await press('depict-' + k + '-back-to-the-default', XC(k) + ' .exreset', ['L-35'], S.el([XC(k) + ' .excp'], { box: '#exgrid' })); }
  /* EX-5 · the function chip in BY MOMENT today, and the bench's function block it would take the look of */
  await elShot('ex5-a-function-chip-in-by-moment', [CELL('work', 'fn') + ' .mc'], ['EX-5'], { depict: ['EX-5:wait:after', 'EX-5:now:before'] });
  await pageShot('ex5-the-benchs-function-block', XC('fn') + ' .exw', ['EX-5'], { depict: ['EX-5:now:after'] });

  /* L-37 · the edge of a widened BY MOMENT column: widen it by its head, drag the edge with the mouse, move it by the arrow keys, give the width back */
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await press('l37-widen-the-edge-column', '#mogrid th.mom[data-mom="edge"] .mh1', ['L-37'], S.top([ROW('end')]));
  { const eg = await p.$('#mogrid .mowh');
    if (eg) { await eg.evaluate((e) => e.scrollIntoView({ block: 'center' })); await wait(150); const b0 = await eg.boundingBox();
      await p.mouse.move(b0.x + b0.width / 2, b0.y + 14); await p.mouse.down(); await p.mouse.move(b0.x + 60, b0.y + 14, { steps: 6 }); await p.mouse.move(b0.x + 170, b0.y + 14, { steps: 8 }); await wait(100);
      await p.mouse.up(); await wait(400);
      say('D-081 · the edge after the drag', await p.evaluate(() => { const h = document.querySelector('#mogrid .mowh'); return h ? [h.getAttribute('aria-valuemin'), h.getAttribute('aria-valuenow'), h.getAttribute('aria-valuemax')] : null; }));
      await topShot('l37-the-edge-dragged-right', [ROW('end')], ['L-37'], { dragged: 'to the right' }, { wheel: '[data-wedge]' });
      await p.focus('#mogrid .mowh'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await wait(400);
      await topShot('l37-the-edge-moved-left-by-the-keys', [ROW('end')], ['L-37'], { keys: 'ArrowLeft twice' }, { wheel: '[data-wedge]' }); }
    else say('MISSING the column edge', '#mogrid .mowh'); }
  await press('l37-click-the-head-to-give-the-width-back', '#mogrid th.mom[data-mom="edge"] .mh1', ['L-37'], S.top([ROW('end')]));

  /* L-38 · a table wider than its box, even fitted: a narrow window, the edge column at its largest, the hint line, then Shift and the mouse wheel */
  await p.setViewportSize({ width: 900, height: 1000 }); await wait(500);
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await press('l38-widen-the-edge-column', '#mogrid th.mom[data-mom="edge"] .mh1', ['L-38'], S.top([ROW('end')]));
  await p.focus('#mogrid .mowh'); await p.keyboard.press('End'); await wait(500);
  say('D-081 · the table wider than its box', await p.evaluate(() => { const G = document.getElementById('mogrid'); return { box: G.clientWidth, table: G.scrollWidth, hint: !document.getElementById('moscroll').hidden, text: document.getElementById('moscroll').textContent }; }));
  const hintShot = async (name, what) => { await clear(); await p.evaluate(() => { const m = document.getElementById('moscroll'), pin = document.getElementById('pin'), ph = pin && pin.offsetHeight ? pin.offsetHeight : 0;
      window.scrollTo(0, Math.max(0, m.getBoundingClientRect().top + scrollY - ph - 40)); }); await wait(300);
    const r2 = await p.evaluate(() => { const G = document.getElementById('mogrid'), m = document.getElementById('moscroll'), g = G.getBoundingClientRect(), m2 = m.getBoundingClientRect(), rw = G.querySelector('tbody tr[data-f]').getBoundingClientRect();
      return { x: g.left - 4, y: m2.top - 6, width: g.width + 8, height: rw.bottom - m2.top + 12 }; });
    await clipShot(name, r2, ['L-38'], Object.assign({ region: true }, what)); };
  await hintShot('l38-the-table-wider-than-its-box', { scrolled: 'not yet' });
  { const gb = await (await p.$('#mogrid')).boundingBox(); await p.mouse.move(gb.x + 300, Math.max(gb.y, 160) + 90); await p.keyboard.down('Shift'); await p.mouse.wheel(0, 400); await p.keyboard.up('Shift'); await wait(400);
    say('D-081 · after Shift and the wheel', await p.evaluate(() => document.getElementById('mogrid').scrollLeft)); }
  await hintShot('l38-slid-sideways-by-shift-and-the-wheel', { scrolled: 'by Shift and the wheel' });
  await p.setViewportSize({ width: W, height: H }); await wait(500); await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await press('l38-click-the-head-to-give-the-width-back', '#mogrid th.mom[data-mom="edge"] .mh1', ['L-38'], S.top([ROW('end')]));
  ROUND1 = R1; say('D-066 · round 1 · steps', R1.length); }
if (go('d084')) { // D-084 (his ruling 2026-10-02: F24 — the Client column is headed "sends it" — and L-19 ruled G2 — a Security row), LAST, on POST /cooking/sessions:
  // real clicks, the words read off each control — the head, the row, the option switched to "moved into Security" and back, a mark clicked to go to its fact.
  // Its pictures are numbered after everything above and are not part of the round-1 record (they answer his later note)
  const E = 'POST /cooking/sessions';
  await p.evaluate(() => { try { for (const k of Object.keys(localStorage)) if (/^gabe:allep/.test(k)) localStorage.removeItem(k); } catch (e) {} });
  await p.goto('file://' + path.join(HERE, 'all-endpoints.html')); await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 20000 }); await wait(300);
  const center = async (sel) => { await p.$eval(sel, (e) => e.scrollIntoView({ block: 'center' })); await wait(250); };
  const clear = async () => { await p.mouse.move(5, H - 10); await p.evaluate(() => window.hoverHide && window.hoverHide()); await wait(220); };   /* the mouse away: a hover card is not left over the row */
  const SEC = '#mogrid tbody tr[data-f="sec"]', mrop = (g, v) => '#mogrid tbody th[data-f="sec"] .mrop .opt[data-mopt="' + g + '"][data-v="' + v + '"]';
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('d084-open-cooking-sessions', '#board tr.row[data-ep="' + E + '"] td.id', 'the row ' + E);
  // F24 · the Client column's head, in the pinned row and in BY MOMENT's Client head; a click on the head in BY MOMENT lights what the column counts
  say('D-084 · F24 · the pinned row names the column', await p.$$eval('#pin [data-col="fetched"]', (ns) => ns.map((e) => e.textContent.trim()).filter(Boolean)));
  say('D-084 · F24 · BY MOMENT\'s Client head names it', await p.$$eval('#mogrid tbody th[data-f="client"] .msc', (ns) => ns.map((e) => e.textContent.trim())));
  await center('#mogrid tbody th[data-f="client"]');
  await step('d084-the-sends-it-head', '#mogrid tbody th[data-f="client"] .msc[data-mcol="fetched"]', 'the head "' + (await txt('#mogrid tbody th[data-f="client"] .msc[data-mcol="fetched"] .msh')) + '"');
  await pic('d084-the-sends-it-head-lit-in-the-pinned-row');
  await step('d084-the-sends-it-head-off', '#mogrid tbody th[data-f="client"] .msc[data-mcol="fetched"]', 'the same head, to turn the light off');
  // L-19 G2 · the Security row, as the page opens: the marks (my pick)
  await center(SEC);
  say('D-084 · the Security row', await p.$eval(SEC, (tr) => ({ head: tr.querySelector('th').innerText.replace(/\s+/g, ' '), cells: [...tr.querySelectorAll('td')].map((td) => [td.getAttribute('data-mom'), [...td.querySelectorAll('.mc')].map((c) => c.innerText.replace(/\s+/g, ' ').trim())]).filter((c) => c[1].length) })));
  await clear(); await pic('d084-the-security-row-marks-to-their-home-row');
  await step('d084-open-the-security-rows-options', SEC + ' th .mro', 'the options square on the row\'s head');
  await clear(); await pic('d084-the-option-the-marks-pressed-and-dashed');
  await step('d084-moved-into-security', mrop('secmv', 'moved'), 'the square "' + (await txt(mrop('secmv', 'moved'))) + '"');
  await center(SEC); await clear(); await pic('d084-the-security-row-with-the-facts-moved-in');
  await center('#mogrid tbody tr[data-f="end"]'); await clear(); await pic('d084-the-endings-row-without-the-401-and-429');
  await center(SEC);
  await step('d084-marks-to-their-home-row-again', mrop('secmv', 'marks'), 'the square "' + (await txt(mrop('secmv', 'marks'))) + '"');
  await center(SEC); await clear(); await pic('d084-the-security-row-back-to-marks');
  // a mark goes to its fact
  const mk = SEC + ' .mc[data-secmk="login"]';
  await step('d084-a-mark-goes-to-its-fact', mk, 'the mark "' + (await txt(mk)) + '"');
  await wait(250); await clear(); await pic('d084-the-endings-it-points-to-flash'); }
say('rows at the end', await rows());
say('page errors', errs);
// a step that could not be taken (its control or item missing, the mouse meeting something else, no hover, a drag that did not land) fails
// the walk: the pictures it names would otherwise be missing or wrong without anyone seeing
const missed = log.filter(([k]) => /^(MISSING|COVERED|NO HOVER|DRAG DID NOT LAND)/.test(k)).map(([k, v]) => k + ' · ' + (typeof v === 'string' ? v : JSON.stringify(v)));
say('steps not taken', missed);
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(Object.assign({ viewport: [W, H], log }, ROUND1 ? { round1: ROUND1 } : {}), null, 1));
await b.close();
if (missed.length || errs.length) process.exitCode = 1;
