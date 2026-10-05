#!/usr/bin/env node
/* gabe-artifact · legibility audit
 *
 * Opens ONE built page in a browser and COUNTS the defects a human reader hits that the model who built the
 * page never does (D-066, patterns P1 · P3 · P7). It REPORTS; it never gates — exit 0 whatever it finds
 * (2 = bad usage). Every count is read from the live page, never typed; each one is a lead for a look, not a
 * verdict (a flagged line may be a legend line on purpose).
 *
 *   node legibility-audit.mjs <page.html> [options]            (or --page <file|http(s) url>)
 *
 * The hover system is a convention the page declares by options — defaults fit the suite's generated pages
 * (a `data-tip` attribute on each target, one `#tip` box that shows on mouseover):
 *   --hover-attr data-tip           attribute that makes an element a hover target
 *   --tip '#tip'                    the box the page writes the hover into; `none` = the attribute's own
 *                                   value IS the hover (use with --hover-attr title)
 *   --tip-shown '[data-show="true"]'  selector the box matches while a hover shows
 *   --event mouseover               the event that makes the page show the hover (bubbles)
 * What to audit:
 *   --scope body                    audit only targets inside this region
 *   --rows 'table, ul, ol, [role="grid"], [role="list"]'   regions that hold ROWS OF ELEMENTS — the items of
 *                                   twins · twinFaces · bare · machineWords are the outermost hover targets
 *                                   inside them (never inside a <th>); point it at a grid to leave plain
 *                                   tables out
 *   --container 'td, li'            what holds twins: two items in ONE container
 *   --glyph '<css>'                 what counts as an element's own icon (default: svg, img, canvas, .ico …)
 *   --machine '<regex>'             add page-specific raw words to the built-in ones (JS regex source)
 *   --keep '<regex>'                names to keep: matches are removed before a face is judged
 *   --label-len 24                  a hover line shorter than this is a LABEL and may repeat
 *   --repeat 5                      a line is "repeated" when this many hovers show it
 * Page loading and output:
 *   --query '?ep=x'  --ready '<js expr>'  --settle 400  --width 1920  --height 1200
 *   --out report.json  --label <name>  --examples 6
 *
 * Counts (a flagged unit is one item, hover or face):
 *   nested          a hover target inside another hover target — two hovers for one item (P1)
 *   repeatLine      a hover holds a line of >= label-len chars that >= repeat hovers show — a kind's meaning
 *                   on every item; it belongs in a legend. A short label may repeat (P1.1 note)
 *   repeatMajority  of those, hovers whose repeated lines are MORE THAN HALF of the hover — the majority of a
 *                   hover must be the content that changes
 *   twins           items in one container whose hovers read the same (a reader cannot tell them apart)
 *   twinFaces       items in one container whose faces read the same (a reader must hover each)
 *   bare            NAMED items (a letter on the face — a bare number is a value, not an element) in a row of
 *                   elements that wear no glyph (P3.1)
 *   machineWords    faces — and the OPENING line of a hover — that show a raw feed id, a library error id, a
 *                   source expression or an i18n key instead of words (P7.1); code comes last in a hover
 *   unfilled        a {token} the page never filled, or undefined / NaN, on a face or in a hover
 *
 * One reader, one width: a defect that shows on another page state or at another width stays unseen.
 * Needs Playwright (GABE_PW_DIR=<playwright[-core] dir>, else gabe-docsite's resolver) and a Chrome
 * (GABE_CHROME_BIN, else a system chrome); without them it prints a loud SKIP and exits 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/* ── options ─────────────────────────────────────────────────────────────── */
const DEFAULTS = {
  page: '', query: '', ready: '', settle: '400', width: '1920', height: '1200',
  'hover-attr': 'data-tip', tip: '#tip', 'tip-shown': '[data-show="true"]', event: 'mouseover',
  scope: 'body', rows: 'table, ul, ol, [role="grid"], [role="list"]', container: 'td, li',
  glyph: 'svg, img, canvas, .ico, .icon, [data-ico], [data-icon], [data-sk], .skg',
  machine: '', keep: '', 'label-len': '24', repeat: '5', out: '', label: '', examples: '6',
};
const usage = (msg) => { if (msg) console.error('legibility-audit: ' + msg); console.error('usage: node legibility-audit.mjs <page.html> [--hover-attr data-tip] [--tip "#tip"|none] [--scope css] [--rows css] [--container css] [--machine regex] [--keep regex] [--out file.json] …  (see the file header)'); process.exit(2); };
const O = { ...DEFAULTS };
{ const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--help' || a[i] === '-h') usage();
    if (a[i].startsWith('--')) { const k = a[i].slice(2); if (!(k in DEFAULTS)) usage('unknown option ' + a[i]); if (i + 1 >= a.length) usage(a[i] + ' needs a value'); O[k] = a[++i]; }
    else if (!O.page) O.page = a[i]; else usage('one page only'); } }
