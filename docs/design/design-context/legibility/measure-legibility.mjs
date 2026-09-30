#!/usr/bin/env node
/* measure-legibility.mjs — counts, on one built page, the kinds of defect his human reading of all-endpoints.html found (D-066).
   A PROTOTYPE of the checks the legibility patterns propose for the suite: each metric is one check, run on the page before the
   fixes (it should fire) and after them (it should stay silent). Nothing here is a gate; it reports.

   node measure-legibility.mjs --page <all-endpoints.html> --ep post-cooking-sessions --out <measures.json> [--label before]

   Metrics (every one is read from the live page, never typed):
     targets      hover targets drawn (elements with data-tip) · items = the outermost ones · nested = a target inside a target
     titles       native title= tooltips (a second hover system)
     repeatText   targets whose WHOLE hover text is shown by >= R targets (a kind's definition used as an item's hover)
     repeatLine   targets whose hover holds a line (>= 24 chars) that >= R targets repeat (a static tail on every hover)
     twins        pairs of items in one BY MOMENT cell whose hovers read the same
     pageTalk     hovers that talk about the page or the map, not the code (D-017)
     bare         BY MOMENT items that wear no glyph (no svg, no station mark) — an element without its identity
     midWord      words broken across two lines inside BY MOMENT items between two letters or digits
     machineWords BY MOMENT faces that show a raw feed word (dependency-value, setting-once, built-once, " · none" …)
     timeless     BY MOMENT column or row heads that are not moments ("no moment", Overview and risk)
*/
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname), REPO = path.resolve(HERE, '../../../..');
const args = process.argv.slice(2), opt = (k, d) => (args.indexOf(k) >= 0 ? args[args.indexOf(k) + 1] : d);
const PAGE = path.resolve(opt('--page', path.join(REPO, 'docs/design/workflow-panel/all-endpoints.html')));
const EP = opt('--ep', 'post-cooking-sessions'), OUT = opt('--out', null), LABEL = opt('--label', 'page');
const R = Number(opt('--repeat', '5'));
const PW = path.join(REPO, 'docs/design/graft-adoption/spike/_build/node_modules/playwright-core'), CHROME = '/usr/bin/google-chrome-stable';
if (!fs.existsSync(CHROME) || !fs.existsSync(PW)) { console.log('SKIP — no system chrome / playwright-core on this host'); process.exit(0); }
const { chromium } = require(PW);

const b = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--no-sandbox', '--disable-gpu-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1200 } });
const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('file://' + PAGE + '?ep=' + encodeURIComponent(EP));
await p.waitForFunction('window.__allep && window.__allep.ready', { timeout: 30000 });
await p.waitForTimeout(400);

