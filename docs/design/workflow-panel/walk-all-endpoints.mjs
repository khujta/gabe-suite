/* walk-all-endpoints.mjs — REAL mouse clicks only, from a cold load of all-endpoints.html through every thing a person does on it.

     node docs/design/workflow-panel/walk-all-endpoints.mjs        # writes shots/all-endpoints/*.png + walk.json · browser-gated, run it ALONE

   A click path handed to the operator comes from a walk like this one (memory: click paths from real clicks): the mouse moves to
   the control's centre and clicks, the words are read off the control, and each step is photographed with the control about to be
   clicked ringed. Nothing is selected by a script call; the page's data is READ only to know which control to look for. */
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname), REPO = path.resolve(HERE, '../../..'), OUT = path.join(HERE, 'shots/all-endpoints');
const PW = path.join(REPO, 'docs/design/graft-adoption/spike/_build/node_modules/playwright-core'), CHROME = '/usr/bin/google-chrome-stable';
const { chromium } = require(PW);
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const W = Number(process.env.VW || 1920), H = Number(process.env.VH || 1080);
const b = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--no-sandbox', '--disable-gpu-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.join(HERE, 'all-endpoints.html')); await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 20000 });
await p.evaluate(() => { try { for (const k of Object.keys(localStorage)) if (/^gabe:allep/.test(k)) localStorage.removeItem(k); } catch (e) {} });
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
  await el.scrollIntoViewIfNeeded(); await ring(sel); await wait(100);
  await pic(name);
  const box = await el.boundingBox(), label = await txt(sel);
  await unring();
  say('step ' + (n) + ' · ' + name, { click: label.slice(0, 70), at: [Math.round(box.x), Math.round(box.y)], size: [Math.round(box.width), Math.round(box.height)], note: note || null });
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await wait(400); return true; };
const rows = () => p.$$eval('#board tr.row[data-ep], #board .card[data-ep]', (els) => els.length);

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
  // one the code map does not carry: C1087, a case that only sets something up through this endpoint — its journey id, clicked
  const C2 = '#ocol-uni .urow[data-row="JOURNEYS"] [data-key="case:C1087"]';
  await center(C2);
  await step('light-a-case-the-code-map-lacks', C2, 'the journey C1087, in the universe column');
  say('lit: C1087, the code map says', await why());
  await center('#el-cm .elref[data-ref="gap"]');
  await step('click-not-carried', '#el-cm .elref[data-ref="gap"]', 'the link of "not carried"');
  say('the gaps turned', Object.assign({ dir: await p.$eval('#ocol-gaps', (e) => e.getAttribute('data-dir')) }, await why()));
  await onePic('the-gaps-turned-to-the-case');
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('clear-the-light-again', '#elclear', 'the clear link on the lit chip above the table');
  await center('#ocol-gaps .opt[data-gdir="cm"]');
  await step('gaps-back-to-this-way', '#ocol-gaps .opt[data-gdir="cm"]', 'the first square of THE GAPS, back to its default'); }
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
say('rows at the end', await rows());
say('page errors', errs);
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify({ viewport: [W, H], log }, null, 1));
await b.close();
