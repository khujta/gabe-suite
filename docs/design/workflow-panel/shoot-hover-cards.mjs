/* shoot-hover-cards.mjs — pictures of the hover card, by REAL hovers (the mouse on the element, not a call into the page), D-088.

     node docs/design/workflow-panel/shoot-hover-cards.mjs [--out DIR] [--only name,name]    (run it through `heavy`: one browser job at a time)

   On POST /cooking/sessions: one picture per kind of element the card draws — a table, a function, a schema, an ending, a gate, a test, a
   client hook, an in-flight value, a middleware, a security item — and two blocks of the examples bench; and, for the comparison, the
   endpoint lab's own card on its `locations` table block (endpoint-lab.html, read-only). Each picture is the element and its card, cut to
   the two with a margin. Nothing here asserts: the probe (probe-all-endpoints.mjs, section D-088) does that.

   D-089 — the ending block's HOVER REGIONS, each by a real hover on that part of the 429 ending (the sensitive limit) of the examples bench, the whole block in the picture with
   its card: 20-ending-glyph · 21-ending-status (the one glyph-and-status card, from either) · 22-ending-title (the block's full card) · 23-ending-where-<n> (n = 1, the where line,
   then each mark of the strip in order — one card per item of the last row). */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname), REPO = path.resolve(HERE, '../../..');
const args = process.argv.slice(2), opt = (k, d) => (args.indexOf(k) >= 0 ? args[args.indexOf(k) + 1] : d);
const OUT = path.resolve(opt('--out', path.join(HERE, 'shots/hover-cards'))), ONLY = opt('--only', null) ? opt('--only', '').split(',') : null;
const PW = path.join(REPO, 'docs/design/graft-adoption/spike/_build/node_modules/playwright-core'), CHROME = '/usr/bin/google-chrome-stable';
if (!fs.existsSync(CHROME) || !fs.existsSync(PW)) { console.log('SKIP — no system chrome / playwright-core on this host'); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });
const { chromium } = require(PW);
const E = 'POST /cooking/sessions';
/* [file name, what the picture shows, the element's selector, where it lives] — every selector names an element of the page, found by its own keys */
const MO = '#mogrid .mc[data-tip="mochip"]';
const SHOTS = [
  ['01-table', 'a table', '#mogrid .mdxn[data-keys="table:cooking_sessions"]'],
  ['02-function', 'a function', MO + '[data-keys="fn:apps/api/services/cooking.py::start_session"]'],
  ['03-schema', 'a schema (the request body)', MO + '[data-keys="schema:SessionCreateRequest"][data-ik="body"]'],
  ['04-ending', 'an ending (a refusal)', MO + '[data-ik="end:refusal"]'],
  ['05-gate', 'a gate (a check in a function)', MO + '[data-ik="guard"]'],
  ['06-test', 'a test', MO + '[data-keys="case:C237"]'],
  ['07-client-hook', 'a client hook', MO + '[data-ik="hook"]'],
  ['08-in-flight', 'an in-flight value', MO + '[data-ik="inflight"]'],
  ['09-middleware', 'a middleware', MO + '[data-ik="mw"]'],
  ['10-security', 'a security item (a mark to its row)', MO + '[data-ik="secmark"]'],
  ['11-bench-table', 'the examples bench: the table block', '#exgrid .excol[data-k="table"] .blk'],
  ['12-bench-function', 'the examples bench: the function block', '#exgrid .excol[data-k="fn"] .blk']];

const b = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--no-sandbox', '--disable-gpu-sandbox', '--disable-dev-shm-usage'] });
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const p = await ctx.newPage(), errs = [];
p.on('pageerror', (e) => errs.push(e.message));