if (!O.page) usage('no page given');
const num = (k) => { const n = Number(O[k]); if (!Number.isFinite(n) || n < 0) usage('--' + k + ' must be a number'); return n; };
const [LABEL_LEN, REPEAT, SETTLE, W, H, NEX] = [num('label-len'), num('repeat'), num('settle'), num('width'), num('height'), num('examples')];
for (const k of ['machine', 'keep']) if (O[k]) { try { new RegExp(O[k]); } catch (e) { usage('--' + k + ' is not a regex: ' + e.message); } }
const isUrl = /^https?:\/\//.test(O.page);
if (!isUrl && !fs.existsSync(O.page)) usage('no such page: ' + O.page);
const URL_ = isUrl ? O.page + O.query : 'file://' + path.resolve(O.page) + O.query;

/* ── the browser, or a loud SKIP (nothing to verify is not the same as verified) ── */
const skip = (why) => { console.log('SKIP ⚠ — LEGIBILITY AUDIT DID NOT RUN (' + why + ')'); process.exit(0); };
let chromium = null;
if (process.env.GABE_PW_DIR) { try { chromium = require(process.env.GABE_PW_DIR).chromium; } catch { /* fall through to the suite resolver */ } }
if (!chromium) { try { chromium = (await import(new globalThis.URL('../../gabe-docsite/tools/_playwright.mjs', import.meta.url).href).catch(() => import(`${process.env.HOME}/.claude/skills/gabe-docsite/tools/_playwright.mjs`))).chromium; } catch { /* named below */ } }
if (!chromium) skip('no Playwright: set GABE_PW_DIR=<node_modules/playwright-core> or install one gabe-docsite can find');
const exe = [process.env.GABE_CHROME_BIN, '/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find((p) => fs.existsSync(p));
let browser;
try { browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] }); }
catch (e) { skip('the browser would not launch: ' + String(e.message || e).split('\n')[0]); }

const page = await browser.newPage({ viewport: { width: W, height: H } });
const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(String(e)));
try {
  await page.goto(URL_, { waitUntil: 'load', timeout: 60000 });
  if (O.ready) await page.waitForFunction(O.ready, null, { timeout: 30000 });
} catch (e) { await browser.close(); skip('the page did not load/ready: ' + String(e.message || e).split('\n')[0]); }
await page.waitForTimeout(SETTLE);

