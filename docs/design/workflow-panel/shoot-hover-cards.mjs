/* shoot-hover-cards.mjs — pictures of the hover card, by REAL hovers (the mouse on the element, not a call into the page), D-088.

     node docs/design/workflow-panel/shoot-hover-cards.mjs [--out DIR] [--only name,name]    (run it through `heavy`: one browser job at a time)

   On POST /cooking/sessions: one picture per kind of element the card draws — a table, a function, a schema, an ending, a gate, a test, a
   client hook, an in-flight value, a middleware, a security item — and two blocks of the examples bench; and, for the comparison, the
   endpoint lab's own card on its `locations` table block (endpoint-lab.html, read-only). Each picture is the element and its card, cut to
   the two with a margin. Nothing here asserts: the probe (probe-all-endpoints.mjs, section D-088) does that.

   D-089 — the ending block's HOVER REGIONS, each by a real hover on that part of the 429 ending (the sensitive limit) of the examples bench, the whole block in the picture with
   its card: 20-ending-glyph · 21-ending-status (the one glyph-and-status card, from either) · 22-ending-title (the block's full card) · 23-ending-where-<n> (n = 1, the where line,
   then each mark of the strip in order — one card per item of the last row).

   D-090 — the same three regions on the seven other kinds of the bench, on their default examples: per kind the HEAD card (a real hover on its glyph) and ONE item card (a real hover on
   the most telling mark of its strip), the whole block in the picture with its card: 30-<kind>-head · 31-<kind>-item, kind = table · schema · function · test · gate · client-hook · in-flight.
   The telling mark: a table's field with a key to another table and a unique key, a schema's field with a rule, the first function of the endpoint that touches a table (the default example
   draws no mark), the request that tests the endpoint, the check itself, the ending the screen answers in a branch of its own, the place the value is read.

   D-091 — the bench's blocks take the lab's type, alignment and field marks; four pictures asked for, by real renders and a real hover, and three of the options:
   40-users-bench-vs-lab (the bench's `users` block beside the endpoint lab's — the same table, both on the dark ground) · 40-cooking-sessions-table (the table block with its legend: marks paler where a column
   can be null, cornered where it is unique) · 40-schema-block (a schema with many optional fields) · 40-unique-mark-hover (the real hover on a unique field's mark: its card) ·
   40-option-<fn|test|end>-corners (a function's, a test's, an ending's marks with the yes/no option on) · 40-option-controls (the option as the column draws it: not marked, corners, grey — my pick dashed). */
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

/* D-090 · the seven other kinds: the head (the glyph) and one item (the most telling mark) */
{ const KINDS = [['table', 'table'], ['schema', 'schema'], ['fn', 'function'], ['test', 'test'], ['gate', 'gate'], ['hook', 'client-hook'], ['inf', 'in-flight']];
  for (const [k, slug] of KINDS) { const BLK = '#exgrid .excol[data-k="' + k + '"] .blk', h = '30-' + slug + '-head', t = '31-' + slug + '-item';
    if (k === 'fn' && (!ONLY || ONLY.includes(t))) { await p.evaluate(() => { const D = window.__allep.data, r = D.rows.filter((x) => x.id === 'POST /cooking/sessions')[0], e = r.ex.fn.filter((x) => x[2].ops.length && D.ex.cat['table:' + x[2].ops[0][1]])[0]; if (e) window.__allepEx.pick('fn', e[0]); }); await p.waitForTimeout(250); }
    if (!ONLY || ONLY.includes(h)) { const ok = await shoot(p, BLK + ' [data-part="icon"]', '#tip', h + '.png', BLK); console.log((ok ? 'ok   ' : 'FAIL ') + h + ' · the ' + k + ' block: the glyph'); if (ok) n++; }
    if (!ONLY || ONLY.includes(t)) { const at = await p.evaluate((a) => { const D = window.__allep.data, cur = window.__allepEx.current(a), c = D.ex.cat[cur.id], o = cur.o, f = (x) => (x >= 0 ? x : 0);
        return a === 'table' ? f(c.cols.findIndex((q) => (c.fks || []).some((x) => x[0] === q[0]) && (c.uqs || []).includes(q[0]))) : a === 'schema' ? f(c.cols.findIndex((q) => q[5])) : a === 'test' ? f(c.calls.findIndex((q) => q[2] === 'act'))
          : a === 'hook' ? f(o.react.findIndex((q) => q[2])) : 0; }, k);
      const ms = await p.$$(BLK + ' .sqs > .sq'), ok = ms[at] ? await shoot(p, ms[at], '#tip', t + '.png', BLK) : false; console.log((ok ? 'ok   ' : 'FAIL ') + t + ' · the ' + k + ' block: mark ' + (at + 1) + ' of ' + ms.length); if (ok) n++; } } }