/* the shot: scroll the element to the middle, put the mouse on it, wait for the card, cut the element + the card + a margin */
async function shoot(page, sel, tipSel, file, ctxSel) {
  const h = typeof sel === 'string' ? await page.$(sel) : sel; if (!h) { console.log('  MISSING ' + sel); return false; }
  await h.evaluate((x) => x.scrollIntoView({ block: 'center' })); await page.waitForTimeout(80);
  const bx = await h.boundingBox(); await page.mouse.move(bx.x + Math.min(bx.width / 2, 40), bx.y + bx.height / 2); await page.waitForTimeout(260);
  try { await page.waitForFunction((s) => { const e = document.querySelector(s); return e && !e.hidden && getComputedStyle(e).opacity === '1'; }, tipSel, { timeout: 3000 }); } catch (e) {}   /* the card has finished fading in */
  await page.waitForTimeout(80);
  const tb = await page.$eval(tipSel, (e) => { const r = e.getBoundingClientRect(); return e.hidden || r.width === 0 ? null : { x: r.x, y: r.y, width: r.width, height: r.height }; });
  if (!tb) { console.log('  NO CARD for ' + sel); await page.mouse.move(5, 5); return false; }
  const cx = ctxSel ? await (await page.$(ctxSel)).boundingBox() : null;                               /* D-089: the block the hovered part belongs to stays in the picture */
  const M = 14, x0 = Math.max(0, Math.min(bx.x, tb.x, cx ? cx.x : 1e9) - M), y0 = Math.max(0, Math.min(bx.y, tb.y, cx ? cx.y : 1e9) - M), x1 = Math.min(1920, Math.max(bx.x + bx.width, tb.x + tb.width, cx ? cx.x + cx.width : 0) + M), y1 = Math.min(1080, Math.max(bx.y + bx.height, tb.y + tb.height, cx ? cx.y + cx.height : 0) + M);
  await page.screenshot({ path: path.join(OUT, file), clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } }); await page.mouse.move(5, 5); await page.waitForTimeout(60); return true; }

await p.goto('file://' + path.join(HERE, 'all-endpoints.html')); await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 20000 });
await p.evaluate(() => { try { for (const k of Object.keys(localStorage)) if (/^gabe:allep/.test(k)) localStorage.removeItem(k); } catch (e) {} });
await p.reload(); await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 20000 });
await p.evaluate(() => window.scrollTo(0, 0)); await p.click('#board tr.row[data-ep="' + E + '"] td.id'); await p.waitForTimeout(500);
let n = 0;
for (const [name, what, sel] of SHOTS) { if (ONLY && !ONLY.includes(name)) continue;
  const ok = await shoot(p, sel, '#tip', name + '.png'); console.log((ok ? 'ok   ' : 'FAIL ') + name + ' · ' + what); if (ok) n++; }

/* D-089 · the ending block's regions: the glyph, the status, the title, then each item of the last row (the where line, each mark of the strip) */
{ const BLK = '#exgrid .excol[data-k="end"] .blk', R = [['20-ending-glyph', 'the ending block: the glyph', BLK + ' [data-part="icon"]'], ['21-ending-status', 'the ending block: the status', BLK + ' [data-part="status"]'],
    ['22-ending-title', 'the ending block: the title', BLK + ' [data-part="name"]']];
  for (const [name, what, sel] of R) { if (ONLY && !ONLY.includes(name)) continue; const ok = await shoot(p, sel, '#tip', name + '.png', BLK); console.log((ok ? 'ok   ' : 'FAIL ') + name + ' · ' + what); if (ok) n++; }
  const items = await p.$$(BLK + ' [data-tip="exreg"][data-reg="items"]');                          /* DOM order: the where line, then the marks */
  for (let i = 0; i < items.length; i++) { const name = '23-ending-where-' + (i + 1); if (ONLY && !ONLY.includes(name)) continue;
    const ok = await shoot(p, items[i], '#tip', name + '.png', BLK); console.log((ok ? 'ok   ' : 'FAIL ') + name + ' · the ending block: item ' + (i + 1) + ' of the last row'); if (ok) n++; } }

/* the lab's own card, for comparison: a table block (locations), its hover as the lab draws it */
if (!ONLY || ONLY.includes('00-lab-locations')) {
  const q = await ctx.newPage(); q.on('pageerror', (e) => errs.push('lab: ' + e.message));
  await q.goto('file://' + path.join(HERE, 'endpoint-lab.html')); await q.waitForTimeout(1800);
  const ok = await shoot(q, '.blk[data-table="locations"]', '#hover', '00-lab-locations.png'); console.log((ok ? 'ok   ' : 'FAIL ') + '00-lab-locations · the endpoint lab\'s own card, for comparison'); if (ok) n++; await q.close(); }
console.log(n + ' pictures in ' + path.relative(REPO, OUT) + (errs.length ? ' · page errors: ' + JSON.stringify(errs.slice(0, 3)) : ''));
await b.close();