/* ── the audit, run inside the page ──────────────────────────────────────── */
const R = await page.evaluate((o) => {
  const { hoverAttr, tipSel, shownSel, event, scope, rows, container, glyph, labelLen, repeat, nex } = o;
  const tip = tipSel === 'none' ? null : document.querySelector(tipSel);
  const vis = (e) => { const r = e.getClientRects(); return r.length > 0 && r[0].width > 0 && r[0].height > 0; };
  const secOf = (e) => { const s = e.closest('section[id]'); return s ? s.id : 'other'; };
  const norm = (s) => String(s || '').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  const face = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim();
  const attrSel = '[' + hoverAttr + ']';
  const findings = {};   /* check -> [{sec, ex}]  one entry per flagged unit */
  const flag = (check, sec, ex) => { (findings[check] = findings[check] || []).push({ sec, ex: String(ex).slice(0, 120) }); };

  /* every hover target in scope, and the hover each one shows */
  const T = [...document.querySelectorAll(attrSel)].filter((e) => !(tip && tip.contains(e)) && vis(e) && !!e.closest(scope));
  const rec = T.map((e) => {
    let txt;
    if (!tip) txt = norm(e.getAttribute(hoverAttr));
    else { e.dispatchEvent(new MouseEvent(event, { bubbles: true })); txt = tip.matches(shownSel) ? norm(tip.innerText) : ''; }
    const par = e.parentElement && e.parentElement.closest(attrSel);
    return { e, sec: secOf(e), txt, nested: !!par && !(tip && par.closest(tipSel)) };
  });
  document.body.dispatchEvent(new MouseEvent(event, { bubbles: true }));   /* leave the last hover */
  const items = rec.filter((r) => !r.nested);
  const withHover = rec.filter((r) => r.txt).length;

  /* nested: one item, two hovers */
  rec.forEach((r) => { if (r.nested) flag('nested', r.sec, face(r.e) || r.txt.split('\n')[0]); });

  /* repeatLine / repeatMajority: lines shown by >= repeat hovers, longer than a label */
  const lines = (txt) => txt.split('\n').map((l) => l.trim()).filter(Boolean);
  const byLine = new Map();
  rec.forEach((r) => { new Set(lines(r.txt).filter((l) => l.length >= labelLen)).forEach((l) => byLine.set(l, (byLine.get(l) || 0) + 1)); });
  const isRep = (l) => l.length >= labelLen && (byLine.get(l) || 0) >= repeat;
  rec.forEach((r) => {
    const L = lines(r.txt), rep = L.filter(isRep); if (!rep.length) return;
    flag('repeatLine', r.sec, rep[0]);
    const repChars = rep.reduce((a, l) => a + l.length, 0), allChars = L.reduce((a, l) => a + l.length, 0);
    if (repChars * 2 > allChars) flag('repeatMajority', r.sec, Math.round(100 * repChars / allChars) + '% repeated · ' + L[0]);
  });

  /* the items of a row of elements: outermost hover targets inside a rows region, never in a head cell */
  const rowItems = items.filter((r) => r.e.closest(rows) && !r.e.closest('th'));

  /* twins (same hover) and twinFaces (same face) among the items of ONE container */
  const twinOf = (key, check, ex) => {
    const cells = new Map();
    rowItems.forEach((r) => { const c = r.e.closest(container), k = key(r); if (!c || !k) return;
      const m = cells.get(c) || new Map(); cells.set(c, m); m.set(k, (m.get(k) || []).concat(r)); });
    cells.forEach((m) => m.forEach((rs, k) => { for (let i = 1; i < rs.length; i++) flag(check, rs[i].sec, ex(k)); }));
  };
  twinOf((r) => r.txt, 'twins', (k) => k.split('\n')[0]);
  twinOf((r) => face(r.e), 'twinFaces', (k) => k);

  /* bare: an item in a row of elements with no glyph of its own (a target drawn inside an <svg> is itself a mark) */
  rowItems.forEach((r) => { if (!/[A-Za-z]/.test(face(r.e))) return;   /* no letter on the face: a number or a mark is a value, not a named element */
    if (!(r.e.closest('svg') || r.e.matches(glyph) || r.e.querySelector(glyph))) flag('bare', r.sec, face(r.e).slice(0, 60) || r.txt.split('\n')[0]); });

  /* machineWords: raw feed ids, library error ids, source expressions, i18n keys */
  const MACH = [
    String.raw`\bis (?:not )?None\b`,                                                   /* a python expression */
    String.raw`\b(?:str|len|repr|isinstance|getattr|hasattr)\(`,                         /* a call, as written */
    String.raw`(?:^|\s)(?:==|!=|=>|&&|\|\|)(?:\s|$)`,                                   /* an operator */
    String.raw`(?<![\w-])(?:fe|st|ep|x|g|d|a|c4)[:·]\S{2,}`,                            /* a feed id: fe:file#hook · x:… · g:… */
    String.raw`\b(?:string_too_short|string_too_long|string_pattern_mismatch|string_type|int_parsing|int_type|int_from_float|float_parsing|float_type|bool_parsing|bool_type|list_type|dict_type|date_parsing|datetime_parsing|time_parsing|url_parsing|uuid_parsing|json_invalid|literal_error|value_error|assertion_error|extra_forbidden|greater_than_equal|greater_than|less_than_equal|less_than|missing_argument)\b`,   /* a library error id (pydantic-core) */
  ].concat(o.machine ? [o.machine] : []).map((s) => new RegExp(s));
  const KEEP = o.keep ? new RegExp(o.keep, 'g') : null;
  const I18N = /(?<![\w./@:-])[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*){2,}(?![\w(/-])/g;      /* an i18n key: 3+ dotted lowercase words */
  const NOT_KEY = /\.(?:py|js|mjs|ts|tsx|jsx|json|md|html|css|yaml|yml|toml|sh|com|org|net|io|dev|app|ai)$/;
  const rawWords = (text) => { const t = KEEP ? text.replace(KEEP, ' ') : text, hits = [];
    MACH.forEach((rx) => { const m = t.match(rx); if (m) hits.push(m[0]); });
    for (const m of t.matchAll(I18N)) if (!NOT_KEY.test(m[0])) hits.push(m[0]);
    return hits; };
  let machFaces = 0, machHover = 0;
  rowItems.forEach((r) => { const h = rawWords(face(r.e)); if (h.length) { machFaces++; flag('machineWords', r.sec, 'face: ' + face(r.e).slice(0, 80)); } });
  items.forEach((r) => { const first = lines(r.txt)[0]; if (first && rawWords(first).length) { machHover++; flag('machineWords', r.sec, 'hover: ' + first.slice(0, 80)); } });

  /* unfilled: a {token} the page never filled, or undefined / NaN, on a face or in a hover */
  const UNF = /\bundefined\b|\bNaN\b|(?<!\/)\{[a-z]\w*\}/;   /* a {x} right after a slash is a URL path parameter */
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let tn;
  while ((tn = tw.nextNode())) { const pe = tn.parentElement; if (!pe || pe.closest('script,style,#tip') || (tip && tip.contains(pe)) || !pe.closest(scope) || !vis(pe)) continue;
    if (UNF.test(tn.nodeValue) && UNF.test(pe.textContent || '')) flag('unfilled', secOf(pe), 'face: ' + tn.nodeValue.trim().slice(0, 80)); }
  rec.forEach((r) => { if (r.txt && UNF.test(r.txt)) flag('unfilled', r.sec, 'hover: ' + r.txt.split('\n').find((l) => UNF.test(l)).slice(0, 80)); });

  /* assemble: count · examples (distinct, with how many) · where */
  const checks = {};
  ['nested', 'repeatLine', 'repeatMajority', 'twins', 'twinFaces', 'bare', 'machineWords', 'unfilled'].forEach((k) => {
    const F = findings[k] || [], seen = new Map(), bySection = {};
    F.forEach((f) => { seen.set(f.ex, (seen.get(f.ex) || 0) + 1); bySection[f.sec] = (bySection[f.sec] || 0) + 1; });
    checks[k] = { count: F.length, examples: [...seen].sort((a, b) => b[1] - a[1]).slice(0, nex).map(([t, n]) => (n > 1 ? n + '× ' : '') + t), bySection };
  });
  checks.machineWords.faces = machFaces; checks.machineWords.hoverOpening = machHover;
  return { hover: { targets: rec.length, items: items.length, nested: rec.length - items.length, showing: withHover, silent: rec.length - withHover }, rowItems: rowItems.length, checks };
}, { hoverAttr: O['hover-attr'], tipSel: O.tip, shownSel: O['tip-shown'], event: O.event, scope: O.scope, rows: O.rows, container: O.container,
  glyph: O.glyph, machine: O.machine, keep: O.keep, labelLen: LABEL_LEN, repeat: REPEAT, nex: NEX });
await browser.close();

/* ── report ──────────────────────────────────────────────────────────────── */
const out = { tool: 'legibility-audit', label: O.label || path.basename(O.page), page: O.page + O.query, viewport: W + 'x' + H, pageErrors,
  options: { hoverAttr: O['hover-attr'], tip: O.tip, tipShown: O['tip-shown'], event: O.event, scope: O.scope, rows: O.rows, container: O.container,
    labelLen: LABEL_LEN, repeat: REPEAT, machine: O.machine || null, keep: O.keep || null },
  ...R };
if (O.out) { fs.mkdirSync(path.dirname(path.resolve(O.out)), { recursive: true }); fs.writeFileSync(O.out, JSON.stringify(out, null, 1) + '\n'); }
const WHAT = {
  nested: 'a hover target inside another — two hovers for one item', repeatLine: 'a hover line (>= ' + LABEL_LEN + ' chars) that >= ' + REPEAT + ' hovers repeat — a legend candidate',
  repeatMajority: 'hovers that are mostly repeated lines — the changing content is the minority', twins: 'items in one container whose hovers read the same',
  twinFaces: 'items in one container whose faces read the same', bare: 'items in a row of elements with no glyph', machineWords: 'raw feed ids / code spelling on a face or a hover\'s opening line',
  unfilled: 'a {token} never filled, or undefined / NaN' };
console.log('legibility-audit · ' + out.label + ' · ' + out.viewport + ' · report only');
console.log('  hover targets ' + R.hover.targets + ' · outermost ' + R.hover.items + ' · showing a hover ' + R.hover.showing + ' · row items ' + R.rowItems + (pageErrors.length ? ' · page errors ' + pageErrors.length : ''));
if (R.hover.targets === 0) console.log('  NOTE  no hover targets found for --hover-attr ' + O['hover-attr'] + ' in --scope ' + O.scope + ' — every count below is 0 because nothing was audited');
else if (R.hover.showing === 0) console.log('  NOTE  no target showed a hover (--tip ' + O.tip + ' · --tip-shown ' + O['tip-shown'] + ' · --event ' + O.event + ') — hover counts are 0 because no hover text was read');
for (const [k, c] of Object.entries(R.checks)) {
  console.log('  ' + k.padEnd(15) + String(c.count).padStart(6) + '   ' + WHAT[k]);
  c.examples.slice(0, 3).forEach((e) => console.log('                          e.g. ' + e));
}