const M = await p.evaluate(({ R }) => {
  const tip = document.getElementById('tip');
  const vis = (e) => { const r = e.getClientRects(); return r.length > 0 && r[0].width > 0 && r[0].height > 0; };
  const secOf = (e) => { const s = e.closest('section[id]'); return s ? s.id : 'other'; };
  const norm = (s) => String(s || '').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  const T = [...document.querySelectorAll('[data-tip]')].filter((e) => !e.closest('#tip') && vis(e));
  const rec = T.map((e) => {
    e.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    const shown = tip && tip.getAttribute('data-show') === 'true';
    const txt = shown ? norm(tip.innerText) : '';
    const par = e.parentElement && e.parentElement.closest('[data-tip]');
    return { e, sec: secOf(e), kind: e.getAttribute('data-tip'), txt, nested: !!(par && !par.closest('#tip')) };
  });
  document.body.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));  /* leave the last hover (on body: the page's handler calls closest) */
  const per = {};
  const bump = (sec, k, n = 1) => { per[sec] = per[sec] || {}; per[sec][k] = (per[sec][k] || 0) + n; };
  rec.forEach((r) => { bump(r.sec, 'targets'); bump(r.sec, r.nested ? 'nested' : 'items'); });
  const titles = [...document.querySelectorAll('[title]')].filter((e) => e.getAttribute('title') && !e.closest('svg') && vis(e));
  titles.forEach((e) => bump(secOf(e), 'titles'));
  /* repeated whole texts and repeated lines */
  const byText = new Map(), byLine = new Map();
  rec.forEach((r) => { if (!r.txt) return; byText.set(r.txt, (byText.get(r.txt) || 0) + 1);
    new Set(r.txt.split('\n').map((l) => l.trim()).filter((l) => l.length >= 24)).forEach((l) => byLine.set(l, (byLine.get(l) || 0) + 1)); });
  const exText = [], exLine = [];
  rec.forEach((r) => { if (!r.txt) return;
    if (byText.get(r.txt) >= R) bump(r.sec, 'repeatText');
    if (r.txt.split('\n').some((l) => byLine.get(l.trim()) >= R)) bump(r.sec, 'repeatLine'); });
  [...byText].filter(([, n]) => n >= R).sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([t, n]) => exText.push([n, t.slice(0, 160)]));
  [...byLine].filter(([, n]) => n >= R).sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([t, n]) => exLine.push([n, t.slice(0, 160)]));
  /* page talk (D-017): the page or the map talking about itself */
  const TALK = /as (the table|the endpoint lab|the Gabe Universe|the station) draws it|my proposal|how the map|the map (knows|found|reads|holds)|found by|draws no node/i;
  const exTalk = [];
  rec.forEach((r) => { if (r.txt && TALK.test(r.txt)) { bump(r.sec, 'pageTalk'); if (exTalk.length < 5) exTalk.push(r.txt.split('\n').find((l) => TALK.test(l)).slice(0, 160)); } });
  /* BY MOMENT: items, twins, bare, mid-word, machine words, timeless heads */
  const grid = document.getElementById('mogrid');
  const moItems = rec.filter((r) => !r.nested && grid && grid.contains(r.e) && !r.e.closest('th'));
  const twins = [], cells = new Map();
  moItems.forEach((r) => { const td = r.e.closest('td'); if (!td || !r.txt) return; const k = td; const m = cells.get(k) || new Map(); cells.set(k, m);
    m.set(r.txt, (m.get(r.txt) || 0) + 1); });
  let nTwins = 0; cells.forEach((m) => m.forEach((n, t) => { if (n > 1) { nTwins += n - 1; if (twins.length < 5) twins.push([n, t.split('\n')[0].slice(0, 120)]); } }));
  const rowOf = (e) => { const td = e.closest('td'); const tr = e.closest('tr'); return (td && td.getAttribute('data-f')) || (tr && tr.getAttribute('data-f')) || '?'; };
  const bare = {}, exBare = [];
  moItems.forEach((r) => { const has = r.e.querySelector('svg, .skg, [data-sk], .ico'); if (!has) { const f = rowOf(r.e); bare[f] = (bare[f] || 0) + 1;
    if (exBare.length < 8) exBare.push([f, (r.e.textContent || '').trim().slice(0, 60)]); } });
  let midWord = 0; const exMid = [];
  moItems.forEach((r) => {
    const w = document.createTreeWalker(r.e, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) {
      const s = n.nodeValue; if (!s || s.trim().length < 4) continue;
      let prevTop = null;
      for (let i = 0; i < s.length; i++) {
        if (/\s/.test(s[i])) { prevTop = null; continue; }
        const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + 1); const rc = rg.getClientRects()[0]; if (!rc) continue;
        if (prevTop !== null && Math.abs(rc.top - prevTop) > 3 && /[A-Za-z0-9]/.test(s[i - 1]) && /[A-Za-z0-9]/.test(s[i])) { midWord++; if (exMid.length < 8) exMid.push(s.slice(Math.max(0, i - 12), i) + '|' + s.slice(i, i + 12)); }
        prevTop = rc.top;
      }
    }
  });
  const MACH = /(dependency-value|setting-once|built-once|contextvar|arrange-checked)| · none\b/;   /* no \b: a chip's parts join with no space */
  let mach = 0; const exMach = [];
  moItems.forEach((r) => { const t = (r.e.textContent || ''); if (MACH.test(t)) { mach++; if (exMach.length < 6) exMach.push(t.trim().slice(0, 60)); } });
  const heads = grid ? [...grid.querySelectorAll('th')] : [];
  const timeless = heads.filter((h) => /\bno moment\b|overview and risk/i.test(h.textContent || '')).map((h) => (h.textContent || '').trim().slice(0, 40));
  const tot = (k) => Object.values(per).reduce((a, s) => a + (s[k] || 0), 0);
  return {
    totals: { targets: tot('targets'), items: tot('items'), nested: tot('nested'), titles: tot('titles'), repeatText: tot('repeatText'),
      repeatLine: tot('repeatLine'), pageTalk: tot('pageTalk') },
    perSection: per,
    mo: { items: moItems.length, twins: nTwins, bare: Object.values(bare).reduce((a, b) => a + b, 0), bareByRow: bare, midWord, machineWords: mach, timeless: timeless.length },
    examples: { repeatText: exText, repeatLine: exLine, pageTalk: exTalk, twins, bare: exBare, midWord: exMid, machineWords: exMach, timeless },
  };
}, { R });
await b.close();
const out = { label: LABEL, page: path.relative(REPO, PAGE), ep: EP, repeatAt: R, viewport: '1920x1200', pageErrors: errs, ...M };
if (OUT) { fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n'); }
console.log(JSON.stringify({ label: LABEL, totals: M.totals, mo: M.mo, pageErrors: errs.length }, null, 0));
