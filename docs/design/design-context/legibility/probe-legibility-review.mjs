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

   Round 4 (D-077): the bar's chips that hold decisions are dropdowns — a caret on the chip, the section's count of open ones on it, every
   decision listed under its group with an icon for its state; a section with none stays a plain chip · Enter and Space open it, the arrows
   move, Escape closes (focus back on the caret), one is open at a time, an outside click closes it · picking one scrolls its card just under
   the bar, lights it and moves the reading there (starting it when nothing played): the first thing spoken is that decision's summary, its
   plain line comes after it · every decision has a summary (2 to 3 sentences in the data, one more once you have picked, no id, path, symbol,
   number or {token}) and a plain line (one sentence, at most one dash) · "next open decision" skips the decided ones · the option "after a
   decision" (stop · next open · section) does what it says, is kept, and rides the copy text · a card has its plain line and a listen button
   · the dropdown opens as a full-width sheet at 390 px with no sideways scroll.

   Round 5 (D-078): every decision shows an EXAMPLE and the IMPACT of each option on its card (the text the generator wrote), and both are in its spoken
   summary after what choosing sets in motion and before my pick (2 to 5 sentences; no id, path, symbol, number, code name or {token}); and every icon
   follows the hover rules: ONE hover per item (no hover inside a hover; no icon outside a hover), every icon has a non-empty hover, no icon hover on the
   page equals the legend's definition of its kind (the legend says what a kind means, once), a control's hover is six words or fewer, a state mark on a
   decision says that decision's own fact, and a mark's hover is never only its kind's word.

   Round 6 (D-079, D-080): every pattern and decision card opens with the lens blocks, before its plain line, example, options and choices: the pain, the
   picture, the cost and the handle (a pattern adds its steps and its box), in that order, each with its icon and one hover that says what it shows there
   (the pain's kind and its meter, the picture's process, the cost's size and balance and the if-not mark, the pin, numbered steps joined by arrows with the
   failing one marked, the box's does · does not do · decides-when marks, a gain or cost mark on every option's impact); the legend says each new mark once;
   the spoken summary of every decision and of every pattern is rebuilt in that order (the pain first, then the analogy, the cost, the options, my pick;
   4 to 7 sentences, no id, path, symbol, number or code); the authored lens file holds no id, path, symbol, typed digit or number word; the blocks fold to
   one column at 390 px and no text in them is under 12px.

     node docs/design/design-context/legibility/probe-legibility-review.mjs [--html <file>] [--shots <dir>] [--bar <dir>] [--dec <dir>] [--lens <dir>]   # browser-gated; run it ALONE
       --shots <dir>   also save a picture of the top of each section there, at 1920 and at 1600 px wide (for looking, never committed)
       --bar <dir>     also save one picture at 1920 px of the frozen bar mid-page while the (mocked) reading is on it (never committed)
       --dec <dir>     also save two pictures at 1920 px: the bar with a dropdown open, and a decision card lit with its plain line (never committed)
       --lens <dir>    also save pictures at 1920 px of a pattern card's blocks and of a fully encoded decision card, the bar hidden (never committed) */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname), REPO = path.resolve(HERE, '../../../..');
