/* probe-legibility-review.mjs — a SMOKE probe of the legibility review page (D-037 light: build, --check, this probe once).
   It loads with no page error · every section draws · every picture file exists and decodes · the copy text carries every choice ·
   no unfilled {token}, undefined or NaN · a click makes a look yours and the copy line says so · no text under 12px · no sideways scroll.

     node docs/design/design-context/legibility/probe-legibility-review.mjs [--html <file>] [--shots <dir>]   # browser-gated; run it ALONE
       --shots <dir>   also save a picture of each section there (for looking, never committed) */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname), REPO = path.resolve(HERE, '../../../..');
const PW = path.join(REPO, 'docs/design/graft-adoption/spike/_build/node_modules/playwright-core'), CHROME = '/usr/bin/google-chrome-stable';
const args = process.argv.slice(2), opt = (k) => (args.indexOf(k) >= 0 ? args[args.indexOf(k) + 1] : null);
const SRC = path.resolve(opt('--html') || path.join(HERE, 'legibility-review.html')), SHOTS = opt('--shots');
if (!fs.existsSync(CHROME) || !fs.existsSync(PW)) { console.log('SKIP ⚠ — no system chrome / playwright-core on this host (RENDER COVERAGE DID NOT RUN)'); process.exit(0); }
const { chromium } = require(PW);
let pass = 0, fail = 0; const ok = (c, m, extra) => { if (c) { pass++; console.log('  ok   ' + m + (extra ? ' — ' + extra : '')); } else { fail++; console.log('  FAIL ' + m + (extra ? ' — ' + extra : '')); } };
/* the host wraps the page in a document; a <base> keeps its relative picture paths pointing beside the page */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'legrev-probe-')), page = path.join(tmp, 'page.html');
fs.writeFileSync(page, '<!doctype html><html><head><meta charset="utf8"><base href="file://' + path.dirname(SRC) + '/"></head><body>' + fs.readFileSync(SRC, 'utf8') + '</body></html>');
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-gpu-sandbox', '--disable-dev-shm-usage'] });
try {
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + page); await p.waitForFunction('window.__leg && window.__leg.ready', { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(300);
  const D = await p.evaluate(() => window.LEG_DATA);
  ok(!!D && errs.length === 0, 'the page loads with no page error', errs.slice(0, 2).join(' | '));
  /* every section draws */
  const SECS = ['sec-glance', 'sec-calls', 'sec-items', 'sec-qs', 'sec-gap', 'sec-pat', 'sec-rem', 'sec-copy'];
  const secs = await p.evaluate((ids) => ids.map((id) => { const s = document.getElementById(id); return s ? { id, title: s.querySelector('.st').textContent.trim(), take: s.querySelector('.take').textContent.trim(), kids: s.querySelector('.body').children.length, h: s.getBoundingClientRect().height, icon: !!s.querySelector('.sec-head h2 svg') } : { id }; }), SECS);
  const bad = secs.filter((s) => !s.title || !s.take || !s.kids || s.h < 60 || !s.icon);
  ok(bad.length === 0, 'every section draws: an iconed title, a body, a take-from-this line', bad.map((s) => s.id).join(',') || secs.length + ' sections');
  const n = await p.evaluate(() => ({ calls: document.querySelectorAll('#sec-calls .call').length, items: document.querySelectorAll('#sec-items .item').length, qs: document.querySelectorAll('#sec-qs [data-q]').length,
    pats: document.querySelectorAll('#sec-pat [data-pattern]').length, props: document.querySelectorAll('#sec-pat .prop').length, rem: document.querySelectorAll('#sec-rem [data-rem]').length, gapRec: document.querySelectorAll('#sec-gap .call').length,
    looks: document.querySelectorAll('#sec-calls .call[data-call^="mo."] .look, #sec-calls .call[data-call^="ex."] .look').length, mStat: document.querySelectorAll('#sec-glance table.t tr').length }));
  ok(n.calls === D.calls.length + D.proposals.length, 'every look added this round and every proposal is a card', n.calls + ' of ' + (D.calls.length + D.proposals.length));
  ok(n.looks === D.calls.reduce((a, c) => a + c.opts.length, 0), 'every value of every look is drawn with its plain line', String(n.looks));
  ok(n.items === D.items.length && n.qs === D.questions.length && n.pats === D.patterns.length && n.rem === D.remaining.length && n.gapRec === 1,
    'items, questions, patterns and remaining groups each draw one card', `${n.items} items · ${n.qs} questions · ${n.pats} patterns · ${n.rem} remaining · ${n.gapRec} gap choice`);
  ok(n.props === D.patterns.reduce((a, x) => a + x.suite.length, 0), 'every draft suite proposal has its choice', String(n.props));
  /* untouched: each choice shows exactly one dashed pick, or its ruled value filled */
  { const wrong = await p.evaluate(() => window.LEG_DATA.choices.filter((c) => { const bs = [...document.querySelectorAll('[data-choice="' + CSS.escape(c.id) + '"]')];
      const dashed = bs.filter((x) => x.dataset.mine === 'true'), filled = bs.filter((x) => x.getAttribute('aria-pressed') === 'true');
      return c.ruled ? !(dashed.length === 0 && filled.length >= 1 && filled.every((x) => x.dataset.v === c.ruled)) : !(dashed.length >= 1 && dashed.every((x) => x.dataset.v === c.mine) && filled.length === 0); }).map((c) => c.id));
    ok(wrong.length === 0, 'untouched, each choice shows my pick dashed, or its ruling filled', wrong.join(',') || D.choices.length + ' choices'); }
  /* every picture file exists, and decodes */
  { const srcs = await p.$$eval('img', (els) => els.map((i) => i.getAttribute('src')));
    const missing = srcs.filter((s) => !fs.existsSync(path.resolve(path.dirname(SRC), s)));
    ok(srcs.length > 0 && missing.length === 0, 'every picture file the page names exists beside it (relative paths)', missing.slice(0, 3).join(', ') || new Set(srcs).size + ' pictures, ' + srcs.length + ' places');
    ok(srcs.every((s) => !s.startsWith('/') && !/^[a-z]+:/i.test(s)), 'no picture path is absolute', srcs.find((s) => s.startsWith('/') || /^[a-z]+:/i.test(s)) || '');
    await p.evaluate(async () => { for (const d of document.querySelectorAll('details')) d.open = true; for (const i of document.querySelectorAll('img')) { i.loading = 'eager'; } });
    await p.waitForFunction(() => [...document.querySelectorAll('img')].every((i) => i.complete), { timeout: 60000 }).catch(() => {});
    const undec = await p.$$eval('img', (els) => els.filter((i) => !(i.complete && i.naturalWidth > 0)).map((i) => i.getAttribute('src')));
    ok(undec.length === 0, 'every picture decodes', undec.slice(0, 3).join(', '));
    await p.evaluate(() => { for (const d of document.querySelectorAll('details')) d.open = false; }); }
  /* the copy text carries every choice */
  { const out = await p.$eval('#out', (t) => t.value), lines = out.split('\n');
    const lost = D.choices.filter((c) => !lines.some((l) => l.startsWith(c.id + ': ')));
    ok(lines[0].startsWith('REVIEW · legibility r1 · ' + D.pageSha + ' · ') && /^\d+ yours · \d+ left as my pick$/.test(lines[1]), 'the copy text opens with the page, the feed and the work, then the counts', lines[0] + ' / ' + lines[1]);
    ok(lost.length === 0, 'the copy text carries every choice, one line each', lost.map((c) => c.id).join(',') || D.choices.length + ' lines');
    ok(['CALLS', 'PROPOSALS', 'PATTERNS'].every((g) => lines.includes(g)), 'the copy text groups calls · proposals · patterns');
    const notRuled = D.choices.filter((c) => !c.ruled).every((c) => lines.find((l) => l.startsWith(c.id + ': ')).endsWith('(my pick, not ruled)'));
    ok(notRuled, 'untouched, a line at my pick says it is not ruled'); }
  /* a click makes a look yours, the copy line follows, the store keeps it, and clear gives it back */
  { const c = D.calls.find((x) => !x.ruled && x.opts.length > 1), other = c.opts.find((o) => o.v !== c.pick);
    await p.click('[data-call="' + c.id + '"] [data-choice="' + c.id + '"][data-v="' + other.v + '"]');
    const out = await p.$eval('#out', (t) => t.value), ln = out.split('\n').find((l) => l.startsWith(c.id + ': '));
    const stored = await p.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return 'throws'; } }, 'gabe:legibility:r1');
    ok(ln === c.id + ': ' + other.name + ' (yours, I picked ' + c.opts.find((o) => o.v === c.pick).name + ')', 'a click on another look makes it yours, and the copy line says what I picked', ln);
    ok(stored === 'throws' || (stored && stored.v && stored.v[c.id] && stored.v[c.id].v === other.v), 'the choice is kept under gabe:legibility:r1');
    await p.click('#reset'); const back = (await p.$eval('#out', (t) => t.value)).split('\n').find((l) => l.startsWith(c.id + ': '));
    ok(back.endsWith('(my pick, not ruled)'), 'clear gives every choice back to my pick', back); }
  /* no unfilled words */
  { const left = await p.evaluate(() => { const t = document.body.innerText; const m = t.match(/(?<![\/'"\w{])\{[a-z]\w*\}|\{\{\w+\}\}|\bundefined\b|\bNaN\b/g); return m || []; });
    ok(left.length === 0, 'no unfilled {token}, undefined or NaN on the page', left.slice(0, 4).join(' ')); }
  /* the 12px floor, and no sideways scroll */
  { const small = await p.evaluate(() => { const out = []; const w = document.createTreeWalker(document.querySelector('.artifact-page'), NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) { if (!n.nodeValue.trim()) continue; const e = n.parentElement; const r = e.getClientRects(); if (!r.length || !r[0].width) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 12) out.push(fs + 'px ' + n.nodeValue.trim().slice(0, 30)); } return out; });
    ok(small.length === 0, 'no text under the 12px floor', small.slice(0, 3).join(' | '));
    const side = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(side <= 1, 'the page does not scroll sideways at 1500px', side + 'px');
    await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(200);
    const side2 = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(side2 <= 1, 'nor at phone width (390px)', side2 + 'px'); await p.setViewportSize({ width: 1500, height: 1000 }); }
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); for (const id of SECS) { const el = await p.$('#' + id); if (el) await el.screenshot({ path: path.join(SHOTS, id + '.png') }).catch((e) => console.log('  (no picture of ' + id + ': ' + e.message.split('\n')[0] + ')')); } console.log('  section pictures in ' + SHOTS); }
} finally { await b.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(`probe-legibility-review: ${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);
