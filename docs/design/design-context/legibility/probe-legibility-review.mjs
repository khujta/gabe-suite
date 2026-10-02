/* probe-legibility-review.mjs — a SMOKE probe of the legibility review page (D-037 light: build, --check, this probe once).
   It loads with no page error · every section draws · every picture file exists and decodes · the copy text carries every choice ·
   no unfilled {token}, undefined or NaN · a click makes a look yours and the copy line says so · pictures at full size scroll in their
   own box · no he · him · his · no text under 12px · no sideways scroll.
   Round 2 (D-072): every section opens with a spoken summary and a copy button (the copied text is the text shown; no id, path or symbol,
   no {token}, 3 to 6 sentences) · the top button copies every summary in page order, each headed by its section · the listen button is
   there where speechSynthesis is and hidden where it is not, reads the summary's sentences, stops on a second click, and keeps its speed ·
   at 1920 and 1600 px no cell of a short-value column wraps and no table spills out of its box · each pattern wears its own mark.

   Round 3 (D-074): a mocked speechSynthesis (two voices; an utterance ends after a short timer) drives the player: while a voice plays the
   contents bar is frozen at the top of the screen and visible when the page is scrolled · starting a reading moves nothing on the page ·
   next / a chip / previous move the reading AND scroll the page to that section, the summary being read is highlighted and its chip lit ·
   when the reading moves on by itself the page follows (off: it stays) · pause holds it, play goes on from the same sentence · stop lets the
   bar go · "always" keeps it frozen with no voice, is remembered, and rides the copy text · a saved gabe:voice:v1 reaches the utterance (voice,
   rate, pitch, volume, pauses, titles) · a Piper voice falls back and says so in the hover · the bar fits at 390 px.

     node docs/design/design-context/legibility/probe-legibility-review.mjs [--html <file>] [--shots <dir>] [--bar <dir>]   # browser-gated; run it ALONE
       --shots <dir>   also save a picture of the top of each section there, at 1920 and at 1600 px wide (for looking, never committed)
       --bar <dir>     also save one picture at 1920 px of the frozen bar mid-page while the (mocked) reading is on it (never committed) */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname), REPO = path.resolve(HERE, '../../../..');