const PW = path.join(REPO, 'docs/design/graft-adoption/spike/_build/node_modules/playwright-core'), CHROME = '/usr/bin/google-chrome-stable';
const args = process.argv.slice(2), opt = (k) => (args.indexOf(k) >= 0 ? args[args.indexOf(k) + 1] : null);
const SRC = path.resolve(opt('--html') || path.join(HERE, 'legibility-review.html')), SHOTS = opt('--shots'), BARSHOT = opt('--bar'), DECSHOT = opt('--dec'), LENSSHOT = opt('--lens');
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
    const hid = await none.evaluate(() => ({ n: document.querySelectorAll('[data-listen], [data-dec-listen]').length, shown: [...document.querySelectorAll('[data-listen], [data-listen-rate], [data-dec-listen]')].filter((b) => b.getBoundingClientRect().width > 0).length }));
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
    ok(m.noWord === 0, 'no hover on a mark is empty (the hover rules proper are round 5\'s, below)', m.marks + ' marks with a hover of their own'); }
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
      ok(s0.frozen === 'true' && s0.playerShown, 'with no voice the bar is already at the top with its player (D-076: all the time is his default)', `${s0.pos} · player ${s0.player}`);   /* CHANGED 2026-10-01 (D-076) */
      ok(JSON.stringify(opt.bar) === '["always:true:false","playing:false:false"]' && JSON.stringify(opt.follow) === '["on:false:true","off:false:false"]', 'the two options stand beside the speed: the bar stays at the top always (ruled D-076, filled) or only while a voice plays; follow the reading on (my pick, dashed) or off', opt.bar.join(' ') + ' | ' + opt.follow.join(' '));
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
      ok(e1.frozen === 'true' && !e1.reading.on && e1.hot.length === 0 && e1.lit === -1 && e2.top === 0, 'stop ends the reading and clears the highlight; the bar stays at the top as you scroll (D-076)', `${e1.pos} · top ${e2.top}`);   /* CHANGED 2026-10-01 (D-076) */
      /* the 12px floor with the bar frozen and playing */
      await A.click('[data-say="calls"] [data-listen]'); await A.waitForTimeout(200);
      const small = await A.evaluate(() => { const out = [], w = document.createTreeWalker(document.getElementById('bar'), NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (!n.nodeValue.trim()) continue; const e = n.parentElement; if (!e.getClientRects().length) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 12) out.push(fs + 'px ' + n.nodeValue.trim().slice(0, 20)); } return out; });
      ok(small.length === 0, 'no text under the 12px floor in the bar while it plays', small.slice(0, 2).join(' | '));
      await A.click('[data-act="stop"]');
      ok(A.__errs.length === 0, 'the player runs with no page error', A.__errs.slice(0, 2).join(' | ')); });
    await A.__ctx.close();

    /* CHANGED 2026-10-01 (D-076): "always" is now the default; this block proves the other option, "only while a voice plays",
       then goes back to always for the idle player */
    const B = await open({ ms: 400 });
    await run('only while a voice plays', async () => { await B.click('[data-pref="bar"][data-v="playing"]'); await B.waitForTimeout(100); await scrollInto(B, IDS[4], 300); await B.waitForTimeout(100); const s = await barOf(B);
      ok(s.frozen === 'false' && !s.reading.on, 'with "only while a voice plays" the bar lets go when no voice reads', `frozen ${s.frozen}`);
      const stored = await B.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k)).p; } catch (e) { return null; } }, 'gabe:legibility:r1'), lines = (await B.$eval('#out', (x) => x.value)).split('\n');
      const bi = lines.indexOf('PLAYER'), lb = lines.find((l) => l.startsWith('pl.bar: ')), lf = lines.find((l) => l.startsWith('pl.follow: '));
      ok(stored && stored.bar === 'playing' && bi > 0 && lb === 'pl.bar: only while a voice plays (yours, you ruled always in D-076)' && lf === 'pl.follow: on (my pick, not ruled)', 'the choice is kept in the browser and the copy text carries both options', (lb || '') + ' | ' + (lf || ''));
      await B.reload(); await B.waitForFunction('window.__leg && window.__leg.ready', { timeout: 20000 }).catch(() => {}); const again = await barOf(B), pr = await B.$eval('[data-pref="bar"][data-v="playing"]', (x) => x.getAttribute('aria-pressed'));
      ok(again.frozen === 'false' && pr === 'true', 'and it is still "only while a voice plays" after a reload', again.frozen);
      await B.click('[data-pref="bar"][data-v="always"]'); await B.waitForTimeout(100); await scrollInto(B, IDS[5], 200); await B.waitForTimeout(100);
      const idle = await B.evaluate(() => ({ st: document.querySelector('[data-act="playpause"]').dataset.state, stopOff: document.querySelector('[data-act="stop"]').disabled })), s2 = await barOf(B);
      ok(s2.frozen === 'true' && s2.top === 0 && s2.playerShown && !s2.reading.on && idle.st === 'idle' && idle.stopOff, 'with "always" the bar stays at the top with no voice, its player idle (play ready, stop off)', `top ${s2.top} · ${idle.st}`);
      await B.click('[data-act="playpause"]'); await B.waitForTimeout(200); const g = await barOf(B);
      ok(g.reading.on && g.reading.all && g.reading.i === 5 && g.lit === 5, 'play on the idle bar reads on from the section in view, through every summary', `index ${g.reading.i}`);
      await B.click('[data-act="stop"]'); await B.waitForTimeout(100); const g2 = await barOf(B); ok(g2.frozen === 'true', 'stop under "always" keeps the bar frozen', g2.frozen);
      await B.click('[data-pref="bar"][data-v="playing"]'); await B.waitForTimeout(100); await B.click('#reset'); await B.waitForTimeout(100); const g3 = await barOf(B);
      ok(g3.frozen === 'true', 'clearing the choices gives the options back to their defaults (always)', g3.frozen); });
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

    /* ── round 4 (L-29, D-077): the bar's menu nests by section; every decision has a spoken summary and a plain line ── */
    const DEC = D.decide.entries, RULED = new Set(D.choices.filter((c) => c.ruled).map((c) => c.id));
    const SAYBAD = [[/[A-Za-z]_[A-Za-z]/, 'a code name'], [/\b[a-z]+[A-Z][A-Za-z]*\b/, 'a code name'], [/\b[A-Z][a-z]+[A-Z][A-Za-z]*\b/, 'a code name'], [/[·→/×|#{}\\“”"`<>]/, 'a symbol'], [/\b(?:L|R|D|EX|CR|N3|S4)-\d+/, 'an id'], [/\b[PGFA]\d{1,2}\b/, 'an id'], [/(^|\s)[xg]:/i, 'an id'], [/\b[\w-]+\.(?:py|mjs|js|json|md|html|tsx?|css)\b/i, 'a file'],
      [/\bundefined\b|\bNaN\b|\{[^}]*\}|\{\{/, 'a missing value or token'], [/\b(?:he|him|his|himself)\b/i, 'he · him · his'], [/\d/, 'a number']];
    const nSent = (s) => (s.match(/[^.!?]+[.!?]+(\s|$)/g) || []).length;
    const decOpen = (sec) => DEC.filter((e) => e.sec === sec && !RULED.has(e.id));
    const heard = (pg) => pg.evaluate(() => window.__ss.said.map((x) => x.text));
    {
      const ids = new Set(DEC.map((e) => e.id)), want = new Set(D.choices.map((c) => c.id));
      ok(ids.size === want.size && [...want].every((x) => ids.has(x)) && DEC.length === want.size + 1 && DEC.filter((e) => e.key.endsWith(':gap')).length === 1,
        'every choice on the page is a decision with an entry (the L-19 recommendation stands in the gap analysis too)', `${ids.size} decisions · ${DEC.length} entries`);
      const hits = []; for (const e of DEC) { const base = e.parts.join(' '), n = nSent(base); if (n < 4 || n > 7) hits.push(e.key + ': base of ' + n + ' sentences');
        for (const [rx, w] of SAYBAD) { const m = rx.exec(base + ' ' + e.plain); if (m) hits.push(e.key + ': ' + w + ' “' + m[0] + '”'); } }
      ok(hits.length === 0, 'every decision has a spoken summary of 4 to 7 sentences (one more once you have picked) with no id, path, symbol, number, code name or {token}', hits.slice(0, 3).join(' | ') || DEC.length + ' summaries');
      /* round 5 (D-078): the example and the impact of every decision; round 6 (D-079) rebuilds the spoken summary around them */
      { const bad = []; for (const e of DEC) { const opts = Object.keys(e.opts);
          if (!e.ex || !e.exSay || !e.impSay) { bad.push(e.key + ': no example or impact'); continue; }
          if (nSent(e.exSay) !== 1 || nSent(e.impSay) !== 1) bad.push(e.key + ': the example or the impact is not one sentence');
          if (JSON.stringify(Object.keys(e.imp).sort()) !== JSON.stringify(opts.sort())) bad.push(e.key + ': an option has no impact line');
          if (/\d/.test(e.exSay + e.impSay) || Object.values(e.imp).some((x) => !x || /\{|undefined/.test(x))) bad.push(e.key + ': a number or a token in the impact'); }
        ok(bad.length === 0, 'every decision has an example and an impact for each option, one sentence each, and both stay on its card (the summary is rebuilt in round 6\'s order, below)', bad.slice(0, 3).join(' | ') || DEC.length + ' decisions · ' + DEC.reduce((a, e) => a + Object.keys(e.imp).length, 0) + ' impact lines');
        const named = DEC.filter((e) => (/^(mo|ex)\./.test(e.key) || ['F24', 'L-19', 'R-11', 'EX-5'].includes(e.id)) && !e.ex.includes(D.ep));
        ok(named.length === 0, 'the example of every look and proposal is a case on the endpoint the page pictures', named.map((e) => e.key).join(',') || D.ep); }
      const bp = DEC.filter((e) => !e.plain || nSent(e.plain) !== 1 || (e.plain.match(/—/g) || []).length > 1 || /[;:]/.test(e.plain) || e.plain.split(/\s+/).length > 34 || /^[a-z]/.test(e.plain));
      ok(bp.length === 0, 'every decision has a plain line: one sentence, at most one dash, no colon chain, short enough to say in one breath', bp.map((e) => e.key).join(',') || DEC.length + ' plain lines');
      const dup = DEC.filter((e, i) => DEC.findIndex((x) => x.key === e.key) !== i); ok(dup.length === 0, 'no two entries share a key');
    }
    const P4 = await open({ ms: 60 });
    await run('the nested menu', async () => {
      const st = await P4.evaluate(() => { const n = document.getElementById('bar'); return { dd: [...n.querySelectorAll('.dd')].map((d) => ({ key: d.querySelector('button.car').dataset.dd, link: d.querySelector('a.tc').dataset.toc, open: d.querySelector('.oc').textContent, hasCaret: !!d.querySelector('button.car svg'),
          items: [...d.querySelectorAll('.ddi')].map((i) => i.dataset.decItem), icons: [...d.querySelectorAll('.ddi')].map((i) => i.querySelector('.slot .mk').dataset.o), groups: [...d.querySelectorAll('.ddg')].map((g) => g.querySelector('.ddgh').textContent.trim()), hidden: d.querySelector('.ddm').hidden })),
          plain: [...n.querySelectorAll('.tcs > a.tc')].map((a) => a.dataset.toc), all: n.querySelectorAll('a.tc').length }; });
      const secs = st.dd.map((d) => d.key).sort().join();
      ok(secs === 'calls,gap,pat' && st.dd.every((d) => d.hasCaret && d.hidden) && st.plain.join() === 'sec-glance,sec-rem,sec-items,sec-qs,sec-copy' && st.all === 8,
        'the sections that hold decisions draw as a chip with a caret (closed), and the others stay plain chips', secs + ' · plain: ' + st.plain.length);
      const bad = st.dd.filter((d) => d.items.join() !== DEC.filter((e) => e.sec === d.key).map((e) => e.key).join());
      ok(bad.length === 0, 'each dropdown lists every one of its decisions, in the page\'s order', st.dd.map((d) => d.key + ' ' + d.items.length).join(' · '));
      const cnt = st.dd.filter((d) => Number(d.open) !== decOpen(d.key).length);
      ok(cnt.length === 0, 'the count of open ones on each chip is the section\'s decisions nobody has picked or ruled', st.dd.map((d) => d.key + ' ' + d.open).join(' · '));
      const ic = st.dd.filter((d) => d.items.some((k, i) => d.icons[i] !== (RULED.has(DEC.find((e) => e.key === k).id) ? 'ruled' : 'mine')));
      ok(ic.length === 0, 'untouched, each entry wears its state icon: the dashed mark for an open one, the ruled mark for a ruled one', ic.map((d) => d.key).join(',') || DEC.length + ' icons');
      const ca = st.dd.find((d) => d.key === 'calls');
      ok(ca.groups.length === 5 && /table/i.test(ca.groups[0]) && /row/i.test(ca.groups[1]) && /bench/i.test(ca.groups[2]) && /kind/i.test(ca.groups[3]) && /proposal/i.test(ca.groups[4]), 'Your calls groups its decisions as the page does: the table, each row, the bench, each kind, the proposals', ca.groups.join(' · '));
      const pt = st.dd.find((d) => d.key === 'pat'); ok(pt.groups.length === 11, 'The patterns lists the audit and each pattern\'s draft proposals under the pattern', pt.groups.length + ' groups');
    });
    await run('keyboard', async () => {
      const first = decOpen('calls')[0].key, second = decOpen('calls')[1].key, all = DEC.filter((e) => e.sec === 'calls');
      const snap = () => P4.evaluate(() => ({ exp: document.querySelector('[data-dd="calls"]').getAttribute('aria-expanded'), hidden: document.querySelector('[data-dd-menu="calls"]').hidden, active: document.activeElement.dataset.decItem || document.activeElement.dataset.dd || null, open: window.__leg.dd().open }));
      await P4.focus('[data-dd="calls"]'); await P4.keyboard.press('Enter'); const a = await snap();
      ok(a.exp === 'true' && !a.hidden && a.open === 'calls' && a.active === first, 'Enter on the caret opens the menu and puts the focus on the first decision still open', a.active);
      await P4.keyboard.press('ArrowDown'); const b2 = await snap(); await P4.keyboard.press('End'); const c2 = await snap(); await P4.keyboard.press('Home'); const d2 = await snap(); await P4.keyboard.press('ArrowUp'); const u2 = await snap();
      ok(b2.active === second && c2.active === all[all.length - 1].key && d2.active === all[0].key && u2.active === all[all.length - 1].key, 'the arrows move through the decisions, Home and End go to the ends, and the arrows wrap', `${b2.active} · ${c2.active} · ${d2.active} · ${u2.active}`);
      await P4.keyboard.press('Escape'); const e2 = await snap(); ok(e2.exp === 'false' && e2.hidden && e2.open === null && e2.active === 'calls', 'Escape closes it and the focus is back on the caret', JSON.stringify(e2));
      await P4.keyboard.press('Space'); const f2 = await snap(); ok(f2.exp === 'true' && !f2.hidden, 'Space on the caret opens it too'); await P4.keyboard.press('Escape');
      await P4.keyboard.press('ArrowDown'); const g2 = await snap(); ok(g2.exp === 'true' && g2.active === all[0].key, 'the Down arrow on the caret opens it on the first entry', g2.active); await P4.keyboard.press('Escape');
      await P4.click('[data-dd="calls"]'); await P4.click('[data-dd="pat"]'); const h = await P4.evaluate(() => ({ open: window.__leg.dd().open, calls: document.querySelector('[data-dd-menu="calls"]').hidden, pat: document.querySelector('[data-dd-menu="pat"]').hidden }));
      ok(h.open === 'pat' && h.calls && !h.pat, 'only one dropdown is open at a time', JSON.stringify(h));
      await P4.click('#title'); const o = await P4.evaluate(() => ({ open: window.__leg.dd().open, pat: document.querySelector('[data-dd-menu="pat"]').hidden }));
      ok(o.open === null && o.pat, 'a click outside closes it', JSON.stringify(o));
    });
    await run('a pick', async () => {
      const e = DEC.find((x) => x.key === 'mo.hdr'); await scrollInto(P4, IDS[4], 300); await P4.waitForTimeout(100);
      const idle = await barOf(P4); ok(!idle.reading.on, 'before the pick nothing is playing');
      await P4.click('[data-dd="calls"]'); await P4.click('[data-dec-item="mo.hdr"]'); await P4.waitForTimeout(150);
      const s = await barOf(P4), card = await P4.evaluate(() => { const c = document.querySelector('[data-dec-card="mo.hdr"]'), r = c.getBoundingClientRect(); return { top: Math.round(r.top), hot: c.dataset.hot, hots: document.querySelectorAll('[data-dec-card][data-hot="true"]').length, menuHidden: document.querySelector('[data-dd-menu="calls"]').hidden, litItem: document.querySelector('[data-dec-item="mo.hdr"]').getAttribute('aria-current') }; });
      ok(near(card.top, s) && card.hot === 'true' && card.hots === 1, 'picking a decision scrolls the page to its card just under the bar and lights that one card', `card top ${card.top} · bar bottom ${s.bottom} · lit ${card.hots}`);
      ok(s.reading.on && s.reading.dec === 'mo.hdr' && s.lit === 3 && card.menuHidden && card.litItem === 'true', 'with nothing playing the pick starts the reading at that decision: the menu closes, its section\'s chip and its entry are lit', `dec ${s.reading.dec} · chip ${s.lit}`);
      await waitFor(P4, (n) => window.__ss.said.length >= n, e.parts.length + 1); const said = await heard(P4);
      ok(e.parts.every((x, i) => said[i] === x), 'the first thing spoken is the decision\'s own summary, part by part: the pain, the analogy, the cost to solve, the cost if not, the options, my pick', said[0].slice(0, 60));
      ok(said[e.parts.length] === e.plain, 'its plain line is read right after the summary', (said[e.parts.length] || '').slice(0, 60));
      await waitFor(P4, () => !window.__leg.reading().on); const end = await P4.evaluate(() => ({ on: window.__leg.reading().on, said: window.__ss.said.length, hot: document.querySelector('[data-dec-card="mo.hdr"]').dataset.hot, reading: document.querySelector('[data-dec-card="mo.hdr"]').dataset.reading }));
      ok(!end.on && end.said === e.parts.length + 1 && end.hot === 'true' && end.reading === 'false', 'by default the reading stops after the decision (my pick, dashed); the card stays lit where you are', `${end.said} sentences`);
    });
    await run('the card', async () => {
      const e = DEC.find((x) => x.key === 'mo.fit'), c = await P4.evaluate(() => { const k = document.querySelector('[data-dec-card="mo.fit"]'); const pl = k.querySelector('.plainline'); return { plain: pl && pl.querySelector('.pl-text').textContent, lab: pl && pl.querySelector('.lab').textContent, listen: !!k.querySelector('[data-dec-listen="mo.fit"]'), shown: k.querySelector('[data-dec-listen]').getBoundingClientRect().width > 0, fold: k.querySelector('details.spk summary').textContent, text: k.querySelector('[data-dec-text]').textContent, n: document.querySelectorAll('[data-dec-card]').length, pls: document.querySelectorAll('.plainline').length }; });
      ok(c.plain === e.plain && c.lab === D.ui.decide.menu.plainHead && c.listen && c.shown, 'a decision card shows its plain line under "in plain words" and a listen button', c.lab);
      ok(c.n === DEC.length + D.patterns.length && c.pls === DEC.length, 'every decision card, the gap analysis\'s too, has its plain line (a pattern\'s own reading is lit the same way and has none)', c.n + ' cards · ' + c.pls + ' lines');
      ok(c.text === e.parts.concat(e.plain).join(' ') && c.fold === D.ui.decide.menu.fold, 'what is read aloud is shown on the card, folded: the summary and then the plain line', c.text.slice(0, 50));
      await scrollInto(P4, 'call-mo.fit', -40); await P4.waitForTimeout(80); const y0 = await P4.evaluate(() => window.scrollY); await P4.evaluate(() => { window.__ss.said.length = 0; });
      await P4.click('[data-dec-listen="mo.fit"]'); await P4.waitForTimeout(250); const y1 = await P4.evaluate(() => window.scrollY), sd = await heard(P4), rd = await P4.evaluate(() => ({ r: window.__leg.reading(), pressed: document.querySelector('[data-dec-listen="mo.fit"]').getAttribute('aria-pressed'), label: document.querySelector('[data-dec-listen="mo.fit"]').textContent.trim() }));
      ok(rd.r.dec === 'mo.fit' && sd[0] === e.parts[0] && rd.pressed === 'true' && rd.label === D.ui.say.stop && Math.abs(y1 - y0) <= 2, 'the card\'s listen button reads its summary from the first sentence, turns to stop, and moves nothing on the page', `${rd.label} · scroll ${y0} → ${y1}`);
      await P4.click('[data-dec-listen="mo.fit"]'); await P4.waitForTimeout(100); const off = await P4.evaluate(() => ({ on: window.__leg.reading().on, label: document.querySelector('[data-dec-listen="mo.fit"]').textContent.trim() }));
      ok(!off.on && off.label === D.ui.decide.menu.listen, 'a second click stops it and the button is listen again', off.label);
    });
    await run('your pick joins the summary', async () => {
      const e = DEC.find((x) => x.key === 'mo.ipo'); await P4.click('[data-choice="mo.ipo"][data-v="sent"]'); await P4.evaluate(() => { window.__ss.said.length = 0; });
      const txt = await P4.$eval('[data-dec-text="mo.ipo"]', (n) => n.textContent), want = e.parts.concat([D.ui.decide.run.yours.replace('{{name}}', e.opts.sent), e.plain]);
      ok(txt === want.join(' ') && nSent(want.slice(0, e.parts.length + 1).join(' ')) === nSent(e.parts.join(' ')) + 1, 'once you have picked, the summary adds one sentence about your pick (one more than the base) before the plain line', want[e.parts.length]);
      await P4.click('[data-dd="calls"]'); await P4.click('[data-dec-item="mo.ipo"]'); await waitFor(P4, (n) => window.__ss.said.length >= n, want.length); const sd = await heard(P4);
      ok(JSON.stringify(sd.slice(0, want.length)) === JSON.stringify(want), 'and that sentence is read after the base summary and before the plain line', sd[e.parts.length]);
      await P4.click('[data-choice="mo.hdr"][data-v="band"]'); const k = await P4.$eval('[data-dec-text="mo.hdr"]', (n) => n.textContent); ok(k.includes(D.ui.decide.run.kept.replace('{{name}}', DEC.find((x) => x.key === 'mo.hdr').opts.band)), 'picking my own pick is said as keeping it', k.slice(-90, -40));
      const ic = await P4.evaluate(() => ({ yours: document.querySelector('[data-dec-item="mo.ipo"] .slot .mk').dataset.o, kept: document.querySelector('[data-dec-item="mo.hdr"] .slot .mk').dataset.o, open: document.querySelector('[data-dd="calls"]').closest('.dd').querySelector('.oc').textContent }));
      ok(ic.yours === 'yours' && ic.kept === 'check' && Number(ic.open) === decOpen('calls').length - 2, 'a decided entry changes its icon (yours, or kept my pick) and the chip\'s count of open ones goes down', JSON.stringify(ic));
      await P4.click('#reset'); await P4.waitForTimeout(80); await P4.click('[data-act="stop"]').catch(() => {});
    });
    ok(P4.__errs.length === 0, 'the menu runs with no page error', P4.__errs.slice(0, 2).join(' | ')); await P4.__ctx.close();

    /* a pick while a section is being read moves the reading to the decision */
    const P5 = await open({ ms: 600 });
    await run('a pick during a reading', async () => { await scrollInto(P5, IDS[4], 120); await P5.click('[data-say="items"] [data-listen]'); await P5.waitForTimeout(200); const was = await barOf(P5);
      await P5.click('[data-dd="calls"]'); await P5.click('[data-dec-item="mo.fit"]'); await P5.waitForTimeout(250); const s = await barOf(P5), sd = await heard(P5), e = DEC.find((x) => x.key === 'mo.fit');
      ok(was.reading.on && was.hot.join() === 'items' && s.reading.dec === 'mo.fit' && s.reading.on && s.hot.length === 0 && sd[sd.length - 1] === e.parts[0], 'a pick while a section is read moves the reading to that decision: the summary stops being lit and the decision\'s first sentence is next', `${was.hot.join()} → ${s.reading.dec}`);
      /* previous and next keep moving by section: next goes to the section after the decision's, previous to the start of the decision's own section */
      await P5.click('[data-act="next"]'); await P5.waitForTimeout(250); const n1 = await barOf(P5), tn = await secTop(P5, IDS[4]);
      ok(n1.reading.dec === null && n1.reading.i === 4 && n1.hot.join() === 'items' && near(tn, n1), 'next, from inside a decision, moves to the next section\'s summary and scrolls the page there', `index ${n1.reading.i} · section top ${tn}`);
      await P5.click('[data-dd="calls"]'); await P5.click('[data-dec-item="mo.fit"]'); await P5.waitForTimeout(200); await P5.click('[data-act="prev"]'); await P5.waitForTimeout(250); const n2 = await barOf(P5), tp = await secTop(P5, IDS[3]);
      ok(n2.reading.dec === null && n2.reading.i === 3 && n2.hot.join() === 'calls' && near(tp, n2), 'previous, from inside a decision, goes back to the start of its own section', `index ${n2.reading.i} · section top ${tp}`);
      await P5.click('[data-act="stop"]'); });
    await P5.__ctx.close();

    /* next open decision, and the option after a decision */
    const P6 = await open({ ms: 30 });
    await run('next open decision', async () => {
      const pat = DEC.filter((e) => e.sec === 'pat'), ix = (k) => pat.findIndex((e) => e.key === k), i41 = ix('P4.1');
      ok(pat[i41 + 1].key === 'P4.2', 'the next entry after the first proposal of the first pattern is its second (the test relies on it)');
      await P6.click('[data-choice="P4.2"][data-v="land"]');   /* decide P4.2: I picked land it, so this keeps my pick */
      await P6.click('[data-dd="pat"]'); await P6.click('[data-dec-item="P4.1"]'); await waitFor(P6, () => !window.__leg.reading().on); await P6.waitForTimeout(100);
      await P6.click('[data-act="nextopen"]'); await P6.waitForTimeout(200); const a = await barOf(P6);
      ok(a.reading.on && a.reading.dec === pat[i41 + 2].key, '"next open decision" skips the decided ones: after the first proposal it goes past the one you decided', `${a.reading.dec} (skipped P4.2)`);
      const sd = await heard(P6); ok(!sd.includes(pat[i41 + 1].parts[0]), 'the decided one is not read');
      await P6.click('[data-act="stop"]');
      const dis = await P6.evaluate(() => ({ lab: document.querySelector('[data-act="nextopen"]').getAttribute('aria-label'), disabled: document.querySelector('[data-act="nextopen"]').disabled })); ok(dis.lab === D.ui.player.nextOpen && !dis.disabled, 'the bar has the "next open decision" button', dis.lab);
    });
    await run('after a decision', async () => {
      const pat = DEC.filter((e) => e.sec === 'pat'), cal = DEC.filter((e) => e.sec === 'calls'), P41 = pat.findIndex((e) => e.key === 'P4.1');
      await P6.evaluate(() => { window.__ss.ms = 30; });
      /* stop (the default): the reading ends after the decision */
      await P6.evaluate(() => { window.__ss.said.length = 0; }); await P6.click('[data-dd="pat"]'); await P6.click('[data-dec-item="P4.1"]'); await waitFor(P6, () => !window.__leg.reading().on); const n1 = await P6.evaluate(() => window.__ss.said.length);
      ok(n1 === pat[P41].parts.length + 1, 'after a decision: stop there (the default) reads the summary and the plain line and ends', n1 + ' sentences');
      /* next open: the decided one (P4.2) is skipped, the reading goes on by itself */
      await P6.click('[data-pref="after"][data-v="next"]'); await P6.evaluate(() => { window.__ss.said.length = 0; });
      await P6.click('[data-dd="pat"]'); await P6.click('[data-dec-item="P4.1"]'); const ok2 = await waitFor(P6, (k) => window.__leg.reading().dec === k, pat[P41 + 2].key); await waitFor(P6, (x) => window.__ss.said.some((s) => s.text === x), pat[P41 + 2].parts[0]); const sd2 = await heard(P6);   /* the section pause comes first */
      ok(ok2 && !sd2.includes(pat[P41 + 1].parts[0]) && sd2.includes(pat[P41 + 2].parts[0]), 'after a decision: go on to the next open decision reads on by itself and skips the one you decided', pat[P41 + 2].key);
      await P6.click('[data-act="stop"]');
      /* section: the next decision in the section, decided or not */
      await P6.click('[data-pref="after"][data-v="section"]'); await P6.evaluate(() => { window.__ss.said.length = 0; });
      await P6.click('[data-dd="pat"]'); await P6.click('[data-dec-item="P4.1"]'); const ok3 = await waitFor(P6, (k) => window.__leg.reading().dec === k, pat[P41 + 1].key); await waitFor(P6, (x) => window.__ss.said.some((s) => s.text === x), pat[P41 + 1].parts[0]); const sd3 = await heard(P6);
      ok(ok3 && sd3.includes(pat[P41 + 1].parts[0]), 'after a decision: go on with the section reads the next decision of that section, decided or not', pat[P41 + 1].key);
      await P6.click('[data-act="stop"]');
      /* and when the section\'s decisions run out, the run of summaries goes on from the next section */
      await P6.evaluate(() => { window.__ss.said.length = 0; }); const last = cal[cal.length - 1];
      await P6.click('[data-dd="calls"]'); await P6.click('[data-dec-item="' + last.key + '"]'); const ok4 = await waitFor(P6, () => window.__leg.reading().dec === null && window.__leg.reading().on && window.__leg.reading().key === 'items');
      ok(ok4, 'after the last decision of a section, the section option goes on with the next section\'s summary', last.key + ' → items'); await P6.click('[data-act="stop"]');
      /* the option is kept in the browser and rides the copy text */
      const lines = (await P6.$eval('#out', (x) => x.value)).split('\n'), la = lines.find((l) => l.startsWith('pl.after: ')), stored = await P6.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k)).p; } catch (e) { return null; } }, 'gabe:legibility:r1');
      ok(la === 'pl.after: ' + D.ui.player.optAfterSection + ' (yours, I picked ' + D.ui.player.optAfterStop + ')' && stored && stored.after === 'section', 'the option is kept in the browser and rides the copy text, with my pick named', la);
      await P6.reload(); await P6.waitForFunction('window.__leg && window.__leg.ready', { timeout: 20000 }).catch(() => {}); const pr = await P6.$eval('[data-pref="after"][data-v="section"]', (x) => x.getAttribute('aria-pressed'));
      ok(pr === 'true', 'and it is still there after a reload');
      await P6.click('#reset'); await P6.waitForTimeout(80); const l2 = (await P6.$eval('#out', (x) => x.value)).split('\n').find((l) => l.startsWith('pl.after: ')), dash = await P6.$eval('[data-pref="after"][data-v="stop"]', (x) => x.dataset.mine);
      ok(l2 === 'pl.after: ' + D.ui.player.optAfterStop + ' (my pick, not ruled)' && dash === 'true', 'clearing gives it back: stop there, my pick, dashed', l2);
    });
    ok(P6.__errs.length === 0, 'next open and after run with no page error', P6.__errs.slice(0, 2).join(' | ')); await P6.__ctx.close();

    /* the dropdown at 390 px: a full-width sheet under the bar, no sideways scroll; and the 12px floor with it open */
    const P7 = await open({ ms: 500 }, 390);
    await run('the dropdown on a phone', async () => { await scrollInto(P7, IDS[4], 200); await P7.waitForTimeout(100); await P7.click('[data-dd="calls"]'); await P7.waitForTimeout(150);
      const m = await P7.evaluate(() => { const mn = document.querySelector('[data-dd-menu="calls"]'), r = mn.getBoundingClientRect(), bar = document.getElementById('bar').getBoundingClientRect(), small = [];
        const w = document.createTreeWalker(mn, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (!n.nodeValue.trim()) continue; const f = parseFloat(getComputedStyle(n.parentElement).fontSize); if (f < 12) small.push(f + 'px ' + n.nodeValue.trim().slice(0, 20)); }
        const act = document.activeElement; return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), barBottom: Math.round(bar.bottom), vw: window.innerWidth, vh: window.innerHeight, sheet: mn.dataset.sheet, side: document.documentElement.scrollWidth - window.innerWidth, small, items: mn.querySelectorAll('.ddi').length, scrolls: mn.scrollHeight > mn.clientHeight, overItem: [...mn.querySelectorAll('.ddi')].filter((i) => i.scrollWidth > i.clientWidth + 1).length }; });
      ok(m.sheet === 'true' && m.left === 0 && m.right === m.vw && m.top >= m.barBottom - 1 && m.bottom <= m.vh + 1 && m.side <= 1 && m.overItem === 0, 'at 390px the dropdown opens as a full-width sheet under the bar, inside the screen, with no sideways scroll', `left ${m.left} · right ${m.right}/${m.vw} · top ${m.top} (bar ${m.barBottom}) · bottom ${m.bottom}/${m.vh} · sideways ${m.side}px`);
      ok(m.small.length === 0 && m.items > 20 && m.scrolls, 'its entries keep the 12px floor and the list scrolls inside the sheet', `${m.items} entries · ${m.small.slice(0, 2).join(' | ')}`);
      await P7.click('[data-dec-item="mo.hdr"]'); await P7.waitForTimeout(250); const s = await barOf(P7), side = await P7.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(s.reading.dec === 'mo.hdr' && near(await P7.evaluate(() => Math.round(document.querySelector('[data-dec-card="mo.hdr"]').getBoundingClientRect().top)), s) && side <= 1, 'a pick in the sheet closes it, lights the card under the bar and starts the reading', `dec ${s.reading.dec} · sideways ${side}px`);
      await P7.click('[data-act="stop"]'); });
    await P7.__ctx.close();
    { const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } }), pg = await ctx.newPage(), er = []; pg.on('pageerror', (e) => er.push(e.message));
      await pg.addInitScript(() => { try { delete window.speechSynthesis; } catch (e) {} Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined }); });
      await pg.goto('file://' + page); await pg.waitForFunction('window.__leg && window.__leg.ready', { timeout: 20000 }).catch(() => {});
      await run('no speech', async () => { await pg.click('[data-dd="calls"]'); await pg.click('[data-dec-item="mo.hdr"]'); await pg.waitForTimeout(150);
        const r = await pg.evaluate(() => { const c = document.querySelector('[data-dec-card="mo.hdr"]'), bar = document.getElementById('bar').getBoundingClientRect(); return { hot: c.dataset.hot, top: Math.round(c.getBoundingClientRect().top), barBottom: Math.round(bar.bottom), hidden: document.querySelector('[data-dd-menu="calls"]').hidden, nextOpen: !!document.querySelector('[data-act="nextopen"]') }; });
        ok(r.hot === 'true' && near(r.top, { bottom: r.barBottom }) && r.hidden && er.length === 0, 'where the browser cannot speak the menu still works: a pick scrolls to the card and lights it', `card top ${r.top} · bar ${r.barBottom} · errors ${er.length}`); });
      await ctx.close(); }
    { const hasKept = await p.evaluate(() => [...document.querySelectorAll('#legend .lg')].some((x) => x.textContent.trim() === window.LEG_DATA.ui.mark.kept));
      ok(hasKept, 'the legend says the mark for "decided by you, my pick kept" once', D.ui.mark.kept); }
    /* ── round 5 (L-30, D-078): the example and the impact on every card; the hover rules ── */
    { const card = await p.evaluate(() => window.LEG_DATA.decide.entries.map((e) => { const c = document.querySelector('[data-dec-card="' + CSS.escape(e.key) + '"]'); if (!c) return { key: e.key, missing: true };
        const ex = c.querySelector('[data-example="' + CSS.escape(e.key) + '"]'), imps = [...c.querySelectorAll('[data-impact]')].map((n) => [n.getAttribute('data-impact'), n.textContent.replace(/^\s*Impact\s*/i, '').replace(/^.*?:\s(?=[A-Z])/, '')]);
        return { key: e.key, ex: ex ? ex.textContent.replace(/^Example/, '') : null, imps, n: c.querySelectorAll('[data-impact]').length }; }));
      const bad = []; for (const x of card) { const e = DEC.find((y) => y.key === x.key); if (x.missing) { bad.push(x.key + ': no card'); continue; }
        if (x.ex !== e.ex) bad.push(x.key + ': the example on the card is not the generator\'s'); if (x.n !== Object.keys(e.imp).length) bad.push(x.key + ': ' + x.n + ' impact lines for ' + Object.keys(e.imp).length + ' options');
        for (const [v, t] of x.imps) if (!t.endsWith(e.imp[v])) bad.push(x.key + ' · ' + v + ': the impact on the card is not the generator\'s'); }
      ok(bad.length === 0, 'every decision card shows its example and, for each option, its impact, as the generator wrote them (the L-19 recommendation too, where it stands twice)', bad.slice(0, 3).join(' | ') || card.length + ' cards · ' + card.reduce((a, x) => a + x.n, 0) + ' impact lines');
      const kinds = await p.evaluate(() => ({ looks: [...document.querySelectorAll('#sec-calls .look')].filter((l) => !l.querySelector('[data-impact]')).length, suites: [...document.querySelectorAll('#sec-pat .prop')].filter((q) => !q.querySelector('ul.imps')).length }));
      ok(kinds.looks === 0 && kinds.suites === 0, 'each look carries its own impact line, and each draft suite proposal an impact list before its options', `${kinds.looks} looks and ${kinds.suites} proposals without`); }
    /* the hover rules: one hover per item; every icon inside one; the legend says what a kind means, once; a control's hover is short */
    { const R = await p.evaluate(() => { const root = document.querySelector('.artifact-page'), all = [...root.querySelectorAll('[title]')];
        const nested = all.filter((e) => e.querySelector('[title]')).map((e) => (e.className || e.tagName) + ' holds ' + (e.querySelector('[title]').className || e.querySelector('[title]').tagName));
        const skip = (i) => i.closest('h2') || i.closest('.say-hd');   /* a section title's icon and the summary label's speaker are part of a heading, not an item */
        const icons = [...root.querySelectorAll('svg.ico')].filter((i) => !skip(i)), bare = icons.filter((i) => !i.closest('[title]')).map((i) => { const h = i.closest('button, .mk, .chip, .lg, .pb, .vox') || i.parentElement; return (h.className || h.tagName) + ' · ' + (h.textContent || '').trim().slice(0, 24); });
        const empty = all.filter((e) => !e.title.trim()).length, lg = [...root.querySelectorAll('#legend .lg')], defs = lg.map((e) => e.title), dset = new Set(defs);
        const same = all.filter((e) => !e.closest('#legend') && dset.has(e.title)).map((e) => e.title.slice(0, 50));
        const ctrl = all.filter((e) => e.matches('button, select, summary') && !e.classList.contains('ddi')), long = ctrl.filter((e) => e.title.trim().split(/\s+/).length > 6).map((e) => e.title);
        const word = [...root.querySelectorAll('.mk[title]')].filter((e) => e.title.trim().split(/\s+/).length < 4).map((e) => e.title);
        return { n: all.length, nested: nested.slice(0, 3), nNested: nested.length, nIcons: icons.length, bare: bare.slice(0, 3), nBare: bare.length, empty, nLg: lg.length, lgEmpty: defs.filter((d) => !d || !d.trim()).length, lgDup: defs.length - dset.size, same, nCtrl: ctrl.length, long, word }; });
      ok(R.nNested === 0, 'no hover target sits inside another: one hover per item, nothing nested under an icon', R.nested.join(' | ') || R.n + ' hovers');
      ok(R.nBare === 0 && R.empty === 0 && R.nIcons > 150, 'every icon sits inside a hover with words: a standalone icon is its own item with its own hover, and none is empty', R.bare.join(' | ') || R.nIcons + ' icons');
      /* CHANGED 2026-10-02: the legend lists only the marks the page uses (a typed + 24 broke when no item was logged any more) */
      ok(R.nLg >= D.patterns.length && R.lgEmpty === 0 && R.lgDup === 0 && R.same.length === 0, 'the legend says what each kind means once, and no hover on the page repeats a legend definition word for word', R.same.join(' | ') || R.nLg + ' legend entries, each with its meaning');
      ok(R.long.length === 0 && R.nCtrl > 100, 'a control\'s hover is six words or fewer: a verb and its object', R.long.slice(0, 3).join(' | ') || R.nCtrl + ' controls');
      ok(R.word.length === 0, 'a mark\'s hover says its item\'s own fact, never only the mark\'s word', R.word.slice(0, 3).join(' | ')); }
    { const T = D.ui.decide.menu.stateTip, nm = (id, v) => D.choices.find((c) => c.id === id).opts.find((o) => o[0] === v)[1], want0 = T.open.replace('{{pick}}', nm('mo.hdr', 'band'));
      const h0 = await p.$eval('[data-dec-item="mo.hdr"]', (e) => e.title), o0 = await p.$eval('#sec-calls table.t', (t) => [...t.querySelectorAll('tr')].find((r) => r.textContent.includes('the header')).querySelector('.mk').title);
      await p.click('[data-choice="mo.hdr"][data-v="road"]'); const h1 = await p.$eval('[data-dec-item="mo.hdr"]', (e) => e.title), o1 = await p.$eval('#sec-calls table.t', (t) => [...t.querySelectorAll('tr')].find((r) => r.textContent.includes('the header')).querySelector('.mk').title);
      await p.click('[data-choice="mo.hdr"][data-v="band"]'); const h2 = await p.$eval('[data-dec-item="mo.hdr"]', (e) => e.title); await p.click('#reset');
      const want1 = T.yours.replace('{{picked}}', nm('mo.hdr', 'road')).replace('{{pick}}', nm('mo.hdr', 'band')), want2 = T.kept.replace('{{pick}}', nm('mo.hdr', 'band'));
      ok(h0 === want0 && o0 === want0 && h1 === want1 && o1 === want1 && h2 === want2, 'a state mark on a decision says that decision\'s own fact, in the menu and in the table of choices, and follows the pick (open, yours, my pick kept)', h0 + ' → ' + h1 + ' → ' + h2); }
    /* ── round 6 (L-31, D-079; L-32, D-080): the pain, the picture, the cost and the handle come first, and wear icons ── */
    {
      /* the authored lens file: no id, path, symbol, typed digit or number word; the sets are the page's; a handle is ten words at most */
      const src = JSON.parse(fs.readFileSync(path.join(HERE, 'legibility-review.lens.json'), 'utf8'));
      const BADSRC = [[/[·→/×|#\\“”"`<>]/, 'a symbol'], [/\b(?:L|R|D|EX|CR|N3|S4)-\d+/, 'an id'], [/\b[PGFA]\d{1,2}\b/, 'an id'], [/(^|\s)[xg]:/i, 'an id'], [/\b[\w-]+\.(?:py|mjs|js|json|md|html|tsx?|css)\b/i, 'a path'], [/\bundefined\b|\bNaN\b/, 'undefined'], [/\d/, 'a typed digit'],
        [/\b(?:two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|dozen)\b/i, 'a number word'], [/\b(?:he|him|his|himself)\b/i, 'he · him · his']];
      const hits = [], SKIPK = new Set(['meter', 'kind', 'process', 'size', 'marks']);
      (function walk(o, at) { if (typeof o === 'string') { const s = o.replace(/\{[a-zA-Z]\w*\}/g, ' '); for (const [rx, w] of BADSRC) { const m = rx.exec(s); if (m) hits.push(at + ': ' + w + ' “' + m[0] + '”'); } }
        else if (Array.isArray(o)) o.forEach((v, i) => walk(v, at + '[' + i + ']')); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k[0] === '_' || SKIPK.has(k)) continue; walk(v, at + '.' + k); } })(src, 'lens');
      ok(hits.length === 0, 'the lens file holds no id, path, symbol, typed digit, number word or he · him · his: every number is a {token} the generator fills', hits.slice(0, 3).join(' | ') || 'clean');
      const wantD = new Set(D.choices.map((c) => c.id)), haveD = Object.keys(src.decisions), haveP = Object.keys(src.patterns);
      ok(haveD.length === wantD.size && haveD.every((x) => wantD.has(x)) && haveP.length === D.patterns.length && D.patterns.every((x) => haveP.includes(x.id)), 'the lens file has one entry for each pattern and each decision, and no other', `${haveP.length} patterns · ${haveD.length} decisions`);
      const wc = (s) => s.trim().split(/\s+/).length, longH = [...Object.entries(src.patterns), ...Object.entries(src.decisions)].filter(([, v]) => wc(v.handle) > 10).map(([k]) => k);
      ok(longH.length === 0, 'every handle is ten words or fewer', longH.join(',') || 'all short');
      const stepsOk = Object.entries(src.patterns).filter(([, v]) => !(v.steps.length >= 3 && v.steps.length <= 5 && v.steps.filter((s) => s.bad).length === 1)).map(([k]) => k);
      ok(stepsOk.length === 0, 'every pattern has three to five steps and exactly one is marked as the one where it goes wrong', stepsOk.join(',') || 'all');

      /* the rendered cards: the blocks stand first, in order, each with its icon and its one hover, and say what the data says */
      const R6 = await p.evaluate((D) => {
        const lensOf = (e) => (e.pat ? D.lens.patterns[e.id] : D.lens.decisions[e.id]);
        const cards = [...D.decide.entries.map((e) => ({ e, sel: '[data-dec-card="' + CSS.escape(e.key) + '"]', pat: false })), ...D.patterns.map((q) => ({ e: { key: q.id, id: q.id, pat: true }, sel: '[data-pattern="' + q.id + '"]', pat: true }))];
        const out = [];
        for (const c of cards) {
          const card = document.querySelector(c.sel), L = lensOf(c.e), r = { key: c.e.key, pat: c.pat, problems: [] };
          if (!card) { r.problems.push('no card'); out.push(r); continue; }
          const lens = card.querySelector('.lens'); if (!lens) { r.problems.push('no lens'); out.push(r); continue; }
          const blocks = [...lens.children].map((b) => b.dataset.lb), want = c.pat ? ['pain', 'like', 'cost', 'handle', 'steps', 'box'] : ['pain', 'like', 'cost', 'handle'];
          if (blocks.join() !== want.join()) r.problems.push('blocks ' + blocks.join());
          /* first: only the title row and chips may stand before it among the card's own children */
          const kids = [...card.children], li = kids.indexOf(lens), later = ['.decb', '.looks', '.verdict', '.cap', 'p.what', '.why2', 'ul.imps', 'p.sets', '.suite'];
          const firstLater = kids.findIndex((k) => later.some((s) => k.matches(s))); if (li < 0 || (firstLater >= 0 && firstLater < li)) r.problems.push('the blocks do not come first');
          const norm = (m) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.innerHTML = m; return s.innerHTML; };   /* the browser writes a mark back its own way */
          const B = (n) => lens.querySelector('[data-lb="' + n + '"]'), icon = (n) => (D.icons[n] ? norm(D.icons[n]) : '#none');
          const pain = B('pain'), like = B('like'), cost = B('cost'), handle = B('handle');
          if (!pain || pain.querySelector('.lbt').textContent !== L.pain.text) r.problems.push('pain text'); if (!like || like.querySelector('.lbt').textContent !== L.like.text || like.querySelector('.lbs').textContent !== L.like.stops) r.problems.push('like text');
          const ct = cost ? [...cost.querySelectorAll('.lbt')].map((x) => x.textContent) : []; if (ct[0] !== L.cost.toSolve || ct[1] !== L.cost.ifNot) r.problems.push('cost text'); if (!handle || handle.querySelector('.lbt').textContent !== L.handle.text) r.problems.push('handle text');
          const lab = (b, i) => { const m = b && b.querySelectorAll('.mk.lbl')[i]; return m && { title: m.title, svg: m.querySelector('svg') && m.querySelector('svg').innerHTML, text: m.textContent.trim() }; };
          const pl = lab(pain, 0), ll = lab(like, 0), cl = lab(cost, 0), il = lab(cost, 1), hl = lab(handle, 0);
          if (!pl || pl.title !== L.pain.tip || pl.svg !== icon(L.pain.icon) || pl.text !== D.ui.gl.label.pain) r.problems.push('pain label'); if (!ll || ll.title !== L.like.tip || ll.svg !== icon(L.like.icon) || ll.text !== D.ui.gl.label.like) r.problems.push('like label');
          if (!cl || cl.title !== L.cost.tip || cl.svg !== icon('lb-cost')) r.problems.push('cost label'); if (!il || il.title !== L.cost.ifTip || il.svg !== icon('lb-ifnot') || il.text !== D.ui.gl.label.ifNot) r.problems.push('if-not label'); if (!hl || hl.title !== L.handle.tip || hl.svg !== icon('pin')) r.problems.push('handle label');
          const mt = pain && pain.querySelector('.mt'); if (!mt || mt.title !== L.pain.meter.tip || mt.dataset.meter !== L.pain.meter.type || !mt.textContent.trim()) r.problems.push('pain meter');
          const cs = cost && cost.querySelector('.mk.cs'); if (!cs || cs.title !== L.cost.sizeTip || cs.dataset.size !== L.cost.size || !cs.querySelector('svg') || cs.querySelector('.sw').textContent !== L.cost.sizeWord) r.problems.push('size meter');
          const bl = cost && cost.querySelector('.mk.bl'); if (!!bl !== !!L.cost.balance || (bl && (bl.title !== L.cost.balance.tip || !bl.querySelector('svg.bal')))) r.problems.push('balance');
          if (c.pat) {
            const st = B('steps'), lis = st ? [...st.querySelectorAll('ol.stp > li')] : [];
            if (lis.length !== L.steps.length || lis.some((x, i) => x.querySelector('.sn').textContent !== String(i + 1) || x.querySelector('.stx').textContent !== L.steps[i].t)) r.problems.push('steps');
            const bad = lis.filter((x) => x.dataset.bad === 'true'); if (bad.length !== 1 || !bad[0].querySelector('svg') || bad[0].title !== L.steps.find((s) => s.bad).tip || lis.filter((x) => x.title).length !== 1) r.problems.push('the failing step');
            if (lis.slice(0, -1).some((x) => getComputedStyle(x, '::after').content === 'none') || getComputedStyle(lis[lis.length - 1], '::after').content !== 'none') r.problems.push('arrows between the steps');
            const sl = lab(st, 0); if (!sl || sl.title !== L.stepsTip || sl.svg !== icon('lb-steps')) r.problems.push('steps label');
            const bx = B('box'), rows = bx ? [...bx.querySelectorAll('.bxr')] : [], bi = ['check', 'bx-not', 'bx-when'], bk = ['does', 'doesNot', 'decides'];
            if (rows.length !== 3 || rows.some((x, i) => x.dataset.bx !== bk[i] || x.querySelector('.mk.lbl').title !== L.box[bk[i]].tip || x.querySelector('svg').innerHTML !== icon(bi[i]) || x.querySelector('.lbt').textContent !== L.box[bk[i]].text)) r.problems.push('box rows');
            const bl2 = lab(bx, 0); if (!bl2 || bl2.title !== L.boxTip || bl2.svg !== icon('lb-box')) r.problems.push('box label');
          } else {
            /* the options' impact: a gain, cost, both or neutral mark, and the line's one hover says it for that option */
            const imps = [...card.querySelectorAll('[data-impact]')]; if (imps.length !== Object.keys(L.marks).length) r.problems.push('impact lines ' + imps.length);
            for (const x of imps) { const m = L.marks[x.dataset.impact], im = x.querySelector('.im'); if (!m || !im || im.dataset.k !== m.kind || x.title !== m.tip || im.querySelectorAll('svg').length !== (m.kind === 'both' ? 2 : 1)) { r.problems.push('mark of ' + x.dataset.impact); break; } }
          }
          out.push(r);
        } return out; }, D);
      const bad6 = R6.filter((r) => r.problems.length);
      ok(bad6.length === 0 && R6.length === D.decide.entries.length + D.patterns.length, 'every pattern and decision card opens with its blocks, in order, before its plain line, example, options and choices, and each block, mark and meter is what the data says', bad6.slice(0, 3).map((r) => r.key + ': ' + r.problems.join(', ')).join(' | ') || `${R6.filter((r) => r.pat).length} patterns (six blocks) · ${R6.filter((r) => !r.pat).length} decision cards (four blocks)`);
      /* every icon of the blocks is inside an item with a hover that says its own fact; none repeats the legend's meaning */
      const IC6 = await p.evaluate(() => { const icons = [...document.querySelectorAll('.lens svg.ico, [data-impact] svg.ico')], bare = icons.filter((i) => !i.closest('[title]') || !i.closest('[title]').title.trim()), words = icons.filter((i) => i.closest('[title]') && i.closest('[title]').title.trim().split(/\s+/).length < 4);
        const lg = new Set([...document.querySelectorAll('#legend .lg')].map((e) => e.title)); const same = [...document.querySelectorAll('.lens [title], [data-impact][title]')].filter((e) => lg.has(e.title)).length; return { n: icons.length, bare: bare.length, words: words.length, same }; });
      ok(IC6.n > 600 && IC6.bare === 0 && IC6.words === 0 && IC6.same === 0, 'every icon in the blocks and on the options sits inside an item with its own hover of four words or more, and none repeats the legend', `${IC6.n} icons · ${IC6.bare} bare · ${IC6.words} thin · ${IC6.same} like the legend`);
      /* the legend says each new mark once */
      const LG6 = await p.evaluate((D) => { const g = [...document.querySelectorAll('#legend .lgg')].map((x) => ({ head: x.querySelector('.lab').textContent, defs: [...x.querySelectorAll('.lg')].map((e) => ({ title: e.title, svg: !!e.querySelector('svg'), word: e.textContent.trim() })) })), G = D.ui.gl;
        const find = (h) => g.find((x) => x.head === h) || { defs: [] };
        return { kinds: find(G.legend.kinds).defs, procs: find(G.legend.processes).defs, blocks: find(G.legend.blocks).defs, impact: find(G.legend.impact).defs }; }, D);
      const G6 = D.ui.gl;
      ok(LG6.kinds.length === D.lens.used.pain.length && D.lens.used.pain.every((k, i) => LG6.kinds[i].title === G6.pain[k].def && LG6.kinds[i].word === G6.pain[k].word && LG6.kinds[i].svg), 'the legend says each kind of pain in use once, with its icon', `${LG6.kinds.length} kinds`);
      ok(LG6.procs.length === D.lens.used.process.length && D.lens.used.process.every((k, i) => LG6.procs[i].title === G6.process[k].def && LG6.procs[i].word === G6.process[k].word && LG6.procs[i].svg), 'the legend says each everyday process in use once, with its icon', `${LG6.procs.length} processes`);
      ok(LG6.blocks.length === 11 && LG6.blocks.every((x) => x.title && x.word) && LG6.impact.length === 4 && LG6.impact.every((x, i) => x.svg && x.title === G6.impact[['gain', 'cost', 'both', 'neutral'][i]].def), 'the legend says the cost, the size, the if-not mark, the balance, the meter, the handle, the steps, the failing step and the box once each, and what an option does for you', `${LG6.blocks.length} block marks · ${LG6.impact.length} impact marks`);
      /* the spoken summaries: the pain first, then the analogy, the cost, the options, my pick */
      const SB = [[/[A-Za-z]_[A-Za-z]/, 'a code name'], [/\b[a-z]+[A-Z][A-Za-z]*\b/, 'a code name'], [/[·→/×|#{}\\“”"`<>]/, 'a symbol'], [/\b(?:L|R|D|EX|CR|N3|S4)-\d+/, 'an id'], [/\b[PGFA]\d{1,2}\b/, 'an id'], [/\b[\w-]+\.(?:py|mjs|js|json|md|html|tsx?|css)\b/i, 'a file'], [/\d/, 'a number'], [/\bundefined\b|\bNaN\b/, 'undefined'], [/\b(?:he|him|his|himself)\b/i, 'he · him · his']];
      const ns6 = (s) => (s.match(/[^.!?]+[.!?]+(\s|$)/g) || []).length, sp6 = [...DEC, ...D.decide.pats], bsp = [];
      for (const e of sp6) { const L = e.pat ? D.lens.patterns[e.id] : D.lens.decisions[e.id], n = ns6(e.parts.join(' '));
        if (e.parts.length !== 6 || e.parts[0] !== L.say.pain || e.parts[1] !== L.say.like || e.parts[2] !== L.say.toSolve || e.parts[3] !== L.say.ifNot) bsp.push(e.key + ': not pain, analogy, cost to solve, cost if not first');
        else if (!(e.pat ? /^This pattern holds /.test(e.parts[4]) : /^(You choose between |You can land it)/.test(e.parts[4]))) bsp.push(e.key + ': the fifth part is not the options');
        else if (!/^My pick |^You already ruled it/.test(e.parts[5])) bsp.push(e.key + ': the last part is not my pick');
        if (n < 4 || n > 7) bsp.push(e.key + ': ' + n + ' sentences'); for (const [rx, w] of SB) { const m = rx.exec(e.parts.join(' ')); if (m) bsp.push(e.key + ': ' + w + ' “' + m[0] + '”'); } }
      ok(bsp.length === 0, 'the spoken summary of every pattern and every decision begins with its pain sentence and goes on in order: the analogy, the cost to solve, the cost if not, the options, my pick (4 to 7 sentences, no id, path, symbol, number or code)', bsp.slice(0, 3).join(' | ') || `${sp6.length} summaries (${D.decide.pats.length} patterns)`);
      /* a pattern is read from its own card: the pain first, its card lit, and the menu does not list it as a decision */
      const P8 = await open({ ms: 30 });
      await run('a pattern reading', async () => {
        const pe = D.decide.pats[0], listen = '[data-dec-listen="' + pe.key + '"]'; await P8.click(listen); await waitFor(P8, (n) => window.__ss.said.length >= n, pe.parts.length); const said = await heard(P8);
        const st = await P8.evaluate((k) => ({ hot: document.querySelector('[data-dec-card="' + k + '"]').dataset.hot, r: window.__leg.reading(), txt: document.querySelector('[data-dec-text="' + k + '"]').textContent }), pe.key);
        ok(said[0] === pe.parts[0] && pe.parts.every((x, i) => said[i] === x) && st.r.dec === pe.key && st.hot === 'true', 'a pattern\'s listen button reads its summary from the pain sentence, part by part, and lights its card', (said[0] || '').slice(0, 50));
        ok(st.txt === pe.parts.join(' '), 'what a pattern reads aloud is shown folded on its card, as the generator wrote it', st.txt.slice(0, 40));
        await waitFor(P8, () => !window.__leg.reading().on); const nm = await P8.evaluate(() => document.querySelectorAll('[data-dec-item^="pat:"]').length); ok(nm === 0, 'the menu lists decisions only: no pattern reading is a menu entry', nm + ' entries'); });
      await P8.__ctx.close();
      /* 390 px: the blocks fold to one column, nothing scrolls sideways, no text under 12px in them */
      await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(200);
      const NB = await p.evaluate(() => { const l = document.querySelector('[data-pattern="P1"] .lens'), cols = getComputedStyle(l).gridTemplateColumns.trim().split(/\s+/).length, side = document.documentElement.scrollWidth - window.innerWidth;
        const small = []; const w = document.createTreeWalker(document.querySelector('[data-pattern="P1"]'), NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (!n.nodeValue.trim()) continue; const e = n.parentElement; if (!e.getClientRects().length) continue; if (parseFloat(getComputedStyle(e).fontSize) < 12) small.push(n.nodeValue.trim().slice(0, 20)); }
        const wide = [...document.querySelectorAll('.lens, .lb')].filter((x) => x.scrollWidth > x.clientWidth + 1).length; return { cols, side, small: small.length, wide }; });
      ok(NB.cols === 1 && NB.side <= 1 && NB.small === 0 && NB.wide === 0, 'at 390 px the blocks fold to one column, nothing scrolls sideways, and no text in them is under 12px', `${NB.cols} column · page ${NB.side}px wider · ${NB.small} small · ${NB.wide} overflowing`);
      await p.setViewportSize({ width: 1500, height: 1000 }); await p.waitForTimeout(150);
    }
    if (DECSHOT) { fs.mkdirSync(DECSHOT, { recursive: true }); const PD = await open({ ms: 600000 }, 1920); await PD.setViewportSize({ width: 1920, height: 1000 });
      await scrollInto(PD, IDS[3], 400); await PD.click('[data-choice="mo.ipo"][data-v="sent"]'); await PD.click('[data-choice="mo.hdr"][data-v="band"]'); await scrollInto(PD, IDS[3], 400); await PD.waitForTimeout(100);
      await PD.click('[data-dd="calls"]'); await PD.waitForTimeout(150); await PD.screenshot({ path: path.join(DECSHOT, 'dropdown-open-1920.png') });
      await PD.click('[data-dec-item="mo.gdl"]'); await PD.waitForTimeout(400); await PD.screenshot({ path: path.join(DECSHOT, 'decision-card-1920.png') }); console.log('  the dropdown and a lit decision card at 1920 px in ' + DECSHOT); await PD.__ctx.close(); }
    if (LENSSHOT) { fs.mkdirSync(LENSSHOT, { recursive: true }); const PL = await open({ ms: 600000 }, 1920); await PL.setViewportSize({ width: 1920, height: 1000 }); await PL.addStyleTag({ content: 'nav.toc { display: none !important; }' }); await PL.waitForTimeout(150);
      const pc = await PL.$('[data-pattern="P1"]'), pb = await pc.boundingBox(), end = await PL.evaluate(() => { const r = document.querySelector('[data-dec-text="pat:P1"]').closest('.decb').getBoundingClientRect(); return r.bottom + window.scrollY; });
      await PL.screenshot({ path: path.join(LENSSHOT, 'pattern-card-1920.png'), fullPage: true, clip: { x: pb.x, y: pb.y, width: pb.width, height: Math.round(end - pb.y + 8) } });
      const dc = await PL.$('[data-call="mo.gdl"]'); await dc.screenshot({ path: path.join(LENSSHOT, 'decision-card-1920.png') });
      const sc = await PL.$('[data-choice-card="P1.1"]'); await sc.screenshot({ path: path.join(LENSSHOT, 'decision-card-suite-1920.png') });
      console.log('  a pattern card\'s blocks, a fully encoded look card and a suite proposal card at 1920 px in ' + LENSSHOT); await PL.__ctx.close(); }
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