/* D-091 · the blocks take the lab's type, alignment and field marks */
{ const want = (nm) => !ONLY || ONLY.includes(nm), BKT = '#exgrid .excol[data-k="table"] .blk', pickEl = async (k, id) => { await p.evaluate((a) => window.__allepEx.pick(a[0], a[1]), [k, id]); await p.waitForTimeout(250); };
  const elShot = async (page, sel, file) => { const h = await page.$(sel); if (!h) { console.log('  MISSING ' + sel); return false; } await h.evaluate((x) => x.scrollIntoView({ block: 'center' })); await page.waitForTimeout(100); await h.screenshot({ path: path.join(OUT, file) }); return true; };
  const say = (ok, name, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + ' · ' + what); if (ok) n++; };
  if (want('40-users-bench-vs-lab')) {                                                                  /* the same table in both, side by side, on the dark ground the lab draws on */
    await p.emulateMedia({ colorScheme: 'dark' }); await pickEl('table', 'table:users');
    const bb = await (await p.$(BKT)).screenshot(), q = await ctx.newPage(); q.on('pageerror', (e) => errs.push('lab: ' + e.message)); await q.goto('file://' + path.join(HERE, 'endpoint-lab.html')); await q.waitForTimeout(1800);
    const lb = await (await q.$('.blk[data-table="users"]')).screenshot(); await q.close(); await p.emulateMedia({ colorScheme: null });
    const c = await ctx.newPage(), im = (buf) => '<img style="display:block" src="data:image/png;base64,' + buf.toString('base64') + '">';
    await c.setContent('<body style="margin:0;padding:18px;background:#0b0e13;color:#c7cfdd;font:600 13px ui-monospace,monospace;display:flex;gap:28px;align-items:flex-start"><figure style="margin:0"><figcaption style="margin-bottom:8px">the all-endpoints bench: users</figcaption>' + im(bb) + '</figure><figure style="margin:0"><figcaption style="margin-bottom:8px">the endpoint lab: users</figcaption>' + im(lb) + '</figure></body>');
    await c.waitForTimeout(150); const cb = await c.evaluate(() => { const r = document.body.getBoundingClientRect(), f = [...document.querySelectorAll('figure')].map((x) => x.getBoundingClientRect()); return { w: Math.ceil(Math.max(...f.map((x) => x.right)) + 18), h: Math.ceil(Math.max(...f.map((x) => x.bottom)) + 18) }; });
    await c.screenshot({ path: path.join(OUT, '40-users-bench-vs-lab.png'), clip: { x: 0, y: 0, width: cb.w, height: cb.h } }); await c.close(); say(true, '40-users-bench-vs-lab', 'the bench\'s users block beside the lab\'s'); }
  if (want('40-cooking-sessions-table')) { await pickEl('table', 'table:cooking_sessions'); say(await elShot(p, BKT, '40-cooking-sessions-table.png'), '40-cooking-sessions-table', 'the table block with its legend'); }
  if (want('40-schema-block')) { await pickEl('schema', 'schema:CookingSessionResponse'); say(await elShot(p, '#exgrid .excol[data-k="schema"] .blk', '40-schema-block.png'), '40-schema-block', 'a schema block, its optional fields paler'); }
  if (want('40-unique-mark-hover')) { await pickEl('table', 'table:users'); const i = await p.evaluate(() => window.__allep.data.ex.cat['table:users'].cols.findIndex((f) => f[0] === 'auth_provider')), ms = await p.$$(BKT + ' .sqs > .sq');
    say(ms[i] ? await shoot(p, ms[i], '#tip', '40-unique-mark-hover.png', BKT) : false, '40-unique-mark-hover', 'a real hover on a unique field\'s mark (users.auth_provider)'); }
  for (const k of ['fn', 'test', 'end']) { const nm = '40-option-' + k + '-corners'; if (!want(nm)) continue;
    const ep = k === 'test' ? 'POST /cooking/sessions' : 'DELETE /pantry/locations/{location_id}'; await p.evaluate((e) => window.__allep.pick(e), ep); await p.waitForTimeout(400);
    const id = await p.evaluate((a) => { const D = window.__allep.data, r = D.rows.filter((x) => x.id === a[1])[0], hit = r.ex[a[0]].filter((e) => { const c = D.ex.cat[e[0]]; return a[0] === 'fn' ? e[2].ops.some((q) => q[2] === 1) : a[0] === 'test' ? c.calls.some((q) => q[2] === 'act' && q[8]) : ((r.ex.paths[D.ex.cat[e[0]].paths[0]] || { ch: [] }).ch.some((q) => q[0] === 'branch' && q[2])); })[0] || r.ex[a[0]][0]; return hit[0]; }, [k, ep]);
    await pickEl(k, id); await p.evaluate((a) => { window.__allepEx.state.col[a].look.fact = 'corners'; window.__allepEx.render(); }, k); await p.waitForTimeout(250);
    say(await elShot(p, '#exgrid .excol[data-k="' + k + '"] .blk', nm + '.png'), nm, 'the ' + k + ' block with the yes/no option on (corners)'); await p.evaluate((a) => { window.__allepEx.state.col[a].look.fact = 'off'; window.__allepEx.render(); }, k); }
  if (want('40-option-controls')) { await p.evaluate((e) => window.__allep.pick(e), 'POST /cooking/sessions'); await p.waitForTimeout(400); say(await elShot(p, '#exgrid .excol[data-k="fn"] .exyn', '40-option-controls.png'), '40-option-controls', 'the option as the column draws it, my pick dashed'); }
}

/* the lab's own card, for comparison: a table block (locations), its hover as the lab draws it */
if (!ONLY || ONLY.includes('00-lab-locations')) {
  const q = await ctx.newPage(); q.on('pageerror', (e) => errs.push('lab: ' + e.message));
  await q.goto('file://' + path.join(HERE, 'endpoint-lab.html')); await q.waitForTimeout(1800);
  const ok = await shoot(q, '.blk[data-table="locations"]', '#hover', '00-lab-locations.png'); console.log((ok ? 'ok   ' : 'FAIL ') + '00-lab-locations · the endpoint lab\'s own card, for comparison'); if (ok) n++; await q.close(); }
console.log(n + ' pictures in ' + path.relative(REPO, OUT) + (errs.length ? ' · page errors: ' + JSON.stringify(errs.slice(0, 3)) : ''));
await b.close();