const PW = path.join(REPO, 'docs/design/graft-adoption/spike/_build/node_modules/playwright-core'), CHROME = '/usr/bin/google-chrome-stable';
const args = process.argv.slice(2), opt = (k) => (args.indexOf(k) >= 0 ? args[args.indexOf(k) + 1] : null);
const SRC = path.resolve(opt('--html') || path.join(HERE, 'legibility-review.html')), SHOTS = opt('--shots'), BARSHOT = opt('--bar');
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
  ok(n.props === D.patterns.reduce((a, x) => a + x.suite.length, 0) + 1 && !!(await p.$('#sec-pat [data-audit] [data-choice="' + D.audit.id + '"]')), 'every draft suite proposal has its choice, and the audit its own', String(n.props));
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
  /* the pictures at full size stay inside their own scrollers (L10) */
  { await p.click('#fullsize'); await p.waitForTimeout(200); const side = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const wide = await p.evaluate(() => [...document.querySelectorAll('#sec-calls figure.pic img')].some((i) => i.getBoundingClientRect().width > i.closest('a').getBoundingClientRect().width + 1));
    await p.click('#fullsize'); ok(side <= 1 && wide, 'pictures at full size scroll inside their own box, never the page', side + 'px'); }
  /* the page speaks to you: no he · him · his in what it draws (L17) */
  { const he = await p.evaluate(() => (document.querySelector('.artifact-page').innerText.match(/.{0,30}\b(he|him|his)\b.{0,20}/gi) || []));
    ok(he.length === 0, 'no he · him · his on the page', he.slice(0, 2).join(' | ')); }
  /* no unfilled words */
  { const left = await p.evaluate(() => { const t = document.body.innerText; const m = t.match(/(?<![\/'"\w{])\{[a-z]\w*\}|\{\{\w+\}\}|\bundefined\b|\bNaN\b/g); return m || []; });
    ok(left.length === 0, 'no unfilled {token}, undefined or NaN on the page', left.slice(0, 4).join(' ')); }

  /* ── round 2 (D-072): the spoken summaries, the listen button, width, and the marks ── */
  const DOMSECS = await p.evaluate(() => [...document.querySelectorAll('.artifact-page > section.sec')].map((s) => ({ id: s.id, title: s.querySelector('.st').textContent.trim(), say: s.querySelector('[data-say]') && s.querySelector('[data-say]').getAttribute('data-say'),
    text: s.querySelector('[data-say-text]') ? s.querySelector('[data-say-text]').textContent : null, copy: !!s.querySelector('[data-say-copy]'), listen: !!s.querySelector('[data-say] [data-listen]'), first: !!s.querySelector('.body').firstElementChild.matches('[data-say]') })));
  { const bad = DOMSECS.filter((x) => !x.text || !x.copy || !x.first);
    ok(DOMSECS.length === 8 && bad.length === 0, 'every section opens with a spoken summary and its copy button', bad.map((x) => x.id).join(',') || DOMSECS.length + ' sections');
    ok(JSON.stringify(DOMSECS.map((x) => x.id)) === JSON.stringify(D.say.map((x) => x.id)) && DOMSECS.every((x, i) => x.text === D.say[i].text && x.title === D.say[i].title), 'the summaries stand in the page order, and each is the text the generator wrote'); }
  { const BAD = [[/[·→/×|#{}]/, 'a symbol'], [/\b(?:L|R|D|EX|CR|N3|S4)-\d+/, 'an id'], [/\b[PGFA]\d{1,2}\b/, 'an id'], [/(^|\s)[xg]:/i, 'an id'], [/\b[\w-]+\.(?:py|mjs|js|json|md|html|tsx?|css)\b/i, 'a file'], [/\bundefined\b|\bNaN\b|\{[^}]*\}|\{\{/, 'a missing value or token']];
    const hits = []; for (const x of DOMSECS) { for (const [rx, w] of BAD) { const m = rx.exec(x.text); if (m) hits.push(x.id + ': ' + w + ' “' + m[0] + '”'); }
      const n = (x.text.match(/[^.!?]+[.!?]+(\s|$)/g) || []).length; if (n < 3 || n > 6) hits.push(x.id + ': ' + n + ' sentences'); }
    ok(hits.length === 0, 'no summary holds an id, a path, a symbol, a missing value or a {token}; each is 3 to 6 sentences', hits.slice(0, 3).join(' | ') || DOMSECS.length + ' summaries'); }
  /* the copy buttons: what lands on the clipboard is the text shown (the page's navigator.clipboard.writeText is captured, not trusted) */
  { await p.evaluate(() => { window.__clip = null; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { window.__clip = t; return Promise.resolve(); } } }); });
    const diff = []; for (const x of DOMSECS) { await p.click('[data-say-copy="' + x.say + '"]'); const got = await p.evaluate(() => window.__clip); if (got !== x.text) diff.push(x.id); }
    ok(diff.length === 0, 'each copy button puts exactly the summary shown on the clipboard', diff.join(',') || DOMSECS.length + ' of ' + DOMSECS.length);
    await p.click('#copyall'); const all = await p.evaluate(() => window.__clip), want = DOMSECS.map((x) => x.title + '\n' + x.text).join('\n\n');
    ok(all === want, 'the top button copies every summary, in page order, each headed by its section name', all === want ? DOMSECS.length + ' summaries' : String(all).slice(0, 80)); }
  /* the listen button: there where speechSynthesis is, hidden where it is not; a click reads the sentences, a second one stops; the speed is kept */
  { const has = await p.evaluate(() => typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined');
    const L = await p.evaluate(() => ({ n: document.querySelectorAll('[data-listen]').length, shown: [...document.querySelectorAll('[data-listen]')].filter((b) => !b.hidden && b.getBoundingClientRect().width > 0).length, dashed: [...document.querySelectorAll('[data-listen]')].every((b) => b.dataset.mine === 'true'), rate: !!document.querySelector('[data-listen-rate] select') }));
    ok(has && L.n === DOMSECS.length + 1 && L.shown === L.n && L.dashed && L.rate, 'a listen button stands beside each copy button and at the top, each dashed (my proposal), with one speed control', `${L.n} buttons · ${L.shown} shown · speechSynthesis ${has ? 'present' : 'absent'}`);
    const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
    const none = await ctx.newPage(); await none.addInitScript(() => { try { delete window.speechSynthesis; } catch (e) {} Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined }); });
    await none.goto('file://' + page); await none.waitForFunction('window.__leg && window.__leg.ready', { timeout: 20000 }).catch(() => {});
    const hid = await none.evaluate(() => ({ n: document.querySelectorAll('[data-listen]').length, shown: [...document.querySelectorAll('[data-listen], [data-listen-rate]')].filter((b) => b.getBoundingClientRect().width > 0).length }));
    ok(hid.n > 0 && hid.shown === 0, 'where speechSynthesis is missing, every listen button and the speed control hide', `${hid.n} buttons · ${hid.shown} shown`); await none.close();
    const fake = await ctx.newPage(); await fake.addInitScript(() => { window.__said = []; window.__cancels = 0; const ss = { speak: (u) => { window.__said.push({ text: u.text, rate: u.rate }); }, cancel: () => { window.__cancels++; }, getVoices: () => [], addEventListener: () => {} }; Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: ss }); });
    await fake.goto('file://' + page); await fake.waitForFunction('window.__leg && window.__leg.ready', { timeout: 20000 }).catch(() => {});
    const first = D.say[0], btn = '[data-say="' + first.key + '"] [data-listen]';
    await fake.click(btn); await fake.waitForTimeout(250); const on = await fake.evaluate((s) => { const b = document.querySelector(s); return { pressed: b.getAttribute('aria-pressed'), label: b.textContent.trim(), said: window.__said.map((x) => x.text) }; }, btn);
    ok(on.pressed === 'true' && on.label === D.ui.say.stop && on.said[0] === first.text.split(/(?<=[.!?])\s+/)[0], 'a click on listen reads the summary from its first sentence and the button turns to stop', on.label + ' · ' + (on.said[0] || '').slice(0, 40));
    { const r0 = await fake.evaluate(() => window.__said[0] && window.__said[0].rate);   /* D-075: with nothing saved, his pasted pick is the reading voice */
      ok(D.voice && Math.abs(r0 - D.voice.rate) < 1e-6 && D.voice.voice === 'Google UK English Female', 'with nothing saved, the reading uses his voice pick (D-075): its speed reaches the utterance', 'rate ' + r0); }
    await fake.click(btn); await fake.waitForTimeout(100); const off = await fake.evaluate((s) => { const b = document.querySelector(s); return { pressed: b.getAttribute('aria-pressed'), label: b.textContent.trim(), cancels: window.__cancels }; }, btn);
    ok(off.pressed === 'false' && off.label === D.ui.say.listen && off.cancels >= 1, 'a second click stops it and the button is listen again', off.label);
    await fake.selectOption('[data-listen-rate] select', '2'); const kept = await fake.evaluate(() => window.localStorage.getItem('gabe:legibility:r1:rate'));
    await fake.click(btn); await fake.waitForTimeout(250); const rate = await fake.evaluate(() => window.__said[window.__said.length - 1].rate);
    ok(kept === '2' && rate > 1, 'the speed is kept in the browser and the next reading uses it', 'stored ' + kept + ' · rate ' + rate);
    await fake.reload(); await fake.waitForFunction('window.__leg && window.__leg.ready', { timeout: 20000 }).catch(() => {}); const again = await fake.$eval('[data-listen-rate] select', (e) => e.value);
    ok(again === '2', 'and it is still there after a reload', 'speed ' + again); await ctx.close(); }
  /* the marks: each pattern wears a mark of its own in the legend; every state mark carries its word in its hover */
  { const m = await p.evaluate(() => { const pm = [...document.querySelectorAll('#legend .lgg.wide .mk.pm')].map((x) => x.querySelector('svg').innerHTML);
      const marks = [...document.querySelectorAll('.artifact-page .mk[title]')]; return { pm: pm.length, distinct: new Set(pm).size, marks: marks.length, noWord: marks.filter((x) => !x.title.trim()).length, groups: document.querySelectorAll('#legend .lgg').length }; });
    ok(m.pm === D.patterns.length && m.distinct === m.pm, 'the legend gives each pattern its own mark, and says the marks once', `${m.pm} patterns · ${m.distinct} distinct marks · ${m.groups} legend groups`);
    ok(m.marks > 50 && m.noWord === 0, 'every mark on the page carries its word in the hover', m.marks + ' marks'); }
  /* the width (L-24): the column takes the screen, no cell of a short-value column wraps, no table spills out of its box — at 1920 and at 1600 */
  const widthCheck = (W) => p.evaluate((W) => { for (const d of document.querySelectorAll('details')) d.open = true;
    const col = document.querySelector('.artifact-page').getBoundingClientRect().width; let n = 0; const wrapped = [], spill = [];
    for (const c of document.querySelectorAll('table.t td.sv, table.t td.num, table.t td.id, table.t th.sv, table.t th.num, table.t th.id')) { if (!c.getClientRects().length) continue; n++;
      const r = document.createElement('span'); r.textContent = 'M'; r.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap'; c.appendChild(r); const L = r.getBoundingClientRect().height; c.removeChild(r);
      const g = document.createRange(); g.selectNodeContents(c); const H = g.getBoundingClientRect().height; if (H > 1.5 * L) wrapped.push((c.textContent || '').trim().slice(0, 30) + ' (' + Math.round(H) + 'px vs ' + Math.round(L) + ')'); }
    for (const w of document.querySelectorAll('.tw')) { if (w.clientWidth && w.scrollWidth - w.clientWidth > 1) spill.push((w.closest('.panel').querySelector('h3') || { textContent: '?' }).textContent.slice(0, 30) + ' +' + (w.scrollWidth - w.clientWidth)); }
    const rows = [...document.querySelectorAll('table.t')].filter((t) => t.getClientRects().length).length; for (const d of document.querySelectorAll('details')) d.open = false;
    return { col: Math.round(col), n, wrapped, spill, rows, side: document.documentElement.scrollWidth - window.innerWidth }; }, W);
  for (const W of [1920, 1600]) { await p.setViewportSize({ width: W, height: 1000 }); await p.waitForTimeout(250); const r = await widthCheck(W);
    ok(r.col >= Math.min(0.9 * W, 1500), `at ${W}px the column takes the screen`, r.col + 'px of ' + W);
    ok(r.n > 100 && r.wrapped.length === 0, `at ${W}px no cell of a short-value column wraps: its height is one line`, r.wrapped.slice(0, 3).join(' | ') || `${r.n} cells in ${r.rows} tables`);
    ok(r.spill.length === 0 && r.side <= 1, `at ${W}px no table spills out of its box and the page does not scroll sideways`, r.spill.slice(0, 3).join(' | ') || r.side + 'px'); }
  await p.setViewportSize({ width: 1500, height: 1000 }); await p.waitForTimeout(200);
  /* the 12px floor, and no sideways scroll */
  { const small = await p.evaluate(() => { const out = []; const w = document.createTreeWalker(document.querySelector('.artifact-page'), NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) { if (!n.nodeValue.trim()) continue; const e = n.parentElement; const r = e.getClientRects(); if (!r.length || !r[0].width) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 12) out.push(fs + 'px ' + n.nodeValue.trim().slice(0, 30)); } return out; });
    ok(small.length === 0, 'no text under the 12px floor', small.slice(0, 3).join(' | '));
    const side = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(side <= 1, 'the page does not scroll sideways at 1500px', side + 'px');
    await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(200);
    const side2 = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(side2 <= 1, 'nor at phone width (390px)', side2 + 'px'); await p.setViewportSize({ width: 1500, height: 1000 }); }

  /* ── round 3 (D-074): the contents bar freezes while a voice plays and steers the reading ── */
  { const KEYS = D.say.map((x) => x.key), IDS = D.say.map((x) => x.id), VKEY = 'gabe:voice:v1';
    /* a fake speechSynthesis with two voices: an utterance ends `ms` after it starts, as a browser would; cancel ends it with an "interrupted" error, as Chrome does */
    const mock = ({ ms, saved }) => { window.__ss = { said: [], cancels: 0, ms }; let cur = null;
      if (saved) { try { localStorage.setItem('gabe:voice:v1', JSON.stringify(saved)); } catch (e) {} }
      window.SpeechSynthesisUtterance = function (text) { this.text = text; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null; this.lang = ''; };
      const voices = [{ name: 'Mock Natural One', lang: 'en-US' }, { name: 'Mock Two', lang: 'en-GB' }];
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => voices, addEventListener() {},
        cancel() { window.__ss.cancels++; if (cur) { const c = cur; cur = null; clearTimeout(c.tm); setTimeout(() => c.u.onerror && c.u.onerror({ error: 'interrupted' }), 0); } },
        speak(u) { window.__ss.said.push({ text: u.text, rate: u.rate, pitch: u.pitch, volume: u.volume, voice: u.voice && u.voice.name, lang: u.lang, t: performance.now() });
          const c = { u, tm: setTimeout(() => { if (cur === c) { cur = null; u.onend && u.onend({}); } }, window.__ss.ms) }; cur = c; } } }); };
    const open = async (opts, w = 1500) => { const ctx = await b.newContext({ viewport: { width: w, height: 1000 } }), pg = await ctx.newPage(), er = []; pg.on('pageerror', (e) => er.push(e.message)); await pg.addInitScript(mock, opts);
      await pg.goto('file://' + page); await pg.waitForFunction('window.__leg && window.__leg.ready', { timeout: 20000 }).catch(() => {}); pg.setDefaultTimeout(6000); pg.__errs = er; pg.__ctx = ctx; return pg; };
    const run = async (name, fn) => { try { await fn(); } catch (e) { ok(false, name + ' runs to the end', String(e.message).split('\n')[0]); } };
    const barOf = (pg) => pg.evaluate(() => { const n = document.getElementById('bar'), r = n.getBoundingClientRect(), cs = getComputedStyle(n), lit = [...n.querySelectorAll('a.tc')].findIndex((a) => a.dataset.lit === 'true');
      const pl = n.querySelector('.player'); return { frozen: n.dataset.frozen, player: n.dataset.player, pos: cs.position, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), shown: r.height > 0 && cs.visibility !== 'hidden', lit, playerShown: !!pl && getComputedStyle(pl).display !== 'none', reading: window.__leg.reading(), hot: [...document.querySelectorAll('[data-say]')].filter((x) => x.dataset.reading === 'true').map((x) => x.dataset.say), n: window.__ss.said.length }; });
    const secTop = (pg, id) => pg.evaluate((i) => Math.round(document.getElementById(i).getBoundingClientRect().top), id);
    const scrollInto = (pg, id, dy = 300) => pg.evaluate(([i, d]) => window.scrollTo(0, document.getElementById(i).getBoundingClientRect().top + window.scrollY + d), [id, dy]);
    const waitFor = (pg, fn, arg, t = 6000) => pg.waitForFunction(fn, arg, { timeout: t }).then(() => true, () => false);
    const near = (top, bar) => top >= bar.bottom - 2 && top <= bar.bottom + 40;

    /* the default: the bar is a plain strip until a voice plays; a reading starts from a section's own button and moves nothing */
    const A = await open({ ms: 500 });
    await run('the default and the reading', async () => { const s0 = await barOf(A); const opt = await A.evaluate(() => { const g = (k) => [...document.querySelectorAll('[data-pref="' + k + '"]')].map((x) => x.dataset.v + ':' + x.getAttribute('aria-pressed') + ':' + x.dataset.mine);
        return { bar: g('bar'), follow: g('follow'), nav: document.getElementById('bar').parentElement.className }; });
      ok(s0.frozen === 'false' && s0.pos === 'static' && !s0.playerShown && s0.player === 'false', 'with no voice the contents bar is a plain strip in the page: not frozen, no player showing', `${s0.pos} · player ${s0.player}`);
      ok(JSON.stringify(opt.bar) === '["playing:true:false","always:false:true"]' && JSON.stringify(opt.follow) === '["on:false:true","off:false:false"]', 'the two options stand beside the speed: the bar stays at the top only while a voice plays (ruled, filled) or always (my alternative, dashed); follow the reading on (my pick, dashed) or off', opt.bar.join(' ') + ' | ' + opt.follow.join(' '));
      await A.evaluate(() => { for (const e of document.querySelectorAll('[data-listen-rate]')) e.querySelector('select').value = '1'; });
      await scrollInto(A, IDS[3], 120); await A.waitForTimeout(150);
      const before = await A.evaluate(() => Math.round(document.querySelector('[data-say="calls"]').getBoundingClientRect().top));
      await A.click('[data-say="calls"] [data-listen]'); await A.waitForTimeout(250);
      const s1 = await barOf(A), after = await A.evaluate(() => Math.round(document.querySelector('[data-say="calls"]').getBoundingClientRect().top));
      ok(s1.frozen === 'true' && s1.pos === 'sticky' && s1.top === 0 && s1.shown && s1.playerShown && s1.reading.on, 'a listen button starts a reading and the contents bar freezes at the top of the screen with the player in it', `${s1.pos} · top ${s1.top} · ${s1.h}px high`);
      ok(Math.abs(after - before) <= 2, 'starting a reading moves nothing on the page: the summary stays where it was', before + ' → ' + after + 'px');
      ok(s1.lit === 3 && s1.reading.i === 3 && s1.hot.join() === 'calls', 'the section being read has its chip lit and its summary highlighted, and no other', `chip ${s1.lit} · ${s1.hot.join()}`);
      await A.evaluate(() => window.scrollBy(0, 2600)); await A.waitForTimeout(100); const s2 = await barOf(A);
      ok(s2.top === 0 && s2.shown && s2.pos === 'sticky', 'scrolled far down, the bar is still at the top and visible', 'top ' + s2.top);
      /* next: the reading and the page both go to the next section */
      await A.click('[data-act="next"]'); await A.waitForTimeout(250); const s3 = await barOf(A), t3 = await secTop(A, IDS[4]), said3 = await A.evaluate(() => window.__ss.said.slice(-3).map((x) => x.text));
      ok(s3.reading.i === 4 && s3.lit === 4 && s3.hot.join() === 'items' && near(t3, s3), 'next moves the reading to the next summary and scrolls the page to that section, just under the bar', `index ${s3.reading.i} · section top ${t3} · bar bottom ${s3.bottom}`);
      ok(said3.includes(D.say[4].title + '.'), 'a skip carries on through the summaries, so the section name is read before its first sentence', said3[0]);
      /* a chip skips there; previous steps back; the ends are disabled */
      await A.click('[data-toc="sec-rem"]'); await A.waitForTimeout(250); const s4 = await barOf(A), t4 = await secTop(A, IDS[1]);
      ok(s4.reading.i === 1 && s4.lit === 1 && s4.hot.join() === 'rem' && near(t4, s4), 'a chip skips the reading to its section and scrolls the page there', `index ${s4.reading.i} · section top ${t4}`);
      await A.click('[data-act="prev"]'); await A.waitForTimeout(200); const s5 = await barOf(A), dis = await A.evaluate(() => document.querySelector('[data-act="prev"]').disabled);
      ok(s5.reading.i === 0 && dis, 'previous steps back one section, and is off at the first', `index ${s5.reading.i} · prev disabled ${dis}`);
      /* the reading moves on by itself: the page follows it (on), or stays (off) */
      await A.evaluate(() => { window.__ss.ms = 25; });   /* quick sentences, so the reading reaches the end of a section in a moment */
      await A.click('[data-toc="sec-rem"]'); const adv = await waitFor(A, () => window.__leg.reading().i === 2); await A.waitForTimeout(150); const s6 = await barOf(A), t6 = await secTop(A, IDS[2]);
      ok(adv && s6.hot.join() === 'pat' && near(t6, s6), 'when the reading moves on by itself the page follows it to the next section', `index ${s6.reading.i} · section top ${t6}`);
      await A.click('[data-pref="follow"][data-v="off"]'); const kept = await A.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k)).p; } catch (e) { return null; } }, 'gabe:legibility:r1');
      await A.click('[data-toc="sec-glance"]'); await A.waitForTimeout(200); const y0 = await A.evaluate(() => window.scrollY); const adv2 = await waitFor(A, () => window.__leg.reading().i === 1); await A.waitForTimeout(150); const y1 = await A.evaluate(() => window.scrollY);
      ok(adv2 && Math.abs(y1 - y0) <= 2 && kept && kept.follow === 'off', 'with follow off the reading moves on and the page stays where it is, and the choice is kept in the browser', `index 1 · scroll ${y0} → ${y1}`);
      /* pause holds it, play goes on from the same sentence */
      await A.click('[data-pref="follow"][data-v="off"]');   /* back to the default (clicking the pressed one gives it back) */
      await A.evaluate(() => { window.__ss.ms = 400; });
      await A.click('[data-toc="sec-gap"]'); await A.waitForTimeout(120);
      await A.click('[data-act="playpause"]'); await A.waitForTimeout(120); const p1 = await barOf(A), st1 = await A.evaluate(() => document.querySelector('[data-act="playpause"]').dataset.state); await A.waitForTimeout(350); const p2 = await barOf(A);
      await A.click('[data-act="playpause"]'); await A.waitForTimeout(250); const p3 = await barOf(A);
      ok(st1 === 'paused' && p2.n === p1.n && p3.n > p2.n && p3.frozen === 'true', 'pause holds the reading (nothing more is spoken, the bar stays frozen) and play goes on', `${p1.n} → ${p2.n} → ${p3.n} sentences`);
      /* stop ends it and the bar lets go */
      await A.click('[data-act="stop"]'); await A.waitForTimeout(150); const e1 = await barOf(A); await A.evaluate(() => window.scrollBy(0, 1800)); await A.waitForTimeout(100); const e2 = await barOf(A);
      ok(e1.frozen === 'false' && e1.pos === 'static' && !e1.reading.on && !e1.playerShown && e1.hot.length === 0 && e1.lit === -1 && e2.top < 0, 'stop ends the reading, clears the highlight, and the bar lets go: it scrolls away with the page', `${e1.pos} · top ${e2.top}`);
      /* the 12px floor with the bar frozen and playing */
      await A.click('[data-say="calls"] [data-listen]'); await A.waitForTimeout(200);
      const small = await A.evaluate(() => { const out = [], w = document.createTreeWalker(document.getElementById('bar'), NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (!n.nodeValue.trim()) continue; const e = n.parentElement; if (!e.getClientRects().length) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 12) out.push(fs + 'px ' + n.nodeValue.trim().slice(0, 20)); } return out; });
      ok(small.length === 0, 'no text under the 12px floor in the bar while it plays', small.slice(0, 2).join(' | '));
      await A.click('[data-act="stop"]');
      ok(A.__errs.length === 0, 'the player runs with no page error', A.__errs.slice(0, 2).join(' | ')); });
    await A.__ctx.close();

    /* "always": the bar stays frozen with no voice, the choice is kept, and it rides the copy text */
    const B = await open({ ms: 400 });
    await run('always', async () => { await B.click('[data-pref="bar"][data-v="always"]'); await B.waitForTimeout(100); await scrollInto(B, IDS[4], 300); await B.waitForTimeout(100); const s = await barOf(B);
      const idle = await B.evaluate(() => ({ st: document.querySelector('[data-act="playpause"]').dataset.state, stopOff: document.querySelector('[data-act="stop"]').disabled }));
      ok(s.frozen === 'true' && s.top === 0 && s.shown && s.playerShown && !s.reading.on && idle.st === 'idle' && idle.stopOff, 'with "always" the bar stays frozen at the top with no voice, its player idle (play ready, stop off)', `top ${s.top} · ${idle.st}`);
      const stored = await B.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k)).p; } catch (e) { return null; } }, 'gabe:legibility:r1'), lines = (await B.$eval('#out', (x) => x.value)).split('\n');
      const bi = lines.indexOf('PLAYER'), lb = lines.find((l) => l.startsWith('pl.bar: ')), lf = lines.find((l) => l.startsWith('pl.follow: '));
      ok(stored && stored.bar === 'always' && bi > 0 && lb === 'pl.bar: always (yours, you ruled only while a voice plays in D-074)' && lf === 'pl.follow: on (my pick, not ruled)', 'the choice is kept in the browser and the copy text carries both options', (lb || '') + ' | ' + (lf || ''));
      await B.reload(); await B.waitForFunction('window.__leg && window.__leg.ready', { timeout: 20000 }).catch(() => {}); const again = await barOf(B), pr = await B.$eval('[data-pref="bar"][data-v="always"]', (x) => x.getAttribute('aria-pressed'));
      ok(again.frozen === 'true' && pr === 'true', 'and it is still "always" after a reload', again.frozen);
      await scrollInto(B, IDS[5], 200); await B.waitForTimeout(100); await B.click('[data-act="playpause"]'); await B.waitForTimeout(200); const g = await barOf(B);
      ok(g.reading.on && g.reading.all && g.reading.i === 5 && g.lit === 5, 'play on the idle bar reads on from the section in view, through every summary', `index ${g.reading.i}`);
      await B.click('[data-act="stop"]'); await B.waitForTimeout(100); const g2 = await barOf(B); ok(g2.frozen === 'true', 'stop under "always" keeps the bar frozen', g2.frozen);
      await B.click('#reset'); await B.waitForTimeout(100); const g3 = await barOf(B);
      ok(g3.frozen === 'false', 'clearing the choices gives the options back to their defaults', g3.frozen); });
    await B.__ctx.close();

    /* the voice lab's saved setting reaches the utterance: voice, rate, pitch, volume, the pauses, whether section names are read */
    const SAVED = { engine: 'browser', voice: 'Mock Two', lang: 'en-GB', rate: 1.3, pitch: 0.8, volume: 0.5, pauseSentence: 160, pauseSection: 320, readTitles: true };
    const C = await open({ ms: 40, saved: SAVED });
    await run('the saved voice', async () => { await scrollInto(C, IDS[0], 100); await C.click('[data-say="glance"] [data-listen]'); await C.waitForTimeout(700);
      const u = await C.evaluate(() => window.__ss.said.slice(0, 3)), want = D.say[0].text.split(/(?<=[.!?])\s+/);
      ok(u.length >= 2 && u[0].text === D.say[0].title + '.' && u[1].text === want[0], 'a saved readTitles reads the section name first, then the sentences one by one', (u[0] && u[0].text) + ' / ' + (u[1] && u[1].text || '').slice(0, 30));
      ok(u[0].voice === 'Mock Two' && u[0].lang === 'en-GB' && Math.abs(u[0].rate - 1.3) < 1e-9 && Math.abs(u[0].pitch - 0.8) < 1e-9 && Math.abs(u[0].volume - 0.5) < 1e-9, 'the saved voice, rate, pitch and volume reach the utterance', `${u[0].voice} · rate ${u[0].rate} · pitch ${u[0].pitch} · volume ${u[0].volume}`);
      const gap = u[1].t - u[0].t; ok(gap >= 40 + 160 - 25, 'the pause between sentences is the saved one', Math.round(gap) + 'ms for a 40ms sentence and a 160ms pause');
      await C.selectOption('[data-listen-rate] select', '2'); await C.click('[data-say="glance"] [data-listen]'); await C.click('[data-say="glance"] [data-listen]'); await C.waitForTimeout(300);
      const fast = await C.evaluate(() => window.__ss.said[window.__ss.said.length - 1].rate); ok(Math.abs(fast - 1.3 * 1.25) < 1e-9, 'the speed control goes round the saved rate: faster is a quarter more', 'rate ' + fast);
      await C.click('[data-act="stop"]').catch(() => {}); await C.evaluate((s) => localStorage.setItem('gabe:voice:v1', JSON.stringify(Object.assign({}, s, { readTitles: false }))), SAVED);
      await C.evaluate(() => { window.__ss.said.length = 0; }); await C.click('[data-say="glance"] [data-listen]'); await C.waitForTimeout(250); const nt = await C.evaluate(() => window.__ss.said[0].text);
      ok(nt === want[0], 'a saved readTitles of false leaves the section name out', nt.slice(0, 40)); await C.click('[data-act="stop"]'); });
    await C.__ctx.close();
    const PI = await open({ ms: 300, saved: { engine: 'piper', voice: 'en_US-lessac-medium', rate: 1 } });
    await run('piper', async () => { await PI.click('[data-say="glance"] [data-listen]'); await PI.waitForTimeout(250); const u = await PI.evaluate(() => window.__ss.said[0]), tip = await PI.$eval('.vox', (x) => x.title);
      ok(u.voice === 'Mock Natural One' && /Piper/.test(tip), 'a saved Piper voice has no live voice here: the browser voice reads, and the bar\'s hover says so', u.voice + ' · ' + tip.slice(0, 60)); await PI.click('[data-act="stop"]'); });
    await PI.__ctx.close();

    /* at phone width: the frozen bar fits the screen and the page does not scroll sideways */
    const PH = await open({ ms: 500 }, 390);
    await run('phone width', async () => { await scrollInto(PH, IDS[3], 200); await PH.click('[data-say="calls"] [data-listen]'); await PH.waitForTimeout(250); const s = await barOf(PH), side = await PH.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const box = await PH.evaluate(() => { const n = document.getElementById('bar'), t = n.querySelector('.tcs'), r = n.getBoundingClientRect(); return { right: Math.round(r.right), vw: window.innerWidth, chipsScroll: t.scrollWidth > t.clientWidth, inside: [...n.querySelectorAll('.player > *')].every((x) => x.getBoundingClientRect().right <= r.right + 1) }; });
      ok(s.top === 0 && s.h <= 190 && side <= 1 && box.right <= box.vw && box.inside, 'at 390px the frozen bar sits at the top, takes under a fifth of the screen, holds its controls, and the page does not scroll sideways', `${s.h}px high · chips ${box.chipsScroll ? 'scroll inside' : 'fit'} · sideways ${side}px`);
      await PH.click('[data-act="stop"]'); });
    await PH.__ctx.close();
    if (BARSHOT) { const PB = await open({ ms: 600000 }, 1920); await PB.setViewportSize({ width: 1920, height: 1000 }); await scrollInto(PB, IDS[4], 40); await PB.click('[data-say="items"] [data-listen]'); await PB.waitForTimeout(300);
      fs.mkdirSync(BARSHOT, { recursive: true }); await PB.screenshot({ path: path.join(BARSHOT, 'frozen-bar-1920.png') }); console.log('  the frozen bar at 1920 px in ' + BARSHOT); await PB.__ctx.close(); } }
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true });
    for (const W of [1920, 1600]) { await p.setViewportSize({ width: W, height: 1000 }); await p.waitForTimeout(300);
      for (const id of ['header', ...SECS]) { const y = await p.evaluate((id) => { const e = id === 'header' ? document.querySelector('header') : document.getElementById(id); const r = e.getBoundingClientRect(); return { y: r.top + window.scrollY, h: r.height }; }, id);
        await p.screenshot({ path: path.join(SHOTS, id + '-' + W + '.png'), clip: { x: 0, y: y.y, width: W, height: Math.min(y.h, 1000) }, fullPage: true }).catch((e) => console.log('  (no picture of ' + id + ': ' + e.message.split('\n')[0] + ')')); } }
    console.log('  section tops at 1920 and 1600 px in ' + SHOTS); }
} finally { await b.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(`probe-legibility-review: ${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);
