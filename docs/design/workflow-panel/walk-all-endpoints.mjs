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
{ // D-053, LAST: the endings and the own checks as ONE table, in the order they happen — POST /recipe-creation/gustify (the operator's
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
{ // BY MOMENT (his ask 2026-09-26), LAST: the code map's copy button, then the section below ONE ENDPOINT — the endpoint's moments
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
  const CH = '#mogrid td[data-mom="gate"][data-f="data"] .mc[data-key="table:households"]';
  await center(CH); await step('light-households-in-by-moment', CH, 'the chip "' + (await txt(CH)).slice(0, 40) + '" in the dependencies\' column, Data effects');
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
{ // D-055 (his ruling 2026-09-26), LAST: POST /cooking/sessions, his example — the path row's codes and their hovers, the handler heads and
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
{ // D-056 (his ruling "agree with your recommendations"), LAST: the twelve adds, on POST /cooking/sessions (his example), then the file
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
  await hoverSay('d056 hover the race', '#mogrid td[data-mom="work"][data-f="data"] .mc:has(.mrc) .mt');
  await hoverSay('d056 hover the first 429', '#mogrid td[data-mom="edge"][data-f="end"] .mc .vc-status');
  await hoverSay('d056 hover the limiter', '#mogrid .mc[data-keys="limiter:sensitive"] .mt');
  await hoverSay('d056 hover the login check', '#mogrid td[data-mom="gate"][data-f="gate"] .mc[data-key^="fn:"] .mt');
  await hoverSay('d056 hover C237 hollow', '#mogrid .mc.hol .mt');
  await hoverSay('d056 hover C267', '#mogrid .mc[data-f="proof"][data-keys="case:C267"] .mt');
  const fates = () => p.$$eval('#mogrid .mc:has(.vc-fate)', (cs) => cs.map((c) => c.innerText.replace(/\s+/g, ' ').trim()));
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
{ // D-057 (his ruling "build 1 and 2"), LAST: POST /cooking/sessions — the switch's new count and hide; the two codes of the 201, hovered
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
  const sb = await chipBy('after', 'client', 'cookingSessionModel.ts:389'); if (sb) await hoverSay('d057 hover the client branch that reads 409', sb);
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
  const sc = await chipBy('after', 'client', 'SetupScreen.tsx:43'); if (sc) await hoverSay('d057 hover the setup client branch', sc);
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
  const sv = await chipBy('after', 'client', 'cookingSessionModel.ts:389'); if (sv) await center(sv); if (sv) await hoverSay('review hover the client branch after the answer', sv); else say('MISSING the client branch', 'after');
  const sn = await chipBy('work', 'fn', 'ResolutionSnapshot.violations_for'); if (sn) await center(sn); if (sn) await hoverSay('review hover a function known by name only', sn); else say('MISSING ResolutionSnapshot.violations_for', 'work');
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(150);
  await step('review-open-session-complete', '#board tr.row[data-ep="POST /cooking/sessions/{session_id}/complete"] td.id', 'the row POST /cooking/sessions/{session_id}/complete');
  await center('#mogrid td[data-mom="uncaught"][data-f="end"] .mc .vc-status'); await hoverSay('review hover the 500 of complete', '#mogrid td[data-mom="uncaught"][data-f="end"] .mc .vc-status'); }
{ // D-058 (his ruling 2026-09-26), LAST: POST /cooking/sessions — the Gabe Universe's own switch (show all, dim with a hover, hide), then
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
say('rows at the end', await rows());
say('page errors', errs);
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify({ viewport: [W, H], log }, null, 1));
await b.close();
